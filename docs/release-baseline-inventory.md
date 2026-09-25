# Release baseline inventory — 2026-09-25

## Scope and counting

Before repository-governance files were added, compact `git status` reported
289 entries: 126 modified, 30 deleted and 133 untracked entries. Git collapses
some untracked directories in that view. Expanding every untracked file with
`--untracked-files=all` produced 356 individual paths: 126 modified, 30 deleted
and 200 untracked.

Run `npm run baseline:inventory` to print the current status and classification
for every individual path. The classifier covers active source, tests,
documentation, deployment files, generated/runtime data and sensitive/local
files; no path is left unclassified.

## Original worktree classification

| Area | Expanded paths | Classification of the existing work |
| --- | ---: | --- |
| React frontend | 282 | Auth redesign; onboarding/deployment fixes; merchant product/image flows; shared storefront contract; hosted storefront app; full Template 1 and Template 2 replacements and tests; Vite/environment tooling |
| Core API | 37 | Production image; hosted subdomains and publishing; Cloudinary upload service; storefront owner/content fields; refresh-token grace; deployment service replacement; migrations, seeds and security/integration tests |
| Commerce API | 16 | Production image; hosted storefront/cart API mounts; product/category niche validation; store catalog support; seed/email changes and security tests |
| Deployment | 15 | Local Compose changes; VPS and Mekhla compose/tunnel/nginx files; runtime-config injection; deployment documentation |
| Marketplace | 4 | Docker development image; unified routes/auth links; footer and Rentify service integration |
| Documentation | 2 | Current architecture and investigation notes |
| Admin | 0 | No pre-existing local source changes; the committed Admin application was included in the web production image |

No dependency directory, build output, database, Redis dump, runtime `.env`,
private key or Cloudflare tunnel credential was present in the expanded change
set. Runtime VPS files are ignored by both root and deployment-specific ignore
rules.

## Files used by the current deployment

The VPS repository mirror at `~/apps/rentify` matches sampled local files byte
for byte across Core, Commerce, Auth, Merchant, Marketplace, Admin and the VPS
compose/web configuration. The running images inspected during this baseline
were:

| Image | Image digest | Created (Asia/Phnom_Penh) |
| --- | --- | --- |
| `rentify-core:production` | `sha256:8e4fd6c7d3648ce6bd2b15a543ae5ccae694e51b5a743505e5396ca727f1280e` | 2026-09-25 19:32:55 |
| `rentify-commerce:production` | `sha256:14e7c559cccf05234a22ab95051f28c9e6ef7459229a3ce3db992462b0e2192d` | 2026-09-25 19:32:57 |
| `rentify-web:production` | `sha256:ba7b01e3982c8bbc80e2b1a46ed9e9edf3667c6c6b6ab1aa1bb69f699c6b326c` | 2026-09-25 19:34:26 |

The Core image used the complete local `rentify-server/` build context. The
Commerce image used the complete local `ecommerce-server/` context. The web
image used the repository root and built Marketing, Auth and Merchant from
`rentify-frontend`, plus Marketplace and Admin. Therefore the modified and
untracked source in those paths was part of the corresponding build input.

Published stores are separate: `apps/storefront` and the template/shared
libraries are built and deployed as the `rentify-storefront` Cloudflare Worker.
They are not copied into `rentify-web:production`.

The current images have no source Git-SHA label. The matching mirror, sampled
hashes and build timestamps identify the inputs operationally, but cannot prove
an immutable commit because the build came from a dirty worktree. Future images
must carry the Git SHA and refuse release builds from an unrecorded worktree.

## Generated and local-only classification

The following classes must stay unstaged and are enforced by `.gitignore` and
repository policy:

- `node_modules/`, `dist/`, `coverage/`, `.nx/`, `.angular/`, `output/`
- logs, PID files, SQLite/local databases and Redis dumps
- `.env*` except value-free examples
- `secrets.env`, Cloudflare `credentials.json`, private keys and certificates
- VPS runtime credentials and customer/production exports

## Baseline verification result

`npm run verify` passes from the repository root on the inspected worktree. It
runs repository policy and secret checks, migration structure checks, both API
test suites, React lint/typecheck/tests and six production builds, Marketplace
lint/typecheck/46 tests/build, and Admin lint/typecheck/32 tests/build.

The React workspace still has 386 legacy lint warnings. Blocking lint checks
errors only, while `npm --prefix rentify-frontend run lint:report` exposes and
fails on the warning backlog. Nx's module-boundary rule is not used by that
blocking lint command because the current source-only storefront aliases make
the rule crash or report hundreds of false project-boundary failures. The
dedicated `check:storefront-boundary` command remains blocking. Converting all
source-only libraries into valid Nx projects should be a separate reviewed
architecture change.

The deployed smoke journey is skipped unless `STOREFRONT_SMOKE_URL` points to
an explicit local or test stack; CI never guesses or uses production
credentials. Marketplace dependency audit currently reports existing
moderate/high findings. Root dependency review blocks newly introduced high
severity dependencies on pull requests, but the existing backlog still needs a
reviewed upgrade plan rather than `npm audit fix --force`.

## Proposed commit sequence — approval required

No files have been staged. Before committing, review and approve this sequence:

1. **`chore(repo): establish unified release governance`** — root package
   commands, policy tools, root Actions, CODEOWNERS, ownership/contribution
   docs, ignore rules and removal of ineffective nested workflows.
2. **`feat(platform): establish hosted-store identity and publishing`** — Core
   subdomains, Website fields/content, owner authorization, deployment service,
   migration and related tests.
3. **`feat(media): make product image uploads production-safe`** — Cloudinary
   upload service, multer/controller changes, Merchant image workflow and API
   client changes.
4. **`feat(storefront): replace templates with the shared hosted contract`** —
   shared storefront library, hosted storefront app, Template 1 and Template 2
   replacements, tests and boundary tooling.
5. **`feat(commerce): align catalog and checkout with hosted storefronts`** —
   Commerce product/category/niche handling, cart/checkout mounts, store origin
   support, seeds and security tests.
6. **`feat(identity): unify auth journeys and refresh-token recovery`** — Auth
   UI/hooks/i18n, Core auth/session grace and matching tests.
7. **`feat(marketplace): align routes and demo catalog with Rentify`** —
   Marketplace route/service/footer changes plus coordinated Store/catalog seed
   data.
8. **`chore(deploy): add reproducible local and VPS containers`** — compose,
   Dockerfiles, nginx/runtime configuration, tunnel templates and deployment
   documentation. Add Git-SHA image labels before this commit is released.
9. **`docs(platform): record the deployed architecture and open gates`** —
   architecture, notes and this baseline inventory.

Some paths contain multiple concerns. Use patch-level staging only after the
sequence is approved, and run the relevant service verification after each
candidate commit. If splitting a file would create a non-building intermediate
commit, keep the dependent pieces together and record the reason in the commit
message.
