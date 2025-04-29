import { FastifyInstance, FastifyRequest } from "fastify";
import { intsancePlugin } from "../helpers/plugins/instance";

export function instanceRoutes(app: FastifyInstance) {
  app.register(intsancePlugin);

  app.get("/instance/qrcode", async (request, reply) => {
    const whatsapp = request.whatsapp;

    const isAuthenticated = await whatsapp.isAuthenticated();

    if (isAuthenticated) {
      return reply.code(400).send({
        message: "Whatsapp is already connected",
      });
    }
    try {
      const qrcode = await whatsapp.getQrCode();

      return reply.code(200).send(qrcode);
    } catch (error) {
      console.error("Error fetching QR code:", error);
      return reply.code(500).send({
        message: "Error fetching QR code",
      });
    }
  });

  app.post("/instance/disconnect", async (request, reply) => {
    const whatsapp = request.whatsapp;

    const isAuthenticated = await whatsapp.isAuthenticated();

    if (!isAuthenticated) {
      return reply.code(400).send({
        message: "Whatsapp is not connected",
      });
    }

    await whatsapp.close();

    return reply.code(200).send({
      message: "Whatsapp disconnected",
    });
  });

  app.get("/instance/fetch-instance", async (request, reply) => {
    return reply.send(request.instance).code(200);
  });

  app.post(
    "/messages/send-text",
    {
      schema: {
        body: {
          type: "object",
          properties: {
            phone: { type: "string" },
            message: { type: "string" },
            delay: { type: "number" },
          },
          required: ["phone", "message"],
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          phone: string;
          message: string;
          delay?: number;
        };
      }>,
      reply
    ) => {
      const { phone, message, delay } = request.body;

      const whatsapp = request.whatsapp;

      const isAuthenticated = await whatsapp.isAuthenticated();

      if (!isAuthenticated) {
        return reply.code(400).send({
          error: "Whatsapp is not connected",
        });
      }

      const result = await whatsapp.sendText(phone, message, {
        delay: delay || 0,
      });

      return reply.code(200).send({
        instanceId: request.instanceId,
        messageId: result.id,
      });
    }
  );
}
