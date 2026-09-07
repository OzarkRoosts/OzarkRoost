# Action engine verification

- Start application with outbound email credentials configured.
- Confirm startup logs show `[AggressiveOutreach] execution loop started`.
- Query `/api/actions/status` and verify cycle/queue counters change.
- Queue only a consent-appropriate prospect action and verify provider message ID is recorded before status becomes completed.
- Verify failures remain visible and are retried rather than reported as success.
- Verify suppressed recipients are rejected.
- Verify phone metrics remain zero until a real telephony provider is integrated.
