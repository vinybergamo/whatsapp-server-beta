import axios from "axios";
import { prisma } from "../../database";

export async function sendWebhook(
  instanceId: string,
  event: string,
  data: any
) {
  const instance = await prisma.instance.findUnique({
    where: { id: instanceId },
    include: {
      webhooks: true,
    },
  });

  if (!instance) return;

  const webhooks = instance.webhooks;

  for (const webhook of webhooks) {
    const events = webhook.events;
    const isEnabled = events.some((e) => e === event) && webhook.enabled;

    if (!isEnabled) {
      continue;
    }

    if (!events.includes(event)) {
      continue;
    }

    await axios.post(
      webhook.url,
      {
        instanceId: instance.id,
        event,
        data,
      },
      {
        params: {
          instanceId: instance.id,
          event,
        },
      }
    );
  }
}
