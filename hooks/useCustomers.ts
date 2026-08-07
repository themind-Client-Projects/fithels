"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { CustomerSummary, PaginatedResponse } from "@/types";

/** Fetch customer list for admin dashboard */
export function useCustomers() {
  return useQuery({
    queryKey: ["customers"],
    queryFn: () => api.get<PaginatedResponse<CustomerSummary>>("/api/customers"),
    staleTime: 5 * 60_000,
  });
}
