// ============================================================
// Supabase Client
// Lädt Supabase über esm.sh — kein npm, kein Build-Tool
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

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

export function getCommunityId() {
  return sessionStorage.getItem('community_id');
}

export async function writeAuditLog(action, entityType, entityId, payload = {}) {
  const user = await getCurrentUser();
  const communityId = getCommunityId();
  await supabase.from('audit_log').insert({
    community_id: communityId,
    actor_id:     user?.id,
    action,
    entity_type:  entityType,
    entity_id:    entityId,
    payload
  });
}
