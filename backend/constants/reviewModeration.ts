const REVIEW_BLOCKED_WORDS = [
	"scam",
	"scammer",
	"scamming",
	"fraud",
	"fraudulent",
	"fake",
	"ripoff",
	"rip off",
	"fuck",
	"fucking",
	"fucked",
	"motherfucker",
	"shit",
	"bullshit",
	"bitch",
	"asshole",
	"bastard",
	"dick",
	"cunt",
	"whore",
	"slut",
	"piss",
	"crap",
	"damn",
	"idiot",
	"moron",
] as const

function normalize(value: string) {
	return value
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[013457@$]/g, (character) => ({ "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s" })[character] || character)
		.replace(/[^a-z0-9]+/g, " ")
		.trim()
}

export function findBlockedReviewTerms(...parts: Array<string | null | undefined>) {
	const spaced = normalize(parts.filter(Boolean).join(" "))
	const compact = spaced.replace(/\s+/g, "")

	return REVIEW_BLOCKED_WORDS.filter((term) => {
		const normalizedTerm = normalize(term)
		const tokenPattern = new RegExp(`(?:^|\\s)${normalizedTerm.replace(/\s+/g, "\\s+")}(?:$|\\s)`)
		return tokenPattern.test(spaced) || compact.includes(normalizedTerm.replace(/\s+/g, ""))
	})
}

export function hasBlockedReviewTerms(...parts: Array<string | null | undefined>) {
	return findBlockedReviewTerms(...parts).length > 0
}
