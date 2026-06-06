/* ============================================================
   SKYZONE · EVENTS — Kavim Savaşı (PvP) & PvE Etkinlikler
   ============================================================ */
window.SKY = window.SKY || {};

SKY.EVT = (function () {
  const D = SKY.D, E = SKY.E, S = SKY.S;
  const $ = (s, r) => (r || document).querySelector(s);
  const rnd = () => Math.random();
  const rint = (a, b) => Math.floor(rnd() * (b - a + 1)) + a;
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

  // ---- Config ----
  const PVP_DURATION = 10 * 60; // 10 dk (saniye)
  const FIGHT_DURATION = 10;    // 10 sn savaş
  const RESPAWN_TIME = 10;      // 10 sn doğma
  const ENEMY_COUNT = 8;        // Her düşman kavimden 8 bot

  // ---- Tribe data ----
  const TRIBES = {
    kar:   { get name() { return SKY.LANG.t('evt.tribe_kar'); },   icon: '❄️', color: '#7ac0d8' },
    orman: { get name() { return SKY.LANG.t('evt.tribe_orman'); }, icon: '🌲', color: '#5aaa3a' },
    col:   { get name() { return SKY.LANG.t('evt.tribe_col'); },   icon: '🏜️', color: '#d8a040' },
  };

  // Bot isimleri
  var _BOT_NAME_KEYS = {
    kar: ['evtbot.kar_1','evtbot.kar_2','evtbot.kar_3','evtbot.kar_4','evtbot.kar_5','evtbot.kar_6','evtbot.kar_7','evtbot.kar_8','evtbot.kar_9','evtbot.kar_10'],
    orman: ['evtbot.orman_1','evtbot.orman_2','evtbot.orman_3','evtbot.orman_4','evtbot.orman_5','evtbot.orman_6','evtbot.orman_7','evtbot.orman_8','evtbot.orman_9','evtbot.orman_10'],
    col: ['evtbot.col_1','evtbot.col_2','evtbot.col_3','evtbot.col_4','evtbot.col_5','evtbot.col_6','evtbot.col_7','evtbot.col_8','evtbot.col_9','evtbot.col_10'],
  };

  // ---- State ----
  let active = false;        // etkinlik aktif mi
  let joined = false;        // oyuncu katıldı mı
  let startTime = 0;         // etkinlik başlangıç zamanı
  let kills = { kar: 0, orman: 0, col: 0 };
  let enemies = [];          // bot düşmanlar
  let fighting = null;       // şu an savaştığı düşman
  let fightTimer = 0;        // savaş geri sayım
  let playerDead = false;    // oyuncu öldü mü
  let respawnTimer = 0;      // doğma geri sayım
  let combatLog = [];        // savaş logları
  let tickInterval = null;
  let ended = false;         // etkinlik bitti mi (ödül verildi)

  // Kavim Savaşı Sandığı içeriği
  function giveChestReward() {
    var P = S.get();
    if (!P) return;
    // 3x stone15 kesin
    P.misc.stone15 = (P.misc.stone15 || 0) + 3;
    // 1x charm_drop kesin
    P.misc.charm_drop = (P.misc.charm_drop || 0) + 1;
    // %10 charm_break
    if (rnd() < 0.10) {
      P.misc.charm_break = (P.misc.charm_break || 0) + 1;
    }
    S.set(P);
  }

  // ---- Etkinlik zamanlama ----
  function isEventTime() {
    var now = new Date();
    var min = now.getMinutes();
    return min < 10; // Her saatin ilk 10 dakikası
  }

  function getEventRemaining() {
    var now = new Date();
    var min = now.getMinutes();
    var sec = now.getSeconds();
    if (min >= 10) return 0;
    return (10 - min) * 60 - sec;
  }

  function getNextEventIn() {
    var now = new Date();
    var min = now.getMinutes();
    var sec = now.getSeconds();
    if (min < 10) return 0; // zaten aktif
    return (60 - min) * 60 - sec;
  }

  // ---- Bot oluştur ----
  function generateEnemies() {
    var P = S.get();
    var myCity = P ? P.city : 'kar';
    var myCP = P ? E.baseCP(P.equipped) : 100;
    enemies = [];
    var otherTribes = Object.keys(TRIBES).filter(function(t) { return t !== myCity; });

    for (var ti = 0; ti < otherTribes.length; ti++) {
      var tribe = otherTribes[ti];
      for (var bi = 0; bi < ENEMY_COUNT; bi++) {
        var cpVar = myCP * (0.6 + rnd() * 0.8); // %60-%140 arası CP
        enemies.push({
          id: tribe + '_' + bi,
          tribe: tribe,
          name: SKY.LANG.t(_BOT_NAME_KEYS[tribe][bi % _BOT_NAME_KEYS[tribe].length]),
          cp: Math.round(cpVar),
          alive: true,
          respawnAt: 0,
          fighting: false,
        });
      }
    }
  }

  // ---- Savaş ----
  function attackEnemy(enemyId) {
    if (playerDead || fighting) return;
    var enemy = enemies.find(function(e) { return e.id === enemyId; });
    if (!enemy || !enemy.alive || enemy.fighting) return;

    fighting = enemy;
    enemy.fighting = true;
    fightTimer = FIGHT_DURATION;
    addLog('⚔️ ' + enemy.name + ' ' + SKY.LANG.t('evt.fight_start'), 'info');
    renderBattle();
  }

  function resolveFight() {
    if (!fighting) return;
    var P = S.get();
    if (!P) return;
    var ctx = { target: 'pvp' };
    var result = E.resolveCombat(P.equipped, fighting.cp, ctx);

    if (result.win) {
      // Oyuncu kazandı
      var myCity = P.city;
      kills[myCity] = (kills[myCity] || 0) + 1;
      fighting.alive = false;
      fighting.fighting = false;
      fighting.respawnAt = Date.now() + RESPAWN_TIME * 1000;
      addLog('✅ ' + fighting.name + ' ' + SKY.LANG.t('evt.enemy_defeated'), 'win');
      // Bot killeri de artır (simülasyon)
      simulateBotKills();
    } else {
      // Oyuncu kaybetti
      fighting.fighting = false;
      playerDead = true;
      respawnTimer = RESPAWN_TIME;
      addLog('💀 ' + fighting.name + ' ' + SKY.LANG.t('evt.player_died') + ' ' + RESPAWN_TIME + SKY.LANG.t('evt.sec') + ' ' + SKY.LANG.t('evt.wait_sec'), 'lose');
    }
    fighting = null;
    renderBattle();
  }

  function simulateBotKills() {
    // Diğer kavimler arasında rastgele kill simülasyonu
    var P = S.get();
    var tribes = Object.keys(TRIBES);
    for (var i = 0; i < tribes.length; i++) {
      if (tribes[i] === (P ? P.city : '')) continue;
      if (rnd() < 0.35) { // %35 şansla diğer kavimler de kill alır
        kills[tribes[i]] = (kills[tribes[i]] || 0) + 1;
      }
    }
  }

  function addLog(msg, cls) {
    combatLog.unshift({ msg: msg, cls: cls || '' });
    if (combatLog.length > 20) combatLog.length = 20;
  }

  // ---- Tick (her saniye) ----
  function tick() {
    // Etkinlik zamanı kontrolü
    if (!isEventTime()) {
      if (active) endEvent();
      hideIcon();
      return;
    }

    if (!active) {
      startEvent();
    }

    showIcon();
    updateIconTimer();

    if (!joined) return;

    // Savaş geri sayım
    if (fighting && fightTimer > 0) {
      fightTimer--;
      if (fightTimer <= 0) {
        resolveFight();
      }
    }

    // Doğma geri sayım
    if (playerDead && respawnTimer > 0) {
      respawnTimer--;
      if (respawnTimer <= 0) {
        playerDead = false;
        addLog(SKY.LANG.t('evt.respawn'), 'info');
      }
    }

    // Bot respawn
    var now = Date.now();
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (!e.alive && e.respawnAt && now >= e.respawnAt) {
        e.alive = true;
        e.respawnAt = 0;
      }
    }

    // Arka plan bot savaşları (simülasyon)
    if (rnd() < 0.08) simulateBotKills();

    // Etkinlik bitti mi?
    var rem = getEventRemaining();
    if (rem <= 0 && !ended) {
      endEvent();
    }

    renderBattle();
  }

  function startEvent() {
    active = true;
    joined = false;
    ended = false;
    startTime = Date.now();
    kills = { kar: 0, orman: 0, col: 0 };
    enemies = [];
    fighting = null;
    playerDead = false;
    respawnTimer = 0;
    combatLog = [];
  }

  function endEvent() {
    if (ended) return;
    ended = true;
    active = false;

    if (!joined) return;

    // Kazananı bul
    var P = S.get();
    var myCity = P ? P.city : 'kar';
    var maxKill = 0;
    var winner = '';
    for (var t in kills) {
      if (kills[t] > maxKill) { maxKill = kills[t]; winner = t; }
    }

    if (winner === myCity && maxKill > 0) {
      giveChestReward();
      addLog('🏆 ' + SKY.LANG.t('evt.tribe_won'), 'win');
      if (SKY.UI) SKY.UI.toast(SKY.LANG.t('evt.tribe_won_toast'));
    } else if (maxKill > 0) {
      addLog('💔 ' + SKY.LANG.t('evt.tribe_lost') + ' ' + TRIBES[winner].icon + ' ' + TRIBES[winner].name + ' ' + SKY.LANG.t('evt.tribe_lost_suffix'), 'lose');
      if (SKY.UI) SKY.UI.toast(SKY.LANG.t('evt.tribe_lost_toast') + ' ' + TRIBES[winner].name + ' ' + SKY.LANG.t('evt.tribe_lost_suffix'));
    }

    fighting = null;
    renderBattle();
  }

  // ---- UI ----
  function showIcon() {
    var icon = $('#evtPvpIcon');
    if (icon) icon.style.display = 'flex';
  }

  function hideIcon() {
    var icon = $('#evtPvpIcon');
    if (icon) icon.style.display = 'none';
  }

  function updateIconTimer() {
    var rem = getEventRemaining();
    var el = $('#evtPvpTimer');
    if (el) {
      var m = Math.floor(rem / 60);
      var s = rem % 60;
      el.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }
    // Info modal countdown too
    var cd = $('#evtInfoCountdown');
    if (cd) {
      var m2 = Math.floor(rem / 60);
      var s2 = rem % 60;
      cd.textContent = String(m2).padStart(2, '0') + ':' + String(s2).padStart(2, '0');
    }
  }

  function showInfo() {
    if (!active && !isEventTime()) {
      // Etkinlik aktif değil
      if (SKY.UI) SKY.UI.toast(SKY.LANG.t('evt.not_active'));
      return;
    }
    SKY.UI.openMB('evtInfoModal');
  }

  function joinBattle() {
    if (!active && !isEventTime()) {
      if (SKY.UI) SKY.UI.toast(SKY.LANG.t('evt.expired'));
      return;
    }
    if (!active) startEvent();
    joined = true;
    generateEnemies();
    combatLog = [];
    addLog(SKY.LANG.t('evt.joined'), 'info');
    SKY.UI.closeMB('evtInfoModal');
    SKY.UI.openMB('evtPvpModal');
    renderBattle();
  }

  function renderBattle() {
    if (!joined) return;
    var P = S.get();
    var myCity = P ? P.city : 'kar';

    // Countdown
    var rem = getEventRemaining();
    var cdEl = $('#evtPvpCD');
    if (cdEl) {
      var m = Math.floor(rem / 60);
      var s = rem % 60;
      cdEl.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }

    // Scoreboard
    for (var t in kills) {
      var kEl = $('#evtKill' + t.charAt(0).toUpperCase() + t.slice(1));
      if (kEl) kEl.textContent = kills[t];
    }
    // Highlight own tribe
    var tribes = document.querySelectorAll('.evt-score-tribe');
    for (var si = 0; si < tribes.length; si++) {
      var st = tribes[si].getAttribute('data-tribe');
      tribes[si].classList.toggle('mine', st === myCity);
    }

    // Player status
    var statusEl = $('#evtPlayerStatus');
    var animEl = $('#evtFightAnim');
    if (fighting) {
      statusEl.style.display = 'block';
      animEl.innerHTML = '<div style="font-size:20px;margin-bottom:4px">⚔️</div>' +
        '<div style="color:var(--textlit);font-weight:700">' + P.name + ' vs ' + fighting.name + '</div>' +
        '<div style="font-family:JetBrains Mono;font-size:11px;color:var(--gold);margin-top:4px">' + SKY.LANG.t('evt.fight_label') + ': ' + fightTimer + ' ' + SKY.LANG.t('evt.sec') + '</div>' +
        '<div class="evt-fight-bar"><div class="evt-fight-fill" style="width:' + ((FIGHT_DURATION - fightTimer) / FIGHT_DURATION * 100) + '%"></div></div>';
    } else if (playerDead) {
      statusEl.style.display = 'block';
      animEl.innerHTML = '<div style="font-size:20px;margin-bottom:4px">💀</div>' +
        '<div style="color:var(--danger);font-weight:700">' + SKY.LANG.t('evt.defeated') + '</div>' +
        '<div style="font-family:JetBrains Mono;font-size:11px;color:var(--textdim);margin-top:4px">' + SKY.LANG.t('evt.respawn_label') + ': ' + respawnTimer + ' ' + SKY.LANG.t('evt.sec') + '</div>';
    } else {
      statusEl.style.display = 'none';
    }

    // Enemy list
    var listEl = $('#evtEnemyList');
    if (listEl) {
      var html = '';
      for (var i = 0; i < enemies.length; i++) {
        var en = enemies[i];
        var tribeDat = TRIBES[en.tribe];
        var rowCls = 'evt-enemy-row';
        var statusTxt = '';
        if (!en.alive) {
          rowCls += ' dead';
          var respawnLeft = Math.max(0, Math.ceil((en.respawnAt - Date.now()) / 1000));
          statusTxt = '💀 ' + respawnLeft + 's';
        } else if (en.fighting) {
          rowCls += ' fighting';
          statusTxt = SKY.LANG.t('evt.in_combat');
        } else {
          statusTxt = '<button class="evt-enemy-btn" data-act="evtattack" data-eid="' + en.id + '">' + SKY.LANG.t('evt.attack_btn') + '</button>';
        }

        html += '<div class="' + rowCls + '" data-eid="' + en.id + '">' +
          '<div class="evt-enemy-tribe" style="color:' + tribeDat.color + '">' + tribeDat.icon + '</div>' +
          '<div class="evt-enemy-name">' + en.name + '</div>' +
          '<div class="evt-enemy-cp">⚡ ' + en.cp.toLocaleString(SKY.LANG.getLang() === 'en' ? 'en-US' : 'tr-TR') + '</div>' +
          '<div class="evt-enemy-status">' + statusTxt + '</div>' +
          '</div>';
      }
      listEl.innerHTML = html;
    }

    // Log
    var logEl = $('#evtLog');
    if (logEl) {
      var lh = '';
      for (var li = 0; li < combatLog.length; li++) {
        lh += '<div class="evt-log-line evt-log-' + combatLog[li].cls + '">' + combatLog[li].msg + '</div>';
      }
      logEl.innerHTML = lh;
    }
  }

  // ---- Init ----
  function init() {
    if (tickInterval) clearInterval(tickInterval);
    tickInterval = setInterval(tick, 1000);
    // İlk kontrol
    tick();
  }

  function handleAction(act, el) {
    switch (act) {
      case 'evtpvpinfo': showInfo(); break;
      case 'evtpvpjoin': joinBattle(); break;
      case 'evtattack':
        var eid = el.getAttribute('data-eid');
        if (eid) attackEnemy(eid);
        break;
    }
  }

  return {
    init: init,
    handleAction: handleAction,
    isActive: function() { return active && isEventTime(); },
    isJoined: function() { return joined; },
    tick: tick,
  };
})();
