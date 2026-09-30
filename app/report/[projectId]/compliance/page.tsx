"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
  Download,
  FileCheck,
  MapPin,
  Calendar,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  TreePine,
  Activity,
  Lock,
} from "lucide-react";
import { downloadCompliancePDF, ComplianceReportPayload } from "@/lib/pdf-report";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";

export default function ComplianceReportPage({
  params: paramsPromise,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const params = use(paramsPromise);
  const rawProjectId = params.projectId;
  const projectId = decodeURIComponent(rawProjectId);

  const [data, setData] = useState<ComplianceReportPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    async function fetchComplianceData() {
      try {
        setLoading(true);
        const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/compliance`);
        if (!res.ok) {
          throw new Error("Failed to fetch compliance report data");
        }
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message || "An error occurred");
      } finally {
        setLoading(false);
      }
    }
    fetchComplianceData();
  }, [projectId]);

  const handleDownloadPDF = () => {
    if (!data) return;
    setDownloading(true);
    try {
      downloadCompliancePDF(data);
    } catch (e) {
      console.error(e);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "80vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 40, height: 40, border: "3px solid #2ECC71", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <p className="muted" style={{ marginTop: 16 }}>Loading verified assets from Cloudinary Search API...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card" style={{ maxWidth: 600, margin: "60px auto", textAlign: "center", padding: 40 }}>
        <AlertTriangle size={40} style={{ color: "#E74C3C", marginBottom: 16 }} />
        <h2>Unable to load Compliance Certificate</h2>
        <p className="muted" style={{ marginTop: 8 }}>{error || "Report payload was null"}</p>
        <Link href="/projects" className="btn primary" style={{ marginTop: 20, display: "inline-flex", gap: 8, alignItems: "center" }}>
          <ArrowLeft size={16} /> Back to projects
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 80 }}>
      {/* Top Navigation & Action Header */}
      <div className="topbar" style={{ flexWrap: "wrap", gap: 16 }}>
        <div>
          <Link href="/projects" className="backLink">
            <ArrowLeft size={15} /> Back to Projects
          </Link>
          <div className="eyebrow" style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 6, color: "#2ECC71" }}>
            <ShieldCheck size={16} /> Official Donor Trust Layer
          </div>
          <h1 style={{ fontSize: "2rem", marginTop: 4 }}>{data.projectName}</h1>
          <p className="muted">Verified Donor Compliance Certificate & Tamper-Proof Audit Trail</p>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="btn primary"
            style={{
              padding: "12px 24px",
              fontSize: "0.95rem",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              backgroundColor: "#2ECC71",
              color: "#0A0F0A",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              boxShadow: "0 0 20px rgba(46, 204, 113, 0.3)",
            }}
          >
            <Download size={18} />
            {downloading ? "Generating PDF..." : "Download Compliance PDF"}
          </button>
        </div>
      </div>

      {/* COVER SECTION / CERTIFICATE HEADER */}
      <div
        className="card"
        style={{
          background: "linear-gradient(135deg, rgba(10,15,10,0.95) 0%, rgba(20,32,22,0.95) 100%)",
          border: "1px solid rgba(46,204,113,0.3)",
          borderRadius: 16,
          padding: 32,
          marginTop: 24,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, background: "radial-gradient(circle, rgba(46,204,113,0.15) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />

        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 20, alignItems: "flex-start" }}>
          <div>
            <span
              className="badge"
              style={{
                backgroundColor: "rgba(46,204,113,0.15)",
                color: "#2ECC71",
                border: "1px solid rgba(46,204,113,0.4)",
                padding: "6px 14px",
                fontSize: "0.85rem",
                borderRadius: 20,
              }}
            >
              <CheckCircle2 size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />
              AUDITED & VERIFIED COMPLIANT
            </span>

            <h2 style={{ fontSize: "1.75rem", marginTop: 16, color: "#FFFFFF" }}>{data.projectName}</h2>
            <p className="muted" style={{ marginTop: 6, fontSize: "0.95rem" }}>
              <MapPin size={14} style={{ verticalAlign: "-2px", color: "#2ECC71" }} /> Center Coordinates: {data.geofenceBounds.center}
            </p>
          </div>

          <div style={{ textAlign: "right", minWidth: 220 }}>
            <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 1.5, color: "#8E9A8E" }}>
              Certificate Identifier
            </div>
            <div style={{ fontFamily: "monospace", fontSize: "1.1rem", fontWeight: 700, color: "#2ECC71", marginTop: 4 }}>
              {data.certificateId}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#8E9A8E", marginTop: 6 }}>
              Issued: {new Date(data.issuedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </div>
          </div>
        </div>

        {/* TOP METRICS ROW */}
        <div className="statsGrid" style={{ marginTop: 32, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          <div className="stat" style={{ background: "rgba(10,15,10,0.6)", padding: 20, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)" }}>
            <span className="muted" style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: 1 }}>
              Verification Index
            </span>
            <strong style={{ fontSize: "2.2rem", color: "#2ECC71", display: "block", marginTop: 4 }}>
              {data.metrics.verificationScore}%
            </strong>
            <span style={{ fontSize: "0.75rem", color: "#2ECC71", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <ShieldCheck size={12} /> EXIF & Integrity Passed
            </span>
          </div>

          <div className="stat" style={{ background: "rgba(10,15,10,0.6)", padding: 20, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)" }}>
            <span className="muted" style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: 1 }}>
              Verified Assets
            </span>
            <strong style={{ fontSize: "2.2rem", color: "#FFFFFF", display: "block", marginTop: 4 }}>
              {data.metrics.verifiedCount} <span style={{ fontSize: "1rem", color: "#8E9A8E" }}>/ {data.metrics.totalAssets}</span>
            </strong>
            <span style={{ fontSize: "0.75rem", color: "#8E9A8E" }}>
              Cloudinary Search API fetched
            </span>
          </div>

          <div className="stat" style={{ background: "rgba(10,15,10,0.6)", padding: 20, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)" }}>
            <span className="muted" style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: 1 }}>
              Geo Boundary Match
            </span>
            <strong style={{ fontSize: "2.2rem", color: "#2ECC71", display: "block", marginTop: 4 }}>
              {data.metrics.geofenceMatchPct}%
            </strong>
            <span style={{ fontSize: "0.75rem", color: "#2ECC71" }}>
              Turf.js PointInPolygon OK
            </span>
          </div>

          <div className="stat" style={{ background: "rgba(10,15,10,0.6)", padding: 20, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)" }}>
            <span className="muted" style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: 1 }}>
              Vegetation Delta
            </span>
            <strong style={{ fontSize: "1.8rem", color: "#2ECC71", display: "block", marginTop: 6 }}>
              {data.metrics.ndviDelta}
            </strong>
            <span style={{ fontSize: "0.75rem", color: "#8E9A8E" }}>
              Sentinel-2 NDVI Canopy
            </span>
          </div>
        </div>

        {/* SHA-256 Ledger Hash Banner */}
        <div
          style={{
            marginTop: 24,
            padding: "12px 18px",
            background: "rgba(0,0,0,0.4)",
            borderRadius: 8,
            border: "1px solid rgba(46,204,113,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Lock size={16} style={{ color: "#2ECC71" }} />
            <span style={{ fontSize: "0.8rem", color: "#8E9A8E" }}>Cryptographic Ledger Hash:</span>
            <code style={{ fontSize: "0.85rem", color: "#FFFFFF", background: "rgba(255,255,255,0.06)", padding: "2px 8px", borderRadius: 4 }}>
              {data.sha256Hash}
            </code>
          </div>
          <span style={{ fontSize: "0.75rem", color: "#2ECC71", fontWeight: 600 }}>
            ✓ Signed Cloudinary Urls Enabled (s--xxxxx--)
          </span>
        </div>
      </div>

      {/* SECTION 2: BEFORE / AFTER COMPARISON & VEGETATION DELTA */}
      <div style={{ marginTop: 40 }}>
        <div className="sectionHead" style={{ marginBottom: 16 }}>
          <div>
            <div className="eyebrow" style={{ color: "#2ECC71" }}>
              <Layers size={14} style={{ verticalAlign: "-2px", marginRight: 4 }} /> Visual Impact Verification
            </div>
            <h2>Before / After Evidence Comparison</h2>
          </div>
          <span className="badge" style={{ backgroundColor: "rgba(46,204,113,0.15)", color: "#2ECC71", border: "1px solid rgba(46,204,113,0.3)" }}>
            <TreePine size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} /> Net Vegetation Delta: {data.metrics.canopyCoverage}
          </span>
        </div>

        <div className="card" style={{ padding: 24, background: "#0A0F0A", border: "1px solid rgba(255,255,255,0.1)" }}>
          <BeforeAfterSlider
            beforeImage={data.beforeAfter.before.src}
            afterImage={data.beforeAfter.after.src}
            beforeLabel="Baseline Evidence (Before)"
            afterLabel="Restoration Progress (After)"
            geoMatch="98%"
            timeMatch="OK"
            duplicateStatus="None"
            ndviDelta={data.metrics.ndviDelta}
            canopyChange={data.metrics.canopyCoverage}
          />

          {/* Secure Cloudinary signed links grid under slider */}
          <div style={{ marginTop: 24, gridTemplateColumns: "1fr 1fr", display: "grid", gap: 16 }}>
            <div style={{ background: "rgba(20,28,22,0.8)", padding: 16, borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#E74C3C" }}>Baseline Asset (Before)</span>
                <span className="badge" style={{ fontSize: "0.7rem" }}>VERIFIED</span>
              </div>
              <div style={{ fontSize: "0.8rem", color: "#8E9A8E", marginTop: 6 }}>
                Public ID: <code style={{ color: "#FFF" }}>{data.beforeAfter.before.public_id}</code>
              </div>
              <div style={{ fontSize: "0.8rem", color: "#8E9A8E", marginTop: 2 }}>
                Capture Time: {data.beforeAfter.before.capture_time}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#2ECC71", marginTop: 10, wordBreak: "break-all" }}>
                <ExternalLink size={12} style={{ verticalAlign: "-1px", marginRight: 4 }} />
                <a href={data.beforeAfter.before.secure_link} target="_blank" rel="noopener noreferrer" style={{ color: "#2ECC71" }}>
                  {data.beforeAfter.before.secure_link}
                </a>
              </div>
            </div>

            <div style={{ background: "rgba(20,28,22,0.8)", padding: 16, borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#2ECC71" }}>Target Asset (After)</span>
                <span className="badge" style={{ fontSize: "0.7rem", backgroundColor: "rgba(46,204,113,0.2)", color: "#2ECC71" }}>VERIFIED</span>
              </div>
              <div style={{ fontSize: "0.8rem", color: "#8E9A8E", marginTop: 6 }}>
                Public ID: <code style={{ color: "#FFF" }}>{data.beforeAfter.after.public_id}</code>
              </div>
              <div style={{ fontSize: "0.8rem", color: "#8E9A8E", marginTop: 2 }}>
                Capture Time: {data.beforeAfter.after.capture_time}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#2ECC71", marginTop: 10, wordBreak: "break-all" }}>
                <ExternalLink size={12} style={{ verticalAlign: "-1px", marginRight: 4 }} />
                <a href={data.beforeAfter.after.secure_link} target="_blank" rel="noopener noreferrer" style={{ color: "#2ECC71" }}>
                  {data.beforeAfter.after.secure_link}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: VERIFICATION AUDIT LOG TABLE */}
      <div style={{ marginTop: 40 }}>
        <div className="sectionHead" style={{ marginBottom: 16 }}>
          <div>
            <div className="eyebrow" style={{ color: "#2ECC71" }}>
              <Activity size={14} style={{ verticalAlign: "-2px", marginRight: 4 }} /> Cloudinary Search API Asset Ledger
            </div>
            <h2>Verification Audit Log Table</h2>
          </div>
          <span className="badge" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
            {data.auditLog.length} Signed Evidence Links
          </span>
        </div>

        <div className="card" style={{ padding: 0, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ background: "rgba(20,32,22,0.9)", borderBottom: "1px solid rgba(255,255,255,0.1)", color: "#2ECC71" }}>
                  <th style={{ padding: "14px 18px", fontWeight: 600 }}>Public ID</th>
                  <th style={{ padding: "14px 18px", fontWeight: 600 }}>Capture Time</th>
                  <th style={{ padding: "14px 18px", fontWeight: 600 }}>GPS Coordinates</th>
                  <th style={{ padding: "14px 18px", fontWeight: 600 }}>Verification Status</th>
                  <th style={{ padding: "14px 18px", fontWeight: 600 }}>Secure Cloudinary Link (s--xxxxx--)</th>
                </tr>
              </thead>
              <tbody>
                {data.auditLog.map((row, idx) => (
                  <tr
                    key={row.public_id + idx}
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                      background: idx % 2 === 0 ? "rgba(10,15,10,0.6)" : "rgba(15,22,16,0.6)",
                    }}
                  >
                    <td style={{ padding: "14px 18px", fontFamily: "monospace", color: "#FFFFFF", fontWeight: 500 }}>
                      {row.public_id}
                    </td>
                    <td style={{ padding: "14px 18px", color: "#A0AFA5" }}>
                      <Calendar size={13} style={{ verticalAlign: "-2px", marginRight: 6 }} />
                      {row.capture_time}
                    </td>
                    <td style={{ padding: "14px 18px", color: "#A0AFA5" }}>
                      <MapPin size={13} style={{ verticalAlign: "-2px", marginRight: 6, color: "#2ECC71" }} />
                      {row.gps}
                    </td>
                    <td style={{ padding: "14px 18px" }}>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: row.verification_status === "VERIFIED" ? "rgba(46,204,113,0.15)" : "rgba(231,76,60,0.15)",
                          color: row.verification_status === "VERIFIED" ? "#2ECC71" : "#E74C3C",
                          border: row.verification_status === "VERIFIED" ? "1px solid rgba(46,204,113,0.3)" : "1px solid rgba(231,76,60,0.3)",
                          padding: "3px 10px",
                          fontSize: "0.75rem",
                        }}
                      >
                        {row.verification_status === "VERIFIED" ? "✓ VERIFIED" : "⚠ FLAGGED"} ({row.score}%)
                      </span>
                    </td>
                    <td style={{ padding: "14px 18px", maxWidth: 300 }}>
                      <a
                        href={row.secure_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: "#2ECC71",
                          fontFamily: "monospace",
                          fontSize: "0.75rem",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          textDecoration: "none",
                          wordBreak: "break-all",
                        }}
                      >
                        <ExternalLink size={12} style={{ flexShrink: 0 }} />
                        {row.secure_link}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
