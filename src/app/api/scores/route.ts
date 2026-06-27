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
      // UI sends 7 camelCase metrics; map to 5 DB columns
      lowEnd,
      clarity,
      balance,
      midRange,
      image,
      highEnd,
      overall,
      // Also accept legacy snake_case names
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
    // Map 7 UI metrics → 5 DB columns
    // lowEnd → metric_low_end, clarity → metric_clarity, balance → metric_balance
    // midRange → metric_dynamics (closest DB column), image → metric_image
    // highEnd/overall → stored in host_score if not already set
    const _lowEnd = lowEnd ?? metric_low_end;
    const _clarity = clarity ?? metric_clarity;
    const _balance = balance ?? metric_balance;
    const _midRange = midRange ?? metric_dynamics;
    const _image = image ?? metric_image;
    if (_lowEnd !== undefined) insertData.metric_low_end = _lowEnd;
    if (_clarity !== undefined) insertData.metric_clarity = _clarity;
    if (_balance !== undefined) insertData.metric_balance = _balance;
    if (_midRange !== undefined) insertData.metric_dynamics = _midRange;
    if (_image !== undefined) insertData.metric_image = _image;
    // Store overall as host_score if host_score not explicitly provided
    if (overall !== undefined && host_score === undefined) {
      insertData.host_score = overall;
    }

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
