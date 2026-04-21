import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TAHNSW — Topology-Aware Semantic Search",
  description: "A live showcase comparing TAHNSW and HNSW for approximate nearest-neighbour semantic search.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="grid-bg" />
        {children}
      </body>
    </html>
  );
}
