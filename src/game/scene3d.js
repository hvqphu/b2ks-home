/**
 * ============================================================================
 * B2KS 3D LOW-POLY ISOMETRIC SCENE RENDERER (Three.js via CDN)
 * ============================================================================
 * Module này chuyên dựng toàn bộ thế giới 3D phong cách Low-poly Isometric:
 * - Camera trực giao (OrthographicCamera) nghiêng 45 độ + bóng đổ mềm (Soft Shadows)
 * - Bảng màu Pastel tươi sáng, không viền đen (Zero black outlines)
 * - Khu phố 3D (đường nhựa vạch vàng, vỉa hè lát gạch, cỏ xanh mạ, cây, đèn đường, xe cộ, 15+ công trình)
 * - Nội thất Nhà phố 3D nhiều tầng & Phòng riêng 3D
 * - Nhân vật Chibi 3D đầu to thân nhỏ (12 kiểu tóc, trang phục, bóng tròn, xoay hướng mượt)
 * - Thú cưng 3D đồng hành (10 loài + trứng + tiến hóa + phụ kiện)
 */

import { buildCatalogItem3D, buildProceduralLabItem3D } from './itemModels3d';
import { STREET_WORLD } from './constants.ts';

export {
  buildCatalogItem3D,
  buildProceduralLabItem3D,
  buildTownhouse3D,
  buildShopBuilding3D,
  buildOutdoorLandmark3D,
  buildChibiCharacter3D,
  buildForeignNpc3D,
  buildHelperRobot3D,
};
export const WORLD_SCALE = 0.05; // 100px (2D) = 5 đơn vị 3D
const CAMERA_MODE_STORAGE_KEY = 'b2ks_camera_mode_v1';

export const PASTEL_PALETTE = {
  grassMain: '#63C13B',
  grassAlt: '#4FA92B',
  grassSnow: '#D2F2DC',
  hillFar: '#72CB4E',
  sidewalk: '#E3BA91',
  sidewalkTile: '#BA8552',
  asphalt: '#334155',
  roadLine: '#FBBF24',
  crosswalk: '#F8FAFC',
  wallCream: '#FFF3DA',
  wallTeal: '#0D9488',
  tealLight: '#14B8A6',
  accentOrange: '#F97316',
  accentYellow: '#FACC15',
  accentCoral: '#F43F5E',
  roofTerracotta: '#DC4C3E',
  woodWarm: '#B47B48',
  woodDark: '#7C4D2B',
  glassDay: '#7DD3FC',
  glassNight: '#FEF08A',
  skyDay: '#BAE6FD',
  skyDawn: '#FDBA74',
  skySunset: '#FB7185',
  skyNight: '#050A18',
  skyRain: '#94A3B8',
};

// Reusable math objects (zero GC allocations in animation loop)
let _THREE = null;
const _tmpVec3 = { x: 0, y: 0, z: 0 };

function createSeededRandom(seed) {
  let s = (seed || 1) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Phát hiện GPU phần mềm (SwiftShader/llvmpipe) để tự động tối ưu shadow & pixelRatio
 */
export function detectSoftwareWebGL() {
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

/**
 * Tạo texture cỏ pastel, vỉa hè lát gạch, mặt đường, sân bóng & bóng tròn mềm
 */
export function createProceduralTextures(THREE, maxAnisotropy = 1) {
  // 1. Grass subtle checkerboard / blades texture
  const grassCanvas = document.createElement('canvas');
  grassCanvas.width = 256;
  grassCanvas.height = 256;
  const gCtx = grassCanvas.getContext('2d');
  gCtx.fillStyle = PASTEL_PALETTE.grassMain;
  gCtx.fillRect(0, 0, 256, 256);
  gCtx.fillStyle = PASTEL_PALETTE.grassAlt;
  gCtx.globalAlpha = 0.34;
  gCtx.fillRect(0, 0, 128, 128);
  gCtx.fillRect(128, 128, 128, 128);
  gCtx.globalAlpha = 0.42;
  for (let i = 0; i < 90; i++) {
    const gx = (i * 73) % 256;
    const gy = (i * 137) % 256;
    gCtx.fillStyle = i % 2 === 0 ? '#7EE054' : '#3E9421';
    gCtx.fillRect(gx, gy, 4, 8);
  }
  const grassTex = new THREE.CanvasTexture(grassCanvas);
  grassTex.wrapS = THREE.RepeatWrapping;
  grassTex.wrapT = THREE.RepeatWrapping;
  grassTex.repeat.set(22, 16);
  grassTex.colorSpace = THREE.SRGBColorSpace;
  grassTex.anisotropy = maxAnisotropy;

  // 2. Sidewalk warm light-brown brick paving texture
  const swCanvas = document.createElement('canvas');
  swCanvas.width = 256;
  swCanvas.height = 256;
  const sCtx = swCanvas.getContext('2d');
  sCtx.fillStyle = PASTEL_PALETTE.sidewalkTile;
  sCtx.fillRect(0, 0, 256, 256);
  const brickShades = ['#E8C29B', '#DFB68C', '#E4BE96', '#D9AE82'];
  const brickH = 64;
  const brickW = 128;
  for (let row = 0; row < 4; row++) {
    const offsetX = row % 2 === 1 ? brickW / 2 : 0;
    for (let col = -1; col < 3; col++) {
      const bx = col * brickW + offsetX;
      const by = row * brickH;
      sCtx.fillStyle = brickShades[(row * 3 + col + 4) % brickShades.length];
      sCtx.fillRect(bx + 3, by + 3, brickW - 6, brickH - 6);
      sCtx.fillStyle = 'rgba(255, 248, 238, 0.28)';
      sCtx.fillRect(bx + 4, by + 4, brickW - 8, 5);
    }
  }
  const sidewalkTex = new THREE.CanvasTexture(swCanvas);
  sidewalkTex.wrapS = THREE.RepeatWrapping;
  sidewalkTex.wrapT = THREE.RepeatWrapping;
  sidewalkTex.repeat.set(24, 2.2);
  sidewalkTex.colorSpace = THREE.SRGBColorSpace;
  sidewalkTex.anisotropy = maxAnisotropy;

  const sidewalkVTex = sidewalkTex.clone();
  sidewalkVTex.needsUpdate = true;
  sidewalkVTex.wrapS = THREE.RepeatWrapping;
  sidewalkVTex.wrapT = THREE.RepeatWrapping;
  sidewalkVTex.repeat.set(2.2, 16);
  sidewalkVTex.colorSpace = THREE.SRGBColorSpace;
  sidewalkVTex.anisotropy = maxAnisotropy;

  // 3. Soft radial contact shadow disc
  const shCanvas = document.createElement('canvas');
  shCanvas.width = 64;
  shCanvas.height = 64;
  const shCtx = shCanvas.getContext('2d');
  const grad = shCtx.createRadialGradient(32, 32, 4, 32, 32, 30);
  grad.addColorStop(0, 'rgba(15, 23, 42, 0.45)');
  grad.addColorStop(0.6, 'rgba(15, 23, 42, 0.2)');
  grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
  shCtx.fillStyle = grad;
  shCtx.fillRect(0, 0, 64, 64);
  const shadowTex = new THREE.CanvasTexture(shCanvas);
  shadowTex.colorSpace = THREE.SRGBColorSpace;

  // 4. Warm honey-oak wood plank floor texture (shared between house rooms & private room)
  const woodCanvas = document.createElement('canvas');
  woodCanvas.width = 128;
  woodCanvas.height = 128;
  const wCtx = woodCanvas.getContext('2d');
  wCtx.fillStyle = '#E5AA6C';
  wCtx.fillRect(0, 0, 128, 128);
  wCtx.fillStyle = '#DB9B59';
  wCtx.fillRect(0, 32, 128, 32);
  wCtx.fillRect(0, 96, 128, 32);
  wCtx.fillStyle = '#C47D3B';
  for (let y = 0; y < 128; y += 32) {
    wCtx.fillRect(0, y, 128, 2);
    wCtx.fillRect((y * 2 + 24) % 128, y, 2, 32);
  }
  const woodTex = new THREE.CanvasTexture(woodCanvas);
  woodTex.wrapS = THREE.RepeatWrapping;
  woodTex.wrapT = THREE.RepeatWrapping;
  woodTex.repeat.set(8, 5);
  woodTex.colorSpace = THREE.SRGBColorSpace;
  woodTex.anisotropy = maxAnisotropy;

  return { grassTex, sidewalkTex, sidewalkVTex, shadowTex, woodTex };
}

/**
 * Helper tạo vật liệu PBR chuẩn Low-Poly (không viền đen, chia roughness rõ khối)
 */
export function createMaterialCache(THREE) {
  const cache = new Map();
  return {
    get(color, opts = {}) {
      const emInt = opts.emissiveIntensity ?? (opts.emissive ? 0.65 : 0);
      const sideVal = opts.side ?? THREE.FrontSide;
      const key = `${color}|${opts.roughness ?? 0.72}|${opts.metalness ?? 0.04}|${opts.emissive ?? 0}|${emInt}|${opts.opacity ?? 1}|${opts.flatShading ? 1 : 0}|${sideVal}`;
      if (cache.has(key)) return cache.get(key);
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        roughness: opts.roughness ?? 0.72,
        metalness: opts.metalness ?? 0.04,
        flatShading: opts.flatShading ?? false,
        transparent: opts.transparent ?? (opts.opacity !== undefined && opts.opacity < 1),
        opacity: opts.opacity ?? 1,
        emissive: opts.emissive ? new THREE.Color(opts.emissive) : new THREE.Color(0x000000),
        emissiveIntensity: emInt,
        side: sideVal,
      });
      cache.set(key, mat);
      return mat;
    },
    disposeAll() {
      cache.forEach((m) => m.dispose());
      cache.clear();
    },
  };
}

function makeBox(THREE, w, h, d, mat, castShadow = true, receiveShadow = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = castShadow;
  m.receiveShadow = receiveShadow;
  return m;
}

function makeCyl(THREE, rt, rb, h, segs, mat, castShadow = true, receiveShadow = true) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, segs), mat);
  m.castShadow = castShadow;
  m.receiveShadow = receiveShadow;
  return m;
}

function makeSphere(THREE, r, ws, hs, mat, castShadow = true, receiveShadow = true) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, ws, hs), mat);
  m.castShadow = castShadow;
  m.receiveShadow = receiveShadow;
  return m;
}

function makeCone(THREE, r, h, radialSegs, mat, castShadow = true, receiveShadow = true) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, radialSegs), mat);
  m.castShadow = castShadow;
  m.receiveShadow = receiveShadow;
  return m;
}

/**
 * Dựng 5 loại cây Low-poly 3D chi tiết (nhiều tán, cành nhánh, bồn cây/quả)
 */
function buildTree3D(THREE, mats, kind, x, z, withPlanter = false) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const rand = createSeededRandom(Math.round(x * 13 + z * 7));
  const scaleVar = 0.9 + rand() * 0.22;
  group.scale.setScalar(scaleVar);

  if (withPlanter) {
    const curb = makeCyl(THREE, 0.95, 1.05, 0.28, 8, mats.get('#CBD5E1', { roughness: 0.78 }), false, true);
    curb.position.y = 0.14;
    const soil = makeCyl(THREE, 0.78, 0.78, 0.3, 8, mats.get('#78350F', { roughness: 0.92 }), false, true);
    soil.position.y = 0.15;
    group.add(curb, soil);
  }

  const canopyGroup = new THREE.Group();
  group.add(canopyGroup);
  group.userData.canopy = canopyGroup;
  group.userData.swayPhase = x * 0.2 + z * 0.15;

  if (kind === 'pine') {
    const trunk = makeCyl(THREE, 0.2, 0.34, 1.4, 8, mats.get('#6D3E21', { roughness: 0.88 }));
    trunk.position.y = 0.7;
    group.add(trunk);

    const tiers = [
      { r: 1.52, h: 1.7, y: 1.85, col: '#15803D' },
      { r: 1.2, h: 1.55, y: 2.75, col: '#16A34A' },
      { r: 0.88, h: 1.4, y: 3.6, col: '#22C55E' },
      { r: 0.52, h: 1.05, y: 4.3, col: '#4ADE80' },
    ];
    tiers.forEach((t, idx) => {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(t.r, t.h, 7),
        mats.get(t.col, { roughness: 0.76, flatShading: true })
      );
      cone.position.y = t.y;
      cone.rotation.y = idx * 0.45;
      cone.castShadow = true;
      cone.receiveShadow = true;
      canopyGroup.add(cone);
    });
  } else if (kind === 'sakura') {
    const barkMat = mats.get('#5C3A2E', { roughness: 0.88 });
    const trunk = makeCyl(THREE, 0.22, 0.36, 1.65, 8, barkMat);
    trunk.position.y = 0.82;
    const brL = makeCyl(THREE, 0.1, 0.15, 0.95, 6, barkMat);
    brL.position.set(-0.32, 1.55, 0.1);
    brL.rotation.z = 0.58;
    const brR = makeCyl(THREE, 0.1, 0.14, 0.9, 6, barkMat);
    brR.position.set(0.32, 1.6, -0.08);
    brR.rotation.z = -0.52;
    group.add(trunk, brL, brR);

    const puffs = [
      [0, 2.42, 0, 1.24, '#F472B6'],
      [-0.82, 2.08, 0.36, 0.85, '#F9A8D4'],
      [0.8, 2.15, -0.28, 0.88, '#EC4899'],
      [0.18, 2.95, 0.24, 0.8, '#FBCFE8'],
      [-0.25, 2.65, -0.58, 0.72, '#F472B6'],
    ];
    puffs.forEach(([px, py, pz, pr, col]) => {
      const sph = makeSphere(THREE, pr, 10, 8, mats.get(col, { roughness: 0.74, flatShading: true }));
      sph.position.set(px, py, pz);
      canopyGroup.add(sph);
    });
  } else if (kind === 'palm') {
    const trunkMat = mats.get('#A16207', { roughness: 0.86 });
    const ringMat = mats.get('#78350F', { roughness: 0.88 });
    for (let i = 0; i < 5; i++) {
      const seg = makeCyl(THREE, 0.19 - i * 0.018, 0.24 - i * 0.018, 0.68, 8, i % 2 === 0 ? trunkMat : ringMat);
      seg.position.set(i * 0.09, 0.34 + i * 0.62, 0);
      seg.rotation.z = -0.09;
      group.add(seg);
    }
    const crownX = 0.42;
    const crownY = 3.32;
    const cocoMat = mats.get('#78350F', { roughness: 0.6 });
    [[-0.18, 0.16], [0.2, -0.12], [0.02, 0.22]].forEach(([cx, cz]) => {
      const coco = makeSphere(THREE, 0.17, 8, 6, cocoMat);
      coco.position.set(crownX + cx, crownY - 0.18, cz);
      canopyGroup.add(coco);
    });
    const frondMat = mats.get('#22C55E', { roughness: 0.68, flatShading: true });
    const tipMat = mats.get('#4ADE80', { roughness: 0.68, flatShading: true });
    for (let a = 0; a < 7; a++) {
      const ang = (a * Math.PI * 2) / 7;
      const frondGroup = new THREE.Group();
      frondGroup.position.set(crownX, crownY, 0);
      frondGroup.rotation.y = ang;
      const inner = makeBox(THREE, 1.0, 0.1, 0.42, frondMat);
      inner.position.set(0.5, 0.06, 0);
      inner.rotation.z = -0.14;
      const outer = makeBox(THREE, 0.78, 0.08, 0.3, tipMat);
      outer.position.set(1.22, -0.12, 0);
      outer.rotation.z = -0.45;
      frondGroup.add(inner, outer);
      canopyGroup.add(frondGroup);
    }
  } else if (kind === 'orange') {
    const barkMat = mats.get('#78350F', { roughness: 0.86 });
    const trunk = makeCyl(THREE, 0.21, 0.34, 1.55, 8, barkMat);
    trunk.position.y = 0.77;
    const root = makeCyl(THREE, 0.28, 0.46, 0.35, 7, barkMat);
    root.position.y = 0.17;
    group.add(trunk, root);

    const leaves = makeSphere(THREE, 1.24, 10, 8, mats.get('#16A34A', { roughness: 0.76, flatShading: true }));
    leaves.position.y = 2.28;
    const sub1 = makeSphere(THREE, 0.86, 9, 7, mats.get('#22C55E', { roughness: 0.74, flatShading: true }));
    sub1.position.set(0.56, 2.48, 0.38);
    const sub2 = makeSphere(THREE, 0.72, 9, 7, mats.get('#4ADE80', { roughness: 0.72, flatShading: true }));
    sub2.position.set(-0.55, 2.35, -0.35);
    canopyGroup.add(leaves, sub1, sub2);

    const orangeMat = mats.get('#F97316', { roughness: 0.42 });
    [
      [-0.82, 2.15, 0.78],
      [0.78, 2.3, 0.86],
      [0.12, 2.75, 0.96],
      [-0.45, 1.98, -0.92],
      [0.52, 2.82, -0.35],
    ].forEach(([ox, oy, oz]) => {
      const fruit = makeSphere(THREE, 0.17, 7, 6, orangeMat);
      fruit.position.set(ox, oy, oz);
      canopyGroup.add(fruit);
    });
  } else {
    const barkMat = mats.get('#7C4D2B', { roughness: 0.86 });
    const trunk = makeCyl(THREE, 0.22, 0.36, 1.65, 8, barkMat);
    trunk.position.y = 0.82;
    const br = makeCyl(THREE, 0.1, 0.15, 0.85, 6, barkMat);
    br.position.set(-0.3, 1.48, 0.2);
    br.rotation.z = 0.52;
    group.add(trunk, br);

    const puffs = [
      [0, 2.32, 0, 1.28, '#16A34A'],
      [-0.64, 2.52, 0.44, 0.86, '#22C55E'],
      [0.68, 2.22, -0.32, 0.82, '#15803D'],
      [0.12, 2.9, 0.12, 0.76, '#4ADE80'],
    ];
    puffs.forEach(([px, py, pz, pr, col]) => {
      const sp = makeSphere(THREE, pr, 10, 8, mats.get(col, { roughness: 0.75, flatShading: true }));
      sp.position.set(px, py, pz);
      canopyGroup.add(sp);
    });
  }

  return group;
}

/**
 * Dựng cụm hoa 3D pastel có viền gỗ/đá nhẹ
 */
function buildFlowerCluster3D(THREE, mats, x, z, color, kind) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const bed = makeCyl(THREE, 0.68, 0.75, 0.12, 8, mats.get('#A16207', { roughness: 0.85 }), false, true);
  bed.position.y = 0.06;
  const soil = makeCyl(THREE, 0.56, 0.56, 0.14, 8, mats.get('#57534E', { roughness: 0.92 }), false, true);
  soil.position.y = 0.07;
  g.add(bed, soil);

  const leafMat = mats.get('#22C55E', { roughness: 0.8 });
  const stemMat = mats.get('#16A34A', { roughness: 0.8 });
  const petalCol = kind === 'sunflower' ? '#FACC15' : kind === 'lavender' ? '#A855F7' : color;
  const petalMat = mats.get(petalCol, { roughness: 0.52 });
  const centerMat = mats.get(kind === 'sunflower' ? '#78350F' : '#FEF08A', { roughness: 0.45 });

  [[-0.26, 0.14, 0.92], [0.24, -0.16, 1.08], [0.02, 0.25, 0.84], [-0.14, -0.22, 0.9]].forEach(([ox, oz, s]) => {
    const leaf = makeCyl(THREE, 0.18 * s, 0.22 * s, 0.06, 6, leafMat, false, true);
    leaf.position.set(ox, 0.14, oz);
    g.add(leaf);

    const stem = makeCyl(THREE, 0.035, 0.04, 0.34 * s, 5, stemMat, false, false);
    stem.position.set(ox, 0.14 + 0.17 * s, oz);
    g.add(stem);

    const head = makeSphere(THREE, 0.15 * s, 7, 6, petalMat, true, false);
    head.scale.y = 0.65;
    head.position.set(ox, 0.14 + 0.36 * s, oz);
    g.add(head);

    const core = makeSphere(THREE, 0.065 * s, 6, 5, centerMat, false, false);
    core.position.set(ox, 0.14 + 0.42 * s, oz);
    g.add(core);
  });
  return g;
}

/**
 * Dựng đèn đường 3D cổ điển hiện đại (tay đèn đôi trang trí & chóa phản quang)
 */
function buildStreetLamp3D(THREE, mats, x, z, isNight) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const poleMat = mats.get('#1E293B', { roughness: 0.4, metalness: 0.45 });
  const goldMat = mats.get('#F59E0B', { roughness: 0.35, metalness: 0.5 });

  const base = makeCyl(THREE, 0.22, 0.34, 0.36, 8, poleMat);
  base.position.y = 0.18;
  const collar = makeCyl(THREE, 0.16, 0.22, 0.14, 8, goldMat);
  collar.position.y = 0.42;
  const post = makeCyl(THREE, 0.08, 0.12, 2.65, 8, poleMat);
  post.position.y = 1.75;
  const arm = makeBox(THREE, 0.62, 0.09, 0.09, poleMat);
  arm.position.set(0.28, 2.98, 0);
  const brace = makeBox(THREE, 0.42, 0.06, 0.06, goldMat);
  brace.position.set(0.18, 2.8, 0);
  brace.rotation.z = 0.65;
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.2, 8), poleMat);
  cap.position.set(0.54, 3.02, 0);
  g.add(base, collar, post, arm, brace, cap);

  const bulb = makeSphere(
    THREE,
    0.2,
    10,
    8,
    mats.get(isNight ? '#FEF08A' : '#F8FAFC', {
      roughness: 0.16,
      emissive: isNight ? '#FDE047' : null,
      emissiveIntensity: isNight ? 2.8 : 0,
    }),
    false,
    false
  );
  bulb.position.set(0.54, 2.82, 0);
  g.add(bulb);

  if (isNight) {
    const lightCone = new THREE.Mesh(
      new THREE.ConeGeometry(1.85, 2.75, 12, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xfef08a,
        transparent: true,
        opacity: 0.11,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    lightCone.position.set(0.54, 1.52, 0);
    const outerGlow = new THREE.Mesh(
      new THREE.CircleGeometry(3.4, 20),
      new THREE.MeshBasicMaterial({
        color: 0xfde047,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    outerGlow.rotation.x = -Math.PI / 2;
    outerGlow.position.set(0.54, 0.168, 0);
    const innerGlow = new THREE.Mesh(
      new THREE.CircleGeometry(1.45, 16),
      new THREE.MeshBasicMaterial({
        color: 0xfef9c3,
        transparent: true,
        opacity: 0.36,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    innerGlow.rotation.x = -Math.PI / 2;
    innerGlow.position.set(0.54, 0.174, 0);
    g.add(lightCone, outerGlow, innerGlow);
  }
  return g;
}

/**
 * Dựng ghế băng công viên vỉa hè
 */
function buildParkBench3D(THREE, mats, x, z, rotY = 0) {
  const g = new THREE.Group();
  g.position.set(x, 0.14, z);
  g.rotation.y = rotY;
  const woodMat = mats.get('#D97706', { roughness: 0.72 });
  const ironMat = mats.get('#334155', { roughness: 0.45, metalness: 0.45 });

  [-0.85, 0.85].forEach((lx) => {
    const leg = makeBox(THREE, 0.14, 0.44, 0.62, ironMat);
    leg.position.set(lx, 0.22, 0);
    const arm = makeBox(THREE, 0.12, 0.24, 0.56, ironMat);
    arm.position.set(lx, 0.54, 0.02);
    g.add(leg, arm);
  });
  const seat = makeBox(THREE, 2.0, 0.1, 0.58, woodMat);
  seat.position.set(0, 0.44, 0.06);
  const back = makeBox(THREE, 2.0, 0.46, 0.1, woodMat);
  back.position.set(0, 0.76, -0.22);
  back.rotation.x = -0.14;
  g.add(seat, back);
  return g;
}

/**
 * Helper dựng cửa sổ có khung trắng, bậu cửa & kính phản chiếu rõ khối
 */
function addFramedWindow3D(THREE, mats, parent, x, y, z, w, h, frameMat, winMat, rotY = 0) {
  const wg = new THREE.Group();
  wg.position.set(x, y, z);
  wg.rotation.y = rotY;
  const frame = makeBox(THREE, w + 0.22, h + 0.22, 0.14, frameMat, false, true);
  const pane = makeBox(THREE, w, h, 0.18, winMat, false, false);
  const mullionV = makeBox(THREE, 0.08, h + 0.04, 0.2, frameMat, false, false);
  const mullionH = makeBox(THREE, w + 0.04, 0.08, 0.2, frameMat, false, false);
  const sill = makeBox(THREE, w + 0.34, 0.1, 0.28, frameMat, true, true);
  sill.position.set(0, -h / 2 - 0.12, 0.08);
  wg.add(frame, pane, mullionV, mullionH, sill);
  parent.add(wg);
  return wg;
}

/**
 * Helper dựng cửa ra vào thụt khung, bậc tam cấp & tay nắm kim loại
 */
function addRecessedDoor3D(THREE, mats, parent, x, y, z, w, h, frameMat, doorMat, handleMat) {
  const dg = new THREE.Group();
  dg.position.set(x, y, z);
  const frame = makeBox(THREE, w + 0.32, h + 0.18, 0.2, frameMat, true, true);
  const leaf = makeBox(THREE, w, h, 0.24, doorMat, true, true);
  const step = makeBox(THREE, w + 0.6, 0.14, 0.65, mats.get('#CBD5E1', { roughness: 0.78 }), true, true);
  step.position.set(0, -h / 2 + 0.06, 0.32);
  const handle = makeSphere(THREE, 0.08, 8, 6, handleMat || mats.get('#FACC15', { roughness: 0.25, metalness: 0.65 }), false, false);
  handle.position.set(w * 0.32, -0.08, 0.16);
  dg.add(frame, leaf, step, handle);
  parent.add(dg);
  return dg;
}

/**
 * Dựng các khối mái/tháp trang trí cho 4 hình dáng building (classic / modern / pavilion / castle)
 */
function addBuildingShapeDecor3D(THREE, mats, group, shape, width, height, depth) {
  if (shape === 'modern') {
    const frameMat = mats.get('#0F172A', { roughness: 0.35, metalness: 0.3 });
    const ledMat = mats.get('#38BDF8', { roughness: 0.2, emissive: '#38BDF8', emissiveIntensity: 0.75 });
    const leftFin = makeBox(THREE, 0.45, height + 0.8, depth + 0.4, frameMat);
    leftFin.position.set(-width / 2 - 0.25, (height + 0.8) / 2, 0);
    const rightFin = makeBox(THREE, 0.45, height + 0.8, depth + 0.4, frameMat);
    rightFin.position.set(width / 2 + 0.25, (height + 0.8) / 2, 0);
    const topLed = makeBox(THREE, width + 1.0, 0.22, depth + 0.6, ledMat);
    topLed.position.set(0, height + 0.45, 0);
    group.add(leftFin, rightFin, topLed);
  } else if (shape === 'pavilion') {
    const pillarMat = mats.get('#DC2626', { roughness: 0.55 });
    const goldMat = mats.get('#FACC15', { roughness: 0.35, metalness: 0.45 });
    [-width / 2 - 0.2, width / 2 + 0.2].forEach((px) => {
      const col = makeCyl(THREE, 0.18, 0.2, height, 8, pillarMat);
      col.position.set(px, height / 2, depth / 2 - 0.2);
      const base = makeBox(THREE, 0.5, 0.25, 0.5, goldMat);
      base.position.set(px, 0.125, depth / 2 - 0.2);
      group.add(col, base);
    });
    const pagoda = new THREE.Mesh(
      new THREE.ConeGeometry(Math.max(width, depth) * 0.72, 1.5, 4),
      mats.get('#EF4444', { roughness: 0.55, flatShading: true })
    );
    pagoda.rotation.y = Math.PI / 4;
    pagoda.position.set(0, height + 0.85, 0);
    pagoda.castShadow = true;
    const finial = makeSphere(THREE, 0.24, 8, 8, goldMat);
    finial.position.set(0, height + 1.65, 0);
    group.add(pagoda, finial);
  } else if (shape === 'castle') {
    const stoneMat = mats.get('#CBD5E1', { roughness: 0.82 });
    const spireMat = mats.get('#6366F1', { roughness: 0.55, flatShading: true });
    const flagMat = mats.get('#F43F5E', { roughness: 0.5 });
    [-width / 2 - 0.35, width / 2 + 0.35].forEach((tx) => {
      const turret = makeCyl(THREE, 0.65, 0.72, height + 1.4, 8, stoneMat);
      turret.position.set(tx, (height + 1.4) / 2, 0);
      const spire = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.6, 8), spireMat);
      spire.position.set(tx, height + 2.15, 0);
      spire.castShadow = true;
      const flag = makeBox(THREE, 0.6, 0.32, 0.06, flagMat);
      flag.position.set(tx + 0.3, height + 2.85, 0);
      group.add(turret, spire, flag);
    });
    // Battlements across roof
    for (let bx = -width / 2 + 0.4; bx <= width / 2 - 0.4; bx += 0.9) {
      const merlon = makeBox(THREE, 0.45, 0.45, 0.45, stoneMat);
      merlon.position.set(bx, height + 0.22, depth / 2 - 0.2);
      group.add(merlon);
    }
  }
}

/**
 * Dựng Nhà Phố Gia Đình 3D (nền đá tương phản, phào chỉ tầng, ban công kính, mái hiên, ống khói & vườn hoa)
 */
function buildTownhouse3D(THREE, mats, x, z, style, shape, isNight) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  let wallCol = '#FFF8EE';
  let wainscotCol = '#D97706';
  let trimCol = '#FB923C';
  let roofCol = '#C2410C';
  if (style === 'modern') {
    wallCol = '#F8FAFC';
    wainscotCol = '#334155';
    trimCol = '#0EA5E9';
    roofCol = '#1E293B';
  } else if (style === 'pastel') {
    wallCol = '#ECFDF5';
    wainscotCol = '#0F766E';
    trimCol = '#2DD4BF';
    roofCol = '#EAB308';
  }
  if (shape === 'castle') {
    wallCol = '#F1F5F9';
    wainscotCol = '#475569';
    trimCol = '#6366F1';
    roofCol = '#4338CA';
  } else if (shape === 'modern') {
    wallCol = '#F8FAFC';
    wainscotCol = '#1E293B';
    trimCol = '#0284C7';
    roofCol = '#0F172A';
  } else if (shape === 'pavilion') {
    wallCol = '#FFFBEB';
    wainscotCol = '#991B1B';
    trimCol = '#F59E0B';
    roofCol = '#DC2626';
  }

  // Front paved courtyard & stone border curb
  const yard = makeBox(THREE, 11.2, 0.14, 8.0, mats.get('#E2E8F0', { roughness: 0.85 }), false, true);
  yard.position.set(0, 0.07, 0.85);
  const path = makeBox(THREE, 2.2, 0.16, 2.5, mats.get('#CBD5E1', { roughness: 0.82 }), false, true);
  path.position.set(0, 0.08, 3.6);
  g.add(yard, path);

  // Main 3-story building body + high-contrast lower plinth
  const W = 8.2;
  const H = 8.4;
  const D = 5.4;
  const plinth = makeBox(THREE, W + 0.3, 0.9, D + 0.3, mats.get(wainscotCol, { roughness: 0.72 }));
  plinth.position.set(0, 0.52, -0.4);
  const body = makeBox(THREE, W, H, D, mats.get(wallCol, { roughness: 0.75 }));
  body.position.set(0, H / 2 + 0.14, -0.4);
  g.add(plinth, body);

  // Contrasting side chimney stack
  const chimney = makeBox(THREE, 0.75, 3.2, 0.75, mats.get('#78350F', { roughness: 0.8 }));
  chimney.position.set(W / 2 - 1.0, H + 0.6, -1.6);
  const chimCap = makeBox(THREE, 0.98, 0.2, 0.98, mats.get('#451A03', { roughness: 0.7 }));
  chimCap.position.set(W / 2 - 1.0, H + 2.2, -1.6);
  g.add(chimney, chimCap);

  const trimMat = mats.get(trimCol, { roughness: 0.52 });
  const frameMat = mats.get('#FFFFFF', { roughness: 0.45 });
  const winMat = mats.get(isNight ? PASTEL_PALETTE.glassNight : PASTEL_PALETTE.glassDay, {
    roughness: 0.14,
    metalness: 0.18,
    emissive: isNight ? '#FBBF24' : null,
    emissiveIntensity: isNight ? 1.95 : 0,
  });

  // Floor ledges, glass balconies, and framed windows with flower boxes
  [2.9, 5.7].forEach((fy) => {
    const band = makeBox(THREE, W + 0.48, 0.3, D + 0.48, trimMat);
    band.position.set(0, fy, -0.4);
    g.add(band);

    const railPostMat = mats.get('#1E293B', { roughness: 0.4, metalness: 0.35 });
    const balcDeck = makeBox(THREE, 5.6, 0.16, 1.05, trimMat);
    balcDeck.position.set(0, fy + 0.18, D / 2 - 0.05);
    const balcGlass = makeBox(THREE, 5.3, 0.62, 0.1, mats.get('#7DD3FC', { roughness: 0.2, transparent: true, opacity: 0.55 }));
    balcGlass.position.set(0, fy + 0.56, D / 2 + 0.4);
    const balcRail = makeBox(THREE, 5.6, 0.08, 0.14, railPostMat);
    balcRail.position.set(0, fy + 0.88, D / 2 + 0.4);
    g.add(balcDeck, balcGlass, balcRail);

    [-2.05, 0, 2.05].forEach((wx) => {
      addFramedWindow3D(THREE, mats, g, wx, fy + 1.38, D / 2 - 0.38, 1.35, 1.35, frameMat, winMat);
    });
  });

  // Ground floor windows & recessed front door with porch columns
  [-2.55, 2.55].forEach((wx) => {
    addFramedWindow3D(THREE, mats, g, wx, 1.55, D / 2 - 0.38, 1.35, 1.35, frameMat, winMat);
    const planter = makeBox(THREE, 1.45, 0.32, 0.45, mats.get('#92400E', { roughness: 0.8 }));
    planter.position.set(wx, 0.45, D / 2 - 0.18);
    const bush = makeSphere(THREE, 0.32, 7, 6, mats.get('#22C55E', { roughness: 0.78 }));
    bush.scale.set(1.8, 0.75, 0.8);
    bush.position.set(wx, 0.68, D / 2 - 0.18);
    g.add(planter, bush);
  });

  addRecessedDoor3D(
    THREE,
    mats,
    g,
    0,
    1.28,
    D / 2 - 0.38,
    1.6,
    2.2,
    frameMat,
    mats.get(shape === 'castle' ? '#78350F' : '#6D28D9', { roughness: 0.55 })
  );
  const canopy = makeBox(THREE, 2.8, 0.24, 1.25, mats.get(roofCol, { roughness: 0.55 }));
  canopy.position.set(0, 2.6, D / 2 + 0.16);
  [-1.15, 1.15].forEach((cx) => {
    const post = makeCyl(THREE, 0.1, 0.12, 2.4, 8, frameMat);
    post.position.set(cx, 1.34, D / 2 + 0.62);
    g.add(post);
  });
  g.add(canopy);

  // Roof by shape
  if (shape === 'modern') {
    const roof = makeBox(THREE, W + 0.9, 0.65, D + 0.9, mats.get(roofCol, { roughness: 0.45 }));
    roof.position.set(0, H + 0.45, -0.4);
    const pent = makeBox(THREE, 4.4, 1.15, 3.2, mats.get('#0284C7', { roughness: 0.4 }));
    pent.position.set(-0.6, H + 1.28, -0.6);
    g.add(roof, pent);
  } else if (shape === 'classic') {
    const eaves = makeBox(THREE, W + 0.9, 0.28, D + 0.9, trimMat);
    eaves.position.set(0, H + 0.26, -0.4);
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(6.5, 2.75, 4),
      mats.get(roofCol, { roughness: 0.64, flatShading: true })
    );
    roof.rotation.y = Math.PI / 4;
    roof.position.set(0, H + 1.7, -0.4);
    roof.castShadow = true;
    const dormer = makeBox(THREE, 1.5, 1.1, 1.3, mats.get(wallCol, { roughness: 0.72 }));
    dormer.position.set(0, H + 1.0, 1.4);
    g.add(eaves, roof, dormer);
  }
  addBuildingShapeDecor3D(THREE, mats, g, shape, W, H + 0.14, D);
  if (isNight) {
    const porchLamp = makeSphere(
      THREE,
      0.18,
      8,
      6,
      mats.get('#FEF08A', { emissive: '#FDE047', emissiveIntensity: 2.4 }),
      false,
      false
    );
    porchLamp.position.set(0, 2.38, D / 2 + 0.48);
    const yardGlow = new THREE.Mesh(
      new THREE.CircleGeometry(3.8, 18),
      new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        transparent: true,
        opacity: 0.2,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    yardGlow.rotation.x = -Math.PI / 2;
    yardGlow.position.set(0, 0.17, 3.6);
    g.add(porchLamp, yardGlow);
  }
  return g;
}

/**
 * Dựng 10 công trình cửa hàng / khu chức năng 3D sắc nét, tương phản rõ & thể hiện đúng chức năng
 */
function buildShopBuilding3D(THREE, mats, x, z, type, shape, isNight) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  // Paved terrace + dark curb rim for contrast
  const curb = makeBox(THREE, 11.2, 0.1, 8.0, mats.get('#94A3B8', { roughness: 0.85 }), false, true);
  curb.position.set(0, 0.05, 0.5);
  const terrace = makeBox(THREE, 10.8, 0.16, 7.6, mats.get('#F1F5F9', { roughness: 0.85 }), false, true);
  terrace.position.set(0, 0.08, 0.5);
  g.add(curb, terrace);

  const frameMat = mats.get('#FFFFFF', { roughness: 0.45 });
  const darkFrameMat = mats.get('#1E293B', { roughness: 0.45 });
  const winMat = mats.get(isNight ? '#FEF08A' : '#7DD3FC', {
    roughness: 0.14,
    metalness: 0.15,
    emissive: isNight ? '#FBBF24' : null,
    emissiveIntensity: isNight ? 1.9 : 0,
  });

  if (type === 'supermarket') {
    const plinth = makeBox(THREE, 9.6, 0.85, 5.5, mats.get('#C2410C', { roughness: 0.7 }));
    plinth.position.set(0, 0.55, -0.3);
    const body = makeBox(THREE, 9.2, 4.1, 5.2, mats.get('#FFFDF5', { roughness: 0.76 }));
    body.position.set(0, 2.25, -0.3);
    const fascia = makeBox(
      THREE,
      9.8,
      1.15,
      5.7,
      mats.get('#EA580C', { roughness: 0.5, emissive: isNight ? '#EA580C' : null, emissiveIntensity: isNight ? 0.52 : 0 })
    );
    fascia.position.set(0, 4.82, -0.3);
    const roofRim = makeBox(THREE, 10.1, 0.25, 6.0, mats.get('#9A3412', { roughness: 0.5 }));
    roofRim.position.set(0, 5.48, -0.3);
    g.add(plinth, body, fascia, roofRim);

    // Striped canopy awning
    for (let i = 0; i < 8; i++) {
      const stripe = makeBox(
        THREE,
        1.12,
        0.32,
        1.35,
        mats.get(i % 2 === 0 ? '#EF4444' : '#FFFFFF', { roughness: 0.55 })
      );
      stripe.position.set(-3.92 + i * 1.12, 3.35, 2.75);
      stripe.rotation.x = 0.26;
      g.add(stripe);
    }

    // Sliding glass double doors + flanked display windows
    addRecessedDoor3D(THREE, mats, g, 0, 1.45, 2.28, 2.5, 2.4, darkFrameMat, winMat);
    [-3.05, 3.05].forEach((wx) => addFramedWindow3D(THREE, mats, g, wx, 1.8, 2.28, 1.9, 1.5, frameMat, winMat));

    // Giant 3D Shopping Cart Roof Sign!
    const cartMat = mats.get('#FACC15', { roughness: 0.3, metalness: 0.45 });
    const basket = makeBox(THREE, 1.75, 0.95, 1.15, cartMat);
    basket.position.set(0, 6.3, 0.5);
    const handle = makeBox(THREE, 0.22, 0.8, 1.15, mats.get('#EF4444', { roughness: 0.45 }));
    handle.position.set(-0.98, 6.55, 0.5);
    [-0.55, 0.55].forEach((cx) => {
      const wheel = makeCyl(THREE, 0.2, 0.2, 0.16, 10, darkFrameMat);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(cx, 5.72, 0.9);
      g.add(wheel);
    });
    g.add(basket, handle);

    // Produce crates beside front terrace
    ['#EF4444', '#22C55E', '#FACC15'].forEach((fc, fi) => {
      const crate = makeBox(THREE, 0.82, 0.45, 0.72, mats.get('#92400E', { roughness: 0.8 }));
      crate.position.set(-3.4 + fi * 0.95, 0.38, 3.05);
      const fruit = makeSphere(THREE, 0.26, 8, 6, mats.get(fc, { roughness: 0.45 }));
      fruit.position.set(-3.4 + fi * 0.95, 0.66, 3.05);
      g.add(crate, fruit);
    });

    addBuildingShapeDecor3D(THREE, mats, g, shape, 9.2, 5.5, 5.2);
  } else if (type === 'cross_world') {
    const plinth = makeBox(THREE, 10.2, 0.45, 6.4, mats.get('#1E1B4B', { roughness: 0.6 }));
    plinth.position.set(0, 0.35, -0.2);
    const body = makeBox(THREE, 9.2, 4.5, 5.2, mats.get('#312E81', { roughness: 0.55 }));
    body.position.set(0, 2.7, -0.3);
    const roofTrim = makeBox(THREE, 9.8, 0.55, 5.8, mats.get('#F59E0B', { roughness: 0.3, metalness: 0.5 }));
    roofTrim.position.set(0, 5.15, -0.3);
    g.add(plinth, body, roofTrim);

    const goldMat = mats.get('#FACC15', { roughness: 0.25, metalness: 0.6 });
    [-3.7, 3.7].forEach((px) => {
      const pil = makeCyl(THREE, 0.42, 0.52, 4.6, 8, goldMat);
      pil.position.set(px, 2.75, 2.35);
      const orb = makeSphere(THREE, 0.46, 10, 8, mats.get('#38BDF8', { emissive: '#38BDF8', emissiveIntensity: 0.9 }));
      orb.position.set(px, 5.4, 2.35);
      g.add(pil, orb);
    });

    const portalRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.62, 0.24, 10, 24),
      mats.get('#FACC15', { roughness: 0.25, metalness: 0.6, emissive: '#F59E0B', emissiveIntensity: 0.65 })
    );
    portalRing.position.set(0, 2.68, 2.52);
    const portalCore = new THREE.Mesh(
      new THREE.CircleGeometry(1.42, 20),
      mats.get('#38BDF8', { roughness: 0.1, emissive: '#7C3AED', emissiveIntensity: 0.95, side: THREE.DoubleSide })
    );
    portalCore.position.set(0, 2.68, 2.48);
    // Floating diamond crystal above portal
    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.78, 0),
      mats.get('#22D3EE', { roughness: 0.15, emissive: '#06B6D4', emissiveIntensity: 0.8 })
    );
    crystal.position.set(0, 6.45, 0.6);
    g.userData.portalRing = portalRing;
    g.userData.floatingCrystal = crystal;
    g.add(portalRing, portalCore, crystal);
    addBuildingShapeDecor3D(THREE, mats, g, shape, 9.2, 5.2, 5.2);
  } else if (type === 'pet_shop') {
    const plinth = makeBox(THREE, 9.4, 0.75, 5.6, mats.get('#0F766E', { roughness: 0.7 }));
    plinth.position.set(0, 0.5, -0.3);
    const body = makeBox(THREE, 9.0, 4.0, 5.2, mats.get('#FFF7ED', { roughness: 0.76 }));
    body.position.set(0, 2.2, -0.3);
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(6.8, 1.9, 4),
      mats.get('#F59E0B', { roughness: 0.55, flatShading: true })
    );
    roof.rotation.y = Math.PI / 4;
    roof.position.set(0, 5.15, -0.3);
    roof.castShadow = true;
    const fascia = makeBox(THREE, 9.5, 0.55, 5.6, mats.get('#0D9488', { roughness: 0.5 }));
    fascia.position.set(0, 4.25, -0.3);
    g.add(plinth, body, fascia, roof);

    for (let i = 0; i < 6; i++) {
      const aw = makeBox(THREE, 1.45, 0.28, 1.2, mats.get(i % 2 === 0 ? '#FBBF24' : '#F472B6', { roughness: 0.55 }));
      aw.position.set(-3.62 + i * 1.45, 3.2, 2.72);
      aw.rotation.x = 0.24;
      g.add(aw);
    }
    addRecessedDoor3D(THREE, mats, g, 0, 1.4, 2.28, 1.8, 2.25, frameMat, mats.get('#EC4899', { roughness: 0.55 }));
    [-2.8, 2.8].forEach((wx) => addFramedWindow3D(THREE, mats, g, wx, 1.75, 2.28, 1.8, 1.4, frameMat, winMat));

    // Giant roof paw emblem + floating golden pet egg
    const pawPad = makeCyl(THREE, 0.65, 0.65, 0.28, 12, mats.get('#F472B6', { roughness: 0.45 }));
    pawPad.rotation.x = Math.PI / 2;
    pawPad.position.set(-2.2, 4.65, 2.58);
    g.add(pawPad);
    [-0.5, 0, 0.5].forEach((px, pi) => {
      const toe = makeSphere(THREE, 0.22, 8, 6, mats.get('#F472B6', { roughness: 0.45 }));
      toe.position.set(-2.2 + px, 5.25 + (pi === 1 ? 0.14 : 0), 2.62);
      g.add(toe);
    });
    const egg = makeSphere(THREE, 0.78, 12, 10, mats.get('#FDE047', { roughness: 0.3 }));
    egg.scale.set(0.85, 1.25, 0.85);
    egg.position.set(2.2, 5.7, 0.6);
    g.userData.floatingEgg = egg;
    g.add(egg);

    // Outdoor doghouse beside entrance!
    const dhBase = makeBox(THREE, 1.15, 0.9, 1.15, mats.get('#B45309', { roughness: 0.78 }));
    dhBase.position.set(-3.7, 0.6, 3.15);
    const dhRoof = new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.7, 4), mats.get('#EF4444', { roughness: 0.6, flatShading: true }));
    dhRoof.rotation.y = Math.PI / 4;
    dhRoof.position.set(-3.7, 1.35, 3.15);
    g.add(dhBase, dhRoof);

    addBuildingShapeDecor3D(THREE, mats, g, shape, 9.0, 4.9, 5.2);
  } else if (type === 'arcade') {
    const body = makeBox(THREE, 9.0, 4.8, 5.4, mats.get('#0F172A', { roughness: 0.42, metalness: 0.2 }));
    body.position.set(0, 2.54, -0.3);
    const sideAccent = makeBox(THREE, 9.3, 0.7, 5.7, mats.get('#7C3AED', { roughness: 0.35, emissive: '#6D28D9', emissiveIntensity: isNight ? 1.05 : 0.4 }));
    sideAccent.position.set(0, 5.1, -0.3);
    const marquee = makeBox(THREE, 8.2, 1.05, 0.72, mats.get('#F43F5E', { roughness: 0.3, emissive: '#E11D48', emissiveIntensity: isNight ? 1.35 : 0.6 }));
    marquee.position.set(0, 4.45, 2.48);
    const screen = makeBox(THREE, 5.4, 1.85, 0.25, mats.get('#14B8A6', { roughness: 0.15, emissive: '#2DD4BF', emissiveIntensity: isNight ? 1.25 : 0.55 }));
    screen.position.set(0, 2.7, 2.44);
    const deck = makeBox(THREE, 7.2, 0.42, 1.15, mats.get('#FACC15', { roughness: 0.4 }));
    deck.position.set(0, 1.48, 2.8);
    g.add(body, sideAccent, marquee, screen, deck);

    // Giant 3D Joystick & buttons on roof!
    const jBase = makeBox(THREE, 2.4, 0.36, 1.6, mats.get('#334155', { roughness: 0.4 }));
    jBase.position.set(0, 5.6, 0.4);
    const jStick = makeCyl(THREE, 0.14, 0.16, 1.15, 8, mats.get('#E2E8F0', { metalness: 0.6, roughness: 0.25 }));
    jStick.position.set(-0.55, 6.25, 0.4);
    const jBall = makeSphere(THREE, 0.42, 10, 8, mats.get('#EF4444', { roughness: 0.25, emissive: '#EF4444', emissiveIntensity: 0.3 }));
    jBall.position.set(-0.55, 6.95, 0.4);
    g.add(jBase, jStick, jBall);

    ['#EF4444', '#38BDF8', '#4ADE80'].forEach((bc, bi) => {
      const btn = makeCyl(THREE, 0.24, 0.24, 0.26, 10, mats.get(bc, { roughness: 0.3, emissive: bc, emissiveIntensity: 0.45 }));
      btn.position.set(-2.1 + bi * 0.72, 1.78, 2.95);
      g.add(btn);
    });
    addRecessedDoor3D(THREE, mats, g, 2.4, 1.25, 2.42, 1.45, 2.1, mats.get('#38BDF8', { emissive: '#0EA5E9', emissiveIntensity: 0.4 }), mats.get('#1E293B'));
    addBuildingShapeDecor3D(THREE, mats, g, shape, 9.0, 5.3, 5.4);
  } else if (type === 'lab') {
    const plinth = makeBox(THREE, 9.5, 0.7, 5.7, mats.get('#0F172A', { roughness: 0.45, metalness: 0.2 }));
    plinth.position.set(0, 0.45, -0.3);
    const body = makeBox(THREE, 9.0, 3.8, 5.4, mats.get('#F8FAFC', { roughness: 0.55 }));
    body.position.set(0, 2.1, -0.3);
    const band = makeBox(THREE, 9.4, 0.85, 5.7, mats.get('#0284C7', { roughness: 0.4 }));
    band.position.set(0, 4.15, -0.3);
    const dome = makeSphere(
      THREE,
      2.35,
      14,
      10,
      mats.get('#38BDF8', { roughness: 0.14, transparent: true, opacity: 0.62, emissive: '#0284C7', emissiveIntensity: 0.32 })
    );
    dome.position.set(-0.8, 4.55, -0.3);
    const mast = makeCyl(THREE, 0.08, 0.12, 1.5, 8, mats.get('#94A3B8', { metalness: 0.7, roughness: 0.3 }));
    mast.position.set(-0.8, 7.25, -0.3);
    const beacon = makeSphere(THREE, 0.3, 10, 8, mats.get('#22D3EE', { emissive: '#22D3EE', emissiveIntensity: 1.1 }));
    beacon.position.set(-0.8, 8.0, -0.3);
    g.userData.beacon = beacon;

    // Giant bubbling green Erlenmeyer flask on right roof wing!
    const flaskBody = new THREE.Mesh(
      new THREE.ConeGeometry(0.85, 1.35, 12),
      mats.get('#4ADE80', { roughness: 0.25, emissive: '#22C55E', emissiveIntensity: 0.45 })
    );
    flaskBody.position.set(2.6, 5.2, 0.2);
    const flaskNeck = makeCyl(THREE, 0.24, 0.28, 0.75, 10, mats.get('#E0F2FE', { roughness: 0.2, transparent: true, opacity: 0.75 }));
    flaskNeck.position.set(2.6, 6.05, 0.2);
    g.add(plinth, body, band, dome, mast, beacon, flaskBody, flaskNeck);

    addRecessedDoor3D(THREE, mats, g, 0, 1.35, 2.38, 1.9, 2.3, darkFrameMat, winMat);
    [-2.9, 2.9].forEach((wx) => addFramedWindow3D(THREE, mats, g, wx, 2.25, 2.38, 1.8, 1.4, darkFrameMat, winMat));
    addBuildingShapeDecor3D(THREE, mats, g, shape, 9.0, 4.6, 5.4);
  } else if (type === 'flea_market') {
    const deck = makeBox(THREE, 9.8, 0.38, 6.0, mats.get('#FEF3C7', { roughness: 0.85 }));
    deck.position.set(0, 0.28, -0.2);
    g.add(deck);
    const stallCols = ['#FB923C', '#34D399', '#38BDF8', '#F472B6'];
    const crateCols = ['#EF4444', '#FACC15', '#8B5CF6', '#EC4899'];
    for (let i = 0; i < 4; i++) {
      const sx = -3.3 + i * 2.2;
      const counter = makeBox(THREE, 1.88, 1.15, 1.45, mats.get('#B47B48', { roughness: 0.82 }));
      counter.position.set(sx, 0.9, 0.8);
      const cloth = makeBox(THREE, 1.94, 0.28, 1.5, mats.get(stallCols[i], { roughness: 0.6 }));
      cloth.position.set(sx, 1.48, 0.8);
      const goods = makeSphere(THREE, 0.28, 8, 6, mats.get(crateCols[i], { roughness: 0.5 }));
      goods.position.set(sx - 0.35, 1.75, 0.85);
      const box2 = makeBox(THREE, 0.45, 0.38, 0.45, mats.get('#FDE047', { roughness: 0.55 }));
      box2.position.set(sx + 0.38, 1.78, 0.8);

      const canopy = new THREE.Mesh(
        new THREE.ConeGeometry(1.48, 1.15, 4),
        mats.get(stallCols[i], { roughness: 0.62, flatShading: true })
      );
      canopy.rotation.y = Math.PI / 4;
      canopy.position.set(sx, 3.2, 0.4);
      canopy.castShadow = true;
      const post = makeCyl(THREE, 0.08, 0.08, 2.6, 6, mats.get('#78350F', { roughness: 0.85 }));
      post.position.set(sx, 1.75, 0.1);
      g.add(counter, cloth, goods, box2, canopy, post);
    }
    const sign = makeBox(THREE, 8.8, 0.82, 0.45, mats.get('#B45309', { roughness: 0.55 }));
    sign.position.set(0, 4.35, 1.65);
    g.add(sign);
    if (isNight) {
      for (let bi = -3.6; bi <= 3.6; bi += 1.2) {
        const festoon = makeSphere(THREE, 0.14, 7, 6, mats.get('#FEF08A', { emissive: '#FACC15', emissiveIntensity: 2.3 }), false, false);
        festoon.position.set(bi, 3.85, 1.65);
        g.add(festoon);
      }
    }
  } else if (type === 'english') {
    const plinth = makeBox(THREE, 9.5, 0.72, 5.6, mats.get('#0F766E', { roughness: 0.7 }));
    plinth.position.set(0, 0.46, -0.3);
    const body = makeBox(THREE, 9.0, 4.2, 5.2, mats.get('#F8FAFC', { roughness: 0.76 }));
    body.position.set(0, 2.25, -0.3);
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(6.9, 2.2, 4),
      mats.get('#0F766E', { roughness: 0.6, flatShading: true })
    );
    roof.rotation.y = Math.PI / 4;
    roof.position.set(0, 5.45, -0.3);
    roof.castShadow = true;
    g.add(plinth, body, roof);

    const colMat = mats.get('#FFFFFF', { roughness: 0.55 });
    [-3.7, -1.7, 1.7, 3.7].forEach((cx) => {
      const col = makeCyl(THREE, 0.24, 0.28, 3.9, 8, colMat);
      col.position.set(cx, 2.3, 2.38);
      g.add(col);
    });
    addRecessedDoor3D(THREE, mats, g, 0, 1.4, 2.28, 1.85, 2.3, mats.get('#0F766E'), mats.get('#D97706', { roughness: 0.6 }));
    [-2.7, 2.7].forEach((wx) => addFramedWindow3D(THREE, mats, g, wx, 2.3, 2.28, 1.25, 1.6, mats.get('#0F766E'), winMat));

    // Clock cupola + open giant book crest!
    const clockRim = makeCyl(THREE, 0.78, 0.78, 0.22, 16, mats.get('#F59E0B', { roughness: 0.35, metalness: 0.5 }));
    clockRim.rotation.x = Math.PI / 2;
    clockRim.position.set(0, 5.05, 2.34);
    const clockFace = makeCyl(THREE, 0.62, 0.62, 0.26, 16, mats.get('#FFFFFF', { roughness: 0.35 }));
    clockFace.rotation.x = Math.PI / 2;
    clockFace.position.set(0, 5.05, 2.36);
    const gradCap = makeBox(THREE, 1.5, 0.16, 1.5, mats.get('#1E293B', { roughness: 0.45 }));
    gradCap.position.set(0, 6.65, -0.3);
    gradCap.rotation.y = Math.PI / 4;
    g.add(clockRim, clockFace, gradCap);
    addBuildingShapeDecor3D(THREE, mats, g, shape, 9.0, 4.5, 5.2);
  } else if (type === 'fashion') {
    const plinth = makeBox(THREE, 9.3, 0.65, 5.4, mats.get('#9D174D', { roughness: 0.65 }));
    plinth.position.set(0, 0.4, -0.3);
    const body = makeBox(THREE, 8.8, 4.3, 5.0, mats.get('#FFF1F2', { roughness: 0.75 }));
    body.position.set(0, 2.3, -0.3);
    const header = makeBox(THREE, 9.4, 0.92, 5.45, mats.get('#DB2777', { roughness: 0.48 }));
    header.position.set(0, 4.82, -0.3);
    const crown = makeCyl(THREE, 0.95, 0.68, 0.8, 6, mats.get('#FACC15', { roughness: 0.25, metalness: 0.6 }));
    crown.position.set(0, 5.65, 0.8);
    const carpet = makeBox(THREE, 2.0, 0.06, 2.2, mats.get('#E11D48', { roughness: 0.8 }), false, true);
    carpet.position.set(0, 0.18, 3.2);
    g.add(plinth, body, header, crown, carpet);

    addRecessedDoor3D(THREE, mats, g, 0, 1.38, 2.18, 1.65, 2.25, mats.get('#FACC15'), winMat);
    // Display windows with mini mannequins inside!
    [-2.55, 2.55].forEach((wx, wi) => {
      const showcase = makeBox(THREE, 2.1, 2.45, 0.45, winMat);
      showcase.position.set(wx, 1.75, 2.24);
      const mannequin = makeCyl(
        THREE,
        0.22,
        0.48,
        1.25,
        8,
        mats.get(wi === 0 ? '#EC4899' : '#8B5CF6', { roughness: 0.5 })
      );
      mannequin.position.set(wx, 1.5, 2.46);
      const mHead = makeSphere(THREE, 0.2, 8, 6, mats.get('#FDE68A', { roughness: 0.5 }));
      mHead.position.set(wx, 2.3, 2.46);
      g.add(showcase, mannequin, mHead);
    });
    addBuildingShapeDecor3D(THREE, mats, g, shape, 8.8, 5.2, 5.0);
  } else if (type === 'salon') {
    const plinth = makeBox(THREE, 9.0, 0.65, 5.4, mats.get('#5B21B6', { roughness: 0.65 }));
    plinth.position.set(0, 0.4, -0.3);
    const body = makeBox(THREE, 8.6, 4.2, 5.0, mats.get('#FAF5FF', { roughness: 0.74 }));
    body.position.set(0, 2.25, -0.3);
    const header = makeBox(THREE, 9.2, 0.92, 5.45, mats.get('#7C3AED', { roughness: 0.48 }));
    header.position.set(0, 4.72, -0.3);
    g.add(plinth, body, header);

    addRecessedDoor3D(THREE, mats, g, 0, 1.38, 2.18, 1.65, 2.25, frameMat, winMat);
    [-2.45, 2.45].forEach((wx) => addFramedWindow3D(THREE, mats, g, wx, 1.9, 2.18, 1.9, 1.5, frameMat, winMat));

    // Twin spinning Barber Poles!
    [-4.55, 4.55].forEach((bx, bi) => {
      const poleGroup = new THREE.Group();
      poleGroup.position.set(bx, 2.2, 2.3);
      const pCore = makeCyl(THREE, 0.24, 0.24, 1.95, 10, mats.get('#FFFFFF', { roughness: 0.35 }));
      const rBand = makeCyl(THREE, 0.26, 0.26, 0.38, 10, mats.get('#EF4444', { roughness: 0.4 }));
      rBand.position.y = 0.48;
      const bBand = makeCyl(THREE, 0.26, 0.26, 0.38, 10, mats.get('#3B82F6', { roughness: 0.4 }));
      bBand.position.y = -0.48;
      const capTop = makeSphere(THREE, 0.26, 8, 6, mats.get('#CBD5E1', { metalness: 0.6, roughness: 0.3 }));
      capTop.position.y = 1.05;
      poleGroup.add(pCore, rBand, bBand, capTop);
      if (bi === 0) g.userData.barberPole = poleGroup;
      g.add(poleGroup);
    });
    // Giant mirror roof crest
    const mirrorRim = makeCyl(THREE, 0.85, 0.85, 0.22, 16, mats.get('#FACC15', { metalness: 0.55, roughness: 0.25 }));
    mirrorRim.rotation.x = Math.PI / 2;
    mirrorRim.position.set(0, 5.65, 0.8);
    const mirrorGlass = makeCyl(THREE, 0.68, 0.68, 0.26, 16, mats.get('#BAE6FD', { roughness: 0.1, metalness: 0.4 }));
    mirrorGlass.rotation.x = Math.PI / 2;
    mirrorGlass.position.set(0, 5.65, 0.82);
    g.add(mirrorRim, mirrorGlass);

    addBuildingShapeDecor3D(THREE, mats, g, shape, 8.6, 5.1, 5.0);
  } else if (type === 'zoo') {
    // Detailed Safari Zoo Compound with stone arch gate, striped awning, giraffe beside acacia tree, elephant, lion & pond
    const grassMat = mats.get('#86EFAC', { roughness: 0.88 });
    const dirtPathMat = mats.get('#FDE68A', { roughness: 0.9 });
    const lawn = makeBox(THREE, 13.6, 0.2, 9.2, grassMat, false, true);
    lawn.position.set(0, 0.1, -0.35);
    const walkway = makeBox(THREE, 3.2, 0.22, 5.2, dirtPathMat, false, true);
    walkway.position.set(0, 0.12, 1.4);
    const lionRock = makeCyl(THREE, 1.5, 1.9, 0.42, 8, mats.get('#CBD5E1', { roughness: 0.85 }), true, true);
    lionRock.position.set(3.2, 0.28, -2.0);
    const pond = makeCyl(THREE, 1.65, 1.75, 0.14, 18, mats.get('#38BDF8', { roughness: 0.14, metalness: 0.12 }), false, true);
    pond.position.set(0.3, 0.16, -2.1);
    const pondRim = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.16, 7, 18), mats.get('#94A3B8', { roughness: 0.85 }));
    pondRim.rotation.x = Math.PI / 2;
    pondRim.position.set(0.3, 0.2, -2.1);
    g.add(lawn, walkway, lionRock, pond, pondRim);

    // Timber log palisade fence wrapping front, left, and right
    const postMat = mats.get('#78350F', { roughness: 0.84 });
    const railMat = mats.get('#B45309', { roughness: 0.82 });
    for (let fx = -6.2; fx <= 6.2; fx += 1.24) {
      if (Math.abs(fx) < 2.15) continue;
      const post = makeCyl(THREE, 0.16, 0.18, 1.4, 7, postMat);
      post.position.set(fx, 0.72, 4.0);
      g.add(post);
    }
    [-4.35, 4.35].forEach((rx) => {
      [0.58, 1.05].forEach((ry) => {
        const hRail = makeBox(THREE, 4.0, 0.14, 0.12, railMat);
        hRail.position.set(rx, ry, 4.0);
        g.add(hRail);
      });
    });
    [-6.4, 6.4].forEach((sx) => {
      for (let fz = -4.2; fz <= 3.8; fz += 1.6) {
        const sp = makeCyl(THREE, 0.15, 0.17, 1.35, 7, postMat);
        sp.position.set(sx, 0.7, fz);
        g.add(sp);
      }
      const sRail = makeBox(THREE, 0.12, 0.14, 8.2, railMat);
      sRail.position.set(sx, 0.95, -0.2);
      g.add(sRail);
    });

    // Grand Safari Entrance Gate with "ZOO" board & striped awning
    const stonePillarMat = mats.get('#A8A29E', { roughness: 0.8 });
    [-2.45, 2.45].forEach((px) => {
      const base = makeBox(THREE, 1.15, 0.65, 1.15, stonePillarMat);
      base.position.set(px, 0.35, 3.6);
      const col = makeBox(THREE, 0.85, 3.8, 0.85, postMat);
      col.position.set(px, 2.35, 3.6);
      const cap = makeBox(THREE, 1.08, 0.28, 1.08, mats.get('#FACC15', { roughness: 0.45 }));
      cap.position.set(px, 4.32, 3.6);
      g.add(base, col, cap);
    });
    const archBeam = makeBox(THREE, 6.5, 1.18, 1.05, mats.get('#15803D', { roughness: 0.58 }));
    archBeam.position.set(0, 4.88, 3.6);
    const archTrim = makeBox(THREE, 6.85, 0.22, 1.2, mats.get('#FACC15', { roughness: 0.45 }));
    archTrim.position.set(0, 5.5, 3.6);
    g.add(archBeam, archTrim);
    // "ZOO" CanvasTexture Plaque
    const zCanvas = document.createElement('canvas');
    zCanvas.width = 512;
    zCanvas.height = 128;
    const zc = zCanvas.getContext('2d');
    if (zc) {
      zc.fillStyle = '#14532D';
      zc.fillRect(0, 0, 512, 128);
      zc.strokeStyle = '#FACC15';
      zc.lineWidth = 8;
      zc.strokeRect(8, 8, 496, 112);
      zc.fillStyle = '#FEF08A';
      zc.font = 'bold 74px sans-serif';
      zc.textAlign = 'center';
      zc.textBaseline = 'middle';
      zc.fillText('SAFARI ZOO', 256, 66);
    }
    const zTex = new THREE.CanvasTexture(zCanvas);
    zTex.colorSpace = THREE.SRGBColorSpace;
    const zPlaque = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.96), new THREE.MeshStandardMaterial({ map: zTex, roughness: 0.4 }));
    zPlaque.position.set(0, 4.88, 4.14);
    g.add(zPlaque);
    for (let ai = 0; ai < 6; ai++) {
      const aw = makeBox(THREE, 0.72, 0.18, 1.0, mats.get(ai % 2 === 0 ? '#EF4444' : '#FFFFFF', { roughness: 0.5 }));
      aw.position.set(-1.8 + ai * 0.72, 3.95, 4.28);
      aw.rotation.x = 0.35;
      g.add(aw);
    }

    // Acacia Safari Tree on Left
    const aTrunk = makeCyl(THREE, 0.2, 0.32, 2.7, 7, postMat);
    aTrunk.position.set(-4.9, 1.35, -2.5);
    const aCanopy1 = makeCyl(THREE, 1.9, 1.2, 0.55, 10, mats.get('#16A34A', { roughness: 0.72 }));
    aCanopy1.position.set(-4.9, 2.95, -2.5);
    const aCanopy2 = makeCyl(THREE, 1.25, 0.85, 0.45, 9, mats.get('#4ADE80', { roughness: 0.7 }));
    aCanopy2.position.set(-4.1, 3.25, -2.1);
    g.add(aTrunk, aCanopy1, aCanopy2);

    // 1. Detailed Spotted Giraffe (-3.2, z=0.2)
    const girMat = mats.get('#FBBF24', { roughness: 0.65 });
    const spotMat = mats.get('#92400E', { roughness: 0.75 });
    const gBody = makeSphere(THREE, 0.58, 10, 8, girMat);
    gBody.scale.set(0.88, 0.85, 1.4);
    gBody.position.set(-3.4, 1.28, -0.2);
    [[-3.7, 0.4], [-3.1, 0.4], [-3.7, -0.75], [-3.1, -0.75]].forEach(([lx, lz]) => {
      const gl = makeCyl(THREE, 0.08, 0.07, 1.1, 7, girMat);
      gl.position.set(lx, 0.62, lz);
      g.add(gl);
    });
    const gNeck = makeCyl(THREE, 0.14, 0.22, 1.95, 8, girMat);
    gNeck.position.set(-3.4, 2.35, 0.45);
    gNeck.rotation.x = 0.18;
    const gHead = makeSphere(THREE, 0.24, 10, 8, girMat);
    gHead.scale.set(0.9, 0.85, 1.45);
    gHead.position.set(-3.4, 3.32, 0.74);
    [-0.08, 0.08].forEach((hx) => {
      const oss = makeCyl(THREE, 0.03, 0.035, 0.22, 6, spotMat);
      oss.position.set(-3.4 + hx, 3.55, 0.64);
      g.add(oss);
    });
    [[-3.68, 1.4, 0.1], [-3.1, 1.35, -0.45], [-3.35, 2.25, 0.58], [-3.46, 2.75, 0.6]].forEach(([sx, sy, sz]) => {
      const sp = makeSphere(THREE, 0.11, 7, 6, spotMat);
      sp.position.set(sx, sy, sz);
      g.add(sp);
    });
    g.add(gBody, gNeck, gHead);

    // 2. Cute Grey Elephant with Big Ears, White Tusks & Curved Trunk (center-right)
    const eleMat = mats.get('#94A3B8', { roughness: 0.7 });
    const tuskMat = mats.get('#FFFBEB', { roughness: 0.35 });
    const eBody = makeSphere(THREE, 0.72, 12, 9, eleMat);
    eBody.scale.set(1.0, 0.92, 1.25);
    eBody.position.set(0.35, 1.05, 0.15);
    [[-0.02, 0.65], [0.72, 0.65], [-0.02, -0.35], [0.72, -0.35]].forEach(([lx, lz]) => {
      const el = makeCyl(THREE, 0.17, 0.19, 0.72, 8, eleMat);
      el.position.set(lx, 0.44, lz);
      g.add(el);
    });
    const eHead = makeSphere(THREE, 0.5, 12, 9, eleMat);
    eHead.position.set(0.35, 1.32, 0.92);
    [-0.14, 0.84].forEach((ex) => {
      const ear = makeCyl(THREE, 0.42, 0.38, 0.1, 10, eleMat);
      ear.rotation.z = Math.PI / 2;
      ear.rotation.y = ex < 0.35 ? 0.35 : -0.35;
      ear.position.set(ex, 1.38, 0.82);
      g.add(ear);
    });
    const eTrunk = new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(0.35, 1.22, 1.35),
          new THREE.Vector3(0.35, 0.98, 1.65),
          new THREE.Vector3(0.35, 0.72, 1.55),
          new THREE.Vector3(0.35, 0.82, 1.82),
        ]),
        10,
        0.11,
        7,
        false
      ),
      eleMat
    );
    [-0.18, 0.18].forEach((tx) => {
      const tusk = makeCone(THREE, 0.055, 0.36, 7, tuskMat);
      tusk.rotation.x = Math.PI * 0.42;
      tusk.position.set(0.35 + tx, 1.06, 1.46);
      g.add(tusk);
    });
    g.add(eBody, eHead, eTrunk);

    // 3. Golden-Maned Lion resting on Boulder (right)
    const lionMat = mats.get('#F59E0B', { roughness: 0.65 });
    const maneMat = mats.get('#9A3412', { roughness: 0.75 });
    const lBody = makeSphere(THREE, 0.46, 10, 8, lionMat);
    lBody.scale.set(0.95, 0.82, 1.35);
    lBody.position.set(3.2, 0.86, -1.9);
    const lMane = makeSphere(THREE, 0.44, 10, 8, maneMat);
    lMane.position.set(3.2, 1.18, -1.28);
    const lHead = makeSphere(THREE, 0.3, 10, 8, lionMat);
    lHead.position.set(3.2, 1.18, -1.12);
    g.add(lBody, lMane, lHead);
  } else if (type === 'church') {
    // Clean Protestant Church across 4 architectural shapes:
    // ONLY "TIN LÀNH" signboard at peak + empty Golden Cross directly above, ZERO images/icons/statues.
    const whiteMat = mats.get('#FFFFFF', { roughness: 0.62 });
    const creamStoneMat = mats.get('#F1F5F9', { roughness: 0.72 });
    const trimMat = mats.get('#CBD5E1', { roughness: 0.68 });
    const slateRoofMat = mats.get(
      shape === 'modern' ? '#1E293B' : shape === 'pavilion' ? '#991B1B' : shape === 'castle' ? '#312E81' : '#334155',
      { roughness: 0.68 }
    );
    const darkSignMat = mats.get('#0F172A', { roughness: 0.4 });
    const brassMat = mats.get('#FACC15', { roughness: 0.22, metalness: 0.7 });
    const doorWoodMat = mats.get('#78350F', { roughness: 0.68 });
    const hedgeMat = mats.get('#16A34A', { roughness: 0.78 });

    // Larger stepped stone entrance & wide courtyard plinth
    const basePad = makeBox(THREE, 12.0, 0.32, 7.6, creamStoneMat);
    basePad.position.set(0, 0.22, -0.2);
    const step1 = makeBox(THREE, 5.2, 0.22, 1.6, trimMat);
    step1.position.set(0, 0.2, 3.7);
    const step2 = makeBox(THREE, 4.2, 0.22, 1.1, trimMat);
    step2.position.set(0, 0.4, 3.25);
    g.add(basePad, step1, step2);

    // Main Sanctuary Hall (larger & grander)
    const sanctuary = makeBox(THREE, 10.6, 4.9, 6.2, whiteMat);
    sanctuary.position.set(0, 2.75, -0.45);
    const cornice = makeBox(THREE, 11.1, 0.28, 6.65, trimMat);
    cornice.position.set(0, 5.22, -0.45);
    g.add(sanctuary, cornice);

    // Clear Frosted Lancet/Atrium Nave Windows (zero icons/images)
    [-3.6, 3.6].forEach((wx) => {
      addFramedWindow3D(THREE, mats, g, wx, 2.75, 2.66, 1.4, 2.6, slateRoofMat, winMat);
      addFramedWindow3D(THREE, mats, g, wx > 0 ? 5.32 : -5.32, 2.75, -0.45, 1.35, 2.4, slateRoofMat, winMat, Math.PI / 2);
    });
    addRecessedDoor3D(THREE, mats, g, 0, 1.78, 2.66, 2.35, 2.75, darkSignMat, doorWoodMat);

    // Flanking Cypress Hedges & Sanctuary Lamps
    [-4.9, 4.9].forEach((hx) => {
      const pot = makeBox(THREE, 0.9, 0.38, 0.9, trimMat);
      pot.position.set(hx, 0.45, 3.3);
      const cyp = makeCone(THREE, 0.42, 1.65, 8, hedgeMat);
      cyp.position.set(hx, 1.38, 3.3);
      const lampPost = makeCyl(THREE, 0.08, 0.11, 2.1, 7, darkSignMat);
      lampPost.position.set(hx * 0.56, 1.3, 3.25);
      const lampBulb = makeSphere(
        THREE,
        0.18,
        8,
        8,
        mats.get(isNight ? '#FEF08A' : '#F8FAFC', {
          emissive: isNight ? '#FDE047' : null,
          emissiveIntensity: isNight ? 2.4 : 0,
        }),
        false,
        false
      );
      lampBulb.position.set(hx * 0.56, 2.45, 3.25);
      g.add(pot, cyp, lampPost, lampBulb);
      if (isNight) {
        const stepGlow = new THREE.Mesh(
          new THREE.CircleGeometry(2.1, 14),
          new THREE.MeshBasicMaterial({
            color: 0xfde047,
            transparent: true,
            opacity: 0.24,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          })
        );
        stepGlow.rotation.x = -Math.PI / 2;
        stepGlow.position.set(hx * 0.56, 0.24, 3.25);
        g.add(stepGlow);
      }
    });

    let signY = 7.95;
    let signZ = 1.85;
    let crossY = 9.4;

    if (shape === 'modern') {
      // Modern Glass Atrium + Asymmetrical Cantilever Canopy & Tall Minimalist Tower
      const timberMat = mats.get('#B45309', { roughness: 0.65 });
      const atriumGlass = makeBox(THREE, 4.4, 4.4, 0.45, winMat);
      atriumGlass.position.set(0, 3.05, 2.58);
      const canopyRoof = makeBox(THREE, 12.2, 0.34, 7.6, slateRoofMat);
      canopyRoof.position.set(0, 5.48, -0.2);
      canopyRoof.rotation.z = -0.045;
      [-4.8, -2.2, 2.2, 4.8].forEach((bx) => {
        const fin = makeBox(THREE, 0.3, 5.3, 0.65, timberMat);
        fin.position.set(bx, 2.85, 2.85);
        g.add(fin);
      });
      const tower = makeBox(THREE, 3.8, 3.0, 2.1, creamStoneMat);
      tower.position.set(0, 6.75, 1.7);
      const towerCap = makeBox(THREE, 4.2, 0.25, 2.4, slateRoofMat);
      towerCap.position.set(0, 8.32, 1.7);
      g.add(atriumGlass, canopyRoof, tower, towerCap);
      signY = 8.95;
      signZ = 1.9;
      crossY = 10.45;
    } else if (shape === 'pavilion') {
      // Colonial Domed Sanctuary with Arched Portico Columns & Octagonal White Cupola
      const porticoRoof = makeBox(THREE, 6.4, 0.32, 1.9, slateRoofMat);
      porticoRoof.position.set(0, 4.45, 3.3);
      [-2.5, -1.35, 1.35, 2.5].forEach((cx) => {
        const col = makeCyl(THREE, 0.19, 0.22, 4.0, 10, whiteMat);
        col.position.set(cx, 2.35, 3.85);
        g.add(col);
      });
      const hipRoof = makeCone(THREE, 6.4, 2.0, 4, slateRoofMat);
      hipRoof.rotation.y = Math.PI / 4;
      hipRoof.scale.set(1.45, 1.0, 0.94);
      hipRoof.position.set(0, 6.18, -0.45);
      const drum = makeCyl(THREE, 2.15, 2.3, 1.85, 8, whiteMat);
      drum.position.set(0, 7.15, 0.85);
      const dome = makeSphere(THREE, 2.1, 14, 10, slateRoofMat);
      dome.scale.set(1, 0.72, 1);
      dome.position.set(0, 8.05, 0.85);
      g.add(porticoRoof, hipRoof, drum, dome);
      signY = 8.75;
      signZ = 1.85;
      crossY = 10.25;
    } else if (shape === 'castle') {
      // Twin-Spire Reformed Grand Sanctuary
      const gable = makeCone(THREE, 5.8, 2.55, 4, slateRoofMat);
      gable.rotation.y = Math.PI / 4;
      gable.scale.set(1.46, 1.0, 0.92);
      gable.position.set(0, 6.42, -0.45);
      g.add(gable);
      [-5.1, 5.1].forEach((tx) => {
        const towerBody = makeBox(THREE, 1.75, 7.2, 2.1, creamStoneMat);
        towerBody.position.set(tx, 3.85, 2.15);
        const spire = makeCone(THREE, 1.35, 2.6, 4, slateRoofMat);
        spire.rotation.y = Math.PI / 4;
        spire.position.set(tx, 8.75, 2.15);
        g.add(towerBody, spire);
      });
      const centerPeak = makeBox(THREE, 3.9, 2.6, 2.2, whiteMat);
      centerPeak.position.set(0, 6.3, 1.65);
      const centerRoof = makeCone(THREE, 2.7, 1.75, 4, slateRoofMat);
      centerRoof.rotation.y = Math.PI / 4;
      centerRoof.position.set(0, 8.4, 1.65);
      g.add(centerPeak, centerRoof);
      signY = 8.95;
      signZ = 2.05;
      crossY = 10.45;
    } else {
      // 'classic' — Columned White Front Portico + Pitched Nave + Stepped Spire Tower
      [-2.35, -1.3, 1.3, 2.35].forEach((cx) => {
        const col = makeCyl(THREE, 0.17, 0.21, 4.5, 10, whiteMat);
        col.position.set(cx, 2.6, 3.15);
        const cap = makeBox(THREE, 0.48, 0.2, 0.48, trimMat);
        cap.position.set(cx, 4.9, 3.15);
        g.add(col, cap);
      });
      const porticoLintel = makeBox(THREE, 5.8, 0.35, 1.35, whiteMat);
      porticoLintel.position.set(0, 5.12, 3.05);
      const gableRoof = makeCone(THREE, 5.8, 2.5, 4, slateRoofMat);
      gableRoof.rotation.y = Math.PI / 4;
      gableRoof.scale.set(1.45, 1.0, 0.94);
      gableRoof.position.set(0, 6.4, -0.45);
      const steepleBase = makeBox(THREE, 3.8, 2.4, 2.2, whiteMat);
      steepleBase.position.set(0, 6.3, 1.55);
      const steepleCap = makeBox(THREE, 4.1, 0.25, 2.45, slateRoofMat);
      steepleCap.position.set(0, 7.55, 1.55);
      const steepleUpper = makeBox(THREE, 2.6, 1.25, 1.75, creamStoneMat);
      steepleUpper.position.set(0, 8.2, 1.55);
      g.add(porticoLintel, gableRoof, steepleBase, steepleCap, steepleUpper);
      signY = 8.45;
      signZ = 1.85;
      crossY = 9.95;
    }

    // Top Steeple Signboard: STRICTLY ONLY the 2 words "TIN LÀNH"
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 512;
    signCanvas.height = 128;
    const sCtx = signCanvas.getContext('2d');
    if (sCtx) {
      sCtx.fillStyle = '#0F172A';
      sCtx.fillRect(0, 0, 512, 128);
      sCtx.strokeStyle = '#FACC15';
      sCtx.lineWidth = 7;
      sCtx.strokeRect(8, 8, 496, 112);
      sCtx.fillStyle = '#FACC15';
      sCtx.font = 'bold 68px sans-serif';
      sCtx.textAlign = 'center';
      sCtx.textBaseline = 'middle';
      sCtx.fillText('TIN LÀNH', 256, 66);
    }
    const signTex = new THREE.CanvasTexture(signCanvas);
    signTex.colorSpace = THREE.SRGBColorSpace;
    const signPlateMat = new THREE.MeshStandardMaterial({
      map: signTex,
      roughness: 0.35,
      emissive: isNight ? new THREE.Color('#FACC15') : new THREE.Color(0x000000),
      emissiveMap: isNight ? signTex : null,
      emissiveIntensity: isNight ? 0.65 : 0,
    });
    const signBack = makeBox(THREE, 3.7, 0.98, 0.24, darkSignMat);
    signBack.position.set(0, signY, signZ);
    const signFront = new THREE.Mesh(new THREE.PlaneGeometry(3.52, 0.86), signPlateMat);
    signFront.position.set(0, signY, signZ + 0.13);
    const signRear = new THREE.Mesh(new THREE.PlaneGeometry(3.52, 0.86), signPlateMat);
    signRear.rotation.y = Math.PI;
    signRear.position.set(0, signY, signZ - 0.13);
    g.add(signBack, signFront, signRear);

    // Plain Golden Cross (Thập tự giá) directly above "TIN LÀNH" — zero images/icons/statues
    const crossMat = isNight
      ? mats.get('#FEF08A', { roughness: 0.22, metalness: 0.4, emissive: '#FACC15', emissiveIntensity: 0.85 })
      : brassMat;
    const crossVert = makeBox(THREE, 0.26, 2.0, 0.24, crossMat);
    crossVert.position.set(0, crossY, signZ);
    const crossHoriz = makeBox(THREE, 1.32, 0.26, 0.24, crossMat);
    crossHoriz.position.set(0, crossY + 0.35, signZ);
    g.add(crossVert, crossHoriz);
  }
  if (isNight) {
    const spillColor =
      type === 'arcade'
        ? 0xe879f9
        : type === 'cross_world'
          ? 0x38bdf8
          : type === 'lab'
            ? 0x22d3ee
            : type === 'fashion'
              ? 0xf472b6
              : type === 'salon'
                ? 0xa78bfa
                : 0xfbbf24;
    const frontSpill = new THREE.Mesh(
      new THREE.CircleGeometry(4.4, 20),
      new THREE.MeshBasicMaterial({
        color: spillColor,
        transparent: true,
        opacity: 0.2,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    frontSpill.rotation.x = -Math.PI / 2;
    frontSpill.position.set(0, 0.175, type === 'zoo' ? 4.3 : 3.2);
    g.add(frontSpill);
  }
  return g;
}

/**
 * Dựng 4 khu vực ngoài trời: Công viên Tiếng Anh, Đài Phun Nước, Góc Đọc Sách, Sân Bóng Đá
 */
function buildOutdoorLandmark3D(THREE, mats, type, x, z, isNight = false) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  if (type === 'eng_park') {
    // Lush vibrant English Park: manicured lawn, stone circle plaza, octagonal gazebo, chalkboard, 5 varied trees, flowerbeds & butterflies
    const lawn = makeCyl(THREE, 5.2, 5.35, 0.16, 24, mats.get('#4ADE80', { roughness: 0.88 }), false, true);
    lawn.position.y = 0.08;
    const innerPlaza = makeCyl(THREE, 3.65, 3.75, 0.2, 22, mats.get('#FEF3C7', { roughness: 0.82 }), false, true);
    innerPlaza.position.y = 0.1;
    const stoneTrim = new THREE.Mesh(new THREE.TorusGeometry(3.72, 0.14, 7, 24), mats.get('#CBD5E1', { roughness: 0.78 }));
    stoneTrim.rotation.x = Math.PI / 2;
    stoneTrim.position.y = 0.2;
    g.add(lawn, innerPlaza, stoneTrim);

    // Teal Octagonal Park Gazebo on Back Left
    const gazX = -2.2;
    const gazZ = -2.0;
    const woodMat = mats.get('#92400E', { roughness: 0.75 });
    const gazDeck = makeCyl(THREE, 1.75, 1.85, 0.28, 8, mats.get('#E2E8F0', { roughness: 0.78 }));
    gazDeck.position.set(gazX, 0.24, gazZ);
    g.add(gazDeck);
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      const post = makeCyl(THREE, 0.08, 0.09, 2.25, 7, woodMat);
      post.position.set(gazX + Math.cos(ang) * 1.45, 1.45, gazZ + Math.sin(ang) * 1.45);
      g.add(post);
    }
    const gazRoof = makeCone(THREE, 2.05, 1.25, 8, mats.get('#0EA5E9', { roughness: 0.55 }));
    gazRoof.position.set(gazX, 3.15, gazZ);
    const gazFin = makeSphere(THREE, 0.16, 8, 8, mats.get('#FACC15', { roughness: 0.3 }));
    gazFin.position.set(gazX, 3.82, gazZ);
    g.add(gazDeck, gazRoof, gazFin);

    // Readable "SPEAK ENGLISH!" Chalkboard Sign on Right
    const boardPostL = makeBox(THREE, 0.2, 2.35, 0.2, woodMat);
    boardPostL.position.set(0.3, 1.2, -1.2);
    const boardPostR = makeBox(THREE, 0.2, 2.35, 0.2, woodMat);
    boardPostR.position.set(3.1, 1.2, -1.2);
    const boardFrame = makeBox(THREE, 3.25, 1.65, 0.2, mats.get('#B45309', { roughness: 0.7 }));
    boardFrame.position.set(1.7, 2.0, -1.2);
    const eCanvas = document.createElement('canvas');
    eCanvas.width = 512;
    eCanvas.height = 256;
    const ec = eCanvas.getContext('2d');
    if (ec) {
      ec.fillStyle = '#14532D';
      ec.fillRect(0, 0, 512, 256);
      ec.fillStyle = '#FEF08A';
      ec.font = 'bold 54px sans-serif';
      ec.textAlign = 'center';
      ec.fillText('ENGLISH PARK', 256, 98);
      ec.fillStyle = '#FFFFFF';
      ec.font = 'bold 36px sans-serif';
      ec.fillText('Hello! Speak & Play', 256, 175);
    }
    const eTex = new THREE.CanvasTexture(eCanvas);
    eTex.colorSpace = THREE.SRGBColorSpace;
    const boardFace = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 1.32), new THREE.MeshStandardMaterial({ map: eTex, roughness: 0.55 }));
    boardFace.position.set(1.7, 2.0, -1.08);
    g.add(boardPostL, boardPostR, boardFrame, boardFace);

    // 5 Diverse Lush Trees & 4 Raised Flowerbeds + 2 Benches + 2 Park Lamps
    [
      [-4.2, 1.1, 'sakura'],
      [4.2, -1.2, 'oak'],
      [3.9, 2.4, 'orange'],
      [-3.9, -3.5, 'pine'],
      [1.2, -4.1, 'sakura'],
    ].forEach(([tx, tz, tk]) => {
      const tr = buildTree3D(THREE, mats, tk, tx, tz, false);
      tr.scale.setScalar(0.88);
      g.add(tr);
    });
    [
      [-2.6, 2.7, '#F43F5E', 'tulip'],
      [2.6, 2.7, '#FACC15', 'sunflower'],
      [0, -3.3, '#A855F7', 'lavender'],
    ].forEach(([fx, fz, col, kind]) => g.add(buildFlowerCluster3D(THREE, mats, fx, fz, col, kind)));
    g.add(buildParkBench3D(THREE, mats, -0.4, 2.25, 0));
    g.add(buildParkBench3D(THREE, mats, 2.6, 1.15, -Math.PI / 3));
    g.add(buildStreetLamp3D(THREE, mats, -3.5, 3.0, isNight));
    g.add(buildStreetLamp3D(THREE, mats, 3.6, 0.2, isNight));
    if (isNight) {
      const gazLantern = makeSphere(
        THREE,
        0.22,
        8,
        6,
        mats.get('#FEF08A', { emissive: '#FDE047', emissiveIntensity: 2.5 }),
        false,
        false
      );
      gazLantern.position.set(gazX, 2.48, gazZ);
      const gazGlow = new THREE.Mesh(
        new THREE.CircleGeometry(2.6, 16),
        new THREE.MeshBasicMaterial({
          color: 0xfde047,
          transparent: true,
          opacity: 0.22,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      gazGlow.rotation.x = -Math.PI / 2;
      gazGlow.position.set(gazX, 0.39, gazZ);
      g.add(gazLantern, gazGlow);
    }

    // Animated fluttering butterflies
    const butterflies = [];
    ['#F472B6', '#FACC15', '#38BDF8', '#A855F7'].forEach((bCol, bi) => {
      const bf = new THREE.Group();
      const bMat = mats.get(bCol, { roughness: 0.35, side: THREE.DoubleSide });
      const wL = makeBox(THREE, 0.16, 0.02, 0.12, bMat, false, false);
      wL.position.x = -0.08;
      const wR = makeBox(THREE, 0.16, 0.02, 0.12, bMat, false, false);
      wR.position.x = 0.08;
      bf.add(wL, wR);
      bf.userData = { angle: bi * 1.6, radius: 1.5 + bi * 0.45, baseY: 1.45 + bi * 0.2 };
      g.add(bf);
      butterflies.push(bf);
    });
    g.userData.butterflies = butterflies;
  } else if (type === 'fountain_plaza') {
    // Grand 3-Tier Marble Fountain with arching water jets & rising/falling droplets
    const plaza = makeCyl(THREE, 7.2, 7.45, 0.18, 28, mats.get('#FEF3C7', { roughness: 0.82 }), false, true);
    plaza.position.y = 0.09;
    const innerRing = makeCyl(THREE, 4.9, 4.9, 0.2, 28, mats.get('#E2E8F0', { roughness: 0.78 }), false, true);
    innerRing.position.y = 0.1;
    const marbleMat = mats.get('#F8FAFC', { roughness: 0.45 });
    const stoneTrimMat = mats.get('#CBD5E1', { roughness: 0.58 });
    const waterMat = mats.get('#0EA5E9', {
      roughness: 0.1,
      metalness: 0.15,
      emissive: isNight ? '#0284C7' : null,
      emissiveIntensity: isNight ? 0.65 : 0,
      transparent: true,
      opacity: 0.86,
    });
    const streamMat = mats.get('#BAE6FD', {
      roughness: 0.08,
      emissive: '#38BDF8',
      emissiveIntensity: isNight ? 1.15 : 0.42,
      transparent: true,
      opacity: 0.88,
    });

    const basinOuter = makeCyl(THREE, 3.65, 3.9, 0.78, 22, stoneTrimMat);
    basinOuter.position.y = 0.46;
    const basinLip = new THREE.Mesh(new THREE.TorusGeometry(3.68, 0.16, 8, 24), marbleMat);
    basinLip.rotation.x = Math.PI / 2;
    basinLip.position.y = 0.86;
    const waterPool = makeCyl(THREE, 3.4, 3.4, 0.62, 22, waterMat);
    waterPool.position.y = 0.48;

    // Central Column & 2 Upper Catch Bowls
    const basePed = makeCyl(THREE, 0.72, 0.95, 1.55, 14, marbleMat);
    basePed.position.y = 1.15;
    const midBowl = makeCyl(THREE, 1.85, 0.72, 0.52, 18, marbleMat);
    midBowl.position.y = 2.02;
    const midWater = makeCyl(THREE, 1.65, 1.65, 0.16, 18, waterMat);
    midWater.position.y = 2.24;
    const upperPed = makeCyl(THREE, 0.42, 0.58, 1.25, 12, marbleMat);
    upperPed.position.y = 2.82;
    const topBowl = makeCyl(THREE, 1.05, 0.38, 0.38, 16, marbleMat);
    topBowl.position.y = 3.45;
    const topFinial = makeSphere(THREE, 0.34, 10, 8, mats.get('#E0F2FE', { roughness: 0.25 }));
    topFinial.position.y = 3.72;
    g.add(plaza, innerRing, basinOuter, basinLip, waterPool, basePed, midBowl, midWater, upperPed, topBowl, topFinial);

    // Tall Central Vertical Water Jet Plume & Splash Froth
    const mainPlume = makeCyl(THREE, 0.22, 0.12, 1.85, 10, streamMat, false, false);
    mainPlume.position.y = 4.68;
    const sprayCrown = makeSphere(THREE, 0.62, 10, 8, mats.get('#F0F9FF', { roughness: 0.15, emissive: '#BAE6FD', emissiveIntensity: 0.45, transparent: true, opacity: 0.88 }), false, false);
    sprayCrown.position.y = 5.55;
    g.userData.waterSpray = sprayCrown;
    g.add(mainPlume, sprayCrown);

    // Curved Parabolic Water Streams: 8 Top->Mid + 12 Mid->Pool
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(Math.cos(a) * 0.22, 3.85, Math.sin(a) * 0.22),
        new THREE.Vector3(Math.cos(a) * 0.92, 4.35, Math.sin(a) * 0.92),
        new THREE.Vector3(Math.cos(a) * 1.48, 2.28, Math.sin(a) * 1.48),
      ]);
      g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.052, 6, false), streamMat));
    }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + 0.15;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(Math.cos(a) * 1.68, 2.26, Math.sin(a) * 1.68),
        new THREE.Vector3(Math.cos(a) * 2.45, 2.58, Math.sin(a) * 2.45),
        new THREE.Vector3(Math.cos(a) * 2.95, 0.78, Math.sin(a) * 2.95),
      ]);
      g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.056, 6, false), streamMat));
    }

    // Animated Water Droplets & Ripple Rings
    const waterDroplets = [];
    for (let d = 0; d < 16; d++) {
      const drop = makeSphere(THREE, 0.1, 7, 6, streamMat, false, false);
      drop.userData = { phase: (d / 16) * Math.PI * 2, ang: (d / 16) * Math.PI * 2 * 3, radius: 0.45 + (d % 4) * 0.68 };
      g.add(drop);
      waterDroplets.push(drop);
    }
    g.userData.waterDroplets = waterDroplets;

    const waterRipples = [1.85, 2.65].map((rr, ri) => {
      const ring = new THREE.Mesh(new THREE.RingGeometry(rr, rr + 0.14, 24), streamMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.81;
      ring.userData = { phase: ri * Math.PI };
      g.add(ring);
      return ring;
    });
    g.userData.waterRipples = waterRipples;

    // 4 Benches + 4 Flower Urns + 4 Plaza Lamps around perimeter
    [0, Math.PI / 2, Math.PI, -Math.PI / 2].forEach((ang) => {
      g.add(buildParkBench3D(THREE, mats, Math.sin(ang) * 5.65, Math.cos(ang) * 5.65, ang));
    });
    [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4].forEach((ang) => {
      g.add(buildFlowerCluster3D(THREE, mats, Math.sin(ang) * 5.65, Math.cos(ang) * 5.65, '#F43F5E', 'tulip'));
      g.add(buildStreetLamp3D(THREE, mats, Math.sin(ang) * 6.5, Math.cos(ang) * 6.5, isNight));
    });
  } else if (type === 'reading_corner') {
    // Rich Outdoor Reading Corner: Timber Pergola with climbing vines & fairy lights, stocked colorful Bookcase, Study Table with open book & mug, cushioned benches
    const timberMat = mats.get('#B45309', { roughness: 0.78 });
    const darkWoodMat = mats.get('#78350F', { roughness: 0.78 });
    const deck = makeBox(THREE, 11.8, 0.2, 7.4, mats.get('#FDE68A', { roughness: 0.8 }), false, true);
    deck.position.y = 0.1;
    const deckTrim = makeBox(THREE, 12.2, 0.14, 7.8, timberMat, false, true);
    deckTrim.position.y = 0.07;
    const rug = makeBox(THREE, 6.2, 0.04, 4.4, mats.get('#99F6E4', { roughness: 0.88 }), false, true);
    rug.position.set(0.4, 0.22, 0.4);
    g.add(deckTrim, deck, rug);

    // Timber Pergola Frame + Vines & Warm Fairy Bulbs
    [[-4.4, -2.5], [4.4, -2.5], [-4.4, 2.5], [4.4, 2.5]].forEach(([px, pz]) => {
      const post = makeBox(THREE, 0.28, 3.6, 0.28, darkWoodMat);
      post.position.set(px, 1.9, pz);
      g.add(post);
    });
    [-2.5, 2.5].forEach((rz) => {
      const beam = makeBox(THREE, 9.6, 0.24, 0.28, darkWoodMat);
      beam.position.set(0, 3.7, rz);
      g.add(beam);
    });
    for (let rx = -4.0; rx <= 4.0; rx += 1.0) {
      const rafter = makeBox(THREE, 0.16, 0.2, 5.6, timberMat);
      rafter.position.set(rx, 3.9, 0);
      g.add(rafter);
      if (Math.abs(rx) % 2 === 0) {
        const bulb = makeSphere(
          THREE,
          0.11,
          7,
          6,
          mats.get('#FEF08A', { emissive: '#FACC15', emissiveIntensity: isNight ? 2.2 : 0.9 }),
          false,
          false
        );
        bulb.position.set(rx, 3.68, 2.45);
        g.add(bulb);
      }
    }
    // Climbing Vine Greenery across top
    [[-3.6, 4.05, -1.6], [-2.2, 4.08, 1.2], [2.4, 4.08, -1.4], [3.5, 4.05, 1.5]].forEach(([vx, vy, vz]) => {
      const vine = makeSphere(THREE, 0.62, 8, 6, mats.get('#22C55E', { roughness: 0.78 }));
      vine.scale.set(1.5, 0.45, 1.2);
      vine.position.set(vx, vy, vz);
      g.add(vine);
    });

    // Multi-Shelf Bookcase Filled with Colorful Individual Books & Miniature Globe
    const caseBody = makeBox(THREE, 3.6, 2.75, 0.78, darkWoodMat);
    caseBody.position.set(-2.45, 1.55, -1.75);
    g.add(caseBody);
    const bookCols = ['#EF4444', '#3B82F6', '#FACC15', '#22C55E', '#A855F7', '#F97316', '#EC4899'];
    [0.85, 1.55, 2.25].forEach((sy, rowIdx) => {
      const shelfPlank = makeBox(THREE, 3.3, 0.08, 0.84, timberMat);
      shelfPlank.position.set(-2.45, sy, -1.72);
      g.add(shelfPlank);
      for (let bi = 0; bi < 10; bi++) {
        const bh = 0.4 + ((bi + rowIdx) % 3) * 0.08;
        const book = makeBox(THREE, 0.24, bh, 0.42, mats.get(bookCols[(bi + rowIdx * 2) % bookCols.length], { roughness: 0.55 }));
        book.position.set(-3.8 + bi * 0.3, sy + 0.04 + bh / 2, -1.52);
        g.add(book);
      }
    });
    const globeStand = makeCyl(THREE, 0.14, 0.18, 0.16, 8, mats.get('#FACC15', { roughness: 0.35 }));
    globeStand.position.set(-3.4, 3.02, -1.75);
    const globe = makeSphere(THREE, 0.28, 10, 8, mats.get('#0EA5E9', { roughness: 0.4 }));
    globe.position.set(-3.4, 3.35, -1.75);
    g.add(globeStand, globe);

    // Study Table with Open Curved Book, Tea Mug & Warm Reading Lamp
    const tableTop = makeBox(THREE, 2.8, 0.14, 1.65, mats.get('#D97706', { roughness: 0.65 }));
    tableTop.position.set(1.85, 0.96, 0.25);
    [[0.65, -0.45], [3.05, -0.45], [0.65, 0.95], [3.05, 0.95]].forEach(([lx, lz]) => {
      const leg = makeCyl(THREE, 0.07, 0.07, 0.82, 7, darkWoodMat);
      leg.position.set(lx, 0.55, lz);
      g.add(leg);
    });
    const pageMat = mats.get('#FFFBEB', { roughness: 0.6 });
    const coverMat = mats.get('#0284C7', { roughness: 0.55 });
    const bookCover = makeBox(THREE, 1.04, 0.06, 0.72, coverMat);
    bookCover.position.set(1.65, 1.06, 0.25);
    [-0.24, 0.24].forEach((px) => {
      const page = makeBox(THREE, 0.45, 0.08, 0.64, pageMat);
      page.position.set(1.65 + px, 1.11, 0.25);
      page.rotation.z = px < 0 ? 0.16 : -0.16;
      g.add(page);
    });
    const lampBase = makeCyl(THREE, 0.14, 0.16, 0.08, 8, mats.get('#FACC15', { roughness: 0.35 }));
    lampBase.position.set(2.75, 1.07, -0.2);
    const lampNeck = makeCyl(THREE, 0.03, 0.03, 0.48, 6, mats.get('#FACC15', { roughness: 0.35 }));
    lampNeck.position.set(2.75, 1.32, -0.2);
    const lampShade = makeCone(
      THREE,
      0.24,
      0.24,
      10,
      mats.get('#FDE047', { emissive: '#FACC15', emissiveIntensity: isNight ? 1.85 : 0.55 })
    );
    lampShade.position.set(2.68, 1.56, -0.15);
    const mug = makeCyl(THREE, 0.1, 0.09, 0.18, 10, mats.get('#F43F5E', { roughness: 0.4 }));
    mug.position.set(0.85, 1.12, 0.45);
    g.add(tableTop, bookCover, lampBase, lampNeck, lampShade, mug);
    if (isNight) {
      const deckGlow = new THREE.Mesh(
        new THREE.CircleGeometry(4.2, 18),
        new THREE.MeshBasicMaterial({
          color: 0xfde047,
          transparent: true,
          opacity: 0.2,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      deckGlow.rotation.x = -Math.PI / 2;
      deckGlow.position.set(0.8, 0.25, 0.4);
      g.add(deckGlow);
    }

    // 2 Cushioned Benches + Potted Ferns
    g.add(buildParkBench3D(THREE, mats, 1.85, 1.95, 0));
    g.add(buildParkBench3D(THREE, mats, -2.3, 1.25, Math.PI * 0.25));
    [[-5.0, 2.7, '#EC4899', 'hibiscus'], [5.0, -2.6, '#FACC15', 'sunflower']].forEach(([fx, fz, col, kind]) =>
      g.add(buildFlowerCluster3D(THREE, mats, fx, fz, col, kind))
    );
  } else if (type === 'soccer') {
    const W = 17.0;
    const D = 10.5;
    for (let i = 0; i < 8; i++) {
      const strip = makeBox(
        THREE,
        W / 8,
        0.1,
        D,
        mats.get(i % 2 === 0 ? '#16A34A' : '#22C55E', { roughness: 0.88 }),
        false,
        true
      );
      strip.position.set(-W / 2 + (i + 0.5) * (W / 8), 0.05, 0);
      g.add(strip);
    }
    const lineMat = mats.get('#FFFFFF', { roughness: 0.6 });
    const topLine = makeBox(THREE, W, 0.04, 0.18, lineMat, false, true);
    topLine.position.set(0, 0.11, -D / 2 + 0.1);
    const botLine = makeBox(THREE, W, 0.04, 0.18, lineMat, false, true);
    botLine.position.set(0, 0.11, D / 2 - 0.1);
    const midLine = makeBox(THREE, 0.18, 0.04, D, lineMat, false, true);
    midLine.position.set(0, 0.11, 0);
    const centerRing = new THREE.Mesh(new THREE.RingGeometry(1.5, 1.68, 24), lineMat);
    centerRing.rotation.x = -Math.PI / 2;
    centerRing.position.y = 0.12;
    g.add(topLine, botLine, midLine, centerRing);

    // 4 Stadium Floodlight Towers at corners
    const towerMat = mats.get('#475569', { roughness: 0.4, metalness: 0.45 });
    const floodMat = mats.get('#FEF9C3', { emissive: '#FEF08A', emissiveIntensity: isNight ? 2.5 : 0.9 });
    [
      [-W / 2 - 0.6, -D / 2 - 0.6],
      [W / 2 + 0.6, -D / 2 - 0.6],
      [-W / 2 - 0.6, D / 2 + 0.6],
      [W / 2 + 0.6, D / 2 + 0.6],
    ].forEach(([tx, tz]) => {
      const mast = makeCyl(THREE, 0.14, 0.18, 4.2, 8, towerMat);
      mast.position.set(tx, 2.1, tz);
      const panel = makeBox(THREE, 0.9, 0.45, 0.25, floodMat);
      panel.position.set(tx, 4.25, tz);
      g.add(mast, panel);
      if (isNight) {
        const pitchGlow = new THREE.Mesh(
          new THREE.CircleGeometry(5.6, 18),
          new THREE.MeshBasicMaterial({
            color: 0xfef9c3,
            transparent: true,
            opacity: 0.16,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          })
        );
        pitchGlow.rotation.x = -Math.PI / 2;
        pitchGlow.position.set(tx * 0.48, 0.125, tz * 0.48);
        g.add(pitchGlow);
      }
    });

    // 3D Goal Frames (Left & Right)
    const postMat = mats.get('#F8FAFC', { roughness: 0.35 });
    const netMat = mats.get('#E2E8F0', { roughness: 0.7, transparent: true, opacity: 0.45 });
    [-W / 2 - 0.4, W / 2 + 0.4].forEach((gx) => {
      const cross = makeBox(THREE, 0.16, 0.16, 3.2, postMat);
      cross.position.set(gx, 1.5, 0);
      const p1 = makeBox(THREE, 0.16, 1.5, 0.16, postMat);
      p1.position.set(gx, 0.75, -1.55);
      const p2 = makeBox(THREE, 0.16, 1.5, 0.16, postMat);
      p2.position.set(gx, 0.75, 1.55);
      const net = makeBox(THREE, 0.8, 1.4, 3.0, netMat, false, false);
      net.position.set(gx + (gx < 0 ? -0.35 : 0.35), 0.75, 0);
      g.add(cross, p1, p2, net);
    });

    const ball = makeSphere(THREE, 0.38, 12, 10, mats.get('#FFFFFF', { roughness: 0.4 }));
    ball.position.set(0, 0.45, 0);
    g.userData.soccerBall = ball;
    g.add(ball);
  }

  return g;
}

/**
 * Dựng phương tiện giao thông 3D Low-poly chi tiết (mâm xe bạc, kính chắn gió, gương hậu, đèn pha/hậu, người lái)
 */
function buildVehicle3D(THREE, mats, carData, isNight = false) {
  const g = new THREE.Group();
  const kind = carData.kind || 'car';
  const bodyMat = mats.get(carData.color || '#FF6B6B', { roughness: 0.36, metalness: 0.16 });
  const tireMat = mats.get('#0F172A', { roughness: 0.85 });
  const rimMat = mats.get('#E2E8F0', { roughness: 0.28, metalness: 0.65 });
  const glassMat = isNight
    ? mats.get('#FDE68A', { roughness: 0.14, emissive: '#F59E0B', emissiveIntensity: 0.45 })
    : mats.get('#BAE6FD', { roughness: 0.12, metalness: 0.22 });
  const bumperMat = mats.get('#CBD5E1', { roughness: 0.4, metalness: 0.35 });
  const headLightMat = mats.get(isNight ? '#FEF9C3' : '#FEF08A', {
    emissive: '#FDE047',
    emissiveIntensity: isNight ? 2.8 : 0.75,
  });
  const tailLightMat = mats.get('#EF4444', {
    emissive: '#DC2626',
    emissiveIntensity: isNight ? 2.2 : 0.6,
  });

  const addWheel = (wx, wz, r = 0.33, width = 0.22) => {
    const wg = new THREE.Group();
    wg.position.set(wx, r, wz);
    const tire = makeCyl(THREE, r, r, width, 12, tireMat);
    tire.rotation.x = Math.PI / 2;
    const rim = makeCyl(THREE, r * 0.56, r * 0.56, width + 0.03, 10, rimMat);
    rim.rotation.x = Math.PI / 2;
    wg.add(tire, rim);
    g.add(wg);
  };

  let frontX = 1.55;
  let rearX = -1.55;
  let beamSpread = 1.1;

  if (kind === 'bus') {
    frontX = 2.02;
    rearX = -2.02;
    beamSpread = 1.35;
    const skirt = makeBox(THREE, 4.05, 0.25, 1.68, bumperMat);
    skirt.position.y = 0.38;
    const hull = makeBox(THREE, 3.9, 1.48, 1.58, bodyMat);
    hull.position.y = 1.15;
    const roofTrim = makeBox(THREE, 3.6, 0.14, 1.38, mats.get('#FFFFFF', { roughness: 0.5 }));
    roofTrim.position.y = 1.94;
    const sideWin = makeBox(THREE, 3.25, 0.62, 1.62, isNight ? mats.get('#FEF08A', { emissive: '#FBBF24', emissiveIntensity: 1.25 }) : glassMat);
    sideWin.position.y = 1.4;
    const windshield = makeBox(THREE, 0.16, 0.72, 1.38, glassMat);
    windshield.position.set(1.92, 1.36, 0);
    const hl = makeBox(THREE, 0.12, 0.2, 1.2, headLightMat, false, false);
    hl.position.set(1.98, 0.68, 0);
    const tl = makeBox(THREE, 0.12, 0.2, 1.2, tailLightMat, false, false);
    tl.position.set(-1.98, 0.68, 0);
    g.add(skirt, hull, roofTrim, sideWin, windshield, hl, tl);
    [-1.25, 1.25].forEach((wx) => [-0.8, 0.8].forEach((wz) => addWheel(wx, wz, 0.37, 0.24)));
  } else if (kind === 'truck') {
    frontX = 1.86;
    rearX = -1.86;
    beamSpread = 1.3;
    const chassis = makeBox(THREE, 3.6, 0.22, 1.4, mats.get('#334155', { roughness: 0.6 }));
    chassis.position.set(0.05, 0.44, 0);
    const cargo = makeBox(THREE, 2.35, 1.55, 1.62, mats.get('#F8FAFC', { roughness: 0.58 }));
    cargo.position.set(-0.68, 1.28, 0);
    const cargoStripe = makeBox(THREE, 2.38, 0.24, 1.64, bodyMat);
    cargoStripe.position.set(-0.68, 1.25, 0);
    const cab = makeBox(THREE, 1.25, 1.22, 1.5, bodyMat);
    cab.position.set(1.18, 1.05, 0);
    const cabGlass = makeBox(THREE, 0.62, 0.55, 1.54, glassMat);
    cabGlass.position.set(1.36, 1.28, 0);
    const bumper = makeBox(THREE, 0.18, 0.22, 1.56, bumperMat);
    bumper.position.set(1.82, 0.48, 0);
    const hl = makeBox(THREE, 0.12, 0.2, 1.18, headLightMat, false, false);
    hl.position.set(1.82, 0.72, 0);
    const tl = makeBox(THREE, 0.12, 0.18, 1.2, tailLightMat, false, false);
    tl.position.set(-1.86, 0.68, 0);
    g.add(chassis, cargo, cargoStripe, cab, cabGlass, bumper, hl, tl);
    [-1.18, 1.18].forEach((wx) => [-0.78, 0.78].forEach((wz) => addWheel(wx, wz, 0.36, 0.24)));
  } else if (kind === 'moto' || kind === 'bike') {
    frontX = 0.62;
    rearX = -0.62;
    beamSpread = 0.55;
    const frame = makeBox(THREE, 1.28, 0.36, 0.34, bodyMat);
    frame.position.set(0, 0.62, 0);
    const seat = makeBox(THREE, 0.54, 0.14, 0.34, tireMat);
    seat.position.set(-0.14, 0.85, 0);
    const fork = makeCyl(THREE, 0.05, 0.05, 0.68, 6, rimMat);
    fork.position.set(0.42, 0.68, 0);
    fork.rotation.z = 0.28;
    const handleBar = makeBox(THREE, 0.1, 0.08, 0.66, rimMat);
    handleBar.position.set(0.32, 0.98, 0);
    const lamp = makeSphere(THREE, 0.11, 8, 6, headLightMat, false, false);
    lamp.position.set(0.55, 0.82, 0);
    const tLamp = makeSphere(THREE, 0.075, 6, 6, tailLightMat, false, false);
    tLamp.position.set(-0.62, 0.72, 0);

    const riderBody = makeBox(THREE, 0.42, 0.58, 0.42, mats.get('#2563EB', { roughness: 0.7 }));
    riderBody.position.set(-0.14, 1.16, 0);
    riderBody.rotation.z = -0.18;
    const riderArm = makeBox(THREE, 0.46, 0.12, 0.46, mats.get('#3B82F6', { roughness: 0.7 }));
    riderArm.position.set(0.14, 1.12, 0);
    riderArm.rotation.z = 0.22;
    const helm = makeSphere(THREE, 0.27, 10, 8, mats.get(kind === 'moto' ? '#FACC15' : '#EF4444', { roughness: 0.38 }));
    helm.position.set(-0.04, 1.62, 0);
    const visor = makeBox(THREE, 0.12, 0.14, 0.36, mats.get('#0F172A', { roughness: 0.2 }));
    visor.position.set(0.18, 1.62, 0);
    g.add(frame, seat, fork, handleBar, lamp, tLamp, riderBody, riderArm, helm, visor);
    [-0.56, 0.56].forEach((wx) => addWheel(wx, 0, 0.29, 0.14));
  } else {
    // Detailed Sedan / Coupe
    const chassis = makeBox(THREE, 3.05, 0.74, 1.48, bodyMat);
    chassis.position.y = 0.66;
    const fBumper = makeBox(THREE, 0.16, 0.22, 1.5, bumperMat);
    fBumper.position.set(1.54, 0.4, 0);
    const rBumper = makeBox(THREE, 0.16, 0.22, 1.5, bumperMat);
    rBumper.position.set(-1.54, 0.4, 0);
    const cabin = makeBox(THREE, 1.62, 0.58, 1.3, glassMat);
    cabin.position.set(-0.1, 1.3, 0);
    const roof = makeBox(THREE, 1.34, 0.14, 1.28, bodyMat);
    roof.position.set(-0.1, 1.64, 0);
    const grille = makeBox(THREE, 0.08, 0.22, 0.68, mats.get('#1E293B', { roughness: 0.4 }));
    grille.position.set(1.53, 0.62, 0);
    const hl = makeBox(THREE, 0.1, 0.18, 1.15, headLightMat, false, false);
    hl.position.set(1.52, 0.72, 0);
    const tl = makeBox(THREE, 0.1, 0.18, 1.15, tailLightMat, false, false);
    tl.position.set(-1.52, 0.72, 0);
    // Side mirrors
    [-0.82, 0.82].forEach((mz) => {
      const mirror = makeBox(THREE, 0.18, 0.12, 0.16, bodyMat);
      mirror.position.set(0.55, 1.08, mz);
      g.add(mirror);
    });
    g.add(chassis, fBumper, rBumper, cabin, roof, grille, hl, tl);
    [-0.95, 0.95].forEach((wx) => [-0.74, 0.74].forEach((wz) => addWheel(wx, wz, 0.32, 0.2)));
  }

  if (isNight) {
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const beamOffsets = kind === 'moto' || kind === 'bike' ? [0] : [-beamSpread * 0.38, beamSpread * 0.38];
    beamOffsets.forEach((bz) => {
      const beamCone = new THREE.Mesh(new THREE.ConeGeometry(beamSpread * 0.72, 4.4, 8, 1, true), beamMat);
      beamCone.rotation.z = Math.PI / 2;
      beamCone.scale.set(0.28, 1, 1);
      beamCone.position.set(frontX + 2.0, 0.22, bz);
      g.add(beamCone);
    });
    const tailGlow = new THREE.Mesh(
      new THREE.CircleGeometry(beamSpread * 0.65, 12),
      new THREE.MeshBasicMaterial({
        color: 0xef4444,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    tailGlow.rotation.x = -Math.PI / 2;
    tailGlow.position.set(rearX - 0.65, 0.09, 0);
    g.add(tailGlow);
  }

  return g;
}

/**
 * Dựng các tòa nhà trang trí (không chức năng) làm đẹp khu phố theo phong cách XCity & tự đổi chỗ khi bố mẹ dời công trình
 */
function buildDecorativeBuilding3D(THREE, mats, def, isNight) {
  const g = new THREE.Group();
  g.position.set(def.x * WORLD_SCALE, 0, def.y * WORLD_SCALE);
  g.rotation.y = def.rotY || 0;

  const rng = createSeededRandom(def.seed || 101);
  const variant = def.variant || 'apt_tall';
  const pal = def.palette || { wall: '#F8FAFC', accent: '#3B82F6', roof: '#475569' };

  const curb = makeBox(THREE, 9.8, 0.1, 7.0, mats.get('#94A3B8', { roughness: 0.85 }), false, true);
  curb.position.set(0, 0.05, 0.3);
  const pad = makeBox(THREE, 9.4, 0.14, 6.6, mats.get('#E2E8F0', { roughness: 0.86 }), false, true);
  pad.position.set(0, 0.08, 0.3);
  g.add(curb, pad);

  const wallMat = mats.get(pal.wall, { roughness: 0.74 });
  const accentMat = mats.get(pal.accent, { roughness: 0.52 });
  const roofMat = mats.get(pal.roof, { roughness: 0.62 });
  const darkTrimMat = mats.get('#1E293B', { roughness: 0.45 });
  const frameMat = mats.get('#FFFFFF', { roughness: 0.48 });

  const winLitMat = mats.get(isNight ? '#FEF08A' : '#7DD3FC', {
    roughness: 0.14,
    metalness: 0.14,
    emissive: isNight ? '#FBBF24' : null,
    emissiveIntensity: isNight ? 2.05 : 0,
  });
  const winWarmMat = mats.get(isNight ? '#FDBA74' : '#BAE6FD', {
    roughness: 0.14,
    metalness: 0.14,
    emissive: isNight ? '#F97316' : null,
    emissiveIntensity: isNight ? 1.4 : 0,
  });
  const winDarkMat = mats.get('#0F172A', { roughness: 0.24, metalness: 0.22 });

  const pickWinMat = () => {
    if (!isNight) return winLitMat;
    const r = rng();
    if (r < 0.58) return winLitMat;
    if (r < 0.84) return winWarmMat;
    return winDarkMat;
  };

  if (variant === 'apt_tall') {
    const W = 7.4;
    const D = 4.8;
    const floors = def.floors || 4;
    const H = floors * 2.15 + 0.6;
    const plinth = makeBox(THREE, W + 0.35, 0.75, D + 0.35, darkTrimMat);
    plinth.position.set(0, 0.48, -0.35);
    const body = makeBox(THREE, W, H, D, wallMat);
    body.position.set(0, H / 2 + 0.14, -0.35);
    const topRim = makeBox(THREE, W + 0.45, 0.38, D + 0.45, roofMat);
    topRim.position.set(0, H + 0.22, -0.35);
    const acBox = makeBox(THREE, 1.4, 0.75, 1.1, mats.get('#CBD5E1', { roughness: 0.55 }));
    acBox.position.set(-1.6, H + 0.75, -0.5);
    const tank = makeCyl(THREE, 0.58, 0.62, 1.05, 10, mats.get('#94A3B8', { roughness: 0.4, metalness: 0.45 }));
    tank.position.set(1.8, H + 0.9, -0.6);
    g.add(plinth, body, topRim, acBox, tank);

    for (let fl = 0; fl < floors; fl++) {
      const fy = 1.65 + fl * 2.15;
      const band = makeBox(THREE, W + 0.24, 0.18, D + 0.24, accentMat);
      band.position.set(0, fy - 0.78, -0.35);
      g.add(band);
      [-2.15, 0, 2.15].forEach((wx) => {
        if (fl === 0 && wx === 0) return;
        addFramedWindow3D(THREE, mats, g, wx, fy, D / 2 - 0.32, 1.15, 1.15, frameMat, pickWinMat());
      });
      [-1.3, 1.3].forEach((wz) => {
        addFramedWindow3D(THREE, mats, g, W / 2 + 0.02, fy, wz - 0.35, 1.05, 1.1, frameMat, pickWinMat(), Math.PI / 2);
        addFramedWindow3D(THREE, mats, g, -W / 2 - 0.02, fy, wz - 0.35, 1.05, 1.1, frameMat, pickWinMat(), -Math.PI / 2);
      });
    }
    addRecessedDoor3D(THREE, mats, g, 0, 1.25, D / 2 - 0.32, 1.4, 2.05, darkTrimMat, winLitMat);
    const canopy = makeBox(THREE, 2.6, 0.2, 1.1, accentMat);
    canopy.position.set(0, 2.45, D / 2 + 0.25);
    g.add(canopy);
  } else if (variant === 'cafe') {
    const W = 7.8;
    const D = 4.9;
    const H = 4.6;
    const body = makeBox(THREE, W, H, D, wallMat);
    body.position.set(0, H / 2 + 0.14, -0.45);
    const fascia = makeBox(THREE, W + 0.45, 0.85, D + 0.45, accentMat);
    fascia.position.set(0, H + 0.2, -0.45);
    g.add(body, fascia);
    for (let i = 0; i < 6; i++) {
      const stripe = makeBox(THREE, 1.22, 0.24, 1.25, mats.get(i % 2 === 0 ? pal.accent : '#FFFFFF', { roughness: 0.55 }));
      stripe.position.set(-3.05 + i * 1.22, 2.85, D / 2 + 0.1);
      stripe.rotation.x = 0.25;
      g.add(stripe);
    }
    addRecessedDoor3D(THREE, mats, g, 0, 1.35, D / 2 - 0.42, 1.5, 2.1, darkTrimMat, winLitMat);
    [-2.4, 2.4].forEach((wx) => addFramedWindow3D(THREE, mats, g, wx, 1.65, D / 2 - 0.42, 1.6, 1.4, frameMat, winLitMat));
    // Outdoor cafe bistro tables & glowing menu sign
    [-2.5, 2.5].forEach((tx) => {
      const tblTop = makeCyl(THREE, 0.55, 0.55, 0.08, 10, mats.get('#FFFFFF', { roughness: 0.45 }));
      tblTop.position.set(tx, 0.85, D / 2 + 0.85);
      const tblLeg = makeCyl(THREE, 0.08, 0.12, 0.72, 8, darkTrimMat);
      tblLeg.position.set(tx, 0.48, D / 2 + 0.85);
      g.add(tblTop, tblLeg);
    });
    const cup = makeCyl(THREE, 0.55, 0.42, 0.95, 10, mats.get('#D97706', { roughness: 0.45 }));
    cup.position.set(0, H + 1.1, 0.2);
    g.add(cup);
  } else if (variant === 'studio_glass') {
    const W = 7.6;
    const D = 5.0;
    const H = 9.2;
    const frameBody = makeBox(THREE, W, H, D, roofMat);
    frameBody.position.set(0, H / 2 + 0.14, -0.35);
    const glassCurtain = makeBox(THREE, W - 0.7, H - 1.1, D + 0.12, winLitMat);
    glassCurtain.position.set(0, H / 2 + 0.35, -0.35);
    g.add(frameBody, glassCurtain);
    [2.6, 4.9, 7.2].forEach((by) => {
      const mull = makeBox(THREE, W + 0.22, 0.22, D + 0.26, accentMat);
      mull.position.set(0, by, -0.35);
      g.add(mull);
    });
    const crown = makeBox(THREE, W - 1.6, 0.55, D - 1.4, accentMat);
    crown.position.set(0, H + 0.42, -0.35);
    g.add(crown);
  } else if (variant === 'bakery_shop' || variant === 'market_corner') {
    const W = 7.6;
    const D = 4.8;
    const H = 5.2;
    const body = makeBox(THREE, W, H, D, wallMat);
    body.position.set(0, H / 2 + 0.14, -0.35);
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(5.6, 2.2, 4),
      roofMat
    );
    roof.rotation.y = Math.PI / 4;
    roof.position.set(0, H + 1.2, -0.35);
    roof.castShadow = true;
    const chimney = makeBox(THREE, 0.65, 2.0, 0.65, darkTrimMat);
    chimney.position.set(2.1, H + 1.1, -1.2);
    g.add(body, roof, chimney);
    [-2.1, 0, 2.1].forEach((wx) => addFramedWindow3D(THREE, mats, g, wx, 3.85, D / 2 - 0.32, 1.1, 1.05, frameMat, pickWinMat()));
    addRecessedDoor3D(THREE, mats, g, 0, 1.32, D / 2 - 0.32, 1.5, 2.05, frameMat, accentMat);
    [-2.25, 2.25].forEach((wx) => addFramedWindow3D(THREE, mats, g, wx, 1.55, D / 2 - 0.32, 1.5, 1.3, frameMat, winLitMat));
  } else {
    // Cozy Residential Cottage
    const W = 7.2;
    const D = 4.8;
    const H = 3.8;
    const body = makeBox(THREE, W, H, D, wallMat);
    body.position.set(0, H / 2 + 0.14, -0.35);
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(5.4, 2.35, 4),
      mats.get(pal.roof, { roughness: 0.65, flatShading: true })
    );
    roof.rotation.y = Math.PI / 4;
    roof.position.set(0, H + 1.25, -0.35);
    roof.castShadow = true;
    const porch = makeBox(THREE, 2.6, 0.22, 1.2, accentMat);
    porch.position.set(0, 2.45, D / 2 + 0.18);
    g.add(body, roof, porch);
    addRecessedDoor3D(THREE, mats, g, 0, 1.28, D / 2 - 0.32, 1.35, 2.0, frameMat, accentMat);
    [-2.1, 2.1].forEach((wx) => addFramedWindow3D(THREE, mats, g, wx, 1.65, D / 2 - 0.32, 1.25, 1.2, frameMat, pickWinMat()));
  }

  if (isNight) {
    const frontSpill = new THREE.Mesh(
      new THREE.CircleGeometry(3.4, 16),
      new THREE.MeshBasicMaterial({
        color: variant === 'studio_glass' ? 0xfef08a : 0xfbbf24,
        transparent: true,
        opacity: 0.18,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    frontSpill.rotation.x = -Math.PI / 2;
    frontSpill.position.set(0, 0.165, 3.1);
    g.add(frontSpill);
  }

  return g;
}

/**
 * Tạo vòm bầu trời (Sky Dome) gradient bình minh / ngày / hoàng hôn / đêm sao nhấp nháy
 */
function buildSkyDome(THREE) {
  const geo = new THREE.SphereGeometry(285, 32, 20);
  const uniforms = {
    uTopColor: { value: new THREE.Color('#0284C7') },
    uHorizonColor: { value: new THREE.Color('#BAE6FD') },
    uBottomColor: { value: new THREE.Color('#63C13B') },
    uSunColor: { value: new THREE.Color('#FEF08A') },
    uSunDir: { value: new THREE.Vector3(0.55, 0.42, -0.72).normalize() },
    uSunsetGlow: { value: 0.0 },
    uNightFactor: { value: 0.0 },
    uTime: { value: 0.0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: `
      varying vec3 vWorldDir;
      void main() {
        vWorldDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uTopColor;
      uniform vec3 uHorizonColor;
      uniform vec3 uBottomColor;
      uniform vec3 uSunColor;
      uniform vec3 uSunDir;
      uniform float uSunsetGlow;
      uniform float uNightFactor;
      uniform float uTime;
      varying vec3 vWorldDir;

      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      void main() {
        vec3 dir = normalize(vWorldDir);
        float h = clamp(dir.y, -1.0, 1.0);
        vec3 col;
        if (h >= 0.0) {
          float t = pow(clamp(h, 0.0, 1.0), 0.58);
          col = mix(uHorizonColor, uTopColor, t);
        } else {
          float b = pow(clamp(-h, 0.0, 1.0), 0.48);
          col = mix(uHorizonColor, uBottomColor, b);
        }

        // Warm horizon band for dawn / sunset
        float horizonBand = exp(-abs(h) * 8.0) * uSunsetGlow;
        col = mix(col, uSunColor, clamp(horizonBand * 0.52, 0.0, 0.65));

        // Sun / Moon atmospheric disc glow
        float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
        float sunHalo = pow(sunDot, 22.0) * (0.45 + uSunsetGlow * 0.45);
        float sunDisc = smoothstep(0.9972, 0.9992, sunDot);
        col += uSunColor * (sunHalo * 0.5 + sunDisc * (1.0 - uNightFactor * 0.35));

        // Crisp procedural stars at night above horizon
        if (uNightFactor > 0.08 && h > 0.03) {
          vec2 uv = vec2(atan(dir.z, dir.x) * 32.0, asin(clamp(dir.y, -1.0, 1.0)) * 58.0);
          vec2 id = floor(uv);
          vec2 f = fract(uv) - 0.5;
          float rnd = hash21(id);
          if (rnd > 0.915) {
            float d = length(f - vec2(fract(rnd * 17.3) - 0.5, fract(rnd * 31.7) - 0.5) * 0.45);
            float twinkle = 0.65 + 0.35 * sin(uTime * 2.6 + rnd * 40.0);
            float star = smoothstep(0.14, 0.02, d) * twinkle * smoothstep(0.03, 0.16, h) * uNightFactor;
            col += vec3(0.92, 0.96, 1.0) * star * 1.15;
          }
        }

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = -10;
  mesh.frustumCulled = false;
  return { mesh, uniforms, mat };
}

/**
 * Dựng nhân vật Chibi 3D đầu to thân nhỏ chi tiết cao
 * - Tai, lông mày, mắt long lanh, má hồng
 * - 12 kiểu tóc có tóc mái & khối đuôi/bím rõ nét
 * - Trang phục phân lớp (cổ áo, gile, họa tiết tim/sao, váy xếp ly, giày sneaker đế trắng)
 * - Thân người mềm mại (Capsule/Lathe) phân biệt rõ Bố / Mẹ / Con cái
 * - 12 kiểu tóc mềm mại tự nhiên, không viền đen, không khối vuông cứng
 * - 7 phụ kiện đội đầu / đeo cổ / ba lô chi tiết
 */
function buildChibiCharacter3D(THREE, mats, shadowTex, member, isMe) {
  const root = new THREE.Group();
  const isDad = member.role === 'Bố' || member.id === 'dad';
  const isMom = member.role === 'Mẹ' || member.id === 'mom';
  const isKid = !isDad && !isMom;
  const bodyScale = isDad ? 1.15 : isMom ? 1.07 : 0.9;

  // Soft round contact shadow disc beneath feet
  const contactShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.55, 1.55),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: isMe ? 0.58 : 0.42 })
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.04;
  root.add(contactShadow);

  const bodyRoot = new THREE.Group();
  bodyRoot.scale.setScalar(bodyScale);
  root.add(bodyRoot);

  const skinMat = mats.get(isDad ? '#FAD3AC' : '#FFE3C6', { roughness: 0.66 });
  const shirtMat = mats.get(member.shirtColor || '#38BDF8', { roughness: 0.72 });
  const pantsMat = mats.get(member.pantsColor || '#334155', { roughness: 0.76 });
  const shoeMat = mats.get(isDad ? '#475569' : isMom ? '#EC4899' : '#EF4444', { roughness: 0.48 });
  const soleMat = mats.get('#FFFFFF', { roughness: 0.42 });
  const hairMat = mats.get(member.hairColor || '#1E293B', { roughness: 0.52 });
  const whiteMat = mats.get('#FFFFFF', { roughness: 0.62 });

  // Soft sculpted legs pivoted at hip (y = 0.48)
  const hipSpacing = isDad ? 0.175 : isMom ? 0.15 : 0.155;
  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-hipSpacing, 0.48, 0);
  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(hipSpacing, 0.48, 0);

  const pStyle = member.pantsStyle || 'pants';
  const makeLegParts = (pivot) => {
    const legGeo = new THREE.CapsuleGeometry(isDad ? 0.108 : 0.098, 0.18, 6, 12);
    const legMesh = new THREE.Mesh(legGeo, pStyle === 'skirt' || pStyle === 'shorts' ? skinMat : pantsMat);
    legMesh.position.y = -0.17;
    legMesh.castShadow = true;
    legMesh.receiveShadow = true;

    const sockBand = makeCyl(THREE, 0.104, 0.102, 0.06, 12, whiteMat);
    sockBand.position.y = -0.32;

    // Rounded organic sneaker / shoe (Capsule + rounded toe sphere)
    const shoeGroup = new THREE.Group();
    shoeGroup.position.set(0, -0.39, 0.05);
    const shoeBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.115, 0.13, 6, 12), shoeMat);
    shoeBody.rotation.x = Math.PI / 2;
    shoeBody.scale.set(1.0, 1.0, 0.72);
    shoeBody.castShadow = true;
    const shoeSole = new THREE.Mesh(new THREE.CapsuleGeometry(0.122, 0.135, 6, 12), soleMat);
    shoeSole.rotation.x = Math.PI / 2;
    shoeSole.scale.set(1.0, 1.0, 0.34);
    shoeSole.position.y = -0.055;
    shoeGroup.add(shoeBody, shoeSole);
    if (isKid) {
      const toeCap = makeSphere(THREE, 0.095, 10, 8, whiteMat);
      toeCap.scale.set(1.0, 0.65, 0.85);
      toeCap.position.set(0, -0.02, 0.12);
      shoeGroup.add(toeCap);
    }

    pivot.add(legMesh, sockBand, shoeGroup);
  };
  makeLegParts(leftLegPivot);
  makeLegParts(rightLegPivot);
  bodyRoot.add(leftLegPivot, rightLegPivot);

  // Upper torso group (organic LatheGeometry silhouette differentiated for Bố / Mẹ / Con)
  const upperGroup = new THREE.Group();
  upperGroup.position.set(0, 0.48, 0);
  bodyRoot.add(upperGroup);

  if (pStyle === 'skirt' || isMom) {
    if (pStyle === 'skirt') {
      const skirtPts = [
        new THREE.Vector2(0.01, -0.12),
        new THREE.Vector2(0.42, -0.11),
        new THREE.Vector2(0.36, 0.02),
        new THREE.Vector2(0.24, 0.17),
        new THREE.Vector2(0.01, 0.17),
      ];
      const skirt = new THREE.Mesh(new THREE.LatheGeometry(skirtPts, 18), pantsMat);
      skirt.scale.set(1.04, 1.0, 0.86);
      skirt.castShadow = true;
      skirt.receiveShadow = true;
      const trim = new THREE.Mesh(new THREE.TorusGeometry(0.39, 0.025, 8, 18), whiteMat);
      trim.rotation.x = Math.PI / 2;
      trim.scale.set(1.04, 0.86, 1.0);
      trim.position.y = -0.1;
      upperGroup.add(skirt, trim);
    } else {
      const hips = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.14, 8, 14), pantsMat);
      hips.rotation.z = Math.PI / 2;
      hips.scale.set(0.82, 1.0, 0.72);
      hips.position.y = 0.07;
      hips.castShadow = true;
      const belt = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.028, 8, 18), mats.get('#A855F7', { roughness: 0.45 }));
      belt.rotation.x = Math.PI / 2;
      belt.scale.set(1.18, 0.82, 1.0);
      belt.position.y = 0.16;
      upperGroup.add(hips, belt);
    }
  } else {
    const hips = new THREE.Mesh(new THREE.CapsuleGeometry(isDad ? 0.25 : 0.23, isDad ? 0.16 : 0.13, 8, 14), pantsMat);
    hips.rotation.z = Math.PI / 2;
    hips.scale.set(0.76, 1.0, 0.76);
    hips.position.y = 0.07;
    hips.castShadow = true;
    const belt = new THREE.Mesh(new THREE.TorusGeometry(isDad ? 0.245 : 0.225, 0.028, 8, 18), mats.get('#78350F', { roughness: 0.55 }));
    belt.rotation.x = Math.PI / 2;
    belt.scale.set(1.2, 0.84, 1.0);
    belt.position.y = 0.15;
    const buckle = makeSphere(THREE, 0.055, 8, 8, mats.get('#FACC15', { roughness: 0.28, metalness: 0.55 }));
    buckle.scale.set(1.1, 0.9, 0.45);
    buckle.position.set(0, 0.15, 0.205);
    upperGroup.add(hips, belt, buckle);
  }

  // Smooth sculpted Lathe torso
  const torsoPts = isDad
    ? [
        new THREE.Vector2(0.01, 0.13),
        new THREE.Vector2(0.27, 0.15),
        new THREE.Vector2(0.295, 0.34),
        new THREE.Vector2(0.325, 0.54),
        new THREE.Vector2(0.25, 0.65),
        new THREE.Vector2(0.01, 0.67),
      ]
    : isMom
      ? [
          new THREE.Vector2(0.01, 0.13),
          new THREE.Vector2(0.25, 0.15),
          new THREE.Vector2(0.22, 0.32),
          new THREE.Vector2(0.265, 0.51),
          new THREE.Vector2(0.21, 0.63),
          new THREE.Vector2(0.01, 0.65),
        ]
      : [
          new THREE.Vector2(0.01, 0.13),
          new THREE.Vector2(0.265, 0.15),
          new THREE.Vector2(0.275, 0.34),
          new THREE.Vector2(0.245, 0.53),
          new THREE.Vector2(0.19, 0.62),
          new THREE.Vector2(0.01, 0.64),
        ];
  const torso = new THREE.Mesh(new THREE.LatheGeometry(torsoPts, 20), shirtMat);
  torso.scale.set(1.06, 1.0, 0.78);
  torso.castShadow = true;
  torso.receiveShadow = true;
  upperGroup.add(torso);

  // Soft neck bridge connecting torso cleanly to chibi head
  const neck = makeCyl(THREE, 0.095, 0.115, 0.16, 12, skinMat);
  neck.position.y = 0.69;
  upperGroup.add(neck);

  // Curved Shirt accent patterns (collar / star / heart / stripe / vest)
  const pat = member.shirtPattern || 'collar';
  if (pat === 'stripe') {
    const stripeRing = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.045, 8, 20), whiteMat);
    stripeRing.rotation.x = Math.PI / 2;
    stripeRing.scale.set(1.12, 0.84, 1.0);
    stripeRing.position.y = 0.36;
    upperGroup.add(stripeRing);
  } else if (pat === 'star' || pat === 'heart') {
    const badgeCol = pat === 'star' ? '#FACC15' : '#F472B6';
    const badge = makeSphere(THREE, 0.088, 10, 8, mats.get(badgeCol, { roughness: 0.36, emissive: badgeCol, emissiveIntensity: 0.22 }));
    badge.scale.set(1.05, 1.05, 0.45);
    badge.position.set(0, 0.41, 0.22);
    upperGroup.add(badge);
  } else if (pat === 'vest') {
    const vestMat = mats.get('#1E293B', { roughness: 0.68 });
    [-0.14, 0.14].forEach((vx) => {
      const lapel = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.28, 6, 10), vestMat);
      lapel.scale.set(0.95, 1.0, 0.6);
      lapel.position.set(vx, 0.39, 0.13);
      lapel.rotation.z = vx < 0 ? -0.12 : 0.12;
      upperGroup.add(lapel);
    });
    const tie = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.28, 8), mats.get('#EF4444', { roughness: 0.45 }));
    tie.rotation.x = Math.PI;
    tie.position.set(0, 0.4, 0.225);
    upperGroup.add(tie);
  } else {
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.036, 8, 16), whiteMat);
    collar.rotation.x = Math.PI / 2 + 0.12;
    collar.scale.set(1.1, 0.88, 1.0);
    collar.position.set(0, 0.61, 0.02);
    const button = makeSphere(THREE, 0.032, 8, 6, mats.get('#FACC15', { roughness: 0.38 }));
    button.position.set(0, 0.48, 0.23);
    upperGroup.add(collar, button);
  }

  // Smooth Rounded Arms pivoted at shoulders
  const shoulderX = isDad ? 0.38 : isMom ? 0.31 : 0.32;
  const shoulderY = isDad ? 0.56 : 0.53;
  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-shoulderX, shoulderY, 0);
  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(shoulderX, shoulderY, 0);
  [
    [leftArmPivot, -1],
    [rightArmPivot, 1],
  ].forEach(([ap, side]) => {
    const shoulderCap = makeSphere(THREE, isDad ? 0.115 : 0.095, 10, 8, shirtMat);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(isDad ? 0.088 : 0.078, 0.19, 6, 12), shirtMat);
    arm.position.set(side * 0.02, -0.14, 0);
    arm.rotation.z = side * 0.1;
    arm.castShadow = true;
    const hand = makeSphere(THREE, isDad ? 0.092 : 0.085, 10, 8, skinMat);
    hand.position.set(side * 0.035, -0.31, 0.02);
    ap.add(shoulderCap, arm, hand);
  });
  upperGroup.add(leftArmPivot, rightArmPivot);

  // Cute Soft Chibi Head (higher relative proportion for Kids!)
  const headGroup = new THREE.Group();
  const headScale = isKid ? 1.05 : isMom ? 0.96 : 0.94;
  headGroup.position.set(0, isDad ? 1.12 : 1.08, 0);
  headGroup.scale.setScalar(headScale);
  upperGroup.add(headGroup);

  const head = makeSphere(THREE, 0.46, 20, 16, skinMat);
  head.scale.set(1.06, 0.97, 1.01);
  headGroup.add(head);

  // Soft sculpted Ears + Optional Mom pearl earrings
  [-0.46, 0.46].forEach((ex) => {
    const ear = makeSphere(THREE, 0.105, 10, 8, skinMat);
    ear.scale.set(0.6, 0.98, 0.72);
    ear.position.set(ex, -0.02, 0.01);
    headGroup.add(ear);
    if (isMom) {
      const pearl = makeSphere(THREE, 0.042, 8, 8, mats.get('#FEF3C7', { roughness: 0.25, metalness: 0.2, emissive: '#FDE68A', emissiveIntensity: 0.15 }));
      pearl.position.set(ex * 1.02, -0.11, 0.04);
      headGroup.add(pearl);
    }
  });

  // Glossy eyes, soft curved brows, gentle eyelashes for Mom/girls, cute Dad mustache
  const eyeMat = mats.get('#0F172A', { roughness: 0.16 });
  const cheekMat = mats.get('#FDA4AF', { roughness: 0.78 });
  const browMat = hairMat;
  [-0.165, 0.165].forEach((ex) => {
    const eye = makeSphere(THREE, isKid ? 0.074 : 0.068, 10, 10, eyeMat, false, false);
    eye.scale.set(0.9, 1.24, 0.65);
    eye.position.set(ex, 0.02, 0.425);
    const sparkle = makeSphere(THREE, 0.024, 8, 8, mats.get('#FFFFFF', { emissive: '#FFFFFF', emissiveIntensity: 0.55 }), false, false);
    sparkle.position.set(ex - 0.018, 0.052, 0.468);
    const sparkle2 = makeSphere(THREE, 0.012, 6, 6, mats.get('#FFFFFF', { emissive: '#FFFFFF', emissiveIntensity: 0.45 }), false, false);
    sparkle2.position.set(ex + 0.02, -0.01, 0.465);

    const browCurve = new THREE.Mesh(new THREE.CapsuleGeometry(0.017, 0.085, 4, 8), browMat);
    browCurve.rotation.z = Math.PI / 2 + (ex < 0 ? 0.1 : -0.1);
    browCurve.position.set(ex, 0.145, 0.43);

    const cheek = makeSphere(THREE, isKid ? 0.076 : 0.064, 10, 8, cheekMat, false, false);
    cheek.scale.set(1.25, 0.65, 0.42);
    cheek.position.set(ex * 1.56, -0.085, 0.395);
    headGroup.add(eye, sparkle, sparkle2, browCurve, cheek);

    if (isMom || member.role === 'Con gái') {
      const lash = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.04, 4, 6), eyeMat);
      lash.position.set(ex + (ex < 0 ? -0.055 : 0.055), 0.065, 0.44);
      lash.rotation.z = ex < 0 ? 0.65 : -0.65;
      headGroup.add(lash);
    }
  });

  const nose = makeSphere(THREE, 0.036, 8, 6, mats.get('#FDBA74', { roughness: 0.62 }), false, false);
  nose.position.set(0, -0.028, 0.468);
  headGroup.add(nose);

  // Friendly warm smile arc
  const smileCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.075, -0.105, 0.438),
    new THREE.Vector3(0, -0.132, 0.455),
    new THREE.Vector3(0.075, -0.105, 0.438),
  ]);
  const smileMesh = new THREE.Mesh(
    new THREE.TubeGeometry(smileCurve, 10, 0.013, 6, false),
    mats.get(isMom ? '#F43F5E' : '#BE123C', { roughness: 0.45 }),
  );
  headGroup.add(smileMesh);

  if (isDad) {
    // Neat curved handlebar mustache distinguishing Bố immediately
    const stacheCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.12, -0.085, 0.442),
      new THREE.Vector3(-0.05, -0.055, 0.466),
      new THREE.Vector3(0, -0.066, 0.472),
      new THREE.Vector3(0.05, -0.055, 0.466),
      new THREE.Vector3(0.12, -0.085, 0.442),
    ]);
    const stache = new THREE.Mesh(new THREE.TubeGeometry(stacheCurve, 12, 0.024, 7, false), hairMat);
    headGroup.add(stache);
  }

  // ==================== SOFT SCULPTED NATURAL HAIRSTYLES (12 STYLES — ABOVE BROWS/EYES) ====================
  const hStyle = member.hairStyle || 'short';
  const hairCap = makeSphere(THREE, 0.485, 22, 16, hairMat);
  hairCap.scale.set(1.04, 0.84, 1.02);
  hairCap.position.set(0, 0.175, -0.09);
  headGroup.add(hairCap);

  // Soft side temple strands tucked beside ears so face & eyes stay completely open
  [-0.435, 0.435].forEach((tx) => {
    const temple = new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(tx * 0.88, 0.24, 0.12),
          new THREE.Vector3(tx, 0.08, 0.05),
          new THREE.Vector3(tx * 0.96, -0.08, 0.02),
        ]),
        8,
        0.068,
        8,
        false
      ),
      hairMat
    );
    temple.castShadow = true;
    headGroup.add(temple);
  });

  // Helper to build flowing arched bang locks kept cleanly at high hairline (y >= 0.24, zero eye overlap)
  const addSoftArchStrand = (pts, radius = 0.075) => {
    const curve = new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
    const lock = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, radius, 8, false), hairMat);
    lock.castShadow = true;
    headGroup.add(lock);
  };

  if (hStyle === 'sidepart') {
    addSoftArchStrand(
      [
        [-0.36, 0.24, 0.25],
        [-0.1, 0.35, 0.35],
        [0.2, 0.34, 0.32],
        [0.41, 0.2, 0.15],
      ],
      0.095
    );
    addSoftArchStrand(
      [
        [-0.14, 0.36, 0.31],
        [-0.29, 0.29, 0.26],
        [-0.41, 0.17, 0.13],
      ],
      0.072
    );
  } else if (hStyle === 'undercut') {
    const quiffCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.08, 0.39, -0.18),
      new THREE.Vector3(0.0, 0.51, 0.08),
      new THREE.Vector3(0.08, 0.42, 0.32),
    ]);
    const quiff = new THREE.Mesh(new THREE.TubeGeometry(quiffCurve, 12, 0.165, 10, false), hairMat);
    quiff.scale.set(1.25, 0.86, 1.0);
    quiff.castShadow = true;
    headGroup.add(quiff);
  } else {
    // Soft feathered parted curtain bangs arched smoothly away from center forehead (keeps brows/eyes 100% clear)
    addSoftArchStrand(
      [
        [-0.02, 0.36, 0.33],
        [-0.2, 0.32, 0.31],
        [-0.39, 0.21, 0.16],
      ],
      0.078
    );
    addSoftArchStrand(
      [
        [0.02, 0.36, 0.33],
        [0.2, 0.32, 0.31],
        [0.39, 0.21, 0.16],
      ],
      0.078
    );
    const crownSoft = makeSphere(THREE, 0.16, 12, 10, hairMat);
    crownSoft.scale.set(1.65, 0.65, 0.85);
    crownSoft.position.set(0, 0.38, 0.18);
    headGroup.add(crownSoft);
  }

  if (hStyle === 'short') {
    const backNape = makeSphere(THREE, 0.38, 14, 10, hairMat);
    backNape.scale.set(1.1, 0.68, 0.72);
    backNape.position.set(0, -0.02, -0.26);
    headGroup.add(backNape);
  } else if (hStyle === 'spiky') {
    // Smooth tapered swept-up hair locks (replaces rigid sharp cones)
    [
      [[-0.22, 0.38, 0.08], [-0.28, 0.52, 0.05], [-0.32, 0.62, -0.02]],
      [[-0.07, 0.42, 0.16], [-0.08, 0.58, 0.14], [-0.09, 0.7, 0.04]],
      [[0.1, 0.42, 0.15], [0.13, 0.58, 0.11], [0.16, 0.69, 0.01]],
      [[0.24, 0.38, 0.06], [0.3, 0.52, 0.02], [0.34, 0.61, -0.05]],
      [[0, 0.4, -0.14], [0, 0.56, -0.18], [0, 0.66, -0.24]],
    ].forEach((pts) => addSoftArchStrand(pts, 0.088));
  } else if (hStyle === 'long' || hStyle === 'wavy' || hStyle === 'bob') {
    // Organic curved Lathe back veil + smooth side draping locks (zero square slabs!)
    const veilH = hStyle === 'bob' ? 0.52 : 0.88;
    const veilPts = [
      new THREE.Vector2(0.01, -veilH),
      new THREE.Vector2(hStyle === 'bob' ? 0.52 : 0.56, -veilH + 0.08),
      new THREE.Vector2(0.5, -veilH * 0.42),
      new THREE.Vector2(0.49, 0.14),
      new THREE.Vector2(0.01, 0.28),
    ];
    const backVeil = new THREE.Mesh(new THREE.LatheGeometry(veilPts, 18, Math.PI * 0.58, Math.PI * 0.84), hairMat);
    backVeil.position.set(0, 0.06, -0.04);
    backVeil.castShadow = true;
    headGroup.add(backVeil);

    // Flowing side locks curved along neck/shoulders
    [-0.43, 0.43].forEach((sx) => {
      const sideCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(sx, 0.18, 0.02),
        new THREE.Vector3(sx * 1.06, -0.12, -0.05),
        new THREE.Vector3(sx * (hStyle === 'wavy' ? 1.14 : 1.04), hStyle === 'bob' ? -0.34 : -0.58, -0.1),
      ]);
      const sideStrand = new THREE.Mesh(new THREE.TubeGeometry(sideCurve, 12, 0.115, 8, false), hairMat);
      sideStrand.castShadow = true;
      headGroup.add(sideStrand);
      if (hStyle === 'wavy') {
        const curlTip = makeSphere(THREE, 0.155, 10, 8, hairMat);
        curlTip.position.set(sx * 1.1, -0.58, -0.12);
        headGroup.add(curlTip);
      }
    });
  } else if (hStyle === 'pigtails') {
    [-0.5, 0.5].forEach((px) => {
      const tie = makeSphere(THREE, 0.075, 8, 8, mats.get('#F43F5E', { roughness: 0.42 }));
      tie.position.set(px * 0.88, 0.16, -0.04);
      const tailCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(px * 0.88, 0.14, -0.05),
        new THREE.Vector3(px * 1.12, -0.04, -0.08),
        new THREE.Vector3(px * 1.16, -0.3, -0.12),
      ]);
      const tail = new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 10, 0.135, 10, false), hairMat);
      const tip = makeSphere(THREE, 0.135, 10, 8, hairMat);
      tip.position.set(px * 1.16, -0.32, -0.12);
      tail.castShadow = true;
      headGroup.add(tie, tail, tip);
    });
  } else if (hStyle === 'bun') {
    [-0.36, 0.36].forEach((px) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.035, 8, 16), mats.get('#EF4444', { roughness: 0.45 }));
      ring.rotation.x = Math.PI / 2;
      ring.position.set(px, 0.39, -0.04);
      const puff = makeSphere(THREE, 0.21, 14, 10, hairMat);
      puff.scale.set(1.02, 0.92, 1.02);
      puff.position.set(px, 0.49, -0.06);
      headGroup.add(ring, puff);
    });
  } else if (hStyle === 'ponytail') {
    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.036, 8, 14), mats.get('#EC4899', { roughness: 0.42 }));
    tie.position.set(0, 0.24, -0.45);
    const tailCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.24, -0.46),
      new THREE.Vector3(0, 0.12, -0.64),
      new THREE.Vector3(0, -0.18, -0.68),
      new THREE.Vector3(0, -0.44, -0.6),
    ]);
    const tail = new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 14, 0.14, 10, false), hairMat);
    const tip = makeSphere(THREE, 0.13, 10, 8, hairMat);
    tip.position.set(0, -0.46, -0.6);
    tail.castShadow = true;
    headGroup.add(tie, tail, tip);
  } else if (hStyle === 'curly') {
    [
      [-0.36, 0.34, 0.12],
      [0.36, 0.34, 0.12],
      [0, 0.5, 0.08],
      [-0.45, 0.06, -0.06],
      [0.45, 0.06, -0.06],
      [-0.25, 0.44, -0.22],
      [0.25, 0.44, -0.22],
      [-0.35, -0.14, -0.22],
      [0.35, -0.14, -0.22],
      [0, 0.18, -0.42],
    ].forEach(([cx, cy, cz]) => {
      const curl = makeSphere(THREE, 0.21, 12, 10, hairMat);
      curl.position.set(cx, cy, cz);
      headGroup.add(curl);
    });
  } else if (hStyle === 'braids') {
    [-0.46, 0.46].forEach((bx) => {
      [0.04, -0.13, -0.3, -0.46].forEach((by, bi) => {
        const seg = makeSphere(THREE, 0.108 - bi * 0.012, 10, 8, hairMat);
        seg.scale.set(1.0, 1.15, 0.92);
        seg.position.set(bx, by, -0.04);
        headGroup.add(seg);
      });
      const bow = makeSphere(THREE, 0.065, 8, 8, mats.get('#EC4899', { roughness: 0.4 }));
      bow.position.set(bx, -0.56, -0.04);
      headGroup.add(bow);
    });
  }

  // Detailed Hat / Accessory 3D (smooth rounded capsules/cylinders)
  const outfit = member.outfit || '';
  if (outfit === '👑') {
    const goldMat = mats.get('#FACC15', { roughness: 0.22, metalness: 0.65 });
    const crownBand = makeCyl(THREE, 0.28, 0.24, 0.16, 12, goldMat);
    crownBand.position.set(0, 0.56, 0);
    headGroup.add(crownBand);
    for (let a = 0; a < 5; a++) {
      const ang = (a * Math.PI * 2) / 5;
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.18, 8), goldMat);
      tip.position.set(Math.sin(ang) * 0.22, 0.71, Math.cos(ang) * 0.22);
      headGroup.add(tip);
    }
    const gem = makeSphere(THREE, 0.065, 8, 8, mats.get('#EF4444', { emissive: '#EF4444', emissiveIntensity: 0.35 }));
    gem.position.set(0, 0.58, 0.26);
    headGroup.add(gem);
  } else if (outfit === '🧢') {
    const cap = makeSphere(THREE, 0.5, 16, 10, mats.get('#2563EB', { roughness: 0.58 }));
    cap.scale.set(1.06, 0.56, 1.06);
    cap.position.set(0, 0.31, -0.02);
    const visor = makeCyl(THREE, 0.34, 0.36, 0.055, 16, mats.get('#1D4ED8', { roughness: 0.52 }));
    visor.scale.set(1.0, 1.0, 0.78);
    visor.position.set(0, 0.26, 0.38);
    const topBtn = makeSphere(THREE, 0.06, 8, 8, whiteMat);
    topBtn.position.set(0, 0.58, -0.02);
    headGroup.add(cap, visor, topBtn);
  } else if (outfit === '🎩') {
    const brim = makeCyl(THREE, 0.48, 0.48, 0.06, 18, mats.get('#1E293B', { roughness: 0.48 }));
    brim.position.set(0, 0.46, 0);
    const band = makeCyl(THREE, 0.3, 0.29, 0.1, 18, mats.get('#EF4444', { roughness: 0.45 }));
    band.position.set(0, 0.54, 0);
    const top = makeCyl(THREE, 0.29, 0.27, 0.42, 18, mats.get('#0F172A', { roughness: 0.48 }));
    top.position.set(0, 0.72, 0);
    headGroup.add(brim, band, top);
  } else if (outfit === '🎀') {
    const bowMat = mats.get('#EC4899', { roughness: 0.4 });
    const lWing = makeSphere(THREE, 0.12, 10, 8, bowMat);
    lWing.scale.set(1.3, 0.85, 0.55);
    lWing.position.set(-0.15, 0.52, 0.12);
    lWing.rotation.z = 0.25;
    const rWing = makeSphere(THREE, 0.12, 10, 8, bowMat);
    rWing.scale.set(1.3, 0.85, 0.55);
    rWing.position.set(0.15, 0.52, 0.12);
    rWing.rotation.z = -0.25;
    const knot = makeSphere(THREE, 0.075, 8, 8, mats.get('#BE185D', { roughness: 0.38 }));
    knot.position.set(0, 0.52, 0.14);
    headGroup.add(lWing, rWing, knot);
  } else if (outfit === '🕶️') {
    const bridge = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.16, 4, 8), mats.get('#0F172A', { roughness: 0.25 }));
    bridge.rotation.z = Math.PI / 2;
    bridge.position.set(0, 0.06, 0.47);
    [-0.17, 0.17].forEach((lx) => {
      const lens = makeSphere(THREE, 0.12, 10, 8, mats.get('#1E293B', { roughness: 0.15, metalness: 0.45 }));
      lens.scale.set(1.1, 0.75, 0.32);
      lens.position.set(lx, 0.03, 0.465);
      headGroup.add(lens);
    });
    headGroup.add(bridge);
  } else if (outfit === '🧣') {
    const scarfMat = mats.get('#EF4444', { roughness: 0.76 });
    const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.075, 8, 18), scarfMat);
    wrap.rotation.x = Math.PI / 2;
    wrap.position.set(0, 0.64, 0);
    const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.24, 6, 8), scarfMat);
    tail.position.set(0.15, 0.46, 0.22);
    tail.rotation.z = -0.18;
    upperGroup.add(wrap, tail);
  } else if (outfit === '🎒') {
    const pack = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.22, 8, 12), mats.get('#F97316', { roughness: 0.65 }));
    pack.scale.set(1.1, 1.0, 0.68);
    pack.position.set(0, 0.38, -0.28);
    const pocket = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.08, 6, 10), mats.get('#FACC15', { roughness: 0.62 }));
    pocket.scale.set(1.05, 0.85, 0.5);
    pocket.position.set(0, 0.28, -0.4);
    upperGroup.add(pack, pocket);
  }

  root.userData = {
    bodyRoot,
    upperGroup,
    headGroup,
    leftLegPivot,
    rightLegPivot,
    leftArmPivot,
    rightArmPivot,
    contactShadow,
    targetYaw: 0,
    currentYaw: 0,
  };

  return root;
}

/**
 * Dựng NPC Người Nước Ngoài 3D (Mr. Alex & Ms. Emma) đi dạo học Speaking
 */
function buildForeignNpc3D(THREE, mats, shadowTex, npc) {
  const isFemale = npc.gender === 'female';
  const proxyMember = {
    id: npc.id,
    name: npc.name,
    role: isFemale ? 'Mẹ' : 'Bố',
    hairStyle: isFemale ? 'wavy' : 'sidepart',
    hairColor: isFemale ? '#B45309' : '#CA8A04',
    shirtColor: isFemale ? '#EC4899' : '#2563EB',
    shirtPattern: isFemale ? 'heart' : 'collar',
    pantsColor: isFemale ? '#F8FAFC' : '#78716C',
    pantsStyle: isFemale ? 'skirt' : 'pants',
    outfit: isFemale ? '🎀' : '🕶️',
  };
  return buildChibiCharacter3D(THREE, mats, shadowTex, proxyMember, false);
}

/**
 * Helper tạo khối bo tròn mềm (ExtrudeGeometry + Bevel) cho Robot hoạt hình
 */
function makeRoundedExtrude(THREE, width, height, radius, depth, bevel, mat) {
  const hw = width / 2;
  const hh = height / 2;
  const r = Math.min(radius, hw * 0.9, hh * 0.9);
  const shape = new THREE.Shape();
  shape.moveTo(-hw + r, -hh);
  shape.lineTo(hw - r, -hh);
  shape.quadraticCurveTo(hw, -hh, hw, -hh + r);
  shape.lineTo(hw, hh - r);
  shape.quadraticCurveTo(hw, hh, hw - r, hh);
  shape.lineTo(-hw + r, hh);
  shape.quadraticCurveTo(-hw, hh, -hw, hh - r);
  shape.lineTo(-hw, -hh + r);
  shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 4,
    curveSegments: 8,
  });
  geo.center();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Dựng Robot Giúp Đỡ 3D phong cách nhân vật hoạt hình mềm mại, sinh động, chiều cao tương đương các con (~1.88 đơn vị)
 * - Skins: 'doraemon' (Mèo máy tròn trĩnh + chong chóng tre), 'doraemi' (Mèo vàng nơ đỏ + túi hồng), 'gundam' (SD Chibi Mecha bo tròn), 'walle' (Pixar WALL-E bo góc)
 */
function buildHelperRobot3D(THREE, mats, shadowTex, skin, bannerTex) {
  const root = new THREE.Group();

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 1.5),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.45 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.04;
  root.add(shadow);

  const actor = new THREE.Group();
  root.add(actor);

  const leftArmPivot = new THREE.Group();
  const rightArmPivot = new THREE.Group();
  let propeller = null;
  let ribbonBow = null;

  const whiteMat = mats.get('#FFFFFF', { roughness: 0.42 });
  const darkMat = mats.get('#1E293B', { roughness: 0.35 });
  const goldMat = mats.get('#FACC15', { roughness: 0.22, metalness: 0.55 });
  const shineWhiteMat = mats.get('#FFFFFF', { emissive: '#FFFFFF', emissiveIntensity: 0.55, roughness: 0.15 });

  if (skin === 'doraemon') {
    const blueMat = mats.get('#0EA5E9', { roughness: 0.32 });
    const redMat = mats.get('#EF4444', { roughness: 0.36 });

    // Soft oval cartoon paws grounded at y = 0
    [-0.18, 0.18].forEach((fx) => {
      const foot = makeSphere(THREE, 0.165, 14, 10, whiteMat);
      foot.scale.set(1.0, 0.52, 1.32);
      foot.position.set(fx, 0.085, 0.05);
      actor.add(foot);
    });

    // Plump pear-shaped Lathe cartoon body (y = 0.13 .. 1.00)
    const bodyPts = [
      new THREE.Vector2(0.01, 0.13),
      new THREE.Vector2(0.32, 0.15),
      new THREE.Vector2(0.43, 0.36),
      new THREE.Vector2(0.42, 0.62),
      new THREE.Vector2(0.34, 0.88),
      new THREE.Vector2(0.24, 1.0),
      new THREE.Vector2(0.01, 1.02),
    ];
    const body = new THREE.Mesh(new THREE.LatheGeometry(bodyPts, 20), blueMat);
    body.castShadow = true;
    body.receiveShadow = true;

    // Soft bulging belly + crescent 4D pocket
    const belly = makeSphere(THREE, 0.335, 16, 12, whiteMat);
    belly.scale.set(1.02, 1.04, 0.52);
    belly.position.set(0, 0.56, 0.26);

    const pocketArch = new THREE.Mesh(new THREE.TorusGeometry(0.185, 0.022, 8, 18, Math.PI), mats.get('#38BDF8', { roughness: 0.4 }));
    pocketArch.rotation.z = Math.PI;
    pocketArch.position.set(0, 0.53, 0.435);
    const pocketTop = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.35, 4, 8), mats.get('#38BDF8', { roughness: 0.4 }));
    pocketTop.rotation.z = Math.PI / 2;
    pocketTop.position.set(0, 0.53, 0.435);

    // Cute red bobtail at the back
    const tail = makeSphere(THREE, 0.085, 10, 8, redMat);
    tail.position.set(0, 0.32, -0.44);

    // Vivid red collar + shiny gold bell
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.255, 0.042, 10, 20), redMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 1.01;
    const bell = makeSphere(THREE, 0.075, 12, 10, goldMat);
    bell.position.set(0, 0.96, 0.29);
    const bellRing = new THREE.Mesh(new THREE.TorusGeometry(0.074, 0.014, 6, 14), goldMat);
    bellRing.rotation.x = Math.PI / 2;
    bellRing.position.set(0, 0.96, 0.29);

    // Big expressive cartoon head (center y = 1.44, top crown ~1.89 — matches kids!)
    const head = makeSphere(THREE, 0.45, 22, 16, blueMat);
    head.scale.set(1.04, 0.99, 1.0);
    head.position.y = 1.44;
    const face = makeSphere(THREE, 0.385, 18, 14, whiteMat);
    face.scale.set(1.03, 0.92, 0.58);
    face.position.set(0, 1.40, 0.245);

    // Cherry-red shiny nose + highlight
    const nose = makeSphere(THREE, 0.062, 12, 10, redMat);
    nose.position.set(0, 1.46, 0.465);
    const noseGlint = makeSphere(THREE, 0.018, 6, 6, shineWhiteMat, false, false);
    noseGlint.position.set(-0.02, 1.485, 0.515);

    // Friendly smile & whiskers
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.015, 6, 16, Math.PI * 0.8), darkMat);
    smile.rotation.z = Math.PI * 1.1;
    smile.position.set(0, 1.35, 0.435);
    const philtrum = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.09, 4, 6), darkMat);
    philtrum.position.set(0, 1.36, 0.455);

    [-1, 1].forEach((side) => {
      [-0.14, 0, 0.14].forEach((ang, wi) => {
        const whisk = new THREE.Mesh(new THREE.CapsuleGeometry(0.009, 0.16, 4, 6), darkMat);
        whisk.rotation.z = Math.PI / 2 + side * (ang - 0.04);
        whisk.position.set(side * 0.22, 1.40 - (wi - 1) * 0.048, 0.43);
        actor.add(whisk);
      });
    });

    // Large cartoon oval eyes with pupils & twin sparkles
    [-0.088, 0.088].forEach((ex) => {
      const eyeW = makeSphere(THREE, 0.088, 12, 10, whiteMat);
      eyeW.scale.set(0.86, 1.18, 0.52);
      eyeW.position.set(ex, 1.56, 0.405);
      const pupil = makeSphere(THREE, 0.036, 10, 8, darkMat, false, false);
      pupil.scale.set(0.9, 1.2, 0.7);
      pupil.position.set(ex * 0.72, 1.56, 0.445);
      const glint = makeSphere(THREE, 0.015, 6, 6, shineWhiteMat, false, false);
      glint.position.set(ex * 0.72 - 0.012, 1.585, 0.468);
      actor.add(eyeW, pupil, glint);
    });

    // Playful Bamboo Copter (Take-copter) spinning on top of head
    const copterStem = makeCyl(THREE, 0.025, 0.032, 0.09, 8, goldMat);
    copterStem.position.set(0, 1.90, 0);
    propeller = new THREE.Group();
    propeller.position.set(0, 1.95, 0);
    const blade = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.34, 4, 8), goldMat);
    blade.rotation.z = Math.PI / 2;
    const hub = makeSphere(THREE, 0.042, 8, 8, redMat);
    propeller.add(blade, hub);
    actor.add(copterStem, propeller);

    actor.add(body, belly, pocketArch, pocketTop, tail, collar, bell, bellRing, head, face, nose, noseGlint, smile, philtrum);

    leftArmPivot.position.set(-0.41, 0.87, 0);
    rightArmPivot.position.set(0.41, 0.87, 0);
    [
      [leftArmPivot, -1],
      [rightArmPivot, 1],
    ].forEach(([ap, side]) => {
      const shoulderCap = makeSphere(THREE, 0.1, 10, 8, blueMat);
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.088, 0.24, 6, 12), blueMat);
      arm.position.set(side * 0.04, -0.17, 0);
      arm.rotation.z = side * 0.18;
      arm.castShadow = true;
      const hand = makeSphere(THREE, 0.105, 12, 10, whiteMat);
      hand.position.set(side * 0.08, -0.35, 0.02);
      ap.add(shoulderCap, arm, hand);
    });
  } else if (skin === 'doraemi') {
    const yellowMat = mats.get('#FACC15', { roughness: 0.34 });
    const collarBlueMat = mats.get('#0EA5E9', { roughness: 0.34 });
    const bowRedMat = mats.get('#EF4444', { roughness: 0.34 });
    const bowDarkRedMat = mats.get('#DC2626', { roughness: 0.38 });
    const pinkMat = mats.get('#F472B6', { roughness: 0.38 });
    const cheekMat = mats.get('#FDA4AF', { roughness: 0.72 });

    // Soft white oval paws grounded at y = 0
    [-0.18, 0.18].forEach((fx) => {
      const foot = makeSphere(THREE, 0.16, 14, 10, whiteMat);
      foot.scale.set(1.0, 0.52, 1.32);
      foot.position.set(fx, 0.085, 0.05);
      actor.add(foot);
    });

    // Plump golden-yellow pear-shaped Lathe cartoon body (y = 0.13 .. 1.00)
    const bodyPts = [
      new THREE.Vector2(0.01, 0.13),
      new THREE.Vector2(0.32, 0.15),
      new THREE.Vector2(0.43, 0.36),
      new THREE.Vector2(0.42, 0.62),
      new THREE.Vector2(0.34, 0.88),
      new THREE.Vector2(0.24, 1.0),
      new THREE.Vector2(0.01, 1.02),
    ];
    const body = new THREE.Mesh(new THREE.LatheGeometry(bodyPts, 20), yellowMat);
    body.castShadow = true;
    body.receiveShadow = true;

    // White belly + signature Doraemi checkered/pink-trimmed 4D pocket
    const belly = makeSphere(THREE, 0.335, 16, 12, whiteMat);
    belly.scale.set(1.02, 1.04, 0.52);
    belly.position.set(0, 0.56, 0.26);

    const pocketFill = makeSphere(THREE, 0.175, 14, 10, pinkMat);
    pocketFill.scale.set(1.04, 0.82, 0.32);
    pocketFill.position.set(0, 0.47, 0.405);
    const pocketArch = new THREE.Mesh(new THREE.TorusGeometry(0.185, 0.022, 8, 18, Math.PI), bowRedMat);
    pocketArch.rotation.z = Math.PI;
    pocketArch.position.set(0, 0.53, 0.438);
    const pocketTop = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.35, 4, 8), bowRedMat);
    pocketTop.rotation.z = Math.PI / 2;
    pocketTop.position.set(0, 0.53, 0.438);

    // Cute red tulip-flower tail at the back
    const tailStem = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.12, 4, 6), mats.get('#22C55E', { roughness: 0.5 }));
    tailStem.rotation.x = -0.65;
    tailStem.position.set(0, 0.32, -0.43);
    const tailFlower = makeSphere(THREE, 0.082, 10, 8, bowRedMat);
    tailFlower.scale.set(1.0, 1.15, 0.85);
    tailFlower.position.set(0, 0.35, -0.50);

    // Sky-blue collar + shiny gold bell
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.255, 0.042, 10, 20), collarBlueMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 1.01;
    const bell = makeSphere(THREE, 0.075, 12, 10, goldMat);
    bell.position.set(0, 0.96, 0.29);
    const bellRing = new THREE.Mesh(new THREE.TorusGeometry(0.074, 0.014, 6, 14), goldMat);
    bellRing.rotation.x = Math.PI / 2;
    bellRing.position.set(0, 0.96, 0.29);

    // Round golden-yellow head (center y = 1.44) + crisp white face mask
    const head = makeSphere(THREE, 0.445, 22, 16, yellowMat);
    head.scale.set(1.04, 0.99, 1.0);
    head.position.y = 1.44;
    const face = makeSphere(THREE, 0.382, 18, 14, whiteMat);
    face.scale.set(1.03, 0.92, 0.58);
    face.position.set(0, 1.40, 0.245);

    // Pink-red shiny nose + highlight + rosy cheeks
    const nose = makeSphere(THREE, 0.056, 12, 10, pinkMat);
    nose.position.set(0, 1.46, 0.465);
    const noseGlint = makeSphere(THREE, 0.017, 6, 6, shineWhiteMat, false, false);
    noseGlint.position.set(-0.018, 1.482, 0.51);

    [-0.22, 0.22].forEach((cx) => {
      const cheek = makeSphere(THREE, 0.068, 10, 8, cheekMat, false, false);
      cheek.scale.set(1.25, 0.72, 0.35);
      cheek.position.set(cx, 1.38, 0.405);
      actor.add(cheek);
    });

    // Sweet smile & fine whiskers
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.015, 6, 16, Math.PI * 0.8), darkMat);
    smile.rotation.z = Math.PI * 1.1;
    smile.position.set(0, 1.35, 0.435);
    const philtrum = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.088, 4, 6), darkMat);
    philtrum.position.set(0, 1.36, 0.455);

    [-1, 1].forEach((side) => {
      [-0.14, 0.14].forEach((ang, wi) => {
        const whisk = new THREE.Mesh(new THREE.CapsuleGeometry(0.0085, 0.15, 4, 6), darkMat);
        whisk.rotation.z = Math.PI / 2 + side * (ang - 0.04);
        whisk.position.set(side * 0.22, 1.41 - wi * 0.055, 0.425);
        actor.add(whisk);
      });
    });

    // Large cartoon oval eyes + delicate curved eyelashes + twin sparkles
    [-0.088, 0.088].forEach((ex) => {
      const eyeW = makeSphere(THREE, 0.088, 12, 10, whiteMat);
      eyeW.scale.set(0.86, 1.18, 0.52);
      eyeW.position.set(ex, 1.56, 0.405);
      const pupil = makeSphere(THREE, 0.036, 10, 8, darkMat, false, false);
      pupil.scale.set(0.9, 1.2, 0.7);
      pupil.position.set(ex * 0.72, 1.56, 0.445);
      const glint = makeSphere(THREE, 0.015, 6, 6, shineWhiteMat, false, false);
      glint.position.set(ex * 0.72 - 0.012, 1.585, 0.468);
      const lash = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.045, 4, 6), darkMat);
      lash.position.set(ex + (ex < 0 ? -0.068 : 0.068), 1.63, 0.425);
      lash.rotation.z = ex < 0 ? 0.62 : -0.62;
      actor.add(eyeW, pupil, glint, lash);
    });

    // Iconic Giant Red Ribbon Bow Ears on top of head!
    ribbonBow = new THREE.Group();
    ribbonBow.position.set(0, 1.88, -0.02);
    [-1, 1].forEach((side) => {
      const wing = makeRoundedExtrude(THREE, 0.34, 0.24, 0.095, 0.12, 0.035, bowRedMat);
      wing.position.set(side * 0.21, 0.05, 0);
      wing.rotation.set(0.14, side * 0.18, side * 0.32);
      const pleat = new THREE.Mesh(new THREE.CapsuleGeometry(0.024, 0.12, 4, 8), bowDarkRedMat);
      pleat.rotation.z = Math.PI / 2 + side * 0.32;
      pleat.position.set(side * 0.14, 0.03, 0.065);
      ribbonBow.add(wing, pleat);
    });
    const bowKnot = makeSphere(THREE, 0.095, 12, 10, bowDarkRedMat);
    bowKnot.scale.set(1.05, 0.9, 0.85);
    ribbonBow.add(bowKnot);
    actor.add(ribbonBow);

    actor.add(body, belly, pocketFill, pocketArch, pocketTop, tailStem, tailFlower, collar, bell, bellRing, head, face, nose, noseGlint, smile, philtrum);

    leftArmPivot.position.set(-0.41, 0.87, 0);
    rightArmPivot.position.set(0.41, 0.87, 0);
    [
      [leftArmPivot, -1],
      [rightArmPivot, 1],
    ].forEach(([ap, side]) => {
      const shoulderCap = makeSphere(THREE, 0.1, 10, 8, yellowMat);
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.088, 0.24, 6, 12), yellowMat);
      arm.position.set(side * 0.04, -0.17, 0);
      arm.rotation.z = side * 0.18;
      arm.castShadow = true;
      const hand = makeSphere(THREE, 0.105, 12, 10, whiteMat);
      hand.position.set(side * 0.08, -0.35, 0.02);
      ap.add(shoulderCap, arm, hand);
    });
  } else if (skin === 'gundam') {
    // SD / Chibi Animated Hero Mecha (rounded beveled silhouette, height ~1.90)
    const mechaBlue = mats.get('#2563EB', { roughness: 0.32, metalness: 0.18 });
    const mechaRed = mats.get('#EF4444', { roughness: 0.35 });
    const skyVisor = mats.get('#38BDF8', { emissive: '#38BDF8', emissiveIntensity: 0.78, roughness: 0.18 });
    const slateJoint = mats.get('#475569', { roughness: 0.45 });

    // Rounded cushioned mecha thruster boots + sculpted greaves
    [-0.17, 0.17].forEach((lx) => {
      const boot = makeRoundedExtrude(THREE, 0.22, 0.15, 0.06, 0.28, 0.025, mechaRed);
      boot.position.set(lx, 0.095, 0.05);
      const sole = makeRoundedExtrude(THREE, 0.23, 0.05, 0.04, 0.3, 0.015, slateJoint);
      sole.position.set(lx, 0.032, 0.05);
      const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.115, 0.26, 8, 12), whiteMat);
      shin.position.set(lx, 0.34, 0);
      shin.castShadow = true;
      const knee = makeSphere(THREE, 0.095, 10, 8, mechaBlue);
      knee.scale.set(0.95, 1.15, 0.65);
      knee.position.set(lx, 0.47, 0.09);
      actor.add(sole, boot, shin, knee);
    });

    // Sculpted hero torso (LatheGeometry waist + rounded beveled chest armor)
    const waistPts = [
      new THREE.Vector2(0.01, 0.50),
      new THREE.Vector2(0.28, 0.52),
      new THREE.Vector2(0.23, 0.68),
      new THREE.Vector2(0.27, 0.80),
      new THREE.Vector2(0.01, 0.82),
    ];
    const waist = new THREE.Mesh(new THREE.LatheGeometry(waistPts, 18), whiteMat);
    waist.castShadow = true;
    const beltCore = makeSphere(THREE, 0.085, 10, 8, goldMat);
    beltCore.scale.set(1.2, 0.9, 0.55);
    beltCore.position.set(0, 0.58, 0.24);

    const chest = makeRoundedExtrude(THREE, 0.52, 0.38, 0.12, 0.28, 0.045, mechaBlue);
    chest.position.set(0, 0.88, 0);
    const chestCore = makeRoundedExtrude(THREE, 0.22, 0.2, 0.06, 0.1, 0.025, mechaRed);
    chestCore.position.set(0, 0.88, 0.16);
    [-0.14, 0.14].forEach((vx) => {
      const vent = makeRoundedExtrude(THREE, 0.1, 0.075, 0.025, 0.05, 0.012, goldMat);
      vent.position.set(vx, 0.91, 0.18);
      actor.add(vent);
    });

    // Soft rounded jetpack + swept hero winglet fins
    const pack = makeRoundedExtrude(THREE, 0.38, 0.3, 0.09, 0.14, 0.03, slateJoint);
    pack.position.set(0, 0.88, -0.23);
    [-1, 1].forEach((side) => {
      const wing = makeRoundedExtrude(THREE, 0.34, 0.14, 0.05, 0.04, 0.018, whiteMat);
      wing.position.set(side * 0.29, 0.97, -0.27);
      wing.rotation.set(0.18, -side * 0.28, side * 0.42);
      const wingTrim = new THREE.Mesh(new THREE.CapsuleGeometry(0.024, 0.22, 4, 8), mechaBlue);
      wingTrim.rotation.z = Math.PI / 2 + side * 0.42;
      wingTrim.position.set(side * 0.31, 1.03, -0.26);
      actor.add(wing, wingTrim);
    });

    // Expressive SD Anime Rounded Helmet (center y = 1.44, top crest ~1.90)
    const helm = makeSphere(THREE, 0.43, 20, 16, whiteMat);
    helm.scale.set(1.06, 0.96, 1.02);
    helm.position.y = 1.44;
    const crest = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.22, 6, 10), mechaRed);
    crest.rotation.x = Math.PI / 2;
    crest.position.set(0, 1.81, 0.02);
    const chinGuard = makeSphere(THREE, 0.16, 12, 10, mechaRed);
    chinGuard.scale.set(0.95, 0.55, 0.72);
    chinGuard.position.set(0, 1.24, 0.34);

    // Friendly glowing anime cyan visor with twin bright eye sparkles
    const visorBase = makeRoundedExtrude(THREE, 0.36, 0.13, 0.055, 0.08, 0.02, darkMat);
    visorBase.position.set(0, 1.43, 0.39);
    const visorGlow = makeRoundedExtrude(THREE, 0.31, 0.095, 0.042, 0.04, 0.012, skyVisor);
    visorGlow.position.set(0, 1.43, 0.42);
    [-0.085, 0.085].forEach((ex) => {
      const eyeSpark = makeSphere(THREE, 0.026, 8, 8, shineWhiteMat, false, false);
      eyeSpark.position.set(ex, 1.445, 0.45);
      actor.add(eyeSpark);
    });

    // Rounded side ear-pods + graceful swept Golden V-Fin
    [-0.45, 0.45].forEach((px) => {
      const pod = makeSphere(THREE, 0.11, 10, 8, mechaBlue);
      pod.scale.set(0.55, 1.05, 0.95);
      pod.position.set(px, 1.43, 0);
      actor.add(pod);
    });
    const finGem = makeSphere(THREE, 0.065, 10, 8, mechaRed);
    finGem.scale.set(1.0, 1.15, 0.7);
    finGem.position.set(0, 1.66, 0.38);
    [-1, 1].forEach((side) => {
      const fin = new THREE.Mesh(new THREE.CapsuleGeometry(0.032, 0.3, 6, 10), goldMat);
      fin.position.set(side * 0.18, 1.78, 0.37);
      fin.rotation.z = -side * 0.95;
      actor.add(fin);
    });

    actor.add(waist, beltCore, chest, chestCore, pack, helm, crest, chinGuard, visorBase, visorGlow, finGem);

    leftArmPivot.position.set(-0.4, 0.97, 0);
    rightArmPivot.position.set(0.4, 0.97, 0);
    [
      [leftArmPivot, -1],
      [rightArmPivot, 1],
    ].forEach(([ap, side]) => {
      const pauldron = makeSphere(THREE, 0.145, 12, 10, whiteMat);
      pauldron.scale.set(1.15, 0.88, 1.1);
      pauldron.position.set(side * 0.04, 0.04, 0);
      const pauldronTrim = makeSphere(THREE, 0.105, 10, 8, mechaBlue);
      pauldronTrim.scale.set(1.1, 0.5, 1.05);
      pauldronTrim.position.set(side * 0.06, -0.02, 0);
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.088, 0.26, 8, 12), whiteMat);
      arm.position.set(side * 0.03, -0.22, 0);
      arm.castShadow = true;
      const hand = makeSphere(THREE, 0.098, 10, 8, slateJoint);
      hand.position.set(side * 0.04, -0.4, 0.02);
      ap.add(pauldron, pauldronTrim, arm, hand);
    });
  } else {
    // WALL-E Pixar Cartoon Companion (soft beveled rounded chassis + arched swan neck + expressive tilted eyes, height ~1.88)
    const walleAmber = mats.get('#F59E0B', { roughness: 0.42, metalness: 0.12 });
    const walleWarm = mats.get('#FBBF24', { roughness: 0.38, metalness: 0.14 });
    const steelMat = mats.get('#CBD5E1', { roughness: 0.3, metalness: 0.45 });
    const slateMat = mats.get('#475569', { roughness: 0.45 });
    const lensMat = mats.get('#38BDF8', { emissive: '#0284C7', emissiveIntensity: 0.72, roughness: 0.12 });
    const solarGlow = mats.get('#4ADE80', { emissive: '#22C55E', emissiveIntensity: 0.75 });

    // Rounded Beveled Caterpillar Treads grounded flush at y = 0
    [-0.31, 0.31].forEach((tx) => {
      const tread = makeRoundedExtrude(THREE, 0.19, 0.3, 0.08, 0.44, 0.03, darkMat);
      tread.position.set(tx, 0.18, 0.01);
      [-0.14, 0.14].forEach((wz) => {
        const wheel = makeCyl(THREE, 0.09, 0.09, 0.24, 12, steelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(tx, 0.16, wz);
        actor.add(wheel);
      });
      actor.add(tread);
    });

    // Smoothly Beveled Rounded Golden-Amber Chassis (y = 0.34 .. 1.08)
    const chassis = makeRoundedExtrude(THREE, 0.56, 0.66, 0.14, 0.44, 0.055, walleAmber);
    chassis.position.set(0, 0.71, 0);
    const chestPanel = makeRoundedExtrude(THREE, 0.42, 0.34, 0.08, 0.06, 0.02, slateMat);
    chestPanel.position.set(0, 0.74, 0.25);

    // Friendly glowing solar battery charge indicator + cute top lid
    const sunDot = makeSphere(THREE, 0.05, 10, 8, goldMat);
    sunDot.scale.set(1.0, 1.0, 0.45);
    sunDot.position.set(-0.11, 0.76, 0.295);
    [0, 1, 2].forEach((bi) => {
      const bar = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.09, 4, 8), bi < 2 ? solarGlow : goldMat);
      bar.rotation.z = Math.PI / 2;
      bar.position.set(0.06, 0.7 + bi * 0.052, 0.295);
      actor.add(bar);
    });

    const lidTop = makeRoundedExtrude(THREE, 0.46, 0.06, 0.03, 0.38, 0.02, walleWarm);
    lidTop.position.set(0, 1.07, 0);

    // Graceful Curved Swan-Neck bringing binocular head up to child height (~1.88)
    const neckCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 1.07, -0.02),
      new THREE.Vector3(0, 1.28, -0.08),
      new THREE.Vector3(0, 1.48, -0.01),
      new THREE.Vector3(0, 1.62, 0.05),
    ]);
    const neckTube = new THREE.Mesh(new THREE.TubeGeometry(neckCurve, 14, 0.072, 10, false), steelMat);
    neckTube.castShadow = true;
    const neckCollar = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.028, 8, 16), walleAmber);
    neckCollar.rotation.x = Math.PI / 2;
    neckCollar.position.set(0, 1.12, -0.02);

    // Expressive Pixar Twin Tilted Binocular Eyes (top ~1.88)
    const headBridge = makeRoundedExtrude(THREE, 0.24, 0.1, 0.04, 0.14, 0.02, slateMat);
    headBridge.position.set(0, 1.65, 0.04);

    [-1, 1].forEach((side) => {
      const eyePod = new THREE.Group();
      eyePod.position.set(side * 0.175, 1.67, 0.06);
      eyePod.rotation.z = -side * 0.14; // Puppy-dog soulful tilt!

      const housing = makeRoundedExtrude(THREE, 0.25, 0.23, 0.095, 0.26, 0.035, steelMat);
      const innerRim = makeRoundedExtrude(THREE, 0.19, 0.17, 0.075, 0.06, 0.015, darkMat);
      innerRim.position.z = 0.145;
      const lens = makeSphere(THREE, 0.086, 12, 10, lensMat, false, false);
      lens.scale.set(1.05, 0.95, 0.42);
      lens.position.z = 0.17;
      const glint1 = makeSphere(THREE, 0.026, 8, 8, shineWhiteMat, false, false);
      glint1.position.set(-0.024, 0.03, 0.205);
      const glint2 = makeSphere(THREE, 0.013, 6, 6, shineWhiteMat, false, false);
      glint2.position.set(0.026, -0.02, 0.202);
      const brow = makeRoundedExtrude(THREE, 0.21, 0.04, 0.02, 0.18, 0.01, walleWarm);
      brow.position.set(0, 0.14, 0.03);

      eyePod.add(housing, innerRim, lens, glint1, glint2, brow);
      actor.add(eyePod);
    });

    actor.add(chassis, chestPanel, sunDot, lidTop, neckTube, neckCollar, headBridge);

    leftArmPivot.position.set(-0.37, 0.9, 0.02);
    rightArmPivot.position.set(0.37, 0.9, 0.02);
    [
      [leftArmPivot, -1],
      [rightArmPivot, 1],
    ].forEach(([ap, side]) => {
      const shoulderJoint = makeSphere(THREE, 0.088, 10, 8, walleWarm);
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.056, 0.28, 6, 10), steelMat);
      arm.position.set(side * 0.02, -0.19, 0.03);
      arm.castShadow = true;
      const palm = makeRoundedExtrude(THREE, 0.12, 0.11, 0.045, 0.13, 0.02, walleAmber);
      palm.position.set(side * 0.02, -0.37, 0.05);
      ap.add(shoulderJoint, arm, palm);
    });
  }

  actor.add(leftArmPivot, rightArmPivot);

  // Overhead scrolling reminder banner cleanly above the 1.90 head crown
  const bannerHolder = new THREE.Group();
  bannerHolder.position.set(0, 2.28, 0.12);
  bannerHolder.visible = false;
  const boardRim = makeRoundedExtrude(THREE, 2.84, 0.72, 0.14, 0.06, 0.025, mats.get('#FACC15', { roughness: 0.3 }));
  boardRim.position.z = -0.02;
  const boardFrame = makeRoundedExtrude(THREE, 2.7, 0.6, 0.11, 0.08, 0.02, mats.get('#0F172A', { roughness: 0.35 }));
  const bannerMat = new THREE.MeshBasicMaterial({ map: bannerTex });
  const bannerScreen = new THREE.Mesh(new THREE.PlaneGeometry(2.54, 0.48), bannerMat);
  bannerScreen.position.z = 0.062;
  bannerHolder.add(boardRim, boardFrame, bannerScreen);
  actor.add(bannerHolder);

  root.userData = {
    actor,
    leftArmPivot,
    rightArmPivot,
    bannerHolder,
    propeller,
    ribbonBow,
    currentYaw: 0.35,
  };
  return root;
}

/**
 * Helpers tạo hình khối điêu khắc 3D cho cánh, lông vũ & vây thú cưng (không dùng khối hộp phẳng)
 */
const _petGeoCache = new Map();

function getCachedPetGeo(key, factory) {
  if (!_petGeoCache.has(key)) {
    _petGeoCache.set(key, factory());
  }
  return _petGeoCache.get(key);
}

/**
 * Cánh lông vũ điêu khắc 3 chóp cong mềm mại (Corgi tia chớp, Cú tuyết, Kỳ lân Pegasus, Phượng hoàng)
 */
function getFeatheredWingGeo(THREE, span = 0.64, chord = 0.34, depth = 0.045) {
  const key = `fwing:${span}:${chord}:${depth}`;
  return getCachedPetGeo(key, () => {
    const s = new THREE.Shape();
    s.moveTo(0, chord * 0.06);
    s.quadraticCurveTo(span * 0.42, chord * 0.85, span * 0.98, chord * 0.52);
    // 3 ngọn lông vũ sơ cấp uốn lượn
    s.quadraticCurveTo(span * 1.04, chord * 0.25, span * 0.82, chord * 0.14);
    s.quadraticCurveTo(span * 0.88, -chord * 0.02, span * 0.62, -chord * 0.08);
    s.quadraticCurveTo(span * 0.66, -chord * 0.22, span * 0.38, -chord * 0.2);
    s.quadraticCurveTo(span * 0.16, -chord * 0.22, 0, -chord * 0.14);
    s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, {
      depth,
      bevelEnabled: true,
      bevelThickness: 0.014,
      bevelSize: 0.014,
      bevelSegments: 2,
      curveSegments: 10,
    });
    geo.translate(0, 0, -depth * 0.5);
    return geo;
  });
}

/**
 * Cánh bướm / cánh tiên bo tròn uyển chuyển (Mèo tiên, Thỏ ngọc)
 */
function getButterflyWingGeo(THREE, isUpper = true, w = 0.46, h = 0.38) {
  const key = `bwing:${isUpper ? 'u' : 'l'}:${w}:${h}`;
  return getCachedPetGeo(key, () => {
    const s = new THREE.Shape();
    if (isUpper) {
      s.moveTo(0, 0);
      s.bezierCurveTo(w * 0.22, h * 0.98, w * 0.95, h * 1.05, w, h * 0.44);
      s.bezierCurveTo(w * 1.02, h * 0.06, w * 0.65, -h * 0.18, 0, -h * 0.08);
    } else {
      s.moveTo(0, 0);
      s.bezierCurveTo(w * 0.5, h * 0.16, w * 0.98, -h * 0.08, w * 0.88, -h * 0.55);
      s.bezierCurveTo(w * 0.72, -h * 0.98, w * 0.18, -h * 0.82, 0, -h * 0.16);
    }
    s.closePath();
    const depth = 0.022;
    const geo = new THREE.ExtrudeGeometry(s, {
      depth,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.008,
      bevelSegments: 2,
      curveSegments: 12,
    });
    geo.translate(0, 0, -depth * 0.5);
    return geo;
  });
}

/**
 * Màng cánh dơi rồng có 3 cung lượn sắc sảo
 */
function getDragonMembraneGeo(THREE, span = 0.68, chord = 0.42) {
  const key = `dwing:${span}:${chord}`;
  return getCachedPetGeo(key, () => {
    const s = new THREE.Shape();
    s.moveTo(0, chord * 0.08);
    s.quadraticCurveTo(span * 0.48, chord * 0.62, span, chord * 0.42);
    // 3 vòm màng cánh dơi
    s.quadraticCurveTo(span * 0.84, chord * 0.02, span * 0.72, -chord * 0.24);
    s.quadraticCurveTo(span * 0.58, -chord * 0.02, span * 0.42, -chord * 0.26);
    s.quadraticCurveTo(span * 0.26, -chord * 0.04, 0, -chord * 0.2);
    s.closePath();
    const depth = 0.024;
    const geo = new THREE.ExtrudeGeometry(s, {
      depth,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.008,
      bevelSegments: 2,
      curveSegments: 10,
    });
    geo.translate(0, 0, -depth * 0.5);
    return geo;
  });
}

/**
 * Vây cánh cụt / lông đuôi cong giọt nước mềm mại
 */
function getTeardropFeatherGeo(THREE, length = 0.44, width = 0.16, depth = 0.045) {
  const key = `tfeather:${length}:${width}:${depth}`;
  return getCachedPetGeo(key, () => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.bezierCurveTo(width * 0.9, length * 0.18, width * 0.82, length * 0.78, 0, length);
    s.bezierCurveTo(-width * 0.62, length * 0.72, -width * 0.7, length * 0.16, 0, 0);
    s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, {
      depth,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.014,
      bevelSegments: 2,
      curveSegments: 10,
    });
    geo.translate(0, 0, -depth * 0.5);
    return geo;
  });
}

/**
 * Gắn cặp cánh đối xứng có pivot để vỗ cánh mượt (không bị ngược mặt pháp tuyến)
 */
function attachWingPair(THREE, actor, root, {
  shoulderX = 0.28,
  shoulderY = 0.64,
  shoulderZ = -0.06,
  sweepY = 0.52,
  liftZ = 0.28,
  tiltX = -0.1,
  flapAmp = 0.22,
  flapSpeed = 0.009,
  buildOneSide,
}) {
  const createPivot = (side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * shoulderX, shoulderY, shoulderZ);
    pivot.rotation.set(tiltX, side * sweepY, side * liftZ);
    pivot.userData.baseZ = side * liftZ;
    pivot.userData.flapAmp = flapAmp;
    pivot.userData.flapSpeed = flapSpeed;

    const holder = new THREE.Group();
    if (side < 0) holder.rotation.y = Math.PI;
    buildOneSide(holder);
    pivot.add(holder);
    actor.add(pivot);
    return pivot;
  };
  root.userData.leftWingPivot = createPivot(-1);
  root.userData.rightWingPivot = createPivot(1);
}

/**
 * Dựng Thú Cưng 3D Low-poly (10 loài đúng nguyên mẫu + trứng + tiến hóa cấp 1-4 + 6 phụ kiện)
 */
export function buildPet3D(THREE, mats, shadowTex, pet, species, resolvedColors) {
  const root = new THREE.Group();
  const stageDef = species.stages.find((s) => s.stage === pet.stage) || species.stages[0];
  const scale = (stageDef.scale || 0.85) * 0.78;

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.15, 1.15),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.38 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  root.add(shadow);

  const variant = pet.variant || 'classic';
  const auraHex = resolvedColors.auraColor || resolvedColors.primary || '#FACC15';

  // Variant / Stage 4 aura ring on ground
  if (pet.hatched && (pet.stage >= 4 || variant !== 'classic')) {
    const auraMat = mats.get(auraHex, {
      emissive: auraHex,
      emissiveIntensity: pet.stage >= 4 ? 0.72 : 0.45,
      transparent: true,
      opacity: pet.stage >= 4 ? 0.78 : 0.56,
      side: THREE.DoubleSide,
    });
    const auraRing = new THREE.Mesh(new THREE.RingGeometry(0.54, 0.72, 24), auraMat);
    auraRing.rotation.x = -Math.PI / 2;
    auraRing.position.y = 0.05;
    root.add(auraRing);
    root.userData.auraRing = auraRing;
  }

  const actor = new THREE.Group();
  actor.scale.setScalar(scale);
  root.add(actor);
  root.userData.actor = actor;

  const isGoldVariant = variant === 'golden';
  const c1Mat = mats.get(resolvedColors.primary, { roughness: isGoldVariant ? 0.25 : 0.56, metalness: isGoldVariant ? 0.55 : 0.04 });
  const cSecMat = mats.get(resolvedColors.secondary || resolvedColors.primary, { roughness: isGoldVariant ? 0.28 : 0.58, metalness: isGoldVariant ? 0.48 : 0.04 });
  const c2Mat = mats.get(resolvedColors.accent, { roughness: 0.58 });
  const cTrimMat = mats.get(resolvedColors.trim || '#FACC15', { roughness: 0.3, metalness: 0.45 });
  const whiteMat = mats.get('#FFFFFF', { roughness: 0.62 });
  const creamMat = mats.get('#FEF3C7', { roughness: 0.58 });
  const darkMat = mats.get('#1E293B', { roughness: 0.35 });
  const eyeMat = variant === 'cosmic' ? mats.get('#22D3EE', { roughness: 0.12, emissive: '#06B6D4', emissiveIntensity: 0.55 }) : mats.get('#0F172A', { roughness: 0.12 });
  const pinkMat = mats.get('#F9A8D4', { roughness: 0.55 });
  const goldMat = mats.get('#FACC15', { roughness: 0.24, metalness: 0.6 });
  const flameMat = mats.get(
    variant === 'cosmic' ? '#38BDF8' : variant === 'pastel' ? '#F472B6' : variant === 'royal' ? '#A855F7' : variant === 'golden' ? '#FDE047' : '#FB923C',
    { roughness: 0.34, emissive: variant === 'cosmic' ? '#0284C7' : variant === 'royal' ? '#7C3AED' : '#EA580C', emissiveIntensity: 0.48 }
  );

  // 1. Trứng chưa nở (có tổ rơm + họa tiết riêng theo loài)
  if (!pet.hatched) {
    const nest = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.11, 8, 16), mats.get('#D97706', { roughness: 0.85 }));
    nest.rotation.x = Math.PI / 2;
    nest.position.y = 0.11;
    const egg = makeSphere(THREE, 0.44, 14, 12, c2Mat);
    egg.scale.set(0.86, 1.24, 0.86);
    egg.position.y = 0.56;
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.055, 8, 18), c1Mat);
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.54;
    actor.add(nest, egg, band);

    if (species.id === 'pet_dragon' || species.id === 'pet_phoenix') {
      for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * Math.PI * 2;
        const crest = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 5), c1Mat);
        crest.position.set(Math.cos(ang) * 0.28, 0.78, Math.sin(ang) * 0.28);
        crest.rotation.z = -Math.cos(ang) * 0.45;
        crest.rotation.x = Math.sin(ang) * 0.45;
        actor.add(crest);
      }
    } else if (species.id === 'pet_unicorn') {
      const topCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), goldMat);
      topCrystal.position.set(0, 1.16, 0);
      actor.add(topCrystal);
    } else {
      [-0.18, 0.18].forEach((sx, i) => {
        const spot = makeSphere(THREE, 0.1, 8, 6, c1Mat);
        spot.position.set(sx, 0.65 + (i ? 0.1 : -0.05), 0.3);
        actor.add(spot);
      });
    }
    if (variant === 'royal') {
      const miniCrown = makeCyl(THREE, 0.14, 0.11, 0.1, 8, goldMat);
      miniCrown.position.set(0, 1.12, 0);
      actor.add(miniCrown);
    } else if (variant === 'cosmic') {
      const eRing = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.032, 6, 20), cTrimMat);
      eRing.rotation.set(1.25, 0.35, 0);
      eRing.position.set(0, 0.58, 0);
      actor.add(eRing);
    } else if (variant === 'golden') {
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.03, 6, 18), goldMat);
      halo.rotation.x = Math.PI / 2 - 0.2;
      halo.position.set(0, 1.24, 0);
      actor.add(halo);
    }
    return root;
  }

  const sp = species.id;
  const stage = pet.stage || 1;

  // Helper add quadruped legs
  const addLegs = (legMat, pawMat, w = 0.14, h = 0.24, xSpan = 0.2, zFront = 0.22, zBack = -0.22) => {
    [
      [-xSpan, zFront],
      [xSpan, zFront],
      [-xSpan, zBack],
      [xSpan, zBack],
    ].forEach(([lx, lz]) => {
      const leg = makeCyl(THREE, w * 0.55, w * 0.48, h, 8, legMat);
      leg.position.set(lx, h * 0.5 + 0.04, lz);
      const paw = makeSphere(THREE, w * 0.62, 8, 6, pawMat);
      paw.scale.set(1.05, 0.65, 1.25);
      paw.position.set(lx, 0.06, lz + 0.03);
      actor.add(leg, paw);
    });
  };

  // Helper add eyes + white specular shine
  const addEyes = (exSpan, ey, ez, radius = 0.06, irisMat = eyeMat) => {
    [-exSpan, exSpan].forEach((ex) => {
      const eye = makeSphere(THREE, radius, 10, 8, irisMat, false, false);
      eye.position.set(ex, ey, ez);
      const shine = makeSphere(THREE, radius * 0.36, 6, 6, whiteMat, false, false);
      shine.position.set(ex + 0.015, ey + 0.018, ez + radius * 0.78);
      actor.add(eye, shine);
    });
  };

  let headTopY = 1.32;
  let headZ = 0.24;
  let neckY = 0.74;
  let neckZ = 0.16;

  // ==================== 10 LOÀI THÚ CƯNG CHUYÊN BIỆT ====================
  if (sp === 'pet_corgi') {
    // Thân corgi dài mũm mĩm, ức trắng bồng bềnh, tai vểnh, cánh thiên thần tia chớp điêu khắc (cấp 3+)
    const body = makeSphere(THREE, 0.4, 14, 10, c1Mat);
    body.scale.set(1.0, 0.86, 1.42);
    body.position.set(0, 0.44, -0.02);
    const chest = makeSphere(THREE, 0.31, 10, 8, whiteMat);
    chest.scale.set(0.96, 0.9, 0.92);
    chest.position.set(0, 0.45, 0.28);
    addLegs(c1Mat, whiteMat, 0.14, 0.2, 0.22, 0.24, -0.26);

    const head = makeSphere(THREE, 0.36, 14, 10, c1Mat);
    head.position.set(0, 0.88, 0.28);
    const blaze = makeSphere(THREE, 0.08, 8, 6, whiteMat);
    blaze.scale.set(0.75, 1.8, 0.45);
    blaze.position.set(0, 1.0, 0.59);
    const muzzle = makeSphere(THREE, 0.18, 10, 8, whiteMat);
    muzzle.scale.set(1.08, 0.82, 1.1);
    muzzle.position.set(0, 0.8, 0.56);
    const nose = makeSphere(THREE, 0.055, 8, 6, darkMat);
    nose.position.set(0, 0.85, 0.72);
    [-0.19, 0.19].forEach((bx) => {
      const blush = makeSphere(THREE, 0.05, 8, 6, pinkMat, false, false);
      blush.scale.set(1.2, 0.7, 0.4);
      blush.position.set(bx, 0.84, 0.55);
      actor.add(blush);
    });
    addEyes(0.14, 0.93, 0.58, 0.055);

    [-0.21, 0.21].forEach((ex) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.28, 6), c1Mat);
      ear.position.set(ex, 1.24, 0.24);
      ear.rotation.z = ex < 0 ? 0.22 : -0.22;
      const inner = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.18, 5), pinkMat);
      inner.position.set(ex, 1.23, 0.28);
      inner.rotation.z = ear.rotation.z;
      actor.add(ear, inner);
    });
    const stubTail = makeSphere(THREE, 0.14, 8, 6, whiteMat);
    stubTail.scale.set(0.95, 1.15, 1.15);
    stubTail.position.set(0, 0.56, -0.58);
    actor.add(body, chest, head, blaze, muzzle, nose, stubTail);

    if (stage >= 2) {
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.045, 8, 16), mats.get('#EF4444', { roughness: 0.45 }));
      collar.rotation.x = Math.PI / 2;
      collar.position.set(0, 0.68, 0.2);
      const tag = makeSphere(THREE, 0.06, 8, 6, goldMat);
      tag.position.set(0, 0.65, 0.43);
      actor.add(collar, tag);
    }
    if (stage >= 3) {
      // Cánh lông vũ ánh sáng 2 tầng bo cong mềm mại thay cho thanh gỗ phẳng
      const mainGeo = getFeatheredWingGeo(THREE, 0.56, 0.3, 0.04);
      const innerGeo = getFeatheredWingGeo(THREE, 0.4, 0.22, 0.05);
      attachWingPair(THREE, actor, root, {
        shoulderX: 0.27,
        shoulderY: 0.62,
        shoulderZ: -0.02,
        sweepY: 0.58,
        liftZ: 0.32,
        flapAmp: 0.24,
        buildOneSide: (holder) => {
          const joint = makeSphere(THREE, 0.08, 8, 6, creamMat);
          const mainWing = new THREE.Mesh(mainGeo, goldMat);
          const covert = new THREE.Mesh(innerGeo, creamMat);
          covert.position.set(0.03, 0.03, 0.012);
          holder.add(joint, mainWing, covert);
        },
      });
    }
    headTopY = 1.24;
    headZ = 0.28;
    neckY = 0.68;
    neckZ = 0.2;
  } else if (sp === 'pet_kitty') {
    // Mèo tiên thanh thoát, ria mép, ngọc trán (cấp 2+), 4 cánh bướm pastel bo tròn óng ánh (cấp 3+)
    const body = makeSphere(THREE, 0.35, 14, 10, c1Mat);
    body.scale.set(0.92, 0.96, 1.2);
    body.position.set(0, 0.46, 0);
    const belly = makeSphere(THREE, 0.24, 10, 8, c2Mat);
    belly.position.set(0, 0.44, 0.18);
    addLegs(c1Mat, whiteMat, 0.11, 0.24, 0.17, 0.2, -0.2);

    const head = makeSphere(THREE, 0.34, 14, 10, c1Mat);
    head.scale.set(1.06, 0.94, 1.0);
    head.position.set(0, 0.9, 0.24);
    const nose = makeSphere(THREE, 0.045, 8, 6, pinkMat);
    nose.position.set(0, 0.87, 0.57);
    [-0.19, 0.19].forEach((bx) => {
      const blush = makeSphere(THREE, 0.055, 8, 6, pinkMat, false, false);
      blush.scale.set(1.3, 0.7, 0.5);
      blush.position.set(bx, 0.85, 0.52);
      actor.add(blush);
    });
    // Ria mép mèo thanh mảnh
    [-1, 1].forEach((side) => {
      [-0.025, 0.025].forEach((wy, idx) => {
        const whisker = makeCyl(THREE, 0.008, 0.006, 0.22, 5, darkMat, false, false);
        whisker.rotation.z = Math.PI / 2 + side * (idx === 0 ? 0.12 : -0.1);
        whisker.position.set(side * 0.29, 0.86 + wy, 0.49);
        actor.add(whisker);
      });
    });
    addEyes(0.13, 0.93, 0.54, 0.058);

    [-0.2, 0.2].forEach((ex) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.24, 5), c1Mat);
      ear.position.set(ex, 1.22, 0.22);
      ear.rotation.z = ex < 0 ? 0.2 : -0.2;
      const inner = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.14, 5), pinkMat);
      inner.position.set(ex, 1.21, 0.25);
      inner.rotation.z = ear.rotation.z;
      actor.add(ear, inner);
    });
    const tail = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.06, 8, 14, Math.PI * 1.15), c1Mat);
    tail.rotation.y = Math.PI / 2;
    tail.position.set(0, 0.62, -0.45);
    const tailTip = makeSphere(THREE, 0.075, 8, 6, whiteMat);
    tailTip.position.set(0, 0.84, -0.52);
    actor.add(body, belly, head, nose, tail, tailTip);

    if (stage >= 2) {
      const foreheadGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.06, 0), goldMat);
      foreheadGem.position.set(0, 1.07, 0.52);
      const starGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), goldMat);
      starGem.position.set(0, 0.66, 0.36);
      actor.add(foreheadGem, starGem);
    }
    if (stage >= 3) {
      // Đôi cánh bướm 4 cánh cong uốn lượn + chấm ngọc phát sáng nhẹ
      const topWingGeo = getButterflyWingGeo(THREE, true, 0.48, 0.4);
      const botWingGeo = getButterflyWingGeo(THREE, false, 0.34, 0.32);
      const bTopMat = mats.get('#F472B6', { roughness: 0.28, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
      const bBotMat = mats.get('#C084FC', { roughness: 0.28, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
      attachWingPair(THREE, actor, root, {
        shoulderX: 0.22,
        shoulderY: 0.62,
        shoulderZ: -0.14,
        sweepY: 0.65,
        liftZ: 0.12,
        flapAmp: 0.32,
        flapSpeed: 0.011,
        buildOneSide: (holder) => {
          const topWing = new THREE.Mesh(topWingGeo, bTopMat);
          topWing.position.set(0, 0.04, 0);
          const spot = makeSphere(THREE, 0.055, 8, 6, creamMat, false, false);
          spot.scale.set(1.1, 1.1, 0.65);
          spot.position.set(0.28, 0.2, 0);
          const botWing = new THREE.Mesh(botWingGeo, bBotMat);
          botWing.position.set(0.02, -0.02, -0.01);
          holder.add(topWing, spot, botWing);
        },
      });
    }
    headTopY = 1.24;
    headZ = 0.24;
    neckY = 0.68;
    neckZ = 0.16;
  } else if (sp === 'pet_owl') {
    // Cú tuyết tròn trịa, đĩa mặt tròn quanh mắt hổ phách, vuốt 3 ngón, đuôi quạt 3 lông & đôi cánh lông vũ xếp lớp
    const body = makeSphere(THREE, 0.42, 14, 10, c1Mat);
    body.scale.set(1.0, 1.12, 0.96);
    body.position.set(0, 0.52, 0);
    const belly = makeSphere(THREE, 0.34, 10, 8, c2Mat);
    belly.scale.set(0.95, 1.0, 0.75);
    belly.position.set(0, 0.48, 0.22);

    const head = makeSphere(THREE, 0.38, 14, 10, c1Mat);
    head.scale.set(1.08, 0.92, 0.95);
    head.position.set(0, 0.96, 0.14);

    // Đĩa mặt trắng đặc trưng của cú + mắt hổ phách
    [-0.14, 0.14].forEach((ex) => {
      const disc = makeCyl(THREE, 0.15, 0.15, 0.05, 14, c2Mat);
      disc.rotation.x = Math.PI / 2;
      disc.position.set(ex, 0.98, 0.46);
      const iris = makeSphere(THREE, 0.075, 8, 8, goldMat, false, false);
      iris.position.set(ex, 0.98, 0.48);
      const pupil = makeSphere(THREE, 0.042, 8, 6, eyeMat, false, false);
      pupil.position.set(ex, 0.98, 0.53);
      const shine = makeSphere(THREE, 0.018, 6, 6, whiteMat, false, false);
      shine.position.set(ex + 0.016, 1.0, 0.56);
      actor.add(disc, iris, pupil, shine);

      const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 5), c1Mat);
      tuft.position.set(ex * 1.65, 1.27, 0.1);
      tuft.rotation.z = ex < 0 ? 0.55 : -0.55;
      actor.add(tuft);
    });
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.16, 6), mats.get('#F59E0B', { roughness: 0.4 }));
    beak.rotation.x = Math.PI * 0.62;
    beak.position.set(0, 0.91, 0.54);

    // Vuốt chim 3 ngón tự nhiên
    const talonMat = mats.get('#F59E0B', { roughness: 0.48 });
    [-0.14, 0.14].forEach((fx) => {
      [-0.25, 0, 0.25].forEach((ang) => {
        const toe = makeCyl(THREE, 0.025, 0.018, 0.16, 6, talonMat);
        toe.rotation.x = Math.PI / 2;
        toe.rotation.z = -ang;
        toe.position.set(fx + Math.sin(ang) * 0.05, 0.055, 0.12 + Math.cos(ang) * 0.04);
        actor.add(toe);
      });
    });

    // Đuôi quạt 3 lông vũ bo cong
    const tailFeatherGeo = getTeardropFeatherGeo(THREE, 0.34, 0.13, 0.04);
    [-0.28, 0, 0.28].forEach((ang, idx) => {
      const feather = new THREE.Mesh(tailFeatherGeo, idx === 1 ? c2Mat : c1Mat);
      feather.position.set(0, 0.28, -0.34);
      feather.rotation.x = -Math.PI * 0.64;
      feather.rotation.z = ang;
      actor.add(feather);
    });
    actor.add(body, belly, head, beak);

    // Cánh lông vũ xếp 2 tầng (khép gọn cấp 1-2, sải rộng uy nghi cấp 3+)
    const owlSpan = stage >= 3 ? 0.64 : 0.38;
    const owlChord = stage >= 3 ? 0.34 : 0.26;
    const owlMainGeo = getFeatheredWingGeo(THREE, owlSpan, owlChord, 0.048);
    const owlInnerGeo = getFeatheredWingGeo(THREE, owlSpan * 0.72, owlChord * 0.74, 0.054);
    attachWingPair(THREE, actor, root, {
      shoulderX: 0.34,
      shoulderY: 0.6,
      shoulderZ: 0.02,
      sweepY: stage >= 3 ? 0.45 : 1.08,
      liftZ: stage >= 3 ? 0.2 : -0.45,
      flapAmp: stage >= 3 ? 0.28 : 0.12,
      flapSpeed: 0.0085,
      buildOneSide: (holder) => {
        const shoulder = makeSphere(THREE, 0.09, 8, 6, c1Mat);
        const wMain = new THREE.Mesh(owlMainGeo, c1Mat);
        const wCover = new THREE.Mesh(owlInnerGeo, c2Mat);
        wCover.position.set(0.02, 0.02, 0.012);
        holder.add(shoulder, wMain, wCover);
      },
    });

    if (stage >= 2) {
      // Kính học giả tròn gọng vàng thanh mảnh
      [-0.14, 0.14].forEach((gx) => {
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.018, 6, 16), goldMat);
        rim.position.set(gx, 0.98, 0.52);
        actor.add(rim);
      });
      const bridge = makeCyl(THREE, 0.014, 0.014, 0.09, 6, goldMat);
      bridge.rotation.z = Math.PI / 2;
      bridge.position.set(0, 0.99, 0.52);
      actor.add(bridge);
    }
    headTopY = 1.32;
    headZ = 0.14;
    neckY = 0.72;
    neckZ = 0.14;
  } else if (sp === 'pet_unicorn') {
    // Kỳ lân dáng ngựa con thon gọn, sừng xoắn pha lê vàng, bờm bảy sắc (cấp 2+), cánh Pegasus lông vũ (cấp 3+)
    const body = makeSphere(THREE, 0.38, 14, 10, c2Mat);
    body.scale.set(0.88, 0.92, 1.36);
    body.position.set(0, 0.52, -0.02);
    addLegs(c2Mat, goldMat, 0.12, 0.32, 0.18, 0.24, -0.24);

    const neck = makeCyl(THREE, 0.16, 0.21, 0.42, 10, c2Mat);
    neck.position.set(0, 0.8, 0.26);
    neck.rotation.x = -0.35;
    const head = makeSphere(THREE, 0.28, 14, 10, c2Mat);
    head.scale.set(0.92, 0.95, 1.22);
    head.position.set(0, 1.04, 0.38);
    const snout = makeSphere(THREE, 0.17, 10, 8, pinkMat);
    snout.scale.set(0.9, 0.75, 1.0);
    snout.position.set(0, 0.98, 0.62);
    addEyes(0.14, 1.07, 0.52, 0.052);

    // Sừng pha lê xoắn nhiều vòng vàng óng
    const hornGrp = new THREE.Group();
    hornGrp.position.set(0, 1.22, 0.42);
    hornGrp.rotation.x = 0.25;
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.068, 0.42, 10), goldMat);
    horn.position.y = 0.18;
    hornGrp.add(horn);
    for (let r = 0; r < 3; r++) {
      const hRing = new THREE.Mesh(new THREE.TorusGeometry(0.056 - r * 0.013, 0.013, 6, 12), creamMat);
      hRing.rotation.x = Math.PI / 2 - 0.18;
      hRing.position.y = 0.07 + r * 0.09;
      hornGrp.add(hRing);
    }
    actor.add(hornGrp);

    [-0.15, 0.15].forEach((ex) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.2, 6), c2Mat);
      ear.position.set(ex, 1.28, 0.32);
      actor.add(ear);
    });

    // Bờm & Đuôi bồng bềnh (bảy sắc cầu vồng từ cấp 2+)
    const rainbowCols = ['#EF4444', '#F59E0B', '#22C55E', '#0EA5E9', '#8B5CF6', '#EC4899'];
    for (let i = 0; i < 5; i++) {
      const maneMat = stage >= 2 ? mats.get(rainbowCols[i % rainbowCols.length], { roughness: 0.45 }) : c1Mat;
      const tuft = makeSphere(THREE, 0.11, 8, 6, maneMat);
      tuft.position.set(0, 1.22 - i * 0.1, 0.24 - i * 0.04);
      actor.add(tuft);
    }
    const tailGeo = getTeardropFeatherGeo(THREE, 0.5, 0.16, 0.06);
    const tailPrimary = new THREE.Mesh(tailGeo, stage >= 2 ? mats.get('#EC4899', { roughness: 0.45 }) : c1Mat);
    tailPrimary.position.set(0, 0.58, -0.5);
    tailPrimary.rotation.x = -Math.PI * 0.72;
    actor.add(body, neck, head, snout, tailPrimary);
    if (stage >= 2) {
      const tailSub = new THREE.Mesh(getTeardropFeatherGeo(THREE, 0.42, 0.13, 0.05), mats.get('#38BDF8', { roughness: 0.45 }));
      tailSub.position.set(0.05, 0.54, -0.52);
      tailSub.rotation.x = -Math.PI * 0.78;
      tailSub.rotation.z = -0.22;
      actor.add(tailSub);
    }

    if (stage >= 3) {
      // Cánh thiên thần Pegasus 2 lớp lông vũ trắng ngọc + viền vàng kim
      const pWingGeo = getFeatheredWingGeo(THREE, 0.68, 0.36, 0.045);
      const pCoverGeo = getFeatheredWingGeo(THREE, 0.48, 0.25, 0.052);
      attachWingPair(THREE, actor, root, {
        shoulderX: 0.28,
        shoulderY: 0.7,
        shoulderZ: -0.02,
        sweepY: 0.56,
        liftZ: 0.34,
        flapAmp: 0.25,
        buildOneSide: (holder) => {
          const joint = makeSphere(THREE, 0.09, 8, 6, whiteMat);
          const outer = new THREE.Mesh(pWingGeo, whiteMat);
          const covert = new THREE.Mesh(pCoverGeo, goldMat);
          covert.position.set(0.02, 0.03, 0.014);
          holder.add(joint, outer, covert);
        },
      });
    }
    headTopY = 1.34;
    headZ = 0.36;
    neckY = 0.78;
    neckZ = 0.28;
  } else if (sp === 'pet_dragon') {
    // Rồng lửa mõm bo tròn có lỗ mũi, cặp sừng vàng, vảy lưng gai nhọn, đuôi lửa và đôi cánh dơi điêu khắc có xương cánh!
    const body = makeSphere(THREE, 0.4, 14, 10, c1Mat);
    body.scale.set(0.95, 0.95, 1.34);
    body.position.set(0, 0.48, 0);
    const belly = makeSphere(THREE, 0.29, 10, 8, c2Mat);
    belly.scale.set(0.88, 0.9, 1.15);
    belly.position.set(0, 0.43, 0.14);
    addLegs(c1Mat, goldMat, 0.14, 0.24, 0.21, 0.22, -0.22);

    const head = makeSphere(THREE, 0.32, 14, 10, c1Mat);
    head.position.set(0, 0.94, 0.28);
    // Mõm rồng bo tròn mềm mại thay cho khối hộp
    const snout = makeSphere(THREE, 0.2, 12, 8, c1Mat);
    snout.scale.set(1.04, 0.78, 1.24);
    snout.position.set(0, 0.88, 0.52);
    const jaw = makeSphere(THREE, 0.16, 10, 8, c2Mat);
    jaw.scale.set(0.92, 0.5, 1.12);
    jaw.position.set(0, 0.81, 0.5);
    [-0.075, 0.075].forEach((nx) => {
      const nostril = makeSphere(THREE, 0.028, 6, 6, darkMat, false, false);
      nostril.position.set(nx, 0.92, 0.73);
      actor.add(nostril);
    });
    addEyes(0.14, 1.0, 0.48, 0.056, goldMat);

    // Sừng rồng cong ra sau
    [-0.18, 0.18].forEach((hx) => {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.065, stage >= 2 ? 0.34 : 0.24, 7), goldMat);
      horn.position.set(hx, 1.24, 0.18);
      horn.rotation.x = -0.45;
      horn.rotation.z = hx < 0 ? 0.25 : -0.25;
      actor.add(horn);
    });
    // Gai lưng + đuôi dài có ngọn lửa
    for (let s = 0; s < 4; s++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 5), goldMat);
      spike.position.set(0, 0.84 - s * 0.08, 0.02 - s * 0.2);
      spike.rotation.x = -0.3;
      actor.add(spike);
    }
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.72, 8), c1Mat);
    tail.position.set(0, 0.44, -0.68);
    tail.rotation.x = -Math.PI * 0.56;
    const tailFlame = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.26, 7), flameMat);
    tailFlame.position.set(0, 0.56, -1.0);
    tailFlame.rotation.x = -0.35;
    actor.add(body, belly, head, snout, jaw, tail, tailFlame);

    // Đôi cánh dơi rồng có màng cánh 3 cung + nan xương cánh (từ cấp 1, sải rộng cấp 3+)
    const wingSpan = stage >= 3 ? 0.74 : 0.48;
    const wingChord = stage >= 3 ? 0.44 : 0.3;
    const memGeo = getDragonMembraneGeo(THREE, wingSpan, wingChord);
    const wingMemMat = mats.get(resolvedColors.trim || '#FB923C', { roughness: 0.34, emissive: resolvedColors.auraColor || '#EA580C', emissiveIntensity: 0.38, side: THREE.DoubleSide });
    attachWingPair(THREE, actor, root, {
      shoulderX: 0.27,
      shoulderY: 0.68,
      shoulderZ: -0.04,
      sweepY: 0.56,
      liftZ: 0.36,
      flapAmp: 0.26,
      flapSpeed: 0.0095,
      buildOneSide: (holder) => {
        const shoulder = makeSphere(THREE, 0.07, 8, 6, c1Mat);
        const armLen = wingSpan * 0.58;
        const arm = makeCyl(THREE, 0.036, 0.028, armLen, 6, cSecMat);
        arm.rotation.z = -Math.PI * 0.38;
        arm.position.set(armLen * 0.44, armLen * 0.22, 0);
        const elbow = makeSphere(THREE, 0.048, 7, 6, cTrimMat);
        elbow.position.set(armLen * 0.88, armLen * 0.44, 0);
        const thumbClaw = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.11, 5), cTrimMat);
        thumbClaw.position.set(armLen * 0.9, armLen * 0.54, 0.02);
        const tipLen = wingSpan * 0.62;
        const tipBone = makeCyl(THREE, 0.028, 0.016, tipLen, 6, cSecMat);
        tipBone.rotation.z = -Math.PI * 0.56;
        tipBone.position.set(armLen * 0.86 + tipLen * 0.48, armLen * 0.4, 0);
        const rib1 = makeCyl(THREE, 0.02, 0.012, wingChord * 0.82, 5, cSecMat);
        rib1.rotation.z = -0.58;
        rib1.position.set(armLen * 0.86, armLen * 0.16, 0);
        const rib2 = makeCyl(THREE, 0.018, 0.01, wingChord * 0.68, 5, cSecMat);
        rib2.rotation.z = -0.35;
        rib2.position.set(armLen * 0.56, armLen * 0.06, 0);
        const mem = new THREE.Mesh(memGeo, wingMemMat);
        holder.add(shoulder, arm, elbow, thumbClaw, tipBone, rib1, rib2, mem);
      },
    });
    headTopY = 1.26;
    headZ = 0.28;
    neckY = 0.72;
    neckZ = 0.22;
  } else if (sp === 'pet_bunny') {
    // Thỏ ngọc tai dài bo tròn, đuôi bông gòn, má hồng, nơ kép mềm mại (cấp 2+) & cánh tiên óng ánh (cấp 3+)
    const body = makeSphere(THREE, 0.38, 14, 10, c1Mat);
    body.scale.set(0.98, 1.0, 1.15);
    body.position.set(0, 0.44, 0);
    const belly = makeSphere(THREE, 0.26, 10, 8, c2Mat);
    belly.position.set(0, 0.42, 0.22);
    [-0.17, 0.17].forEach((px) => {
      const foot = makeSphere(THREE, 0.13, 8, 6, c2Mat);
      foot.scale.set(0.95, 0.6, 1.45);
      foot.position.set(px, 0.08, 0.24);
      actor.add(foot);
    });

    const head = makeSphere(THREE, 0.35, 14, 10, c1Mat);
    head.position.set(0, 0.88, 0.2);
    const nose = makeSphere(THREE, 0.045, 8, 6, pinkMat);
    nose.position.set(0, 0.85, 0.54);
    [-0.18, 0.18].forEach((bx) => {
      const blush = makeSphere(THREE, 0.055, 8, 6, pinkMat, false, false);
      blush.scale.set(1.25, 0.72, 0.45);
      blush.position.set(bx, 0.84, 0.49);
      actor.add(blush);
    });
    addEyes(0.13, 0.92, 0.5, 0.055);

    // Đôi tai thỏ dài bo tròn thanh tú
    [-0.14, 0.14].forEach((ex, idx) => {
      const ear = makeSphere(THREE, 0.09, 10, 8, c1Mat);
      ear.scale.set(0.9, 3.2, 0.68);
      ear.position.set(ex, 1.38, 0.18);
      ear.rotation.z = idx === 0 ? 0.14 : -0.18;
      ear.rotation.x = idx === 1 && stage === 1 ? 0.25 : -0.05;
      const inner = makeSphere(THREE, 0.055, 8, 6, pinkMat, false, false);
      inner.scale.set(0.85, 3.3, 0.5);
      inner.position.set(ex, 1.36, 0.22);
      inner.rotation.z = ear.rotation.z;
      inner.rotation.x = ear.rotation.x;
      actor.add(ear, inner);
    });
    const cottonTail = makeSphere(THREE, 0.16, 8, 6, whiteMat);
    cottonTail.position.set(0, 0.36, -0.45);
    actor.add(body, belly, head, nose, cottonTail);

    if (stage >= 2) {
      // Nơ vàng kép bo cong dễ thương
      [-0.08, 0.08].forEach((bx) => {
        const loop = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.15, 7), goldMat);
        loop.rotation.z = bx < 0 ? -Math.PI / 2 : Math.PI / 2;
        loop.scale.set(0.7, 1.0, 0.55);
        loop.position.set(bx, 1.18, 0.36);
        actor.add(loop);
      });
      const knot = makeSphere(THREE, 0.048, 8, 6, pinkMat);
      knot.position.set(0, 1.18, 0.38);
      actor.add(knot);
    }
    if (stage >= 3) {
      // Cánh tiên pha lê 2 đôi lấp lánh
      const fTopGeo = getButterflyWingGeo(THREE, true, 0.44, 0.34);
      const fBotGeo = getButterflyWingGeo(THREE, false, 0.3, 0.26);
      const fairyMat = mats.get('#FDE68A', { roughness: 0.25, transparent: true, opacity: 0.86, emissive: '#FACC15', emissiveIntensity: 0.25, side: THREE.DoubleSide });
      attachWingPair(THREE, actor, root, {
        shoulderX: 0.24,
        shoulderY: 0.62,
        shoulderZ: -0.12,
        sweepY: 0.62,
        liftZ: 0.16,
        flapAmp: 0.3,
        flapSpeed: 0.011,
        buildOneSide: (holder) => {
          const topW = new THREE.Mesh(fTopGeo, fairyMat);
          const botW = new THREE.Mesh(fBotGeo, fairyMat);
          const sparkle = makeSphere(THREE, 0.045, 6, 6, whiteMat, false, false);
          sparkle.position.set(0.24, 0.15, 0);
          holder.add(topW, botW, sparkle);
        },
      });
    }
    headTopY = 1.25;
    headZ = 0.2;
    neckY = 0.66;
    neckZ = 0.14;
  } else if (sp === 'pet_penguin') {
    // Chim cánh cụt mũm mĩm lưng xanh, bụng trắng tròn, vây bo giọt nước, chân màng cam & mũ hiệp sĩ mào cong
    const body = makeSphere(THREE, 0.42, 14, 10, c1Mat);
    body.scale.set(1.0, 1.15, 0.94);
    body.position.set(0, 0.5, 0);
    const belly = makeSphere(THREE, 0.34, 10, 8, whiteMat);
    belly.scale.set(0.94, 1.08, 0.72);
    belly.position.set(0, 0.48, 0.24);

    const head = makeSphere(THREE, 0.35, 14, 10, c1Mat);
    head.position.set(0, 0.96, 0.1);
    const faceMask = makeSphere(THREE, 0.27, 10, 8, whiteMat);
    faceMask.scale.set(1.0, 0.88, 0.7);
    faceMask.position.set(0, 0.92, 0.24);
    addEyes(0.12, 0.96, 0.42, 0.052);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.18, 7), mats.get('#F97316', { roughness: 0.45 }));
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0.9, 0.49);

    // Bàn chân vịt tam giác bo tròn cam
    const footMat = mats.get('#F97316', { roughness: 0.5 });
    [-0.16, 0.16].forEach((fx) => {
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.14, 0.06, 3), footMat);
      foot.position.set(fx, 0.04, 0.15);
      foot.scale.set(1.0, 0.8, 1.35);
      actor.add(foot);
    });

    // Vây bơi bo cong giọt nước mượt mà có hoạt ảnh vẫy
    const flipperGeo = getTeardropFeatherGeo(THREE, 0.42, 0.16, 0.055);
    attachWingPair(THREE, actor, root, {
      shoulderX: 0.36,
      shoulderY: 0.66,
      shoulderZ: 0.04,
      sweepY: 0.25,
      liftZ: -2.15,
      flapAmp: 0.16,
      flapSpeed: 0.008,
      buildOneSide: (holder) => {
        const fin = new THREE.Mesh(flipperGeo, c1Mat);
        holder.add(fin);
      },
    });
    actor.add(body, belly, head, faceMask, beak);

    if (stage >= 2) {
      const scarfMat = mats.get('#EF4444', { roughness: 0.6 });
      const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.065, 8, 16), scarfMat);
      scarf.rotation.x = Math.PI / 2;
      scarf.position.set(0, 0.74, 0.1);
      const scarfTail = new THREE.Mesh(getTeardropFeatherGeo(THREE, 0.26, 0.09, 0.03), scarfMat);
      scarfTail.position.set(0.18, 0.72, 0.3);
      scarfTail.rotation.x = Math.PI * 0.88;
      scarfTail.rotation.z = 0.25;
      actor.add(scarf, scarfTail);
    }
    if (stage >= 3) {
      const helm = makeSphere(THREE, 0.36, 12, 8, mats.get('#CBD5E1', { roughness: 0.3, metalness: 0.65 }), false, false);
      helm.scale.set(1.04, 0.65, 1.04);
      helm.position.set(0, 1.12, 0.1);
      // Mào mũ hiệp sĩ uốn cung mềm mại
      const plumeArc = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.045, 8, 14, Math.PI), mats.get('#EF4444', { roughness: 0.48 }));
      plumeArc.rotation.y = Math.PI / 2;
      plumeArc.position.set(0, 1.24, 0.08);
      actor.add(helm, plumeArc);
    }
    headTopY = 1.32;
    headZ = 0.1;
    neckY = 0.74;
    neckZ = 0.1;
  } else if (sp === 'pet_panda') {
    // Gấu trúc tròn mập dùng c1Mat (mình) & cSecMat (đai vai/tai/mắt/chân) nên biến thể đổi màu rõ nét!
    const body = makeSphere(THREE, 0.42, 14, 10, c1Mat);
    body.scale.set(1.04, 1.0, 1.15);
    body.position.set(0, 0.48, 0);
    const chestBand = makeCyl(THREE, 0.36, 0.4, 0.22, 12, cSecMat);
    chestBand.position.set(0, 0.62, 0.02);
    addLegs(cSecMat, cSecMat, 0.15, 0.24, 0.21, 0.22, -0.22);

    const head = makeSphere(THREE, 0.38, 14, 10, c1Mat);
    head.scale.set(1.08, 0.96, 1.0);
    head.position.set(0, 0.96, 0.2);
    [-0.28, 0.28].forEach((ex) => {
      const ear = makeSphere(THREE, 0.13, 8, 8, cSecMat);
      ear.position.set(ex, 1.28, 0.16);
      actor.add(ear);
    });
    [-0.14, 0.14].forEach((ex) => {
      const patch = makeSphere(THREE, 0.11, 10, 8, cSecMat);
      patch.scale.set(1.05, 1.25, 0.45);
      patch.position.set(ex, 0.98, 0.52);
      patch.rotation.z = ex < 0 ? 0.25 : -0.25;
      const iris = makeSphere(THREE, 0.042, 8, 6, whiteMat, false, false);
      iris.position.set(ex, 0.99, 0.57);
      const pupil = makeSphere(THREE, 0.022, 6, 6, eyeMat, false, false);
      pupil.position.set(ex, 0.99, 0.6);
      const blush = makeSphere(THREE, 0.052, 8, 6, pinkMat, false, false);
      blush.scale.set(1.25, 0.7, 0.45);
      blush.position.set(ex * 1.45, 0.88, 0.51);
      actor.add(patch, iris, pupil, blush);
    });
    const nose = makeSphere(THREE, 0.055, 8, 6, cSecMat);
    nose.position.set(0, 0.89, 0.58);
    const tail = makeSphere(THREE, 0.11, 8, 6, cSecMat);
    tail.position.set(0, 0.44, -0.48);
    actor.add(body, chestBand, head, nose, tail);

    if (stage >= 2) {
      const bandMat = mats.get('#EF4444', { roughness: 0.5 });
      const headband = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.045, 8, 16), bandMat);
      headband.rotation.x = Math.PI / 2;
      headband.position.set(0, 1.12, 0.2);
      // 2 dải băng bay phía sau
      [-0.08, 0.08].forEach((rx) => {
        const ribbon = new THREE.Mesh(getTeardropFeatherGeo(THREE, 0.24, 0.06, 0.02), bandMat);
        ribbon.position.set(rx, 1.1, -0.14);
        ribbon.rotation.x = -Math.PI * 0.75;
        ribbon.rotation.z = rx * 2.5;
        actor.add(ribbon);
      });
      actor.add(headband);
    }
    if (stage >= 3) {
      const bambooMat = mats.get('#16A34A', { roughness: 0.48 });
      const leafMat = mats.get('#22C55E', { roughness: 0.42, side: THREE.DoubleSide });
      const staffGrp = new THREE.Group();
      staffGrp.position.set(0.45, 0.62, 0.06);
      staffGrp.rotation.x = 0.6;
      staffGrp.rotation.z = 0.4;
      const bamboo = makeCyl(THREE, 0.044, 0.044, 1.05, 8, bambooMat);
      staffGrp.add(bamboo);
      [-0.28, 0, 0.28].forEach((ny) => {
        const node = new THREE.Mesh(new THREE.TorusGeometry(0.046, 0.01, 6, 10), creamMat);
        node.rotation.x = Math.PI / 2;
        node.position.y = ny;
        staffGrp.add(node);
      });
      const leaf = new THREE.Mesh(getTeardropFeatherGeo(THREE, 0.24, 0.08, 0.02), leafMat);
      leaf.position.set(0.03, 0.42, 0);
      leaf.rotation.z = -0.55;
      staffGrp.add(leaf);
      actor.add(staffGrp);
    }
    headTopY = 1.32;
    headZ = 0.2;
    neckY = 0.72;
    neckZ = 0.16;
  } else if (sp === 'pet_fox') {
    // Cáo lửa Kitsune mõm nhọn, chùm lông má, tai tam giác lớn, ức kem & quạt 7 đuôi rực rỡ (cấp 3+)
    const body = makeSphere(THREE, 0.36, 14, 10, c1Mat);
    body.scale.set(0.92, 0.92, 1.28);
    body.position.set(0, 0.46, 0);
    const ruff = makeSphere(THREE, 0.28, 10, 8, c2Mat);
    ruff.position.set(0, 0.54, 0.24);
    addLegs(c1Mat, darkMat, 0.12, 0.26, 0.18, 0.22, -0.22);

    const head = makeSphere(THREE, 0.34, 14, 10, c1Mat);
    head.scale.set(1.06, 0.92, 1.04);
    head.position.set(0, 0.9, 0.26);
    const snout = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.28, 8), c2Mat);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, 0.85, 0.62);
    const nose = makeSphere(THREE, 0.042, 8, 6, darkMat);
    nose.position.set(0, 0.85, 0.76);
    // Chùm lông má đặc trưng của cáo
    [-0.28, 0.28].forEach((cx) => {
      const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.18, 5), c2Mat);
      tuft.position.set(cx, 0.84, 0.34);
      tuft.rotation.z = cx < 0 ? 1.15 : -1.15;
      actor.add(tuft);
    });
    addEyes(0.13, 0.94, 0.54, 0.052);

    [-0.2, 0.2].forEach((ex) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.28, 6), c1Mat);
      ear.position.set(ex, 1.24, 0.22);
      ear.rotation.z = ex < 0 ? 0.22 : -0.22;
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.12, 6), darkMat);
      tip.position.set(ex * 1.15, 1.34, 0.22);
      tip.rotation.z = ear.rotation.z;
      actor.add(ear, tip);
    });

    // Đuôi cáo (1 đuôi lớn cấp 1, 3 đuôi cấp 2, Quạt 7 Đuôi Kitsune ở cấp 3-4!)
    const tailCount = stage >= 3 ? 7 : stage === 2 ? 3 : 1;
    for (let t = 0; t < tailCount; t++) {
      const spread = tailCount === 1 ? 0 : ((t / (tailCount - 1)) - 0.5) * 1.5;
      const tGrp = new THREE.Group();
      tGrp.position.set(0, 0.48, -0.44);
      tGrp.rotation.y = spread;
      tGrp.rotation.x = 0.58 - Math.abs(spread) * 0.12;
      const fTail = makeSphere(THREE, 0.17, 10, 8, c1Mat);
      fTail.scale.set(0.85, 0.85, 1.65);
      fTail.position.set(0, 0.18, -0.22);
      const tTip = makeSphere(THREE, 0.13, 8, 6, stage >= 2 ? flameMat : whiteMat);
      tTip.position.set(0, 0.26, -0.42);
      tGrp.add(fTail, tTip);
      actor.add(tGrp);
    }
    actor.add(body, ruff, head, snout, nose);
    headTopY = 1.24;
    headZ = 0.26;
    neckY = 0.68;
    neckZ = 0.2;
  } else {
    // 'pet_phoenix' — Phượng Hoàng rực lửa, mào lông 3 chóp, mỏ vàng, đôi cánh lông vũ 3 tầng rực rỡ & đuôi lụa uốn cong
    const body = makeSphere(THREE, 0.36, 14, 10, c1Mat);
    body.scale.set(0.92, 1.16, 1.12);
    body.position.set(0, 0.56, 0);
    const chest = makeSphere(THREE, 0.26, 10, 8, goldMat);
    chest.position.set(0, 0.54, 0.22);

    const head = makeSphere(THREE, 0.31, 14, 10, c1Mat);
    head.position.set(0, 1.0, 0.2);
    addEyes(0.13, 1.04, 0.45, 0.052, goldMat);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 6), goldMat);
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0.96, 0.54);

    // Mào phượng hoàng 3 chóp
    [-0.12, 0, 0.12].forEach((cx, idx) => {
      const crest = new THREE.Mesh(new THREE.ConeGeometry(0.055, idx === 1 ? 0.36 : 0.26, 6), idx === 1 ? goldMat : flameMat);
      crest.position.set(cx, 1.32, 0.12 - Math.abs(cx) * 0.2);
      crest.rotation.x = -0.5;
      crest.rotation.z = -cx * 1.4;
      actor.add(crest);
    });

    // Cánh chim lửa 2 lớp lông vũ điêu khắc dùng bảng màu biến thể rõ rệt + vỗ cánh mượt
    const phSpan = stage >= 3 ? 0.78 : 0.52;
    const phChord = stage >= 3 ? 0.4 : 0.28;
    const phOuterGeo = getFeatheredWingGeo(THREE, phSpan, phChord, 0.045);
    const phMidGeo = getFeatheredWingGeo(THREE, phSpan * 0.72, phChord * 0.74, 0.052);
    attachWingPair(THREE, actor, root, {
      shoulderX: 0.28,
      shoulderY: 0.72,
      shoulderZ: -0.02,
      sweepY: 0.52,
      liftZ: 0.34,
      flapAmp: 0.28,
      flapSpeed: 0.01,
      buildOneSide: (holder) => {
        const joint = makeSphere(THREE, 0.085, 8, 6, cTrimMat);
        const outer = new THREE.Mesh(phOuterGeo, stage >= 2 ? cTrimMat : c1Mat);
        const inner = new THREE.Mesh(phMidGeo, flameMat);
        inner.position.set(0.02, 0.03, 0.012);
        holder.add(joint, outer, inner);
      },
    });

    // Đuôi dải lụa lửa 3 nhánh uốn lượn
    const tailRibbonGeo = getTeardropFeatherGeo(THREE, 0.72, 0.15, 0.036);
    [-0.3, 0, 0.3].forEach((ang, idx) => {
      const plume = new THREE.Mesh(tailRibbonGeo, idx === 1 ? cTrimMat : flameMat);
      plume.position.set(0, 0.44, -0.34);
      plume.rotation.x = -Math.PI * 0.62;
      plume.rotation.z = ang;
      actor.add(plume);
    });
    actor.add(body, chest, head, beak);
    headTopY = 1.34;
    headZ = 0.2;
    neckY = 0.76;
    neckZ = 0.16;
  }

  // ==================== ĐẶC TRƯNG HÌNH DÁNG 3D RIÊNG CHO TỪNG BIẾN THỂ ====================
  if (variant === 'pastel') {
    // Pastel kẹo ngọt: vòng cổ mây bồng bềnh 6 múi + 2 ăng-ten kẹo tròn trên đầu
    for (let pi = 0; pi < 6; pi++) {
      const a = (pi / 6) * Math.PI * 2;
      const puff = makeSphere(THREE, 0.11, 8, 6, pi % 2 === 0 ? c2Mat : cTrimMat);
      puff.position.set(Math.sin(a) * 0.26, neckY - 0.02, neckZ + Math.cos(a) * 0.24);
      actor.add(puff);
    }
    [-0.17, 0.17].forEach((ax, idx) => {
      const stalk = makeCyl(THREE, 0.016, 0.02, 0.24, 6, c2Mat);
      stalk.position.set(ax, headTopY + 0.08, headZ + 0.04);
      stalk.rotation.z = ax < 0 ? 0.28 : -0.28;
      const candy = makeSphere(THREE, 0.082, 9, 8, idx === 0 ? pinkMat : cTrimMat);
      candy.position.set(ax * 1.32, headTopY + 0.22, headZ + 0.04);
      actor.add(stalk, candy);
    });
  } else if (variant === 'royal') {
    // Royal hoàng gia: áo choàng nhung tím viền vàng + vương miện hoàng gia đính hồng ngọc
    const capeMat = mats.get('#4C1D95', { roughness: 0.48, side: THREE.DoubleSide });
    const capeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, neckY + 0.02, neckZ - 0.15),
      new THREE.Vector3(0, neckY - 0.22, neckZ - 0.56),
      new THREE.Vector3(0, 0.14, -0.78),
    ]);
    const cape = new THREE.Mesh(new THREE.TubeGeometry(capeCurve, 10, 0.34, 8, false), capeMat);
    cape.scale.set(1.25, 1.0, 0.22);
    const clasp = makeSphere(THREE, 0.075, 8, 6, goldMat);
    clasp.position.set(0, neckY - 0.02, neckZ + 0.26);
    const crownBand = makeCyl(THREE, 0.18, 0.15, 0.13, 10, goldMat);
    crownBand.position.set(0, headTopY + 0.05, headZ);
    actor.add(cape, clasp, crownBand);
    for (let c = 0; c < 6; c++) {
      const ca = (c / 6) * Math.PI * 2;
      const point = new THREE.Mesh(new THREE.ConeGeometry(0.044, 0.14, 5), goldMat);
      point.position.set(Math.cos(ca) * 0.14, headTopY + 0.16, headZ + Math.sin(ca) * 0.14);
      actor.add(point);
    }
    const ruby = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), mats.get('#EC4899', { roughness: 0.15, emissive: '#DB2777', emissiveIntensity: 0.35 }));
    ruby.position.set(0, headTopY + 0.18, headZ);
    actor.add(ruby);
  } else if (variant === 'cosmic') {
    // Cosmic ngân hà: vành đai Sao Thổ nghiêng phát sáng + 2 ngôi sao quay quanh + trăng lưỡi liềm trên trán
    const orbitGrp = new THREE.Group();
    orbitGrp.position.set(0, 0.62, 0);
    const saturnRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.76, 0.036, 8, 28),
      mats.get('#22D3EE', { roughness: 0.2, emissive: '#06B6D4', emissiveIntensity: 0.72 })
    );
    saturnRing.rotation.set(1.22, 0.32, 0);
    orbitGrp.add(saturnRing);
    [0, Math.PI].forEach((ang, si) => {
      const star = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.095, 0),
        mats.get(si === 0 ? '#FDE047' : '#38BDF8', { emissive: si === 0 ? '#FACC15' : '#0284C7', emissiveIntensity: 0.7 })
      );
      star.position.set(Math.cos(ang) * 0.8, Math.sin(ang) * 0.2, Math.sin(ang) * 0.8);
      orbitGrp.add(star);
    });
    actor.add(orbitGrp);
    root.userData.variantOrbit = orbitGrp;

    const moonArc = new THREE.Mesh(
      new THREE.TorusGeometry(0.11, 0.028, 7, 14, Math.PI * 1.25),
      mats.get('#FEF08A', { emissive: '#FACC15', emissiveIntensity: 0.65 })
    );
    moonArc.position.set(0, headTopY + 0.11, headZ + 0.04);
    moonArc.rotation.z = -0.35;
    actor.add(moonArc);
  } else if (variant === 'golden') {
    // Golden hào quang mặt trời: bánh xe 8 tia sáng sau lưng quay chậm + vầng thái dương trên đầu
    const wheelGrp = new THREE.Group();
    wheelGrp.position.set(0, 0.78, -0.38);
    const sunRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.54, 0.032, 8, 24),
      mats.get('#FDE047', { roughness: 0.2, metalness: 0.6, emissive: '#F59E0B', emissiveIntensity: 0.55 })
    );
    wheelGrp.add(sunRing);
    for (let r = 0; r < 8; r++) {
      const ra = (r / 8) * Math.PI * 2;
      const ray = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.24, 5), goldMat);
      ray.position.set(Math.cos(ra) * 0.68, Math.sin(ra) * 0.68, 0);
      ray.rotation.z = ra - Math.PI / 2;
      wheelGrp.add(ray);
    }
    actor.add(wheelGrp);
    root.userData.variantWheel = wheelGrp;

    const sunGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), mats.get('#FEF08A', { emissive: '#F59E0B', emissiveIntensity: 0.65 }));
    sunGem.position.set(0, headTopY + 0.12, headZ + 0.04);
    actor.add(sunGem);
  }

  // ==================== VƯƠNG MIỆN CẤP 4 & 6 PHỤ KIỆN THÚ CƯNG ====================
  const acc = pet.accessoryId;
  if ((pet.stage >= 4 || acc === 'pacc_crown') && variant !== 'royal') {
    const crownBand = makeCyl(THREE, 0.17, 0.14, 0.12, 8, goldMat);
    crownBand.position.set(0, headTopY + 0.05, headZ);
    actor.add(crownBand);
    for (let c = 0; c < 5; c++) {
      const ca = (c / 5) * Math.PI * 2;
      const point = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.11, 4), goldMat);
      point.position.set(Math.cos(ca) * 0.125, headTopY + 0.14, headZ + Math.sin(ca) * 0.125);
      actor.add(point);
    }
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.065, 0), mats.get('#EC4899', { roughness: 0.2 }));
    gem.position.set(0, headTopY + 0.16, headZ);
    actor.add(gem);
  }
  if (acc === 'pacc_bow') {
    const bowCol = mats.get('#EC4899', { roughness: 0.45 });
    const bowL = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.16, 7), bowCol);
    bowL.rotation.z = -Math.PI / 2;
    bowL.scale.set(0.7, 1.0, 0.55);
    bowL.position.set(-0.085, headTopY + 0.03, headZ + 0.05);
    const bowR = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.16, 7), bowCol);
    bowR.rotation.z = Math.PI / 2;
    bowR.scale.set(0.7, 1.0, 0.55);
    bowR.position.set(0.085, headTopY + 0.03, headZ + 0.05);
    const knot = makeSphere(THREE, 0.045, 8, 6, goldMat);
    knot.position.set(0, headTopY + 0.03, headZ + 0.06);
    actor.add(bowL, bowR, knot);
  } else if (acc === 'pacc_bell') {
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.035, 8, 16), mats.get('#EF4444', { roughness: 0.5 }));
    strap.rotation.x = Math.PI / 2;
    strap.position.set(0, neckY, neckZ);
    const bell = makeSphere(THREE, 0.08, 8, 8, goldMat);
    bell.position.set(0, neckY - 0.04, neckZ + 0.25);
    actor.add(strap, bell);
  } else if (acc === 'pacc_glasses') {
    const gCol = mats.get('#0F172A', { roughness: 0.18, metalness: 0.45 });
    [-0.13, 0.13].forEach((gx) => {
      const lens = makeCyl(THREE, 0.085, 0.085, 0.03, 12, gCol);
      lens.rotation.x = Math.PI / 2;
      lens.scale.set(1.15, 1.0, 0.78);
      lens.position.set(gx, headTopY - 0.34, headZ + 0.34);
      actor.add(lens);
    });
    const bridge = makeCyl(THREE, 0.015, 0.015, 0.1, 6, goldMat);
    bridge.rotation.z = Math.PI / 2;
    bridge.position.set(0, headTopY - 0.33, headZ + 0.34);
    actor.add(bridge);
  } else if (acc === 'pacc_scarf') {
    const scarfMat = mats.get('#EF4444', { roughness: 0.65 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.065, 8, 16), scarfMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, neckY, neckZ);
    const tail = new THREE.Mesh(getTeardropFeatherGeo(THREE, 0.28, 0.1, 0.032), scarfMat);
    tail.position.set(0.14, neckY - 0.04, neckZ + 0.24);
    tail.rotation.x = Math.PI * 0.88;
    tail.rotation.z = 0.25;
    actor.add(ring, tail);
  } else if (acc === 'pacc_wizard') {
    const wizMat = mats.get('#4338CA', { roughness: 0.55 });
    const brim = makeCyl(THREE, 0.32, 0.32, 0.04, 16, wizMat);
    brim.position.set(0, headTopY + 0.02, headZ);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.42, 12), wizMat);
    cone.position.set(0, headTopY + 0.23, headZ);
    const band = makeCyl(THREE, 0.21, 0.21, 0.06, 12, goldMat);
    band.position.set(0, headTopY + 0.07, headZ);
    const starTip = new THREE.Mesh(new THREE.OctahedronGeometry(0.05, 0), goldMat);
    starTip.position.set(0, headTopY + 0.45, headZ);
    actor.add(brim, cone, band, starTip);
  }

  return root;
}

/**
 * Bảng màu giường / chăn / thảm / tranh đồng bộ giữa Nhà Phố (tổng quan) và Phòng Riêng
 */
function getPrivateRoomTheme(room, rooms = []) {
  if (!room || room.id === 'f2_parents') {
    return { bed: '#7C3AED', blanket: '#DDD6FE', rug: '#FBCFE8', poster: '#FDE047' };
  }
  const kidThemes = [
    { bed: '#0284C7', blanket: '#BAE6FD', rug: '#E0F2FE', poster: '#FDE047' },
    { bed: '#16A34A', blanket: '#BBF7D0', rug: '#DCFCE7', poster: '#FDBA74' },
    { bed: '#DB2777', blanket: '#FBCFE8', rug: '#FCE7F3', poster: '#BAE6FD' },
    { bed: '#D97706', blanket: '#FDE68A', rug: '#FEF3C7', poster: '#A7F3D0' },
    { bed: '#7C3AED', blanket: '#DDD6FE', rug: '#EDE9FE', poster: '#FBCFE8' },
    { bed: '#0D9488', blanket: '#99F6E4', rug: '#CCFBF1', poster: '#FDE047' },
  ];
  const kidRooms = (rooms || []).filter((r) => !r.id.startsWith('f1_') && !r.id.startsWith('f2_') && !r.isDisabled);
  const idx = Math.max(0, kidRooms.findIndex((r) => r.id === room.id));
  return kidThemes[idx % kidThemes.length];
}

function createBedroomFloorMat(THREE, textures) {
  return new THREE.MeshStandardMaterial({ map: textures.woodTex, roughness: 0.72, metalness: 0.05 });
}

/**
 * Dựng nội thất Nhà Phố 3D (Mở mặt cắt Isometric, cửa 2 cánh, nội thất đồng bộ với Phòng Riêng)
 */
function buildHouseInterior3D(THREE, mats, textures, rooms, state, wardrobeOpenedRoomId, isNight, findAnyCatalogItem, roomDecorSlots = []) {
  const group = new THREE.Group();
  const yShift = Math.max(0, (rooms.find((r) => r.id === 'f1_living')?.y || 570) - 570);
  const W = 1120 * WORLD_SCALE;
  const H = (800 + yShift) * WORLD_SCALE;

  const baseMat = mats.get('#1E293B', { roughness: 0.85 });
  const trimMat = mats.get('#FFFFFF', { roughness: 0.5 });
  const woodDark = mats.get('#78350F', { roughness: 0.72 });
  const woodMid = mats.get('#B47B48', { roughness: 0.68 });
  const woodDoor = mats.get('#92400E', { roughness: 0.62 });
  const woodDoorPanel = mats.get('#B45309', { roughness: 0.65 });
  const goldMat = mats.get('#FACC15', { roughness: 0.25, metalness: 0.6 });
  const bedroomFloorMat = createBedroomFloorMat(THREE, textures);

  // Outer foundation plinth
  const base = makeBox(THREE, W + 4.4, 0.45, H + 4.4, baseMat, false, true);
  base.position.set(W / 2, -0.22, H / 2);
  group.add(base);

  // Center corridor & staircase runner
  const hallW = 120 * WORLD_SCALE;
  const hallX = 560 * WORLD_SCALE;
  const hallFloor = makeBox(THREE, hallW, 0.12, H - 10 * WORLD_SCALE, mats.get('#E2E8F0', { roughness: 0.8 }), false, true);
  hallFloor.position.set(hallX, 0.06, H / 2);
  const hallRunner = makeBox(THREE, hallW * 0.46, 0.13, H - 24 * WORLD_SCALE, mats.get('#CBD5E1', { roughness: 0.78 }), false, true);
  hallRunner.position.set(hallX, 0.07, H / 2);
  group.add(hallFloor, hallRunner);

  for (let sy = 175; sy < 720 + yShift; sy += 30) {
    const step = makeBox(THREE, 3.3, 0.16, 0.72, mats.get('#94A3B8', { roughness: 0.68 }), false, true);
    step.position.set(hallX, 0.13, sy * WORLD_SCALE);
    group.add(step);
  }

  // Exit mat ("RA PHỐ") + Front Porch Arch Frame
  const exitMat = makeBox(THREE, 4.2, 0.14, 2.0, mats.get('#7C3AED', { roughness: 0.55 }));
  exitMat.position.set(hallX, 0.09, (735 + yShift) * WORLD_SCALE);
  const exitTrim = makeBox(THREE, 4.6, 0.12, 2.4, mats.get('#DDD6FE', { roughness: 0.6 }));
  exitTrim.position.set(hallX, 0.07, (735 + yShift) * WORLD_SCALE);
  group.add(exitTrim, exitMat);

  // Helper add hinged 3D wardrobe (double doors swing open when isOpen)
  const addWardrobe3D = (wx, wz, isOpen) => {
    const wGrp = new THREE.Group();
    wGrp.position.set(wx, 0.1, wz);
    const body = makeBox(THREE, 2.4, 2.6, 1.15, woodDark);
    body.position.y = 1.3;
    const crown = makeBox(THREE, 2.55, 0.16, 1.25, woodMid);
    crown.position.y = 2.66;
    wGrp.add(body, crown);

    if (isOpen) {
      const interior = makeBox(THREE, 2.1, 2.25, 0.9, mats.get('#FEF3C7', { roughness: 0.85 }));
      interior.position.set(0, 1.28, 0.16);
      const rod = makeCyl(THREE, 0.04, 0.04, 1.9, 8, mats.get('#94A3B8', { metalness: 0.7 }));
      rod.rotation.z = Math.PI / 2;
      rod.position.set(0, 2.05, 0.2);
      wGrp.add(interior, rod);
      ['#EF4444', '#38BDF8', '#22C55E', '#FACC15'].forEach((sc, idx) => {
        const shirt = makeBox(THREE, 0.34, 0.72, 0.2, mats.get(sc, { roughness: 0.65 }));
        shirt.position.set(-0.62 + idx * 0.42, 1.62, 0.22);
        wGrp.add(shirt);
      });
      [-1, 1].forEach((side) => {
        const doorPivot = new THREE.Group();
        doorPivot.position.set(side * 1.12, 1.28, 0.58);
        doorPivot.rotation.y = side * 1.35;
        const leaf = makeBox(THREE, 1.08, 2.32, 0.1, woodMid);
        leaf.position.set(side * -0.54, 0, 0);
        doorPivot.add(leaf);
        wGrp.add(doorPivot);
      });
    } else {
      [-0.56, 0.56].forEach((dx) => {
        const doorLeaf = makeBox(THREE, 1.06, 2.34, 0.12, woodMid);
        doorLeaf.position.set(dx, 1.28, 0.58);
        const knob = makeSphere(THREE, 0.06, 8, 6, goldMat);
        knob.position.set(dx * 0.35, 1.25, 0.68);
        wGrp.add(doorLeaf, knob);
      });
    }
    group.add(wGrp);
  };

  // Helper add framed interior window
  const addInteriorWindow = (x, y, z, rotY) => {
    const wG = new THREE.Group();
    wG.position.set(x, y, z);
    wG.rotation.y = rotY;
    const frame = makeBox(THREE, 2.4, 1.65, 0.42, trimMat);
    const glass = makeBox(
      THREE,
      2.05,
      1.3,
      0.46,
      mats.get(isNight ? '#1E293B' : '#7DD3FC', {
        emissive: isNight ? '#312E81' : '#38BDF8',
        emissiveIntensity: isNight ? 0.35 : 0.22,
      })
    );
    const mullion = makeBox(THREE, 0.1, 1.3, 0.48, trimMat);
    wG.add(frame, glass, mullion);
    group.add(wG);
  };

  // Rooms with clear partition walls, doorway cut-outs, jambs & symmetrical 2-leaf double doors
  const wallH = 3.25;
  const dividerH = 1.05;
  rooms.forEach((r) => {
    const rx = (r.x + r.w / 2) * WORLD_SCALE;
    const rz = (r.y + r.h / 2) * WORLD_SCALE;
    const rw = r.w * WORLD_SCALE;
    const rd = r.h * WORLD_SCALE;
    const isBedroom = !r.isDisabled && (r.id === 'f2_parents' || (!r.id.startsWith('f1_') && !r.id.startsWith('f2_')));

    const floorMesh = makeBox(
      THREE,
      rw - 0.12,
      0.12,
      rd - 0.12,
      r.isDisabled
        ? mats.get('#94A3B8', { roughness: 0.8 })
        : isBedroom
          ? bedroomFloorMat
          : mats.get(r.floor || '#E5AA6C', { roughness: 0.74 }),
      false,
      true
    );
    floorMesh.position.set(rx, 0.06, rz);
    group.add(floorMesh);

    const ownerMember = isBedroom && r.ownerIds?.length ? state.members.find((m) => m.id === r.ownerIds[0]) : null;
    const wallCol = r.isDisabled ? '#CBD5E1' : (ownerMember && ownerMember.roomWall) || r.wall || '#FFF3DA';
    const wallMat = mats.get(wallCol, { roughness: 0.78 });
    const wainscotMat = mats.get(isBedroom ? wallCol : '#F1F5F9', { roughness: 0.76 });
    const isOpaquePrivateRoom = isBedroom || r.isDisabled;

    // Back North wall + baseboard trim
    const nWall = makeBox(THREE, rw, wallH, 0.32, wallMat);
    nWall.position.set(rx, wallH / 2, rz - rd / 2);
    const nTrim = makeBox(THREE, rw + 0.05, 0.35, 0.38, trimMat);
    nTrim.position.set(rx, 0.18, rz - rd / 2);
    group.add(nWall, nTrim);

    // Outer West/East wall + window (shared rooms on outer wall)
    const outerX = r.doorSide === 'right' ? rx - rw / 2 : rx + rw / 2;
    const sWall = makeBox(THREE, 0.32, wallH, rd, wallMat);
    sWall.position.set(outerX, wallH / 2, rz);
    const sTrim = makeBox(THREE, 0.38, 0.35, rd + 0.05, trimMat);
    sTrim.position.set(outerX, 0.18, rz);
    group.add(sWall, sTrim);
    if (!isOpaquePrivateRoom) {
      addInteriorWindow(outerX, 1.95, rz - rd * 0.08, Math.PI / 2);
    }

    // South wall: full height + privacy roof cap on private bedrooms so interior stays hidden from hallway; cutaway divider on shared rooms
    const sDivH = isOpaquePrivateRoom ? wallH : dividerH;
    const southDiv = makeBox(THREE, rw, sDivH, 0.24, wainscotMat);
    southDiv.position.set(rx, sDivH / 2, rz + rd / 2);
    const southCap = makeBox(THREE, rw + 0.08, 0.14, 0.32, trimMat);
    southCap.position.set(rx, sDivH + 0.04, rz + rd / 2);
    group.add(southDiv, southCap);

    // Hallway Partition Wall with doorway cut-out
    const partX = (r.doorSide === 'right' ? r.x + r.w : r.x) * WORLD_SCALE;
    const doorTop2D = r.y + r.h - 95;
    const doorBot2D = r.y + r.h - 5;
    const upperWallLen = Math.max(0.2, (doorTop2D - r.y) * WORLD_SCALE);
    const upperWallZ = (r.y + (doorTop2D - r.y) / 2) * WORLD_SCALE;

    const partWall = makeBox(THREE, 0.3, wallH, upperWallLen, wallMat);
    partWall.position.set(partX, wallH / 2, upperWallZ);
    const partTrim = makeBox(THREE, 0.36, 0.35, upperWallLen, trimMat);
    partTrim.position.set(partX, 0.18, upperWallZ);
    group.add(partWall, partTrim);

    // Doorway frame (lintel + 2 wooden jamb posts + threshold)
    const doorSpanZ = (doorBot2D - doorTop2D) * WORLD_SCALE;
    const doorCenterZ = ((doorTop2D + doorBot2D) / 2) * WORLD_SCALE;
    const lintelH = 0.72;
    const lintel = makeBox(THREE, 0.32, lintelH, doorSpanZ + 0.35, wallMat);
    lintel.position.set(partX, wallH - lintelH / 2, doorCenterZ);
    const postTop = makeBox(THREE, 0.4, 2.55, 0.26, woodDark);
    postTop.position.set(partX, 1.28, doorTop2D * WORLD_SCALE);
    const postBot = makeBox(THREE, 0.4, 2.55, 0.26, woodDark);
    postBot.position.set(partX, 1.28, doorBot2D * WORLD_SCALE);
    const headerBar = makeBox(THREE, 0.42, 0.22, doorSpanZ + 0.36, woodDark);
    headerBar.position.set(partX, 2.55, doorCenterZ);
    const threshold = makeBox(THREE, 0.45, 0.13, doorSpanZ, woodMid);
    threshold.position.set(partX, 0.07, doorCenterZ);
    group.add(lintel, postTop, postBot, headerBar, threshold);

    // Symmetrical 2-leaf Double Door ("Cửa 2 cánh")
    const isLockedOrClosed = Boolean(r.isDisabled || (r.ownerIds?.length > 0 && !r.isUnlocked));
    const leafLen = Math.max(0.75, (doorSpanZ - 0.34) * 0.5);
    const leafMat = r.isDisabled ? mats.get('#64748B', { roughness: 0.7 }) : woodDoor;
    const insetMat = r.isDisabled ? mats.get('#475569', { roughness: 0.72 }) : woodDoorPanel;
    const knobSide = r.doorSide === 'right' ? 0.1 : -0.1;

    [-1, 1].forEach((side) => {
      const pivot = new THREE.Group();
      pivot.position.set(
        partX,
        0.12,
        side === -1 ? doorTop2D * WORLD_SCALE + 0.14 : doorBot2D * WORLD_SCALE - 0.14
      );
      const leaf = makeBox(THREE, 0.13, 2.36, leafLen, leafMat);
      leaf.position.set(0, 1.18, -side * (leafLen / 2));
      const panelTop = makeBox(THREE, 0.16, 0.85, leafLen * 0.66, insetMat);
      panelTop.position.set(0, 1.72, -side * (leafLen / 2));
      const panelBot = makeBox(THREE, 0.16, 0.75, leafLen * 0.66, insetMat);
      panelBot.position.set(0, 0.68, -side * (leafLen / 2));
      const handle = makeSphere(THREE, 0.07, 8, 6, goldMat);
      handle.position.set(knobSide, 1.14, -side * (leafLen - 0.22));
      pivot.add(leaf, panelTop, panelBot, handle);

      if (isLockedOrClosed) {
        pivot.rotation.y = 0;
      } else {
        pivot.rotation.y = r.doorSide === 'right' ? side * 1.28 : -side * 1.28;
      }
      group.add(pivot);
    });

    if (isLockedOrClosed) {
      const lockBadge = makeBox(THREE, 0.24, 0.32, 0.26, goldMat);
      lockBadge.position.set(partX, 1.26, doorCenterZ);
      group.add(lockBadge);
    }

    // Privacy ceiling enclosure for private bedrooms & disabled rooms so furniture is hidden from hallway view
    if (isOpaquePrivateRoom) {
      const roofCap = makeBox(
        THREE,
        rw - 0.18,
        0.16,
        rd - 0.18,
        mats.get(r.isDisabled ? '#94A3B8' : wallCol, { roughness: 0.72 }),
        false,
        true
      );
      roofCap.position.set(rx, wallH - 0.08, rz);
      const roofBorder = makeBox(THREE, rw + 0.06, 0.08, rd + 0.06, trimMat);
      roofBorder.position.set(rx, wallH + 0.02, rz);
      group.add(roofCap, roofBorder);
    }
  });

  // 1. PHÒNG KHÁCH (f1_living): Sofa chữ L, bàn trà, TV + kệ sát tường Bắc, Bảng nhiệm vụ sát tường Bắc
  const f1LivingTopZ = (560 + yShift) * WORLD_SCALE + 0.16;
  const sofaBase = makeBox(THREE, 5.2, 0.65, 2.1, mats.get('#F43F5E', { roughness: 0.72 }));
  sofaBase.position.set(200 * WORLD_SCALE, 0.42, (690 + yShift) * WORLD_SCALE);
  const sofaBack = makeBox(THREE, 5.2, 0.65, 0.55, mats.get('#E11D48', { roughness: 0.72 }));
  sofaBack.position.set(200 * WORLD_SCALE, 0.92, (704 + yShift) * WORLD_SCALE);
  const sofaSide = makeBox(THREE, 1.5, 0.65, 2.6, mats.get('#F43F5E', { roughness: 0.72 }));
  sofaSide.position.set(162 * WORLD_SCALE, 0.42, (662 + yShift) * WORLD_SCALE);
  [-1.6, 0, 1.6].forEach((px, idx) => {
    const cush = makeBox(THREE, 1.1, 0.42, 0.36, mats.get(idx === 1 ? '#FDE047' : '#FFFFFF', { roughness: 0.8 }));
    cush.position.set(200 * WORLD_SCALE + px, 0.9, (695 + yShift) * WORLD_SCALE);
    group.add(cush);
  });
  const coffeeTbl = makeBox(THREE, 2.8, 0.48, 1.4, woodMid);
  coffeeTbl.position.set(235 * WORLD_SCALE, 0.34, (652 + yShift) * WORLD_SCALE);
  const livingRug = makeBox(THREE, 5.8, 0.06, 3.4, mats.get('#DBEAFE', { roughness: 0.9 }), false, true);
  livingRug.position.set(225 * WORLD_SCALE, 0.13, (662 + yShift) * WORLD_SCALE);

  const tvConsole = makeBox(THREE, 3.4, 0.7, 0.85, woodDark);
  tvConsole.position.set(320 * WORLD_SCALE, 0.45, f1LivingTopZ + 0.44);
  const tvFrame = makeBox(THREE, 2.7, 1.65, 0.25, mats.get('#0F172A', { roughness: 0.28 }));
  tvFrame.position.set(320 * WORLD_SCALE, 1.68, f1LivingTopZ + 0.16);
  const tvScreen = makeBox(THREE, 2.42, 1.38, 0.28, mats.get('#38BDF8', { emissive: '#0284C7', emissiveIntensity: 0.45 }));
  tvScreen.position.set(320 * WORLD_SCALE, 1.68, f1LivingTopZ + 0.16);

  const boardFrame = makeBox(THREE, 2.5, 1.7, 0.18, woodMid);
  boardFrame.position.set(427 * WORLD_SCALE, 1.75, f1LivingTopZ + 0.1);
  const boardFace = makeBox(THREE, 2.25, 1.45, 0.22, mats.get('#FDE68A', { roughness: 0.7 }));
  boardFace.position.set(427 * WORLD_SCALE, 1.75, f1LivingTopZ + 0.1);
  [-0.6, 0.1, 0.7].forEach((nx, i) => {
    const note = makeBox(THREE, 0.45, 0.45, 0.24, mats.get(['#FB7185', '#4ADE80', '#38BDF8'][i], { roughness: 0.6 }));
    note.position.set(427 * WORLD_SCALE + nx, 1.82 + (i === 1 ? -0.32 : 0.12), f1LivingTopZ + 0.11);
    group.add(note);
  });
  group.add(livingRug, sofaBase, sofaBack, sofaSide, coffeeTbl, tvConsole, tvFrame, tvScreen, boardFrame, boardFace);

  // 2. PHÒNG BẾP & ĂN (f1_dining): Bàn ăn 4 ghế + quầy bếp sát tường Bắc + tủ lạnh sát góc Đông-Bắc
  const dx = 830 * WORLD_SCALE;
  const dz = (675 + yShift) * WORLD_SCALE;
  const tableTop = makeCyl(THREE, 2.4, 2.4, 0.22, 16, woodMid);
  tableTop.position.set(dx, 0.96, dz);
  const runner = makeBox(THREE, 3.6, 0.04, 1.1, mats.get('#FB7185', { roughness: 0.8 }));
  runner.position.set(dx, 1.09, dz);
  const tableLeg = makeCyl(THREE, 0.45, 0.75, 0.9, 10, woodDark);
  tableLeg.position.set(dx, 0.48, dz);
  group.add(tableTop, runner, tableLeg);

  [
    [-2.7, 0],
    [2.7, 0],
    [0, -2.7],
    [0, 2.7],
  ].forEach(([cx, cz]) => {
    const seat = makeBox(THREE, 1.05, 0.16, 1.05, mats.get('#38BDF8', { roughness: 0.65 }));
    seat.position.set(dx + cx, 0.62, dz + cz);
    const leg = makeCyl(THREE, 0.12, 0.12, 0.55, 6, woodDark);
    leg.position.set(dx + cx, 0.34, dz + cz);
    group.add(seat, leg);
  });

  const counterZ = f1LivingTopZ + 0.72;
  const counter = makeBox(THREE, 6.4, 1.2, 1.4, mats.get('#F8FAFC', { roughness: 0.5 }));
  counter.position.set(820 * WORLD_SCALE, 0.68, counterZ);
  const counterTop = makeBox(THREE, 6.5, 0.14, 1.5, mats.get('#CBD5E1', { roughness: 0.4 }));
  counterTop.position.set(820 * WORLD_SCALE, 1.32, counterZ);
  const sink = makeBox(THREE, 1.4, 0.08, 0.9, mats.get('#94A3B8', { metalness: 0.5 }));
  sink.position.set(790 * WORLD_SCALE, 1.4, counterZ);
  const fridgeX = 1020 * WORLD_SCALE - 0.18 - 1.02;
  const fridgeZ = f1LivingTopZ + 0.78;
  const fridge = makeBox(THREE, 2.0, 3.0, 1.5, mats.get('#34D399', { roughness: 0.38 }));
  fridge.position.set(fridgeX, 1.6, fridgeZ);
  const fridgeLine = makeBox(THREE, 2.04, 0.08, 1.54, mats.get('#FFFFFF', { roughness: 0.4 }));
  fridgeLine.position.set(fridgeX, 2.1, fridgeZ);
  group.add(counter, counterTop, sink, fridge, fridgeLine);

  // 3. PHÒNG SINH HOẠT CHUNG (f2_common): Tủ sách sát tường Bắc + thảm tròn + gối lười đọc sách
  const f2Common = rooms.find((r) => r.id === 'f2_common');
  const f2CommonTopZ = (f2Common ? f2Common.y : 340 + yShift) * WORLD_SCALE + 0.16;
  const shelfX = 225 * WORLD_SCALE;
  const shelfZ = f2CommonTopZ + 0.58;
  const rug = makeCyl(THREE, 3.8, 3.8, 0.07, 22, mats.get('#FCE7F3', { roughness: 0.9 }), false, true);
  rug.position.set(shelfX + 3.2, 0.12, f2CommonTopZ + 4.8);
  const bookshelf = makeBox(THREE, 5.2, 3.0, 1.1, woodDark);
  bookshelf.position.set(shelfX, 1.55, shelfZ);
  const bookCols = ['#EF4444', '#F59E0B', '#22C55E', '#38BDF8', '#A855F7', '#EC4899'];
  for (let row = 0; row < 3; row++) {
    for (let b = 0; b < 6; b++) {
      const book = makeBox(THREE, 0.62, 0.56, 0.8, mats.get(bookCols[(row + b) % bookCols.length], { roughness: 0.6 }));
      book.position.set(shelfX - 1.9 + b * 0.76, 0.65 + row * 0.88, shelfZ + 0.22);
      group.add(book);
    }
  }
  const beanbag = makeSphere(THREE, 1.05, 10, 8, mats.get('#FB923C', { roughness: 0.85 }));
  beanbag.scale.set(1.15, 0.65, 1.15);
  beanbag.position.set(shelfX + 3.4, 0.45, f2CommonTopZ + 5.0);
  group.add(rug, bookshelf, beanbag);

  // Only render placed decor that sits inside open shared rooms (never on doorways or inside hidden bedrooms)
  const sharedFloorIds = new Set(['f1_living', 'f1_dining', 'f2_common']);
  const sharedRooms = rooms.filter((rm) => sharedFloorIds.has(rm.id));
  state.members.forEach((m) => {
    (m.roomDecor || []).forEach((d) => {
      if (d.id === 'd_bookshelf') return;
      const dy = d.y + yShift;
      const inShared = sharedRooms.some((rm) => d.x >= rm.x + 25 && d.x <= rm.x + rm.w - 25 && dy >= rm.y + 25 && dy <= rm.y + rm.h - 20);
      if (!inShared) return;
      const decorMesh = buildDecorProp3D(THREE, mats, d.id, findAnyCatalogItem);
      decorMesh.position.set(d.x * WORLD_SCALE, 0.1, dy * WORLD_SCALE);
      group.add(decorMesh);
    });
  });

  return group;
}

/**
 * Dựng 1 món đồ trang trí 3D cho phòng riêng / phòng khách
 */
function buildDecorProp3D(THREE, mats, decorId, findAnyCatalogItem) {
  return buildCatalogItem3D(THREE, mats, decorId, findAnyCatalogItem);
}

/**
 * Dựng Phòng Riêng 3D (đồng bộ 100% thiết kế với phòng trong Nhà Phố + cửa 2 cánh + toàn bộ không gian 760x420)
 */
function buildPrivateRoom3D(THREE, mats, textures, room, houseRooms, ownerMember, wardrobeOpenedRoomId, isNight, roomDecorSlots, findAnyCatalogItem) {
  const g = new THREE.Group();
  const W = 760 * WORLD_SCALE;
  const H = 420 * WORLD_SCALE;
  const wallCol = (ownerMember && ownerMember.roomWall) || (room && room.wall) || '#D5F5E3';
  const theme = getPrivateRoomTheme(room, houseRooms);

  const floorMat = createBedroomFloorMat(THREE, textures);
  const floor = makeBox(THREE, W, 0.2, H, floorMat, false, true);
  floor.position.set(W / 2, -0.05, H / 2);
  g.add(floor);

  const wallMat = mats.get(wallCol, { roughness: 0.78 });
  const trimMat = mats.get('#FFFFFF', { roughness: 0.5 });
  const woodDark = mats.get('#78350F', { roughness: 0.72 });
  const woodMid = mats.get('#B47B48', { roughness: 0.68 });
  const woodDoor = mats.get('#92400E', { roughness: 0.62 });
  const woodDoorPanel = mats.get('#B45309', { roughness: 0.65 });
  const goldMat = mats.get('#FACC15', { roughness: 0.25, metalness: 0.6 });

  const doorSide = room?.doorSide === 'right' ? 'right' : 'left';
  const doorTopZ = 265 * WORLD_SCALE;
  const doorBotZ = 355 * WORLD_SCALE;
  const doorSpanZ = doorBotZ - doorTopZ;
  const doorCenterZ = (doorTopZ + doorBotZ) / 2;

  const wallH = 5.4;
  const nWall = makeBox(THREE, W + 0.6, wallH, 0.45, wallMat);
  nWall.position.set(W / 2, wallH / 2, -0.225);
  const nTrim = makeBox(THREE, W + 0.5, 0.42, 0.5, trimMat);
  nTrim.position.set(W / 2, 0.22, -0.18);
  g.add(nWall, nTrim);

  // Build West & East walls: side WITHOUT exit door is solid; side WITH exit door has doorway cut-out matching hallway!
  const addSolidSideWall = (wx) => {
    const sw = makeBox(THREE, 0.45, wallH, H, wallMat);
    sw.position.set(wx, wallH / 2, H / 2);
    const st = makeBox(THREE, 0.5, 0.42, H, trimMat);
    st.position.set(wx, 0.22, H / 2);
    g.add(sw, st);
  };

  const addDoorSideWall = (wx, inwardSign) => {
    // Upper section (from z = 0 to doorTopZ)
    const upperLen = doorTopZ;
    const uWall = makeBox(THREE, 0.45, wallH, upperLen, wallMat);
    uWall.position.set(wx, wallH / 2, upperLen / 2);
    const uTrim = makeBox(THREE, 0.5, 0.42, upperLen, trimMat);
    uTrim.position.set(wx, 0.22, upperLen / 2);
    g.add(uWall, uTrim);

    // Lower section (from doorBotZ to H)
    const lowerLen = Math.max(0.2, H - doorBotZ);
    const lWall = makeBox(THREE, 0.45, wallH, lowerLen, wallMat);
    lWall.position.set(wx, wallH / 2, doorBotZ + lowerLen / 2);
    const lTrim = makeBox(THREE, 0.5, 0.42, lowerLen, trimMat);
    lTrim.position.set(wx, 0.22, doorBotZ + lowerLen / 2);
    g.add(lWall, lTrim);

    // Doorway lintel, jamb posts, header & threshold
    const lintelH = wallH - 2.65;
    const lintel = makeBox(THREE, 0.45, lintelH, doorSpanZ + 0.4, wallMat);
    lintel.position.set(wx, wallH - lintelH / 2, doorCenterZ);
    const postTop = makeBox(THREE, 0.52, 2.65, 0.28, woodDark);
    postTop.position.set(wx, 1.325, doorTopZ);
    const postBot = makeBox(THREE, 0.52, 2.65, 0.28, woodDark);
    postBot.position.set(wx, 1.325, doorBotZ);
    const headerBar = makeBox(THREE, 0.54, 0.22, doorSpanZ + 0.4, woodDark);
    headerBar.position.set(wx, 2.65, doorCenterZ);
    const threshold = makeBox(THREE, 0.9, 0.14, doorSpanZ + 0.1, woodMid);
    threshold.position.set(wx + inwardSign * 0.15, 0.07, doorCenterZ);
    g.add(lintel, postTop, postBot, headerBar, threshold);

    // Symmetrical 2-leaf Double Exit Door swinging inward
    const exitLeafLen = Math.max(0.9, (doorSpanZ - 0.34) * 0.5);
    [-1, 1].forEach((side) => {
      const piv = new THREE.Group();
      piv.position.set(
        wx + inwardSign * 0.08,
        0.12,
        side === -1 ? doorTopZ + 0.14 : doorBotZ - 0.14
      );
      piv.rotation.y = inwardSign > 0 ? -side * 1.26 : side * 1.26;
      const leaf = makeBox(THREE, 0.14, 2.48, exitLeafLen, woodDoor);
      leaf.position.set(0, 1.24, -side * (exitLeafLen / 2));
      const panel = makeBox(THREE, 0.17, 1.85, exitLeafLen * 0.68, woodDoorPanel);
      panel.position.set(0, 1.28, -side * (exitLeafLen / 2));
      const handle = makeSphere(THREE, 0.08, 8, 6, goldMat);
      handle.position.set(inwardSign * 0.11, 1.18, -side * (exitLeafLen - 0.24));
      piv.add(leaf, panel, handle);
      g.add(piv);
    });
  };

  if (doorSide === 'right') {
    addSolidSideWall(-0.225);
    addDoorSideWall(W + 0.225, -1);
  } else {
    addDoorSideWall(-0.225, 1);
    addSolidSideWall(W + 0.225);
  }

  // Centered Window on North wall with mullions
  const winFrame = makeBox(THREE, 4.6, 2.9, 0.55, trimMat);
  winFrame.position.set(380 * WORLD_SCALE, 3.25, -0.15);
  const winGlass = makeBox(
    THREE,
    4.1,
    2.4,
    0.6,
    mats.get(isNight ? '#1E293B' : '#7DD3FC', { emissive: isNight ? '#312E81' : '#38BDF8', emissiveIntensity: isNight ? 0.35 : 0.22 })
  );
  winGlass.position.set(380 * WORLD_SCALE, 3.25, -0.15);
  const winMullion = makeBox(THREE, 0.14, 2.4, 0.64, trimMat);
  winMullion.position.set(380 * WORLD_SCALE, 3.25, -0.15);
  g.add(winFrame, winGlass, winMullion);

  // Framed wall poster next to window
  const posterFrame = makeBox(THREE, 2.2, 1.55, 0.14, woodMid);
  posterFrame.position.set(535 * WORLD_SCALE, 3.25, 0.04);
  const posterArt = makeBox(THREE, 1.85, 1.22, 0.16, mats.get(theme.poster, { roughness: 0.6 }));
  posterArt.position.set(535 * WORLD_SCALE, 3.25, 0.05);
  g.add(posterFrame, posterArt);

  // Bed + Headboard + Nightstand & Lamp FLUSH in upper-left corner (North x West inner walls)
  const headboard = makeBox(THREE, 6.0, 2.1, 0.35, woodDark);
  headboard.position.set(3.04, 1.05, 0.2);
  const bedBase = makeBox(THREE, 5.8, 0.9, 4.2, mats.get(theme.bed, { roughness: 0.72 }));
  bedBase.position.set(2.94, 0.45, 2.45);
  const pillow = makeBox(THREE, 3.8, 0.35, 0.9, trimMat);
  pillow.position.set(2.94, 1.0, 0.88);
  const blanket = makeBox(THREE, 5.4, 0.32, 2.75, mats.get(theme.blanket, { roughness: 0.82 }));
  blanket.position.set(2.94, 0.96, 3.12);
  const nightstand = makeBox(THREE, 1.45, 1.05, 1.25, woodMid);
  nightstand.position.set(6.82, 0.52, 0.66);
  const lampShade = makeCyl(THREE, 0.3, 0.48, 0.5, 10, mats.get('#FDE047', { emissive: '#FACC15', emissiveIntensity: isNight ? 1.85 : 0.45 }));
  lampShade.position.set(6.82, 1.45, 0.66);
  g.add(bedBase, headboard, blanket, pillow, nightstand, lampShade);

  // Double-door Hinged Wardrobe FLUSH in upper-right corner (North x East inner walls)
  const isOpen = Boolean(room && wardrobeOpenedRoomId === room.id);
  const wardGroup = new THREE.Group();
  wardGroup.position.set(W - 1.94, 0.1, 0.84);
  const wardBody = makeBox(THREE, 3.8, 4.0, 1.6, woodDark);
  wardBody.position.y = 2.0;
  const wardCrown = makeBox(THREE, 4.0, 0.22, 1.75, woodMid);
  wardCrown.position.y = 4.1;
  wardGroup.add(wardBody, wardCrown);
  if (isOpen) {
    const inner = makeBox(THREE, 3.4, 3.5, 1.2, mats.get('#FEF3C7', { roughness: 0.85 }));
    inner.position.set(0, 1.9, 0.25);
    const rod = makeCyl(THREE, 0.06, 0.06, 3.0, 8, mats.get('#94A3B8', { metalness: 0.7 }));
    rod.rotation.z = Math.PI / 2;
    rod.position.set(0, 3.1, 0.28);
    wardGroup.add(inner, rod);
    ['#EF4444', '#38BDF8', '#22C55E', '#FACC15'].forEach((sc, idx) => {
      const shirt = makeBox(THREE, 0.54, 1.1, 0.28, mats.get(sc, { roughness: 0.65 }));
      shirt.position.set(-1.0 + idx * 0.66, 2.45, 0.32);
      wardGroup.add(shirt);
    });
    [-1, 1].forEach((side) => {
      const piv = new THREE.Group();
      piv.position.set(side * 1.8, 1.9, 0.82);
      piv.rotation.y = side * 1.35;
      const dLeaf = makeBox(THREE, 1.72, 3.6, 0.12, woodMid);
      dLeaf.position.set(side * -0.86, 0, 0);
      piv.add(dLeaf);
      wardGroup.add(piv);
    });
  } else {
    [-0.88, 0.88].forEach((dx) => {
      const dLeaf = makeBox(THREE, 1.72, 3.6, 0.14, woodMid);
      dLeaf.position.set(dx, 1.95, 0.84);
      const knob = makeSphere(THREE, 0.09, 8, 6, goldMat);
      knob.position.set(dx * 0.25, 1.9, 0.96);
      wardGroup.add(dLeaf, knob);
    });
  }
  g.add(wardGroup);

  // Center themed oval rug
  const rug = makeCyl(THREE, 6.8, 6.8, 0.08, 24, mats.get(theme.rug, { roughness: 0.88 }), false, true);
  rug.scale.set(1.18, 1, 0.6);
  rug.position.set(380 * WORLD_SCALE, 0.09, 230 * WORLD_SCALE);
  g.add(rug);

  // Continuous low South cutaway divider wall
  const divH = 1.05;
  const sWall = makeBox(THREE, W + 0.4, divH, 0.28, wallMat);
  sWall.position.set(W / 2, divH / 2, H + 0.06);
  const sCap = makeBox(THREE, W + 0.5, 0.14, 0.34, trimMat);
  sCap.position.set(W / 2, divH + 0.04, H + 0.06);
  g.add(sWall, sCap);

  // 8 Decor Slots spread cleanly across entire 760x420 room
  const slotsMap = (ownerMember && ownerMember.roomSlots) || {};
  roomDecorSlots.forEach((slot) => {
    const sx = slot.x * WORLD_SCALE;
    const sz = slot.y * WORLD_SCALE;
    const placedId = slotsMap[slot.id];
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.85, 1.05, 18),
      mats.get(placedId ? '#14B8A6' : '#94A3B8', { roughness: 0.6 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(sx, 0.08, sz);
    g.add(ring);

    if (placedId) {
      const prop = buildDecorProp3D(THREE, mats, placedId, findAnyCatalogItem);
      prop.position.set(sx, 0.08, sz);
      g.add(prop);
    }
  });

  return g;
}

/**
 * Khởi tạo Engine 3D Low-Poly Isometric
 */
export async function createScene3D(canvasEl) {
  if (!_THREE) {
    if (window.__THREE_READY__) {
      _THREE = await window.__THREE_READY__;
    }
    if (!_THREE && window.THREE) {
      _THREE = window.THREE;
    }
  }
  const THREE = _THREE;
  if (!THREE) {
    throw new Error('Three.js chưa sẵn sàng từ CDN.');
  }

  const isSoftwareGl = detectSoftwareWebGL();
  const renderer = new THREE.WebGLRenderer({
    canvas: canvasEl,
    antialias: !isSoftwareGl,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.shadowMap.enabled = !isSoftwareGl;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PASTEL_PALETTE.skyDay);
  scene.fog = new THREE.Fog(PASTEL_PALETTE.skyDay, 95, 225);

  if (window.THREE_ROOM_ENV) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new window.THREE_ROOM_ENV(), 0.04).texture;
    scene.environmentIntensity = 0.85;
    pmrem.dispose();
  }

  // Dual Cameras: OrthographicCamera (45° Isometric default) + PerspectiveCamera (XCity oblique view)
  let savedCameraMode = 'ortho';
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem(CAMERA_MODE_STORAGE_KEY) === 'perspective') {
      savedCameraMode = 'perspective';
    }
  } catch {
    // ignore storage errors
  }

  const baseHalfH = 14.5;
  const aspect = window.innerWidth / Math.max(1, window.innerHeight);
  const orthoCamera = new THREE.OrthographicCamera(
    -baseHalfH * aspect,
    baseHalfH * aspect,
    baseHalfH,
    -baseHalfH,
    -220,
    450
  );
  const perspCamera = new THREE.PerspectiveCamera(44, aspect, 0.5, 580);

  // Procedural Gradient + Starry Night Sky Dome
  const skyDome = buildSkyDome(THREE);
  scene.add(skyDome.mesh);

  // Studio / Outdoor balanced lighting (crisp daytime, high-contrast glowing night)
  const hemiLight = new THREE.HemisphereLight('#CFEFFF', '#5A9E3C', 0.58);
  hemiLight.position.set(0, 60, 0);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight('#FFF3D6', 1.34);
  sunLight.position.set(36, 48, 30);
  sunLight.castShadow = !isSoftwareGl;
  sunLight.shadow.mapSize.width = isSoftwareGl ? 1024 : 2048;
  sunLight.shadow.mapSize.height = isSoftwareGl ? 1024 : 2048;
  sunLight.shadow.camera.near = 2;
  sunLight.shadow.camera.far = 140;
  const shadowSpan = 30;
  sunLight.shadow.camera.left = -shadowSpan;
  sunLight.shadow.camera.right = shadowSpan;
  sunLight.shadow.camera.top = shadowSpan;
  sunLight.shadow.camera.bottom = -shadowSpan;
  sunLight.shadow.bias = -0.0004;
  sunLight.shadow.normalBias = 0.03;
  sunLight.shadow.radius = 3;
  scene.add(sunLight);
  scene.add(sunLight.target);

  const rimLight = new THREE.DirectionalLight('#93C5FD', 0.26);
  rimLight.position.set(-28, 22, -24);
  scene.add(rimLight);

  // Persistent real PointLight pool (zero shader recompiles, illuminates ground, buildings & characters at night)
  const lampPointLights = Array.from({ length: 3 }, () => {
    const pl = new THREE.PointLight('#FDE047', 0, 24, 1.45);
    scene.add(pl);
    return pl;
  });
  const buildingPointLights = Array.from({ length: 3 }, () => {
    const pl = new THREE.PointLight('#FBBF24', 0, 26, 1.45);
    scene.add(pl);
    return pl;
  });
  const carPointLights = Array.from({ length: 2 }, () => {
    const pl = new THREE.PointLight('#FEF9C3', 0, 22, 1.5);
    scene.add(pl);
    return pl;
  });
  const playerNightLight = new THREE.PointLight('#FDE68A', 0, 9.5, 1.7);
  scene.add(playerNightLight);
  const interiorPointLights = Array.from({ length: 2 }, () => {
    const pl = new THREE.PointLight('#FFE4A0', 0, 44, 1.2);
    scene.add(pl);
    return pl;
  });
  const nightLampAnchors = [];
  const nightBuildingAnchors = [];

  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy?.() || 1);
  const textures = createProceduralTextures(THREE, maxAniso);
  const mats = createMaterialCache(THREE);

  // Groups for clean scene switching
  const worldGroup = new THREE.Group();
  const actorsGroup = new THREE.Group();
  const vehiclesGroup = new THREE.Group();
  const pedestriansGroup = new THREE.Group();
  const weatherGroup = new THREE.Group();
  scene.add(worldGroup, actorsGroup, vehiclesGroup, pedestriansGroup, weatherGroup);

  // Ambient sidewalk pedestrians (strolling along avenues to liven up the city)
  const PEDESTRIAN_PALETTES = [
    { shirt: '#EF4444', pants: '#1E293B', hair: '#1E293B', hairStyle: 'short', pantsStyle: 'pants', outfit: '' },
    { shirt: '#38BDF8', pants: '#334155', hair: '#78350F', hairStyle: 'bob', pantsStyle: 'skirt', outfit: '🎀' },
    { shirt: '#10B981', pants: '#475569', hair: '#1E293B', hairStyle: 'spiky', pantsStyle: 'shorts', outfit: '🧢' },
    { shirt: '#F59E0B', pants: '#1E3A8A', hair: '#92400E', hairStyle: 'ponytail', pantsStyle: 'pants', outfit: '🎒' },
    { shirt: '#EC4899', pants: '#F8FAFC', hair: '#451A03', hairStyle: 'wavy', pantsStyle: 'skirt', outfit: '' },
    { shirt: '#8B5CF6', pants: '#334155', hair: '#0F172A', hairStyle: 'sidepart', pantsStyle: 'pants', outfit: '🕶️' },
    { shirt: '#F97316', pants: '#1E293B', hair: '#B45309', hairStyle: 'braids', pantsStyle: 'shorts', outfit: '' },
    { shirt: '#14B8A6', pants: '#475569', hair: '#1E293B', hairStyle: 'curly', pantsStyle: 'pants', outfit: '🧣' },
  ];
  const pedestrianRoutes = [
    { axis: 'h', x: 180, y: 438, min: 80, max: 3100, speed: 36, dir: 1 },
    { axis: 'h', x: 1480, y: 620, min: 80, max: 3100, speed: 32, dir: -1 },
    { axis: 'h', x: 2420, y: 442, min: 1380, max: 3100, speed: 38, dir: -1 },
    { axis: 'h', x: 420, y: 998, min: 80, max: 3100, speed: 34, dir: 1 },
    { axis: 'h', x: 1850, y: 1180, min: 80, max: 3100, speed: 35, dir: -1 },
    { axis: 'h', x: 2880, y: 1002, min: 1380, max: 3100, speed: 30, dir: 1 },
    { axis: 'h', x: 640, y: 1612, min: 80, max: 3100, speed: 37, dir: 1 },
    { axis: 'h', x: 2150, y: 1794, min: 80, max: 3100, speed: 33, dir: -1 },
    { axis: 'h', x: 1200, y: 1796, min: 80, max: 2480, speed: 31, dir: 1 },
    { axis: 'v', x: 1154, y: 340, min: 260, max: 2120, speed: 32, dir: 1 },
    { axis: 'v', x: 1334, y: 1520, min: 260, max: 2120, speed: 35, dir: -1 },
    { axis: 'v', x: 2514, y: 580, min: 260, max: 2120, speed: 33, dir: 1 },
    { axis: 'v', x: 2694, y: 1840, min: 260, max: 2120, speed: 36, dir: -1 },
    { axis: 'h', x: 960, y: 616, min: 120, max: 1120, speed: 29, dir: 1 },
    { axis: 'h', x: 2840, y: 1616, min: 2700, max: 3120, speed: 28, dir: -1 },
    { axis: 'v', x: 2696, y: 820, min: 650, max: 1580, speed: 31, dir: 1 },
  ];
  const pedestrianEntries = pedestrianRoutes.map((route, idx) => {
    const pal = PEDESTRIAN_PALETTES[idx % PEDESTRIAN_PALETTES.length];
    const mesh = buildChibiCharacter3D(
      THREE,
      mats,
      textures.shadowTex,
      {
        id: `ped_${idx}`,
        name: '',
        role: idx % 3 === 0 ? 'Con' : idx % 2 === 0 ? 'Mẹ' : 'Bố',
        hairStyle: pal.hairStyle,
        hairColor: pal.hair,
        shirtColor: pal.shirt,
        shirtPattern: idx % 2 === 0 ? 'collar' : 'stripe',
        pantsColor: pal.pants,
        pantsStyle: pal.pantsStyle,
        outfit: pal.outfit,
      },
      false
    );
    mesh.scale.setScalar(0.84);
    mesh.position.set(route.x * WORLD_SCALE, 0.08, route.y * WORLD_SCALE);
    pedestriansGroup.add(mesh);
    return { mesh, route, phaseOffset: idx * 0.9 };
  });

  // Tap-to-move ground marker
  const tapMarker = new THREE.Group();
  tapMarker.visible = false;
  const tapRing = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.78, 24),
    mats.get('#FACC15', { emissive: '#F59E0B', emissiveIntensity: 0.7, side: THREE.DoubleSide })
  );
  tapRing.rotation.x = -Math.PI / 2;
  tapRing.position.y = 0.14;
  const tapDiamond = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.28, 0),
    mats.get('#FF6B6B', { emissive: '#FF6B6B', emissiveIntensity: 0.5 })
  );
  tapDiamond.position.y = 0.85;
  tapMarker.add(tapRing, tapDiamond);
  scene.add(tapMarker);

  // Weather particle pool
  const weatherParticles = [];
  let weatherMode = 'clear';
  function rebuildWeatherParticles(mode) {
    if (weatherMode === mode) return;
    weatherMode = mode;
    while (weatherGroup.children.length > 0) {
      weatherGroup.remove(weatherGroup.children[0]);
    }
    weatherParticles.length = 0;
    if (mode === 'rain' || mode === 'thunder' || mode === 'snow' || mode === 'fireflies') {
      const count = mode === 'rain' || mode === 'thunder' ? 120 : mode === 'snow' ? 85 : 32;
      const geo =
        mode === 'rain' || mode === 'thunder'
          ? new THREE.BoxGeometry(0.05, 0.75, 0.05)
          : new THREE.SphereGeometry(mode === 'fireflies' ? 0.14 : 0.12, 6, 5);
      const mat = mats.get(mode === 'fireflies' ? '#FDE047' : mode === 'snow' ? '#FFFFFF' : '#BAE6FD', {
        emissive: mode === 'fireflies' ? '#FACC15' : null,
        emissiveIntensity: mode === 'fireflies' ? 1.2 : 0,
        transparent: true,
        opacity: 0.82,
      });
      for (let i = 0; i < count; i++) {
        const p = new THREE.Mesh(geo, mat);
        p.position.set((Math.random() - 0.5) * 44, Math.random() * 16 + 1, (Math.random() - 0.5) * 44);
        weatherGroup.add(p);
        weatherParticles.push({ mesh: p, offset: Math.random() * 100 });
      }
    }
  }

  // Cached scene signatures & dynamic 3D maps
  let lastWorldSignature = '';
  let lastVehicleNightState = null;
  const memberMeshes = new Map();
  const petMeshes = new Map();
  const vehicleMeshes = new Map();
  const foreignNpcMeshes = new Map();
  const helperRobotMeshes = new Map();
  const robotBannerCache = new Map();
  const animatedProps = [];
  const labelTargets = []; // Objects to project into floating 2D HTML tags

  // Cached Leader Board CanvasTexture (redrawn only when kidsLeaderboard signature changes)
  const leaderCanvas = document.createElement('canvas');
  leaderCanvas.width = 768;
  leaderCanvas.height = 512;
  const leaderCtx = leaderCanvas.getContext('2d');
  const leaderTex = new THREE.CanvasTexture(leaderCanvas);
  leaderTex.colorSpace = THREE.SRGBColorSpace;
  leaderTex.anisotropy = maxAniso;
  let lastLeaderSig = '';

  function updateLeaderBoardTexture(rows, brand) {
    const list = Array.isArray(rows) ? rows : [];
    const sig = `${brand}|` + list.map((r) => `${r.name}:${r.points}:${r.unitLabel}:${r.speakingLevel}:${r.achievementCount}/${r.achievementTotal}`).join(';');
    if (sig === lastLeaderSig) return;
    lastLeaderSig = sig;
    const ctx = leaderCtx;
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, 768, 512);
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 512);
    bgGrad.addColorStop(0, '#1E293B');
    bgGrad.addColorStop(1, '#0F172A');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(10, 10, 748, 492);

    // Header banner
    const hdrGrad = ctx.createLinearGradient(0, 16, 768, 92);
    hdrGrad.addColorStop(0, '#D97706');
    hdrGrad.addColorStop(0.5, '#F59E0B');
    hdrGrad.addColorStop(1, '#EA580C');
    ctx.fillStyle = hdrGrad;
    ctx.fillRect(20, 20, 728, 76);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`🏆 LEADER BOARD — GIA ĐÌNH ${brand.toUpperCase()} 🏆`, 384, 58);

    // Table headers
    ctx.fillStyle = '#94A3B8';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('HẠNG & THÀNH VIÊN', 36, 126);
    ctx.textAlign = 'center';
    ctx.fillText('ĐIỂM SAO', 368, 126);
    ctx.fillText('ENGLISH', 494, 126);
    ctx.fillText('SPEAKING', 604, 126);
    ctx.fillText('HUY HIỆU', 706, 126);

    if (list.length === 0) {
      ctx.fillStyle = '#CBD5E1';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Chưa có dữ liệu thành viên con', 384, 290);
    } else {
      list.slice(0, 4).forEach((row, idx) => {
        const ry = 152 + idx * 84;
        ctx.fillStyle = idx === 0 ? 'rgba(250, 204, 21, 0.16)' : 'rgba(255, 255, 255, 0.08)';
        ctx.fillRect(24, ry, 720, 72);
        ctx.fillStyle = idx === 0 ? '#FACC15' : idx === 1 ? '#38BDF8' : '#A78BFA';
        ctx.fillRect(24, ry, 8, 72);

        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`${medal} ${String(row.name || '').slice(0, 14)}`, 44, ry + 38);

        ctx.fillStyle = '#FACC15';
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${row.points}⭐`, 368, ry + 38);

        ctx.fillStyle = '#38BDF8';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText(`${row.unitLabel || 'U.1'}`, 494, ry + 38);

        ctx.fillStyle = '#34D399';
        ctx.fillText(`Lv.${row.speakingLevel || 1}`, 604, ry + 38);

        ctx.fillStyle = '#F472B6';
        ctx.fillText(`🏆 ${row.achievementCount}/${row.achievementTotal}`, 706, ry + 38);
      });
    }
    leaderTex.needsUpdate = true;
  }

  // Cached Scrolling LED Billboard CanvasTexture + Crown Header Plate (redrawn ONLY when text/brand/night changes)
  const DEFAULT_LED_AD_TEXT = 'Hãy đến Trung Tâm Tiếng Anh để làm bài và đổi điểm ngay nào!';
  const ledCanvas = document.createElement('canvas');
  ledCanvas.width = 2048;
  ledCanvas.height = 384;
  const ledCtx = ledCanvas.getContext('2d');
  const ledAdTex = new THREE.CanvasTexture(ledCanvas);
  ledAdTex.wrapS = THREE.RepeatWrapping;
  ledAdTex.wrapT = THREE.ClampToEdgeWrapping;
  ledAdTex.repeat.set(0.72, 1);
  ledAdTex.colorSpace = THREE.SRGBColorSpace;
  ledAdTex.anisotropy = maxAniso;
  let lastLedAdSig = '';

  const bbHeaderCanvas = document.createElement('canvas');
  bbHeaderCanvas.width = 768;
  bbHeaderCanvas.height = 128;
  const bbHeaderCtx = bbHeaderCanvas.getContext('2d');
  const billboardHeaderTex = new THREE.CanvasTexture(bbHeaderCanvas);
  billboardHeaderTex.colorSpace = THREE.SRGBColorSpace;
  billboardHeaderTex.anisotropy = maxAniso;
  let lastBbHeaderSig = '';

  function updateLedAdTexture(rawText, brand, isNight) {
    const cleanText = String(rawText || '').replace(/\s+/g, ' ').trim() || DEFAULT_LED_AD_TEXT;
    const cleanBrand = String(brand || 'B2KS').trim() || 'B2KS';
    const adSig = `${cleanText}|${cleanBrand}|${isNight ? 'N' : 'D'}`;
    if (adSig !== lastLedAdSig) {
      lastLedAdSig = adSig;
      const unit = `★ ${cleanText}   ✦   `;
      let fontSize = 108;
      ledCtx.font = `900 ${fontSize}px sans-serif`;
      let unitW = Math.ceil(ledCtx.measureText(unit).width);
      if (unitW > 2600) {
        fontSize = Math.max(64, Math.floor((fontSize * 2400) / Math.max(1, unitW)));
        ledCtx.font = `900 ${fontSize}px sans-serif`;
        unitW = Math.ceil(ledCtx.measureText(unit).width);
      }
      const reps = Math.max(1, Math.ceil(1600 / Math.max(240, unitW)));
      const targetW = Math.min(4096, Math.max(1024, unitW * reps));
      if (ledCanvas.width !== targetW) {
        ledCanvas.width = targetW;
      }

      const Wc = ledCanvas.width;
      const Hc = ledCanvas.height;
      const bgGrad = ledCtx.createLinearGradient(0, 0, 0, Hc);
      bgGrad.addColorStop(0, '#060B1A');
      bgGrad.addColorStop(0.5, '#0F172A');
      bgGrad.addColorStop(1, '#060B1A');
      ledCtx.fillStyle = bgGrad;
      ledCtx.fillRect(0, 0, Wc, Hc);

      // Subtle LED pixel matrix dots
      ledCtx.fillStyle = isNight ? 'rgba(56, 189, 248, 0.14)' : 'rgba(148, 163, 184, 0.18)';
      for (let gx = 6; gx < Wc; gx += 18) {
        for (let gy = 48; gy < Hc - 48; gy += 18) {
          ledCtx.fillRect(gx, gy, 5, 5);
        }
      }

      // Top & bottom neon chase bands (seamless 36px repeating pattern)
      for (let bx = 0; bx < Wc; bx += 36) {
        const isCyan = (bx / 36) % 2 === 0;
        ledCtx.fillStyle = isCyan ? '#38BDF8' : '#FACC15';
        ledCtx.fillRect(bx + 2, 10, 26, 16);
        ledCtx.fillStyle = isCyan ? '#FACC15' : '#F472B6';
        ledCtx.fillRect(bx + 2, Hc - 26, 26, 16);
      }
      ledCtx.fillStyle = 'rgba(14, 165, 233, 0.25)';
      ledCtx.fillRect(0, 34, Wc, 4);
      ledCtx.fillRect(0, Hc - 38, Wc, 4);

      // Glowing golden-white headline text seamlessly tiled edge-to-edge
      ledCtx.font = `900 ${fontSize}px sans-serif`;
      ledCtx.textAlign = 'left';
      ledCtx.textBaseline = 'middle';
      ledCtx.shadowColor = isNight ? '#F59E0B' : '#EA580C';
      ledCtx.shadowBlur = isNight ? 20 : 10;
      const txtGrad = ledCtx.createLinearGradient(0, 70, 0, Hc - 70);
      txtGrad.addColorStop(0, '#FFFFFF');
      txtGrad.addColorStop(0.5, '#FEF08A');
      txtGrad.addColorStop(1, '#FBBF24');
      ledCtx.fillStyle = txtGrad;
      for (let i = 0; i < reps; i++) {
        ledCtx.fillText(unit, i * unitW, Hc * 0.5 + 4);
      }
      ledCtx.shadowBlur = 0;

      ledAdTex.repeat.set(Math.min(0.96, 1466 / Wc), 1);
      ledAdTex.needsUpdate = true;
    }

    const hdrSig = `${cleanBrand}|${isNight ? 'N' : 'D'}`;
    if (hdrSig !== lastBbHeaderSig) {
      lastBbHeaderSig = hdrSig;
      const ctx = bbHeaderCtx;
      const g = ctx.createLinearGradient(0, 0, 768, 128);
      g.addColorStop(0, '#1D4ED8');
      g.addColorStop(0.5, '#4338CA');
      g.addColorStop(1, '#0284C7');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 768, 128);
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, 758, 118);
      ctx.fillStyle = '#FEF08A';
      ctx.font = '900 40px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`📢 BẢNG TIN GIA ĐÌNH ${cleanBrand.toUpperCase()}`, 384, 66);
      billboardHeaderTex.needsUpdate = true;
    }
  }
  updateLedAdTexture(DEFAULT_LED_AD_TEXT, 'B2KS', false);

  function getOrCreateRobotBannerTex(childId, text) {
    let entry = robotBannerCache.get(childId);
    if (!entry) {
      const c = document.createElement('canvas');
      c.width = 1024;
      c.height = 128;
      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.repeat.set(0.58, 1);
      tex.colorSpace = THREE.SRGBColorSpace;
      entry = { canvas: c, ctx: c.getContext('2d'), tex, lastText: '' };
      robotBannerCache.set(childId, entry);
    }
    const clean = (text || '').trim();
    if (entry.lastText !== clean) {
      entry.lastText = clean;
      const ctx = entry.ctx;
      ctx.fillStyle = '#1E1B4B';
      ctx.fillRect(0, 0, 1024, 128);
      ctx.fillStyle = '#312E81';
      ctx.fillRect(8, 8, 1008, 112);
      ctx.font = 'bold 46px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FEF08A';
      ctx.fillText(`🤖 NHẮC NHỞ: ${clean}     `, 20, 66);
      entry.tex.needsUpdate = true;
    }
    return entry.tex;
  }

  function clearGroupChildren(grp) {
    while (grp.children.length > 0) {
      grp.remove(grp.children[0]);
    }
  }

  function buildNeighborhoodGroup(state, lighting, weather, locations, arcadeRoom, arcadeCatalog, soccerRoom) {
    const grp = new THREE.Group();
    animatedProps.length = 0;
    labelTargets.length = 0;
    nightLampAnchors.length = 0;
    nightBuildingAnchors.length = 0;

    const W = STREET_WORLD.width * WORLD_SCALE; // 160
    const H = STREET_WORLD.height * WORLD_SCALE; // 110
    const wCond = weather?.condition || 'clear';
    const phase = lighting?.phase || 'day';
    const brand = (state.familyName || 'B2KS').trim() || 'B2KS';

    const grassTint =
      wCond === 'snow'
        ? phase === 'night'
          ? '#64748B'
          : '#D1FAE5'
        : phase === 'night'
          ? '#5E7591'
          : phase === 'sunset'
            ? '#CBD5E1'
            : '#FFFFFF';

    // Extended pasture perimeter (so map never floats in empty void even in Perspective horizon view!)
    const outerGrass = new THREE.Mesh(
      new THREE.PlaneGeometry(480, 400),
      new THREE.MeshStandardMaterial({
        map: textures.grassTex,
        color: new THREE.Color(grassTint),
        roughness: 0.92,
      })
    );
    outerGrass.rotation.x = -Math.PI / 2;
    outerGrass.position.set(W / 2, 0, H / 2);
    outerGrass.receiveShadow = true;
    grp.add(outerGrass);

    // Distant rolling pastel hills along the northern, eastern, western & southern horizon
    const hillMat = mats.get(phase === 'night' ? '#1E293B' : phase === 'sunset' ? '#475569' : PASTEL_PALETTE.hillFar, {
      roughness: 0.9,
      flatShading: true,
    });
    [
      [15, -16, 20, 8],
      [52, -18, 24, 10],
      [96, -16, 22, 9],
      [142, -16, 20, 8],
      [-18, 35, 16, 7],
      [-18, 82, 16, 7],
      [W + 18, 42, 17, 8],
      [W + 18, 90, 18, 8],
      [42, H + 18, 20, 8],
      [115, H + 18, 22, 9],
    ].forEach(([hx, hz, hr, hh]) => {
      const hill = new THREE.Mesh(new THREE.ConeGeometry(hr, hh, 8), hillMat);
      hill.position.set(hx, hh / 2 - 0.5, hz);
      grp.add(hill);
    });

    // White picket fence along northern boundary (y = 225)
    const fenceZ = 225 * WORLD_SCALE;
    const fenceMat = mats.get('#FFFFFF', { roughness: 0.7 });
    const rail = makeBox(THREE, W, 0.14, 0.12, fenceMat, true, false);
    rail.position.set(W / 2, 0.72, fenceZ);
    grp.add(rail);
    const postCount = Math.floor(W / 2.4);
    const postGeo = new THREE.BoxGeometry(0.24, 1.15, 0.16);
    const postInst = new THREE.InstancedMesh(postGeo, fenceMat, postCount);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < postCount; i++) {
      dummy.position.set(1.2 + i * 2.4, 0.58, fenceZ);
      dummy.updateMatrix();
      postInst.setMatrixAt(i, dummy.matrix);
    }
    postInst.castShadow = true;
    postInst.computeBoundingSphere();
    grp.add(postInst);

    // Sidewalks (warm light-brown brick paving, cool-toned under moonlight) & Asphalt Roads
    const swTint = phase === 'night' ? '#8E9BB0' : phase === 'sunset' ? '#D6D3D1' : '#FFFFFF';
    const swHorizMat = new THREE.MeshStandardMaterial({
      map: textures.sidewalkTex,
      color: new THREE.Color(swTint),
      roughness: 0.84,
      metalness: 0.02,
    });
    const swVertMat = new THREE.MeshStandardMaterial({
      map: textures.sidewalkVTex,
      color: new THREE.Color(swTint),
      roughness: 0.84,
      metalness: 0.02,
    });
    const roadMat = mats.get(PASTEL_PALETTE.asphalt, { roughness: 0.88 });
    const yellowLineMat = mats.get(PASTEL_PALETTE.roadLine, { roughness: 0.55 });
    const whiteStripeMat = mats.get(PASTEL_PALETTE.crosswalk, { roughness: 0.65 });

    const hRoads = [
      { y: 465, h: 130, swTop: 415, swBot: 595 },
      { y: 1025, h: 130, swTop: 975, swBot: 1155 },
      { y: 1640, h: 130, swTop: 1590, swBot: 1770 },
    ];
    const vRoads = [
      { x: 1180, w: 130, swLeft: 1130, swRight: 1310 },
      { x: 2540, w: 130, swLeft: 2490, swRight: 2670 },
    ];

    hRoads.forEach((r) => {
      const swW = W;
      const swD = (r.h + 100) * WORLD_SCALE;
      const sw = makeBox(THREE, swW, 0.16, swD, swHorizMat, false, true);
      sw.position.set(W / 2, 0.06, (r.swTop + (r.h + 100) / 2) * WORLD_SCALE);
      grp.add(sw);

      const rd = makeBox(THREE, W, 0.05, r.h * WORLD_SCALE, roadMat, false, true);
      rd.position.set(W / 2, 0.145, (r.y + r.h / 2) * WORLD_SCALE);
      grp.add(rd);

      // Yellow dashed centerlines
      for (let dx = 2.0; dx < W - 2; dx += 3.6) {
        const dash = makeBox(THREE, 1.8, 0.02, 0.24, yellowLineMat, false, false);
        dash.position.set(dx, 0.175, (r.y + r.h / 2) * WORLD_SCALE);
        grp.add(dash);
      }
    });

    // Vertical Avenues
    const vSwD = (STREET_WORLD.height - 225) * WORLD_SCALE;
    vRoads.forEach((vr) => {
      const vSw = makeBox(THREE, (vr.w + 100) * WORLD_SCALE, 0.16, vSwD, swVertMat, false, true);
      vSw.position.set((vr.swLeft + (vr.w + 100) / 2) * WORLD_SCALE, 0.06, (225 + (STREET_WORLD.height - 225) / 2) * WORLD_SCALE);
      grp.add(vSw);

      const vRd = makeBox(THREE, vr.w * WORLD_SCALE, 0.06, vSwD, roadMat, false, true);
      vRd.position.set((vr.x + vr.w / 2) * WORLD_SCALE, 0.148, (225 + (STREET_WORLD.height - 225) / 2) * WORLD_SCALE);
      grp.add(vRd);

      for (let dz = 13.0; dz < H - 2; dz += 3.6) {
        const dash = makeBox(THREE, 0.24, 0.02, 1.8, yellowLineMat, false, false);
        dash.position.set((vr.x + vr.w / 2) * WORLD_SCALE, 0.182, dz);
        grp.add(dash);
      }
    });

    // Crosswalks at all intersections
    hRoads.forEach((r) => {
      vRoads.forEach((vr) => {
        for (let zy = r.y + 14; zy < r.y + r.h - 10; zy += 22) {
          const c1 = makeBox(THREE, 1.2, 0.02, 0.48, whiteStripeMat, false, false);
          c1.position.set((vr.x - 18) * WORLD_SCALE, 0.185, zy * WORLD_SCALE);
          const c2 = makeBox(THREE, 1.2, 0.02, 0.48, whiteStripeMat, false, false);
          c2.position.set((vr.x + vr.w + 18) * WORLD_SCALE, 0.185, zy * WORLD_SCALE);
          grp.add(c1, c2);
        }
      });
    });

    // Plots & Family House
    const byId = new Map(locations.map((l) => [l.id, l]));
    const getLoc = (id, fx, fy) => {
      const f = byId.get(id);
      return { x: f ? f.x : fx, y: f ? f.y : fy, shape: f?.shape || 'classic', name: f?.name || id };
    };
    const plots = [
      { x: 440, y: 340, label: 'Lô số 1' },
      { x: 860, y: 340, label: 'Lô số 2' },
      { x: 440, y: 880, label: 'Lô số 3' },
    ];
    const occupiedBoxes = [
      { x: 670, y: 695, hw: 135, hd: 95 }, // Leader Board
      { x: 650, y: 236, hw: 170, hd: 55 }, // Left Northern Fence Grand Billboard
      { x: 2165, y: 236, hw: 170, hd: 55 }, // Right Northern Fence Grand Billboard
    ];
    const houseOv = state.buildingLayouts?.house;
    plots.forEach((p, idx) => {
      occupiedBoxes.push({ x: p.x, y: p.y, hw: 155, hd: 120 });
      if (idx === state.house.plotIndex && !houseOv) {
        const house3d = buildTownhouse3D(THREE, mats, p.x * WORLD_SCALE, p.y * WORLD_SCALE, state.house.style, 'classic', lighting.isNight);
        grp.add(house3d);
        nightBuildingAnchors.push({ x: p.x * WORLD_SCALE, y: 4.0, z: p.y * WORLD_SCALE + 3.2, color: '#FDE68A', intensity: 18 });
        labelTargets.push({ x: p.x * WORLD_SCALE, y: 12.2, z: p.y * WORLD_SCALE, text: `🏡 Nhà Phố ${brand}`, kind: 'building' });
      } else if (!(houseOv && idx === state.house.plotIndex)) {
        const lot = makeBox(THREE, 8.0, 0.08, 4.8, mats.get('#ECFDF5', { roughness: 0.9 }), false, true);
        lot.position.set(p.x * WORLD_SCALE, 0.04, p.y * WORLD_SCALE);
        grp.add(lot);
        labelTargets.push({ x: p.x * WORLD_SCALE, y: 1.8, z: p.y * WORLD_SCALE, text: `🌱 ${p.label}`, kind: 'building' });
      }
    });
    if (houseOv) {
      const hLoc = getLoc('house', 860, 425);
      const hy = hLoc.y - 85;
      occupiedBoxes.push({ x: hLoc.x, y: hy, hw: 155, hd: 120 });
      const house3d = buildTownhouse3D(THREE, mats, hLoc.x * WORLD_SCALE, hy * WORLD_SCALE, state.house.style, hLoc.shape, lighting.isNight);
      grp.add(house3d);
      nightBuildingAnchors.push({ x: hLoc.x * WORLD_SCALE, y: 4.0, z: hy * WORLD_SCALE + 3.2, color: '#FDE68A', intensity: 18 });
      labelTargets.push({ x: hLoc.x * WORLD_SCALE, y: 12.2, z: hy * WORLD_SCALE, text: `🏡 Nhà Phố ${brand}`, kind: 'building' });
    }

    // 11 Shop / Facility Buildings
    const shopDefs = [
      { id: 'supermarket', fx: 1560, fy: 410, type: 'supermarket', title: `🏪 Siêu Thị ${brand}`, lightCol: '#FEF08A' },
      { id: 'cross_world', fx: 1980, fy: 410, type: 'cross_world', title: '🌌 Trung Tâm Xuyên Thế Giới', lightCol: '#38BDF8' },
      { id: 'pet_shop', fx: 2345, fy: 410, type: 'pet_shop', title: `🐾 Cửa Hàng Thú Cưng ${brand}`, lightCol: '#FBBF24' },
      { id: 'arcade', fx: 950, fy: 790, type: 'arcade', title: '🕹️ Khu Vui Chơi Online (1⭐)', lightCol: '#E879F9' },
      { id: 'lab', fx: 1540, fy: 790, type: 'lab', title: `🧪 Phòng Thí Nghiệm ${brand}`, lightCol: '#22D3EE' },
      { id: 'flea_market', fx: 1980, fy: 790, type: 'flea_market', title: `🎪 Chợ Trời ${brand}`, lightCol: '#FDE047' },
      { id: 'english_center', fx: 250, fy: 925, type: 'english', title: `🎓 Trung Tâm Tiếng Anh ${brand}`, lightCol: '#93C5FD' },
      { id: 'fashion', fx: 600, fy: 945, type: 'fashion', title: '👗 Cửa Hàng Thời Trang', lightCol: '#F472B6' },
      { id: 'salon', fx: 1760, fy: 975, type: 'salon', title: '💇 Salon Tóc Nghệ Thuật', lightCol: '#C084FC' },
      { id: 'church', fx: 2345, fy: 955, type: 'church', title: 'TIN LÀNH', lightCol: '#FDE68A' },
      { id: 'zoo', fx: 820, fy: 1485, type: 'zoo', title: `🦁 Sở Thú Ảo ${brand} Zoo`, lightCol: '#FCD34D' },
    ];
    shopDefs.forEach((sd) => {
      const loc = getLoc(sd.id, sd.fx, sd.fy);
      const bx = loc.x;
      const by = loc.y - 65;
      occupiedBoxes.push({
        x: bx,
        y: by,
        hw: sd.id === 'zoo' ? 195 : sd.id === 'church' ? 170 : 150,
        hd: sd.id === 'zoo' ? 145 : 120,
      });
      const b = buildShopBuilding3D(THREE, mats, bx * WORLD_SCALE, by * WORLD_SCALE, sd.type, loc.shape, lighting.isNight);
      grp.add(b);
      animatedProps.push(b);
      nightBuildingAnchors.push({ x: bx * WORLD_SCALE, y: 3.6, z: by * WORLD_SCALE + 2.8, color: sd.lightCol, intensity: 17 });
      labelTargets.push({ x: bx * WORLD_SCALE, y: 6.8, z: by * WORLD_SCALE, text: sd.title, kind: 'building' });
    });

    // Live Arcade Banner
    if (arcadeRoom && (arcadeRoom.status === 'lobby' || arcadeRoom.status === 'playing')) {
      const arc = getLoc('arcade', 950, 790);
      const cat = arcadeCatalog?.[arcadeRoom.gameType];
      const txt =
        arcadeRoom.status === 'playing'
          ? `🔴 ĐANG ĐẤU: ${cat ? cat.shortTitle : 'Game'} (${arcadeRoom.playerIds.length}P)`
          : `🟡 PHÒNG CHỜ: ${cat ? cat.shortTitle : 'Game'} (${arcadeRoom.playerIds.length}P)`;
      labelTargets.push({
        x: arc.x * WORLD_SCALE,
        y: 8.5,
        z: (arc.y - 65) * WORLD_SCALE,
        text: txt,
        kind: arcadeRoom.status === 'playing' ? 'live' : 'lobby',
      });
    }

    // 4 Outdoor Landmarks
    const engPark = getLoc('eng_park', 175, 425);
    occupiedBoxes.push({ x: engPark.x, y: engPark.y - 70, hw: 145, hd: 120 });
    const engParkMesh = buildOutdoorLandmark3D(THREE, mats, 'eng_park', engPark.x * WORLD_SCALE, (engPark.y - 70) * WORLD_SCALE, lighting.isNight);
    grp.add(engParkMesh);
    animatedProps.push(engParkMesh);
    nightBuildingAnchors.push({ x: engPark.x * WORLD_SCALE, y: 3.4, z: (engPark.y - 70) * WORLD_SCALE, color: '#FDE047', intensity: 15 });
    labelTargets.push({ x: engPark.x * WORLD_SCALE, y: 4.1, z: (engPark.y - 70) * WORLD_SCALE, text: '💬 Công Viên Tiếng Anh', kind: 'building' });

    const plaza = getLoc('fountain_plaza', 280, 1420);
    occupiedBoxes.push({ x: plaza.x, y: plaza.y, hw: 145, hd: 145 });
    const plazaMesh = buildOutdoorLandmark3D(THREE, mats, 'fountain_plaza', plaza.x * WORLD_SCALE, plaza.y * WORLD_SCALE, lighting.isNight);
    grp.add(plazaMesh);
    animatedProps.push(plazaMesh);
    nightBuildingAnchors.push({ x: plaza.x * WORLD_SCALE, y: 3.6, z: plaza.y * WORLD_SCALE, color: '#7DD3FC', intensity: 16 });
    labelTargets.push({ x: plaza.x * WORLD_SCALE, y: 4.2, z: plaza.y * WORLD_SCALE, text: `⛲ Quảng Trường ${brand}`, kind: 'building' });

    const reading = getLoc('reading_corner', 1540, 1400);
    occupiedBoxes.push({ x: reading.x, y: reading.y, hw: 140, hd: 115 });
    grp.add(buildOutdoorLandmark3D(THREE, mats, 'reading_corner', reading.x * WORLD_SCALE, reading.y * WORLD_SCALE, lighting.isNight));
    nightBuildingAnchors.push({ x: reading.x * WORLD_SCALE, y: 3.4, z: reading.y * WORLD_SCALE, color: '#FDE68A', intensity: 15 });
    labelTargets.push({ x: reading.x * WORLD_SCALE, y: 3.8, z: reading.y * WORLD_SCALE, text: '📚 Góc Đọc Sách', kind: 'building' });

    const soccer = getLoc('soccer', 2060, 1400);
    occupiedBoxes.push({ x: soccer.x, y: soccer.y, hw: 230, hd: 160 });
    const soccerMesh = buildOutdoorLandmark3D(THREE, mats, 'soccer', soccer.x * WORLD_SCALE, soccer.y * WORLD_SCALE, lighting.isNight);
    grp.add(soccerMesh);
    animatedProps.push(soccerMesh);
    nightBuildingAnchors.push({ x: soccer.x * WORLD_SCALE, y: 5.5, z: soccer.y * WORLD_SCALE, color: '#E0F2FE', intensity: 18 });
    labelTargets.push({ x: soccer.x * WORLD_SCALE, y: 3.5, z: (soccer.y - 110) * WORLD_SCALE, text: `⚽ Sân Bóng Đá ${brand} (Miễn phí)`, kind: 'building' });

    if (soccerRoom && (soccerRoom.status === 'playing' || soccerRoom.status === 'lobby')) {
      const isLive = soccerRoom.status === 'playing';
      labelTargets.push({
        x: soccer.x * WORLD_SCALE,
        y: 5.2,
        z: (soccer.y - 110) * WORLD_SCALE,
        text: isLive
          ? `🔴 LIVE 1v1: ${soccerRoom.p1Name} ${soccerRoom.p1Goals}-${soccerRoom.p2Goals} ${soccerRoom.p2Name || '?'}`
          : `🟡 CHỜ ĐẤU 2P: ${soccerRoom.p1Name}`,
        kind: isLive ? 'live' : 'lobby',
      });
    }

    // Dynamic Decorative City Buildings (auto-swap/relocate whenever parents move any functional building!)
    const DECOR_PALETTES = [
      { wall: '#F8FAFC', accent: '#0EA5E9', roof: '#334155' },
      { wall: '#FFF7ED', accent: '#F97316', roof: '#9A3412' },
      { wall: '#F1F5F9', accent: '#6366F1', roof: '#312E81' },
      { wall: '#ECFDF5', accent: '#10B981', roof: '#065F46' },
      { wall: '#FEFCE8', accent: '#EAB308', roof: '#854D0E' },
      { wall: '#FDF2F8', accent: '#EC4899', roof: '#831843' },
    ];
    const DECOR_VARIANTS = ['apt_tall', 'cafe', 'studio_glass', 'bakery_shop', 'cottage', 'market_corner'];
    const DECOR_CANDIDATE_SLOTS = [
      // Expanded East District (x = 2820..3060)
      { x: 2820, y: 345, rotY: 0, floors: 4 },
      { x: 3045, y: 345, rotY: 0, floors: 3 },
      { x: 2820, y: 730, rotY: Math.PI, floors: 5 },
      { x: 3045, y: 730, rotY: Math.PI, floors: 3 },
      { x: 2820, y: 905, rotY: 0, floors: 4 },
      { x: 3045, y: 905, rotY: 0, floors: 4 },
      { x: 2820, y: 1295, rotY: Math.PI, floors: 3 },
      { x: 3045, y: 1295, rotY: Math.PI, floors: 5 },
      { x: 2820, y: 1510, rotY: 0, floors: 4 },
      { x: 3045, y: 1510, rotY: 0, floors: 3 },
      // Expanded Far South Boulevard (y = 1915, facing Avenue 3)
      { x: 215, y: 1915, rotY: Math.PI, floors: 3 },
      { x: 475, y: 1915, rotY: Math.PI, floors: 4 },
      { x: 735, y: 1915, rotY: Math.PI, floors: 5 },
      { x: 995, y: 1915, rotY: Math.PI, floors: 3 },
      { x: 1485, y: 1915, rotY: Math.PI, floors: 4 },
      { x: 1745, y: 1915, rotY: Math.PI, floors: 5 },
      { x: 2005, y: 1915, rotY: Math.PI, floors: 3 },
      { x: 2290, y: 1915, rotY: Math.PI, floors: 4 },
      { x: 2820, y: 1915, rotY: Math.PI, floors: 4 },
      { x: 3045, y: 1915, rotY: Math.PI, floors: 3 },
      // Mid-city open pockets
      { x: 220, y: 730, rotY: Math.PI, floors: 3 },
      { x: 2260, y: 725, rotY: Math.PI, floors: 4 },
      { x: 560, y: 1295, rotY: Math.PI, floors: 3 },
      { x: 1020, y: 1295, rotY: Math.PI, floors: 4 },
      // Dynamic swap-in fallback slots (occupied normally by movable functional buildings, auto-filled when moved!)
      { x: 1560, y: 345, rotY: 0, floors: 4 },
      { x: 1980, y: 345, rotY: 0, floors: 3 },
      { x: 2345, y: 345, rotY: 0, floors: 4 },
      { x: 950, y: 725, rotY: Math.PI, floors: 4 },
      { x: 1540, y: 725, rotY: Math.PI, floors: 3 },
      { x: 1980, y: 725, rotY: Math.PI, floors: 4 },
      { x: 250, y: 860, rotY: 0, floors: 3 },
      { x: 600, y: 880, rotY: 0, floors: 4 },
      { x: 1760, y: 910, rotY: 0, floors: 3 },
      { x: 2345, y: 890, rotY: 0, floors: 4 },
    ];
    const placedDecorBoxes = [];
    const maxDecorCount = 22;
    let decorPlaced = 0;
    for (let i = 0; i < DECOR_CANDIDATE_SLOTS.length && decorPlaced < maxDecorCount; i++) {
      const slot = DECOR_CANDIDATE_SLOTS[i];
      // Reject if overlapping any road + sidewalk strip
      const hitsRoad =
        hRoads.some((r) => slot.y > r.swTop - 85 && slot.y < r.swBot + 135) ||
        vRoads.some((vr) => slot.x > vr.swLeft - 85 && slot.x < vr.swRight + 135);
      if (hitsRoad) continue;
      // Reject if overlapping any functional building / plot / landmark at its current layout
      const hitsFunctional = occupiedBoxes.some(
        (ob) => Math.abs(slot.x - ob.x) < ob.hw + 82 && Math.abs(slot.y - ob.y) < ob.hd + 68
      );
      if (hitsFunctional) continue;
      // Reject if overlapping another placed decorative building
      const hitsDecor = placedDecorBoxes.some(
        (db) => Math.abs(slot.x - db.x) < 180 && Math.abs(slot.y - db.y) < 140
      );
      if (hitsDecor) continue;

      placedDecorBoxes.push({ x: slot.x, y: slot.y });
      const bDecor = buildDecorativeBuilding3D(
        THREE,
        mats,
        {
          x: slot.x,
          y: slot.y,
          rotY: slot.rotY,
          floors: slot.floors,
          variant: DECOR_VARIANTS[(i + decorPlaced) % DECOR_VARIANTS.length],
          palette: DECOR_PALETTES[(i * 3 + 1) % DECOR_PALETTES.length],
          seed: 700 + i * 37,
        },
        lighting.isNight
      );
      grp.add(bDecor);
      nightBuildingAnchors.push({ x: slot.x * WORLD_SCALE, y: 3.4, z: slot.y * WORLD_SCALE + 2.4, color: '#FBBF24', intensity: 14 });
      decorPlaced += 1;
    }

    // 26 Trees + perimeter grove spanning expanded 3200x2200 city
    const treeCoords = [
      [60, 290, 'sakura'], [285, 290, 'pine'], [490, 315, 'orange'], [555, 315, 'oak'], [1065, 310, 'sakura'],
      [1365, 300, 'pine'], [1760, 315, 'orange'], [2265, 335, 'palm'], [2930, 310, 'sakura'], [3140, 340, 'palm'],
      [80, 730, 'oak'], [420, 685, 'sakura'], [770, 745, 'pine'], [1360, 740, 'orange'], [2185, 760, 'palm'],
      [2930, 740, 'pine'], [90, 1290, 'sakura'], [560, 1340, 'oak'], [1080, 1360, 'pine'], [1350, 1290, 'orange'],
      [2340, 1490, 'palm'], [1830, 1320, 'sakura'], [2468, 780, 'oak'], [350, 1950, 'sakura'], [1380, 1960, 'pine'],
      [2440, 1960, 'palm'],
    ];
    treeCoords.forEach(([tx, ty, tk]) => {
      const tree = buildTree3D(THREE, mats, tk, tx * WORLD_SCALE, ty * WORLD_SCALE, true);
      grp.add(tree);
      animatedProps.push(tree);
    });

    // Perimeter scenic trees outside northern fence & eastern/southern edges
    for (let px = 120; px < STREET_WORLD.width - 80; px += 220) {
      grp.add(buildTree3D(THREE, mats, px % 440 === 120 ? 'pine' : 'oak', px * WORLD_SCALE, 140 * WORLD_SCALE, false));
      grp.add(buildTree3D(THREE, mats, px % 440 === 120 ? 'oak' : 'sakura', px * WORLD_SCALE, (STREET_WORLD.height + 90) * WORLD_SCALE, false));
    }

    // Flower clusters
    const flowerSpots = [
      [100, 325, '#F43F5E', 'tulip'], [255, 385, '#FACC15', 'sunflower'], [430, 395, '#EC4899', 'hibiscus'],
      [580, 385, '#A855F7', 'lavender'], [1030, 385, '#FFFFFF', 'daisy'], [1380, 360, '#A855F7', 'lavender'],
      [1780, 385, '#F59E0B', 'sunflower'], [2160, 385, '#F43F5E', 'tulip'], [140, 1340, '#EC4899', 'hibiscus'],
      [430, 1470, '#FACC15', 'sunflower'], [620, 1320, '#FFFFFF', 'daisy'], [1040, 1240, '#F43F5E', 'tulip'],
      [2740, 1550, '#FACC15', 'sunflower'], [1410, 1855, '#F43F5E', 'tulip'],
    ];
    flowerSpots.forEach(([fx, fy, fcol, fkind]) => {
      grp.add(buildFlowerCluster3D(THREE, mats, fx * WORLD_SCALE, fy * WORLD_SCALE, fcol, fkind));
    });

    // Sidewalk & Plaza Park Benches
    [
      [340, 428, 0],
      [980, 428, 0],
      [1490, 428, 0],
      [1940, 990, Math.PI],
      [360, 1410, Math.PI * 0.25],
      [1610, 1380, -Math.PI * 0.25],
      [2860, 1605, 0],
      [880, 1805, Math.PI],
    ].forEach(([bx, by, rot]) => {
      grp.add(buildParkBench3D(THREE, mats, bx * WORLD_SCALE, by * WORLD_SCALE, rot));
    });

    // Street Lamps along all 3 avenues
    const lampX = [250, 680, 1080, 1420, 1820, 2205, 2760, 3080];
    [425, 985, 1600].forEach((ly) => {
      lampX.forEach((lx) => {
        const wx = lx * WORLD_SCALE;
        const wz = ly * WORLD_SCALE;
        grp.add(buildStreetLamp3D(THREE, mats, wx, wz, lighting.isNight));
        nightLampAnchors.push({ x: wx, y: 4.1, z: wz + 0.65 });
      });
    });

    // Large Central 3D Leader Board (stars, English Unit, Speaking Level, Badges)
    const lbGroup = new THREE.Group();
    lbGroup.position.set(670 * WORLD_SCALE, 0, 695 * WORLD_SCALE);
    lbGroup.rotation.y = Math.PI * 0.25;
    const lbBase = makeBox(THREE, 9.0, 0.36, 1.8, mats.get('#94A3B8', { roughness: 0.72 }));
    lbBase.position.y = 0.18;
    const lbWood = mats.get('#7C4D2B', { roughness: 0.64 });
    const lbGold = mats.get('#FACC15', { roughness: 0.3, metalness: 0.45 });
    [-3.8, 3.8].forEach((px) => {
      const post = makeCyl(THREE, 0.22, 0.26, 6.2, 10, lbWood);
      post.position.set(px, 3.1, 0);
      const finial = makeSphere(THREE, 0.3, 10, 8, lbGold);
      finial.position.set(px, 6.35, 0);
      lbGroup.add(post, finial);
    });
    const lbFrame = makeBox(THREE, 8.8, 5.4, 0.32, lbWood);
    lbFrame.position.y = 3.7;
    const lbTrim = makeBox(THREE, 9.0, 5.6, 0.2, lbGold);
    lbTrim.position.y = 3.7;
    const lbScreenMat = new THREE.MeshBasicMaterial({ map: leaderTex });
    const lbScreen = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 4.9), lbScreenMat);
    lbScreen.position.set(0, 3.7, 0.175);
    const lbTrophy = makeCyl(THREE, 0.36, 0.2, 0.55, 10, lbGold);
    lbTrophy.position.set(0, 6.8, 0);
    lbGroup.add(lbBase, lbTrim, lbFrame, lbScreen, lbTrophy);
    grp.add(lbGroup);

    // Twin Monumental Scrolling LED Ad Billboards flush against northern picket fence (left-mid & right-mid, aligned with buildings)
    function buildGrandBillboard3D(bx2d, by2d) {
      const adGroup = new THREE.Group();
      const wx = bx2d * WORLD_SCALE;
      const wz = by2d * WORLD_SCALE;
      adGroup.position.set(wx, 0, wz);
      adGroup.rotation.y = 0; // Same orientation as northern row buildings (+Z facing avenue)

      const steelDark = mats.get('#1E293B', { roughness: 0.42, metalness: 0.55 });
      const steelMid = mats.get('#475569', { roughness: 0.38, metalness: 0.6 });
      const plinthMat = mats.get('#94A3B8', { roughness: 0.72 });
      const plinthTopMat = mats.get('#CBD5E1', { roughness: 0.65 });
      const goldTrimMat = mats.get('#FACC15', {
        roughness: 0.25,
        metalness: 0.5,
        emissive: '#F59E0B',
        emissiveIntensity: lighting.isNight ? 1.25 : 0.2,
      });
      const neonRimMat = mats.get('#0EA5E9', {
        roughness: 0.22,
        metalness: 0.35,
        emissive: '#38BDF8',
        emissiveIntensity: lighting.isNight ? 1.75 : 0.32,
      });

      // Stepped stone foundation & side planter hedges
      const pedBase = makeBox(THREE, 15.6, 0.52, 2.5, plinthMat, true, true);
      pedBase.position.y = 0.26;
      const pedStep = makeBox(THREE, 14.4, 0.24, 1.9, plinthTopMat, true, true);
      pedStep.position.y = 0.64;
      adGroup.add(pedBase, pedStep);

      [-6.5, 6.5].forEach((px) => {
        const planter = makeBox(THREE, 2.0, 0.48, 1.4, mats.get('#B45309', { roughness: 0.72 }));
        planter.position.set(px, 0.76, 0.25);
        const shrub = makeBox(THREE, 1.8, 0.45, 1.1, mats.get('#16A34A', { roughness: 0.85 }));
        shrub.position.set(px, 1.12, 0.25);
        adGroup.add(planter, shrub);
        [-0.5, 0, 0.5].forEach((fx, fi) => {
          const bloom = makeSphere(THREE, 0.16, 7, 6, mats.get(fi % 2 === 0 ? '#F43F5E' : '#FACC15', { roughness: 0.6 }));
          bloom.position.set(px + fx, 1.38, 0.28);
          adGroup.add(bloom);
        });
      });

      // Heavy steel support pylons + cross truss
      [-4.9, 4.9].forEach((px) => {
        const footing = makeBox(THREE, 1.35, 0.65, 1.35, steelMid);
        footing.position.set(px, 1.05, 0);
        const col = makeCyl(THREE, 0.34, 0.42, 10.6, 10, steelDark);
        col.position.set(px, 6.2, 0);
        const collar = makeCyl(THREE, 0.46, 0.46, 0.35, 10, goldTrimMat);
        collar.position.set(px, 6.3, 0);
        adGroup.add(footing, col, collar);
      });

      // Structural cross-girder & X-brace between pylons
      const midGirder = makeBox(THREE, 10.2, 0.38, 0.42, steelMid);
      midGirder.position.set(0, 3.6, 0);
      adGroup.add(midGirder);
      [-1, 1].forEach((side) => {
        const brace = makeBox(THREE, 10.4, 0.2, 0.22, steelMid);
        brace.position.set(0, 5.0, 0);
        brace.rotation.z = side * 0.26;
        adGroup.add(brace);
      });

      // Maintenance catwalk + safety railing below screen
      const catwalk = makeBox(THREE, 15.2, 0.2, 1.15, steelMid);
      catwalk.position.set(0, 6.45, 0.58);
      const railBar = makeBox(THREE, 15.2, 0.08, 0.08, goldTrimMat);
      railBar.position.set(0, 7.1, 1.1);
      adGroup.add(catwalk, railBar);
      for (let rx = -7.2; rx <= 7.2; rx += 1.8) {
        const post = makeBox(THREE, 0.08, 0.65, 0.08, steelMid);
        post.position.set(rx, 6.78, 1.1);
        adGroup.add(post);
      }

      // Giant double-framed LED screen cabinet
      const housing = makeBox(THREE, 15.4, 4.55, 0.72, mats.get('#0F172A', { roughness: 0.35, metalness: 0.3 }));
      housing.position.set(0, 9.0, 0.12);
      const neonOuter = makeBox(THREE, 15.9, 5.0, 0.44, neonRimMat);
      neonOuter.position.set(0, 9.0, 0.06);
      const innerGold = makeBox(THREE, 15.1, 4.25, 0.58, goldTrimMat);
      innerGold.position.set(0, 9.0, 0.2);
      const screenMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(14.7, 3.85),
        new THREE.MeshBasicMaterial({ map: ledAdTex })
      );
      screenMesh.position.set(0, 9.0, 0.505);
      adGroup.add(neonOuter, housing, innerGold, screenMesh);

      // Architectural top crown header sign + corner glowing star beacons
      const crownFrame = makeBox(THREE, 8.8, 1.38, 0.48, goldTrimMat);
      crownFrame.position.set(0, 12.05, 0.18);
      const crownBacking = makeBox(THREE, 8.4, 1.18, 0.52, mats.get('#1E1B4B', { roughness: 0.4 }));
      crownBacking.position.set(0, 12.05, 0.2);
      const crownPlate = new THREE.Mesh(
        new THREE.PlaneGeometry(8.1, 1.06),
        new THREE.MeshBasicMaterial({ map: billboardHeaderTex })
      );
      crownPlate.position.set(0, 12.05, 0.475);
      adGroup.add(crownFrame, crownBacking, crownPlate);

      [-7.7, 7.7].forEach((bx, bi) => {
        const pole = makeCyl(THREE, 0.12, 0.14, 1.0, 8, steelMid);
        pole.position.set(bx, 11.75, 0.18);
        const beaconMat = mats.get(bi === 0 ? '#FACC15' : '#38BDF8', {
          emissive: bi === 0 ? '#F59E0B' : '#0EA5E9',
          emissiveIntensity: lighting.isNight ? 2.4 : 0.55,
        });
        const orb = makeSphere(THREE, 0.32, 10, 8, beaconMat, false, false);
        orb.position.set(bx, 12.35, 0.18);
        if (bi === 0) adGroup.userData.beacon = orb;
        adGroup.add(pole, orb);
      });

      // 3 Overhead Gooseneck Floodlights
      const lampBulbMat = mats.get('#FEF9C3', {
        emissive: '#FDE047',
        emissiveIntensity: lighting.isNight ? 2.4 : 0.25,
      });
      [-4.8, 0, 4.8].forEach((lx) => {
        const arm = makeBox(THREE, 0.12, 0.12, 1.15, steelDark);
        arm.position.set(lx, 11.45, 0.85);
        const hood = makeCyl(THREE, 0.16, 0.34, 0.36, 8, steelMid);
        hood.rotation.x = 0.5;
        hood.position.set(lx, 11.35, 1.38);
        const bulb = makeSphere(THREE, 0.14, 8, 6, lampBulbMat, false, false);
        bulb.position.set(lx, 11.24, 1.42);
        adGroup.add(arm, hood, bulb);
      });

      if (lighting.isNight) {
        const nightWash = new THREE.Mesh(
          new THREE.PlaneGeometry(17.5, 6.2),
          new THREE.MeshBasicMaterial({
            color: '#38BDF8',
            transparent: true,
            opacity: 0.14,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide,
          })
        );
        nightWash.rotation.x = -Math.PI / 2;
        nightWash.position.set(0, 0.09, 2.2);
        adGroup.add(nightWash);
      }

      grp.add(adGroup);
      animatedProps.push(adGroup);
      nightBuildingAnchors.push({ x: wx, y: 8.2, z: wz + 3.2, color: '#38BDF8', intensity: 18 });
    }

    buildGrandBillboard3D(650, 236);   // Left-side middle along northern fence
    buildGrandBillboard3D(2165, 236);  // Right-side middle along northern fence

    return grp;
  }

  // Camera state (Orthographic 45° default or persisted Perspective XCity view)
  const initialPitch = savedCameraMode === 'perspective' ? 0.5 : Math.PI / 4;
  const camState = {
    mode: savedCameraMode,
    targetX: 43,
    targetZ: 21,
    panX: 0,
    panZ: 0,
    yaw: Math.PI / 4, // 45° azimuth
    targetYaw: Math.PI / 4,
    pitch: initialPitch,
    targetPitch: initialPitch,
    zoom: 1.0,
    targetZoom: 1.0,
  };

  function getActiveCamera() {
    return camState.mode === 'perspective' ? perspCamera : orthoCamera;
  }

  const raycaster = new THREE.Raycaster();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const ndcVec = new THREE.Vector2();
  const hitVec = new THREE.Vector3();
  const projVec = new THREE.Vector3();

  function raycastGround(clientX, clientY) {
    const rect = canvasEl.getBoundingClientRect();
    ndcVec.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    ndcVec.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndcVec, getActiveCamera());
    const hit = raycaster.ray.intersectPlane(groundPlane, hitVec);
    if (!hit) return null;
    return { x2d: hit.x / WORLD_SCALE, y2d: hit.z / WORLD_SCALE };
  }

  function resize() {
    const w = window.innerWidth;
    const h = Math.max(1, window.innerHeight);
    const asp = w / h;
    orthoCamera.left = -baseHalfH * asp;
    orthoCamera.right = baseHalfH * asp;
    orthoCamera.top = baseHalfH;
    orthoCamera.bottom = -baseHalfH;
    orthoCamera.updateProjectionMatrix();
    perspCamera.aspect = asp;
    perspCamera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
  }

  function updateAtmosphere(lighting, weather, sceneName, nowMs = 0) {
    const wCond = weather?.condition || 'clear';
    let topCol = '#0284C7';
    let horizonCol = PASTEL_PALETTE.skyDay;
    let bottomCol = '#4FA92B';
    let sunCol = '#FFF3D6';
    let sunInt = 1.34;
    let hemiSkyCol = '#CFEFFF';
    let hemiGroundCol = '#5A9E3C';
    let hemiInt = 0.58;
    let rimCol = '#93C5FD';
    let rimInt = 0.26;
    let envInt = 0.85;
    let exposure = 0.94;
    let nightFactor = 0.0;
    let sunsetGlow = 0.0;

    if (sceneName !== 'neighborhood') {
      topCol = '#0F172A';
      horizonCol = lighting.isNight ? '#0B1324' : '#172338';
      bottomCol = '#080F1E';
      if (lighting.isNight) {
        sunCol = '#93C5FD';
        sunInt = 0.58;
        hemiSkyCol = '#334155';
        hemiGroundCol = '#0F172A';
        hemiInt = 0.34;
        rimCol = '#60A5FA';
        rimInt = 0.16;
        envInt = 0.24;
        exposure = 0.86;
      } else {
        sunInt = 1.28;
        hemiInt = 0.56;
        envInt = 0.78;
        exposure = 0.92;
      }
    } else if (lighting.phase === 'night') {
      topCol = '#020510';
      horizonCol = PASTEL_PALETTE.skyNight;
      bottomCol = '#040814';
      sunCol = '#5B8DEF';
      sunInt = 0.2;
      hemiSkyCol = '#0F1D40';
      hemiGroundCol = '#040814';
      hemiInt = 0.14;
      rimCol = '#60A5FA';
      rimInt = 0.16;
      envInt = 0.035;
      exposure = 0.78;
      nightFactor = 1.0;
    } else if (lighting.phase === 'dawn') {
      topCol = '#1D4ED8';
      horizonCol = PASTEL_PALETTE.skyDawn;
      bottomCol = '#4D7C0F';
      sunCol = '#FDBA74';
      sunInt = 1.05;
      hemiSkyCol = '#FDE68A';
      hemiGroundCol = '#4D7C0F';
      hemiInt = 0.48;
      envInt = 0.44;
      exposure = 0.9;
      sunsetGlow = 0.78;
      nightFactor = 0.12;
    } else if (lighting.phase === 'sunset') {
      topCol = '#1E1B4B';
      horizonCol = PASTEL_PALETTE.skySunset;
      bottomCol = '#1E293B';
      sunCol = '#FB923C';
      sunInt = 0.62;
      hemiSkyCol = '#FDBA74';
      hemiGroundCol = '#0F172A';
      hemiInt = 0.28;
      rimCol = '#F472B6';
      rimInt = 0.22;
      envInt = 0.22;
      exposure = 0.84;
      sunsetGlow = 0.95;
      nightFactor = 0.48;
    } else if (wCond === 'rain' || wCond === 'thunder') {
      topCol = '#475569';
      horizonCol = PASTEL_PALETTE.skyRain;
      bottomCol = '#334155';
      sunInt = 0.85;
      hemiInt = 0.54;
      envInt = 0.55;
      exposure = 0.9;
    }

    const isPersp = camState.mode === 'perspective';
    skyDome.mesh.visible = sceneName === 'neighborhood';
    skyDome.uniforms.uTopColor.value.set(topCol);
    skyDome.uniforms.uHorizonColor.value.set(horizonCol);
    skyDome.uniforms.uBottomColor.value.set(bottomCol);
    skyDome.uniforms.uSunColor.value.set(lighting.phase === 'night' ? '#E0F2FE' : sunCol);
    skyDome.uniforms.uSunsetGlow.value = sunsetGlow;
    skyDome.uniforms.uNightFactor.value = nightFactor;
    skyDome.uniforms.uTime.value = nowMs * 0.001;

    scene.background.set(horizonCol);
    scene.fog.color.set(horizonCol);
    scene.fog.near = wCond === 'fog' ? (isPersp ? 42 : 35) : (isPersp ? 135 : 95);
    scene.fog.far = wCond === 'fog' ? (isPersp ? 135 : 110) : (isPersp ? 310 : 225);
    if (scene.environment) scene.environmentIntensity = envInt;
    renderer.toneMappingExposure = exposure;
    sunLight.color.set(sunCol);
    sunLight.intensity = sunInt;
    hemiLight.color.set(hemiSkyCol);
    hemiLight.groundColor.set(hemiGroundCol);
    hemiLight.intensity = hemiInt;
    rimLight.color.set(rimCol);
    rimLight.intensity = rimInt;

    if (sceneName === 'neighborhood') {
      if (wCond === 'rain' || wCond === 'thunder' || wCond === 'snow') rebuildWeatherParticles(wCond);
      else if (lighting.phase === 'night') rebuildWeatherParticles('fireflies');
      else rebuildWeatherParticles('clear');
    } else {
      rebuildWeatherParticles('clear');
    }
  }

  function renderFrame(params) {
    const {
      deltaSec,
      nowMs,
      state,
      me,
      lighting,
      weather,
      locations,
      streetCars,
      arcadeRoom,
      arcadeCatalog,
      soccerRoom,
      houseRooms,
      wardrobeOpenedRoomId,
      roomDecorSlots,
      findAnyCatalogItem,
      memberMovingMap,
      foreignNpcs,
      helperRobots,
      kidsLeaderboard,
      tapTarget,
      getPetForMember,
      getPetSpecies,
      getPetResolvedColors,
      labelLayerEl,
    } = params;

    const brandName = (state.familyName || 'B2KS').trim() || 'B2KS';
    updateAtmosphere(lighting, weather, me.scene, nowMs);
    updateLeaderBoardTexture(kidsLeaderboard, brandName);
    updateLedAdTexture(state.billboardText, brandName, Boolean(lighting.isNight));
    ledAdTex.offset.x = (nowMs * 0.00014) % 1;

    // 1. Rebuild static world only when scene / building layouts / night state / rooms change
    const locSig = locations.map((l) => `${l.id}:${l.x}:${l.y}:${l.shape}`).join('|');
    const roomSig =
      me.scene === 'house'
        ? houseRooms.map((r) => `${r.id}:${r.isUnlocked}:${r.isDisabled}:${r.wall}`).join('|') +
          `|${wardrobeOpenedRoomId}|` +
          state.members
            .map((m) => `${m.roomWall || ''}:${JSON.stringify(m.roomSlots || {})}:${(m.roomDecor || []).map((d) => `${d.id}@${d.x},${d.y}`).join(',')}`)
            .join(';')
        : me.scene === 'private_room'
          ? `${me.privateRoomId}|${wardrobeOpenedRoomId}|` +
            JSON.stringify(state.members.find((m) => m.id === (houseRooms.find((r) => r.id === me.privateRoomId)?.ownerIds?.[0]))?.roomSlots || {}) +
            '|' +
            (state.members.find((m) => m.id === (houseRooms.find((r) => r.id === me.privateRoomId)?.ownerIds?.[0]))?.roomWall || '')
          : `${locSig}|${state.house?.plotIndex}|${state.house?.style}|${state.familyName}|${weather?.condition}|${arcadeRoom?.status}|${soccerRoom?.status}`;
    const worldSig = `${me.scene}|${lighting.phase}|${roomSig}`;

    if (worldSig !== lastWorldSignature) {
      lastWorldSignature = worldSig;
      clearGroupChildren(worldGroup);
      if (me.scene === 'neighborhood') {
        worldGroup.add(buildNeighborhoodGroup(state, lighting, weather, locations, arcadeRoom, arcadeCatalog, soccerRoom));
      } else if (me.scene === 'house') {
        animatedProps.length = 0;
        labelTargets.length = 0;
        worldGroup.add(
          buildHouseInterior3D(THREE, mats, textures, houseRooms, state, wardrobeOpenedRoomId, lighting.isNight, findAnyCatalogItem, roomDecorSlots)
        );
        houseRooms.forEach((r) => {
          const isBedroomOrClosed = r.isDisabled || r.id === 'f2_parents' || (!r.id.startsWith('f1_') && !r.id.startsWith('f2_'));
          labelTargets.push({
            x: (r.x + r.w / 2) * WORLD_SCALE,
            y: isBedroomOrClosed ? 3.85 : 3.6,
            z: (isBedroomOrClosed ? r.y + r.h * 0.48 : r.y + 24) * WORLD_SCALE,
            text: r.name + (r.isDisabled ? ' 🚫' : r.ownerIds?.length ? (r.isUnlocked ? ' 🔓' : ' 🔒') : ''),
            kind: 'building',
          });
        });
      } else {
        animatedProps.length = 0;
        labelTargets.length = 0;
        const room = houseRooms.find((r) => r.id === (me.privateRoomId || '')) || null;
        const ownerMember = (room && room.ownerIds && state.members.find((m) => m.id === room.ownerIds[0])) || null;
        worldGroup.add(
          buildPrivateRoom3D(THREE, mats, textures, room, houseRooms, ownerMember, wardrobeOpenedRoomId, lighting.isNight, roomDecorSlots, findAnyCatalogItem)
        );
        const exitX = room?.doorSide === 'right' ? 742 : 18;
        labelTargets.push({ x: 68 * WORLD_SCALE, y: 2.2, z: 68 * WORLD_SCALE, text: '🛏️ Giường ngủ', kind: 'building' });
        labelTargets.push({ x: 706 * WORLD_SCALE, y: 4.5, z: 46 * WORLD_SCALE, text: '🧥 Tủ quần áo', kind: 'building' });
        labelTargets.push({ x: exitX * WORLD_SCALE, y: 2.2, z: 310 * WORLD_SCALE, text: '🚪 Ra hành lang', kind: 'building' });
      }
    }

    // 2. Animate world props (trees, portal, fountain spray, soccer ball, barber pole)
    animatedProps.forEach((obj) => {
      if (obj.userData.canopy) {
        obj.userData.canopy.rotation.z = Math.sin(nowMs * 0.0016 + (obj.userData.swayPhase || 0)) * 0.04;
      }
      if (obj.userData.portalRing) {
        obj.userData.portalRing.rotation.z = nowMs * 0.0018;
      }
      if (obj.userData.floatingEgg) {
        obj.userData.floatingEgg.position.y = 5.85 + Math.sin(nowMs * 0.003) * 0.18;
        obj.userData.floatingEgg.rotation.y = nowMs * 0.0012;
      }
      if (obj.userData.floatingCrystal) {
        obj.userData.floatingCrystal.position.y = 6.45 + Math.sin(nowMs * 0.0028) * 0.22;
        obj.userData.floatingCrystal.rotation.y = nowMs * 0.0018;
      }
      if (obj.userData.beacon) {
        obj.userData.beacon.scale.setScalar(1 + Math.sin(nowMs * 0.006) * 0.18);
      }
      if (obj.userData.barberPole) {
        obj.userData.barberPole.rotation.y = nowMs * 0.005;
      }
      if (obj.userData.waterSpray) {
        obj.userData.waterSpray.position.y = 5.45 + Math.sin(nowMs * 0.008) * 0.24;
        obj.userData.waterSpray.scale.setScalar(0.92 + Math.sin(nowMs * 0.01) * 0.16);
      }
      if (obj.userData.waterDroplets) {
        obj.userData.waterDroplets.forEach((drop) => {
          const ud = drop.userData;
          const cyc = ((nowMs * 0.0014 + ud.phase) % 1 + 1) % 1;
          drop.position.set(
            Math.cos(ud.ang) * (ud.radius + cyc * 1.15),
            0.85 + Math.sin(cyc * Math.PI) * 3.1,
            Math.sin(ud.ang) * (ud.radius + cyc * 1.15)
          );
          drop.scale.setScalar(0.65 + (1 - Math.abs(cyc - 0.5) * 2) * 0.55);
        });
      }
      if (obj.userData.waterRipples) {
        obj.userData.waterRipples.forEach((ring) => {
          const s = 0.88 + (((nowMs * 0.0008 + ring.userData.phase) % 1) * 0.35);
          ring.scale.setScalar(s);
        });
      }
      if (obj.userData.butterflies) {
        obj.userData.butterflies.forEach((bf) => {
          const ud = bf.userData;
          const t = nowMs * 0.0016 + ud.angle;
          bf.position.set(Math.cos(t) * ud.radius, ud.baseY + Math.sin(t * 2.4) * 0.32, Math.sin(t) * ud.radius);
          bf.rotation.y = -t;
          if (bf.children[0] && bf.children[1]) {
            const fl = Math.sin(nowMs * 0.022 + ud.angle) * 0.65;
            bf.children[0].rotation.z = fl;
            bf.children[1].rotation.z = -fl;
          }
        });
      }
      if (obj.userData.soccerBall) {
        obj.userData.soccerBall.position.x = Math.sin(nowMs * 0.0025) * 1.6;
        obj.userData.soccerBall.position.y = 0.45 + Math.abs(Math.sin(nowMs * 0.005)) * 0.25;
      }
    });

    // 3. Update & render 3D Vehicles + Pedestrians in neighborhood
    const inNeighborhood = me.scene === 'neighborhood';
    vehiclesGroup.visible = inNeighborhood;
    pedestriansGroup.visible = inNeighborhood;
    if (inNeighborhood) {
      if (lastVehicleNightState !== Boolean(lighting.isNight)) {
        lastVehicleNightState = Boolean(lighting.isNight);
        vehicleMeshes.forEach((vm) => vehiclesGroup.remove(vm));
        vehicleMeshes.clear();
      }
      streetCars.forEach((car, idx) => {
        if (car.axis === 'h') {
          car.x += car.speed;
          if (car.x > STREET_WORLD.width + 110) car.x = -110;
          if (car.x < -110) car.x = STREET_WORLD.width + 110;
        } else {
          car.y += car.speed;
          if (car.y > STREET_WORLD.height + 110) car.y = 220;
          if (car.y < 220) car.y = STREET_WORLD.height + 110;
        }
        const key = `car_${idx}`;
        let mesh = vehicleMeshes.get(key);
        if (!mesh) {
          mesh = buildVehicle3D(THREE, mats, car, Boolean(lighting.isNight));
          vehicleMeshes.set(key, mesh);
          vehiclesGroup.add(mesh);
        }
        mesh.position.set(car.x * WORLD_SCALE, 0.17, car.y * WORLD_SCALE);
        mesh.rotation.y = car.axis === 'h' ? (car.dir > 0 ? 0 : Math.PI) : car.dir > 0 ? -Math.PI / 2 : Math.PI / 2;
      });

      // Update Sidewalk Pedestrians
      pedestrianEntries.forEach(({ mesh, route, phaseOffset }) => {
        if (route.axis === 'h') {
          route.x += route.dir * route.speed * deltaSec;
          if (route.x > route.max) {
            route.x = route.max;
            route.dir = -1;
          } else if (route.x < route.min) {
            route.x = route.min;
            route.dir = 1;
          }
          mesh.userData.targetYaw = route.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        } else {
          route.y += route.dir * route.speed * deltaSec;
          if (route.y > route.max) {
            route.y = route.max;
            route.dir = -1;
          } else if (route.y < route.min) {
            route.y = route.min;
            route.dir = 1;
          }
          mesh.userData.targetYaw = route.dir > 0 ? 0 : Math.PI;
        }
        mesh.position.set(route.x * WORLD_SCALE, 0.08, route.y * WORLD_SCALE);
        const ud = mesh.userData;
        let diff = ud.targetYaw - ud.currentYaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        ud.currentYaw += diff * Math.min(1, deltaSec * 10);
        ud.bodyRoot.rotation.y = ud.currentYaw;
        const walkPhase = nowMs * 0.011 + phaseOffset;
        const swing = Math.sin(walkPhase) * 0.55;
        ud.leftLegPivot.rotation.x = swing;
        ud.rightLegPivot.rotation.x = -swing;
        ud.leftArmPivot.rotation.x = -swing * 0.78;
        ud.rightArmPivot.rotation.x = swing * 0.78;
        ud.upperGroup.position.y = 0.48 + Math.abs(Math.sin(walkPhase)) * 0.07;
      });
    }

    // 4. Sync 3D Chibi Characters & Companion Pets
    const visibleMembers = state.members.filter((m) => {
      if (m.scene !== me.scene) return false;
      if (me.scene === 'private_room') {
        return (m.privateRoomId || null) === (me.privateRoomId || null);
      }
      return true;
    });
    const visibleIds = new Set(visibleMembers.map((m) => m.id));

    memberMeshes.forEach((entry, id) => {
      if (!visibleIds.has(id)) {
        actorsGroup.remove(entry.mesh);
        memberMeshes.delete(id);
      }
    });
    petMeshes.forEach((entry, id) => {
      if (!visibleIds.has(id)) {
        actorsGroup.remove(entry.mesh);
        petMeshes.delete(id);
      }
    });

    const dynamicLabels = [];

    visibleMembers.forEach((m) => {
      const appearanceSig = `${m.role}|${m.hairStyle}|${m.hairColor}|${m.shirtColor}|${m.shirtPattern}|${m.pantsColor}|${m.pantsStyle}|${m.outfit}|${m.id === me.id}`;
      let entry = memberMeshes.get(m.id);
      if (!entry || entry.sig !== appearanceSig) {
        if (entry) actorsGroup.remove(entry.mesh);
        const charMesh = buildChibiCharacter3D(THREE, mats, textures.shadowTex, m, m.id === me.id);
        charMesh.position.set(m.x * WORLD_SCALE, 0.1, m.y * WORLD_SCALE);
        actorsGroup.add(charMesh);
        entry = { mesh: charMesh, sig: appearanceSig, prevX: m.x, prevY: m.y };
        memberMeshes.set(m.id, entry);
      }

      const targetX = m.x * WORLD_SCALE;
      const targetZ = m.y * WORLD_SCALE;
      const moveDX = m.x - entry.prevX;
      const moveDY = m.y - entry.prevY;
      entry.prevX = m.x;
      entry.prevY = m.y;

      // Smoothly position & rotate Chibi to face movement direction!
      entry.mesh.position.x = THREE.MathUtils.damp(entry.mesh.position.x, targetX, 20, deltaSec);
      entry.mesh.position.z = THREE.MathUtils.damp(entry.mesh.position.z, targetZ, 20, deltaSec);
      entry.mesh.position.y = me.scene === 'neighborhood' ? 0.08 : 0.1;

      const ud = entry.mesh.userData;
      const isMoving = Boolean(memberMovingMap.get(m.id));
      if (Math.hypot(moveDX, moveDY) > 0.05) {
        ud.targetYaw = Math.atan2(moveDX, moveDY);
      } else {
        if (m.dir === 'left') ud.targetYaw = -Math.PI / 2;
        else if (m.dir === 'right') ud.targetYaw = Math.PI / 2;
        else if (m.dir === 'up') ud.targetYaw = Math.PI;
        else ud.targetYaw = 0;
      }

      // Shortest-angle yaw damping
      let diff = ud.targetYaw - ud.currentYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      ud.currentYaw += diff * Math.min(1, deltaSec * 14);
      ud.bodyRoot.rotation.y = ud.currentYaw;

      // Walk cycle or gentle idle breathing
      if (isMoving) {
        const phase = nowMs * 0.015;
        const swing = Math.sin(phase) * 0.65;
        ud.leftLegPivot.rotation.x = swing;
        ud.rightLegPivot.rotation.x = -swing;
        ud.leftArmPivot.rotation.x = -swing * 0.85;
        ud.rightArmPivot.rotation.x = swing * 0.85;
        ud.upperGroup.position.y = 0.48 + Math.abs(Math.sin(phase)) * 0.09;
      } else {
        ud.leftLegPivot.rotation.x = THREE.MathUtils.damp(ud.leftLegPivot.rotation.x, 0, 12, deltaSec);
        ud.rightLegPivot.rotation.x = THREE.MathUtils.damp(ud.rightLegPivot.rotation.x, 0, 12, deltaSec);
        ud.leftArmPivot.rotation.x = THREE.MathUtils.damp(ud.leftArmPivot.rotation.x, 0, 12, deltaSec);
        ud.rightArmPivot.rotation.x = THREE.MathUtils.damp(ud.rightArmPivot.rotation.x, 0, 12, deltaSec);
        ud.upperGroup.position.y = 0.48 + Math.sin(nowMs * 0.003 + m.x) * 0.025;
      }

      dynamicLabels.push({
        x: entry.mesh.position.x,
        y: entry.mesh.position.y + 2.45,
        z: entry.mesh.position.z,
        text: m.name,
        kind: m.id === me.id ? 'name-me' : 'name',
      });
      if (m.speech && nowMs < m.speech.expiresAt) {
        dynamicLabels.push({
          x: entry.mesh.position.x,
          y: entry.mesh.position.y + 3.05,
          z: entry.mesh.position.z,
          text: m.speech.isEng ? `${m.speech.text} (+5⭐)` : m.speech.text,
          kind: m.speech.isEng ? 'speech-eng' : 'speech',
        });
      }

      // Companion Pet 3D
      const pet = getPetForMember(m);
      if (pet) {
        const sp = getPetSpecies(pet.speciesId);
        const col = getPetResolvedColors(sp, pet.variant);
        const petSig = `${pet.id}|${pet.speciesId}|${pet.stage}|${pet.hatched}|${pet.variant}|${pet.accessoryId}`;
        let pEntry = petMeshes.get(m.id);
        if (!pEntry || pEntry.sig !== petSig) {
          if (pEntry) actorsGroup.remove(pEntry.mesh);
          const pm = buildPet3D(THREE, mats, textures.shadowTex, pet, sp, col);
          pm.position.set(entry.mesh.position.x - 1.2, 0.08, entry.mesh.position.z + 0.6);
          actorsGroup.add(pm);
          pEntry = { mesh: pm, sig: petSig };
          petMeshes.set(m.id, pEntry);
        }
        const followAngle = ud.currentYaw + Math.PI * 0.72;
        const pTargetX = entry.mesh.position.x + Math.sin(followAngle) * 1.45;
        const pTargetZ = entry.mesh.position.z + Math.cos(followAngle) * 1.45;
        const pdx = pTargetX - pEntry.mesh.position.x;
        const pdz = pTargetZ - pEntry.mesh.position.z;
        pEntry.mesh.position.x = THREE.MathUtils.damp(pEntry.mesh.position.x, pTargetX, 7, deltaSec);
        pEntry.mesh.position.z = THREE.MathUtils.damp(pEntry.mesh.position.z, pTargetZ, 7, deltaSec);
        if (Math.hypot(pdx, pdz) > 0.03) {
          pEntry.mesh.userData.actor.rotation.y = Math.atan2(pdx, pdz);
        }
        const pud = pEntry.mesh.userData;
        const bounce = isMoving ? Math.abs(Math.sin(nowMs * 0.012)) * 0.25 : Math.sin(nowMs * 0.004) * 0.08;
        pud.actor.position.y = bounce;
        if (pud.leftWingPivot && pud.rightWingPivot) {
          const spd = pud.leftWingPivot.userData.flapSpeed || 0.009;
          const amp = pud.leftWingPivot.userData.flapAmp || 0.24;
          const fl = Math.sin(nowMs * spd) * amp;
          pud.leftWingPivot.rotation.z = (pud.leftWingPivot.userData.baseZ || 0) - fl;
          pud.rightWingPivot.rotation.z = (pud.rightWingPivot.userData.baseZ || 0) + fl;
        }
        if (pud.variantOrbit) {
          pud.variantOrbit.rotation.y = nowMs * 0.0018;
        }
        if (pud.variantWheel) {
          pud.variantWheel.rotation.z = nowMs * 0.0014;
        }
        if (pud.auraRing) {
          pud.auraRing.rotation.z = nowMs * 0.0022;
          pud.auraRing.scale.setScalar(1 + Math.sin(nowMs * 0.005) * 0.08);
        }
      } else if (petMeshes.has(m.id)) {
        actorsGroup.remove(petMeshes.get(m.id).mesh);
        petMeshes.delete(m.id);
      }
    });

    // 4b. Sync Roaming Foreign NPCs (Mr. Alex & Ms. Emma) in neighborhood
    const visibleNpcs = me.scene === 'neighborhood' && Array.isArray(foreignNpcs) ? foreignNpcs : [];
    const visibleNpcIds = new Set(visibleNpcs.map((n) => n.id));
    foreignNpcMeshes.forEach((entry, id) => {
      if (!visibleNpcIds.has(id)) {
        actorsGroup.remove(entry.mesh);
        foreignNpcMeshes.delete(id);
      }
    });
    visibleNpcs.forEach((npc) => {
      let nEntry = foreignNpcMeshes.get(npc.id);
      if (!nEntry) {
        const nm = buildForeignNpc3D(THREE, mats, textures.shadowTex, npc);
        nm.position.set(npc.x * WORLD_SCALE, 0.08, npc.y * WORLD_SCALE);
        actorsGroup.add(nm);
        nEntry = { mesh: nm };
        foreignNpcMeshes.set(npc.id, nEntry);
      }
      nEntry.mesh.position.x = THREE.MathUtils.damp(nEntry.mesh.position.x, npc.x * WORLD_SCALE, 16, deltaSec);
      nEntry.mesh.position.z = THREE.MathUtils.damp(nEntry.mesh.position.z, npc.y * WORLD_SCALE, 16, deltaSec);
      nEntry.mesh.position.y = 0.08;
      const ud = nEntry.mesh.userData;
      ud.targetYaw = typeof npc.facingYaw === 'number' ? npc.facingYaw : 0;
      let ndiff = ud.targetYaw - ud.currentYaw;
      while (ndiff > Math.PI) ndiff -= Math.PI * 2;
      while (ndiff < -Math.PI) ndiff += Math.PI * 2;
      ud.currentYaw += ndiff * Math.min(1, deltaSec * 12);
      ud.bodyRoot.rotation.y = ud.currentYaw;
      if (npc.isMoving) {
        const phase = nowMs * 0.012;
        const swing = Math.sin(phase) * 0.55;
        ud.leftLegPivot.rotation.x = swing;
        ud.rightLegPivot.rotation.x = -swing;
        ud.leftArmPivot.rotation.x = -swing * 0.75;
        ud.rightArmPivot.rotation.x = swing * 0.75;
      } else {
        ud.leftLegPivot.rotation.x = THREE.MathUtils.damp(ud.leftLegPivot.rotation.x, 0, 12, deltaSec);
        ud.rightLegPivot.rotation.x = THREE.MathUtils.damp(ud.rightLegPivot.rotation.x, 0, 12, deltaSec);
        ud.leftArmPivot.rotation.x = THREE.MathUtils.damp(ud.leftArmPivot.rotation.x, 0, 12, deltaSec);
        ud.rightArmPivot.rotation.x = -2.2 + Math.sin(nowMs * 0.01) * 0.35;
      }
      dynamicLabels.push({
        x: nEntry.mesh.position.x,
        y: nEntry.mesh.position.y + 2.55,
        z: nEntry.mesh.position.z,
        text: `${npc.gender === 'female' ? '👩‍🏫' : '👨‍🏫'} ${npc.name}`,
        kind: 'name',
      });
      dynamicLabels.push({
        x: nEntry.mesh.position.x,
        y: nEntry.mesh.position.y + 3.15,
        z: nEntry.mesh.position.z,
        text: npc.speechText || 'Speak to me! 💬',
        kind: 'speech-eng',
      });
    });

    // 4c. Sync Child Helper Robots (follow active schedule with raised scrolling sign, or rest in private room)
    const visibleRobots = Array.isArray(helperRobots)
      ? helperRobots.filter((r) => {
          if (r.scene !== me.scene) return false;
          if (me.scene === 'private_room') return (r.privateRoomId || null) === (me.privateRoomId || null);
          return true;
        })
      : [];
    const visibleRobotKeys = new Set(visibleRobots.map((r) => r.childId));
    helperRobotMeshes.forEach((entry, cid) => {
      if (!visibleRobotKeys.has(cid)) {
        actorsGroup.remove(entry.mesh);
        helperRobotMeshes.delete(cid);
      }
    });
    visibleRobots.forEach((r) => {
      const bTex = getOrCreateRobotBannerTex(r.childId, r.reminderText);
      bTex.offset.x = (nowMs * 0.00028) % 1;
      let rEntry = helperRobotMeshes.get(r.childId);
      if (!rEntry || rEntry.skin !== r.skin) {
        if (rEntry) actorsGroup.remove(rEntry.mesh);
        const rm = buildHelperRobot3D(THREE, mats, textures.shadowTex, r.skin, bTex);
        rm.position.set(r.x * WORLD_SCALE, 0.08, r.y * WORLD_SCALE);
        actorsGroup.add(rm);
        rEntry = { mesh: rm, skin: r.skin };
        helperRobotMeshes.set(r.childId, rEntry);
      }
      rEntry.mesh.position.x = THREE.MathUtils.damp(rEntry.mesh.position.x, r.x * WORLD_SCALE, 14, deltaSec);
      rEntry.mesh.position.z = THREE.MathUtils.damp(rEntry.mesh.position.z, r.y * WORLD_SCALE, 14, deltaSec);
      rEntry.mesh.position.y = me.scene === 'neighborhood' ? 0.08 : 0.1;

      const ud = rEntry.mesh.userData;
      const targetYaw = typeof r.facingYaw === 'number' ? r.facingYaw : 0.35;
      let curYaw = typeof ud.currentYaw === 'number' ? ud.currentYaw : targetYaw;
      let yawDiff = targetYaw - curYaw;
      while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
      while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
      curYaw += yawDiff * Math.min(1, deltaSec * 10);
      ud.currentYaw = curYaw;
      ud.actor.rotation.y = curYaw;

      const movingNow = Boolean(r.isMoving);
      ud.actor.position.y = movingNow
        ? Math.abs(Math.sin(nowMs * 0.011)) * 0.14
        : r.isFollowing
          ? Math.abs(Math.sin(nowMs * 0.0065)) * 0.07
          : Math.sin(nowMs * 0.003) * 0.04;
      ud.actor.rotation.z = movingNow ? Math.sin(nowMs * 0.011) * 0.05 : 0;
      ud.actor.rotation.x = THREE.MathUtils.damp(ud.actor.rotation.x || 0, movingNow ? 0.075 : 0, 10, deltaSec);

      if (ud.propeller) {
        ud.propeller.rotation.y += deltaSec * (movingNow ? 16 : r.isFollowing ? 11 : 4.5);
      }
      if (ud.ribbonBow) {
        ud.ribbonBow.rotation.z = Math.sin(nowMs * (movingNow ? 0.011 : 0.0045)) * (movingNow ? 0.14 : 0.06);
      }
      ud.bannerHolder.visible = Boolean(r.isFollowing && r.reminderText);
      // Keep floating reminder board cleanly facing camera while robot turns behind character
      ud.bannerHolder.rotation.y = camState.yaw - curYaw;

      const walkSwing = movingNow ? Math.sin(nowMs * 0.011) * 0.42 : 0;
      const targetLeftArmX = r.isFollowing ? -2.55 : walkSwing;
      const targetRightArmX = r.isFollowing ? -2.55 : -walkSwing;
      ud.leftArmPivot.rotation.x = THREE.MathUtils.damp(ud.leftArmPivot.rotation.x, targetLeftArmX, 12, deltaSec);
      ud.rightArmPivot.rotation.x = THREE.MathUtils.damp(ud.rightArmPivot.rotation.x, targetRightArmX, 12, deltaSec);

      dynamicLabels.push({
        x: rEntry.mesh.position.x,
        y: rEntry.mesh.position.y + (r.isFollowing ? 3.08 : 2.32),
        z: rEntry.mesh.position.z,
        text: `🤖 Robot (${r.childName})`,
        kind: 'name',
      });
    });

    // 5. Tap-to-move visual marker animation
    if (tapTarget) {
      tapMarker.visible = true;
      tapMarker.position.set(tapTarget.x * WORLD_SCALE, 0.02, tapTarget.y * WORLD_SCALE);
      const pulse = 0.85 + Math.sin(nowMs * 0.01) * 0.18;
      tapRing.scale.setScalar(pulse);
      tapDiamond.position.y = 0.85 + Math.sin(nowMs * 0.008) * 0.22;
      tapDiamond.rotation.y = nowMs * 0.004;
    } else {
      tapMarker.visible = false;
    }

    // 6. Camera follow + smooth exponential damping (Isometric 45° or Perspective XCity)
    const followX = me.x * WORLD_SCALE + camState.panX;
    const followZ = me.y * WORLD_SCALE + camState.panZ;
    camState.targetX = THREE.MathUtils.damp(camState.targetX, followX, 10, deltaSec);
    camState.targetZ = THREE.MathUtils.damp(camState.targetZ, followZ, 10, deltaSec);
    camState.yaw = THREE.MathUtils.damp(camState.yaw, camState.targetYaw, 10, deltaSec);
    camState.pitch = THREE.MathUtils.damp(camState.pitch, camState.targetPitch, 10, deltaSec);
    camState.zoom = THREE.MathUtils.damp(camState.zoom, camState.targetZoom, 12, deltaSec);

    const activeCamera = getActiveCamera();
    if (camState.mode === 'ortho' && Math.abs(orthoCamera.zoom - camState.zoom) > 0.001) {
      orthoCamera.zoom = camState.zoom;
      orthoCamera.updateProjectionMatrix();
    }

    const inInterior = me.scene !== 'neighborhood';
    const effectivePitch =
      camState.mode === 'perspective' && inInterior ? Math.max(0.58, camState.pitch) : camState.pitch;
    const camDist =
      camState.mode === 'perspective'
        ? (inInterior ? 32 : 38) / Math.max(0.45, camState.zoom)
        : 90;
    const cosP = Math.cos(effectivePitch);
    activeCamera.position.set(
      camState.targetX + camDist * cosP * Math.sin(camState.yaw),
      camDist * Math.sin(effectivePitch),
      camState.targetZ + camDist * cosP * Math.cos(camState.yaw)
    );
    activeCamera.lookAt(camState.targetX, camState.mode === 'perspective' ? 1.45 : 0.8, camState.targetZ);

    // Keep Sky Dome centered around camera look target so horizon & stars never clip
    skyDome.mesh.position.set(camState.targetX, -2, camState.targetZ);

    // Anchor DirectionalLight shadow frustum around camera target so soft shadows stay razor-sharp everywhere!
    sunLight.position.set(camState.targetX + 36, 48, camState.targetZ + 30);
    sunLight.target.position.set(camState.targetX, 0, camState.targetZ);
    sunLight.target.updateMatrixWorld();

    // Update dynamic real PointLights for streetlamps, buildings, cars, player, and cozy interiors
    const nightBoost = lighting.phase === 'night' ? 1.0 : lighting.isNight ? 0.65 : 0.0;
    if (inNeighborhood && nightBoost > 0) {
      const refX = camState.targetX;
      const refZ = camState.targetZ;

      const nearestLamps = nightLampAnchors
        .map((a) => ({ a, d2: (a.x - refX) * (a.x - refX) + (a.z - refZ) * (a.z - refZ) }))
        .filter((x) => x.d2 < 2400)
        .sort((x, y) => x.d2 - y.d2);
      lampPointLights.forEach((pl, idx) => {
        const pick = nearestLamps[idx];
        if (pick) {
          pl.position.set(pick.a.x, pick.a.y, pick.a.z);
          pl.intensity = 22 * nightBoost;
        } else {
          pl.intensity = 0;
        }
      });

      const nearestBuildings = nightBuildingAnchors
        .map((a) => ({ a, d2: (a.x - refX) * (a.x - refX) + (a.z - refZ) * (a.z - refZ) }))
        .filter((x) => x.d2 < 2600)
        .sort((x, y) => x.d2 - y.d2);
      buildingPointLights.forEach((pl, idx) => {
        const pick = nearestBuildings[idx];
        if (pick) {
          pl.color.set(pick.a.color);
          pl.position.set(pick.a.x, pick.a.y, pick.a.z);
          pl.intensity = pick.a.intensity * nightBoost;
        } else {
          pl.intensity = 0;
        }
      });

      const nearestCars = streetCars
        .filter((c) => c.kind !== 'bike')
        .map((c) => {
          const cx = c.x * WORLD_SCALE;
          const cz = c.y * WORLD_SCALE;
          return { c, cx, cz, d2: (cx - refX) * (cx - refX) + (cz - refZ) * (cz - refZ) };
        })
        .filter((x) => x.d2 < 2400)
        .sort((x, y) => x.d2 - y.d2);
      carPointLights.forEach((pl, idx) => {
        const pick = nearestCars[idx];
        if (pick) {
          const aheadX = pick.cx + (pick.c.axis === 'h' ? pick.c.dir * 2.8 : 0);
          const aheadZ = pick.cz + (pick.c.axis === 'v' ? pick.c.dir * 2.8 : 0);
          pl.position.set(aheadX, 1.05, aheadZ);
          pl.intensity = 16 * nightBoost;
        } else {
          pl.intensity = 0;
        }
      });

      playerNightLight.position.set(me.x * WORLD_SCALE, 2.4, me.y * WORLD_SCALE);
      playerNightLight.intensity = 2.4 * nightBoost;
      interiorPointLights.forEach((pl) => {
        pl.intensity = 0;
      });
    } else if (!inNeighborhood && lighting.isNight) {
      lampPointLights.forEach((pl) => {
        pl.intensity = 0;
      });
      buildingPointLights.forEach((pl) => {
        pl.intensity = 0;
      });
      carPointLights.forEach((pl) => {
        pl.intensity = 0;
      });
      playerNightLight.intensity = 0;
      if (me.scene === 'house') {
        interiorPointLights[0].color.set('#FFE4A0');
        interiorPointLights[0].position.set(28, 7.5, 16);
        interiorPointLights[0].intensity = 22;
        interiorPointLights[1].color.set('#FFD98A');
        interiorPointLights[1].position.set(28, 7.5, 31);
        interiorPointLights[1].intensity = 22;
      } else {
        interiorPointLights[0].color.set('#FFE082');
        interiorPointLights[0].position.set(6.82, 3.2, 2.2);
        interiorPointLights[0].intensity = 16;
        interiorPointLights[1].color.set('#FFE8B3');
        interiorPointLights[1].position.set(20, 6.2, 11);
        interiorPointLights[1].intensity = 14;
      }
    } else {
      lampPointLights.forEach((pl) => {
        pl.intensity = 0;
      });
      buildingPointLights.forEach((pl) => {
        pl.intensity = 0;
      });
      carPointLights.forEach((pl) => {
        pl.intensity = 0;
      });
      playerNightLight.intensity = 0;
      interiorPointLights.forEach((pl) => {
        pl.intensity = 0;
      });
    }

    // Update weather particles around camera target
    if (weatherParticles.length > 0) {
      weatherGroup.position.set(camState.targetX, 0, camState.targetZ);
      weatherParticles.forEach((wp) => {
        if (weatherMode === 'rain' || weatherMode === 'thunder') {
          wp.mesh.position.y -= deltaSec * 22;
          if (wp.mesh.position.y < 0.2) wp.mesh.position.y = 16;
        } else if (weatherMode === 'snow') {
          wp.mesh.position.y -= deltaSec * 2.5;
          wp.mesh.position.x += Math.sin(nowMs * 0.002 + wp.offset) * deltaSec * 0.8;
          if (wp.mesh.position.y < 0.2) wp.mesh.position.y = 16;
        } else if (weatherMode === 'fireflies') {
          wp.mesh.position.y = 1.6 + Math.sin(nowMs * 0.003 + wp.offset) * 0.9;
        }
      });
    }

    renderer.render(scene, activeCamera);

    // 7. Project 3D floating labels cleanly onto HTML overlay
    if (labelLayerEl) {
      const allLabels = [...labelTargets, ...dynamicLabels];
      const viewW = window.innerWidth;
      const viewH = window.innerHeight;
      while (labelLayerEl.children.length < allLabels.length) {
        const el = document.createElement('div');
        el.className = 'world-float-label';
        labelLayerEl.appendChild(el);
      }
      for (let i = 0; i < labelLayerEl.children.length; i++) {
        const el = labelLayerEl.children[i];
        if (i >= allLabels.length) {
          el.style.display = 'none';
          continue;
        }
        const lbl = allLabels[i];
        projVec.set(lbl.x, lbl.y, lbl.z).project(activeCamera);
        if (projVec.z > 1 || projVec.x < -1.15 || projVec.x > 1.15 || projVec.y < -1.15 || projVec.y > 1.15) {
          el.style.display = 'none';
          continue;
        }
        const sx = (projVec.x * 0.5 + 0.5) * viewW;
        const sy = (-projVec.y * 0.5 + 0.5) * viewH;
        el.style.display = 'block';
        el.style.left = `${sx.toFixed(1)}px`;
        el.style.top = `${sy.toFixed(1)}px`;
        if (el.textContent !== lbl.text) el.textContent = lbl.text;
        const cls =
          lbl.kind === 'name-me'
            ? 'world-float-label world-name-pill me'
            : lbl.kind === 'name'
              ? 'world-float-label world-name-pill'
              : lbl.kind === 'speech-eng'
                ? 'world-float-label world-speech-bubble eng'
                : lbl.kind === 'speech'
                  ? 'world-float-label world-speech-bubble'
                  : lbl.kind === 'live'
                    ? 'world-float-label world-live-banner'
                    : lbl.kind === 'lobby'
                      ? 'world-float-label world-live-banner lobby'
                      : 'world-float-label world-building-sign';
        if (el.className !== cls) el.className = cls;
      }
    }
  }

  function setCameraMode(nextMode) {
    const resolved = nextMode === 'perspective' ? 'perspective' : 'ortho';
    camState.mode = resolved;
    camState.targetPitch = resolved === 'perspective' ? 0.5 : Math.PI / 4;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(CAMERA_MODE_STORAGE_KEY, resolved);
      }
    } catch {
      // ignore
    }
    resize();
    return resolved;
  }

  return {
    THREE,
    camState,
    resize,
    raycastGround,
    renderFrame,
    getCameraMode() {
      return camState.mode;
    },
    setCameraMode,
    toggleCameraMode() {
      return setCameraMode(camState.mode === 'perspective' ? 'ortho' : 'perspective');
    },
    setZoom(nextZoom) {
      camState.targetZoom = Math.max(0.55, Math.min(2.2, nextZoom));
    },
    resetCamera() {
      camState.targetYaw = Math.PI / 4;
      camState.targetPitch = camState.mode === 'perspective' ? 0.5 : Math.PI / 4;
      camState.panX = 0;
      camState.panZ = 0;
      camState.targetZoom = 1.0;
    },
    dispose() {
      mats.disposeAll();
      Object.values(textures).forEach((t) => t.dispose());
      skyDome.mesh.geometry.dispose();
      skyDome.mat.dispose();
      leaderTex.dispose();
      ledAdTex.dispose();
      billboardHeaderTex.dispose();
      robotBannerCache.forEach((b) => b.tex.dispose());
      robotBannerCache.clear();
      _petGeoCache.forEach((g) => g.dispose());
      _petGeoCache.clear();
      renderer.dispose();
    },
  };
}
