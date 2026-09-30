"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Search, Loader2, ShieldCheck, AlertTriangle, HelpCircle } from "lucide-react";

function verifyStatus(m: any): "verified" | "flagged" | "unverified" {
  const s = m.metadata?.verification_status;
  if (s === "VERIFIED") return "verified";
  if (s === "FLAGGED") return "flagged";
  return "unverified";
}

function verifyLabel(s: "verified" | "flagged" | "unverified") {
  if (s === "verified") return "Verified";
  if (s === "flagged") return "Flagged";
  return "Unverified";
}

function verifyIcon(s: "verified" | "flagged" | "unverified") {
  if (s === "verified") return <ShieldCheck size={11} />;
  if (s === "flagged") return <AlertTriangle size={11} />;
  return <HelpCircle size={11} />;
}

function tipClass(status: string) {
  if (status === "PASS") return "tipPass";
  if (status === "FAIL") return "tipFail";
  if (status === "WARN") return "tipWarn";
  return "tipSkip";
}

function VerifyTooltip({ m }: { m: any }) {
  const raw = m.metadata?.verification_checks;
  if (!raw) return <span className="verifyTip">No verification data yet. Upload with integrity engine enabled.</span>;
  let checks: any[] = [];
  try { checks = JSON.parse(raw); } catch { return <span className="verifyTip">Verification data unreadable.</span>; }
  const score = m.metadata?.verification_score || "—";
  return (
    <span className="verifyTip">
      <div style={{ marginBottom: 6, fontWeight: 800, fontSize: 11 }}>
        Integrity Score: {score}/100
      </div>
      {checks.map((c: any, i: number) => (
        <div key={i} style={{ marginTop: 4 }}>
          <span className="tipLabel">{c.name}:</span>
          <span className={tipClass(c.status)}>{c.status}</span>
          <div style={{ color: "#8da59a", fontSize: 9, marginTop: 1 }}>{c.detail}</div>
        </div>
      ))}
    </span>
  );
}

export default function MediaLibraryClient({ initialItems, live }: { initialItems: any[]; live: boolean }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(initialItems);
  const [loading, setLoading] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  async function search(value: string) {
    setQuery(value);
    if (!live) {
      setResults(
        initialItems.filter((m) =>
          [m.title, m.project, m.location, m.activity, ...(m.tags || [])]
            .join(" ")
            .toLowerCase()
            .includes(value.toLowerCase())
        )
      );
      return;
    }
    if (!value.trim()) {
      setResults(initialItems);
      return;
    }
    setLoading(true);
    try {
      const r = await fetch(`/api/media?q=${encodeURIComponent(value)}`);
      const d = await r.json();
      setResults(d.media || []);
    } finally {
      setLoading(false);
    }
  }

  const displayed = verifiedOnly
    ? results.filter((m) => verifyStatus(m) === "verified")
    : results;

  const verifiedCount = results.filter((m) => verifyStatus(m) === "verified").length;
  const flaggedCount = results.filter((m) => verifyStatus(m) === "flagged").length;

  return (
    <>
      <div className="card">
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Search size={17} />
          <input
            className="search"
            value={query}
            onChange={(e) => search(e.target.value)}
            placeholder="Search by project, location, activity, object or visual signal…"
          />
          {loading && <Loader2 className="spin" size={17} />}
        </div>

        {/* Verified-evidence filter */}
        <div className="filterBar">
          <label className="filterToggle">
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
            />
            <span className="slider" />
          </label>
          <label
            className="filterLabel"
            onClick={() => setVerifiedOnly(!verifiedOnly)}
          >
            Show only Verified Evidence
          </label>
          <div style={{ marginLeft: "auto", display: "flex", gap: 10, fontSize: 10, fontWeight: 700 }}>
            <span style={{ color: "#2ECC71" }}>
              <ShieldCheck size={12} style={{ verticalAlign: "-2px" }} /> {verifiedCount} verified
            </span>
            {flaggedCount > 0 && (
              <span style={{ color: "#ff7b7b" }}>
                <AlertTriangle size={12} style={{ verticalAlign: "-2px" }} /> {flaggedCount} flagged
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mediaGrid section">
        {displayed.map((m) => {
          const vs = verifyStatus(m);
          return (
            <Link
              href={live ? `/media/view?id=${encodeURIComponent(m.asset_id)}` : "/upload"}
              className="card mediaCard"
              key={m.asset_id || m.id}
              style={{ textDecoration: "none", color: "inherit", display: "block" }}
            >
              <div className="mediaThumb">
                {m.resource_type === "video" ? (
                  <video
                    src={m.src}
                    muted
                    playsInline
                    preload="metadata"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <img src={m.src} alt={m.title} />
                )}

                {/* Verification badge */}
                <span className={`verifyBadge ${vs}`}>
                  <span className="verifyScore">
                    {vs === "verified" ? "✓" : vs === "flagged" ? "!" : "?"}
                  </span>
                  {verifyLabel(vs)}
                  <VerifyTooltip m={m} />
                </span>

                <span className="mediaOverlay">
                  <ArrowUpRight size={18} /> Open evidence
                </span>
              </div>
              <div className="mediaInfo">
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="badge">
                    {m.type || m.resource_type || "Media"}
                  </span>
                  <span className="muted">
                    {m.score ? `${m.score}% match` : "Live asset"}
                  </span>
                </div>
                <h3 style={{ marginTop: 10 }}>{m.title}</h3>
                <p className="muted">
                  {m.project} · {m.location}
                </p>
                <div className="pillRow">
                  {(m.tags || []).map((t: string) => (
                    <span className="badge" key={t}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {!displayed.length && (
        <div className="card section emptyState">
          <h3>{verifiedOnly ? "No verified evidence" : "No matching evidence"}</h3>
          <p className="muted">
            {verifiedOnly
              ? "Turn off the verified-only filter or upload evidence with integrity verification."
              : "Try a different project, location, tag or visual description."}
          </p>
        </div>
      )}
    </>
  );
}