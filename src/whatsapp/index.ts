import { create, SocketState, StatusFind } from "@wppconnect-team/wppconnect";
import { prisma } from "../database";
import { instances } from "./instances";
import { config } from "../utils/config";
import { sendWebhook } from "../helpers/functions/send-webhook";

const BROWSER_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-extensions",
  "--disable-gpu",
  "--disable-infobars",
  "--window-size=1280,800",
];

const UPDATE_INTERVAL = 60000;
const INITIAL_DELAY = 10000;

async function updateInstanceInfo(client, instanceId) {
  try {
    const [wid] = await Promise.all([client.getWid()]);
    const [phoneNumber] = wid.split("@");
    const [chats, contacts, profileStatus, profile, host] = await Promise.all([
      client.listChats(),
      client.getAllContacts(),
      client.getStatus(wid),
      client.getProfilePicFromServer(wid),
      client.getHostDevice(),
    ]);

    await prisma.instance.update({
      where: { id: instanceId },
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
  } catch (error) {
    console.error("Error updating instance info:", error);
  }
}

export async function startWhatsapp(id: string) {
  const instance = await prisma.instance.findUnique({ where: { id } });
  if (!instance) throw new Error("Instance not found");

  let client = instances.get(instance.id);
  if (client) return client;

  const launchArgs = JSON.stringify({
    args: [...BROWSER_ARGS, `--user-data-dir=~/tokens/${id}`],
  });

  await prisma.instance.update({
    where: { id },
    data: { status: "STARTING" },
  });

  client = await create({
    session: instance.id,
    disableWelcome: true,
    waitForLogin: false,
    logQR: config.app.env === "development",
    updatesLog: false,
    browserArgs: BROWSER_ARGS,
    headless: true,
    puppeteerOptions: {},
    browserWS: `wss://${config.whatsapp.browser}?token=${config.whatsapp.browserToken}&timeout=0&launch=${launchArgs}`,
    autoClose: 60000,
    catchQR: async (qrCode, asciiQR, attempt, urlCode) => {
      await prisma.instance.update({
        where: { id },
        data: { status: "QR_CODE" },
      });
      sendWebhook(instance.id, "QR_CODE", {
        qrcode: { image: qrCode, asciiQR, attempt, urlCode },
      });
    },
    statusFind: async (status) => {
      if (status === StatusFind.inChat) {
        await new Promise((resolve) => setTimeout(resolve, INITIAL_DELAY));
        await updateInstanceInfo(client, instance.id);
      }
    },
  });

  instances.set(instance.id, client);

  // Event Handlers
  client.onStateChange(async (state) => {
    const isConnected = state === SocketState.CONNECTED;

    await prisma.instance.update({
      where: { id: instance.id },
      data: {
        state,
        connected: isConnected,
        disconnectedBySystem: false,
        ...(isConnected && { status: "CONNECTED" }),
      },
    });

    if (state === SocketState.CONFLICT) {
      await client.useHere();
    }

    if (isConnected) {
      sendWebhook(instance.id, "INSTANCE_CONNECTED", {
        instance: await prisma.instance.findUnique({
          where: { id: instance.id },
        }),
      });

      await updateInstanceInfo(client, instance.id);
      setInterval(
        () => updateInstanceInfo(client, instance.id),
        UPDATE_INTERVAL
      );
    }

    if (state === SocketState.UNPAIRED) {
      await prisma.instance.update({
        where: { id: instance.id },
        data: { state, connected: false },
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
    const i = await prisma.instance.findUnique({ where: { id } });
    sendWebhook(instance.id, "INCOMING_CALL", { call });

    if (i.rejectCalls) {
      await client.rejectCall(call.id);
      await client.sendText(
        call?.peerJid || call?.groupJid,
        i.rejectCallsMessage
      );
    }
  });

  client.onAnyMessage(async (message) => {
    if (
      message.from === "status@broadcast" ||
      message.from.endsWith("@newsletter")
    ) {
      return;
    }

    const i = await prisma.instance.findUnique({
      where: { id },
      include: { webhooks: true },
    });
    if (!i) return;

    if (i.automaticReading) {
      await client.sendSeen(message.from);
    }

    const updateField = message.fromMe ? "messagesSent" : "messagesReceived";
    await prisma.instance.update({
      where: { id },
      data: { [updateField]: { increment: 1 } },
    });

    sendWebhook(i.id, message.fromMe ? "MESSAGE_SENT" : "MESSAGE_RECEIVED", {
      message,
    });
  });

  client.onAck(async (message) => {
    const i = await prisma.instance.findUnique({ where: { id } });
    if (!i) return;
    sendWebhook(i.id, "MESSAGE_ACK", { message });
  });

  await new Promise<void>((resolve) => {
    client.onStateChange((state) => {
      if ([SocketState.CONNECTED, SocketState.UNPAIRED].includes(state)) {
        resolve();
      }
    });
  });

  return client;
}
