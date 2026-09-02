const pool = require('../db/index');
const { sendOutboundEmail } = require('./email-sender');

const SITE = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || 'https://ozartkroost.onrender.com';
const FROM = process.env.MAILTRAP_FROM_EMAIL || process.env.EMAIL_FROM || process.env.EMAIL_USER || process.env.SMTP_USER;

const prospects = [
  ['Buffalo River Vacations','info@buffalorivervacations.com','870-365-2938','https://www.buffalorivervacations.com/','6685 S Arkansas Highway 7, Jasper, AR','Jasper','Six locally owned cabins; Canyon View, Mountain Crest, Red Rock Vista and other Buffalo River stays.','https://booking.buffalorivervacations.com/contact-us'],
  ['Lost Valley Canoe & Lodging','lostvalleycanoe@gmail.com','870-861-5522','https://www.lostvalleycanoe.com/','AR 43 Hwy, Ponca, AR 72670','Ponca','Canoe outfitter plus lodging, hiking trails and the historic general store—ideal for an adventure-focused OzarkRoost profile.','https://www.lostvalleycanoe.com/'],
  ['Steel Creek Cabins','steelcreekcabin@gmail.com','870-861-5890','https://steelcreekcabins.com/','HC 70 Box 353, Jasper, AR 72641','Jasper/Ponca','Two log cabins between Jasper and Ponca, about a mile from the Buffalo National River, positioned for hiking, floating and family getaways.','https://newtoncountychamber.com/directory/steel-creek-cabins/'],
  ['My Blue Heaven Cabin & Guesthouse','info@myblueheavencabin.com','870-446-5783','https://www.myblueheavencabin.com/','','Parthenon','Little Buffalo River lodging marketed as an Ozark hideaway—strong fit for a romantic/quiet-retreat listing.','https://buffaloriver.org/river-lodging/places-to-stay/'],
  ['Rimrock Cove Ranch','rimrockcove@gmail.com','870-553-2556','','','Buffalo River region','Ranch lodging listed by the Buffalo River regional lodging directory; position around secluded Ozark stays and outdoor access.','https://buffaloriver.org/river-lodging/places-to-stay/'],
  ['Arkansas House','arhouse@ritternet.com','888-274-6873','','','Jasper','Little Buffalo Riverhouse/Hotel & Suites; strong fit for Jasper lodging discovery traffic.','https://buffaloriver.org/river-lodging/places-to-stay/'],
  ['Cave Mountain Guesthouse','theclarks@eritter.net','870-446-2769','','','Buffalo River region','Guesthouse listed in the regional Buffalo River lodging directory; pitch discovery traffic and direct booking exposure.','https://buffaloriver.org/river-lodging/places-to-stay/'],
  ['Cliff House Inn & Cabins','cliffhouseinnar@gmail.com','870-446-2292','https://cliffhouseinnar.com/','','South of Jasper / Hwy 7','Scenic dining and lodging overlooking the Arkansas Grand Canyon, with cabins and motel rooms—perfect for a Scenic 7 itinerary listing.','https://www.newtoncountychamber.com/site/assets/files/1/newton_county_visitors_guide-2024_web.pdf'],
  ['Foggy Hollow Cabin','foggyhollow@cabinsintheozarks.com','870-446-2810','','','Buffalo River region','Ozark cabin lodging with a regional audience; pitch inclusion in cabin and weekend-getaway guides.','https://buffaloriver.org/river-lodging/places-to-stay/'],
  ['Ozark Bluff Dwellers','ozarkbluffdwellers@gmail.com','870-446-5055','https://ozarkbluffdwellers.com/','','Jasper','Handcrafted cedar cabins with fireplaces, jacuzzi tubs and Buffalo River views—excellent premium-listing candidate.','https://newtoncountychamber.com/site/assets/files/1743/newton_county_visitors_guide_2022_new.pdf']
];

function emailFor(p) {
  const [name,email,phone,website,address,location,hook,source] = p;
  return { name,email,phone,website,address,location,hook,source };
}

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

async function sendOne(p, followup=false) {
  if (!FROM || !p.email || p.opted_out) return false;
  const subject = followup ? `Quick follow-up — ${p.business_name} + OzarkRoost` : `A simple way to put ${p.business_name} in front of more Ozarks travelers`;
  const body = followup
    ? `Hi there,\n\nJust following up on my note about featuring ${p.business_name} on OzarkRoost. ${p.personalization} We are building a focused Ozarks travel audience and can feature your property in relevant lodging and trip-planning pages. If you'd like details, reply here and I'll send the listing options.\n\nThanks,\nOzarkRoost\n${SITE}\n\nIf you'd rather not receive future messages from us, reply “unsubscribe”.`
    : `Hi there,\n\nI’m reaching out because ${p.business_name} looks like a strong fit for OzarkRoost. ${p.personalization} OzarkRoost is building a focused travel destination for people planning Buffalo River and Ozarks trips, and we offer featured placement for local lodging and experiences. I’d love to put together a simple listing for ${p.business_name} and show you the options.\n\nInterested? Just reply to this email and I’ll send the details.\n\nThanks,\nOzarkRoost\n${SITE}\n\nIf you'd rather not receive future messages from us, reply “unsubscribe”.`;
  try {
    const info = await sendOutboundEmail({
      from: `OzarkRoost <${FROM}>`,
      to: p.email,
      subject,
      text: body,
      headers: { 'List-Unsubscribe': `<mailto:${FROM}?subject=unsubscribe>` }
    });
    await pool.query(`UPDATE local_outreach_prospects SET status=$1,last_sent_at=NOW(),followup_due_at=NOW()+INTERVAL '5 days' WHERE id=$2`,[followup?'followup_sent':'contacted',p.id]);
    await pool.query(`INSERT INTO opsbot_email_log (recipient,subject,status,message_id) VALUES ($1,$2,'sent',$3)`,[p.email,subject,info?.messageId || info?.message_id || null]);
    console.log(`[LocalOutreach] sent ${followup?'follow-up':'intro'} to ${p.business_name}`);
    return true;
  } catch (e) {
    await pool.query(`UPDATE local_outreach_prospects SET status='send_failed' WHERE id=$1`,[p.id]);
    await pool.query(`INSERT INTO opsbot_email_log (recipient,subject,status,error_message) VALUES ($1,$2,'failed',$3)`,[p.email,subject,e.message]);
    console.error(`[LocalOutreach] ${p.business_name}: ${e.message}`);
    return false;
  }
}

async function cycle() {
  await seed();
  if (!FROM) { console.log('[LocalOutreach] No sender configured; queue seeded, sending disabled.'); return; }
  const { rows: fresh } = await pool.query(`SELECT * FROM local_outreach_prospects WHERE status='ready' AND opted_out=false AND email IS NOT NULL ORDER BY id LIMIT 10`);
  for (const p of fresh) await sendOne(p, false);
  const { rows: followups } = await pool.query(`SELECT * FROM local_outreach_prospects WHERE status='contacted' AND followup_due_at <= NOW() AND opted_out=false AND email IS NOT NULL LIMIT 10`);
  for (const p of followups) await sendOne(p, true);
}

function start() {
  if (process.env.LOCAL_OUTREACH_ENABLED === 'false') return console.log('[LocalOutreach] disabled by environment');
  cycle().catch(e => console.error('[LocalOutreach] cycle failed:', e.message));
  setInterval(() => cycle().catch(e => console.error('[LocalOutreach] cycle failed:', e.message)), 6 * 60 * 60 * 1000);
}

module.exports = { start, cycle, sendOne };
