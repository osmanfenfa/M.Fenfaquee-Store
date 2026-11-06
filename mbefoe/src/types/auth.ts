export type Role = 'owner' | 'manager' | 'cashier'

export interface User {
  id: number
  username: string
  full_name: string
  is_active: boolean
  created_at: string
  role: Role
  is_superadmin: boolean
  /** The shop this person works in (null only for a platform admin without a shop) */
  shop: { id: number; name: string } | null
}

export const ROLE_LABELS: Record<Role, string> = { owner: 'Owner', manager: 'Manager', cashier: 'Cashier' }

export interface TokenResponse {
  access_token: string
  token_type: 'bearer'
  expires_in: number
}

export interface LoginCredentials {
  username: string
  password: string
}

export interface SignupData {
  shop_name: string
  full_name: string
  username: string
  password: string
  phone: string | null
  address: string | null
}

export interface AdminShop {
  id: number
  name: string
  phone: string | null
  is_active: boolean
  created_at: string
  owner_name: string | null
  owner_username: string | null
  user_count: number
  product_count: number
  sale_count: number
  last_sale_date: string | null
}
