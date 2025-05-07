import { AsyncTask } from "toad-scheduler";
import { prisma } from "../database";
import { instances } from "../whatsapp/instances";
import { sendWebhook } from "../helpers/functions/send-webhook";

export const cancelTrialTask = new AsyncTask("cancel-trials", async () => {
  const now = new Date();
  const users = await prisma.user.findMany({
    where: {
      trialEnd: {
        lte: now,
      },
      isTrial: true,
      isAdmin: false,
    },
  });

  const instanceUpdateData = {
    state: "DISCONNECTED",
    connected: false,
    blocked: true,
    isActive: false,
  };

  const userInstances = await prisma.instance.findMany({
    where: {
      userId: {
        in: users.map((user) => user.id),
      },
    },
  });

  for (const i of userInstances) {
    const instance = instances.get(i.id);

    if (instance) {
      await sendWebhook(i.id, "INSTANCE_DISCONNECTED", {
        instance: {
          ...i,
          ...instanceUpdateData,
        },
      });
      await instance.logout();
      await instance.close();

      instances.delete(i.id);
    }
  }

  await prisma.instance.updateMany({
    where: {
      userId: {
        in: users.map((user) => user.id),
      },
    },
    data: instanceUpdateData,
  });
});
