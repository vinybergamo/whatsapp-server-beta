import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

async function hook(
  request: FastifyRequest<{ Headers: { authorization: string } }>,
  reply: FastifyReply
) {
  const { authorization } = request.headers;

  if (!authorization) {
    return reply.status(401).send({ message: "Authorization is required" });
  }

  const [type, token] = authorization.split(" ");

  if (type !== "Bearer") {
    return reply.status(401).send({ message: "Invalid authorization type" });
  }

  if (!token) {
    return reply.status(401).send({ message: "Token is required" });
  }

  try {
    const payload = await request.server.verifyToken(token);
    const user = await request.server.prisma.user.findUnique({
      where: {
        id: payload.id,
      },
      omit: {
        password: true,
      },
    });

    if (!user) {
      return reply.status(401).send({ message: "Invalid token" });
    }

    request.user = user;
  } catch (error) {
    return reply.status(401).send({ message: "Invalid token" });
  }
}

function callback(app: FastifyInstance) {
  app.addHook("onRequest", hook);
}

export const userAuthPlugin = fp(callback);
