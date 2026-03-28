exports.up = async function up(knex) {
  await knex.schema.createTable("donation_issue_reports", (t) => {
    t.bigIncrements("report_id").primary();

    t.bigInteger("donation_id")
      .notNullable()
      .references("donation_id")
      .inTable("donations")
      .onDelete("CASCADE");

    t.integer("reported_by_user_id")
      .notNullable()
      .references("user_id")
      .inTable("users")
      .onDelete("CASCADE");

    t.text("issue_text").notNullable();
    t.string("status", 32).notNullable().defaultTo("OPEN");

    t.timestamp("created_at")
      .notNullable()
      .defaultTo(knex.fn.now());

    t.timestamp("updated_at")
      .notNullable()
      .defaultTo(knex.fn.now());

    t.index(["donation_id"], "idx_donation_issue_reports_donation");
    t.index(["reported_by_user_id"], "idx_donation_issue_reports_reporter");
    t.index(["status"], "idx_donation_issue_reports_status");
  });

  await knex.raw(`
    CREATE OR REPLACE FUNCTION set_updated_at_donation_issue_reports()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.raw(`
    CREATE TRIGGER trg_donation_issue_reports_updated_at
    BEFORE UPDATE ON donation_issue_reports
    FOR EACH ROW EXECUTE FUNCTION set_updated_at_donation_issue_reports();
  `);
};

exports.down = async function down(knex) {
  await knex.raw("DROP TRIGGER IF EXISTS trg_donation_issue_reports_updated_at ON donation_issue_reports");
  await knex.raw("DROP FUNCTION IF EXISTS set_updated_at_donation_issue_reports");
  await knex.schema.dropTableIfExists("donation_issue_reports");
};
