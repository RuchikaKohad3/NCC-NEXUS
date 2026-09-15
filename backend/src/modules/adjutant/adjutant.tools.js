// Responsibility: The Adjutant's whitelisted tool registry (M9) — the ONLY
//   surface the LLM can touch. Every tool is READ-ONLY over the Intelligence /
//   Decision services; `college_id` always comes from the caller's JWT context,
//   never from model arguments (ADL-006). Consequential actions are not executed
//   here: `propose_action` merely returns a proposal marker that the service
//   persists for human approval.
// Layer: AI Adjutant (Layer 3). Depends DOWNWARD on intelligence.service and
//   decision.service — never the reverse.
// Must never be depended on by: legacy modules, bot.service.js, or Layers 1–2.

const intelligenceService = require("../intelligence/intelligence.service");
const decisionService = require("../decision/decision.service");

// ── Actions a human may approve for execution (the ONLY writes reachable
//    from an Adjutant conversation, all via existing service functions). ──
const EXECUTABLE_ACTIONS = {
  acknowledge_flag: {
    description: "Mark one at-risk flag as acknowledged by the officer.",
    requiredParams: ["flag_id"],
    execute: async (params, ctx) =>
      decisionService.acknowledgeFlag(Number(params.flag_id), ctx.collegeId, ctx.userId),
  },
  scan_at_risk: {
    description: "Run an at-risk scan: reconcile persisted flags for the college.",
    requiredParams: [],
    execute: async (_params, ctx) => decisionService.scanCollege(ctx.collegeId, {}),
  },
  recompute_college: {
    description: "Recompute readiness snapshots for every cadet in the college.",
    requiredParams: [],
    execute: async (_params, ctx) => intelligenceService.recomputeCollege(ctx.collegeId),
  },
};

const PROPOSABLE_ACTION_TYPES = Object.keys(EXECUTABLE_ACTIONS);

// ── Payload shapers: keep tool results small and evidence-focused so the
//    model reasons over facts without drowning in JSONB blobs. ──

const pillarBrief = (pillars = {}) => {
  const out = {};
  for (const [key, p] of Object.entries(pillars || {})) {
    if (!p) continue;
    out[key] = {
      score: p.score,
      confidence: p.confidence,
      trend: p.trend,
      explanation: p.explanation,
    };
  }
  return out;
};

const weakestPillar = (pillars = {}) => {
  let worst = null;
  for (const [key, p] of Object.entries(pillars || {})) {
    if (!p || p.score == null) continue;
    if (!worst || p.score < worst.score) worst = { pillar: key, score: p.score };
  }
  return worst;
};

const cohortRow = (row) => ({
  regimental_no: row.regimental_no,
  full_name: row.full_name,
  rank_name: row.rank_name,
  overall_score: row.overall_score,
  overall_confidence: row.overall_confidence,
  has_snapshot: row.has_snapshot,
  weakest_pillar: row.pillars ? weakestPillar(row.pillars) : null,
});

// ── The read-only tool set. `parameters` follow Gemini functionDeclarations
//    (OpenAPI-style schema objects). ──
const TOOLS = {
  get_cohort_readiness: {
    description:
      "Readiness of every cadet in the officer's own college: overall score, confidence, and weakest pillar per cadet. Use for cohort-wide questions.",
    parameters: { type: "object", properties: {} },
    execute: async (_args, ctx) => {
      const rows = await intelligenceService.getCollegeReadiness(ctx.collegeId);
      return {
        summary: `Cohort of ${rows.length} cadet(s), ${rows.filter((r) => r.has_snapshot).length} with snapshots.`,
        cadets: rows.map(cohortRow),
      };
    },
  },

  get_cadet_readiness: {
    description:
      "Latest readiness snapshot for ONE cadet by regimental number: overall score/confidence plus per-pillar score, trend and plain-English explanation.",
    parameters: {
      type: "object",
      properties: {
        regimental_no: { type: "string", description: "The cadet's regimental number." },
      },
      required: ["regimental_no"],
    },
    execute: async (args, ctx) => {
      const regimentalNo = String(args.regimental_no || "").trim();
      if (!regimentalNo) throw new Error("regimental_no is required.");
      const snap = await intelligenceService.getCadetReadiness(regimentalNo);
      if (!snap) return { summary: `No snapshot for ${regimentalNo} yet.`, snapshot: null };
      if (Number(snap.college_id) !== Number(ctx.collegeId)) {
        // Cross-tenant probe: identical answer to "not found" (no existence oracle).
        return { summary: `No snapshot for ${regimentalNo} yet.`, snapshot: null };
      }
      return {
        summary: `Snapshot for ${regimentalNo}: overall ${snap.overall_score} at confidence ${snap.overall_confidence}.`,
        snapshot: {
          regimental_no: snap.regimental_no,
          overall_score: snap.overall_score,
          overall_confidence: snap.overall_confidence,
          computed_at: snap.computed_at,
          pillars: pillarBrief(snap.pillars),
        },
      };
    },
  },

  get_at_risk: {
    description:
      "Live at-risk list for the college: cadets with 2+ risk drivers, severity-sorted, each with drivers and a recommended action.",
    parameters: { type: "object", properties: {} },
    execute: async (_args, ctx) => {
      const rows = await decisionService.getCollegeRisk(ctx.collegeId);
      return {
        summary: `${rows.length} cadet(s) currently at risk.`,
        at_risk: rows.map((r) => ({
          regimental_no: r.regimental_no,
          full_name: r.full_name,
          severity: r.severity,
          drivers: (r.drivers || []).map((d) => d.label),
          recommended_action: r.recommendedAction,
          overall_score: r.overall_score,
        })),
      };
    },
  },

  get_active_flags: {
    description:
      "Persisted at-risk flags (open + acknowledged) with their ids — use the id when proposing acknowledge_flag.",
    parameters: { type: "object", properties: {} },
    execute: async (_args, ctx) => {
      const rows = await decisionService.listFlags(ctx.collegeId);
      return {
        summary: `${rows.length} active flag(s).`,
        flags: rows.map((f) => ({
          flag_id: f.id,
          regimental_no: f.regimental_no,
          severity: f.severity,
          status: f.status,
          recommended_action: f.recommended_action,
        })),
      };
    },
  },

  get_camp_selection: {
    description:
      "Rank the cohort for a camp/board under a decision profile and seat count. Returns selected, standby and summary.",
    parameters: {
      type: "object",
      properties: {
        slots: { type: "integer", description: "Number of seats (>= 1)." },
        reserves: { type: "integer", description: "Reserve seats (default 0)." },
        profile: {
          type: "string",
          description: "Decision profile: rdc, promotion, certificate or general.",
        },
        min_readiness: { type: "number", description: "Optional hard readiness gate 0-100." },
      },
      required: ["slots"],
    },
    execute: async (args, ctx) => {
      const selection = await decisionService.getCampSelection(ctx.collegeId, {
        slots: args.slots,
        reserves: args.reserves,
        profile: args.profile,
        minReadiness: args.min_readiness,
      });
      const brief = (c) => ({
        regimental_no: c.regimental_no,
        full_name: c.full_name,
        overall_score: c.overall_score,
        rank: c.rank,
        reasons: c.reasons,
        caveats: (c.caveats || []).map((x) => x.label),
      });
      return {
        summary: `Selected ${selection.summary.selectedCount}/${selection.slots} with ${selection.summary.standbyCount} reserve(s) under profile "${selection.profile}".`,
        weights: selection.weights,
        selected: selection.selected.map(brief),
        standby: selection.standby.map(brief),
        board_summary: selection.summary,
      };
    },
  },

  propose_action: {
    description:
      "Propose a consequential action for HUMAN approval — never executes anything. Allowed action_type values: " +
      PROPOSABLE_ACTION_TYPES.join(", ") +
      ". Always include a short reason.",
    parameters: {
      type: "object",
      properties: {
        action_type: { type: "string", description: PROPOSABLE_ACTION_TYPES.join(" | ") },
        params: {
          type: "object",
          description: "Action parameters, e.g. { flag_id } for acknowledge_flag.",
          properties: {
            flag_id: { type: "integer", description: "Flag id (acknowledge_flag only)." },
          },
        },
        reason: { type: "string", description: "Why this action is recommended." },
      },
      required: ["action_type", "reason"],
    },
    execute: async (args) => {
      const actionType = String(args.action_type || "").trim();
      const spec = EXECUTABLE_ACTIONS[actionType];
      if (!spec) {
        throw new Error(
          `Unknown action_type "${actionType}". Allowed: ${PROPOSABLE_ACTION_TYPES.join(", ")}`
        );
      }
      const params = args.params && typeof args.params === "object" ? args.params : {};
      for (const key of spec.requiredParams) {
        if (params[key] == null) throw new Error(`params.${key} is required for ${actionType}.`);
      }
      // Marker only — adjutant.service persists it as a pending proposal.
      return {
        proposed: true,
        action_type: actionType,
        params,
        reason: String(args.reason || "").slice(0, 2000),
        summary: `Proposed ${actionType} — awaiting officer approval.`,
      };
    },
  },
};

/** Gemini functionDeclarations for every registered tool. */
function toolDeclarations() {
  return Object.entries(TOOLS).map(([name, t]) => ({
    name,
    description: t.description,
    parameters: t.parameters,
  }));
}

/**
 * Execute one whitelisted tool with the SERVER-side context. Unknown names are
 * rejected — the model cannot reach anything outside this registry.
 */
async function executeTool(name, args, ctx) {
  const tool = TOOLS[name];
  if (!tool) throw new Error(`Tool "${name}" is not in the Adjutant whitelist.`);
  if (ctx?.collegeId == null) throw new Error("Missing college context.");
  return tool.execute(args || {}, ctx);
}

/** Execute a HUMAN-APPROVED proposal (whitelist enforced again at execution). */
async function executeApprovedAction(actionType, params, ctx) {
  const spec = EXECUTABLE_ACTIONS[actionType];
  if (!spec) throw new Error(`Action "${actionType}" is not executable.`);
  for (const key of spec.requiredParams) {
    if (params?.[key] == null) throw new Error(`params.${key} is required for ${actionType}.`);
  }
  return spec.execute(params || {}, ctx);
}

module.exports = {
  TOOLS,
  EXECUTABLE_ACTIONS,
  PROPOSABLE_ACTION_TYPES,
  toolDeclarations,
  executeTool,
  executeApprovedAction,
};
