const {
  configured,
  getBalance,
  getNextPayout,
  getPayments,
  getActions
} = require('./travelpayouts-api');

async function run() {
  if (!configured()) {
    console.log('[Travelpayouts] API not configured');
    return { configured: false };
  }

  try {
    const [balance, nextPayout, actions] = await Promise.all([
      getBalance(),
      getNextPayout(),
      getActions({ currency: 'usd', limit: 100 })
    ]);

    const b = balance?.balance || {};
    const actionList = actions?.actions || [];
    const paid = actionList.filter(a => a.action_state === 'paid');
    const processing = actionList.filter(a => a.action_state === 'processing');
    const cancelled = actionList.filter(a => a.action_state === 'cancelled');
    const recentProfit = actionList.reduce((sum, a) => sum + Number(a.profit || 0), 0);

    const snapshot = {
      balance_usd: Number(b.usd || 0),
      balance_eur: Number(b.eur || 0),
      next_payout_usd: Number(nextPayout?.next_payout?.usd || 0),
      actions: actionList.length,
      paid_actions: paid.length,
      processing_actions: processing.length,
      cancelled_actions: cancelled.length,
      recent_profit_usd: recentProfit,
      captured_at: new Date().toISOString()
    };

    console.log(`[Travelpayouts] Revenue snapshot: balance=$${snapshot.balance_usd.toFixed(2)} USD, paid=${snapshot.paid_actions}, processing=${snapshot.processing_actions}, recent_profit=$${snapshot.recent_profit_usd.toFixed(2)}`);
    return { configured: true, snapshot, actions: actionList };
  } catch (error) {
    console.error(`[Travelpayouts] Revenue sync failed: ${error.message}`);
    return { configured: true, error: error.message };
  }
}

async function getPaymentHistory() {
  if (!configured()) return { configured: false };
  try {
    return { configured: true, payments: await getPayments() };
  } catch (error) {
    console.error(`[Travelpayouts] Payment history failed: ${error.message}`);
    return { configured: true, error: error.message };
  }
}

module.exports = { run, getPaymentHistory };
