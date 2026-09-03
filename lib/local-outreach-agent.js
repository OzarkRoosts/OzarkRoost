const pool = require('../db/index');
const { sendOutboundEmail } = require('./email-sender');

const SITE = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || 'https://ozartkroost.onrender.com';
const FROM = process.env.MAILTRAP_FROM_EMAIL || process.env.EMAIL_FROM || process.env.EMAIL_USER || process.env.SMTP_USER;
const OFFER_URL = `${SITE}/list-your-cabin`;

// Public business contacts gathered from legitimate tourism/business sources.
// Keep this list factual, personalized, opt-out aware, and limited to business outreach.
const prospects = [
  ['Buffalo River Vacations','info@buffalorivervacations.com','870-365-2938','https://www.buffalorivervacations.com/','6685 S Arkansas Highway 7, Jasper, AR','Jasper','LODGING — Six locally owned cabins near the Buffalo River.','https://booking.buffalorivervacations.com/contact-us'],
  ['Lost Valley Canoe & Lodging','lostvalleycanoe@gmail.com','870-861-5522','https://www.lostvalleycanoe.com/','AR 43 Hwy, Ponca, AR 72670','Ponca','ADVENTURE + LODGING — Canoe outfitter, lodging, hiking access and general store.','https://www.lostvalleycanoe.com/'],
  ['Steel Creek Cabins','steelcreekcabin@gmail.com','870-861-5890','https://steelcreekcabins.com/','HC 70 Box 353, Jasper, AR 72641','Jasper/Ponca','LODGING — Log cabins near the Buffalo National River for hiking, floating and family getaways.','https://newtoncountychamber.com/directory/steel-creek-cabins/'],
  ['My Blue Heaven Cabin & Guesthouse','info@myblueheavencabin.com','870-446-5783','https://www.myblueheavencabin.com/','','Parthenon','LODGING — Little Buffalo River lodging positioned as an Ozark hideaway.','https://buffaloriver.org/river-lodging/places-to-stay/'],
  ['Rimrock Cove Ranch','rimrockcove@gmail.com','870-553-2556','','','Buffalo River region','LODGING — Ranch lodging listed in the Buffalo River regional lodging directory.','https://buffaloriver.org/river-lodging/places-to-stay/'],
  ['Arkansas House','arhouseinn@gmail.com','870-446-5900','https://thearkhouse.com/','215 East Court Street, Jasper, AR','Jasper','LODGING + LOCAL EXPERIENCE — Little Buffalo River lodging with strong visitor-trip connections.','https://thearkhouse.com/contact/'],
  ['Cave Mountain Guesthouse','theclarks@eritter.net','870-446-2769','','','Buffalo River region','LODGING — Regional guesthouse with a strong direct-booking discovery angle.','https://buffaloriver.org/river-lodging/places-to-stay/'],
  ['Cliff House Inn & Cabins','cliffhouseinnar@gmail.com','870-446-2292','https://cliffhouseinnar.com/','','Jasper','LODGING + DINING — Scenic Highway 7 inn, cabins and restaurant overlooking the Arkansas Grand Canyon.','https://ozarkmountainregion.com/explore/cliff-house-inn/'],
  ['Foggy Hollow Cabin','foggyhollow@cabinsintheozarks.com','870-446-2810','','','Buffalo River region','LODGING — Ozark cabin lodging with a natural fit for cabin and weekend-getaway guides.','https://buffaloriver.org/river-lodging/places-to-stay/'],
  ['Ozark Bluff Dwellers','ozarkbluffdwellers@gmail.com','870-446-5055','https://ozarkbluffdwellers.com/','','Jasper','LODGING — Cedar cabins with fireplaces, hot tubs and Buffalo River views.','https://newtoncountychamber.com/site/assets/files/1743/newton_county_visitors_guide_2022_new.pdf'],
  ['Buffalo River Outfitters','info@buffaloriveroutfitters.com','870-439-2200','https://www.buffaloriveroutfitters.com/','9664 N Hwy 65, St. Joe, AR 72675','St. Joe','ADVENTURE + LODGING — Canoe, raft and kayak rentals plus lodging for Buffalo River trips.','https://www.buffaloriveroutfitters.com/contact/'],
  ['Buffalo Outdoor Center','boc@buffaloriver.com','870-861-5514','https://www.buffaloutdoorcenter.com/','4699 AR-43, Ponca, AR 72670','Ponca','ADVENTURE + LODGING — Buffalo River cabins, canoeing, hiking, hot-air ballooning and zipline adventures.','https://www.ozarkmountainregion.com/explore/buffalo-outdoor-center/'],
  ['Mountain Harbor Resort and Spa','info@mountainharborresort.com','870-867-2191','https://mountainharborresort.com/','994 Mountain Harbor Rd, Mt Ida, AR 71957','Mount Ida','RESORT + DINING + ADVENTURE — Lakeside lodging, marina, restaurant, fishing, boating, hiking and spa experiences.','https://mountainharborresort.com/'],
  ["Gaston’s White River Resort",'gastons@gastons.com','870-431-5202','https://www.gastons.com/','1777 River Road, Lakeview, AR 72642','Lakeview','FISHING + LODGING + DINING — White River trout fishing, guided trips, cabins, boat rentals and restaurant.','https://www.arkansas.com/experiences/discover/attraction-listings/gastons-white-river-resort'],
  ['Camp Buffalo RV, Camping and Cabins','info@campbuffaloriver.com','870-439-2111','','36 North Frost St, Gilbert, AR 72636','Gilbert','CAMPING + RV + LODGING — Campground, RV and cabin inventory near the Buffalo River.','https://searcycountyarkansas.org/membership-directory/lodging-rv-campgrounds/'],
  ['Buffalo River Lodge','info@buffaloriver.us','877-215-7788','','215 Stick Horse Drive, St. Joe, AR 72675','St. Joe','LODGING — Buffalo River stay with strong trip-planning and outdoor-traveler fit.','https://searcycountyarkansas.org/membership-directory/lodging-rv-campgrounds/'],
  ['Dogwood Hills Guest Farm','thefarmex@gmail.com','870-448-4870','','460 Cozahome Road, Harriet, AR 72639','Harriet','LODGING + FARM EXPERIENCE — Guest farm lodging for travelers seeking a quieter Ozark stay.','https://searcycountyarkansas.org/membership-directory/lodging-rv-campgrounds/'],
  ['Ozark Life','ozarklifeadventures@gmail.com','870-205-7250','','Hwy 65 N, Pindall, AR 72669','Pindall','ADVENTURE — Local Ozark adventure business positioned for Buffalo River travelers.','https://searcycountyarkansas.org/membership-directory/outfitters-canoe-rental/'],
  ['Silver Hill Float Service','info@silverhillcanoe.com','870-439-2372','','9826 US-65, St. Joe, AR 72675','St. Joe','ADVENTURE — Buffalo River float service and outfitter with direct trip-planning relevance.','https://searcycountyarkansas.org/membership-directory/outfitters-canoe-rental/'],
  ['Cove Creek Supply & Cabins','info@cove-creek.com','479-963-2702','https://www.cove-creek.com/cabins','11071 State Highway 309, Paris, AR','Mount Magazine','LODGING + OUTDOOR — Mount Magazine cabins with direct trail access.','https://www.cove-creek.com/cabins'],
  ['J3 At The Gap','hello@j3atthegap.com','870-849-7504','https://j3atthegap.com/','','Jasper','LODGING + EVENT VENUE — Rugged resort in Jasper with limited booking availability.','https://j3atthegap.com/contact/'],
  ['Eureka Springs Brewery','eurekaspringsbrews@gmail.com','479-239-2162','https://eurekaspringsbrewery.com/','96 Ridgeview Road, Eureka Springs, AR','Eureka Springs','FOOD + DRINK + EXPERIENCE — Small-batch brewery with outdoor space and a 9-hole disc golf course.','https://eurekaspringsbrewery.com/'],
  ['Bushel & a Peck Café','bushelandapeck77@gmail.com','870-269-3365','https://www.bushelandapeckcafe.com/','20903 Hwy 5, Mountain View, AR 72560','Mountain View','RESTAURANT — Local breakfast, lunch and dinner destination for Mountain View visitors.','https://www.bushelandapeckcafe.com/'],
  ['Jasper Pizza Company','jasperpizzaco@gmail.com','870-446-2505','https://jasperpizzaco.squarespace.com/','207 N Stone Street, Jasper, AR 72641','Jasper','RESTAURANT — Locally owned pizza shop serving travelers after Buffalo River adventures.','https://jasperpizzaco.squarespace.com/']
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
  return `Hi there,\n\nI’m reaching out because ${p.business_name} looks like a strong fit for OzarkRoost. ${p.personalization} We’re building a focused Ozarks travel directory covering lodging, restaurants, adventures, fishing, camping, rentals, attractions and local services.\n\nWe’re opening paid business listings now: $49/month for the Starter placement, $99 Featured and $149 Dominant. No commission on your bookings.\n\nIf you want the $49 listing, you can start here: ${OFFER_URL}\n\nThanks,\nOzarkRoost\n${SITE}\n\nIf you'd rather not receive future messages from us, reply “unsubscribe”.`;
}

async function sendOne(p, followup=false) {
  if (!FROM || !p.email || p.opted_out) return false;
  const subject = followup ? `Quick follow-up — ${p.business_name} + OzarkRoost` : `$49 OzarkRoost listing for ${p.business_name}`;
  const body = buildBody(p, followup);
  try {
    const info = await sendOutboundEmail({ from: `OzarkRoost <${FROM}>`, to: p.email, subject, text: body, headers: { 'List-Unsubscribe': `<mailto:${FROM}?subject=unsubscribe>` } });
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

module.exports = { start, cycle, sendOne, buildBody, prospects };
