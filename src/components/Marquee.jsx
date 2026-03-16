import { useState } from 'react'

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
 * Each message scrolls from right edge to off-screen left, then the next
 * message starts immediately. Cycles through all messages in order.
 * @param {{ messageIndex: number }} props  (unused for cycling; kept for API compat)
 */
export function Marquee() {
  const [currentIdx, setCurrentIdx] = useState(0)

  function handleAnimationEnd() {
    setCurrentIdx(i => (i + 1) % MESSAGES.length)
  }

  return (
    <div className="app-marquee" aria-hidden="true">
      <span
        key={currentIdx}
        className="marquee-text"
        onAnimationEnd={handleAnimationEnd}
      >
        {MESSAGES[currentIdx]}
      </span>
    </div>
  )
}
