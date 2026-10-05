# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Shared agent workflow

`AGENTS.md` contains the rules shared by every coding agent. `CLAUDE.md` keeps the product
architecture, invariants, and Claude-specific delegation notes; it imports this file first.

# Proportionate validation and iOS development

Choose checks from the changed behavior; generic skill checklists do not justify additional
builds, repeated E2E runs, or speculative tests.

- JS/TS, styles, hooks, API integration, navigation, providers and Maestro YAML use Metro.
  Never rebuild native iOS for these changes. Reuse the installed development build.
- Native modules/dependencies, config plugins, entitlements, icons/fonts embedded by plugins
  and HealthKit capabilities require a development rebuild of the affected variant only.
- `npm run ios` prepares the development variant before building. GRRIND dev (real iPhone)
  and GRRIND E2E (dedicated Simulator) have separate sessions and health providers. They share
  the generated `ios/` directory: never compile its current workspace under another variant.
- For mobile UI/user-flow changes, reuse `npm run e2e:ios:dev`, choose one relevant existing
  flow, then run `npm run e2e:ios:flow -- .maestro/<flow>.yaml` after a coherent change and
  inspect its screenshots. Existing captures can supply the baseline; run a baseline only
  when needed to reproduce a bug or when no useful reference exists.
- Keep the Metro bundle stable while Maestro runs; even a comment edit can reset module state
  through Fast Refresh. Finish source edits before starting the verification.
- Rerun only after a change, a failure being diagnosed, or an unresolved concern. Do not run
  the smoke plus several overlapping flows as reassurance. The short smoke is for shared
  navigation/integration; health-sync, combat-real, inventory and guild flows are targeted.
- Typecheck, lint and unit tests run once on the final code before push; use focused checks
  while editing. `previews:check` is required when rendered components/tokens/previews change;
  `api:check` only when the API contract changes; `test:ios:tools` when the iOS harness changes.
  Documentation-only changes need no Simulator, build or full application test suite.
- Test real implementation and observable behavior. Fake native storage/HTTP at boundaries;
  never copy production branches into tests, freeze SVG counts or add tests for trivial constants.
  Preserve authentication, idempotency, data-loss, server-value and accessibility coverage.

The local `e2e:ios:full`, its legacy alias and clean Release harness are retired. Never recreate
or substitute that expensive cycle autonomously. Production builds/EAS are for an explicitly
scoped release, followed by checks of the actual candidate on a real iPhone/TestFlight; they are
not a requirement for each ticket or native development change. Never erase the Simulator as a
routine check, or clean DerivedData, DeviceSupport, Pods or pairing data to save report space.

Read [`docs/ai/mobile-qa.md`](docs/ai/mobile-qa.md) before using the harness. Reports are kept in
`artifacts/e2e/`: five recent sessions and one reset session; `.keep` pins an exceptional proof.
`npm run e2e:ios:clean` prunes reports only, preserving `artifacts/e2e/dev` and Xcode caches.
Do not store permanent proofs by retaining entire noisy histories. Stop the E2E Metro terminal
and shut down its Simulator when finished with them; preserve the Metro used on the user's phone.

The E2E workflow may use the running local `grrind-back`, but it must never reset its database,
run its migrations, or modify that repository unless the user explicitly asks for it. It creates
one disposable account for normal authenticated flows, two only for the health-sync scenarios;
standalone presentation flows use `E2E_OFFLINE=1` and create none.

# Workflow: scope, build, ship

There are no architect/developer roles and no delegated implementation agent. The agent in the
conversation scopes the ticket with the user, implements it, runs the gates, opens the PR, merges
it to `main` itself (`gh pr merge <N> --merge --delete-branch`) and, when the scoping says so,
ships it with EAS (`eas build --profile production` then `eas submit --profile production`; the
EAS quota is about ten builds a month, so `main` is the default destination). No cross-review and
no re-asking for approval. Spawn sub-agents only when the user asks for them.
