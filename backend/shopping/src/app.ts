import express, { Request, Response } from "express";

import { uniqueHandler, errorHandler } from "./middlewares";
import { commerceRouter, checkoutRouter } from "./routes";

import cors from "cors";

export const app = express();

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://understory-mu.vercel.app",
  ],
  credentials: true,
}));

app.use(express.json());

app.use("/", commerceRouter);
app.use("/", checkoutRouter);

app.get("/", (_req: Request, res: Response) => {
  res.sendStatus(200);
});

app.use(uniqueHandler, errorHandler);