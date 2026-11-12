# Security remediation — 12 November 2026

Scope: the eight findings in the audit of commit `7a40f65`. No backend, login or database was added. No deployment or production data was modified.

## Finding status

| Finding | Status | Change and evidence |
| --- | --- | --- |
| F1: test-server traversal | Fixed in the tested revision | `scripts/serve-dist.mjs` confines both resolved and real paths to its document root, including symlinks/junctions and backslash paths. Its CLI binds `127.0.0.1`. HTTP regression tests reject encoded/literal traversal and a junction outside the root. |
| F2: malformed test-server URL | Fixed in the tested revision | URI decoding failures and NUL paths return 400; missing files return 404; filesystem exceptions return generic errors. Each malformed-request test requests the valid home page afterwards to establish continued availability. |
| F3: malicious deep links | Fixed in the tested revision | The router catches decoding errors and falls back to Home. Exercise lookup requires an own property. Unit tests cover invalid UTF-8/percent encodings; browser tests cover malformed URLs, inherited keys and an encoded HTML payload, then navigate normally. |
| F4: invalid saved state | Fixed in the tested revision | Storage validates every field, calendar date, workout identifier, exercise index and set range. Invalid records are discarded individually while valid legacy history and progress survive. Fresh defaults prevent shared-array mutation. Inaccessible/full storage retains state in memory. Tests include malformed JSON, old shapes, invalid dates/progress, valid history preservation and quota failures. |
| F5: vulnerable dependencies | Partially fixed | The Workbox dependency graph now uses an exact `glob` 14.0.6 override and patched `minimatch` 11.0.8. The PWA plugin remains 2.0.0. Lockfile/API regression checks and PWA tests verify compatibility. `deepmerge` 4.3.1 remains: no published patch exists. Four low audit nodes represent this one remaining advisory and its dependency propagation. Production-only audit reports zero. |
| F6: workflow privileges/pinning | Fixed in repository configuration; live controls unverified | Build/test defaults are `contents: read`; only the isolated deploy job receives `pages: write` and `id-token: write`. Checkout does not persist credentials. All invoked actions use full SHAs; Dependabot tracks updates. YAML regression tests enforce these constraints. Actual GitHub runs, environment protections and token/OIDC policies were not changed or verified. |
| F7: local activity privacy | Partially fixed: controls implemented; browser trust boundary remains | Settings explains shared-profile/same-origin access and adds Session only. Opt-out removes persistent history/progress/exercise preference while retaining current activity in memory. Appearance and the privacy choice remain stored. A persistence failure is reported. Tests verify disk removal, uninterrupted current progress, re-enable behaviour, quota handling and opt-out after reload. Remember activity remains the default for existing users so their records are not silently erased. |
| F8: browser policies/headers | Partially fixed | Early HTML meta CSP restricts scripts, workers, network and assets to this origin; disables objects, base URLs, forms and child frames. Referrer meta is `no-referrer`. Browser tests establish that inline script is blocked while the workout still starts. Direct GitHub Pages response-only protections and live HTTPS settings remain unverified. |

## Dependency decision

The original audit identified three underlying advisories:

- [glob cancellation bypass](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4): the installed graph now uses 14.0.6, beyond the affected range.
- [minimatch pattern amplification](https://github.com/advisories/GHSA-g3hv-75wg-m249): Workbox now resolves 11.0.8. An unrelated minimatch 5.1.9 dependency is outside this advisory's affected range.
- [deepmerge prototype poisoning](https://github.com/advisories/GHSA-gcqx-w48m-w2h4): no patched version is published. It remains in build tooling through Rollup's node-resolve plugin. The reviewed installed plugin calls `deepMerge({}, defaults)` on its own static defaults; no application-controlled runtime input reaches that call. This reduces demonstrated exploitability, but does not fix the package. Reassess after dependency updates or introducing build input/plugins. Do not process untrusted build configuration.

Do not use `npm audit fix --force` blindly: its suggested PWA-plugin downgrade is a breaking change and loses the existing update configuration. CI runs `npm audit --audit-level=moderate`; it prints the remaining low advisory and blocks moderate-or-higher advisories. This threshold is not a declaration that low findings are harmless. Dependabot and regular audit review remain necessary.

The lockfile was regenerated for the overridden Workbox subtree and verified by a clean `npm ci --ignore-scripts`. No third-party source was patched or vendored.

## GitHub Actions review

Pinned upstream release refs were resolved with `git ls-remote`; their `action.yml` entry points were inspected:

| Action | Reviewed release | SHA |
| --- | --- | --- |
| checkout | v4.3.1 | `34e114876b0b11c390a56381ad16ebd13914f8d5` |
| setup-node | v4.4.0 | `49933ea5288caeca8642d1e84afbd3f7d6820020` |
| upload-artifact | v4.6.2 | `ea165f8d65b6e75b540449e92b4886f43607fa02` |
| deploy-pages | v4.0.5 | `d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e` |

The official upload-pages-artifact v3.0.1 composite calls mutable `actions/upload-artifact@v4` internally. The workflow instead uses the same documented Pages tar layout followed by a directly pinned upload-artifact step. The deploy job does not check out or execute project code. Release-entry-point inspection is not a full audit of bundled upstream JavaScript. Hosted deployment and archive acceptance still require an actual GitHub run.

## Hosting protections and limitations

Current hosting is direct GitHub Pages, as defined by `.github/workflows/deploy.yml`.

| Protection | Current implementation / platform action |
| --- | --- |
| CSP | Early meta policy works in the HTML document and its offline cached copy. `script-src 'self'` disallows inline script/eval. `worker-src 'self'` preserves the PWA worker. |
| Styles | `style-src 'self' 'unsafe-inline'` preserves the existing inline style attributes and dynamic workout styling. This exception does not allow inline scripts. Removing it requires a separate CSS refactor. |
| Referrer policy | `<meta name="referrer" content="no-referrer">` is included. |
| HTTPS | GitHub Pages provides HTTPS; enable **Enforce HTTPS** in repository Pages settings, especially for a custom domain. This repository change cannot establish that the live setting is enabled. |
| Framing | `frame-src 'none'` prevents this page embedding other frames; it does **not** prevent this page being embedded. `frame-ancestors 'none'` or `X-Frame-Options: DENY` requires a response header. A meta CSP cannot enforce frame-ancestors. |
| Other response policies | Direct Pages does not offer a repository-defined arbitrary response-header configuration. `_headers`, `.htaccess` or a workflow environment variable will not supply CSP headers, Permissions-Policy, X-Content-Type-Options or HSTS on Pages. A header-capable static host or trusted proxy is needed for custom values. No hosting migration was performed. |
| Origin isolation | GitHub project-site paths on one origin do not isolate localStorage. A dedicated origin is required if sibling projects have a different trust level. An app-local encryption key or cosmetic PIN would not provide that isolation. |

For a future header-capable host, serve the current CSP as a header and add `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` and a narrowly scoped Permissions-Policy. Configure HSTS only after verifying HTTPS for the intended domain/subdomains. Do not add fake meta HTTP headers or claim they protect the live deployment.

References: [GitHub Pages HTTPS](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https), [CSP and meta limitations](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy), [official Pages artifact action](https://github.com/actions/upload-pages-artifact/blob/v3.0.1/action.yml).

## Privacy behaviour

Remember activity preserves existing history/progress and the existing 60-workout/120-walk entry limits; no automatic age-based deletion was introduced. Session only is explicit opt-out: activity remains available to the open page, but closes/reloads (including an app update) end that in-memory session. Re-enabling persistence saves that page's current state. Clear history remains available and leaves appearance/exercise preferences alone. Browser clear-site-data removes all preferences and may also remove offline caches.

These controls reduce retention. They cannot stop someone already using the unlocked browser profile, browser extensions with permission, or malicious same-origin JavaScript from accessing a currently open page. The app sends no workout data to an application backend; the hosting provider still receives ordinary web requests.

## Verification

Regression suites: `npm test`, `npm run test:security`, `npm run test:e2e`, `npm run test:update`; plus `npm run typecheck`, production builds and dependency audits.

Final checks passed against an isolated snapshot of audited commit `7a40f65` plus these security changes and the final dependency graph:

- Type check passed; unit tests: **49 passed, 1 existing skip**.
- Security tests: **17 passed**, including actual loopback HTTP requests and symlink/junction confinement.
- Browser suite: **67 passed, 2 intentional skips** (the installability test runs once on desktop Chromium). Coverage includes mobile-sized light/dark views, workout completion/rest/resume, navigation, preference persistence and the new adversarial cases.
- PWA update test: **1 passed**. A resumed Home applies a simulated deploy, a workout rest timer is not interrupted, leaving applies the update and retains progress.
- Production builds passed for `/` and the GitHub Pages-style `/gym-app/` base path. An additional finite Chromium check at `/gym-app/` verified manifest scope/start URL, zero CDP installability errors, worker control, offline reload and resuming at set 2 of the workout.
- Clean `npm ci --ignore-scripts` succeeded. Audit reports **0 moderate/high/critical**, **4 low affected nodes for the remaining deepmerge advisory**; production-only audit reports **0**. The moderate audit threshold passes.
- `git diff --check` passed.

Shared-workspace limitation: a separate, user-requested workout redesign began while these fixes were being validated. Its animation changes temporarily failed the live type check. They were left untouched; the security changes were copied into an isolated worktree for reproducible final checks, using the same installed dependency graph. The redesign owner was notified to preserve the security controls and migrate their tests when changing the state model and UI. The numbers above do not certify that evolving combined feature branch. Re-run all checks after that integration before deployment.

The live workspace type check was rerun at the end and passed after the concurrent animation changes settled; full integration testing of the separate redesign remains outstanding.

No production URL was probed, no GitHub workflow was triggered, and no live hosting settings were changed. Actual installed-device behaviour, response headers, repository/environment protections and hosted Pages archive/deployment acceptance remain unverified. Local CDP installability and offline tests are evidence of browser behaviour, not a completed installation on a physical phone. This report does not declare the application secure.
