const BASE_URL = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
const BRAND_COLOR = '#D4893F';

const btn = (href, text) =>
  `<a href="${href}" style="display:inline-block;background:${BRAND_COLOR};color:#fff;text-decoration:none;padding:12px 28px;border-radius:4px;font-weight:bold;font-size:16px;">${text}</a>`;

const footer = `
  <hr style="border:none;border-top:1px solid #e5e5e5;margin:32px 0;">
  <p style="font-size:12px;color:#999;margin:0;">
    OzarkRoost &middot; <a href="${BASE_URL}" style="color:#999;">${BASE_URL.replace('https://', '')}</a><br>
    You're receiving this because you requested the Ozarks Trip Planner guide.<br>
    <a href="${BASE_URL}/guides/trip-planner" style="color:#999;">Unsubscribe</a>
  </p>
`;

module.exports = {
  1: {
    subject: 'Your Ozarks Trip Planner is here',
    html: `
      <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#333;">
        <h1 style="color:${BRAND_COLOR};font-size:28px;margin-bottom:8px;">Your Ozarks Trip Planner is ready</h1>
        <p style="font-size:16px;line-height:1.6;">
          Thank you for requesting the OzarkRoost Trip Planner — your free guide to planning the perfect Arkansas Ozarks getaway.
        </p>
        <p style="font-size:16px;line-height:1.6;">
          Inside your planner you'll find:
        </p>
        <ul style="font-size:16px;line-height:2;">
          <li><strong>Top 5 must-see stops</strong> along the Buffalo River corridor</li>
          <li><strong>Seasonal cabin picks</strong> — the right cabin type for spring, summer, fall, and winter</li>
          <li><strong>Hidden gems</strong> most visitors miss on their first trip</li>
          <li><strong>Packing lists</strong> and local tips from people who know the Ozarks</li>
        </ul>
        <p style="font-size:16px;line-height:1.6;">
          View your full planner anytime at the link below — it's always up to date with current seasonal picks.
        </p>
        <p style="margin:28px 0;">
          ${btn(`${BASE_URL}/guides/trip-planner`, 'View Your Trip Planner')}
        </p>
        <p style="font-size:16px;line-height:1.6;">
          Ready to book? Browse curated cabin, camping, and RV rentals — filtered by season, location, and amenities.
        </p>
        <p style="margin:28px 0;">
          ${btn(`${BASE_URL}/listings`, 'Browse Ozarks Rentals')}
        </p>
        ${footer}
      </div>
    `,
  },

  2: {
    subject: '5 Ozarks stops most visitors miss',
    html: `
      <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#333;">
        <h1 style="color:${BRAND_COLOR};font-size:28px;margin-bottom:8px;">5 Ozarks stops most visitors miss</h1>
        <p style="font-size:16px;line-height:1.6;">
          Most first-time visitors stick to the obvious — and miss the best parts. Here are five stops worth adding to your itinerary.
        </p>

        <h2 style="color:${BRAND_COLOR};font-size:20px;margin-top:28px;">1. Bull Shoals Lake</h2>
        <p style="font-size:16px;line-height:1.6;">
          Massive and often overlooked in favor of the Buffalo River, Bull Shoals offers world-class trout fishing, secluded cove swimming, and lakefront cabins at prices that'll surprise you.
        </p>

        <h2 style="color:${BRAND_COLOR};font-size:20px;margin-top:28px;">2. Buffalo National River</h2>
        <p style="font-size:16px;line-height:1.6;">
          America's first national river — 135 miles of free-flowing water through limestone bluffs. Canoe the upper sections in spring for whitewater; float the lower sections in summer for calm family tubing.
        </p>

        <h2 style="color:${BRAND_COLOR};font-size:20px;margin-top:28px;">3. Blanchard Springs Caverns</h2>
        <p style="font-size:16px;line-height:1.6;">
          A living cave system maintained by the U.S. Forest Service — still actively forming. The cave temperature stays 58°F year-round, making it the perfect escape from a July heat wave or a rainy spring day.
        </p>

        <h2 style="color:${BRAND_COLOR};font-size:20px;margin-top:28px;">4. Eureka Springs</h2>
        <p style="font-size:16px;line-height:1.6;">
          A Victorian-era resort town built into Ozark hillsides — no two streets meet at right angles. Famous for its art galleries, local restaurants, and the historic downtown that's entirely on the National Register of Historic Places.
        </p>

        <h2 style="color:${BRAND_COLOR};font-size:20px;margin-top:28px;">5. Jasper & Highway 7</h2>
        <p style="font-size:16px;line-height:1.6;">
          Often called one of the most scenic drives in America. The stretch through Newton County — through Jasper, past Hawksbill Crag overlook, down into the Buffalo River valley — is especially stunning in fall color season (mid-October).
        </p>

        <p style="margin:32px 0 16px;">
          ${btn(`${BASE_URL}/guides/hidden-gem-cabins`, 'Discover Hidden Gem Cabins')}
        </p>
        <p style="margin:0 0 28px;">
          ${btn(`${BASE_URL}/guides/buffalo-river-cabins`, 'Buffalo River Cabin Picks')}
        </p>
        ${footer}
      </div>
    `,
  },

  3: {
    subject: 'Best time to visit the Ozarks (your trip dates)',
    html: `
      <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#333;">
        <h1 style="color:${BRAND_COLOR};font-size:28px;margin-bottom:8px;">When should you go? The honest seasonal guide.</h1>
        <p style="font-size:16px;line-height:1.6;">
          Every season in the Ozarks is worth it — you just need to plan for the right one. Here's what to expect:
        </p>

        <h2 style="color:${BRAND_COLOR};font-size:20px;margin-top:28px;">Spring (March–May) — Best for: rivers &amp; wildflowers</h2>
        <p style="font-size:16px;line-height:1.6;">
          Higher water levels make spring the prime season for Buffalo River kayaking and canoeing. Wildflowers bloom across the hillsides. Book <strong>smaller creek-side cabins</strong> for front-row access to the water.
        </p>

        <h2 style="color:${BRAND_COLOR};font-size:20px;margin-top:28px;">Summer (June–August) — Best for: families &amp; lake activities</h2>
        <p style="font-size:16px;line-height:1.6;">
          Peak season. Bull Shoals and Beaver Lake are perfect for boating, swimming, and fishing. Look for <strong>cabin rentals with a pool or lake access</strong> — evenings cool off nicely even in July.
        </p>

        <h2 style="color:${BRAND_COLOR};font-size:20px;margin-top:28px;">Fall (September–November) — Best for: scenic drives &amp; hiking</h2>
        <p style="font-size:16px;line-height:1.6;">
          Peak fall color runs from mid-October to early November. Highway 7 through Newton County is at its most spectacular. <strong>Larger cabin rentals with a fireplace</strong> are the right call — evenings get cold fast.
        </p>

        <h2 style="color:${BRAND_COLOR};font-size:20px;margin-top:28px;">Winter (December–February) — Best for: solitude &amp; cozy getaways</h2>
        <p style="font-size:16px;line-height:1.6;">
          Crowds disappear and prices drop. Blanchard Springs Caverns is a year-round standout. <strong>Hot tub cabins near the Buffalo River</strong> are particularly popular — it's a completely different and quieter Ozarks.
        </p>

        <p style="font-size:16px;line-height:1.6;margin-top:24px;">
          Ready to find the right rental for your season and travel style?
        </p>
        <p style="margin:28px 0;">
          ${btn(`${BASE_URL}/listings`, 'Browse All Ozarks Rentals')}
        </p>
        ${footer}
      </div>
    `,
  },
};
