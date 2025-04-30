import { FastifyInstance, FastifyRequest } from "fastify";

export function messagesRoutes(app: FastifyInstance) {
  app.register(app.plugins.instanceAuth);

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

  app.post(
    "/messages/send-document",
    {
      schema: {
        body: {
          type: "object",
          properties: {
            phone: { type: "string" },
            document: { type: "string" },
            caption: { type: "string" },
            filename: { type: "string" },
            delay: { type: "number" },
          },
          required: ["phone", "document"],
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          phone: string;
          document: string;
          caption?: string;
          filename?: string;
          delay?: number;
        };
      }>,
      reply
    ) => {
      const { phone, document, caption, filename, delay } = request.body;

      const whatsapp = request.whatsapp;

      const exists = await whatsapp.checkNumberStatus(phone);

      if (exists.status !== 200) {
        return reply.code(400).send({
          message: "Phone number is not valid",
        });
      }

      const result = await whatsapp.sendFile(phone, document, {
        caption: caption,
        filename: filename,
        delay: delay,
      });

      return reply.code(200).send({
        instanceId: request.instanceId,
        messageId: result.id,
      });
    }
  );

  app.post(
    "/messages/send-image",
    {
      schema: {
        body: {
          type: "object",
          properties: {
            phone: { type: "string" },
            image: { type: "string" },
            caption: { type: "string" },
            delay: { type: "number" },
          },
          required: ["phone", "image"],
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          phone: string;
          image: string;
          caption?: string;
          delay?: number;
        };
      }>,
      reply
    ) => {
      // Not Implemented yet
      return reply.code(501).send({
        message: "Not Implemented yet",
      });

      const { phone, image, caption, delay } = request.body;

      const whatsapp = request.whatsapp;

      const exists = await whatsapp.checkNumberStatus(phone);

      if (exists.status !== 200) {
        return reply.code(400).send({
          message: "Phone number is not valid",
        });
      }
    }
  );
}
