import { Order, OrderStatus } from "./order";

export interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  activeProducts: number;
  totalCustomers: number;
  recentOrders: Order[];
  ordersByStatus: Record<OrderStatus, number>;
}

export interface DateRange {
  from: Date;
  to: Date;
}
