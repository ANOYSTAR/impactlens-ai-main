import { NextResponse } from "next/server";
import {
  admin,
  getCloudinaryAssetFull,
  updateCloudinaryContext,
} from "@/lib/cloudinary-data";
import { runVerification } from "@/lib/verification";

export async function POST(req: Request) {
  const {
    assetId,
    publicId,
    project = "Unassigned",
  } = await req.json().catch(() => ({}));

  if (!assetId && !publicId) {
    return NextResponse.json(
      { error: "assetId or publicId is required." },
      { status: 400 },
    );
  }

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "Cloudinary environment variables are missing." },
      { status: 500 },
    );
  }

  try {
    // ── 1. Fetch full asset details (EXIF, pHash, colors) ──────────
    let resource: any = null;

    if (assetId) {
      resource = await getCloudinaryAssetFull(assetId);
    }

    // Fallback: look up by public_id + resource type probing
    if (!resource && publicId) {
      for (const resType of ["image", "video"]) {
        try {
          const r = await admin(
            `/resources/${resType}/upload/${encodeURIComponent(publicId)}?image_metadata=true&phash=true&colors=true`,
          );
          if (r?.public_id) {
            resource = r;
            break;
          }
        } catch {
          /* try next resource type */
        }
      }
    }

    if (!resource) {
      return NextResponse.json(
        { error: "Asset not found in Cloudinary." },
        { status: 404 },
      );
    }

    // ── 2. Run the four integrity checks ───────────────────────────
    const adminFetch = (path: string) => admin(path) as Promise<any>;

    const verification = await runVerification(
      resource.public_id,
      resource.resource_type || "image",
      resource.phash,
      resource.image_metadata || {},
      project,
      adminFetch,
    );

    // ── 3. Persist verification result to Cloudinary context ───────
    const resolvedAssetId = assetId || resource.asset_id;
    try {
      await updateCloudinaryContext(resolvedAssetId, {
        verification_status: verification.status,
        verification_score: String(verification.score),
        verification_checks: JSON.stringify(verification.checks).slice(0, 8000),
        verified_at: verification.verifiedAt,
      });
    } catch {
      // Verification still succeeded even if context persistence fails.
    }

    return NextResponse.json({
      success: true,
      verification,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Verification failed." },
      { status: 500 },
    );
  }
}
