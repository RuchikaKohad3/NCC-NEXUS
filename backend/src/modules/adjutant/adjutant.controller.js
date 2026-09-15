// Responsibility: HTTP handlers for the AI Adjutant (M9) — thin: id validation,
//   college/user context extraction, delegation to adjutant.service.
// Layer: AI Adjutant (Layer 3) controller.
// Depends on: adjutant.service.
// Must never be depended on by: any existing/legacy module.

const service = require("./adjutant.service");

function requireCollege(req, res) {
  const collegeId = req.user.college_id;
  if (collegeId == null) {
    res.status(400).json({ message: "No college context for this user" });
    return null;
  }
  return collegeId;
}

function positiveInt(value) {
  const num = Number(value);
  return Number.isInteger(num) && num > 0 ? num : null;
}

// GET /api/adjutant/conversations
async function listConversations(req, res, next) {
  try {
    const collegeId = requireCollege(req, res);
    if (collegeId == null) return undefined;
    return res.json(await service.listConversations(collegeId));
  } catch (err) {
    return next(err);
  }
}

// POST /api/adjutant/conversations { title? }
async function createConversation(req, res, next) {
  try {
    const collegeId = requireCollege(req, res);
    if (collegeId == null) return undefined;
    const convo = await service.createConversation({
      collegeId,
      userId: req.user.user_id,
      title: typeof req.body?.title === "string" ? req.body.title.slice(0, 255) : undefined,
    });
    return res.status(201).json(convo);
  } catch (err) {
    return next(err);
  }
}

// GET /api/adjutant/conversations/:id/messages
async function getMessages(req, res, next) {
  try {
    const collegeId = requireCollege(req, res);
    if (collegeId == null) return undefined;
    const conversationId = positiveInt(req.params.id);
    if (!conversationId) return res.status(400).json({ message: "Invalid conversation id" });
    return res.json(await service.getMessages({ collegeId, conversationId }));
  } catch (err) {
    return next(err);
  }
}

// POST /api/adjutant/conversations/:id/messages { message }
async function sendMessage(req, res, next) {
  try {
    const collegeId = requireCollege(req, res);
    if (collegeId == null) return undefined;
    const conversationId = positiveInt(req.params.id);
    if (!conversationId) return res.status(400).json({ message: "Invalid conversation id" });
    const result = await service.sendMessage({
      collegeId,
      userId: req.user.user_id,
      conversationId,
      text: req.body?.message,
    });
    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
}

// GET /api/adjutant/proposals?status=
async function listProposals(req, res, next) {
  try {
    const collegeId = requireCollege(req, res);
    if (collegeId == null) return undefined;
    const status = req.query.status ? String(req.query.status).trim().toLowerCase() : undefined;
    return res.json(await service.listProposals({ collegeId, status }));
  } catch (err) {
    return next(err);
  }
}

// POST /api/adjutant/proposals/:id/approve | /reject
const decide = (decision) => async (req, res, next) => {
  try {
    const collegeId = requireCollege(req, res);
    if (collegeId == null) return undefined;
    const proposalId = positiveInt(req.params.id);
    if (!proposalId) return res.status(400).json({ message: "Invalid proposal id" });
    const proposal = await service.decideProposal({
      collegeId,
      userId: req.user.user_id,
      proposalId,
      decision,
    });
    return res.json(proposal);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  listConversations,
  createConversation,
  getMessages,
  sendMessage,
  listProposals,
  approveProposal: decide("approve"),
  rejectProposal: decide("reject"),
};
