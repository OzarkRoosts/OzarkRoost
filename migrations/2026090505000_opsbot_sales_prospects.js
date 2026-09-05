module.exports = {
  name: 'opsbot_sales_prospects',
  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS opsbot_sales_prospects (
        id SERIAL PRIMARY KEY,
        business_name TEXT NOT NULL,
        area TEXT,
        email TEXT NOT NULL,
        phone TEXT,
        source_url TEXT NOT NULL,
        hook TEXT,
        opted_out BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (email)
      )
    `);

    const prospects = [
      ['Arkansas House', 'Jasper', 'arhouseinn@gmail.com', '1-888-274-6873', 'https://thearkhouse.com/', 'Historic downtown Jasper lodging on the Little Buffalo River.'],
      ['Cave Mountain Guesthouse', 'Buffalo River region', 'theclarks@eritter.net', '870-446-2769', 'https://buffaloriver.org/river-lodging/places-to-stay/', 'Buffalo River lodging with a strong stay-and-explore fit.'],
      ['Cliff House Inn & Cabins', 'Buffalo River region', 'clifhous@ritternet.com', '870-688-4056', 'https://buffaloriver.org/river-lodging/places-to-stay/', 'Lodging, restaurant and cabins near Buffalo River adventures.'],
      ['Foggy Hollow Cabin', 'Buffalo River region', 'foggyhollow@cabinsintheozarks.com', '800-669-3762', 'https://buffaloriver.org/river-lodging/places-to-stay/', 'Cabin lodging near the Buffalo River.'],
      ['Lost Valley Canoe', 'Ponca', 'info@lostvalleycanoe.com', '870-861-5522', 'https://buffaloriver.org/river-lodging/places-to-stay/', 'Adventure operator with strong cross-promotion potential.'],
      ['My Blue Heaven Cabin & Guesthouse', 'Buffalo River region', 'info@myblueheavencabin.com', '870-446-5783', 'https://buffaloriver.org/river-lodging/places-to-stay/', 'Local cabin and guesthouse prospect.'],
      ['The Ponca House / Low Gap Cabin', 'Ponca', 'walnutgrove@ritternet.com', '870-861-5835', 'https://buffaloriver.org/river-lodging/places-to-stay/', 'Lodging near Ponca and the Upper Buffalo.'],
      ['Rimrock Cove Ranch', 'Buffalo River region', 'rimrockcove@gmail.com', '870-553-2556', 'https://buffaloriver.org/river-lodging/places-to-stay/', 'Ranch lodging with an outdoor-focused audience.'],
      ['Steel Creek Cabins', 'Ponca', 'mlangdon@steelcreekcabins.com', '870-861-5890', 'https://buffaloriver.org/river-lodging/places-to-stay/', 'Direct Upper Buffalo and Steel Creek positioning.'],
      ['Buffalo River Lodging', 'Jasper / Upper Buffalo', 'info@buffaloriverlodging.com', '877-428-3563', 'https://www.buffaloriverlodging.com/accommodations-overview', 'Secluded accommodations with strong Upper Buffalo positioning.']
    ];

    for (const [business_name, area, email, phone, source_url, hook] of prospects) {
      await client.query(
        `INSERT INTO opsbot_sales_prospects (business_name, area, email, phone, source_url, hook)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (email) DO UPDATE SET business_name = EXCLUDED.business_name, area = EXCLUDED.area,
           phone = EXCLUDED.phone, source_url = EXCLUDED.source_url, hook = EXCLUDED.hook`,
        [business_name, area, email, phone, source_url, hook]
      );
    }
  }
};
