# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Shared agent workflow

`AGENTS.md` contains the rules shared by every coding agent. `CLAUDE.md` keeps the product
architecture, invariants, and Claude-specific delegation notes; it imports this file first.

Before changing the mobile UI or a user flow:

- run the relevant iOS E2E flow with `npm run test:e2e:ios`;
- inspect the screenshots generated in `artifacts/e2e/`;
- fix detected issues and rerun the complete flow before considering the ticket complete.

The full procedure — prerequisites, health scenarios, the fast `E2E_SKIP_BUILD=1` loop, and how
to read a failure — is in [`docs/ai/mobile-qa.md`](docs/ai/mobile-qa.md). Read it before running
the harness for the first time; it is written for an agent that knows nothing of this machine.

The E2E workflow may use the running local `grrind-back`, but it must never reset its database,
run its migrations, or modify that repository unless the user explicitly asks for it.
