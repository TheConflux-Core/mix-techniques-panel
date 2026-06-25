/**
 * Daily.co helper library for Mix Techniques Backstage
 */

const DAILY_API_URL = "https://api.daily.co/v1";

function getApiKey(): string {
  const key = process.env.DAILY_API_KEY;
  if (!key) {
    throw new Error("DAILY_API_KEY environment variable is not set");
  }
  return key;
}

function dailyHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getApiKey()}`,
  };
}

/**
 * Create a Daily.co room.
 * @param name - Room name (used in the URL)
 * @param privacy - 'public' or 'private'
 * @returns The room object from Daily.co (includes url, name, id, etc.)
 */
export async function createRoom(
  name: string,
  privacy: "public" | "private" = "private"
) {
  const res = await fetch(`${DAILY_API_URL}/rooms`, {
    method: "POST",
    headers: dailyHeaders(),
    body: JSON.stringify({
      name,
      privacy,
      properties: {
        enable_chat: true,
        enable_screenshare: false,
        start_video_off: false,
        start_audio_off: false,
        exp: Math.floor(Date.now() / 1000) + 7200, // 2hr expiry
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create Daily room: ${res.status} ${err}`);
  }

  return res.json();
}

/**
 * Create a meeting token for a user to join a room.
 * @param roomName - The room name to create a token for
 * @param options - Token options
 * @returns The token string
 */
export async function createMeetingToken(
  roomName: string,
  options: { isOwner: boolean; userName: string }
) {
  const res = await fetch(`${DAILY_API_URL}/meeting-tokens`, {
    method: "POST",
    headers: dailyHeaders(),
    body: JSON.stringify({
      properties: {
        room_name: roomName,
        is_owner: options.isOwner,
        user_name: options.userName,
        exp: Math.floor(Date.now() / 1000) + 7200, // 2hr expiry
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create meeting token: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.token;
}

/**
 * Get the full room URL for a given room name.
 * @param roomName - The room name
 * @returns The full Daily.co room URL
 */
export function getRoomUrl(roomName: string): string {
  // Daily.co domain defaults to {subdomain}.daily.co
  // Use DAILY_DOMAIN env var if available, otherwise default
  const domain = process.env.DAILY_DOMAIN || "mixtechniques";
  return `https://${domain}.daily.co/${roomName}`;
}
