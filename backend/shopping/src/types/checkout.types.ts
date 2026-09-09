export type Order = {
  id: string;
  userId: string;
  totalPrice: number;
  status: "pending" | "paid" | "shipped" | "completed" | "cancelled";
  createdAt: Date;
};

export type OrderItem = {
  id: string;
  orderId: string;
  plantId: string;
  price: number;
  quantity: number;
};

export type OrderResponse = Order & {
  items: OrderItem[]
};

export type OrderItemIds = {
  userId: string;
  orderId: string;
};

export type Cart = {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CartItem = {
  id: string;
  cartId: string;
  plantId: string;
  quantity: number;
};

export type CartItemResponse = CartItem & {
  name: string;
  price: number;
};

export type CartResponse = {
  items: CartItemResponse[],
  totalPrice: number;
};

export type CartItemInput = {
  plantId: string;
  quantity: number;
};

export type CartItemIds = {
  userId: string;
  plantId: string;
};