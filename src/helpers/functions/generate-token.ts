import { SignJWT } from "jose";
import { config } from "../../utils/config";

export async function generateToken(payload: any): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(config.jwt.expiresIn)
    .sign(new TextEncoder().encode(config.jwt.secret));
}
