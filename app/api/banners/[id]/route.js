import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PUT(request, { params }) {
  try {
    const session = await auth();
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "EMPLOYEE")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const data = await request.json();

    const updatedBanner = await prisma.banner.update({
      where: { id },
      data: {
        titleEn: data.titleEn !== undefined ? data.titleEn : undefined,
        titleAr: data.titleAr !== undefined ? data.titleAr : undefined,
        btnTextEn: data.btnTextEn !== undefined ? data.btnTextEn : undefined,
        btnTextAr: data.btnTextAr !== undefined ? data.btnTextAr : undefined,
        image: data.image !== undefined ? data.image : undefined,
        link: data.link !== undefined ? data.link : undefined,
        isActive: data.isActive !== undefined ? data.isActive : undefined,
        order: data.order !== undefined ? data.order : undefined,
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
    const session = await auth();
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "EMPLOYEE")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    await prisma.banner.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting banner:", error);
    return NextResponse.json({ error: "Failed to delete banner" }, { status: 500 });
  }
}
