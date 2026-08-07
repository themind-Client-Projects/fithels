import { Category } from "./category";

export interface Product {
  id: string;
  titleEn: string;
  titleAr: string;
  descEn: string | null;
  descAr: string | null;
  price: number;
  salePrice: number | null;
  images: string[];
  sizes: string[];
  colors: string[];
  stock: number;
  isActive: boolean;
  categoryId: string;
  category?: Category;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductFormData {
  titleEn: string;
  titleAr: string;
  descEn?: string;
  descAr?: string;
  price: number;
  salePrice?: number;
  images: string[];
  sizes: string[];
  colors: string[];
  stock: number;
  isActive: boolean;
  categoryId: string;
}

export interface ProductFilter {
  category?: string;
  priceMin?: number;
  priceMax?: number;
  sizes?: string[];
  colors?: string[];
  search?: string;
  sortBy?: "price-asc" | "price-desc" | "newest" | "popular";
  page?: number;
  limit?: number;
}
