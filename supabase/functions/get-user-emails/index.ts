import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("get-user-emails function called");

    // Create a Supabase client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    console.log("Supabase URL:", supabaseUrl ? "Set" : "Not set");
    console.log("Service Role Key:", serviceRoleKey ? "Set" : "Not set");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase URL or Service Role Key");
    }

    const supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get the request body
    const body = await req.json();
    console.log("Request body:", body);

    const { userIds } = body;

    if (!userIds || !Array.isArray(userIds)) {
      console.log("Invalid userIds:", userIds);
      return new Response(
        JSON.stringify({ error: "userIds array is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Processing userIds:", userIds);

    // Get user emails using individual user lookups for better reliability
    const userEmails: Record<string, string> = {};

    try {
      // 각 사용자 ID에 대해 개별적으로 조회 (더 안정적)
      for (const userId of userIds) {
        try {
          const { data: userData, error: userError } =
            await supabaseClient.auth.admin.getUserById(userId);

          if (userError) {
            console.log(`Error getting user ${userId}:`, userError);
            userEmails[userId] = userId; // fallback
          } else if (userData?.user) {
            const email = userData.user.email;
            userEmails[userId] = email || userId;
            console.log(`Found email for user ${userId}:`, email);
          } else {
            console.log(`No user data found for ${userId}`);
            userEmails[userId] = userId; // fallback
          }
        } catch (error) {
          console.log(`Exception getting user ${userId}:`, error);
          userEmails[userId] = userId; // fallback
        }
      }
    } catch (error) {
      console.log("Exception in user lookup loop:", error);
      // 전체 실패 시 user_id를 fallback으로 사용
      userIds.forEach((userId) => {
        userEmails[userId] = userId;
      });
    }

    console.log("Final userEmails:", userEmails);

    return new Response(JSON.stringify({ userEmails }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.log("Function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
