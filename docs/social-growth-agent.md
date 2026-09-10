# OzarkRoost Social Growth Agent

The production path is GitHub `main` -> Render. The agent is disabled until explicitly enabled in Render environment variables.

## Platforms

- **X:** configure `X_ACCESS_TOKEN` and `X_USER_ID` using an authorized X API user context.
- **Facebook:** configure `FACEBOOK_PAGE_ACCESS_TOKEN` and `FACEBOOK_PAGE_ID` using an authorized Meta Page context.
- **TikTok:** configure `TIKTOK_ACCESS_TOKEN` and set `TIKTOK_SOCIAL_ENABLED=true` only after the TikTok Content Posting API app and required scope have been approved and the OzarkRoost account has authorized it.

## Safety

The agent will not buy ads, buy followers, send bulk DMs, change account security, or claim a publish succeeded when a provider is unavailable. Every queued job and publish attempt is recorded in Postgres.

## Launch order

1. Add provider credentials in Render environment variables; never commit them.
2. Verify `/api/social-growth/status` with the existing operations API key.
3. Queue one test post per authorized platform.
4. Confirm the external post ID and audit record.
5. Enable `SOCIAL_GROWTH_ENABLED=true` only after the manual tests pass.
6. For TikTok, public direct posting remains subject to TikTok's current Content Posting API approval/audit requirements.

## Emergency stop

Set `SOCIAL_GROWTH_ENABLED=false`. TikTok also has its own `TIKTOK_SOCIAL_ENABLED` gate.
