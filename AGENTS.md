# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Shared agent workflow

`AGENTS.md` contains the rules shared by every coding agent. `CLAUDE.md` keeps the product
architecture, invariants, and Claude-specific delegation notes; it imports this file first.

# Working with the agent (Claude Code best practices)

Source: https://code.claude.com/docs/en/best-practices. These are the rules #219 broke.

- **Shipped tools before custom code.** Use the installed plugins, MCP servers and skills
  (`unity@claude-plugins-official` and the `unity` MCP, the `meshy` MCP,
  `blender-image-to-3d`, `grrind-character-art`) before writing a client, builder or capture
  script. Check `claude mcp list` and the skill list first; write code only for a real gap.
- **Every task carries a check the agent can run** and the evidence it produced: test output,
  build exit code, or a screenshot compared side by side with the reference at the size the
  player sees. Measure proportions and dimensions; do not judge them by eye.
- **Explore, then plan, then code** when the approach is uncertain or several files change;
  for larger features, interview the author (AskUserQuestion) and write the spec first. If the
  diff fits in one sentence, just do it.
- **Course-correct early.** After two failed corrections of the same thing, stop, state what
  was learned, and restart from a sharper prompt instead of stacking fixes.
- **Keep instruction files short.** Domain workflows live in skills, loaded on demand; a line in
  this file or `CLAUDE.md` stays only if removing it would cause a mistake.

# Proportionate validation and iOS development

Choose checks from the changed behavior; generic skill checklists do not justify additional
builds, repeated E2E runs, or speculative tests.

- JS/TS, styles, hooks, API integration, navigation, providers and Maestro YAML use Metro.
  Never rebuild native iOS for these changes. Reuse the installed development build.
- Native modules/dependencies, config plugins, entitlements, icons/fonts embedded by plugins
  and HealthKit capabilities require a development rebuild of the affected variant only.
- The real iPhone (`npm run ios`, Metro 8081) and the dedicated "GRRIND E2E" Simulator
  (`npm run e2e:ios:dev`, Metro 8082, `EXPO_PUBLIC_E2E=1`) run the same GRRIND dev binary
  (`app.grrind.dev`); E2E behaviour lives in the JS bundle only. Switching devices does not
  regenerate `ios/`. Never reintroduce a separate native E2E variant.
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
`artifacts/e2e/`: the latest session and reset only, with each log capped at 4 MiB after a run;
`.keep` pins an exceptional proof.
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
