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
    const genre = searchParams.get("genre");
    const status = searchParams.get("status");

    let query = supabase
      .from("submissions")
      .select("*")
      .order("created_at", { ascending: false });

    if (genre && genre !== "all") {
      query = query.eq("genre", genre);
    }
    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch submissions" },
        { status: 500 }
      );
    }

    // Generate signed URLs for track playback (1 hour expiry)
    const submissions = await Promise.all(
      (data || []).map(async (sub) => {
        if (sub.track_url) {
          const { data: signed } = await supabase.storage
            .from("submissions")
            .createSignedUrl(sub.track_url, 3600);
          return { ...sub, track_signed_url: signed?.signedUrl || null };
        }
        return { ...sub, track_signed_url: null };
      })
    );

    return NextResponse.json(submissions);
  } catch (err: any) {
    console.error("List error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
