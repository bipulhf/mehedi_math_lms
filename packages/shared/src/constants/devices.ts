/**
 * How many devices one student account may hold a live session on at once.
 *
 * Two, not one: a phone and a laptop is how a single person studies, and a
 * limit of one would sign somebody out every time they moved between them.
 * The third device is where sharing starts to look like sharing.
 */
export const maxConcurrentDevices = 2;

/** The header every client sends its own persistent device id in. */
export const deviceIdHeader = "x-device-id";

/** And what kind of client it is, since a user agent cannot be trusted to say. */
export const devicePlatformHeader = "x-device-platform";

/** Long enough for a UUID, short enough that the column is not a text blob. */
export const deviceIdMaxLength = 64;

/**
 * What the sign-in endpoint answers with when the limit is reached. The client
 * shows the message; this code is what it can branch on.
 */
export const deviceLimitErrorCode = "DEVICE_LIMIT_REACHED";

export const devicePlatforms = ["web", "ios", "android", "unknown"] as const;

export type DevicePlatform = (typeof devicePlatforms)[number];
