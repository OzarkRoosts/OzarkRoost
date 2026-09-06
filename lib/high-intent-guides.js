const { getAdventureBySlug } = require('./adventure-directory');
const { CLUSTER_TWO_GUIDES } = require('./high-intent-guides-cluster-2');

const GUIDE_DEFINITIONS = [
  {
    slug: 'best-things-to-do-eureka-springs',
    title: 'Best Things to Do in Eureka Springs, Arkansas | OzarkRoost',
    description: 'Plan a Eureka Springs trip with a practical list of outdoor adventures, attractions, scenic stops and places to stay in the Ozarks.',
    h1: 'Best Things to Do in Eureka Springs',
    subhead: 'Build a day, a weekend, or a full Ozarks escape around the places worth leaving the cabin for.',
    intro: 'Eureka Springs works best as a basecamp: combine the historic town with nearby lakes, caves, wildlife, trails and forest roads. This guide connects the high-interest stops already in the OzarkRoost directory so travelers can move from inspiration to trip planning without dead ends.',
    sections: [
      { heading: 'Start with the classic Eureka Springs stops', paragraphs: ['Begin with Historic Eureka Springs, Thorncrown Chapel and the Christ of the Ozarks area, then add an outdoor activity that matches your pace. The goal is a flexible itinerary rather than a one-size-fits-all checklist.'] },
      { heading: 'Add water, wildlife or adrenaline', paragraphs: ['Beaver Lake, Lake Leatherwood, Turpentine Creek Wildlife Refuge and the area\'s adventure parks give you easy ways to turn a town visit into an Ozarks outdoor weekend.'] }
    ],
    destinationSlugs: ['eureka-springs','thorncrown-chapel','christ-of-the-ozarks','beaver-lake','lake-leatherwood','turpentine-creek-wildlife-refuge','eureka-springs-adventure-park','war-eagle-cavern']
  },
  {
    slug: 'buffalo-river-float-trips',
    title: 'Buffalo River Float Trips | Canoe, Kayak & River Planning | OzarkRoost',
    description: 'Plan Buffalo River float trips with launch-area ideas, paddling destinations, camp bases and nearby Ozark adventures.',
    h1: 'Buffalo River Float Trips',
    subhead: 'Choose your river base, build the adventure, and keep the rest of the weekend close by.',
    intro: 'A Buffalo River trip can be a half-day paddle or the centerpiece of a longer Ozarks getaway. OzarkRoost connects river destinations, campgrounds and outfitters so you can research the route first and then choose where to stay and what to do next.',
    sections: [
      { heading: 'Build around the river corridor', paragraphs: ['Use Ponca, Steel Creek, Kyle\'s Landing and Buffalo Point as planning anchors in the directory. Check official destination information before traveling because river conditions and access can change.'] },
      { heading: 'Pair the float with a hike', paragraphs: ['The Buffalo River Trail, Goat Trail, Lost Valley and Hemmed-In Hollow put some of the region\'s best hiking ideas into the same trip-planning network.'] }
    ],
    destinationSlugs: ['buffalo-national-river','paddlers-park','steel-creek','kyles-landing','buffalo-point','buffalo-outdoor-center','rio-buffalo-outfitter','buffalo-river-trail','goat-trail','hemmed-in-hollow']
  },
  {
    slug: 'ozarks-waterfalls',
    title: 'Best Waterfalls in the Ozarks | Arkansas Waterfall Guide | OzarkRoost',
    description: 'Explore Arkansas Ozarks waterfalls including Hemmed-In Hollow, Glory Hole Falls, Eden Falls and Pig Trail Falls, with nearby trip ideas.',
    h1: 'Waterfalls in the Ozarks',
    subhead: 'Chase the water, then turn the waterfall hunt into a full Ozarks day trip.',
    intro: 'Waterfalls are one of the easiest ways to turn an Ozarks road trip into an adventure. The strongest strategy is to pair a waterfall destination with a nearby trail, river stop or cabin base instead of treating the falls as a quick photo stop.',
    sections: [
      { heading: 'Pick the kind of waterfall day you want', paragraphs: ['Hemmed-In Hollow and Glory Hole Falls offer very different experiences, while Eden Falls pairs naturally with Lost Valley. Pig Trail Falls can work as a scenic-drive stop. Always check official conditions and access before setting out.'] },
      { heading: 'Make the drive pay off', paragraphs: ['Use the surrounding adventure pages to add a second stop, a river day or a campground. That creates a stronger weekend plan and more useful options when water levels or trail conditions change.'] }
    ],
    destinationSlugs: ['hemmed-in-hollow','glory-hole-falls','eden-falls','lost-valley-trail','lost-valley-state-park','pig-trail-falls','buffalo-national-river','devils-den-state-park']
  },
  {
    slug: 'ozarks-weekend-getaway',
    title: 'Best Ozarks Weekend Getaway Ideas | Arkansas & Missouri | OzarkRoost',
    description: 'Build an Ozarks weekend getaway with cabins, scenic drives, waterfalls, rivers, hiking and attractions across Arkansas and Missouri.',
    h1: 'Plan an Ozarks Weekend Getaway',
    subhead: 'One region. Hundreds of ways to spend 48 hours outside.',
    intro: 'The easiest Ozarks weekend is built around one anchor destination and two or three nearby experiences. Start with a place to stay, add one signature outdoor activity, then leave room for a scenic drive, meal or unexpected stop.',
    sections: [
      { heading: 'Weekend formula: stay + signature adventure + flex day', paragraphs: ['A Buffalo River base can combine paddling and hiking. Eureka Springs can combine town attractions with Beaver Lake or wildlife. Northwest Arkansas can lean toward cycling and trail time. Missouri Ozarks trips can center on springs, shut-ins and lake country.'] },
      { heading: 'Keep the itinerary realistic', paragraphs: ['Do not stack distant destinations just because they look close on a map. Use the linked directory pages to choose a tight cluster and verify current hours, closures and conditions with the official destination before you go.'] }
    ],
    destinationSlugs: ['buffalo-national-river','eureka-springs','beaver-lake','whitaker-point','devils-den-state-park','ha-ha-tonka-state-park','johnson-shut-ins','missouri-ozarks']
  },
  {
    slug: 'cabins-near-eureka-springs',
    title: 'Cabins Near Eureka Springs, Arkansas | OzarkRoost',
    description: 'Find a smart base for a Eureka Springs getaway and connect lodging research with lakes, trails, caves, wildlife and attractions.',
    h1: 'Cabins Near Eureka Springs',
    subhead: 'Choose the base that puts your next Ozarks adventure within reach.',
    intro: 'When travelers search for cabins near Eureka Springs, they are usually choosing more than a bed: they are choosing how much driving their weekend requires. Use the adventure directory to compare the kinds of experiences you want nearby, then browse current lodging inventory.',
    sections: [
      { heading: 'Choose your nearby adventure first', paragraphs: ['For town-focused trips, keep Historic Eureka Springs and Thorncrown Chapel close. For water days, look toward Beaver Lake and Lake Leatherwood. For family or wildlife plans, consider the nearby cave and wildlife attractions.'] },
      { heading: 'Then compare available stays', paragraphs: ['OzarkRoost listings are the direct directory layer for local stays. Availability, amenities and pricing belong to the property or booking provider, so verify those details before booking.'] }
    ],
    destinationSlugs: ['eureka-springs','thorncrown-chapel','beaver-lake','lake-leatherwood','war-eagle-cavern','turpentine-creek-wildlife-refuge','eureka-springs-adventure-park']
  },
  {
    slug: 'family-things-to-do-ozarks',
    title: 'Family Things to Do in the Ozarks | Arkansas Family Trips | OzarkRoost',
    description: 'Find family-friendly Ozarks adventures including caves, lakes, wildlife, parks and easy outdoor activities across Arkansas and Missouri.',
    h1: 'Family Things to Do in the Ozarks',
    subhead: 'Mix easy wins with one memorable outdoor adventure.',
    intro: 'Family Ozarks trips work best when the itinerary has variety: an attraction with a clear payoff, an outdoor stop with room to move, and enough downtime that nobody feels rushed. These directory pages give you real destinations to evaluate before you leave.',
    sections: [
      { heading: 'Build a family-friendly mix', paragraphs: ['Caves, state parks, wildlife experiences and lake days can be combined into flexible itineraries. Check official age, tour, weather and access information for each destination before traveling.'] },
      { heading: 'Keep the base convenient', paragraphs: ['Use the lodging directory to keep your family close to the activities you actually plan to do. A shorter drive can be worth more than squeezing in another attraction.'] }
    ],
    destinationSlugs: ['war-eagle-cavern','blanchard-springs-caverns','devils-den-state-park','turpentine-creek-wildlife-refuge','eureka-springs-adventure-park','beaver-lake','lake-leatherwood','elephant-rocks']
  },
  {
    slug: 'romantic-getaways-ozarks',
    title: 'Romantic Getaways in the Ozarks | Cabins, Views & Weekend Ideas | OzarkRoost',
    description: 'Plan a romantic Ozarks getaway around scenic overlooks, Eureka Springs, cabins, lakes, waterfalls and quiet outdoor experiences.',
    h1: 'Romantic Getaways in the Ozarks',
    subhead: 'Trade the crowded itinerary for a cabin, a view and a little room to wander.',
    intro: 'A romantic Ozarks weekend does not need a packed schedule. Pick a scenic base, add one memorable outdoor stop, and leave time for the town or trail you discover along the way.',
    sections: [
      { heading: 'Start with scenery', paragraphs: ['Whitaker Point, Sam\'s Throne, White Rock Mountain and the Eureka Springs area offer strong ingredients for a scenic weekend. Check official access and conditions before heading out.'] },
      { heading: 'Add one shared adventure', paragraphs: ['A cave tour, lake day, waterfall hike or forest drive gives the weekend a centerpiece without turning it into a race between attractions.'] }
    ],
    destinationSlugs: ['eureka-springs','thorncrown-chapel','whitaker-point','sams-throne','white-rock-mountain','blanchard-springs-caverns','beaver-lake','glory-hole-falls']
  },
  {
    slug: 'best-hiking-ozarks',
    title: 'Best Hiking in the Ozarks | Arkansas Trails & Hikes | OzarkRoost',
    description: 'Explore Ozarks hiking destinations from Buffalo River trails and Lost Valley to Hawksbill Crag, Devil\'s Den and the Ozark Highlands Trail.',
    h1: 'Best Hiking in the Ozarks',
    subhead: 'Find the trail that fits your weekend, not just the trail with the best photo.',
    intro: 'Ozarks hiking ranges from short waterfall walks to long backcountry routes. Use the directory to compare the destination, region and official source for each hike, then choose a realistic trail for your group and conditions.',
    sections: [
      { heading: 'Pick your hiking style', paragraphs: ['Lost Valley and Eden Falls are different from the long Ozark Highlands Trail, while Hawksbill Crag and Sam\'s Throne emphasize scenery. Trail difficulty, closures and conditions can change, so confirm details with the official land manager before going.'] },
      { heading: 'Build a hiking basecamp', paragraphs: ['Pair a trail cluster with the lodging directory or a nearby campground. That lets you spend more of the weekend hiking and less of it driving between unrelated destinations.'] }
    ],
    destinationSlugs: ['lost-valley-trail','eden-falls','whitaker-point','sams-throne','buffalo-river-trail','goat-trail','ozark-highlands-trail','devils-den-lake-trail','yellow-rock-trail','alum-cove-natural-bridge']
  },
  ...CLUSTER_TWO_GUIDES
];

function getHighIntentGuide(slug) {
  const definition = GUIDE_DEFINITIONS.find(page => page.slug === slug);
  if (!definition) return null;
  return {
    ...definition,
    destinations: definition.destinationSlugs.map(getAdventureBySlug).filter(Boolean),
  };
}

module.exports = { GUIDE_DEFINITIONS, getHighIntentGuide };
