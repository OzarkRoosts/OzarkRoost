# Symphony integration

OzarkRoost is prepared for OpenAI Symphony-style autonomous implementation runs.

## What is integrated

- Root `WORKFLOW.md` defines the repository-owned agent policy.
- The workflow keeps production on the canonical Render service and `main`.
- Agents are constrained to isolated workspaces and bounded concurrency.
- Production-impacting changes require validation and a review/handoff rather than silently changing production.

## Runtime

Symphony is intentionally kept outside the production web process. The OzarkRoost Render service continues to run `node start.js`.

The current OpenAI Symphony project is an engineering preview and its reference implementation uses a tracker adapter plus Codex app-server. The workflow is therefore version-controlled in this repository, while the Symphony runner itself should run as a separate engineering control-plane process.

## Activation

Configure the Symphony runner with:

- this repository
- the root `WORKFLOW.md`
- a supported issue tracker
- `SYMPHONY_WORKSPACE_ROOT`
- Codex app-server access

Do not put tracker credentials or API keys in `WORKFLOW.md` or Git.

## Safety boundary

Symphony may implement and validate code, but it must not receive production secrets through the repository. Render remains the production deployment authority.
