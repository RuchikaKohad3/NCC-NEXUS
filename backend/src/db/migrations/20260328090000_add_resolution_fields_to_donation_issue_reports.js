exports.up = async function up(knex) {
  const hasResolvedBy = await knex.schema.hasColumn("donation_issue_reports", "resolved_by_user_id");
  if (!hasResolvedBy) {
    await knex.schema.alterTable("donation_issue_reports", (t) => {
      t.integer("resolved_by_user_id")
        .references("user_id")
        .inTable("users")
        .onDelete("SET NULL");
    });
  }

  const hasResolutionText = await knex.schema.hasColumn("donation_issue_reports", "resolution_text");
  if (!hasResolutionText) {
    await knex.schema.alterTable("donation_issue_reports", (t) => {
      t.text("resolution_text");
    });
  }

  const hasResolvedAt = await knex.schema.hasColumn("donation_issue_reports", "resolved_at");
  if (!hasResolvedAt) {
    await knex.schema.alterTable("donation_issue_reports", (t) => {
      t.timestamp("resolved_at");
    });
  }
};

exports.down = async function down(knex) {
  const hasResolvedAt = await knex.schema.hasColumn("donation_issue_reports", "resolved_at");
  const hasResolutionText = await knex.schema.hasColumn("donation_issue_reports", "resolution_text");
  const hasResolvedBy = await knex.schema.hasColumn("donation_issue_reports", "resolved_by_user_id");

  await knex.schema.alterTable("donation_issue_reports", (t) => {
    if (hasResolvedAt) t.dropColumn("resolved_at");
    if (hasResolutionText) t.dropColumn("resolution_text");
    if (hasResolvedBy) t.dropColumn("resolved_by_user_id");
  });
};
