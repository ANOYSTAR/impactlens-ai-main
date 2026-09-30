import "server-only";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point, polygon } from "@turf/helpers";

// ─── Types ───────────────────────────────────────────────────────────

export type VerificationCheck = {
  name: string;
  status: "PASS" | "FAIL" | "WARN" | "SKIP";
  detail: string;
};

export type VerificationResult = {
  status: "VERIFIED" | "FLAGGED";
  score: number;
  checks: VerificationCheck[];
  verifiedAt: string;
};

export type ProjectBoundary = {
  /** GeoJSON polygon coordinates — [[lng, lat], …] ring(s) */
  polygon?: number[][][];
  /** ISO date — earliest acceptable capture date */
  startDate?: string;
  /** ISO date — latest acceptable capture date */
  endDate?: string;
};

// ─── Project Boundary Registry ───────────────────────────────────────
// In production this would live in a database or CMS.
// Polygons use [lng, lat] order per the GeoJSON spec.

const PROJECT_BOUNDARIES: Record<string, ProjectBoundary> = {
  "Water Access — Kheri": {
    polygon: [[[80.0, 27.5], [81.5, 27.5], [81.5, 28.8], [80.0, 28.8], [80.0, 27.5]]],
    startDate: "2026-01-01",
    endDate: "2027-12-31",
  },
  "Wetland Restoration": {
    polygon: [[[83.0, 19.0], [88.0, 19.0], [88.0, 23.0], [83.0, 23.0], [83.0, 19.0]]],
    startDate: "2026-01-01",
    endDate: "2027-12-31",
  },
  "Solar Schools Initiative": {
    polygon: [[[69.0, 23.5], [77.0, 23.5], [77.0, 30.5], [69.0, 30.5], [69.0, 23.5]]],
    startDate: "2026-01-01",
    endDate: "2027-12-31",
  },
  "Green Corridor": {
    polygon: [[[72.5, 17.5], [75.0, 17.5], [75.0, 20.0], [72.5, 20.0], [72.5, 17.5]]],
    startDate: "2026-01-01",
    endDate: "2027-12-31",
  },
  "Safe Schools": {
    polygon: [[[82.5, 23.5], [88.5, 23.5], [88.5, 28.0], [82.5, 28.0], [82.5, 23.5]]],
    startDate: "2025-06-01",
    endDate: "2027-12-31",
  },
  "Coastal Resilience": {
    polygon: [[[74.5, 7.5], [78.0, 7.5], [78.0, 13.5], [74.5, 13.5], [74.5, 7.5]]],
    startDate: "2026-01-01",
    endDate: "2027-12-31",
  },
};

export function getProjectBoundary(projectName: string): ProjectBoundary {
  return PROJECT_BOUNDARIES[projectName] || {};
}

// ─── EXIF Parsing Helpers ────────────────────────────────────────────

/** Parse a single EXIF GPS rational-or-decimal value to a float. */
function parseRational(val: string | number): number {
  if (typeof val === "number") return val;
  if (typeof val === "string" && val.includes("/")) {
    const [n, d] = val.split("/").map(Number);
    return d ? n / d : NaN;
  }
  return Number(val);
}

/**
 * Convert EXIF GPS DMS (degrees/minutes/seconds) + ref to decimal degrees.
 * Accepts arrays `[deg, min, sec]` **or** a pre-computed decimal value.
 */
function toDegrees(
  ref: string | undefined,
  values: (string | number)[] | string | number,
): number | null {
  let decimal: number;

  if (Array.isArray(values)) {
    const d = parseRational(values[0]);
    const m = values.length > 1 ? parseRational(values[1]) : 0;
    const s = values.length > 2 ? parseRational(values[2]) : 0;
    decimal = d + m / 60 + s / 3600;
  } else {
    decimal = parseRational(values);
  }

  if (isNaN(decimal)) return null;
  if (ref === "S" || ref === "W") decimal = -decimal;
  return decimal;
}

/**
 * Extract GPS coordinates from Cloudinary `image_metadata`.
 * Handles multiple EXIF key naming conventions.
 */
export function extractGPS(
  meta: Record<string, any> | null | undefined,
): { lat: number; lng: number } | null {
  if (!meta) return null;

  // Cloudinary may nest GPS data under a GPSInfo key or flatten it.
  const src = meta.GPSInfo || meta;

  const latRef = src.GPSLatitudeRef ?? src["GPS:GPSLatitudeRef"];
  const lngRef = src.GPSLongitudeRef ?? src["GPS:GPSLongitudeRef"];
  const latVal = src.GPSLatitude ?? src["GPS:GPSLatitude"];
  const lngVal = src.GPSLongitude ?? src["GPS:GPSLongitude"];

  if (latVal == null || lngVal == null) return null;

  const lat = toDegrees(latRef ?? "N", latVal);
  const lng = toDegrees(lngRef ?? "E", lngVal);

  if (lat === null || lng === null) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

/**
 * Extract the original capture date from EXIF metadata.
 * Returns an ISO-8601 string or `null`.
 */
export function extractDateTimeOriginal(
  meta: Record<string, any> | null | undefined,
): string | null {
  if (!meta) return null;

  const candidates = [
    "DateTimeOriginal",
    "EXIF:DateTimeOriginal",
    "DateTimeDigitized",
    "EXIF:DateTimeDigitized",
    "DateTime",
    "EXIF:DateTime",
    "CreateDate",
  ];

  for (const key of candidates) {
    const raw = meta[key];
    if (raw && typeof raw === "string") {
      // EXIF format: "YYYY:MM:DD HH:MM:SS" → normalise to ISO
      const normalised = raw.replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3");
      const d = new Date(normalised);
      if (!isNaN(d.getTime())) return d.toISOString();
    }
  }
  return null;
}

// ─── Perceptual Hash Helpers ─────────────────────────────────────────

/** Compute Hamming distance between two hex-encoded pHash strings. */
function hammingDistance(a: string, b: string): number {
  if (!a || !b || a.length !== b.length) return Infinity;
  let distance = 0;
  for (let i = 0; i < a.length; i++) {
    let xor = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (xor) {
      distance += xor & 1;
      xor >>= 1;
    }
  }
  return distance;
}

/** Hamming-distance threshold — ≤ 10 bits is a near-duplicate. */
const PHASH_THRESHOLD = 10;

// ─── Individual Verification Checks ──────────────────────────────────

/**
 * **Check 1 — Duplicate Detection**
 *
 * Fetches all image assets (up to 500) via `adminFetch`, compares their
 * perceptual hashes against the newly uploaded asset's pHash.
 * Exact match → FAIL, near-duplicate → WARN, unique → PASS.
 */
export async function checkDuplicate(
  publicId: string,
  phash: string | undefined,
  adminFetch: (path: string) => Promise<any>,
): Promise<VerificationCheck> {
  if (!phash) {
    return { name: "duplicate", status: "SKIP", detail: "No perceptual hash available — duplicate check skipped." };
  }

  try {
    const qs = new URLSearchParams({
      max_results: "500",
      direction: "desc",
      phash: "true",
      fields: "public_id,asset_id,phash,display_name",
    });

    const data = await adminFetch(`/resources/image/upload?${qs}`);
    const resources: any[] = data?.resources || [];

    const matches: { publicId: string; distance: number }[] = [];

    for (const r of resources) {
      if (r.public_id === publicId || !r.phash) continue;
      const d = hammingDistance(phash, r.phash);
      if (d <= PHASH_THRESHOLD) matches.push({ publicId: r.public_id, distance: d });
    }

    if (matches.length === 0) {
      return { name: "duplicate", status: "PASS", detail: "No duplicates detected across the evidence library." };
    }

    const exact = matches.find((m) => m.distance === 0);
    if (exact) {
      return {
        name: "duplicate",
        status: "FAIL",
        detail: `Exact duplicate found: ${exact.publicId} (pHash identical).`,
      };
    }

    return {
      name: "duplicate",
      status: "WARN",
      detail: `${matches.length} near-duplicate(s) detected. Closest match: ${matches[0].publicId} (distance ${matches[0].distance}).`,
    };
  } catch (err: any) {
    return { name: "duplicate", status: "SKIP", detail: `Duplicate check error: ${err?.message || "unknown"}.` };
  }
}

/**
 * **Check 2 — Geofence Verification**
 *
 * Uses turf.js `booleanPointInPolygon` to verify that the EXIF GPS
 * coordinates fall inside the declared project boundary.
 */
export function checkGeoFence(
  gps: { lat: number; lng: number } | null,
  boundary: ProjectBoundary,
): VerificationCheck {
  if (!gps) {
    return {
      name: "geofence",
      status: "WARN",
      detail: "No GPS coordinates in EXIF data — location cannot be verified.",
    };
  }

  if (!boundary.polygon) {
    return {
      name: "geofence",
      status: "SKIP",
      detail: `GPS found (${gps.lat.toFixed(4)}°, ${gps.lng.toFixed(4)}°) but no project boundary is defined.`,
    };
  }

  try {
    const pt = point([gps.lng, gps.lat]);
    const poly = polygon(boundary.polygon);
    const inside = booleanPointInPolygon(pt, poly);

    return inside
      ? {
          name: "geofence",
          status: "PASS",
          detail: `GPS (${gps.lat.toFixed(4)}°, ${gps.lng.toFixed(4)}°) is within the project boundary.`,
        }
      : {
          name: "geofence",
          status: "FAIL",
          detail: `GPS (${gps.lat.toFixed(4)}°, ${gps.lng.toFixed(4)}°) is OUTSIDE the project boundary.`,
        };
  } catch (err: any) {
    return { name: "geofence", status: "SKIP", detail: `Geofence check error: ${err?.message || "unknown"}.` };
  }
}

/**
 * **Check 3 — Time Anomaly Detection**
 *
 * Compares the EXIF `DateTimeOriginal` against the project's start/end
 * window.  Also flags future dates and very old (>5 yr) evidence.
 */
export function checkTimeAnomaly(
  exifDate: string | null,
  boundary: ProjectBoundary,
): VerificationCheck {
  if (!exifDate) {
    return { name: "time_anomaly", status: "WARN", detail: "No EXIF capture date — time alignment cannot be verified." };
  }

  const captured = new Date(exifDate);
  if (isNaN(captured.getTime())) {
    return { name: "time_anomaly", status: "WARN", detail: `Unparseable EXIF date: ${exifDate}.` };
  }

  const issues: string[] = [];
  const captureDay = captured.toISOString().split("T")[0];

  // Future-date guard
  if (captured > new Date()) {
    issues.push("Capture date is in the future — possible clock manipulation.");
  }

  // Stale-evidence guard (>5 years old)
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
  if (captured < fiveYearsAgo) {
    issues.push(`Photo dated ${captured.getFullYear()} may be reused or stock evidence.`);
  }

  // Project window guards
  if (boundary.startDate) {
    const start = new Date(boundary.startDate);
    if (captured < start) {
      issues.push(`Captured ${captureDay}, before project start ${boundary.startDate} — possible reuse.`);
    }
  }
  if (boundary.endDate) {
    const end = new Date(boundary.endDate);
    if (captured > end) {
      issues.push(`Captured ${captureDay}, after project end ${boundary.endDate}.`);
    }
  }

  if (issues.length) {
    return { name: "time_anomaly", status: "FAIL", detail: issues.join(" ") };
  }

  return {
    name: "time_anomaly",
    status: "PASS",
    detail: `Capture date ${captureDay} is within the expected project timeline.`,
  };
}

/**
 * **Check 4 — EXIF Presence / Stripped Detection**
 *
 * Flags images whose EXIF has been stripped (screenshots, AI-generated,
 * or intentionally scrubbed media). Videos are skipped.
 */
export function checkExifStripped(
  imageMetadata: Record<string, any> | null | undefined,
  resourceType: string,
): VerificationCheck {
  if (resourceType === "video") {
    return { name: "exif_present", status: "SKIP", detail: "EXIF check not applicable to video assets." };
  }

  if (!imageMetadata || Object.keys(imageMetadata).length === 0) {
    return {
      name: "exif_present",
      status: "FAIL",
      detail: "No EXIF metadata detected — image may be stripped, screenshot-captured, or AI-generated.",
    };
  }

  // Look for camera-identifying fields
  const idFields = [
    "Make", "Model", "DateTime", "DateTimeOriginal",
    "Software", "ExifVersion",
    "EXIF:Make", "EXIF:Model",
  ];
  const found = idFields.filter((f) => imageMetadata[f]);

  if (found.length === 0) {
    return {
      name: "exif_present",
      status: "WARN",
      detail: "EXIF metadata present but missing camera identification fields — limited authenticity verification.",
    };
  }

  const make = imageMetadata.Make || imageMetadata["EXIF:Make"] || "";
  const model = imageMetadata.Model || imageMetadata["EXIF:Model"] || "";
  const software = imageMetadata.Software || imageMetadata["EXIF:Software"] || "";

  return {
    name: "exif_present",
    status: "PASS",
    detail: `EXIF intact — Device: ${make} ${model}${software ? ` (${software})` : ""}. ${found.length} ID field(s) present.`,
  };
}

// ─── Main Verification Runner ────────────────────────────────────────

/**
 * Orchestrates all four integrity checks and computes a composite score.
 *
 * Scoring: PASS = 25 · WARN = 15 · SKIP = 20 (neutral) · FAIL = 0
 * Max possible score: 100.  Any FAIL → status = FLAGGED.
 */
export async function runVerification(
  publicId: string,
  resourceType: string,
  phash: string | undefined,
  imageMetadata: Record<string, any> | null | undefined,
  projectName: string,
  adminFetch: (path: string) => Promise<any>,
): Promise<VerificationResult> {
  const boundary = getProjectBoundary(projectName);
  const gps = extractGPS(imageMetadata);
  const exifDate = extractDateTimeOriginal(imageMetadata);

  const checks = await Promise.all([
    checkDuplicate(publicId, phash, adminFetch),
    Promise.resolve(checkGeoFence(gps, boundary)),
    Promise.resolve(checkTimeAnomaly(exifDate, boundary)),
    Promise.resolve(checkExifStripped(imageMetadata, resourceType)),
  ]);

  const scoreMap: Record<string, number> = { PASS: 25, WARN: 15, SKIP: 20, FAIL: 0 };
  const score = checks.reduce((sum, c) => sum + (scoreMap[c.status] ?? 0), 0);
  const hasFail = checks.some((c) => c.status === "FAIL");

  return {
    status: hasFail ? "FLAGGED" : "VERIFIED",
    score,
    checks,
    verifiedAt: new Date().toISOString(),
  };
}
