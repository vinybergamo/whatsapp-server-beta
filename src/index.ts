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
import { sendWebhook } from "./helpers/functions/send-webhook";
import { startWhatsapp } from "./whatsapp";
import { sleep } from "./helpers/functions/sleep";
import { publicRoutes } from "./routes/public";
import { usersRoute } from "./routes/users";

dotenv.config();

const SIGNALS = ["SIGINT", "SIGTERM", "SIGQUIT", "SIGHUP", "SIGUSR2"];

async function closeServer() {
  console.log("Closing server...");

  console.log("Closing database connection...");

  const instancesList = await prisma.instance.findMany({
    where: {
      connected: true,
    },
  });

  await prisma.instance.updateMany({
    where: {
      connected: true,
    },
    data: {
      connected: false,
      state: "DISCONNECTED",
      disconnectedBySystem: true,
    },
  });

  for (const instance of instancesList) {
    await sendWebhook(instance.id, "INSTANCE_DISCONNECTED", {
      instance: {
        ...instance,
        connected: false,
        state: "DISCONNECTED",
        disconnectedBySystem: true,
      },
    });
  }

  await prisma.$disconnect();

  console.log("Closing instances...");
  for (const instance of instances.values()) {
    await instance.close();
  }
  instances.clear();

  console.log("All instances closed");

  await app.close();

  await sleep(1000);
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
app.register(publicRoutes);
app.register(usersRoute);

app.addHook("onClose", async () => {
  console.log("[HOOK - onClose]: Server closed");
});

app.server.on("close", async () => {
  console.log("[EVENT - close]: Server closed");
});

SIGNALS.forEach((signal) => {
  process.on(signal, async () => {
    console.log(`Received ${signal} signal. Closing server...`);
    await closeServer();
    process.exit(0);
  });
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

    const instancesList = await prisma.instance.findMany({
      where: {
        connected: false,
        disconnectedBySystem: true,
      },
    });

    for (const instance of instancesList) {
      await startWhatsapp(instance.id);
    }
  }
);
