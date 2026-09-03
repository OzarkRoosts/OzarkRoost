module.exports = {
  name: 'sales_funnel_attribution',
  up: async (client) => {
    await client.query(`
      ALTER TABLE listing_submissions
        ADD COLUMN IF NOT EXISTS listing_tier VARCHAR(32) NOT NULL DEFAULT 'starter',
        ADD COLUMN IF NOT EXISTS acquisition_source VARCHAR(80),
        ADD COLUMN IF NOT EXISTS acquisition_campaign VARCHAR(120),
        ADD COLUMN IF NOT EXISTS acquisition_content VARCHAR(120);
      CREATE INDEX IF NOT EXISTS listing_submissions_tier_idx ON listing_submissions (listing_tier);
      CREATE INDEX IF NOT EXISTS listing_submissions_source_idx ON listing_submissions (acquisition_source);
    `);
  }
};
