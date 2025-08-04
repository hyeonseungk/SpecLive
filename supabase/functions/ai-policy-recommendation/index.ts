import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface PolicyRecommendation {
  contents: string;
}

interface RequestBody {
  projectId: string;
  count?: number; // number of policies to recommend (default: 5)
  language?: string; // language code (default: 'ko-KR')
  selectedFeatureId: string; // id of selected feature to tailor recommendations (required)
}

Deno.serve(async (req: Request): Promise<Response> => {
  // 1. Handle CORS pre-flight
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

  // 2. Parse request body
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { projectId, count = 5, language = "ko-KR", selectedFeatureId } = body;
  if (!projectId) {
    return new Response(JSON.stringify({ error: "projectId is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!selectedFeatureId) {
    return new Response(
      JSON.stringify({ error: "selectedFeatureId is required" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // 3. Initialize Supabase client
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Project info
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
    const projectName = project.name || "프로젝트";

    // PRD
    const { data: prd } = await supabase
      .from("prds")
      .select("contents")
      .eq("project_id", projectId)
      .single();
    const prdContents = prd?.contents || "";

    // Existing glossaries
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
    const glossaries = existingGlossaries || [];

    // Existing actors
    const { data: existingActors, error: actorsError } = await supabase
      .from("actors")
      .select("id, name")
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false });
    if (actorsError) {
      console.error("Error fetching actors:", actorsError);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch existing actors",
          details: actorsError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    const actors = existingActors || [];

    // Existing usecases (by actor)
    const actorIds = actors.map((a) => a.id);
    let usecases: Array<{ id: string; name: string }> = [];
    if (actorIds.length > 0) {
      const { data: existingUsecases, error: usecasesError } = await supabase
        .from("usecases")
        .select("id, name")
        .in("actor_id", actorIds)
        .order("updated_at", { ascending: false });
      if (usecasesError) {
        console.error("Error fetching usecases:", usecasesError);
        return new Response(
          JSON.stringify({
            error: "Failed to fetch existing usecases",
            details: usecasesError.message,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      usecases = existingUsecases || [];
    }

    // Existing features (by usecase)
    const usecaseIds = usecases.map((u) => u.id);
    let features: Array<{ name: string }> = [];
    if (usecaseIds.length > 0) {
      const { data: existingFeatures, error: featuresError } = await supabase
        .from("features")
        .select("name")
        .in("usecase_id", usecaseIds)
        .order("updated_at", { ascending: false });
      if (featuresError) {
        console.error("Error fetching features:", featuresError);
        return new Response(
          JSON.stringify({
            error: "Failed to fetch existing features",
            details: featuresError.message,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      features = existingFeatures || [];
    }

    // Existing policies
    const { data: existingPolicies, error: policiesError } = await supabase
      .from("policies")
      .select("contents")
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false });
    if (policiesError) {
      console.error("Error fetching policies:", policiesError);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch existing policies",
          details: policiesError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    const policies = existingPolicies || [];
    // NEW: Fetch selected feature if provided
    let selectedFeatureName = "";
    let selectedFeatureText = "";
    if (selectedFeatureId) {
      const { data: selectedFeature, error: selectedFeatureError } =
        await supabase
          .from("features")
          .select("name")
          .eq("id", selectedFeatureId)
          .single();
      if (selectedFeatureError || !selectedFeature) {
        return new Response(
          JSON.stringify({
            error: "Selected feature not found",
            details: selectedFeatureError?.message,
          }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      selectedFeatureName = selectedFeature.name;
      selectedFeatureText =
        language === "en-US"
          ? `\n\nSelected Feature:\n- ${selectedFeatureName}`
          : `\n\n선택된 기능(Feature):\n- ${selectedFeatureName}`;
    }

    // Prepare context texts
    const prdText = prdContents
      ? `\n\nPRD (Product Requirements Document):\n${prdContents}`
      : "";
    const glossaryText = glossaries.length
      ? `\n\n현재 프로젝트에 등록된 용어들:\n${glossaries
          .map(
            (g) =>
              `- ${g.name}: ${g.definition}${
                g.examples ? ` (예시: ${g.examples})` : ""
              }`
          )
          .join("\n")}`
      : "";
    const actorText = actors.length
      ? `\n\n현재 프로젝트에 등록된 액터들:\n${actors
          .map((a) => `- ${a.name}`)
          .join("\n")}`
      : "";
    const usecaseText = usecases.length
      ? `\n\n현재 프로젝트에 등록된 유즈케이스들:\n${usecases
          .map((u) => `- ${u.name}`)
          .join("\n")}`
      : "";
    const featureText = features.length
      ? `\n\n현재 프로젝트에 등록된 기능(Feature)들:\n${features
          .map((f) => `- ${f.name}`)
          .join("\n")}`
      : "";
    const policyText = policies.length
      ? `\n\n현재 프로젝트에 등록된 정책들:\n${policies
          .map((p) => `- ${p.contents}`)
          .join("\n")}`
      : "";

    // Language-specific system prompt
    const getLanguagePrompt = (lang: string) => {
      if (lang === "en-US") {
        return `You are an expert in IT project policy management.\n\nBased on the provided project information and the selected feature "${selectedFeatureName}", recommend ${count} useful policies in English that are specifically tailored to or address this feature. All policy contents should be in English.\n\nProject Name: ${projectName}${prdText}${glossaryText}${actorText}${usecaseText}${featureText}${selectedFeatureText}${policyText}\n\nRecommendation Criteria:\n1. Core guidelines that align with project requirements\n2. Policies that prevent common miscommunications or risks\n3. Important rules for onboarding new team members\n4. Do not duplicate existing policies\n5. Cover business logic, technical standards, and user interactions\n6. Prioritize policies highly relevant to PRD content\n7. Ensure each recommended policy clearly ties back to the selected feature: ${selectedFeatureName}\n8. Focus on Domain Driven Design (DDD) Policy concept - business rules and constraints that developers can quickly implement in code\n9. Exclude vague or ambiguous policies - only recommend concrete, actionable business rules\n10. ABSOLUTELY DO NOT recommend specific technical implementation details, frameworks, or coding patterns\n\nProvide each policy as an object with:\n- contents: A clear, concise policy statement. `;
      } else {
        return `당신은 IT 프로젝트 정책(Policy) 관리 전문가입니다.\n\n제공된 프로젝트 정보와 선택된 기능 "${selectedFeatureName}"에 적합하고 이를 구체적으로 반영한 ${count}개의 유용한 정책을 한국어로 추천해주세요. 모든 정책 문장은 한국어로 작성되어야 합니다.\n\n프로젝트명: ${projectName}${prdText}${glossaryText}${actorText}${usecaseText}${featureText}${selectedFeatureText}${policyText}\n\n추천 기준:\n1. 프로젝트 요구사항에 부합하는 핵심 지침\n2. 일반적인 오해나 리스크를 방지할 수 있는 정책\n3. 신입 팀원 온보딩 시 필요한 중요한 규칙\n4. 기존 정책과 중복되지 않는 내용\n5. 비즈니스 로직, 기술 표준, 사용자 상호작용을 모두 포함\n6. PRD 내용과 가장 관련성이 높은 정책 우선\n7. 각 정책이 선택된 기능 "${selectedFeatureName}"와 분명히 연결되어 있도록 해주세요.\n8. Domain Driven Design (DDD)의 Policy 개념에 집중 - 개발자들이 코드에서 빠르게 구현할 수 있는 비즈니스 규칙과 제약사항\n9. 모호하거나 애매한 정책은 모두 제외하고, 구체적이고 실행 가능한 비즈니스 규칙만 추천\n10. 절대로 구체적인 기술 구현 세부사항, 프레임워크, 코딩 패턴을 추천하지 마세요\n\n각 항목은 다음 형태로 제공해주세요:\n- contents: 명확하고 간결한 정책 문장입니다.`;
      }
    };
    const systemPrompt = getLanguagePrompt(language);

    // Call OpenAI with structured JSON output
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
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content:
                language === "en-US"
                  ? "Please recommend policies suitable for the above project in English."
                  : "위 프로젝트에 적합한 정책을 한국어로 추천해주세요.",
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "policy_recommendations",
              schema: {
                type: "object",
                properties: {
                  recommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        contents: { type: "string", description: "정책 문장" },
                      },
                      required: ["contents"],
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

    let recommendations: PolicyRecommendation[] = [];
    try {
      const parsed = JSON.parse(content);
      recommendations = parsed.recommendations || [];
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

    //  Return successful response
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          recommendations,
          count: recommendations.length,
          projectName,
          existingGlossariesCount: glossaries.length,
          existingActorsCount: actors.length,
          existingUsecasesCount: usecases.length,
          existingFeaturesCount: features.length,
          existingPoliciesCount: policies.length,
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
