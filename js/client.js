// ============================================================
// Supabase Client – Singleton
// ============================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Hilfsfunktion: Aktueller User
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Hilfsfunktion: Profil des aktuellen Users laden
export async function getCurrentProfile() {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  return data;
}

// Hilfsfunktion: Membership + Rolle des Users in seiner Community
export async function getCurrentMembership() {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data } = await supabase
    .from('memberships')
    .select('*, communities(*)')
    .eq('profile_id', user.id)
    .eq('status', 'aktiv')
    .single();
  return data;
}

// Hilfsfunktion: Community-ID aus Session holen
export function getCommunityId() {
  return sessionStorage.getItem('community_id');
}

// Audit-Log Eintrag schreiben
export async function writeAuditLog(action, entityType, entityId, payload = {}) {
  const user = await getCurrentUser();
  const communityId = getCommunityId();
  await supabase.from('audit_log').insert({
    community_id: communityId,
    actor_id: user?.id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    payload
  });
}
