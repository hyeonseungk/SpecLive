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

    // Get user emails using listUsers
    const userEmails: Record<string, string> = {};

    try {
      // 모든 사용자를 가져온 다음 필터링
      const { data: usersData, error: listError } =
        await supabaseClient.auth.admin.listUsers();

      console.log("List users response:", { usersData, listError });

      if (listError) {
        console.log("Error listing users:", listError);
        // 에러 발생 시 user_id를 fallback으로 사용
        userIds.forEach((userId) => {
          userEmails[userId] = userId;
        });
      } else if (usersData?.users) {
        // 요청된 user_ids에 해당하는 사용자들의 이메일 매핑
        usersData.users.forEach((user) => {
          if (userIds.includes(user.id)) {
            userEmails[user.id] = user.email || user.id;
            console.log("Found email for user:", user.id, "->", user.email);
          }
        });

        // 찾지 못한 사용자들은 user_id를 fallback으로 사용
        userIds.forEach((userId) => {
          if (!userEmails[userId]) {
            userEmails[userId] = userId;
            console.log("No email found for user:", userId);
          }
        });
      }
    } catch (error) {
      console.log("Exception listing users:", error);
      // 예외 발생 시 user_id를 fallback으로 사용
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
