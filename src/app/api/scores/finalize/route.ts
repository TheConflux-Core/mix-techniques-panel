import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/scores/finalize
 *
 * Called when the host locks a score during the show.
 * Persists the full score breakdown, computes combined score,
 * and updates the submission status to "scored".
 *
 * Body: {
 *   submission_id: string,
 *   episode_id: string,
 *   host_metrics: { lowEnd, clarity, balance, midRange, image, highEnd, overall },
 *   viewer_metrics: { lowEnd, clarity, balance, midRange, image, highEnd, overall },
 *   viewer_vote_count: number,
 *   judge_scores?: { [judgeName]: { lowEnd, clarity, ... } },
 *   notes?: string,
 *   golden_knob?: boolean
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const {
      submission_id,
      episode_id,
      host_metrics,
      viewer_metrics,
      viewer_vote_count = 0,
      judge_scores = {},
      notes,
      golden_knob = false,
    } = body;

    if (!submission_id || !episode_id) {
      return NextResponse.json(
        { error: "submission_id and episode_id are required" },
        { status: 400 }
      );
    }

    if (!host_metrics) {
      return NextResponse.json(
        { error: "host_metrics is required" },
        { status: 400 }
      );
    }

    // Compute host average from 7 metrics
    const hostValues = [
      host_metrics.lowEnd,
      host_metrics.clarity,
      host_metrics.balance,
      host_metrics.midRange,
      host_metrics.image,
      host_metrics.highEnd,
      host_metrics.overall,
    ].filter((v: number) => v !== undefined && v !== null && v > 0);
    const hostAvg = hostValues.length > 0
      ? +(hostValues.reduce((a: number, b: number) => a + b, 0) / hostValues.length).toFixed(2)
      : 0;

    // Compute viewer average
    const viewerValues = viewer_metrics
      ? [
          viewer_metrics.lowEnd,
          viewer_metrics.clarity,
          viewer_metrics.balance,
          viewer_metrics.midRange,
          viewer_metrics.image,
          viewer_metrics.highEnd,
          viewer_metrics.overall,
        ].filter((v: number) => v !== undefined && v !== null && v > 0)
      : [];
    const viewerAvg = viewerValues.length > 0
      ? +(viewerValues.reduce((a: number, b: number) => a + b, 0) / viewerValues.length).toFixed(2)
      : 0;

    // Compute combined score: host × 0.6 + viewer × 0.4
    const combinedScore = +(hostAvg * 0.6 + viewerAvg * 0.4).toFixed(2);

    // Build insert data for scores table
    const insertData: Record<string, any> = {
      submission_id,
      episode_id,
      host_score: hostAvg,
      metric_low_end: host_metrics.lowEnd ?? null,
      metric_clarity: host_metrics.clarity ?? null,
      metric_balance: host_metrics.balance ?? null,
      metric_mid_range: host_metrics.midRange ?? null,
      metric_image: host_metrics.image ?? null,
      metric_high_end: host_metrics.highEnd ?? null,
      metric_overall: host_metrics.overall ?? null,
      combined_score: combinedScore,
      viewer_avg: viewerAvg,
      viewer_vote_count: viewer_vote_count,
      scoring_formula: "host*0.6 + viewer*0.4",
      judge_scores: judge_scores,
      golden_knob: golden_knob,
    };
    if (notes !== undefined) insertData.notes = notes;

    // Insert score record
    const { data: scoreData, error: scoreError } = await supabase
      .from("scores")
      .insert(insertData)
      .select()
      .single();

    if (scoreError) {
      console.error("[Finalize] Score insert error:", scoreError);
      return NextResponse.json({ error: "Failed to save score", details: scoreError }, { status: 500 });
    }

    // Update submission status → scored + denormalize combined_score
    const { error: subError } = await supabase
      .from("submissions")
      .update({
        status: "scored",
        combined_score: combinedScore,
        updated_at: new Date().toISOString(),
      })
      .eq("id", submission_id);

    if (subError) {
      console.error("[Finalize] Submission update error:", subError);
      // Non-fatal: score was saved, just the denormalize failed
    }

    // Insert per-judge records if provided
    if (judge_scores && Object.keys(judge_scores).length > 0) {
      const judgeInserts = Object.entries(judge_scores).map(([judgeName, metrics]: [string, any]) => ({
        score_id: scoreData.id,
        episode_id,
        submission_id,
        judge_name: judgeName,
        metric_low_end: metrics.lowEnd ?? null,
        metric_clarity: metrics.clarity ?? null,
        metric_balance: metrics.balance ?? null,
        metric_mid_range: metrics.midRange ?? null,
        metric_image: metrics.image ?? null,
        metric_high_end: metrics.highEnd ?? null,
        metric_overall: metrics.overall ?? null,
        avg: metrics.avg ?? null,
      }));

      const { error: judgeError } = await supabase
        .from("judge_scores")
        .insert(judgeInserts);

      if (judgeError) {
        console.error("[Finalize] Judge scores insert error:", judgeError);
        // Non-fatal: main score was saved
      }
    }

    return NextResponse.json({
      success: true,
      score: scoreData,
      combined_score: combinedScore,
      host_avg: hostAvg,
      viewer_avg: viewerAvg,
      viewer_votes: viewer_vote_count,
    }, { status: 201 });
  } catch (err: any) {
    console.error("[Finalize] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
