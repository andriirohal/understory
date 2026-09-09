import { Router } from "express";

import { addToCartController, removeFromCartController, updateCartController, getAllOrdersController, getOrderController, getCartController, createOrderController } from "../index";
import { authenticate, validateId } from "../middlewares";

export const router = Router();

router.get("/cart", authenticate, getCartController);
router.post("/cart", authenticate, addToCartController);

router.put("/cart", authenticate, updateCartController);

router.delete("/cart/:plantId", authenticate, validateId("plantId", "plant"), removeFromCartController);

router.get("/orders", authenticate, getAllOrdersController);
router.post("/orders", authenticate, createOrderController);

router.get("/orders/:orderId", authenticate, validateId("orderId", "order"), getOrderController);
router.patch("/orders/:orderId", authenticate, validateId("orderId", "order"));