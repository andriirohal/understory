import jwt from "jsonwebtoken";

import { UserPayload } from "../index";

const ACCESS_SECRET = process.env.ACCESS_SECRET;

export function isUserPayload(payload: unknown): payload is UserPayload {
  if(typeof payload !== "object" || payload === null) {
    return false;
  };

  const candidate = payload as Record<string, unknown>;

  return (
    typeof candidate.userId === "string" &&
    typeof candidate.email === "string" 
  );
};

export function verifyAccessToken(accessToken: string): UserPayload {
  const payload = jwt.verify(accessToken, ACCESS_SECRET!, { 
    algorithms: ["HS256"]
  });

  if(!isUserPayload(payload)) {
    throw new Error("Invalid access token");
  };

  return payload;
};