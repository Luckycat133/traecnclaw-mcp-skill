# Homebrew compatibility transition

The private `Luckycat133/TRAECNclaw` repository remains the development source.
The target public distribution repository is `Luckycat133/traecnclaw-mcp-skill`.
The original `Luckycat133/homebrew-tap` stays available during this transition:
there are still three physical repositories until a separate retirement decision.

This batch adds the **existing, public 0.6.0 Formula**, copied byte-for-byte from
[the old tap at c168cbc4](https://github.com/Luckycat133/homebrew-tap/blob/c168cbc4c00e92f09ac54be8bb7aea06bf6d2a46/Formula/traecnclaw.rb).
It uses the existing
[0.6.0 tarball](https://github.com/Luckycat133/traecnclaw-mcp-skill/releases/download/v0.6.0/traecnclaw-0.6.0.tgz),
SHA-256 `ae7c2a9170e4525bb2b0bab8f9009c8a19ce7b68ff298bbceccc9e6fbbeb9f33`.
This is a repository migration preparation, not a new runtime release or a
claim that macOS migration testing has passed.

## Before switching

Wait until this Formula is published and migration has been tested on the
relevant macOS/Homebrew version, including the first `brew update` after moving
between repositories with different Git histories. The commands here have not
been run against a real Homebrew installation. Review the formula, retain the original tap,
and record the current remote and installed version:

```sh
brew tap-info Luckycat133/tap
brew list --versions traecnclaw
git -C "$(brew --repo Luckycat133/tap)" remote get-url origin
```

If the tap is not installed, use the new-install instructions below. If its
remote differs from both repositories documented here, stop and review that
custom setup rather than overwriting it blindly.

## Existing installation: keep the tap name

After those checks, change only the tap's remote:

```sh
brew tap --custom-remote Luckycat133/tap https://github.com/Luckycat133/traecnclaw-mcp-skill.git
brew tap-info Luckycat133/tap
git -C "$(brew --repo Luckycat133/tap)" remote get-url origin
brew info Luckycat133/tap/traecnclaw
```

Confirm the remote is the public distribution repository and the formula still
reports 0.6.0. This does not reinstall or upgrade an existing package. A later
runtime upgrade is a separate step, after its release and migration checks pass.
Do not uninstall the package, remove the tap, delete old kegs, overwrite host
configuration or restart services merely to change the repository remote.

## New installation

Register the explicit remote first, then install:

```sh
brew tap --custom-remote Luckycat133/tap https://github.com/Luckycat133/traecnclaw-mcp-skill.git
brew info Luckycat133/tap/traecnclaw
brew install Luckycat133/tap/traecnclaw
```

For a Brewfile, retain the explicit URL:

```ruby
tap "Luckycat133/tap", "https://github.com/Luckycat133/traecnclaw-mcp-skill.git"
brew "Luckycat133/tap/traecnclaw"
```

A plain install without registering that remote uses Homebrew's default
`Luckycat133/homebrew-tap` lookup. If Homebrew asks you to trust a formula,
review and approve that individual formula as needed for your installed version.
Do not grant whole-tap trust just to silence a prompt.

## Compatibility and acceptance checks

The npm identity stays `@luckycat133/traecnclaw`. The Skill stays at
`.codex/skills/traecnclaw-mcp`. Its bytes, `SOURCE_REVISION`, current manifest,
historical tags and release downloads are unchanged by this batch.
User configuration, task history and logs are not migration targets.

0.6.0 has a known limitation when an independently installed Skill discovers a
Homebrew shell wrapper as though it were a JavaScript module. Moving the tap
does not fix that launcher path. Prefer reviewing the installed CLI's
`traecnclaw setup-mcp` output, and validate it in the chosen MCP host before
relying on the migration. Do not claim the independent Skill/Homebrew path is
fixed until a separately reviewed runtime/Skill release passes that test.

Remaining macOS acceptance includes clean installation and an existing 0.6.0
installation, stable executable/service paths, retained configuration/logs,
20-tool stdio handshake, independent Skill discovery and host reconnection.
Those checks require a separately authorized Mac. The offline checks below do
not start TRAECNclaw, TraeCN or a service, or install dependencies.

## Offline public-byte validation

With Node.js 22 or newer:

```sh
node scripts/verify-public-distribution.js
node --test scripts/verify-public-distribution.test.js
```

The transition baseline records the already-public bytes, the copied Formula
and the disabled legacy sync workflow. The validator rejects missing/unlisted
files, symlinks, archives, executable/special-mode drift,
source/version/scope drift and changes to pinned files. Error-path tests use
synthetic fixtures. This guard does not authenticate arbitrary edits to itself
or its baseline; review both alongside a complete, pinned release export.

The old `sync-canonical.yml` now rejects every legacy dispatch before checking
out any source, reading a private repository or pushing anything publicly.
It has no token permissions and never copies files. Previously it could push a
public branch before PR validation; a later failed check could not undo that
disclosure. The offline guard validates a snapshot, not an already-performed
publication, and cannot replace a pre-publication gate.

Future release promotion requires a separately reviewed publisher with fixed
input provenance, an explicit file allowlist and checks before any public
write. Review the complete public export, `scripts/public-release-baseline.json`,
`scripts/verify-public-distribution.js` and its test file together: changing
only the baseline is insufficient because script/test assertions deliberately
freeze 0.6.0. Do not re-enable the legacy copy-and-push workflow or export a
private working directory wholesale.

## Rollback of the remote

While the old tap remains available:

```sh
brew tap --custom-remote Luckycat133/tap https://github.com/Luckycat133/homebrew-tap.git
brew tap-info Luckycat133/tap
git -C "$(brew --repo Luckycat133/tap)" remote get-url origin
brew info Luckycat133/tap/traecnclaw
```

This restores only the formula source. It does not downgrade a runtime or undo
user-data changes. Preserve published assets; never rewrite a release tag or
replace an existing asset with different bytes. Retiring the old tap requires
a separate decision after migration acceptance.

References: [Homebrew taps](https://docs.brew.sh/Taps),
[`brew tap --custom-remote`](https://docs.brew.sh/Manpage#tap-options-userrepo-url),
[Brewfile syntax](https://docs.brew.sh/Brew-Bundle-and-Brewfile).
