module.exports = {
  name: 'queue_existing_affiliate_applications',
  up: async (client) => {
    await client.query(`
      UPDATE opsbot_affiliate_applications
      SET status = 'queued',
          last_error = NULL,
          updated_at = NOW()
      WHERE status = 'drafted';
    `);
  }
};
