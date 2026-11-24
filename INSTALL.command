#!/bin/zsh
set -eu
cd "$(dirname "$0")"
python3 -m venv --system-site-packages .venv
.venv/bin/python -c 'import numpy,pandas,scipy,jupyterlab,nbformat' || .venv/bin/python -m pip install -e '.[research,dev]'
PYTHONPATH=src .venv/bin/python -m unittest discover -s tests/unit -p 'test_*py'
echo "Installation complete. Double-click START.command."
