export type PropertyType = 'apartment' | 'house' | 'villa' | 'land' | 'office' | 'shop' | 'warehouse' | 'other';
export type PropertyTransaction = 'sale' | 'rent' | 'mortgage' | 'sale_rent';
export type PropertyStatus = 'available' | 'reserved' | 'sold' | 'rented' | 'inactive';

export interface Property {
  id?: number;
  code: string;
  title: string;
  type: PropertyType;
  transaction: PropertyTransaction;
  status: PropertyStatus;
  price: number;
  deposit: number;
  rent: number;
  area: number;
  bedrooms: number;
  floor?: number;
  totalFloors?: number;
  parking: boolean;
  elevator: boolean;
  storage: boolean;
  yearBuilt?: number;
  address: string;
  areaName?: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  ownerId?: number;
  agentId?: number;
  createdAt: number;
  updatedAt: number;
}

export interface PropertyImage {
  id?: number;
  propertyId: number;
  dataUrl: string;
  caption?: string;
  sortOrder: number;
  createdAt: number;
}

export interface PropertyRequest {
  id?: number;
  customerId?: number;
  title: string;
  transaction: PropertyTransaction;
  propertyType?: PropertyType;
  minArea?: number;
  maxArea?: number;
  minPrice?: number;
  maxPrice?: number;
  minDeposit?: number;
  maxDeposit?: number;
  minRent?: number;
  maxRent?: number;
  bedrooms?: number;
  areaName?: string;
  notes?: string;
  status: 'open' | 'matched' | 'closed';
  createdAt: number;
  updatedAt: number;
}
