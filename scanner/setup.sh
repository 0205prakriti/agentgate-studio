#!/bin/sh
# Creates scanner/.venv with the pinned LLM Guard release (Python 3.11 recommended).
set -eu
cd "$(dirname "$0")"
PYTHON="${PYTHON:-python3.11}"
"$PYTHON" -m venv .venv
.venv/bin/python -m pip install --quiet --upgrade pip
.venv/bin/python -m pip install -r requirements.txt
