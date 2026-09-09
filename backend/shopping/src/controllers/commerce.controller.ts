import { Request, Response, NextFunction } from "express";

import { addPlant, deletePlant, getAllPlants, getPlant, updatePlant, CreatePlantInput, UpdatePlantInput } from "../index";
import { pool } from "../db";

export async function getAllPlantsController(req: Request, res: Response, next: NextFunction) {
  try {
    const limit = Number(req.query.limit);
    const offset = Number(req.query.offset);

    const sort = 
      req.query.sort === "alphabetical" || req.query.sort === "cheapest" || req.query.sort === "expensive" ? req.query.sort : "featured";
    
    const family = 
      req.query.family === "Araceae" || req.query.family === "Moraceae" ? req.query.family : "all"; 

    const result = await getAllPlants(pool, limit, offset, sort, family);
    return res.status(result.status).json(result);

  } catch(error) {
    next(error);
  };
};

export async function getPlantController(req: Request<{ id: string }>, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const result = await getPlant(pool, id);
    return res.status(result.status).json(result);

  } catch(error) {
    next(error);
  };
};

export async function updatePlantController(req: Request<{ id: string }, {}, UpdatePlantInput>, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const result = await updatePlant(pool, req.body, id);
    return res.status(result.status).json(result);
 
  } catch(error) {
    next(error);
  };
};

export async function deletePlantController(req: Request<{ id: string }>, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const result = await deletePlant(pool, id);
    return res.status(result.status).json(result);

  } catch(error) {
    next(error);
  };
};

export async function addPlantController(req: Request<{}, {}, CreatePlantInput>, res: Response, next: NextFunction) {
  try {
    const result = await addPlant(pool, req.body);
    return res.status(result.status).json(result);

  } catch(error) {
    next(error);
  };
};