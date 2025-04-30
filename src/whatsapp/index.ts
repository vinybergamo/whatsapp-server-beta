import { create, SocketState, StatusFind } from "@wppconnect-team/wppconnect";
import { prisma } from "../database";
import { instances } from "./instances";
import { config } from "../utils/config";
import axios from "axios";
import { sendWebhook } from "../helpers/functions/send-webhook";

export async function startWhatsapp(id: string) {
  const instance = await prisma.instance.findUnique({ where: { id } });
  if (!instance) throw new Error("Instance not found");

  const launchArgs = JSON.stringify({
    args: [
      `--user-data-dir=~/tokens/${id}`,
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-extensions",
      "--disable-gpu",
      "--disable-infobars",
    ],
  });

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
    browserWS: `wss://${config.whatsapp.browser}?token=${config.whatsapp.browserToken}&timeout=0&launch=${launchArgs}`,
    autoClose: 60000,
    catchQR: (
      qrCode: string,
      asciiQR: string,
      attempt: number,
      urlCode?: string
    ) => {
      sendWebhook(instance.id, "QR_CODE", {
        qrcode: { image: qrCode, asciiQR, attempt, urlCode },
      });
    },
    statusFind: async (status) => {
      if (status === StatusFind.inChat) {
        await new Promise((resolve) => setTimeout(resolve, 10000));
        const [wid] = await Promise.all([client.getWid()]);
        const [phoneNumber] = wid.split("@");
        const [chats, contacts, profileStatus] = await Promise.all([
          client.listChats(),
          client.getAllContacts(),
          client.getStatus(wid),
        ]);

        const profile = await client.getProfilePicFromServer(wid);
        const host = await client.getHostDevice();

        await prisma.instance.update({
          where: { id: instance.id },
          data: {
            platform: host.platform,
            profileStatus: profileStatus.status,
            connectedPhone: phoneNumber,
            name: host.pushname,
            chats: chats.length,
            contacts: contacts.length,
            picture: profile.eurl,
          },
        });
      }
    },
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
      await sendWebhook(instance.id, "INSTANCE_CONNECTED", {
        instance: await prisma.instance.findUnique({
          where: { id: instance.id },
        }),
      });
    }

    if (state === SocketState.CONNECTED) {
      setInterval(async () => {
        const [wid] = await Promise.all([client.getWid()]);
        const [phoneNumber] = wid.split("@");
        const [chats, contacts, profileStatus] = await Promise.all([
          client.listChats(),
          client.getAllContacts(),
          client.getStatus(wid),
        ]);

        const profile = await client.getProfilePicFromServer(wid);
        const host = await client.getHostDevice();

        await prisma.instance.update({
          where: { id: instance.id },
          data: {
            platform: host.platform,
            profileStatus: profileStatus.status,
            connectedPhone: phoneNumber,
            name: host.pushname,
            chats: chats.length,
            contacts: contacts.length,
            picture: profile.eurl,
          },
        });
      }, 60000);
    }

    if (state === SocketState.UNPAIRED) {
      instances.delete(instance.id);
      await prisma.instance.update({
        where: { id: instance.id },
        data: {
          state,
          connected: false,
        },
      });
      const qr = await client.getQrCode();

      if (!qr) {
        sendWebhook(instance.id, "INSTANCE_DISCONNECTED", {
          instance: await prisma.instance.findUnique({
            where: { id: instance.id },
          }),
        });
      }
    }
  });

  client.onIncomingCall(async (call) => {
    sendWebhook(instance.id, "INCOMING_CALL", { call });

    if (instance.rejectCalls) {
      await client.rejectCall(call.id);

      await client.sendText(
        call?.peerJid || call?.groupJid,
        instance.rejectCallsMessage
      );
    }
  });

  client.onAnyMessage(async (message) => {
    const isStatus = message.from === "status@broadcast";
    const isNewsletter = message.from.endsWith("@newsletter");

    if (isStatus || isNewsletter) return;

    const fromMe = message.fromMe;
    const instance = await prisma.instance.findUnique({
      where: { id },
      include: {
        webhooks: true,
      },
    });
    if (!instance) return;

    await prisma.instance.update({
      where: { id: id },
      data: fromMe
        ? { messagesSent: instance.messagesSent + 1 }
        : { messagesReceived: instance.messagesReceived + 1 },
    });

    const event = fromMe ? "MESSAGE_SENT" : "MESSAGE_RECEIVED";

    sendWebhook(instance.id, event, { message });
  });

  await new Promise<void>((resolve) => {
    client.onStateChange((state) => {
      if (state === SocketState.CONNECTED || state === SocketState.UNPAIRED) {
        resolve();
      }
    });
  });

  return client;
}
