import { create, SocketState } from "@wppconnect-team/wppconnect";
import { prisma } from "../database";
import { instances } from "./instances";
import { config } from "../utils/config";
import fs from "fs/promises";
import path from "path";

export async function startWhatsapp(id: string) {
  const instance = await prisma.instance.findUnique({ where: { id } });
  if (!instance) throw new Error("Instance not found");

  let client = instances.get(instance.id);
  if (client) return client;

  client = await create({
    session: instance.id,
    disableWelcome: true,
    waitForLogin: false,
    logQR: config.app.env === "development",
    browserArgs: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-extensions",
      "--disable-gpu",
      "--disable-infobars",
      "--window-size=1280,800",
    ],
    headless: true,
    puppeteerOptions: {},
    browserWS: `wss://${config.whatsapp.browser}?token=${config.whatsapp.browserToken}&timeout=0`,
    autoClose: 60000,
  });

  await new Promise<void>((resolve) => {
    client.onStateChange((state) => {
      if (state === "CONNECTED" || state === "UNPAIRED") {
        resolve();
      }
    });
  });

  instances.set(instance.id, client);

  client.onStateChange(async (state) => {
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
      const [chats, contacts] = await Promise.all([
        client.listChats(),
        client.getAllContacts(),
      ]);

      await prisma.instance.update({
        where: { id: instance.id },
        data: {
          platform: host.platform,
          profileStatus: profileStatus.status,
          connectedPhone: phoneNumber,
          name: host.pushname,
          chats: chats.length,
          contacts: contacts.length,
        },
      });
    }
  });

  client.onAnyMessage(async (message) => {
    const fromMe = message.fromMe;
    const inst = await prisma.instance.findUnique({ where: { id } });
    if (!inst) return;

    await prisma.instance.update({
      where: { id: id },
      data: fromMe
        ? { messagesSent: inst.messagesSent + 1 }
        : { messagesReceived: inst.messagesReceived + 1 },
    });
  });

  return client;
}
