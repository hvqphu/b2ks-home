export function renderHairIconSVG(style: string, color: string): string {
  const faceBase = `
    <circle cx="30" cy="34" r="15.5" fill="#FFE0BD" stroke="#2C3E50" stroke-width="2.4"/>
    <ellipse cx="21.5" cy="37" rx="2.6" ry="1.5" fill="rgba(255,118,117,0.55)"/>
    <ellipse cx="38.5" cy="37" rx="2.6" ry="1.5" fill="rgba(255,118,117,0.55)"/>
    <circle cx="24.5" cy="34.5" r="2.2" fill="#2C3E50"/><circle cx="23.9" cy="33.8" r="0.8" fill="#FFF"/>
    <circle cx="35.5" cy="34.5" r="2.2" fill="#2C3E50"/><circle cx="34.9" cy="33.8" r="0.8" fill="#FFF"/>
    <path d="M27 39.5 Q30 42 33 39.5" fill="none" stroke="#C0392B" stroke-width="1.6" stroke-linecap="round"/>
  `;
  const shineArc = `<path d="M21 22 Q30 16 39 22" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="2.2" stroke-linecap="round"/>`;

  if (style === 'spiky') {
    return `<svg width="50" height="50" viewBox="0 0 60 60">
      ${faceBase}
      <path d="M14 31 C14 14, 46 14, 46 31 L43 10 L35 18 L30 6 L24 18 L17 10 Z" fill="${color}" stroke="#2C3E50" stroke-width="2.4" stroke-linejoin="round"/>
      ${shineArc}
    </svg>`;
  }
  if (style === 'sidepart') {
    return `<svg width="50" height="50" viewBox="0 0 60 60">
      ${faceBase}
      <path d="M14 31 A16 16 0 0 1 46 28 Q39 21 33 25 Q22 29 14 31 Z" fill="${color}" stroke="#2C3E50" stroke-width="2.4"/>
      <path d="M29 16 Q32 23 36 24" fill="none" stroke="#2C3E50" stroke-width="1.6"/>
      ${shineArc}
    </svg>`;
  }
  if (style === 'undercut') {
    return `<svg width="50" height="50" viewBox="0 0 60 60">
      ${faceBase}
      <rect x="13" y="24" width="4" height="9" rx="2" fill="#2C3E50" opacity="0.35"/>
      <rect x="43" y="24" width="4" height="9" rx="2" fill="#2C3E50" opacity="0.35"/>
      <path d="M16 26 Q18 11 32 10 Q44 11 45 25 Q35 20 26 24 Q20 22 16 26 Z" fill="${color}" stroke="#2C3E50" stroke-width="2.4"/>
      ${shineArc}
    </svg>`;
  }
  if (style === 'bob') {
    return `<svg width="50" height="50" viewBox="0 0 60 60">
      <path d="M11 34 Q10 15 30 15 Q50 15 49 34 Q49 47 41 47 L19 47 Q11 47 11 34 Z" fill="${color}" stroke="#2C3E50" stroke-width="2.4"/>
      ${faceBase}
      <path d="M15 30 A15 15 0 0 1 45 30 Q39 27 34 30 Q30 27 26 30 Q21 27 15 30 Z" fill="${color}" stroke="#2C3E50" stroke-width="2.2"/>
      ${shineArc}
    </svg>`;
  }
  if (style === 'curly') {
    return `<svg width="50" height="50" viewBox="0 0 60 60">
      <circle cx="15" cy="28" r="8" fill="${color}" stroke="#2C3E50" stroke-width="2.2"/>
      <circle cx="45" cy="28" r="8" fill="${color}" stroke="#2C3E50" stroke-width="2.2"/>
      <circle cx="20" cy="18" r="8.5" fill="${color}" stroke="#2C3E50" stroke-width="2.2"/>
      <circle cx="40" cy="18" r="8.5" fill="${color}" stroke="#2C3E50" stroke-width="2.2"/>
      <circle cx="30" cy="15" r="9" fill="${color}" stroke="#2C3E50" stroke-width="2.2"/>
      ${faceBase}
      <path d="M16 27 Q23 22 30 26 Q37 22 44 27 Q42 18 30 17 Q18 18 16 27 Z" fill="${color}" stroke="#2C3E50" stroke-width="2"/>
    </svg>`;
  }
  if (style === 'long') {
    return `<svg width="50" height="50" viewBox="0 0 60 60">
      <rect x="10" y="18" width="40" height="36" rx="12" fill="${color}" stroke="#2C3E50" stroke-width="2.4"/>
      ${faceBase}
      <path d="M14.5 30 A15.5 15.5 0 0 1 45.5 30 Q38 25 30 29 Q22 25 14.5 30 Z" fill="${color}" stroke="#2C3E50" stroke-width="2.3"/>
      ${shineArc}
    </svg>`;
  }
  if (style === 'wavy') {
    return `<svg width="50" height="50" viewBox="0 0 60 60">
      <path d="M12 24 Q8 32 12 40 Q8 48 14 54 L46 54 Q52 48 48 40 Q52 32 48 24 Q44 13 30 13 Q16 13 12 24 Z" fill="${color}" stroke="#2C3E50" stroke-width="2.4"/>
      ${faceBase}
      <path d="M15 29 A15.5 15.5 0 0 1 45 29 Q35 23 30 28 Q23 24 15 29 Z" fill="${color}" stroke="#2C3E50" stroke-width="2.3"/>
      <circle cx="42" cy="24" r="3" fill="#FF6B6B" stroke="#2C3E50" stroke-width="1.2"/>
      ${shineArc}
    </svg>`;
  }
  if (style === 'pigtails') {
    return `<svg width="50" height="50" viewBox="0 0 60 60">
      <circle cx="10" cy="28" r="8.5" fill="${color}" stroke="#2C3E50" stroke-width="2.4"/>
      <circle cx="50" cy="28" r="8.5" fill="${color}" stroke="#2C3E50" stroke-width="2.4"/>
      ${faceBase}
      <path d="M14.5 30 A15.5 15.5 0 0 1 45.5 30 Q37 25 30 28 Q23 25 14.5 30 Z" fill="${color}" stroke="#2C3E50" stroke-width="2.3"/>
      <circle cx="15" cy="25" r="3" fill="#FF6B6B" stroke="#2C3E50" stroke-width="1.3"/>
      <circle cx="45" cy="25" r="3" fill="#FF6B6B" stroke="#2C3E50" stroke-width="1.3"/>
      ${shineArc}
    </svg>`;
  }
  if (style === 'ponytail') {
    return `<svg width="50" height="50" viewBox="0 0 60 60">
      <path d="M32 10 Q48 8 50 28 Q47 36 42 33 Q42 20 32 16 Z" fill="${color}" stroke="#2C3E50" stroke-width="2.3"/>
      ${faceBase}
      <path d="M14.5 30 A15.5 15.5 0 0 1 45.5 30 Q37 26 30 28 Q23 26 14.5 30 Z" fill="${color}" stroke="#2C3E50" stroke-width="2.3"/>
      <rect x="28" y="12" width="7" height="4.5" rx="2" fill="#FACC15" stroke="#2C3E50" stroke-width="1.4"/>
      ${shineArc}
    </svg>`;
  }
  if (style === 'bun') {
    return `<svg width="50" height="50" viewBox="0 0 60 60">
      <circle cx="17" cy="14" r="7.5" fill="${color}" stroke="#2C3E50" stroke-width="2.3"/>
      <circle cx="43" cy="14" r="7.5" fill="${color}" stroke="#2C3E50" stroke-width="2.3"/>
      <path d="M14 19 L22 17" stroke="#EC4899" stroke-width="3" stroke-linecap="round"/>
      <path d="M38 17 L46 19" stroke="#EC4899" stroke-width="3" stroke-linecap="round"/>
      ${faceBase}
      <path d="M14.5 30 A15.5 15.5 0 0 1 45.5 30 Q38 25 30 28 Q22 25 14.5 30 Z" fill="${color}" stroke="#2C3E50" stroke-width="2.3"/>
      ${shineArc}
    </svg>`;
  }
  if (style === 'braids') {
    return `<svg width="50" height="50" viewBox="0 0 60 60">
      <circle cx="13" cy="36" r="4.5" fill="${color}" stroke="#2C3E50" stroke-width="2"/>
      <circle cx="12.5" cy="43" r="4.2" fill="${color}" stroke="#2C3E50" stroke-width="2"/>
      <circle cx="12" cy="50" r="3.5" fill="${color}" stroke="#2C3E50" stroke-width="2"/>
      <circle cx="47" cy="36" r="4.5" fill="${color}" stroke="#2C3E50" stroke-width="2"/>
      <circle cx="47.5" cy="43" r="4.2" fill="${color}" stroke="#2C3E50" stroke-width="2"/>
      <circle cx="48" cy="50" r="3.5" fill="${color}" stroke="#2C3E50" stroke-width="2"/>
      ${faceBase}
      <path d="M14.5 30 A15.5 15.5 0 0 1 45.5 30 L30 26 Z" fill="${color}" stroke="#2C3E50" stroke-width="2.3"/>
      <circle cx="12.5" cy="46.5" r="2" fill="#38BDF8"/>
      <circle cx="47.5" cy="46.5" r="2" fill="#38BDF8"/>
      ${shineArc}
    </svg>`;
  }
  return `<svg width="50" height="50" viewBox="0 0 60 60">
    ${faceBase}
    <path d="M14 31 A16 16 0 0 1 46 31 Q39 26 30 29 Q21 26 14 31 Z" fill="${color}" stroke="#2C3E50" stroke-width="2.4"/>
    ${shineArc}
  </svg>`;
}

export function renderShirtIconSVG(opt: { color: string; pattern: string }): string {
  let detail = '';
  if (opt.pattern === 'collar') {
    detail = `<polygon points="24,14 30,22 36,14" fill="#FFFFFF" stroke="#2C3E50" stroke-width="1.5"/>`;
  } else if (opt.pattern === 'stripe') {
    detail = `<rect x="17" y="27" width="26" height="5" fill="rgba(255,255,255,0.75)"/>`;
  } else if (opt.pattern === 'star') {
    detail = `<text x="30" y="34" font-size="13" text-anchor="middle" fill="#FFE66D">★</text>`;
  } else if (opt.pattern === 'heart') {
    detail = `<text x="30" y="34" font-size="13" text-anchor="middle" fill="#FFCDD2">♥</text>`;
  } else if (opt.pattern === 'vest') {
    detail = `<polygon points="24,14 30,32 36,14" fill="#FFFFFF" stroke="#2C3E50" stroke-width="1.5"/><line x1="30" y1="32" x2="30" y2="46" stroke="#2C3E50" stroke-width="2"/>`;
  }
  return `<svg width="46" height="46" viewBox="0 0 60 60">
    <path d="M18 14 L8 22 L13 30 L17 26 L17 46 L43 46 L43 26 L47 30 L52 22 L42 14 L36 14 Q30 20 24 14 Z" fill="${opt.color}" stroke="#2C3E50" stroke-width="2.5" stroke-linejoin="round"/>
    ${detail}
  </svg>`;
}

export function renderPantsIconSVG(opt: { color: string; style: string }): string {
  if (opt.style === 'skirt') {
    return `<svg width="46" height="46" viewBox="0 0 60 60">
      <polygon points="20,14 40,14 48,44 12,44" fill="${opt.color}" stroke="#2C3E50" stroke-width="2.5" stroke-linejoin="round"/>
      <rect x="20" y="14" width="20" height="5" fill="rgba(255,255,255,0.3)" stroke="#2C3E50" stroke-width="2"/>
      <line x1="25" y1="20" x2="22" y2="44" stroke="rgba(0,0,0,0.25)" stroke-width="2"/>
      <line x1="35" y1="20" x2="38" y2="44" stroke="rgba(0,0,0,0.25)" stroke-width="2"/>
    </svg>`;
  }
  if (opt.style === 'shorts') {
    return `<svg width="46" height="46" viewBox="0 0 60 60">
      <path d="M18 14 L42 14 L45 34 L32 34 L30 25 L28 34 L15 34 Z" fill="${opt.color}" stroke="#2C3E50" stroke-width="2.5" stroke-linejoin="round"/>
      <rect x="18" y="14" width="24" height="5" fill="rgba(255,255,255,0.25)" stroke="#2C3E50" stroke-width="2"/>
    </svg>`;
  }
  return `<svg width="46" height="46" viewBox="0 0 60 60">
    <path d="M18 14 L42 14 L44 48 L33 48 L30 27 L27 48 L16 48 Z" fill="${opt.color}" stroke="#2C3E50" stroke-width="2.5" stroke-linejoin="round"/>
    <rect x="18" y="14" width="24" height="5" fill="rgba(255,255,255,0.25)" stroke="#2C3E50" stroke-width="2"/>
  </svg>`;
}

export function renderFashionItemPreviewMini(item: {
  sub?: string;
  shirtColor?: string;
  shirtPattern?: string;
  pantsColor?: string;
  pantsStyle?: string;
  icon?: string;
}): string {
  if (item.sub === 'set' && item.shirtColor && item.shirtPattern && item.pantsColor && item.pantsStyle) {
    return `
      <div style="display:flex; align-items:center; gap:2px; background:#F8F9F9; border:1.5px solid #D5D8DC; border-radius:8px; padding:3px 5px; flex-shrink:0;">
        ${renderShirtIconSVG({ color: item.shirtColor, pattern: item.shirtPattern }).replace('width="46" height="46"', 'width="36" height="36"')}
        ${renderPantsIconSVG({ color: item.pantsColor, style: item.pantsStyle }).replace('width="46" height="46"', 'width="36" height="36"')}
      </div>
    `;
  }
  if (item.sub === 'shirt' && item.shirtColor && item.shirtPattern) {
    return `
      <div style="width:50px; height:50px; display:flex; align-items:center; justify-content:center; background:#F8F9F9; border:1.5px solid #D5D8DC; border-radius:8px; flex-shrink:0;">
        ${renderShirtIconSVG({ color: item.shirtColor, pattern: item.shirtPattern }).replace('width="46" height="46"', 'width="42" height="42"')}
      </div>
    `;
  }
  if (item.sub === 'pants' && item.pantsColor && item.pantsStyle) {
    return `
      <div style="width:50px; height:50px; display:flex; align-items:center; justify-content:center; background:#F8F9F9; border:1.5px solid #D5D8DC; border-radius:8px; flex-shrink:0;">
        ${renderPantsIconSVG({ color: item.pantsColor, style: item.pantsStyle }).replace('width="46" height="46"', 'width="42" height="42"')}
      </div>
    `;
  }
  return `
    <div style="width:48px; height:48px; display:flex; align-items:center; justify-content:center; font-size:30px; background:#F8F9F9; border:1.5px solid #D5D8DC; border-radius:8px; flex-shrink:0;">
      ${item.icon || '🎁'}
    </div>
  `;
}

export function renderItemIllustrationSVG(
  itemId: string,
  size: number,
  findCatalogItem: (id: string) => any
): string {
  if (itemId === 'd_pc') {
    return `<svg width="${size}" height="${size}" viewBox="0 0 64 64">
      <defs>
        <linearGradient id="pc_oak" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#D99B58"/><stop offset="100%" stop-color="#B47B48"/></linearGradient>
        <linearGradient id="pc_scr" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#38BDF8"/><stop offset="100%" stop-color="#0284C7"/></linearGradient>
      </defs>
      <ellipse cx="32" cy="59" rx="24" ry="3.5" fill="#0F172A" opacity="0.18"/>
      <rect x="9" y="40" width="4" height="17" rx="1" fill="#1E293B"/>
      <rect x="51" y="40" width="4" height="17" rx="1" fill="#1E293B"/>
      <rect x="6" y="36" width="52" height="5.5" rx="2" fill="url(#pc_oak)" stroke="#1E293B" stroke-width="1.8"/>
      <rect x="13" y="34" width="26" height="2" rx="1" fill="#0F172A"/>
      <rect x="23" y="29" width="6" height="7" fill="#475569" stroke="#1E293B" stroke-width="1.3"/>
      <rect x="20" y="34" width="12" height="2.5" rx="1" fill="#334155"/>
      <rect x="12" y="10" width="28" height="19" rx="2.5" fill="#0F172A" stroke="#1E293B" stroke-width="1.8"/>
      <rect x="14.5" y="12.5" width="23" height="14" rx="1" fill="url(#pc_scr)"/>
      <rect x="16" y="14" width="12" height="8" rx="1" fill="#E0F2FE" opacity="0.85"/>
      <rect x="30" y="14" width="6" height="10" rx="1" fill="#FACC15" opacity="0.9"/>
      <circle cx="26" cy="10" r="1.4" fill="#38BDF8"/>
      <rect x="44" y="17" width="11" height="19" rx="2" fill="#1E293B" stroke="#0F172A" stroke-width="1.6"/>
      <line x1="45.5" y1="19" x2="45.5" y2="34" stroke="#22D3EE" stroke-width="1.8" stroke-linecap="round"/>
      <circle cx="50.5" cy="23" r="2.6" fill="none" stroke="#A855F7" stroke-width="1.6"/>
      <circle cx="50.5" cy="30" r="2.6" fill="none" stroke="#22D3EE" stroke-width="1.6"/>
      <rect x="17" y="33" width="16" height="3" rx="1" fill="#F8FAFC" stroke="#1E293B" stroke-width="1.1"/>
      <ellipse cx="37" cy="34.5" rx="2.3" ry="1.5" fill="#1E293B" stroke="#38BDF8" stroke-width="0.8"/>
      <path d="M23 41 Q23 39 32 39 Q41 39 41 41 L40 53 L24 53 Z" fill="#EF4444" stroke="#1E293B" stroke-width="1.7"/>
      <rect x="27" y="40" width="10" height="4" rx="1.5" fill="#0F172A"/>
      <line x1="32" y1="53" x2="32" y2="57" stroke="#1E293B" stroke-width="2.2"/>
      <line x1="25" y1="57" x2="39" y2="57" stroke="#1E293B" stroke-width="2.2" stroke-linecap="round"/>
    </svg>`;
  }
  if (itemId === 'd_plant') {
    return `<svg width="${size}" height="${size}" viewBox="0 0 64 64">
      <defs>
        <linearGradient id="pl_pot" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#FFFFFF"/><stop offset="100%" stop-color="#CBD5E1"/></linearGradient>
        <linearGradient id="pl_leaf" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#4ADE80"/><stop offset="100%" stop-color="#15803D"/></linearGradient>
      </defs>
      <ellipse cx="32" cy="58" rx="15" ry="3.2" fill="#0F172A" opacity="0.18"/>
      <path d="M32 38 Q32 27 32 18 M32 38 Q22 31 16 26 M32 38 Q42 31 48 26" fill="none" stroke="#15803D" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M32 8 C40 10 42 22 36 27 L39 20 L34 23 L32 29 L30 23 L25 20 L28 27 C22 22 24 10 32 8 Z" fill="url(#pl_leaf)" stroke="#1E293B" stroke-width="1.7" stroke-linejoin="round"/>
      <ellipse cx="17" cy="25" rx="10" ry="7.5" transform="rotate(-28 17 25)" fill="#22C55E" stroke="#1E293B" stroke-width="1.7"/>
      <path d="M12 22 L17 25 M13 27 L18 26" stroke="#15803D" stroke-width="1.3" stroke-linecap="round"/>
      <ellipse cx="47" cy="25" rx="10" ry="7.5" transform="rotate(28 47 25)" fill="#16A34A" stroke="#1E293B" stroke-width="1.7"/>
      <path d="M52 22 L47 25 M51 27 L46 26" stroke="#14532D" stroke-width="1.3" stroke-linecap="round"/>
      <rect x="20" y="54" width="24" height="3.5" rx="1.5" fill="#94A3B8" stroke="#1E293B" stroke-width="1.4"/>
      <polygon points="21,37 43,37 39.5,54 24.5,54" fill="url(#pl_pot)" stroke="#1E293B" stroke-width="1.9"/>
      <rect x="19" y="35" width="26" height="4" rx="2" fill="#F8FAFC" stroke="#1E293B" stroke-width="1.6"/>
    </svg>`;
  }
  if (itemId === 'd_bookshelf') {
    return `<svg width="${size}" height="${size}" viewBox="0 0 64 64">
      <ellipse cx="32" cy="58" rx="19" ry="3" fill="#0F172A" opacity="0.18"/>
      <rect x="12" y="8" width="40" height="48" rx="3" fill="#78350F" stroke="#1E293B" stroke-width="2"/>
      <rect x="10" y="6" width="44" height="4" rx="1.5" fill="#92400E" stroke="#1E293B" stroke-width="1.6"/>
      <rect x="16" y="12" width="32" height="12" fill="#FEF3C7"/>
      <rect x="16" y="27" width="32" height="12" fill="#FEF3C7"/>
      <rect x="16" y="42" width="32" height="11" fill="#FEF3C7"/>
      <rect x="18" y="14" width="5" height="10" rx="1" fill="#EF4444" stroke="#1E293B" stroke-width="1"/>
      <rect x="24" y="15" width="5" height="9" rx="1" fill="#38BDF8" stroke="#1E293B" stroke-width="1"/>
      <rect x="30" y="13" width="5" height="11" rx="1" fill="#F59E0B" stroke="#1E293B" stroke-width="1"/>
      <rect x="36" y="15" width="5" height="9" rx="1" fill="#22C55E" stroke="#1E293B" stroke-width="1"/>
      <rect x="18" y="29" width="6" height="10" rx="1" fill="#A855F7" stroke="#1E293B" stroke-width="1"/>
      <rect x="25" y="30" width="5" height="9" rx="1" fill="#EC4899" stroke="#1E293B" stroke-width="1"/>
      <rect x="33" y="29" width="5" height="10" rx="1" transform="rotate(14 35 34)" fill="#0EA5E9" stroke="#1E293B" stroke-width="1"/>
      <rect x="18" y="44" width="5" height="9" rx="1" fill="#22C55E" stroke="#1E293B" stroke-width="1"/>
      <rect x="24" y="43" width="6" height="10" rx="1" fill="#EF4444" stroke="#1E293B" stroke-width="1"/>
      <circle cx="40" cy="48" r="4.2" fill="#38BDF8" stroke="#1E293B" stroke-width="1.2"/>
    </svg>`;
  }
  if (itemId === 'd_bear') {
    return `<svg width="${size}" height="${size}" viewBox="0 0 64 64">
      <defs>
        <radialGradient id="br_fur" cx="40%" cy="35%" r="65%"><stop offset="0%" stop-color="#E59A4C"/><stop offset="100%" stop-color="#B46522"/></radialGradient>
      </defs>
      <ellipse cx="32" cy="57" rx="18" ry="3.5" fill="#0F172A" opacity="0.18"/>
      <circle cx="20" cy="14" r="6.5" fill="#B46522" stroke="#1E293B" stroke-width="1.8"/>
      <circle cx="20" cy="14" r="3.3" fill="#F9A8D4"/>
      <circle cx="44" cy="14" r="6.5" fill="#B46522" stroke="#1E293B" stroke-width="1.8"/>
      <circle cx="44" cy="14" r="3.3" fill="#F9A8D4"/>
      <ellipse cx="17" cy="36" rx="5.5" ry="7.5" transform="rotate(28 17 36)" fill="url(#br_fur)" stroke="#1E293B" stroke-width="1.8"/>
      <ellipse cx="47" cy="36" rx="5.5" ry="7.5" transform="rotate(-28 47 36)" fill="url(#br_fur)" stroke="#1E293B" stroke-width="1.8"/>
      <ellipse cx="32" cy="41" rx="14" ry="13.5" fill="url(#br_fur)" stroke="#1E293B" stroke-width="2"/>
      <ellipse cx="32" cy="42" rx="8.5" ry="8.5" fill="#FEF3C7"/>
      <circle cx="22" cy="50" r="6" fill="#C97A34" stroke="#1E293B" stroke-width="1.8"/>
      <circle cx="22" cy="50" r="3.2" fill="#FEF3C7"/>
      <circle cx="42" cy="50" r="6" fill="#C97A34" stroke="#1E293B" stroke-width="1.8"/>
      <circle cx="42" cy="50" r="3.2" fill="#FEF3C7"/>
      <circle cx="32" cy="23" r="12.5" fill="url(#br_fur)" stroke="#1E293B" stroke-width="2"/>
      <ellipse cx="32" cy="26.5" rx="5.5" ry="4" fill="#FEF3C7"/>
      <circle cx="27.2" cy="21" r="2.1" fill="#0F172A"/><circle cx="26.6" cy="20.3" r="0.7" fill="#FFF"/>
      <circle cx="36.8" cy="21" r="2.1" fill="#0F172A"/><circle cx="36.2" cy="20.3" r="0.7" fill="#FFF"/>
      <ellipse cx="32" cy="25" rx="2.4" ry="1.7" fill="#0F172A"/>
      <polygon points="32,33 25,30 25,36" fill="#E11D48" stroke="#1E293B" stroke-width="1.1"/>
      <polygon points="32,33 39,30 39,36" fill="#E11D48" stroke="#1E293B" stroke-width="1.1"/>
      <circle cx="32" cy="33" r="2" fill="#F43F5E" stroke="#1E293B" stroke-width="1"/>
    </svg>`;
  }
  if (itemId === 'd_guitar') {
    return `<svg width="${size}" height="${size}" viewBox="0 0 64 64">
      <defs>
        <linearGradient id="gt_wood" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#F59E0B"/><stop offset="60%" stop-color="#D97706"/><stop offset="100%" stop-color="#92400E"/></linearGradient>
      </defs>
      <ellipse cx="32" cy="58" rx="16" ry="3" fill="#0F172A" opacity="0.18"/>
      <path d="M22 57 L27 38 M42 57 L37 38 M23 52 L41 52" stroke="#334155" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M32 26 C26 26 23 30 25 35 C26 37 23 39 20 43 C17 49 21 55 32 55 C43 55 47 49 44 43 C41 39 38 37 39 35 C41 30 38 26 32 26 Z" fill="url(#gt_wood)" stroke="#FEF3C7" stroke-width="1.8"/>
      <path d="M32 26 C26 26 23 30 25 35 C26 37 23 39 20 43 C17 49 21 55 32 55 C43 55 47 49 44 43 C41 39 38 37 39 35 C41 30 38 26 32 26 Z" fill="none" stroke="#1E293B" stroke-width="1.6"/>
      <circle cx="32" cy="37.5" r="4.6" fill="#0F172A" stroke="#FACC15" stroke-width="1.4"/>
      <rect x="27" y="45.5" width="10" height="2.6" rx="1" fill="#451A03"/>
      <rect x="29.5" y="10" width="5" height="21" fill="#451A03" stroke="#1E293B" stroke-width="1.5"/>
      <rect x="27.5" y="5" width="9" height="6" rx="1.5" fill="#78350F" stroke="#1E293B" stroke-width="1.5"/>
      <line x1="30.6" y1="10" x2="30.6" y2="46" stroke="#E2E8F0" stroke-width="0.9"/>
      <line x1="32" y1="10" x2="32" y2="46" stroke="#E2E8F0" stroke-width="0.9"/>
      <line x1="33.4" y1="10" x2="33.4" y2="46" stroke="#E2E8F0" stroke-width="0.9"/>
    </svg>`;
  }
  if (itemId === 'd_aquarium') {
    return `<svg width="${size}" height="${size}" viewBox="0 0 64 64">
      <defs>
        <linearGradient id="aq_water" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#BAE6FD"/><stop offset="100%" stop-color="#38BDF8"/></linearGradient>
      </defs>
      <ellipse cx="32" cy="58" rx="22" ry="3" fill="#0F172A" opacity="0.18"/>
      <rect x="11" y="38" width="42" height="17" rx="2" fill="#78350F" stroke="#1E293B" stroke-width="1.8"/>
      <rect x="14" y="41" width="17" height="12" rx="1" fill="#92400E" stroke="#451A03" stroke-width="1"/>
      <rect x="33" y="41" width="17" height="12" rx="1" fill="#92400E" stroke="#451A03" stroke-width="1"/>
      <circle cx="29" cy="47" r="1.2" fill="#FACC15"/><circle cx="35" cy="47" r="1.2" fill="#FACC15"/>
      <rect x="12" y="13" width="40" height="25" rx="2" fill="url(#aq_water)" stroke="#1E293B" stroke-width="2"/>
      <rect x="11" y="10" width="42" height="4.5" rx="1.5" fill="#0F172A"/>
      <rect x="13" y="34" width="38" height="3" fill="#FDE68A"/>
      <path d="M18 35 Q20 26 17 20 M45 35 Q43 25 46 19" stroke="#16A34A" stroke-width="2.8" fill="none" stroke-linecap="round"/>
      <ellipse cx="29" cy="25" rx="6.5" ry="3.8" fill="#FB923C" stroke="#1E293B" stroke-width="1.3"/>
      <polygon points="35,25 40,21.5 40,28.5" fill="#FB923C" stroke="#1E293B" stroke-width="1.3"/>
      <circle cx="25" cy="24" r="1" fill="#0F172A"/>
      <ellipse cx="39" cy="30" rx="4.5" ry="2.6" fill="#FACC15" stroke="#1E293B" stroke-width="1.1"/>
      <circle cx="21" cy="18" r="1.6" fill="#FFF" opacity="0.85"/><circle cx="24" cy="21" r="1.2" fill="#FFF" opacity="0.85"/>
    </svg>`;
  }
  if (itemId === 'tv_30min') {
    return `<svg width="${size}" height="${size}" viewBox="0 0 64 64">
      <rect x="22" y="49" width="20" height="5" rx="2" fill="#334155" stroke="#1E293B" stroke-width="1.6"/>
      <rect x="9" y="14" width="46" height="33" rx="6" fill="#FFFFFF" stroke="#1E293B" stroke-width="2.1"/>
      <rect x="15" y="20" width="34" height="21" rx="6" fill="#EF4444" stroke="#991B1B" stroke-width="1.5"/>
      <polygon points="28,25 28,36 39,30.5" fill="#FFFFFF"/>
    </svg>`;
  }
  if (itemId === 'v_icecream') {
    return `<svg width="${size}" height="${size}" viewBox="0 0 64 64">
      <polygon points="23,32 41,32 32,57" fill="#D97706" stroke="#1E293B" stroke-width="2"/>
      <circle cx="32" cy="27" r="11" fill="#F9A8D4" stroke="#1E293B" stroke-width="1.8"/>
      <circle cx="32" cy="16" r="8.5" fill="#FEF08A" stroke="#1E293B" stroke-width="1.8"/>
      <circle cx="32" cy="8" r="3.5" fill="#EF4444" stroke="#1E293B" stroke-width="1.3"/>
    </svg>`;
  }
  if (itemId === 'v_movie') {
    return `<svg width="${size}" height="${size}" viewBox="0 0 64 64">
      <rect x="12" y="24" width="40" height="28" rx="4" fill="#1E293B" stroke="#0F172A" stroke-width="2"/>
      <polygon points="12,24 52,16 50,10 10,18" fill="#F8FAFC" stroke="#0F172A" stroke-width="1.8"/>
      <rect x="20" y="32" width="24" height="14" rx="2" fill="#FACC15" stroke="#1E293B" stroke-width="1.4"/>
    </svg>`;
  }
  if (itemId === 'v_game') {
    return `<svg width="${size}" height="${size}" viewBox="0 0 64 64">
      <path d="M16 24 L48 24 Q55 34 52 46 Q46 50 41 41 L23 41 Q18 50 12 46 Q9 34 16 24 Z" fill="#334155" stroke="#0F172A" stroke-width="2.1"/>
      <rect x="18" y="30" width="8" height="3" fill="#F8FAFC"/><rect x="20.5" y="27.5" width="3" height="8" fill="#F8FAFC"/>
      <circle cx="43" cy="29" r="2.2" fill="#22C55E"/><circle cx="47" cy="33" r="2.2" fill="#EF4444"/><circle cx="39" cy="33" r="2.2" fill="#38BDF8"/><circle cx="43" cy="37" r="2.2" fill="#FACC15"/>
    </svg>`;
  }
  if (itemId === 'v_dish') {
    return `<svg width="${size}" height="${size}" viewBox="0 0 64 64">
      <ellipse cx="32" cy="46" rx="22" ry="6" fill="#F8FAFC" stroke="#1E293B" stroke-width="2"/>
      <path d="M14 43 A18 18 0 0 1 50 43 Z" fill="#CBD5E1" stroke="#1E293B" stroke-width="2"/>
      <circle cx="32" cy="22" r="4" fill="#FACC15" stroke="#1E293B" stroke-width="1.6"/>
    </svg>`;
  }
  if (itemId === 'food_biscuit') {
    return `<svg width="${size}" height="${size}" viewBox="0 0 64 64">
      <circle cx="16" cy="26" r="6" fill="#D97706" stroke="#1E293B" stroke-width="1.8"/>
      <circle cx="16" cy="38" r="6" fill="#D97706" stroke="#1E293B" stroke-width="1.8"/>
      <circle cx="48" cy="26" r="6" fill="#D97706" stroke="#1E293B" stroke-width="1.8"/>
      <circle cx="48" cy="38" r="6" fill="#D97706" stroke="#1E293B" stroke-width="1.8"/>
      <rect x="16" y="27" width="32" height="10" fill="#F59E0B" stroke="#1E293B" stroke-width="1.8"/>
    </svg>`;
  }
  if (itemId === 'food_berry') {
    return `<svg width="${size}" height="${size}" viewBox="0 0 64 64">
      <path d="M32 19 Q46 18 46 32 Q45 49 32 54 Q19 49 18 32 Q18 18 32 19 Z" fill="#E11D48" stroke="#1E293B" stroke-width="2"/>
      <polygon points="22,19 28,11 32,17 36,11 42,19" fill="#16A34A" stroke="#1E293B" stroke-width="1.6"/>
      <circle cx="27" cy="30" r="1.4" fill="#FDE047"/><circle cx="36" cy="32" r="1.4" fill="#FDE047"/><circle cx="31" cy="40" r="1.4" fill="#FDE047"/>
    </svg>`;
  }
  if (itemId === 'food_star_candy') {
    return `<svg width="${size}" height="${size}" viewBox="0 0 64 64">
      <polygon points="32,10 38,24 53,26 42,36 45,51 32,44 19,51 22,36 11,26 26,24" fill="#FACC15" stroke="#1E293B" stroke-width="2" stroke-linejoin="round"/>
      <circle cx="32" cy="32" r="5" fill="#FEF08A"/>
    </svg>`;
  }
  if (itemId === 'pacc_bow') {
    return `<svg width="${size}" height="${size}" viewBox="0 0 64 64">
      <polygon points="32,32 12,18 12,46" fill="#EC4899" stroke="#1E293B" stroke-width="2"/>
      <polygon points="32,32 52,18 52,46" fill="#EC4899" stroke="#1E293B" stroke-width="2"/>
      <circle cx="32" cy="32" r="6" fill="#F472B6" stroke="#1E293B" stroke-width="2"/>
    </svg>`;
  }
  if (itemId === 'pacc_bell') {
    return `<svg width="${size}" height="${size}" viewBox="0 0 64 64">
      <ellipse cx="32" cy="22" rx="18" ry="6" fill="none" stroke="#EF4444" stroke-width="6"/>
      <circle cx="32" cy="38" r="11" fill="#FACC15" stroke="#1E293B" stroke-width="2"/>
      <circle cx="32" cy="42" r="3" fill="#78350F"/>
    </svg>`;
  }
  if (itemId === 'pacc_glasses') {
    return `<svg width="${size}" height="${size}" viewBox="0 0 64 64">
      <rect x="10" y="24" width="18" height="14" rx="4" fill="#0F172A" stroke="#FACC15" stroke-width="2"/>
      <rect x="36" y="24" width="18" height="14" rx="4" fill="#0F172A" stroke="#FACC15" stroke-width="2"/>
      <line x1="28" y1="30" x2="36" y2="30" stroke="#FACC15" stroke-width="3"/>
    </svg>`;
  }
  if (itemId === 'pacc_scarf') {
    return `<svg width="${size}" height="${size}" viewBox="0 0 64 64">
      <rect x="14" y="20" width="36" height="14" rx="7" fill="#EF4444" stroke="#1E293B" stroke-width="2"/>
      <rect x="34" y="28" width="11" height="24" rx="4" fill="#DC2626" stroke="#1E293B" stroke-width="2"/>
    </svg>`;
  }
  if (itemId === 'pacc_wizard') {
    return `<svg width="${size}" height="${size}" viewBox="0 0 64 64">
      <polygon points="32,10 18,44 46,44" fill="#4F46E5" stroke="#1E293B" stroke-width="2"/>
      <ellipse cx="32" cy="46" rx="22" ry="6" fill="#4338CA" stroke="#1E293B" stroke-width="2"/>
      <polygon points="32,23 34,28 39,28 35,31 36,36 32,33 28,36 29,31 25,28 30,28" fill="#FACC15"/>
    </svg>`;
  }
  if (itemId === 'pacc_crown') {
    return `<svg width="${size}" height="${size}" viewBox="0 0 64 64">
      <polygon points="12,46 16,20 26,32 32,16 38,32 48,20 52,46" fill="#FACC15" stroke="#1E293B" stroke-width="2.2" stroke-linejoin="round"/>
      <circle cx="32" cy="36" r="3.5" fill="#EF4444"/>
    </svg>`;
  }

  const item = findCatalogItem(itemId);
  if (item && item.svgMarkup) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" style="overflow:visible;">${item.svgMarkup}</svg>`;
  }
  return `<div style="font-size:${Math.round(size * 0.65)}px; line-height:${size}px; text-align:center;">${item ? item.icon : '📦'}</div>`;
}
