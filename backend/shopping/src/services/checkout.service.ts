import { Pool } from "pg";

import { CartItem, CartItemIds, CartItemInput, CartResponse, Order, OrderResponse, OrderItemIds, fail, ok } from "../index";
import type { Result } from "../result";

export async function addToCart(pool: Pool, userId: string, input: CartItemInput): Promise<Result<CartItem>> {
  const client = await pool.connect();

  try {
    const { plantId, quantity } = input;

    if(!Number.isInteger(quantity) || quantity <= 0) {
      return fail("Quantity must be greater than 0", 400);
    };

    await client.query("BEGIN");

    const cart = await client.query(`INSERT INTO carts ("userId") VALUES ($1) ON CONFLICT ("userId") DO UPDATE SET "userId" = EXCLUDED."userId" RETURNING id`,
      [userId]
    );

    const cartId = cart.rows[0].id;

    const plant = await client.query(`SELECT id, name, description, family, price, stock, "imageUrl", "createdAt", "updatedAt" FROM plants WHERE id = $1 FOR UPDATE`,
      [plantId]
    );

    const plantRow = plant.rows[0];

    if(!plantRow) {
      await client.query("ROLLBACK");

      return fail("Plant not found", 404);
    };
  
    const items = await client.query(`INSERT INTO "cartItems" ("cartId", "plantId", quantity) VALUES ($1, $2, $3) ON CONFLICT ("cartId", "plantId") DO UPDATE SET quantity = "cartItems".quantity + EXCLUDED.quantity RETURNING id, "cartId", "plantId", quantity`,
      [cartId, plantId, quantity]
    );

    const item = items.rows[0];

    const { stock } = plantRow;

    if(item.quantity > stock) {
      await client.query("ROLLBACK");

      return fail("Insufficient stock", 409);
    };

    await client.query("COMMIT");

    return ok(item, 200); 

  } catch(error) {
    await client.query("ROLLBACK");

    throw error;

  } finally {
    client.release();
  };
};

export async function removeFromCart(pool: Pool, ids: CartItemIds): Promise<Result<CartItem>> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const cart = await client.query(`SELECT id FROM carts WHERE "userId" = $1`,
      [ids.userId]
    );

    const cartRow = cart.rows[0];

    if(!cartRow) {
      await client.query("ROLLBACK");

      return fail("Cart not found", 404);
    };

    const cartId = cartRow.id;

    const items = await client.query(`DELETE FROM "cartItems" WHERE "cartId" = $1 AND "plantId" = $2 RETURNING id, "cartId", "plantId", quantity`,
      [cartId, ids.plantId]
    );

    const item = items.rows[0];

    if(!item) {
      await client.query("ROLLBACK");

      return fail("Cart item not found", 404);
    };

    await client.query("COMMIT");

    return ok(item, 200);

  } catch(error) {
    await client.query("ROLLBACK");

    throw error;

  } finally {
    client.release();
  };
};

export async function updateCart(pool: Pool, userId: string, input: CartItemInput): Promise<Result<CartItem>> {
  const client = await pool.connect();
  
  try {
    const quantity = input.quantity;
    
    if(!Number.isInteger(quantity) || quantity <= 0) {
      return fail("Quantity must be greater than 0", 400);
    };

    await client.query("BEGIN");
    
    const cart = await client.query(`SELECT id FROM carts WHERE "userId" = $1 FOR UPDATE`,
      [userId]
    );
  
    const cartRow = cart.rows[0];
  
    if(!cartRow) {
      await client.query("ROLLBACK");

      return fail("Cart not found", 404);
    };
  
    const cartId = cartRow.id;
  
    const plant = await client.query("SELECT id, stock FROM plants WHERE id = $1 FOR UPDATE",
      [input.plantId]
    );
  
    const plantRow = plant.rows[0];

    if(!plantRow) {
      await client.query("ROLLBACK");

      return fail("Plant not found", 404);
    };
  
    const { stock } = plantRow;
  
    if(quantity > stock) {
      await client.query("ROLLBACK");

      return fail("Insufficient stock", 409);
    };

    if(quantity === 0) {
      const deleted = await client.query(`DELETE FROM "cartItems" WHERE "cartId" = $1 AND "plantId" = $2 RETURNING id, "cartId", "plantId", quantity`,
        [cartId, input.plantId]
      );

      const item = deleted.rows[0];

      if(!item) {
        await client.query("ROLLBACK");

        return fail("Cart item not found", 404);
      };

      await client.query("COMMIT");

      return ok(item, 200);
    };

    const items = await client.query(`UPDATE "cartItems" SET quantity = $3 WHERE "cartId" = $1 AND "plantId" = $2 RETURNING id, "cartId", "plantId", quantity`,
      [cartId, input.plantId, quantity]
    );

    const item = items.rows[0];
  
    if(!item) {
      await client.query("ROLLBACK");

      return fail("Cart item not found", 404);
    };

    await client.query("COMMIT");

    return ok(item, 200);

  } catch(error) {
    await client.query("ROLLBACK");

    throw error;

  } finally {
    client.release();
  };
};

export async function getCart(pool: Pool, userId: string): Promise<Result<CartResponse>> {
  const cart = await pool.query(`SELECT id FROM carts WHERE "userId" = $1`,
    [userId]
  );

  const cartRow = cart.rows[0]; 

  if(!cartRow) {
    return ok({
      items: [],
      totalPrice: 0
    }, 200);
  };

  const cartId = cartRow.id;
 
  const { rows: items } = await pool.query(`SELECT "cartItems".id, "cartItems"."cartId", "cartItems"."plantId", "cartItems".quantity, plants.name, plants.price, plants.stock, plants."imageUrl" FROM "cartItems" INNER JOIN plants ON "cartItems"."plantId" = plants.id WHERE "cartItems"."cartId" = $1`,
    [cartId]
  );

  const totalPrice = items.reduce((acc, item) => {
    return acc + item.quantity * item.price
  }, 0);
  
  return ok({ items, totalPrice }, 200);
};

export async function createOrder(pool: Pool, userId: string): Promise<Result<Order>> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const cart = await client.query(`SELECT id FROM carts WHERE "userId" = $1 FOR UPDATE`,
      [userId]
    );

    const cartRow = cart.rows[0];

    if(!cartRow) {
      await client.query("ROLLBACK");

      return fail("Cart not found", 404);
    };

    const cartId = cartRow.id;

    const { rows: items } = await client.query(`SELECT plants.id, plants.name, plants.price, plants.stock, "cartItems".quantity FROM plants INNER JOIN "cartItems" ON plants.id = "cartItems"."plantId" WHERE "cartItems"."cartId" = $1 FOR UPDATE OF plants`,
      [cartId]
    );

    if(items.length === 0) {
      await client.query("ROLLBACK");

      return fail("Cart is empty", 400);
    };

    for(const { stock, quantity } of items) {
      if(quantity > stock) {
        await client.query("ROLLBACK");

        return fail("Insufficient stock", 409);
      };
    };

    const totalPrice = items.reduce((acc, item) => {
      return acc + item.quantity * item.price;
    }, 0);

    const order = await client.query(`INSERT INTO orders ("userId", "totalPrice", status) VALUES ($1, $2, $3) RETURNING id, "userId", "totalPrice", status, "createdAt"`,
      [userId, totalPrice, "completed"]
    );

    const orderRow = order.rows[0];

    const orderId = orderRow.id;

    for(const { price, quantity, id } of items) {
      await client.query(`INSERT INTO "orderItems" (price, quantity, "orderId", "plantId") VALUES ($1, $2, $3, $4) RETURNING id, "orderId", "plantId", price, quantity`,
        [price, quantity, orderId, id]
      );

      await client.query(`UPDATE plants SET stock = stock - $2 WHERE id = $1 RETURNING id, name, description, family, price, stock, "imageUrl", "createdAt", "updatedAt"`,
        [id, quantity]
      );
    };

    await client.query(`DELETE FROM "cartItems" WHERE "cartId" = $1 RETURNING id, "cartId", "plantId", quantity`,
      [cartId]
    );

    await client.query("COMMIT");

    return ok(orderRow, 200);

  } catch(error) {
    await client.query("ROLLBACK");

    throw error;

  } finally {
    client.release();
  };
};

export async function getOrder(pool: Pool, ids: OrderItemIds): Promise<Result<OrderResponse>> {
  const order = await pool.query(`SELECT id, "userId", "totalPrice", status, "createdAt" FROM orders WHERE id = $1 AND "userId" = $2`,
    [ids.orderId, ids.userId]
  );

  const orderRow = order.rows[0];

  if(!orderRow) {
    return fail("Order not found", 404);
  };

  const { rows: items } = await pool.query(`SELECT id, "orderId", "plantId", price, quantity FROM "orderItems" WHERE "orderId" = $1`,
    [ids.orderId]
  );

  return ok({ ...orderRow, items }, 200);
};

export async function getAllOrders(pool: Pool, userId: string, limit: number, offset: number): Promise<Result<Order[]>> {
  const normalizedLimit = !Number.isInteger(limit) || limit <= 0 ? 10 : Math.min(limit, 100);
  const normalizedOffset = !Number.isInteger(offset) || offset < 0 ? 0 : offset;
  
  const result = await pool.query(`SELECT id, "userId", "totalPrice", status, "createdAt" FROM orders WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT $2 OFFSET $3`,
    [userId, normalizedLimit, normalizedOffset]
  );

  const orders = result.rows;

  return ok(orders, 200);
};