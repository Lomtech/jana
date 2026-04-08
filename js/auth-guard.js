// ============================================================
// Auth Guard – auf jeder geschützten Seite importieren
// Leitet nicht eingeloggte User zu login.html weiter
// Befüllt sessionStorage mit community_id und role
// ============================================================

import { supabase, getCurrentMembership } from './client.js';

export async function requireAuth() {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = '/login.html';
    return null;
  }

  // Membership laden und Community-ID in Session speichern
  const membership = await getCurrentMembership();
  if (!membership) {
    // User hat keine aktive Mitgliedschaft
    await supabase.auth.signOut();
    window.location.href = '/login.html?error=no_membership';
    return null;
  }

  sessionStorage.setItem('community_id', membership.community_id);
  sessionStorage.setItem('user_role', membership.role);
  sessionStorage.setItem('community_name', membership.communities.name);
  sessionStorage.setItem('membership_id', membership.id);

  return membership;
}

// Prüft ob User Admin oder Kassenwart ist
export function isAdmin() {
  const role = sessionStorage.getItem('user_role');
  return role === 'admin' || role === 'kassenwart';
}

// Logout
export async function logout() {
  sessionStorage.clear();
  await supabase.auth.signOut();
  window.location.href = '/login.html';
}

// Füllt Community-Name in alle Elemente mit data-community-name
export function fillCommunityName() {
  const name = sessionStorage.getItem('community_name') || '';
  document.querySelectorAll('[data-community-name]').forEach(el => {
    el.textContent = name;
  });
}
