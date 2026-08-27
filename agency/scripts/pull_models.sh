#!/usr/bin/env bash
# Pull recommended Ollama models for the MoA stack (Apple Silicon / Linux).
set -euo pipefail

MODELS=(
  "qwen2.5-coder:32b"
  "deepseek-r1:32b"
  "qwen2.5vl:7b"
)

echo "Pulling MoA models via Ollama…"
for m in "${MODELS[@]}"; do
  echo "→ $m"
  ollama pull "$m"
done

echo "Optional heavy auditor (skip if RAM tight):"
echo "  ollama pull llama3.3:70b"
echo "Done. Keep only qwen2.5-coder:32b resident during coding."
