/* Copyright 2026 Naoaki Tsuda. SPDX-License-Identifier: BSD-3-Clause */
(() => {
  'use strict';
  const id = 'G-4MHM8N068S';
  const key = 'research.analytics-consent.v1';
  const legacyKey = 'lctr.analytics-consent.v1';
  const panel = document.querySelector('[data-analytics-panel]');
  const settings = document.querySelector('[data-analytics-settings]');
  const status = document.querySelector('[data-analytics-status]');
  if (!panel || !settings || !status) return;
  const allow = panel.querySelector('[data-analytics-allow]');
  const deny = panel.querySelector('[data-analytics-deny]');
  const privacyLink = panel.querySelector('a');
  const privacy = document.getElementById('analytics-privacy');
  if (!allow || !deny || !privacyLink || !privacy) return;
  const ja = document.documentElement.lang === 'ja';
  let choice = null;
  let started = false;
  try {
    const saved = localStorage.getItem(key);
    if (saved === 'allow' || saved === 'deny') choice = saved;
    // An old refusal remains valid; an LCTR-only grant does not cover the root.
    else if (localStorage.getItem(legacyKey) === 'deny') {
      choice = 'deny';
      localStorage.setItem(key, choice);
    }
  } catch (_) { /* No persistence. */ }

  function expireCookies(names, path) {
    for (const name of names) {
      for (const domain of ['', '; Domain=' + location.hostname]) {
        document.cookie = name + '=; Max-Age=0; Path=' + path + domain + '; SameSite=Lax; Secure';
      }
    }
  }

  function clearLegacyCookies() {
    // These cookies are not visible from /, so remove their known names directly.
    expireCookies(['lctr_ga', 'lctr_ga_4MHM8N068S'], '/lctr/');
  }

  function render() {
    status.textContent = choice === 'allow'
      ? (ja ? 'GA4による計測を許可しています。' : 'GA4 measurement is allowed.')
      : (ja ? 'GA4による計測は停止しています。' : 'GA4 measurement is off.');
    settings.hidden = false;
    panel.hidden = choice !== null;
    settings.setAttribute('aria-expanded', String(!panel.hidden));
  }

  function start() {
    clearLegacyCookies();
    // Preview and private-test hosts must never contribute production traffic.
    const includedPath = location.pathname === '/' || location.pathname === '/index.html' ||
      location.pathname.startsWith('/lctr/');
    if (started || location.protocol !== 'https:' ||
        location.hostname !== 'tsuda-naoaki.github.io' || !includedPath) return;
    started = true;
    window['ga-disable-' + id] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', {
      ad_storage: 'denied', ad_user_data: 'denied',
      ad_personalization: 'denied', analytics_storage: 'granted'
    });
    window.gtag('js', new Date());
    window.gtag('config', id, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      cookie_domain: location.hostname,
      cookie_path: '/',
      cookie_prefix: 'research',
      cookie_flags: 'SameSite=Lax;Secure'
    });
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
    document.head.appendChild(script);
  }

  function stop() {
    window['ga-disable-' + id] = true;
    const names = new Set(['research_ga', 'research_ga_4MHM8N068S']);
    for (const cookie of document.cookie.split(';')) {
      const name = cookie.trim().split('=')[0];
      if (/^research_ga(?:_|$)/.test(name)) names.add(name);
    }
    expireCookies(names, '/');
    clearLegacyCookies();
  }

  function choose(value) {
    choice = value;
    try { localStorage.setItem(key, value); } catch (_) { /* Current page only. */ }
    render();
    if (value === 'allow') start();
    else {
      stop();
      if (started) location.reload();
    }
    settings.focus({ preventScroll: true });
  }
  settings.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    settings.setAttribute('aria-expanded', String(!panel.hidden));
    if (!panel.hidden) allow.focus();
  });
  allow.addEventListener('click', () => choose('allow'));
  deny.addEventListener('click', () => choose('deny'));
  privacyLink.addEventListener('click', () => {
    privacy.open = true;
    panel.hidden = true;
    settings.setAttribute('aria-expanded', 'false');
  });
  // Revocation, key removal, and localStorage.clear() also stop other open tabs.
  window.addEventListener('storage', (event) => {
    if ((event.key === key || event.key === null) && event.newValue !== 'allow') {
      choice = event.newValue === 'deny' ? 'deny' : null;
      stop(); render();
      if (started) location.reload();
    }
  });
  render();
  if (choice === 'allow') start();
  else stop();
})();
