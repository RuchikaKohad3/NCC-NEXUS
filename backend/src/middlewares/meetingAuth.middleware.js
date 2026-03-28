const db = require("../db/knex");

const isAno = (user = {}) => String(user.role || "").toUpperCase() === "ANO";

const isSuo = (user = {}) =>
  String(user.role || "").toUpperCase() === "CADET" &&
  String(user.rank || "").trim().toLowerCase() === "senior under officer";

const requireMeetingAuthority = (req, res, next) => {
  if (isAno(req.user) || isSuo(req.user)) {
    return next();
  }

  return res.status(403).json({
    message: "Only ANO or Senior Under Officer can manage meetings",
  });
};

const getMeetingAuthorityContext = async (meetingId, collegeId) => {
  return db("meetings as m")
    .join("users as u", "u.user_id", "m.created_by_user_id")
    .leftJoin("cadet_profiles as cp", "cp.user_id", "u.user_id")
    .leftJoin("cadet_ranks as r", "r.id", "cp.rank_id")
    .where("m.meeting_id", meetingId)
    .andWhere("m.college_id", collegeId)
    .whereNull("m.deleted_at")
    .select(
      "m.meeting_id",
      "m.created_by_user_id",
      "u.role as created_by_role",
      "r.rank_name as created_by_rank"
    )
    .first();
};

const requireMeetingManager = async (req, res, next) => {
  try {
    const meetingId = Number(req.params.meetingId);
    if (!Number.isInteger(meetingId) || meetingId <= 0) {
      return res.status(400).json({ message: "Invalid meetingId" });
    }

    if (!isAno(req.user) && !isSuo(req.user)) {
      return res.status(403).json({
        message: "Only ANO or Senior Under Officer can manage meetings",
      });
    }

    const meeting = await getMeetingAuthorityContext(
      meetingId,
      req.user.college_id
    );

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    const creatorIsAno =
      String(meeting.created_by_role || "").toUpperCase() === "ANO";
    const creatorIsSuo =
      String(meeting.created_by_role || "").toUpperCase() === "CADET" &&
      String(meeting.created_by_rank || "").trim().toLowerCase() ===
        "senior under officer";

    const requesterIsAno = isAno(req.user);
    const requesterIsSuo = isSuo(req.user);

    const allowed =
      (creatorIsAno && requesterIsAno) ||
      (creatorIsSuo && (requesterIsAno || requesterIsSuo));

    if (!allowed) {
      return res.status(403).json({
        message:
          creatorIsAno
            ? "Only ANO can manage meetings created by ANO."
            : "Only ANO or SUO can manage meetings created by SUO.",
      });
    }

    req.meetingAuthorityContext = meeting;
    return next();
  } catch (error) {
    return res.status(500).json({ message: "Failed to authorize meeting action" });
  }
};

module.exports = {
  requireMeetingAuthority,
  requireMeetingManager,
};
