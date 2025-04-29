import { sign } from "jsonwebtoken";
import { config } from "../../utils/config";

export function generateToken(payload: any): string {
  return sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as any,
    algorithm: "HS256",
  });
}
