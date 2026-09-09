import { Pool } from "pg";

import { CreatePlantInput, Plant, UpdatePlantInput, isNonEmpty, isValidStock, fail, ok } from "../index";
import type { Result } from "../result";

export async function addPlant(pool: Pool, input: CreatePlantInput): Promise<Result<Plant>> {
  const name = input.name;

  if(!isNonEmpty(name)) {
    return fail("Name cannot be empty", 400);
  };

  const price = input.price;

  if(!Number.isInteger(price) || price < 0) {
    return fail("Price must be greater than zero", 400);
  };

  const stock = input.stock;

  if(!isValidStock(stock)) {
    return fail("Stock cannot be negative", 400);
  };

  const description = input.description;

  if(!isNonEmpty(description)) {
    return fail("Description cannot be empty", 400);
  };

  const family = input.family;

  if(!isNonEmpty(family)) {
    return fail("Family cannot be empty", 400);
  };

  const imageUrl = input.imageUrl;

  if(!isNonEmpty(imageUrl)) {
    return fail("URL is required", 400);
  };

  const result = await pool.query(`INSERT INTO plants (name, description, family, price, stock, "imageUrl") VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, description, family, price, stock, "imageUrl", "createdAt", "updatedAt"`,
    [name, price, stock, description, family, imageUrl]
  );

  const plant = result.rows[0];

  return ok(plant, 201);
};

export async function deletePlant(pool: Pool, id: string): Promise<Result<Plant>> {
  const result = await pool.query(`DELETE FROM plants WHERE id = $1 RETURNING id, name, description, family, price, stock, "imageUrl", "createdAt", "updatedAt"`,
    [id]
  );

  const plant = result.rows[0];

  if(!plant) {
    return fail("Plant not found", 404);
  };

  return ok(plant, 200);
};

export async function updatePlant(pool: Pool, input: UpdatePlantInput, id: string): Promise<Result<Plant>> {
  const name = input.name;

  if(name != null && !isNonEmpty(name)) {
    return fail("Name cannot be empty", 400);
  };

  const price = input.price;

  if(price != null && (!Number.isInteger(price) || price < 0)) {
    return fail("Price must be greater than zero", 400);
  };

  const stock = input.stock;

  if(stock != null && !isValidStock(stock)) {
    return fail("Stock cannot be negative", 400);
  };

  const description = input.description;

  if(description != null && !isNonEmpty(description)) {
    return fail("Description cannot be empty", 400);
  };

  const family = input.family;

  if(family != null && !isNonEmpty(family)) {
    return fail("Family cannot be empty", 400);
  };

  const imageUrl = input.imageUrl;

  if(imageUrl != null && !isNonEmpty(imageUrl)) {
    return fail("URL is required", 400);
  };

  const result = await pool.query(`UPDATE plants SET name = COALESCE($2, name), price = COALESCE($3, price), stock = COALESCE($4, stock), description = COALESCE($5, description), family = COALESCE($6, family), "imageUrl" = COALESCE($7, "imageUrl") WHERE id = $1 RETURNING id, name, description, family, price, stock, "imageUrl", "createdAt", "updatedAt"`,
    [id, name, price, stock, description, family, imageUrl]
  );

  const plant = result.rows[0];
  
  if(!plant) {
    return fail("Plant not found", 404);
  };

  return ok(plant, 200);
};

export async function getPlant(pool: Pool, id: string): Promise<Result<Plant>> {
  const result = await pool.query(`SELECT id, name, description, family, price, stock, "imageUrl", "createdAt", "updatedAt" FROM plants WHERE id = $1`,
    [id]
  );

  const plant = result.rows[0];
  
  if(!plant) {
    return fail("Plant not found", 404);
  };

  return ok(plant, 200);
};

export async function getAllPlants(pool: Pool, limit: number, offset: number, sort: "alphabetical" | "cheapest" | "expensive" | "featured" = "featured", family: "Araceae" | "Moraceae" | "all" = "all"): Promise<Result<Plant[]>> {
  const normalizedLimit = !Number.isInteger(limit) || limit <= 0 ? 10 : Math.min(limit, 100);
  const normalizedOffset = !Number.isInteger(offset) || offset < 0 ? 0 : offset;

  const sortOptions = {
    alphabetical: "name ASC",
    cheapest: "price ASC",
    expensive: "price DESC",
    featured: `"createdAt" DESC`,
  };

  const orderBy = sortOptions[sort] ?? sortOptions.featured;
  const normalizedFamily = family === "all" ? null : family;

  const result = await pool.query(`SELECT id, name, description, family, price, stock, "imageUrl", "createdAt", "updatedAt" FROM plants WHERE ($3::text IS NULL OR family = $3) ORDER BY ${orderBy} LIMIT $1 OFFSET $2`,
    [normalizedLimit, normalizedOffset, normalizedFamily]
  );

  const plants = result.rows;

  return ok(plants, 200);
};