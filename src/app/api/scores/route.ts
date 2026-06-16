import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/scores — submit a score with per-metric breakdown
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const {
      submission_id,
      episode_id,
      host_score,
      guest_scores,
      notes,
      golden_knob,
      metric_low_end,
      metric_clarity,
      metric_balance,
      metric_dynamics,
      metric_image,
    } = body;

    if (!submission_id || !episode_id) {
      return NextResponse.json(
        { error: "submission_id and episode_id are required" },
        { status: 400 }
      );
    }

    const insertData: Record<string, any> = {
      submission_id,
      episode_id,
    };
    if (host_score !== undefined) insertData.host_score = host_score;
    if (guest_scores !== undefined) insertData.guest_scores = guest_scores;
    if (notes !== undefined) insertData.notes = notes;
    if (golden_knob !== undefined) insertData.golden_knob = golden_knob;
    if (metric_low_end !== undefined) insertData.metric_low_end = metric_low_end;
    if (metric_clarity !== undefined) insertData.metric_clarity = metric_clarity;
    if (metric_balance !== undefined) insertData.metric_balance = metric_balance;
    if (metric_dynamics !== undefined) insertData.metric_dynamics = metric_dynamics;
    if (metric_image !== undefined) insertData.metric_image = metric_image;

    const { data, error } = await supabase
      .from("scores")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Score create error:", error);
      return NextResponse.json({ error: "Failed to submit score" }, { status: 500 });
    }

    // Update submission status to scored
    await supabase
      .from("submissions")
      .update({ status: "scored", updated_at: new Date().toISOString() })
      .eq("id", submission_id);

    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    console.error("Score POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
