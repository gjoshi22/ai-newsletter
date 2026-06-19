import jwt from "jsonwebtoken";
import type { UserRole } from "@workspace/content";

export interface AuthTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export function signToken(payload: AuthTokenPayload, secret: string, expiresInSeconds = 60 * 60 * 24 * 7) {
  return jwt.sign(payload, secret, { expiresIn: expiresInSeconds });
}

export function verifyToken(token: string, secret: string): AuthTokenPayload {
  return jwt.verify(token, secret) as AuthTokenPayload;
}
