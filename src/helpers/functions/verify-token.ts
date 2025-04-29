import { jwtVerify } from "jose";
import { config } from "../../utils/config";

export async function verifyToken(token: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(config.jwt.secret)
    );
    return payload;
  } catch (error) {
    throw new Error("Invalid token");
  }
}
