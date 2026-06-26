import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const filter = searchParams.get("filter") || "all";

    let query = supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    // Search filter
    if (search) {
      query = query.or(`display_name.ilike.%${search}%,location.ilike.%${search}%`);
    }

    // Role filter
    if (filter === "judges") {
      query = query.eq("is_judge", true);
    }

    const { data: profiles, error } = await query;

    if (error) {
      console.error("Profiles fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(profiles || []);
  } catch (err: unknown) {
    console.error("Users GET error:", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
