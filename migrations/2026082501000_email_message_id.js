module.exports = {
  name: 'email_message_id_dedupe',
  up: async (client) => {
    await client.query(`
      ALTER TABLE opsbot_inbound_emails
        ADD COLUMN IF NOT EXISTS message_id TEXT;
      CREATE UNIQUE INDEX IF NOT EXISTS opsbot_inbound_emails_message_id_idx
        ON opsbot_inbound_emails (message_id)
        WHERE message_id IS NOT NULL AND message_id <> '';
    `);
  }
};
