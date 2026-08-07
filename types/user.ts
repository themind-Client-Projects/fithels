// Mirrors the `Role` enum in prisma/schema.prisma.
export type UserRole = "CUSTOMER" | "EMPLOYEE" | "ADMIN";

export interface User {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: UserRole;
  createdAt: Date;
}

export interface CustomerSummary extends User {
  _count: { orders: number };
  totalSpent: number;
}
