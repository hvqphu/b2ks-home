import React from 'react';

interface Props {
  visualId?: string;
}

export const BibleVisualSvg: React.FC<Props> = ({ visualId }) => {
  if (!visualId) return null;

  const renderGraphic = () => {
    switch (visualId) {
      case 'noah_ark':
        return (
          <svg viewBox="0 0 280 150" className="w-full max-w-[280px] h-[145px]">
            <rect width="280" height="150" rx="14" fill="#E0F2FE" />
            <circle cx="235" cy="30" r="14" fill="#FDE047" />
            <path d="M22 42 Q35 28 52 34 Q68 25 82 38 Q92 40 90 50 L24 50 Z" fill="#FFFFFF" opacity="0.9" />
            <path d="M52 94 L228 94 L208 122 L72 122 Z" fill="#92400E" stroke="#78350F" strokeWidth="2.5" />
            <rect x="85" y="64" width="110" height="30" rx="4" fill="#B45309" stroke="#78350F" strokeWidth="2" />
            <path d="M78 64 L140 44 L202 64 Z" fill="#78350F" />
            <rect x="130" y="72" width="20" height="14" rx="2" fill="#FEF3C7" stroke="#78350F" strokeWidth="1.5" />
            <rect x="100" y="74" width="14" height="12" rx="2" fill="#FDE68A" />
            <rect x="166" y="74" width="14" height="12" rx="2" fill="#FDE68A" />
            <path d="M0 120 Q35 110 70 120 T140 120 T210 120 T280 120 L280 150 L0 150 Z" fill="#0284C7" />
            <path d="M0 132 Q45 123 90 132 T180 132 T280 132 L280 150 L0 150 Z" fill="#0369A1" opacity="0.7" />
          </svg>
        );

      case 'dove_olive':
        return (
          <svg viewBox="0 0 280 150" className="w-full max-w-[280px] h-[145px]">
            <rect width="280" height="150" rx="14" fill="#EFF6FF" />
            <circle cx="140" cy="75" r="54" fill="#DBEAFE" />
            <path d="M105 92 C115 62 150 56 172 68 C184 55 198 46 212 44 C205 64 195 76 184 84 C194 94 202 104 204 114 C178 112 158 106 142 98 C124 106 108 104 105 92 Z" fill="#FFFFFF" stroke="#64748B" strokeWidth="2.5" />
            <path d="M106 86 C86 70 72 44 62 34 C82 38 104 52 122 72 Z" fill="#F8FAFC" stroke="#64748B" strokeWidth="2.2" />
            <circle cx="164" cy="73" r="3" fill="#0F172A" />
            <polygon points="172,73 185,77 172,80" fill="#F59E0B" />
            <path d="M182 78 Q208 82 226 68" fill="none" stroke="#15803D" strokeWidth="2.5" strokeLinecap="round" />
            <ellipse cx="198" cy="73" rx="7" ry="3.5" transform="rotate(-28 198 73)" fill="#22C55E" />
            <ellipse cx="212" cy="77" rx="7" ry="3.5" transform="rotate(20 212 77)" fill="#16A34A" />
            <ellipse cx="223" cy="66" rx="6" ry="3" transform="rotate(-15 223 66)" fill="#4ADE80" />
          </svg>
        );

      case 'rainbow_covenant':
        return (
          <svg viewBox="0 0 280 150" className="w-full max-w-[280px] h-[145px]">
            <rect width="280" height="150" rx="14" fill="#F0F9FF" />
            <path d="M40 122 A100 92 0 0 1 240 122" fill="none" stroke="#EF4444" strokeWidth="7" />
            <path d="M47 122 A93 85 0 0 1 233 122" fill="none" stroke="#F97316" strokeWidth="7" />
            <path d="M54 122 A86 78 0 0 1 226 122" fill="none" stroke="#EAB308" strokeWidth="7" />
            <path d="M61 122 A79 71 0 0 1 219 122" fill="none" stroke="#22C55E" strokeWidth="7" />
            <path d="M68 122 A72 64 0 0 1 212 122" fill="none" stroke="#3B82F6" strokeWidth="7" />
            <path d="M75 122 A65 57 0 0 1 205 122" fill="none" stroke="#8B5CF6" strokeWidth="7" />
            <ellipse cx="52" cy="122" rx="28" ry="14" fill="#FFFFFF" />
            <ellipse cx="228" cy="122" rx="28" ry="14" fill="#FFFFFF" />
            <rect y="128" width="280" height="22" fill="#86EFAC" />
          </svg>
        );

      case 'coat_colors':
        return (
          <svg viewBox="0 0 280 150" className="w-full max-w-[280px] h-[145px]">
            <rect width="280" height="150" rx="14" fill="#FEFCE8" />
            <g stroke="#334155" strokeWidth="2">
              <path d="M108 24 L124 24 L140 38 L156 24 L172 24 L204 48 L190 70 L176 60 L176 130 L104 130 L104 60 L90 70 L76 48 Z" fill="#EF4444" />
              <rect x="105" y="48" width="70" height="16" fill="#F59E0B" stroke="none" />
              <rect x="105" y="64" width="70" height="16" fill="#22C55E" stroke="none" />
              <rect x="105" y="80" width="70" height="16" fill="#3B82F6" stroke="none" />
              <rect x="105" y="96" width="70" height="16" fill="#A855F7" stroke="none" />
              <rect x="105" y="112" width="70" height="17" fill="#EC4899" stroke="none" />
              <line x1="140" y1="38" x2="140" y2="130" stroke="#78350F" strokeWidth="2" />
            </g>
          </svg>
        );

      case 'burning_bush':
        return (
          <svg viewBox="0 0 280 150" className="w-full max-w-[280px] h-[145px]">
            <rect width="280" height="150" rx="14" fill="#FFF7ED" />
            <rect y="118" width="280" height="32" fill="#D97706" opacity="0.3" />
            <path d="M135 124 L135 90 M135 104 L118 88 M135 100 L154 86" stroke="#78350F" strokeWidth="5" strokeLinecap="round" />
            <circle cx="115" cy="86" r="24" fill="#16A34A" />
            <circle cx="164" cy="86" r="24" fill="#15803D" />
            <circle cx="140" cy="68" r="28" fill="#22C55E" />
            <path d="M140 18 C154 38 164 52 154 68 C148 76 132 76 126 68 C116 52 126 38 140 18 Z" fill="#F97316" />
            <path d="M140 30 C148 44 152 54 146 64 C142 69 138 69 134 64 C128 54 132 44 140 30 Z" fill="#FDE047" />
            <path d="M112 42 C118 54 120 62 114 70 C106 66 106 54 112 42 Z" fill="#FB923C" />
            <path d="M168 42 C174 54 174 66 166 70 C160 62 162 54 168 42 Z" fill="#FB923C" />
          </svg>
        );

      case 'red_sea':
        return (
          <svg viewBox="0 0 280 150" className="w-full max-w-[280px] h-[145px]">
            <rect width="280" height="150" rx="14" fill="#E0F2FE" />
            <path d="M0 32 Q65 22 102 44 L96 136 L0 136 Z" fill="#0284C7" />
            <path d="M280 32 Q215 22 178 44 L184 136 L280 136 Z" fill="#0284C7" />
            <path d="M96 136 L108 44 L172 44 L184 136 Z" fill="#FDE68A" />
            <path d="M95 52 Q85 74 96 96 T96 132" fill="none" stroke="#BAE6FD" strokeWidth="4" />
            <path d="M185 52 Q195 74 184 96 T184 132" fill="none" stroke="#BAE6FD" strokeWidth="4" />
            <line x1="140" y1="62" x2="140" y2="122" stroke="#92400E" strokeWidth="4" strokeLinecap="round" />
            <path d="M118 118 Q140 110 162 118" fill="none" stroke="#B45309" strokeWidth="2.5" strokeDasharray="4 4" />
          </svg>
        );

      case 'stone_tablets':
        return (
          <svg viewBox="0 0 280 150" className="w-full max-w-[280px] h-[145px]">
            <rect width="280" height="150" rx="14" fill="#F1F5F9" />
            <path d="M62 46 A34 26 0 0 1 130 46 L130 126 L62 126 Z" fill="#94A3B8" stroke="#475569" strokeWidth="3" />
            <path d="M150 46 A34 26 0 0 1 218 46 L218 126 L150 126 Z" fill="#94A3B8" stroke="#475569" strokeWidth="3" />
            {[56, 70, 84, 98, 112].map((y, idx) => (
              <React.Fragment key={idx}>
                <line x1="76" y1={y} x2="116" y2={y} stroke="#1E293B" strokeWidth="3.5" strokeLinecap="round" />
                <line x1="164" y1={y} x2="204" y2={y} stroke="#1E293B" strokeWidth="3.5" strokeLinecap="round" />
              </React.Fragment>
            ))}
          </svg>
        );

      case 'jericho_trumpets':
        return (
          <svg viewBox="0 0 280 150" className="w-full max-w-[280px] h-[145px]">
            <rect width="280" height="150" rx="14" fill="#FEF3C7" />
            <rect x="34" y="72" width="212" height="58" fill="#D6D3D1" stroke="#78716C" strokeWidth="2.5" />
            {[34, 68, 102, 136, 170, 204].map((x) => (
              <rect key={x} x={x} y="60" width="22" height="14" fill="#A8A29E" stroke="#78716C" strokeWidth="2" />
            ))}
            <path d="M122 74 L132 94 L118 112 L134 128" fill="none" stroke="#57534E" strokeWidth="3" />
            <path d="M72 34 C90 42 108 38 122 22 L126 42 C108 46 88 46 72 38 Z" fill="#F59E0B" stroke="#92400E" strokeWidth="2" />
            <path d="M208 34 C190 42 172 38 158 22 L154 42 C172 46 192 46 208 38 Z" fill="#F59E0B" stroke="#92400E" strokeWidth="2" />
          </svg>
        );

      case 'sling_stones':
        return (
          <svg viewBox="0 0 280 150" className="w-full max-w-[280px] h-[145px]">
            <rect width="280" height="150" rx="14" fill="#ECFDF5" />
            <path d="M62 34 Q108 104 140 84 Q172 104 218 34" fill="none" stroke="#78350F" strokeWidth="4" strokeLinecap="round" />
            <ellipse cx="140" cy="84" rx="22" ry="12" fill="#92400E" stroke="#451A03" strokeWidth="2" />
            {[56, 98, 140, 182, 224].map((cx, i) => (
              <ellipse key={i} cx={cx} cy={124} rx="15" ry="10" fill="#94A3B8" stroke="#475569" strokeWidth="2" />
            ))}
          </svg>
        );

      case 'shepherd_staff':
        return (
          <svg viewBox="0 0 280 150" className="w-full max-w-[280px] h-[145px]">
            <rect width="280" height="150" rx="14" fill="#F0FDF4" />
            <rect y="112" width="280" height="38" fill="#86EFAC" />
            <path d="M188 124 L188 44 A20 20 0 0 1 228 44" fill="none" stroke="#78350F" strokeWidth="7" strokeLinecap="round" />
            <ellipse cx="105" cy="100" rx="34" ry="22" fill="#FFFFFF" stroke="#64748B" strokeWidth="2" />
            <circle cx="80" cy="88" r="14" fill="#FFFFFF" stroke="#64748B" strokeWidth="2" />
            <circle cx="72" cy="88" r="8" fill="#FDE68A" />
            <circle cx="71" cy="86" r="2" fill="#0F172A" />
            <line x1="88" y1="118" x2="88" y2="132" stroke="#334155" strokeWidth="4" strokeLinecap="round" />
            <line x1="120" y1="118" x2="120" y2="132" stroke="#334155" strokeWidth="4" strokeLinecap="round" />
          </svg>
        );

      case 'lion_den':
        return (
          <svg viewBox="0 0 280 150" className="w-full max-w-[280px] h-[145px]">
            <rect width="280" height="150" rx="14" fill="#FEF3C7" />
            <circle cx="140" cy="76" r="42" fill="#B45309" />
            <circle cx="110" cy="48" r="10" fill="#D97706" />
            <circle cx="170" cy="48" r="10" fill="#D97706" />
            <circle cx="140" cy="76" r="29" fill="#FBBF24" />
            <circle cx="128" cy="70" r="3.5" fill="#0F172A" />
            <circle cx="152" cy="70" r="3.5" fill="#0F172A" />
            <polygon points="140,86 133,78 147,78" fill="#78350F" />
            <path d="M132 92 Q140 98 148 92" fill="none" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        );

      case 'big_fish':
        return (
          <svg viewBox="0 0 280 150" className="w-full max-w-[280px] h-[145px]">
            <rect width="280" height="150" rx="14" fill="#DBEAFE" />
            <path d="M74 78 C98 42 184 42 208 78 C184 114 98 114 74 78 Z" fill="#0284C7" stroke="#0369A1" strokeWidth="2.5" />
            <polygon points="204,78 242,50 236,78 242,106" fill="#0369A1" />
            <circle cx="104" cy="68" r="5" fill="#FFFFFF" />
            <circle cx="104" cy="68" r="2.5" fill="#0F172A" />
            <path d="M130 48 Q144 26 154 48" fill="#0369A1" />
            <path d="M0 124 Q35 114 70 124 T140 124 T210 124 T280 124 L280 150 L0 150 Z" fill="#38BDF8" opacity="0.6" />
          </svg>
        );

      case 'star_manger':
        return (
          <svg viewBox="0 0 280 150" className="w-full max-w-[280px] h-[145px]">
            <rect width="280" height="150" rx="14" fill="#1E1B4B" />
            <polygon points="140,14 148,34 168,34 152,46 158,66 140,54 122,66 128,46 112,34 132,34" fill="#FDE047" />
            <path d="M88 94 L192 94 L178 122 L102 122 Z" fill="#D97706" stroke="#FDE68A" strokeWidth="2" />
            <line x1="106" y1="122" x2="94" y2="140" stroke="#B45309" strokeWidth="5" strokeLinecap="round" />
            <line x1="174" y1="122" x2="186" y2="140" stroke="#B45309" strokeWidth="5" strokeLinecap="round" />
            <ellipse cx="140" cy="94" rx="34" ry="12" fill="#FEF08A" />
            <circle cx="122" cy="90" r="10" fill="#FDE68A" />
            <rect x="130" y="84" width="34" height="18" rx="9" fill="#FFFFFF" />
          </svg>
        );

      case 'water_jars':
        return (
          <svg viewBox="0 0 280 150" className="w-full max-w-[280px] h-[145px]">
            <rect width="280" height="150" rx="14" fill="#FFFBEB" />
            {[62, 140, 218].map((cx) => (
              <g key={cx}>
                <rect x={cx - 12} y="32" width="24" height="12" rx="3" fill="#B45309" />
                <ellipse cx={cx} cy="84" rx="26" ry="38" fill="#D97706" stroke="#78350F" strokeWidth="2" />
                <path d={`M${cx - 22} 76 Q${cx} 84 ${cx + 22} 76`} fill="none" stroke="#991B1B" strokeWidth="4" />
              </g>
            ))}
          </svg>
        );

      case 'loaves_fish':
        return (
          <svg viewBox="0 0 280 150" className="w-full max-w-[280px] h-[145px]">
            <rect width="280" height="150" rx="14" fill="#ECFDF5" />
            <ellipse cx="140" cy="110" rx="88" ry="20" fill="#D97706" stroke="#78350F" strokeWidth="2.5" />
            {[95, 118, 140, 162, 185].map((cx, i) => (
              <ellipse key={i} cx={cx} cy={92 - (i % 2) * 8} rx="18" ry="11" fill="#FBBF24" stroke="#92400E" strokeWidth="2" />
            ))}
            {[112, 168].map((cx, i) => (
              <g key={i}>
                <ellipse cx={cx} cy="62" rx="20" ry="9" fill="#38BDF8" stroke="#0369A1" strokeWidth="2" />
                <polygon points={`${cx + 18},62 ${cx + 30},53 ${cx + 30},71`} fill="#0284C7" />
              </g>
            ))}
          </svg>
        );

      case 'mustard_tree':
        return (
          <svg viewBox="0 0 280 150" className="w-full max-w-[280px] h-[145px]">
            <rect width="280" height="150" rx="14" fill="#F0FDF4" />
            <circle cx="54" cy="116" r="5" fill="#CA8A04" />
            <path d="M76 116 L104 116" stroke="#64748B" strokeWidth="2.5" markerEnd="url(#arrow)" />
            <rect x="172" y="80" width="16" height="54" fill="#78350F" />
            <circle cx="180" cy="54" r="34" fill="#16A34A" />
            <circle cx="150" cy="70" r="22" fill="#22C55E" />
            <circle cx="210" cy="70" r="22" fill="#15803D" />
          </svg>
        );

      case 'pearl_treasure':
        return (
          <svg viewBox="0 0 280 150" className="w-full max-w-[280px] h-[145px]">
            <rect width="280" height="150" rx="14" fill="#EFF6FF" />
            <path d="M68 104 C68 58 212 58 212 104 Z" fill="#FBCFE8" stroke="#BE185D" strokeWidth="2.5" />
            <ellipse cx="140" cy="108" rx="76" ry="20" fill="#F9A8D4" stroke="#BE185D" strokeWidth="2.5" />
            <circle cx="140" cy="94" r="22" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="2" />
            <circle cx="133" cy="87" r="6" fill="#F8FAFC" />
          </svg>
        );

      case 'empty_tomb':
        return (
          <svg viewBox="0 0 280 150" className="w-full max-w-[280px] h-[145px]">
            <rect width="280" height="150" rx="14" fill="#FEFCE8" />
            <circle cx="222" cy="36" r="22" fill="#FDE047" />
            <path d="M50 132 Q60 44 140 44 Q220 44 230 132 Z" fill="#94A3B8" stroke="#475569" strokeWidth="2.5" />
            <path d="M108 132 Q112 76 140 76 Q168 76 172 132 Z" fill="#1E293B" />
            <circle cx="192" cy="112" r="26" fill="#CBD5E1" stroke="#475569" strokeWidth="2.5" />
            <rect y="130" width="280" height="20" fill="#86EFAC" />
          </svg>
        );

      case 'oil_lamp':
        return (
          <svg viewBox="0 0 280 150" className="w-full max-w-[280px] h-[145px]">
            <rect width="280" height="150" rx="14" fill="#1E293B" />
            <path d="M84 96 C96 76 184 76 196 96 L180 120 L100 120 Z" fill="#D97706" stroke="#FDE68A" strokeWidth="2.5" />
            <path d="M78 86 Q60 98 86 112" fill="none" stroke="#F59E0B" strokeWidth="5" strokeLinecap="round" />
            <path d="M196 80 C206 54 214 44 202 28 C190 44 188 64 196 80 Z" fill="#FDE047" />
            <path d="M198 76 C202 60 206 52 200 42 C194 52 194 64 198 76 Z" fill="#F97316" />
          </svg>
        );

      case 'armor_shield':
        return (
          <svg viewBox="0 0 280 150" className="w-full max-w-[280px] h-[145px]">
            <rect width="280" height="150" rx="14" fill="#EEF2FF" />
            <path d="M140 20 L196 40 L188 94 C184 114 162 128 140 136 C118 128 96 114 92 94 L84 40 Z" fill="#3B82F6" stroke="#1E3A8A" strokeWidth="3" />
            <path d="M140 32 L182 48 L176 90 C172 106 156 118 140 124 C124 118 108 106 104 90 L98 48 Z" fill="#60A5FA" />
            <rect x="134" y="46" width="12" height="62" rx="3" fill="#FDE047" />
            <rect x="114" y="64" width="52" height="12" rx="3" fill="#FDE047" />
          </svg>
        );

      default:
        return null;
    }
  };

  return (
    <div className="my-2 flex justify-center">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 shadow-sm">
        {renderGraphic()}
      </div>
    </div>
  );
};
