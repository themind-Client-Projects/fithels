import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { getAuthUser } from "@/lib/auth-utils";

/**
 * Allowed image types. The extension is derived from this map rather than from
 * the client-supplied filename, so a crafted `file.name` cannot influence the
 * object key or the served content type.
 */
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

/**
 * Video, for banners only.
 *
 * Kept in its own map so the per-type SIZE CEILING can differ: a 5 MB limit is
 * generous for a photograph and unusable for footage, but raising the image
 * limit to match would let someone push a 40 MB "image" through every uploader
 * in the dashboard.
 *
 * MP4 (h.264) and WebM cover every browser this shop sees. QuickTime .mov is
 * excluded deliberately — phones produce it, Safari plays it, and nothing else
 * reliably does, so accepting it would ship a banner that is blank for most
 * visitors.
 */
const ALLOWED_VIDEO_TYPES: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
/**
 * A banner video is decoration that autoplays, so it is paid for by every
 * visitor on mobile data before they have chosen to watch anything. 40 MB is
 * already generous for a few seconds of loop; the real guidance is in the
 * uploader's hint text.
 */
const MAX_VIDEO_SIZE = 40 * 1024 * 1024; // 40 MB

export async function POST(request: NextRequest) {
  try {
    // This endpoint writes to public storage — admins only.
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Storage env vars are absent on a freshly created deployment. Say so
    // explicitly instead of letting the client constructor throw into the
    // generic 500 below, which gave the admin no idea what to fix.
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        {
          error: "Image storage is not configured on this deployment.",
          reason: "STORAGE_NOT_CONFIGURED",
        },
        { status: 503 }
      );
    }

    // `formData()` throws a TypeError when the request is not multipart, which
    // happened BEFORE the "no file provided" guard below could run — so a
    // malformed upload returned 500 "Internal Server Error" instead of telling
    // the caller what was wrong with their request.
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        {
          error:
            "Upload must be sent as multipart/form-data with a `file` field.",
          reason: "NOT_MULTIPART",
        },
        { status: 400 }
      );
    }

    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Video is opt-in per request: an uploader that does not ask for it cannot
    // be handed a 40 MB file by relaxing the check for everyone.
    const wantsVideo = formData.get("kind") === "video";
    const ext = wantsVideo
      ? ALLOWED_VIDEO_TYPES[file.type]
      : ALLOWED_TYPES[file.type];

    if (!ext) {
      return NextResponse.json(
        {
          error: wantsVideo
            ? "Unsupported video type. Allowed: MP4, WebM."
            : "Unsupported file type. Allowed: JPEG, PNG, WebP, GIF, AVIF.",
        },
        { status: 415 }
      );
    }

    const ceiling = wantsVideo ? MAX_VIDEO_SIZE : MAX_FILE_SIZE;
    if (file.size > ceiling) {
      return NextResponse.json(
        {
          error: `File is too large. Maximum size is ${Math.round(ceiling / 1024 / 1024)}MB.`,
        },
        { status: 413 }
      );
    }

    // Either naming, matching lib/supabase — and un-prefixed first, since this
    // is read on the server and NEXT_PUBLIC_ would only publish it needlessly.
    const bucketId =
      process.env.SUPABASE_BUCKET ||
      process.env.NEXT_PUBLIC_SUPABASE_BUCKET ||
      "fit";

    // Generate unique file name
    const timestamp = Date.now();
    const fileName = `${timestamp}-${Math.random().toString(36).substring(2, 9)}.${ext}`;

    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from(bucketId)
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

    if (error) {
      console.error("Supabase storage error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucketId)
      .getPublicUrl(fileName);

    return NextResponse.json({ url: publicUrlData.publicUrl });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
