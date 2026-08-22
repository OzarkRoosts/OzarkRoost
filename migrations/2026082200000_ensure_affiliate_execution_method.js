module.exports = {
  async up(knex) {
    const table = 'opsbot_affiliate_applications';
    const exists = await knex.schema.hasTable(table);
    if (!exists) return;
    const hasColumn = await knex.schema.hasColumn(table, 'execution_method');
    if (!hasColumn) {
      await knex.schema.alterTable(table, (t) => {
        t.string('execution_method', 64).notNullable().defaultTo('manual');
      });
    }
  },
  async down(knex) {
    const table = 'opsbot_affiliate_applications';
    if (!(await knex.schema.hasTable(table))) return;
    if (await knex.schema.hasColumn(table, 'execution_method')) {
      await knex.schema.alterTable(table, (t) => t.dropColumn('execution_method'));
    }
  }
};
