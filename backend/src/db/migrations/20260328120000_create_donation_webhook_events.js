exports.up = async function up(knex) {
  await knex.schema.createTable("donation_webhook_events", (t) => {
    t.bigIncrements("id").primary();
    t.string("provider", 32).notNullable();
    t.string("event_id", 255).notNullable();
    t.string("event_type", 128).notNullable();
    t.string("payment_order_id", 255).nullable();
    t.string("payment_id", 255).nullable();
    t.string("status", 32).notNullable().defaultTo("RECEIVED");
    t.jsonb("payload").notNullable();
    t.timestamp("processed_at").nullable();
    t.timestamp("created_at").notNullable().defaultTo(knex.fn.now());

    t.unique(["provider", "event_id"], {
      indexName: "uq_donation_webhook_events_provider_event_id",
    });
    t.index(["payment_order_id"], "idx_donation_webhook_events_order_id");
    t.index(["status"], "idx_donation_webhook_events_status");
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("donation_webhook_events");
};
