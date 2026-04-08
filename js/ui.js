// ============================================================
// ui.js – Wiederverwendbare UI-Helfer
// ============================================================

import { logout, fillCommunityName } from './auth-guard.js';

// Sidebar HTML generieren und einfügen
export function renderLayout(activePage) {
  const pages = [
    { key: 'dashboard',     label: 'Dashboard',      href: '/index.html' },
    { key: 'members',       label: 'Mitglieder',     href: '/members.html' },
    { key: 'payments',      label: 'Zahlungen',      href: '/payments.html' },
    { key: 'cases',         label: 'Todesfälle',     href: '/cases.html' },
    { key: 'transactions',  label: 'Transaktionen',  href: '/transactions.html' },
    { key: 'audit',         label: 'Audit-Log',      href: '/audit.html' },
  ];

  const navLinks = pages.map(p => `
    <a href="${p.href}" class="${activePage === p.key ? 'active' : ''}">
      <span class="nav-dot"></span>${p.label}
    </a>
  `).join('');

  const sidebar = document.getElementById('sidebar');
  sidebar.innerHTML = `
    <div class="sidebar-logo">
      <div class="logo-icon">
        <svg viewBox="0 0 16 16"><path d="M8 1L2 4v4c0 3.3 2.6 6 6 7 3.4-1 6-3.7 6-7V4L8 1z"/></svg>
      </div>
      <div>
        <div class="logo-name">Jana</div>
        <div class="logo-sub">Bestattungskasse</div>
      </div>
    </div>
    <nav class="nav">${navLinks}</nav>
    <div class="sidebar-footer">
      <div class="community-chip">
        <strong data-community-name>—</strong>
        Admin-Bereich
      </div>
      <a class="logout-link" id="logout-btn">Abmelden</a>
    </div>
  `;

  fillCommunityName();

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await logout();
  });

  // Toast Container
  if (!document.getElementById('toast')) {
    const t = document.createElement('div');
    t.id = 'toast';
    document.body.appendChild(t);
  }
}

// Toast anzeigen
export function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `show toast-${type}`;
  setTimeout(() => { toast.className = ''; }, 3000);
}

// Modal öffnen / schließen
export function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
}
export function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

// Initialen aus Name
export function initials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('');
}

// Datum formatieren
export function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric' });
}

// Betrag formatieren
export function formatEur(amount) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount ?? 0);
}

// Monat-/Jahresstring
export function monthLabel(month, year) {
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
}

// Loading-Spinner in Container
export function showLoading(containerId) {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = `<div class="empty-state">Wird geladen…</div>`;
}

// Fehler anzeigen
export function showError(containerId, msg) {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = `<div class="empty-state" style="color:var(--red)">${msg}</div>`;
}
