import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/scores/finalize
 *
 * NOTE: Score persistence is now handled by server.js (lock-score WS handler).
 * This endpoint is retained for backwards compatibility but no longer performs
 * database writes. The panel sends lock-score via WS with submission_id + episode_id,
 * and server.js writes to Supabase directly (it has per-judge data from state.judges).
 *
 * This endpoint now returns a simple success response.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    if (!body.submission_id || !body.episode_id) {
      return NextResponse.json(
        { error: "submission_id and episode_id are required" },
        { status: 400 }
      );
    }

    // Score persistence is handled by server.js lock-score handler.
    // Return success so the panel doesn't error.
    return NextResponse.json({
      success: true,
      note: "Score persistence handled by WS server",
    }, { status: 200 });
  } catch (err: any) {
    console.error("[Finalize] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
