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
      const now = new Date();
      const { name } = request.body;
      const user = request.user;

      const trialExpired = user.trialEnd < now;

      if (trialExpired) {
        return reply.status(403).send({
          message: "Trial expired",
        });
      }

      const userInstances = await app.prisma.instance.count({
        where: {
          userId: user.id,
        },
      });

      // if (user.isTrial && userInstances >= 1) {
      //   return reply.status(403).send({
      //     message: "Trial limit reached",
      //   });
      // }

      const instance = await app.prisma.instance.create({
        data: {
          instanceName: name,
          userId: user.id,
          isActive: true,
          state: "DISCONNECTED",
        },
      });

      return reply.send(instance).code(201);
    }
  );

  app.put(
    "/instances/:id",
    {
      schema: {
        body: {
          type: "object",
          properties: {
            instanceName: { type: "string" },
            automaticReading: { type: "boolean" },
            syncContacts: { type: "boolean" },
            rejectCalls: { type: "boolean" },
            rejectCallsMessage: { type: "string" },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: {
          id: string;
        };
        Body: {
          instanceName: string;
          automaticReading: boolean;
          syncContacts: boolean;
          rejectCalls: boolean;
          rejectCallsMessage: string;
        };
      }>,
      reply
    ) => {
      const user = request.user;
      const { id } = request.params;
      const {
        instanceName,
        automaticReading,
        rejectCalls,
        rejectCallsMessage,
        syncContacts,
      } = request.body;

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

      const updatedInstance = await app.prisma.instance.update({
        where: {
          id,
        },
        data: {
          instanceName,
          automaticReading,
          syncContacts,
          rejectCalls,
          rejectCallsMessage,
        },
      });

      return reply.send(updatedInstance).code(200);
    }
  );

  app.get(
    "/instances",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            webhooks: { type: "string", enum: ["true", "false"] },
          },
          required: ["webhooks"],
        },
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: {
          webhooks: string;
        };
      }>,
      reply
    ) => {
      const { webhooks } = request.query;
      const user = request.user;

      const instances = await app.prisma.instance.findMany({
        where: {
          userId: user.id,
        },
        include: {
          webhooks: webhooks === "true",
        },
      });

      return reply.send(instances).code(200);
    }
  );

  app.get(
    "/instances/:id",
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

      return reply.code(200).send(instance);
    }
  );

  app.post(
    "/instances/:id/webhooks",
    {
      schema: {
        body: {
          type: "object",
          properties: {
            name: { type: "string" },
            url: { type: "string" },
            events: { type: "array", items: { type: "string" } },
          },
          required: ["name", "url", "events"],
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: {
          id: string;
        };
        Body: {
          name: string;
          url: string;
          events: string[];
        };
      }>,
      reply
    ) => {
      const user = request.user;
      const { id } = request.params;
      const { url, events, name } = request.body;

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
          name,
          events,
          instanceId: instance.id,
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
