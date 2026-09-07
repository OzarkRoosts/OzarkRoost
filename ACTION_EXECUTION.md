# Action Execution

Ozark Roost agents now distinguish discovery from execution.

## Execution contract

1. Discovery creates an actionable queue item.
2. The execution runner claims queued work.
3. Provider/database evidence is required before an action is marked completed.
4. Transient failures are retried; repeated failures become failed and visible.
5. Suppressed recipients are never contacted.
6. Phone calls are not represented as completed unless a real telephony provider returns a call ID.

## Outreach

`OUTREACH_AUTOMATION_ENABLED=false` disables the runner. Otherwise the startup hook runs the queue immediately and every five minutes by default (`OUTREACH_INTERVAL_MS` can override this).

The monitor/API should report discovered, queued, attempted, completed, failed, and blocked actions separately. Opportunity value is never revenue.
