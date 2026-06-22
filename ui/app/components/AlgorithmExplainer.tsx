"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const CONTRIBUTIONS = [
    {
        number: "01",
        title: "Topology-Aware Layer Assignment",
        icon: "🔢",
        color: "#6c63ff",
        short: "Replaces random layer draw with clustering coefficient C(v)",
        detail: `In standard HNSW, every node is assigned to a layer using an exponential random draw — completely agnostic to the semantic structure of the data.

TAHNSW computes the local clustering coefficient C(v) for each node during insertion:
• C(v) > 0.70 → Leaf node (assigned only to Layer 0, no upper layers)
• C(v) < 0.20 → Hub node (promoted to higher layers, bridging clusters)
• Otherwise → Normal node (standard layer assignment)

This means nodes that are "well-connected locally" (deep inside a cluster) stay close to the data, while nodes that bridge multiple clusters become the navigational hubs — mirroring how the data is actually structured.`,
    },
    {
        number: "02",
        title: "Adaptive Degree M per Node",
        icon: "🔗",
        color: "#00d4ff",
        short: "Replaces fixed M=16 with M(v) derived from betweenness centrality",
        detail: `Standard HNSW assigns every node the same number of outgoing edges (M=16). This is wasteful: a hub node bridging clusters needs more edges (high betweenness), while a leaf node deep inside one cluster needs far fewer.

TAHNSW computes an approximate betweenness centrality score using BFS sketches and derives:
• Hub nodes: M_eff = M × M_alpha (e.g. 1.5× = 24 connections)
• Leaf nodes: M_eff = M × M_beta (e.g. 0.5× = 8 connections)

This reduces the total edge count by ~26% on clustered data, speeding up construction while maintaining recall — because the edges that matter most (hub-to-hub long-range links) are preserved.

In the C++ implementation, this is done during a single-pass construction with O(N) memory overhead for the betweenness sketches.`,
    },
    {
        number: "03",
        title: "RNG Edge Pruning at Layer 0",
        icon: "✂️",
        color: "#00c48c",
        short: "Removes dominated edges after neighbor selection using RNG criterion",
        detail: `After all neighbors are selected for a node at Layer 0, TAHNSW applies the Relative Neighborhood Graph (RNG) pruning criterion:

An edge (u, v) is removed if there exists a third node w such that:
  dist(u, w) < dist(u, v)  AND  dist(v, w) < dist(u, v)

This removes "dominated" edges — connections that are redundant because a shorter path already exists through a third node. The result is a sparser, more navigable graph where each hop carries more information.

Combined with Contribution 2, this reduces total edges at Layer 0 by up to 30% while keeping or improving recall on clustered embedding distributions. The C++ implementation applies RNG pruning in a post-processing pass after all neighbors are selected, using an angular distance check to avoid removing edges that would create disconnected components.`,
    },
];

export default function AlgorithmExplainer() {
    const [open, setOpen] = useState<number | null>(null);

    return (
        <div style={{ width: "100%", maxWidth: 1100 }}>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>
                    🧠 How TAHNSW Works
                </h2>
                <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
                    Three targeted improvements over HNSW — click each to expand
                </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {CONTRIBUTIONS.map((c, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: i * 0.1 }}
                        className="card"
                        style={{ overflow: "hidden" }}
                    >
                        {/* Header */}
                        <button
                            onClick={() => setOpen(open === i ? null : i)}
                            style={{
                                width: "100%",
                                background: "none",
                                border: "none",
                                padding: "18px 24px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: 16,
                                textAlign: "left",
                            }}
                        >
                            <span
                                style={{
                                    fontFamily: "var(--mono)",
                                    fontSize: "0.8rem",
                                    fontWeight: 700,
                                    color: c.color,
                                    background: `${c.color}15`,
                                    border: `1px solid ${c.color}30`,
                                    borderRadius: 8,
                                    padding: "4px 10px",
                                    flexShrink: 0,
                                }}
                            >
                                {c.number}
                            </span>
                            <span style={{ fontSize: "1.3rem" }}>{c.icon}</span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--text)" }}>{c.title}</div>
                                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 2 }}>{c.short}</div>
                            </div>
                            <motion.div
                                animate={{ rotate: open === i ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
                                style={{ color: "var(--text-muted)", flexShrink: 0 }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="m6 9 6 6 6-6" />
                                </svg>
                            </motion.div>
                        </button>

                        {/* Detail */}
                        <AnimatePresence initial={false}>
                            {open === i && (
                                <motion.div
                                    key="content"
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.28, ease: "easeInOut" }}
                                    style={{ overflow: "hidden" }}
                                >
                                    <div
                                        style={{
                                            padding: "0 24px 20px 24px",
                                            borderTop: `1px solid ${c.color}20`,
                                            marginTop: 0,
                                        }}
                                    >
                                        <div
                                            style={{
                                                marginTop: 16,
                                                background: "var(--surface-2)",
                                                borderRadius: 10,
                                                padding: "16px 20px",
                                                borderLeft: `3px solid ${c.color}`,
                                            }}
                                        >
                                            {c.detail.split("\n").map((line, li) => (
                                                <p
                                                    key={li}
                                                    style={{
                                                        color: line.startsWith("•") ? "var(--text)" : "var(--text-muted)",
                                                        fontSize: "0.83rem",
                                                        lineHeight: 1.7,
                                                        marginBottom: line === "" ? 8 : 0,
                                                        paddingLeft: line.startsWith("•") ? 8 : 0,
                                                    }}
                                                >
                                                    {line}
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
