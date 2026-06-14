"""
benchmark_hub.py — does TAHNSW's topology (adaptive degree + hub/leaf split) pay
off on REAL hub-structured data (GloVe-100 word embeddings)?

GloVe is angular; we L2-normalize so L2-ranking == cosine-ranking and the existing
l2 path works. Baseline = neutral config (no hub/leaf split, fixed M) == HNSW.
We sweep cluster_radius_mult to get a genuine hub/leaf split and turn on adaptive
degree (M_alpha=1.5, M_beta=0.5). Metric is DETERMINISTIC distance-comps/query.

Output: results/hub_glove.png / .json
"""
import os, json
import numpy as np
import h5py, tahnsw_cpp

DATA, N_BASE, N_QRY, K, M, EFC = "data_real/glove-100-angular.hdf5", 100000, 1000, 10, 16, 200
EFS = [10, 15, 20, 30, 40, 60, 100, 150, 250, 400]


def load():
    with h5py.File(DATA, "r") as f:
        base = np.ascontiguousarray(f["train"][:N_BASE]).astype(np.float32)
        qry  = np.ascontiguousarray(f["test"][:N_QRY]).astype(np.float32)
    base /= (np.linalg.norm(base, axis=1, keepdims=True) + 1e-12)
    qry  /= (np.linalg.norm(qry,  axis=1, keepdims=True) + 1e-12)
    return np.ascontiguousarray(base), np.ascontiguousarray(qry)


def exact_gt(base, qry, k):
    gt = np.zeros((len(qry), k), np.int64)
    for s in range(0, len(qry), 100):
        sc = -(qry[s:s+100] @ base.T)           # unit vecs: L2 order == -cosine
        gt[s:s+100] = np.argpartition(sc, k, axis=1)[:, :k]
    return gt


def recall(p, gt):
    n, k = p.shape
    return sum(len(set(p[i]) & set(gt[i, :k])) for i in range(n)) / (n * k)


def build(base, *, mult, alpha, ma, mb, neutral):
    i = tahnsw_cpp.IndexCpp(space="l2", dim=base.shape[1])
    i.init_index(max_elements=len(base), ef_construction=EFC, M=M)
    if neutral:
        i.set_tahnsw_config(cluster_low_thresh=0.0, cluster_high_thresh=1.0,
                            M_alpha=1.0, M_beta=1.0, heuristic_alpha=1.0)
    else:
        i.set_tahnsw_config(cluster_low_thresh=0.20, cluster_high_thresh=0.70,
                            M_alpha=ma, M_beta=mb, heuristic_alpha=alpha,
                            cluster_radius_mult=mult)
    i.set_num_threads(0); i.add_items(base, np.arange(len(base)))
    return i


def curve(idx, qry, gt):
    out = []
    for ef in EFS:
        idx.set_ef(ef); idx.reset_metrics()
        lab, _ = idx.knn_query(qry, k=K)
        out.append((ef, recall(lab, gt), idx.get_tahnsw_stats()["dist_comps"] / len(qry)))
    return out


def iso(c, t):
    p = sorted((r, dc) for _, r, dc in c)
    for j in range(1, len(p)):
        if p[j][0] >= t:
            (r0, d0), (r1, d1) = p[j-1], p[j]
            return d0 + (d1-d0)*(t-r0)/max(1e-9, r1-r0)
    return float("nan")


def main():
    os.makedirs("results", exist_ok=True)
    base, qry = load(); print(f"GloVe-100 normalized: N={N_BASE} Q={N_QRY} dim={base.shape[1]}")
    gt = exact_gt(base, qry, K)

    res = {}
    nb = build(base, mult=1.0, alpha=1.0, ma=1.0, mb=1.0, neutral=True)
    res["HNSW (neutral)"] = curve(nb, qry, gt)
    print("HNSW (neutral) built")

    # find configs with a real hub/leaf split, with adaptive degree on
    for mult in [0.9, 1.0, 1.1]:
        idx = build(base, mult=mult, alpha=1.0, ma=1.5, mb=0.5, neutral=False)
        s = idx.get_tahnsw_stats(); tot = max(1, s["hub_count"]+s["leaf_count"]+s["mid_count"])
        name = f"TAHNSW mult={mult} (h/l/m={100*s['hub_count']//tot}/{100*s['leaf_count']//tot}/{100*s['mid_count']//tot}%)"
        res[name] = curve(idx, qry, gt)
        print(name, "built")
    # also adaptive degree + alpha=1.2
    idx = build(base, mult=1.0, alpha=1.2, ma=1.5, mb=0.5, neutral=False)
    res["TAHNSW mult=1.0 a=1.2"] = curve(idx, qry, gt)
    print("TAHNSW mult=1.0 a=1.2 built")

    base_iso = {t: iso(res["HNSW (neutral)"], t) for t in (0.90, 0.95, 0.99)}
    print(f"\ndist-comps/query at fixed recall (LOWER=faster). baseline=HNSW (neutral)")
    print(f"{'variant':40s} {'dc@0.90':>11} {'dc@0.95':>11} {'dc@0.99':>11}")
    for name, c in res.items():
        cells = []
        for t in (0.90, 0.95, 0.99):
            v = iso(c, t); d = 100*(v-base_iso[t])/base_iso[t] if base_iso[t]==base_iso[t] else 0
            cells.append(f"{v:7.0f}({d:+4.0f}%)")
        print(f"{name:40s} " + " ".join(cells))

    import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
    plt.figure(figsize=(9, 6))
    for name, c in res.items():
        lw = 3 if "neutral" in name else 1.8
        col = "black" if "neutral" in name else None
        plt.plot([p[1] for p in c], [p[2] for p in c], "o-", lw=lw, ms=5, color=col, label=name)
    plt.xlabel(f"recall@{K}"); plt.ylabel("mean distance comps / query (lower=faster)")
    plt.title(f"TAHNSW topology vs HNSW on hub-structured GloVe-100 (N={N_BASE:,})\nlower curve = faster, hardware-independent")
    plt.legend(fontsize=8); plt.grid(alpha=0.3); plt.xlim(0.80, 1.003)
    plt.tight_layout(); plt.savefig("results/hub_glove.png", dpi=150, bbox_inches="tight")
    json.dump(res, open("results/hub_glove.json", "w"), indent=2)
    print("\nsaved -> results/hub_glove.png / .json")


if __name__ == "__main__":
    main()
