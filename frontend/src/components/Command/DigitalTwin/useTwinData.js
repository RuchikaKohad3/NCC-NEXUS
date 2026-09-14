// Responsibility: Data layer for the 3D Digital Twin. Fetches the existing
//   readiness snapshot (source of truth), best-effort identity and risk from
//   existing endpoints, and maps them into a clean view-model. NO new readiness
//   math is done here — this is presentation-only over the Intelligence/Decision
//   layers. Missing fields are hidden, never fabricated.
// Layer: Command Center UI (Layer 4).
// Depends on: api/intelApi, api/decisionApi. Must never be depended on by backend.

import { useCallback, useEffect, useMemo, useState } from "react";
import { intelApi } from "../../../api/intelApi";
import { decisionApi } from "../../../api/decisionApi";

// Read the cadet's own regimental_no / rank / name from the JWT + localStorage,
// used only as a fallback for the self-view where staff endpoints are 403.
function readSelf() {
  const out = { regimentalNo: "", rank: "", name: "" };
  try {
    const token = localStorage.getItem("token");
    if (token) {
      const payload = token.split(".")[1];
      if (payload) {
        const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
        out.regimentalNo = json?.regimental_no || "";
        out.rank = json?.rank || "";
      }
    }
    const raw = localStorage.getItem("user");
    if (raw) {
      const u = JSON.parse(raw);
      out.name = u?.full_name || u?.name || u?.username || "";
    }
  } catch {
    /* best-effort only */
  }
  return out;
}

export function selfRegimentalNo() {
  return readSelf().regimentalNo;
}

const TREND = {
  improving: { label: "Improving", dir: "up" },
  declining: { label: "Declining", dir: "down" },
  stable: { label: "Stable", dir: "flat" },
};

function trendOf(pillar) {
  const t = pillar?.trend;
  if (t && TREND[t]) return TREND[t];
  return { label: "Trend unavailable", dir: "none" };
}

// Status band for the overall readiness number.
export function readinessStatus(score) {
  if (score == null) return { key: "none", label: "No data" };
  if (score >= 75) return { key: "ready", label: "Camp Ready" };
  if (score >= 50) return { key: "developing", label: "Developing" };
  return { key: "risk", label: "At Risk" };
}

// Pillar → body anchor mapping for the overlay callouts.
const PILLAR_META = {
  knowledge: { label: "Knowledge", region: "head", side: "left", order: 0 },
  discipline: { label: "Discipline", region: "left-arm", side: "left", order: 1 },
  attendance: { label: "Attendance", region: "lower", side: "left", order: 2 },
  participation: { label: "Participation", region: "flank", side: "right", order: 0 },
  leadership: { label: "Leadership", region: "right-arm", side: "right", order: 1 },
};
const PILLAR_ORDER = ["knowledge", "discipline", "attendance", "participation", "leadership"];

function mapPillars(pillars = {}) {
  return PILLAR_ORDER.filter((k) => pillars[k]).map((k) => {
    const p = pillars[k];
    const meta = PILLAR_META[k];
    return {
      key: k,
      label: meta.label,
      region: meta.region,
      side: meta.side,
      order: meta.order,
      score: p.score,
      confidence: p.confidence,
      trend: trendOf(p),
      evidence: p.evidence || null,
      explanation: p.explanation || "",
    };
  });
}

/**
 * Digital Twin data hook.
 * @param {string} regimentalNo cadet to load (empty → self)
 */
export function useTwinData(regimentalNo) {
  const reg = regimentalNo || selfRegimentalNo();

  const [snapshot, setSnapshot] = useState(null);
  const [identity, setIdentity] = useState(null);
  const [risk, setRisk] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [needsCompute, setNeedsCompute] = useState(false);
  const [recomputing, setRecomputing] = useState(false);

  const load = useCallback(async () => {
    if (!reg) {
      setLoading(false);
      setError("No regimental number found for this session.");
      return;
    }
    setLoading(true);
    setError("");
    setNeedsCompute(false);

    // 1) Readiness snapshot — the source of truth (required).
    try {
      const res = await intelApi.getCadetReadiness(reg);
      setSnapshot(res.data);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 404) {
        setNeedsCompute(true);
        setSnapshot(null);
      } else if (status === 403) {
        setError("You are not authorised to view this cadet's readiness.");
      } else {
        setError(err?.response?.data?.message || "Unable to load readiness data.");
      }
      setLoading(false);
      return;
    }

    // 2) Identity — staff cohort first, self-view fallback. Best-effort, non-fatal.
    let id = null;
    try {
      const res = await intelApi.getCollegeReadiness();
      const row = (Array.isArray(res.data) ? res.data : []).find(
        (r) => r.regimental_no === reg
      );
      if (row) id = { name: row.full_name || "", rank: row.rank_name || "", regNo: reg };
    } catch {
      /* not staff / unavailable — fall through to self */
    }
    if (!id) {
      const self = readSelf();
      if (self.regimentalNo === reg) id = { name: self.name, rank: self.rank, regNo: reg };
      else id = { name: "", rank: "", regNo: reg };
    }
    setIdentity(id);

    // 3) Risk — decision layer (staff only). Best-effort, non-fatal.
    try {
      const res = await decisionApi.getAtRisk();
      const row = (Array.isArray(res.data) ? res.data : []).find(
        (r) => r.regimental_no === reg
      );
      setRisk(row || null);
    } catch {
      setRisk(null);
    }

    setLoading(false);
  }, [reg]);

  useEffect(() => {
    load();
  }, [load]);

  const recompute = useCallback(async () => {
    if (!reg) return;
    setRecomputing(true);
    setError("");
    try {
      const res = await intelApi.recompute(reg);
      setSnapshot(res.data);
      setNeedsCompute(false);
    } catch (err) {
      setError(err?.response?.data?.message || "Recompute failed. Please try again.");
    } finally {
      setRecomputing(false);
    }
  }, [reg]);

  const view = useMemo(() => {
    if (!snapshot) return null;
    return {
      regNo: reg,
      overall: {
        score: snapshot.overall_score,
        confidence: snapshot.overall_confidence,
        status: readinessStatus(snapshot.overall_score),
      },
      pillars: mapPillars(snapshot.pillars),
      computedAt: snapshot.computed_at || null,
    };
  }, [snapshot, reg]);

  return {
    reg,
    loading,
    error,
    needsCompute,
    recomputing,
    snapshot,
    identity,
    risk,
    view,
    reload: load,
    recompute,
  };
}

export default useTwinData;
