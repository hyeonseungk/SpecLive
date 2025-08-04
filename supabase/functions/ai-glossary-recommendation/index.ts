import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface GlossaryRecommendation {
  name: string;
  definition: string;
}

interface RequestBody {
  projectId: string;
  count?: number; // 추천받을 용어 개수 (기본값: 5)
  language?: string; // 언어 코드 (기본값: 'ko-KR')
}

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
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { projectId, count = 5, language = "ko-KR" } = body;

  if (!projectId) {
    return new Response(JSON.stringify({ error: "projectId is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // 3. Initialize Supabase client
  // ------------------------------------------------------------------
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // ──────────────────────────────────────────────────────────────────
  // 4. Fetch project data and existing glossaries
  // ------------------------------------------------------------------
  try {
    // 프로젝트 정보 조회
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, name")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return new Response(
        JSON.stringify({
          error: "Project not found",
          details: projectError?.message,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // PRD 정보 조회 (별도 테이블)
    const { data: prd, error: prdError } = await supabase
      .from("prds")
      .select("contents")
      .eq("project_id", projectId)
      .single();

    // PRD가 없는 경우는 에러가 아님 (옵션)
    const prdContents = prd?.contents || "";

    // 기존 용어들 조회
    const { data: existingGlossaries, error: glossariesError } = await supabase
      .from("glossaries")
      .select("name, definition, examples")
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false });

    if (glossariesError) {
      console.error("Error fetching glossaries:", glossariesError);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch existing glossaries",
          details: glossariesError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const projectName = project.name || "프로젝트";
    const existingTerms = existingGlossaries || [];

    // ──────────────────────────────────────────────────────────────────
    // 5. Prepare system prompt
    // ------------------------------------------------------------------
    const existingTermsText =
      existingTerms.length > 0
        ? `\n\n현재 프로젝트에 등록된 용어들:\n${existingTerms
            .map(
              (g: any) =>
                `- ${g.name}: ${g.definition}${
                  g.examples ? ` (예시: ${g.examples})` : ""
                }`
            )
            .join("\n")}`
        : "";

    const prdText = prdContents
      ? `\n\nPRD (Product Requirements Document):\n${prdContents}`
      : "";

    // 언어별 시스템 프롬프트
    const getLanguagePrompt = (lang: string) => {
      if (lang === "en-US") {
        return `You are an expert in IT project glossary management with deep knowledge of Domain-Driven Design (DDD).

Please recommend ${count} useful terms in ENGLISH based on the given project information. All term names and definitions should be primarily in English.

Project Name: ${projectName}${prdText}${existingTermsText}

Recommendation Criteria:
1. Focus ONLY on Domain-Driven Design concepts: Entities and Value Objects that represent core business concepts
2. Terms that may cause confusion in team communication
3. Important domain concepts that new team members should know
4. Terms that do not duplicate existing registered terms
5. Prioritize terms highly relevant to PRD content
6. AVOID specific technical implementation details, frameworks, or technologies

Domain-Driven Design Focus:
- Entities: Business objects with identity that can change over time
- Value Objects: Immutable objects defined by their attributes
- Domain concepts that represent real business rules and processes

Each term should have:
- name: Term name (primarily in English, but can include commonly used Korean terms in parentheses if necessary)
- definition: Clear and easy-to-understand definition in English (1-2 sentences) focusing on business meaning, not technical implementation

Please recommend practical domain terms in English that represent core business concepts, avoiding any specific technical implementation details.`;
      } else {
        // 기본값: 한국어
        return `당신은 Domain-Driven Design(DDD)에 깊은 지식을 가진 IT 프로젝트 용어집(Glossary) 관리 전문가입니다.

주어진 프로젝트 정보를 바탕으로 ${count}개의 유용한 용어를 한국어로 추천해주세요. 모든 용어명과 정의는 주로 한국어로 작성되어야 합니다.

프로젝트명: ${projectName}${prdText}${existingTermsText}

추천 기준:
1. Domain-Driven Design 개념에만 집중: 핵심 비즈니스 개념을 나타내는 Entity와 Value Object
2. 팀원들 간 소통에서 혼동이 생길 수 있는 용어
3. 신입 팀원이 알아야 할 중요한 도메인 개념들
4. 기존에 등록된 용어와 중복되지 않는 용어
5. PRD 내용과 관련성이 높은 용어들을 우선적으로 고려
6. 구체적인 기술 구현 세부사항, 프레임워크, 기술은 절대 제시하지 말 것

Domain-Driven Design 집중 영역:
- Entity: 시간이 지나면서 변경될 수 있는 식별자를 가진 비즈니스 객체
- Value Object: 속성에 의해 정의되는 불변 객체
- 실제 비즈니스 규칙과 프로세스를 나타내는 도메인 개념

각 용어는:
- name: 용어명 (주로 한국어, 필요시 영어 병기 가능)
- definition: 명확하고 이해하기 쉬운 한국어 정의 (1-2문장) - 비즈니스 의미에 집중하고 기술적 구현은 제외

핵심 비즈니스 개념을 나타내는 실용적인 도메인 용어들을 한국어로 추천해주세요. 구체적인 기술 구현 세부사항은 절대 포함하지 마세요.`;
      }
    };

    const systemPrompt = getLanguagePrompt(language);

    // ──────────────────────────────────────────────────────────────────
    // 6. Call OpenAI with Structured Outputs
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
          temperature: 0.7,
          max_tokens: 6000,
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content:
                language === "en-US"
                  ? "Please recommend terms suitable for the above project in English."
                  : "위 프로젝트에 적합한 용어들을 한국어로 추천해주세요.",
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "glossary_recommendations",
              schema: {
                type: "object",
                properties: {
                  recommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: {
                          type: "string",
                          description: "용어명",
                        },
                        definition: {
                          type: "string",
                          description: "용어 정의",
                        },
                      },
                      required: ["name", "definition"],
                      additionalProperties: false,
                    },
                    minItems: 1,
                    maxItems: 10,
                  },
                },
                required: ["recommendations"],
                additionalProperties: false,
              },
            },
          },
        }),
      }
    );

    if (!openaiRes.ok) {
      const errorText = await openaiRes.text();
      console.error("OpenAI API Error:", errorText);
      return new Response(
        JSON.stringify({
          error: "OpenAI API request failed",
          details: errorText,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const openaiData = await openaiRes.json();

    // ──────────────────────────────────────────────────────────────────
    // 7. Extract and validate response
    // ------------------------------------------------------------------
    const content = openaiData.choices?.[0]?.message?.content;
    if (!content) {
      return new Response(
        JSON.stringify({ error: "No content received from OpenAI" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let recommendations: GlossaryRecommendation[];
    try {
      const parsedContent = JSON.parse(content);
      recommendations = parsedContent.recommendations || [];
    } catch (parseError) {
      console.error("JSON parsing error:", parseError);
      return new Response(
        JSON.stringify({
          error: "Failed to parse AI response",
          details:
            parseError instanceof Error
              ? parseError.message
              : String(parseError),
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ──────────────────────────────────────────────────────────────────
    // 8. Return successful response
    // ------------------------------------------------------------------
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          recommendations,
          count: recommendations.length,
          projectName,
          existingTermsCount: existingTerms.length,
          language,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
