"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  Order,
  CreateOrderInput,
  OrderStatus,
  PaginatedResponse,
} from "@/types";

const KEYS = {
  all: ["orders"] as const,
  list: (s?: OrderStatus) => ["orders", "list", s] as const,
  detail: (id: string) => ["orders", "detail", id] as const,
};

/** Fetch orders with optional status filter */
export function useOrders(status?: OrderStatus) {
  const url = status ? `/api/orders?status=${status}` : "/api/orders";
  return useQuery({
    queryKey: KEYS.list(status),
    queryFn: () => api.get<PaginatedResponse<Order>>(url),
    staleTime: 60_000,
  });
}

/** Fetch single order by ID */
export function useOrder(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: () => api.get<Order>(`/api/orders/${id}`),
    enabled: !!id,
  });
}

/** Create a new order (customer checkout) */
export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateOrderInput) =>
      api.post<Order>("/api/orders", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

/** Update order status (admin) */
export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      api.patch<Order>(`/api/orders/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}
