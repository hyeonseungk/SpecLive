import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface InviteEmailRequest {
  email: string;
  projectId: string;
  projectName: string;
  senderId: string; // 초대를 보내는 사용자의 ID
  role?: string; // 'admin' | 'member'
  language?: string; // 'ko-KR' | 'en-US'
}

interface ResendEmailRequest {
  from: string;
  to: string[];
  subject: string;
  html: string;
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
  let body: InviteEmailRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const {
    email,
    projectId,
    projectName,
    senderId,
    role = "member",
    language = "ko-KR",
  } = body;

  // Validate required fields
  if (!email || !projectId || !projectName || !senderId) {
    return new Response(
      JSON.stringify({
        error:
          "Missing required fields: email, projectId, projectName, senderId",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // ──────────────────────────────────────────────────────────────────
  // 3. Initialize Supabase client
  // ------------------------------------------------------------------
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // ──────────────────────────────────────────────────────────────────
  // 4. Validate project exists
  // ------------------------------------------------------------------
  try {
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
  } catch (error) {
    console.error("Error validating project:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to validate project",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // ──────────────────────────────────────────────────────────────────
  // 5. Generate nonce and invitation link
  // ------------------------------------------------------------------
  const nonce = crypto.randomUUID();
  const baseUrl = Deno.env.get("FRONTEND_URL") || "http://localhost:3000";
  const inviteUrl = `${baseUrl}/invite?nonce=${nonce}&projectId=${projectId}`;

  // ──────────────────────────────────────────────────────────────────
  // 6. Generate email content based on language
  // ------------------------------------------------------------------
  const getEmailContent = (lang: string) => {
    if (lang === "en-US") {
      return {
        subject: `You've been invited to join ${projectName} on SpecLive`,
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Project Invitation</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; background: #667eea; color: white !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 You're Invited!</h1>
                <p>Join your team on SpecLive</p>
              </div>
              <div class="content">
                <h2>Hello!</h2>
                <p>You have been invited to join the project <strong>${projectName}</strong> on SpecLive.</p>
                
                <p>SpecLive is a platform that helps teams communicate effectively by managing glossaries and policies in one place. This ensures everyone uses the same terminology and follows consistent guidelines.</p>
                
                <p>By joining this project, you'll be able to:</p>
                <ul>
                  <li>Access and contribute to the project's glossary</li>
                  <li>View and follow project policies</li>
                  <li>Stay updated with real-time notifications</li>
                  <li>Collaborate with your team using unified terminology</li>
                </ul>
                
                <div style="text-align: center;">
                  <a href="${inviteUrl}" class="button">Accept Invitation</a>
                </div>
                
                <p style="margin-top: 30px; font-size: 14px; color: #666;">
                  If you have any questions, please contact your project administrator.
                </p>
              </div>
              <div class="footer">
                <p>This invitation was sent from SpecLive</p>
                <p>If you didn't expect this invitation, you can safely ignore this email.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      };
    } else {
      // 기본값: 한국어
      return {
        subject: `SpecLive에서 ${projectName} 프로젝트 초대가 도착했습니다`,
        html: `
          <!DOCTYPE html>
          <html lang="ko">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>프로젝트 초대</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Malgun Gothic', sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; background: #667eea; color: white !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 초대가 도착했습니다!</h1>
                <p>SpecLive에서 팀과 함께하세요</p>
              </div>
              <div class="content">
                <h2>안녕하세요!</h2>
                <p>SpecLive의 <strong>${projectName}</strong> 프로젝트에 초대되었습니다.</p>
                
                <p>SpecLive는 용어집(Glossary)과 정책(Policy)을 한 곳에서 관리하여 팀원들이 효과적으로 소통할 수 있도록 도와주는 플랫폼입니다. 이를 통해 모든 구성원이 동일한 용어를 사용하고 일관된 가이드라인을 따를 수 있습니다.</p>
                
                <p>이 프로젝트에 참여하면 다음과 같은 기능을 이용할 수 있습니다:</p>
                <ul>
                  <li>프로젝트 용어집 접근 및 기여</li>
                  <li>프로젝트 정책 확인 및 준수</li>
                  <li>실시간 알림으로 최신 정보 유지</li>
                  <li>통일된 용어로 팀과 협업</li>
                </ul>
                
                <div style="text-align: center;">
                  <a href="${inviteUrl}" class="button">초대 수락하기</a>
                </div>
                
                <p style="margin-top: 30px; font-size: 14px; color: #666;">
                  궁금한 점이 있으시면 프로젝트 관리자에게 문의해 주세요.
                </p>
              </div>
              <div class="footer">
                <p>이 초대는 SpecLive에서 발송되었습니다</p>
                <p>예상하지 못한 초대라면 이 이메일을 무시하셔도 됩니다.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      };
    }
  };

  const emailContent = getEmailContent(language);

  // ──────────────────────────────────────────────────────────────────
  // 6. Send email via Resend
  // ------------------------------------------------------------------
  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }

    const emailRequest: ResendEmailRequest = {
      from: "admin@spec-live.com",
      to: [email],
      subject: emailContent.subject,
      html: emailContent.html,
    };

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailRequest),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error("Resend API Error:", errorText);
      return new Response(
        JSON.stringify({
          error: "Failed to send email via Resend",
          details: errorText,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const resendData = await resendResponse.json();

    // ──────────────────────────────────────────────────────────────────
    // 7. Log invitation email to database
    // ------------------------------------------------------------------
    try {
      await supabase.from("invitation_emails").insert({
        sender_id: senderId, // Now we have the sender's user ID
        receiver_id: null, // Will be set when the receiver signs up
        project_id: projectId,
        nonce: nonce,
        role: role, // Store the intended role
      });
    } catch (logError) {
      // Log error but don't fail the request
      console.error("Failed to log invitation email:", logError);
    }

    // ──────────────────────────────────────────────────────────────────
    // 8. Return successful response
    // ------------------------------------------------------------------
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          message: "Invitation email sent successfully",
          email,
          projectName,
          resendId: resendData.id,
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
