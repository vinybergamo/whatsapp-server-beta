import { get } from "env-var";
import { config as dotenv } from "dotenv";

dotenv();

export const config = {
  app: {
    name: get("APP_NAME").default("WhatsApp API").asString(),
    env: get("NODE_ENV")
      .default("development")
      .asEnum(["development", "production"]),
    port: get("PORT").default("3333").asPortNumber(),
    hostname: get("HOSTNAME").default("0.0.0.0").asString(),
    cors: {
      origin: get("CORS_ORIGIN").default("*").asString(),
      methods: get("CORS_METHODS")
        .default("GET,HEAD,PUT,PATCH,POST,DELETE")
        .asString(),
      allowedHeaders: get("CORS_ALLOWED_HEADERS")
        .default("Content-Type,Authorization")
        .asString(),
      exposedHeaders: get("CORS_EXPOSED_HEADERS")
        .default("Content-Type,Authorization")
        .asString(),
      maxAge: get("CORS_MAX_AGE").default("600").asIntPositive(),
    },
  },
  server: {
    keepAliveTimeout: get("KEEP_ALIVE_TIMEOUT").default("5000").asIntPositive(),
    bodyLimit: get("BODY_LIMIT").default("1048576").asIntPositive(), // 1MB
    requestTimeout: get("REQUEST_TIMEOUT").default("30000").asIntPositive(), // 30s
    responseTimeout: get("RESPONSE_TIMEOUT").default("30000").asIntPositive(), // 30s
  },
  database: {
    url: get("DATABASE_URL").required().asString(),
  },
  jwt: {
    secret: get("JWT_SECRET").required().asString(),
    expiresIn: get("JWT_EXPIRES_IN").default("1d").asString(),
  },
  whatsapp: {
    browser: get("BROWSER").required(true).asString(),
    browserToken: get("BROWSER_TOKEN").required(true).asString(),
  },
  trialDays: get("TRIAL_DAYS").default("7").asIntPositive(),
};
