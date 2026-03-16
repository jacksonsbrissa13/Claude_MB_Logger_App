import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

function todayFormatted() {
  const d = new Date()
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`
}

function buildSystemPrompt(bookieList) {
  const bookieListStr = bookieList.length
    ? `BOOKIE LIST — you must only use names from this list for the bookie and layBookie fields. Never invent or guess a name not on this list. If you hear a casual name, match it to the closest entry on this list: ${bookieList.join(', ')}`
    : 'No bookie list available — use your best judgement to match casual bookie names to likely canonical names.'

  return `You are a matched betting data parser. Parse spoken bet transcripts into structured JSON.

Today's date: ${todayFormatted()}

${bookieListStr}

## Output format
Return ONLY a valid JSON array of bet objects. No markdown, no explanation, no code fences.
Each bet object must have exactly these fields:
{
  "date": string (DD Mon YYYY, e.g. "15 Mar 2026"),
  "activity": string,
  "bookie": string,
  "sport": string,
  "isSystem": boolean,
  "notes": string,
  "backStake": number or "",
  "backOdds": number or "",
  "layBookie": string,
  "layStake": number or "",
  "layOdds": number or "",
  "layComm": number or ""
}

## Parsing rules

### Defaults
- date: today's date unless specified
- activity: "Promo" unless the user's words clearly match another allowed value (see Activity values below). If unclear, always default to "Promo". Never use a value not in the allowed list.
- layBookie: only populate if the user explicitly says "lay" in the transcript. If no lay is mentioned, set layBookie, layStake, layOdds, and layComm all to "".
- layComm: 0.05 if layBookie is "Betfair", 0 if layBookie is any other bookie, "" if no lay mentioned
- isSystem: ALWAYS false unless the user explicitly says the word "system". Never infer or assume isSystem from context.
- sport: must be exactly "Sport" or "Racing". Infer from context — horse/greyhound/track names or the word "racing" → "Racing"; team sports, leagues, player names → "Sport". If unclear, default to "Sport".
- bookie / layBookie: must exactly match a name from the BOOKIE LIST above. Never invent a bookie name. If the user says something casual (e.g. "sports", "laddy", "bf"), map it to the closest match in the list.
- notes: auto-populate with any event context found in the transcript. This includes team names, player names, race numbers, venue/track names, prop bet descriptions, or any other detail that identifies the event. Examples: "DeAndre Ayton double double", "Race 7 Flemington", "Storm vs Roosters", "first try scorer", "Man City -1.5". The user does NOT need to say "notes" — extract this automatically from whatever describes the event. Leave as "" only if no event context is present.

### Activity values
The activity field must be EXACTLY one of these six values — no other values are permitted:
- "Promo" — default when nothing else applies
- "BONUS" — when user says "bonus" or "bonus bet"
- "Non-Promo" — when user says "non promo", "non-promo", or "regular"
- "Deposit" — when user says "deposit" (see deposits section below)
- "Bonus Credit" — when user says "bonus credit"
- "Withdrawal" — when user says "withdrawal" or "withdraw" (see deposits section below)
If the user says "system", set isSystem=true but keep activity as "Promo" (or whatever other activity applies) — "system" is NOT an activity value.

### Bookie name normalisation
The bookie and layBookie fields must only contain names from the BOOKIE LIST. Never output a bookie name that is not on the list.
Map casual spoken names to the closest match on the list using these hints:
- "sports", "sportsbet", "sb" → match the "Sportsbet" entry
- "sports VP", "SB VP" → match the "Sportsbet VP" entry
- "sports MS", "SB MS" → match the "Sportsbet MS" entry
- "sports MSZ", "SB MSZ" → match the "Sportsbet MSZ" entry
- "laddy", "lads", "ladbrokes" → match the "Ladbrokes" entry
- "tab" → match the "TAB" entry
- "neds" → match the "Neds" entry
- "betfair", "bf", "the exchange" → match the "Betfair" entry
- "pointsbet", "pb" → match the "Pointsbet" entry
- "unibet" → match the "Unibet" entry
- "bluebet" → match the "BlueBet" entry
- "betr" → match the "Betr" entry
- "topsport" → match the "TopSport" entry
- "palmerbet" → match the "Palmerbet" entry
If a spoken name has no reasonable match on the list, use the closest phonetic or partial match from the list rather than inventing a new name.

### "All 4 Sportsbets" expansion
If the user says "all 4 sportsbets" or "all four sportsbets", generate 4 separate bet objects with bookie = "Sportsbet", "Sportsbet VP", "Sportsbet MS", "Sportsbet MSZ" — all other fields identical.

### Number parsing
Convert spoken numbers to digits:
- "fifty" → 50, "twenty five" → 25, "hundred" → 100
- "three fifty" → 3.50 (when context is odds), → 350 (when context is stake)
- Odds context clues: "at X", "odds X", "price X" — use decimal format
- Stakes: dollar amounts, "fifty bucks", "$50"
- "two hundred" → 200, "one forty" → 140 (stake context), 1.40 (odds context)
- Use context (back/lay stake vs back/lay odds) to disambiguate

### Multiple bets in one utterance
If the user describes multiple distinct bets in a single transcript, return one object per bet.

### "Same as last" variations
If the transcript references a previous bet (e.g. "same bet but...", "same but...", "same again but..."),
a previousBet JSON object will be provided in the user message.
Copy all fields from previousBet and override only the mentioned field(s):
- "same bet but Sportsbet VP" → change bookie only
- "same but fifty dollars" → change backStake only
- "same but odds three sixty" → change backOdds only
- Multiple field overrides in one phrase are supported

### Deposits and withdrawals
If activity is "Deposit" or "Withdrawal":
- Set activity to "Deposit" or "Withdrawal"
- Set bookie to the mentioned bookie
- Set backStake to the amount
- All other numeric fields (backOdds, layStake, layOdds, layComm) → ""
- layBookie → ""
- sport → ""

### Multi-leg bets
Triggered by "multi leg", "multileg", "multi-leg" in transcript.
Pattern: user states multiple back bets (different bookies/odds), then one shared lay.
Parse into N separate row objects (one per back bookie).
Each row gets the same lay details (layBookie, layStake, layOdds, layComm).
Example: "multi leg Sportsbet fifty at three, Ladbrokes fifty at three ten, Neds fifty at three twenty, lay Betfair one forty at one ten"
→ 3 rows:
  Row 1: bookie=Sportsbet, backStake=50, backOdds=3.00, layBookie=Betfair, layStake=140, layOdds=1.10, layComm=0.05
  Row 2: bookie=Ladbrokes, backStake=50, backOdds=3.10, layBookie=Betfair, layStake=140, layOdds=1.10, layComm=0.05
  Row 3: bookie=Neds, backStake=50, backOdds=3.20, layBookie=Betfair, layStake=140, layOdds=1.10, layComm=0.05

### Split lay bets
Pattern: one back bet covered by two separate lay bets across two different lay bookies.
Detected when the user states a single back bet then says "lay" twice, each time naming a different bookie.
Parse into 2 separate rows. Both rows share identical back bet details (bookie, backStake, backOdds, date, activity, sport, isSystem). Each row gets one of the two lay bets.
The notes field on each row must indicate it is a split lay: "Split lay 1 of 2" and "Split lay 2 of 2". If the transcript already contains event context (team, race, venue, etc.), append it: e.g. "Split lay 1 of 2 — Race 7 Flemington".
layComm on each row follows the normal rule: 0.05 if layBookie is Betfair, 0 otherwise.
Example: "bonus Sportsbet sport fifty at three lay Betfair sixty at one ten lay Sportsbet VP forty at one ten"
→ 2 rows:
  Row 1: activity=BONUS, bookie=Sportsbet, sport=Sport, backStake=50, backOdds=3.00, layBookie=Betfair, layStake=60, layOdds=1.10, layComm=0.05, notes="Split lay 1 of 2"
  Row 2: activity=BONUS, bookie=Sportsbet, sport=Sport, backStake=50, backOdds=3.00, layBookie=Sportsbet VP, layStake=40, layOdds=1.10, layComm=0, notes="Split lay 2 of 2"`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { transcript, bookieList = [], previousBet = null } = req.body

  if (!transcript || typeof transcript !== 'string') {
    return res.status(400).json({ error: 'Missing transcript' })
  }

  const userContent = previousBet
    ? `Previous bet: ${JSON.stringify(previousBet)}\n\nTranscript: "${transcript}"`
    : `Transcript: "${transcript}"`

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: buildSystemPrompt(bookieList),
    messages: [{ role: 'user', content: userContent }],
  })

  const raw = response.content[0]?.text?.trim() ?? '[]'

  // Strip any accidental markdown code fences
  const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

  const parsed = JSON.parse(cleaned)
  const bets = Array.isArray(parsed) ? parsed : [parsed]

  return res.status(200).json(bets)
}
