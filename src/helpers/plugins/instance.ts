import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { prisma } from "../../database";
import { startWhatsapp } from "../../whatsapp";

async function hook(request: FastifyRequest, reply: FastifyReply) {
  const { instanceId } = request.query as { instanceId: string };
  const { authorization } = request.headers as { authorization: string };
  if (!instanceId) {
    return reply.status(400).send({ message: "Instance ID is required" });
  }

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

  const instance = await prisma.instance.findUnique({
    where: {
      id: instanceId,
      token,
    },
  });

  if (!instance) {
    return reply.status(401).send({ message: "Invalid token" });
  }

  const whatsapp = await startWhatsapp(instanceId);

  request.whatsapp = whatsapp;
  request.instanceId = instanceId;
  request.instance = instance;
}

function callback(app: FastifyInstance) {
  app.addHook("onRequest", hook);
}

export const intsancePlugin = fp(callback);
export const instanceAuthPlugin = fp(callback);
