window.SKY_STONES = {
  buz: `<svg viewBox="0 0 80 90"><defs><linearGradient id="iceG" x1=".5" y1="0" x2=".5" y2="1"><stop offset="0%" stop-color="#a0d8f0"/><stop offset="100%" stop-color="#4a8aaa"/></linearGradient><filter id="iceGl"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
          <ellipse cx="40" cy="85" rx="20" ry="4" fill="#1a3040" opacity=".5"/>
          <!-- base rock -->
          <path d="M20,75 L15,55 L25,35 L40,25 L55,35 L65,55 L60,75Z" fill="url(#iceG)" stroke="#6ab0d0" stroke-width="1"/>
          <!-- ice facets -->
          <path d="M25,35 L40,25 L40,50 L25,45Z" fill="#b0e0f8" opacity=".4"/>
          <path d="M40,25 L55,35 L50,50 L40,50Z" fill="#80c0e0" opacity=".3"/>
          <!-- ice crystal on top -->
          <polygon points="40,8 44,22 40,18 36,22" fill="#c0e8ff" stroke="#8ac0e0" stroke-width=".5"/>
          <polygon points="33,18 40,8 36,22" fill="#a0d8f0" opacity=".5"/>
          <!-- rune circle -->
          <circle cx="40" cy="50" r="8" fill="none" stroke="#80d0f0" stroke-width="1" opacity=".5"/>
          <circle cx="40" cy="50" r="3" fill="#a0e0ff" opacity=".4" filter="url(#iceGl)"/>
          <!-- frost particles -->
          <circle cx="28" cy="40" r="1" fill="#c0e8ff" opacity=".5"/>
          <circle cx="55" cy="45" r="1.2" fill="#b0d8f0" opacity=".4"/>
          <circle cx="35" cy="65" r=".8" fill="#c0e8ff" opacity=".3"/>
          </svg>`,
  orman: `<svg viewBox="0 0 80 90"><defs><linearGradient id="forG" x1=".5" y1="0" x2=".5" y2="1"><stop offset="0%" stop-color="#4a8a30"/><stop offset="100%" stop-color="#2a5a18"/></linearGradient><filter id="forGl"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
          <ellipse cx="40" cy="85" rx="20" ry="4" fill="#0a1808" opacity=".5"/>
          <path d="M20,75 L15,55 L25,35 L40,25 L55,35 L65,55 L60,75Z" fill="url(#forG)" stroke="#3a8a28" stroke-width="1"/>
          <path d="M25,35 L40,25 L40,50 L25,45Z" fill="#6aaa40" opacity=".35"/>
          <path d="M40,25 L55,35 L50,50 L40,50Z" fill="#4a8a28" opacity=".3"/>
          <!-- vine/root on top -->
          <path d="M35,22 Q30,15 35,10 Q40,6 45,10 Q50,15 45,22" fill="none" stroke="#3a7a20" stroke-width="2" stroke-linecap="round"/>
          <circle cx="40" cy="8" r="3" fill="#5aaa30"/>
          <circle cx="40" cy="8" r="1.5" fill="#80d050" opacity=".6"/>
          <!-- rune -->
          <circle cx="40" cy="50" r="8" fill="none" stroke="#60c040" stroke-width="1" opacity=".5"/>
          <circle cx="40" cy="50" r="3" fill="#70e050" opacity=".3" filter="url(#forGl)"/>
          <!-- moss spots -->
          <circle cx="22" cy="60" r="2" fill="#3a7a20" opacity=".3"/>
          <circle cx="58" cy="55" r="1.5" fill="#4a8a28" opacity=".25"/>
          <circle cx="30" cy="70" r="1.5" fill="#3a7a20" opacity=".2"/>
          </svg>`,
  col: `<svg viewBox="0 0 80 90"><defs><linearGradient id="desG" x1=".5" y1="0" x2=".5" y2="1"><stop offset="0%" stop-color="#d8a040"/><stop offset="100%" stop-color="#8a6020"/></linearGradient><filter id="desGl"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
          <ellipse cx="40" cy="85" rx="20" ry="4" fill="#1a1408" opacity=".5"/>
          <path d="M20,75 L15,55 L25,35 L40,25 L55,35 L65,55 L60,75Z" fill="url(#desG)" stroke="#b08830" stroke-width="1"/>
          <path d="M25,35 L40,25 L40,50 L25,45Z" fill="#e8c060" opacity=".35"/>
          <path d="M40,25 L55,35 L50,50 L40,50Z" fill="#c09838" opacity=".3"/>
          <!-- sun disk on top -->
          <circle cx="40" cy="14" r="8" fill="#e8b040" opacity=".6"/>
          <circle cx="40" cy="14" r="5" fill="#f0c860" opacity=".5"/>
          <circle cx="40" cy="14" r="2" fill="#fff0a0" opacity=".6"/>
          <!-- rune -->
          <circle cx="40" cy="50" r="8" fill="none" stroke="#e0b040" stroke-width="1" opacity=".5"/>
          <circle cx="40" cy="50" r="3" fill="#f0d060" opacity=".3" filter="url(#desGl)"/>
          <!-- sand texture -->
          <circle cx="25" cy="62" r="1" fill="#c09830" opacity=".3"/>
          <circle cx="55" cy="58" r="1.2" fill="#b08828" opacity=".25"/>
          </svg>`,
  altin: `<svg viewBox="0 0 80 90"><defs><linearGradient id="gldG" x1=".5" y1="0" x2=".5" y2="1"><stop offset="0%" stop-color="#f0c040"/><stop offset="100%" stop-color="#a07820"/></linearGradient><filter id="gldGl"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
          <ellipse cx="40" cy="85" rx="22" ry="5" fill="#1a1408" opacity=".6"/>
          <path d="M18,75 L12,52 L22,32 L40,20 L58,32 L68,52 L62,75Z" fill="url(#gldG)" stroke="#d0a030" stroke-width="1.5"/>
          <path d="M22,32 L40,20 L40,50 L22,42Z" fill="#ffe060" opacity=".4"/>
          <path d="M40,20 L58,32 L52,50 L40,50Z" fill="#d0a030" opacity=".3"/>
          <!-- crown on top -->
          <polygon points="32,18 36,6 40,14 44,6 48,18" fill="#e8c040" stroke="#c0a030" stroke-width=".5"/>
          <circle cx="36" cy="8" r="1.5" fill="#fff0a0" opacity=".7"/>
          <circle cx="44" cy="8" r="1.5" fill="#fff0a0" opacity=".7"/>
          <!-- central glow -->
          <circle cx="40" cy="48" r="10" fill="#f0c040" opacity=".15" filter="url(#gldGl)"/>
          <circle cx="40" cy="48" r="6" fill="none" stroke="#ffe060" stroke-width="1.5" opacity=".5"/>
          <circle cx="40" cy="48" r="3" fill="#ffe880" opacity=".5"/>
          <circle cx="40" cy="48" r="1.2" fill="#fff" opacity=".6"/>
          <!-- sparkles -->
          <circle cx="25" cy="40" r="1" fill="#ffe060" opacity=".5"/>
          <circle cx="58" cy="45" r="1.2" fill="#f0d050" opacity=".4"/>
          <circle cx="35" cy="65" r=".8" fill="#e8c040" opacity=".3"/>
          <circle cx="50" cy="62" r="1" fill="#f0d050" opacity=".35"/>
          </svg>`,
};
