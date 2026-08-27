# Local MoA Architecture Evaluation

**Verdict:** Concept is solid for a **$0 / private** local agency pipeline on Apple Silicon (64–128GB). It does **not** beat flagship cloud models (Claude Sonnet, DeepSeek 671B, Grok) on speed or top-tier agentic quality.

| Claim | Reality |
| --- | --- |
| 128GB pe 32B/70B locally chalega | **Yes** (quantized, sequential) |
| $0 API + offline agency | **Yes**, with limits |
| DeepSeek 671B / Claude / Grok quality | **No** — distill 32B/70B ≠ frontier |
| Faster than cloud agents | **No** — tok/s + tool reliability lag |
| MoA improves quality | **Somewhat**, but wall-clock **2–5× slower** |

## Memory (128GB Unified)

Approximate Q4/Q5 footprints:

- Qwen Coder **32B**: ~20–35 GB
- R1 distill / Llama **70B**: ~40–55 GB (+ KV cache)
- Vision **7B–12B**: ~6–12 GB
- Flux Schnell GGUF: ~8–15 GB
- Chrome + Playwright + n8n + macOS: ~8–15 GB

**Rule:** one heavy model at a time. Sequential queue OK; parallel 70B + 32B + Flux + Chrome → OOM / thrashing risk.

64GB Max is enough if 70B is rare. 128GB is headroom for Q5/Q8 70B + long context + browser.

## Speed bottlenecks

Local decode is memory-bandwidth bound (~546 GB/s on M4 Max class):

- 32B coder: ~20–35 tok/s
- 70B: ~15–22 tok/s

Dominant costs: model swap, MoA multi-pass, Flux (20–90s/image), vision screenshot loops, browser rate limits. One demo site can take **15–60+ minutes** end-to-end.

## Quality vs cloud

- Qwen2.5/3 Coder 32B ≈ Claude 3.5 on many coding *benchmarks*, weaker on long agentic tool loops.
- R1 distill ≠ DeepSeek 671B.
- Self-critique lowers error rate; does not eliminate hallucinations or vision false positives.
- Marketing landings: local MoA is **good enough**. Hard production apps: cloud flagship wins.

## Recommended free stack (this repo)

See [`agency/`](../agency/README.md).

| Role | Model | Notes |
| --- | --- | --- |
| Resident coder / plan / critique | Qwen2.5-Coder 32B | Keep loaded |
| Hard planning (on-demand) | DeepSeek-R1 distill 32B | Unload coder first |
| Vision QA | Qwen2.5-VL 7B | Screenshots only |
| Images | Flux.1 Schnell GGUF | Never parallel with 70B |
| Auditor | Same 32B + critique prompt | 70B only when needed |

Pipeline: `intake → plan → code → screenshot → vision fix (≤3) → deploy hook → n8n outreach`.

## Compliance

Do **not** scrape Google Maps / socials against ToS, and do **not** spam WhatsApp/SMS. This scaffold uses **explicit lead JSON/CSV intake** and webhook previews only.
