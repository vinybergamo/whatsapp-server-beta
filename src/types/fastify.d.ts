import { instances } from "./../whatsapp/instances";
import { Instance, PrismaClient, User } from "@prisma/client";
import { Whatsapp } from "@wppconnect-team/wppconnect";
import "fastify";

export {};

declare module "fastify" {
  interface FastifyRequest {
    whatsapp: Whatsapp;
    instanceId: string;
    instance: Instance;
    user: Omit<User, "password">;
  }

  interface FastifyReply {}

  interface FastifyContextConfig {}

  interface FastifyInstance {
    prisma: PrismaClient;
    instances: Map<string, Whatsapp>;
    plugins: {
      instanceAuth: (app: FastifyInstance) => void;
    };
    generateToken: (payload: any) => string;
    verifyToken: (token: string) => any;
  }
}
