const localAI = require('./local-ai-engine');

/**
 * Rover is intentionally local-first: no OpenAI/Groq client, API key, network
 * request, or paid model is required for trip-planning responses.
 */
async function answer(message) {
  return localAI.answer(message);
}

module.exports = { answer };
