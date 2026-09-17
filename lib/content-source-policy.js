const AUTHORITY_HOSTS = new Set([
  'nps.gov',
  'fs.usda.gov',
  'arkansasstateparks.com',
  'arkansas.com',
  'agfc.com',
  'swl.usace.army.mil',
  'mostateparks.com',
  'recreation.gov'
]);

// Claims that commonly turn marketing copy into unsupported factual assertions.
const UNSUPPORTED_COPY_PATTERNS = [
  /\bonly\b/i,
  /\bthe best\b/i,
  /\bbest[- ]known\b/i,
  /\bworld[- ]class\b/i,
  /\bmust[- ]visit\b/i,
  /\bguarantee(?:d)?\b/i,
  /\bno\.\s*1\b/i,
  /\bnumber one\b/i,
  /\bpremier\b/i,
  /\blegendary\b/i
];

function isAuthorityHost(hostname) {
  const host = String(hostname || '').toLowerCase().replace(/^www\./, '');
  return [...AUTHORITY_HOSTS].some(allowed => host === allowed || host.endsWith(`.${allowed}`));
}

function validateAdventureSource(adventure) {
  const sourceUrl = String(adventure?.sourceUrl || '').trim();
  if (!sourceUrl) return { ok: false, reason: 'missing authoritative source URL' };

  let parsed;
  try {
    parsed = new URL(sourceUrl);
  } catch {
    return { ok: false, reason: 'invalid source URL' };
  }

  if (parsed.protocol !== 'https:') return { ok: false, reason: 'source URL must use HTTPS' };
  if (!isAuthorityHost(parsed.hostname)) return { ok: false, reason: 'source host is not on the approved authority list' };
  if (adventure.verified !== true) return { ok: false, reason: 'destination has not been explicitly verified' };

  return { ok: true, reason: 'verified authoritative source' };
}

function isSafeDestinationCopy(text) {
  const value = String(text || '').trim();
  const matched = UNSUPPORTED_COPY_PATTERNS.find(pattern => pattern.test(value));
  return matched
    ? { ok: false, reason: `unsupported promotional claim: ${matched}` }
    : { ok: true };
}

function shouldPublishAdventure(adventure) {
  const source = validateAdventureSource(adventure);
  if (!source.ok) return source;
  const copy = isSafeDestinationCopy(`${adventure.name || ''} ${adventure.description || ''}`);
  if (!copy.ok) return copy;
  return { ok: true, reason: 'source and copy policy passed' };
}

module.exports = {
  AUTHORITY_HOSTS,
  validateAdventureSource,
  isSafeDestinationCopy,
  shouldPublishAdventure
};
