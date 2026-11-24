import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  FlaskConical,
  Hammer,
  Package,
  PawPrint,
  RotateCcw,
  RotateCw,
  Search,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  B2KSBridge,
  CustomLabItem,
  LabItemSpec,
  PetSpeciesDef,
  PetStage,
  PetVariantId,
} from '../types/b2ks';
import {
  LEGACY_VOUCHERS,
  PET_ACCESSORY_CATALOG,
  PET_FOOD_CATALOG,
  PET_SPECIES,
  PET_VARIANT_DEFS,
  SHOP_CATALOG,
} from '../game/constants';
import {
  buildLabSVGMarkup,
  MATERIAL_PALETTES,
  SHAPE_LIBRARY,
} from '../game/inventionLab';
import {
  getPetResolvedColors,
  renderPetArtSVG,
} from '../game/petSystem';
import { renderItemIllustrationSVG } from '../game/svgHelpers';
import {
  buildCatalogItem3D,
  buildPet3D,
  buildProceduralLabItem3D,
  createMaterialCache,
  createProceduralTextures,
  detectSoftwareWebGL,
} from '../game/scene3d.js';

interface Props {
  bridge: B2KSBridge;
}

type LibraryCategory = 'all' | 'catalog' | 'lab_shapes' | 'lab_crafted' | 'pets';
type ReviewStatus = 'unreviewed' | 'approved' | 'needs_upgrade';

interface AssetReviewRecord {
  status: ReviewStatus;
  note?: string;
  updatedAt: number;
}

interface CatalogAssetEntry {
  key: string;
  kind: 'catalog';
  itemId: string;
  name: string;
  groupLabel: string;
  desc: string;
  priceLabel?: string;
}

interface LabShapeAssetEntry {
  key: string;
  kind: 'lab_shape';
  shape: string;
  keys: string[];
  name: string;
  groupLabel: string;
}

interface LabCraftedAssetEntry {
  key: string;
  kind: 'lab_crafted';
  ownerName: string;
  locationLabel: string;
  item: CustomLabItem;
  name: string;
  groupLabel: string;
}

interface PetAssetEntry {
  key: string;
  kind: 'pet';
  species: PetSpeciesDef;
  name: string;
  groupLabel: string;
}

type AssetEntry =
  | CatalogAssetEntry
  | LabShapeAssetEntry
  | LabCraftedAssetEntry
  | PetAssetEntry;

const REVIEW_STORAGE_KEY = 'b2ks_admin_asset_reviews_v1';

const SHAPE_LABELS_VI: Record<string, string> = {
  car: 'Ô tô thể thao',
  train: 'Tàu hỏa đầu máy',
  rocket: 'Tên lửa vũ trụ',
  airplane: 'Máy bay phản lực',
  helicopter: 'Trực thăng',
  boat: 'Thuyền buồm / Tàu thủy',
  bicycle: 'Xe đạp',
  robot: 'Người máy Robot',
  dragon: 'Rồng thần',
  dinosaur: 'Khủng long',
  unicorn: 'Kỳ lân',
  cat: 'Mèo dễ thương',
  dog: 'Cún cưng',
  bunny: 'Thỏ tai dài',
  bear: 'Gấu bông',
  panda: 'Gấu trúc',
  fox: 'Cáo lửa',
  owl: 'Cú thông thái',
  penguin: 'Chim cánh cụt',
  bird: 'Chim non',
  butterfly: 'Bướm sắc màu',
  bee: 'Ong chăm chỉ',
  fish: 'Cá nhiệt đới',
  whale: 'Cá voi',
  octopus: 'Bạch tuộc',
  turtle: 'Rùa biển',
  guitar: 'Đàn Guitar',
  piano: 'Đàn Piano',
  drum: 'Trống nhạc',
  sword: 'Kiếm ánh sáng',
  shield: 'Khiên hiệp sĩ',
  wand: 'Đũa phép thuật',
  crown: 'Vương miện',
  trophy: 'Cúp vô địch',
  diamond: 'Kim cương pha lê',
  star: 'Ngôi sao 5 cánh',
  moon: 'Mặt trăng lưỡi liềm',
  sun: 'Mặt trời rực rỡ',
  planet: 'Hành tinh có vành đai',
  heart: 'Trái tim',
  flower: 'Bông hoa',
  tree: 'Cây xanh',
  cactus: 'Xương rồng',
  mushroom: 'Nấm cổ tích',
  house: 'Ngôi nhà',
  castle: 'Lâu đài',
  tent: 'Lều cắm trại',
  cake: 'Bánh kem sinh nhật',
  icecream: 'Kem ốc quế',
  pizza: 'Bánh Pizza',
  apple: 'Quả táo',
  cupcake: 'Bánh Cupcake',
  donut: 'Bánh Donut',
  book: 'Cuốn sách',
  laptop: 'Máy tính Laptop',
  camera: 'Máy ảnh',
  clock: 'Đồng hồ',
  lamp: 'Đèn bàn',
  sofa: 'Ghế Sofa',
  chair: 'Ghế tựa',
  table: 'Bàn gỗ',
  bed: 'Giường ngủ',
  skateboard: 'Ván trượt',
  ball: 'Quả bóng',
  umbrella: 'Chiếc ô',
  backpack: 'Ba lô',
  glasses: 'Kính thời trang',
  hat: 'Chiếc mũ',
  cloud: 'Đám mây',
  rainbow: 'Cầu vồng',
  crystal: 'Tinh thể pha lê',
};

const LAB_TRAIT_TOGGLES: Array<{ key: keyof LabItemSpec; label: string }> = [
  { key: 'hasWings', label: '🪽 Có cánh' },
  { key: 'hasWheels', label: '🛞 Bánh xe' },
  { key: 'hasLegs', label: '🦵 Chân đứng' },
  { key: 'hasFishTail', label: '🧜 Đuôi cá' },
  { key: 'hasCrown', label: '👑 Vương miện' },
  { key: 'hasHalo', label: '😇 Hào quang' },
  { key: 'hasFire', label: '🔥 Ngọn lửa' },
  { key: 'hasPropeller', label: '🚁 Cánh quạt' },
  { key: 'hasCape', label: '🦸 Áo choàng' },
  { key: 'hasGlasses', label: '🕶️ Kính ngầu' },
  { key: 'hasAntenna', label: '📡 Ăng-ten' },
  { key: 'hasBubbles', label: '🫧 Bong bóng' },
  { key: 'hasStars', label: '✨ Ngôi sao' },
  { key: 'isRainbow', label: '🌈 Cầu vồng' },
];

function disposeObject3D(THREE: any, obj: any) {
  if (!obj) return;
  obj.traverse((child: any) => {
    if (child.geometry && typeof child.geometry.dispose === 'function') {
      child.geometry.dispose();
    }
    if (child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((m: any) => {
        if (m && m.__ownedByPreview && typeof m.dispose === 'function') {
          m.dispose();
        }
      });
    }
  });
  void THREE;
}

export const AssetLibraryTab: React.FC<Props> = ({ bridge }) => {
  const [category, setCategory] = useState<LibraryCategory>('all');
  const [searchText, setSearchText] = useState('');
  const [reviewFilter, setReviewFilter] = useState<'all' | ReviewStatus>('all');
  const [selectedKey, setSelectedKey] = useState<string>('catalog:d_guitar');

  // Lab interactive preview overrides (for lab_shape entries)
  const [labMaterialIdx, setLabMaterialIdx] = useState<number>(2); // gold default
  const [labTraits, setLabTraits] = useState<Partial<LabItemSpec>>({
    hasWings: false,
    hasWheels: false,
    hasLegs: false,
    hasFishTail: false,
    hasCrown: false,
    hasHalo: false,
    hasFire: false,
    hasPropeller: false,
    hasCape: false,
    hasGlasses: false,
    hasAntenna: false,
    hasBubbles: false,
    hasStars: false,
    isRainbow: false,
  });

  // Pet interactive preview overrides
  const [petStage, setPetStage] = useState<PetStage>(3);
  const [petVariant, setPetVariant] = useState<PetVariantId>('classic');
  const [petAccessoryId, setPetAccessoryId] = useState<string>('');

  // 3D viewport state
  const [autoRotate, setAutoRotate] = useState(true);
  const [zoomFactor, setZoomFactor] = useState(1);
  const [resetCamTick, setResetCamTick] = useState(0);
  const [webglStatus, setWebglStatus] = useState<'loading' | 'ready' | 'lost' | 'error'>('loading');

  // Review tracking
  const [reviews, setReviews] = useState<Record<string, AssetReviewRecord>>(() => {
    try {
      const raw = localStorage.getItem(REVIEW_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const [noteDraft, setNoteDraft] = useState('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const orbitRef = useRef({ yaw: 0.65, pitch: 0.38, dragging: false, lastX: 0, lastY: 0 });
  const autoRotateRef = useRef(autoRotate);
  autoRotateRef.current = autoRotate;
  const zoomFactorRef = useRef(zoomFactor);
  zoomFactorRef.current = zoomFactor;

  const state = bridge.getState();

  const allEntries = useMemo<AssetEntry[]>(() => {
    const out: AssetEntry[] = [];

    // 1. Game & Shop catalog + Legacy Vouchers + Bookshelf + Pet Food & Accessories
    SHOP_CATALOG.forEach((item) => {
      out.push({
        key: `catalog:${item.id}`,
        kind: 'catalog',
        itemId: item.id,
        name: item.name,
        groupLabel: item.category === 'decor' ? 'Nội thất 3D/2D' : 'Thẻ Siêu thị',
        desc: item.desc,
        priceLabel: `${item.price}⭐`,
      });
    });

    out.push({
      key: 'catalog:d_bookshelf',
      kind: 'catalog',
      itemId: 'd_bookshelf',
      name: 'Tủ Sách Gỗ Gia Đình',
      groupLabel: 'Nội thất phòng chung',
      desc: 'Tủ sách gỗ 3 tầng chứa truyện tranh & quả địa cầu',
    });

    LEGACY_VOUCHERS.forEach((v) => {
      out.push({
        key: `catalog:${v.id}`,
        kind: 'catalog',
        itemId: v.id,
        name: v.name,
        groupLabel: 'Phiếu đặc quyền',
        desc: v.desc,
        priceLabel: `${v.price}⭐`,
      });
    });

    PET_FOOD_CATALOG.forEach((f) => {
      out.push({
        key: `catalog:${f.id}`,
        kind: 'catalog',
        itemId: f.id,
        name: f.name,
        groupLabel: 'Thức ăn Thú cưng',
        desc: f.desc,
        priceLabel: `${f.price}⭐`,
      });
    });

    PET_ACCESSORY_CATALOG.forEach((a) => {
      out.push({
        key: `catalog:${a.id}`,
        kind: 'catalog',
        itemId: a.id,
        name: a.name,
        groupLabel: 'Phụ kiện Thú cưng',
        desc: a.desc,
        priceLabel: `${a.price}⭐`,
      });
    });

    // 2. Member-crafted Lab Items (from both bag and placed roomSlotSpecs / roomDecorSpecs)
    const seenLabIds = new Set<string>();
    state.members.forEach((m) => {
      (m.customLabItems || []).forEach((item) => {
        if (!item || seenLabIds.has(item.id)) return;
        seenLabIds.add(item.id);
        out.push({
          key: `lab_crafted:${item.id}`,
          kind: 'lab_crafted',
          ownerName: m.name,
          locationLabel: 'Trong túi đồ',
          item,
          name: item.name,
          groupLabel: `Lab thành viên (${m.name})`,
        });
      });
      Object.values(m.roomSlotSpecs || {}).forEach((item) => {
        if (!item || seenLabIds.has(item.id)) return;
        seenLabIds.add(item.id);
        out.push({
          key: `lab_crafted:${item.id}`,
          kind: 'lab_crafted',
          ownerName: m.name,
          locationLabel: 'Đang đặt trong phòng',
          item,
          name: item.name,
          groupLabel: `Lab thành viên (${m.name})`,
        });
      });
      Object.values(m.roomDecorSpecs || {}).forEach((item) => {
        if (!item || seenLabIds.has(item.id)) return;
        seenLabIds.add(item.id);
        out.push({
          key: `lab_crafted:${item.id}`,
          kind: 'lab_crafted',
          ownerName: m.name,
          locationLabel: 'Đang đặt trong phòng',
          item,
          name: item.name,
          groupLabel: `Lab thành viên (${m.name})`,
        });
      });
    });

    // 3. Procedural Lab Shape Archetypes (deduplicated by shape)
    const seenShapes = new Set<string>();
    SHAPE_LIBRARY.forEach((entry) => {
      if (seenShapes.has(entry.shape)) return;
      seenShapes.add(entry.shape);
      const viLabel = SHAPE_LABELS_VI[entry.shape] || entry.shape;
      out.push({
        key: `lab_shape:${entry.shape}`,
        kind: 'lab_shape',
        shape: entry.shape,
        keys: entry.keys,
        name: `Mẫu Lab: ${viLabel} (${entry.shape})`,
        groupLabel: 'Hình mẫu Lab 2D/3D',
      });
    });

    // 4. All 10 Pet Species
    PET_SPECIES.forEach((sp) => {
      out.push({
        key: `pet:${sp.id}`,
        kind: 'pet',
        species: sp,
        name: sp.name,
        groupLabel: `Thú cưng (${sp.eggPrice}⭐)`,
      });
    });

    return out;
  }, [state.members]);

  const filteredEntries = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return allEntries.filter((entry) => {
      if (category !== 'all') {
        if (category === 'catalog' && entry.kind !== 'catalog') return false;
        if (category === 'lab_shapes' && entry.kind !== 'lab_shape') return false;
        if (category === 'lab_crafted' && entry.kind !== 'lab_crafted') return false;
        if (category === 'pets' && entry.kind !== 'pet') return false;
      }
      if (reviewFilter !== 'all') {
        const st = reviews[entry.key]?.status || 'unreviewed';
        if (st !== reviewFilter) return false;
      }
      if (q) {
        const hay = `${entry.name} ${entry.key} ${entry.groupLabel}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allEntries, category, searchText, reviewFilter, reviews]);

  const selectedEntry = useMemo(
    () => allEntries.find((e) => e.key === selectedKey) || filteredEntries[0] || allEntries[0],
    [allEntries, filteredEntries, selectedKey]
  );

  // Sync note draft when selection changes
  useEffect(() => {
    if (!selectedEntry) return;
    setNoteDraft(reviews[selectedEntry.key]?.note || '');
  }, [selectedEntry?.key]);

  // Build active LabSpec when inspecting a Lab Shape archetype
  const activeLabSpec = useMemo<LabItemSpec | null>(() => {
    if (!selectedEntry) return null;
    if (selectedEntry.kind === 'lab_crafted') {
      return selectedEntry.item.labSpec;
    }
    if (selectedEntry.kind === 'lab_shape') {
      const mat = MATERIAL_PALETTES[labMaterialIdx] || MATERIAL_PALETTES[0];
      return {
        primaryShape: selectedEntry.shape,
        color: mat.hex,
        accent: mat.accent,
        material: mat.material,
        pattern: 'solid',
        rarity: mat.rarity || 'Kiểm thử',
        sizeTier: 'medium',
        sizeScale: 1,
        seed: 42,
        ...labTraits,
        isRainbow: Boolean(mat.isRainbow || labTraits.isRainbow),
      };
    }
    return null;
  }, [selectedEntry, labMaterialIdx, labTraits]);

  // Build 2D SVG markup for currently selected entry
  const previewSvg2D = useMemo(() => {
    if (!selectedEntry) return '';
    if (selectedEntry.kind === 'catalog') {
      return renderItemIllustrationSVG(selectedEntry.itemId, 148, bridge.findCatalogItem);
    }
    if (selectedEntry.kind === 'lab_crafted') {
      return buildLabSVGMarkup(selectedEntry.item.labSpec);
    }
    if (selectedEntry.kind === 'lab_shape' && activeLabSpec) {
      return buildLabSVGMarkup(activeLabSpec);
    }
    if (selectedEntry.kind === 'pet') {
      return renderPetArtSVG(selectedEntry.species.id, petStage, 148, {
        variant: petVariant,
        accessoryId: petAccessoryId || null,
      });
    }
    return '';
  }, [selectedEntry, activeLabSpec, petStage, petVariant, petAccessoryId, bridge]);

  // Persistent 3D WebGL Turntable Scene
  const sceneCtxRef = useRef<{
    THREE: any;
    renderer: any;
    scene: any;
    camera: any;
    mats: any;
    textures: any;
    modelHolder: any;
    currentMesh: any;
    petGroup: any;
    camBaseDist: number;
    camTargetY: number;
  } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let animId = 0;

    const init = async () => {
      try {
        const wAny = window as any;
        const THREE = wAny.THREE || (wAny.__THREE_READY__ ? await wAny.__THREE_READY__ : null);
        if (!THREE || disposed || !canvasRef.current) {
          if (!disposed) setWebglStatus('error');
          return;
        }

        const isSw = detectSoftwareWebGL();
        const renderer = new THREE.WebGLRenderer({
          canvas: canvasRef.current,
          antialias: !isSw,
          alpha: true,
          powerPreference: 'high-performance',
        });
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;
        renderer.setPixelRatio(isSw ? 1 : Math.min(window.devicePixelRatio || 1, 2));
        renderer.shadowMap.enabled = !isSw;

        const rect = canvasRef.current.getBoundingClientRect();
        const cw = Math.max(240, Math.round(rect.width || 320));
        const ch = Math.max(220, Math.round(rect.height || 260));
        renderer.setSize(cw, ch, false);

        const scene = new THREE.Scene();
        scene.background = new THREE.Color('#EEF6FF');

        let envTexture: any = null;
        if (wAny.THREE_ROOM_ENV) {
          const pmrem = new THREE.PMREMGenerator(renderer);
          envTexture = pmrem.fromScene(new wAny.THREE_ROOM_ENV(), 0.04).texture;
          scene.environment = envTexture;
          pmrem.dispose();
        }

        const camera = new THREE.PerspectiveCamera(38, cw / ch, 0.05, 120);
        const hemi = new THREE.HemisphereLight('#FFFFFF', '#94A3B8', 0.85);
        scene.add(hemi);

        const keyLight = new THREE.DirectionalLight('#FFFBEB', 1.45);
        keyLight.position.set(4.5, 7.5, 5.5);
        keyLight.castShadow = !isSw;
        keyLight.shadow.mapSize.width = 512;
        keyLight.shadow.mapSize.height = 512;
        scene.add(keyLight);

        const rimLight = new THREE.DirectionalLight('#BAE6FD', 0.65);
        rimLight.position.set(-5, 3, -4);
        scene.add(rimLight);

        // Turntable pedestal disc
        const discGeo = new THREE.CylinderGeometry(1.75, 1.88, 0.14, 36);
        const discMat = new THREE.MeshStandardMaterial({
          color: '#CBD5E1',
          roughness: 0.45,
          metalness: 0.12,
        });
        const disc = new THREE.Mesh(discGeo, discMat);
        disc.position.y = -0.07;
        disc.receiveShadow = !isSw;
        scene.add(disc);

        const ringGeo = new THREE.RingGeometry(1.66, 1.74, 36);
        const ringMat = new THREE.MeshBasicMaterial({ color: '#0EA5E9', side: THREE.DoubleSide });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.005;
        scene.add(ring);

        const mats = createMaterialCache(THREE);
        const textures = createProceduralTextures(THREE, 1);
        const modelHolder = new THREE.Group();
        scene.add(modelHolder);

        sceneCtxRef.current = {
          THREE,
          renderer,
          scene,
          camera,
          mats,
          textures,
          modelHolder,
          currentMesh: null,
          petGroup: null,
          camBaseDist: 4.5,
          camTargetY: 0.7,
        };
        setWebglStatus('ready');

        const handleContextLost = (e: Event) => {
          e.preventDefault();
          setWebglStatus('lost');
        };
        const handleContextRestored = () => {
          setWebglStatus('ready');
        };
        canvasRef.current.addEventListener('webglcontextlost', handleContextLost);
        canvasRef.current.addEventListener('webglcontextrestored', handleContextRestored);

        let lastTime = performance.now();
        const tick = (now: number) => {
          if (disposed) return;
          animId = requestAnimationFrame(tick);
          const ctx = sceneCtxRef.current;
          if (!ctx) return;

          const dt = Math.min(0.05, (now - lastTime) / 1000);
          lastTime = now;

          const orb = orbitRef.current;
          if (autoRotateRef.current && !orb.dragging) {
            orb.yaw += dt * 0.72;
          }

          if (ctx.petGroup && ctx.petGroup.userData?.actor) {
            const actor = ctx.petGroup.userData.actor;
            actor.position.y = Math.sin(now * 0.004) * 0.06;
            if (ctx.petGroup.userData.wingL && ctx.petGroup.userData.wingR) {
              const flap = Math.sin(now * 0.012) * 0.35;
              ctx.petGroup.userData.wingL.rotation.z = flap;
              ctx.petGroup.userData.wingR.rotation.z = -flap;
            }
            if (ctx.petGroup.userData.auraRing) {
              ctx.petGroup.userData.auraRing.rotation.z = now * 0.002;
            }
          }

          const dist = ctx.camBaseDist / Math.max(0.45, Math.min(2.6, zoomFactorRef.current));
          const cosP = Math.cos(orb.pitch);
          camera.position.set(
            Math.sin(orb.yaw) * cosP * dist,
            ctx.camTargetY + Math.sin(orb.pitch) * dist,
            Math.cos(orb.yaw) * cosP * dist
          );
          camera.lookAt(0, ctx.camTargetY, 0);

          const curRect = canvasRef.current?.getBoundingClientRect();
          if (curRect && curRect.width > 50 && curRect.height > 50) {
            const targetW = Math.round(curRect.width);
            const targetH = Math.round(curRect.height);
            if (canvasRef.current && (canvasRef.current.width !== targetW || canvasRef.current.height !== targetH)) {
              renderer.setSize(targetW, targetH, false);
              camera.aspect = targetW / targetH;
              camera.updateProjectionMatrix();
            }
          }

          renderer.render(scene, camera);
        };
        animId = requestAnimationFrame(tick);

        return () => {
          canvasRef.current?.removeEventListener('webglcontextlost', handleContextLost);
          canvasRef.current?.removeEventListener('webglcontextrestored', handleContextRestored);
          cancelAnimationFrame(animId);
          if (sceneCtxRef.current?.currentMesh) {
            disposeObject3D(THREE, sceneCtxRef.current.currentMesh);
          }
          discGeo.dispose();
          discMat.dispose();
          ringGeo.dispose();
          ringMat.dispose();
          envTexture?.dispose?.();
          renderer.dispose();
          sceneCtxRef.current = null;
        };
      } catch {
        if (!disposed) setWebglStatus('error');
      }
      return undefined;
    };

    let cleanupFn: (() => void) | undefined;
    init().then((fn) => {
      cleanupFn = fn;
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(animId);
      cleanupFn?.();
    };
  }, []);

  // Rebuild 3D mesh whenever selected asset or pet/lab controls change
  useEffect(() => {
    const ctx = sceneCtxRef.current;
    if (!ctx || !selectedEntry || webglStatus !== 'ready') return;
    const { THREE, mats, textures, modelHolder } = ctx;

    if (ctx.currentMesh) {
      modelHolder.remove(ctx.currentMesh);
      disposeObject3D(THREE, ctx.currentMesh);
      ctx.currentMesh = null;
      ctx.petGroup = null;
    }

    let built: any = null;
    if (selectedEntry.kind === 'catalog') {
      built = buildCatalogItem3D(THREE, mats, selectedEntry.itemId, bridge.findCatalogItem);
    } else if (selectedEntry.kind === 'lab_crafted') {
      built = buildProceduralLabItem3D(THREE, mats, selectedEntry.item.labSpec, {
        maxRoomScale: 1,
      });
    } else if (selectedEntry.kind === 'lab_shape' && activeLabSpec) {
      built = buildProceduralLabItem3D(THREE, mats, activeLabSpec, {
        maxRoomScale: 1,
      });
    } else if (selectedEntry.kind === 'pet') {
      const col = getPetResolvedColors(selectedEntry.species, petVariant);
      const fakePet = {
        id: 'preview_pet',
        speciesId: selectedEntry.species.id,
        nickname: selectedEntry.species.name,
        hatched: petStage > 0,
        hatchProgress: petStage > 0 ? 100 : 50,
        xp: 0,
        level: Math.max(1, petStage * 3),
        stage: petStage,
        hunger: 100,
        lastFedAt: Date.now(),
        obtainedAt: Date.now(),
        gender: 'female',
        variant: petVariant,
        accessoryId: petAccessoryId || null,
      };
      built = buildPet3D(THREE, mats, textures.shadowTex, fakePet, selectedEntry.species, col);
      ctx.petGroup = built;
    }

    if (built) {
      const wrapper = new THREE.Group();
      wrapper.add(built);
      wrapper.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(wrapper);
      if (!box.isEmpty()) {
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);
        built.position.x -= center.x;
        built.position.z -= center.z;
        built.position.y -= box.min.y;
        const maxDim = Math.max(0.65, size.x, size.y, size.z);
        ctx.camTargetY = Math.max(0.3, size.y * 0.48);
        ctx.camBaseDist = Math.max(2.6, maxDim * 2.15);
      } else {
        ctx.camTargetY = 0.65;
        ctx.camBaseDist = 3.8;
      }
      modelHolder.add(wrapper);
      ctx.currentMesh = wrapper;
    }
  }, [selectedEntry, activeLabSpec, petStage, petVariant, petAccessoryId, webglStatus, bridge]);

  // Reset orbit camera when button pressed
  useEffect(() => {
    orbitRef.current.yaw = 0.65;
    orbitRef.current.pitch = 0.38;
    setZoomFactor(1);
  }, [resetCamTick]);

  const updateReview = (key: string, nextStatus: ReviewStatus, customNote?: string) => {
    setReviews((prev) => {
      const next: Record<string, AssetReviewRecord> = {
        ...prev,
        [key]: {
          status: nextStatus,
          note: customNote !== undefined ? customNote : prev[key]?.note || '',
          updatedAt: Date.now(),
        },
      };
      try {
        localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore quota errors
      }
      return next;
    });
  };

  const toggleTrait = (traitKey: keyof LabItemSpec) => {
    setLabTraits((prev) => ({
      ...prev,
      [traitKey]: !prev[traitKey],
    }));
  };

  const countsByStatus = useMemo(() => {
    let approved = 0;
    let needsUpgrade = 0;
    allEntries.forEach((e) => {
      const st = reviews[e.key]?.status;
      if (st === 'approved') approved += 1;
      else if (st === 'needs_upgrade') needsUpgrade += 1;
    });
    return { approved, needsUpgrade, total: allEntries.length };
  }, [allEntries, reviews]);

  const renderThumbnailSvg = (entry: AssetEntry) => {
    if (entry.kind === 'catalog') {
      return renderItemIllustrationSVG(entry.itemId, 38, bridge.findCatalogItem);
    }
    if (entry.kind === 'lab_crafted') {
      return renderItemIllustrationSVG(entry.item.id, 38, bridge.findCatalogItem);
    }
    if (entry.kind === 'lab_shape') {
      return buildLabSVGMarkup({
        primaryShape: entry.shape,
        color: '#0284C7',
        accent: '#FACC15',
        material: 'metal',
        sizeTier: 'medium',
        sizeScale: 1,
        seed: 7,
      });
    }
    return renderPetArtSVG(entry.species.id, 2, 38, { variant: 'classic' });
  };

  return (
    <div className="space-y-3">
      {/* Top Info + Review Summary */}
      <div className="rounded-xl border-2 border-sky-300 bg-sky-50 p-3 flex flex-wrap items-center justify-between gap-2 text-xs text-sky-950">
        <div>
          <b>🎨 Kho Kiểm Định Hình Ảnh 2D &amp; 3D Toàn Hệ Thống:</b> So sánh trực tiếp hình minh họa 2D (SVG) và mô hình 3D WebGL xoay 360° của vật phẩm, hình mẫu Phòng Thí Nghiệm và 10 loài Thú cưng.
        </div>
        <div className="flex flex-wrap gap-1.5 font-bold">
          <span className="px-2 py-0.5 rounded-full bg-white border border-slate-300">
            Tổng: {countsByStatus.total}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-400 text-emerald-800">
            ✅ Đạt: {countsByStatus.approved}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-amber-100 border border-amber-400 text-amber-900">
            🔧 Cần sửa: {countsByStatus.needsUpgrade}
          </span>
        </div>
      </div>

      {/* Category & Search Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5 flex-1">
          {[
            { id: 'all', label: 'Tất cả', icon: <Eye className="w-3.5 h-3.5" /> },
            { id: 'catalog', label: 'Vật phẩm & Đồ dùng', icon: <Package className="w-3.5 h-3.5" /> },
            { id: 'lab_shapes', label: 'Hình mẫu Lab', icon: <FlaskConical className="w-3.5 h-3.5" /> },
            { id: 'lab_crafted', label: 'Đồ Lab thành viên', icon: <Hammer className="w-3.5 h-3.5" /> },
            { id: 'pets', label: '10 Thú cưng', icon: <PawPrint className="w-3.5 h-3.5" /> },
          ].map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                bridge.playClick();
                setCategory(c.id as LibraryCategory);
              }}
              className={`px-2.5 py-1.5 rounded-lg text-[11.5px] font-bold flex items-center gap-1 border-2 cursor-pointer ${
                category === c.id
                  ? 'bg-[#0284C7] text-white border-[#0F172A]'
                  : 'bg-white text-[#2C3E50] border-slate-300 hover:bg-slate-50'
              }`}
            >
              {c.icon}
              <span>{c.label}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Tìm tên, mã ID..."
              className="pl-7 pr-2.5 py-1 rounded-lg border-2 border-slate-300 bg-white text-xs font-semibold w-40 sm:w-44"
            />
          </div>
          <select
            value={reviewFilter}
            onChange={(e) => setReviewFilter(e.target.value as 'all' | ReviewStatus)}
            className="px-2 py-1 rounded-lg border-2 border-slate-300 bg-white text-xs font-bold"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="needs_upgrade">🔧 Cần nâng cấp</option>
            <option value="approved">✅ Đã đạt chuẩn</option>
            <option value="unreviewed">⏳ Chưa duyệt</option>
          </select>
        </div>
      </div>

      {/* Main Split View: Left Asset List + Right 2D/3D Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Left List */}
        <div className="lg:col-span-5 max-h-[470px] overflow-y-auto space-y-1.5 pr-1">
          {filteredEntries.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-6 text-center text-xs text-slate-500">
              Không tìm thấy tài nguyên nào khớp bộ lọc.
            </div>
          ) : (
            filteredEntries.map((entry) => {
              const isSelected = selectedEntry?.key === entry.key;
              const rev = reviews[entry.key];
              return (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() => {
                    bridge.playClick();
                    setSelectedKey(entry.key);
                  }}
                  className={`w-full text-left rounded-xl border-2 p-2 flex items-center gap-2.5 transition cursor-pointer ${
                    isSelected
                      ? 'border-[#0284C7] bg-sky-50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-400'
                  }`}
                >
                  <div
                    className="w-11 h-11 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0 overflow-hidden [&>svg]:w-9 [&>svg]:h-9"
                    dangerouslySetInnerHTML={{ __html: renderThumbnailSvg(entry) }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs text-slate-900 truncate">{entry.name}</div>
                    <div className="text-[10.5px] text-slate-500 truncate">{entry.groupLabel}</div>
                  </div>
                  {rev?.status === 'approved' && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-extrabold shrink-0">
                      ✅ Đạt
                    </span>
                  )}
                  {rev?.status === 'needs_upgrade' && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-extrabold shrink-0">
                      🔧 Sửa
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Right Side-by-Side 2D & 3D Inspector */}
        <div className="lg:col-span-7 rounded-2xl border-2 border-[#2C3E50] bg-white p-3.5 space-y-3">
          {selectedEntry ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-200 pb-2">
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-[#0F172A]">
                    {selectedEntry.name}
                  </h3>
                  <div className="flex flex-wrap gap-1.5 mt-1 text-[11px] text-slate-600">
                    <code className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 font-bold">
                      {selectedEntry.key}
                    </code>
                    <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-900 font-bold">
                      {selectedEntry.groupLabel}
                    </span>
                    {selectedEntry.kind === 'catalog' && selectedEntry.priceLabel && (
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold">
                        {selectedEntry.priceLabel}
                      </span>
                    )}
                    {selectedEntry.kind === 'lab_crafted' && (
                      <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-900 font-bold">
                        {selectedEntry.locationLabel}
                      </span>
                    )}
                  </div>
                </div>

                {/* Quality Review Action Buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      bridge.playSuccess();
                      updateReview(selectedEntry.key, 'approved', noteDraft);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border-2 flex items-center gap-1 cursor-pointer ${
                      reviews[selectedEntry.key]?.status === 'approved'
                        ? 'bg-emerald-600 text-white border-emerald-800'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Đạt chuẩn</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      bridge.playClick();
                      updateReview(selectedEntry.key, 'needs_upgrade', noteDraft);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border-2 flex items-center gap-1 cursor-pointer ${
                      reviews[selectedEntry.key]?.status === 'needs_upgrade'
                        ? 'bg-amber-600 text-white border-amber-800'
                        : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                    }`}
                  >
                    <Hammer className="w-3.5 h-3.5" />
                    <span>Cần nâng cấp</span>
                  </button>
                </div>
              </div>

              {/* Dual 2D + 3D Panels */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 2D Panel */}
                <div className="rounded-xl border-2 border-slate-200 bg-gradient-to-b from-slate-50 to-white p-3 flex flex-col items-center justify-between">
                  <div className="w-full flex items-center justify-between text-xs font-extrabold text-slate-700 mb-2">
                    <span>🖼️ Hình ảnh 2D (SVG / Túi đồ)</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">148×148</span>
                  </div>
                  <div
                    className="w-44 h-44 rounded-xl border border-slate-200 bg-white flex items-center justify-center shadow-inner [&>svg]:w-36 [&>svg]:h-36"
                    dangerouslySetInnerHTML={{ __html: previewSvg2D }}
                  />
                  <div className="w-full mt-2 text-[11px] text-slate-600 text-center min-h-[28px]">
                    {selectedEntry.kind === 'catalog' && selectedEntry.desc}
                    {selectedEntry.kind === 'lab_crafted' && `"${selectedEntry.item.prompt}"`}
                    {selectedEntry.kind === 'lab_shape' && `Từ khóa: ${selectedEntry.keys.slice(0, 5).join(', ')}`}
                    {selectedEntry.kind === 'pet' && selectedEntry.species.desc}
                  </div>
                </div>

                {/* 3D Interactive WebGL Panel */}
                <div className="rounded-xl border-2 border-sky-300 bg-[#EEF6FF] p-3 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs font-extrabold text-sky-950 mb-1.5">
                    <span>🧊 Mô hình 3D WebGL (Kéo để xoay)</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setAutoRotate((v) => !v)}
                        title="Bật/Tắt tự xoay"
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                          autoRotate
                            ? 'bg-sky-600 text-white border-sky-700'
                            : 'bg-white text-slate-700 border-slate-300'
                        }`}
                      >
                        <RotateCw className="w-3 h-3 inline mr-0.5" />
                        Xoay
                      </button>
                      <button
                        type="button"
                        onClick={() => setZoomFactor((z) => Math.min(2.4, +(z + 0.2).toFixed(2)))}
                        title="Phóng to"
                        className="p-1 rounded bg-white border border-slate-300 text-slate-700 cursor-pointer"
                      >
                        <ZoomIn className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setZoomFactor((z) => Math.max(0.5, +(z - 0.2).toFixed(2)))}
                        title="Thu nhỏ"
                        className="p-1 rounded bg-white border border-slate-300 text-slate-700 cursor-pointer"
                      >
                        <ZoomOut className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setResetCamTick((t) => t + 1)}
                        title="Đặt lại góc nhìn"
                        className="p-1 rounded bg-white border border-slate-300 text-slate-700 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="relative w-full h-52 rounded-xl border border-sky-200 bg-[#EEF6FF] overflow-hidden">
                    <canvas
                      ref={canvasRef}
                      className="w-full h-full block cursor-grab active:cursor-grabbing touch-none"
                      onPointerDown={(e) => {
                        orbitRef.current.dragging = true;
                        orbitRef.current.lastX = e.clientX;
                        orbitRef.current.lastY = e.clientY;
                        (e.target as HTMLElement).setPointerCapture(e.pointerId);
                      }}
                      onPointerMove={(e) => {
                        if (!orbitRef.current.dragging) return;
                        const dx = e.clientX - orbitRef.current.lastX;
                        const dy = e.clientY - orbitRef.current.lastY;
                        orbitRef.current.lastX = e.clientX;
                        orbitRef.current.lastY = e.clientY;
                        orbitRef.current.yaw -= dx * 0.012;
                        orbitRef.current.pitch = Math.max(-0.2, Math.min(1.25, orbitRef.current.pitch + dy * 0.01));
                      }}
                      onPointerUp={() => {
                        orbitRef.current.dragging = false;
                      }}
                      onPointerCancel={() => {
                        orbitRef.current.dragging = false;
                      }}
                    />
                    {webglStatus !== 'ready' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-100/85 text-xs font-bold text-slate-600">
                        {webglStatus === 'loading' && '⏳ Đang khởi tạo trình xem 3D WebGL...'}
                        {webglStatus === 'lost' && '⚠️ Ngữ cảnh WebGL tạm ngắt, đang khôi phục...'}
                        {webglStatus === 'error' && '❌ Không khởi tạo được WebGL trên trình duyệt này.'}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Context-Specific Interactive Controls */}
              {selectedEntry.kind === 'lab_shape' && (
                <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-2.5 space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="font-extrabold text-sky-950">🎨 Chất liệu &amp; Màu sắc:</span>
                    <div className="flex flex-wrap gap-1">
                      {MATERIAL_PALETTES.map((mat, idx) => (
                        <button
                          key={mat.material}
                          type="button"
                          onClick={() => setLabMaterialIdx(idx)}
                          className={`px-2 py-0.5 rounded-md border text-[10.5px] font-bold flex items-center gap-1 cursor-pointer ${
                            labMaterialIdx === idx
                              ? 'border-[#0F172A] bg-[#0F172A] text-white'
                              : 'border-slate-300 bg-white text-slate-700'
                          }`}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-black/20 inline-block"
                            style={{ backgroundColor: mat.hex }}
                          />
                          <span>{mat.material}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1 text-[11px]">
                    <span className="font-extrabold text-sky-950 mr-1">✨ Thuộc tính ghép:</span>
                    {LAB_TRAIT_TOGGLES.map((tr) => {
                      const active = Boolean(labTraits[tr.key]);
                      return (
                        <button
                          key={String(tr.key)}
                          type="button"
                          onClick={() => toggleTrait(tr.key)}
                          className={`px-2 py-0.5 rounded-md border text-[10.5px] font-bold cursor-pointer ${
                            active
                              ? 'bg-teal-600 text-white border-teal-800'
                              : 'bg-white text-slate-700 border-slate-300'
                          }`}
                        >
                          {tr.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedEntry.kind === 'pet' && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-2.5 space-y-2 text-[11px]">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-extrabold text-amber-950">🐣 Cấp tiến hóa:</span>
                    {([0, 1, 2, 3, 4] as PetStage[]).map((st) => {
                      const stageInfo = selectedEntry.species.stages.find((x) => x.stage === st);
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setPetStage(st)}
                          className={`px-2 py-0.5 rounded-md border font-bold cursor-pointer ${
                            petStage === st
                              ? 'bg-amber-600 text-white border-amber-800'
                              : 'bg-white text-slate-700 border-slate-300'
                          }`}
                        >
                          {st === 0 ? '🥚 Trứng' : `Cấp ${st}: ${stageInfo?.title || ''}`}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-1.5 font-bold text-amber-950">
                      <span>🎨 Biến thể:</span>
                      <select
                        value={petVariant}
                        onChange={(e) => setPetVariant(e.target.value as PetVariantId)}
                        className="px-2 py-0.5 rounded border border-slate-300 bg-white font-bold"
                      >
                        {PET_VARIANT_DEFS.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.label} ({v.rarityLabel})
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex items-center gap-1.5 font-bold text-amber-950">
                      <span>🎀 Phụ kiện:</span>
                      <select
                        value={petAccessoryId}
                        onChange={(e) => setPetAccessoryId(e.target.value)}
                        className="px-2 py-0.5 rounded border border-slate-300 bg-white font-bold"
                      >
                        <option value="">Không đeo</option>
                        {PET_ACCESSORY_CATALOG.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.icon} {acc.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              )}

              {/* Admin Upgrade Note */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <input
                  type="text"
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="Ghi chú kiểm duyệt (VD: Cần tăng chi tiết tai / màu sáng hơn...)"
                  className="flex-1 min-w-[200px] px-2.5 py-1.5 rounded-lg border-2 border-slate-300 bg-slate-50 text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    bridge.playClick();
                    const curStatus = reviews[selectedEntry.key]?.status || 'needs_upgrade';
                    updateReview(selectedEntry.key, curStatus, noteDraft);
                    bridge.showToast('📝 Đã lưu ghi chú kiểm tra hình ảnh!');
                  }}
                  className="btn btn-sm btn-primary"
                >
                  Lưu ghi chú
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
