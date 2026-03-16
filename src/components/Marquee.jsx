const MESSAGES = [
  "JACKSON... MORE LIKE A FUCKING MONEY PRINTER 🖨️",
  "KEEP DOMINATING KING 👑",
  "ANOTHER BOOKIE ABOUT TO GET COOKED 🔥",
  "YOUR MATHS DEGREE IS PAYING OFF AND YOU DIDN'T EVEN DO ONE 🎓",
  "THE BOOKIES HAVE FAMILIES TOO JACKSON. JUST SAYING. 😇",
  "RESTRICTED? GOOD. MEANS IT'S WORKING 😈",
  "YOUR IRONMAN TRAINING IS EXPENSIVE. GOOD THING YOU'RE PRINTING 💸",
  "ANALYSTS ANALYSE. KINGS PROFIT. YOU DO BOTH 👑",
  "THE MARKET IS WRONG. YOU ARE RIGHT. AS USUAL. ✅",
]

/**
 * LED-style scrolling marquee ticker.
 * @param {{ messageIndex: number }} props
 *   messageIndex — incremented by App on each confirmed bet; selects the
 *   current message. Animation does NOT restart on change — the new text
 *   appears on the next natural loop cycle for a seamless scroll.
 */
export function Marquee({ messageIndex = 0 }) {
  const text = MESSAGES[messageIndex % MESSAGES.length]

  return (
    <div className="app-marquee" aria-hidden="true">
      <div className="marquee-track">
        <span className="marquee-text">{text}</span>
        <span className="marquee-sep">///</span>
        <span className="marquee-text">{text}</span>
        <span className="marquee-sep">///</span>
      </div>
    </div>
  )
}
