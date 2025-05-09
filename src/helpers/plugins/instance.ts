import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { prisma } from "../../database";
import { instances } from "../../whatsapp/instances";

const CONNECTION_ROUTES = ["/instance/qrcode"];

async function hook(
  request: FastifyRequest<{
    Headers: {
      authorization?: string;
    };
    Querystring: {
      instanceId: string;
      token?: string;
    };
  }>,
  reply: FastifyReply
) {
  const { instanceId, token: tokenQuery } = request.query;
  const { authorization } = request.headers;

  if (!instanceId) {
    return reply.status(400).send({ message: "Instance ID is required" });
  }

  if (!authorization) {
    return reply.status(401).send({ message: "Authorization is required" });
  }

  const [type, tokenHeader] = authorization.split(" ");

  const token = tokenQuery || tokenHeader;

  if (tokenHeader && type !== "Bearer") {
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

  if (!instance.isActive) {
    return reply.status(401).send({ message: "Instance is not active" });
  }

  if (instance.blocked) {
    return reply.status(401).send({ message: "Instance is blocked" });
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
