# Agent 10x Foundation Verification Checklist

- [ ] `node --test test/agent-contracts.test.js test/agent-context.test.js test/agent-action.test.js test/agent-priority.test.js test/agent-orchestrator.test.js`
- [ ] `npm test`
- [ ] Review changed files for accidental production route/template/deployment changes.
- [ ] Confirm no secrets are committed.
- [ ] Confirm the branch is based on current `main` and contains only the foundation plus plans.
- [ ] Open a PR for review before production integration.
