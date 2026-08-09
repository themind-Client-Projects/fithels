import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-utils";

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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const newBanner = await prisma.banner.create({
      data: {
        titleEn: data.titleEn || null,
        titleAr: data.titleAr || null,
        btnTextEn: data.btnTextEn || null,
        btnTextAr: data.btnTextAr || null,
        image: data.image || "",
        link: data.link || "#",
        isActive: data.isActive !== undefined ? data.isActive : true,
        order: data.order || 0,
      },
    });

    return NextResponse.json(newBanner, { status: 201 });
  } catch (error) {
    console.error("Error creating banner:", error);
    return NextResponse.json({ error: "Failed to create banner" }, { status: 500 });
  }
}
