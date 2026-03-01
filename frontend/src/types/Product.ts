export interface Product {
  id: string;
  name: string;
  imageUrl: string;
  hiddenImageUrl: string;
  price?: number; // optional now, backend will provide price for offers
  originalPrice?: number;
  discountPercent?: number;
}

