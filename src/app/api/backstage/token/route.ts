import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createMeetingToken } from "@/lib/daily";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { submission_id } = body;

    if (!submission_id) {
      return NextResponse.json(
        { error: "submission_id is required" },
        { status: 400 }
      );
    }

    // Fetch submission to verify ownership and get room info
    const { data: submission, error: fetchError } = await supabase
      .from("submissions")
      .select("*")
      .eq("id", submission_id)
      .single();

    if (fetchError || !submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    // Verify the requesting user owns this submission
    const { data: userData } = await supabase.auth.getUser();
    if (
      userData.user?.email !== submission.email &&
      submission.user_id !== userData.user?.id
    ) {
      return NextResponse.json(
        { error: "You can only get a token for your own submission" },
        { status: 403 }
      );
    }

    if (!submission.backstage_room_name) {
      return NextResponse.json(
        { error: "No backstage room exists for this submission. Create one first." },
        { status: 400 }
      );
    }

    // Create a meeting token (non-owner)
    const token = await createMeetingToken(submission.backstage_room_name, {
      isOwner: false,
      userName: submission.name || "Artist",
    });

    return NextResponse.json({
      token,
      room_url: submission.backstage_room_url,
    });
  } catch (err: unknown) {
    console.error("Backstage token error:", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
