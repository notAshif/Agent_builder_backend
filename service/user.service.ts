import { prisma } from "../prisma/db.js";
import { generateApiKey } from "../ultil/crypto.util.js";
import { NotFoundError } from "../ultil/error.utils.js";

export const UserService = {
    getProfile: async (userId: string) => {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, name: true, createdAt: true },
        });
        if (!user) throw new NotFoundError("User not found");
        return user;
    },

    updateProfile: async (userId: string, name: string) => {
        return prisma.user.update({
            where: { id: userId },
            data: { name },
            select: { id: true, email: true, name: true, updatedAt: true },
        });
    },

    listApiKeys: async (userId: string) => {
        return prisma.apiKeys.findMany({
            where: { userId },
            select: { id: true, name: true, createAt: true, lastTime: true },
        });
    },

    createApiKey: async (userId: string, name: string) => {
        const key = generateApiKey();
        return prisma.apiKeys.create({
            data: { userId, name, key },
            select: { id: true, name: true, key: true, createAt: true },
        });
    },

    deleteApiKey: async (userId: string, keyId: string) => {
        const existing = await prisma.apiKeys.findFirst({ where: { id: keyId, userId } });
        if (!existing) throw new NotFoundError("API key not found");
        await prisma.apiKeys.delete({ where: { id: keyId } });
    },
};
