function evidence(agentId, capability, target, result) {
  return { adapter: `${agentId}:${capability}`, target: target || null, handlerResult: result === undefined ? null : result, verifiedAt: new Date().toISOString() };
}
function wrap(agentId, capability, handler, invoke) {
  if (typeof handler !== 'function') return undefined;
  return async action => {
    const result = await invoke(action);
    return { result, evidence: evidence(agentId, capability, action.target, result), realizedRevenue: Number(result?.realizedRevenue) || 0, lesson: result?.lesson || null };
  };
}
function buildSpecialistAdapters(handlers = {}) {
  const adapters = {};
  const ai = handlers.affiliateAI;
  const executor = handlers.affiliateExecutor;
  const ops = handlers.affiliateOps;
  const sales = handlers.autonomousSales;
  const rover = handlers.rover;
  adapters['affiliate-ai:discover_affiliate'] = wrap('affiliate-ai', 'discover_affiliate', ai?.runOpportunityScan, () => ai.runOpportunityScan());
  adapters['affiliate-ai:score_opportunity'] = wrap('affiliate-ai', 'score_opportunity', ai?.runOpportunityScan, () => ai.runOpportunityScan());
  adapters['affiliate-executor:execute_affiliate'] = wrap('affiliate-executor', 'execute_affiliate', executor?.executeApplication, action => { if (!action.payload?.application) throw new Error('Execution blocked: affiliate application payload is required'); return executor.executeApplication(action.payload.application); });
  adapters['affiliate-ops:audit_affiliate'] = wrap('affiliate-ops', 'audit_affiliate', ops?.runScan, () => ops.runScan());
  adapters['affiliate-ops:repair_affiliate'] = wrap('affiliate-ops', 'repair_affiliate', ops?.applySafePlan, action => { if (!action.payload?.plan) throw new Error('Execution blocked: affiliate ops plan is required'); return ops.applySafePlan(action.payload.plan); });
  adapters['autonomous-sales:prepare_outreach'] = wrap('autonomous-sales', 'prepare_outreach', sales?.generateAndSendResponse, action => { if (action.payload?.consent !== true) throw new Error('Execution blocked: explicit outreach consent is required'); if (!action.payload?.conversation) throw new Error('Execution blocked: conversation context is required'); return sales.generateAndSendResponse(action.payload.conversation); });
  if (handlers.opsbot?.runPaymentWatchdog) adapters['opsbot:monitor_ops'] = wrap('opsbot', 'monitor_ops', handlers.opsbot.runPaymentWatchdog, action => handlers.opsbot.runPaymentWatchdog(action.payload || {}));
  adapters['rover:answer'] = wrap('rover', 'answer', rover?.answer, action => rover.answer(action.payload?.message || action.target || ''));
  return Object.fromEntries(Object.entries(adapters).filter(([, fn]) => fn));
}
function createSpecialistAdapters(handlers = {}) { return buildSpecialistAdapters(handlers); }
function loadDefaultSpecialistAdapters() {
  return buildSpecialistAdapters({
    affiliateAI: require('./affiliate-ai-engine'),
    affiliateExecutor: require('./affiliate-application-executor'),
    affiliateOps: require('./affiliate-ops-agent'),
    autonomousSales: require('./autonomous-sales'),
    rover: require('./rover'),
  });
}
module.exports = { buildSpecialistAdapters, createSpecialistAdapters, loadDefaultSpecialistAdapters };
