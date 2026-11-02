#!/bin/sh
# Creates scanner/.venv with the pinned LLM Guard stack. Uses uv when present (it fetches
# Python 3.11 itself); otherwise needs python3.11 (override with PYTHON=...).
set -eu
cd "$(dirname "$0")"
if command -v uv >/dev/null 2>&1; then
  uv venv --python 3.11 --seed --allow-existing .venv
else
  "${PYTHON:-python3.11}" -m venv .venv
fi
.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install -r requirements.txt
