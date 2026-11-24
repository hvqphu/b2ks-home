/**
 * ============================================================================
 * B2KS HIGH-DETAIL 3D ITEM & INVENTION LAB PROCEDURAL BUILDER
 * ============================================================================
 * Module chung dựng toàn bộ vật phẩm 3D chi tiết (dùng chung cho World 3D,
 * Phòng Riêng 3D và Thư viện Hình ảnh Admin 3D) để đảm bảo 2D <-> 3D đồng nhất.
 * Lưu ý: Luôn nhận `THREE` như tham số (nạp qua window.__THREE_READY__ CDN).
 */
import { LabItemSpec } from '../types/b2ks';

export interface MatCacheLike {
  get: (color: string, opts?: Record<string, unknown>) => any;
}

const RAINBOW_HEX = ['#EF4444', '#F97316', '#FACC15', '#22C55E', '#38BDF8', '#8B5CF6'];

function mBox(THREE: any, w: number, h: number, d: number, mat: any, cast = true, recv = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = cast;
  m.receiveShadow = recv;
  return m;
}

function mCyl(THREE: any, rt: number, rb: number, h: number, segs: number, mat: any, cast = true, recv = true) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, segs), mat);
  m.castShadow = cast;
  m.receiveShadow = recv;
  return m;
}

function mSph(THREE: any, r: number, ws: number, hs: number, mat: any, cast = true, recv = true) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, ws, hs), mat);
  m.castShadow = cast;
  m.receiveShadow = recv;
  return m;
}

function mCone(THREE: any, r: number, h: number, segs: number, mat: any, cast = true) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, segs), mat);
  m.castShadow = cast;
  m.receiveShadow = true;
  return m;
}

function mTorus(THREE: any, r: number, tube: number, rSegs: number, tSegs: number, mat: any) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, rSegs, tSegs), mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function mRoundBox(THREE: any, w: number, h: number, r: number, depth: number, bevel: number, mat: any) {
  const hw = w / 2;
  const hh = h / 2;
  const rad = Math.min(r, hw * 0.9, hh * 0.9);
  const s = new THREE.Shape();
  s.moveTo(-hw + rad, -hh);
  s.lineTo(hw - rad, -hh);
  s.quadraticCurveTo(hw, -hh, hw, -hh + rad);
  s.lineTo(hw, hh - rad);
  s.quadraticCurveTo(hw, hh, hw - rad, hh);
  s.lineTo(-hw + rad, hh);
  s.quadraticCurveTo(-hw, hh, -hw, hh - rad);
  s.lineTo(-hw, -hh + rad);
  s.quadraticCurveTo(-hw, -hh, -hw + rad, -hh);
  const geo = new THREE.ExtrudeGeometry(s, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 8,
  });
  geo.center();
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function createStarShape(THREE: any, outerR: number, innerR: number, points = 5) {
  const s = new THREE.Shape();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (i * Math.PI) / points - Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  s.closePath();
  return s;
}

function createHeartShape(THREE: any, size = 0.5) {
  const s = new THREE.Shape();
  s.moveTo(0, -size * 0.68);
  s.bezierCurveTo(size * 0.95, -size * 0.15, size * 0.92, size * 0.72, 0, size * 0.34);
  s.bezierCurveTo(-size * 0.92, size * 0.72, -size * 0.95, -size * 0.15, 0, -size * 0.68);
  return s;
}

/**
 * Thân đàn Guitar Acoustic đường cong figure-8 điêu khắc mượt
 */
function createAcousticBodyGeometry(THREE: any, scale = 1, depth = 0.24) {
  const s = new THREE.Shape();
  s.moveTo(0, -0.58 * scale);
  s.bezierCurveTo(0.46 * scale, -0.58 * scale, 0.56 * scale, -0.22 * scale, 0.38 * scale, -0.02 * scale);
  s.bezierCurveTo(0.24 * scale, 0.1 * scale, 0.26 * scale, 0.18 * scale, 0.35 * scale, 0.28 * scale);
  s.bezierCurveTo(0.42 * scale, 0.46 * scale, 0.24 * scale, 0.62 * scale, 0, 0.62 * scale);
  s.bezierCurveTo(-0.24 * scale, 0.62 * scale, -0.42 * scale, 0.46 * scale, -0.35 * scale, 0.28 * scale);
  s.bezierCurveTo(-0.26 * scale, 0.18 * scale, -0.24 * scale, 0.1 * scale, -0.38 * scale, -0.02 * scale);
  s.bezierCurveTo(-0.56 * scale, -0.22 * scale, -0.46 * scale, -0.58 * scale, 0, -0.58 * scale);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.022 * scale,
    bevelSize: 0.022 * scale,
    bevelSegments: 3,
    curveSegments: 16,
  });
  geo.translate(0, 0, -depth * 0.5);
  return geo;
}

/**
 * Dựng Đàn Guitar Gỗ Acoustic chi tiết cao (giá đỡ chữ A, thân figure-8 viền trắng,
 * lỗ thoát âm + hoa văn rosette, ngựa đàn, cần đàn có phím & 6 dây kim loại, đầu đàn + 6 khóa)
 */
function buildDetailedAcousticGuitar3D(
  THREE: any,
  mats: MatCacheLike,
  bodyTopHex = '#D97706',
  bodyBackHex = '#92400E',
  withStand = true
) {
  const g = new THREE.Group();
  const metalDark = mats.get('#1E293B', { roughness: 0.42, metalness: 0.55 });
  const chromeMat = mats.get('#E2E8F0', { roughness: 0.22, metalness: 0.85 });
  const rosewoodMat = mats.get('#451A03', { roughness: 0.62 });
  const mapleMat = mats.get('#78350F', { roughness: 0.55 });
  const spruceTopMat = mats.get(bodyTopHex, { roughness: 0.36, metalness: 0.04 });
  const mahoganyBackMat = mats.get(bodyBackHex, { roughness: 0.46 });
  const bindingMat = mats.get('#FEF3C7', { roughness: 0.4 });
  const holeVoidMat = mats.get('#0F172A', { roughness: 0.9 });
  const rosetteMat = mats.get('#FACC15', { roughness: 0.35, metalness: 0.3 });

  if (withStand) {
    const legL = mCyl(THREE, 0.032, 0.036, 0.92, 8, metalDark);
    legL.position.set(-0.28, 0.42, 0.06);
    legL.rotation.set(0.24, 0, -0.22);
    const legR = mCyl(THREE, 0.032, 0.036, 0.92, 8, metalDark);
    legR.position.set(0.28, 0.42, 0.06);
    legR.rotation.set(0.24, 0, 0.22);
    const backLeg = mCyl(THREE, 0.03, 0.034, 0.96, 8, metalDark);
    backLeg.position.set(0, 0.42, -0.32);
    backLeg.rotation.x = -0.38;
    const crossBar = mCyl(THREE, 0.028, 0.028, 0.52, 8, metalDark);
    crossBar.rotation.z = Math.PI / 2;
    crossBar.position.set(0, 0.34, 0.14);
    [-0.22, 0.22].forEach((cx) => {
      const arm = mCyl(THREE, 0.03, 0.03, 0.34, 8, metalDark);
      arm.rotation.x = Math.PI / 2;
      arm.position.set(cx, 0.35, 0.25);
      const tip = mSph(THREE, 0.045, 8, 6, mats.get('#EF4444', { roughness: 0.6 }));
      tip.position.set(cx, 0.35, 0.42);
      g.add(arm, tip);
    });
    g.add(legL, legR, backLeg, crossBar);
  }

  // Tilted Guitar Group leaning neatly back in stand
  const guitar = new THREE.Group();
  guitar.position.set(0, withStand ? 0.96 : 0.72, withStand ? 0.02 : 0);
  guitar.rotation.x = withStand ? -0.15 : 0;

  // Back mahogany body + cream binding + spruce soundboard face
  const bodyBack = new THREE.Mesh(createAcousticBodyGeometry(THREE, 1.0, 0.22), mahoganyBackMat);
  bodyBack.castShadow = true;
  bodyBack.receiveShadow = true;
  const bodyBind = new THREE.Mesh(createAcousticBodyGeometry(THREE, 1.018, 0.055), bindingMat);
  bodyBind.position.z = 0.092;
  const bodyTop = new THREE.Mesh(createAcousticBodyGeometry(THREE, 0.985, 0.045), spruceTopMat);
  bodyTop.position.z = 0.112;
  bodyTop.castShadow = true;
  guitar.add(bodyBack, bodyBind, bodyTop);

  // Rosette & Deep Soundhole
  const rosette = mCyl(THREE, 0.205, 0.205, 0.015, 24, rosetteMat);
  rosette.rotation.x = Math.PI / 2;
  rosette.position.set(0, 0.11, 0.142);
  const innerRim = mCyl(THREE, 0.17, 0.17, 0.018, 24, rosewoodMat);
  innerRim.rotation.x = Math.PI / 2;
  innerRim.position.set(0, 0.11, 0.144);
  const soundHole = mCyl(THREE, 0.145, 0.145, 0.022, 24, holeVoidMat, false, false);
  soundHole.rotation.x = Math.PI / 2;
  soundHole.position.set(0, 0.11, 0.146);
  guitar.add(rosette, innerRim, soundHole);

  // Teardrop tortoise pickguard beside soundhole
  const pgShape = new THREE.Shape();
  pgShape.moveTo(0.16, 0.12);
  pgShape.bezierCurveTo(0.28, 0.16, 0.34, -0.04, 0.22, -0.17);
  pgShape.bezierCurveTo(0.14, -0.18, 0.12, -0.04, 0.16, 0.12);
  const pickguard = new THREE.Mesh(
    new THREE.ExtrudeGeometry(pgShape, { depth: 0.01, bevelEnabled: false }),
    mats.get('#7C2D12', { roughness: 0.3 })
  );
  pickguard.position.set(0, 0, 0.15);
  guitar.add(pickguard);

  // Wooden Bridge + White Saddle + 6 Bridge Pins
  const bridge = mRoundBox(THREE, 0.36, 0.085, 0.02, 0.04, 0.008, rosewoodMat);
  bridge.position.set(0, -0.25, 0.16);
  const saddle = mBox(THREE, 0.26, 0.018, 0.03, bindingMat);
  saddle.position.set(0, -0.235, 0.18);
  guitar.add(bridge, saddle);
  for (let i = 0; i < 6; i++) {
    const px = -0.075 + i * 0.03;
    const pin = mSph(THREE, 0.011, 6, 6, bindingMat, false, false);
    pin.position.set(px, -0.27, 0.188);
    guitar.add(pin);
  }

  // Neck + Rosewood Fretboard + Silver Frets + Pearl Dots
  const neck = mBox(THREE, 0.165, 1.06, 0.085, mapleMat);
  neck.position.set(0, 1.06, 0.075);
  const fretboard = mBox(THREE, 0.158, 1.15, 0.025, rosewoodMat);
  fretboard.position.set(0, 1.02, 0.13);
  const nut = mBox(THREE, 0.16, 0.022, 0.034, bindingMat);
  nut.position.set(0, 1.59, 0.138);
  guitar.add(neck, fretboard, nut);

  for (let f = 0; f < 10; f++) {
    const fy = 0.56 + f * 0.098;
    const fret = mBox(THREE, 0.156, 0.009, 0.009, chromeMat, false, false);
    fret.position.set(0, fy, 0.144);
    guitar.add(fret);
    if (f === 2 || f === 4 || f === 6 || f === 8) {
      const dot = mCyl(THREE, 0.014, 0.014, 0.006, 8, bindingMat, false, false);
      dot.rotation.x = Math.PI / 2;
      dot.position.set(0, fy - 0.048, 0.145);
      guitar.add(dot);
    }
  }

  // Angled Headstock + 6 Chrome Tuning Pegs
  const head = new THREE.Group();
  head.position.set(0, 1.62, 0.09);
  head.rotation.x = -0.18;
  const headstockPlate = mRoundBox(THREE, 0.24, 0.34, 0.035, 0.055, 0.01, rosewoodMat);
  headstockPlate.position.y = 0.16;
  head.add(headstockPlate);
  [-1, 1].forEach((side) => {
    for (let t = 0; t < 3; t++) {
      const ty = 0.08 + t * 0.085;
      const post = mCyl(THREE, 0.013, 0.013, 0.055, 8, chromeMat);
      post.rotation.x = Math.PI / 2;
      post.position.set(side * 0.058, ty, 0.042);
      const shaft = mCyl(THREE, 0.01, 0.01, 0.09, 6, chromeMat);
      shaft.rotation.z = Math.PI / 2;
      shaft.position.set(side * 0.14, ty, 0);
      const knob = mSph(THREE, 0.026, 8, 6, chromeMat);
      knob.scale.set(0.65, 1.15, 0.85);
      knob.position.set(side * 0.19, ty, 0);
      head.add(post, shaft, knob);
    }
  });
  guitar.add(head);

  // 6 Taut Metallic Strings
  for (let sIdx = 0; sIdx < 6; sIdx++) {
    const bx = -0.068 + sIdx * 0.027;
    const str = mCyl(THREE, 0.0045, 0.0045, 1.84, 6, chromeMat, false, false);
    str.position.set(bx, 0.675, 0.155);
    guitar.add(str);
  }

  g.add(guitar);
  return g;
}

/**
 * Dựng toàn bộ Vật phẩm Catalog / Siêu thị / Phiếu / Thức ăn / Phụ kiện Pet bằng 3D tinh xảo
 */
export function buildCatalogItem3D(
  THREE: any,
  mats: MatCacheLike,
  decorId: string,
  findAnyCatalogItem?: (id: string) => any
) {
  const g = new THREE.Group();

  if (decorId === 'd_guitar') {
    return buildDetailedAcousticGuitar3D(THREE, mats, '#E07A2E', '#8C3F14', true);
  }

  if (decorId === 'd_pc') {
    const oakMat = mats.get('#C98A4B', { roughness: 0.58 });
    const darkMetal = mats.get('#1E293B', { roughness: 0.4, metalness: 0.5 });
    const slateMat = mats.get('#334155', { roughness: 0.45, metalness: 0.35 });
    const keyMat = mats.get('#F8FAFC', { roughness: 0.42 });

    // Desk tabletop + T-legs + crossbar
    const tabletop = mRoundBox(THREE, 3.05, 0.15, 0.08, 1.42, 0.025, oakMat);
    tabletop.position.set(0, 0.92, -0.08);
    tabletop.rotation.x = Math.PI / 2;
    [-1.28, 1.28].forEach((lx) => {
      const col = mBox(THREE, 0.14, 0.86, 0.14, darkMetal);
      col.position.set(lx, 0.45, -0.08);
      const foot = mRoundBox(THREE, 0.22, 0.08, 0.03, 1.15, 0.015, darkMetal);
      foot.position.set(lx, 0.04, -0.08);
      g.add(col, foot);
    });
    const crossbar = mBox(THREE, 2.48, 0.1, 0.08, darkMetal);
    crossbar.position.set(0, 0.28, -0.52);

    // Gaming Deskpad
    const deskpad = mRoundBox(THREE, 1.68, 0.022, 0.04, 0.68, 0.008, mats.get('#0F172A', { roughness: 0.85 }));
    deskpad.position.set(-0.22, 1.0, 0.12);
    deskpad.rotation.x = Math.PI / 2;

    // Curved-bevel Widescreen Monitor + Stand + Webcam + UI Glow
    const monBase = mRoundBox(THREE, 0.62, 0.05, 0.03, 0.34, 0.01, darkMetal);
    monBase.position.set(-0.26, 1.02, -0.34);
    monBase.rotation.x = Math.PI / 2;
    const monNeck = mBox(THREE, 0.12, 0.38, 0.1, slateMat);
    monNeck.position.set(-0.26, 1.18, -0.4);
    const monFrame = mRoundBox(THREE, 1.56, 0.92, 0.05, 0.08, 0.015, darkMetal);
    monFrame.position.set(-0.26, 1.58, -0.34);
    const screen = mBox(THREE, 1.44, 0.8, 0.02, mats.get('#0EA5E9', { emissive: '#0284C7', emissiveIntensity: 0.55, roughness: 0.15 }));
    screen.position.set(-0.26, 1.58, -0.295);
    const uiCard = mBox(THREE, 0.72, 0.44, 0.025, mats.get('#E0F2FE', { emissive: '#BAE6FD', emissiveIntensity: 0.35 }));
    uiCard.position.set(-0.46, 1.6, -0.288);
    const uiBar = mBox(THREE, 0.38, 0.5, 0.025, mats.get('#FACC15', { emissive: '#F59E0B', emissiveIntensity: 0.45 }));
    uiBar.position.set(0.18, 1.58, -0.288);
    const webcam = mBox(THREE, 0.16, 0.055, 0.06, slateMat);
    webcam.position.set(-0.26, 2.06, -0.32);

    // RGB PC Tower on right
    const tower = mRoundBox(THREE, 0.52, 0.94, 0.04, 0.92, 0.015, darkMetal);
    tower.position.set(0.98, 1.48, -0.14);
    const rgbStrip = mBox(THREE, 0.04, 0.78, 0.04, mats.get('#22D3EE', { emissive: '#06B6D4', emissiveIntensity: 0.9 }));
    rgbStrip.position.set(0.75, 1.48, 0.33);
    const fanGlow1 = mTorus(THREE, 0.12, 0.022, 8, 16, mats.get('#A855F7', { emissive: '#A855F7', emissiveIntensity: 0.85 }));
    fanGlow1.rotation.y = Math.PI / 2;
    fanGlow1.position.set(0.7, 1.64, -0.05);
    const fanGlow2 = mTorus(THREE, 0.12, 0.022, 8, 16, mats.get('#22D3EE', { emissive: '#22D3EE', emissiveIntensity: 0.85 }));
    fanGlow2.rotation.y = Math.PI / 2;
    fanGlow2.position.set(0.7, 1.32, -0.05);

    // Mechanical Keyboard & Mouse
    const kbBody = mRoundBox(THREE, 0.88, 0.05, 0.02, 0.3, 0.01, slateMat);
    kbBody.position.set(-0.34, 1.03, 0.14);
    kbBody.rotation.x = Math.PI / 2;
    const kbKeys = mBox(THREE, 0.78, 0.03, 0.22, keyMat);
    kbKeys.position.set(-0.34, 1.055, 0.14);
    const mouse = mSph(THREE, 0.09, 10, 8, darkMetal);
    mouse.scale.set(0.85, 0.55, 1.25);
    mouse.position.set(0.32, 1.04, 0.16);
    const mouseRgb = mBox(THREE, 0.03, 0.03, 0.05, mats.get('#38BDF8', { emissive: '#38BDF8', emissiveIntensity: 0.8 }));
    mouseRgb.position.set(0.32, 1.06, 0.19);

    // Ergonomic Gaming Chair
    const chair = new THREE.Group();
    chair.position.set(-0.18, 0, 1.02);
    const pole = mCyl(THREE, 0.06, 0.07, 0.42, 10, darkMetal);
    pole.position.y = 0.24;
    for (let sp = 0; sp < 5; sp++) {
      const ang = (sp * Math.PI * 2) / 5;
      const spoke = mBox(THREE, 0.07, 0.05, 0.42, darkMetal);
      spoke.position.set(Math.sin(ang) * 0.2, 0.08, Math.cos(ang) * 0.2);
      spoke.rotation.y = ang;
      const wheel = mCyl(THREE, 0.045, 0.045, 0.04, 8, slateMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(Math.sin(ang) * 0.38, 0.045, Math.cos(ang) * 0.38);
      chair.add(spoke, wheel);
    }
    const seat = mRoundBox(THREE, 0.84, 0.16, 0.06, 0.78, 0.03, mats.get('#1E293B', { roughness: 0.72 }));
    seat.position.set(0, 0.5, 0);
    seat.rotation.x = Math.PI / 2;
    const seatTrim = mRoundBox(THREE, 0.76, 0.12, 0.04, 0.72, 0.02, mats.get('#EF4444', { roughness: 0.65 }));
    seatTrim.position.set(0, 0.53, 0.02);
    seatTrim.rotation.x = Math.PI / 2;
    const backrest = mRoundBox(THREE, 0.76, 1.02, 0.08, 0.14, 0.03, mats.get('#EF4444', { roughness: 0.65 }));
    backrest.position.set(0, 1.04, 0.35);
    backrest.rotation.x = 0.1;
    const headPill = mRoundBox(THREE, 0.4, 0.2, 0.05, 0.1, 0.02, mats.get('#0F172A', { roughness: 0.75 }));
    headPill.position.set(0, 1.44, 0.28);
    [-0.44, 0.44].forEach((ax) => {
      const armPost = mBox(THREE, 0.06, 0.26, 0.06, darkMetal);
      armPost.position.set(ax, 0.64, 0);
      const armPad = mRoundBox(THREE, 0.1, 0.05, 0.02, 0.38, 0.01, slateMat);
      armPad.position.set(ax, 0.78, -0.04);
      armPad.rotation.x = Math.PI / 2;
      chair.add(armPost, armPad);
    });
    chair.add(pole, seat, seatTrim, backrest, headPill);

    g.add(tabletop, crossbar, deskpad, monBase, monNeck, monFrame, screen, uiCard, uiBar, webcam, tower, rgbStrip, fanGlow1, fanGlow2, kbBody, kbKeys, mouse, mouseRgb, chair);
    return g;
  }

  if (decorId === 'd_plant') {
    const potMat = mats.get('#F8FAFC', { roughness: 0.32 });
    const potRimMat = mats.get('#E2E8F0', { roughness: 0.38 });
    const saucerMat = mats.get('#CBD5E1', { roughness: 0.45 });
    const soilMat = mats.get('#451A03', { roughness: 0.92 });
    const stemMat = mats.get('#15803D', { roughness: 0.65 });

    const saucer = mCyl(THREE, 0.52, 0.46, 0.08, 18, saucerMat);
    saucer.position.y = 0.04;
    const pot = mCyl(THREE, 0.48, 0.35, 0.74, 18, potMat);
    pot.position.y = 0.44;
    const rim = mTorus(THREE, 0.47, 0.045, 8, 20, potRimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.8;
    const soil = mCyl(THREE, 0.44, 0.44, 0.07, 16, soilMat);
    soil.position.y = 0.79;
    g.add(saucer, pot, rim, soil);

    // Sculpted Monstera heart leaves on arched CatmullRom stems
    const leafShape = new THREE.Shape();
    leafShape.moveTo(0, -0.18);
    leafShape.bezierCurveTo(0.28, -0.12, 0.34, 0.16, 0.14, 0.34);
    leafShape.lineTo(0.22, 0.22);
    leafShape.lineTo(0.08, 0.39);
    leafShape.bezierCurveTo(0.04, 0.46, 0, 0.48, 0, 0.48);
    leafShape.bezierCurveTo(0, 0.48, -0.04, 0.46, -0.08, 0.39);
    leafShape.lineTo(-0.22, 0.22);
    leafShape.lineTo(-0.14, 0.34);
    leafShape.bezierCurveTo(-0.34, 0.16, -0.28, -0.12, 0, -0.18);
    leafShape.closePath();
    const leafGeo = new THREE.ExtrudeGeometry(leafShape, {
      depth: 0.024,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.008,
      bevelSegments: 2,
      curveSegments: 10,
    });

    const fronds = [
      { ang: 0.2, h: 1.56, r: 0.36, tilt: 0.58, s: 1.05, col: '#16A34A' },
      { ang: 1.55, h: 1.44, r: 0.42, tilt: 0.65, s: 0.96, col: '#22C55E' },
      { ang: 2.85, h: 1.62, r: 0.34, tilt: 0.52, s: 1.1, col: '#15803D' },
      { ang: 4.1, h: 1.38, r: 0.44, tilt: 0.72, s: 0.92, col: '#22C55E' },
      { ang: 5.3, h: 1.82, r: 0.14, tilt: 0.32, s: 1.0, col: '#4ADE80' },
    ];
    fronds.forEach((f) => {
      const tx = Math.cos(f.ang) * f.r;
      const tz = Math.sin(f.ang) * f.r;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(tx * 0.12, 0.78, tz * 0.12),
        new THREE.Vector3(tx * 0.55, (0.78 + f.h) * 0.52, tz * 0.55),
        new THREE.Vector3(tx, f.h, tz),
      ]);
      const stem = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 0.028, 7, false), stemMat);
      stem.castShadow = true;
      const leafWrap = new THREE.Group();
      leafWrap.position.set(tx, f.h, tz);
      leafWrap.rotation.y = -f.ang + Math.PI / 2;
      const leaf = new THREE.Mesh(leafGeo, mats.get(f.col, { roughness: 0.52 }));
      leaf.scale.setScalar(f.s);
      leaf.rotation.x = -Math.PI / 2 + f.tilt;
      leaf.castShadow = true;
      leafWrap.add(leaf);
      g.add(stem, leafWrap);
    });
    return g;
  }

  if (decorId === 'd_bear') {
    const furMat = mats.get('#C97A34', { roughness: 0.9 });
    const creamMat = mats.get('#FEF3C7', { roughness: 0.85 });
    const pinkEarMat = mats.get('#F9A8D4', { roughness: 0.75 });
    const darkGlossMat = mats.get('#0F172A', { roughness: 0.15 });
    const ribbonMat = mats.get('#E11D48', { roughness: 0.45 });

    // Torso & Cream Tummy Patch
    const body = mSph(THREE, 0.62, 16, 12, furMat);
    body.scale.set(1.0, 1.08, 0.9);
    body.position.set(0, 0.64, 0);
    const belly = mSph(THREE, 0.42, 14, 10, creamMat);
    belly.scale.set(0.95, 1.04, 0.55);
    belly.position.set(0, 0.62, 0.34);

    // Seated Legs + Cream Foot Pads facing forward
    [-0.4, 0.4].forEach((lx) => {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.19, 0.28, 6, 10), furMat);
      leg.rotation.x = Math.PI / 2 - 0.16;
      leg.rotation.z = lx > 0 ? -0.18 : 0.18;
      leg.position.set(lx, 0.24, 0.42);
      leg.castShadow = true;
      const footPad = mCyl(THREE, 0.14, 0.14, 0.05, 12, creamMat);
      footPad.rotation.x = Math.PI / 2 - 0.16;
      footPad.position.set(lx * 1.12, 0.27, 0.64);
      g.add(leg, footPad);
    });

    // Welcoming Outstretched Arms
    [-1, 1].forEach((side) => {
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.34, 6, 10), furMat);
      arm.position.set(side * 0.64, 0.86, 0.18);
      arm.rotation.z = side * 0.68;
      arm.rotation.x = -0.35;
      arm.castShadow = true;
      g.add(arm);
    });

    // Red Collar Bow Tie
    const bowCenter = mSph(THREE, 0.08, 8, 8, ribbonMat);
    bowCenter.position.set(0, 1.14, 0.42);
    [-1, 1].forEach((side) => {
      const loop = mCone(THREE, 0.11, 0.2, 8, ribbonMat);
      loop.rotation.z = side * (Math.PI / 2);
      loop.position.set(side * 0.12, 1.14, 0.42);
      g.add(loop);
    });

    // Head, Ears + Inner Ears, Muzzle, Glossy Eyes & Nose
    const head = mSph(THREE, 0.52, 16, 12, furMat);
    head.position.set(0, 1.5, 0.03);
    const muzzle = mSph(THREE, 0.22, 12, 10, creamMat);
    muzzle.scale.set(1.12, 0.88, 0.9);
    muzzle.position.set(0, 1.4, 0.42);
    const nose = mSph(THREE, 0.08, 10, 8, darkGlossMat);
    nose.scale.set(1.25, 0.85, 0.85);
    nose.position.set(0, 1.48, 0.6);
    [-0.18, 0.18].forEach((ex) => {
      const eye = mSph(THREE, 0.06, 10, 8, darkGlossMat);
      eye.position.set(ex, 1.58, 0.48);
      const glint = mSph(THREE, 0.02, 6, 6, mats.get('#FFFFFF', { emissive: '#FFFFFF', emissiveIntensity: 0.8 }), false, false);
      glint.position.set(ex + 0.02, 1.6, 0.53);
      g.add(eye, glint);
    });
    [-0.39, 0.39].forEach((ex) => {
      const ear = mSph(THREE, 0.18, 12, 10, furMat);
      ear.scale.set(1, 1, 0.58);
      ear.position.set(ex, 1.9, -0.02);
      const inner = mSph(THREE, 0.1, 10, 8, pinkEarMat);
      inner.scale.set(1, 1, 0.45);
      inner.position.set(ex, 1.9, 0.04);
      g.add(ear, inner);
    });
    g.add(body, belly, bowCenter, head, muzzle, nose);
    return g;
  }

  if (decorId === 'd_aquarium') {
    const cabMat = mats.get('#78350F', { roughness: 0.68 });
    const cabDoorMat = mats.get('#92400E', { roughness: 0.64 });
    const brassMat = mats.get('#FACC15', { roughness: 0.28, metalness: 0.72 });
    const hoodMat = mats.get('#0F172A', { roughness: 0.35 });
    const glassMat = mats.get('#BAE6FD', { roughness: 0.08, metalness: 0.05, transparent: true, opacity: 0.4, emissive: '#0284C7', emissiveIntensity: 0.25 });
    const sandMat = mats.get('#FDE68A', { roughness: 0.92 });

    // Wooden Stand with 2 Cabinet Doors & Handles
    const standBody = mBox(THREE, 2.02, 0.86, 1.06, cabMat);
    standBody.position.y = 0.43;
    const standTop = mRoundBox(THREE, 2.12, 0.09, 0.03, 1.14, 0.015, cabDoorMat);
    standTop.position.y = 0.88;
    standTop.rotation.x = Math.PI / 2;
    [-0.48, 0.48].forEach((dx) => {
      const door = mRoundBox(THREE, 0.88, 0.7, 0.03, 0.06, 0.01, cabDoorMat);
      door.position.set(dx, 0.42, 0.53);
      const handle = mSph(THREE, 0.045, 8, 6, brassMat);
      handle.position.set(dx > 0 ? dx - 0.3 : dx + 0.3, 0.45, 0.58);
      g.add(door, handle);
    });

    // Sand Floor, Pebbles, Coral Rock, Swaying Plants, 3 Multi-part Fish
    const sand = mBox(THREE, 1.82, 0.14, 0.84, sandMat);
    sand.position.set(0, 1.0, 0);
    const coral = mCone(THREE, 0.24, 0.44, 7, mats.get('#F43F5E', { roughness: 0.72 }));
    coral.position.set(0.45, 1.24, -0.1);
    const rock = mSph(THREE, 0.2, 8, 6, mats.get('#64748B', { roughness: 0.85, flatShading: true }));
    rock.scale.set(1.2, 0.7, 0.9);
    rock.position.set(-0.55, 1.14, 0.12);
    [-0.65, -0.5, 0.62].forEach((wx, wi) => {
      const weed = mCone(THREE, 0.065, 0.48 + (wi % 2) * 0.14, 6, mats.get('#16A34A', { roughness: 0.65 }));
      weed.position.set(wx, 1.32, -0.15 + (wi % 2) * 0.25);
      g.add(weed);
    });
    const fishes = [
      { x: -0.25, y: 1.52, z: 0.08, col: '#FB923C', s: 1.0, dir: 1 },
      { x: 0.28, y: 1.38, z: -0.08, col: '#FACC15', s: 0.82, dir: -1 },
      { x: 0.02, y: 1.68, z: 0.02, col: '#38BDF8', s: 0.75, dir: 1 },
    ];
    fishes.forEach((f) => {
      const fg = new THREE.Group();
      fg.position.set(f.x, f.y, f.z);
      fg.scale.set(f.dir * f.s, f.s, f.s);
      const fb = mSph(THREE, 0.12, 10, 8, mats.get(f.col, { roughness: 0.38 }));
      fb.scale.set(1.55, 0.95, 0.62);
      const ft = mCone(THREE, 0.09, 0.16, 4, mats.get(f.col, { roughness: 0.4 }));
      ft.rotation.z = -Math.PI / 2;
      ft.position.x = -0.2;
      const feye = mSph(THREE, 0.025, 6, 6, mats.get('#0F172A', {}));
      feye.position.set(0.12, 0.03, 0.055);
      fg.add(fb, ft, feye);
      g.add(fg);
    });

    // Clear Glass Tank + Black LED Hood
    const tank = mBox(THREE, 1.9, 0.98, 0.92, glassMat, false, true);
    tank.position.set(0, 1.44, 0);
    const hood = mRoundBox(THREE, 1.98, 0.14, 0.03, 0.98, 0.015, hoodMat);
    hood.position.set(0, 1.99, 0);
    hood.rotation.x = Math.PI / 2;
    const ledStrip = mBox(THREE, 1.65, 0.03, 0.16, mats.get('#7DD3FC', { emissive: '#38BDF8', emissiveIntensity: 0.9 }));
    ledStrip.position.set(0, 1.9, 0);

    g.add(standBody, standTop, sand, coral, rock, tank, hood, ledStrip);
    return g;
  }

  if (decorId === 'd_bookshelf') {
    const woodDark = mats.get('#78350F', { roughness: 0.7 });
    const woodMid = mats.get('#B47B48', { roughness: 0.65 });
    const frameBack = mBox(THREE, 2.2, 2.7, 0.12, woodDark);
    frameBack.position.set(0, 1.38, -0.38);
    [-1.04, 1.04].forEach((sx) => {
      const side = mBox(THREE, 0.14, 2.7, 0.86, woodMid);
      side.position.set(sx, 1.38, 0);
      g.add(side);
    });
    const topCap = mRoundBox(THREE, 2.34, 0.14, 0.03, 0.96, 0.015, woodDark);
    topCap.position.set(0, 2.76, 0);
    topCap.rotation.x = Math.PI / 2;
    const bookColors = ['#EF4444', '#F59E0B', '#22C55E', '#38BDF8', '#A855F7', '#EC4899'];
    [0.14, 0.98, 1.82].forEach((sy, rowIdx) => {
      const shelf = mBox(THREE, 2.04, 0.1, 0.8, woodMid);
      shelf.position.set(0, sy, 0.02);
      g.add(shelf);
      for (let b = 0; b < 6; b++) {
        const bh = 0.52 + ((b + rowIdx) % 3) * 0.09;
        const book = mRoundBox(THREE, 0.22, bh, 0.02, 0.54, 0.008, mats.get(bookColors[(b + rowIdx * 2) % bookColors.length], { roughness: 0.55 }));
        book.position.set(-0.78 + b * 0.3, sy + 0.05 + bh / 2, 0.08);
        if (b === 5 && rowIdx === 1) book.rotation.z = 0.22;
        g.add(book);
      }
    });
    g.add(frameBack, topCap);
    return g;
  }

  if (decorId === 'tv_30min') {
    const base = mCyl(THREE, 0.42, 0.52, 0.12, 16, mats.get('#334155', { roughness: 0.4, metalness: 0.6 }));
    base.position.y = 0.06;
    const card = mRoundBox(THREE, 1.48, 0.98, 0.1, 0.12, 0.025, mats.get('#FFFFFF', { roughness: 0.3 }));
    card.position.y = 0.68;
    const badge = mRoundBox(THREE, 0.92, 0.62, 0.14, 0.05, 0.015, mats.get('#EF4444', { emissive: '#DC2626', emissiveIntensity: 0.35 }));
    badge.position.set(0, 0.68, 0.075);
    const tri = mCone(THREE, 0.17, 0.28, 3, mats.get('#FFFFFF', { emissive: '#FFFFFF', emissiveIntensity: 0.45 }));
    tri.rotation.z = -Math.PI / 2;
    tri.position.set(0.03, 0.68, 0.12);
    g.add(base, card, badge, tri);
    return g;
  }

  if (decorId === 'v_icecream') {
    const stand = mCyl(THREE, 0.36, 0.46, 0.14, 14, mats.get('#E2E8F0', { roughness: 0.4 }));
    stand.position.y = 0.07;
    const cone = mCone(THREE, 0.36, 0.82, 14, mats.get('#D97706', { roughness: 0.8 }));
    cone.rotation.x = Math.PI;
    cone.position.y = 0.56;
    const scoop1 = mSph(THREE, 0.34, 14, 10, mats.get('#F9A8D4', { roughness: 0.65 }));
    scoop1.position.y = 1.02;
    const scoop2 = mSph(THREE, 0.27, 14, 10, mats.get('#FEF08A', { roughness: 0.65 }));
    scoop2.position.y = 1.38;
    const cherry = mSph(THREE, 0.09, 10, 8, mats.get('#EF4444', { roughness: 0.25 }));
    cherry.position.y = 1.66;
    g.add(stand, cone, scoop1, scoop2, cherry);
    return g;
  }

  if (decorId === 'v_movie') {
    const board = mRoundBox(THREE, 1.3, 0.96, 0.06, 0.12, 0.02, mats.get('#1E293B', { roughness: 0.45 }));
    board.position.y = 0.56;
    const arm = mRoundBox(THREE, 1.3, 0.22, 0.04, 0.12, 0.015, mats.get('#F8FAFC', { roughness: 0.4 }));
    arm.position.set(0, 1.15, 0);
    arm.rotation.z = 0.18;
    for (let i = -2; i <= 2; i++) {
      const stripe = mBox(THREE, 0.14, 0.2, 0.15, mats.get('#0F172A', {}));
      stripe.position.set(i * 0.24, 1.15 + i * 0.04, 0);
      stripe.rotation.z = 0.18;
      g.add(stripe);
    }
    const ticket = mRoundBox(THREE, 0.72, 0.42, 0.03, 0.06, 0.01, mats.get('#FACC15', { roughness: 0.35 }));
    ticket.position.set(0, 0.52, 0.08);
    g.add(board, arm, ticket);
    return g;
  }

  if (decorId === 'v_game') {
    const body = mRoundBox(THREE, 1.25, 0.58, 0.2, 0.18, 0.03, mats.get('#334155', { roughness: 0.38 }));
    body.position.set(0, 0.55, 0);
    [-0.48, 0.48].forEach((gx) => {
      const grip = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.32, 6, 10), mats.get('#1E293B', { roughness: 0.45 }));
      grip.position.set(gx, 0.36, 0.02);
      grip.rotation.z = gx > 0 ? 0.35 : -0.35;
      g.add(grip);
    });
    const dpad = mBox(THREE, 0.22, 0.22, 0.06, mats.get('#0F172A', {}));
    dpad.position.set(-0.34, 0.56, 0.11);
    const btnCols = ['#EF4444', '#22C55E', '#38BDF8', '#FACC15'];
    [[0.34, 0.65], [0.44, 0.55], [0.34, 0.45], [0.24, 0.55]].forEach(([bx, by], i) => {
      const btn = mCyl(THREE, 0.045, 0.045, 0.05, 10, mats.get(btnCols[i], { emissive: btnCols[i], emissiveIntensity: 0.35 }));
      btn.rotation.x = Math.PI / 2;
      btn.position.set(bx, by, 0.11);
      g.add(btn);
    });
    g.add(body, dpad);
    return g;
  }

  if (decorId === 'v_dish') {
    const plate = mCyl(THREE, 0.85, 0.65, 0.1, 20, mats.get('#F8FAFC', { roughness: 0.28 }));
    plate.position.y = 0.05;
    const rim = mTorus(THREE, 0.78, 0.035, 8, 20, mats.get('#FACC15', { roughness: 0.25, metalness: 0.7 }));
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.1;
    const cloche = mSph(THREE, 0.62, 16, 10, mats.get('#E2E8F0', { roughness: 0.22, metalness: 0.75 }));
    cloche.scale.set(1, 0.78, 1);
    cloche.position.y = 0.14;
    const knob = mSph(THREE, 0.11, 10, 8, mats.get('#FACC15', { roughness: 0.25, metalness: 0.75 }));
    knob.position.y = 0.66;
    g.add(plate, rim, cloche, knob);
    return g;
  }

  if (decorId === 'food_biscuit') {
    const boneMat = mats.get('#D97706', { roughness: 0.72 });
    const bar = mRoundBox(THREE, 1.08, 0.32, 0.12, 0.24, 0.04, boneMat);
    bar.position.y = 0.38;
    [-0.5, 0.5].forEach((bx) => {
      [-0.18, 0.18].forEach((by) => {
        const knob = mSph(THREE, 0.2, 10, 8, boneMat);
        knob.position.set(bx, 0.38 + by, 0);
        g.add(knob);
      });
    });
    g.add(bar);
    return g;
  }

  if (decorId === 'food_berry') {
    const berryMat = mats.get('#E11D48', { roughness: 0.35 });
    const leafMat = mats.get('#16A34A', { roughness: 0.55 });
    const body = mCone(THREE, 0.44, 0.85, 14, berryMat);
    body.rotation.x = Math.PI;
    body.position.y = 0.52;
    const top = mSph(THREE, 0.44, 14, 10, berryMat);
    top.scale.set(1, 0.65, 1);
    top.position.y = 0.88;
    for (let l = 0; l < 5; l++) {
      const a = (l * Math.PI * 2) / 5;
      const leaf = mCone(THREE, 0.12, 0.34, 5, leafMat);
      leaf.rotation.z = Math.PI / 2 - 0.3;
      leaf.rotation.y = a;
      leaf.position.set(Math.cos(a) * 0.22, 1.12, Math.sin(a) * 0.22);
      g.add(leaf);
    }
    g.add(body, top);
    return g;
  }

  if (decorId === 'food_star_candy') {
    const starGeo = new THREE.ExtrudeGeometry(createStarShape(THREE, 0.62, 0.28, 5), {
      depth: 0.22,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelSegments: 2,
    });
    starGeo.center();
    const star = new THREE.Mesh(
      starGeo,
      mats.get('#FACC15', { roughness: 0.22, metalness: 0.25, emissive: '#F59E0B', emissiveIntensity: 0.45 })
    );
    star.position.y = 0.72;
    star.castShadow = true;
    const halo = mTorus(THREE, 0.76, 0.04, 8, 24, mats.get('#38BDF8', { emissive: '#38BDF8', emissiveIntensity: 0.65 }));
    halo.position.y = 0.72;
    halo.rotation.x = 0.5;
    g.add(star, halo);
    return g;
  }

  if (decorId.startsWith('pacc_')) {
    const ped = mCyl(THREE, 0.44, 0.52, 0.16, 16, mats.get('#E2E8F0', { roughness: 0.45 }));
    ped.position.y = 0.08;
    g.add(ped);
    if (decorId === 'pacc_bow') {
      const mPink = mats.get('#EC4899', { roughness: 0.45 });
      const center = mSph(THREE, 0.16, 10, 8, mPink);
      center.position.y = 0.62;
      [-1, 1].forEach((s) => {
        const wing = mCone(THREE, 0.26, 0.48, 10, mPink);
        wing.rotation.z = s * (Math.PI / 2);
        wing.position.set(s * 0.28, 0.62, 0);
        g.add(wing);
      });
      g.add(center);
    } else if (decorId === 'pacc_bell') {
      const gold = mats.get('#FACC15', { roughness: 0.22, metalness: 0.75 });
      const collar = mTorus(THREE, 0.36, 0.06, 8, 18, mats.get('#EF4444', { roughness: 0.55 }));
      collar.rotation.x = Math.PI / 2;
      collar.position.y = 0.78;
      const bell = mSph(THREE, 0.2, 12, 10, gold);
      bell.position.set(0, 0.56, 0.32);
      g.add(collar, bell);
    } else if (decorId === 'pacc_glasses') {
      const frame = mats.get('#0F172A', { roughness: 0.25 });
      const gold = mats.get('#FACC15', { roughness: 0.28, metalness: 0.6 });
      [-0.26, 0.26].forEach((gx) => {
        const lens = mRoundBox(THREE, 0.4, 0.28, 0.06, 0.06, 0.015, frame);
        lens.position.set(gx, 0.6, 0);
        g.add(lens);
      });
      const bridge = mBox(THREE, 0.18, 0.05, 0.05, gold);
      bridge.position.set(0, 0.64, 0);
      g.add(bridge);
    } else if (decorId === 'pacc_scarf') {
      const scarf = mTorus(THREE, 0.38, 0.13, 10, 20, mats.get('#EF4444', { roughness: 0.85 }));
      scarf.rotation.x = Math.PI / 2;
      scarf.position.y = 0.66;
      const tail = mRoundBox(THREE, 0.22, 0.52, 0.04, 0.08, 0.015, mats.get('#DC2626', { roughness: 0.85 }));
      tail.position.set(0.24, 0.46, 0.36);
      tail.rotation.z = -0.2;
      g.add(scarf, tail);
    } else if (decorId === 'pacc_wizard') {
      const hatMat = mats.get('#4F46E5', { roughness: 0.55 });
      const brim = mCyl(THREE, 0.62, 0.62, 0.06, 18, hatMat);
      brim.position.y = 0.36;
      const cone = mCone(THREE, 0.36, 0.92, 16, hatMat);
      cone.position.y = 0.84;
      cone.rotation.z = -0.12;
      const band = mTorus(THREE, 0.35, 0.04, 8, 18, mats.get('#FACC15', { roughness: 0.3, metalness: 0.6 }));
      band.rotation.x = Math.PI / 2;
      band.position.y = 0.42;
      g.add(brim, cone, band);
    } else if (decorId === 'pacc_crown') {
      return buildProceduralLabItem3D(THREE, mats, {
        primaryShape: 'crown',
        color: '#F59E0B',
        accent: '#FEF08A',
        material: 'gold',
        sizeScale: 1,
      });
    }
    return g;
  }

  // Fallback to Lab Item procedural 3D builder
  const item = findAnyCatalogItem ? findAnyCatalogItem(decorId) : null;
  if (item && item.labSpec) {
    return buildProceduralLabItem3D(THREE, mats, item.labSpec);
  }

  // Final unknown item graceful trophy pedestal
  const ped = mCyl(THREE, 0.48, 0.58, 0.22, 14, mats.get('#E2E8F0', { roughness: 0.45 }));
  ped.position.y = 0.11;
  const gem = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.45, 0),
    mats.get('#38BDF8', { roughness: 0.2, metalness: 0.15, emissive: '#0EA5E9', emissiveIntensity: 0.25 })
  );
  gem.position.y = 0.72;
  gem.castShadow = true;
  g.add(ped, gem);
  return g;
}

/**
 * Tạo material chính + nhấn cho vật phẩm Phòng Thí Nghiệm dựa theo LabItemSpec
 */
function resolveLabMats(THREE: any, mats: MatCacheLike, spec: LabItemSpec) {
  const c = spec.color || '#0EA5E9';
  const ac = spec.accent || '#BAE6FD';
  const m = spec.material || 'crystal';

  let mainOpts: Record<string, unknown> = { roughness: 0.45, metalness: 0.08 };
  if (m === 'gold') mainOpts = { roughness: 0.22, metalness: 0.76 };
  else if (m === 'crystal') mainOpts = { roughness: 0.14, metalness: 0.12, flatShading: true, transparent: true, opacity: 0.9 };
  else if (m === 'fire') mainOpts = { roughness: 0.35, emissive: '#EA580C', emissiveIntensity: 0.42 };
  else if (m === 'ice') mainOpts = { roughness: 0.16, metalness: 0.08, transparent: true, opacity: 0.88, emissive: '#38BDF8', emissiveIntensity: 0.2 };
  else if (m === 'cyber') mainOpts = { roughness: 0.28, metalness: 0.55, emissive: c, emissiveIntensity: 0.28 };
  else if (m === 'galaxy') mainOpts = { roughness: 0.32, metalness: 0.25, emissive: '#312E81', emissiveIntensity: 0.35 };
  else if (m === 'metal') mainOpts = { roughness: 0.26, metalness: 0.72 };
  else if (m === 'nature') mainOpts = { roughness: 0.78, metalness: 0.02 };
  else if (m === 'candy') mainOpts = { roughness: 0.32, metalness: 0.04 };

  const mainMat = mats.get(c, mainOpts);
  const accentMat = mats.get(ac, {
    roughness: 0.32,
    metalness: m === 'gold' || m === 'metal' ? 0.5 : 0.1,
    emissive: m === 'cyber' || m === 'fire' || m === 'galaxy' ? ac : undefined,
    emissiveIntensity: m === 'cyber' ? 0.65 : 0.32,
  });
  const glassMat = mats.get('#BAE6FD', { roughness: 0.12, transparent: true, opacity: 0.65, emissive: '#38BDF8', emissiveIntensity: 0.22 });
  const darkMat = mats.get('#0F172A', { roughness: 0.45, metalness: 0.25 });
  const whiteMat = mats.get('#F8FAFC', { roughness: 0.42 });
  const goldMat = mats.get('#FACC15', { roughness: 0.24, metalness: 0.72 });
  const rubberMat = mats.get('#1E293B', { roughness: 0.82 });
  const rainbowMats = RAINBOW_HEX.map((hx) => mats.get(hx, { roughness: 0.36, metalness: 0.12 }));

  return { mainMat, accentMat, glassMat, darkMat, whiteMat, goldMat, rubberMat, rainbowMats, isRainbow: Boolean(spec.isRainbow) };
}

function attachLabWing3D(THREE: any, target: any, spec: LabItemSpec, p: ReturnType<typeof resolveLabMats>, halfW: number, centerY: number) {
  const style = spec.wingStyle || 'feather';
  const count = spec.wingCount === 4 ? 4 : 2;
  const wCol = style === 'dragon' ? '#DC2626' : style === 'cyber' ? '#06B6D4' : style === 'butterfly' ? (spec.accent || '#F472B6') : '#FFFFFF';
  const wMat = mats_getSafe(p, wCol, style === 'cyber');

  function mats_getSafe(pal: ReturnType<typeof resolveLabMats>, col: string, neon: boolean) {
    if (pal.isRainbow) return pal.rainbowMats[0];
    return neon ? pal.accentMat : pal.whiteMat;
  }

  const createWingMesh = (span: number, h: number) => {
    const s = new THREE.Shape();
    if (style === 'butterfly') {
      s.moveTo(0, 0);
      s.bezierCurveTo(span * 0.3, h * 1.1, span, h * 0.95, span * 0.96, h * 0.28);
      s.bezierCurveTo(span * 0.92, -h * 0.22, span * 0.4, -h * 0.32, 0, -h * 0.1);
    } else if (style === 'dragon') {
      s.moveTo(0, h * 0.1);
      s.quadraticCurveTo(span * 0.48, h * 0.72, span, h * 0.44);
      s.quadraticCurveTo(span * 0.8, 0, span * 0.68, -h * 0.28);
      s.quadraticCurveTo(span * 0.45, -0.02, span * 0.32, -h * 0.26);
      s.quadraticCurveTo(0.14, 0, 0, -h * 0.18);
    } else if (style === 'cyber') {
      s.moveTo(0, 0.08);
      s.lineTo(span * 0.95, h * 0.65);
      s.lineTo(span * 0.78, h * 0.1);
      s.lineTo(span * 0.65, -h * 0.18);
      s.lineTo(0, -0.1);
    } else {
      s.moveTo(0, h * 0.06);
      s.quadraticCurveTo(span * 0.45, h * 0.85, span, h * 0.52);
      s.quadraticCurveTo(span * 0.98, h * 0.15, span * 0.76, 0.04);
      s.quadraticCurveTo(span * 0.82, -0.12, span * 0.5, -0.14);
      s.quadraticCurveTo(0.2, -0.18, 0, -0.12);
    }
    s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.045, bevelEnabled: true, bevelThickness: 0.014, bevelSize: 0.014, bevelSegments: 2 });
    geo.translate(0, 0, -0.022);
    const mesh = new THREE.Mesh(geo, style === 'dragon' ? p.mainMat : wMat);
    mesh.castShadow = true;
    return mesh;
  };

  [-1, 1].forEach((side, idx) => {
    const piv = new THREE.Group();
    piv.position.set(side * (halfW * 0.82), centerY + 0.05, -0.05);
    piv.rotation.y = side * 0.36;
    piv.rotation.z = side * 0.18;
    const holder = new THREE.Group();
    if (side < 0) holder.rotation.y = Math.PI;
    const wing = createWingMesh(0.78, 0.48);
    if (p.isRainbow) wing.material = p.rainbowMats[(idx + 2) % p.rainbowMats.length];
    const joint = mSph(THREE, 0.08, 8, 6, p.accentMat);
    holder.add(wing);
    piv.add(joint, holder);
    target.add(piv);

    if (count === 4) {
      const piv2 = new THREE.Group();
      piv2.position.set(side * (halfW * 0.72), centerY - 0.14, -0.12);
      piv2.rotation.y = side * 0.46;
      piv2.rotation.z = -side * 0.12;
      const h2 = new THREE.Group();
      if (side < 0) h2.rotation.y = Math.PI;
      const wing2 = createWingMesh(0.54, 0.34);
      if (p.isRainbow) wing2.material = p.rainbowMats[(idx + 4) % p.rainbowMats.length];
      h2.add(wing2);
      piv2.add(h2);
      target.add(piv2);
    }
  });
}

/**
 * Bộ dựng 3D thủ tục cho MỌI vật phẩm Phòng Thí Nghiệm (khớp hình 2D SVG + đầy đủ tính chất)
 */
export function buildProceduralLabItem3D(
  THREE: any,
  mats: MatCacheLike,
  spec: LabItemSpec,
  options: { maxRoomScale?: number } = {}
) {
  const root = new THREE.Group();
  const p = resolveLabMats(THREE, mats, spec);
  const core = new THREE.Group();
  const shape = spec.primaryShape || 'diamond';
  const matOf = (idx: number) => (p.isRainbow ? p.rainbowMats[idx % p.rainbowMats.length] : idx % 2 === 0 ? p.mainMat : p.accentMat);

  switch (shape) {
    case 'car': {
      // Low-slung sports car
      const chassis = mRoundBox(THREE, 1.56, 0.34, 0.08, 0.84, 0.04, p.mainMat);
      chassis.position.y = 0.36;
      const cabin = mRoundBox(THREE, 0.78, 0.28, 0.08, 0.68, 0.03, p.glassMat);
      cabin.position.set(-0.08, 0.6, 0);
      const hoodStripe = mBox(THREE, 0.62, 0.04, 0.24, p.accentMat);
      hoodStripe.position.set(0.42, 0.56, 0);
      const spoilerP1 = mBox(THREE, 0.08, 0.18, 0.06, p.darkMat);
      spoilerP1.position.set(-0.68, 0.6, -0.24);
      const spoilerP2 = spoilerP1.clone();
      spoilerP2.position.z = 0.24;
      const spoiler = mRoundBox(THREE, 0.22, 0.05, 0.02, 0.86, 0.01, p.accentMat);
      spoiler.position.set(-0.72, 0.7, 0);
      core.add(chassis, cabin, hoodStripe, spoilerP1, spoilerP2, spoiler);
      [-0.5, 0.5].forEach((wx) => {
        [-0.45, 0.45].forEach((wz) => {
          const tire = mCyl(THREE, 0.2, 0.2, 0.12, 14, p.rubberMat);
          tire.rotation.x = Math.PI / 2;
          tire.position.set(wx, 0.2, wz);
          const rim = mCyl(THREE, 0.11, 0.11, 0.135, 10, p.goldMat);
          rim.rotation.x = Math.PI / 2;
          rim.position.set(wx, 0.2, wz);
          core.add(tire, rim);
        });
      });
      [-0.24, 0.24].forEach((hz) => {
        const hl = mSph(THREE, 0.075, 8, 6, mats.get('#FEF08A', { emissive: '#FACC15', emissiveIntensity: 0.9 }));
        hl.position.set(0.8, 0.38, hz);
        core.add(hl);
      });
      break;
    }

    case 'truck': {
      const cargo = mRoundBox(THREE, 1.05, 0.76, 0.06, 0.86, 0.03, p.mainMat);
      cargo.position.set(-0.34, 0.64, 0);
      const cab = mRoundBox(THREE, 0.56, 0.56, 0.06, 0.82, 0.03, p.accentMat);
      cab.position.set(0.5, 0.54, 0);
      const wind = mBox(THREE, 0.08, 0.26, 0.68, p.glassMat);
      wind.position.set(0.77, 0.62, 0);
      core.add(cargo, cab, wind);
      [-0.54, 0.48].forEach((wx) => {
        [-0.44, 0.44].forEach((wz) => {
          const tire = mCyl(THREE, 0.2, 0.2, 0.14, 14, p.rubberMat);
          tire.rotation.x = Math.PI / 2;
          tire.position.set(wx, 0.2, wz);
          core.add(tire);
        });
      });
      break;
    }

    case 'train': {
      const boiler = mCyl(THREE, 0.36, 0.36, 1.05, 14, p.mainMat);
      boiler.rotation.z = Math.PI / 2;
      boiler.position.set(0.14, 0.62, 0);
      const cab = mRoundBox(THREE, 0.62, 0.88, 0.06, 0.76, 0.025, p.accentMat);
      cab.position.set(-0.56, 0.76, 0);
      const chimney = mCyl(THREE, 0.14, 0.1, 0.4, 12, p.darkMat);
      chimney.position.set(0.45, 1.08, 0);
      const cowCatcher = mCone(THREE, 0.36, 0.34, 4, p.goldMat);
      cowCatcher.rotation.z = -Math.PI / 2;
      cowCatcher.position.set(0.8, 0.4, 0);
      core.add(boiler, cab, chimney, cowCatcher);
      [-0.55, 0, 0.5].forEach((wx) => {
        [-0.4, 0.4].forEach((wz) => {
          const w = mCyl(THREE, 0.19, 0.19, 0.1, 12, p.darkMat);
          w.rotation.x = Math.PI / 2;
          w.position.set(wx, 0.19, wz);
          core.add(w);
        });
      });
      break;
    }

    case 'bicycle': {
      [-0.58, 0.58].forEach((wx) => {
        const wheel = mTorus(THREE, 0.34, 0.055, 8, 20, p.rubberMat);
        wheel.position.set(wx, 0.38, 0);
        const rim = mTorus(THREE, 0.26, 0.02, 6, 18, p.goldMat);
        rim.position.set(wx, 0.38, 0);
        core.add(wheel, rim);
      });
      const bar1 = mCyl(THREE, 0.04, 0.04, 0.72, 8, p.mainMat);
      bar1.rotation.z = Math.PI / 2 - 0.18;
      bar1.position.set(0, 0.68, 0);
      const post1 = mCyl(THREE, 0.04, 0.04, 0.56, 8, p.mainMat);
      post1.position.set(-0.22, 0.66, 0);
      post1.rotation.z = 0.25;
      const fork = mCyl(THREE, 0.04, 0.04, 0.68, 8, p.accentMat);
      fork.position.set(0.46, 0.66, 0);
      fork.rotation.z = 0.28;
      const seat = mRoundBox(THREE, 0.26, 0.08, 0.03, 0.14, 0.01, p.darkMat);
      seat.position.set(-0.28, 0.96, 0);
      const handle = mCyl(THREE, 0.03, 0.03, 0.44, 8, p.darkMat);
      handle.rotation.x = Math.PI / 2;
      handle.position.set(0.36, 1.0, 0);
      core.add(bar1, post1, fork, seat, handle);
      break;
    }

    case 'motorbike': {
      [-0.54, 0.54].forEach((wx) => {
        const w = mTorus(THREE, 0.28, 0.09, 8, 18, p.rubberMat);
        w.position.set(wx, 0.34, 0);
        core.add(w);
      });
      const frame = mRoundBox(THREE, 0.96, 0.32, 0.08, 0.32, 0.03, p.mainMat);
      frame.position.set(0, 0.58, 0);
      const seat = mRoundBox(THREE, 0.52, 0.12, 0.04, 0.28, 0.015, p.darkMat);
      seat.position.set(-0.16, 0.78, 0);
      const fork = mCyl(THREE, 0.045, 0.045, 0.64, 8, p.accentMat);
      fork.position.set(0.42, 0.62, 0);
      fork.rotation.z = 0.42;
      const handle = mCyl(THREE, 0.03, 0.03, 0.46, 8, p.darkMat);
      handle.rotation.x = Math.PI / 2;
      handle.position.set(0.28, 0.92, 0);
      core.add(frame, seat, fork, handle);
      break;
    }

    case 'skateboard': {
      const deck = mRoundBox(THREE, 1.48, 0.08, 0.2, 0.42, 0.02, p.mainMat);
      deck.position.y = 0.26;
      deck.rotation.x = Math.PI / 2;
      deck.rotation.z = 0.12;
      [-0.45, 0.45].forEach((wx) => {
        const truck = mBox(THREE, 0.08, 0.12, 0.36, p.accentMat);
        truck.position.set(wx, 0.16 + (wx > 0 ? 0.05 : -0.05), 0);
        [-0.22, 0.22].forEach((wz) => {
          const wheel = mCyl(THREE, 0.11, 0.11, 0.09, 12, p.goldMat);
          wheel.rotation.x = Math.PI / 2;
          wheel.position.set(wx, 0.11 + (wx > 0 ? 0.05 : -0.05), wz);
          core.add(wheel);
        });
        core.add(truck);
      });
      core.add(deck);
      break;
    }

    case 'plane': {
      const fuse = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 1.12, 8, 14), p.mainMat);
      fuse.rotation.z = Math.PI / 2;
      fuse.position.y = 0.62;
      fuse.castShadow = true;
      const wing = mRoundBox(THREE, 0.46, 0.06, 0.04, 1.64, 0.015, p.accentMat);
      wing.position.set(0.05, 0.62, 0);
      wing.rotation.x = Math.PI / 2;
      const tailV = mRoundBox(THREE, 0.24, 0.4, 0.04, 0.06, 0.01, p.accentMat);
      tailV.position.set(-0.62, 0.85, 0);
      const canopy = mSph(THREE, 0.18, 10, 8, p.glassMat);
      canopy.scale.set(1.4, 0.75, 0.85);
      canopy.position.set(0.32, 0.78, 0);
      core.add(fuse, wing, tailV, canopy);
      break;
    }

    case 'helicopter': {
      const pod = mSph(THREE, 0.46, 14, 12, p.mainMat);
      pod.scale.set(1.32, 0.92, 0.88);
      pod.position.set(0.08, 0.68, 0);
      const cockpit = mSph(THREE, 0.34, 12, 10, p.glassMat);
      cockpit.position.set(0.34, 0.72, 0);
      const boom = mCyl(THREE, 0.08, 0.12, 0.85, 8, p.accentMat);
      boom.rotation.z = Math.PI / 2;
      boom.position.set(-0.64, 0.72, 0);
      const mast = mCyl(THREE, 0.06, 0.06, 0.25, 8, p.darkMat);
      mast.position.set(0.05, 1.15, 0);
      const rotor1 = mBox(THREE, 1.65, 0.04, 0.12, p.darkMat);
      rotor1.position.set(0.05, 1.28, 0);
      const rotor2 = mBox(THREE, 0.12, 0.04, 1.65, p.darkMat);
      rotor2.position.set(0.05, 1.28, 0);
      [-0.3, 0.3].forEach((sz) => {
        const skid = mCyl(THREE, 0.04, 0.04, 1.1, 8, p.darkMat);
        skid.rotation.z = Math.PI / 2;
        skid.position.set(0.05, 0.05, sz);
        core.add(skid);
      });
      core.add(pod, cockpit, boom, mast, rotor1, rotor2);
      break;
    }

    case 'ship': {
      const hull = mRoundBox(THREE, 1.54, 0.44, 0.12, 0.72, 0.04, p.mainMat);
      hull.position.y = 0.26;
      const bow = mCone(THREE, 0.38, 0.56, 4, p.mainMat);
      bow.rotation.z = -Math.PI / 2;
      bow.position.set(0.95, 0.28, 0);
      const mast = mCyl(THREE, 0.045, 0.055, 1.28, 10, mats.get('#78350F', { roughness: 0.6 }));
      mast.position.set(0, 0.96, 0);
      const sail1 = mRoundBox(THREE, 0.06, 0.72, 0.03, 0.68, 0.015, p.whiteMat);
      sail1.position.set(0.18, 1.1, 0);
      sail1.rotation.y = 0.25;
      const flag = mBox(THREE, 0.28, 0.16, 0.04, p.accentMat);
      flag.position.set(0.16, 1.54, 0);
      core.add(hull, bow, mast, sail1, flag);
      break;
    }

    case 'submarine': {
      const subBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 1.05, 8, 16), p.mainMat);
      subBody.rotation.z = Math.PI / 2;
      subBody.position.y = 0.55;
      subBody.castShadow = true;
      const tower = mRoundBox(THREE, 0.42, 0.34, 0.08, 0.28, 0.02, p.accentMat);
      tower.position.set(0.08, 1.0, 0);
      const periV = mCyl(THREE, 0.045, 0.045, 0.34, 8, p.darkMat);
      periV.position.set(0.1, 1.28, 0);
      const periH = mCyl(THREE, 0.045, 0.045, 0.18, 8, p.goldMat);
      periH.rotation.z = Math.PI / 2;
      periH.position.set(0.18, 1.42, 0);
      [-0.28, 0.08, 0.42].forEach((px) => {
        const port = mCyl(THREE, 0.1, 0.1, 0.82, 10, p.glassMat);
        port.rotation.x = Math.PI / 2;
        port.position.set(px, 0.56, 0);
        core.add(port);
      });
      const tailProp = mCone(THREE, 0.22, 0.24, 6, p.goldMat);
      tailProp.rotation.z = Math.PI / 2;
      tailProp.position.set(-0.96, 0.55, 0);
      core.add(subBody, tower, periV, periH, tailProp);
      break;
    }

    case 'rocket': {
      const body = mCyl(THREE, 0.32, 0.38, 1.05, 16, p.mainMat);
      body.position.y = 0.88;
      const nose = mCone(THREE, 0.33, 0.54, 16, p.accentMat);
      nose.position.y = 1.66;
      const porthole = mTorus(THREE, 0.14, 0.035, 8, 16, p.goldMat);
      porthole.position.set(0, 1.0, 0.34);
      const windowGlass = mSph(THREE, 0.12, 10, 8, p.glassMat);
      windowGlass.position.set(0, 1.0, 0.32);
      for (let f = 0; f < 3; f++) {
        const a = (f * Math.PI * 2) / 3;
        const fin = mRoundBox(THREE, 0.06, 0.42, 0.02, 0.32, 0.01, p.accentMat);
        fin.position.set(Math.sin(a) * 0.4, 0.5, Math.cos(a) * 0.4);
        fin.rotation.y = a;
        core.add(fin);
      }
      const flame = mCone(THREE, 0.22, 0.44, 10, mats.get('#F97316', { emissive: '#EA580C', emissiveIntensity: 0.8 }));
      flame.rotation.x = Math.PI;
      flame.position.y = 0.22;
      core.add(body, nose, porthole, windowGlass, flame);
      break;
    }

    case 'ufo': {
      const saucer = mSph(THREE, 0.88, 18, 10, p.mainMat);
      saucer.scale.set(1, 0.28, 1);
      saucer.position.y = 0.62;
      const dome = mSph(THREE, 0.46, 16, 12, p.glassMat);
      dome.position.y = 0.78;
      const beam = mCone(THREE, 0.6, 0.56, 16, mats.get('#38BDF8', { transparent: true, opacity: 0.28, emissive: '#38BDF8', emissiveIntensity: 0.45 }), false);
      beam.position.y = 0.28;
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI * 2) / 6;
        const pod = mSph(THREE, 0.08, 8, 6, p.goldMat);
        pod.position.set(Math.cos(a) * 0.74, 0.62, Math.sin(a) * 0.74);
        core.add(pod);
      }
      core.add(saucer, dome, beam);
      break;
    }

    case 'guitar': {
      return buildDetailedAcousticGuitar3D(THREE, mats, spec.color || '#EA580C', spec.accent || '#78350F', true);
    }

    case 'piano': {
      const cabinet = mRoundBox(THREE, 1.48, 0.92, 0.06, 0.66, 0.02, p.mainMat);
      cabinet.position.set(0, 0.62, -0.08);
      const keybed = mBox(THREE, 1.44, 0.16, 0.46, p.accentMat);
      keybed.position.set(0, 0.56, 0.32);
      const whiteKeys = mBox(THREE, 1.28, 0.07, 0.32, p.whiteMat);
      whiteKeys.position.set(0, 0.66, 0.34);
      for (let k = -5; k <= 5; k++) {
        if (k === 0 || k === 3 || k === -4) continue;
        const bk = mBox(THREE, 0.055, 0.09, 0.19, p.darkMat);
        bk.position.set(k * 0.11, 0.7, 0.28);
        core.add(bk);
      }
      [-0.6, 0.6].forEach((lx) => {
        const leg = mBox(THREE, 0.1, 0.52, 0.1, p.darkMat);
        leg.position.set(lx, 0.26, 0.42);
        core.add(leg);
      });
      core.add(cabinet, keybed, whiteKeys);
      break;
    }

    case 'drum': {
      const shell = mCyl(THREE, 0.56, 0.56, 0.68, 20, p.mainMat);
      shell.position.y = 0.44;
      const headTop = mCyl(THREE, 0.54, 0.54, 0.06, 20, p.whiteMat);
      headTop.position.y = 0.79;
      const rim = mTorus(THREE, 0.56, 0.045, 8, 22, p.goldMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.79;
      [-0.35, 0.35].forEach((sx) => {
        const stick = mCyl(THREE, 0.022, 0.028, 0.68, 8, mats.get('#B47B48', {}));
        stick.position.set(sx, 0.92, 0.1);
        stick.rotation.z = sx > 0 ? 0.55 : -0.55;
        stick.rotation.x = 0.35;
        core.add(stick);
      });
      core.add(shell, headTop, rim);
      break;
    }

    case 'pencil': {
      const wrap = new THREE.Group();
      wrap.position.set(0, 0.85, 0);
      wrap.rotation.z = -0.45;
      const shaft = mCyl(THREE, 0.16, 0.16, 1.15, 6, spec.material === 'crystal' ? p.goldMat : p.mainMat);
      const ferrule = mCyl(THREE, 0.165, 0.165, 0.16, 12, p.whiteMat);
      ferrule.position.y = 0.65;
      const eraser = mCyl(THREE, 0.155, 0.155, 0.2, 12, mats.get('#F472B6', { roughness: 0.65 }));
      eraser.position.y = 0.82;
      const woodCone = mCone(THREE, 0.16, 0.38, 6, mats.get('#FDE68A', { roughness: 0.75 }));
      woodCone.rotation.x = Math.PI;
      woodCone.position.y = -0.76;
      const tip = mCone(THREE, 0.055, 0.14, 6, p.darkMat);
      tip.rotation.x = Math.PI;
      tip.position.y = -0.92;
      wrap.add(shaft, ferrule, eraser, woodCone, tip);
      core.add(wrap);
      break;
    }

    case 'ball': {
      const ball = mSph(THREE, 0.56, 18, 14, spec.material === 'crystal' ? p.whiteMat : p.mainMat);
      ball.position.y = 0.58;
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI * 2) / 6;
        const patch = mCyl(THREE, 0.16, 0.16, 0.06, 5, p.darkMat);
        patch.position.set(Math.cos(a) * 0.52, 0.58 + (i % 2 === 0 ? 0.12 : -0.12), Math.sin(a) * 0.52);
        patch.lookAt(0, 0.58, 0);
        patch.rotateX(Math.PI / 2);
        core.add(patch);
      }
      core.add(ball);
      break;
    }

    case 'telescope': {
      [-0.45, 0, 0.45].forEach((tx, ti) => {
        const leg = mCyl(THREE, 0.04, 0.03, 0.92, 8, p.darkMat);
        const ang = (ti * Math.PI * 2) / 3;
        leg.position.set(Math.cos(ang) * 0.24, 0.42, Math.sin(ang) * 0.24);
        leg.rotation.z = -Math.cos(ang) * 0.32;
        leg.rotation.x = Math.sin(ang) * 0.32;
        core.add(leg);
      });
      const tube = mCyl(THREE, 0.16, 0.11, 1.18, 14, p.mainMat);
      tube.position.set(0.06, 0.96, 0);
      tube.rotation.z = -0.95;
      const lens = mCyl(THREE, 0.17, 0.17, 0.08, 14, p.glassMat);
      lens.position.set(0.52, 1.28, 0);
      lens.rotation.z = -0.95;
      core.add(tube, lens);
      break;
    }

    case 'camera': {
      const body = mRoundBox(THREE, 1.16, 0.72, 0.08, 0.42, 0.03, p.mainMat);
      body.position.y = 0.44;
      const top = mRoundBox(THREE, 0.48, 0.18, 0.04, 0.34, 0.02, p.accentMat);
      top.position.y = 0.86;
      const barrel = mCyl(THREE, 0.26, 0.28, 0.3, 16, p.darkMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.44, 0.3);
      const lens = mSph(THREE, 0.19, 12, 10, p.glassMat);
      lens.scale.set(1, 1, 0.45);
      lens.position.set(0, 0.44, 0.44);
      const shutter = mCyl(THREE, 0.07, 0.07, 0.08, 10, p.goldMat);
      shutter.position.set(0.38, 0.84, 0);
      core.add(body, top, barrel, lens, shutter);
      break;
    }

    case 'headphones': {
      const arc = mTorus(THREE, 0.56, 0.075, 10, 22, p.mainMat, );
      arc.position.y = 0.78;
      arc.geometry = new THREE.TorusGeometry(0.56, 0.075, 10, 22, Math.PI);
      [-0.56, 0.56].forEach((hx) => {
        const cup = mCyl(THREE, 0.22, 0.22, 0.18, 14, p.accentMat);
        cup.rotation.z = Math.PI / 2;
        cup.position.set(hx, 0.52, 0);
        const pad = mTorus(THREE, 0.2, 0.06, 8, 16, p.darkMat);
        pad.rotation.y = Math.PI / 2;
        pad.position.set(hx * 0.86, 0.52, 0);
        core.add(cup, pad);
      });
      core.add(arc);
      break;
    }

    case 'clock': {
      const caseBody = mCyl(THREE, 0.64, 0.64, 0.24, 22, p.mainMat);
      caseBody.rotation.x = Math.PI / 2;
      caseBody.position.y = 0.72;
      const face = mCyl(THREE, 0.52, 0.52, 0.26, 22, p.whiteMat);
      face.rotation.x = Math.PI / 2;
      face.position.y = 0.72;
      const handH = mBox(THREE, 0.05, 0.28, 0.04, p.darkMat);
      handH.position.set(0, 0.84, 0.15);
      const handM = mBox(THREE, 0.26, 0.045, 0.04, mats.get('#EF4444', {}));
      handM.position.set(0.12, 0.72, 0.16);
      [-0.45, 0.45].forEach((bx) => {
        const bell = mSph(THREE, 0.17, 10, 8, p.goldMat);
        bell.position.set(bx, 1.3, 0);
        core.add(bell);
      });
      core.add(caseBody, face, handH, handM);
      break;
    }

    case 'lamp': {
      const base = mCyl(THREE, 0.34, 0.42, 0.14, 16, p.darkMat);
      base.position.y = 0.07;
      const stem = mCyl(THREE, 0.07, 0.08, 0.65, 10, p.goldMat);
      stem.position.y = 0.45;
      const shade = mCyl(THREE, 0.32, 0.58, 0.54, 16, mats.get(spec.color || '#FDE047', { emissive: spec.color || '#FACC15', emissiveIntensity: 0.45 }));
      shade.position.y = 0.96;
      core.add(base, stem, shade);
      break;
    }

    case 'umbrella': {
      const shaft = mCyl(THREE, 0.04, 0.04, 1.25, 10, mats.get('#78350F', {}));
      shaft.position.y = 0.66;
      const canopy = mCone(THREE, 0.82, 0.42, 12, p.mainMat);
      canopy.position.y = 1.18;
      const tip = mCone(THREE, 0.05, 0.16, 8, p.goldMat);
      tip.position.y = 1.46;
      core.add(shaft, canopy, tip);
      break;
    }

    case 'backpack': {
      const mainBag = mRoundBox(THREE, 0.9, 1.06, 0.16, 0.48, 0.04, p.mainMat);
      mainBag.position.y = 0.58;
      const pocket = mRoundBox(THREE, 0.68, 0.44, 0.08, 0.18, 0.02, p.accentMat);
      pocket.position.set(0, 0.36, 0.28);
      const buckle = mBox(THREE, 0.18, 0.12, 0.08, p.goldMat);
      buckle.position.set(0, 0.6, 0.27);
      const handle = mTorus(THREE, 0.16, 0.04, 8, 14, p.darkMat);
      handle.position.set(0, 1.16, 0);
      core.add(mainBag, pocket, buckle, handle);
      break;
    }

    case 'shoe': {
      const sole = mRoundBox(THREE, 1.18, 0.16, 0.06, 0.5, 0.02, p.whiteMat);
      sole.position.y = 0.09;
      const upper = mRoundBox(THREE, 0.94, 0.44, 0.12, 0.44, 0.03, p.mainMat);
      upper.position.set(-0.08, 0.34, 0);
      const toe = mSph(THREE, 0.24, 10, 8, p.accentMat);
      toe.scale.set(1.2, 0.72, 0.92);
      toe.position.set(0.36, 0.28, 0);
      core.add(sole, upper, toe);
      break;
    }

    case 'trophy': {
      const base = mCyl(THREE, 0.34, 0.4, 0.24, 14, mats.get('#78350F', { roughness: 0.6 }));
      base.position.y = 0.12;
      const stem = mCyl(THREE, 0.1, 0.14, 0.42, 12, p.goldMat);
      stem.position.y = 0.44;
      const cup = mCyl(THREE, 0.48, 0.22, 0.58, 16, p.goldMat);
      cup.position.y = 0.92;
      [-0.46, 0.46].forEach((hx) => {
        const ear = mTorus(THREE, 0.16, 0.038, 8, 14, p.goldMat);
        ear.position.set(hx, 0.96, 0);
        core.add(ear);
      });
      core.add(base, stem, cup);
      break;
    }

    case 'gift': {
      const box = mRoundBox(THREE, 0.96, 0.88, 0.06, 0.96, 0.02, p.mainMat);
      box.position.y = 0.46;
      const lid = mRoundBox(THREE, 1.06, 0.2, 0.04, 1.06, 0.02, p.accentMat);
      lid.position.y = 0.94;
      const rib1 = mBox(THREE, 0.18, 1.04, 1.08, p.goldMat);
      rib1.position.y = 0.54;
      const rib2 = mBox(THREE, 1.08, 1.04, 0.18, p.goldMat);
      rib2.position.y = 0.54;
      core.add(box, lid, rib1, rib2);
      break;
    }

    case 'chest': {
      const bottom = mRoundBox(THREE, 1.24, 0.62, 0.04, 0.78, 0.02, p.mainMat);
      bottom.position.y = 0.33;
      const lid = mCyl(THREE, 0.39, 0.39, 1.24, 12, p.accentMat);
      lid.rotation.z = Math.PI / 2;
      lid.position.y = 0.64;
      const lock = mBox(THREE, 0.22, 0.26, 0.1, p.goldMat);
      lock.position.set(0, 0.58, 0.41);
      core.add(bottom, lid, lock);
      break;
    }

    case 'potion': {
      const flask = mSph(THREE, 0.52, 16, 12, p.mainMat);
      flask.position.y = 0.54;
      const neck = mCyl(THREE, 0.16, 0.22, 0.36, 12, p.glassMat);
      neck.position.y = 1.12;
      const cork = mCyl(THREE, 0.14, 0.12, 0.18, 10, mats.get('#92400E', { roughness: 0.8 }));
      cork.position.y = 1.36;
      core.add(flask, neck, cork);
      break;
    }

    case 'wand': {
      const stick = mCyl(THREE, 0.045, 0.055, 1.25, 10, mats.get('#78350F', { roughness: 0.6 }));
      stick.position.set(-0.1, 0.62, 0);
      stick.rotation.z = -0.35;
      const starGeo = new THREE.ExtrudeGeometry(createStarShape(THREE, 0.32, 0.14, 5), { depth: 0.1, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02 });
      starGeo.center();
      const star = new THREE.Mesh(starGeo, p.goldMat);
      star.position.set(0.14, 1.26, 0);
      star.castShadow = true;
      core.add(stick, star);
      break;
    }

    case 'sword': {
      const grip = mCyl(THREE, 0.06, 0.07, 0.36, 10, mats.get('#78350F', {}));
      grip.position.y = 0.2;
      const guard = mRoundBox(THREE, 0.64, 0.1, 0.03, 0.14, 0.015, p.goldMat);
      guard.position.y = 0.42;
      const blade = mCone(THREE, 0.14, 1.18, 4, p.mainMat);
      blade.position.y = 1.04;
      core.add(grip, guard, blade);
      break;
    }

    case 'shield': {
      const s = new THREE.Shape();
      s.moveTo(-0.5, 0.56);
      s.lineTo(0, 0.68);
      s.lineTo(0.5, 0.56);
      s.lineTo(0.46, -0.1);
      s.quadraticCurveTo(0, -0.68, 0, -0.68);
      s.quadraticCurveTo(0, -0.68, -0.46, -0.1);
      s.closePath();
      const shieldGeo = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03 });
      shieldGeo.center();
      const shieldMesh = new THREE.Mesh(shieldGeo, p.mainMat);
      shieldMesh.position.y = 0.72;
      shieldMesh.castShadow = true;
      const boss = mSph(THREE, 0.18, 10, 8, p.goldMat);
      boss.position.set(0, 0.72, 0.12);
      core.add(shieldMesh, boss);
      break;
    }

    case 'key': {
      const ring = mTorus(THREE, 0.28, 0.075, 10, 20, p.goldMat);
      ring.position.set(-0.46, 0.66, 0);
      const stem = mCyl(THREE, 0.06, 0.06, 0.96, 10, p.mainMat);
      stem.rotation.z = Math.PI / 2;
      stem.position.set(0.22, 0.66, 0);
      const t1 = mBox(THREE, 0.1, 0.22, 0.08, p.goldMat);
      t1.position.set(0.48, 0.52, 0);
      const t2 = mBox(THREE, 0.1, 0.18, 0.08, p.goldMat);
      t2.position.set(0.64, 0.54, 0);
      core.add(ring, stem, t1, t2);
      break;
    }

    case 'kite': {
      const dShape = new THREE.Shape();
      dShape.moveTo(0, 0.68);
      dShape.lineTo(0.52, 0.1);
      dShape.lineTo(0, -0.64);
      dShape.lineTo(-0.52, 0.1);
      dShape.closePath();
      const kGeo = new THREE.ExtrudeGeometry(dShape, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015 });
      kGeo.center();
      const kite = new THREE.Mesh(kGeo, p.mainMat);
      kite.position.y = 0.86;
      kite.castShadow = true;
      const tail = mSph(THREE, 0.09, 8, 6, p.accentMat);
      tail.position.set(-0.1, 0.18, 0);
      core.add(kite, tail);
      break;
    }

    case 'throne': {
      const seat = mRoundBox(THREE, 0.96, 0.36, 0.06, 0.84, 0.03, p.mainMat);
      seat.position.y = 0.38;
      const back = mRoundBox(THREE, 0.88, 1.12, 0.1, 0.2, 0.03, p.accentMat);
      back.position.set(0, 0.92, -0.34);
      [-0.44, 0.44].forEach((ax) => {
        const arm = mBox(THREE, 0.12, 0.56, 0.82, p.goldMat);
        arm.position.set(ax, 0.52, 0);
        core.add(arm);
      });
      core.add(seat, back);
      break;
    }

    case 'table': {
      const top = mRoundBox(THREE, 1.5, 0.14, 0.06, 0.88, 0.02, p.mainMat);
      top.position.y = 0.78;
      top.rotation.x = Math.PI / 2;
      [-0.6, 0.6].forEach((lx) => {
        [-0.32, 0.32].forEach((lz) => {
          const leg = mCyl(THREE, 0.055, 0.045, 0.74, 8, mats.get('#78350F', {}));
          leg.position.set(lx, 0.37, lz);
          core.add(leg);
        });
      });
      core.add(top);
      break;
    }

    case 'book': {
      const coverL = mRoundBox(THREE, 0.68, 0.12, 0.03, 0.86, 0.015, p.mainMat);
      coverL.position.set(-0.32, 0.46, 0);
      coverL.rotation.z = -0.22;
      coverL.rotation.x = Math.PI / 2;
      const coverR = mRoundBox(THREE, 0.68, 0.12, 0.03, 0.86, 0.015, p.mainMat);
      coverR.position.set(0.32, 0.46, 0);
      coverR.rotation.z = 0.22;
      coverR.rotation.x = Math.PI / 2;
      const pages = mRoundBox(THREE, 1.18, 0.14, 0.02, 0.78, 0.01, p.whiteMat);
      pages.position.set(0, 0.52, 0);
      pages.rotation.x = Math.PI / 2;
      core.add(coverL, coverR, pages);
      break;
    }

    case 'crown': {
      const band = mCyl(THREE, 0.54, 0.48, 0.28, 16, p.goldMat);
      band.position.y = 0.34;
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI * 2) / 6;
        const spike = mCone(THREE, 0.13, 0.4, 6, p.goldMat);
        spike.position.set(Math.cos(a) * 0.46, 0.62, Math.sin(a) * 0.46);
        const jewel = mSph(THREE, 0.065, 8, 6, mats.get(i % 2 === 0 ? '#EF4444' : '#38BDF8', { emissive: i % 2 === 0 ? '#EF4444' : '#38BDF8', emissiveIntensity: 0.4 }));
        jewel.position.set(Math.cos(a) * 0.46, 0.84, Math.sin(a) * 0.46);
        core.add(spike, jewel);
      }
      core.add(band);
      break;
    }

    case 'planet': {
      const orb = mSph(THREE, 0.56, 18, 14, p.mainMat);
      orb.position.y = 0.78;
      const ring = mTorus(THREE, 0.94, 0.09, 8, 28, p.accentMat);
      ring.position.y = 0.78;
      ring.rotation.x = 1.15;
      ring.rotation.y = 0.3;
      core.add(orb, ring);
      break;
    }

    case 'sun': {
      const sunMat = mats.get('#FACC15', { emissive: '#F59E0B', emissiveIntensity: 0.55, roughness: 0.25 });
      const orb = mSph(THREE, 0.48, 16, 12, sunMat);
      orb.position.y = 0.78;
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI * 2) / 8;
        const ray = mCone(THREE, 0.12, 0.32, 6, sunMat);
        ray.position.set(Math.cos(a) * 0.66, 0.78 + Math.sin(a) * 0.66, 0);
        ray.rotation.z = a - Math.PI / 2;
        core.add(ray);
      }
      core.add(orb);
      break;
    }

    case 'moon': {
      const ms = new THREE.Shape();
      ms.absarc(0, 0, 0.62, 0.55, Math.PI * 1.45, false);
      ms.absarc(0.24, 0.1, 0.5, Math.PI * 1.38, 0.62, true);
      ms.closePath();
      const mGeo = new THREE.ExtrudeGeometry(ms, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04 });
      mGeo.center();
      const moon = new THREE.Mesh(mGeo, mats.get('#FACC15', { emissive: '#F59E0B', emissiveIntensity: 0.35, roughness: 0.3 }));
      moon.position.y = 0.76;
      moon.castShadow = true;
      core.add(moon);
      break;
    }

    case 'star': {
      const sGeo = new THREE.ExtrudeGeometry(createStarShape(THREE, 0.68, 0.3, 5), { depth: 0.22, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05 });
      sGeo.center();
      const star = new THREE.Mesh(sGeo, spec.material === 'crystal' ? p.goldMat : p.mainMat);
      star.position.y = 0.76;
      star.castShadow = true;
      core.add(star);
      break;
    }

    case 'heart': {
      const hGeo = new THREE.ExtrudeGeometry(createHeartShape(THREE, 0.78), { depth: 0.24, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05 });
      hGeo.center();
      const heart = new THREE.Mesh(hGeo, spec.material === 'crystal' ? mats.get('#F43F5E', { roughness: 0.2 }) : p.mainMat);
      heart.position.y = 0.74;
      heart.castShadow = true;
      core.add(heart);
      break;
    }

    case 'diamond': {
      const gemTop = mCone(THREE, 0.56, 0.36, 8, p.accentMat);
      gemTop.position.y = 0.96;
      const gemBot = mCone(THREE, 0.56, 0.72, 8, p.mainMat);
      gemBot.rotation.x = Math.PI;
      gemBot.position.y = 0.42;
      core.add(gemTop, gemBot);
      break;
    }

    case 'lightning': {
      const ls = new THREE.Shape();
      ls.moveTo(0.14, 0.76);
      ls.lineTo(-0.34, 0.05);
      ls.lineTo(0.02, 0.05);
      ls.lineTo(-0.18, -0.72);
      ls.lineTo(0.36, -0.02);
      ls.lineTo(0.02, -0.02);
      ls.closePath();
      const lGeo = new THREE.ExtrudeGeometry(ls, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03 });
      lGeo.center();
      const bolt = new THREE.Mesh(lGeo, mats.get('#FACC15', { emissive: '#F59E0B', emissiveIntensity: 0.45 }));
      bolt.position.y = 0.78;
      bolt.castShadow = true;
      core.add(bolt);
      break;
    }

    case 'rainbow': {
      RAINBOW_HEX.forEach((hx, i) => {
        const arch = new THREE.Mesh(
          new THREE.TorusGeometry(0.84 - i * 0.1, 0.055, 8, 24, Math.PI),
          mats.get(hx, { roughness: 0.35 })
        );
        arch.position.y = 0.16;
        arch.castShadow = true;
        core.add(arch);
      });
      break;
    }

    case 'cloud': {
      [
        [0, 0.62, 0, 0.42],
        [-0.36, 0.54, 0, 0.3],
        [0.36, 0.54, 0, 0.3],
        [-0.14, 0.8, 0.12, 0.28],
        [0.18, 0.76, -0.1, 0.26],
      ].forEach(([cx, cy, cz, cr]) => {
        const puff = mSph(THREE, cr, 12, 10, p.whiteMat);
        puff.position.set(cx, cy, cz);
        core.add(puff);
      });
      break;
    }

    case 'flower': {
      const stem = mCyl(THREE, 0.05, 0.06, 0.65, 8, mats.get('#16A34A', {}));
      stem.position.y = 0.32;
      const center = mSph(THREE, 0.22, 12, 10, p.goldMat);
      center.position.y = 0.88;
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI * 2) / 6;
        const pet = mSph(THREE, 0.24, 10, 8, matOf(i));
        pet.scale.set(1, 0.7, 0.45);
        pet.position.set(Math.cos(a) * 0.36, 0.88 + Math.sin(a) * 0.36, 0);
        core.add(pet);
      }
      core.add(stem, center);
      break;
    }

    case 'mushroom': {
      const stalk = mCyl(THREE, 0.2, 0.25, 0.62, 12, mats.get('#FEF3C7', { roughness: 0.75 }));
      stalk.position.y = 0.31;
      const cap = mSph(THREE, 0.62, 16, 10, p.mainMat);
      cap.scale.set(1, 0.58, 1);
      cap.position.y = 0.68;
      [
        [-0.24, 0.86, 0.24],
        [0.26, 0.88, -0.18],
        [0.04, 0.98, 0.16],
      ].forEach(([dx, dy, dz]) => {
        const dot = mSph(THREE, 0.1, 8, 6, p.whiteMat);
        dot.position.set(dx, dy, dz);
        core.add(dot);
      });
      core.add(stalk, cap);
      break;
    }

    case 'treehouse': {
      const trunk = mCyl(THREE, 0.28, 0.38, 0.88, 10, mats.get('#78350F', { roughness: 0.85 }));
      trunk.position.y = 0.44;
      const foliage = mSph(THREE, 0.72, 14, 10, mats.get('#16A34A', { roughness: 0.78, flatShading: true }));
      foliage.position.y = 1.24;
      const hut = mRoundBox(THREE, 0.62, 0.48, 0.04, 0.54, 0.02, mats.get('#FDE68A', { roughness: 0.65 }));
      hut.position.set(0.18, 1.05, 0.25);
      const roof = mCone(THREE, 0.48, 0.34, 4, p.mainMat);
      roof.rotation.y = Math.PI / 4;
      roof.position.set(0.18, 1.44, 0.25);
      core.add(trunk, foliage, hut, roof);
      break;
    }

    case 'volcano': {
      const cone = mCone(THREE, 0.78, 1.15, 14, p.mainMat);
      cone.position.y = 0.575;
      const lava = mCyl(THREE, 0.22, 0.22, 0.14, 12, mats.get('#F97316', { emissive: '#EA580C', emissiveIntensity: 0.85 }));
      lava.position.y = 1.12;
      const plume = mSph(THREE, 0.22, 10, 8, mats.get('#FACC15', { emissive: '#F59E0B', emissiveIntensity: 0.6 }));
      plume.position.y = 1.32;
      core.add(cone, lava, plume);
      break;
    }

    case 'castle': {
      const keep = mRoundBox(THREE, 1.05, 0.92, 0.04, 0.82, 0.02, p.mainMat);
      keep.position.y = 0.46;
      const gate = mRoundBox(THREE, 0.32, 0.46, 0.14, 0.12, 0.01, p.darkMat);
      gate.position.set(0, 0.24, 0.4);
      [-0.56, 0.56].forEach((tx) => {
        const tower = mCyl(THREE, 0.22, 0.24, 1.2, 12, p.mainMat);
        tower.position.set(tx, 0.6, 0);
        const roof = mCone(THREE, 0.28, 0.48, 12, p.accentMat);
        roof.position.set(tx, 1.42, 0);
        core.add(tower, roof);
      });
      core.add(keep, gate);
      break;
    }

    case 'pizza': {
      const slice = new THREE.Shape();
      slice.moveTo(0, 0.72);
      slice.lineTo(0.56, -0.52);
      slice.lineTo(-0.56, -0.52);
      slice.closePath();
      const pGeo = new THREE.ExtrudeGeometry(slice, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02 });
      pGeo.center();
      const cheese = new THREE.Mesh(pGeo, mats.get('#FDE047', { roughness: 0.45 }));
      cheese.position.y = 0.64;
      const crust = mCyl(THREE, 0.1, 0.1, 1.18, 10, mats.get('#D97706', { roughness: 0.78 }));
      crust.rotation.z = Math.PI / 2;
      crust.position.y = 0.14;
      [
        [0, 0.86],
        [-0.2, 0.46],
        [0.2, 0.42],
      ].forEach(([px, py]) => {
        const pep = mCyl(THREE, 0.11, 0.11, 0.04, 10, mats.get('#EF4444', {}));
        pep.rotation.x = Math.PI / 2;
        pep.position.set(px, py, 0.07);
        core.add(pep);
      });
      core.add(cheese, crust);
      break;
    }

    case 'burger': {
      const bunB = mCyl(THREE, 0.56, 0.52, 0.2, 18, mats.get('#F59E0B', { roughness: 0.7 }));
      bunB.position.y = 0.12;
      const patty = mCyl(THREE, 0.58, 0.58, 0.18, 18, mats.get('#78350F', { roughness: 0.8 }));
      patty.position.y = 0.31;
      const lettuce = mCyl(THREE, 0.6, 0.6, 0.08, 16, mats.get('#22C55E', { roughness: 0.65 }));
      lettuce.position.y = 0.44;
      const bunT = mSph(THREE, 0.56, 18, 10, mats.get('#F59E0B', { roughness: 0.65 }));
      bunT.scale.set(1, 0.58, 1);
      bunT.position.y = 0.52;
      core.add(bunB, patty, lettuce, bunT);
      break;
    }

    case 'donut': {
      const dough = mTorus(THREE, 0.48, 0.22, 14, 24, mats.get('#F59E0B', { roughness: 0.72 }));
      dough.position.y = 0.66;
      const icing = mTorus(THREE, 0.48, 0.2, 14, 24, p.mainMat);
      icing.position.set(0, 0.66, 0.05);
      core.add(dough, icing);
      break;
    }

    case 'lollipop': {
      const stick = mCyl(THREE, 0.045, 0.045, 0.85, 10, p.whiteMat);
      stick.position.y = 0.425;
      const candy = mCyl(THREE, 0.46, 0.46, 0.18, 20, p.mainMat);
      candy.rotation.x = Math.PI / 2;
      candy.position.y = 1.12;
      const swirl = mTorus(THREE, 0.26, 0.045, 8, 18, p.whiteMat);
      swirl.position.set(0, 1.12, 0.08);
      core.add(stick, candy, swirl);
      break;
    }

    case 'watermelon': {
      const rind = mCyl(THREE, 0.66, 0.66, 0.22, 20, mats.get('#16A34A', { roughness: 0.6 }), true, true);
      rind.rotation.x = Math.PI / 2;
      rind.geometry = new THREE.CylinderGeometry(0.66, 0.66, 0.22, 20, 1, false, 0, Math.PI);
      rind.rotation.z = Math.PI;
      rind.position.y = 0.7;
      const flesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.56, 0.56, 0.24, 20, 1, false, 0, Math.PI),
        mats.get('#EF4444', { roughness: 0.5 })
      );
      flesh.rotation.x = Math.PI / 2;
      flesh.rotation.z = Math.PI;
      flesh.position.y = 0.7;
      core.add(rind, flesh);
      break;
    }

    case 'apple': {
      const body = mSph(THREE, 0.52, 16, 12, spec.material === 'crystal' ? mats.get('#EF4444', { roughness: 0.25 }) : p.mainMat);
      body.scale.set(1.06, 0.94, 1);
      body.position.y = 0.54;
      const stem = mCyl(THREE, 0.035, 0.04, 0.26, 8, mats.get('#78350F', {}));
      stem.position.y = 1.06;
      const leaf = mCone(THREE, 0.12, 0.3, 6, mats.get('#22C55E', {}));
      leaf.rotation.z = -1.1;
      leaf.position.set(0.16, 1.12, 0);
      core.add(body, stem, leaf);
      break;
    }

    case 'cake': {
      const sponge = mCyl(THREE, 0.56, 0.58, 0.44, 18, p.mainMat);
      sponge.position.y = 0.22;
      const cream = mCyl(THREE, 0.58, 0.58, 0.16, 18, p.whiteMat);
      cream.position.y = 0.48;
      const berry = mSph(THREE, 0.14, 10, 8, mats.get('#EF4444', { roughness: 0.3 }));
      berry.position.y = 0.68;
      core.add(sponge, cream, berry);
      break;
    }

    case 'mug': {
      const cup = mCyl(THREE, 0.42, 0.38, 0.76, 18, p.mainMat);
      cup.position.y = 0.38;
      const handle = mTorus(THREE, 0.22, 0.055, 8, 16, p.accentMat);
      handle.position.set(0.42, 0.42, 0);
      const coffee = mCyl(THREE, 0.36, 0.36, 0.06, 16, mats.get('#451A03', { roughness: 0.2 }));
      coffee.position.y = 0.74;
      core.add(cup, handle, coffee);
      break;
    }

    case 'lantern': {
      const capB = mCyl(THREE, 0.3, 0.34, 0.1, 14, p.darkMat);
      capB.position.y = 0.06;
      const globe = mSph(THREE, 0.48, 16, 12, mats.get(spec.color || '#F43F5E', { emissive: spec.accent || '#FACC15', emissiveIntensity: 0.48 }));
      globe.scale.set(1, 1.15, 1);
      globe.position.y = 0.62;
      const capT = mCyl(THREE, 0.26, 0.32, 0.1, 14, p.darkMat);
      capT.position.y = 1.18;
      core.add(capB, globe, capT);
      break;
    }

    case 'candle': {
      const holder = mCyl(THREE, 0.42, 0.48, 0.12, 16, p.goldMat);
      holder.position.y = 0.06;
      const wax = mCyl(THREE, 0.22, 0.24, 0.86, 14, p.mainMat);
      wax.position.y = 0.54;
      const flame = mCone(THREE, 0.1, 0.28, 10, mats.get('#FACC15', { emissive: '#F59E0B', emissiveIntensity: 0.9 }));
      flame.position.y = 1.14;
      core.add(holder, wax, flame);
      break;
    }

    case 'robot': {
      const torso = mRoundBox(THREE, 0.76, 0.68, 0.12, 0.54, 0.03, p.mainMat);
      torso.position.y = 0.56;
      const chest = mBox(THREE, 0.44, 0.34, 0.06, p.accentMat);
      chest.position.set(0, 0.58, 0.29);
      const head = mRoundBox(THREE, 0.64, 0.52, 0.12, 0.5, 0.03, p.mainMat);
      head.position.y = 1.2;
      const visor = mRoundBox(THREE, 0.48, 0.18, 0.05, 0.06, 0.01, p.glassMat);
      visor.position.set(0, 1.22, 0.26);
      const ant = mCyl(THREE, 0.025, 0.025, 0.24, 6, p.darkMat);
      ant.position.y = 1.56;
      const antBulb = mSph(THREE, 0.075, 8, 6, mats.get('#EF4444', { emissive: '#EF4444', emissiveIntensity: 0.8 }));
      antBulb.position.y = 1.7;
      [-0.22, 0.22].forEach((lx) => {
        const leg = mBox(THREE, 0.18, 0.24, 0.24, p.darkMat);
        leg.position.set(lx, 0.12, 0);
        core.add(leg);
      });
      core.add(torso, chest, head, visor, ant, antBulb);
      break;
    }

    case 'dino': {
      const body = mSph(THREE, 0.48, 14, 10, p.mainMat);
      body.scale.set(1.25, 0.9, 0.85);
      body.position.set(-0.08, 0.54, 0);
      const tail = mCone(THREE, 0.22, 0.65, 8, p.mainMat);
      tail.rotation.z = Math.PI / 2;
      tail.position.set(-0.76, 0.42, 0);
      const head = mRoundBox(THREE, 0.54, 0.42, 0.1, 0.4, 0.025, p.mainMat);
      head.position.set(0.42, 1.06, 0);
      [0, 1, 2].forEach((si) => {
        const sp = mCone(THREE, 0.09, 0.24, 4, p.goldMat);
        sp.position.set(-0.34 + si * 0.24, 0.98 + si * 0.12, 0);
        core.add(sp);
      });
      [-0.2, 0.2].forEach((lz) => {
        const leg = mCyl(THREE, 0.12, 0.14, 0.36, 8, p.mainMat);
        leg.position.set(0.05, 0.18, lz);
        const eye = mSph(THREE, 0.055, 8, 6, p.whiteMat);
        eye.position.set(0.56, 1.15, lz > 0 ? 0.2 : -0.2);
        core.add(leg, eye);
      });
      core.add(body, tail, head);
      break;
    }

    case 'dragon': {
      const body = mSph(THREE, 0.46, 14, 10, p.mainMat);
      body.scale.set(1.15, 0.95, 0.9);
      body.position.y = 0.54;
      const head = mSph(THREE, 0.34, 12, 10, p.mainMat);
      head.position.set(0.24, 1.08, 0);
      [-0.14, 0.14].forEach((hz) => {
        const horn = mCone(THREE, 0.06, 0.28, 6, p.goldMat);
        horn.position.set(0.14, 1.44, hz);
        horn.rotation.z = 0.28;
        core.add(horn);
      });
      const tail = mCone(THREE, 0.18, 0.68, 8, p.accentMat);
      tail.rotation.z = Math.PI / 2;
      tail.position.set(-0.68, 0.36, 0);
      core.add(body, head, tail);
      break;
    }

    case 'unicorn': {
      const body = mSph(THREE, 0.44, 14, 10, p.mainMat);
      body.scale.set(1.22, 0.88, 0.82);
      body.position.y = 0.56;
      const head = mSph(THREE, 0.3, 12, 10, p.mainMat);
      head.position.set(0.42, 1.04, 0);
      const horn = mCone(THREE, 0.065, 0.42, 8, p.goldMat);
      horn.position.set(0.5, 1.44, 0);
      horn.rotation.z = -0.35;
      [-0.3, 0.3].forEach((lx) => {
        [-0.22, 0.22].forEach((lz) => {
          const leg = mCyl(THREE, 0.075, 0.075, 0.36, 8, p.accentMat);
          leg.position.set(lx, 0.18, lz);
          core.add(leg);
        });
      });
      core.add(body, head, horn);
      break;
    }

    case 'phoenix': {
      const body = mSph(THREE, 0.42, 14, 10, mats.get('#EF4444', { emissive: '#DC2626', emissiveIntensity: 0.35 }));
      body.scale.set(0.95, 1.25, 0.9);
      body.position.y = 0.64;
      const chest = mSph(THREE, 0.28, 10, 8, p.goldMat);
      chest.position.set(0, 0.6, 0.22);
      const crest = mCone(THREE, 0.12, 0.36, 6, p.goldMat);
      crest.position.set(0, 1.28, 0);
      const beak = mCone(THREE, 0.08, 0.2, 5, p.goldMat);
      beak.rotation.x = Math.PI / 2;
      beak.position.set(0, 1.02, 0.42);
      core.add(body, chest, crest, beak);
      break;
    }

    case 'octopus': {
      const head = mSph(THREE, 0.48, 16, 12, p.mainMat);
      head.position.y = 0.78;
      for (let t = 0; t < 6; t++) {
        const a = (t * Math.PI * 2) / 6;
        const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.36, 6, 8), matOf(t));
        arm.position.set(Math.cos(a) * 0.42, 0.26, Math.sin(a) * 0.42);
        arm.rotation.z = -Math.cos(a) * 0.6;
        arm.rotation.x = Math.sin(a) * 0.6;
        core.add(arm);
      }
      [-0.18, 0.18].forEach((ex) => {
        const eye = mSph(THREE, 0.085, 8, 6, p.whiteMat);
        eye.position.set(ex, 0.82, 0.42);
        const p2 = mSph(THREE, 0.045, 6, 6, p.darkMat);
        p2.position.set(ex, 0.82, 0.49);
        core.add(eye, p2);
      });
      core.add(head);
      break;
    }

    case 'fish': {
      const body = mSph(THREE, 0.46, 16, 12, p.mainMat);
      body.scale.set(1.45, 0.92, 0.65);
      body.position.set(-0.08, 0.62, 0);
      const tail = mCone(THREE, 0.36, 0.48, 4, p.accentMat);
      tail.rotation.z = -Math.PI / 2;
      tail.position.set(-0.76, 0.62, 0);
      const eye = mSph(THREE, 0.08, 8, 6, p.whiteMat);
      eye.position.set(0.42, 0.72, 0.22);
      const eye2 = eye.clone();
      eye2.position.z = -0.22;
      core.add(body, tail, eye, eye2);
      break;
    }

    case 'butterfly': {
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.56, 6, 10), p.darkMat);
      body.position.y = 0.68;
      [-1, 1].forEach((s) => {
        const uw = mSph(THREE, 0.36, 10, 8, p.mainMat);
        uw.scale.set(1.2, 1.0, 0.16);
        uw.position.set(s * 0.42, 0.84, 0);
        const lw = mSph(THREE, 0.26, 10, 8, p.accentMat);
        lw.scale.set(1.1, 0.95, 0.16);
        lw.position.set(s * 0.34, 0.48, 0);
        core.add(uw, lw);
      });
      core.add(body);
      break;
    }

    case 'bee': {
      const body = mSph(THREE, 0.44, 14, 10, mats.get('#FACC15', {}));
      body.scale.set(1.35, 0.9, 0.9);
      body.position.y = 0.64;
      [-0.14, 0.14].forEach((sx) => {
        const stripe = mTorus(THREE, 0.4, 0.055, 8, 18, p.darkMat);
        stripe.rotation.y = Math.PI / 2;
        stripe.position.set(sx, 0.64, 0);
        core.add(stripe);
      });
      [-0.22, 0.22].forEach((wz) => {
        const wing = mSph(THREE, 0.26, 10, 8, p.glassMat);
        wing.scale.set(0.9, 0.25, 1.25);
        wing.position.set(0, 1.06, wz);
        core.add(wing);
      });
      core.add(body);
      break;
    }

    case 'penguin': {
      const body = mSph(THREE, 0.46, 14, 10, p.darkMat);
      body.scale.set(0.95, 1.24, 0.9);
      body.position.y = 0.58;
      const belly = mSph(THREE, 0.34, 12, 10, p.whiteMat);
      belly.scale.set(0.9, 1.1, 0.6);
      belly.position.set(0, 0.54, 0.24);
      const beak = mCone(THREE, 0.08, 0.22, 6, mats.get('#F59E0B', {}));
      beak.rotation.x = Math.PI / 2;
      beak.position.set(0, 0.88, 0.44);
      core.add(body, belly, beak);
      break;
    }

    case 'frog': {
      const body = mSph(THREE, 0.48, 14, 10, spec.material === 'crystal' ? mats.get('#22C55E', {}) : p.mainMat);
      body.scale.set(1.15, 0.82, 1.05);
      body.position.y = 0.42;
      [-0.22, 0.22].forEach((ex) => {
        const eyeBall = mSph(THREE, 0.16, 10, 8, p.whiteMat);
        eyeBall.position.set(ex, 0.84, 0.22);
        const pup = mSph(THREE, 0.075, 8, 6, p.darkMat);
        pup.position.set(ex, 0.86, 0.35);
        core.add(eyeBall, pup);
      });
      core.add(body);
      break;
    }

    case 'bunny':
    case 'cat':
    case 'fox':
    case 'panda':
    case 'bird': {
      const isPanda = shape === 'panda';
      const isBird = shape === 'bird';
      const headMat = isPanda ? p.whiteMat : p.mainMat;
      const body = mSph(THREE, 0.44, 14, 10, headMat);
      body.scale.set(0.95, 1.12, 0.9);
      body.position.y = 0.54;
      const head = mSph(THREE, 0.38, 14, 10, headMat);
      head.position.y = 1.08;
      [-0.22, 0.22].forEach((ex) => {
        if (shape === 'bunny') {
          const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.36, 6, 8), headMat);
          ear.position.set(ex * 0.72, 1.58, 0);
          core.add(ear);
        } else if (isPanda) {
          const ear = mSph(THREE, 0.12, 8, 6, p.darkMat);
          ear.position.set(ex * 1.3, 1.4, 0);
          const patch = mSph(THREE, 0.09, 8, 6, p.darkMat);
          patch.position.set(ex * 0.7, 1.12, 0.34);
          core.add(ear, patch);
        } else if (!isBird) {
          const ear = mCone(THREE, 0.11, 0.26, 6, p.mainMat);
          ear.position.set(ex * 1.15, 1.44, 0);
          core.add(ear);
        }
        const eye = mSph(THREE, 0.055, 8, 6, p.darkMat);
        eye.position.set(ex * 0.72, 1.12, 0.36);
        core.add(eye);
      });
      if (isBird) {
        const beak = mCone(THREE, 0.08, 0.2, 5, mats.get('#F59E0B', {}));
        beak.rotation.x = Math.PI / 2;
        beak.position.set(0, 1.04, 0.42);
        core.add(beak);
      }
      core.add(body, head);
      break;
    }

    case 'ghost': {
      const gBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.46, 8, 14), p.whiteMat);
      gBody.position.y = 0.66;
      [-0.16, 0.16].forEach((ex) => {
        const eye = mSph(THREE, 0.075, 8, 6, p.darkMat);
        eye.position.set(ex, 0.88, 0.38);
        core.add(eye);
      });
      core.add(gBody);
      break;
    }

    case 'snowman': {
      const b1 = mSph(THREE, 0.5, 14, 10, p.whiteMat);
      b1.position.y = 0.48;
      const b2 = mSph(THREE, 0.34, 14, 10, p.whiteMat);
      b2.position.y = 1.14;
      const nose = mCone(THREE, 0.055, 0.24, 8, mats.get('#F97316', {}));
      nose.rotation.x = Math.PI / 2;
      nose.position.set(0, 1.14, 0.38);
      const brim = mCyl(THREE, 0.42, 0.42, 0.06, 14, p.darkMat);
      brim.position.y = 1.46;
      const topHat = mCyl(THREE, 0.24, 0.26, 0.34, 14, p.darkMat);
      topHat.position.y = 1.64;
      core.add(b1, b2, nose, brim, topHat);
      break;
    }

    default: {
      // Crystal / geometric gem polyhedron fallback (not a white cylinder pedestal!)
      const ped = mCyl(THREE, 0.42, 0.52, 0.16, 8, p.accentMat);
      ped.position.y = 0.08;
      const oct = new THREE.Mesh(new THREE.OctahedronGeometry(0.56, 0), p.mainMat);
      oct.position.y = 0.78;
      oct.castShadow = true;
      core.add(ped, oct);
    }
  }

  // Compute bounding box of core so all modifiers attach flush & accurately
  const box = new THREE.Box3().setFromObject(core);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  // Lift core if we add wheels or legs underneath a non-wheeled base
  const needsExtraWheels = spec.hasWheels && !['bicycle', 'car', 'skateboard', 'truck', 'train', 'motorbike'].includes(shape);
  const needsExtraLegs = spec.hasLegs && !['dino', 'unicorn', 'robot', 'penguin', 'frog', 'bunny', 'cat', 'fox', 'panda'].includes(shape);
  let liftY = 0;
  if (needsExtraWheels) {
    liftY = 0.28;
    core.position.y += liftY;
    [-0.42, 0.42].forEach((wx) => {
      [-0.36, 0.36].forEach((wz) => {
        const tire = mCyl(THREE, 0.19, 0.19, 0.11, 14, p.rubberMat);
        tire.rotation.x = Math.PI / 2;
        tire.position.set(wx, 0.19, wz);
        const rim = mCyl(THREE, 0.1, 0.1, 0.125, 10, p.goldMat);
        rim.rotation.x = Math.PI / 2;
        rim.position.set(wx, 0.19, wz);
        root.add(tire, rim);
      });
    });
  } else if (needsExtraLegs) {
    liftY = 0.32;
    core.position.y += liftY;
    [-0.24, 0.24].forEach((lx) => {
      const leg = mCyl(THREE, 0.075, 0.08, 0.34, 8, mats.get('#92400E', {}));
      leg.position.set(lx, 0.17, 0);
      const shoe = mRoundBox(THREE, 0.18, 0.12, 0.04, 0.28, 0.015, p.darkMat);
      shoe.position.set(lx, 0.06, 0.04);
      root.add(leg, shoe);
    });
  }

  root.add(core);
  const topY = box.max.y + liftY;
  const midY = center.y + liftY;
  const halfW = Math.max(0.36, size.x * 0.5);
  const halfD = Math.max(0.32, size.z * 0.5);

  // Apply trait modifiers cleanly
  if (spec.hasWings) {
    attachLabWing3D(THREE, root, spec, p, halfW, midY);
  }
  if (spec.hasCrown && shape !== 'crown') {
    const crBand = mCyl(THREE, 0.26, 0.22, 0.14, 12, p.goldMat);
    crBand.position.set(center.x, topY + 0.08, center.z);
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5;
      const sp = mCone(THREE, 0.065, 0.18, 5, p.goldMat);
      sp.position.set(center.x + Math.cos(a) * 0.21, topY + 0.22, center.z + Math.sin(a) * 0.21);
      root.add(sp);
    }
    root.add(crBand);
  }
  if (spec.hasHalo) {
    const halo = mTorus(THREE, 0.34, 0.04, 8, 22, mats.get('#FACC15', { emissive: '#FACC15', emissiveIntensity: 0.85 }));
    halo.rotation.x = Math.PI / 2;
    halo.position.set(center.x, topY + (spec.hasCrown ? 0.44 : 0.24), center.z);
    root.add(halo);
  }
  if (spec.hasPropeller) {
    const pMast = mCyl(THREE, 0.035, 0.035, 0.22, 8, p.darkMat);
    pMast.position.set(center.x, topY + 0.11, center.z);
    const b1 = mBox(THREE, 0.96, 0.035, 0.11, p.goldMat);
    b1.position.set(center.x, topY + 0.22, center.z);
    const b2 = mBox(THREE, 0.11, 0.035, 0.96, p.goldMat);
    b2.position.set(center.x, topY + 0.22, center.z);
    root.add(pMast, b1, b2);
  }
  if (spec.hasAntenna && shape !== 'robot') {
    const stalk = mCyl(THREE, 0.025, 0.025, 0.28, 6, p.darkMat);
    stalk.position.set(center.x, topY + 0.14, center.z);
    const tip = mSph(THREE, 0.075, 8, 6, mats.get('#38BDF8', { emissive: '#38BDF8', emissiveIntensity: 0.9 }));
    tip.position.set(center.x, topY + 0.3, center.z);
    root.add(stalk, tip);
  }
  if (spec.hasGlasses) {
    [-0.17, 0.17].forEach((gx) => {
      const lens = mRoundBox(THREE, 0.24, 0.15, 0.04, 0.05, 0.01, p.darkMat);
      lens.position.set(gx, midY + 0.2, halfD + 0.04);
      root.add(lens);
    });
    const br = mBox(THREE, 0.14, 0.03, 0.04, p.goldMat);
    br.position.set(0, midY + 0.22, halfD + 0.04);
    root.add(br);
  }
  if (spec.hasCape) {
    const cape = mRoundBox(THREE, 0.72, 0.86, 0.08, 0.07, 0.02, mats.get('#DC2626', { roughness: 0.6 }));
    cape.position.set(center.x, midY - 0.06, -halfD - 0.06);
    cape.rotation.x = 0.28;
    root.add(cape);
  }
  if (spec.hasFishTail && shape !== 'fish') {
    const fTail = mCone(THREE, 0.26, 0.44, 4, p.accentMat);
    fTail.rotation.z = -Math.PI / 2;
    fTail.position.set(-halfW - 0.24, 0.32, 0);
    root.add(fTail);
  }
  if (spec.hasExhaust) {
    [-0.16, 0.16].forEach((ez) => {
      const pipe = mCyl(THREE, 0.06, 0.06, 0.22, 8, p.darkMat);
      pipe.rotation.z = Math.PI / 2;
      pipe.position.set(-halfW - 0.08, 0.36, ez);
      const fire = mCone(THREE, 0.07, 0.26, 8, mats.get('#F97316', { emissive: '#EA580C', emissiveIntensity: 0.85 }));
      fire.rotation.z = Math.PI / 2;
      fire.position.set(-halfW - 0.28, 0.36, ez);
      root.add(pipe, fire);
    });
  }
  if (spec.hasFire && shape !== 'rocket') {
    for (let f = 0; f < 4; f++) {
      const a = (f * Math.PI * 2) / 4 + 0.4;
      const fl = mCone(THREE, 0.11, 0.36, 7, mats.get('#F97316', { emissive: '#EA580C', emissiveIntensity: 0.75, transparent: true, opacity: 0.85 }));
      fl.position.set(Math.cos(a) * (halfW + 0.1), 0.22, Math.sin(a) * (halfD + 0.1));
      root.add(fl);
    }
  }
  if (spec.hasBubbles) {
    [
      [-halfW - 0.16, topY - 0.1, 0.18, 0.1],
      [halfW + 0.18, midY + 0.2, -0.15, 0.08],
      [0.2, topY + 0.26, halfD + 0.1, 0.07],
    ].forEach(([bx, by, bz, br]) => {
      const bub = mSph(THREE, br, 10, 8, p.glassMat);
      bub.position.set(bx, by, bz);
      root.add(bub);
    });
  }
  if (spec.hasStars) {
    [
      [-halfW - 0.14, topY + 0.12, 0.14],
      [halfW + 0.16, topY + 0.06, -0.12],
    ].forEach(([sx, sy, sz], idx) => {
      const st = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.11, 0),
        mats.get(idx === 0 ? '#FACC15' : '#38BDF8', { emissive: idx === 0 ? '#F59E0B' : '#0EA5E9', emissiveIntensity: 0.8 })
      );
      st.position.set(sx, sy, sz);
      root.add(st);
    });
  }

  const rawScale = spec.sizeScale || 1;
  const maxCap = options.maxRoomScale ?? 1.48;
  const appliedScale = Math.max(0.65, Math.min(maxCap, rawScale));
  root.scale.setScalar(appliedScale);
  return root;
}
