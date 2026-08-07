/**
 * Core permission checking logic for the dashboard.
 * Used on both Server (API routes/Layouts) and Client (UI hiding).
 */

// Types of permissions available in the system
export const PERMISSIONS = {
  // Products
  VIEW_PRODUCTS: "canViewProducts",
  CREATE_PRODUCTS: "canCreateProducts",
  EDIT_PRODUCTS: "canEditProducts",
  DELETE_PRODUCTS: "canDeleteProducts",
  
  // Orders
  VIEW_ORDERS: "canViewOrders",
  EDIT_ORDERS: "canEditOrders",
  DELETE_ORDERS: "canDeleteOrders",
  
  // Customers
  VIEW_CUSTOMERS: "canViewCustomers",
  
  // Categories
  VIEW_CATEGORIES: "canViewCategories",
  CREATE_CATEGORIES: "canCreateCategories",
  EDIT_CATEGORIES: "canEditCategories",
  DELETE_CATEGORIES: "canDeleteCategories",
  
  // Settings
  VIEW_SETTINGS: "canViewSettings",
  EDIT_SETTINGS: "canEditSettings",
  
  // Dashboard / Analytics
  VIEW_DASHBOARD: "canViewDashboard",
};

/**
 * Check if a user has a specific permission.
 * Admins always have all permissions.
 * Employees have permissions based on their DB record.
 * Customers have no dashboard permissions.
 * 
 * @param {Object} user - The user object from the DB (must include role and permissions)
 * @param {string} permission - The permission key to check
 * @returns {boolean}
 */
export function hasPermission(user: any, permission: string) {
  if (!user || !user.role) return false;
  
  // Admins can do everything
  if (user.role === 'ADMIN') return true;
  
  // Only EMPLOYEES can have specific permissions
  if (user.role !== 'EMPLOYEE') return false;
  
  // Check if they have the specific permission
  return user.permissions?.[permission] === true;
}
