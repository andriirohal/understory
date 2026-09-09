import validator from "validator";

export function isNonEmpty(input: unknown): input is string {
  if(typeof input !== "string") {
    return false;
  };

  return input == input.trim() && input.length > 0;
};

export function isValidStock(stock: unknown): stock is number {
  if(typeof stock !== "number") {
    return false;
  };

  return Number.isInteger(stock) && stock >= 0;
};

export function normalizeEmail(email: unknown): string | null {
  if(typeof email !== "string") {
    return null;
  };

  const normalized = email.trim().toLowerCase();

  if(!validator.isEmail(normalized)) {
    return null;
  };

  return normalized;
};

export function isValidPassword(password: unknown): password is string {
  if(typeof password !== "string") {
    return false;
  };

  return password.length >= 8 && password.length <= 100;
};