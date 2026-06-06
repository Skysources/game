/* ============================================================
   SKYZONE · WORLD & GATHERING (Shared via Firebase)
   Zone navigasyonu, paylaşımlı node spawn, harvest.
   ============================================================ */
window.SKY = window.SKY || {};

SKY.W = (function () {
  const D = SKY.D, E = SKY.E, S = SKY.S;

  let nodes = [];        // aktif node listesi (mevcut zone)
  let currentZoneId = null;
  let gathering = null;  // {nodeId, progress} aktif harvest
  let _initialLoadDone = false;
  var MAX_NODES = 15;    // max node per zone — prevents runaway spawning

  function zone(id) { return D.ZONES.find(z => z.id === id); }
  function curZone() { return zone(S.get().zone); }

  // ---- Grid pozisyon sistemi (node placement) ----
  const GRID_POS = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      GRID_POS.push({ x: 8 + col * 18 + (row % 2) * 9, y: 8 + row * 16 });
    }
  }
  let usedPos = new Set();
  var EXCLUSION_ZONES = [
    { x: 48, y: 31, r: 15 },
    { x: 85, y: 20, r: 12 },
    { x: 15, y: 80, r: 12 },
    { x: 50, y: 50, r: 15 },
  ];
  function isExcluded(x, y) {
    for (var ei = 0; ei < EXCLUSION_ZONES.length; ei++) {
      var ez = EXCLUSION_ZONES[ei];
      var dx = x - ez.x, dy = y - ez.y;
      if (Math.sqrt(dx*dx + dy*dy) < ez.r) return true;
    }
    return false;
  }
  var MIN_NODE_DIST = 12; // minimum % distance between nodes to prevent overlap
  function tooCloseToExisting(x, y) {
    for (var i = 0; i < nodes.length; i++) {
      var dx = x - nodes[i].x, dy = y - nodes[i].y;
      if (Math.sqrt(dx*dx + dy*dy) < MIN_NODE_DIST) return true;
    }
    return false;
  }
  function getUniquePos() {
    var available = GRID_POS.filter(function(p, i) { return !usedPos.has(i) && !isExcluded(p.x, p.y) && !tooCloseToExisting(p.x, p.y); });
    if (available.length) {
      var idx = GRID_POS.indexOf(available[Math.floor(Math.random() * available.length)]);
      usedPos.add(idx);
      var p = GRID_POS[idx];
      return { x: p.x + (Math.random() - 0.5) * 2, y: p.y + (Math.random() - 0.5) * 2 };
    }
    for (var tries = 0; tries < 30; tries++) {
      var rx = 5 + Math.random() * 85, ry = 8 + Math.random() * 75;
      if (!isExcluded(rx, ry) && !tooCloseToExisting(rx, ry)) return { x: rx, y: ry };
    }
    return { x: 8 + Math.random() * 30, y: 10 + Math.random() * 30 };
  }

  function pickFamily(dist) {
    const fams = Object.keys(dist);
    const total = fams.reduce((a, f) => a + dist[f], 0);
    let r = Math.random() * total;
    for (const f of fams) { if (r < dist[f]) return f; r -= dist[f]; }
    return fams[0];
  }

  // Node üret (zone bilgilerine göre)
  function spawnNode(z) {
    if (z.kind !== 'field') return null;
    const tierDist = D.MAP_NODE_TIER[z.map];
    const tierRoll = E.rollCascade(tierDist) + 1;
    let r = Math.random(), size = D.NODE_SIZES[0];
    let acc = 0;
    for (const s of D.NODE_SIZES) { acc += s.prob; if (r < acc) { size = s; break; } }
    const baseColorIdx = [
      [66, 14, 13, 7, 0],
      [60, 15, 14, 9, 2],
      [48, 17, 19, 11, 5],
    ][tierRoll - 1];
    const colorIdx = E.rollCascade(baseColorIdx);
    const colorK = ['W', 'G', 'B', 'O', 'R'][colorIdx];
    const dist = D.BIOME_DIST[z.biome];
    const fam = pickFamily(dist);
    const pos = getUniquePos();
    return {
      id: E.uid(), tier: tierRoll, color: colorK, colorIdx,
      family: fam, size: size.name,
      total: size.items, remaining: size.items,
      art: fam + '-' + tierRoll,
      x: pos.x, y: pos.y,
      born: Date.now(), life: size.life,
    };
  }

  // ---- Zone'a giriş (Firebase paylaşımlı) ----
  function enterZone(id) {
    stopReplenish();
    currentZoneId = id;
    S.get().zone = id;
    gathering = null;
    nodes = [];
    usedPos = new Set();
    _initialLoadDone = false;

    var FB = SKY.FB;
    var z = zone(id);
    if (!z || z.kind !== 'field') {
      FB.stopListenZone();
      _initialLoadDone = true;
      return;
    }

    // Firebase'den zone node'larını yükle
    FB.loadZoneNodes(id).then(function(fbNodes) {
      if (currentZoneId !== id) return; // zone değişti

      if (fbNodes && fbNodes.length > 0) {
        // Firebase'de node'lar var — aynen kullan, HİÇBİR ŞEYİ DEĞİŞTİRME
        nodes = fbNodes;
        rebuildUsedPos();
      } else {
        // Firebase'de node yok — ilk defa oluştur ve kaydet
        generateAndSaveNodes(id, z);
      }

      // Purge excess nodes if zone is corrupted (more than MAX_NODES)
      if (nodes.length > MAX_NODES) {
        var excess = nodes.splice(MAX_NODES);
        var purge = {};
        for (var e = 0; e < excess.length; e++) purge[excess[e].id] = null;
        firebase.database().ref('world/' + id + '/nodes').update(purge);
        rebuildUsedPos();
      }

      _initialLoadDone = true;
      startZoneListener(id);
      startReplenish(id);
      if (SKY.UI && SKY.UI.refreshIfMap) SKY.UI.refreshIfMap();
    }).catch(function(err) {
      console.warn('Zone load error:', err);
      // Offline fallback — cap at MAX_NODES
      var count = Math.min(MAX_NODES, 10 + Math.floor(Math.random() * 5));
      for (var i = 0; i < count; i++) {
        var n = spawnNode(z);
        if (n) nodes.push(n);
      }
      _initialLoadDone = true;
      if (SKY.UI && SKY.UI.refreshIfMap) SKY.UI.refreshIfMap();
    });
  }

  // İlk defa zone node'larını oluştur — race condition'ı engellemek için transaction kullan
  function generateAndSaveNodes(zoneId, z) {
    var ref = firebase.database().ref('world/' + zoneId + '/nodes');
    ref.transaction(function(current) {
      // Başka biri zaten oluşturduysa dokunma
      if (current !== null) return; // abort
      var obj = {};
      var count = Math.min(MAX_NODES, 10 + Math.floor(Math.random() * 5));
      for (var i = 0; i < count; i++) {
        var n = spawnNode(z);
        if (n) obj[n.id] = n;
      }
      return obj;
    }).then(function(result) {
      if (currentZoneId !== zoneId) return;
      if (result.committed) {
        // Biz oluşturduk — snapshot'tan al
        var val = result.snapshot.val();
        nodes = [];
        usedPos = new Set();
        if (val) {
          for (var k in val) { val[k].id = k; nodes.push(val[k]); }
          rebuildUsedPos();
        }
      } else {
        // Başka biri oluşturmuş — Firebase'den oku
        return SKY.FB.loadZoneNodes(zoneId).then(function(fbNodes) {
          if (currentZoneId !== zoneId) return;
          if (fbNodes && fbNodes.length > 0) {
            nodes = fbNodes;
            usedPos = new Set();
            rebuildUsedPos();
          }
        });
      }
      if (SKY.UI && SKY.UI.refreshIfMap) SKY.UI.refreshIfMap();
    });
  }

  // Grid pozisyonlarını mevcut node'lardan yeniden hesapla
  function rebuildUsedPos() {
    usedPos = new Set();
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      var bestIdx = -1, bestDist = 999;
      for (var gi = 0; gi < GRID_POS.length; gi++) {
        var gp = GRID_POS[gi];
        var dx = n.x - gp.x, dy = n.y - gp.y;
        var d = Math.sqrt(dx*dx + dy*dy);
        if (d < bestDist) { bestDist = d; bestIdx = gi; }
      }
      if (bestIdx >= 0 && bestDist < 15) usedPos.add(bestIdx);
    }
  }

  // ---- Firebase Real-time Listener ----
  function startZoneListener(zoneId) {
    var initialKeys = {};
    for (var i = 0; i < nodes.length; i++) initialKeys[nodes[i].id] = true;
    var initialFired = {};

    SKY.FB.listenZoneNodes(zoneId, function(type, nodeId, data) {
      if (currentZoneId !== zoneId) return;

      if (type === 'added') {
        // İlk yüklemede tüm child_added eventleri gelir — bunları atla
        if (initialKeys[nodeId] && !initialFired[nodeId]) {
          initialFired[nodeId] = true;
          return;
        }
        // Gerçekten yeni node (respawn vs.) — cap at MAX_NODES
        var exists = nodes.find(function(n) { return n.id === nodeId; });
        if (!exists && data && nodes.length < MAX_NODES) {
          data.id = nodeId;
          nodes.push(data);
          rebuildUsedPos();
          if (SKY.UI && SKY.UI.refreshIfMap) SKY.UI.refreshIfMap();
        }
      } else if (type === 'changed') {
        var idx = nodes.findIndex(function(n) { return n.id === nodeId; });
        if (idx >= 0 && data) {
          data.id = nodeId;
          nodes[idx] = data;
          if (gathering && gathering.nodeId === nodeId && data.remaining <= 0) {
            gathering = null;
          }
          if (SKY.UI && SKY.UI.refreshIfMap) SKY.UI.refreshIfMap();
        }
      } else if (type === 'removed') {
        var rIdx = nodes.findIndex(function(n) { return n.id === nodeId; });
        if (rIdx >= 0) {
          if (gathering && gathering.nodeId === nodeId) gathering = null;
          nodes.splice(rIdx, 1);
          rebuildUsedPos();
          if (SKY.UI && SKY.UI.refreshIfMap) SKY.UI.refreshIfMap();
        }
      }
    });
  }

  function getNodes() { return nodes; }
  function isGathering() { return gathering; }
  function startGather(nodeId) {
    const n = nodes.find(x => x.id === nodeId);
    if (!n) return { ok: false };
    if (n.remaining <= 0) return { ok: false, msg: t('ui.node_depleted') };
    const tool = S.get().equipped.alet;
    const toolTier = (tool && !tool.t0) ? tool.tier : 1;
    const mult = D.TOOL_MATRIX[toolTier][n.tier];
    if (mult === null) return { ok: false, msg: t('ui.tool_incompatible', {ttier: toolTier, ntier: n.tier}) };
    gathering = { nodeId, progress: 0 };
    return { ok: true };
  }
  function stopGather() { gathering = null; }

  // ---- Harvest Tick (1sn) — Firebase ile paylaşımlı ----
  function gatherTick() {
    if (!gathering) return null;
    const n = nodes.find(x => x.id === gathering.nodeId);
    if (!n || n.remaining <= 0) { gathering = null; return null; }
    const P = S.get();
    const tool = P.equipped.alet;
    const toolTier = (tool && !tool.t0) ? tool.tier : 1;
    const toolMult = D.TOOL_MATRIX[toolTier][n.tier];
    if (toolMult === null) { gathering = null; return null; }

    const buffs = S.activeBuffMap();
    const gs = E.gatherStats(P.equipped, buffs);
    const baseDur = 12;
    const dur = Math.max(4, baseDur * (1 - gs.speed / 200));
    gathering.progress = (gathering.progress || 0) + 1;
    if (gathering.progress < dur) return null;
    gathering.progress = 0;

    let amount = 1;
    if (gs.yieldp > 0 && Math.random() * 100 < gs.yieldp) amount++;
    amount = Math.min(amount, n.remaining);
    if (S.invFull()) return { full: true };
    if (S.carryUsed() >= S.carryCap()) return { overweight: true };

    let total = amount;
    if (Math.random() * 100 < gs.double) total += amount;

    const cascade = D.NODE_CASCADE[n.color];
    const dropped = {};
    for (let i = 0; i < total; i++) {
      let rIdx = E.rollCascade(cascade);
      const tierUp = E.sumPerk(P.equipped, 'tierup');
      let tier = n.tier;
      if (tierUp > 0 && Math.random() * 100 < tierUp && tier < 3) tier++;
      let rareUp = E.sumPerk(P.equipped, 'rareup');
      if (S.isPremium()) rareUp += D.SHOP.premiumPerks.dropBonus;
      if (rareUp > 0 && Math.random() * 100 < rareUp && rIdx < 4) rIdx++;
      S.addMat(n.family, tier, rIdx, 1);
      const key = n.family + ':' + tier + ':' + rIdx;
      dropped[key] = (dropped[key] || 0) + 1;
    }
    P.stats.gathered += total;
    S.gainExp(n.tier);

    // Node remaining'i azalt
    n.remaining = Math.max(0, n.remaining - amount);

    // Firebase güncelle
    if (currentZoneId && SKY.FB && SKY.FB.uid()) {
      if (n.remaining <= 0) {
        // Node tükendi — respawn planla
        gathering = null;
        scheduleRespawn(n.id, currentZoneId);
        SKY.FB.updateNode(currentZoneId, n.id, { remaining: 0 });
      } else {
        SKY.FB.updateNode(currentZoneId, n.id, { remaining: n.remaining });
      }
    }

    if (n.remaining <= 0) gathering = null;

    return { dropped, node: n, total };
  }

  // Tükenen node'u yenisiyle değiştir — sadece tüketen client yapar
  function scheduleRespawn(oldId, zoneId) {
    var delay = 15000 + Math.random() * 10000; // 15-25 saniye
    setTimeout(function() {
      // Zone değiştiyse veya node sayısı zaten doluysa spawn etme
      if (currentZoneId !== zoneId) return;
      if (nodes.length >= MAX_NODES) return;

      var z = zone(zoneId);
      if (!z || z.kind !== 'field') return;

      // Yeni node üret
      var fresh = spawnNode(z);
      if (!fresh) return;

      // Firebase'de eski node'u sil, yenisini yaz (atomic)
      var updates = {};
      updates[oldId] = null; // eski sil
      updates[fresh.id] = fresh; // yenisini ekle
      firebase.database().ref('world/' + zoneId + '/nodes').update(updates);

      // Lokal güncelle
      var idx = nodes.findIndex(function(x) { return x.id === oldId; });
      if (idx >= 0) nodes.splice(idx, 1);
      if (nodes.length < MAX_NODES) {
        nodes.push(fresh);
      }
      rebuildUsedPos();
      if (SKY.UI && SKY.UI.refreshIfMap) SKY.UI.refreshIfMap();
    }, delay);
  }

  // lifecycleTick — süresi dolan node'ları kaldırıp yenisini spawn eder
  // Only removes expired nodes; respawn is handled by replenishTick to avoid multi-client duplication
  function lifecycleTick() {
    if (!currentZoneId || !nodes.length) return;
    var now = Date.now();
    var expired = [];
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      var elapsed = (now - n.born) / 1000;
      if (elapsed >= n.life) expired.push(n);
    }
    if (!expired.length) return;
    // Toplama sırasında node süresi dolarsa toplamayı durdur
    if (gathering) {
      for (var j = 0; j < expired.length; j++) {
        if (expired[j].id === gathering.nodeId) { gathering = null; break; }
      }
    }
    // Süresi dolanları listeden çıkar ve Firebase'den sil
    var updates = {};
    for (var j = 0; j < expired.length; j++) {
      var idx = nodes.findIndex(function(x) { return x.id === expired[j].id; });
      if (idx >= 0) nodes.splice(idx, 1);
      updates[expired[j].id] = null;
    }
    if (Object.keys(updates).length) {
      firebase.database().ref('world/' + currentZoneId + '/nodes').update(updates);
    }
    rebuildUsedPos();
    if (SKY.UI && SKY.UI.refreshIfMap) SKY.UI.refreshIfMap();
  }

  // replenishTick — periodically spawns new nodes if below target count
  // Uses random delay to reduce multi-client race conditions
  var _replenishTimer = null;
  function replenishTick() {
    if (!currentZoneId) return;
    var z = zone(currentZoneId);
    if (!z || z.kind !== 'field') return;
    if (nodes.length >= MAX_NODES) return;

    // Only spawn one node per tick to avoid bursts
    var fresh = spawnNode(z);
    if (!fresh) return;

    // Write to Firebase — child_added listener will add it locally
    firebase.database().ref('world/' + currentZoneId + '/nodes/' + fresh.id).set(fresh);
  }

  function startReplenish(zoneId) {
    stopReplenish();
    // Staggered interval: 20-30s + random offset to reduce multi-client collision
    var interval = 20000 + Math.floor(Math.random() * 10000);
    _replenishTimer = setInterval(function() {
      if (currentZoneId !== zoneId) { stopReplenish(); return; }
      replenishTick();
    }, interval);
  }

  function stopReplenish() {
    if (_replenishTimer) { clearInterval(_replenishTimer); _replenishTimer = null; }
  }

  // ---- Travel ----
  function canTravel(toId) {
    const from = curZone(), to = zone(toId);
    if (!to) return { ok: false };
    return { ok: true, time: travelTime(from, to) };
  }
  function travelTime(from, to) {
    let base = 60;
    if (from.kind === 'city' && to.tier === 1) base = D.TRAVEL['city-t1'];
    else if (from.tier === 1 && to.tier === 1) base = D.TRAVEL['t1-t1'];
    else if ((from.tier === 1 && to.tier === 2) || (from.tier === 2 && to.tier === 1)) base = D.TRAVEL['t1-t2'];
    else if ((from.tier === 2 && to.tier === 3) || (from.tier === 3 && to.tier === 2)) base = D.TRAVEL['t2-t3'];
    else if (to.kind === 'city' || from.kind === 'city') base = D.TRAVEL['city-t1'];
    const pct = S.carryPct();
    let mult = 1.0;
    if (pct >= 100) mult = 1.8; else if (pct >= 75) mult = 1.5; else if (pct >= 50) mult = 1.3;
    const travelPerk = E.sumPerk(S.get().equipped, 'travel');
    mult *= (1 - travelPerk / 100);
    return Math.max(5, Math.round(base * mult));
  }

  return {
    zone, curZone, enterZone, getNodes, isGathering, startGather, stopGather,
    gatherTick, lifecycleTick, canTravel, travelTime, spawnNode,
  };
})();
