import { getAccessToken } from "./authState";
import { SHOPPING_URL } from "./cart";

export type PlantSort = "alphabetical" | "cheapest" | "expensive";

export type PlantFamily = "Araceae" | "Moraceae";

export type Plant = {
  id: string;
  name: string;
  scientificName: string;
  description: string;
  family: string;
  price: number;
  stock: number;
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
};

export async function getAllPlants(
  limit: number,
  offset: number,
  sort?: PlantSort,
  family?: PlantFamily,
) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  if (sort) {
    params.set("sort", sort);
  }

  if (family) {
    params.set("family", family);
  }

  const response = await fetch(`${SHOPPING_URL}/plants?${params}`, {
    method: "GET",
  });

  if (!response.ok) {
    const error = await response.json();

    throw new Error(error.error || "Failed to get plants");
  }

  const result = await response.json();

  return result.data;
}

export async function addPlant(data: {
  name: string;
  price: number;
  stock: number;
  description: string;
  family: string;
  imageUrl: string;
}) {
  const accessToken = getAccessToken();

  if (!accessToken) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${SHOPPING_URL}/plants`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();

    throw new Error(error.error || "Failed to create plant");
  }

  return response.json();
}
