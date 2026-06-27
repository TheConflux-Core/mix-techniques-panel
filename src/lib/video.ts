/**
 * Video call helper for Mix Techniques Backstage
 * Uses self-hosted Jitsi Meet on Linode
 */

// Self-hosted Jitsi on Linode
const JITSI_DOMAIN = "judge.mixtechniques.com";
const JITSI_PROTOCOL = "https";

/**
 * Get the full room URL for a given room name.
 * Jitsi rooms are created on-the-fly when someone visits the URL.
 * @param roomName - The room name
 * @returns The full Jitsi room URL
 */
/**
 * Get the room URL with OBS-friendly config overrides appended as URL params.
 * Jitsi supports config overrides via hash params:
 * #config.xxx=value&interfaceConfig.xxx=value
 *
 * This strips the UI for OBS browser sources while the judge
 * sees the normal interface when joining directly.
 */
export function getRoomUrl(roomName: string): string {
  const base = `${JITSI_PROTOCOL}://${JITSI_DOMAIN}/${roomName}`;
  const obsParams = [
    'config.premeeting.enabled=false',
    'config.prejoinConfig.enabled=false',
    'interfaceConfig.TOOLBAR_BUTTONS=[]',
    'interfaceConfig.FILM_STRIP_MAX_HEIGHT=0',
    'interfaceConfig.VERTICAL_FILMSTRIP=false',
    'interfaceConfig.SHOW_JITSI_WATERMARK=false',
    'interfaceConfig.SHOW_BRAND_WATERMARK=false',
    'interfaceConfig.SHOW_POWERED_BY=false',
    'interfaceConfig.DISABLE_JOIN_LEAVE_NOTIFICATIONS=true',
    'interfaceConfig.TOOLBAR_ALWAYS_VISIBLE=false',
    'interfaceConfig.INITIAL_TOOLBAR_TIMEOUT=0',
  ].join('&');
  return `${base}#${obsParams}`;
}

/**
 * Get the room URL for judges (normal interface with controls).
 */
export function getJudgeRoomUrl(roomName: string): string {
  return `${JITSI_PROTOCOL}://${JITSI_DOMAIN}/${roomName}`;
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
