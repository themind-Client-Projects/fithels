class ApiClient {
  private baseUrl: string;
  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  }

  async request(url: string, options?: any) {
    const res = await fetch(`${this.baseUrl}${url}`, {
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      ...options,
    })

    if (!res.ok) {
      const error = await res.json().catch(() => ({
        message: `Request failed: ${res.status}`,
        success: false,
      }))
      throw new Error(error.message)
    }

    return res.json()
  }

  get<T = any>(url: string): Promise<T> { return this.request(url) }
  post<T = any>(url: string, body: any): Promise<T> { return this.request(url, { method: 'POST', body: JSON.stringify(body) }) }
  put<T = any>(url: string, body: any): Promise<T> { return this.request(url, { method: 'PUT', body: JSON.stringify(body) }) }
  patch<T = any>(url: string, body: any): Promise<T> { return this.request(url, { method: 'PATCH', body: JSON.stringify(body) }) }
  delete<T = any>(url: string): Promise<T> { return this.request(url, { method: 'DELETE' }) }
}

export const api = new ApiClient()
