import { createClient } from "@supabase/supabase-js";
import { config } from "../config/config";

export const supabaseAdmin = createClient(
    config.supabase.supabaseUrl,
    config.supabase.supabaseSecretRole,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);

export const supabase = createClient(
    config.supabase.supabaseUrl,
    config.supabase.supabaseSecretRole,
)