import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { prisma } from "../../database";
import { instances } from "../../whatsapp/instances";

const CONNECTION_ROUTES = ["/instance/qrcode"];

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

  const [path] = request.url.split("?");

  if (CONNECTION_ROUTES.includes(path)) {
    request.instance = instance;
    request.instanceId = instanceId;
    return;
  }

  const whatsapp = instances.get(instance.id);

  if (!whatsapp) {
    return reply.status(404).send({ message: "Instance not started" });
  }

  request.whatsapp = whatsapp;
  request.instanceId = instanceId;
  request.instance = instance;
}

function callback(app: FastifyInstance) {
  app.addHook("onRequest", hook);
}

export const intsancePlugin = fp(callback);
export const instanceAuthPlugin = fp(callback);
