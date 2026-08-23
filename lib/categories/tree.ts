import { prisma } from "@/lib/prisma";

/**
 * The two-level rule for the catalogue tree.
 *
 * A SECTION has no parent and may have children. A CATEGORY has a parent and may
 * not. Products attach to either, but the shop is meant to attach them to
 * categories — that is what makes "show me more shoes like this one" a useful
 * query rather than "show me everything in the shop".
 *
 * Postgres cannot express "a row with a parent may not have children", so the
 * rule lives here and every write goes through `assertValidParent`. Keeping it
 * in one function is what stops the create route and the update route drifting
 * into two slightly different definitions of a valid tree.
 */

export class CategoryTreeError extends Error {
  reason: string;
  status: number;

  constructor(reason: string, message: string, status = 400) {
    super(message);
    this.name = "CategoryTreeError";
    this.reason = reason;
    this.status = status;
  }
}

type AssertOptions = {
  /** The category being written. Undefined when creating. */
  id?: string;
  /** The parent it should end up under. Null/undefined means "make it a section". */
  parentId?: string | null;
};

/**
 * Throws CategoryTreeError unless the requested parent is legal.
 *
 * Checked in this order, because each later check assumes the earlier ones held:
 *  1. a category cannot be its own parent
 *  2. the parent must exist
 *  3. the parent must itself be a section — otherwise the tree grows a third level
 *  4. a category that already has children cannot be given a parent
 */
export async function assertValidParent({ id, parentId }: AssertOptions) {
  // Becoming (or staying) a top-level section is always allowed.
  if (!parentId) return;

  if (id && parentId === id) {
    throw new CategoryTreeError(
      "SELF_PARENT",
      "A section cannot be placed inside itself."
    );
  }

  const parent = await prisma.category.findUnique({
    where: { id: parentId },
    select: { id: true, parentId: true },
  });

  if (!parent) {
    throw new CategoryTreeError(
      "PARENT_NOT_FOUND",
      "The selected section no longer exists. Refresh and choose again.",
      404
    );
  }

  if (parent.parentId) {
    throw new CategoryTreeError(
      "PARENT_NOT_A_SECTION",
      "Categories can only sit inside a top-level section, not inside another category."
    );
  }

  if (id) {
    const childCount = await prisma.category.count({ where: { parentId: id } });
    if (childCount > 0) {
      throw new CategoryTreeError(
        "HAS_CHILDREN",
        "This section holds categories, so it cannot be moved inside another section. Move or delete its categories first."
      );
    }
  }
}

/**
 * Throws unless the category is safe to delete.
 *
 * Restrict on the foreign key would reject this at the database anyway, but as an
 * opaque constraint error. Checking first turns it into a message that says which
 * of the two problems it is.
 */
export async function assertDeletable(id: string) {
  const [childCount, productCount] = await Promise.all([
    prisma.category.count({ where: { parentId: id } }),
    prisma.product.count({ where: { categoryId: id } }),
  ]);

  if (childCount > 0) {
    throw new CategoryTreeError(
      "HAS_CHILDREN",
      `This section still holds ${childCount} categor${childCount === 1 ? "y" : "ies"}. Delete or move them first.`,
      409
    );
  }

  if (productCount > 0) {
    throw new CategoryTreeError(
      "HAS_PRODUCTS",
      `This category still holds ${productCount} product${productCount === 1 ? "" : "s"}. Move them first.`,
      409
    );
  }
}

/** Sections with their categories, ordered for display. */
export async function getCategoryTree() {
  return prisma.category.findMany({
    where: { parentId: null },
    orderBy: { nameAr: "asc" },
    select: {
      id: true,
      nameAr: true,
      nameEn: true,
      slug: true,
      image: true,
      _count: { select: { products: true } },
      children: {
        orderBy: { nameAr: "asc" },
        select: {
          id: true,
          nameAr: true,
          nameEn: true,
          slug: true,
          image: true,
          parentId: true,
          _count: { select: { products: true } },
        },
      },
    },
  });
}
