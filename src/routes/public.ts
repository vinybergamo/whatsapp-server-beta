import { FastifyInstance } from "fastify";

export function publicRoutes(app: FastifyInstance) {
  app.get("/", async (request, reply) => {
    return reply.send({ message: "Welcome to WhatsApp API" });
  });

  app.get("/health", async (request, reply) => {
    return reply.send({ message: "API is running" });
  });

  app.get("/webhook/events", async (request, reply) => {
    const events = [
      "INSTANCE_CONNECTED",
      "INSTANCE_DISCONNECTED",
      "MESSAGE_RECEIVED",
      "MESSAGE_SENT",
      "MESSAGE_ACK",
      "INCOMING_CALL",
      "QR_CODE",
    ];

    return reply.status(200).send(events);
  });
}
