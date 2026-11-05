import type { LoginCredentials, TokenResponse, User } from '@/types/auth'
import { api, request } from './api'

export const authService = {
  /** OAuth2 password flow — the backend expects form-encoded fields. */
  login({ username, password }: LoginCredentials) {
    const form = new URLSearchParams({ username, password })
    return request<TokenResponse>('/auth/login', { method: 'POST', form })
  },
  me: () => api.get<User>('/auth/me'),
  changePassword: (current_password: string, new_password: string) =>
    api.post<void>('/auth/change-password', { current_password, new_password }),
}
