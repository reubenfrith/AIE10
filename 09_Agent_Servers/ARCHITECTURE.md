# Architecture & Deployment Guide

## Overview

This project deploys a LangGraph cat health agent as a production API backend on GCP Cloud Run, with a Next.js chat frontend on Vercel. It intentionally avoids LangSmith hosting (LangSmith Plus, ~$40/month) while retaining LangSmith's free-tier observability (tracing).

---

## Architecture Diagram

```mermaid
flowchart LR
  User[User in browser] --> Vercel[Next.js · Vercel\nagent selector toggle]
  Vercel -->|"/api proxy route\nunauthenticated"| CloudRun[LangGraph Server\nGCP Cloud Run]

  CloudRun --> SimpleAgent[simple_agent\ngpt-5.4-mini + tools]
  CloudRun --> HelpAgent[agent_with_helpfulness\ngpt-5.4-mini + judge loop]

  SimpleAgent --> Tools
  HelpAgent --> Tools
  HelpAgent --> Judge[Judge LLM\nHelpfulnessVerdict\nmax 3 retries]

  subgraph Tools
    RAG[RAG\nQdrant in-memory\n+ PDF]
    Tavily[Web Search\nTavily]
    Arxiv[Research Papers\nArxiv]
  end

  CloudRun --> Supabase[(Supabase\nPostgreSQL\nThreads + Runs)]
  CloudRun --> Upstash[(Upstash\nRedis\nStreaming + Queue)]
  CloudRun -->|traces| LangSmith[LangSmith\nProject: cat-health-agent]

  subgraph GCP Secret Manager
    S1[OPENAI_API_KEY]
    S2[TAVILY_API_KEY]
    S3[LANGSMITH_API_KEY]
    S4[DATABASE_URI]
    S5[REDIS_URI]
  end

  CloudRun -.->|reads at startup| GCP Secret Manager
```

---

## Components

### Agent Backend — GCP Cloud Run

The LangGraph agent is packaged using `langgraph build` into a Docker image and deployed to Cloud Run. The image bundles:

- All compiled LangGraph graphs (`app/graphs/simple_agent.py`, `app/graphs/agent_with_helpfulness.py`)
- All Python dependencies
- The PDF data directory (baked in — no external storage needed for RAG)

**Why Cloud Run over LangSmith hosting:**
LangSmith's cloud deploy (`langgraph deploy`) requires a paid Plus plan. Cloud Run is pay-per-use with a generous free tier, and the LangGraph server image is self-contained — it exposes the same API surface (threads, runs, streaming, assistants) that LangSmith would host for you.

**Platform gotcha:** The image must be built for `linux/amd64` (not the default `arm64` on Apple Silicon). Set `DOCKER_DEFAULT_PLATFORM=linux/amd64` before `langgraph build`.

**Port:** The LangGraph production image listens on port `8000` (not `2024` which is only used by `langgraph dev`).

---

### Database — Supabase (PostgreSQL)

The LangGraph production server requires PostgreSQL to persist threads, runs, and checkpoints. Supabase provides a free hosted PostgreSQL instance.

**Key decision:** Use the **direct connection** URL (port 5432), not the pooled connection URL (port 6543 via PgBouncer). The LangGraph migration on startup runs `CREATE INDEX CONCURRENTLY`, which is incompatible with PgBouncer's transaction pooling mode.

The server automatically runs schema migrations on first startup.

---

### Streaming / Queue — Upstash Redis

The LangGraph production server requires Redis for:
- Pub/sub event streaming (how tool call updates flow to the browser in real time)
- The background run queue

Upstash provides serverless Redis with a free tier (10k commands/day). Use the `rediss://` URL (TLS) from the Upstash dashboard.

---

### Secrets — GCP Secret Manager

All sensitive values are stored in GCP Secret Manager and injected at runtime via `--set-secrets` in Cloud Run. Nothing sensitive appears in environment variable plain text or shell history.

| Secret | Purpose |
|--------|---------|
| `OPENAI_API_KEY` | LLM + embeddings |
| `TAVILY_API_KEY` | Web search tool |
| `LANGSMITH_API_KEY` | Trace forwarding (free tier) |
| `DATABASE_URI` | Supabase PostgreSQL connection |
| `REDIS_URI` | Upstash Redis connection |

---

### Frontend — Vercel (Next.js)

The Next.js app has two responsibilities:

1. **Secure proxy** (`app/api/[...path]/route.ts`) — forwards all requests to the Cloud Run agent URL using `langgraph-nextjs-api-passthrough`. This keeps the agent URL server-side; the browser never calls Cloud Run directly.

2. **Chat UI** (`app/page.tsx`) — uses the `useStream` hook from `@langchain/react` to stream agent responses in real time. Streamed events (tool calls, AI tokens, final answers) arrive via Server-Sent Events through the proxy route. An agent selector toggle in the header lets users switch between `simple_agent` and `agent_with_helpfulness`; switching remounts the Chat component to start a fresh thread.

**Password gate:** A lightweight client-side password gate (`components/password-gate.tsx`) wraps the chat UI. The secret word is stored in `NEXT_PUBLIC_ACCESS_PASSWORD` and the authenticated state is persisted in `localStorage`. This prevents casual access without adding auth infrastructure.

---

### Graphs

Two graphs are registered in `langgraph.json` and baked into the Cloud Run image:

| Graph ID | File | Description |
|----------|------|-------------|
| `simple_agent` | `app/graphs/simple_agent.py` | Base ReAct agent with tool belt (RAG, Tavily, Arxiv) |
| `agent_with_helpfulness` | `app/graphs/agent_with_helpfulness.py` | ReAct agent wrapped in a helpfulness feedback loop |

#### `agent_with_helpfulness` — How It Works

After the inner ReAct agent produces a response, a judge node evaluates it:

```
START → run_agent → judge_response ─► END          (if helpful or retry_count ≥ 3)
                         │
                         └──► run_agent             (if not helpful, retry_count < 3)
```

- **`run_agent`** — invokes the inner ReAct agent. On retries (retry_count > 0), appends a nudge HumanMessage so the agent knows its previous answer was insufficient.
- **`judge_response`** — extracts the original user question and last AI message content (not the raw tool-call chain), passes them to a separate LLM call with `HelpfulnessVerdict` structured output (`is_helpful: bool`, `reason: str`), and increments `retry_count`.
- **`route_after_judge`** — exits if `is_helpful` is true or `retry_count ≥ 3`; loops otherwise. Maximum three total attempts.

The judge verdict is visible in LangSmith traces under each `judge_response` span.

---

### Observability — LangSmith (free tier)

Even though LangSmith is not used for hosting, it is still used for tracing. Setting `LANGSMITH_TRACING=true` and `LANGSMITH_API_KEY` on the Cloud Run service causes the agent to forward traces to LangSmith after every run.

View traces at [smith.langchain.com](https://smith.langchain.com) → Projects → `cat-health-agent`.

The Cloud Run service sets `LANGCHAIN_PROJECT=cat-health-agent`, so all runs (both `simple_agent` and `agent_with_helpfulness`) land in the same project. Filter by the `graph_id` metadata field to compare traces across graphs.

---

## Key Decisions Summary

| Decision | Choice | Reason |
|----------|--------|--------|
| Agent hosting | GCP Cloud Run | Avoids LangSmith Plus ($40/month); same API surface |
| Graphs | `simple_agent` + `agent_with_helpfulness` | Both baked into the same Docker image; registered in `langgraph.json` |
| Helpfulness loop | Judge node with structured output | Separate LLM call on clean input (question + last AI response) avoids message-validation errors; verdict visible in LangSmith |
| Database | Supabase (free) | Free PostgreSQL; direct connection avoids PgBouncer issues |
| Redis | Upstash (free) | Serverless Redis; required by LangGraph production server |
| Secrets | GCP Secret Manager | Keeps keys out of shell history and env var plaintext |
| Frontend | Vercel | Best Next.js support; free hobby tier |
| Agent selector | Toggle in header, `key={agentId}` on Chat | Forces component remount on switch — clean thread per assistant |
| Auth | Client-side password gate | Simple, no auth infrastructure needed |
| Observability | LangSmith free tier | Retains tracing without paying for hosting |
| Image platform | `linux/amd64` | Cloud Run is x86; Mac M-series builds arm64 by default |

---

## Environment Variables

### Cloud Run (set via GCP Secret Manager)

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key |
| `TAVILY_API_KEY` | Tavily search API key |
| `LANGSMITH_API_KEY` | LangSmith API key (free tier) |
| `DATABASE_URI` | Supabase direct connection string |
| `REDIS_URI` | Upstash Redis URL (`rediss://...`) |

### Cloud Run (plain env vars)

| Variable | Value |
|----------|-------|
| `LANGSMITH_TRACING` | `true` |
| `RAG_DATA_DIR` | `data` |

### Vercel (production env vars)

| Variable | Description |
|----------|-------------|
| `LANGGRAPH_API_URL` | Cloud Run service URL |
| `LANGSMITH_API_KEY` | LangSmith key (used by passthrough if needed) |
| `NEXT_PUBLIC_API_URL` | Vercel app URL + `/api` |
| `NEXT_PUBLIC_ACCESS_PASSWORD` | Secret word for the password gate |

---

## Deployed URLs

| Service | URL |
|---------|-----|
| Frontend | https://frontend-sable-iota-91.vercel.app |
| Agent API | https://cat-health-agent-316461491006.us-central1.run.app |
| LangSmith traces | https://smith.langchain.com → Projects → `default` |
