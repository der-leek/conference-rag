// supabase/functions/_shared/auth.ts
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "./cors.ts";

export async function requireAuth(req: Request) {
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
        return {
            error: new Response(
                JSON.stringify({ error: "Missing Authorization header" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            )
        };
    }

    // Initialize a Supabase client with the user's auth token
    const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        return {
            error: new Response(
                JSON.stringify({ error: "Unauthorized or invalid token" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            )
        };
    }

    return { user };
}