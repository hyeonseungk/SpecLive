import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// CORS headers – update once here and reuse below
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request): Promise<Response> => {
  // ──────────────────────────────────────────────────────────────────
  // 1. Handle CORS pre-flight
  // ------------------------------------------------------------------
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only POST is supported
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // 2. Parse request body
  // ------------------------------------------------------------------
  let body: { messages?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const { messages } = body as {
    messages?: Array<{ role: string; content: string }>;
  };
  if (!Array.isArray(messages)) {
    return new Response(
      JSON.stringify({ error: "messages must be an array" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // ──────────────────────────────────────────────────────────────────
  // 3. Call OpenAI (streaming)
  // ------------------------------------------------------------------
  const openaiRes = await fetch(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        stream: true,
        temperature: 0.7,
        max_tokens: 2048,
        messages: [
          {
            role: "system",
            content:
              "당신은 PRD(Product Requirements Document) 작성 전문가입니다. 사용자와의 대화를 통해 명확하고 구체적인 PRD를 도출하세요. 최소 8개에서 최대 12개 사이의 개수의 질문을 하고, 한 번에 딱 한 번의 질문만을 하세요. 질문을 다했으면 마지막에 '이때까지 답변해주신 내용을 바탕으로 PRD를 작성할까요?'라고 물어보세요.",
          },
          ...messages,
        ],
      }),
    },
  );

  if (!openaiRes.ok || !openaiRes.body) {
    return new Response(
      JSON.stringify({ error: "Failed to call OpenAI" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // ──────────────────────────────────────────────────────────────────
  // 4. Transform OpenAI SSE → plain text stream
  // ------------------------------------------------------------------
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
                controller.enqueue(encoder.encode(content));
              }
            } catch {
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

  // ──────────────────────────────────────────────────────────────────
  // 5. Return streaming response
  // ------------------------------------------------------------------
  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}); 