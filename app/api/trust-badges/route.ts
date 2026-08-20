import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-utils";
import { translatePrismaError } from "@/lib/prisma-errors";
import {
  DEFAULT_TRUST_BADGES,
  TRUST_SLOTS,
  parseTrustSlot,
} from "@/lib/settings/trustBadges";

/**
 * The shop-wide reassurance copy, for the dashboard editor.
 *
 * The storefront does NOT come through here — it reads the rows directly with
 * getTrustBadges() in a server component, so a shopper's page render never waits
 * on an internal HTTP hop.
 */

async function requireStaff() {
  const user = await getAuthUser();
  if (!user) return { error: "Unauthorized", status: 401 as const };
  if (user.role !== "ADMIN" && user.role !== "EMPLOYEE") {
    return { error: "Forbidden", status: 403 as const };
  }
  return { user };
}

export async function GET() {
  const auth = await requireStaff();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const rows = await prisma.trustBadge.findMany();
    const bySlot = new Map(rows.map((row) => [row.slot, row]));

    // Always return all three, defaulting the ones not yet saved, so the editor
    // renders a complete form on a fresh database instead of an empty page.
    const badges = DEFAULT_TRUST_BADGES.map((fallback) => {
      const row = bySlot.get(fallback.slot);
      return row
        ? {
            slot: row.slot,
            titleAr: row.titleAr,
            titleEn: row.titleEn,
            textAr: row.textAr,
            textEn: row.textEn,
            isActive: row.isActive,
            order: row.order,
          }
        : fallback;
    });

    return NextResponse.json(badges);
  } catch (error) {
    const translated = translatePrismaError(error);
    if (translated) {
      return NextResponse.json(
        { error: translated.error, reason: translated.reason },
        { status: translated.status }
      );
    }
    console.error("Failed to read trust badges", error);
    return NextResponse.json(
      { error: "Failed to load settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const auth = await requireStaff();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const incoming = Array.isArray(body?.badges) ? body.badges : null;
    if (!incoming) {
      return NextResponse.json(
        { error: "Expected a `badges` array." },
        { status: 400 }
      );
    }

    // Validate everything BEFORE writing anything, so a bad third row cannot
    // leave the first two saved and the form half-applied.
    const writes: {
      slot: string;
      titleAr: string;
      titleEn: string;
      textAr: string;
      textEn: string;
      isActive: boolean;
      order: number;
    }[] = [];

    for (const item of incoming) {
      const slot = parseTrustSlot(item?.slot);
      if (!slot) {
        return NextResponse.json(
          { error: `Unknown slot: ${String(item?.slot)}`, reason: "BAD_SLOT" },
          { status: 400 }
        );
      }

      const titleAr = String(item?.titleAr ?? "").trim();
      const titleEn = String(item?.titleEn ?? "").trim();
      const textAr = String(item?.textAr ?? "").trim();
      const textEn = String(item?.textEn ?? "").trim();

      // A blank title would render an icon over nothing. Both locales are
      // required because both are served.
      if (!titleAr || !titleEn) {
        return NextResponse.json(
          { error: `Both titles are required for ${slot}.`, reason: "TITLE_REQUIRED", field: slot },
          { status: 400 }
        );
      }

      writes.push({
        slot,
        titleAr,
        titleEn,
        textAr,
        textEn,
        isActive: item?.isActive !== false,
        order: TRUST_SLOTS.indexOf(slot),
      });
    }

    // One transaction: the three rows are read together on the storefront, so a
    // partial save would show a mix of old and new wording.
    await prisma.$transaction(
      writes.map((data) =>
        prisma.trustBadge.upsert({
          where: { slot: data.slot },
          create: data,
          update: data,
        })
      )
    );

    return NextResponse.json({ ok: true, count: writes.length });
  } catch (error) {
    const translated = translatePrismaError(error);
    if (translated) {
      return NextResponse.json(
        { error: translated.error, reason: translated.reason },
        { status: translated.status }
      );
    }
    console.error("Failed to save trust badges", error);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}
