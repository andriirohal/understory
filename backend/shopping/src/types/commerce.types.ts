export type Plant = {
  id: string;
  name: string;
  description: string;
  family: string;
  price: number;
  stock: number;
  imageUrl: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CreatePlantInput = {
  name: string;
  price: number;
  stock: number;
  description: string;
  family: string;
  imageUrl: string;
};

export type UpdatePlantInput = {
  name: string | null;
  price: number | null;
  stock: number | null;
  description: string | null;
  family: string | null;
  imageUrl: string | null;
};