/* ============================================================
   SKYZONE · UI — skyzone-ui-1-harita.html mockup'una uygun
   ============================================================ */
window.SKY = window.SKY || {};

SKY.UI = (function () {
  const D = SKY.D, E = SKY.E, S = SKY.S, W = SKY.W, C = SKY.C, DUN = SKY.DUN;
  const ART = window.SKY_ART || { mats: {}, nodes: {} };
  const IMG = window.SKY_IMG || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const RK = ['w', 'g', 'b', 'o', 'r'];
  const RKU = ['W', 'G', 'B', 'O', 'R'];

  // zone -> background image key
  const ZONE_IMG = {
    city_kar: 'citykar', city_orman: 'cityorman', city_col: 'citycol',
    t1_kar: 'kar', t1_orman: 'orman', t1_col: 'col',
    t2_kar: 't2a', t2_orman: 't2c', t2_col: 't2b', t3_merkez: 't3',
  };
  const ROMAN = ['', 'I', 'II', 'III'];

  let activeScreen = 'map';

  function esc(s) { return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }
  function fmt(n) { return Math.round(n).toLocaleString('tr-TR'); }
  function rarColor(i) { return D.RARITY[i].color; }
  function imgUrl(key) { return IMG[key] ? "url('data:image/jpeg;base64," + IMG[key] + "')" : 'none'; }
  // Material family key mapping (game uses Turkish keys internally)
  var _MATFAM = {odun:'wood',balik:'fish',tas:'stone',cevher:'ore',bitki:'herb',deri:'wood'};
  function matSVG(family, tier) {
    // Use dynamic generator with RESPAL palette if available
    var gk = _MATFAM[family] || family;
    var GP = window.GICONS, RP = window.SKY_RESPAL;
    if (GP && GP[gk] && RP && RP[gk] && RP[gk][tier]) {
      return '<svg viewBox="0 0 120 120">' + GP[gk](RP[gk][tier]) + '</svg>';
    }
    return ART.mats['item-' + family + '-' + tier] || '<span class="emoji">📦</span>';
  }
  const NODE_ART = window.SKY_NODE_ART || {};
  function nodeSVG(family, tier) {
    var key = family + '-' + tier;
    if (NODE_ART[key]) return '<img src="' + NODE_ART[key] + '" alt="' + key + '"/>';
    return ART.nodes[key] || '<span class="emoji">⛰️</span>';
  }

  function toast(msg, ms = 1800) {
    const t = $('#toast'); t.innerHTML = msg; t.classList.add('show');
    clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), ms);
  }

  // ---------- top bar ----------
  function renderTop() {
    const P = S.get(); if (!P) return;
    const z = W.curZone();
    $('#zName').textContent = (z.city ? D.CITIES[z.city].icon + ' ' : '') + z.name;
    $('#zTier').textContent = z.kind === 'city' ? t('nav.capital') : ('TIER ' + ROMAN[z.tier]);
    const st = $('#zStatus');
    const pvp = z.pvp || 'safe';
    const cls = pvp === 'red' ? 'pvp-r' : pvp === 'blue' ? 'pvp-b' : 'safe';
    st.className = 'zone-status ' + cls;
    st.textContent = '● ' + (pvp === 'red' ? t('zone.pvp_red') : pvp === 'blue' ? t('zone.pvp_blue') : t('zone.safe'));
    $('#sCP').textContent = fmt(E.baseCP(P.equipped));
    var sGoldHud = $('#sGold'); if (sGoldHud) sGoldHud.textContent = fmt(P.gold);
    // gems display
    const ge = $('#sGems');
    if (ge) ge.textContent = fmt(P.gems || 0);
    // premium badge
    const pb = $('#premBadge');
    if (pb) pb.style.display = S.isPremium() ? '' : 'none';
    renderBuffs();
  }
  function renderBuffs() {
    const P = S.get(); const now = Date.now();
    P.activeBuffs = P.activeBuffs.filter(b => b.end > now);
    // legacy buffbar (hidden)
    const bb = $('#buffbar');
    if (bb) bb.innerHTML = '';
    // new buff squares in status bar
    const sq = $('#buffSquares');
    if (!sq) return;
    let html = '';
    // premium buff
    if (S.isPremium()) {
      html += `<div class="buff-sq prem" data-act="buffinfo" data-buff="premium" title="Premium">★</div>`;
    }
    // city war stone buffs (from kadim ownership)
    const z = W.curZone();
    if (z.kind === 'city') {
      const cBuffs = getCityBuffs(z.city);
      for (const cb of cBuffs) {
        html += `<div class="buff-sq city" data-act="buffinfo" data-buff="city:${cb.name}" title="${cb.name} ${cb.val}">${cb.icon}</div>`;
      }
    }
    // active consumable buffs
    for (const b of P.activeBuffs) {
      const def = D.BUFFS[b.eff] || { icon: '✨', name: b.eff };
      const left = Math.max(0, Math.round((b.end - now) / 1000));
      const m = Math.floor(left / 60), s = left % 60;
      const timer = left > 0 ? `<span class="buff-sq-timer">${m}:${String(s).padStart(2,'0')}</span>` : '';
      html += `<div class="buff-sq consumable" data-act="buffinfo" data-buff="active:${b.eff}" title="${def.name} +${b.val}%">${def.icon}${timer}</div>`;
    }
    sq.innerHTML = html;
  }

  // ---------- MAP ----------
  // kadim taş SVG'leri
  const STONE_MAP = { kar: 'buz', orman: 'orman', col: 'col' };
  const STONE_SVG_MAP = window.SKY_STONES || {};
  // zone→taş eşleştirmesi (belge: her şehrin 3 taşı = kalesi + T1 + T2)
  const ZONE_STONES_DATA = {
    city_kar: { stoneKey: 'stone.kar_castle', svg: 'buz', pos: { x: 50, y: 50 }, isCity: true },
    city_orman: { stoneKey: 'stone.orman_castle', svg: 'orman', pos: { x: 50, y: 50 }, isCity: true },
    city_col: { stoneKey: 'stone.col_castle', svg: 'col', pos: { x: 50, y: 50 }, isCity: true },
    t1_kar: { stoneKey: 'stone.kar_field', svg: 'buz', pos: { x: 85, y: 20 } },
    t1_orman: { stoneKey: 'stone.orman_field', svg: 'orman', pos: { x: 85, y: 20 } },
    t1_col: { stoneKey: 'stone.col_field', svg: 'col', pos: { x: 85, y: 20 } },
    t2_kar: { stoneKey: 'stone.kar_t2', svg: 'buz', pos: { x: 15, y: 80 } },
    t2_orman: { stoneKey: 'stone.orman_t2', svg: 'orman', pos: { x: 15, y: 80 } },
    t2_col: { stoneKey: 'stone.col_t2', svg: 'col', pos: { x: 15, y: 80 } },
    t3_merkez: { stoneKey: 'stone.golden', svg: 'altin', pos: { x: 50, y: 50 } },
  };
  // Build ZONE_STONES with dynamic name getter
  const ZONE_STONES = {};
  for (var _zsk in ZONE_STONES_DATA) {
    (function(k, d) {
      ZONE_STONES[k] = { get name() { return t(d.stoneKey); }, svg: d.svg, pos: d.pos, isCity: d.isCity };
    })(_zsk, ZONE_STONES_DATA[_zsk]);
  }

  // zone ID → war state stone ID mapping
  function zoneToStoneId(zoneId) {
    // city_kar → ws_kar_city, t1_kar → ws_kar_t1, t3_merkez → ws_golden
    if (zoneId === 't3_merkez') return 'ws_golden';
    var parts = zoneId.split('_');
    if (parts.length === 2) return 'ws_' + parts[1] + '_' + parts[0];
    return null;
  }

  function renderZoneStones(z, canvas, beforeEl) {
    // mevcut taşları temizle
    canvas.querySelectorAll('.kadim-stone').forEach(el => el.remove());
    const stoneInfo = ZONE_STONES[z.id];
    if (!stoneInfo) return;
    const svgContent = STONE_SVG_MAP[stoneInfo.svg] || '🪨';
    // war state'ten HP bilgisi al
    const sid = zoneToStoneId(z.id);
    const wst = window.SKY_WAR_STATE;
    const wsStone = wst ? wst.stones.find(function(s) { return s.id === sid; }) : null;
    const hp = wsStone ? wsStone.hp : 40000;
    const maxHp = D.WAR.stoneHP;
    const owner = wsStone ? wsStone.owner : (z.city || z.biome || 'neutral');
    const ownerIcon = D.CITIES[owner] ? D.CITIES[owner].icon : '⭐';
    const hpPct = Math.round(hp / maxHp * 100);
    const hpColor = hpPct > 60 ? '#5aaa3a' : hpPct > 30 ? '#d8a040' : '#e04040';

    const el = document.createElement('div');
    el.className = 'kadim-stone';
    el.style.left = stoneInfo.pos.x + '%';
    el.style.top = stoneInfo.pos.y + '%';
    el.dataset.act = 'openstone';
    el.dataset.sid = sid || '';
    el.innerHTML = `${svgContent}
      <div class="ks-label">${stoneInfo.name}</div>
      <div class="ks-hp" style="color:${hpColor}">${ownerIcon} ${fmt(hp)}/${fmt(maxHp)}</div>`;
    if (beforeEl) canvas.insertBefore(el, beforeEl);
    else canvas.appendChild(el);
  }

  function renderCityStone(scene, city) {
    const stoneInfo = ZONE_STONES['city_' + city];
    if (!stoneInfo) return;
    const svgContent = STONE_SVG_MAP[stoneInfo.svg] || '🪨';
    const sid = zoneToStoneId('city_' + city);
    const wst = window.SKY_WAR_STATE;
    const wsStone = wst ? wst.stones.find(function(s) { return s.id === sid; }) : null;
    const hp = wsStone ? wsStone.hp : D.WAR.stoneHP;
    const owner = wsStone ? wsStone.owner : city;
    const ownerIcon = D.CITIES[owner] ? D.CITIES[owner].icon : '🏰';

    scene.innerHTML += `<div class="kadim-stone city-stone" style="left:50%;top:46%;z-index:10" data-act="openstone" data-sid="${sid || ''}">
      ${svgContent}
      <div class="ks-label">${stoneInfo.name}</div>
      <div class="ks-hp" style="color:var(--goldlit)">${ownerIcon} ${fmt(hp)}</div>
    </div>`;
  }

  function nodeTimeLeft(n) {
    const elapsed = (Date.now() - n.born) / 1000;
    const left = Math.max(0, n.life - elapsed);
    const m = Math.floor(left / 60), s = Math.floor(left % 60);
    return m + ':' + String(s).padStart(2, '0');
  }

  function renderMap() {
    const z = W.curZone();
    $('#mapBg').style.backgroundImage = imgUrl(ZONE_IMG[z.id] || 'orman');
    const canvas = $('#mapCanvas');
    canvas.querySelectorAll('.node').forEach(n => n.remove());
    const dg = $('#dungeonEntrance');
    // şehir sahnesini temizle
    const vp = $('#mapViewport');
    vp.querySelectorAll('.city-scene').forEach(el => el.remove());
    canvas.style.display = '';
    if (z.kind === 'field') {
      dg.style.display = 'flex';
      $('#dgLabel').textContent = 'DUNGEON';
      const nodes = W.getNodes();
      const g = W.isGathering();
      for (const n of nodes) {
        const el = document.createElement('div');
        const tcls = n.tier === 2 ? 't2' : n.tier === 3 ? 't3' : '';
        el.className = 'node ' + RK[n.colorIdx] + (g && g.nodeId === n.id ? ' gathering' : '');
        el.style.top = n.y + '%'; el.style.left = n.x + '%';
        el.dataset.act = 'opennode'; el.dataset.id = n.id;
        el.innerHTML = `<div class="node-icon">${nodeSVG(n.family, n.tier)}</div>
          <span class="node-tier ${tcls}">${ROMAN[n.tier]}</span>
          <span class="node-timer">${nodeTimeLeft(n)}</span>`;
        canvas.insertBefore(el, dg);
      }
      // kadim taş yerleştir (field zone'larda)
      renderZoneStones(z, canvas, dg);
    } else if (z.kind === 'city') {
      dg.style.display = 'none';
      // şehirde pan/zoom canvas gizle, sahneyi viewport'a direkt koy
      canvas.style.display = 'none';
      renderCityScene(z);
      return;
    } else {
      dg.style.display = 'none';
    }
  }
  function refreshIfMap() { if (activeScreen === 'map') renderMap(); }

  // ---- Şehir İçi Sahnesi (skyzone-sehir.html) ----
  const CITY_DECOS = {
    kar: [{e:'🏔️',x:8,y:8,s:48},{e:'🏔️',x:78,y:6,s:42},{e:'⛰️',x:45,y:5,s:35},{e:'🌲',x:5,y:35,s:30},{e:'🌲',x:92,y:30,s:28},{e:'🌲',x:88,y:55,s:24},{e:'❄️',x:22,y:12,s:16},{e:'❄️',x:68,y:10,s:14},{e:'🌲',x:8,y:70,s:26},{e:'🌲',x:90,y:75,s:22}],
    orman: [{e:'🌳',x:5,y:10,s:44},{e:'🌳',x:88,y:8,s:40},{e:'🌳',x:50,y:4,s:32},{e:'🌿',x:15,y:28,s:20},{e:'🌿',x:85,y:32,s:18},{e:'🌳',x:3,y:55,s:34},{e:'🌳',x:95,y:58,s:30},{e:'🍃',x:40,y:12,s:14},{e:'🌿',x:10,y:78,s:18},{e:'🌳',x:92,y:78,s:26}],
    col: [{e:'☀️',x:50,y:4,s:36},{e:'🏜️',x:8,y:12,s:38},{e:'🌵',x:88,y:10,s:30},{e:'🌵',x:10,y:40,s:24},{e:'🪨',x:90,y:38,s:20},{e:'🌵',x:5,y:65,s:22},{e:'🏜️',x:92,y:62,s:28},{e:'🪨',x:20,y:15,s:16},{e:'🌵',x:8,y:80,s:20},{e:'🪨',x:88,y:80,s:16}],
  };
  function cityBldLabel(id) {
    var map = { belediye: 'bld.townhall', atolye: 'bld.workshop', banka: 'bld.bank', pazar: 'bld.market', kasa: 'bld.treasury', kapi: 'bld.gate' };
    return t(map[id] || id);
  }
  const CITY_BLDS = [
    {id:'belediye',icon:'🏛️',get label(){return cityBldLabel('belediye');},cls:'belediye',x:50,y:24},
    {id:'atolye',icon:'⚒️',get label(){return cityBldLabel('atolye');},cls:'atolye',x:22,y:40},
    {id:'banka',icon:'🏦',get label(){return cityBldLabel('banka');},cls:'banka',x:78,y:40},
    {id:'pazar',icon:'🏪',get label(){return cityBldLabel('pazar');},cls:'pazar',x:30,y:58},
    {id:'kasa',icon:'💰',get label(){return cityBldLabel('kasa');},cls:'kasa',x:70,y:58},
    {id:'kapi',icon:'🚪',get label(){return cityBldLabel('kapi');},cls:'kapi',x:50,y:76},
  ];
  const BLD_INFO = {
    belediye:{get title(){return t('bld.townhall_title');},get sub(){return t('bld.townhall_sub');},icon:'🏛️',get desc(){return t('bld.townhall_desc');}},
    kasa:{get title(){return t('bld.treasury_title');},get sub(){return t('bld.treasury_sub');},icon:'💰',get desc(){return t('bld.treasury_desc');}},
  };

  // şehir haftalık buffları (demo: rastgele seçilir, gerçekte şehir kasasından gelir)
  function getCityBuffs(city) {
    const allBuffs = [
      { icon: '🛡️', get name() { return t('war.city_walls'); }, val: '+%5 CP' },
      { icon: '🌾', get name() { return t('war.harvest_charm'); }, val: '+%5 yield' },
      { icon: '🔨', get name() { return t('war.hammer_statue'); }, val: '+%5 craft' },
      { icon: '⭐', get name() { return t('war.star_podium'); }, val: '+%3 enh' },
      { icon: '💰', get name() { return t('war.merchant_seal'); }, val: '-%20 tax' },
    ];
    // demo: şehre göre 1-2 buff göster
    const seed = city.charCodeAt(0) % 5;
    return [allBuffs[seed], allBuffs[(seed + 2) % 5]];
  }

  function renderCityScene(z) {
    const city = z.city;
    const vp = $('#mapViewport');
    // eski sahneyi temizle
    vp.querySelectorAll('.city-scene').forEach(el => el.remove());
    const scene = document.createElement('div');
    scene.className = 'city-scene';
    scene.innerHTML = `<div class="city-scene-bg ${city}"></div>`;
    // dekorasyon
    const decos = CITY_DECOS[city] || [];
    for (const d of decos) {
      scene.innerHTML += `<div class="cdeco" style="left:${d.x}%;top:${d.y}%;font-size:${d.s}px">${d.e}</div>`;
    }
    // taş yollar (belediyeden diğer binalara)
    const ctr = CITY_BLDS[0];
    for (const b of CITY_BLDS.slice(1)) {
      for (let i = 1; i < 7; i++) {
        const t = i / 7;
        scene.innerHTML += `<div class="cpath-dot" style="left:${ctr.x + (b.x - ctr.x) * t}%;top:${ctr.y + (b.y - ctr.y) * t}%"></div>`;
      }
    }
    // binalar
    for (const b of CITY_BLDS) {
      scene.innerHTML += `<div class="cbld" style="left:${b.x}%;top:${b.y}%" data-act="citybld" data-bld="${b.id}">
        <div class="cbld-icon ${b.cls}">${b.icon}</div>
        <div class="cbld-label">${b.label}</div>
      </div>`;
    }
    // kadim taş (şehir ortasında)
    renderCityStone(scene, city);
    vp.appendChild(scene);
  }

  function openBldModal(bldId) {
    // binaya tıklama → ilgili sistemi aç
    switch (bldId) {
      case 'atolye': openAtolye(); break;
      case 'banka': openBanka(); break;
      case 'pazar': openPazar(); break;
      case 'kapi':
        // şehir kapısı → dünya haritası
        show('world'); break;
      case 'belediye':
      case 'kasa':
        const info = BLD_INFO[bldId];
        if (!info) return;
        openSheet(info.icon + ' ' + info.title, info.sub,
          `<div class="bm-icon">${info.icon}</div>
           <div class="bm-desc">${info.desc}</div>
           <div class="muted small" style="text-align:center">${t('bld.coming_soon')}</div>`);
        break;
    }
  }

  // ---------- WORLD (Arkana scenic map) ----------
  var _worldBuilt = false, _worldLang = '';
  function _scenic(p) {
    var snowCap = p.snow ? "<path d='M50 37 L57 45 L43 45 Z' fill='" + p.snow + "'/>" : '';
    var svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='xMidYMid slice'>" +
      "<defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='" + p.s1 + "'/><stop offset='1' stop-color='" + p.s2 + "'/></linearGradient></defs>" +
      "<rect width='100' height='100' fill='url(#g)'/>" +
      "<path d='M0 66 L18 46 L32 60 L50 37 L68 60 L84 48 L100 62 L100 101 L0 101 Z' fill='" + p.mtn + "'/>" + snowCap +
      "<path d='M0 73 Q26 65 52 73 Q78 81 100 71 L100 101 L0 101 Z' fill='" + p.ground + "'/>" +
      "<path d='M45 101 Q55 85 49 74 Q45 66 55 60' fill='none' stroke='" + p.water + "' stroke-width='5' stroke-linecap='round' opacity='.85'/>" +
      "</svg>";
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  }
  var _WBIO = {
    snow:   {s1:'#d6e6f0',s2:'#a7c0d4',mtn:'#8ba2b8',ground:'#e7eff5',water:'#7fb0d0',snow:'#ffffff'},
    forest: {s1:'#bcd29a',s2:'#7aa869',mtn:'#4d7842',ground:'#6a9b51',water:'#5fa0c0'},
    desert: {s1:'#ecd9a8',s2:'#d4ab63',mtn:'#ad7a3c',ground:'#dfbd70',water:'#6fb6c8'},
    valley: {s1:'#cfe0a0',s2:'#98bd66',mtn:'#6c9646',ground:'#b2cb6e',water:'#6fb0c8'},
    swamp:  {s1:'#9cae7e',s2:'#67805b',mtn:'#46583c',ground:'#54683d',water:'#6f8a5a'},
    barren: {s1:'#e2c99c',s2:'#c0935a',mtn:'#955f37',ground:'#b3854e',water:'#8a9a6a'},
    core:   {s1:'#eaa06e',s2:'#ad4334',mtn:'#722420',ground:'#bf4d39',water:'#f3c75e'}
  };
  var _WNODES = [
    {id:'city_kar',  act:'travelcity', cls:'w-t-city w-sz-city', badge:'world.city_badge', name:'city.kar',          sub:'world.capital', bio:'snow',   x:215, y:60},
    {id:'t1_kar',    act:'travel',     cls:'w-t-1 w-sz-zone',    badge:null,               name:'world.t1_kar_name', sub:null,            bio:'snow',   x:215, y:140, badgeTxt:'SAFE', badgeFix:true},
    {id:'t2_kar',    act:'travel',     cls:'w-t-2 w-sz-zone',    badge:null,               name:'world.t2_vadi',     sub:null,            bio:'valley', x:215, y:216, badgeTxt:'PVP', badgeFix:true},
    {id:'t3_merkez', act:'travel',     cls:'w-t-3 w-sz-core',    badge:'world.center_badge',name:'world.t3_center',  sub:null,            bio:'core',   x:215, y:300, subTxt:'TIER III'},
    {id:'t2_orman',  act:'travel',     cls:'w-t-2 w-sz-zone',    badge:null,               name:'world.t2_bataklik', sub:null,            bio:'swamp',  x:166, y:386, badgeTxt:'PVP', badgeFix:true},
    {id:'t1_orman',  act:'travel',     cls:'w-t-1 w-sz-zone',    badge:null,               name:'world.t1_orman_name',sub:null,           bio:'forest', x:121, y:466, badgeTxt:'SAFE', badgeFix:true},
    {id:'city_orman',act:'travelcity', cls:'w-t-city w-sz-city', badge:'world.city_badge', name:'city.orman',        sub:'world.capital', bio:'forest', x:72,  y:552},
    {id:'t2_col',    act:'travel',     cls:'w-t-2 w-sz-zone',    badge:null,               name:'world.t2_corak',    sub:null,            bio:'barren', x:264, y:386, badgeTxt:'PVP', badgeFix:true},
    {id:'t1_col',    act:'travel',     cls:'w-t-1 w-sz-zone',    badge:null,               name:'world.t1_col_name', sub:null,            bio:'desert', x:309, y:466, badgeTxt:'SAFE', badgeFix:true},
    {id:'city_col',  act:'travelcity', cls:'w-t-city w-sz-city', badge:'world.city_badge', name:'city.col',          sub:'world.capital', bio:'desert', x:358, y:552}
  ];
  var _WARMS = [
    ['city_kar','t1_kar','t2_kar','t3_merkez'],
    ['city_orman','t1_orman','t2_orman','t3_merkez'],
    ['city_col','t1_col','t2_col','t3_merkez']
  ];
  function _buildWorld() {
    var curLang = SKY.LANG.getLang();
    if (_worldBuilt && _worldLang === curLang) return;
    _worldBuilt = true; _worldLang = curLang;
    var pos = {};
    for (var i = 0; i < _WNODES.length; i++) pos[_WNODES[i].id] = [_WNODES[i].x, _WNODES[i].y];
    // SVG connections
    var svgEl = $('#wLinks');
    var defs = '<defs><filter id="wglow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>';
    for (var ai = 0; ai < _WARMS.length; ai++) {
      var a = pos[_WARMS[ai][0]], c = pos[_WARMS[ai][3]];
      defs += '<linearGradient id="wag' + ai + '" gradientUnits="userSpaceOnUse" x1="' + a[0] + '" y1="' + a[1] + '" x2="' + c[0] + '" y2="' + c[1] + '">' +
        '<stop offset="0" stop-color="#e0c061"/><stop offset="0.34" stop-color="#5cc06f"/>' +
        '<stop offset="0.68" stop-color="#5a9bdf"/><stop offset="1" stop-color="#e3564b"/></linearGradient>';
    }
    defs += '</defs>';
    var body = '';
    // faint triangle
    var tri = [pos['city_kar'], pos['city_orman'], pos['city_col']];
    body += '<path d="M' + tri[0] + ' L' + tri[1] + ' L' + tri[2] + ' Z" fill="rgba(224,192,97,.04)" stroke="rgba(224,192,97,.22)" stroke-width="1.5" stroke-dasharray="2 7" stroke-linejoin="round"/>';
    for (var ai = 0; ai < _WARMS.length; ai++) {
      var d = 'M' + _WARMS[ai].map(function(id) { return pos[id].join(' '); }).join(' L');
      body += '<path d="' + d + '" fill="none" stroke="#000" stroke-opacity=".5" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>';
      body += '<path d="' + d + '" fill="none" stroke="url(#wag' + ai + ')" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" filter="url(#wglow)"/>';
      body += '<path d="' + d + '" fill="none" stroke="#fff8e0" stroke-opacity=".85" stroke-width="2" stroke-linecap="round" stroke-dasharray="2 14" stroke-dashoffset="0"><animate attributeName="stroke-dashoffset" from="0" to="-48" dur="1.6s" repeatCount="indefinite"/></path>';
    }
    svgEl.innerHTML = defs + body;
    // render nodes
    var html = '';
    for (var i = 0; i < _WNODES.length; i++) {
      var n = _WNODES[i];
      var badgeText = n.badgeFix ? n.badgeTxt : (n.badge ? t(n.badge) : '');
      var subText = n.sub ? t(n.sub) : (n.subTxt || ('TIER ' + (n.cls.indexOf('w-t-1') >= 0 ? 'I' : n.cls.indexOf('w-t-2') >= 0 ? 'II' : 'III')));
      html += '<div class="w-node ' + n.cls + '" style="left:' + n.x + 'px;top:' + n.y + 'px" data-act="' + n.act + '" data-z="' + n.id + '">' +
        '<div class="w-thumb">' +
        '<img class="w-tile" alt="" src="' + _scenic(_WBIO[n.bio]) + '"/>' +
        (badgeText ? '<span class="w-badge">' + badgeText + '</span>' : '') +
        '<div class="w-scrim"><b>' + t(n.name) + '</b><small>' + subText + '</small></div>' +
        '</div></div>';
    }
    $('#wNodes').innerHTML = html;
  }
  function renderWorld() {
    _buildWorld();
    var cur = S.get().zone;
    var hereText = t('world.here');
    $$('.w-node').forEach(function(z) {
      var isHere = z.dataset.z === cur;
      z.classList.toggle('here', isHere);
      if (isHere) z.dataset.here = hereText;
    });
  }

  // ---------- GATHER MODAL ----------
  let gNode = null;
  let gatherPlayerInterval = null;
  function startGatherPlayerPoll(z) {
    stopGatherPlayerPoll();
    gatherPlayerInterval = setInterval(function() { renderGatherPlayers(z); }, 8000);
  }
  function stopGatherPlayerPoll() {
    if (gatherPlayerInterval) { clearInterval(gatherPlayerInterval); gatherPlayerInterval = null; }
  }
  function openGather(nodeId) {
    const n = W.getNodes().find(x => x.id === nodeId);
    if (!n) return;
    gNode = n;
    const z = W.curZone();
    $('#mIcon').innerHTML = matSVG(n.family, n.tier);
    $('#mVis').className = 'g-itemcard-vis ' + RK[n.colorIdx];
    $('#mTier').textContent = ROMAN[n.tier];
    $('#mTierTxt').textContent = n.tier;
    $('#mMat').textContent = D.MAT_NAMES[n.family][n.tier - 1];
    $('#mRar').textContent = D.RARITY[n.colorIdx].name;
    $('#mZone').textContent = z.name;
    $('#mCount').textContent = n.remaining + ' / ' + n.total;
    // bonuses (tool section removed in v3401)
    const P = S.get();
    const tool = P.equipped.alet;
    const toolTier = (tool && !tool.t0) ? tool.tier : 1;
    const toolMult = D.TOOL_MATRIX[toolTier][n.tier];
    // bonuses
    const buffs = S.activeBuffMap();
    const gs = E.gatherStats(P.equipped, buffs);
    const spd = (gs.toolSpeed * (1 + gs.speed / 100) * (toolMult || 1));
    // Show value + % breakdown
    var spdEl = $('#mSpeed');
    if (spdEl) spdEl.innerHTML = spd.toFixed(1) + (gs.speed > 0 ? ' <span style="font-size:9px;color:var(--safe)">(+' + Math.round(gs.speed) + '%)</span>' : '');
    var yldEl = $('#mYield');
    if (yldEl) yldEl.innerHTML = (1 + gs.yieldp / 100).toFixed(2) + '×' + (gs.yieldp > 0 ? ' <span style="font-size:9px;color:var(--safe)">(+' + Math.round(gs.yieldp) + '%)</span>' : '');
    var dblEl = $('#mDouble');
    if (dblEl) dblEl.innerHTML = Math.round(gs.double || 0) + '%' + (gs.double > 0 ? ' <span style="font-size:9px;color:var(--safe)">(+' + Math.round(gs.double) + '%)</span>' : '');
    // reset drops
    gatherInvCat = 'all';
    renderGatherInv();
    // render players with interaction buttons + start polling
    renderGatherPlayers(z);
    startGatherPlayerPoll(z);
    setGatherUI(false);
    openMB('gatherModal');
  }
  let earned = { w: 0, g: 0, b: 0, o: 0, r: 0 };
  let earnedSlots = []; // [{svg, rar, family, tier, count}]

  function renderGatherDropsGrid() {
    const list = $('#gDropsList');
    if (!list) return;
    let html = '';
    const maxSlots = 15; // 5x3 grid
    for (let i = 0; i < maxSlots; i++) {
      if (i < earnedSlots.length) {
        const s = earnedSlots[i];
        const cnt = s.count > 1 ? `<span class="drop-cnt">${s.count > 99 ? '99+' : s.count}</span>` : '';
        html += `<div class="g-drop-slot filled ${RK[s.rar]}" data-act="dropinfo" data-idx="${i}"><div class="slot-inner">${s.svg}</div>${cnt}</div>`;
      } else {
        html += `<div class="g-drop-slot"></div>`;
      }
    }
    list.innerHTML = html;
  }

  function renderGatherPlayers(z) {
    var el = $('#gPlayers');
    if (!el) return;
    var P = S.get();
    var myCity = P ? P.city : 'kar';
    var tribeIcons = { kar: '❄️', orman: '🌲', col: '🏜️' };
    var tribeColors = { kar: '#7ac0d8', orman: '#5aaa3a', col: '#d8a040' };
    var zoneId = z ? z.id : (P ? P.zone : '');
    // Show "Sen" chip immediately
    el.innerHTML = '<div class="dg-player-chip you">' + (tribeIcons[myCity] || '🧙') + ' ' + t('gather.you') + '</div>';
    // Fetch real online players from Firebase
    SKY.FB.getOnlinePlayers(zoneId).then(function(players) {
      var html = '<div class="dg-player-chip you">' + (tribeIcons[myCity] || '🧙') + ' ' + t('gather.you') + '</div>';
      if (players.length === 0) {
        html += '<div style="font-size:10px;color:var(--textdim);padding:4px 0">' + t('gather.no_players') + '</div>';
      } else {
        for (var i = 0; i < players.length; i++) {
          var p = players[i];
          var pCity = p.city || 'kar';
          var isEnemy = pCity !== myCity;
          if (isEnemy) {
            html += '<div class="dg-player-chip enemy" style="border-color:' + (tribeColors[pCity] || '#666') + ';cursor:pointer" data-act="gatherPvp" data-tribe="' + pCity + '" data-name="' + esc(p.name || t('gather.player')) + '" data-uid="' + (p.uid || '') + '">' +
              (tribeIcons[pCity] || '👤') + ' ' + esc(p.name || t('gather.player')) +
              '</div>';
          } else {
            html += '<div class="dg-player-chip" style="border-color:' + (tribeColors[pCity] || '#666') + ';cursor:pointer" data-act="friendReq" data-name="' + esc(p.name || t('gather.player')) + '" data-uid="' + (p.uid || '') + '" data-city="' + pCity + '">' +
              (tribeIcons[pCity] || '👤') + ' ' + esc(p.name || t('gather.player')) +
              '</div>';
          }
        }
      }
      el.innerHTML = html;
    });
  }

  function setGatherUI(on) {
    const b = $('#gAction');
    if (on) { b.classList.add('gathering'); b.innerHTML = '<span class="g-gather-ico">⛏</span><span class="g-gather-txt">' + t('gather.stop') + '</span>'; }
    else { b.classList.remove('gathering'); b.innerHTML = '<span class="g-gather-ico">⛏</span><span class="g-gather-txt">' + t('gather.start') + '</span>'; }
    const p = $('#gProgressWrap'); if (p) p.style.display = 'none';
  }
  function addGatherDrops(dropped) {
    // rare drop banner for orange+ materials
    for (var k in dropped) {
      var sp = k.split(':'); var ri = +sp[2];
      if (ri >= 3 && gNode) {
        showRareDropBanner({
          name: D.MAT_NAMES[gNode.family][gNode.tier - 1],
          rarity: ri, tier: gNode.tier, type: 'mat',
          family: gNode.family, icon: null
        });
      }
    }
    // Refresh real inventory
    renderGatherInv();
    if (gNode) $('#mCount').textContent = gNode.remaining + ' / ' + gNode.total;
  }
  function gatherProgress() {
    if (!gNode) return;
    const pct = Math.round((1 - gNode.remaining / gNode.total) * 100);
    $('#gPct').textContent = pct + '%';
    $('#gFill').style.width = pct + '%';
  }
  function getGatherNode() { return gNode; }

  // ---------- DUNGEON SCREEN ----------
  let dunTier = 1, dunBiome = 'orman', dunExpanded = -1, dunAutoOn = true;
  let dunLoot = []; // array of {svg, rarCls, isBoss}
  let dunSummary = { kills: 0, bossKills: 0, gold: 0, items: 0, stones: 0, charms: 0 };
  const MOBSVG = window.SKY_MOBSVG || {};
  const BIOMOBS = window.SKY_BIOME_MOBS || {};
  const BIOINFO = window.SKY_BIOME_INFO || {};
  // FAKE_PLAYERS removed — real online players are fetched from Firebase
  const FLOOR_CLS = ['k1', 'k2', 'k3', 'k4', 'k5'];
  const FLOOR_KEYS = ['dg.floor_white', 'dg.floor_green', 'dg.floor_blue', 'dg.floor_orange', 'dg.floor_red'];
  function FLOOR_NAME(i) { return t(FLOOR_KEYS[i]); }
  const FLOOR_NAMES = new Proxy([], { get: function(_, p) { var i = parseInt(p); return !isNaN(i) && i >= 0 && i <= 4 ? t(FLOOR_KEYS[i]) : undefined; } });

  function openDungeon() {
    const z = W.curZone();
    if (z.kind !== 'field') { toast(t('dg.only_fields')); return; }
    dunTier = z.tier;
    dunBiome = z.biome || 'orman';
    dunExpanded = -1;
    if (DUN.isActive()) { enterDungeonView(); return; }
    renderDungeonSelect();
    openMB('dungeonModal');
  }

  function renderDungeonSelect() {
    var el = $('#dungeonSelect'); if (!el) return;
    el.style.display = '';
    var da = $('#dungeonActive'); if (da) da.style.display = 'none';
    var sub = $('#dgSubtitle');
    if (sub) sub.textContent = 'T' + dunTier + ' · ' + t((BIOINFO[dunBiome] || {}).name || '') + ' · ' + t('dg.floor_select');
    var myCP = E.baseCP(S.get().equipped);
    var html = '';
    for (var i = 0; i < D.FLOORS.length; i++) {
      var f = D.FLOORS[i];
      var fcp = DUN.floorCP(i, dunTier);
      var mobCP = Math.round(fcp * 0.5);
      var locked = myCP < mobCP * 0.6;
      var expanded = dunExpanded === i && !locked;
      var bio = BIOMOBS[dunBiome] || {};
      var mobInfo = bio[i + 1] || { n: 'Mob', boss: 'Boss' };
      html += '<div class="dg-fcard ' + FLOOR_CLS[i] + (locked ? ' locked' : '') + (expanded ? ' expanded' : '') + '" ' + (locked ? '' : 'data-act="dgfloor" data-f="' + i + '"') + '>';
      html += '<div class="dg-fcard-head"><div class="dg-fcard-num"><div class="big">' + (i+1) + '</div><div class="lbl">' + t('dg.floor') + '</div></div>';
      html += '<div class="dg-fcard-info"><div class="dg-fcard-name">' + FLOOR_NAMES[i] + (locked ? ' 🔒' : '') + '</div>';
      html += '<div class="dg-fcard-sub">Min ' + Math.round(fcp * 0.5) + ' CP</div></div>';
      html += '<div class="dg-fcard-cp">' + fmt(fcp) + ' CP</div></div>';
      if (expanded) {
        var combatDur = DUN.combatDuration();
        var killsPerHr = Math.floor(3600 / combatDur);
        html += '<div class="dg-fcard-body">';
        html += '<div class="dg-fcard-pills"><div class="dg-fcard-pill">Mob ' + fmt(mobCP) + ' CP</div><div class="dg-fcard-pill">Boss ' + fmt(Math.round(fcp*1.5)) + ' CP</div></div>';
        html += '<button class="btn full" data-act="enterdun" data-f="' + i + '" style="margin-top:8px">' + t('dg.enter_floor') + '</button>';
        html += '</div>';
      }
      html += '</div>';
    }
    $('#dgFloorList').innerHTML = html;
  }

  function enterDungeonView() {
    const a = DUN.getActive(); if (!a) return;
    const el = $('#dungeonSelect'); if (el) el.style.display = 'none';
    const da = $('#dungeonActive'); if (da) da.style.display = '';
    dunLoot = [];
    dunSummary = { kills: 0, bossKills: 0, gold: 0, items: 0, stones: 0, charms: 0 };
    dunAutoOn = true;
    $('#dgActiveTitle').textContent = 'K' + (a.floorIdx + 1) + ' ' + FLOOR_NAMES[a.floorIdx];
    $('#dgKillCount').textContent = '0 ' + t('dg.kill');
    // players — real online players from Firebase
    var P = S.get();
    var myCity = P ? P.city : 'kar';
    var tribeIcons = { kar: '❄️', orman: '🌲', col: '🏜️' };
    var tribeColors = { kar: '#7ac0d8', orman: '#5aaa3a', col: '#d8a040' };
    var zoneId = P ? P.zone : '';
    // Show "Sen" chip immediately
    $('#dgPlayers').innerHTML = '<div class="dg-player-chip you">' + (tribeIcons[myCity] || '🧙') + ' ' + t('gather.you') + '</div>';
    // Fetch real online players from Firebase
    SKY.FB.getOnlinePlayers(zoneId).then(function(players) {
      var dgPlayersHtml = '<div class="dg-player-chip you">' + (tribeIcons[myCity] || '🧙') + ' ' + t('gather.you') + '</div>';
      if (players.length === 0) {
        dgPlayersHtml += '<div style="font-size:10px;color:var(--textdim);padding:4px 0">' + t('gather.no_players') + '</div>';
      } else {
        for (var pi = 0; pi < players.length; pi++) {
          var p = players[pi];
          var pCity = p.city || 'kar';
          var isEnemy = pCity !== myCity;
          if (isEnemy) {
            dgPlayersHtml += '<div class="dg-player-chip enemy" style="border-color:' + (tribeColors[pCity] || '#666') + ';cursor:pointer" data-act="gatherPvp" data-tribe="' + pCity + '" data-name="' + esc(p.name || t('gather.player')) + '" data-uid="' + (p.uid || '') + '">' +
              (tribeIcons[pCity] || '👤') + ' ' + esc(p.name || t('gather.player')) +
              '</div>';
          } else {
            dgPlayersHtml += '<div class="dg-player-chip" style="border-color:' + (tribeColors[pCity] || '#666') + ';cursor:pointer" data-act="friendReq" data-name="' + esc(p.name || t('gather.player')) + '" data-uid="' + (p.uid || '') + '" data-city="' + pCity + '">' +
              (tribeIcons[pCity] || '👤') + ' ' + esc(p.name || t('gather.player')) +
              '</div>';
          }
        }
      }
      $('#dgPlayers').innerHTML = dgPlayersHtml;
    });
    updateMobDisplay(a);
    $('#dgGoldCounter').textContent = '💰 0';
    dgInvCat = 'all';
    renderDgInv();
    renderBossQueue();
    updateAutoBtn();
    openMB('dungeonModal');
    $('#dgSubtitle').textContent = t('dg.floor_prefix') + (a.floorIdx + 1) + ' ' + FLOOR_NAMES[a.floorIdx] + ' · ' + t('dg.active');
  }

  function updateMobDisplay(a) {
    if (!a) return;
    const sprite = $('#dgMobSprite');
    const bio = BIOMOBS[a.theme] || {};
    const mobInfo = bio[a.floorIdx + 1] || { n: 'Mob', boss: 'Boss' };
    const isBoss = !!a.fightingBoss;
    sprite.classList.remove('dead');
    sprite.innerHTML = MOBSVG[a.floorIdx + 1] || '<span style="font-size:60px">' + (isBoss ? '👹' : '🐺') + '</span>';
    $('#dgMobName').textContent = isBoss ? t(mobInfo.boss) : t(mobInfo.n);
    const fcp = DUN.floorCP(a.floorIdx, a.tier);
    const enemyCP = isBoss ? Math.round(fcp * 1.5) : Math.round(fcp * 0.5);
    $('#dgMobCP').textContent = fmt(enemyCP) + ' CP';
    $('#dgMobStatus').textContent = isBoss ? '👹 Boss!' : t('dg.fighting');
  }

  function renderBossQueue() {
    var a = DUN.getActive();
    if (!a) return;
    var queue = DUN.getBossQueue();
    var container = $('#dgBossQueue');
    if (!container) return;
    if (!queue.length) { container.innerHTML = ''; return; }
    var bio = BIOMOBS[a.theme] || {};
    var mobInfo = bio[a.floorIdx + 1] || { boss: 'Boss' };
    var html = '';
    for (var i = 0; i < queue.length; i++) {
      html += '<div class="dg-boss-bubble" data-act="fightboss" data-bid="' + queue[i].id + '">';
      html += '<div class="dg-boss-ico">👹</div>';
      html += '<div class="dg-boss-name">' + t(mobInfo.boss) + '</div>';
      html += '</div>';
    }
    container.innerHTML = html;
  }

  function renderGatherInv() {
    var grid = $('#gInvGrid');
    if (!grid) return;
    var list = buildBagList();
    var html = '';
    for (var i = 0; i < list.length; i++) {
      var o = list[i];
      var tier = o.tier > 0 ? '<span class="slot-tier t' + o.tier + '">' + TIER_ROMAN[o.tier] + '</span>' : '';
      var count = o.count > 1 ? '<span class="slot-count">' + (o.count > 99 ? '99+' : o.count) + '</span>' : '';
      var enh = (o.ref && !o.ref.t0) ? '<span class="slot-count" style="font-size:7px;color:' + (o.enh > 0 ? 'var(--goldlit)' : 'var(--textdim)') + '">%' + (o.enh || 0) + '</span>' : '';
      html += '<div class="slot ' + RAR_CLS[o.rar] + tierClass(o.tier) + (o.ref ? enhClass(o.ref.enh || 0) : '') + '" data-act="bagselect" data-id="' + o.id + '"><div class="slot-inner">' + o.svg + '</div>' + tier + count + enh + '</div>';
    }
    var cap = S.invCap();
    var pad = Math.max(0, Math.min(cap - list.length, 18));
    for (var k = 0; k < pad; k++) html += '<div class="slot empty"><div class="slot-inner">' + (ICON.empty_sword || '') + '</div></div>';
    grid.innerHTML = html;
    var countEl = $('#gInvCount');
    if (countEl) countEl.textContent = list.length + '/' + S.invCap();
  }
  function renderDgInv() {
    const grid = $('#dgInvGrid');
    if (!grid) return;
    const list = buildBagList();
    let html = '';
    for (var i = 0; i < list.length; i++) {
      var o = list[i];
      var tier = o.tier > 0 ? '<span class="slot-tier t' + o.tier + '">' + TIER_ROMAN[o.tier] + '</span>' : '';
      var count = o.count > 1 ? '<span class="slot-count">' + (o.count > 99 ? '99+' : o.count) + '</span>' : '';
      var enh = (o.ref && !o.ref.t0) ? '<span class="slot-count" style="font-size:7px;color:' + (o.enh > 0 ? 'var(--goldlit)' : 'var(--textdim)') + '">%' + (o.enh || 0) + '</span>' : '';
      html += '<div class="slot ' + RAR_CLS[o.rar] + tierClass(o.tier) + (o.ref ? enhClass(o.ref.enh || 0) : '') + '" data-act="bagselect" data-id="' + o.id + '"><div class="slot-inner">' + o.svg + '</div>' + tier + count + enh + '</div>';
    }
    // empty slot padding
    var cap = S.invCap();
    var pad = Math.max(0, Math.min(cap - list.length, 18));
    for (var k = 0; k < pad; k++) html += '<div class="slot empty"><div class="slot-inner">' + (ICON.empty_sword || '') + '</div></div>';
    grid.innerHTML = html;
    var countEl = $('#dgInvCount');
    if (countEl) countEl.textContent = list.length + '/' + S.invCap();
  }

  function addDungeonLoot(loot, isBoss) {
    dunSummary.gold += loot.gold;
    if (isBoss) dunSummary.bossKills++;
    else dunSummary.kills++;
    dunSummary.items += loot.items.length;
    if (loot.stones > 0) dunSummary.stones += loot.stones;
    if (loot.charm) dunSummary.charms++;
    // Show rare drop banner
    for (var i = 0; i < loot.items.length; i++) {
      if (loot.items[i].rarity >= 3) showRareDropBanner(loot.items[i]);
    }
    // Update counters
    $('#dgGoldCounter').textContent = '💰 ' + fmt(dunSummary.gold);
    $('#dgKillCount').textContent = (dunSummary.kills + dunSummary.bossKills) + ' kill';
    // Refresh real inventory display
    renderDgInv();
  }

  function dungeonMobDeath() {
    const sprite = $('#dgMobSprite');
    if (sprite) sprite.classList.add('dead');
    // after delay, revive
    setTimeout(() => {
      const a = DUN.getActive();
      if (a && sprite) {
        sprite.classList.remove('dead');
        updateMobDisplay(a);
      }
    }, 800);
  }

  function fightTickUI() {
    const a = DUN.getActive(); if (!a) return;
    const bar = $('#dgFightFill');
    if (bar) bar.style.width = Math.min(100, a.fightProgress / a.fightDur * 100) + '%';
  }

  function showDungeonSummary() {
    const s = dunSummary;
    let html = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
      <div class="kv"><span class="k">Kills</span><span class="vv">${s.kills}</span></div>
      <div class="kv"><span class="k">Boss Kills</span><span class="vv">${s.bossKills}</span></div>
      <div class="kv"><span class="k">Gold</span><span class="vv" style="color:var(--goldlit)">${fmt(s.gold)} 💰</span></div>
      <div class="kv"><span class="k">Items</span><span class="vv">${s.items}</span></div>
      <div class="kv"><span class="k">${t('war.stone_count')}</span><span class="vv">${s.stones}</span></div>
      <div class="kv"><span class="k">${t('enh.charm')}</span><span class="vv">${s.charms}</span></div>
    </div>`;
    $('#dungeonSumBody').innerHTML = html;
    openMB('dungeonSumModal');
  }

  function updateAutoBtn() {
    const btn = $('#dgAutoBtn');
    if (!btn) return;
    btn.textContent = dunAutoOn ? 'Auto ON' : 'Auto OFF';
    btn.classList.toggle('off', !dunAutoOn);
  }

  function isDunAutoOn() { return dunAutoOn; }
  function toggleDunAuto() { dunAutoOn = !dunAutoOn; updateAutoBtn(); }
  function getDunExpanded() { return dunExpanded; }
  function setDunExpanded(i) { dunExpanded = (dunExpanded === i) ? -1 : i; }
  function setDunBiome(b) { dunBiome = b; }
  function getDunSummary() { return dunSummary; }

  // keep old name compatibility stubs
  function renderDungeonList() { renderDungeonSelect(); }
  function renderFight() { enterDungeonView(); }
  function pushFightLog() {} // no-op, replaced by visual loot

  // ---------- TRAVEL MODAL ----------
  let travelTarget = null;
  function openTravel(zid) {
    const z = W.zone(zid); if (!z) return;
    travelTarget = zid;
    const cur = W.curZone();
    const here = zid === cur.id;
    $('#trTitle').textContent = z.name;
    $('#trSub').textContent = here ? t('travel.here') : t('travel.option');
    $('#trPreview').style.backgroundImage = imgUrl(ZONE_IMG[zid]);
    $('#trName').textContent = z.name;
    const pvp = z.pvp || (z.kind === 'city' ? 'safe' : 'safe');
    const pvpTxt = pvp === 'red' ? t('travel.pvp_red') : pvp === 'blue' ? t('travel.pvp_blue') : t('travel.pvp_safe');
    const travelT = here ? 0 : W.travelTime(cur, z);
    const resTxt = z.kind === 'city' ? t('travel.city_res') : (z.biome ? biomeRes(z.biome) : '—');
    $('#trInfo').innerHTML = `
      <div class="row"><span>${t('travel.tier')}</span><b>${z.kind === 'city' ? t('travel.capital') : ROMAN[z.tier]}</b></div>
      <div class="row"><span>${t('travel.pvp')}</span><b>${pvpTxt}</b></div>
      <div class="row"><span>${t('travel.distance')}</span><b>${here ? t('travel.here_upper') : '~' + travelT + ' ' + t('travel.sec')}</b></div>
      <div class="row"><span>${t('travel.resource')}</span><b>${resTxt}</b></div>`;
    const act = $('#trAction');
    if (here) { act.classList.add('disabled'); act.textContent = t('travel.here_btn'); }
    else { act.classList.remove('disabled'); act.textContent = t('travel.go'); }
    openMB('travelModal');
  }
  function biomeRes(biome) {
    const dist = D.BIOME_DIST[biome];
    const top = Object.entries(dist).sort((a, b) => b[1] - a[1]).slice(0, 2).map(e => D.FAMILY_LABEL[e[0]]);
    return top.join(' · ');
  }
  function getTravelTarget() { return travelTarget; }

  // ---------- SHEET MODAL (çanta/atölye/banka/pazar/item) ----------
  function openSheet(title, sub, body) {
    $('#sheetTitle').innerHTML = title;
    $('#sheetSub').textContent = sub || '';
    $('#sheetBody').innerHTML = body;
    openMB('sheetModal');
  }

  // ============ ÇANTA EKRANI (skyzone-canta.html mockup) ============
  const ICON = window.SKY_ICON || {};
  // Add enhancement stone SVGs to icon map
  var ENH_SVG = window.SKY_ENH_STONES || {};
  if (ENH_SVG.s3) ICON.stoneS3 = ENH_SVG.s3;
  if (ENH_SVG.s6) ICON.stoneS6 = ENH_SVG.s6;
  if (ENH_SVG.s9) ICON.stoneS9 = ENH_SVG.s9;
  if (ENH_SVG.s12) ICON.stoneS12 = ENH_SVG.s12;
  if (ENH_SVG.s15) ICON.stoneS15 = ENH_SVG.s15;
  if (ENH_SVG.charm_break) ICON.charmBreak = ENH_SVG.charm_break;
  if (ENH_SVG.charm_drop) ICON.charmDrop = ENH_SVG.charm_drop;
  ICON.mountBox = '<svg viewBox="0 0 32 32"><defs><linearGradient id="mb1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#7a4a1a"/><stop offset="100%" stop-color="#4a2a0a"/></linearGradient></defs><rect x="3" y="13" width="26" height="16" rx="2" fill="url(#mb1)" stroke="#9a6a28" stroke-width="1"/><rect x="5" y="13" width="22" height="2.5" fill="#8a5a20"/><path d="M3,13 Q3,7 16,5 Q29,7 29,13" fill="#5a3210" stroke="#9a6a28" stroke-width="1"/><rect x="13" y="8" width="6" height="5" rx="1" fill="#c8a030" stroke="#a08020" stroke-width=".5"/><circle cx="16" cy="20" r="3" fill="#e8c050" opacity=".4"/><circle cx="16" cy="20" r="1.5" fill="#ffe080" opacity=".5"/><text x="16" y="22" text-anchor="middle" font-size="6" fill="#e8c050" opacity=".6">🐎</text></svg>';
  const RAR_CLS = ['rar-white', 'rar-green', 'rar-blue', 'rar-gold', 'rar-red'];
  function RAR_NAME_F(i) { return t('rar.' + i); }
  const RAR_NAME = new Proxy(['COMMON','UNCOMMON','RARE','EPIC','LEGENDARY'], { get: function(target, prop) { var i = parseInt(prop); return !isNaN(i) && i >= 0 && i <= 4 ? t('rar.' + i) : target[prop]; } });
  const EQ_ICON = { silah: 'sword', kask: 'helmet', zirh: 'armor', pelerin: 'cape', eldiven: 'gloves', bot: 'boots', binek: 'mount', canta: 'bag', alet: 'pickaxe', set: 'net' };
  const TIER_ROMAN = { 1: 'I', 2: 'II', 3: 'III' };
  function miscName(k) { return t('misc.' + k); }
  function miscDesc(k) { return t('misc.' + k + '_desc'); }
  const MISC_META = {
    stone3: { icon: 'stoneS3', rar: 0, get name() { return t('misc.stone3'); }, get desc() { return t('misc.stone3_desc'); } },
    stone6: { icon: 'stoneS6', rar: 1, get name() { return t('misc.stone6'); }, get desc() { return t('misc.stone6_desc'); } },
    stone9: { icon: 'stoneS9', rar: 2, get name() { return t('misc.stone9'); }, get desc() { return t('misc.stone9_desc'); } },
    stone12: { icon: 'stoneS12', rar: 3, get name() { return t('misc.stone12'); }, get desc() { return t('misc.stone12_desc'); } },
    stone15: { icon: 'stoneS15', rar: 4, get name() { return t('misc.stone15'); }, get desc() { return t('misc.stone15_desc'); } },
    charm_break: { icon: 'charmBreak', rar: 4, get name() { return t('misc.charm_break'); }, get desc() { return t('misc.charm_break_desc'); } },
    charm_drop: { icon: 'charmDrop', rar: 3, get name() { return t('misc.charm_drop'); }, get desc() { return t('misc.charm_drop_desc'); } },
    charm_color: { icon: 'charm', rar: 2, get name() { return t('misc.charm_color'); }, get desc() { return t('misc.charm_color_desc'); } },
    enhChest: { icon: 'enhChest', rar: 3, get name() { return t('misc.enhChest'); }, get desc() { return t('misc.enhChest_desc'); }, isChest: true },
    goldChest: { icon: 'goldChest', rar: 2, get name() { return t('misc.goldChest'); }, get desc() { return t('misc.goldChest_desc'); }, isChest: true },
    mountBox: { icon: 'mountBox', rar: 3, get name() { return t('misc.mountBox'); }, get desc() { return t('misc.mountBox_desc'); }, isChest: true },
  };

  let bagCat = 'all', bagSel = null, bagSort = false, statsOpen = false;

  // ---- perk kalite (1-5 skala, rarity renkleriyle) ----
  const QBANDS_COLORS = ['#d7d0c0', '#5fb45e', '#5b96d8', '#e2913c', '#d95a49'];
  function qbandAt(i) { return { min: i+1, max: i+1, c: QBANDS_COLORS[i], get n() { return t('qual.' + (i+1)); } }; }
  const QBANDS = [qbandAt(0), qbandAt(1), qbandAt(2), qbandAt(3), qbandAt(4)];
  const PIPCOL = ['#d7d0c0', '#5fb45e', '#5b96d8', '#e2913c', '#d95a49'];
  function qMeta(q) { return QBANDS[Math.max(0, Math.min(4, q - 1))]; }
  function effLabel(perk) {
    var k = 'perk.' + perk.eff;
    var v = t(k);
    return v !== k ? v : perk.eff;
  }
  function renderPerkRows(item) {
    if (!item.perks || !item.perks.length) return '';
    const rows = item.perks.map(p => {
      const q = E.perkQuality(p, item.rarity);
      const m = qMeta(q);
      const pips = PIPCOL.map((c, i) => `<div class="pip" style="${(i + 1) <= q ? 'background:' + c + ';box-shadow:0 0 5px ' + c + '55' : ''}"></div>`).join('');
      const down = effLabel(p).includes('↓');
      const lbl = effLabel(p).replace(' ↓', '');
      return `<div class="prow" style="border-left-color:${m.c}">
        <div class="picon">${p.icon}</div>
        <div class="pmid">
          <div class="pname">${p.name}</div>
          <div class="peff"><span class="val" style="color:${m.c}">${down ? '−' : '+'}%${p.val}</span> <span class="lbl">${lbl}</span></div>
          <div class="pips">${pips}</div>
        </div>
        <div class="pright"><div class="qnum" style="color:${m.c}">${q}<small>/5</small></div><div class="qlabel" style="color:${m.c}">${m.n}</div></div>
      </div>`;
    }).join('');
    const avg = item.perks.reduce((s, p) => s + E.perkQuality(p, item.rarity), 0) / item.perks.length;
    const om = qMeta(Math.round(avg));
    const overall = `<div class="dock-overall">${t('qual.avg')}: <b style="color:${om.c}">${avg.toFixed(1)} · ${om.n}</b></div>`;
    return overall + '<div class="perklist">' + rows + '</div>';
  }

  const EQIC = window.SKY_EQICON || {};
  // alet türü: balta=odun, kazma=cevher/tas, olta=balik — hepsi 'alet' olarak craft ediliyor
  const ALET_MAP = { alet: 'kazma' };
  function enhClass(enh) { return enh >= 90 ? ' enh90' : enh >= 60 ? ' enh60' : enh >= 30 ? ' enh30' : ''; }
  function tierClass(tier) { return tier > 0 ? ' tier-' + tier : ''; }
  // Equipment type → ICONS key mapping
  var _EQMAP = {silah:'sword',kask:'helmet',zirh:'armor',pelerin:'cape',eldiven:'gloves',bot:'boots',binek:'mount',canta:'bag',kazma:'tool',balta:'tool',olta:'tool',set:'gatherset',alet:'tool'};
  function eqEmoji(item) {
    // mount items (kind: 'mount') always use binek icons
    const type = (item.kind === 'mount') ? 'binek' : item.type;
    const tier = item.tier || 1;
    // Try dynamic ICONS generators first (Item Sistemi Belgesi palette)
    var dynKey = _EQMAP[type] || _EQMAP[ALET_MAP[type]] || type;
    var GI = window.ICONS, EP = window.SKY_EQPAL;
    if (GI && GI[dynKey] && EP && EP[tier]) {
      return '<svg viewBox="0 0 120 120">' + GI[dynKey](EP[tier]) + '</svg>';
    }
    // Fallback to pre-baked tier SVGs
    const eqKey = type === 'pelerin' ? 'cape' : (ALET_MAP[type] || type);
    const tierArr = EQIC[eqKey];
    if (tierArr) {
      const ti = Math.max(0, Math.min(2, tier - 1));
      return tierArr[ti];
    }
    return ICON[EQ_ICON[type]] || ('<span style="font-size:26px">' + (item.icon || '🐎') + '</span>');
  }

  // birleşik çanta listesi
  function buildBagList() {
    const P = S.get();
    const list = [];
    for (const it of P.equipItems) list.push({
      id: 'eqi:' + it.id, cat: 'equip', rar: it.rarity, tier: it.tier, count: 1,
      name: it.name, svg: eqEmoji(it), enh: it.enh, ref: it, kind: 'equip',
    });
    // consumables grouped
    const groups = {};
    for (const c of P.consumables) {
      const key = c.type + ':' + c.buff + ':' + c.rarity + ':' + c.tier;
      if (!groups[key]) groups[key] = { ids: [], c };
      groups[key].ids.push(c.id);
    }
    for (const k in groups) {
      const c = groups[k].c; const def = D.BUFFS[c.buff];
      list.push({
        id: 'use:' + k, cat: 'use', rar: c.rarity, tier: c.tier, count: groups[k].ids.length,
        name: (c.type === 'yemek' ? '🍖 ' : '🧪 ') + def.name, svg: ICON[c.type === 'yemek' ? 'potionG' : 'potionR'],
        ids: groups[k].ids, kind: 'use', desc: (c.type === 'yemek' ? t('cons.food') : t('cons.potion')) + ' · ' + def.name + ' buff',
      });
    }
    // mats
    for (const key in P.mats) {
      if (P.mats[key] <= 0) continue;
      const p = E.parseMatKey(key);
      list.push({
        id: 'mat:' + key, cat: 'raw', rar: p.rarity, tier: p.tier, count: P.mats[key],
        name: D.MAT_NAMES[p.family][p.tier - 1], svg: matSVG(p.family, p.tier), matKey: key, kind: 'mat',
        desc: D.FAMILY_LABEL[p.family] + ' ' + t('mat.family_suffix') + ' · T' + p.tier + ' ' + t('mat.craft_mat'),
      });
    }
    // misc
    for (const mk in MISC_META) {
      const cnt = P.misc[mk] || 0; if (cnt <= 0) continue;
      const m = MISC_META[mk];
      list.push({ id: 'misc:' + mk, cat: 'misc', rar: m.rar, tier: 0, count: cnt, name: m.name, svg: ICON[m.icon], miscKey: mk, kind: 'misc', desc: m.desc });
    }
    if (bagSort) {
      const co = { equip: 0, use: 1, raw: 2, misc: 3 };
      list.sort((a, b) => (co[a.cat] - co[b.cat]) || (b.rar - a.rar) || (b.tier - a.tier));
    }
    return list;
  }

  function openBag() { bagSel = null; bagCat = 'all'; renderBag(); openMB('bagModal'); }

  function renderBag() {
    const P = S.get();
    $('#bagName').textContent = P.name;
    // ağırlık & slot barları (kompakt)
    const wUsed = S.carryUsed(), wCap = S.carryCap();
    const sUsed = S.invUsed(), sCap = S.invCap();
    const wPct = Math.min(100, wUsed / wCap * 100), sPct = Math.min(100, sUsed / sCap * 100);
    $('#wFill').style.width = wPct + '%'; $('#sFill').style.width = sPct + '%';
    const wf = $('#wFill'); wf.style.background = wPct > 85 ? 'linear-gradient(90deg,#c84030,#e87040)' : wPct > 60 ? 'linear-gradient(90deg,#c89030,#e8c050)' : 'linear-gradient(90deg,#5aaa3a,#8ad048)';
    $('#wNum').textContent = fmt(wUsed) + '/' + fmt(wCap);
    $('#wNum').style.color = wPct > 85 ? '#e87040' : wPct > 60 ? '#e8c050' : '#8ad048';
    $('#sNum').textContent = sUsed + '/' + sCap + ' (' + t('bag.slot_label') + ' ' + S.invBagCount() + '/' + S.MAX_SLOTS + ')';
    $('#goldVal').textContent = fmt(P.gold) + ' 💰';
    var sGoldEl = $('#sGold'); if (sGoldEl) sGoldEl.textContent = fmt(P.gold);
    // statlar
    renderCharStats();
    // kuşanım paperdoll
    renderEquipDoll();
    // grid
    renderBagGrid();
    // tabs
    $$('#bagTabs .tab').forEach(t => t.classList.toggle('on', t.dataset.cat === bagCat));
  }

  function renderCharStats() {
    const P = S.get();
    const eq = P.equipped;
    const buffs = S.activeBuffMap();
    // temel CP'ler
    const baseCP = E.baseCP(eq);
    const pveCP = E.computeCP(eq, { target: 'mob', buffs });
    const pvpCP = E.computeCP(eq, { target: 'pvp', buffs });
    const bossCP = E.computeCP(eq, { target: 'boss', buffs });
    // cape
    const cs = E.capeStats(eq);
    // toplama
    const gs = E.gatherStats(eq, buffs);
    // savaş süresi kısaltma
    const combatCut = E.sumPerk(eq, 'combattime') + (buffs.combattime || 0);
    // seyahat hızı
    const travelBonus = E.sumPerk(eq, 'travel');
    // altın/drop bonusları
    const goldBonus = E.sumPerk(eq, 'gold') + (buffs.gold || 0);
    const itemDrop = E.sumPerk(eq, 'itemdrop') + (buffs.itemdrop || 0);

    const row = (icon, label, val, color) => `<div style="display:flex;align-items:center;justify-content:space-between;padding:2px 0;font-size:10px"><span style="color:var(--textdim)">${icon} ${label}</span><span style="font-family:'JetBrains Mono',monospace;font-weight:700;color:${color || 'var(--textlit)'}">${val}</span></div>`;

    const el = $('#bagStats');
    if (!el) return;
    el.innerHTML = `
      <div data-act="togglestats" style="background:rgba(0,0,0,.3);border:1px solid var(--border);border-radius:8px;padding:6px 10px;cursor:pointer;user-select:none">
        <div style="font-family:Cinzel,serif;font-size:9px;letter-spacing:2px;color:var(--gold);text-transform:uppercase;font-weight:700;display:flex;align-items:center;gap:5px">
          <span>⚡ ${fmt(baseCP)} CP</span>
          <span style="flex:1"></span>
          <span style="font-size:8px;color:var(--textdim);letter-spacing:1px" id="statsToggleLbl">${statsOpen ? '▲' : '▼'} ${t('stat.stats')}</span>
        </div>
        <div id="statsContent" style="display:${statsOpen ? 'block' : 'none'};margin-top:6px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 12px">
          ${row('⚡', t('stat.general_cp'), fmt(baseCP), 'var(--goldlit)')}
          ${row('🐺', t('stat.pve_cp'), fmt(pveCP))}
          ${row('⚔️', t('stat.pvp_cp'), fmt(pvpCP))}
          ${row('👑', t('stat.boss_cp'), fmt(bossCP))}
          ${row('💥', t('stat.crit'), cs.crit.toFixed(1) + '%', cs.crit > 0 ? '#e04040' : 'var(--textdim)')}
          ${row('💨', t('stat.dodge'), cs.dodge.toFixed(1) + '%', cs.dodge > 0 ? '#5b96d8' : 'var(--textdim)')}
          ${row('🦋', t('stat.cape_proc'), cs.proc.toFixed(0) + '%', cs.proc > 0 ? '#9a4ad8' : 'var(--textdim)')}
          ${row('⏱️', t('stat.combat_time'), combatCut > 0 ? '-' + combatCut.toFixed(0) + '%' : '0%', combatCut > 0 ? '#5aaa3a' : 'var(--textdim)')}
          ${row('⛏️', t('stat.gather_speed'), gs.toolSpeed.toFixed(1) + '/dk')}
          ${row('🌾', t('stat.yield'), '+' + gs.yieldp.toFixed(0) + '%', gs.yieldp > 0 ? '#5aaa3a' : 'var(--textdim)')}
          ${row('🍀', t('stat.double_chance'), gs.double.toFixed(0) + '%', gs.double > 0 ? '#5fb45e' : 'var(--textdim)')}
          ${row('💰', t('stat.gold_bonus'), '+' + goldBonus.toFixed(0) + '%', goldBonus > 0 ? '#e8c050' : 'var(--textdim)')}
          ${row('🏃', t('stat.travel_speed'), '+' + travelBonus.toFixed(0) + '%', travelBonus > 0 ? '#6aaaf0' : 'var(--textdim)')}
          ${row('🎁', t('stat.item_drop'), '+' + itemDrop.toFixed(0) + '%', itemDrop > 0 ? '#e2913c' : 'var(--textdim)')}
        </div>
        </div>
      </div>`;
  }

  function renderEquipDoll() {
    const P = S.get();
    var labels = {}; for (var _es of D.EQUIP_SLOTS) labels[_es] = t('eq.' + _es);
    let html = '';
    for (const sl of D.EQUIP_SLOTS) {
      const it = P.equipped[sl];
      if (it) {
        const rc = it.t0 ? 0 : it.rarity;
        const tier = it.tier > 0 ? `<span class="slot-tier t${it.tier}">${TIER_ROMAN[it.tier]}</span>` : '';
        const sel = bagSel === 'eq:' + sl ? ' sel' : '';
        html += `<div class="eq-cell"><div class="slot ${RAR_CLS[rc]}${tierClass(it.tier)}${enhClass(it.enh)}${sel}" data-act="bagselect" data-id="eq:${sl}"><div class="slot-inner">${eqEmoji(it)}</div>${tier}<span class="slot-enh">${it.t0 ? '' : '%' + (it.enh || 0)}</span></div><div class="eq-name">${labels[sl]}</div></div>`;
      } else {
        html += `<div class="eq-cell"><div class="slot empty"><div class="slot-inner">${ICON[EQ_ICON[sl]] || ICON.empty_sword}</div></div><div class="eq-name">${labels[sl]}</div></div>`;
      }
    }
    $('#equipGrid').innerHTML = html;
  }

  function renderBagGrid() {
    const list = buildBagList().filter(o => bagCat === 'all' || o.cat === bagCat);
    let html = '';
    if (!list.length) html = '<div class="empty-bag">' + t('bag.empty') + '</div>';
    for (const o of list) {
      const tier = o.tier > 0 ? `<span class="slot-tier t${o.tier}">${TIER_ROMAN[o.tier]}</span>` : '';
      const count = o.count > 1 ? `<span class="slot-count">${o.count > 99 ? '99+' : o.count}</span>` : '';
      const enh = (o.ref && !o.ref.t0) ? `<span class="slot-count" style="font-size:7px;color:${o.enh > 0 ? 'var(--goldlit)' : 'var(--textdim)'}">%${o.enh || 0}</span>` : '';
      const sel = bagSel === o.id ? ' sel' : '';
      html += `<div class="slot ${RAR_CLS[o.rar]}${tierClass(o.tier)}${o.ref ? enhClass(o.ref.enh || 0) : ''}${sel}" data-act="bagselect" data-id="${o.id}"><div class="slot-inner">${o.svg}</div>${tier}${count}${enh}</div>`;
    }
    // boş slot doldur (görsel kapasite)
    const cap = bagCat === 'all' ? S.invCap() : 0;
    const pad = Math.max(0, Math.min(cap - list.length, 20));
    for (let k = 0; k < pad; k++) html += `<div class="slot empty"><div class="slot-inner">${ICON.empty_sword}</div></div>`;
    $('#bagGrid').innerHTML = html;
    $('#footCount').textContent = list.length + ' ' + t('bag.item_count') + ' · ' + ({ all: t('bag.all'), equip: t('bag.equip'), raw: t('bag.raw'), use: t('bag.use'), misc: t('bag.misc') }[bagCat]);
    // Dungeon envanter de güncelle (açıksa)
    if ($('#dungeonModal.active') && $('#dgInvGrid')) renderDgInv();
    if ($('#gatherModal.active') && $('#gInvGrid')) renderGatherInv();
  }

  function findBagEntry(id) {
    if (id.startsWith('eq:')) {
      const slot = id.slice(3); const it = S.get().equipped[slot];
      if (!it) return null;
      const rc = it.t0 ? 0 : it.rarity;
      return { id, cat: 'equipped', rar: rc, tier: it.tier, count: 1, name: it.name, svg: eqEmoji(it), enh: it.enh, ref: it, slot, kind: 'equipped', perks: it.perks, desc: it.t0 ? t('common.starter') : '' };
    }
    return buildBagList().find(o => o.id === id) || null;
  }

  // ---- item popover (item'ın üstünde açılan küçük pencere) ----
  function buildPopContent(o) {
    const tier = o.tier > 0 ? `<span class="slot-tier t${o.tier}">${TIER_ROMAN[o.tier]}</span>` : '';
    let meta = RAR_NAME[o.rar] + (o.tier ? ' · T' + o.tier : '');
    let base = '';
    if (o.ref && o.ref.kind === 'mount') {
      // Mount: no ATK/DEF base line — mount info shown in dedicated block below
    } else if (o.ref && o.ref.perks) {
      const cpVal = E.itemCP(o.ref); const bits = [];
      const enhV = o.ref.enh || 0;
      if (cpVal) { const b = enhV ? Math.round(cpVal * enhV / 100) : 0; bits.push('CP +' + cpVal.toFixed(0) + (b ? ' <span style="color:var(--goldlit)">(+' + b + ')</span>' : '')); }
      if (o.ref.stats && o.ref.stats.weight) bits.push(t('item.carry') + ' +' + o.ref.stats.weight);
      if (o.ref.stats && o.ref.stats.speed) bits.push(t('item.speed') + ' ' + o.ref.stats.speed + '/dk');
      if (o.ref.stats && o.ref.stats.yieldp) bits.push('Yield +' + o.ref.stats.yieldp + '%');
      if (bits.length) base = `<div class="ip-base">${bits.join(' · ')}${enhV ? ' · <span style="color:var(--goldlit)">%' + enhV + '</span>' : ''}</div>`;
    }
    let body = '';
    if (o.ref && o.ref.kind === 'mount') {
      // Mount: skip normal perk rendering, show mount stats below
    } else if (o.ref && o.ref.perks && o.ref.perks.length) body = renderPerkRows(o.ref);
    else if (o.ref && o.ref.perks) body = '<div class="ip-desc">' + t('common.no_perk') + ' (' + t('common.starter') + ').</div>';
    else if (o.desc) body = `<div class="ip-desc">${o.desc}${o.count > 1 ? ' · ' + o.count + ' ' + t('item.pcs') : ''}</div>`;
    // mount data display (new: mount stats are on the item directly)
    if (o.ref && o.ref.kind === 'mount') {
      var md = o.ref;
      var mt = D.MOUNT_TYPES[md.mountType];
      var stars = function(n) { var s = ''; for (var si = 0; si < 5; si++) s += si < n ? '★' : '☆'; return s; };
      body += '<div style="margin-top:6px;padding:8px 10px;background:rgba(0,0,0,.3);border:1px solid var(--border);border-radius:8px">';
      body += '<div style="font-family:Cinzel,serif;font-size:9px;letter-spacing:1px;color:var(--gold);text-transform:uppercase;font-weight:700;margin-bottom:6px">' + (mt ? mt.name : t('item.mount')) + '</div>';
      body += '<div style="font-size:10px;color:var(--textlit);line-height:1.8">';
      body += '<div>⚡ ' + t('mount.speed') + ': <span style="color:var(--goldlit)">' + stars(md.hizStar || 0) + '</span> <span style="font-family:JetBrains Mono;font-size:9px;color:var(--safe)">+' + (md.hiz || 0) + '%</span></div>';
      body += '<div>⚖️ ' + t('mount.weight') + ': <span style="color:var(--goldlit)">' + stars(md.agirlikStar || 0) + '</span> <span style="font-family:JetBrains Mono;font-size:9px;color:var(--safe)">+' + (md.agirlik || 0) + '</span></div>';
      if (md.ozelLabel) {
        body += '<div>' + (md.ozel === 'invslot' ? '🎒' : '⚔️') + ' ' + md.ozelLabel + ': <span style="color:var(--goldlit)">' + stars(md.ozelStar || 0) + '</span> <span style="font-family:JetBrains Mono;font-size:9px;color:var(--safe)">' + (md.ozel === 'invslot' ? '+1 Slot' : '+' + (md.ozel || 0)) + '</span></div>';
      }
      if (md.redStat) {
        body += '<div style="color:#e04040;font-weight:700;margin-top:4px;padding:3px 6px;background:rgba(224,64,64,.1);border:1px solid rgba(224,64,64,.3);border-radius:4px">🔴 ' + t('mount.red_stat') + ': +' + (md.redStatVal || 5) + '% CP</div>';
      }
      body += '</div></div>';
    }
    // aksiyonlar
    let acts = '';
    if (o.kind === 'equipped') { if (!o.ref.t0) acts += `<div class="act ghost" data-act="bagunequip" data-t="${o.slot}">${t('bag.unequip_btn')}</div>`; else acts += `<div class="act ghost" data-act="bagnote">${t('bag.drag_hint')}</div>`; }
    else if (o.ref && o.ref.kind === 'mountbox') { acts += `<div class="act primary" data-act="openmountboxitem" data-id="${o.ref.id}">${t('bag.open_mountbox')}</div><div class="act danger" data-act="bagdrop" data-id="${o.id}">${t('bag.drop_btn')}</div>`; }
    else if (o.ref && o.ref.kind === 'mount') { acts += `<div class="act primary" data-act="mountequip" data-id="${o.ref.id}">${t('bag.mount_equip')}</div><div class="act ghost" data-act="bagsell" data-id="${o.ref.id}">${t('bag.sell_btn')}</div><div class="act danger" data-act="bagdrop" data-id="${o.id}">${t('bag.drop_btn')}</div>`; }
    else if (o.kind === 'equip') { acts += `<div class="act primary" data-act="bagequip" data-id="${o.ref.id}">${t('bag.equip_btn')}</div><div class="act ghost" data-act="bagcompare" data-id="${o.ref.id}" data-type="${o.ref.type}">${t('bag.compare')}</div><div class="act ghost" data-act="bagsell" data-id="${o.ref.id}">${t('bag.sell_btn')}</div>`; if (S.inCity()) acts += `<div class="act ghost" data-act="bagdeposit" data-id="${o.ref.id}">${t('bag.deposit')}</div>`; acts += `<div class="act danger" data-act="bagdrop" data-id="${o.id}">${t('bag.drop_btn')}</div>`; }
    else if (o.kind === 'use') { acts += `<div class="act primary" data-act="baguse" data-ids="${o.ids[0]}">${t('bag.use_btn')}</div><div class="act danger" data-act="bagdrop" data-id="${o.id}">${t('bag.drop_btn')}</div>`; }
    else if (o.kind === 'mat') { acts += `<div class="act ghost" data-act="bagsellmat" data-k="${o.matKey}">${t('bag.sell_mat')}</div>`; if (S.inCity()) acts += `<div class="act ghost" data-act="bagmatdep" data-k="${o.matKey}">🏦</div>`; acts += `<div class="act danger" data-act="bagdrop" data-id="${o.id}">${t('bag.drop_btn')}</div>`; }
    else if (o.kind === 'misc' && MISC_META[o.miscKey] && MISC_META[o.miscKey].isChest) { acts += `<div class="act primary" data-act="openchestmisc" data-k="${o.miscKey}">${t('bag.open_btn')}</div><div class="act danger" data-act="bagdrop" data-id="${o.id}">${t('bag.drop_btn')}</div>`; }
    else if (o.kind === 'misc' && (o.miscKey.startsWith('stone') || o.miscKey.startsWith('charm_'))) { acts += `<div class="act ghost" data-act="bagsellmisc" data-k="${o.miscKey}" data-n="1">${t('bag.sell_one')}</div><div class="act ghost" data-act="bagsellmisc" data-k="${o.miscKey}" data-n="all">${t('bag.sell_all')}</div><div class="act danger" data-act="bagdrop" data-id="${o.id}">${t('bag.drop_btn')}</div>`; }
    else if (o.kind === 'misc') { acts += `<div class="act ghost" data-act="bagnote">${t('bag.used_in_workshop')}</div>`; }
    return `<div class="ip-close" data-act="closepop">✕</div>
      <div class="ip-head">
        <div class="ip-slot ${RAR_CLS[o.rar]}${tierClass(o.tier)}"><div class="slot-inner">${o.svg}</div>${tier}</div>
        <div><div class="ip-name" style="color:${rarColor(o.rar)}">${esc(o.name)}</div><div class="ip-meta">${meta}</div></div>
      </div>${base}${body}<div class="ip-acts">${acts}</div>`;
  }

  // popover'ı bir item rect'ine göre konumlandır (ortak)
  function positionPop(pop, rect) {
    pop.style.left = '0px'; pop.style.top = '0px'; // measure
    const pw = pop.offsetWidth, ph = pop.offsetHeight;
    const cx = rect.left + rect.width / 2;
    let left = Math.max(8, Math.min(window.innerWidth - pw - 8, cx - pw / 2));
    let top, cls;
    if (rect.top - ph - 10 >= 4) { top = rect.top - ph - 10; cls = 'above'; }
    else { top = rect.bottom + 10; cls = 'below'; }
    pop.style.left = left + 'px'; pop.style.top = top + 'px';
    pop.style.setProperty('--ax', (cx - left) + 'px');
    pop.classList.remove('above', 'below'); pop.classList.add(cls);
  }
  function openItemPop(rect) {
    const o = findBagEntry(bagSel);
    const pop = $('#itemPop');
    if (!o || !rect) { closePop(); return; }
    pop.innerHTML = buildPopContent(o);
    pop.classList.add('show');
    positionPop(pop, rect);
  }
  function closePop() { bagSel = null; const p = $('#itemPop'); if (p) p.classList.remove('show'); $$('#bagGrid .slot.sel, #equipGrid .slot.sel').forEach(s => s.classList.remove('sel')); }

  function compareItem(itemId, itemType) {
    var P = S.get();
    var invItem = P.equipItems.find(function(x) { return x.id === itemId; });
    if (!invItem) { toast(t('item.not_found')); return; }
    var eqItem = P.equipped[itemType] || null;

    function statBlock(it) {
      if (!it) return '<div style="text-align:center;padding:20px;color:var(--textdim)">' + t('item.empty_slot') + '</div>';
      var cpVal = E.itemCP(it);
      var enhV = it.enh || 0;
      var rarName = D.RARITY[it.rarity] ? D.RARITY[it.rarity].name : t('item.ordinary');
      var rarCol = D.RARITY[it.rarity] ? D.RARITY[it.rarity].color : '#d7d0c0';
      var h = '<div style="text-align:center;margin-bottom:8px"><div style="font-family:Cinzel,serif;font-size:12px;font-weight:700;color:var(--textlit)">' + esc(it.name) + '</div>';
      h += '<div style="font-size:9px;color:' + rarCol + '">' + rarName + ' · T' + it.tier + (enhV ? ' · %' + enhV : '') + '</div></div>';
      h += '<div style="display:flex;flex-direction:column;gap:3px;font-size:11px">';
      if (cpVal) { var b = enhV ? Math.round(cpVal * enhV / 100) : 0; h += '<div style="display:flex;justify-content:space-between"><span style="color:var(--textdim)">CP</span><span style="color:var(--goldlit)">+' + cpVal.toFixed(0) + (b ? ' <span style=color:var(--goldlit)>(+' + b + ')</span>' : '') + '</span></div>'; }
      if (it.stats && it.stats.weight) h += '<div style="display:flex;justify-content:space-between"><span style="color:var(--textdim)">' + t('item.carry') + '</span><span>+' + it.stats.weight + '</span></div>';
      if (it.stats && it.stats.speed) h += '<div style="display:flex;justify-content:space-between"><span style="color:var(--textdim)">' + t('item.speed') + '</span><span>' + it.stats.speed + '/dk</span></div>';
      h += '</div>';
      if (it.perks && it.perks.length) {
        h += '<div style="margin-top:6px;border-top:1px solid var(--section-border);padding-top:6px">';
        for (var pi = 0; pi < it.perks.length; pi++) {
          var pk = it.perks[pi];
          h += '<div style="font-size:9px;color:var(--textdim);margin-bottom:2px">' + (pk.icon || '✦') + ' ' + pk.name + ' <span style="color:var(--goldlit)">+' + (pk.mag || pk.val || 0) + '</span></div>';
        }
        h += '</div>';
      }
      return h;
    }

    var invTotal = E.itemCP(invItem);
    var eqTotal = eqItem ? E.itemCP(eqItem) : 0;
    var diff = invTotal - eqTotal;
    var diffColor = diff > 0 ? 'var(--safe)' : diff < 0 ? 'var(--danger)' : 'var(--textdim)';
    var diffText = diff > 0 ? '▲ +' + diff.toFixed(0) + ' CP' : diff < 0 ? '▼ ' + diff.toFixed(0) + ' CP' : t('bag.equal');

    var body = '<div style="display:grid;grid-template-columns:1fr auto 1fr;gap:8px;margin-bottom:12px">';
    body += '<div style="background:rgba(0,0,0,.2);border:1px solid var(--section-border);border-radius:10px;padding:10px"><div style="font-size:8px;letter-spacing:1.5px;color:var(--gold);text-transform:uppercase;text-align:center;margin-bottom:6px;font-family:Cinzel,serif">' + t('bag.inventory') + '</div>' + statBlock(invItem) + '</div>';
    body += '<div style="display:flex;align-items:center;justify-content:center;flex-direction:column;gap:4px"><div style="font-size:20px">⚖️</div><div style="font-size:11px;font-weight:700;color:' + diffColor + '">' + diffText + '</div></div>';
    body += '<div style="background:rgba(0,0,0,.2);border:1px solid ' + (eqItem ? 'var(--gold)' : 'var(--section-border)') + ';border-radius:10px;padding:10px"><div style="font-size:8px;letter-spacing:1.5px;color:var(--gold);text-transform:uppercase;text-align:center;margin-bottom:6px;font-family:Cinzel,serif">' + t('common.equipped_label') + '</div>' + statBlock(eqItem) + '</div>';
    body += '</div>';
    body += '<button class="btn full" data-act="bagequip" data-id="' + itemId + '" onclick="SKY.UI.closeMB(\'sheetModal\')">' + t('bag.equip_action') + '</button>';

    closePop(); // close item popover first
    openSheet(t('bag.compare_title'), invItem.type, body);
  }

  function bagSelect(id, rect) {
    if (bagSel === id) { closePop(); renderBag(); return; }
    bagSel = id; renderBag(); openItemPop(rect);
  }
  function setBagCat(c) { bagCat = c; closePop(); renderBag(); }
  function toggleSort() { bagSort = !bagSort; closePop(); renderBag(); }
  function clearBagSel() { closePop(); }

  // ITEM INFO
  function itemInfo(it, eqSlot) {
    const cpVal = E.itemCP(it);
    let stats = '';
    if (cpVal) stats += `<div class="kv"><span class="k">CP</span><span class="vv">${cpVal.toFixed(1)}</span></div>`;
    if (it.stats.weight) stats += `<div class="kv"><span class="k">${t('item.carry')}</span><span class="vv">+${it.stats.weight}</span></div>`;
    if (it.stats.speed) stats += `<div class="kv"><span class="k">${t('item.gather_speed')}</span><span class="vv">${it.stats.speed}/dk</span></div>`;
    if (it.stats.yieldp) stats += `<div class="kv"><span class="k">Yield</span><span class="vv">+${it.stats.yieldp}%</span></div>`;
    if (it.enh) stats += `<div class="kv"><span class="k">${t('item.enhancement')}</span><span class="vv" style="color:var(--goldlit)">+${it.enh}%</span></div>`;
    let perks = it.perks.map(p => `<div class="perk"><span>${p.icon}</span><span>${p.name}</span><span class="pv">+${p.val}%</span></div>`).join('') || '<div class="muted small">' + t('common.no_perk') + '</div>';

    let actions = '';
    if (eqSlot) { if (!it.t0) actions = `<button class="btn full ghost" data-act="unequip" data-t="${eqSlot}">${t('action.unequip')}</button>`; }
    else actions = `<button class="btn full" data-act="equip" data-id="${it.id}">${t('action.equip_btn')}</button>`;
    const body = `<div style="text-align:center;font-size:40px">${it.icon}</div>
      <div style="text-align:center" class="rar-name">T${it.tier} · <span style="color:${rarColor(it.t0 ? 0 : it.rarity)}">${it.t0 ? 'Starter' : D.RARITY[it.rarity].name}</span></div>
      <div class="divider"></div>${stats}<div class="sec-h">${t('item.perks')}</div>${perks}<div class="divider"></div>${actions}`;
    openSheet(esc(it.name), '', body);
  }
  function matInfo(k) {
    const p = E.parseMatKey(k);
    const inCity = S.inCity();
    openSheet(esc(D.MAT_NAMES[p.family][p.tier - 1]), '',
      `<div style="text-align:center">${matSVG(p.family, p.tier)}</div>
       <div class="kv"><span class="k">${t('mat.family')}</span><span class="vv">${D.FAMILY_LABEL[p.family]}</span></div>
       <div class="kv"><span class="k">${t('mat.tier_color')}</span><span class="vv">T${p.tier} · <span style="color:${rarColor(p.rarity)}">${D.RARITY[p.rarity].name}</span></span></div>
       <div class="kv"><span class="k">${t('mat.count')}</span><span class="vv">${S.matCount(k)}</span></div>
       <div class="divider"></div>
       ${inCity ? `<button class="btn full ghost" data-act="matdeposit" data-k="${k}">${t('mat.deposit')}</button>` : '<div class="muted small">' + t('mat.deposit_hint') + '</div>'}`);
  }

  // ATÖLYE
  let atTab = 'craft', craftTier = 1;
  // ============ ATÖLYE (skyzone-craft.html mockup) ============
  let selCraft = 'silah';
  let slotRar = [0, 0, 0]; // her malzeme slotu için seçili rarity index (0=W,1=G,2=B,3=O,4=R)
  const CRAFT_KEYS = Object.keys(D.RECIPES);
  const PCT_KEYS = ['craft.primary', 'craft.secondary', 'craft.tertiary'];
  const RAR_DOT_COL = ['#6a5e4e', '#2a8a1a', '#2a5ab0', '#b89020', '#b82020'];
  const RAR_DOT_LBL = ['B', 'Y', 'M', 'T', 'K'];

  function openAtolye() {
    if (!S.inCity()) { toast(t('craft.only_city')); return; }
    renderAtolye();
    openMB('sheetModal');
  }
  const FAM_IC = { cevher: '⛏️', deri: '🦴', odun: '🪵', tas: '🪨', bitki: '🌿', balik: '🐟' };

  function renderAtolye() {
    const R = D.RECIPES[selCraft];
    const can = C.canCraft(selCraft, craftTier);

    // üst: craft türü yatay scroll strip
    let stripH = '<div style="display:flex;gap:3px;overflow-x:auto;padding-bottom:6px;-webkit-overflow-scrolling:touch">';
    for (const key of CRAFT_KEYS) {
      const r = D.RECIPES[key];
      const on = selCraft === key;
      stripH += `<div data-act="selcraft" data-k="${key}" style="flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:2px;padding:4px 7px;border-radius:7px;cursor:pointer;border:1px solid ${on ? 'var(--gold)' : 'transparent'};${on ? 'background:rgba(200,160,48,.1)' : ''}"><span style="font-size:16px">${r.icon}</span><span style="font-family:Cinzel,serif;font-size:7px;font-weight:700;color:${on ? 'var(--goldlit)' : 'var(--textdim)'};letter-spacing:.3px;white-space:nowrap">${r.name}</span></div>`;
    }
    stripH += '</div>';

    // tier seçici (kompakt)
    let tierH = `<div style="display:flex;gap:4px;margin:8px 0">${[1, 2, 3].map(t =>
      `<div data-act="crafttier" data-t="${t}" style="flex:1;text-align:center;font-family:Cinzel,serif;font-size:10px;font-weight:700;padding:5px;border-radius:6px;cursor:pointer;border:1px solid ${craftTier === t ? 'var(--gold)' : 'var(--border)'};${craftTier === t ? 'color:#0a0705;background:linear-gradient(180deg,var(--goldlit),var(--gold))' : 'color:var(--textdim);background:rgba(0,0,0,.25)'}">T${t}</div>`).join('')}</div>`;

    // reçete kartı (kompakt)
    const eqKey = selCraft === 'pelerin' ? 'cape' : (selCraft === 'alet' ? 'kazma' : selCraft);
    const iconSVG = EQIC[eqKey] ? EQIC[eqKey][Math.min(2, craftTier - 1)] : `<span style="font-size:28px">${R.icon}</span>`;
    const statTxt = R.consumable ? t('craft.buff_item') : R.name + ' T' + craftTier;

    // malzeme satırları + rarity seçici
    // slot sayısı kontrolü
    while (slotRar.length < R.mats.length) slotRar.push(0);
    let matsH = '';
    let canCraftExact = true;
    R.mats.forEach(([fam, amt], mi) => {
      const sr = slotRar[mi]; // seçili rarity index
      const matKey = 'mat:' + fam + ':' + craftTier + ':' + sr;
      // envanter + banka toplam
      const invHave = S.matCount(matKey);
      const bankHave = (S.inCity() && S.bankHere().mats && S.bankHere().mats[matKey]) ? S.bankHere().mats[matKey] : 0;
      const have = invHave + bankHave;
      const full = have >= amt;
      if (!full) canCraftExact = false;
      const fillW = Math.min(100, have / amt * 100);
      // 5 rarity dot (envanter + banka toplam)
      let dots = '';
      for (let ri = 0; ri < 5; ri++) {
        const rKey = 'mat:' + fam + ':' + craftTier + ':' + ri;
        const rInv = S.matCount(rKey);
        const rBank = (S.inCity() && S.bankHere().mats && S.bankHere().mats[rKey]) ? S.bankHere().mats[rKey] : 0;
        const rCnt = rInv + rBank;
        const sel = sr === ri;
        dots += `<div data-act="pickrar" data-si="${mi}" data-ri="${ri}" style="width:18px;height:18px;border-radius:5px;cursor:pointer;border:2px solid ${sel ? '#fff' : 'transparent'};background:${RAR_DOT_COL[ri]};display:flex;align-items:center;justify-content:center;font-size:6px;font-weight:700;color:rgba(0,0,0,.5);${sel ? 'box-shadow:0 0 6px rgba(255,255,255,.3)' : ''}">${rCnt > 0 ? rCnt : ''}</div>`;
      }
      matsH += `<div style="flex:1;min-width:0;background:rgba(0,0,0,.25);border:1px solid ${full ? '#2a6a1a' : '#8a2020'};border-radius:7px;padding:5px;text-align:center">
        <div style="font-family:Cinzel,serif;font-size:7px;letter-spacing:1px;color:var(--golddim);text-transform:uppercase;font-weight:700">${t(PCT_KEYS[mi])} %${Math.round(amt / R.total * 100)}</div>
        <div style="font-size:14px;margin:2px 0">${FAM_IC[fam] || '📦'}</div>
        <div style="font-family:Cinzel,serif;font-size:8px;font-weight:700;color:var(--textlit)">${D.FAMILY_LABEL[fam]}</div>
        <div style="display:flex;gap:2px;justify-content:center;margin:4px 0">${dots}</div>
        <div style="height:4px;border-radius:2px;background:rgba(0,0,0,.5);margin:3px 0;overflow:hidden"><div style="height:100%;width:${fillW}%;border-radius:2px;background:${full ? '#5aaa3a' : '#c84030'}"></div></div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700"><span style="color:${full ? '#8ad048' : '#f08080'}">${have}</span><span style="color:var(--textdim)">/${amt}</span></div>
      </div>`;
    });

    // çıktı rarity = en düşük seçili rarity
    const outRar = Math.min(...slotRar.slice(0, R.mats.length));
    const outRarInfo = D.RARITY[outRar];
    const outPerkCount = outRarInfo.perks;

    let recipeH = `<div style="background:rgba(0,0,0,.28);border:1px solid var(--border);border-radius:10px;padding:10px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <div style="width:40px;height:40px;border-radius:7px;background:#0a0806;border:1px solid var(--borderlit);display:flex;align-items:center;justify-content:center;flex-shrink:0">${iconSVG}</div>
        <div><div style="font-family:Cinzel,serif;font-weight:700;font-size:13px;color:var(--goldlit)">${R.name} T${craftTier}</div><div style="font-size:10px;color:var(--textdim)">${statTxt}</div></div>
      </div>
      <div style="display:flex;gap:6px;margin-bottom:8px">${matsH}</div>
      <div style="display:flex;align-items:center;gap:8px;background:rgba(0,0,0,.3);border:1px solid var(--border);border-radius:7px;padding:6px 10px;margin-bottom:8px">
        <span style="font-family:Cinzel,serif;font-size:8px;letter-spacing:1px;color:var(--textdim);text-transform:uppercase">${t('craft.output')}</span>
        <span style="font-family:Cinzel,serif;font-size:11px;font-weight:700;letter-spacing:1px;color:${outRarInfo.color};text-transform:uppercase">◆ ${outRarInfo.name}</span>
        <span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--textlit);margin-left:auto">${outPerkCount} perk</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <button class="btn sm" data-act="docraft" data-k="${selCraft}" ${canCraftExact ? '' : 'disabled'} style="font-family:'Cinzel',serif;font-size:11px;letter-spacing:2px;padding:8px 18px">${t('craft.do')}</button>
        <span style="font-size:9px;color:var(--textdim);font-style:italic">${t('craft.success')}</span>
      </div>
    </div>`;

    // tabs: Üretim / Yükseltme / Renk
    let tabsH = `<div class="tabrow" style="margin-bottom:8px">
      <div class="tab ${atTab === 'craft' ? 'active' : ''}" data-act="attab" data-t="craft">${t('craft.tab_craft')}</div>
      <div class="tab ${atTab === 'enh' ? 'active' : ''}" data-act="attab" data-t="enh">${t('craft.tab_enh')}</div></div>`;

    let mainBody = '';
    if (atTab === 'craft') mainBody = stripH + tierH + recipeH;
    else mainBody = atEnh();

    $('#sheetTitle').innerHTML = t('craft.title');
    $('#sheetSub').textContent = t('craft.subtitle');
    $('#sheetBody').innerHTML = tabsH + mainBody;
  }
  let enhSelItem = null, enhSelStone = null, enhSelCharm = '';

  function atEnh() {
    const P = S.get();
    const pool = P.equipItems.filter(i => !i.t0).concat(Object.values(P.equipped).filter(i => i && !i.t0));

    // 3 slot: ekipman + taş + koruma
    const itemSlot = enhSelItem ? (() => {
      const it = C.findEquipAnywhere(enhSelItem); if (!it) { enhSelItem = null; return null; } return it;
    })() : null;
    const stoneInfo = enhSelStone ? D.ENH_STONES.find(s => s.p === enhSelStone) : null;

    // ekipman slotu
    let itemSlotH;
    if (itemSlot) {
      itemSlotH = `<div style="width:70px;height:70px;border-radius:12px;background:rgba(0,0,0,.35);border:2px solid var(--borderlit);display:flex;align-items:center;justify-content:center;flex-direction:column;position:relative;cursor:pointer" data-act="enhclearitem">
        <div style="position:absolute;top:-5px;right:-5px;width:16px;height:16px;border-radius:50%;background:var(--danger);color:#fff;font-size:9px;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:2">✕</div>
        <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center">${eqEmoji(itemSlot)}</div>
        <span style="position:absolute;bottom:2px;font-family:'JetBrains Mono',monospace;font-size:8px;font-weight:700;color:${itemSlot.enh >= 60 ? 'var(--danger)' : 'var(--safe)'}">+${itemSlot.enh || 0}%</span>
      </div>`;
    } else {
      itemSlotH = `<div style="width:70px;height:70px;border-radius:12px;background:rgba(0,0,0,.35);border:2px dashed var(--border);display:flex;align-items:center;justify-content:center;flex-direction:column;cursor:pointer" data-act="enhpickitem"><span style="font-size:22px;opacity:.4">⚔️</span><span style="font-size:7px;color:var(--textdim)">${t('enh.item_select')}</span></div>`;
    }

    // taş slotu
    var totalStones = (P.misc.stone3||0)+(P.misc.stone6||0)+(P.misc.stone9||0)+(P.misc.stone12||0)+(P.misc.stone15||0);
    let stoneSlotH;
    if (stoneInfo && (P.misc['stone' + stoneInfo.p] || 0) > 0) {
      stoneSlotH = `<div style="width:70px;height:70px;border-radius:12px;background:rgba(0,0,0,.35);border:2px solid var(--borderlit);display:flex;align-items:center;justify-content:center;flex-direction:column;position:relative;cursor:pointer" data-act="enhclearstone">
        <div style="position:absolute;top:-5px;right:-5px;width:16px;height:16px;border-radius:50%;background:var(--danger);color:#fff;font-size:9px;display:flex;align-items:center;justify-content:center;z-index:2">✕</div>
        <span style="font-size:18px">💎</span><span style="font-family:'JetBrains Mono',monospace;font-size:8px;font-weight:700;color:var(--goldlit)">+${stoneInfo.p}%</span>
      </div>`;
    } else {
      stoneSlotH = `<div style="width:70px;height:70px;border-radius:12px;background:rgba(0,0,0,.35);border:2px dashed var(--border);display:flex;align-items:center;justify-content:center;flex-direction:column;cursor:pointer" data-act="enhpickstone"><span style="font-size:18px;opacity:.4">💎</span><span style="font-size:7px;color:var(--textdim)">${t('enh.stone')}</span></div>`;
    }

    // koruma slotu
    const charmNames = { break: t('enh.charm_break'), drop: t('enh.charm_drop') };
    let charmSlotH;
    if (enhSelCharm) {
      charmSlotH = `<div style="width:70px;height:70px;border-radius:12px;background:rgba(0,0,0,.35);border:2px solid var(--borderlit);display:flex;align-items:center;justify-content:center;flex-direction:column;position:relative;cursor:pointer" data-act="enhclearcharm">
        <div style="position:absolute;top:-5px;right:-5px;width:16px;height:16px;border-radius:50%;background:var(--danger);color:#fff;font-size:9px;display:flex;align-items:center;justify-content:center;z-index:2">✕</div>
        <span style="font-size:18px">${enhSelCharm === 'break' ? '🔴' : '🟡'}</span><span style="font-size:7px;color:var(--textdim)">${charmNames[enhSelCharm]}</span>
      </div>`;
    } else {
      charmSlotH = `<div style="width:70px;height:70px;border-radius:12px;background:rgba(0,0,0,.35);border:2px dashed var(--border);display:flex;align-items:center;justify-content:center;flex-direction:column;cursor:pointer" data-act="enhpickcharm"><span style="font-size:18px;opacity:.4">🛡️</span><span style="font-size:7px;color:var(--textdim)">${t('enh.protection')}</span></div>`;
    }

    // enhancement barı
    let barH = '';
    if (itemSlot) {
      const pct = itemSlot.enh || 0;
      const fillPct = pct / 90 * 100;
      const fillCls = pct >= 80 ? 'background:linear-gradient(90deg,var(--danger),#a01818)' : pct >= 60 ? 'background:linear-gradient(90deg,var(--warn),var(--danger))' : 'background:linear-gradient(90deg,var(--safe),var(--warn))';
      let previewH = '';
      if (stoneInfo) {
        const newPct = Math.min(90, pct + stoneInfo.p);
        previewH = `<div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--safe);text-align:center;margin-top:4px">+${pct}% → <span style="color:var(--goldlit)">+${newPct}%</span> (+${stoneInfo.p})</div>`;
      }
      barH = `<div style="background:rgba(0,0,0,.3);border:1px solid var(--border);border-radius:8px;padding:8px 10px;margin-top:10px">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-family:Cinzel,serif;font-size:9px;letter-spacing:1px;color:var(--textdim);text-transform:uppercase;font-weight:700">${t('enh.current')}</span><span style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:var(--goldlit)">+${pct}%</span></div>
        <div style="height:8px;border-radius:4px;background:#1a1610;border:1px solid #2a2218;overflow:hidden"><div style="height:100%;border-radius:3px;width:${fillPct}%;${fillCls}"></div></div>
        ${previewH}
      </div>`;
      // uyarı
      if (pct >= 60) {
        barH += `<div style="background:rgba(224,64,64,.08);border:1.5px solid rgba(224,64,64,.3);border-radius:8px;padding:8px 10px;margin-top:8px;display:flex;align-items:flex-start;gap:8px">
          <span style="font-size:16px;flex-shrink:0">⚠️</span>
          <div style="font-size:10px;color:#e88;line-height:1.4"><strong style="color:var(--danger)">${t('enh.warning')}</strong> +%${pct} ${t('enh.break_warn')}</div>
        </div>`;
      }
    }

    const canEnh = !!(itemSlot && stoneInfo && (P.misc['stone' + stoneInfo.p] || 0) > 0);

    let html = `<div style="display:flex;align-items:flex-start;justify-content:center;gap:14px;margin:10px 0">
      <div style="text-align:center"><div style="font-family:Cinzel,serif;font-size:7px;letter-spacing:1px;color:var(--textdim);text-transform:uppercase;font-weight:700;margin-bottom:4px">${t('enh.equipment')}</div>${itemSlotH}</div>
      <div style="text-align:center"><div style="font-family:Cinzel,serif;font-size:7px;letter-spacing:1px;color:var(--textdim);text-transform:uppercase;font-weight:700;margin-bottom:4px">${t('enh.stone')} (${totalStones})</div>${stoneSlotH}</div>
      <div style="text-align:center"><div style="font-family:Cinzel,serif;font-size:7px;letter-spacing:1px;color:var(--textdim);text-transform:uppercase;font-weight:700;margin-bottom:4px">${t('enh.protection')}</div>${charmSlotH}</div>
    </div>
    ${barH}
    <button class="btn full" data-act="doenhnew" ${canEnh ? '' : 'disabled'} style="margin-top:10px;font-family:'Cinzel Decorative',serif;font-size:12px;letter-spacing:2px">${t('enh.do')}</button>`;

    // item picker (sadece enhpickitem varsa altına grid göster)
    return html;
  }
  function atUp() {
    const P = S.get();
    const pool = P.equipItems.filter(i => !i.t0 && i.rarity < 4);
    let html = `<div class="kv"><span class="k">${t('up.color_charm')}</span><span class="vv">${P.misc.charm_color}</span></div><div class="muted small" style="margin:6px 0">${t('up.color_hint')}</div>`;
    if (!pool.length) return html + '<div class="empty-note">' + t('enh.no_item') + '</div>';
    html += '<div class="grid">';
    for (const it of pool) html += `<div class="slot ${RAR_CLS[it.rarity]}${tierClass(it.tier)}" data-act="uppick" data-id="${it.id}"><div class="slot-inner">${eqEmoji(it)}</div><div class="tg">T${it.tier}</div><div class="nm" style="color:${rarColor(it.rarity)}">${D.RARITY[it.rarity].name}</div></div>`;
    return html + '</div>';
  }
  function enhanceSheet(id) {
    const it = C.findEquipAnywhere(id); if (!it) return;
    const P = S.get();
    const risk = it.enh >= 60 ? `<div class="list-card" style="border-color:var(--danger)"><span class="small" style="color:#f08080">⚠️ +%${it.enh} ${t('enh.break_risk')}</span></div>` : '';
    var _totalS = (P.misc.stone3||0)+(P.misc.stone6||0)+(P.misc.stone9||0)+(P.misc.stone12||0)+(P.misc.stone15||0);
    const stones = D.ENH_STONES.map(s => { var sk = 'stone' + s.p; var sc = P.misc[sk] || 0; return `<button class="btn sm" data-act="doenh" data-id="${id}" data-p="${s.p}" ${sc > 0 ? '' : 'disabled'}>+${s.p}% (${sc})</button>`; }).join(' ');
    openSheet(t('enh.title'), esc(it.name),
      `<div style="text-align:center">${eqEmoji(it)}</div>
       <div class="kv"><span class="k">${t('enh.current')}</span><span class="vv" style="color:var(--goldlit)">+${it.enh}% / +90%</span></div>${risk}
       <div class="sec-h">${t('enh.stone_select')} (${t('enh.total')}: ${_totalS})</div><div style="display:flex;flex-wrap:wrap;gap:6px">${stones}</div>
       <div class="divider"></div><div class="muted small">${t('enh.charm_label')}</div>
       <div style="display:flex;gap:10px;margin-top:6px;font-size:12px">
        <label><input type="radio" name="charm" value="" checked> ${t('enh.charm_none')}</label>
        <label><input type="radio" name="charm" value="break"> 🔴 (${P.misc.charm_break})</label>
        <label><input type="radio" name="charm" value="drop"> 🟡 (${P.misc.charm_drop})</label></div>`);
  }
  function upgradeSheet(id) {
    const it = C.findEquipAnywhere(id); if (!it) return;
    const P = S.get(); const ru = D.RARITY_UP.find(x => x.from === it.rarity);
    openSheet(t('up.title'), esc(it.name),
      `<div style="text-align:center">${eqEmoji(it)}</div>
       <div class="kv"><span class="k">${t('up.transition')}</span><span class="vv">${D.RARITY[it.rarity].name} → <span style="color:${rarColor(ru.to)}">${D.RARITY[ru.to].name}</span></span></div>
       <div class="kv"><span class="k">${t('up.success_rate')}</span><span class="vv">%${Math.round(ru.success * 100)}</span></div>
       <div class="kv"><span class="k">Fail</span><span class="vv">${D.RARITY[ru.failTo].name}${t('up.fail')}</span></div>
       <div class="kv"><span class="k">${t('up.cost')}</span><span class="vv">${t('up.free')}</span></div>
       <div class="divider"></div>
       <label style="font-size:12px"><input type="radio" name="ucharm" value="" checked> ${t('up.no_charm')}</label>
       <label style="font-size:12px;margin-left:10px"><input type="radio" name="ucharm" value="1"> ${t('up.protect')} (${P.misc.charm_color})</label>
       <button class="btn full" data-act="doupgrade" data-id="${id}" style="margin-top:12px">${t('up.do')}</button>`);
  }

  // ============ BANKA EKRANI (skyzone-banka.html) ============
  let bankSel = null;       // {side:'inv'|'bnk', id}
  let bankSort = { inv: false, bnk: false };

  // bir store'dan birleşik eşya listesi (envanter veya banka)
  function storeEntries(store) {
    const out = [];
    for (const it of store.equipItems) out.push({ id: 'eqi:' + it.id, kind: 'equip', rar: it.rarity, tier: it.tier, count: 1, name: it.name, svg: eqEmoji(it), enh: it.enh, ref: it, cat: 'equip' });
    const groups = {};
    for (const c of store.consumables) { const k = c.type + ':' + c.buff + ':' + c.rarity + ':' + c.tier; (groups[k] = groups[k] || { ids: [], c }).ids.push(c.id); }
    for (const k in groups) { const c = groups[k].c, def = D.BUFFS[c.buff]; out.push({ id: 'use:' + k, kind: 'use', rar: c.rarity, tier: c.tier, count: groups[k].ids.length, name: (c.type === 'yemek' ? '🍖 ' : '🧪 ') + def.name, svg: ICON[c.type === 'yemek' ? 'potionG' : 'potionR'], ids: groups[k].ids, cat: 'use' }); }
    for (const key in store.mats) { if (store.mats[key] <= 0) continue; const p = E.parseMatKey(key); out.push({ id: 'mat:' + key, kind: 'mat', rar: p.rarity, tier: p.tier, count: store.mats[key], name: D.MAT_NAMES[p.family][p.tier - 1], svg: matSVG(p.family, p.tier), matKey: key, cat: 'raw' }); }
    for (const mk in MISC_META) { const cnt = store.misc[mk] || 0; if (cnt <= 0) continue; const m = MISC_META[mk]; out.push({ id: 'misc:' + mk, kind: 'misc', rar: m.rar, tier: 0, count: cnt, name: m.name, svg: ICON[m.icon], miscKey: mk, cat: 'misc' }); }
    return out;
  }
  function invStore() { const P = S.get(); return { equipItems: P.equipItems, consumables: P.consumables, mats: P.mats, misc: P.misc }; }
  function bankUsed(store) { return Object.keys(store.mats).filter(k => store.mats[k] > 0).length + store.equipItems.length + store.consumables.length + Object.keys(store.misc).filter(k => store.misc[k] > 0).length; }

  function openBanka() {
    if (!S.inCity()) { toast(t('bank.only_city')); return; }
    bankSel = null;
    renderBanka();
    openMB('bankaModal');
  }
  const SORT_RO = { 4: 0, 3: 1, 2: 2, 1: 3, 0: 4 };
  const SORT_CO = { equip: 0, use: 1, raw: 2, misc: 3 };
  function sortEntries(list) { return list.slice().sort((a, b) => (SORT_CO[a.cat] - SORT_CO[b.cat]) || (b.rar - a.rar) || (b.tier - a.tier)); }

  function renderBanka() {
    const P = S.get();
    // city tabs (sadece kendi şehri aktif)
    $('#bankCityTabs').innerHTML = ['orman', 'kar', 'col'].map(c =>
      `<div class="ctab ${c === P.city ? 'on' : ''}" data-act="bankcity" data-c="${c}">${D.CITIES[c].icon} ${D.CITIES[c].name.split(' ')[0]}</div>`).join('');
    const inv = storeEntries(invStore());
    const bnk = storeEntries(S.bankHere());
    const invList = bankSort.inv ? sortEntries(inv) : inv;
    const bnkList = bankSort.bnk ? sortEntries(bnk) : bnk;
    const invCap = S.invCap(), bnkCap = S.bankCap();
    renderBankGrid('bkInvGrid', invList, invCap, 'inv');
    renderBankGrid('bkBnkGrid', bnkList, bnkCap, 'bnk');
    updBankBar('bkInvFill', 'bkInvNum', inv.length, invCap);
    updBankBar('bkBnkFill', 'bkBnkNum', bnk.length, bnkCap);
    $('#bkToBank').disabled = !(bankSel && bankSel.side === 'inv');
    $('#bkToInv').disabled = !(bankSel && bankSel.side === 'bnk');
    $('#bkInvFoot').textContent = `${inv.length} ${t('bag.items')} · ${invCap} slot (${t('bag.slot_label')} ${S.invBagCount()}/${S.MAX_SLOTS})`;
    $('#bkBnkFoot').textContent = `${bnk.length} / ${bnkCap} slot (${t('bag.slot_label')} ${S.bankBagCount()}/${S.MAX_SLOTS})`;
  }
  function renderBankGrid(elId, list, maxSlots, side) {
    let h = list.map(o => {
      const tier = o.tier > 0 ? `<span class="slot-tier t${o.tier}">${TIER_ROMAN[o.tier]}</span>` : '';
      const cnt = o.count > 1 ? `<span class="slot-count">${o.count > 999 ? '999+' : o.count}</span>` : '';
      const enh = (o.ref && !o.ref.t0) ? enhClass(o.ref.enh || 0) : '';
      const enhLabel = (o.ref && !o.ref.t0) ? `<span class="slot-count" style="font-size:7px;color:${(o.ref.enh || 0) > 0 ? 'var(--goldlit)' : 'var(--textdim)'}">%${o.ref.enh || 0}</span>` : '';
      const sel = (bankSel && bankSel.side === side && bankSel.id === o.id) ? ' sel' : '';
      return `<div class="slot ${RAR_CLS[o.rar]}${tierClass(o.tier)}${enh}${sel}" data-act="banksel" data-side="${side}" data-id="${o.id}"><div class="slot-inner">${o.svg}</div>${tier}${cnt || enhLabel}</div>`;
    }).join('');
    for (let k = list.length; k < Math.min(maxSlots, list.length + (side === 'inv' ? 4 : 5)); k++) h += `<div class="slot empty"><div class="slot-inner">${ICON.empty_sword}</div></div>`;
    $('#' + elId).innerHTML = h;
  }
  function updBankBar(fillId, numId, used, cap) {
    const pct = Math.min(100, used / cap * 100);
    const f = $('#' + fillId); f.style.width = pct + '%';
    f.className = 'bar-fill' + (pct > 85 ? ' high' : pct > 60 ? ' mid' : '');
    $('#' + numId).textContent = used + '/' + cap;
  }
  function bankSelect(side, id, rect) {
    if (bankSel && bankSel.side === side && bankSel.id === id) { bankSel = null; closePop(); renderBanka(); return; }
    bankSel = { side, id };
    renderBanka();
    if (rect) bankPop(side, id, rect);
  }
  function bankPop(side, id, rect) {
    const store = side === 'inv' ? invStore() : S.bankHere();
    const o = storeEntries(store).find(e => e.id === id);
    const pop = $('#itemPop');
    if (!o) { pop.classList.remove('show'); return; }
    const tier = o.tier > 0 ? `<span class="slot-tier t${o.tier}">${TIER_ROMAN[o.tier]}</span>` : '';
    let body = '';
    if (o.ref && o.ref.perks && o.ref.perks.length) {
      const cpVal = E.itemCP(o.ref); const enh = o.ref.enh || 0; const bits = [];
      if (cpVal) { const bonus = enh ? Math.round(cpVal * enh / 100) : 0; bits.push('CP +' + cpVal.toFixed(0) + (bonus ? ' <span style="color:var(--goldlit)">(+' + bonus + ')</span>' : '')); }
      if (o.ref.stats && o.ref.stats.weight) bits.push(t('item.carry') + ' +' + o.ref.stats.weight);
      if (o.ref.stats && o.ref.stats.speed) bits.push(t('item.speed') + ' ' + o.ref.stats.speed + '/dk');
      if (o.ref.stats && o.ref.stats.yieldp) bits.push('Yield +' + o.ref.stats.yieldp + '%');
      if (bits.length) body += `<div class="ip-base">${bits.join(' · ')}${enh ? ' · <span style="color:var(--goldlit)">%' + enh + '</span>' : ''}</div>`;
      body += renderPerkRows(o.ref);
    } else if (o.ref && o.ref.perks) body = '<div class="ip-desc">' + t('common.no_perk') + ' (T0).</div>';
    else body = `<div class="ip-desc">${o.count} ${t('item.pcs')} · ${RAR_NAME[o.rar]}${o.tier ? ' · T' + o.tier : ''}</div>`;
    const dir = side === 'inv' ? 'toBank' : 'toInv';
    const lbl = side === 'inv' ? t('bank.to_bank') : t('bank.to_inv');
    pop.innerHTML = `<div class="ip-close" data-act="closepop">✕</div>
      <div class="ip-head">
        <div class="ip-slot ${RAR_CLS[o.rar]}${tierClass(o.tier)}"><div class="slot-inner">${o.svg}</div>${tier}</div>
        <div><div class="ip-name" style="color:${rarColor(o.rar)}">${esc(o.name)}</div><div class="ip-meta">${RAR_NAME[o.rar]}${o.tier ? ' · T' + o.tier : ''} · ${o.count} ${t('item.pcs')}</div></div>
      </div>${body}
      <div class="ip-acts"><div class="act primary" data-act="bankxfer" data-dir="${dir}">${lbl}</div></div>`;
    pop.classList.add('show');
    positionPop(pop, rect);
  }
  function bankSortSide(side) { bankSort[side] = true; closePop(); renderBanka(); }
  function getBankSel() { return bankSel; }
  function bankDragTransfer(side, id, dir) { bankSel = { side, id }; openXfer(dir); }

  // transfer modal
  let xfer = null; // {dir, entry, max}
  function openXfer(dir) {
    if (!bankSel) return;
    const side = dir === 'toBank' ? 'inv' : 'bnk';
    if (bankSel.side !== side) return;
    const store = side === 'inv' ? invStore() : S.bankHere();
    const o = storeEntries(store).find(e => e.id === bankSel.id);
    if (!o) return;
    if (o.count <= 1) { doTransfer(dir, o.id, 1); return; }
    xfer = { dir, id: o.id, max: o.count };
    $('#xfSlot').className = 'xf-slot ' + RAR_CLS[o.rar];
    const tier = o.tier > 0 ? `<span class="slot-tier t${o.tier}">${TIER_ROMAN[o.tier]}</span>` : '';
    $('#xfSlot').innerHTML = `<div class="slot-inner">${o.svg}</div>${tier}`;
    $('#xfName').textContent = o.name; $('#xfName').style.color = rarColor(o.rar);
    $('#xfSub').textContent = RAR_NAME[o.rar] + ' · ' + o.count + ' ' + t('bank.available');
    $('#xfDir').innerHTML = dir === 'toBank' ? t('bank.inv_to_bank') : t('bank.bank_to_inv');
    const rng = $('#xfRange'), num = $('#xfNum');
    rng.max = o.count; num.max = o.count; rng.value = o.count; num.value = o.count;
    rng.oninput = () => { num.value = rng.value; };
    num.oninput = () => { let v = Math.max(1, Math.min(o.count, parseInt(num.value) || 1)); num.value = v; rng.value = v; };
    const q = [1]; if (o.count >= 10) q.push(10); if (o.count >= 50) q.push(50); if (o.count >= 100) q.push(100); q.push(o.count);
    $('#xfQuick').innerHTML = [...new Set(q)].map(v => `<div class="xf-qbtn" data-act="xfquick" data-v="${v}">${v === o.count ? t('bank.all') : v}</div>`).join('');
    openMB('bankXfer');
  }
  function xfQuick(v) { $('#xfRange').value = v; $('#xfNum').value = v; }
  function confirmXfer() { if (!xfer) return; const q = parseInt($('#xfNum').value) || 1; closeMB('bankXfer'); doTransfer(xfer.dir, xfer.id, q); xfer = null; }

  // gerçek transfer: envanter <-> banka
  function doTransfer(dir, id, qty) {
    const P = S.get();
    const srcStore = dir === 'toBank' ? invStore() : S.bankHere();
    const dstStore = dir === 'toBank' ? S.bankHere() : invStore();
    const dstMax = dir === 'toBank' ? 999 : 99;
    const dstCap = dir === 'toBank' ? S.bankCap() : S.invCap();
    const dstFull = bankUsed(dstStore) >= dstCap;
    let moved = 0;
    if (id.startsWith('mat:')) {
      const k = id.slice(4); const have = srcStore.mats[k] || 0;
      const isNew = !(dstStore.mats[k] > 0);
      if (isNew && dstFull) { toast(t('bank.no_slot')); return; }
      const space = dstMax - (dstStore.mats[k] || 0);
      moved = Math.min(qty, have, space);
      if (moved <= 0) { toast(t('bank.stack_full')); return; }
      srcStore.mats[k] -= moved; if (srcStore.mats[k] <= 0) delete srcStore.mats[k];
      dstStore.mats[k] = (dstStore.mats[k] || 0) + moved;
    } else if (id.startsWith('misc:')) {
      const mk = id.slice(5); const have = srcStore.misc[mk] || 0;
      const isNew = !(dstStore.misc[mk] > 0);
      if (isNew && dstFull) { toast(t('bank.no_slot')); return; }
      const space = dstMax - (dstStore.misc[mk] || 0);
      moved = Math.min(qty, have, space);
      if (moved <= 0) { toast(t('bank.stack_full')); return; }
      srcStore.misc[mk] -= moved; dstStore.misc[mk] = (dstStore.misc[mk] || 0) + moved;
    } else if (id.startsWith('eqi:')) {
      if (dstFull) { toast(t('bank.no_slot')); return; }
      const itemId = id.slice(4); const i = srcStore.equipItems.findIndex(x => x.id === itemId);
      if (i < 0) return;
      // giyili olmayan kontrolü: equipItems zaten çantadaki
      dstStore.equipItems.push(srcStore.equipItems.splice(i, 1)[0]); moved = 1;
    } else if (id.startsWith('use:')) {
      const parts = id.slice(4).split(':'); const [type, buff, rar, tier] = parts;
      const matches = srcStore.consumables.filter(c => c.type === type && c.buff === buff && c.rarity === +rar && c.tier === +tier);
      let freeSlots = dstCap - bankUsed(dstStore);
      const n = Math.min(qty, matches.length, Math.max(0, freeSlots));
      if (n <= 0) { toast(t('bank.no_slot')); return; }
      for (let j = 0; j < n; j++) { const c = matches[j]; const idx = srcStore.consumables.indexOf(c); srcStore.consumables.splice(idx, 1); dstStore.consumables.push(c); }
      moved = n;
    }
    if (moved > 0) toast(moved + '× ' + t('bank.transferred'));
    bankSel = null;
    closePop();
    renderBanka();
  }
  function bankCity(c) {
    const P = S.get();
    if (c === P.city) return;
    toast(t('bank.city_lock', { city: D.CITIES[P.city].name }));
  }
  function bankUpgradeUI() { const r = C.upgradeBank(); toast(r.ok ? '✅ +25 slot · −5.000💰' : '❌ ' + r.msg); renderBanka(); renderTop(); }

  // PAZAR
  let mktTab = 'mats';
  // ============ PAZARYERİ (Trading House — arama/filtre/3 sekme/buy modal) ============
  let mktMainTab = 'buy', mktSearch = '', mktFilterCat = '', mktFilterTier = 0, mktFilterRar = -1, mktPage = 0;
  const MKT_PER_PAGE = 8;

  // NPC listing üret (her açışta yenilenir)
  let npcListings = [];
  function generateNPC() {
    npcListings = [];
    const types = D.EQUIP_SLOTS;
    for (let i = 0; i < 30; i++) {
      const type = E.pick(types);
      const tier = E.pick([1, 1, 1, 2, 2, 3]);
      const rarIdx = E.rollCascade([30, 30, 25, 10, 5]);
      const it = E.makeEquip({ type, tier, rarityIdx: rarIdx, crafted: Math.random() > 0.5 });
      const price = Math.round(C.equipValue(it) * (1.2 + Math.random() * 0.6));
      const dur = Math.round(30 + Math.random() * 1400); // dakika
      npcListings.push({ item: it, price, dur, id: it.id });
    }
    // hammadde de ekle
    for (let i = 0; i < 15; i++) {
      const fam = E.pick(D.FAMILIES);
      const tier = E.pick([1, 1, 2, 2, 3]);
      const rarIdx = E.rollCascade([40, 30, 20, 8, 2]);
      const count = E.rint(10, 99);
      const price = C.matValue(fam, tier, rarIdx) * count;
      const dur = Math.round(20 + Math.random() * 600);
      npcListings.push({ mat: true, family: fam, tier, rarity: rarIdx, count, price, dur, id: 'npc_' + i + '_' + fam });
    }
  }

  function openPazar(tab) {
    if (!S.inCity()) { toast(t('mkt.only_city')); return; }
    mktMainTab = tab || 'buy'; mktSearch = ''; mktFilterCat = ''; mktFilterTier = 0; mktFilterRar = -1; mktPage = 0;
    if (!npcListings.length) generateNPC();
    renderPazar();
    openMB('pazarModal');
  }
  function renderPazar() {
    const P = S.get();
    const CATS = [['', t('mkt.all')], ['silah', t('mkt.weapon')], ['kask', t('mkt.helmet')], ['zirh', t('mkt.armor')], ['pelerin', t('mkt.cape')], ['eldiven', t('mkt.gloves')], ['bot', t('mkt.boots')], ['binek', t('mkt.mount_cat')], ['canta', t('mkt.bag_cat')], ['alet', t('mkt.tool_cat')], ['set', t('mkt.set_cat')], ['mat', t('mkt.rawmat')]];
    const TIERS = [[0, t('mkt.all')], [1, 'T1'], [2, 'T2'], [3, 'T3']];
    const RARS = [[-1, t('mkt.all')], [0, t('mkt.white')], [1, t('mkt.green')], [2, t('mkt.blue')], [3, t('mkt.orange')], [4, t('mkt.red')]];

    let body = `<!-- arama + filtreler -->
      <div style="display:flex;gap:5px;margin-bottom:10px;flex-wrap:wrap">
        <input type="text" placeholder="${t('mkt.search')}" value="${esc(mktSearch)}" data-act="mktsearch" style="flex:1;min-width:100px;padding:6px 10px;background:#1a1410;border:1px solid var(--border);border-radius:7px;color:var(--textlit);font-size:12px;font-family:inherit;outline:none;">
        <select data-act="mktfiltcat" style="padding:5px 6px;background:#1a1410;border:1px solid var(--border);border-radius:7px;color:var(--textlit);font-size:10px;font-family:'Cinzel',serif">${CATS.map(([v, l]) => `<option value="${v}" ${mktFilterCat === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <select data-act="mktfilttier" style="padding:5px 6px;background:#1a1410;border:1px solid var(--border);border-radius:7px;color:var(--textlit);font-size:10px;font-family:'Cinzel',serif">${TIERS.map(([v, l]) => `<option value="${v}" ${mktFilterTier === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <select data-act="mktfiltrar" style="padding:5px 6px;background:#1a1410;border:1px solid var(--border);border-radius:7px;color:var(--textlit);font-size:10px;font-family:'Cinzel',serif">${RARS.map(([v, l]) => `<option value="${v}" ${mktFilterRar === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
      </div>
      <!-- 3 sekme -->
      <div class="tabrow" style="margin-bottom:12px">
        <div class="tab ${mktMainTab === 'buy' ? 'active' : ''}" data-act="mkttab" data-t="buy">${t('mkt.buy_tab')}</div>
        <div class="tab ${mktMainTab === 'sell' ? 'active' : ''}" data-act="mkttab" data-t="sell">${t('mkt.sell_tab')}</div>
        <div class="tab ${mktMainTab === 'orders' ? 'active' : ''}" data-act="mkttab" data-t="orders">${t('mkt.orders_tab')}</div>
      </div>`;

    if (mktMainTab === 'buy') body += renderMktBuy();
    else if (mktMainTab === 'sell') body += renderMktSell();
    else body += renderMktOrders();

    $('#pazarBody').innerHTML = body;
    // bind search input
    const si = $('#pazarBody input[data-act="mktsearch"]');
    if (si) si.addEventListener('input', e => { mktSearch = e.target.value; mktPage = 0; renderPazar(); });
    // bind selects
    const fc = $('#pazarBody select[data-act="mktfiltcat"]');
    if (fc) fc.addEventListener('change', e => { mktFilterCat = e.target.value; mktPage = 0; renderPazar(); });
    const ft = $('#pazarBody select[data-act="mktfilttier"]');
    if (ft) ft.addEventListener('change', e => { mktFilterTier = +e.target.value; mktPage = 0; renderPazar(); });
    const fr = $('#pazarBody select[data-act="mktfiltrar"]');
    if (fr) fr.addEventListener('change', e => { mktFilterRar = +e.target.value; mktPage = 0; renderPazar(); });
  }

  function fmtDur(min) {
    if (min < 60) return min + ' ' + t('mkt.min');
    const h = Math.floor(min / 60), m = min % 60;
    return h + ' ' + t('mkt.hr') + ' ' + (m ? m + ' ' + t('mkt.min') : '');
  }

  function filterNPC(list) {
    return list.filter(l => {
      const name = l.item ? l.item.name : D.MAT_NAMES[l.family][l.tier - 1];
      if (mktSearch && !name.toLowerCase().includes(mktSearch.toLowerCase())) return false;
      if (mktFilterCat) {
        if (mktFilterCat === 'mat') { if (!l.mat) return false; }
        else { if (l.mat || l.item.type !== mktFilterCat) return false; }
      }
      if (mktFilterTier > 0 && (l.tier || (l.item && l.item.tier)) !== mktFilterTier) return false;
      if (mktFilterRar >= 0) {
        const r = l.mat ? l.rarity : l.item.rarity;
        if (r !== mktFilterRar) return false;
      }
      return true;
    });
  }

  function renderMktBuy() {
    const filtered = filterNPC(npcListings);
    const total = filtered.length;
    const pages = Math.max(1, Math.ceil(total / MKT_PER_PAGE));
    mktPage = Math.min(mktPage, pages - 1);
    const slice = filtered.slice(mktPage * MKT_PER_PAGE, (mktPage + 1) * MKT_PER_PAGE);
    if (!slice.length) return '<div class="empty-note">' + t('mkt.no_results') + '</div>';
    let html = '';
    for (const l of slice) {
      const isMat = !!l.mat;
      const name = isMat ? D.MAT_NAMES[l.family][l.tier - 1] : l.item.name;
      const svg = isMat ? matSVG(l.family, l.tier) : eqEmoji(l.item);
      const rar = isMat ? l.rarity : l.item.rarity;
      const tier = isMat ? l.tier : l.item.tier;
      const rarName = D.RARITY[rar].name;
      html += `<div class="list-card"><div class="lc-left"><span class="lc-ic ${RAR_CLS[rar]}" style="width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden">${svg}</span>
        <div><div class="lc-title" style="color:${rarColor(rar)};font-size:12px">${esc(name)}</div>
        <div class="lc-sub">T${tier} · ${rarName}${isMat ? ' · ×' + l.count : (l.item.enh ? ' · %' + l.item.enh : '')} · ${l.item && l.item.perks ? l.item.perks.length + ' perk' : ''} · ${fmtDur(l.dur)}</div></div></div>
        <div style="display:flex;align-items:center;gap:6px"><span style="font-family:'JetBrains Mono';font-size:11px;color:var(--goldlit)">${fmt(l.price)}💰</span>
        <button class="btn sm" data-act="mktbuy" data-lid="${l.id}">${t('mkt.buy_btn')}</button></div></div>`;
    }
    // sayfalama
    html += `<div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-top:12px">
      <button class="btn sm ghost" data-act="mktpage" data-d="-1" ${mktPage <= 0 ? 'disabled' : ''}>◂</button>
      <span style="font-family:'Cinzel',serif;font-size:11px;color:var(--textdim)">${mktPage + 1} / ${pages}</span>
      <button class="btn sm ghost" data-act="mktpage" data-d="1" ${mktPage >= pages - 1 ? 'disabled' : ''}>▸</button>
    </div>`;
    return html;
  }

  function renderMktSell() {
    const P = S.get();
    const tax = C.effectiveTax();
    let html = `<div class="muted small" style="margin-bottom:8px">${t('mkt.sell_hint', { tax: Math.round(tax * 100) })}</div>`;
    // malzemeler
    const keys = Object.keys(P.mats).filter(k => P.mats[k] > 0).sort();
    for (const k of keys) {
      const p = E.parseMatKey(k); const v = C.matValue(p.family, p.tier, p.rarity);
      if (mktSearch && !D.MAT_NAMES[p.family][p.tier - 1].toLowerCase().includes(mktSearch.toLowerCase())) continue;
      const sugPrice = v * P.mats[k];
      html += `<div class="list-card"><div class="lc-left"><span class="lc-ic ${RAR_CLS[p.rarity]}" style="width:30px;height:30px;border-radius:6px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden">${matSVG(p.family, p.tier)}</span>
        <div><div class="lc-title" style="font-size:12px">${D.MAT_NAMES[p.family][p.tier - 1]}</div><div class="lc-sub">×${P.mats[k]} · ~${v}💰/ad</div></div></div>
        <button class="btn sm" data-act="mktlistmat" data-k="${k}" data-sug="${sugPrice}">${t('mkt.list_btn')}</button></div>`;
    }
    // ekipman (mountbox hariç)
    for (const it of P.equipItems) {
      if (it.kind === 'mountbox') continue;
      if (mktSearch && !it.name.toLowerCase().includes(mktSearch.toLowerCase())) continue;
      const sugPrice = C.equipValue(it);
      html += `<div class="list-card"><div class="lc-left"><span class="lc-ic ${RAR_CLS[it.rarity]}" style="width:30px;height:30px;border-radius:6px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden">${eqEmoji(it)}</span>
        <div><div class="lc-title" style="color:${rarColor(it.rarity)};font-size:12px">${it.name}</div><div class="lc-sub">${it.perks ? it.perks.length : 0} perk · ~${fmt(sugPrice)}💰</div></div></div>
        <button class="btn sm" data-act="mktlistequip" data-id="${it.id}" data-sug="${sugPrice}">${t('mkt.list_btn')}</button></div>`;
    }
    if (!keys.length && !P.equipItems.filter(x => x.kind !== 'mountbox').length) html += '<div class="empty-note">' + t('mkt.no_items') + '</div>';
    return html;
  }

  function renderMktOrders() {
    const P = S.get();
    const listings = P.marketListings || [];
    if (!listings.length) return '<div class="empty-note">' + t('mkt.no_orders') + '<br><span class="muted small">' + t('mkt.orders_hint') + '</span></div>';
    let html = '';
    for (const l of listings) {
      const elapsed = Math.round((Date.now() - l.listedAt) / 60000);
      html += `<div class="list-card"><div class="lc-left"><span class="lc-ic" style="font-size:16px">${l.type === 'equip' && l.item ? (l.item.icon || '📦') : '📦'}</span>
        <div><div class="lc-title" style="font-size:12px">${esc(l.itemName || 'Item')}</div>
        <div class="lc-sub">${fmt(l.price)} 💰 · ${elapsed} ${t('mkt.listed_ago')}</div></div></div>
        <button class="btn sm ghost" data-act="mktcancel" data-lid="${l.id}">${t('mkt.cancel')}</button></div>`;
    }
    return html;
  }

  // buy modal
  function openBuyModal(listingId) {
    const l = npcListings.find(x => x.id === listingId);
    if (!l) return;
    const isMat = !!l.mat;
    const name = isMat ? D.MAT_NAMES[l.family][l.tier - 1] : l.item.name;
    const svg = isMat ? matSVG(l.family, l.tier) : eqEmoji(l.item);
    const rar = isMat ? l.rarity : l.item.rarity;
    const maxQty = isMat ? l.count : 1;
    const unitPrice = isMat ? Math.round(l.price / l.count) : l.price;

    const sellerKeys = ['npc.seller1', 'npc.seller2', 'npc.seller3', 'npc.seller4', 'npc.seller5'];
    const seller = t(sellerKeys[Math.floor(listingId.toString().charCodeAt(0) % 5)]);
    let perkInfo = '';
    if (!isMat && l.item.perks && l.item.perks.length) {
      perkInfo = renderPerkRows(l.item);
    }
    let body = `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <div style="width:36px;height:36px;flex-shrink:0;display:flex;align-items:center;justify-content:center">${svg}</div>
        <div><div style="font-family:Cinzel,serif;font-weight:700;font-size:13px;color:${rarColor(rar)}">${esc(name)}</div>
        <div style="font-size:9px;color:var(--textdim)">${D.RARITY[rar].name} · T${isMat ? l.tier : l.item.tier} · ${t('mkt.seller')}: <span style="color:var(--goldlit)">${seller}</span></div></div>
      </div>
      ${perkInfo}
      <div class="muted small" style="margin-bottom:8px">${isMat ? t('mkt.rawmat_label') + ' · ×' + l.count + ' ' + t('bank.available') : (l.item.perks.length + ' perk · ' + fmtDur(l.dur) + ' ' + t('mkt.remaining'))}</div>`;
    if (maxQty > 1) {
      body += `<div style="margin-bottom:12px">
        <div class="muted small" style="margin-bottom:6px">${t('mkt.quantity')}</div>
        <div style="display:flex;align-items:center;gap:8px">
          <input type="range" id="buyRange" min="1" max="${maxQty}" value="1" style="flex:1;accent-color:var(--gold)">
          <input type="number" id="buyNum" min="1" max="${maxQty}" value="1" style="width:55px;background:#1a1410;border:1px solid var(--border);color:var(--goldlit);font-family:'JetBrains Mono';font-size:14px;font-weight:700;text-align:center;padding:5px;border-radius:6px;outline:none">
        </div></div>`;
    }
    body += `<div style="text-align:center;margin:10px 0">
      <div style="font-size:11px;color:var(--textdim)">${t('mkt.total')}</div>
      <div style="font-family:'JetBrains Mono';font-size:20px;color:var(--goldlit);font-weight:700" id="buyTotal">💰 ${fmt(unitPrice)}</div>
    </div>
    <button class="btn full" data-act="mktbuynow" data-lid="${listingId}" data-uprice="${unitPrice}">${t('mkt.buy_btn')}</button>`;

    $('#pazarBuyBody').innerHTML = body;
    openMB('pazarBuyModal');
    // bind range/number sync
    const rng = $('#buyRange'), num = $('#buyNum'), tot = $('#buyTotal');
    if (rng && num) {
      const sync = v => { v = Math.max(1, Math.min(maxQty, parseInt(v) || 1)); rng.value = v; num.value = v; tot.textContent = '💰 ' + fmt(v * unitPrice); };
      rng.oninput = () => sync(rng.value);
      num.oninput = () => sync(num.value);
    }
  }

  function doBuy(listingId, unitPrice) {
    const P = S.get();
    const l = npcListings.find(x => x.id === listingId);
    if (!l) return;
    const numEl = $('#buyNum');
    const qty = numEl ? Math.max(1, parseInt(numEl.value) || 1) : 1;
    const total = qty * unitPrice;
    if (P.gold < total) { toast(t('mkt.insufficient_gold', { amount: fmt(total) })); return; }
    P.gold -= total;
    if (l.mat) {
      S.addMat(l.family, l.tier, l.rarity, qty);
      l.count -= qty; if (l.count <= 0) npcListings = npcListings.filter(x => x.id !== listingId);
    } else {
      if (S.invFull()) { toast(t('mkt.inv_full')); P.gold += total; return; }
      S.addEquip(l.item);
      npcListings = npcListings.filter(x => x.id !== listingId);
    }
    toast('✅ ' + qty + '× ' + t('mkt.bought') + ' · −' + fmt(total) + '💰');
    closeMB('pazarBuyModal');
    renderPazar(); renderTop();
  }

  // ============ MOUNT (BINEK) SCREEN ============
  const MOUNT_SVG = window.SKY_MOUNTS || {};
  const STONE_SVG = window.SKY_STONES || {};

  function openMount() {
    renderMount();
    openMB('mountModal');
  }
  function renderMount() {
    const P = S.get();
    const curMount = P.mount;
    const boxes = P.equipItems.filter(x => x.kind === 'mountbox').length;
    const RK_COLORS = ['#d7d0c0', '#5fb45e', '#5b96d8', '#e2913c', '#d95a49'];
    const RK_NAMES = [t('mount.rk_0'), t('mount.rk_1'), t('mount.rk_2'), t('mount.rk_3'), t('mount.rk_4')];

    let mountInfoH = '';
    if (curMount) {
      const mt = D.MOUNT_TYPES[curMount.mountType];
      const svgKey = curMount.mountType;
      const rar = curMount.rarity;
      const stars = (n) => Array(5).fill(0).map((_, i) => `<span style="color:${i < n ? RK_COLORS[Math.min(n - 1, 4)] : '#3a3020'};font-size:12px">★</span>`).join('');
      mountInfoH = `<div style="background:rgba(0,0,0,.35);border:1.5px solid ${RK_COLORS[rar]};border-radius:12px;padding:14px;margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="width:60px;height:60px;border-radius:10px;background:#0a0806;border:1px solid var(--borderlit);display:flex;align-items:center;justify-content:center;flex-shrink:0">${MOUNT_SVG[svgKey] || '<span style="font-size:28px">🐎</span>'}</div>
          <div style="flex:1">
            <div style="font-family:Cinzel,serif;font-weight:700;font-size:14px;color:${RK_COLORS[rar]}">${curMount.name}</div>
            <div style="font-size:10px;color:var(--textdim)">${RK_NAMES[rar]} · ${t('mount.star')}: ${curMount.starSum}${curMount.redStat ? ' · <span style="color:#e04040">' + t('mount.red_stat') + '</span>' : ''}</div>
          </div>
        </div>
        <div style="margin-top:10px;display:grid;grid-template-columns:1fr 1fr ${mt.ozel ? '1fr' : ''};gap:8px">
          <div style="text-align:center"><div style="font-family:Cinzel,serif;font-size:7px;letter-spacing:1px;color:var(--textdim);text-transform:uppercase">${t('mount.speed')}</div><div>${stars(curMount.hizStar)}</div><div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--safe)">+${curMount.hiz}%</div></div>
          <div style="text-align:center"><div style="font-family:Cinzel,serif;font-size:7px;letter-spacing:1px;color:var(--textdim);text-transform:uppercase">${t('mount.weight')}</div><div>${stars(curMount.agirlikStar)}</div><div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--goldlit)">+${curMount.agirlik}</div></div>
          ${mt.ozel ? `<div style="text-align:center"><div style="font-family:Cinzel,serif;font-size:7px;letter-spacing:1px;color:var(--textdim);text-transform:uppercase">${curMount.ozelLabel || t('mount.special')}</div><div>${stars(curMount.ozelStar)}</div><div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--pvpb)">${curMount.ozel === 'invslot' ? '+1 Slot' : '+' + curMount.ozel}</div></div>` : ''}
        </div>
        ${curMount.redStat ? `<div style="margin-top:8px;text-align:center;padding:4px 8px;background:rgba(224,64,64,.12);border:1px solid rgba(224,64,64,.3);border-radius:6px;font-size:10px;color:#f08080;font-weight:700">${t('mount.red_stat')}: +${curMount.redStatVal}% CP</div>` : ''}
        <button class="btn full ghost sm" data-act="mountunequip" style="margin-top:8px">${t('mount.unequip')}</button>
      </div>`;
    } else {
      mountInfoH = `<div style="text-align:center;padding:20px;color:var(--textdim);font-size:11px">${t('mount.no_mount')}</div>`;
    }

    // mount types showcase
    let typesH = '<div style="font-family:Cinzel,serif;font-size:9px;letter-spacing:2px;color:var(--gold);text-transform:uppercase;font-weight:700;margin:8px 0">' + t('mount.types') + '</div>';
    for (const [key, mt] of Object.entries(D.MOUNT_TYPES)) {
      typesH += `<div style="display:flex;align-items:center;gap:8px;padding:6px;background:rgba(0,0,0,.2);border:1px solid var(--border);border-radius:7px;margin-bottom:4px">
        <div style="width:36px;height:36px;flex-shrink:0;display:flex;align-items:center;justify-content:center">${MOUNT_SVG[key] || '🐎'}</div>
        <div style="flex:1"><div style="font-weight:700;font-size:11px;color:var(--textlit)">${mt.name}</div>
        <div style="font-size:9px;color:var(--textdim)">Hiz +${mt.hiz[0]}-${mt.hiz[4]}% · Agi +${mt.agirlik[0]}-${mt.agirlik[4]}${mt.ozelLabel ? ' · ' + mt.ozelLabel : ''}</div></div>
      </div>`;
    }

    // mount box
    let boxH = `<div style="font-family:Cinzel,serif;font-size:9px;letter-spacing:2px;color:var(--gold);text-transform:uppercase;font-weight:700;margin:12px 0 6px">${t('mount.box_title')} (${boxes})</div>
      <div style="font-size:10px;color:var(--textdim);text-align:center;margin:4px 0">${boxes > 0 ? t('mount.box_open') : t('mount.box_none')}</div>
      <div style="font-size:9px;color:var(--textdim);text-align:center;margin-top:4px">${t('mount.drop_hint')}</div>`;

    $('#mountBody').innerHTML = mountInfoH + boxH + '<div style="margin-top:12px">' + typesH + '</div>';
  }

  // ============ PREMIUM SHOP (MAGAZA) SCREEN ============
  let shopTab = 'premium';
  function openShop() {
    shopTab = 'premium';
    renderShop();
    openMB('shopModal');
  }
  function renderShop() {
    const P = S.get();
    const isPrem = S.isPremium();
    const premLeft = isPrem ? Math.ceil(S.premiumTimeLeft() / 86400000) : 0;

    let tabsH = `<div class="tabrow" style="margin-bottom:10px">
      <div class="tab ${shopTab === 'premium' ? 'active' : ''}" data-act="shoptab" data-t="premium">${t('shop.premium')}</div>
      <div class="tab ${shopTab === 'slots' ? 'active' : ''}" data-act="shoptab" data-t="slots">${t('shop.slots')}</div>
      <div class="tab ${shopTab === 'crystals' ? 'active' : ''}" data-act="shoptab" data-t="crystals">${t('shop.crystals')}</div>
    </div>`;

    // gem balance
    let gemBar = `<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 10px;background:rgba(100,60,200,.1);border:1px solid rgba(150,100,255,.3);border-radius:8px;margin-bottom:10px">
      <span style="font-family:Cinzel,serif;font-size:10px;color:var(--textdim)">${t('shop.gem_balance')}</span>
      <span style="font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:700;color:#b080f0">💎 ${fmt(P.gems)}</span>
    </div>`;

    let body = '';
    if (shopTab === 'premium') {
      body = `<div style="background:linear-gradient(135deg,rgba(200,160,48,.08),rgba(150,100,255,.08));border:1.5px solid var(--gold);border-radius:12px;padding:14px;margin-bottom:10px">
        <div style="font-family:'Cinzel Decorative',serif;font-size:16px;font-weight:700;color:var(--goldlit);text-align:center;margin-bottom:8px">${t('shop.premium_title')}</div>
        ${isPrem ? `<div style="text-align:center;font-size:11px;color:var(--safe);font-weight:700;margin-bottom:6px">${t('shop.active')} · ${premLeft} ${t('shop.days_left')}</div>` : ''}
        <div style="font-size:10px;color:var(--textdim);line-height:1.6">
          <div>✦ ${t('shop.offline_earn')} <span style="color:var(--safe)">+%30</span></div>
          <div>✦ ${t('shop.inv_slot')} <span style="color:var(--safe)">+1 slot</span></div>
          <div>✦ ${t('shop.bank_slot')} <span style="color:var(--safe)">+1 slot</span></div>
          <div>✦ ${t('shop.drop_rate')} <span style="color:var(--safe)">+%10</span></div>
          <div>✦ ${t('shop.market_tax')} <span style="color:var(--safe)">-%25</span></div>
          <div>✦ ${t('shop.xp_bonus')} <span style="color:var(--safe)">+%15</span></div>
          <div>✦ <span style="color:var(--goldlit)">${t('shop.gold_name')}</span></div>
        </div>
        <button class="btn full" data-act="buypremium" style="margin-top:10px" ${isPrem ? 'disabled' : ''}>$${D.SHOP.premiumPrice} USD · ${t('shop.day_30')}</button>
      </div>`;
      // starter pack
      if (!P.starterPackBought) {
        body += `<div style="background:linear-gradient(135deg,rgba(224,64,64,.08),rgba(200,160,48,.08));border:1.5px solid var(--danger);border-radius:12px;padding:12px">
          <div style="font-family:Cinzel,serif;font-weight:700;font-size:12px;color:var(--danger);text-align:center">${t('shop.starter_pack')}</div>
          <div style="font-size:10px;color:var(--textdim);margin-top:4px;text-align:center">${t('shop.starter_desc')}</div>
          <button class="btn full" data-act="buystarterpack" style="margin-top:8px;background:linear-gradient(180deg,#e04040,#a01818)">$${D.SHOP.starterPack.price} USD (Demo)</button>
        </div>`;
      }
    } else if (shopTab === 'slots') {
      for (const s of D.SHOP.slots) {
        const typeLabel = s.type === 'inv' ? t('shop.inv_type') : s.type === 'bank' ? t('shop.bank_type') : t('shop.market_type');
        body += `<div class="list-card"><div class="lc-left"><span class="lc-ic" style="font-size:18px">${s.type === 'inv' ? '📦' : s.type === 'bank' ? '🏦' : '🏪'}</span>
          <div><div class="lc-title">${s.name}</div><div class="lc-sub">${typeLabel} · +${s.amount} slot</div></div></div>
          <button class="btn sm" data-act="buyslot" data-sid="${s.id}">$${s.price}</button></div>`;
      }
    } else {
      for (const p of D.SHOP.crystalPacks) {
        body += `<div class="list-card"><div class="lc-left"><span class="lc-ic" style="font-size:18px">💎</span>
          <div><div class="lc-title">${p.label}</div><div class="lc-sub">${p.gems} ${t('shop.crystal_label')}</div></div></div>
          <button class="btn sm" data-act="buycrystal" data-pid="${p.id}">$${p.price} (Demo)</button></div>`;
      }
    }

    $('#shopBody').innerHTML = gemBar + tabsH + body;
  }

  // ============ WAR (KADIM TAS SAVASI) SCREEN ============
  function openWar() {
    renderWar();
    openMB('warModal');
  }
  function renderWar() {
    const ws = window.SKY_WAR_STATE;
    if (!ws) { $('#warBody').innerHTML = '<div class="empty-note">' + t('war.loading') + '</div>'; return; }

    const P = S.get();
    const myCity = P.city;
    const CITY_ICONS = { kar: '❄️', orman: '🌲', col: '🏜️' };
    const STONE_KEYS = { buz: 'kar', orman: 'orman', col: 'col', altin: null };
    const stoneSvgMap = { kar: 'buz', orman: 'orman', col: 'col' };

    // war status
    const isWarActive = ws.active;
    const warLoc = SKY.LANG.getLang() === 'en' ? 'en-US' : 'tr-TR';
    const nextWar = ws.nextWarTime ? new Date(ws.nextWarTime).toLocaleString(warLoc) : '?';

    let statusH = `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:${isWarActive ? 'rgba(224,64,64,.15)' : 'rgba(90,170,58,.1)'};border:1px solid ${isWarActive ? 'var(--danger)' : 'var(--safe)'};border-radius:8px;margin-bottom:10px">
      <span style="font-family:Cinzel,serif;font-size:10px;font-weight:700;letter-spacing:1px;color:${isWarActive ? 'var(--danger)' : 'var(--safe)'}">● ${isWarActive ? t('war.active') : t('war.peace')}</span>
      <span style="font-size:9px;color:var(--textdim)">${t('war.next')}: ${nextWar}</span>
    </div>`;

    // city stone counts
    const counts = { kar: 0, orman: 0, col: 0 };
    for (const s of ws.stones) {
      if (s.owner) counts[s.owner]++;
    }

    let cityH = '<div style="display:flex;gap:6px;margin-bottom:10px">';
    for (const c of ['kar', 'orman', 'col']) {
      const buff = D.WAR.buffTable.find(b => counts[c] >= b.min && counts[c] <= b.max);
      const cpMod = buff ? buff.cp : 0;
      const isMe = c === myCity;
      cityH += `<div style="flex:1;text-align:center;padding:8px;background:rgba(0,0,0,.3);border:1.5px solid ${isMe ? 'var(--gold)' : 'var(--border)'};border-radius:8px">
        <div style="font-size:18px">${CITY_ICONS[c]}</div>
        <div style="font-family:Cinzel,serif;font-size:9px;font-weight:700;color:${isMe ? 'var(--goldlit)' : 'var(--textlit)'}">${D.CITIES[c].name}</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:var(--goldlit)">${counts[c]} ${t('war.stone_count')}</div>
        <div style="font-size:9px;color:${cpMod > 0 ? 'var(--safe)' : cpMod < 0 ? 'var(--danger)' : 'var(--textdim)'}">${cpMod > 0 ? '+' : ''}${cpMod}% CP</div>
      </div>`;
    }
    cityH += '</div>';

    // stones list
    let stonesH = '<div style="font-family:Cinzel,serif;font-size:9px;letter-spacing:2px;color:var(--gold);text-transform:uppercase;font-weight:700;margin:8px 0">' + t('war.stones_label') + '</div>';
    for (const s of ws.stones) {
      const svgKey = s.golden ? 'altin' : (stoneSvgMap[s.city] || 'buz');
      const ownerLabel = s.owner ? (CITY_ICONS[s.owner] + ' ' + D.CITIES[s.owner].name) : t('war.empty');
      const hpPct = Math.round(s.hp / D.WAR.stoneHP * 100);
      const barCol = hpPct > 60 ? 'var(--safe)' : hpPct > 30 ? 'var(--warn)' : 'var(--danger)';
      stonesH += `<div style="display:flex;align-items:center;gap:8px;padding:6px;background:rgba(0,0,0,.2);border:1px solid ${s.golden ? 'var(--gold)' : 'var(--border)'};border-radius:7px;margin-bottom:4px">
        <div style="width:30px;height:34px;flex-shrink:0;display:flex;align-items:center;justify-content:center">${STONE_SVG[svgKey] || '🪨'}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:10px;color:${s.golden ? 'var(--goldlit)' : 'var(--textlit)'}">${s.name}${s.golden ? ' ★' : ''}</div>
          <div style="font-size:9px;color:var(--textdim)">${t('war.owner')}: ${ownerLabel} · ${s.cooldown > 0 ? '<span style="color:var(--warn)">' + t('war.cooldown') + '</span>' : ''}</div>
          <div style="height:4px;border-radius:2px;background:#1a1610;margin-top:3px"><div style="height:100%;width:${hpPct}%;border-radius:2px;background:${barCol}"></div></div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:8px;color:var(--textdim);margin-top:1px">${fmt(s.hp)} / ${fmt(D.WAR.stoneHP)} HP</div>
        </div>
      </div>`;
    }

    // war log (last 5 events)
    let logH = '';
    if (ws.log && ws.log.length) {
      logH = '<div style="font-family:Cinzel,serif;font-size:9px;letter-spacing:2px;color:var(--gold);text-transform:uppercase;font-weight:700;margin:10px 0 4px">' + t('war.log') + '</div>';
      for (const l of ws.log.slice(-5).reverse()) {
        logH += `<div style="font-size:9px;color:var(--textdim);padding:2px 0;border-bottom:1px dashed rgba(90,74,48,.2)">${l}</div>`;
      }
    }

    $('#warBody').innerHTML = statusH + cityH + stonesH + logH;
  }

  // ============ TRADE (TICARET) SCREEN ============
  let tradeNPC = null, tradePlayerSlots = [], tradeNPCSlots = [], tradePlayerGold = 0, tradeConfirmed = [false, false];
  function openTrade() {
    tradeNPC = C.generateTradeNPC();
    tradePlayerSlots = [];
    tradeNPCSlots = tradeNPC.offerItems.slice(0, 3);
    tradePlayerGold = 0;
    tradeConfirmed = [false, false];
    renderTrade();
    openMB('tradeModal');
  }
  function renderTrade() {
    const P = S.get();
    if (!tradeNPC) return;
    const trader = tradeNPC.trader;
    const goldWant = tradeNPC.goldWant;

    // NPC info
    let npcH = `<div style="display:flex;align-items:center;gap:8px;padding:8px;background:rgba(0,0,0,.3);border:1px solid var(--border);border-radius:8px;margin-bottom:10px">
      <span style="font-size:24px">${trader.icon}</span>
      <div><div style="font-weight:700;font-size:12px;color:var(--textlit)">${trader.name}</div>
      <div style="font-size:9px;color:var(--textdim)">${t('trade.specialty')}: ${trader.specialty} · ${t('trade.gold_want')}: ${fmt(goldWant)} 💰</div></div>
    </div>`;

    // split layout
    function renderGrid(items, side, maxSlots) {
      let h = '<div class="grid" style="grid-template-columns:repeat(6,1fr);gap:3px">';
      for (let i = 0; i < maxSlots; i++) {
        if (i < items.length) {
          const it = items[i];
          const rc = RAR_CLS[it.rarity];
          h += `<div class="slot ${rc}" data-act="trade${side}click" data-idx="${i}" style="cursor:pointer"><div class="slot-inner">${eqEmoji(it)}</div></div>`;
        } else {
          h += `<div class="slot empty" data-act="trade${side}add" data-idx="${i}"><div class="slot-inner" style="font-size:14px;opacity:.3">+</div></div>`;
        }
      }
      h += '</div>';
      return h;
    }

    let leftH = `<div style="flex:1;min-width:0">
      <div style="font-family:Cinzel,serif;font-size:8px;letter-spacing:1.5px;color:var(--gold);text-transform:uppercase;font-weight:700;margin-bottom:4px">${t('trade.your_offer')}</div>
      ${renderGrid(tradePlayerSlots, 'player', 12)}
      <div style="display:flex;align-items:center;gap:4px;margin-top:6px">
        <span style="font-size:9px;color:var(--textdim)">${t('trade.gold')}</span>
        <input type="number" id="tradeGoldInput" min="0" max="${P.gold}" value="${tradePlayerGold}" style="width:70px;background:#1a1410;border:1px solid var(--border);color:var(--goldlit);font-family:'JetBrains Mono';font-size:11px;padding:3px 6px;border-radius:4px;outline:none">
      </div>
    </div>`;

    let rightH = `<div style="flex:1;min-width:0">
      <div style="font-family:Cinzel,serif;font-size:8px;letter-spacing:1.5px;color:var(--gold);text-transform:uppercase;font-weight:700;margin-bottom:4px">${esc(trader.name)} ${t('trade.offer')}</div>
      ${renderGrid(tradeNPCSlots, 'npc', 12)}
      <div style="margin-top:6px;font-size:9px;color:var(--textdim)">${t('trade.gold')} <span style="color:var(--goldlit)">${fmt(goldWant)} 💰</span></div>
    </div>`;

    // confirm buttons
    let playerConf = tradeConfirmed[0] ? '<span style="color:var(--safe);font-weight:700">' + t('trade.confirmed') + '</span>' : `<button class="btn sm" data-act="tradeconfirmplayer">${t('trade.confirm')}</button>`;
    let npcConf = tradeConfirmed[1] ? '<span style="color:var(--safe);font-weight:700">' + t('trade.confirmed') + '</span>' : '<span style="font-size:9px;color:var(--textdim)">' + t('trade.npc_waiting') + '</span>';

    let actsH = `<div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;padding:8px;background:rgba(0,0,0,.3);border:1px solid var(--border);border-radius:8px">
      <div style="text-align:center">${playerConf}</div>
      <span style="font-size:16px">⇆</span>
      <div style="text-align:center">${npcConf}</div>
    </div>`;

    $('#tradeBody').innerHTML = npcH + `<div style="display:flex;gap:8px">${leftH}${rightH}</div>` + actsH;

    // bind gold input
    const gi = $('#tradeGoldInput');
    if (gi) gi.addEventListener('input', e => { tradePlayerGold = Math.max(0, Math.min(P.gold, parseInt(e.target.value) || 0)); });
  }

  function tradeAddPlayerItem() {
    const P = S.get();
    if (tradePlayerSlots.length >= 12) { toast(t('trade.slots_full')); return; }
    // show picker: items from inventory
    const pool = P.equipItems.filter(it => !tradePlayerSlots.find(s => s.id === it.id));
    if (!pool.length) { toast(t('trade.no_equip')); return; }
    let pickerH = '<div style="font-family:Cinzel,serif;font-size:9px;color:var(--gold);margin-bottom:6px">' + t('trade.select_equip') + '</div><div class="grid">';
    for (const it of pool) {
      pickerH += `<div class="slot ${RAR_CLS[it.rarity]}" data-act="tradepickitem" data-id="${it.id}" style="cursor:pointer"><div class="slot-inner">${eqEmoji(it)}</div></div>`;
    }
    pickerH += '</div>';
    openSheet(t('trade.select_item'), t('trade.for_trade'), pickerH);
  }
  function tradePickItem(id) {
    const it = S.getEquipItem(id);
    if (!it) return;
    tradePlayerSlots.push(it);
    closeMB('sheetModal');
    renderTrade();
  }
  function tradeConfirmPlayer() {
    const P = S.get();
    if (tradePlayerGold > P.gold) { toast(t('trade.insufficient')); return; }
    if (!tradePlayerSlots.length && tradePlayerGold <= 0) { toast(t('trade.offer_sth')); return; }
    tradeConfirmed[0] = true;
    // NPC auto-confirms after 1s
    setTimeout(() => {
      if (!tradeNPC) return;
      tradeConfirmed[1] = true;
      renderTrade();
      // complete trade
      setTimeout(() => completeTrade(), 500);
    }, 800);
    renderTrade();
  }
  function completeTrade() {
    const P = S.get();
    // remove player items
    for (const it of tradePlayerSlots) S.removeEquip(it.id);
    P.gold -= tradePlayerGold;
    // add NPC items
    for (const it of tradeNPCSlots) { if (!S.invFull()) S.addEquip(it); }
    P.gold += tradeNPC.goldWant;
    toast(t('trade.complete'));
    tradeNPC = null;
    closeMB('tradeModal');
    renderTop();
  }
  function tradeRemovePlayerItem(idx) {
    if (idx >= 0 && idx < tradePlayerSlots.length) {
      tradePlayerSlots.splice(idx, 1);
      renderTrade();
    }
  }

  // buff info popover
  function buffInfo(buffKey, rect) {
    const pop = $('#buffPop');
    if (!pop) return;
    let title = '', src = '', val = '';
    if (buffKey === 'premium') {
      var premDays = Math.ceil(S.premiumTimeLeft() / 86400000);
      title = t('buff.premium_title', { days: premDays });
      src = t('buff.premium_src');
      val = t('buff.premium_val');
    } else if (buffKey.startsWith('city:')) {
      const name = buffKey.slice(5);
      title = name; src = t('buff.city_src'); val = t('buff.city_val');
    } else if (buffKey.startsWith('active:')) {
      const eff = buffKey.slice(7);
      const def = D.BUFFS[eff] || { name: eff, icon: '✨' };
      const P = S.get(); const now = Date.now();
      const b = P.activeBuffs.find(x => x.eff === eff);
      const left = b ? Math.max(0, Math.round((b.end - now) / 1000)) : 0;
      title = def.icon + ' ' + def.name;
      src = t('buff.cons_src');
      val = b ? '+' + b.val + '% · ' + Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0') + ' ' + t('buff.remaining') : t('buff.expired');
    }
    pop.innerHTML = `<div class="bp-title">${title}</div><div class="bp-src">${src}</div><div class="bp-val">${val}</div>`;
    pop.classList.add('show');
    // position near the buff square
    const px = rect.left + rect.width / 2;
    const py = rect.bottom + 6;
    pop.style.left = Math.max(8, Math.min(window.innerWidth - 210, px - 100)) + 'px';
    pop.style.top = py + 'px';
    // auto-hide after 3s
    clearTimeout(pop._ht);
    pop._ht = setTimeout(() => pop.classList.remove('show'), 3000);
  }
  function closeBuffPop() { const p = $('#buffPop'); if (p) p.classList.remove('show'); }

  // ============ LISTING PRICE MODAL ============
  function openListModal(type, dataKey, sugPrice) {
    const isEquip = type === 'equip';
    const P = S.get();
    let maxQty = 1;
    if (!isEquip) {
      const p = E.parseMatKey(dataKey);
      maxQty = S.matCount(dataKey) || 1;
    }
    const unitPrice = isEquip ? sugPrice : Math.round(sugPrice / maxQty) || 1;
    const defaultQty = isEquip ? 1 : maxQty;
    const totalPrice = unitPrice * defaultQty;
    const taxRate = C.effectiveTax();
    const taxAmt = Math.round(totalPrice * taxRate);
    const netAmt = totalPrice - taxAmt;

    const qtySection = isEquip ? `<input type="hidden" id="listQtyInput" value="1">` : `
      <div style="margin-bottom:10px">
        <div style="font-size:9px;color:var(--textdim);margin-bottom:4px;text-align:center">${t('list.quantity')}</div>
        <div style="display:flex;align-items:center;gap:8px;justify-content:center">
          <input type="number" id="listQtyInput" min="1" max="${maxQty}" value="${defaultQty}" style="width:80px;background:#1a1410;border:1px solid var(--border);color:var(--textlit);font-family:'JetBrains Mono';font-size:14px;font-weight:700;text-align:center;padding:6px;border-radius:8px;outline:none">
          <span style="font-size:10px;color:var(--textdim)">/ ${maxQty}</span>
        </div>
      </div>`;

    const body = `<div style="text-align:center;margin-bottom:12px">
        <div style="font-family:Cinzel,serif;font-size:11px;color:var(--textlit);font-weight:700">${t('list.set_price')}</div>
        <div style="font-size:9px;color:var(--textdim);margin-top:2px">${t('list.npc_hint')}</div>
      </div>
      ${qtySection}
      <div style="text-align:center;margin-bottom:6px">
        <div style="font-size:9px;color:var(--textdim);margin-bottom:4px">${t('list.unit_price')}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;justify-content:center;margin-bottom:12px">
        <input type="number" id="listPriceInput" min="1" value="${unitPrice}" style="width:120px;background:#1a1410;border:1px solid var(--border);color:var(--goldlit);font-family:'JetBrains Mono';font-size:16px;font-weight:700;text-align:center;padding:8px;border-radius:8px;outline:none">
        <span style="font-size:14px">💰/ad</span>
      </div>
      <div style="display:flex;gap:6px;justify-content:center;margin-bottom:12px">
        <button class="btn sm ghost" data-act="listquick" data-m="0.8">-20%</button>
        <button class="btn sm ghost" data-act="listquick" data-m="1">${t('list.suggested')}</button>
        <button class="btn sm ghost" data-act="listquick" data-m="1.5">+50%</button>
        <button class="btn sm ghost" data-act="listquick" data-m="2">x2</button>
      </div>
      <div id="listCalcSummary" style="background:rgba(0,0,0,.25);border:1px solid var(--section-border);border-radius:8px;padding:8px 12px;margin-bottom:12px;font-size:11px">
        <div style="display:flex;justify-content:space-between;color:var(--textlit)"><span>${t('list.total')}</span><span id="listCalcTotal">${fmt(totalPrice)} 💰</span></div>
        <div style="display:flex;justify-content:space-between;color:#f08080"><span>${t('list.tax')} (%${Math.round(taxRate*100)})</span><span id="listCalcTax">-${fmt(taxAmt)} 💰</span></div>
        <div style="display:flex;justify-content:space-between;color:var(--safe);font-weight:700;border-top:1px solid var(--section-border);padding-top:4px;margin-top:4px"><span>${t('list.net')}</span><span id="listCalcNet">${fmt(netAmt)} 💰</span></div>
      </div>
      <button class="btn full" data-act="listconfirm" data-type="${type}" data-key="${dataKey}" data-sug="${unitPrice}">${t('mkt.list_btn')}</button>`;
    openSheet(t('list.sell_title'), '', body);
    // bind calc update
    const priceIn = document.getElementById('listPriceInput');
    const qtyIn = document.getElementById('listQtyInput');
    function updateCalc() {
      const q = parseInt(qtyIn.value) || 1;
      const u = parseInt(priceIn.value) || 0;
      const t = q * u;
      const tx = Math.round(t * taxRate);
      document.getElementById('listCalcTotal').textContent = fmt(t) + ' 💰';
      document.getElementById('listCalcTax').textContent = '-' + fmt(tx) + ' 💰';
      document.getElementById('listCalcNet').textContent = fmt(t - tx) + ' 💰';
    }
    if (priceIn) priceIn.addEventListener('input', updateCalc);
    if (qtyIn) qtyIn.addEventListener('input', updateCalc);
  }

  // ============ MAILBOX (POSTA) ============
  function openMailbox() {
    renderMailbox();
    openMB('mailboxModal');
  }
  function renderMailbox() {
    const P = S.get();
    const mails = (P.mailbox || []).slice().reverse();
    const unreadGold = mails.filter(m => !m.read && m.gold > 0).reduce((s, m) => s + m.gold, 0);
    let html = '';
    if (unreadGold > 0) {
      html += `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:rgba(200,160,48,.1);border:1px solid var(--gold);border-radius:8px;margin-bottom:10px">
        <span style="font-family:Cinzel,serif;font-size:10px;color:var(--goldlit);font-weight:700">${t('mail.pending_gold')}: ${fmt(unreadGold)} 💰</span>
        <button class="btn sm" data-act="mailcollectall">${t('mail.collect_all')}</button>
      </div>`;
    }
    if (!mails.length) {
      html += '<div class="empty-note">' + t('mail.empty') + '</div>';
    } else {
      for (const m of mails) {
        const date = new Date(m.timestamp);
        const loc = SKY.LANG.getLang() === 'en' ? 'en-US' : 'tr-TR';
        const timeStr = date.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' });
        const dateStr = date.toLocaleDateString(loc, { day: '2-digit', month: '2-digit' });
        const icon = m.type === 'sale' ? '💰' : '📩';
        const readCls = m.read ? 'opacity:.5' : '';
        html += `<div class="list-card" style="${readCls}"><div class="lc-left"><span class="lc-ic" style="font-size:16px">${icon}</span>
          <div><div class="lc-title" style="font-size:11px">${esc(m.msg)}</div>
          <div class="lc-sub">${dateStr} ${timeStr}${m.gold ? ' · ' + fmt(m.gold) + ' 💰' : ''}</div></div></div>
          ${!m.read ? '<span style="width:8px;height:8px;border-radius:50%;background:var(--gold);flex-shrink:0"></span>' : ''}</div>`;
      }
    }
    const el = $('#mailboxBody');
    if (el) el.innerHTML = html;
  }
  function mailCollectAll() {
    const P = S.get();
    let total = 0;
    for (const m of P.mailbox) {
      if (!m.read) { m.read = true; }
    }
    renderMailbox();
    renderTop();
    toast('📩 ' + t('mail.read'));
  }

  // player action stubs (gather modal)
  function playerAttack(name) { toast('⚔️ ' + name + ' ' + t('pvp.attack_started')); }
  function playerTrade(name) { toast('🤝 ' + name + ' ' + t('pvp.trade_sent')); }

  // MENU stats
  function renderMenuStats() {
    const st = S.get().stats;
    $('#menuStats').innerHTML = `<li>Kill: <span class="bonus">${fmt(st.kills)}</span> · Boss: <span class="bonus">${fmt(st.bossKills)}</span></li><li>${t('stat.gathered')}: <span class="bonus">${fmt(st.gathered)}</span></li><li>Craft: <span class="bonus">${fmt(st.crafted)}</span> · ${t('stat.deaths')}: ${fmt(st.deaths)}</li>`;
  }

  // ---------- modal helpers ----------
  function openMB(id) { $('#' + id).classList.add('active'); }
  function closeMB(id) { $('#' + id).classList.remove('active'); if (id === 'gatherModal') stopGatherPlayerPoll(); }
  function closeAllModals() { $$('.modal-bg').forEach(m => m.classList.remove('active')); stopGatherPlayerPoll(); }

  // ---------- screen switch ----------
  function show(screen) {
    activeScreen = screen;
    $$('.screen').forEach(s => s.classList.toggle('active', s.id === 'screen-' + screen));
    if (screen === 'map') renderMap();
    else if (screen === 'world') renderWorld();
    else if (screen === 'menu') renderMenuStats();
    // dungeon is now a modal, no screen to show
    // banka ve bag artık modal — show() ile açılmaz
    renderTop();
    // Hide chat/inv on menu & world screens; PvP icon only on map (zone)
    var hud = $('#hudFloat'), chat = $('#chatBar'), evt = $('#evtPvpIcon');
    var hideChat = (screen === 'menu' || screen === 'world');
    if (screen === 'menu') {
      if (hud) hud.style.display = 'none';
      if (evt) evt.style.display = 'none';
    } else if (screen === 'map') {
      if (hud) hud.style.display = '';
      // evt icon is managed by EVT.tick() — allow it on map
    } else {
      // world or other screens
      if (hud) hud.style.display = '';
      if (evt) evt.style.display = 'none';
    }
    if (chat) chat.style.display = hideChat ? 'none' : '';
  }

  // ============ RARE DROP BANNER ============
  function showRareDropBanner(item) {
    const isRed = item.rarity >= 4;
    const cls = isRed ? 'red' : 'orange';
    const rarCls = RAR_CLS[item.rarity];
    const iconHtml = item.type === 'mat' ? matSVG(item.family || 'odun', item.tier || 1) : eqEmoji(item);
    const banner = document.createElement('div');
    banner.className = 'rare-drop-banner ' + cls;
    banner.innerHTML = '<div class="rdb-slot ' + rarCls + '"><div class="slot-inner">' + iconHtml + '</div></div><div><div class="rdb-text">' + item.name + '</div><div class="rdb-sub">' + D.RARITY[item.rarity].name + ' · T' + item.tier + '</div></div>';
    document.body.appendChild(banner);
    setTimeout(function() { banner.style.opacity = '0'; banner.style.transition = 'opacity .5s'; }, 2500);
    setTimeout(function() { banner.remove(); }, 3000);
  }

  // ============ WAR STONE MODAL ============
  function openStoneModal(stoneId) {
    var ws = window.SKY_WAR_STATE;
    if (!ws) { toast(t('stone.not_loaded')); return; }
    var stone = ws.stones.find(function(s) { return s.id === stoneId; });
    if (!stone) { toast(t('stone.not_found')); return; }
    var P = S.get();
    var myCity = P.city;
    var isOwner = stone.owner === myCity;
    var cityNames = { kar: t('city.kar_full'), orman: t('city.orman_full'), col: t('city.col_full') };
    var ownerName = cityNames[stone.owner] || stone.owner || t('stone.no_owner');
    var hpPct = Math.round((stone.hp / D.WAR.stoneHP) * 100);
    var hpColor = hpPct > 60 ? 'var(--safe)' : hpPct > 30 ? 'var(--warn)' : 'var(--danger)';

    var html = '';

    // Stone info card
    html += '<div style="background:rgba(0,0,0,.2);border:1px solid var(--section-border);border-radius:10px;padding:12px;margin-bottom:10px">';
    html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">';
    html += '<div><div style="font-family:Cinzel,serif;font-size:13px;font-weight:700;color:var(--goldlit)">' + esc(stone.name) + '</div>';
    html += '<div style="font-size:10px;color:var(--textdim)">' + (stone.golden ? t('stone.golden') : t('stone.regional')) + '</div></div>';
    html += '<div style="font-size:10px;color:var(--textlit)">' + t('stone.owner_label') + ': <span style="color:var(--goldlit)">' + ownerName + '</span></div></div>';
    // HP bar
    html += '<div style="display:flex;align-items:center;gap:8px"><span style="font-size:9px;color:var(--textdim)">HP</span>';
    html += '<div style="flex:1;height:10px;background:rgba(0,0,0,.4);border-radius:5px;overflow:hidden;border:1px solid var(--section-border)">';
    html += '<div style="width:' + hpPct + '%;height:100%;background:' + hpColor + ';border-radius:4px;transition:width .3s"></div></div>';
    html += '<span style="font-size:9px;font-family:JetBrains Mono,monospace;color:' + hpColor + '">' + stone.hp + '/' + D.WAR.stoneHP + '</span></div>';
    html += '</div>';

    // War info
    html += '<div style="background:rgba(200,160,48,.04);border:1px solid rgba(200,160,48,.15);border-radius:8px;padding:10px;margin-bottom:10px;font-size:10px;color:var(--textdim);line-height:1.6">';
    html += '<strong style="color:var(--goldlit)">' + t('stone.war_title') + '</strong><br>';
    html += t('stone.war_desc');
    html += '</div>';

    // Status
    var warActive = ws.active;
    html += '<div style="text-align:center;margin-bottom:10px">';
    if (warActive) {
      html += '<div style="font-size:11px;color:var(--danger);font-weight:700;letter-spacing:1px">⚔️ ' + t('war.active') + '</div>';
    } else {
      var next = ws.nextWarTime ? new Date(ws.nextWarTime) : null;
      var _loc = SKY.LANG.getLang() === 'en' ? 'en-US' : 'tr-TR';
      var timeStr = next ? next.toLocaleDateString(_loc,{weekday:'short'}) + ' ' + next.toLocaleTimeString(_loc,{hour:'2-digit',minute:'2-digit'}) : '?';
      html += '<div style="font-size:10px;color:var(--textdim)">' + t('stone.next_war') + ': <span style="color:var(--goldlit)">' + timeStr + '</span></div>';
    }
    html += '</div>';

    // Players section
    html += '<div style="font-family:Cinzel,serif;font-size:9px;letter-spacing:1.5px;color:var(--gold);font-weight:700;text-transform:uppercase;margin-bottom:6px">' + t('stone.players') + '</div>';
    var defNames = [t('npc.def1'), t('npc.def2'), t('npc.def3')];
    var atkNames = [t('npc.atk1'), t('npc.atk2'), t('npc.atk3')];
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">';
    // Defenders
    html += '<div style="background:rgba(90,170,58,.05);border:1px solid rgba(90,170,58,.2);border-radius:8px;padding:8px">';
    html += '<div style="font-size:9px;color:var(--safe);font-weight:700;margin-bottom:4px;text-align:center">' + t('stone.defense') + '</div>';
    if (isOwner) html += '<div style="font-size:9px;padding:2px 0;color:var(--goldlit)">🧙 ' + t('stone.you') + ' (' + fmt(E.baseCP(P.equipped)) + ' CP)</div>';
    for (var di = 0; di < defNames.length; di++) {
      html += '<div style="font-size:9px;padding:2px 0;color:var(--textdim)">👤 ' + defNames[di] + '</div>';
    }
    html += '</div>';
    // Attackers
    html += '<div style="background:rgba(224,64,64,.05);border:1px solid rgba(224,64,64,.2);border-radius:8px;padding:8px">';
    html += '<div style="font-size:9px;color:var(--danger);font-weight:700;margin-bottom:4px;text-align:center">' + t('stone.attack') + '</div>';
    if (!isOwner) html += '<div style="font-size:9px;padding:2px 0;color:var(--goldlit)">🧙 ' + t('stone.you') + ' (' + fmt(E.baseCP(P.equipped)) + ' CP)</div>';
    for (var ai = 0; ai < atkNames.length; ai++) {
      html += '<div style="font-size:9px;padding:2px 0;color:var(--textdim)">👤 ' + atkNames[ai] + '</div>';
    }
    html += '</div>';
    html += '</div>';

    // Action button
    if (warActive) {
      if (isOwner) {
        html += '<button class="btn full" style="background:rgba(90,170,58,.1);border-color:var(--safe);color:var(--safe)" data-act="stonedefend" data-sid="' + stoneId + '">' + t('stone.join_defense') + '</button>';
      } else {
        html += '<button class="btn full" style="background:rgba(224,64,64,.1);border-color:var(--danger);color:#f08080" data-act="stoneattack" data-sid="' + stoneId + '">' + t('stone.join_attack') + '</button>';
      }
    } else {
      html += '<div style="text-align:center;font-size:10px;color:var(--textdim);padding:8px">' + t('stone.war_inactive') + '</div>';
    }

    $('#stoneTitle').textContent = '⚔️ ' + stone.name;
    $('#stoneSub').textContent = ownerName + ' · ' + (warActive ? t('war.active') : t('war.peace'));
    $('#stoneBody').innerHTML = html;
    openMB('stoneModal');
  }

  return {
    $, $$, esc, fmt, toast, show, renderTop, renderMap, renderWorld, refreshIfMap,
    openGather, setGatherUI, addGatherDrops, gatherProgress, getGatherNode,
    openDungeon, renderDungeonList, renderDungeonSelect, renderFight, enterDungeonView,
    fightTickUI, pushFightLog, addDungeonLoot, dungeonMobDeath, updateMobDisplay, renderBossQueue, renderDgInv, renderGatherInv,
    showDungeonSummary, isDunAutoOn, toggleDunAuto, getDunExpanded, setDunExpanded, setDunBiome, getDunSummary,
    openTravel, getTravelTarget, openSheet,
    openBag, renderBag, bagSelect, setBagCat, toggleSort, clearBagSel, closePop, openBldModal, compareItem,
    toggleStats: function() { statsOpen = !statsOpen; renderCharStats(); },
    itemInfo, matInfo, openAtolye, renderAtolye, enhanceSheet, upgradeSheet,
    openBanka, renderBanka, bankSelect, bankSortSide, getBankSel, bankDragTransfer, openXfer, xfQuick, confirmXfer, bankCity, bankUpgradeUI,
    openPazar, renderPazar, openBuyModal, doBuy, mktPageNav: function(d) { mktPage = Math.max(0, mktPage + d); renderPazar(); }, renderMenuStats,
    openMount, renderMount, openShop, renderShop, openWar, renderWar, openStoneModal, openTrade, renderTrade,
    tradeAddPlayerItem, tradePickItem, tradeConfirmPlayer, tradeRemovePlayerItem,
    buffInfo, closeBuffPop, playerAttack, playerTrade,
    openListModal, openMailbox, renderMailbox, mailCollectAll, showRareDropBanner,
    set shopTab(v) { shopTab = v; },
    openMB, closeMB, closeAllModals,
    matSVG, nodeSVG, RK, RKU, rarColor, ZONE_IMG, imgUrl,
    get activeScreen() { return activeScreen; },
    set atTab(v) { atTab = v; }, get atTab() { return atTab; },
    set selCraft(v) { selCraft = v; }, set slotRar(v) { slotRar = v; }, get slotRar() { return slotRar; },
    set enhSelItem(v) { enhSelItem = v; }, get enhSelItem() { return enhSelItem; },
    set enhSelStone(v) { enhSelStone = v; }, get enhSelStone() { return enhSelStone; },
    set enhSelCharm(v) { enhSelCharm = v; }, get enhSelCharm() { return enhSelCharm; },
    pickSlotRar: function(si, ri) { slotRar[si] = ri; renderAtolye(); },
    set craftTier(v) { craftTier = v; }, get craftTier() { return craftTier; },
    set dunTier(v) { dunTier = v; }, get dunTier() { return dunTier; },
    set mktTab(v) { mktMainTab = v; mktPage = 0; }, get mktTab() { return mktMainTab; },
  };
})();
