export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  available: boolean;
  isDeal?: boolean;
  compareAtPrice?: number;
}

export interface PublicMenu {
  id: string;
  code: string;
  branding: { name: string; logoUrl?: string };
  shop: { currency: string; phone: string; address: string; deliveryFee: number; packingFee: number; taxRate: number; serviceChargePercent: number };
  menu: MenuItem[];
  tables: { id: string; label: string; seats: number; status: string }[];
}
