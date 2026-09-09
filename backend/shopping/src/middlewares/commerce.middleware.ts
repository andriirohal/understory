import { Request, Response, NextFunction, RequestHandler } from "express";

import { fail } from "../result";

export function uniqueHandler(error: unknown, _req: Request, res: Response, next: NextFunction) {
  const err = error as { 
    code?: string,
    constraint?: string;
  };
  
  if(err.code === "23505" && err.constraint === "plants_name_unique") {
    const result = fail("A plant with this name already exists", 409); 
    return res.status(result.status).json(result);
  };

  next(error);
};

export function validateId(paramName: "id" | "plantId" | "orderId", name: "plant" | "order"): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const id = req.params[paramName];
  
    if(typeof id !== "string" || !UUID_REGEX.test(id)) {
      const result = fail(`Invalid ${name} ID`, 400);
      return res.status(result.status).json(result);
    };

    next();
  };
};

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  console.error(error);

  const result = fail("Internal server error", 500); 
  return res.status(result.status).json(result);
};