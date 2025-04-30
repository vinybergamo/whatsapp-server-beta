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
            messageId: { type: "string" },
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
          messageId?: string;
        };
      }>,
      reply
    ) => {
      const { phone, document, caption, filename, delay, messageId } =
        request.body;

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
        quotedMsg: messageId,
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
            filename: { type: "string" },
            caption: { type: "string" },
            viewOnce: { type: "boolean" },
            messageId: { type: "string" },
          },
          required: ["phone", "image", "filename"],
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          phone: string;
          image: string;
          filename: string;
          caption?: string;
          viewOnce?: boolean;
          messageId?: string;
        };
      }>,
      reply
    ) => {
      const { phone, image, caption, filename, viewOnce, messageId } =
        request.body;

      const whatsapp = request.whatsapp;

      const exists = await whatsapp.checkNumberStatus(phone);

      if (exists.status !== 200) {
        return reply.code(400).send({
          message: "Phone number is not valid",
        });
      }

      const isUrl = /^https?:\/\/.+\.(jpg|jpeg|png|gif|bmp|webp)$/.test(image);
      const isBase64 = /^data:image\/(jpeg|png|gif);base64,/.test(image);

      if (isUrl) {
        const result = await whatsapp.sendImage(
          phone,
          image,
          filename,
          caption,
          messageId,
          viewOnce
        );

        return reply.code(200).send({
          instanceId: request.instanceId,
          messageId: result.id,
        });
      }

      if (isBase64) {
        const result = await whatsapp.sendImageFromBase64(
          phone,
          image,
          filename,
          caption,
          messageId,
          viewOnce
        );

        return reply.code(200).send({
          instanceId: request.instanceId,
          messageId: result.id,
        });
      }

      return reply.code(400).send({
        message: "Image must be a URL or a base64 string",
      });
    }
  );
}
