import "jsr:@supabase/functions-js/edge-runtime.d.ts";

export async function POST(req: Request) {
  // --- CORS --------------------------------------------------------------
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };

  // Pre-flight ────────────────────────────────────────────────────────────
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // --- Parse body --------------------------------------------------------
  let body: { messages?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { messages } = body as { messages?: Array<{ role: string; content: string }> };
  if (!Array.isArray(messages)) {
    return new Response(
      JSON.stringify({ error: "messages must be an array" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // --- Call OpenAI with streaming ---------------------------------------
  const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini", // lightweight but good-enough
      stream: true,
      temperature: 0.7,
      max_tokens: 2048,
      messages: [
        {
          role: "system",
          content:
            "당신은 프로젝트 PRD 작성 전문가입니다. 사용자와의 대화를 통해 명확하고 구체적인 PRD를 도출하세요.",
        },
        ...messages,
      ],
    }),
  });

  if (!openaiRes.ok || !openaiRes.body) {
    return new Response(
      JSON.stringify({ error: "Failed to call OpenAI" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // --- Stream transform --------------------------------------------------
  const stream = new ReadableStream({
    async start(controller) {
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
      const reader = openaiRes.body!.getReader();
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const json = line.replace(/^data: /, "");
            if (json === "[DONE]") {
              controller.close();
              return;
            }
            try {
              const payload = JSON.parse(json);
              const content = payload.choices?.[0]?.delta?.content;
              if (content) {
                controller.enqueue(encoder.encode(content)); // ⚡ chunk push
              }
            } catch (_) {
              /* ignore malformed line */
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        reader.releaseLock();
        controller.close();
      }
    },
  });

  // --- Return streaming response ----------------------------------------
  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
} 