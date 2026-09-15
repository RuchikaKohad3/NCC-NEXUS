/**
 * Responsibility: Additive migration for `decision_runs` + `decision_selections` —
 *   the auditable record of a confirmed selection board (M8.2b).
 * Layer: Migration / DB (new tables only; no existing table is modified).
 * Depends on: existing tables `colleges` and `users` (FK targets only).
 * Must never be depended on by: any existing/legacy migration.
 *
 * Design (ADL-013): a confirmed roster is an immutable point-in-time record.
 * Cadet identity (regimental_no, full_name, rank_name) is DENORMALISED into
 * `decision_selections` with NO foreign key to cadet_profiles, so deleting or
 * renaming a cadet later can never rewrite or cascade away a board decision.
 * `weights` stores the exact weight profile the board ranked under, making every
 * run reproducible (same inputs → same roster).
 */

exports.up = async function up(knex) {
  await knex.schema.createTable("decision_runs", (t) => {
    t.bigIncrements("run_id").primary();

    t.integer("college_id")
      .notNullable()
      .references("college_id")
      .inTable("colleges")
      .onDelete("CASCADE");

    // What kind of board this was; camp_selection is the only type today.
    t.string("run_type", 32).notNullable().defaultTo("camp_selection");
    t.string("profile", 32).notNullable().defaultTo("rdc");

    // The exact inputs + outputs of the run, for reproducibility and reports.
    t.jsonb("params").notNullable(); // { slots, reserves, minReadiness }
    t.jsonb("weights").notNullable(); // { profile, source, version, weights }
    t.jsonb("summary").notNullable(); // board summary from the recipe

    t.string("status", 16).notNullable().defaultTo("confirmed");

    t.integer("confirmed_by")
      .references("user_id")
      .inTable("users")
      .onDelete("SET NULL");

    t.timestamp("confirmed_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    t.index(["college_id", "created_at"], "idx_decision_runs_college_created");
    t.index(["college_id", "run_type"], "idx_decision_runs_college_type");
  });

  await knex.schema.createTable("decision_selections", (t) => {
    t.bigIncrements("id").primary();

    t.bigInteger("run_id")
      .notNullable()
      .references("run_id")
      .inTable("decision_runs")
      .onDelete("CASCADE");

    // Denormalised identity — deliberately NOT a foreign key (see header).
    t.string("regimental_no", 64).notNullable();
    t.string("full_name", 255);
    t.string("rank_name", 128);

    t.string("tier", 16).notNullable(); // selected | standby | not_selected | unranked
    t.integer("rank_position"); // null for unranked
    t.decimal("overall_score", 6, 2);
    t.decimal("overall_confidence", 4, 3);

    t.jsonb("reasons").notNullable().defaultTo(knex.raw("'[]'::jsonb"));
    t.jsonb("caveats").notNullable().defaultTo(knex.raw("'[]'::jsonb"));
    t.jsonb("strengths").notNullable().defaultTo(knex.raw("'[]'::jsonb"));

    t.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    t.unique(["run_id", "regimental_no"], "uq_decision_selections_run_cadet");
    t.index(["run_id", "tier"], "idx_decision_selections_run_tier");
  });

  await knex.raw(`
    ALTER TABLE decision_selections
    ADD CONSTRAINT chk_decision_selections_tier
    CHECK (tier IN ('selected', 'standby', 'not_selected', 'unranked'))
  `);
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("decision_selections");
  await knex.schema.dropTableIfExists("decision_runs");
};
