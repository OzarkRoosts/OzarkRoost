module.exports = {
  name: 'seed_founding_listings',
  up: async (client) => {
    const listings = [
      {
        propertyName: 'Buffalo National River',
        location: 'Buffalo National River, Arkansas Ozarks',
        propertyType: 'National Park / Outdoor Destination',
        description: 'A 135-mile free-flowing river destination for floating, fishing, hiking, horseback riding, camping and exploring historic sites across the Arkansas Ozarks.',
        websiteUrl: 'https://www.nps.gov/buff/'
      },
      {
        propertyName: 'Buffalo Outdoor Center',
        location: 'Ponca, Arkansas',
        propertyType: 'Outfitter / Lodging / Adventure',
        description: 'Upper Buffalo River adventure base offering cabins, lodging and outdoor activities including floating, hiking, mountain biking and ziplining.',
        websiteUrl: 'https://www.buffaloriver.com/'
      },
      {
        propertyName: 'Rio Buffalo Outfitter',
        location: 'Jasper, Arkansas',
        propertyType: 'Outfitter / Lodging',
        description: 'Upper Buffalo River outfitter offering canoe, kayak and raft rentals, vehicle shuttles, camping and riverside lodging near Jasper and Ponca.',
        websiteUrl: 'https://www.riobuffalo.com/'
      },
      {
        propertyName: 'Gotta Go Buffalo',
        location: 'Jasper, Arkansas',
        propertyType: 'Cabins / Lodging',
        description: 'Ozark cabin retreat near Jasper featuring riverfront and treehouse-style cabins with easy access to the Buffalo National River.',
        websiteUrl: 'https://www.gottagobuffalo.com/'
      },
      {
        propertyName: 'The Woods Cabins',
        location: 'Eureka Springs, Arkansas',
        propertyType: 'Cabins / Lodging',
        description: 'Five private Eureka Springs cabins near downtown with wooded surroundings, waterfall features, jetted tubs, fireplaces and an outdoor hot tub.',
        websiteUrl: 'https://thewoodscabins.com/'
      },
      {
        propertyName: 'Beaver Lake Cottages',
        location: 'Eureka Springs, Arkansas',
        propertyType: 'Cabins / Lodging',
        description: 'Glass-front cabins and suites overlooking Beaver Lake, designed for quiet Ozark getaways with lake views, private decks and spa tubs.',
        websiteUrl: 'https://beaverlakecottages.com/'
      },
      {
        propertyName: 'Eureka Sunset Cabins',
        location: 'Eureka Springs, Arkansas',
        propertyType: 'Cabins / Lodging',
        description: 'Private cabin and suite lodging on wooded acreage in Eureka Springs, with themed accommodations, forest views and relaxing getaway amenities.',
        websiteUrl: 'https://eurekasunset.com/'
      },
      {
        propertyName: 'Kings River Outfitters',
        location: 'Eureka Springs, Arkansas',
        propertyType: 'River Outfitter / Camping',
        description: 'Kings River outfitter providing canoe and kayak rentals, shuttles, guide services, camping and cabin stays along a scenic Ozark river.',
        websiteUrl: 'https://kingsriveroutfitters.com/'
      },
      {
        propertyName: 'Grotto Wood Fired Grill & Wine Cave',
        location: 'Eureka Springs, Arkansas',
        propertyType: 'Restaurant / Dining',
        description: 'A distinctive downtown Eureka Springs dining experience featuring wood-fired dishes in a historic stone building with a natural spring and cave-like atmosphere.',
        websiteUrl: 'https://www.grottoeureka.com/'
      },
      {
        propertyName: 'The Great Passion Play',
        location: 'Eureka Springs, Arkansas',
        propertyType: 'Attraction / Entertainment',
        description: 'A long-running outdoor drama in the Ozark Mountains, with year-round attractions including Christ of the Ozarks, museums, tours and trails.',
        websiteUrl: 'https://www.greatpassionplay.org/'
      },
      {
        propertyName: 'Float Eureka',
        location: 'Eureka Springs, Arkansas',
        propertyType: 'Paddling / Outdoor Adventure',
        description: 'Local watersports outfitter offering White River float trips and kayak, canoe and stand-up paddleboard rentals for Ozark waterways.',
        websiteUrl: null
      },
      {
        propertyName: 'Thorncrown Chapel',
        location: 'Eureka Springs, Arkansas',
        propertyType: 'Attraction / Landmark',
        description: 'A striking wood-and-glass chapel set in the Ozark woods west of Eureka Springs and one of the region’s best-known architectural landmarks.',
        websiteUrl: null
      }
    ];

    for (const listing of listings) {
      await client.query(
        `INSERT INTO listing_submissions
          (owner_name, owner_email, property_name, location, property_type, description, photo_url, website_url, payment_link_url, payment_status)
         SELECT $1::text, $2::text, $3::text, $4::text, $5::text, $6::text, NULL, $7::text, NULL, 'free'
         WHERE NOT EXISTS (
           SELECT 1 FROM listing_submissions WHERE property_name = $3::text AND location = $4::text
         )`,
        [
          'Unclaimed — Founding Listing',
          'unclaimed@ozarkroost.local',
          listing.propertyName,
          listing.location,
          listing.propertyType,
          listing.description,
          listing.websiteUrl
        ]
      );
    }
  }
};
