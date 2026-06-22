"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, BarChart, Bar, Cell,
    LabelList, ReferenceLine,
} from "recharts";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface CurvePoint { ef: number; recall: number; qps: number; }
interface BenchmarkData {
    hnsw: { curve: CurvePoint[]; build_time: number };
    tahnsw: { curve: CurvePoint[]; build_time: number; stats: any };
}

const TIP_STYLE: React.CSSProperties = {
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    color: "var(--text)",
    fontSize: "0.78rem",
    fontFamily: "var(--mono)",
    padding: "8px 12px",
};

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>
            {children}
        </h2>
    );
}

function StatPill({
    label, value, color, hint,
}: {
    label: string; value: string; color?: string; hint?: string;
}) {
    return (
        <div style={{
            background: "var(--surface-2)", border: "1px solid var(--border)",
            borderRadius: 12, padding: "12px 16px", display: "flex",
            flexDirection: "column", gap: 4, flex: "1 1 auto", minWidth: 100,
        }}>
            <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
            <span style={{ fontSize: "1.2rem", fontWeight: 700, fontFamily: "var(--mono)", color: color || "var(--text)" }}>{value}</span>
            {hint && <span style={{ fontSize: "0.65rem", color: "var(--text-dim)" }}>{hint}</span>}
        </div>
    );
}

/** Tooltip for the Recall chart */
function RecallTooltip({ active, payload }: any) {
    if (!active || !payload?.length) return null;
    const ef = payload[0]?.payload?.ef;
    return (
        <div style={TIP_STYLE}>
            <div style={{ marginBottom: 4, color: "var(--text-muted)", borderBottom: "1px solid var(--border)", paddingBottom: 4 }}>
                ef = <strong style={{ color: "var(--text)", fontFamily: "var(--mono)" }}>{ef}</strong>
            </div>
            {payload.map((p: any) => (
                <div key={p.dataKey} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.color }} />
                    <span style={{ color: "var(--text-muted)" }}>{p.name}</span>
                    <span style={{ fontFamily: "var(--mono)", marginLeft: "auto", paddingLeft: 12, color: "var(--text)" }}>
                        {Number(p.value).toFixed(4)}
                    </span>
                </div>
            ))}
            <div style={{ color: "var(--text-dim)", fontSize: "0.7rem", marginTop: 4, borderTop: "1px solid var(--border)", paddingTop: 4 }}>
                HNSW: {payload[0]?.payload?.qps_hnsw?.toLocaleString() ?? "—"} qps &nbsp;|&nbsp; TAHNSW: {payload[0]?.payload?.qps_tahnsw?.toLocaleString() ?? "—"} qps
            </div>
        </div>
    );
}

function BuildTooltip({ active, payload }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div style={TIP_STYLE}>
            <span style={{ color: "var(--text-muted)" }}>{payload[0].payload.name}: </span>
            <strong style={{ fontFamily: "var(--mono)", color: "var(--text)" }}>{Number(payload[0].value).toFixed(3)}s</strong>
        </div>
    );
}

function interpolateLatency(curve: CurvePoint[], targetRecall: number) {
    const sorted = [...curve].sort((a, b) => a.recall - b.recall);
    for (let i = 0; i < sorted.length - 1; i++) {
        const a = sorted[i], b = sorted[i + 1];
        if (a.recall <= targetRecall && targetRecall <= b.recall) {
            const t = (targetRecall - a.recall) / (b.recall - a.recall);
            const interpQps = a.qps + t * (b.qps - a.qps);
            return { qps: Math.round(interpQps), latencyMs: +(1000 / interpQps).toFixed(3) };
        }
    }
    const nearest = sorted.reduce((best, p) =>
        Math.abs(p.recall - targetRecall) < Math.abs(best.recall - targetRecall) ? p : best
    );
    return { qps: Math.round(nearest.qps), latencyMs: +(1000 / nearest.qps).toFixed(3) };
}

export default function MetricsDashboard() {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true, margin: "-80px" });
    const [data, setData] = useState<BenchmarkData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!inView || data || loading) return;
        setLoading(true);
        fetch(`${API}/api/benchmark`)
            .then((r) => r.json())
            .then((d) => { setData(d); setLoading(false); })
            .catch(() => { setError("Could not load benchmark data."); setLoading(false); });
    }, [inView]);

    // Merge curves — keep ef ascending
    const recallQpsCurve = data
        ? data.hnsw.curve.map((h, i) => ({
            ef: h.ef,
            recall_hnsw: +h.recall.toFixed(4),
            recall_tahnsw: +(data.tahnsw.curve[i]?.recall ?? 0).toFixed(4),
            qps_hnsw: Math.round(h.qps),
            qps_tahnsw: Math.round(data.tahnsw.curve[i]?.qps ?? 0),
        }))
        : [];

    const buildBarData = data
        ? [
            { name: "HNSW", time: data.hnsw.build_time },
            { name: "TAHNSW C++", time: data.tahnsw.build_time },
        ]
        : [];

    return (
        <div ref={ref} style={{ width: "100%", maxWidth: 1100 }}>
            <motion.div
                initial={{ opacity: 0, y: 32 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5 }}
            >
                {/* Section header */}
                <div style={{ textAlign: "center", marginBottom: 40 }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        <span style={{
                            display: "inline-block",
                            width: 8, height: 8, borderRadius: "50%",
                            background: "var(--primary)",
                            boxShadow: "0 0 8px var(--primary-glow)",
                        }} />
                        <span style={{
                            fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.1em",
                            textTransform: "uppercase", color: "var(--primary)",
                        }}>
                            Performance Metrics
                        </span>
                    </div>
                    <SectionTitle>Benchmark Results — C++ Bindings</SectionTitle>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
                        {data
                            ? `${data.hnsw.curve.length}-point ef sweep · 200 queries · 5K movie corpus · C++ extension`
                            : "Running against 5K movie corpus · cosine distance · C++ extension"}
                    </p>
                </div>

                {loading && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", padding: "48px 0", color: "var(--text-muted)", fontSize: "0.88rem" }}>
                        <div className="pulse-dot" />
                        Running benchmark sweep…
                    </div>
                )}

                {error && <p style={{ color: "var(--warning)", textAlign: "center" }}>{error}</p>}

                {data && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

                        {/* ═══ ROW 1: Recall chart (full width) ═══ */}
                        <div className="card" style={{ padding: "24px 28px 20px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                                <div>
                                    <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>
                                        Recall vs. Search Depth
                                    </h3>
                                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4, lineHeight: 1.6 }}>
                                        Higher curve = better recall at same ef. Shaded region = TAHNSW advantage.
                                    </p>
                                </div>
                                <div style={{ display: "flex", gap: 16, fontSize: "0.75rem" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        <div style={{ width: 20, height: 2, background: "var(--hnsw)", borderRadius: 2 }} />
                                        <span style={{ color: "var(--text-muted)" }}>HNSW</span>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        <div style={{ width: 20, height: 2.5, background: "var(--primary)", borderRadius: 2 }} />
                                        <span style={{ color: "var(--text-muted)" }}>TAHNSW (C++)</span>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        <div style={{ width: 12, height: 12, background: "rgba(0,196,140,0.25)", border: "1px solid var(--success)", borderRadius: 2 }} />
                                        <span style={{ color: "var(--text-muted)" }}>Advantage</span>
                                    </div>
                                </div>
                            </div>

                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart
                                    data={recallQpsCurve}
                                    margin={{ top: 8, right: 16, bottom: 32, left: 8 }}
                                >
                                    <defs>
                                        <linearGradient id="hnswGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="var(--hnsw)" stopOpacity={0.15} />
                                            <stop offset="100%" stopColor="var(--hnsw)" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="tahnswGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.2} />
                                            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                                    <XAxis
                                        dataKey="ef"
                                        type="number"
                                        tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                                        axisLine={{ stroke: "var(--border)" }}
                                        tickLine={{ stroke: "var(--border)" }}
                                        label={{
                                            value: "ef (search depth) →",
                                            position: "insideBottom",
                                            offset: -18,
                                            fill: "var(--text-muted)",
                                            fontSize: 11,
                                        }}
                                    />
                                    <YAxis
                                        tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                                        tickFormatter={(v: any) => Number(v).toFixed(2)}
                                        domain={[0.7, 1.005]}
                                        axisLine={{ stroke: "var(--border)" }}
                                        tickLine={{ stroke: "var(--border)" }}
                                        label={{
                                            value: "Recall →",
                                            angle: -90,
                                            position: "insideLeft",
                                            offset: 4,
                                            fill: "var(--text-muted)",
                                            fontSize: 11,
                                        }}
                                        width={48}
                                    />
                                    <ReferenceLine y={1} stroke="rgba(0,196,140,0.3)" strokeDasharray="6 3" />
                                    <Tooltip content={<RecallTooltip />} />
                                    <Line
                                        type="monotone"
                                        dataKey="recall_hnsw"
                                        name="HNSW (hnswlib)"
                                        stroke="var(--hnsw)"
                                        strokeWidth={2}
                                        dot={{ r: 3, fill: "var(--hnsw)", strokeWidth: 0 }}
                                        activeDot={{ r: 5, fill: "var(--hnsw)", strokeWidth: 0 }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="recall_tahnsw"
                                        name="TAHNSW (C++)"
                                        stroke="var(--primary)"
                                        strokeWidth={2.5}
                                        dot={{ r: 3, fill: "var(--primary)", strokeWidth: 0 }}
                                        activeDot={{ r: 5, fill: "var(--primary)", strokeWidth: 0 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>

                            {/* Key ef callouts — only show a few important ones */}
                            <div style={{
                                display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap",
                            }}>
                                {[0, 2, 4, 6].filter(i => recallQpsCurve[i]).map((idx) => {
                                    const d = recallQpsCurve[idx];
                                    const better = d.recall_tahnsw > d.recall_hnsw;
                                    return (
                                        <div key={idx} style={{
                                            background: better ? "rgba(0,196,140,0.08)" : "var(--surface-2)",
                                            border: `1px solid ${better ? "rgba(0,196,140,0.3)" : "var(--border)"}`,
                                            borderRadius: 8, padding: "6px 12px",
                                            fontSize: "0.68rem", fontFamily: "var(--mono)",
                                            display: "flex", gap: 8, alignItems: "center",
                                        }}>
                                            <span style={{ color: "var(--text-dim)", fontWeight: 600 }}>ef={d.ef}</span>
                                            <span style={{ color: "var(--hnsw)" }}>{(d.recall_hnsw * 100).toFixed(1)}%</span>
                                            <span style={{ color: "var(--text-dim)" }}>→</span>
                                            <span style={{ color: "var(--primary)", fontWeight: 600 }}>{(d.recall_tahnsw * 100).toFixed(1)}%</span>
                                            {better && <span style={{ color: "var(--success)", fontSize: "0.6rem" }}>+{(d.recall_tahnsw - d.recall_hnsw).toFixed(3)}</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ═══ ROW 2: Build time + Latency table ═══ */}
                        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>

                            {/* Build time */}
                            <div className="card" style={{ flex: "1 1 280px", padding: "24px" }}>
                                <div style={{ marginBottom: 16 }}>
                                    <h3 style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--text)" }}>
                                        Index Build Time
                                    </h3>
                                    <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 3 }}>
                                        5K movies · 384-dim · M=16 · ef=200 · single-threaded
                                    </p>
                                </div>

                                {/* Big numbers */}
                                <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                                    <div style={{
                                        flex: 1, textAlign: "center", padding: "16px 8px",
                                        background: "var(--surface-2)", borderRadius: 12,
                                        border: "1px solid var(--border)",
                                    }}>
                                        <div style={{ fontSize: "0.6rem", color: "var(--hnsw)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>HNSW</div>
                                        <div style={{ fontSize: "1.8rem", fontWeight: 700, fontFamily: "var(--mono)", color: "var(--hnsw)" }}>
                                            {data.hnsw.build_time.toFixed(2)}
                                            <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>s</span>
                                        </div>
                                    </div>
                                    <div style={{
                                        flex: 1, textAlign: "center", padding: "16px 8px",
                                        background: "var(--surface-2)", borderRadius: 12,
                                        border: "1px solid rgba(108,99,255,0.3)",
                                    }}>
                                        <div style={{ fontSize: "0.6rem", color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>TAHNSW C++</div>
                                        <div style={{ fontSize: "1.8rem", fontWeight: 700, fontFamily: "var(--mono)", color: "var(--primary)" }}>
                                            {data.tahnsw.build_time.toFixed(2)}
                                            <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>s</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Visual ratio bar */}
                                <div style={{ marginBottom: 12 }}>
                                    <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", background: "var(--surface-2)" }}>
                                        <div style={{
                                            width: `${(data.hnsw.build_time / Math.max(data.hnsw.build_time, data.tahnsw.build_time)) * 100}%`,
                                            background: "var(--hnsw)",
                                            borderRadius: "4px 0 0 4px",
                                        }} />
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: "0.65rem", color: "var(--text-dim)", fontFamily: "var(--mono)" }}>
                                        <span>0s</span>
                                        <span>{Math.max(data.hnsw.build_time, data.tahnsw.build_time).toFixed(1)}s</span>
                                    </div>
                                </div>

                                <div style={{
                                    padding: "8px 12px",
                                    background: "var(--surface-2)", borderRadius: 8,
                                    fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.6,
                                }}>
                                    Topology analysis (clustering, betweenness, RNG pruning) adds fixed overhead.
                                    Ratio improves on larger datasets as graph construction dominates.
                                </div>
                            </div>

                            {/* Latency table */}
                            <div className="card" style={{ flex: "1 1 340px", padding: "24px" }}>
                                <div style={{ marginBottom: 16 }}>
                                    <h3 style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--text)" }}>
                                        Latency at Matched Recall
                                    </h3>
                                    <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 3 }}>
                                        Interpolated from ef sweep — lower is better
                                    </p>
                                </div>

                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                                    <thead>
                                        <tr style={{ borderBottom: "1px solid var(--border)" }}>
                                            <th style={{ textAlign: "left", padding: "6px 8px", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Target</th>
                                            <th style={{ textAlign: "right", padding: "6px 8px", color: "var(--hnsw)", fontWeight: 600, fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>HNSW</th>
                                            <th style={{ textAlign: "right", padding: "6px 8px", color: "var(--primary)", fontWeight: 600, fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>TAHNSW</th>
                                            <th style={{ textAlign: "right", padding: "6px 8px", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Ratio</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[0.90, 0.95, 0.99].map((target) => {
                                            const h = interpolateLatency(data.hnsw.curve, target);
                                            const t = interpolateLatency(data.tahnsw.curve, target);
                                            const ratio = h.latencyMs / t.latencyMs;
                                            return (
                                                <tr key={target} style={{ borderBottom: "1px solid var(--border)" }}>
                                                    <td style={{ padding: "10px 8px", fontFamily: "var(--mono)", color: "var(--text)" }}>
                                                        {(target * 100).toFixed(0)}%
                                                    </td>
                                                    <td style={{ padding: "10px 8px", textAlign: "right", fontFamily: "var(--mono)", color: "var(--hnsw)" }}>
                                                        {h.latencyMs} ms
                                                    </td>
                                                    <td style={{ padding: "10px 8px", textAlign: "right", fontFamily: "var(--mono)", color: "var(--primary)" }}>
                                                        {t.latencyMs} ms
                                                    </td>
                                                    <td style={{ padding: "10px 8px", textAlign: "right", fontFamily: "var(--mono)", color: ratio > 1 ? "var(--success)" : "var(--warning)" }}>
                                                        {ratio > 1 ? "▼" : "▲"} {ratio.toFixed(2)}x
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* ═══ ROW 3: Stats grid ═══ */}
                        <div className="card" style={{ padding: "24px 28px" }}>
                            <div style={{ marginBottom: 20 }}>
                                <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>
                                    TAHNSW C++ — Construction Metrics
                                </h3>
                                <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 4 }}>
                                    Collected during index construction via C++ extension
                                </p>
                            </div>

                            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                                <StatPill
                                    label="Edge Reduction"
                                    value={`${(data.tahnsw.stats.edge_reduction_pct ?? 0).toFixed(1)}%`}
                                    color="var(--success)"
                                    hint="fewer edges vs fixed-M HNSW"
                                />
                                <StatPill
                                    label="Mean M_eff"
                                    value={(data.tahnsw.stats.mean_M_eff ?? 0).toFixed(1)}
                                    color="var(--primary)"
                                    hint="effective connections/node"
                                />
                                <StatPill
                                    label="Hub Nodes"
                                    value={`${(data.tahnsw.stats.hub_pct ?? 0).toFixed(1)}%`}
                                    color="var(--accent)"
                                    hint="low C(v), promoted up"
                                />
                                <StatPill
                                    label="Leaf Nodes"
                                    value={`${(data.tahnsw.stats.leaf_pct ?? 0).toFixed(1)}%`}
                                    color="var(--primary)"
                                    hint="high C(v), layer 0 only"
                                />
                                <StatPill
                                    label="Normal Nodes"
                                    value={`${(data.tahnsw.stats.normal_pct ?? 0).toFixed(1)}%`}
                                    color="var(--text)"
                                    hint="standard assignment"
                                />
                                <StatPill
                                    label="Max Recall"
                                    value={(data.tahnsw.curve[data.tahnsw.curve.length - 1]?.recall * 100).toFixed(1) + "%"}
                                    color="var(--primary)"
                                    hint={`at ef=${data.tahnsw.curve[data.tahnsw.curve.length - 1]?.ef ?? "?"}`}
                                />
                            </div>

                            <div style={{
                                marginTop: 16, padding: "14px 18px",
                                background: "var(--surface-2)", borderRadius: 10,
                                borderLeft: "3px solid var(--success)",
                            }}>
                                <p style={{ fontSize: "0.8rem", color: "var(--text)", lineHeight: 1.7, margin: 0 }}>
                                    <strong style={{ color: "var(--success)" }}>
                                        {(data.tahnsw.stats.edge_reduction_pct ?? 0).toFixed(1)}% edge reduction
                                    </strong>
                                    {" "}via: (1) <strong style={{ color: "var(--text)" }}>adaptive M(v)</strong> — hub nodes get more edges, leaf nodes fewer;
                                    (2) <strong style={{ color: "var(--text)" }}>RNG pruning</strong> — dominated edges at layer 0 removed;
                                    (3) <strong style={{ color: "var(--text)" }}>topology-aware layers</strong> — nodes placed by clustering coefficient C(v).
                                </p>
                            </div>
                        </div>

                    </div>
                )}
            </motion.div>
        </div>
    );
}
