function shouldProcessContract(status) {
  const normalized = String(status || '').trim().toLowerCase();
  return normalized === 'accepted' || normalized === 'signed';
}

module.exports = { shouldProcessContract };
