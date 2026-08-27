# ORDO Local MoA Agency Scaffold

Apple Silicon–oriented **Mixture-of-Agents** pipeline for $0 local demo-site generation + visual self-heal + staging hooks + n8n outreach.

Full evaluation: [`docs/LOCAL-MOA-ARCHITECTURE.md`](../docs/LOCAL-MOA-ARCHITECTURE.md).

## Design rules

1. **One heavy model resident** (default: Qwen Coder 32B).
2. Swap models sequentially — never 70B + Flux + coder together.
3. Vision uses a **7B** VL model on short screenshot contexts.
4. Max **3** vision fix loops per job.
5. Lead data comes from **files you own** (JSON/CSV) — no Maps scraping.

## Quick start (dry-run — any machine)

```bash
cd agency
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python scripts/run_pipeline.py --lead samples/lead.demo.json --dry-run
```

Dry-run mocks Ollama and writes a VIP Next.js demo under `agency/output/<slug>/`.

## Apple Silicon (real models)

```bash
# Install Ollama, then:
./scripts/pull_models.sh

# Optional: start n8n
docker compose -f docker/docker-compose.n8n.yml up -d

export OLLAMA_HOST=http://127.0.0.1:11434
export MOA_DRY_RUN=0
python scripts/run_pipeline.py --lead samples/lead.demo.json
```

MLX users: point `MOA_OPENAI_BASE` at an OpenAI-compatible MLX server; the client uses the same chat API shape as Ollama.

## Layout

```text
agency/
  config/models.yaml      # role → model ids + RAM hints
  config/pipeline.yaml    # loop limits, paths
  docker/                 # n8n community edition
  samples/                # example leads
  src/moa/                # orchestrator + stages
  templates/vip-demo/     # Next.js landing seed
  scripts/                # CLI entrypoints
  output/                 # generated sites (gitignored)
```

## Memory check

```bash
python scripts/check_memory.py
```

Prints whether the configured concurrent set fits a given unified-memory budget (default 128 GB).
