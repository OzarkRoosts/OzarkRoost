const DEFAULT_PROTECTED_KEYS = Object.freeze([
  'DATABASE_URL',
  'STRIPE_SECRET_KEY',
  'SMTP_USER',
  'SMTP_PASS',
  'MAILTRAP_TOKEN',
  'RENDER_API_KEY',
  'SESSION_SECRET',
]);

function detectPartnerRuntimeConfig(config = {}, env = process.env) {
  return (config.required || []).map(key => ({
    key,
    configured: env[key] !== undefined && env[key] !== '',
    required: true,
  }));
}

function planProtectedEnvChanges(current = {}, desired = {}, policy = {}) {
  const protectedKeys = new Set(policy.protectedKeys || DEFAULT_PROTECTED_KEYS);
  const allowRemove = new Set(policy.allowRemove || []);
  const changes = [];
  const keys = new Set([...Object.keys(current), ...Object.keys(desired)]);

  for (const key of keys) {
    if (desired[key] !== undefined && desired[key] !== current[key]) {
      changes.push({ action: current[key] === undefined ? 'add' : 'update', key, value: desired[key] });
    } else if (desired[key] === undefined && current[key] !== undefined && !protectedKeys.has(key) && allowRemove.has(key)) {
      changes.push({ action: 'remove', key });
    }
  }
  return changes;
}

async function applyProtectedEnvChanges(renderAdapter, changes = [], policy = {}) {
  const protectedKeys = new Set(policy.protectedKeys || DEFAULT_PROTECTED_KEYS);
  const results = [];
  for (const change of changes) {
    if (change.action === 'remove' && protectedKeys.has(change.key)) {
      results.push({ ...change, applied: false, reason: 'protected_variable' });
      continue;
    }
    if (change.action === 'add' || change.action === 'update') {
      if (typeof renderAdapter.setEnvVar !== 'function') throw new Error('Render adapter cannot set environment variables');
      await renderAdapter.setEnvVar(change.key, change.value);
    } else if (change.action === 'remove') {
      if (typeof renderAdapter.deleteEnvVar !== 'function') throw new Error('Render adapter cannot delete environment variables');
      await renderAdapter.deleteEnvVar(change.key);
    }
    results.push({ action: change.action, key: change.key, applied: true });
  }
  return results;
}

module.exports = { DEFAULT_PROTECTED_KEYS, detectPartnerRuntimeConfig, planProtectedEnvChanges, applyProtectedEnvChanges };
