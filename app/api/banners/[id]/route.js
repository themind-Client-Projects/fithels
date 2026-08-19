import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-utils";
import { parseBannerPlacement } from "@/lib/banners/placement";

export async function PUT(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "EMPLOYEE")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const data = await request.json();

    const updatedBanner = await prisma.banner.update({
      where: { id },
      data: {
        titleEn: data.titleEn !== undefined ? data.titleEn : undefined,
        titleAr: data.titleAr !== undefined ? data.titleAr : undefined,
        btnTextEn: data.btnTextEn !== undefined ? data.btnTextEn : undefined,
        btnTextAr: data.btnTextAr !== undefined ? data.btnTextAr : undefined,
        subtitleEn: data.subtitleEn !== undefined ? data.subtitleEn || null : undefined,
        subtitleAr: data.subtitleAr !== undefined ? data.subtitleAr || null : undefined,
        image: data.image !== undefined ? data.image : undefined,
        link: data.link !== undefined ? data.link : undefined,
        isActive: data.isActive !== undefined ? data.isActive : undefined,
        order: data.order !== undefined ? data.order : undefined,
        // undefined when the value is missing OR unrecognised, so a bad payload
        // leaves the column as it was instead of relocating the banner.
        placement: parseBannerPlacement(data.placement),
      },
    });

    return NextResponse.json(updatedBanner);
  } catch (error) {
    console.error("Error updating banner:", error);
    return NextResponse.json({ error: "Failed to update banner" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "EMPLOYEE")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    await prisma.banner.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting banner:", error);
    return NextResponse.json({ error: "Failed to delete banner" }, { status: 500 });
  }
}
