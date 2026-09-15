/**
 * Responsibility: Additive migration for the AI Adjutant (M9) — conversations,
 *   messages (with tool-call traces), and human-gated action proposals.
 * Layer: Migration / DB (new tables only; no existing table is modified).
 * Depends on: existing tables `colleges` and `users` (FK targets only).
 * Must never be depended on by: any existing/legacy migration.
 *
 * Design (ADL-006/ADL-014): the Adjutant may only call whitelisted READ-ONLY
 * tools; anything consequential becomes an `adjutant_action_proposals` row that
 * a human approves or rejects. `tool_calls` on a message records exactly which
 * tools the model consulted — the transparency trail the officer sees in the UI.
 */

exports.up = async function up(knex) {
  await knex.schema.createTable("adjutant_conversations", (t) => {
    t.bigIncrements("conversation_id").primary();

    t.integer("college_id")
      .notNullable()
      .references("college_id")
      .inTable("colleges")
      .onDelete("CASCADE");

    t.integer("created_by_user_id")
      .references("user_id")
      .inTable("users")
      .onDelete("SET NULL");

    t.string("title", 255).notNullable().defaultTo("New conversation");

    t.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp("deleted_at", { useTz: true });

    t.index(["college_id", "updated_at"], "idx_adjutant_convos_college_updated");
    t.index(["created_by_user_id"], "idx_adjutant_convos_creator");
  });

  await knex.schema.createTable("adjutant_messages", (t) => {
    t.bigIncrements("message_id").primary();

    t.bigInteger("conversation_id")
      .notNullable()
      .references("conversation_id")
      .inTable("adjutant_conversations")
      .onDelete("CASCADE");

    t.string("role", 16).notNullable(); // 'user' | 'assistant'
    t.text("content").notNullable();
    t.jsonb("tool_calls"); // [{ name, args, summary }] — null when none

    t.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    t.index(["conversation_id", "message_id"], "idx_adjutant_messages_convo");
  });

  await knex.raw(`
    ALTER TABLE adjutant_messages
    ADD CONSTRAINT chk_adjutant_messages_role CHECK (role IN ('user', 'assistant'))
  `);

  await knex.schema.createTable("adjutant_action_proposals", (t) => {
    t.bigIncrements("proposal_id").primary();

    t.bigInteger("conversation_id")
      .notNullable()
      .references("conversation_id")
      .inTable("adjutant_conversations")
      .onDelete("CASCADE");

    t.bigInteger("message_id")
      .references("message_id")
      .inTable("adjutant_messages")
      .onDelete("SET NULL");

    t.integer("college_id")
      .notNullable()
      .references("college_id")
      .inTable("colleges")
      .onDelete("CASCADE");

    t.string("action_type", 48).notNullable(); // whitelist enforced in code
    t.jsonb("params").notNullable().defaultTo(knex.raw("'{}'::jsonb"));
    t.text("reason");

    // pending -> approved -> executed | failed, or pending -> rejected.
    t.string("status", 16).notNullable().defaultTo("pending");

    t.integer("decided_by")
      .references("user_id")
      .inTable("users")
      .onDelete("SET NULL");
    t.timestamp("decided_at", { useTz: true });
    t.jsonb("result"); // execution outcome (or error message) for the audit trail

    t.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    t.index(["college_id", "status", "created_at"], "idx_adjutant_proposals_college_status");
    t.index(["conversation_id"], "idx_adjutant_proposals_convo");
  });

  await knex.raw(`
    ALTER TABLE adjutant_action_proposals
    ADD CONSTRAINT chk_adjutant_proposals_status
    CHECK (status IN ('pending', 'approved', 'rejected', 'executed', 'failed'))
  `);
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("adjutant_action_proposals");
  await knex.schema.dropTableIfExists("adjutant_messages");
  await knex.schema.dropTableIfExists("adjutant_conversations");
};
