import { prisma } from "../prisma/db.js";
import { generateApiKey } from "../ultil/crypto.util.js";
import { NotFoundError } from "../ultil/error.utils.js";

const providerKeyPrefix = "provider:";
const supportedProviders = ["openrouter", "openai", "anthropic"] as const;
export type ProviderKeyProvider = typeof supportedProviders[number];

const providerKeyName = (provider: ProviderKeyProvider) => `${providerKeyPrefix}${provider}`;

const assertProvider = (provider: string): ProviderKeyProvider => {
    if (!supportedProviders.includes(provider as ProviderKeyProvider)) {
        throw new Error("Unsupported provider");
    }
    return provider as ProviderKeyProvider;
};

const validateProviderKey = async (provider: ProviderKeyProvider, key: string) => {
    if (provider === "openrouter") {
        const response = await fetch("https://openrouter.ai/api/v1/key", {
            headers: { Authorization: `Bearer ${key}` },
        });
        if (!response.ok) throw new Error("Invalid OpenRouter API key");
        return;
    }

    if (provider === "openai") {
        const response = await fetch("https://api.openai.com/v1/models", {
            headers: { Authorization: `Bearer ${key}` },
        });
        if (!response.ok) throw new Error("Invalid OpenAI API key");
        return;
    }

    if (provider === "anthropic") {
        const response = await fetch("https://api.anthropic.com/v1/models", {
            headers: {
                "x-api-key": key,
                "anthropic-version": "2023-06-01",
            },
        });
        if (!response.ok) throw new Error("Invalid Anthropic API key");
    }
};

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
        const keys = await prisma.apiKeys.findMany({
            where: { userId },
            select: { id: true, name: true, createAt: true, lastTime: true },
        });
        return keys.filter((key) => !key.name.startsWith(providerKeyPrefix));
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

    listProviderKeys: async (userId: string) => {
        const keys = await prisma.apiKeys.findMany({
            where: { userId },
            select: { name: true, updatedAt: true, lastTime: true },
        });

        return supportedProviders.map((provider) => {
            const key = keys.find((item) => item.name === providerKeyName(provider));
            return {
                provider,
                hasKey: Boolean(key),
                updatedAt: key?.updatedAt ?? null,
                lastTime: key?.lastTime ?? null,
            };
        });
    },

    upsertProviderKey: async (userId: string, providerValue: string, key: string) => {
        const provider = assertProvider(providerValue);
        await validateProviderKey(provider, key);

        await prisma.apiKeys.deleteMany({
            where: { userId, name: providerKeyName(provider) },
        });

        await prisma.apiKeys.create({
            data: { userId, name: providerKeyName(provider), key },
        });

        return { provider, hasKey: true, updatedAt: new Date(), lastTime: null };
    },

    deleteProviderKey: async (userId: string, providerValue: string) => {
        const provider = assertProvider(providerValue);
        await prisma.apiKeys.deleteMany({
            where: { userId, name: providerKeyName(provider) },
        });
    },

    getProviderKey: async (userId: string, providerValue: string) => {
        const provider = assertProvider(providerValue);
        const apiKey = await prisma.apiKeys.findFirst({
            where: { userId, name: providerKeyName(provider) },
            select: { id: true, key: true },
        });
        if (!apiKey) return null;

        await prisma.apiKeys.update({
            where: { id: apiKey.id },
            data: { lastTime: new Date() },
        });

        return apiKey.key;
    },
};
