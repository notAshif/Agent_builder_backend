import { createHash, randomBytes } from "crypto";

export const hashApiKey = (key: string): string => {
    return createHash("sha256").update(key).digest("hex");
};

export const generateApiKey = (prefix = "ak"): string => {
    const random = randomBytes(32).toString("hex");
    return `${prefix}_${random}`;
};

export const generateToken = (bytes = 32): string => {
    return randomBytes(bytes).toString("hex");
};
