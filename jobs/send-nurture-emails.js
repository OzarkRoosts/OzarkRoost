const transporter = require('../lib/email-transport');
const { fetchPendingEmails, markSent, markFailed } = require('../db/nurture-email-queue');
const emailContent = require('../lib/nurture-emails');

const FROM = process.env.EMAIL_FROM || 'OzarkRoost <noreply@ozarkroost.polsia.app>';

async function run() {
  if (!transporter) {
    console.log('[nurture-emails] SMTP not configured, skipping.');
    process.exit(0);
  }

  const rows = await fetchPendingEmails();
  console.log(`[nurture-emails] ${rows.length} email(s) to send.`);

  for (const row of rows) {
    const content = emailContent[row.sequence_step];
    if (!content) {
      await markFailed(row.id, `No content defined for step ${row.sequence_step}`);
      continue;
    }
    try {
      await transporter.sendMail({
        from: FROM,
        to: row.lead_email,
        subject: content.subject,
        html: content.html,
      });
      await markSent(row.id);
      console.log(`[nurture-emails] sent step ${row.sequence_step} to ${row.lead_email}`);
    } catch (err) {
      await markFailed(row.id, err.message);
      console.error(`[nurture-emails] failed step ${row.sequence_step} to ${row.lead_email}:`, err.message);
    }
  }

  process.exit(0);
}

run().catch((err) => {
  console.error('[nurture-emails] fatal error:', err);
  process.exit(1);
});
