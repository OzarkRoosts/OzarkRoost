// Turns detected affiliate gaps into concrete, auditable actions without pretending
// human-required applications were completed. Safe to run repeatedly.
const PRIORITY = { high: 3, medium: 2, low: 1 };

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function actionFor(program) {
  const status = clean(program.status).toLowerCase();
  const name = clean(program.name) || 'Affiliate partner';
  if (status === 'needs_human') {
    return {
      action: 'human_application',
      priority: 'high',
      title: `Apply to ${name}`,
      reason: 'Partner application requires a human account/terms step.',
      next_step: 'Open the official partner application, complete required identity/terms steps, then record the approval and tracking URL in OzarkRoost.'
    };
  }
  if (status === 'failed') {
    return {
      action: 'retry_review',
      priority: 'medium',
      title: `Review ${name} application failure`,
      reason: 'Previous application attempt failed.',
      next_step: 'Review the recorded failure, correct the issue, and retry only through the partner\'s permitted process.'
    };
  }
  if (status === 'submitted') {
    return {
      action: 'approval_followup',
      priority: 'medium',
      title: `Follow up with ${name}`,
      reason: 'Application is submitted and awaiting a response.',
      next_step: 'Check the partner dashboard/inbox for approval and record the response.'
    };
  }
  if (status === 'disabled') {
    return {
      action: 'disabled_review',
      priority: 'low',
      title: `Review ${name}`,
      reason: 'Partner integration is disabled.',
      next_step: 'Confirm whether the program is still relevant before re-enabling or replacing it.'
    };
  }
  return {
    action: 'partner_research',
    priority: 'medium',
    title: `Research ${name}`,
    reason: 'Opportunity needs verification before use.',
    next_step: 'Verify program terms, approval requirements, allowed traffic, and commission/tracking details from the official source.'
  };
}

function plan(programs = []) {
  return programs
    .map((program) => ({
      program: clean(program.name),
      category: clean(program.category) || 'travel',
      ...actionFor(program)
    }))
    .sort((a, b) => PRIORITY[b.priority] - PRIORITY[a.priority]);
}

module.exports = { plan, actionFor };
