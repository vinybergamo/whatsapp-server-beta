import { FastifyInstance, FastifyRequest } from "fastify";
import { userAuthPlugin } from "../helpers/plugins/user-auth";

export function instancesRoutes(app: FastifyInstance) {
  app.register(userAuthPlugin);

  app.post(
    "/instances",
    {
      schema: {
        body: {
          type: "object",
          properties: {
            name: { type: "string" },
          },
          required: ["name"],
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          name: string;
        };
      }>,
      reply
    ) => {
      const { name } = request.body;
      const user = request.user;

      const instance = await app.prisma.instance.create({
        data: {
          instanceName: name,
          userId: user.id,
        },
      });

      return reply.send(instance).code(201);
    }
  );

  app.get("/instances", async (request, reply) => {
    const user = request.user;

    const instances = await app.prisma.instance.findMany({
      where: {
        userId: user.id,
      },
    });

    return reply.send(instances).code(200);
  });

  app.post(
    "/instances/:id/webhooks",
    {
      schema: {
        body: {
          type: "object",
          properties: {
            url: { type: "string" },
            events: { type: "array", items: { type: "string" } },
          },
          required: ["url", "events"],
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: {
          id: string;
        };
        Body: {
          url: string;
          events: string[];
        };
      }>,
      reply
    ) => {
      const user = request.user;
      const { id } = request.params;
      const { url, events } = request.body;

      const instance = await app.prisma.instance.findUnique({
        where: {
          id,
        },
      });

      if (!instance) {
        return reply.status(404).send({ message: "Instance not found" });
      }

      if (instance.userId !== user.id) {
        return reply.status(403).send({ message: "Forbidden" });
      }

      const webhook = await app.prisma.webhook.create({
        data: {
          url,
          events,
          instanceId: id,
        },
      });

      return reply.send(webhook).code(201);
    }
  );

  app.delete(
    "/instances/:id/webhooks/:webhookId",
    async (
      request: FastifyRequest<{
        Params: {
          id: string;
          webhookId: string;
        };
      }>,
      reply
    ) => {
      const user = request.user;
      const { id, webhookId } = request.params;

      const instance = await app.prisma.instance.findUnique({
        where: {
          id,
        },
      });

      if (!instance) {
        return reply.status(404).send({ message: "Instance not found" });
      }

      if (instance.userId !== user.id) {
        return reply.status(403).send({ message: "Forbidden" });
      }

      const webhook = await app.prisma.webhook.delete({
        where: {
          id: webhookId,
        },
      });

      return reply.send(webhook).code(200);
    }
  );

  app.put(
    "/instances/:id/webhooks/:webhookId",
    {
      schema: {
        body: {
          type: "object",
          properties: {
            url: { type: "string" },
            events: { type: "array", items: { type: "string" } },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: {
          id: string;
          webhookId: string;
        };
        Body: {
          url: string;
          events: string[];
        };
      }>,
      reply
    ) => {
      const user = request.user;
      const { id, webhookId } = request.params;
      const { url, events } = request.body;

      const instance = await app.prisma.instance.findUnique({
        where: {
          id,
        },
      });

      if (!instance) {
        return reply.status(404).send({ message: "Instance not found" });
      }

      if (instance.userId !== user.id) {
        return reply.status(403).send({ message: "Forbidden" });
      }

      const webhook = await app.prisma.webhook.update({
        where: {
          id: webhookId,
        },
        data: {
          url,
          events,
        },
      });

      return reply.send(webhook).code(200);
    }
  );

  app.post(
    "/instances/:id/webhooks/:webhookId/disable",
    async (
      request: FastifyRequest<{
        Params: {
          id: string;
        };
      }>,
      reply
    ) => {
      const user = request.user;
      const { id } = request.params;

      const instance = await app.prisma.instance.findUnique({
        where: {
          id,
        },
      });

      if (!instance) {
        return reply.status(404).send({ message: "Instance not found" });
      }

      if (instance.userId !== user.id) {
        return reply.status(403).send({ message: "Forbidden" });
      }

      await app.prisma.webhook.updateMany({
        where: {
          instanceId: id,
        },
        data: {
          enabled: false,
        },
      });

      return reply.send({ message: "Webhook disabled" }).code(200);
    }
  );

  app.post(
    "/instances/:id/webhooks/:webhookId/enable",
    async (
      request: FastifyRequest<{
        Params: {
          id: string;
        };
      }>,
      reply
    ) => {
      const user = request.user;
      const { id } = request.params;

      const instance = await app.prisma.instance.findUnique({
        where: {
          id,
        },
      });

      if (!instance) {
        return reply.status(404).send({ message: "Instance not found" });
      }

      if (instance.userId !== user.id) {
        return reply.status(403).send({ message: "Forbidden" });
      }

      await app.prisma.webhook.updateMany({
        where: {
          instanceId: id,
        },
        data: {
          enabled: true,
        },
      });

      return reply.send({ message: "Webhook enabled" }).code(200);
    }
  );

  app.get(
    "/instances/:id/webhooks",
    async (
      request: FastifyRequest<{
        Params: {
          id: string;
        };
      }>,
      reply
    ) => {
      const user = request.user;
      const { id } = request.params;

      const instance = await app.prisma.instance.findUnique({
        where: {
          id,
        },
        include: {
          webhooks: true,
        },
      });

      if (!instance) {
        return reply.status(404).send({ message: "Instance not found" });
      }

      if (instance.userId !== user.id) {
        return reply.status(403).send({ message: "Forbidden" });
      }

      return reply.send(instance.webhooks).code(200);
    }
  );
}
