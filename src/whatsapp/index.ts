import { create, SocketState } from "@wppconnect-team/wppconnect";
import { prisma } from "../database";
import { instances } from "./instances";
import { config } from "../utils/config";

export async function startWhatsapp(id: string) {
  const folderName = "tokens";
  const instance = await prisma.instance.findUnique({
    where: { id },
  });

  if (!instance) {
    throw new Error("Instance not found");
  }

  let client = instances.get(instance.id);

  if (client) {
    return client;
  }

  client = await create({
    session: instance.id,
    disableWelcome: true,
    waitForLogin: false,
    logQR: true,
    browserArgs: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--aggressive-cache-discard",
      "--disable-cache",
      "--disable-application-cache",
      "--disable-offline-load-stale-cache",
      "--disk-cache-size=0",
    ],
    headless: true,
    puppeteerOptions: {
      executablePath: config.whatsapp.browser_bin,
    },
    folderNameToken: folderName,
    autoClose: 60000,
  });

  instances.set(instance.id, client);

  client.onStateChange(async (state) => {
    console.log("State changed:", state);
    await prisma.instance.update({
      where: { id: instance.id },
      data: {
        state,
        connected: state === SocketState.CONNECTED,
      },
    });

    if (state === SocketState.CONNECTED) {
      const host = await client.getHostDevice();
      const wid = await client.getWid();
      const [phoneNumber] = wid.split("@");
      const profileStatus = await client.getStatus(wid);

      await prisma.instance.update({
        where: { id: instance.id },
        data: {
          platform: host.platform,
          profileStatus: profileStatus.status,
          connectedPhone: phoneNumber,
          name: host.pushname,
        },
      });
    }
  });

  client.onAnyMessage(async (message) => {
    console.log("Message received:", message);
    const fromMe = message.fromMe;
    const instance = await prisma.instance.findUnique({
      where: { id: id },
    });

    console.log("Instance found:", instance);

    if (fromMe) {
      await prisma.instance.update({
        where: { id: instance.id },
        data: {
          messagesSent: instance.messagesSent + 1,
        },
      });
    }

    if (!fromMe) {
      await prisma.instance.update({
        where: { id: instance.id },
        data: {
          messagesReceived: instance.messagesReceived + 1,
        },
      });
    }
  });

  await new Promise<void>((resolve) => {
    client.onStateChange((state) => {
      if (state === "CONNECTED" || state === "UNPAIRED") {
        resolve();
      }
    });
  });

  const [chats, contacts] = await Promise.all([
    client.listChats(),
    client.getAllContacts(),
  ]);

  await prisma.instance.update({
    where: { id: instance.id },
    data: {
      chats: chats.length,
      contacts: contacts.length,
    },
  });

  return client;
}
