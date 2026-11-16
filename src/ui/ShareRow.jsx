// One tap to the app someone actually uses. Plain links only: the message goes from the visitor's phone to the app
// they pick, and nothing is sent anywhere by this site. Used wherever a link is offered.
import { useState } from 'react'

const enc = encodeURIComponent
const ICONS = {
  WhatsApp: 'M4 20l1.3-4.2A8 8 0 1 1 8.4 19zM9 9.5c0 3 2.5 5.5 5.5 5.5',
  Telegram: 'M21 4 3 11l6 2 2 6 3-4 4 3z',
  Message: 'M4 5h16v11H9l-5 4z',
  Email: 'M3 6h18v12H3zM3 7l9 6 9-6',
  Story: 'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zM12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM17.2 6.8h.01',
}
const Icon = ({ d }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>

/**
 * `story`, when given, is a picture file (or a promise of one) made for a 9:16 story. Instagram takes pictures from
 * the phone's share sheet, not from a web link, and a story picture cannot carry a link: so the picture is handed to
 * the share sheet and the link is copied, ready to paste into Instagram's Link sticker. Where the browser cannot hand
 * over a file, the picture is saved instead.
 */
export default function ShareRow({ text, link, subject = 'The Giving Tree', onShare, story }) {
  const [note, setNote] = useState(''), full = `${text} ${link}`, canShare = typeof navigator !== 'undefined' && !!navigator.share
  const ways = [
    ['WhatsApp', `https://wa.me/?text=${enc(full)}`, true],
    ['Telegram', `https://t.me/share/url?url=${enc(link)}&text=${enc(text)}`, true],
    ['Message', `sms:?&body=${enc(full)}`, false],
    ['Email', `mailto:?subject=${enc(subject)}&body=${enc(full)}`, false],
  ]
  const more = async () => { onShare?.(); try { await navigator.share({ title: subject, text, url: link }) } catch (e) {} }
  const toStory = async () => {
    onShare?.()
    try { navigator.clipboard?.writeText(link).catch(() => {}) } catch (e) {}
    let file = null; try { file = await story } catch (e) {}
    if (!file) return setNote('The picture could not be made. Try again in a moment.')
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file] }); return setNote('Your link is copied. In your story, add a Link sticker and paste it.') } catch (e) { if (e?.name === 'AbortError') return }
    }
    const a = document.createElement('a'), url = URL.createObjectURL(file); a.href = url; a.download = file.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000)
    setNote('Picture saved, and your link is copied. Add the picture to your story, then paste the link into a Link sticker.')
  }
  const copy = () => { onShare?.(); try { navigator.clipboard.writeText(full).then(() => setNote('Copied. Paste it into a message.'), () => setNote(link)) } catch (e) { setNote(link) } }
  return (
    <div className="sharerow">
      <div className="sr-ways">{ways.map(([name, href, tab]) =>
        <a key={name} className="sr" href={href} {...(tab ? { target: '_blank', rel: 'noopener noreferrer' } : {})} onClick={() => onShare?.()}><Icon d={ICONS[name]} /><span>{name}</span></a>)}</div>
      {story && <button type="button" className="btn ghost sr-story" onClick={toStory}><Icon d={ICONS.Story} />Instagram story</button>}
      <div className="btnrow">{canShare && <button type="button" className="btn ghost" onClick={more}>More…</button>}<button type="button" className="btn ghost" onClick={copy}>Copy link</button></div>
      <p className="fine" role="status">{note}</p>
    </div>
  )
}
