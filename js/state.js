/* ============================================================
   SKYZONE · STATE
   Oyuncu durumu, kaydet/yükle, envanter & banka & ağırlık.
   ============================================================ */
window.SKY = window.SKY || {};

SKY.S = (function () {
  const D = SKY.D, E = SKY.E;
  const SAVE_KEY = 'skyzone_save_v1';

  let P = null; // player state

  const INV_SLOT_CAP = 24;  // her envanter yuvası 24 slot
  const BANK_SLOT_CAP = 60; // her banka yuvası 60 slot
  const MAX_SLOTS = 4;      // max 4 yuva (envanter ve banka)

  function fresh(name, city) {
    const p = {
      name, city,
      gold: D.START_GOLD,
      invSlots: INV_SLOT_CAP,
      // envanter: aktif yuva = equipItems/mats/misc/consumables
      // ek yuvalar invBags array'inde (swap ile değiştirilir)
      equipItems: [],
      mats: {},
      misc: { stone3: 0, stone6: 0, stone9: 0, stone12: 0, stone15: 0, charm_break: 0, charm_drop: 0, charm_color: 0, enhChest: 0, goldChest: 0, mountBox: 0 },
      consumables: [],
      invBagCount: 1,           // açık envanter yuvası sayısı (1-4, her biri 24 slot)
      // banka per-city
      bank: { kar: blankStore(), orman: blankStore(), col: blankStore() },
      bankBagCount: { kar: 1, orman: 1, col: 1 },  // her şehirde açık banka yuvası (1-4, her biri 60 slot)
      equipped: {},
      itemExp: { silah: 0, kask: 0, zirh: 0, eldiven: 0, bot: 0, pelerin: 0, binek: 0, alet: 0, set: 0 },
      activeBuffs: [],         // [{eff, val, end}]
      zone: 'city_' + city,
      deathCD: { safe: 0, blue: 0, red: 0 },
      stats: { kills: 0, gathered: 0, crafted: 0, deaths: 0, bossKills: 0 },
      tutorialDone: false,
      lastTravel: 0,
      created: Date.now(),
      // new systems
      gems: 50, // starter gems
      premium: null, // {until: timestamp} or null
      mount: null, // equipped mount object
      marketListings: [], // [{id, item, itemName, price, listedAt, type:'mat'|'equip'}]
      mailbox: [], // [{id, type:'sale'|'system', msg, gold, timestamp, read}]
      extraInvSlots: 0, // from gems/premium
      extraBankSlots: 0,
      extraMktSlots: 0,
      starterPackBought: false,
    };
    // T0 starter set
    const t0 = ['silah', 'kask', 'zirh', 'bot'];
    for (const t of t0) p.equipped[t] = E.makeT0(t);
    // T1 W toplama aletleri
    p.equipped.alet = E.makeEquip({ type: 'alet', tier: 1, rarityIdx: 0 });
    P = p;
    return p;
  }

  function blankStore() {
    return { equipItems: [], mats: {}, misc: { stone3: 0, stone6: 0, stone9: 0, stone12: 0, stone15: 0, charm_break: 0, charm_drop: 0, charm_color: 0, enhChest: 0, goldChest: 0, mountBox: 0 }, consumables: [] };
  }

  // ---- Envanter işlemleri ----
  function addMat(family, tier, rarityIdx, n) {
    const k = E.matKey(family, tier, rarityIdx);
    P.mats[k] = Math.min(99, (P.mats[k] || 0) + n);
  }
  function removeMat(k, n) {
    if ((P.mats[k] || 0) < n) return false;
    P.mats[k] -= n;
    if (P.mats[k] <= 0) delete P.mats[k];
    return true;
  }
  function matCount(k) { return P.mats[k] || 0; }

  function addEquip(item) { P.equipItems.push(item); }
  function removeEquip(id) {
    const i = P.equipItems.findIndex(x => x.id === id);
    if (i >= 0) return P.equipItems.splice(i, 1)[0];
    return null;
  }
  function getEquipItem(id) { return P.equipItems.find(x => x.id === id); }

  // envanter slot sayısı (perkler + premium + extra dahil)
  function invCap() {
    var base = (P.invBagCount || 1) * INV_SLOT_CAP;
    // Premium +1 slot (24 items)
    if (isPremium()) base += INV_SLOT_CAP;
    // Extra slots from gems/shop
    base += (P.extraInvSlots || 0);
    // Mount invslot perk
    var m = P.equipped && P.equipped.binek;
    if (m && m.ozel === 'invslot') base += INV_SLOT_CAP;
    return base;
  }
  function invUsed() {
    // her equip item 1 slot, her mat stack 1 slot, misc türleri, consumable
    let s = P.equipItems.length;
    s += Object.keys(P.mats).length;
    s += P.consumables.length;
    for (const m in P.misc) if (P.misc[m] > 0) s++;
    return s;
  }
  function invFull() { return invUsed() >= invCap(); }

  // ---- Ağırlık ----
  function carryCap() {
    let cap = D.BASE_CARRY;
    const m = P.equipped.binek, c = P.equipped.canta;
    if (m && !m.t0 && D.CARRY_BONUS.binek[m.tier]) cap += D.CARRY_BONUS.binek[m.tier][m.rarity];
    if (c && D.CARRY_BONUS.canta[c.tier]) cap += D.CARRY_BONUS.canta[c.tier][c.rarity];
    cap += Math.round(cap * E.sumPerk(P.equipped, 'weight') / 100);
    return cap;
  }
  function carryUsed() {
    let w = 0;
    for (const k in P.mats) w += P.mats[k] * D.WEIGHT.mat;
    w += P.equipItems.length * D.WEIGHT.equip;
    w += P.consumables.length * D.WEIGHT.consumable;
    w += ((P.misc.stone3||0)+(P.misc.stone6||0)+(P.misc.stone9||0)+(P.misc.stone12||0)+(P.misc.stone15||0)) * D.WEIGHT.enhStone;
    w += ((P.misc.charm_break || 0) + (P.misc.charm_drop || 0) + (P.misc.charm_color || 0)) * D.WEIGHT.charm;
    w += (P.gold / 1000) * D.WEIGHT.goldPer1000;
    return Math.round(w * 10) / 10;
  }
  function carryPct() { return Math.min(100, Math.round(carryUsed() / carryCap() * 100)); }

  // ---- Equip / unequip ----
  function equip(id) {
    const it = getEquipItem(id);
    if (!it) return { ok: false, msg: SKY.LANG.t('state.item_not_found') };
    // tier gate
    if (it.tier >= 2) {
      const need = D.EXP_THRESHOLD[it.tier];
      if ((P.itemExp[it.type] || 0) < need)
        return { ok: false, msg: SKY.LANG.t('state.insufficient_exp') + ' ' + D.RECIPES[it.type].name + ' EXP (' + SKY.LANG.t('state.exp_required') + ' ' + need + ')' };
    }
    removeEquip(id);
    const old = P.equipped[it.type];
    P.equipped[it.type] = it;
    if (old && !old.t0) addEquip(old);
    return { ok: true };
  }
  function unequip(type) {
    const old = P.equipped[type];
    if (!old || old.t0) return { ok: false };
    if (invFull()) return { ok: false, msg: t('ui.inv_full') };
    delete P.equipped[type];
    addEquip(old);
    return { ok: true };
  }

  // ---- Banka transfer ----
  function bankHere() { return P.bank[P.city]; }
  function bankCap() {
    var base = (P.bankBagCount[P.city] || 1) * BANK_SLOT_CAP;
    if (isPremium()) base += BANK_SLOT_CAP; // Premium +1 banka yuvası
    base += (P.extraBankSlots || 0); // gem shop extra slots
    return base;
  }
  function invBagCount() { return P.invBagCount || 1; }
  function bankBagCount() { return P.bankBagCount[P.city] || 1; }
  function buyInvBag() { if ((P.invBagCount || 1) >= MAX_SLOTS) return false; P.invBagCount = (P.invBagCount || 1) + 1; P.invSlots = P.invBagCount * INV_SLOT_CAP; return true; }
  function buyBankBag() { if ((P.bankBagCount[P.city] || 1) >= MAX_SLOTS) return false; P.bankBagCount[P.city] = (P.bankBagCount[P.city] || 1) + 1; return true; }
  function inCity() { return P.zone.startsWith('city_'); }

  function depositMat(k, n) {
    const b = bankHere();
    if (matCount(k) < n) return false;
    removeMat(k, n);
    b.mats[k] = (b.mats[k] || 0) + n;
    return true;
  }
  function withdrawMat(k, n) {
    const b = bankHere();
    if ((b.mats[k] || 0) < n) return false;
    if (invFull() && !P.mats[k]) return false; // yeni slot açılacaksa ve doluysa engelle
    b.mats[k] -= n; if (b.mats[k] <= 0) delete b.mats[k];
    P.mats[k] = (P.mats[k] || 0) + n;
    return true;
  }

  function depositEquip(id) {
    const it = removeEquip(id); if (!it) return false;
    bankHere().equipItems.push(it); return true;
  }
  function withdrawEquip(id) {
    const b = bankHere();
    const i = b.equipItems.findIndex(x => x.id === id);
    if (i < 0 || invFull()) return false;
    addEquip(b.equipItems.splice(i, 1)[0]); return true;
  }

  // ---- Item EXP ----
  function gainExp(tier) {
    const type = P.equipped.silah ? null : null; // exp giyili itemlere gider
    const g = D.EXP_GAIN[tier] || 1;
    const bilge = E.sumPerk(P.equipped, 'exp');
    let mult = 1 + bilge / 100;
    // Premium XP bonus
    if (isPremium()) mult += D.SHOP.premiumPerks.xpBonus / 100;
    const amt = Math.round(g * mult);
    for (const t in P.itemExp) {
      if (P.equipped[t] && !P.equipped[t].t0) P.itemExp[t] += amt;
    }
  }

  // ---- Aktif buff yönetimi ----
  function addBuff(eff, val, dur) {
    const end = Date.now() + dur * 1000;
    const ex = P.activeBuffs.find(b => b.eff === eff);
    // additive: aynı eff farklı kaynaklar toplanır — burada yeni instance ekle
    P.activeBuffs.push({ eff, val, end });
  }
  function activeBuffMap() {
    const now = Date.now();
    P.activeBuffs = P.activeBuffs.filter(b => b.end > now);
    const m = {};
    for (const b of P.activeBuffs) m[b.eff] = (m[b.eff] || 0) + b.val;
    return m;
  }

  // ---- Save / Load ----
  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(P)); return true; }
    catch (e) { console.warn('save fail', e); return false; }
  }
  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      P = JSON.parse(raw);
      // backfill
      if (!P.activeBuffs) P.activeBuffs = [];
      if (!P.stats) P.stats = { kills: 0, gathered: 0, crafted: 0, deaths: 0, bossKills: 0 };
      if (!P.invBagCount) P.invBagCount = 1;
      if (!P.bankBagCount) P.bankBagCount = { kar: 1, orman: 1, col: 1 };
      if (!P.bank) P.bank = { kar: blankStore(), orman: blankStore(), col: blankStore() };
      P.invSlots = (P.invBagCount || 1) * INV_SLOT_CAP;
      // new system backfills
      if (typeof P.gems !== 'number') P.gems = 50;
      if (!P.premium) P.premium = null;
      if (!P.mount) P.mount = null;
      if (!Array.isArray(P.marketListings)) P.marketListings = [];
      if (!Array.isArray(P.mailbox)) P.mailbox = [];
      if (typeof P.extraInvSlots !== 'number') P.extraInvSlots = 0;
      if (typeof P.extraBankSlots !== 'number') P.extraBankSlots = 0;
      if (typeof P.extraMktSlots !== 'number') P.extraMktSlots = 0;
      if (typeof P.starterPackBought !== 'boolean') P.starterPackBought = false;
      return true;
    } catch (e) { return false; }
  }
  function reset() { localStorage.removeItem(SAVE_KEY); P = null; }
  function get() { return P; }
  function set(p) {
    if (!p) { P = null; return; }
    // Sanitize: Firebase drops empty arrays (returns null) and may miss fields
    // Merge with defaults to ensure all required fields exist
    p.equipItems = p.equipItems || [];
    p.mats = p.mats || {};
    p.misc = Object.assign({ stone3: 0, stone6: 0, stone9: 0, stone12: 0, stone15: 0, charm_break: 0, charm_drop: 0, charm_color: 0, enhChest: 0, goldChest: 0, mountBox: 0 }, p.misc || {});
    p.consumables = p.consumables || [];
    p.activeBuffs = p.activeBuffs || [];
    p.equipped = p.equipped || {};
    p.itemExp = Object.assign({ silah: 0, kask: 0, zirh: 0, eldiven: 0, bot: 0, pelerin: 0, binek: 0, alet: 0, set: 0 }, p.itemExp || {});
    p.stats = Object.assign({ kills: 0, gathered: 0, crafted: 0, deaths: 0, bossKills: 0 }, p.stats || {});
    // Sanitize ALL items (equipped, inventory, bank) — Firebase drops empty arrays
    function fixItem(it) {
      if (!it || typeof it !== 'object') return it;
      it.perks = it.perks || [];
      it.stats = it.stats || {};
      return it;
    }
    // Fix equipped items
    var eqSlots = Object.keys(p.equipped);
    for (var ei = 0; ei < eqSlots.length; ei++) {
      if (p.equipped[eqSlots[ei]]) fixItem(p.equipped[eqSlots[ei]]);
    }
    // Fix inventory items
    for (var ii = 0; ii < p.equipItems.length; ii++) {
      fixItem(p.equipItems[ii]);
    }
    p.bank = p.bank || { kar: blankStore(), orman: blankStore(), col: blankStore() };
    // sanitize each bank city
    var cities = ['kar', 'orman', 'col'];
    for (var ci = 0; ci < cities.length; ci++) {
      var c = cities[ci];
      if (!p.bank[c]) p.bank[c] = blankStore();
      p.bank[c].equipItems = p.bank[c].equipItems || [];
      p.bank[c].mats = p.bank[c].mats || {};
      p.bank[c].misc = Object.assign({ stone3: 0, stone6: 0, stone9: 0, stone12: 0, stone15: 0, charm_break: 0, charm_drop: 0, charm_color: 0, enhChest: 0, goldChest: 0, mountBox: 0 }, p.bank[c].misc || {});
      p.bank[c].consumables = p.bank[c].consumables || [];
      // Fix bank items too
      for (var bi = 0; bi < p.bank[c].equipItems.length; bi++) {
        fixItem(p.bank[c].equipItems[bi]);
      }
    }
    p.bankBagCount = p.bankBagCount || { kar: 1, orman: 1, col: 1 };
    p.invBagCount = p.invBagCount || 1;
    p.gold = p.gold || 0;
    p.gems = p.gems || 0;
    p.zone = p.zone || ('city_' + (p.city || 'kar'));
    p.deathCD = p.deathCD || { safe: 0, blue: 0, red: 0 };
    p.marketListings = p.marketListings || [];
    p.mailbox = p.mailbox || [];
    p.extraInvSlots = p.extraInvSlots || 0;
    p.extraBankSlots = p.extraBankSlots || 0;
    p.extraMktSlots = p.extraMktSlots || 0;
    P = p;
  }

  // ---- Premium check ----
  function isPremium() {
    return P && P.premium && P.premium.until > Date.now();
  }
  function premiumTimeLeft() {
    if (!isPremium()) return 0;
    return Math.max(0, P.premium.until - Date.now());
  }
  function activatePremium(days) {
    const now = Date.now();
    const base = (P.premium && P.premium.until > now) ? P.premium.until : now;
    P.premium = { until: base + days * 86400000 };
  }

  // ---- Mount helpers ----
  function setMount(mount) { P.mount = mount; }
  function getMount() { return P ? P.mount : null; }
  function openMountBox(itemId) {
    if (!P) return null;
    const i = P.equipItems.findIndex(x => x.id === itemId && x.kind === 'mountbox');
    if (i < 0) return null;
    P.equipItems.splice(i, 1);
    const mount = E.mountFromBox();
    P.mount = mount;
    return mount;
  }

  return {
    fresh, get, set, save, load, reset,
    addMat, removeMat, matCount, addEquip, removeEquip, getEquipItem,
    invCap, invUsed, invFull, carryCap, carryUsed, carryPct,
    equip, unequip, bankHere, bankCap, inCity, invBagCount, bankBagCount, buyInvBag, buyBankBag,
    INV_SLOT_CAP, BANK_SLOT_CAP, MAX_SLOTS,
    depositMat, withdrawMat, depositEquip, withdrawEquip,
    gainExp, addBuff, activeBuffMap,
    isPremium, premiumTimeLeft, activatePremium,
    setMount, getMount, openMountBox,
  };
})();
