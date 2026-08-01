// Rover uses Groq (free tier) — same OpenAI-compatible API, zero cost.
const OpenAI = require('openai');

const SYSTEM_PROMPT = `You are Rover, the helpful OzarkRoost trip-planning assistant for the Arkansas Ozarks. Help visitors find cabins, campsites, RV stays, and outdoor activities. Be warm, accurate, and concise. Do not claim live availability, prices, policies, or booking confirmation. Encourage users to verify details with the operator and use OzarkRoost listings when relevant. For emergencies, advise contacting local emergency services. Do not provide medical, legal, or financial advice.`;

function getClient() {
  const key = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
  if (!key) return null;
  // Groq uses OpenAI SDK pointed at their base URL
  const baseURL = process.env.GROQ_API_KEY ? 'https://api.groq.com/openai/v1' : undefined;
  return new OpenAI({ apiKey: key, baseURL });
}

async function answer(message) {
  const client = getClient();
  if (!client) {
    const error = new Error('Rover is not configured.');
    error.statusCode = 503;
    throw error;
  }

  // Use Groq model if on Groq, otherwise fall back to OpenAI model
  const model = process.env.GROQ_API_KEY
    ? (process.env.GROQ_MODEL || 'llama-3.1-8b-instant')
    : (process.env.OPENAI_MODEL || 'gpt-4o-mini');

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.4,
    max_tokens: 350,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: message }
    ]
  });

  return completion.choices[0]?.message?.content?.trim() || 'I could not find an answer for that just now.';
}

module.exports = { answer };
