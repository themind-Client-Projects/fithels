"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  Product,
  ProductFormData,
  ProductFilter,
  PaginatedResponse,
} from "@/types";

const KEYS = {
  all: ["products"] as const,
  list: (f: ProductFilter) => ["products", "list", f] as const,
  detail: (id: string) => ["products", "detail", id] as const,
};

/** Fetch paginated product list with filters */
export function useProducts(filters: ProductFilter) {
  const params = new URLSearchParams(
    Object.entries(filters)
      .filter(([, v]) => v != null && v !== "")
      .map(([k, v]) => [k, String(v)])
  );
  return useQuery({
    queryKey: KEYS.list(filters),
    queryFn: () =>
      api.get<PaginatedResponse<Product>>(`/api/products?${params}`),
    staleTime: 5 * 60_000,
  });
}

/** Fetch single product by ID */
export function useProduct(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: () => api.get<Product>(`/api/products/${id}`),
    staleTime: 10 * 60_000,
    enabled: !!id,
  });
}

/** Create a new product (admin) */
export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ProductFormData) =>
      api.post<Product>("/api/products", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

/** Update an existing product (admin) */
export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProductFormData }) =>
      api.put<Product>(`/api/products/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

/** Delete a product (admin) */
export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/products/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}
