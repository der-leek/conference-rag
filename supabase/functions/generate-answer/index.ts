import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { requireAuth } from "../_shared/auth.ts";

Deno.serve(async (req) => {
    // 1. Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    // 2. Verify authenticated user
    const authResult = await requireAuth(req);
    if ("error" in authResult) return authResult.error;

    try {
        const { question, context_talks } = await req.json();

        // Validation
        if (!question || typeof question !== "string") {
            return new Response(
                JSON.stringify({ error: "Missing or invalid 'question' field" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (!context_talks || !Array.isArray(context_talks)) {
            return new Response(
                JSON.stringify({ error: "Missing or invalid 'context_talks' field" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const geminiKey = Deno.env.get("GEMINI_API_KEY");
        if (!geminiKey) {
            return new Response(
                JSON.stringify({ error: "GEMINI_API_KEY not configured" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // 3. Build context from the talk data
        const contextText = context_talks
            .map(
                (talk: { title: string; speaker: string; text: string }) =>
                    `Title: "${talk.title}"\nSpeaker: ${talk.speaker}\nContent: ${talk.text}`
            )
            .join("\n\n---\n\n");

        // 4. Call Gemini API
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiKey}`;

        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contents: [
                    {
                        role: "user",
                        parts: [
                            {
                                text: `You are a helpful assistant that answers questions about General Conference talks. 
                Use ONLY the provided talk excerpts to answer. If the answer isn't found in the excerpts, say so. 
                Always cite which talk(s) and speaker(s) you're drawing from.

                Context Excerpts:
                ${contextText}

                Question: ${question}`
                            }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 1024,
                },
            }),
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            return new Response(
                JSON.stringify({ error: err.error?.message || "Gemini API error" }),
                { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const data = await response.json();

        // Extract the text from Gemini's response structure
        const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";

        return new Response(
            JSON.stringify({ answer }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (err) {
        return new Response(
            JSON.stringify({ error: err.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});