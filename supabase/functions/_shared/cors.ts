// supabase/functions/_shared/cors.ts

export const corsHeaders = {
    "Access-Control-Allow-Origin": "*", // Replace "*" with "https://yourusername.github.io" for strictness
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};