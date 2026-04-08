// ============================================================
// ui.js – Shared UI Helfer
// ============================================================

import { logout, fillCommunityName } from './auth-guard.js';

const NAV_PAGES = [
  { key: 'dashboard',    label: 'Start',        href: '/index.html',        icon: `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>` },
  { key: 'members',      label: 'Mitglieder',   href: '/members.html',      icon: `<svg viewBox="0 0 24 24"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0-3-3.87"/></svg>` },
  { key: 'payments',     label: 'Zahlungen',    href: '/payments.html',     icon: `<svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>` },
  { key: 'cases',        label: 'Fälle',        href: '/cases.html',        icon: `<svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>` },
  { key: 'transactions', label: 'Kasse',         href: '/transactions.html', icon: `<svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>` },
  { key: 'audit',        label: 'Log',           href: '/audit.html',        icon: `<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/></svg>` },
  { key: 'import',       label: 'Import',        href: '/import.html',       icon: `<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`, adminOnly: true },
];

export function renderLayout(activePage) {
  const role  = sessionStorage.getItem('user_role');
  const admin = role === 'admin' || role === 'kassenwart';

  const visiblePages = NAV_PAGES.filter(p => !p.adminOnly || admin);

  // ── Sidebar ──
  const sidebar = document.getElementById('sidebar');
  const navLinks = visiblePages.map(p => `
    <a href="${p.href}" class="${activePage === p.key ? 'active' : ''}">
      <span class="nav-dot"></span>${p.label}
    </a>`).join('');

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
        <span>${admin ? 'Admin-Bereich' : 'Mitglied'}</span>
      </div>
      <a class="logout-link" id="logout-btn">Abmelden</a>
    </div>
  `;

  // ── Bottom Nav (Mobile) ──
  if (!document.getElementById('bottom-nav')) {
    const bn = document.createElement('nav');
    bn.id = 'bottom-nav';
    bn.className = 'bottom-nav';
    const mobilePages = visiblePages.slice(0, 5);
    bn.innerHTML = mobilePages.map(p => `
      <a href="${p.href}" class="${activePage === p.key ? 'active' : ''}">
        ${p.icon}
        ${p.label}
      </a>`).join('');
    document.body.appendChild(bn);
  }

  fillCommunityName();

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await logout();
  });

  // Toast
  if (!document.getElementById('toast')) {
    const t = document.createElement('div');
    t.id = 'toast';
    document.body.appendChild(t);
  }
}

export function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `show toast-${type}`;
  setTimeout(() => { toast.className = ''; }, 3000);
}

export function openModal(id)  { document.getElementById(id)?.classList.remove('hidden'); }
export function closeModal(id) { document.getElementById(id)?.classList.add('hidden'); }

export function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
}

export function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatEur(amount) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount ?? 0);
}

export function monthLabel(month, year) {
  return new Date(year, month - 1, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
}

export function showLoading(containerId) {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = `<div class="empty-state">Wird geladen…</div>`;
}

export function showError(containerId, msg) {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = `<div class="empty-state" style="color:var(--red)">${msg}</div>`;
}
