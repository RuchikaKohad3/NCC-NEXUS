// Responsibility: ANO Command Center — unit readiness summary + sortable/searchable
//   cohort table, with a college-wide recompute. Drills into a cadet's Digital Twin.
// Layer: Command Center UI (Layer 4).
// Depends on: react-router-dom (useNavigate), api/intelApi (cohort + recompute-college),
//   commandCenter.css. Rendered inside the ANO shell (/ano/command).
// Must never be depended on by: backend code or the Intelligence/Decision layers.
// Visuals use hand-rolled SVG/CSS only (ADL-008 — no charting library yet).

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Gauge,
  Users,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileDown,
  Search,
  ArrowUpDown,
  ChevronRight,
} from "lucide-react";
import { intelApi } from "../../api/intelApi";
import { exportReadinessBrief } from "./commandPdfExport";
import "./commandCenter.css";

function band(score) {
  if (score == null) return "cc-none";
  if (score >= 75) return "cc-good";
  if (score >= 50) return "cc-warn";
  return "cc-bad";
}

const SORTS = {
  readiness: (a, b) => scoreVal(b.overall_score) - scoreVal(a.overall_score),
  name: (a, b) => String(a.full_name || "").localeCompare(String(b.full_name || "")),
  confidence: (a, b) => (b.overall_confidence ?? -1) - (a.overall_confidence ?? -1),
};

// Null scores sort to the bottom regardless of direction helper.
function scoreVal(s) {
  return s == null ? -1 : s;
}

export default function CommandCenter() {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [recomputing, setRecomputing] = useState(false);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("readiness");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await intelApi.getCollegeReadiness();
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      if (err?.response?.status === 403) {
        setError("Only officers (ANO/SUO) can view the Command Center.");
      } else {
        setError(err?.response?.data?.message || "Failed to load cohort readiness.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRecomputeAll = async () => {
    setRecomputing(true);
    setError("");
    try {
      await intelApi.recomputeCollege();
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Recompute failed.");
    } finally {
      setRecomputing(false);
    }
  };

  // ── Derived summary ──
  const summary = useMemo(() => {
    const scored = rows.filter((r) => r.has_snapshot && r.overall_score != null);
    const avg = scored.length
      ? Math.round(scored.reduce((s, r) => s + r.overall_score, 0) / scored.length)
      : null;
    const ready = scored.filter((r) => r.overall_score >= 75).length;
    const developing = scored.filter((r) => r.overall_score >= 50 && r.overall_score < 75).length;
    const atRisk = scored.filter((r) => r.overall_score < 50).length;
    const notComputed = rows.length - scored.length;
    return { total: rows.length, scored: scored.length, avg, ready, developing, atRisk, notComputed };
  }, [rows]);

  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? rows.filter(
          (r) =>
            String(r.full_name || "").toLowerCase().includes(q) ||
            String(r.regimental_no || "").toLowerCase().includes(q)
        )
      : rows;
    return [...filtered].sort(SORTS[sortKey] || SORTS.readiness);
  }, [rows, query, sortKey]);

  const distTotal = Math.max(1, summary.total);
  const pct = (n) => `${(100 * n) / distTotal}%`;

  return (
    <div className="cc-page">
      {/* HERO */}
      <div className="cc-hero">
        <div>
          <h1 className="cc-title">Command Center</h1>
          <p className="cc-sub">Unit readiness intelligence across your college</p>
        </div>
        <div className="cc-hero-actions">
          <button
            className="cc-btn cc-btn-ghost"
            onClick={() => exportReadinessBrief({ rows: visibleRows })}
            disabled={loading || rows.length === 0}
            title="Export the cohort as an officer-ready PDF brief (current sort & filter)"
          >
            <FileDown size={15} /> Export brief
          </button>
          <button className="cc-btn" onClick={handleRecomputeAll} disabled={recomputing || loading}>
            <RefreshCw size={15} className={recomputing ? "cc-spin" : ""} />
            {recomputing ? "Recomputing…" : "Recompute all"}
          </button>
        </div>
      </div>

      {error && (
        <div className="cc-state cc-state-error">
          <AlertTriangle size={20} /> {error}
        </div>
      )}

      {/* SUMMARY STATS */}
      <div className="cc-stats">
        <div className="cc-stat">
          <div className="cc-stat-ic cc-ic-navy"><Gauge size={20} /></div>
          <div>
            <h3 className={band(summary.avg)}>{summary.avg == null ? "—" : `${summary.avg}%`}</h3>
            <p>Unit Readiness</p>
          </div>
        </div>
        <div className="cc-stat">
          <div className="cc-stat-ic cc-ic-indigo"><Users size={20} /></div>
          <div>
            <h3>{summary.total}</h3>
            <p>Cadets</p>
          </div>
        </div>
        <div className="cc-stat">
          <div className="cc-stat-ic cc-ic-teal"><CheckCircle2 size={20} /></div>
          <div>
            <h3>{summary.ready}</h3>
            <p>Camp-Ready (≥75)</p>
          </div>
        </div>
        <div className="cc-stat">
          <div className="cc-stat-ic cc-ic-red"><AlertTriangle size={20} /></div>
          <div>
            <h3>{summary.atRisk}</h3>
            <p>At Risk (&lt;50)</p>
          </div>
        </div>
      </div>

      {/* DISTRIBUTION BAR */}
      <div className="cc-dist">
        <div className="cc-dist-bar">
          <span className="cc-seg cc-seg-good" style={{ width: pct(summary.ready) }} title={`Ready: ${summary.ready}`} />
          <span className="cc-seg cc-seg-warn" style={{ width: pct(summary.developing) }} title={`Developing: ${summary.developing}`} />
          <span className="cc-seg cc-seg-bad" style={{ width: pct(summary.atRisk) }} title={`At risk: ${summary.atRisk}`} />
          <span className="cc-seg cc-seg-none" style={{ width: pct(summary.notComputed) }} title={`Not computed: ${summary.notComputed}`} />
        </div>
        <div className="cc-legend">
          <span><i className="cc-dot cc-seg-good" /> Ready {summary.ready}</span>
          <span><i className="cc-dot cc-seg-warn" /> Developing {summary.developing}</span>
          <span><i className="cc-dot cc-seg-bad" /> At risk {summary.atRisk}</span>
          <span><i className="cc-dot cc-seg-none" /> Not computed {summary.notComputed}</span>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="cc-toolbar">
        <div className="cc-search">
          <Search size={15} />
          <input
            type="text"
            placeholder="Search by name or regimental no…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="cc-sort">
          <ArrowUpDown size={14} />
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
            <option value="readiness">Sort: Readiness</option>
            <option value="name">Sort: Name</option>
            <option value="confidence">Sort: Confidence</option>
          </select>
        </div>
      </div>

      {/* TABLE */}
      {loading ? (
        <div className="cc-skeleton" />
      ) : visibleRows.length === 0 ? (
        <div className="cc-state">
          {rows.length === 0
            ? "No cadets found for your college."
            : "No cadets match your search."}
        </div>
      ) : (
        <div className="cc-table-wrap">
          <table className="cc-table">
            <thead>
              <tr>
                <th>Cadet</th>
                <th>Reg. No</th>
                <th>Rank</th>
                <th>Readiness</th>
                <th>Confidence</th>
                <th aria-label="view" />
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((r) => (
                <tr
                  key={r.regimental_no}
                  className="cc-row"
                  onClick={() => navigate(`/ano/command/cadet/${encodeURIComponent(r.regimental_no)}`)}
                >
                  <td className="cc-name">{r.full_name || "—"}</td>
                  <td className="cc-mono">{r.regimental_no}</td>
                  <td>{r.rank_name || "—"}</td>
                  <td>
                    {r.overall_score == null ? (
                      <span className="cc-pill cc-none">Not computed</span>
                    ) : (
                      <div className="cc-readiness">
                        <span className={`cc-score ${band(r.overall_score)}`}>
                          {Math.round(r.overall_score)}
                        </span>
                        <div className="cc-bar">
                          <div
                            className={`cc-bar-fill ${band(r.overall_score)}`}
                            style={{ width: `${Math.max(0, Math.min(100, r.overall_score))}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="cc-conf">
                    {r.overall_confidence == null ? "—" : `${Math.round(r.overall_confidence * 100)}%`}
                  </td>
                  <td className="cc-chev"><ChevronRight size={16} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
