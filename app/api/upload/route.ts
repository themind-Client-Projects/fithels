import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
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

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

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

    const ext = ALLOWED_TYPES[file.type];
    if (!ext) {
      return NextResponse.json(
        { error: "Unsupported file type. Allowed: JPEG, PNG, WebP, GIF, AVIF." },
        { status: 415 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File is too large. Maximum size is 5MB." },
        { status: 413 }
      );
    }

    const bucketId = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "fit";

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
