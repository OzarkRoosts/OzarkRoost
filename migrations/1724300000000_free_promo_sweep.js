/**
 * Free promotion sweep
 *
 * Tracks legitimate no-cost promotion/listing opportunities. The bot may
 * discover, score and prepare submissions automatically, but does not
 * bypass CAPTCHAs, create fake accounts, or mass-post unsolicited content.
 * Auto-publishing is only appropriate when an official API/account is wired.
 */

exports.up = async function(pool) {
  await pool.query(`
    ALTER TABLE marketing_directory_submissions
      ADD COLUMN IF NOT EXISTS category VARCHAR(100),
      ADD COLUMN IF NOT EXISTS submission_method VARCHAR(50) DEFAULT 'manual',
      ADD COLUMN IF NOT EXISTS eligibility VARCHAR(20) DEFAULT 'unknown',
      ADD COLUMN IF NOT EXISTS notes TEXT,
      ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 50
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS marketing_directory_unique_url
      ON marketing_directory_submissions(directory_url)
      WHERE directory_url IS NOT NULL
  `);
};

exports.down = async function(pool) {
  await pool.query('DROP INDEX IF EXISTS marketing_directory_unique_url');
};
