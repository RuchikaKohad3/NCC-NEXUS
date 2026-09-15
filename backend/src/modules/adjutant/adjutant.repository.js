// Responsibility: Read/write access for the NEW adjutant tables —
//   conversations, messages, and action proposals (M9).
// Layer: AI Adjutant (Layer 3) — data access for the NEW tables only.
// Depends on: db/knex and the three new adjutant_* tables.
// Must never be depended on by: any existing/legacy module.
// NOTE: This file MAY INSERT/UPDATE — but ONLY the new adjutant_* tables.
//   It never writes to any existing/legacy table.

const db = require("../../db/knex");

const CONVOS = "adjutant_conversations";
const MESSAGES = "adjutant_messages";
const PROPOSALS = "adjutant_action_proposals";

const parseJson = (v) => (typeof v === "string" ? JSON.parse(v) : v);

const normalizeConvo = (row) =>
  row ? { ...row, conversation_id: Number(row.conversation_id) } : null;

const normalizeMessage = (row) =>
  row
    ? {
        ...row,
        message_id: Number(row.message_id),
        conversation_id: Number(row.conversation_id),
        tool_calls: row.tool_calls == null ? null : parseJson(row.tool_calls),
      }
    : null;

const normalizeProposal = (row) =>
  row
    ? {
        ...row,
        proposal_id: Number(row.proposal_id),
        conversation_id: Number(row.conversation_id),
        message_id: row.message_id == null ? null : Number(row.message_id),
        params: parseJson(row.params),
        result: row.result == null ? null : parseJson(row.result),
      }
    : null;

// ── Conversations ──

async function createConversation({ collegeId, userId, title }) {
  const [row] = await db(CONVOS)
    .insert({
      college_id: collegeId,
      created_by_user_id: userId ?? null,
      title: title || "New conversation",
    })
    .returning("*");
  return normalizeConvo(row);
}

async function listConversations(collegeId, { limit = 50 } = {}) {
  const rows = await db(CONVOS)
    .where({ college_id: collegeId })
    .whereNull("deleted_at")
    .orderBy("updated_at", "desc")
    .limit(limit);
  return rows.map(normalizeConvo);
}

async function getConversation(conversationId, collegeId) {
  const row = await db(CONVOS)
    .where({ conversation_id: conversationId, college_id: collegeId })
    .whereNull("deleted_at")
    .first();
  return normalizeConvo(row);
}

async function touchConversation(conversationId, { title } = {}) {
  await db(CONVOS)
    .where({ conversation_id: conversationId })
    .update({ updated_at: db.fn.now(), ...(title ? { title } : {}) });
}

// ── Messages ──

async function insertMessage({ conversationId, role, content, toolCalls }) {
  const [row] = await db(MESSAGES)
    .insert({
      conversation_id: conversationId,
      role,
      content,
      tool_calls: toolCalls?.length ? JSON.stringify(toolCalls) : null,
    })
    .returning("*");
  return normalizeMessage(row);
}

async function listMessages(conversationId, { limit = 200 } = {}) {
  const rows = await db(MESSAGES)
    .where({ conversation_id: conversationId })
    .orderBy("message_id", "asc")
    .limit(limit);
  return rows.map(normalizeMessage);
}

// ── Proposals ──

async function insertProposal({ conversationId, messageId, collegeId, actionType, params, reason }) {
  const [row] = await db(PROPOSALS)
    .insert({
      conversation_id: conversationId,
      message_id: messageId ?? null,
      college_id: collegeId,
      action_type: actionType,
      params: JSON.stringify(params || {}),
      reason: reason ?? null,
      status: "pending",
    })
    .returning("*");
  return normalizeProposal(row);
}

async function listProposals(collegeId, { status, limit = 100 } = {}) {
  const q = db(PROPOSALS).where({ college_id: collegeId });
  if (status) q.andWhere({ status });
  const rows = await q.orderBy("created_at", "desc").limit(limit);
  return rows.map(normalizeProposal);
}

async function getProposal(proposalId, collegeId) {
  const row = await db(PROPOSALS)
    .where({ proposal_id: proposalId, college_id: collegeId })
    .first();
  return normalizeProposal(row);
}

/** pending → approved/rejected, guarded so a proposal is only decided once. */
async function decideProposal(proposalId, { status, decidedBy }) {
  const [row] = await db(PROPOSALS)
    .where({ proposal_id: proposalId, status: "pending" })
    .update({
      status,
      decided_by: decidedBy ?? null,
      decided_at: db.fn.now(),
      updated_at: db.fn.now(),
    })
    .returning("*");
  return normalizeProposal(row);
}

/** approved → executed/failed with the execution outcome for the audit trail. */
async function recordExecution(proposalId, { status, result }) {
  const [row] = await db(PROPOSALS)
    .where({ proposal_id: proposalId })
    .update({
      status,
      result: JSON.stringify(result ?? null),
      updated_at: db.fn.now(),
    })
    .returning("*");
  return normalizeProposal(row);
}

module.exports = {
  createConversation,
  listConversations,
  getConversation,
  touchConversation,
  insertMessage,
  listMessages,
  insertProposal,
  listProposals,
  getProposal,
  decideProposal,
  recordExecution,
};
