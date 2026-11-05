export interface ShopSettings {
  shop_name: string
  address: string | null
  phone: string | null
  receipt_note: string | null
  currency: string
}

export type ShopSettingsInput = Partial<Omit<ShopSettings, 'currency'>>
