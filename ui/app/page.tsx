"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SearchBar from "./components/SearchBar";
import ResultsPanel from "./components/ResultsPanel";
import MetricsDashboard from "./components/MetricsDashboard";
import AlgorithmExplainer from "./components/AlgorithmExplainer";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface SearchResult {
  hnsw: { results: any[]; latency_ms: number };
  tahnsw: { results: any[]; latency_ms: number };
}

export default function Home() {
  const [apiStatus, setApiStatus] = useState<"building" | "ready" | "error">("building");
  const [buildMsg, setBuildMsg] = useState("Connecting to backend…");
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [lastQuery, setLastQuery] = useState("");
  const resultsRef = useRef<HTMLDivElement>(null);

  // Poll status + SSE
  useEffect(() => {
    let es: EventSource | null = null;

    const checkStatus = async () => {
      try {
        const r = await fetch(`${API}/api/status`);
        const d = await r.json();
        if (d.status === "ready") {
          setApiStatus("ready");
          setBuildMsg("Indexes ready!");
          return;
        }
        setBuildMsg(d.status || "Building…");
        // Start SSE
        es = new EventSource(`${API}/api/status/stream`);
        es.onmessage = (e) => {
          const data = JSON.parse(e.data);
          setBuildMsg(data.status);
          if (data.status === "ready") {
            setApiStatus("ready");
            es?.close();
          }
        };
        es.onerror = () => {
          es?.close();
          setTimeout(checkStatus, 3000);
        };
      } catch {
        setBuildMsg("Waiting for backend…");
        setTimeout(checkStatus, 3000);
      }
    };

    checkStatus();
    return () => es?.close();
  }, []);

  const handleSearch = async (query: string) => {
    if (apiStatus !== "ready") return;
    setSearching(true);
    setLastQuery(query);
    setSearchResult(null);

    // Scroll to results
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);

    try {
      const r = await fetch(`${API}/api/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, k: 5 }),
      });
      const data = await r.json();
      setSearchResult(data);
    } catch {
      console.error("Search failed");
    } finally {
      setSearching(false);
    }
  };

  return (
    <main
      style={{
        position: "relative",
        zIndex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 64,
        padding: "0 24px 80px",
      }}
    >
      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 28,
          paddingTop: 80,
          paddingBottom: 20,
          width: "100%",
          maxWidth: 800,
          textAlign: "center",
        }}
      >
        {/* Glow orb */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: 600,
            height: 400,
            borderRadius: "50%",
            background: "radial-gradient(ellipse at center, rgba(108,99,255,0.12) 0%, transparent 70%)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ position: "relative", zIndex: 1 }}
        >
          <span
            className="badge"
            style={{
              background: "rgba(108,99,255,0.12)",
              color: "var(--primary)",
              border: "1px solid rgba(108,99,255,0.35)",
              fontSize: "0.72rem",
              padding: "6px 16px",
            }}
          >
            <span style={{ marginRight: 4 }}>✦</span>
            Semester End Project · TAHNSW
          </span>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          style={{ position: "relative", zIndex: 1 }}
        >
          <h1
            style={{
              fontSize: "clamp(2.4rem, 6vw, 3.8rem)",
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
            }}
          >
            <span className="text-gradient">Topology-Aware</span>
            <br />
            Semantic Search
          </h1>
        </motion.div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          style={{ color: "var(--text-muted)", fontSize: "1rem", maxWidth: 560, lineHeight: 1.7, position: "relative", zIndex: 1 }}
        >
          A live comparison of <strong style={{ color: "var(--text)" }}>TAHNSW</strong> vs standard{" "}
          <strong style={{ color: "var(--hnsw)" }}>HNSW</strong> — search 200 movies and see
          how topology-aware indexing changes the results and speed.
        </motion.p>

        {/* Status indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 18px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 999,
            fontSize: "0.78rem",
            color: apiStatus === "ready" ? "var(--success)" : "var(--text-muted)",
          }}
        >
          {apiStatus === "ready" ? (
            <>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--success)", boxShadow: "0 0 6px var(--success)" }} />
              Indexes ready — search anything
            </>
          ) : (
            <>
              <div className="pulse-dot" style={{ width: 7, height: 7 }} />
              {buildMsg}
            </>
          )}
        </motion.div>

        {/* Search bar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          style={{ width: "100%", display: "flex", justifyContent: "center", position: "relative", zIndex: 1 }}
        >
          <SearchBar onSearch={handleSearch} disabled={apiStatus !== "ready"} />
        </motion.div>

        {/* Algorithm comparison legend */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.55 }}
          style={{ display: "flex", gap: 16, position: "relative", zIndex: 1 }}
        >
          {[
            { label: "HNSW (Traditional)", color: "var(--hnsw)" },
            { label: "TAHNSW (Ours)", color: "var(--primary)" },
          ].map((l) => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.78rem", color: "var(--text-muted)" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: l.color, boxShadow: `0 0 6px ${l.color}` }} />
              {l.label}
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── Results ─────────────────────────────────────────────────────── */}
      <div ref={resultsRef} style={{ width: "100%", display: "flex", justifyContent: "center" }}>
        <AnimatePresence>
          {(searching || searchResult) && (
            <ResultsPanel
              hnsw={searchResult?.hnsw ?? null}
              tahnsw={searchResult?.tahnsw ?? null}
              loading={searching}
              query={lastQuery}
            />
          )}
        </AnimatePresence>
      </div>

      {/* ── Divider ─────────────────────────────────────────────────────── */}
      <div style={{ width: "100%", maxWidth: 1100, height: 1, background: "linear-gradient(90deg, transparent, var(--border), transparent)" }} />

      {/* ── Metrics Dashboard ───────────────────────────────────────────── */}
      <MetricsDashboard />

      {/* ── Divider ─────────────────────────────────────────────────────── */}
      <div style={{ width: "100%", maxWidth: 1100, height: 1, background: "linear-gradient(90deg, transparent, var(--border), transparent)" }} />

      {/* ── Algorithm Explainer ─────────────────────────────────────────── */}
      <AlgorithmExplainer />

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer style={{ color: "var(--text-dim)", fontSize: "0.75rem", textAlign: "center", paddingTop: 20 }}>
        <span style={{ fontFamily: "var(--mono)" }}>TAHNSW</span> · Topology-Aware HNSW · Semester End Project
      </footer>
    </main>
  );
}
