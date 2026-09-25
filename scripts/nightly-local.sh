#!/usr/bin/env bash
# Nightly selector check from this Mac for platforms that block datacenter IPs (X, Reddit).
# Installed by scripts/install-nightly.sh as a launchd job. Writes rules/report/ and posts a
# macOS notification if a toggle has no live selector.
set -uo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.nvm/versions/node/$(ls "$HOME/.nvm/versions/node" | sort -V | tail -1)/bin:$PATH"
mkdir -p report
for p in instagram youtube x reddit linkedin; do
  f=".state/$p.json"; [ -f "$f" ] && export "FEEDOFF_STATE_$(echo $p | tr a-z A-Z)=$(cat "$f")"
done
if node scripts/check-selectors.mjs > report/local.log 2>&1; then
  echo "$(date) ok" >> report/local-history.log
else
  echo "$(date) FAIL" >> report/local-history.log
  osascript -e 'display notification "A FeedOff filter toggle has no live selector. See rules/report/local.log" with title "FeedOff rules check failed"'
fi
