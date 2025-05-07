import { FastifyInstance, FastifyRequest } from "fastify";
import { intsancePlugin } from "../helpers/plugins/instance";
import { sendWebhook } from "../helpers/functions/send-webhook";
import { instances } from "../whatsapp/instances";
import { startWhatsapp } from "../whatsapp";

export function instanceRoutes(app: FastifyInstance) {
  app.register(intsancePlugin);

  app.get("/instance/qrcode", async (request, reply) => {
    const instance = app.instances.get(request.instance.id);

    if (instance) {
      const isAuthenticated = await instance.isAuthenticated();
      if (isAuthenticated) {
        return reply.code(200).send({
          statusCode: "ALREADY_CONNECTED",
          message: "Whatsapp is already connected",
          instance: request.instance,
        });
      }

      const qrcode = await instance.getQrCode();

      return reply.code(200).send(qrcode);
    }

    const whatsapp = await startWhatsapp(request.instance.id);

    const isAuthenticated = await whatsapp.isAuthenticated();

    if (isAuthenticated) {
      return reply.code(200).send({
        statusCode: "ALREADY_CONNECTED",
        message: "Whatsapp is already connected",
        instance: request.instance,
      });
    }
    const qrcode = await whatsapp.getQrCode();

    return reply.code(200).send({
      statusCode: "QR_CODE",
      message: "QR Code generated",
      qrcode,
      instance: request.instance,
    });
  });

  app.post("/instance/logout", async (request, reply) => {
    const whatsapp = request.whatsapp;

    const isAuthenticated = await whatsapp.isAuthenticated();

    if (!isAuthenticated) {
      return reply.code(400).send({
        message: "Whatsapp is not connected",
      });
    }

    await whatsapp.logout();

    await app.prisma.instance.update({
      where: { id: request.instance.id },
      data: {
        connected: false,
        state: "DISCONNECTED",
      },
    });

    const instance = await app.prisma.instance.findUnique({
      where: { id: request.instance.id },
    });

    sendWebhook(instance.id, "INSTANCE_DISCONNECTED", { instance });

    await whatsapp.close();

    instances.delete(request.instance.id);

    return reply.code(200).send({
      message: "Whatsapp logged out",
    });
  });

  app.post("/instance/disconnect", async (request, reply) => {
    const whatsapp = request.whatsapp;

    const isAuthenticated = await whatsapp.isAuthenticated();

    if (!isAuthenticated) {
      return reply.code(400).send({
        message: "Whatsapp is not connected",
      });
    }

    await whatsapp.close();

    await app.prisma.instance.update({
      where: { id: request.instance.id },
      data: {
        connected: false,
        state: "DISCONNECTED",
        disconnectedBySystem: false,
      },
    });

    const instance = await app.prisma.instance.findUnique({
      where: { id: request.instance.id },
    });

    sendWebhook(instance.id, "INSTANCE_DISCONNECTED", { instance });

    instances.delete(request.instance.id);

    return reply.code(200).send({
      message: "Whatsapp disconnected",
    });
  });

  app.get("/instance/fetch-instance", async (request, reply) => {
    return reply.send(request.instance).code(200);
  });
}
