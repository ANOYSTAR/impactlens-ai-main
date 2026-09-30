"use client";

import { useState } from "react";
import { GitCompare, MapPin, Clock, Copy, TreePine } from "lucide-react";

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
  geoMatch?: string;
  timeMatch?: string;
  duplicateStatus?: string;
  ndviDelta?: string;
  canopyChange?: string;
}

export default function BeforeAfterSlider({
  beforeImage,
  afterImage,
  beforeLabel = "Baseline (Before)",
  afterLabel = "Current (After)",
  geoMatch = "98%",
  timeMatch = "OK",
  duplicateStatus = "None",
  ndviDelta = "+0.44 (+183.3%)",
  canopyChange = "+44.2%",
}: BeforeAfterSliderProps) {
  const [sliderPos, setSliderPos] = useState(50);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSliderPos(Number(e.target.value));
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid rgba(46, 204, 113, 0.3)",
        background: "#0A0F0A",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
      }}
    >
      {/* OVERLAY BADGE BAR (PROMPT 3 & 4 REQUIREMENT) */}
      <div
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          right: 16,
          zIndex: 20,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
          pointerEvents: "none",
        }}
      >
        {/* Verification Checks Overlay */}
        <div
          style={{
            background: "rgba(10, 15, 10, 0.85)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(46, 204, 113, 0.4)",
            borderRadius: 20,
            padding: "6px 14px",
            fontSize: "0.8rem",
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            gap: 12,
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
          }}
        >
          <span>
            <MapPin size={13} style={{ verticalAlign: "-2px", color: "#2ECC71", marginRight: 4 }} />
            Geo Match: <strong style={{ color: "#2ECC71" }}>{geoMatch}</strong>
          </span>
          <span style={{ opacity: 0.3 }}>|</span>
          <span>
            <Clock size={13} style={{ verticalAlign: "-2px", color: "#2ECC71", marginRight: 4 }} />
            Time Match: <strong style={{ color: "#2ECC71" }}>{timeMatch}</strong>
          </span>
          <span style={{ opacity: 0.3 }}>|</span>
          <span>
            <Copy size={13} style={{ verticalAlign: "-2px", color: "#2ECC71", marginRight: 4 }} />
            Duplicate: <strong style={{ color: "#2ECC71" }}>{duplicateStatus}</strong>
          </span>
        </div>

        {/* Vegetation Delta Metric */}
        <div
          style={{
            background: "rgba(46, 204, 113, 0.15)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(46, 204, 113, 0.5)",
            borderRadius: 20,
            padding: "6px 14px",
            fontSize: "0.8rem",
            fontWeight: 600,
            color: "#2ECC71",
            display: "flex",
            alignItems: "center",
            gap: 6,
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
          }}
        >
          <TreePine size={14} />
          <span>Veg Delta: {ndviDelta}</span>
        </div>
      </div>

      {/* BEFORE / AFTER SLIDER IMAGE CONTAINER */}
      <div style={{ position: "relative", width: "100%", height: 440, userSelect: "none" }}>
        {/* AFTER IMAGE (UNDERNEATH) */}
        <img
          src={afterImage}
          alt={afterLabel}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />

        {/* BEFORE IMAGE (CLIPPED ON TOP) */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: `${sliderPos}%`,
            height: "100%",
            overflow: "hidden",
            borderRight: "2px solid #2ECC71",
            boxShadow: "4px 0 15px rgba(46, 204, 113, 0.5)",
          }}
        >
          <img
            src={beforeImage}
            alt={beforeLabel}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              maxWidth: "none",
              objectFit: "cover",
            }}
          />
        </div>

        {/* SLIDER HANDLE */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: `${sliderPos}%`,
            transform: "translate(-50%, -50%)",
            zIndex: 30,
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: "#2ECC71",
            color: "#0A0F0A",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 20px rgba(46, 204, 113, 0.8)",
            pointerEvents: "none",
          }}
        >
          <GitCompare size={20} />
        </div>

        {/* RANGE INPUT FOR INTERACTION */}
        <input
          type="range"
          min="0"
          max="100"
          value={sliderPos}
          onChange={handleSliderChange}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            opacity: 0,
            cursor: "ew-resize",
            zIndex: 40,
            margin: 0,
          }}
        />

        {/* BOTTOM LABELS */}
        <div
          style={{
            position: "absolute",
            bottom: 16,
            left: 16,
            background: "rgba(0, 0, 0, 0.7)",
            padding: "4px 10px",
            borderRadius: 6,
            fontSize: "0.75rem",
            color: "#E74C3C",
            fontWeight: 600,
            zIndex: 20,
          }}
        >
          {beforeLabel}
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 16,
            right: 16,
            background: "rgba(0, 0, 0, 0.7)",
            padding: "4px 10px",
            borderRadius: 6,
            fontSize: "0.75rem",
            color: "#2ECC71",
            fontWeight: 600,
            zIndex: 20,
          }}
        >
          {afterLabel}
        </div>
      </div>
    </div>
  );
}
