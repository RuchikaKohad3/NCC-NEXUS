const db = require("../db/knex");
const { 
  createPaymentOrder, 
  verifyPayment: verifyPaymentService,
  getPaymentProvider,
  verifyRazorpayWebhookSignature,
} = require("../services/payment.service");
const chatService = require("../services/chat.service");

const toNumber = (value) => Number(value || 0);

const getBadgeForRank = (rank) => {
  if (!rank) return "Bronze";
  if (rank === 1) return "Gold";
  if (rank <= 3) return "Silver";
  return "Bronze";
};

const finalizeDonationSuccess = async ({ trx, donation, verification, collegeId }) => {
  if (!donation) {
    throw new Error("DONATION_NOT_FOUND");
  }

  if (donation.payment_status === "SUCCESS") {
    throw new Error("ALREADY_VERIFIED");
  }

  if (donation.payment_status !== "PENDING") {
    throw new Error("INVALID_STATE");
  }

  await trx("donations")
    .where({ donation_id: donation.donation_id })
    .update({
      payment_status: "SUCCESS",
      payment_id: verification.payment_id || null,
      payment_signature: verification.signature || null,
    });

  const campaign = await trx("donation_campaigns")
    .where({ campaign_id: donation.campaign_id })
    .forUpdate()
    .first();

  const nextCollectedAmount = toNumber(campaign?.collected_amount) + toNumber(donation.amount);
  const shouldAutoClose = (
    campaign
    && campaign.status === "ACTIVE"
    && toNumber(campaign.target_amount) > 0
    && nextCollectedAmount >= toNumber(campaign.target_amount)
  );

  await trx("donation_campaigns")
    .where({ campaign_id: donation.campaign_id })
    .update({
      collected_amount: nextCollectedAmount,
      ...(shouldAutoClose ? { status: "CLOSED" } : {}),
    });

  return {
    autoClosed: shouldAutoClose,
    collegeId,
  };
};

const extractRazorpayWebhookPayment = (payload = {}) => {
  const paymentEntity = payload?.payload?.payment?.entity || null;
  if (paymentEntity?.order_id) {
    return {
      orderId: paymentEntity.order_id,
      paymentId: paymentEntity.id || null,
    };
  }

  const orderEntity = payload?.payload?.order?.entity || null;
  if (orderEntity?.id) {
    return {
      orderId: orderEntity.id,
      paymentId: null,
    };
  }

  return {
    orderId: null,
    paymentId: null,
  };
};

const createCampaign = async (req, res) => {
  try {

    if (req.user.role !== "ANO") {
      return res.status(403).json({
        message: "Only ANO can create donation campaigns"
      });
    }

    const {
      title,
      description,
      minimum_amount,
      target_amount
    } = req.body;

    if (!title || minimum_amount === undefined) {
      return res.status(400).json({
        message: "Title and minimum_amount are required"
      });
    }

    if (Number(minimum_amount) < 0) {
      return res.status(400).json({
        message: "Minimum amount cannot be negative"
      });
    }

    if (target_amount && Number(target_amount) < 0) {
      return res.status(400).json({
        message: "Target amount cannot be negative"
      });
    }


    const [campaign] = await db("donation_campaigns")
      .insert({
        college_id: req.user.college_id,
        title,
        description,
        minimum_amount,
        target_amount: target_amount || null,
        campaign_type: "EVENT",
        status: "ACTIVE",
        created_by_user_id: req.user.user_id
      })
      .returning("*");

    return res.status(201).json({
      success: true,
      message: "Campaign created successfully",
      data: campaign
    });

  } catch (err) {
    console.error("Create Campaign Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

const getCampaigns = async (req, res) => {
  try {

    const campaigns = await db("donation_campaigns")
      .where({
        college_id: req.user.college_id
      })
      .whereNull("deleted_at")
      .orderBy([
        { column: "campaign_type", order: "asc" }, // DEFAULT first
        { column: "created_at", order: "desc" }     // newest events first
      ]);

    res.json({
      success: true,
      data: campaigns
    });

  } catch (err) {
    console.error("Get Campaigns Error:", err);
    res.status(500).json({ error: err.message });
  }
};

const createOrder = async (req, res) => {
  try {

    if (req.user.role !== "ALUMNI") {
      return res.status(403).json({
        message: "Only Alumni can make donations"
      });
    }

    const { campaign_id, amount, is_anonymous } = req.body;

    if (!campaign_id || !amount) {
      return res.status(400).json({
        message: "campaign_id and amount are required"
      });
    }

    if (Number(amount) <= 0) {
      return res.status(400).json({
        message: "Amount must be greater than zero"
      });
    }

    const campaign = await db("donation_campaigns")
      .where({
        campaign_id,
        college_id: req.user.college_id
      })
      .whereNull("deleted_at")
      .first();

    if (!campaign) {
      return res.status(404).json({
        message: "Campaign not found"
      });
    }

    if (campaign.status !== "ACTIVE") {
      return res.status(400).json({
        message: "Campaign is not active"
      });
    }

    if (
      campaign.campaign_type === "EVENT" &&
      Number(amount) < Number(campaign.minimum_amount)
    ) {
      return res.status(400).json({
        message: `Minimum donation amount is ₹${campaign.minimum_amount}`
      });
    }

    let orderResponse;

    await db.transaction(async (trx) => {

      orderResponse = await createPaymentOrder({
        amount,
        campaign_id,
        user_id: req.user.user_id
      });

      const [donation] = await trx("donations").insert({
        campaign_id,
        alumni_user_id: req.user.user_id,
        amount,
        is_anonymous: is_anonymous || false,
        payment_order_id: orderResponse.order_id,
        payment_status: "PENDING"
      }).returning(["donation_id"]);

      orderResponse.donation_id = donation.donation_id;

    });

    return res.status(201).json({
      success: true,
      message: "Order created successfully",
      provider: getPaymentProvider(),
      order: orderResponse
    });

  } catch (err) {
    if (err.message === "RAZORPAY_CONFIG_MISSING") {
      return res.status(500).json({
        message: "Payment provider is not configured"
      });
    }
    console.error("Create Order Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

const verifyPayment = async (req, res) => {
  try {

    if (req.user.role !== "ALUMNI") {
      return res.status(403).json({
        message: "Only Alumni can verify donations"
      });
    }

    const { order_id, payment_id, signature } = req.body;

    if (!order_id) {
      return res.status(400).json({
        message: "order_id is required"
      });
    }

    await db.transaction(async (trx) => {

      const donation = await trx("donations")
        .where({
          payment_order_id: order_id,
          alumni_user_id: req.user.user_id
        })
        .forUpdate()
        .first();

      if (!donation) {
        throw new Error("DONATION_NOT_FOUND");
      }

      const verification = await verifyPaymentService({
        order_id,
        payment_id,
        signature
      });

      if (!verification.success) {
        throw new Error("VERIFICATION_FAILED");
      }

      await finalizeDonationSuccess({
        trx,
        donation,
        verification,
        collegeId: req.user.college_id,
      });

      const anos = await trx("users")
        .where({
          role: "ANO",
          college_id: req.user.college_id
        })
        .select("user_id");

      for (const ano of anos) {
        await trx("notifications").insert({
          user_id: ano.user_id,
          type: "donation",
          message: `New donation of ₹${donation.amount} received.`,
          is_read: false
        });
      }

    });

    return res.json({
      success: true,
      message: "Payment verified and donation successful"
    });

  } catch (err) {

    if (err.message === "ALREADY_VERIFIED") {
      return res.status(400).json({
        message: "Donation already verified"
      });
    }

    if (err.message === "DONATION_NOT_FOUND") {
      return res.status(404).json({
        message: "Donation not found"
      });
    }

    if (err.message === "INVALID_STATE") {
      return res.status(400).json({
        message: "Invalid donation state"
      });
    }

    if (err.message === "VERIFICATION_FAILED") {
      return res.status(400).json({
        message: "Payment verification failed"
      });
    }

    console.error("Verify Payment Error:", err);
    return res.status(500).json({
      error: "Internal server error"
    });
  }
};

const handleRazorpayWebhook = async (req, res) => {
  try {
    if (getPaymentProvider() !== "razorpay") {
      return res.status(400).json({
        message: "Razorpay webhook is not enabled"
      });
    }

    const signature = req.headers["x-razorpay-signature"];
    const isValidSignature = verifyRazorpayWebhookSignature({
      rawBody: req.rawBody,
      signature,
    });

    if (!isValidSignature) {
      return res.status(400).json({
        message: "Invalid webhook signature"
      });
    }

    const eventType = String(req.body?.event || "unknown");
    const webhookIdentifier = String(
      req.body?.payload?.payment?.entity?.id
      || req.body?.payload?.order?.entity?.id
      || req.body?.contains?.[0]
      || req.body?.event
      || ""
    );
    const eventId = `${eventType}:${webhookIdentifier || "unknown"}`;
    const { orderId, paymentId } = extractRazorpayWebhookPayment(req.body);

    await db.transaction(async (trx) => {
      const existingEvent = await trx("donation_webhook_events")
        .where({
          provider: "razorpay",
          event_id: eventId,
        })
        .first();

      if (existingEvent) {
        return;
      }

      await trx("donation_webhook_events").insert({
        provider: "razorpay",
        event_id: eventId,
        event_type: eventType,
        payment_order_id: orderId,
        payment_id: paymentId,
        status: "RECEIVED",
        payload: req.body,
      });

      if (eventType !== "payment.captured" && eventType !== "order.paid") {
        await trx("donation_webhook_events")
          .where({
            provider: "razorpay",
            event_id: eventId,
          })
          .update({
            status: "IGNORED",
            processed_at: db.fn.now(),
          });
        return;
      }

      if (!orderId) {
        await trx("donation_webhook_events")
          .where({
            provider: "razorpay",
            event_id: eventId,
          })
          .update({
            status: "IGNORED",
            processed_at: db.fn.now(),
          });
        return;
      }

      const donation = await trx("donations as d")
        .join("donation_campaigns as dc", "dc.campaign_id", "d.campaign_id")
        .where("d.payment_order_id", orderId)
        .select("d.*", "dc.college_id")
        .forUpdate()
        .first();

      if (!donation) {
        await trx("donation_webhook_events")
          .where({
            provider: "razorpay",
            event_id: eventId,
          })
          .update({
            status: "IGNORED",
            processed_at: db.fn.now(),
          });
        return;
      }

      let alreadyVerified = false;
      try {
        await finalizeDonationSuccess({
          trx,
          donation,
          verification: {
            payment_id: paymentId,
            signature: null,
          },
          collegeId: donation.college_id,
        });
      } catch (error) {
        if (error.message === "ALREADY_VERIFIED") {
          alreadyVerified = true;
        } else {
          throw error;
        }
      }

      if (!alreadyVerified) {
        const anos = await trx("users")
          .where({
            role: "ANO",
            college_id: donation.college_id
          })
          .select("user_id");

        for (const ano of anos) {
          await trx("notifications").insert({
            user_id: ano.user_id,
            type: "donation",
            message: `New donation of ₹${donation.amount} received.`,
            is_read: false
          });
        }
      }

      await trx("donation_webhook_events")
        .where({
          provider: "razorpay",
          event_id: eventId,
        })
        .update({
          status: alreadyVerified ? "DUPLICATE" : "PROCESSED",
          processed_at: db.fn.now(),
        });
    });

    return res.json({ success: true });
  } catch (err) {
    if (err.message === "RAZORPAY_WEBHOOK_SECRET_MISSING") {
      return res.status(500).json({
        message: "Webhook secret is not configured"
      });
    }

    console.error("Razorpay Webhook Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

const getLeaderboard = async (req, res) => {
  try {

    const leaderboard = await db("donations as d")
      .join("users as u", "u.user_id", "d.alumni_user_id")
      .join("donation_campaigns as dc", "dc.campaign_id", "d.campaign_id")
      .where("dc.college_id", req.user.college_id)
      .andWhere("d.payment_status", "SUCCESS")
      .groupBy("u.user_id")
      .count({ donation_count: "d.donation_id" })
      .select(
        "u.user_id",
        "u.username",
        "u.profile_image_url"
      )
      .sum({ total_donated: "d.amount" })
      .orderBy("total_donated", "desc");

    const rankedLeaderboard = leaderboard.map((entry, index) => ({
      ...entry,
      rank: index + 1,
      donation_count: Number(entry.donation_count || 0),
      total_donated: toNumber(entry.total_donated),
      badge: getBadgeForRank(index + 1)
    }));

    return res.json({
      success: true,
      data: rankedLeaderboard
    });

  } catch (err) {
    console.error("Leaderboard Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

const getDonationHistory = async (req, res) => {
  try {

    if (req.user.role !== "ALUMNI") {
      return res.status(403).json({
        message: "Only Alumni can view donation history"
      });
    }

    const donations = await db("donations as d")
      .join("donation_campaigns as dc", "dc.campaign_id", "d.campaign_id")
      .where("d.alumni_user_id", req.user.user_id)
      .where("dc.college_id", req.user.college_id)
      .whereNull("dc.deleted_at")
      .select(
        "d.donation_id",
        "d.payment_order_id",
        "dc.title as campaign_title",
        "dc.campaign_type",
        "d.amount",
        "d.is_anonymous",
        "d.payment_status",
        "d.created_at"
      )
      .orderBy("d.created_at", "desc");

    return res.json({
      success: true,
      data: donations
    });

  } catch (err) {
    console.error("Donation History Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

const getDonationHistoryById = async (req, res) => {
  try {

    if (req.user.role !== "ALUMNI") {
      return res.status(403).json({
        message: "Only Alumni can view donation history"
      });
    }

    const { donation_id } = req.params;

    const donation = await db("donations as d")
      .join("donation_campaigns as dc", "dc.campaign_id", "d.campaign_id")
      .where("d.donation_id", donation_id)
      .where("d.alumni_user_id", req.user.user_id)
      .where("dc.college_id", req.user.college_id)
      .whereNull("dc.deleted_at")
      .select(
        "d.donation_id",
        "d.payment_order_id",
        "dc.title as campaign_title",
        "dc.campaign_type",
        "d.amount",
        "d.is_anonymous",
        "d.payment_status",
        "d.created_at"
      )
      .first();

    if (!donation) {
      return res.status(404).json({
        message: "Donation not found"
      });
    }

    return res.json({
      success: true,
      data: donation
    });

  } catch (err) {
    console.error("Donation Detail Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

const getRecognition = async (req, res) => {
  try {

    if (req.user.role !== "ALUMNI") {
      return res.status(403).json({
        message: "Only Alumni can view recognition"
      });
    }

    const totals = await db("donations as d")
      .join("donation_campaigns as dc", "dc.campaign_id", "d.campaign_id")
      .where("dc.college_id", req.user.college_id)
      .where("d.alumni_user_id", req.user.user_id)
      .where("d.payment_status", "SUCCESS")
      .select(
        db.raw("COALESCE(SUM(d.amount), 0) as total_donated"),
        db.raw("COUNT(d.donation_id) as donation_count")
      )
      .first();

    const leaderboard = await db("donations as d")
      .join("donation_campaigns as dc", "dc.campaign_id", "d.campaign_id")
      .where("dc.college_id", req.user.college_id)
      .andWhere("d.payment_status", "SUCCESS")
      .groupBy("d.alumni_user_id")
      .select("d.alumni_user_id")
      .sum({ total_donated: "d.amount" })
      .orderBy("total_donated", "desc");

    const rankIndex = leaderboard.findIndex(
      (entry) => Number(entry.alumni_user_id) === Number(req.user.user_id)
    );
    const rank = rankIndex >= 0 ? rankIndex + 1 : null;

    return res.json({
      success: true,
      data: {
        total_donated: toNumber(totals?.total_donated),
        donation_count: Number(totals?.donation_count || 0),
        rank,
        badge: getBadgeForRank(rank)
      }
    });

  } catch (err) {
    console.error("Recognition Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

const getOverview = async (req, res) => {
  try {

    if (req.user.role !== "ANO") {
      return res.status(403).json({
        message: "Only ANO can view donation overview"
      });
    }

    const totals = await db("donation_campaigns as dc")
      .where("dc.college_id", req.user.college_id)
      .whereNull("dc.deleted_at")
      .select(
        db.raw("COALESCE(SUM(dc.collected_amount), 0) as total_donated"),
        db.raw("COUNT(CASE WHEN dc.status = 'ACTIVE' THEN 1 END) as active_needs"),
        db.raw("COUNT(CASE WHEN dc.status = 'CLOSED' THEN 1 END) as projects_completed")
      )
      .first();

    const donors = await db("donations as d")
      .join("donation_campaigns as dc", "dc.campaign_id", "d.campaign_id")
      .where("dc.college_id", req.user.college_id)
      .where("d.payment_status", "SUCCESS")
      .countDistinct({ total_donors: "d.alumni_user_id" })
      .first();

    return res.json({
      success: true,
      data: {
        total_donated: toNumber(totals?.total_donated),
        active_needs: Number(totals?.active_needs || 0),
        projects_completed: Number(totals?.projects_completed || 0),
        total_donors: Number(donors?.total_donors || 0)
      }
    });

  } catch (err) {
    console.error("Donation Overview Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

const reportDonationIssue = async (req, res) => {
  try {

    if (req.user.role !== "ALUMNI") {
      return res.status(403).json({
        message: "Only Alumni can report donation issues"
      });
    }

    const { donation_id } = req.params;
    const { issue_text } = req.body;

    if (!issue_text || !String(issue_text).trim()) {
      return res.status(400).json({
        message: "issue_text is required"
      });
    }

    const donation = await db("donations as d")
      .join("donation_campaigns as dc", "dc.campaign_id", "d.campaign_id")
      .where("d.donation_id", donation_id)
      .where("d.alumni_user_id", req.user.user_id)
      .where("dc.college_id", req.user.college_id)
      .select("d.donation_id")
      .first();

    if (!donation) {
      return res.status(404).json({
        message: "Donation not found"
      });
    }

    const report = await db.transaction(async (trx) => {
      const existingOpenReport = await trx("donation_issue_reports")
        .where({
          donation_id,
          reported_by_user_id: req.user.user_id,
          status: "OPEN"
        })
        .first();

      if (existingOpenReport) {
        throw new Error("OPEN_REPORT_EXISTS");
      }

      const [createdReport] = await trx("donation_issue_reports")
        .insert({
          donation_id,
          reported_by_user_id: req.user.user_id,
          issue_text: String(issue_text).trim(),
          status: "OPEN"
        })
        .returning(["report_id", "donation_id", "status", "created_at"]);

      return createdReport;
    });

    return res.status(201).json({
      success: true,
      message: "Issue report submitted successfully",
      data: report
    });

  } catch (err) {
    if (err.message === "OPEN_REPORT_EXISTS") {
      return res.status(409).json({
        message: "An open issue report already exists for this donation"
      });
    }

    console.error("Report Donation Issue Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

const getIssueReportsForAno = async (req, res) => {
  try {

    if (req.user.role !== "ANO") {
      return res.status(403).json({
        message: "Only ANO can view donation issue reports"
      });
    }

    const reports = await db("donation_issue_reports as dir")
      .join("donations as d", "d.donation_id", "dir.donation_id")
      .join("donation_campaigns as dc", "dc.campaign_id", "d.campaign_id")
      .join("users as reporter", "reporter.user_id", "dir.reported_by_user_id")
      .leftJoin("users as resolver", "resolver.user_id", "dir.resolved_by_user_id")
      .where("dc.college_id", req.user.college_id)
      .select(
        "dir.report_id",
        "dir.donation_id",
        "dir.reported_by_user_id",
        "dir.issue_text",
        "dir.status",
        "dir.resolution_text",
        "dir.created_at",
        "dir.resolved_at",
        "dc.title as campaign_title",
        "d.amount",
        "reporter.username as reporter_name",
        "resolver.username as resolver_name"
      )
      .orderBy([
        { column: "dir.status", order: "asc" },
        { column: "dir.created_at", order: "desc" }
      ]);

    return res.json({
      success: true,
      data: reports
    });

  } catch (err) {
    console.error("Get Donation Issue Reports Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

const resolveDonationIssue = async (req, res) => {
  try {

    if (req.user.role !== "ANO") {
      return res.status(403).json({
        message: "Only ANO can resolve donation issue reports"
      });
    }

    const { report_id } = req.params;
    const resolutionText = String(req.body?.resolution_text || "").trim();

    if (!resolutionText) {
      return res.status(400).json({
        message: "resolution_text is required"
      });
    }

    let report;
    let chatRoomResult;
    let resolutionMessage;
    let resolvedReport;

    await db.transaction(async (trx) => {
      report = await trx("donation_issue_reports as dir")
        .join("donations as d", "d.donation_id", "dir.donation_id")
        .join("donation_campaigns as dc", "dc.campaign_id", "d.campaign_id")
        .where("dir.report_id", report_id)
        .where("dc.college_id", req.user.college_id)
        .select(
          "dir.report_id",
          "dir.donation_id",
          "dir.reported_by_user_id",
          "dir.status",
          "dc.title as campaign_title",
          "d.amount"
        )
        .forUpdate()
        .first();

      if (!report) {
        throw new Error("REPORT_NOT_FOUND");
      }

      if (String(report.status).toUpperCase() === "RESOLVED") {
        throw new Error("REPORT_ALREADY_RESOLVED");
      }

      chatRoomResult = await chatService.createRoom({
        creatorUserId: req.user.user_id,
        creatorRole: "ano",
        roomType: "direct",
        participantUserIds: [report.reported_by_user_id],
        trx,
      });

      resolutionMessage = await chatService.sendMessage({
        roomId: Number(chatRoomResult.room.room_id),
        senderUserId: req.user.user_id,
        senderRole: "ano",
        body: `Donation issue resolved for "${report.campaign_title}" (Rs ${toNumber(report.amount)}): ${resolutionText}`,
        messageType: "text",
        metadata: {
          source: "donation_issue_resolution",
          report_id: Number(report.report_id),
          donation_id: Number(report.donation_id),
        },
        trx,
      });

      [resolvedReport] = await trx("donation_issue_reports")
        .where({ report_id })
        .update({
          status: "RESOLVED",
          resolved_by_user_id: req.user.user_id,
          resolution_text: resolutionText,
          resolved_at: db.fn.now(),
        })
        .returning(["report_id", "status", "resolution_text", "resolved_at"]);
    });

    const io = req.app.locals.io;
    if (io) {
      io.to(`room:${chatRoomResult.room.room_id}`).emit("chat:new_message", resolutionMessage);
      io.to(`user:${report.reported_by_user_id}`).emit("chat:inbox_update", {
        room_id: Number(chatRoomResult.room.room_id),
      });
      io.to(`user:${req.user.user_id}`).emit("chat:inbox_update", {
        room_id: Number(chatRoomResult.room.room_id),
      });
    }

    return res.json({
      success: true,
      message: "Issue resolved and sent to alumni via chat",
      data: {
        ...resolvedReport,
        room_id: Number(chatRoomResult.room.room_id),
      }
    });

  } catch (err) {
    if (err.message === "REPORT_NOT_FOUND") {
      return res.status(404).json({
        message: "Donation issue report not found"
      });
    }

    if (err.message === "REPORT_ALREADY_RESOLVED") {
      return res.status(400).json({
        message: "Donation issue report is already resolved"
      });
    }

    console.error("Resolve Donation Issue Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

const closeCampaign = async (req, res) => {
  try {

    if (req.user.role !== "ANO") {
      return res.status(403).json({
        message: "Only ANO can close campaigns"
      });
    }

    const { campaign_id } = req.params;

    if (!campaign_id) {
      return res.status(400).json({
        message: "campaign_id is required"
      });
    }

    await db.transaction(async (trx) => {

      const campaign = await trx("donation_campaigns")
        .where({
          campaign_id,
          college_id: req.user.college_id
        })
        .whereNull("deleted_at")
        .forUpdate()
        .first();

      if (!campaign) {
        throw new Error("CAMPAIGN_NOT_FOUND");
      }

      if (campaign.campaign_type === "DEFAULT") {
        throw new Error("CANNOT_CLOSE_DEFAULT");
      }

      if (campaign.status === "CLOSED") {
        throw new Error("ALREADY_CLOSED");
      }

      await trx("donation_campaigns")
        .where({ campaign_id })
        .update({
          status: "CLOSED"
        });

    });

    return res.json({
      success: true,
      message: "Campaign closed successfully"
    });

  } catch (err) {

    if (err.message === "CAMPAIGN_NOT_FOUND") {
      return res.status(404).json({
        message: "Campaign not found"
      });
    }

    if (err.message === "CANNOT_CLOSE_DEFAULT") {
      return res.status(400).json({
        message: "Default campaign cannot be closed"
      });
    }

    if (err.message === "ALREADY_CLOSED") {
      return res.status(400).json({
        message: "Campaign is already closed"
      });
    }

    console.error("Close Campaign Error:", err);
    return res.status(500).json({
      error: "Internal server error"
    });
  }
};

module.exports = {
  createCampaign,
  getCampaigns,
  createOrder,
  verifyPayment,
  handleRazorpayWebhook,
  closeCampaign,
  getLeaderboard,
  getDonationHistory,
  getDonationHistoryById,
  getRecognition,
  getOverview,
  reportDonationIssue,
  getIssueReportsForAno,
  resolveDonationIssue
};
