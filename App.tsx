// App.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  FlatList,
  StatusBar,
  Animated,
  Dimensions,
} from 'react-native';

// ====================
// Models & Constants
// ====================
const EVENT_POOL = [
  { type: 'BALL', payload: { runs: 1, commentary: 'Pushed to mid-on for a quick single.' } },
  { type: 'BOUNDARY', payload: { runs: 4, commentary: 'Classic cover drive, races to the boundary!' } },
  { type: 'WICKET', payload: { playerOut: 'R. Sharma', dismissal: 'LBW', commentary: "Big appeal... and he's out!" } },
  { type: 'MATCH_STATUS', payload: { status: 'Innings Break', summary: 'Team A finishes on 175/7.' } },
  { type: 'BALL', payload: { runs: 0, commentary: 'Solid defensive shot back to bowler.' } },
  { type: 'BOUNDARY', payload: { runs: 6, commentary: 'Smashes it for six straight down the ground!' } },
];

// ====================
// Ring Buffer Utility
// ====================
class RingBuffer {
  constructor(limit) {
    this.limit = limit;
    this.buf = Array(limit).fill(null);
    this.head = 0;
    this.count = 0;
  }
  push(item) {
    this.buf[(this.head + this.count) % this.limit] = item;
    if (this.count < this.limit) this.count++;
    else this.head = (this.head + 1) % this.limit;
  }
  toArrayDesc() {
    const arr = [];
    for (let i = 0; i < this.count; i++) {
      const idx = (this.head + this.count - 1 - i + this.limit) % this.limit;
      arr.push(this.buf[idx]);
    }
    return arr;
  }
}

// ====================
// Accumulator Utility
// ====================
function applyEvent(summary, evt) {
  let { runs, wickets, overs, balls } = summary;
  switch (evt.type) {
    case 'BALL':
    case 'BOUNDARY':
      runs += evt.payload.runs;
      balls++;
      break;
    case 'WICKET':
      wickets++;
      balls++;
      break;
    default:
      return summary;
  }
  if (balls >= 6) {
    overs += Math.floor(balls / 6);
    balls = balls % 6;
  }

  if (wickets > 10) wickets = 10;
  if (runs > 300) runs = 300;
  if (overs > 50) overs = 50;

  return { runs, wickets, overs, balls };
}

// ====================
// Main App Component
// ====================
export default function App() {
  // Feed & Summary State
  const [feed, setFeed] = useState([]);
  const [summary, setSummary] = useState({ runs: 0, wickets: 0, overs: 0, balls: 0 });

  // Ring buffer & queue
  const buffer = useRef(new RingBuffer(100)).current;
  const queueRef = useRef([]);

  // Throttle flushing
  useEffect(() => {
    const id = setInterval(() => {
      const q = queueRef.current.splice(0);
      if (q.length) {
        q.forEach(e => {
          buffer.push(e);
          setSummary(s => applyEvent(s, e));
        });
        setFeed(buffer.toArrayDesc());
      }
    }, 200);
    return () => clearInterval(id);
  }, [buffer]);

  // Mock stream
  useEffect(() => {
    const t = setInterval(() => {
      const evt = {
        ...EVENT_POOL[Math.floor(Math.random() * EVENT_POOL.length)],
        id: Date.now().toString() + Math.random(),
        timestamp: new Date().toLocaleTimeString(),
      };
      queueRef.current.push(evt);
    }, 3000);
    return () => clearInterval(t);
  }, []);

  // ====================
  // Animated Header Setup
  // ====================
  const liveAnim = useRef(new Animated.Value(1)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(liveAnim, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
        Animated.timing(liveAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  // ====================
  // Event Card Renderers
  // ====================
  const BallCard = React.memo(({ event }) => (
    <View style={styles.ballCard}>
      <View style={styles.ballIndicator} />
      <View style={styles.cardContent}>
        <Text style={styles.ballText}>
          • {event.payload.commentary}
          {event.payload.runs > 0 && (
            <Text style={styles.runsText}> ({event.payload.runs} run{event.payload.runs > 1 ? 's' : ''})</Text>
          )}
        </Text>
        <Text style={styles.timestamp}>{event.timestamp}</Text>
      </View>
    </View>
  ));
  const BoundaryCard = React.memo(({ event }) => (
    <View style={[styles.boundaryCard, event.payload.runs === 6 ? styles.sixCard : null]}>
      <Text style={styles.boundaryEmoji}>{event.payload.runs === 6 ? '⚡' : '🏏'}</Text>
      <Text style={styles.boundaryText}>{event.payload.runs === 6 ? 'SIX!' : 'FOUR!'}</Text>
      <Text style={styles.boundaryCommentary}>{event.payload.commentary}</Text>
      <Text style={styles.boundaryRuns}>{event.payload.runs}</Text>
      <Text style={styles.timestampBoundary}>{event.timestamp}</Text>
    </View>
  ));
  const WicketCard = React.memo(({ event }) => (
    <View style={styles.wicketCard}>
      <Text style={styles.wicketEmoji}>🚫 WICKET!</Text>
      <Text style={styles.wicketPlayer}>{event.payload.playerOut} ({event.payload.dismissal})</Text>
      <Text style={styles.wicketCommentary}>{event.payload.commentary}</Text>
      <Text style={styles.timestampWicket}>{event.timestamp}</Text>
    </View>
  ));
  const StatusCard = React.memo(({ event }) => (
    <View style={styles.statusCard}>
      <Text style={styles.statusTitle}>{event.payload.status}</Text>
      <Text style={styles.statusSummary}>{event.payload.summary}</Text>
      <Text style={styles.timestampStatus}>{event.timestamp}</Text>
    </View>
  ));
  const UnknownCard = React.memo(({ event }) => (
    <View style={styles.unknownCard}>
      <Text style={styles.unknownEmoji}>⚠️</Text>
      <Text style={styles.unknownText}>Unknown event: {event.type}</Text>
      <Text style={styles.timestamp}>{event.timestamp}</Text>
    </View>
  ));

  const renderItem = useCallback(({ item }) => {
    switch (item.type) {
      case 'BALL': return <BallCard event={item} />;
      case 'BOUNDARY': return <BoundaryCard event={item} />;
      case 'WICKET': return <WicketCard event={item} />;
      case 'MATCH_STATUS': return <StatusCard event={item} />;
      default: return <UnknownCard event={item} />;
    }
  }, []);

  // ====================
  // App Render
  // ====================
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#1B5E20" barStyle="light-content" />
      <Animated.View style={[styles.header, {
        transform: [{ translateY: headerAnim.interpolate({ inputRange: [0,1], outputRange: [-100,0] }) }]
      }]}>
        <View style={styles.headerTop}>
          <Text style={styles.teamName}>Mumbai Indians</Text>
          <Animated.View style={[styles.liveDot, { opacity: liveAnim }]} />
          <Text style={styles.liveLabel}>LIVE</Text>
        </View>
        <View style={styles.scoreRow}>
          <Text style={styles.scoreText}>{summary.runs}/{summary.wickets}</Text>
          <Text style={styles.oversText}>({summary.overs}.{summary.balls} ov)</Text>
        </View>
        <Text style={styles.headerTitle}>Live Commentary Feed</Text>
      </Animated.View>

      <FlatList
        data={feed}
        keyExtractor={i => i.id}
        renderItem={renderItem}
        inverted
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        windowSize={7}
        removeClippedSubviews
        contentContainerStyle={styles.feedContainer}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🏏</Text>
            <Text style={styles.emptyText}>Waiting for commentary...</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

// ====================
// Styles
// ====================
const { width } = Dimensions.get('window');
const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:'#F5F5F5' },


  // Header
  header: { backgroundColor:'#1B5E20', padding:16, paddingTop:24, elevation:6 },
  headerTop: { flexDirection:'row', alignItems:'center', marginBottom:8 },
  teamName: { color:'#FFF', fontSize:18, fontWeight:'600', flex:1 },
  liveDot: { width:8, height:8, borderRadius:4, backgroundColor:'#FF6B35', marginRight:6 },
  liveLabel: { color:'#FFF', fontSize:12, fontWeight:'bold' },
  scoreRow: { flexDirection:'row', alignItems:'baseline', marginBottom:4 },
  scoreText: { color:'#FFF', fontSize:32, fontWeight:'bold' },
  oversText: { color:'#E8F5E8', fontSize:16, marginLeft:12 },
  headerTitle: { color:'#FFC107', fontSize:16, fontWeight:'600', textAlign:'center' },

  // Feed container
  feedContainer: { paddingHorizontal:16, paddingBottom:24 },

  // BALL
  ballCard: { flexDirection:'row', backgroundColor:'#FFF', marginVertical:4, borderRadius:8, elevation:2 },
  ballIndicator: { width:4, backgroundColor:'#4CAF50', borderTopLeftRadius:8, borderBottomLeftRadius:8 },
  cardContent: { flex:1, padding:12 },
  ballText: { fontSize:14, color:'#333' },
  runsText: { fontWeight:'600', color:'#1B5E20' },
  timestamp: { textAlign:'right', color:'#999', fontSize:10, marginTop:6 },

  // BOUNDARY
  boundaryCard: { backgroundColor:'#4CAF50', marginVertical:6, borderRadius:12, padding:12, alignItems:'center' },
  sixCard: { backgroundColor:'#FF9800' },
  boundaryEmoji:{ fontSize:24, marginBottom:4 },
  boundaryText:{ fontSize:18, fontWeight:'bold', color:'#FFF', marginBottom:4 },
  boundaryCommentary:{ fontSize:14, color:'#FFF', textAlign:'center', marginBottom:6 },
  boundaryRuns:{ fontSize:20, fontWeight:'bold', color:'rgba(255,255,255,0.9)' },
  timestampBoundary:{ fontSize:10, color:'rgba(255,255,255,0.7)', marginTop:6 },

  // WICKET
  wicketCard:{ backgroundColor:'#D32F2F', marginVertical:6, borderRadius:12, padding:12, alignItems:'center' },
  wicketEmoji:{ fontSize:24, color:'#FFF', marginBottom:4 },
  wicketPlayer:{ fontSize:16, color:'#FFF', fontWeight:'600', marginBottom:4 },
  wicketCommentary:{ fontSize:14, color:'#FFF', textAlign:'center' },
  timestampWicket:{ fontSize:10, color:'rgba(255,255,255,0.7)', marginTop:6 },

  // STATUS
  statusCard:{ backgroundColor:'#1976D2', marginVertical:6, borderRadius:12, padding:12, alignItems:'center' },
  statusTitle:{ fontSize:16, color:'#FFF', fontWeight:'bold', marginBottom:4 },
  statusSummary:{ fontSize:14, color:'#FFF', textAlign:'center', marginBottom:6 },
  timestampStatus:{ fontSize:10, color:'rgba(255,255,255,0.7)' },

  // UNKNOWN
  unknownCard:{ backgroundColor:'#FFF3CD', marginVertical:4, borderRadius:8, padding:12, alignItems:'center', borderWidth:1, borderColor:'#FFEEBA' },
  unknownEmoji:{ fontSize:20, marginBottom:4 },
  unknownText:{ fontSize:14, color:'#856404', fontWeight:'600' },

  // Empty
  emptyContainer:{ alignItems:'center', marginTop:80 },
  emptyEmoji:{ fontSize:48, marginBottom:12 },
  emptyText:{ fontSize:16, color:'#999' },
});
