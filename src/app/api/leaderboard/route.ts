import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/leaderboard — season leaderboard with average scores
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get("season_id");

    // Get scored submissions with their scores
    let query = supabase
      .from("submissions")
      .select("id, name, genre, track_title, season_id, scores(host_score, metric_low_end, metric_clarity, metric_balance, metric_dynamics, metric_image)")
      .eq("status", "scored");

    if (seasonId) query = query.eq("season_id", Number(seasonId));

    const { data, error } = await query;
    if (error) {
      console.error("Leaderboard fetch error:", error);
      return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
    }

    // Calculate averages
    const leaderboard = (data || [])
      .map((sub: any) => {
        const scores = sub.scores || [];
        if (scores.length === 0) return null;

        const hostScores = scores.filter((s: any) => s.host_score != null).map((s: any) => s.host_score);
        const avgHost = hostScores.length > 0
          ? hostScores.reduce((a: number, b: number) => a + b, 0) / hostScores.length
          : null;

        const metrics = ["metric_low_end", "metric_clarity", "metric_balance", "metric_dynamics", "metric_image"];
        const avgMetrics: Record<string, number | null> = {};
        for (const m of metrics) {
          const vals = scores.filter((s: any) => s[m] != null).map((s: any) => s[m]);
          avgMetrics[m] = vals.length > 0 ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : null;
        }

        const allAvg = Object.values(avgMetrics).filter((v): v is number => v !== null);
        const overallAvg = allAvg.length > 0 ? allAvg.reduce((a, b) => a + b, 0) / allAvg.length : avgHost;

        return {
          submission_id: sub.id,
          name: sub.name,
          genre: sub.genre,
          track_title: sub.track_title,
          season_id: sub.season_id,
          avg_host_score: avgHost ? Math.round(avgHost * 10) / 10 : null,
          avg_metrics: avgMetrics,
          overall_avg: overallAvg ? Math.round(overallAvg * 10) / 10 : null,
          score_count: scores.length,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => (b.overall_avg || 0) - (a.overall_avg || 0));

    return NextResponse.json(leaderboard);
  } catch (err: any) {
    console.error("Leaderboard GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
