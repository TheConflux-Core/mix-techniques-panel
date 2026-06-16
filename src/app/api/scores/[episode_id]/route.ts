import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/scores/[episode_id] — all scores for an episode
export async function GET(request: NextRequest, { params }: { params: Promise<{ episode_id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { episode_id } = await params;
    const { data, error } = await supabase
      .from("scores")
      .select("*, submissions(name, track_title, genre)")
      .eq("episode_id", episode_id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Scores fetch error:", error);
      return NextResponse.json({ error: "Failed to fetch scores" }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Scores GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
