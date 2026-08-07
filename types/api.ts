export interface ApiResponse<T> {
  data: T;
  success: true;
}

export interface ApiError {
  message: string;
  success: false;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
