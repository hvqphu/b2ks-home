/**
 * ============================================================================
 * B2KS 3D GAME CONTROLLER (Tap-to-move, Isometric Camera, Input Routing)
 * ============================================================================
 * File này kết nối logic game B2KS với hệ thống đồ họa 3D (scene3d.js):
 * - Tap-to-move: chạm trực tiếp lên mặt đất 3D để nhân vật tự đi tới
 * - Điều khiển hướng chuẩn góc nhìn Isometric (WASD / Phím mũi tên / Joystick ảo)
 * - Thao tác vuốt/kéo để xoay hoặc lia camera, chụm ngón tay / cuộn chuột để zoom
 */

import { createScene3D } from './scene3d.js';
import { STREET_WORLD } from './constants.ts';

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export function createB2KS3DController({ canvasEl, labelLayerEl, isUnlocked, onZoomSync, onCameraModeSync }) {
  let scene3d = null;
  let tapTarget = null;
  let sceneBounds = { minX: 40, maxX: STREET_WORLD.width - 40, minY: 265, maxY: STREET_WORLD.height - 40 };

  const activePointers = new Map();
  let tapCandidate = null;
  let lastPointer = null;
  let pinchStartDist = 0;
  let pinchStartZoom = 1.0;

  // Khởi tạo Three.js 3D Engine (qua CDN importmap)
  createScene3D(canvasEl)
    .then((inst) => {
      scene3d = inst;
      scene3d.resize();
      if (onZoomSync) onZoomSync(scene3d.camState.targetZoom);
      if (onCameraModeSync) onCameraModeSync(scene3d.getCameraMode());
    })
    .catch((err) => {
      console.error('[B2KS 3D] Không thể khởi tạo WebGL 3D:', err);
    });

  // Ngăn menu chuột phải mặc định trên canvas để chuột phải kéo lia camera mượt hơn
  canvasEl.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });

  // Cuộn chuột để Zoom
  canvasEl.addEventListener(
    'wheel',
    (e) => {
      if (!scene3d || !isUnlocked()) return;
      e.preventDefault();
      const nextZoom = clamp(scene3d.camState.targetZoom - e.deltaY * 0.0012, 0.55, 2.2);
      scene3d.setZoom(nextZoom);
      if (onZoomSync) onZoomSync(nextZoom);
    },
    { passive: false }
  );

  // Chạm / Nhấn chuột: Tap-to-move & Vuốt xoay/lia Camera & Pinch Zoom
  canvasEl.addEventListener('pointerdown', (e) => {
    if (!isUnlocked()) return;
    if (typeof window.startAudioOnce === 'function') window.startAudioOnce();
    try {
      canvasEl.setPointerCapture(e.pointerId);
    } catch {
      // ignore if synthetic event
    }
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.size === 1) {
      tapCandidate = {
        id: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        moved: false,
        button: e.button,
      };
      lastPointer = { x: e.clientX, y: e.clientY };
    } else if (activePointers.size === 2 && scene3d) {
      tapCandidate = null;
      const pts = Array.from(activePointers.values());
      pinchStartDist = Math.max(10, Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y));
      pinchStartZoom = scene3d.camState.targetZoom;
      lastPointer = {
        x: (pts[0].x + pts[1].x) * 0.5,
        y: (pts[0].y + pts[1].y) * 0.5,
      };
    }
  });

  canvasEl.addEventListener('pointermove', (e) => {
    if (!activePointers.has(e.pointerId)) return;
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!scene3d || !isUnlocked()) return;

    if (activePointers.size === 2) {
      const pts = Array.from(activePointers.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const midX = (pts[0].x + pts[1].x) * 0.5;
      const midY = (pts[0].y + pts[1].y) * 0.5;

      const nextZoom = clamp(pinchStartZoom * (dist / pinchStartDist), 0.55, 2.2);
      scene3d.setZoom(nextZoom);
      if (onZoomSync) onZoomSync(nextZoom);

      if (lastPointer) {
        const dx = midX - lastPointer.x;
        const dy = midY - lastPointer.y;
        panCameraByScreenDelta(dx, dy);
      }
      lastPointer = { x: midX, y: midY };
      return;
    }

    if (activePointers.size === 1 && lastPointer) {
      const dx = e.clientX - lastPointer.x;
      const dy = e.clientY - lastPointer.y;
      if (tapCandidate && Math.hypot(e.clientX - tapCandidate.startX, e.clientY - tapCandidate.startY) > 8) {
        tapCandidate.moved = true;
      }

      if ((tapCandidate && tapCandidate.moved) || (e.buttons & 2) !== 0) {
        if ((e.buttons & 2) !== 0 || e.shiftKey) {
          // Chuột phải hoặc giữ Shift: lia (pan) camera trên mặt đất
          panCameraByScreenDelta(dx, dy);
        } else {
          // Kéo 1 ngón hoặc chuột trái: xoay góc nhìn quanh nhân vật
          scene3d.camState.targetYaw -= dx * 0.007;
          const minPitch = scene3d.camState.mode === 'perspective' ? 0.24 : 0.42;
          scene3d.camState.targetPitch = clamp(scene3d.camState.targetPitch + dy * 0.005, minPitch, 1.15);
        }
      }
      lastPointer = { x: e.clientX, y: e.clientY };
    }
  });

  function finishPointer(e, allowTap) {
    activePointers.delete(e.pointerId);
    if (allowTap && activePointers.size === 0 && tapCandidate && !tapCandidate.moved && tapCandidate.button !== 2) {
      if (scene3d && isUnlocked()) {
        const hit = scene3d.raycastGround(e.clientX, e.clientY);
        if (hit) {
          tapTarget = {
            x: clamp(hit.x2d, sceneBounds.minX, sceneBounds.maxX),
            y: clamp(hit.y2d, sceneBounds.minY, sceneBounds.maxY),
          };
        }
      }
    }
    if (activePointers.size === 1) {
      const rem = Array.from(activePointers.values())[0];
      lastPointer = { x: rem.x, y: rem.y };
      tapCandidate = null;
    } else if (activePointers.size === 0) {
      lastPointer = null;
      tapCandidate = null;
    }
  }

  canvasEl.addEventListener('pointerup', (e) => finishPointer(e, true));
  canvasEl.addEventListener('pointercancel', (e) => finishPointer(e, false));

  function panCameraByScreenDelta(dx, dy) {
    if (!scene3d) return;
    const yaw = scene3d.camState.yaw;
    const scale = 0.05 / Math.max(0.5, scene3d.camState.zoom);
    const sx = -dx * scale;
    const sy = -dy * scale;
    const worldDX = sx * Math.cos(yaw) + sy * Math.sin(yaw);
    const worldDZ = -sx * Math.sin(yaw) + sy * Math.cos(yaw);
    scene3d.camState.panX = clamp(scene3d.camState.panX + worldDX, -45, 45);
    scene3d.camState.panZ = clamp(scene3d.camState.panZ + worldDZ, -45, 45);
  }

  function updateSceneBounds(sceneName, houseHeight) {
    if (sceneName === 'neighborhood') {
      sceneBounds = { minX: 40, maxX: STREET_WORLD.width - 40, minY: 265, maxY: STREET_WORLD.height - 40 };
    } else if (sceneName === 'private_room') {
      sceneBounds = { minX: 12, maxX: 748, minY: 16, maxY: 406 };
    } else {
      sceneBounds = { minX: 100, maxX: 1020, minY: 110, maxY: (houseHeight || 800) - 55 };
    }
  }

  /**
   * Tính vector di chuyển chuẩn theo góc camera Isometric hiện tại + hỗ trợ Tap-to-move
   */
  function computeInputVector({ keys, joyActive, joyVector, me, speed, sceneName, houseHeight }) {
    updateSceneBounds(sceneName, houseHeight);

    let sx = 0;
    let sy = 0;
    if (keys['arrowup'] || keys['w']) sy -= 1;
    if (keys['arrowdown'] || keys['s']) sy += 1;
    if (keys['arrowleft'] || keys['a']) sx -= 1;
    if (keys['arrowright'] || keys['d']) sx += 1;
    if (joyActive) {
      sx = joyVector.x;
      sy = joyVector.y;
    }

    const inputLen = Math.hypot(sx, sy);
    if (inputLen > 0.05) {
      tapTarget = null; // Ưu tiên phím điều hướng / joystick nếu người chơi đang nhấn
      if (inputLen > 1) {
        sx /= inputLen;
        sy /= inputLen;
      }
      const yaw = scene3d ? scene3d.camState.yaw : Math.PI / 4;
      const dx = sx * Math.cos(yaw) + sy * Math.sin(yaw);
      const dy = -sx * Math.sin(yaw) + sy * Math.cos(yaw);
      return { dx, dy, moving: true, viaTap: false };
    }

    if (tapTarget) {
      const dx = tapTarget.x - me.x;
      const dy = tapTarget.y - me.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= Math.max(8, speed * 1.8)) {
        tapTarget = null;
        return { dx: 0, dy: 0, moving: false, viaTap: false };
      }
      return { dx: dx / dist, dy: dy / dist, moving: true, viaTap: true };
    }

    return { dx: 0, dy: 0, moving: false, viaTap: false };
  }

  return {
    computeInputVector,
    clearTapTarget() {
      tapTarget = null;
    },
    setZoom(nextZoom) {
      if (!scene3d) return nextZoom;
      scene3d.setZoom(nextZoom);
      return scene3d.camState.targetZoom;
    },
    getZoom() {
      return scene3d ? scene3d.camState.targetZoom : 1.0;
    },
    getCamYaw() {
      return scene3d ? scene3d.camState.yaw : Math.PI / 4;
    },
    getCameraMode() {
      return scene3d ? scene3d.getCameraMode() : 'ortho';
    },
    setCameraMode(mode) {
      if (!scene3d) return 'ortho';
      const next = scene3d.setCameraMode(mode);
      if (onCameraModeSync) onCameraModeSync(next);
      return next;
    },
    toggleCameraMode() {
      if (!scene3d) return 'ortho';
      const next = scene3d.toggleCameraMode();
      if (onCameraModeSync) onCameraModeSync(next);
      return next;
    },
    resetCamera() {
      if (scene3d) scene3d.resetCamera();
    },
    onResize() {
      if (scene3d) scene3d.resize();
    },
    render(renderParams) {
      if (!scene3d) return;
      scene3d.renderFrame({
        ...renderParams,
        tapTarget,
        labelLayerEl,
      });
    },
    dispose() {
      if (scene3d) scene3d.dispose();
    },
  };
}
