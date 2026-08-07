export type UserRole = "CUSTOMER" | "ADMIN";

export interface User {
  id: string;
  clerkId: string;
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
