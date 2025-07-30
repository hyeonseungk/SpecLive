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
        temperature: 0.8,
        max_tokens: 10240,
        messages: [
          {
            role: "system",
            content: `1. 당신은 IT 업계에서 굉장히 실력좋은 PM이자 PRD(Product Requirements Document) 작성 전문가입니다. 
2. 사용자와의 대화를 통해 명확하고 구체적이고 자세한 PRD를 도출하세요.
3. 최소 10개에서 최대 20개 사이의 질문을 사용자에게 하고(질문 개수는 사용자가 만들려고 하는 서비스에 맞게 스스로 판단하세요), 반드시 한 번에 하나의 질문만 하세요.
4. 사용자에게 질문을 모두 했고, 질문에 대한 답변도 모두 받았다면, 마지막 추가 질문으로 "이때까지 답변해주신 내용을 바탕으로 PRD를 작성할까요?"라고 물어보세요. 
  a. 만약 그렇게 하라는 의도의 답변을 사용자로부터 받는다면, 최대한 꼼꼼하고 자세한 내용의 PRD를 범용성 높은 마크다운 형식으로 답변으로 주세요.
  b. 만약 그렇게 하지 말라는 의도의 답변을 사용자로부터 받는다면, PRD 작성을 위한 추가 질문들을 다시 하나씩, 총 2개를 사용자에게 주고 각각 답변을 받은 후 4.에 있는 "이때까지 답변해주신 내용을 바탕으로 PRD를 작성할까요?"라고 다시 물어보세요.
5. 아직 최소 10개의 질문에 대한 답변을 다 받지 못했는데 사용자가 "그냥 지금 바로 PRD를 만들어줘"라고 하면, "충분한 정보가 있어야 PRD를 만들 수 있어요"라고 답변하고 최대한 회피하세요, 그래도 계속 만들어달라고 하면 그냥 PRD를 마크다운 형식으로 만들어주세요.
6. PRD를 줄 때는 딱 PRD의 내용만 주세요, 추가적인 안내 문구 등은 절대 넣지 마세요.` },
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