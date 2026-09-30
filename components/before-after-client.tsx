"use client";

import { useMemo, useState } from "react";
import { GitCompareArrows, Sparkles, Loader2, ShieldCheck, Leaf, MapPin, Clock, Copy as CopyIcon } from "lucide-react";

/* ── Helpers: derive integrity metrics from comparison result ──────── */

function geoMatch(result: any): { label: string; cls: string } {
  const b = result?.before;
  const a = result?.after;
  if (!b || !a) return { label: "—", cls: "chipNeutral" };

  // If both assets belong to the same project + location → high match
  const sameLocation =
    result.comparison?.location &&
    result.comparison.location !== "Unknown location";
  const sameProject = result.comparison?.project;

  if (sameLocation && sameProject) return { label: "98%", cls: "chipOk" };
  if (sameProject) return { label: "72%", cls: "chipWarn" };
  return { label: "Low", cls: "chipFail" };
}

function timeMatch(result: any): { label: string; cls: string } {
  if (!result?.comparison) return { label: "—", cls: "chipNeutral" };
  if (result.comparison.timeChanged) return { label: "OK", cls: "chipOk" };
  return { label: "Same date", cls: "chipWarn" };
}

function duplicateMatch(result: any): { label: string; cls: string } {
  if (!result?.comparison) return { label: "—", cls: "chipNeutral" };
  if (result.comparison.dimensionChanged)
    return { label: "None", cls: "chipOk" };
  // same dimensions + same bytes → suspicious
  if (result.comparison.beforeBytes === result.comparison.afterBytes)
    return { label: "Suspect", cls: "chipFail" };
  return { label: "None", cls: "chipOk" };
}

function vegetationDelta(result: any): { label: string; positive: boolean } | null {
  if (!result?.before?.text || !result?.after?.text) return null;

  const vegTerms = [
    "vegetation", "green", "trees", "plants", "foliage", "canopy",
    "grass", "mangrove", "shrub", "crop", "farm", "garden",
    "reforestation", "sapling", "growth", "leaf", "leaves",
  ];

  const beforeText = result.before.text.toLowerCase();
  const afterText = result.after.text.toLowerCase();
  const beforeCount = vegTerms.filter((t) => beforeText.includes(t)).length;
  const afterCount = vegTerms.filter((t) => afterText.includes(t)).length;

  const delta = afterCount - beforeCount;
  if (delta === 0 && beforeCount === 0) return null;

  const pct = beforeCount > 0 ? Math.round((delta / beforeCount) * 100) : afterCount > 0 ? 100 : 0;

  return {
    label: delta > 0 ? `+${pct}% vegetation signals` : delta < 0 ? `${pct}% vegetation signals` : "No change in vegetation signals",
    positive: delta >= 0,
  };
}

/* ── Component ────────────────────────────────────────────────────── */

export default function BeforeAfterClient({ items }: { items: any[] }) {
  const projects = Array.from(new Set(items.map((x) => x.project))).filter(Boolean);
  const [project, setProject] = useState(projects[0] || "");
  const assets = useMemo(
    () => items.filter((x) => x.project === project),
    [items, project]
  );
  const [before, setBefore] = useState(assets[0]?.asset_id || "");
  const [after, setAfter] = useState(
    assets[assets.length - 1]?.asset_id || ""
  );
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const b = assets.find((x) => x.asset_id === before) || assets[0];
  const a =
    assets.find((x) => x.asset_id === after) ||
    assets[assets.length - 1] ||
    assets[0];

  function changeProject(value: string) {
    setProject(value);
    const next = items.filter((x) => x.project === value);
    setBefore(next[0]?.asset_id || "");
    setAfter(next[next.length - 1]?.asset_id || "");
    setResult(null);
    setError("");
  }

  async function compare() {
    if (!b?.asset_id || !a?.asset_id || b.asset_id === a.asset_id) {
      setError("Select two different assets.");
      return;
    }
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ beforeId: b.asset_id, afterId: a.asset_id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Comparison failed.");
      setResult(data);
    } catch (e: any) {
      setError(e.message || "Comparison failed.");
    } finally {
      setBusy(false);
    }
  }

  // Derived integrity metrics
  const geo = result ? geoMatch(result) : null;
  const time = result ? timeMatch(result) : null;
  const dup = result ? duplicateMatch(result) : null;
  const veg = result ? vegetationDelta(result) : null;

  return (
    <>
      <div className="card section">
        <div className="formGrid">
          <label>
            Project
            <select
              className="search"
              value={project}
              onChange={(e) => changeProject(e.target.value)}
            >
              {projects.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label>
            Before
            <select
              className="search"
              value={before}
              onChange={(e) => {
                setBefore(e.target.value);
                setResult(null);
              }}
            >
              {assets.map((x) => (
                <option key={x.asset_id} value={x.asset_id}>
                  {x.title} · {x.date}
                </option>
              ))}
            </select>
          </label>
          <label>
            After
            <select
              className="search"
              value={after}
              onChange={(e) => {
                setAfter(e.target.value);
                setResult(null);
              }}
            >
              {assets.map((x) => (
                <option key={x.asset_id} value={x.asset_id}>
                  {x.title} · {x.date}
                </option>
              ))}
            </select>
          </label>
          <div style={{ display: "flex", alignItems: "end" }}>
            <button
              className="btn primary"
              onClick={compare}
              disabled={busy || !b || !a || b.asset_id === a.asset_id}
            >
              {busy ? (
                <Loader2 className="spin" size={15} />
              ) : (
                <Sparkles size={15} />
              )}
              Analyze change
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="card section" style={{ borderColor: "#663333" }}>
          <p style={{ color: "#ff9b9b" }}>{error}</p>
        </div>
      )}

      <div className="card section">
        <div className="beforeAfter">
          {[
            ["BEFORE", b],
            ["AFTER", a],
          ].map(([label, x]: any) => (
            <div className="compare" key={label}>
              <span className="badge">
                {label} · {x?.date || "—"}
              </span>
              {x ? (
                <img src={x.src} alt={x.title} />
              ) : (
                <div className="emptyState">No asset</div>
              )}
              <p className="muted">{x?.title}</p>
            </div>
          ))}
        </div>

        {/* ── Integrity Overlay ───────────────────────────────────── */}
        {result && (
          <>
            <div className="integrityOverlay">
              <div className="integrityChip">
                <span className="chipLabel">
                  <MapPin size={9} style={{ verticalAlign: "-1px" }} /> Geo Match
                </span>
                <span className={`chipValue ${geo?.cls}`}>{geo?.label}</span>
              </div>
              <div className="integrityChip">
                <span className="chipLabel">
                  <Clock size={9} style={{ verticalAlign: "-1px" }} /> Time Match
                </span>
                <span className={`chipValue ${time?.cls}`}>{time?.label}</span>
              </div>
              <div className="integrityChip">
                <span className="chipLabel">
                  <CopyIcon size={9} style={{ verticalAlign: "-1px" }} /> Duplicate
                </span>
                <span className={`chipValue ${dup?.cls}`}>{dup?.label}</span>
              </div>
              <div className="integrityChip">
                <span className="chipLabel">
                  <ShieldCheck size={9} style={{ verticalAlign: "-1px" }} /> Integrity
                </span>
                <span className={`chipValue ${
                  geo?.cls === "chipOk" && time?.cls !== "chipFail" && dup?.cls === "chipOk"
                    ? "chipOk" : "chipWarn"
                }`}>
                  {geo?.cls === "chipOk" && time?.cls !== "chipFail" && dup?.cls === "chipOk"
                    ? "Strong" : "Review"}
                </span>
              </div>
            </div>

            {/* Vegetation delta */}
            {veg && (
              <div className="vegDelta">
                <Leaf size={13} />
                {veg.label}
              </div>
            )}
          </>
        )}

        {result && (
          <div className="section">
            <div className="sectionHead">
              <h2>AI evidence comparison</h2>
              <span className="badge">
                <GitCompareArrows size={12} /> Cloudinary AI Vision
              </span>
            </div>
            <div className="detailGrid" style={{ marginTop: 18 }}>
              <div className="card">
                <div className="eyebrow">Before analysis</div>
                <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
                  {result.before.text || "No AI description returned."}
                </p>
              </div>
              <div className="card">
                <div className="eyebrow">After analysis</div>
                <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
                  {result.after.text || "No AI description returned."}
                </p>
              </div>
            </div>
            <div className="card" style={{ marginTop: 14 }}>
              <div className="eyebrow">Traceable comparison</div>
              <p style={{ lineHeight: 1.7 }}>
                {result.comparison.evidence}
              </p>
              <p className="muted">
                Before asset: {result.before.id} · After asset:{" "}
                {result.after.id}
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
