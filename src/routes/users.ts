import { FastifyInstance } from "fastify";
import { userAuthPlugin } from "../helpers/plugins/user-auth";

export function usersRoute(app: FastifyInstance) {
  app.register(userAuthPlugin);

  app.get("/me", async (request, reply) => {
    const user = request.user;

    return reply.code(200).send(user);
  });
}
