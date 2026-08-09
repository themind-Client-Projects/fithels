import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-utils";

export async function GET(request) {
  try {
    // Unpublished pages are drafts. Without this filter anyone could read them
    // with a plain curl, so the dashboard's "Active" toggle hid a page from the
    // storefront while its full content stayed public here.
    const wantsInactive =
      new URL(request.url).searchParams.get("includeInactive") === "true";

    if (wantsInactive) {
      const user = await getAuthUser();
      if (!user || (user.role !== "ADMIN" && user.role !== "EMPLOYEE")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const pages = await prisma.pageContent.findMany({
      where: wantsInactive ? {} : { isActive: true },
      // Heap order meant a row jumped position on every edit, which reads as
      // data corruption to an admin.
      orderBy: { slug: "asc" },
    });
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
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
