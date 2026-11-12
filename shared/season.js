// The calendar for the two visits. Used by the server (time lock) and the page (what the village looks like).
export const YEAR = 2026
export const SEALED_DAY = `${YEAR}-12-25`
/** 25 December 00:00 in the earliest time zone (UTC+14). No wish is released before this, whatever the device says. */
export const RELEASE_UTC = Date.UTC(YEAR, 11, 24, 10)
/** 1 January 12:00 UTC: midnight has reached the last time zone, so the tree stops taking new ornaments. */
export const FROZEN_UTC = Date.UTC(YEAR + 1, 0, 1, 12)
/** Wishes and emails are deleted on 1 February. */
export const WIPE_AT = Date.UTC(YEAR + 1, 1, 1)

const pad = n => String(n).padStart(2, '0')
export const localDay = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** A wish opens when the server has passed the earliest time zone and the reader's own clock says it is the 25th. */
export const isReleased = (utcMs, day) => utcMs >= RELEASE_UTC && day >= SEALED_DAY

/** advent (up to 24 Dec) · christmas (25–31 Dec) · nye (31 Dec from 18:00, until 01:00) · keepsake (after that). Local time. */
export function clockOf(d) {
  const day = localDay(d), h = d.getHours(), m = d.getMinutes(), nyDay = `${YEAR + 1}-01-01`
  const finale = (day === `${YEAR}-12-31` && h >= 18) || (day === nyDay && h < 1)
  const phase = finale ? 'nye' : day >= nyDay ? 'keepsake' : day >= SEALED_DAY ? 'christmas' : 'advent'
  const pulse = (day === `${YEAR}-12-31` && h === 23 && m === 59) || (day === nyDay && h === 0 && m < 10)
  return { phase, pulse, day }
}
