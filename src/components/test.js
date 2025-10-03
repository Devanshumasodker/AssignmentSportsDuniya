/**
 * CommentaryFeed.js
 * Minimal MVP for a real-time T20 commentary feed in React Native CLI.
 * - Single-file component (default export)
 * - Uses FlatList for commentary feed
 * - Simulated event stream (replace with WebSocket or native module later)
 * - Robust handling for unknown event types
 *
 * Usage:
 * 1. Create a React Native CLI app.
 * 2. Drop this file into `src/components/CommentaryFeed.js`.
 * 3. Import and render <CommentaryFeed /> in your App.
 */

import React, { useEffect, useReducer, useRef } from 'react'
import { View, Text, FlatList, StyleSheet, ScrollView } from 'react-native'

// -------------------------
// Initial state & reducer
// -------------------------
const initialState = {
  totalRuns: 0,
  wickets: 0,
  balls: 0,
  commentary: [],
  matchStatus: 'Live',
}

function reducer(state, action) {
  switch (action.type) {
    case 'PROCESS_EVENT':
      return applyEvent(state, action.event)
    case 'RESET':
      return { ...initialState }
    default:
      console.warn('Unhandled reducer action:', action.type)
      return state
  }
}

// -------------------------
// Event processing logic
// -------------------------
function applyEvent(state, event) {
  const { type, payload = {} } = event
  const timestamp = Date.now()
  const id = `${timestamp}-${Math.floor(Math.random() * 1e6)}`
  const baseEvent = { ...event, _id: id, _receivedAt: timestamp }
  const addBall = (s) => ({ ...s, balls: s.balls + 1 })

  switch (type) {
    case 'BALL': {
      const runs = Number(payload.runs) || 0
      const next = {
        ...state,
        totalRuns: state.totalRuns + runs,
        commentary: [ { ...baseEvent, displayRuns: runs }, ...state.commentary ],
      }
      return addBall(next)
    }
    case 'BOUNDARY': {
      const runs = Number(payload.runs) || 4
      const next = {
        ...state,
        totalRuns: state.totalRuns + runs,
        commentary: [ { ...baseEvent, displayRuns: runs }, ...state.commentary ],
      }
      return addBall(next)
    }
    case 'WICKET': {
      const next = {
        ...state,
        wickets: state.wickets + 1,
        commentary: [ { ...baseEvent }, ...state.commentary ],
      }
      return addBall(next)
    }
    case 'MATCH_STATUS': {
      const status = payload.status || 'Status Update'
      const next = {
        ...state,
        matchStatus: status,
        commentary: [ { ...baseEvent }, ...state.commentary ],
      }
      if (status.toLowerCase().includes('new innings')) {
        return { ...next, totalRuns: 0, wickets: 0, balls: 0 }
      }
      return next
    }
    default: {
      console.warn('Unknown event type received:', type)
      return {
        ...state,
        commentary: [ { ...baseEvent, _unknown: true }, ...state.commentary ],
      }
    }
  }
}

// -------------------------
// Utility helpers
// -------------------------
function formatOvers(balls) {
  const completedOvers = Math.floor(balls / 6)
  const ballsInCurrent = balls % 6
  return `${completedOvers}.${ballsInCurrent}`
}

// -------------------------
// Simulated event stream
// -------------------------
const SAMPLE_EVENTS = [
  { type: 'BALL', payload: { runs: 0, commentary: 'Pushed to mid-on for a dot.' } },
  { type: 'BALL', payload: { runs: 1, commentary: 'Quick single to midwicket.' } },
  { type: 'BOUNDARY', payload: { runs: 4, commentary: 'Classic cover drive, races to the boundary!' } },
  { type: 'BALL', payload: { runs: 2, commentary: 'Worked away to third man for a couple.' } },
  { type: 'WICKET', payload: { playerOut: 'R. Sharma', dismissal: 'LBW', commentary: "Big appeal... and he's out!" } },
  { type: 'BOUNDARY', payload: { runs: 6, commentary: 'Huge hit! Clears the ropes!' } },
  { type: 'MATCH_STATUS', payload: { status: 'Innings Break', summary: 'Team A finishes on 175/7.' } },
  { type: 'UNKNOWN_EVENT', payload: { info: 'something novel' } },
]

function sampleEventGenerator(index) {
  const base = SAMPLE_EVENTS[index % SAMPLE_EVENTS.length]
  return JSON.parse(JSON.stringify(base))
}

// -------------------------
// Component
// -------------------------
export default function CommentaryFeed() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const tickRef = useRef(0)

  useEffect(() => {
    dispatch({ type: 'PROCESS_EVENT', event: { type: 'MATCH_STATUS', payload: { status: 'Live', summary: 'Match has started' } } })

    const interval = setInterval(() => {
      const idx = tickRef.current++
      const nextEvent = sampleEventGenerator(idx)
      if (nextEvent.type === 'BALL' && Math.random() > 0.6) nextEvent.payload.runs = Math.floor(Math.random() * 3)
      if (nextEvent.type === 'BOUNDARY') {
        nextEvent.payload.runs = Math.random() > 0.7 ? 6 : 4
      }
      dispatch({ type: 'PROCESS_EVENT', event: nextEvent })
    }, 2500)

    return () => clearInterval(interval)
  }, [])

  const { totalRuns, wickets, balls, commentary, matchStatus } = state
  const overs = formatOvers(balls)

  return (
    <View style={styles.container}>
      {/* Header / Scoreboard */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Live T20 — Commentary</Text>
          <Text style={styles.status}>Status: {matchStatus}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.score}>{totalRuns}/{wickets}</Text>
          <Text style={styles.overs}>Overs: {overs}</Text>
        </View>
      </View>

      {/* Commentary Feed */}
      <FlatList
        data={commentary}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => <EventCard event={item} />}
        inverted
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  )
}

// -------------------------
// EventCard component
// -------------------------
function EventCard({ event }) {
  const { type, payload = {}, _unknown } = event

  if (_unknown) {
    return (
      <View style={[styles.card, { backgroundColor: '#eee' }]}>
        <Text>⚠️ Unknown event</Text>
        <Text style={styles.subText}>{JSON.stringify(payload)}</Text>
      </View>
    )
  }

  switch (type) {
    case 'BALL':
      return (
        <View style={styles.card}>
          <Text>{payload.commentary || 'Dot ball.'}</Text>
          <Text style={styles.subText}>Runs: {payload.runs ?? 0}</Text>
        </View>
      )
    case 'BOUNDARY':
      return (
        <View style={[styles.card, { backgroundColor: '#e6ffe6' }]}>
          <Text style={{ fontWeight: 'bold' }}>🏏 {payload.runs} runs — {payload.commentary}</Text>
          <Text style={styles.subText}>Boundary</Text>
        </View>
      )
    case 'WICKET':
      return (
        <View style={[styles.card, { backgroundColor: '#ffe6e6' }]}>
          <Text style={{ fontWeight: 'bold', color: 'red' }}>WICKET — {payload.playerOut}</Text>
          <Text style={styles.subText}>{payload.dismissal} — {payload.commentary}</Text>
        </View>
      )
    case 'MATCH_STATUS':
      return (
        <View style={[styles.card, { backgroundColor: '#e6f0ff' }]}>
          <Text style={{ fontWeight: '600' }}>{payload.status}</Text>
          {payload.summary && <Text style={styles.subText}>{payload.summary}</Text>}
        </View>
      )
    default:
      return (
        <View style={styles.card}>
          <Text>{type}</Text>
          <Text style={styles.subText}>{JSON.stringify(payload)}</Text>
        </View>
      )
  }
}

// -------------------------
// Styles
// -------------------------
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '600' },
  status: { fontSize: 12, color: '#666' },
  score: { fontSize: 18, fontWeight: 'bold' },
  overs: { fontSize: 12, color: '#666' },
  card: { padding: 12, borderRadius: 6, marginVertical: 4, backgroundColor: '#f9f9f9' },
  subText: { fontSize: 12, color: '#666', marginTop: 4 },
})
