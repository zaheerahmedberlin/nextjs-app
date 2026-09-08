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
