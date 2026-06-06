/* ============================================================
   SKYZONE · GAME DATA
   Tüm sabitler, formüller ve tablolar tasarım belgesi v6'dan.
   ============================================================ */
window.SKY = window.SKY || {};

SKY.D = (function () {
  // ---- Aileler & malzemeler ----
  const FAMILIES = ['cevher', 'deri', 'odun', 'tas', 'bitki', 'balik'];

  const _MAT_KEYS = {
    cevher: ['mat.cevher_1', 'mat.cevher_2', 'mat.cevher_3'],
    deri: ['mat.deri_1', 'mat.deri_2', 'mat.deri_3'],
    odun: ['mat.odun_1', 'mat.odun_2', 'mat.odun_3'],
    tas: ['mat.tas_1', 'mat.tas_2', 'mat.tas_3'],
    bitki: ['mat.bitki_1', 'mat.bitki_2', 'mat.bitki_3'],
    balik: ['mat.balik_1', 'mat.balik_2', 'mat.balik_3'],
  };
  const MAT_NAMES = new Proxy({}, {
    get(_, fam) { var keys = _MAT_KEYS[fam]; return keys ? keys.map(function(k) { return SKY.LANG.t(k); }) : undefined; }
  });

  const FAMILY_LABEL = new Proxy({}, {
    get(_, fam) { return SKY.LANG.t('fam.' + fam); }
  });

  // ---- Rarity (Beyaz/Yeşil/Mavi/Turuncu/Kırmızı) ----
  // index 0..4
  const _RARITY_DATA = [
    { k: 'W', nameKey: 'rar.W', color: '#d7d0c0', mult: 1.0, perks: 2 },
    { k: 'G', nameKey: 'rar.G', color: '#5fb45e', mult: 1.3, perks: 3 },
    { k: 'B', nameKey: 'rar.B', color: '#5b96d8', mult: 1.7, perks: 4 },
    { k: 'O', nameKey: 'rar.O', color: '#e2913c', mult: 2.2, perks: 5 },
    { k: 'R', nameKey: 'rar.R', color: '#d95a49', mult: 3.0, perks: 6 },
  ];
  const RARITY = _RARITY_DATA.map(function(r) {
    return Object.defineProperty(Object.assign({}, r), 'name', { get: function() { return SKY.LANG.t(r.nameKey); }, enumerable: true });
  });
  const TIER_MULT = { 1: 1, 2: 2, 3: 4 };

  // ---- Biome kaynak dağılımı (% of saatlik drop) ----
  // city: kar / orman / col
  const BIOME_DIST = {
    orman: { cevher: 10, deri: 15, odun: 30, tas: 10, bitki: 25, balik: 10 },
    kar: { cevher: 30, deri: 15, odun: 10, tas: 15, bitki: 5, balik: 25 },
    col: { cevher: 20, deri: 25, odun: 5, tas: 30, bitki: 15, balik: 5 },
  };

  const _CITY_DATA = {
    kar: { nameKey: 'city.kar', icon: '❄️', color: '#7ac0d8', themeKey: 'city.kar_theme' },
    orman: { nameKey: 'city.orman', icon: '🌲', color: '#5aaa3a', themeKey: 'city.orman_theme' },
    col: { nameKey: 'city.col', icon: '🏜️', color: '#d8a040', themeKey: 'city.col_theme' },
  };
  const CITIES = {};
  for (var _ck in _CITY_DATA) {
    (function(key, cd) {
      var obj = { icon: cd.icon, color: cd.color };
      Object.defineProperty(obj, 'name', { get: function() { return SKY.LANG.t(cd.nameKey); }, enumerable: true });
      Object.defineProperty(obj, 'theme', { get: function() { return SKY.LANG.t(cd.themeKey); }, enumerable: true });
      CITIES[key] = obj;
    })(_ck, _CITY_DATA[_ck]);
  }

  // ---- Node renk cascade (node rengi -> item renk %) ----
  // [W,G,B,O,R]
  const NODE_CASCADE = {
    W: [88, 10, 2, 0, 0],
    G: [60, 30, 7, 2, 1],
    B: [40, 30, 18, 8, 4],
    O: [27, 28, 25, 12, 8],
    R: [21, 22, 25, 20, 12],
  };

  // Map -> node tier matrisi [T1,T2,T3] %
  const MAP_NODE_TIER = {
    1: [90, 10, 0],
    2: [30, 60, 10],
    3: [0, 50, 50],
  };

  // Node boyutları
  const _NODE_SIZE_DATA = [
    { nameKey: 'node.small', prob: 0.50, items: 33, life: 600 },
    { nameKey: 'node.medium', prob: 0.35, items: 66, life: 1200 },
    { nameKey: 'node.large', prob: 0.15, items: 99, life: 1800 },
  ];
  const NODE_SIZES = _NODE_SIZE_DATA.map(function(n) {
    return Object.defineProperty(Object.assign({}, n), 'name', { get: function() { return SKY.LANG.t(n.nameKey); }, enumerable: true });
  });

  // ---- Craft reçeteleri (ana 50 / ikincil 30 / üçüncül 20) ----
  const _RECIPE_DATA = {
    kask: { icon: '🪖', nameKey: 'recipe.kask', total: 100, mats: [['cevher', 50], ['tas', 30], ['deri', 20]] },
    zirh: { icon: '🥋', nameKey: 'recipe.zirh', total: 100, mats: [['tas', 50], ['cevher', 30], ['deri', 20]] },
    eldiven: { icon: '🧤', nameKey: 'recipe.eldiven', total: 100, mats: [['deri', 50], ['bitki', 30], ['cevher', 20]] },
    bot: { icon: '👢', nameKey: 'recipe.bot', total: 100, mats: [['deri', 50], ['odun', 30], ['tas', 20]] },
    pelerin: { icon: '🦋', nameKey: 'recipe.pelerin', total: 100, mats: [['bitki', 50], ['deri', 30], ['odun', 20]] },
    binek: { icon: '🐎', nameKey: 'recipe.binek', total: 100, mats: [['odun', 50], ['cevher', 30], ['bitki', 20]] },
    silah: { icon: '⚔️', nameKey: 'recipe.silah', total: 100, mats: [['cevher', 50], ['odun', 30], ['tas', 20]] },
    alet: { icon: '⛏️', nameKey: 'recipe.alet', total: 100, mats: [['odun', 50], ['tas', 30], ['bitki', 20]] },
    set: { icon: '🦺', nameKey: 'recipe.set', total: 100, mats: [['tas', 50], ['bitki', 30], ['cevher', 20]] },
    canta: { icon: '🎒', nameKey: 'recipe.canta', total: 100, mats: [['bitki', 50], ['deri', 30], ['odun', 20]] },
    yemek: { icon: '🍖', nameKey: 'recipe.yemek', total: 10, mats: [['balik', 5], ['bitki', 3], ['odun', 2]], consumable: true },
    iksir: { icon: '🧪', nameKey: 'recipe.iksir', total: 10, mats: [['bitki', 5], ['balik', 3], ['tas', 2]], consumable: true },
  };
  const RECIPES = {};
  for (var _rk in _RECIPE_DATA) {
    (function(key, rd) {
      RECIPES[key] = Object.defineProperty(Object.assign({}, rd), 'name', { get: function() { return SKY.LANG.t(rd.nameKey); }, enumerable: true });
    })(_rk, _RECIPE_DATA[_rk]);
  }

  // Ekipman slotları (giyilebilir)
  const EQUIP_SLOTS = ['silah', 'kask', 'zirh', 'eldiven', 'bot', 'pelerin', 'binek', 'canta', 'alet', 'set'];

  // ---- Item base stats (T1 W expected) ----
  // stat: {cp, weight, speed(item/min), yield(%)}
  const BASE_STATS = {
    kask: { cp: 12 },
    zirh: { cp: 20 },
    eldiven: { cp: 10 },
    bot: { cp: 8 },
    pelerin: { cp: 5 },
    silah: { cp: 15 },
    binek: { cp: 10 },
    canta: { weight: 40 },
    alet: { speed: 10 },
    set: { yieldp: 5 },
  };

  // Mount & çanta ağırlık eklemeleri [tier][rarityIndex]
  const CARRY_BONUS = {
    binek: { 1: [60, 78, 102, 132, 150], 2: [120, 156, 204, 264, 300], 3: [240, 312, 408, 528, 600] },
    canta: { 1: [40, 52, 68, 88, 100], 2: [80, 104, 136, 176, 200], 3: [160, 208, 272, 352, 400] },
  };

  // ---- T0 starter set ----
  // T0 toplam CP = 50 (kask:10 + zırh:18 + silah:13 + bot:9 = 50)
  const T0_SET = {
    kask: { cp: 10 }, zirh: { cp: 18 }, silah: { cp: 13 }, bot: { cp: 9 },
  };

  // ---- Perk havuzları ----
  // cat: direct|cond|drop|mob|slot|exp|capeproc|capemult|crit|dodge
  function _perkWithName(p) {
    var obj = Object.assign({}, p);
    Object.defineProperty(obj, 'name', { get: function() { return SKY.LANG.t('perk.' + p.id); }, enumerable: true });
    return obj;
  }
  const GENERAL_PERKS = [
    { id: 'maden_sezgi', icon: '🌿', cat: 'drop', eff: 'yield' },
    { id: 'cevik_el', icon: '⚡', cat: 'drop', eff: 'gatherspeed' },
    { id: 'sansli_el', icon: '🍀', cat: 'drop', eff: 'double' },
    { id: 'yagmaci', icon: '🎁', cat: 'drop', eff: 'itemdrop' },
    { id: 'tuccar', icon: '💰', cat: 'drop', eff: 'gold' },
    { id: 'kasif', icon: '⚒️', cat: 'drop', eff: 'craftdrop' },
    { id: 'boss_avci', icon: '🎯', cat: 'drop', eff: 'bossloot' },
    { id: 'bilge', icon: '🧠', cat: 'exp', eff: 'exp' },
  ].map(_perkWithName);

  const _SPECIFIC_PERKS_RAW = {
    silah: [
      { id: 'keskinlik', icon: '🗡️', cat: 'direct', eff: 'cp' },
      { id: 'cellat', icon: '⚔️', cat: 'cond', eff: 'vsmob' },
      { id: 'duellocu', icon: '🛡️', cat: 'cond', eff: 'vspvp' },
      { id: 'avci', icon: '👑', cat: 'cond', eff: 'vsboss' },
      { id: 'orman_usta', icon: '🌲', cat: 'cond', eff: 'theme_orman' },
      { id: 'kar_usta', icon: '❄️', cat: 'cond', eff: 'theme_kar' },
      { id: 'col_usta', icon: '🏜️', cat: 'cond', eff: 'theme_col' },
      { id: 'savas_yorgun', icon: '⏱️', cat: 'mobility', eff: 'combattime' },
    ],
    kask: [
      { id: 'kalin_kafa', icon: '🛡️', cat: 'direct', eff: 'cp' },
      { id: 'mob_sav', icon: '🐺', cat: 'cond', eff: 'vsmob' },
      { id: 'pvp_sav', icon: '⚔️', cat: 'cond', eff: 'vspvp' },
      { id: 'boss_sav', icon: '👑', cat: 'cond', eff: 'vsboss' },
      { id: 'tema_usta', icon: '🌲', cat: 'cond', eff: 'theme_all' },
    ],
    pelerin: [
      { id: 'sansli_pelerin', icon: '🦋', cat: 'capeproc', eff: 'capeproc' },
      { id: 'devlet_pelerin', icon: '🌟', cat: 'capemult', eff: 'capemult' },
      { id: 'cevik_vurus', icon: '⚡', cat: 'crit', eff: 'crit' },
      { id: 'cevik_kacis', icon: '💨', cat: 'dodge', eff: 'dodge' },
      { id: 'pvp_ustad', icon: '🎭', cat: 'cond', eff: 'vspvp' },
      { id: 'savas_tanri', icon: '🌪️', cat: 'cond', eff: 'vswar' },
      { id: 'tema_usta', icon: '🌲', cat: 'cond', eff: 'theme_all' },
    ],
    zirh: [
      { id: 'sert_zirh', icon: '🛡️', cat: 'direct', eff: 'cp' },
      { id: 'dayaniklilik', icon: '💪', cat: 'direct', eff: 'cp' },
      { id: 'mob_sav', icon: '🐺', cat: 'cond', eff: 'vsmob' },
      { id: 'pvp_sav', icon: '⚔️', cat: 'cond', eff: 'vspvp' },
      { id: 'boss_sav', icon: '👑', cat: 'cond', eff: 'vsboss' },
      { id: 'tema_usta', icon: '🌲', cat: 'cond', eff: 'theme_all' },
    ],
    eldiven: [
      { id: 'siki_kavrama', icon: '🥊', cat: 'direct', eff: 'cp' },
      { id: 'kalin_eldiven', icon: '🛡️', cat: 'direct', eff: 'cp' },
      { id: 'hassas_denge', icon: '⚖️', cat: 'direct', eff: 'cp' },
      { id: 'mob_hass', icon: '🐺', cat: 'cond', eff: 'vsmob' },
      { id: 'duellocu_e', icon: '⚔️', cat: 'cond', eff: 'vspvp' },
      { id: 'avci_e', icon: '👑', cat: 'cond', eff: 'vsboss' },
      { id: 'tema_usta', icon: '🌲', cat: 'cond', eff: 'theme_all' },
    ],
    bot: [
      { id: 'saglam_bot', icon: '🦶', cat: 'direct', eff: 'cp' },
      { id: 'hizli_adim', icon: '🏃', cat: 'mobility', eff: 'travel' },
      { id: 'cevik_ayak', icon: '⏱️', cat: 'mobility', eff: 'combattime' },
      { id: 'mob_sav', icon: '🐺', cat: 'cond', eff: 'vsmob' },
      { id: 'duellocu_b', icon: '⚔️', cat: 'cond', eff: 'vspvp' },
      { id: 'avci_b', icon: '👑', cat: 'cond', eff: 'vsboss' },
      { id: 'tema_usta', icon: '🌲', cat: 'cond', eff: 'theme_all' },
    ],
    binek: [
      { id: 'guclu_bacak', icon: '🐎', cat: 'direct', eff: 'cp' },
      { id: 'kalin_deri_m', icon: '🛡️', cat: 'direct', eff: 'cp' },
      { id: 'yuk_kap', icon: '⚖️', cat: 'slot', eff: 'weight' },
      { id: 'eyer_bolme', icon: '📦', cat: 'slot', eff: 'invslot' },
      { id: 'hizli_kosu', icon: '💨', cat: 'mobility', eff: 'travel' },
      { id: 'mob_tepki', icon: '🐺', cat: 'cond', eff: 'vsmob' },
      { id: 'duello_binek', icon: '⚔️', cat: 'cond', eff: 'vspvp' },
      { id: 'avci_binek', icon: '👑', cat: 'cond', eff: 'vsboss' },
      { id: 'tema_binek', icon: '🌲', cat: 'cond', eff: 'theme_all' },
    ],
    canta: [
      { id: 'genis_canta', icon: '📦', cat: 'slot', eff: 'weight' },
      { id: 'cok_cepli', icon: '📦', cat: 'slot', eff: 'invslot' },
      { id: 'hafif_yapim', icon: '🎒', cat: 'mobility', eff: 'loadpenalty' },
      { id: 'siki_baglama', icon: '🛡️', cat: 'lossreduce', eff: 'lossreduce' },
      { id: 'gezgin_canta', icon: '🌍', cat: 'mobility', eff: 'travel' },
      { id: 'tuccar_canta', icon: '🛍️', cat: 'taxcut', eff: 'taxcut' },
      { id: 'sansli_kese', icon: '🍀', cat: 'drop', eff: 'gold' },
    ],
    alet: [
      { id: 'saglam_yapim', icon: '🔧', cat: 'crosstier', eff: 'crosstier' },
      { id: 'nadir_bulgu', icon: '🌟', cat: 'rareup', eff: 'rareup' },
      { id: 'yonetici', icon: '🌲', cat: 'cond', eff: 'zoneyield' },
    ],
    set: [
      { id: 'bereket_usta', icon: '🌿', cat: 'direct', eff: 'yieldp' },
      { id: 'sansli_yumruk', icon: '🍀', cat: 'drop', eff: 'double' },
      { id: 'bereket3', icon: '🌲', cat: 'cond', eff: 'zoneyield' },
      { id: 'sezgisellik', icon: '🌫️', cat: 'tierup', eff: 'tierup' },
    ],
  };
  const SPECIFIC_PERKS = {};
  for (var _spk in _SPECIFIC_PERKS_RAW) {
    SPECIFIC_PERKS[_spk] = _SPECIFIC_PERKS_RAW[_spk].map(_perkWithName);
  }

  // ---- Magnitude tabloları (rarityIndex -> [min,max]) ----
  const MAG = {
    direct: [[2, 5], [4, 8], [6, 12], [10, 18], [15, 25]],
    cond: [[3, 7], [5, 10], [8, 15], [12, 22], [18, 30]],
    crit: [[0.4, 1.0], [0.7, 1.3], [1.0, 1.6], [1.2, 1.8], [1.4, 2.0]],
    dodge: [[0.4, 1.0], [0.7, 1.3], [1.0, 1.6], [1.2, 1.8], [1.4, 2.0]],
    drop: [[3, 7], [5, 10], [8, 15], [12, 22], [18, 30]],
    mobility: [[4, 8], [7, 13], [11, 19], [16, 26], [22, 35]],
    slot: [[4, 8], [7, 13], [11, 19], [16, 26], [22, 35]],
    exp: [[5, 12], [10, 20], [18, 30], [25, 40], [30, 50]],
    capeproc: [[0.5, 1.0], [1, 2], [1.5, 3], [2, 4], [2, 6]],
    capemult: [[1, 3], [2, 5], [3, 7], [5, 10], [5, 15]],
    crosstier: [[2, 5], [4, 8], [7, 12], [10, 18], [15, 25]],
    rareup: [[0.5, 1], [1, 2], [1.5, 3], [2.5, 4.5], [3, 7]],
    tierup: [[0.1, 0.3], [0.3, 0.6], [0.6, 1.2], [1, 2], [1.5, 3.5]],
    lossreduce: [[1, 3], [2, 5], [4, 8], [6, 12], [8, 15]],
    taxcut: [[1, 2], [2, 4], [3, 6], [4, 8], [5, 10]],
  };

  // ---- Cape proc ----
  const CAPE_PROC_CHANCE = { W: 10, G: 15, B: 20, O: 25, R: 30 };
  const CAPE_MULT = { 1: 2.0, 2: 2.2, 3: 2.5 };

  // ---- Item EXP eşikleri ----
  const EXP_THRESHOLD = { 2: 1000, 3: 5000 };
  const EXP_GAIN = { 1: 1, 2: 3, 3: 9 };

  // ---- Dungeon ----
  const FLOORS = [
    { k: 'K1', color: 'W', t1: 80, t2: 160, t3: 320, itemDrop: 8, gold: 5, enhStone: 1.7, charm: 0.01, chest: 0.8, bossGold: 200, cascade: [70, 22, 6, 2, 0] },
    { k: 'K2', color: 'G', t1: 105, t2: 210, t3: 420, itemDrop: 6, gold: 12, enhStone: 1.7, charm: 0.02, chest: 0.8, bossGold: 500, cascade: [35, 45, 15, 4, 1] },
    { k: 'K3', color: 'B', t1: 140, t2: 275, t3: 545, itemDrop: 5, gold: 25, enhStone: 1.7, charm: 0.04, chest: 0.8, bossGold: 1200, cascade: [15, 30, 35, 15, 5] },
    { k: 'K4', color: 'O', t1: 180, t2: 355, t3: 705, itemDrop: 4, gold: 50, enhStone: 1.7, charm: 0.08, chest: 0.8, bossGold: 3000, cascade: [5, 15, 25, 35, 20] },
    { k: 'K5', color: 'R', t1: 240, t2: 480, t3: 960, itemDrop: 3, gold: 100, enhStone: 1.7, charm: 0.15, chest: 0.8, bossGold: 7000, cascade: [1, 5, 14, 30, 50] },
  ];

  // Tool-node tier verim matrisi [tool tier][node tier] -> mult (null = çalışmaz)
  const TOOL_MATRIX = {
    1: { 1: 1.0, 2: 0.5, 3: null },
    2: { 1: 1.3, 2: 1.0, 3: 0.5 },
    3: { 1: 1.6, 2: 1.3, 3: 1.0 },
  };

  // ---- Enhancement ----
  const ENH_STONES = [
    { p: 3, base: 95 }, { p: 6, base: 85 }, { p: 9, base: 75 }, { p: 12, base: 65 }, { p: 15, base: 55 },
  ];

  // Chest (sandık) content pool — from mob drop %0.8 chance
  const CHEST_POOL = [
    { type: 'stone', k: 'stone3', p: 3, weight: 35 },
    { type: 'stone', k: 'stone6', p: 6, weight: 25 },
    { type: 'stone', k: 'stone9', p: 9, weight: 18 },
    { type: 'stone', k: 'stone12', p: 12, weight: 12 },
    { type: 'stone', k: 'stone15', p: 15, weight: 5 },
    { type: 'charm', k: 'charm_drop', weight: 4 },  // düşüş koruma
    { type: 'charm', k: 'charm_break', weight: 1 },  // kırılma koruma
  ];

  // Chest types
  const CHESTS = {
    enhChest: { get name() { return SKY.LANG.t('chest.enhChest'); }, get desc() { return SKY.LANG.t('chest.enhChest_desc'); }, pool: 'CHEST_POOL' },
    goldChest: { get name() { return SKY.LANG.t('chest.goldChest'); }, get desc() { return SKY.LANG.t('chest.goldChest_desc'); }, goldMin: 500, goldMax: 5000 },
  };

  // mevcut % -> {success, drop, break}
  function enhOdds(cur) {
    if (cur < 60) return { success: 0.90, drop: 0, brk: 0 };
    if (cur < 70) return { success: 0.85, drop: 0.11, brk: 0.04 };
    if (cur < 80) return { success: 0.82, drop: 0.11, brk: 0.07 };
    if (cur < 87) return { success: 0.78, drop: 0.09, brk: 0.13 };
    return { success: 0.70, drop: 0.06, brk: 0.24 };
  }
  const MAX_ENH = 90;

  // ---- Rarity upgrade ----
  const RARITY_UP = [
    { from: 0, to: 1, success: 0.80, failTo: 0 }, // W->G fail beyaz kalır
    { from: 1, to: 2, success: 0.65, failTo: 0 }, // G->B fail beyaz
    { from: 2, to: 3, success: 0.45, failTo: 1 }, // B->O fail yeşil
    { from: 3, to: 4, success: 0.25, failTo: 2 }, // O->R fail mavi
  ];
  const DUST_COST = 0;

  // ---- Yemek & İksir buff tabloları ----
  // her buff: type, food[5 rarity], potion[5 rarity], dur(food=1800s, potion=180s)
  const _BUFFS_DATA = {
    gatherspeed: { icon: '🌿', food: [3, 6, 10, 15, 20], pot: [6, 12, 20, 30, 40] },
    yield: { icon: '🌾', food: [3, 6, 10, 15, 20], pot: [6, 12, 20, 30, 40] },
    double: { icon: '🍀', food: [2, 4, 6, 9, 12], pot: [4, 8, 12, 18, 24] },
    gold: { icon: '💰', food: [5, 10, 15, 22, 30], pot: [10, 20, 30, 45, 60] },
    craftdrop: { icon: '⚒️', food: [5, 10, 15, 22, 30], pot: [10, 20, 30, 45, 60] },
    cp: { icon: '⚔️', food: [3, 5, 8, 12, 15], pot: [6, 10, 15, 22, 30] },
    combattime: { icon: '⏱️', food: [2, 5, 8, 12, 15], pot: [5, 10, 15, 22, 25] },
    itemdrop: { icon: '🎁', food: [5, 10, 15, 22, 30], pot: [10, 20, 30, 45, 60] },
    bossloot: { icon: '🏆', food: [5, 10, 15, 22, 30], pot: [10, 20, 30, 45, 60] },
  };
  const BUFFS = {};
  for (var _bk in _BUFFS_DATA) {
    (function(key, bd) {
      BUFFS[key] = Object.defineProperty(Object.assign({}, bd), 'name', { get: function() { return SKY.LANG.t('buff.' + key); }, enumerable: true });
    })(_bk, _BUFFS_DATA[_bk]);
  }
  const FOOD_DUR = 1800, POT_DUR = 180;

  // ---- Ağırlık birimleri ----
  const WEIGHT = { mat: 1, consumable: 0.5, enhStone: 1, charm: 3, equip: 5, goldPer1000: 0.5 };

  // ---- Travel süreleri (sn) ----
  const TRAVEL = {
    'city-t1': 5, 't1-t1': 5, 't1-t2': 5, 't2-t3': 5,
  };

  // ---- Dünya haritası: zonelar ----
  // her şehrin: kendi T1, koridor T2; merkez tek T3
  const _ZONE_DATA = [
    { id: 'city_kar', kind: 'city', city: 'kar', map: 0 },
    { id: 'city_orman', kind: 'city', city: 'orman', map: 0 },
    { id: 'city_col', kind: 'city', city: 'col', map: 0 },
    { id: 't1_kar', kind: 'field', tier: 1, biome: 'kar', pvp: 'safe', map: 1 },
    { id: 't1_orman', kind: 'field', tier: 1, biome: 'orman', pvp: 'safe', map: 1 },
    { id: 't1_col', kind: 'field', tier: 1, biome: 'col', pvp: 'safe', map: 1 },
    { id: 't2_kar', kind: 'field', tier: 2, biome: 'kar', pvp: 'blue', map: 2 },
    { id: 't2_orman', kind: 'field', tier: 2, biome: 'orman', pvp: 'blue', map: 2 },
    { id: 't2_col', kind: 'field', tier: 2, biome: 'col', pvp: 'blue', map: 2 },
    { id: 't3_merkez', kind: 'field', tier: 3, biome: 'col', pvp: 'red', map: 3 },
  ];
  const ZONES = _ZONE_DATA.map(function(z) {
    var obj = Object.assign({}, z);
    Object.defineProperty(obj, 'name', { get: function() { return SKY.LANG.t('zone.' + z.id); }, enumerable: true });
    return obj;
  });

  // PvP death loot [silinir, öldürene, kalır]
  const DEATH_LOOT = { safe: [0, 0, 100], blue: [25, 25, 50], red: [50, 50, 0] };
  const DEATH_CD = { safe: 60, blue: 360, red: 600 };

  // Ekonomi
  const START_GOLD = 2000;
  const START_INV = 20;
  const BANK_START = 100, BANK_MAX = 500, BANK_UP_COST = 5000, BANK_UP_SLOT = 25;
  const MARKET_TAX = 0.10;
  const FAST_TRAVEL_COST = 500;
  const CITY_CHANGE_COST = 50000;
  const BASE_CARRY = 100;

  // ============ MOUNT (BINEK) SYSTEM ============
  const _MOUNT_TYPE_DATA = {
    at:   { nameKey: 'mount.at', icon: 'at', hiz: [8,16,24,32,40], agirlik: [15,30,45,60,75], ozel: null,        ozelLabel: null },
    kurt: { nameKey: 'mount.kurt', icon: 'kurt', hiz: [5,10,15,20,25], agirlik: [10,20,30,40,50], ozel: [3,6,9,12,15], ozelLabel: '+CP' },
    fil:  { nameKey: 'mount.fil', icon: 'fil', hiz: [2,4,6,8,10], agirlik: [30,60,90,120,150], ozel: 'invslot',  get ozelLabel() { return SKY.LANG.t('mount.inv_slot'); } },
  };
  const MOUNT_TYPES = {};
  for (var _mk in _MOUNT_TYPE_DATA) {
    (function(key, md) {
      var obj = Object.assign({}, md);
      Object.defineProperty(obj, 'name', { get: function() { return SKY.LANG.t(md.nameKey); }, enumerable: true });
      MOUNT_TYPES[key] = obj;
    })(_mk, _MOUNT_TYPE_DATA[_mk]);
  }
  // sum of stars -> rarity: 2-4 W, 5-7 G, 8-10 B, 11-13 O(gold), 14-15 R
  function mountRarity(starSum) {
    if (starSum <= 4)  return 0; // W
    if (starSum <= 7)  return 1; // G
    if (starSum <= 10) return 2; // B
    if (starSum <= 13) return 3; // O
    return 4; // R
  }
  // Mount box drop rates: mobs %0.03, bosses K1-K5
  const MOUNT_BOX_DROP = { mob: 1, bossGuarantee: true };
  // Red stat: %0.5 from mount box, only At and Kurt
  const MOUNT_RED_CHANCE = 0.5;

  const MOUNT_BOX_POOL = [
    { type: 'mount', k: 'at', weight: 20 },
    { type: 'mount', k: 'kurt', weight: 12 },
    { type: 'mount', k: 'fil', weight: 5 },
    { type: 'stone', k: 'stone3', weight: 10 },
    { type: 'stone', k: 'stone6', weight: 10 },
    { type: 'stone', k: 'stone9', weight: 8 },
    { type: 'stone', k: 'stone12', weight: 5 },
    { type: 'stone', k: 'stone15', weight: 2.5 },
    { type: 'charm', k: 'charm_drop', weight: 7 },
    { type: 'charm', k: 'charm_break', weight: 3 },
    { type: 'gold', min: 500, max: 5000, weight: 7 },
    { type: 'redMount', weight: 0.5 },
  ];

  // ============ PREMIUM SHOP (MAGAZA) ============
  const SHOP = {
    premiumPrice: 9.99, premiumDays: 30, premiumCurrency: 'usd',
    premiumPerks: { offlineEarn: 30, invSlot: 1, bankSlot: 1, dropBonus: 10, taxCut: 25, xpBonus: 15, goldName: true },
    slots: [
      { id: 'inv1',  get name() { return SKY.LANG.t('shop.inv_slot_1'); },  price: 4.99,  currency: 'usd', type: 'inv',  amount: 1 },
      { id: 'inv3',  get name() { return SKY.LANG.t('shop.inv_slot_3'); },  price: 12.99, currency: 'usd', type: 'inv',  amount: 3 },
      { id: 'bank1', get name() { return SKY.LANG.t('shop.bank_slot_1'); }, price: 2.99,  currency: 'usd', type: 'bank', amount: 1 },
      { id: 'bank5', get name() { return SKY.LANG.t('shop.bank_slot_5'); }, price: 12.99, currency: 'usd', type: 'bank', amount: 5 },
      { id: 'mkt1',  get name() { return SKY.LANG.t('shop.mkt_slot_1'); }, price: 2.99,  currency: 'usd', type: 'market', amount: 1 },
    ],
    crystalPacks: [
      { id: 'c100',  gems: 100,  price: 1.99,  get label() { return SKY.LANG.t('shop.crystal_100'); } },
      { id: 'c300',  gems: 300,  price: 4.99,  get label() { return SKY.LANG.t('shop.crystal_300'); } },
      { id: 'c600',  gems: 600,  price: 8.99,  get label() { return SKY.LANG.t('shop.crystal_600'); } },
      { id: 'c1200', gems: 1200, price: 14.99, get label() { return SKY.LANG.t('shop.crystal_1200'); } },
    ],
    starterPack: { price: 19.99, currency: 'usd', premiumDays: 30, gems: 200, invSlots: 3, oneTime: true },
  };

  // ============ WAR (KADIM TAS SAVASI) ============
  const WAR = {
    stoneHP: 40000,
    regenPerMin: 800, // 2%/min
    tickInterval: 10, // seconds
    warDuration: 3600, // 1 hour in seconds
    warDays: [3, 6], // Wed=3, Sat=6 (JS getDay)
    warHour: 20, // 20:00 server time
    cooldownAfterCapture: 300, // 5 min in seconds
    // stone positions: 3 per city (city, t1, t2) + 1 golden at t3
    stones: [
      { id: 'ws_kar_city', city: 'kar', tier: 'city', get name() { return SKY.LANG.t('ws.kar_city'); } },
      { id: 'ws_kar_t1',   city: 'kar', tier: 't1',   get name() { return SKY.LANG.t('ws.kar_t1'); } },
      { id: 'ws_kar_t2',   city: 'kar', tier: 't2',   get name() { return SKY.LANG.t('ws.kar_t2'); } },
      { id: 'ws_orman_city', city: 'orman', tier: 'city', get name() { return SKY.LANG.t('ws.orman_city'); } },
      { id: 'ws_orman_t1',   city: 'orman', tier: 't1',   get name() { return SKY.LANG.t('ws.orman_t1'); } },
      { id: 'ws_orman_t2',   city: 'orman', tier: 't2',   get name() { return SKY.LANG.t('ws.orman_t2'); } },
      { id: 'ws_col_city', city: 'col', tier: 'city', get name() { return SKY.LANG.t('ws.col_city'); } },
      { id: 'ws_col_t1',   city: 'col', tier: 't1',   get name() { return SKY.LANG.t('ws.col_t1'); } },
      { id: 'ws_col_t2',   city: 'col', tier: 't2',   get name() { return SKY.LANG.t('ws.col_t2'); } },
      { id: 'ws_golden',   city: null,  tier: 't3',   get name() { return SKY.LANG.t('ws.golden'); }, golden: true },
    ],
    // Post-war buffs based on stone count
    buffTable: [
      { min: 0, max: 0, cp: -15 },
      { min: 1, max: 2, cp: -5 },
      { min: 3, max: 3, cp: 0 },
      { min: 4, max: 5, cp: 5 },
      { min: 6, max: 10, cp: 15 },
    ],
    goldenBonus: 5, // +5% gold for 1 week
    underdogBuff: { stoneHP: 15, citizenCP: 10, regen: 20 },
    // Bot city CP ranges per tier for simulation
    botCP: { city: [800,1200], t1: [500,900], t2: [1000,1800], t3: [1500,2500] },
  };

  // ============ TRADE (TICARET) SYSTEM ============
  const TRADE = {
    gridSize: 12, // 6x2 per side
    npcTraders: [
      { get name() { return SKY.LANG.t('trade.npc_ahmet'); },  icon: '🧔', specialty: 'silah',  bias: 1.2 },
      { get name() { return SKY.LANG.t('trade.npc_zeynep'); }, icon: '👩', specialty: 'zirh',   bias: 1.1 },
      { get name() { return SKY.LANG.t('trade.npc_ali'); },    icon: '🧳', specialty: 'alet',   bias: 1.3 },
      { get name() { return SKY.LANG.t('trade.npc_kemal'); },  icon: '🔨', specialty: 'cevher', bias: 0.9 },
      { get name() { return SKY.LANG.t('trade.npc_elif'); },   icon: '🏹', specialty: 'deri',   bias: 1.15 },
    ],
  };

  return {
    FAMILIES, MAT_NAMES, FAMILY_LABEL, RARITY, TIER_MULT, BIOME_DIST, CITIES,
    NODE_CASCADE, MAP_NODE_TIER, NODE_SIZES, RECIPES, EQUIP_SLOTS, BASE_STATS,
    CARRY_BONUS, T0_SET, GENERAL_PERKS, SPECIFIC_PERKS, MAG, CAPE_PROC_CHANCE,
    CAPE_MULT, EXP_THRESHOLD, EXP_GAIN, FLOORS, TOOL_MATRIX, ENH_STONES, CHEST_POOL, CHESTS, enhOdds,
    MAX_ENH, RARITY_UP, DUST_COST, BUFFS, FOOD_DUR, POT_DUR, WEIGHT, TRAVEL,
    ZONES, DEATH_LOOT, DEATH_CD, START_GOLD, START_INV, BANK_START, BANK_MAX,
    BANK_UP_COST, BANK_UP_SLOT, MARKET_TAX, FAST_TRAVEL_COST, CITY_CHANGE_COST, BASE_CARRY,
    MOUNT_TYPES, mountRarity, MOUNT_BOX_DROP, MOUNT_RED_CHANCE, MOUNT_BOX_POOL,
    SHOP, WAR, TRADE,
    rarityIndex: (k) => RARITY.findIndex(r => r.k === k),
  };
})();
