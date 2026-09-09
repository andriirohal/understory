export function stockLabel(stock: number) {
  if (stock <= 0) {
    return {
      text: "cart.outOfStock",
      className: "out_of_stock",
    };
  }

  if (stock <= 3) {
    return {
      text: "cart.lowStock",
      className: "low_stock",
    };
  }

  return {
    text: "cart.inStock",
    className: "in_stock",
  };
}
