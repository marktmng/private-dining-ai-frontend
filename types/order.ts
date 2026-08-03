export interface ParsedOrder {
  success: boolean;
  result: string;
}

export interface MenuItem {
  id?: number;
  name: string;
  description?: string;
  price: number;
}