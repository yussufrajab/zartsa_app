#!/usr/bin/env bash
set -euo pipefail

SERVICES=("postgresql" "redis-server" "minio")
NODE_APPS=("server" "client")
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

start_infra() {
  echo "Starting infrastructure services..."
  for svc in "${SERVICES[@]}"; do
    if systemctl is-active --quiet "$svc" 2>/dev/null; then
      echo "  $svc already running"
    else
      sudo systemctl start "$svc" 2>/dev/null && echo "  $svc started" || echo "  $svc not found (skipping)"
    fi
  done
}

stop_infra() {
  echo "Stopping infrastructure services..."
  for svc in "${SERVICES[@]}"; do
    if systemctl is-active --quiet "$svc" 2>/dev/null; then
      sudo systemctl stop "$svc" && echo "  $svc stopped" || echo "  $svc stop failed"
    else
      echo "  $svc not running"
    fi
  done
}

start_node() {
  echo "Starting Node.js applications..."
  cd "$SCRIPT_DIR"
  if command -v pm2 &>/dev/null; then
    pm2 start server/dist/index.js --name zartsa-api
    pm2 start "npx next start" --name zartsa-web
    echo "  Started via PM2"
  else
    echo "  PM2 not found. Starting directly..."
    (cd server && node dist/index.js) &
    (cd client && npx next start) &
    echo "  Started in background"
  fi
}

stop_node() {
  echo "Stopping Node.js applications..."
  if command -v pm2 &>/dev/null; then
    pm2 stop zartsa-api zartsa-web 2>/dev/null || true
    echo "  Stopped via PM2"
  else
    pkill -f "node dist/index.js" 2>/dev/null || true
    pkill -f "next start" 2>/dev/null || true
    echo "  Stopped"
  fi
}

status_check() {
  echo "=== Infrastructure ==="
  for svc in "${SERVICES[@]}"; do
    if systemctl is-active --quiet "$svc" 2>/dev/null; then
      echo "  $svc: running"
    else
      echo "  $svc: stopped"
    fi
  done
  echo "=== Node.js ==="
  if command -v pm2 &>/dev/null; then
    pm2 list
  else
    pgrep -f "node dist/index.js" >/dev/null && echo "  API: running" || echo "  API: stopped"
    pgrep -f "next start" >/dev/null && echo "  Web: running" || echo "  Web: stopped"
  fi
}

case "${1:-}" in
  start)   start_infra; start_node ;;
  stop)    stop_node; stop_infra ;;
  restart) stop_node; stop_infra; start_infra; start_node ;;
  status)  status_check ;;
  *)       echo "Usage: $0 {start|stop|restart|status}" ;;
esac