# Specialist Adapter Rollout

## Goal
Connect the 10x execution runtime to real OzarkRoost specialist handlers without inventing unavailable capabilities.

## Rules
- Build adapters only when the handler and method are actually available.
- Every adapter returns verification evidence identifying the handler used.
- Realized revenue defaults to zero unless the handler explicitly returns verified realized revenue.
- Missing providers, credentials, consent, or handlers remain blocked/unavailable.
- No adapter performs a side effect that the underlying handler does not already permit.

## Current mappings
- Affiliate AI -> opportunity scanner
- Affiliate Executor -> application cycle
- Affiliate Ops -> affiliate scan
- Autonomous Sales -> response workflow
- Marketing/SEO, OpsBot, and Rover are exposed only after their concrete handler contracts are verified.

## Verification
Tests cover adapter creation, evidence requirements, revenue separation, and fail-closed behavior.
