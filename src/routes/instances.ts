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
}
