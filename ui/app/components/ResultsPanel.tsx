"use client";

import { motion, AnimatePresence } from "framer-motion";

interface Movie {
    id: number;
    title: string;
    genre: string;
    plot: string;
    score: number;
}

interface AlgoResult {
    results: Movie[];
    latency_ms: number;
}

interface Props {
    hnsw: AlgoResult | null;
    tahnsw: AlgoResult | null;
    loading: boolean;
    query: string;
}

function ResultCard({ movie, index, color }: { movie: Movie; index: number; color: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.07 }}
            style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "14px 16px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
            }}
        >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div>
                    <div style={{ fontWeight: 600, fontSize: "0.92rem", color: "var(--text)", lineHeight: 1.3 }}>
                        {movie.title}
                    </div>
                    <span className="genre-tag" style={{ marginTop: 4, display: "inline-block" }}>{movie.genre}</span>
                </div>
                <div
                    style={{
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        fontFamily: "var(--mono)",
                        color: color,
                        background: `${color}18`,
                        border: `1px solid ${color}30`,
                        borderRadius: 6,
                        padding: "3px 8px",
                        whiteSpace: "nowrap",
                    }}
                >
                    {(movie.score * 100).toFixed(1)}%
                </div>
            </div>

            {/* Plot */}
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.55, margin: 0 }}>
                {movie.plot.length > 120 ? movie.plot.slice(0, 117) + "…" : movie.plot}
            </p>

            {/* Score bar */}
            <div className="score-bar-track">
                <motion.div
                    className="score-bar-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${movie.score * 100}%` }}
                    transition={{ duration: 0.5, delay: index * 0.07 + 0.2, ease: "easeOut" }}
                    style={{ background: `linear-gradient(90deg, ${color}80, ${color})` }}
                />
            </div>
        </motion.div>
    );
}

function SkeletonCard() {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "14px 16px", background: "var(--surface-2)", borderRadius: 12 }}>
            <div className="skeleton" style={{ height: 16, width: "60%" }} />
            <div className="skeleton" style={{ height: 11, width: "30%" }} />
            <div className="skeleton" style={{ height: 11, width: "100%", marginTop: 4 }} />
            <div className="skeleton" style={{ height: 11, width: "85%" }} />
            <div className="skeleton" style={{ height: 4, width: "100%", marginTop: 4 }} />
        </div>
    );
}

function Column({
    label,
    color,
    result,
    loading,
}: {
    label: string;
    color: string;
    result: AlgoResult | null;
    loading: boolean;
}) {
    return (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Column header */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 16px",
                    background: "var(--surface)",
                    border: `1px solid ${color}30`,
                    borderRadius: 12,
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, boxShadow: `0 0 8px ${color}` }} />
                    <span style={{ fontWeight: 700, fontSize: "0.9rem", color }}>{label}</span>
                </div>
                {result && !loading && (
                    <span
                        style={{
                            fontFamily: "var(--mono)",
                            fontSize: "0.75rem",
                            color: "var(--text-muted)",
                            background: "var(--surface-2)",
                            padding: "3px 8px",
                            borderRadius: 6,
                        }}
                    >
                        {result.latency_ms.toFixed(1)} ms
                    </span>
                )}
                {loading && <div className="skeleton" style={{ height: 22, width: 64, borderRadius: 6 }} />}
            </div>

            {/* Results */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {loading
                    ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
                    : result?.results.map((m, i) => (
                        <ResultCard key={m.id} movie={m} index={i} color={color} />
                    ))}
            </div>
        </div>
    );
}

export default function ResultsPanel({ hnsw, tahnsw, loading, query }: Props) {
    if (!hnsw && !tahnsw && !loading) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{ width: "100%", maxWidth: 1100 }}
        >
            {/* Section header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                <span style={{ color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: 500, whiteSpace: "nowrap" }}>
                    Results for &ldquo;<span style={{ color: "var(--text)" }}>{query}</span>&rdquo;
                </span>
                <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            </div>

            {/* Side-by-side columns */}
            <div style={{ display: "flex", gap: 16 }}>
                <Column label="HNSW (Traditional)" color="var(--hnsw)" result={hnsw} loading={loading} />
                <Column label="TAHNSW (Ours)" color="var(--primary)" result={tahnsw} loading={loading} />
            </div>
        </motion.div>
    );
}
