// Responsibility: Golden unit tests for the Adjutant tool whitelist (M9) —
//   registry shape, unknown-tool rejection, context enforcement, and
//   propose_action validation. Only DB-free tools are executed here.
// Layer: AI Adjutant (Layer 3) test — no DB, no network.
// Depends on: modules/adjutant/adjutant.tools.
// Must never be depended on by: anything (test file).

const {
  TOOLS,
  EXECUTABLE_ACTIONS,
  PROPOSABLE_ACTION_TYPES,
  toolDeclarations,
  executeTool,
  executeApprovedAction,
} = require("../src/modules/adjutant/adjutant.tools");

const CTX = { collegeId: 1, userId: 42 };

describe("adjutant tool registry", () => {
  test("declarations cover exactly the registered tools, with schemas", () => {
    const decls = toolDeclarations();
    expect(decls.map((d) => d.name).sort()).toEqual(Object.keys(TOOLS).sort());
    for (const d of decls) {
      expect(typeof d.description).toBe("string");
      expect(d.parameters?.type).toBe("object");
    }
  });

  test("every proposable action type is executable and vice versa", () => {
    expect(PROPOSABLE_ACTION_TYPES.sort()).toEqual(Object.keys(EXECUTABLE_ACTIONS).sort());
  });

  test("a tool outside the whitelist is rejected by name", async () => {
    await expect(executeTool("drop_all_tables", {}, CTX)).rejects.toThrow(/whitelist/);
  });

  test("missing college context is rejected even for a valid tool", async () => {
    await expect(executeTool("propose_action", { action_type: "scan_at_risk", reason: "x" }, {}))
      .rejects.toThrow(/college/i);
  });
});

describe("propose_action", () => {
  test("returns a proposal marker and NEVER executes", async () => {
    const result = await executeTool(
      "propose_action",
      { action_type: "scan_at_risk", reason: "Two cadets look newly at risk." },
      CTX
    );
    expect(result.proposed).toBe(true);
    expect(result.action_type).toBe("scan_at_risk");
    expect(result.summary).toMatch(/approval/);
  });

  test("rejects an action_type outside the executable whitelist", async () => {
    await expect(
      executeTool("propose_action", { action_type: "delete_cadet", reason: "no" }, CTX)
    ).rejects.toThrow(/Unknown action_type/);
  });

  test("enforces per-action required params (acknowledge_flag needs flag_id)", async () => {
    await expect(
      executeTool("propose_action", { action_type: "acknowledge_flag", reason: "seen" }, CTX)
    ).rejects.toThrow(/flag_id/);

    const ok = await executeTool(
      "propose_action",
      { action_type: "acknowledge_flag", params: { flag_id: 7 }, reason: "seen" },
      CTX
    );
    expect(ok.proposed).toBe(true);
    expect(ok.params.flag_id).toBe(7);
  });

  test("caps runaway reasons instead of storing unbounded text", async () => {
    const result = await executeTool(
      "propose_action",
      { action_type: "scan_at_risk", reason: "x".repeat(5000) },
      CTX
    );
    expect(result.reason.length).toBeLessThanOrEqual(2000);
  });
});

describe("executeApprovedAction", () => {
  test("re-validates the whitelist at execution time", async () => {
    await expect(executeApprovedAction("rm_rf", {}, CTX)).rejects.toThrow(/not executable/);
  });

  test("re-validates required params at execution time", async () => {
    await expect(executeApprovedAction("acknowledge_flag", {}, CTX)).rejects.toThrow(/flag_id/);
  });
});
