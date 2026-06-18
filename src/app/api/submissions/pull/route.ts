import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    const episodeId = searchParams.get("episode_id");

    let query = supabase
      .from("submissions")
      .select("*")
      .eq("status", "submitted");

    if (episodeId) {
      query = query.eq("episode_id", episodeId);
    }

    const { data: pool, error: fetchError } = await query;

    if (fetchError) {
      console.error("Pull fetch error:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch submission pool" },
        { status: 500 }
      );
    }

    if (!pool || pool.length === 0) {
      return NextResponse.json(
        { error: "No submissions in the pool" },
        { status: 404 }
      );
    }

    const randomIndex = Math.floor(Math.random() * pool.length);
    const selected = pool[randomIndex];

    let submission = selected;
    if (selected.track_url) {
      const { data: signed } = await supabase.storage
        .from("submissions")
        .createSignedUrl(selected.track_url, 3600);
      submission = { ...selected, track_signed_url: signed?.signedUrl || null };
    }

    return NextResponse.json({
      submission,
      pool_size: pool.length,
    });
  } catch (err: any) {
    console.error("Pull error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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

    const { data, error } = await supabase
      .from("submissions")
      .update({ status: "pulled", updated_at: new Date().toISOString() })
      .eq("id", submission_id)
      .select()
      .single();

    if (error) {
      console.error("Pull confirm error:", error);
      return NextResponse.json(
        { error: "Failed to confirm pull" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Pull confirm error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
