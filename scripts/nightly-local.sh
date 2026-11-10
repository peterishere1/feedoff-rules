#!/usr/bin/env bash
# Nightly selector check from this Mac for platforms that block datacenter IPs (X, Reddit).
# Installed by scripts/install-nightly.sh as a launchd job. Writes rules/report/ and posts a
# macOS notification if a toggle has no live selector or suggested posts and ads get past the
# text-based hides.
#
# launchd fires this when the Mac wakes, often before Wi-Fi is back. A run with no network
# is logged as "skipped (offline)" and never notifies: pages that don't load say nothing
# about the rules.
set -uo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.nvm/versions/node/$(ls "$HOME/.nvm/versions/node" | sort -V | tail -1)/bin:$PATH"
mkdir -p report

# One run at a time: a manual run and the scheduled one would write over each other's log.
LOCK=report/.nightly.lock
if ! mkdir "$LOCK" 2>/dev/null; then
  # A lock older than two hours is left over from a run that was killed.
  if [ -n "$(find "$LOCK" -maxdepth 0 -mmin +120 2>/dev/null)" ]; then rmdir "$LOCK" 2>/dev/null; mkdir "$LOCK" 2>/dev/null || exit 0; else exit 0; fi
fi
trap 'rmdir "$LOCK" 2>/dev/null' EXIT

online() { curl -fsS -o /dev/null --max-time 8 https://feedoff.app/v1/rules.json 2>/dev/null; }
# Wait up to WAIT seconds (default 5 minutes) for the network to come up.
wait_online() {
  local left="${FEEDOFF_NET_WAIT:-300}"
  until online; do
    [ "$left" -le 0 ] && return 1
    sleep 15; left=$((left - 15))
  done
}

if ! wait_online; then
  echo "$(date) skipped (offline)" >> report/local-history.log
  exit 0
fi

for p in instagram youtube x reddit linkedin facebook; do
  f=".state/$p.json"; [ -f "$f" ] && export "FEEDOFF_STATE_$(echo $p | tr a-z A-Z)=$(cat "$f")"
done

run_checks() {
  node scripts/check-selectors.mjs > report/local.log 2>&1 \
    && node scripts/check-text.mjs >> report/local.log 2>&1 \
    && node scripts/check-extension.mjs >> report/local.log 2>&1
}

if run_checks; then
  echo "$(date) ok" >> report/local-history.log
elif ! online; then
  # The network dropped mid-run (lid closed again, Wi-Fi roaming).
  echo "$(date) skipped (network dropped mid-run)" >> report/local-history.log
elif sleep 60 && run_checks; then
  # One retry: a single slow page load shouldn't page anyone.
  echo "$(date) ok (second attempt)" >> report/local-history.log
else
  echo "$(date) FAIL" >> report/local-history.log
  osascript -e 'display notification "A FeedOff filter stopped matching. See rules/report/local.log" with title "FeedOff rules check failed"'
fi
