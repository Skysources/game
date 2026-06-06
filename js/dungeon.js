/* ============================================================
   SKYZONE · DUNGEON & COMBAT LOOP
   Auto-circle mob, boss spawn, loot.
   ============================================================ */
window.SKY = window.SKY || {};

SKY.DUN = (function () {
  const D = SKY.D, E = SKY.E, S = SKY.S;

  let active = null; // {floorIdx, tier, theme, mobTimer, fightProgress, boss}

  function floorCP(floorIdx, tier) {
    const f = D.FLOORS[floorIdx];
    return tier === 1 ? f.t1 : tier === 2 ? f.t2 : f.t3;
  }
  function combatDuration() {
    // 12 sn - perkler/buffler
    const perk = E.sumPerk(S.get().equipped, 'combattime');
    const buffs = S.activeBuffMap();
    const buffCut = buffs.combattime || 0;
    let d = 12 * (1 - (perk + buffCut) / 100);
    return Math.max(3, d);
  }

  function enter(floorIdx, tier) {
    const z = SKY.W.curZone();
    const theme = z ? z.biome : 'orman';
    active = {
      floorIdx, tier, theme,
      fightProgress: 0, fightDur: combatDuration(),
      mobCount: 0, bossQueue: [], bossTimer: rndBossTime(), fightingBoss: null,
      log: [],
    };
    return active;
  }
  function rndBossTime() { return (480 + E.rnd() * 420); } // 8-15 dk (sn)
  function leave() { active = null; }
  function isActive() { return active; }
  function getActive() { return active; }

  // her saniye çağrılır. dönen event: {type:'mobwin'|'moblose'|'boss'|...}
  function tick(dt) {
    if (!active) return null;
    const P = S.get();
    active.fightProgress += dt;
    let ev = null;
    if (active.fightProgress >= active.fightDur) {
      active.fightProgress = 0;
      active.fightDur = combatDuration();
      ev = resolveFight();
    }
    // boss spawn timer — bosses queue up (max 5)
    active.bossTimer -= dt;
    if (active.bossTimer <= 0 && active.bossQueue.length < 5) {
      active.bossQueue.push({ id: E.uid(), born: Date.now() });
      active.bossTimer = rndBossTime();
      ev = ev || { type: 'bossSpawn', queueLen: active.bossQueue.length };
    }
    return ev;
  }

  function startBossFight(bossId) {
    if (!active) return false;
    var idx = active.bossQueue.findIndex(function(b) { return b.id === bossId; });
    if (idx < 0) return false;
    active.fightingBoss = active.bossQueue.splice(idx, 1)[0];
    active.fightProgress = 0; // reset fight timer for boss
    return true;
  }
  function getBossQueue() { return active ? active.bossQueue : []; }
  function isFightingBoss() { return active && active.fightingBoss; }

  function resolveFight() {
    const P = S.get();
    const f = D.FLOORS[active.floorIdx];
    const isBoss = !!active.fightingBoss;
    const fcp = floorCP(active.floorIdx, active.tier);
    const enemyCP = isBoss ? Math.round(fcp * 1.5) : Math.round(fcp * 0.5);
    const ctx = { target: isBoss ? 'boss' : 'mob', theme: active.theme, buffs: S.activeBuffMap() };
    const res = E.resolveCombat(P.equipped, enemyCP, ctx);

    if (!res.win) {
      if (res.dodged) {
        return { type: 'dodge', res };
      }
      // ölüm (PvE safe = 1dk cd, loot yok güvenli)
      P.stats.deaths++;
      return { type: 'death', res };
    }

    // kazandı -> loot
    const loot = mobLoot(active.floorIdx, isBoss);
    P.stats.kills++;
    if (isBoss) { P.stats.bossKills++; active.fightingBoss = null; }
    S.gainExp(active.tier);
    return { type: isBoss ? 'bosswin' : 'mobwin', res, loot, enemyCP };
  }

  function mobLoot(floorIdx, isBoss) {
    const f = D.FLOORS[floorIdx];
    const P = S.get();
    const buffs = S.activeBuffMap();
    const loot = { gold: 0, items: [], stones: 0, charm: null };

    // gold
    let goldPerk = E.sumPerk(P.equipped, 'gold') + (buffs.gold || 0);
    let goldBase = isBoss ? f.bossGold : f.gold;
    loot.gold = Math.round(goldBase * (1 + goldPerk / 100));
    P.gold += loot.gold;

    // item drop (premium dropBonus dahil)
    let itemBonus = E.sumPerk(P.equipped, 'itemdrop') + (buffs.itemdrop || 0)
      + (isBoss ? E.sumPerk(P.equipped, 'bossloot') + (buffs.bossloot || 0) : 0);
    if (S.isPremium()) itemBonus += D.SHOP.premiumPerks.dropBonus;
    const itemChance = isBoss ? 100 : f.itemDrop * (1 + itemBonus / 100);
    const drops = isBoss ? 1 : (E.rnd() * 100 < itemChance ? 1 : 0);
    for (let i = 0; i < drops; i++) {
      const rIdx = E.rollCascade(f.cascade);
      const type = E.pick(D.EQUIP_SLOTS);
      const it = E.makeEquip({ type, tier: active.tier, rarityIdx: rIdx, crafted: false });
      if (!S.invFull()) { S.addEquip(it); loot.items.push(it); }
    }

    // crafting drop (enh taş)
    const craftBonus = E.sumPerk(P.equipped, 'craftdrop') + (buffs.craftdrop || 0);
    if (isBoss) {
      // Boss gives 3 random stones
      var bossStoneTypes = ['stone3','stone6','stone9','stone12','stone15'];
      var bossStoneWeights = [35,25,18,12,5];
      for (var bsi = 0; bsi < 3; bsi++) {
        var bsTotal = 0; for (var bsw = 0; bsw < bossStoneWeights.length; bsw++) bsTotal += bossStoneWeights[bsw];
        var bsRoll = E.rnd() * bsTotal; var bsAcc = 0;
        for (var bsw = 0; bsw < bossStoneWeights.length; bsw++) { bsAcc += bossStoneWeights[bsw]; if (bsRoll < bsAcc) { P.misc[bossStoneTypes[bsw]] = (P.misc[bossStoneTypes[bsw]]||0) + 1; break; } }
      }
      loot.stones = 3;
    } else {
      if (E.rnd() * 100 < f.enhStone * (1 + craftBonus / 100)) {
        var stTypes = ['stone3','stone6','stone9','stone12','stone15'];
        var stWeights = [35,25,18,12,5];
        var stTotal = 0; for (var sw = 0; sw < stWeights.length; sw++) stTotal += stWeights[sw];
        var stRoll = E.rnd() * stTotal; var stAcc = 0;
        for (var sw = 0; sw < stWeights.length; sw++) { stAcc += stWeights[sw]; if (stRoll < stAcc) { P.misc[stTypes[sw]] = (P.misc[stTypes[sw]]||0) + 1; break; } }
        loot.stones = 1;
      }
    }

    // tılsım (belge: boss K1:0.5%→K5:8%, mob çok düşük)
    const BOSS_CHARM = [0.5, 1, 2, 4, 8]; // K1-K5 boss tılsım %
    const charmChance = isBoss ? BOSS_CHARM[floorIdx] : f.charm;
    if (E.rnd() * 100 < charmChance) {
      var cr = E.rnd() * 100;
      var t = cr < 10 ? 'charm_break' : cr < 60 ? 'charm_drop' : 'charm_color';
      P.misc[t]++; loot.charm = t;
    }

    // sandık drop (%0.8 şans)
    if (!isBoss && E.rnd() * 100 < (f.chest || 0)) {
      // %70 yükseltme sandığı, %30 altın sandığı
      if (E.rnd() < 0.7) {
        P.misc.enhChest = (P.misc.enhChest || 0) + 1;
        loot.chestDrop = SKY.LANG.t('dg.chest_enh');
      } else {
        P.misc.goldChest = (P.misc.goldChest || 0) + 1;
        loot.chestDrop = SKY.LANG.t('dg.chest_gold');
      }
    }

    // mount box drop: mob %1, boss GUARANTEED
    if (isBoss) {
      P.misc.mountBox = (P.misc.mountBox || 0) + 1;
      loot.mountBox = true;
    } else if (E.rnd() * 100 < D.MOUNT_BOX_DROP.mob) {
      P.misc.mountBox = (P.misc.mountBox || 0) + 1;
      loot.mountBox = true;
    }
    return loot;
  }

  return { enter, leave, isActive, getActive, tick, floorCP, combatDuration, startBossFight, getBossQueue, isFightingBoss };
})();
