import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/episodes/[id]/contestants — submissions assigned to this episode
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { data, error } = await supabase
      .from("submissions")
      .select("*")
      .eq("episode_id", id)
      .eq("status", "pulled")
      .order("pull_order", { ascending: true });

    if (error) {
      console.error("Episode contestants fetch error:", error);
      return NextResponse.json({ error: "Failed to fetch contestants" }, { status: 500 });
    }

    // Generate signed URLs for tracks
    const contestants = await Promise.all(
      (data || []).map(async (sub) => {
        if (sub.track_url) {
          const { data: signed } = await supabase.storage
            .from("submissions")
            .createSignedUrl(sub.track_url, 3600);
          return { ...sub, track_signed_url: signed?.signedUrl || null };
        }
        return sub;
      })
    );

    return NextResponse.json(contestants);
  } catch (err: any) {
    console.error("Episode contestants GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/episodes/[id]/contestants — assign a submission to this episode
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { submission_id, pull_order } = body;

    if (!submission_id) {
      return NextResponse.json({ error: "submission_id is required" }, { status: 400 });
    }

    const updateData: Record<string, any> = {
      episode_id: id,
      status: "pulled",
      updated_at: new Date().toISOString(),
    };
    if (pull_order !== undefined) updateData.pull_order = pull_order;

    const { data, error } = await supabase
      .from("submissions")
      .update(updateData)
      .eq("id", submission_id)
      .select()
      .single();

    if (error) {
      console.error("Assign contestant error:", error);
      return NextResponse.json({ error: "Failed to assign contestant" }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Episode contestants POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
