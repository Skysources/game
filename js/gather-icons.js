// Gather material SVG icon generators — matches Toplama Ürünleri Belgesi spec
// Each function takes a palette {base, shade, light, line, [metal, metalLt, snow]} and returns SVG inner content
window.GICONS = {
  stone: function(p) {
    return '<ellipse cx="60" cy="108" rx="36" ry="8" fill="' + p.line + '" opacity=".5"/>' +
      '<polygon points="60,12 100,42 90,90 30,90 20,42" fill="' + p.shade + '"/>' +
      '<polygon points="60,12 100,42 60,52" fill="' + p.light + '" opacity=".6"/>' +
      '<polygon points="60,12 20,42 60,52" fill="' + p.base + '"/>' +
      '<polygon points="60,52 100,42 90,90" fill="' + p.base + '" opacity=".8"/>' +
      '<polygon points="60,52 20,42 30,90" fill="' + p.shade + '"/>' +
      '<polygon points="60,52 90,90 30,90" fill="' + p.base + '"/>' +
      '<ellipse cx="40" cy="38" rx="10" ry="7" fill="' + p.light + '" opacity=".15"/>';
  },
  ore: function(p) {
    var m = p.metal || p.base;
    var ml = p.metalLt || p.light;
    return '<ellipse cx="60" cy="108" rx="38" ry="8" fill="' + p.line + '" opacity=".5"/>' +
      '<polygon points="16,100 32,42 60,26 88,42 104,100" fill="' + p.shade + '"/>' +
      '<polygon points="20,98 35,46 60,30 85,46 100,98" fill="' + p.base + '"/>' +
      '<polygon points="28,96 40,52 60,38 80,52 92,96" fill="' + p.light + '" opacity=".3"/>' +
      '<path d="M48,48 Q60,40 72,48 Q68,68 60,72 Q52,68 48,48Z" fill="' + m + '" opacity=".7"/>' +
      '<path d="M52,50 Q60,44 68,50 Q65,64 60,67 Q55,64 52,50Z" fill="' + ml + '" opacity=".5"/>' +
      '<ellipse cx="38" cy="54" rx="8" ry="5" fill="' + p.light + '" opacity=".12"/>';
  },
  fish: function(p) {
    return '<ellipse cx="60" cy="106" rx="40" ry="9" fill="' + p.line + '" opacity=".5"/>' +
      '<path d="M16,60 Q60,28 104,60 Q88,82 60,76 Q32,82 16,60Z" fill="' + p.shade + '"/>' +
      '<ellipse cx="60" cy="58" rx="28" ry="16" fill="' + p.base + '"/>' +
      '<ellipse cx="60" cy="56" rx="22" ry="12" fill="' + p.light + '" opacity=".4"/>' +
      '<circle cx="38" cy="54" r="5" fill="#fff" opacity=".9"/>' +
      '<circle cx="38" cy="54" r="2" fill="#222"/>' +
      '<path d="M88,58 Q98,48 104,60 Q100,66 88,58Z" fill="' + p.shade + '"/>';
  },
  wood: function(p) {
    return '<ellipse cx="60" cy="108" rx="38" ry="8" fill="' + p.line + '" opacity=".5"/>' +
      '<rect x="20" y="56" width="80" height="24" rx="12" fill="' + p.shade + '"/>' +
      '<rect x="20" y="38" width="80" height="24" rx="12" fill="' + p.base + '"/>' +
      '<ellipse cx="24" cy="50" rx="10" ry="12" fill="' + p.light + '" opacity=".5"/>' +
      '<ellipse cx="24" cy="50" rx="6" ry="7" fill="' + p.base + '"/>' +
      '<ellipse cx="24" cy="50" rx="3" ry="3.5" fill="' + p.shade + '" opacity=".6"/>' +
      '<ellipse cx="96" cy="68" rx="10" ry="12" fill="' + p.light + '" opacity=".4"/>' +
      '<ellipse cx="96" cy="68" rx="6" ry="7" fill="' + p.base + '"/>';
  },
  herb: function(p) {
    return '<ellipse cx="60" cy="110" rx="28" ry="6" fill="' + p.line + '" opacity=".5"/>' +
      '<line x1="60" y1="108" x2="60" y2="70" stroke="' + p.shade + '" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M60,90 Q36,82 30,60 Q46,64 56,80Z" fill="' + p.base + '"/>' +
      '<path d="M60,78 Q84,70 90,48 Q74,54 64,72Z" fill="' + p.base + '"/>' +
      '<path d="M60,70 Q40,62 36,44 Q50,50 58,64Z" fill="' + p.light + '" opacity=".6"/>';
  }
};

// Resource palettes per tier (from Toplama Ürünleri Belgesi)
window.SKY_RESPAL = {
  stone: {
    1: {base:'#9a968d', shade:'#615d56', light:'#c2bdb2', line:'#322f2a'},
    2: {base:'#8c95a0', shade:'#565d66', light:'#bcc4cd', line:'#2a2e33'},
    3: {base:'#d2c7b0', shade:'#90876a', light:'#f3ecd6', line:'#4a4536'}
  },
  ore: {
    1: {base:'#6f6a63', shade:'#46423c', light:'#928c83', line:'#26231f', metal:'#c47a3a', metalLt:'#ecab68'},
    2: {base:'#6a6e73', shade:'#43464a', light:'#9aa0a6', line:'#232527', metal:'#c2c8cf', metalLt:'#eef2f6'},
    3: {base:'#6b6253', shade:'#443e34', light:'#928775', line:'#241f18', metal:'#e7be51', metalLt:'#fbe9a4'}
  },
  fish: {
    1: {base:'#9aa0a4', shade:'#5f656a', light:'#c6ccd0', line:'#2b2e31'},
    2: {base:'#7fa6c4', shade:'#4d6e88', light:'#c0d9ec', line:'#283845'},
    3: {base:'#e6c267', shade:'#a07f30', light:'#fbe9a4', line:'#4a3a12'}
  },
  wood: {
    1: {base:'#c39a5f', shade:'#8a6736', light:'#e2c393', line:'#4a3416'},
    2: {base:'#9c6f3f', shade:'#684622', light:'#c39763', line:'#3a2410'},
    3: {base:'#7c4a2a', shade:'#512c16', light:'#a66a3e', line:'#2c1709'}
  },
  herb: {
    1: {base:'#9aae5e', shade:'#637436', light:'#c6d68a', line:'#33401c'},
    2: {base:'#5f9a4a', shade:'#3a6a2c', light:'#92c673', line:'#1f3f18'},
    3: {base:'#46a86a', shade:'#2a6a42', light:'#7fd6a0', line:'#173f28'}
  }
};

// Equipment icon palettes per tier (from Item Sistemi Belgesi)
window.SKY_EQPAL = {
  1: {base:'#9a7748', shade:'#5f482b', light:'#caa572', line:'#2a1f13', wood:'#6e4f30'},
  2: {base:'#aab2bb', shade:'#69727c', light:'#e6ebf0', line:'#262b30', wood:'#6e4f30'},
  3: {base:'#e7be51', shade:'#9c7626', light:'#fbe9a4', line:'#4a3712', wood:'#7a5733'}
};

// Equipment SVG icon generators (from Item Sistemi Belgesi)
window.ICONS = {
  sword: function(p) {
    return '<ellipse cx="60" cy="112" rx="24" ry="6" fill="' + p.line + '" opacity=".5"/>' +
      '<path d="M60,10 L68,20 L65,78 L55,78 L52,20Z" fill="' + p.shade + '"/>' +
      '<path d="M60,10 L64,20 L62,78 L58,78 L56,20Z" fill="' + p.light + '"/>' +
      '<path d="M60,10 L62,20 L60,76 L58,20Z" fill="#fff" opacity=".3"/>' +
      '<rect x="38" y="78" width="44" height="8" rx="3" fill="' + p.wood + '"/>' +
      '<rect x="56" y="86" width="8" height="18" rx="3" fill="' + (p.wood === '#6e4f30' ? '#4a3216' : p.wood) + '"/>' +
      '<circle cx="60" cy="108" r="5" fill="' + p.shade + '"/>';
  },
  spear: function(p) {
    return '<ellipse cx="60" cy="114" rx="16" ry="4" fill="' + p.line + '" opacity=".5"/>' +
      '<rect x="57" y="30" width="6" height="80" rx="3" fill="' + p.wood + '"/>' +
      '<path d="M60,8 L66,28 L60,32 L54,28Z" fill="' + p.shade + '"/>' +
      '<path d="M60,8 L63,28 L60,30 L57,28Z" fill="' + p.light + '"/>';
  },
  bow: function(p) {
    return '<ellipse cx="60" cy="112" rx="20" ry="5" fill="' + p.line + '" opacity=".5"/>' +
      '<path d="M38,18 Q28,60 38,102" stroke="' + p.wood + '" stroke-width="5" fill="none" stroke-linecap="round"/>' +
      '<path d="M38,18 L80,60 L38,102" stroke="' + p.shade + '" stroke-width="1.5" fill="none"/>' +
      '<path d="M80,52 L80,68 L90,60Z" fill="' + p.light + '"/>';
  },
  helmet: function(p) {
    return '<ellipse cx="60" cy="110" rx="36" ry="8" fill="' + p.line + '" opacity=".5"/>' +
      '<path d="M26,74 Q26,28 60,28 Q94,28 94,74 L92,84 L28,84Z" fill="' + p.shade + '"/>' +
      '<path d="M30,72 Q30,34 60,34 Q90,34 90,72 L88,80 L32,80Z" fill="' + p.base + '"/>' +
      '<path d="M36,70 Q36,40 60,40 Q84,40 84,70 L82,76 L38,76Z" fill="' + p.light + '" opacity=".3"/>' +
      '<rect x="26" y="82" width="68" height="10" rx="3" fill="' + p.shade + '"/>';
  },
  armor: function(p) {
    return '<ellipse cx="60" cy="112" rx="36" ry="8" fill="' + p.line + '" opacity=".5"/>' +
      '<path d="M36,18 L60,28 L84,18 L92,30 L86,40 L90,100 Q60,110 30,100 L34,40 L28,30Z" fill="' + p.shade + '"/>' +
      '<path d="M40,22 L60,30 L80,22 L86,32 L82,40 L84,96 Q60,104 36,96 L38,40 L34,32Z" fill="' + p.base + '"/>' +
      '<path d="M60,30 L60,100" stroke="' + p.line + '" stroke-width="2.5"/>' +
      '<path d="M44,56 L76,56" stroke="' + p.line + '" stroke-width="1.5" opacity=".5"/>';
  },
  gloves: function(p) {
    return '<ellipse cx="60" cy="110" rx="28" ry="6" fill="' + p.line + '" opacity=".5"/>' +
      '<path d="M34,48 L34,88 Q34,98 44,98 L70,98 Q78,98 78,88 L78,42 L72,42 L72,58 L68,58 L68,30 L64,30 L64,58 L60,58 L60,34 L56,34 L56,58 L52,58 L52,48Z" fill="' + p.shade + '"/>' +
      '<path d="M38,50 L38,88 Q38,94 44,94 L70,94 Q74,94 74,88 L74,46" fill="' + p.base + '"/>' +
      '<rect x="32" y="86" width="48" height="10" rx="3" fill="' + p.light + '" opacity=".4"/>';
  },
  boots: function(p) {
    return '<ellipse cx="62" cy="110" rx="34" ry="7" fill="' + p.line + '" opacity=".5"/>' +
      '<path d="M40,18 L64,18 L64,68 L92,68 Q98,68 98,76 L98,90 L32,90 L32,76 L40,68Z" fill="' + p.shade + '"/>' +
      '<path d="M44,22 L60,22 L60,68 L90,68 Q94,68 94,76 L38,76 L38,72 L44,68Z" fill="' + p.base + '"/>' +
      '<rect x="32" y="88" width="66" height="8" rx="2" fill="' + p.line + '"/>';
  },
  bag: function(p) {
    return '<ellipse cx="60" cy="110" rx="32" ry="7" fill="' + p.line + '" opacity=".5"/>' +
      '<path d="M34,40 Q34,22 60,22 Q86,22 86,40 L92,40 L96,100 Q60,110 24,100 L28,40Z" fill="' + p.shade + '"/>' +
      '<path d="M40,40 Q40,26 60,26 Q80,26 80,40" fill="none" stroke="' + p.line + '" stroke-width="5"/>' +
      '<path d="M36,44 L84,44 L88,96 Q60,104 32,96Z" fill="' + p.base + '"/>' +
      '<rect x="48" y="58" width="24" height="14" rx="4" fill="' + p.line + '"/>';
  },
  cape: function(p) {
    return '<ellipse cx="60" cy="112" rx="30" ry="7" fill="' + p.line + '" opacity=".5"/>' +
      '<path d="M38,20 Q60,12 82,20 L92,106 Q60,96 28,106Z" fill="' + p.shade + '"/>' +
      '<path d="M42,24 Q60,18 78,24 L86,102 Q60,94 34,102Z" fill="' + p.base + '"/>' +
      '<path d="M60,20 L60,98" stroke="' + p.line + '" stroke-width="1.5"/>';
  },
  mount: function(p) {
    return '<ellipse cx="60" cy="108" rx="40" ry="8" fill="' + p.line + '" opacity=".5"/>' +
      '<path d="M24,46 Q18,30 34,28 L38,18 L44,28 Q60,28 68,40 L94,56 L92,64 L78,58 L80,96 L70,96 L68,68 L48,68 L46,96 L36,96 L38,62 Q24,58 24,46Z" fill="' + p.shade + '"/>' +
      '<path d="M28,46 Q26,32 34,30 L40,22 Q56,28 62,40 L82,52 L72,56 L66,48 L48,48 Q32,50 28,46Z" fill="' + p.base + '"/>' +
      '<circle cx="36" cy="38" r="3" fill="' + p.line + '"/>';
  },
  tool: function(p) {
    return '<ellipse cx="60" cy="112" rx="24" ry="6" fill="' + p.line + '" opacity=".5"/>' +
      '<path d="M18,34 Q60,18 102,34 Q90,44 60,42 Q30,44 18,34Z" fill="' + p.shade + '"/>' +
      '<path d="M22,34 Q60,22 98,34 Q86,40 60,38 Q34,40 22,34Z" fill="' + p.base + '"/>' +
      '<path d="M36,32 Q60,26 84,32" fill="none" stroke="' + p.light + '" stroke-width="1.5" opacity=".5"/>' +
      '<rect x="56" y="36" width="8" height="70" rx="4" fill="' + p.wood + '"/>';
  },
  gatherset: function(p) {
    return '<ellipse cx="60" cy="112" rx="30" ry="7" fill="' + p.line + '" opacity=".5"/>' +
      '<path d="M36,18 L60,28 L84,18 L88,30 L84,36 L86,96 Q60,106 34,96 L36,36 L32,30Z" fill="' + p.shade + '"/>' +
      '<path d="M40,22 L60,30 L80,22 L84,32 L80,38 L82,92 Q60,100 38,92 L40,38 L36,32Z" fill="' + p.base + '"/>' +
      '<path d="M60,30 L60,96" stroke="' + p.line + '" stroke-width="2"/>' +
      '<path d="M48,48 Q60,42 72,48 L70,54 Q60,50 50,54Z" fill="' + p.light + '" opacity=".3"/>';
  }
};
