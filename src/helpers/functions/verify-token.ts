import { verify } from "jsonwebtoken";
import { config } from "../../utils/config";

export function verifyToken(token: string): any {
  try {
    const payload = verify(token, config.jwt.secret, {
      algorithms: ["HS256"],
    });
    return payload;
  } catch (error) {
    throw new Error("Invalid token");
  }
}
