export type Result<T> = 
  | { success: true; data: T; status: number; } | { success: false; error: string; status: number; };

export function ok<T>(data: T, status: number): Result<T> {
  return { success: true, data, status };
};

export function fail<T = never>(error: string, status: number): Result<T> {
  return { success: false, error, status };
};