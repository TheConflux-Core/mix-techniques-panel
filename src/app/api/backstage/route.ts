import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createRoom, getRoomUrl } from "@/lib/video";

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
    const { submission_id, episode_id } = body;

    if (!submission_id || !episode_id) {
      return NextResponse.json(
        { error: "submission_id and episode_id are required" },
        { status: 400 }
      );
    }

    // Fetch the submission to verify ownership
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
        { error: "You can only access your own backstage room" },
        { status: 403 }
      );
    }

    // If room already exists, return it
    if (submission.backstage_room_url) {
      return NextResponse.json({
        room_url: submission.backstage_room_url,
        submission_id,
      });
    }

    // Create a Daily.co room
    const roomName = `mt-backstage-${submission_id}`;
    await createRoom(roomName, "private");
    const roomUrl = getRoomUrl(roomName);

    // Update the submission with backstage room info
    const { error: updateError } = await supabase
      .from("submissions")
      .update({
        backstage_room_url: roomUrl,
        backstage_room_name: roomName,
      })
      .eq("id", submission_id);

    if (updateError) {
      console.error("Failed to update submission with room URL:", updateError);
      return NextResponse.json(
        { error: "Failed to save room info" },
        { status: 500 }
      );
    }

    return NextResponse.json({ room_url: roomUrl, submission_id });
  } catch (err: unknown) {
    console.error("Backstage POST error:", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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
    const submissionId = searchParams.get("submission_id");

    if (!submissionId) {
      return NextResponse.json(
        { error: "submission_id is required" },
        { status: 400 }
      );
    }

    const { data: submission, error } = await supabase
      .from("submissions")
      .select("backstage_room_url, backstage_room_name")
      .eq("id", submissionId)
      .single();

    if (error || !submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      room_url: submission.backstage_room_url,
      room_name: submission.backstage_room_name,
    });
  } catch (err: unknown) {
    console.error("Backstage GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
