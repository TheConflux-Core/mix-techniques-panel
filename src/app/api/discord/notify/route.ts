import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/discord/notify
 *
 * Sends Discord webhook notifications to configured channels.
 * Body: {
 *   type: "name-pulled" | "drum-reveal" | "backstage-alert",
 *   name: string,
 *   location?: string,
 *   genre?: string,
 *   trackTitle?: string,
 *   episodeNumber?: number,
 *   channels?: string[]  // "names-pulled" | "live-chat" (defaults to both)
 * }
 */

interface NotifyBody {
  type: string;
  name: string;
  location?: string;
  genre?: string;
  trackTitle?: string;
  episodeNumber?: number;
  channels?: string[];
}

const WEBHOOK_MAP: Record<string, string | undefined> = {
  "names-pulled": process.env.DISCORD_NAMES_PULL_WEBHOOK,
  "live-chat": process.env.DISCORD_LIVE_CHAT_WEBHOOK,
  // Legacy fallback
  "legacy": process.env.DISCORD_PULL_WEBHOOK_URL,
};

function buildEmbed(body: NotifyBody) {
  const { type, name, location, genre, trackTitle, episodeNumber } = body;

  switch (type) {
    case "name-pulled":
      return {
        embeds: [{
          title: "🎲 Name Pulled from The Drum!",
          description: `**${name}** has been pulled${episodeNumber ? ` for Episode ${episodeNumber}` : ""}.`,
          color: 0xd4a843,
          fields: [
            ...(location ? [{ name: "Location", value: location, inline: true }] : []),
            ...(genre ? [{ name: "Genre", value: genre, inline: true }] : []),
            ...(trackTitle ? [{ name: "Track", value: trackTitle, inline: true }] : []),
          ],
          footer: { text: "Mix Techniques — Show Us Your Mix" },
          timestamp: new Date().toISOString(),
        }],
      };

    case "backstage-alert":
      return {
        embeds: [{
          title: "🎤 Backstage Alert",
          description: `**${name}** — you're up next! Please report to the backstage channel.`,
          color: 0xe89b2e,
          fields: [
            ...(location ? [{ name: "Location", value: location, inline: true }] : []),
            ...(genre ? [{ name: "Genre", value: genre, inline: true }] : []),
            ...(trackTitle ? [{ name: "Track", value: trackTitle, inline: true }] : []),
          ],
          footer: { text: "Join the backstage voice channel and wait for instructions." },
          timestamp: new Date().toISOString(),
        }],
      };

    case "drum-reveal":
      return {
        embeds: [{
          title: "🥁 And the next artist is...",
          description: `**${name}**!`,
          color: 0xd4a843,
          fields: [
            ...(location ? [{ name: "📍", value: location, inline: true }] : []),
            ...(genre ? [{ name: "Genre", value: genre, inline: true }] : []),
            ...(trackTitle ? [{ name: "🎵", value: `"${trackTitle}"`, inline: true }] : []),
          ],
          footer: { text: "Mix Techniques — Show Us Your Mix" },
          timestamp: new Date().toISOString(),
        }],
      };

    default:
      return {
        content: `📢 **${name}**${location ? ` from ${location}` : ""}`,
      };
  }
}

export async function POST(request: NextRequest) {
  // Allow cross-origin from WS server (host panel)
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const body: NotifyBody = await request.json();

    if (!body.name) {
      return NextResponse.json({ error: "name is required" }, { status: 400, headers: corsHeaders });
    }

    // Determine which channels to notify
    const targetChannels = body.channels || ["names-pulled", "live-chat"];
    const payload = buildEmbed(body);

    // Send to all target channels in parallel
    const results = await Promise.allSettled(
      targetChannels.map(async (channelId) => {
        const webhookUrl = WEBHOOK_MAP[channelId];
        if (!webhookUrl) {
          console.warn(`[Discord] No webhook configured for channel: ${channelId}`);
          return { channel: channelId, status: "skipped", reason: "no webhook" };
        }

        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const text = await res.text();
          console.error(`[Discord] Webhook failed for ${channelId}: ${res.status} ${text}`);
          return { channel: channelId, status: "error", code: res.status };
        }

        return { channel: channelId, status: "sent" };
      })
    );

    const summary = results.map((r) =>
      r.status === "fulfilled" ? r.value : { status: "rejected", reason: r.reason }
    );

    return NextResponse.json({ ok: true, results: summary }, { headers: corsHeaders });
  } catch (err: any) {
    console.error("[Discord] Notify error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
