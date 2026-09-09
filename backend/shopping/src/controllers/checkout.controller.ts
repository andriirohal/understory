import { Request, Response, NextFunction } from "express";

import { addToCart, removeFromCart, updateCart, createOrder, getAllOrders, getOrder, getCart, CartItemInput } from "../index";
import { pool } from "../db";

export async function addToCartController(req: Request<{}, {}, CartItemInput>, res: Response, next: NextFunction) {
  try {
    const { userId } = req.user;
    const { plantId, quantity } = req.body;

    const result = await addToCart(pool, userId, {
      plantId,
      quantity
    });

    return res.status(result.status).json(result);
    
  } catch(error) {
    next(error);
  };
};

export async function removeFromCartController(req: Request<{ plantId: string }>, res: Response, next: NextFunction) {
  try {
    const { userId } = req.user;
    const { plantId } = req.params;

    const result = await removeFromCart(pool, {
      userId,
      plantId
    });

    return res.status(result.status).json(result);

  } catch(error) {
    next(error);
  };
};

export async function updateCartController(req: Request<{}, {}, CartItemInput>, res: Response, next: NextFunction) {
  try {
    const { userId } = req.user;
    const { plantId, quantity } = req.body;

    const result = await updateCart(pool, userId, {
      plantId,
      quantity
    });

    return res.status(result.status).json(result);

  } catch(error) {
    next(error);
  };
};

export async function getCartController(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req.user;

    const result = await getCart(pool, userId);
    return res.status(result.status).json(result);

  } catch(error) {
    next(error);
  };
};

export async function getOrderController(req: Request<{ orderId: string }>, res: Response, next: NextFunction) {
  try {
    const { userId } = req.user;
    const { orderId } = req.params;

    const result = await getOrder(pool, {
      userId,
      orderId
    });

    return res.status(result.status).json(result);

  } catch(error) {
    next(error);
  };
};

export async function getAllOrdersController(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req.user;

    const limit = Number(req.query);
    const offset = Number(req.query.offset); 

    const result = await getAllOrders(pool, userId, limit, offset);
    return res.status(result.status).json(result);

  } catch(error) {
    next(error);
  };
};

export async function createOrderController(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req.user;

    const result = await createOrder(pool, userId);
    return res.status(result.status).json(result);

  } catch(error) {
    next(error);
  };
};