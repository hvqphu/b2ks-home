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
  skyDawn: '#FDE2C8',
  skySunset: '#FAC39D',
  skyNight: '#17203A',
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
      const key = `${color}|${opts.roughness ?? 0.72}|${opts.metalness ?? 0.04}|${opts.emissive ?? 0}|${opts.opacity ?? 1}|${opts.flatShading ? 1 : 0}`;
      if (cache.has(key)) return cache.get(key);
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        roughness: opts.roughness ?? 0.72,
        metalness: opts.metalness ?? 0.04,
        flatShading: opts.flatShading ?? false,
        transparent: opts.transparent ?? (opts.opacity !== undefined && opts.opacity < 1),
        opacity: opts.opacity ?? 1,
        emissive: opts.emissive ? new THREE.Color(opts.emissive) : new THREE.Color(0x000000),
        emissiveIntensity: opts.emissiveIntensity ?? (opts.emissive ? 0.65 : 0),
        side: opts.side ?? THREE.FrontSide,
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
    0.19,
    10,
    8,
    mats.get(isNight ? '#FEF08A' : '#F8FAFC', {
      roughness: 0.22,
      emissive: isNight ? '#FDE047' : null,
      emissiveIntensity: isNight ? 1.5 : 0,
    }),
    false,
    false
  );
  bulb.position.set(0.54, 2.82, 0);
  g.add(bulb);

  if (isNight) {
    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(1.8, 16),
      new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.2, depthWrite: false })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.set(0.54, 0.17, 0);
    g.add(glow);
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
    roughness: 0.16,
    metalness: 0.18,
    emissive: isNight ? '#FDE047' : null,
    emissiveIntensity: isNight ? 0.9 : 0,
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
    roughness: 0.15,
    metalness: 0.15,
    emissive: isNight ? '#FDE047' : null,
    emissiveIntensity: isNight ? 0.85 : 0,
  });

  if (type === 'supermarket') {
    const plinth = makeBox(THREE, 9.6, 0.85, 5.5, mats.get('#C2410C', { roughness: 0.7 }));
    plinth.position.set(0, 0.55, -0.3);
    const body = makeBox(THREE, 9.2, 4.1, 5.2, mats.get('#FFFDF5', { roughness: 0.76 }));
    body.position.set(0, 2.25, -0.3);
    const fascia = makeBox(THREE, 9.8, 1.15, 5.7, mats.get('#EA580C', { roughness: 0.5 }));
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
    const sideAccent = makeBox(THREE, 9.3, 0.7, 5.7, mats.get('#7C3AED', { roughness: 0.35, emissive: '#6D28D9', emissiveIntensity: 0.4 }));
    sideAccent.position.set(0, 5.1, -0.3);
    const marquee = makeBox(THREE, 8.2, 1.05, 0.72, mats.get('#F43F5E', { roughness: 0.3, emissive: '#E11D48', emissiveIntensity: 0.6 }));
    marquee.position.set(0, 4.45, 2.48);
    const screen = makeBox(THREE, 5.4, 1.85, 0.25, mats.get('#14B8A6', { roughness: 0.15, emissive: '#2DD4BF', emissiveIntensity: 0.55 }));
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
    const lawn = makeBox(THREE, 11.4, 0.18, 8.0, mats.get('#BBF7D0', { roughness: 0.88 }), false, true);
    lawn.position.set(0, 0.09, 0);
    const pond = makeCyl(THREE, 1.55, 1.65, 0.12, 16, mats.get('#38BDF8', { roughness: 0.18, metalness: 0.1 }), false, true);
    pond.position.set(2.4, 0.15, -0.6);
    g.add(lawn, pond);

    // Timber log palisade fence
    const postMat = mats.get('#92400E', { roughness: 0.84 });
    const railMat = mats.get('#B45309', { roughness: 0.82 });
    for (let fx = -4.9; fx <= 4.9; fx += 1.4) {
      if (Math.abs(fx) < 1.8) continue;
      const post = makeCyl(THREE, 0.16, 0.18, 1.35, 7, postMat);
      post.position.set(fx, 0.72, 3.3);
      g.add(post);
    }
    [-3.5, 3.5].forEach((rx) => {
      const hRail = makeBox(THREE, 2.8, 0.16, 0.14, railMat);
      hRail.position.set(rx, 0.95, 3.3);
      g.add(hRail);
    });

    const leftPillar = makeBox(THREE, 0.92, 4.0, 0.92, mats.get('#78350F', { roughness: 0.8 }));
    leftPillar.position.set(-2.5, 2.0, 2.4);
    const rightPillar = makeBox(THREE, 0.92, 4.0, 0.92, mats.get('#78350F', { roughness: 0.8 }));
    rightPillar.position.set(2.5, 2.0, 2.4);
    const archBeam = makeBox(THREE, 6.8, 1.1, 1.15, mats.get('#15803D', { roughness: 0.6 }));
    archBeam.position.set(0, 4.25, 2.4);
    const archTrim = makeBox(THREE, 7.1, 0.22, 1.25, mats.get('#FACC15', { roughness: 0.5 }));
    archTrim.position.set(0, 4.85, 2.4);
    g.add(leftPillar, rightPillar, archBeam, archTrim);

    // Giraffe + Cute Elephant inside Zoo compound!
    const gBody = makeBox(THREE, 0.9, 0.75, 1.35, mats.get('#FBBF24', { roughness: 0.7 }));
    gBody.position.set(-2.7, 1.1, -0.7);
    const gNeck = makeBox(THREE, 0.34, 1.85, 0.34, mats.get('#FBBF24', { roughness: 0.7 }));
    gNeck.position.set(-2.7, 2.25, -0.15);
    const gHead = makeBox(THREE, 0.5, 0.45, 0.68, mats.get('#F59E0B', { roughness: 0.7 }));
    gHead.position.set(-2.7, 3.15, 0.08);
    const eBody = makeSphere(THREE, 0.78, 10, 8, mats.get('#94A3B8', { roughness: 0.75 }));
    eBody.scale.set(1.0, 0.9, 1.25);
    eBody.position.set(0.3, 0.95, -1.2);
    const eTrunk = makeCyl(THREE, 0.1, 0.16, 0.85, 8, mats.get('#94A3B8', { roughness: 0.75 }));
    eTrunk.position.set(0.3, 0.85, -0.2);
    eTrunk.rotation.x = 0.55;
    g.add(gBody, gNeck, gHead, eBody, eTrunk);
  } else if (type === 'church') {
    // Clean Protestant Church: White sanctuary walls, pitched roof, ONLY "TIN LÀNH" sign on top + Cross above, NO pictures/statues
    const whiteMat = mats.get('#FFFFFF', { roughness: 0.65 });
    const trimMat = mats.get('#E2E8F0', { roughness: 0.7 });
    const slateRoofMat = mats.get('#334155', { roughness: 0.72 });
    const darkSignMat = mats.get('#0F172A', { roughness: 0.45 });
    const brassMat = mats.get('#FACC15', { roughness: 0.25, metalness: 0.65 });
    const doorWoodMat = mats.get('#78350F', { roughness: 0.72 });

    // Stone steps at front entrance
    const step1 = makeBox(THREE, 3.6, 0.22, 1.4, trimMat);
    step1.position.set(0, 0.18, 2.75);
    const step2 = makeBox(THREE, 3.0, 0.22, 0.9, trimMat);
    step2.position.set(0, 0.36, 2.45);
    g.add(step1, step2);

    // Main sanctuary hall
    const plinth = makeBox(THREE, 9.2, 0.52, 5.6, trimMat);
    plinth.position.set(0, 0.35, -0.35);
    const sanctuary = makeBox(THREE, 8.8, 4.3, 5.2, whiteMat);
    sanctuary.position.set(0, 2.35, -0.35);
    g.add(plinth, sanctuary);

    // Pitched triangular gable roof
    const gableRoof = makeCone(THREE, 4.9, 2.25, 4, slateRoofMat);
    gableRoof.rotation.y = Math.PI / 4;
    gableRoof.scale.set(1.42, 1.0, 0.92);
    gableRoof.position.set(0, 5.55, -0.35);
    g.add(gableRoof);

    // Clean front tower / peak supporting the "TIN LÀNH" sign & Cross
    const peakWall = makeBox(THREE, 3.4, 2.2, 2.0, whiteMat);
    peakWall.position.set(0, 5.35, 1.35);
    const peakCap = makeBox(THREE, 3.65, 0.24, 2.2, slateRoofMat);
    peakCap.position.set(0, 6.5, 1.35);
    g.add(peakWall, peakCap);

    // Plain double wooden entrance doors + clear frosted side lancet windows (zero images/icons)
    addRecessedDoor3D(THREE, mats, g, 0, 1.55, 2.25, 1.95, 2.35, darkSignMat, doorWoodMat);
    [-2.85, 2.85].forEach((wx) => addFramedWindow3D(THREE, mats, g, wx, 2.35, 2.25, 1.15, 2.1, slateRoofMat, winMat));

    // Signboard on top peak: ONLY the 2 words "TIN LÀNH"
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 512;
    signCanvas.height = 128;
    const sCtx = signCanvas.getContext('2d');
    if (sCtx) {
      sCtx.fillStyle = '#0F172A';
      sCtx.fillRect(0, 0, 512, 128);
      sCtx.strokeStyle = '#FACC15';
      sCtx.lineWidth = 6;
      sCtx.strokeRect(8, 8, 496, 112);
      sCtx.fillStyle = '#FACC15';
      sCtx.font = 'bold 68px sans-serif';
      sCtx.textAlign = 'center';
      sCtx.textBaseline = 'middle';
      sCtx.fillText('TIN LÀNH', 256, 66);
    }
    const signTex = new THREE.CanvasTexture(signCanvas);
    signTex.colorSpace = THREE.SRGBColorSpace;
    const signPlateMat = new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.35 });
    const signBack = makeBox(THREE, 3.45, 0.92, 0.22, darkSignMat);
    signBack.position.set(0, 7.08, 1.55);
    const signFront = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 0.82), signPlateMat);
    signFront.position.set(0, 7.08, 1.67);
    const signRear = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 0.82), signPlateMat);
    signRear.rotation.y = Math.PI;
    signRear.position.set(0, 7.08, 1.43);
    g.add(signBack, signFront, signRear);

    // Plain Golden Cross (Thập tự giá) directly above "TIN LÀNH"
    const crossVert = makeBox(THREE, 0.24, 1.75, 0.22, brassMat);
    crossVert.position.set(0, 8.42, 1.55);
    const crossHoriz = makeBox(THREE, 1.15, 0.24, 0.22, brassMat);
    crossHoriz.position.set(0, 8.72, 1.55);
    g.add(crossVert, crossHoriz);
  }
  return g;
}

/**
 * Dựng 4 khu vực ngoài trời: Công viên Tiếng Anh, Đài Phun Nước, Góc Đọc Sách, Sân Bóng Đá
 */
function buildOutdoorLandmark3D(THREE, mats, type, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  if (type === 'eng_park') {
    const plaza = makeCyl(THREE, 4.0, 4.15, 0.16, 20, mats.get('#FEF08A', { roughness: 0.85 }), false, true);
    plaza.position.y = 0.08;
    const boardPostL = makeBox(THREE, 0.22, 2.3, 0.22, mats.get('#854D0E', { roughness: 0.85 }));
    boardPostL.position.set(-1.55, 1.15, -0.7);
    const boardPostR = makeBox(THREE, 0.22, 2.3, 0.22, mats.get('#854D0E', { roughness: 0.85 }));
    boardPostR.position.set(1.55, 1.15, -0.7);
    const boardFrame = makeBox(THREE, 3.85, 1.75, 0.22, mats.get('#B45309', { roughness: 0.7 }));
    boardFrame.position.set(0, 1.95, -0.7);
    const board = makeBox(THREE, 3.45, 1.4, 0.28, mats.get('#15803D', { roughness: 0.65 }));
    board.position.set(0, 1.95, -0.7);
    const bench = buildParkBench3D(THREE, mats, 0, 1.55, 0);
    g.add(plaza, boardPostL, boardPostR, boardFrame, board, bench);
  } else if (type === 'fountain_plaza') {
    const plaza = makeCyl(THREE, 6.4, 6.6, 0.16, 24, mats.get('#FDEBD0', { roughness: 0.85 }), false, true);
    plaza.position.y = 0.08;
    const basinOuter = makeCyl(THREE, 3.0, 3.2, 0.62, 16, mats.get('#CBD5E1', { roughness: 0.65 }));
    basinOuter.position.y = 0.38;
    const water = makeCyl(THREE, 2.65, 2.65, 0.5, 16, mats.get('#38BDF8', { roughness: 0.12, metalness: 0.15, transparent: true, opacity: 0.86 }));
    water.position.y = 0.42;
    const bowl = makeCyl(THREE, 1.25, 0.55, 0.42, 14, mats.get('#E2E8F0', { roughness: 0.58 }));
    bowl.position.y = 1.65;
    const spire = makeCyl(THREE, 0.36, 0.65, 2.0, 12, mats.get('#E2E8F0', { roughness: 0.6 }));
    spire.position.y = 1.2;
    const spray = makeSphere(THREE, 0.65, 10, 8, mats.get('#E0F2FE', { roughness: 0.2, transparent: true, opacity: 0.85 }));
    spray.position.y = 2.65;
    g.userData.waterSpray = spray;
    g.add(plaza, basinOuter, water, bowl, spire, spray);
    [0, Math.PI / 2, Math.PI, -Math.PI / 2].forEach((ang) => {
      g.add(buildParkBench3D(THREE, mats, Math.sin(ang) * 4.55, Math.cos(ang) * 4.55, ang));
    });
  } else if (type === 'reading_corner') {
    const deck = makeBox(THREE, 11.4, 0.18, 7.0, mats.get('#E6FFFA', { roughness: 0.85 }), false, true);
    deck.position.y = 0.09;
    const shelf = makeBox(THREE, 3.4, 2.5, 0.72, mats.get('#78350F', { roughness: 0.78 }));
    shelf.position.set(-2.5, 1.32, -1.6);
    const table = makeBox(THREE, 2.3, 0.75, 1.45, mats.get('#D97706', { roughness: 0.75 }));
    table.position.set(1.8, 0.46, 0.3);
    const openBook = makeBox(THREE, 0.95, 0.14, 0.62, mats.get('#FEF3C7', { roughness: 0.6 }));
    openBook.position.set(1.8, 0.9, 0.3);
    const bench = buildParkBench3D(THREE, mats, 1.8, 1.85, 0);
    g.add(deck, shelf, table, openBook, bench);
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
    const floodMat = mats.get('#FEF9C3', { emissive: '#FEF08A', emissiveIntensity: 0.9 });
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
function buildVehicle3D(THREE, mats, carData) {
  const g = new THREE.Group();
  const kind = carData.kind || 'car';
  const bodyMat = mats.get(carData.color || '#FF6B6B', { roughness: 0.36, metalness: 0.16 });
  const tireMat = mats.get('#0F172A', { roughness: 0.85 });
  const rimMat = mats.get('#E2E8F0', { roughness: 0.28, metalness: 0.65 });
  const glassMat = mats.get('#BAE6FD', { roughness: 0.12, metalness: 0.22 });
  const bumperMat = mats.get('#CBD5E1', { roughness: 0.4, metalness: 0.35 });
  const headLightMat = mats.get('#FEF08A', { emissive: '#FDE047', emissiveIntensity: 0.85 });
  const tailLightMat = mats.get('#EF4444', { emissive: '#DC2626', emissiveIntensity: 0.65 });

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

  if (kind === 'bus') {
    const skirt = makeBox(THREE, 4.05, 0.25, 1.68, bumperMat);
    skirt.position.y = 0.38;
    const hull = makeBox(THREE, 3.9, 1.48, 1.58, bodyMat);
    hull.position.y = 1.15;
    const roofTrim = makeBox(THREE, 3.6, 0.14, 1.38, mats.get('#FFFFFF', { roughness: 0.5 }));
    roofTrim.position.y = 1.94;
    const sideWin = makeBox(THREE, 3.25, 0.62, 1.62, glassMat);
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
    g.add(chassis, cargo, cargoStripe, cab, cabGlass, bumper, hl);
    [-1.18, 1.18].forEach((wx) => [-0.78, 0.78].forEach((wz) => addWheel(wx, wz, 0.36, 0.24)));
  } else if (kind === 'moto' || kind === 'bike') {
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
    g.add(frame, seat, fork, handleBar, lamp, riderBody, riderArm, helm, visor);
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

  return g;
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

  // ==================== SOFT SCULPTED NATURAL HAIRSTYLES (12 STYLES) ====================
  const hStyle = member.hairStyle || 'short';
  const hairCap = makeSphere(THREE, 0.495, 20, 14, hairMat);
  hairCap.scale.set(1.09, 0.94, 1.06);
  hairCap.position.set(0, 0.095, -0.045);
  headGroup.add(hairCap);

  // Temple sideburns framing both cheeks smoothly (replaces boxy sides)
  [-0.42, 0.42].forEach((tx) => {
    const temple = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.18, 6, 10), hairMat);
    temple.position.set(tx, 0.08, 0.14);
    temple.rotation.z = tx < 0 ? 0.16 : -0.16;
    temple.rotation.x = 0.14;
    headGroup.add(temple);
  });

  // Helper to build flowing arched bang locks (zero boxes!)
  const addSoftBangLock = (bx, by, bz, len, r, rz, rx = 0.25) => {
    const lock = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 10), hairMat);
    lock.position.set(bx, by, bz);
    lock.rotation.set(rx, 0, rz);
    lock.castShadow = true;
    headGroup.add(lock);
  };

  if (hStyle === 'sidepart') {
    const sweepCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.34, 0.22, 0.34),
      new THREE.Vector3(-0.06, 0.34, 0.39),
      new THREE.Vector3(0.24, 0.32, 0.35),
      new THREE.Vector3(0.4, 0.18, 0.21),
    ]);
    const sweep = new THREE.Mesh(new THREE.TubeGeometry(sweepCurve, 14, 0.11, 8, false), hairMat);
    sweep.castShadow = true;
    headGroup.add(sweep);
    addSoftBangLock(-0.2, 0.27, 0.36, 0.18, 0.08, -0.58);
  } else if (hStyle === 'undercut') {
    const quiffCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.14, 0.38, -0.18),
      new THREE.Vector3(-0.02, 0.5, 0.08),
      new THREE.Vector3(0.1, 0.44, 0.34),
    ]);
    const quiff = new THREE.Mesh(new THREE.TubeGeometry(quiffCurve, 12, 0.18, 10, false), hairMat);
    quiff.scale.set(1.25, 0.88, 1.0);
    quiff.castShadow = true;
    headGroup.add(quiff);
  } else {
    // Natural feathered curved forehead fringe
    addSoftBangLock(-0.22, 0.27, 0.34, 0.16, 0.085, -0.45);
    addSoftBangLock(0, 0.31, 0.38, 0.2, 0.092, Math.PI / 2);
    addSoftBangLock(0.22, 0.27, 0.34, 0.16, 0.085, 0.45);
  }

  if (hStyle === 'short') {
    const backNape = makeSphere(THREE, 0.38, 14, 10, hairMat);
    backNape.scale.set(1.12, 0.68, 0.72);
    backNape.position.set(0, -0.05, -0.26);
    headGroup.add(backNape);
  } else if (hStyle === 'spiky') {
    [
      [-0.24, 0.48, 0.06, -0.42, 0.12],
      [-0.08, 0.59, 0.14, -0.12, 0.14],
      [0.12, 0.59, 0.12, 0.16, 0.135],
      [0.26, 0.48, 0.04, 0.44, 0.12],
      [0, 0.55, -0.16, 0, 0.13],
    ].forEach(([sx, sy, sz, rz, rad]) => {
      const tuft = new THREE.Mesh(new THREE.ConeGeometry(rad, 0.34, 10), hairMat);
      tuft.position.set(sx, sy, sz);
      tuft.rotation.set(0.15, 0, -rz);
      tuft.castShadow = true;
      headGroup.add(tuft);
    });
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

  // Stage 4 legendary aura ring on ground
  if (pet.hatched && pet.stage >= 4) {
    const auraMat = mats.get('#FACC15', {
      emissive: '#F59E0B',
      emissiveIntensity: 0.65,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
    });
    const auraRing = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.7, 24), auraMat);
    auraRing.rotation.x = -Math.PI / 2;
    auraRing.position.y = 0.05;
    root.add(auraRing);
    root.userData.auraRing = auraRing;
  }

  const actor = new THREE.Group();
  actor.scale.setScalar(scale);
  root.add(actor);
  root.userData.actor = actor;

  const c1Mat = mats.get(resolvedColors.primary, { roughness: 0.58 });
  const c2Mat = mats.get(resolvedColors.accent, { roughness: 0.62 });
  const whiteMat = mats.get('#FFFFFF', { roughness: 0.62 });
  const creamMat = mats.get('#FEF3C7', { roughness: 0.58 });
  const darkMat = mats.get('#1E293B', { roughness: 0.35 });
  const eyeMat = mats.get('#0F172A', { roughness: 0.12 });
  const pinkMat = mats.get('#F9A8D4', { roughness: 0.55 });
  const goldMat = mats.get('#FACC15', { roughness: 0.25, metalness: 0.55 });
  const flameMat = mats.get('#FB923C', { roughness: 0.38, emissive: '#EA580C', emissiveIntensity: 0.45 });

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
    const wingMemMat = mats.get('#FB923C', { roughness: 0.36, emissive: '#EA580C', emissiveIntensity: 0.38, side: THREE.DoubleSide });
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
        // Xương cánh trên
        const armLen = wingSpan * 0.58;
        const arm = makeCyl(THREE, 0.036, 0.028, armLen, 6, c1Mat);
        arm.rotation.z = -Math.PI * 0.38;
        arm.position.set(armLen * 0.44, armLen * 0.22, 0);
        const elbow = makeSphere(THREE, 0.048, 7, 6, goldMat);
        elbow.position.set(armLen * 0.88, armLen * 0.44, 0);
        const thumbClaw = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.11, 5), goldMat);
        thumbClaw.position.set(armLen * 0.9, armLen * 0.54, 0.02);
        // Nan xương ngoài cùng
        const tipLen = wingSpan * 0.62;
        const tipBone = makeCyl(THREE, 0.028, 0.016, tipLen, 6, c1Mat);
        tipBone.rotation.z = -Math.PI * 0.56;
        tipBone.position.set(armLen * 0.86 + tipLen * 0.48, armLen * 0.4, 0);
        // 2 nan xương xòe màng
        const rib1 = makeCyl(THREE, 0.02, 0.012, wingChord * 0.82, 5, c1Mat);
        rib1.rotation.z = -0.58;
        rib1.position.set(armLen * 0.86, armLen * 0.16, 0);
        const rib2 = makeCyl(THREE, 0.018, 0.01, wingChord * 0.68, 5, c1Mat);
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
    // Gấu trúc tròn mập trắng-đen với bệt mắt đen, má hồng, băng trán dải bay & gậy tre có đốt và lá xanh
    const body = makeSphere(THREE, 0.42, 14, 10, whiteMat);
    body.scale.set(1.04, 1.0, 1.15);
    body.position.set(0, 0.48, 0);
    const chestBand = makeCyl(THREE, 0.36, 0.4, 0.22, 12, darkMat);
    chestBand.position.set(0, 0.62, 0.02);
    addLegs(darkMat, darkMat, 0.15, 0.24, 0.21, 0.22, -0.22);

    const head = makeSphere(THREE, 0.38, 14, 10, whiteMat);
    head.scale.set(1.08, 0.96, 1.0);
    head.position.set(0, 0.96, 0.2);
    [-0.28, 0.28].forEach((ex) => {
      const ear = makeSphere(THREE, 0.13, 8, 8, darkMat);
      ear.position.set(ex, 1.28, 0.16);
      actor.add(ear);
    });
    // Đốm mắt đen đặc trưng của gấu trúc + má hồng
    [-0.14, 0.14].forEach((ex) => {
      const patch = makeSphere(THREE, 0.11, 10, 8, darkMat);
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
    const nose = makeSphere(THREE, 0.055, 8, 6, darkMat);
    nose.position.set(0, 0.89, 0.58);
    const tail = makeSphere(THREE, 0.11, 8, 6, darkMat);
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

    // Cánh chim lửa 2 lớp lông vũ điêu khắc lộng lẫy + vỗ cánh mượt
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
        const joint = makeSphere(THREE, 0.085, 8, 6, goldMat);
        const outer = new THREE.Mesh(phOuterGeo, stage >= 2 ? goldMat : c1Mat);
        const inner = new THREE.Mesh(phMidGeo, flameMat);
        inner.position.set(0.02, 0.03, 0.012);
        holder.add(joint, outer, inner);
      },
    });

    // Đuôi dải lụa lửa 3 nhánh uốn lượn
    const tailRibbonGeo = getTeardropFeatherGeo(THREE, 0.72, 0.15, 0.036);
    [-0.3, 0, 0.3].forEach((ang, idx) => {
      const plume = new THREE.Mesh(tailRibbonGeo, idx === 1 ? goldMat : flameMat);
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

  // ==================== VƯƠNG MIỆN CẤP 4 & 6 PHỤ KIỆN THÚ CƯNG ====================
  const acc = pet.accessoryId;
  if (pet.stage >= 4 || acc === 'pacc_crown') {
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

  if (isNight) {
    const warmLight = new THREE.PointLight(0xffe8a3, 1.35, 50);
    warmLight.position.set(hallX, 6.5, H * 0.52);
    group.add(warmLight);
  }

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
  const lampShade = makeCyl(THREE, 0.3, 0.48, 0.5, 10, mats.get('#FDE047', { emissive: '#FACC15', emissiveIntensity: 0.45 }));
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
    pmrem.dispose();
  }

  // OrthographicCamera locked at 45° Isometric angle
  const baseHalfH = 14.5;
  const aspect = window.innerWidth / Math.max(1, window.innerHeight);
  const camera = new THREE.OrthographicCamera(
    -baseHalfH * aspect,
    baseHalfH * aspect,
    baseHalfH,
    -baseHalfH,
    -220,
    450
  );

  // Studio / Outdoor 3-point balanced lighting (high contrast, zero highlight wash-out)
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

  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy?.() || 1);
  const textures = createProceduralTextures(THREE, maxAniso);
  const mats = createMaterialCache(THREE);

  // Groups for clean scene switching
  const worldGroup = new THREE.Group();
  const actorsGroup = new THREE.Group();
  const vehiclesGroup = new THREE.Group();
  const weatherGroup = new THREE.Group();
  scene.add(worldGroup, actorsGroup, vehiclesGroup, weatherGroup);

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

  // Cached Scrolling LED Billboard CanvasTexture (RepeatWrapping offset animated per frame, ZERO redraw!)
  const ledCanvas = document.createElement('canvas');
  ledCanvas.width = 1024;
  ledCanvas.height = 128;
  const ledCtx = ledCanvas.getContext('2d');
  ledCtx.fillStyle = '#0B1221';
  ledCtx.fillRect(0, 0, 1024, 128);
  ledCtx.fillStyle = '#1E293B';
  for (let gx = 4; gx < 1024; gx += 12) {
    for (let gy = 4; gy < 128; gy += 12) {
      ledCtx.fillRect(gx, gy, 3, 3);
    }
  }
  ledCtx.font = 'bold 42px sans-serif';
  ledCtx.textAlign = 'left';
  ledCtx.textBaseline = 'middle';
  ledCtx.fillStyle = '#FACC15';
  ledCtx.fillText('★★★ Hãy đến Trung Tâm Tiếng Anh để làm bài và đổi điểm ngay nào!!!   ', 18, 66);
  const ledAdTex = new THREE.CanvasTexture(ledCanvas);
  ledAdTex.wrapS = THREE.RepeatWrapping;
  ledAdTex.wrapT = THREE.ClampToEdgeWrapping;
  ledAdTex.repeat.set(0.62, 1);
  ledAdTex.colorSpace = THREE.SRGBColorSpace;
  ledAdTex.anisotropy = maxAniso;

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

    const W = 2520 * WORLD_SCALE; // 126
    const H = 1700 * WORLD_SCALE; // 85
    const wCond = weather?.condition || 'clear';
    const brand = (state.familyName || 'B2KS').trim() || 'B2KS';

    // Extended pasture perimeter (so map never floats in empty void!)
    const outerGrass = new THREE.Mesh(
      new THREE.PlaneGeometry(340, 280),
      new THREE.MeshStandardMaterial({
        map: textures.grassTex,
        color: wCond === 'snow' ? new THREE.Color('#D1FAE5') : new THREE.Color('#FFFFFF'),
        roughness: 0.92,
      })
    );
    outerGrass.rotation.x = -Math.PI / 2;
    outerGrass.position.set(W / 2, 0, H / 2);
    outerGrass.receiveShadow = true;
    grp.add(outerGrass);

    // Distant rolling pastel hills along the northern & side horizon
    const hillMat = mats.get(PASTEL_PALETTE.hillFar, { roughness: 0.9, flatShading: true });
    [
      [15, -14, 18, 8],
      [48, -16, 22, 10],
      [85, -15, 20, 9],
      [118, -14, 17, 7],
      [-16, 30, 14, 7],
      [W + 16, 45, 15, 7],
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

    // Sidewalks (warm light-brown brick paving) & Asphalt Roads
    const swHorizMat = new THREE.MeshStandardMaterial({
      map: textures.sidewalkTex,
      roughness: 0.84,
      metalness: 0.02,
    });
    const swVertMat = new THREE.MeshStandardMaterial({
      map: textures.sidewalkVTex,
      roughness: 0.84,
      metalness: 0.02,
    });
    const roadMat = mats.get(PASTEL_PALETTE.asphalt, { roughness: 0.88 });
    const yellowLineMat = mats.get(PASTEL_PALETTE.roadLine, { roughness: 0.55 });
    const whiteStripeMat = mats.get(PASTEL_PALETTE.crosswalk, { roughness: 0.65 });

    const hRoads = [
      { y: 465, h: 130, swTop: 415, swBot: 595 },
      { y: 1025, h: 130, swTop: 975, swBot: 1155 },
    ];
    const vRoad = { x: 1180, w: 130, swLeft: 1130, swRight: 1310 };

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

    // Vertical Road
    const vSwD = (1700 - 225) * WORLD_SCALE;
    const vSw = makeBox(THREE, (vRoad.w + 100) * WORLD_SCALE, 0.16, vSwD, swVertMat, false, true);
    vSw.position.set((vRoad.swLeft + (vRoad.w + 100) / 2) * WORLD_SCALE, 0.06, (225 + (1700 - 225) / 2) * WORLD_SCALE);
    grp.add(vSw);

    const vRd = makeBox(THREE, vRoad.w * WORLD_SCALE, 0.06, vSwD, roadMat, false, true);
    vRd.position.set((vRoad.x + vRoad.w / 2) * WORLD_SCALE, 0.148, (225 + (1700 - 225) / 2) * WORLD_SCALE);
    grp.add(vRd);

    for (let dz = 13.0; dz < H - 2; dz += 3.6) {
      const dash = makeBox(THREE, 0.24, 0.02, 1.8, yellowLineMat, false, false);
      dash.position.set((vRoad.x + vRoad.w / 2) * WORLD_SCALE, 0.182, dz);
      grp.add(dash);
    }

    // Crosswalks at intersections
    hRoads.forEach((r) => {
      for (let zy = r.y + 14; zy < r.y + r.h - 10; zy += 22) {
        const c1 = makeBox(THREE, 1.2, 0.02, 0.48, whiteStripeMat, false, false);
        c1.position.set((vRoad.x - 18) * WORLD_SCALE, 0.185, zy * WORLD_SCALE);
        const c2 = makeBox(THREE, 1.2, 0.02, 0.48, whiteStripeMat, false, false);
        c2.position.set((vRoad.x + vRoad.w + 18) * WORLD_SCALE, 0.185, zy * WORLD_SCALE);
        grp.add(c1, c2);
      }
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
    const houseOv = state.buildingLayouts?.house;
    plots.forEach((p, idx) => {
      if (idx === state.house.plotIndex && !houseOv) {
        const house3d = buildTownhouse3D(THREE, mats, p.x * WORLD_SCALE, p.y * WORLD_SCALE, state.house.style, 'classic', lighting.isNight);
        grp.add(house3d);
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
      const house3d = buildTownhouse3D(THREE, mats, hLoc.x * WORLD_SCALE, (hLoc.y - 85) * WORLD_SCALE, state.house.style, hLoc.shape, lighting.isNight);
      grp.add(house3d);
      labelTargets.push({ x: hLoc.x * WORLD_SCALE, y: 12.2, z: (hLoc.y - 85) * WORLD_SCALE, text: `🏡 Nhà Phố ${brand}`, kind: 'building' });
    }

    // 10 Shop / Facility Buildings
    const shopDefs = [
      { id: 'supermarket', fx: 1560, fy: 410, type: 'supermarket', title: `🏪 Siêu Thị ${brand}` },
      { id: 'cross_world', fx: 1980, fy: 410, type: 'cross_world', title: '🌌 Trung Tâm Xuyên Thế Giới' },
      { id: 'pet_shop', fx: 2345, fy: 410, type: 'pet_shop', title: `🐾 Cửa Hàng Thú Cưng ${brand}` },
      { id: 'arcade', fx: 950, fy: 790, type: 'arcade', title: '🕹️ Khu Vui Chơi Online (1⭐)' },
      { id: 'lab', fx: 1540, fy: 790, type: 'lab', title: `🧪 Phòng Thí Nghiệm ${brand}` },
      { id: 'flea_market', fx: 1980, fy: 790, type: 'flea_market', title: `🎪 Chợ Trời ${brand}` },
      { id: 'english_center', fx: 250, fy: 925, type: 'english', title: `🎓 Trung Tâm Tiếng Anh ${brand}` },
      { id: 'fashion', fx: 600, fy: 945, type: 'fashion', title: '👗 Cửa Hàng Thời Trang' },
      { id: 'salon', fx: 1760, fy: 975, type: 'salon', title: '💇 Salon Tóc Nghệ Thuật' },
      { id: 'church', fx: 2345, fy: 955, type: 'church', title: 'TIN LÀNH' },
      { id: 'zoo', fx: 820, fy: 1485, type: 'zoo', title: `🦁 Sở Thú Ảo ${brand} Zoo` },
    ];
    shopDefs.forEach((sd) => {
      const loc = getLoc(sd.id, sd.fx, sd.fy);
      const b = buildShopBuilding3D(THREE, mats, loc.x * WORLD_SCALE, (loc.y - 65) * WORLD_SCALE, sd.type, loc.shape, lighting.isNight);
      grp.add(b);
      animatedProps.push(b);
      labelTargets.push({ x: loc.x * WORLD_SCALE, y: 6.8, z: (loc.y - 65) * WORLD_SCALE, text: sd.title, kind: 'building' });
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
    grp.add(buildOutdoorLandmark3D(THREE, mats, 'eng_park', engPark.x * WORLD_SCALE, (engPark.y - 70) * WORLD_SCALE));
    labelTargets.push({ x: engPark.x * WORLD_SCALE, y: 4.1, z: (engPark.y - 70) * WORLD_SCALE, text: '💬 Công Viên Tiếng Anh', kind: 'building' });

    const plaza = getLoc('fountain_plaza', 280, 1420);
    const plazaMesh = buildOutdoorLandmark3D(THREE, mats, 'fountain_plaza', plaza.x * WORLD_SCALE, plaza.y * WORLD_SCALE);
    grp.add(plazaMesh);
    animatedProps.push(plazaMesh);
    labelTargets.push({ x: plaza.x * WORLD_SCALE, y: 4.2, z: plaza.y * WORLD_SCALE, text: `⛲ Quảng Trường ${brand}`, kind: 'building' });

    const reading = getLoc('reading_corner', 1540, 1400);
    grp.add(buildOutdoorLandmark3D(THREE, mats, 'reading_corner', reading.x * WORLD_SCALE, reading.y * WORLD_SCALE));
    labelTargets.push({ x: reading.x * WORLD_SCALE, y: 3.8, z: reading.y * WORLD_SCALE, text: '📚 Góc Đọc Sách', kind: 'building' });

    const soccer = getLoc('soccer', 2060, 1400);
    const soccerMesh = buildOutdoorLandmark3D(THREE, mats, 'soccer', soccer.x * WORLD_SCALE, soccer.y * WORLD_SCALE);
    grp.add(soccerMesh);
    animatedProps.push(soccerMesh);
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

    // 20 Trees + perimeter grove
    const treeCoords = [
      [60, 290, 'sakura'], [285, 290, 'pine'], [490, 315, 'orange'], [640, 320, 'oak'], [1065, 310, 'sakura'],
      [1365, 300, 'pine'], [1760, 315, 'orange'], [2180, 330, 'palm'], [80, 730, 'oak'], [420, 685, 'sakura'],
      [770, 745, 'pine'], [1360, 740, 'orange'], [2185, 760, 'palm'], [90, 1290, 'sakura'], [560, 1340, 'oak'],
      [1080, 1360, 'pine'], [1350, 1290, 'orange'], [2340, 1490, 'palm'], [1830, 1320, 'sakura'], [2468, 780, 'oak'],
    ];
    treeCoords.forEach(([tx, ty, tk]) => {
      const tree = buildTree3D(THREE, mats, tk, tx * WORLD_SCALE, ty * WORLD_SCALE, true);
      grp.add(tree);
      animatedProps.push(tree);
    });

    // Perimeter scenic trees outside fence
    for (let px = 120; px < 2450; px += 220) {
      grp.add(buildTree3D(THREE, mats, px % 440 === 120 ? 'pine' : 'oak', px * WORLD_SCALE, 140 * WORLD_SCALE, false));
    }

    // Flower clusters
    const flowerSpots = [
      [100, 325, '#F43F5E', 'tulip'], [255, 385, '#FACC15', 'sunflower'], [430, 395, '#EC4899', 'hibiscus'],
      [580, 385, '#A855F7', 'lavender'], [1030, 385, '#FFFFFF', 'daisy'], [1380, 360, '#A855F7', 'lavender'],
      [1780, 385, '#F59E0B', 'sunflower'], [2160, 385, '#F43F5E', 'tulip'], [140, 1340, '#EC4899', 'hibiscus'],
      [430, 1470, '#FACC15', 'sunflower'], [620, 1320, '#FFFFFF', 'daisy'], [1040, 1240, '#F43F5E', 'tulip'],
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
    ].forEach(([bx, by, rot]) => {
      grp.add(buildParkBench3D(THREE, mats, bx * WORLD_SCALE, by * WORLD_SCALE, rot));
    });

    // Street Lamps
    const lampX = [250, 680, 1080, 1420, 1820, 2205];
    [425, 985].forEach((ly) => {
      lampX.forEach((lx) => {
        grp.add(buildStreetLamp3D(THREE, mats, lx * WORLD_SCALE, ly * WORLD_SCALE, lighting.isNight));
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

    // Tall Scrolling LED Ad Billboard at main intersection SE corner
    const adGroup = new THREE.Group();
    adGroup.position.set(1382 * WORLD_SCALE, 0, 620 * WORLD_SCALE);
    adGroup.rotation.y = Math.PI * 0.25;
    const adSteel = mats.get('#334155', { roughness: 0.42, metalness: 0.4 });
    const adPed = makeBox(THREE, 5.8, 0.3, 1.5, mats.get('#64748B', { roughness: 0.7 }));
    adPed.position.y = 0.15;
    [-2.4, 2.4].forEach((px) => {
      const pole = makeCyl(THREE, 0.2, 0.24, 6.4, 10, adSteel);
      pole.position.set(px, 3.2, 0);
      adGroup.add(pole);
    });
    const adHousing = makeBox(THREE, 8.6, 2.1, 0.45, mats.get('#0F172A', { roughness: 0.35 }));
    adHousing.position.y = 5.45;
    const adBorder = makeBox(THREE, 8.85, 2.32, 0.3, mats.get('#F59E0B', { roughness: 0.3, emissive: '#F59E0B', emissiveIntensity: 0.25 }));
    adBorder.position.y = 5.45;
    const adScreen = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 1.72), new THREE.MeshBasicMaterial({ map: ledAdTex }));
    adScreen.position.set(0, 5.45, 0.235);
    adGroup.add(adPed, adBorder, adHousing, adScreen);
    grp.add(adGroup);

    return grp;
  }

  // Camera state (Isometric 45° + smooth damping)
  const camState = {
    targetX: 43,
    targetZ: 21,
    panX: 0,
    panZ: 0,
    yaw: Math.PI / 4, // 45° azimuth
    targetYaw: Math.PI / 4,
    pitch: Math.PI / 4, // 45° elevation tilt
    targetPitch: Math.PI / 4,
    zoom: 1.0,
    targetZoom: 1.0,
  };

  const raycaster = new THREE.Raycaster();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const ndcVec = new THREE.Vector2();
  const hitVec = new THREE.Vector3();
  const projVec = new THREE.Vector3();

  function raycastGround(clientX, clientY) {
    const rect = canvasEl.getBoundingClientRect();
    ndcVec.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    ndcVec.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndcVec, camera);
    const hit = raycaster.ray.intersectPlane(groundPlane, hitVec);
    if (!hit) return null;
    return { x2d: hit.x / WORLD_SCALE, y2d: hit.z / WORLD_SCALE };
  }

  function resize() {
    const w = window.innerWidth;
    const h = Math.max(1, window.innerHeight);
    const asp = w / h;
    camera.left = -baseHalfH * asp;
    camera.right = baseHalfH * asp;
    camera.top = baseHalfH;
    camera.bottom = -baseHalfH;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
  }

  function updateAtmosphere(lighting, weather, sceneName) {
    const wCond = weather?.condition || 'clear';
    let skyCol = PASTEL_PALETTE.skyDay;
    let sunCol = '#FFF3D6';
    let sunInt = 1.34;
    let hemiInt = 0.58;

    if (sceneName !== 'neighborhood') {
      skyCol = '#172338';
      sunInt = lighting.isNight ? 0.92 : 1.28;
      hemiInt = 0.56;
    } else if (lighting.phase === 'night') {
      skyCol = PASTEL_PALETTE.skyNight;
      sunCol = '#93C5FD';
      sunInt = 0.58;
      hemiInt = 0.42;
    } else if (lighting.phase === 'dawn') {
      skyCol = PASTEL_PALETTE.skyDawn;
      sunCol = '#FDBA74';
      sunInt = 1.12;
      hemiInt = 0.52;
    } else if (lighting.phase === 'sunset') {
      skyCol = PASTEL_PALETTE.skySunset;
      sunCol = '#FB923C';
      sunInt = 1.08;
      hemiInt = 0.5;
    } else if (wCond === 'rain' || wCond === 'thunder') {
      skyCol = PASTEL_PALETTE.skyRain;
      sunInt = 0.85;
      hemiInt = 0.54;
    }

    scene.background.set(skyCol);
    scene.fog.color.set(skyCol);
    scene.fog.near = wCond === 'fog' ? 35 : 95;
    scene.fog.far = wCond === 'fog' ? 110 : 225;
    sunLight.color.set(sunCol);
    sunLight.intensity = sunInt;
    hemiLight.intensity = hemiInt;

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

    updateAtmosphere(lighting, weather, me.scene);
    updateLeaderBoardTexture(kidsLeaderboard, (state.familyName || 'B2KS').trim() || 'B2KS');
    ledAdTex.offset.x = (nowMs * 0.00018) % 1;

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
    const worldSig = `${me.scene}|${lighting.isNight ? 'N' : 'D'}|${roomSig}`;

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
        obj.userData.waterSpray.position.y = 2.4 + Math.sin(nowMs * 0.007) * 0.25;
      }
      if (obj.userData.soccerBall) {
        obj.userData.soccerBall.position.x = Math.sin(nowMs * 0.0025) * 1.6;
        obj.userData.soccerBall.position.y = 0.45 + Math.abs(Math.sin(nowMs * 0.005)) * 0.25;
      }
    });

    // 3. Update & render 3D Vehicles in neighborhood
    vehiclesGroup.visible = me.scene === 'neighborhood';
    if (me.scene === 'neighborhood') {
      streetCars.forEach((car, idx) => {
        if (car.axis === 'h') {
          car.x += car.speed;
          if (car.x > 2520 + 110) car.x = -110;
          if (car.x < -110) car.x = 2520 + 110;
        } else {
          car.y += car.speed;
          if (car.y > 1700 + 110) car.y = 220;
          if (car.y < 220) car.y = 1700 + 110;
        }
        const key = `car_${idx}`;
        let mesh = vehicleMeshes.get(key);
        if (!mesh) {
          mesh = buildVehicle3D(THREE, mats, car);
          vehicleMeshes.set(key, mesh);
          vehiclesGroup.add(mesh);
        }
        mesh.position.set(car.x * WORLD_SCALE, 0.17, car.y * WORLD_SCALE);
        mesh.rotation.y = car.axis === 'h' ? (car.dir > 0 ? 0 : Math.PI) : car.dir > 0 ? -Math.PI / 2 : Math.PI / 2;
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
        const bounce = isMoving ? Math.abs(Math.sin(nowMs * 0.012)) * 0.25 : Math.sin(nowMs * 0.004) * 0.08;
        pEntry.mesh.userData.actor.position.y = bounce;
        if (pEntry.mesh.userData.auraRing) {
          pEntry.mesh.userData.auraRing.rotation.z = nowMs * 0.0022;
          pEntry.mesh.userData.auraRing.scale.setScalar(1 + Math.sin(nowMs * 0.005) * 0.08);
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

    // 6. Camera follow + smooth exponential damping (Isometric 45°)
    const followX = me.x * WORLD_SCALE + camState.panX;
    const followZ = me.y * WORLD_SCALE + camState.panZ;
    camState.targetX = THREE.MathUtils.damp(camState.targetX, followX, 10, deltaSec);
    camState.targetZ = THREE.MathUtils.damp(camState.targetZ, followZ, 10, deltaSec);
    camState.yaw = THREE.MathUtils.damp(camState.yaw, camState.targetYaw, 10, deltaSec);
    camState.pitch = THREE.MathUtils.damp(camState.pitch, camState.targetPitch, 10, deltaSec);
    camState.zoom = THREE.MathUtils.damp(camState.zoom, camState.targetZoom, 12, deltaSec);

    if (Math.abs(camera.zoom - camState.zoom) > 0.001) {
      camera.zoom = camState.zoom;
      camera.updateProjectionMatrix();
    }

    const camDist = 90;
    const cosP = Math.cos(camState.pitch);
    camera.position.set(
      camState.targetX + camDist * cosP * Math.sin(camState.yaw),
      camDist * Math.sin(camState.pitch),
      camState.targetZ + camDist * cosP * Math.cos(camState.yaw)
    );
    camera.lookAt(camState.targetX, 0.8, camState.targetZ);

    // Anchor DirectionalLight shadow frustum around camera target so soft shadows stay razor-sharp everywhere!
    sunLight.position.set(camState.targetX + 36, 48, camState.targetZ + 30);
    sunLight.target.position.set(camState.targetX, 0, camState.targetZ);
    sunLight.target.updateMatrixWorld();

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

    renderer.render(scene, camera);

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
        projVec.set(lbl.x, lbl.y, lbl.z).project(camera);
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

  return {
    THREE,
    camState,
    resize,
    raycastGround,
    renderFrame,
    setZoom(nextZoom) {
      camState.targetZoom = Math.max(0.55, Math.min(2.2, nextZoom));
    },
    resetCamera() {
      camState.targetYaw = Math.PI / 4;
      camState.targetPitch = Math.PI / 4;
      camState.panX = 0;
      camState.panZ = 0;
      camState.targetZoom = 1.0;
    },
    dispose() {
      mats.disposeAll();
      Object.values(textures).forEach((t) => t.dispose());
      leaderTex.dispose();
      ledAdTex.dispose();
      robotBannerCache.forEach((b) => b.tex.dispose());
      robotBannerCache.clear();
      _petGeoCache.forEach((g) => g.dispose());
      _petGeoCache.clear();
      renderer.dispose();
    },
  };
}
