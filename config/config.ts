// load environment variables from .env file
import { z } from "zod";

//defining a schema for the config
const configSchema = z.object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().default(3000),
    FRONTEND_URL: z.string().url("[❌]:: Invalid frontend url!!"),

    //Database
    DATABASE_URL: z.string().url("[❌]:: Invalid Database URL!!"),

    //Auth
    JWT_SECRET: z.string().min(32, "[⚪]:: JWT_SECRET must be atleast 32 character!"),
    JWT_EXPIRATION: z.string().default("7d"),

    //Radis for session, rate limit
    UPSTASH_REDIS_REST_URL: z.string().url("[❌]:: Invalid upstash url!!").optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

    //Vector upstash for RAG
    UPSTASH_VECTOR_REST_URL: z.string().url().optional(),
    UPSTASH_VECTOR_REST_TOKEN: z.string().optional(),

    //Trigger dev
    TRIGGER_SECRET_DEV: z.string().optional(),
    
    //Supabase for assets, storage, and upload
    SUPABASE_URL: z.string().url().optional(),
    SUPABASE_SERVICE_ROLE: z.string().min(1, "Service role key required!!"),
    SUPABASE_ANON_KEY: z.string().min(1, "Anon key is required!"),
    SUPABASE_PUBLISHABLE_KEY: z.string().optional(),

    OPENAI_API_KEY: z.string().startsWith("sk-", "Invalid Api Key!!").optional(),
    OPENAI_MODEL: z.string().default("gpt-4o"),
    OPENAI_MAX_TOKENS: z.coerce.number().default(4096),

    CLAUDE_API_KEY: z.string().optional(),
    CLAUDE_MODEL: z.string().default("claude-sonnet-4-20250514"),

    OPENROUTER_API_KEY: z.string().min(1).optional(),
    OPENROUTER_MODEL: z.string().default("meta-llama/llama-3.3-70b-instruct:free"),
})

const parsed = configSchema.safeParse(process.env)

if (!parsed.success) {
    console.error("[❌]:: Invalid Environment Variables.")
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1)
}

const env = parsed.data;

export const config = {
    node_env: env.NODE_ENV,
    isDev: env.NODE_ENV == "development",
    isProd: env.NODE_ENV == "production",
    isTest: env.NODE_ENV == "test",

    server: {
        port: env.PORT || 8000,
        frontendUrl: env.FRONTEND_URL
    },

    db: {
        databaseUrl: env.DATABASE_URL,
    },

    auth: {
        jwtSecret: env.JWT_SECRET,
        jwtExpiration: env.JWT_EXPIRATION || "1h",
    },

    redis: {
        upstashRedisRestUrl: env.UPSTASH_REDIS_REST_URL,
        upstashRedisRestToken: env.UPSTASH_REDIS_REST_TOKEN,
    },

    vector: {
        upstashVectorRestUrl: env.UPSTASH_VECTOR_REST_URL,
        upstashVectorRestToken: env.UPSTASH_VECTOR_REST_TOKEN,
    },

    trigger: {
        triggerSecretDev: env.TRIGGER_SECRET_DEV,
    },

    supabase: {
        supabaseUrl: env.SUPABASE_URL!,
        supabaseAnonKey: env.SUPABASE_ANON_KEY,
        supabaseSecretRole: env.SUPABASE_SERVICE_ROLE!,
        publishableKey: env.SUPABASE_PUBLISHABLE_KEY
    },

    ai: {
        model: env.OPENAI_MODEL,
        apiKey: env.OPENAI_API_KEY,
        maxToken: env.OPENAI_MAX_TOKENS,
        claudeApiKey: env.CLAUDE_API_KEY,
        claudeModel: env.CLAUDE_MODEL,
        openRouterApiKey: env.OPENROUTER_API_KEY,
        openRouterModel: env.OPENROUTER_MODEL,
    }

} as const;

export type Config = typeof config;
