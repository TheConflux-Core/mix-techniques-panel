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

    // Fire Discord webhook (non-blocking)
    const webhookUrl = process.env.DISCORD_PULL_WEBHOOK_URL;
    if (webhookUrl && data) {
      fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [{
            title: "🎲 Name Pulled!",
            description: `**${data.name}** from ${data.location || "Unknown"} has been pulled for Episode!`,
            color: 0xd4a843, // Studio Gold
            fields: [
              { name: "Genre", value: data.genre || "N/A", inline: true },
              { name: "Track", value: data.track_title || "N/A", inline: true },
            ],
            footer: { text: "Mix Techniques — Show Us Your Mix" },
            timestamp: new Date().toISOString(),
          }],
        }),
      }).catch(() => {}); // Don't block on webhook failure
    }

    // Notify Discord bot — add role + DM contestant (non-blocking)
    const botUrl = process.env.DISCORD_BOT_URL;
    if (botUrl && data) {
      fetch(`${botUrl}/api/name-pulled`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          discord_handle: data.discord_handle,
          track_title: data.track_title,
          submission_id: data.id,
          episode_id: data.episode_id,
        }),
      }).catch(() => {}); // Don't block on bot failure
    }

    // Send WS notification for in-app badge (non-blocking)
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "wss://ws.mixtechniques.com";
    const wsHttpUrl = wsUrl.replace(/^wss:/, "https:").replace(/^ws:/, "http:");
    fetch(`${wsHttpUrl}/api/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "name-pulled",
        submission: {
          id: data.id,
          name: data.name,
          track_title: data.track_title,
          genre: data.genre,
          location: data.location,
        },
      }),
    }).catch(() => {}); // Don't block on WS failure

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Pull confirm error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
