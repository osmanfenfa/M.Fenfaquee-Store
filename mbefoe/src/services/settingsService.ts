import type { ShopSettings, ShopSettingsInput } from '@/types/settings'
import { api } from './api'

export const settingsService = {
  getShop: () => api.get<ShopSettings>('/settings/shop'),
  updateShop: (data: ShopSettingsInput) => api.patch<ShopSettings>('/settings/shop', data),
}
