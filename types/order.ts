export interface ParsedOrder {
  success: boolean;
  result: string;
}

export interface MenuItem {
  category?: string;
  id?: string;
  name: string;
  description?: string;
  price: number;
}
