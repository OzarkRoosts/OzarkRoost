const { getAdventureBySlug } = require('./adventure-directory');

const CLUSTER_FOUR_GUIDES = [
  {
    slug: 'things-to-do-in-eureka-springs',
    title: 'Things to Do in Eureka Springs, Arkansas | OzarkRoost',
    description: 'Plan a Eureka Springs getaway with historic sights, trails, lakes, caves, wildlife and nearby Ozarks adventures.',
    h1: 'Things to Do in Eureka Springs',
    subhead: 'Build a better weekend around the town and the wild places just beyond it.',
    intro: 'Eureka Springs is strongest as a basecamp: spend time downtown, then add one or two outdoor destinations nearby. Use the directory to compare real places and verify current hours and access before traveling.',
    sections: [
      { heading: 'Start downtown, then go outside', paragraphs: ['Historic Eureka Springs, Thorncrown Chapel and Christ of the Ozarks create an easy first day. Beaver Lake, Lake Leatherwood and nearby cave and wildlife attractions add outdoor options.'] },
      { heading: 'Keep the route tight', paragraphs: ['Choose a small cluster of nearby destinations instead of trying to cross the entire Ozarks in one weekend.'] }
    ],
    destinationSlugs: ['eureka-springs','thorncrown-chapel','christ-of-the-ozarks','beaver-lake','lake-leatherwood','war-eagle-cavern','turpentine-creek-wildlife-refuge']
  },
  {
    slug: 'things-to-do-in-bentonville',
    title: 'Things to Do in Bentonville, Arkansas | Outdoors & Ozarks | OzarkRoost',
    description: 'Build a Bentonville trip around mountain biking, art, food, trails and Northwest Arkansas outdoor adventures.',
    h1: 'Things to Do in Bentonville',
    subhead: 'Mix world-class trails and culture into one Ozarks weekend.',
    intro: 'Bentonville works for travelers who want an active trip without giving up restaurants, art and town amenities. Build the itinerary around a trail system, then add one cultural or food stop.',
    sections: [
      { heading: 'Make cycling the anchor', paragraphs: ['Slaughter Pen, Coler and the broader Ozark Mountain Bike Trails network make cycling a natural centerpiece. Check current trail conditions before riding.'] },
      { heading: 'Add culture and food', paragraphs: ['Keep time for downtown, museums and restaurants rather than treating Bentonville as only a trailhead.'] }
    ],
    destinationSlugs: ['bentonville-ozarks','slaughter-pen-mountain-bike-park','coler-mountain-bike-preserve','ozark-mountain-bike-trails']
  },
  {
    slug: 'things-to-do-in-fayetteville',
    title: 'Things to Do in Fayetteville, Arkansas | OzarkRoost',
    description: 'Explore Fayetteville outdoor adventures, cycling, lakes, Devil\'s Den and deeper Ozarks destinations.',
    h1: 'Things to Do in Fayetteville',
    subhead: 'Use a lively college town as your launchpad for the mountains.',
    intro: 'Fayetteville is a strong base for travelers who want town energy plus quick access to Ozark outdoor recreation. Choose a local trail or lake for the first day and a deeper mountain destination for the second.',
    sections: [
      { heading: 'Stay close for the first adventure', paragraphs: ['Lake Wedington, local cycling and Devil\'s Den offer different ways to get outside without committing to a full-day drive.'] },
      { heading: 'Push deeper into the Ozarks', paragraphs: ['Upper Buffalo and the Ozark Highlands Trail can turn a Fayetteville trip into a more serious hiking weekend. Verify access and conditions before departure.'] }
    ],
    destinationSlugs: ['fayetteville-ozarks','lake-wedington','devils-den-state-park','upper-buffalo-wilderness','ozark-highlands-trail']
  },
  {
    slug: 'buffalo-river-trip-planner',
    title: 'Buffalo River Trip Planner | Build an Arkansas Ozarks Weekend | OzarkRoost',
    description: 'Plan a Buffalo River weekend with river access, hiking, waterfalls, camping and nearby lodging ideas.',
    h1: 'Buffalo River Trip Planner',
    subhead: 'Choose your river corridor first, then build everything around it.',
    intro: 'A Buffalo River trip gets easier when you choose one corridor instead of trying to cover the entire river. Use river access, trails and lodging as the three anchors, then verify current water and access information.',
    sections: [
      { heading: 'Pick the corridor', paragraphs: ['Ponca, Steel Creek, Kyle\'s Landing and Buffalo Point create different starting points for paddling and camping.'] },
      { heading: 'Add one signature hike', paragraphs: ['Goat Trail, Lost Valley, Hemmed-In Hollow and the Buffalo River Trail can add a hiking day when conditions and your group make sense for it.'] }
    ],
    destinationSlugs: ['buffalo-national-river','steel-creek','kyles-landing','buffalo-point','goat-trail','lost-valley-trail','hemmed-in-hollow','buffalo-river-trail']
  },
  {
    slug: 'ozark-highlands-trail-guide',
    title: 'Ozark Highlands Trail Guide | Arkansas Hiking & Planning | OzarkRoost',
    description: 'Plan an Ozark Highlands Trail adventure with trail sections, nearby destinations and practical trip-planning ideas.',
    h1: 'Ozark Highlands Trail Guide',
    subhead: 'Plan the section, the basecamp and the logistics before you chase the miles.',
    intro: 'The Ozark Highlands Trail is a serious backcountry resource, so the right trip depends on your chosen section, experience, weather and current trail information. Use nearby destinations to build a realistic plan rather than guessing at conditions.',
    sections: [
      { heading: 'Choose a realistic section', paragraphs: ['Treat the trail as a collection of sections rather than one casual day hike. Confirm current information with the responsible land manager before departure.'] },
      { heading: 'Build the logistics', paragraphs: ['Pair the hiking plan with a legal camping option, nearby road access and a recovery day when appropriate.'] }
    ],
    destinationSlugs: ['ozark-highlands-trail','upper-buffalo-wilderness','buffalo-river-trail','white-rock-mountain','alum-cove-natural-bridge']
  },
  {
    slug: 'family-cabins-ozarks',
    title: 'Family Cabins in the Ozarks | Where to Stay for a Family Trip | OzarkRoost',
    description: 'Find family cabin trip ideas near lakes, caves, wildlife, state parks and easy Ozarks adventures.',
    h1: 'Family Cabins in the Ozarks',
    subhead: 'Choose a base that makes the family adventure easier.',
    intro: 'Family cabin trips work best when the lodging and the activities are close enough to keep the day flexible. Start with the experience your family actually wants, then compare current lodging options nearby.',
    sections: [
      { heading: 'Choose the adventure first', paragraphs: ['Caves, wildlife, lakes and state parks create different family-trip rhythms. Pick one main attraction and a couple of flexible backups.'] },
      { heading: 'Verify the stay', paragraphs: ['Confirm current occupancy rules, amenities, pet policies, pricing and cancellation terms with the property or booking provider.'] }
    ],
    destinationSlugs: ['war-eagle-cavern','blanchard-springs-caverns','turpentine-creek-wildlife-refuge','beaver-lake','devils-den-state-park','lake-leatherwood']
  },
  {
    slug: 'weekend-getaway-eureka-springs',
    title: 'Eureka Springs Weekend Getaway | 48-Hour Ozarks Itinerary | OzarkRoost',
    description: 'Build a 48-hour Eureka Springs getaway around town attractions, scenic stops, outdoor adventures and a comfortable base.',
    h1: 'Eureka Springs Weekend Getaway',
    subhead: 'Two days is enough when you stop trying to do everything.',
    intro: 'A strong Eureka Springs weekend balances town time with one memorable outdoor experience. Use the destination directory to build a compact route and verify current operating details before leaving.',
    sections: [
      { heading: 'Day one: town and scenery', paragraphs: ['Explore the historic district, add Thorncrown Chapel or Christ of the Ozarks, then leave room for dinner and an unplanned stop.'] },
      { heading: 'Day two: choose one outdoor anchor', paragraphs: ['Beaver Lake, Lake Leatherwood, War Eagle Cavern or Turpentine Creek can give the second day a distinct purpose without overloading the itinerary.'] }
    ],
    destinationSlugs: ['eureka-springs','thorncrown-chapel','christ-of-the-ozarks','beaver-lake','lake-leatherwood','war-eagle-cavern','turpentine-creek-wildlife-refuge']
  },
  {
    slug: 'cabins-near-blanchard-springs',
    title: 'Cabins Near Blanchard Springs Caverns | OzarkRoost',
    description: 'Plan a Blanchard Springs Caverns getaway with nearby cabins, hiking, scenic drives and Ozark National Forest adventures.',
    h1: 'Cabins Near Blanchard Springs Caverns',
    subhead: 'Make the cavern one part of a bigger mountain weekend.',
    intro: 'Blanchard Springs Caverns sits in a region where cave tours, forest roads, hiking and scenic water destinations can all fit into one trip. Compare the current lodging options around the activities you want most.',
    sections: [
      { heading: 'Build around the cavern', paragraphs: ['Check current tour schedules and access first, then add a trail, scenic drive or nearby water destination.'] },
      { heading: 'Use the cabin as a basecamp', paragraphs: ['A nearby stay can reduce backtracking and make it easier to handle an early tour or a second outdoor activity.'] }
    ],
    destinationSlugs: ['blanchard-springs-caverns','ozark-st-francis-forest','ozark-highlands-trail','mammoth-spring-state-park','white-river-ozarks']
  },
  {
    slug: 'fishing-white-river-arkansas',
    title: 'White River Fishing Arkansas | Ozark Trout Trip Guide | OzarkRoost',
    description: 'Plan an Arkansas White River fishing trip with trout-water destinations, nearby lodging and outdoor trip ideas.',
    h1: 'White River Fishing in Arkansas',
    subhead: 'Build the fishing trip around the water, not the drive.',
    intro: 'The White River is a major Ozarks fishing destination. A good trip starts with the exact river area and current regulations, then adds lodging, access and a backup activity.',
    sections: [
      { heading: 'Start with the river', paragraphs: ['Choose the stretch and access point that fit your trip. Regulations, licenses, seasons and water conditions can change, so verify them with the appropriate agency.'] },
      { heading: 'Add a second adventure', paragraphs: ['A lake, scenic drive, spring or nearby hiking destination can make the fishing weekend worthwhile even when conditions change.'] }
    ],
    destinationSlugs: ['white-river-ozarks','bull-shoals-lake','norfork-lake','mammoth-spring-state-park','mountain-home-arkansas']
  },
  {
    slug: 'hiking-near-eureka-springs',
    title: 'Hiking Near Eureka Springs | Trails & Outdoor Day Trips | OzarkRoost',
    description: 'Find hiking ideas near Eureka Springs, Arkansas and pair trails with lakes, caves, wildlife and cabins.',
    h1: 'Hiking Near Eureka Springs',
    subhead: 'Turn a town getaway into an outdoor weekend.',
    intro: 'Eureka Springs makes a convenient base for travelers who want a town stay with nearby outdoor options. Choose a trail that fits your group and verify current conditions and access before hiking.',
    sections: [
      { heading: 'Shorter adventure options', paragraphs: ['Lake Leatherwood and nearby attractions can provide outdoor time without turning the entire day into a long backcountry outing.'] },
      { heading: 'Go deeper when the group is ready', paragraphs: ['Devil\'s Den and broader Ozark trail systems can extend the trip for hikers who want more mileage.'] }
    ],
    destinationSlugs: ['eureka-springs','lake-leatherwood','devils-den-state-park','whitaker-point','beaver-lake']
  },
  {
    slug: 'fall-colors-arkansas-ozarks',
    title: 'Fall Colors in the Arkansas Ozarks | Scenic Drives & Hikes | OzarkRoost',
    description: 'Plan an Arkansas Ozarks fall-color trip around scenic drives, overlooks, hikes, waterfalls and mountain towns.',
    h1: 'Fall Colors in the Arkansas Ozarks',
    subhead: 'Build the foliage trip around scenery, not a single viewpoint.',
    intro: 'Fall color timing varies by location and year, so a flexible route is smarter than a promise about peak color. Combine scenic roads with short hikes and overlooks, then check local conditions before you go.',
    sections: [
      { heading: 'Choose a mountain corridor', paragraphs: ['The Pig Trail, Boston Mountains and Buffalo River country offer multiple ways to build a foliage weekend.'] },
      { heading: 'Leave room for the unexpected', paragraphs: ['Add an overlook, waterfall or small-town stop so the trip remains worthwhile even when color is uneven.'] }
    ],
    destinationSlugs: ['pig-trail-scenic-byway','whitaker-point','white-rock-mountain','buffalo-national-river','pig-trail-falls']
  },
  {
    slug: 'spring-waterfalls-ozarks',
    title: 'Spring Waterfalls in the Ozarks | Arkansas Hiking Guide | OzarkRoost',
    description: 'Plan spring waterfall hikes in the Ozarks around Lost Valley, Glory Hole Falls, Eden Falls and Hemmed-In Hollow.',
    h1: 'Spring Waterfalls in the Ozarks',
    subhead: 'Go after the rain—but respect the conditions it creates.',
    intro: 'Spring rainfall can make Ozarks waterfalls spectacular while also making trails slick, muddy or hazardous. Check current conditions and land-manager guidance before hiking.',
    sections: [
      { heading: 'Build a waterfall loop', paragraphs: ['Lost Valley and Eden Falls can pair naturally, while Glory Hole Falls and Hemmed-In Hollow create different hiking experiences.'] },
      { heading: 'Use a backup plan', paragraphs: ['Keep a cave, scenic drive or town destination available in case trail conditions are unsafe or access changes.'] }
    ],
    destinationSlugs: ['lost-valley-trail','eden-falls','glory-hole-falls','hemmed-in-hollow','buffalo-national-river']
  }
].map(page => ({ ...page, destinations: page.destinationSlugs.map(getAdventureBySlug).filter(Boolean) }));

module.exports = { CLUSTER_FOUR_GUIDES };
