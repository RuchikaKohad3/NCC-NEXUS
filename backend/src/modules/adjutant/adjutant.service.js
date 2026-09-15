// Responsibility: Orchestrate the AI Adjutant (M9) — conversation lifecycle,
//   the per-turn model↔tool loop, proposal capture, and the human
//   approve/reject/execute flow.
// Layer: AI Adjutant (Layer 3) service.
// Depends on: adjutant.repository (new tables), adjutant.tools (whitelist),
//   services/adjutant.gemini.service (model loop).
// Must never be depended on by: legacy modules, bot.service.js, or Layers 1–2.

const repo = require("./adjutant.repository");
const tools = require("./adjutant.tools");
const gemini = require("../../services/adjutant.gemini.service");

const HISTORY_TURNS = 12; // prior messages sent back to the model per turn
const MAX_PROMPT_LEN = 2000;

const createHttpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const SYSTEM_PROMPT = [
  "You are the NCC NEXUS Adjutant — a decision-support aide for NCC officers (ANO / Senior Under Officer).",
  "You answer ONLY from the whitelisted tools provided; if the tools cannot answer, say so plainly. Never invent cadets, scores or data.",
  "All data is already scoped to the officer's own college — never ask which college.",
  "Scores come with confidence values; always mention low confidence instead of presenting a thin number as certain.",
  "You cannot change anything yourself. For any consequential step (acknowledging a flag, recomputing, scanning), call propose_action with a clear reason — a human approves or rejects it.",
  "Be concise and factual. Use short bullet lists for multi-cadet answers. Refer to cadets by name and regimental number.",
].join(" ");

const deriveTitle = (text) => {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  return clean.length > 60 ? `${clean.slice(0, 57)}…` : clean || "New conversation";
};

/** Map persisted messages → Gemini contents (user→user, assistant→model). */
const toContents = (messages) =>
  messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

async function assertConversation(conversationId, collegeId) {
  const convo = await repo.getConversation(conversationId, collegeId);
  if (!convo) throw createHttpError(404, "Conversation not found.");
  return convo;
}

// ── Conversations ──

async function createConversation({ collegeId, userId, title }) {
  return repo.createConversation({ collegeId, userId, title });
}

async function listConversations(collegeId) {
  return repo.listConversations(collegeId);
}

async function getMessages({ collegeId, conversationId }) {
  await assertConversation(conversationId, collegeId);
  return repo.listMessages(conversationId);
}

// ── The turn loop ──

/**
 * One officer turn: persist the user message, run the model with the read-only
 * tool registry, persist the assistant reply (with its tool trace), and store
 * any propose_action results as pending proposals.
 */
async function sendMessage({ collegeId, userId, conversationId, text }) {
  const clean = String(text || "").trim();
  if (!clean) throw createHttpError(400, "Message is required.");
  if (clean.length > MAX_PROMPT_LEN) {
    throw createHttpError(400, `Message exceeds ${MAX_PROMPT_LEN} characters.`);
  }

  const convo = await assertConversation(conversationId, collegeId);
  const history = await repo.listMessages(conversationId, { limit: HISTORY_TURNS });

  const userMessage = await repo.insertMessage({
    conversationId,
    role: "user",
    content: clean,
  });

  const ctx = { collegeId, userId };
  const pendingProposals = [];

  let outcome;
  try {
    outcome = await gemini.generateWithTools({
      systemPrompt: SYSTEM_PROMPT,
      contents: [...toContents(history), { role: "user", parts: [{ text: clean }] }],
      toolDeclarations: tools.toolDeclarations(),
      executeTool: async (name, args) => {
        const result = await tools.executeTool(name, args, ctx);
        if (result && result.proposed === true) {
          pendingProposals.push({
            actionType: result.action_type,
            params: result.params,
            reason: result.reason,
          });
        }
        return result;
      },
    });
  } catch (error) {
    // The user's prompt is already persisted; surface the failure as 502 so the
    // UI can offer a retry without losing the conversation.
    throw createHttpError(502, error?.message || "Adjutant is unavailable. Please retry.");
  }

  const assistantMessage = await repo.insertMessage({
    conversationId,
    role: "assistant",
    content: outcome.text,
    toolCalls: outcome.toolTrace,
  });

  const proposals = [];
  for (const p of pendingProposals) {
    proposals.push(
      await repo.insertProposal({
        conversationId,
        messageId: assistantMessage.message_id,
        collegeId,
        actionType: p.actionType,
        params: p.params,
        reason: p.reason,
      })
    );
  }

  await repo.touchConversation(conversationId, {
    title: history.length === 0 ? deriveTitle(convo.title === "New conversation" ? clean : convo.title) : undefined,
  });

  return { user: userMessage, assistant: assistantMessage, proposals };
}

// ── Proposals ──

async function listProposals({ collegeId, status }) {
  if (status && !["pending", "approved", "rejected", "executed", "failed"].includes(status)) {
    throw createHttpError(400, "Invalid proposal status filter.");
  }
  return repo.listProposals(collegeId, { status });
}

/**
 * Human decision on a proposal. Reject just records it; approve records the
 * decision and then executes via the whitelist, storing the outcome
 * (executed/failed) for the audit trail.
 */
async function decideProposal({ collegeId, userId, proposalId, decision }) {
  if (!["approve", "reject"].includes(decision)) {
    throw createHttpError(400, 'decision must be "approve" or "reject".');
  }

  const existing = await repo.getProposal(proposalId, collegeId);
  if (!existing) throw createHttpError(404, "Proposal not found.");
  if (existing.status !== "pending") {
    throw createHttpError(409, `Proposal is already ${existing.status}.`);
  }

  const decided = await repo.decideProposal(proposalId, {
    status: decision === "approve" ? "approved" : "rejected",
    decidedBy: userId,
  });
  if (!decided) throw createHttpError(409, "Proposal was decided concurrently.");
  if (decision === "reject") return decided;

  try {
    const result = await tools.executeApprovedAction(
      decided.action_type,
      decided.params,
      { collegeId, userId }
    );
    return repo.recordExecution(proposalId, { status: "executed", result });
  } catch (error) {
    return repo.recordExecution(proposalId, {
      status: "failed",
      result: { error: error?.message || "Execution failed." },
    });
  }
}

module.exports = {
  SYSTEM_PROMPT,
  createConversation,
  listConversations,
  getMessages,
  sendMessage,
  listProposals,
  decideProposal,
};
