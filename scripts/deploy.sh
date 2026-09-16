#!/bin/bash
# Forced-command dispatcher for the GitHub Actions deploy SSH key.
# Shared by both repos (nextjs-app -> deploy-de, preisgucken-com ->
# deploy-com) — only these two named jobs can run, mirroring the same
# restricted-command pattern as scripts/run_cron.sh. set -e means a failed
# git pull/npm ci/npm run build aborts before the service is ever touched,
# so a broken build never takes down the live site.
set -euo pipefail

# Poll instead of a fixed sleep — a cold `next start` right after a fresh
# build doesn't always bind its port within a flat 2s, which showed up as
# a false-failure ("curl: (7) Failed to connect") on the very first real
# deploy even though the service came up fine a few seconds later.
wait_for_port() {
  local port="$1"
  for _ in $(seq 1 15); do
    if curl -sf "http://localhost:${port}/" > /dev/null; then
      return 0
    fi
    sleep 1
  done
  return 1
}

deploy_de() {
  # Confirmed live 2026-09-15/16: cancelling the GitHub Actions workflow
  # kills the local runner but NOT this remote SSH-invoked process, so a
  # timed-out deploy keeps running orphaned on the server. A second push
  # (or a retry) then starts a THIRD process racing the same .next
  # directory -- this happened repeatedly and twice corrupted the live
  # build (missing BUILD_ID/_error.js -> 500s; then a stale HTML/chunk
  # mismatch -> client-side ChunkLoadError + React #423 on every real
  # browser, iOS and Android both). flock here means any new invocation
  # -- however it was triggered, orphan or fresh -- immediately detects
  # a deploy is already in flight and exits instead of racing it. The
  # lock is tied to this fd and releases automatically when the holding
  # process exits for any reason, including an orphaned kill.
  exec 200>/tmp/deploy-de.lock
  if ! flock -n 200; then
    echo "deploy-de: another deploy is already running (lock held) -- exiting without starting a competing build" >&2
    exit 1
  fi
  cd /var/www/preisgucken-de
  git fetch origin
  git reset --hard origin/main
  npm ci

  # app/kategorie/[slug]/page.jsx queries the DB in generateStaticParams()
  # at build time (wrapped in try/catch -> falls back to zero pages on
  # failure, not a hard build error) — source real secrets first so the
  # build doesn't silently ship with no static category pages.
  ENV_TMP="$(mktemp)"
  sudo cat /etc/preisgucken-de.env > "$ENV_TMP"
  set -a
  source "$ENV_TMP"
  set +a
  rm -f "$ENV_TMP"

  npm run build
  sudo systemctl restart preisgucken-de.service
  wait_for_port 3000
  echo "deploy-de: OK ($(git rev-parse --short HEAD))"
}

deploy_com() {
  # Same lock as deploy_de -- see its comment for why. Separate lockfile
  # so a .de deploy and a .com deploy never block each other, only two
  # attempts at the same site.
  exec 201>/tmp/deploy-com.lock
  if ! flock -n 201; then
    echo "deploy-com: another deploy is already running (lock held) -- exiting without starting a competing build" >&2
    exit 1
  fi
  cd /var/www/preisgucken-com
  git fetch origin
  git reset --hard origin/main
  npm ci
  # No DB access needed at build time for this site (pure static content +
  # runtime API proxies to preisgucken.de) — confirmed by a clean build
  # with no env sourced.
  npm run build
  sudo systemctl restart preisgucken-com.service
  wait_for_port 3001
  echo "deploy-com: OK ($(git rev-parse --short HEAD))"
}

case "${SSH_ORIGINAL_COMMAND:-}" in
  deploy-de)
    deploy_de
    ;;
  deploy-com)
    deploy_com
    ;;
  *)
    echo "Rejected: unknown job '${SSH_ORIGINAL_COMMAND:-<empty>}'" >&2
    exit 1
    ;;
esac
