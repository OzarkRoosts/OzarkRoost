const pool = require('../db/index');
const { sendOutboundEmail } = require('./email-sender');

const SITE = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || 'https://ozartkroost.onrender.com';
const FROM = process.env.MAILTRAP_FROM_EMAIL || process.env.EMAIL_FROM || process.env.EMAIL_USER || process.env.SMTP_USER;
const OFFER_URL = `${SITE}/list-your-cabin`;

// Seed only businesses with a public contact address already identified by the project.
// New prospects can be added here from legitimate public tourism/business sources.
const prospects = [
  ['Buffalo River Vacations','info@buffalorivervacations.com','870-365-2938','https://www.buffalorivervacations.com/','6685 S Arkansas Highway 7, Jasper, AR','Jasper','LODGING — Six locally owned cabins including Canyon View, Mountain Crest and Red Rock Vista near the Buffalo River.','https://booking.buffalorivervacations.com/contact-us'],
  ['Lost Valley Canoe & Lodging','lostvalleycanoe@gmail.com','870-861-5522','https://www.lostvalleycanoe.com/','AR 43 Hwy, Ponca, AR 72670','Ponca','ADVENTURE + LODGING — Canoe outfitter, lodging, hiking access and general store; a natural fit for Buffalo River trip planners.','https://www.lostvalleycanoe.com/'],
  ['Steel Creek Cabins','steelcreekcabin@gmail.com','870-861-5890','https://steelcreekcabins.com/','HC 70 Box 353, Jasper, AR 72641','Jasper/Ponca','LODGING — Two log cabins near the Buffalo National River positioned for hiking, floating and family getaways.','https://newtoncountychamber.com/directory/steel-creek-cabins/'],
  ['My Blue Heaven Cabin & Guesthouse','info@myblueheavencabin.com','870-446-5783','https://www.myblueheavencabin.com/','','Parthenon','LODGING — Little Buffalo River lodging marketed as an Ozark hideaway and quiet retreat.','https://buffaloriver.org/river-lodging/places-to-stay/'],
  ['Rimrock Cove Ranch','rimrockcove@gmail.com','870-553-2556','','','Buffalo River region','LODGING — Ranch lodging listed by the Buffalo River regional lodging directory; strong secluded-stay angle.','https://buffaloriver.org/river-lodging/places-to-stay/'],
  ['Arkansas House','arhouse@ritternet.com','888-274-6873','','','Jasper','LODGING — Little Buffalo Riverhouse/Hotel & Suites; strong fit for Jasper lodging discovery traffic.','https://buffaloriver.org/river-lodging/places-to-stay/'],
  ['Cave Mountain Guesthouse','theclarks@eritter.net','870-446-2769','','','Buffalo River region','LODGING — Regional guesthouse with a strong discovery-and-direct-booking angle for Buffalo River travelers.','https://buffaloriver.org/river-lodging/places-to-stay/'],
  ['Cliff House Inn & Cabins','cliffhouseinnar@gmail.com','870-446-2292','https://cliffhouseinnar.com/','','South of Jasper / Hwy 7','LODGING + DINING — Scenic lodging and dining overlooking the Arkansas Grand Canyon; excellent Scenic 7 itinerary fit.','https://www.newtoncountychamber.com/site/assets/files/1/newton_county_visitors_guide-2024_web.pdf'],
  ['Foggy Hollow Cabin','foggyhollow@cabinsintheozarks.com','870-446-2810','','','Buffalo River region','LODGING — Ozark cabin lodging with a natural fit for cabin, weekend-getaway and Buffalo River guide traffic.','https://buffaloriver.org/river-lodging/places-to-stay/'],
  ['Ozark Bluff Dwellers','ozarkbluffdwellers@gmail.com','870-446-5055','https://ozarkbluffdwellers.com/','','Jasper','LODGING — Cedar cabins with fireplaces, jacuzzi tubs and Buffalo River views; premium-listing candidate.','https://newtoncountychamber.com/site/assets/files/1743/newton_county_visitors_guide_2022_new.pdf']
];

function emailFor(p) { const [name,email,phone,website,address,location,hook,source] = p; return { name,email,phone,website,address,location,hook,source }; }

async function seed() {
  for (const raw of prospects) {
    const p = emailFor(raw);
    await pool.query(`INSERT INTO local_outreach_prospects
      (business_name,email,phone,website,address,location,personalization,source_url)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (business_name) DO UPDATE SET
      email=COALESCE(EXCLUDED.email,local_outreach_prospects.email), phone=COALESCE(EXCLUDED.phone,local_outreach_prospects.phone), website=COALESCE(EXCLUDED.website,local_outreach_prospects.website), address=COALESCE(EXCLUDED.address,local_outreach_prospects.address), personalization=EXCLUDED.personalization, source_url=EXCLUDED.source_url`,
      [p.name,p.email,p.phone,p.website||null,p.address||null,p.location,p.hook,p.source]);
  }
}

function buildBody(p, followup) {
  if (followup) return `Hi there,\n\nFollowing up about featuring ${p.business_name} on OzarkRoost. ${p.personalization} We are opening paid placements for local Ozarks businesses, and the Starter listing is $49/month.\n\nIf you'd like to claim a spot, start here: ${OFFER_URL}\n\nThanks,\nOzarkRoost\n${SITE}\n\nIf you'd rather not receive future messages from us, reply “unsubscribe”.`;
  return `Hi there,\n\nI’m reaching out because ${p.business_name} looks like a strong fit for OzarkRoost. ${p.personalization} We’re building a focused Ozarks travel directory covering lodging, restaurants, adventures, fishing, camping, rentals, attractions and local services.\n\nWe’re opening paid business listings now: **$49/month** for the Starter placement, with $99 Featured and $149 Dominant options. No commission on your bookings.\n\nIf you want the $49 listing, you can start here: ${OFFER_URL}\n\nThanks,\nOzarkRoost\n${SITE}\n\nIf you'd rather not receive future messages from us, reply “unsubscribe”.`;
}

async function sendOne(p, followup=false) {
  if (!FROM || !p.email || p.opted_out) return false;
  const subject = followup ? `Quick follow-up — ${p.business_name} + OzarkRoost` : `$49 OzarkRoost listing for ${p.business_name}`;
  const body = buildBody(p, followup);
  try {
    const info = await sendOutboundEmail({
      from: `OzarkRoost <${FROM}>`, to: p.email, subject, text: body,
      headers: { 'List-Unsubscribe': `<mailto:${FROM}?subject=unsubscribe>` }
    });
    await pool.query(`UPDATE local_outreach_prospects SET status=$1,last_sent_at=NOW(),followup_due_at=NOW()+INTERVAL '5 days' WHERE id=$2`, [followup ? 'followup_sent' : 'contacted', p.id]);
    await pool.query(`INSERT INTO opsbot_email_log (recipient,subject,status,message_id) VALUES ($1,$2,'sent',$3)`, [p.email,subject,info?.messageId || info?.message_id || null]);
    console.log(`[LocalOutreach] sent ${followup?'follow-up':'$49 offer'} to ${p.business_name}`);
    return true;
  } catch (e) {
    await pool.query(`UPDATE local_outreach_prospects SET status='send_failed' WHERE id=$1`, [p.id]);
    await pool.query(`INSERT INTO opsbot_email_log (recipient,subject,status,error_message) VALUES ($1,$2,'failed',$3)`, [p.email,subject,e.message]);
    console.error(`[LocalOutreach] ${p.business_name}: ${e.message}`);
    return false;
  }
}

async function cycle() {
  await seed();
  if (!FROM) { console.log('[LocalOutreach] No sender configured; queue seeded, sending disabled.'); return; }
  // Keep the outbound cadence assertive but bounded: 12 new offers + 12 follow-ups per cycle.
  const { rows: fresh } = await pool.query(`SELECT * FROM local_outreach_prospects WHERE status='ready' AND opted_out=false AND email IS NOT NULL ORDER BY id LIMIT 12`);
  for (const p of fresh) await sendOne(p, false);
  const { rows: followups } = await pool.query(`SELECT * FROM local_outreach_prospects WHERE status='contacted' AND followup_due_at <= NOW() AND opted_out=false AND email IS NOT NULL LIMIT 12`);
  for (const p of followups) await sendOne(p, true);
}

function start() {
  if (process.env.LOCAL_OUTREACH_ENABLED === 'false') return console.log('[LocalOutreach] disabled by environment');
  cycle().catch(e => console.error('[LocalOutreach] cycle failed:', e.message));
  setInterval(() => cycle().catch(e => console.error('[LocalOutreach] cycle failed:', e.message)), 6 * 60 * 60 * 1000);
}

module.exports = { start, cycle, sendOne, buildBody };
