/**
 * Safe, deterministic content fallbacks. These are intentionally plain and
 * useful rather than pretending an unavailable AI generated something.
 */

function seoFallback(task) {
  const title = task.title || task.topic || 'Ozark travel guide';
  return {
    title,
    description: `Plan a better Ozark trip with practical information about ${title.toLowerCase()}, places to stay, things to do, and trip-planning resources.`,
    body: `## ${title}\n\nExplore the Ozarks with practical trip-planning information, local travel ideas, and useful resources. Check availability and details before traveling, and use the recommended booking or partner links when available.`,
  };
}

function socialFallback(task) {
  const title = task.title || task.topic || 'Ozark travel';
  return `${title}: discover places to stay, outdoor adventures, and trip ideas across the Ozarks. Save this guide for your next trip.`;
}

function outreachFallback(task) {
  const business = task.businessName || 'local travel business';
  return {
    subject: `Partnership opportunity with OzarkRoost`,
    body: `Hi ${business},\n\nOzarkRoost is building a travel resource focused on helping visitors discover the Ozarks. We would like to discuss a straightforward partnership or sponsored listing that can put your business in front of relevant travelers.\n\nIf you're interested, reply with the best contact and partnership information.\n\nThanks,\nOzarkRoost`,
  };
}

module.exports = { seoFallback, socialFallback, outreachFallback };
