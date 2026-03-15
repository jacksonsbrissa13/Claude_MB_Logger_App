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
    ? `The canonical bookie list (use exact spelling from this list when matching): ${bookieList.join(', ')}`
    : 'No bookie list available — use best judgement for bookie names.'

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
- activity: "Promo" unless user says otherwise (e.g. "system", "deposit", "withdrawal", "SNR", "bonus")
- layBookie: only populate if the user explicitly says "lay" in the transcript. If no lay is mentioned, set layBookie, layStake, layOdds, and layComm all to "".
- layComm: 0.05 if layBookie is "Betfair", 0 if layBookie is any other bookie, "" if no lay mentioned
- isSystem: false unless user explicitly says "system"
- sport: infer from context — horse/greyhound/track names or "racing" → "Racing"; team sports, leagues, player names → "Sport"; if unclear default to "Racing"
- notes: auto-populate with any event context found in the transcript. This includes team names, player names, race numbers, venue/track names, prop bet descriptions, or any other detail that identifies the event. Examples: "DeAndre Ayton double double", "Race 7 Flemington", "Storm vs Roosters", "first try scorer", "Man City -1.5". The user does NOT need to say "notes" — extract this automatically from whatever describes the event. Leave as "" only if no event context is present.

### Activity values
- "Promo" (default)
- "System" (only if user says "system")
- "SNR" / "Bonus" / "Freebet" — use as spoken
- "Deposit" / "Withdrawal" — see deposits section below

### Bookie name normalisation
Match casual names to canonical names. Examples:
- "sports", "sportsbet", "sb" → "Sportsbet"
- "sports VP", "SB VP", "sportsbet VP" → "Sportsbet VP"
- "sports MS", "SB MS" → "Sportsbet MS"
- "sports MSZ", "SB MSZ" → "Sportsbet MSZ"
- "laddy", "lads", "ladbrokes" → "Ladbrokes"
- "tab" → "TAB"
- "neds" → "Neds"
- "betfair", "bf" → "Betfair"
- "pointsbet", "pb" → "Pointsbet"
- "unibet" → "Unibet"
- "bluebet" → "BlueBet"
- "betr" → "Betr"
- "topsport" → "TopSport"
- "palmerbet" → "Palmerbet"
If the bookie list is provided, always prefer an exact match from the list.

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
  Row 3: bookie=Neds, backStake=50, backOdds=3.20, layBookie=Betfair, layStake=140, layOdds=1.10, layComm=0.05`
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
