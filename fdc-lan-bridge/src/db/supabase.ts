import { createClient } from "@supabase/supabase-js";
import { config } from "../config";

if (!config.supabase.url || !config.supabase.serviceRoleKey) {
    console.warn("Missing Supabase credentials in environment. Supabase client will not work correctly.");
}

export const supabase = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);
