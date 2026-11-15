// Adding "open your wishes" to a calendar. A downloaded .ics file fails in many places (chat apps' own browsers, most
// Android phones), so the page offers each calendar its own way in: Google and Outlook by a plain link that opens
// their "new event" page, Apple and everything else by the .ics file, served so that Safari offers to add it.
import { YEAR } from './season.js'
import { copy } from './copy.js'

const START = `${YEAR}1225T090000`, END = `${YEAR}1225T093000` // 9 in the morning on the 25th, in the person's own time zone
const esc = s => String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1')
const fold = l => { const out = []; while (l.length > 73) { out.push(l.slice(0, 73)); l = ' ' + l.slice(73) } out.push(l); return out.join('\r\n') }

/** The .ics file: one event with a reminder at the time. `url` is the person's key. */
export function icsFile({ uid, url }) {
  const c = copy.calendar({ url })
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//The Giving Tree//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT', `UID:${uid}@giving-tree`, `DTSTAMP:${YEAR}1101T000000Z`,
    `DTSTART:${START}`, `DTEND:${END}`, `SUMMARY:${esc(c.summary)}`, `DESCRIPTION:${esc(c.description)}`, `URL:${url}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(c.summary)}`, 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].map(fold).join('\r\n') + '\r\n'
}
/** Links that open a filled-in new event. No file, so they work inside chat apps and on every phone. */
export function calendarLinks(url) {
  const c = copy.calendar({ url }), e = encodeURIComponent, iso = s => `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 11)}:${s.slice(11, 13)}:${s.slice(13, 15)}`
  return {
    google: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${e(c.summary)}&dates=${START}/${END}&details=${e(c.description)}`,
    outlook: `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${e(c.summary)}&startdt=${e(iso(START))}&enddt=${e(iso(END))}&body=${e(c.description)}`,
  }
}
