import { BuildingShape, Member, RobotSkinId } from '../types/b2ks';
import { formatFamilyBrand } from './constants';
import {
  drawDetailedChibiOnContext,
  drawProtestantChurch2D,
  drawShopBuilding,
  drawStreetTownhouse,
  LightingInfo,
  ShopBuildingConfig,
} from './worldRenderer';

const SHOP_PREVIEW_PRESETS: Record<string, ShopBuildingConfig> = {
  supermarket: {
    buildingType: 'supermarket',
    title: '🏪 SIÊU THỊ GIA ĐÌNH B2KS',
    npcName: 'Thu Ngân Linh',
    npcHairStyle: 'long',
    npcHairColor: '#4E342E',
    npcShirtColor: '#E67E22',
    npcShirtPattern: 'collar',
    npcPantsColor: '#2C3E50',
    npcPantsStyle: 'skirt',
    npcOutfit: '',
  },
  cross_world: {
    buildingType: 'cross_world',
    title: '🌌 TRUNG TÂM XUYÊN THẾ GIỚI',
    npcName: 'Thủ Kho Orion',
    npcHairStyle: 'spiky',
    npcHairColor: '#4F46E5',
    npcShirtColor: '#D97706',
    npcShirtPattern: 'star',
    npcPantsColor: '#1E1B4B',
    npcPantsStyle: 'pants',
    npcOutfit: '👑',
  },
  pet_shop: {
    buildingType: 'pet_shop',
    title: '🐾 CỬA HÀNG THÚ CƯNG B2KS',
    npcName: 'Cô My Thú Cưng',
    npcHairStyle: 'ponytail',
    npcHairColor: '#D97706',
    npcShirtColor: '#EC4899',
    npcShirtPattern: 'heart',
    npcPantsColor: '#7C3AED',
    npcPantsStyle: 'skirt',
    npcOutfit: '🎀',
  },
  arcade: {
    buildingType: 'arcade',
    title: '🕹️ KHU VUI CHƠI ONLINE (1⭐)',
    npcName: 'Quản Trò Bin',
    npcHairStyle: 'spiky',
    npcHairColor: '#2C3E50',
    npcShirtColor: '#E74C3C',
    npcShirtPattern: 'star',
    npcPantsColor: '#2980B9',
    npcPantsStyle: 'shorts',
    npcOutfit: '🎮',
  },
  lab: {
    buildingType: 'lab',
    title: '🧪 PHÒNG THÍ NGHIỆM B2KS',
    npcName: 'Giáo Sư Neo',
    npcHairStyle: 'spiky',
    npcHairColor: '#38BDF8',
    npcShirtColor: '#0284C7',
    npcShirtPattern: 'star',
    npcPantsColor: '#1E293B',
    npcPantsStyle: 'pants',
    npcOutfit: '🥽',
  },
  flea_market: {
    buildingType: 'flea_market',
    title: '🎪 CHỢ TRỜI B2KS',
    npcName: 'Cô Tám Chợ Trời',
    npcHairStyle: 'pigtails',
    npcHairColor: '#92400E',
    npcShirtColor: '#F59E0B',
    npcShirtPattern: 'collar',
    npcPantsColor: '#78350F',
    npcPantsStyle: 'skirt',
    npcOutfit: '👒',
  },
  english: {
    buildingType: 'english',
    title: '🎓 TRUNG TÂM TIẾNG ANH B2KS',
    npcName: 'Cô Giáo Mai',
    npcHairStyle: 'long',
    npcHairColor: '#4E342E',
    npcShirtColor: '#16A085',
    npcShirtPattern: 'collar',
    npcPantsColor: '#2C3E50',
    npcPantsStyle: 'skirt',
    npcOutfit: '🎓',
  },
  fashion: {
    buildingType: 'fashion',
    title: '👗 CỬA HÀNG THỜI TRANG',
    npcName: 'Nhà Thiết Kế Vy',
    npcHairStyle: 'pigtails',
    npcHairColor: '#8E44AD',
    npcShirtColor: '#E91E63',
    npcShirtPattern: 'heart',
    npcPantsColor: '#8E44AD',
    npcPantsStyle: 'skirt',
    npcOutfit: '🎀',
  },
  salon: {
    buildingType: 'salon',
    title: '💇 SALON TÓC NGHỆ THUẬT',
    npcName: 'Stylist Tuấn Anh',
    npcHairStyle: 'spiky',
    npcHairColor: '#2980B9',
    npcShirtColor: '#8E44AD',
    npcShirtPattern: 'vest',
    npcPantsColor: '#2C3E50',
    npcPantsStyle: 'pants',
    npcOutfit: '',
  },
  zoo: {
    buildingType: 'zoo',
    title: '🦁 SỞ THÚ ẢO B2KS ZOO',
    npcName: 'Hướng Dẫn Viên Bi',
    npcHairStyle: 'short',
    npcHairColor: '#78350F',
    npcShirtColor: '#15803D',
    npcShirtPattern: 'collar',
    npcPantsColor: '#B45309',
    npcPantsStyle: 'shorts',
    npcOutfit: '🤠',
  },
};

export function renderBuilding2DDataUrl(
  buildingKey: string,
  shape: BuildingShape,
  houseStyle: 'warm' | 'modern' | 'pastel',
  isNight: boolean,
  familyName = 'B2KS'
): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  const isHouse = buildingKey === 'house';
  canvas.width = 300;
  canvas.height = isHouse ? 320 : 280;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Sky / Turf backdrop
  const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  if (isNight) {
    skyGrad.addColorStop(0, '#0F172A');
    skyGrad.addColorStop(0.68, '#1E293B');
    skyGrad.addColorStop(0.69, '#334155');
    skyGrad.addColorStop(1, '#1E293B');
  } else {
    skyGrad.addColorStop(0, '#BAE6FD');
    skyGrad.addColorStop(0.68, '#E0F2FE');
    skyGrad.addColorStop(0.69, '#86EFAC');
    skyGrad.addColorStop(1, '#4ADE80');
  }
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (isNight) {
    ctx.fillStyle = '#FEF9C3';
    [
      [34, 28, 1.5],
      [92, 18, 1.2],
      [212, 24, 1.6],
      [262, 44, 1.3],
      [56, 62, 1.1],
    ].forEach(([sx, sy, sr]) => {
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  const lighting: LightingInfo = isNight
    ? {
        phase: 'night',
        label: 'Ban đêm',
        skyTop: '#0F172A',
        skyBottom: '#1E293B',
        overlayAlpha: 0.25,
        overlayColor: '#0F172A',
        isNight: true,
      }
    : {
        phase: 'day',
        label: 'Ban ngày',
        skyTop: '#BAE6FD',
        skyBottom: '#E0F2FE',
        overlayAlpha: 0,
        overlayColor: '#FFFFFF',
        isNight: false,
      };

  ctx.save();
  if (isHouse) {
    ctx.translate(150, 234);
    ctx.scale(0.92, 0.92);
    drawStreetTownhouse(ctx, 0, 0, houseStyle, lighting, familyName, shape);
  } else if (buildingKey === 'church') {
    ctx.translate(150, 212);
    ctx.scale(0.84, 0.84);
    drawProtestantChurch2D(ctx, 0, 0, lighting, shape);
  } else {
    const preset = SHOP_PREVIEW_PRESETS[buildingKey] || SHOP_PREVIEW_PRESETS.supermarket;
    ctx.translate(150, 182);
    ctx.scale(0.94, 0.94);
    drawShopBuilding(
      ctx,
      0,
      0,
      {
        ...preset,
        title: formatFamilyBrand(preset.title, familyName),
        shape,
      },
      lighting
    );
  }
  ctx.restore();

  return canvas.toDataURL('image/png');
}

export function renderCharacter2DDataUrl(member: Partial<Member> & { name: string }): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 168;
  canvas.height = 168;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.clearRect(0, 0, 168, 168);
  drawDetailedChibiOnContext(
    ctx,
    {
      ...member,
      x: 84,
      y: 112,
      dir: 'down',
      speech: null,
    },
    false,
    1.5,
    false,
    false
  );
  return canvas.toDataURL('image/png');
}

export function renderHelperRobotSVG(skin: RobotSkinId, size = 148): string {
  if (skin === 'doraemon') {
    return `<svg viewBox="0 0 120 120" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="60" cy="109" rx="28" ry="5" fill="#0F172A" opacity="0.16"/>
      <!-- Take-copter propeller -->
      <rect x="58" y="8" width="4" height="12" rx="2" fill="#D97706" stroke="#1E293B" stroke-width="1.6"/>
      <ellipse cx="60" cy="9" rx="18" ry="3.2" fill="#FACC15" stroke="#1E293B" stroke-width="1.6"/>
      <circle cx="60" cy="9" r="3" fill="#B45309"/>
      <!-- Feet & Arms -->
      <ellipse cx="47" cy="103" rx="10" ry="5.5" fill="#FFFFFF" stroke="#1E293B" stroke-width="2.2"/>
      <ellipse cx="73" cy="103" rx="10" ry="5.5" fill="#FFFFFF" stroke="#1E293B" stroke-width="2.2"/>
      <path d="M 35 66 Q 22 72 24 81" fill="none" stroke="#0EA5E9" stroke-width="9" stroke-linecap="round"/>
      <circle cx="23" cy="82" r="5.5" fill="#FFFFFF" stroke="#1E293B" stroke-width="2"/>
      <path d="M 85 66 Q 98 72 96 81" fill="none" stroke="#0EA5E9" stroke-width="9" stroke-linecap="round"/>
      <circle cx="97" cy="82" r="5.5" fill="#FFFFFF" stroke="#1E293B" stroke-width="2"/>
      <!-- Body & Belly & 4D Pocket -->
      <ellipse cx="60" cy="79" rx="24" ry="23" fill="#0EA5E9" stroke="#1E293B" stroke-width="2.4"/>
      <ellipse cx="60" cy="81" rx="17" ry="17" fill="#FFFFFF" stroke="#1E293B" stroke-width="1.8"/>
      <path d="M 48 80 A 12 11 0 0 0 72 80 Z" fill="#F8FAFC" stroke="#1E293B" stroke-width="1.8"/>
      <!-- Red collar + Gold bell -->
      <rect x="42" y="56" width="36" height="5.5" rx="2.7" fill="#EF4444" stroke="#1E293B" stroke-width="1.8"/>
      <circle cx="60" cy="63" r="5" fill="#FACC15" stroke="#1E293B" stroke-width="1.8"/>
      <circle cx="60" cy="64.5" r="1.4" fill="#1E293B"/>
      <!-- Head & Face -->
      <circle cx="60" cy="39" r="24" fill="#0EA5E9" stroke="#1E293B" stroke-width="2.4"/>
      <ellipse cx="60" cy="43" rx="20" ry="17.5" fill="#FFFFFF" stroke="#1E293B" stroke-width="1.8"/>
      <ellipse cx="54" cy="30" rx="4.5" ry="6" fill="#FFFFFF" stroke="#1E293B" stroke-width="1.8"/>
      <ellipse cx="66" cy="30" rx="4.5" ry="6" fill="#FFFFFF" stroke="#1E293B" stroke-width="1.8"/>
      <circle cx="55.5" cy="31" r="2" fill="#0F172A"/>
      <circle cx="64.5" cy="31" r="2" fill="#0F172A"/>
      <circle cx="60" cy="37" r="3.6" fill="#EF4444" stroke="#1E293B" stroke-width="1.5"/>
      <circle cx="58.8" cy="35.8" r="1" fill="#FFFFFF"/>
      <line x1="60" y1="40.5" x2="60" y2="50" stroke="#1E293B" stroke-width="1.8"/>
      <path d="M 48 47 Q 60 56 72 47" fill="none" stroke="#1E293B" stroke-width="2" stroke-linecap="round"/>
      <line x1="36" y1="39" x2="48" y2="41" stroke="#1E293B" stroke-width="1.5"/>
      <line x1="35" y1="44" x2="48" y2="44" stroke="#1E293B" stroke-width="1.5"/>
      <line x1="72" y1="41" x2="84" y2="39" stroke="#1E293B" stroke-width="1.5"/>
      <line x1="72" y1="44" x2="85" y2="44" stroke="#1E293B" stroke-width="1.5"/>
    </svg>`;
  }

  if (skin === 'doraemi') {
    return `<svg viewBox="0 0 120 120" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="60" cy="109" rx="28" ry="5" fill="#0F172A" opacity="0.16"/>
      <!-- Tulip tail peeking on right -->
      <path d="M 81 87 Q 93 84 95 76" fill="none" stroke="#22C55E" stroke-width="3" stroke-linecap="round"/>
      <circle cx="96" cy="74" r="5" fill="#EF4444" stroke="#1E293B" stroke-width="1.8"/>
      <!-- Feet & Arms -->
      <ellipse cx="47" cy="103" rx="10" ry="5.5" fill="#FFFFFF" stroke="#1E293B" stroke-width="2.2"/>
      <ellipse cx="73" cy="103" rx="10" ry="5.5" fill="#FFFFFF" stroke="#1E293B" stroke-width="2.2"/>
      <path d="M 35 67 Q 22 73 24 82" fill="none" stroke="#FACC15" stroke-width="9" stroke-linecap="round"/>
      <circle cx="23" cy="83" r="5.5" fill="#FFFFFF" stroke="#1E293B" stroke-width="2"/>
      <path d="M 85 67 Q 98 73 96 82" fill="none" stroke="#FACC15" stroke-width="9" stroke-linecap="round"/>
      <circle cx="97" cy="83" r="5.5" fill="#FFFFFF" stroke="#1E293B" stroke-width="2"/>
      <!-- Golden-Yellow Body & Belly & Pink-Trimmed 4D Pocket -->
      <ellipse cx="60" cy="80" rx="23.5" ry="22.5" fill="#FACC15" stroke="#1E293B" stroke-width="2.4"/>
      <ellipse cx="60" cy="82" rx="17" ry="16.5" fill="#FFFFFF" stroke="#1E293B" stroke-width="1.8"/>
      <path d="M 48 80 A 12 11 0 0 0 72 80 Z" fill="#F9A8D4" stroke="#EF4444" stroke-width="2"/>
      <!-- Sky-blue Collar + Gold Bell -->
      <rect x="42" y="57" width="36" height="5.5" rx="2.7" fill="#38BDF8" stroke="#1E293B" stroke-width="1.8"/>
      <circle cx="60" cy="64" r="5" fill="#F59E0B" stroke="#1E293B" stroke-width="1.8"/>
      <circle cx="60" cy="65.5" r="1.4" fill="#1E293B"/>
      <!-- Giant Red Ribbon Bow Ears on top -->
      <path d="M 60 19 L 40 8 Q 34 15 41 24 Z" fill="#EF4444" stroke="#1E293B" stroke-width="2.1"/>
      <path d="M 60 19 L 80 8 Q 86 15 79 24 Z" fill="#EF4444" stroke="#1E293B" stroke-width="2.1"/>
      <circle cx="60" cy="18" r="5.5" fill="#DC2626" stroke="#1E293B" stroke-width="2"/>
      <!-- Round Yellow Head & White Face -->
      <circle cx="60" cy="40" r="23" fill="#FACC15" stroke="#1E293B" stroke-width="2.4"/>
      <ellipse cx="60" cy="44" rx="19" ry="16.5" fill="#FFFFFF" stroke="#1E293B" stroke-width="1.8"/>
      <!-- Eyes + Eyelashes -->
      <ellipse cx="54" cy="33" rx="4.2" ry="5.5" fill="#FFFFFF" stroke="#1E293B" stroke-width="1.8"/>
      <ellipse cx="66" cy="33" rx="4.2" ry="5.5" fill="#FFFFFF" stroke="#1E293B" stroke-width="1.8"/>
      <line x1="49" y1="29" x2="46" y2="26.5" stroke="#1E293B" stroke-width="1.8" stroke-linecap="round"/>
      <line x1="71" y1="29" x2="74" y2="26.5" stroke="#1E293B" stroke-width="1.8" stroke-linecap="round"/>
      <circle cx="55" cy="33.5" r="2" fill="#0F172A"/>
      <circle cx="65" cy="33.5" r="2" fill="#0F172A"/>
      <!-- Cheeks, Pink Nose, Smile & Whiskers -->
      <ellipse cx="44" cy="45" rx="4" ry="2.4" fill="#F9A8D4"/>
      <ellipse cx="76" cy="45" rx="4" ry="2.4" fill="#F9A8D4"/>
      <circle cx="60" cy="39" r="3.4" fill="#F43F5E" stroke="#1E293B" stroke-width="1.5"/>
      <line x1="60" y1="42.5" x2="60" y2="49" stroke="#1E293B" stroke-width="1.6"/>
      <path d="M 50 48 Q 60 55 70 48" fill="none" stroke="#1E293B" stroke-width="2" stroke-linecap="round"/>
      <line x1="37" y1="40" x2="47" y2="42" stroke="#1E293B" stroke-width="1.4"/>
      <line x1="36" y1="44" x2="47" y2="44" stroke="#1E293B" stroke-width="1.4"/>
      <line x1="73" y1="42" x2="83" y2="40" stroke="#1E293B" stroke-width="1.4"/>
      <line x1="73" y1="44" x2="84" y2="44" stroke="#1E293B" stroke-width="1.4"/>
    </svg>`;
  }

  if (skin === 'gundam') {
    return `<svg viewBox="0 0 120 120" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="60" cy="109" rx="28" ry="5" fill="#0F172A" opacity="0.16"/>
      <!-- Backpack Winglets -->
      <polygon points="38,52 16,38 24,62" fill="#E2E8F0" stroke="#1E293B" stroke-width="2"/>
      <polygon points="82,52 104,38 96,62" fill="#E2E8F0" stroke="#1E293B" stroke-width="2"/>
      <!-- Boots & Legs -->
      <rect x="42" y="84" width="13" height="16" rx="4" fill="#F8FAFC" stroke="#1E293B" stroke-width="2.2"/>
      <rect x="65" y="84" width="13" height="16" rx="4" fill="#F8FAFC" stroke="#1E293B" stroke-width="2.2"/>
      <rect x="40" y="96" width="17" height="10" rx="4" fill="#EF4444" stroke="#1E293B" stroke-width="2.2"/>
      <rect x="63" y="96" width="17" height="10" rx="4" fill="#EF4444" stroke="#1E293B" stroke-width="2.2"/>
      <!-- Arms & Shoulder Pauldrons -->
      <rect x="24" y="62" width="12" height="22" rx="5" fill="#F8FAFC" stroke="#1E293B" stroke-width="2"/>
      <rect x="84" y="62" width="12" height="22" rx="5" fill="#F8FAFC" stroke="#1E293B" stroke-width="2"/>
      <rect x="22" y="55" width="16" height="12" rx="5" fill="#2563EB" stroke="#1E293B" stroke-width="2"/>
      <rect x="82" y="55" width="16" height="12" rx="5" fill="#2563EB" stroke="#1E293B" stroke-width="2"/>
      <!-- Torso Armor -->
      <rect x="39" y="56" width="42" height="30" rx="8" fill="#2563EB" stroke="#1E293B" stroke-width="2.4"/>
      <rect x="52" y="61" width="16" height="14" rx="4" fill="#EF4444" stroke="#1E293B" stroke-width="1.8"/>
      <rect x="43" y="63" width="6" height="5" rx="1.5" fill="#FACC15" stroke="#1E293B" stroke-width="1.3"/>
      <rect x="71" y="63" width="6" height="5" rx="1.5" fill="#FACC15" stroke="#1E293B" stroke-width="1.3"/>
      <circle cx="60" cy="81" r="4.5" fill="#FACC15" stroke="#1E293B" stroke-width="1.5"/>
      <!-- SD Helmet + Cyan Visor + Golden V-Fin -->
      <rect x="35" y="21" width="50" height="36" rx="15" fill="#FFFFFF" stroke="#1E293B" stroke-width="2.4"/>
      <rect x="56" y="14" width="8" height="11" rx="3" fill="#EF4444" stroke="#1E293B" stroke-width="1.8"/>
      <rect x="43" y="34" width="34" height="12" rx="5" fill="#0F172A"/>
      <rect x="46" y="36" width="28" height="8" rx="3" fill="#38BDF8"/>
      <circle cx="53" cy="40" r="2" fill="#FFFFFF"/>
      <circle cx="67" cy="40" r="2" fill="#FFFFFF"/>
      <polygon points="60,25 32,12 48,29" fill="#FACC15" stroke="#1E293B" stroke-width="1.8"/>
      <polygon points="60,25 88,12 72,29" fill="#FACC15" stroke="#1E293B" stroke-width="1.8"/>
      <circle cx="60" cy="26" r="4" fill="#EF4444" stroke="#1E293B" stroke-width="1.6"/>
      <rect x="54" y="49" width="12" height="6" rx="3" fill="#EF4444" stroke="#1E293B" stroke-width="1.5"/>
    </svg>`;
  }

  // WALL-E
  return `<svg viewBox="0 0 120 120" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="60" cy="109" rx="30" ry="5" fill="#0F172A" opacity="0.16"/>
    <!-- Treads -->
    <rect x="27" y="83" width="17" height="23" rx="6" fill="#334155" stroke="#0F172A" stroke-width="2.2"/>
    <rect x="76" y="83" width="17" height="23" rx="6" fill="#334155" stroke="#0F172A" stroke-width="2.2"/>
    <circle cx="35.5" cy="91" r="4" fill="#CBD5E1"/>
    <circle cx="84.5" cy="91" r="4" fill="#CBD5E1"/>
    <!-- Arms -->
    <rect x="22" y="61" width="14" height="8" rx="4" fill="#94A3B8" stroke="#1E293B" stroke-width="2"/>
    <rect x="84" y="61" width="14" height="8" rx="4" fill="#94A3B8" stroke="#1E293B" stroke-width="2"/>
    <!-- Amber Chassis + Solar Display -->
    <rect x="35" y="54" width="50" height="40" rx="10" fill="#F59E0B" stroke="#1E293B" stroke-width="2.4"/>
    <rect x="42" y="62" width="36" height="22" rx="5" fill="#334155" stroke="#1E293B" stroke-width="1.8"/>
    <circle cx="50" cy="73" r="4.5" fill="#FACC15"/>
    <rect x="60" y="67" width="12" height="3.2" rx="1.5" fill="#4ADE80"/>
    <rect x="60" y="72" width="12" height="3.2" rx="1.5" fill="#4ADE80"/>
    <rect x="60" y="77" width="12" height="3.2" rx="1.5" fill="#FACC15"/>
    <!-- Neck -->
    <rect x="55" y="38" width="10" height="17" rx="4" fill="#CBD5E1" stroke="#1E293B" stroke-width="2"/>
    <!-- Twin Tilted Binocular Eyes -->
    <g transform="rotate(-8 46 31)">
      <rect x="31" y="21" width="26" height="20" rx="7" fill="#CBD5E1" stroke="#1E293B" stroke-width="2.2"/>
      <circle cx="44" cy="31" r="7" fill="#0F172A"/>
      <circle cx="44" cy="31" r="5" fill="#38BDF8"/>
      <circle cx="42" cy="29" r="1.8" fill="#FFFFFF"/>
    </g>
    <g transform="rotate(8 74 31)">
      <rect x="63" y="21" width="26" height="20" rx="7" fill="#CBD5E1" stroke="#1E293B" stroke-width="2.2"/>
      <circle cx="76" cy="31" r="7" fill="#0F172A"/>
      <circle cx="76" cy="31" r="5" fill="#38BDF8"/>
      <circle cx="74" cy="29" r="1.8" fill="#FFFFFF"/>
    </g>
  </svg>`;
}

export function renderOutdoorLandmarkSVG(
  type: 'eng_park' | 'fountain_plaza' | 'reading_corner' | 'soccer',
  size = 148
): string {
  if (type === 'eng_park') {
    return `<svg viewBox="0 0 120 120" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="10" width="108" height="100" rx="16" fill="#DCFCE7" stroke="#16A34A" stroke-width="2.4"/>
      <circle cx="24" cy="36" r="14" fill="#22C55E" stroke="#14532D" stroke-width="2"/>
      <circle cx="96" cy="36" r="14" fill="#22C55E" stroke="#14532D" stroke-width="2"/>
      <!-- Gazebo -->
      <polygon points="60,18 28,44 92,44" fill="#0D9488" stroke="#1E293B" stroke-width="2.2"/>
      <rect x="38" y="44" width="6" height="32" fill="#92400E" stroke="#1E293B" stroke-width="1.8"/>
      <rect x="76" y="44" width="6" height="32" fill="#92400E" stroke="#1E293B" stroke-width="1.8"/>
      <rect x="30" y="76" width="60" height="8" rx="3" fill="#CBD5E1" stroke="#1E293B" stroke-width="1.8"/>
      <rect x="39" y="50" width="42" height="16" rx="4" fill="#FFFFFF" stroke="#0F766E" stroke-width="2"/>
      <text x="60" y="61.5" font-size="9" font-weight="bold" text-anchor="middle" fill="#0F766E">SPEAK! 💬</text>
      <rect x="26" y="90" width="68" height="10" rx="4" fill="#B45309" stroke="#1E293B" stroke-width="1.8"/>
    </svg>`;
  }

  if (type === 'fountain_plaza') {
    return `<svg viewBox="0 0 120 120" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="10" width="108" height="100" rx="16" fill="#E0F2FE" stroke="#0284C7" stroke-width="2.4"/>
      <ellipse cx="60" cy="86" rx="42" ry="16" fill="#CBD5E1" stroke="#334155" stroke-width="2.2"/>
      <ellipse cx="60" cy="84" rx="34" ry="12" fill="#38BDF8" stroke="#0369A1" stroke-width="1.8"/>
      <rect x="53" y="52" width="14" height="32" fill="#E2E8F0" stroke="#334155" stroke-width="2"/>
      <ellipse cx="60" cy="54" rx="20" ry="7" fill="#E2E8F0" stroke="#334155" stroke-width="2"/>
      <path d="M 60 52 Q 46 28 36 52" fill="none" stroke="#38BDF8" stroke-width="3" stroke-linecap="round"/>
      <path d="M 60 52 Q 74 28 84 52" fill="none" stroke="#38BDF8" stroke-width="3" stroke-linecap="round"/>
      <path d="M 60 50 L 60 22" fill="none" stroke="#BAE6FD" stroke-width="4" stroke-linecap="round"/>
      <circle cx="60" cy="20" r="4" fill="#7DD3FC"/>
    </svg>`;
  }

  if (type === 'reading_corner') {
    return `<svg viewBox="0 0 120 120" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="10" width="108" height="100" rx="16" fill="#ECFDF5" stroke="#059669" stroke-width="2.4"/>
      <!-- Pergola beams -->
      <rect x="20" y="24" width="80" height="10" rx="3" fill="#B45309" stroke="#1E293B" stroke-width="2"/>
      <rect x="26" y="34" width="7" height="58" fill="#92400E" stroke="#1E293B" stroke-width="1.8"/>
      <rect x="87" y="34" width="7" height="58" fill="#92400E" stroke="#1E293B" stroke-width="1.8"/>
      <!-- Open Book Shelf + Bench -->
      <rect x="38" y="42" width="44" height="28" rx="4" fill="#FEF3C7" stroke="#78350F" stroke-width="2"/>
      <rect x="43" y="47" width="7" height="18" fill="#EF4444"/>
      <rect x="52" y="47" width="7" height="18" fill="#3B82F6"/>
      <rect x="61" y="47" width="7" height="18" fill="#10B981"/>
      <rect x="70" y="47" width="7" height="18" fill="#F59E0B"/>
      <rect x="34" y="78" width="52" height="14" rx="5" fill="#059669" stroke="#1E293B" stroke-width="2"/>
    </svg>`;
  }

  // soccer
  return `<svg viewBox="0 0 120 120" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="14" width="108" height="92" rx="12" fill="#16A34A" stroke="#14532D" stroke-width="2.6"/>
    <rect x="14" y="22" width="92" height="76" rx="4" fill="none" stroke="#FFFFFF" stroke-width="2.4"/>
    <line x1="60" y1="22" x2="60" y2="98" stroke="#FFFFFF" stroke-width="2"/>
    <circle cx="60" cy="60" r="14" fill="none" stroke="#FFFFFF" stroke-width="2"/>
    <rect x="14" y="42" width="14" height="36" fill="none" stroke="#FFFFFF" stroke-width="2"/>
    <rect x="92" y="42" width="14" height="36" fill="none" stroke="#FFFFFF" stroke-width="2"/>
    <circle cx="60" cy="60" r="8" fill="#FFFFFF" stroke="#0F172A" stroke-width="2"/>
    <polygon points="60,55 63.5,58 62,62 58,62 56.5,58" fill="#0F172A"/>
  </svg>`;
}
