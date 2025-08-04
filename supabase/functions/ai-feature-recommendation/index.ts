import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface FeatureRecommendation {
  name: string;
  description: string;
}

interface RequestBody {
  projectId: string;
  count?: number; // number of features to recommend (default: 5)
  language?: string; // language code (default: 'ko-KR')
  selectedUsecaseId: string; // id of selected usecase to tailor recommendations (required)
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

  const { projectId, count = 5, language = "ko-KR", selectedUsecaseId } = body;
  if (!projectId) {
    return new Response(JSON.stringify({ error: "projectId is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!selectedUsecaseId) {
    return new Response(
      JSON.stringify({ error: "selectedUsecaseId is required" }),
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

    // Fetch selected usecase if provided
    let selectedUsecaseName = "";
    let selectedUsecaseText = "";
    if (selectedUsecaseId) {
      const { data: selectedUsecase, error: selectedUsecaseError } =
        await supabase
          .from("usecases")
          .select("name")
          .eq("id", selectedUsecaseId)
          .single();
      if (selectedUsecaseError || !selectedUsecase) {
        return new Response(
          JSON.stringify({
            error: "Selected usecase not found",
            details: selectedUsecaseError?.message,
          }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      selectedUsecaseName = selectedUsecase.name;
      selectedUsecaseText =
        language === "en-US"
          ? `\n\nSelected Use Case:\n- ${selectedUsecaseName}`
          : `\n\n선택된 유즈케이스:\n- ${selectedUsecaseName}`;
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
        return `You are an expert in IT project feature management and software development.\n\nBased on the provided project information and the selected use case "${selectedUsecaseName}", recommend ${count} useful features in English that are specifically tailored to or enhance this use case. All feature names and descriptions should be in English.\n\nProject Name: ${projectName}${prdText}${glossaryText}${actorText}${usecaseText}${featureText}${selectedUsecaseText}${policyText}\n\nRecommendation Criteria:\n1. Features that directly support or enhance the selected use case\n2. Features that improve user experience for the use case\n3. Features that address potential pain points or gaps in the use case\n4. Do not duplicate existing features\n5. Consider technical feasibility and business value\n6. Prioritize features highly relevant to PRD content\n7. Ensure each recommended feature clearly ties back to the selected use case: ${selectedUsecaseName}\n8. Features should be specific, actionable, and implementable\n\nProvide each feature as an object with:\n- name: A clear, concise feature name\n- description: A detailed description of what the feature does and how it benefits the use case`;
      } else {
        return `당신은 IT 프로젝트 기능(Feature) 관리 및 소프트웨어 개발 전문가입니다.\n\n제공된 프로젝트 정보와 선택된 유즈케이스 "${selectedUsecaseName}"에 적합하고 이를 구체적으로 지원하거나 향상시키는 ${count}개의 유용한 기능을 한국어로 추천해주세요. 모든 기능명과 설명은 한국어로 작성되어야 합니다.\n\n프로젝트명: ${projectName}${prdText}${glossaryText}${actorText}${usecaseText}${featureText}${selectedUsecaseText}${policyText}\n\n추천 기준:\n1. 선택된 유즈케이스를 직접 지원하거나 향상시키는 기능\n2. 유즈케이스의 사용자 경험을 개선하는 기능\n3. 유즈케이스의 잠재적 문제점이나 간극을 해결하는 기능\n4. 기존 기능과 중복되지 않는 내용\n5. 기술적 실현 가능성과 비즈니스 가치 고려\n6. PRD 내용과 가장 관련성이 높은 기능 우선\n7. 각 기능이 선택된 유즈케이스 "${selectedUsecaseName}"와 분명히 연결되어 있도록 해주세요\n8. 기능은 구체적이고 실행 가능하며 구현 가능해야 합니다\n\n각 항목은 다음 형태로 제공해주세요:\n- name: 명확하고 간결한 기능명\n- description: 기능이 무엇을 하는지, 유즈케이스에 어떤 이점을 제공하는지에 대한 상세한 설명`;
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
                  ? "Please recommend features suitable for the above project and selected use case in English."
                  : "위 프로젝트와 선택된 유즈케이스에 적합한 기능을 한국어로 추천해주세요.",
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "feature_recommendations",
              schema: {
                type: "object",
                properties: {
                  recommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "기능명" },
                        description: {
                          type: "string",
                          description: "기능 설명",
                        },
                      },
                      required: ["name", "description"],
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

    let recommendations: FeatureRecommendation[] = [];
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
