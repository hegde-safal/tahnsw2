"""
main.py — FastAPI backend for TAHNSW Semantic Search Showcase.
"""
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json

from api.corpus import SearchCorpus

corpus = SearchCorpus()
_build_task: asyncio.Task | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _build_task
    loop = asyncio.get_event_loop()
    _build_task = loop.run_in_executor(None, corpus.build)
    yield
    if _build_task:
        _build_task.cancel()


app = FastAPI(title="TAHNSW Showcase API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Models ────────────────────────────────────────────────────────────────────

class SearchRequest(BaseModel):
    query: str
    k: int = 5


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/api/status")
async def status():
    return {"status": corpus.status}


@app.get("/api/status/stream")
async def status_stream():
    """SSE endpoint to stream build progress."""
    async def event_gen():
        last = ""
        while True:
            current = corpus.status
            if current != last:
                last = current
                data = json.dumps({"status": current})
                yield f"data: {data}\n\n"
                if current == "ready":
                    break
            await asyncio.sleep(0.5)
    return StreamingResponse(event_gen(), media_type="text/event-stream")


@app.post("/api/search")
async def search(req: SearchRequest):
    if corpus.status != "ready":
        raise HTTPException(status_code=503, detail=f"Index building: {corpus.status}")
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
    loop = asyncio.get_event_loop()
    results = await loop.run_in_executor(None, corpus.search, req.query, req.k)
    return results


@app.get("/api/benchmark")
async def benchmark():
    if corpus.status != "ready":
        raise HTTPException(status_code=503, detail=f"Index building: {corpus.status}")
    loop = asyncio.get_event_loop()
    data = await loop.run_in_executor(None, corpus.benchmark_data)
    return data


@app.get("/api/info")
async def info():
    if corpus.status != "ready":
        return {"status": corpus.status}
    return {
        "status": "ready",
        "corpus_size": len(corpus.movies),
        "embedding_dim": 384,
        "hnsw_build_time_s": corpus.hnsw_build_time,
        "tahnsw_build_time_s": corpus.tahnsw_build_time,
        "tahnsw_stats": corpus.tahnsw_stats,
    }
