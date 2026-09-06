module.exports = {
  name: '2026090601100_affiliate_click_sources',
  async up(pool) {
    await pool.query(`
      ALTER TABLE affiliate_clicks ADD COLUMN IF NOT EXISTS source TEXT;
      CREATE INDEX IF NOT EXISTS affiliate_clicks_source_idx ON affiliate_clicks (source, clicked_at);
    `);
  }
};
