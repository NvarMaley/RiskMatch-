#!/bin/zsh
set -eu
setopt NO_BG_NICE
cd "$(dirname "$0")"
[[ -x .venv/bin/python ]] || ./INSTALL.command
mkdir -p .run
start_service() {
  local name="$1"; shift
  if [[ -f ".run/$name.pid" ]] && kill -0 "$( < ".run/$name.pid" )" 2>/dev/null; then
    echo "$name already running"; return
  fi
  nohup "$@" </dev/null >".run/$name.log" 2>&1 &
  local pid=$!
  printf '%s\n' "$pid" >".run/$name.pid"
}
start_service web .venv/bin/python apps/api/server.py
start_service jupyter .venv/bin/python -m jupyterlab --ip=127.0.0.1 --port=8888 --ServerApp.port_retries=0 --no-browser --ServerApp.root_dir="$PWD"
for service in web jupyter; do
  if ! kill -0 "$( < ".run/$service.pid" )" 2>/dev/null; then
    echo "$service: startup failed; see .run/$service.log"
    exit 1
  fi
done
echo "Web : http://127.0.0.1:3000"
echo "Jupyter: see .run/jupyter.log for the token-authenticated link."
open http://127.0.0.1:3000 || true
