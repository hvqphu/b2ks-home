import {
  B2KSState,
  Member,
  PenaltyPickPayload,
  PenaltyZoneId,
  SoccerOnlineRoom,
  SoccerPlayerInput
} from '../types/b2ks';
import {
  formatFamilyBrand,
  getFamilyFirebaseRoot,
  normalizeFamilySlug,
  resolveNeighborhoodLocations
} from './constants';
import { drawDetailedChibiOnContext } from './worldRenderer';

export interface SoccerEngineDeps {
  getState: () => B2KSState;
  getCurrentUser: () => Member;
  getFirebaseUrl: () => string;
  playClick: () => void;
  playCoin: () => void;
  playSuccess: () => void;
  playError: () => void;
  triggerConfetti: () => void;
  triggerSpeechBubble: (member: Member, text: string, isEng: boolean) => void;
  showToast: (msg: string) => void;
  openModal?: (id: string) => void;
  closeModal?: (id: string) => void;
}

const LOCAL_SOCCER_ROOM_KEY = 'b2ks_soccer_online_room';
const LOCAL_PEN_SHOT_KEY = 'b2ks_soccer_pen_shot';
const LOCAL_PEN_SAVE_KEY = 'b2ks_soccer_pen_save';

const PENALTY_ZONES: Array<{
  id: PenaltyZoneId;
  label: string;
  shortLabel: string;
  icon: string;
  gx: number;
  gy: number;
  kx: number;
  ky: number;
  diveTilt: number;
}> = [
  { id: 'TL', label: 'Trái Cao', shortLabel: 'Trái Cao', icon: '↖️', gx: 145, gy: 58, kx: 158, ky: 74, diveTilt: -0.75 },
  { id: 'BL', label: 'Trái Sệt', shortLabel: 'Trái Sệt', icon: '↙️', gx: 145, gy: 120, kx: 162, ky: 112, diveTilt: -1.05 },
  { id: 'C', label: 'Chính Giữa', shortLabel: 'Giữa', icon: '⬆️', gx: 260, gy: 82, kx: 260, ky: 92, diveTilt: 0 },
  { id: 'BR', label: 'Phải Sệt', shortLabel: 'Phải Sệt', icon: '↘️', gx: 375, gy: 120, kx: 358, ky: 112, diveTilt: 1.05 },
  { id: 'TR', label: 'Phải Cao', shortLabel: 'Phải Cao', icon: '↗️', gx: 375, gy: 58, kx: 362, ky: 74, diveTilt: 0.75 }
];

const PENALTY_ZONE_LIST: PenaltyZoneId[] = ['TL', 'BL', 'C', 'BR', 'TR'];
const TURN_SECONDS = 15;
const ANIM_DURATION_MS = 2150;

function getZoneDef(zone?: PenaltyZoneId | null) {
  return PENALTY_ZONES.find((z) => z.id === zone) || PENALTY_ZONES[2];
}

function pickRandomZone(): PenaltyZoneId {
  return PENALTY_ZONE_LIST[Math.floor(Math.random() * PENALTY_ZONE_LIST.length)];
}

function createDefaultOnlineRoom(): SoccerOnlineRoom {
  return {
    status: 'idle',
    rev: 0,
    matchId: '',
    modeKind: 'penalty',
    hostId: '',
    p1Id: '',
    p1Name: '',
    p2Id: null,
    p2Name: null,
    p1Goals: 0,
    p2Goals: 0,
    timeLeft: TURN_SECONDS,
    p1x: 260,
    p1y: 295,
    p1Dir: 'up',
    p1Moving: false,
    p2x: 260,
    p2y: 65,
    p2Dir: 'down',
    p2Moving: false,
    bx: 260,
    by: 280,
    bvx: 0,
    bvy: 0,
    goalBannerText: '',
    goalBannerUntil: 0,
    readyMap: {},
    phase: 'choosing',
    kickIndex: 0,
    maxKicks: 10,
    p1History: [],
    p2History: [],
    turnDeadlineAt: 0,
    animStartedAt: 0,
    lastShotZone: null,
    lastSaveZone: null,
    lastResult: null,
    lastShooterId: null,
    shotLockedBy: null,
    saveLockedBy: null,
    updatedAt: 0
  };
}

export function createSoccerMiniGame(deps: SoccerEngineDeps) {
  const W = 520;
  const H = 360;
  const GOAL_X1 = 185;
  const GOAL_X2 = 335;
  const GOAL_Y = 26;

  // Penalty Goal Frame dimensions
  const PEN_GOAL_X1 = 100;
  const PEN_GOAL_X2 = 420;
  const PEN_GOAL_Y1 = 24;
  const PEN_GOAL_Y2 = 148;
  const PEN_BALL_START_X = 260;
  const PEN_BALL_START_Y = 278;

  let rafId: number | null = null;
  let timerId: number | null = null;
  let syncPollId: number | null = null;
  let hostAdvanceTimer: number | null = null;
  let active = false;
  let mode: 'menu' | 'solo' | 'online_2p' | 'spectator' = 'menu';

  const heldDir = { up: false, down: false, left: false, right: false };

  // Solo match state (1P vs AI dribble & shoot)
  let solo = {
    playerGoals: 0,
    aiGoals: 0,
    timeLeft: 45,
    finished: false,
    goalBannerUntil: 0,
    goalBannerText: '',
    px: 260,
    py: 295,
    pDir: 'up',
    pMoving: false,
    bx: 260,
    by: 255,
    bvx: 0,
    bvy: 0,
    bAngle: 0,
    gkX: 260,
    gkVx: 2.2,
    defX: 260,
    defY: 165,
    defVx: 2.0,
    kickCooldownUntil: 0
  };

  // Online 2P & Spectator Penalty Shootout state
  let roomState: SoccerOnlineRoom = createDefaultOnlineRoom();
  let lastRoomPushAt = 0;
  let lastLobbySignature = '';
  let lastPenaltyUiSignature = '';
  let lastSoundPlayedKickIndex = -1;
  let myLocalPick: { kickIndex: number; zone: PenaltyZoneId; matchId: string } | null = null;
  let remoteShotPayload: PenaltyPickPayload | null = null;
  let remoteSavePayload: PenaltyPickPayload | null = null;
  let resolvingKickIndex = -1;
  let localWriteSeq = 0;
  let pullInFlight = false;
  let pullStartedAt = 0;
  let localAnimKickKey = '';
  let localAnimStartedAt = 0;

  function clearHostAdvanceTimer() {
    if (hostAdvanceTimer !== null) {
      clearTimeout(hostAdvanceTimer);
      hostAdvanceTimer = null;
    }
  }

  function getCurrentShooterId(r: SoccerOnlineRoom = roomState): string {
    const idx = r.kickIndex || 0;
    return idx % 2 === 0 ? r.p1Id : r.p2Id || '';
  }

  function getCurrentKeeperId(r: SoccerOnlineRoom = roomState): string {
    const idx = r.kickIndex || 0;
    return idx % 2 === 0 ? r.p2Id || '' : r.p1Id;
  }

  function pushOnlineRoom(immediate = false, revBump = 1) {
    const now = Date.now();
    if (!immediate && now - lastRoomPushAt < 105) return;
    lastRoomPushAt = now;
    localWriteSeq += 1;
    const slug = normalizeFamilySlug(deps.getState().familyName);
    const fbRoot = getFamilyFirebaseRoot(deps.getState().familyName);
    roomState.rev = (roomState.rev || 0) + revBump;
    roomState.updatedAt = Math.max(now, (roomState.updatedAt || 0) + 1);
    try {
      localStorage.setItem(`${LOCAL_SOCCER_ROOM_KEY}_${slug}`, JSON.stringify(roomState));
    } catch {
      // ignore
    }
    const fb = deps.getFirebaseUrl();
    if (fb) {
      fetch(`${fb}/${fbRoot}/soccer_room.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roomState)
      }).catch(() => {});
    }
  }

  function pushPenaltyPick(role: 'shot' | 'save', payload: PenaltyPickPayload) {
    const slug = normalizeFamilySlug(deps.getState().familyName);
    const fbRoot = getFamilyFirebaseRoot(deps.getState().familyName);
    const localKey = role === 'shot' ? `${LOCAL_PEN_SHOT_KEY}_${slug}` : `${LOCAL_PEN_SAVE_KEY}_${slug}`;
    try {
      localStorage.setItem(localKey, JSON.stringify(payload));
    } catch {
      // ignore
    }
    if (role === 'shot') remoteShotPayload = payload;
    else remoteSavePayload = payload;

    const fb = deps.getFirebaseUrl();
    if (fb) {
      const node = role === 'shot' ? 'soccer_penalty_shot.json' : 'soccer_penalty_save.json';
      fetch(`${fb}/${fbRoot}/${node}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => {});
    }
  }

  function clearPenaltyPickNodes() {
    const slug = normalizeFamilySlug(deps.getState().familyName);
    const fbRoot = getFamilyFirebaseRoot(deps.getState().familyName);
    remoteShotPayload = null;
    remoteSavePayload = null;
    try {
      localStorage.removeItem(`${LOCAL_PEN_SHOT_KEY}_${slug}`);
      localStorage.removeItem(`${LOCAL_PEN_SAVE_KEY}_${slug}`);
    } catch {
      // ignore
    }
    const fb = deps.getFirebaseUrl();
    if (fb) {
      fetch(`${fb}/${fbRoot}/soccer_penalty_shot.json`, { method: 'DELETE' }).catch(() => {});
      fetch(`${fb}/${fbRoot}/soccer_penalty_save.json`, { method: 'DELETE' }).catch(() => {});
    }
  }

  function shouldAcceptRemoteRoom(remote: SoccerOnlineRoom, local: SoccerOnlineRoom): boolean {
    if (!remote || typeof remote !== 'object') return false;
    const rStatus = remote.status || 'idle';
    const lStatus = local?.status || 'idle';
    if (lStatus === 'idle' && rStatus !== 'idle') return true;
    if (lStatus === 'lobby' && (rStatus === 'playing' || rStatus === 'finished')) {
      if (!remote.hostId || !local.hostId || remote.hostId === local.hostId) return true;
    }
    if (lStatus === 'finished' && rStatus === 'playing' && remote.matchId && remote.matchId !== local.matchId) {
      return true;
    }
    if (remote.matchId && remote.matchId !== local.matchId && rStatus === 'playing') {
      return true;
    }
    const rRev = remote.rev || 0;
    const lRev = local?.rev || 0;
    if (rRev > lRev) return true;
    if (rRev === lRev && (remote.updatedAt || 0) > (local?.updatedAt || 0)) return true;
    if (lStatus === 'lobby' && rStatus === 'lobby') {
      if (remote.p2Id !== local.p2Id) return true;
      if (JSON.stringify(remote.readyMap || {}) !== JSON.stringify(local.readyMap || {})) return true;
    }
    return false;
  }

  function pullPenaltyPicksForHost() {
    const slug = normalizeFamilySlug(deps.getState().familyName);
    const fbRoot = getFamilyFirebaseRoot(deps.getState().familyName);
    const fb = deps.getFirebaseUrl();
    const curKick = roomState.kickIndex || 0;
    const shooterId = getCurrentShooterId();
    const keeperId = getCurrentKeeperId();

    const handleShot = (shot: PenaltyPickPayload | null) => {
      if (shot && shot.kickIndex === curKick && shot.playerId === shooterId) {
        remoteShotPayload = shot;
        if (roomState.shotLockedBy !== shooterId) {
          roomState.shotLockedBy = shooterId;
          pushOnlineRoom(true);
          renderPenaltyControlsPanel();
        }
      }
      tryHostResolvePenaltyKick();
    };

    const handleSave = (save: PenaltyPickPayload | null) => {
      if (save && save.kickIndex === curKick && save.playerId === keeperId) {
        remoteSavePayload = save;
        if (roomState.saveLockedBy !== keeperId) {
          roomState.saveLockedBy = keeperId;
          pushOnlineRoom(true);
          renderPenaltyControlsPanel();
        }
      }
      tryHostResolvePenaltyKick();
    };

    if (fb) {
      fetch(`${fb}/${fbRoot}/soccer_penalty_shot.json`, { cache: 'no-store' })
        .then((r) => r.json())
        .then((d: PenaltyPickPayload | null) => handleShot(d))
        .catch(() => {});
      fetch(`${fb}/${fbRoot}/soccer_penalty_save.json`, { cache: 'no-store' })
        .then((r) => r.json())
        .then((d: PenaltyPickPayload | null) => handleSave(d))
        .catch(() => {});
    } else {
      try {
        const sRaw = localStorage.getItem(`${LOCAL_PEN_SHOT_KEY}_${slug}`);
        if (sRaw) handleShot(JSON.parse(sRaw));
        const kRaw = localStorage.getItem(`${LOCAL_PEN_SAVE_KEY}_${slug}`);
        if (kRaw) handleSave(JSON.parse(kRaw));
      } catch {
        // ignore
      }
    }
  }

  function pullSoccerRoomFromFirebase() {
    const slug = normalizeFamilySlug(deps.getState().familyName);
    const fbRoot = getFamilyFirebaseRoot(deps.getState().familyName);
    const fb = deps.getFirebaseUrl();
    if (fb) {
      const now = Date.now();
      if (!pullInFlight || now - pullStartedAt >= 2500) {
        pullInFlight = true;
        pullStartedAt = now;
        const seqAtStart = localWriteSeq;
        fetch(`${fb}/${fbRoot}/soccer_room.json`, { cache: 'no-store' })
          .then((r) => r.json())
          .then((remote: SoccerOnlineRoom | null) => {
            if (!remote) return;
            if (seqAtStart !== localWriteSeq && roomState.status === 'playing' && remote.status === 'lobby') {
              return;
            }
            if (shouldAcceptRemoteRoom(remote, roomState)) {
              onRemoteSoccerRoomUpdate(remote);
            }
          })
          .catch(() => {})
          .finally(() => {
            pullInFlight = false;
          });
      }

      const me = deps.getCurrentUser();
      if (
        active &&
        mode === 'online_2p' &&
        roomState.status === 'playing' &&
        roomState.phase === 'choosing' &&
        roomState.hostId === me.id
      ) {
        pullPenaltyPicksForHost();
      }
    } else {
      try {
        const localStr = localStorage.getItem(`${LOCAL_SOCCER_ROOM_KEY}_${slug}`);
        if (localStr) {
          const parsed = JSON.parse(localStr) as SoccerOnlineRoom;
          if (parsed && shouldAcceptRemoteRoom(parsed, roomState)) {
            onRemoteSoccerRoomUpdate(parsed);
          }
        }
        const me = deps.getCurrentUser();
        if (
          active &&
          mode === 'online_2p' &&
          roomState.status === 'playing' &&
          roomState.phase === 'choosing' &&
          roomState.hostId === me.id
        ) {
          pullPenaltyPicksForHost();
        }
      } catch {
        // ignore
      }
    }
  }

  function playPenaltyAnimationSoundIfNew(r: SoccerOnlineRoom) {
    if (r.status !== 'playing' || r.phase !== 'animating') return;
    const kickIdx = r.kickIndex || 0;
    if (lastSoundPlayedKickIndex === kickIdx) return;
    lastSoundPlayedKickIndex = kickIdx;
    if (r.lastResult === 'goal') {
      deps.playCoin();
    } else {
      deps.playError();
    }
  }

  function onRemoteSoccerRoomUpdate(remote: SoccerOnlineRoom) {
    const me = deps.getCurrentUser();
    const isHostAuthoritative =
      active &&
      mode === 'online_2p' &&
      roomState.hostId === me.id &&
      roomState.status === 'playing' &&
      remote.matchId === roomState.matchId;
    if (isHostAuthoritative) return;

    const prevStatus = roomState.status;
    const prevMatchId = roomState.matchId || '';
    const prevKick = roomState.kickIndex ?? -1;
    roomState = {
      ...createDefaultOnlineRoom(),
      ...remote,
      readyMap: remote.readyMap && typeof remote.readyMap === 'object' ? remote.readyMap : {},
      p1History: Array.isArray(remote.p1History) ? remote.p1History : [],
      p2History: Array.isArray(remote.p2History) ? remote.p2History : []
    };

    if (roomState.matchId !== prevMatchId || (roomState.kickIndex ?? 0) !== prevKick) {
      if (myLocalPick && (myLocalPick.kickIndex !== (roomState.kickIndex ?? 0) || myLocalPick.matchId !== (roomState.matchId || ''))) {
        myLocalPick = null;
      }
      lastPenaltyUiSignature = '';
    }

    const isParticipant = roomState.p1Id === me.id || roomState.p2Id === me.id;
    if (prevStatus === 'playing' && roomState.status === 'idle' && mode === 'online_2p') {
      clearHostAdvanceTimer();
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }
      deps.showToast('🚪 Chủ phòng đã thoát khỏi phòng bóng đá!');
    }

    if (
      roomState.status === 'playing' &&
      (prevStatus !== 'playing' || (roomState.matchId && roomState.matchId !== prevMatchId)) &&
      isParticipant
    ) {
      mode = 'online_2p';
      lastSoundPlayedKickIndex = -1;
      myLocalPick = null;
      lastPenaltyUiSignature = '';
      const modalEl = document.getElementById('soccer-modal');
      if (!modalEl || modalEl.style.display !== 'flex') {
        if (deps.openModal) {
          deps.openModal('soccer-modal');
        } else if (modalEl) {
          modalEl.style.display = 'flex';
          openSoccerArena();
        }
      } else {
        renderUIState();
      }
      deps.playSuccess();
      deps.showToast('⚽ Loạt Đá Luân Lưu 1v1 đã bắt đầu!');
      return;
    }

    if (roomState.status === 'finished' && prevStatus === 'playing' && isParticipant) {
      if (roomState.p1Goals > roomState.p2Goals && roomState.p1Id === me.id) {
        deps.playSuccess();
        deps.triggerConfetti();
      } else if (roomState.p2Goals > roomState.p1Goals && roomState.p2Id === me.id) {
        deps.playSuccess();
        deps.triggerConfetti();
      }
    }

    playPenaltyAnimationSoundIfNew(roomState);

    if (active) {
      const modalEl = document.getElementById('soccer-modal');
      if (modalEl && modalEl.style.display === 'flex') {
        if (roomState.status === 'playing') {
          if (isParticipant) mode = 'online_2p';
          else if (mode !== 'solo') mode = 'spectator';
        } else if (roomState.status === 'idle' && mode === 'spectator') {
          mode = 'menu';
        }
        renderUIState();
      }
    }
  }

  function onRemoteP2InputUpdate(_inp: SoccerPlayerInput) {
    // Kept as no-op compatibility hook for external bridge
  }

  function getNearbyMembersAtPitch(): Member[] {
    const st = deps.getState();
    const pitchLoc = resolveNeighborhoodLocations(st).find((l) => l.id === 'soccer');
    const px = pitchLoc ? pitchLoc.x : 2060;
    const py = pitchLoc ? pitchLoc.y : 1400;
    return st.members.filter(
      (m) => m.scene === 'neighborhood' && Math.hypot(m.x - px, m.y - py) <= 220
    );
  }

  function resetSoloPositions() {
    solo.px = 260;
    solo.py = 300;
    solo.pDir = 'up';
    solo.pMoving = false;
    solo.bx = 260;
    solo.by = 258;
    solo.bvx = 0;
    solo.bvy = 0;
    solo.gkX = 260;
    solo.defX = 260;
    solo.defY = 162;
  }

  function openSoccerArena() {
    active = true;
    lastLobbySignature = '';
    lastPenaltyUiSignature = '';
    pullSoccerRoomFromFirebase();

    const me = deps.getCurrentUser();
    if (roomState.status === 'playing') {
      if (roomState.p1Id === me.id || roomState.p2Id === me.id) {
        mode = 'online_2p';
      } else {
        mode = 'spectator';
      }
    } else if (roomState.status === 'lobby') {
      mode = 'online_2p';
    } else {
      mode = 'solo';
      startSoloMatchInternal();
    }

    startLoopAndSync();
    renderUIState();
  }

  function startSoloMatchInternal() {
    mode = 'solo';
    solo.playerGoals = 0;
    solo.aiGoals = 0;
    solo.timeLeft = 45;
    solo.finished = false;
    solo.goalBannerUntil = 0;
    solo.goalBannerText = '';
    resetSoloPositions();

    if (timerId) clearInterval(timerId);
    timerId = window.setInterval(() => {
      if (!active || mode !== 'solo' || solo.finished) return;
      solo.timeLeft = Math.max(0, solo.timeLeft - 1);
      updateScoreHUD();
      if (solo.timeLeft <= 0) {
        finishSoloMatch();
      }
    }, 1000);
    renderUIState();
  }

  function startLoopAndSync() {
    if (syncPollId) clearInterval(syncPollId);
    syncPollId = window.setInterval(() => {
      if (!active) return;
      pullSoccerRoomFromFirebase();
      if (mode === 'online_2p' && (roomState.status === 'lobby' || roomState.status === 'finished')) {
        renderLobbyPanel();
      }
    }, 140);

    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);
  }

  function stopMatch() {
    active = false;
    heldDir.up = heldDir.down = heldDir.left = heldDir.right = false;
    clearHostAdvanceTimer();
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    if (syncPollId) {
      clearInterval(syncPollId);
      syncPollId = null;
    }
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function finishSoloMatch() {
    solo.finished = true;
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    const me = deps.getCurrentUser();
    const brand = (deps.getState().familyName || 'B2KS').trim() || 'B2KS';
    if (solo.playerGoals > solo.aiGoals) {
      deps.playSuccess();
      deps.triggerConfetti();
      deps.triggerSpeechBubble(me, formatFamilyBrand(`We won ${solo.playerGoals}-${solo.aiGoals} at B2KS Stadium! ⚽🏆`, brand), true);
      deps.showToast(formatFamilyBrand(`🏆 Chiến thắng ${solo.playerGoals} - ${solo.aiGoals} tại Sân Bóng Đá B2KS!`, brand));
    } else if (solo.playerGoals === solo.aiGoals) {
      deps.playClick();
      deps.triggerSpeechBubble(me, `Nice draw ${solo.playerGoals}-${solo.aiGoals}! Good game! ⚽`, true);
    } else {
      deps.playClick();
      deps.triggerSpeechBubble(me, `Good match! Let's play again! ⚽`, true);
    }
    updateScoreHUD();
  }

  function checkShouldEndPenaltyMatch(p1Hist: ('G' | 'M')[], p2Hist: ('G' | 'M')[], p1G: number, p2G: number): boolean {
    const k1 = p1Hist.length;
    const k2 = p2Hist.length;
    if (k1 <= 5 && k2 <= 5) {
      const p1Left = 5 - k1;
      const p2Left = 5 - k2;
      if (p1G > p2G + p2Left) return true;
      if (p2G > p1G + p1Left) return true;
      if (k1 === 5 && k2 === 5 && p1G !== p2G) return true;
      return false;
    }
    // Sudden death pairs
    return k1 === k2 && p1G !== p2G;
  }

  function tryHostResolvePenaltyKick() {
    const me = deps.getCurrentUser();
    if (
      roomState.status !== 'playing' ||
      roomState.hostId !== me.id ||
      roomState.phase !== 'choosing'
    ) {
      return;
    }
    const curKick = roomState.kickIndex || 0;
    if (resolvingKickIndex === curKick) return;

    const shooterId = getCurrentShooterId();
    const keeperId = getCurrentKeeperId();
    const shotValid =
      remoteShotPayload &&
      remoteShotPayload.kickIndex === curKick &&
      remoteShotPayload.playerId === shooterId;
    const saveValid =
      remoteSavePayload &&
      remoteSavePayload.kickIndex === curKick &&
      remoteSavePayload.playerId === keeperId;
    const timedOut = roomState.turnDeadlineAt && Date.now() >= roomState.turnDeadlineAt;

    if (!((shotValid && saveValid) || timedOut)) return;

    resolvingKickIndex = curKick;
    const shotZone: PenaltyZoneId = shotValid ? remoteShotPayload!.zone : pickRandomZone();
    const saveZone: PenaltyZoneId = saveValid ? remoteSavePayload!.zone : pickRandomZone();
    const isGoal = shotZone !== saveZone;

    const p1Hist = [...(roomState.p1History || [])];
    const p2Hist = [...(roomState.p2History || [])];
    if (shooterId === roomState.p1Id) {
      p1Hist.push(isGoal ? 'G' : 'M');
      if (isGoal) roomState.p1Goals += 1;
    } else {
      p2Hist.push(isGoal ? 'G' : 'M');
      if (isGoal) roomState.p2Goals += 1;
    }

    const shooterName = shooterId === roomState.p1Id ? roomState.p1Name : (roomState.p2Name || 'P2');
    const keeperName = keeperId === roomState.p1Id ? roomState.p1Name : (roomState.p2Name || 'P2');

    const now = Date.now();
    roomState.phase = 'animating';
    roomState.p1History = p1Hist;
    roomState.p2History = p2Hist;
    roomState.lastShotZone = shotZone;
    roomState.lastSaveZone = saveZone;
    roomState.lastResult = isGoal ? 'goal' : 'saved';
    roomState.lastShooterId = shooterId;
    roomState.animStartedAt = now;
    roomState.goalBannerText = isGoal
      ? `⚽ VÀOOOO! ${shooterName} sút tung lưới!`
      : `🧤 CẢN PHÁ! ${keeperName} bay người xuất thần!`;
    roomState.goalBannerUntil = now + ANIM_DURATION_MS;

    pushOnlineRoom(true, 2);
    playPenaltyAnimationSoundIfNew(roomState);
    renderUIState();

    clearHostAdvanceTimer();
    hostAdvanceTimer = window.setTimeout(() => {
      if (roomState.status !== 'playing' || roomState.hostId !== deps.getCurrentUser().id) return;
      const done = checkShouldEndPenaltyMatch(
        roomState.p1History || [],
        roomState.p2History || [],
        roomState.p1Goals,
        roomState.p2Goals
      );
      if (done) {
        finishOnlineMatch();
        return;
      }
      roomState.kickIndex = curKick + 1;
      roomState.phase = 'choosing';
      roomState.timeLeft = TURN_SECONDS;
      roomState.turnDeadlineAt = Date.now() + TURN_SECONDS * 1000;
      roomState.shotLockedBy = null;
      roomState.saveLockedBy = null;
      roomState.goalBannerText = '';
      roomState.goalBannerUntil = 0;
      myLocalPick = null;
      remoteShotPayload = null;
      remoteSavePayload = null;
      resolvingKickIndex = -1;
      clearPenaltyPickNodes();
      pushOnlineRoom(true, 2);
      renderUIState();
    }, ANIM_DURATION_MS);
  }

  function finishOnlineMatch() {
    clearHostAdvanceTimer();
    roomState.status = 'finished';
    roomState.readyMap = {
      ...(roomState.p1Id ? { [roomState.p1Id]: false } : {}),
      ...(roomState.p2Id ? { [roomState.p2Id]: false } : {})
    };
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    pushOnlineRoom(true, 3);
    const me = deps.getCurrentUser();
    if (roomState.p1Goals > roomState.p2Goals) {
      deps.playSuccess();
      deps.triggerConfetti();
      deps.showToast(`🏆 ${roomState.p1Name} thắng luân lưu ${roomState.p1Goals} - ${roomState.p2Goals}!`);
      if (me.id === roomState.p1Id) {
        deps.triggerSpeechBubble(me, `Penalty Victory ${roomState.p1Goals}-${roomState.p2Goals}! ⚽🏆`, true);
      }
    } else if (roomState.p2Goals > roomState.p1Goals) {
      deps.playSuccess();
      deps.triggerConfetti();
      deps.showToast(`🏆 ${roomState.p2Name} thắng luân lưu ${roomState.p2Goals} - ${roomState.p1Goals}!`);
      if (me.id === roomState.p2Id) {
        deps.triggerSpeechBubble(me, `Penalty Victory ${roomState.p2Goals}-${roomState.p1Goals}! ⚽🏆`, true);
      }
    } else {
      deps.playClick();
      deps.showToast(`🤝 Trận hòa ${roomState.p1Goals} - ${roomState.p2Goals}!`);
    }
    lastLobbySignature = '';
    renderUIState();
  }

  // Lobby & Mode Controls
  function switchToSoloMode() {
    deps.playClick();
    startSoloMatchInternal();
  }

  function switchTo2PMode() {
    deps.playClick();
    mode = 'online_2p';
    pullSoccerRoomFromFirebase();
    renderUIState();
  }

  function create2PRoom() {
    const me = deps.getCurrentUser();
    deps.playClick();
    clearHostAdvanceTimer();
    const prevRev = roomState?.rev || 0;
    roomState = createDefaultOnlineRoom();
    roomState.rev = prevRev;
    roomState.status = 'lobby';
    roomState.modeKind = 'penalty';
    roomState.hostId = me.id;
    roomState.p1Id = me.id;
    roomState.p1Name = me.name;
    roomState.readyMap = { [me.id]: false };
    clearPenaltyPickNodes();
    mode = 'online_2p';
    lastLobbySignature = '';
    pushOnlineRoom(true);
    renderUIState();
    deps.showToast('⚽ Đã tạo phòng Đá Luân Lưu 1v1! Đợi người thứ 2 bấm Tham Gia...');
  }

  function join2PRoom() {
    const me = deps.getCurrentUser();
    if (roomState.status !== 'lobby' && roomState.status !== 'finished') return;
    if (roomState.p1Id === me.id) return deps.showToast('ℹ️ Bạn đang là Chủ phòng (Đội Xanh P1)!');
    if (roomState.p2Id && roomState.p2Id !== me.id) return deps.showToast('⚠️ Phòng đã đủ 2 người! Bạn có thể làm Khán giả xem trực tiếp.');
    deps.playSuccess();
    roomState.p2Id = me.id;
    roomState.p2Name = me.name;
    roomState.readyMap = {
      ...(roomState.readyMap || {}),
      [roomState.p1Id]: Boolean(roomState.readyMap?.[roomState.p1Id]),
      [me.id]: false
    };
    mode = 'online_2p';
    lastLobbySignature = '';
    pushOnlineRoom(true);
    renderUIState();
    deps.showToast(`🔴 ${me.name} đã vào Đội Đỏ (P2)!`);
  }

  function toggle2PReady() {
    const me = deps.getCurrentUser();
    if (roomState.status !== 'lobby' && roomState.status !== 'finished') return;
    if (roomState.p1Id !== me.id && roomState.p2Id !== me.id) return;
    localWriteSeq += 1;
    deps.playClick();
    const nextReady = !Boolean(roomState.readyMap?.[me.id]);
    const nextRev = (roomState.rev || 0) + 1;
    const nextTs = Math.max(Date.now(), (roomState.updatedAt || 0) + 1);
    roomState.readyMap = {
      ...(roomState.readyMap || {}),
      [me.id]: nextReady
    };
    roomState.rev = nextRev;
    roomState.updatedAt = nextTs;

    const slug = normalizeFamilySlug(deps.getState().familyName);
    const fbRoot = getFamilyFirebaseRoot(deps.getState().familyName);
    try {
      localStorage.setItem(`${LOCAL_SOCCER_ROOM_KEY}_${slug}`, JSON.stringify(roomState));
    } catch {
      // ignore
    }
    const fb = deps.getFirebaseUrl();
    if (fb) {
      Promise.all([
        fetch(`${fb}/${fbRoot}/soccer_room/readyMap/${me.id}.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(nextReady)
        }),
        fetch(`${fb}/${fbRoot}/soccer_room.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rev: nextRev, updatedAt: nextTs })
        })
      ]).catch(() => {});
    }

    lastLobbySignature = '';
    renderLobbyPanel();
  }

  function start2PMatch() {
    const me = deps.getCurrentUser();
    if ((roomState.status !== 'lobby' && roomState.status !== 'finished') || roomState.hostId !== me.id) {
      if (roomState.hostId !== me.id) {
        deps.playError();
        deps.showToast('⚠️ Chỉ người tạo phòng mới có thể bấm Vào Game!');
      }
      return;
    }
    if (!roomState.p2Id) return deps.showToast('⏳ Cần có Người chơi 2 tham gia trước!');
    const p1Ready = Boolean(roomState.readyMap?.[roomState.p1Id]);
    const p2Ready = Boolean(roomState.readyMap?.[roomState.p2Id]);
    if (!p1Ready || !p2Ready) {
      deps.playError();
      return deps.showToast('⚠️ Cả 2 người chơi phải bấm "✅ Sẵn Sàng" mới có thể vào game!');
    }

    clearHostAdvanceTimer();
    clearPenaltyPickNodes();
    deps.playSuccess();
    const now = Date.now();
    roomState.status = 'playing';
    roomState.modeKind = 'penalty';
    roomState.matchId = `pen_${now}_${Math.random().toString(36).slice(2, 6)}`;
    roomState.p1Goals = 0;
    roomState.p2Goals = 0;
    roomState.p1History = [];
    roomState.p2History = [];
    roomState.kickIndex = 0;
    roomState.maxKicks = 10;
    roomState.phase = 'choosing';
    roomState.timeLeft = TURN_SECONDS;
    roomState.turnDeadlineAt = now + TURN_SECONDS * 1000;
    roomState.animStartedAt = 0;
    roomState.lastShotZone = null;
    roomState.lastSaveZone = null;
    roomState.lastResult = null;
    roomState.lastShooterId = null;
    roomState.shotLockedBy = null;
    roomState.saveLockedBy = null;
    roomState.goalBannerText = '';
    roomState.goalBannerUntil = 0;
    myLocalPick = null;
    resolvingKickIndex = -1;
    lastSoundPlayedKickIndex = -1;
    lastPenaltyUiSignature = '';
    pushOnlineRoom(true, 10);

    if (timerId) clearInterval(timerId);
    timerId = window.setInterval(() => {
      if (
        !active ||
        mode !== 'online_2p' ||
        roomState.status !== 'playing' ||
        roomState.hostId !== deps.getCurrentUser().id
      ) {
        return;
      }
      if (roomState.phase === 'choosing' && roomState.turnDeadlineAt) {
        const rem = Math.max(0, Math.ceil((roomState.turnDeadlineAt - Date.now()) / 1000));
        if (rem !== roomState.timeLeft) {
          roomState.timeLeft = rem;
          pushOnlineRoom(true);
          updateScoreHUD();
        }
        if (rem <= 0) {
          tryHostResolvePenaltyKick();
        }
      }
    }, 350);

    renderUIState();
  }

  function leave2PRoom() {
    const me = deps.getCurrentUser();
    deps.playClick();
    clearHostAdvanceTimer();
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    const prevRev = roomState?.rev || 0;
    if (roomState.p1Id === me.id || roomState.hostId === me.id) {
      roomState = createDefaultOnlineRoom();
      roomState.rev = prevRev;
      clearPenaltyPickNodes();
    } else if (roomState.p2Id === me.id) {
      const nextReady = { ...(roomState.readyMap || {}) };
      delete nextReady[me.id];
      roomState.readyMap = nextReady;
      roomState.p2Id = null;
      roomState.p2Name = null;
      if (roomState.status === 'playing' || roomState.status === 'finished') {
        roomState.status = 'lobby';
      }
    }
    pushOnlineRoom(true);
    mode = 'online_2p';
    lastLobbySignature = '';
    lastPenaltyUiSignature = '';
    renderUIState();
  }

  function spectateMatch() {
    deps.playClick();
    mode = 'spectator';
    renderUIState();
  }

  function pickPenaltyZone(zone: PenaltyZoneId) {
    if (!active || mode !== 'online_2p' || roomState.status !== 'playing') return;
    if (roomState.phase !== 'choosing') {
      return deps.showToast('⏳ Đang thực hiện cú sút, chờ lượt tiếp theo nhé!');
    }
    const me = deps.getCurrentUser();
    const curKick = roomState.kickIndex || 0;
    const shooterId = getCurrentShooterId();
    const keeperId = getCurrentKeeperId();
    if (me.id !== shooterId && me.id !== keeperId) return;

    if (
      myLocalPick &&
      myLocalPick.kickIndex === curKick &&
      myLocalPick.matchId === (roomState.matchId || '')
    ) {
      return deps.showToast(`✅ Bạn đã khóa hướng ${getZoneDef(myLocalPick.zone).label} cho lượt này rồi!`);
    }

    const role: 'shot' | 'save' = me.id === shooterId ? 'shot' : 'save';
    const payload: PenaltyPickPayload = {
      kickIndex: curKick,
      playerId: me.id,
      zone,
      ts: Date.now()
    };
    myLocalPick = { kickIndex: curKick, zone, matchId: roomState.matchId || '' };
    deps.playClick();
    pushPenaltyPick(role, payload);

    if (role === 'shot') roomState.shotLockedBy = me.id;
    else roomState.saveLockedBy = me.id;

    if (roomState.hostId === me.id) {
      pushOnlineRoom(true);
      tryHostResolvePenaltyKick();
    }
    lastPenaltyUiSignature = '';
    renderPenaltyControlsPanel();
  }

  function renderUIState() {
    const btn1p = document.getElementById('soccer-mode-1p-btn');
    const btn2p = document.getElementById('soccer-mode-2p-btn');
    const btnSpec = document.getElementById('soccer-mode-spec-btn');
    const lobbyPanel = document.getElementById('soccer-2p-lobby');
    const pitchWrap = document.getElementById('soccer-pitch-wrap');
    const controlsWrap = document.getElementById('soccer-controls-wrap');
    const soloControls = document.getElementById('soccer-solo-controls');
    const penaltyControls = document.getElementById('soccer-penalty-controls');
    const restartBtn = document.getElementById('soccer-restart-btn');

    const hasLiveOnline = roomState.status === 'playing' || roomState.status === 'lobby';
    if (btn1p) btn1p.style.background = mode === 'solo' ? '#15803D' : '#64748B';
    if (btn2p) btn2p.style.background = mode === 'online_2p' ? '#0284C7' : '#64748B';
    if (btnSpec) {
      btnSpec.style.display = hasLiveOnline ? 'inline-flex' : 'none';
      btnSpec.style.background = mode === 'spectator' ? '#DC2626' : '#64748B';
    }

    const showLobby =
      mode === 'online_2p' &&
      (roomState.status === 'idle' || roomState.status === 'lobby' || roomState.status === 'finished');
    if (lobbyPanel) {
      lobbyPanel.style.display = showLobby ? 'block' : 'none';
      if (showLobby) renderLobbyPanel();
    }

    const showPitch =
      mode === 'solo' ||
      (mode === 'online_2p' && roomState.status === 'playing') ||
      mode === 'spectator';
    if (pitchWrap) pitchWrap.style.display = showPitch ? 'flex' : 'none';

    const showPlayerControls =
      mode === 'solo' ||
      (mode === 'online_2p' && roomState.status === 'playing');
    if (controlsWrap) controlsWrap.style.display = showPlayerControls ? 'flex' : 'none';

    if (soloControls) soloControls.style.display = mode === 'solo' ? 'flex' : 'none';
    if (penaltyControls) {
      const showPen = mode === 'online_2p' && roomState.status === 'playing';
      penaltyControls.style.display = showPen ? 'block' : 'none';
      if (showPen) renderPenaltyControlsPanel();
    }

    if (restartBtn) {
      restartBtn.style.display = mode === 'solo' ? 'inline-flex' : 'none';
    }

    updateScoreHUD();
  }

  function renderPenaltyControlsPanel() {
    const el = document.getElementById('soccer-penalty-controls');
    if (!el || mode !== 'online_2p' || roomState.status !== 'playing') return;

    const me = deps.getCurrentUser();
    const curKick = roomState.kickIndex || 0;
    const shooterId = getCurrentShooterId();
    const keeperId = getCurrentKeeperId();
    const isShooter = me.id === shooterId;
    const isKeeper = me.id === keeperId;
    const shooterName = shooterId === roomState.p1Id ? roomState.p1Name : (roomState.p2Name || 'P2');
    const keeperName = keeperId === roomState.p1Id ? roomState.p1Name : (roomState.p2Name || 'P2');

    const pickedZone =
      myLocalPick &&
      myLocalPick.kickIndex === curKick &&
      myLocalPick.matchId === (roomState.matchId || '')
        ? myLocalPick.zone
        : '';

    const oppLocked = isShooter
      ? roomState.saveLockedBy === keeperId
      : roomState.shotLockedBy === shooterId;
    const sig = `${roomState.matchId}|${curKick}|${roomState.phase}|${pickedZone}|${oppLocked ? 1 : 0}|${me.id}`;
    if (sig === lastPenaltyUiSignature) return;
    lastPenaltyUiSignature = sig;

    const canPick = roomState.phase === 'choosing' && (isShooter || isKeeper) && !pickedZone;
    const roleBanner =
      roomState.phase === 'animating'
        ? roomState.lastResult === 'goal'
          ? '⚽ VÀOOOOO! Đang chờ lượt sút tiếp theo...'
          : '🧤 THỦ MÔN CẢN PHÁ THÀNH CÔNG!'
        : isShooter
        ? `⚽ LƯỢT SÚT CỦA BẠN (${me.name}) — Chọn 1 góc để dứt điểm vào lưới ${keeperName}!`
        : `🧤 BẠN LÀM THỦ MÔN (${me.name}) — Đoán góc bay người cản cú sút của ${shooterName}!`;

    const lockHint =
      roomState.phase === 'animating'
        ? ''
        : pickedZone
        ? `✅ Bạn đã khóa hướng: ${getZoneDef(pickedZone).icon} ${getZoneDef(pickedZone).label} • ${oppLocked ? 'Đủ 2 bên, đang xử lý...' : '⏳ Đang chờ đối thủ chọn...'}`
        : oppLocked
        ? '⚡ Đối thủ đã khóa hướng rồi! Hãy bấm chọn hướng ngay!'
        : '💡 Bấm trực tiếp vào khung thành ở trên hoặc chọn nhanh 1 trong 5 hướng bên dưới:';

    el.innerHTML = `
      <div style="width:100%; display:flex; flex-direction:column; gap:8px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; background:${isShooter ? '#EFF6FF' : '#FEF3C7'}; border:2px solid ${isShooter ? '#2563EB' : '#D97706'}; border-radius:10px; padding:7px 10px;">
          <span style="font-size:12.5px; font-weight:700; color:${isShooter ? '#1E3A8A' : '#92400E'};">${roleBanner}</span>
          <span class="tag" style="background:#FFF; color:#0F172A; font-size:11px;">Lượt ${curKick + 1}${curKick >= 10 ? ' (Sudden Death)' : '/10'}</span>
        </div>
        <div style="display:grid; grid-template-columns:repeat(5, minmax(0, 1fr)); gap:6px;">
          ${PENALTY_ZONES.map((z) => {
            const selected = pickedZone === z.id;
            return `
              <button
                type="button"
                ${!canPick ? 'disabled' : ''}
                onclick="soccerPickPenaltyZone('${z.id}')"
                class="btn btn-sm"
                style="padding:8px 4px; font-size:11.5px; flex-direction:column; gap:2px; background:${selected ? '#16A34A' : canPick ? (isShooter ? '#0284C7' : '#D97706') : '#94A3B8'}; color:#FFF; border:2px solid #0F172A; opacity:${!canPick && !selected ? '0.55' : '1'}; cursor:${canPick ? 'pointer' : 'default'};"
              >
                <span style="font-size:16px; line-height:1;">${z.icon}</span>
                <span>${z.shortLabel}</span>
              </button>
            `;
          }).join('')}
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; font-size:11.5px; color:#334155;">
          <span>${lockHint}</span>
          <button type="button" class="btn btn-sm btn-danger" onclick="leaveSoccer2PRoom()">🚪 Rời Trận</button>
        </div>
      </div>
    `;
  }

  function renderHistoryDots(history: ('G' | 'M')[] = []): string {
    const slots = Math.max(5, history.length);
    let out = '';
    for (let i = 0; i < slots; i++) {
      const h = history[i];
      if (h === 'G') out += '⚽';
      else if (h === 'M') out += '❌';
      else out += '⬜';
    }
    return out;
  }

  function renderLobbyPanel() {
    const lobbyPanel = document.getElementById('soccer-2p-lobby');
    if (!lobbyPanel) return;
    const me = deps.getCurrentUser();
    const nearby = getNearbyMembersAtPitch();
    const p1Ready = Boolean(roomState.p1Id && roomState.readyMap?.[roomState.p1Id]);
    const p2Ready = Boolean(roomState.p2Id && roomState.readyMap?.[roomState.p2Id]);
    const sig = `${roomState.status}|${roomState.rev || 0}|${roomState.p1Id}|${roomState.p2Id}|${p1Ready ? 1 : 0}|${p2Ready ? 1 : 0}|${roomState.p1Goals}|${roomState.p2Goals}|${me.id}|${nearby.map((m) => m.id).join(',')}`;
    if (sig === lastLobbySignature) return;
    lastLobbySignature = sig;

    const nearbyHtml = nearby.length > 0
      ? nearby.map((m) => `<span class="tag" style="background:#D1FAE5; color:#065F46; border-color:#10B981;">${m.name}</span>`).join(' ')
      : '<span style="font-size:11.5px; color:#64748B;">Chưa có thêm thành viên nào đứng cạnh sân</span>';

    if (roomState.status === 'idle') {
      lobbyPanel.innerHTML = `
        <div style="text-align:center; padding:10px;">
          <div style="font-size:30px;">⚽🧤</div>
          <div style="font-weight:700; font-size:15px; color:#0F172A; margin-top:4px;">Đá Luân Lưu Penalty 2 Người Online (Miễn Phí 0⭐)</div>
          <div style="font-size:12px; color:#475569; margin:4px 0 8px;">1 người Sút phạt đền — 1 người làm Thủ môn bay người cản phá, luân phiên đổi vai qua từng lượt (5 lượt/người)!</div>
          <div style="font-size:12px; color:#475569; margin-bottom:10px;">Thành viên đang có mặt tại Sân Bóng: ${nearbyHtml}</div>
          <button type="button" class="btn btn-primary" style="padding:10px 18px; font-size:14px;" onclick="createSoccer2PRoom()">🏟️ Tạo Phòng Đá Luân Lưu 1v1</button>
        </div>
      `;
      return;
    }

    const isP1 = roomState.p1Id === me.id;
    const isP2 = roomState.p2Id === me.id;
    const isHost = roomState.hostId === me.id;
    const isFinished = roomState.status === 'finished';
    const myReady = Boolean(roomState.readyMap?.[me.id]);
    const bothReady = Boolean(roomState.p1Id && roomState.p2Id && p1Ready && p2Ready);

    lobbyPanel.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:10px;">
        ${isFinished ? `
          <div style="background:#FEF3C7; border:2px solid #F59E0B; border-radius:10px; padding:8px; text-align:center; font-weight:700; color:#92400E;">
            🏆 KẾT QUẢ LUÂN LƯU: 🔵 ${roomState.p1Name} (${roomState.p1Goals}) — (${roomState.p2Goals}) ${roomState.p2Name || 'P2'} 🔴
            <div style="font-size:12px; margin-top:4px;">${renderHistoryDots(roomState.p1History)} &nbsp;vs&nbsp; ${renderHistoryDots(roomState.p2History)}</div>
          </div>
        ` : ''}
        <div style="display:grid; grid-template-columns:1fr auto 1fr; gap:8px; align-items:center;">
          <div style="background:#EFF6FF; border:2.5px solid ${p1Ready ? '#16A34A' : '#2563EB'}; border-radius:10px; padding:10px; text-align:center;">
            <div style="font-size:11px; font-weight:700; color:#1D4ED8;">🔵 ĐỘI XANH (P1 • Chủ phòng)</div>
            <div style="font-size:15px; font-weight:700; color:#0F172A; margin-top:4px;">${roomState.p1Name}</div>
            <div style="font-size:11px; color:#64748B;">Sút trước lượt 1 • Luân phiên</div>
            <div style="margin-top:6px;">
              <span class="tag" style="background:${p1Ready ? '#16A34A' : '#F59E0B'}; color:#FFF; font-size:11px;">
                ${p1Ready ? '✅ Đã sẵn sàng' : '⏳ Chưa sẵn sàng'}
              </span>
            </div>
          </div>
          <div style="font-weight:700; font-size:16px; color:#0F172A;">VS</div>
          <div style="background:#FEF2F2; border:2.5px solid ${p2Ready ? '#16A34A' : '#DC2626'}; border-radius:10px; padding:10px; text-align:center;">
            <div style="font-size:11px; font-weight:700; color:#B91C1C;">🔴 ĐỘI ĐỎ (P2)</div>
            <div style="font-size:15px; font-weight:700; color:#0F172A; margin-top:4px;">${roomState.p2Name || '⏳ Đang chờ P2...'}</div>
            <div style="font-size:11px; color:#64748B;">Chụp trước lượt 1 • Luân phiên</div>
            <div style="margin-top:6px;">
              ${roomState.p2Id ? `<span class="tag" style="background:${p2Ready ? '#16A34A' : '#F59E0B'}; color:#FFF; font-size:11px;">${p2Ready ? '✅ Đã sẵn sàng' : '⏳ Chưa sẵn sàng'}</span>` : ''}
            </div>
          </div>
        </div>
        <div style="font-size:11.5px; color:#475569; text-align:center;">Đang ở Sân Bóng: ${nearbyHtml}</div>
        <div style="display:flex; gap:8px; justify-content:center; align-items:center; flex-wrap:wrap;">
          ${!isP1 && !isP2 && !roomState.p2Id ? `<button type="button" class="btn btn-primary" onclick="joinSoccer2PRoom()">🙋 Tham Gia Đội Đỏ (P2)</button>` : ''}
          ${(isP1 || isP2) ? `<button type="button" class="btn ${myReady ? 'btn-accent' : 'btn-primary'}" onclick="toggleSoccer2PReady()">${myReady ? '✅ Đã Sẵn Sàng (Hủy)' : '✋ Xác Nhận Sẵn Sàng'}</button>` : ''}
          ${isHost ? `<button type="button" class="btn" ${!bothReady ? 'disabled' : ''} style="background:${bothReady ? '#16A34A' : '#94A3B8'}; color:#FFF; ${!bothReady ? 'opacity:0.45; cursor:not-allowed; filter:grayscale(0.35);' : 'box-shadow:0 3px 0 #14532D;'}" onclick="startSoccer2PMatch()">🚀 ${isFinished ? 'Đá Lại Trận Mới' : 'Vào Game (Bắt Đầu!)'}</button>` : ''}
          ${isP2 ? `<span class="tag" style="background:#FEF9C3; color:#854D0E; border:1.5px solid #CA8A04; padding:7px 10px;">⏳ Chờ chủ phòng (${roomState.p1Name}) bấm Vào Game khi cả 2 Sẵn Sàng...</span>` : ''}
          ${(isP1 || isP2) ? `<button type="button" class="btn btn-danger btn-sm" onclick="leaveSoccer2PRoom()">🚪 Rời Phòng</button>` : ''}
          <button type="button" class="btn btn-sm" style="background:#7C3AED;" onclick="spectateSoccerMatch()">📺 Xem Đá (Khán giả)</button>
        </div>
      </div>
    `;
  }

  function updateScoreHUD() {
    const scoreEl = document.getElementById('soccer-scoreboard');
    const timeEl = document.getElementById('soccer-timer');
    const statusEl = document.getElementById('soccer-status-text');
    const me = deps.getCurrentUser();
    const brand = (deps.getState().familyName || 'B2KS').trim() || 'B2KS';

    if (mode === 'solo') {
      if (scoreEl) {
        scoreEl.innerHTML = `<span style="color:#0369A1;">⚽ ${me.name}: <b>${solo.playerGoals}</b></span> <span style="color:#64748B;">—</span> <span style="color:#B91C1C;"><b>${solo.aiGoals}</b> :Thủ môn ${brand} 🧤</span>`;
      }
      if (timeEl) timeEl.textContent = `⏱️ ${solo.timeLeft}s`;
      if (statusEl) {
        if (solo.finished) {
          statusEl.textContent =
            solo.playerGoals > solo.aiGoals
              ? `🏆 HẾT GIỜ! ${me.name} thắng ${solo.playerGoals} - ${solo.aiGoals}!`
              : solo.playerGoals === solo.aiGoals
              ? `🤝 HẾT GIỜ! Hòa ${solo.playerGoals} - ${solo.aiGoals}!`
              : `🧤 HẾT GIỜ! Đội ${brand} thắng ${solo.aiGoals} - ${solo.playerGoals}!`;
          statusEl.style.color = solo.playerGoals > solo.aiGoals ? '#15803D' : '#B45309';
        } else {
          statusEl.textContent = '🆓 Đá Solo 0⭐ • Rê bóng vượt hậu vệ & bấm ⚡ Sút vào lưới!';
          statusEl.style.color = '#1E293B';
        }
      }
      return;
    }

    if (scoreEl) {
      const p1Dots = renderHistoryDots(roomState.p1History);
      const p2Dots = renderHistoryDots(roomState.p2History);
      scoreEl.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:2px;">
          <div>
            <span style="color:#1D4ED8;">🔵 ${roomState.p1Name || 'P1'}: <b>${roomState.p1Goals}</b></span>
            <span style="color:#64748B;">—</span>
            <span style="color:#DC2626;"><b>${roomState.p2Goals}</b> :${roomState.p2Name || 'P2'} 🔴</span>
          </div>
          ${roomState.status === 'playing' || roomState.status === 'finished' ? `<div style="font-size:11px; letter-spacing:1px;">${p1Dots} &nbsp;|&nbsp; ${p2Dots}</div>` : ''}
        </div>
      `;
    }

    const displaySec =
      roomState.status === 'playing' && roomState.phase === 'choosing' && roomState.turnDeadlineAt
        ? Math.max(0, Math.ceil((roomState.turnDeadlineAt - Date.now()) / 1000))
        : roomState.timeLeft;
    if (timeEl) {
      timeEl.textContent = roomState.status === 'playing' ? `⏱️ ${displaySec}s` : '⚽ Luân Lưu';
    }

    if (statusEl) {
      if (mode === 'spectator') {
        statusEl.textContent =
          roomState.status === 'playing'
            ? `📺 KHÁN GIẢ TRỰC TIẾP: Đang theo dõi luân lưu ${roomState.p1Name} vs ${roomState.p2Name}!`
            : roomState.status === 'finished'
            ? `🏁 Trận đấu kết thúc (${roomState.p1Goals} - ${roomState.p2Goals})!`
            : `🟡 Đang chờ ${roomState.p1Name || 'Chủ phòng'} bắt đầu loạt sút luân lưu...`;
        statusEl.style.color = '#7C3AED';
      } else if (roomState.status === 'playing') {
        const shooterId = getCurrentShooterId();
        const shooterName = shooterId === roomState.p1Id ? roomState.p1Name : (roomState.p2Name || 'P2');
        const keeperId = getCurrentKeeperId();
        const keeperName = keeperId === roomState.p1Id ? roomState.p1Name : (roomState.p2Name || 'P2');
        statusEl.textContent = `⚽ ĐÁ LUÂN LƯU LƯỢT ${(roomState.kickIndex || 0) + 1}: ${shooterName} SÚT 🆚 ${keeperName} CHỤP`;
        statusEl.style.color = '#0369A1';
      } else {
        statusEl.textContent = '👥 Đá Luân Lưu 1v1 Miễn Phí (0⭐) — Thay phiên Sút & Chụp cực gay cấn!';
        statusEl.style.color = '#1E293B';
      }
    }
  }

  function mapCanvasCoordsToPenaltyZone(tx: number, ty: number): PenaltyZoneId | null {
    if (ty > 178 || tx < 60 || tx > 460) return null;
    let best = PENALTY_ZONES[2];
    let minDist = Infinity;
    for (const z of PENALTY_ZONES) {
      const d = Math.hypot(tx - z.gx, ty - z.gy);
      if (d < minDist) {
        minDist = d;
        best = z;
      }
    }
    return best.id;
  }

  function kickBall(targetX?: number, targetY?: number) {
    if (!active) return;
    const now = Date.now();

    if (mode === 'online_2p' && roomState.status === 'playing') {
      if (typeof targetX === 'number' && typeof targetY === 'number') {
        const z = mapCanvasCoordsToPenaltyZone(targetX, targetY);
        if (z) pickPenaltyZone(z);
      } else {
        pickPenaltyZone('C');
      }
      return;
    }

    if (mode !== 'solo' || solo.finished || now < solo.kickCooldownUntil) return;
    const d = Math.hypot(solo.bx - solo.px, solo.by - solo.py);
    if (d > 58) {
      deps.showToast('🏃 Lại gần quả bóng hơn rồi mới sút nhé!');
      return;
    }
    solo.kickCooldownUntil = now + 260;
    let dx = 0;
    let dy = -1;
    if (typeof targetX === 'number' && typeof targetY === 'number') {
      dx = targetX - solo.bx;
      dy = targetY - solo.by;
    } else if (solo.pDir === 'left') {
      dx = -0.35;
      dy = -0.95;
    } else if (solo.pDir === 'right') {
      dx = 0.35;
      dy = -0.95;
    } else if (solo.pDir === 'down') {
      dx = 0;
      dy = 1;
    } else {
      const goalMid = (GOAL_X1 + GOAL_X2) / 2;
      dx = (goalMid - solo.bx) * 0.004;
      dy = -1;
    }
    const len = Math.hypot(dx, dy) || 1;
    solo.bvx = (dx / len) * 9.4;
    solo.bvy = (dy / len) * 9.4;
    deps.playClick();
  }

  function getLocalDirVector() {
    let dx = 0;
    let dy = 0;
    if (heldDir.up) dy -= 1;
    if (heldDir.down) dy += 1;
    if (heldDir.left) dx -= 1;
    if (heldDir.right) dx += 1;
    const len = Math.hypot(dx, dy);
    if (len > 1) { dx /= len; dy /= len; }
    return { dx, dy };
  }

  function setTouchDir(dir: 'up' | 'down' | 'left' | 'right', down: boolean) {
    heldDir[dir] = down;
  }

  function handleKey(key: string, down: boolean): boolean {
    if (!active) return false;
    const k = key.toLowerCase();
    if (mode === 'online_2p' && roomState.status === 'playing') {
      if (!down) return false;
      if (k === '1' || k === 'q') { pickPenaltyZone('TL'); return true; }
      if (k === '2' || k === 'a') { pickPenaltyZone('BL'); return true; }
      if (k === '3' || k === 'w' || k === ' ') { pickPenaltyZone('C'); return true; }
      if (k === '4' || k === 'd') { pickPenaltyZone('BR'); return true; }
      if (k === '5' || k === 'e') { pickPenaltyZone('TR'); return true; }
      return false;
    }

    if (k === 'arrowup' || k === 'w') { heldDir.up = down; return true; }
    if (k === 'arrowdown' || k === 's') { heldDir.down = down; return true; }
    if (k === 'arrowleft' || k === 'a') { heldDir.left = down; return true; }
    if (k === 'arrowright' || k === 'd') { heldDir.right = down; return true; }
    if (down && (k === ' ' || k === 'enter')) {
      kickBall();
      return true;
    }
    return false;
  }

  function loop() {
    if (!active) return;
    const canvas = document.getElementById('soccer-canvas') as HTMLCanvasElement | null;
    const ctx = canvas?.getContext('2d');
    const now = Date.now();

    if (mode === 'solo' && ctx) {
      stepSoloPhysics(now);
      drawPitchBase(ctx);
      drawSoloEntities(ctx, now);
    } else if ((mode === 'online_2p' || mode === 'spectator') && ctx) {
      drawPenaltyArena(ctx, now);
      updateScoreHUD();
      if (mode === 'online_2p' && roomState.status === 'playing') {
        renderPenaltyControlsPanel();
      }
    }

    rafId = requestAnimationFrame(loop);
  }

  function stepSoloPhysics(now: number) {
    if (solo.finished || now < solo.goalBannerUntil) return;
    const { dx, dy } = getLocalDirVector();
    solo.pMoving = dx !== 0 || dy !== 0;

    if (solo.pMoving) {
      solo.px = Math.max(26, Math.min(W - 26, solo.px + dx * 3.8));
      solo.py = Math.max(46, Math.min(H - 22, solo.py + dy * 3.8));
      if (Math.abs(dx) > Math.abs(dy)) solo.pDir = dx < 0 ? 'left' : 'right';
      else solo.pDir = dy < 0 ? 'up' : 'down';
    }

    const distPB = Math.hypot(solo.bx - solo.px, solo.by - solo.py);
    if (distPB < 27 && now >= solo.kickCooldownUntil) {
      const px = solo.bx - solo.px;
      const py = solo.by - solo.py;
      const plen = Math.hypot(px, py) || 1;
      solo.bvx = (px / plen) * 3.6 + dx * 1.4;
      solo.bvy = (py / plen) * 3.6 + dy * 1.4;
    }

    const targetGkX = Math.max(GOAL_X1 + 16, Math.min(GOAL_X2 - 16, solo.bx));
    const gkDiff = targetGkX - solo.gkX;
    solo.gkX += Math.sign(gkDiff) * Math.min(Math.abs(gkDiff), 2.35);

    solo.defX += solo.defVx;
    if (solo.defX < 105 || solo.defX > W - 105) solo.defVx *= -1;
    if (solo.by > 90 && solo.by < 250) {
      solo.defX += Math.sign(solo.bx - solo.defX) * 0.9;
    }

    solo.bx += solo.bvx;
    solo.by += solo.bvy;
    solo.bvx *= 0.968;
    solo.bvy *= 0.968;
    const spd = Math.hypot(solo.bvx, solo.bvy);
    if (spd < 0.08) { solo.bvx = 0; solo.bvy = 0; }
    else solo.bAngle += spd * 0.09;

    if (solo.by <= GOAL_Y + 8 && solo.bx >= GOAL_X1 + 8 && solo.bx <= GOAL_X2 - 8) {
      solo.playerGoals += 1;
      solo.goalBannerUntil = now + 1500;
      solo.goalBannerText = '⚽ VÀOOO! GHI BÀN TUYỆT ĐẸP!';
      deps.playCoin();
      updateScoreHUD();
      setTimeout(() => { if (active && mode === 'solo' && !solo.finished) resetSoloPositions(); }, 1200);
    } else if (solo.by >= H - 22 && solo.bx >= GOAL_X1 + 8 && solo.bx <= GOAL_X2 - 8) {
      solo.aiGoals += 1;
      solo.goalBannerUntil = now + 1400;
      solo.goalBannerText = '🧤 Ôi! Đối phương phản công!';
      deps.playError();
      updateScoreHUD();
      setTimeout(() => { if (active && mode === 'solo' && !solo.finished) resetSoloPositions(); }, 1200);
    }

    if (solo.bx < 20) { solo.bx = 20; solo.bvx = Math.abs(solo.bvx) * 0.78; }
    if (solo.bx > W - 20) { solo.bx = W - 20; solo.bvx = -Math.abs(solo.bvx) * 0.78; }
    if (solo.by < 24 && (solo.bx < GOAL_X1 || solo.bx > GOAL_X2)) { solo.by = 24; solo.bvy = Math.abs(solo.bvy) * 0.78; }
    if (solo.by > H - 18 && (solo.bx < GOAL_X1 || solo.bx > GOAL_X2)) { solo.by = H - 18; solo.bvy = -Math.abs(solo.bvy) * 0.78; }

    if (Math.hypot(solo.bx - solo.gkX, solo.by - (GOAL_Y + 26)) < 24) {
      solo.bvx = (solo.bx - solo.gkX) * 0.25 + (Math.random() - 0.5) * 3.5;
      solo.bvy = 5.4;
      deps.playClick();
    }
    if (Math.hypot(solo.bx - solo.defX, solo.by - solo.defY) < 24) {
      solo.bvx = (solo.bx - solo.defX) * 0.28 + (Math.random() - 0.5) * 3;
      solo.bvy = 4.6;
      deps.playClick();
    }
  }

  function drawPitchBase(ctx: CanvasRenderingContext2D) {
    ctx.clearRect(0, 0, W, H);
    const stripeCount = 9;
    const stripeH = H / stripeCount;
    for (let i = 0; i < stripeCount; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#1E8449' : '#239B56';
      ctx.fillRect(0, i * stripeH, W, stripeH + 1);
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 3;
    ctx.strokeRect(14, 24, W - 28, H - 38);

    ctx.beginPath();
    ctx.moveTo(14, H / 2);
    ctx.lineTo(W - 14, H / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 42, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeRect(140, 24, 240, 68);
    ctx.strokeRect(140, H - 82, 240, 68);

    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(GOAL_X1, 4, GOAL_X2 - GOAL_X1, GOAL_Y - 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1;
    for (let gx = GOAL_X1 + 10; gx < GOAL_X2; gx += 12) {
      ctx.beginPath(); ctx.moveTo(gx, 4); ctx.lineTo(gx, GOAL_Y); ctx.stroke();
    }
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    ctx.strokeRect(GOAL_X1, 4, GOAL_X2 - GOAL_X1, GOAL_Y - 2);

    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 3;
    ctx.strokeRect(GOAL_X1, H - 14, GOAL_X2 - GOAL_X1, 12);
  }

  function drawSoccerBall(ctx: CanvasRenderingContext2D, bx: number, by: number, angle: number, scale = 1) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(bx, by + 8 * scale, 9 * scale, 4 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(bx, by);
    ctx.scale(scale, scale);
    ctx.rotate(angle);
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 9.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(0, 0, 3.6, 0, Math.PI * 2);
    ctx.fill();
    [0, 120, 240].forEach((deg) => {
      const r = (deg * Math.PI) / 180;
      ctx.beginPath();
      ctx.arc(Math.cos(r) * 6.5, Math.sin(r) * 6.5, 2, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function drawGoalBannerOverlay(ctx: CanvasRenderingContext2D, text: string) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.80)';
    ctx.beginPath();
    ctx.roundRect(45, H / 2 + 12, W - 90, 52, 14);
    ctx.fill();
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#FACC15';
    ctx.font = 'bold 18px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, W / 2, H / 2 + 44);
  }

  function drawSoloEntities(ctx: CanvasRenderingContext2D, now: number) {
    const brand = (deps.getState().familyName || 'B2KS').trim() || 'B2KS';
    drawDetailedChibiOnContext(ctx, {
      x: solo.gkX, y: GOAL_Y + 26, dir: 'down', name: `Thủ môn ${brand}`,
      hairStyle: 'short', hairColor: '#1E293B', shirtColor: '#F59E0B', shirtPattern: 'collar',
      pantsColor: '#1E293B', pantsStyle: 'shorts', outfit: '🧤', speech: null
    }, false, 0.72, false, true);

    drawDetailedChibiOnContext(ctx, {
      x: solo.defX, y: solo.defY, dir: solo.defVx >= 0 ? 'right' : 'left', name: 'Hậu vệ',
      hairStyle: 'spiky', hairColor: '#DC2626', shirtColor: '#B91C1C', shirtPattern: 'stripe',
      pantsColor: '#1F2937', pantsStyle: 'shorts', outfit: '', speech: null
    }, false, 0.74, true, true);

    drawSoccerBall(ctx, solo.bx, solo.by, solo.bAngle);

    const me = deps.getCurrentUser();
    drawDetailedChibiOnContext(ctx, { ...me, x: solo.px, y: solo.py, dir: solo.pDir, speech: null }, true, 0.82, true, solo.pMoving);

    if (now < solo.goalBannerUntil) {
      drawGoalBannerOverlay(ctx, solo.goalBannerText);
    }
  }

  function drawPenaltyArena(ctx: CanvasRenderingContext2D, now: number) {
    ctx.clearRect(0, 0, W, H);
    // Stadium crowd top backdrop
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, W, 62);
    for (let sx = 12; sx < W; sx += 18) {
      ctx.fillStyle = sx % 36 === 0 ? '#38BDF8' : sx % 54 === 0 ? '#FACC15' : '#FB7185';
      ctx.beginPath();
      ctx.arc(sx, 14 + (sx % 7), 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Lush striped penalty box grass
    const grassTop = 62;
    const stripeCount = 7;
    const sh = (H - grassTop) / stripeCount;
    for (let i = 0; i < stripeCount; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#1E8449' : '#239B56';
      ctx.fillRect(0, grassTop + i * sh, W, sh + 1);
    }

    // Penalty box lines & spot
    ctx.strokeStyle = 'rgba(255,255,255,0.88)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 152);
    ctx.lineTo(W, 152);
    ctx.stroke();
    ctx.strokeRect(64, 152, W - 128, 175);
    ctx.beginPath();
    ctx.arc(PEN_BALL_START_X, PEN_BALL_START_Y, 44, Math.PI * 0.12, Math.PI * 0.88);
    ctx.stroke();

    // Penalty spot
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(PEN_BALL_START_X, PEN_BALL_START_Y + 6, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Goal net & posts
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(PEN_GOAL_X1, PEN_GOAL_Y1, PEN_GOAL_X2 - PEN_GOAL_X1, PEN_GOAL_Y2 - PEN_GOAL_Y1);
    ctx.strokeStyle = 'rgba(255,255,255,0.38)';
    ctx.lineWidth = 1;
    for (let gx = PEN_GOAL_X1 + 16; gx < PEN_GOAL_X2; gx += 16) {
      ctx.beginPath(); ctx.moveTo(gx, PEN_GOAL_Y1); ctx.lineTo(gx, PEN_GOAL_Y2); ctx.stroke();
    }
    for (let gy = PEN_GOAL_Y1 + 16; gy < PEN_GOAL_Y2; gy += 16) {
      ctx.beginPath(); ctx.moveTo(PEN_GOAL_X1, gy); ctx.lineTo(PEN_GOAL_X2, gy); ctx.stroke();
    }
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(PEN_GOAL_X1, PEN_GOAL_Y2);
    ctx.lineTo(PEN_GOAL_X1, PEN_GOAL_Y1);
    ctx.lineTo(PEN_GOAL_X2, PEN_GOAL_Y1);
    ctx.lineTo(PEN_GOAL_X2, PEN_GOAL_Y2);
    ctx.stroke();

    if (roomState.status === 'lobby') {
      drawSoccerBall(ctx, PEN_BALL_START_X, PEN_BALL_START_Y, 0, 1.1);
      drawGoalBannerOverlay(ctx, `🟡 Chờ ${roomState.p1Name} bắt đầu Đá Luân Lưu...`);
      return;
    }

    const st = deps.getState();
    const me = deps.getCurrentUser();
    const curKick = roomState.kickIndex || 0;
    const isAnim = roomState.phase === 'animating';
    const shooterId = isAnim ? (roomState.lastShooterId || getCurrentShooterId()) : getCurrentShooterId();
    const keeperId = shooterId === roomState.p1Id ? (roomState.p2Id || '') : roomState.p1Id;
    const shooterMember = st.members.find((m) => m.id === shooterId);
    const keeperMember = st.members.find((m) => m.id === keeperId);

    // Draw 5 clickable penalty target rings while choosing
    const pickedZone =
      myLocalPick &&
      myLocalPick.kickIndex === curKick &&
      myLocalPick.matchId === (roomState.matchId || '')
        ? myLocalPick.zone
        : null;

    if (roomState.phase === 'choosing' && mode === 'online_2p' && (me.id === shooterId || me.id === keeperId)) {
      const pulse = 1 + Math.sin(now / 180) * 0.08;
      PENALTY_ZONES.forEach((z) => {
        const isMine = pickedZone === z.id;
        ctx.save();
        ctx.translate(z.gx, z.gy);
        ctx.scale(isMine ? 1.15 : pulse, isMine ? 1.15 : pulse);
        ctx.fillStyle = isMine ? 'rgba(22, 163, 74, 0.85)' : 'rgba(15, 23, 42, 0.52)';
        ctx.strokeStyle = isMine ? '#FACC15' : '#FFFFFF';
        ctx.lineWidth = isMine ? 3 : 2;
        ctx.beginPath();
        ctx.arc(0, 0, 19, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 14px Fredoka, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(z.icon, 0, 0);
        ctx.restore();
      });
    }

    // Compute animated ball & keeper positions
    let keeperX = 260;
    let keeperY = 122;
    let keeperTilt = 0;
    let ballX = PEN_BALL_START_X;
    let ballY = PEN_BALL_START_Y;
    let ballScale = 1.15;
    let ballAngle = 0;
    let shooterY = PEN_BALL_START_Y + 34;

    if (isAnim && roomState.lastShotZone && roomState.lastSaveZone) {
      const animKey = `${roomState.matchId || ''}|${curKick}`;
      if (localAnimKickKey !== animKey) {
        localAnimKickKey = animKey;
        localAnimStartedAt = now;
      }
      const elapsed = Math.max(0, now - (localAnimStartedAt || now));
      const t = Math.min(1, elapsed / 760);
      const easeOut = 1 - Math.pow(1 - t, 3);
      const sz = getZoneDef(roomState.lastShotZone);
      const kz = getZoneDef(roomState.lastSaveZone);

      // Shooter run-up
      shooterY = PEN_BALL_START_Y + 34 - Math.min(1, elapsed / 220) * 18;

      // Keeper dive
      keeperX = 260 + (kz.kx - 260) * easeOut;
      keeperY = 122 + (kz.ky - 122) * easeOut;
      keeperTilt = kz.diveTilt * easeOut;

      // Ball curve + save rebound
      if (roomState.lastResult === 'saved' && t > 0.72) {
        const reboundT = (t - 0.72) / 0.28;
        ballX = sz.gx + (sz.gx < 260 ? -36 : 36) * reboundT;
        ballY = sz.gy + 46 * reboundT;
        ballScale = 0.78 + reboundT * 0.22;
      } else {
        const arc = Math.sin(t * Math.PI) * -28;
        ballX = PEN_BALL_START_X + (sz.gx - PEN_BALL_START_X) * easeOut;
        ballY = PEN_BALL_START_Y + (sz.gy - PEN_BALL_START_Y) * easeOut + arc;
        ballScale = 1.15 - easeOut * 0.42;
      }
      ballAngle = elapsed * 0.02;
    } else if (roomState.phase === 'choosing') {
      keeperX = 260 + Math.sin(now / 360) * 12;
    }

    // Draw Goalkeeper
    ctx.save();
    ctx.translate(keeperX, keeperY);
    ctx.rotate(keeperTilt);
    if (keeperMember) {
      drawDetailedChibiOnContext(
        ctx,
        {
          ...keeperMember,
          x: 0,
          y: 0,
          dir: 'down',
          shirtColor: '#F59E0B',
          outfit: '🧤',
          speech: null
        },
        keeperMember.id === me.id,
        0.84,
        true,
        isAnim
      );
    }
    ctx.restore();

    // Draw Ball
    drawSoccerBall(ctx, ballX, ballY, ballAngle, ballScale);

    // Draw Shooter
    if (shooterMember) {
      drawDetailedChibiOnContext(
        ctx,
        {
          ...shooterMember,
          x: PEN_BALL_START_X - 6,
          y: shooterY,
          dir: 'up',
          shirtColor: shooterMember.id === roomState.p1Id ? '#2563EB' : '#DC2626',
          speech: null
        },
        shooterMember.id === me.id,
        0.9,
        true,
        isAnim
      );
    }

    if (isAnim && roomState.goalBannerText && localAnimStartedAt && now < localAnimStartedAt + ANIM_DURATION_MS) {
      drawGoalBannerOverlay(ctx, roomState.goalBannerText);
    }
  }

  function checkZoneAutoExit() {
    if (roomState.status !== 'lobby' && roomState.status !== 'playing' && roomState.status !== 'finished') return;
    const me = deps.getCurrentUser();
    if (roomState.p1Id !== me.id && roomState.p2Id !== me.id) return;
    const st = deps.getState();
    const pitchLoc = resolveNeighborhoodLocations(st).find((l) => l.id === 'soccer');
    const px = pitchLoc ? pitchLoc.x : 2060;
    const py = pitchLoc ? pitchLoc.y : 1400;
    const dist = Math.hypot(me.x - px, me.y - py);
    if (me.scene !== 'neighborhood' || dist > 220) {
      leave2PRoom();
      stopMatch();
      if (deps.closeModal) {
        deps.closeModal('soccer-modal');
      } else {
        const modalEl = document.getElementById('soccer-modal');
        if (modalEl) modalEl.style.display = 'none';
      }
      deps.showToast('🚶 Bạn đã rời Sân Bóng Đá nên tự động thoát phòng!');
    }
  }

  return {
    openSoccerArena,
    startMatch: openSoccerArena,
    restartSoloMatch: startSoloMatchInternal,
    stopMatch,
    kickBall,
    pickPenaltyZone,
    setTouchDir,
    handleKey,
    switchToSoloMode,
    switchTo2PMode,
    create2PRoom,
    join2PRoom,
    toggle2PReady,
    start2PMatch,
    leave2PRoom,
    spectateMatch,
    pullSoccerRoomFromFirebase,
    onRemoteSoccerRoomUpdate,
    onRemoteP2InputUpdate,
    checkZoneAutoExit,
    getRoomState: () => roomState,
    isActive: () => active
  };
}
