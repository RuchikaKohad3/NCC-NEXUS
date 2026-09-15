// Responsibility: Golden unit tests for profile re-aggregation over stored
//   pillars (M11) — applyProfileWeights on intelligence.service.
// Layer: Intelligence (Layer 1) test — pure function only, no DB is queried
//   (requiring the service builds a knex instance but never connects).
// Depends on: modules/intelligence/intelligence.service (pure export only).
// Must never be depended on by: anything (test file).

const { applyProfileWeights } = require("../src/modules/intelligence/intelligence.service");

const P = (score, confidence) => ({ score, confidence });

const row = (reg, pillars, overall = null) => ({
  regimental_no: reg,
  full_name: `Cadet ${reg}`,
  rank_name: null,
  has_snapshot: Boolean(pillars),
  overall_score: overall,
  overall_confidence: pillars ? 1 : null,
  pillars: pillars || null,
});

describe("applyProfileWeights", () => {
  test("re-weighs overall from stored pillars under the given weights", () => {
    const cohort = [row("R1", { attendance: P(100, 1), knowledge: P(0, 1) }, 50)];

    const attendanceHeavy = applyProfileWeights(cohort, { attendance: 0.9, knowledge: 0.1 });
    expect(attendanceHeavy[0].overall_score).toBe(90);

    const knowledgeHeavy = applyProfileWeights(cohort, { attendance: 0.1, knowledge: 0.9 });
    expect(knowledgeHeavy[0].overall_score).toBe(10);
  });

  test("changing weights changes RANK ORDER between two cadets", () => {
    const cohort = [
      row("SOLDIER", { attendance: P(95, 1), knowledge: P(40, 1) }),
      row("SCHOLAR", { attendance: P(40, 1), knowledge: P(95, 1) }),
    ];

    const rdcLike = applyProfileWeights(cohort, { attendance: 0.8, knowledge: 0.2 });
    expect(rdcLike[0].overall_score).toBeGreaterThan(rdcLike[1].overall_score);

    const certLike = applyProfileWeights(cohort, { attendance: 0.2, knowledge: 0.8 });
    expect(certLike[1].overall_score).toBeGreaterThan(certLike[0].overall_score);
  });

  test("rows without a snapshot pass through untouched", () => {
    const bare = row("R9", null);
    const [result] = applyProfileWeights([bare], { attendance: 1 });
    expect(result).toBe(bare);
  });

  test("fairness is preserved: a pillar with no data sheds weight, never zeros", () => {
    const cohort = [row("R2", { attendance: P(80, 1), knowledge: P(null, 0) })];
    const [result] = applyProfileWeights(cohort, { attendance: 0.5, knowledge: 0.5 });
    expect(result.overall_score).toBe(80); // knowledge's weight shed onto attendance
    expect(result.overall_confidence).toBeCloseTo(0.5, 3); // but confidence is honest
  });

  test("null/undefined weights are a no-op (general fast path)", () => {
    const cohort = [row("R3", { attendance: P(70, 1) }, 70)];
    expect(applyProfileWeights(cohort, null)).toBe(cohort);
  });
});
