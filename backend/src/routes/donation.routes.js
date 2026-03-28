const express = require("express");
const router = express.Router();
const { authenticate } = require("../middlewares/auth.middleware");
const donationController = require("../controllers/donation.controller");

router.post(
  "/webhooks/razorpay",
  donationController.handleRazorpayWebhook
);

router.post(
  "/campaign",
  authenticate,
  donationController.createCampaign
);

router.get(
  "/campaigns",
  authenticate,
  donationController.getCampaigns
);

router.patch(
  "/campaign/:campaign_id/close",
  authenticate,
  donationController.closeCampaign
);


router.post(
  "/create-order",
  authenticate,
  donationController.createOrder
);

router.post(
  "/verify",
  authenticate,
  donationController.verifyPayment
);


router.get(
  "/leaderboard",
  authenticate,
  donationController.getLeaderboard
);

router.get(
  "/recognition",
  authenticate,
  donationController.getRecognition
);

router.get(
  "/overview",
  authenticate,
  donationController.getOverview
);

router.get(
  "/history",
  authenticate,
  donationController.getDonationHistory
);

router.get(
  "/history/:donation_id",
  authenticate,
  donationController.getDonationHistoryById
);

router.post(
  "/history/:donation_id/report",
  authenticate,
  donationController.reportDonationIssue
);

router.get(
  "/issues",
  authenticate,
  donationController.getIssueReportsForAno
);

router.patch(
  "/issues/:report_id/resolve",
  authenticate,
  donationController.resolveDonationIssue
);

module.exports = router;
