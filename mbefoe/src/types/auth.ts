export interface User {
  id: number
  username: string
  full_name: string
  is_active: boolean
  created_at: string
}

export interface TokenResponse {
  access_token: string
  token_type: 'bearer'
  expires_in: number
}

export interface LoginCredentials {
  username: string
  password: string
}
