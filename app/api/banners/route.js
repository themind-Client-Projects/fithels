import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-utils";
import {
  parseBannerPlacement,
  DEFAULT_BANNER_PLACEMENT,
} from "@/lib/banners/placement";

/**
 * A banner's text colour, sanitised.
 *
 * The value is written straight into a CSS `color`, so it can never be taken
 * from a request body as-is. Anything that is not a plain hex becomes null,
 * which the banners render as white — the colour they have always been.
 */
/**
 * A banner's video URL, or null.
 *
 * Only a path or URL from our own uploader is acceptable — this ends up as a
 * <video src>, and accepting arbitrary text would let a request point the
 * storefront at someone else's server.
 */
function parseMediaUrl(value) {
  if (value === null || value === undefined || value === "") return null;
  const v = String(value).trim();
  if (v.startsWith("/")) return v;
  try {
    const u = new URL(v);
    return u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

function parseTextColor(value) {
  if (value === null || value === undefined || value === "") return null;
  const t = String(value).trim().replace(/^#/, "");
  if (!/^(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(t)) return null;
  const full = t.length === 3 ? t.split("").map((c) => c + c).join("") : t;
  return `#${full.toLowerCase()}`;
}


export async function GET(request) {
  try {
    const wantsInactive =
      new URL(request.url).searchParams.get("includeInactive") === "true";

    if (wantsInactive) {
      const user = await getAuthUser();
      if (!user || (user.role !== "ADMIN" && user.role !== "EMPLOYEE")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const banners = await prisma.banner.findMany({
      where: wantsInactive ? {} : { isActive: true },
      orderBy: { order: "asc" },
    });
    return NextResponse.json(banners);
  } catch (error) {
    console.error("Error fetching banners:", error);
    return NextResponse.json({ error: "Failed to fetch banners" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getAuthUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "EMPLOYEE")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = await request.json();
    const newBanner = await prisma.banner.create({
      data: {
        titleEn: data.titleEn || null,
        titleAr: data.titleAr || null,
        btnTextEn: data.btnTextEn || null,
        btnTextAr: data.btnTextAr || null,
        subtitleEn: data.subtitleEn || null,
        subtitleAr: data.subtitleAr || null,
        image: data.image || "",
        link: data.link || "#",
        isActive: data.isActive !== undefined ? data.isActive : true,
        order: data.order || 0,
        // Unrecognised values fall back to the schema default rather than being
        // written through, so a bad payload cannot invent a placement.
        placement:
          parseBannerPlacement(data.placement) ?? DEFAULT_BANNER_PLACEMENT,
        textColor: parseTextColor(data.textColor),
        video: parseMediaUrl(data.video),
      },
    });

    return NextResponse.json(newBanner, { status: 201 });
  } catch (error) {
    console.error("Error creating banner:", error);
    return NextResponse.json({ error: "Failed to create banner" }, { status: 500 });
  }
}
