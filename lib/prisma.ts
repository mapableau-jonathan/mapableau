import { PrismaClient } from "@prisma/client";

const prismaClientSingleton = () =>
  new PrismaClient({
    log: ["error", "warn"],
  });

declare const globalThis: {
  prismaGlobal: PrismaClient;
} & typeof global;

export const prisma: PrismaClient =
  globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma;
