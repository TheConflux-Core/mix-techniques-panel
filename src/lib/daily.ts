/**
 * Video call helper for Mix Techniques Backstage
 * Uses Jitsi Meet (free, no account required, iframe-embeddable)
 */

const JITSI_DOMAIN = "meet.jit.si";

/**
 * Get the full room URL for a given room name.
 * Jitsi rooms are created on-the-fly when someone visits the URL.
 * @param roomName - The room name
 * @returns The full Jitsi room URL
 */
export function getRoomUrl(roomName: string): string {
  return `https://${JITSI_DOMAIN}/${roomName}`;
}

/**
 * "Create" a room — Jitsi creates rooms on first visit,
 * so this just returns the URL. Kept for API compatibility.
 */
export async function createRoom(
  name: string,
  _privacy: "public" | "private" = "private"
) {
  return {
    name,
    url: getRoomUrl(name),
  };
}

/**
 * Jitsi doesn't use tokens — rooms are accessible to anyone with the URL.
 * Kept for API compatibility. Returns the room name as a "token".
 */
export async function createMeetingToken(
  roomName: string,
  _options: { isOwner: boolean; userName: string }
): Promise<string> {
  return roomName;
}
