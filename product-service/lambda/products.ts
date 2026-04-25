export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  count: number;
}

export const products: Product[] = [
  {
    id: "1",
    title: "Product One",
    description: "Short Product Description 1",
    price: 24.99,
    count: 10,
  },
  {
    id: "2",
    title: "Product Two",
    description: "Short Product Description 2",
    price: 15.99,
    count: 5,
  },
  {
    id: "3",
    title: "Product Three",
    description: "Short Product Description 3",
    price: 49.99,
    count: 3,
  },
  {
    id: "4",
    title: "Product Four",
    description: "Short Product Description 4",
    price: 9.99,
    count: 20,
  },
  {
    id: "5",
    title: "Product Five",
    description: "Short Product Description 5",
    price: 34.99,
    count: 8,
  },
  {
    id: "6",
    title: "Product Six",
    description: "Short Product Description 6",
    price: 19.99,
    count: 12,
  },
];