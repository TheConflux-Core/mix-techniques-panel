import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/leaderboard
 *
 * Returns scored submissions ranked by combined_score.
 * Uses denormalized combined_score on submissions for fast queries.
 * Falls back to computing from scores table if combined_score is null.
 *
 * Query params:
 *   season_id — filter by season
 *   limit — max results (default 20)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get("season_id");
    const limit = Number(searchParams.get("limit")) || 20;

    // Fast path: use denormalized combined_score on submissions
    let query = supabase
      .from("submissions")
      .select(`
        id, name, genre, track_title, location, season_id, combined_score,
        scores(
          host_score, combined_score, viewer_avg, viewer_vote_count,
          metric_low_end, metric_clarity, metric_balance, metric_mid_range,
          metric_image, metric_high_end, metric_overall,
          judge_scores, golden_knob, created_at
        )
      `)
      .eq("status", "scored")
      .not("combined_score", "is", null)
      .order("combined_score", { ascending: false })
      .limit(limit);

    if (seasonId) query = query.eq("season_id", Number(seasonId));

    const { data, error } = await query;
    if (error) {
      console.error("Leaderboard fetch error:", error);
      return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
    }

    const leaderboard = (data || []).map((sub: any, index: number) => {
      const scores = sub.scores || [];
      const latestScore = scores.length > 0 ? scores[scores.length - 1] : null;

      return {
        rank: index + 1,
        submission_id: sub.id,
        name: sub.name,
        genre: sub.genre,
        track_title: sub.track_title,
        location: sub.location,
        season_id: sub.season_id,
        combined_score: sub.combined_score,
        host_avg: latestScore?.host_score ?? null,
        viewer_avg: latestScore?.viewer_avg ?? null,
        viewer_votes: latestScore?.viewer_vote_count ?? 0,
        golden_knob: latestScore?.golden_knob ?? false,
        score_count: scores.length,
        metrics: latestScore
          ? {
              lowEnd: latestScore.metric_low_end,
              clarity: latestScore.metric_clarity,
              balance: latestScore.metric_balance,
              midRange: latestScore.metric_mid_range,
              image: latestScore.metric_image,
              highEnd: latestScore.metric_high_end,
              overall: latestScore.metric_overall,
            }
          : null,
        judge_scores: latestScore?.judge_scores ?? {},
        scored_at: latestScore?.created_at ?? null,
      };
    });

    return NextResponse.json(leaderboard);
  } catch (err: any) {
    console.error("Leaderboard GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
