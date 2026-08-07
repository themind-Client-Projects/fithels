"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Category, CategoryFormData } from "@/types";

const KEYS = { all: ["categories"] as const };

/** Fetch all categories */
export function useCategories() {
  return useQuery({
    queryKey: KEYS.all,
    queryFn: () => api.get<Category[]>("/api/categories"),
    staleTime: 30 * 60_000,
  });
}

/** Create a new category (admin) */
export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: CategoryFormData) =>
      api.post<Category>("/api/categories", d),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

/** Update a category (admin) */
export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CategoryFormData }) =>
      api.put<Category>(`/api/categories/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

/** Delete a category (admin) */
export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}
