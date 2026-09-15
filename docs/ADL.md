<!--
Responsibility: Architecture Decision Log for the NCC NEXUS COMMAND (Intelligence / Decision / Adjutant) initiative.
Layer: Project documentation (no runtime code).
Depends on: the approved SDD and Repository Integration Blueprint.
Must never be depended on by: any source code — this is a human-facing record only.
Append a new ADL-NNN entry whenever an architectural decision affects future implementation.
-->

# Architecture Decision Log — NCC NEXUS COMMAND

Format per entry: **Decision** · **Why** · **Alternatives considered** · **Rejected because** (when applicable) · **Consequence**.

Entries are append-only. Existing decisions are never rewritten; if a decision changes, a new ADL entry supersedes the previous one while preserving history.


---

## ADL-001 — Intelligence Layer reads existing tables via a dedicated read-only repository
- **Decision:** The Intelligence Layer reads existing data directly through a dedicated repository that issues SELECT-only queries.
- **Why:** Avoid modifying existing services and controllers.
- **Alternatives considered:** Reuse the existing service layer.
- **Rejected because:** Existing services are user/request-oriented and would tightly couple new intelligence code to them.
- **Consequence:** Legacy application remains untouched; the Intelligence Layer stays isolated and independently testable.

## ADL-002 — Additive-only architecture
- **Decision:** All intelligence work lives in new modules (`modules/intelligence`, `modules/decision`, `modules/adjutant`) and new tables only.
- **Why:** The existing app is production; zero regression is required.
- **Alternatives considered:** Extend/refactor existing modules to host new logic.
- **Rejected because:** Any edit to working modules risks the frozen features (attendance, quiz, meetings, etc.).
- **Consequence:** Only additive route registrations in `app.js` and additive frontend routes are allowed; the feature is fully reversible.

## ADL-003 — Precomputed snapshots instead of live aggregation
- **Decision:** Readiness scores are precomputed into snapshot tables. For the MVP, recomputation is manual through `POST /api/intel/recompute`; automated scheduling will be introduced only after the architecture is validated.
- **Why:** Snapshot-based computation provides O(1) read performance, historical trend analysis, reproducible recommendations, and predictable system behaviour.
- **Alternatives considered:** Aggregate scores dynamically on every request.
- **Rejected because:** Live aggregation requires joining multiple operational modules for every request, increases latency, complicates caching, and provides no historical record.
- **Consequence:** Scores may become slightly stale between recomputations, but the architecture remains scalable, deterministic, and easy to audit. Automated scheduling is intentionally deferred until the vertical slice is validated.

## ADL-004 — Explainable deterministic scoring, not trained ML
- **Decision:** Pillar scores are pure-function, deterministic formulas with tunable weights stored in `scoring_config`.
- **Why:** No dataset exists; defence-context requires trust; the design must be viva-defensible.
- **Alternatives considered:** Train a custom ML model to produce scores.
- **Rejected because:** No labelled data, and a black-box score is neither explainable nor auditable.
- **Consequence:** Every score is traceable to source rows and a visible formula; weights are versioned and adjustable.

## ADL-005 — Confidence-aware aggregation (absence of data = low confidence, never zero)
- **Decision:** Overall readiness is a confidence-weighted blend; missing pillars lower confidence and are reweighted, never scored 0.
- **Why:** Fairness to new or under-resourced cadets.
- **Alternatives considered:** Treat missing data as a 0 score.
- **Rejected because:** It unfairly penalizes cadets who lacked the opportunity to generate data.
- **Consequence:** Both the Overall score and its confidence are surfaced to officers.

## ADL-006 — AI Adjutant uses whitelisted read-only tools; the LLM never touches the database
- **Decision:** Gemini function-calling can invoke only an allowlisted set of read-only, college-scoped tools; `college_id` comes from the JWT; consequential actions require human approval.
- **Why:** Prevent prompt-injection, hallucinated data, and cross-tenant leakage.
- **Alternatives considered:** Give the LLM direct DB/SQL access.
- **Rejected because:** It would expose write paths and untrusted-input risk.
- **Consequence:** The agent can only call safe read functions; it proposes actions, the officer disposes.

## ADL-007 — New `adjutant.gemini.service.js`, separate from `bot.service.js`
- **Decision:** The Adjutant uses a new Gemini service; the existing chatbot service is not modified.
- **Why:** The cadet chatbot is a frozen, working module.
- **Alternatives considered:** Extend `bot.service.js` to add function-calling.
- **Rejected because:** It couples new logic to a frozen module and risks a regression.
- **Consequence:** The chatbot is untouched; Gemini/tool logic is isolated and swappable.

## ADL-008 — Delay new UI dependencies until the Intelligence pipeline is validated
- **Decision:** The MVP will use existing UI components together with lightweight SVG/CSS visualisations. External charting libraries will not be introduced until the Intelligence pipeline has been validated end-to-end.
- **Why:** The primary objective is proving the architecture rather than polishing visualisation.
- **Alternatives considered:** Introduce Recharts during the first implementation milestones.
- **Rejected because:** Additional dependencies increase complexity without reducing implementation risk at this stage.
- **Consequence:** Initial dashboards remain simple while the backend architecture stabilises. Visualization libraries may be introduced later without affecting the Intelligence Layer.


## ADL-009 — Decision Layer is deterministic and rule-based (no AI)
- **Decision:** Recommendations (RDC selection, promotion, at-risk, etc.) are produced by deterministic rules over scores.
- **Why:** Explainability, reproducibility, and defensibility.
- **Alternatives considered:** LLM-generated recommendations.
- **Rejected because:** Non-deterministic and hard to justify to an officer/examiner.
- **Consequence:** Every recommendation is reproducible and auditable; the AI is confined to the Adjutant interface.

## ADL-010 — Vertical-slice milestone order (attendance end-to-end first)
- **Decision:** Build one pillar (attendance) through the full stack — repository → scorer → snapshot → endpoint → UI — before adding the other pillars.
- **Why:** Validate the entire pipeline with minimal code and reach a demoable state early (M3).
- **Alternatives considered:** Build all seven scorers before any endpoint/UI (original SDD order).
- **Rejected because:** Integration flaws would surface late, after seven scorers instead of one.
- **Consequence:** Earlier demo and earlier risk detection; remaining pillars slot into a proven pipeline.



## ADL-011 — Legacy Compatibility Contract
- **Decision:** Existing modules, APIs, database schema, authentication flow, chatbot, payment system, and operational business logic are treated as frozen. Intelligence features extend the system without modifying existing behaviour.
- **Why:** NCC NEXUS is already a functional platform. The objective of COMMAND is to enhance the platform rather than refactor or replace working functionality.
- **Alternatives considered:** Integrate Intelligence by modifying existing modules.
- **Rejected because:** Modifying production logic significantly increases regression risk and complicates testing, rollback, and team collaboration.
- **Consequence:** Existing functionality must remain behaviourally identical throughout development. All Intelligence features are implemented as isolated modules with additive routes, migrations, and frontend pages. Any exception requires explicit architectural approval and must be documented in a future ADL entry.
## ADL-012 — Profile weighting re-aggregates stored pillars at read time
- **Decision:** Snapshots are always computed and stored under the `general` profile. A profile-specific view (`?profile=rdc|promotion|certificate`) resolves the active weights via `scoring_config` (college override → system default → built-in) and re-aggregates each cadet's STORED `pillars` JSONB at read time (`intelligence.service.applyProfileWeights`).
- **Why:** Pillars are profile-independent facts; only the weighting is a decision-profile concern. Re-weighting a stored JSONB blob is O(cohort) cheap and needs no extra I/O.
- **Alternatives considered:** Computing and persisting one snapshot per profile per cadet.
- **Rejected because:** It multiplies snapshot volume by the number of profiles, forces a recompute whenever weights are tuned, and breaks the "one stable history" property of the snapshot table.
- **Consequence:** Weight changes take effect immediately on profile-weighted views without rewriting history; `general` behaviour is byte-identical to before (zero regression). The camp-selection response now carries the exact `{profile, source, version, weights}` it ranked under.

## ADL-013 — Confirmed rosters are immutable point-in-time records
- **Decision:** `decision_runs` + `decision_selections` (M8.2b) persist a confirmed board with cadet identity DENORMALISED (`regimental_no`, `full_name`, `rank_name` copied, no FK to `cadet_profiles`) plus the exact `params`, `weights` and `summary` used.
- **Why:** A board decision is an audit record. Deleting or renaming a cadet later must never rewrite or cascade away what the board decided; storing the weights makes every run reproducible.
- **Alternatives considered:** FK to `cadet_profiles` with CASCADE (consistent with operational tables).
- **Rejected because:** CASCADE would silently delete roster rows when a cadet is removed — an unacceptable property for an audit trail.
- **Consequence:** Roster rows can outlive their cadets by design; the trade-off (a roster row can reference a regimental number that no longer resolves) is intended and documented in the migration header.

## ADL-014 — Adjutant tool registry: read-only tools, proposal-gated writes
- **Decision:** The AI Adjutant (M9) reaches data ONLY through `modules/adjutant/adjutant.tools.js`: five read-only tools over intelligence/decision services plus `propose_action`, which never executes — it creates an `adjutant_action_proposals` row that a human approves (`.../proposals/:id/approve`) before `executeApprovedAction` runs it against a second whitelist (`acknowledge_flag`, `scan_at_risk`, `recompute_college`). `college_id` is injected from the JWT context server-side; model-supplied arguments can never change tenancy, and a cross-college cadet lookup returns the same "no snapshot" answer as a missing cadet (no existence oracle).
- **Why:** ADL-006 required whitelisted, college-scoped, read-only tools with human-in-the-loop execution; this is its concrete implementation.
- **Alternatives considered:** Letting the model call decision endpoints directly with its own parameters, or executing "safe" actions without approval.
- **Rejected because:** Both put an LLM inside the authorization boundary; prompt injection could then trigger writes or cross-tenant reads.
- **Consequence:** The whitelist is enforced twice (at proposal and at execution), every executed/failed proposal stores its outcome for audit, and each assistant message records exactly which tools it consulted (`tool_calls` trace shown in the UI).
