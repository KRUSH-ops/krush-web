import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Home, Trophy, PlusCircle, Award, User, Clock, Heart, ChevronLeft, Upload, Shield, RefreshCw, Trash2, Lock, Zap, Wallet } from 'lucide-react';

const C = {
  ink: '#0B0D17', surface: '#171A2B', surface2: '#1F2337', paper: '#F5F6FA',
  muted: '#8A8FA3', blue: '#2E5BFF', pink: '#FF2E7E', amber: '#FFB020', red: '#FF4D4D', green: '#2ED573',
};

// ---- EASY-TO-CHANGE TEST SETTINGS ----
const COMPETITION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours — starts counting down once the 2nd contestant enters
const STARTING_CREDITS = 10;
const STARTING_WALLET_BALANCE = 5; // prototype tokens, $1 = 1 token — starts low on purpose so testers hit the insufficient-funds path naturally
const WALLET_TOPUP_AMOUNT = 20;
const DEMO_PRIZE_AMOUNT = 50; // still used as the flat demo prize on the mock feed's flavor-only competitions
const MAX_SPOTS = 15;
const ENTRY_FEE_STANDARD = 3;
const ENTRY_FEE_TUESDAY = 2;
const isTuesday = () => new Date().getDay() === 2;
const currentEntryFee = () => (isTuesday() ? ENTRY_FEE_TUESDAY : ENTRY_FEE_STANDARD);

// ---- REAL VIDEO UPLOAD (Cloudinary unsigned upload) ----
// Cloud name + unsigned preset are safe to keep client-side — an unsigned preset by
// design requires no API secret. This is what makes cross-device video playback real
// instead of a local blob URL / filename placeholder.
const CLOUDINARY_CLOUD_NAME = 'd6jroi3j';
const CLOUDINARY_UPLOAD_PRESET = 'krush_unsigned';
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`;
const MAX_VIDEO_DURATION_SECONDS = 60;
const MAX_VIDEO_FILE_SIZE_BYTES = 75 * 1024 * 1024; // 75MB — generous ceiling for a 60s phone clip
const SUBCATEGORY_MAP = {
  Singing: 'A Cappella / Cover', Dancing: 'Freestyle', Dance: 'Freestyle', Comedy: 'Stand-Up / Sketch',
  'Acting / Performance': 'Monologue', 'Open Talent': 'Any Talent', 'Nail Art': 'Freehand Design',
  Cooking: 'Home Cooking', Photography: 'Mobile Photography', Art: 'Sketch / Illustration',
  Fashion: 'Styling', Fitness: 'Home Workout', Gardening: 'Container Gardening', Beauty: 'Makeup Artistry', 'Hip-Hop': 'Freestyle Bars',
};
const COMPETITION_RULES_TEXT = 'One winner takes the entire prize pot, judged purely by community votes. Every paid entry adds its full fee to the pot. Customer discovery prototype — all payments, votes, and prizes are simulated.';
const COMPETE_DISCLAIMER_TEXT = 'This is a customer discovery prototype. Your entry fee, upload, votes, prize pot, and winnings are all simulated — no real money is ever charged and no real prize is ever paid out. Your entry, username, and vote count will be visible to other testers in this competition. You can still switch to Watch & Vote any time before you complete payment and upload — once you submit your entry, that choice is final for this competition.';

const CATEGORIES = ['Singing', 'Dancing', 'Comedy', 'Acting / Performance', 'Open Talent', 'Dance', 'Nail Art', 'Cooking', 'Photography', 'Art', 'Fashion', 'Fitness', 'Gardening', 'Beauty', 'Music', 'Hip-Hop'];
const CAT_EMOJI = { Singing: '🎙️', Dancing: '💃', Comedy: '🎤', 'Acting / Performance': '🎭', 'Open Talent': '🌟', Dance: '💃', 'Nail Art': '💅', Cooking: '🍳', Photography: '📸', Art: '🎨', Fashion: '👗', Fitness: '💪', Gardening: '🌱', Beauty: '💄', Music: '🎵', 'Hip-Hop': '🎧' };
const FILTER_CATEGORIES = ['Music', 'Singing', 'Dance', 'Comedy', 'Hip-Hop', 'Cooking', 'Nail Art', 'Art', 'Photography', 'Gardening', 'Beauty', 'Fashion'];
const ADMIN_PIN = '2468';
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const FLAGSHIP_TITLE = 'KRUSH Singing/Music Competition';

// ---------- HOME VIDEO FEED (mock content for customer discovery testing) ----------
// This is the plain "people uploading" feed — NOT tied to any competition. Competitions live only on the Competitions tab.
const SPONSOR_BRANDS = ['NovaGlow Cosmetics', 'PeakForm Athletics', 'Fresha Kitchenware'];
const FEED_TYPE_LABEL = { popular: 'Most Popular', most_voted: 'Trending', sponsored: 'Sponsored', rising: 'Rising Fast' };
const FEED_POSTS_RAW = [
  { id: 'fp1', type: 'most_voted', interest: 'Singing', category: 'Singing', creator: 'melodicmia', avatar: '🎙️', caption: 'Cover of a song stuck in my head all week', likes: 842 },
  { id: 'fp2', type: 'sponsored', interest: 'Beauty', category: 'Beauty', creator: 'glowbygigi', avatar: '💄', caption: 'Everyday makeup in under 5 minutes', sponsor: 'NovaGlow Cosmetics', likes: 310 },
  { id: 'fp3', type: 'rising', interest: 'Photography', category: 'Photography', creator: 'shotbysam', avatar: '📸', caption: 'Golden hour on a phone camera only', likes: 96 },
  { id: 'fp4', type: 'popular', interest: 'Dance', category: 'Dance', creator: 'flowwithfey', avatar: '💃', caption: 'New choreo, learned it in a weekend', likes: 1204 },
  { id: 'fp5', type: 'most_voted', interest: 'Nail Art', category: 'Nail Art', creator: 'polishedbyp', avatar: '💅', caption: 'Chrome french tips, step by step', likes: 677 },
  { id: 'fp6', type: 'rising', interest: 'Comedy', category: 'Comedy', creator: 'deadpandom', avatar: '🎤', caption: 'POV: your group chat at 2am', likes: 58 },
  { id: 'fp7', type: 'popular', interest: 'Cooking', category: 'Cooking', creator: 'chefonabudget', avatar: '🍳', caption: '15-minute dinner that actually slaps', likes: 953 },
  { id: 'fp8', type: 'sponsored', interest: 'Fitness', category: 'Fitness', creator: 'reprangeranda', avatar: '💪', caption: '10-minute mobility routine before bed', sponsor: 'PeakForm Athletics', likes: 214 },
  { id: 'fp9', type: 'rising', interest: 'Art', category: 'Art', creator: 'inkbyisla', avatar: '🎨', caption: 'Timelapse of my latest sketch', likes: 41 },
  { id: 'fp10', type: 'most_voted', interest: 'Fashion', category: 'Fashion', creator: 'thriftedthread', avatar: '👗', caption: 'Building a fit from one thrifted jacket', likes: 588 },
  { id: 'fp11', type: 'popular', interest: 'Music', category: 'Music', creator: 'jaydentempo', avatar: '🎵', caption: 'Late-night beat I made in one take', likes: 1032 },
  { id: 'fp12', type: 'sponsored', interest: 'Cooking', category: 'Cooking', creator: 'growwithgrace', avatar: '🌱', caption: 'My balcony tomatoes finally came in', sponsor: 'Fresha Kitchenware', likes: 145 },
];

// ---------- COMPLETED COMPETITION CONTENT (blended into the For You feed) ----------
// Home Cook Showdown really is ended in storage (seeded that way), so its card pulls live data and its
// "View Competition Results" opens the real competition page. The other five are illustrative past rounds
// of the same named competitions and open a self-contained mock results view instead.
const COMPLETED_COMP_POSTS = [
  { id: 'cc1', badge: 'WINNER', placement: '1st Place', interest: 'Cooking', category: 'Cooking', creator: 'ChefTasha', avatar: '🍳', caption: '15-minute dinner that actually slaps', compTitle: 'Home Cook Showdown', real: true, endDate: 'Aug 20, 2026' },
  { id: 'cc2', badge: 'WINNER', placement: '1st Place', interest: 'Nail Art', category: 'Nail Art', creator: 'polishedbyp', avatar: '💅', caption: 'Chrome french tips, step by step', compTitle: 'Nail Art Battle', real: false, votes: 1240, pot: 45, contestants: 15, endDate: 'Aug 18, 2026', rankings: [{ name: 'polishedbyp', votes: 1240 }, { name: 'chromequeen', votes: 890 }, { name: 'frenchtipfiona', votes: 640 }] },
  { id: 'cc3', badge: 'WINNER', placement: '1st Place', interest: 'Singing', category: 'Singing', creator: 'melodicmia', avatar: '🎙️', caption: 'Cover of a song stuck in my head all week', compTitle: 'KRUSH Singing Spotlight', real: false, votes: 2140, pot: 45, contestants: 15, endDate: 'Aug 15, 2026', rankings: [{ name: 'melodicmia', votes: 2140 }, { name: 'harmonyhank', votes: 1510 }, { name: 'voxbyvic', votes: 980 }] },
  { id: 'cc4', badge: 'FINALIST', placement: '2nd Place', interest: 'Photography', category: 'Photography', creator: 'shotbysam', avatar: '📸', caption: 'Golden hour on a phone camera only', compTitle: 'Phone Photography Challenge', real: false, votes: 340, pot: 27, contestants: 9, endDate: 'Aug 12, 2026', rankings: [{ name: 'frameitfaith', votes: 410 }, { name: 'shotbysam', votes: 340 }, { name: 'lensbyleo', votes: 205 }] },
  { id: 'cc5', badge: 'FAN FAVORITE', placement: '3rd Place', interest: 'Dance', category: 'Dance', creator: 'flowwithfey', avatar: '💃', caption: 'New choreo, learned it in a weekend', compTitle: 'Detroit Dance-Off', real: false, votes: 980, pot: 36, contestants: 12, endDate: 'Aug 10, 2026', rankings: [{ name: 'stepitupstevie', votes: 1340 }, { name: 'grooveonglen', votes: 1120 }, { name: 'flowwithfey', votes: 980 }] },
  { id: 'cc6', badge: 'WINNER', placement: '1st Place', interest: 'Comedy', category: 'Comedy', creator: 'deadpandom', avatar: '🎤', caption: 'POV: your group chat at 2am', compTitle: 'Comedy Quick Hit', real: false, votes: 610, pot: 24, contestants: 8, endDate: 'Aug 8, 2026', rankings: [{ name: 'deadpandom', votes: 610 }, { name: 'punchlinepaula', votes: 470 }, { name: 'quipster', votes: 300 }] },
];
const NOTIFICATION_TEMPLATES = [
  { id: 'n1', text: 'You voted for @flowwithfey. Her competition ends in 2 hours!', linkType: 'creator', linkTarget: 'flowwithfey' },
  { id: 'n2', text: '@polishedbyp is only 12 votes away from first place.', linkType: 'creator', linkTarget: 'polishedbyp' },
  { id: 'n3', text: 'The KRUSH Singing Spotlight is now open. Upload your entry!', linkType: 'comp', linkTarget: FLAGSHIP_TITLE },
  { id: 'n4', text: 'A competition you follow ends tonight. Cast your vote before time runs out.', linkType: 'comp', linkTarget: 'Detroit Dance-Off' },
  { id: 'n5', text: 'Your favorite competition has a new round.', linkType: 'comp', linkTarget: 'Comedy Quick Hit' },
  { id: 'n6', text: 'Your entry received 10 new votes!', linkType: 'none' },
  { id: 'n7', text: 'New competition recommended for you: Nail Art Battle.', linkType: 'comp', linkTarget: 'Nail Art Battle' },
  { id: 'n8', text: 'Rising creator alert: @shotbysam is trending fast.', linkType: 'creator', linkTarget: 'shotbysam' },
  { id: 'n9', text: 'Winner announced! See who KRUSHED the competition.', linkType: 'comp', linkTarget: FLAGSHIP_TITLE },
];
const NOTIF_PREF_KEYS = [
  { id: 'endingReminders', label: 'Competition ending reminders' },
  { id: 'creatorUpdates', label: 'Updates about creators you voted for' },
  { id: 'newComps', label: 'New competitions in your selected interests' },
  { id: 'entryVoteUpdates', label: 'Entry and vote updates' },
  { id: 'winnerAnnouncements', label: 'Winner announcements' },
  { id: 'sponsoredAnnouncements', label: 'Sponsored competition announcements' },
];

// ---------- INTERESTS (onboarding) ----------
const INTEREST_OPTIONS = [
  { id: 'Music', label: 'Music', emoji: '🎵' },
  { id: 'Singing', label: 'Singing', emoji: '🎙️' },
  { id: 'Dance', label: 'Dance', emoji: '💃' },
  { id: 'Comedy', label: 'Comedy', emoji: '🎤' },
  { id: 'Art', label: 'Art', emoji: '🎨' },
  { id: 'Cooking', label: 'Cooking', emoji: '🍳' },
  { id: 'Nail Art', label: 'Nail Art', emoji: '💅' },
  { id: 'Fashion', label: 'Fashion', emoji: '👗' },
  { id: 'Gardening', label: 'Gardening', emoji: '🌱' },
  { id: 'Fitness', label: 'Fitness', emoji: '💪' },
  { id: 'Beauty', label: 'Beauty', emoji: '💄' },
  { id: 'Photography', label: 'Photography', emoji: '📸' },
];
const REQUIRED_INTERESTS = 3;
// Maps a competition's category to the closest interest, so "For You" can prioritize matching live competitions
const COMP_CATEGORY_TO_INTEREST = { Singing: 'Singing', Dancing: 'Dance', Dance: 'Dance', Comedy: 'Comedy', 'Nail Art': 'Nail Art', Cooking: 'Cooking', Photography: 'Photography', Art: 'Art', Fashion: 'Fashion', Fitness: 'Fitness', Gardening: 'Gardening', Beauty: 'Beauty', Music: 'Music', 'Hip-Hop': 'Music' };
// Static sample posts so the personalized feed visibly changes based on interests picked — for prototype demonstration only
const SAMPLE_FEED_POSTS = [
  { id: 'sf1', interest: 'Music', creator: 'jaydentempo', caption: 'Late-night beat I made in one take 🎧', emoji: '🎵' },
  { id: 'sf2', interest: 'Singing', creator: 'melodicmia', caption: 'Cover of a song stuck in my head all week', emoji: '🎙️' },
  { id: 'sf3', interest: 'Dance', creator: 'flowwithfey', caption: 'New choreo, learned it in a weekend', emoji: '💃' },
  { id: 'sf4', interest: 'Comedy', creator: 'deadpandom', caption: 'POV: your group chat at 2am', emoji: '🎤' },
  { id: 'sf5', interest: 'Art', creator: 'inkbyisla', caption: 'Timelapse of my latest sketch', emoji: '🎨' },
  { id: 'sf6', interest: 'Cooking', creator: 'chefonabudget', caption: '15-minute dinner that actually slaps', emoji: '🍳' },
  { id: 'sf7', interest: 'Nail Art', creator: 'polishedbyp', caption: 'Chrome french tips, step by step', emoji: '💅' },
  { id: 'sf8', interest: 'Fashion', creator: 'thriftedthread', caption: 'Building a fit from one thrifted jacket', emoji: '👗' },
  { id: 'sf9', interest: 'Gardening', creator: 'growwithgrace', caption: 'My balcony tomatoes finally came in', emoji: '🌱' },
  { id: 'sf10', interest: 'Fitness', creator: 'reprangeranda', caption: '10-minute mobility routine before bed', emoji: '💪' },
  { id: 'sf11', interest: 'Beauty', creator: 'glowbygigi', caption: 'Everyday makeup in under 5 minutes', emoji: '💄' },
  { id: 'sf12', interest: 'Photography', creator: 'shotbysam', caption: 'Golden hour on a phone camera only', emoji: '📸' },
];

// ---------- STORAGE HELPERS ----------
// In-memory write-through cache underneath every storage call. This is the single hardening point for
// the whole app: every sSet commits to this cache immediately (regardless of whether the real storage
// write succeeds), and every sGet/sList falls back to it if the real storage call fails or is missing
// something we know we wrote. This does NOT survive a real page reload on its own — that still depends
// on window.storage actually working — but it closes the specific failure mode we saw repeatedly: a
// transient/intermittent storage hiccup silently reverting a just-written vote, comment, wallet spend,
// role lock, or entry back to its old/default value later in the SAME session.
const memoryKV = {};
const kvKey = (key, shared) => (shared ? 's:' : 'p:') + key;

async function sGet(key, shared = false) {
  const ck = kvKey(key, shared);
  try {
    const r = await window.storage.get(key, shared);
    if (r) { const parsed = JSON.parse(r.value); memoryKV[ck] = parsed; return parsed; }
  } catch { /* fall through to memory cache below */ }
  return ck in memoryKV ? memoryKV[ck] : null;
}
async function sSet(key, value, shared = false) {
  memoryKV[kvKey(key, shared)] = value;
  try { return await window.storage.set(key, JSON.stringify(value), shared); } catch { return null; }
}
async function sDelete(key, shared = false) {
  delete memoryKV[kvKey(key, shared)];
  try { return await window.storage.delete(key, shared); } catch { return null; }
}
async function sList(prefix, shared = false) {
  let keys = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await window.storage.list(prefix, shared);
      keys = r?.keys || [];
    } catch { keys = []; }
    if (keys.length > 0) break;
    if (attempt === 0) await new Promise(res => setTimeout(res, 250)); // brief retry — a shared read can momentarily miss a write another device just made
  }
  const tagChar = shared ? 's:' : 'p:';
  const memKeys = Object.keys(memoryKV).filter(k => k.startsWith(tagChar) && k.slice(2).startsWith(prefix)).map(k => k.slice(2));
  return Array.from(new Set([...keys, ...memKeys]));
}
async function sGetMany(keys, shared) { const vals = await Promise.all(keys.map(k => sGet(k, shared))); return vals.filter(Boolean); }

// ---------- DETERMINISTIC MOCK COMPETITIONS & ROSTERS ----------
// These always render, synchronously, regardless of whether window.storage is available.
// Storage is used ONLY as an additive layer on top (real votes/entries a tester adds), never as
// the sole source of truth for whether a competition exists — that was the root cause of the
// Compete tab sometimes rendering "0 active competitions."
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
function timingFor({ entryCount, hoursLeft, minutesLeft, endedAgoHours }) {
  const now = Date.now();
  if (endedAgoHours !== undefined) {
    return { status: 'ended', countdownStartedAt: now - (COMPETITION_DURATION_MS + endedAgoHours * 3600000), endsAt: now - endedAgoHours * 3600000, endedAt: now - endedAgoHours * 3600000 };
  }
  if (entryCount < 2) return { status: entryCount === 0 ? 'waiting' : 'waiting', countdownStartedAt: null, endsAt: null, endedAt: null };
  const remainMs = (hoursLeft || 0) * 3600000 + (minutesLeft || 0) * 60000;
  return { status: 'live', countdownStartedAt: now - (COMPETITION_DURATION_MS - remainMs), endsAt: now + remainMs, endedAt: null };
}
const MOCK_COMP_DEFS = [
  { title: 'R&B Vocal KRUSH', category: 'Singing', featured: true, hoursLeft: 14, minutesLeft: 32, users: ['SoPrettyMia', 'velvetvocalsv', 'runsandriffs', 'lowkeylyric', 'smoothbysam', 'octaveolive', 'bluenotebella', 'harmonyhank', 'voxbyvic', 'melismamia', 'altobyalex'], baseVotes: [412, 233, 188, 97, 61, 141, 89, 205, 172, 55, 63] },
  { title: 'Freestyle Dance KRUSH', category: 'Dance', hoursLeft: 19, minutesLeft: 0, users: ['FlowWithFey', 'stepitupstevie', 'grooveonglen', 'twirlwithtia', 'bboyblake', 'sashaywithsage', 'poppinpaige'], baseVotes: [340, 180, 95, 220, 61, 150, 88] },
  { title: '60-Second Comedy KRUSH', category: 'Comedy', hoursLeft: 5, minutesLeft: 0, users: ['FunnyMikeD', 'deadpandom', 'punchlinepaula', 'quipster', 'onelinerolly', 'sarcasmsara', 'wisecrackwill', 'zingerzoe', 'droll-drew', 'setupsammy', 'callbackcarl', 'improv-ivy', 'timingtia', 'benitbeau'], baseVotes: [293, 184, 61, 128, 44, 172, 210, 39, 96, 155, 27, 88, 63, 141] },
  { title: 'Original Song KRUSH', category: 'Music', hoursLeft: 11, minutesLeft: 0, users: ['jaydentempo', 'melodybymo', 'chordsbycora', 'versebyvince', 'hookbyhana', 'bridgebybri', 'lyricbyleo', 'tempotessa', 'songbirdsage', 'basslinebrandon', 'keysandvibes', 'silkyvocals', 'moodmusicmax', 'softsoulsam', 'groovewithgio'], baseVotes: [640, 210, 188, 97, 305, 74, 152, 61, 233, 118, 46, 199, 83, 127, 55] },
  { title: 'Detroit Dance-Off', category: 'Dance', hoursLeft: 6, minutesLeft: 0, users: ['stepitupstevie', 'grooveonglen', 'twirlwithtia', 'bboyblake', 'sashaywithsage', 'poppinpaige', 'lockitlogan', 'heelsbyhana', 'krumpking', 'jazzhandsjade', 'tapbacktony', 'wavewithwes'], baseVotes: [250, 180, 310, 95, 140, 88, 205, 61, 172, 44, 130, 77] },
  { title: 'Nail Art Battle', category: 'Nail Art', hoursLeft: 3, minutesLeft: 0, users: ['PolishedByP', 'chromequeen', 'frenchtipfiona', 'glitterbygrace', 'ombrebyolivia', 'mattemaven', 'acrylicace', 'gelbygigi', 'nailartnora', 'stampstyleus', 'swirlbysam', 'dipbydana', 'foilbyfern', 'marblemadi', 'lineartlia'], baseVotes: [512, 340, 290, 180, 410, 95, 260, 140, 205, 88, 320, 61, 175, 240, 130] },
  { title: 'Phone Photography Challenge', category: 'Photography', hoursLeft: 0, minutesLeft: 45, users: ['ShotBySam', 'frameitfaith', 'lensbyleo', 'goldenhourgabe', 'shutterbysh', 'wideanglewill', 'macrobymaya', 'blackandwhitebo', 'skylinesarah', 'reflectionrey', 'portraitpia', 'streetshotstan', 'longexposureLu', 'filmnotdigital'], baseVotes: [340, 410, 205, 88, 150, 61, 233, 97, 178, 44, 260, 130, 190, 72] },
  { title: 'Home Cook Showdown', category: 'Cooking', endedAgoHours: 1, winnerIndex: 0, users: ['ChefTasha', 'chefonabudget', 'bakedbybrianna'], baseVotes: [512, 340, 210] },
  { title: 'Bars Battle', category: 'Hip-Hop', endedAgoHours: 3, winnerIndex: 2, users: ['barsbybree', 'punchlineking', 'sixteenshaun', 'wordplaywren', 'freestylefox', 'flowstatefinn', 'metaphormaya', 'cypherking', 'lyricalluke'], baseVotes: [180, 95, 610, 140, 61, 230, 77, 155, 44] },
  { title: 'R&B Vocal Challenge', category: 'Singing', hoursLeft: 10, minutesLeft: 0, users: ['voxbyvic', 'smoothbysam', 'runsandriffs', 'lowkeylyric'], baseVotes: [180, 210, 95, 61] },
  { title: 'Neo-Soul Showdown', category: 'Singing', hoursLeft: 8, minutesLeft: 0, users: ['neosoulnia', 'keysandvibes', 'basslinebrandon', 'silkyvocals', 'groovewithgio', 'softsoulsam', 'chordsbycora', 'moodmusicmax'], baseVotes: [95, 210, 61, 175, 88, 140, 205, 44] },
  { title: '60-Second Stand-Up KRUSH', category: 'Comedy', hoursLeft: 17, minutesLeft: 0, users: ['FunnyMikeD', 'deadpandom', 'punchlinepaula', 'quipster', 'onelinerolly', 'sarcasmsara', 'wisecrackwill', 'zingerzoe', 'droll-drew', 'setupsammy', 'callbackcarl', 'improv-ivy', 'timingtia', 'benitbeau', 'laughtrackleo'], baseVotes: [95, 180, 61, 128, 44, 172, 40, 39, 96, 155, 27, 88, 63, 141, 210] },
  { title: 'KRUSH Singing/Music Competition', category: 'Singing', hoursLeft: 20, minutesLeft: 0, users: ['SoPrettyMia', 'harmonyhank'], baseVotes: [420, 301] },
  { title: 'Comedy Quick Hit', category: 'Comedy', users: ['FunnyMikeD'], baseVotes: [0] },
  { title: 'Garden Glow-Up', category: 'Gardening', users: ['GardenGirlJay'], baseVotes: [0] },
  { title: 'Makeup Transformation Challenge', category: 'Beauty', users: [], baseVotes: [] },
  { title: 'KRUSH TEST PARTY — SINGING', category: 'Singing', featured: true, users: [], baseVotes: [] },
];
function buildMockComps() {
  return MOCK_COMP_DEFS.map(def => {
    const id = `mock-${slug(def.title)}`;
    const timing = timingFor({ entryCount: def.users.length, hoursLeft: def.hoursLeft, minutesLeft: def.minutesLeft, endedAgoHours: def.endedAgoHours });
    const entryIds = def.users.map((u, i) => `${id}-e${i}`);
    const winnerEntryId = def.winnerIndex !== undefined ? entryIds[def.winnerIndex] : null;
    const top3 = def.winnerIndex !== undefined ? [...entryIds].sort((a, b) => (def.baseVotes[entryIds.indexOf(b)] || 0) - (def.baseVotes[entryIds.indexOf(a)] || 0)).slice(0, 3) : [];
    return { id, title: def.title, category: def.category, maxSpots: MAX_SPOTS, featured: !!def.featured, createdAt: Date.now(), ...timing, winnerEntryId, top3 };
  });
}
function mockEntriesFor(compId) {
  const def = MOCK_COMP_DEFS.find(d => `mock-${slug(d.title)}` === compId);
  if (!def) return [];
  return def.users.map((u, i) => ({
    id: `${compId}-e${i}`, compId, username: u, contentId: `${compId}-c${i}`,
    enteredAt: Date.now(), feePaid: ENTRY_FEE_STANDARD, mockCaption: `${def.category} entry from @${u}`, baseVotes: def.baseVotes[i] || 0,
  }));
}
function mockContentFor(entry) {
  return { id: entry.contentId, username: entry.username, title: '', caption: entry.mockCaption, kind: 'video', createdAt: entry.enteredAt };
}
// Merges the always-present mock roster with any real storage-backed entries for the same competition.
async function getEffectiveEntries(compId) {
  const mock = mockEntriesFor(compId);
  let real = [];
  try { real = await sGetMany(await sList(`entry:${compId}:`, true), true); } catch { real = []; }
  return [...mock, ...real];
}
async function getVoteTotal(compId, entryId, baseVotes) {
  let extra = 0;
  try {
    const vals = await sGetMany(await sList(`voteamt:${compId}:${entryId}:`, true), true);
    extra = vals.reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
  } catch { extra = 0; }
  return (baseVotes || 0) + extra;
}

// ---------- MOCK COMMENTS ----------
const COMMENT_TEMPLATES = [
  { text: 'Okayyyy vocals 🔥🔥', username: 'listenerlacy', avatar: '🎧' },
  { text: 'You ate that.', username: 'tastemakertee', avatar: '✨' },
  { text: "I wasn't expecting THAT ending 😂", username: 'watchingwanda', avatar: '👀' },
  { text: 'Definitely got my vote.', username: 'votingvince', avatar: '🗳️' },
  { text: 'Run this back!!', username: 'encorezel', avatar: '🔁' },
  { text: 'This is so underrated, deserves way more votes', username: 'fairvotesfinn', avatar: '⚖️' },
  { text: 'The confidence 😮‍💨 love to see it', username: 'huypeman', avatar: '🔥' },
];
function mockCommentsFor(entryId) {
  // Deterministic-ish pseudo-random count/selection per entry so different entries feel different
  let h = 0; for (const c of entryId) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const count = 1 + (h % 4);
  const out = [];
  for (let i = 0; i < count; i++) {
    const t = COMMENT_TEMPLATES[(h + i * 7) % COMMENT_TEMPLATES.length];
    out.push({ id: `${entryId}-mc${i}`, text: t.text, username: t.username, avatar: t.avatar, minutesAgo: 5 + ((h + i * 13) % 240), likes: (h + i * 3) % 40 });
  }
  return out;
}

// In-memory fallback so posting/editing/deleting comments always works and survives closing/reopening
// the comment sheet within the same session, even if window.storage is unreliable in this environment.
// Storage is still attempted (best-effort) underneath so it persists across full reloads when available.
const memoryCommentStore = {};
const memoryLikeStore = {};
const getMemoryComments = (targetId) => memoryCommentStore[targetId] || [];
const putMemoryComment = (targetId, comment) => {
  const list = memoryCommentStore[targetId] || [];
  const idx = list.findIndex(c => c.id === comment.id);
  memoryCommentStore[targetId] = idx >= 0 ? list.map(c => c.id === comment.id ? comment : c) : [...list, comment];
};
const removeMemoryComment = (targetId, id) => {
  memoryCommentStore[targetId] = (memoryCommentStore[targetId] || []).filter(c => c.id !== id);
};
// The single authoritative count used everywhere a "💬 N" badge is shown: mock seeded comments +
// real ones (from this device's session cache and/or shared storage), top-level only, excluding
// anything soft-deleted. This is the same merge logic CommentsSheet itself uses, so the badge can
// never drift from what actually opens when you tap it.
async function countTopLevelComments(targetId) {
  const mockCount = mockCommentsFor(targetId).length;
  let real = [];
  try { real = await sGetMany(await sList(`comment:${targetId}:`, true), true); } catch { real = []; }
  const byId = {};
  for (const c of getMemoryComments(targetId)) byId[c.id] = c;
  for (const c of real) { byId[c.id] = c; putMemoryComment(targetId, c); } // warm the local cache for next time too
  const realTopLevel = Object.values(byId).filter(c => !c.parentCommentId && !c.deleted);
  return mockCount + realTopLevel.length;
}

// ---------- SMALL UI ----------
function LogoMark({ size = 'md' }) {
  const sizes = { sm: 'text-lg', md: 'text-2xl', lg: 'text-4xl' };
  return (
    <div className="flex items-center gap-2">
      <div style={{ background: `linear-gradient(135deg, ${C.blue}, ${C.pink})`, width: size === 'lg' ? 44 : 32, height: size === 'lg' ? 44 : 32 }}
        className="rounded-lg flex items-center justify-center text-white font-black flex-shrink-0" title="Official logo placeholder">
        <span style={{ fontSize: size === 'lg' ? 18 : 13 }}>K</span>
      </div>
      <span className={`font-black tracking-tight ${sizes[size]}`} style={{ color: C.paper }}>KRUSH</span>
    </div>
  );
}
function TestTag({ text = 'TEST MODE' }) {
  return <span style={{ background: 'rgba(46,213,115,0.12)', color: C.green, border: '1px solid rgba(46,213,115,0.4)' }} className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">{text}</span>;
}
function Toast({ message, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2400); return () => clearTimeout(t); }, []);
  return <div className="fixed bottom-24 left-4 right-4 z-50 flex justify-center"><div style={{ background: C.surface2, color: C.paper, border: `1px solid ${C.blue}` }} className="px-4 py-3 rounded-xl shadow-lg text-sm font-medium max-w-sm text-center">{message}</div></div>;
}
function TopBar({ title, onBack }) {
  return (
    <div style={{ background: C.ink, borderBottom: `1px solid ${C.surface2}` }} className="sticky top-0 z-30 flex items-center justify-between px-4 py-3">
      {onBack ? <button onClick={onBack} style={{ color: C.paper }}><ChevronLeft size={22} /></button> : <LogoMark size="sm" />}
      {title && <span style={{ color: C.paper }} className="font-bold text-sm absolute left-1/2 -translate-x-1/2">{title}</span>}
      <div />
    </div>
  );
}
function BottomNav({ screen, setScreen }) {
  const items = [{ id: 'home', label: 'Home', icon: Home }, { id: 'competitions', label: 'Compete', icon: Trophy }, { id: 'create', label: 'Create', icon: PlusCircle }, { id: 'winners', label: 'Winners', icon: Award }, { id: 'profile', label: 'Profile', icon: User }];
  return (
    <div style={{ background: C.surface, borderTop: `1px solid ${C.surface2}` }} className="fixed bottom-0 left-0 right-0 z-40 flex justify-around py-2 px-1">
      {items.map(({ id, label, icon: Icon }) => {
        const active = screen === id;
        return <button key={id} onClick={() => setScreen(id)} className="flex flex-col items-center gap-0.5 px-2 py-1 flex-1"><Icon size={22} color={active ? C.blue : C.muted} /><span style={{ color: active ? C.blue : C.muted }} className="text-[10px] font-semibold">{label}</span></button>;
      })}
    </div>
  );
}
function SectionLabel({ text, color }) { return <div style={{ color: color || C.paper }} className="text-sm font-black uppercase tracking-wide mt-5 mb-2">{text}</div>; }
function EmptyState({ text }) { return <div style={{ color: C.muted }} className="text-xs text-center py-8 max-w-[240px] mx-auto">{text}</div>; }
function Spinner() { return <div style={{ color: C.muted }} className="text-xs text-center py-8">Loading…</div>; }

function useCountdown(endsAt, live) {
  const [left, setLeft] = useState(endsAt ? endsAt - Date.now() : null);
  useEffect(() => {
    if (!live || !endsAt) return;
    const t = setInterval(() => setLeft(endsAt - Date.now()), 1000);
    return () => clearInterval(t);
  }, [endsAt, live]);
  if (!endsAt) return null;
  if (!live) return 'Ended';
  if (left <= 0) return 'Time\u2019s up';
  const h = Math.floor(left / 3600000), m = Math.floor((left % 3600000) / 60000), s = Math.floor((left % 60000) / 1000);
  return h > 0 ? `${h}h ${m}m left` : m > 0 ? `${m}m ${s}s left` : `${s}s left`;
}

// ---------- CONFETTI ----------
function Confetti() {
  const pieces = Array.from({ length: 40 }, (_, i) => i);
  const colors = [C.blue, C.pink, C.amber, C.green];
  return (
    <div className="fixed inset-0 z-[60] pointer-events-none overflow-hidden">
      <style>{`@keyframes krushfall { 0% { transform: translateY(-10vh) rotate(0deg); opacity:1; } 100% { transform: translateY(110vh) rotate(360deg); opacity:0.8; } }`}</style>
      {pieces.map(i => (
        <div key={i} style={{
          position: 'absolute', left: `${Math.random() * 100}%`, top: '-5vh',
          width: 8, height: 14, background: colors[i % colors.length],
          animation: `krushfall ${1.8 + Math.random() * 1.4}s ease-in ${Math.random() * 0.5}s forwards`,
          borderRadius: 2,
        }} />
      ))}
    </div>
  );
}

// ---------- PUSH BANNER ----------
function PushBanner({ text, onDone, onClick }) {
  useEffect(() => { const t = setTimeout(onDone, 4000); return () => clearTimeout(t); }, []);
  return (
    <div className="fixed top-3 left-3 right-3 z-[70] flex justify-center">
      <button onClick={() => { onClick && onClick(); onDone(); }} style={{ background: C.surface2, border: `1px solid ${C.blue}` }} className="w-full max-w-sm rounded-xl px-4 py-3 flex items-center gap-2 text-left shadow-lg">
        <span className="text-lg">🔔</span>
        <span style={{ color: C.paper }} className="text-xs font-medium flex-1">{text}</span>
      </button>
    </div>
  );
}

// ---------- NOTIFICATIONS ----------
function NotificationCenter({ onBack, onOpenPrefs, onResolveLink }) {
  const requestPush = () => {
    if (typeof Notification !== 'undefined' && Notification.requestPermission) Notification.requestPermission();
  };
  return (
    <div className="pb-8">
      <TopBar title="Notifications" onBack={onBack} />
      <div className="px-4 pt-4">
        {typeof Notification !== 'undefined' && (
          <button onClick={requestPush} style={{ background: C.surface, border: `1px solid ${C.surface2}`, color: C.paper }} className="w-full text-xs font-bold rounded-xl px-3 py-2.5 mb-4">Enable Browser Notifications (optional)</button>
        )}
        <div className="flex flex-col gap-2">
          {NOTIFICATION_TEMPLATES.map(n => (
            <button key={n.id} onClick={() => onResolveLink(n)} style={{ background: C.surface }} className="rounded-xl p-3 text-left flex items-start gap-2">
              <span className="text-lg">🔔</span>
              <span style={{ color: C.paper }} className="text-xs leading-snug">{n.text}</span>
            </button>
          ))}
        </div>
        <button onClick={onOpenPrefs} style={{ color: C.muted }} className="text-xs mt-6 flex items-center gap-1 mx-auto">Notification Preferences</button>
      </div>
    </div>
  );
}
function NotificationPrefsScreen({ prefs, onBack, onToggle }) {
  return (
    <div className="pb-8">
      <TopBar title="Notification Preferences" onBack={onBack} />
      <div className="px-4 pt-4 flex flex-col gap-2">
        {NOTIF_PREF_KEYS.map(p => {
          const on = prefs[p.id] !== false;
          return (
            <div key={p.id} style={{ background: C.surface }} className="rounded-xl p-3 flex items-center justify-between gap-3">
              <span style={{ color: C.paper }} className="text-sm">{p.label}</span>
              <button onClick={() => onToggle(p.id, !on)} style={{ background: on ? C.blue : C.surface2 }} className="w-11 h-6 rounded-full relative flex-shrink-0">
                <span style={{ background: 'white', left: on ? 22 : 2 }} className="w-4 h-4 rounded-full absolute top-1 transition-all" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- CREATOR PROFILE MODAL ----------
function CreatorProfileModal({ post, following, onFollow, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div style={{ background: C.surface }} onClick={e => e.stopPropagation()} className="w-full rounded-t-2xl p-6 flex flex-col items-center text-center">
        <div style={{ background: `linear-gradient(135deg, ${C.blue}, ${C.pink})` }} className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-2">{post.avatar}</div>
        <div style={{ color: C.paper }} className="font-black text-lg">@{post.creator}</div>
        <div style={{ color: C.muted }} className="text-xs mt-1 mb-4 max-w-xs">Mock creator profile for customer discovery testing — not a real KRUSH account.</div>
        <button onClick={() => onFollow(post.creator)} style={{ background: following ? C.surface2 : C.pink, color: following ? C.paper : 'white' }} className="font-bold px-6 py-2.5 rounded-xl text-sm">{following ? 'Following' : 'Follow'}</button>
      </div>
    </div>
  );
}

// ---------- FEED POST CARD ----------
function FeedPostCard({ post, liked, following, onToggleLike, onOpenVideo, onOpenCreator, onComment, onShare, onFollow, commentsTick }) {
  const badgeColor = post.type === 'sponsored' ? C.amber : post.type === 'rising' ? C.green : C.pink;
  const displayLikes = post.likes + (liked ? 1 : 0);
  const [commentCount, setCommentCount] = useState(() => mockCommentsFor(post.id).length);
  useEffect(() => { countTopLevelComments(post.id).then(setCommentCount); }, [post.id, commentsTick]);
  return (
    <div style={{ background: C.surface }} className="rounded-2xl overflow-hidden">
      <button onClick={() => onOpenVideo(post)} style={{ background: `linear-gradient(135deg, ${C.surface2}, ${C.ink})` }} className="w-full aspect-video flex items-center justify-center text-5xl relative">
        {post.avatar}
        <span style={{ background: 'rgba(0,0,0,0.5)', color: 'white' }} className="absolute bottom-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-md">▶ Mock video preview</span>
      </button>
      <div className="p-3">
        <div className="flex items-center justify-between flex-wrap gap-1 mb-2">
          <span style={{ background: `${badgeColor}22`, color: badgeColor }} className="text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide">{post.sponsor ? `Sponsored — ${post.sponsor}` : FEED_TYPE_LABEL[post.type]}</span>
          <TestTag text="CUSTOMER DISCOVERY TEST" />
        </div>
        <div className="flex items-center gap-2 mb-1.5">
          <button onClick={() => onOpenCreator(post)} style={{ background: C.surface2 }} className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0">{post.avatar}</button>
          <button onClick={() => onOpenCreator(post)} style={{ color: C.paper }} className="text-sm font-bold">@{post.creator}</button>
          <button onClick={() => onFollow(post.creator)} style={{ color: following ? C.muted : C.pink }} className="text-xs font-bold ml-auto">{following ? 'Following' : 'Follow'}</button>
        </div>
        <div style={{ color: C.paper }} className="text-sm mb-1.5">{post.caption}</div>
        <div style={{ color: C.muted }} className="text-xs mb-3">{post.category}</div>
        <div className="flex items-center gap-2">
          <button onClick={() => onToggleLike(post)} style={{ background: liked ? C.pink : C.surface2, color: liked ? 'white' : C.paper }} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-bold"><Heart size={14} fill={liked ? 'white' : 'none'} /> {displayLikes.toLocaleString()}</button>
          <button onClick={() => onComment(post)} style={{ background: C.surface2, color: C.paper }} className="px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1">💬 {commentCount}</button>
          <button onClick={() => onShare(post)} style={{ background: C.surface2, color: C.paper }} className="px-3 py-2 rounded-lg text-xs font-bold">↗</button>
        </div>
      </div>
    </div>
  );
}
function VideoModal({ post, liked, onToggleLike, onClose, onComment, commentsTick }) {
  const displayLikes = post.likes + (liked ? 1 : 0);
  const [commentCount, setCommentCount] = useState(() => mockCommentsFor(post.id).length);
  useEffect(() => { countTopLevelComments(post.id).then(setCommentCount); }, [post.id, commentsTick]);
  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: C.ink }}>
      <TopBar title={`@${post.creator}`} onBack={onClose} />
      <div style={{ background: `linear-gradient(135deg, ${C.surface2}, ${C.ink})` }} className="w-full aspect-square flex items-center justify-center text-8xl">{post.avatar}</div>
      <div className="px-4 pt-4">
        <div style={{ color: C.paper }} className="text-base font-semibold mb-2">{post.caption}</div>
        <div style={{ color: C.muted }} className="text-sm mb-3">{post.category}</div>
        <div className="flex items-center gap-3 flex-wrap text-sm mb-2">
          <button onClick={() => onToggleLike(post)} style={{ color: liked ? C.pink : C.paper }} className="font-bold flex items-center gap-1"><Heart size={16} fill={liked ? C.pink : 'none'} /> {displayLikes.toLocaleString()}</button>
          <button onClick={() => onComment(post)} style={{ color: C.paper }} className="font-bold flex items-center gap-1">💬 {commentCount}</button>
        </div>
        {post.sponsor && <TestTag text={`Sponsored by ${post.sponsor} (fictional brand)`} />}
      </div>
    </div>
  );
}
// ---------- COMPLETED COMPETITION FEED CARD ----------
function CompletedCompFeedCard({ post, liked, following, realComp, realEntries, realVoteTotals, onToggleLike, onOpenCreator, onComment, onShare, onFollow, onViewResults, commentsTick }) {
  const displayLikes = 300 + (liked ? 1 : 0); // baseline engagement number for completed-competition posts
  const badgeColor = post.badge === 'WINNER' ? C.amber : post.badge === 'FAN FAVORITE' ? C.pink : C.blue;
  const votes = post.real ? (realVoteTotals?.top ?? 0) : post.votes;
  const pot = post.real ? (realEntries?.length || 0) * ENTRY_FEE_STANDARD : post.pot;
  const contestants = post.real ? (realEntries?.length || 0) : post.contestants;
  const [commentCount, setCommentCount] = useState(() => mockCommentsFor(post.id).length);
  useEffect(() => { countTopLevelComments(post.id).then(setCommentCount); }, [post.id, commentsTick]);
  return (
    <div style={{ background: C.surface, border: `1px solid ${badgeColor}` }} className="rounded-2xl overflow-hidden">
      <div style={{ background: `linear-gradient(135deg, ${C.surface2}, ${C.ink})` }} className="w-full aspect-video flex items-center justify-center text-5xl relative">
        {post.avatar}
        {post.badge === 'WINNER' && <span className="absolute top-2 left-2 text-2xl">🏆</span>}
        <span style={{ background: badgeColor, color: post.badge === 'WINNER' ? '#1a1200' : 'white' }} className="absolute top-2 right-2 text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wide">KRUSH {post.badge}</span>
        <span style={{ background: 'rgba(0,0,0,0.55)', color: 'white' }} className="absolute bottom-2 left-2 right-2 text-[10px] font-bold px-2 py-1.5 rounded-md text-center">COMPETITION ENDED · PAST COMPETITION</span>
      </div>
      <div className="p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <button onClick={() => onOpenCreator(post)} style={{ background: C.surface2 }} className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0">{post.avatar}</button>
          <button onClick={() => onOpenCreator(post)} style={{ color: C.paper }} className="text-sm font-bold">@{post.creator}</button>
          <button onClick={() => onFollow(post.creator)} style={{ color: following ? C.muted : C.pink }} className="text-xs font-bold ml-auto">{following ? 'Following' : 'Follow'}</button>
        </div>
        <div style={{ color: C.paper }} className="text-sm mb-1.5">{post.caption}</div>
        <div style={{ color: C.muted }} className="text-xs mb-2">{post.compTitle} · {post.category}</div>
        <div className="flex items-center gap-3 flex-wrap text-xs mb-3">
          <span style={{ color: badgeColor }} className="font-bold">{post.placement}</span>
          <span style={{ color: C.paper }} className="font-semibold">{votes.toLocaleString()} final votes</span>
          <span style={{ color: C.amber }} className="font-semibold">${pot} pot</span>
          <span style={{ color: C.muted }}>{contestants} contestants</span>
          <span style={{ color: C.muted }}>Ended {post.endDate}</span>
        </div>
        <button onClick={() => onViewResults(post)} style={{ background: C.blue, color: 'white' }} className="w-full font-bold py-2 rounded-lg text-xs mb-2">View Competition Results</button>
        <div className="flex items-center gap-2">
          <button onClick={() => onToggleLike(post)} style={{ background: liked ? C.pink : C.surface2, color: liked ? 'white' : C.paper }} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-bold"><Heart size={14} fill={liked ? 'white' : 'none'} /> {displayLikes.toLocaleString()}</button>
          <button onClick={() => onComment(post)} style={{ background: C.surface2, color: C.paper }} className="px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1">💬 {commentCount}</button>
          <button onClick={() => onShare(post)} style={{ background: C.surface2, color: C.paper }} className="px-3 py-2 rounded-lg text-xs font-bold">↗</button>
        </div>
      </div>
    </div>
  );
}
// ---------- MOCK RESULTS MODAL (for illustrative past-round posts with no real backing competition) ----------
function MockResultsModal({ post, onClose }) {
  const medal = ['🥇', '🥈', '🥉'];
  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: C.ink }}>
      <TopBar title={post.compTitle} onBack={onClose} />
      <div className="px-4 pt-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">{CAT_EMOJI[post.category] || '🏆'}</span>
          <div>
            <div style={{ color: C.paper }} className="font-bold text-sm">{post.category}</div>
            <TestTag text="CUSTOMER DISCOVERY TEST — PAST COMPETITION" />
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap text-xs font-semibold mb-4">
          <span style={{ color: C.amber }}>Competition Ended</span>
          <span style={{ color: C.paper }}>{post.contestants} contestants</span>
          <span style={{ color: C.amber }}>${post.pot} prize pot</span>
          <span style={{ color: C.muted }}>Ended {post.endDate}</span>
        </div>
        <div style={{ background: 'rgba(255,176,32,0.1)', border: `1px solid ${C.amber}` }} className="rounded-xl p-4 mb-4">
          <div style={{ color: C.amber }} className="text-lg font-black mb-2">🏆 WINNER!</div>
          <div className="flex flex-col gap-2">
            {post.rankings.map((r, i) => (
              <div key={r.name} className="flex items-center gap-2">
                <span className="text-lg">{medal[i]}</span>
                <span style={{ color: C.paper }} className="text-sm font-semibold">@{r.name}</span>
                <span style={{ color: C.muted }} className="text-xs ml-auto">{r.votes.toLocaleString()} votes</span>
              </div>
            ))}
          </div>
          <div style={{ color: C.muted }} className="text-xs mt-3">No real cash prize was awarded — customer discovery prototype only.</div>
        </div>
        <SectionLabel text="Winning Video" />
        <div style={{ background: C.surface }} className="rounded-xl p-4 flex items-center gap-3">
          <div style={{ background: C.surface2 }} className="w-14 h-14 rounded-lg flex items-center justify-center text-2xl">{post.avatar}</div>
          <div className="min-w-0"><div style={{ color: C.paper }} className="text-sm font-semibold">@{post.rankings[0]?.name}</div><div style={{ color: C.muted }} className="text-xs truncate">{post.caption}</div></div>
        </div>
      </div>
    </div>
  );
}
function CompletedCompFeedCardConnected({ post, comps, liked, following, onToggleLike, onOpenCreator, onComment, onShare, onFollow, onViewRealComp, onViewMock, commentsTick }) {
  const [live, setLive] = useState({ entries: [], top: 0 });
  const realComp = post.real ? comps.find(c => c.title === post.compTitle && c.status === 'ended') : null;
  useEffect(() => {
    if (!realComp) return;
    (async () => {
      const entries = await sGetMany(await sList(`entry:${realComp.id}:`, true), true);
      let top = 0;
      for (const e of entries) {
        const vals = await sGetMany(await sList(`voteamt:${realComp.id}:${e.id}:`, true), true);
        top = Math.max(top, vals.reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0));
      }
      setLive({ entries, top });
    })();
  }, [realComp?.id]);
  return (
    <CompletedCompFeedCard post={post} liked={liked} following={following} realEntries={live.entries} realVoteTotals={{ top: live.top }} commentsTick={commentsTick}
      onToggleLike={onToggleLike} onOpenCreator={onOpenCreator} onComment={onComment} onShare={onShare} onFollow={onFollow}
      onViewResults={() => (post.real && realComp) ? onViewRealComp(realComp) : onViewMock(post)} />
  );
}
// ---------- FEATURED COMPETITION CARD (with entry/voter/pot data) ----------
function FeaturedCompCard({ comp, entryCount, voterCount, prizePot, onWatch, onEnter }) {
  const open = comp.status !== 'ended';
  const full = entryCount >= (comp.maxSpots || MAX_SPOTS);
  const countdown = useCountdown(comp.endsAt, open && !!comp.countdownStartedAt);
  const statusText = !open ? 'Results Ready' : full ? 'Competition Full' : comp.countdownStartedAt ? 'Competition Live' : entryCount >= 1 ? 'Waiting for a Challenger' : 'Open — Be the First to Enter';
  return (
    <div style={{ background: C.surface, borderLeft: `4px solid ${C.pink}` }} className="rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between flex-wrap gap-1">
        <span style={{ background: !open ? 'rgba(255,176,32,0.15)' : full ? 'rgba(255,77,77,0.15)' : 'rgba(46,91,255,0.15)', color: !open ? C.amber : full ? C.red : C.blue }} className="text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide">{statusText}</span>
        <TestTag text="CUSTOMER DISCOVERY TEST" />
      </div>
      <div style={{ background: `linear-gradient(135deg, ${C.surface2}, ${C.ink})` }} className="w-full h-20 rounded-lg flex items-center justify-center text-3xl">{CAT_EMOJI[comp.category]}</div>
      <div style={{ color: C.paper }} className="font-bold text-base">{comp.title}</div>
      <div style={{ color: C.muted }} className="text-xs">{comp.category} · {SUBCATEGORY_MAP[comp.category] || 'General'}</div>
      <div className="flex items-center gap-3 flex-wrap text-xs">
        <span style={{ color: C.paper }} className="font-semibold">{entryCount} of {comp.maxSpots || MAX_SPOTS} entries</span>
        <span style={{ color: C.paper }}>{voterCount} voters</span>
        {open && comp.countdownStartedAt && <span style={{ color: C.pink }} className="flex items-center gap-1"><Clock size={12} /> {countdown}</span>}
        <span style={{ color: C.amber }} className="font-semibold">${prizePot} pot</span>
        <span style={{ color: C.green }}>${currentEntryFee()} entry{isTuesday() ? ' (Tuesday price)' : ''}</span>
      </div>
      <div className="flex gap-2 mt-1">
        <button onClick={() => onWatch(comp)} style={{ background: C.blue, color: 'white' }} className="flex-1 text-xs font-bold py-2 rounded-lg">Watch &amp; Vote</button>
        <button onClick={() => onEnter(comp)} disabled={!open || full} style={{ background: (!open || full) ? C.surface2 : C.pink, color: (!open || full) ? C.muted : 'white' }} className="flex-1 text-xs font-bold py-2 rounded-lg">{full ? 'Full' : 'Enter Competition'}</button>
      </div>
    </div>
  );
}

function FeaturedCompWithCounts({ comp, onWatch, onEnter }) {
  const [counts, setCounts] = useState(() => {
    const mock = mockEntriesFor(comp.id);
    const pot = mock.reduce((s, e) => s + ENTRY_FEE_STANDARD, 0);
    const voters = mock.filter(e => e.baseVotes > 0).length;
    return { entries: mock.length, voters, pot };
  });
  useEffect(() => {
    (async () => {
      const entries = await getEffectiveEntries(comp.id);
      let voterKeys = [];
      try { voterKeys = await sList(`freevote:${comp.id}:`, true); } catch { voterKeys = []; }
      const pot = entries.reduce((s, e) => s + (typeof e.feePaid === 'number' ? e.feePaid : ENTRY_FEE_STANDARD), 0);
      const mockVoters = mockEntriesFor(comp.id).filter(e => e.baseVotes > 0).length;
      setCounts({ entries: entries.length, voters: voterKeys.length + mockVoters, pot });
    })();
  }, [comp.id, comp.status]);
  return <FeaturedCompCard comp={comp} entryCount={counts.entries} voterCount={counts.voters} prizePot={counts.pot} onWatch={onWatch} onEnter={onEnter} />;
}

// ---------- AUTH SCREENS (unchanged flow) ----------
function SplashScreen({ onNext }) {
  return (
    <div style={{ background: `radial-gradient(circle at 50% 30%, #1a1f3a, ${C.ink})` }} className="h-full flex flex-col items-center justify-center px-8 text-center">
      <LogoMark size="lg" />
      <p style={{ color: C.muted }} className="mt-4 text-sm">Create • Compete • Win • Cash In</p>
      <div className="mt-3"><TestTag text="CUSTOMER DISCOVERY TEST" /></div>
      <button onClick={onNext} style={{ background: `linear-gradient(90deg, ${C.blue}, ${C.pink})` }} className="mt-8 text-white font-bold px-8 py-3 rounded-xl w-full max-w-xs">Get Started</button>
    </div>
  );
}
function WelcomeScreen({ onSignUp, onLogIn }) {
  return (
    <div style={{ background: C.ink }} className="h-full flex flex-col items-center justify-center px-6 text-center">
      <div className="text-4xl mb-2">🏆</div>
      <h1 style={{ color: C.paper }} className="text-2xl font-black leading-tight">Your thing deserves<br />an audience.</h1>
      <p style={{ color: C.muted }} className="mt-3 text-sm max-w-xs">Forget waiting on the algorithm. Step into the arena.</p>
      <div className="w-full max-w-xs mt-8 flex flex-col gap-3">
        <button onClick={onSignUp} style={{ background: C.blue, color: 'white' }} className="font-bold py-3 rounded-xl">Sign Up</button>
        <button onClick={onLogIn} style={{ background: 'transparent', color: C.paper, border: `1px solid ${C.surface2}` }} className="font-bold py-3 rounded-xl">Log In</button>
      </div>
    </div>
  );
}
function SignUpScreen({ onBack, onNext }) {
  const [form, setForm] = useState({ displayName: '', email: '', password: '' });
  const [err, setErr] = useState('');
  return (
    <div style={{ background: C.ink }} className="h-full flex flex-col">
      <TopBar onBack={onBack} />
      <div className="px-6 pt-6 flex-1">
        <h2 style={{ color: C.paper }} className="text-xl font-black mb-1">Create your account</h2>
        <div className="mb-5"><TestTag /></div>
        <div className="flex flex-col gap-3">
          <input placeholder="Display name" value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} style={{ background: C.surface, color: C.paper, border: `1px solid ${C.surface2}` }} className="rounded-lg px-4 py-3 text-sm outline-none" />
          <input placeholder="Email (for this test session)" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={{ background: C.surface, color: C.paper, border: `1px solid ${C.surface2}` }} className="rounded-lg px-4 py-3 text-sm outline-none" />
          <input placeholder="Password" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} style={{ background: C.surface, color: C.paper, border: `1px solid ${C.surface2}` }} className="rounded-lg px-4 py-3 text-sm outline-none" />
        </div>
        {err && <div style={{ color: C.red }} className="text-xs mt-2">{err}</div>}
        <button onClick={() => form.displayName.trim() ? onNext(form) : setErr('Please enter a display name.')} style={{ background: C.blue, color: 'white' }} className="w-full font-bold py-3 rounded-xl mt-6">Continue</button>
      </div>
    </div>
  );
}
function ProfileSetupScreen({ draft, initial, onBack, onDone, checkUsername }) {
  const [username, setUsername] = useState(initial?.username || draft.displayName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15) || 'creator');
  const [bio, setBio] = useState(initial?.bio || ''); const [avatar, setAvatar] = useState(initial?.avatar || '😎'); const [err, setErr] = useState(''); const [checking, setChecking] = useState(false);
  const avatars = ['😎', '🔥', '⭐', '🎯', '🚀', '💥', '🌟', '🎬'];
  const submit = async () => {
    if (!username.trim()) return setErr('Pick a username.');
    setChecking(true); const taken = await checkUsername(username.trim()); setChecking(false);
    if (taken) return setErr('That username is already taken in this test — try another.');
    onDone({ username: username.trim(), bio: bio.trim(), avatar });
  };
  return (
    <div style={{ background: C.ink }} className="h-full flex flex-col">
      <TopBar onBack={onBack} />
      <div className="px-6 pt-6 flex-1">
        <h2 style={{ color: C.paper }} className="text-xl font-black mb-1">Set up your profile</h2>
        <p style={{ color: C.muted }} className="text-xs mb-5">This is how other testers will see you.</p>
        <div className="flex gap-2 mb-4 flex-wrap">{avatars.map(a => <button key={a} onClick={() => setAvatar(a)} style={{ background: avatar === a ? C.blue : C.surface, border: avatar === a ? `2px solid ${C.blue}` : `1px solid ${C.surface2}` }} className="w-11 h-11 rounded-full text-xl flex items-center justify-center">{a}</button>)}</div>
        <div className="flex flex-col gap-3">
          <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} style={{ background: C.surface, color: C.paper, border: `1px solid ${C.surface2}` }} className="rounded-lg px-4 py-3 text-sm outline-none" />
          <textarea placeholder="Short bio (optional)" value={bio} onChange={e => setBio(e.target.value)} rows={3} style={{ background: C.surface, color: C.paper, border: `1px solid ${C.surface2}` }} className="rounded-lg px-4 py-3 text-sm outline-none resize-none" />
        </div>
        {err && <div style={{ color: C.red }} className="text-xs mt-2">{err}</div>}
        <button onClick={submit} disabled={checking} style={{ background: C.blue, color: 'white' }} className="w-full font-bold py-3 rounded-xl mt-6">{checking ? 'Checking…' : 'Finish Setup'}</button>
      </div>
    </div>
  );
}
function InterestsScreen({ initialSelected, onBack, onContinue }) {
  const [selected, setSelected] = useState(initialSelected || []);
  const [warn, setWarn] = useState('');

  const toggle = (id) => {
    setWarn('');
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= REQUIRED_INTERESTS) {
        setWarn(`You've already picked ${REQUIRED_INTERESTS} — remove one before adding another.`);
        return prev;
      }
      return [...prev, id];
    });
  };

  const ready = selected.length === REQUIRED_INTERESTS;

  return (
    <div style={{ background: C.ink }} className="h-full flex flex-col">
      <TopBar onBack={onBack} />
      <div className="px-6 pt-4 flex-1 overflow-y-auto pb-28">
        <h2 style={{ color: C.paper }} className="text-xl font-black mb-1">What are you into?</h2>
        <p style={{ color: C.muted }} className="text-sm mb-1">Choose 3 interests to personalize your KRUSH feed.</p>
        <div style={{ color: selected.length === REQUIRED_INTERESTS ? C.green : C.pink }} className="text-xs font-bold mt-2 mb-4">
          {selected.length} of {REQUIRED_INTERESTS} selected
        </div>
        {warn && <div style={{ background: 'rgba(255,77,77,0.12)', color: C.red, border: `1px solid ${C.red}` }} className="text-xs font-semibold rounded-lg px-3 py-2 mb-4">{warn}</div>}
        <div className="grid grid-cols-2 gap-3">
          {INTEREST_OPTIONS.map(opt => {
            const active = selected.includes(opt.id);
            return (
              <button key={opt.id} onClick={() => toggle(opt.id)}
                style={{
                  background: active ? `linear-gradient(135deg, ${C.blue}, ${C.pink})` : C.surface,
                  border: active ? `2px solid ${C.pink}` : `1px solid ${C.surface2}`,
                  transform: active ? 'scale(1.02)' : 'scale(1)',
                }}
                className="rounded-2xl p-4 flex flex-col items-center gap-2 transition-transform">
                <span className="text-3xl">{opt.emoji}</span>
                <span style={{ color: active ? 'white' : C.paper }} className="text-sm font-bold text-center">{opt.label}</span>
                {active && <span style={{ background: 'rgba(255,255,255,0.25)', color: 'white' }} className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><Zap size={10} /> Selected</span>}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ background: C.ink, borderTop: `1px solid ${C.surface2}` }} className="px-6 py-4 sticky bottom-0">
        <button onClick={() => ready && onContinue(selected)} disabled={!ready}
          style={{ background: ready ? `linear-gradient(90deg, ${C.blue}, ${C.pink})` : C.surface2, color: ready ? 'white' : C.muted }}
          className="w-full font-bold py-3 rounded-xl">
          {ready ? 'Continue to My Feed' : `Pick ${REQUIRED_INTERESTS - selected.length} more to continue`}
        </button>
      </div>
    </div>
  );
}
function LogInScreen({ onBack, onLogin, findUser }) {
  const [username, setUsername] = useState(''); const [err, setErr] = useState('');
  return (
    <div style={{ background: C.ink }} className="h-full flex flex-col">
      <TopBar onBack={onBack} />
      <div className="px-6 pt-6 flex-1">
        <h2 style={{ color: C.paper }} className="text-xl font-black mb-1">Welcome back</h2>
        <p style={{ color: C.muted }} className="text-xs mb-5">Test login — enter the username you signed up with.</p>
        <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} style={{ background: C.surface, color: C.paper, border: `1px solid ${C.surface2}` }} className="rounded-lg px-4 py-3 text-sm outline-none w-full" />
        {err && <div style={{ color: C.red }} className="text-xs mt-2">{err}</div>}
        <button onClick={async () => { const u = await findUser(username.trim()); u ? onLogin(u) : setErr('No test account with that username yet — try Sign Up.'); }} style={{ background: C.blue, color: 'white' }} className="w-full font-bold py-3 rounded-xl mt-6">Log In</button>
      </div>
    </div>
  );
}

// ---------- COMPETITION CARD ----------
function CompCard({ comp, onOpen }) {
  const [stats, setStats] = useState(() => {
    const mock = mockEntriesFor(comp.id);
    return { entryCount: mock.length, prizePot: mock.length * ENTRY_FEE_STANDARD };
  });
  useEffect(() => {
    (async () => {
      const entries = await getEffectiveEntries(comp.id);
      const pot = entries.reduce((s, e) => s + (typeof e.feePaid === 'number' ? e.feePaid : ENTRY_FEE_STANDARD), 0);
      setStats({ entryCount: entries.length, prizePot: pot });
    })();
  }, [comp.id, comp.status]);
  const { entryCount, prizePot } = stats;
  const open = comp.status !== 'ended';
  const liveCountdown = useCountdown(comp.endsAt, open && !!comp.countdownStartedAt);
  const countdown = comp.countdownStartedAt ? liveCountdown : (comp.status === 'ended' ? 'Ended' : entryCount >= 1 ? 'Waiting for a challenger' : 'Open for entries');
  const isFlagship = comp.title === FLAGSHIP_TITLE;
  const full = entryCount >= (comp.maxSpots || MAX_SPOTS);
  return (
    <button onClick={() => onOpen(comp)} style={{ background: C.surface, borderLeft: `4px solid ${!open ? C.amber : full ? C.red : (isFlagship ? C.pink : C.blue)}` }} className="rounded-xl p-4 w-full text-left flex flex-col gap-1.5">
      <div className="flex items-center justify-between flex-wrap gap-1">
        <span style={{ background: !open ? 'rgba(255,176,32,0.15)' : full ? 'rgba(255,77,77,0.15)' : 'rgba(46,91,255,0.15)', color: !open ? C.amber : full ? C.red : C.blue }} className="text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide">
          {!open ? 'Results Ready' : full ? 'Competition Full' : comp.countdownStartedAt ? 'Competition Live' : 'Waiting'}
        </span>
        <TestTag text="CUSTOMER DISCOVERY TEST" />
      </div>
      <div className="text-2xl">{CAT_EMOJI[comp.category]}</div>
      <div style={{ color: C.paper }} className="font-bold text-base">{comp.title}</div>
      <div style={{ color: C.muted }} className="text-xs">{comp.category}</div>
      <div className="flex items-center gap-3 flex-wrap text-xs">
        <span style={{ color: C.paper }} className="font-semibold">{entryCount} of {comp.maxSpots || MAX_SPOTS} spots</span>
        <span style={{ color: C.amber }} className="font-semibold">${prizePot} pot</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: open ? C.pink : C.muted }}><Clock size={13} /> {countdown}</div>
    </button>
  );
}

// ---------- CREDIT VOTE MODAL ----------
const REPORT_REASONS = ['Harassment/Bullying', 'Spam', 'Hate/Inappropriate Content', 'Sexual/Inappropriate Content', 'Threats/Violence', 'Other'];

function CommentRow({ c, replies, expanded, onToggleExpand, liked, onToggleLike, onReply, onEdit, onDelete, onReport, isOwn, canReply }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="flex gap-2">
      <div style={{ background: C.surface2 }} className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0">{c.avatar || '🙂'}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span style={{ color: C.paper }} className="text-xs font-bold">@{c.username}</span>
          <span style={{ color: C.muted }} className="text-[10px]">{c.minutesAgo != null ? `${c.minutesAgo}m ago` : 'just now'}{c.isEdited ? ' · edited' : ''}</span>
          {isOwn && !c.deleted && (
            <div className="relative ml-auto">
              <button onClick={() => setMenuOpen(o => !o)} style={{ color: C.muted }} className="text-xs font-bold px-1">•••</button>
              {menuOpen && (
                <div style={{ background: C.surface2 }} className="absolute right-0 top-5 rounded-lg overflow-hidden z-10 shadow-lg">
                  <button onClick={() => { setMenuOpen(false); onEdit(c); }} style={{ color: C.paper }} className="block w-full text-left text-xs font-semibold px-4 py-2 whitespace-nowrap">Edit</button>
                  <button onClick={() => { setMenuOpen(false); onDelete(c); }} style={{ color: C.red }} className="block w-full text-left text-xs font-semibold px-4 py-2 whitespace-nowrap">Delete</button>
                </div>
              )}
            </div>
          )}
        </div>
        <div style={{ color: c.deleted ? C.muted : C.paper }} className={`text-sm ${c.deleted ? 'italic' : ''}`}>{c.text}</div>
        {!c.deleted && (
          <div className="flex items-center gap-3 mt-1">
            <button onClick={() => onToggleLike(c)} style={{ color: liked ? C.pink : C.muted }} className="text-[10px] font-bold flex items-center gap-1"><Heart size={11} fill={liked ? C.pink : 'none'} /> {(c.likes || 0) + (liked ? 1 : 0)}</button>
            {canReply && <button onClick={() => onReply(c)} style={{ color: C.muted }} className="text-[10px] font-bold">Reply</button>}
            {!isOwn && <button onClick={() => onReport(c)} style={{ color: C.muted }} className="text-[10px] font-bold">Report</button>}
          </div>
        )}
        {canReply && replies.length > 0 && (
          <button onClick={() => onToggleExpand(c.id)} style={{ color: C.blue }} className="text-[10px] font-bold mt-1.5 block">{expanded ? 'Hide Replies' : `View ${replies.length} repl${replies.length === 1 ? 'y' : 'ies'}`}</button>
        )}
        {canReply && expanded && replies.length > 0 && (
          <div className="flex flex-col gap-3 mt-2 pl-3" style={{ borderLeft: `2px solid ${C.surface2}` }}>
            {replies.map(r => (
              <CommentRow key={r.id} c={r} replies={[]} expanded={false} onToggleExpand={() => {}} liked={false} onToggleLike={onToggleLike}
                onReply={onReply} onEdit={onEdit} onDelete={onDelete} onReport={onReport} isOwn={r.isOwnOverride} canReply={false} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CommentsSheet({ targetId, targetLabel, user, onClose, onToast }) {
  const [comments, setComments] = useState([]);
  const [draft, setDraft] = useState('');
  const [composer, setComposer] = useState({ mode: 'default' }); // default | reply | editComment | editReply
  const [liked, setLiked] = useState({});
  const [expanded, setExpanded] = useState({});
  const [reportFor, setReportFor] = useState(null);
  const [deleteFor, setDeleteFor] = useState(null);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef(null);

  const load = async () => {
    setLoading(true);
    const mock = mockCommentsFor(targetId).map(c => ({ ...c, at: Date.now() - c.minutesAgo * 60000, mock: true, parentCommentId: null }));
    const mem = getMemoryComments(targetId);
    let real = [];
    try { real = await sGetMany(await sList(`comment:${targetId}:`, true), true); } catch { real = []; }
    const byId = {};
    for (const c of mock) byId[c.id] = c;
    for (const c of mem) byId[c.id] = c;
    for (const c of real) byId[c.id] = c; // storage wins if it actually has a copy — freshest across full reloads
    const all = Object.values(byId).sort((a, b) => a.at - b.at);
    setComments(all);
    const likeMap = {};
    for (const c of all) {
      if (memoryLikeStore[c.id]?.[user.username] !== undefined) { likeMap[c.id] = memoryLikeStore[c.id][user.username]; continue; }
      try { likeMap[c.id] = !!(await sGet(`commentlike:${c.id}:${user.username}`, true)); } catch { likeMap[c.id] = false; }
    }
    setLiked(likeMap);
    setLoading(false);
  };
  useEffect(() => { load(); }, [targetId]);

  const resetComposer = () => { setComposer({ mode: 'default' }); setDraft(''); };

  const startReply = (c) => { setComposer({ mode: 'reply', parentId: c.id, parentUsername: c.username }); setDraft(''); inputRef.current?.focus(); };
  const startEdit = (c) => { setComposer({ mode: c.parentCommentId ? 'editReply' : 'editComment', commentId: c.id }); setDraft(c.text); inputRef.current?.focus(); };

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    if (composer.mode === 'editComment' || composer.mode === 'editReply') {
      const commentId = composer.commentId;
      const existing = comments.find(c => c.id === commentId);
      if (!existing || existing.mock) { onToast("Built-in demo comments can't be edited."); resetComposer(); return; }
      const updated = { ...existing, text, body: text, updatedAt: Date.now(), isEdited: true };
      // 1) update live UI immediately, 2) commit to the in-memory store, 3) best-effort persist — in that order,
      // so the edit is visible right away even if the storage write is slow or fails.
      setComments(prev => prev.map(c => (c.id === commentId ? updated : c)));
      putMemoryComment(targetId, updated);
      sSet(`comment:${targetId}:${commentId}`, updated, true);
      resetComposer();
    } else {
      const id = uid();
      const parentCommentId = composer.mode === 'reply' ? composer.parentId : null;
      const newComment = {
        id, contentId: targetId, authorUsername: user.username, username: user.username,
        avatar: user.avatar, authorAvatar: user.avatar, body: text, text,
        createdAt: Date.now(), at: Date.now(), updatedAt: null, isEdited: false, parentCommentId, likes: 0,
      };
      setComments(prev => [...prev, newComment]);
      putMemoryComment(targetId, newComment);
      sSet(`comment:${targetId}:${id}`, newComment, true);
      if (parentCommentId) setExpanded(prev => ({ ...prev, [parentCommentId]: true }));
      resetComposer();
    }
  };
  const toggleLike = (c) => {
    const now = !liked[c.id];
    setLiked(prev => ({ ...prev, [c.id]: now }));
    memoryLikeStore[c.id] = { ...(memoryLikeStore[c.id] || {}), [user.username]: now };
    sSet(`commentlike:${c.id}:${user.username}`, now, true);
  };
  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  const requestDelete = (c) => {
    if (c.mock) { onToast("Built-in demo comments can't be deleted."); return; }
    setDeleteFor(c);
  };
  const confirmDelete = () => {
    const c = deleteFor; setDeleteFor(null);
    const hasReplies = comments.some(x => x.parentCommentId === c.id);
    if (!c.parentCommentId && hasReplies) {
      // Top-level comment with replies: keep the thread intact, just mark this comment deleted.
      const updated = { ...c, text: 'Comment deleted', body: 'Comment deleted', deleted: true, updatedAt: Date.now() };
      setComments(prev => prev.map(x => (x.id === c.id ? updated : x)));
      putMemoryComment(targetId, updated);
      sSet(`comment:${targetId}:${c.id}`, updated, true);
    } else {
      setComments(prev => prev.filter(x => x.id !== c.id));
      removeMemoryComment(targetId, c.id);
      sDelete(`comment:${targetId}:${c.id}`, true);
    }
    onToast('Comment deleted.');
  };
  const submitReport = async () => {
    setReportFor(null);
    onToast("Thanks. We've received your report.");
  };

  const topLevel = comments.filter(c => !c.parentCommentId);
  const repliesFor = (id) => comments.filter(c => c.parentCommentId === id);
  const totalCount = comments.length;

  const composerLabel = composer.mode === 'reply' ? `Replying to @${composer.parentUsername}`
    : composer.mode === 'editComment' ? 'Editing comment'
    : composer.mode === 'editReply' ? 'Editing reply'
    : null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: C.ink }} onClick={e => e.stopPropagation()}>
      <TopBar title={`Comments (${totalCount}) · ${targetLabel}`} onBack={onClose} />
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-3">
        {loading ? <Spinner /> : topLevel.length === 0 ? <EmptyState text="No comments yet — be the first." /> : (
          <div className="flex flex-col gap-3">
            {topLevel.map(c => (
              <CommentRow key={c.id} c={c} replies={repliesFor(c.id).map(r => ({ ...r, isOwnOverride: !r.mock && r.username === user.username }))}
                expanded={!!expanded[c.id]} onToggleExpand={toggleExpand}
                liked={!!liked[c.id]} onToggleLike={toggleLike}
                onReply={startReply} onEdit={startEdit} onDelete={requestDelete} onReport={(cm) => setReportFor(cm.id)}
                isOwn={!c.mock && c.username === user.username} canReply={true} />
            ))}
          </div>
        )}
      </div>
      {composerLabel && (
        <div style={{ background: C.surface2, color: C.muted }} className="px-4 py-1.5 text-xs flex items-center justify-between">
          <span>{composerLabel}</span>
          <button onClick={resetComposer} style={{ color: C.paper }}>✕ Cancel</button>
        </div>
      )}
      <div style={{ background: C.surface, borderTop: `1px solid ${C.surface2}` }} className="px-4 py-3 flex items-center gap-2">
        <input ref={inputRef} value={draft} onChange={e => setDraft(e.target.value)} placeholder={composer.mode === 'default' ? 'Add a comment...' : draft ? undefined : composerLabel}
          style={{ background: C.surface2, color: C.paper, border: 'none' }} className="flex-1 rounded-full px-4 py-2.5 text-sm outline-none" />
        <button onClick={submit} style={{ background: C.pink, color: 'white' }} className="font-bold px-4 py-2.5 rounded-full text-sm">
          {composer.mode === 'reply' ? 'Post Reply' : (composer.mode === 'editComment' || composer.mode === 'editReply') ? 'Save' : 'Post'}
        </button>
      </div>
      {reportFor && (
        <div className="fixed inset-0 z-[110] flex items-end" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setReportFor(null)}>
          <div style={{ background: C.surface }} onClick={e => e.stopPropagation()} className="w-full rounded-t-2xl p-6">
            <div style={{ color: C.paper }} className="font-bold mb-3">Report this comment</div>
            <div className="flex flex-col gap-2">
              {REPORT_REASONS.map(r => (
                <button key={r} onClick={submitReport} style={{ background: C.surface2, color: C.paper }} className="text-left text-sm px-4 py-2.5 rounded-lg">{r}</button>
              ))}
            </div>
          </div>
        </div>
      )}
      {deleteFor && (
        <div className="fixed inset-0 z-[110] flex items-end" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setDeleteFor(null)}>
          <div style={{ background: C.surface }} onClick={e => e.stopPropagation()} className="w-full rounded-t-2xl p-6">
            <div style={{ color: C.paper }} className="font-bold mb-1">{deleteFor.parentCommentId ? 'Delete reply?' : 'Delete comment?'}</div>
            <div style={{ color: C.muted }} className="text-sm mb-4">This will remove your {deleteFor.parentCommentId ? 'reply' : 'comment'}.</div>
            <button onClick={confirmDelete} style={{ background: C.red, color: 'white' }} className="w-full font-bold py-3 rounded-xl mb-2">Delete</button>
            <button onClick={() => setDeleteFor(null)} style={{ color: C.muted, border: `1px solid ${C.surface2}` }} className="w-full font-bold py-3 rounded-xl text-sm">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ShareSheet({ item, user, onClose, onToast }) {
  const [reposting, setReposting] = useState(false);
  const [repostMsg, setRepostMsg] = useState("Y'all gotta see this 🔥");
  const link = `https://krush.app/c/${item.id}`;
  const shareText = `Hey, look what I just found on KRUSH 🔥 ${item.compTitle ? `@${item.username} is competing in ${item.compTitle}. ` : ''}${link}`;

  const copyLink = () => {
    if (navigator.clipboard) navigator.clipboard.writeText(link);
    onToast('Link copied (simulated deep link).');
  };
  const nativeShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: 'KRUSH', text: shareText, url: link }); }
      catch { /* user cancelled — no toast needed */ }
    } else {
      onToast("Native sharing isn't available in this browser — try Copy Link instead.");
    }
  };
  const submitRepost = async () => {
    const id = uid();
    await sSet(`repost:${id}`, { id, repostedBy: user.username, originalUsername: item.username, originalCaption: item.caption, originalId: item.id, compTitle: item.compTitle || null, message: repostMsg.trim(), at: Date.now() }, true);
    onToast('Reposted to your KRUSH profile.');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div style={{ background: C.surface }} onClick={e => e.stopPropagation()} className="w-full rounded-t-2xl p-6">
        {!reposting ? (
          <>
            <div style={{ color: C.paper }} className="font-bold mb-1">Share</div>
            <div style={{ color: C.muted }} className="text-xs mb-4">@{item.username}{item.compTitle ? ` · ${item.compTitle}` : ''}</div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button onClick={copyLink} style={{ background: C.surface2, color: C.paper }} className="text-xs font-bold py-3 rounded-lg">Copy Link</button>
              <button onClick={nativeShare} style={{ background: C.surface2, color: C.paper }} className="text-xs font-bold py-3 rounded-lg">Text / Social Share</button>
            </div>
            <button onClick={() => setReposting(true)} style={{ background: C.pink, color: 'white' }} className="w-full font-bold py-3 rounded-lg text-xs mb-2">Repost to My KRUSH</button>
            <button onClick={onClose} style={{ color: C.muted }} className="w-full text-xs font-semibold py-2">Cancel</button>
          </>
        ) : (
          <>
            <div style={{ color: C.paper }} className="font-bold mb-1">Repost to My KRUSH</div>
            <div style={{ background: C.surface2 }} className="rounded-lg p-3 mb-3">
              <div style={{ color: C.muted }} className="text-[10px] mb-1">Original creator</div>
              <div style={{ color: C.paper }} className="text-sm font-semibold">@{item.username}</div>
              <div style={{ color: C.muted }} className="text-xs truncate">{item.caption}</div>
            </div>
            <textarea value={repostMsg} onChange={e => setRepostMsg(e.target.value)} rows={2} style={{ background: C.surface2, color: C.paper, border: 'none' }} className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none mb-3" />
            <button onClick={submitRepost} style={{ background: C.pink, color: 'white' }} className="w-full font-bold py-3 rounded-lg text-sm mb-2">Post Repost</button>
            <button onClick={() => setReposting(false)} style={{ color: C.muted }} className="w-full text-xs font-semibold py-2">Back</button>
          </>
        )}
      </div>
    </div>
  );
}

function CreditVoteModal({ entry, remaining, onConfirm, onClose }) {
  const [amt, setAmt] = useState(1);
  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div style={{ background: C.surface }} onClick={e => e.stopPropagation()} className="w-full rounded-t-2xl p-6">
        <div style={{ color: C.paper }} className="font-bold mb-1">Use Voting Credits</div>
        <div style={{ color: C.muted }} className="text-xs mb-4">Give extra votes to @{entry.username}. 1 credit = 1 vote. {remaining} credit{remaining === 1 ? '' : 's'} left.</div>
        <div className="flex items-center justify-center gap-4 mb-4">
          <button onClick={() => setAmt(a => Math.max(1, a - 1))} style={{ background: C.surface2, color: C.paper }} className="w-10 h-10 rounded-full font-bold text-lg">–</button>
          <span style={{ color: C.paper }} className="text-2xl font-black w-10 text-center">{amt}</span>
          <button onClick={() => setAmt(a => Math.min(remaining, a + 1))} style={{ background: C.surface2, color: C.paper }} className="w-10 h-10 rounded-full font-bold text-lg">+</button>
        </div>
        <div className="mb-2"><TestTag text="DEMO CREDITS — NO REAL MONEY" /></div>
        <button onClick={() => onConfirm(amt)} style={{ background: C.pink, color: 'white' }} className="w-full font-bold py-3 rounded-xl mt-3">Vote with {amt} Credit{amt === 1 ? '' : 's'}</button>
      </div>
    </div>
  );
}

// ---------- ENTRY ROW ----------
function EntryRow({ entry, content, voteTotal, isSelf, live, freeVoteUsed, credits, onFreeVote, onOpenCredits, onComment, onShare, onOpenViewer, refreshTick }) {
  const [commentCount, setCommentCount] = useState(() => mockCommentsFor(entry.id).length);
  useEffect(() => { countTopLevelComments(entry.id).then(setCommentCount); }, [entry.id, refreshTick]);
  return (
    <div style={{ background: C.surface }} className="rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <button onClick={() => onOpenViewer && onOpenViewer(entry)} aria-label="Open video" className="relative w-16 h-16 rounded-lg flex-shrink-0 overflow-hidden" style={{ background: C.surface2 }}>
          {content?.videoUrl ? (
            <video src={`${content.videoUrl}#t=0.1`} preload="metadata" muted playsInline className="w-full h-full object-cover pointer-events-none" />
          ) : (
            <span className="w-full h-full flex items-center justify-center text-2xl">{content?.kind === 'photo' ? '🖼️' : '🎬'}</span>
          )}
          <span className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.25)' }}><span style={{ color: 'white' }} className="text-lg">▶</span></span>
        </button>
        <div className="flex-1 min-w-0">
          <div style={{ color: C.paper }} className="font-semibold text-sm truncate">@{entry.username}{isSelf && <span style={{ color: C.muted }} className="font-normal"> (you)</span>}</div>
          {content?.title && <div style={{ color: C.paper }} className="text-xs font-medium truncate">{content.title}</div>}
          <div style={{ color: C.muted }} className="text-xs truncate">{content?.caption}</div>
          <div style={{ color: C.paper }} className="text-xs font-bold mt-0.5">{voteTotal} vote{voteTotal === 1 ? '' : 's'}</div>
        </div>
        {isSelf ? <span style={{ color: C.muted }} className="text-[10px] font-semibold px-2">Your entry</span> : !live ? (
          <span style={{ color: C.muted }} className="text-[10px] font-semibold px-2 text-center">Voting has ended<br />for this competition</span>
        ) : !freeVoteUsed ? (
          <button onClick={() => onFreeVote(entry)} style={{ background: C.pink, color: 'white' }} className="flex flex-col items-center justify-center px-3 py-2 rounded-lg flex-shrink-0">
            <Heart size={16} /><span className="text-[10px] font-bold mt-0.5">Free Vote</span>
          </button>
        ) : credits > 0 ? (
          <button onClick={() => onOpenCredits(entry)} style={{ background: 'rgba(255,46,126,0.15)', color: C.pink }} className="flex flex-col items-center justify-center px-3 py-2 rounded-lg flex-shrink-0">
            <Zap size={16} /><span className="text-[10px] font-bold mt-0.5">Use Credits</span>
          </button>
        ) : (
          <span style={{ color: C.muted }} className="text-[10px] font-semibold px-2 text-center">No credits<br />left</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => onComment(entry)} style={{ background: C.surface2, color: C.paper }} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold">💬 {commentCount}</button>
        <button onClick={() => onShare(entry)} style={{ background: C.surface2, color: C.paper }} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold">↗ Share</button>
      </div>
    </div>
  );
}

// ---------- FULL-SCREEN VERTICAL VIDEO VIEWER ----------
// Reuses the competition's existing vote / comment / share handlers (passed in) — it creates no vote or
// comment records of its own. Order is frozen when opened so swiping isn't scrambled by live vote re-sorting.
function FeedItemMeta({ entryId, refreshTick, children }) {
  const [n, setN] = useState(() => mockCommentsFor(entryId).length);
  useEffect(() => { countTopLevelComments(entryId).then(setN); }, [entryId, refreshTick]);
  return children(n);
}
function FeedVideo({ url, active, near, muted }) {
  const ref = useRef(null);
  const [paused, setPaused] = useState(false);
  const [failed, setFailed] = useState(false);
  const [buffering, setBuffering] = useState(true);
  useEffect(() => {
    const v = ref.current; if (!v) return;
    if (active) {
      v.muted = muted;
      const p = v.play(); if (p && p.catch) p.catch(() => setPaused(true)); // autoplay blocked -> user taps to play
    } else { v.pause(); try { v.currentTime = 0; } catch {} setPaused(false); }
  }, [active]);
  useEffect(() => { if (ref.current) ref.current.muted = muted; }, [muted]);
  const toggle = () => {
    const v = ref.current; if (!v) return;
    if (v.paused) { v.play().then(() => setPaused(false)).catch(() => setPaused(true)); } else { v.pause(); setPaused(true); }
  };
  if (!near) return <div className="absolute inset-0 flex items-center justify-center" style={{ background: '#000' }}><span className="text-4xl">🎬</span></div>;
  if (failed) return <div className="absolute inset-0 flex flex-col items-center justify-center gap-2" style={{ background: '#000', color: C.muted }}><span className="text-4xl">⚠️</span><span className="text-xs px-8 text-center">This video couldn't be played. Check your connection and try again.</span><button onClick={() => { setFailed(false); setBuffering(true); }} style={{ background: C.surface2, color: C.paper }} className="px-4 py-2 rounded-lg text-xs font-bold">Retry</button></div>;
  return (
    <div className="absolute inset-0" style={{ background: '#000' }} onClick={toggle}>
      <video ref={ref} src={url} loop playsInline muted={muted} preload={active ? 'auto' : 'metadata'}
        onError={() => setFailed(true)} onWaiting={() => setBuffering(true)} onCanPlay={() => setBuffering(false)} onPlaying={() => { setBuffering(false); setPaused(false); }}
        className="w-full h-full" style={{ objectFit: 'contain' }} />
      {active && buffering && !paused && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} /></div>}
      {paused && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><span style={{ background: 'rgba(0,0,0,0.5)', color: 'white' }} className="w-16 h-16 rounded-full flex items-center justify-center text-3xl">▶</span></div>}
    </div>
  );
}
function VideoFeedViewer({ order, startIndex, entries, contents, voteTotals, comp, user, live, freeVoteUsed, credits, statusText, commentsTick, onFreeVote, onOpenCredits, onComment, onShare, onClose }) {
  const items = order.map(id => entries.find(e => e.id === id)).filter(Boolean);
  const scroller = useRef(null);
  const [active, setActive] = useState(startIndex);
  const [muted, setMuted] = useState(true); // browsers only allow autoplay when muted; user can unmute with one tap
  const [avatars, setAvatars] = useState({});
  useEffect(() => {
    const el = scroller.current; if (!el) return;
    el.scrollTop = startIndex * el.clientHeight;
  }, []);
  useEffect(() => {
    (async () => {
      const m = {};
      for (const e of items) { const u = await sGet(`user:${e.username}`, true); if (u?.avatar && typeof u.avatar === 'string' && u.avatar.length <= 8) m[e.username] = u.avatar; }
      setAvatars(m);
    })();
  }, [order.join(',')]);
  const onScroll = () => {
    const el = scroller.current; if (!el || !el.clientHeight) return;
    const i = Math.round(el.scrollTop / el.clientHeight);
    if (i !== active && i >= 0 && i < items.length) setActive(i);
  };
  return (
    <div className="fixed inset-0 z-40 flex flex-col" style={{ background: '#000' }}>
      <div ref={scroller} onScroll={onScroll} className="absolute inset-0 overflow-y-scroll" style={{ scrollSnapType: 'y mandatory', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}>
        {items.map((e, i) => {
          const c = contents[e.contentId];
          const isSelf = e.username === user.username;
          return (
            <div key={e.id} className="relative w-full" style={{ height: '100%', minHeight: '100%', scrollSnapAlign: 'start', scrollSnapStop: 'always' }}>
              {c?.videoUrl ? <FeedVideo url={c.videoUrl} active={i === active} near={Math.abs(i - active) <= 1} muted={muted} />
                : <div className="absolute inset-0 flex flex-col items-center justify-center gap-3" style={{ background: `linear-gradient(160deg, ${C.surface2}, ${C.ink})` }}><span className="text-6xl">🎬</span><span style={{ color: C.muted }} className="text-xs px-10 text-center">Demo entry — no video attached</span></div>}
              <div className="absolute left-0 right-0 bottom-0 pointer-events-none" style={{ height: '45%', background: 'linear-gradient(to top, rgba(0,0,0,0.75), rgba(0,0,0,0))' }} />
              <div className="absolute left-4 right-20 bottom-6 pointer-events-none">
                <div className="flex items-center gap-2 mb-1">
                  <span style={{ background: C.surface2 }} className="w-9 h-9 rounded-full flex items-center justify-center text-lg">{avatars[e.username] || '🙂'}</span>
                  <span style={{ color: 'white' }} className="font-bold text-sm">@{e.username}{isSelf && ' (you)'}</span>
                </div>
                {c?.caption && <div style={{ color: 'white' }} className="text-sm mb-1 line-clamp-2">{c.caption}</div>}
                <div className="flex items-center gap-2 flex-wrap">
                  <span style={{ background: 'rgba(46,91,255,0.85)', color: 'white' }} className="text-[10px] font-bold px-2 py-0.5 rounded-full">{CAT_EMOJI[comp.category]} {comp.category}</span>
                  <span style={{ background: 'rgba(0,0,0,0.55)', color: C.pink }} className="text-[10px] font-bold px-2 py-0.5 rounded-full">{statusText}</span>
                </div>
              </div>
              <FeedItemMeta entryId={e.id} refreshTick={commentsTick}>{(n) => (
                <div className="absolute right-3 bottom-8 flex flex-col items-center gap-4">
                  <div className="flex flex-col items-center">
                    {isSelf ? <span style={{ background: 'rgba(0,0,0,0.55)', color: C.muted }} className="w-12 h-12 rounded-full flex items-center justify-center text-[9px] font-bold text-center leading-tight">Your<br />entry</span>
                      : !live ? <span style={{ background: 'rgba(0,0,0,0.55)', color: C.muted }} className="w-12 h-12 rounded-full flex items-center justify-center text-[9px] font-bold text-center leading-tight">Voting<br />ended</span>
                      : !freeVoteUsed ? <button onClick={() => onFreeVote(e)} style={{ background: C.pink, color: 'white' }} className="w-12 h-12 rounded-full flex items-center justify-center"><Heart size={22} /></button>
                      : credits > 0 ? <button onClick={() => onOpenCredits(e)} style={{ background: 'rgba(255,46,126,0.85)', color: 'white' }} className="w-12 h-12 rounded-full flex items-center justify-center"><Zap size={22} /></button>
                      : <span style={{ background: 'rgba(0,0,0,0.55)', color: C.muted }} className="w-12 h-12 rounded-full flex items-center justify-center text-[9px] font-bold text-center leading-tight">No<br />credits</span>}
                    <span style={{ color: 'white' }} className="text-xs font-bold mt-1">{voteTotals[e.id] || 0}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <button onClick={() => onComment(e)} style={{ background: 'rgba(0,0,0,0.55)', color: 'white' }} className="w-12 h-12 rounded-full flex items-center justify-center text-xl">💬</button>
                    <span style={{ color: 'white' }} className="text-xs font-bold mt-1">{n}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <button onClick={() => onShare(e)} style={{ background: 'rgba(0,0,0,0.55)', color: 'white' }} className="w-12 h-12 rounded-full flex items-center justify-center text-xl">↗</button>
                    <span style={{ color: 'white' }} className="text-xs font-bold mt-1">Share</span>
                  </div>
                </div>
              )}</FeedItemMeta>
            </div>
          );
        })}
      </div>
      <button onClick={onClose} aria-label="Close" style={{ background: 'rgba(0,0,0,0.55)', color: 'white', top: 'max(12px, env(safe-area-inset-top))' }} className="absolute left-3 w-10 h-10 rounded-full flex items-center justify-center"><ChevronLeft size={22} /></button>
      <button onClick={() => setMuted(m => !m)} aria-label={muted ? 'Unmute' : 'Mute'} style={{ background: 'rgba(0,0,0,0.55)', color: 'white', top: 'max(12px, env(safe-area-inset-top))' }} className="absolute right-3 h-10 px-3 rounded-full flex items-center justify-center text-xs font-bold">{muted ? '🔇 Tap for sound' : '🔊'}</button>
      <div style={{ color: 'rgba(255,255,255,0.7)', top: 'max(20px, calc(env(safe-area-inset-top) + 8px))' }} className="absolute left-0 right-0 text-center text-xs font-semibold pointer-events-none">{active + 1} / {items.length}</div>
    </div>
  );
}

// ---------- COMPETITION DETAIL ----------
function CompetitionDetail({ comp: compProp, user, onBack, onToast, onCompUpdated, initialIntent }) {
  const [comp, setComp] = useState(compProp);
  const [entries, setEntries] = useState([]);
  const [contents, setContents] = useState({});
  const [voteTotals, setVoteTotals] = useState({});
  const [freeVoteUsed, setFreeVoteUsed] = useState(false);
  const [credits, setCredits] = useState(STARTING_CREDITS);
  const [loading, setLoading] = useState(true);
  const [creditEntry, setCreditEntry] = useState(null);
  const [commentsFor, setCommentsFor] = useState(null);
  const [commentsTick, setCommentsTick] = useState(0);
  const closeComments = () => { setCommentsFor(null); setCommentsTick(t => t + 1); };
  const [shareForEntry, setShareForEntry] = useState(null);
  const [viewer, setViewer] = useState(null); // { order: [entryIds], startIndex }
  const [celebrate, setCelebrate] = useState(false);
  const [role, setRole] = useState(null); // null | 'viewer' | 'competitor'
  const [phase, setPhase] = useState('preview'); // preview | confirm | uploading | main
  const [lateAck, setLateAck] = useState(false);
  const [abandonOpen, setAbandonOpen] = useState(false);
  const [caption, setCaption] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const [videoFile, setVideoFile] = useState(null);
  const [videoLocalPreviewUrl, setVideoLocalPreviewUrl] = useState(null);
  const [videoDurationSec, setVideoDurationSec] = useState(null); // locally-probed duration — best-effort, cosmetic only
  const [confirmedDurationSec, setConfirmedDurationSec] = useState(null); // AUTHORITATIVE duration, from Cloudinary's own response
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState(null);
  const [uploadError, setUploadError] = useState('');
  // previewStatus is purely cosmetic (drives the local <video> preview + diagnostics) and
  // never blocks upload — a browser that can't preview a clip can often still upload it fine.
  const [videoMetaStatus, setVideoMetaStatus] = useState('idle'); // idle | reading | ok | error | timeout
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diag, setDiag] = useState(null);
  const uploadXhrRef = useRef(null);
  const probeRef = useRef(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [insufficientOpen, setInsufficientOpen] = useState(false);
  const [justFilled, setJustFilled] = useState(false);
  const [justEnded, setJustEnded] = useState(false);
  const [enteredSuccess, setEnteredSuccess] = useState(false);
  const [submittingEntry, setSubmittingEntry] = useState(false);
  const endTriggered = useRef(false);

  const prizePot = (list) => list.reduce((s, e) => s + (typeof e.feePaid === 'number' ? e.feePaid : ENTRY_FEE_STANDARD), 0);

  const finishCompetition = useCallback(async (liveComp, entryList) => {
    if (endTriggered.current) return;
    endTriggered.current = true;
    const totals = {};
    for (const e of entryList) totals[e.id] = await getVoteTotal(liveComp.id, e.id, e.baseVotes || 0);
    const ranked = [...entryList].sort((a, b) => (totals[b.id] || 0) - (totals[a.id] || 0));
    const top3 = ranked.slice(0, 3).map(e => e.id);
    const winnerEntry = ranked[0] || null;
    const pot = prizePot(entryList);
    const updated = { ...liveComp, status: 'ended', endedAt: Date.now(), winnerEntryId: winnerEntry?.id || null, top3 };
    await sSet(`comp:${liveComp.id}`, updated, true);
    if (winnerEntry) {
      const already = await sGet(`walletlog:${liveComp.id}`, true);
      if (!already) {
        const wallet = (await sGet(`wallet:${winnerEntry.username}`, true)) || { balance: 0 };
        await sSet(`wallet:${winnerEntry.username}`, { balance: wallet.balance + pot }, true);
        await sSet(`walletlog:${liveComp.id}`, { awardedTo: winnerEntry.username, amount: pot }, true);
      }
    }
    setComp(updated);
    onCompUpdated(updated);
  }, [onCompUpdated]);

  const hasLoadedRef = useRef(false);
  const load = useCallback(async () => {
    if (!hasLoadedRef.current) setLoading(true);
    const fresh = (await sGet(`comp:${comp.id}`, true)) || comp;
    const entryRecs = await getEffectiveEntries(fresh.id);
    setEntries(entryRecs);
    const cMap = {};
    for (const e of entryRecs) {
      if (cMap[e.contentId]) continue;
      cMap[e.contentId] = e.mockCaption ? mockContentFor(e) : await sGet(`content:${e.contentId}`, true);
    }
    setContents(cMap);

    if (fresh.status !== 'ended' && fresh.countdownStartedAt && Date.now() >= fresh.endsAt) {
      await finishCompetition(fresh, entryRecs);
      hasLoadedRef.current = true; setLoading(false);
      return;
    }
    // Activate the 24h countdown the moment a 2nd contestant is present (covers both new entries and older/migrated data)
    if (fresh.status !== 'ended' && !fresh.countdownStartedAt && entryRecs.length >= 2) {
      const now = Date.now();
      const activated = { ...fresh, status: 'live', countdownStartedAt: now, endsAt: now + COMPETITION_DURATION_MS };
      await sSet(`comp:${fresh.id}`, activated, true);
      setComp(activated);
      onCompUpdated(activated);
    } else {
      setComp(fresh);
    }

    const totals = {};
    for (const e of entryRecs) totals[e.id] = await getVoteTotal(fresh.id, e.id, e.baseVotes || 0);
    setVoteTotals(totals);

    const fv = await sGet(`freevote:${fresh.id}:${user.username}`, true);
    setFreeVoteUsed(!!fv);
    let cr = await sGet(`credits:${fresh.id}:${user.username}`, true);
    if (!cr) { cr = { remaining: STARTING_CREDITS }; await sSet(`credits:${fresh.id}:${user.username}`, cr, true); }
    setCredits(cr.remaining);

    const roleRec = await sGet(`role:${fresh.id}:${user.username}`, true);
    setRole(roleRec?.role || null);
    if (fresh.status === 'ended') { setPhase('main'); setCelebrate(true); }
    else if (roleRec?.role) setPhase('main');
    else if (initialIntent === 'compete') setPhase('confirmCompete');
    else if (initialIntent === 'viewer') setPhase('confirmViewer');
    else setPhase('preview');

    hasLoadedRef.current = true; setLoading(false);
  }, [comp.id, user.username, finishCompetition, initialIntent]);

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (phase !== 'main' || comp.status === 'ended') return;
    // Skip the background refresh entirely while the screen is backgrounded/locked —
    // no point burning storage reads and battery for a tab nobody is looking at.
    const t = setInterval(() => { if (document.visibilityState !== 'hidden') load(); }, 9000);
    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVisible); };
  }, [phase]);

  const castFreeVote = async (entry) => {
    if (comp.status === 'ended') return;
    await sSet(`freevote:${comp.id}:${user.username}`, { entryId: entry.id, at: Date.now() }, true);
    const key = `voteamt:${comp.id}:${entry.id}:${user.username}`;
    const existing = (await sGet(key, true)) || 0;
    await sSet(key, existing + 1, true);
    onToast('✓ Your vote has been counted');
    load();
  };
  const confirmCreditVote = async (amount) => {
    const entry = creditEntry;
    setCreditEntry(null);
    const key = `voteamt:${comp.id}:${entry.id}:${user.username}`;
    const existing = (await sGet(key, true)) || 0;
    await sSet(key, existing + amount, true);
    const newRemaining = credits - amount;
    await sSet(`credits:${comp.id}:${user.username}`, { remaining: newRemaining }, true);
    onToast(`✓ Vote counted — used ${amount} credit${amount === 1 ? '' : 's'}. Test credits only, no real money.`);
    load();
  };

  const chooseViewer = async () => {
    await sSet(`role:${comp.id}:${user.username}`, { role: 'viewer', at: Date.now() }, true);
    setRole('viewer');
    setPhase('main');
    onToast('You joined this competition as a viewer.');
    load();
  };
  const confirmCompeteChoice = () => {
    // Not persisted yet — the user is only a potential competitor until they finish paying AND uploading.
    setPhase('confirm');
  };
  const abandonAndWatch = async () => {
    setAbandonOpen(false);
    setCaption(''); setUploadProgress(0); setUploading(false); setUploadDone(false); setLateAck(false);
    cleanupVideoProbe();
    if (videoLocalPreviewUrl) URL.revokeObjectURL(videoLocalPreviewUrl);
    setVideoFile(null); setVideoLocalPreviewUrl(null); setVideoDurationSec(null); setConfirmedDurationSec(null); setUploadedVideoUrl(null); setUploadError(''); setVideoMetaStatus('idle');
    await sSet(`role:${comp.id}:${user.username}`, { role: 'viewer', at: Date.now() }, true);
    setRole('viewer');
    setPhase('main');
    onToast('You joined this competition as a viewer.');
    load();
  };
  const goToConfirmViewer = () => setPhase('confirmViewer');
  const goToCompete = () => {
    if (entries.some(e => e.username === user.username)) { onToast("You're already competing in this competition."); setPhase('main'); return; }
    if (entries.length >= (comp.maxSpots || MAX_SPOTS)) { onToast('This competition is full — you can still Watch & Vote.'); return; }
    if (comp.status === 'ended') { onToast('This competition has ended.'); return; }
    setPhase('confirmCompete');
  };
  const startUpload = () => {
    if (comp.countdownStartedAt && !lateAck) return;
    setPhase('uploading');
  };
  // Tears down any in-flight metadata probe (timeout + listeners) so a stale probe
  // from a previous file can never fire into current state after the user moves on.
  const cleanupVideoProbe = () => {
    if (probeRef.current) {
      clearTimeout(probeRef.current.timeoutId);
      try {
        probeRef.current.probe.removeAttribute('src');
        probeRef.current.probe.load();
      } catch {}
      probeRef.current = null;
    }
  };
  useEffect(() => () => {
    // Unmount cleanup: never leave a probe, timeout, or blob URL alive after leaving this screen.
    cleanupVideoProbe();
    if (videoLocalPreviewUrl) URL.revokeObjectURL(videoLocalPreviewUrl);
  }, []);

  // previewStatus is COSMETIC ONLY now. A browser that can't decode a clip for local
  // <video> preview can often still upload the original File object fine — so a failed
  // or stalled preview no longer blocks Start Upload. The only authoritative duration
  // check happens after Cloudinary has actually processed the file (see xhr.onload below),
  // because that's a real server-side read of the file, not a guess from a sandboxed
  // browser video element.
  const probeVideoMetadata = (file, localUrl) => {
    cleanupVideoProbe();
    setVideoMetaStatus('reading');
    const startedAt = performance.now();
    setDiag(d => ({
      ...(d || {}),
      fileName: file.name, fileExt: (file.name.split('.').pop() || '').toLowerCase(),
      mimeType: file.type || '(empty)', fileSizeBytes: file.size,
      fileObjectExists: true, objectUrlCreated: !!localUrl,
      userAgent: navigator.userAgent,
      loadedmetadataFired: false, loadeddataFired: false, canplayFired: false, errorFired: false,
      mediaErrorCode: null, mediaErrorMessage: null, timeoutTriggered: false,
      readyState: null, networkState: null, elapsedMs: null, previewOutcome: 'reading',
    }));
    const probe = document.createElement('video');
    probe.preload = 'metadata';
    probe.muted = true;
    probe.playsInline = true;
    let settled = false;

    const snapshot = (extra) => ({
      readyState: probe.readyState, networkState: probe.networkState,
      elapsedMs: Math.round(performance.now() - startedAt), ...extra,
    });

    const finish = (status, payload, extraDiag) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      probe.removeEventListener('loadedmetadata', onMeta);
      probe.removeEventListener('loadeddata', onLoadedData);
      probe.removeEventListener('canplay', onCanPlay);
      probe.removeEventListener('durationchange', onDurationChange);
      probe.removeEventListener('error', onError);
      if (probeRef.current && probeRef.current.probe === probe) probeRef.current = null;
      setDiag(d => ({ ...(d || {}), ...snapshot(extraDiag), previewOutcome: status }));
      if (status === 'ok') {
        setVideoDurationSec(payload);
        setVideoMetaStatus('ok');
      } else {
        setVideoMetaStatus(status);
      }
    };
    const checkDuration = (dur) => finish('ok', dur);
    const resolveDuration = () => {
      const dur = probe.duration;
      if (isFinite(dur) && dur > 0) { checkDuration(dur); return; }
      // Known Safari/iOS quirk: a blob-sourced video can report duration as Infinity
      // until a seek forces the browser to recompute it. Try that once before giving up.
      try {
        const onSeeked = () => {
          probe.removeEventListener('timeupdate', onSeeked);
          const resolved = probe.duration;
          probe.currentTime = 0;
          if (isFinite(resolved) && resolved > 0) checkDuration(resolved);
          else finish('error', null);
        };
        probe.addEventListener('timeupdate', onSeeked, { once: true });
        probe.currentTime = 1e7;
      } catch {
        finish('error', null);
      }
    };
    const onMeta = () => { setDiag(d => ({ ...(d || {}), loadedmetadataFired: true, ...snapshot() })); resolveDuration(); };
    const onLoadedData = () => setDiag(d => ({ ...(d || {}), loadeddataFired: true, ...snapshot() }));
    const onCanPlay = () => setDiag(d => ({ ...(d || {}), canplayFired: true, ...snapshot() }));
    const onDurationChange = () => { if (isFinite(probe.duration) && probe.duration > 0) resolveDuration(); };
    const onError = () => {
      const me = probe.error;
      const codeMap = { 1: 'MEDIA_ERR_ABORTED', 2: 'MEDIA_ERR_NETWORK', 3: 'MEDIA_ERR_DECODE', 4: 'MEDIA_ERR_SRC_NOT_SUPPORTED' };
      setDiag(d => ({ ...(d || {}), errorFired: true, mediaErrorCode: me ? (codeMap[me.code] || me.code) : null, mediaErrorMessage: me ? (me.message || null) : null }));
      finish('error', null);
    };

    probe.addEventListener('loadedmetadata', onMeta);
    probe.addEventListener('loadeddata', onLoadedData);
    probe.addEventListener('canplay', onCanPlay);
    probe.addEventListener('durationchange', onDurationChange);
    probe.addEventListener('error', onError);

    // The preview must never be stuck on "Checking…" forever — give up cleanly after 10s.
    // This no longer blocks upload; it just stops the cosmetic preview from spinning forever.
    const timeoutId = setTimeout(() => {
      setDiag(d => ({ ...(d || {}), timeoutTriggered: true }));
      finish('timeout', null);
    }, 10000);

    probeRef.current = { probe, timeoutId };
    probe.src = localUrl;
    probe.load();
  };

  const handleVideoSelected = (file) => {
    if (!file) return;
    setUploadError('');
    setVideoMetaStatus('idle');
    if (!file.type.startsWith('video/')) { setUploadError('Please choose a video file.'); return; }
    if (file.size > MAX_VIDEO_FILE_SIZE_BYTES) {
      setUploadError(`That video is too large (max ${Math.round(MAX_VIDEO_FILE_SIZE_BYTES / (1024 * 1024))}MB). Try a shorter clip.`);
      return;
    }
    if (videoLocalPreviewUrl) URL.revokeObjectURL(videoLocalPreviewUrl);
    const localUrl = URL.createObjectURL(file);
    setVideoFile(file);
    setVideoLocalPreviewUrl(localUrl);
    setVideoDurationSec(null);
    setConfirmedDurationSec(null);
    setUploadedVideoUrl(null);
    setUploadDone(false);
    setUploadProgress(0);
    setDiag(d => ({ ...(d || {}), cloudinaryReached: null, cloudinaryStatus: null, cloudinaryDurationReported: null }));
    // Preview is attempted for the user's benefit but is not awaited or required —
    // Start Upload is available immediately alongside it.
    probeVideoMetadata(file, localUrl);
  };
  const retryVideoMetadata = () => {
    if (!videoFile || !videoLocalPreviewUrl) return;
    probeVideoMetadata(videoFile, videoLocalPreviewUrl);
  };
  const clearSelectedVideo = () => {
    cleanupVideoProbe();
    if (videoLocalPreviewUrl) URL.revokeObjectURL(videoLocalPreviewUrl);
    setVideoFile(null); setVideoLocalPreviewUrl(null); setVideoDurationSec(null);
    setConfirmedDurationSec(null);
    setVideoMetaStatus('idle'); setUploadError('');
  };
  const startRealUpload = () => {
    if (!caption.trim()) { onToast('Add a short caption first.'); return; }
    if (!videoFile) { onToast('Choose a video to upload first.'); return; }
    // Deliberately NOT gated on videoMetaStatus — a failed/slow local preview does not
    // mean the file itself is bad. The original File object goes to Cloudinary either way,
    // and Cloudinary's own response (read below) is the authoritative duration check.
    setUploading(true); setUploadProgress(0); setUploadDone(false); setUploadError('');
    setDiag(d => ({ ...(d || {}), cloudinaryReached: false, cloudinaryStatus: null, cloudinaryDurationReported: null }));
    const form = new FormData();
    form.append('file', videoFile);
    form.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    const xhr = new XMLHttpRequest();
    uploadXhrRef.current = xhr;
    xhr.open('POST', CLOUDINARY_UPLOAD_URL);
    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable) setUploadProgress(Math.round((evt.loaded / evt.total) * 100));
    };
    xhr.onload = () => {
      setUploading(false);
      uploadXhrRef.current = null;
      let data;
      try { data = JSON.parse(xhr.responseText); } catch { data = null; }
      const reached = true; // the request round-tripped to Cloudinary; a status/body was received
      const ok = xhr.status >= 200 && xhr.status < 300 && data && data.secure_url;
      setDiag(d => ({ ...(d || {}), cloudinaryReached: reached, cloudinaryStatus: xhr.status, cloudinaryDurationReported: ok ? (typeof data.duration === 'number' ? data.duration : '(not returned)') : null }));
      if (!ok) {
        const msg = (data && (data.error?.message)) || `Upload failed (status ${xhr.status}).`;
        setUploadError(`Upload failed: ${msg}. You were not charged — try again.`);
        setUploadDone(false);
        setUploadProgress(0);
        return;
      }
      // Authoritative duration check: Cloudinary actually processed the file server-side,
      // so this is real — unlike a browser's video element, it isn't subject to iOS/Safari
      // preview quirks or sandbox restrictions. Per spec, client-measured duration is never
      // trusted for the 60s limit — only this value is.
      if (typeof data.duration === 'number') {
        if (data.duration > MAX_VIDEO_DURATION_SECONDS + 1) {
          setUploadError(`Cloudinary confirmed this video is ${Math.round(data.duration)}s long — the max is ${MAX_VIDEO_DURATION_SECONDS}s. It was uploaded but will not be used; please choose a shorter clip.`);
          setUploadDone(false);
          setUploadProgress(0);
          return;
        }
        setConfirmedDurationSec(data.duration);
      } else {
        // Cloudinary didn't report a duration for some reason — we never trust the client's
        // own guess for this limit, so without an authoritative number we can't clear it.
        setUploadError("Upload succeeded, but we couldn't confirm this video's length from Cloudinary, so it can't be counted yet. Please try again.");
        setUploadDone(false);
        setUploadProgress(0);
        return;
      }
      setUploadedVideoUrl(data.secure_url);
      setUploadProgress(100);
      setUploadDone(true);
      setUploadError('');
    };
    xhr.onerror = () => {
      setUploading(false);
      uploadXhrRef.current = null;
      setDiag(d => ({ ...(d || {}), cloudinaryReached: false, cloudinaryStatus: 'network error / blocked' }));
      setUploadError('Upload failed — check your connection and try again. You were not charged.');
      setUploadDone(false);
      setUploadProgress(0);
    };
    xhr.send(form);
  };
  const cancelUpload = () => {
    if (uploadXhrRef.current) { uploadXhrRef.current.abort(); uploadXhrRef.current = null; }
    setUploading(false); setUploadProgress(0);
  };
  const reviewSubmission = async () => {
    if (!uploadedVideoUrl || !uploadDone) { onToast('Finish your upload first.'); return; }
    if (!caption.trim()) { onToast('Add a short caption first.'); return; }
    const liveEntries = await getEffectiveEntries(comp.id);
    if (liveEntries.length >= (comp.maxSpots || MAX_SPOTS)) { setJustFilled(true); return; }
    const freshComp = (await sGet(`comp:${comp.id}`, true)) || comp;
    if (freshComp.countdownStartedAt && Date.now() >= freshComp.endsAt) { setJustEnded(true); return; }
    const wb = (await sGet(`wallet:${user.username}`, true)) || { balance: STARTING_WALLET_BALANCE };
    setWalletBalance(wb.balance);
    if (wb.balance < currentEntryFee()) setInsufficientOpen(true);
    else setPaymentOpen(true);
  };
  const addToWallet = async () => {
    const wb = (await sGet(`wallet:${user.username}`, true)) || { balance: STARTING_WALLET_BALANCE };
    const updated = { balance: wb.balance + WALLET_TOPUP_AMOUNT };
    await sSet(`wallet:${user.username}`, updated, true);
    setWalletBalance(updated.balance);
    setInsufficientOpen(false);
    setPaymentOpen(true);
  };
  const finalizeEntry = async () => {
    if (submittingEntry) return; // guard against double-tap double-charging
    setSubmittingEntry(true);
    setPaymentOpen(false);
    // Check again immediately before charging, in case the competition filled, ended, or the user
    // already has an entry (e.g. two rapid taps, or they entered from a second device) while the modal was open.
    const liveEntries = await getEffectiveEntries(comp.id);
    if (liveEntries.some(e => e.username === user.username)) { onToast("You're already competing in this competition."); setSubmittingEntry(false); load(); return; }
    if (liveEntries.length >= (comp.maxSpots || MAX_SPOTS)) { setJustFilled(true); setSubmittingEntry(false); return; }
    const freshComp = (await sGet(`comp:${comp.id}`, true)) || comp;
    if (freshComp.countdownStartedAt && Date.now() >= freshComp.endsAt) { setJustEnded(true); setSubmittingEntry(false); return; }
    const fee = currentEntryFee();
    const wb = (await sGet(`wallet:${user.username}`, true)) || { balance: STARTING_WALLET_BALANCE };
    const newBalance = wb.balance - fee;
    await sSet(`wallet:${user.username}`, { balance: newBalance }, true);
    setWalletBalance(newBalance);
    const contentId = uid();
    await sSet(`content:${contentId}`, { id: contentId, username: user.username, title: '', caption: caption.trim(), kind: 'video', videoUrl: uploadedVideoUrl || null, createdAt: Date.now() }, true);
    const entryId = uid();
    await sSet(`entry:${comp.id}:${entryId}`, { id: entryId, compId: comp.id, username: user.username, contentId, enteredAt: Date.now(), feePaid: fee }, true);
    await sSet(`role:${comp.id}:${user.username}`, { role: 'competitor', at: Date.now() }, true);
    const newCount = liveEntries.length + 1;
    let updatedComp = freshComp;
    if (!freshComp.countdownStartedAt && newCount >= 2) {
      const now = Date.now();
      updatedComp = { ...freshComp, status: 'live', countdownStartedAt: now, endsAt: now + COMPETITION_DURATION_MS };
      await sSet(`comp:${comp.id}`, updatedComp, true);
      onCompUpdated(updatedComp);
    }
    setRole('competitor');
    setSubmittingEntry(false);
    setEnteredSuccess(true);
  };
  const finishJustFilled = () => { setJustFilled(false); chooseViewer(); };
  const finishJustEnded = () => { setJustEnded(false); load(); };
  const viewAfterEntering = () => {
    setEnteredSuccess(false);
    onToast(`✓ Officially entered! $${currentEntryFee()} added to the prize pot. (Prototype only — no real charge was made.)`);
    setPhase('main');
    setShareOpen(true);
    load();
  };

  const sorted = [...entries].sort((a, b) => (voteTotals[b.id] || 0) - (voteTotals[a.id] || 0));
  const isEnded = comp.status === 'ended';
  const spotsFilled = entries.length;
  const maxSpots = comp.maxSpots || MAX_SPOTS;
  const isFull = spotsFilled >= maxSpots;
  const pot = prizePot(entries);
  const fee = currentEntryFee();
  const medal = ['🥇', '🥈', '🥉'];
  const myEntry = entries.find(e => e.username === user.username);
  const myRank = myEntry ? sorted.findIndex(e => e.id === myEntry.id) + 1 : null;
  const statusText = isEnded ? 'Competition Ended' : isFull ? 'Competition Full' : comp.countdownStartedAt ? 'Competition Live' : spotsFilled >= 1 ? 'Waiting for a Challenger' : 'Open — Be the First to Enter';
  const countdownText = useCountdown(comp.endsAt, !isEnded && !!comp.countdownStartedAt);
  const shareLink = myEntry ? `https://krush.app/c/${comp.id}/${myEntry.id}` : '';

  if (loading) return <div className="pb-4"><TopBar title={comp.title} onBack={onBack} /><Spinner /></div>;

  const HeaderBlock = () => (
    <div className="px-4 pt-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-2xl">{CAT_EMOJI[comp.category]}</span>
        <div>
          <div style={{ color: C.paper }} className="font-bold text-sm">{comp.category} · {SUBCATEGORY_MAP[comp.category] || 'General'}</div>
          <TestTag text="CUSTOMER DISCOVERY TEST — NO REAL MONEY OR PRIZES" />
        </div>
      </div>
      <div className="flex items-center gap-3 flex-wrap text-xs font-semibold mb-2 mt-2">
        <span style={{ color: isEnded ? C.amber : isFull ? C.red : C.blue }}>{statusText}</span>
        <span style={{ color: C.paper }}>{spotsFilled} of {maxSpots} spots filled</span>
        <span style={{ color: C.amber }}>${pot} prize pot</span>
        {comp.countdownStartedAt && !isEnded && <span style={{ color: C.pink }} className="flex items-center gap-1"><Clock size={12} /> {countdownText}</span>}
      </div>
    </div>
  );

  // ---- COMPETITION JUST FILLED WHILE UPLOADING ----
  if (justFilled) {
    return (
      <div className="pb-8 px-4 pt-10 text-center">
        <div className="text-4xl mb-3">🔥</div>
        <div style={{ color: C.paper }} className="text-lg font-black mb-2">THIS KRUSH JUST FILLED 🔥</div>
        <div style={{ color: C.muted }} className="text-sm mb-1">All {maxSpots} competitor spots have now been claimed.</div>
        <div style={{ color: C.green }} className="text-sm font-bold mb-6">You were NOT charged.</div>
        <div style={{ color: C.muted }} className="text-sm mb-6">You can still watch, vote and comment on this competition.</div>
        <button onClick={finishJustFilled} style={{ background: C.blue, color: 'white' }} className="w-full font-bold py-3.5 rounded-xl">Watch Competition</button>
      </div>
    );
  }
  // ---- COMPETITION JUST ENDED WHILE UPLOADING ----
  if (justEnded) {
    return (
      <div className="pb-8 px-4 pt-10 text-center">
        <div className="text-4xl mb-3">⏱️</div>
        <div style={{ color: C.paper }} className="text-lg font-black mb-2">This Competition Just Ended</div>
        <div style={{ color: C.muted }} className="text-sm mb-1">The entry period closed while you were preparing your entry.</div>
        <div style={{ color: C.green }} className="text-sm font-bold mb-6">You were NOT charged.</div>
        <button onClick={finishJustEnded} style={{ background: C.blue, color: 'white' }} className="w-full font-bold py-3.5 rounded-xl">See Results</button>
      </div>
    );
  }
  // ---- SUCCESSFUL ENTRY ----
  if (enteredSuccess) {
    return (
      <div className="pb-8 px-4 pt-10 text-center">
        <div className="text-4xl mb-3">🔥</div>
        <div style={{ color: C.amber }} className="text-lg font-black mb-2">YOU'RE IN! 🔥</div>
        <div style={{ color: C.paper }} className="text-sm mb-4">Your entry is officially competing in {comp.title}.</div>
        <div style={{ background: C.surface }} className="rounded-xl p-4 mb-6 flex flex-col gap-1 text-sm">
          <div style={{ color: C.paper }}>Competitors: <b>{spotsFilled + 1} / {maxSpots}</b></div>
          <div style={{ color: C.paper }}>Current Prize Pool: <b>${pot + fee}</b></div>
        </div>
        <button onClick={viewAfterEntering} style={{ background: `linear-gradient(90deg, ${C.blue}, ${C.pink})`, color: 'white' }} className="w-full font-bold py-3.5 rounded-xl">View Competition</button>
      </div>
    );
  }

  // ---- PREVIEW (role not yet chosen) ----
  if (phase === 'preview') {
    return (
      <div className="pb-8">
        <TopBar title={comp.title} onBack={onBack} />
        <HeaderBlock />
        <div className="px-4">
          <div style={{ background: `linear-gradient(135deg, ${C.surface2}, ${C.ink})` }} className="w-full aspect-video rounded-xl flex items-center justify-center mb-2 relative">
            <Lock size={28} color={C.muted} />
            <span style={{ background: 'rgba(0,0,0,0.6)', color: 'white' }} className="absolute bottom-2 left-2 right-2 text-[11px] font-semibold text-center rounded-md px-2 py-1.5">Choose how you want to participate to unlock the competition entries.</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap text-xs mb-3">
            <span style={{ color: C.paper }} className="font-semibold">${fee} entry{isTuesday() ? ' (Tuesday price)' : ''}</span>
          </div>
          <SectionLabel text={`Who's Competing (${entries.length})`} />
          {entries.length === 0 ? <EmptyState text="No one has entered yet — you could be the first." /> : (
            <div className="flex flex-wrap gap-2 mb-4">
              {entries.map(e => (
                <div key={e.id} style={{ background: C.surface }} className="rounded-full pl-1 pr-3 py-1 flex items-center gap-2">
                  <span style={{ background: C.surface2 }} className="w-6 h-6 rounded-full flex items-center justify-center text-xs">🙂</span>
                  <span style={{ color: C.paper }} className="text-xs font-semibold">@{e.username}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ background: C.surface }} className="rounded-xl p-3 mb-4">
            <div style={{ color: C.paper }} className="text-xs font-bold mb-1">Rules</div>
            <div style={{ color: C.muted }} className="text-xs">{COMPETITION_RULES_TEXT}</div>
            <div style={{ color: C.amber }} className="text-xs font-bold mt-2">One winner. Winner takes the entire prize pot.</div>
          </div>
          <div style={{ color: C.muted }} className="text-xs mb-4 text-center">Choose carefully. Your selection is final for this competition.</div>
          <div className="flex flex-col gap-3">
            <button onClick={goToConfirmViewer} style={{ background: C.surface2, color: C.paper, border: `1px solid ${C.surface2}` }} className="w-full font-bold py-3.5 rounded-xl">👀 Watch &amp; Vote</button>
            <button onClick={goToCompete} disabled={isFull} style={{ background: isFull ? C.surface2 : `linear-gradient(90deg, ${C.blue}, ${C.pink})`, color: isFull ? C.muted : 'white' }} className="w-full font-bold py-3.5 rounded-xl">{isFull ? 'Competition Full' : '🏆 Compete'}</button>
          </div>
        </div>
      </div>
    );
  }

  // ---- CONFIRM WATCH & VOTE (permanent once confirmed) ----
  if (phase === 'confirmViewer') {
    return (
      <div className="pb-8">
        <TopBar title="Confirm Watch & Vote" onBack={() => setPhase('preview')} />
        <HeaderBlock />
        <div className="px-4">
          <div style={{ background: 'rgba(46,91,255,0.08)', border: `1px solid ${C.blue}` }} className="rounded-xl p-4 mb-5">
            <div style={{ color: C.paper }} className="text-sm leading-relaxed">You are choosing to watch and vote in this competition. Once confirmed, you cannot enter this competition as a competitor.</div>
          </div>
          <button onClick={chooseViewer} style={{ background: C.blue, color: 'white' }} className="w-full font-bold py-3.5 rounded-xl mb-3">Confirm Watch &amp; Vote</button>
          <button onClick={() => setPhase('preview')} style={{ color: C.muted, border: `1px solid ${C.surface2}` }} className="w-full font-bold py-3 rounded-xl text-sm text-center">Go Back</button>
        </div>
      </div>
    );
  }

  // ---- CONFIRM COMPETE (permanent once confirmed) ----
  if (phase === 'confirmCompete') {
    return (
      <div className="pb-8">
        <TopBar title="Confirm to Compete" onBack={() => setPhase('preview')} />
        <HeaderBlock />
        <div className="px-4">
          <div style={{ background: 'rgba(255,77,77,0.08)', border: `1px solid ${C.red}` }} className="rounded-xl p-4 mb-3">
            <div style={{ color: C.paper }} className="text-sm leading-relaxed font-semibold mb-2">You are choosing to compete. Once confirmed, you cannot switch to Watch &amp; Vote without completing your competition entry.</div>
            <div style={{ color: C.muted }} className="text-xs leading-relaxed mb-2">As a competitor, you'll still be able to watch the feed, vote for other competitors, and comment — but you can't vote for your own entry.</div>
            <div style={{ color: C.muted }} className="text-xs leading-relaxed">{COMPETE_DISCLAIMER_TEXT}</div>
          </div>
          <button onClick={confirmCompeteChoice} style={{ background: `linear-gradient(90deg, ${C.blue}, ${C.pink})`, color: 'white' }} className="w-full font-bold py-3.5 rounded-xl mb-3">Confirm and Compete</button>
          <button onClick={() => setPhase('preview')} style={{ color: C.muted, border: `1px solid ${C.surface2}` }} className="w-full font-bold py-3 rounded-xl text-sm text-center">Go Back</button>
        </div>
      </div>
    );
  }

  // ---- COMPETE CONFIRMATION (before payment) ----
  if (phase === 'confirm') {
    const alreadyLive = !!comp.countdownStartedAt;
    return (
      <div className="pb-8">
        <TopBar title="Confirm Entry" onBack={onBack} />
        <HeaderBlock />
        <div className="px-4">
          <div style={{ background: C.surface }} className="rounded-xl p-4 mb-3 flex flex-col gap-1.5 text-sm">
            <div style={{ color: C.paper }}>Entry fee: <b>${fee}</b>{isTuesday() && <span style={{ color: C.green }}> (Tuesday price)</span>}</div>
            <div style={{ color: C.paper }}>Current prize pot: <b>${pot}</b></div>
            <div style={{ color: C.paper }}>Spots remaining: <b>{maxSpots - spotsFilled}</b> of {maxSpots}</div>
            <div style={{ color: C.paper }}>Time remaining: <b>{alreadyLive ? countdownText : 'Starts when the 2nd contestant enters'}</b></div>
          </div>
          {alreadyLive && (
            <div style={{ background: 'rgba(255,176,32,0.1)', border: `1px solid ${C.amber}` }} className="rounded-xl p-3 mb-3">
              <div style={{ color: C.amber }} className="text-xs font-bold mb-2">This competition is already in progress. You have {countdownText} to upload your entry and collect votes. Your ${fee} entry fee remains the same.</div>
              <label className="flex items-start gap-2 text-xs" style={{ color: C.paper }}>
                <input type="checkbox" checked={lateAck} onChange={e => setLateAck(e.target.checked)} className="mt-0.5" />
                I understand how much time remains, and I still want to compete.
              </label>
            </div>
          )}
          <div style={{ color: C.muted }} className="text-xs mb-4">Upload requirements: one video or photo, a short caption, and confirming the category above. Prototype only — no real charge will be made.</div>
          <button onClick={startUpload} disabled={alreadyLive && !lateAck} style={{ background: (alreadyLive && !lateAck) ? C.surface2 : C.pink, color: (alreadyLive && !lateAck) ? C.muted : 'white' }} className="w-full font-bold py-3.5 rounded-xl mb-3">Pay Entry Fee &amp; Upload</button>
          <button onClick={() => setAbandonOpen(true)} style={{ color: C.muted, border: `1px solid ${C.surface2}` }} className="w-full font-bold py-3 rounded-xl text-sm text-center">Abandon Entry and Watch Instead</button>
        </div>
        {abandonOpen && (
          <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setAbandonOpen(false)}>
            <div style={{ background: C.surface }} onClick={e => e.stopPropagation()} className="w-full rounded-t-2xl p-6">
              <div style={{ color: C.paper }} className="text-sm leading-relaxed mb-4">If you switch to Watch &amp; Vote, you will not be able to return and compete in this competition.</div>
              <button onClick={() => setAbandonOpen(false)} style={{ background: C.blue, color: 'white' }} className="w-full font-bold py-3 rounded-xl mb-3">Continue My Entry</button>
              <button onClick={abandonAndWatch} style={{ color: C.muted, border: `1px solid ${C.surface2}` }} className="w-full font-bold py-3 rounded-xl text-sm">Switch to Watch &amp; Vote</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---- REAL VIDEO UPLOAD (Cloudinary) ----
  if (phase === 'uploading') {
    return (
      <div className="pb-8">
        <TopBar title="Upload Entry" onBack={() => setPhase('confirm')} />
        <div className="px-4 pt-4">
          <TestTag text="Real upload — your video is hosted so other testers can play it back. No real charge will be made." />
          <div style={{ background: C.surface, border: `2px dashed ${C.surface2}` }} className="rounded-xl p-4 mt-3 mb-3">
            <div className="flex items-center gap-2 mb-2"><Upload size={18} color={C.blue} /><span style={{ color: C.paper }} className="text-xs font-semibold">Upload a video from your phone</span></div>

            {!videoLocalPreviewUrl ? (
              <label style={{ background: C.surface2, color: C.paper, border: `1px solid ${C.surface2}` }} className="w-full flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-bold cursor-pointer mb-2">
                <Upload size={16} /> Choose Video
                <input type="file" accept="video/*" className="hidden" onChange={e => handleVideoSelected(e.target.files?.[0] || null)} />
              </label>
            ) : (
              <div className="mb-2">
                <video src={videoLocalPreviewUrl} controls playsInline className="w-full rounded-lg mb-2" style={{ maxHeight: 260, background: '#000' }} />
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div style={{ color: videoMetaStatus === 'ok' ? C.muted : videoMetaStatus === 'reading' ? C.blue : C.muted }} className="text-xs font-semibold">
                    {videoMetaStatus === 'ok' && `Preview OK — ~${Math.round(videoDurationSec)}s (unconfirmed)`}
                    {videoMetaStatus === 'reading' && 'Checking preview…'}
                    {videoMetaStatus === 'timeout' && "Preview is slow, but you don't need to wait — Start Upload works now"}
                    {videoMetaStatus === 'error' && "Preview unavailable in this view — the original file can still be uploaded"}
                    {videoMetaStatus === 'idle' && ' '}
                  </div>
                  {!uploading && (
                    <label style={{ color: C.blue }} className="text-xs font-bold cursor-pointer">
                      Choose a different video
                      <input type="file" accept="video/*" className="hidden" onChange={e => handleVideoSelected(e.target.files?.[0] || null)} />
                    </label>
                  )}
                </div>
                {(videoMetaStatus === 'timeout' || videoMetaStatus === 'error') && !uploading && (
                  <div className="flex gap-2 mt-2">
                    <button onClick={retryVideoMetadata} style={{ background: C.surface2, color: C.paper }} className="flex-1 font-bold py-2.5 rounded-lg text-xs">Retry Preview</button>
                    <button onClick={clearSelectedVideo} style={{ background: C.surface2, color: C.paper }} className="flex-1 font-bold py-2.5 rounded-lg text-xs">Choose Different Video</button>
                  </div>
                )}
              </div>
            )}

            {uploadError && <div style={{ color: C.red }} className="text-xs font-semibold mb-2">{uploadError}</div>}

            <textarea placeholder="Caption for your entry" value={caption} onChange={e => setCaption(e.target.value)} rows={2} style={{ background: C.surface2, color: C.paper, border: 'none' }} className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none mb-2" />
            <div style={{ color: C.muted }} className="text-xs">Category: <b style={{ color: C.paper }}>{comp.category}</b> (confirmed) · Max {MAX_VIDEO_DURATION_SECONDS}s (verified by Cloudinary after upload)</div>
          </div>
          {!uploadDone ? (
            <>
              {uploading && (
                <div style={{ background: C.surface2 }} className="w-full h-2 rounded-full overflow-hidden mb-1">
                  <div style={{ background: C.blue, width: `${uploadProgress}%`, transition: 'width 0.15s' }} className="h-full" />
                </div>
              )}
              {uploading && <div style={{ color: C.muted }} className="text-xs text-center mb-2">{uploadProgress < 100 ? `Uploading video — ${uploadProgress}%` : 'Confirming with Cloudinary…'}</div>}
              {uploading ? (
                <button onClick={cancelUpload} style={{ background: C.surface2, color: C.paper }} className="w-full font-bold py-3 rounded-xl mb-3">Cancel Upload</button>
              ) : (
                <button onClick={startRealUpload} disabled={!videoFile} style={{ background: !videoFile ? C.surface2 : C.blue, color: !videoFile ? C.muted : 'white' }} className="w-full font-bold py-3 rounded-xl mb-3">Start Upload</button>
              )}
            </>
          ) : (
            <>
              <div style={{ background: C.surface }} className="rounded-xl p-4 mb-3 flex items-center gap-3">
                <div style={{ background: C.surface2 }} className="w-14 h-14 rounded-lg flex items-center justify-center text-2xl">🎬</div>
                <div className="min-w-0">
                  <div style={{ color: C.paper }} className="text-sm font-semibold truncate">Preview: {caption}</div>
                  <div style={{ color: C.green }} className="text-xs font-bold">Upload complete! Ready to enter — {confirmedDurationSec != null ? `${Math.round(confirmedDurationSec)}s confirmed by Cloudinary` : 'hosted and ready for playback'}</div>
                </div>
              </div>
              <div className="flex gap-2 mb-3">
                <button onClick={() => { setUploadDone(false); setUploadProgress(0); setUploadedVideoUrl(null); setConfirmedDurationSec(null); }} style={{ background: C.surface2, color: C.paper }} className="flex-1 font-bold py-3 rounded-xl text-sm">Replace Video</button>
                <button onClick={reviewSubmission} style={{ background: C.pink, color: 'white' }} className="flex-1 font-bold py-3 rounded-xl text-sm">Submit Entry</button>
              </div>
            </>
          )}
          <button onClick={() => setAbandonOpen(true)} style={{ color: C.muted, border: `1px solid ${C.surface2}` }} className="w-full font-bold py-3 rounded-xl text-sm text-center mb-3">Abandon Entry and Watch Instead</button>

          <button onClick={() => setShowDiagnostics(s => !s)} style={{ color: C.muted, border: `1px solid ${C.surface2}` }} className="w-full font-semibold py-2 rounded-xl text-xs text-center flex items-center justify-center gap-1">
            <Shield size={12} /> {showDiagnostics ? 'Hide' : 'Show'} Diagnostics (prototype testing)
          </button>
          {showDiagnostics && (
            <div style={{ background: C.surface, border: `1px solid ${C.surface2}` }} className="rounded-xl p-3 mt-2 text-[11px] font-mono" >
              {!diag ? (
                <div style={{ color: C.muted }}>No video selected yet.</div>
              ) : (
                <div className="flex flex-col gap-0.5" style={{ color: C.muted }}>
                  <div><b style={{ color: C.paper }}>File:</b> {diag.fileName} (.{diag.fileExt})</div>
                  <div><b style={{ color: C.paper }}>MIME type:</b> {diag.mimeType}</div>
                  <div><b style={{ color: C.paper }}>Size:</b> {diag.fileSizeBytes != null ? `${Math.round(diag.fileSizeBytes / 1024)} KB` : '—'}</div>
                  <div><b style={{ color: C.paper }}>File object exists:</b> {String(!!diag.fileObjectExists)}</div>
                  <div><b style={{ color: C.paper }}>Object URL created:</b> {String(!!diag.objectUrlCreated)}</div>
                  <div><b style={{ color: C.paper }}>Preview outcome:</b> {diag.previewOutcome}</div>
                  <div><b style={{ color: C.paper }}>readyState:</b> {diag.readyState ?? '—'} · <b style={{ color: C.paper }}>networkState:</b> {diag.networkState ?? '—'}</div>
                  <div><b style={{ color: C.paper }}>loadedmetadata fired:</b> {String(!!diag.loadedmetadataFired)}</div>
                  <div><b style={{ color: C.paper }}>loadeddata fired:</b> {String(!!diag.loadeddataFired)}</div>
                  <div><b style={{ color: C.paper }}>canplay fired:</b> {String(!!diag.canplayFired)}</div>
                  <div><b style={{ color: C.paper }}>error event fired:</b> {String(!!diag.errorFired)}</div>
                  <div><b style={{ color: C.paper }}>MediaError:</b> {diag.mediaErrorCode ? `${diag.mediaErrorCode}${diag.mediaErrorMessage ? ' — ' + diag.mediaErrorMessage : ''}` : '—'}</div>
                  <div><b style={{ color: C.paper }}>Preview timeout triggered:</b> {String(!!diag.timeoutTriggered)}</div>
                  <div><b style={{ color: C.paper }}>Preview elapsed:</b> {diag.elapsedMs != null ? `${diag.elapsedMs}ms` : '—'}</div>
                  <div className="my-1" style={{ borderTop: `1px solid ${C.surface2}` }} />
                  <div><b style={{ color: C.paper }}>Cloudinary reached:</b> {diag.cloudinaryReached == null ? '—' : String(diag.cloudinaryReached)}</div>
                  <div><b style={{ color: C.paper }}>Cloudinary HTTP status:</b> {diag.cloudinaryStatus ?? '—'}</div>
                  <div><b style={{ color: C.paper }}>Cloudinary-reported duration:</b> {diag.cloudinaryDurationReported ?? '—'}</div>
                  <div className="my-1" style={{ borderTop: `1px solid ${C.surface2}` }} />
                  <div className="break-all"><b style={{ color: C.paper }}>Browser:</b> {diag.userAgent}</div>
                </div>
              )}
            </div>
          )}
        </div>
        {abandonOpen && (
          <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setAbandonOpen(false)}>
            <div style={{ background: C.surface }} onClick={e => e.stopPropagation()} className="w-full rounded-t-2xl p-6">
              <div style={{ color: C.paper }} className="text-sm leading-relaxed mb-4">If you switch to Watch &amp; Vote, you will not be able to return and compete in this competition.</div>
              <button onClick={() => setAbandonOpen(false)} style={{ background: C.blue, color: 'white' }} className="w-full font-bold py-3 rounded-xl mb-3">Continue My Entry</button>
              <button onClick={abandonAndWatch} style={{ color: C.muted, border: `1px solid ${C.surface2}` }} className="w-full font-bold py-3 rounded-xl text-sm">Switch to Watch &amp; Vote</button>
            </div>
          </div>
        )}
        {paymentOpen && (
          <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setPaymentOpen(false)}>
            <div style={{ background: C.surface }} onClick={e => e.stopPropagation()} className="w-full rounded-t-2xl p-6">
              <div style={{ color: C.paper }} className="font-bold text-base mb-1">Ready to Enter?</div>
              <div style={{ color: C.muted }} className="text-xs mb-3">Entry into this competition costs ${fee}.</div>
              <div style={{ background: C.surface2 }} className="rounded-lg p-3 mb-3 flex flex-col gap-1 text-xs">
                <div style={{ color: C.paper }}>Competitors: <b>{spotsFilled} / {maxSpots}</b> · {maxSpots - spotsFilled} spots remaining</div>
                <div style={{ color: C.paper }}>Current prize pool: <b>${pot}</b></div>
              </div>
              <div style={{ color: C.muted }} className="text-xs mb-1">For this prototype, your KRUSH tokens represent your KRUSH Wallet balance.</div>
              <div style={{ background: C.surface2 }} className="rounded-lg p-3 mb-4 flex flex-col gap-1 text-sm">
                <div style={{ color: C.paper }}>KRUSH Wallet Balance: <b>${walletBalance}</b></div>
                <div style={{ color: C.paper }}>Competition Entry: <b>${fee}</b> (token equivalent)</div>
                <div style={{ color: C.paper }}>Balance After Entry: <b>${walletBalance - fee}</b></div>
              </div>
              <button onClick={finalizeEntry} disabled={submittingEntry} style={{ background: submittingEntry ? C.surface2 : C.pink, color: submittingEntry ? C.muted : 'white' }} className="w-full font-bold py-3 rounded-xl mb-3">{submittingEntry ? 'Entering…' : `Pay $${fee} & Enter`}</button>
              <button onClick={() => setPaymentOpen(false)} style={{ color: C.muted, border: `1px solid ${C.surface2}` }} className="w-full font-bold py-3 rounded-xl text-sm">Cancel</button>
              <div style={{ color: C.muted }} className="text-[10px] text-center mt-2">Prototype only — no real charge will be made.</div>
            </div>
          </div>
        )}
        {insufficientOpen && (
          <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setInsufficientOpen(false)}>
            <div style={{ background: C.surface }} onClick={e => e.stopPropagation()} className="w-full rounded-t-2xl p-6">
              <div style={{ color: C.paper }} className="font-bold text-base mb-1">Not Enough in Your KRUSH Wallet</div>
              <div style={{ color: C.muted }} className="text-sm mb-4">You need ${fee} to enter this competition. Current balance: ${walletBalance}.</div>
              <button onClick={addToWallet} style={{ background: C.blue, color: 'white' }} className="w-full font-bold py-3 rounded-xl mb-3">Add ${WALLET_TOPUP_AMOUNT} to Wallet (Prototype Tokens)</button>
              <button onClick={() => setInsufficientOpen(false)} style={{ color: C.muted, border: `1px solid ${C.surface2}` }} className="w-full font-bold py-3 rounded-xl text-sm">Cancel</button>
            </div>
          </div>
        )}
      </div>
    );
  }


  return (
    <div className="pb-4">
      {celebrate && <Confetti />}
      <TopBar title={comp.title} onBack={onBack} />
      <HeaderBlock />
      <div className="px-4">
        {!isEnded && (
          <button onClick={() => { load(); onToast('Refreshed.'); }} style={{ color: C.muted }} className="text-xs font-semibold mb-3 flex items-center gap-1">↻ Refresh</button>
        )}
        {role === 'viewer' && !isEnded && (
          <div style={{ background: C.surface, border: `1px solid ${C.surface2}`, color: C.muted }} className="rounded-lg px-3 py-2 mb-3 text-xs">You joined this competition as a viewer.</div>
        )}
        {myEntry && !isEnded && (
          <div style={{ background: 'rgba(46,91,255,0.1)', border: `1px solid ${C.blue}` }} className="rounded-lg px-3 py-2 mb-3 text-xs flex items-center justify-between">
            <span style={{ color: C.paper }} className="font-semibold">Officially Entered — Rank #{myRank}</span>
            <span style={{ color: C.blue }} className="font-bold">{voteTotals[myEntry.id] || 0} votes</span>
          </div>
        )}

        {isEnded && (
          <div style={{ background: 'rgba(255,176,32,0.1)', border: `1px solid ${C.amber}` }} className="rounded-xl p-4 mb-4">
            <div style={{ color: C.amber }} className="text-lg font-black mb-2">🏆 WINNER!</div>
            {comp.top3 && comp.top3.length > 0 ? (
              <div className="flex flex-col gap-2">
                {comp.top3.map((eid, i) => {
                  const e = entries.find(x => x.id === eid);
                  if (!e) return null;
                  return (
                    <div key={eid} className="flex items-center gap-2">
                      <span className="text-lg">{medal[i]}</span>
                      <span style={{ color: C.paper }} className="text-sm font-semibold">@{e.username}</span>
                      <span style={{ color: C.muted }} className="text-xs ml-auto">{voteTotals[eid] || 0} votes</span>
                    </div>
                  );
                })}
              </div>
            ) : <div style={{ color: C.muted }} className="text-sm">No entries were submitted.</div>}
            {comp.winnerEntryId && entries.find(e => e.id === comp.winnerEntryId)?.username === user.username && (
              <div style={{ background: 'rgba(255,176,32,0.18)' }} className="rounded-lg p-3 mt-3 text-center">
                <div style={{ color: C.amber }} className="font-black">🏆 YOU WON</div>
                <div style={{ color: C.amber }} className="text-xl font-black">${pot} DEMO PRIZE</div>
                <div className="mt-1"><TestTag text="DEMO / TEST ONLY — NO REAL MONEY" /></div>
              </div>
            )}
            <div style={{ color: C.muted }} className="text-xs mt-3">No real cash prize is being awarded during customer testing.</div>
          </div>
        )}

        {myEntry && !isEnded && (
          <div className="flex flex-col gap-2 mb-4">
            <button onClick={() => setShareOpen(true)} style={{ background: C.pink, color: 'white' }} className="w-full font-bold py-2.5 rounded-xl text-sm">📤 Share My Entry</button>
          </div>
        )}

        <SectionLabel text={`Contestants (${entries.length})`} />
        {!isEnded && (
          <div style={{ color: C.muted }} className="text-xs mb-2">
            {freeVoteUsed ? `Free vote used. ${credits} voting credit${credits === 1 ? '' : 's'} remaining.` : 'You have 1 free vote and 10 test credits for this competition.'}
          </div>
        )}
        {entries.length === 0 ? <EmptyState text="No one has entered this competition yet." /> : (
          <div className="flex flex-col gap-2">
            {sorted.map((e, i) => (
              <div key={e.id} className="relative">
                {!isEnded && <span style={{ color: C.muted }} className="absolute -left-1 -top-1 text-[10px] font-bold">#{i + 1}</span>}
                <EntryRow entry={e} content={contents[e.contentId]} voteTotal={voteTotals[e.id] || 0} refreshTick={commentsTick}
                  isSelf={e.username === user.username} live={comp.status !== 'ended'} freeVoteUsed={freeVoteUsed} credits={credits}
                  onFreeVote={castFreeVote} onOpenCredits={(entry) => setCreditEntry(entry)}
                  onComment={(entry) => setCommentsFor(entry)} onShare={(entry) => setShareForEntry(entry)}
                  onOpenViewer={(entry) => setViewer({ order: sorted.map(x => x.id), startIndex: Math.max(0, sorted.findIndex(x => x.id === entry.id)) })} />
              </div>
            ))}
          </div>
        )}
      </div>
      {viewer && <VideoFeedViewer order={viewer.order} startIndex={viewer.startIndex} entries={entries} contents={contents} voteTotals={voteTotals} comp={comp} user={user}
        live={comp.status !== 'ended'} freeVoteUsed={freeVoteUsed} credits={credits} statusText={isEnded ? 'Competition ended' : comp.countdownStartedAt ? `⏱ ${countdownText}` : statusText} commentsTick={commentsTick}
        onFreeVote={castFreeVote} onOpenCredits={(entry) => setCreditEntry(entry)} onComment={(entry) => setCommentsFor(entry)} onShare={(entry) => setShareForEntry(entry)} onClose={() => setViewer(null)} />}
      {creditEntry && <CreditVoteModal entry={creditEntry} remaining={credits} onConfirm={confirmCreditVote} onClose={() => setCreditEntry(null)} />}
      {commentsFor && <CommentsSheet targetId={commentsFor.id} targetLabel={`@${commentsFor.username}`} user={user} onClose={closeComments} onToast={onToast} />}
      {shareForEntry && <ShareSheet item={{ id: shareForEntry.id, username: shareForEntry.username, caption: contents[shareForEntry.contentId]?.caption || '', compTitle: comp.title }} user={user} onClose={() => setShareForEntry(null)} onToast={onToast} />}
      {shareOpen && myEntry && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setShareOpen(false)}>
          <div style={{ background: C.surface }} onClick={e => e.stopPropagation()} className="w-full rounded-t-2xl p-6">
            <div style={{ color: C.paper }} className="font-bold mb-1">Share My Entry</div>
            <div style={{ color: C.muted }} className="text-xs mb-3">"I'm competing on KRUSH! Watch my entry and vote for me before time runs out."</div>
            <div style={{ background: C.surface2, color: C.paper }} className="text-xs rounded-lg px-3 py-2 mb-3 break-all">{shareLink}</div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button onClick={() => { if (navigator.clipboard) navigator.clipboard.writeText(shareLink); onToast('Link copied (simulated).'); }} style={{ background: C.surface2, color: C.paper }} className="text-xs font-bold py-2.5 rounded-lg">Copy Link</button>
              <button onClick={() => onToast('Simulated share — Text Message.')} style={{ background: C.surface2, color: C.paper }} className="text-xs font-bold py-2.5 rounded-lg">Text Message</button>
              <button onClick={() => onToast('Simulated share — Facebook.')} style={{ background: C.surface2, color: C.paper }} className="text-xs font-bold py-2.5 rounded-lg">Facebook</button>
              <button onClick={() => onToast('Simulated share — Instagram.')} style={{ background: C.surface2, color: C.paper }} className="text-xs font-bold py-2.5 rounded-lg">Instagram</button>
            </div>
            <div style={{ background: C.surface2 }} className="w-24 h-24 rounded-lg mx-auto grid grid-cols-5 grid-rows-5 gap-0.5 p-2">
              {Array.from({ length: 25 }).map((_, i) => <div key={i} style={{ background: (i * 7) % 3 === 0 ? C.paper : 'transparent' }} className="rounded-sm" />)}
            </div>
            <div style={{ color: C.muted }} className="text-[10px] text-center mt-1">Mock QR code</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- CREATE ----------
function CreateScreen({ user, myContent, comps, onToast, reloadContent, onOpenComp }) {
  const [mode, setMode] = useState('upload');
  const [title, setTitle] = useState(''); const [caption, setCaption] = useState(''); const [kind, setKind] = useState('video');
  const [busy, setBusy] = useState(false);
  const openComps = comps.filter(c => c.status !== 'ended');

  const postToProfile = async () => {
    if (!caption.trim()) return onToast('Add a short description for your entry first.');
    setBusy(true);
    const id = uid();
    await sSet(`content:${id}`, { id, username: user.username, title: title.trim(), caption: caption.trim(), kind, createdAt: Date.now() }, true);
    setBusy(false); setTitle(''); setCaption('');
    onToast('Posted to your profile (simulated media — file upload isn\u2019t available in this preview).');
    reloadContent();
  };

  return (
    <div className="pb-4">
      <TopBar title="Create" />
      <div className="px-4 pt-4">
        <div style={{ background: C.surface }} className="flex rounded-xl p-1 mb-5">
          <button onClick={() => setMode('upload')} style={{ background: mode === 'upload' ? C.blue : 'transparent', color: mode === 'upload' ? 'white' : C.muted }} className="flex-1 text-xs font-bold py-2 rounded-lg">Post to Profile — Free</button>
          <button onClick={() => setMode('enter')} style={{ background: mode === 'enter' ? C.pink : 'transparent', color: mode === 'enter' ? 'white' : C.muted }} className="flex-1 text-xs font-bold py-2 rounded-lg">Enter a Competition</button>
        </div>
        {mode === 'upload' ? (
          <div>
            <p style={{ color: C.muted }} className="text-xs mb-3">Free uploads live on your profile and aren't tied to any paid competition.</p>
            <div className="flex gap-2 mb-3">
              <button onClick={() => setKind('video')} style={{ background: kind === 'video' ? C.blue : C.surface, color: kind === 'video' ? 'white' : C.muted }} className="flex-1 text-xs font-bold py-2 rounded-lg">🎬 Video</button>
              <button onClick={() => setKind('photo')} style={{ background: kind === 'photo' ? C.blue : C.surface, color: kind === 'photo' ? 'white' : C.muted }} className="flex-1 text-xs font-bold py-2 rounded-lg">🖼️ Photo</button>
            </div>
            <div style={{ background: C.surface, border: `2px dashed ${C.surface2}` }} className="rounded-xl p-4 mb-3">
              <div className="flex items-center gap-2 mb-2"><Upload size={18} color={C.blue} /><span style={{ color: C.paper }} className="text-xs font-semibold">Simulated media — real file upload isn't available in this preview</span></div>
              <input placeholder="Title (e.g. 'My cover of...')" value={title} onChange={e => setTitle(e.target.value)} style={{ background: C.surface2, color: C.paper, border: 'none' }} className="w-full rounded-lg px-3 py-2 text-sm outline-none mb-2" />
              <textarea placeholder="Short description" value={caption} onChange={e => setCaption(e.target.value)} rows={2} style={{ background: C.surface2, color: C.paper, border: 'none' }} className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none" />
            </div>
            <button onClick={postToProfile} disabled={busy} style={{ background: C.blue, color: 'white' }} className="w-full font-bold py-3 rounded-xl">{busy ? 'Posting…' : 'Post to Profile'}</button>
          </div>
        ) : (
          <div>
            <div style={{ background: 'rgba(46,213,115,0.1)', border: `1px solid ${C.green}` }} className="rounded-xl p-3 mb-4">
              <div style={{ color: C.green }} className="text-xs font-bold">Entry fee, upload, and voting all happen on the competition's own page</div>
              <div style={{ color: C.muted }} className="text-xs mt-0.5">Pick a competition below to see current spots, prize pot, and pay (simulated) &amp; upload.</div>
            </div>
            {openComps.length === 0 ? <EmptyState text="No open competitions right now." /> : (
              <div className="flex flex-col gap-2">{openComps.map(c => (
                <button key={c.id} onClick={() => onOpenComp(c, 'compete')} style={{ background: C.surface, border: `1px solid ${C.surface2}` }} className="rounded-xl p-3 text-left flex items-center gap-3">
                  <span className="text-xl">{CAT_EMOJI[c.category]}</span><span style={{ color: C.paper }} className="text-sm">{c.title}</span>
                </button>
              ))}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function WinnersScreen({ comps, onOpenComp }) {
  const ended = comps.filter(c => c.status === 'ended').sort((a, b) => (b.endedAt || 0) - (a.endedAt || 0));
  return (
    <div className="pb-4">
      <TopBar title="Winners" />
      <div className="px-4 pt-4">
        <p style={{ color: C.muted }} className="text-xs mb-1">Completed test competitions.</p>
        <div className="mb-4"><TestTag text="No real cash prizes in customer testing" /></div>
        {ended.length === 0 ? <EmptyState text="No test competitions have ended yet." /> : <div className="flex flex-col gap-3">{ended.map(c => <CompCard key={c.id} comp={c} onOpen={onOpenComp} />)}</div>}
      </div>
    </div>
  );
}

function ProfileScreen({ user, myContent, myEntries, comps, wallet, onFeedback, onAdmin, onLogout, onOpenComp, onToast }) {
  const [tab, setTab] = useState('uploads');
  const [reposts, setReposts] = useState([]);
  const wins = comps.filter(c => c.status === 'ended' && c.winnerEntryId && myEntries.some(e => e.id === c.winnerEntryId));
  useEffect(() => {
    (async () => {
      let all = [];
      try { all = await sGetMany(await sList('repost:', true), true); } catch { all = []; }
      setReposts(all.filter(r => r.repostedBy === user.username).sort((a, b) => b.at - a.at));
    })();
  }, [user.username]);
  return (
    <div className="pb-4">
      <TopBar title="Profile" />
      <div className="px-4 pt-4 flex flex-col items-center">
        <div style={{ background: `linear-gradient(135deg, ${C.blue}, ${C.pink})` }} className="w-20 h-20 rounded-full flex items-center justify-center text-3xl">{user.avatar}</div>
        <div style={{ color: C.paper }} className="font-black text-lg mt-2">@{user.username}</div>
        {user.bio && <div style={{ color: C.muted }} className="text-xs mt-1 text-center max-w-xs">{user.bio}</div>}
        {wins.length > 0 && <div className="flex gap-1 mt-2">{wins.map(c => <span key={c.id} title={c.title} className="text-xl">🏆</span>)}</div>}
        <div className="flex gap-6 mt-3">
          <Stat label="Wins" value={wins.length} color={C.amber} />
          <Stat label="Entries" value={myEntries.length} color={C.pink} />
          <Stat label="Uploads" value={myContent.length} color={C.blue} />
        </div>

        <div style={{ background: C.surface, border: `1px solid ${C.amber}` }} className="w-full rounded-xl p-4 mt-5 flex items-center gap-3">
          <Wallet size={22} color={C.amber} />
          <div className="flex-1">
            <div style={{ color: C.paper }} className="text-sm font-bold">Demo KRUSH Wallet</div>
            <div style={{ color: C.muted }} className="text-[10px]">DEMO / TEST ONLY — NO REAL MONEY</div>
          </div>
          <div style={{ color: C.amber }} className="text-xl font-black">${wallet.balance}</div>
        </div>

        <div style={{ background: C.surface }} className="flex rounded-xl p-1 mt-6 w-full">
          <button onClick={() => setTab('uploads')} style={{ background: tab === 'uploads' ? C.blue : 'transparent', color: tab === 'uploads' ? 'white' : C.muted }} className="flex-1 text-xs font-bold py-2 rounded-lg">Uploads</button>
          <button onClick={() => setTab('history')} style={{ background: tab === 'history' ? C.blue : 'transparent', color: tab === 'history' ? 'white' : C.muted }} className="flex-1 text-xs font-bold py-2 rounded-lg">Entries</button>
          <button onClick={() => setTab('reposts')} style={{ background: tab === 'reposts' ? C.blue : 'transparent', color: tab === 'reposts' ? 'white' : C.muted }} className="flex-1 text-xs font-bold py-2 rounded-lg">Reposts</button>
        </div>
        <div className="w-full mt-4">
          {tab === 'uploads' ? (myContent.length === 0 ? <EmptyState text="No uploads yet." /> : (
            <div className="flex flex-col gap-2">{myContent.map(c => <div key={c.id} style={{ background: C.surface }} className="rounded-xl p-3 flex items-center gap-3"><span className="text-xl">{c.kind === 'photo' ? '🖼️' : '🎬'}</span><span style={{ color: C.paper }} className="text-sm">{c.title || c.caption}</span></div>)}</div>
          )) : tab === 'history' ? (myEntries.length === 0 ? <EmptyState text="No competitions entered yet." /> : (
            <div className="flex flex-col gap-2">{myEntries.map(e => {
              const c = comps.find(x => x.id === e.compId);
              const won = c?.winnerEntryId === e.id;
              return (
                <div key={e.id} onClick={() => c ? onOpenComp(c, null) : onToast("Couldn't find that competition — it may have been reset.")}
                  role="button" tabIndex={0} style={{ background: C.surface, cursor: 'pointer' }} className="rounded-xl p-3 flex items-center gap-3 w-full text-left active:opacity-70">
                  <span className="text-xl">{c ? CAT_EMOJI[c.category] : '🏆'}</span>
                  <div className="flex-1"><div style={{ color: C.paper }} className="text-sm font-semibold">{c?.title || 'Competition'}</div><div style={{ color: won ? C.amber : C.muted }} className="text-xs">{c?.status === 'ended' ? (won ? '🏆 You won!' : 'Results in') : 'In progress'}</div></div>
                  <span style={{ color: C.blue }} className="text-xs font-bold flex-shrink-0">View Competition &gt;</span>
                </div>
              );
            })}</div>
          )) : (reposts.length === 0 ? <EmptyState text="Nothing reposted yet." /> : (
            <div className="flex flex-col gap-2">{reposts.map(r => (
              <div key={r.id} style={{ background: C.surface }} className="rounded-xl p-3">
                <div style={{ color: C.muted }} className="text-[10px] mb-1.5">@{user.username} reposted</div>
                <div style={{ background: C.surface2 }} className="rounded-lg p-2.5">
                  <div style={{ color: C.paper }} className="text-xs font-bold">@{r.originalUsername}{r.compTitle ? ` · ${r.compTitle}` : ''}</div>
                  <div style={{ color: C.muted }} className="text-xs truncate">{r.originalCaption}</div>
                </div>
                {r.message && <div style={{ color: C.paper }} className="text-xs mt-1.5">{r.message}</div>}
              </div>
            ))}</div>
          ))}
        </div>
        <button onClick={onFeedback} style={{ background: C.blue, color: 'white' }} className="w-full font-bold py-3 rounded-xl mt-6">Give Feedback</button>
        <button onClick={onLogout} style={{ color: C.muted, border: `1px solid ${C.surface2}` }} className="w-full font-bold py-3 rounded-xl mt-3 text-sm">Log Out (test session)</button>
        <button onClick={onAdmin} style={{ color: C.muted }} className="text-xs mt-6 flex items-center gap-1"><Shield size={12} /> Facilitator Tools</button>
      </div>
    </div>
  );
}
function Stat({ label, value, color }) { return <div className="text-center"><div style={{ color }} className="font-black text-lg">{value}</div><div style={{ color: C.muted }} className="text-[10px] uppercase font-semibold">{label}</div></div>; }

const FEEDBACK_QUESTIONS = ['What did you think KRUSH was for when you first opened it?', 'Was it easy or confusing to upload and enter a competition? Why?', 'How did you feel about voting for competitors?', 'Would you use an app like KRUSH if real people were competing for prizes? Why or why not?', 'What is the ONE thing you would change or add?'];
function FeedbackScreen({ user, onBack, onDone, onToast }) {
  const [answers, setAnswers] = useState(['', '', '', '', '']); const [extra, setExtra] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    await sSet(`feedback:${user.username}:${Date.now()}`, { username: user.username, answers, extra, createdAt: Date.now() }, true);
    setBusy(false); onToast('Thanks — your feedback was saved.'); onDone();
  };
  return (
    <div className="pb-8">
      <TopBar title="Feedback" onBack={onBack} />
      <div className="px-4 pt-4">
        <p style={{ color: C.muted }} className="text-xs mb-4">Quick and honest — there are no wrong answers.</p>
        {FEEDBACK_QUESTIONS.map((q, i) => (
          <div key={i} className="mb-4">
            <div style={{ color: C.paper }} className="text-sm font-semibold mb-1.5">{i + 1}. {q}</div>
            <textarea value={answers[i]} onChange={e => { const a = [...answers]; a[i] = e.target.value; setAnswers(a); }} rows={2} style={{ background: C.surface, color: C.paper, border: `1px solid ${C.surface2}` }} className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none" />
          </div>
        ))}
        <div className="mb-4">
          <div style={{ color: C.paper }} className="text-sm font-semibold mb-1.5">Anything else you want us to know? <span style={{ color: C.muted }} className="font-normal">(optional)</span></div>
          <textarea value={extra} onChange={e => setExtra(e.target.value)} rows={2} style={{ background: C.surface, color: C.paper, border: `1px solid ${C.surface2}` }} className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none" />
        </div>
        <button onClick={submit} disabled={busy} style={{ background: C.blue, color: 'white' }} className="w-full font-bold py-3 rounded-xl">{busy ? 'Saving…' : 'Submit Feedback'}</button>
      </div>
    </div>
  );
}

function AdminGate({ onBack, onUnlock }) {
  const [pin, setPin] = useState(''); const [err, setErr] = useState('');
  return (
    <div style={{ background: C.ink }} className="h-full flex flex-col">
      <TopBar title="Facilitator Tools" onBack={onBack} />
      <div className="px-6 pt-10 flex flex-col items-center text-center">
        <Lock size={28} color={C.muted} />
        <p style={{ color: C.muted }} className="text-xs mt-3 mb-4 max-w-xs">Not real security — just a light barrier so testers don't accidentally end up here. Ask your facilitator for the PIN.</p>
        <input value={pin} onChange={e => setPin(e.target.value)} placeholder="Enter PIN" style={{ background: C.surface, color: C.paper, border: `1px solid ${C.surface2}` }} className="rounded-lg px-4 py-3 text-sm outline-none w-full max-w-xs text-center" />
        {err && <div style={{ color: C.red }} className="text-xs mt-2">{err}</div>}
        <button onClick={() => pin === ADMIN_PIN ? onUnlock() : setErr('Incorrect PIN.')} style={{ background: C.blue, color: 'white' }} className="w-full max-w-xs font-bold py-3 rounded-xl mt-4">Enter</button>
      </div>
    </div>
  );
}
function AdminPanel({ comps, reloadComps, onBack, onToast }) {
  const [expanded, setExpanded] = useState(null);
  const [details, setDetails] = useState({ entries: [], contents: {}, totals: {} });

  const endNow = async (comp) => {
    if (!comp.countdownStartedAt) { onToast('This competition needs at least 2 entries before it can be ended.'); return; }
    await sSet(`comp:${comp.id}`, { ...comp, endsAt: Date.now() }, true); // will be finished next time anyone opens it
    onToast(`${comp.title} will show results as soon as it's opened by anyone (End Now sets the timer to zero).`);
    reloadComps();
  };
  const resetComp = async (comp) => {
    for (const k of await sList(`entry:${comp.id}:`, true)) await sDelete(k, true);
    for (const k of await sList(`voteamt:${comp.id}:`, true)) await sDelete(k, true);
    for (const k of await sList(`freevote:${comp.id}:`, true)) await sDelete(k, true);
    for (const k of await sList(`credits:${comp.id}:`, true)) await sDelete(k, true);
    for (const k of await sList(`role:${comp.id}:`, true)) await sDelete(k, true);
    await sDelete(`walletlog:${comp.id}`, true);
    await sSet(`comp:${comp.id}`, { ...comp, status: 'waiting', countdownStartedAt: null, endsAt: null, endedAt: null, winnerEntryId: null, top3: [] }, true);
    onToast(`${comp.title}: real tester entries/votes cleared. (Its built-in demo contestants are fixed and always shown.)`);
    reloadComps();
    if (expanded === comp.id) openDetails({ ...comp, id: comp.id });
  };
  const openDetails = async (comp) => {
    setExpanded(comp.id);
    const entries = await getEffectiveEntries(comp.id);
    const contents = {};
    for (const e of entries) contents[e.contentId] = e.mockCaption ? mockContentFor(e) : await sGet(`content:${e.contentId}`, true);
    const totals = {};
    for (const e of entries) totals[e.id] = await getVoteTotal(comp.id, e.id, e.baseVotes || 0);
    setDetails({ entries, contents, totals });
  };
  const removeEntry = async (comp, entry) => {
    if (entry.mockCaption) { onToast("This is one of the built-in demo contestants and can't be removed — only entries a real tester submitted can be."); return; }
    await sDelete(`entry:${comp.id}:${entry.id}`, true);
    for (const k of await sList(`voteamt:${comp.id}:${entry.id}:`, true)) await sDelete(k, true);
    onToast('Entry removed.'); openDetails(comp);
  };

  return (
    <div className="pb-8">
      <TopBar title="Facilitator Tools" onBack={onBack} />
      <div className="px-4 pt-4">
        <SectionLabel text={`Competitions (${comps.length})`} />
        <div className="flex flex-col gap-2">
          {comps.map(c => (
            <div key={c.id} style={{ background: C.surface }} className="rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <div><div style={{ color: C.paper }} className="text-sm font-semibold">{CAT_EMOJI[c.category]} {c.title}</div><div style={{ color: C.muted }} className="text-xs uppercase font-bold">{c.status}</div></div>
                <button onClick={() => expanded === c.id ? setExpanded(null) : openDetails(c)} style={{ color: C.blue }} className="text-xs font-bold">{expanded === c.id ? 'Hide' : 'Details'}</button>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {c.countdownStartedAt && c.status !== 'ended' && <button onClick={() => endNow(c)} style={{ background: C.amber, color: '#1a1200' }} className="text-xs font-bold px-3 py-1.5 rounded-lg">End Now</button>}
                <button onClick={() => resetComp(c)} style={{ background: C.surface2, color: C.paper }} className="text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"><RefreshCw size={12} /> Reset (new {Math.round(COMPETITION_DURATION_MS / 3600000)}h round)</button>
              </div>
              {expanded === c.id && (
                <div className="mt-3 flex flex-col gap-2">
                  {details.entries.length === 0 ? <div style={{ color: C.muted }} className="text-xs">No entries.</div> : details.entries.map(e => (
                    <div key={e.id} style={{ background: C.surface2 }} className="rounded-lg p-2 flex items-center gap-2">
                      <div className="flex-1"><div style={{ color: C.paper }} className="text-xs font-semibold">@{e.username} — {details.totals[e.id] || 0} votes</div><div style={{ color: C.muted }} className="text-xs truncate">{details.contents[e.contentId]?.title || details.contents[e.contentId]?.caption}</div></div>
                      <button onClick={() => removeEntry(c, e)} style={{ color: C.red }}><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- ROOT ----------
export default function KrushCompetitionApp() {
  const [phase, setPhase] = useState('loading');
  const [screen, setScreen] = useState('home');
  const [user, setUser] = useState(null);
  const [signupDraft, setSignupDraft] = useState(null);
  const [profileDraft, setProfileDraft] = useState(null);
  const [comps, setComps] = useState(() => buildMockComps()); const [compsLoading, setCompsLoading] = useState(false);
  const [myContent, setMyContent] = useState([]); const [myEntries, setMyEntries] = useState([]);
  const [wallet, setWallet] = useState({ balance: 0 });
  const [openComp, setOpenComp] = useState(null);
  const [catFilter, setCatFilter] = useState('All');
  const [openCompIntent, setOpenCompIntent] = useState(null);
  const openCompWithIntent = (c, intent) => { setOpenComp(c); setOpenCompIntent(intent || null); };
  const [inAdmin, setInAdmin] = useState(false); const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [inFeedback, setInFeedback] = useState(false);
  const [toast, setToast] = useState(null);

  // ---- Home video feed + notifications state ----
  const [feedPosts] = useState(() => FEED_POSTS_RAW.map(p => ({ ...p, endsAt: Date.now() + p.endsInMs })));
  const [feedState, setFeedState] = useState({ liked: {}, following: {}, notifPrefs: {}, notifRead: [] });
  const [videoPost, setVideoPost] = useState(null);
  const [resultsPost, setResultsPost] = useState(null);
  const [creatorPost, setCreatorPost] = useState(null);
  const [commentsFor, setCommentsFor] = useState(null);
  const [commentsTick, setCommentsTick] = useState(0);
  const closeFeedComments = () => { setCommentsFor(null); setCommentsTick(t => t + 1); };
  const [shareForPost, setShareForPost] = useState(null);
  const [inNotifs, setInNotifs] = useState(false);
  const [inNotifPrefs, setInNotifPrefs] = useState(false);
  const [pushBanner, setPushBanner] = useState(null);
  const pushShown = useRef(false);

  const unreadCount = NOTIFICATION_TEMPLATES.filter(n => !feedState.notifRead.includes(n.id)).length;

  const saveFeedState = useCallback(async (u, next) => { setFeedState(next); await sSet(`feedstate:${u.username}`, next, true); }, []);
  const loadFeedState = useCallback(async (u) => {
    const stored = await sGet(`feedstate:${u.username}`, true);
    const fs = { liked: {}, following: {}, notifPrefs: {}, notifRead: [], ...stored };
    setFeedState(fs);
  }, []);

  const reloadComps = useCallback(async () => {
    const base = buildMockComps();
    let storageMap = {};
    try {
      const list = await sGetMany(await sList('comp:', true), true);
      storageMap = Object.fromEntries(list.map(c => [c.id, c]));
    } catch { storageMap = {}; }
    setComps(base.map(c => storageMap[c.id] || c));
  }, []);
  const reloadMine = useCallback(async (u) => {
    if (!u) return;
    const allContent = await sGetMany(await sList('content:', true), true);
    setMyContent(allContent.filter(c => c.username === u.username).sort((a, b) => b.createdAt - a.createdAt));
    const allEntries = await sGetMany(await sList('entry:', true), true);
    setMyEntries(allEntries.filter(e => e.username === u.username));
    const w = await sGet(`wallet:${u.username}`, true);
    setWallet(w || { balance: 0 });
  }, []);

  useEffect(() => {
    (async () => {
      await reloadComps();
      const session = await sGet('session', false);
      if (session?.username) {
        const u = await sGet(`user:${session.username}`, true);
        if (u) { setUser(u); await reloadMine(u); await loadFeedState(u); setPhase('app'); return; }
      }
      setPhase('welcome');
    })();
  }, [reloadComps, reloadMine, loadFeedState]);

  const checkUsername = async (username) => !!(await sGet(`user:${username}`, true));
  const findUser = async (username) => await sGet(`user:${username}`, true);
  const finishProfileSetup = ({ username, bio, avatar }) => {
    setProfileDraft({ username, bio, avatar });
    setPhase('interests');
  };
  const completeOnboarding = async (interests) => {
    const { username, bio, avatar } = profileDraft;
    const u = { username, displayName: signupDraft.displayName, bio, avatar, email: signupDraft.email, interests, createdAt: Date.now() };
    await sSet(`user:${username}`, u, true);
    await sSet('session', { username }, false);
    const existingWallet = await sGet(`wallet:${username}`, true);
    if (!existingWallet) await sSet(`wallet:${username}`, { balance: STARTING_WALLET_BALANCE }, true);
    setUser(u); await reloadMine(u); await loadFeedState(u); setPhase('app'); setToast('Account created for this test session.');
  };
  const login = async (u) => { await sSet('session', { username: u.username }, false); setUser(u); await reloadMine(u); await loadFeedState(u); setPhase('app'); };
  const logout = async () => { await sDelete('session', false); setUser(null); setPhase('welcome'); setScreen('home'); };

  const showToast = (m) => setToast(m);

  useEffect(() => {
    if (phase === 'app' && !pushShown.current) {
      pushShown.current = true;
      const t = setTimeout(() => setPushBanner(NOTIFICATION_TEMPLATES[3].text), 2500);
      return () => clearTimeout(t);
    }
  }, [phase]);

  const toggleFeedLike = async (post) => {
    if (!user) return;
    const nowLiked = !feedState.liked[post.id];
    const next = { ...feedState, liked: { ...feedState.liked, [post.id]: nowLiked } };
    await saveFeedState(user, next);
    if (nowLiked) showToast('Liked!');
  };
  const toggleFollow = async (creator) => {
    const next = { ...feedState, following: { ...feedState.following, [creator]: !feedState.following[creator] } };
    await saveFeedState(user, next);
  };
  const openFeedComments = (post) => setCommentsFor({ id: post.id, username: post.creator });
  const openFeedShare = (post) => setShareForPost({ id: post.id, username: post.creator, caption: post.caption });
  const togglePref = async (id, val) => {
    const next = { ...feedState, notifPrefs: { ...feedState.notifPrefs, [id]: val } };
    await saveFeedState(user, next);
  };
  const resolveNotifLink = async (n) => {
    const next = { ...feedState, notifRead: feedState.notifRead.includes(n.id) ? feedState.notifRead : [...feedState.notifRead, n.id] };
    await saveFeedState(user, next);
    setInNotifs(false);
    if (n.linkType === 'creator') {
      const match = feedPosts.find(p => p.creator === n.linkTarget);
      if (match) setCreatorPost(match); else showToast('That creator is demo content and has no profile to open.');
    } else if (n.linkType === 'comp') {
      const match = comps.find(c => c.title === n.linkTarget);
      if (match) openCompWithIntent(match, null); else showToast(`"${n.linkTarget}" is demo flavor content in this build.`);
    } else {
      showToast('Noted.');
    }
  };

  if (phase === 'loading') return <Shell><div className="h-full flex items-center justify-center"><Spinner /></div></Shell>;
  if (phase === 'welcome') return <Shell><SplashOrWelcome onSignUp={() => setPhase('signup')} onLogIn={() => setPhase('login')} /></Shell>;
  if (phase === 'signup') return <Shell><SignUpScreen onBack={() => setPhase('welcome')} onNext={(draft) => { setSignupDraft(draft); setPhase('profilesetup'); }} /></Shell>;
  if (phase === 'profilesetup') return <Shell><ProfileSetupScreen draft={signupDraft} initial={profileDraft} onBack={() => setPhase('signup')} onDone={finishProfileSetup} checkUsername={checkUsername} /></Shell>;
  if (phase === 'interests') return <Shell><InterestsScreen initialSelected={profileDraft?.interests} onBack={() => setPhase('profilesetup')} onContinue={completeOnboarding} /></Shell>;
  if (phase === 'login') return <Shell><LogInScreen onBack={() => setPhase('welcome')} onLogin={login} findUser={findUser} /></Shell>;

  if (openComp) {
    return (
      <Shell>
        <CompetitionDetail key={openComp.id} comp={comps.find(c => c.id === openComp.id) || openComp} user={user} initialIntent={openCompIntent}
          onBack={() => { setOpenComp(null); setOpenCompIntent(null); reloadComps(); reloadMine(user); }} onToast={showToast}
          onCompUpdated={(updated) => { setComps(cs => cs.map(c => c.id === updated.id ? updated : c)); setOpenComp(updated); reloadMine(user); }} />
        {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      </Shell>
    );
  }
  if (inFeedback) return <Shell><FeedbackScreen user={user} onBack={() => setInFeedback(false)} onDone={() => setInFeedback(false)} onToast={showToast} />{toast && <Toast message={toast} onDone={() => setToast(null)} />}</Shell>;
  if (inAdmin) return (
    <Shell>
      {!adminUnlocked ? <AdminGate onBack={() => setInAdmin(false)} onUnlock={() => setAdminUnlocked(true)} /> : <AdminPanel comps={comps} reloadComps={reloadComps} onBack={() => setInAdmin(false)} onToast={showToast} />}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </Shell>
  );
  if (inNotifPrefs) return <Shell><NotificationPrefsScreen prefs={feedState.notifPrefs} onBack={() => setInNotifPrefs(false)} onToggle={togglePref} />{toast && <Toast message={toast} onDone={() => setToast(null)} />}</Shell>;
  if (inNotifs) return <Shell><NotificationCenter onBack={() => setInNotifs(false)} onOpenPrefs={() => { setInNotifs(false); setInNotifPrefs(true); }} onResolveLink={resolveNotifLink} />{toast && <Toast message={toast} onDone={() => setToast(null)} />}</Shell>;
  if (videoPost) return <Shell><VideoModal post={videoPost} liked={!!feedState.liked[videoPost.id]} onToggleLike={toggleFeedLike} onClose={() => setVideoPost(null)} onComment={(p) => { setVideoPost(null); setCommentsFor(p); }} commentsTick={commentsTick} />{toast && <Toast message={toast} onDone={() => setToast(null)} />}</Shell>;
  if (resultsPost) return <Shell><MockResultsModal post={resultsPost} onClose={() => setResultsPost(null)} /></Shell>;

  const screens = {
    home: (
      <div className="pb-4">
        <div style={{ background: C.ink, borderBottom: `1px solid ${C.surface2}` }} className="sticky top-0 z-30 flex items-center justify-between px-4 py-3">
          <LogoMark size="sm" />
          <button onClick={() => setInNotifs(true)} className="relative" style={{ color: C.paper }}>
            🔔
            {unreadCount > 0 && <span style={{ background: C.pink, color: 'white' }} className="absolute -top-1.5 -right-2 text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{unreadCount}</span>}
          </button>
        </div>
        <div className="px-4 pt-4">
          <h2 style={{ color: C.paper }} className="text-lg font-black mb-1">KRUSH makes winners.</h2>
          <TestTag text="CUSTOMER DISCOVERY TEST — no real prizes" />
          {compsLoading ? <Spinner /> : (
            <>
              <SectionLabel text="For You" color={C.pink} />
              <div style={{ color: C.muted }} className="text-xs mb-3">{user?.interests?.length ? `Based on ${user.interests.join(', ')}, plus a few trending picks` : 'Personalize this by picking interests in onboarding'}</div>
              <div className="flex flex-col gap-4">
                {(() => {
                  const interests = user?.interests || [];
                  const matched = feedPosts.filter(p => interests.includes(p.interest));
                  const others = feedPosts.filter(p => !interests.includes(p.interest));
                  const ordered = [...matched, ...others];

                  const completedMatched = COMPLETED_COMP_POSTS.filter(p => interests.includes(p.interest));
                  const completedOthers = COMPLETED_COMP_POSTS.filter(p => !interests.includes(p.interest)).slice(0, 2);
                  const completedToShow = [...completedMatched, ...completedOthers].slice(0, 4); // cap so completed content never overwhelms regular uploads

                  const blended = [];
                  let ci = 0;
                  ordered.forEach((p, i) => {
                    blended.push({ kind: 'regular', post: p });
                    if ((i + 1) % 3 === 0 && ci < completedToShow.length) blended.push({ kind: 'completed', post: completedToShow[ci++] });
                  });
                  while (ci < completedToShow.length) blended.push({ kind: 'completed', post: completedToShow[ci++] });

                  return blended.map(item => item.kind === 'regular' ? (
                    <FeedPostCard key={item.post.id} post={item.post} liked={!!feedState.liked[item.post.id]}
                      following={!!feedState.following[item.post.creator]} commentsTick={commentsTick}
                      onToggleLike={toggleFeedLike}
                      onOpenVideo={setVideoPost} onOpenCreator={setCreatorPost}
                      onComment={openFeedComments} onShare={openFeedShare} onFollow={toggleFollow} />
                  ) : (
                    <CompletedCompFeedCardConnected key={item.post.id} post={item.post} comps={comps} liked={!!feedState.liked[item.post.id]}
                      following={!!feedState.following[item.post.creator]} commentsTick={commentsTick}
                      onToggleLike={toggleFeedLike} onOpenCreator={setCreatorPost}
                      onComment={openFeedComments} onShare={openFeedShare} onFollow={toggleFollow}
                      onViewRealComp={(c) => openCompWithIntent(c, null)} onViewMock={setResultsPost} />
                  ));
                })()}
              </div>
            </>
          )}
        </div>
      </div>
    ),
    competitions: (
      <div className="pb-4"><TopBar title="Competitions" />
        <div className="px-4 pt-4">
          <TestTag text="CUSTOMER DISCOVERY TEST — no real prizes" />
          {compsLoading ? <Spinner /> : (() => {
            const active = comps.filter(c => c.status !== 'ended');
            const catMatch = (c) => catFilter === 'All' || c.category === catFilter;
            const featured = active.filter(c => c.featured).filter(catMatch);
            const rest = active.filter(c => !c.featured).filter(catMatch);
            const ended = comps.filter(c => c.status === 'ended').filter(catMatch);
            return (
              <>
                <div style={{ color: C.paper }} className="text-sm font-bold mt-3 mb-3">{active.length} active competition{active.length === 1 ? '' : 's'} right now</div>

                <div className="flex gap-2 overflow-x-auto pb-2 mb-1 -mx-4 px-4" style={{ scrollbarWidth: 'none' }}>
                  {['All', ...FILTER_CATEGORIES].map(cat => (
                    <button key={cat} onClick={() => setCatFilter(cat)} style={{ background: catFilter === cat ? C.pink : C.surface, color: catFilter === cat ? 'white' : C.paper, border: `1px solid ${catFilter === cat ? C.pink : C.surface2}` }} className="flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap">{cat === 'All' ? 'All' : `${CAT_EMOJI[cat] || ''} ${cat}`}</button>
                  ))}
                </div>

                <SectionLabel text="Featured Competitions" color={C.pink} />
                <div className="flex flex-col gap-3 mb-4">
                  {featured.length === 0
                    ? <EmptyState text="No featured competitions match this filter." />
                    : featured.map(c => (
                      <FeaturedCompWithCounts key={c.id} comp={c} onWatch={(comp) => openCompWithIntent(comp, 'viewer')} onEnter={(comp) => openCompWithIntent(comp, 'compete')} />
                    ))}
                </div>

                <SectionLabel text="More Active Competitions" />
                <div className="flex flex-col gap-3 mb-4">
                  {rest.length === 0 ? <EmptyState text="No other open competitions match this filter." /> : rest.map(c => <CompCard key={c.id} comp={c} onOpen={(comp) => openCompWithIntent(comp, null)} />)}
                </div>

                <SectionLabel text="Ended" color={C.amber} />
                <div className="flex flex-col gap-3">
                  {ended.length === 0 ? <EmptyState text="No completed competitions match this filter." /> : ended.map(c => <CompCard key={c.id} comp={c} onOpen={(comp) => openCompWithIntent(comp, null)} />)}
                </div>
              </>
            );
          })()}
        </div>
      </div>
    ),
    create: <CreateScreen user={user} myContent={myContent} comps={comps} onToast={showToast} reloadContent={() => reloadMine(user)} onOpenComp={openCompWithIntent} />,
    winners: <WinnersScreen comps={comps} onOpenComp={setOpenComp} />,
    profile: <ProfileScreen user={user} myContent={myContent} myEntries={myEntries} comps={comps} wallet={wallet} onFeedback={() => setInFeedback(true)} onAdmin={() => setInAdmin(true)} onLogout={logout} onOpenComp={(c, intent) => openCompWithIntent(c, intent)} onToast={showToast} />,
  };

  const navigateTab = (id) => {
    setCreatorPost(null); setCommentsFor(null); setShareForPost(null); setVideoPost(null); setResultsPost(null);
    if (id === 'profile') reloadMine(user);
    if (id === 'competitions') reloadComps();
    setScreen(id);
  };

  return (
    <Shell>
      <div className="pb-20">{screens[screen]}</div>
      <BottomNav screen={screen} setScreen={navigateTab} />
      {creatorPost && <CreatorProfileModal post={creatorPost} following={!!feedState.following[creatorPost.creator]} onFollow={toggleFollow} onClose={() => setCreatorPost(null)} />}
      {commentsFor && <CommentsSheet targetId={commentsFor.id} targetLabel={`@${commentsFor.username}`} user={user} onClose={closeFeedComments} onToast={showToast} />}
      {shareForPost && <ShareSheet item={shareForPost} user={user} onClose={() => setShareForPost(null)} onToast={showToast} />}
      {pushBanner && <PushBanner text={pushBanner} onDone={() => setPushBanner(null)} onClick={() => setInNotifs(true)} />}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </Shell>
  );
}
function SplashOrWelcome({ onSignUp, onLogIn }) { const [s, setS] = useState(true); return s ? <SplashScreen onNext={() => setS(false)} /> : <WelcomeScreen onSignUp={onSignUp} onLogIn={onLogIn} />; }
function Shell({ children }) { return <div style={{ background: C.ink, fontFamily: 'system-ui, -apple-system, sans-serif' }} className="w-full h-screen max-w-md mx-auto overflow-y-auto relative">{children}</div>; }
