import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/episodes — list episodes, filterable by season/status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get("season_id");
    const status = searchParams.get("status");

    let query = supabase.from("episodes").select("*").order("episode_number", { ascending: false });
    if (seasonId) query = query.eq("season_id", Number(seasonId));
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) {
      console.error("Episodes list error:", error);
      return NextResponse.json({ error: "Failed to fetch episodes" }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Episodes GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/episodes — create a new episode
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { episode_number, title, air_date, season_id, guest_judges } = body;

    if (!episode_number) {
      return NextResponse.json({ error: "episode_number is required" }, { status: 400 });
    }

    // If no season_id provided, get or create current season
    let resolvedSeasonId = season_id;
    if (!resolvedSeasonId) {
      const { data: seasons, error: seasonErr } = await supabase
        .from("seasons")
        .select("id")
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      if (seasonErr) {
        console.error("Season lookup error:", seasonErr);
      }
      resolvedSeasonId = seasons?.id || 1;
    }

    const insertData: Record<string, any> = {
      episode_number,
      season_id: resolvedSeasonId,
      status: "ready",
    };
    if (title) insertData.title = title;
    if (air_date) insertData.air_date = air_date;
    // guest_judges may arrive as a comma-separated string from the UI — normalize to array
    if (guest_judges) {
      if (Array.isArray(guest_judges)) {
        insertData.guest_judges = guest_judges;
      } else if (typeof guest_judges === "string") {
        insertData.guest_judges = guest_judges.split(",").map((s: string) => s.trim()).filter(Boolean);
      }
    }

    const { data, error } = await supabase
      .from("episodes")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Episode create error:", error);
      return NextResponse.json({ error: "Failed to create episode" }, { status: 500 });
    }
    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    console.error("Episodes POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
