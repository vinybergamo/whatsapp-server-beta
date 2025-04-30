import fastify from "fastify";
import dotenv from "dotenv";
import { config } from "./utils/config";
import { AddressInfo } from "net";
import { prisma } from "./database";
import { instances } from "./whatsapp/instances";
import { instanceRoutes } from "./routes/instance";
import { authRoutes } from "./routes/auth";
import { generateToken } from "./helpers/functions/generate-token";
import { verifyToken } from "./helpers/functions/verify-token";
import { instancesRoutes } from "./routes/instances";
import { instanceAuthPlugin } from "./helpers/plugins/instance";
import { messagesRoutes } from "./routes/messages";

dotenv.config();

async function closeServer() {
  console.log("Closing server...");

  console.log("Closing database connection...");
  await prisma.instance.updateMany({
    data: {
      connected: false,
      state: "DISCONNECTED",
    },
  });
  await prisma.$disconnect();

  console.log("Closing instances...");
  for (const instance of instances.values()) {
    await instance.close();
  }
  instances.clear();

  console.log("All instances closed");

  await app.close();
}

const app = fastify();

app.decorate("prisma", prisma);
app.decorate("instances", instances);
app.decorate("generateToken", generateToken);
app.decorate("verifyToken", verifyToken);
app.decorate("plugins", {
  instanceAuth: instanceAuthPlugin,
});

app.register(authRoutes);
app.register(instancesRoutes);
app.register(instanceRoutes);
app.register(messagesRoutes);

app.addHook("onClose", async () => {
  console.log("Server closed");
});

app.server.on("close", async () => {
  console.log("Server closed");
});

process.on("SIGHUP", async () => {
  console.log("Received SIGHUP signal. Closing server...");
  await closeServer();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("Received SIGINT signal. Closing server...");
  await closeServer();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Received SIGTERM signal. Closing server...");
  await closeServer();
  process.exit(0);
});

process.on("SIGQUIT", async () => {
  console.log("Received SIGQUIT signal. Closing server...");
  await closeServer();
  process.exit(0);
});

process.on("SIGUSR2", async () => {
  console.log("Received SIGUSR2 signal. Closing server...");
  await closeServer();
  process.exit(0);
});

app.listen(
  {
    host: config.app.hostname,
    port: config.app.port,
  },
  async (err) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }

    if (typeof app.server.address() === "string") {
      console.log(`Server listening at ${app.server.address()}`);
    }

    if (typeof app.server.address() === "object") {
      const address = app.server.address() as AddressInfo;
      console.log(`Server listening at ${address.address}:${address.port}`);
    }
  }
);
