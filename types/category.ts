export interface Category {
  id: string;
  nameEn: string;
  nameAr: string;
  slug: string;
  image: string | null;
  _count?: { products: number };
}

export type CategoryFormData = Omit<Category, "id" | "_count">;
