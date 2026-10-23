/* ==========================================================================
   KIM — le labyrinthe
   ========================================================================== */

(() => {
  'use strict';

  const D = window.KIM;
  const M = window.DEDALE_MAP;
  const A = window.KimAudio || { setOn() {}, steps() {}, ping() {}, wall() {}, tone() {}, on: false };

  const root = document.documentElement;
  const body = document.body;
  const world = document.getElementById('world');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touchy = matchMedia('(hover: none)').matches;
  const DUR = reduced ? 0 : 900;

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = n => String(n).padStart(2, '0');

  /* ------------------------------------------------------------------------
     Mémoire du visiteur (navigateur uniquement)
     ------------------------------------------------------------------------ */
  const KEY = 'kim.dedale.v1';
  const saved = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } })();
  const state = {
    visited: new Set(saved.visited || []),
    frags: new Set(saved.frags || []),
    light: !!saved.light,
    sound: !!saved.sound,
    toldSystem: !!saved.toldSystem
  };
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        visited: [...state.visited], frags: [...state.frags],
        light: state.light, sound: state.sound, toldSystem: state.toldSystem
      }));
    } catch (e) { /* navigation privée : tant pis */ }
  }

  /* ------------------------------------------------------------------------
     Construction du plan
     ------------------------------------------------------------------------ */
  const rooms = {};
  const OPP = { n: 's', s: 'n', e: 'w', w: 'e' };
  const DIRNAME = { n: 'nord', s: 'sud', e: 'est', w: 'ouest' };
  const ARROW = { n: '↑', s: '↓', e: '→', w: '←' };
  const pairKey = (a, b) => [a, b].sort().join('|');
  const secrets = new Set((M.secret || []).map(p => pairKey(p[0], p[1])));

  for (const id of Object.keys(M.rooms)) {
    const el = document.getElementById(id);
    if (!el) { console.warn('[KIM] salle absente du HTML :', id); continue; }
    const [x, y] = M.rooms[id];
    el.style.setProperty('--x', x);
    el.style.setProperty('--y', y);
    rooms[id] = { id, x, y, el, links: {}, name: el.dataset.name || id, light: parseFloat(el.dataset.light) || 1 };
  }

  for (const [a, b] of M.links) {
    const A_ = rooms[a], B_ = rooms[b];
    if (!A_ || !B_) continue;
    const dx = B_.x - A_.x, dy = B_.y - A_.y;
    let d = null;
    if (dx === 1 && dy === 0) d = 'e';
    else if (dx === -1 && dy === 0) d = 'w';
    else if (dy === 1 && dx === 0) d = 's';
    else if (dy === -1 && dx === 0) d = 'n';
    if (!d) { console.warn('[KIM] salles non voisines :', a, b); continue; }
    const secret = secrets.has(pairKey(a, b));
    A_.links[d] = { to: b, secret };
    B_.links[OPP[d]] = { to: a, secret };
  }

  const ROOM_TOTAL = Object.keys(rooms).length;
  const FRAG_TOTAL = $$('[data-frag]').length;

  for (const r of Object.values(rooms)) {
    for (const d of ['n', 'e', 's', 'w']) {
      const l = r.links[d];
      if (!l) continue;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'door door-' + d + (l.secret ? ' secret' : '');
      b.dataset.dir = d;
      b.setAttribute('aria-label', 'Passage ' + DIRNAME[d]);
      b.innerHTML = '<span class="door-line"></span><span class="door-arrow" aria-hidden="true">' + ARROW[d] + '</span>';
      b.addEventListener('click', () => go(d));
      r.el.appendChild(b);
    }
    const dk = document.createElement('div');
    dk.className = 'dark';
    dk.setAttribute('aria-hidden', 'true');
    r.el.appendChild(dk);
  }

  /* ------------------------------------------------------------------------
     Rendu des données (data.js)
     ------------------------------------------------------------------------ */
  function identHTML() {
    const rows = D.fiche.map(f =>
      '<div class="file-row"><dt>' + esc(f.label) + '</dt><dd>' +
      (f.inconnu ? '<span class="unknown" data-glitch="' + esc(f.valeur) + '">' + esc(f.valeur) + '</span>' : esc(f.valeur)) +
      '</dd></div>').join('');
    return '<div class="file-head" aria-hidden="true"><span>SUJET</span><span>EXCAVATEUR</span></div><dl style="margin:0">' + rows + '</dl>';
  }

  function statsHTML() {
    const seg = lvl => Array.from({ length: 20 }, (_, i) => '<i' + (i < lvl ? ' class="on"' : '') + '></i>').join('');
    const rows = D.stats.map(s =>
      '<div class="st"><span class="st-k">' + esc(s.nom) + '</span><span class="seg" aria-hidden="true">' + seg(s.lvl) +
      '</span><span class="st-v">LVL.' + pad(s.lvl) + '</span></div>').join('');
    const rolls = D.rolls.map(r =>
      '<div class="st"><span class="st-k">' + esc(r.nom) + '</span><span class="roll" aria-hidden="true"><b style="--v:' + Number(r.val) +
      '"></b></span><span class="st-v">' + Number(r.val) + '/100</span></div>').join('');
    return '<p class="sys-sub">Sujet : KIM — Humain</p><div class="st-list">' + rows +
      '</div><p class="sys-sep">— ROLLS —</p><div class="st-list">' + rolls + '</div>';
  }

  function lv(c) {
    if (c.niveau == null) return '';
    return 'LV' + c.niveau + (c.max != null ? '/LV' + c.max : '');
  }
  function skillHTML(c) {
    let dl = '';
    if (c.effet) dl += '<dt>Effet :</dt><dd>' + esc(c.effet) + '</dd>';
    if (c.contraintes) dl += '<dt>Contraintes :</dt><dd>' + esc(c.contraintes) + '</dd>';
    if (c.evolution) dl += '<dt>Évolution :</dt><dd>' + esc(c.evolution) + '</dd>';
    return '<article class="skill"><h4>' + esc(c.nom) + '<span>' + esc(lv(c)) + '</span></h4>' + (dl ? '<dl>' + dl + '</dl>' : '') + '</article>';
  }
  function compHTML() {
    const c = D.competences || {};
    const groups = [
      ['COMPÉTENCE SPÉCIALE PRIMAIRE', c.csp || []],
      ['COMPÉTENCES SIMPLES', c.simples || []],
      ['COMPÉTENCES SPÉCIALES', c.speciales || []]
    ];
    const total = groups.reduce((n, g) => n + g[1].length, 0);
    let h = '<p class="req">&gt; requête : afficher compétences<br>' +
      (total ? total + ' compétence(s) enregistrée(s).' : 'AUCUNE COMPÉTENCE ENREGISTRÉE.') + '</p>';
    for (const [t, list] of groups) {
      h += '<section class="sys-section"><h3>' + t + '</h3>' +
        (list.length ? list.map(skillHTML).join('') : '<p class="sys-empty">— aucune donnée —</p>') + '</section>';
    }
    return h;
  }

  function titresHTML() {
    const t = D.titres || [];
    let h = '<p class="req">&gt; requête : afficher titres<br>' +
      (t.length ? t.length + ' titre(s) reçu(s).' : 'AUCUN TITRE REÇU.') + '</p>';
    if (!t.length) {
      h += '<p class="sys-empty">— en attente —</p>';
    } else {
      h += t.map(x =>
        '<p class="notif">KIM reçoit le titre <q>' + esc(x.nom) + '</q>' +
        (x.recompenses ? ' + ' + esc(x.recompenses) : '') + '</p>' +
        (x.description ? '<p class="sys-dim" style="margin:-4px 0 10px">' + esc(x.description) + '</p>' : '')).join('');
    }
    return h;
  }

  const win = (title, right, inner) =>
    '<div class="sys-head"><span>' + title + '</span><span>' + right + '</span></div><div class="sys-body">' + inner + '</div>';

  function exploredText() {
    return 'Salles explorées : ' + pad(state.visited.size) + '/' + ROOM_TOTAL +
      ' · Fragments : ' + pad(state.frags.size) + '/' + pad(FRAG_TOTAL);
  }

  function renderAll() {
    $$('[data-render]').forEach(el => {
      switch (el.dataset.render) {
        case 'identite': el.innerHTML = identHTML(); break;
        case 'stats': el.innerHTML = win('STATISTIQUES', 'KIM', statsHTML()); break;
        case 'competences': el.innerHTML = win('COMPÉTENCES', 'KIM', compHTML()); break;
        case 'titres': el.innerHTML = win('TITRES', 'KIM', titresHTML()); break;
        case 'explored': el.textContent = exploredText(); break;
      }
    });
  }
  renderAll();

  /* « hyperlaxe » : les lettres se tordent */
  $$('.contort').forEach(el => {
    const word = el.textContent;
    el.setAttribute('aria-label', word);
    el.innerHTML = Array.from(word).map((ch, i) => {
      const d = ((i * 37) % 13) - 6;
      return '<span aria-hidden="true" style="--i:' + i + ';--d:' + d + '">' + esc(ch) + '</span>';
    }).join('');
  });

  /* ------------------------------------------------------------------------
     La lampe
     ------------------------------------------------------------------------ */
  let tx = innerWidth / 2, ty = innerHeight / 2;
  let lx = tx, ly = ty;
  let rMul = 0, rMulT = 1, flick = 1;
  let current = null, moving = false;
  let colorFrag = null;

  const baseR = () => {
    const m = Math.min(innerWidth, innerHeight);
    return Math.max(120, m * (touchy ? .36 : .25));
  };

  addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; }, { passive: true });
  addEventListener('pointerdown', e => { tx = e.clientX; ty = e.clientY; }, { passive: true });

  /* au clavier, la lumière suit le focus */
  document.addEventListener('focusin', e => {
    const t = e.target;
    if (!t.closest || !t.closest('.room') || t.classList.contains('room')) return;
    const r = t.getBoundingClientRect();
    tx = Math.min(innerWidth - 40, Math.max(40, r.left + r.width / 2));
    ty = Math.min(innerHeight - 40, Math.max(40, r.top + r.height / 2));
  });

  let lastR = -1, lastX = -1, lastY = -1;
  function frame(t) {
    const k = reduced ? 1 : .2;
    lx += (tx - lx) * k;
    ly += (ty - ly) * k;
    rMul += (rMulT - rMul) * (reduced ? 1 : .07);

    let f = 1;
    if (!reduced) {
      f = 1 + Math.sin(t / 140) * .012 + Math.sin(t / 53) * .007;
      if (Math.random() < .003) flick = .82 + Math.random() * .08;
      flick += (1 - flick) * .12;
      f *= flick;
    }
    const R = baseR() * rMul * f;

    if (Math.abs(R - lastR) > .3) { root.style.setProperty('--rr', R.toFixed(1) + 'px'); lastR = R; }
    if (Math.abs(lx - lastX) > .3 || Math.abs(ly - lastY) > .3) {
      root.style.setProperty('--lx', lx.toFixed(1) + 'px');
      root.style.setProperty('--ly', ly.toFixed(1) + 'px');
      lastX = lx; lastY = ly;
    }
    if (colorFrag) {
      const b = colorFrag.getBoundingClientRect();
      colorFrag.style.setProperty('--mx', (lx - b.left).toFixed(1) + 'px');
      colorFrag.style.setProperty('--my', (ly - b.top).toFixed(1) + 'px');
    }
    requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------------------
     Déplacements
     ------------------------------------------------------------------------ */
  const show = r => { r.el.hidden = false; };
  const hide = r => { r.el.hidden = true; r.el.inert = true; };
  const setCam = r => { root.style.setProperty('--cx', r.x); root.style.setProperty('--cy', r.y); };

  function jump(id) {
    const r = rooms[id] || rooms[M.start];
    Object.values(rooms).forEach(x => { if (x !== r) hide(x); });
    world.classList.add('no-anim');
    show(r);
    setCam(r);
    void world.offsetWidth;
    world.classList.remove('no-anim');
    r.el.inert = false;
    current = r;
    arrive(r, null);
  }

  function go(d) {
    if (moving || !current || introOpen || sysDialog.open) return;
    const l = current.links[d];
    if (!l) { bump(d); return; }
    const target = rooms[l.to];
    const prev = current;
    moving = true;
    body.classList.add('is-moving');
    rMulT = .12;
    A.steps();
    leave(prev);
    show(target);
    target.el.inert = true;
    void target.el.offsetWidth;
    setCam(target);
    setTimeout(() => {
      hide(prev);
      target.el.inert = false;
      current = target;
      moving = false;
      body.classList.remove('is-moving');
      arrive(target, d);
    }, DUR);
  }

  let bumpTimer = 0;
  function bump(d) {
    if (!current) return;
    A.wall();
    const el = current.el;
    el.classList.remove('bump-n', 'bump-s', 'bump-e', 'bump-w');
    void el.offsetWidth;
    el.classList.add('bump-' + d);
    clearTimeout(bumpTimer);
    bumpTimer = setTimeout(() => el.classList.remove('bump-' + d), 120);
  }

  const srLive = $('#sr-live');

  function arrive(r, fromDir) {
    rMulT = r.light;
    const first = !state.visited.has(r.id);
    state.visited.add(r.id);

    try { history.replaceState(null, '', '#' + r.id); } catch (e) { /* file:// */ }

    srLive.textContent = r.el.getAttribute('aria-label') || r.name;
    r.el.focus({ preventScroll: true });

    /* les fenêtres Système s'allument */
    $$('.sys-window', r.el).forEach(w => {
      w.classList.remove('power');
      void w.offsetWidth;
      w.classList.add('power');
    });

    /* fragments */
    const fr = $('[data-frag]', r.el);
    colorFrag = $('.frag.has-color', r.el);
    if (fr) {
      const n = fr.dataset.frag;
      if (!state.frags.has(n)) {
        state.frags.add(n);
        A.tone();
        toast('FRAGMENT', 'Fragment ' + pad(n) + ' récupéré. [' + pad(state.frags.size) + '/' + pad(FRAG_TOTAL) + ']');
        if (state.frags.size === FRAG_TOTAL) {
          setTimeout(() => toast('SYSTÈME', 'Tous les fragments ont été récupérés.'), 1600);
        }
      }
    }

    if (r.id === 'enfant') {
      if (first) { A.tone(); setTimeout(() => toast('ZONE', 'Zone non répertoriée.'), 600); }
      $$('.late', r.el).forEach(p => {
        if (p.classList.contains('on')) return;
        setTimeout(() => { if (current === r) p.classList.add('on'); }, reduced ? 0 : +p.dataset.delay || 0);
      });
    }

    if (r.id === 'esprit') monitor.start();
    if (r.id === 'seuil' && !state.toldSystem) {
      state.toldSystem = true;
      setTimeout(() => toast('SYSTÈME', 'Connexion établie. Requêtes : touche /'), 1400);
    }

    renderAll();
    save();
  }

  function leave(r) {
    if (r.id === 'esprit') monitor.stop();
  }

  /* ------------------------------------------------------------------------
     Clavier
     ------------------------------------------------------------------------ */
  const KEYDIR = {
    arrowup: 'n', z: 'n', w: 'n',
    arrowdown: 's', s: 's',
    arrowleft: 'w', q: 'w', a: 'w',
    arrowright: 'e', d: 'e'
  };

  addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (introOpen) {
      if (k === 'enter' || k === ' ') return; // laisse le bouton gérer
      skipIntro();
      return;
    }
    if (sysDialog.open) return;
    if (e.target.closest && e.target.closest('input, textarea')) return;

    if (KEYDIR[k]) { e.preventDefault(); go(KEYDIR[k]); }
    else if (k === '/' || k === ':' || k === '!') { e.preventDefault(); openConsole(); }
    else if (k === 'm') { e.preventDefault(); openConsole('carte'); }
    else if (k === 'l') { e.preventDefault(); setLight(!state.light); }
  });

  /* ------------------------------------------------------------------------
     Lumière / son
     ------------------------------------------------------------------------ */
  const btnLight = $('#btn-light');
  const btnSound = $('#btn-sound');

  function setLight(v) {
    state.light = !!v;
    body.classList.toggle('lights-on', state.light);
    btnLight.setAttribute('aria-pressed', String(state.light));
    save();
  }
  function setSound(v) {
    state.sound = !!v;
    A.setOn(state.sound);
    btnSound.setAttribute('aria-pressed', String(state.sound));
    introSound.setAttribute('aria-pressed', String(state.sound));
    introSound.textContent = 'Son : ' + (state.sound ? 'oui' : 'non');
    save();
  }
  btnLight.addEventListener('click', () => setLight(!state.light));
  btnSound.addEventListener('click', () => setSound(!state.sound));
  $('#btn-sys').addEventListener('click', () => openConsole());
  $('#btn-map').addEventListener('click', () => openConsole('carte'));

  /* ------------------------------------------------------------------------
     Notifications Système
     ------------------------------------------------------------------------ */
  const toasts = $('#toasts');
  function toast(title, text) {
    const t = document.createElement('div');
    t.className = 'sys toast';
    t.innerHTML = win('[' + esc(title) + ']', '', '<p>' + esc(text) + '</p>');
    toasts.appendChild(t);
    A.ping();
    setTimeout(() => {
      t.classList.add('out');
      setTimeout(() => t.remove(), 500);
    }, 4800);
  }

  /* ------------------------------------------------------------------------
     Console Système — « il suffit de s'adresser à lui »
     ------------------------------------------------------------------------ */
  const sysDialog = $('#console');
  const log = $('#console-log');
  const input = $('#console-input');

  function out(html, cls) {
    const d = document.createElement('div');
    d.className = 'out' + (cls ? ' ' + cls : '');
    d.innerHTML = html;
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
  }

  function openConsole(cmd) {
    if (introOpen) return;
    if (!sysDialog.open) {
      sysDialog.showModal();
      A.ping();
      if (!log.children.length) {
        out('<p>SYSTÈME — en ligne.</p><p class="sys-dim">Adressez votre requête. « aide » pour la liste.</p>');
      }
    }
    if (cmd) run(cmd);
    if (!touchy) input.focus();
  }
  $('.sys-close', sysDialog).addEventListener('click', () => sysDialog.close());
  sysDialog.addEventListener('click', e => { if (e.target === sysDialog) sysDialog.close(); });
  sysDialog.addEventListener('close', () => { if (current) current.el.focus({ preventScroll: true }); });

  $('#console-form').addEventListener('submit', e => {
    e.preventDefault();
    const v = input.value.trim();
    input.value = '';
    if (v) run(v);
  });
  $$('.chips button').forEach(b => b.addEventListener('click', () => run(b.dataset.cmd)));

  /* historique ↑ ↓ */
  const hist = [];
  let hi = 0;
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp' && hist.length) { e.preventDefault(); hi = Math.max(0, hi - 1); input.value = hist[hi]; }
    else if (e.key === 'ArrowDown' && hist.length) { e.preventDefault(); hi = Math.min(hist.length, hi + 1); input.value = hist[hi] || ''; }
  });

  const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9?\s-]/g, ' ').replace(/\s+/g, ' ').trim();

  const ALIAS = {
    aide: 'aide', help: 'aide', '?': 'aide', commandes: 'aide',
    carte: 'carte', map: 'carte', plan: 'carte',
    statistiques: 'stats', statistique: 'stats', stats: 'stats', stat: 'stats',
    competences: 'comp', competence: 'comp', skills: 'comp', cs: 'comp', csp: 'comp',
    titres: 'titres', titre: 'titres', titles: 'titres',
    fragments: 'frags', fragment: 'frags', galerie: 'frags', images: 'frags',
    identite: 'ident', fiche: 'ident', kim: 'ident', nom: 'ident',
    position: 'pos', ou: 'pos', localisation: 'pos', ici: 'pos',
    lumiere: 'lumiere', light: 'lumiere', allumer: 'lumiere', eteindre: 'lumiere',
    son: 'son', sound: 'son', audio: 'son',
    effacer: 'clear', clear: 'clear', cls: 'clear',
    sortie: 'sortie', sortir: 'sortie', exit: 'sortie', issue: 'sortie',
    emotions: 'emo', emotion: 'emo', ressentir: 'emo', ressent: 'emo', sentiments: 'emo',
    retour: 'retour', seuil: 'retour', home: 'retour', accueil: 'retour', depart: 'retour',
    oublier: 'oublier', reset: 'oublier', reinitialiser: 'oublier',
    privilege: 'priv', privileges: 'priv', niveau: 'priv'
  };

  let forgetArmed = false;

  function run(raw) {
    hist.push(raw); hi = hist.length;
    out('<span class="echo">&gt; ' + esc(raw) + '</span>');
    const n = norm(raw);
    let cmd = ALIAS[n];
    if (!cmd) {
      for (const w of n.split(' ')) { if (ALIAS[w]) { cmd = ALIAS[w]; break; } }
    }
    if (cmd !== 'oublier') forgetArmed = false;

    switch (cmd) {
      case 'aide':
        out('<p>Requêtes reconnues :</p><p class="sys-dim">carte · statistiques · compétences · titres · fragments · identité · position · lumière · son · effacer</p><p class="sys-dim">Déplacement : flèches ou ZQSD. Raccourcis : M (carte), L (lumière), / (Système).</p>');
        break;
      case 'carte':
        out('<div class="out-block">' + mapSVG() + '<p class="map-legend">Seules les salles visitées sont enregistrées.</p></div>');
        break;
      case 'stats':
        out('<div class="out-block">' + statsHTML() + '</div>');
        break;
      case 'comp':
        out('<div class="out-block">' + compHTML() + '</div>');
        break;
      case 'titres':
        out('<div class="out-block">' + titresHTML() + '</div>');
        break;
      case 'frags':
        out('<div class="out-block">' + fragsHTML() + '</div>');
        break;
      case 'ident':
        out('<p>' + D.fiche.map(f => esc(f.label).toUpperCase() + ' : ' + esc(f.valeur)).join('<br>') + '</p>');
        break;
      case 'pos':
        out('<p>Secteur [' + current.x + '·' + current.y + '] — ' + esc(current.id === 'enfant' ? '???' : current.name) + '</p><p class="sys-dim">' + exploredText() + '</p>');
        break;
      case 'lumiere':
        setLight(!state.light);
        out('<p>Lumière : ' + (state.light ? 'allumée' : 'éteinte') + '.</p>');
        break;
      case 'son':
        setSound(!state.sound);
        out('<p>Son : ' + (state.sound ? 'activé' : 'coupé') + '.</p>');
        break;
      case 'clear':
        log.innerHTML = '';
        break;
      case 'sortie':
        out('<p>Requête refusée.</p><p>L\'existence d\'une sortie n\'a pas été prouvée.</p>', 'refus');
        break;
      case 'emo':
        out('<p>Analyse en cours…</p><p>Aucune donnée.</p>');
        break;
      case 'retour':
        out('<p>Requête refusée. Niveau de privilège insuffisant.</p><p>Trouvez le chemin vous-même.</p>', 'refus');
        break;
      case 'priv':
        out('<p>Requête refusée. Information réservée.</p>', 'refus');
        break;
      case 'oublier':
        if (!forgetArmed) {
          forgetArmed = true;
          out('<p>Effacer les salles visitées et les fragments ?</p><p class="sys-dim">Confirmez en tapant à nouveau « oublier ».</p>');
        } else {
          forgetArmed = false;
          forget();
          out('<p>Mémoire effacée.</p>');
        }
        break;
      default:
        out('<p>Requête non reconnue.</p>', 'refus');
    }
  }

  function forget() {
    state.visited = new Set(current ? [current.id] : []);
    state.frags = new Set();
    $$('.late.on').forEach(p => p.classList.remove('on'));
    save();
    renderAll();
  }
  $$('[data-action="forget"]').forEach(b => b.addEventListener('click', () => {
    forget();
    toast('SYSTÈME', 'Chemin oublié.');
  }));

  function mapSVG() {
    const s = 30, g = 16, pad_ = 12;
    const W = M.cols * s + (M.cols - 1) * g + pad_ * 2;
    const H = M.rows * s + (M.rows - 1) * g + pad_ * 2;
    const cx = x => pad_ + x * (s + g);
    const cy = y => pad_ + y * (s + g);
    let svg = '<svg class="map" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Carte. ' +
      state.visited.size + ' salles visitées sur ' + ROOM_TOTAL + '.">';
    for (let y = 0; y < M.rows; y++) for (let x = 0; x < M.cols; x++) {
      svg += '<rect class="cell-unk" x="' + cx(x) + '" y="' + cy(y) + '" width="' + s + '" height="' + s + '"/>';
    }
    const drawn = new Set();
    for (const r of Object.values(rooms)) {
      if (!state.visited.has(r.id)) continue;
      for (const d of Object.keys(r.links)) {
        const o = rooms[r.links[d].to];
        const key = pairKey(r.id, o.id);
        if (drawn.has(key) || !state.visited.has(o.id)) continue;
        drawn.add(key);
        svg += '<line class="link" x1="' + (cx(r.x) + s / 2) + '" y1="' + (cy(r.y) + s / 2) + '" x2="' + (cx(o.x) + s / 2) + '" y2="' + (cy(o.y) + s / 2) + '"/>';
      }
    }
    for (const r of Object.values(rooms)) {
      if (!state.visited.has(r.id)) continue;
      const cur = r === current;
      if (cur) svg += '<rect class="cell-cur-ring" x="' + (cx(r.x) - 4) + '" y="' + (cy(r.y) - 4) + '" width="' + (s + 8) + '" height="' + (s + 8) + '"/>';
      svg += '<rect class="' + (cur ? 'cell-cur' : 'cell') + '" x="' + cx(r.x) + '" y="' + cy(r.y) + '" width="' + s + '" height="' + s + '"/>';
      const label = r.id === M.start ? 'S' : (r.el.querySelector('[data-frag]') ? '◆' : (r.id === 'enfant' ? '?' : ''));
      svg += '<text x="' + (cx(r.x) + s / 2) + '" y="' + (cy(r.y) + s / 2 + 3) + '" text-anchor="middle">' + label + '</text>';
    }
    return svg + '</svg>';
  }

  function fragsHTML() {
    let h = '<p class="req">Fragments : ' + pad(state.frags.size) + '/' + pad(FRAG_TOTAL) + '</p><div class="frag-grid">';
    $$('[data-frag]').sort((a, b) => a.dataset.frag - b.dataset.frag).forEach(f => {
      const n = f.dataset.frag;
      if (state.frags.has(n)) {
        const img = f.querySelector('img');
        h += '<div><img src="' + esc(img.getAttribute('src')) + '" alt="' + esc(img.alt) + '"></div>';
      } else {
        h += '<div><span aria-label="Fragment non trouvé">?</span></div>';
      }
    });
    return h + '</div>';
  }

  /* ------------------------------------------------------------------------
     Le moniteur de l'esprit : une ligne plate.
     De temps en temps, une réaction parfaitement artificielle.
     ------------------------------------------------------------------------ */
  const monitor = (() => {
    const cv = $('.mon-canvas');
    const label = $('.mon-label');
    const read = $('.mon-read b');
    if (!cv) return { start() {}, stop() {} };
    const ctx = cv.getContext('2d');
    let w = 0, h = 0, dpr = 1, pts = [], queue = [], running = false, next = 0, raf = 0;
    const STEP = 2;
    const SHAPE = [0, -3, -8, -15, -24, -15, -8, -3, 0, 4, 9, 4, 0];

    function size() {
      dpr = Math.min(2, devicePixelRatio || 1);
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.ceil(w / STEP) + 2;
      while (pts.length < n) pts.unshift(0);
      if (pts.length > n) pts = pts.slice(pts.length - n);
    }
    function draw() {
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(75,245,132,.12)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 20) { ctx.beginPath(); ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, h); ctx.stroke(); }
      for (let y = 0; y < h; y += 20) { ctx.beginPath(); ctx.moveTo(0, y + .5); ctx.lineTo(w, y + .5); ctx.stroke(); }
      ctx.strokeStyle = '#4bf584';
      ctx.shadowColor = 'rgba(75,245,132,.7)';
      ctx.shadowBlur = 6;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      const mid = h / 2;
      pts.forEach((v, i) => { const x = i * STEP; i ? ctx.lineTo(x, mid + v) : ctx.moveTo(x, mid + v); });
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    function loop(t) {
      if (!running) return;
      if (t > next) {
        queue.push(...SHAPE.flatMap(v => [v, v]));
        next = t + 6500 + Math.random() * 5000;
        label.classList.add('on');
        setTimeout(() => label.classList.remove('on'), 1700);
      }
      const v = queue.length ? queue.shift() : 0;
      pts.push(v); pts.shift();
      read.textContent = (Math.abs(v) / 24).toFixed(2);
      draw();
      raf = requestAnimationFrame(loop);
    }
    addEventListener('resize', () => { if (running) size(); });
    return {
      start() {
        size();
        if (reduced) { draw(); return; }
        if (running) return;
        running = true;
        next = performance.now() + 2600;
        raf = requestAnimationFrame(loop);
      },
      stop() { running = false; cancelAnimationFrame(raf); }
    };
  })();

  /* ------------------------------------------------------------------------
     Intro
     ------------------------------------------------------------------------ */
  const intro = $('#intro');
  const introSound = $('#intro-sound');
  let introOpen = true;
  const introTimers = [];
  const lines = $$('.intro-line', intro);
  const actions = $('.intro-actions', intro);

  function showIntroAll() {
    introTimers.forEach(clearTimeout);
    lines.forEach(l => l.classList.add('on'));
    actions.classList.add('on');
  }
  function skipIntro() {
    if (!actions.classList.contains('on')) showIntroAll();
  }

  if (reduced) showIntroAll();
  else {
    lines.forEach((l, i) => introTimers.push(setTimeout(() => l.classList.add('on'), 500 + i * 1700)));
    introTimers.push(setTimeout(() => actions.classList.add('on'), 500 + lines.length * 1700));
  }
  intro.addEventListener('click', e => { if (!e.target.closest('button')) skipIntro(); });

  introSound.addEventListener('click', () => setSound(!state.sound));
  introSound.setAttribute('aria-pressed', String(state.sound));
  introSound.textContent = 'Son : ' + (state.sound ? 'oui' : 'non');

  function enter(lightOn) {
    if (!introOpen) return;
    introOpen = false;
    if (lightOn) setLight(true);
    if (state.sound) A.setOn(true);
    intro.classList.add('gone');
    intro.setAttribute('aria-hidden', 'true');
    const hash = decodeURIComponent(location.hash.slice(1));
    jump(rooms[hash] ? hash : M.start);
    rMul = 0;
  }
  $('#btn-enter').addEventListener('click', () => enter(false));
  $('#intro-light').addEventListener('click', () => enter(true));

  addEventListener('hashchange', () => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!introOpen && rooms[id] && current && id !== current.id && !moving) {
      leave(current);
      jump(id);
    }
  });

  /* ------------------------------------------------------------------------
     Démarrage
     ------------------------------------------------------------------------ */
  Object.values(rooms).forEach(r => { r.el.hidden = true; r.el.inert = true; });
  setLight(state.light);
  btnSound.setAttribute('aria-pressed', String(state.sound));
  setTimeout(() => $('#btn-enter').focus({ preventScroll: true }), 50);
  requestAnimationFrame(frame);
})();
