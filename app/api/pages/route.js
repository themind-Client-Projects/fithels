import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-utils";

export async function GET(request) {
  try {
    const pages = await prisma.pageContent.findMany();
    return NextResponse.json(pages);
  } catch (error) {
    console.error("Error fetching pages:", error);
    return NextResponse.json({ error: "Failed to fetch pages" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getAuthUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "EMPLOYEE")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const newPage = await prisma.pageContent.create({
      data: {
        slug: data.slug,
        titleEn: data.titleEn || "",
        titleAr: data.titleAr || "",
        contentEn: data.contentEn || "",
        contentAr: data.contentAr || "",
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });

    return NextResponse.json(newPage, { status: 201 });
  } catch (error) {
    console.error("Error creating page:", error);
    return NextResponse.json({ error: "Failed to create page" }, { status: 500 });
  }
}
