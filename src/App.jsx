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
        return <button key={id} data-tour={`nav-${id}`} onClick={() => setScreen(id)} className="flex flex-col items-center gap-0.5 px-2 py-1 flex-1"><Icon size={22} color={active ? C.blue : C.muted} /><span style={{ color: active ? C.blue : C.muted }} className="text-[10px] font-semibold">{label}</span></button>;
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
  const prof = useProfile(c.username);
  return (
    <div className="flex gap-2">
      <Avatar profile={prof} fallback={c.avatar} size={32} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span style={{ color: C.paper }} className="text-xs font-bold">@{prof ? handleOf(prof) : c.username}</span>
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
            <div style={{ color: C.muted }} className="text-xs mb-4"><Handle accountId={item.username} />{item.compTitle ? ` · ${item.compTitle}` : ''}</div>
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
              <div style={{ color: C.paper }} className="text-sm font-semibold"><Handle accountId={item.username} /></div>
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
        <div style={{ color: C.muted }} className="text-xs mb-4">Give extra votes to <Handle accountId={entry.username} />. 1 credit = 1 vote. {remaining} credit{remaining === 1 ? '' : 's'} left.</div>
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

// ---------- PROFILE SYSTEM ----------
// Every account has a PERMANENT internal ID: user.username in the stored record. For accounts that existed
// before profile editing, that ID is simply the username they signed up with, so every existing entry, vote,
// comment, upload and wallet stays attached with zero data rewriting. The name people SEE is the separate
// `handle` field (falls back to the permanent ID until someone renames themselves). `handle:{lowercase}`
// records map a public username back to the permanent ID (used for uniqueness checks and login).
// Private data (date of birth) lives under `private:{id}` and is never copied into the public `user:{id}` record.
const handleOf = (u) => (u && (u.handle || u.username)) || '';
const profileCache = new Map(); // accountId -> { p, t }
const profileInflight = new Map();
const profileSubs = new Set();
const cacheProfile = (p) => { if (!p?.username) return; profileCache.set(p.username, { p, t: Date.now() }); profileSubs.forEach(f => { try { f(); } catch {} }); };
async function getProfile(accountId, force = false) {
  if (!accountId) return null;
  const hit = profileCache.get(accountId);
  if (!force && hit && Date.now() - hit.t < 30000) return hit.p;
  if (!force && profileInflight.has(accountId)) return profileInflight.get(accountId);
  const pr = (async () => {
    let p = null;
    try { p = (await sGet(`user:${accountId}`, true)) || null; } catch { p = null; }
    profileCache.set(accountId, { p, t: Date.now() });
    profileInflight.delete(accountId);
    return p;
  })();
  profileInflight.set(accountId, pr);
  return pr;
}
function useProfile(accountId) {
  const [p, setP] = useState(() => profileCache.get(accountId)?.p ?? null);
  useEffect(() => {
    if (!accountId) return undefined;
    let alive = true;
    getProfile(accountId).then(x => { if (alive) setP(x); });
    const sub = () => { const c = profileCache.get(accountId); if (alive && c) setP(c.p); };
    profileSubs.add(sub);
    return () => { alive = false; profileSubs.delete(sub); };
  }, [accountId]);
  return p;
}
const thumbUrl = (url, px) => (typeof url === 'string' && url.includes('/res.cloudinary.com/') && url.includes('/upload/')) ? url.replace('/upload/', `/upload/c_fill,w_${px * 2},h_${px * 2},f_auto,q_auto/`) : url;
function Avatar({ profile, fallback, size = 32, gradient = false }) {
  const url = profile?.avatarUrl;
  const [bad, setBad] = useState(false);
  useEffect(() => { setBad(false); }, [url]);
  const emoji = (profile?.avatar && typeof profile.avatar === 'string' && profile.avatar.length <= 8 ? profile.avatar : null) || fallback || '🙂';
  return (
    <span style={{ width: size, height: size, fontSize: size * 0.5, background: gradient ? `linear-gradient(135deg, ${C.blue}, ${C.pink})` : C.surface2 }} className="rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
      {url && !bad ? <img src={thumbUrl(url, size)} alt="" onError={() => setBad(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : emoji}
    </span>
  );
}
function Handle({ accountId }) { const p = useProfile(accountId); return <>@{p ? handleOf(p) : accountId}</>; }

const RESERVED_HANDLES = ['admin', 'krush', 'support', 'official', 'moderator', 'staff', 'help', 'root'];
function validateHandle(h) {
  if (h.length < 3) return 'Username must be at least 3 characters.';
  if (h.length > 20) return 'Username can be at most 20 characters.';
  if (!/^[a-z0-9_.]+$/.test(h)) return 'Use only lowercase letters, numbers, underscores and periods — no spaces.';
  if (RESERVED_HANDLES.includes(h)) return 'That username is reserved. Please pick another.';
  return '';
}
async function checkHandleAvailable(handle, accountId) {
  const lower = handle.toLowerCase();
  const idx = await sGet(`handle:${lower}`, true);
  if (idx?.accountId && idx.accountId !== accountId) return false;
  let keys = [];
  try { keys = await sList('user:', true); } catch { keys = []; }
  for (const k of keys) {
    const name = String(k).replace(/^user:/, '');
    if (name.toLowerCase() === lower && name !== accountId) return false;
  }
  return true;
}
function parseDob(m, d, y) {
  const mm = parseInt(m, 10), dd = parseInt(d, 10), yy = parseInt(y, 10);
  if (!mm || !dd || !yy || String(y).trim().length !== 4) return { error: 'Enter your full birthdate: month, day and a 4-digit year.' };
  const dt = new Date(yy, mm - 1, dd);
  if (yy < 1900 || dt.getFullYear() !== yy || dt.getMonth() !== mm - 1 || dt.getDate() !== dd) return { error: "That birthdate doesn't look right." };
  const now = new Date();
  let age = now.getFullYear() - yy;
  if (now.getMonth() < mm - 1 || (now.getMonth() === mm - 1 && now.getDate() < dd)) age--;
  if (age < 0) return { error: "That birthdate is in the future." };
  if (age < 18) return { error: 'KRUSH is for people 18 and older, so this birthdate cannot be saved.' };
  const p2 = (n) => String(n).padStart(2, '0');
  return { iso: `${yy}-${p2(mm)}-${p2(dd)}` };
}
const SOCIAL_FIELDS = [
  { k: 'instagram', label: 'Instagram', ph: 'sunnidai', help: 'Just your username', hosts: ['instagram.com'], handleRe: /^[A-Za-z0-9._]{1,30}$/, build: (h) => `https://www.instagram.com/${h}/`, from: /^https:\/\/(?:www\.)?instagram\.com\/([A-Za-z0-9._]+)\/?$/ },
  { k: 'tiktok', label: 'TikTok', ph: 'sunnidai', help: 'Just your username (the @ is optional)', hosts: ['tiktok.com'], handleRe: /^[A-Za-z0-9._]{2,24}$/, build: (h) => `https://www.tiktok.com/@${h}`, from: /^https:\/\/(?:www\.)?tiktok\.com\/@([A-Za-z0-9._]+)\/?$/ },
  { k: 'facebook', label: 'Facebook', ph: 'username, or paste your full profile link', help: 'Username works for most pages. If it opens the wrong page, paste your full profile link instead.', hosts: ['facebook.com', 'fb.com', 'fb.me'], handleRe: /^[A-Za-z0-9.]{5,50}$/, build: (h) => `https://www.facebook.com/${h}`, from: /^https:\/\/(?:www\.)?facebook\.com\/([A-Za-z0-9.]+)\/?$/ },
  { k: 'youtube', label: 'YouTube', ph: '@channelname, or paste your full channel link', help: 'A @channelname works for most channels. Otherwise paste your full channel link.', hosts: ['youtube.com', 'youtu.be'], handleRe: /^[A-Za-z0-9._-]{3,30}$/, build: (h) => `https://www.youtube.com/@${h}`, from: /^https:\/\/(?:www\.)?youtube\.com\/@([A-Za-z0-9._-]+)\/?$/ },
  { k: 'website', label: 'Website', ph: 'yourwebsite.com', help: 'Your full website address', hosts: null },
];
// Turns what the user typed (a username/handle OR a full link) into a safe https link.
function normalizeLink(field, raw) {
  const t = (raw || '').trim();
  if (!t) return { value: '' };
  if (t.length > 200) return { error: 'That is too long.' };
  const lower = t.toLowerCase();
  const looksLikeUrl = !field.build || /^[a-z][a-z0-9+.-]*:\/\//i.test(t) || t.includes('/') || (field.hosts || []).some(h => lower.includes(h));
  if (!looksLikeUrl) {
    const h = t.replace(/^@+/, '');
    if (!field.handleRe.test(h)) return { error: `That doesn't look like a valid ${field.label} username.` };
    return { value: field.build(h) };
  }
  const s = /^[a-z][a-z0-9+.-]*:/i.test(t) ? t : `https://${t}`;
  let u; try { u = new URL(s); } catch { return { error: "That doesn't look like a valid link." }; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return { error: 'Links must start with http:// or https://' };
  const host = u.hostname.toLowerCase().replace(/^www\./, '');
  if (!host.includes('.') || host.includes(' ')) return { error: "That doesn't look like a valid link." };
  if (field.hosts && !field.hosts.some(d => host === d || host.endsWith('.' + d))) return { error: `That doesn't look like a ${field.label} link.` };
  u.protocol = 'https:';
  return { value: u.href };
}
// For editing: show a saved link back as just the username when we can.
function linkToInput(field, url) {
  if (!url) return '';
  if (field.from) { const m = url.match(field.from); if (m) return field.k === 'tiktok' || field.k === 'youtube' ? `@${m[1]}` : m[1]; }
  return url;
}
async function uploadProfilePhoto(blob) {
  const fd = new FormData();
  fd.append('file', blob, 'profile.jpg');
  fd.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.secure_url) throw new Error(data?.error?.message || 'Photo upload failed');
  return data.secure_url;
}
// Brand + UI icon paths from Font Awesome Free (CC BY 4.0, fontawesome.com/license/free). Inline so no extra package is needed.
const ICON_PATHS = {"instagram":{"vb":"0 0 448 512","d":"M224.3 141a115 115 0 1 0 -.6 230 115 115 0 1 0 .6-230zm-.6 40.4a74.6 74.6 0 1 1 .6 149.2 74.6 74.6 0 1 1 -.6-149.2zm93.4-45.1a26.8 26.8 0 1 1 53.6 0 26.8 26.8 0 1 1 -53.6 0zm129.7 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM399 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z"},"tiktok":{"vb":"0 0 448 512","d":"M448.5 209.9c-44 .1-87-13.6-122.8-39.2l0 178.7c0 33.1-10.1 65.4-29 92.6s-45.6 48-76.6 59.6-64.8 13.5-96.9 5.3-60.9-25.9-82.7-50.8-35.3-56-39-88.9 2.9-66.1 18.6-95.2 40-52.7 69.6-67.7 62.9-20.5 95.7-16l0 89.9c-15-4.7-31.1-4.6-46 .4s-27.9 14.6-37 27.3-14 28.1-13.9 43.9 5.2 31 14.5 43.7 22.4 22.1 37.4 26.9 31.1 4.8 46-.1 28-14.4 37.2-27.1 14.2-28.1 14.2-43.8l0-349.4 88 0c-.1 7.4 .6 14.9 1.9 22.2 3.1 16.3 9.4 31.9 18.7 45.7s21.3 25.6 35.2 34.6c19.9 13.1 43.2 20.1 67 20.1l0 87.4z"},"facebook":{"vb":"0 0 512 512","d":"M512 256C512 114.6 397.4 0 256 0S0 114.6 0 256C0 376 82.7 476.8 194.2 504.5l0-170.3-52.8 0 0-78.2 52.8 0 0-33.7c0-87.1 39.4-127.5 125-127.5 16.2 0 44.2 3.2 55.7 6.4l0 70.8c-6-.6-16.5-1-29.6-1-42 0-58.2 15.9-58.2 57.2l0 27.8 83.6 0-14.4 78.2-69.3 0 0 175.9C413.8 494.8 512 386.9 512 256z"},"youtube":{"vb":"0 0 576 512","d":"M549.7 124.1C543.5 100.4 524.9 81.8 501.4 75.5 458.9 64 288.1 64 288.1 64S117.3 64 74.7 75.5C51.2 81.8 32.7 100.4 26.4 124.1 15 167 15 256.4 15 256.4s0 89.4 11.4 132.3c6.3 23.6 24.8 41.5 48.3 47.8 42.6 11.5 213.4 11.5 213.4 11.5s170.8 0 213.4-11.5c23.5-6.3 42-24.2 48.3-47.8 11.4-42.9 11.4-132.3 11.4-132.3s0-89.4-11.4-132.3zM232.2 337.6l0-162.4 142.7 81.2-142.7 81.2z"},"visa":{"vb":"0 0 576 512","d":"M470.1 231.3s7.6 37.2 9.3 45l-33.4 0c3.3-8.9 16-43.5 16-43.5-.2 .3 3.3-9.1 5.3-14.9l2.8 13.4zM576 80l0 352c0 26.5-21.5 48-48 48L48 480c-26.5 0-48-21.5-48-48L0 80C0 53.5 21.5 32 48 32l480 0c26.5 0 48 21.5 48 48zM152.5 331.2l63.2-155.2-42.5 0-39.3 106-4.3-21.5-14-71.4c-2.3-9.9-9.4-12.7-18.2-13.1l-64.7 0-.7 3.1c15.8 4 29.9 9.8 42.2 17.1l35.8 135 42.5 0zm94.4 .2l25.2-155.4-40.2 0-25.1 155.4 40.1 0zm139.9-50.8c.2-17.7-10.6-31.2-33.7-42.3-14.1-7.1-22.7-11.9-22.7-19.2 .2-6.6 7.3-13.4 23.1-13.4 13.1-.3 22.7 2.8 29.9 5.9l3.6 1.7 5.5-33.6c-7.9-3.1-20.5-6.6-36-6.6-39.7 0-67.6 21.2-67.8 51.4-.3 22.3 20 34.7 35.2 42.2 15.5 7.6 20.8 12.6 20.8 19.3-.2 10.4-12.6 15.2-24.1 15.2-16 0-24.6-2.5-37.7-8.3l-5.3-2.5-5.6 34.9c9.4 4.3 26.8 8.1 44.8 8.3 42.2 .1 69.7-20.8 70-53zM528 331.4l-32.4-155.4-31.1 0c-9.6 0-16.9 2.8-21 12.9l-59.7 142.5 42.2 0s6.9-19.2 8.4-23.3l51.6 0c1.2 5.5 4.8 23.3 4.8 23.3l37.2 0z"},"mastercard":{"vb":"0 0 576 512","d":"M482.9 410.3c0 6.8-4.6 11.7-11.2 11.7-6.8 0-11.2-5.2-11.2-11.7s4.4-11.7 11.2-11.7c6.6 0 11.2 5.2 11.2 11.7zM172.1 398.6c-7.1 0-11.2 5.2-11.2 11.7S165 422 172.1 422c6.5 0 10.9-4.9 10.9-11.7-.1-6.5-4.4-11.7-10.9-11.7zm117.5-.3c-5.4 0-8.7 3.5-9.5 8.7l19.1 0c-.9-5.7-4.4-8.7-9.6-8.7zm107.8 .3c-6.8 0-10.9 5.2-10.9 11.7s4.1 11.7 10.9 11.7 11.2-4.9 11.2-11.7c0-6.5-4.4-11.7-11.2-11.7zm105.9 26.1c0 .3 .3 .5 .3 1.1 0 .3-.3 .5-.3 1.1-.3 .3-.3 .5-.5 .8-.3 .3-.5 .5-1.1 .5-.3 .3-.5 .3-1.1 .3-.3 0-.5 0-1.1-.3-.3 0-.5-.3-.8-.5-.3-.3-.5-.5-.5-.8-.3-.5-.3-.8-.3-1.1 0-.5 0-.8 .3-1.1 0-.5 .3-.8 .5-1.1 .3-.3 .5-.3 .8-.5 .5-.3 .8-.3 1.1-.3 .5 0 .8 0 1.1 .3 .5 .3 .8 .3 1.1 .5s.2 .6 .5 1.1zm-2.2 1.4c.5 0 .5-.3 .8-.3 .3-.3 .3-.5 .3-.8s0-.5-.3-.8c-.3 0-.5-.3-1.1-.3l-1.6 0 0 3.5 .8 0 0-1.4 .3 0 1.1 1.4 .8 0-1.1-1.3zM576 81l0 352c0 26.5-21.5 48-48 48L48 481c-26.5 0-48-21.5-48-48L0 81C0 54.5 21.5 33 48 33l480 0c26.5 0 48 21.5 48 48zM64 220.6c0 76.5 62.1 138.5 138.5 138.5 27.2 0 53.9-8.2 76.5-23.1-72.9-59.3-72.4-171.2 0-230.5-22.6-15-49.3-23.1-76.5-23.1-76.4-.1-138.5 62-138.5 138.2zM288 329.4c70.5-55 70.2-162.2 0-217.5-70.2 55.3-70.5 162.6 0 217.5zM145.7 405.7c0-8.7-5.7-14.4-14.7-14.7-4.6 0-9.5 1.4-12.8 6.5-2.4-4.1-6.5-6.5-12.2-6.5-3.8 0-7.6 1.4-10.6 5.4l0-4.4-8.2 0 0 36.7 8.2 0c0-18.9-2.5-30.2 9-30.2 10.2 0 8.2 10.2 8.2 30.2l7.9 0c0-18.3-2.5-30.2 9-30.2 10.2 0 8.2 10 8.2 30.2l8.2 0 0-23-.2 0zM190.6 392l-7.9 0 0 4.4c-2.7-3.3-6.5-5.4-11.7-5.4-10.3 0-18.2 8.2-18.2 19.3 0 11.2 7.9 19.3 18.2 19.3 5.2 0 9-1.9 11.7-5.4l0 4.6 7.9 0 0-36.8zm40.5 25.6c0-15-22.9-8.2-22.9-15.2 0-5.7 11.9-4.8 18.5-1.1l3.3-6.5c-9.4-6.1-30.2-6-30.2 8.2 0 14.3 22.9 8.3 22.9 15 0 6.3-13.5 5.8-20.7 .8l-3.5 6.3c11.2 7.6 32.6 6 32.6-7.5zm35.4 9.3l-2.2-6.8c-3.8 2.1-12.2 4.4-12.2-4.1l0-16.6 13.1 0 0-7.4-13.1 0 0-11.2-8.2 0 0 11.2-7.6 0 0 7.3 7.6 0 0 16.7c0 17.6 17.3 14.4 22.6 10.9zm13.3-13.4l27.5 0c0-16.2-7.4-22.6-17.4-22.6-10.6 0-18.2 7.9-18.2 19.3 0 20.5 22.6 23.9 33.8 14.2l-3.8-6c-7.8 6.4-19.6 5.8-21.9-4.9zM338.9 392c-4.6-2-11.6-1.8-15.2 4.4l0-4.4-8.2 0 0 36.7 8.2 0 0-20.7c0-11.6 9.5-10.1 12.8-8.4l2.4-7.6zm10.6 18.3c0-11.4 11.6-15.1 20.7-8.4l3.8-6.5c-11.6-9.1-32.7-4.1-32.7 15 0 19.8 22.4 23.8 32.7 15l-3.8-6.5c-9.2 6.5-20.7 2.6-20.7-8.6zM416.2 392l-8.2 0 0 4.4c-8.3-11-29.9-4.8-29.9 13.9 0 19.2 22.4 24.7 29.9 13.9l0 4.6 8.2 0 0-36.8zm33.7 0c-2.4-1.2-11-2.9-15.2 4.4l0-4.4-7.9 0 0 36.7 7.9 0 0-20.7c0-11 9-10.3 12.8-8.4l2.4-7.6zm40.3-14.9l-7.9 0 0 19.3c-8.2-10.9-29.9-5.1-29.9 13.9 0 19.4 22.5 24.6 29.9 13.9l0 4.6 7.9 0 0-51.7zm7.6-75.1l0 4.6 .8 0 0-4.6 1.9 0 0-.8-4.6 0 0 .8 1.9 0zm6.6 123.8c0-.5 0-1.1-.3-1.6-.3-.3-.5-.8-.8-1.1s-.8-.5-1.1-.8c-.5 0-1.1-.3-1.6-.3-.3 0-.8 .3-1.4 .3-.5 .3-.8 .5-1.1 .8-.5 .3-.8 .8-.8 1.1-.3 .5-.3 1.1-.3 1.6 0 .3 0 .8 .3 1.4 0 .3 .3 .8 .8 1.1 .3 .3 .5 .5 1.1 .8 .5 .3 1.1 .3 1.4 .3 .5 0 1.1 0 1.6-.3 .3-.3 .8-.5 1.1-.8s.5-.8 .8-1.1c.3-.6 .3-1.1 .3-1.4zm3.2-124.7l-1.4 0-1.6 3.5-1.6-3.5-1.4 0 0 5.4 .8 0 0-4.1 1.6 3.5 1.1 0 1.4-3.5 0 4.1 1.1 0 0-5.4zm4.4-80.5c0-76.2-62.1-138.3-138.5-138.3-27.2 0-53.9 8.2-76.5 23.1 72.1 59.3 73.2 171.5 0 230.5 22.6 15 49.5 23.1 76.5 23.1 76.4 .1 138.5-61.9 138.5-138.4z"},"paypal":{"vb":"0 0 384 512","d":"M111.9 295.9c-3.5 19.2-17.4 108.7-21.5 134-.3 1.8-1 2.5-3 2.5l-74.6 0c-7.6 0-13.1-6.6-12.1-13.9L59.3 46.6c1.5-9.6 10.1-16.9 20-16.9 152.3 0 165.1-3.7 204 11.4 60.1 23.3 65.6 79.5 44 140.3-21.5 62.6-72.5 89.5-140.1 90.3-43.4 .7-69.5-7-75.3 24.2zM357.6 152c-1.8-1.3-2.5-1.8-3 1.3-2 11.4-5.1 22.5-8.8 33.6-39.9 113.8-150.5 103.9-204.5 103.9-6.1 0-10.1 3.3-10.9 9.4-22.6 140.4-27.1 169.7-27.1 169.7-1 7.1 3.5 12.9 10.6 12.9l63.5 0c8.6 0 15.7-6.3 17.4-14.9 .7-5.4-1.1 6.1 14.4-91.3 4.6-22 14.3-19.7 29.3-19.7 71 0 126.4-28.8 142.9-112.3 6.5-34.8 4.6-71.4-23.8-92.6z"},"cashapp":{"vb":"0 0 448 512","d":"M440.3 96.9c-9.4-26.5-30.3-47.4-56.8-57-24.1-7.9-46.3-7.9-91.6-7.9L156 32c-44.8 0-67.2 0-91.3 7.5-26.5 9.6-47.4 30.5-57 57-7.7 24.3-7.7 46.7-7.7 91.7L0 323.8c0 45.2 0 67.4 7.5 91.5 9.6 26.5 30.5 47.4 57 57 24.3 7.7 46.7 7.7 91.6 7.7l135.7 0c45 0 67.4 0 91.6-7.7 26.5-9.6 47.4-30.5 57-57 7.7-24.3 7.7-46.7 7.7-91.5l0-135.5c0-45 0-67.4-7.7-91.5zM323.1 185.4l-25.8 21.1c-2.3 1.9-5.5 1.5-7.3-.9-13.2-16.2-33.7-25.4-56.1-25.4-25 0-40.6 10.9-40.6 26.2-.4 12.8 11.7 19.6 49.1 27.7 47.2 10 68.7 29.7 68.7 62.7 0 41.4-33.7 71.9-86.4 75.3l-5.1 24.5c-.4 2.3-2.6 4.1-5.1 4.1l-40.6 0c-3.4 0-5.8-3.2-5.1-6.4l6.4-27.3c-26-7.5-47.2-22-59.3-39.7-1.5-2.3-1.1-5.3 1.1-7l28.2-22c2.3-1.9 5.8-1.3 7.5 1.1 14.9 20.9 38 33.3 65.7 33.3 25 0 43.8-12.2 43.8-29.7 0-13.4-9.4-19.6-41.2-26.2-54.2-11.7-75.8-31.8-75.8-64.9 0-38.4 32.2-67.2 80.9-71l5.3-25.4c.4-2.3 2.6-4.1 5.1-4.1l39.9 0c3.2 0 5.8 3 5.1 6.2l-6.2 28.4c20.9 6.4 38 17.9 48.7 32.2 1.7 2.1 1.3 5.3-.9 7z"},"venmo":{"vb":"0 0 640 512","d":"M67.8 202.7c2.4 5 3.9 11 3.9 19.8 0 16.2-11.5 39.8-20.7 54.9l-9.9-79.7-41 3.9 18.8 112 46.9 0c20.5-26.9 45.8-65.3 45.8-94.8 0-9.3-1.9-16.6-6.3-23.7l-37.4 7.5zm113-7.1c-42.8 0-63.5 37-63.5 71.9 0 26.9 12.8 48.5 48.4 48.5 14 0 28.5-3 37.8-7.5l5-33.6c-13.2 6.7-23.3 9.3-33.9 9.3-9.7 0-17.1-5.2-17.1-18.3 22-.2 60-9.3 60-38.8 0-18.3-13.2-31.5-36.7-31.5l0 0zm-22.5 48.9c1.1-12.9 11-22 18.6-22 4.3 0 8 2.6 8 7.7 0 10.8-19 14.2-26.6 14.2l0 0zm150.2-48.9c-15.3 0-26.1 5.8-34.3 11.2l-.4-9.3-34.8 0-18.4 116.1 40.2 0 12.7-81.4c3.5-1.7 8.6-4.1 13.8-4.1 3.9 0 7.1 1.3 7.1 6.5 0 2.2-.7 6-.9 8l-11.2 71.1 40 0 12.3-77.5c.7-4.1 1.3-10.3 1.3-14.6 0-15.5-7.1-25.9-27.4-25.9zm183.2 0c-14.9 0-25.7 4.5-37.2 12.7-4.1-7.3-12.3-12.7-24.8-12.7-14.5 0-25.3 5.8-33.3 11.6l-1.1-9.7-34.4 0-18.4 116.1 40.2 0 12.8-81.4c3.5-1.7 8.6-4.1 13.8-4.1 3.9 0 7.1 1.3 7.1 7.1 0 1.5-.4 3.9-.6 5.8l-11.4 72.6 40 0 12.7-81.4c3.7-1.9 8.6-4.1 13.6-4.1 3.9 0 7.1 1.3 7.1 7.1 0 1.5-.4 3.9-.7 5.8l-11.4 72.6 40 0 12.3-77.5c.7-4.1 1.3-10.3 1.3-14.6 0-15.5-7.1-25.9-27.7-25.9l0 0zm102.2 0c-44.7 0-64.2 34.3-64.2 70.9 0 27.8 11.2 50 45.1 50 45.8 0 65-37.5 65-73.7 0-27.4-12.3-47.2-46-47.2zm-13.4 90c-7.1 0-10.1-6.7-10.1-17.5 0-14.2 3.2-42 19-42 7.1 0 9.5 6.5 9.5 15.9 0 14.2-3.5 43.5-18.4 43.5z"},"globe":{"vb":"0 0 512 512","d":"M351.9 280l-190.9 0c2.9 64.5 17.2 123.9 37.5 167.4 11.4 24.5 23.7 41.8 35.1 52.4 11.2 10.5 18.9 12.2 22.9 12.2s11.7-1.7 22.9-12.2c11.4-10.6 23.7-28 35.1-52.4 20.3-43.5 34.6-102.9 37.5-167.4zM160.9 232l190.9 0C349 167.5 334.7 108.1 314.4 64.6 303 40.2 290.7 22.8 279.3 12.2 268.1 1.7 260.4 0 256.4 0s-11.7 1.7-22.9 12.2c-11.4 10.6-23.7 28-35.1 52.4-20.3 43.5-34.6 102.9-37.5 167.4zm-48 0C116.4 146.4 138.5 66.9 170.8 14.7 78.7 47.3 10.9 131.2 1.5 232l111.4 0zM1.5 280c9.4 100.8 77.2 184.7 169.3 217.3-32.3-52.2-54.4-131.7-57.9-217.3L1.5 280zm398.4 0c-3.5 85.6-25.6 165.1-57.9 217.3 92.1-32.7 159.9-116.5 169.3-217.3l-111.4 0zm111.4-48C501.9 131.2 434.1 47.3 342 14.7 374.3 66.9 396.4 146.4 399.9 232l111.4 0z"},"grid":{"vb":"0 0 448 512","d":"M384 96l0 64-64 0 0-64 64 0zm0 128l0 64-64 0 0-64 64 0zm0 128l0 64-64 0 0-64 64 0zM256 288l-64 0 0-64 64 0 0 64zm-64 64l64 0 0 64-64 0 0-64zm-64-64l-64 0 0-64 64 0 0 64zM64 352l64 0 0 64-64 0 0-64zm0-192l0-64 64 0 0 64-64 0zm128 0l0-64 64 0 0 64-64 0zM64 32C28.7 32 0 60.7 0 96L0 416c0 35.3 28.7 64 64 64l320 0c35.3 0 64-28.7 64-64l0-320c0-35.3-28.7-64-64-64L64 32z"},"feed":{"vb":"0 0 512 512","d":"M40 48C26.7 48 16 58.7 16 72l0 48c0 13.3 10.7 24 24 24l48 0c13.3 0 24-10.7 24-24l0-48c0-13.3-10.7-24-24-24L40 48zM192 64c-17.7 0-32 14.3-32 32s14.3 32 32 32l288 0c17.7 0 32-14.3 32-32s-14.3-32-32-32L192 64zm0 160c-17.7 0-32 14.3-32 32s14.3 32 32 32l288 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-288 0zm0 160c-17.7 0-32 14.3-32 32s14.3 32 32 32l288 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-288 0zM16 232l0 48c0 13.3 10.7 24 24 24l48 0c13.3 0 24-10.7 24-24l0-48c0-13.3-10.7-24-24-24l-48 0c-13.3 0-24 10.7-24 24zM40 368c-13.3 0-24 10.7-24 24l0 48c0 13.3 10.7 24 24 24l48 0c13.3 0 24-10.7 24-24l0-48c0-13.3-10.7-24-24-24l-48 0z"}};
function Icon({ name, size = 18, color }) {
  const i = ICON_PATHS[name];
  if (!i) return null;
  return <svg viewBox={i.vb} width={size} height={size} fill="currentColor" aria-hidden="true" style={{ color, flexShrink: 0 }}><path d={i.d} /></svg>;
}
const SOCIAL_STYLE = {
  instagram: { color: '#FFFFFF', bg: 'linear-gradient(45deg,#F9A825,#E1306C 55%,#833AB4)' },
  tiktok: { color: '#FFFFFF', bg: '#000000' },
  facebook: { color: '#FFFFFF', bg: '#1877F2' },
  youtube: { color: '#FFFFFF', bg: '#FF0000' },
  website: { color: '#FFFFFF', bg: '#4B5573' },
};
function SocialLinks({ links }) {
  const items = SOCIAL_FIELDS.filter(f => links?.[f.k]);
  if (!items.length) return null;
  return (
    <div className="mt-4 w-full">
      <div style={{ color: C.muted }} className="text-[10px] font-bold uppercase tracking-wide text-center mb-2">Socials</div>
      <div className="flex flex-wrap justify-center gap-4">
        {items.map(f => {
          const st = SOCIAL_STYLE[f.k];
          return (
            <a key={f.k} href={links[f.k]} target="_blank" rel="noopener noreferrer nofollow" aria-label={`Open ${f.label}`} className="flex flex-col items-center gap-1">
              <span style={{ background: st.bg, color: st.color, width: 46, height: 46 }} className="rounded-full flex items-center justify-center"><Icon name={f.k === 'website' ? 'globe' : f.k} size={22} /></span>
              <span style={{ color: C.muted }} className="text-[10px] font-semibold">{f.label}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
function InterestChips({ interests }) {
  const list = (interests || []).map(id => INTEREST_OPTIONS.find(o => o.id === id)).filter(Boolean);
  if (!list.length) return null;
  return <div className="flex flex-wrap justify-center gap-1.5 mt-3">{list.map(o => <span key={o.id} style={{ background: 'rgba(255,46,126,0.12)', color: C.pink }} className="text-[11px] font-bold px-2.5 py-1 rounded-full">{o.emoji} {o.label}</span>)}</div>;
}

// Square, circular crop: drag to reposition, slider to zoom. Output is a 512x512 JPEG (uploaded to Cloudinary on Save).
function PhotoCropper({ file, onCancel, onDone }) {
  const V = 280;
  const [img, setImg] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [off, setOff] = useState({ x: 0, y: 0 });
  const [err, setErr] = useState('');
  const drag = useRef(null);
  useEffect(() => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => {
      const min = Math.max(V / im.naturalWidth, V / im.naturalHeight);
      setImg(im); setZoom(1);
      setOff({ x: (V - im.naturalWidth * min) / 2, y: (V - im.naturalHeight * min) / 2 });
    };
    im.onerror = () => setErr("We couldn't read that picture. Try a different photo (JPG or PNG).");
    im.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const minScale = img ? Math.max(V / img.naturalWidth, V / img.naturalHeight) : 1;
  const scale = minScale * zoom;
  const clamp = (o, s) => ({ x: Math.min(0, Math.max(V - img.naturalWidth * s, o.x)), y: Math.min(0, Math.max(V - img.naturalHeight * s, o.y)) });
  const changeZoom = (z) => {
    if (!img) return;
    const ns = minScale * z;
    const cx = (V / 2 - off.x) / scale, cy = (V / 2 - off.y) / scale;
    setZoom(z); setOff(clamp({ x: V / 2 - cx * ns, y: V / 2 - cy * ns }, ns));
  };
  const down = (e) => { if (!img) return; try { e.currentTarget.setPointerCapture(e.pointerId); } catch {} drag.current = { sx: e.clientX, sy: e.clientY, ox: off.x, oy: off.y }; };
  const move = (e) => { const d = drag.current; if (!d || !img) return; setOff(clamp({ x: d.ox + (e.clientX - d.sx), y: d.oy + (e.clientY - d.sy) }, scale)); };
  const up = () => { drag.current = null; };
  const confirm = () => {
    if (!img) return;
    const c = document.createElement('canvas'); c.width = 512; c.height = 512;
    const ctx = c.getContext('2d'); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 512, 512);
    ctx.drawImage(img, -off.x / scale, -off.y / scale, V / scale, V / scale, 0, 0, 512, 512);
    c.toBlob(b => { if (b) onDone(b); else setErr('Something went wrong preparing that photo. Please try again.'); }, 'image/jpeg', 0.88);
  };
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center px-6" style={{ background: 'rgba(0,0,0,0.92)', zIndex: 120 }}>
      <div style={{ color: C.paper }} className="font-black text-base mb-1">Adjust your photo</div>
      <div style={{ color: C.muted }} className="text-xs mb-4">Drag to reposition. Use the slider to zoom.</div>
      {err ? <div style={{ color: C.red }} className="text-sm text-center max-w-xs mb-4">{err}</div> : (
        <div onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} style={{ width: V, height: V, touchAction: 'none', background: '#000', border: `2px solid ${C.pink}` }} className="relative rounded-full overflow-hidden">
          {img && <img src={img.src} alt="" draggable={false} style={{ position: 'absolute', left: off.x, top: off.y, width: img.naturalWidth * scale, height: img.naturalHeight * scale, maxWidth: 'none', userSelect: 'none', pointerEvents: 'none' }} />}
          {!img && <div style={{ color: C.muted }} className="absolute inset-0 flex items-center justify-center text-xs">Loading…</div>}
        </div>
      )}
      {!err && <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={e => changeZoom(parseFloat(e.target.value))} className="w-64 mt-5" aria-label="Zoom" />}
      <div className="flex gap-3 mt-6 w-full max-w-xs">
        <button onClick={onCancel} style={{ color: C.muted, border: `1px solid ${C.surface2}` }} className="flex-1 font-bold py-3 rounded-xl text-sm">Cancel</button>
        {!err && <button onClick={confirm} disabled={!img} style={{ background: C.blue, color: 'white' }} className="flex-1 font-bold py-3 rounded-xl text-sm">Use This Photo</button>}
      </div>
    </div>
  );
}

const fieldBox = { background: C.surface, color: C.paper, border: `1px solid ${C.surface2}`, fontSize: 16 };
function EditProfileScreen({ user, onCancel, onSaved, onToast }) {
  const accountId = user.username; // permanent ID — never changes
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [handle, setHandle] = useState(handleOf(user));
  const [bio, setBio] = useState(user.bio || '');
  const [location, setLocation] = useState(user.location || '');
  const [showLocation, setShowLocation] = useState(!!user.showLocation);
  const [interests, setInterests] = useState(user.interests || []);
  const [links, setLinks] = useState(() => { const o = {}; for (const f of SOCIAL_FIELDS) o[f.k] = linkToInput(f, (user.links || {})[f.k] || ''); return o; });
  const [emoji, setEmoji] = useState(user.avatar || '😎');
  const [photo, setPhoto] = useState(null); // { blob, preview } — chosen but NOT saved until Save Changes
  const [removePhoto, setRemovePhoto] = useState(false);
  const [cropFile, setCropFile] = useState(null);
  const [hasDob, setHasDob] = useState(null); // null = still loading
  const [dob, setDob] = useState({ m: '', d: '', y: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const topRef = useRef(null);
  const emojiChoices = ['😎', '🔥', '⭐', '🎯', '🚀', '💥', '🌟', '🎬'];
  useEffect(() => { let alive = true; sGet(`private:${accountId}`, true).then(p => { if (alive) setHasDob(!!p?.dob); }).catch(() => { if (alive) setHasDob(false); }); return () => { alive = false; }; }, [accountId]);
  useEffect(() => () => { if (photo?.preview) URL.revokeObjectURL(photo.preview); }, [photo]);
  const pickFile = (e) => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f) return; if (!/^image\//.test(f.type) && !/\.(jpe?g|png|heic|heif|webp)$/i.test(f.name)) { setErrors(x => ({ ...x, photo: 'Please choose an image file.' })); return; } if (f.size > 15 * 1024 * 1024) { setErrors(x => ({ ...x, photo: 'That photo is too large (15MB max).' })); return; } setErrors(x => ({ ...x, photo: undefined })); setCropFile(f); };
  const toggleInterest = (id) => setInterests(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length >= 6 ? prev : [...prev, id]);
  const previewProfile = { avatar: emoji, avatarUrl: removePhoto ? null : (photo ? photo.preview : user.avatarUrl) };

  const save = async () => {
    const errs = {};
    const dn = displayName.trim();
    if (!dn) errs.displayName = 'Enter a display name.'; else if (dn.length > 40) errs.displayName = 'Display name can be at most 40 characters.';
    const hv = handle.trim().replace(/^@/, '');
    const handleChanged = hv !== handleOf(user);
    if (handleChanged) { const e = validateHandle(hv.toLowerCase()); if (e) errs.handle = e; }
    if (bio.length > 160) errs.bio = 'Bio can be at most 160 characters.';
    else if (bio.split('\n').length > 4) errs.bio = 'Bio can have at most 4 lines.';
    if (location.trim().length > 60) errs.location = 'Location can be at most 60 characters.';
    if (interests.length < 1) errs.interests = 'Pick at least one interest.';
    const cleanLinks = {}; const linkErrs = {};
    for (const f of SOCIAL_FIELDS) { const r = normalizeLink(f, links[f.k]); if (r.error) linkErrs[f.k] = r.error; else if (r.value) cleanLinks[f.k] = r.value; }
    if (Object.keys(linkErrs).length) errs.links = linkErrs;
    let dobIso = null;
    if (!hasDob && (dob.m || dob.d || dob.y)) { const r = parseDob(dob.m, dob.d, dob.y); if (r.error) errs.dob = r.error; else dobIso = r.iso; }
    if (Object.keys(errs).length) { setErrors(errs); if (topRef.current) topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    setErrors({}); setSaving(true);
    try {
      const newHandle = handleChanged ? hv.toLowerCase() : null;
      if (handleChanged) {
        const ok = await checkHandleAvailable(newHandle, accountId);
        if (!ok) { setErrors({ handle: 'That username is already taken. Try another.' }); setSaving(false); return; }
        await sSet(`handle:${newHandle}`, { accountId }, true);
      }
      let avatarUrl = user.avatarUrl || null;
      if (removePhoto) avatarUrl = null;
      if (photo) avatarUrl = await uploadProfilePhoto(photo.blob);
      const fresh = (await sGet(`user:${accountId}`, true)) || user;
      const updated = { ...fresh, username: accountId, displayName: dn, bio: bio.trim(), avatar: emoji, avatarUrl, location: location.trim(), showLocation: !!location.trim() && showLocation, interests, links: cleanLinks, updatedAt: Date.now() };
      if (newHandle) updated.handle = newHandle;
      await sSet(`user:${accountId}`, updated, true);
      if (dobIso) { await sSet(`private:${accountId}`, { dob: dobIso, savedAt: Date.now() }, true); }
      cacheProfile(updated);
      onToast('✅ Profile saved!');
      onSaved(updated);
    } catch (e) {
      setSaving(false);
      setErrors({ general: photo && /upload|preset|network|fetch/i.test(String(e?.message || e)) ? `Your photo couldn't be uploaded (${e.message || 'network error'}). Nothing was saved — please try again.` : `Something went wrong saving your profile (${e?.message || 'unknown error'}). Please try again.` });
      if (topRef.current) topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  const Err = ({ k }) => errors[k] ? <div style={{ color: C.red }} className="text-xs mt-1.5">{errors[k]}</div> : null;
  const Label = ({ children }) => <div style={{ color: C.paper }} className="text-sm font-bold mb-1.5 mt-5">{children}</div>;
  return (
    <div className="pb-28">
      <TopBar title="Edit Profile" onBack={onCancel} />
      <div ref={topRef} className="px-4 pt-4">
        {errors.general && <div style={{ background: 'rgba(255,77,77,0.12)', color: C.red, border: `1px solid ${C.red}` }} className="text-xs font-semibold rounded-lg px-3 py-2 mb-3">{errors.general}</div>}

        <div className="flex flex-col items-center">
          <Avatar profile={previewProfile} size={96} gradient />
          <div className="flex flex-wrap justify-center gap-2 mt-3">
            <label style={{ background: C.blue, color: 'white' }} className="text-xs font-bold px-4 py-2.5 rounded-lg cursor-pointer">📁 Choose Photo<input type="file" accept="image/*" onChange={pickFile} className="hidden" /></label>
            <label style={{ background: C.surface2, color: C.paper }} className="text-xs font-bold px-4 py-2.5 rounded-lg cursor-pointer">📸 Take Photo<input type="file" accept="image/*" capture="user" onChange={pickFile} className="hidden" /></label>
            {(photo || (user.avatarUrl && !removePhoto)) && <button onClick={() => { setPhoto(null); setRemovePhoto(true); }} style={{ color: C.red, border: `1px solid ${C.surface2}` }} className="text-xs font-bold px-4 py-2.5 rounded-lg">Remove Photo</button>}
          </div>
          {photo && <div style={{ color: C.muted }} className="text-[11px] mt-2">New photo ready — it will be saved when you tap Save Changes.</div>}
          <Err k="photo" />
          <div style={{ color: C.muted }} className="text-[11px] mt-4 mb-1.5">No photo? Pick an avatar:</div>
          <div className="flex gap-2 flex-wrap justify-center">{emojiChoices.map(a => <button key={a} onClick={() => setEmoji(a)} style={{ background: emoji === a ? C.blue : C.surface, border: emoji === a ? `2px solid ${C.blue}` : `1px solid ${C.surface2}` }} className="w-11 h-11 rounded-full text-xl flex items-center justify-center">{a}</button>)}</div>
        </div>

        <Label>Display name</Label>
        <input value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={60} placeholder="Sunni Dai" style={fieldBox} className="w-full rounded-lg px-4 py-3.5 outline-none" /><Err k="displayName" />
        <div style={{ color: C.muted }} className="text-[11px] mt-1">Shown prominently on your profile. Spaces are fine.</div>

        <Label>Username</Label>
        <div className="relative"><span style={{ color: C.muted }} className="absolute left-4 top-1/2 -translate-y-1/2">@</span><input value={handle} onChange={e => setHandle(e.target.value.replace(/\s/g, ''))} maxLength={30} autoCapitalize="none" autoCorrect="off" placeholder="sunnidai" style={{ ...fieldBox, paddingLeft: 32 }} className="w-full rounded-lg pr-4 py-3.5 outline-none" /></div><Err k="handle" />
        <div style={{ color: C.muted }} className="text-[11px] mt-1">3–20 characters: lowercase letters, numbers, _ and . Changing it keeps all your entries, votes, comments and wallet.</div>

        <Label>Bio</Label>
        <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="Detroit singer chasing my dreams! 🎤" style={fieldBox} className="w-full rounded-lg px-4 py-3 outline-none resize-none" />
        <div className="flex justify-between"><Err k="bio" /><div style={{ color: bio.length > 160 ? C.red : C.muted }} className="text-[11px] mt-1 ml-auto">{bio.length}/160</div></div>

        <Label>Location <span style={{ color: C.muted }} className="font-normal">(optional)</span></Label>
        <input value={location} onChange={e => setLocation(e.target.value)} maxLength={80} placeholder="Detroit, Michigan" style={fieldBox} className="w-full rounded-lg px-4 py-3.5 outline-none" /><Err k="location" />
        <label className="flex items-center gap-2 mt-2.5"><input type="checkbox" checked={showLocation} onChange={e => setShowLocation(e.target.checked)} style={{ width: 20, height: 20 }} /><span style={{ color: C.paper }} className="text-xs">Show this city/region on my public profile</span></label>
        <div style={{ color: C.muted }} className="text-[11px] mt-1">Only what you type here — KRUSH never reads your device location.</div>

        <Label>Interests <span style={{ color: C.muted }} className="font-normal">({interests.length}/6)</span></Label>
        <div className="grid grid-cols-3 gap-2">
          {INTEREST_OPTIONS.map(o => { const on = interests.includes(o.id); return <button key={o.id} onClick={() => toggleInterest(o.id)} style={{ background: on ? `linear-gradient(135deg, ${C.blue}, ${C.pink})` : C.surface, border: on ? `2px solid ${C.pink}` : `1px solid ${C.surface2}`, color: on ? 'white' : C.paper }} className="rounded-xl py-3 flex flex-col items-center gap-1 text-[11px] font-bold"><span className="text-xl">{o.emoji}</span>{o.label}</button>; })}
        </div>
        <Err k="interests" />
        <div style={{ color: C.muted }} className="text-[11px] mt-1">These also personalize your For You feed.</div>

        <Label>Social links <span style={{ color: C.muted }} className="font-normal">(optional)</span></Label>
        <div style={{ color: C.muted }} className="text-[11px] -mt-1 mb-2.5">Just type your username — KRUSH builds the link for you. Leave blank to hide.</div>
        <div className="flex flex-col gap-3.5">
          {SOCIAL_FIELDS.map(f => {
            const r = normalizeLink(f, links[f.k]); const typed = (links[f.k] || '').trim();
            return (
              <div key={f.k}>
                <div className="flex items-center gap-2">
                  <span style={{ background: SOCIAL_STYLE[f.k].bg, color: '#fff', width: 40, height: 40 }} className="rounded-full flex items-center justify-center flex-shrink-0"><Icon name={f.k === 'website' ? 'globe' : f.k} size={18} /></span>
                  <input value={links[f.k]} onChange={e => setLinks({ ...links, [f.k]: e.target.value })} placeholder={f.ph} autoCapitalize="none" autoCorrect="off" aria-label={f.label} style={fieldBox} className="flex-1 min-w-0 rounded-lg px-4 py-3.5 outline-none" />
                </div>
                {typed && r.error && <div style={{ color: C.red }} className="text-xs mt-1 ml-12">{r.error}</div>}
                {typed && !r.error && r.value && <div style={{ color: C.green }} className="text-[10px] mt-1 ml-12 break-all">✓ Opens {r.value}</div>}
                <div style={{ color: C.muted }} className="text-[10px] mt-0.5 ml-12">{f.help}</div>
              </div>
            );
          })}
        </div>

        <div style={{ background: C.surface, border: `1px solid ${C.surface2}` }} className="rounded-xl p-4 mt-6">
          <div style={{ color: C.paper }} className="text-sm font-bold">🔒 Private information</div>
          <div style={{ color: C.muted }} className="text-[11px] mt-0.5 mb-3">Only you can see this. It is never shown on your public profile, in competitions, or in share links.</div>
          <div style={{ color: C.paper }} className="text-xs font-bold mb-1.5">Date of birth (KRUSH is 18+)</div>
          {hasDob === null ? <div style={{ color: C.muted }} className="text-xs">Loading…</div> : hasDob ? (
            <div style={{ color: C.green }} className="text-xs font-semibold">✓ Birthdate on file and private. For safety it can't be changed here.</div>
          ) : (
            <>
              <div className="flex gap-2">
                <input value={dob.m} onChange={e => setDob({ ...dob, m: e.target.value.replace(/\D/g, '').slice(0, 2) })} inputMode="numeric" placeholder="MM" style={fieldBox} className="w-1/4 rounded-lg px-3 py-3.5 outline-none text-center" />
                <input value={dob.d} onChange={e => setDob({ ...dob, d: e.target.value.replace(/\D/g, '').slice(0, 2) })} inputMode="numeric" placeholder="DD" style={fieldBox} className="w-1/4 rounded-lg px-3 py-3.5 outline-none text-center" />
                <input value={dob.y} onChange={e => setDob({ ...dob, y: e.target.value.replace(/\D/g, '').slice(0, 4) })} inputMode="numeric" placeholder="YYYY" style={fieldBox} className="flex-1 rounded-lg px-3 py-3.5 outline-none text-center" />
              </div>
              <Err k="dob" />
              <div style={{ color: C.muted }} className="text-[11px] mt-1.5">Optional for now. Once saved it can't be edited here.</div>
            </>
          )}
        </div>
      </div>
      <div style={{ background: C.ink, borderTop: `1px solid ${C.surface2}` }} className="px-4 py-3 sticky bottom-0 flex gap-3">
        <button onClick={onCancel} disabled={saving} style={{ color: C.muted, border: `1px solid ${C.surface2}` }} className="flex-1 font-bold py-3.5 rounded-xl text-sm">Cancel</button>
        <button onClick={save} disabled={saving} style={{ background: C.blue, color: 'white', opacity: saving ? 0.7 : 1 }} className="flex-[2] font-bold py-3.5 rounded-xl text-sm">{saving ? 'Saving…' : 'Save Changes'}</button>
      </div>
      {cropFile && <PhotoCropper file={cropFile} onCancel={() => setCropFile(null)} onDone={(blob) => { if (photo?.preview) URL.revokeObjectURL(photo.preview); setPhoto({ blob, preview: URL.createObjectURL(blob) }); setRemovePhoto(false); setCropFile(null); }} />}
    </div>
  );
}

// Public view of someone else's (or your own) profile. Only explicitly public fields are rendered —
// never email, birthdate, wallet, or settings.
function PublicProfileScreen({ accountId, viewer, onToast, onClose }) {
  const [p, setP] = useState(undefined); // undefined = loading, null = no profile
  const data = useProfileData(accountId);
  useEffect(() => { let alive = true; getProfile(accountId, true).then(x => { if (alive) setP(x); }); return () => { alive = false; }; }, [accountId]);
  return (
    <div className="fixed inset-0 overflow-y-auto" style={{ background: C.ink, zIndex: 90 }}>
      <div className="max-w-md mx-auto pb-10">
        <TopBar title="Profile" onBack={onClose} />
        {p === undefined ? <Spinner /> : p === null ? <EmptyState text="This is a demo contestant, so there's no KRUSH profile to show." /> : (
          <div className="px-4 pt-5 flex flex-col items-center text-center">
            <Avatar profile={p} size={96} gradient />
            <div style={{ color: C.paper }} className="font-black text-xl mt-3">{p.displayName || handleOf(p)}</div>
            <div style={{ color: C.muted }} className="text-sm">@{handleOf(p)}{viewer?.username === accountId && <span> (you)</span>}</div>
            {p.bio && <div style={{ color: C.paper }} className="text-sm mt-2 max-w-xs whitespace-pre-wrap">{p.bio}</div>}
            {p.showLocation && p.location && <div style={{ color: C.muted }} className="text-xs mt-2">📍 {p.location}</div>}
            <InterestChips interests={p.interests} />
            <SocialLinks links={p.links} />
            <ProfileStatsRow data={data} />
            <ProfileTabs accountId={accountId} profile={p} data={data} viewer={viewer} onToast={onToast} />
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- PROFILE STATS, COMPETITION HISTORY, GRID / FEED ----------
// Everything here is calculated from the real records: entry:*, content:*, comp:* and vote totals.
// WIN  = the competition has ended AND its official winner (comp.winnerEntryId) is this user's entry.
// LOSS = the competition has ended and the user's entry was not the official winner.
// Active competitions are "In Progress" (never a loss); canceled competitions are never counted.
const MIN_COMPLETED_FOR_WIN_RATE = 3;
const videoThumb = (url) => (typeof url === 'string' && url.includes('/video/upload/'))
  ? url.replace('/video/upload/', '/video/upload/so_0,c_fill,w_400,h_400,q_auto/').replace(/\.[a-z0-9]{2,4}(\?.*)?$/i, '.jpg')
  : null;
const fmtDate = (ms) => ms ? new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';
async function buildProfileData(accountId) {
  let entries = [], contents = [], storedComps = [];
  try { entries = (await sGetMany(await sList('entry:', true), true)).filter(e => e.username === accountId); } catch {}
  try { contents = (await sGetMany(await sList('content:', true), true)).filter(c => c.username === accountId); } catch {}
  try { storedComps = await sGetMany(await sList('comp:', true), true); } catch {}
  const compMap = Object.fromEntries(buildMockComps().map(c => [c.id, c]));
  for (const c of storedComps) compMap[c.id] = c;
  const contentById = Object.fromEntries(contents.map(c => [c.id, c]));
  const rankCache = {};
  const rankFor = async (comp, entry) => {
    if (!rankCache[comp.id]) {
      const eff = await getEffectiveEntries(comp.id);
      const totals = {};
      for (const e of eff) totals[e.id] = await getVoteTotal(comp.id, e.id, e.baseVotes || 0);
      const ranked = [...eff].sort((a, b) => (totals[b.id] || 0) - (totals[a.id] || 0));
      const pot = eff.reduce((s, e) => s + (typeof e.feePaid === 'number' ? e.feePaid : ENTRY_FEE_STANDARD), 0);
      rankCache[comp.id] = { ranked, totals, pot, count: eff.length };
    }
    const r = rankCache[comp.id];
    return { rank: r.ranked.findIndex(e => e.id === entry.id) + 1, of: r.count, votes: r.totals[entry.id] || 0, pot: r.pot };
  };
  const items = [];
  for (const entry of [...entries].sort((a, b) => (b.enteredAt || 0) - (a.enteredAt || 0))) {
    const comp = compMap[entry.compId];
    if (!comp) continue;
    const content = contentById[entry.contentId] || (await sGet(`content:${entry.contentId}`, true)) || null;
    const { rank, of, votes, pot } = await rankFor(comp, entry);
    const cancelled = /cancel/i.test(comp.status || '');
    const ended = comp.status === 'ended';
    const result = cancelled ? 'cancelled' : ended ? (comp.winnerEntryId === entry.id ? 'win' : 'loss') : 'progress';
    items.push({ entry, content, comp, rank, of, votes, pot, result, at: comp.endedAt || entry.enteredAt });
  }
  const wins = items.filter(i => i.result === 'win').length;
  const losses = items.filter(i => i.result === 'loss').length;
  const completed = wins + losses;
  const infoByContent = Object.fromEntries(items.filter(i => i.content).map(i => [i.content.id, i]));
  const uploads = [...contents].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).map(c => ({ content: c, info: infoByContent[c.id] || null }));
  return {
    items, uploads,
    stats: { wins, losses, completed, entries: items.filter(i => i.result !== 'cancelled').length, uploads: contents.length, winRate: completed >= MIN_COMPLETED_FOR_WIN_RATE ? Math.round((wins / completed) * 100) : null },
  };
}
function useProfileData(accountId) {
  const [data, setData] = useState(null);
  useEffect(() => {
    let alive = true; setData(null);
    buildProfileData(accountId).then(d => { if (alive) setData(d); }).catch(() => { if (alive) setData({ items: [], uploads: [], stats: { wins: 0, losses: 0, completed: 0, entries: 0, uploads: 0, winRate: null } }); });
    return () => { alive = false; };
  }, [accountId]);
  return data;
}
function ProfileStatsRow({ data }) {
  const s = data?.stats; const v = (n) => (s ? n : '–');
  return (
    <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 mt-4">
      <Stat label="Wins" value={v(s?.wins)} color={C.amber} />
      <Stat label="Losses" value={v(s?.losses)} color={C.red} />
      <Stat label="Entries" value={v(s?.entries)} color={C.pink} />
      <Stat label="Uploads" value={v(s?.uploads)} color={C.blue} />
      <Stat label="Win Rate" value={s ? (s.winRate === null ? '—' : `${s.winRate}%`) : '–'} color={C.green} />
    </div>
  );
}
// Auto-plays when mostly on screen, pauses when scrolled away; one video at a time. Same playback behavior as the competition feed.
function AutoplayVideo({ url, muted, onSetMuted }) {
  const boxRef = useRef(null), vidRef = useRef(null), mutedRef = useRef(muted), userPausedRef = useRef(false);
  const [failed, setFailed] = useState(false); const [playing, setPlaying] = useState(false); const [buffering, setBuffering] = useState(false); const [progress, setProgress] = useState(0);
  useEffect(() => { mutedRef.current = muted; if (vidRef.current) vidRef.current.muted = muted; }, [muted]);
  useEffect(() => {
    const box = boxRef.current, v = vidRef.current;
    if (!box || !v || typeof IntersectionObserver === 'undefined') return undefined;
    const start = () => {
      v.muted = mutedRef.current; const p = v.play();
      if (p && p.catch) p.catch(() => { if (!v.muted) { v.muted = true; onSetMuted && onSetMuted(true); const p2 = v.play(); if (p2 && p2.catch) p2.catch(() => setPlaying(false)); } else setPlaying(false); });
    };
    const io = new IntersectionObserver(([en]) => {
      if (en.isIntersecting && en.intersectionRatio >= 0.6) { if (!userPausedRef.current) start(); }
      else { v.pause(); userPausedRef.current = false; try { v.currentTime = 0; } catch {} }
    }, { threshold: [0, 0.25, 0.6, 0.9] });
    io.observe(box);
    return () => { io.disconnect(); v.pause(); };
  }, [url, failed]);
  const onPlay = (ev) => { document.querySelectorAll('video[data-feedvid]').forEach(x => { if (x !== ev.currentTarget) x.pause(); }); };
  const toggle = () => { const v = vidRef.current; if (!v) return; if (v.paused) { userPausedRef.current = false; v.muted = mutedRef.current; const p = v.play(); if (p && p.catch) p.catch(() => setPlaying(false)); } else { userPausedRef.current = true; v.pause(); } };
  if (failed) return (
    <div style={{ background: '#000', color: C.muted }} className="w-full aspect-video flex flex-col items-center justify-center gap-2">
      <span className="text-3xl">⚠️</span><span className="text-xs px-8 text-center">This video couldn't be played. Check your connection and try again.</span>
      <button onClick={() => setFailed(false)} style={{ background: C.surface2, color: C.paper }} className="px-4 py-2 rounded-lg text-xs font-bold">Retry</button>
    </div>
  );
  return (
    <div ref={boxRef} onClick={toggle} className="relative w-full flex items-center justify-center" style={{ background: '#000', minHeight: 240 }}>
      <video ref={vidRef} data-feedvid="1" src={`${url}#t=0.1`} loop muted={muted} playsInline preload="metadata"
        onPlay={onPlay} onPlaying={() => { setPlaying(true); setBuffering(false); }} onPause={() => setPlaying(false)} onWaiting={() => setBuffering(true)} onCanPlay={() => setBuffering(false)}
        onTimeUpdate={(e) => { const d = e.currentTarget.duration; if (d && isFinite(d)) setProgress(e.currentTarget.currentTime / d); }} onError={() => setFailed(true)}
        className="w-full block" style={{ maxHeight: '78vh', objectFit: 'contain', background: '#000' }} />
      {buffering && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} /></div>}
      {!playing && !buffering && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><span style={{ background: 'rgba(0,0,0,0.5)', color: 'white' }} className="w-16 h-16 rounded-full flex items-center justify-center text-3xl">▶</span></div>}
      <button onClick={(e) => { e.stopPropagation(); onSetMuted && onSetMuted(!muted); }} aria-label={muted ? 'Turn sound on' : 'Turn sound off'} style={{ background: 'rgba(0,0,0,0.6)', color: 'white' }} className="absolute top-2 right-2 h-9 px-3 rounded-full text-xs font-bold flex items-center">{muted ? '🔇 Tap for sound' : '🔊'}</button>
      <div className="absolute left-0 right-0 bottom-0 h-1" style={{ background: 'rgba(255,255,255,0.15)' }}><div style={{ width: `${Math.round(progress * 100)}%`, background: C.pink }} className="h-full" /></div>
    </div>
  );
}
const RESULT_STYLE = { win: { label: '🏆 WIN', color: C.amber, bg: 'rgba(255,176,32,0.15)' }, loss: { label: 'LOSS', color: C.red, bg: 'rgba(255,77,77,0.12)' }, progress: { label: 'IN PROGRESS', color: C.blue, bg: 'rgba(46,91,255,0.15)' }, cancelled: { label: 'CANCELED', color: C.muted, bg: C.surface2 } };
const rankLine = (i) => i.result === 'progress' ? `Current Rank: #${i.rank} of ${i.of}` : `Final Rank: #${i.rank} of ${i.of}`;
function ProfileFeedPost({ profile, accountId, upload, focus, muted, onSetMuted, onComment, onShare, refreshTick }) {
  const { content, info } = upload;
  const targetId = info ? info.entry.id : content.id;
  const [n, setN] = useState(0);
  useEffect(() => { countTopLevelComments(targetId).then(setN); }, [targetId, refreshTick]);
  const ref = useRef(null);
  useEffect(() => { if (focus && focus.id === content.id && ref.current) ref.current.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, [focus]);
  const rs = info ? RESULT_STYLE[info.result] : null;
  return (
    <div ref={ref} style={{ background: C.surface }} className="rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <Avatar profile={profile} size={36} />
        <span className="min-w-0"><span style={{ color: C.paper }} className="block text-sm font-bold truncate">{profile?.displayName || `@${accountId}`}</span>{profile?.displayName && <span style={{ color: C.muted }} className="block text-xs truncate">@{handleOf(profile)}</span>}</span>
        {rs && <span style={{ background: rs.bg, color: rs.color }} className="ml-auto text-[10px] font-bold px-2 py-1 rounded-md flex-shrink-0">{rs.label}</span>}
      </div>
      {(content.title || content.caption) && <div className="px-3 pb-2">{content.title && <div style={{ color: C.paper }} className="text-sm font-semibold">{content.title}</div>}{content.caption && <div style={{ color: C.paper }} className="text-sm">{content.caption}</div>}</div>}
      {content.videoUrl ? <AutoplayVideo url={content.videoUrl} muted={muted} onSetMuted={onSetMuted} /> : (
        <div style={{ background: `linear-gradient(135deg, ${C.surface2}, ${C.ink})`, color: C.muted }} className="w-full aspect-video flex flex-col items-center justify-center gap-2"><span className="text-5xl">{content.kind === 'photo' ? '🖼️' : '🎬'}</span><span className="text-xs">No video attached</span></div>
      )}
      <div className="p-3">
        {info && (
          <div className="flex items-center justify-between mb-2.5">
            <span style={{ color: C.amber }} className="text-xs font-black uppercase tracking-wide">🏆 {rankLine(info)}</span>
            <span style={{ color: C.paper }} className="text-xs font-black uppercase">❤️ {info.votes} vote{info.votes === 1 ? '' : 's'}</span>
          </div>
        )}
        {info && <div style={{ color: C.muted }} className="text-[11px] mb-2.5">{CAT_EMOJI[info.comp.category]} {info.comp.title}</div>}
        <div className="flex items-center gap-2">
          <button onClick={() => onComment({ id: targetId, username: accountId })} style={{ background: C.surface2, color: C.paper }} className="flex-1 py-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1">💬 {n}</button>
          <button onClick={() => onShare({ id: targetId, username: accountId, caption: content.caption || '', compTitle: info?.comp.title })} style={{ background: C.surface2, color: C.paper }} className="flex-1 py-3 rounded-lg text-xs font-bold">↗ Share</button>
        </div>
      </div>
    </div>
  );
}
function HistoryCard({ item, onWatch, onOpenComp }) {
  const rs = RESULT_STYLE[item.result];
  const thumb = videoThumb(item.content?.videoUrl);
  return (
    <div style={{ background: C.surface }} className="rounded-xl p-3">
      <div className="flex gap-3">
        <div style={{ background: C.surface2, width: 72, height: 96 }} className="rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
          {thumb ? <img src={thumb} alt="" className="w-full h-full object-cover" /> : <span className="text-2xl">🎬</span>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0"><div style={{ color: C.paper }} className="text-sm font-bold">{CAT_EMOJI[item.comp.category]} {item.comp.title}</div><div style={{ color: C.muted }} className="text-[11px]">{item.comp.category} · {fmtDate(item.at)}</div></div>
            <span style={{ background: rs.bg, color: rs.color }} className="text-[10px] font-bold px-2 py-1 rounded-md flex-shrink-0">{rs.label}</span>
          </div>
          <div style={{ color: C.paper }} className="text-xs font-semibold mt-1.5">{item.result === 'cancelled' ? 'Competition canceled' : rankLine(item)}</div>
          <div style={{ color: C.muted }} className="text-xs">Votes received: <b style={{ color: C.paper }}>{item.votes}</b> · {item.of} competitor{item.of === 1 ? '' : 's'}</div>
          {item.result === 'win' && <div style={{ color: C.amber }} className="text-xs font-bold mt-0.5">Demo prize: {item.pot} tokens</div>}
          <div className="flex gap-2 mt-2">
            {item.content?.videoUrl && <button onClick={() => onWatch(item)} style={{ background: C.blue, color: 'white' }} className="text-[11px] font-bold px-3 py-1.5 rounded-lg">▶ Watch Entry</button>}
            {onOpenComp && <button onClick={() => onOpenComp(item.comp, null)} style={{ background: C.surface2, color: C.paper }} className="text-[11px] font-bold px-3 py-1.5 rounded-lg">Competition &gt;</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
function ProfileTabs({ accountId, profile, data, viewer, onToast, onOpenComp }) {
  const [tab, setTab] = useState('uploads');
  const [view, setView] = useState('grid');
  const [focus, setFocus] = useState(null);
  const [muted, setMuted] = useState(true);
  const [commentsFor, setCommentsFor] = useState(null);
  const [shareFor, setShareFor] = useState(null);
  const [tick, setTick] = useState(0);
  const [reposts, setReposts] = useState([]);
  useEffect(() => {
    let alive = true;
    (async () => { let all = []; try { all = await sGetMany(await sList('repost:', true), true); } catch { all = []; } if (alive) setReposts(all.filter(r => r.repostedBy === accountId).sort((a, b) => b.at - a.at)); })();
    return () => { alive = false; };
  }, [accountId]);
  const watch = (item) => { if (!item.content) return; setTab('uploads'); setView('feed'); setFocus({ id: item.content.id, n: Date.now() }); };
  const tabs = [['uploads', 'Uploads'], ['entries', 'Entries'], ['wins', 'Wins'], ['history', 'History'], ['reposts', 'Reposts']];
  const items = data?.items || [];
  const list = tab === 'wins' ? items.filter(i => i.result === 'win') : tab === 'history' ? items.filter(i => i.result === 'win' || i.result === 'loss') : items.filter(i => i.result !== 'cancelled');
  return (
    <div className="w-full mt-6">
      <div style={{ background: C.surface }} className="flex rounded-xl p-1 w-full">
        {tabs.map(([k, label]) => <button key={k} onClick={() => setTab(k)} style={{ background: tab === k ? C.blue : 'transparent', color: tab === k ? 'white' : C.muted }} className="flex-1 text-[11px] font-bold py-2 rounded-lg">{label}</button>)}
      </div>
      <div className="w-full mt-4">
        {!data ? <Spinner /> : tab === 'uploads' ? (
          <>
            <div className="flex items-center justify-end gap-2 mb-3">
              <button onClick={() => setView('grid')} aria-label="Grid view" style={{ background: view === 'grid' ? C.blue : C.surface, color: view === 'grid' ? 'white' : C.muted }} className="w-10 h-9 rounded-lg flex items-center justify-center"><Icon name="grid" size={16} /></button>
              <button onClick={() => setView('feed')} aria-label="Feed view" style={{ background: view === 'feed' ? C.blue : C.surface, color: view === 'feed' ? 'white' : C.muted }} className="w-10 h-9 rounded-lg flex items-center justify-center"><Icon name="feed" size={16} /></button>
            </div>
            {data.uploads.length === 0 ? <EmptyState text="No uploads yet." /> : view === 'grid' ? (
              <div className="grid grid-cols-3 gap-1">
                {data.uploads.map(u => {
                  const thumb = videoThumb(u.content.videoUrl);
                  const badge = u.info ? (u.info.result === 'win' ? '🏆 WIN' : u.info.result === 'progress' ? `LIVE #${u.info.rank}` : `#${u.info.rank}`) : null;
                  return (
                    <button key={u.content.id} onClick={() => { setView('feed'); setFocus({ id: u.content.id, n: Date.now() }); }} aria-label="Watch video" style={{ background: C.surface2 }} className="relative aspect-square overflow-hidden">
                      {thumb ? <img src={thumb} alt="" loading="lazy" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : null}
                      <span className="absolute inset-0 flex items-center justify-center text-2xl" style={{ color: 'rgba(255,255,255,0.85)', zIndex: 0 }}>{thumb ? '' : (u.content.kind === 'photo' ? '🖼️' : '🎬')}</span>
                      {u.content.videoUrl && <span style={{ background: 'rgba(0,0,0,0.5)', color: 'white' }} className="absolute top-1 right-1 text-[10px] px-1.5 rounded">▶</span>}
                      {badge && <span style={{ background: 'rgba(0,0,0,0.65)', color: u.info.result === 'win' ? C.amber : 'white' }} className="absolute bottom-1 left-1 text-[10px] font-bold px-1.5 py-0.5 rounded">{badge}</span>}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {data.uploads.map(u => <ProfileFeedPost key={u.content.id} profile={profile} accountId={accountId} upload={u} focus={focus} muted={muted} onSetMuted={setMuted} onComment={setCommentsFor} onShare={setShareFor} refreshTick={tick} />)}
              </div>
            )}
          </>
        ) : tab === 'reposts' ? (reposts.length === 0 ? <EmptyState text="Nothing reposted yet." /> : (
          <div className="flex flex-col gap-2">{reposts.map(r => (
            <div key={r.id} style={{ background: C.surface }} className="rounded-xl p-3">
              <div style={{ color: C.muted }} className="text-[10px] mb-1.5"><Handle accountId={accountId} /> reposted</div>
              <div style={{ background: C.surface2 }} className="rounded-lg p-2.5">
                <div style={{ color: C.paper }} className="text-xs font-bold"><Handle accountId={r.originalUsername} />{r.compTitle ? ` · ${r.compTitle}` : ''}</div>
                <div style={{ color: C.muted }} className="text-xs truncate">{r.originalCaption}</div>
              </div>
              {r.message && <div style={{ color: C.paper }} className="text-xs mt-1.5">{r.message}</div>}
            </div>
          ))}</div>
        )) : (list.length === 0 ? <EmptyState text={tab === 'wins' ? 'No wins yet.' : tab === 'history' ? 'No completed competitions yet.' : 'No competitions entered yet.'} /> : (
          <div className="flex flex-col gap-2.5">{list.map(i => <HistoryCard key={i.entry.id} item={i} onWatch={watch} onOpenComp={onOpenComp} />)}</div>
        ))}
      </div>
      {commentsFor && <CommentsSheet targetId={commentsFor.id} targetLabel={`@${commentsFor.username}`} user={viewer} onClose={() => { setCommentsFor(null); setTick(t => t + 1); }} onToast={onToast} />}
      {shareFor && <ShareSheet item={shareFor} user={viewer} onClose={() => setShareFor(null)} onToast={onToast} />}
    </div>
  );
}

// ---------- DEMO KRUSH WALLET ----------
// DEMO ONLY: every token, balance and transaction is simulated. No real money, card, bank or payment data is
// ever collected or moved. The balance is the SAME `wallet:{id}` record the app already used for entry fees and
// winnings; every change now also writes a ledger line `wtx:{id}:{operation}` (that operation key makes a repeated
// tap or retry harmless — the same operation can only be applied once, and a balance can never go below zero).
// EASY-TO-CHANGE WALLET TEST SETTINGS (facilitators can also change these in Facilitator Tools):
const WALLET_DEFAULT_CONFIG = { addTokensEnabled: true, withdrawalFeePct: 3, packages: [10, 25, 50, 100] };
async function getWalletConfig() {
  let stored = null; try { stored = await sGet('config:wallet', true); } catch { stored = null; }
  const pct = Number(stored?.withdrawalFeePct);
  return { ...WALLET_DEFAULT_CONFIG, addTokensEnabled: stored && typeof stored.addTokensEnabled === 'boolean' ? stored.addTokensEnabled : WALLET_DEFAULT_CONFIG.addTokensEnabled, withdrawalFeePct: isFinite(pct) && pct >= 0 && pct <= 50 ? pct : WALLET_DEFAULT_CONFIG.withdrawalFeePct };
}
const txRef = (op) => 'KR-' + String(op).replace(/[^a-z0-9]/gi, '').slice(-8).toUpperCase();
async function applyWalletTx(accountId, { op, type, amount, note, compId, startBalance = 0, extra }) {
  const key = `wtx:${accountId}:${op}`;
  const existing = await sGet(key, true);
  if (existing) return { ok: true, duplicate: true, tx: existing, balance: existing.balanceAfter };
  const w = (await sGet(`wallet:${accountId}`, true)) || { balance: startBalance };
  const bal = Number(w.balance) || 0;
  const next = Math.round((bal + amount) * 100) / 100;
  if (next < 0) return { ok: false, error: 'Not enough demo tokens for that.' };
  await sSet(`wallet:${accountId}`, { ...w, balance: next }, true);
  const tx = { id: op, accountId, type, amount, unit: 'tokens', balanceAfter: next, status: 'Completed', note: note || '', compId: compId || null, ref: txRef(op), at: Date.now(), ...(extra || {}) };
  await sSet(key, tx, true);
  return { ok: true, tx, balance: next };
}
// Voting credits are a separate per-competition allowance (not wallet tokens) — logged for the record without changing the wallet balance.
async function recordCreditEvent(accountId, { op, type, amount, note, compId }) {
  try {
    const w = (await sGet(`wallet:${accountId}`, true)) || { balance: 0 };
    await sSet(`wtx:${accountId}:${op}`, { id: op, accountId, type, amount, unit: 'credits', balanceAfter: Number(w.balance) || 0, status: 'Completed', note: note || '', compId: compId || null, ref: txRef(op), at: Date.now() }, true);
  } catch { /* logging is best-effort; never block a vote */ }
}
const fmtAmt = (n) => (Math.round(n * 100) / 100).toString();
function WalletBanner() {
  return (
    <div style={{ background: 'rgba(255,176,32,0.1)', border: `1px solid ${C.amber}` }} className="rounded-xl px-3 py-2.5 text-center">
      <div style={{ color: C.amber }} className="text-xs font-black tracking-wide">KRUSH TEST MODE — DEMO MODE, NO REAL MONEY</div>
      <div style={{ color: C.muted }} className="text-[10px] mt-0.5">ALL TOKENS, BALANCES, AND TRANSACTIONS ARE SIMULATED. NO REAL MONEY OR PRIZES.</div>
    </div>
  );
}
function WalletScreen({ user, onBack, onChanged, onToast }) {
  const accountId = user.username;
  const [view, setView] = useState('home'); // home | add | withdraw | history | methods | settings
  const [balance, setBalance] = useState(null);
  const [cfg, setCfg] = useState(WALLET_DEFAULT_CONFIG);
  const [txs, setTxs] = useState(null);
  const [pending, setPending] = useState(null); // { op, amount } for add; { op, amount } for withdraw
  const [amountText, setAmountText] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const busyRef = useRef(false);
  const [openMethod, setOpenMethod] = useState(null);
  const load = useCallback(async () => {
    const w = await sGet(`wallet:${accountId}`, true);
    setBalance(Number(w?.balance) || 0);
    setCfg(await getWalletConfig());
    let list = []; try { list = await sGetMany(await sList(`wtx:${accountId}:`, true), true); } catch { list = []; }
    setTxs(list.sort((a, b) => (b.at || 0) - (a.at || 0)));
  }, [accountId]);
  useEffect(() => { load(); }, [load]);
  const go = (v) => { setView(v); setPending(null); setResult(null); setErr(''); setAmountText(''); };
  const bal = balance ?? 0;

  const confirmAdd = async () => {
    if (busyRef.current || !pending) return; busyRef.current = true; setBusy(true); setErr('');
    try {
      const fresh = await getWalletConfig();
      if (!fresh.addTokensEnabled) { setErr('Free demo tokens are turned off right now.'); return; }
      const r = await applyWalletTx(accountId, { op: pending.op, type: 'DEMO TOKEN DEPOSIT', amount: pending.amount, note: 'Free demo tokens — testing only' });
      if (!r.ok) { setErr(r.error); return; }
      setBalance(r.balance); setResult({ kind: 'add', amount: pending.amount, balance: r.balance, duplicate: !!r.duplicate }); setPending(null); onChanged && onChanged(); load();
    } catch (e) { setErr('Something went wrong. Nothing was added — please try again.'); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const wAmount = parseInt(amountText, 10);
  const wValid = Number.isInteger(wAmount) && String(wAmount) === amountText.trim() && wAmount >= 1;
  const feePct = cfg.withdrawalFeePct;
  const wFee = wValid ? Math.round(wAmount * feePct) / 100 : 0;
  const wNet = wValid ? Math.round((wAmount - wFee) * 100) / 100 : 0;
  const reviewWithdraw = () => {
    if (!wValid) { setErr('Enter a whole number of demo tokens (1 or more).'); return; }
    if (wAmount > bal) { setErr(`You only have ${fmtAmt(bal)} demo tokens available.`); return; }
    setErr(''); setPending({ op: uid() + 'w', amount: wAmount });
  };
  const confirmWithdraw = async () => {
    if (busyRef.current || !pending) return; busyRef.current = true; setBusy(true); setErr('');
    try {
      const r = await applyWalletTx(accountId, { op: pending.op, type: 'DEMO WITHDRAWAL', amount: -pending.amount, note: 'Simulated — no real funds transferred', extra: { feePct, feeAmount: wFee, netAmount: wNet } });
      if (!r.ok) { setErr(r.error); return; }
      setBalance(r.balance); setResult({ kind: 'withdraw', amount: pending.amount, fee: r.tx.feeAmount, net: r.tx.netAmount, balance: r.balance, duplicate: !!r.duplicate }); setPending(null); onChanged && onChanged(); load();
    } catch (e) { setErr('Something went wrong. Nothing was withdrawn — please try again.'); }
    finally { busyRef.current = false; setBusy(false); }
  };

  const bigBtn = (label, sub, onClick, color) => <button onClick={onClick} style={{ background: color || C.surface, color: C.paper, border: `1px solid ${C.surface2}` }} className="w-full rounded-xl px-4 py-3.5 text-left flex items-center justify-between"><span><span className="block text-sm font-bold">{label}</span>{sub && <span style={{ color: C.muted }} className="block text-[11px] mt-0.5">{sub}</span>}</span><span style={{ color: C.muted }}>›</span></button>;

  // ----- ADD TOKENS -----
  if (view === 'add') return (
    <div className="pb-8"><TopBar title="Add Tokens" onBack={() => go('home')} />
      <div className="px-4 pt-4 flex flex-col gap-3">
        <WalletBanner />
        {result?.kind === 'add' ? (
          <div style={{ background: C.surface, border: `1px solid ${C.green}` }} className="rounded-xl p-5 text-center">
            <div style={{ color: C.green }} className="text-lg font-black">SUCCESS!</div>
            <div style={{ color: C.paper }} className="text-sm mt-1">{result.amount} Demo Tokens Added.</div>
            <div style={{ color: C.paper }} className="text-base font-bold mt-1">New Balance: {fmtAmt(result.balance)} Tokens.</div>
            <div style={{ color: C.muted }} className="text-[11px] mt-2">No real payment was requested or made.</div>
            <button onClick={() => go('home')} style={{ background: C.blue, color: 'white' }} className="w-full font-bold py-3 rounded-xl mt-4">Back to Wallet</button>
          </div>
        ) : !cfg.addTokensEnabled ? (
          <div style={{ background: C.surface, color: C.muted }} className="rounded-xl p-4 text-sm text-center">Free demo tokens are turned off right now. Ask your facilitator.</div>
        ) : pending ? (
          <div style={{ background: C.surface }} className="rounded-xl p-5 text-center">
            <div style={{ color: C.muted }} className="text-xs">ADD {pending.amount} FREE DEMO TOKENS?</div>
            <div style={{ color: C.paper }} className="text-sm mt-2">Current Balance: {fmtAmt(bal)}</div>
            <div style={{ color: C.paper }} className="text-sm">Tokens Added: +{pending.amount}</div>
            <div style={{ color: C.green }} className="text-base font-black mt-1">New Balance: {fmtAmt(bal + pending.amount)}</div>
            {err && <div style={{ color: C.red }} className="text-xs mt-2">{err}</div>}
            <button onClick={confirmAdd} disabled={busy} style={{ background: C.blue, color: 'white', opacity: busy ? 0.7 : 1 }} className="w-full font-bold py-3 rounded-xl mt-4">{busy ? 'Adding…' : 'Confirm — Add Demo Tokens'}</button>
            <button onClick={() => setPending(null)} disabled={busy} style={{ color: C.muted }} className="w-full text-xs font-semibold py-2 mt-1">Cancel</button>
          </div>
        ) : (
          <>
            <div style={{ color: C.paper }} className="text-sm font-bold">Choose a package</div>
            <div style={{ color: C.green }} className="text-[11px] font-black tracking-wide -mt-2">FREE DEMO TOKENS — TESTING ONLY</div>
            <div className="grid grid-cols-2 gap-3">
              {cfg.packages.map(n => <button key={n} onClick={() => { setErr(''); setPending({ op: uid() + 'd', amount: n }); }} style={{ background: C.surface, border: `1px solid ${C.surface2}`, color: C.paper }} className="rounded-xl py-5 flex flex-col items-center gap-1"><span className="text-2xl font-black">{n}</span><span style={{ color: C.muted }} className="text-[11px] font-semibold">Demo Tokens</span><span style={{ color: C.green }} className="text-[10px] font-bold">FREE</span></button>)}
            </div>
            <div style={{ color: C.muted }} className="text-[11px] text-center">No payment of any kind is requested.</div>
          </>
        )}
      </div>
    </div>
  );
  // ----- WITHDRAW -----
  if (view === 'withdraw') return (
    <div className="pb-8"><TopBar title="Withdraw — Demo" onBack={() => go('home')} />
      <div className="px-4 pt-4 flex flex-col gap-3">
        <WalletBanner />
        {result?.kind === 'withdraw' ? (
          <div style={{ background: C.surface, border: `1px solid ${C.green}` }} className="rounded-xl p-5 text-center">
            <div style={{ color: C.green }} className="text-lg font-black">DEMO WITHDRAWAL COMPLETE</div>
            <div style={{ color: C.paper }} className="text-sm mt-2">Demo Withdrawal: {fmtAmt(result.amount)}</div>
            <div style={{ color: C.muted }} className="text-xs">DEMO fee ({feePct}%): {fmtAmt(result.fee)} · Net: {fmtAmt(result.net)}</div>
            <div style={{ color: C.paper }} className="text-base font-bold mt-1">Remaining Balance: {fmtAmt(result.balance)}</div>
            <div style={{ color: C.muted }} className="text-[11px] mt-2">No real funds were transferred.</div>
            <button onClick={() => go('home')} style={{ background: C.blue, color: 'white' }} className="w-full font-bold py-3 rounded-xl mt-4">Back to Wallet</button>
          </div>
        ) : pending ? (
          <div style={{ background: C.surface }} className="rounded-xl p-5 text-center">
            <div style={{ color: C.muted }} className="text-xs">WITHDRAW {pending.amount} DEMO TOKENS?</div>
            <div style={{ color: C.paper }} className="text-sm mt-2">Current Balance: {fmtAmt(bal)}</div>
            <div style={{ color: C.paper }} className="text-sm">Demo Withdrawal: {pending.amount}</div>
            <div style={{ color: C.amber }} className="text-xs">DEMO fee ({feePct}%): −{fmtAmt(wFee)} · Net amount: {fmtAmt(wNet)}</div>
            <div style={{ color: C.green }} className="text-base font-black mt-1">Remaining Balance: {fmtAmt(bal - pending.amount)}</div>
            <div style={{ color: C.muted }} className="text-[11px] mt-2">Simulated only. No real money moves.</div>
            {err && <div style={{ color: C.red }} className="text-xs mt-2">{err}</div>}
            <button onClick={confirmWithdraw} disabled={busy} style={{ background: C.blue, color: 'white', opacity: busy ? 0.7 : 1 }} className="w-full font-bold py-3 rounded-xl mt-4">{busy ? 'Working…' : 'CONFIRM DEMO WITHDRAWAL'}</button>
            <button onClick={() => setPending(null)} disabled={busy} style={{ color: C.muted }} className="w-full text-xs font-semibold py-2 mt-1">Cancel</button>
          </div>
        ) : (
          <div style={{ background: C.surface }} className="rounded-xl p-5">
            <div style={{ color: C.muted }} className="text-xs">Available: <b style={{ color: C.paper }}>{fmtAmt(bal)} demo tokens</b></div>
            <div style={{ color: C.paper }} className="text-sm font-bold mt-3 mb-1.5">Amount of demo tokens</div>
            <input value={amountText} onChange={e => { setAmountText(e.target.value.replace(/[^0-9]/g, '')); setErr(''); }} inputMode="numeric" placeholder="25" style={{ background: C.surface2, color: C.paper, fontSize: 16 }} className="w-full rounded-lg px-4 py-3.5 outline-none" />
            <div style={{ background: C.surface2 }} className="rounded-lg px-3 py-2 mt-3 text-xs flex items-center justify-between"><span style={{ color: C.paper }} className="font-bold">DEMO WITHDRAWAL</span><span style={{ color: C.muted }}>No real funds</span></div>
            {wValid && <div style={{ color: C.muted }} className="text-xs mt-2">DEMO fee ({feePct}%): −{fmtAmt(wFee)} · Net: {fmtAmt(wNet)}</div>}
            {err && <div style={{ color: C.red }} className="text-xs mt-2">{err}</div>}
            <button onClick={reviewWithdraw} style={{ background: C.blue, color: 'white' }} className="w-full font-bold py-3 rounded-xl mt-4">Review Withdrawal</button>
            <div style={{ color: C.muted }} className="text-[11px] mt-3">This never asks for banking information and never sends money anywhere.</div>
          </div>
        )}
      </div>
    </div>
  );
  // ----- HISTORY -----
  if (view === 'history') {
    const groups = []; (txs || []).forEach(t => { const d = new Date(t.at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase(); const g = groups[groups.length - 1]; if (g && g.d === d) g.list.push(t); else groups.push({ d, list: [t] }); });
    return (
      <div className="pb-8"><TopBar title="Transaction History" onBack={() => go('home')} />
        <div className="px-4 pt-4 flex flex-col gap-3">
          <WalletBanner />
          {txs === null ? <Spinner /> : txs.length === 0 ? <EmptyState text="No wallet activity yet. Add demo tokens, enter a competition, or cast a paid vote and it will show up here." /> : groups.map(g => (
            <div key={g.d}>
              <div style={{ color: C.muted }} className="text-[11px] font-bold tracking-wide mb-1.5 mt-1">{g.d}</div>
              <div className="flex flex-col gap-2">{g.list.map(t => (
                <div key={t.id} style={{ background: C.surface }} className="rounded-xl px-3 py-2.5">
                  <div className="flex items-center justify-between">
                    <span style={{ color: t.amount >= 0 ? C.green : C.paper }} className="text-sm font-black">{t.amount >= 0 ? '+' : '−'}{fmtAmt(Math.abs(t.amount))} {t.unit === 'credits' ? (Math.abs(t.amount) === 1 ? 'Credit' : 'Credits') : (Math.abs(t.amount) === 1 ? 'Token' : 'Tokens')}</span>
                    <span style={{ color: C.green }} className="text-[10px] font-bold">{t.status}</span>
                  </div>
                  <div style={{ color: C.paper }} className="text-xs font-semibold mt-0.5">{t.type}{t.note ? <span style={{ color: C.muted }} className="font-normal"> · {t.note}</span> : null}</div>
                  <div style={{ color: C.muted }} className="text-[10px] mt-1">{new Date(t.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · {t.unit === 'credits' ? 'voting credits (not wallet tokens)' : `Balance after: ${fmtAmt(t.balanceAfter)}`} · Ref {t.ref}{t.feeAmount ? ` · DEMO fee ${fmtAmt(t.feeAmount)}, net ${fmtAmt(t.netAmount)}` : ''}</div>
                </div>
              ))}</div>
            </div>
          ))}
          {txs !== null && <div style={{ color: C.muted }} className="text-[10px] text-center">Only activity recorded since the wallet ledger was added is listed. Earlier activity isn't shown.</div>}
        </div>
      </div>
    );
  }
  // ----- PAYMENT METHODS (preview only) -----
  if (view === 'methods') {
    const methods = [
      { k: 'visa', label: 'Visa', color: '#1A1F71', text: 'Pay with a Visa card.' },
      { k: 'mastercard', label: 'Mastercard', color: '#EB001B', text: 'Pay with a Mastercard.' },
      { k: 'cashapp', label: 'Cash App', color: '#00D64F', text: 'Pay from your Cash App balance.' },
      { k: 'paypal', label: 'PayPal', color: '#003087', text: 'Pay with your PayPal account.' },
      { k: 'venmo', label: 'Venmo', color: '#3D95CE', text: 'Pay with your Venmo account.' },
    ];
    return (
      <div className="pb-8"><TopBar title="Payment Methods" onBack={() => go('home')} />
        <div className="px-4 pt-4 flex flex-col gap-3">
          <WalletBanner />
          <div style={{ background: 'rgba(255,46,126,0.1)', border: `1px solid ${C.pink}`, color: C.pink }} className="rounded-xl px-3 py-2.5 text-center text-xs font-black tracking-wide">COMING SOON — REAL PAYMENTS DISABLED DURING TESTING</div>
          <div style={{ color: C.muted }} className="text-xs">These are possible FUTURE options so testers can see how the finished wallet might work. None of them is connected or active. Tap one to read about it.</div>
          <div className="flex flex-col gap-2">
            {methods.map(m => (
              <div key={m.k} style={{ background: C.surface, border: `1px solid ${C.surface2}` }} className="rounded-xl overflow-hidden">
                <button onClick={() => setOpenMethod(openMethod === m.k ? null : m.k)} className="w-full px-4 py-3 flex items-center gap-3 text-left">
                  <span style={{ color: m.color, background: '#fff' }} className="w-10 h-10 rounded-lg flex items-center justify-center"><Icon name={m.k} size={26} /></span>
                  <span className="flex-1"><span style={{ color: C.paper }} className="block text-sm font-bold">{m.label}</span><span style={{ color: C.muted }} className="block text-[10px] font-semibold">COMING SOON · NOT ACTIVE</span></span>
                  <span style={{ color: C.muted }}>{openMethod === m.k ? '▾' : '›'}</span>
                </button>
                {openMethod === m.k && (
                  <div style={{ borderTop: `1px solid ${C.surface2}`, color: C.muted }} className="px-4 py-3 text-xs flex flex-col gap-1.5">
                    <div style={{ color: C.paper }} className="font-semibold">How it is intended to work (preview only)</div>
                    <div>{m.text} Later, you would link it once, verify it, and use it to add real funds or cash out winnings.</div>
                    <div>Linking would happen through the provider's own secure screens — KRUSH would not see or store your card or login details.</div>
                    <div style={{ color: C.amber }} className="font-semibold">Not available now. Nothing can be entered or charged here. Whether {m.label} can be offered depends on that provider's approval before launch.</div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{ background: C.surface }} className="rounded-xl p-4">
            <div style={{ color: C.paper }} className="text-sm font-bold mb-1.5">Before real payments can launch</div>
            <div style={{ color: C.muted }} className="text-xs mb-2">The finished wallet will need proper checks. None of these exist in this prototype, and no one is marked "verified."</div>
            <ul style={{ color: C.muted }} className="text-xs flex flex-col gap-1 list-disc pl-4">
              <li>Identity verification</li><li>Age verification (KRUSH is 18+)</li><li>Payment method verification</li><li>Fraud prevention</li><li>Withdrawal eligibility</li><li>Account ownership verification</li><li>Each payment provider's own rules and restrictions</li>
            </ul>
            <div style={{ color: C.muted }} className="text-[11px] mt-3">Real-money contests, deposits, withdrawals and prizes stay switched off until legal review of the contest rules, payment processing and financial regulations is complete, using established payment providers.</div>
          </div>
          <div style={{ color: C.red }} className="text-[11px] font-semibold text-center">Do not enter any real card, bank or payment information anywhere in this prototype.</div>
        </div>
      </div>
    );
  }
  // ----- SETTINGS (read-only info) -----
  if (view === 'settings') return (
    <div className="pb-8"><TopBar title="Wallet Settings" onBack={() => go('home')} />
      <div className="px-4 pt-4 flex flex-col gap-3">
        <WalletBanner />
        <div style={{ background: C.surface }} className="rounded-xl p-4 text-xs flex flex-col gap-2.5">
          <div className="flex justify-between"><span style={{ color: C.muted }}>Wallet mode</span><b style={{ color: C.amber }}>DEMO — no real money</b></div>
          <div className="flex justify-between"><span style={{ color: C.muted }}>Free demo tokens</span><b style={{ color: C.paper }}>{cfg.addTokensEnabled ? 'Available' : 'Turned off'}</b></div>
          <div className="flex justify-between"><span style={{ color: C.muted }}>Demo withdrawal fee</span><b style={{ color: C.paper }}>{feePct}% (simulated)</b></div>
          <div className="flex justify-between"><span style={{ color: C.muted }}>Real payments</span><b style={{ color: C.paper }}>Disabled</b></div>
          <div className="flex justify-between"><span style={{ color: C.muted }}>Account</span><b style={{ color: C.paper }}>@{handleOf(user)}</b></div>
        </div>
        <div style={{ color: C.muted }} className="text-[11px]">Only you can open your wallet in the app; other testers can never see your balance or history. The facilitator controls the demo-token and fee settings above. Stronger account-level protection arrives with secure sign-in, before any real money is involved.</div>
      </div>
    </div>
  );
  // ----- HOME -----
  const recent = (txs || []).slice(0, 3);
  return (
    <div className="pb-8"><TopBar title="KRUSH Wallet" onBack={onBack} />
      <div className="px-4 pt-4 flex flex-col gap-3">
        <WalletBanner />
        <div style={{ background: `linear-gradient(135deg, ${C.blue}, ${C.pink})` }} className="rounded-2xl p-6 text-center">
          <div style={{ color: 'rgba(255,255,255,0.85)' }} className="text-[11px] font-bold tracking-wide">AVAILABLE DEMO BALANCE</div>
          <div style={{ color: 'white' }} className="text-4xl font-black mt-1">{balance === null ? '…' : fmtAmt(bal)}</div>
          <div style={{ color: 'white' }} className="text-sm font-bold">KRUSH TOKENS</div>
        </div>
        <div className="flex flex-col gap-2">
          {bigBtn('ADD TOKENS', 'Free demo tokens — testing only', () => go('add'))}
          {bigBtn('WITHDRAW — DEMO', `Simulated only · ${feePct}% DEMO fee`, () => go('withdraw'))}
          {bigBtn('TRANSACTION HISTORY', 'Every deposit, entry, vote and withdrawal', () => { go('history'); load(); })}
          {bigBtn('PAYMENT METHODS', 'Coming soon — real payments disabled', () => go('methods'))}
          {bigBtn('WALLET SETTINGS', null, () => go('settings'))}
        </div>
        {recent.length > 0 && (
          <div>
            <div style={{ color: C.muted }} className="text-[11px] font-bold tracking-wide mb-1.5 mt-2">RECENT ACTIVITY</div>
            <div className="flex flex-col gap-1.5">{recent.map(t => <div key={t.id} style={{ background: C.surface }} className="rounded-lg px-3 py-2 flex items-center justify-between"><span style={{ color: C.paper }} className="text-xs font-semibold">{t.type}</span><span style={{ color: t.amount >= 0 ? C.green : C.paper }} className="text-xs font-black">{t.amount >= 0 ? '+' : '−'}{fmtAmt(Math.abs(t.amount))}{t.unit === 'credits' ? ' cr' : ''}</span></div>)}</div>
          </div>
        )}
      </div>
    </div>
  );
}
function WalletConfigCard({ onToast }) {
  const [cfg, setCfg] = useState(null);
  const [pct, setPct] = useState('3');
  useEffect(() => { getWalletConfig().then(c => { setCfg(c); setPct(String(c.withdrawalFeePct)); }); }, []);
  if (!cfg) return null;
  const save = async (next) => { setCfg(next); await sSet('config:wallet', { addTokensEnabled: next.addTokensEnabled, withdrawalFeePct: next.withdrawalFeePct }, true); onToast('Wallet settings saved.'); };
  return (
    <div style={{ background: C.surface }} className="rounded-xl p-3 mt-2">
      <div style={{ color: C.paper }} className="text-sm font-bold mb-2">Demo wallet settings</div>
      <button onClick={() => save({ ...cfg, addTokensEnabled: !cfg.addTokensEnabled })} style={{ background: cfg.addTokensEnabled ? 'rgba(46,213,115,0.15)' : C.surface2, color: cfg.addTokensEnabled ? C.green : C.muted }} className="w-full text-xs font-bold py-2.5 rounded-lg mb-2">Free demo tokens: {cfg.addTokensEnabled ? 'ON (tap to turn off)' : 'OFF (tap to turn on)'}</button>
      <div className="flex items-center gap-2"><span style={{ color: C.muted }} className="text-xs flex-1">Demo withdrawal fee (%)</span>
        <input value={pct} onChange={e => setPct(e.target.value.replace(/[^0-9.]/g, ''))} onBlur={() => { const n = parseFloat(pct); if (isFinite(n) && n >= 0 && n <= 50) save({ ...cfg, withdrawalFeePct: n }); else setPct(String(cfg.withdrawalFeePct)); }} inputMode="decimal" style={{ background: C.surface2, color: C.paper, fontSize: 16 }} className="w-20 rounded-lg px-3 py-2 text-center outline-none" /></div>
    </div>
  );
}

// ---------- COMPETITION FEED POST ----------
// Large, full-width post for one competition entry — same card shape as the homepage FeedPostCard
// (avatar + @username, caption, big video, action row) but wired to the REAL entry/content records and the
// competition's existing vote / comment / share handlers (passed in). It creates no records of its own.
function CompetitionFeedPost({ entry, content, rank, voteTotal, isSelf, isEnded, live, freeVoteUsed, credits, muted, onSetMuted, onFreeVote, onOpenCredits, onComment, onShare, onOpenProfile, refreshTick }) {
  const [commentCount, setCommentCount] = useState(() => mockCommentsFor(entry.id).length);
  useEffect(() => { countTopLevelComments(entry.id).then(setCommentCount); }, [entry.id, refreshTick]);
  const prof = useProfile(entry.username);
  const boxRef = useRef(null);
  const vidRef = useRef(null);
  const mutedRef = useRef(muted);
  const userPausedRef = useRef(false);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [progress, setProgress] = useState(0);
  useEffect(() => { mutedRef.current = muted; if (vidRef.current) vidRef.current.muted = muted; }, [muted]);
  // Autoplay the post that is mostly on screen; pause + rewind it when it scrolls away.
  // Browsers (iPhone Safari especially) only allow autoplay WITH SOUND after a tap, so playback starts muted
  // and one tap on the sound button turns sound on for every video. If sound is refused, we fall back to muted.
  useEffect(() => {
    const box = boxRef.current, v = vidRef.current;
    if (!box || !v || typeof IntersectionObserver === 'undefined') return undefined;
    const start = () => {
      v.muted = mutedRef.current;
      const p = v.play();
      if (p && p.catch) p.catch(() => {
        if (!v.muted) { v.muted = true; onSetMuted && onSetMuted(true); const p2 = v.play(); if (p2 && p2.catch) p2.catch(() => setPlaying(false)); }
        else setPlaying(false);
      });
    };
    const io = new IntersectionObserver(([en]) => {
      if (en.isIntersecting && en.intersectionRatio >= 0.6) { if (!userPausedRef.current) start(); }
      else { v.pause(); userPausedRef.current = false; try { v.currentTime = 0; } catch {} }
    }, { threshold: [0, 0.25, 0.6, 0.9] });
    io.observe(box);
    return () => { io.disconnect(); v.pause(); };
  }, [content?.videoUrl, failed]);
  // Never more than one video playing.
  const onPlay = (ev) => { document.querySelectorAll('video[data-feedvid]').forEach(x => { if (x !== ev.currentTarget) x.pause(); }); };
  const toggle = () => {
    const v = vidRef.current; if (!v) return;
    if (v.paused) { userPausedRef.current = false; v.muted = mutedRef.current; const p = v.play(); if (p && p.catch) p.catch(() => setPlaying(false)); }
    else { userPausedRef.current = true; v.pause(); }
  };
  const medal = isEnded && rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : null;
  return (
    <div style={{ background: C.surface }} className="rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <button onClick={() => onOpenProfile && onOpenProfile(entry.username)} aria-label="Open profile" className="flex items-center gap-2 min-w-0 text-left">
          <Avatar profile={prof} size={36} />
          <span className="min-w-0">
            {prof?.displayName && <span style={{ color: C.paper }} className="block text-sm font-bold truncate">{prof.displayName}{isSelf && <span style={{ color: C.muted }} className="font-normal"> (you)</span>}</span>}
            <span style={{ color: prof?.displayName ? C.muted : C.paper }} className={`block truncate ${prof?.displayName ? 'text-xs' : 'text-sm font-bold'}`}>@{prof ? handleOf(prof) : entry.username}{isSelf && !prof?.displayName && <span style={{ color: C.muted }} className="font-normal"> (you)</span>}</span>
          </span>
        </button>
      </div>
      {(content?.title || content?.caption) && (
        <div className="px-3 pb-2">
          {content?.title && <div style={{ color: C.paper }} className="text-sm font-semibold">{content.title}</div>}
          {content?.caption && <div style={{ color: C.paper }} className="text-sm">{content.caption}</div>}
        </div>
      )}
      {content?.videoUrl && !failed ? (
        <div ref={boxRef} onClick={toggle} className="relative w-full flex items-center justify-center" style={{ background: '#000', minHeight: 240 }}>
          <video ref={vidRef} data-feedvid="1" src={`${content.videoUrl}#t=0.1`} loop muted={muted} playsInline preload="metadata"
            onPlay={onPlay} onPlaying={() => { setPlaying(true); setBuffering(false); }} onPause={() => setPlaying(false)} onWaiting={() => setBuffering(true)} onCanPlay={() => setBuffering(false)}
            onTimeUpdate={(e) => { const d = e.currentTarget.duration; if (d && isFinite(d)) setProgress(e.currentTarget.currentTime / d); }}
            onError={() => setFailed(true)}
            className="w-full block" style={{ maxHeight: '78vh', objectFit: 'contain', background: '#000' }} />
          {buffering && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} /></div>}
          {!playing && !buffering && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><span style={{ background: 'rgba(0,0,0,0.5)', color: 'white' }} className="w-16 h-16 rounded-full flex items-center justify-center text-3xl">▶</span></div>}
          <button onClick={(e) => { e.stopPropagation(); onSetMuted && onSetMuted(!muted); }} aria-label={muted ? 'Turn sound on' : 'Turn sound off'} style={{ background: 'rgba(0,0,0,0.6)', color: 'white' }} className="absolute top-2 right-2 h-9 px-3 rounded-full text-xs font-bold flex items-center">{muted ? '🔇 Tap for sound' : '🔊'}</button>
          <div className="absolute left-0 right-0 bottom-0 h-1" style={{ background: 'rgba(255,255,255,0.15)' }}><div style={{ width: `${Math.round(progress * 100)}%`, background: C.pink }} className="h-full" /></div>
        </div>
      ) : content?.videoUrl && failed ? (
        <div style={{ background: '#000', color: C.muted }} className="w-full aspect-video flex flex-col items-center justify-center gap-2">
          <span className="text-3xl">⚠️</span>
          <span className="text-xs px-8 text-center">This video couldn't be played. Check your connection and try again.</span>
          <button onClick={() => setFailed(false)} style={{ background: C.surface2, color: C.paper }} className="px-4 py-2 rounded-lg text-xs font-bold">Retry</button>
        </div>
      ) : (
        <div style={{ background: `linear-gradient(135deg, ${C.surface2}, ${C.ink})`, color: C.muted }} className="w-full aspect-video flex flex-col items-center justify-center gap-2">
          <span className="text-5xl">{content?.kind === 'photo' ? '🖼️' : '🎬'}</span>
          <span className="text-xs">Demo entry — no video attached</span>
        </div>
      )}
      <div className="p-3">
        <div className="flex items-center justify-between mb-2.5">
          <span style={{ color: C.amber }} className="text-xs font-black uppercase tracking-wide">🏆 {isEnded ? 'Final' : 'Current'} Rank: {medal || ''} #{rank}</span>
          <span style={{ color: C.paper }} className="text-xs font-black uppercase">❤️ {voteTotal} vote{voteTotal === 1 ? '' : 's'}</span>
        </div>
        <div className="flex items-center gap-2">
          {isSelf ? <span style={{ background: C.surface2, color: C.muted }} className="flex-1 text-center py-3 rounded-lg text-xs font-bold">Your entry</span>
            : !live ? <span style={{ background: C.surface2, color: C.muted }} className="flex-1 text-center py-3 rounded-lg text-xs font-bold">Voting has ended</span>
            : !freeVoteUsed ? <button onClick={() => onFreeVote(entry)} style={{ background: C.pink, color: 'white' }} className="flex-1 flex items-center justify-center gap-1 py-3 rounded-lg text-xs font-bold"><Heart size={14} /> Free Vote</button>
            : credits > 0 ? <button onClick={() => onOpenCredits(entry)} style={{ background: 'rgba(255,46,126,0.15)', color: C.pink }} className="flex-1 flex items-center justify-center gap-1 py-3 rounded-lg text-xs font-bold"><Zap size={14} /> Use Credits</button>
            : <span style={{ background: C.surface2, color: C.muted }} className="flex-1 text-center py-3 rounded-lg text-xs font-bold">No credits left</span>}
          <button onClick={() => onComment(entry)} style={{ background: C.surface2, color: C.paper }} className="px-4 py-3 rounded-lg text-xs font-bold flex items-center gap-1">💬 {commentCount}</button>
          <button onClick={() => onShare(entry)} style={{ background: C.surface2, color: C.paper }} className="px-4 py-3 rounded-lg text-xs font-bold">↗ Share</button>
        </div>
      </div>
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
  const [feedMuted, setFeedMuted] = useState(true); // one sound setting shared by every video in the feed
  const [profileFor, setProfileFor] = useState(null); // permanent account ID whose public profile is open
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
        await applyWalletTx(winnerEntry.username, { op: `win-${liveComp.id}-${winnerEntry.id}`, type: 'DEMO COMPETITION WINNINGS', amount: pot, compId: liveComp.id, note: liveComp.title });
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
    recordCreditEvent(user.username, { op: `vote-${comp.id}-${entry.id}-${uid()}`, type: 'PAID VOTE USING DEMO CREDITS', amount: -amount, compId: comp.id, note: comp.title });
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
    const cfg = await getWalletConfig();
    if (!cfg.addTokensEnabled) { onToast('Free demo tokens are turned off right now. Ask your facilitator.'); return; }
    const r = await applyWalletTx(user.username, { op: uid() + 'd', type: 'DEMO TOKEN DEPOSIT', amount: WALLET_TOPUP_AMOUNT, note: 'Free demo tokens — testing only', startBalance: STARTING_WALLET_BALANCE });
    if (!r.ok) { onToast(r.error); return; }
    setWalletBalance(r.balance);
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
    const entryId = uid();
    const feeRes = await applyWalletTx(user.username, { op: `fee-${entryId}`, type: 'COMPETITION ENTRY', amount: -fee, compId: comp.id, note: comp.title, startBalance: STARTING_WALLET_BALANCE });
    if (!feeRes.ok) { onToast(feeRes.error); setSubmittingEntry(false); return; }
    setWalletBalance(feeRes.balance);
    const contentId = uid();
    await sSet(`content:${contentId}`, { id: contentId, username: user.username, title: '', caption: caption.trim(), kind: 'video', videoUrl: uploadedVideoUrl || null, createdAt: Date.now() }, true);
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
    setPhase('main'); // land straight in the competition video feed (Share My Entry stays available in the header)
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
                  <Avatar profile={null} size={24} />
                  <span style={{ color: C.paper }} className="text-xs font-semibold"><Handle accountId={e.username} /></span>
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
                      <span style={{ color: C.paper }} className="text-sm font-semibold"><Handle accountId={e.username} /></span>
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

        <SectionLabel text={`Competition Video Feed (${entries.length})`} />
        {!isEnded && (
          <div style={{ color: C.muted }} className="text-xs mb-2">
            {freeVoteUsed ? `Free vote used. ${credits} voting credit${credits === 1 ? '' : 's'} remaining.` : 'You have 1 free vote and 10 test credits for this competition.'}
          </div>
        )}
        {entries.length === 0 ? <EmptyState text="No one has entered this competition yet." /> : (
          <div className="flex flex-col gap-4">
            {sorted.map((e, i) => (
              <CompetitionFeedPost key={e.id} entry={e} content={contents[e.contentId]} rank={i + 1} voteTotal={voteTotals[e.id] || 0} refreshTick={commentsTick}
                isSelf={e.username === user.username} isEnded={isEnded} live={comp.status !== 'ended'} freeVoteUsed={freeVoteUsed} credits={credits} muted={feedMuted} onSetMuted={setFeedMuted}
                onFreeVote={castFreeVote} onOpenCredits={(entry) => setCreditEntry(entry)}
                onComment={(entry) => setCommentsFor(entry)} onShare={(entry) => setShareForEntry(entry)} onOpenProfile={setProfileFor} />
            ))}
          </div>
        )}
      </div>
      {profileFor && <PublicProfileScreen accountId={profileFor} viewer={user} onToast={onToast} onClose={() => setProfileFor(null)} />}
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

function ProfileScreen({ user, myContent, myEntries, comps, wallet, onFeedback, onAdmin, onLogout, onOpenComp, onToast, onEditProfile, onOpenWallet, onHelp }) {
  const data = useProfileData(user.username);
  const wins = data ? data.items.filter(i => i.result === 'win') : [];
  return (
    <div className="pb-4">
      <TopBar title="Profile" />
      <div className="px-4 pt-4 flex flex-col items-center">
        <Avatar profile={user} size={80} gradient />
        {user.displayName && <div style={{ color: C.paper }} className="font-black text-xl mt-2">{user.displayName}</div>}
        <div style={{ color: user.displayName ? C.muted : C.paper }} className={user.displayName ? 'text-sm' : 'font-black text-lg mt-2'}>@{handleOf(user)}</div>
        {user.bio && <div style={{ color: C.paper }} className="text-xs mt-1.5 text-center max-w-xs whitespace-pre-wrap">{user.bio}</div>}
        {user.showLocation && user.location && <div style={{ color: C.muted }} className="text-xs mt-1.5">📍 {user.location}</div>}
        <InterestChips interests={user.interests} />
        <SocialLinks links={user.links} />
        <button onClick={onEditProfile} style={{ background: C.blue, color: 'white' }} className="font-bold px-8 py-2.5 rounded-xl text-sm mt-4">✏️ Edit Profile</button>
        {wins.length > 0 && <div className="flex gap-1 mt-3">{wins.map(i => <span key={i.entry.id} title={i.comp.title} className="text-xl">🏆</span>)}</div>}
        <ProfileStatsRow data={data} />

        <button data-tour="tour-wallet" onClick={onOpenWallet} style={{ background: C.surface, border: `1px solid ${C.amber}` }} className="w-full rounded-xl p-4 mt-5 flex items-center gap-3 text-left">
          <Wallet size={22} color={C.amber} />
          <div className="flex-1">
            <div style={{ color: C.paper }} className="text-sm font-bold">Demo KRUSH Wallet</div>
            <div style={{ color: C.muted }} className="text-[10px]">DEMO / TEST ONLY — NO REAL MONEY · Tap to open</div>
          </div>
          <div className="text-right"><div style={{ color: C.amber }} className="text-xl font-black leading-tight">{fmtAmt(Number(wallet.balance) || 0)}</div><div style={{ color: C.amber }} className="text-[9px] font-bold">TOKENS</div></div>
        </button>

        <ProfileTabs accountId={user.username} profile={user} data={data} viewer={user} onToast={onToast} onOpenComp={onOpenComp} />
        <button onClick={onHelp} style={{ background: C.surface, border: `1px solid ${C.pink}`, color: C.paper }} className="w-full font-bold py-3 rounded-xl mt-6">❓ Help Center</button>
        <button onClick={onFeedback} style={{ background: C.blue, color: 'white' }} className="w-full font-bold py-3 rounded-xl mt-3">Give Feedback</button>
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
        <WalletConfigCard onToast={onToast} />
        <SupportTicketsCard onToast={onToast} />
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

// ---------- TUTORIAL, HELP CENTER, FAQ & SUPPORT ----------
// Tutorial state is stored per account as `tutorial:{accountId}` -> { status: 'pending' | 'completed' | 'skipped', at }.
// Accounts that existed before this update have no record, so they are NOT prompted (they can replay from Help Center).
const SUPPORT_CATEGORIES = ['Account or Profile', 'Video Upload', 'Competition Entry', 'Voting', 'KRUSH Wallet', 'Comments or Sharing', 'Technical Problem', 'Report a Bug', 'Other'];
const SUPPORT_SCREENSHOT_MAX_BYTES = 5 * 1024 * 1024;
const SUPPORT_SCREENSHOT_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// To change FAQ wording: edit this list (or save a JSON list of the same shape under the shared key `config:faq`, which overrides it).
const FAQ_DEFAULT = [
  { category: 'Getting Started', items: [
    { q: 'What is KRUSH?', a: 'KRUSH is a social competition platform where creators share their talents, enter competitions, and connect with fans who watch and vote.' },
    { q: 'How old do I have to be to use KRUSH?', a: 'KRUSH is intended for users who are at least 18 years old.' },
    { q: 'How do I create a profile?', a: 'Sign up, complete your profile information, choose your interests, and start exploring KRUSH.' },
    { q: 'Can I change my profile information?', a: 'Yes! Visit Profile and select Edit Profile to update your picture, display name, username, bio, and other available information.' },
  ] },
  { category: 'Competitions', items: [
    { q: 'How do I enter a competition?', a: 'Tap Compete, select an available competition, review its rules, and follow the instructions to upload your entry.' },
    { q: 'How many people can enter a competition?', a: `Standard KRUSH competitions currently allow up to ${MAX_SPOTS} entrants.` },
    { q: 'How long do competitions last?', a: `Standard competitions are designed to run for ${Math.round(COMPETITION_DURATION_MS / 3600000)} hours, counting down once the second contestant enters. Special testing competitions may have different durations.` },
    { q: 'How do I know if I won?', a: 'Visit Winners or check your competition history on your Profile after the competition has officially ended and results are available.' },
    { q: 'Can I enter more than one competition?', a: 'Entry eligibility depends on the rules of each competition. You can enter a competition once, and you can only choose to compete or to watch before you submit your entry. Review the competition details before entering.' },
  ] },
  { category: 'Voting', items: [
    { q: 'How do I vote?', a: 'Open a competition, select Watch & Vote, watch the entries, and tap Vote on an eligible competitor.' },
    { q: 'Are votes free?', a: 'KRUSH includes a free vote in each competition. Additional votes use demo credits according to the current competition rules.' },
    { q: 'Can I vote for myself?', a: 'No. If you are competing, you can still watch, vote for other competitors, and comment, but you cannot vote for your own entry.' },
    { q: 'Can I change my vote?', a: 'Votes are counted right away and the app does not currently offer a way to undo or move a vote. Follow the rules shown on the specific competition.' },
  ] },
  { category: 'KRUSH Wallet', items: [
    { q: 'What is the KRUSH Wallet?', a: 'Your KRUSH Wallet displays your available tokens, transaction history, and supported wallet activities. You can open it from your Profile.' },
    { q: 'Are we using real money during testing?', a: 'No. All wallet balances, deposits, withdrawals, and rewards are simulated during prototype testing.' },
    { q: 'How do I add demo tokens?', a: 'Open your KRUSH Wallet from your Profile and select Add Tokens (when it is turned on).' },
    { q: 'Can I withdraw real money?', a: 'Not during prototype testing. Demo withdrawals are simulations and do not transfer real money.' },
    { q: 'What payment methods will KRUSH accept?', a: 'KRUSH is evaluating future support for eligible Visa, Mastercard, Cash App, PayPal, and Venmo payment methods. Availability is not guaranteed and will depend on approved integrations and provider requirements.' },
  ] },
  { category: 'Profile & Account', items: [
    { q: 'How do I upload a profile picture?', a: 'Open Profile, select Edit Profile, and choose the option to update your picture.' },
    { q: 'How do I change my username?', a: 'Visit Edit Profile and update your username, subject to availability.' },
    { q: 'Where can I see my competition history?', a: 'Visit your Profile and open the History tab.' },
    { q: 'How do I see my wins and losses?', a: 'Your profile displays your competition statistics and completed competition results.' },
  ] },
  { category: 'Technical Support', items: [
    { q: 'My video will not upload. What should I do?', a: 'Check your connection, confirm that your video meets the competition requirements (under 60 seconds), and try again. If the problem continues, contact KRUSH Support.' },
    { q: 'My video is not playing. What should I do?', a: 'Refresh the page, check your connection, and try again. If the issue continues, contact support.' },
    { q: 'My wallet balance looks incorrect. What should I do?', a: 'Review your transaction history in the Wallet. If the balance still appears incorrect, submit a support request.' },
    { q: 'How do I report a problem?', a: 'Open the Help Center and select Contact Support.' },
  ] },
];
function validFaq(v) { return Array.isArray(v) && v.length > 0 && v.every(g => g && typeof g.category === 'string' && Array.isArray(g.items) && g.items.every(i => i && typeof i.q === 'string' && typeof i.a === 'string')); }
function filterFaq(groups, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return groups;
  return groups.map(g => ({ ...g, items: g.items.filter(i => i.q.toLowerCase().includes(q) || i.a.toLowerCase().includes(q) || g.category.toLowerCase().includes(q)) })).filter(g => g.items.length > 0);
}

function validateSupportForm({ subject, category, description }) {
  if (!String(subject || '').trim()) return 'Please add a subject.';
  if (!SUPPORT_CATEGORIES.includes(category)) return 'Please choose an issue category.';
  if (String(description || '').trim().length < 10) return 'Please describe the problem in at least a few words (10+ characters).';
  return '';
}
function validateScreenshot(file) {
  if (!file) return '';
  if (!SUPPORT_SCREENSHOT_TYPES.includes(file.type)) return 'Screenshots must be a JPG, PNG or WebP image.';
  if (file.size > SUPPORT_SCREENSHOT_MAX_BYTES) return 'That screenshot is too large. Please use one under 5 MB.';
  return '';
}
// Writes straight to the shared database and then READS IT BACK. Throws unless the record is really there,
// so a success message is only ever shown for a ticket that was actually saved.
async function saveVerified(key, value) {
  if (!window.storage) throw new Error('Storage is not available.');
  const ok = await window.storage.set(key, JSON.stringify(value), true);
  if (ok !== true) throw new Error('The database did not confirm the save.');
  const back = await window.storage.get(key, true);
  if (!back || !back.value) throw new Error('The saved request could not be read back.');
  return true;
}
async function nextTicketRef() {
  let keys = [];
  try { const r = await window.storage.list('ticket:', true); keys = r?.keys || []; } catch { keys = []; }
  let n = keys.length + 1;
  for (let tries = 0; tries < 25; tries++, n++) {
    const ref = `KRUSH-${String(n).padStart(6, '0')}`;
    if (!keys.includes(`ticket:${ref}`)) {
      const exists = await window.storage.get(`ticket:${ref}`, true).catch(() => null);
      if (!exists) return ref;
    }
  }
  return `KRUSH-${String(Date.now()).slice(-6)}`;
}
async function uploadSupportScreenshot(file) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.secure_url) throw new Error(data?.error?.message || 'Screenshot upload failed');
  return data.secure_url;
}

async function getTutorialStatus(accountId) { const r = await sGet(`tutorial:${accountId}`, true); return r?.status || null; }
async function setTutorialStatus(accountId, status) { await sSet(`tutorial:${accountId}`, { status, at: Date.now() }, true); }

function TutorialWelcome({ onStart, onSkip }) {
  return (
    <div className="min-h-full flex flex-col items-center justify-center px-6 py-10 text-center">
      <LogoMark size="lg" />
      <h1 style={{ color: C.paper }} className="text-3xl font-black mt-8">WELCOME TO KRUSH!</h1>
      <div style={{ color: C.paper }} className="text-lg font-bold mt-4 leading-snug">Creators compete.<br />Fans vote.<br /><span style={{ color: C.amber }}>Winners get paid.</span></div>
      <div style={{ color: C.muted }} className="text-sm mt-5">Ready to see how KRUSH works?</div>
      <button onClick={onStart} style={{ background: C.pink, color: 'white' }} className="w-full max-w-xs font-black py-3.5 rounded-xl mt-8">SHOW ME AROUND</button>
      <button onClick={onSkip} style={{ color: C.paper, border: `1px solid ${C.surface2}` }} className="w-full max-w-xs font-bold py-3.5 rounded-xl mt-3">I'LL EXPLORE MYSELF</button>
      <div style={{ color: C.muted }} className="text-[11px] mt-5">The tour takes about a minute. You can replay it any time from Profile → Help Center.</div>
    </div>
  );
}

const TOUR_STEPS = [
  { key: 'home', screen: 'home', target: 'nav-home', title: 'WELCOME TO YOUR KRUSH FEED!', body: 'Scroll through videos, discover creators, like, comment, and share.' },
  { key: 'compete', screen: 'competitions', target: 'nav-competitions', title: 'READY TO ENTER THE ARENA?', body: 'Tap COMPETE to explore active competitions. Choose a competition, upload your video, and enter for a chance to win. You can also select WATCH & VOTE to support your favorite competitors.' },
  { key: 'vote', screen: 'competitions', target: 'tour-sample-vote', title: 'YOUR VOTE MATTERS!', body: 'Watch competing videos and vote for your favorites. KRUSH offers free voting opportunities and additional voting options using credits. Voting rules and eligibility depend on the competition.', sample: true },
  { key: 'create', screen: 'create', target: 'nav-create', title: 'GOT AN IDEA FOR A COMPETITION?', body: `CREATE is where you post to your profile for free and enter competitions (a standard entry costs ${ENTRY_FEE_STANDARD} demo tokens in this test). Hosting your own competitions or categories is`, comingSoon: 'COMING SOON — no hosting fee or requirements have been set yet.' },
  { key: 'wallet', screen: 'profile', target: 'tour-wallet', title: 'MEET YOUR KRUSH WALLET!', body: 'Your wallet keeps track of your available credits, transactions, and competition activity. It lives on your Profile screen.', note: 'During testing, all balances and transactions are simulated. NO REAL MONEY IS USED.' },
  { key: 'profile', screen: 'profile', target: 'nav-winners,nav-profile', title: 'YOUR KRUSH JOURNEY STARTS HERE!', body: 'Visit PROFILE to customize your account, view uploads, track competition wins and losses, and review your activity. Visit WINNERS to see competition results and winning creators.' },
];

function TourOverlay({ step, onStep, onFinish, onSkip }) {
  const s = TOUR_STEPS[step];
  const [rect, setRect] = useState(null);
  useEffect(() => {
    let cancelled = false;
    const measure = () => {
      const els = s.target.split(',').map(t => document.querySelector(`[data-tour="${t}"]`)).filter(Boolean);
      if (s.sample || els.length === 0) { if (!cancelled) setRect(null); return; }
      const rs = els.map(e => e.getBoundingClientRect());
      const l = Math.min(...rs.map(r => r.left)), t = Math.min(...rs.map(r => r.top)), r2 = Math.max(...rs.map(r => r.right)), b = Math.max(...rs.map(r => r.bottom));
      if (!cancelled) setRect({ left: l - 6, top: t - 6, width: r2 - l + 12, height: b - t + 12 });
    };
    setRect(null);
    const first = document.querySelector(`[data-tour="${s.target.split(',')[0]}"]`);
    if (first && !s.target.startsWith('nav-')) { try { first.scrollIntoView({ block: 'center' }); } catch {} }
    const t1 = setTimeout(measure, 80); const t2 = setTimeout(measure, 400); const t3 = setTimeout(measure, 900);
    window.addEventListener('resize', measure);
    return () => { cancelled = true; clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); window.removeEventListener('resize', measure); };
  }, [step]);
  const last = step === TOUR_STEPS.length - 1;
  const cardAtTop = rect ? (rect.top + rect.height / 2) > (window.innerHeight * 0.5) : false;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100 }} onClick={e => e.stopPropagation()}>
      {rect ? <div style={{ position: 'fixed', left: rect.left, top: rect.top, width: rect.width, height: rect.height, borderRadius: 14, border: `2px solid ${C.pink}`, boxShadow: '0 0 0 9999px rgba(5,6,12,0.82)', pointerEvents: 'none', transition: 'all .25s' }} /> : <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,6,12,0.82)' }} />}
      <div style={{ position: 'fixed', left: 0, right: 0, ...(cardAtTop ? { top: 12 } : { bottom: 84 }), display: 'flex', justifyContent: 'center', padding: '0 12px', maxHeight: '75vh', overflowY: 'auto' }}>
        <div style={{ background: C.surface, border: `1px solid ${C.surface2}` }} className="w-full max-w-md rounded-2xl p-4">
          <div className="flex items-center justify-between mb-1">
            <div style={{ color: C.muted }} className="text-[10px] font-bold">STEP {step + 1} OF {TOUR_STEPS.length}</div>
            {!last && <button onClick={onSkip} style={{ color: C.muted }} className="text-xs font-bold px-2 py-1">SKIP</button>}
          </div>
          <div style={{ color: C.paper }} className="text-base font-black">{s.title}</div>
          <div style={{ color: C.muted }} className="text-sm mt-1.5 leading-snug">{s.body}{s.comingSoon && <> <span style={{ color: C.amber }} className="font-bold">{s.comingSoon}</span></>}</div>
          {s.note && <div style={{ background: 'rgba(255,176,32,0.12)', color: C.amber }} className="text-xs font-bold rounded-lg px-3 py-2 mt-2">{s.note}</div>}
          {s.sample && (
            <div data-tour="tour-sample-vote" style={{ background: C.surface2 }} className="rounded-xl p-3 mt-3 pointer-events-none">
              <div style={{ color: C.muted }} className="text-[10px] font-bold mb-1.5">SAMPLE POST — NOTHING HERE IS REAL</div>
              <div className="flex items-center gap-2 mb-2"><div style={{ background: C.blue }} className="w-7 h-7 rounded-full" /><div style={{ color: C.paper }} className="text-xs font-bold">@sample_creator</div><div style={{ color: C.amber }} className="text-[10px] font-bold ml-auto">🏆 RANK #1</div></div>
              <div className="flex gap-2"><div style={{ background: C.pink, color: 'white', border: `2px solid ${C.amber}` }} className="flex-1 text-center py-2 rounded-lg text-xs font-black">❤️ VOTE</div><div style={{ background: C.surface, color: C.paper }} className="flex-1 text-center py-2 rounded-lg text-xs font-bold">Comment</div><div style={{ background: C.surface, color: C.paper }} className="flex-1 text-center py-2 rounded-lg text-xs font-bold">Share</div></div>
            </div>
          )}
          <div className="flex gap-2 mt-4">
            {step > 0 && <button onClick={() => onStep(step - 1)} style={{ color: C.paper, border: `1px solid ${C.surface2}` }} className="px-4 py-2.5 rounded-xl text-sm font-bold">BACK</button>}
            {last
              ? <button onClick={onFinish} style={{ background: C.pink, color: 'white' }} className="flex-1 py-2.5 rounded-xl text-sm font-black">GOT IT! LET'S KRUSH!</button>
              : <button onClick={() => onStep(step + 1)} style={{ background: C.blue, color: 'white' }} className="flex-1 py-2.5 rounded-xl text-sm font-black">NEXT</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

function HelpCenterScreen({ onBack, onTour, onFaq, onSupport }) {
  const Btn = ({ onClick, emoji, title, sub, color }) => (
    <button onClick={onClick} style={{ background: C.surface, border: `1px solid ${color}` }} className="w-full rounded-2xl p-4 flex items-center gap-3 text-left mb-3">
      <span className="text-2xl">{emoji}</span>
      <span className="flex-1"><span style={{ color: C.paper }} className="block text-sm font-black">{title}</span><span style={{ color: C.muted }} className="block text-xs mt-0.5">{sub}</span></span>
    </button>
  );
  return (
    <div className="pb-8">
      <TopBar title="KRUSH HELP CENTER" onBack={onBack} />
      <div className="px-4 pt-6">
        <div style={{ color: C.paper }} className="text-2xl font-black">NEED A LITTLE HELP?</div>
        <div style={{ color: C.muted }} className="text-sm mt-1 mb-6">We've got you! Choose an option below.</div>
        <Btn onClick={onTour} emoji="🎬" title="TAKE THE KRUSH TOUR" sub="A quick 1-minute walkthrough. Your profile isn't changed." color={C.pink} />
        <Btn onClick={onFaq} emoji="❓" title="FREQUENTLY ASKED QUESTIONS" sub="Search answers about competitions, voting and the wallet." color={C.blue} />
        <Btn onClick={onSupport} emoji="💬" title="CONTACT SUPPORT" sub="Tell us what's going on and we'll look into it." color={C.amber} />
      </div>
    </div>
  );
}

function FaqScreen({ onBack, onSupport }) {
  const [groups, setGroups] = useState(FAQ_DEFAULT);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState({});
  useEffect(() => { (async () => { const o = await sGet('config:faq', true); if (validFaq(o)) setGroups(o); })(); }, []);
  const shown = filterFaq(groups, query);
  const searching = query.trim().length > 0;
  return (
    <div className="pb-8">
      <TopBar title="FAQ" onBack={onBack} />
      <div className="px-4 pt-4">
        <div style={{ color: C.paper }} className="text-lg font-black mb-3">KRUSH FREQUENTLY ASKED QUESTIONS</div>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="🔍 Search questions" style={{ background: C.surface, color: C.paper, border: `1px solid ${C.surface2}`, fontSize: 16 }} className="w-full rounded-xl px-4 py-3 outline-none" />
        {shown.length === 0 && <div className="py-6"><EmptyState text="No questions match your search. Try different words, or contact support." /></div>}
        {shown.map(g => (
          <div key={g.category}>
            <SectionLabel text={g.category} color={C.pink} />
            <div className="flex flex-col gap-2">
              {g.items.map(i => {
                const k = `${g.category}|${i.q}`; const isOpen = searching || !!open[k];
                return (
                  <div key={k} style={{ background: C.surface }} className="rounded-xl overflow-hidden">
                    <button onClick={() => setOpen(o => ({ ...o, [k]: !o[k] }))} className="w-full flex items-center gap-2 text-left px-4 py-3">
                      <span style={{ color: C.paper }} className="flex-1 text-sm font-semibold">{i.q}</span>
                      <span style={{ color: C.muted }} className="text-lg leading-none">{isOpen ? '−' : '+'}</span>
                    </button>
                    {isOpen && <div style={{ color: C.muted }} className="px-4 pb-4 text-sm leading-relaxed">{i.a}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div style={{ color: C.muted }} className="text-xs text-center mt-8 mb-2">Didn't find what you need?</div>
        <button onClick={onSupport} style={{ background: C.amber, color: '#1a1200' }} className="w-full font-black py-3.5 rounded-xl">CONTACT SUPPORT</button>
      </div>
    </div>
  );
}

function ContactSupportScreen({ user, onBack, onToast }) {
  const [subject, setSubject] = useState(''); const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null); const [fileErr, setFileErr] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [done, setDone] = useState(null);
  const [mine, setMine] = useState([]);
  const fileRef = useRef(null);
  const loadMine = useCallback(async () => {
    try {
      const prefix = `ticketref:${user.username}:`;
      const keys = (await sList(prefix, true)).filter(k => String(k).startsWith(prefix)); // exact-prefix guard: database LIKE treats _ as a wildcard
      const recs = await sGetMany(keys, true);
      setMine(recs.sort((a, b) => b.createdAt - a.createdAt).slice(0, 5));
    } catch { setMine([]); }
  }, [user.username]);
  useEffect(() => { loadMine(); }, [loadMine]);

  const pickFile = (e) => {
    const f = e.target.files?.[0] || null;
    const err = validateScreenshot(f);
    setFileErr(err); setFile(err ? null : f);
    if (err && fileRef.current) fileRef.current.value = '';
  };
  const submit = async () => {
    setError('');
    const v = validateSupportForm({ subject, category, description });
    if (v) { setError(v); return; }
    setBusy(true);
    try {
      let screenshotUrl = null;
      if (file) {
        try { screenshotUrl = await uploadSupportScreenshot(file); }
        catch (e) { setError(`Your screenshot couldn't be uploaded (${e.message}). Remove it and submit without it, or try again.`); setBusy(false); return; }
      }
      const ref = await nextTicketRef();
      const createdAt = Date.now();
      const ticket = { ref, username: user.username, handle: handleOf(user), subject: subject.trim().slice(0, 120), category, description: description.trim().slice(0, 2000), screenshotUrl, status: 'open', createdAt };
      await saveVerified(`ticket:${ref}`, ticket);
      try { await saveVerified(`ticketref:${user.username}:${ref}`, { ref, subject: ticket.subject, category, createdAt }); } catch { /* the ticket itself is saved; only the "my requests" list entry failed */ }
      setDone({ ref, createdAt });
      loadMine();
    } catch (e) {
      setError(`We couldn't save your request, so it was NOT submitted (${e.message}). Please check your connection and try again.`);
    }
    setBusy(false);
  };

  if (done) {
    return (
      <div className="pb-8">
        <TopBar title="Contact Support" onBack={onBack} />
        <div className="px-4 pt-10 text-center">
          <div className="text-5xl mb-3">✅</div>
          <div style={{ color: C.green }} className="text-2xl font-black">REQUEST RECEIVED!</div>
          <div style={{ color: C.paper }} className="text-sm mt-3">Your support request has been submitted.</div>
          <div style={{ background: C.surface }} className="rounded-xl p-4 mt-5 inline-block"><div style={{ color: C.muted }} className="text-[10px] font-bold">TICKET NUMBER</div><div style={{ color: C.amber }} className="text-xl font-black">{done.ref}</div></div>
          <div style={{ color: C.muted }} className="text-xs mt-2">{new Date(done.createdAt).toLocaleString()}</div>
          <div style={{ color: C.paper }} className="text-sm mt-5">Thank you for helping us improve KRUSH!</div>
          <button onClick={onBack} style={{ background: C.blue, color: 'white' }} className="w-full max-w-xs font-bold py-3.5 rounded-xl mt-8">DONE</button>
        </div>
      </div>
    );
  }
  const inputStyle = { background: C.surface, color: C.paper, border: `1px solid ${C.surface2}`, fontSize: 16 };
  return (
    <div className="pb-8">
      <TopBar title="Contact Support" onBack={onBack} />
      <div className="px-4 pt-4">
        <div style={{ color: C.paper }} className="text-xl font-black">CONTACT KRUSH SUPPORT</div>
        <div style={{ color: C.paper }} className="text-sm font-bold mt-3">NEED HELP?</div>
        <div style={{ color: C.muted }} className="text-sm mb-4">Tell us what's going on, and we'll help you find a solution.</div>

        <label style={{ color: C.paper }} className="text-xs font-bold">Subject *</label>
        <input value={subject} maxLength={120} onChange={e => setSubject(e.target.value)} style={inputStyle} className="w-full rounded-xl px-4 py-3 outline-none mt-1 mb-3" />
        <label style={{ color: C.paper }} className="text-xs font-bold">Issue category *</label>
        <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle} className="w-full rounded-xl px-4 py-3 outline-none mt-1 mb-3">
          <option value="">Choose a category…</option>
          {SUPPORT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <label style={{ color: C.paper }} className="text-xs font-bold">Description *</label>
        <textarea value={description} maxLength={2000} rows={5} onChange={e => setDescription(e.target.value)} placeholder="Tell us in your own words what happened." style={inputStyle} className="w-full rounded-xl px-4 py-3 outline-none mt-1 mb-1 resize-none" />
        <div style={{ color: C.muted }} className="text-[10px] text-right mb-3">{description.length}/2000</div>
        <label style={{ color: C.paper }} className="text-xs font-bold">Screenshot <span style={{ color: C.muted }} className="font-normal">(optional · JPG, PNG or WebP · under 5 MB)</span></label>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={pickFile} style={{ color: C.muted }} className="w-full text-xs mt-1 mb-1" />
        {file && <div style={{ color: C.green }} className="text-xs">✓ {file.name} attached</div>}
        {fileErr && <div style={{ color: C.red }} className="text-xs">{fileErr}</div>}
        <div style={{ background: 'rgba(255,176,32,0.1)', color: C.amber }} className="text-[11px] rounded-lg px-3 py-2 mt-3">Please never include passwords, card numbers or other payment details. KRUSH will never ask for them here.</div>
        {error && <div style={{ background: 'rgba(255,77,77,0.12)', color: C.red }} className="text-xs font-semibold rounded-lg px-3 py-2 mt-3">{error}</div>}
        <button onClick={submit} disabled={busy} style={{ background: C.pink, color: 'white', opacity: busy ? 0.6 : 1 }} className="w-full font-black py-3.5 rounded-xl mt-4">{busy ? 'SENDING…' : 'SUBMIT SUPPORT REQUEST'}</button>

        {mine.length > 0 && (
          <div className="mt-8">
            <SectionLabel text="Your recent requests" />
            <div className="flex flex-col gap-2">{mine.map(t => (
              <div key={t.ref} style={{ background: C.surface }} className="rounded-xl px-4 py-3">
                <div className="flex justify-between"><span style={{ color: C.amber }} className="text-xs font-black">{t.ref}</span><span style={{ color: C.muted }} className="text-[10px]">{new Date(t.createdAt).toLocaleDateString()}</span></div>
                <div style={{ color: C.paper }} className="text-sm mt-0.5">{t.subject}</div>
              </div>
            ))}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// Facilitator-only (behind the existing Facilitator PIN). Lists every saved support request, newest first.
function SupportTicketsCard({ onToast }) {
  const [tickets, setTickets] = useState(null);
  const [open, setOpen] = useState(null);
  const load = useCallback(async () => {
    try { const keys = await sList('ticket:', true); const recs = await sGetMany(keys, true); setTickets(recs.sort((a, b) => b.createdAt - a.createdAt)); }
    catch { setTickets([]); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const toggleStatus = async (t) => {
    const next = { ...t, status: t.status === 'resolved' ? 'open' : 'resolved', updatedAt: Date.now() };
    try { await saveVerified(`ticket:${t.ref}`, next); onToast(`${t.ref} marked ${next.status}.`); load(); }
    catch (e) { onToast(`Couldn't update ${t.ref}: ${e.message}`); }
  };
  const openCount = (tickets || []).filter(t => t.status !== 'resolved').length;
  return (
    <div style={{ background: C.surface }} className="rounded-xl p-3 mt-2">
      <div className="flex items-center justify-between mb-2">
        <div style={{ color: C.paper }} className="text-sm font-bold">Support tickets {tickets ? `(${openCount} open / ${tickets.length} total)` : ''}</div>
        <button onClick={load} style={{ color: C.blue }} className="text-xs font-bold">Refresh</button>
      </div>
      {tickets === null ? <div style={{ color: C.muted }} className="text-xs">Loading…</div> : tickets.length === 0 ? <div style={{ color: C.muted }} className="text-xs">No support requests yet.</div> : (
        <div className="flex flex-col gap-2">
          {tickets.map(t => (
            <div key={t.ref} style={{ background: C.surface2 }} className="rounded-lg p-2.5">
              <button onClick={() => setOpen(open === t.ref ? null : t.ref)} className="w-full text-left">
                <div className="flex justify-between items-center"><span style={{ color: C.amber }} className="text-xs font-black">{t.ref}</span><span style={{ color: t.status === 'resolved' ? C.green : C.pink }} className="text-[10px] font-bold uppercase">{t.status || 'open'}</span></div>
                <div style={{ color: C.paper }} className="text-xs font-semibold mt-0.5">{t.subject}</div>
                <div style={{ color: C.muted }} className="text-[10px]">@{t.handle || t.username} · {t.category} · {new Date(t.createdAt).toLocaleString()}</div>
              </button>
              {open === t.ref && (
                <div className="mt-2">
                  <div style={{ color: C.paper }} className="text-xs whitespace-pre-wrap">{t.description}</div>
                  <div style={{ color: C.muted }} className="text-[10px] mt-1">Account ID: {t.username}</div>
                  {t.screenshotUrl && <a href={t.screenshotUrl} target="_blank" rel="noreferrer" style={{ color: C.blue }} className="text-xs font-bold block mt-1">View screenshot ↗</a>}
                  <button onClick={() => toggleStatus(t)} style={{ background: t.status === 'resolved' ? C.surface : C.green, color: t.status === 'resolved' ? C.paper : '#04210f' }} className="text-xs font-bold px-3 py-1.5 rounded-lg mt-2">{t.status === 'resolved' ? 'Reopen' : 'Mark resolved'}</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
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
  const [inEditProfile, setInEditProfile] = useState(false);
  const [inWallet, setInWallet] = useState(false);
  const [helpView, setHelpView] = useState(null); // null | 'hub' | 'faq' | 'support'
  const [welcomeFor, setWelcomeFor] = useState(null); // account id while the optional-tour invitation is showing
  const [tour, setTour] = useState(null); // { step, replay }
  const shellScroll = useRef(0);
  const openHelp = (view) => { if (!helpView) { const el = document.querySelector('[data-krush-shell]'); shellScroll.current = el ? el.scrollTop : 0; } setHelpView(view); };
  const closeHelp = () => { setHelpView(null); setTimeout(() => { const el = document.querySelector('[data-krush-shell]'); if (el) el.scrollTop = shellScroll.current; }, 60); };
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
        if (u) { setUser(u); await reloadMine(u); await loadFeedState(u); if ((await getTutorialStatus(u.username)) === 'pending') setWelcomeFor(u.username); setPhase('app'); return; }
      }
      setPhase('welcome');
    })();
  }, [reloadComps, reloadMine, loadFeedState]);

  // A username counts as taken if it matches ANY account's permanent ID or current public username (case-insensitive).
  const checkUsername = async (username) => {
    const t = username.trim(); const lower = t.toLowerCase();
    if (await sGet(`user:${t}`, true)) return true;
    if (await sGet(`handle:${lower}`, true)) return true;
    try { const keys = await sList('user:', true); if (keys.some(k => String(k).replace(/^user:/, '').toLowerCase() === lower)) return true; } catch {}
    return false;
  };
  // Log in with either the permanent username or the current public username.
  const findUser = async (username) => {
    const t = username.trim(); const lower = t.toLowerCase();
    const viaHandle = await sGet(`handle:${lower}`, true);
    if (viaHandle?.accountId) { const u = await sGet(`user:${viaHandle.accountId}`, true); if (u) return u; }
    const direct = await sGet(`user:${t}`, true);
    if (direct) return direct;
    try { const keys = await sList('user:', true); const m = keys.find(k => String(k).replace(/^user:/, '').toLowerCase() === lower); if (m) return await sGet(m, true); } catch {}
    return null;
  };
  const finishProfileSetup = ({ username, bio, avatar }) => {
    setProfileDraft({ username, bio, avatar });
    setPhase('interests');
  };
  const completeOnboarding = async (interests) => {
    const { username, bio, avatar } = profileDraft;
    const u = { username, displayName: signupDraft.displayName, bio, avatar, email: signupDraft.email, interests, createdAt: Date.now() };
    await sSet(`user:${username}`, u, true);
    await sSet(`handle:${username.toLowerCase()}`, { accountId: username }, true);
    await sSet('session', { username }, false);
    const existingWallet = await sGet(`wallet:${username}`, true);
    if (!existingWallet) await sSet(`wallet:${username}`, { balance: STARTING_WALLET_BALANCE }, true);
    await setTutorialStatus(username, 'pending');
    setUser(u); await reloadMine(u); await loadFeedState(u); setWelcomeFor(username); setPhase('app'); setToast('Account created for this test session.');
  };
  const login = async (u) => { await sSet('session', { username: u.username }, false); setUser(u); await reloadMine(u); await loadFeedState(u); if ((await getTutorialStatus(u.username)) === 'pending') setWelcomeFor(u.username); setPhase('app'); };
  const logout = async () => { await sDelete('session', false); setUser(null); setWelcomeFor(null); setTour(null); setHelpView(null); setPhase('welcome'); setScreen('home'); };

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

  const startTour = (replay) => { setHelpView(null); setInWallet(false); setInEditProfile(false); setInFeedback(false); setInAdmin(false); setOpenComp(null); setScreen(TOUR_STEPS[0].screen); setTour({ step: 0, replay: !!replay }); };
  const goTourStep = (n) => { setScreen(TOUR_STEPS[n].screen); setTour(t => ({ ...t, step: n })); };
  const endTour = async (how) => {
    const wasReplay = tour?.replay;
    setTour(null); setScreen('home');
    if (!wasReplay) await setTutorialStatus(user.username, how);
  };
  const chooseTour = async () => { setWelcomeFor(null); startTour(false); };
  const chooseSkipTour = async () => { const id = welcomeFor; setWelcomeFor(null); setScreen('home'); await setTutorialStatus(id, 'skipped'); };
  if (welcomeFor) return <Shell><TutorialWelcome onStart={chooseTour} onSkip={chooseSkipTour} />{toast && <Toast message={toast} onDone={() => setToast(null)} />}</Shell>;
  if (helpView === 'hub') return <Shell><HelpCenterScreen onBack={closeHelp} onTour={() => startTour(true)} onFaq={() => setHelpView('faq')} onSupport={() => setHelpView('support')} />{toast && <Toast message={toast} onDone={() => setToast(null)} />}</Shell>;
  if (helpView === 'faq') return <Shell><FaqScreen onBack={() => setHelpView('hub')} onSupport={() => setHelpView('support')} />{toast && <Toast message={toast} onDone={() => setToast(null)} />}</Shell>;
  if (helpView === 'support') return <Shell><ContactSupportScreen user={user} onBack={() => setHelpView('hub')} onToast={showToast} />{toast && <Toast message={toast} onDone={() => setToast(null)} />}</Shell>;

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
  if (inWallet) return <Shell><WalletScreen user={user} onBack={() => { setInWallet(false); reloadMine(user); }} onChanged={() => reloadMine(user)} onToast={showToast} />{toast && <Toast message={toast} onDone={() => setToast(null)} />}</Shell>;
  if (inEditProfile) return <Shell><EditProfileScreen user={user} onCancel={() => setInEditProfile(false)} onSaved={(u) => { setUser(u); setInEditProfile(false); }} onToast={showToast} />{toast && <Toast message={toast} onDone={() => setToast(null)} />}</Shell>;
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
    profile: <ProfileScreen user={user} myContent={myContent} myEntries={myEntries} comps={comps} wallet={wallet} onFeedback={() => setInFeedback(true)} onAdmin={() => setInAdmin(true)} onLogout={logout} onOpenComp={(c, intent) => openCompWithIntent(c, intent)} onToast={showToast} onEditProfile={() => setInEditProfile(true)} onOpenWallet={() => setInWallet(true)} onHelp={() => openHelp('hub')} />,
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
      {tour && <TourOverlay step={tour.step} onStep={goTourStep} onFinish={() => endTour('completed')} onSkip={() => endTour('skipped')} />}
      {creatorPost && <CreatorProfileModal post={creatorPost} following={!!feedState.following[creatorPost.creator]} onFollow={toggleFollow} onClose={() => setCreatorPost(null)} />}
      {commentsFor && <CommentsSheet targetId={commentsFor.id} targetLabel={`@${commentsFor.username}`} user={user} onClose={closeFeedComments} onToast={showToast} />}
      {shareForPost && <ShareSheet item={shareForPost} user={user} onClose={() => setShareForPost(null)} onToast={showToast} />}
      {pushBanner && <PushBanner text={pushBanner} onDone={() => setPushBanner(null)} onClick={() => setInNotifs(true)} />}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </Shell>
  );
}
function SplashOrWelcome({ onSignUp, onLogIn }) { const [s, setS] = useState(true); return s ? <SplashScreen onNext={() => setS(false)} /> : <WelcomeScreen onSignUp={onSignUp} onLogIn={onLogIn} />; }
function Shell({ children }) { return <div data-krush-shell="1" style={{ background: C.ink, fontFamily: 'system-ui, -apple-system, sans-serif' }} className="w-full h-screen max-w-md mx-auto overflow-y-auto relative">{children}</div>; }
