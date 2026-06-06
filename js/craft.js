/* ============================================================
   SKYZONE · CRAFT · ENHANCEMENT · UPGRADE · MARKET · BUFF
   ============================================================ */
window.SKY = window.SKY || {};

SKY.C = (function () {
  const D = SKY.D, E = SKY.E, S = SKY.S;

  // ---- Belirli aile+tier mat'ından envanter + banka toplam (tüm rarity) ----
  function famTierTotal(family, tier) {
    let t = 0;
    for (let r = 0; r < 5; r++) {
      const k = 'mat:' + family + ':' + tier + ':' + r;
      t += S.matCount(k); // envanter
      const b = S.inCity() ? S.bankHere() : null;
      if (b && b.mats && b.mats[k]) t += b.mats[k]; // banka
    }
    return t;
  }

  // craft yapılabilir mi? (seçilen tier için)
  function canCraft(recipeKey, tier) {
    const R = D.RECIPES[recipeKey];
    for (const [fam, amt] of R.mats) {
      if (famTierTotal(fam, tier) < amt) return false;
    }
    return true;
  }

  // envanter + bankadan mat tüket (önce envanter, yetmezse banka)
  function consumeMatFromAll(k, amount) {
    let need = amount;
    // önce envanterden
    const invHave = S.matCount(k);
    const invUse = Math.min(invHave, need);
    if (invUse > 0) { S.removeMat(k, invUse); need -= invUse; }
    // yetmezse bankadan
    if (need > 0 && S.inCity()) {
      const b = S.bankHere();
      if (b && b.mats && b.mats[k]) {
        const bankUse = Math.min(b.mats[k], need);
        b.mats[k] -= bankUse; if (b.mats[k] <= 0) delete b.mats[k];
        need -= bankUse;
      }
    }
    return amount - need; // tüketilen miktar
  }

  // envanter + bankadaki toplam mat
  function totalMatCount(k) {
    let t = S.matCount(k);
    if (S.inCity()) { const b = S.bankHere(); if (b && b.mats && b.mats[k]) t += b.mats[k]; }
    return t;
  }

  // mat tüket + output rarity hesapla (ağırlıklı ortalama rarity, aşağı yuvarla)
  function consumeAndRarity(recipeKey, tier) {
    const R = D.RECIPES[recipeKey];
    let weightedRarity = 0, totalUnits = 0;
    for (const [fam, amt] of R.mats) {
      let need = amt;
      for (let r = 0; r < 5 && need > 0; r++) {
        const k = 'mat:' + fam + ':' + tier + ':' + r;
        const used = consumeMatFromAll(k, need);
        if (used > 0) { weightedRarity += r * used; totalUnits += used; need -= used; }
      }
    }
    const avg = totalUnits ? weightedRarity / totalUnits : 0;
    return Math.floor(avg);
  }

  // craft success buff (şehir buff stub yok) - %100 başarı
  // slotRars: [rarityIdx per slot] — explicit rarity seçimi
  function craft(recipeKey, tier, slotRars) {
    const R = D.RECIPES[recipeKey];
    const P = S.get();
    let rarityIdx;
    if (slotRars && slotRars.length) {
      // explicit rarity: envanter + banka toplam kontrol
      for (let mi = 0; mi < R.mats.length; mi++) {
        const [fam, amt] = R.mats[mi];
        const ri = slotRars[mi] || 0;
        const k = 'mat:' + fam + ':' + tier + ':' + ri;
        if (totalMatCount(k) < amt) return { ok: false, msg: D.FAMILY_LABEL[fam] + ' (' + D.RARITY[ri].name + ') ' + SKY.LANG.t('craft.insufficient_family') };
      }
      // tüket (envanter + banka)
      for (let mi = 0; mi < R.mats.length; mi++) {
        const [fam, amt] = R.mats[mi];
        const ri = slotRars[mi] || 0;
        consumeMatFromAll('mat:' + fam + ':' + tier + ':' + ri, amt);
      }
      rarityIdx = Math.min(...slotRars.slice(0, R.mats.length));
    } else {
      if (!canCraft(recipeKey, tier)) return { ok: false, msg: SKY.LANG.t('craft.insufficient_mat') };
      rarityIdx = consumeAndRarity(recipeKey, tier);
    }
    P.stats.crafted++;

    if (R.consumable) {
      // yemek/iksir -> buff item
      const buffKeys = Object.keys(D.BUFFS);
      const buff = E.pick(buffKeys);
      const item = {
        id: E.uid(), kind: 'consumable', type: recipeKey === 'yemek' ? 'yemek' : 'iksir',
        buff, rarity: rarityIdx, tier,
        name: (recipeKey === 'yemek' ? '🍖 ' : '🧪 ') + D.BUFFS[buff].name + ' (' + D.RARITY[rarityIdx].k + ')',
      };
      P.consumables.push(item);
      return { ok: true, item, consumable: true };
    }

    const item = E.makeEquip({ type: recipeKey, tier, rarityIdx, crafted: true });
    // if binek, also generate mount stats
    if (recipeKey === 'binek') {
      const mountType = E.pick(['at', 'kurt', 'fil']);
      const mount = E.makeMount(mountType, false);
      if (mount) {
        item.mountData = mount;
        item.mountData.rarity = rarityIdx; // match equip rarity
      }
    }
    if (S.invFull()) { return { ok: false, msg: SKY.LANG.t('craft.inv_full'), refund: true }; }
    S.addEquip(item);
    return { ok: true, item };
  }

  // ---- Consumable kullan ----
  function useConsumable(id) {
    const P = S.get();
    const i = P.consumables.findIndex(c => c.id === id);
    if (i < 0) return { ok: false };
    const c = P.consumables[i];
    const def = D.BUFFS[c.buff];
    const isPot = c.type === 'iksir';
    const val = isPot ? def.pot[c.rarity] : def.food[c.rarity];
    const dur = isPot ? D.POT_DUR : D.FOOD_DUR;
    S.addBuff(c.buff, val, dur);
    P.consumables.splice(i, 1);
    return { ok: true, eff: c.buff, val, dur };
  }

  // ---- Enhancement ----
  function enhance(itemId, stonePct, charm) {
    const it = findEquipAnywhere(itemId);
    if (!it) return { ok: false, msg: SKY.LANG.t('craft.item_missing') };
    if (it.t0) return { ok: false, msg: SKY.LANG.t('craft.t0_no_enh') };
    if (it.enh >= D.MAX_ENH) return { ok: false, msg: SKY.LANG.t('craft.max_enh') };
    const P = S.get();
    var stoneKey = 'stone' + stonePct;
    if (!P.misc[stoneKey] || P.misc[stoneKey] < 1) return { ok: false, msg: '+%' + stonePct + ' ' + SKY.LANG.t('craft.no_stone') };
    P.misc[stoneKey]--;

    const stone = D.ENH_STONES.find(s => s.p === stonePct) || D.ENH_STONES[0];
    let odds;
    if (it.enh < 60) odds = { success: stone.base / 100, drop: 0, brk: 0 };
    else odds = D.enhOdds(it.enh);

    // R yemek/iksir enhancement başarı buff
    const buffs = S.activeBuffMap();

    const roll = E.rnd();
    if (roll < odds.success) {
      it.enh = Math.min(D.MAX_ENH, it.enh + stone.p);
      return { ok: true, result: 'success', enh: it.enh };
    }
    // fail
    let r2 = E.rnd();
    if (charm === 'break' && P.misc.charm_break > 0) {
      // kırılma engellenir -> sadece düşüş
      P.misc.charm_break--;
      it.enh = Math.max(0, it.enh - 3);
      return { ok: true, result: 'drop_protected', enh: it.enh };
    }
    if (charm === 'drop' && P.misc.charm_drop > 0) {
      P.misc.charm_drop--;
      return { ok: true, result: 'fail_protected', enh: it.enh };
    }
    if (r2 < odds.brk) {
      // kırıldı
      removeEquipAnywhere(itemId);
      return { ok: true, result: 'break' };
    } else if (r2 < odds.brk + odds.drop) {
      it.enh = Math.max(0, it.enh - 3);
      return { ok: true, result: 'drop', enh: it.enh };
    }
    return { ok: true, result: 'fail', enh: it.enh };
  }

  // ---- Rarity upgrade ----
  function rarityUpgrade(itemId, charm) {
    const it = findEquipAnywhere(itemId);
    if (!it) return { ok: false };
    if (it.t0) return { ok: false, msg: SKY.LANG.t('craft.t0_no_up') };
    if (it.rarity >= 4) return { ok: false, msg: SKY.LANG.t('craft.already_red') };
    const P = S.get();
    const ru = D.RARITY_UP.find(x => x.from === it.rarity);
    if (!ru) return { ok: false };
    const roll = E.rnd();
    if (roll < ru.success) {
      it.rarity = ru.to;
      it.name = E.equipName(it.type, it.tier, it.rarity);
      // perk sayısı yeni rarity'e çıkar AMA yeni perk eklenmez (upgrade yolu)
      return { ok: true, result: 'success', rarity: it.rarity };
    }
    // fail
    if (charm && P.misc.charm_color > 0) {
      P.misc.charm_color--;
      return { ok: true, result: 'fail_protected', rarity: it.rarity };
    }
    it.rarity = ru.failTo;
    it.name = E.equipName(it.type, it.tier, it.rarity);
    return { ok: true, result: 'fail', rarity: it.rarity };
  }

  // ---- helpers: item bul (envanter, banka, equipped) ----
  function findEquipAnywhere(id) {
    const P = S.get();
    let it = P.equipItems.find(x => x.id === id);
    if (it) return it;
    for (const s in P.equipped) if (P.equipped[s] && P.equipped[s].id === id) return P.equipped[s];
    const b = P.bank[P.city];
    it = b.equipItems.find(x => x.id === id);
    return it || null;
  }
  function removeEquipAnywhere(id) {
    const P = S.get();
    let i = P.equipItems.findIndex(x => x.id === id);
    if (i >= 0) { P.equipItems.splice(i, 1); return; }
    for (const s in P.equipped) if (P.equipped[s] && P.equipped[s].id === id) { delete P.equipped[s]; return; }
    const b = P.bank[P.city];
    i = b.equipItems.findIndex(x => x.id === id);
    if (i >= 0) b.equipItems.splice(i, 1);
  }

  // ---- Market (NPC fiyat simülasyonu) ----
  function matValue(family, tier, rarityIdx) {
    const base = 2;
    return Math.round(base * D.TIER_MULT[tier] * D.RARITY[rarityIdx].mult);
  }
  function equipValue(it) {
    if (it.t0) return 1;
    let v = 50 * D.TIER_MULT[it.tier] * D.RARITY[it.rarity].mult;
    v *= (1 + it.enh / 100);
    v *= (1 + it.perks.length * 0.1);
    return Math.round(v);
  }
  function effectiveTax() {
    const taxCut = E.sumPerk(S.get().equipped, 'taxcut');
    let tax = Math.max(0, D.MARKET_TAX - taxCut / 100);
    // Premium perk: -25% tax
    if (S.isPremium()) tax = Math.max(0, tax - D.SHOP.premiumPerks.taxCut / 100);
    return tax;
  }
  function sellMat(k, n) {
    if (S.matCount(k) < n) return { ok: false };
    const p = E.parseMatKey(k);
    const gross = matValue(p.family, p.tier, p.rarity) * n;
    const tax = effectiveTax();
    const net = Math.round(gross * (1 - tax));
    S.removeMat(k, n);
    S.get().gold += net;
    return { ok: true, net, tax: Math.round(tax * 100) };
  }
  function sellEquip(id) {
    const P = S.get();
    const i = P.equipItems.findIndex(x => x.id === id);
    if (i < 0) return { ok: false };
    const it = P.equipItems[i];
    const gross = equipValue(it);
    const tax = effectiveTax();
    const net = Math.round(gross * (1 - tax));
    P.equipItems.splice(i, 1);
    P.gold += net;
    return { ok: true, net };
  }
  // ---- Market Listing (yeni sistem) ----
  function listMat(k, n, price) {
    const P = S.get();
    if ((P.marketListings || []).length >= 3) return { ok: false, msg: SKY.LANG.t('craft.max_listings') };
    if (S.matCount(k) < n) return { ok: false, msg: SKY.LANG.t('craft.insufficient_mat_short') };
    if (price <= 0) return { ok: false, msg: SKY.LANG.t('craft.invalid_price') };
    const p = E.parseMatKey(k);
    S.removeMat(k, n);
    P.marketListings.push({
      id: 'lst_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
      type: 'mat', matKey: k, matCount: n, price: price,
      itemName: D.MAT_NAMES[p.family][p.tier - 1] + ' x' + n,
      listedAt: Date.now(),
    });
    return { ok: true };
  }
  function listEquip(id, price) {
    const P = S.get();
    if ((P.marketListings || []).length >= 3) return { ok: false, msg: SKY.LANG.t('craft.max_listings') };
    const i = P.equipItems.findIndex(x => x.id === id);
    if (i < 0) return { ok: false, msg: SKY.LANG.t('craft.item_not_found') };
    if (price <= 0) return { ok: false, msg: SKY.LANG.t('craft.invalid_price') };
    const it = P.equipItems.splice(i, 1)[0];
    P.marketListings.push({
      id: 'lst_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
      type: 'equip', item: it, price: price,
      itemName: it.name,
      listedAt: Date.now(),
    });
    return { ok: true };
  }
  function cancelListing(listingId) {
    const P = S.get();
    const i = P.marketListings.findIndex(x => x.id === listingId);
    if (i < 0) return { ok: false };
    const listing = P.marketListings.splice(i, 1)[0];
    if (listing.type === 'equip' && listing.item) {
      S.addEquip(listing.item);
    } else if (listing.type === 'mat' && listing.matKey) {
      const p = E.parseMatKey(listing.matKey);
      S.addMat(p.family, p.tier, p.rarity, listing.matCount || 1);
    }
    return { ok: true };
  }
  function sellConsumable(id) {
    const P = S.get();
    const i = P.consumables.findIndex(x => x.id === id);
    if (i < 0) return { ok: false };
    const c = P.consumables[i];
    const net = Math.round(20 * D.TIER_MULT[c.tier] * D.RARITY[c.rarity].mult * 0.9);
    P.consumables.splice(i, 1);
    P.gold += net;
    return { ok: true, net };
  }

  // ---- Banka upgrade ----
  function upgradeBank() {
    const P = S.get();
    if (S.bankBagCount() >= S.MAX_SLOTS) return { ok: false, msg: SKY.LANG.t('craft.max_bank') };
    if (P.gold < D.BANK_UP_COST) return { ok: false, msg: SKY.LANG.t('craft.insufficient_gold') };
    P.gold -= D.BANK_UP_COST;
    S.buyBankBag();
    return { ok: true };
  }

  // ============ SHOP (gem purchases) ============
  function buyPremium() {
    // USD purchase ($9.99) — in production this would go through a payment gateway
    // For demo: activate immediately
    S.activatePremium(D.SHOP.premiumDays);
    return { ok: true, price: D.SHOP.premiumPrice, currency: 'usd' };
  }
  function buyShopSlot(slotId) {
    const P = S.get();
    const s = D.SHOP.slots.find(x => x.id === slotId);
    if (!s) return { ok: false, msg: 'Invalid' };
    // USD purchase — in production this would go through a payment gateway
    // For demo: grant immediately
    if (s.type === 'inv') P.extraInvSlots = (P.extraInvSlots || 0) + s.amount;
    else if (s.type === 'bank') P.extraBankSlots = (P.extraBankSlots || 0) + s.amount;
    else if (s.type === 'market') P.extraMktSlots = (P.extraMktSlots || 0) + s.amount;
    return { ok: true, amount: s.amount, type: s.type, price: s.price, currency: 'usd' };
  }
  function buyStarterPack() {
    const P = S.get();
    if (P.starterPackBought) return { ok: false, msg: SKY.LANG.t('craft.already_bought') };
    // USD purchase ($19.99) — in production this would go through a payment gateway
    // For demo: grant immediately
    P.starterPackBought = true;
    P.gems += D.SHOP.starterPack.gems;
    P.extraInvSlots = (P.extraInvSlots || 0) + D.SHOP.starterPack.invSlots;
    S.activatePremium(D.SHOP.starterPack.premiumDays);
    return { ok: true, price: D.SHOP.starterPack.price, currency: 'usd' };
  }
  function addGems(n) { S.get().gems += n; }

  // ============ WAR SIMULATION ============
  // War state is managed globally in SKY.WAR_STATE
  // (initialized by game.js on boot)

  // ============ TRADE (NPC) ============
  function generateTradeNPC() {
    const trader = E.pick(D.TRADE.npcTraders);
    const offerItems = [];
    const wantItems = [];
    // NPC offers 2-4 items
    const count = E.rint(2, 4);
    for (let i = 0; i < count; i++) {
      const type = E.pick(D.EQUIP_SLOTS);
      const tier = E.pick([1, 1, 2, 2, 3]);
      const rarIdx = E.rollCascade([35, 30, 20, 10, 5]);
      offerItems.push(E.makeEquip({ type, tier, rarityIdx: rarIdx, crafted: false }));
    }
    // NPC wants: gold + possibly some mats
    const goldWant = E.rint(500, 5000);
    return { trader, offerItems, wantItems, goldWant };
  }

  return {
    famTierTotal, canCraft, craft, useConsumable, enhance, rarityUpgrade,
    findEquipAnywhere, matValue, equipValue, sellMat, sellEquip, sellConsumable, upgradeBank,
    buyPremium, buyShopSlot, buyStarterPack, addGems,
    generateTradeNPC, listMat, listEquip, cancelListing, effectiveTax,
  };
})();
