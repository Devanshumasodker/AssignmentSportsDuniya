// mockStream.js
// -----------------------
// A simple mock “API” that emits cricket match events every few seconds.
// Usage: import { useMockStream } from './mockStream';

import { useEffect, useRef } from 'react'

const EVENT_POOL = [
  { type: 'BALL', payload: { runs: 1, commentary: 'Pushed to mid-on for a quick single.' } },
  { type: 'BOUNDARY', payload: { runs: 4, commentary: 'Classic cover drive, races to the boundary!' } },
  { type: 'WICKET', payload: { playerOut: 'R. Sharma', dismissal: 'LBW', commentary: "Big appeal... and he's out!" } },
  { type: 'MATCH_STATUS', payload: { status: 'Innings Break', summary: 'Team A finishes on 175/7.' } },
  // extra sample
  { type: 'BALL', payload: { runs: 0, commentary: 'Solid defensive shot back to bowler.' } },
  { type: 'BOUNDARY', payload: { runs: 6, commentary: 'Smashes it for six straight down the ground!' } },
]

// Hook: calls onEvent for each new event, at `intervalMs` frequency.
export function useMockStream(onEvent, intervalMs = 3000) {
  const timer = useRef(null)

  useEffect(() => {
    timer.current = setInterval(() => {
      // pick random event
      const evt = { 
        ...EVENT_POOL[Math.floor(Math.random() * EVENT_POOL.length)],
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString(),
      }
      onEvent(evt)
    }, intervalMs)

    return () => clearInterval(timer.current)
  }, [onEvent, intervalMs])
}
