#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

bunBinary=""
if command -v bun >/dev/null 2>&1 && [[ "$(bun --version)" == "1.3.14" ]]; then
  bunBinary="$(command -v bun)"
else
  for candidate in "$HOME"/.npm/_npx/*/node_modules/.bin/bun; do
    if [[ -x "$candidate" && "$("$candidate" --version)" == "1.3.14" ]]; then
      bunBinary="$candidate"
      break
    fi
  done
fi

if [[ -z "$bunBinary" ]]; then
  echo "未找到 Bun 1.3.14，请先安装项目要求的 Bun 版本。" >&2
  exit 1
fi

export PATH="$(dirname "$bunBinary"):$PATH"
"$bunBinary" install --frozen-lockfile
"$bunBinary" run dev:plugins

NODE_ENV=dev "$bunBinary" --watch apps/server/src/index.ts &
serverPid=$!
trap 'kill "$serverPid" 2>/dev/null || true; wait "$serverPid" 2>/dev/null || true' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
"$bunBinary" run --cwd apps/web dev
