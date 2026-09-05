module.exports = {
  async up(client) {
    const table = 'opsbot_affiliate_applications';
    const tableCheck = await client.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1 LIMIT 1`,
      [table]
    );
    if (tableCheck.rowCount === 0) return;

    await client.query(`
      ALTER TABLE opsbot_affiliate_applications
      ADD COLUMN IF NOT EXISTS execution_method VARCHAR(64) NOT NULL DEFAULT 'manual'
    `);
  },

  async down(client) {
    const tableCheck = await client.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1 LIMIT 1`,
      ['opsbot_affiliate_applications']
    );
    if (tableCheck.rowCount === 0) return;

    await client.query(`
      ALTER TABLE opsbot_affiliate_applications
      DROP COLUMN IF EXISTS execution_method
    `);
  }
};
