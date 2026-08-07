import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request, { params }) {
  try {
    const { slug } = params;
    const page = await prisma.pageContent.findUnique({
      where: { slug },
    });
    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }
    return NextResponse.json(page);
  } catch (error) {
    console.error("Error fetching page:", error);
    return NextResponse.json({ error: "Failed to fetch page" }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await auth();
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "EMPLOYEE")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = params;
    const data = await request.json();

    const updatedPage = await prisma.pageContent.update({
      where: { slug },
      data: {
        titleEn: data.titleEn !== undefined ? data.titleEn : undefined,
        titleAr: data.titleAr !== undefined ? data.titleAr : undefined,
        contentEn: data.contentEn !== undefined ? data.contentEn : undefined,
        contentAr: data.contentAr !== undefined ? data.contentAr : undefined,
        isActive: data.isActive !== undefined ? data.isActive : undefined,
      },
    });

    return NextResponse.json(updatedPage);
  } catch (error) {
    console.error("Error updating page:", error);
    return NextResponse.json({ error: "Failed to update page" }, { status: 500 });
  }
}
