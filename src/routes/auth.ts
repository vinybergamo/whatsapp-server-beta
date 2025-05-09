import { FastifyInstance, FastifyRequest } from "fastify";
import { genSaltSync, hashSync, compareSync } from "bcrypt";
import { config } from "../utils/config";
import { add, set } from "date-fns";

export function authRoutes(app: FastifyInstance) {
  app.post(
    "/auth/register",
    {
      schema: {
        body: {
          type: "object",
          properties: {
            name: { type: "string" },
            document: { type: "string" },
            email: { type: "string" },
            password: { type: "string" },
          },
          required: ["name", "document", "email", "password"],
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          name: string;
          document: string;
          email: string;
          password: string;
        };
      }>,
      reply
    ) => {
      const now = new Date();
      const { name, email, password, document } = request.body;

      const user = await app.prisma.user.findMany({
        where: {
          OR: [
            {
              email: email,
            },
            {
              document: document,
            },
          ],
        },
      });

      if (user.length > 0) {
        return reply.status(400).send({
          message: "User already exists",
        });
      }

      const salt = genSaltSync(10);
      const hashedPassword = hashSync(password, salt);

      const trialEnd = add(now, {
        days: config.trialDays,
      });

      const newUser = await app.prisma.user.create({
        data: {
          name,
          email,
          document,
          password: hashedPassword,
          isTrial: true,
          isAdmin: false,
          trialStart: now,
          trialEnd: set(trialEnd, {
            milliseconds: 0,
            hours: 0,
            minutes: 0,
            seconds: 0,
          }),
        },
      });

      const token = await app.generateToken({
        id: newUser.id,
      });

      delete newUser.password;

      return reply.status(201).send({
        user: newUser,
        token,
      });
    }
  );

  app.post(
    "/auth/login",
    {
      schema: {
        body: {
          type: "object",
          properties: {
            email: { type: "string" },
            password: { type: "string" },
          },
          required: ["email", "password"],
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          email: string;
          password: string;
        };
      }>,
      reply
    ) => {
      const { email, password } = request.body;

      const user = await app.prisma.user.findUnique({
        where: {
          email,
        },
      });

      if (!user) {
        return reply.status(401).send({
          message: "Invalid credentials",
        });
      }

      const isValidPassword = compareSync(password, user.password);

      if (!isValidPassword) {
        return reply.status(401).send({
          message: "Invalid credentials",
        });
      }

      const token = await app.generateToken({
        id: user.id,
      });

      delete user.password;

      return reply.status(200).send({
        user,
        token,
      });
    }
  );
}
