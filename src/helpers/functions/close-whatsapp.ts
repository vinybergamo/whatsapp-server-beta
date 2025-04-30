import axios from "axios";
import { prisma } from "../../database";
import { instances } from "../../whatsapp/instances";
import { config } from "../../utils/config";
import { sendWebhook } from "./send-webhook";

export async function closeWhatsapp(instanceId: string) {
  const instance = await prisma.instance.findUnique({
    where: { id: instanceId },
  });

  if (!instance) {
    throw new Error("Instance not found");
  }

  const whatsapp = instances.get(instance.id);

  if (!whatsapp) {
    throw new Error("Instance not started");
  }

  await whatsapp.close();

  const updatedInstance = await prisma.instance.update({
    where: { id: instance.id },
    data: {
      connected: false,
      state: "DISCONNECTED",
    },
  });

  await sendWebhook(instance.id, "INSTANCE_DISCONNECTED", {
    instance: updatedInstance,
  });

  await axios.get(`${config.whatsapp.browser}/kill/${instanceId}`, {
    params: {
      token: config.whatsapp.browserToken,
    },
  });

  instances.delete(instance.id);
}
