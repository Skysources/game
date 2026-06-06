/* ============================================================
   SKYZONE · ENGINE
   Item üretimi, CP hesabı, perk roll, RNG.
   ============================================================ */
window.SKY = window.SKY || {};

SKY.E = (function () {
  const D = SKY.D;

  // ---- RNG ----
  const rnd = () => Math.random();
  const rint = (a, b) => Math.floor(rnd() * (b - a + 1)) + a;
  const rfloat = (a, b) => rnd() * (b - a) + a;
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  let _id = 1;
  const uid = () => 'i' + (_id++) + (Date.now() % 100000);

  // cascade [w,g,b,o,r] olasılıklardan rarity index seç
  function rollCascade(cascade) {
    const total = cascade.reduce((a, b) => a + b, 0);
    let r = rnd() * total;
    for (let i = 0; i < cascade.length; i++) {
      if (r < cascade[i]) return i;
      r -= cascade[i];
    }
    return 0;
  }

  // ---- Malzeme item (stackable) ----
  function makeMat(family, tier, rarityIdx) {
    return {
      kind: 'mat', family, tier, rarity: rarityIdx,
      name: D.MAT_NAMES[family][tier - 1],
      art: 'item-' + family + '-' + tier,
    };
  }
  function matKey(family, tier, rarityIdx) {
    return 'mat:' + family + ':' + tier + ':' + rarityIdx;
  }
  function parseMatKey(k) {
    const p = k.split(':');
    return { family: p[1], tier: +p[2], rarity: +p[3] };
  }

  // ---- Perk roll ----
  // roll kalitesi: değerin aralık içindeki konumu → 1..5
  function quality(val, range) {
    const [mn, mx] = range;
    if (mx <= mn) return 5;
    return Math.max(1, Math.min(5, Math.round(1 + 4 * (val - mn) / (mx - mn))));
  }
  // bir perkin kalitesini hesapla (q yoksa val + item rarity'den)
  function perkQuality(perk, rarityIdx) {
    if (typeof perk.q === 'number') return perk.q;
    const range = D.MAG[perk.cat] && D.MAG[perk.cat][rarityIdx];
    if (!range) return 5;
    return quality(perk.val, range);
  }

  function rollPerks(type, rarityIdx, count) {
    const pool = (D.SPECIFIC_PERKS[type] || []).slice();
    let gen = D.GENERAL_PERKS.slice();
    if (type === 'canta') gen = gen.filter(p => p.id !== 'bilge'); // çanta exp yok
    const all = pool.concat(gen);
    const chosen = [];
    const used = new Set();
    let guard = 0;
    while (chosen.length < count && guard++ < 100) {
      const p = pick(all);
      if (used.has(p.id)) continue;
      used.add(p.id);
      const range = D.MAG[p.cat][rarityIdx];
      let v = rfloat(range[0], range[1]);
      v = Math.round(v * 10) / 10;
      chosen.push({ id: p.id, name: p.name, icon: p.icon, cat: p.cat, eff: p.eff, val: v, q: quality(v, range) });
    }
    return chosen;
  }

  // ---- Ekipman item üretimi ----
  // opts: {type, tier, rarityIdx, crafted(bool)}
  function makeEquip(opts) {
    const { type, tier, rarityIdx } = opts;
    const crafted = opts.crafted !== false;
    const base = D.BASE_STATS[type] || {};
    const tmult = D.TIER_MULT[tier];
    const rmult = D.RARITY[rarityIdx].mult;
    const stats = {};
    for (const k in base) {
      // weight/speed/yieldp tier+rarity ile ölçeklenir ama daha yumuşak
      if (k === 'weight' || k === 'speed' || k === 'yieldp') {
        const roll = rfloat(base[k] * 0.75, base[k] * 1.25);
        if (k === 'weight') stats[k] = Math.round(roll * tmult * (1 + rarityIdx * 0.25));
        else if (k === 'speed') stats[k] = Math.round(roll * (1 + (tier - 1) * 0.5) * (1 + rarityIdx * 0.15) * 10) / 10;
        else stats[k] = Math.round(roll * (1 + (tier - 1) * 0.4) * (1 + rarityIdx * 0.3) * 10) / 10;
      } else {
        const roll = rfloat(base[k] * 0.75, base[k] * 1.25);
        stats[k] = Math.round(roll * tmult * rmult * 10) / 10;
      }
    }
    let pc = D.RARITY[rarityIdx].perks;
    if (!crafted) pc = Math.min(pc, rint(1, 4)); // dropped 1-4
    const perks = rollPerks(type, rarityIdx, pc);
    return {
      id: uid(), kind: 'equip', type, tier, rarity: rarityIdx,
      name: equipName(type, tier, rarityIdx),
      icon: D.RECIPES[type].icon,
      stats, perks, enh: 0, crafted,
    };
  }

  function equipName(type, tier, rarityIdx) {
    return 'T' + tier + ' ' + D.RARITY[rarityIdx].k + ' ' + D.RECIPES[type].name;
  }

  // ---- T0 starter ----
  function makeT0(type) {
    return {
      id: uid(), kind: 'equip', type, tier: 0, rarity: 0,
      name: 'T0 ' + D.RECIPES[type].name, icon: D.RECIPES[type].icon,
      stats: Object.assign({}, D.T0_SET[type]), perks: [], enh: 0, t0: true, crafted: false,
    };
  }

  // ---- Item CP (perk direct dahil) ----
  function itemCP(item) {
    let cp = item.stats.cp || 0;
    for (const p of item.perks) {
      if (p.cat === 'direct' && p.eff === 'cp') {
        cp *= (1 + p.val / 100);
      }
    }
    return cp;
  }
  // legacy compat wrapper
  function itemAtkDef(item) { const c = itemCP(item); return { atk: 0, def: 0, cp: c }; }

  // ---- Tam CP hesabı ----
  // ctx: {target:'mob'|'boss'|'pvp', theme:'kar'|'orman'|'col', war:bool, buffs:{cp}}
  function computeCP(equipped, ctx) {
    ctx = ctx || {};
    let sumCP = 0;
    let enhSum = 0, enhCount = 0;
    let condPct = 0;     // koşullu CP bonusları
    for (const slot in equipped) {
      const it = equipped[slot];
      if (!it) continue;
      sumCP += itemCP(it);
      enhSum += it.enh || 0; enhCount++;
      for (const p of it.perks) {
        if (p.cat === 'cond') {
          if (p.eff === 'vsmob' && ctx.target === 'mob') condPct += p.val;
          if (p.eff === 'vspvp' && ctx.target === 'pvp') condPct += p.val;
          if (p.eff === 'vsboss' && ctx.target === 'boss') condPct += p.val;
          if (p.eff === 'vswar' && ctx.war) condPct += p.val;
          if (p.eff === 'theme_all' && ctx.theme) condPct += p.val;
          if (p.eff === ('theme_' + ctx.theme)) condPct += p.val;
        }
      }
    }
    const avgEnh = enhCount ? enhSum / enhCount : 0;
    let cp = sumCP * (1 + avgEnh / 100);
    cp *= (1 + condPct / 100);
    if (ctx.buffs && ctx.buffs.cp) cp *= (1 + ctx.buffs.cp / 100);
    return Math.round(cp);
  }

  // base CP (perk koşulsuz) — UI özet için
  function baseCP(equipped) {
    return computeCP(equipped, {});
  }

  // ---- Cape istatistikleri ----
  function capeStats(equipped) {
    const cape = equipped.pelerin;
    let proc = 0, mult = 0, procBonus = 0, multBonus = 0, crit = 0, dodge = 0;
    if (cape && !cape.t0) {
      proc = D.CAPE_PROC_CHANCE[D.RARITY[cape.rarity].k];
      mult = D.CAPE_MULT[cape.tier] || 2.0;
      for (const p of cape.perks) {
        if (p.eff === 'capeproc') procBonus += p.val;
        if (p.eff === 'capemult') multBonus += p.val;
        if (p.eff === 'crit') crit += p.val;
        if (p.eff === 'dodge') dodge += p.val;
      }
    }
    return {
      proc: proc + procBonus,
      mult: mult * (1 + multBonus / 100),
      crit: Math.min(crit, 10),
      dodge: Math.min(dodge, 10),
    };
  }

  // ---- Savaş çözümü (12sn idle) ----
  // returns {win, playerCP, enemyCP, capeProc, crit, dodged, log}
  function resolveCombat(playerEquipped, enemyCP, ctx) {
    const log = [];
    let pCP = computeCP(playerEquipped, ctx);
    const cs = capeStats(playerEquipped);
    let capeProc = false, crit = false;
    if (rnd() * 100 < cs.proc) { pCP = Math.round(pCP * cs.mult); capeProc = true; log.push('🦋 ' + SKY.LANG.t('eng.cape_proc') + ' ×' + cs.mult.toFixed(2)); }
    if (rnd() * 100 < cs.crit) { pCP = Math.round(pCP * 2); crit = true; log.push('⚡ ' + SKY.LANG.t('eng.critical') + ' ×2'); }

    const maxCP = Math.max(pCP, enemyCP);
    const minCP = Math.min(pCP, enemyCP);
    const ratio = minCP > 0 ? maxCP / minCP : 10;
    const bigWin = Math.min(100, 50 + (ratio - 1) * 50);
    const roll = rnd() * 100;
    let win;
    if (pCP >= enemyCP) win = roll < bigWin;
    else win = roll >= bigWin;

    let dodged = false;
    if (!win && cs.dodge > 0 && rnd() * 100 < cs.dodge) { dodged = true; log.push('💨 ' + SKY.LANG.t('eng.dodge')); }

    return { win, playerCP: pCP, enemyCP, capeProc, crit, dodged, ratio, log };
  }

  // ---- Gathering yield hesabı ----
  // perkler + buffler + set yield
  function gatherStats(equipped, buffs) {
    let yieldp = 0, speed = 0, double = 0;
    const tool = equipped.alet, set = equipped.set;
    let toolSpeed = 10, toolTier = 1;
    if (tool && !tool.t0) { toolSpeed = tool.stats.speed || 10; toolTier = tool.tier; }
    if (set) { yieldp += set.stats.yieldp || 0; }
    // perkler
    for (const slot in equipped) {
      const it = equipped[slot]; if (!it) continue;
      for (const p of it.perks) {
        if (p.eff === 'yield' || p.eff === 'yieldp') yieldp += p.val;
        if (p.eff === 'gatherspeed') speed += p.val;
        if (p.eff === 'double') double += p.val;
      }
    }
    if (buffs) {
      yieldp += (buffs.yield || 0);
      speed += (buffs.gatherspeed || 0);
      double += (buffs.double || 0);
    }
    return { yieldp, speed, double, toolSpeed, toolTier };
  }

  // perk topla: belirli eff için tüm equipped'ten toplam %
  function sumPerk(equipped, eff) {
    let s = 0;
    for (const slot in equipped) {
      const it = equipped[slot]; if (!it) continue;
      for (const p of it.perks) if (p.eff === eff) s += p.val;
    }
    return s;
  }

  // ---- Mount Generation ----
  function makeMount(mountType, forceRed) {
    const mt = D.MOUNT_TYPES[mountType];
    if (!mt) return null;
    const hizStar = rint(1, 5);
    const agirlikStar = rint(1, 5);
    let ozelStar = 0;
    if (mt.ozel && mt.ozel !== 'invslot') ozelStar = rint(1, 5);
    else if (mt.ozel === 'invslot') ozelStar = 1; // fixed +1

    const starSum = hizStar + agirlikStar + (mt.ozel ? ozelStar : 0);
    const rarityIdx = D.mountRarity(starSum);

    var hizVal = mt.hiz[hizStar - 1];
    var agirlikVal = mt.agirlik[agirlikStar - 1];
    var ozelVal = mt.ozel === 'invslot' ? 'invslot' : (mt.ozel ? mt.ozel[ozelStar - 1] : 0);

    // Build perks from stats
    var stars = function(n) { var s = ''; for (var si = 0; si < 5; si++) s += si < n ? '★' : '☆'; return s; };
    var perks = [];
    perks.push({ id: 'mount_hiz', name: SKY.LANG.t('eng.speed_label'), icon: '⚡', mag: hizVal, quality: hizStar, cat: 'mount', desc: stars(hizStar) + ' +' + hizVal + '% ' + SKY.LANG.t('eng.map_speed') });
    perks.push({ id: 'mount_agirlik', name: SKY.LANG.t('eng.carry_label'), icon: '⚖️', mag: agirlikVal, quality: agirlikStar, cat: 'mount', desc: stars(agirlikStar) + ' +' + agirlikVal + ' kg' });
    if (mt.ozel === 'invslot') {
      perks.push({ id: 'mount_ozel', name: SKY.LANG.t('eng.inv_slot_label'), icon: '🎒', mag: 1, quality: ozelStar, cat: 'mount', desc: SKY.LANG.t('eng.inv_slot_desc') });
    } else if (mt.ozel && ozelVal > 0) {
      perks.push({ id: 'mount_ozel', name: mt.ozelLabel || '+CP', icon: '⚔️', mag: ozelVal, quality: ozelStar, cat: 'mount', desc: stars(ozelStar) + ' +' + ozelVal + ' CP' });
    }

    var mount = {
      id: uid(), kind: 'mount', mountType: mountType,
      name: mt.name,
      type: 'binek',
      hizStar: hizStar, agirlikStar: agirlikStar, ozelStar: ozelStar,
      hiz: hizVal,
      agirlik: agirlikVal,
      ozel: ozelVal,
      ozelLabel: mt.ozelLabel,
      starSum: starSum,
      rarity: rarityIdx,
      redStat: false,
      perks: perks,
      stats: { cp: 0 },
      enh: 0,
      icon: '🐎',
      tier: 1,
      t0: false,
    };

    // Red stat: ultra rare, only At and Kurt
    if (forceRed || (mountType !== 'fil' && rnd() * 100 < D.MOUNT_RED_CHANCE)) {
      mount.redStat = true;
      mount.redStatVal = 5; // +5% CP fixed
      mount.perks.push({ id: 'mount_red', name: SKY.LANG.t('eng.red_stat_name'), icon: '🔴', mag: 5, quality: 5, cat: 'mount', desc: SKY.LANG.t('eng.red_stat_desc') });
    }

    return mount;
  }

  function mountFromBox() {
    // Weighted: at 20, kurt 12, fil 5
    var roll = rnd() * 37;
    var type = roll < 20 ? 'at' : roll < 32 ? 'kurt' : 'fil';
    return makeMount(type, false);
  }

  // ---- War simulation helpers ----
  function simBotCP(tier) {
    const range = D.WAR.botCP[tier] || D.WAR.botCP.t1;
    return rint(range[0], range[1]);
  }

  return {
    rnd, rint, rfloat, pick, uid, rollCascade,
    makeMat, matKey, parseMatKey, makeEquip, makeT0, equipName,
    itemCP, itemAtkDef, computeCP, baseCP, capeStats, resolveCombat,
    gatherStats, sumPerk, rollPerks, quality, perkQuality,
    makeMount, mountFromBox, simBotCP,
  };
})();
