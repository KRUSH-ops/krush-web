// Replaces the Claude-artifact-only `window.storage` with a real backend, WITHOUT changing
// a single line of the app's own sGet/sSet/sDelete/sList logic (in App.jsx). Those functions
// already call window.storage.get/set/delete/list exactly the way this shim implements them —
// this file is the only thing that changed to make storage real and cross-device.
//
// - shared = true  -> goes to Supabase (a real hosted database), so every tester on every
//                      phone sees the same competitions, entries, votes, comments, wallets.
// - shared = false  -> stays in this browser's own localStorage (used only for the login
//                      "session" key, which was never meant to sync across devices anyway).
//
// IMPORTANT: this intentionally does NOT try to read or import any data from the old Claude
// artifact's storage — that data lived inside the artifact sandbox only and cannot be reached
// from here. This hosted version starts with a clean, empty shared database.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
  // Fails loudly in the browser console instead of silently losing data — this should only
  // happen if the two environment variables weren't set in the hosting dashboard.
  // eslint-disable-next-line no-console
  console.error('[KRUSH] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — shared data will not work.');
}

const TABLE = 'krush_kv';
const LOCAL_PREFIX = 'krush_local:';

function localGet(key) {
  const raw = localStorage.getItem(LOCAL_PREFIX + key);
  return raw ? { value: raw } : null;
}
function localSet(key, jsonString) {
  localStorage.setItem(LOCAL_PREFIX + key, jsonString);
  return true;
}
function localDelete(key) {
  localStorage.removeItem(LOCAL_PREFIX + key);
  return true;
}
function localList(prefix) {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(LOCAL_PREFIX + prefix)) keys.push(k.slice(LOCAL_PREFIX.length));
  }
  return { keys };
}

async function get(key, shared) {
  if (!shared) return localGet(key);
  if (!supabase) return null;
  const { data, error } = await supabase.from(TABLE).select('value').eq('key', key).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  // The app's sGet does JSON.parse(r.value) — value is stored as jsonb in Supabase (already
  // a real JS value by the time the client gets it), so we re-stringify to match that contract.
  return { value: JSON.stringify(data.value) };
}
async function set(key, jsonString, shared) {
  if (!shared) return localSet(key, jsonString);
  if (!supabase) return null;
  const value = JSON.parse(jsonString);
  const { error } = await supabase.from(TABLE).upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) throw error;
  return true;
}
async function del(key, shared) {
  if (!shared) return localDelete(key);
  if (!supabase) return null;
  const { error } = await supabase.from(TABLE).delete().eq('key', key);
  if (error) throw error;
  return true;
}
async function list(prefix, shared) {
  if (!shared) return localList(prefix);
  if (!supabase) return { keys: [] };
  const { data, error } = await supabase.from(TABLE).select('key').like('key', `${prefix}%`);
  if (error) throw error;
  return { keys: (data || []).map((r) => r.key) };
}

window.storage = { get, set, delete: del, list };
