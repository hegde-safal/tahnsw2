"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, Legend,
} from "recharts";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface CurvePoint { ef: number; recall: number; qps: number; }
interface BenchmarkData {
    hnsw: { curve: CurvePoint[]; build_time: number };
    tahnsw: { curve: CurvePoint[]; build_time: number; stats: { hub_pct: number; leaf_pct: number; normal_pct: number; mean_M_eff: number; edge_reduction_pct: number } };
}

const CUSTOM_TOOLTIP_STYLE = {
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

function StatPill({ label, value, color }: { label: string; value: string; color?: string }) {
    return (
        <div style={{
            background: "var(--surface-2)", border: "1px solid var(--border)",
            borderRadius: 10, padding: "10px 16px", display: "flex",
            flexDirection: "column", gap: 2, minWidth: 110,
        }}>
            <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
            <span style={{ fontSize: "1.1rem", fontWeight: 700, fontFamily: "var(--mono)", color: color || "var(--text)" }}>{value}</span>
        </div>
    );
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

    // Merge HNSW + TAHNSW curves for the Recall-QPS chart
    const recallQpsCurve = data
        ? data.hnsw.curve.map((h, i) => ({
            recall: h.recall,
            hnsw_qps: h.qps,
            tahnsw_qps: data.tahnsw.curve[i]?.qps ?? 0,
        }))
        : [];

    const buildBarData = data
        ? [
            { name: "HNSW", time: data.hnsw.build_time },
            { name: "TAHNSW", time: data.tahnsw.build_time },
        ]
        : [];

    const pieData = data
        ? [
            { name: "Hub", value: data.tahnsw.stats.hub_pct, fill: "#6c63ff" },
            { name: "Leaf", value: data.tahnsw.stats.leaf_pct, fill: "#00d4ff" },
            { name: "Normal", value: data.tahnsw.stats.normal_pct, fill: "#3a3a52" },
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
                <div style={{ textAlign: "center", marginBottom: 36 }}>
                    <SectionTitle>📊 Performance Metrics</SectionTitle>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
                        Benchmarked on {data ? `${data.hnsw.curve.length} ef-sweep points over 200 queries` : "movie corpus"}
                    </p>
                </div>

                {loading && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", padding: "40px 0", color: "var(--text-muted)", fontSize: "0.88rem" }}>
                        <div className="pulse-dot" />
                        Running benchmark sweep…
                    </div>
                )}

                {error && <p style={{ color: "var(--warning)", textAlign: "center" }}>{error}</p>}

                {data && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                        {/* Row 1: Recall-QPS curve + Build Time */}
                        <div style={{ display: "flex", gap: 20 }}>
                            {/* Recall-QPS */}
                            <div className="card" style={{ flex: 2, padding: "20px 24px" }}>
                                <h3 style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: 4, color: "var(--text)" }}>Recall vs. QPS</h3>
                                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 16 }}>Higher curve = better performance</p>
                                <ResponsiveContainer width="100%" height={220}>
                                    <LineChart data={recallQpsCurve} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                        <XAxis
                                            dataKey="recall"
                                            type="number"
                                            domain={["auto", "auto"]}
                                            tickFormatter={(v) => v.toFixed(2)}
                                            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                                            label={{ value: "Recall @ k", position: "insideBottom", offset: -1, fill: "var(--text-muted)", fontSize: 11 }}
                                        />
                                        <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                                        <Tooltip
                                            contentStyle={CUSTOM_TOOLTIP_STYLE}
                                            formatter={(val: number, name: string) => [
                                                `${val.toFixed(0)} QPS`,
                                                name === "hnsw_qps" ? "HNSW" : "TAHNSW",
                                            ]}
                                            labelFormatter={(l) => `Recall: ${Number(l).toFixed(4)}`}
                                        />
                                        <Line type="monotone" dataKey="hnsw_qps" stroke="var(--hnsw)" strokeWidth={2} dot={{ r: 3, fill: "var(--hnsw)" }} name="hnsw_qps" />
                                        <Line type="monotone" dataKey="tahnsw_qps" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 3.5, fill: "var(--primary)" }} name="tahnsw_qps" />
                                    </LineChart>
                                </ResponsiveContainer>
                                <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
                                    {[{ color: "var(--hnsw)", label: "HNSW" }, { color: "var(--primary)", label: "TAHNSW" }].map(l => (
                                        <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                            <div style={{ width: 20, height: 2, background: l.color, borderRadius: 1 }} />
                                            {l.label}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Build time */}
                            <div className="card" style={{ flex: 1, padding: "20px 24px" }}>
                                <h3 style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: 4, color: "var(--text)" }}>Index Build Time</h3>
                                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 16 }}>Seconds to build on corpus</p>
                                <ResponsiveContainer width="100%" height={180}>
                                    <BarChart data={buildBarData} layout="vertical" margin={{ left: 8, right: 24 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                                        <XAxis type="number" tick={{ fill: "var(--text-muted)", fontSize: 11 }} tickFormatter={(v) => `${v.toFixed(1)}s`} />
                                        <YAxis dataKey="name" type="category" tick={{ fill: "var(--text)", fontSize: 12, fontWeight: 600 }} width={64} />
                                        <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} formatter={(v: number) => [`${v.toFixed(3)}s`, "Build time"]} />
                                        <Bar dataKey="time" radius={[0, 6, 6, 0]}>
                                            {buildBarData.map((entry) => (
                                                <Cell key={entry.name} fill={entry.name === "HNSW" ? "var(--hnsw)" : "var(--primary)"} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                                {data && (
                                    <div style={{ marginTop: 12, padding: "8px 12px", background: "var(--surface-2)", borderRadius: 8 }}>
                                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Speedup: </span>
                                        <span style={{ fontSize: "0.88rem", fontWeight: 700, fontFamily: "var(--mono)", color: "var(--success)" }}>
                                            {data.tahnsw.build_time < data.hnsw.build_time
                                                ? `-${(100 * (1 - data.tahnsw.build_time / data.hnsw.build_time)).toFixed(1)}%`
                                                : `+${(100 * (data.tahnsw.build_time / data.hnsw.build_time - 1)).toFixed(1)}%`}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Row 2: Node classification donut + stats */}
                        <div style={{ display: "flex", gap: 20 }}>
                            <div className="card" style={{ flex: 1, padding: "20px 24px" }}>
                                <h3 style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: 4, color: "var(--text)" }}>TAHNSW Node Classification</h3>
                                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 8 }}>Based on clustering coefficient C(v)</p>
                                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                                    <ResponsiveContainer width={180} height={180}>
                                        <PieChart>
                                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" animationBegin={200} animationDuration={800}>
                                                {pieData.map((entry, index) => (
                                                    <Cell key={index} fill={entry.fill} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} formatter={(v: number) => [`${v.toFixed(1)}%`]} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                        {pieData.map((d) => (
                                            <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <div style={{ width: 10, height: 10, borderRadius: "50%", background: d.fill, flexShrink: 0 }} />
                                                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{d.name}</span>
                                                <span style={{ fontSize: "0.88rem", fontWeight: 700, fontFamily: "var(--mono)", color: "var(--text)", marginLeft: "auto" }}>{d.value.toFixed(1)}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="card" style={{ flex: 1, padding: "20px 24px" }}>
                                <h3 style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: 16, color: "var(--text)" }}>TAHNSW Key Stats</h3>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                                    <StatPill label="Mean M_eff" value={data.tahnsw.stats.mean_M_eff.toFixed(2)} color="var(--primary)" />
                                    <StatPill label="Edge Reduction" value={`${data.tahnsw.stats.edge_reduction_pct.toFixed(1)}%`} color="var(--success)" />
                                    <StatPill label="Hub Nodes" value={`${data.tahnsw.stats.hub_pct.toFixed(1)}%`} color="var(--accent)" />
                                    <StatPill label="Leaf Nodes" value={`${data.tahnsw.stats.leaf_pct.toFixed(1)}%`} color="var(--primary)" />
                                    <StatPill label="TAHNSW Build" value={`${data.tahnsw.build_time.toFixed(2)}s`} />
                                    <StatPill label="HNSW Build" value={`${data.hnsw.build_time.toFixed(2)}s`} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
