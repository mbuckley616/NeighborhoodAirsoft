#!/usr/bin/env bash
# Cloud sessions (claude.ai/code, the phone app) start from a fresh checkout: install
# Playwright and its Chromium so `npm test` runs. Does nothing on a local machine.
# If the Chromium download is blocked by the environment's network policy, the tests fall back
# to the Chromium the cloud container ships at /opt/pw-browsers/chromium (see tests/lib/game.mjs).
[ "$CLAUDE_CODE_REMOTE" = "true" ] || exit 0
cd "$CLAUDE_PROJECT_DIR" || exit 0
if ! npm install --no-audit --no-fund --ignore-scripts >/tmp/cloud-setup.log 2>&1; then
  echo "Cloud setup FAILED: npm install (see /tmp/cloud-setup.log)."
elif npx playwright install --with-deps chromium >>/tmp/cloud-setup.log 2>&1; then
  echo "Cloud setup: Playwright and Chromium installed; npm test is ready."
elif [ -x /opt/pw-browsers/chromium ]; then
  echo "Cloud setup: Chromium download blocked; npm test will use the pre-installed /opt/pw-browsers/chromium."
else
  echo "Cloud setup FAILED (see /tmp/cloud-setup.log). If the Chromium download was blocked, the environment's network access needs cdn.playwright.dev and playwright.download.prss.microsoft.com allowed."
fi
exit 0
