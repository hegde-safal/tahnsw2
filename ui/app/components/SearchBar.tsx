"use client";

import { useState, useEffect, useRef } from "react";

const EXAMPLES = [
    "space adventure with astronauts",
    "love story in Paris",
    "heist with a twist ending",
    "artificial intelligence and humanity",
    "survival in the wilderness",
    "war drama about sacrifice",
    "time travel paradox",
];

interface Props {
    onSearch: (query: string) => void;
    disabled: boolean;
}

export default function SearchBar({ onSearch, disabled }: Props) {
    const [value, setValue] = useState("");
    const [placeholder, setPlaceholder] = useState("");
    const [exIdx, setExIdx] = useState(0);
    const [charIdx, setCharIdx] = useState(0);
    const [typing, setTyping] = useState(true);
    const inputRef = useRef<HTMLInputElement>(null);

    // Typewriter effect on placeholder
    useEffect(() => {
        if (value) return; // don't animate if user has typed
        const example = EXAMPLES[exIdx];
        let timeout: NodeJS.Timeout;

        if (typing) {
            if (charIdx < example.length) {
                timeout = setTimeout(() => {
                    setPlaceholder(example.slice(0, charIdx + 1));
                    setCharIdx((c) => c + 1);
                }, 45);
            } else {
                timeout = setTimeout(() => setTyping(false), 2000);
            }
        } else {
            if (charIdx > 0) {
                timeout = setTimeout(() => {
                    setPlaceholder(example.slice(0, charIdx - 1));
                    setCharIdx((c) => c - 1);
                }, 20);
            } else {
                setExIdx((i) => (i + 1) % EXAMPLES.length);
                setTyping(true);
            }
        }
        return () => clearTimeout(timeout);
    }, [value, charIdx, typing, exIdx]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (value.trim() && !disabled) onSearch(value.trim());
    };

    return (
        <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: 680 }}>
            <div
                style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    background: "var(--surface)",
                    border: "1.5px solid",
                    borderColor: disabled ? "var(--border)" : "rgba(108,99,255,0.5)",
                    borderRadius: 16,
                    padding: "6px 8px 6px 20px",
                    transition: "all 0.3s ease",
                    boxShadow: disabled ? "none" : "0 0 40px rgba(108,99,255,0.18), 0 0 80px rgba(108,99,255,0.08)",
                }}
            >
                {/* Search icon */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                </svg>

                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={placeholder || "Search movies…"}
                    disabled={disabled}
                    style={{
                        flex: 1,
                        background: "transparent",
                        border: "none",
                        outline: "none",
                        color: "var(--text)",
                        fontSize: "1rem",
                        fontFamily: "var(--font)",
                        caretColor: "var(--primary)",
                    }}
                />

                {value && (
                    <button
                        type="button"
                        onClick={() => setValue("")}
                        style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "var(--text-muted)",
                            padding: "4px",
                            display: "flex",
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                    </button>
                )}

                <button
                    type="submit"
                    disabled={disabled || !value.trim()}
                    style={{
                        background: disabled || !value.trim() ? "var(--surface-2)" : "var(--primary)",
                        border: "none",
                        borderRadius: 10,
                        padding: "10px 22px",
                        color: disabled || !value.trim() ? "var(--text-muted)" : "white",
                        fontFamily: "var(--font)",
                        fontSize: "0.88rem",
                        fontWeight: 600,
                        cursor: disabled || !value.trim() ? "not-allowed" : "pointer",
                        transition: "all 0.2s ease",
                        whiteSpace: "nowrap",
                        boxShadow: disabled || !value.trim() ? "none" : "0 0 16px rgba(108,99,255,0.4)",
                    }}
                >
                    Search
                </button>
            </div>

            {/* Example pills */}
            <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap", justifyContent: "center" }}>
                {EXAMPLES.slice(0, 4).map((ex) => (
                    <button
                        key={ex}
                        type="button"
                        onClick={() => { setValue(ex); onSearch(ex); }}
                        disabled={disabled}
                        style={{
                            background: "var(--surface)",
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                            padding: "5px 14px",
                            color: "var(--text-muted)",
                            fontFamily: "var(--font)",
                            fontSize: "0.78rem",
                            cursor: disabled ? "not-allowed" : "pointer",
                            transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                            if (!disabled) {
                                (e.target as HTMLButtonElement).style.borderColor = "var(--primary)";
                                (e.target as HTMLButtonElement).style.color = "var(--primary)";
                            }
                        }}
                        onMouseLeave={(e) => {
                            (e.target as HTMLButtonElement).style.borderColor = "var(--border)";
                            (e.target as HTMLButtonElement).style.color = "var(--text-muted)";
                        }}
                    >
                        {ex}
                    </button>
                ))}
            </div>
        </form>
    );
}
