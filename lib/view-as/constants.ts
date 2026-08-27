/**
 * The authoritative cookie: the id of the member the admin is viewing as.
 *
 * httpOnly — the browser can never set it. Every server reader re-verifies that
 * the *real* session belongs to an admin before honouring it, so a forged value
 * is inert.
 */
export const VIEW_AS_COOKIE = "kk_view_as"

/**
 * A display-only companion cookie holding a base64 JSON summary of the target.
 *
 * Readable by the client on purpose. It exists so the banner and the header can
 * paint the impersonated identity on first render without a round trip; it is
 * never trusted for access decisions. If it ever disagrees with the httpOnly
 * cookie the worst case is a stale name in the banner.
 */
export const VIEW_AS_LABEL_COOKIE = "kk_view_as_label"

/** Both cookies live for one working session. */
export const VIEW_AS_MAX_AGE = 60 * 60 * 8
