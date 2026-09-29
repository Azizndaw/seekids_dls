
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fail gracefully if keys are missing or default placeholders
const isValidConfig = supabaseUrl && supabaseUrl !== "YOUR_SUPABASE_URL" && supabaseAnonKey && supabaseAnonKey !== "YOUR_SUPABASE_ANON_KEY";

if (!isValidConfig) {
    console.error("Supabase credentials missing! Please update .env with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY");
}

export const supabase = isValidConfig
    ? createClient(supabaseUrl, supabaseAnonKey)
    : createClient("https://placeholder.supabase.co", "placeholder"); // Fallback to prevent crash, requests will fail gracefully

