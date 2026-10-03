# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Shared agent workflow

`AGENTS.md` contains the rules shared by every coding agent. `CLAUDE.md` keeps the product
architecture, invariants, and Claude-specific delegation notes; it imports this file first.

Before changing the mobile UI or a user flow:

- prepare or reuse the Metro-backed iOS environment with `npm run e2e:ios:dev`;
- run the relevant flow with `npm run e2e:ios:flow` before and after each UI iteration;
- inspect the screenshots generated in `artifacts/e2e/`;
- fix detected issues and rerun the flow before considering the iteration complete.

Never run `npm run e2e:ios:full` autonomously. The full Release validation is optional and starts
only when the user explicitly asks for that exact validation, including for significant mobile
tickets and native changes. A request to implement, validate, finish, push, or open a PR is not
authorization to run it.

Do not rebuild the native iOS app for JS/TS-only changes. React Native UI, styles, hooks,
JS-side navigation, API integration, mocks/providers and Maestro YAML all use the Metro-backed
development loop. Native modules, native dependencies, config plugins, entitlements and
HealthKit capabilities require the development build to be rebuilt; they still do not authorize
an autonomous full Release validation.

The full procedure — prerequisites, fast vs full modes, state reset, rebuild matrix, health
scenarios, and how to read a failure — is in [`docs/ai/mobile-qa.md`](docs/ai/mobile-qa.md). Read
it before running the harness for the first time; it is written for an agent that knows nothing
of this machine.

The E2E workflow may use the running local `grrind-back`, but it must never reset its database,
run its migrations, or modify that repository unless the user explicitly asks for it.

# Workflow: scope, build, ship

There are no architect/developer roles and no delegated implementation agent. The agent in the
conversation scopes the ticket with the user, implements it, runs the gates, opens the PR, merges
it to `main` itself (`gh pr merge <N> --merge --delete-branch`) and, when the scoping says so,
ships it with EAS (`eas build --profile production` then `eas submit --profile production`; the
EAS quota is about ten builds a month, so `main` is the default destination). No cross-review and
no re-asking for approval. Spawn sub-agents only when the user asks for them.
