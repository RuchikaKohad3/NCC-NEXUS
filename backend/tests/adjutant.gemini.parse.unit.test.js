// Responsibility: Golden unit tests for Gemini response parsing (M9) —
//   parseModelTurn splits a generateContent payload into text + functionCalls.
// Layer: AI Adjutant (Layer 3) test — no DB, no network (fixture payloads only).
// Depends on: services/adjutant.gemini.service (pure export only).
// Must never be depended on by: anything (test file).

const { parseModelTurn } = require("../src/services/adjutant.gemini.service");

describe("parseModelTurn", () => {
  test("plain text answer", () => {
    const turn = parseModelTurn({
      candidates: [{ content: { parts: [{ text: "Jai Hind. 3 cadets are at risk." }] } }],
    });
    expect(turn.text).toBe("Jai Hind. 3 cadets are at risk.");
    expect(turn.functionCalls).toEqual([]);
  });

  test("single function call with args", () => {
    const turn = parseModelTurn({
      candidates: [
        {
          content: {
            parts: [{ functionCall: { name: "get_cadet_readiness", args: { regimental_no: "R1" } } }],
          },
        },
      ],
    });
    expect(turn.functionCalls).toEqual([
      { name: "get_cadet_readiness", args: { regimental_no: "R1" } },
    ]);
    expect(turn.text).toBe("");
  });

  test("mixed text + multiple (parallel) function calls, order preserved", () => {
    const turn = parseModelTurn({
      candidates: [
        {
          content: {
            parts: [
              { text: "Checking the cohort." },
              { functionCall: { name: "get_cohort_readiness", args: {} } },
              { functionCall: { name: "get_at_risk" } }, // args omitted by model
            ],
          },
        },
      ],
    });
    expect(turn.text).toBe("Checking the cohort.");
    expect(turn.functionCalls.map((c) => c.name)).toEqual([
      "get_cohort_readiness",
      "get_at_risk",
    ]);
    expect(turn.functionCalls[1].args).toEqual({}); // missing args normalised
  });

  test("modelParts are echoed verbatim for the continuation turn", () => {
    const parts = [{ functionCall: { name: "get_at_risk", args: {} } }];
    const turn = parseModelTurn({ candidates: [{ content: { parts } }] });
    expect(turn.modelParts).toBe(parts);
  });

  test("malformed payloads degrade to an empty turn, never throw", () => {
    for (const payload of [null, {}, { candidates: [] }, { candidates: [{ content: {} }] }]) {
      const turn = parseModelTurn(payload);
      expect(turn).toEqual({ text: "", functionCalls: [], modelParts: [] });
    }
  });
});
