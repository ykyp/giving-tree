// Free text between people: anything flagged here waits for a person to review it.
export const WISH_MAX = 140
export const BRANCH_MAX = 28
const ABUSE = /(fuck|shit|cunt|bitch|bastard|wank|twat|nazi|hitler|kill yourself)/i
const CONTACT = /(https?:|www\.|\b[a-z0-9-]+\.(com|co|net|org|uk|io|ly|me|app|ru|gg)\b|\S+@\S+\.\S+|\b\d[\d\s-]{7,}\d\b)/i
export const flagWish = text => ABUSE.test(text) || CONTACT.test(text)
export const badName = name => /(fuck|shit|cunt|nazi|hitler|admin|mosaicads|official)/i.test(name)
