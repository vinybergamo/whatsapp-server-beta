import { get } from "env-var";
import { config as dotenv } from "dotenv";

dotenv();

export const config = {
  app: {
    env: get("NODE_ENV")
      .default("development")
      .asEnum(["development", "production"]),
    port: get("PORT").default("3333").asPortNumber(),
    hostname: get("HOSTNAME").default("0.0.0.0").asString(),
  },
  database: {
    url: get("DATABASE_URL").required().asString(),
  },
  jwt: {
    secret: get("JWT_SECRET").required().asString(),
    expiresIn: get("JWT_EXPIRES_IN").default("1d").asString(),
  },
  whatsapp: {
    browser_bin: get("BROWSER_PATH").default("/usr/bin/chromium").asString(),
  },
};
