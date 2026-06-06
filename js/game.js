/* ============================================================
   SKYZONE · GAME CONTROLLER (mockup UI)
   ============================================================ */
(function () {
  const D = SKY.D, E = SKY.E, S = SKY.S, W = SKY.W, C = SKY.C, DUN = SKY.DUN, UI = SKY.UI, CHAT = SKY.CHAT, FB = SKY.FB;
  const $ = UI.$, $$ = UI.$$;
  let pickedCity = null;

  // ---------- AUTH STORAGE (localStorage cache + Firebase) ----------
  const ACTIVE_USER_KEY = 'skyzone_active_user';
  const ACTIVE_CHAR_KEY = 'skyzone_active_char';

  function activeUser() { return localStorage.getItem(ACTIVE_USER_KEY) || ''; }
  function setActiveUser(u) { if (u) localStorage.setItem(ACTIVE_USER_KEY, u); else localStorage.removeItem(ACTIVE_USER_KEY); }
  function activeCharIdx() { return parseInt(localStorage.getItem(ACTIVE_CHAR_KEY)) || 0; }
  function setActiveChar(i) { localStorage.setItem(ACTIVE_CHAR_KEY, String(i)); }

  function charSaveKey(user, idx) { return 'skyzone_char_' + user + '_' + idx; }

  function saveCharState(user, idx) {
    // Only save if we have an active session (prevents kicked device from overwriting)
    if (!FB._sessionId) return;
    var P = S.get();
    try { localStorage.setItem(charSaveKey(user, idx), JSON.stringify(P)); } catch(e) {}
    // Also save to Firebase (fire and forget)
    try { FB.saveState(idx, P); } catch(e) {}
    // Update leaderboard
    try { if (P && P.name) FB.updateLeaderboard(P.name, P.city, E.baseCP(P.equipped)); } catch(e) {}
  }
  function loadCharState(user, idx) {
    try {
      var raw = localStorage.getItem(charSaveKey(user, idx));
      if (!raw) return false;
      S.set(JSON.parse(raw));
      return true;
    } catch(e) { return false; }
  }

  // migrate old save to new system if needed
  function migrateOldSave() {
    var old = localStorage.getItem('skyzone_save_v1');
    if (!old) return;
    try {
      var p = JSON.parse(old);
      if (!p || !p.name) return;
      // Old save will be picked up when user creates a Firebase account
      // Just clean up the old key
      localStorage.removeItem('skyzone_save_v1');
    } catch(e) {}
  }

  // ---------- SCREEN HELPERS ----------
  function showScreen(id) {
    $$('.screen').forEach(s => s.classList.remove('active'));
    var el = $('#screen-' + id);
    if (el) el.classList.add('active');
  }

  // ---------- LOGIN ----------
  function showLogin() { showScreen('login'); $('#loginUser').value = ''; $('#loginPass').value = ''; }
  function doLogin() {
    var input = ($('#loginUser').value || '').trim();
    var pass = ($('#loginPass').value || '').trim();
    if (!input || !pass) { UI.toast(t('auth.err_fields')); return; }
    var btn = $('#loginBtn');
    if (btn) { btn.disabled = true; btn.textContent = t('auth.logging_in'); }

    var isEmail = input.indexOf('@') !== -1;
    var loginWithEmail = function(email) {
      FB.auth.signInWithEmailAndPassword(email, pass)
        .then(function(cred) {
          if (btn) { btn.disabled = false; btn.textContent = t('auth.login_btn'); }
          setActiveUser(cred.user.uid);
          return FB.loadAccountMeta();
        })
        .then(function(meta) {
          if (meta && meta.characters && meta.characters.length > 0) {
            localStorage.setItem('skyzone_fb_meta_' + FB.uid(), JSON.stringify(meta));
            showCharSelect();
          } else {
            showCharCreate();
          }
        })
        .catch(function(err) {
          if (btn) { btn.disabled = false; btn.textContent = t('auth.login_btn'); }
          var msg = t('auth.err_general');
          if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') msg = t('auth.err_wrong');
          else if (err.code === 'auth/invalid-email') msg = t('auth.err_invalid');
          else if (err.code === 'auth/too-many-requests') msg = t('auth.err_too_many');
          UI.toast(msg);
        });
    };

    if (isEmail) {
      loginWithEmail(input);
    } else {
      FB.lookupUsername(input).then(function(data) {
        if (!data || !data.email) {
          if (btn) { btn.disabled = false; btn.textContent = t('auth.login_btn'); }
          UI.toast(t('auth.err_not_found'));
          return;
        }
        loginWithEmail(data.email);
      }).catch(function() {
        if (btn) { btn.disabled = false; btn.textContent = t('auth.login_btn'); }
        UI.toast(t('auth.err_conn'));
      });
    }
  }

  // ---------- REGISTER ----------
  function showRegister() { showScreen('register'); }
  function doRegister() {
    var email = ($('#regEmail').value || '').trim();
    var username = ($('#regUser').value || '').trim();
    var pass = ($('#regPass').value || '').trim();
    var pass2 = ($('#regPass2').value || '').trim();
    if (!username || !pass) { UI.toast(t('auth.err_fill_all')); return; }
    if (username.length < 3) { UI.toast(t('auth.err_user_min')); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) { UI.toast(t('auth.err_user_chars')); return; }
    if (pass.length < 6) { UI.toast(t('auth.err_pass_min')); return; }
    if (pass !== pass2) { UI.toast(t('auth.err_pass_match')); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { UI.toast(t('auth.err_email')); return; }
    var btn = $('#registerBtn');
    if (btn) { btn.disabled = true; btn.textContent = t('auth.registering'); }

    FB.isUsernameAvailable(username).then(function(available) {
      if (!available) {
        if (btn) { btn.disabled = false; btn.textContent = t('auth.register_btn'); }
        UI.toast(t('auth.err_taken'));
        return;
      }
      var authEmail = email || (username.toLowerCase() + '@skyzone.game');
      FB.auth.createUserWithEmailAndPassword(authEmail, pass)
        .then(function(cred) {
          return cred.user.updateProfile({ displayName: username }).then(function() {
            return cred.user;
          });
        })
        .then(function(user) {
          if (btn) { btn.disabled = false; btn.textContent = t('auth.register_btn'); }
          var meta = { username: username, email: email || '', characters: [], createdAt: Date.now() };
          return Promise.all([
            FB.saveAccountMeta(meta),
            FB.registerUsername(username, authEmail)
          ]).then(function() {
            setActiveUser(user.uid);
            localStorage.setItem('skyzone_fb_meta_' + user.uid, JSON.stringify(meta));
            UI.toast(t('auth.success'));
            showCharCreate();
          });
        })
        .catch(function(err) {
          if (btn) { btn.disabled = false; btn.textContent = t('auth.register_btn'); }
          var msg = t('auth.err_reg');
          if (err.code === 'auth/email-already-in-use') msg = t('auth.err_in_use');
          else if (err.code === 'auth/weak-password') msg = t('auth.err_weak');
          else if (err.code === 'auth/invalid-email') msg = t('auth.err_invalid');
          UI.toast(msg);
        });
    }).catch(function() {
      if (btn) { btn.disabled = false; btn.textContent = t('auth.register_btn'); }
      UI.toast(t('auth.err_conn'));
    });
  }

  // ---------- CHARACTER CREATION ----------
  function showCharCreate() {
    showScreen('charcreate');
    pickedCity = null;
    $$('.city-card').forEach(c => c.classList.remove('sel'));
    $('#charNameInput').value = '';
  }
  function createCharacter() {
    var name = ($('#charNameInput').value || '').trim();
    if (!name) { UI.toast(t('char.err_name')); return; }
    if (name.length < 2) { UI.toast(t('char.err_name_min')); return; }
    if (!pickedCity) { UI.toast(t('char.err_city')); return; }
    var uid = FB.uid();
    if (!uid) { UI.toast(t('auth.err_session')); showLogin(); return; }
    // Load meta
    var metaRaw = localStorage.getItem('skyzone_fb_meta_' + uid);
    var meta = metaRaw ? JSON.parse(metaRaw) : { username: '', characters: [] };
    if (meta.characters && meta.characters.length >= 3) { UI.toast(t('char.err_max')); return; }
    if (!meta.characters) meta.characters = [];
    var idx = meta.characters.length;
    meta.characters.push({ name: name, city: pickedCity });
    S.fresh(name, pickedCity);
    // Save to Firebase
    var stateStr = JSON.stringify(S.get());
    FB.saveAccountMeta(meta);
    FB.saveState(idx, S.get());
    localStorage.setItem('skyzone_fb_meta_' + uid, JSON.stringify(meta));
    localStorage.setItem(charSaveKey(uid, idx), stateStr);
    setActiveChar(idx);
    startGame();
  }

  // ---------- CHARACTER SELECT ----------
  function showCharSelect() {
    var uid = FB.uid();
    if (!uid) { showLogin(); return; }
    var metaRaw = localStorage.getItem('skyzone_fb_meta_' + uid);
    var meta = metaRaw ? JSON.parse(metaRaw) : null;
    if (!meta || !meta.characters || !meta.characters.length) { showCharCreate(); return; }
    showScreen('charselect');
    var list = $('#charSelectList');
    var cityIcons = { kar: '❄️', orman: '🌲', col: '🏜️' };

    var html = '';
    for (var i = 0; i < meta.characters.length; i++) {
      var ch = meta.characters[i];
      html += '<div class="char-sel-card">' +
        '<div class="char-sel-ico">' + (cityIcons[ch.city] || '🏰') + '</div>' +
        '<div class="char-sel-info">' +
          '<div class="char-sel-name">' + esc(ch.name) + '</div>' +
          '<div class="char-sel-sub">' + t('city.' + ch.city) + ' · ' + t('tribe.' + ch.city) + ' · <span id="charCP' + i + '">...</span> CP</div>' +
        '</div>' +
        '<button class="char-sel-play" data-act="selectchar" data-idx="' + i + '">' + t('char.play') + '</button>' +
      '</div>';
    }
    list.innerHTML = html;

    // Load CP from Firebase for each character
    for (var fi = 0; fi < meta.characters.length; fi++) {
      (function(idx) {
        FB.loadState(idx).then(function(fbState) {
          var cpEl = document.getElementById('charCP' + idx);
          if (!cpEl) return;
          if (fbState && fbState.equipped) {
            cpEl.textContent = Math.round(E.baseCP(fbState.equipped));
          } else {
            // fallback to localStorage
            try {
              var raw = localStorage.getItem(charSaveKey(uid, idx));
              if (raw) { var p = JSON.parse(raw); cpEl.textContent = Math.round(E.baseCP(p.equipped || {})); }
              else cpEl.textContent = '0';
            } catch(e) { cpEl.textContent = '0'; }
          }
        }).catch(function() {
          var cpEl = document.getElementById('charCP' + idx);
          if (cpEl) {
            try {
              var raw = localStorage.getItem(charSaveKey(uid, idx));
              if (raw) { var p = JSON.parse(raw); cpEl.textContent = Math.round(E.baseCP(p.equipped || {})); }
              else cpEl.textContent = '?';
            } catch(e) { cpEl.textContent = '?'; }
          }
        });
      })(fi);
    }

    var btn = $('#newCharBtn');
    if (meta.characters.length >= 3) { btn.style.display = 'none'; } else { btn.style.display = ''; }
  }
  function selectCharacter(idx) {
    var uid = FB.uid();
    if (!uid) { UI.toast(t('auth.err_session')); showLogin(); return; }

    var btns = $$('[data-act="selectchar"]');
    btns.forEach(function(b) { b.disabled = true; b.textContent = t('common.loading'); });

    // ALWAYS load from Firebase — it's the authoritative source
    FB.loadState(idx).then(function(fbState) {
      btns.forEach(function(b) { b.disabled = false; b.textContent = t('char.play'); });

      if (fbState && fbState.name) {
        // Firebase has data — use it (authoritative)
        S.set(fbState); // sanitize runs inside set()
        localStorage.setItem(charSaveKey(uid, idx), JSON.stringify(S.get()));
        setActiveChar(idx);
        startGame();
      } else if (loadCharState(uid, idx)) {
        // Firebase empty but localStorage has data — use local and push to Firebase
        setActiveChar(idx);
        startGame();
        try { FB.saveState(idx, S.get()); } catch(e) {}
      } else {
        // Neither has data — create fresh from meta
        var metaRaw = localStorage.getItem('skyzone_fb_meta_' + uid);
        var meta = metaRaw ? JSON.parse(metaRaw) : null;
        if (meta && meta.characters && meta.characters[idx]) {
          var ch = meta.characters[idx];
          S.fresh(ch.name, ch.city);
          localStorage.setItem(charSaveKey(uid, idx), JSON.stringify(S.get()));
          FB.saveState(idx, S.get());
          setActiveChar(idx);
          startGame();
        } else {
          UI.toast(t('char.err_nodata'));
        }
      }
    }).catch(function(err) {
      btns.forEach(function(b) { b.disabled = false; b.textContent = t('char.play'); });
      console.warn('Firebase loadState error:', err);
      if (loadCharState(uid, idx)) {
        setActiveChar(idx);
        startGame();
        UI.toast(t('char.offline_mode'));
      } else {
        UI.toast(t('char.err_conn_retry'));
      }
    });
  }
  function doLogout() {
    stopLoop();
    // Save final state DIRECTLY to Firebase before releasing session
    try {
      var _uid = FB.uid(); var _ci = activeCharIdx(); var _P = S.get();
      if (_uid && _P) {
        localStorage.setItem(charSaveKey(_uid, _ci), JSON.stringify(_P));
        FB.saveState(_ci, _P);
        if (_P.name) FB.updateLeaderboard(_P.name, _P.city, E.baseCP(_P.equipped));
      }
    } catch(e) {}
    try { FB.releaseSession(); } catch(e) {}
    FB.goOffline();
    try { CHAT.stopListening(); } catch(e) {}
    FB.auth.signOut().then(function() {
      setActiveUser('');
      localStorage.removeItem(ACTIVE_CHAR_KEY);
      S.set(null);
      document.querySelector('.phone').classList.remove('ingame');
      showLogin();
    }).catch(function() {
      setActiveUser('');
      localStorage.removeItem(ACTIVE_CHAR_KEY);
      S.set(null);
      document.querySelector('.phone').classList.remove('ingame');
      showLogin();
    });
  }

  function esc(s) { return String(s).replace(/[&<>"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

  // ---------- boot ----------
  function boot() {
    migrateOldSave();
    bindEvents();
    // Close any stuck modals on boot
    $$('.modal-bg').forEach(function(m) { m.classList.remove('active'); });
    // Show login immediately as default (prevents blank screen)
    showScreen('login');
    // Listen for Firebase auth state
    FB.auth.onAuthStateChanged(function(user) {
      if (user) {
        setActiveUser(user.uid);
        // ALWAYS load from Firebase — never auto-boot from localStorage
        // Show a loading indicator while waiting
        showScreen('login');
        var loginBtn = $('#loginBtn');
        if (loginBtn) { loginBtn.disabled = true; loginBtn.textContent = t('auth.connecting'); }

        FB.loadAccountMeta().then(function(meta) {
          if (loginBtn) { loginBtn.disabled = false; loginBtn.textContent = t('auth.login_btn'); }
          if (meta) {
            localStorage.setItem('skyzone_fb_meta_' + user.uid, JSON.stringify(meta));
            if (meta.characters && meta.characters.length > 0) {
              // ALWAYS go to character select — forces FB.loadState on char pick
              showCharSelect();
            } else {
              showCharCreate();
            }
          } else {
            showCharCreate();
          }
        }).catch(function(err) {
          if (loginBtn) { loginBtn.disabled = false; loginBtn.textContent = t('auth.login_btn'); }
          console.warn('Firebase boot error:', err);
          // Offline: try localStorage meta for char select only
          var metaRaw = localStorage.getItem('skyzone_fb_meta_' + user.uid);
          var meta = metaRaw ? JSON.parse(metaRaw) : null;
          if (meta && meta.characters && meta.characters.length > 0) {
            showCharSelect();
          } else {
            showCharCreate();
          }
        });
      } else {
        showLogin();
      }
    });
  }
  function startGame() {
    // Close any stuck modals before starting
    $$('.modal-bg').forEach(function(m) { m.classList.remove('active'); });
    var P = S.get();
    if (!P || !P.zone) { showLogin(); return; }
    // Re-sanitize items (Firebase drops empty arrays like perks:[])
    var eqSlots = Object.keys(P.equipped || {});
    for (var i = 0; i < eqSlots.length; i++) {
      var it = P.equipped[eqSlots[i]];
      if (it) { it.perks = it.perks || []; it.stats = it.stats || {}; }
    }
    var invItems = P.equipItems || [];
    for (var j = 0; j < invItems.length; j++) {
      invItems[j].perks = invItems[j].perks || [];
      invItems[j].stats = invItems[j].stats || {};
    }
    // Migrate old chest equipItems to misc counters
    var migratedChests = 0;
    for (var mi = P.equipItems.length - 1; mi >= 0; mi--) {
      if (P.equipItems[mi] && P.equipItems[mi].kind === 'chest') {
        P.misc.enhChest = (P.misc.enhChest || 0) + 1;
        P.equipItems.splice(mi, 1);
        migratedChests++;
      }
    }
    // Migrate old mountbox equipItems to misc counter
    for (var mbi = P.equipItems.length - 1; mbi >= 0; mbi--) {
      if (P.equipItems[mbi] && P.equipItems[mbi].kind === 'mountbox') {
        P.misc.mountBox = (P.misc.mountBox || 0) + 1;
        P.equipItems.splice(mbi, 1);
      }
    }
    // Clean up removed dust from old saves
    if (P.misc.dust) { delete P.misc.dust; }
    // Migrate old enhStone to stone3
    if (P.misc.enhStone) { P.misc.stone3 = (P.misc.stone3 || 0) + P.misc.enhStone; delete P.misc.enhStone; }
    // Migrate ATK/DEF → CP on all items
    function migrateAtkDef(it) {
      if (!it || !it.stats) return;
      if (('atk' in it.stats) || ('def' in it.stats)) {
        it.stats.cp = (it.stats.atk || 0) + (it.stats.def || 0);
        delete it.stats.atk; delete it.stats.def;
      }
      if (it.perks) {
        for (var pi = 0; pi < it.perks.length; pi++) {
          var pk = it.perks[pi];
          if (pk.eff === 'atk' || pk.eff === 'def' || pk.eff === 'atkdef') pk.eff = 'cp';
        }
      }
    }
    for (var ei2 = 0; ei2 < eqSlots.length; ei2++) migrateAtkDef(P.equipped[eqSlots[ei2]]);
    for (var ei3 = 0; ei3 < invItems.length; ei3++) migrateAtkDef(invItems[ei3]);
    // Migrate bank items too
    var cities = ['kar', 'orman', 'col'];
    for (var ci2 = 0; ci2 < cities.length; ci2++) {
      var bk = P.bank && P.bank[cities[ci2]];
      if (bk && bk.equipItems) { for (var bi = 0; bi < bk.equipItems.length; bi++) migrateAtkDef(bk.equipItems[bi]); }
    }
    // Ensure chest fields exist
    P.misc.enhChest = P.misc.enhChest || 0;
    P.misc.goldChest = P.misc.goldChest || 0;
    // One-time: add 30 test chests (remove this migration later)
    if (!P._chestGranted7710) {
      P.misc.enhChest += 20;
      P.misc.goldChest += 10;
      P._chestGranted7710 = true;
    }
    // One-time: clear old local-generated world data so shared nodes work
    if (!P._worldReset7860) {
      P._worldReset7860 = true;
      try { firebase.database().ref('world').remove(); } catch(e) {}
    }
    // Enable game UI BEFORE rendering (so chat bar shows even if render errors)
    document.querySelector('.phone').classList.add('ingame');
    showScreen('map');
    W.enterZone(P.zone);
    try { UI.show('map'); } catch(e) { console.error('UI.show error:', e); }
    setTimeout(initMapView, 50);
    if (!P.tutorialDone) showTutorial();
    try { initWarState(); } catch(e) { console.error('initWarState error:', e); }
    var cityNames = { kar: 'Kar Sehri', orman: 'Orman Sehri', col: 'Col Sehri' };
    try {
      CHAT.init(P.name, cityNames[P.city] || P.city);
      CHAT.setOnNewMsg(function(ch) {
        renderChatPreview();
        if (CHAT.isExpanded()) {
          renderChatMessages();
          var box = $('#chatMessages');
          if (box) box.scrollTop = box.scrollHeight;
        }
      });
      renderChatPreview();
    } catch(e) { console.error('Chat init error:', e); }
    try { FB.setOnline(P.name, P.city, P.zone); } catch(e) {}
    // Event system
    try { if (SKY.EVT) SKY.EVT.init(); } catch(e) { console.error('EVT init error:', e); }
    // Single session enforcement: claim BEFORE starting save loop
    try {
      FB.claimSession(activeCharIdx(), function() {
        // Another device logged in with this account — kick this session
        // DO NOT save — the other device has newer data
        stopLoop();
        FB._sessionId = null; // clear session so no saves happen
        try { CHAT.stopListening(); } catch(e) {}
        FB.goOffline();
        S.set(null);
        document.querySelector('.phone').classList.remove('ingame');
        $$('.modal-bg').forEach(function(m) { m.classList.remove('active'); });
        showScreen('login');
        // Show kicked message
        setTimeout(function() {
          UI.openSheet('⚠️ ' + t('common.session_kicked'), '', '<div style="text-align:center;padding:16px 0"><div style="font-size:40px;margin-bottom:12px">🔒</div><div style="font-size:14px;color:var(--textlit);margin-bottom:8px">' + t('common.session_kicked') + '</div><div style="font-size:11px;color:var(--textdim)">' + t('common.session_limit') + '</div></div><button class="btn full" onclick="location.reload()" style="margin-top:12px">' + t('common.relogin') + '</button>');
        }, 300);
      });
    } catch(e) { console.error('Session claim error:', e); }
    // Start game loop AFTER session is claimed
    startLoop();
  }
  function stopLoop() {
    clearInterval(window._lp); clearInterval(window._fp); clearInterval(window._sv);
  }
  function showTutorial() {
    S.get().tutorialDone = true;
    UI.openSheet('✦ ' + t('tutorial.welcome'), S.get().name, `
      <div class="kv"><span class="k">🗺️ ${t('tutorial.map')}</span><span class="vv">${t('tutorial.map_desc')}</span></div>
      <div class="kv"><span class="k">☰ ${t('tutorial.workshop')}</span><span class="vv">${t('tutorial.workshop_desc')}</span></div>
      <div class="kv"><span class="k">🎒 ${t('tutorial.bag')}</span><span class="vv">${t('tutorial.bag_desc')}</span></div>
      <div class="kv"><span class="k">🏰 ${t('tutorial.dungeon')}</span><span class="vv">${t('tutorial.dungeon_desc')}</span></div>
      <div class="kv"><span class="k">☰ ${t('tutorial.menu')}</span><span class="vv">${t('tutorial.menu_desc')}</span></div>
      <div class="divider"></div>
      <div class="muted small">${t('tutorial.start_info')}</div>
      <button class="btn full" data-close="sheetModal" style="margin-top:12px">${t('tutorial.start_btn')}</button>`);
  }

  // ---------- main loop ----------
  let lastTick = Date.now();
  function startLoop() {
    clearInterval(window._lp); clearInterval(window._fp); clearInterval(window._sv);
    lastTick = Date.now();
    window._lp = setInterval(loop, 1000);
    window._fp = setInterval(fastLoop, 200);
    window._sv = setInterval(function() { var uid = FB.uid(); var ci = activeCharIdx(); if (uid && S.get()) saveCharState(uid, ci); }, 15000);

    // Background idle: catch up when tab becomes visible again
    if (!window._visBound) {
      window._visBound = true;
      document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
          // Store the time we went hidden
          window._hiddenAt = Date.now();
        } else {
          // Tab is visible again — catch up
          var hiddenAt = window._hiddenAt || 0;
          if (!hiddenAt) return;
          var elapsed = (Date.now() - hiddenAt) / 1000; // seconds hidden
          if (elapsed < 2) return; // ignore very short hides
          var maxCatchup = 600; // max 10 minutes catch-up
          // Premium offline bonus: +30% more catch-up time
          if (S.isPremium()) maxCatchup = Math.round(maxCatchup * (1 + D.SHOP.premiumPerks.offlineEarn / 100));
          elapsed = Math.min(elapsed, maxCatchup);
          window._hiddenAt = 0;
          lastTick = Date.now(); // reset tick timer

          var P = S.get();
          if (!P) return;

          // Gather catch-up
          if (W.isGathering() && !DUN.isActive()) {
            var gatherTicks = Math.floor(elapsed);
            var totalDropped = {};
            for (var gi = 0; gi < gatherTicks; gi++) {
              var r = W.gatherTick();
              if (!r) continue;
              if (r.full || r.overweight) break;
              if (r.dropped) {
                for (var dk in r.dropped) {
                  totalDropped[dk] = (totalDropped[dk] || 0) + r.dropped[dk];
                }
              }
              if (!W.isGathering()) break; // node depleted
            }
            if (Object.keys(totalDropped).length > 0) {
              UI.addGatherDrops(totalDropped);
              UI.gatherProgress();
              UI.refreshIfMap();
              var totalItems = 0;
              for (var tk in totalDropped) totalItems += totalDropped[tk];
              UI.toast('⏰ ' + t('idle.gathered', { count: totalItems, time: Math.round(elapsed) }));
            }
          }

          // Dungeon catch-up
          if (DUN.isActive() && UI.isDunAutoOn()) {
            var dunTicks = Math.floor(elapsed);
            var dunGold = 0, dunKills = 0;
            for (var di = 0; di < dunTicks; di++) {
              var a = DUN.getActive();
              if (!a) break;
              var ev = DUN.tick(1);
              if (!ev) continue;
              if (ev.type === 'mobwin' || ev.type === 'bosswin') {
                UI.addDungeonLoot(ev.loot, ev.type === 'bosswin');
                dunGold += ev.loot.gold;
                dunKills++;
              } else if (ev.type === 'death') {
                // respawn — skip 3 ticks
                a.fightProgress = -3;
                di += 3;
              }
            }
            if (dunKills > 0) {
              UI.toast('⏰ ' + t('idle.dungeon', { kills: dunKills, gold: UI.fmt(dunGold), time: Math.round(elapsed) }));
            }
            if (DUN.isActive()) {
              UI.updateMobDisplay(DUN.getActive());
              UI.fightTickUI();
            }
          }

          UI.renderTop();
          UI.refreshIfMap();
        }
      });
    }
  }
  function loop() {
    const now = Date.now(); const dt = (now - lastTick) / 1000; lastTick = now;
    // gather (dungeon aktifken durdur)
    if (W.isGathering() && !DUN.isActive()) {
      const r = W.gatherTick();
      if (r) {
        if (r.full) UI.toast(t('gather.inv_full'));
        else if (r.overweight) UI.toast(t('gather.overweight'));
        else if (r.dropped) { UI.addGatherDrops(r.dropped); UI.gatherProgress(); UI.refreshIfMap(); }
        if (r && !W.isGathering()) { UI.setGatherUI(false); } // node bitti
      }
    }
    W.lifecycleTick();
    if (DUN.isActive()) dungeonTick(dt);
    warTick();
    marketTick();
    CHAT.botTick();
    renderChatPreview();
    if (CHAT.isExpanded()) renderChatMessages();
    UI.renderTop();
    UI.refreshIfMap();
  }
  function fastLoop() {
    if (DUN.isActive()) UI.fightTickUI();
  }

  function dungeonTick(dt) {
    const a = DUN.getActive();
    if (!a) return;
    if (!UI.isDunAutoOn()) return; // paused
    const ev = DUN.tick(dt);
    if (!ev) return;
    if (ev.type === 'mobwin' || ev.type === 'bosswin') {
      const isBoss = ev.type === 'bosswin';
      UI.dungeonMobDeath();
      UI.addDungeonLoot(ev.loot, isBoss);
      if (isBoss) UI.renderBossQueue(); // update queue after boss killed
      if (ev.loot.items.length || ev.loot.charm) {
        let msg = (isBoss ? '👹 BOSS! ' : '') + '+' + UI.fmt(ev.loot.gold) + '💰';
        if (ev.loot.items.length) msg += ' · ' + ev.loot.items.length + ' item';
        if (ev.loot.charm) msg += ' · ' + t('dg.charms').toUpperCase() + '!';
        UI.toast(msg);
      }
    } else if (ev.type === 'death') { dungeonRespawn(); }
    else if (ev.type === 'dodge') { /* visual handled by mob staying alive */ }
    else if (ev.type === 'bossSpawn') {
      UI.renderBossQueue();
      UI.toast('👹 ' + t('dg.boss_appeared') + ' (' + ev.queueLen + '/5)');
    }
  }
  function handleDeath() {
    UI.toast(t('dg.died'));
    UI.showDungeonSummary();
    DUN.leave();
    S.get().zone = 'city_' + S.get().city;
    W.enterZone(S.get().zone);
    try { FB.updateZone(S.get().zone); } catch(e) {}
    UI.show('map'); initMapView();
  }
  // dungeon'da ölünce: kısa bekleme, sonra devam (şehre atılmaz)
  function dungeonRespawn() {
    UI.toast(t('dg.died_respawn'));
    const a = DUN.getActive();
    if (!a) { handleDeath(); return; }
    // mob'u ölmüş göster (oyuncu öldü ama mob da resetlenir)
    UI.dungeonMobDeath();
    // fightProgress sıfırla — 3sn bekleme
    a.fightProgress = -3; // negatif = bekleme süresi
  }
  function exitDungeon() {
    UI.showDungeonSummary();
    DUN.leave();
    UI.closeMB('dungeonModal');
  }

  // ---------- MAP pan/zoom (mockup port) ----------
  let tx = 0, ty = 0, scale = 1, dragging = false, dsx, dsy, dtx, dty, dragMoved = false, pinchD = 0, pinchS = 1;
  const MIN = 0.7, MAX = 2.0;
  let vp, cv;
  function applyT() { cv.style.transform = `translate(${tx}px,${ty}px) scale(${scale})`; }
  function clampT() { const vw = vp.clientWidth, vh = vp.clientHeight, cw = cv.offsetWidth * scale, ch = cv.offsetHeight * scale; tx = Math.max(vw - cw, Math.min(0, tx)); ty = Math.max(vh - ch, Math.min(0, ty)); }
  function initMapView() {
    vp = $('#mapViewport'); cv = $('#mapCanvas'); if (!vp || !cv) return;
    // viewport hazır olana kadar bekle
    const doCenter = () => {
      scale = 1;
      const vw = vp.clientWidth, vh = vp.clientHeight;
      const cw = cv.offsetWidth, ch = cv.offsetHeight;
      if (!vw || !vh) { setTimeout(doCenter, 50); return; }
      tx = (vw - cw) / 2; ty = (vh - ch) / 2; applyT();
    };
    doCenter();
  }
  function zoom(d, cx, cy) {
    const o = scale; scale = Math.max(MIN, Math.min(MAX, o + d)); if (scale === o) return;
    if (cx === undefined) { cx = vp.clientWidth / 2; cy = vp.clientHeight / 2; }
    const wx = (cx - tx) / o, wy = (cy - ty) / o; tx = cx - wx * scale; ty = cy - wy * scale; clampT();
    cv.style.transition = 'transform .15s'; applyT(); setTimeout(() => cv.style.transition = '', 160);
  }
  function bindMap() {
    vp = $('#mapViewport'); cv = $('#mapCanvas');
    vp.addEventListener('mousedown', e => { dragging = true; dragMoved = false; dsx = e.clientX; dsy = e.clientY; dtx = tx; dty = ty; vp.classList.add('dragging'); });
    document.addEventListener('mousemove', e => { if (!dragging) return; const dx = e.clientX - dsx, dy = e.clientY - dsy; if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragMoved = true; tx = dtx + dx; ty = dty + dy; clampT(); applyT(); });
    document.addEventListener('mouseup', () => { if (dragging) { dragging = false; vp.classList.remove('dragging'); } });
    vp.addEventListener('wheel', e => { e.preventDefault(); const r = vp.getBoundingClientRect(); zoom(e.deltaY < 0 ? 0.12 : -0.12, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
    vp.addEventListener('touchstart', e => { if (e.touches.length === 1) { dragging = true; dragMoved = false; dsx = e.touches[0].clientX; dsy = e.touches[0].clientY; dtx = tx; dty = ty; } else if (e.touches.length === 2) { dragging = false; const dx = e.touches[1].clientX - e.touches[0].clientX, dy = e.touches[1].clientY - e.touches[0].clientY; pinchD = Math.hypot(dx, dy); pinchS = scale; } }, { passive: true });
    vp.addEventListener('touchmove', e => {
      if (e.touches.length === 1 && dragging) { e.preventDefault(); const dx = e.touches[0].clientX - dsx, dy = e.touches[0].clientY - dsy; if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragMoved = true; tx = dtx + dx; ty = dty + dy; clampT(); applyT(); }
      else if (e.touches.length === 2) { e.preventDefault(); const dx = e.touches[1].clientX - e.touches[0].clientX, dy = e.touches[1].clientY - e.touches[0].clientY; const ns = Math.max(MIN, Math.min(MAX, pinchS * (Math.hypot(dx, dy) / pinchD))); const r = vp.getBoundingClientRect(); const cx = ((e.touches[0].clientX + e.touches[1].clientX) / 2) - r.left, cy = ((e.touches[0].clientY + e.touches[1].clientY) / 2) - r.top; const wx = (cx - tx) / scale, wy = (cy - ty) / scale; scale = ns; tx = cx - wx * scale; ty = cy - wy * scale; clampT(); applyT(); }
    }, { passive: false });
    vp.addEventListener('touchend', e => { if (e.touches.length === 0) { dragging = false; vp.classList.remove('dragging'); } });
    window.addEventListener('resize', () => { if (UI.activeScreen === 'map') initMapView(); });
  }

  // ---------- events ----------
  function bindEvents() {
    document.addEventListener('click', onClick);
    // Close chat when clicking outside
    document.addEventListener('pointerdown', function(e) {
      var bar = $('#chatBar');
      if (!bar || !bar.classList.contains('expanded')) return;
      if (bar.contains(e.target)) return;
      bar.classList.remove('expanded');
      CHAT.setExpanded(false);
    });
    // Save on page close/navigate away
    window.addEventListener('beforeunload', function() {
      try {
        var uid = FB.uid(); var ci = activeCharIdx();
        if (uid && S.get() && FB._sessionId) {
          FB.saveState(ci, S.get());
        }
      } catch(e) {}
    });
    // Also save on visibility hidden (mobile: tab switch / app switch)
    document.addEventListener('visibilitychange', function() {
      if (document.hidden) {
        try {
          var uid = FB.uid(); var ci = activeCharIdx();
          if (uid && S.get() && FB._sessionId) {
            FB.saveState(ci, S.get());
            localStorage.setItem(charSaveKey(uid, ci), JSON.stringify(S.get()));
          }
        } catch(e) {}
      }
    });
    // auth events
    var lb = $('#loginBtn'); if (lb) lb.addEventListener('click', doLogin);
    var rb = $('#registerBtn'); if (rb) rb.addEventListener('click', doRegister);
    var ccb = $('#charCreateBtn'); if (ccb) ccb.addEventListener('click', createCharacter);
    var ncb = $('#newCharBtn'); if (ncb) ncb.addEventListener('click', function() { showCharCreate(); });
    var gr = $('#goRegister'); if (gr) gr.addEventListener('click', function() { showRegister(); });
    var gl = $('#goLogin'); if (gl) gl.addEventListener('click', function() { showLogin(); });
    var fl = $('#forgotLink'); if (fl) fl.addEventListener('click', function() {
      var emailInput = prompt(t('auth.forgot_prompt'));
      if (!emailInput || !emailInput.trim()) return;
      emailInput = emailInput.trim();
      if (emailInput.indexOf('@') === -1) { UI.toast(t('auth.forgot_invalid')); return; }
      FB.auth.sendPasswordResetEmail(emailInput).then(function() {
        UI.toast(t('auth.forgot_sent'));
      }).catch(function(err) {
        if (err.code === 'auth/user-not-found') UI.toast(t('auth.forgot_notreg'));
        else UI.toast(t('common.error') + ': ' + err.message);
      });
    });
    var lo = $('#logoutLink'); if (lo) lo.addEventListener('click', function() { doLogout(); });
    // enter key on auth inputs
    var lp = $('#loginPass'); if (lp) lp.addEventListener('keydown', function(e) { if (e.key === 'Enter') doLogin(); });
    var lu = $('#loginUser'); if (lu) lu.addEventListener('keydown', function(e) { if (e.key === 'Enter') doLogin(); });
    var rp2 = $('#regPass2'); if (rp2) rp2.addEventListener('keydown', function(e) { if (e.key === 'Enter') doRegister(); });
    var cni = $('#charNameInput'); if (cni) cni.addEventListener('keydown', function(e) { if (e.key === 'Enter') createCharacter(); });
    var chatIn = $('#chatInput'); if (chatIn) chatIn.addEventListener('keydown', function(e) { if (e.key === 'Enter') sendChat(); });
    // Chat channel select dropdown
    var chatSel = $('#chatChSelect');
    if (chatSel) chatSel.addEventListener('change', function() { switchChatTab(chatSel.value); });
    // Chat channel checkboxes
    document.addEventListener('change', function(e) {
      var chk = e.target.closest('.chat-ch-toggle input[data-chk]');
      if (!chk) return;
      var ch = chk.dataset.chk;
      if (chk.checked) {
        switchChatTab(ch);
      } else {
        // If unchecking the active channel, switch to another checked one
        if (CHAT.getChannel() === ch) {
          var checks = document.querySelectorAll('.chat-ch-toggle input[data-chk]:checked');
          for (var ci = 0; ci < checks.length; ci++) {
            if (checks[ci].dataset.chk !== ch) { switchChatTab(checks[ci].dataset.chk); break; }
          }
        }
      }
    });
    bindMap();
    bindBagDrag();
    bindBankDrag();
    const bs = $('#bagModal'); if (bs) bs.addEventListener('scroll', () => UI.closePop());
    const bk = $('#bankaModal'); if (bk) bk.addEventListener('scroll', () => UI.closePop());
  }

  // ---------- BANKA SÜRÜKLE-BIRAK (envanter <-> banka) ----------
  let bankDrag = null, bankDragMoved = false;
  function bindBankDrag() {
    document.addEventListener('pointerdown', e => {
      const scr = $('#bankaModal'); if (!scr.classList.contains('active')) return;
      const slot = e.target.closest('.slot[data-id]'); if (!slot) return;
      bankDrag = { side: slot.dataset.side, id: slot.dataset.id, srcEl: slot, sx: e.clientX, sy: e.clientY, ghost: null };
      bankDragMoved = false;
    });
    document.addEventListener('pointermove', e => {
      if (!bankDrag) return;
      const dx = e.clientX - bankDrag.sx, dy = e.clientY - bankDrag.sy;
      if (!bankDrag.ghost) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        bankDragMoved = true;
        bankDrag.srcEl.classList.add('dragsrc');
        const g = document.createElement('div');
        g.className = 'drag-ghost ' + ((bankDrag.srcEl.className.match(/rar-\w+/) || [''])[0]);
        g.innerHTML = bankDrag.srcEl.querySelector('.slot-inner').innerHTML;
        document.body.appendChild(g);
        bankDrag.ghost = g;
        UI.closePop();
      }
      bankDrag.ghost.style.left = e.clientX + 'px';
      bankDrag.ghost.style.top = e.clientY + 'px';
      $$('#bankaModal .grid.droptarget').forEach(s => s.classList.remove('droptarget'));
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const grid = el && el.closest('#bkInvGrid, #bkBnkGrid');
      if (grid) grid.classList.add('droptarget');
    });
    document.addEventListener('pointerup', e => {
      if (!bankDrag) return;
      const drag = bankDrag; bankDrag = null;
      $$('#bankaModal .grid.droptarget').forEach(s => s.classList.remove('droptarget'));
      if (drag.ghost) drag.ghost.remove();
      if (drag.srcEl) drag.srcEl.classList.remove('dragsrc');
      if (!bankDragMoved) return;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const onInv = el && el.closest('#bkInvGrid');
      const onBnk = el && el.closest('#bkBnkGrid');
      if (drag.side === 'inv' && onBnk) UI.bankDragTransfer('inv', drag.id, 'toBank');
      else if (drag.side === 'bnk' && onInv) UI.bankDragTransfer('bnk', drag.id, 'toInv');
      setTimeout(() => { bankDragMoved = false; }, 60);
    });
  }

  // ---------- ÇANTA SÜRÜKLE-BIRAK ----------
  let bagDrag = null, bagDragMoved = false;
  function bindBagDrag() {
    document.addEventListener('pointerdown', e => {
      const bagScreen = $('#bagModal'); if (!bagScreen || !bagScreen.classList.contains('active')) return;
      const slot = e.target.closest('.slot[data-id]'); if (!slot) return;
      const id = slot.dataset.id;
      if (!(id.startsWith('eqi:') || id.startsWith('eq:'))) return;
      // mobilde scroll ile çakışma engeli: uzun basma ile başlat
      bagDrag = { id, srcEl: slot, sx: e.clientX, sy: e.clientY, ghost: null, startTime: Date.now() };
      bagDragMoved = false;
    });
    document.addEventListener('pointermove', e => {
      if (!bagDrag) return;
      const dx = e.clientX - bagDrag.sx, dy = e.clientY - bagDrag.sy;
      if (!bagDrag.ghost) {
        // mobilde: min 15px hareket VE min 200ms basılı tutma gerekli
        if (Math.abs(dx) < 15 && Math.abs(dy) < 15) return;
        if (Date.now() - bagDrag.startTime < 200) { bagDrag = null; return; }
        bagDragMoved = true;
        bagDrag.srcEl.classList.add('dragsrc');
        const g = document.createElement('div');
        g.className = 'drag-ghost ' + ((bagDrag.srcEl.className.match(/rar-\w+/) || [''])[0]);
        g.innerHTML = bagDrag.srcEl.querySelector('.slot-inner').innerHTML;
        document.body.appendChild(g);
        bagDrag.ghost = g;
      }
      bagDrag.ghost.style.left = e.clientX + 'px';
      bagDrag.ghost.style.top = e.clientY + 'px';
      $$('#bagModal .slot.droptarget').forEach(s => s.classList.remove('droptarget'));
      const t = dropTargetAt(e.clientX, e.clientY);
      if (t && t.el) t.el.classList.add('droptarget');
    });
    document.addEventListener('pointerup', e => {
      if (!bagDrag) return;
      const drag = bagDrag; bagDrag = null;
      $$('#bagModal .slot.droptarget').forEach(s => s.classList.remove('droptarget'));
      if (drag.ghost) drag.ghost.remove();
      if (drag.srcEl) drag.srcEl.classList.remove('dragsrc');
      if (!bagDragMoved) return; // tıklama → bagselect halleder
      const t = dropTargetAt(e.clientX, e.clientY);
      resolveDrop(drag.id, t);
      setTimeout(() => { bagDragMoved = false; }, 60);
    });
  }
  function dropTargetAt(x, y) {
    const el = document.elementFromPoint(x, y); if (!el) return null;
    if (el.closest('#equipGrid')) { const cell = el.closest('.eq-cell'); return { zone: 'equip', el: cell ? cell.querySelector('.slot') : null }; }
    const slot = el.closest('.slot[data-id]');
    if (slot && slot.dataset.id.startsWith('eqi:')) return { zone: 'bagitem', el: slot, id: slot.dataset.id };
    if (el.closest('#bagGrid')) return { zone: 'bag', el: $('#bagGrid') };
    return null;
  }
  function resolveDrop(dragId, t) {
    if (!t) return;
    if (dragId.startsWith('eqi:')) {
      const itemId = dragId.slice(4);
      if (t.zone === 'equip') { const r = S.equip(itemId); UI.toast(r.ok ? '✅ ' + t('bag.equipped') : '❌ ' + r.msg); UI.clearBagSel(); UI.renderBag(); return; }
      if (t.zone === 'bagitem' && t.id !== dragId) { reorderEquip(itemId, t.id.slice(4)); UI.renderBag(); return; }
    } else if (dragId.startsWith('eq:')) {
      const slot = dragId.slice(3);
      if (t.zone === 'bag' || t.zone === 'bagitem') { const r = S.unequip(slot); UI.toast(r.ok ? '✅ ' + t('bag.unequipped') : '❌ ' + (r.msg || '')); UI.clearBagSel(); UI.renderBag(); return; }
    }
  }
  function reorderEquip(srcId, dstId) {
    const arr = S.get().equipItems;
    const si = arr.findIndex(x => x.id === srcId), di = arr.findIndex(x => x.id === dstId);
    if (si < 0 || di < 0) return;
    const [it] = arr.splice(si, 1);
    arr.splice(di, 0, it);
  }
  function onClick(e) {
    // city card selection (character creation)
    const cc = e.target.closest('.city-card[data-city]');
    if (cc) { pickedCity = cc.dataset.city; $$('.city-card').forEach(o => o.classList.toggle('sel', o === cc)); return; }
    // legacy city-opt (kept for compat)
    const co = e.target.closest('.city-opt');
    if (co) { pickedCity = co.dataset.city; $$('.city-opt').forEach(o => o.classList.toggle('sel', o === co)); return; }
    // modal close (X or backdrop)
    const cl = e.target.closest('[data-close]'); if (cl) { UI.closeMB(cl.dataset.close); return; }
    const mb = e.target.closest('.modal-bg'); if (mb && e.target === mb) { UI.closeMB(mb.id); return; }
    // çanta sekmeleri (data-cat)
    const tab = e.target.closest('#bagTabs .tab');
    if (tab) { UI.setBagCat(tab.dataset.cat); return; }
    // dungeon inventory tabs
    const dgTab = e.target.closest('.dg-inv-tab[data-dcat]');
    if (dgTab) { UI.setDgInvCat(dgTab.dataset.dcat); return; }
    // gather inventory tabs
    var gTab = e.target.closest('.dg-inv-tab[data-gcat]');
    if (gTab) { UI.setGatherInvCat(gTab.dataset.gcat); return; }
    // (chat tabs removed — channel switching via settings dropdown)
    // item popover dışına tıklama → kapat (slot ve popover hariç)
    const pop = $('#itemPop');
    if (pop && pop.classList.contains('show') && !e.target.closest('#itemPop') && !e.target.closest('.slot[data-id]')) UI.closePop();
    // action
    const el = e.target.closest('[data-act]'); if (!el) return;
    if (el.dataset.act === 'opennode' && dragMoved) return; // pan değil tıklama
    if (el.dataset.act === 'bagselect' && bagDragMoved) return; // sürükleme, seçim değil
    if (el.dataset.act === 'banksel' && bankDragMoved) return;
    handleAction(el.dataset.act, el);
  }

  function handleAction(act, el) {
    const P = S.get();
    switch (act) {
      case 'togglechat': toggleChat(); break;
      case 'chatsend': sendChat(); break;
      case 'chatSettings': {
        var dd = document.getElementById('chatSettingsDD');
        if (dd) dd.style.display = dd.style.display === 'none' ? 'flex' : 'none';
        break;
      }
      case 'gomap': if (DUN.isActive()) exitDungeon(); else { UI.closeAllModals(); UI.show('map'); initMapView(); } break;
      case 'goworld': UI.show('world'); break;
      case 'gomenu': UI.show('menu'); break;
      case 'bag': UI.openBag(); break;

      case 'opennode': UI.openGather(el.dataset.id); break;
      case 'citybld': UI.openBldModal(el.dataset.bld); break;
      case 'togglegather': toggleGather(); break;

      // ----- çanta (bag screen) -----
      case 'bagselect': UI.bagSelect(el.dataset.id, el.getBoundingClientRect()); break;
      case 'closepop': UI.closePop(); break;
      case 'togglestats': UI.toggleStats(); break;
      case 'settings': openSettings(); break;
      case 'setlang': {
        SKY.LANG.setLang(el.dataset.lang);
        UI.closeMB('sheetModal');
        UI.renderTop();
        UI.refreshIfMap();
        UI.toast(el.dataset.lang === 'tr' ? t('ui.lang_tr') : t('ui.lang_en'));
        break;
      }
      case 'logout': doLogout(); break;
      case 'sortbag': UI.toggleSort(); break;
      case 'bagcompare': UI.closePop(); UI.compareItem(el.dataset.id, el.dataset.type); break;
      case 'bagequip': { const r = S.equip(el.dataset.id); UI.toast(r.ok ? '✅ ' + t('bag.equipped') : '❌ ' + r.msg); if (r.ok) UI.clearBagSel(); UI.renderBag(); break; }
      case 'bagunequip': { const r = S.unequip(el.dataset.t); UI.toast(r.ok ? '✅ ' + t('bag.unequipped') : '❌ ' + (r.msg || '')); if (r.ok) UI.clearBagSel(); UI.renderBag(); break; }
      case 'baguse': { const r = C.useConsumable(el.dataset.ids); if (r.ok) { UI.toast('✨ ' + D.BUFFS[r.eff].name + ' +' + r.val + '%'); } UI.clearBagSel(); UI.renderBag(); break; }
      case 'bagsell': UI.closePop(); UI.openPazar('sell'); break;
      case 'bagdeposit': { const r = S.depositEquip(el.dataset.id); UI.toast(r ? '🏦 ' + t('bag.to_bank') : '❌'); UI.clearBagSel(); UI.renderBag(); break; }
      case 'bagsellmat': { const k = el.dataset.k; const r = C.sellMat(k, S.matCount(k)); UI.toast(r.ok ? '💰 +' + UI.fmt(r.net) : '❌'); UI.clearBagSel(); UI.renderBag(); break; }
      case 'bagmatdep': { const k = el.dataset.k; S.depositMat(k, S.matCount(k)); UI.toast('🏦 ' + t('bag.deposited')); UI.clearBagSel(); UI.renderBag(); break; }
      case 'bagdrop': dropBagItem(el.dataset.id); break;
      case 'bagnote': UI.toast('🔨 ' + t('bag.workshop_hint')); break;
      case 'bagsellmisc': {
        var smk = el.dataset.k;
        var smn = el.dataset.n === 'all' ? (P.misc[smk] || 0) : 1;
        if (smn <= 0 || !P.misc[smk]) { UI.toast('❌ Yok'); break; }
        // Price: stone3=50, stone6=120, stone9=250, stone12=500, stone15=1200, charm_break=2000, charm_drop=500, charm_color=200
        var miscPrices = { stone3: 50, stone6: 120, stone9: 250, stone12: 500, stone15: 1200, charm_break: 2000, charm_drop: 500, charm_color: 200 };
        var unitPrice = miscPrices[smk] || 100;
        var total = unitPrice * smn;
        P.misc[smk] -= smn;
        if (P.misc[smk] < 0) P.misc[smk] = 0;
        P.gold += total;
        UI.toast('💰 +' + UI.fmt(total) + ' ' + t('dg.gold').toLowerCase() + ' (' + smn + ' ' + t('common.piece') + ')');
        UI.clearBagSel(); UI.renderBag(); UI.renderTop();
        break;
      }

      case 'travel': UI.openTravel(el.dataset.z); break;
      case 'travelcity': UI.openTravel(el.dataset.z); break;
      case 'dotravel': doTravel(); break;

      // dungeon
      case 'dgback': UI.closeMB('dungeonModal'); break;
      case 'dgbiome': UI.setDunBiome(el.dataset.b); UI.renderDungeonSelect(); break;
      case 'duntier': UI.dunTier = +el.dataset.t; UI.renderDungeonSelect(); break;
      case 'dgfloor': UI.setDunExpanded(+el.dataset.f); UI.renderDungeonSelect(); break;
      case 'enterdun': DUN.enter(+el.dataset.f, UI.dunTier); UI.enterDungeonView(); break;
      case 'dgexit': exitDungeon(); break;
      case 'dgauto': UI.toggleDunAuto(); break;
      case 'fightboss': {
        var bid = el.dataset.bid;
        if (DUN.startBossFight(bid)) {
          UI.updateMobDisplay(DUN.getActive());
          UI.renderBossQueue();
          UI.toast(t('dg.boss_attack'));
        }
        break;
      }

      // bag
      case 'bagtab': UI.bagTab = el.dataset.t; UI.renderBag(); break;
      case 'iteminfo': { const eq = el.dataset.eq; const it = eq ? P.equipped[eq] : (S.getEquipItem(el.dataset.id) || C.findEquipAnywhere(el.dataset.id)); if (it) UI.itemInfo(it, eq); break; }
      case 'matinfo': UI.matInfo(el.dataset.k); break;
      case 'equip': { const r = S.equip(el.dataset.id); UI.toast(r.ok ? '✅ ' + t('bag.equipped') : '❌ ' + r.msg); if (r.ok) UI.renderBag(); break; }
      case 'unequip': { const r = S.unequip(el.dataset.t); UI.toast(r.ok ? '✅ ' + t('bag.unequipped') : '❌ ' + (r.msg || '')); if (r.ok) UI.renderBag(); break; }
      case 'useconsum': { const r = C.useConsumable(el.dataset.id); if (r.ok) { UI.toast('✨ ' + D.BUFFS[r.eff].name + ' +' + r.val + '%'); UI.renderBag(); UI.renderTop(); } break; }
      case 'matdeposit': { S.depositMat(el.dataset.k, S.matCount(el.dataset.k)); UI.toast('📥 ' + t('bag.deposited')); UI.renderBag(); break; }

      // atolye
      case 'attab': UI.atTab = el.dataset.t; UI.renderAtolye(); break;
      case 'selcraft': UI.selCraft = el.dataset.k; UI.slotRar = [0,0,0]; UI.renderAtolye(); break;
      case 'crafttier': UI.craftTier = +el.dataset.t; UI.renderAtolye(); break;
      case 'pickrar': UI.pickSlotRar(+el.dataset.si, +el.dataset.ri); break;
      case 'docraft': doCraft(el.dataset.k); break;
      case 'enhpick': UI.enhanceSheet(el.dataset.id); break;
      case 'doenh': doEnh(el.dataset.id, +el.dataset.p); break;
      // yükseltme 3-slot sistemi
      case 'enhpickitem': openEnhItemPicker(); break;
      case 'enhpickstone': openEnhStonePicker(); break;
      case 'enhpickcharm': openEnhCharmPicker(); break;
      case 'enhclearitem': UI.enhSelItem = null; UI.renderAtolye(); break;
      case 'enhclearstone': UI.enhSelStone = null; UI.renderAtolye(); break;
      case 'enhclearcharm': UI.enhSelCharm = ''; UI.renderAtolye(); break;
      case 'enhselectitem': UI.enhSelItem = el.dataset.id; UI.renderAtolye(); break;
      case 'enhselectstone': UI.enhSelStone = +el.dataset.p; UI.renderAtolye(); break;
      case 'enhselectcharm': UI.enhSelCharm = el.dataset.c; UI.renderAtolye(); break;
      case 'enhback': UI.renderAtolye(); break;
      case 'doenhnew': doEnhNew(); break;
      case 'uppick': UI.upgradeSheet(el.dataset.id); break;
      case 'doupgrade': doUpgrade(el.dataset.id); break;

      // banka
      case 'bankup': { const r = C.upgradeBank(); UI.toast(r.ok ? '✅ +25 slot' : '❌ ' + r.msg); UI.openBanka(); UI.renderTop(); break; }
      case 'depositall': { const keys = Object.keys(P.mats).filter(k => P.mats[k] > 0); for (const k of keys) S.depositMat(k, P.mats[k]); UI.toast('📥 ' + keys.length + ' ' + t('bag.deposited')); UI.openBanka(); break; }
      case 'bankwd': { const r = S.withdrawMat(el.dataset.k, 99); UI.toast(r ? '📤 ' + t('bank.withdrawn') : '❌'); UI.openBanka(); break; }
      case 'bankwdeq': { const r = S.withdrawEquip(el.dataset.id); UI.toast(r ? '📤 ' + t('bank.withdrawn') : '❌'); UI.openBanka(); break; }

      // pazar
      case 'mkttab': UI.mktTab = el.dataset.t; UI.renderPazar(); break;
      case 'sellmat': { const amt = el.dataset.n === 'all' ? S.matCount(el.dataset.k) : +el.dataset.n; const r = C.sellMat(el.dataset.k, amt); UI.toast(r.ok ? '💰 +' + UI.fmt(r.net) : '❌'); UI.renderPazar(); UI.renderTop(); break; }
      case 'sellequip': { const r = C.sellEquip(el.dataset.id); UI.toast(r.ok ? '💰 +' + UI.fmt(r.net) : '❌'); UI.renderPazar(); UI.renderTop(); break; }
      case 'shopbuy': shopBuy(el.dataset.i, +el.dataset.c); break;
      case 'mktbuy': UI.openBuyModal(el.dataset.lid); break;
      case 'mktbuynow': UI.doBuy(el.dataset.lid, +el.dataset.uprice); break;
      case 'mktpage': UI.mktPageNav(+el.dataset.d); break;
      case 'dochangecity': changeCity(el.dataset.c, +el.dataset.cost); break;

      // ----- banka ekranı -----
      case 'banksel': UI.bankSelect(el.dataset.side, el.dataset.id, el.getBoundingClientRect()); break;
      case 'bankxfer': UI.openXfer(el.dataset.dir); break;
      case 'bankxferok': UI.confirmXfer(); break;
      case 'xfquick': UI.xfQuick(+el.dataset.v); break;
      case 'banksort': UI.bankSortSide(el.dataset.side); break;
      case 'bankcity': UI.bankCity(el.dataset.c); break;
      case 'bankupgrade': UI.bankUpgradeUI(); break;

      // menu cards
      case 'atolye': UI.openAtolye(); break;
      case 'banka': UI.openBanka(); break;
      case 'pazar': UI.openPazar(); break;
      case 'charinfo': charInfo(); break;
      case 'friends': openFriends(); break;
      case 'friendstab': setFriendsTab(el.dataset.ft); break;
      case 'friendAccept': acceptFriend(el.dataset.uid, el.dataset.name, el.dataset.city); break;
      case 'friendReject': rejectFriend(el.dataset.uid); break;
      case 'friendRemove': removeFriend(el.dataset.uid); break;
      case 'friendPM': startPM(el.dataset.uid, el.dataset.name); break;
      case 'friendReq': sendFriendReq(el.dataset.uid, el.dataset.name); break;
      case 'alliance': UI.toast('🛡️ ' + t('bld.coming_soon')); break;
      case 'ranking': openRanking(); break;
      case 'savegame': { var _u = FB.uid(); var _ci = activeCharIdx(); if (_u && S.get()) saveCharState(_u, _ci); UI.toast(t('common.saved')); break; }
      case 'resetgame': if (confirm(t('char.delete_confirm'))) { var _ru = FB.uid(); var _ri = activeCharIdx(); localStorage.removeItem(charSaveKey(_ru, _ri)); var _metaRaw = localStorage.getItem('skyzone_fb_meta_' + _ru); var _meta = _metaRaw ? JSON.parse(_metaRaw) : null; if (_meta && _meta.characters) { _meta.characters.splice(_ri, 1); localStorage.setItem('skyzone_fb_meta_' + _ru, JSON.stringify(_meta)); FB.saveAccountMeta(_meta); } try { firebase.database().ref('players/' + _ru + '/chars/' + _ri).remove(); } catch(e) {} stopLoop(); S.set(null); if (_meta && _meta.characters && _meta.characters.length > 0) showCharSelect(); else showCharCreate(); } break;
      case 'selectchar': selectCharacter(+el.dataset.idx); break;

      // ---- MOUNT ----
      case 'mountmenu': UI.openMount(); break;
      case 'openmountbox': {
        // legacy: old counter-based mount box (kept for compat)
        UI.toast('❌ ' + t('mount.open_from_bag'));
        break;
      }
      case 'openchestmisc': {
        var ck = el.dataset.k; // 'enhChest' or 'goldChest'
        if (!P.misc[ck] || P.misc[ck] <= 0) { UI.toast(t('ui.no_chest')); break; }
        P.misc[ck]--;
        var msg = '';
        if (ck === 'enhChest') {
          // Roll from CHEST_POOL
          var pool = D.CHEST_POOL;
          var totalW = 0;
          for (var pi = 0; pi < pool.length; pi++) totalW += pool[pi].weight;
          var roll = Math.random() * totalW;
          var acc = 0;
          var reward = pool[0];
          for (var pi = 0; pi < pool.length; pi++) {
            acc += pool[pi].weight;
            if (roll < acc) { reward = pool[pi]; break; }
          }
          if (reward.type === 'stone') {
            P.misc[reward.k] = (P.misc[reward.k] || 0) + 1;
            msg = '💎 ' + t('misc.' + reward.k) + '!';
          } else if (reward.type === 'charm') {
            P.misc[reward.k] = (P.misc[reward.k] || 0) + 1;
            msg = (reward.k === 'charm_break' ? '🔴 ' : '🟡 ') + t('misc.' + reward.k) + '!';
          }
        } else if (ck === 'goldChest') {
          var goldAmt = 500 + Math.floor(Math.random() * 4500);
          P.gold += goldAmt;
          msg = '💰 ' + goldAmt + ' ' + t('dg.gold').toLowerCase() + '!';
        } else if (ck === 'mountBox') {
          // Roll from MOUNT_BOX_POOL
          var mbPool = D.MOUNT_BOX_POOL;
          var mbTotal = 0;
          for (var mi = 0; mi < mbPool.length; mi++) mbTotal += mbPool[mi].weight;
          var mbRoll = Math.random() * mbTotal;
          var mbAcc = 0;
          var mbReward = mbPool[0];
          for (var mi = 0; mi < mbPool.length; mi++) {
            mbAcc += mbPool[mi].weight;
            if (mbRoll < mbAcc) { mbReward = mbPool[mi]; break; }
          }
          if (mbReward.type === 'mount') {
            var newMount = E.makeMount(mbReward.k, false);
            if (newMount) {
              // Add mount as equip item to inventory
              newMount.type = 'binek'; newMount.enh = 0; newMount.perks = newMount.perks || []; newMount.stats = newMount.stats || {};
              newMount.name = newMount.name || 'Binek';
              newMount.icon = '🐎';
              if (!S.invFull()) S.addEquip(newMount);
              else S.setMount(newMount); // fallback: equip if inv full
              msg = '🐎 ' + newMount.name + ' (' + t('rar.' + newMount.rarity) + ') ' + t('mount.added') + '!';
            }
          } else if (mbReward.type === 'redMount') {
            var redTypes = ['at', 'kurt'];
            var redType = redTypes[Math.floor(Math.random() * redTypes.length)];
            var redMount = E.makeMount(redType, true);
            if (redMount) {
              redMount.type = 'binek'; redMount.enh = 0; redMount.perks = redMount.perks || []; redMount.stats = redMount.stats || {};
              redMount.name = redMount.name || 'Binek';
              redMount.icon = '🐎';
              if (!S.invFull()) S.addEquip(redMount);
              else S.setMount(redMount);
              msg = '🔴⚡ ' + t('mount.red_stat') + ' ' + redMount.name + ' ' + t('mount.added') + '! (+%5 CP)';
            }
          } else if (mbReward.type === 'stone') {
            P.misc[mbReward.k] = (P.misc[mbReward.k] || 0) + 1;
            msg = '💎 ' + t('misc.' + mbReward.k) + '!';
          } else if (mbReward.type === 'charm') {
            P.misc[mbReward.k] = (P.misc[mbReward.k] || 0) + 1;
            msg = (mbReward.k === 'charm_break' ? '🔴 ' : '🟡 ') + t('misc.' + mbReward.k) + '!';
          } else if (mbReward.type === 'gold') {
            var gAmt = mbReward.min + Math.floor(Math.random() * (mbReward.max - mbReward.min));
            P.gold += gAmt;
            msg = '💰 ' + gAmt + ' ' + t('dg.gold').toLowerCase() + '!';
          }
        }
        UI.toast(msg);
        UI.clearBagSel(); UI.renderBag(); UI.renderTop();
        break;
      }
      case 'openmountboxitem': {
        const m = S.openMountBox(el.dataset.id);
        if (m) {
          UI.toast('🐎 ' + m.name + ' (' + t('rar.' + m.rarity) + ')' + (m.redStat ? ' ' + t('mount.red_stat') + '!' : ''));
          S.setMount(m);
          UI.clearBagSel(); UI.renderBag();
        } else { UI.toast('❌ ' + t('mount.not_found')); }
        break;
      }
      case 'mountequip': {
        var mountItem = S.getEquipItem(el.dataset.id);
        if (!mountItem || mountItem.kind !== 'mount') { UI.toast('❌ ' + t('mount.not_found')); break; }
        S.removeEquip(mountItem.id);
        var oldMount = S.getMount();
        if (oldMount && oldMount.kind === 'mount') {
          oldMount.perks = oldMount.perks || [];
          oldMount.stats = oldMount.stats || {};
          if (!S.invFull()) S.addEquip(oldMount);
        }
        S.setMount(mountItem);
        UI.toast('🐎 ' + mountItem.name + ' ' + t('bag.equipped') + '! (' + t('rar.' + mountItem.rarity) + ')');
        UI.clearBagSel(); UI.renderBag(); UI.renderTop();
        break;
      }
      case 'mountunequip': S.setMount(null); UI.toast(t('mount.unequipped')); UI.renderMount(); break;

      // ---- SHOP ----
      case 'magaza': UI.openShop(); break;
      case 'shoptab': UI.shopTab = el.dataset.t; UI.renderShop(); break;
      case 'buypremium': { const r = C.buyPremium(); UI.toast(r.ok ? '✅ Premium aktif!' : '❌ ' + r.msg); UI.renderShop(); UI.renderTop(); break; }
      case 'buyslot': { const r = C.buyShopSlot(el.dataset.sid); UI.toast(r.ok ? '✅ +' + r.amount + ' slot eklendi' : '❌ ' + r.msg); UI.renderShop(); break; }
      case 'buycrystal': { const p = D.SHOP.crystalPacks.find(x => x.id === el.dataset.pid); if (p) { C.addGems(p.gems); UI.toast('💎 +' + p.gems + ' kristal (demo)'); UI.renderShop(); } break; }
      case 'buystarterpack': { const r = C.buyStarterPack(); UI.toast(r.ok ? '🎁 Baslangic paketi aktif!' : '❌ ' + r.msg); UI.renderShop(); break; }

      // ---- WAR ----
      case 'war': UI.openWar(); break;
      case 'openstone': UI.openStoneModal(el.dataset.sid); break;
      case 'stoneattack': {
        var ws = window.SKY_WAR_STATE;
        if (!ws || !ws.active) { UI.toast(t('war.not_active')); break; }
        var sid = el.dataset.sid;
        var st = ws.stones.find(function(s) { return s.id === sid; });
        if (!st) break;
        var myCP = E.baseCP(P.equipped);
        var dmg = Math.round(myCP * 0.15);
        st.hp = Math.max(0, st.hp - dmg);
        if (st.hp <= 0) {
          st.owner = P.city;
          st.hp = D.WAR.stoneHP;
          UI.toast('🏴 ' + st.name + ' ' + t('war.captured') + '!');
        } else {
          UI.toast('⚔️ -' + dmg + ' ' + t('war.damage') + '! (HP: ' + st.hp + ')');
        }
        UI.closeMB('stoneModal');
        break;
      }
      case 'stonedefend': {
        var ws = window.SKY_WAR_STATE;
        if (!ws || !ws.active) { UI.toast(t('war.not_active')); break; }
        var sid = el.dataset.sid;
        var st = ws.stones.find(function(s) { return s.id === sid; });
        if (!st) break;
        var myCP = E.baseCP(P.equipped);
        var heal = Math.round(myCP * 0.1);
        st.hp = Math.min(D.WAR.stoneHP, st.hp + heal);
        UI.toast('🛡️ +' + heal + ' ' + t('war.healed') + '! (HP: ' + st.hp + ')');
        UI.closeMB('stoneModal');
        break;
      }

      // ---- TRADE ----
      case 'trade': UI.openTrade(); break;
      case 'tradeplayeradd': UI.tradeAddPlayerItem(); break;
      case 'tradeplayerclick': UI.tradeRemovePlayerItem(+el.dataset.idx); break;
      case 'tradepickitem': UI.tradePickItem(el.dataset.id); break;
      case 'tradeconfirmplayer': UI.tradeConfirmPlayer(); break;

      // ---- MAILBOX ----
      case 'mailbox': UI.openMailbox(); break;
      case 'mailcollectall': UI.mailCollectAll(); break;

      // ---- MARKET LISTING ----
      case 'mktlistmat': UI.openListModal('mat', el.dataset.k, +el.dataset.sug || 100); break;
      case 'mktlistequip': UI.openListModal('equip', el.dataset.id, +el.dataset.sug || 100); break;
      case 'listquick': {
        var li = document.getElementById('listPriceInput');
        var confirmBtn = document.querySelector('[data-act="listconfirm"]');
        var sug = confirmBtn ? +confirmBtn.dataset.sug : 100;
        if (li) { li.value = Math.round(sug * (+el.dataset.m)); li.dispatchEvent(new Event('input')); }
        break;
      }
      case 'listconfirm': {
        var unitPrice = parseInt(document.getElementById('listPriceInput')?.value) || 0;
        var qty = parseInt(document.getElementById('listQtyInput')?.value) || 1;
        if (unitPrice <= 0) { UI.toast('❌ ' + t('market.invalid_price')); break; }
        var totalPrice = unitPrice * qty;
        var r;
        if (el.dataset.type === 'mat') {
          var mk = el.dataset.key;
          r = C.listMat(mk, qty, totalPrice);
        } else {
          r = C.listEquip(el.dataset.key, totalPrice);
        }
        if (r.ok) { UI.toast('✅ ' + t('market.listed')); UI.closeMB('sheetModal'); UI.renderPazar(); UI.renderTop(); }
        else { UI.toast('❌ ' + (r.msg || '')); }
        break;
      }
      case 'mktcancel': {
        var rc = C.cancelListing(el.dataset.lid);
        UI.toast(rc.ok ? '↩️ ' + t('market.cancelled') : '❌');
        UI.renderPazar(); UI.renderTop();
        break;
      }

      // buff info popover
      case 'buffinfo': UI.buffInfo(el.dataset.buff, el.getBoundingClientRect()); break;
      // player interaction (gather modal)
      case 'playeratk': UI.playerAttack(el.dataset.p); break;
      case 'playertrade': UI.playerTrade(el.dataset.p); break;

      // ---- GATHER/DUNGEON PVP ----
      case 'gatherPvp': {
        var pvpName = el.dataset.name;
        var pvpTribe = el.dataset.tribe;
        var pvpCP = +(el.dataset.cp || 0);
        // If no CP data (real player), estimate based on own CP
        if (!pvpCP) { var _myCP = E.baseCP(S.get().equipped); pvpCP = Math.round(_myCP * (0.7 + Math.random() * 0.6)); }
        doGatherPvp(pvpName, pvpTribe, pvpCP, el);
        break;
      }

      // ---- EVENTS ----
      case 'evtpvpinfo':
      case 'evtpvpjoin':
      case 'evtattack':
        if (SKY.EVT) SKY.EVT.handleAction(act, el);
        break;
    }
  }

  // ---------- impls ----------
  // ---- RANKING ----
  function openRanking() {
    UI.openMB('rankModal');
    var body = $('#rankBody');
    if (body) body.innerHTML = '<div style="text-align:center;padding:20px;color:var(--textdim)">' + t('common.loading') + '</div>';
    var tribeIcons = { kar: '❄️', orman: '🌲', col: '🏜️' };
    var tribeColors = { kar: '#7ac0d8', orman: '#5aaa3a', col: '#d8a040' };
    // Ensure own leaderboard entry exists before reading
    var P = S.get();
    if (P && P.name) {
      try { FB.updateLeaderboard(P.name, P.city, E.baseCP(P.equipped)); } catch(e) {}
    }
    FB.getLeaderboard(100).then(function(list) {
      if (!body) return;
      if (!list || !list.length) {
        body.innerHTML = '<div style="text-align:center;padding:20px;color:var(--textdim)">' + t('rank.empty') + '</div>';
        return;
      }
      var P = S.get();
      var myUid = FB.uid();
      var myRank = -1;
      for (var i = 0; i < list.length; i++) { if (list[i].uid === myUid) { myRank = i; break; } }
      var html = '<div class="rank-list">';
      // Own rank banner if not in top 10
      if (myRank > 9) {
        var me = list[myRank];
        html += '<div class="rank-row rank-me">' +
          '<div class="rank-pos">#' + (myRank + 1) + '</div>' +
          '<div class="rank-tribe" style="color:' + (tribeColors[me.city] || 'var(--textdim)') + '">' + (tribeIcons[me.city] || '⚔️') + '</div>' +
          '<div class="rank-name">' + UI.esc(me.name) + ' <span style="font-size:8px;color:var(--safe)">(' + t('gather.you') + ')</span></div>' +
          '<div class="rank-cp">⚡ ' + (me.cp || 0).toLocaleString('tr-TR') + '</div>' +
          '</div><div style="text-align:center;padding:4px 0;color:var(--textdim);font-size:9px">···</div>';
      }
      for (var j = 0; j < Math.min(list.length, 100); j++) {
        var p = list[j];
        var isMe = p.uid === myUid;
        var posClass = j === 0 ? 'rank-gold' : j === 1 ? 'rank-silver' : j === 2 ? 'rank-bronze' : '';
        html += '<div class="rank-row' + (isMe ? ' rank-me' : '') + ' ' + posClass + '">' +
          '<div class="rank-pos">' + (j < 3 ? ['🥇','🥈','🥉'][j] : '#' + (j + 1)) + '</div>' +
          '<div class="rank-tribe" title="' + t('tribe.' + p.city) + '" style="color:' + (tribeColors[p.city] || 'var(--textdim)') + '">' + (tribeIcons[p.city] || '⚔️') + '</div>' +
          '<div class="rank-name">' + UI.esc(p.name) + (isMe ? ' <span style="font-size:8px;color:var(--safe)">(' + t('gather.you') + ')</span>' : '') + '</div>' +
          '<div class="rank-cp">⚡ ' + (p.cp || 0).toLocaleString('tr-TR') + '</div>' +
          '</div>';
      }
      html += '</div>';
      body.innerHTML = html;
    }).catch(function(err) {
      console.error('Ranking error:', err);
      if (body) body.innerHTML = '<div style="text-align:center;padding:20px;color:var(--danger)">' + t('rank.error') + '</div>';
    });
  }

  function toggleGather() {
    const n = UI.getGatherNode(); if (!n) return;
    const g = W.isGathering();
    if (g && g.nodeId === n.id) {
      // aynı node → durdur
      W.stopGather(); UI.setGatherUI(false);
    } else {
      // farklı node veya yeni başlangıç → eski durdur, yeni başlat
      if (g) W.stopGather();
      const r = W.startGather(n.id);
      if (!r.ok) { UI.toast('❌ ' + (r.msg || '')); return; }
      UI.setGatherUI(true);
    }
    UI.refreshIfMap();
  }

  function doTravel() {
    const zid = UI.getTravelTarget(); const cur = W.curZone();
    if (!zid || zid === cur.id) return;
    const t = W.travelTime(cur, W.zone(zid));
    W.stopGather();
    UI.openSheet(SKY.LANG.t('travel.journey'), cur.name + ' → ' + W.zone(zid).name, `
      <div style="text-align:center;font-size:34px">🐎</div>
      <div class="g-progress" style="margin:12px 0"><div class="g-progress-fill" id="travelBar" style="width:0%"></div></div>
      <div class="muted small" id="travelTxt" style="text-align:center">${t} ${SKY.LANG.t('travel.seconds')}</div>`);
    UI.closeMB('travelModal');
    let el = 0; clearInterval(window._tr);
    window._tr = setInterval(() => {
      el += 0.1; const pct = Math.min(100, el / t * 100);
      const bar = $('#travelBar'); if (bar) bar.style.width = pct + '%';
      const txt = $('#travelTxt'); if (txt) txt.textContent = Math.max(0, t - el).toFixed(1) + ' ' + SKY.LANG.t('travel.seconds');
      if (el >= t) { clearInterval(window._tr); W.enterZone(zid); try { FB.updateZone(zid); } catch(e) {} UI.closeMB('sheetModal'); UI.toast('📍 ' + W.zone(zid).name); UI.show('map'); initMapView(); }
    }, 100);
  }

  function doCraft(key) {
    if (!S.inCity()) { UI.toast(t('craft.only_city')); return; }
    const r = C.craft(key, UI.craftTier, UI.slotRar);
    if (!r.ok) { UI.toast('❌ ' + r.msg); return; }
    UI.toast('✅ ' + (r.item.name || t('craft.produced')));
    UI.renderAtolye(); UI.renderTop();
  }
  function doEnh(id, p) {
    const ce = document.querySelector('input[name="charm"]:checked');
    const r = C.enhance(id, p, ce ? ce.value : '');
    if (!r.ok) { UI.toast('❌ ' + r.msg); return; }
    const m = { success: '✅ +' + r.enh + '%', fail: '➖ ' + t('enh.failed'), drop: '🔻 -3% → +' + r.enh + '%', drop_protected: '🛡️ ' + t('enh.break_prevented') + ' → +' + r.enh + '%', fail_protected: '🛡️ ' + t('enh.drop_prevented'), break: '💥 ' + t('enh.item_broken') };
    UI.toast(m[r.result]);
    if (r.result !== 'break') UI.enhanceSheet(id); else UI.renderAtolye();
  }
  function doUpgrade(id) {
    const ce = document.querySelector('input[name="ucharm"]:checked');
    const r = C.rarityUpgrade(id, ce ? ce.value : '');
    if (!r.ok) { UI.toast('❌ ' + (r.msg || '')); return; }
    const m = { success: '🎉 → ' + t('rar.' + r.rarity), fail: '🔻 → ' + t('rar.' + r.rarity), fail_protected: '🛡️ ' + t('enh.color_protected') };
    UI.toast(m[r.result]); UI.renderAtolye();
  }
  function shopBuy(item, cost) {
    const P = S.get();
    if (P.gold < cost) { UI.toast('❌ ' + t('shop.no_gold')); return; }
    if (item === 'citychange') {
      UI.openSheet('🏙️ ' + t('shop.change_city'), '50.000 ' + t('dg.gold').toLowerCase(), D.ZONES.filter(z => z.kind === 'city').map(z =>
        `<button class="btn full ${z.city === P.city ? 'ghost' : ''}" data-act="dochangecity" data-c="${z.city}" data-cost="${cost}" style="margin-bottom:6px" ${z.city === P.city ? 'disabled' : ''}>${D.CITIES[z.city].icon} ${D.CITIES[z.city].name}</button>`).join(''));
      return;
    }
    if (item === 'bankup') { P.gold -= cost; if(S.buyBankBag()) UI.toast('✅ ' + t('shop.bank_slot_ok')); else { P.gold += cost; UI.toast('❌ Max 4'); } }
    if (item === 'invbag') { P.gold -= cost; if(S.buyInvBag()) UI.toast('✅ ' + t('shop.inv_slot_ok')); else { P.gold += cost; UI.toast('❌ Max 4'); } }
    if (item === 'expboost') { P.gold -= cost; for (var _t in P.itemExp) P.itemExp[_t] += 1000; UI.toast('⚡ ' + t('shop.exp_boost')); }
    UI.renderPazar(); UI.renderTop();
  }
  function changeCity(city, cost) {
    const P = S.get();
    if (P.gold < cost) { UI.toast(t('ui.insufficient_gold')); return; }
    P.gold -= cost; P.city = city; P.zone = 'city_' + city; W.enterZone(P.zone);
    try { FB.setOnline(P.name, P.city, P.zone); } catch(e) {}
    UI.toast('🏙️ ' + t('shop.city_changed') + ': ' + D.CITIES[city].name);
    UI.closeMB('sheetModal'); UI.show('map'); initMapView();
  }
  function dropBagItem(id) {
    const P = S.get();
    if (id.startsWith('eqi:')) { S.removeEquip(id.slice(4)); }
    else if (id.startsWith('mat:')) { const k = id.slice(4); delete P.mats[k]; }
    else if (id.startsWith('misc:')) { P.misc[id.slice(5)] = 0; }
    else if (id.startsWith('use:')) {
      const parts = id.slice(4).split(':'); // type:buff:rar:tier
      const [type, buff, rar, tier] = parts;
      P.consumables = P.consumables.filter(c => !(c.type === type && c.buff === buff && c.rarity === +rar && c.tier === +tier));
    }
    UI.toast('🗑️ ' + t('bag.dropped')); UI.clearBagSel(); UI.renderBag();
  }

  // yükseltme picker'lar
  // enhpicker: sheetBody'yi geçici olarak picker listesiyle değiştir (geri butonlu)
  function enhPicker(title, sub, body) {
    $('#sheetTitle').innerHTML = title;
    $('#sheetSub').textContent = sub;
    $('#sheetBody').innerHTML = `<button class="btn full ghost sm" data-act="enhback" style="margin-bottom:10px">◂ Geri</button>${body}`;
  }
  function openEnhItemPicker() {
    const P = S.get();
    // envanterdeki + giyili ekipmanlar
    const inv = P.equipItems.filter(i => !i.t0);
    const eq = Object.values(P.equipped).filter(i => i && !i.t0);
    // bankadaki ekipmanlar
    const bank = S.bankHere().equipItems || [];
    if (!inv.length && !eq.length && !bank.length) { UI.toast(t('enh.no_items')); return; }
    let body = '';
    if (eq.length) {
      body += '<div style="font-family:Cinzel,serif;font-size:8px;letter-spacing:1.5px;color:var(--gold);text-transform:uppercase;font-weight:700;margin:6px 0 4px">' + t('common.equipped_label') + '</div>';
      for (const it of eq) body += enhItemRow(it);
    }
    if (inv.length) {
      body += '<div style="font-family:Cinzel,serif;font-size:8px;letter-spacing:1.5px;color:var(--gold);text-transform:uppercase;font-weight:700;margin:6px 0 4px">' + t('common.inventory') + '</div>';
      for (const it of inv) body += enhItemRow(it);
    }
    if (bank.length) {
      body += '<div style="font-family:Cinzel,serif;font-size:8px;letter-spacing:1.5px;color:var(--gold);text-transform:uppercase;font-weight:700;margin:6px 0 4px">' + t('menu.bank') + '</div>';
      for (const it of bank) body += enhItemRow(it);
    }
    enhPicker('⚔️ ' + t('enh.item_select'), t('common.inventory') + ' & ' + t('menu.bank'), body);
  }
  function enhItemRow(it) {
    return `<div class="list-card" data-act="enhselectitem" data-id="${it.id}" style="cursor:pointer"><div class="lc-left"><span class="lc-ic" style="font-size:20px">${it.icon}</span><div><div class="lc-title">${it.name}</div><div class="lc-sub">+${it.enh || 0}% enh · ${D.RARITY[it.rarity].name}</div></div></div></div>`;
  }
  function openEnhStonePicker() {
    const P = S.get();
    var totalSt = (P.misc.stone3||0)+(P.misc.stone6||0)+(P.misc.stone9||0)+(P.misc.stone12||0)+(P.misc.stone15||0);
    if (totalSt <= 0) { UI.toast(t('enh.no_stones')); return; }
    let body = '';
    var stoneEntries = [
      { p: 3, k: 'stone3', rar: 0 },
      { p: 6, k: 'stone6', rar: 1 },
      { p: 9, k: 'stone9', rar: 2 },
      { p: 12, k: 'stone12', rar: 3 },
      { p: 15, k: 'stone15', rar: 4 },
    ];
    for (var si = 0; si < stoneEntries.length; si++) {
      var se = stoneEntries[si];
      var cnt = P.misc[se.k] || 0;
      if (cnt > 0) {
        var _IC = window.SKY_ICON || {};
        body += '<div class="list-card" data-act="enhselectstone" data-p="' + se.p + '" style="cursor:pointer"><div class="lc-left"><span class="lc-ic">' + (_IC['stoneS' + se.p] || '💎') + '</span><div><div class="lc-title">' + t('misc.stone' + se.p) + '</div><div class="lc-sub">' + t('rar.' + se.rar) + ' · ' + t('enh.success_rate') + ' %' + D.ENH_STONES.find(function(x){return x.p===se.p;}).base + '</div></div></div><span style="font-family:JetBrains Mono;font-size:11px;color:var(--gold)">×' + cnt + '</span></div>';
      }
    }
    if (!body) body = '<div class="empty-note">' + t('enh.no_stones') + '</div>';
    enhPicker('💎 ' + t('enh.stone_select'), totalSt + ' ' + t('common.piece'), body);
  }
  function openEnhCharmPicker() {
    const P = S.get();
    let body = '';
    if (P.misc.charm_break > 0) body += '<div class="list-card" data-act="enhselectcharm" data-c="break" style="cursor:pointer"><div class="lc-left"><span class="lc-ic">🔴</span><div><div class="lc-title">' + t('misc.charm_break') + '</div><div class="lc-sub">' + t('enh.charm_break_desc') + '</div></div></div><span style="font-family:JetBrains Mono;font-size:11px;color:var(--gold)">×' + P.misc.charm_break + '</span></div>';
    if (P.misc.charm_drop > 0) body += '<div class="list-card" data-act="enhselectcharm" data-c="drop" style="cursor:pointer"><div class="lc-left"><span class="lc-ic">🟡</span><div><div class="lc-title">' + t('misc.charm_drop') + '</div><div class="lc-sub">' + t('enh.charm_drop_desc') + '</div></div></div><span style="font-family:JetBrains Mono;font-size:11px;color:var(--gold)">×' + P.misc.charm_drop + '</span></div>';
    if (!body) body = '<div class="empty-note">' + t('enh.no_charms') + '</div>';
    body += '<div class="list-card" data-act="enhselectcharm" data-c="" style="cursor:pointer"><div class="lc-left"><span class="lc-ic">❌</span><div><div class="lc-title">' + t('enh.no_charm') + '</div><div class="lc-sub">' + t('enh.no_charm_desc') + '</div></div></div></div>';
    enhPicker('🛡️ ' + t('enh.charm_select'), t('enh.charm_optional'), body);
  }
  function doEnhNew() {
    if (!UI.enhSelItem || !UI.enhSelStone) return;
    const r = C.enhance(UI.enhSelItem, UI.enhSelStone, UI.enhSelCharm);
    if (!r.ok) { UI.toast('❌ ' + r.msg); return; }
    const msgs = { success: '✅ ' + t('enh.success_label') + ' +' + r.enh + '%', fail: '➖ ' + t('enh.failed'), drop: '🔻 ' + t('enh.dropped') + ' → +' + r.enh + '%', drop_protected: '🛡️ ' + t('enh.break_prevented') + ' → +' + r.enh + '%', fail_protected: '🛡️ ' + t('enh.drop_prevented'), break: '💥 ' + t('enh.item_broken') };
    UI.toast(msgs[r.result]);
    if (r.result === 'break') UI.enhSelItem = null;
    UI.enhSelCharm = ''; // tılsım tükenir
    UI.renderAtolye(); UI.renderTop();
  }

  // ---- FRIENDS SYSTEM ----
  var friendsTab = 'list';
  function setFriendsTab(tab) {
    friendsTab = tab;
    $$('#friendsTabs .tab').forEach(function(t) { t.classList.toggle('on', t.dataset.ft === tab); });
    renderFriendsBody();
  }
  function openFriends() {
    friendsTab = 'list';
    UI.openMB('friendsModal');
    $$('#friendsTabs .tab').forEach(function(t) { t.classList.toggle('on', t.dataset.ft === 'list'); });
    renderFriendsBody();
  }
  function renderFriendsBody() {
    var body = $('#friendsBody');
    if (!body) return;
    body.innerHTML = '<div style="text-align:center;padding:20px;color:var(--textdim)">' + t('common.loading') + '</div>';
    if (friendsTab === 'list') renderFriendsList(body);
    else renderFriendRequests(body);
  }
  function renderFriendsList(body) {
    var tribeIcons = { kar: '❄️', orman: '🌲', col: '🏜️' };
    var tribeColors = { kar: '#7ac0d8', orman: '#5aaa3a', col: '#d8a040' };
    // zone name via t() — zone IDs are city_kar, t1_kar, t2_kar, t3_merkez etc.

    // Get friends + online status
    Promise.all([FB.getFriends(), FB.getOnlinePlayers()]).then(function(results) {
      var friends = results[0] || [];
      var onlinePlayers = results[1] || [];
      var onlineMap = {};
      for (var oi = 0; oi < onlinePlayers.length; oi++) {
        onlineMap[onlinePlayers[oi].uid] = onlinePlayers[oi];
      }

      if (!friends.length) {
        body.innerHTML = '<div style="text-align:center;padding:24px 0;color:var(--textdim)"><div style="font-size:28px;margin-bottom:8px">👥</div><div style="font-size:11px">' + t('friends.no_friends') + '</div></div>';
        return;
      }

      // Sort: online first
      friends.sort(function(a, b) {
        var aOn = onlineMap[a.uid] ? 1 : 0;
        var bOn = onlineMap[b.uid] ? 1 : 0;
        return bOn - aOn;
      });

      var html = '';
      for (var i = 0; i < friends.length; i++) {
        var f = friends[i];
        var online = onlineMap[f.uid];
        var statusDot = online ? '<span style="color:var(--safe);font-size:8px">● ' + t('friends.online') + '</span>' : '<span style="color:var(--textdim);font-size:8px">○ ' + t('friends.offline') + '</span>';
        var zoneText = online && online.zone ? t('zone.' + online.zone) : '';
        var tribeIcon = tribeIcons[f.city] || '⚔️';
        var tribeCol = tribeColors[f.city] || 'var(--textdim)';

        html += '<div class="friend-row">' +
          '<div class="friend-left">' +
            '<div class="friend-ico" style="color:' + tribeCol + '">' + tribeIcon + '</div>' +
            '<div class="friend-info">' +
              '<div class="friend-name">' + esc(f.name) + '</div>' +
              '<div class="friend-status">' + statusDot + (zoneText ? ' · <span style="font-size:8px;color:var(--gold)">' + zoneText + '</span>' : '') + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="friend-actions">' +
            (online ? '<button class="btn-xs" data-act="friendPM" data-uid="' + f.uid + '" data-name="' + esc(f.name) + '">💬</button>' : '') +
            '<button class="btn-xs danger" data-act="friendRemove" data-uid="' + f.uid + '">✕</button>' +
          '</div>' +
        '</div>';
      }
      body.innerHTML = html;
    }).catch(function() {
      body.innerHTML = '<div style="text-align:center;padding:20px;color:var(--danger)">' + t('common.error') + '</div>';
    });
  }
  function renderFriendRequests(body) {
    var tribeIcons = { kar: '❄️', orman: '🌲', col: '🏜️' };
    var tribeColors = { kar: '#7ac0d8', orman: '#5aaa3a', col: '#d8a040' };

    FB.getFriendRequests().then(function(reqs) {
      if (!reqs || !reqs.length) {
        body.innerHTML = '<div style="text-align:center;padding:24px 0;color:var(--textdim)"><div style="font-size:28px;margin-bottom:8px">📩</div><div style="font-size:11px">' + t('friends.no_requests') + '</div></div>';
        return;
      }
      // Update badge
      var badge = $('#friendReqBadge');
      if (badge) { badge.textContent = reqs.length; badge.style.display = ''; }

      var html = '';
      for (var i = 0; i < reqs.length; i++) {
        var r = reqs[i];
        var tribeIcon = tribeIcons[r.city] || '⚔️';
        var tribeCol = tribeColors[r.city] || 'var(--textdim)';
        html += '<div class="friend-row">' +
          '<div class="friend-left">' +
            '<div class="friend-ico" style="color:' + tribeCol + '">' + tribeIcon + '</div>' +
            '<div class="friend-info">' +
              '<div class="friend-name">' + esc(r.name) + '</div>' +
              '<div class="friend-status"><span style="font-size:8px;color:var(--textdim)">' + t('friends.sent_req') + '</span></div>' +
            '</div>' +
          '</div>' +
          '<div class="friend-actions">' +
            '<button class="btn-xs safe" data-act="friendAccept" data-uid="' + r.uid + '" data-name="' + esc(r.name) + '" data-city="' + r.city + '">✓</button>' +
            '<button class="btn-xs danger" data-act="friendReject" data-uid="' + r.uid + '">✕</button>' +
          '</div>' +
        '</div>';
      }
      body.innerHTML = html;
    }).catch(function() {
      body.innerHTML = '<div style="text-align:center;padding:20px;color:var(--danger)">' + t('common.error') + '</div>';
    });
  }
  function sendFriendReq(toUid, toName) {
    var P = S.get();
    if (!P) return;
    FB.sendFriendRequest(toUid, P.name, P.city).then(function() {
      UI.toast('👋 ' + t('friends.req_sent'));
    }).catch(function() {
      UI.toast('❌ ' + t('common.error'));
    });
  }
  function acceptFriend(fromUid, fromName, fromCity) {
    var P = S.get();
    if (!P) return;
    FB.acceptFriendRequest(fromUid, fromName, fromCity, P.name, P.city).then(function() {
      UI.toast('✅ ' + t('friends.req_accepted'));
      renderFriendsBody();
    }).catch(function() {
      UI.toast('❌ ' + t('common.error'));
    });
  }
  function rejectFriend(fromUid) {
    FB.rejectFriendRequest(fromUid).then(function() {
      UI.toast(t('friends.rejected'));
      renderFriendsBody();
    });
  }
  function removeFriend(friendUid) {
    if (!confirm(t('friends.remove_confirm'))) return;
    FB.removeFriend(friendUid).then(function() {
      UI.toast(t('friends.removed'));
      renderFriendsBody();
    });
  }
  function startPM(toUid, toName) {
    // Chat'i özel kanalına geçir ve mesaj gönderme alanına odaklan
    UI.closeMB('friendsModal');
    // Kişiye PM gönder — chat'i aç, özel kanalına geç
    CHAT.setChannel('ozel');
    CHAT.setExpanded(true);
    var bar = $('#chatBar');
    if (bar) bar.classList.add('expanded');
    renderChatMessages();
    // PM target ayarla
    CHAT._pmTarget = { uid: toUid, name: toName };
    var chatIn = $('#chatInput');
    if (chatIn) {
      chatIn.placeholder = t('chat.pm_to', { name: toName });
      chatIn.focus();
    }
    var lbl = document.getElementById('chatChLabel');
    if (lbl) lbl.textContent = t('chat.private') + ' → ' + toName;
    UI.toast('💬 ' + t('chat.pm_started', { name: toName }));
  }

  // ---- Gather/Dungeon PvP (kavim savaşı) ----
  function doGatherPvp(name, tribe, enemyCP, el) {
    var P = S.get();
    if (!P) return;
    if (P.city === tribe) { UI.toast('❌ ' + t('pvp.own_tribe')); return; }
    var tribeIcons = { kar: '❄️', orman: '🌲', col: '🏜️' };
    // Disable button during fight
    if (el) { el.style.pointerEvents = 'none'; el.style.opacity = '0.5'; }
    // 10 saniye savaş geri sayımı
    var fightDur = 10;
    var elapsed = 0;
    UI.toast('⚔️ ' + t('pvp.fight_start', { name: name, time: fightDur }));
    // Show a mini fight bar
    var chipEl = el;
    var origHTML = chipEl ? chipEl.innerHTML : '';
    function updateFightUI() {
      if (!chipEl) return;
      var pct = Math.min(100, elapsed / fightDur * 100);
      chipEl.innerHTML = '⚔️ ' + t('pvp.fighting') + ' ' + (fightDur - elapsed) + 's <div style="height:3px;background:#333;border-radius:2px;margin-top:2px"><div style="width:' + pct + '%;height:100%;background:var(--gold);border-radius:2px;transition:width .3s"></div></div>';
    }
    updateFightUI();
    var fightInt = setInterval(function() {
      elapsed++;
      updateFightUI();
      if (elapsed >= fightDur) {
        clearInterval(fightInt);
        // Sonuç
        var ctx = { target: 'pvp' };
        var result = E.resolveCombat(P.equipped, enemyCP, ctx);
        if (result.win) {
          // Kazandı — küçük ödül
          var goldReward = 100 + Math.floor(Math.random() * 400);
          P.gold += goldReward;
          P.stats.kills++;
          UI.toast('✅ ' + t('pvp.won') + ' +' + UI.fmt(goldReward) + ' 💰');
          // %20 şansla stone3 düşer
          if (Math.random() < 0.2) {
            P.misc.stone3 = (P.misc.stone3 || 0) + 1;
            UI.toast('💎 +1 ' + t('misc.stone3'));
          }
        } else {
          // Kaybetti
          P.stats.deaths++;
          UI.toast('💀 ' + t('pvp.lost'));
        }
        // Düşmanı yenile (ölü göster)
        if (chipEl) {
          if (result.win) {
            chipEl.innerHTML = '💀 ' + name + ' <span style="font-size:8px;color:var(--danger)">' + t('pvp.defeated') + '</span>';
            chipEl.style.opacity = '0.3';
          } else {
            chipEl.innerHTML = origHTML;
            chipEl.style.opacity = '1';
            chipEl.style.pointerEvents = '';
          }
        }
        UI.renderTop();
      }
    }, 1000);
  }

  // ---- SETTINGS ----
  function openSettings() {
    var curLang = SKY.LANG.getLang();
    var body = '<div style="padding:4px 0">';
    // Dil seçimi
    body += '<div class="kv" style="margin-bottom:12px"><span class="k">' + t('settings.language') + '</span></div>';
    body += '<div style="display:flex;gap:8px;margin-bottom:16px">';
    body += '<div data-act="setlang" data-lang="tr" style="flex:1;text-align:center;padding:12px 8px;border-radius:8px;cursor:pointer;border:2px solid ' + (curLang === 'tr' ? 'var(--gold)' : 'var(--border)') + ';' + (curLang === 'tr' ? 'background:rgba(200,160,48,.12)' : 'background:rgba(0,0,0,.25)') + '">';
    body += '<div style="font-size:24px;margin-bottom:4px">🇹🇷</div>';
    body += '<div style="font-size:11px;font-weight:700;color:' + (curLang === 'tr' ? 'var(--goldlit)' : 'var(--textdim)') + '">Türkçe</div>';
    body += '</div>';
    body += '<div data-act="setlang" data-lang="en" style="flex:1;text-align:center;padding:12px 8px;border-radius:8px;cursor:pointer;border:2px solid ' + (curLang === 'en' ? 'var(--gold)' : 'var(--border)') + ';' + (curLang === 'en' ? 'background:rgba(200,160,48,.12)' : 'background:rgba(0,0,0,.25)') + '">';
    body += '<div style="font-size:24px;margin-bottom:4px">🇬🇧</div>';
    body += '<div style="font-size:11px;font-weight:700;color:' + (curLang === 'en' ? 'var(--goldlit)' : 'var(--textdim)') + '">English</div>';
    body += '</div>';
    body += '</div>';
    // Diğer ayarlar buraya eklenebilir
    body += '<div class="muted small" style="text-align:center;margin-top:8px">SKYZONE v0.7.860</div>';
    body += '</div>';
    UI.openSheet(t('settings.title'), '', body);
  }

  function charInfo() {
    const P = S.get();
    var tribeIcons = { kar: '❄️', orman: '🌲', col: '🏜️' };
    var tribeColors = { kar: '#7ac0d8', orman: '#5aaa3a', col: '#d8a040' };
    var premTxt = S.isPremium() ? '<span style="color:var(--gold)">★ ' + t('charinfo.active') + '</span> (' + Math.ceil(S.premiumTimeLeft() / 86400000) + ' ' + t('charinfo.days') + ')' : '<span style="color:var(--textdim)">' + t('charinfo.none') + '</span>';
    UI.openSheet('🧙 ' + UI.esc(P.name), D.CITIES[P.city].name, `
      <div class="kv"><span class="k">${t('charinfo.tribe')}</span><span class="vv" style="color:${tribeColors[P.city] || 'var(--textlit)'};font-weight:700">${tribeIcons[P.city] || '⚔️'} ${t('tribe.' + P.city)}</span></div>
      <div class="kv"><span class="k">${t('charinfo.city')}</span><span class="vv">${D.CITIES[P.city].icon} ${D.CITIES[P.city].name}</span></div>
      <div class="kv"><span class="k">Premium</span><span class="vv">${premTxt}</span></div>
      <div class="kv"><span class="k">${t('dg.gold')}</span><span class="vv">${UI.fmt(P.gold)} 💰</span></div>
      <div class="kv"><span class="k">${t('charinfo.total_cp')}</span><span class="vv">${UI.fmt(E.baseCP(P.equipped))} ⚡</span></div>
      <div class="kv"><span class="k">${t('stat.carry')}</span><span class="vv">${UI.fmt(S.carryUsed())}/${UI.fmt(S.carryCap())} kg</span></div>
      <div class="divider"></div>
      <div class="kv"><span class="k">Kill / Boss</span><span class="vv">${UI.fmt(P.stats.kills)} / ${UI.fmt(P.stats.bossKills)}</span></div>
      <div class="kv"><span class="k">${t('charinfo.gathered')}</span><span class="vv">${UI.fmt(P.stats.gathered)}</span></div>
      <div class="kv"><span class="k">Craft / ${t('charinfo.deaths')}</span><span class="vv">${UI.fmt(P.stats.crafted)} / ${UI.fmt(P.stats.deaths)}</span></div>`);
  }

  // dungeon entrance click
  document.addEventListener('click', e => { if (e.target.closest('#dungeonEntrance') && !dragMoved) { UI.closeAllModals(); UI.openDungeon(); } });

  // ============ MARKET TICK (NPC buyers) ============
  function marketTick() {
    const P = S.get();
    if (!P.marketListings || !P.marketListings.length) return;
    for (var i = P.marketListings.length - 1; i >= 0; i--) {
      var listing = P.marketListings[i];
      var elapsed = (Date.now() - listing.listedAt) / 1000 / 60; // minutes
      // chance increases over time: base 0.5% per tick, +0.1% per minute
      var chance = 0.5 + elapsed * 0.1;
      if (Math.random() * 100 < chance) {
        // SOLD!
        var tax = Math.round(listing.price * D.MARKET_TAX);
        var net = listing.price - tax;
        P.gold += net;
        var buyers = [t('market.buyer1'),t('market.buyer2'),t('market.buyer3'),t('market.buyer4'),t('market.buyer5')];
        var buyer = buyers[Math.floor(Math.random() * buyers.length)];
        P.mailbox.push({
          id: 'mail_' + Date.now() + '_' + i,
          type: 'sale',
          msg: t('market.sold_mail', { buyer: buyer, item: listing.itemName || 'item', price: listing.price }),
          gold: net,
          timestamp: Date.now(),
          read: false,
        });
        P.marketListings.splice(i, 1);
        UI.toast('💰 ' + (listing.itemName || 'Item') + ' ' + t('market.sold') + '! +' + UI.fmt(net));
      }
    }
  }

  // ============ WAR SIMULATION ============
  function initWarState() {
    const ws = {
      stones: D.WAR.stones.map(s => ({
        id: s.id, city: s.city, tier: s.tier, name: s.name, golden: !!s.golden,
        owner: s.city || null, // city stones start with their city, golden starts null
        hp: D.WAR.stoneHP,
        cooldown: 0,
      })),
      active: false,
      lastTick: Date.now(),
      nextWarTime: calcNextWarTime(),
      log: ['Savas sistemi baslatildi.'],
      warEndTime: 0,
    };
    // golden stone: random owner
    const golden = ws.stones.find(s => s.golden);
    if (golden) golden.owner = E.pick(['kar', 'orman', 'col']);
    window.SKY_WAR_STATE = ws;
  }

  function calcNextWarTime() {
    const now = new Date();
    // find next Wed(3) or Sat(6) at 20:00
    for (let d = 0; d < 14; d++) {
      const t = new Date(now.getTime() + d * 86400000);
      t.setHours(20, 0, 0, 0);
      if (t <= now) continue;
      const day = t.getDay();
      if (day === 3 || day === 6) return t.getTime();
    }
    return now.getTime() + 86400000;
  }

  function warTick() {
    const ws = window.SKY_WAR_STATE;
    if (!ws) return;
    const now = Date.now();

    // check if war should start
    if (!ws.active && now >= ws.nextWarTime) {
      ws.active = true;
      ws.warEndTime = now + D.WAR.warDuration * 1000;
      ws.log.push('⚔️ SAVAS BASLADI!');
    }
    // check if war should end
    if (ws.active && now >= ws.warEndTime) {
      ws.active = false;
      ws.nextWarTime = calcNextWarTime();
      ws.log.push('🏳️ Savas sona erdi.');
    }

    // simulate war ticks
    if (ws.active) {
      const dt = (now - ws.lastTick) / 1000;
      if (dt >= D.WAR.tickInterval) {
        ws.lastTick = now;
        simulateWarTick(ws);
      }
    } else {
      // regen stones during peace
      for (const s of ws.stones) {
        if (s.hp < D.WAR.stoneHP && s.cooldown <= 0) {
          s.hp = Math.min(D.WAR.stoneHP, s.hp + Math.round(D.WAR.regenPerMin / 6)); // approx per 10s
        }
        if (s.cooldown > 0) s.cooldown = Math.max(0, s.cooldown - 10);
      }
      ws.lastTick = now;
    }
  }

  function simulateWarTick(ws) {
    const cities = ['kar', 'orman', 'col'];
    // each stone can be attacked by a bot city
    for (const s of ws.stones) {
      if (s.cooldown > 0) { s.cooldown -= D.WAR.tickInterval; continue; }

      // pick a random attacker city (not the owner)
      const potentialAttackers = cities.filter(c => c !== s.owner);
      if (!potentialAttackers.length) continue;

      // 40% chance a stone gets attacked each tick
      if (E.rnd() > 0.4) {
        // no attack this tick - regen
        s.hp = Math.min(D.WAR.stoneHP, s.hp + Math.round(D.WAR.regenPerMin / 6));
        continue;
      }

      const attacker = E.pick(potentialAttackers);
      const attackCP = E.simBotCP(s.tier === 'city' ? 'city' : s.tier);
      const defenseCP = E.simBotCP(s.tier === 'city' ? 'city' : s.tier);

      // player contribution: if player's city is attacker or defender
      const P = S.get();
      let playerBonus = 0;
      if (P.city === attacker || P.city === s.owner) {
        playerBonus = Math.round(E.baseCP(P.equipped) * 0.1); // 10% of player CP as contribution
      }

      const netDmg = (attackCP + (P.city === attacker ? playerBonus : 0))
                    - (defenseCP + (P.city === s.owner ? playerBonus : 0));

      if (netDmg > 0) {
        s.hp -= netDmg;
        if (s.hp <= 0) {
          s.hp = 0;
          const oldOwner = s.owner;
          s.owner = attacker;
          s.cooldown = D.WAR.cooldownAfterCapture;
          s.hp = D.WAR.stoneHP;
          const msg = (D.CITIES[attacker] ? D.CITIES[attacker].icon : '') + ' ' + attacker + ' ' + s.name + ' ele gecirdi!';
          ws.log.push(msg);
          if (ws.log.length > 20) ws.log.shift();
        }
      }
    }
  }

  // ============ CHAT SYSTEM ============
  function toggleChat() {
    CHAT.toggleExpand();
    var bar = $('#chatBar');
    if (!bar) return;
    if (CHAT.isExpanded()) {
      bar.classList.add('expanded');
      renderChatMessages();
      var box = $('#chatMessages');
      if (box) box.scrollTop = box.scrollHeight;
    } else {
      bar.classList.remove('expanded');
    }
  }
  function sendChat() {
    var input = $('#chatInput');
    if (!input) return;
    var txt = (input.value || '').trim();
    if (!txt) return;
    var ch = CHAT.getChannel();
    if (ch === 'sistem') { UI.toast(t('chat.no_system')); return; }
    CHAT.sendMsg(ch, txt);
    input.value = '';
    renderChatMessages();
    renderChatPreview();
    var box = $('#chatMessages');
    if (box) box.scrollTop = box.scrollHeight;
  }
  function switchChatTab(ch) {
    CHAT.setChannel(ch);
    renderChatMessages();
    renderChatPreview();
    var box = $('#chatMessages');
    if (box) box.scrollTop = box.scrollHeight;
    var labels = { kavim: t('chat.tribe'), dunya: t('chat.global'), ozel: t('chat.private'), sistem: t('chat.system') };
    var lbl = document.getElementById('chatChLabel');
    if (lbl) lbl.textContent = labels[ch] || ch;
    var sel = document.getElementById('chatChSelect');
    if (sel && sel.value !== ch) sel.value = ch;
  }
  function renderChatPreview() {
    var el = $('#chatPreviewLines');
    if (!el) return;
    var lines = CHAT.getPreviewLines();
    if (!lines.length) { el.innerHTML = '<div class="chat-line" style="color:var(--muted);font-style:italic">' + t('chat.no_messages') + '</div>'; return; }
    var html = '';
    var ch = CHAT.getChannel();
    for (var i = 0; i < lines.length; i++) {
      var m = lines[i];
      html += '<div class="chat-line"><span class="chat-name ' + ch + '">' + esc(m.sender) + ':</span>' + esc(m.text) + '</div>';
    }
    el.innerHTML = html;
  }
  function renderChatMessages() {
    var el = $('#chatMessages');
    if (!el) return;
    var msgs = CHAT.getMessages();
    var ch = CHAT.getChannel();
    if (!msgs.length) { el.innerHTML = '<div style="text-align:center;color:var(--muted);font-style:italic;padding:20px">' + t('chat.no_messages') + '</div>'; return; }
    var html = '';
    for (var i = 0; i < msgs.length; i++) {
      var m = msgs[i];
      html += '<div class="chat-msg"><span class="chat-time">' + m.time + '</span><span class="chat-sender ' + ch + '">' + esc(m.sender) + '</span><span class="chat-text">' + esc(m.text) + '</span></div>';
    }
    el.innerHTML = html;
  }

  window.addEventListener('DOMContentLoaded', boot);
})();
