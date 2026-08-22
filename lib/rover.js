const localAI = require('./local-ai-engine');

/**
 * Rover is intentionally local-first: no OpenAI/Groq client, API key, network
 * request, or paid model is required for trip-planning responses.
 */
async function answer(message) {
  return localAI.generate(
    'You are Rover, the helpful OzarkRoost trip-planning assistant for the Arkansas Ozarks. Be warm, accurate, and concise. Do not claim live availability, prices, policies, or booking confirmation.',
    message,
    { maxTokens: 350 }
  );
}

module.exports = { answer };
