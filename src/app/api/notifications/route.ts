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

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    const userEmail = userData.user?.email;

    if (!userId && !userEmail) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    // Fetch submissions that have been pulled, selected, or staged for this user
    let query = supabase
      .from("submissions")
      .select("id, name, track_title, status, updated_at, genre, episode_id, episodes(episode_number, title)")
      .in("status", ["pulled", "selected", "staged", "aired"])
      .order("updated_at", { ascending: false });

    // Match by user_id if available, otherwise by email
    if (userId) {
      query = query.eq("user_id", userId);
    } else if (userEmail) {
      query = query.eq("email", userEmail);
    }

    const { data: submissions, error } = await query;

    if (error) {
      console.error("Notifications fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch notifications" },
        { status: 500 }
      );
    }

    // Transform into notification objects
    const notifications = (submissions || []).map((sub) => ({
      id: `notif_${sub.id}_${sub.status}`,
      submission_id: sub.id,
      type: sub.status === "pulled" ? "name_pulled" : sub.status === "aired" ? "segment_complete" : "status_update",
      title:
        sub.status === "pulled"
          ? "🎲 Your name was pulled!"
          : sub.status === "selected"
            ? "⭐ You've been selected!"
            : sub.status === "aired"
              ? "🎬 Your segment is complete!"
              : "📋 Status update",
      message:
        sub.status === "pulled"
          ? `Your track "${sub.track_title || "Untitled"}" is in the queue.`
          : sub.status === "selected"
            ? `Your track "${sub.track_title || "Untitled"}" was selected.`
            : sub.status === "aired"
              ? `Your segment has aired. Great job!`
              : `Your submission status is now: ${sub.status}`,
      track_title: sub.track_title,
      genre: sub.genre,
      status: sub.status,
      episode: sub.episodes,
      timestamp: sub.updated_at,
    }));

    return NextResponse.json({ notifications });
  } catch (err: unknown) {
    console.error("Notifications error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
