import confetti from 'canvas-confetti';
import {
  AchievementId,
  ActivityConfigId,
  ActivityConfigItem,
  ActivityLogEntry,
  ActiveReactModal,
  AdminNeighborhoodRecord,
  B2KSBridge,
  B2KSState,
  BgmThemeId,
  BibleQuestion,
  BibleQuizProgress,
  BuildingLayoutOverride,
  CrossWorldRequest,
  CustomLabItem,
  EnglishGradeProgress,
  EnglishQuestion,
  FleaMarketListing,
  ForeignNpcState,
  HelperRobotConfig,
  HelperRobotRenderItem,
  Member,
  NavDestination,
  OtherFamilySummary,
  OwnedPet,
  PenaltyZoneId,
  PetStage,
  RobotReminderItem,
  RobotSkinId,
  SoccerOnlineRoom,
  SoccerPlayerInput,
  SpeakingBankQuestion,
  SpeakingLevel,
  TaskItem,
  WeatherInfo
} from '../types/b2ks';
import {
  ACTIVITY_RULES,
  APP_UPDATED_AT,
  APP_VERSION,
  BGM_THEME_OPTIONS,
  DAILY_PARENT_ALLOWANCE,
  DEFAULT_ACTIVITY_CONFIGS,
  DEFAULT_BILLBOARD_TEXT,
  DEFAULT_CROSS_WORLD_ITEMS,
  DEFAULT_ENGLISH_BANK,
  DEFAULT_FIREBASE_URL,
  DEFAULT_MEMBER_AGES,
  DINING_FOOD_PUZZLES,
  ENGLISH_WORDS,
  FASHION_CATALOG,
  HAIR_COLORS,
  HAIR_STYLES_VISUAL,
  HOUSE_WORLD,
  LEGACY_VOUCHERS,
  MAX_PARENT_POINTS,
  NEIGHBORHOOD_LOCATIONS,
  PANTS_VISUAL_OPTIONS,
  PET_ACCESSORY_CATALOG,
  PET_FOOD_CATALOG,
  PET_SHOP_POS,
  PET_SPECIES,
  PET_VARIANT_DEFS,
  PLOTS,
  PRIVATE_ROOM_WORLD,
  ROOM_DECOR_SLOTS,
  SHIRT_VISUAL_OPTIONS,
  SHOP_CATALOG,
  SOCCER_PITCH_POS,
  STREET_WORLD,
  formatFamilyBrand,
  getFamilyFirebaseRoot,
  normalizeFamilySlug,
  resolveNeighborhoodLocations
} from './constants';
import {
  CURRICULUM_BANK_VERSION,
  getGlobalSuccessUnitTitle
} from './englishCurriculum';
import {
  BIBLE_BANK_VERSION,
  DEFAULT_BIBLE_BANK,
  normalizeBibleQuestionsList,
  resolveVietnameseBookName
} from './bibleQuizData';
import {
  buildLabSVGMarkup,
  getLabItemCanvasImage,
  isValidEnglishLabPrompt,
  LAB_SIZE_TIERS,
  LabSizeTier,
  parsePromptToLabSpec,
  RANDOM_LAB_IDEAS
} from './inventionLab';
import {
  computePetStageFromXp,
  getActivePet,
  getMemberPetBonuses,
  getNextStageRequirement,
  getPetAccessoryDef,
  getPetFoodDef,
  getPetLevelFromXp,
  getPetResolvedColors,
  getPetSpecies,
  getPetStageBadgeLabel,
  getPetVariantDef,
  renderPetArtSVG,
  rollPetHatchTraits
} from './petSystem';
import {
  renderFashionItemPreviewMini,
  renderHairIconSVG,
  renderItemIllustrationSVG,
  renderPantsIconSVG,
  renderShirtIconSVG
} from './svgHelpers';
import {
  drawDetailedChibiOnContext,
  drawNeighborhoodMinimap,
  HouseRoomDef,
  LightingInfo,
  MinimapOrientationMode,
  MinimapPinHit,
  StreetCar
} from './worldRenderer';
import { ARCADE_GAME_CATALOG, createArcadeEngine } from './arcadeEngine';
import { createSoccerMiniGame } from './soccerGame';
import { fetchLiveWeatherInfo, getCachedWeatherInfo } from './weatherService';
import { createB2KS3DController } from './game.js';
import {
  ACHIEVEMENT_CATALOG,
  DEFAULT_SPEAKING_BANK,
  ROBOT_SKIN_OPTIONS,
  SPEAKING_BANK_VERSION,
  evaluateMemberAchievements,
  extractEnglishWords,
  getTotalCompletedTasksForMember,
  scoreSpeakingPronunciation
} from './speakingAndAchievements';

let initialized = false;

export function initB2KSGameEngine() {
  if (initialized) return;
  initialized = true;

  if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x: number, y: number, w: number, h: number, r: number | number[] = 0) {
      const radius = Array.isArray(r) ? (r[0] || 0) : r;
      const rad = Math.max(0, Math.min(radius, Math.abs(w) / 2, Math.abs(h) / 2));
      this.moveTo(x + rad, y);
      this.arcTo(x + w, y, x + w, y + h, rad);
      this.arcTo(x + w, y + h, x, y + h, rad);
      this.arcTo(x, y + h, x, y, rad);
      this.arcTo(x, y, x + w, y, rad);
      this.closePath();
      return this;
    };
  }

  const subscribers = new Set<() => void>();
  const notifySubscribers = () => {
    subscribers.forEach((fn) => {
      try {
        fn();
      } catch {
        // ignore listener error
      }
    });
  };

  /* ==================== 1. AUDIO ENGINE & CONFETTI & SPEECH ==================== */
  const AudioEngine = {
    ctx: null as AudioContext | null,
    isMuted: localStorage.getItem('b2ks_bgm_muted') === '1',
    tempPaused: false,
    themeId: (localStorage.getItem('b2ks_bgm_theme') as BgmThemeId) || 'sunny_town',
    bgmTimer: null as number | null,
    noteIndex: 0,
    noiseBuffer: null as AudioBuffer | null,
    getActiveTheme() {
      return BGM_THEME_OPTIONS.find((t) => t.id === this.themeId) || BGM_THEME_OPTIONS[0];
    },
    setTempPaused(paused: boolean) {
      this.tempPaused = Boolean(paused);
    },
    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
          this.startBGM();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    },
    setTheme(nextThemeId: BgmThemeId) {
      const valid = BGM_THEME_OPTIONS.find((t) => t.id === nextThemeId);
      if (!valid) return;
      this.themeId = valid.id;
      this.noteIndex = 0;
      localStorage.setItem('b2ks_bgm_theme', valid.id);
      if (this.bgmTimer) {
        clearInterval(this.bgmTimer);
        this.bgmTimer = null;
      }
      if (this.ctx) this.startBGM();
    },
    toggleMute(): boolean {
      this.init();
      this.isMuted = !this.isMuted;
      localStorage.setItem('b2ks_bgm_muted', this.isMuted ? '1' : '0');
      const btn = document.getElementById('audio-toggle-btn');
      if (btn) btn.innerText = this.isMuted ? '🔇 Tắt' : '🔊 Nhạc';
      return this.isMuted;
    },
    playTone(freq: number, type: OscillatorType = 'sine', duration = 0.1, vol = 0.08) {
      if (this.isMuted || !this.ctx || freq <= 0) return;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
      } catch {
        // ignore audio context error
      }
    },
    playBgmVoice(freq: number, type: OscillatorType, duration: number, vol: number, filterFreq?: number) {
      if (this.isMuted || this.tempPaused || !this.ctx || freq <= 0) return;
      try {
        const t0 = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t0);
        gain.gain.setValueAtTime(0.0005, t0);
        gain.gain.linearRampToValueAtTime(vol, t0 + Math.min(0.014, duration * 0.18));
        gain.gain.exponentialRampToValueAtTime(0.0006, t0 + duration);
        if (filterFreq && filterFreq > 0) {
          const filter = this.ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(filterFreq, t0);
          osc.connect(filter);
          filter.connect(gain);
        } else {
          osc.connect(gain);
        }
        gain.connect(this.ctx.destination);
        osc.start(t0);
        osc.stop(t0 + duration + 0.01);
      } catch {
        // ignore
      }
    },
    getNoiseBuffer(): AudioBuffer | null {
      if (!this.ctx) return null;
      if (this.noiseBuffer) return this.noiseBuffer;
      const sampleRate = this.ctx.sampleRate || 44100;
      const len = Math.floor(sampleRate * 0.12);
      const buf = this.ctx.createBuffer(1, len, sampleRate);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        ch[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buf;
      return buf;
    },
    playPercussion(kind: 'kick' | 'snare' | 'hat' | 'wood') {
      if (this.isMuted || this.tempPaused || !this.ctx) return;
      try {
        const t0 = this.ctx.currentTime;
        if (kind === 'kick') {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(138, t0);
          osc.frequency.exponentialRampToValueAtTime(42, t0 + 0.11);
          gain.gain.setValueAtTime(0.045, t0);
          gain.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.12);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(t0);
          osc.stop(t0 + 0.13);
        } else if (kind === 'snare') {
          const buf = this.getNoiseBuffer();
          if (buf) {
            const src = this.ctx.createBufferSource();
            src.buffer = buf;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1850, t0);
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.024, t0);
            gain.gain.exponentialRampToValueAtTime(0.0006, t0 + 0.09);
            src.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            src.start(t0);
            src.stop(t0 + 0.095);
          }
          this.playBgmVoice(205, 'triangle', 0.055, 0.015, 700);
        } else if (kind === 'hat') {
          const buf = this.getNoiseBuffer();
          if (buf) {
            const src = this.ctx.createBufferSource();
            src.buffer = buf;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.setValueAtTime(6400, t0);
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.014, t0);
            gain.gain.exponentialRampToValueAtTime(0.0005, t0 + 0.036);
            src.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            src.start(t0);
            src.stop(t0 + 0.04);
          }
        } else if (kind === 'wood') {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(920, t0);
          osc.frequency.exponentialRampToValueAtTime(660, t0 + 0.05);
          gain.gain.setValueAtTime(0.022, t0);
          gain.gain.exponentialRampToValueAtTime(0.0006, t0 + 0.055);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(t0);
          osc.stop(t0 + 0.06);
        }
      } catch {
        // ignore percussion error
      }
    },
    playNotificationChime() {
      if (this.isMuted || this.tempPaused) return;
      [880, 1174.66, 1567.98].forEach((f, i) => {
        setTimeout(() => this.playTone(f, 'sine', 0.16, 0.075), i * 95);
      });
    },
    playClick() {
      this.playTone(580, 'sine', 0.06, 0.05);
    },
    playCoin() {
      this.playTone(987.77, 'square', 0.08, 0.06);
      setTimeout(() => this.playTone(1318.51, 'square', 0.18, 0.06), 70);
    },
    playSuccess() {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        setTimeout(() => this.playTone(f, 'triangle', 0.14, 0.07), i * 85);
      });
    },
    playError() {
      this.playTone(180, 'sawtooth', 0.22, 0.08);
    },
    startBGM() {
      if (this.bgmTimer) {
        clearInterval(this.bgmTimer);
        this.bgmTimer = null;
      }
      const theme = this.getActiveTheme();
      this.bgmTimer = window.setInterval(() => {
        if (!this.isMuted && !this.tempPaused && this.ctx && this.ctx.state === 'running' && isGameUnlocked) {
          const t = this.getActiveTheme();
          const idx = this.noteIndex % t.melody.length;
          const stepSec = t.stepMs / 1000;
          const freq = t.melody[idx];
          const bassFreq = t.bass[idx % t.bass.length] || 0;
          const leadDur = Math.min(0.55, Math.max(0.08, stepSec * (t.leadDurFactor ?? 0.72)));
          const leadVol = t.leadGain ?? (t.oscType === 'square' ? 0.012 : 0.022);
          const bassVol = t.bassGain ?? 0.014;
          const chordVol = t.chordGain ?? 0.008;

          if (freq > 0) {
            this.playBgmVoice(freq, t.oscType, leadDur, leadVol, t.filterFreq);
          }
          if (bassFreq > 0) {
            this.playBgmVoice(bassFreq, t.bassType, Math.min(0.52, stepSec * 0.9), bassVol, t.filterFreq ? t.filterFreq * 0.8 : undefined);
          }
          if (Array.isArray(t.chords) && t.chords.length > 0) {
            const triad = t.chords[idx % t.chords.length];
            if (Array.isArray(triad) && triad.length > 0) {
              const chordDur = Math.min(0.68, stepSec * 1.15);
              triad.forEach((cf) => {
                if (cf > 0) {
                  this.playBgmVoice(cf, t.chordType || 'triangle', chordDur, chordVol, t.filterFreq || 2200);
                }
              });
            }
          }
          if (Array.isArray(t.percussion) && t.percussion.length > 0) {
            const hit = t.percussion[idx % t.percussion.length];
            if (hit) this.playPercussion(hit);
          }
          this.noteIndex++;
        }
      }, theme.stepMs);
    }
  };

  function triggerConfetti() {
    try {
      confetti({
        particleCount: 85,
        spread: 72,
        origin: { y: 0.62 }
      });
      setTimeout(() => {
        confetti({
          particleCount: 45,
          angle: 60,
          spread: 55,
          origin: { x: 0.15, y: 0.7 }
        });
        confetti({
          particleCount: 45,
          angle: 120,
          spread: 55,
          origin: { x: 0.85, y: 0.7 }
        });
      }, 220);
    } catch {
      // ignore confetti fail in headless environment
    }
  }

  function speakEnglish(text: string, rate = 0.85) {
    try {
      if (!('speechSynthesis' in window) || !text) return;
      window.speechSynthesis.cancel();
      const cleanText = String(text).replace(/_+/g, 'blank');
      const utter = new SpeechSynthesisUtterance(cleanText);
      utter.lang = 'en-US';
      utter.rate = rate;
      const voices = window.speechSynthesis.getVoices();
      const enVoice = voices.find((v) => v.lang.startsWith('en-US')) || voices.find((v) => v.lang.startsWith('en'));
      if (enVoice) utter.voice = enVoice;
      window.speechSynthesis.speak(utter);
    } catch {
      // ignore speech synthesis unsupported
    }
  }

  function speakEnglishWithGender(text: string, gender: 'male' | 'female', rate = 0.85) {
    try {
      if (!('speechSynthesis' in window) || !text) return;
      window.speechSynthesis.cancel();
      const cleanText = String(text).replace(/_+/g, 'blank');
      const utter = new SpeechSynthesisUtterance(cleanText);
      utter.lang = 'en-US';
      utter.rate = rate;
      const voices = window.speechSynthesis.getVoices().filter((v) => String(v?.lang || '').toLowerCase().startsWith('en'));
      const maleHints = ['david', 'mark', 'george', 'daniel', 'alex', 'james', 'guy', 'ryan', 'thomas', 'arthur', 'male', 'matthew', 'andrew'];
      const femaleHints = ['samantha', 'zira', 'hazel', 'victoria', 'karen', 'susan', 'libby', 'sonia', 'aria', 'jenny', 'emma', 'female', 'ava', 'michelle'];
      const hints = gender === 'male' ? maleHints : femaleHints;
      const matched =
        voices.find((v) => String(v?.lang || '').toLowerCase().startsWith('en-us') && hints.some((h) => String(v?.name || '').toLowerCase().includes(h))) ||
        voices.find((v) => hints.some((h) => String(v?.name || '').toLowerCase().includes(h))) ||
        voices.find((v) => String(v?.lang || '').toLowerCase().startsWith('en-us')) ||
        voices[0];
      if (matched) utter.voice = matched;
      utter.pitch = gender === 'male' ? 0.88 : 1.12;
      window.speechSynthesis.speak(utter);
    } catch {
      // ignore speech synthesis unsupported
    }
  }

  /* ==================== 2. LIGHTING & FORMATTERS ==================== */
  function getRealTimeLighting(): LightingInfo {
    const now = new Date();
    const h = now.getHours() + now.getMinutes() / 60;
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hh}:${mm}`;

    if (h >= 5 && h < 7) {
      return { phase: 'dawn', label: `🌅 ${timeStr}`, skyTop: '#F39C12', skyBottom: '#FAD7A0', overlayAlpha: 0.15, overlayColor: 'rgba(243, 156, 18, 0.16)', isNight: false };
    }
    if (h >= 7 && h < 17) {
      return { phase: 'day', label: `☀️ ${timeStr}`, skyTop: '#5DADE2', skyBottom: '#D6EAF8', overlayAlpha: 0, overlayColor: 'rgba(0,0,0,0)', isNight: false };
    }
    if (h >= 17 && h < 19) {
      return { phase: 'sunset', label: `🌇 ${timeStr}`, skyTop: '#8E44AD', skyBottom: '#E67E22', overlayAlpha: 0.24, overlayColor: 'rgba(142, 68, 173, 0.24)', isNight: true };
    }
    return { phase: 'night', label: `🌙 ${timeStr}`, skyTop: '#0B132B', skyBottom: '#1C2541', overlayAlpha: 0.45, overlayColor: 'rgba(11, 19, 43, 0.46)', isNight: true };
  }

  function formatTimestamp(ts?: number | null): string {
    if (!ts) return '';
    const d = new Date(ts);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const mon = String(d.getMonth() + 1).padStart(2, '0');
    return `${hh}:${mm} - ${day}/${mon}/${d.getFullYear()}`;
  }

  function escapeHtml(str: string): string {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ==================== 3. STATE & STORAGE & NAMESPACE ISOLATION ==================== */
  let zoomLevel = 1.0;
  let controller3d: ReturnType<typeof createB2KS3DController> | null = null;
  let wardrobeOpenedRoomId: string | null = null;
  let activePrivateRoomId: string | null = null;
  let selectedRoomSlotId: string | null = null;
  let pendingBagDeleteKey: string | null = null;
  let isGameUnlocked = false;
  let hasHydratedRemote = false;
  let hasLocalSaveFile = false;
  let currentWeather: WeatherInfo | null = getCachedWeatherInfo();
  const livePosTimestamps = new Map<string, number>();
  let lastSavedPointsMap: Record<string, number> = {};
  let lastPushedMemberUpdatedAt: Record<string, number> = {};
  const dirtyMemberIds = new Set<string>();
  let lastZoneExitCheckAt = 0;

  const seenTaskIds = new Set<number>();
  let hasInitializedSeenTasks = false;
  let notifPromptShownForSession = false;

  function touchMemberData(member: Member, ts = Date.now()) {
    if (!member) return;
    member.memberUpdatedAt = Math.max(ts, (member.memberUpdatedAt || 0) + 1);
    dirtyMemberIds.add(member.id);
  }

  function snapshotPushedMemberTimestamps() {
    const next: Record<string, number> = {};
    state.members.forEach((m) => {
      next[m.id] = m.memberUpdatedAt || 0;
    });
    lastPushedMemberUpdatedAt = next;
  }

  function syncSeenTasksBaseline() {
    (state.tasks || []).forEach((t) => {
      if (t && typeof t.id === 'number') seenTaskIds.add(t.id);
    });
    hasInitializedSeenTasks = true;
  }

  function getNotificationStatus(): {
    supported: boolean;
    permission: NotificationPermission | 'unsupported';
    hasServiceWorker: boolean;
    enabled: boolean;
  } {
    const supported = typeof window !== 'undefined' && 'Notification' in window;
    const permission: NotificationPermission | 'unsupported' = supported ? Notification.permission : 'unsupported';
    const hasServiceWorker = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
    const prefEnabled = localStorage.getItem('b2ks_task_notif_enabled') !== '0';
    return {
      supported,
      permission,
      hasServiceWorker,
      enabled: supported && permission === 'granted' && prefEnabled
    };
  }

  function updateNotificationHudUI() {
    const status = getNotificationStatus();
    const btn = document.getElementById('hud-notif-btn');
    const ico = document.getElementById('hud-notif-ico');
    const lbl = document.getElementById('hud-notif-lbl');
    if (!btn) return;
    if (!status.supported) {
      if (ico) ico.textContent = '🔕';
      if (lbl) lbl.textContent = 'Không HT';
      btn.title = 'Trình duyệt không hỗ trợ thông báo hệ thống';
      return;
    }
    if (status.enabled) {
      if (ico) ico.textContent = '🔔';
      if (lbl) lbl.textContent = 'Thông báo';
      btn.style.boxShadow = '0 0 0 2px #10B981 inset';
      btn.title = 'Thông báo bài tập đang BẬT (Bấm để tắt hoặc thử)';
    } else if (status.permission === 'denied') {
      if (ico) ico.textContent = '🔕';
      if (lbl) lbl.textContent = 'Bị chặn';
      btn.style.boxShadow = '';
      btn.title = 'Thông báo đang bị trình duyệt chặn';
    } else {
      if (ico) ico.textContent = '🔔';
      if (lbl) lbl.textContent = 'Bật TB';
      btn.style.boxShadow = '';
      btn.title = 'Bấm để bật thông báo khi Bố/Mẹ giao bài tập mới';
    }
  }

  async function dispatchSystemNotification(title: string, body: string, tag?: string, taskId?: number) {
    const status = getNotificationStatus();
    if (!status.enabled) return;
    const payload: NotificationOptions & { renotify?: boolean } = {
      body,
      icon: './pwa-192x192.png',
      badge: './pwa-192x192.png',
      tag: tag || 'b2ks-task',
      renotify: true,
      data: { taskId: taskId || null }
    };
    try {
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg && typeof reg.showNotification === 'function') {
          await reg.showNotification(title, payload);
          return;
        }
      }
    } catch {
      // fallback to window.Notification
    }
    try {
      const n = new Notification(title, payload);
      n.onclick = () => {
        try {
          window.focus();
          if (isGameUnlocked) openSmartphoneModal('tasks');
          n.close();
        } catch {
          // ignore
        }
      };
    } catch {
      // ignore Notification error
    }
  }

  async function requestNotificationPermission(): Promise<{ ok: boolean; permission: NotificationPermission | 'unsupported'; msg: string }> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      updateNotificationHudUI();
      return {
        ok: false,
        permission: 'unsupported',
        msg: '⚠️ Trình duyệt hiện tại chưa hỗ trợ thông báo OS (trên iPhone hãy Cài vào màn hình chính iOS 16.4+).'
      };
    }
    if (Notification.permission === 'granted') {
      localStorage.setItem('b2ks_task_notif_enabled', '1');
      updateNotificationHudUI();
      return { ok: true, permission: 'granted', msg: '🔔 Thông báo bài tập mới đang BẬT!' };
    }
    if (Notification.permission === 'denied') {
      updateNotificationHudUI();
      return {
        ok: false,
        permission: 'denied',
        msg: '❌ Trình duyệt đang chặn Thông báo. Hãy bấm biểu tượng 🔒 trên thanh địa chỉ để Cho phép Thông báo!'
      };
    }
    try {
      const res = await Notification.requestPermission();
      if (res === 'granted') {
        localStorage.setItem('b2ks_task_notif_enabled', '1');
        updateNotificationHudUI();
        const brand = (state.familyName || 'Gia Đình').trim() || 'Gia Đình';
        dispatchSystemNotification(`🔔 Đã bật thông báo ${brand}!`, 'Khi bố/mẹ giao bài tập hoặc việc nhà mới, các con sẽ nhận được thông báo ngay.');
        return { ok: true, permission: 'granted', msg: '🔔 Đã bật thông báo bài tập & nhiệm vụ mới!' };
      }
      updateNotificationHudUI();
      return {
        ok: false,
        permission: res,
        msg: res === 'denied'
          ? '❌ Bạn đã từ chối quyền thông báo. Có thể bật lại trong Cài đặt trang web.'
          : 'ℹ️ Chưa cấp quyền thông báo.'
      };
    } catch {
      updateNotificationHudUI();
      return { ok: false, permission: Notification.permission, msg: '⚠️ Không thể xin quyền thông báo lúc này.' };
    }
  }

  async function sendTestNotification(): Promise<boolean> {
    const res = await requestNotificationPermission();
    if (!res.ok) {
      showToast(res.msg);
      return false;
    }
    AudioEngine.init();
    AudioEngine.playNotificationChime();
    const cur = getCurrentUser();
    const msg = `Chào ${cur.name}! Thông báo bài tập đang hoạt động tốt trên thiết bị này.`;
    showToast(`🔔 ${msg}`);
    const brand = (state.familyName || 'Gia Đình').trim() || 'Gia Đình';
    await dispatchSystemNotification(`📬 Thử Thông Báo ${brand}`, msg, 'b2ks-test-notif');
    return true;
  }

  function isTaskRelevantToMember(t: TaskItem, member: Member): boolean {
    if (!t || t.status !== 'pending' || !member) return false;
    if (t.creatorId === member.id) return false;
    if (t.type === 'family_quest') {
      return !Array.isArray(t.participantIds) || t.participantIds.includes(member.id);
    }
    return t.assigneeId === member.id;
  }

  function detectAndNotifyNewTasks() {
    if (!hasInitializedSeenTasks) {
      syncSeenTasksBaseline();
      return;
    }
    const newlyArrived: TaskItem[] = [];
    (state.tasks || []).forEach((t) => {
      if (!t || typeof t.id !== 'number') return;
      if (!seenTaskIds.has(t.id)) {
        seenTaskIds.add(t.id);
        newlyArrived.push(t);
      }
    });
    if (!isGameUnlocked || newlyArrived.length === 0) return;

    const cur = getCurrentUser();
    const relevant = newlyArrived.filter((t) => isTaskRelevantToMember(t, cur));
    if (relevant.length === 0) return;

    const latest = relevant[relevant.length - 1];
    const creatorName = state.members.find((m) => m.id === latest.creatorId)?.name || 'Bố/Mẹ';
    const typeLabel =
      latest.type === 'homework' ? '📚 Bài tập mới' : latest.type === 'family_quest' ? '🤝 Nhiệm vụ đồng đội' : '🧹 Việc nhà mới';
    const summary =
      relevant.length === 1
        ? `${typeLabel} từ ${creatorName}: "${latest.title}" (+${latest.reward}⭐)`
        : `Có ${relevant.length} nhiệm vụ mới từ ${creatorName}! Mới nhất: "${latest.title}"`;

    AudioEngine.playNotificationChime();
    showToast(`🔔 ${summary}`);
    triggerSpeechBubble(cur, `Có nhiệm vụ mới: ${latest.title}! 📬`, false);
    const brand = (state.familyName || 'Gia Đình').trim() || 'Gia Đình';
    dispatchSystemNotification(`📬 ${brand} — Nhiệm vụ mới!`, summary, `b2ks-task-${latest.id}`, latest.id);

    const status = getNotificationStatus();
    if (!notifPromptShownForSession && status.supported && status.permission === 'default') {
      notifPromptShownForSession = true;
      window.setTimeout(() => {
        showToast('💡 Bấm nút 🔔 "Bật TB" trên thanh công cụ để nhận thông báo cả khi thu nhỏ app!');
      }, 1800);
    }

    const tasksModal = document.getElementById('tasks-modal');
    if (tasksModal && tasksModal.style.display === 'flex') renderTasksModal();
    const phoneModal = document.getElementById('smartphone-modal');
    if (phoneModal && phoneModal.style.display === 'flex') renderSmartphoneScreen();
  }

  if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener('message', (ev) => {
      if (ev.data && ev.data.type === 'B2KS_OPEN_TASKS' && isGameUnlocked) {
        openSmartphoneModal('tasks');
      }
    });
  }

  let deviceConfig: { currentMemberId: string; isLockedToMember: boolean; firebaseUrl: string; lastFamilyName?: string } = (() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('b2ks_v16_device') || 'null');
      if (parsed) {
        if (!parsed.firebaseUrl) parsed.firebaseUrl = DEFAULT_FIREBASE_URL;
        return parsed;
      }
    } catch {
      // ignore
    }
    return { currentMemberId: 'dad', isLockedToMember: false, firebaseUrl: DEFAULT_FIREBASE_URL, lastFamilyName: 'B2KS' };
  })();

  function saveDeviceConfig() {
    localStorage.setItem('b2ks_v16_device', JSON.stringify(deviceConfig));
  }

  const LAST_FAMILY_KEY = 'b2ks_last_login_family_v1';
  const LEGACY_STORAGE_KEY = 'b2ks_daily_routines_rpg_v16';
  const SHARED_ENGLISH_STORAGE_KEY = 'b2ks_shared_english_bank_v2';
  const SHARED_SPEAKING_STORAGE_KEY = 'b2ks_shared_speaking_bank_v1';
  const SHARED_BIBLE_STORAGE_KEY = 'b2ks_shared_bible_bank_v1';

  let globalEnglishBank: EnglishQuestion[] = DEFAULT_ENGLISH_BANK.map((q) => ({ ...q }));
  let sharedEnglishBankUpdatedAt = 0;
  let lastSharedEnglishMetaCheckAt = 0;

  let globalSpeakingBank: SpeakingBankQuestion[] = DEFAULT_SPEAKING_BANK.map((q) => ({ ...q }));
  let sharedSpeakingBankUpdatedAt = 0;
  let lastSharedSpeakingMetaCheckAt = 0;

  let globalBibleBank: BibleQuestion[] = DEFAULT_BIBLE_BANK.map((q) => ({ ...q }));
  let sharedBibleBankUpdatedAt = 0;
  let lastSharedBibleMetaCheckAt = 0;

  function loadSharedBibleBank() {
    try {
      const raw = localStorage.getItem(SHARED_BIBLE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          parsed &&
          Number(parsed.version) >= BIBLE_BANK_VERSION &&
          Array.isArray(parsed.questions) &&
          parsed.questions.length > 0
        ) {
          const normalized = normalizeBibleQuestionsList(parsed.questions);
          if (normalized.length > 0) {
            globalBibleBank = normalized;
            sharedBibleBankUpdatedAt = Number(parsed.updatedAt) || 0;
            return;
          }
        }
      }
    } catch {
      // fallback to built-in 200-question NIV/1925 Bible bank
    }
    globalBibleBank = DEFAULT_BIBLE_BANK.map((q) => ({ ...q }));
    sharedBibleBankUpdatedAt = 0;
  }

  function saveSharedBibleBank(questions: BibleQuestion[], updatedAt = Date.now(), pushCloud = true) {
    const clean = normalizeBibleQuestionsList(questions);
    if (clean.length === 0) return;
    globalBibleBank = clean;
    sharedBibleBankUpdatedAt = updatedAt;
    try {
      localStorage.setItem(
        SHARED_BIBLE_STORAGE_KEY,
        JSON.stringify({
          version: BIBLE_BANK_VERSION,
          updatedAt,
          questions: globalBibleBank
        })
      );
    } catch {
      // ignore storage quota errors
    }
    if (pushCloud && deviceConfig.firebaseUrl) {
      fetch(`${deviceConfig.firebaseUrl}/b2ks_shared_bible_bank.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: BIBLE_BANK_VERSION,
          updatedAt,
          questions: globalBibleBank
        })
      }).catch(() => {});
      fetch(`${deviceConfig.firebaseUrl}/b2ks_shared_bible_bank_meta.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: BIBLE_BANK_VERSION,
          updatedAt,
          count: globalBibleBank.length
        })
      }).catch(() => {});
    }
  }

  function normalizeSpeakingQuestionsList(raw: unknown): SpeakingBankQuestion[] {
    if (!Array.isArray(raw)) return [];
    const out: SpeakingBankQuestion[] = [];
    raw.forEach((item: any, idx: number) => {
      if (!item || typeof item !== 'object') return;
      const sentence = String(item.sentence || '').trim();
      if (!sentence) return;
      const lvlRaw = Math.round(Number(item.level) || 1);
      const level = Math.max(1, Math.min(5, lvlRaw)) as 1 | 2 | 3 | 4 | 5;
      out.push({
        id: String(item.id || `spk_${level}_${idx}`),
        level,
        topic: String(item.topic || 'General').trim() || 'General',
        sentence,
        meaningVi: String(item.meaningVi || '').trim(),
        custom: Boolean(item.custom)
      });
    });
    return out;
  }

  function loadSharedSpeakingBank() {
    try {
      const raw = localStorage.getItem(SHARED_SPEAKING_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          parsed &&
          Number(parsed.version) >= SPEAKING_BANK_VERSION &&
          Array.isArray(parsed.sentences) &&
          parsed.sentences.length > 0
        ) {
          const normalized = normalizeSpeakingQuestionsList(parsed.sentences);
          if (normalized.length > 0) {
            globalSpeakingBank = normalized;
            sharedSpeakingBankUpdatedAt = Number(parsed.updatedAt) || 0;
            return;
          }
        }
      }
    } catch {
      // fallback to built-in default speaking bank
    }
    globalSpeakingBank = DEFAULT_SPEAKING_BANK.map((q) => ({ ...q }));
    sharedSpeakingBankUpdatedAt = 0;
  }

  function saveSharedSpeakingBank(sentences: SpeakingBankQuestion[], updatedAt = Date.now(), pushCloud = true) {
    const clean = normalizeSpeakingQuestionsList(sentences);
    if (clean.length === 0) return;
    globalSpeakingBank = clean;
    sharedSpeakingBankUpdatedAt = updatedAt;
    try {
      localStorage.setItem(
        SHARED_SPEAKING_STORAGE_KEY,
        JSON.stringify({
          version: SPEAKING_BANK_VERSION,
          updatedAt,
          sentences: globalSpeakingBank
        })
      );
    } catch {
      // ignore storage quota
    }
    if (pushCloud && deviceConfig.firebaseUrl) {
      fetch(`${deviceConfig.firebaseUrl}/b2ks_shared_speaking_bank.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: SPEAKING_BANK_VERSION,
          updatedAt,
          sentences: globalSpeakingBank
        })
      }).catch(() => {});
      fetch(`${deviceConfig.firebaseUrl}/b2ks_shared_speaking_bank_meta.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: SPEAKING_BANK_VERSION,
          updatedAt,
          count: globalSpeakingBank.length
        })
      }).catch(() => {});
    }
  }

  function normalizeEnglishQuestionsList(raw: unknown): EnglishQuestion[] {
    if (!Array.isArray(raw)) return [];
    const out: EnglishQuestion[] = [];
    raw.forEach((item: any, idx: number) => {
      if (!item || typeof item !== 'object') return;
      const qText = String(item.q || '').trim();
      const opts = Array.isArray(item.opts) ? item.opts.map((o: any) => String(o ?? '').trim()) : [];
      if (!qText || opts.length < 4 || opts.slice(0, 4).some((o: string) => !o)) return;
      const rawGrade = Number(item.grade);
      const grade = ([6, 7, 8, 9].includes(rawGrade) ? rawGrade : 6) as 6 | 7 | 8 | 9;
      const unit = Math.max(1, Math.min(12, Math.round(Number(item.unit) || 1)));
      const cat: 'grammar' | 'vocab' = item.cat === 'grammar' ? 'grammar' : 'vocab';
      const ans = Math.max(0, Math.min(3, Math.round(Number(item.ans) || 0)));
      out.push({
        id: String(item.id || `eq_${grade}_${unit}_${idx}`),
        cat,
        grade,
        unit,
        unitTitle: String(item.unitTitle || getGlobalSuccessUnitTitle(grade, unit)),
        q: qText,
        opts: [opts[0], opts[1], opts[2], opts[3]],
        ans,
        exp: String(item.exp || ''),
        custom: Boolean(item.custom)
      });
    });
    return out;
  }

  function loadSharedEnglishBank() {
    try {
      const raw = localStorage.getItem(SHARED_ENGLISH_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          parsed &&
          Number(parsed.version) >= CURRICULUM_BANK_VERSION &&
          Array.isArray(parsed.questions) &&
          parsed.questions.length > 0
        ) {
          const normalized = normalizeEnglishQuestionsList(parsed.questions);
          if (normalized.length > 0) {
            globalEnglishBank = normalized;
            sharedEnglishBankUpdatedAt = Number(parsed.updatedAt) || 0;
            if (state) state.englishQuestions = globalEnglishBank;
            return;
          }
        }
      }
    } catch {
      // fallback to built-in 1,920-question bank
    }
    globalEnglishBank = DEFAULT_ENGLISH_BANK.map((q) => ({ ...q }));
    sharedEnglishBankUpdatedAt = 0;
    if (state) state.englishQuestions = globalEnglishBank;
  }

  function saveSharedEnglishBank(questions: EnglishQuestion[], updatedAt = Date.now(), pushCloud = true) {
    const clean = normalizeEnglishQuestionsList(questions);
    if (clean.length === 0) return;
    globalEnglishBank = clean;
    sharedEnglishBankUpdatedAt = updatedAt;
    if (state) state.englishQuestions = globalEnglishBank;
    try {
      localStorage.setItem(
        SHARED_ENGLISH_STORAGE_KEY,
        JSON.stringify({
          version: CURRICULUM_BANK_VERSION,
          updatedAt,
          questions: globalEnglishBank
        })
      );
    } catch {
      // ignore storage quota errors
    }
    if (pushCloud && deviceConfig.firebaseUrl) {
      fetch(`${deviceConfig.firebaseUrl}/b2ks_shared_english_bank.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: CURRICULUM_BANK_VERSION,
          updatedAt,
          questions: globalEnglishBank
        })
      }).catch(() => {});
      fetch(`${deviceConfig.firebaseUrl}/b2ks_shared_english_bank_meta.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: CURRICULUM_BANK_VERSION,
          updatedAt,
          count: globalEnglishBank.length
        })
      }).catch(() => {});
    }
  }

  function getActiveFamilySlug(overrideName?: string): string {
    return normalizeFamilySlug(overrideName ?? state?.familyName ?? localStorage.getItem(LAST_FAMILY_KEY) ?? 'B2KS');
  }

  function getFamilyStorageKey(overrideName?: string): string {
    const slug = getActiveFamilySlug(overrideName);
    return slug === 'b2ks' ? LEGACY_STORAGE_KEY : `b2ks_state_${slug}`;
  }

  function getFirebaseBasePath(overrideName?: string): string {
    return getFamilyFirebaseRoot(overrideName ?? state?.familyName ?? 'B2KS');
  }

  function getPointsLedgerKey(overrideName?: string): string {
    return `b2ks_points_ledger_v1_${getActiveFamilySlug(overrideName)}`;
  }

  function getDurableSecretsKey(overrideName?: string): string {
    return `b2ks_durable_secrets_v1_${getActiveFamilySlug(overrideName)}`;
  }

  function getMemberArchiveKey(overrideName?: string): string {
    return `b2ks_member_archive_v1_${getActiveFamilySlug(overrideName)}`;
  }

  function defaultEnglishProgressMap(): Record<number, EnglishGradeProgress> {
    return {
      6: { unit: 1, highScoreStreak: 0 },
      7: { unit: 1, highScoreStreak: 0 },
      8: { unit: 1, highScoreStreak: 0 },
      9: { unit: 1, highScoreStreak: 0 }
    };
  }

  function createFreshDefaultState(
    familyDisplayName = 'B2KS',
    opts?: { parentsOnly?: boolean; dadName?: string; momName?: string }
  ): B2KSState {
    const cleanName = (familyDisplayName || 'B2KS').trim() || 'B2KS';
    const parentsOnly = Boolean(opts?.parentsOnly);
    const slug = normalizeFamilySlug(cleanName);
    const storedPin = !parentsOnly && slug === 'b2ks' ? localStorage.getItem('b2ks_parent_pin') : null;
    const validPin = storedPin && storedPin.length >= 4 && storedPin !== '1111' ? storedPin : '1234';

    const members: Member[] = [
      {
        id: 'dad', name: (opts?.dadName || 'Bố').trim() || 'Bố', role: 'Bố', age: DEFAULT_MEMBER_AGES.dad, points: 200, pointsUpdatedAt: 0,
        hairStyle: 'short', hairColor: '#2C3E50',
        shirtColor: '#2980B9', shirtPattern: 'collar',
        pantsColor: '#34495E', pantsStyle: 'pants',
        outfit: '', inventory: ['d_pc'], vouchers: [], petAccessories: [],
        roomUnlocked: false, roomWall: '#D6EAF8',
        roomDecor: [],
        unlockedZooAnimals: [], englishQuizHistory: [], englishProgress: defaultEnglishProgressMap(),
        scene: 'neighborhood', x: 860, y: 435, dir: 'down', speech: null
      },
      {
        id: 'mom', name: (opts?.momName || 'Mẹ').trim() || 'Mẹ', role: 'Mẹ', age: DEFAULT_MEMBER_AGES.mom, points: 200, pointsUpdatedAt: 0,
        hairStyle: 'long', hairColor: '#5D4037',
        shirtColor: '#E91E63', shirtPattern: 'heart',
        pantsColor: '#8E44AD', pantsStyle: 'skirt',
        outfit: '', inventory: ['d_plant'], vouchers: [], petAccessories: [],
        roomUnlocked: false, roomWall: '#D6EAF8',
        roomDecor: [],
        unlockedZooAnimals: [], englishQuizHistory: [], englishProgress: defaultEnglishProgressMap(),
        scene: 'neighborhood', x: 815, y: 445, dir: 'down', speech: null
      }
    ];

    if (!parentsOnly) {
      members.push(
        {
          id: 'kid1', name: 'Kem', role: 'Con gái', age: DEFAULT_MEMBER_AGES.kid1, points: 40, pointsUpdatedAt: 0,
          hairStyle: 'pigtails', hairColor: '#4E342E',
          shirtColor: '#F39C12', shirtPattern: 'star',
          pantsColor: '#C0392B', pantsStyle: 'skirt',
          outfit: '', inventory: [], vouchers: [], petAccessories: [],
          roomUnlocked: false, roomWall: '#FADBD8',
          roomDecor: [],
          unlockedZooAnimals: [], englishQuizHistory: [], englishProgress: defaultEnglishProgressMap(),
          unlockedAchievements: [], englishWordsUsed: [], completedTaskCount: 0,
          speakingLevel: 1, speakingStreak: 0, speakingHistory: [],
          helperRobot: { skin: 'doraemon', reminders: [], updatedAt: 0 },
          scene: 'neighborhood', x: 905, y: 445, dir: 'left', speech: null
        },
        {
          id: 'kid2', name: 'Sóc', role: 'Con trai', age: DEFAULT_MEMBER_AGES.kid2, points: 40, pointsUpdatedAt: 0,
          hairStyle: 'spiky', hairColor: '#1A252F',
          shirtColor: '#27AE60', shirtPattern: 'stripe',
          pantsColor: '#1F618D', pantsStyle: 'shorts',
          outfit: '', inventory: ['d_bear'], vouchers: [], petAccessories: [],
          roomUnlocked: false, roomWall: '#D5F5E3',
          roomDecor: [],
          unlockedZooAnimals: [], englishQuizHistory: [], englishProgress: defaultEnglishProgressMap(),
          unlockedAchievements: [], englishWordsUsed: [], completedTaskCount: 0,
          speakingLevel: 1, speakingStreak: 0, speakingHistory: [],
          helperRobot: { skin: 'gundam', reminders: [], updatedAt: 0 },
          scene: 'neighborhood', x: 945, y: 445, dir: 'left', speech: null
        }
      );
    }

    const tasks: TaskItem[] = parentsOnly
      ? []
      : [
          {
            id: 1, type: 'chore', title: 'Dọn dẹp đồ chơi phòng khách',
            creatorId: 'mom', assigneeId: 'kid1', reward: 15,
            status: 'pending', createdAt: Date.now() - 3600000, completedAt: null,
            parentFile: null, parentFileName: '', childFile: null, childFileName: '', childNote: '', grade: null
          },
          {
            id: 2, type: 'homework', title: 'Viết 3 câu tiếng Anh về ngôi nhà của em',
            creatorId: 'dad', assigneeId: 'kid2', reward: 25,
            status: 'pending', createdAt: Date.now() - 1800000, completedAt: null,
            parentFile: null, parentFileName: '', childFile: null, childFileName: '', childNote: '', grade: null
          }
        ];

    return {
      currentUserId: parentsOnly ? 'dad' : (deviceConfig.currentMemberId || 'dad'),
      familyName: cleanName,
      familyNameUpdatedAt: parentsOnly ? Date.now() : 0,
      gamePassword: '1111',
      gamePasswordUpdatedAt: parentsOnly ? Date.now() : 0,
      parentPin: validPin,
      parentPinUpdatedAt: parentsOnly ? Date.now() : parseInt(localStorage.getItem('b2ks_parent_pin_ts') || '0', 10),
      bgmTheme: AudioEngine.themeId || 'sunny_town',
      buildingLayouts: {},
      buildingLayoutsUpdatedAt: 0,
      billboardText: DEFAULT_BILLBOARD_TEXT,
      billboardUpdatedAt: 0,
      dailyParentAllowance: DAILY_PARENT_ALLOWANCE,
      maxParentPoints: MAX_PARENT_POINTS,
      maxParentPointsUpdatedAt: 0,
      updatedAt: parentsOnly ? Date.now() : 0,
      familyMessages: [],
      house: { plotIndex: 1, style: 'modern' },
      houseUpdatedAt: 0,
      members,
      tasks,
      crossWorldItems: DEFAULT_CROSS_WORLD_ITEMS.map((x) => ({ ...x })),
      crossWorldRequests: [],
      fleaMarketListings: [],
      activityLogs: [],
      englishQuestions: globalEnglishBank,
      activityConfigs: { ...DEFAULT_ACTIVITY_CONFIGS },
      activityConfigsUpdatedAt: 0,
      chatHistory: [
        { sender: 'Hệ thống', text: `Chào mừng gia đình ${cleanName}! Hãy gõ tiếng Anh để hiện bong bóng thoại và nhận +2⭐!`, isEng: false, ts: Date.now() }
      ],
      lastDailyReset: new Date().toDateString()
    };
  }

  let state: B2KSState = createFreshDefaultState(localStorage.getItem(LAST_FAMILY_KEY) || deviceConfig.lastFamilyName || 'B2KS');
  loadSharedEnglishBank();
  loadSharedSpeakingBank();
  loadSharedBibleBank();

  function getCurrentUser(): Member {
    return state.members.find((m) => m.id === state.currentUserId) || state.members[0];
  }

  function isParent(member: Member): boolean {
    return member.role === 'Bố' || member.role === 'Mẹ';
  }

  function getRoleEmoji(role: string): string {
    if (role === 'Bố') return '👨';
    if (role === 'Mẹ') return '👩';
    if (role === 'Con trai') return '👦';
    return '👧';
  }

  function ensureMemberProps(m: Member & { activityLogs?: Record<string, { date: string; count: number; lastAt: number }> }) {
    if (!Array.isArray(m.inventory)) m.inventory = [];
    if (!Array.isArray(m.vouchers)) m.vouchers = [];
    if (!Array.isArray(m.roomDecor)) m.roomDecor = [];
    if (!Array.isArray(m.customLabItems)) m.customLabItems = [];
    if (!Array.isArray(m.unlockedZooAnimals)) m.unlockedZooAnimals = [];
    if (!Array.isArray(m.englishQuizHistory)) m.englishQuizHistory = [];
    if (!m.englishProgress || typeof m.englishProgress !== 'object') {
      m.englishProgress = defaultEnglishProgressMap();
    }
    ([6, 7, 8, 9] as const).forEach((g) => {
      const cur = m.englishProgress![g];
      if (!cur || typeof cur !== 'object') {
        m.englishProgress![g] = { unit: 1, highScoreStreak: 0 };
      } else {
        cur.unit = Math.max(1, Math.min(12, Math.round(Number(cur.unit) || 1)));
        cur.highScoreStreak = Math.max(0, Math.min(3, Math.round(Number(cur.highScoreStreak) || 0)));
      }
    });
    if (!m.bibleProgress || typeof m.bibleProgress !== 'object') {
      m.bibleProgress = { correctCounts: {}, streak: 0, totalCorrect: 0, totalAnswered: 0, updatedAt: 0 };
    } else {
      const rawCounts = m.bibleProgress.correctCounts && typeof m.bibleProgress.correctCounts === 'object' ? m.bibleProgress.correctCounts : {};
      const cleanCounts: Record<string, number> = {};
      Object.entries(rawCounts).forEach(([qid, val]) => {
        const c = Math.max(0, Math.min(3, Math.round(Number(val) || 0)));
        if (c > 0) cleanCounts[qid] = c;
      });
      m.bibleProgress = {
        correctCounts: cleanCounts,
        streak: Math.max(0, Math.round(Number(m.bibleProgress.streak) || 0)),
        totalCorrect: Math.max(0, Math.round(Number(m.bibleProgress.totalCorrect) || 0)),
        totalAnswered: Math.max(0, Math.round(Number(m.bibleProgress.totalAnswered) || 0)),
        updatedAt: Number(m.bibleProgress.updatedAt) || 0
      };
    }
    if (!Array.isArray(m.pets)) m.pets = [];
    m.pets.forEach((p) => {
      if (!p.variant) p.variant = 'classic';
      if (!p.gender) p.gender = 'female';
      if (p.accessoryId === undefined) p.accessoryId = null;
      p.xp = Math.max(0, Number(p.xp) || 0);
      p.hatchProgress = Math.max(0, Math.min(100, Number(p.hatchProgress) || 0));
      p.hunger = Math.max(0, Math.min(100, typeof p.hunger === 'number' && !Number.isNaN(p.hunger) ? p.hunger : 100));
      if (p.hatched) {
        const sp = getPetSpecies(p.speciesId);
        p.level = Math.max(1, Number(p.level) || 1, getPetLevelFromXp(p.xp));
        p.stage = Math.max(1, Number(p.stage) || 1, computePetStageFromXp(sp, p.xp, true)) as PetStage;
      } else {
        p.stage = 0;
        p.level = Math.max(1, Number(p.level) || 1);
      }
    });
    if (!Array.isArray(m.petAccessories)) m.petAccessories = [];
    if (!m.petFoodInventory || typeof m.petFoodInventory !== 'object') m.petFoodInventory = {};
    if (m.activePetId === undefined) m.activePetId = null;
    if (typeof m.age !== 'number' || m.age <= 0) {
      m.age = DEFAULT_MEMBER_AGES[m.id] || (m.role === 'Bố' ? 38 : m.role === 'Mẹ' ? 36 : 10);
    }
    if (typeof m.memberUpdatedAt !== 'number') m.memberUpdatedAt = 0;
    if (typeof m.nameUpdatedAt !== 'number') m.nameUpdatedAt = 0;
    if (typeof m.adminPointsUpdatedAt !== 'number') m.adminPointsUpdatedAt = 0;
    if (typeof m.pointsUpdatedAt !== 'number') m.pointsUpdatedAt = m.adminPointsUpdatedAt || 0;
    if (typeof m.tvSecondsUsedToday !== 'number') m.tvSecondsUsedToday = 0;
    if (typeof m.tvBonusSecondsToday !== 'number') m.tvBonusSecondsToday = 0;
    if (!m.tvLastDate) m.tvLastDate = new Date().toDateString();
    const today = new Date().toDateString();
    if (m.tvLastDate !== today) {
      m.tvSecondsUsedToday = 0;
      m.tvBonusSecondsToday = 0;
      m.tvLastDate = today;
    }
    if (!m.englishChatStats || typeof m.englishChatStats !== 'object') {
      m.englishChatStats = { date: today, count: 0, lastRewardAt: 0, recentPhrases: [] };
    }
    if (m.englishChatStats.date !== today) {
      m.englishChatStats = { date: today, count: 0, lastRewardAt: m.englishChatStats.lastRewardAt || 0, recentPhrases: [] };
    }
    if (!Array.isArray(m.englishChatStats.recentPhrases)) {
      m.englishChatStats.recentPhrases = [];
    }
    if (!m.comicReadStats || typeof m.comicReadStats !== 'object') {
      m.comicReadStats = { date: today, count: 0, lastReadAt: 0, completedIds: [] };
    }
    if (m.comicReadStats.date !== today) {
      m.comicReadStats = {
        date: today,
        count: 0,
        lastReadAt: m.comicReadStats.lastReadAt || 0,
        completedIds: Array.isArray(m.comicReadStats.completedIds) ? m.comicReadStats.completedIds : []
      };
    }
    if (!Array.isArray(m.comicReadStats.completedIds)) {
      m.comicReadStats.completedIds = [];
    }
    if (!m.roomSlots || typeof m.roomSlots !== 'object') m.roomSlots = {};
    if (!m.roomSlotSpecs || typeof m.roomSlotSpecs !== 'object') m.roomSlotSpecs = {};
    if (!m.roomDecorSpecs || typeof m.roomDecorSpecs !== 'object') m.roomDecorSpecs = {};
    m.roomDecor = m.roomDecor.filter((d) => {
      if (d.id === 'd_bookshelf') return false;
      if (d.id === 'd_pc' && d.x === 650 && d.y === 470) return false;
      if (d.id === 'd_plant' && d.x === 960 && d.y === 470) return false;
      if (d.id === 'd_bear' && d.x === 860 && d.y === 230) return false;
      return true;
    });
    if (m.roomSlots && typeof m.roomSlots === 'object') {
      Object.keys(m.roomSlots).forEach((slotKey) => {
        if (m.roomSlots && m.roomSlots[slotKey] === 'd_bookshelf') {
          delete m.roomSlots[slotKey];
          if (m.roomSlotSpecs) delete m.roomSlotSpecs[slotKey];
        }
      });
    }
    if (!m.inventoryConsumedMigrated) {
      Object.entries(m.roomSlots).forEach(([slotKey, placedId]) => {
        if (!placedId) return;
        const labIdx = m.customLabItems!.findIndex((x) => x && x.id === placedId);
        if (labIdx !== -1) {
          if (!m.roomSlotSpecs![slotKey]) {
            m.roomSlotSpecs![slotKey] = { ...m.customLabItems![labIdx] };
          }
          m.customLabItems!.splice(labIdx, 1);
        } else {
          const invIdx = m.inventory.indexOf(placedId);
          if (invIdx !== -1) m.inventory.splice(invIdx, 1);
        }
      });
      m.roomDecor.forEach((d) => {
        if (!d || !d.id) return;
        const labIdx = m.customLabItems!.findIndex((x) => x && x.id === d.id);
        if (labIdx !== -1) {
          if (!m.roomDecorSpecs![d.id]) {
            m.roomDecorSpecs![d.id] = { ...m.customLabItems![labIdx] };
          }
          m.customLabItems!.splice(labIdx, 1);
        } else {
          const invIdx = m.inventory.indexOf(d.id);
          if (invIdx !== -1) m.inventory.splice(invIdx, 1);
        }
      });
      m.inventoryConsumedMigrated = true;
    }
    Object.keys(m.roomSlotSpecs).forEach((slotKey) => {
      if (!m.roomSlots![slotKey]) delete m.roomSlotSpecs![slotKey];
    });
    if (!Array.isArray(m.unlockedAchievements)) m.unlockedAchievements = [];
    if (!Array.isArray(m.englishWordsUsed)) m.englishWordsUsed = [];
    if (typeof m.completedTaskCount !== 'number' || Number.isNaN(m.completedTaskCount)) {
      m.completedTaskCount = 0;
    }
    if (typeof m.speakingLevel !== 'number' || Number.isNaN(m.speakingLevel)) {
      m.speakingLevel = 1;
    } else {
      m.speakingLevel = Math.max(1, Math.min(5, Math.round(m.speakingLevel)));
    }
    if (typeof m.speakingStreak !== 'number' || Number.isNaN(m.speakingStreak)) {
      m.speakingStreak = 0;
    } else {
      m.speakingStreak = Math.max(0, Math.min(5, Math.round(m.speakingStreak)));
    }
    if (!Array.isArray(m.speakingHistory)) m.speakingHistory = [];
    if (isParent(m)) {
      m.unlockedAchievements = [];
    } else {
      const defaultSkin: RobotSkinId = m.role === 'Con trai' ? 'gundam' : m.id === 'kid1' ? 'doraemon' : 'walle';
      if (!m.helperRobot || typeof m.helperRobot !== 'object') {
        m.helperRobot = { skin: defaultSkin, reminders: [], updatedAt: 0 };
      } else {
        if (!['doraemon', 'doraemi', 'gundam', 'walle'].includes(m.helperRobot.skin)) {
          m.helperRobot.skin = defaultSkin;
        }
        if (!Array.isArray(m.helperRobot.reminders)) m.helperRobot.reminders = [];
        m.helperRobot.reminders = m.helperRobot.reminders
          .filter((r) => r && r.id && r.text && typeof r.startAt === 'number' && typeof r.endAt === 'number' && r.endAt > r.startAt)
          .sort((a, b) => a.startAt - b.startAt);
        if (typeof m.helperRobot.updatedAt !== 'number') m.helperRobot.updatedAt = 0;
      }
    }
  }

  function mergeAchievementsList(
    a: { id: AchievementId; unlockedAt: number }[] = [],
    b: { id: AchievementId; unlockedAt: number }[] = []
  ): { id: AchievementId; unlockedAt: number }[] {
    const byId = new Map<AchievementId, number>();
    [...(a || []), ...(b || [])].forEach((entry) => {
      if (!entry || !entry.id) return;
      const prev = byId.get(entry.id);
      if (prev === undefined || (entry.unlockedAt && entry.unlockedAt < prev)) {
        byId.set(entry.id, entry.unlockedAt || Date.now());
      }
    });
    return Array.from(byId.entries()).map(([id, unlockedAt]) => ({ id, unlockedAt }));
  }

  function evaluateAndUnlockMemberBadges(member: Member, englishSampleText?: string): AchievementId[] {
    if (!member || isParent(member)) return [];
    ensureMemberProps(member);
    if (englishSampleText) {
      const extracted = extractEnglishWords(englishSampleText);
      if (extracted.length > 0) {
        const merged = Array.from(new Set([...(member.englishWordsUsed || []), ...extracted]));
        member.englishWordsUsed = merged.slice(-2500);
      }
    }
    const newlyUnlocked = evaluateMemberAchievements(member, state.tasks || []);
    if (newlyUnlocked.length > 0) {
      const now = Date.now();
      newlyUnlocked.forEach((badge) => {
        member.unlockedAchievements!.push({ id: badge.id, unlockedAt: now });
        logActivity({
          memberId: member.id,
          memberName: member.name,
          action: 'achievement_unlocked',
          detail: `Mở khóa thành tựu: ${badge.icon} ${badge.title}`
        });
        showToast(`🏆 Mở khóa thành tựu mới: ${badge.icon} ${badge.title}!`);
      });
      member.memberUpdatedAt = now;
      AudioEngine.playSuccess();
      triggerConfetti();
    }
    return newlyUnlocked.map((b) => b.id);
  }

  function getActivityConfig(actId: ActivityConfigId): ActivityConfigItem {
    const base = DEFAULT_ACTIVITY_CONFIGS[actId];
    const custom = state.activityConfigs?.[actId];
    return custom ? { ...base, ...custom } : { ...base };
  }

  function ensureStateArrays() {
    if (!state.familyName || typeof state.familyName !== 'string') state.familyName = 'B2KS';
    state.familyName = state.familyName.trim() || 'B2KS';
    if (typeof state.familyNameUpdatedAt !== 'number') state.familyNameUpdatedAt = 0;
    if (!state.gamePassword || typeof state.gamePassword !== 'string') state.gamePassword = '1111';
    if (typeof state.gamePasswordUpdatedAt !== 'number') state.gamePasswordUpdatedAt = 0;
    if (!state.parentPin || typeof state.parentPin !== 'string') state.parentPin = '1234';
    if (typeof state.parentPinUpdatedAt !== 'number') state.parentPinUpdatedAt = 0;
    if (!state.bgmTheme) state.bgmTheme = AudioEngine.themeId || 'sunny_town';
    if (!state.buildingLayouts || typeof state.buildingLayouts !== 'object') state.buildingLayouts = {};
    if (typeof state.buildingLayoutsUpdatedAt !== 'number') state.buildingLayoutsUpdatedAt = 0;
    if (typeof state.billboardText !== 'string' || !state.billboardText.trim()) {
      state.billboardText = DEFAULT_BILLBOARD_TEXT;
    }
    if (typeof state.billboardUpdatedAt !== 'number') state.billboardUpdatedAt = 0;
    if (typeof state.houseUpdatedAt !== 'number') state.houseUpdatedAt = 0;
    if (typeof state.dailyParentAllowance !== 'number' || Number.isNaN(state.dailyParentAllowance)) {
      state.dailyParentAllowance = DAILY_PARENT_ALLOWANCE;
    }
    if (typeof state.maxParentPoints !== 'number' || Number.isNaN(state.maxParentPoints) || state.maxParentPoints < 0) {
      state.maxParentPoints = MAX_PARENT_POINTS;
    }
    if (typeof state.maxParentPointsUpdatedAt !== 'number') state.maxParentPointsUpdatedAt = 0;

    if (!Array.isArray(state.crossWorldItems)) {
      state.crossWorldItems = DEFAULT_CROSS_WORLD_ITEMS.map((x) => ({ ...x }));
    }
    if (!Array.isArray(state.crossWorldRequests)) state.crossWorldRequests = [];
    if (!Array.isArray(state.fleaMarketListings)) state.fleaMarketListings = [];
    if (!Array.isArray(state.activityLogs)) state.activityLogs = [];
    state.englishQuestions = globalEnglishBank;
    if (!Array.isArray(state.familyMessages)) state.familyMessages = [];
    if (!Array.isArray(state.chatHistory)) state.chatHistory = [];
    if (!Array.isArray(state.tasks)) state.tasks = [];
    const mergedCfg: Record<ActivityConfigId, ActivityConfigItem> = { ...DEFAULT_ACTIVITY_CONFIGS };
    if (state.activityConfigs) {
      (Object.keys(DEFAULT_ACTIVITY_CONFIGS) as ActivityConfigId[]).forEach((k) => {
        if (state.activityConfigs && state.activityConfigs[k]) {
          mergedCfg[k] = { ...DEFAULT_ACTIVITY_CONFIGS[k], ...state.activityConfigs[k] };
        }
      });
    }
    state.activityConfigs = mergedCfg;
    state.members.forEach(ensureMemberProps);
  }

  function snapshotSavedPointsMap() {
    const map: Record<string, number> = {};
    state.members.forEach((m) => {
      map[m.id] = m.points;
    });
    lastSavedPointsMap = map;
  }

  function persistPointsLedger() {
    try {
      const ledger: Record<string, { points: number; pointsUpdatedAt: number; adminPointsUpdatedAt: number }> = {};
      state.members.forEach((m) => {
        ledger[m.id] = {
          points: m.points,
          pointsUpdatedAt: m.pointsUpdatedAt || 0,
          adminPointsUpdatedAt: m.adminPointsUpdatedAt || 0
        };
      });
      localStorage.setItem(getPointsLedgerKey(), JSON.stringify(ledger));
    } catch {
      // ignore storage quota errors
    }
  }

  function persistDurableSecrets() {
    try {
      const payload = {
        familyName: state.familyName || 'B2KS',
        familyNameUpdatedAt: state.familyNameUpdatedAt || 0,
        gamePassword: state.gamePassword || '1111',
        gamePasswordUpdatedAt: state.gamePasswordUpdatedAt || 0,
        parentPin: state.parentPin || '1234',
        parentPinUpdatedAt: state.parentPinUpdatedAt || 0
      };
      localStorage.setItem(getDurableSecretsKey(), JSON.stringify(payload));
      localStorage.setItem('b2ks_parent_pin', String(payload.parentPin));
      localStorage.setItem('b2ks_parent_pin_ts', String(payload.parentPinUpdatedAt));
    } catch {
      // ignore
    }
  }

  function unionStringLists(a: string[] = [], b: string[] = []): string[] {
    return Array.from(new Set([...(a || []), ...(b || [])]));
  }

  function petsProgressSignature(pets: OwnedPet[] = []): string {
    return pets
      .map(
        (p) =>
          `${p.id}:${p.speciesId}:${p.hatched ? 1 : 0}:${Math.round(p.hatchProgress || 0)}:${p.xp || 0}:${p.level || 1}:${p.stage || 0}:${Math.round(p.hunger || 0)}:${p.nickname || ''}:${p.variant || 'classic'}:${p.gender || 'female'}:${p.accessoryId || ''}`
      )
      .sort()
      .join('|');
  }

  function mergeQuizHistory(
    a: Member['englishQuizHistory'] = [],
    b: Member['englishQuizHistory'] = []
  ): NonNullable<Member['englishQuizHistory']> {
    const byKey = new Map<string, NonNullable<Member['englishQuizHistory']>[number]>();
    [...(a || []), ...(b || [])].forEach((r) => {
      if (!r) return;
      const key = `${r.ts || r.date}_${r.score}_${r.total}`;
      byKey.set(key, r);
    });
    return Array.from(byKey.values()).sort((x, y) => (y.ts || 0) - (x.ts || 0)).slice(0, 60);
  }

  function mergeCustomLabItems(
    a: Member['customLabItems'] = [],
    b: Member['customLabItems'] = []
  ): NonNullable<Member['customLabItems']> {
    const byId = new Map<string, NonNullable<Member['customLabItems']>[number]>();
    [...(a || []), ...(b || [])].forEach((item) => {
      if (item && item.id) byId.set(item.id, item);
    });
    return Array.from(byId.values());
  }

  function mergeEnglishProgressMaps(
    a?: Record<number, EnglishGradeProgress>,
    b?: Record<number, EnglishGradeProgress>
  ): Record<number, EnglishGradeProgress> {
    const out = defaultEnglishProgressMap();
    ([6, 7, 8, 9] as const).forEach((g) => {
      const pa = a?.[g] || { unit: 1, highScoreStreak: 0 };
      const pb = b?.[g] || { unit: 1, highScoreStreak: 0 };
      const scoreA = (pa.unit || 1) * 10 + (pa.highScoreStreak || 0);
      const scoreB = (pb.unit || 1) * 10 + (pb.highScoreStreak || 0);
      const chosen = scoreA >= scoreB ? pa : pb;
      out[g] = {
        unit: Math.max(1, Math.min(12, Math.round(Number(chosen.unit) || 1))),
        highScoreStreak: Math.max(0, Math.min(3, Math.round(Number(chosen.highScoreStreak) || 0)))
      };
    });
    return out;
  }

  function mergeBibleProgress(a?: BibleQuizProgress, b?: BibleQuizProgress): BibleQuizProgress {
    const counts: Record<string, number> = {};
    const addCounts = (src?: Record<string, number>) => {
      if (!src || typeof src !== 'object') return;
      Object.entries(src).forEach(([qid, cnt]) => {
        const val = Math.max(0, Math.min(3, Math.round(Number(cnt) || 0)));
        if (val > 0) counts[qid] = Math.max(counts[qid] || 0, val);
      });
    };
    addCounts(a?.correctCounts);
    addCounts(b?.correctCounts);
    const tsA = Number(a?.updatedAt) || 0;
    const tsB = Number(b?.updatedAt) || 0;
    const streak =
      tsB > tsA
        ? Math.max(0, Math.round(Number(b?.streak) || 0))
        : tsA > tsB
          ? Math.max(0, Math.round(Number(a?.streak) || 0))
          : Math.max(Number(a?.streak) || 0, Number(b?.streak) || 0);
    return {
      correctCounts: counts,
      streak,
      totalCorrect: Math.max(Number(a?.totalCorrect) || 0, Number(b?.totalCorrect) || 0),
      totalAnswered: Math.max(Number(a?.totalAnswered) || 0, Number(b?.totalAnswered) || 0),
      updatedAt: Math.max(tsA, tsB)
    };
  }

  function persistDurableMemberArchive() {
    try {
      const key = getMemberArchiveKey();
      let existing: Record<string, any> = {};
      try {
        existing = JSON.parse(localStorage.getItem(key) || '{}') || {};
      } catch {
        existing = {};
      }
      state.members.forEach((m) => {
        ensureMemberProps(m);
        const prev = existing[m.id];
        existing[m.id] = {
          id: m.id,
          name: m.name,
          role: m.role,
          age: m.age,
          points: m.points,
          pointsUpdatedAt: m.pointsUpdatedAt || 0,
          adminPointsUpdatedAt: m.adminPointsUpdatedAt || 0,
          memberUpdatedAt: m.memberUpdatedAt || 0,
          nameUpdatedAt: m.nameUpdatedAt || 0,
          hairStyle: m.hairStyle,
          hairColor: m.hairColor,
          shirtColor: m.shirtColor,
          shirtPattern: m.shirtPattern,
          pantsColor: m.pantsColor,
          pantsStyle: m.pantsStyle,
          outfit: m.outfit,
          roomUnlocked: m.roomUnlocked,
          roomWall: m.roomWall,
          inventory: m.inventory || [],
          vouchers: m.vouchers || [],
          customLabItems: m.customLabItems || [],
          roomSlots: m.roomSlots || {},
          roomSlotSpecs: m.roomSlotSpecs || {},
          roomDecor: m.roomDecor || [],
          roomDecorSpecs: m.roomDecorSpecs || {},
          inventoryConsumedMigrated: Boolean(m.inventoryConsumedMigrated),
          unlockedZooAnimals: unionStringLists(prev?.unlockedZooAnimals || [], m.unlockedZooAnimals || []),
          englishQuizHistory: mergeQuizHistory(prev?.englishQuizHistory || [], m.englishQuizHistory || []),
          englishProgress: mergeEnglishProgressMaps(prev?.englishProgress, m.englishProgress),
          bibleProgress: mergeBibleProgress(prev?.bibleProgress, m.bibleProgress),
          comicReadStats: {
            ...(m.comicReadStats || { date: new Date().toDateString(), count: 0, lastReadAt: 0, completedIds: [] }),
            completedIds: unionStringLists(prev?.comicReadStats?.completedIds || [], m.comicReadStats?.completedIds || [])
          },
          pets: mergeOwnedPets(m.pets || [], prev?.pets || []),
          petAccessories: mergeAccessoryLists(m.petAccessories || [], prev?.petAccessories || []),
          petFoodInventory: m.petFoodInventory || {},
          activePetId: m.activePetId ?? null,
          unlockedAchievements: mergeAchievementsList(prev?.unlockedAchievements || [], m.unlockedAchievements || []),
          englishWordsUsed: unionStringLists(prev?.englishWordsUsed || [], m.englishWordsUsed || []).slice(-2500),
          completedTaskCount: Math.max(prev?.completedTaskCount || 0, m.completedTaskCount || 0),
          speakingLevel: Math.max(prev?.speakingLevel || 1, m.speakingLevel || 1),
          speakingStreak: m.speakingStreak || 0,
          speakingHistory: (m.speakingHistory || []).slice(0, 60),
          helperRobot: m.helperRobot || prev?.helperRobot
        };
      });
      localStorage.setItem(key, JSON.stringify(existing));
    } catch {
      // ignore storage quota errors
    }
  }

  function restoreDurableMemberArchive(famName?: string) {
    try {
      const raw = localStorage.getItem(getMemberArchiveKey(famName));
      if (!raw) return;
      const arch = JSON.parse(raw);
      if (!arch || typeof arch !== 'object') return;
      state.members.forEach((m) => {
        const entry = arch[m.id];
        if (!entry || typeof entry !== 'object') return;
        ensureMemberProps(m);
        if (Array.isArray(entry.pets) && entry.pets.length > 0) {
          m.pets = mergeOwnedPets(m.pets || [], entry.pets);
        }
        if (Array.isArray(entry.petAccessories)) {
          m.petAccessories = mergeAccessoryLists(m.petAccessories, entry.petAccessories);
        }
        if (!m.activePetId && entry.activePetId) {
          m.activePetId = entry.activePetId;
        }
        if (Array.isArray(entry.unlockedZooAnimals)) {
          m.unlockedZooAnimals = unionStringLists(m.unlockedZooAnimals, entry.unlockedZooAnimals);
        }
        if (Array.isArray(entry.englishQuizHistory)) {
          m.englishQuizHistory = mergeQuizHistory(m.englishQuizHistory, entry.englishQuizHistory);
        }
        if (entry.englishProgress) {
          m.englishProgress = mergeEnglishProgressMaps(m.englishProgress, entry.englishProgress);
        }
        if (entry.bibleProgress) {
          m.bibleProgress = mergeBibleProgress(m.bibleProgress, entry.bibleProgress);
        }
        if (Array.isArray(entry.unlockedAchievements)) {
          m.unlockedAchievements = mergeAchievementsList(m.unlockedAchievements, entry.unlockedAchievements);
        }
        if (Array.isArray(entry.englishWordsUsed)) {
          m.englishWordsUsed = unionStringLists(m.englishWordsUsed, entry.englishWordsUsed).slice(-2500);
        }
        if (typeof entry.completedTaskCount === 'number' && entry.completedTaskCount > (m.completedTaskCount || 0)) {
          m.completedTaskCount = entry.completedTaskCount;
        }
        if (typeof entry.speakingLevel === 'number' && entry.speakingLevel > (m.speakingLevel || 1)) {
          m.speakingLevel = Math.max(1, Math.min(5, entry.speakingLevel));
          m.speakingStreak = Number(entry.speakingStreak) || 0;
        }
        if (Array.isArray(entry.speakingHistory) && entry.speakingHistory.length > (m.speakingHistory || []).length) {
          m.speakingHistory = entry.speakingHistory;
        }
        if (entry.helperRobot && (!m.helperRobot || (entry.helperRobot.updatedAt || 0) > (m.helperRobot.updatedAt || 0))) {
          m.helperRobot = entry.helperRobot;
        }
        if (entry.comicReadStats && Array.isArray(entry.comicReadStats.completedIds)) {
          if (!m.comicReadStats) {
            m.comicReadStats = { date: new Date().toDateString(), count: 0, lastReadAt: 0, completedIds: [] };
          }
          m.comicReadStats.completedIds = unionStringLists(
            m.comicReadStats.completedIds,
            entry.comicReadStats.completedIds
          );
          if ((entry.comicReadStats.lastReadAt || 0) > (m.comicReadStats.lastReadAt || 0)) {
            m.comicReadStats.lastReadAt = entry.comicReadStats.lastReadAt;
          }
        }
        if ((entry.nameUpdatedAt || 0) > (m.nameUpdatedAt || 0) && entry.name) {
          m.name = entry.name;
          m.nameUpdatedAt = entry.nameUpdatedAt;
        }
        if ((entry.memberUpdatedAt || 0) > (m.memberUpdatedAt || 0)) {
          if (entry.name && (entry.nameUpdatedAt || 0) >= (m.nameUpdatedAt || 0)) {
            m.name = entry.name;
            if (typeof entry.nameUpdatedAt === 'number') m.nameUpdatedAt = entry.nameUpdatedAt;
          }
          if (entry.role) m.role = entry.role;
          if (typeof entry.age === 'number') m.age = entry.age;
          if (entry.outfit !== undefined) m.outfit = entry.outfit;
          if (entry.hairStyle) m.hairStyle = entry.hairStyle;
          if (entry.hairColor) m.hairColor = entry.hairColor;
          if (entry.shirtColor) m.shirtColor = entry.shirtColor;
          if (entry.shirtPattern) m.shirtPattern = entry.shirtPattern;
          if (entry.pantsColor) m.pantsColor = entry.pantsColor;
          if (entry.pantsStyle) m.pantsStyle = entry.pantsStyle;
          if (typeof entry.roomUnlocked === 'boolean') m.roomUnlocked = entry.roomUnlocked;
          if (entry.roomWall) m.roomWall = entry.roomWall;
          m.inventory = Array.isArray(entry.inventory) ? [...entry.inventory] : [];
          m.vouchers = Array.isArray(entry.vouchers) ? [...entry.vouchers] : [];
          m.customLabItems = Array.isArray(entry.customLabItems) ? [...entry.customLabItems] : [];
          m.roomSlots = entry.roomSlots && typeof entry.roomSlots === 'object' ? { ...entry.roomSlots } : {};
          m.roomSlotSpecs = entry.roomSlotSpecs && typeof entry.roomSlotSpecs === 'object' ? { ...entry.roomSlotSpecs } : {};
          m.roomDecor = Array.isArray(entry.roomDecor) ? [...entry.roomDecor] : [];
          m.roomDecorSpecs = entry.roomDecorSpecs && typeof entry.roomDecorSpecs === 'object' ? { ...entry.roomDecorSpecs } : {};
          if (typeof entry.inventoryConsumedMigrated === 'boolean') m.inventoryConsumedMigrated = entry.inventoryConsumedMigrated;
          m.petFoodInventory =
            entry.petFoodInventory && typeof entry.petFoodInventory === 'object'
              ? { ...entry.petFoodInventory }
              : {};
          m.memberUpdatedAt = entry.memberUpdatedAt;
        }
        ensureMemberProps(m);
      });
    } catch {
      // ignore archive parse error
    }
  }

  function showToast(msg: string) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerText = msg;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  function findCustomLabSpecEverywhere(id: string): CustomLabItem | null {
    if (!id) return null;
    for (const m of state.members) {
      if (Array.isArray(m.customLabItems)) {
        const hit = m.customLabItems.find((x) => x && x.id === id);
        if (hit) return hit;
      }
      if (m.roomSlotSpecs) {
        const slotSpecHit = Object.values(m.roomSlotSpecs).find((x) => x && x.id === id);
        if (slotSpecHit) return slotSpecHit;
      }
      if (m.roomDecorSpecs) {
        const decorSpecHit = Object.values(m.roomDecorSpecs).find((x) => x && x.id === id);
        if (decorSpecHit) return decorSpecHit;
      }
    }
    return null;
  }

  function findAnyCatalogItem(id: string): any {
    if (!id) return null;
    if (id === 'd_bookshelf') {
      return {
        id: 'd_bookshelf',
        category: 'decor',
        name: 'Tủ Sách Gỗ Gia Đình',
        icon: '📚',
        desc: 'Tủ sách gỗ nhiều tầng đầy sách màu sắc'
      };
    }
    const shopHit =
      SHOP_CATALOG.find((i) => i.id === id) ||
      FASHION_CATALOG.find((f) => f.id === id) ||
      LEGACY_VOUCHERS.find((v) => v.id === id) ||
      PET_FOOD_CATALOG.find((p) => p.id === id) ||
      PET_ACCESSORY_CATALOG.find((a) => a.id === id);
    if (shopHit) return shopHit;
    return findCustomLabSpecEverywhere(id);
  }

  function consumeItemFromBag(member: Member, itemId: string): { ok: boolean; kind: 'inventory' | 'lab'; labItem?: CustomLabItem } {
    ensureMemberProps(member);
    const labIdx = (member.customLabItems || []).findIndex((x) => x && x.id === itemId);
    if (labIdx !== -1) {
      const [labItem] = member.customLabItems!.splice(labIdx, 1);
      return { ok: true, kind: 'lab', labItem };
    }
    const invIdx = member.inventory.indexOf(itemId);
    if (invIdx !== -1) {
      member.inventory.splice(invIdx, 1);
      return { ok: true, kind: 'inventory' };
    }
    return { ok: false, kind: 'inventory' };
  }

  function returnItemToBag(member: Member, itemId: string, labSpecFallback?: CustomLabItem | null) {
    ensureMemberProps(member);
    if (!itemId) return;
    const isLab = itemId.startsWith('lab_') || Boolean(labSpecFallback?.isLabItem);
    if (isLab) {
      const resolved = labSpecFallback || findCustomLabSpecEverywhere(itemId);
      if (resolved) {
        member.customLabItems!.unshift({ ...resolved });
      }
    } else {
      member.inventory.push(itemId);
    }
  }

  /* ==================== 4. FIREBASE REALTIME DB SYNC ==================== */
  function syncToFirebase(extraMemberIds: string[] = []) {
    if (!deviceConfig.firebaseUrl) return;
    const fbBase = getFirebaseBasePath();
    const cur = getCurrentUser();
    const { englishQuestions: _omitEng, ...sharedPayload } = state;
    fetch(`${deviceConfig.firebaseUrl}/${fbBase}/shared.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sharedPayload)
    }).catch(() => {});

    fetch(`${deviceConfig.firebaseUrl}/${fbBase}/auth_meta.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        familyName: state.familyName || 'B2KS',
        familyNameUpdatedAt: state.familyNameUpdatedAt || 0,
        gamePassword: state.gamePassword || '1111',
        gamePasswordUpdatedAt: state.gamePasswordUpdatedAt || 0,
        parentPin: state.parentPin || '1234',
        parentPinUpdatedAt: state.parentPinUpdatedAt || 0
      })
    }).catch(() => {});

    const memberIdsToPush = new Set<string>(extraMemberIds);
    state.members.forEach((m) => {
      if (lastPushedMemberUpdatedAt[m.id] === undefined || (m.memberUpdatedAt || 0) > (lastPushedMemberUpdatedAt[m.id] || 0)) {
        memberIdsToPush.add(m.id);
      }
    });
    if (memberIdsToPush.size === 0 && cur) {
      memberIdsToPush.add(cur.id);
    }

    memberIdsToPush.forEach((mId) => {
      const mObj = state.members.find((x) => x.id === mId);
      if (!mObj) return;
      lastPushedMemberUpdatedAt[mObj.id] = mObj.memberUpdatedAt || 0;
      fetch(`${deviceConfig.firebaseUrl}/${fbBase}/member_data/${mObj.id}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mObj)
      }).catch(() => {});
    });

    const liveTs = Date.now();
    livePosTimestamps.set(cur.id, liveTs);
    fetch(`${deviceConfig.firebaseUrl}/${fbBase}/live_pos/${cur.id}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        x: Math.round(cur.x),
        y: Math.round(cur.y),
        dir: cur.dir || 'down',
        scene: cur.scene || 'neighborhood',
        privateRoomId: cur.privateRoomId || null,
        speech: cur.speech || null,
        ts: liveTs
      })
    }).catch(() => {});

    publishFamilyDirectorySummary();
  }

  function publishFamilyDirectorySummary() {
    if (!deviceConfig.firebaseUrl) return;
    const slug = getActiveFamilySlug();
    const summary: OtherFamilySummary = {
      slug,
      familyName: state.familyName || 'B2KS',
      updatedAt: Date.now(),
      dailyParentAllowance: state.dailyParentAllowance ?? DAILY_PARENT_ALLOWANCE,
      maxParentPoints: getMaxParentPoints(),
      deleted: false,
      members: state.members.map((m) => ({
        id: m.id,
        name: m.name,
        role: m.role,
        age: m.age,
        outfit: m.outfit || '',
        points: m.points
      }))
    };
    fetch(`${deviceConfig.firebaseUrl}/b2ks_family_directory/${slug}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(summary)
    }).catch(() => {});
  }

  function syncEnglishBankToFirebase(questions: EnglishQuestion[]) {
    saveSharedEnglishBank(questions, Date.now(), true);
  }

  function syncCrossWorldRequestsToFirebase(reqs: CrossWorldRequest[]) {
    state.crossWorldRequests = reqs;
    if (!deviceConfig.firebaseUrl) return;
    fetch(`${deviceConfig.firebaseUrl}/${getFirebaseBasePath()}/cross_world_requests.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqs)
    }).catch(() => {});
  }

  function syncFleaMarketToFirebase(listings: FleaMarketListing[]) {
    state.fleaMarketListings = listings;
    if (!deviceConfig.firebaseUrl) return;
    fetch(`${deviceConfig.firebaseUrl}/${getFirebaseBasePath()}/flea_market.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(listings)
    }).catch(() => {});
  }

  function syncActivityLogsToFirebase(logs: ActivityLogEntry[]) {
    state.activityLogs = logs;
    if (!deviceConfig.firebaseUrl) return;
    fetch(`${deviceConfig.firebaseUrl}/${getFirebaseBasePath()}/activity_logs.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logs)
    }).catch(() => {});
  }

  function logActivity(entry: Omit<ActivityLogEntry, 'id' | 'ts'>) {
    ensureStateArrays();
    const fullEntry: ActivityLogEntry = {
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ts: Date.now(),
      ...entry
    };
    state.activityLogs.unshift(fullEntry);
    if (state.activityLogs.length > 200) {
      state.activityLogs = state.activityLogs.slice(0, 200);
    }
    syncActivityLogsToFirebase(state.activityLogs);
  }

  function saveGame(pushCloud = true) {
    try {
      const now = Date.now();
      state.updatedAt = now;
      const changedPointMembers: string[] = [];
      state.members.forEach((m) => {
        if (lastSavedPointsMap[m.id] !== undefined && m.points !== lastSavedPointsMap[m.id]) {
          m.pointsUpdatedAt = now;
          touchMemberData(m, now);
          changedPointMembers.push(m.id);
        }
      });

      snapshotSavedPointsMap();
      hasLocalSaveFile = true;
      const { englishQuestions: _omitLocalEng, ...localPayload } = state;
      localStorage.setItem(getFamilyStorageKey(), JSON.stringify(localPayload));
      persistPointsLedger();
      persistDurableSecrets();
      persistDurableMemberArchive();

      const extraToSync = Array.from(new Set([...changedPointMembers, ...Array.from(dirtyMemberIds)]));
      dirtyMemberIds.clear();
      if (pushCloud && deviceConfig.firebaseUrl) {
        syncToFirebase(extraToSync);
      }
      notifySubscribers();
    } catch {
      showToast('⚠️ Bộ nhớ trình duyệt đầy, hãy dùng ảnh dung lượng nhẹ hơn.');
    }
  }

  /* ==================== 5. HOUSE ROOMS & COLLISION ==================== */
  function getHouseLayoutMetrics() {
    const kids = state.members.filter((m) => !isParent(m));
    const extraFloors = Math.max(0, Math.ceil(Math.max(1, kids.length) / 2) - 1);
    const yShift = extraFloors * 230;
    return {
      kids,
      extraFloors,
      yShift,
      totalFloors: 3 + extraFloors,
      houseHeight: HOUSE_WORLD.height + yShift
    };
  }

  function getHouseRooms(): HouseRoomDef[] {
    const parents = state.members.filter((m) => isParent(m));
    const { kids, extraFloors, yShift } = getHouseLayoutMetrics();
    const dad = parents.find((p) => p.role === 'Bố') || parents[0];

    const rooms: HouseRoomDef[] = [
      { id: 'f1_living', name: '🛋️ Phòng Khách (Tầng 1)', x: 100, y: 570 + yShift, w: 400, h: 180, wall: '#FCF3CF', floor: '#E59866', ownerIds: [], isUnlocked: true, doorSide: 'right', wardrobe: null },
      { id: 'f1_dining', name: '🍽️ Phòng Ăn & Bếp (Tầng 1)', x: 620, y: 570 + yShift, w: 400, h: 180, wall: '#FDEBD0', floor: '#DC7633', ownerIds: [], isUnlocked: true, doorSide: 'left', wardrobe: null },
      {
        id: 'f2_common',
        name: '🛋️ Sinh Hoạt Chung (Tầng 2)',
        x: 100, y: 340 + yShift, w: 400, h: 200,
        wall: '#D6EAF8', floor: '#CA6F1E',
        ownerIds: [],
        isUnlocked: true,
        doorSide: 'right',
        wardrobe: null
      },
      {
        id: 'f2_parents',
        name: '🛏️ Phòng Bố Mẹ (Tầng 2)',
        x: 620, y: 340 + yShift, w: 400, h: 200,
        wall: (dad && dad.roomWall) || (parents[0] && parents[0].roomWall) || '#D6EAF8',
        floor: '#BA4A00',
        ownerIds: parents.map((p) => p.id),
        isUnlocked: parents.length > 0 && parents.every((p) => Boolean(p.roomUnlocked)),
        doorSide: 'left',
        wardrobe: { x: 956, y: 378 + yShift }
      }
    ];

    for (let k = 0; k <= extraFloors; k++) {
      const floorNum = 3 + k;
      const ry = 110 + (extraFloors - k) * 230;
      const leftKid = kids[k * 2] || null;
      const rightKid = kids[k * 2 + 1] || null;
      const leftId = k === 0 ? 'f3_kid1' : `f${floorNum}_kid${k * 2 + 1}`;
      const rightId = k === 0 ? 'f3_kid2' : `f${floorNum}_kid${k * 2 + 2}`;

      rooms.push({
        id: leftId,
        name: leftKid ? `🛏️ Phòng ${leftKid.name} (Tầng ${floorNum})` : `🚫 Phòng Ngủ Trống (Tầng ${floorNum})`,
        x: 100, y: ry, w: 400, h: 200,
        wall: (leftKid && leftKid.roomWall) || '#D5F5E3',
        floor: '#E59866',
        ownerIds: leftKid ? [leftKid.id] : [],
        isUnlocked: leftKid ? leftKid.roomUnlocked : false,
        isDisabled: !leftKid,
        doorSide: 'right',
        wardrobe: leftKid ? { x: 436, y: ry + 38 } : null
      });

      rooms.push({
        id: rightId,
        name: rightKid ? `🛏️ Phòng ${rightKid.name} (Tầng ${floorNum})` : `🚫 Phòng Ngủ Trống (Tầng ${floorNum})`,
        x: 620, y: ry, w: 400, h: 200,
        wall: (rightKid && rightKid.roomWall) || '#EBDEF0',
        floor: '#E59866',
        ownerIds: rightKid ? [rightKid.id] : [],
        isUnlocked: rightKid ? rightKid.roomUnlocked : false,
        isDisabled: !rightKid,
        doorSide: 'left',
        wardrobe: rightKid ? { x: 956, y: ry + 38 } : null
      });
    }

    return rooms;
  }

  function getRoomAtPosition(x: number, y: number): HouseRoomDef | null {
    return getHouseRooms().find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) || null;
  }

  function getMemberPrivateRoom(member: Member): HouseRoomDef | null {
    return getHouseRooms().find((r) => r.ownerIds && r.ownerIds.includes(member.id)) || null;
  }

  function getActivePrivateRoom(): HouseRoomDef | null {
    const user = getCurrentUser();
    if (user.scene !== 'private_room') return null;
    const roomId = user.privateRoomId || activePrivateRoomId;
    return getHouseRooms().find((r) => r.id === roomId) || null;
  }

  function setPrivateRoomUnlockedForMember(user: Member, nextUnlocked: boolean) {
    const nowTs = Date.now();
    if (isParent(user)) {
      state.members.filter(isParent).forEach((p) => {
        p.roomUnlocked = nextUnlocked;
        touchMemberData(p, nowTs);
      });
    } else {
      user.roomUnlocked = nextUnlocked;
      touchMemberData(user, nowTs);
    }
  }

  function setPrivateRoomWallForMember(user: Member, nextWall: string) {
    const nowTs = Date.now();
    if (isParent(user)) {
      state.members.filter(isParent).forEach((p) => {
        p.roomWall = nextWall;
        touchMemberData(p, nowTs);
      });
    } else {
      user.roomWall = nextWall;
      touchMemberData(user, nowTs);
    }
  }

  function isMemberAtOwnWardrobe(member: Member): boolean {
    const myRoom = getMemberPrivateRoom(member);
    if (!myRoom) return false;
    if (member.scene === 'private_room' && (member.privateRoomId || activePrivateRoomId) === myRoom.id) {
      return Math.hypot(member.x - 706, member.y - 46) <= 115;
    }
    if (member.scene !== 'house' || !myRoom.wardrobe) return false;
    const curRoom = getRoomAtPosition(member.x, member.y);
    if (!curRoom || curRoom.id !== myRoom.id) return false;
    return Math.hypot(member.x - myRoom.wardrobe.x, member.y - (myRoom.wardrobe.y + 38)) <= 85;
  }

  function canMoveInsideHouse(member: Member, nextX: number, nextY: number): { allowed: boolean; blockedRoom?: HouseRoomDef | null } {
    const { yShift } = getHouseLayoutMetrics();
    if (nextX >= 505 && nextX <= 615 && nextY >= 120 && nextY <= 750 + yShift) return { allowed: true };
    const rooms = getHouseRooms();
    for (const r of rooms) {
      const doorTop = r.y + r.h - 95;
      const doorBottom = r.y + r.h - 5;
      const inDoorway =
        nextY >= doorTop &&
        nextY <= doorBottom &&
        ((r.doorSide === 'right' && nextX >= r.x + r.w - 30 && nextX <= 525) ||
          (r.doorSide === 'left' && nextX >= 595 && nextX <= r.x + 30));
      const inRoomFloor = nextX >= r.x + 10 && nextX <= r.x + r.w - 10 && nextY >= r.y + 16 && nextY <= r.y + r.h - 8;

      if (inDoorway || inRoomFloor) {
        if (r.isDisabled) {
          return { allowed: false, blockedRoom: r };
        }
        const currentRoom = getRoomAtPosition(member.x, member.y);
        if ((!currentRoom || currentRoom.id !== r.id) && r.ownerIds && r.ownerIds.length > 0) {
          const isOwner = r.ownerIds.includes(member.id);
          if (!isOwner && !r.isUnlocked) return { allowed: false, blockedRoom: r };
        }
        return { allowed: true };
      }
    }
    return { allowed: false, blockedRoom: null };
  }

  /* ==================== 6. MESSENGER & TASKS & FAMILY QUEST & NAVIGATION ==================== */
  const MSG_RETENTION_MS = 72 * 60 * 60 * 1000;
  let smartphoneCurrentView: 'home' | 'messenger' | 'tasks' | 'maps' | 'robot' = 'home';
  let smartphoneChatTargetId = 'family_group';
  let smartphoneChannelMenuOpen = false;
  let smartphoneRobotChildId = '';
  let activeNavTargetId: string | null = null;
  let petShopTab: 'eggs' | 'food' | 'accessories' | 'my_pets' = 'eggs';
  let petModalMode: 'shop' | 'hud_collection' = 'shop';
  let lastEggWarmAt = 0;
  let minimapCollapsed = localStorage.getItem('b2ks_minimap_collapsed') === '1';
  let minimapOrientMode: MinimapOrientationMode = localStorage.getItem('b2ks_minimap_mode') === 'heading' ? 'heading' : 'camera';
  const MINIMAP_ZOOM_STEPS = [0.7, 1.0, 1.4] as const;
  const savedMmZoomIdx = Number(localStorage.getItem('b2ks_minimap_zoom_idx'));
  let minimapZoomIdx = Number.isInteger(savedMmZoomIdx) && savedMmZoomIdx >= 0 && savedMmZoomIdx < MINIMAP_ZOOM_STEPS.length ? savedMmZoomIdx : 1;
  const minimapPinHits: MinimapPinHit[] = [];
  let activeSpeakingNpc: { id: string; name: string; gender: 'male' | 'female' } | null = null;

  function syncMinimapToolbarUI() {
    const modeBtn = document.getElementById('minimap-mode-btn');
    if (modeBtn) {
      if (minimapOrientMode === 'heading') {
        modeBtn.textContent = '🧭 Xoay';
        modeBtn.classList.add('heading-active');
      } else {
        modeBtn.textContent = '🎥 3D';
        modeBtn.classList.remove('heading-active');
      }
    }
    const zoomEl = document.getElementById('minimap-zoom-readout');
    if (zoomEl) {
      const z = MINIMAP_ZOOM_STEPS[minimapZoomIdx] ?? 1.0;
      zoomEl.textContent = `${z}×`;
    }
  }

  function getResolvedNavTarget(): NavDestination | null {
    if (!activeNavTargetId) return null;
    const resolved = resolveNeighborhoodLocations(state);
    return resolved.find((l) => l.id === activeNavTargetId) || null;
  }

  function pruneExpiredFamilyMessages() {
    if (!Array.isArray(state.familyMessages)) {
      state.familyMessages = [];
      return;
    }
    const cutoff = Date.now() - MSG_RETENTION_MS;
    const before = state.familyMessages.length;
    state.familyMessages = (state.familyMessages as any[]).filter((m) => (m.ts || 0) >= cutoff);
    if (state.familyMessages.length !== before) {
      localStorage.setItem(getFamilyStorageKey(), JSON.stringify(state));
    }
  }

  function getUnreadMessageCount(member: Member): number {
    if (!member || !Array.isArray(state.familyMessages)) return 0;
    const cutoff = Date.now() - MSG_RETENTION_MS;
    let count = 0;
    (state.familyMessages as any[]).forEach((msg) => {
      if ((msg.ts || 0) < cutoff || msg.senderId === member.id) return;
      const isForMe = msg.recipientId === 'family_group' || msg.recipientId === member.id;
      if (!isForMe) return;
      const readBy = Array.isArray(msg.readBy) ? msg.readBy : [];
      if (!readBy.includes(member.id)) count++;
    });
    return count;
  }

  function getPendingTasksCountForMember(member: Member): number {
    if (!member || !Array.isArray(state.tasks)) return 0;
    if (isParent(member)) {
      return state.tasks.filter((t) => {
        if (t.status === 'submitted') return true;
        if (t.type === 'family_quest' && t.status !== 'completed') {
          const pIds = t.participantIds || [];
          const pMap = t.progressMap || {};
          return pIds.length > 0 && pIds.every((id) => pMap[id] === 'done');
        }
        return false;
      }).length;
    }
    return state.tasks.filter((t) => {
      if (t.status === 'completed') return false;
      if (t.type === 'family_quest') {
        return (t.participantIds || []).includes(member.id) && (t.progressMap || {})[member.id] !== 'done';
      }
      return t.assigneeId === member.id && t.status === 'pending';
    }).length;
  }

  function getOverdueTasksCountForMember(member: Member): number {
    if (!member || isParent(member) || !Array.isArray(state.tasks)) return 0;
    const now = Date.now();
    return state.tasks.filter((t) => {
      if (t.status === 'completed' || !t.deadline || now <= t.deadline) return false;
      if (t.type === 'family_quest') {
        return (t.participantIds || []).includes(member.id) && (t.progressMap || {})[member.id] !== 'done';
      }
      return t.assigneeId === member.id && t.status === 'pending';
    }).length;
  }

  function triggerSpeechBubble(member: Member, text: string, isEng: boolean) {
    const now = Date.now();
    member.speech = { text, isEng, expiresAt: now + 5500 };
    state.chatHistory.push({ sender: member.name, text, isEng, ts: now });
    if (state.chatHistory.length > 40) state.chatHistory.shift();
    renderChatLog();
  }

  function checkAllDailyTasksCompleted(memberId: string) {
    const m = state.members.find((x) => x.id === memberId);
    if (!m || isParent(m)) return;
    const assigned = state.tasks.filter(
      (t) => t.assigneeId === memberId || (t.type === 'family_quest' && (t.participantIds || []).includes(memberId))
    );
    if (assigned.length === 0) return;
    const hasIncomplete = assigned.some((t) => {
      if (t.type === 'family_quest') return t.status !== 'completed' && (t.progressMap || {})[memberId] !== 'done';
      return t.status !== 'completed';
    });
    if (!hasIncomplete) {
      triggerConfetti();
      AudioEngine.playSuccess();
      triggerSpeechBubble(m, `Hurray! Hoàn thành tất cả nhiệm vụ hôm nay rồi! 🎉🏆`, false);
      showToast(`🎆 CHÚC MỪNG ${m.name.toUpperCase()} ĐÃ HOÀN TẤT TOÀN BỘ NHIỆM VỤ TRONG NGÀY!`);
    }
  }

  /* ==================== 7. HUD & DAILY RESET ==================== */
  let lastHudSignature = '';
  let hudToolsExpanded = false;

  function syncHudToolsVisibility() {
    const extraEl = document.getElementById('hud-extra-tools');
    const toggleBtn = document.getElementById('hud-more-toggle-btn');
    const toggleIco = document.getElementById('hud-more-ico');
    const toggleLbl = document.getElementById('hud-more-lbl');
    if (extraEl) {
      extraEl.style.display = hudToolsExpanded ? 'inline-flex' : 'none';
    }
    if (toggleIco && toggleLbl) {
      toggleIco.textContent = hudToolsExpanded ? '✕' : '⋯';
      toggleLbl.textContent = hudToolsExpanded ? 'Thu gọn' : 'Thêm';
    } else if (toggleBtn) {
      toggleBtn.textContent = hudToolsExpanded ? '<' : '>';
    }
    if (toggleBtn) {
      toggleBtn.title = hudToolsExpanded ? 'Thu gọn thanh công cụ' : 'Mở rộng thanh công cụ';
    }
  }

  function getMemberLocationText(user: Member): string {
    const brand = (state.familyName || 'B2KS').trim() || 'B2KS';
    if (user.scene === 'neighborhood') return `🏘️ Khu phố ${brand}`;
    if (user.scene === 'private_room') return getActivePrivateRoom()?.name.split(' (')[0] || '🛏️ Phòng riêng';
    return getRoomAtPosition(user.x, user.y)?.name.split(' (')[0] || '🪜 Cầu thang trong nhà';
  }

  function updateFamilyBrandingDOM() {
    const brand = (state.familyName || 'B2KS').trim() || 'B2KS';
    document.title = `${brand} Daily Routines`;
    const brandMappings: [string, string][] = [
      ['guide-title-brand', `🏡 ${brand} Daily Routines — Khu Phố Gia Đình`],
      ['house-modal-title', `🏢 Nhà Phố Gia Đình ${brand}`],
      ['shop-modal-title', `🏪 Siêu Thị Gia Đình ${brand} — Khu Mua Sắm`],
      ['shop-npc-greeting', `“Chào mừng quý khách tới Siêu Thị ${brand}! Chọn kệ hàng bên dưới để đổi điểm lấy nội thất phòng & thẻ xem YouTube nhé! (Đặc quyền ngoài đời hãy ghé 🌌 Trung Tâm Xuyên Thế Giới)”`],
      ['fashion-modal-title', `👗 ${brand} Fashion Boutique & Sàn Thử Đồ`],
      ['salon-modal-title', `💇 ${brand} Hair Studio & Nhuộm Nghệ Thuật`],
      ['english-modal-title', `🎓 ${brand} English Academy — Global Success (Lớp 6–9)`],
      ['arcade-modal-title', `🕹️ ${brand} eSports & Arcade Arena`],
      ['lab-modal-title', `🧪 Phòng Thí Nghiệm Sáng Tạo ${brand}`],
      ['soccer-modal-title', `⚽ Sân Bóng Đá ${brand} (Miễn Phí 0⭐)`],
      ['phone-carrier-label', `📶 ${brand}-5G 🔋100%`]
    ];
    brandMappings.forEach(([id, txt]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = txt;
    });
    const verEl = document.getElementById('guide-app-version');
    if (verEl) verEl.textContent = APP_VERSION;
    const updEl = document.getElementById('guide-updated-at');
    if (updEl) updEl.textContent = APP_UPDATED_AT;
    const famBadge = document.getElementById('hud-family-badge');
    if (famBadge) famBadge.textContent = `🏡 ${brand}`;
  }

  function renderMemberDropdownList() {
    const menu = document.getElementById('member-dropdown-menu');
    if (!menu) return;
    menu.innerHTML = '';
    state.members.forEach((m) => {
      const isCur = m.id === state.currentUserId;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'member-option-item' + (isCur ? ' active' : '');
      btn.innerHTML = `
        <span>${escapeHtml(m.name)}</span>
        ${isCur ? '<span style="font-size:12px; color:#B45309;">✓</span>' : ''}
      `;
      btn.onclick = (e) => {
        e.stopPropagation();
        selectMemberById(m.id);
      };
      menu.appendChild(btn);
    });
  }

  function updateHUD() {
    const user = getCurrentUser();
    const lighting = getRealTimeLighting();
    const locText = getMemberLocationText(user);
    const unreadCount = getUnreadMessageCount(user);
    const pendingTasksCount = getPendingTasksCountForMember(user);
    const overdueTasksCount = getOverdueTasksCountForMember(user);
    const pendingCWCount = state.crossWorldRequests.filter((r) => r.status === 'pending').length;
    const brand = (state.familyName || 'B2KS').trim() || 'B2KS';

    const lockTag = document.getElementById('hud-device-lock-tag');
    if (lockTag) lockTag.style.display = deviceConfig.isLockedToMember ? 'inline-block' : 'none';

    const badgeEl = document.getElementById('hud-phone-unread-badge');
    if (badgeEl) {
      if (unreadCount > 0) {
        badgeEl.style.display = 'inline-block';
        badgeEl.textContent = unreadCount > 9 ? '9+' : String(unreadCount);
      } else {
        badgeEl.style.display = 'none';
      }
    }

    const tasksNoticeEl = document.getElementById('hud-tasks-notice-badge');
    if (tasksNoticeEl) {
      if (pendingTasksCount > 0 || overdueTasksCount > 0) {
        tasksNoticeEl.style.display = 'inline-flex';
        tasksNoticeEl.textContent = pendingTasksCount > 9 ? '9+' : String(pendingTasksCount);
        tasksNoticeEl.style.background = overdueTasksCount > 0 ? '#DC2626' : '#F97316';
        tasksNoticeEl.title = overdueTasksCount > 0
          ? `${overdueTasksCount} việc đã quá hạn!`
          : `${pendingTasksCount} nhiệm vụ đang chờ`;
      } else {
        tasksNoticeEl.style.display = 'none';
      }
    }

    const parentBadgeEl = document.getElementById('hud-parent-pending-badge');
    if (parentBadgeEl) {
      if (pendingCWCount > 0) {
        parentBadgeEl.style.display = 'inline-block';
        parentBadgeEl.textContent = pendingCWCount > 9 ? '9+' : String(pendingCWCount);
      } else {
        parentBadgeEl.style.display = 'none';
      }
    }

    const showParentTools = isParent(user);
    const showAdminBtn = getActiveFamilySlug() === 'b2ks' && user.role === 'Bố';
    const tasksBtn = document.getElementById('hud-tasks-btn');
    if (tasksBtn) {
      tasksBtn.style.display = showParentTools ? 'none' : 'inline-flex';
    }
    const achBtn = document.getElementById('hud-achievements-btn');
    if (achBtn) {
      achBtn.style.display = showParentTools ? 'none' : 'inline-flex';
    }
    const miniWinBtn = document.getElementById('hud-mini-window-btn');
    if (miniWinBtn) {
      miniWinBtn.style.display = showParentTools ? 'inline-flex' : 'none';
    }
    const parentalBtn = document.getElementById('hud-parental-btn');
    if (parentalBtn) {
      parentalBtn.style.display = showParentTools ? 'inline-flex' : 'none';
    }
    const familySyncBtn = document.getElementById('hud-family-sync-btn');
    if (familySyncBtn) {
      familySyncBtn.style.display = showParentTools ? 'inline-flex' : 'none';
    }
    const adminBtn = document.getElementById('hud-admin-btn');
    if (adminBtn) {
      adminBtn.style.display = showAdminBtn ? 'inline-flex' : 'none';
    }
    syncHudToolsVisibility();

    const ptsEl = document.getElementById('hud-points');
    if (ptsEl) ptsEl.textContent = `${user.points}⭐`;

    const weatherPill = document.getElementById('hud-weather-pill');
    if (weatherPill) {
      weatherPill.textContent = currentWeather
        ? `${currentWeather.icon} ${currentWeather.tempC}°C`
        : lighting.label;
      weatherPill.title = currentWeather
        ? `${currentWeather.label} (${currentWeather.locationLabel}) • Gió ${currentWeather.windKmh} km/h`
        : 'Đang cập nhật thời tiết thực tế...';
    }

    const audioIco = document.getElementById('audio-toggle-ico');
    const audioLbl = document.getElementById('audio-toggle-lbl');
    const audioBtn = document.getElementById('audio-toggle-btn');
    if (audioIco && audioLbl) {
      audioIco.textContent = AudioEngine.isMuted ? '🔇' : '🔊';
      audioLbl.textContent = AudioEngine.isMuted ? 'Đang tắt' : 'Nhạc';
    } else if (audioBtn) {
      audioBtn.innerText = AudioEngine.isMuted ? '🔇 Tắt' : '🔊 Nhạc';
    }

    const phoneTimeEl = document.getElementById('phone-status-time');
    if (phoneTimeEl) phoneTimeEl.textContent = lighting.label;
    const phoneHomePoints = document.getElementById('phone-home-points');
    if (phoneHomePoints) phoneHomePoints.textContent = `${user.points}⭐`;
    const phoneHomeLoc = document.getElementById('phone-home-loc');
    if (phoneHomeLoc) phoneHomeLoc.textContent = locText;

    const petSummary = getMemberPetBonuses(user);
    const sig = `${brand}|${user.id}|${user.name}|${user.role}|${user.age || ''}|${user.outfit}|${user.points}|${lighting.label}|${currentWeather?.condition || ''}|${currentWeather?.tempC || ''}|${locText}|${deviceConfig.isLockedToMember}|${unreadCount}|${pendingTasksCount}|${overdueTasksCount}|${pendingCWCount}|${petSummary.pet?.id || ''}|${petSummary.pet?.stage || 0}|${activeNavTargetId || ''}`;
    if (sig === lastHudSignature) return;
    lastHudSignature = sig;

    updateFamilyBrandingDOM();

    const avEl = document.getElementById('hud-avatar');
    const nameEl = document.getElementById('hud-name');
    const roleEl = document.getElementById('hud-role');
    if (avEl) avEl.innerText = user.outfit || getRoleEmoji(user.role);
    if (nameEl) nameEl.innerText = user.name;
    if (roleEl) roleEl.innerText = user.role !== user.name ? `(${user.role})` : '';

    const menu = document.getElementById('member-dropdown-menu');
    if (menu && menu.classList.contains('open')) renderMemberDropdownList();
  }

  function getDailyParentAllowance(): number {
    return typeof state.dailyParentAllowance === 'number' && state.dailyParentAllowance >= 0
      ? Math.round(state.dailyParentAllowance)
      : DAILY_PARENT_ALLOWANCE;
  }

  function getMaxParentPoints(): number {
    return typeof state.maxParentPoints === 'number' && !Number.isNaN(state.maxParentPoints) && state.maxParentPoints >= 0
      ? Math.round(state.maxParentPoints)
      : MAX_PARENT_POINTS;
  }

  function addParentPointsWithAllowanceCap(parent: Member, gain: number): number {
    if (gain <= 0) return 0;
    const cap = getMaxParentPoints();
    if (parent.points >= cap) return 0;
    const prev = parent.points;
    parent.points = Math.min(cap, parent.points + gain);
    const actual = Math.max(0, parent.points - prev);
    if (actual > 0) parent.pointsUpdatedAt = Date.now();
    return actual;
  }

  function checkDailyAllowance(pushCloud = true) {
    const today = new Date().toDateString();
    ensureStateArrays();
    if (state.lastDailyReset !== today) {
      const allowance = getDailyParentAllowance();
      let totalGiven = 0;
      state.members.forEach((m) => {
        if (isParent(m) && allowance > 0) {
          totalGiven += addParentPointsWithAllowanceCap(m, allowance);
        }
        m.tvSecondsUsedToday = 0;
        m.tvBonusSecondsToday = 0;
        m.tvLastDate = today;
      });
      state.lastDailyReset = today;
      if (allowance > 0 && totalGiven > 0) {
        showToast(`🌅 Ngày mới! Bố và Mẹ nhận thêm ngân sách ngày (tối đa ${getMaxParentPoints()}⭐)!`);
      }
      saveGame(pushCloud);
    }
  }

  /* ==================== 8. PASSCODE PIN & SYNC ==================== */
  let pendingParentAction: (() => void) | null = null;
  let enteredPin = '';

  function updatePinDisplay() {
    const box = document.getElementById('pin-display-box');
    if (box) box.textContent = '●'.repeat(enteredPin.length) + '_'.repeat(4 - enteredPin.length);
  }

  function requestParentAccess(callback: () => void) {
    const m = getCurrentUser();
    const isKid = !isParent(m);
    if (deviceConfig.isLockedToMember || isKid) {
      pendingParentAction = callback;
      enteredPin = '';
      updatePinDisplay();
      const resetBox = document.getElementById('pin-reset-container');
      if (resetBox) resetBox.style.display = !isKid && !deviceConfig.isLockedToMember ? 'block' : 'none';
      openModal('pin-modal');
    } else {
      callback();
    }
  }

  function verifyPin() {
    const activePin = String(state.parentPin || localStorage.getItem('b2ks_parent_pin') || '1234');
    if (String(enteredPin) === activePin) {
      closeModal('pin-modal');
      enteredPin = '';
      AudioEngine.playSuccess();
      if (typeof pendingParentAction === 'function') {
        const fn = pendingParentAction;
        pendingParentAction = null;
        fn();
      }
    } else {
      AudioEngine.playError();
      showToast('❌ Sai Passcode Phụ huynh!');
      enteredPin = '';
      updatePinDisplay();
    }
  }

  /* ==================== 9. ACTIVITY COOLDOWN & DINING PUZZLE ==================== */
  function getActivityStatus(member: Member & { activityLogs?: any }, actKey: keyof typeof ACTIVITY_RULES) {
    ensureMemberProps(member);
    const rule = ACTIVITY_RULES[actKey];
    const cfg = getActivityConfig(actKey as ActivityConfigId);
    const maxPerDay = cfg.maxPerDay ?? rule.maxPerDay;
    const cooldownMs = cfg.cooldownMs ?? rule.cooldownMs;
    const today = new Date().toDateString();
    if (!member.activityLogs) member.activityLogs = {};
    let log = member.activityLogs[actKey];
    if (!log || log.date !== today) {
      log = { date: today, count: 0, lastAt: 0 };
      member.activityLogs[actKey] = log;
    }
    if (!cfg.enabled) return { canEarn: false, disabled: true, isParent: isParent(member), onCooldown: false, capped: false, remainMs: 0, count: log.count, maxPerDay, reward: cfg.reward };
    if (isParent(member)) return { canEarn: false, disabled: false, isParent: true, onCooldown: false, capped: false, remainMs: 0, count: log.count, maxPerDay, reward: cfg.reward };
    if (log.count >= maxPerDay) return { canEarn: false, disabled: false, isParent: false, onCooldown: false, capped: true, remainMs: 0, count: log.count, maxPerDay, reward: cfg.reward };
    const elapsed = Date.now() - (log.lastAt || 0);
    if (log.lastAt > 0 && elapsed < cooldownMs) {
      return { canEarn: false, disabled: false, isParent: false, onCooldown: true, capped: false, remainMs: cooldownMs - elapsed, count: log.count, maxPerDay, reward: cfg.reward };
    }
    return { canEarn: true, disabled: false, isParent: false, onCooldown: false, capped: false, remainMs: 0, count: log.count, maxPerDay, reward: cfg.reward };
  }

  function performRoutineActivity(member: Member & { activityLogs?: any }, actKey: keyof typeof ACTIVITY_RULES, successSpeech: string) {
    const rule = ACTIVITY_RULES[actKey];
    const status = getActivityStatus(member, actKey);
    if (status.isParent) {
      AudioEngine.playSuccess();
      triggerSpeechBubble(member, successSpeech, true);
      return;
    }
    if (status.disabled) {
      AudioEngine.playClick();
      triggerSpeechBubble(member, successSpeech, true);
      showToast(`ℹ️ Hoạt động "${rule.label}" đang tạm tắt cộng ⭐ bởi Phụ huynh (+0⭐).`);
      return;
    }
    if (!status.canEarn) {
      AudioEngine.playClick();
      if (status.capped) {
        triggerSpeechBubble(member, rule.doneMsg, false);
        showToast(`ℹ️ ${rule.doneMsg} (+0⭐)`);
      } else {
        const minsLeft = Math.max(1, Math.ceil(status.remainMs / 60000));
        triggerSpeechBubble(member, rule.fullMsg, false);
        showToast(`⏳ ${rule.fullMsg} (Chờ ${minsLeft} phút nữa để nhận ⭐)`);
      }
      return;
    }
    const petBonus = getMemberPetBonuses(member);
    const totalReward = status.reward + petBonus.starBonus;
    member.activityLogs[actKey].count += 1;
    member.activityLogs[actKey].lastAt = Date.now();
    member.points += totalReward;
    AudioEngine.playCoin();
    triggerSpeechBubble(member, successSpeech, true);
    showToast(
      petBonus.starBonus > 0
        ? `⭐ ${member.name} +${totalReward}⭐ (+${petBonus.starBonus}⭐ từ ${petBonus.pet?.nickname})!`
        : `⭐ ${member.name} +${status.reward}⭐ (${rule.label} lần ${member.activityLogs[actKey].count}/${status.maxPerDay} hôm nay)!`
    );
    updateHUD();
    saveGame();
  }

  /* ==================== 10. ARCADE ENGINE ==================== */
  const arcadeEngine = createArcadeEngine({
    getState: () => state,
    getCurrentUser,
    isParent,
    getFirebaseUrl: () => deviceConfig.firebaseUrl || '',
    getRoleEmoji,
    playClick: () => AudioEngine.playClick(),
    playCoin: () => AudioEngine.playCoin(),
    playSuccess: () => AudioEngine.playSuccess(),
    playError: () => AudioEngine.playError(),
    playTone: (f, t, d, v) => AudioEngine.playTone(f, t, d, v),
    showToast,
    updateHUD,
    saveGame,
    triggerSpeechBubble,
    closeModal,
    openModal,
    maxParentPoints: MAX_PARENT_POINTS,
    getMaxParentPoints
  });

  const soccerGame = createSoccerMiniGame({
    getState: () => state,
    getCurrentUser,
    getFirebaseUrl: () => deviceConfig.firebaseUrl || '',
    playClick: () => AudioEngine.playClick(),
    playCoin: () => AudioEngine.playCoin(),
    playSuccess: () => AudioEngine.playSuccess(),
    playError: () => AudioEngine.playError(),
    triggerConfetti,
    triggerSpeechBubble,
    showToast,
    openModal,
    closeModal
  });

  /* ==================== 11. PRIVATE ROOM & MODAL ACTIONS ==================== */
  function syncPrivateRoomToolbar() {
    const toolbar = document.getElementById('private-room-toolbar');
    if (!toolbar) return;
    const room = getActivePrivateRoom();
    if (!room) {
      toolbar.style.display = 'none';
      return;
    }
    const user = getCurrentUser();
    const isOwner = Boolean(room.ownerIds && room.ownerIds.includes(user.id));
    const topHud = document.getElementById('top-hud');
    if (topHud) {
      const rect = topHud.getBoundingClientRect();
      if (rect.bottom > 0) toolbar.style.top = `${Math.ceil(rect.bottom + 6)}px`;
    }
    toolbar.style.display = 'flex';
    const badge = document.getElementById('pr-room-badge');
    if (badge) badge.innerText = room.name.replace(/\s*\([^)]*\)/, '');

    const privacyBtn = document.getElementById('pr-privacy-btn') as HTMLButtonElement | null;
    const wallSelect = document.getElementById('pr-wall-select') as HTMLSelectElement | null;
    const decorManageBtn = document.getElementById('pr-decor-manage-btn') as HTMLButtonElement | null;
    if (isOwner) {
      const unlocked = room.isUnlocked;
      if (privacyBtn) {
        privacyBtn.style.display = 'inline-flex';
        privacyBtn.textContent = unlocked ? '🔓 Đang mở' : '🔒 Khóa';
        privacyBtn.style.background = unlocked ? '#D1FAE5' : '#FEE2E2';
        privacyBtn.style.borderColor = unlocked ? '#059669' : '#DC2626';
        privacyBtn.style.color = unlocked ? '#065F46' : '#991B1B';
      }
      if (wallSelect) {
        wallSelect.style.display = 'inline-block';
        wallSelect.value = user.roomWall || room.wall;
      }
      if (decorManageBtn) {
        const owner = (room.ownerIds && state.members.find((m) => m.id === room.ownerIds![0])) || user;
        const placedCount = Object.values(owner.roomSlots || {}).filter(Boolean).length;
        decorManageBtn.style.display = 'inline-flex';
        decorManageBtn.textContent = `📌 Slot (${placedCount}/${ROOM_DECOR_SLOTS.length})`;
      }
    } else {
      if (privacyBtn) privacyBtn.style.display = 'none';
      if (wallSelect) wallSelect.style.display = 'none';
      if (decorManageBtn) decorManageBtn.style.display = 'none';
    }
  }

  function openModal(id: string) {
    AudioEngine.init();
    AudioEngine.playClick();
    const el = document.getElementById(id);
    if (el) el.style.display = 'flex';
    if (id === 'tasks-modal') renderTasksModal();
    if (id === 'shop-modal') renderShop('decor');
    if (id === 'bag-modal') renderBagModal('decor');
    if (id === 'fashion-modal') renderFashionStore('set');
    if (id === 'salon-modal') renderSalonModal();
    if (id === 'custom-modal') renderCustomModal();
    if (id === 'donate-modal') renderDonateModal();
    if (id === 'house-modal') renderHouseModal();
    if (id === 'tv-modal') openTvModal();
    if (id === 'family-sync-modal') renderFamilySyncModal();
    if (id === 'english-center-modal') openEnglishCenterLobby();
    if (id === 'arcade-modal') {
      arcadeEngine.pullArcadeRoomFromFirebase();
      arcadeEngine.renderArcadeLobby();
    }
    if (id === 'invention-lab-modal') openInventionLabModal();
    if (id === 'soccer-modal') soccerGame.startMatch();
    if (id === 'pet-shop-modal') renderPetShopModal();
  }

  function closeModal(id: string) {
    AudioEngine.playClick();
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
    if (id === 'custom-modal') wardrobeOpenedRoomId = null;
    if (id === 'arcade-modal') arcadeEngine.stopArcadeLoop();
    if (id === 'soccer-modal') soccerGame.stopMatch();
  }

  function openReactModal(modal: ActiveReactModal) {
    AudioEngine.init();
    AudioEngine.playClick();
    if (window.__OPEN_B2KS_MODAL__) {
      window.__OPEN_B2KS_MODAL__(modal);
    }
  }

  function closeReactModal() {
    if (window.__OPEN_B2KS_MODAL__) {
      window.__OPEN_B2KS_MODAL__(null);
    }
  }

  function renderHouseModal() {
    const list = document.getElementById('family-members-list');
    if (!list) return;
    list.innerHTML = state.members
      .map((m) => {
        let locText = '🏘️ Đang ở ngoài Khu phố';
        if (m.scene === 'house') {
          const r = getRoomAtPosition(m.x, m.y);
          locText = r ? `🏠 ${r.name}` : '🪜 Cầu thang trong nhà';
        } else if (m.scene === 'private_room') {
          locText = '🛏️ Trong phòng riêng';
        }
        return `
          <div class="card-item" style="flex-direction:row; align-items:center;">
            <div style="font-size:26px;">${m.outfit || getRoleEmoji(m.role)}</div>
            <div>
              <div style="font-weight:700;">${escapeHtml(m.name)} <span class="tag">${m.role}</span></div>
              <div style="font-size:12px; color:#555;">${locText}</div>
              <div style="font-size:11px; color:#2980B9;">Phòng riêng: ${(getMemberPrivateRoom(m)?.isUnlocked ?? m.roomUnlocked) ? '🔓 Đang mở' : '🔒 Đang khóa'}</div>
            </div>
          </div>`;
      })
      .join('');
  }

  /* ==================== 12. TASKS + FAMILY QUEST RENDERING ==================== */
  function parseDeadlineValue(raw?: string | null): number | null {
    const clean = String(raw || '').trim();
    if (!clean) return null;
    const ms = new Date(clean).getTime();
    return Number.isFinite(ms) && ms > 0 ? ms : null;
  }

  function isTaskLateForSettlement(t: TaskItem): boolean {
    if (!t.deadline) return false;
    const checkTs = t.submittedAt || Date.now();
    return checkTs > t.deadline;
  }

  function formatDeadlineBadgeHtml(t: TaskItem): string {
    if (!t.deadline) return '';
    const now = Date.now();
    const isCompletedLate = t.status === 'completed' && ((t.submittedAt || t.completedAt || 0) > t.deadline);
    const isSubmittedLate = t.status === 'submitted' && ((t.submittedAt || now) > t.deadline);
    const isPendingOverdue = t.status === 'pending' && now > t.deadline;
    if (isCompletedLate || isSubmittedLate || isPendingOverdue) {
      return `<div style="margin-top:3px;"><span class="tag" style="background:#FEE2E2; border-color:#DC2626; color:#991B1B; font-size:10.5px;">⚠️ Quá hạn (${formatTimestamp(t.deadline)}) • Còn 1/3⭐ (${Math.floor(t.reward / 3)}⭐)</span></div>`;
    }
    return `<div style="margin-top:3px;"><span class="tag" style="background:#FEF3C7; border-color:#D97706; color:#92400E; font-size:10.5px;">⏰ Hạn chót: ${formatTimestamp(t.deadline)}</span></div>`;
  }

  function buildTaskCardHtml(t: TaskItem, user: Member, compact: boolean): string {
    const creator = state.members.find((m) => m.id === t.creatorId);
    if (!creator) return '';
    const lateApproveReward = isTaskLateForSettlement(t) ? Math.floor(t.reward / 3) : t.reward;

    if (t.type === 'family_quest') {
      const pIds = t.participantIds || [];
      const pMap = t.progressMap || {};
      const myDone = pMap[user.id] === 'done';
      const isParticipant = pIds.includes(user.id);
      const allDone = pIds.length > 0 && pIds.every((pid) => pMap[pid] === 'done');

      let badge = `<span class="tag" style="background:#EDE9FE; color:#5B21B6;">🤝 Đồng đội (${pIds.filter((id) => pMap[id] === 'done').length}/${pIds.length})</span>`;
      if (t.status === 'completed') {
        badge = `<span class="tag" style="background:#D4EDDA; color:#155724;">🎉 Xong Đồng Đội</span>`;
      } else if (allDone) {
        badge = `<span class="tag" style="background:#CCE5FF; color:#004085;">📩 Cả hai đã xong — Chờ duyệt</span>`;
      }

      let actions = '';
      if (t.status !== 'completed') {
        if (isParticipant && !myDone) {
          actions += `<button class="btn btn-sm btn-purple" onclick="submitFamilyQuestPart(${t.id})${compact ? '; renderSmartphoneScreen()' : ''}">🙋 Con Đã Xong Phần Mình</button>`;
        }
        if (isParent(user) && allDone) {
          actions += `<button class="btn btn-sm btn-primary" onclick="approveFamilyQuest(${t.id})${compact ? '; renderSmartphoneScreen()' : ''}">🎉 Duyệt (+${lateApproveReward}⭐/bé)</button>`;
        }
      }
      if (isParent(user)) {
        actions += `<button class="btn btn-sm btn-danger" onclick="deleteTask(${t.id})${compact ? '; renderSmartphoneScreen()' : ''}" title="Xóa">🗑️</button>`;
      }

      const memberStatusChips = pIds
        .map((pid) => {
          const km = state.members.find((x) => x.id === pid);
          const done = pMap[pid] === 'done';
          return `<span class="tag" style="background:${done ? '#D4EDDA' : '#FFF3CD'}; color:${done ? '#155724' : '#856404'}; margin-right:4px;">${escapeHtml(km?.name || pid)}: ${done ? '✅' : '⏳'}</span>`;
        })
        .join('');

      return `
        <div class="card-item" style="background:#FAF5FF; border-color:#7C3AED; ${compact ? 'padding:8px;' : ''}">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:6px;">
            <div>
              <span class="tag" style="background:#7C3AED; color:#FFF;">🤝 Nhiệm vụ Đồng đội</span>
              <b style="font-size:${compact ? '13px' : '14px'}; margin-left:4px;">${escapeHtml(t.title)}</b>
              <div style="font-size:${compact ? '11px' : '12px'}; color:#555; margin-top:3px;">
                Giao bởi: <b>${escapeHtml(creator.name)}</b> | Thưởng: <b>+${t.reward}⭐/bé</b>
              </div>
              ${formatDeadlineBadgeHtml(t)}
              <div style="margin-top:4px;">${memberStatusChips}</div>
            </div>
            ${badge}
          </div>
          <div style="display:flex; gap:6px; justify-content:flex-end; flex-wrap:wrap;">${actions}</div>
        </div>
      `;
    }

    const assignee = state.members.find((m) => m.id === t.assigneeId);
    if (!assignee) return '';

    let statusBadge = '';
    let actionButtons = '';

    if (t.status === 'pending') {
      statusBadge = `<span class="tag" style="background:#FFF3CD; color:#856404;">⏳ Đang làm</span>`;
      if (user.id === assignee.id) {
        actionButtons +=
          t.type === 'chore'
            ? `<button class="btn btn-sm btn-accent" onclick="submitChore(${t.id})${compact ? '; renderSmartphoneScreen()' : ''}">✅ Báo cáo xong</button>`
            : `<button class="btn btn-sm btn-purple" onclick="openSubmitHomeworkModal(${t.id})">📤 Nộp bài</button>`;
      }
    } else if (t.status === 'submitted') {
      statusBadge = `<span class="tag" style="background:#CCE5FF; color:#004085;">📩 Chờ duyệt</span>`;
      if (isParent(user)) {
        actionButtons +=
          t.type === 'chore'
            ? `<button class="btn btn-sm btn-primary" onclick="approveChore(${t.id})${compact ? '; renderSmartphoneScreen()' : ''}">👍 Duyệt (+${lateApproveReward}⭐)</button>`
            : `<button class="btn btn-sm btn-primary" onclick="openGradeHomeworkModal(${t.id})">📝 Chấm điểm</button>`;
      }
    } else if (t.status === 'completed') {
      statusBadge = `<span class="tag" style="background:#D4EDDA; color:#155724;">🎉 Xong ${t.grade !== null && t.grade !== undefined ? `(${t.grade}/10)` : ''}</span>`;
    }

    if (isParent(user)) {
      actionButtons += `<button class="btn btn-sm btn-danger" onclick="deleteTask(${t.id})${compact ? '; renderSmartphoneScreen()' : ''}" title="Xóa">🗑️</button>`;
    }

    const createdTime = formatTimestamp(t.createdAt || t.id);
    const completedTime = t.completedAt ? ` | ✅ Xong lúc: <b>${formatTimestamp(t.completedAt)}</b>` : '';

    return `
      <div class="card-item" style="${compact ? 'padding:8px;' : ''}">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:6px;">
          <div>
            <span class="tag">${t.type === 'chore' ? '🧹 Việc nhà' : '📚 Bài tập'}</span>
            <b style="font-size:${compact ? '13px' : '14px'}; margin-left:4px;">${escapeHtml(t.title)}</b>
            <div style="font-size:${compact ? '11px' : '12px'}; color:#555; margin-top:3px;">
              <b>${escapeHtml(creator.name)}</b> ➔ <b>${escapeHtml(assignee.name)}</b> | Thưởng: <b>${t.reward}⭐</b>
            </div>
            ${formatDeadlineBadgeHtml(t)}
            ${!compact ? `<div style="font-size:11px; color:#7F8C8D; margin-top:2px;">🕒 Tạo lúc: <b>${createdTime}</b>${completedTime}</div>` : ''}
          </div>
          ${statusBadge}
        </div>
        ${t.parentFile ? `<div style="font-size:11.5px;">📎 Đề bài: <b>${escapeHtml(t.parentFileName || '')}</b> <button class="btn btn-sm" style="padding:2px 6px; font-size:10px;" onclick="viewAttachment(${t.id}, 'parent')">Xem</button></div>` : ''}
        ${t.childFile ? `<div style="font-size:11.5px;">📄 Bài nộp: <b>${escapeHtml(t.childFileName || '')}</b> <button class="btn btn-sm" style="padding:2px 6px; font-size:10px;" onclick="viewAttachment(${t.id}, 'child')">Xem</button></div>` : ''}
        <div style="display:flex; gap:5px; justify-content:flex-end; flex-wrap:wrap;">${actionButtons}</div>
      </div>
    `;
  }

  function renderTasksModal() {
    const user = getCurrentUser();
    const creatorBox = document.getElementById('parent-task-creator');
    if (creatorBox) {
      if (isParent(user)) {
        creatorBox.style.display = 'block';
        const assigneeSel = document.getElementById('task-assignee') as HTMLSelectElement | null;
        if (assigneeSel) {
          const kids = state.members.filter((m) => !isParent(m));
          assigneeSel.innerHTML = kids.length > 0
            ? kids.map((kid) => `<option value="${kid.id}">${escapeHtml(kid.name)} (${kid.role})</option>`).join('')
            : '<option value="">-- Chưa có bé (thêm ở Phụ Huynh) --</option>';
        }
      } else {
        creatorBox.style.display = 'none';
      }
    }
    const list = document.getElementById('tasks-list');
    if (!list) return;
    if (state.tasks.length === 0) {
      list.innerHTML = '<p style="color:#666; text-align:center;">Chưa có nhiệm vụ nào.</p>';
      return;
    }
    list.innerHTML = state.tasks
      .slice()
      .reverse()
      .map((t) => buildTaskCardHtml(t, user, false))
      .join('');
  }

  function toggleHomeworkUpload() {
    const typeEl = document.getElementById('task-type') as HTMLSelectElement | null;
    const fileGrp = document.getElementById('parent-file-group');
    const assigneeGrp = document.getElementById('task-assignee-group');
    if (!typeEl) return;
    if (fileGrp) fileGrp.style.display = typeEl.value === 'homework' ? 'block' : 'none';
    if (assigneeGrp) assigneeGrp.style.display = typeEl.value === 'family_quest' ? 'none' : 'block';
  }

  function createTask() {
    const user = getCurrentUser();
    if (!isParent(user)) return;
    const type = ((document.getElementById('task-type') as HTMLSelectElement)?.value || 'chore') as TaskItem['type'];
    const assigneeId = (document.getElementById('task-assignee') as HTMLSelectElement)?.value || '';
    const title = (document.getElementById('task-title') as HTMLInputElement)?.value.trim() || '';
    const reward = parseInt((document.getElementById('task-reward') as HTMLInputElement)?.value || '0', 10) || 0;
    const deadlineInput = document.getElementById('task-deadline') as HTMLInputElement | null;
    const deadline = parseDeadlineValue(deadlineInput?.value);
    const fileInput = document.getElementById('task-parent-file') as HTMLInputElement | null;

    if (!title) return showToast('⚠️ Vui lòng nhập tên nhiệm vụ!');

    if (type === 'family_quest') {
      const kids = state.members.filter((m) => !isParent(m));
      const participantIds = kids.map((k) => k.id);
      const totalCost = reward * participantIds.length;
      if (participantIds.length < 2) {
        AudioEngine.playError();
        return showToast('⚠️ Cần ít nhất 2 bé để giao Nhiệm Vụ Đồng Đội!');
      }
      if (reward <= 0 || user.points < totalCost) {
        AudioEngine.playError();
        return showToast(`❌ Cần ${totalCost}⭐ ngân sách (${reward}⭐/bé)!`);
      }
      user.points -= totalCost;
      const progressMap: Record<string, 'pending' | 'done'> = {};
      participantIds.forEach((id) => {
        progressMap[id] = 'pending';
      });
      state.tasks.push({
        id: Date.now(),
        type: 'family_quest',
        title,
        creatorId: user.id,
        assigneeId: participantIds[0],
        participantIds,
        progressMap,
        reward,
        status: 'pending',
        createdAt: Date.now(),
        completedAt: null,
        deadline
      });
      state.tasksUpdatedAt = Date.now();
      syncSeenTasksBaseline();
      const titleInput = document.getElementById('task-title') as HTMLInputElement | null;
      if (titleInput) titleInput.value = '';
      if (deadlineInput) deadlineInput.value = '';
      AudioEngine.playSuccess();
      showToast(`🤝 Đã giao Nhiệm Vụ Đồng Đội (-${totalCost}⭐ ngân sách)!`);
      triggerSpeechBubble(user, `Nhiệm vụ đồng đội mới: ${title}! 🤝`, false);
      updateHUD();
      renderTasksModal();
      saveGame();
      return;
    }

    if (!assigneeId) {
      AudioEngine.playError();
      return showToast('⚠️ Gia đình chưa có thành viên con! Hãy vào Bảng Phụ Huynh để thêm con trước.');
    }
    if (reward <= 0 || user.points < reward) {
      AudioEngine.playError();
      return showToast(`❌ Không đủ điểm ngân sách! (Hiện có: ${user.points}⭐)`);
    }

    const finalize = (fileData: string | null, fileName: string) => {
      user.points -= reward;
      const now = Date.now();
      state.tasks.push({
        id: now, type, title, creatorId: user.id, assigneeId, reward,
        status: 'pending', createdAt: now, completedAt: null, deadline,
        parentFile: fileData, parentFileName: fileName,
        childFile: null, childFileName: '', childNote: '', grade: null
      });
      state.tasksUpdatedAt = now;
      syncSeenTasksBaseline();
      const titleInput = document.getElementById('task-title') as HTMLInputElement | null;
      if (titleInput) titleInput.value = '';
      if (deadlineInput) deadlineInput.value = '';
      if (fileInput) fileInput.value = '';
      AudioEngine.playSuccess();
      showToast(`✅ Đã giao nhiệm vụ (-${reward}⭐ ngân sách)`);
      triggerSpeechBubble(user, `Giao việc mới: ${title}!`, false);
      updateHUD();
      renderTasksModal();
      const phoneModal = document.getElementById('smartphone-modal');
      if (phoneModal && phoneModal.style.display === 'flex') renderSmartphoneScreen();
      saveGame();
    };

    if (type === 'homework' && fileInput && fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      const reader = new FileReader();
      reader.onload = (e) => finalize((e.target?.result as string) || null, file.name);
      reader.readAsDataURL(file);
    } else {
      finalize(null, '');
    }
  }

  function submitFamilyQuestPart(taskId: number) {
    const task = state.tasks.find((t) => t.id === taskId && t.type === 'family_quest');
    if (!task || task.status === 'completed') return;
    const user = getCurrentUser();
    if (!task.progressMap) task.progressMap = {};
    task.progressMap[user.id] = 'done';

    const pIds = task.participantIds || [];
    const allDone = pIds.length > 0 && pIds.every((id) => task.progressMap![id] === 'done');
    if (allDone) {
      task.status = 'submitted';
      task.submittedAt = Date.now();
    }
    state.tasksUpdatedAt = Date.now();

    logActivity({
      memberId: user.id,
      memberName: user.name,
      action: 'quest_part',
      detail: `Hoàn thành phần mình trong Nhiệm vụ Đồng đội "${task.title}"`,
      taskId: task.id
    });

    AudioEngine.playSuccess();
    triggerSpeechBubble(user, `Đã xong phần mình trong nhiệm vụ "${task.title}"! 🤝`, false);
    showToast(allDone ? '🎉 Các con đã hoàn thành! Chờ bố/mẹ duyệt thưởng đồng đội!' : '✅ Đã ghi nhận phần của con! Chờ đồng đội xong cùng nhé!');
    updateHUD();
    renderTasksModal();
    saveGame();
    checkAllDailyTasksCompleted(user.id);
  }

  function approveFamilyQuest(taskId: number) {
    const user = getCurrentUser();
    if (!isParent(user)) return;
    const task = state.tasks.find((t) => t.id === taskId && t.type === 'family_quest');
    if (!task || task.status === 'completed') return;
    const now = Date.now();
    const isLate = isTaskLateForSettlement(task);
    const baseReward = isLate ? Math.floor(task.reward / 3) : task.reward;
    task.status = 'completed';
    task.completedAt = now;
    state.tasksUpdatedAt = now;
    (task.participantIds || []).forEach((pid) => {
      const m = state.members.find((x) => x.id === pid);
      if (m) {
        ensureMemberProps(m);
        const pb = getMemberPetBonuses(m);
        m.points += baseReward + pb.starBonus;
        m.completedTaskCount = (m.completedTaskCount || 0) + 1;
        m.pointsUpdatedAt = now;
        touchMemberData(m, now);
        evaluateAndUnlockMemberBadges(m);
      }
    });
    AudioEngine.playCoin();
    triggerConfetti();
    showToast(
      isLate
        ? `⏰ Nhiệm vụ Đồng đội hoàn tất quá hạn! Mỗi bé nhận 1/3 điểm: +${baseReward}⭐ (+thưởng Thú cưng nếu có)!`
        : `🎉 Nhiệm vụ Đồng đội hoàn tất! Mỗi bé nhận +${baseReward}⭐ (+thưởng Thú cưng nếu có)!`
    );
    updateHUD();
    renderTasksModal();
    saveGame();
  }

  function submitChore(taskId: number) {
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;
    const now = Date.now();
    task.status = 'submitted';
    task.submittedAt = now;
    state.tasksUpdatedAt = now;
    const user = getCurrentUser();
    logActivity({
      memberId: user.id,
      memberName: user.name,
      action: 'task_done',
      detail: `Báo cáo hoàn thành việc nhà: "${task.title}"`,
      taskId: task.id
    });
    AudioEngine.playSuccess();
    triggerSpeechBubble(user, `Con đã làm xong: ${task.title}!`, false);
    showToast(task.deadline && now > task.deadline ? '📨 Đã báo cáo xong (quá hạn: còn 1/3⭐ khi duyệt)!' : '📨 Đã báo cáo hoàn thành cho Bố/Mẹ!');
    updateHUD();
    renderTasksModal();
    const phoneModal = document.getElementById('smartphone-modal');
    if (phoneModal && phoneModal.style.display === 'flex') renderSmartphoneScreen();
    saveGame();
  }

  function approveChore(taskId: number) {
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task || task.status === 'completed') return;
    const assignee = state.members.find((m) => m.id === task.assigneeId);
    const now = Date.now();
    const isLate = isTaskLateForSettlement(task);
    const baseReward = isLate ? Math.floor(task.reward / 3) : task.reward;
    task.status = 'completed';
    task.completedAt = now;
    state.tasksUpdatedAt = now;
    if (assignee) {
      ensureMemberProps(assignee);
      const pb = getMemberPetBonuses(assignee);
      const earned = baseReward + pb.starBonus;
      assignee.points += earned;
      assignee.completedTaskCount = (assignee.completedTaskCount || 0) + 1;
      assignee.pointsUpdatedAt = now;
      touchMemberData(assignee, now);
      AudioEngine.playCoin();
      showToast(
        isLate
          ? `⏰ Nộp quá hạn! ${assignee.name} nhận 1/3 thưởng: +${earned}⭐!`
          : pb.starBonus > 0
            ? `🎉 ${assignee.name} nhận +${earned}⭐ (gồm +${pb.starBonus}⭐ Thú cưng)!`
            : `🎉 ${assignee.name} nhận +${earned}⭐!`
      );
      checkAllDailyTasksCompleted(assignee.id);
      evaluateAndUnlockMemberBadges(assignee);
    }
    updateHUD();
    renderTasksModal();
    const phoneModal = document.getElementById('smartphone-modal');
    if (phoneModal && phoneModal.style.display === 'flex') renderSmartphoneScreen();
    saveGame();
  }

  function deleteTask(taskId: number) {
    const user = getCurrentUser();
    if (!isParent(user)) return;
    const idx = state.tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) return;
    const task = state.tasks[idx];
    const refund =
      task.type === 'family_quest'
        ? task.reward * Math.max(1, (task.participantIds || []).length)
        : task.reward;
    if (task.status !== 'completed') {
      const creator = state.members.find((m) => m.id === task.creatorId);
      if (creator) addParentPointsWithAllowanceCap(creator, refund);
    }
    state.tasks.splice(idx, 1);
    state.tasksUpdatedAt = Date.now();
    AudioEngine.playClick();
    showToast(task.status !== 'completed' ? `🗑️ Đã xóa nhiệm vụ & hoàn lại +${refund}⭐ ngân sách!` : '🗑️ Đã xóa nhiệm vụ khỏi danh sách!');
    updateHUD();
    renderTasksModal();
    saveGame();
  }

  /* ==================== 13. BAG (WITH SAFE INLINE DELETE) & SHOP ==================== */
  let currentBagTab = 'decor';

  function renderShop(tab: string) {
    const grid = document.getElementById('shop-items-grid');
    if (!grid) return;
    const user = getCurrentUser();
    grid.innerHTML = SHOP_CATALOG.filter((i) => i.category === tab)
      .map((item) => {
        const ownedCount = user.inventory.filter((id) => id === item.id).length;
        const canBuyMultiple = item.category === 'voucher' || item.category === 'tv_card' || item.category === 'decor';
        return `
          <div class="card-item">
            <div style="display:flex; gap:10px; align-items:center;">
              <div style="flex-shrink:0;">${renderItemIllustrationSVG(item.id, 52, findAnyCatalogItem)}</div>
              <div>
                <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
                  <b style="font-size:14px;">${item.name}</b>
                  ${ownedCount > 0 ? `<span class="tag" style="background:#D4EDDA; font-size:10.5px;">Trong túi: ${ownedCount}</span>` : ''}
                </div>
                <div style="font-size:12px; color:#555; margin-top:2px;">${item.desc}</div>
              </div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px;">
              <span class="points-pill">⭐ ${item.price}</span>
              ${ownedCount > 0 && !canBuyMultiple
                ? `<span class="tag" style="background:#D4EDDA;">Đã có trong túi</span>`
                : `<button class="btn btn-sm btn-accent" onclick="buySupermarketItem('${item.id}')">Mua bằng điểm</button>`}
            </div>
          </div>
        `;
      })
      .join('');
  }

  function buySupermarketItem(itemId: string) {
    const user = getCurrentUser();
    const item = SHOP_CATALOG.find((i) => i.id === itemId);
    if (!item || user.points < item.price) {
      AudioEngine.playError();
      return showToast(`❌ Bạn cần ${item ? item.price : 0}⭐ để mua vật phẩm này!`);
    }
    user.points -= item.price;
    if (item.category === 'voucher') user.vouchers.push(item.id);
    else user.inventory.push(item.id);
    user.memberUpdatedAt = Date.now();
    dirtyMemberIds.add(user.id);
    AudioEngine.playCoin();
    showToast(`🛍️ Đã mua ${item.name} và cất vào 🎒 Túi đồ!`);
    updateHUD();
    renderShop(item.category);
    saveGame();
  }

  function renderBagDeleteBtn(deleteKey: string, kind: string, targetId: string, indexOrEmpty = -1): string {
    if (pendingBagDeleteKey === deleteKey) {
      return `
        <div style="display:flex; gap:4px; align-items:center;">
          <button type="button" class="btn btn-sm btn-danger" onclick="confirmDeleteBagItem('${kind}', '${targetId}', ${indexOrEmpty})">✅ Xác nhận xóa</button>
          <button type="button" class="btn btn-sm" style="background:#64748B;" onclick="cancelDeleteBagItem()">Hủy</button>
        </div>
      `;
    }
    return `<button type="button" class="btn btn-sm btn-danger" onclick="requestDeleteBagItem('${deleteKey}')">🗑️ Xóa bỏ</button>`;
  }

  function renderBagModal(tab: string) {
    currentBagTab = tab || currentBagTab;
    const user = getCurrentUser();
    ensureMemberProps(user);
    const ownerEl = document.getElementById('bag-owner-name');
    if (ownerEl) ownerEl.innerText = user.name;
    const grid = document.getElementById('bag-items-grid');
    if (!grid) return;

    if (currentBagTab === 'voucher') {
      if (user.vouchers.length === 0) {
        grid.innerHTML = '<p style="color:#666; font-size:13px;">Chưa có phiếu quà tặng nào trong túi.</p>';
        return;
      }
      grid.innerHTML = user.vouchers
        .map((vId, idx) => {
          const item = findAnyCatalogItem(vId);
          if (!item) return '';
          return `
            <div class="card-item" style="background:#FFF8E7;">
              <div><b>${item.icon} ${escapeHtml(item.name)}</b> <span class="tag">Phiếu quà</span></div>
              <div style="font-size:12px;">${escapeHtml(item.desc || '')}</div>
              <div style="display:flex; gap:6px; justify-content:space-between; align-items:center; flex-wrap:wrap; margin-top:4px;">
                <button class="btn btn-sm btn-primary" onclick="useVoucher(${idx})">🎟️ Dùng phiếu ngay</button>
                ${renderBagDeleteBtn(`voucher:${idx}`, 'voucher', vId, idx)}
              </div>
            </div>
          `;
        })
        .join('');
      return;
    }

    if (currentBagTab === 'tv_card') {
      const cardCount = user.inventory.filter((id) => id === 'tv_30min').length;
      if (cardCount === 0) {
        grid.innerHTML = '<p style="color:#666; font-size:13px;">Chưa có Thẻ xem YouTube nào. Hãy mua tại <b>🏪 Siêu thị</b> nhé!</p>';
        return;
      }
      grid.innerHTML = `
        <div class="card-item" style="background:#FDEDEC;">
          <div style="display:flex; gap:10px; align-items:center;">
            <span style="font-size:32px;">📺</span>
            <div>
              <b>Thẻ Xem YouTube (+30 phút)</b>
              <div style="font-size:12px; color:#555;">Số lượng trong túi: <b>${cardCount} thẻ</b></div>
            </div>
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap; justify-content:space-between; margin-top:4px;">
            <button class="btn btn-sm btn-danger" onclick="useTvCardFromBag()">▶️ Kích hoạt +30 phút</button>
            ${renderBagDeleteBtn('inv:tv_30min', 'inventory', 'tv_30min', -1)}
          </div>
        </div>
      `;
      return;
    }

    if (currentBagTab === 'outfit') {
      const ownedFashion = user.inventory
        .map((id, invIndex) => ({ item: FASHION_CATALOG.find((f) => f.id === id), invIndex }))
        .filter((x) => Boolean(x.item));
      if (ownedFashion.length === 0) {
        grid.innerHTML = '<p style="color:#666; font-size:13px;">Chưa có trang phục nào. Hãy ghé <b>👗 Cửa Hàng Thời Trang</b> trên phố!</p>';
        return;
      }
      grid.innerHTML = ownedFashion
        .map(({ item, invIndex }) => `
          <div class="card-item">
            <div><b>${item!.icon} ${escapeHtml(item!.name)}</b></div>
            <div style="font-size:12px; color:#27AE60;">🚪 Đã cất trong Tủ quần áo phòng riêng</div>
            <div style="display:flex; justify-content:flex-end; margin-top:4px;">
              ${renderBagDeleteBtn(`outfit:${invIndex}:${item!.id}`, 'inventory', item!.id, invIndex)}
            </div>
          </div>
        `)
        .join('');
      return;
    }

    if (currentBagTab === 'lab') {
      const labItems = user.customLabItems || [];
      if (labItems.length === 0) {
        const brand = (state.familyName || 'Gia Đình').trim() || 'Gia Đình';
        grid.innerHTML = `<p style="color:#666; font-size:13px;">Chưa có vật phẩm sáng tạo nào. Hãy ghé <b>🧪 Phòng Thí Nghiệm ${escapeHtml(brand)}</b> trên phố để chế tạo bằng Tiếng Anh nhé!</p>`;
        return;
      }
      grid.innerHTML = labItems
        .map((item) => {
          const tier = item.labSpec?.sizeTier ? LAB_SIZE_TIERS[item.labSpec.sizeTier] : null;
          const sizeBadge = tier ? `<span class="tag" style="background:#E0F2FE; color:#0369A1; border-color:#38BDF8;">📏 ${tier.label}</span>` : '';
          return `
          <div class="card-item" style="background:#F0F9FF; border-color:#0284C7;">
            <div style="display:flex; gap:10px; align-items:center;">
              <div style="flex-shrink:0;">${renderItemIllustrationSVG(item.id, 52, findAnyCatalogItem)}</div>
              <div>
                <div style="display:flex; gap:4px; align-items:center; flex-wrap:wrap;">
                  <b style="color:#0369A1;">${escapeHtml(item.name)}</b>
                  ${sizeBadge}
                </div>
                <div style="font-size:11px; color:#0284C7; font-style:italic;">"${escapeHtml(item.prompt)}"</div>
                <div style="font-size:11.5px; color:#475569; margin-top:2px;">${escapeHtml(item.desc)}</div>
              </div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; flex-wrap:wrap;">
              <span style="font-size:11px; color:#0D9488;">✨ Có thể đặt lên ${ROOM_DECOR_SLOTS.length} Slot phòng riêng</span>
              ${renderBagDeleteBtn(`lab:${item.id}`, 'lab', item.id, -1)}
            </div>
          </div>
        `;
        })
        .join('');
      return;
    }

    const shopCounts = new Map<string, { item: any; count: number; firstIndex: number }>();
    user.inventory.forEach((id, invIndex) => {
      const cat = SHOP_CATALOG.find((i) => i.id === id && i.category === 'decor');
      if (!cat) return;
      const existing = shopCounts.get(id);
      if (existing) existing.count += 1;
      else shopCounts.set(id, { item: cat, count: 1, firstIndex: invIndex });
    });

    const ownedShopDecors = Array.from(shopCounts.values()).map(({ item, count, firstIndex }) => ({
      item,
      count,
      invIndex: firstIndex,
      kind: 'inventory' as const
    }));
    const ownedLabDecors = (user.customLabItems || []).map((item) => ({
      item,
      count: 1,
      invIndex: -1,
      kind: 'lab' as const
    }));
    const ownedDecors = [...ownedShopDecors, ...ownedLabDecors];

    if (ownedDecors.length === 0) {
      grid.innerHTML = '<p style="color:#666; font-size:13px;">Chưa có đồ trang trí nào trong túi đồ (các món đã đặt đang nằm trong phòng riêng — bạn có thể cất lại vào túi bất cứ lúc nào!).</p>';
      return;
    }
    grid.innerHTML = ownedDecors
      .map(({ item, count, invIndex, kind }) => `
        <div class="card-item">
          <div style="display:flex; gap:10px; align-items:center;">
            ${renderItemIllustrationSVG(item!.id, 48, findAnyCatalogItem)}
            <div>
              <div style="display:flex; gap:5px; align-items:center; flex-wrap:wrap;">
                <b>${escapeHtml(item!.name)}</b>
                ${count > 1 ? `<span class="tag" style="background:#DBEAFE; color:#1E40AF; border-color:#60A5FA;">x${count} trong túi</span>` : ''}
              </div>
              <div style="font-size:11.5px; color:#555;">${escapeHtml(item!.desc)}</div>
            </div>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; flex-wrap:wrap;">
            <span style="font-size:11px; color:#2980B9;">💡 Đặt tại ${ROOM_DECOR_SLOTS.length} Slot phòng riêng</span>
            ${renderBagDeleteBtn(`${kind}:${invIndex}:${item!.id}`, kind, item!.id, invIndex)}
          </div>
        </div>
      `)
      .join('');
  }

  function confirmDeleteBagItem(kind: string, targetId: string, index: number) {
    const user = getCurrentUser();
    ensureMemberProps(user);
    let removedName = 'Vật phẩm';

    if (kind === 'voucher') {
      const cat = findAnyCatalogItem(targetId);
      if (cat) removedName = cat.name;
      if (index >= 0 && user.vouchers[index] === targetId) user.vouchers.splice(index, 1);
      else {
        const idx = user.vouchers.indexOf(targetId);
        if (idx !== -1) user.vouchers.splice(idx, 1);
      }
    } else if (kind === 'lab') {
      const idx = (user.customLabItems || []).findIndex((x) => x.id === targetId);
      if (idx !== -1) {
        removedName = user.customLabItems![idx].name;
        user.customLabItems!.splice(idx, 1);
      }
    } else if (kind === 'inventory') {
      const cat = findAnyCatalogItem(targetId);
      if (cat) {
        removedName = cat.name;
        if (cat.icon && user.outfit === cat.icon) user.outfit = '';
      }
      if (index >= 0 && user.inventory[index] === targetId) user.inventory.splice(index, 1);
      else {
        const idx = user.inventory.indexOf(targetId);
        if (idx !== -1) user.inventory.splice(idx, 1);
      }
    }

    user.memberUpdatedAt = Date.now();
    dirtyMemberIds.add(user.id);
    pendingBagDeleteKey = null;
    AudioEngine.playClick();
    showToast(`🗑️ Đã xóa bỏ "${removedName}" khỏi túi đồ.`);
    updateHUD();
    renderBagModal(currentBagTab);
    saveGame();
  }

  /* ==================== 14. GLOBAL SUCCESS 6-9 ENGLISH QUIZ (UNIT PROGRESSION) ==================== */
  let engQuizSession: {
    questions: EnglishQuestion[];
    currentIndex: number;
    score: number;
    answered: boolean;
    grade: 6 | 7 | 8 | 9;
    unit: number;
    unitTitle: string;
  } = { questions: [], currentIndex: 0, score: 0, answered: false, grade: 6, unit: 1, unitTitle: 'Unit 1: My New School' };

  function getMemberGradeProgress(member: Member, grade: 6 | 7 | 8 | 9): EnglishGradeProgress {
    ensureMemberProps(member);
    if (!member.englishProgress![grade]) {
      member.englishProgress![grade] = { unit: 1, highScoreStreak: 0 };
    }
    return member.englishProgress![grade];
  }

  function renderEnglishGradeBar(activeGrade?: 6 | 7 | 8 | 9) {
    const bar = document.getElementById('eng-topic-bar');
    if (!bar) return;
    const user = getCurrentUser();
    const colors: Record<6 | 7 | 8 | 9, string> = {
      6: '#0EA5E9',
      7: '#10B981',
      8: '#8B5CF6',
      9: '#EA580C'
    };
    bar.innerHTML = ([6, 7, 8, 9] as const)
      .map((g) => {
        const prog = getMemberGradeProgress(user, g);
        const isCur = activeGrade === g;
        return `
          <button type="button" class="btn btn-sm"
            style="background:${isCur ? '#1E293B' : colors[g]}; color:#FFF; border:2px solid #2C3E50; flex:1; min-width:130px; flex-direction:column; gap:2px; padding:6px 8px;"
            onclick="startEnglishGradeQuiz(${g})">
            <span style="font-size:13px; font-weight:800;">📘 Tiếng Anh Lớp ${g}</span>
            <span style="font-size:10.5px; opacity:0.95;">Unit ${prog.unit}/12 • Chuỗi &gt;8đ: ${prog.highScoreStreak}/3</span>
          </button>
        `;
      })
      .join('');
  }

  function openEnglishCenterLobby() {
    renderEnglishGradeBar();
    const body = document.getElementById('eng-quiz-body');
    if (!body) return;
    const user = getCurrentUser();
    const rowsHtml = ([6, 7, 8, 9] as const)
      .map((g) => {
        const prog = getMemberGradeProgress(user, g);
        const title = getGlobalSuccessUnitTitle(g, prog.unit);
        return `
          <div style="background:#F8FAFC; border:1.5px solid #CBD5E1; border-radius:8px; padding:6px 8px; text-align:left;">
            <div style="font-weight:800; color:#0F766E; font-size:12px;">Lớp ${g}: ${escapeHtml(title)}</div>
            <div style="font-size:11px; color:#475569;">Tiến độ lên Unit: <b>${prog.highScoreStreak}/3 lần</b> đạt 9–10/10</div>
          </div>
        `;
      })
      .join('');
    body.innerHTML = `
      <div style="background:#FFF; border:2.5px dashed #16A085; border-radius:12px; padding:18px 16px; text-align:center;">
        <div style="font-size:36px; margin-bottom:6px;">📚✨</div>
        <div style="font-weight:700; font-size:15px; color:#117864; margin-bottom:6px;">
          Trung Tâm Tiếng Anh Global Success Lớp 6–9 (${globalEnglishBank.length} câu hỏi chuẩn Bộ GD&amp;ĐT)
        </div>
        <div style="font-size:12.5px; color:#555; max-width:500px; margin:0 auto 12px;">
          Mỗi lượt gồm <b>10 câu (5 Từ vựng + 5 Ngữ pháp)</b> của Unit hiện tại. Đạt <b>trên 8 điểm (9–10/10) 3 lần liên tiếp</b> để mở khóa Unit tiếp theo!
        </div>
        <div class="grid-2" style="gap:8px;">${rowsHtml}</div>
      </div>
    `;
  }

  function shuffleArrayCopy<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function startEnglishGradeQuiz(gradeOrTopic: 6 | 7 | 8 | 9 | string = 6) {
    AudioEngine.playClick();
    ensureStateArrays();
    const numericGrade = Number(gradeOrTopic);
    const grade = ([6, 7, 8, 9].includes(numericGrade) ? numericGrade : 6) as 6 | 7 | 8 | 9;
    const user = getCurrentUser();
    const prog = getMemberGradeProgress(user, grade);
    const unit = prog.unit;
    const unitTitle = getGlobalSuccessUnitTitle(grade, unit);

    const unitPool = globalEnglishBank.filter(
      (item) => (item.grade ?? 6) === grade && (item.unit ?? 1) === unit
    );
    const gradeFallback = globalEnglishBank.filter((item) => (item.grade ?? 6) === grade);
    const basePool = unitPool.length >= 10 ? unitPool : gradeFallback.length >= 10 ? gradeFallback : globalEnglishBank;

    const vocabPicked = shuffleArrayCopy(basePool.filter((q) => q.cat === 'vocab')).slice(0, 5);
    const grammarPicked = shuffleArrayCopy(basePool.filter((q) => q.cat === 'grammar')).slice(0, 5);
    const selectedIds = new Set([...vocabPicked, ...grammarPicked].map((x) => x.id));
    const combined = [...vocabPicked, ...grammarPicked];

    if (combined.length < 10) {
      const extraPool = shuffleArrayCopy(basePool.filter((q) => !selectedIds.has(q.id)));
      while (combined.length < 10 && extraPool.length > 0) {
        const nextQ = extraPool.shift()!;
        selectedIds.add(nextQ.id);
        combined.push(nextQ);
      }
    }

    engQuizSession = {
      questions: shuffleArrayCopy(combined).slice(0, 10),
      currentIndex: 0,
      score: 0,
      answered: false,
      grade,
      unit,
      unitTitle
    };
    renderEnglishGradeBar(grade);
    renderEnglishQuizQuestion();
  }

  function renderEnglishQuizQuestion() {
    const body = document.getElementById('eng-quiz-body');
    if (!body) return;

    if (engQuizSession.currentIndex >= engQuizSession.questions.length) {
      const total = engQuizSession.questions.length;
      const correct = engQuizSession.score;
      const user = getCurrentUser();
      ensureMemberProps(user);
      const petBonus = getMemberPetBonuses(user);
      const perCorrectCfg = getActivityConfig('english_quiz_per_correct');
      const highBonusCfg = getActivityConfig('english_quiz_high_bonus');
      let starsEarned = perCorrectCfg.enabled ? correct * perCorrectCfg.reward : 0;
      if (correct > 0 && starsEarned > 0) starsEarned += petBonus.starBonus;
      const gotHighBonus = correct >= 8 && highBonusCfg.enabled && highBonusCfg.reward > 0;
      if (gotHighBonus) starsEarned += highBonusCfg.reward;

      if (isParent(user)) {
        starsEarned = addParentPointsWithAllowanceCap(user, starsEarned);
      } else {
        user.points += starsEarned;
      }

      const prog = getMemberGradeProgress(user, engQuizSession.grade);
      let promotedToUnit: number | null = null;
      let masteredAllUnits = false;
      if (correct > 8) {
        prog.highScoreStreak = (prog.highScoreStreak || 0) + 1;
        if (prog.highScoreStreak >= 3) {
          if (prog.unit < 12) {
            prog.unit += 1;
            prog.highScoreStreak = 0;
            promotedToUnit = prog.unit;
          } else {
            prog.highScoreStreak = 3;
            masteredAllUnits = true;
          }
        }
      } else {
        prog.highScoreStreak = 0;
      }
      user.englishProgress![engQuizSession.grade] = { ...prog };
      user.memberUpdatedAt = Date.now();

      user.englishQuizHistory!.push({
        date: new Date().toDateString(),
        score: correct,
        total,
        stars: starsEarned,
        ts: Date.now(),
        grade: engQuizSession.grade,
        unit: engQuizSession.unit
      });
      logActivity({
        memberId: user.id,
        memberName: user.name,
        action: 'quiz_done',
        detail: `Lớp ${engQuizSession.grade} - Unit ${engQuizSession.unit}: ${correct}/${total} câu (+${starsEarned}⭐${promotedToUnit ? `, LÊN UNIT ${promotedToUnit}!` : ''})`
      });
      AudioEngine.playSuccess();
      if (correct >= 8 || promotedToUnit) triggerConfetti();
      const quizSample = engQuizSession.questions.map((q) => q.q).join(' ');
      evaluateAndUnlockMemberBadges(user, correct > 0 ? quizSample : undefined);
      renderEnglishGradeBar(engQuizSession.grade);
      updateHUD();
      saveGame();

      const nextUnitBanner = promotedToUnit
        ? `<div style="background:#DCFCE7; border:2px solid #16A34A; border-radius:10px; padding:10px; margin:10px 0; color:#14532D; font-weight:800;">
             🎉 XUẤT SẮC! Bạn đạt &gt;8 điểm 3 lần liên tiếp và đã mở khóa <b>Lớp ${engQuizSession.grade} • ${escapeHtml(getGlobalSuccessUnitTitle(engQuizSession.grade, promotedToUnit))}</b>!
           </div>`
        : masteredAllUnits
        ? `<div style="background:#FEF3C7; border:2px solid #F59E0B; border-radius:10px; padding:10px; margin:10px 0; color:#92400E; font-weight:800;">
             👑 TUYỆT VỜI! Bạn đã chinh phục trọn vẹn cả 12 Unit Tiếng Anh Lớp ${engQuizSession.grade}!
           </div>`
        : correct > 8
        ? `<div style="background:#E0F2FE; border:1.5px solid #0284C7; border-radius:10px; padding:8px; margin:8px 0; font-size:12.5px; color:#075985;">
             🔥 Chuỗi đạt &gt;8 điểm (9–10/10): <b>${prog.highScoreStreak}/3 lần</b> — cố gắng ${Math.max(0, 3 - prog.highScoreStreak)} lần nữa để lên Unit ${Math.min(12, prog.unit + 1)}!
           </div>`
        : `<div style="background:#FFF1F2; border:1.5px solid #FB7185; border-radius:10px; padding:8px; margin:8px 0; font-size:12px; color:#9F1239;">
             💡 Cần đạt <b>&gt;8 điểm (9–10/10)</b> đủ <b>3 lần liên tiếp</b> để lên Unit tiếp theo (Chuỗi hiện tại đã đặt lại: 0/3).
           </div>`;

      body.innerHTML = `
        <div style="text-align:center; background:#FEF9E7; border:2.5px solid #F39C12; border-radius:12px; padding:16px;">
          <div style="font-size:40px;">${promotedToUnit ? '🎓🎆' : '🏆'}</div>
          <h3 style="margin:6px 0; color:#2C3E50;">Hoàn Thành Lớp ${engQuizSession.grade} • ${escapeHtml(engQuizSession.unitTitle)}</h3>
          <p style="font-size:15px; margin:6px 0;">Kết quả của <b>${escapeHtml(user.name)}</b>: <b style="color:#27AE60; font-size:18px;">${correct} / ${total} câu đúng</b></p>
          <p style="font-size:14px; color:#D35400; font-weight:700;">⭐ Phần thưởng: +${starsEarned}⭐ ${gotHighBonus ? `(Bao gồm +${highBonusCfg.reward}⭐ thưởng xuất sắc!)` : ''}</p>
          ${nextUnitBanner}
          <button class="btn btn-primary" style="margin-top:8px;" onclick="startEnglishGradeQuiz(${engQuizSession.grade})">
            ${promotedToUnit ? `🚀 Bắt Đầu Unit ${promotedToUnit} Ngay` : '🔄 Làm Lượt Mới (5 Từ vựng + 5 Ngữ pháp)'}
          </button>
        </div>
      `;
      return;
    }

    const qObj = engQuizSession.questions[engQuizSession.currentIndex];
    const qNum = engQuizSession.currentIndex + 1;
    const letters = ['A', 'B', 'C', 'D'];
    const prog = getMemberGradeProgress(getCurrentUser(), engQuizSession.grade);
    const catBadge = qObj.cat === 'vocab' ? '🔤 Từ vựng' : '📘 Ngữ pháp';

    body.innerHTML = `
      <div style="background:#FFF; border:2.5px solid #2C3E50; border-radius:12px; padding:12px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:6px;">
          <div style="display:flex; gap:5px; align-items:center; flex-wrap:wrap;">
            <span class="tag" style="background:#CCFBF1; border-color:#0D9488; color:#115E59;">Lớp ${engQuizSession.grade} • ${escapeHtml(engQuizSession.unitTitle)}</span>
            <span class="tag" style="background:#FEF3C7; border-color:#D97706; color:#92400E;">Chuỗi &gt;8đ: ${prog.highScoreStreak}/3</span>
            <span class="tag" style="background:#D6EAF8;">Câu ${qNum}/${engQuizSession.questions.length} · ${catBadge}</span>
          </div>
          <div style="display:flex; gap:6px; align-items:center;">
            <button type="button" class="btn btn-sm btn-accent" onclick="speakCurrentEnglishQuiz()">🔊 Nghe</button>
            <span class="points-pill">Đúng: ${engQuizSession.score}</span>
          </div>
        </div>
        <div style="font-size:15.5px; font-weight:700; color:#2C3E50; margin-bottom:12px; line-height:1.45;">
          ${qNum}. ${escapeHtml(qObj.q)}
        </div>
        <div id="eng-options-list" style="display:flex; flex-direction:column; gap:8px;">
          ${qObj.opts
            .map(
              (opt, idx) => `
              <button type="button" class="btn" id="eng-opt-${idx}"
                style="background:#F8F9F9; color:#2C3E50; justify-content:flex-start; text-align:left; padding:9px 12px; font-size:13.5px; white-space:normal;"
                onclick="selectEnglishQuizAnswer(${idx})">
                <b>${letters[idx]}.</b>&nbsp;${escapeHtml(opt)}
              </button>`
            )
            .join('')}
        </div>
        <div id="eng-feedback-box" style="display:none; margin-top:12px; padding:10px; border-radius:8px; font-size:13px;"></div>
      </div>
    `;

    // Automatically speak the current question aloud!
    speakEnglish(qObj.q, 0.88);
  }

  /* ==================== 15. INVENTION LAB UI HANDLERS ==================== */
  let currentLabMode: 'prompt' | 'fusion' = 'prompt';

  function getAvailableFusionIngredients(user: Member) {
    ensureMemberProps(user);
    const items: any[] = [];

    user.inventory.forEach((id, invIndex) => {
      const catItem: any = SHOP_CATALOG.find((i) => i.id === id) || FASHION_CATALOG.find((f) => f.id === id);
      if (!catItem) return;
      if (catItem.icon && user.outfit === catItem.icon) return;
      if (
        catItem.sub === 'set' &&
        user.shirtColor === catItem.shirtColor &&
        user.shirtPattern === catItem.shirtPattern &&
        user.pantsColor === catItem.pantsColor &&
        user.pantsStyle === catItem.pantsStyle
      ) return;
      items.push({
        uid: `inv:${invIndex}:${id}`,
        source: 'inventory',
        invIndex,
        itemId: id,
        rawName: catItem.name,
        label: `${catItem.icon || '📦'} ${catItem.name}`
      });
    });

    (user.customLabItems || []).forEach((labItem, labIndex) => {
      if (!labItem || !labItem.id) return;
      items.push({
        uid: `lab:${labIndex}:${labItem.id}`,
        source: 'customLabItems',
        labIndex,
        itemId: labItem.id,
        rawName: labItem.name.replace(/^🧪\s*/, ''),
        label: labItem.name
      });
    });
    return items;
  }

  function refreshLabFusionIngredientsUI() {
    const user = getCurrentUser();
    const available = getAvailableFusionIngredients(user);
    const selA = document.getElementById('lab-item-a') as HTMLSelectElement | null;
    const selB = document.getElementById('lab-item-b') as HTMLSelectElement | null;
    const emptyMsg = document.getElementById('lab-fusion-empty-msg');
    const selectorsWrap = document.getElementById('lab-fusion-selectors');
    const fusionSubmitBtn = document.getElementById('lab-fusion-submit-btn') as HTMLButtonElement | null;
    if (!selA || !selB) return;

    if (available.length < 2) {
      if (emptyMsg) emptyMsg.style.display = 'block';
      if (selectorsWrap) selectorsWrap.style.display = 'none';
      if (fusionSubmitBtn) {
        fusionSubmitBtn.disabled = true;
        fusionSubmitBtn.style.opacity = '0.5';
      }
      selA.innerHTML = '';
      selB.innerHTML = '';
      return;
    }

    if (emptyMsg) emptyMsg.style.display = 'none';
    if (selectorsWrap) selectorsWrap.style.display = 'grid';
    if (fusionSubmitBtn) {
      fusionSubmitBtn.disabled = false;
      fusionSubmitBtn.style.opacity = '1';
    }
    const optsHtml = available.map((it) => `<option value="${it.uid}">${escapeHtml(it.label)}</option>`).join('');
    selA.innerHTML = optsHtml;
    selB.innerHTML = optsHtml;
    selA.selectedIndex = 0;
    selB.selectedIndex = 1;
  }

  function renderLabRecentList(highlightedItem: any = null) {
    const user = getCurrentUser();
    ensureMemberProps(user);
    const area = document.getElementById('lab-result-area');
    if (!area) return;

    let html = '';
    if (highlightedItem) {
      const hTier = highlightedItem.labSpec?.sizeTier ? LAB_SIZE_TIERS[highlightedItem.labSpec.sizeTier as LabSizeTier] : null;
      html += `
        <div style="background:linear-gradient(135deg,#042F2E 0%,#064E3B 50%,#0C4A6E 100%); border:3px solid #34D399; box-shadow:0 0 24px rgba(52,211,153,0.45); border-radius:16px; padding:16px; margin-bottom:14px; display:flex; gap:16px; align-items:center; flex-wrap:wrap;">
          <div style="background:radial-gradient(circle at 30% 30%, #FFFFFF 0%, #E0F2FE 65%, #BAE6FD 100%); border-radius:16px; padding:10px; border:3px solid #FACC15; flex-shrink:0; display:flex; align-items:center; justify-content:center; width:126px; height:126px;">
            ${renderItemIllustrationSVG(highlightedItem.id, 102, findAnyCatalogItem)}
          </div>
          <div style="flex:1; min-width:200px;">
            <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
              <span class="tag" style="background:linear-gradient(90deg,#10B981,#059669); color:#FFF; border-color:#FACC15; font-size:11.5px; padding:3px 9px;">✨ VẬT PHẨM MỚI RA LÒ!</span>
              <span class="tag" style="background:#0F172A; color:#FACC15; border-color:#FACC15; font-size:11px;">⭐ ${escapeHtml(highlightedItem.labSpec?.rarity || 'ĐỘC BẢN')}</span>
              ${hTier ? `<span class="tag" style="background:#0284C7; color:#FFF; border-color:#7DD3FC; font-size:11px;">📏 Cỡ: ${hTier.label}</span>` : ''}
            </div>
            <div style="font-size:18px; font-weight:700; color:#FFF; margin-top:6px;">${escapeHtml(highlightedItem.name)}</div>
            <div style="font-size:12.5px; color:#6EE7B7; font-weight:600; margin-top:3px;">🔬 ${escapeHtml(highlightedItem.desc)}</div>
          </div>
        </div>
      `;
    }

    const list = user.customLabItems || [];
    if (list.length > 0) {
      html += `<div style="font-size:13px; font-weight:700; color:#7DD3FC; margin-bottom:8px;">📚 Bộ sưu tập sáng chế của ${escapeHtml(user.name)} (${list.length} vật phẩm):</div>`;
      html += `<div class="grid-2">`;
      list.slice(0, 6).forEach((item) => {
        const tier = item.labSpec?.sizeTier ? LAB_SIZE_TIERS[item.labSpec.sizeTier] : null;
        html += `
          <div style="background:linear-gradient(145deg,#0F172A,#1E293B); border:2px solid #38BDF8; border-radius:12px; padding:10px; display:flex; gap:12px; align-items:center;">
            <div style="background:radial-gradient(circle, #FFFFFF 0%, #E0F2FE 100%); border-radius:11px; padding:5px; border:2px solid #7DD3FC; flex-shrink:0; width:68px; height:68px; display:flex; align-items:center; justify-content:center;">
              ${renderItemIllustrationSVG(item.id, 56, findAnyCatalogItem)}
            </div>
            <div style="min-width:0; flex:1;">
              <div style="font-weight:700; font-size:13.5px; color:#F8FAFC; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(item.name)}</div>
              <div style="font-size:11.5px; color:#38BDF8; font-style:italic; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:2px;">"${escapeHtml(item.prompt)}"</div>
              ${tier ? `<div style="font-size:10.5px; color:#7DD3FC; margin-top:2px;">📏 Kích thước: ${tier.label}</div>` : ''}
            </div>
          </div>
        `;
      });
      html += `</div>`;
    }
    area.innerHTML = html;
  }

  function openInventionLabModal() {
    ensureMemberProps(getCurrentUser());
    refreshLabFusionIngredientsUI();
    renderLabRecentList();
  }

  /* ==================== 16. FASHION, SALON, CUSTOMIZER, TV, SMARTPHONE, DINING PUZZLE ==================== */
  let tryOnFashionState: { setItem: any; shirtItem: any; pantsItem: any; accItem: any } = {
    setItem: null,
    shirtItem: null,
    pantsItem: null,
    accItem: null
  };
  let currentFashionTab = 'set';
  let salonDraft = { hairStyle: 'short', hairColor: '#2C3E50' };
  let draftChar = { hairStyle: 'short', hairColor: '#2C3E50', shirtColor: '#2980B9', shirtPattern: 'collar', pantsColor: '#34495E', pantsStyle: 'pants', outfit: '' };
  let tvTimerInterval: number | null = null;
  let currentTvVideoId = 'XqZsoesa55w';
  let activeFoodPuzzle: any = null;

  function drawFashionTryOnPreview() {
    const pCanvas = document.getElementById('fashion-tryon-canvas') as HTMLCanvasElement | null;
    if (!pCanvas) return;
    const pCtx = pCanvas.getContext('2d');
    if (!pCtx) return;
    pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
    pCtx.fillStyle = '#FFF5F7';
    pCtx.fillRect(0, 0, pCanvas.width, pCanvas.height);
    pCtx.fillStyle = '#FADBD8';
    pCtx.beginPath();
    pCtx.ellipse(52, 105, 35, 9, 0, 0, Math.PI * 2);
    pCtx.fill();

    const user = getCurrentUser();
    const setIt = tryOnFashionState.setItem;
    const shirtIt = tryOnFashionState.shirtItem;
    const pantsIt = tryOnFashionState.pantsItem;
    const accIt = tryOnFashionState.accItem;
    drawDetailedChibiOnContext(
      pCtx,
      {
        ...user,
        x: 52, y: 86, dir: 'down',
        shirtColor: shirtIt ? shirtIt.shirtColor : setIt ? setIt.shirtColor : user.shirtColor,
        shirtPattern: shirtIt ? shirtIt.shirtPattern : setIt ? setIt.shirtPattern : user.shirtPattern,
        pantsColor: pantsIt ? pantsIt.pantsColor : setIt ? setIt.pantsColor : user.pantsColor,
        pantsStyle: pantsIt ? pantsIt.pantsStyle : setIt ? setIt.pantsStyle : user.pantsStyle,
        outfit: accIt ? accIt.icon : user.outfit,
        speech: null
      },
      true,
      1.22
    );

    const statusEl = document.getElementById('fashion-tryon-status');
    const ctrlEl = document.getElementById('fashion-tryon-controls');
    const labels: string[] = [];
    if (setIt) labels.push(setIt.name);
    if (shirtIt) labels.push(shirtIt.name);
    if (pantsIt) labels.push(pantsIt.name);
    if (accIt) labels.push(accIt.name);
    if (statusEl && ctrlEl) {
      if (labels.length > 0) {
        statusEl.innerText = '✨ Đang mặc thử!';
        ctrlEl.innerHTML = `<span class="tag" style="background:#FFF; border-color:#E91E63; color:#C2185B;">Đang thử: ${escapeHtml(labels.join(' + '))}</span>
          <button type="button" class="btn btn-sm" style="background:#7F8C8D; padding:3px 7px; font-size:11px;" onclick="resetFashionTryOn(true)">↩️ Mặc lại đồ gốc</button>`;
      } else {
        statusEl.innerText = '🪞 Gương Soi Thời Trang';
        ctrlEl.innerHTML = `<span class="tag" style="background:#FFF;">Đang mặc trang phục hiện tại</span>`;
      }
    }
  }

  function renderFashionStore(subTab?: string) {
    currentFashionTab = subTab || currentFashionTab;
    ['set', 'shirt', 'pants', 'hat', 'acc'].forEach((t) => {
      const btn = document.getElementById(`fashion-tab-${t}`);
      if (btn) {
        btn.style.outline = t === currentFashionTab ? '3px solid #2C3E50' : 'none';
        btn.style.transform = t === currentFashionTab ? 'scale(1.04)' : 'none';
        btn.style.opacity = t === currentFashionTab ? '1' : '0.82';
      }
    });
    const grid = document.getElementById('fashion-items-grid');
    if (!grid) return;
    const user = getCurrentUser();
    grid.innerHTML = FASHION_CATALOG.filter((i) => i.sub === currentFashionTab)
      .map((item: any) => {
        const owned = user.inventory.includes(item.id);
        const isTrying =
          (tryOnFashionState.setItem && tryOnFashionState.setItem.id === item.id) ||
          (tryOnFashionState.shirtItem && tryOnFashionState.shirtItem.id === item.id) ||
          (tryOnFashionState.pantsItem && tryOnFashionState.pantsItem.id === item.id) ||
          (tryOnFashionState.accItem && tryOnFashionState.accItem.id === item.id);
        return `
          <div class="card-item" style="${isTrying ? 'border-color:#E91E63; background:#FFF8FA;' : ''}">
            <div style="display:flex; gap:10px; align-items:flex-start;">
              ${renderFashionItemPreviewMini(item)}
              <div style="flex:1; min-width:0;">
                <div style="font-weight:700; font-size:13.5px; color:#2C3E50;">${item.icon} ${item.name}</div>
                <div style="font-size:11.5px; color:#555; margin-top:3px; line-height:1.35;">${item.desc}</div>
              </div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px; gap:6px; flex-wrap:wrap;">
              <span class="points-pill">⭐ ${item.price}</span>
              <div style="display:flex; gap:5px; align-items:center;">
                <button type="button" class="btn btn-sm ${isTrying ? 'btn-purple' : 'btn-accent'}" onclick="tryOnFashionItem('${item.id}')">${isTrying ? '✨ Đang thử' : '👀 Try on'}</button>
                ${owned ? `<span class="tag" style="background:#D4EDDA;">🚪 Đã có</span>` : `<button type="button" class="btn btn-sm btn-primary" onclick="buyFashionItem('${item.id}')">Đổi điểm</button>`}
              </div>
            </div>
          </div>
        `;
      })
      .join('');
    drawFashionTryOnPreview();
  }

  function getSalonCost(): number {
    const user = getCurrentUser();
    let cost = 0;
    if (salonDraft.hairStyle !== (user.hairStyle || 'short')) cost += 15;
    if ((salonDraft.hairColor || '#2C3E50').toLowerCase() !== (user.hairColor || '#2C3E50').toLowerCase()) cost += 10;
    return cost;
  }

  function updateSalonUI() {
    const hairGrid = document.getElementById('salon-hair-grid');
    const colGrid = document.getElementById('salon-haircolor-grid');
    if (hairGrid) {
      hairGrid.innerHTML = HAIR_STYLES_VISUAL.map(
        (h) => `<div class="visual-option-card ${salonDraft.hairStyle === h.id ? 'selected' : ''}" onclick="selectSalonHair('${h.id}')">${renderHairIconSVG(h.id, salonDraft.hairColor)}<span>${h.label}</span></div>`
      ).join('');
    }
    if (colGrid) {
      colGrid.innerHTML = HAIR_COLORS.map(
        (c) => `<div class="color-swatch ${(salonDraft.hairColor || '#2C3E50').toLowerCase() === String(c || '').toLowerCase() ? 'selected' : ''}" style="background:${c};" onclick="selectSalonColor('${c}')"></div>`
      ).join('');
    }
    const costPill = document.getElementById('salon-cost-pill');
    if (costPill) costPill.innerText = `${getSalonCost()}⭐`;

    const pCanvas = document.getElementById('salon-preview-canvas') as HTMLCanvasElement | null;
    if (pCanvas) {
      const pCtx = pCanvas.getContext('2d');
      if (pCtx) {
        pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
        pCtx.fillStyle = '#F5EEF8';
        pCtx.fillRect(0, 0, pCanvas.width, pCanvas.height);
        drawDetailedChibiOnContext(pCtx, { ...getCurrentUser(), x: 50, y: 82, dir: 'down', hairStyle: salonDraft.hairStyle, hairColor: salonDraft.hairColor, speech: null }, true, 1.18);
      }
    }
  }

  function renderSalonModal() {
    const user = getCurrentUser();
    salonDraft = { hairStyle: user.hairStyle || 'short', hairColor: user.hairColor || '#2C3E50' };
    updateSalonUI();
  }

  function renderVisualCharacterPickers() {
    const user = getCurrentUser();
    const setGrid = document.getElementById('visual-fashion-set-grid');
    if (setGrid) {
      const ownedSets = user.inventory.map((id) => FASHION_CATALOG.find((f) => f.id === id && f.sub === 'set')).filter(Boolean);
      setGrid.innerHTML =
        ownedSets.length === 0
          ? `<div style="grid-column:1/-1; font-size:12px; color:#666; padding:6px; background:#F8F9F9; border-radius:8px;">Chưa mua Set trang phục nào. Hãy ghé <b>👗 Cửa Hàng Thời Trang</b> trên phố!</div>`
          : ownedSets
              .map((st: any) => {
                const isApplied =
                  draftChar.shirtColor === st.shirtColor &&
                  draftChar.shirtPattern === st.shirtPattern &&
                  draftChar.pantsColor === st.pantsColor &&
                  draftChar.pantsStyle === st.pantsStyle;
                return `<div class="visual-option-card ${isApplied ? 'selected' : ''}" onclick="applyFashionSet('${st.id}')"><span style="font-size:24px;">${st.icon}</span><span>${st.name}</span></div>`;
              })
              .join('');
    }
    const shirtGrid = document.getElementById('visual-shirt-grid');
    if (shirtGrid) {
      const ownedShirts = user.inventory
        .map((id) => FASHION_CATALOG.find((f: any) => f.id === id && f.sub === 'shirt'))
        .filter(Boolean)
        .map((f: any) => ({ id: f.id, label: `👗 ${f.name.split(' ').slice(0, 3).join(' ')}`, color: f.shirtColor, pattern: f.shirtPattern }));
      const allShirts = [...SHIRT_VISUAL_OPTIONS, ...ownedShirts];
      shirtGrid.innerHTML = allShirts.map(
        (s) => `<div class="visual-option-card ${(draftChar.shirtColor || '#2980B9').toLowerCase() === String(s.color || '').toLowerCase() && draftChar.shirtPattern === s.pattern ? 'selected' : ''}" onclick="selectDraftShirt('${s.color}', '${s.pattern}')">${renderShirtIconSVG(s)}<span>${escapeHtml(s.label)}</span></div>`
      ).join('');
    }
    const pantsGrid = document.getElementById('visual-pants-grid');
    if (pantsGrid) {
      const ownedPants = user.inventory
        .map((id) => FASHION_CATALOG.find((f: any) => f.id === id && f.sub === 'pants'))
        .filter(Boolean)
        .map((f: any) => ({ id: f.id, label: `👗 ${f.name.split(' ').slice(0, 3).join(' ')}`, color: f.pantsColor, style: f.pantsStyle }));
      const allPants = [...PANTS_VISUAL_OPTIONS, ...ownedPants];
      pantsGrid.innerHTML = allPants.map(
        (p) => `<div class="visual-option-card ${(draftChar.pantsColor || '#34495E').toLowerCase() === String(p.color || '').toLowerCase() && draftChar.pantsStyle === p.style ? 'selected' : ''}" onclick="selectDraftPants('${p.color}', '${p.style}')">${renderPantsIconSVG(p)}<span>${escapeHtml(p.label)}</span></div>`
      ).join('');
    }
    const outfitGrid = document.getElementById('visual-outfit-grid');
    if (outfitGrid) {
      const hatAcc = user.inventory
        .map((id) => FASHION_CATALOG.find((i) => i.id === id && (i.sub === 'hat' || i.sub === 'acc')))
        .filter(Boolean);
      outfitGrid.innerHTML =
        `<div class="visual-option-card ${draftChar.outfit === '' ? 'selected' : ''}" style="padding:5px 10px;" onclick="selectDraftOutfit('')"><span style="font-size:18px;">🚫</span><span>Không đeo</span></div>` +
        hatAcc
          .map(
            (item: any) => `<div class="visual-option-card ${draftChar.outfit === item.icon ? 'selected' : ''}" style="padding:5px 10px;" onclick="selectDraftOutfit('${item.icon}')"><span style="font-size:18px;">${item.icon}</span><span>${item.name.split(' ').slice(0, 2).join(' ')}</span></div>`
          )
          .join('');
    }
    drawCharPreview();
  }

  function drawCharPreview() {
    const pCanvas = document.getElementById('char-preview-canvas') as HTMLCanvasElement | null;
    if (!pCanvas) return;
    const pCtx = pCanvas.getContext('2d');
    if (!pCtx) return;
    pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
    pCtx.fillStyle = '#D6EAF8';
    pCtx.fillRect(0, 0, pCanvas.width, pCanvas.height);
    pCtx.fillStyle = '#AED6F1';
    pCtx.beginPath();
    pCtx.ellipse(55, 108, 36, 10, 0, 0, Math.PI * 2);
    pCtx.fill();
    const nameInput = document.getElementById('custom-char-name') as HTMLInputElement | null;
    const curU = getCurrentUser();
    drawDetailedChibiOnContext(
      pCtx,
      {
        id: curU.id,
        role: curU.role,
        x: 55, y: 88, dir: 'down',
        name: nameInput?.value.trim() || curU.name,
        ...draftChar,
        speech: null
      },
      true,
      1.25
    );
  }

  function renderCustomModal() {
    const user = getCurrentUser();
    const myRoom = getMemberPrivateRoom(user);
    const inOwnPrivateRoom = myRoom && user.scene === 'private_room' && (user.privateRoomId || activePrivateRoomId) === myRoom.id;
    const canUseWardrobe =
      isMemberAtOwnWardrobe(user) ||
      Boolean(myRoom && wardrobeOpenedRoomId === myRoom.id && (inOwnPrivateRoom || (user.scene === 'house' && getRoomAtPosition(user.x, user.y)?.id === myRoom.id)));

    const lockedBanner = document.getElementById('wardrobe-locked-banner');
    const controlsWrap = document.getElementById('wardrobe-controls-wrapper');
    if (lockedBanner) lockedBanner.style.display = canUseWardrobe ? 'none' : 'block';
    if (controlsWrap) controlsWrap.style.display = canUseWardrobe ? 'block' : 'none';

    const nameEl = document.getElementById('custom-char-name') as HTMLInputElement | null;
    if (nameEl) nameEl.value = user.name;
    draftChar = {
      hairStyle: user.hairStyle || 'short',
      hairColor: user.hairColor || '#2C3E50',
      shirtColor: user.shirtColor || '#2980B9',
      shirtPattern: user.shirtPattern || 'collar',
      pantsColor: user.pantsColor || '#34495E',
      pantsStyle: user.pantsStyle || 'pants',
      outfit: user.outfit || ''
    };
    renderVisualCharacterPickers();

    const privCheck = document.getElementById('room-privacy-toggle') as HTMLInputElement | null;
    const wallSel = document.getElementById('room-wall-color') as HTMLSelectElement | null;
    if (privCheck) privCheck.checked = myRoom ? myRoom.isUnlocked : !!user.roomUnlocked;
    if (wallSel) wallSel.value = user.roomWall || (myRoom && myRoom.wall) || '#FADBD8';

    const decorInv = document.getElementById('room-decor-inventory');
    if (decorInv) {
      ensureMemberProps(user);
      const bagCounts = new Map<string, { item: any; count: number }>();
      user.inventory.forEach((id) => {
        const cat = SHOP_CATALOG.find((i) => i.id === id && i.category === 'decor');
        if (!cat) return;
        const prev = bagCounts.get(id);
        if (prev) prev.count += 1;
        else bagCounts.set(id, { item: cat, count: 1 });
      });
      (user.customLabItems || []).forEach((lab) => {
        if (!lab) return;
        bagCounts.set(lab.id, { item: lab, count: 1 });
      });
      const bagDecors = Array.from(bagCounts.values());

      const slotEntries = Object.entries(user.roomSlots || {}).filter(([, id]) => Boolean(id));
      const legacyEntries = user.roomDecor || [];

      let html = '';
      if (bagDecors.length === 0) {
        html += '<p style="font-size:12px; color:#666; grid-column:1/-1;">Túi đồ chưa có vật phẩm trang trí. Hãy mua tại <b>🏪 Siêu thị</b> hoặc chế tạo ở <b>🧪 Phòng Thí Nghiệm</b>!</p>';
      } else {
        html += bagDecors
          .map(
            ({ item, count }) => `
              <div class="card-item" style="flex-direction:row; align-items:center; justify-content:space-between; gap:8px;">
                <div style="display:flex; align-items:center; gap:8px; min-width:0;">
                  <div style="flex-shrink:0;">${renderItemIllustrationSVG(item.id, 36, findAnyCatalogItem)}</div>
                  <div style="min-width:0;">
                    <div style="font-weight:700; font-size:12.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(item.name)}${count > 1 ? ` <span class="tag" style="font-size:10px;">x${count}</span>` : ''}</div>
                  </div>
                </div>
                <button class="btn btn-sm btn-accent" style="flex-shrink:0;" onclick="placeDecorInRoom('${item.id}')">Đặt tại chỗ đứng</button>
              </div>
            `
          )
          .join('');
      }

      if (slotEntries.length > 0 || legacyEntries.length > 0) {
        html += `<div style="grid-column:1/-1; margin-top:8px; padding-top:8px; border-top:2px dashed #CBD5E1; font-weight:700; font-size:12.5px; color:#0F766E;">🎒 Đồ đang đặt trong phòng (${slotEntries.length + legacyEntries.length}) — Bấm để cất lại vào túi:</div>`;
        slotEntries.forEach(([slotId, placedId]) => {
          const cat = findAnyCatalogItem(placedId);
          const slotDef = ROOM_DECOR_SLOTS.find((s) => s.id === slotId);
          html += `
            <div class="card-item" style="flex-direction:row; align-items:center; justify-content:space-between; gap:8px; background:#F0FDFA; border-color:#0D9488;">
              <div style="display:flex; align-items:center; gap:8px; min-width:0;">
                <div style="flex-shrink:0;">${renderItemIllustrationSVG(placedId, 34, findAnyCatalogItem)}</div>
                <div style="min-width:0;">
                  <div style="font-weight:700; font-size:12px;">${escapeHtml(cat?.name || placedId)}</div>
                  <div style="font-size:10.5px; color:#0F766E;">📌 ${escapeHtml(slotDef?.label || slotId)}</div>
                </div>
              </div>
              <button class="btn btn-sm btn-danger" style="flex-shrink:0;" onclick="pickupDecorFromRoomSlot('${slotId}')">🎒 Cất vào túi</button>
            </div>
          `;
        });
        legacyEntries.forEach((d, idx) => {
          const cat = findAnyCatalogItem(d.id);
          html += `
            <div class="card-item" style="flex-direction:row; align-items:center; justify-content:space-between; gap:8px; background:#FFFBEB; border-color:#D97706;">
              <div style="display:flex; align-items:center; gap:8px; min-width:0;">
                <div style="flex-shrink:0;">${renderItemIllustrationSVG(d.id, 34, findAnyCatalogItem)}</div>
                <div style="min-width:0;">
                  <div style="font-weight:700; font-size:12px;">${escapeHtml(cat?.name || d.id)}</div>
                  <div style="font-size:10.5px; color:#B45309;">📍 Đặt tự do (${Math.round(d.x)}, ${Math.round(d.y)})</div>
                </div>
              </div>
              <button class="btn btn-sm btn-danger" style="flex-shrink:0;" onclick="pickupLegacyRoomDecor(${idx})">🎒 Cất vào túi</button>
            </div>
          `;
        });
      }
      decorInv.innerHTML = html;
    }

    const lockH = document.getElementById('house-builder-locked');
    const ctrlH = document.getElementById('house-builder-controls');
    const plotSel = document.getElementById('house-plot-select') as HTMLSelectElement | null;
    const styleSel = document.getElementById('house-style-select') as HTMLSelectElement | null;
    if (isParent(user)) {
      if (lockH) lockH.style.display = 'none';
      if (ctrlH) ctrlH.style.display = 'block';
      if (plotSel) plotSel.value = String(state.house.plotIndex);
      if (styleSel) styleSel.value = state.house.style;
    } else {
      if (lockH) lockH.style.display = 'block';
      if (ctrlH) ctrlH.style.display = 'none';
    }
  }

  function renderDonateModal() {
    const user = getCurrentUser();
    const availEl = document.getElementById('donate-avail');
    if (availEl) availEl.innerText = String(user.points);
    const sel = document.getElementById('donate-recipient') as HTMLSelectElement | null;
    if (sel) {
      sel.innerHTML = state.members
        .filter((m) => m.id !== user.id)
        .map((m) => `<option value="${m.id}">${escapeHtml(m.name)} (${m.role}) - Có ${m.points}⭐</option>`)
        .join('');
    }
  }

  function renderFamilySyncModal() {
    const u = getCurrentUser();
    const lbl = document.getElementById('sync-cur-member-label');
    if (lbl) lbl.textContent = `${u.name} (${u.role})`;
    const pinLbl = document.getElementById('current-pin-label');
    if (pinLbl) pinLbl.textContent = isParent(u) ? `(Đang đặt: ${state.parentPin || '1234'})` : '(Đã ẩn)';
    const fbInput = document.getElementById('firebase-url-input') as HTMLInputElement | null;
    if (fbInput) fbInput.value = deviceConfig.firebaseUrl || '';
    const btnLock = document.getElementById('btn-toggle-device-lock');
    if (btnLock) {
      if (deviceConfig.isLockedToMember) {
        btnLock.textContent = `🔓 Tắt Khóa Máy (Đang khóa cho ${u.name})`;
        btnLock.className = 'btn btn-accent';
      } else {
        btnLock.textContent = `🔒 Bật Khóa Máy Cố Định Cho ${u.name}`;
        btnLock.className = 'btn btn-danger';
      }
    }
    const statusEl = document.getElementById('firebase-status-text');
    if (statusEl) {
      statusEl.textContent = deviceConfig.firebaseUrl
        ? '🟢 Đang kết nối Firebase: Tự động đồng bộ các máy mỗi 2.5 giây'
        : '⚪ Chế độ Offline: Dữ liệu đang lưu trên máy này';
    }
  }

  function getRemainingTvSeconds(member: Member): number {
    ensureMemberProps(member);
    if (isParent(member)) return Infinity;
    return Math.max(0, 1800 + (member.tvBonusSecondsToday || 0) - (member.tvSecondsUsedToday || 0));
  }

  function updateTvStatusUI() {
    const user = getCurrentUser();
    const rem = getRemainingTvSeconds(user);
    const timeEl = document.getElementById('tv-time-remaining');
    const actionEl = document.getElementById('tv-card-action');
    if (!timeEl || !actionEl) return;
    if (isParent(user)) {
      timeEl.innerHTML = `👑 Chế độ Bố/Mẹ: <b>Không giới hạn thời gian</b>`;
      actionEl.innerHTML = '';
    } else {
      const m = Math.floor(rem / 60);
      const s = rem % 60;
      const fmt = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      timeEl.innerHTML = `⏳ Thời gian xem YouTube còn lại hôm nay: <b style="color:${rem <= 120 ? '#E74C3C' : '#27AE60'};">${fmt}</b>`;
      const cardCount = user.inventory.filter((id) => id === 'tv_30min').length;
      actionEl.innerHTML =
        cardCount > 0
          ? `<button class="btn btn-sm btn-accent" onclick="useTvCardFromBag()">🎟️ Dùng Thẻ +30p (Có ${cardCount})</button>`
          : `<span class="tag">Hết thẻ +30p (Mua tại Siêu thị)</span>`;
    }
  }

  function openTvModal() {
    const user = getCurrentUser();
    ensureMemberProps(user);
    updateTvStatusUI();
    const rem = getRemainingTvSeconds(user);
    const iframe = document.getElementById('youtube-iframe') as HTMLIFrameElement | null;
    if (iframe) iframe.src = rem > 0 ? `https://www.youtube.com/embed/${currentTvVideoId}?autoplay=1` : '';
    if (tvTimerInterval) clearInterval(tvTimerInterval);
    tvTimerInterval = window.setInterval(() => {
      const tvModal = document.getElementById('tv-modal');
      if (!tvModal || tvModal.style.display !== 'flex') {
        if (tvTimerInterval) clearInterval(tvTimerInterval);
        return;
      }
      const cur = getCurrentUser();
      if (!isParent(cur)) {
        if (getRemainingTvSeconds(cur) > 0) {
          cur.tvSecondsUsedToday = (cur.tvSecondsUsedToday || 0) + 1;
          saveGame();
        }
        if (getRemainingTvSeconds(cur) <= 0 && iframe) {
          iframe.src = '';
          showToast('⏰ Đã hết 30 phút xem YouTube hôm nay! Hãy dùng thẻ xem YouTube nếu có.');
        }
      }
      updateTvStatusUI();
    }, 1000);
  }

  function getUnreadSummaryByChannel(me: Member) {
    const cutoff = Date.now() - MSG_RETENTION_MS;
    const channelUnreadCount: Record<string, number> = { family_group: 0 };
    const channelSenders: Record<string, string[]> = { family_group: [] };

    (state.familyMessages as any[]).forEach((msg) => {
      if ((msg.ts || 0) < cutoff || msg.senderId === me.id) return;
      const isForMe = msg.recipientId === 'family_group' || msg.recipientId === me.id;
      if (!isForMe) return;
      const readBy = Array.isArray(msg.readBy) ? msg.readBy : [];
      if (readBy.includes(me.id)) return;
      const chKey = msg.recipientId === 'family_group' ? 'family_group' : msg.senderId;
      channelUnreadCount[chKey] = (channelUnreadCount[chKey] || 0) + 1;
      const sObj = state.members.find((x) => x.id === msg.senderId);
      const sName = sObj ? sObj.name : msg.senderName || 'Gia đình';
      if (!channelSenders[chKey]) channelSenders[chKey] = [];
      if (!channelSenders[chKey].includes(sName)) channelSenders[chKey].push(sName);
    });

    const allUnreadSenders: string[] = [];
    Object.values(channelSenders).forEach((names) => {
      names.forEach((n) => {
        if (!allUnreadSenders.includes(n)) allUnreadSenders.push(n);
      });
    });

    return { channelUnreadCount, channelSenders, allUnreadSenders };
  }

  function renderSmartphoneScreen() {
    const body = document.getElementById('phone-screen-body');
    if (!body) return;
    const me = getCurrentUser();
    const lighting = getRealTimeLighting();
    const locText = getMemberLocationText(me);
    const unreadTotal = getUnreadMessageCount(me);
    const unreadSummary = getUnreadSummaryByChannel(me);
    const pendingTasks = getPendingTasksCountForMember(me);
    const statusTime = document.getElementById('phone-status-time');
    if (statusTime) statusTime.textContent = lighting.label;

    const brand = (state.familyName || 'B2KS').trim() || 'B2KS';
    if (smartphoneCurrentView === 'home') {
      const senderHint =
        unreadSummary.allUnreadSenders.length > 0
          ? `<div style="font-size:10.5px; color:#DC2626; font-weight:700;">Mới từ: ${escapeHtml(unreadSummary.allUnreadSenders.join(', '))}</div>`
          : `<div style="font-size:10.5px; color:#666;">Nhắn tin (Lưu 72h)</div>`;
      body.innerHTML = `
        <div style="background:rgba(255,255,255,0.92); border:2.5px solid #2C3E50; border-radius:18px; padding:12px; margin-bottom:14px; box-shadow:0 3px 0 #2C3E50;">
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
            <div style="width:44px; height:44px; border-radius:50%; background:#FFE66D; border:2.5px solid #2C3E50; display:flex; align-items:center; justify-content:center; font-size:24px;">${me.outfit || getRoleEmoji(me.role)}</div>
            <div>
              <div style="font-weight:700; font-size:15px; color:#2C3E50;">${escapeHtml(me.name)} <span class="tag">${me.role}</span></div>
              <div style="font-size:11.5px; color:#555;">${escapeHtml(brand)} SmartOS PWA${currentWeather ? ` • ${currentWeather.icon} ${currentWeather.tempC}°C` : ''}</div>
            </div>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
            <div style="background:#FEF9E7; border:2px solid #F39C12; border-radius:12px; padding:8px; text-align:center;">
              <div style="font-size:11px; color:#7E5109; font-weight:600;">⭐ Điểm hiện có</div>
              <div id="phone-home-points" style="font-size:17px; font-weight:700; color:#D35400;">${me.points}⭐</div>
            </div>
            <div style="background:#EBF5FB; border:2px solid #2980B9; border-radius:12px; padding:8px; text-align:center;">
              <div style="font-size:11px; color:#1B4F72; font-weight:600;">🕒 Thời gian</div>
              <div style="font-size:14px; font-weight:700; color:#1B4F72; margin-top:2px;">${lighting.label}</div>
            </div>
          </div>
          <div style="margin-top:8px; background:#EAFAF1; border:2px solid #27AE60; border-radius:12px; padding:7px 10px; display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:11.5px; font-weight:600; color:#145A32;">📍 Vị trí:</span>
            <span id="phone-home-loc" style="font-size:12px; font-weight:700; color:#1E8449;">${locText}</span>
          </div>
        </div>
        <div style="font-size:12px; font-weight:700; color:#2C3E50; margin-bottom:8px; padding-left:4px;">📱 Ứng dụng của ${escapeHtml(me.name)}</div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <button type="button" class="phone-app-icon-btn" style="${unreadTotal > 0 ? 'border-color:#EF4444; background:#FEF2F2;' : ''}" onclick="switchSmartphoneView('messenger')">
            ${unreadTotal > 0 ? `<span class="unread-badge-dot" style="top:-6px; right:-6px;">${unreadTotal}</span>` : ''}
            <div style="width:48px; height:48px; border-radius:14px; background:linear-gradient(135deg, #00B2FF, #006AFF); display:flex; align-items:center; justify-content:center; font-size:25px; color:#FFF; border:2px solid #2C3E50;">💬</div>
            <div style="font-weight:700; font-size:13px; color:#2C3E50;">Messenger</div>
            ${senderHint}
          </button>
          <button type="button" class="phone-app-icon-btn" onclick="switchSmartphoneView('tasks')">
            ${pendingTasks > 0 ? `<span class="unread-badge-dot" style="top:-6px; right:-6px; background:#F39C12; color:#2C3E50;">${pendingTasks}</span>` : ''}
            <div style="width:48px; height:48px; border-radius:14px; background:linear-gradient(135deg, #FF6B6B, #EE5253); display:flex; align-items:center; justify-content:center; font-size:25px; color:#FFF; border:2px solid #2C3E50;">📋</div>
            <div style="font-weight:700; font-size:13px; color:#2C3E50;">Tasks</div>
            <div style="font-size:10.5px; color:#666;">Việc nhà & Đồng đội</div>
          </button>
          <button type="button" class="phone-app-icon-btn" style="grid-column:span 2; ${activeNavTargetId ? 'border-color:#16A34A; background:#ECFDF5;' : ''}" onclick="switchSmartphoneView('maps')">
            ${activeNavTargetId ? `<span class="unread-badge-dot" style="top:-6px; right:-6px; background:#16A34A;">ON</span>` : ''}
            <div style="display:flex; align-items:center; gap:10px;">
              <div style="width:44px; height:44px; border-radius:13px; background:linear-gradient(135deg, #10B981, #0284C7); display:flex; align-items:center; justify-content:center; font-size:24px; color:#FFF; border:2px solid #2C3E50;">🗺️</div>
              <div style="text-align:left;">
                <div style="font-weight:700; font-size:13.5px; color:#2C3E50;">Chỉ Đường (${escapeHtml(brand)} Maps)</div>
                <div style="font-size:10.5px; color:${activeNavTargetId ? '#15803D' : '#666'}; font-weight:${activeNavTargetId ? '700' : '400'};">
                  ${activeNavTargetId ? `🧭 Đang dẫn tới: ${escapeHtml(getResolvedNavTarget()?.name || '')}` : 'Chọn địa điểm để bật mũi tên Minimap'}
                </div>
              </div>
            </div>
          </button>
          <button type="button" class="phone-app-icon-btn" style="grid-column:span 2; border-color:#6366F1; background:#EEF2FF;" onclick="switchSmartphoneView('robot')">
            <div style="display:flex; align-items:center; gap:10px;">
              <div style="width:44px; height:44px; border-radius:13px; background:linear-gradient(135deg, #6366F1, #8B5CF6); display:flex; align-items:center; justify-content:center; font-size:24px; color:#FFF; border:2px solid #2C3E50;">🤖</div>
              <div style="text-align:left;">
                <div style="font-weight:700; font-size:13.5px; color:#312E81;">Robot Giúp Đỡ &amp; Nhắc Nhở</div>
                <div style="font-size:10.5px; color:#4338CA; font-weight:600;">
                  ${isParent(me) ? 'Chọn mẫu robot & đặt lịch nhắc cho các con' : 'Xem mẫu robot & lịch nhắc nhở của con'}
                </div>
              </div>
            </div>
          </button>
        </div>
      `;
      return;
    }

    if (smartphoneCurrentView === 'messenger') {
      pruneExpiredFamilyMessages();
      if (
        smartphoneChatTargetId !== 'family_group' &&
        !state.members.some((m) => m.id !== me.id && m.id === smartphoneChatTargetId)
      ) {
        smartphoneChatTargetId = 'family_group';
      }
      // Compute unread channels & newly read bubbles BEFORE marking current channel read
      const beforeSummary = getUnreadSummaryByChannel(me);
      const newlyReadIds = new Set<string>();
      let changed = false;
      (state.familyMessages as any[]).forEach((msg) => {
        if (msg.senderId === me.id) return;
        const match =
          smartphoneChatTargetId === 'family_group'
            ? msg.recipientId === 'family_group'
            : (msg.senderId === smartphoneChatTargetId && msg.recipientId === me.id) || (msg.senderId === me.id && msg.recipientId === smartphoneChatTargetId);
        if (match) {
          if (!Array.isArray(msg.readBy)) msg.readBy = [];
          if (!msg.readBy.includes(me.id)) {
            if (msg.id) newlyReadIds.add(String(msg.id));
            msg.readBy.push(me.id);
            changed = true;
          }
        }
      });
      if (changed) {
        lastHudSignature = '';
        updateHUD();
        saveGame();
      }

      const channels = [
        { id: 'family_group', label: '👨‍👩‍👧‍👦 Nhóm Gia Đình' },
        ...state.members.filter((m) => m.id !== me.id).map((m) => ({ id: m.id, label: `${m.outfit || getRoleEmoji(m.role)} ${m.name}` }))
      ];
      const activeChannel = channels.find((ch) => ch.id === smartphoneChatTargetId) || channels[0];
      const otherUnreadChannels = channels.filter(
        (ch) => ch.id !== activeChannel.id && (beforeSummary.channelUnreadCount[ch.id] || 0) > 0
      );
      const otherUnreadTotal = otherUnreadChannels.reduce(
        (sum, ch) => sum + (beforeSummary.channelUnreadCount[ch.id] || 0),
        0
      );
      const msgs = (state.familyMessages as any[]).filter((msg) =>
        activeChannel.id === 'family_group'
          ? msg.recipientId === 'family_group'
          : (msg.senderId === me.id && msg.recipientId === activeChannel.id) || (msg.senderId === activeChannel.id && msg.recipientId === me.id)
      );

      body.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
          <button type="button" class="btn btn-sm" style="background:#34495E;" onclick="switchSmartphoneView('home')">◀ Trang chủ</button>
          <b style="font-size:14px; color:#006AFF;">💬 Family Messenger</b>
          <span class="tag" style="background:#D6EAF8; font-size:10px;">Lưu 72h</span>
        </div>
        <div style="position:relative; margin-bottom:6px; z-index:25;">
          <button
            type="button"
            id="phone-channel-dropdown-btn"
            class="btn btn-sm ${otherUnreadTotal > 0 ? 'phone-unread-channel' : ''}"
            style="width:100%; display:flex; align-items:center; justify-content:space-between; gap:8px; padding:7px 10px; ${otherUnreadTotal > 0 ? '' : 'background:#FFFFFF; color:#0F172A; border-color:#2C3E50;'} text-align:left;"
            aria-expanded="${smartphoneChannelMenuOpen ? 'true' : 'false'}"
            onclick="toggleSmartphoneChannelMenu()"
          >
            <span style="display:flex; align-items:center; gap:6px; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
              <span style="font-size:10.5px; font-weight:700; opacity:0.75; flex-shrink:0;">Kênh:</span>
              <span style="font-weight:800; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(activeChannel.label)}</span>
            </span>
            <span style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
              ${otherUnreadTotal > 0 ? `<span style="background:#DC2626; color:#FFFFFF; border-radius:999px; padding:1px 7px; font-size:10.5px; font-weight:800; line-height:1.4;">🔴 ${otherUnreadTotal} mới</span>` : ''}
              <span style="font-size:12px; font-weight:800;">${smartphoneChannelMenuOpen ? '▲' : '▾'}</span>
            </span>
          </button>
          ${smartphoneChannelMenuOpen ? `
            <div id="phone-channel-dropdown-menu" style="position:absolute; top:calc(100% + 5px); left:0; right:0; z-index:40; background:#FFFFFF; border:2.5px solid #2C3E50; border-radius:12px; box-shadow:0 10px 22px rgba(15,23,42,0.22); max-height:210px; overflow-y:auto; padding:5px; display:flex; flex-direction:column; gap:4px;">
              ${channels
                .map((ch) => {
                  const active = activeChannel.id === ch.id;
                  const unreadForCh = active ? 0 : (beforeSummary.channelUnreadCount[ch.id] || 0);
                  const sendersForCh = beforeSummary.channelSenders[ch.id] || [];
                  const unreadBadge =
                    unreadForCh > 0
                      ? ch.id === 'family_group' && sendersForCh.length > 0
                        ? `🔴 ${unreadForCh} (${sendersForCh.join(', ')})`
                        : `🔴 ${unreadForCh}`
                      : '';
                  return `<button type="button" class="btn btn-sm ${active ? 'btn-primary' : unreadForCh > 0 ? 'phone-unread-channel' : ''}" style="width:100%; display:flex; align-items:center; justify-content:space-between; gap:8px; padding:6px 9px; text-align:left; ${active ? '' : unreadForCh > 0 ? '' : 'background:#F8FAFC; color:#0F172A; border-color:#CBD5E1; box-shadow:none;'}" onclick="switchSmartphoneView('messenger', '${ch.id}')">
                    <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(ch.label)}</span>
                    ${active
                      ? '<span style="font-size:10px; font-weight:800; background:rgba(255,255,255,0.22); padding:1px 6px; border-radius:999px; flex-shrink:0;">✓ Đang xem</span>'
                      : unreadBadge
                        ? `<span style="font-size:10.5px; font-weight:800; color:#B91C1C; flex-shrink:0;">${escapeHtml(unreadBadge)}</span>`
                        : ''}
                  </button>`;
                })
                .join('')}
            </div>
          ` : ''}
        </div>
        ${otherUnreadChannels.length > 0 ? `
          <div id="phone-unread-notice-banner" style="background:#FEF2F2; border:2px solid #EF4444; border-radius:10px; padding:6px 8px; margin-bottom:6px; font-size:11.5px; color:#991B1B; display:flex; align-items:center; gap:6px; flex-wrap:wrap; box-shadow:0 2px 6px rgba(239,68,68,0.18);">
            <span>🔔 <b>Tin nhắn mới từ:</b></span>
            ${otherUnreadChannels
              .map((ch) => {
                const cnt = beforeSummary.channelUnreadCount[ch.id] || 0;
                const sNames = (beforeSummary.channelSenders[ch.id] || []).join(', ');
                const titleTxt = ch.id === 'family_group' ? `Nhóm (${sNames})` : ch.label;
                return `<button type="button" class="btn btn-sm btn-danger" style="padding:2px 7px; font-size:11px;" onclick="switchSmartphoneView('messenger', '${ch.id}')">${escapeHtml(titleTxt)} (${cnt})</button>`;
              })
              .join('')}
          </div>
        ` : ''}
        <div id="phone-msg-feed" style="flex:1; overflow-y:auto; background:rgba(255,255,255,0.85); border:2px solid #2C3E50; border-radius:12px; padding:8px; display:flex; flex-direction:column; gap:8px; margin-bottom:8px;">
          ${msgs.length === 0
            ? `<div style="text-align:center; color:#7F8C8D; font-size:12px; margin:auto;">Chưa có tin nhắn nào trong 72 giờ qua.</div>`
            : msgs
                .map((m) => {
                  const isMine = m.senderId === me.id;
                  const sObj = state.members.find((x) => x.id === m.senderId);
                  const isFreshUnread = !isMine && m.id && newlyReadIds.has(String(m.id));
                  return `<div class="msg-bubble-row ${isMine ? 'me' : 'other'}${isFreshUnread ? ' msg-unread-new' : ''}"><div style="font-size:10px; color:#555; margin-bottom:2px; font-weight:600;">${isMine ? 'Bạn' : escapeHtml(sObj ? sObj.name : m.senderName)} • ${formatTimestamp(m.ts)} ${isFreshUnread ? '<span class="tag" style="background:#EF4444; color:#FFF; border-color:#B91C1C; font-size:9px;">MỚI</span>' : ''}</div><div class="msg-bubble">${escapeHtml(m.text)}</div></div>`;
                })
                .join('')}
        </div>
        <div style="display:flex; gap:6px;">
          <input type="text" id="phone-msg-input" placeholder="Nhập tin nhắn..." style="flex:1; padding:7px 9px; border:2px solid #2C3E50; border-radius:10px; font-size:13px;" onkeypress="if(event.key==='Enter') sendSmartphoneMessage()">
          <button type="button" class="btn btn-primary btn-sm" onclick="sendSmartphoneMessage()">Gửi ➤</button>
        </div>
      `;
      const feed = document.getElementById('phone-msg-feed');
      if (feed) feed.scrollTop = feed.scrollHeight;
      return;
    }

    if (smartphoneCurrentView === 'tasks') {
      const notifStatus = getNotificationStatus();
      const notifBannerHtml = notifStatus.supported
        ? `
          <div style="display:flex; align-items:center; justify-content:space-between; gap:6px; padding:7px 9px; border-radius:10px; border:2px solid ${notifStatus.enabled ? '#10B981' : '#F59E0B'}; background:${notifStatus.enabled ? '#ECFDF5' : '#FFFBEB'}; margin-bottom:8px;">
            <span style="font-size:11px; font-weight:700; color:${notifStatus.enabled ? '#065F46' : '#92400E'};">
              ${notifStatus.enabled ? '🔔 Đã bật thông báo khi có bài tập mới' : notifStatus.permission === 'denied' ? '🔕 Thông báo đang bị chặn ở trình duyệt' : '🔔 Bật thông báo để biết ngay khi Bố/Mẹ giao bài'}
            </span>
            <div style="display:flex; gap:4px; shrink:0;">
              <button type="button" class="btn btn-sm" style="padding:3px 8px; font-size:10.5px; background:${notifStatus.enabled ? '#475569' : '#0284C7'}; color:#FFF;" onclick="toggleTaskNotifications()">
                ${notifStatus.enabled ? '🔕 Tắt' : '🔔 Bật'}
              </button>
              ${notifStatus.enabled ? `<button type="button" class="btn btn-sm btn-primary" style="padding:3px 8px; font-size:10.5px;" onclick="window.B2KS?.sendTestNotification()">Thử</button>` : ''}
            </div>
          </div>
        `
        : '';
      body.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
          <button type="button" class="btn btn-sm" style="background:#34495E;" onclick="switchSmartphoneView('home')">◀ Trang chủ</button>
          <b style="font-size:14px; color:#C0392B;">📋 Tasks & Đồng Đội</b>
          <span class="points-pill">${me.points}⭐</span>
        </div>
        ${notifBannerHtml}
        <div id="phone-parent-task-creator" style="display:${isParent(me) ? 'block' : 'none'}; background:#FFF8E7; padding:9px; border:2px solid #2C3E50; border-radius:10px; margin-bottom:10px;">
          <div style="font-weight:700; font-size:12.5px; margin-bottom:6px;">➕ Giao việc / Đồng đội cho con</div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:6px;">
            <select id="phone-task-type" onchange="togglePhoneHomeworkUpload()" style="padding:5px; border:2px solid #2C3E50; border-radius:6px; font-size:12px;">
              <option value="chore">🧹 Việc nhà</option>
              <option value="homework">📚 Bài tập</option>
              <option value="family_quest">🤝 Đồng đội</option>
            </select>
            <select id="phone-task-assignee" style="padding:5px; border:2px solid #2C3E50; border-radius:6px; font-size:12px;">
              ${(() => {
                const kids = state.members.filter((m) => !isParent(m));
                return kids.length > 0
                  ? kids.map((kid) => `<option value="${kid.id}">${escapeHtml(kid.name)}</option>`).join('')
                  : '<option value="">-- Chưa có bé --</option>';
              })()}
            </select>
          </div>
          <div style="display:flex; gap:6px; margin-bottom:6px;">
            <input type="text" id="phone-task-title" placeholder="Tên nhiệm vụ..." style="flex:1; padding:5px 7px; border:2px solid #2C3E50; border-radius:6px; font-size:12px;">
            <input type="number" id="phone-task-reward" value="20" min="5" max="100" style="width:62px; padding:5px; border:2px solid #2C3E50; border-radius:6px; font-size:12px;">
          </div>
          <div style="margin-bottom:6px;">
            <label style="font-size:11px; font-weight:700; color:#7E5109; display:block; margin-bottom:2px;">⏰ Hạn hoàn thành (tùy chọn):</label>
            <input type="datetime-local" id="phone-task-deadline" style="width:100%; padding:4px 6px; border:2px solid #2C3E50; border-radius:6px; font-size:11.5px; background:#FFF;">
          </div>
          <div id="phone-parent-file-group" style="display:none; margin-bottom:6px;">
            <input type="file" id="phone-task-parent-file" accept="image/*,.pdf,.doc,.docx,.txt" style="font-size:11px; width:100%;">
          </div>
          <button type="button" class="btn btn-primary btn-sm" style="width:100%;" onclick="createTaskFromSmartphone()">Giao nhiệm vụ ngay</button>
        </div>
        <div id="phone-tasks-list" style="flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:8px;">
          ${state.tasks.length === 0 ? '<p style="color:#666; text-align:center; font-size:12.5px;">Chưa có nhiệm vụ nào.</p>' : state.tasks.slice().reverse().map((t) => buildTaskCardHtml(t, me, true)).join('')}
        </div>
      `;
      return;
    }

    if (smartphoneCurrentView === 'robot') {
      const kids = state.members.filter((m) => !isParent(m));
      const canEdit = isParent(me);
      const activeChild = canEdit
        ? (kids.find((k) => k.id === smartphoneRobotChildId) || kids[0] || null)
        : (isParent(me) ? null : me);
      if (activeChild && canEdit) smartphoneRobotChildId = activeChild.id;

      if (!activeChild) {
        body.innerHTML = `
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
            <button type="button" class="btn btn-sm" style="background:#34495E;" onclick="switchSmartphoneView('home')">◀ Trang chủ</button>
            <b style="font-size:14px; color:#4338CA;">🤖 Robot Giúp Đỡ</b>
            <span></span>
          </div>
          <div style="background:#FEF3C7; border:2px solid #F59E0B; border-radius:12px; padding:12px; font-size:12px; color:#92400E;">
            Gia đình chưa có thành viên con để cấu hình Robot giúp đỡ.
          </div>
        `;
        return;
      }

      ensureMemberProps(activeChild);
      const rCfg = activeChild.helperRobot!;
      const nowMs = Date.now();
      const childPills = canEdit
        ? `<div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:8px;">
            ${kids.map((k) => `<button type="button" class="btn btn-sm" style="background:${k.id === activeChild.id ? '#4F46E5' : '#E2E8F0'}; color:${k.id === activeChild.id ? '#FFF' : '#1E293B'};" onclick="selectPhoneRobotChild('${k.id}')">${k.role === 'Con trai' ? '👦' : '👧'} ${escapeHtml(k.name)}</button>`).join('')}
           </div>`
        : '';
      const skinGrid = ROBOT_SKIN_OPTIONS.map((sk) => {
        const selected = rCfg.skin === sk.id;
        return `
          <button type="button" ${canEdit ? `onclick="setPhoneRobotSkin('${activeChild.id}', '${sk.id}')"` : 'disabled'} style="padding:6px 4px; border-radius:10px; border:2px solid ${selected ? '#4F46E5' : '#CBD5E1'}; background:${selected ? '#EEF2FF' : '#FFF'}; cursor:${canEdit ? 'pointer' : 'default'}; text-align:center;">
            <div style="font-size:18px;">${sk.icon}</div>
            <div style="font-size:11px; font-weight:800; color:#1E293B;">${escapeHtml(sk.name)}</div>
          </button>
        `;
      }).join('');

      const remListHtml =
        rCfg.reminders.length === 0
          ? `<div style="text-align:center; font-size:11.5px; color:#64748B; padding:8px;">Chưa có lịch nhắc nào — Robot đang nghỉ tại phòng riêng của ${escapeHtml(activeChild.name)}.</div>`
          : rCfg.reminders
              .slice()
              .sort((a, b) => a.startAt - b.startAt)
              .map((r) => {
                const isActiveNow = nowMs >= r.startAt && nowMs <= r.endAt;
                const isDone = nowMs > r.endAt;
                const statusBadge = isActiveNow
                  ? `<span class="tag" style="background:#DCFCE7; border-color:#16A34A; color:#166534; font-size:10px;">🟢 Đang chạy theo bé</span>`
                  : isDone
                    ? `<span class="tag" style="background:#F1F5F9; border-color:#94A3B8; color:#475569; font-size:10px;">✅ Đã qua</span>`
                    : `<span class="tag" style="background:#FEF3C7; border-color:#D97706; color:#92400E; font-size:10px;">⏳ Sắp tới</span>`;
                return `
                  <div style="background:#FFF; border:2px solid ${isActiveNow ? '#16A34A' : '#CBD5E1'}; border-radius:10px; padding:7px 9px; display:flex; justify-content:space-between; align-items:flex-start; gap:6px;">
                    <div style="min-width:0;">
                      <div style="font-weight:700; font-size:12px; color:#1E293B;">📢 ${escapeHtml(r.text)}</div>
                      <div style="font-size:10.5px; color:#475569; margin-top:2px;">🕒 ${formatTimestamp(r.startAt)} ➔ ${formatTimestamp(r.endAt)}</div>
                      <div style="margin-top:3px;">${statusBadge}</div>
                    </div>
                    ${canEdit ? `<button type="button" class="btn btn-sm btn-danger" style="padding:3px 7px;" onclick="deletePhoneRobotReminder('${activeChild.id}', '${r.id}')">🗑️</button>` : ''}
                  </div>
                `;
              })
              .join('');

      body.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
          <button type="button" class="btn btn-sm" style="background:#34495E;" onclick="switchSmartphoneView('home')">◀ Trang chủ</button>
          <b style="font-size:14px; color:#4338CA;">🤖 Robot ${escapeHtml(activeChild.name)}</b>
          <span></span>
        </div>
        ${childPills}
        <div style="background:#FFF; border:2px solid #2C3E50; border-radius:12px; padding:8px; margin-bottom:8px;">
          <div style="font-size:11.5px; font-weight:700; color:#312E81; margin-bottom:5px;">🎨 Chọn giao diện Robot giúp đỡ:</div>
          <div style="display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:6px;">${skinGrid}</div>
        </div>
        ${canEdit ? `
          <div style="background:#EEF2FF; border:2px solid #4F46E5; border-radius:12px; padding:8px; margin-bottom:8px;">
            <div style="font-size:11.5px; font-weight:700; color:#312E81; margin-bottom:4px;">➕ Đặt lịch nhắc nhở mới (Không trùng giờ):</div>
            <input type="text" id="phone-robot-text" maxlength="80" placeholder="VD: Con nhớ làm bài tập Toán nhé!" style="width:100%; padding:5px 7px; border:2px solid #2C3E50; border-radius:6px; font-size:12px; margin-bottom:5px;">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:5px; margin-bottom:5px;">
              <div>
                <label style="font-size:10px; font-weight:700; color:#312E81;">Bắt đầu:</label>
                <input type="datetime-local" id="phone-robot-start" style="width:100%; padding:3px 4px; border:1.5px solid #2C3E50; border-radius:6px; font-size:10.5px; background:#FFF;">
              </div>
              <div>
                <label style="font-size:10px; font-weight:700; color:#312E81;">Kết thúc:</label>
                <input type="datetime-local" id="phone-robot-end" style="width:100%; padding:3px 4px; border:1.5px solid #2C3E50; border-radius:6px; font-size:10.5px; background:#FFF;">
              </div>
            </div>
            <button type="button" class="btn btn-primary btn-sm" style="width:100%;" onclick="addPhoneRobotReminder('${activeChild.id}')">🤖 Lưu Lịch Nhắc Nhở</button>
          </div>
        ` : ''}
        <div style="flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:6px;">
          ${remListHtml}
        </div>
      `;
      return;
    }

    if (smartphoneCurrentView === 'maps') {
      const currentTarget = getResolvedNavTarget();
      const resolvedLocs = resolveNeighborhoodLocations(state);
      const listHtml = resolvedLocs.map((loc) => {
        const distM = me.scene === 'neighborhood' ? Math.round(Math.hypot(me.x - loc.x, me.y - loc.y) / 10) : null;
        const isCurrent = currentTarget?.id === loc.id;
        return `
          <div style="background:${isCurrent ? '#ECFDF5' : '#FFFFFF'}; border:2px solid ${isCurrent ? '#16A34A' : '#2C3E50'}; border-radius:12px; padding:8px 10px; display:flex; justify-content:space-between; align-items:center; gap:8px;">
            <div style="min-width:0;">
              <div style="font-weight:700; font-size:12.5px; color:#1E293B; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${loc.icon} ${escapeHtml(loc.name)}</div>
              <div style="font-size:10.5px; color:#64748B;">${distM !== null ? `📏 Cách ${distM}m` : '🏘️ Ngoài khu phố'}</div>
            </div>
            ${isCurrent
              ? `<button type="button" class="btn btn-sm btn-danger" onclick="cancelNavigationTarget(); renderSmartphoneScreen()">✖ Hủy</button>`
              : `<button type="button" class="btn btn-sm btn-primary" onclick="setNavigationTarget('${loc.id}')">🧭 Đi tới</button>`}
          </div>
        `;
      }).join('');

      body.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
          <button type="button" class="btn btn-sm" style="background:#34495E;" onclick="switchSmartphoneView('home')">◀ Trang chủ</button>
          <b style="font-size:14px; color:#0F766E;">🗺️ Chỉ Đường ${escapeHtml(brand)}</b>
          <span class="tag" style="background:#CCFBF1; font-size:10px;">Minimap</span>
        </div>
        ${currentTarget ? `
          <div style="background:#FEF3C7; border:2px solid #D97706; border-radius:10px; padding:8px 10px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; gap:6px;">
            <div style="font-size:11.5px; font-weight:700; color:#92400E;">🧭 Đang chỉ đường tới:<br>${currentTarget.icon} ${escapeHtml(currentTarget.name)}</div>
            <button type="button" class="btn btn-sm btn-danger" onclick="cancelNavigationTarget(); renderSmartphoneScreen()">❌ Hủy</button>
          </div>
        ` : `
          <div style="background:#E0F2FE; border:1.5px solid #0284C7; border-radius:10px; padding:7px 9px; margin-bottom:8px; font-size:11.5px; color:#0369A1;">
            💡 Chọn địa điểm bên dưới để hiện <b>mũi tên chỉ đường</b> trên Minimap góc phải!
          </div>
        `}
        <div style="flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:7px; padding-right:2px;">
          ${listHtml}
        </div>
      `;
    }
  }

  function renderDiningFoodPuzzle() {
    const body = document.getElementById('dining-puzzle-body');
    if (!body || !activeFoodPuzzle) return;
    const { item, hiddenSet, eatStatus } = activeFoodPuzzle;
    let statusBanner = '';
    if (eatStatus.isParent) statusBanner = `<div class="tag" style="background:#D6EAF8; margin-bottom:8px;">👑 Chế độ Bố/Mẹ: Giải đố vui cùng con</div>`;
    else if (eatStatus.canEarn) statusBanner = `<div class="tag" style="background:#D4EDDA; color:#145A32; margin-bottom:8px;">⭐ Hoàn thành đúng nhận +2⭐ (Lượt ${eatStatus.count + 1}/${eatStatus.maxPerDay} hôm nay)</div>`;
    else if (eatStatus.capped) statusBanner = `<div class="tag" style="background:#FADBD8; color:#922B21; margin-bottom:8px;">🍽️ Đã nhận đủ ${eatStatus.maxPerDay}/${eatStatus.maxPerDay} lượt điểm ăn cơm hôm nay!</div>`;
    else statusBanner = `<div class="tag" style="background:#FEF9E7; color:#7E5109; margin-bottom:8px;">⏳ Chờ ${Math.max(1, Math.ceil(eatStatus.remainMs / 60000))} phút nữa để nhận sao tiếp!</div>`;

    const slotsHtml = item.word
      .split('')
      .map((ch: string, idx: number) =>
        !hiddenSet.has(idx)
          ? `<span class="puzzle-letter-slot">${ch}</span>`
          : `<input type="text" maxlength="1" class="puzzle-letter-slot missing" id="food-slot-${idx}" oninput="handleFoodPuzzleSlotInput(${idx}, this)" onkeydown="handleFoodPuzzleSlotKeydown(event, ${idx})" style="text-align:center; padding:0; outline:none;">`
      )
      .join('');

    body.innerHTML = `
      ${statusBanner}
      <div style="background:#FFF8E7; border:2.5px solid #2C3E50; border-radius:16px; padding:14px; margin-bottom:12px;">
        <div style="font-size:74px; line-height:1.1;">${item.emoji}</div>
        <div style="font-size:13px; color:#7E5109; font-weight:600; margin-top:6px;">💡 Gợi ý: ${item.hint}</div>
      </div>
      <div style="font-weight:700; font-size:14px; color:#2C3E50; margin-bottom:8px;">Điền các chữ cái tiếng Anh còn thiếu:</div>
      <div style="display:flex; gap:5px; justify-content:center; flex-wrap:wrap; margin-bottom:14px;">${slotsHtml}</div>
      <div id="dining-puzzle-feedback" style="min-height:22px; font-size:13px; font-weight:700; margin-bottom:10px;"></div>
      <div style="display:flex; gap:8px; justify-content:center;">
        <button type="button" class="btn btn-accent" onclick="openDiningFoodPuzzleModal()">🔄 Đổi món khác</button>
        <button type="button" class="btn btn-primary" onclick="submitDiningFoodPuzzle()">✅ Kiểm tra & Ăn cơm</button>
      </div>
    `;
    const firstEl = document.getElementById(`food-slot-${activeFoodPuzzle.hiddenIndices[0]}`);
    if (firstEl) setTimeout(() => firstEl.focus(), 50);
  }

  function renderChatLog() {
    const list = document.getElementById('chat-log-list');
    if (!list) return;
    list.innerHTML = state.chatHistory
      .map(
        (m) => `<div style="padding:4px 8px; border-radius:6px; background:${m.isEng ? '#D4EDDA' : '#F1F5F9'};"><b>${escapeHtml(m.sender)}:</b> ${escapeHtml(m.text)} ${m.isEng ? '<b style="color:#28A745;">(+5⭐ EN)</b>' : ''}</div>`
      )
      .join('');
    list.scrollTop = list.scrollHeight;
  }

  /* ==================== 17. GLOBAL WINDOW & REACT BRIDGE BINDINGS ==================== */
  function selectMemberById(memberId: string) {
    AudioEngine.playClick();
    controller3d?.clearTapTarget();
    state.currentUserId = memberId;
    deviceConfig.currentMemberId = memberId;
    saveDeviceConfig();
    const menu = document.getElementById('member-dropdown-menu');
    if (menu) menu.classList.remove('open');
    lastHudSignature = '';
    syncSeenTasksBaseline();
    updateNotificationHudUI();
    syncPrivateRoomToolbar();
    updateHUD();
    saveGame();
    pullFromFirebase();
    showToast(`👤 Đang điều khiển: ${getCurrentUser().name}`);
  }

  function openSmartphoneModal(initialView: 'home' | 'messenger' | 'tasks' | 'maps' = 'home') {
    AudioEngine.init();
    AudioEngine.playClick();
    pruneExpiredFamilyMessages();
    smartphoneCurrentView = initialView;
    smartphoneChannelMenuOpen = false;
    const modal = document.getElementById('smartphone-modal');
    if (modal) modal.style.display = 'flex';
    renderSmartphoneScreen();
  }

  function renderPetShopModal() {
    const user = getCurrentUser();
    ensureMemberProps(user);
    const brand = (state.familyName || 'B2KS').trim() || 'B2KS';
    const ptsPill = document.getElementById('pet-shop-points-pill');
    if (ptsPill) ptsPill.textContent = `${user.points}⭐`;

    const isHudCollection = petModalMode === 'hud_collection';
    if (isHudCollection) petShopTab = 'my_pets';

    const titleEl = document.getElementById('pet-modal-title');
    if (titleEl) {
      titleEl.textContent = isHudCollection
        ? '🐾 Thú Cưng Đồng Hành & Bộ Sưu Tập'
        : `🐾 Cửa Hàng & Chăm Sóc Thú Cưng ${brand}`;
    }
    const npcBanner = document.getElementById('pet-shop-npc-banner');
    if (npcBanner) npcBanner.style.display = isHudCollection ? 'none' : 'flex';
    const hudBanner = document.getElementById('pet-hud-guide-banner');
    if (hudBanner) hudBanner.style.display = isHudCollection ? 'flex' : 'none';
    const tabsBar = document.getElementById('pet-shop-tabs');
    if (tabsBar) tabsBar.style.display = isHudCollection ? 'none' : 'flex';

    (['eggs', 'food', 'accessories', 'my_pets'] as const).forEach((t) => {
      const btn = document.getElementById(`pet-tab-${t}`);
      if (btn) btn.style.background = petShopTab === t ? '#D97706' : '#64748B';
    });

    const body = document.getElementById('pet-shop-body');
    if (!body) return;

    if (!isHudCollection && petShopTab === 'eggs') {
      body.innerHTML = `
        <div style="background:#FFFBEB; border:1.5px solid #F59E0B; border-radius:10px; padding:7px 10px; margin-bottom:10px; font-size:11.5px; color:#92400E;">
          🎲 <b>Tỉ lệ nở ngẫu nhiên:</b> Giới tính (50% ♂️ / 50% ♀️) • Màu hiếm (${PET_VARIANT_DEFS.map((v) => `${v.label} ${v.chancePercent}%`).join(' • ')})<br>
          ⏳ <b>Cơ chế Độ No:</b> Chỉ giảm nhẹ khi đang Đồng hành ngoài map. Khi <b>Độ no &gt; 0%</b> mới kích hoạt +Tốc độ &amp; +Sao thưởng!
        </div>
        <div class="grid-2">${PET_SPECIES.map((sp) => {
          const s1 = sp.stages[1];
          const s4 = sp.stages[4];
          return `
            <div class="card-item" style="background:linear-gradient(180deg,#FFFFFF 0%, ${sp.accentColor} 100%); border-color:${sp.primaryColor};">
              <div style="display:flex; gap:10px; align-items:center;">
                <div style="flex-shrink:0; background:#FFF; border-radius:12px; padding:4px; border:2px solid ${sp.primaryColor};">${renderPetArtSVG(sp.id, 0, 58)}</div>
                <div style="min-width:0;">
                  <b style="font-size:14px; color:#1E293B;">${escapeHtml(sp.eggName)}</b>
                  <div style="font-size:11px; color:${sp.primaryColor}; font-weight:700;">➔ Nở thành: ${escapeHtml(sp.name)}</div>
                  <div style="font-size:11px; color:#475569; margin-top:2px;">${escapeHtml(sp.statLabel)}</div>
                </div>
              </div>
              <div style="font-size:11.5px; color:#334155;">${escapeHtml(sp.desc)}</div>
              <div style="background:rgba(255,255,255,0.85); border-radius:8px; padding:5px 7px; font-size:10.5px; color:#475569;">
                • GĐ1: +${s1.speedBonus} Tốc độ, +${s1.starBonus}⭐<br>
                • GĐ4 (${escapeHtml(s4.title)}): <b>+${s4.speedBonus} Tốc độ, +${s4.starBonus}⭐</b><br>
                • ⏳ Giảm độ no khi đi cùng: <b>-${sp.hungerDecayPerMin}%/phút</b>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
                <span class="points-pill" style="font-size:12.5px;">⭐ ${sp.eggPrice}</span>
                <button type="button" class="btn btn-sm btn-primary" onclick="buyPetEgg('${sp.id}')">🥚 Đổi Điểm Nhận Trứng</button>
              </div>
            </div>
          `;
        }).join('')}</div>`;
      return;
    }

    if (!isHudCollection && petShopTab === 'food') {
      const foodInv = user.petFoodInventory || {};
      body.innerHTML = `<div class="grid-2">${PET_FOOD_CATALOG.map((fd) => {
        const count = foodInv[fd.id] || 0;
        return `
          <div class="card-item" style="background:#FFF;">
            <div style="display:flex; gap:10px; align-items:center;">
              <div style="font-size:36px; background:#FEF3C7; width:56px; height:56px; border-radius:12px; border:2px solid #F59E0B; display:flex; align-items:center; justify-content:center;">${fd.icon}</div>
              <div>
                <b style="font-size:14px;">${escapeHtml(fd.name)}</b>
                <div style="font-size:11.5px; color:#059669; font-weight:700;">+${fd.xpGain} XP • +${fd.hungerGain}% No bụng</div>
                <div style="font-size:11px; color:#64748B; margin-top:2px;">Trong túi: <b>${count}</b> phần</div>
              </div>
            </div>
            <div style="font-size:11.5px; color:#475569;">${escapeHtml(fd.desc)}</div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span class="points-pill">⭐ ${fd.price}</span>
              <button type="button" class="btn btn-sm btn-accent" onclick="buyPetFood('${fd.id}')">🛒 Mua Thức Ăn</button>
            </div>
          </div>
        `;
      }).join('')}</div>`;
      return;
    }

    if (!isHudCollection && petShopTab === 'accessories') {
      const ownedAccs = user.petAccessories || [];
      body.innerHTML = `
        <div style="background:#FDF2F8; border:1.5px solid #EC4899; border-radius:10px; padding:7px 10px; margin-bottom:10px; font-size:11.5px; color:#9D174D;">
          🎀 Mua phụ kiện một lần để mặc cho bất kỳ thú cưng đã nở nào trong <b>Bộ Sưu Tập</b> của bạn!
        </div>
        <div class="grid-2">${PET_ACCESSORY_CATALOG.map((acc) => {
          const isOwned = ownedAccs.includes(acc.id);
          return `
            <div class="card-item" style="background:${isOwned ? '#F0FDF4' : '#FFF'}; border-color:${isOwned ? '#16A34A' : '#2C3E50'};">
              <div style="display:flex; gap:10px; align-items:center;">
                <div style="font-size:34px; background:#FCE7F3; width:54px; height:54px; border-radius:12px; border:2px solid #EC4899; display:flex; align-items:center; justify-content:center;">${acc.icon}</div>
                <div>
                  <b style="font-size:14px;">${escapeHtml(acc.name)}</b>
                  <div style="font-size:11px; color:#64748B; margin-top:2px;">${escapeHtml(acc.desc)}</div>
                </div>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
                <span class="points-pill">⭐ ${acc.price}</span>
                ${isOwned
                  ? '<span class="tag" style="background:#DCFCE7; color:#15803D; border-color:#16A34A;">✅ Đã sở hữu (Vào Bộ Sưu Tập để đeo)</span>'
                  : `<button type="button" class="btn btn-sm btn-primary" onclick="buyPetAccessory('${acc.id}')">🛍️ Mua Phụ Kiện</button>`}
              </div>
            </div>
          `;
        }).join('')}</div>
      `;
      return;
    }

    // Tab: my_pets (Collection, Rename, Variant & Gender, Egg Hatching, Feeding, Accessories, Companion Toggle)
    const pets = user.pets || [];
    const foodInv = user.petFoodInventory || {};
    const ownedAccs = user.petAccessories || [];
    const foodChips = PET_FOOD_CATALOG.map((fd) => `${fd.icon} ${fd.name}: <b>${foodInv[fd.id] || 0}</b>`).join(' · ');

    if (pets.length === 0) {
      body.innerHTML = `
        <div style="text-align:center; background:#FFF; border:2.5px dashed #F59E0B; border-radius:14px; padding:24px 16px;">
          <div style="font-size:40px;">🥚🐾</div>
          <div style="font-weight:700; font-size:15px; color:#92400E; margin-top:6px;">Bạn chưa có Quả Trứng hay Thú Cưng nào!</div>
          <div style="font-size:12.5px; color:#64748B; margin:6px 0 12px;">Hãy làm nhiệm vụ chăm chỉ và ghé <b>🐾 Cửa Hàng Thú Cưng ${escapeHtml(brand)}</b> trên bản đồ để đổi sao lấy trứng nhé!</div>
          ${isHudCollection
            ? '<button type="button" class="btn btn-accent" onclick="navigateToPetShopFromHud()">🧭 Chỉ đường tới Cửa Hàng Thú Cưng</button>'
            : '<button type="button" class="btn btn-primary" onclick="switchPetShopTab(\'eggs\')">🥚 Xem Cửa Hàng Trứng</button>'}
        </div>
      `;
      return;
    }

    body.innerHTML = `
      <div style="background:#ECFDF5; border:1.5px solid #10B981; border-radius:10px; padding:7px 10px; margin-bottom:8px; font-size:11.5px; color:#065F46;">
        🐾 <b>Quy tắc Thú Cưng:</b> Chỉ khi chọn <b>Đồng Hành</b> và <b>Độ no &gt; 0%</b> thì bạn mới nhận được <b>+Tốc độ</b> &amp; <b>+Sao thưởng</b> (làm việc nhà, bài tập, đồng đội, Tiếng Anh, ăn, ngủ, đọc truyện). Độ no giảm chậm khi đi cùng chủ — nếu về <b>0%</b> thú sẽ báo đói &amp; tạm ngưng thưởng đến khi được cho ăn!
      </div>
      <div style="background:#FFF; border:2px solid #F59E0B; border-radius:10px; padding:7px 10px; margin-bottom:10px; font-size:11.5px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
        <span>🍖 <b>Thức ăn trong túi:</b> ${foodChips}</span>
        ${isHudCollection
          ? `<span style="font-size:11px; color:#B45309; font-weight:700;">Mua thức ăn & phụ kiện tại Cửa Hàng Thú Cưng ${escapeHtml(brand)}</span>`
          : '<button type="button" class="btn btn-sm btn-accent" onclick="switchPetShopTab(\'food\')">➕ Mua thêm</button>'}
      </div>
      <div class="grid-2">
        ${pets.map((pet) => {
          const sp = getPetSpecies(pet.speciesId);
          const stageDef = sp.stages.find((s) => s.stage === pet.stage) || sp.stages[0];
          const isEquipped = user.activePetId === pet.id;
          const nextReq = pet.hatched ? getNextStageRequirement(sp, pet.stage) : null;
          const variantDef = getPetVariantDef(pet.variant);
          const genderLabel = pet.gender === 'male' ? '♂️ Đực' : '♀️ Cái';
          const genderColor = pet.gender === 'male' ? '#0284C7' : '#DB2777';
          const equippedAcc = getPetAccessoryDef(pet.accessoryId);
          const xpText = nextReq
            ? `XP: <b>${pet.xp}/${nextReq.minXp}</b> (Lên ${escapeHtml(nextReq.nextStageTitle)})`
            : `XP: <b>${pet.xp}</b> (👑 Cấp Tối Thượng!)`;
          const isHungry = pet.hatched && (pet.hunger || 0) <= 0;

          let actionHtml = '';
          if (!pet.hatched) {
            actionHtml = pet.hatchProgress >= 100
              ? `<button type="button" class="btn btn-sm btn-primary" style="width:100%;" onclick="hatchOwnedPet('${pet.id}')">🐣 NỞ TRỨNG NGAY!</button>`
              : `<button type="button" class="btn btn-sm btn-accent" style="width:100%;" onclick="warmPetEgg('${pet.id}')">🔥 Ủ Ấm Trứng (+35% tiến độ)</button>`;
          } else {
            const feedBtns = PET_FOOD_CATALOG.map((fd) => {
              const cnt = foodInv[fd.id] || 0;
              return `<button type="button" class="btn btn-sm" style="background:${cnt > 0 ? '#10B981' : '#CBD5E1'}; color:${cnt > 0 ? '#FFF' : '#475569'}; font-size:11px;" ${cnt > 0 ? '' : 'disabled'} onclick="feedOwnedPet('${pet.id}', '${fd.id}')">${fd.icon} Cho ăn (${cnt})</button>`;
            }).join('');
            const accButtons =
              ownedAccs.length > 0
                ? `<div style="display:flex; gap:4px; align-items:center; flex-wrap:wrap; margin-top:2px;">
                     <span style="font-size:10.5px; color:#64748B; font-weight:700;">🎀 Đeo:</span>
                     <button type="button" class="btn btn-sm" style="padding:2px 6px; font-size:10.5px; background:${!pet.accessoryId ? '#1E293B' : '#E2E8F0'}; color:${!pet.accessoryId ? '#FFF' : '#334155'};" onclick="equipPetAccessory('${pet.id}', '')">Bỏ</button>
                     ${ownedAccs.map((aid) => {
                       const ad = getPetAccessoryDef(aid);
                       if (!ad) return '';
                       const on = pet.accessoryId === aid;
                       return `<button type="button" class="btn btn-sm" title="${escapeHtml(ad.name)}" style="padding:2px 6px; font-size:11px; background:${on ? '#DB2777' : '#FCE7F3'}; color:${on ? '#FFF' : '#831843'};" onclick="equipPetAccessory('${pet.id}', '${aid}')">${ad.icon}</button>`;
                     }).join('')}
                   </div>`
                : `<div style="font-size:10px; color:#94A3B8;">🎀 Ghé tab Phụ Kiện tại Cửa Hàng để làm đẹp cho bé!</div>`;
            actionHtml = `<div style="display:flex; gap:4px; flex-wrap:wrap;">${feedBtns}</div>${accButtons}`;
          }

          return `
            <div class="card-item" style="background:${isEquipped ? '#FFFBEB' : '#FFF'}; border-color:${isHungry ? '#E11D48' : isEquipped ? '#D97706' : '#2C3E50'};">
              <div style="display:flex; gap:10px; align-items:center;">
                <div style="flex-shrink:0; background:${sp.accentColor}; border-radius:12px; padding:4px; border:2px solid ${sp.primaryColor};">
                  ${renderPetArtSVG(sp.id, pet.stage, 64, { variant: pet.variant, gender: pet.gender, accessoryId: pet.accessoryId })}
                </div>
                <div style="min-width:0; flex:1;">
                  <div style="display:flex; align-items:center; gap:4px; flex-wrap:wrap; margin-bottom:3px;">
                    <input type="text" id="pet-name-input-${pet.id}" value="${escapeHtml(pet.nickname)}" maxlength="20" style="width:112px; font-size:13px; font-weight:700; padding:2px 6px; border:1.5px solid #CBD5E1; border-radius:6px; color:#0F172A;" />
                    <button type="button" class="btn btn-sm" style="padding:2px 6px; font-size:10.5px; background:#0284C7;" onclick="renameOwnedPet('${pet.id}')" title="Lưu tên thú cưng">✏️</button>
                    <span class="tag" style="background:${sp.accentColor}; color:#1E293B; border-color:${sp.primaryColor};">${getPetStageBadgeLabel(pet.stage)}</span>
                  </div>
                  <div style="font-size:11.5px; font-weight:700; color:${sp.primaryColor}; margin-top:2px;">${escapeHtml(stageDef.title)} ${pet.hatched ? `• Lv.${pet.level}` : ''}</div>
                  ${pet.hatched ? `
                    <div style="display:flex; gap:4px; flex-wrap:wrap; margin-top:3px;">
                      <span class="tag" style="font-size:10px; background:#F8FAFC; color:${genderColor}; border-color:${genderColor};">${genderLabel}</span>
                      <span class="tag" style="font-size:10px; background:#FFF; color:${variantDef.badgeColor}; border-color:${variantDef.badgeColor};">🎨 ${escapeHtml(variantDef.label)}</span>
                      ${equippedAcc ? `<span class="tag" style="font-size:10px; background:#FCE7F3; color:#9D174D; border-color:#EC4899;">${equippedAcc.icon}</span>` : ''}
                    </div>
                    <div style="font-size:11px; color:${isHungry ? '#BE123C' : '#334155'}; margin-top:2px; font-weight:${isHungry ? '700' : '400'};">
                      ${isHungry ? '⏸️ Tạm ngưng (+0 Tốc độ, +0⭐ do Đói)' : `⚡ +${stageDef.speedBonus} Tốc độ | ⭐ +${stageDef.starBonus} Sao ${isEquipped ? '(Đang kích hoạt)' : '(Chọn Đồng Hành để bật)'}`}
                    </div>
                    <div style="font-size:10.5px; color:#64748B;">${xpText}</div>
                    <div style="font-size:10.5px; color:${isHungry ? '#E11D48' : '#059669'}; font-weight:700;">
                      ${isHungry ? '❗ ĐÓI BỤNG (0%) — Hãy cho ăn ngay!' : `😋 Độ no: ${Math.round(pet.hunger)}% (-${sp.hungerDecayPerMin}%/p khi đi cùng)`}
                    </div>
                  ` : `
                    <div style="font-size:11px; color:#B45309; margin-top:3px;">🔥 Độ ấm ấp nở: <b>${Math.round(pet.hatchProgress)}%</b></div>
                    <div style="height:8px; background:#E2E8F0; border-radius:99px; overflow:hidden; margin-top:3px; border:1px solid #CBD5E1;">
                      <div style="height:100%; width:${Math.min(100, pet.hatchProgress)}%; background:linear-gradient(90deg,#F59E0B,#EC4899);"></div>
                    </div>
                  `}
                </div>
              </div>
              <div style="display:flex; flex-direction:column; gap:6px; margin-top:4px;">
                ${actionHtml}
                <button type="button" class="btn btn-sm ${isEquipped ? 'btn-purple' : ''}" style="${isEquipped ? '' : 'background:#475569;'}" onclick="equipOwnedPet('${pet.id}')">
                  ${isEquipped ? '✨ Đang Đồng Hành (Bấm để cất)' : '🐾 Chọn Đồng Hành'}
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function exitPrivateRoomToHallway() {
    const user = getCurrentUser();
    const roomId = user.privateRoomId || activePrivateRoomId;
    const room = getHouseRooms().find((r) => r.id === roomId);
    controller3d?.clearTapTarget();
    user.scene = 'house';
    user.privateRoomId = null;
    activePrivateRoomId = null;
    if (room) {
      user.x = room.doorSide === 'right' ? 525 : 595;
      user.y = room.y + room.h - 45;
      user.dir = room.doorSide === 'right' ? 'right' : 'left';
    } else {
      user.x = 560;
      user.y = 450;
    }
    AudioEngine.playClick();
    showToast('🚪 Bạn đã ra hành lang cầu thang!');
    syncPrivateRoomToolbar();
    updateHUD();
    saveGame();
  }

  function enterPrivateRoomScene(room: HouseRoomDef) {
    const user = getCurrentUser();
    controller3d?.clearTapTarget();
    activePrivateRoomId = room.id;
    user.scene = 'private_room';
    user.privateRoomId = room.id;
    user.x = room.doorSide === 'right' ? PRIVATE_ROOM_WORLD.width - 58 : 58;
    user.y = 310;
    user.dir = room.doorSide === 'right' ? 'left' : 'right';
    AudioEngine.playSuccess();
    showToast(`🚪 Bạn đã bước vào ${room.name}!`);
    syncPrivateRoomToolbar();
    updateHUD();
    saveGame();
  }

  function renderPrivateRoomSlotBar(overviewMode = false) {
    const user = getCurrentUser();
    const room = getActivePrivateRoom();
    if (!room) return;
    const owner = (room.ownerIds && state.members.find((m) => m.id === room.ownerIds[0])) || user;
    ensureMemberProps(owner);
    if (!owner.roomSlots) owner.roomSlots = {};
    if (!owner.roomSlotSpecs) owner.roomSlotSpecs = {};
    const titleEl = document.getElementById('slot-picker-title');
    const instrEl = document.getElementById('pr-slot-instruction');
    const bar = document.getElementById('pr-slot-items-bar');
    if (!bar) return;

    if (overviewMode) {
      const placedTotal = ROOM_DECOR_SLOTS.filter((s) => Boolean(owner.roomSlots![s.id])).length;
      if (titleEl) titleEl.innerText = `📌 ${ROOM_DECOR_SLOTS.length} Vị Trí Trang Trí (${placedTotal}/${ROOM_DECOR_SLOTS.length})`;
      if (instrEl) {
        instrEl.innerHTML = `Chọn vị trí để trang trí hoặc bấm <b>🎒 Cất vào túi</b> để thu hồi vật phẩm về Túi đồ:`;
      }
      bar.innerHTML = ROOM_DECOR_SLOTS.map((slot) => {
        const placedId = owner.roomSlots![slot.id];
        const placedCat = placedId ? findAnyCatalogItem(placedId) : null;
        return `
          <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; width:100%; padding:7px 10px; border-radius:10px; border:2px solid ${placedId ? '#0D9488' : '#CBD5E1'}; background:${placedId ? '#F0FDFA' : '#F8FAFC'};">
            <div style="display:flex; align-items:center; gap:8px; min-width:0; flex:1;">
              ${placedId
                ? `<div style="flex-shrink:0; width:34px; height:34px; display:flex; align-items:center; justify-content:center; background:#FFF; border-radius:8px; border:1px solid #99F6E4;">${renderItemIllustrationSVG(placedId, 30, findAnyCatalogItem)}</div>`
                : `<div style="flex-shrink:0; width:34px; height:34px; display:flex; align-items:center; justify-content:center; background:#E2E8F0; border-radius:8px; font-size:16px;">📍</div>`}
              <div style="min-width:0;">
                <div style="font-weight:700; font-size:12px; color:#0F172A;">${escapeHtml(slot.label)}</div>
                <div style="font-size:11px; color:${placedId ? '#0F766E' : '#64748B'}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                  ${placedId ? escapeHtml(placedCat?.name || placedId) : 'Còn trống'}
                </div>
              </div>
            </div>
            <div style="display:flex; gap:4px; flex-shrink:0;">
              ${placedId ? `<button type="button" class="btn btn-sm btn-danger" onclick="pickupDecorFromRoomSlot('${slot.id}', true)">🎒 Cất vào túi</button>` : ''}
              <button type="button" class="btn btn-sm btn-accent" onclick="selectRoomSlotAndOpenPicker('${slot.id}')">${placedId ? 'Đổi' : 'Đặt đồ'}</button>
            </div>
          </div>
        `;
      }).join('');
      return;
    }

    const slotDef = ROOM_DECOR_SLOTS.find((s) => s.id === selectedRoomSlotId) || ROOM_DECOR_SLOTS[0];
    const currentAssignedId = owner.roomSlots[slotDef.id] || null;
    const currentAssignedCat = currentAssignedId ? findAnyCatalogItem(currentAssignedId) : null;
    if (titleEl) titleEl.innerText = `📌 ${slotDef.label}`;
    if (instrEl) {
      instrEl.innerHTML = `Chọn vật phẩm từ túi đồ để đặt tại <b style="color:#E67E22;">${slotDef.label}</b> (số lượng trong túi sẽ giảm 1 khi đặt):`;
    }

    let html = '';
    if (currentAssignedId) {
      html += `
        <div style="width:100%; background:#F0FDFA; border:2px solid #0D9488; border-radius:10px; padding:8px 10px; display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:4px;">
          <div style="display:flex; align-items:center; gap:8px; min-width:0;">
            <div style="flex-shrink:0;">${renderItemIllustrationSVG(currentAssignedId, 34, findAnyCatalogItem)}</div>
            <div style="min-width:0;">
              <div style="font-size:10.5px; color:#0F766E; font-weight:700;">Đang đặt tại đây:</div>
              <div style="font-weight:700; font-size:12.5px; color:#0F172A; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(currentAssignedCat?.name || currentAssignedId)}</div>
            </div>
          </div>
          <button type="button" class="btn btn-sm btn-danger" style="flex-shrink:0;" onclick="pickupDecorFromRoomSlot('${slotDef.id}', false)">🎒 Cất lại vào túi</button>
        </div>
      `;
    }

    const groupedShop = new Map<string, { item: any; count: number }>();
    owner.inventory.forEach((id) => {
      const cat = SHOP_CATALOG.find((i) => i.id === id && i.category === 'decor');
      if (!cat) return;
      const prev = groupedShop.get(id);
      if (prev) prev.count += 1;
      else groupedShop.set(id, { item: cat, count: 1 });
    });
    const ownedDecors: Array<{ item: any; count: number }> = [
      ...Array.from(groupedShop.values()),
      ...(owner.customLabItems || []).map((lab) => ({ item: lab, count: 1 }))
    ];

    if (ownedDecors.length === 0) {
      html += `<span style="font-size:12.5px; color:#666;">Túi đồ chưa có vật phẩm trang trí. Hãy mua tại <b>🏪 Siêu thị</b> hoặc chế tạo ở <b>🧪 Phòng Thí Nghiệm</b>!</span>`;
    } else {
      html += ownedDecors
        .map(({ item: d, count }) => {
          const sizeTag = d.labSpec?.sizeTier ? LAB_SIZE_TIERS[d.labSpec.sizeTier as LabSizeTier]?.label : '';
          return `
            <button type="button" onclick="assignDecorToRoomSlot('${d.id}')" style="display:flex; align-items:center; gap:8px; width:100%; text-align:left; padding:7px 10px; border-radius:10px; border:2px solid #2C3E50; background:#FFFFFF; cursor:pointer;">
              <div style="flex-shrink:0; width:38px; height:38px; display:flex; align-items:center; justify-content:center; background:#F8FAFC; border-radius:8px; border:1px solid #CBD5E1;">
                ${renderItemIllustrationSVG(d.id, 34, findAnyCatalogItem)}
              </div>
              <div style="flex:1; min-width:0;">
                <div style="font-weight:700; font-size:12.5px; color:#1E293B; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                  ${escapeHtml(d.name)} ${count > 1 ? `<span style="color:#0284C7;">(x${count})</span>` : ''}
                </div>
                ${sizeTag ? `<div style="font-size:10.5px; color:#0284C7; font-weight:700;">📏 Cỡ: ${sizeTag}</div>` : ''}
              </div>
              <span style="font-size:11px; font-weight:700; color:#0D9488; flex-shrink:0;">+ Đặt</span>
            </button>
          `;
        })
        .join('');
    }
    bar.innerHTML = html;
  }

  // Expose all legacy inline HTML handlers to window
  const w = window as unknown as Record<string, any>;
  w.openModal = openModal;
  w.openTasksModal = () => openModal('tasks-modal');
  w.closeModal = closeModal;
  w.openReactModal = openReactModal;
  w.toggleMinimapCollapsed = (nextState?: boolean) => {
    AudioEngine.playClick();
    minimapCollapsed = typeof nextState === 'boolean' ? nextState : !minimapCollapsed;
    try {
      localStorage.setItem('b2ks_minimap_collapsed', minimapCollapsed ? '1' : '0');
    } catch {
      // ignore
    }
  };
  w.toggleMinimapMode = () => {
    AudioEngine.playClick();
    minimapOrientMode = minimapOrientMode === 'camera' ? 'heading' : 'camera';
    try {
      localStorage.setItem('b2ks_minimap_mode', minimapOrientMode);
    } catch {
      // ignore
    }
    syncMinimapToolbarUI();
    showToast(
      minimapOrientMode === 'camera'
        ? '🎥 Minimap: Khớp đúng góc nhìn 3D ngoài map lớn'
        : '🧭 Minimap: Xoay bản đồ theo hướng nhân vật'
    );
  };
  w.zoomMinimap = (deltaStep: number) => {
    AudioEngine.playClick();
    minimapZoomIdx = Math.max(0, Math.min(MINIMAP_ZOOM_STEPS.length - 1, minimapZoomIdx + deltaStep));
    try {
      localStorage.setItem('b2ks_minimap_zoom_idx', String(minimapZoomIdx));
    } catch {
      // ignore
    }
    syncMinimapToolbarUI();
  };
  w.startAudioOnce = () => AudioEngine.init();
  w.toggleAudio = () => {
    AudioEngine.toggleMute();
  };
  w.changeZoom = (delta: number) => {
    AudioEngine.playClick();
    zoomLevel = Math.max(0.55, Math.min(2.2, +(zoomLevel + delta).toFixed(2)));
    controller3d?.setZoom(zoomLevel);
    const btn = document.getElementById('zoom-level-btn');
    if (btn) btn.innerText = `${Math.round(zoomLevel * 100)}%`;
  };
  w.resetZoom = () => {
    AudioEngine.playClick();
    zoomLevel = 1.0;
    controller3d?.setZoom(1.0);
    const btn = document.getElementById('zoom-level-btn');
    if (btn) btn.innerText = '100%';
  };
  const syncCameraModeUI = (mode?: string) => {
    const curMode = mode || (controller3d ? controller3d.getCameraMode() : (typeof localStorage !== 'undefined' && localStorage.getItem('b2ks_camera_mode_v1') === 'perspective' ? 'perspective' : 'ortho'));
    const btn = document.getElementById('camera-mode-btn');
    if (btn) {
      const isPersp = curMode === 'perspective';
      btn.innerText = isPersp ? '3D' : 'ISO';
      btn.classList.toggle('sky', isPersp);
      btn.title = isPersp
        ? 'Đang dùng Phối cảnh XCity — bấm để về Isometric 45°'
        : 'Đang dùng Isometric 45° — bấm để sang Phối cảnh XCity';
    }
    const resetBtn = document.getElementById('camera-reset-btn');
    if (resetBtn) {
      resetBtn.title = curMode === 'perspective'
        ? 'Khóa lại góc Phối cảnh XCity theo nhân vật'
        : 'Khóa lại góc Isometric 45° theo nhân vật';
    }
  };
  w.toggleCameraViewMode = () => {
    AudioEngine.playClick();
    if (!controller3d) return;
    const next = controller3d.toggleCameraMode();
    syncCameraModeUI(next);
    showToast(
      next === 'perspective'
        ? '🏙️ Đã chuyển sang góc nhìn Phối cảnh 3D (XCity)'
        : '📐 Đã chuyển về góc nhìn Isometric 45°'
    );
  };
  w.resetCameraView = () => {
    AudioEngine.playClick();
    zoomLevel = 1.0;
    controller3d?.resetCamera();
    const btn = document.getElementById('zoom-level-btn');
    if (btn) btn.innerText = '100%';
  };
  w.requestParentAccess = requestParentAccess;
  w.toggleMemberDropdown = (e: Event) => {
    if (e) e.stopPropagation();
    AudioEngine.playClick();
    const menu = document.getElementById('member-dropdown-menu');
    if (!menu) return;
    if (!menu.classList.contains('open')) {
      renderMemberDropdownList();
      menu.classList.add('open');
    } else {
      menu.classList.remove('open');
    }
  };
  w.openSmartphoneModal = openSmartphoneModal;
  w.toggleSmartphoneChannelMenu = () => {
    AudioEngine.playClick();
    smartphoneChannelMenuOpen = !smartphoneChannelMenuOpen;
    renderSmartphoneScreen();
  };
  w.switchSmartphoneView = (viewName: 'home' | 'messenger' | 'tasks' | 'maps' | 'robot', targetId?: string) => {
    AudioEngine.playClick();
    smartphoneCurrentView = viewName;
    smartphoneChannelMenuOpen = false;
    if (targetId) {
      if (viewName === 'robot') smartphoneRobotChildId = targetId;
      else smartphoneChatTargetId = targetId;
    }
    renderSmartphoneScreen();
  };
  w.selectPhoneRobotChild = (childId: string) => {
    AudioEngine.playClick();
    smartphoneRobotChildId = childId;
    renderSmartphoneScreen();
  };
  w.setPhoneRobotSkin = (childId: string, skinId: RobotSkinId) => {
    if (!isParent(getCurrentUser())) return;
    const child = state.members.find((m) => m.id === childId && !isParent(m));
    if (!child) return;
    ensureMemberProps(child);
    const now = Date.now();
    child.helperRobot!.skin = skinId;
    child.helperRobot!.updatedAt = now;
    child.memberUpdatedAt = now;
    AudioEngine.playSuccess();
    const skLabel = ROBOT_SKIN_OPTIONS.find((s) => s.id === skinId)?.name || skinId;
    showToast(`🤖 Đã đổi Robot của ${child.name} sang mẫu ${skLabel}!`);
    saveGame(true);
    renderSmartphoneScreen();
  };
  w.addPhoneRobotReminder = (childId: string) => {
    if (!isParent(getCurrentUser())) return;
    const child = state.members.find((m) => m.id === childId && !isParent(m));
    if (!child) return;
    ensureMemberProps(child);
    const text = (document.getElementById('phone-robot-text') as HTMLInputElement | null)?.value.trim() || '';
    const startRaw = (document.getElementById('phone-robot-start') as HTMLInputElement | null)?.value || '';
    const endRaw = (document.getElementById('phone-robot-end') as HTMLInputElement | null)?.value || '';
    const startAt = parseDeadlineValue(startRaw);
    const endAt = parseDeadlineValue(endRaw);
    if (!text) {
      AudioEngine.playError();
      return showToast('⚠️ Nhập nội dung nhắc nhở cho Robot!');
    }
    if (!startAt || !endAt || endAt <= startAt) {
      AudioEngine.playError();
      return showToast('⚠️ Thời gian kết thúc phải lớn hơn thời gian bắt đầu!');
    }
    const overlap = (child.helperRobot!.reminders || []).find((r) => !(endAt <= r.startAt || startAt >= r.endAt));
    if (overlap) {
      AudioEngine.playError();
      return showToast(`❌ Trùng khung giờ với nhắc nhở "${overlap.text}"! Vui lòng chọn giờ không trùng.`);
    }
    const now = Date.now();
    child.helperRobot!.reminders.push({
      id: `rem_${now}_${Math.random().toString(36).slice(2, 6)}`,
      text,
      startAt,
      endAt,
      createdBy: getCurrentUser().id
    });
    child.helperRobot!.reminders.sort((a, b) => a.startAt - b.startAt);
    child.helperRobot!.updatedAt = now;
    child.memberUpdatedAt = now;
    AudioEngine.playSuccess();
    showToast(`✅ Đã thêm lịch nhắc Robot cho ${child.name}!`);
    saveGame(true);
    renderSmartphoneScreen();
  };
  w.deletePhoneRobotReminder = (childId: string, reminderId: string) => {
    if (!isParent(getCurrentUser())) return;
    const child = state.members.find((m) => m.id === childId && !isParent(m));
    if (!child) return;
    ensureMemberProps(child);
    child.helperRobot!.reminders = child.helperRobot!.reminders.filter((r) => r.id !== reminderId);
    const now = Date.now();
    child.helperRobot!.updatedAt = now;
    child.memberUpdatedAt = now;
    AudioEngine.playClick();
    showToast(`🗑️ Đã xóa lịch nhắc nhở của ${child.name}.`);
    saveGame(true);
    renderSmartphoneScreen();
  };
  w.renderSmartphoneScreen = renderSmartphoneScreen;
  w.setNavigationTarget = (locId: string) => {
    const loc = resolveNeighborhoodLocations(state).find((l) => l.id === locId);
    if (!loc) return;
    AudioEngine.playSuccess();
    activeNavTargetId = locId;
    const me = getCurrentUser();
    if (me.scene !== 'neighborhood') {
      showToast(`🧭 Đã đặt chỉ đường tới ${loc.name}! Hãy bước ra Khu phố để xem mũi tên trên Minimap!`);
    } else {
      showToast(`🧭 Đã bật mũi tên chỉ đường tới ${loc.name} trên Minimap!`);
    }
    updateHUD();
    renderSmartphoneScreen();
  };
  w.cancelNavigationTarget = () => {
    AudioEngine.playClick();
    activeNavTargetId = null;
    const banner = document.getElementById('minimap-nav-banner');
    if (banner) banner.style.display = 'none';
    showToast('✖ Đã hủy chỉ đường.');
    updateHUD();
  };
  w.openPetCollectionModal = () => {
    petModalMode = 'hud_collection';
    petShopTab = 'my_pets';
    openModal('pet-shop-modal');
  };
  w.navigateToPetShopFromHud = () => {
    closeModal('pet-shop-modal');
    w.setNavigationTarget('pet_shop');
  };
  w.switchPetShopTab = (tab: 'eggs' | 'food' | 'accessories' | 'my_pets') => {
    if (petModalMode === 'hud_collection') return;
    AudioEngine.playClick();
    petShopTab = tab;
    renderPetShopModal();
  };
  w.buyPetEgg = (speciesId: string) => {
    const user = getCurrentUser();
    ensureMemberProps(user);
    const sp = getPetSpecies(speciesId);
    if (user.points < sp.eggPrice) {
      AudioEngine.playError();
      return showToast(`❌ Bạn cần ${sp.eggPrice}⭐ để nhận ${sp.eggName}! Cố gắng làm thêm nhiệm vụ nhé!`);
    }
    user.points -= sp.eggPrice;
    const now = Date.now();
    user.memberUpdatedAt = now;
    const newPet: OwnedPet = {
      id: `pet_${now}_${Math.random().toString(36).slice(2, 6)}`,
      speciesId: sp.id,
      nickname: sp.name,
      hatched: false,
      hatchProgress: 0,
      xp: 0,
      level: 1,
      stage: 0,
      hunger: 100,
      lastFedAt: now,
      obtainedAt: now
    };
    user.pets!.unshift(newPet);
    if (!user.activePetId) user.activePetId = newPet.id;
    logActivity({
      memberId: user.id,
      memberName: user.name,
      action: 'pet_adopt',
      detail: `Đổi ${sp.eggPrice}⭐ nhận ${sp.eggName}`
    });
    AudioEngine.playCoin();
    triggerSpeechBubble(user, `Yay! Got ${sp.eggName}! 🥚✨`, true);
    showToast(`🥚 Đã nhận ${sp.eggName}! Chuyển sang tab Bộ Sưu Tập để ủ ấm & ấp nở nhé!`);
    petShopTab = 'my_pets';
    updateHUD();
    renderPetShopModal();
    saveGame();
  };
  w.buyPetFood = (foodId: string) => {
    const user = getCurrentUser();
    ensureMemberProps(user);
    const fd = getPetFoodDef(foodId);
    if (user.points < fd.price) {
      AudioEngine.playError();
      return showToast(`❌ Cần ${fd.price}⭐ để mua ${fd.name}!`);
    }
    user.points -= fd.price;
    user.memberUpdatedAt = Date.now();
    user.petFoodInventory![fd.id] = (user.petFoodInventory![fd.id] || 0) + 1;
    AudioEngine.playCoin();
    showToast(`🍖 Đã mua 1x ${fd.name}!`);
    updateHUD();
    renderPetShopModal();
    saveGame();
  };
  w.warmPetEgg = (petId: string) => {
    const now = Date.now();
    if (now - lastEggWarmAt < 1200) return showToast('⏳ Chờ 1 giây để trứng hấp thụ hơi ấm nhé!');
    lastEggWarmAt = now;
    const user = getCurrentUser();
    ensureMemberProps(user);
    const pet = user.pets!.find((p) => p.id === petId);
    if (!pet || pet.hatched) return;
    pet.hatchProgress = Math.min(100, (pet.hatchProgress || 0) + 35);
    user.memberUpdatedAt = now;
    AudioEngine.playSuccess();
    showToast(
      pet.hatchProgress >= 100
        ? '✨ Trứng đã nứt vỏ 100%! Bấm NỞ TRỨNG NGAY!'
        : `🔥 Trứng ấm lên rồi (${Math.round(pet.hatchProgress)}%)!`
    );
    renderPetShopModal();
    saveGame();
  };
  w.buyPetAccessory = (accId: string) => {
    const user = getCurrentUser();
    ensureMemberProps(user);
    const acc = getPetAccessoryDef(accId);
    if (!acc) return;
    if (user.petAccessories!.includes(acc.id)) {
      return showToast(`ℹ️ Bạn đã sở hữu ${acc.name} rồi! Mở Bộ Sưu Tập để đeo cho thú cưng nhé!`);
    }
    if (user.points < acc.price) {
      AudioEngine.playError();
      return showToast(`❌ Cần ${acc.price}⭐ để mua ${acc.name}!`);
    }
    user.points -= acc.price;
    user.memberUpdatedAt = Date.now();
    user.petAccessories!.push(acc.id);
    AudioEngine.playCoin();
    showToast(`🎀 Đã mua ${acc.name}! Vào Bộ Sưu Tập để đeo cho thú cưng nhé!`);
    updateHUD();
    renderPetShopModal();
    saveGame();
  };
  w.equipPetAccessory = (petId: string, accId: string) => {
    const user = getCurrentUser();
    ensureMemberProps(user);
    const pet = user.pets!.find((p) => p.id === petId && p.hatched);
    if (!pet) return;
    if (!accId) {
      pet.accessoryId = null;
      AudioEngine.playClick();
      showToast(`🎀 Đã tháo phụ kiện của ${pet.nickname}.`);
    } else if (user.petAccessories!.includes(accId)) {
      pet.accessoryId = accId;
      const ad = getPetAccessoryDef(accId);
      AudioEngine.playSuccess();
      showToast(`✨ Đã đeo ${ad?.icon || '🎀'} ${ad?.name || 'phụ kiện'} cho ${pet.nickname}!`);
    }
    user.memberUpdatedAt = Date.now();
    updateHUD();
    renderPetShopModal();
    saveGame();
  };
  w.renameOwnedPet = (petId: string) => {
    const user = getCurrentUser();
    ensureMemberProps(user);
    const pet = user.pets!.find((p) => p.id === petId);
    if (!pet) return;
    const inp = document.getElementById(`pet-name-input-${petId}`) as HTMLInputElement | null;
    const nextName = (inp?.value || '').trim();
    if (!nextName) return showToast('⚠️ Tên thú cưng không được để trống!');
    pet.nickname = nextName.slice(0, 20);
    user.memberUpdatedAt = Date.now();
    AudioEngine.playSuccess();
    showToast(`✏️ Đã đổi tên thú cưng thành "${pet.nickname}"!`);
    updateHUD();
    renderPetShopModal();
    saveGame();
  };
  w.hatchOwnedPet = (petId: string) => {
    const user = getCurrentUser();
    ensureMemberProps(user);
    const pet = user.pets!.find((p) => p.id === petId);
    if (!pet || pet.hatched || pet.hatchProgress < 100) return;
    const sp = getPetSpecies(pet.speciesId);
    const rolled = rollPetHatchTraits();
    const vDef = getPetVariantDef(rolled.variant);
    pet.hatched = true;
    pet.stage = 1;
    pet.level = 1;
    pet.hunger = 100;
    pet.gender = rolled.gender;
    pet.variant = rolled.variant;
    user.activePetId = pet.id;
    user.memberUpdatedAt = Date.now();
    AudioEngine.playSuccess();
    triggerConfetti();
    triggerSpeechBubble(user, `Welcome ${pet.nickname}! 🐣💖`, true);
    showToast(
      `🐣 CHÚC MỪNG! Trứng nở thành ${sp.stages[1].title} (${rolled.gender === 'male' ? '♂️ Đực' : '♀️ Cái'} • Màu ${vDef.label})!`
    );
    evaluateAndUnlockMemberBadges(user);
    updateHUD();
    renderPetShopModal();
    saveGame();
  };
  w.feedOwnedPet = (petId: string, foodId: string) => {
    const user = getCurrentUser();
    ensureMemberProps(user);
    const pet = user.pets!.find((p) => p.id === petId && p.hatched);
    if (!pet) return;
    const count = user.petFoodInventory![foodId] || 0;
    if (count <= 0) return showToast('⚠️ Hết loại thức ăn này rồi!');
    const fd = getPetFoodDef(foodId);
    const sp = getPetSpecies(pet.speciesId);
    const oldStage = pet.stage;
    const now = Date.now();

    user.petFoodInventory![foodId] = count - 1;
    pet.xp += fd.xpGain;
    pet.hunger = Math.min(100, (pet.hunger || 50) + fd.hungerGain);
    pet.lastFedAt = now;
    pet.level = getPetLevelFromXp(pet.xp);
    pet.stage = computePetStageFromXp(sp, pet.xp, true);
    user.memberUpdatedAt = now;

    if (pet.stage > oldStage) {
      const stageDef = sp.stages.find((s) => s.stage === pet.stage) || sp.stages[1];
      AudioEngine.playSuccess();
      triggerConfetti();
      triggerSpeechBubble(user, `${pet.nickname} evolved to ${stageDef.title}! 🌟🔥`, true);
      showToast(`🎆 TIẾN HÓA! ${pet.nickname} đã trưởng thành thành "${stageDef.title}" (+${stageDef.speedBonus} Tốc độ, +${stageDef.starBonus}⭐)!`);
      logActivity({
        memberId: user.id,
        memberName: user.name,
        action: 'pet_evolve',
        detail: `${pet.nickname} tiến hóa lên GĐ${pet.stage}: ${stageDef.title}`
      });
    } else {
      AudioEngine.playCoin();
      showToast(`🍖 Đã cho ${pet.nickname} ăn ${fd.name} (+${fd.xpGain} XP • Lv.${pet.level})!`);
    }
    updateHUD();
    renderPetShopModal();
    saveGame();
  };
  w.equipOwnedPet = (petId: string) => {
    const user = getCurrentUser();
    ensureMemberProps(user);
    const pet = user.pets!.find((p) => p.id === petId);
    if (!pet) return;
    if (user.activePetId === pet.id) {
      user.activePetId = 'none';
      AudioEngine.playClick();
      showToast(`💤 Đã cất ${pet.nickname} nghỉ ngơi.`);
    } else {
      user.activePetId = pet.id;
      AudioEngine.playClick();
      showToast(`🐾 Đã chọn ${pet.nickname} đồng hành bên cạnh bạn!`);
    }
    user.memberUpdatedAt = Date.now();
    updateHUD();
    renderPetShopModal();
    saveGame();
  };
  w.toggleHudTools = () => {
    AudioEngine.playClick();
    hudToolsExpanded = !hudToolsExpanded;
    syncHudToolsVisibility();
  };
  w.openParentMiniWindow = () => {
    if (window.__OPEN_PARENT_MINI__) {
      window.__OPEN_PARENT_MINI__();
    } else {
      showToast('⏳ Hệ thống Mini Window đang tải, thử lại sau 1 giây nhé!');
    }
  };
  w.sendSmartphoneMessage = () => {
    const inp = document.getElementById('phone-msg-input') as HTMLInputElement | null;
    if (!inp) return;
    const text = inp.value.trim();
    if (!text) return;
    const me = getCurrentUser();
    if (!Array.isArray(state.familyMessages)) state.familyMessages = [];
    (state.familyMessages as any[]).push({
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      senderId: me.id,
      senderName: me.name,
      recipientId: smartphoneChatTargetId || 'family_group',
      text,
      ts: Date.now(),
      readBy: [me.id]
    });
    pruneExpiredFamilyMessages();
    AudioEngine.playClick();
    inp.value = '';
    saveGame();
    renderSmartphoneScreen();
  };
  w.togglePhoneHomeworkUpload = () => {
    const typeEl = document.getElementById('phone-task-type') as HTMLSelectElement | null;
    const grp = document.getElementById('phone-parent-file-group');
    const assigneeEl = document.getElementById('phone-task-assignee');
    if (grp && typeEl) grp.style.display = typeEl.value === 'homework' ? 'block' : 'none';
    if (assigneeEl && typeEl) assigneeEl.style.display = typeEl.value === 'family_quest' ? 'none' : 'block';
  };
  w.createTaskFromSmartphone = () => {
    const user = getCurrentUser();
    if (!isParent(user)) return;
    const type = ((document.getElementById('phone-task-type') as HTMLSelectElement)?.value || 'chore') as TaskItem['type'];
    const assigneeId = (document.getElementById('phone-task-assignee') as HTMLSelectElement)?.value || '';
    const title = (document.getElementById('phone-task-title') as HTMLInputElement)?.value.trim() || '';
    const reward = parseInt((document.getElementById('phone-task-reward') as HTMLInputElement)?.value || '0', 10) || 0;
    const deadline = parseDeadlineValue((document.getElementById('phone-task-deadline') as HTMLInputElement)?.value);
    if (!title) return showToast('⚠️ Vui lòng nhập tên nhiệm vụ!');

    if (type === 'family_quest') {
      const kids = state.members.filter((m) => !isParent(m));
      const participantIds = kids.map((k) => k.id);
      const totalCost = reward * participantIds.length;
      if (participantIds.length < 2) {
        AudioEngine.playError();
        return showToast('⚠️ Cần ít nhất 2 bé để giao Nhiệm Vụ Đồng Đội!');
      }
      if (reward <= 0 || user.points < totalCost) {
        AudioEngine.playError();
        return showToast(`❌ Cần ${totalCost}⭐ ngân sách (${reward}⭐/bé)!`);
      }
      user.points -= totalCost;
      const progressMap: Record<string, 'pending' | 'done'> = {};
      participantIds.forEach((id) => { progressMap[id] = 'pending'; });
      state.tasks.push({
        id: Date.now(), type: 'family_quest', title, creatorId: user.id,
        assigneeId: participantIds[0], participantIds, progressMap,
        reward, status: 'pending', createdAt: Date.now(), completedAt: null, deadline
      });
      state.tasksUpdatedAt = Date.now();
      syncSeenTasksBaseline();
      AudioEngine.playSuccess();
      showToast(`🤝 Đã giao Nhiệm Vụ Đồng Đội (-${totalCost}⭐)!`);
      lastHudSignature = '';
      updateHUD();
      renderSmartphoneScreen();
      saveGame();
      return;
    }

    if (!assigneeId) {
      AudioEngine.playError();
      return showToast('⚠️ Gia đình chưa có thành viên con! Hãy vào Bảng Phụ Huynh để thêm con trước.');
    }
    if (reward <= 0 || user.points < reward) {
      AudioEngine.playError();
      return showToast(`❌ Không đủ điểm ngân sách!`);
    }
    const fileInput = document.getElementById('phone-task-parent-file') as HTMLInputElement | null;
    const finalize = (fileData: string | null, fileName: string) => {
      user.points -= reward;
      state.tasks.push({
        id: Date.now(), type, title, creatorId: user.id, assigneeId, reward,
        status: 'pending', createdAt: Date.now(), completedAt: null, deadline,
        parentFile: fileData, parentFileName: fileName, childFile: null, childFileName: '', childNote: '', grade: null
      });
      state.tasksUpdatedAt = Date.now();
      syncSeenTasksBaseline();
      AudioEngine.playSuccess();
      showToast(`✅ Đã giao nhiệm vụ (-${reward}⭐ ngân sách)`);
      lastHudSignature = '';
      updateHUD();
      renderSmartphoneScreen();
      saveGame();
    };
    if (type === 'homework' && fileInput && fileInput.files && fileInput.files[0]) {
      const f = fileInput.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => finalize((ev.target?.result as string) || null, f.name);
      reader.readAsDataURL(f);
    } else finalize(null, '');
  };

  w.toggleTaskNotifications = async () => {
    AudioEngine.init();
    AudioEngine.playClick();
    const curStatus = getNotificationStatus();
    if (!curStatus.supported) {
      showToast('⚠️ Trình duyệt hiện tại chưa hỗ trợ thông báo OS (trên iPhone hãy cài vào màn hình chính).');
      return;
    }
    if (curStatus.permission === 'granted') {
      const nextEnabled = !curStatus.enabled;
      localStorage.setItem('b2ks_task_notif_enabled', nextEnabled ? '1' : '0');
      updateNotificationHudUI();
      if (nextEnabled) {
        AudioEngine.playNotificationChime();
        showToast('🔔 Đã bật thông báo khi có bài tập/nhiệm vụ mới!');
        const brand = (state.familyName || 'Gia Đình').trim() || 'Gia Đình';
        dispatchSystemNotification(`🔔 Đã bật thông báo ${brand}!`, 'Bạn sẽ nhận thông báo khi bố/mẹ giao bài tập mới.', 'b2ks-notif-toggle');
      } else {
        showToast('🔕 Đã tạm tắt thông báo OS (vẫn hiện chấm đỏ trong game).');
      }
    } else {
      const res = await requestNotificationPermission();
      showToast(res.msg);
    }
    const pm = document.getElementById('smartphone-modal');
    if (pm && pm.style.display === 'flex' && smartphoneCurrentView === 'tasks') renderSmartphoneScreen();
  };

  w.toggleChatLog = () => {
    const box = document.getElementById('chat-log-popup');
    if (!box) return;
    box.style.display = box.style.display === 'block' ? 'none' : 'block';
    renderChatLog();
  };
  w.sendChat = () => {
    AudioEngine.init();
    const input = document.getElementById('chat-input') as HTMLInputElement | null;
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    const user = getCurrentUser();
    ensureMemberProps(user);
    const hasVN = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(text);
    const words = text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(Boolean);
    const count = words.filter((wd) => ENGLISH_WORDS.has(wd)).length;
    const isEng = !hasVN && words.length >= 2 && (count >= 2 || (words.length >= 3 && count >= 1));

    if (isEng) {
      speakEnglish(text, 0.9);
      const chatCfg = getActivityConfig('english_chat');
      const now = Date.now();
      const stats = user.englishChatStats!;
      const normPhrase = words.join(' ');
      const cooldownMs = chatCfg.cooldownMs ?? 30000;
      const maxPerDay = chatCfg.maxPerDay ?? 10;

      if (!chatCfg.enabled || chatCfg.reward <= 0) {
        AudioEngine.playClick();
        showToast(`🇬🇧 Đã nói Tiếng Anh (+0⭐ — phần thưởng chat đang tắt).`);
      } else if (isParent(user)) {
        AudioEngine.playSuccess();
        showToast(`🇬🇧 ${user.name} giao tiếp Tiếng Anh mẫu mực!`);
      } else if (normPhrase.length < 6 || new Set(words).size < 2) {
        AudioEngine.playClick();
        showToast(`💡 Hãy dùng ít nhất 2 từ Tiếng Anh khác nhau để nhận +${chatCfg.reward}⭐ (+0⭐)!`);
      } else if (stats.recentPhrases.includes(normPhrase)) {
        AudioEngine.playClick();
        showToast(`🔁 Bạn vừa nói câu này rồi! Hãy thử câu Tiếng Anh mới để nhận ⭐ (+0⭐).`);
      } else if (stats.lastRewardAt > 0 && now - stats.lastRewardAt < cooldownMs) {
        const secsLeft = Math.max(1, Math.ceil((cooldownMs - (now - stats.lastRewardAt)) / 1000));
        AudioEngine.playClick();
        showToast(`⏳ Chờ ${secsLeft}s nữa để nhận +${chatCfg.reward}⭐ khi nói Tiếng Anh (+0⭐)!`);
      } else if (stats.count >= maxPerDay) {
        AudioEngine.playClick();
        showToast(`🎓 Hôm nay đã đạt tối đa ${maxPerDay}/${maxPerDay} lượt thưởng nói Tiếng Anh (+0⭐)!`);
      } else {
        const petBonus = getMemberPetBonuses(user);
        const ptsGain = chatCfg.reward + petBonus.starBonus;
        user.points += ptsGain;
        stats.count += 1;
        stats.lastRewardAt = now;
        stats.recentPhrases.unshift(normPhrase);
        if (stats.recentPhrases.length > 25) stats.recentPhrases.length = 25;
        AudioEngine.playCoin();
        logActivity({
          memberId: user.id,
          memberName: user.name,
          action: 'quiz_done',
          detail: `Nói Tiếng Anh: "${text}" (+${ptsGain}⭐, lượt ${stats.count}/${maxPerDay})`,
          pointsDelta: ptsGain
        });
        showToast(`🇬🇧 ${user.name} +${ptsGain}⭐ (${stats.count}/${maxPerDay} hôm nay)!`);
        updateHUD();
      }
      evaluateAndUnlockMemberBadges(user, text);
    } else AudioEngine.playClick();
    triggerSpeechBubble(user, text, isEng);
    input.value = '';
    saveGame();
  };

  w.enterHouseScene = () => {
    const user = getCurrentUser();
    const { yShift } = getHouseLayoutMetrics();
    controller3d?.clearTapTarget();
    user.scene = 'house';
    user.x = 560;
    user.y = 700 + yShift;
    user.dir = 'up';
    closeModal('house-modal');
    AudioEngine.playSuccess();
    showToast('🏢 Bạn đã vào Nhà Phố Gia Đình!');
    updateHUD();
    saveGame();
  };
  w.toggleHomeworkUpload = toggleHomeworkUpload;
  w.createTask = createTask;
  w.submitChore = submitChore;
  w.approveChore = approveChore;
  w.submitFamilyQuestPart = submitFamilyQuestPart;
  w.approveFamilyQuest = approveFamilyQuest;
  w.deleteTask = deleteTask;
  w.openSubmitHomeworkModal = (taskId: number) => {
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;
    const tEl = document.getElementById('hw-modal-title');
    const bEl = document.getElementById('hw-modal-body');
    if (tEl) tEl.innerText = `📤 Nộp bài: ${task.title}`;
    if (bEl) {
      bEl.innerHTML = `
        <div class="form-group"><label>Câu trả lời / Ghi chú:</label><textarea id="hw-child-note" rows="3"></textarea></div>
        <div class="form-group"><label>Upload ảnh hoặc file:</label><input type="file" id="hw-child-file" accept="image/*,.pdf,.doc,.docx,.txt"></div>
        <button class="btn btn-primary" onclick="submitHomework(${task.id})">Gửi bài cho Bố/Mẹ</button>
      `;
    }
    openModal('hw-action-modal');
  };
  w.submitHomework = (taskId: number) => {
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;
    const note = (document.getElementById('hw-child-note') as HTMLTextAreaElement)?.value.trim() || '';
    const fileInput = document.getElementById('hw-child-file') as HTMLInputElement | null;
    const finish = (fileData: string | null, fileName: string) => {
      const now = Date.now();
      task.childNote = note;
      task.childFile = fileData;
      task.childFileName = fileName;
      task.status = 'submitted';
      task.submittedAt = now;
      state.tasksUpdatedAt = now;
      const u = getCurrentUser();
      logActivity({ memberId: u.id, memberName: u.name, action: 'task_done', detail: `Nộp bài tập: "${task.title}"`, taskId: task.id });
      closeModal('hw-action-modal');
      AudioEngine.playSuccess();
      triggerSpeechBubble(u, 'I finished my homework!', true);
      showToast(task.deadline && now > task.deadline ? '📤 Đã nộp bài (quá hạn: còn 1/3⭐ điểm cơ bản)!' : '📤 Đã nộp bài tập thành công!');
      updateHUD();
      renderTasksModal();
      const pm = document.getElementById('smartphone-modal');
      if (pm && pm.style.display === 'flex') renderSmartphoneScreen();
      saveGame();
    };
    if (fileInput && fileInput.files && fileInput.files[0]) {
      const f = fileInput.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => finish((ev.target?.result as string) || null, f.name);
      reader.readAsDataURL(f);
    } else finish(null, '');
  };
  w.openGradeHomeworkModal = (taskId: number) => {
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;
    const tEl = document.getElementById('hw-modal-title');
    const bEl = document.getElementById('hw-modal-body');
    if (tEl) tEl.innerText = `📝 Chấm bài: ${task.title}`;
    const preview = task.childFile
      ? task.childFile.startsWith('data:image')
        ? `<img src="${task.childFile}" class="preview-img">`
        : `<a href="${task.childFile}" download="${escapeHtml(task.childFileName || '')}" class="btn btn-sm">⬇️ Tải: ${escapeHtml(task.childFileName || '')}</a>`
      : '';
    if (bEl) {
      bEl.innerHTML = `
        <p><b>Bài làm của con:</b> ${escapeHtml(task.childNote || '') || '<i>(Xem file đính kèm)</i>'}</p>
        <div style="margin-bottom:10px;">${preview}</div>
        <div class="form-group"><label>Chấm điểm (Thang 10):</label><input type="number" id="hw-grade-input" min="0" max="10" step="0.5" value="9"></div>
        <button class="btn btn-accent" onclick="gradeHomework(${task.id})">✅ Xác nhận điểm</button>
      `;
    }
    openModal('hw-action-modal');
  };
  w.gradeHomework = (taskId: number) => {
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task || task.status === 'completed') return;
    const grade = Math.min(10, Math.max(0, parseFloat((document.getElementById('hw-grade-input') as HTMLInputElement)?.value || '0') || 0));
    const now = Date.now();
    const isLate = isTaskLateForSettlement(task);
    task.grade = grade;
    task.status = 'completed';
    task.completedAt = now;
    state.tasksUpdatedAt = now;
    const assignee = state.members.find((m) => m.id === task.assigneeId);
    const creator = state.members.find((m) => m.id === task.creatorId);
    const rawEarned = Math.round(task.reward * (grade / 10));
    let earned = isLate ? Math.floor(rawEarned / 3) : rawEarned;
    let parentBonus = 0;
    const hwHighBonusCfg = getActivityConfig('homework_high_bonus');
    if (!isLate && grade >= 8 && hwHighBonusCfg.enabled) {
      earned += hwHighBonusCfg.reward;
      parentBonus = 15;
    }
    if (assignee) {
      ensureMemberProps(assignee);
      const pb = getMemberPetBonuses(assignee);
      earned += pb.starBonus;
      assignee.points += earned;
      assignee.completedTaskCount = (assignee.completedTaskCount || 0) + 1;
      assignee.pointsUpdatedAt = now;
      touchMemberData(assignee, now);
    }
    let actualParentBonus = 0;
    if (creator && parentBonus > 0) {
      actualParentBonus = isParent(creator)
        ? addParentPointsWithAllowanceCap(creator, parentBonus)
        : ((creator.points += parentBonus), parentBonus);
    }
    closeModal('hw-action-modal');
    AudioEngine.playCoin();
    showToast(
      isLate && assignee
        ? `⏰ Nộp quá hạn! Chấm ${grade}/10 — ${assignee.name} nhận 1/3 thưởng: +${earned}⭐!`
        : parentBonus > 0 && assignee
          ? `🌟 Điểm cao ${grade}/10! ${assignee.name} +${earned}⭐${actualParentBonus > 0 ? ` & ${creator?.name} +${actualParentBonus}⭐` : ` (${creator?.name} đã đạt giới hạn tối đa ${getMaxParentPoints()}⭐)`}!`
          : `📝 Đã chấm ${grade}/10!`
    );
    if (assignee) {
      checkAllDailyTasksCompleted(assignee.id);
      evaluateAndUnlockMemberBadges(assignee);
    }
    updateHUD();
    renderTasksModal();
    saveGame();
  };
  w.viewAttachment = (taskId: number, who: 'parent' | 'child') => {
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;
    const data = who === 'parent' ? task.parentFile : task.childFile;
    const name = who === 'parent' ? task.parentFileName : task.childFileName;
    if (!data) return;
    const tEl = document.getElementById('hw-modal-title');
    const bEl = document.getElementById('hw-modal-body');
    if (tEl) tEl.innerText = `📎 ${name || 'Tài liệu'}`;
    if (bEl) {
      bEl.innerHTML = data.startsWith('data:image')
        ? `<img src="${data}" style="max-width:100%; border-radius:8px;">`
        : `<a href="${data}" download="${escapeHtml(name || 'file')}" class="btn btn-primary">⬇️ Tải về</a>`;
    }
    openModal('hw-action-modal');
  };

  w.renderShop = renderShop;
  w.buySupermarketItem = buySupermarketItem;
  w.renderBagModal = (t: string) => {
    pendingBagDeleteKey = null;
    renderBagModal(t);
  };
  w.requestDeleteBagItem = (key: string) => {
    AudioEngine.playClick();
    pendingBagDeleteKey = key;
    renderBagModal(currentBagTab);
  };
  w.cancelDeleteBagItem = () => {
    AudioEngine.playClick();
    pendingBagDeleteKey = null;
    renderBagModal(currentBagTab);
  };
  w.confirmDeleteBagItem = confirmDeleteBagItem;
  w.useVoucher = (idx: number) => {
    const user = getCurrentUser();
    const item = findAnyCatalogItem(user.vouchers[idx]);
    user.vouchers.splice(idx, 1);
    user.memberUpdatedAt = Date.now();
    dirtyMemberIds.add(user.id);
    AudioEngine.playSuccess();
    if (item) triggerSpeechBubble(user, `Dùng phiếu: ${item.name}! 🎉`, false);
    showToast(`🎉 Đã kích hoạt: ${item ? item.name : 'Phiếu'}!`);
    renderBagModal('voucher');
    saveGame();
  };
  w.useTvCardFromBag = () => {
    const user = getCurrentUser();
    ensureMemberProps(user);
    const idx = user.inventory.indexOf('tv_30min');
    if (idx === -1) return showToast('⚠️ Bạn không còn Thẻ xem YouTube nào!');
    user.inventory.splice(idx, 1);
    user.tvBonusSecondsToday = (user.tvBonusSecondsToday || 0) + 1800;
    user.memberUpdatedAt = Date.now();
    dirtyMemberIds.add(user.id);
    AudioEngine.playSuccess();
    showToast('📺 Đã nạp thêm +30 phút xem YouTube hôm nay!');
    saveGame();
    const bagModal = document.getElementById('bag-modal');
    if (bagModal && bagModal.style.display === 'flex') renderBagModal('tv_card');
    const tvModal = document.getElementById('tv-modal');
    if (tvModal && tvModal.style.display === 'flex') updateTvStatusUI();
  };

  w.closeFashionModal = () => {
    tryOnFashionState = { setItem: null, shirtItem: null, pantsItem: null, accItem: null };
    closeModal('fashion-modal');
  };
  w.renderFashionStore = renderFashionStore;
  w.resetFashionTryOn = (reRender = true) => {
    tryOnFashionState = { setItem: null, shirtItem: null, pantsItem: null, accItem: null };
    drawFashionTryOnPreview();
    if (reRender) renderFashionStore(currentFashionTab);
  };
  w.tryOnFashionItem = (itemId: string) => {
    const item = FASHION_CATALOG.find((i) => i.id === itemId);
    if (!item) return;
    AudioEngine.playClick();
    if (item.sub === 'set') {
      tryOnFashionState.setItem = tryOnFashionState.setItem?.id === item.id ? null : item;
      if (tryOnFashionState.setItem) {
        tryOnFashionState.shirtItem = null;
        tryOnFashionState.pantsItem = null;
      }
    } else if (item.sub === 'shirt') {
      tryOnFashionState.shirtItem = tryOnFashionState.shirtItem?.id === item.id ? null : item;
      if (tryOnFashionState.shirtItem) tryOnFashionState.setItem = null;
    } else if (item.sub === 'pants') {
      tryOnFashionState.pantsItem = tryOnFashionState.pantsItem?.id === item.id ? null : item;
      if (tryOnFashionState.pantsItem) tryOnFashionState.setItem = null;
    } else {
      tryOnFashionState.accItem = tryOnFashionState.accItem?.id === item.id ? null : item;
    }
    drawFashionTryOnPreview();
    renderFashionStore(currentFashionTab);
  };
  w.buyFashionItem = (itemId: string) => {
    const user = getCurrentUser();
    const item = FASHION_CATALOG.find((i) => i.id === itemId);
    if (!item || user.points < item.price) {
      AudioEngine.playError();
      return showToast(`❌ Bạn cần ${item ? item.price : 0}⭐ để mua trang phục này!`);
    }
    if (user.inventory.includes(item.id)) return;
    user.points -= item.price;
    user.inventory.push(item.id);
    user.memberUpdatedAt = Date.now();
    dirtyMemberIds.add(user.id);
    AudioEngine.playCoin();
    showToast(`👗 Đã mua ${item.name}! Mở tủ quần áo ở phòng riêng để mặc nhé!`);
    updateHUD();
    renderFashionStore(item.sub);
    saveGame();
  };

  w.selectSalonHair = (style: string) => { AudioEngine.playClick(); salonDraft.hairStyle = style; updateSalonUI(); };
  w.selectSalonColor = (color: string) => { AudioEngine.playClick(); salonDraft.hairColor = color; updateSalonUI(); };
  w.confirmSalonChange = () => {
    const user = getCurrentUser();
    const cost = getSalonCost();
    if (cost === 0) return showToast('ℹ️ Bạn chưa chọn kiểu tóc hoặc màu tóc mới nào!');
    if (user.points < cost) { AudioEngine.playError(); return showToast(`❌ Bạn cần ${cost}⭐!`); }
    user.points -= cost;
    user.hairStyle = salonDraft.hairStyle;
    user.hairColor = salonDraft.hairColor;
    touchMemberData(user);
    AudioEngine.playSuccess();
    triggerSpeechBubble(user, 'Love my new hairstyle! 💇✨', true);
    showToast(`💇 Đã đổi kiểu tóc mới (-${cost}⭐)!`);
    updateHUD();
    updateSalonUI();
    saveGame();
  };

  w.startEnglishGradeQuiz = startEnglishGradeQuiz;
  w.startEnglishGrade6Quiz = startEnglishGradeQuiz;
  w.speakCurrentEnglishQuiz = () => {
    const q = engQuizSession.questions[engQuizSession.currentIndex];
    if (q) speakEnglish(q.q, 0.85);
  };
  w.selectEnglishQuizAnswer = (chosenIdx: number) => {
    if (engQuizSession.answered) return;
    engQuizSession.answered = true;
    const qObj = engQuizSession.questions[engQuizSession.currentIndex];
    const isCorrect = chosenIdx === qObj.ans;
    if (isCorrect) { engQuizSession.score += 1; AudioEngine.playCoin(); }
    else AudioEngine.playError();

    qObj.opts.forEach((_, idx) => {
      const btn = document.getElementById(`eng-opt-${idx}`) as HTMLButtonElement | null;
      if (!btn) return;
      btn.disabled = true;
      if (idx === qObj.ans) { btn.style.background = '#D4EDDA'; btn.style.borderColor = '#27AE60'; btn.style.color = '#145A32'; }
      else if (idx === chosenIdx && !isCorrect) { btn.style.background = '#FADBD8'; btn.style.borderColor = '#E74C3C'; btn.style.color = '#922B21'; }
    });
    const fb = document.getElementById('eng-feedback-box');
    if (fb) {
      fb.style.display = 'block';
      fb.style.background = isCorrect ? '#EAFAF1' : '#FDEDEC';
      fb.style.border = isCorrect ? '2px solid #27AE60' : '2px solid #E74C3C';
      fb.innerHTML = `
        <div style="font-weight:700; color:${isCorrect ? '#1E8449' : '#C0392B'}; margin-bottom:4px;">${isCorrect ? '✅ Chính xác!' : '❌ Chưa đúng rồi!'}</div>
        <div style="color:#2C3E50; margin-bottom:8px;">💡 <b>Giải thích:</b> ${escapeHtml(qObj.exp)}</div>
        <button type="button" class="btn btn-primary btn-sm" onclick="nextEnglishQuizQuestion()">
          ${engQuizSession.currentIndex + 1 < engQuizSession.questions.length ? 'Câu tiếp theo ➔' : 'Xem kết quả & Nhận sao 🏆'}
        </button>
      `;
    }
  };
  w.nextEnglishQuizQuestion = () => {
    AudioEngine.playClick();
    engQuizSession.currentIndex += 1;
    engQuizSession.answered = false;
    renderEnglishQuizQuestion();
  };

  w.switchInventionLabMode = (mode: 'prompt' | 'fusion') => {
    currentLabMode = mode;
    AudioEngine.playClick();
    const promptBtn = document.getElementById('lab-tab-prompt-btn');
    const fusionBtn = document.getElementById('lab-tab-fusion-btn');
    const fusionPanel = document.getElementById('lab-fusion-panel');
    const promptPanel = document.getElementById('lab-prompt-panel');
    const fusionActionBar = document.getElementById('lab-fusion-action-bar');
    if (mode === 'fusion') {
      if (promptBtn) promptBtn.style.background = '#475569';
      if (fusionBtn) fusionBtn.style.background = '#0D9488';
      if (fusionPanel) fusionPanel.style.display = 'block';
      if (promptPanel) promptPanel.style.display = 'none';
      if (fusionActionBar) fusionActionBar.style.display = 'block';
      refreshLabFusionIngredientsUI();
    } else {
      if (promptBtn) promptBtn.style.background = '#0284C7';
      if (fusionBtn) fusionBtn.style.background = '#475569';
      if (fusionPanel) fusionPanel.style.display = 'none';
      if (promptPanel) promptPanel.style.display = 'block';
      if (fusionActionBar) fusionActionBar.style.display = 'none';
    }
  };
  w.syncLabFusionDropdowns = (changedSlot: 'a' | 'b') => {
    const selA = document.getElementById('lab-item-a') as HTMLSelectElement | null;
    const selB = document.getElementById('lab-item-b') as HTMLSelectElement | null;
    if (!selA || !selB || selA.options.length < 2) return;
    if (selA.value === selB.value) {
      const target = changedSlot === 'a' ? selB : selA;
      const otherVal = changedSlot === 'a' ? selA.value : selB.value;
      for (let i = 0; i < target.options.length; i++) {
        if (target.options[i].value !== otherVal) {
          target.selectedIndex = i;
          break;
        }
      }
    }
  };
  w.pickRandomLabIdea = () => {
    AudioEngine.playClick();
    const idea = RANDOM_LAB_IDEAS[Math.floor(Math.random() * RANDOM_LAB_IDEAS.length)];
    const inp = document.getElementById('lab-english-prompt') as HTMLInputElement | null;
    if (inp) { inp.value = idea; inp.focus(); }
  };
  w.fillLabSamplePrompt = (sample: string) => {
    AudioEngine.playClick();
    const inp = document.getElementById('lab-english-prompt') as HTMLInputElement | null;
    if (inp) { inp.value = sample; inp.focus(); }
  };
  w.runInventionLabSynthesis = () => {
    const user = getCurrentUser();
    ensureMemberProps(user);
    const cost = currentLabMode === 'fusion' ? 15 : 10;
    if (user.points < cost) {
      AudioEngine.playError();
      return showToast(`❌ Bạn cần ${cost}⭐ để vận hành máy thí nghiệm!`);
    }

    let itemAId: string | null = null;
    let itemBId: string | null = null;
    let fusionLabel = '';
    let cleanTitle = '';
    let promptForSpec = '';
    let displayPromptText = '';

    if (currentLabMode === 'fusion') {
      const available = getAvailableFusionIngredients(user);
      if (available.length < 2) { AudioEngine.playError(); return showToast('🎒 Cần ít nhất 2 vật phẩm khả dụng!'); }
      const uidA = (document.getElementById('lab-item-a') as HTMLSelectElement)?.value;
      const uidB = (document.getElementById('lab-item-b') as HTMLSelectElement)?.value;
      if (!uidA || !uidB || uidA === uidB) { AudioEngine.playError(); return showToast('⚠️ Chọn 2 vật phẩm khác nhau!'); }
      const foundA = available.find((x) => x.uid === uidA);
      const foundB = available.find((x) => x.uid === uidB);
      if (!foundA || !foundB) { refreshLabFusionIngredientsUI(); return; }

      [foundA, foundB]
        .sort((x, y) => (y.invIndex ?? -1) - (x.invIndex ?? -1))
        .forEach((ing) => {
          if (ing.source === 'inventory') {
            if (user.inventory[ing.invIndex] === ing.itemId) user.inventory.splice(ing.invIndex, 1);
            else {
              const i = user.inventory.indexOf(ing.itemId);
              if (i !== -1) user.inventory.splice(i, 1);
            }
          } else {
            const idx = (user.customLabItems || []).findIndex((x) => x.id === ing.itemId);
            if (idx !== -1) user.customLabItems!.splice(idx, 1);
          }
        });

      itemAId = foundA.itemId;
      itemBId = foundB.itemId;
      fusionLabel = `Hợp nhất từ [${foundA.label}] + [${foundB.label}]`;
      const sA = String(foundA.rawName || 'A').split(/\s+/).slice(0, 2).join(' ');
      const sB = String(foundB.rawName || 'B').split(/\s+/).slice(0, 2).join(' ');
      cleanTitle = `${sA} × ${sB}`;
      promptForSpec = `magical glowing ${foundA.itemId} ${foundB.itemId} ${foundA.rawName} ${foundB.rawName}`;
      displayPromptText = `${foundA.rawName} + ${foundB.rawName}`;
    } else {
      const inp = document.getElementById('lab-english-prompt') as HTMLInputElement | null;
      const rawPrompt = inp ? inp.value.trim() : '';
      const check = isValidEnglishLabPrompt(rawPrompt);
      if (!check.ok) { AudioEngine.playError(); return showToast(check.reason || 'Prompt không hợp lệ'); }
      cleanTitle = rawPrompt
        .replace(/^(a|an|the)\s+/i, '')
        .split(/\s+/)
        .slice(0, 4)
        .map((wd) => wd.charAt(0).toUpperCase() + wd.slice(1).toLowerCase())
        .join(' ');
      promptForSpec = rawPrompt;
      displayPromptText = rawPrompt;
      if (inp) inp.value = '';
    }

    user.points -= cost;
    const sizeSelectEl = document.getElementById('lab-size-select') as HTMLSelectElement | null;
    const sizeOverride =
      currentLabMode === 'prompt' && sizeSelectEl && sizeSelectEl.value !== 'auto'
        ? (sizeSelectEl.value as LabSizeTier)
        : undefined;
    const spec = parsePromptToLabSpec(
      promptForSpec,
      itemAId,
      itemBId,
      (id) => findAnyCatalogItem(id)?.labSpec?.primaryShape || null,
      sizeOverride
    );
    if (currentLabMode === 'fusion') spec.hasStars = true;
    const svgMarkup = buildLabSVGMarkup(spec);

    const newItem = {
      id: `lab_${Date.now()}_${Math.floor(Math.random() * 999)}`,
      category: 'decor',
      isLabItem: true,
      name: `🧪 ${cleanTitle}`,
      icon: '🧪',
      prompt: displayPromptText,
      desc: fusionLabel || `Vật phẩm sáng tạo [${spec.rarity || 'Độc bản'}]: "${displayPromptText}"`,
      labSpec: spec,
      svgMarkup,
      sizeScale: spec.sizeScale
    };
    getLabItemCanvasImage(newItem);
    user.customLabItems!.unshift(newItem);
    user.memberUpdatedAt = Date.now();
    dirtyMemberIds.add(user.id);
    if (currentLabMode === 'fusion') refreshLabFusionIngredientsUI();

    AudioEngine.playSuccess();
    triggerSpeechBubble(user, `Chế tạo thành công: ${cleanTitle}! 🧪✨`, true);
    showToast(`🎉 Chế tạo thành công "${cleanTitle}" (-${cost}⭐) và đã cất vào 🎒 Túi đồ!`);
    updateHUD();
    saveGame();
    renderLabRecentList(newItem);
  };

  w.togglePrivateRoomLockFromToolbar = () => {
    const user = getCurrentUser();
    const room = getActivePrivateRoom();
    const curUnlocked = room ? room.isUnlocked : !!user.roomUnlocked;
    const nextUnlocked = !curUnlocked;
    setPrivateRoomUnlockedForMember(user, nextUnlocked);
    AudioEngine.playClick();
    showToast(nextUnlocked ? '🔓 Đã mở cửa phòng riêng!' : '🔒 Đã khóa phòng riêng!');
    syncPrivateRoomToolbar();
    updateHUD();
    saveGame(true);
  };
  w.changePrivateRoomWallFromToolbar = () => {
    const user = getCurrentUser();
    const sel = document.getElementById('pr-wall-select') as HTMLSelectElement | null;
    if (sel) setPrivateRoomWallForMember(user, sel.value);
    AudioEngine.playClick();
    saveGame(true);
  };
  w.exitPrivateRoomToHallway = exitPrivateRoomToHallway;
  w.openPrivateRoomSlotOverview = () => {
    const room = getActivePrivateRoom();
    const user = getCurrentUser();
    if (!room || !room.ownerIds?.includes(user.id)) return;
    openModal('slot-picker-modal');
    renderPrivateRoomSlotBar(true);
  };
  w.selectRoomSlotAndOpenPicker = (slotId: string) => {
    selectedRoomSlotId = slotId;
    openModal('slot-picker-modal');
    renderPrivateRoomSlotBar(false);
  };
  w.pickupDecorFromRoomSlot = (slotId: string, stayOverview = false) => {
    const user = getCurrentUser();
    const room = getActivePrivateRoom() || getMemberPrivateRoom(user);
    const owner = (room && room.ownerIds && state.members.find((m) => m.id === room.ownerIds![0])) || user;
    if (owner.id !== user.id) {
      AudioEngine.playError();
      return showToast('🔒 Chỉ chủ phòng mới được cất vật phẩm!');
    }
    ensureMemberProps(owner);
    const placedId = owner.roomSlots?.[slotId];
    if (!placedId) return;
    const specFallback = owner.roomSlotSpecs?.[slotId] || null;
    const itemCat = findAnyCatalogItem(placedId);
    returnItemToBag(owner, placedId, specFallback);
    delete owner.roomSlots![slotId];
    delete owner.roomSlotSpecs![slotId];
    owner.memberUpdatedAt = Date.now();
    dirtyMemberIds.add(owner.id);
    AudioEngine.playCoin();
    showToast(`🎒 Đã cất "${itemCat?.name || 'vật phẩm'}" lại vào Túi đồ!`);
    syncPrivateRoomToolbar();
    updateHUD();
    const slotModal = document.getElementById('slot-picker-modal');
    if (slotModal && slotModal.style.display === 'flex') {
      if (stayOverview) renderPrivateRoomSlotBar(true);
      else closeModal('slot-picker-modal');
    }
    const customModal = document.getElementById('custom-modal');
    if (customModal && customModal.style.display === 'flex') renderCustomModal();
    saveGame(true);
  };
  w.pickupLegacyRoomDecor = (index: number) => {
    const user = getCurrentUser();
    ensureMemberProps(user);
    const entry = user.roomDecor[index];
    if (!entry) return;
    const specFallback = user.roomDecorSpecs?.[entry.id] || null;
    const itemCat = findAnyCatalogItem(entry.id);
    returnItemToBag(user, entry.id, specFallback);
    user.roomDecor.splice(index, 1);
    if (!user.roomDecor.some((d) => d.id === entry.id) && user.roomDecorSpecs) {
      delete user.roomDecorSpecs[entry.id];
    }
    user.memberUpdatedAt = Date.now();
    dirtyMemberIds.add(user.id);
    AudioEngine.playCoin();
    showToast(`🎒 Đã cất "${itemCat?.name || 'vật phẩm'}" lại vào Túi đồ!`);
    updateHUD();
    const customModal = document.getElementById('custom-modal');
    if (customModal && customModal.style.display === 'flex') renderCustomModal();
    saveGame(true);
  };
  w.assignDecorToRoomSlot = (decorId: string | null) => {
    const user = getCurrentUser();
    const room = getActivePrivateRoom();
    const owner = (room && room.ownerIds && state.members.find((m) => m.id === room.ownerIds[0])) || user;
    if (owner.id !== user.id) {
      AudioEngine.playError();
      return showToast('🔒 Chỉ chủ phòng mới được trang trí phòng này!');
    }
    ensureMemberProps(owner);
    if (!owner.roomSlots) owner.roomSlots = {};
    if (!owner.roomSlotSpecs) owner.roomSlotSpecs = {};
    if (!selectedRoomSlotId) selectedRoomSlotId = ROOM_DECOR_SLOTS[0].id;
    const prevId = owner.roomSlots[selectedRoomSlotId] || null;
    const prevSpec = owner.roomSlotSpecs[selectedRoomSlotId] || null;

    if (!decorId) {
      if (prevId) {
        returnItemToBag(owner, prevId, prevSpec);
        const prevCat = findAnyCatalogItem(prevId);
        delete owner.roomSlots[selectedRoomSlotId];
        delete owner.roomSlotSpecs[selectedRoomSlotId];
        owner.memberUpdatedAt = Date.now();
        dirtyMemberIds.add(owner.id);
        AudioEngine.playCoin();
        showToast(`🎒 Đã cất "${prevCat?.name || 'vật phẩm'}" lại vào Túi đồ!`);
      }
      closeModal('slot-picker-modal');
      syncPrivateRoomToolbar();
      updateHUD();
      saveGame(true);
      return;
    }

    const consumed = consumeItemFromBag(owner, decorId);
    if (!consumed.ok) {
      AudioEngine.playError();
      showToast('❌ Vật phẩm này không còn trong túi đồ!');
      renderPrivateRoomSlotBar(false);
      return;
    }
    if (prevId) {
      returnItemToBag(owner, prevId, prevSpec);
    }
    owner.roomSlots[selectedRoomSlotId] = decorId;
    if (consumed.kind === 'lab' && consumed.labItem) {
      owner.roomSlotSpecs[selectedRoomSlotId] = { ...consumed.labItem };
    } else {
      delete owner.roomSlotSpecs[selectedRoomSlotId];
    }
    owner.memberUpdatedAt = Date.now();
    dirtyMemberIds.add(owner.id);
    const placedCat = findAnyCatalogItem(decorId);
    AudioEngine.playSuccess();
    showToast(`✨ Đã đặt "${placedCat?.name || 'vật phẩm'}" vào phòng (số lượng trong túi -1)!`);
    closeModal('slot-picker-modal');
    syncPrivateRoomToolbar();
    updateHUD();
    saveGame(true);
  };

  w.closeTvModal = () => {
    if (tvTimerInterval) clearInterval(tvTimerInterval);
    const iframe = document.getElementById('youtube-iframe') as HTMLIFrameElement | null;
    if (iframe) iframe.src = '';
    closeModal('tv-modal');
  };
  w.switchTvChannel = (videoId: string, label: string) => {
    const user = getCurrentUser();
    if (getRemainingTvSeconds(user) <= 0) { AudioEngine.playError(); return showToast('⏰ Bạn đã hết thời gian xem YouTube hôm nay!'); }
    AudioEngine.playClick();
    currentTvVideoId = videoId;
    const ext = document.getElementById('tv-external-yt-link') as HTMLAnchorElement | null;
    const iframe = document.getElementById('youtube-iframe') as HTMLIFrameElement | null;
    if (ext) ext.href = `https://www.youtube.com/watch?v=${videoId}`;
    if (iframe) iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    showToast(`📺 Đang phát: ${label}`);
  };

  w.switchCustomTab = (tab: string) => {
    ['char', 'room', 'house'].forEach((t) => {
      const el = document.getElementById(`custom-tab-${t}`);
      if (el) el.style.display = t === tab ? 'block' : 'none';
    });
  };
  w.drawCharPreview = drawCharPreview;
  w.applyFashionSet = (setId: string) => {
    const st = FASHION_CATALOG.find((f) => f.id === setId) as any;
    if (!st) return;
    AudioEngine.playClick();
    draftChar.shirtColor = st.shirtColor;
    draftChar.shirtPattern = st.shirtPattern;
    draftChar.pantsColor = st.pantsColor;
    draftChar.pantsStyle = st.pantsStyle;
    renderVisualCharacterPickers();
  };
  w.selectDraftShirt = (color: string, pattern: string) => { AudioEngine.playClick(); draftChar.shirtColor = color; draftChar.shirtPattern = pattern; renderVisualCharacterPickers(); };
  w.selectDraftPants = (color: string, style: string) => { AudioEngine.playClick(); draftChar.pantsColor = color; draftChar.pantsStyle = style; renderVisualCharacterPickers(); };
  w.selectDraftOutfit = (icon: string) => { AudioEngine.playClick(); draftChar.outfit = icon; renderVisualCharacterPickers(); };
  w.saveCharCustom = () => {
    const user = getCurrentUser();
    const myRoom = getMemberPrivateRoom(user);
    const curRoom = user.scene === 'private_room' ? getActivePrivateRoom() : getRoomAtPosition(user.x, user.y);
    if ((user.scene !== 'house' && user.scene !== 'private_room') || !myRoom || !curRoom || curRoom.id !== myRoom.id) {
      AudioEngine.playError();
      return showToast('🔒 Bạn chỉ có thể đổi trang phục khi mở tủ quần áo ở phòng riêng!');
    }
    const now = Date.now();
    const newName = (document.getElementById('custom-char-name') as HTMLInputElement)?.value.trim();
    if (newName && newName !== user.name) {
      user.name = newName;
      user.nameUpdatedAt = now;
    }
    Object.assign(user, draftChar);
    user.memberUpdatedAt = now;
    dirtyMemberIds.add(user.id);
    AudioEngine.playSuccess();
    showToast('✨ Đã lưu ngoại hình & trang phục!');
    updateHUD();
    saveGame();
  };
  w.toggleRoomPrivacy = () => {
    const user = getCurrentUser();
    const nextUnlocked = Boolean((document.getElementById('room-privacy-toggle') as HTMLInputElement)?.checked);
    setPrivateRoomUnlockedForMember(user, nextUnlocked);
    AudioEngine.playClick();
    showToast(nextUnlocked ? '🔓 Đã mở cửa phòng riêng!' : '🔒 Đã khóa phòng riêng!');
    syncPrivateRoomToolbar();
    updateHUD();
    saveGame(true);
  };
  w.changeRoomWall = () => {
    const user = getCurrentUser();
    const sel = document.getElementById('room-wall-color') as HTMLSelectElement | null;
    if (sel) setPrivateRoomWallForMember(user, sel.value);
    syncPrivateRoomToolbar();
    saveGame(true);
  };
  w.placeDecorInRoom = (decorId: string) => {
    const user = getCurrentUser();
    ensureMemberProps(user);
    const item = findAnyCatalogItem(decorId);
    if (!item || (user.scene !== 'house' && user.scene !== 'private_room')) {
      return showToast('⚠️ Hãy bước vào trong phòng riêng của bạn trước!');
    }
    const curRoom = user.scene === 'private_room' ? getActivePrivateRoom() : getRoomAtPosition(user.x, user.y);
    if (!curRoom || !curRoom.ownerIds?.includes(user.id)) return showToast('⚠️ Chỉ đặt đồ trong phòng riêng của mình!');
    const consumed = consumeItemFromBag(user, decorId);
    if (!consumed.ok) {
      AudioEngine.playError();
      return showToast('❌ Không còn vật phẩm này trong túi đồ!');
    }
    if (user.scene === 'private_room') {
      const emptySlot = ROOM_DECOR_SLOTS.find((s) => !user.roomSlots?.[s.id]);
      if (emptySlot) {
        user.roomSlots![emptySlot.id] = item.id;
        if (consumed.kind === 'lab' && consumed.labItem) {
          user.roomSlotSpecs![emptySlot.id] = { ...consumed.labItem };
        }
        user.memberUpdatedAt = Date.now();
        dirtyMemberIds.add(user.id);
        closeModal('custom-modal');
        syncPrivateRoomToolbar();
        AudioEngine.playSuccess();
        showToast(`🛋️ Đã đặt "${item.name}" vào vị trí ${emptySlot.label}!`);
        saveGame(true);
        return;
      }
    }
    user.roomDecor.push({ id: item.id, icon: item.icon || '📦', x: user.x, y: user.y - 10 });
    if (consumed.kind === 'lab' && consumed.labItem) {
      user.roomDecorSpecs![item.id] = { ...consumed.labItem };
    }
    user.memberUpdatedAt = Date.now();
    dirtyMemberIds.add(user.id);
    closeModal('custom-modal');
    AudioEngine.playSuccess();
    showToast(`🛋️ Đã đặt "${item.name}" vào phòng (số lượng trong túi -1)!`);
    saveGame(true);
  };
  w.updateHouseDesign = () => {
    const user = getCurrentUser();
    if (!isParent(user)) return;
    state.house.plotIndex = parseInt((document.getElementById('house-plot-select') as HTMLSelectElement)?.value || '1', 10);
    state.house.style = (document.getElementById('house-style-select') as HTMLSelectElement)?.value || 'modern';
    state.houseUpdatedAt = Date.now();
    closeModal('custom-modal');
    AudioEngine.playSuccess();
    showToast('🏢 Đã cập nhật kiến trúc Nhà Phố Gia Đình!');
    saveGame();
  };

  w.sendDonation = () => {
    const sender = getCurrentUser();
    const recId = (document.getElementById('donate-recipient') as HTMLSelectElement)?.value;
    const amount = parseInt((document.getElementById('donate-amount') as HTMLInputElement)?.value || '0', 10) || 0;
    const note = (document.getElementById('donate-note') as HTMLInputElement)?.value.trim() || '';
    if (amount <= 0 || sender.points < amount) { AudioEngine.playError(); return showToast('❌ Số điểm không hợp lệ hoặc không đủ sao!'); }
    const receiver = state.members.find((m) => m.id === recId);
    if (!receiver || receiver.id === sender.id) return;
    if (isParent(receiver)) {
      const cap = getMaxParentPoints();
      if (receiver.points >= cap) {
        AudioEngine.playError();
        return showToast(`⚠️ ${receiver.name} đã đạt giới hạn tối đa ${cap}⭐, không thể nhận thêm!`);
      }
      if (receiver.points + amount > cap) {
        AudioEngine.playError();
        return showToast(`⚠️ ${receiver.name} chỉ có thể nhận tối đa +${cap - receiver.points}⭐ (giới hạn ${cap}⭐)!`);
      }
    }
    const now = Date.now();
    sender.points -= amount;
    sender.memberUpdatedAt = now;
    receiver.points += amount;
    receiver.adminPointsUpdatedAt = now;
    receiver.memberUpdatedAt = now;
    logActivity({
      memberId: sender.id,
      memberName: sender.name,
      action: 'gift_points',
      detail: `${sender.name} tặng ${receiver.name} +${amount}⭐${note ? ` ("${note}")` : ''}`,
      pointsDelta: -amount
    });
    closeModal('donate-modal');
    AudioEngine.playCoin();
    triggerSpeechBubble(sender, `Tặng ${receiver.name} +${amount}⭐! ${note}`, false);
    showToast(`💸 Đã tặng ${amount}⭐ cho ${receiver.name}!`);
    updateHUD();
    saveGame();
  };

  w.pressPinDigit = (d: string) => {
    if (enteredPin.length >= 4) return;
    enteredPin += String(d);
    updatePinDisplay();
    if (enteredPin.length === 4) setTimeout(verifyPin, 120);
  };
  w.clearPinDigit = () => { enteredPin = enteredPin.slice(0, -1); updatePinDisplay(); };
  w.verifyPin = verifyPin;
  w.resetPinToDefault = () => {
    const u = getCurrentUser();
    if (!isParent(u) || deviceConfig.isLockedToMember) return;
    const now = Date.now();
    state.parentPin = '1234';
    state.parentPinUpdatedAt = now;
    localStorage.setItem('b2ks_parent_pin', '1234');
    localStorage.setItem('b2ks_parent_pin_ts', String(now));
    saveGame();
    enteredPin = '';
    updatePinDisplay();
    showToast('🔑 Đã khôi phục Passcode mặc định!');
  };
  w.toggleDeviceLock = () => {
    deviceConfig.isLockedToMember = !deviceConfig.isLockedToMember;
    saveDeviceConfig();
    lastHudSignature = '';
    updateHUD();
    renderFamilySyncModal();
    showToast(deviceConfig.isLockedToMember ? `🔒 Đã khóa máy cho ${getCurrentUser().name}!` : '🔓 Đã mở khóa thiết bị!');
  };
  w.changeParentPin = () => {
    const inp = document.getElementById('new-pin-input') as HTMLInputElement | null;
    const val = (inp?.value || '').trim();
    if (!/^\d{4}$/.test(val)) { AudioEngine.playError(); return showToast('⚠️ Vui lòng nhập đúng 4 chữ số!'); }
    if (val === String(state.gamePassword || '1111')) {
      AudioEngine.playError();
      return showToast('⚠️ Passcode Phụ huynh không được trùng với Mật khẩu vào game!');
    }
    const now = Date.now();
    state.parentPin = val;
    state.parentPinUpdatedAt = now;
    localStorage.setItem('b2ks_parent_pin', val);
    localStorage.setItem('b2ks_parent_pin_ts', String(now));
    if (inp) inp.value = '';
    saveGame();
    renderFamilySyncModal();
    AudioEngine.playSuccess();
    showToast('✅ Đã lưu mã PIN Phụ huynh mới thành công!');
  };
  w.saveFirebaseUrl = () => {
    let url = (document.getElementById('firebase-url-input') as HTMLInputElement)?.value.trim() || '';
    if (url && !url.startsWith('http')) url = `https://${url}`;
    url = url.replace(/\/+$/, '');
    deviceConfig.firebaseUrl = url;
    saveDeviceConfig();
    renderFamilySyncModal();
    if (url) { syncToFirebase(); showToast('☁️ Đã lưu link Firebase! Đang đồng bộ các máy...'); }
    else showToast('⚪ Đã ngắt kết nối Firebase.');
  };
  w.exportFamilyCode = () => {
    const codeStr = btoa(unescape(encodeURIComponent(JSON.stringify(state))));
    if (navigator.clipboard) {
      navigator.clipboard.writeText(codeStr).then(() => showToast('📋 Đã copy Mã Dữ Liệu Gia Đình!'));
    } else {
      const inp = document.getElementById('import-code-input') as HTMLInputElement | null;
      if (inp) { inp.value = codeStr; inp.select(); showToast('📋 Đã điền Mã Gia Đình vào ô bên dưới — bấm Ctrl+C để copy!'); }
    }
  };
  w.importFamilyCode = () => {
    const raw = (document.getElementById('import-code-input') as HTMLInputElement)?.value.trim() || '';
    if (!raw) return;
    try {
      const parsed = JSON.parse(decodeURIComponent(escape(atob(raw))));
      if (parsed && parsed.members) {
        const keepId = deviceConfig.currentMemberId;
        state = parsed;
        state.currentUserId = keepId;
        ensureStateArrays();
        saveGame(false);
        lastHudSignature = '';
        updateHUD();
        showToast('✅ Đã nạp dữ liệu gia đình thành công!');
      }
    } catch { showToast('❌ Mã dữ liệu không hợp lệ!'); }
  };

  w.openDiningFoodPuzzleModal = () => {
    AudioEngine.init();
    AudioEngine.playClick();
    const item = DINING_FOOD_PUZZLES[Math.floor(Math.random() * DINING_FOOD_PUZZLES.length)];
    const chars = item.word.split('');
    const numToHide = Math.max(2, Math.min(chars.length - 1, Math.ceil(chars.length * 0.45)));
    const indices = chars.map((_, idx) => idx).sort(() => Math.random() - 0.5).slice(0, numToHide).sort((a, b) => a - b);
    activeFoodPuzzle = { item, hiddenIndices: indices, hiddenSet: new Set(indices), eatStatus: getActivityStatus(getCurrentUser(), 'eat') };
    const modal = document.getElementById('dining-puzzle-modal');
    if (modal) modal.style.display = 'flex';
    renderDiningFoodPuzzle();
  };
  w.handleFoodPuzzleSlotInput = (idx: number, el: HTMLInputElement) => {
    el.value = el.value.replace(/[^a-zA-Z]/g, '').toUpperCase();
    if (el.value.length === 1 && activeFoodPuzzle) {
      const pos = activeFoodPuzzle.hiddenIndices.indexOf(idx);
      if (pos !== -1 && pos + 1 < activeFoodPuzzle.hiddenIndices.length) {
        document.getElementById(`food-slot-${activeFoodPuzzle.hiddenIndices[pos + 1]}`)?.focus();
      }
    }
  };
  w.handleFoodPuzzleSlotKeydown = (e: KeyboardEvent, idx: number) => {
    if (e.key === 'Enter') return w.submitDiningFoodPuzzle();
    const target = e.target as HTMLInputElement;
    if (e.key === 'Backspace' && !target.value && activeFoodPuzzle) {
      const pos = activeFoodPuzzle.hiddenIndices.indexOf(idx);
      if (pos > 0) document.getElementById(`food-slot-${activeFoodPuzzle.hiddenIndices[pos - 1]}`)?.focus();
    }
  };
  w.submitDiningFoodPuzzle = () => {
    if (!activeFoodPuzzle) return;
    const { item, hiddenSet } = activeFoodPuzzle;
    const chars = item.word.split('');
    let guessedWord = '';
    for (let i = 0; i < chars.length; i++) {
      if (!hiddenSet.has(i)) guessedWord += chars[i];
      else guessedWord += ((document.getElementById(`food-slot-${i}`) as HTMLInputElement)?.value.trim().toUpperCase() || '');
    }
    const fb = document.getElementById('dining-puzzle-feedback');
    if (guessedWord.length < chars.length) {
      AudioEngine.playError();
      if (fb) { fb.style.color = '#E67E22'; fb.textContent = '⚠️ Bạn hãy điền đầy đủ tất cả các ô chữ còn thiếu nhé!'; }
      return;
    }
    if (guessedWord === item.word) {
      closeModal('dining-puzzle-modal');
      const curU = getCurrentUser();
      performRoutineActivity(curU, 'eat', `Yummy ${String(item.word || '').toLowerCase()}! (${item.vi}) 🍽️`);
      evaluateAndUnlockMemberBadges(curU, item.word);
      saveGame();
    } else {
      AudioEngine.playError();
      if (fb) { fb.style.color = '#E74C3C'; fb.textContent = `❌ "${guessedWord}" chưa chính xác, hãy thử lại nhé!`; }
    }
  };

  // Arcade & Soccer bindings onto window
  w.closeArcadeModal = arcadeEngine.closeArcadeModal;
  w.createArcadeLobby = arcadeEngine.createArcadeLobby;
  w.joinArcadeLobby = arcadeEngine.joinArcadeLobby;
  w.toggleArcadeReady = arcadeEngine.toggleArcadeReady;
  w.leaveArcadeLobby = arcadeEngine.leaveArcadeLobby;
  w.startOnlineArcadeMatch = arcadeEngine.startOnlineArcadeMatch;
  w.resetArcadeToIdle = arcadeEngine.resetArcadeToIdle;
  w.playOnlineTicTacToeCell = arcadeEngine.playOnlineTicTacToeCell;
  w.forfeitOnlineMatch = arcadeEngine.forfeitOnlineMatch;
  w.buzzOnlinePlayerIn = arcadeEngine.buzzOnlinePlayerIn;
  w.answerOnlineBuzzerQuestion = arcadeEngine.answerOnlineBuzzerQuestion;
  w.dashOnlineArcadeShip = arcadeEngine.dashOnlineArcadeShip;
  w.fireOnlineArcadeShip = arcadeEngine.fireOnlineArcadeShip;

  w.closeSoccerModal = () => closeModal('soccer-modal');
  w.restartSoccerMatch = () => {
    AudioEngine.playClick();
    soccerGame.restartSoloMatch();
  };
  w.switchSoccerToSolo = () => soccerGame.switchToSoloMode();
  w.switchSoccerTo2P = () => soccerGame.switchTo2PMode();
  w.createSoccer2PRoom = () => soccerGame.create2PRoom();
  w.joinSoccer2PRoom = () => soccerGame.join2PRoom();
  w.toggleSoccer2PReady = () => soccerGame.toggle2PReady();
  w.startSoccer2PMatch = () => soccerGame.start2PMatch();
  w.leaveSoccer2PRoom = () => soccerGame.leave2PRoom();
  w.spectateSoccerMatch = () => soccerGame.spectateMatch();
  w.soccerTouchDir = (dir: 'up' | 'down' | 'left' | 'right', down: boolean) => soccerGame.setTouchDir(dir, down);
  w.soccerKick = () => soccerGame.kickBall();
  w.soccerPickPenaltyZone = (zone: PenaltyZoneId) => soccerGame.pickPenaltyZone(zone);
  w.soccerCanvasKick = (ev: MouseEvent) => {
    const c = document.getElementById('soccer-canvas') as HTMLCanvasElement | null;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const tx = ((ev.clientX - rect.left) / rect.width) * c.width;
    const ty = ((ev.clientY - rect.top) / rect.height) * c.height;
    soccerGame.kickBall(tx, ty);
  };

  function claimComicReadReward(comicId: string, comicTitle: string): { ok: boolean; awarded: number; msg: string } {
    const me = getCurrentUser();
    ensureMemberProps(me);
    const stats = me.comicReadStats!;
    if (!stats.completedIds.includes(comicId)) {
      stats.completedIds.push(comicId);
    }
    const cfg = getActivityConfig('read_comic');
    const now = Date.now();
    const cooldownMs = cfg.cooldownMs ?? 120 * 1000;
    const maxPerDay = cfg.maxPerDay ?? 5;

    if (!cfg.enabled || cfg.reward <= 0) {
      me.memberUpdatedAt = now;
      saveGame(true);
      updateHUD();
      notifySubscribers();
      return {
        ok: true,
        awarded: 0,
        msg: `✅ Đã hoàn thành truyện "${comicTitle}"! (Bố/Mẹ đang tắt thưởng sao cho hoạt động đọc truyện)`
      };
    }

    const sinceLast = now - (stats.lastReadAt || 0);
    if (stats.lastReadAt > 0 && cooldownMs > 0 && sinceLast < cooldownMs) {
      const waitSec = Math.ceil((cooldownMs - sinceLast) / 1000);
      me.memberUpdatedAt = now;
      saveGame(true);
      notifySubscribers();
      return {
        ok: true,
        awarded: 0,
        msg: `✅ Chính xác! Đã lưu tiến độ đọc "${comicTitle}". Hãy chờ ${waitSec}s để nhận sao lượt tiếp theo nhé!`
      };
    }

    if (stats.count >= maxPerDay) {
      me.memberUpdatedAt = now;
      saveGame(true);
      notifySubscribers();
      return {
        ok: true,
        awarded: 0,
        msg: `✅ Chính xác! Hôm nay bạn đã nhận đủ ${maxPerDay} lượt thưởng đọc truyện rồi nhé!`
      };
    }

    const petBonus = getMemberPetBonuses(me);
    const totalAward = cfg.reward + petBonus.starBonus;
    me.points += totalAward;
    stats.count += 1;
    stats.lastReadAt = now;
    me.memberUpdatedAt = now;
    me.pointsUpdatedAt = now;

    AudioEngine.playCoin();
    triggerConfetti();
    triggerSpeechBubble(me, `I finished reading "${comicTitle}"! 📚✨`, true);
    logActivity({
      memberId: me.id,
      memberName: me.name,
      action: 'read_comic',
      detail: `Đọc xong truyện tranh "${comicTitle}" (+${totalAward}⭐)`,
      pointsDelta: totalAward
    });
    showToast(
      petBonus.starBonus > 0
        ? `📚 Tuyệt vời! Hoàn thành "${comicTitle}" nhận +${totalAward}⭐ (gồm +${petBonus.starBonus}⭐ Thú cưng)!`
        : `📚 Tuyệt vời! Hoàn thành truyện "${comicTitle}" nhận +${totalAward}⭐!`
    );
    evaluateAndUnlockMemberBadges(me, comicTitle);
    updateHUD();
    saveGame(true);
    notifySubscribers();

    return {
      ok: true,
      awarded: totalAward,
      msg: `🎉 Chính xác! Bạn nhận được +${totalAward}⭐ khi hoàn thành "${comicTitle}"!`
    };
  }

  // React Bridge
  const bridge: B2KSBridge = {
    getState: () => state,
    getCurrentUser,
    isParent,
    getFirebaseUrl: () => deviceConfig.firebaseUrl || '',
    saveGame,
    updateHUD,
    showToast,
    requestParentAccess,
    playCoin: () => AudioEngine.playCoin(),
    playClick: () => AudioEngine.playClick(),
    playSuccess: () => AudioEngine.playSuccess(),
    playError: () => AudioEngine.playError(),
    triggerConfetti,
    triggerSpeechBubble,
    logActivity,
    speakEnglish,
    speakEnglishWithGender,
    syncEnglishBankToFirebase,
    syncCrossWorldRequestsToFirebase,
    syncFleaMarketToFirebase,
    syncActivityLogsToFirebase,
    findCatalogItem: findAnyCatalogItem,
    renderItemSVG: (id: string, size = 54) => renderItemIllustrationSVG(id, size, findAnyCatalogItem),
    openReactModal,
    closeReactModal,
    openParentMiniWindow: () => w.openParentMiniWindow(),
    getMemberLocationLabel: getMemberLocationText,
    claimComicReadReward,
    approveFamilyQuest,
    evaluateMemberAchievementsById: (memberId: string) => {
      const m = state.members.find((x) => x.id === memberId);
      if (m) {
        evaluateAndUnlockMemberBadges(m);
        saveGame(true);
        updateHUD();
      }
    },
    getMaxParentPoints,
    getFamilyName: () => state.familyName || 'B2KS',
    setFamilyName: (nextName: string) => {
      const clean = String(nextName || '').trim();
      if (!clean) return { ok: false, msg: 'Tên gia đình không được để trống!' };
      const now = Date.now();
      state.familyName = clean.slice(0, 24);
      state.familyNameUpdatedAt = now;
      deviceConfig.lastFamilyName = state.familyName;
      saveDeviceConfig();
      localStorage.setItem(LAST_FAMILY_KEY, state.familyName);
      lastHudSignature = '';
      updateFamilyBrandingDOM();
      updateHUD();
      saveGame(true);
      return { ok: true, msg: `✅ Đã đổi tên gia đình thành "${state.familyName}"!` };
    },
    getResolvedLocations: () => resolveNeighborhoodLocations(state),
    setBuildingLayouts: (layouts: Record<string, BuildingLayoutOverride>) => {
      state.buildingLayouts = layouts || {};
      state.buildingLayoutsUpdatedAt = Date.now();
      saveGame(true);
    },
    resetBuildingLayouts: () => {
      state.buildingLayouts = {};
      state.buildingLayoutsUpdatedAt = Date.now();
      saveGame(true);
    },
    getBillboardText: () =>
      typeof state.billboardText === 'string' && state.billboardText.trim()
        ? state.billboardText.trim()
        : DEFAULT_BILLBOARD_TEXT,
    setBillboardText: (nextText: string) => {
      const clean = String(nextText || '').replace(/\s+/g, ' ').trim().slice(0, 140);
      if (!clean) return { ok: false, msg: '⚠️ Nội dung bảng quảng cáo không được để trống!' };
      state.billboardText = clean;
      state.billboardUpdatedAt = Date.now();
      saveGame(true);
      return { ok: true, msg: '✅ Đã cập nhật & đồng bộ nội dung Bảng quảng cáo cho cả khu phố!' };
    },
    setGamePassword: (nextPw: string) => {
      const clean = String(nextPw || '').trim();
      if (clean.length < 4) return { ok: false, msg: 'Mật khẩu vào game phải từ 4 ký tự trở lên!' };
      if (clean === String(state.parentPin || '1234')) {
        return { ok: false, msg: 'Mật khẩu vào game không được trùng với Passcode Phụ huynh!' };
      }
      state.gamePassword = clean;
      state.gamePasswordUpdatedAt = Date.now();
      saveGame(true);
      return { ok: true, msg: `✅ Đã cập nhật mật khẩu vào game thành "${clean}"!` };
    },
    setParentPin: (nextPin: string) => {
      const clean = String(nextPin || '').trim();
      if (clean.length < 4) return { ok: false, msg: 'Passcode Phụ huynh phải từ 4 ký tự trở lên!' };
      if (clean === String(state.gamePassword || '1111')) {
        return { ok: false, msg: 'Passcode Phụ huynh không được trùng với Mật khẩu vào game!' };
      }
      const now = Date.now();
      state.parentPin = clean;
      state.parentPinUpdatedAt = now;
      saveGame(true);
      return { ok: true, msg: `✅ Đã cập nhật Passcode Phụ huynh thành "${clean}"!` };
    },
    updateMemberProfile: (memberId: string, patch: { name?: string; age?: number; role?: string }) => {
      const target = state.members.find((m) => m.id === memberId);
      if (!target) return { ok: false, msg: 'Không tìm thấy thành viên!' };
      const now = Date.now();
      if (typeof patch.name === 'string') {
        const cleanName = patch.name.trim();
        if (!cleanName) return { ok: false, msg: 'Tên thành viên không được để trống!' };
        const sliced = cleanName.slice(0, 20);
        if (sliced !== target.name) {
          target.name = sliced;
          target.nameUpdatedAt = now;
        }
      }
      if (typeof patch.age === 'number' && !Number.isNaN(patch.age)) {
        target.age = Math.max(1, Math.min(120, Math.round(patch.age)));
      }
      if (typeof patch.role === 'string' && ['Bố', 'Mẹ', 'Con gái', 'Con trai'].includes(patch.role)) {
        const wasParent = isParent(target);
        const willBeParent = patch.role === 'Bố' || patch.role === 'Mẹ';
        if (wasParent && !willBeParent) {
          const otherParents = state.members.filter((m) => m.id !== target.id && isParent(m));
          if (otherParents.length === 0) {
            return { ok: false, msg: 'Cần giữ lại ít nhất 1 Phụ Huynh trong gia đình!' };
          }
        }
        target.role = patch.role;
      }
      target.memberUpdatedAt = now;
      dirtyMemberIds.add(target.id);
      lastHudSignature = '';
      updateHUD();
      saveGame(true);
      return { ok: true, msg: `✅ Đã cập nhật hồ sơ của ${target.name}!` };
    },
    addMember: (name: string, role: string, age?: number) => {
      const cleanName = String(name || '').trim().slice(0, 20);
      if (!cleanName) return { ok: false, msg: 'Vui lòng nhập tên thành viên!' };
      const validRole = ['Bố', 'Mẹ', 'Con gái', 'Con trai'].includes(role) ? role : 'Con gái';
      const now = Date.now();
      const parentRole = validRole === 'Bố' || validRole === 'Mẹ';
      const defaultAge = typeof age === 'number' && !Number.isNaN(age) && age > 0
        ? Math.max(1, Math.min(120, Math.round(age)))
        : parentRole
          ? 36
          : 10;
      const newMember: Member = {
        id: `member_${now}_${Math.random().toString(36).slice(2, 5)}`,
        name: cleanName,
        role: validRole,
        age: defaultAge,
        points: parentRole ? 150 : 30,
        pointsUpdatedAt: now,
        adminPointsUpdatedAt: now,
        memberUpdatedAt: now,
        hairStyle: validRole === 'Con gái' ? 'pigtails' : validRole === 'Mẹ' ? 'long' : 'short',
        hairColor: '#2C3E50',
        shirtColor: parentRole ? '#2980B9' : '#E67E22',
        shirtPattern: 'star',
        pantsColor: '#34495E',
        pantsStyle: validRole === 'Con gái' || validRole === 'Mẹ' ? 'skirt' : 'pants',
        outfit: '',
        inventory: [],
        vouchers: [],
        petAccessories: [],
        petFoodInventory: {},
        pets: [],
        roomUnlocked: false,
        roomWall: '#FCF3CF',
        roomDecor: [],
        roomSlots: {},
        customLabItems: [],
        unlockedZooAnimals: [],
        englishQuizHistory: [],
        unlockedAchievements: [],
        englishWordsUsed: [],
        completedTaskCount: 0,
        speakingLevel: 1,
        speakingStreak: 0,
        speakingHistory: [],
        helperRobot: parentRole ? undefined : { skin: validRole === 'Con trai' ? 'gundam' : 'doraemon', reminders: [], updatedAt: now },
        scene: 'house',
        x: 560,
        y: 650,
        dir: 'down',
        speech: null
      };
      ensureMemberProps(newMember);
      state.members.push(newMember);
      logActivity({
        memberId: newMember.id,
        memberName: newMember.name,
        action: 'member_add',
        detail: `Thêm thành viên mới: ${newMember.name} (${newMember.role}, ${newMember.age}t)`
      });
      lastHudSignature = '';
      AudioEngine.playSuccess();
      updateHUD();
      saveGame(true);
      return { ok: true, msg: `👨‍👩‍👧‍👦 Đã thêm thành viên "${newMember.name}" (${newMember.role})!`, member: newMember };
    },
    removeMember: (memberId: string) => {
      const idx = state.members.findIndex((m) => m.id === memberId);
      if (idx === -1) return { ok: false, msg: 'Không tìm thấy thành viên cần xóa!' };
      const target = state.members[idx];
      if (target.id === state.currentUserId) {
        return { ok: false, msg: 'Không thể xóa thành viên đang đăng nhập! Hãy đổi sang tài khoản khác trước.' };
      }
      if (isParent(target)) {
        const remainingParents = state.members.filter((m) => m.id !== target.id && isParent(m));
        if (remainingParents.length === 0) {
          return { ok: false, msg: 'Cần giữ lại ít nhất 1 Phụ Huynh trong gia đình!' };
        }
      }
      if (state.members.length <= 1) {
        return { ok: false, msg: 'Gia đình phải có ít nhất 1 thành viên!' };
      }
      state.members.splice(idx, 1);
      state.tasks = state.tasks
        .filter((t) => !(t.assigneeId === target.id && t.type !== 'family_quest'))
        .map((t) =>
          t.type === 'family_quest' && Array.isArray(t.participantIds)
            ? { ...t, participantIds: t.participantIds.filter((pid) => pid !== target.id) }
            : t
        );
      // Remove deleted member from durable archive & ledger so reload doesn't resurrect orphaned data
      try {
        const archKey = getMemberArchiveKey();
        const arch = JSON.parse(localStorage.getItem(archKey) || '{}');
        if (arch && arch[target.id]) {
          delete arch[target.id];
          localStorage.setItem(archKey, JSON.stringify(arch));
        }
      } catch {
        // ignore
      }
      if (deviceConfig.firebaseUrl) {
        const fbBase = getFirebaseBasePath();
        fetch(`${deviceConfig.firebaseUrl}/${fbBase}/member_data/${target.id}.json`, { method: 'DELETE' }).catch(() => {});
        fetch(`${deviceConfig.firebaseUrl}/${fbBase}/live_pos/${target.id}.json`, { method: 'DELETE' }).catch(() => {});
      }
      logActivity({
        memberId: getCurrentUser().id,
        memberName: getCurrentUser().name,
        action: 'member_remove',
        detail: `Đã xóa thành viên: ${target.name} (${target.role})`
      });
      lastHudSignature = '';
      AudioEngine.playClick();
      updateHUD();
      saveGame(true);
      return { ok: true, msg: `🗑️ Đã xóa thành viên "${target.name}" khỏi gia đình.` };
    },
    fetchOtherFamiliesDirectory: async () => {
      publishFamilyDirectorySummary();
      const fbUrl = deviceConfig.firebaseUrl;
      if (!fbUrl) return [];
      const currentSlug = getActiveFamilySlug();
      const bySlug = new Map<string, OtherFamilySummary>();

      try {
        const dirRes = await fetch(`${fbUrl}/b2ks_family_directory.json`);
        const dirData = await dirRes.json();
        if (dirData && typeof dirData === 'object') {
          Object.entries(dirData).forEach(([slug, val]: [string, any]) => {
            if (!val || typeof val !== 'object' || slug === currentSlug || val.deleted) return;
            if (!Array.isArray(val.members) || val.members.length === 0) return;
            bySlug.set(slug, {
              slug,
              familyName: String(val.familyName || slug),
              updatedAt: Number(val.updatedAt) || 0,
              dailyParentAllowance: typeof val.dailyParentAllowance === 'number' ? val.dailyParentAllowance : undefined,
              members: val.members.map((m: any) => ({
                id: String(m.id || ''),
                name: String(m.name || 'Thành viên'),
                role: String(m.role || 'Con gái'),
                age: typeof m.age === 'number' ? m.age : undefined,
                outfit: String(m.outfit || ''),
                points: Number(m.points) || 0
              }))
            });
          });
        }
      } catch {
        // ignore directory error
      }

      try {
        const rootRes = await fetch(`${fbUrl}/.json?shallow=true`);
        const rootKeys = await rootRes.json();
        if (rootKeys && typeof rootKeys === 'object') {
          const namespaces = Object.keys(rootKeys).filter(
            (k) => k === 'b2ks_family_rpg_v16' || k.startsWith('b2ks_family_ns_')
          );
          const toProbe = namespaces
            .map((ns) => ({ ns, slug: ns === 'b2ks_family_rpg_v16' ? 'b2ks' : ns.replace(/^b2ks_family_ns_/, '') }))
            .filter((item) => item.slug !== currentSlug && !bySlug.has(item.slug))
            .slice(0, 12);

          await Promise.all(
            toProbe.map(async ({ ns, slug }) => {
              try {
                const [fnRes, memRes] = await Promise.all([
                  fetch(`${fbUrl}/${ns}/shared/familyName.json`),
                  fetch(`${fbUrl}/${ns}/shared/members.json`)
                ]);
                const [fnVal, memVal] = await Promise.all([fnRes.json(), memRes.json()]);
                if (Array.isArray(memVal) && memVal.length > 0) {
                  bySlug.set(slug, {
                    slug,
                    familyName: typeof fnVal === 'string' && fnVal.trim() ? fnVal.trim() : slug.toUpperCase(),
                    updatedAt: 0,
                    members: memVal.map((m: any) => ({
                      id: String(m.id || ''),
                      name: String(m.name || 'Thành viên'),
                      role: String(m.role || 'Con gái'),
                      age: typeof m.age === 'number' ? m.age : undefined,
                      outfit: String(m.outfit || ''),
                      points: Number(m.points) || 0
                    }))
                  });
                }
              } catch {
                // ignore single namespace probe error
              }
            })
          );
        }
      } catch {
        // ignore shallow probe error
      }

      return Array.from(bySlug.values()).sort((a, b) => a.familyName.localeCompare(b.familyName));
    },
    getBgmTheme: () => AudioEngine.themeId,
    setBgmTheme: (themeId: BgmThemeId) => {
      AudioEngine.init();
      AudioEngine.setTheme(themeId);
      state.bgmTheme = themeId;
      saveGame(false);
      notifySubscribers();
    },
    isAudioMuted: () => AudioEngine.isMuted,
    toggleAudioMuted: () => {
      const muted = AudioEngine.toggleMute();
      notifySubscribers();
      return muted;
    },
    setAudioTempPaused: (paused: boolean) => {
      AudioEngine.setTempPaused(paused);
    },
    getNotificationStatus,
    requestNotificationPermission,
    sendTestNotification,
    setGameUnlocked: (unlocked: boolean) => {
      isGameUnlocked = unlocked;
      if (unlocked) {
        AudioEngine.init();
        if (state.bgmTheme && state.bgmTheme !== AudioEngine.themeId) {
          AudioEngine.setTheme(state.bgmTheme);
        }
        syncSeenTasksBaseline();
        updateNotificationHudUI();
      }
      notifySubscribers();
    },
    getActiveFamilySlug: () => getActiveFamilySlug(),
    isB2KSDad: () => getActiveFamilySlug() === 'b2ks' && getCurrentUser().role === 'Bố',
    getGlobalEnglishBank: () => globalEnglishBank,
    importEnglishBankQuestions: (incoming: EnglishQuestion[], mode: 'merge' | 'replace' = 'merge') => {
      const cleanIncoming = normalizeEnglishQuestionsList(incoming);
      if (cleanIncoming.length === 0) {
        return { ok: false, added: 0, updated: 0, total: globalEnglishBank.length, msg: '⚠️ Không có câu hỏi hợp lệ nào trong file CSV!' };
      }
      let nextBank: EnglishQuestion[] = [];
      let added = 0;
      let updated = 0;
      if (mode === 'replace') {
        nextBank = cleanIncoming;
        added = cleanIncoming.length;
      } else {
        const byId = new Map<string, EnglishQuestion>();
        globalEnglishBank.forEach((q) => byId.set(q.id, { ...q }));
        cleanIncoming.forEach((q) => {
          if (byId.has(q.id)) updated += 1;
          else added += 1;
          byId.set(q.id, q);
        });
        nextBank = Array.from(byId.values());
      }
      saveSharedEnglishBank(nextBank, Date.now(), true);
      notifySubscribers();
      return {
        ok: true,
        added,
        updated,
        total: globalEnglishBank.length,
        msg:
          mode === 'replace'
            ? `✅ Đã thay thế bộ đề dùng chung thành công (${globalEnglishBank.length} câu)!`
            : `✅ Đã nhập CSV thành công (+${added} mới, cập nhật ${updated} câu · Tổng: ${globalEnglishBank.length} câu)!`
      };
    },
    resetEnglishBankToDefault: () => {
      const fresh = DEFAULT_ENGLISH_BANK.map((q) => ({ ...q }));
      saveSharedEnglishBank(fresh, Date.now(), true);
      notifySubscribers();
      return {
        ok: true,
        total: globalEnglishBank.length,
        msg: `↺ Đã khôi phục bộ đề chuẩn Global Success (${globalEnglishBank.length} câu)!`
      };
    },
    getGlobalSpeakingBank: () => globalSpeakingBank,
    addSpeakingSentence: (input: { level: 1 | 2 | 3 | 4 | 5; topic: string; sentence: string; meaningVi: string }) => {
      const cleanSentence = String(input.sentence || '').trim();
      if (!cleanSentence) return { ok: false, msg: '⚠️ Vui lòng nhập câu tiếng Anh!' };
      const level = Math.max(1, Math.min(5, Math.round(Number(input.level) || 1))) as 1 | 2 | 3 | 4 | 5;
      const newItem: SpeakingBankQuestion = {
        id: `spk_c_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        level,
        topic: String(input.topic || 'Daily Life').trim() || 'Daily Life',
        sentence: cleanSentence,
        meaningVi: String(input.meaningVi || '').trim(),
        custom: true
      };
      const nextBank = [newItem, ...globalSpeakingBank];
      saveSharedSpeakingBank(nextBank, Date.now(), true);
      notifySubscribers();
      return { ok: true, msg: `✅ Đã thêm câu Speaking Level ${level} ("${cleanSentence}")!` };
    },
    deleteSpeakingSentence: (id: string) => {
      if (globalSpeakingBank.length <= 5) {
        return { ok: false, msg: '⚠️ Cần giữ lại tối thiểu 5 câu trong ngân hàng Speaking!' };
      }
      const nextBank = globalSpeakingBank.filter((q) => q.id !== id);
      if (nextBank.length === globalSpeakingBank.length) {
        return { ok: false, msg: 'Không tìm thấy câu cần xóa!' };
      }
      saveSharedSpeakingBank(nextBank, Date.now(), true);
      notifySubscribers();
      return { ok: true, msg: `🗑️ Đã xóa câu khỏi Ngân hàng Speaking (${nextBank.length} câu còn lại).` };
    },
    importSpeakingBankSentences: (incoming: SpeakingBankQuestion[], mode: 'merge' | 'replace' = 'merge') => {
      const clean = normalizeSpeakingQuestionsList(incoming);
      if (clean.length === 0) {
        return { ok: false, added: 0, updated: 0, total: globalSpeakingBank.length, msg: '⚠️ Không có câu Speaking hợp lệ nào trong file CSV!' };
      }
      let nextBank: SpeakingBankQuestion[] = [];
      let added = 0;
      let updated = 0;
      if (mode === 'replace') {
        nextBank = clean;
        added = clean.length;
      } else {
        const byId = new Map<string, SpeakingBankQuestion>();
        globalSpeakingBank.forEach((s) => byId.set(s.id, { ...s }));
        clean.forEach((s) => {
          if (byId.has(s.id)) updated += 1;
          else added += 1;
          byId.set(s.id, s);
        });
        nextBank = Array.from(byId.values());
      }
      saveSharedSpeakingBank(nextBank, Date.now(), true);
      notifySubscribers();
      return {
        ok: true,
        added,
        updated,
        total: globalSpeakingBank.length,
        msg:
          mode === 'replace'
            ? `✅ Đã thay thế Ngân hàng Speaking (${globalSpeakingBank.length} câu)!`
            : `✅ Đã nhập CSV Speaking (+${added} mới, cập nhật ${updated} · Tổng: ${globalSpeakingBank.length} câu)!`
      };
    },
    resetSpeakingBankToDefault: () => {
      const fresh = DEFAULT_SPEAKING_BANK.map((q) => ({ ...q }));
      saveSharedSpeakingBank(fresh, Date.now(), true);
      notifySubscribers();
      return {
        ok: true,
        total: globalSpeakingBank.length,
        msg: `↺ Đã khôi phục ${globalSpeakingBank.length} câu Speaking chuẩn (Level 1–5)!`
      };
    },
    getActiveSpeakingNpc: () => activeSpeakingNpc,
    submitSpeakingResult: (payload: {
      npcId: string;
      npcName: string;
      npcGender?: 'male' | 'female';
      sentenceId: string;
      sentence?: string;
      targetText?: string;
      spokenText: string;
      accuracy: number;
    }) => {
      const me = getCurrentUser();
      ensureMemberProps(me);
      const targetSentence = String(payload.sentence || payload.targetText || '').trim();
      const acc = Math.max(0, Math.min(100, Math.round(Number(payload.accuracy) || 0)));
      const passed = acc >= 80;
      let starsEarned = 0;
      let leveledUp = false;
      const now = Date.now();

      if (passed) {
        starsEarned = Math.max(8, Math.round(acc / 10));
        const petBonus = getMemberPetBonuses(me);
        if (!isParent(me)) {
          starsEarned += petBonus.starBonus;
          me.points += starsEarned;
        } else {
          starsEarned = addParentPointsWithAllowanceCap(me, starsEarned);
        }
        me.speakingStreak = (me.speakingStreak || 0) + 1;
        if (me.speakingStreak >= 5) {
          if ((me.speakingLevel || 1) < 5) {
            me.speakingLevel = (me.speakingLevel || 1) + 1;
            me.speakingStreak = 0;
            leveledUp = true;
          } else {
            me.speakingStreak = 5;
          }
        }
      } else {
        starsEarned = 0;
        me.speakingStreak = 0;
      }

      if (!Array.isArray(me.speakingHistory)) me.speakingHistory = [];
      me.speakingHistory.unshift({
        date: new Date().toDateString(),
        level: me.speakingLevel || 1,
        accuracy: acc,
        stars: starsEarned,
        sentence: targetSentence,
        npcName: payload.npcName,
        ts: now
      });
      if (me.speakingHistory.length > 60) me.speakingHistory.length = 60;
      me.memberUpdatedAt = now;
      me.pointsUpdatedAt = now;

      logActivity({
        memberId: me.id,
        memberName: me.name,
        action: 'speaking_done',
        detail: `Luyện nói với ${payload.npcName} (Lv.${me.speakingLevel || 1}): "${targetSentence}" — ${acc}% (+${starsEarned}⭐)`,
        pointsDelta: starsEarned
      });

      if (passed) {
        AudioEngine.playCoin();
        if (leveledUp) triggerConfetti();
        triggerSpeechBubble(me, payload.spokenText || targetSentence, true);
        evaluateAndUnlockMemberBadges(me, `${targetSentence} ${payload.spokenText || ''}`);
      } else {
        AudioEngine.playError();
        evaluateAndUnlockMemberBadges(me, payload.spokenText || undefined);
      }

      updateHUD();
      saveGame(true);
      notifySubscribers();

      return {
        accuracy: acc,
        awarded: starsEarned,
        starsEarned,
        passed,
        newLevel: (me.speakingLevel || 1) as SpeakingLevel,
        newStreak: me.speakingStreak || 0,
        leveledUp,
        msg: leveledUp
          ? `🎉 Tuyệt vời! Độ chính xác ${acc}% (+${starsEarned}⭐) & Thăng cấp Speaking lên Level ${me.speakingLevel}!`
          : passed
            ? `🌟 Xuất sắc! Phát âm chuẩn ${acc}% (+${starsEarned}⭐ · Chuỗi lên cấp: ${me.speakingStreak}/5)!`
            : `💡 Độ chính xác ${acc}% (< 80%) → +0⭐. Chuỗi 80%+ đặt lại về 0/5, hãy thử lại nhé!`
      };
    },
    getGlobalBibleBank: () => globalBibleBank,
    addBibleQuestion: (input: Omit<BibleQuestion, 'id' | 'custom'> & { id?: string }) => {
      const qText = String(input.q || '').trim();
      const opts = Array.isArray(input.opts) ? input.opts.map((o) => String(o || '').trim()) : [];
      if (!qText || opts.length < 4 || opts.slice(0, 4).some((o) => !o)) {
        return { ok: false, msg: '⚠️ Vui lòng nhập đầy đủ câu hỏi và 4 đáp án A, B, C, D!' };
      }
      const bookEn = String(input.bookEn || 'Genesis').trim();
      const bookVi = resolveVietnameseBookName(bookEn, input.bookVi);
      const ans = Math.max(0, Math.min(3, Math.round(Number(input.ans) || 0))) as 0 | 1 | 2 | 3;
      const newQ: BibleQuestion = {
        id: (input.id && input.id.trim()) || `bible_c_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        category: input.category || 'fact',
        ...(input.visualId ? { visualId: input.visualId } : {}),
        q: qText,
        opts: [opts[0], opts[1], opts[2], opts[3]],
        ans,
        bookEn,
        bookVi,
        ref: String(input.ref || '1:1').trim(),
        verseEn: String(input.verseEn || '').trim(),
        verseVi: String(input.verseVi || '').trim(),
        custom: true
      };
      const nextBank = [newQ, ...globalBibleBank];
      saveSharedBibleBank(nextBank, Date.now(), true);
      notifySubscribers();
      return { ok: true, msg: `✅ Đã thêm câu hỏi Kinh Thánh (${bookEn} ${newQ.ref})!`, question: newQ };
    },
    deleteBibleQuestion: (id: string) => {
      if (globalBibleBank.length <= 5) {
        return { ok: false, msg: '⚠️ Cần giữ lại tối thiểu 5 câu trong ngân hàng Đố Kinh Thánh!' };
      }
      const nextBank = globalBibleBank.filter((q) => q.id !== id);
      if (nextBank.length === globalBibleBank.length) {
        return { ok: false, msg: 'Không tìm thấy câu hỏi cần xóa!' };
      }
      saveSharedBibleBank(nextBank, Date.now(), true);
      notifySubscribers();
      return { ok: true, msg: `🗑️ Đã xóa câu hỏi Kinh Thánh (${nextBank.length} câu còn lại).` };
    },
    importBibleBankQuestions: (incoming: BibleQuestion[], mode: 'merge' | 'replace' = 'merge') => {
      const clean = normalizeBibleQuestionsList(incoming);
      if (clean.length === 0) {
        return {
          ok: false,
          added: 0,
          updated: 0,
          total: globalBibleBank.length,
          msg: '⚠️ Không có câu hỏi Kinh Thánh hợp lệ nào trong file CSV!'
        };
      }
      let nextBank: BibleQuestion[] = [];
      let added = 0;
      let updated = 0;
      if (mode === 'replace') {
        nextBank = clean;
        added = clean.length;
      } else {
        const byId = new Map<string, BibleQuestion>();
        globalBibleBank.forEach((q) => byId.set(q.id, { ...q }));
        clean.forEach((q) => {
          if (byId.has(q.id)) updated += 1;
          else added += 1;
          byId.set(q.id, q);
        });
        nextBank = Array.from(byId.values());
      }
      saveSharedBibleBank(nextBank, Date.now(), true);
      notifySubscribers();
      return {
        ok: true,
        added,
        updated,
        total: globalBibleBank.length,
        msg:
          mode === 'replace'
            ? `✅ Đã thay thế Ngân hàng Đố Kinh Thánh (${globalBibleBank.length} câu)!`
            : `✅ Đã nhập CSV Đố Kinh Thánh (+${added} mới, cập nhật ${updated} · Tổng: ${globalBibleBank.length} câu)!`
      };
    },
    resetBibleBankToDefault: () => {
      const fresh = DEFAULT_BIBLE_BANK.map((q) => ({ ...q }));
      saveSharedBibleBank(fresh, Date.now(), true);
      notifySubscribers();
      return {
        ok: true,
        total: globalBibleBank.length,
        msg: `↺ Đã khôi phục bộ 200 câu Đố Kinh Thánh chuẩn (NIV & Truyền Thống 1925)!`
      };
    },
    submitBibleAnswer: (questionId: string, selectedIndex: number) => {
      const me = getCurrentUser();
      ensureMemberProps(me);
      const q = globalBibleBank.find((item) => item.id === questionId) || globalBibleBank[0];
      const prog = me.bibleProgress!;
      const now = Date.now();
      const prevCount = Math.max(0, Math.min(3, Math.round(Number(prog.correctCounts[q.id]) || 0)));

      if (prevCount >= 3) {
        return {
          correct: true,
          awarded: 0,
          baseAwarded: 0,
          streakBonus: 0,
          newStreak: prog.streak || 0,
          questionCorrectCount: 3,
          retired: true,
          bookEn: q.bookEn,
          bookVi: q.bookVi,
          ref: q.ref,
          verseEn: q.verseEn,
          verseVi: q.verseVi,
          msg: '✅ Câu hỏi này bạn đã trả lời đúng đủ 3 lần nên sẽ không hỏi lại nữa!'
        };
      }

      prog.totalAnswered = (prog.totalAnswered || 0) + 1;
      const isCorrect = Number(selectedIndex) === Number(q.ans);
      let baseAwarded = 0;
      let streakBonus = 0;
      let actualAwarded = 0;
      let nextCount = prevCount;

      if (isCorrect) {
        nextCount = Math.min(3, prevCount + 1);
        prog.correctCounts[q.id] = nextCount;
        prog.totalCorrect = (prog.totalCorrect || 0) + 1;
        prog.streak = (prog.streak || 0) + 1;

        baseAwarded = 1;
        streakBonus = prog.streak > 0 && prog.streak % 3 === 0 ? 1 : 0;
        const rawGain = baseAwarded + streakBonus;

        if (!isParent(me)) {
          me.points += rawGain;
          actualAwarded = rawGain;
        } else {
          actualAwarded = addParentPointsWithAllowanceCap(me, rawGain);
        }
        me.pointsUpdatedAt = now;

        logActivity({
          memberId: me.id,
          memberName: me.name,
          action: 'bible_done',
          detail: `Đố Kinh Thánh (${q.bookVi} ${q.ref}) — Đúng lần ${nextCount}/3${streakBonus > 0 ? ' · Thưởng chuỗi 3 câu liên tiếp!' : ''} (+${actualAwarded}⭐)`,
          pointsDelta: actualAwarded
        });

        AudioEngine.playCoin();
        if (streakBonus > 0) {
          triggerConfetti();
        }
        triggerSpeechBubble(me, `Amen! +${actualAwarded}⭐ (${q.bookEn} ${q.ref})`, true);
      } else {
        prog.streak = 0;
        AudioEngine.playError();
      }

      prog.updatedAt = now;
      me.memberUpdatedAt = now;
      touchMemberData(me, now);
      updateHUD();
      saveGame(true);
      notifySubscribers();

      const retired = nextCount >= 3;
      return {
        correct: isCorrect,
        awarded: actualAwarded,
        baseAwarded,
        streakBonus,
        newStreak: prog.streak,
        questionCorrectCount: nextCount,
        retired,
        bookEn: q.bookEn,
        bookVi: q.bookVi,
        ref: q.ref,
        verseEn: q.verseEn,
        verseVi: q.verseVi,
        msg: isCorrect
          ? streakBonus > 0
            ? `🌟 Tuyệt vời! Đúng 3 câu liên tiếp: +1⭐ + 1⭐ thưởng (+${actualAwarded}⭐)!`
            : `✅ Chính xác! Nhận +${actualAwarded}⭐ (${nextCount}/3 lần để hoàn thành câu này).`
          : `💡 Chưa chính xác rồi — hãy mở Kinh Thánh sách ${q.bookEn} (${q.bookVi}) để tìm nhé!`
      };
    },
    adminListNeighborhoods: async () => {
      if (getActiveFamilySlug() !== 'b2ks' || getCurrentUser().role !== 'Bố') return [];
      const fbUrl = deviceConfig.firebaseUrl;
      const slugToNs = new Map<string, string>();
      const deletedSlugs = new Set<string>();
      const dirMap = new Map<string, any>();

      // Discover locally cached namespaces
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i) || '';
        if (k === LEGACY_STORAGE_KEY) slugToNs.set('b2ks', 'b2ks_family_rpg_v16');
        else if (k.startsWith('b2ks_state_')) {
          const sl = k.replace('b2ks_state_', '');
          if (sl) slugToNs.set(sl, getFamilyFirebaseRoot(sl));
        }
      }
      slugToNs.set('b2ks', 'b2ks_family_rpg_v16');

      if (fbUrl) {
        try {
          const [dirRes, shallowRes] = await Promise.all([
            fetch(`${fbUrl}/b2ks_family_directory.json`),
            fetch(`${fbUrl}/.json?shallow=true`)
          ]);
          const [dirData, shallowKeys] = await Promise.all([dirRes.json(), shallowRes.json()]);
          if (dirData && typeof dirData === 'object') {
            Object.entries(dirData).forEach(([sl, val]: [string, any]) => {
              if (!val || typeof val !== 'object') return;
              if (val.deleted && sl !== 'b2ks') {
                deletedSlugs.add(sl);
              } else {
                dirMap.set(sl, val);
                slugToNs.set(sl, getFamilyFirebaseRoot(sl));
              }
            });
          }
          if (shallowKeys && typeof shallowKeys === 'object') {
            Object.keys(shallowKeys).forEach((ns) => {
              if (ns === 'b2ks_family_rpg_v16') {
                slugToNs.set('b2ks', ns);
              } else if (ns.startsWith('b2ks_family_ns_')) {
                const sl = ns.replace(/^b2ks_family_ns_/, '');
                if (sl && !deletedSlugs.has(sl)) slugToNs.set(sl, ns);
              }
            });
          }
        } catch {
          // ignore remote fetch errors
        }
      }

      const activeSlug = getActiveFamilySlug();
      const results: AdminNeighborhoodRecord[] = [];
      const entries = Array.from(slugToNs.entries()).filter(([sl]) => !deletedSlugs.has(sl));

      await Promise.all(
        entries.map(async ([slug, ns]) => {
          if (slug === activeSlug) {
            const parents = state.members
              .filter((m) => isParent(m))
              .map((m) => ({ id: m.id, name: m.name, role: m.role, points: m.points }));
            results.push({
              slug,
              familyName: state.familyName || 'B2KS',
              updatedAt: state.updatedAt || 0,
              dailyParentAllowance: getDailyParentAllowance(),
              maxParentPoints: getMaxParentPoints(),
              memberCount: state.members.length,
              kidCount: state.members.filter((m) => !isParent(m)).length,
              parents
            });
            return;
          }

          let remoteShared: any = null;
          if (fbUrl) {
            try {
              const r = await fetch(`${fbUrl}/${ns}/shared.json`);
              remoteShared = await r.json();
            } catch {
              remoteShared = null;
            }
          }

          let sourceState = remoteShared && Array.isArray(remoteShared.members) ? remoteShared : null;
          if (!sourceState) {
            try {
              const localRaw = localStorage.getItem(slug === 'b2ks' ? LEGACY_STORAGE_KEY : `b2ks_state_${slug}`);
              if (localRaw) {
                const parsed = JSON.parse(localRaw);
                if (parsed && Array.isArray(parsed.members)) sourceState = parsed;
              }
            } catch {
              // ignore
            }
          }

          const dirEntry = dirMap.get(slug);
          const membersList: any[] = sourceState?.members || dirEntry?.members || [];
          if (membersList.length === 0) return;

          const parents = membersList
            .filter((m) => m.role === 'Bố' || m.role === 'Mẹ')
            .map((m) => ({
              id: String(m.id || ''),
              name: String(m.name || 'Phụ huynh'),
              role: String(m.role || 'Bố'),
              points: Number(m.points) || 0
            }));
          const allowance =
            typeof sourceState?.dailyParentAllowance === 'number'
              ? sourceState.dailyParentAllowance
              : typeof dirEntry?.dailyParentAllowance === 'number'
              ? dirEntry.dailyParentAllowance
              : DAILY_PARENT_ALLOWANCE;

          const maxPts =
            typeof sourceState?.maxParentPoints === 'number'
              ? sourceState.maxParentPoints
              : typeof dirEntry?.maxParentPoints === 'number'
              ? dirEntry.maxParentPoints
              : MAX_PARENT_POINTS;

          results.push({
            slug,
            familyName: String(sourceState?.familyName || dirEntry?.familyName || slug.toUpperCase()),
            updatedAt: Number(sourceState?.updatedAt || dirEntry?.updatedAt || 0),
            dailyParentAllowance: allowance,
            maxParentPoints: maxPts,
            memberCount: membersList.length,
            kidCount: membersList.filter((m) => m.role !== 'Bố' && m.role !== 'Mẹ').length,
            parents
          });
        })
      );

      return results.sort((a, b) => {
        if (a.slug === 'b2ks') return -1;
        if (b.slug === 'b2ks') return 1;
        return a.familyName.localeCompare(b.familyName);
      });
    },
    adminCreateNeighborhood: async (familyNameInput: string, dadName?: string, momName?: string) => {
      if (getActiveFamilySlug() !== 'b2ks' || getCurrentUser().role !== 'Bố') {
        return { ok: false, msg: '❌ Chỉ Quản trị viên mới có quyền tạo khu phố mới!' };
      }
      const cleanName = String(familyNameInput || '').trim().slice(0, 24);
      if (!cleanName) return { ok: false, msg: '⚠️ Tên khu phố không được để trống!' };
      const slug = normalizeFamilySlug(cleanName);
      if (!slug || slug === 'b2ks') {
        return { ok: false, msg: '⚠️ Tên khu phố này trùng với khu phố gốc hệ thống hoặc không hợp lệ!' };
      }

      const fbUrl = deviceConfig.firebaseUrl;
      const ns = getFamilyFirebaseRoot(cleanName);
      if (fbUrl) {
        try {
          const [dirR, metaR] = await Promise.all([
            fetch(`${fbUrl}/b2ks_family_directory/${slug}.json`),
            fetch(`${fbUrl}/${ns}/auth_meta.json`)
          ]);
          const [dirV, metaV] = await Promise.all([dirR.json(), metaR.json()]);
          const hasDir = dirV && typeof dirV === 'object' && !dirV.deleted && Array.isArray(dirV.members) && dirV.members.length > 0;
          const hasMeta = metaV && typeof metaV === 'object' && Boolean(metaV.gamePassword) && !dirV?.deleted;
          if (hasDir || hasMeta) {
            return { ok: false, msg: `⚠️ Khu phố "${cleanName}" đã tồn tại trên hệ thống!` };
          }
        } catch {
          // ignore check error
        }
      }

      const fresh = createFreshDefaultState(cleanName, {
        parentsOnly: true,
        dadName: dadName || 'Bố',
        momName: momName || 'Mẹ'
      });
      const now = Date.now();
      fresh.updatedAt = now;
      const { englishQuestions: _omitEng, ...freshPayload } = fresh;

      try {
        localStorage.setItem(`b2ks_state_${slug}`, JSON.stringify(freshPayload));
        localStorage.setItem(
          `b2ks_durable_secrets_v1_${slug}`,
          JSON.stringify({
            familyName: cleanName,
            familyNameUpdatedAt: now,
            gamePassword: '1111',
            gamePasswordUpdatedAt: now,
            parentPin: '1234',
            parentPinUpdatedAt: now
          })
        );
      } catch {
        // ignore storage quota
      }

      if (fbUrl) {
        try {
          await Promise.all([
            fetch(`${fbUrl}/${ns}/auth_meta.json`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                familyName: cleanName,
                familyNameUpdatedAt: now,
                gamePassword: '1111',
                gamePasswordUpdatedAt: now,
                parentPin: '1234',
                parentPinUpdatedAt: now
              })
            }),
            fetch(`${fbUrl}/${ns}/shared.json`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(freshPayload)
            }),
            ...fresh.members.map((m) =>
              fetch(`${fbUrl}/${ns}/member_data/${m.id}.json`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(m)
              })
            ),
            fetch(`${fbUrl}/b2ks_family_directory/${slug}.json`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                slug,
                familyName: cleanName,
                updatedAt: now,
                dailyParentAllowance: DAILY_PARENT_ALLOWANCE,
                maxParentPoints: MAX_PARENT_POINTS,
                deleted: false,
                members: fresh.members.map((m) => ({
                  id: m.id,
                  name: m.name,
                  role: m.role,
                  age: m.age,
                  outfit: m.outfit || '',
                  points: m.points
                }))
              })
            })
          ]);
        } catch {
          return { ok: false, msg: '⚠️ Tạo cục bộ thành công nhưng chưa đồng bộ được lên Firebase!' };
        }
      }

      return {
        ok: true,
        slug,
        msg: `🎉 Đã tạo khu phố "${cleanName}" (chỉ gồm Bố & Mẹ)! MK game: 1111 · PIN PH: 1234`
      };
    },
    adminDeleteNeighborhood: async (slugInput: string) => {
      if (getActiveFamilySlug() !== 'b2ks' || getCurrentUser().role !== 'Bố') {
        return { ok: false, msg: '❌ Chỉ Quản trị viên mới có quyền xóa khu phố!' };
      }
      const slug = normalizeFamilySlug(slugInput);
      if (!slug || slug === 'b2ks') {
        return { ok: false, msg: '⚠️ Không thể xóa khu phố gốc của hệ thống!' };
      }
      const keysToRemove = [
        `b2ks_state_${slug}`,
        `b2ks_points_ledger_v1_${slug}`,
        `b2ks_durable_secrets_v1_${slug}`,
        `b2ks_member_archive_v1_${slug}`,
        `b2ks_arcade_online_room_${slug}`,
        `b2ks_soccer_online_room_${slug}`,
        `b2ks_soccer_p2_input_${slug}`
      ];
      keysToRemove.forEach((k) => {
        try {
          localStorage.removeItem(k);
        } catch {
          // ignore
        }
      });

      const fbUrl = deviceConfig.firebaseUrl;
      if (fbUrl) {
        try {
          await Promise.all([
            fetch(`${fbUrl}/b2ks_family_ns_${slug}.json`, { method: 'DELETE' }),
            fetch(`${fbUrl}/b2ks_family_directory/${slug}.json`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                slug,
                familyName: slug,
                deleted: true,
                updatedAt: Date.now(),
                members: []
              })
            })
          ]);
        } catch {
          return { ok: false, msg: '❌ Lỗi xóa dữ liệu khu phố trên Firebase!' };
        }
      }
      return { ok: true, msg: `🗑️ Đã xóa khu phố (${slug}) khỏi hệ thống!` };
    },
    adminResetNeighborhoodPasswords: async (slugInput: string) => {
      if (getActiveFamilySlug() !== 'b2ks' || getCurrentUser().role !== 'Bố') {
        return { ok: false, msg: '❌ Chỉ Quản trị viên mới có quyền reset mật khẩu!' };
      }
      const slug = normalizeFamilySlug(slugInput);
      const now = Date.now();
      const ns = slug === 'b2ks' ? 'b2ks_family_rpg_v16' : `b2ks_family_ns_${slug}`;

      if (slug === getActiveFamilySlug()) {
        state.gamePassword = '1111';
        state.gamePasswordUpdatedAt = now;
        state.parentPin = '1234';
        state.parentPinUpdatedAt = now;
        saveGame(true);
      } else {
        try {
          const secKey = `b2ks_durable_secrets_v1_${slug}`;
          const prevSec = JSON.parse(localStorage.getItem(secKey) || '{}') || {};
          localStorage.setItem(
            secKey,
            JSON.stringify({
              ...prevSec,
              gamePassword: '1111',
              gamePasswordUpdatedAt: now,
              parentPin: '1234',
              parentPinUpdatedAt: now
            })
          );
          const stKey = `b2ks_state_${slug}`;
          const prevRaw = localStorage.getItem(stKey);
          if (prevRaw) {
            const parsed = JSON.parse(prevRaw);
            parsed.gamePassword = '1111';
            parsed.gamePasswordUpdatedAt = now;
            parsed.parentPin = '1234';
            parsed.parentPinUpdatedAt = now;
            parsed.updatedAt = now;
            localStorage.setItem(stKey, JSON.stringify(parsed));
          }
        } catch {
          // ignore
        }
      }

      const fbUrl = deviceConfig.firebaseUrl;
      if (fbUrl) {
        try {
          await Promise.all([
            fetch(`${fbUrl}/${ns}/auth_meta.json`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                gamePassword: '1111',
                gamePasswordUpdatedAt: now,
                parentPin: '1234',
                parentPinUpdatedAt: now
              })
            }),
            fetch(`${fbUrl}/${ns}/shared.json`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                gamePassword: '1111',
                gamePasswordUpdatedAt: now,
                parentPin: '1234',
                parentPinUpdatedAt: now,
                updatedAt: now
              })
            })
          ]);
        } catch {
          return { ok: false, msg: '❌ Lỗi cập nhật mật khẩu lên Firebase!' };
        }
      }
      return { ok: true, msg: `🔑 Đã reset 2 mật khẩu khu phố (${slug}) về mặc định: 1111 / 1234!` };
    },
    adminAdjustParentAccount: async (
      slugInput: string,
      payload: { dailyParentAllowance?: number; maxParentPoints?: number; parentPoints?: Record<string, number> }
    ) => {
      if (getActiveFamilySlug() !== 'b2ks' || getCurrentUser().role !== 'Bố') {
        return { ok: false, msg: '❌ Chỉ Quản trị viên mới có quyền điều chỉnh!' };
      }
      const slug = normalizeFamilySlug(slugInput);
      const now = Date.now();
      const ns = slug === 'b2ks' ? 'b2ks_family_rpg_v16' : `b2ks_family_ns_${slug}`;

      if (slug === getActiveFamilySlug()) {
        if (typeof payload.dailyParentAllowance === 'number') {
          state.dailyParentAllowance = Math.max(0, Math.round(payload.dailyParentAllowance));
        }
        if (typeof payload.maxParentPoints === 'number' && !Number.isNaN(payload.maxParentPoints)) {
          state.maxParentPoints = Math.max(0, Math.round(payload.maxParentPoints));
          state.maxParentPointsUpdatedAt = now;
        }
        if (payload.parentPoints) {
          Object.entries(payload.parentPoints).forEach(([pid, pts]) => {
            const m = state.members.find((x) => x.id === pid);
            if (m && isParent(m)) {
              m.points = Math.max(0, Math.round(pts));
              m.pointsUpdatedAt = now;
              m.adminPointsUpdatedAt = now;
              m.memberUpdatedAt = now;
              dirtyMemberIds.add(m.id);
            }
          });
        }
        saveGame(true);
        updateHUD();
        return { ok: true, msg: `💰 Đã cập nhật điểm, giới hạn & ngân sách Phụ huynh khu phố "${state.familyName}"!` };
      }

      const fbUrl = deviceConfig.firebaseUrl;
      let targetShared: any = null;
      if (fbUrl) {
        try {
          const r = await fetch(`${fbUrl}/${ns}/shared.json`);
          targetShared = await r.json();
        } catch {
          targetShared = null;
        }
      }
      if (!targetShared || !Array.isArray(targetShared.members)) {
        try {
          const raw = localStorage.getItem(`b2ks_state_${slug}`);
          if (raw) targetShared = JSON.parse(raw);
        } catch {
          // ignore
        }
      }
      if (!targetShared || !Array.isArray(targetShared.members)) {
        return { ok: false, msg: '❌ Không tìm thấy dữ liệu khu phố cần điều chỉnh!' };
      }

      if (typeof payload.dailyParentAllowance === 'number') {
        targetShared.dailyParentAllowance = Math.max(0, Math.round(payload.dailyParentAllowance));
      }
      if (typeof payload.maxParentPoints === 'number' && !Number.isNaN(payload.maxParentPoints)) {
        targetShared.maxParentPoints = Math.max(0, Math.round(payload.maxParentPoints));
        targetShared.maxParentPointsUpdatedAt = now;
      }
      const changedParents: any[] = [];
      if (payload.parentPoints) {
        targetShared.members.forEach((m: any) => {
          if ((m.role === 'Bố' || m.role === 'Mẹ') && payload.parentPoints![m.id] !== undefined) {
            m.points = Math.max(0, Math.round(payload.parentPoints![m.id]));
            m.pointsUpdatedAt = now;
            m.adminPointsUpdatedAt = now;
            m.memberUpdatedAt = now;
            changedParents.push(m);
          }
        });
      }
      targetShared.updatedAt = now;

      try {
        const stKey = `b2ks_state_${slug}`;
        if (localStorage.getItem(stKey)) {
          localStorage.setItem(stKey, JSON.stringify(targetShared));
        }
      } catch {
        // ignore
      }

      if (fbUrl) {
        try {
          await Promise.all([
            fetch(`${fbUrl}/${ns}/shared.json`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(targetShared)
            }),
            ...changedParents.map((pm) =>
              fetch(`${fbUrl}/${ns}/member_data/${pm.id}.json`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pm)
              })
            ),
            fetch(`${fbUrl}/b2ks_family_directory/${slug}.json`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                updatedAt: now,
                dailyParentAllowance: targetShared.dailyParentAllowance ?? DAILY_PARENT_ALLOWANCE,
                maxParentPoints: targetShared.maxParentPoints ?? MAX_PARENT_POINTS,
                members: targetShared.members.map((m: any) => ({
                  id: m.id,
                  name: m.name,
                  role: m.role,
                  age: m.age,
                  outfit: m.outfit || '',
                  points: m.points
                }))
              })
            })
          ]);
        } catch {
          return { ok: false, msg: '❌ Lỗi đồng bộ điểm Phụ huynh lên Firebase!' };
        }
      }
      return { ok: true, msg: `💰 Đã cập nhật điểm & ngân sách Phụ huynh khu phố "${targetShared.familyName || slug}"!` };
    },
    authenticateFamilyLogin: async (familyNameInput: string, passwordInput: string) => {
      const cleanFamily = String(familyNameInput || 'B2KS').trim() || 'B2KS';
      const enteredPw = String(passwordInput || '').trim();
      const targetSlug = normalizeFamilySlug(cleanFamily);
      const fbUrl = deviceConfig.firebaseUrl;
      const fbPath = getFamilyFirebaseRoot(cleanFamily);

      const targetStorageKey = targetSlug === 'b2ks' ? LEGACY_STORAGE_KEY : `b2ks_state_${targetSlug}`;
      const localSavedRaw = localStorage.getItem(targetStorageKey);
      let localParsedState: any = null;
      try {
        if (localSavedRaw) localParsedState = JSON.parse(localSavedRaw);
      } catch {
        localParsedState = null;
      }

      let localSecrets: any = null;
      try {
        const secRaw = localStorage.getItem(`b2ks_durable_secrets_v1_${targetSlug}`);
        if (secRaw) localSecrets = JSON.parse(secRaw);
      } catch {
        localSecrets = null;
      }

      let remoteAuthMeta: any = null;
      let remoteDir: any = null;
      let remoteMembersOnly: any = null;
      if (fbUrl) {
        try {
          const [metaRes, dirRes] = await Promise.all([
            fetch(`${fbUrl}/${fbPath}/auth_meta.json`),
            fetch(`${fbUrl}/b2ks_family_directory/${targetSlug}.json`)
          ]);
          [remoteAuthMeta, remoteDir] = await Promise.all([metaRes.json(), dirRes.json()]);
          if (!remoteAuthMeta && (!remoteDir || !Array.isArray(remoteDir.members))) {
            const memRes = await fetch(`${fbUrl}/${fbPath}/shared/members.json`);
            remoteMembersOnly = await memRes.json();
          }
        } catch {
          // ignore network hiccup; fallback to local existence & secrets
        }
      }

      if (targetSlug !== 'b2ks' && remoteDir && remoteDir.deleted === true) {
        try {
          localStorage.removeItem(targetStorageKey);
          localStorage.removeItem(`b2ks_durable_secrets_v1_${targetSlug}`);
        } catch {
          // ignore
        }
        AudioEngine.playError();
        return {
          ok: false,
          msg: `❌ Khu phố "${cleanFamily}" đã bị Admin xóa hoặc không tồn tại!`,
          familyName: cleanFamily
        };
      }

      const existsLocally = Boolean(localParsedState || localSecrets);
      const existsRemotely = Boolean(
        (remoteAuthMeta && typeof remoteAuthMeta === 'object' && remoteAuthMeta.gamePassword) ||
        (remoteDir && !remoteDir.deleted && Array.isArray(remoteDir.members) && remoteDir.members.length > 0) ||
        (Array.isArray(remoteMembersOnly) && remoteMembersOnly.length > 0)
      );

      if (targetSlug !== 'b2ks' && !existsLocally && !existsRemotely) {
        AudioEngine.playError();
        return {
          ok: false,
          msg: `❌ Khu phố "${cleanFamily}" chưa tồn tại! Chỉ Quản trị viên mới có thể tạo khu phố mới.`,
          familyName: cleanFamily
        };
      }

      // Compute expected gamePassword without touching active state yet
      let expectedPw = String(localParsedState?.gamePassword || '1111');
      let expectedPwTs = Number(localParsedState?.gamePasswordUpdatedAt || 0);
      if (localSecrets && (localSecrets.gamePasswordUpdatedAt || 0) >= expectedPwTs && localSecrets.gamePassword) {
        expectedPw = String(localSecrets.gamePassword);
        expectedPwTs = Number(localSecrets.gamePasswordUpdatedAt || 0);
      }
      if (remoteAuthMeta && typeof remoteAuthMeta === 'object') {
        if ((remoteAuthMeta.gamePasswordUpdatedAt || 0) >= expectedPwTs && remoteAuthMeta.gamePassword) {
          expectedPw = String(remoteAuthMeta.gamePassword);
        }
      }

      const displayFamily = String(
        remoteAuthMeta?.familyName || localSecrets?.familyName || localParsedState?.familyName || cleanFamily
      );

      if (enteredPw !== expectedPw) {
        AudioEngine.playError();
        return {
          ok: false,
          msg: `❌ Sai mật khẩu vào khu phố "${displayFamily}"! (Mặc định lần đầu: 1111)`,
          familyName: displayFamily
        };
      }

      // Authenticated! Now load target family state cleanly
      loadGame(cleanFamily);
      if (remoteAuthMeta && typeof remoteAuthMeta === 'object') {
        if ((remoteAuthMeta.gamePasswordUpdatedAt || 0) >= (state.gamePasswordUpdatedAt || 0) && remoteAuthMeta.gamePassword) {
          state.gamePassword = String(remoteAuthMeta.gamePassword);
          state.gamePasswordUpdatedAt = remoteAuthMeta.gamePasswordUpdatedAt || 0;
        }
        if ((remoteAuthMeta.parentPinUpdatedAt || 0) >= (state.parentPinUpdatedAt || 0) && remoteAuthMeta.parentPin) {
          state.parentPin = String(remoteAuthMeta.parentPin);
          state.parentPinUpdatedAt = remoteAuthMeta.parentPinUpdatedAt || 0;
        }
        if ((remoteAuthMeta.familyNameUpdatedAt || 0) >= (state.familyNameUpdatedAt || 0) && remoteAuthMeta.familyName) {
          state.familyName = String(remoteAuthMeta.familyName);
          state.familyNameUpdatedAt = remoteAuthMeta.familyNameUpdatedAt || 0;
        }
      } else if (fbUrl && !hasLocalSaveFile) {
        try {
          const r = await fetch(`${fbUrl}/${fbPath}/shared.json`);
          const remoteShared = await r.json();
          if (remoteShared && Array.isArray(remoteShared.members)) {
            state = { ...state, ...remoteShared };
            ensureStateArrays();
            snapshotSavedPointsMap();
            hasHydratedRemote = true;
          }
        } catch {
          // ignore
        }
      }

      isGameUnlocked = true;
      hudToolsExpanded = false;
      syncHudToolsVisibility();
      localStorage.setItem(LAST_FAMILY_KEY, state.familyName || cleanFamily);
      deviceConfig.lastFamilyName = state.familyName || cleanFamily;
      saveDeviceConfig();
      persistDurableSecrets();
      persistDurableMemberArchive();
      publishFamilyDirectorySummary();
      AudioEngine.init();
      AudioEngine.playSuccess();
      syncSeenTasksBaseline();
      updateNotificationHudUI();
      lastHudSignature = '';
      updateFamilyBrandingDOM();
      updateHUD();
      pullFromFirebase();
      notifySubscribers();
      return {
        ok: true,
        msg: `🏡 Chào mừng gia đình ${state.familyName || cleanFamily}!`,
        familyName: state.familyName || cleanFamily
      };
    },
    getLastLoginFamilyName: () => localStorage.getItem(LAST_FAMILY_KEY) || deviceConfig.lastFamilyName || 'B2KS',
    getWeatherInfo: () => currentWeather || getCachedWeatherInfo(),
    refreshWeather: async (useGeolocation = false) => {
      const next = await fetchLiveWeatherInfo(true, useGeolocation);
      currentWeather = next;
      lastHudSignature = '';
      updateHUD();
      notifySubscribers();
      return next;
    },
    getMemberPresenceMap: () => {
      const now = Date.now();
      const meId = getCurrentUser().id;
      const out: Record<string, { online: boolean; lastSeenAt: number }> = {};
      state.members.forEach((m) => {
        if (m.id === meId) {
          out[m.id] = { online: true, lastSeenAt: now };
        } else {
          const ts = livePosTimestamps.get(m.id) || 0;
          out[m.id] = { online: ts > 0 && now - ts < 16000, lastSeenAt: ts };
        }
      });
      return out;
    },
    subscribe: (fn: () => void) => {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    }
  };
  window.B2KS = bridge;

  /* ==================== 18. CANVAS, CONTROLS & GAME LOOP ==================== */
  const canvasEl = document.getElementById('gameCanvas') as HTMLCanvasElement | null;
  if (!canvasEl) return;
  const canvas: HTMLCanvasElement = canvasEl;
  controller3d = createB2KS3DController({
    canvasEl: canvas,
    labelLayerEl: document.getElementById('world-labels-layer'),
    isUnlocked: () => isGameUnlocked,
    onZoomSync: (nextZoom: number) => {
      zoomLevel = nextZoom;
      const btn = document.getElementById('zoom-level-btn');
      if (btn) btn.innerText = `${Math.round(nextZoom * 100)}%`;
    },
    onCameraModeSync: (mode: string) => {
      syncCameraModeUI(mode);
    }
  });
  syncCameraModeUI();
  const resizeCanvas = () => {
    controller3d?.onResize();
  };
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();
  syncMinimapToolbarUI();

  const minimapCanvasEl = document.getElementById('minimap-canvas') as HTMLCanvasElement | null;
  if (minimapCanvasEl) {
    const findHitPin = (clientX: number, clientY: number): MinimapPinHit | null => {
      const rect = minimapCanvasEl.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      const nx = (clientX - rect.left) / rect.width;
      const ny = (clientY - rect.top) / rect.height;
      let best: MinimapPinHit | null = null;
      let bestDist = 0.11;
      for (const hit of minimapPinHits) {
        const d = Math.hypot(hit.nx - nx, hit.ny - ny);
        if (d < bestDist) {
          bestDist = d;
          best = hit;
        }
      }
      return best;
    };

    minimapCanvasEl.addEventListener('click', (e) => {
      e.stopPropagation();
      const hit = findHitPin(e.clientX, e.clientY);
      if (hit) {
        if (activeNavTargetId === hit.id) {
          w.cancelNavigationTarget();
        } else {
          w.setNavigationTarget(hit.id);
        }
      } else {
        w.openSmartphoneModal('maps');
      }
    });

    minimapCanvasEl.addEventListener('mousemove', (e) => {
      const hit = findHitPin(e.clientX, e.clientY);
      if (hit) {
        minimapCanvasEl.title = `${hit.icon} ${hit.name} (${hit.distM}m) — Bấm để ${activeNavTargetId === hit.id ? 'hủy' : 'chỉ đường'}`;
      } else {
        minimapCanvasEl.title = 'Bấm vào biểu tượng tòa nhà để chỉ đường nhanh, hoặc bấm vùng trống để mở Bản đồ';
      }
    });
  }

  let currentInteractTarget: { x: number; y: number; radius: number; label: string; action: () => void } | null = null;
  let lastDoorToastTime = 0;

  w.triggerInteraction = () => {
    if (!isGameUnlocked) return;
    if (currentInteractTarget?.action) {
      AudioEngine.playClick();
      currentInteractTarget.action();
    }
  };

  const keys: Record<string, boolean> = {};
  window.addEventListener('keydown', (e) => {
    if (!isGameUnlocked) return;
    const tag = (document.activeElement as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (typeof e.key !== 'string') return;
    const k = e.key.toLowerCase();
    const soccerModal = document.getElementById('soccer-modal');
    if (soccerModal && soccerModal.style.display === 'flex') {
      if (soccerGame.handleKey(e.key, true)) {
        e.preventDefault();
        return;
      }
    }
    keys[k] = true;
    const arcadeModal = document.getElementById('arcade-modal');
    if (arcadeModal && arcadeModal.style.display === 'flex' && arcadeEngine.getRoomState().status === 'playing') {
      arcadeEngine.handleArcadeKeyPress(k);
      return;
    }
    if ((e.key === ' ' || e.key === 'Enter') && currentInteractTarget) {
      e.preventDefault();
      w.triggerInteraction();
    }
  });
  window.addEventListener('keyup', (e) => {
    if (typeof e.key !== 'string') return;
    const soccerModal = document.getElementById('soccer-modal');
    if (soccerModal && soccerModal.style.display === 'flex') {
      soccerGame.handleKey(e.key, false);
    }
    keys[e.key.toLowerCase()] = false;
  });

  document.addEventListener('click', (e) => {
    const wrap = document.getElementById('member-switcher-wrap');
    const menu = document.getElementById('member-dropdown-menu');
    if (wrap && menu && !wrap.contains(e.target as Node)) menu.classList.remove('open');
  });

  // Mobile Joystick
  const joyBase = document.getElementById('joystick-base');
  const joyKnob = document.getElementById('joystick-knob');
  let joyVector = { x: 0, y: 0 };
  let joyActive = false;

  const handleJoyMove = (clientX: number, clientY: number) => {
    if (!joyBase || !joyKnob || !isGameUnlocked) return;
    const rect = joyBase.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const maxD = 26;
    const dist = Math.hypot(dx, dy);
    if (dist > maxD) { dx = (dx / dist) * maxD; dy = (dy / dist) * maxD; }
    joyKnob.style.transform = `translate(${dx}px, ${dy}px)`;
    joyVector = { x: dx / maxD, y: dy / maxD };
  };
  const resetJoy = () => {
    joyActive = false;
    if (joyKnob) joyKnob.style.transform = 'translate(0,0)';
    joyVector = { x: 0, y: 0 };
  };
  if (joyBase) {
    joyBase.addEventListener('touchstart', (e) => { if (!isGameUnlocked) return; e.preventDefault(); AudioEngine.init(); joyActive = true; handleJoyMove(e.touches[0].clientX, e.touches[0].clientY); });
    joyBase.addEventListener('touchmove', (e) => { if (!isGameUnlocked) return; e.preventDefault(); if (joyActive) handleJoyMove(e.touches[0].clientX, e.touches[0].clientY); });
    joyBase.addEventListener('touchend', resetJoy);
    joyBase.addEventListener('mousedown', (e) => { if (!isGameUnlocked) return; AudioEngine.init(); joyActive = true; handleJoyMove(e.clientX, e.clientY); });
  }
  window.addEventListener('mousemove', (e) => { if (joyActive) handleJoyMove(e.clientX, e.clientY); });
  window.addEventListener('mouseup', resetJoy);

  const streetCars: StreetCar[] = [
    { axis: 'h', x: 150, y: 505, speed: 2.1, color: '#E74C3C', dir: 1, kind: 'car' },
    { axis: 'h', x: 960, y: 515, speed: 3.1, color: '#0EA5E9', dir: 1, kind: 'moto' },
    { axis: 'h', x: 1650, y: 560, speed: -2.2, color: '#3498DB', dir: -1, kind: 'bus' },
    { axis: 'h', x: 2450, y: 545, speed: -1.6, color: '#10B981', dir: -1, kind: 'bike' },
    { axis: 'h', x: 400, y: 1055, speed: 2.0, color: '#F39C12', dir: 1, kind: 'truck' },
    { axis: 'h', x: 1320, y: 1068, speed: 3.2, color: '#EC4899', dir: 1, kind: 'moto' },
    { axis: 'h', x: 2150, y: 1115, speed: -2.5, color: '#9B59B6', dir: -1, kind: 'car' },
    { axis: 'h', x: 640, y: 1105, speed: -1.7, color: '#F97316', dir: -1, kind: 'bike' },
    { axis: 'h', x: 520, y: 1680, speed: 2.3, color: '#2563EB', dir: 1, kind: 'car' },
    { axis: 'h', x: 2180, y: 1730, speed: -2.0, color: '#F59E0B', dir: -1, kind: 'bus' },
    { axis: 'v', x: 1215, y: 310, speed: 1.9, color: '#16A085', dir: 1, kind: 'car' },
    { axis: 'v', x: 1232, y: 820, speed: 2.8, color: '#DC2626', dir: 1, kind: 'moto' },
    { axis: 'v', x: 1275, y: 1550, speed: -2.1, color: '#E67E22', dir: -1, kind: 'bus' },
    { axis: 'v', x: 2575, y: 650, speed: 2.2, color: '#38BDF8', dir: 1, kind: 'car' },
    { axis: 'v', x: 2635, y: 1480, speed: -1.9, color: '#10B981', dir: -1, kind: 'truck' }
  ];

  /* ==================== CONTEXTUAL BOTTOM CHAT BAR & WORLD INTERACTABLES ==================== */
  let manualChatForcedUntil = 0;
  let manualChatOrigin: { x: number; y: number; scene: string } | null = null;
  let chatHiddenByUserUntil = 0;
  let lastChatVisibleState = false;

  function openContextualChatBar(placeholderText?: string, presetValue?: string) {
    const me = getCurrentUser();
    manualChatForcedUntil = Date.now() + 30000;
    manualChatOrigin = { x: me.x, y: me.y, scene: me.scene };
    chatHiddenByUserUntil = 0;
    const bar = document.getElementById('rpg-chat-bar');
    const inp = document.getElementById('chat-input') as HTMLInputElement | null;
    if (bar) bar.style.display = 'flex';
    if (inp) {
      if (placeholderText) inp.placeholder = placeholderText;
      if (typeof presetValue === 'string') inp.value = presetValue;
      inp.focus();
    }
    lastChatVisibleState = true;
  }

  w.hideContextualChatBar = () => {
    manualChatForcedUntil = 0;
    manualChatOrigin = null;
    chatHiddenByUserUntil = Date.now() + 8000;
    const inp = document.getElementById('chat-input') as HTMLInputElement | null;
    if (inp && document.activeElement === inp) inp.blur();
    const logPopup = document.getElementById('chat-log-popup');
    if (logPopup) logPopup.style.display = 'none';
    const bar = document.getElementById('rpg-chat-bar');
    if (bar) bar.style.display = 'none';
    lastChatVisibleState = false;
  };

  function updateContextualChatBar(me: Member) {
    const bar = document.getElementById('rpg-chat-bar');
    if (!bar) return;
    const inp = document.getElementById('chat-input') as HTMLInputElement | null;
    const logPopup = document.getElementById('chat-log-popup');
    const now = Date.now();

    if (manualChatOrigin && (me.scene !== manualChatOrigin.scene || Math.hypot(me.x - manualChatOrigin.x, me.y - manualChatOrigin.y) > 110)) {
      manualChatForcedUntil = 0;
      manualChatOrigin = null;
    }

    const chatCfg = getActivityConfig('english_chat');
    const chatRewardText = chatCfg.enabled && chatCfg.reward > 0 ? `+${chatCfg.reward}⭐` : '+0⭐';

    let contextPlaceholder: string | null = null;
    if (me.scene === 'neighborhood') {
      if (Math.hypot(me.x - 175, me.y - 425) < 95) {
        contextPlaceholder = `💬 Luyện Tiếng Anh tại Công viên (${chatRewardText})...`;
      } else if (Math.hypot(me.x - 1540, me.y - 1400) < 95) {
        contextPlaceholder = `📖 Đọc câu Tiếng Anh (${chatRewardText})...`;
      }
    }

    if (!contextPlaceholder) {
      const nearOther = state.members.find(
        (other) => other.id !== me.id && other.scene === me.scene && Math.hypot(me.x - other.x, me.y - other.y) < 85
      );
      if (nearOther) {
        contextPlaceholder = `💬 Nói với ${nearOther.name} (${chatRewardText} nếu dùng Tiếng Anh)...`;
      }
    }

    const isInputFocused = document.activeElement === inp;
    const isLogOpen = Boolean(logPopup && logPopup.style.display === 'block');
    const isForced = now < manualChatForcedUntil;
    const shouldShow = isInputFocused || isLogOpen || isForced || (Boolean(contextPlaceholder) && now >= chatHiddenByUserUntil);

    if (shouldShow && contextPlaceholder && inp && !isInputFocused) {
      inp.placeholder = contextPlaceholder;
    }
    if (shouldShow !== lastChatVisibleState) {
      bar.style.display = shouldShow ? 'flex' : 'none';
      const promptEl = document.getElementById('interact-prompt');
      if (promptEl) promptEl.style.bottom = shouldShow ? '132px' : '84px';
      lastChatVisibleState = shouldShow;
    }
  }

  function getWorldInteractables() {
    const me = getCurrentUser();
    const brand = (state.familyName || 'B2KS').trim() || 'B2KS';
    const items: { x: number; y: number; radius: number; label: string; action: () => void }[] = [];
    const chatCfg = getActivityConfig('english_chat');
    const chatRewardText = chatCfg.enabled && chatCfg.reward > 0 ? `+${chatCfg.reward}⭐` : '+0⭐';

    if (me.scene === 'neighborhood') {
      const resolvedLocs = resolveNeighborhoodLocations(state);
      const locById = new Map(resolvedLocs.map((l) => [l.id, l]));
      const coord = (id: string, fx: number, fy: number) => {
        const hit = locById.get(id);
        return hit ? { x: hit.x, y: hit.y } : { x: fx, y: fy };
      };

      const pHouse = coord('house', (PLOTS[state.house.plotIndex] || PLOTS[1]).x, (PLOTS[state.house.plotIndex] || PLOTS[1]).y + 85);
      const pEngPark = coord('eng_park', 175, 425);
      const pSuper = coord('supermarket', 1560, 410);
      const pCW = coord('cross_world', 1980, 410);
      const pPetShop = coord('pet_shop', PET_SHOP_POS.x, PET_SHOP_POS.interactY);
      const pEngCenter = coord('english_center', 250, 925);
      const pFashion = coord('fashion', 600, 945);
      const pArcade = coord('arcade', 950, 790);
      const pLab = coord('lab', 1540, 790);
      const pSalon = coord('salon', 1760, 975);
      const pFlea = coord('flea_market', 1980, 790);
      const pChurch = coord('church', 2345, 955);
      const pFountain = coord('fountain_plaza', 280, 1420);
      const pZoo = coord('zoo', 820, 1485);
      const pRead = coord('reading_corner', 1540, 1400);
      const pSoccer = coord('soccer', SOCCER_PITCH_POS.x, SOCCER_PITCH_POS.y);

      items.push({ x: pHouse.x, y: pHouse.y, radius: 75, label: '🏠 Vào nhà', action: () => openModal('house-modal') });
      items.push({ x: pEngPark.x, y: pEngPark.y, radius: 82, label: '💬 Luyện Tiếng Anh', action: () => { openContextualChatBar(`💬 Nhập câu tiếng Anh tại Công viên (${chatRewardText})...`); showToast(`💡 Hãy nhập một câu tiếng Anh để nhận ${chatRewardText}!`); } });
      items.push({ x: pSuper.x, y: pSuper.y, radius: 88, label: '🏪 Vào Siêu thị', action: () => openModal('shop-modal') });
      items.push({ x: pCW.x, y: pCW.y, radius: 92, label: '🌌 Trung Tâm Xuyên Thế Giới', action: () => openReactModal('cross_world') });
      items.push({ x: pEngCenter.x, y: pEngCenter.y, radius: 88, label: '🎓 Vào Trung Tâm Tiếng Anh', action: () => openModal('english-center-modal') });
      items.push({ x: pFashion.x, y: pFashion.y, radius: 88, label: '👗 Cửa Hàng Thời Trang', action: () => openModal('fashion-modal') });
      items.push({ x: pArcade.x, y: pArcade.y, radius: 92, label: '🕹️ Vào Khu Vui Chơi (1⭐/lượt)', action: () => openModal('arcade-modal') });
      items.push({ x: pLab.x, y: pLab.y, radius: 90, label: '🧪 Vào Phòng Thí Nghiệm (10⭐)', action: () => openModal('invention-lab-modal') });
      items.push({ x: pFlea.x, y: pFlea.y, radius: 92, label: `🎪 Vào Chợ Trời ${brand}`, action: () => openReactModal('flea_market') });
      items.push({ x: pChurch.x, y: pChurch.y, radius: 95, label: '⛪ Vào Nhà Thờ Tin Lành (Đố Kinh Thánh)', action: () => openReactModal('church_bible') });
      items.push({ x: pSalon.x, y: pSalon.y, radius: 88, label: '💇 Salon Tóc', action: () => openModal('salon-modal') });

      foreignNpcStates.forEach((npc) => {
        items.push({
          x: npc.x,
          y: npc.y,
          radius: 95,
          label: `💬 Giao tiếp với ${npc.name}`,
          action: () => {
            activeSpeakingNpc = { id: npc.id, name: npc.name, gender: npc.gender };
            openReactModal('speaking_practice');
          }
        });
      });

      const parkSt = getActivityStatus(me, 'park_rest');
      const parkLabel = parkSt.canEarn
        ? `⛲ Nghỉ chân Quảng trường (+${parkSt.reward}⭐) [${parkSt.count}/${parkSt.maxPerDay}]`
        : parkSt.onCooldown
        ? `⛲ Nghỉ chân (Chờ ${Math.ceil(parkSt.remainMs / 60000)}p)`
        : '⛲ Nghỉ chân Quảng trường';
      items.push({ x: pFountain.x, y: pFountain.y, radius: 85, label: parkLabel, action: () => performRoutineActivity(me, 'park_rest', 'What a lovely sunny park!') });
      items.push({ x: pZoo.x, y: pZoo.y, radius: 98, label: `🦁 Vào Sở Thú Ảo ${brand} Zoo`, action: () => openReactModal('virtual_zoo') });
      items.push({
        x: pRead.x, y: pRead.y, radius: 85, label: '📚 Góc Đọc Sách Tiếng Anh',
        action: () => {
          openContextualChatBar(`📖 Nhập câu Tiếng Anh (${chatRewardText})...`, 'I love reading English books in the park!');
          showToast(`📖 Nhấn Nói để đọc to câu tiếng Anh & nhận ${chatRewardText}!`);
        }
      });
      items.push({ x: pSoccer.x, y: pSoccer.y, radius: 145, label: `⚽ Sân Bóng Đá ${brand} (1P / 2P / Xem)`, action: () => openModal('soccer-modal') });
      items.push({ x: pPetShop.x, y: pPetShop.y, radius: 92, label: `🐾 Cửa Hàng Thú Cưng ${brand}`, action: () => { petModalMode = 'shop'; petShopTab = 'eggs'; openModal('pet-shop-modal'); } });
    } else if (me.scene === 'private_room') {
      const room = getActivePrivateRoom();
      const isOwner = Boolean(room && room.ownerIds && room.ownerIds.includes(me.id));
      const exitX = room?.doorSide === 'right' ? PRIVATE_ROOM_WORLD.width - 18 : 18;
      items.push({ x: exitX, y: 310, radius: 64, label: '🚪 Ra hành lang', action: exitPrivateRoomToHallway });
      const sleepSt = getActivityStatus(me, 'sleep');
      const sleepLabel = sleepSt.canEarn
        ? `😴 Đi ngủ / Nghỉ ngơi (+${sleepSt.reward}⭐) [${sleepSt.count}/${sleepSt.maxPerDay}]`
        : sleepSt.onCooldown
        ? `😴 Ngủ nghỉ (Chờ ${Math.ceil(sleepSt.remainMs / 60000)}p)`
        : '😴 Ngủ nghỉ trên giường';
      items.push({ x: 68, y: 68, radius: 95, label: sleepLabel, action: () => performRoutineActivity(me, 'sleep', 'Time to rest and recharge! 😴✨') });
      items.push({
        x: 706, y: 46, radius: 100, label: isOwner ? '🧥 Mở tủ quần áo' : '🔒 Tủ quần áo riêng',
        action: () => {
          if (isOwner && room) { wardrobeOpenedRoomId = room.id; openModal('custom-modal'); w.switchCustomTab('char'); }
          else { AudioEngine.playError(); showToast('🔒 Đây là tủ quần áo riêng của chủ phòng!'); }
        }
      });
      if (isOwner) {
        const owner = (room && room.ownerIds && state.members.find((m) => m.id === room.ownerIds![0])) || me;
        ROOM_DECOR_SLOTS.forEach((slot) => {
          const placedId = owner.roomSlots?.[slot.id];
          const placedName = placedId ? findAnyCatalogItem(placedId)?.name : null;
          items.push({
            x: slot.x, y: slot.y, radius: 46,
            label: placedName ? `🎒 Đổi / Cất: ${placedName}` : `📌 Trang trí: ${slot.label}`,
            action: () => {
              selectedRoomSlotId = slot.id;
              openModal('slot-picker-modal');
              renderPrivateRoomSlotBar(false);
            }
          });
        });
      }
    } else {
      const { yShift } = getHouseLayoutMetrics();
      items.push({
        x: 560, y: 735 + yShift, radius: 58, label: '🚪 Ra ngoài phố',
        action: () => {
          const houseLoc = resolveNeighborhoodLocations(state).find((l) => l.id === 'house');
          const plot = PLOTS[state.house.plotIndex] || PLOTS[1];
          controller3d?.clearTapTarget();
          me.scene = 'neighborhood';
          me.x = houseLoc ? houseLoc.x : plot.x;
          me.y = (houseLoc ? houseLoc.y : plot.y + 85) + 15;
          me.dir = 'down';
          AudioEngine.playClick();
          showToast('🏘️ Bạn đã bước ra ngoài Khu phố!');
          updateHUD();
          saveGame();
        }
      });
      items.push({ x: 210, y: 650 + yShift, radius: 75, label: '📋 Nhiệm vụ', action: () => openSmartphoneModal('tasks') });
      items.push({ x: 320, y: 615 + yShift, radius: 68, label: '📺 Bật Tivi YouTube', action: () => openModal('tv-modal') });
      const eatSt = getActivityStatus(me, 'eat');
      items.push({
        x: 830, y: 665 + yShift, radius: 80,
        label: eatSt.canEarn ? `🍽️ Ăn cơm & Đố Tiếng Anh (+${eatSt.reward}⭐) [${eatSt.count}/${eatSt.maxPerDay}]` : '🍽️ Ăn cơm & Đố Tiếng Anh',
        action: () => w.openDiningFoodPuzzleModal()
      });
      const f2Common = getHouseRooms().find((r) => r.id === 'f2_common');
      const bookX = 225;
      const bookY = f2Common ? f2Common.y + 115 : 455 + yShift;
      const readCfg = getActivityConfig('read_comic');
      items.push({
        x: bookX,
        y: bookY,
        radius: 90,
        label: readCfg.enabled && readCfg.reward > 0
          ? `📚 Tủ Sách Truyện Tranh (+${readCfg.reward}⭐)`
          : '📚 Tủ Sách Truyện Tranh Tiếng Anh',
        action: () => openReactModal('comic_library')
      });
      const curRoom = getRoomAtPosition(me.x, me.y);
      if (curRoom?.wardrobe) {
        const isOwner = curRoom.ownerIds?.includes(me.id);
        items.push({
          x: curRoom.wardrobe.x, y: curRoom.wardrobe.y + 42, radius: 75,
          label: isOwner ? '🚪 Mở tủ quần áo' : '🔒 Tủ quần áo riêng',
          action: () => {
            if (isOwner) { wardrobeOpenedRoomId = curRoom.id; openModal('custom-modal'); w.switchCustomTab('char'); }
            else { AudioEngine.playError(); showToast('🔒 Đây là tủ quần áo riêng của chủ phòng!'); }
          }
        });
      }
      const { yShift: legYShift } = getHouseLayoutMetrics();
      (me.roomDecor || []).forEach((dec, idx) => {
        const cat = findAnyCatalogItem(dec.id);
        items.push({
          x: dec.x,
          y: dec.y + legYShift,
          radius: 52,
          label: `🎒 Cất "${cat?.name || dec.id}" vào túi`,
          action: () => w.pickupLegacyRoomDecor(idx)
        });
      });
    }

    state.members.forEach((other) => {
      if (other.id !== me.id && other.scene === me.scene) {
        items.push({
          x: other.x, y: other.y, radius: 60, label: `💬 Nói với ${other.name}`,
          action: () => {
            openContextualChatBar(`💬 Nói với ${other.name} (${chatRewardText} nếu dùng Tiếng Anh)...`, `Hi ${other.name}, how are you?`);
          }
        });
      }
    });
    return items;
  }

  /* ==================== 19. LOAD & PERIODIC CLOUD SYNC ==================== */
  function loadGame(overrideFamilyName?: string) {
    loadSharedEnglishBank();
    loadSharedSpeakingBank();
    loadSharedBibleBank();
    const famName = (overrideFamilyName ?? localStorage.getItem(LAST_FAMILY_KEY) ?? deviceConfig.lastFamilyName ?? 'B2KS').trim() || 'B2KS';
    state = createFreshDefaultState(famName);
    hasHydratedRemote = false;

    const storageKey = getFamilyStorageKey(famName);
    const saved = localStorage.getItem(storageKey);
    hasLocalSaveFile = Boolean(saved);

    const localPin = localStorage.getItem('b2ks_parent_pin');
    const localPinTs = parseInt(localStorage.getItem('b2ks_parent_pin_ts') || '0', 10);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          if (!Array.isArray(parsed.members) || parsed.members.length === 0) delete parsed.members;
          if (!parsed.house || typeof parsed.house !== 'object') delete parsed.house;
          delete parsed.englishQuestions;
          state = { ...state, ...parsed };
          state.englishQuestions = globalEnglishBank;
          const parsedPinTs = parsed.parentPinUpdatedAt || 0;
          if (localPin && localPin.length >= 4 && localPinTs >= parsedPinTs) {
            state.parentPin = localPin;
            state.parentPinUpdatedAt = localPinTs;
          }
          if (state.house && (state.house.plotIndex < 0 || state.house.plotIndex >= PLOTS.length)) state.house.plotIndex = 1;
          if (Array.isArray(state.members)) {
            state.members.forEach((m) => {
              if (!m.scene) m.scene = 'neighborhood';
              if (m.scene === 'neighborhood') {
                m.x = Math.max(60, Math.min(STREET_WORLD.width - 60, m.x || 860));
                m.y = Math.max(280, Math.min(STREET_WORLD.height - 60, m.y || 435));
              }
            });
          }
        }
      } catch {
        // ignore corrupt save
      }
    }

    // Restore durable secrets if saved independently (prevents password/pin resets on updates)
    try {
      const secRaw = localStorage.getItem(getDurableSecretsKey(famName));
      if (secRaw) {
        const sec = JSON.parse(secRaw);
        if (sec && typeof sec === 'object') {
          if ((sec.familyNameUpdatedAt || 0) >= (state.familyNameUpdatedAt || 0) && sec.familyName) {
            state.familyName = String(sec.familyName);
            state.familyNameUpdatedAt = sec.familyNameUpdatedAt || 0;
          }
          if ((sec.gamePasswordUpdatedAt || 0) >= (state.gamePasswordUpdatedAt || 0) && sec.gamePassword) {
            state.gamePassword = String(sec.gamePassword);
            state.gamePasswordUpdatedAt = sec.gamePasswordUpdatedAt || 0;
          }
          if ((sec.parentPinUpdatedAt || 0) >= (state.parentPinUpdatedAt || 0) && sec.parentPin) {
            state.parentPin = String(sec.parentPin);
            state.parentPinUpdatedAt = sec.parentPinUpdatedAt || 0;
          }
        }
      }
    } catch {
      // ignore
    }

    // Restore durable points ledger if any member points timestamp in ledger is strictly newer
    try {
      const ledgerRaw = localStorage.getItem(getPointsLedgerKey(famName));
      if (ledgerRaw) {
        const ledger = JSON.parse(ledgerRaw);
        if (ledger && typeof ledger === 'object') {
          state.members.forEach((m) => {
            const entry = ledger[m.id];
            if (entry && typeof entry.points === 'number') {
              const entryTs = Math.max(entry.pointsUpdatedAt || 0, entry.adminPointsUpdatedAt || 0);
              const curTs = Math.max(m.pointsUpdatedAt || 0, m.adminPointsUpdatedAt || 0);
              if (entryTs > curTs) {
                m.points = entry.points;
                m.pointsUpdatedAt = entry.pointsUpdatedAt || entryTs;
                m.adminPointsUpdatedAt = Math.max(m.adminPointsUpdatedAt || 0, entry.adminPointsUpdatedAt || 0);
              }
            }
          });
        }
      }
    } catch {
      // ignore
    }

    restoreDurableMemberArchive(famName);
    ensureStateArrays();
    snapshotSavedPointsMap();
    snapshotPushedMemberTimestamps();
    syncSeenTasksBaseline();
    pruneExpiredFamilyMessages();
    if (deviceConfig.currentMemberId && state.members.some((m) => m.id === deviceConfig.currentMemberId)) {
      state.currentUserId = deviceConfig.currentMemberId;
    }
    checkDailyAllowance(false);
    const cur = getCurrentUser();
    if (cur && cur.scene === 'house') {
      const startRoom = getRoomAtPosition(cur.x, cur.y);
      if (startRoom && startRoom.ownerIds && startRoom.ownerIds.length > 0) {
        activePrivateRoomId = startRoom.id;
        cur.scene = 'private_room';
        cur.privateRoomId = startRoom.id;
        cur.x = startRoom.doorSide === 'right' ? PRIVATE_ROOM_WORLD.width - 58 : 58;
        cur.y = 310;
      }
    } else if (cur && cur.scene === 'private_room') {
      activePrivateRoomId = cur.privateRoomId || getMemberPrivateRoom(cur)?.id || null;
    }
    if (state.bgmTheme) {
      AudioEngine.setTheme(state.bgmTheme);
    }
    updateNotificationHudUI();
    syncPrivateRoomToolbar();
    syncHudToolsVisibility();
    updateFamilyBrandingDOM();
  }

  function mergeOwnedPets(localPets: OwnedPet[], remotePets: OwnedPet[]): OwnedPet[] {
    const byId = new Map<string, OwnedPet>();
    (remotePets || []).forEach((p) => { if (p && p.id) byId.set(p.id, p); });
    (localPets || []).forEach((lp) => {
      if (!lp || !lp.id) return;
      const rp = byId.get(lp.id);
      if (!rp) {
        byId.set(lp.id, lp);
      } else {
        const lpScore = (lp.hatched ? 100000 : 0) + (lp.stage || 0) * 10000 + (lp.xp || 0) * 10 + (lp.hatchProgress || 0);
        const rpScore = (rp.hatched ? 100000 : 0) + (rp.stage || 0) * 10000 + (rp.xp || 0) * 10 + (rp.hatchProgress || 0);
        if (lpScore > rpScore) {
          byId.set(lp.id, lp);
        } else if (rpScore > lpScore) {
          byId.set(lp.id, rp);
        } else {
          byId.set(lp.id, { ...rp, ...lp, variant: lp.variant || rp.variant, gender: lp.gender || rp.gender, accessoryId: lp.accessoryId ?? rp.accessoryId });
        }
      }
    });
    return Array.from(byId.values()).sort((a, b) => (b.obtainedAt || 0) - (a.obtainedAt || 0));
  }

  function mergeAccessoryLists(a: string[] = [], b: string[] = []): string[] {
    return Array.from(new Set([...(a || []), ...(b || [])]));
  }

  function refreshOpenMemberViews() {
    syncPrivateRoomToolbar();
    const bagModal = document.getElementById('bag-modal');
    if (bagModal && bagModal.style.display === 'flex') renderBagModal(currentBagTab);
    const customModal = document.getElementById('custom-modal');
    if (customModal && customModal.style.display === 'flex') renderCustomModal();
    const slotModal = document.getElementById('slot-picker-modal');
    if (slotModal && slotModal.style.display === 'flex') renderPrivateRoomSlotBar(false);
    const tasksModal = document.getElementById('tasks-modal');
    if (tasksModal && tasksModal.style.display === 'flex') renderTasksModal();
    const phoneModal = document.getElementById('smartphone-modal');
    if (phoneModal && phoneModal.style.display === 'flex') renderSmartphoneScreen();
  }

  function pullFromFirebase() {
    if (!deviceConfig.firebaseUrl) return;
    const fbBase = getFirebaseBasePath();
    const curId = getCurrentUser().id || deviceConfig.currentMemberId;

    fetch(`${deviceConfig.firebaseUrl}/${fbBase}/auth_meta.json`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((meta) => {
        if (!meta || typeof meta !== 'object') return;
        let metaChanged = false;
        if ((meta.familyNameUpdatedAt || 0) > (state.familyNameUpdatedAt || 0) && meta.familyName) {
          state.familyName = String(meta.familyName);
          state.familyNameUpdatedAt = meta.familyNameUpdatedAt || 0;
          metaChanged = true;
        }
        if ((meta.gamePasswordUpdatedAt || 0) > (state.gamePasswordUpdatedAt || 0) && meta.gamePassword) {
          state.gamePassword = String(meta.gamePassword);
          state.gamePasswordUpdatedAt = meta.gamePasswordUpdatedAt || 0;
          metaChanged = true;
        }
        if ((meta.parentPinUpdatedAt || 0) > (state.parentPinUpdatedAt || 0) && meta.parentPin) {
          state.parentPin = String(meta.parentPin);
          state.parentPinUpdatedAt = meta.parentPinUpdatedAt || 0;
          metaChanged = true;
        }
        if (metaChanged) {
          persistDurableSecrets();
          updateFamilyBrandingDOM();
          notifySubscribers();
        }
      })
      .catch(() => {});

    fetch(`${deviceConfig.firebaseUrl}/${fbBase}/shared.json`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((remote) => {
        if (!remote || typeof remote !== 'object') return;
        const shouldHydrate =
          Array.isArray(remote.members) &&
          ((!hasLocalSaveFile && !hasHydratedRemote) || (remote.updatedAt || 0) > (state.updatedAt || 0));

        if (!shouldHydrate) {
          let sideChanged = false;
          if ((remote.tasksUpdatedAt || 0) > (state.tasksUpdatedAt || 0) && Array.isArray(remote.tasks)) {
            state.tasks = remote.tasks;
            state.tasksUpdatedAt = remote.tasksUpdatedAt || 0;
            detectAndNotifyNewTasks();
            sideChanged = true;
          }
          if ((remote.buildingLayoutsUpdatedAt || 0) > (state.buildingLayoutsUpdatedAt || 0)) {
            state.buildingLayouts =
              remote.buildingLayouts && typeof remote.buildingLayouts === 'object' ? { ...remote.buildingLayouts } : {};
            state.buildingLayoutsUpdatedAt = remote.buildingLayoutsUpdatedAt || 0;
            sideChanged = true;
          }
          if ((remote.billboardUpdatedAt || 0) > (state.billboardUpdatedAt || 0) && typeof remote.billboardText === 'string' && remote.billboardText.trim()) {
            state.billboardText = remote.billboardText.trim();
            state.billboardUpdatedAt = remote.billboardUpdatedAt || 0;
            sideChanged = true;
          }
          if ((remote.houseUpdatedAt || 0) > (state.houseUpdatedAt || 0) && remote.house && typeof remote.house === 'object') {
            state.house = { ...remote.house };
            state.houseUpdatedAt = remote.houseUpdatedAt || 0;
            sideChanged = true;
          }
          if ((remote.maxParentPointsUpdatedAt || 0) > (state.maxParentPointsUpdatedAt || 0) && typeof remote.maxParentPoints === 'number') {
            state.maxParentPoints = Math.max(0, Math.round(remote.maxParentPoints));
            state.maxParentPointsUpdatedAt = remote.maxParentPointsUpdatedAt || 0;
            sideChanged = true;
          }
          if (Array.isArray(remote.members)) {
            remote.members.forEach((rm: Member) => {
              const lm = state.members.find((x) => x.id === rm.id);
              if (lm && (rm.nameUpdatedAt || 0) > (lm.nameUpdatedAt || 0) && rm.name) {
                lm.name = rm.name;
                lm.nameUpdatedAt = rm.nameUpdatedAt || 0;
                sideChanged = true;
              }
            });
          }
          if (sideChanged) {
            const { englishQuestions: _omitSideEq, ...sidePayload } = state;
            localStorage.setItem(getFamilyStorageKey(), JSON.stringify(sidePayload));
            persistDurableMemberArchive();
            lastHudSignature = '';
            updateHUD();
            refreshOpenMemberViews();
            notifySubscribers();
          }
          return;
        }

        if (shouldHydrate) {
          hasHydratedRemote = true;
          const localMembersBackup = state.members.map((m) => ({ ...m }));
          const localMe = localMembersBackup.find((m) => m.id === curId);
          const localPin = state.parentPin;
          const localPinTs = state.parentPinUpdatedAt || parseInt(localStorage.getItem('b2ks_parent_pin_ts') || '0', 10);
          const localGamePw = state.gamePassword;
          const localGamePwTs = state.gamePasswordUpdatedAt || 0;
          const localFamName = state.familyName;
          const localFamNameTs = state.familyNameUpdatedAt || 0;
          const localLayouts = state.buildingLayouts;
          const localLayoutsTs = state.buildingLayoutsUpdatedAt || 0;
          const localBillboardText = state.billboardText;
          const localBillboardTs = state.billboardUpdatedAt || 0;
          const localHouse = state.house;
          const localHouseTs = state.houseUpdatedAt || 0;
          const localMaxParentPts = state.maxParentPoints;
          const localMaxParentPtsTs = state.maxParentPointsUpdatedAt || 0;
          const localActCfg = state.activityConfigs;
          const localActCfgTs = state.activityConfigsUpdatedAt || 0;
          const prevUnread = getUnreadMessageCount(getCurrentUser());

          const { englishQuestions: _ignoreRemoteEq, ...remoteRest } = remote;
          state = { ...state, ...remoteRest };
          state.englishQuestions = globalEnglishBank;
          state.currentUserId = curId;
          ensureStateArrays();

          if (localActCfg && localActCfgTs > (remote.activityConfigsUpdatedAt || 0)) {
            state.activityConfigs = localActCfg;
            state.activityConfigsUpdatedAt = localActCfgTs;
          }
          if (localFamNameTs > (remote.familyNameUpdatedAt || 0) && localFamName) {
            state.familyName = localFamName;
            state.familyNameUpdatedAt = localFamNameTs;
          }
          if (localGamePwTs > (remote.gamePasswordUpdatedAt || 0) && localGamePw) {
            state.gamePassword = localGamePw;
            state.gamePasswordUpdatedAt = localGamePwTs;
          }
          if (localLayoutsTs > (remote.buildingLayoutsUpdatedAt || 0)) {
            state.buildingLayouts = localLayouts || {};
            state.buildingLayoutsUpdatedAt = localLayoutsTs;
          } else {
            state.buildingLayouts =
              remote.buildingLayouts && typeof remote.buildingLayouts === 'object' ? { ...remote.buildingLayouts } : {};
            state.buildingLayoutsUpdatedAt = remote.buildingLayoutsUpdatedAt || 0;
          }
          if (localBillboardTs > (remote.billboardUpdatedAt || 0) && localBillboardText) {
            state.billboardText = localBillboardText;
            state.billboardUpdatedAt = localBillboardTs;
          } else if (typeof remote.billboardText === 'string' && remote.billboardText.trim()) {
            state.billboardText = remote.billboardText.trim();
            state.billboardUpdatedAt = remote.billboardUpdatedAt || 0;
          }
          if (localHouseTs > (remote.houseUpdatedAt || 0) && localHouse) {
            state.house = localHouse;
            state.houseUpdatedAt = localHouseTs;
          }
          if (localMaxParentPtsTs > (remote.maxParentPointsUpdatedAt || 0) && typeof localMaxParentPts === 'number') {
            state.maxParentPoints = localMaxParentPts;
            state.maxParentPointsUpdatedAt = localMaxParentPtsTs;
          }

          const remotePinTs = remote.parentPinUpdatedAt || 0;
          if (localPinTs > remotePinTs && String(localPin || '').length >= 4) {
            state.parentPin = localPin;
            state.parentPinUpdatedAt = localPinTs;
          } else if (remote.parentPin && String(remote.parentPin).length >= 4) {
            localStorage.setItem('b2ks_parent_pin', String(remote.parentPin));
            localStorage.setItem('b2ks_parent_pin_ts', String(remotePinTs));
          } else {
            state.parentPin = localStorage.getItem('b2ks_parent_pin') || '1234';
          }
          pruneExpiredFamilyMessages();
          if (getUnreadMessageCount(getCurrentUser()) > prevUnread) AudioEngine.playTone(784, 'sine', 0.12, 0.06);

          state.members.forEach((rm, idx) => {
            const lm = localMembersBackup.find((x) => x.id === rm.id);
            if (!lm) return;
            ensureMemberProps(rm);
            ensureMemberProps(lm);
            const mergedPets = mergeOwnedPets(lm.pets || [], rm.pets || []);
            const mergedAcc = mergeAccessoryLists(lm.petAccessories, rm.petAccessories);
            const mergedZoo = unionStringLists(lm.unlockedZooAnimals, rm.unlockedZooAnimals);
            const mergedQuiz = mergeQuizHistory(lm.englishQuizHistory, rm.englishQuizHistory);
            const mergedEngProg = mergeEnglishProgressMaps(lm.englishProgress, rm.englishProgress);
            const mergedBibleProg = mergeBibleProgress(lm.bibleProgress, rm.bibleProgress);
            const mergedComics = unionStringLists(
              lm.comicReadStats?.completedIds || [],
              rm.comicReadStats?.completedIds || []
            );
            const mergedLab = (lm.memberUpdatedAt || 0) === 0 && (rm.memberUpdatedAt || 0) === 0
              ? mergeCustomLabItems(lm.customLabItems, rm.customLabItems)
              : ((lm.memberUpdatedAt || 0) >= (rm.memberUpdatedAt || 0) ? (lm.customLabItems || []) : (rm.customLabItems || []));
            const mergedInv = (lm.memberUpdatedAt || 0) === 0 && (rm.memberUpdatedAt || 0) === 0
              ? unionStringLists(lm.inventory, rm.inventory)
              : ((lm.memberUpdatedAt || 0) >= (rm.memberUpdatedAt || 0) ? (lm.inventory || []) : (rm.inventory || []));
            const mergedAch = mergeAchievementsList(lm.unlockedAchievements, rm.unlockedAchievements);
            const mergedWords = unionStringLists(lm.englishWordsUsed, rm.englishWordsUsed).slice(-2500);
            const maxTasksDone = Math.max(lm.completedTaskCount || 0, rm.completedTaskCount || 0);
            const localIsNewer = (lm.memberUpdatedAt || 0) >= (rm.memberUpdatedAt || 0);
            const localNameNewer = (lm.nameUpdatedAt || 0) >= (rm.nameUpdatedAt || 0);
            const resolvedName = localNameNewer ? (lm.name || rm.name) : (rm.name || lm.name);
            const resolvedNameTs = Math.max(lm.nameUpdatedAt || 0, rm.nameUpdatedAt || 0);
            const remotePtsTs = Math.max(rm.adminPointsUpdatedAt || 0, rm.pointsUpdatedAt || 0);
            const localPtsTs = Math.max(lm.adminPointsUpdatedAt || 0, lm.pointsUpdatedAt || 0);
            const remotePointsNewer = remotePtsTs > localPtsTs;
            const localPointsNewer = localPtsTs > remotePtsTs;

            if (rm.id === curId && localMe) {
              rm.x = localMe.x;
              rm.y = localMe.y;
              rm.dir = localMe.dir;
              rm.scene = localMe.scene;
              rm.privateRoomId = localMe.privateRoomId;
              rm.pets = mergedPets;
              rm.petAccessories = mergedAcc;
              rm.unlockedZooAnimals = mergedZoo;
              rm.englishQuizHistory = mergedQuiz;
              rm.englishProgress = mergedEngProg;
              rm.bibleProgress = mergedBibleProg;
              rm.customLabItems = mergedLab;
              rm.inventory = mergedInv;
              rm.unlockedAchievements = mergedAch;
              rm.englishWordsUsed = mergedWords;
              rm.completedTaskCount = maxTasksDone;
              if ((lm.speakingLevel || 1) >= (rm.speakingLevel || 1)) {
                rm.speakingLevel = lm.speakingLevel;
                rm.speakingStreak = lm.speakingStreak;
              }
              if (lm.helperRobot && (!rm.helperRobot || (lm.helperRobot.updatedAt || 0) >= (rm.helperRobot.updatedAt || 0))) {
                rm.helperRobot = lm.helperRobot;
              }
              if (rm.comicReadStats) rm.comicReadStats.completedIds = mergedComics;
              if (localIsNewer) {
                rm.name = resolvedName;
                rm.nameUpdatedAt = resolvedNameTs;
                rm.age = lm.age;
                rm.role = lm.role;
                rm.activePetId = lm.activePetId;
                rm.petFoodInventory = lm.petFoodInventory;
                rm.vouchers = lm.vouchers;
                rm.roomSlots = lm.roomSlots;
                rm.roomSlotSpecs = lm.roomSlotSpecs;
                rm.roomDecor = lm.roomDecor;
                rm.roomDecorSpecs = lm.roomDecorSpecs;
                rm.inventoryConsumedMigrated = lm.inventoryConsumedMigrated;
                rm.roomWall = lm.roomWall;
                rm.roomUnlocked = lm.roomUnlocked;
                rm.englishChatStats = lm.englishChatStats;
                if (lm.comicReadStats) {
                  rm.comicReadStats = { ...lm.comicReadStats, completedIds: mergedComics };
                }
                rm.outfit = lm.outfit;
                rm.hairStyle = lm.hairStyle;
                rm.hairColor = lm.hairColor;
                rm.shirtColor = lm.shirtColor;
                rm.shirtPattern = lm.shirtPattern;
                rm.pantsColor = lm.pantsColor;
                rm.pantsStyle = lm.pantsStyle;
                rm.memberUpdatedAt = lm.memberUpdatedAt;
                if (!remotePointsNewer) {
                  rm.points = lm.points;
                  rm.pointsUpdatedAt = lm.pointsUpdatedAt;
                  rm.adminPointsUpdatedAt = lm.adminPointsUpdatedAt;
                }
              } else {
                rm.name = resolvedName;
                rm.nameUpdatedAt = resolvedNameTs;
                if (localPointsNewer) {
                  rm.points = lm.points;
                  rm.pointsUpdatedAt = lm.pointsUpdatedAt;
                  rm.adminPointsUpdatedAt = Math.max(rm.adminPointsUpdatedAt || 0, lm.adminPointsUpdatedAt || 0);
                }
              }
            } else if (localIsNewer) {
              state.members[idx] = {
                ...lm,
                name: resolvedName,
                nameUpdatedAt: resolvedNameTs,
                pets: mergedPets,
                petAccessories: mergedAcc,
                unlockedZooAnimals: mergedZoo,
                englishQuizHistory: mergedQuiz,
                englishProgress: mergedEngProg,
                bibleProgress: mergedBibleProg,
                customLabItems: mergedLab,
                inventory: mergedInv,
                unlockedAchievements: mergedAch,
                englishWordsUsed: mergedWords,
                completedTaskCount: maxTasksDone
              };
              if (remotePointsNewer) {
                state.members[idx].points = rm.points;
                state.members[idx].pointsUpdatedAt = rm.pointsUpdatedAt;
                state.members[idx].adminPointsUpdatedAt = rm.adminPointsUpdatedAt;
              }
            } else {
              rm.name = resolvedName;
              rm.nameUpdatedAt = resolvedNameTs;
              rm.pets = mergedPets;
              rm.petAccessories = mergedAcc;
              rm.unlockedZooAnimals = mergedZoo;
              rm.englishQuizHistory = mergedQuiz;
              rm.englishProgress = mergedEngProg;
              rm.bibleProgress = mergedBibleProg;
              rm.customLabItems = mergedLab;
              rm.inventory = mergedInv;
              rm.unlockedAchievements = mergedAch;
              rm.englishWordsUsed = mergedWords;
              rm.completedTaskCount = maxTasksDone;
              if (rm.comicReadStats) rm.comicReadStats.completedIds = mergedComics;
              if (localPointsNewer) {
                rm.points = lm.points;
                rm.pointsUpdatedAt = lm.pointsUpdatedAt;
                rm.adminPointsUpdatedAt = lm.adminPointsUpdatedAt;
              }
            }
            ensureMemberProps(state.members[idx]);
          });

          detectAndNotifyNewTasks();
          snapshotSavedPointsMap();
          const { englishQuestions: _omitSavedEq, ...localStatePayload } = state;
          localStorage.setItem(getFamilyStorageKey(), JSON.stringify(localStatePayload));
          persistPointsLedger();
          persistDurableSecrets();
          persistDurableMemberArchive();
          lastHudSignature = '';
          updateFamilyBrandingDOM();
          updateHUD();
          refreshOpenMemberViews();
          notifySubscribers();
        }
      })
      .catch(() => {});

    // Pull authoritative per-member snapshots for ALL members (ensures inventory, room decor, points & pets sync reliably across devices)
    fetch(`${deviceConfig.firebaseUrl}/${fbBase}/member_data.json`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((memberMap) => {
        if (!memberMap || typeof memberMap !== 'object') return;
        let changed = false;
        let curMemberChanged = false;
        state.members.forEach((m) => {
          const remoteM = memberMap[m.id] as Member | undefined;
          if (!remoteM) return;
          ensureMemberProps(m);
          ensureMemberProps(remoteM);

          const mergedPets = mergeOwnedPets(m.pets || [], remoteM.pets || []);
          const mergedAcc = mergeAccessoryLists(m.petAccessories, remoteM.petAccessories);
          if (
            petsProgressSignature(mergedPets) !== petsProgressSignature(m.pets || []) ||
            mergedAcc.length !== (m.petAccessories || []).length
          ) {
            m.pets = mergedPets;
            m.petAccessories = mergedAcc;
            changed = true;
          }

          const mergedZoo = unionStringLists(m.unlockedZooAnimals, remoteM.unlockedZooAnimals);
          if (mergedZoo.length !== (m.unlockedZooAnimals || []).length) {
            m.unlockedZooAnimals = mergedZoo;
            changed = true;
          }
          const mergedEngProg = mergeEnglishProgressMaps(m.englishProgress, remoteM.englishProgress);
          if (JSON.stringify(mergedEngProg) !== JSON.stringify(m.englishProgress)) {
            m.englishProgress = mergedEngProg;
            changed = true;
          }
          const mergedBibleProg = mergeBibleProgress(m.bibleProgress, remoteM.bibleProgress);
          if (JSON.stringify(mergedBibleProg) !== JSON.stringify(m.bibleProgress)) {
            m.bibleProgress = mergedBibleProg;
            changed = true;
          }
          const mergedAch = mergeAchievementsList(m.unlockedAchievements, remoteM.unlockedAchievements);
          if (mergedAch.length !== (m.unlockedAchievements || []).length) {
            m.unlockedAchievements = mergedAch;
            changed = true;
          }
          const mergedWords = unionStringLists(m.englishWordsUsed, remoteM.englishWordsUsed).slice(-2500);
          if (mergedWords.length !== (m.englishWordsUsed || []).length) {
            m.englishWordsUsed = mergedWords;
            changed = true;
          }
          if ((remoteM.completedTaskCount || 0) > (m.completedTaskCount || 0)) {
            m.completedTaskCount = remoteM.completedTaskCount;
            changed = true;
          }
          if ((remoteM.speakingLevel || 1) > (m.speakingLevel || 1)) {
            m.speakingLevel = remoteM.speakingLevel;
            m.speakingStreak = remoteM.speakingStreak || 0;
            changed = true;
          }
          if (remoteM.helperRobot && (!m.helperRobot || (remoteM.helperRobot.updatedAt || 0) > (m.helperRobot.updatedAt || 0))) {
            m.helperRobot = remoteM.helperRobot;
            changed = true;
          }
          const mergedComics = unionStringLists(
            m.comicReadStats?.completedIds || [],
            remoteM.comicReadStats?.completedIds || []
          );
          if (m.comicReadStats && mergedComics.length !== m.comicReadStats.completedIds.length) {
            m.comicReadStats.completedIds = mergedComics;
            changed = true;
          }

          const remotePtsTs = Math.max(remoteM.adminPointsUpdatedAt || 0, remoteM.pointsUpdatedAt || 0);
          const localPtsTs = Math.max(m.adminPointsUpdatedAt || 0, m.pointsUpdatedAt || 0);
          if (remotePtsTs > localPtsTs && typeof remoteM.points === 'number') {
            m.points = remoteM.points;
            m.pointsUpdatedAt = remoteM.pointsUpdatedAt || remotePtsTs;
            m.adminPointsUpdatedAt = Math.max(m.adminPointsUpdatedAt || 0, remoteM.adminPointsUpdatedAt || 0);
            changed = true;
          }

          if ((remoteM.nameUpdatedAt || 0) > (m.nameUpdatedAt || 0) && remoteM.name) {
            m.name = remoteM.name;
            m.nameUpdatedAt = remoteM.nameUpdatedAt;
            changed = true;
          }

          if ((remoteM.memberUpdatedAt || 0) > (m.memberUpdatedAt || 0)) {
            if (remoteM.name && (remoteM.nameUpdatedAt || 0) >= (m.nameUpdatedAt || 0)) {
              m.name = remoteM.name;
              if (typeof remoteM.nameUpdatedAt === 'number') m.nameUpdatedAt = remoteM.nameUpdatedAt;
            }
            m.age = remoteM.age || m.age;
            m.role = remoteM.role || m.role;
            m.hairStyle = remoteM.hairStyle || m.hairStyle;
            m.hairColor = remoteM.hairColor || m.hairColor;
            m.shirtColor = remoteM.shirtColor || m.shirtColor;
            m.shirtPattern = remoteM.shirtPattern || m.shirtPattern;
            m.pantsColor = remoteM.pantsColor || m.pantsColor;
            m.pantsStyle = remoteM.pantsStyle || m.pantsStyle;
            m.outfit = remoteM.outfit !== undefined ? remoteM.outfit : m.outfit;
            m.activePetId = remoteM.activePetId ?? null;
            // Explicitly default emptied Firebase arrays/objects so deleted/used/placed items don't resurrect
            m.inventory = Array.isArray(remoteM.inventory) ? [...remoteM.inventory] : [];
            m.vouchers = Array.isArray(remoteM.vouchers) ? [...remoteM.vouchers] : [];
            m.customLabItems = Array.isArray(remoteM.customLabItems) ? [...remoteM.customLabItems] : [];
            m.roomSlots = remoteM.roomSlots && typeof remoteM.roomSlots === 'object' ? { ...remoteM.roomSlots } : {};
            m.roomSlotSpecs = remoteM.roomSlotSpecs && typeof remoteM.roomSlotSpecs === 'object' ? { ...remoteM.roomSlotSpecs } : {};
            m.roomDecor = Array.isArray(remoteM.roomDecor) ? [...remoteM.roomDecor] : [];
            m.roomDecorSpecs = remoteM.roomDecorSpecs && typeof remoteM.roomDecorSpecs === 'object' ? { ...remoteM.roomDecorSpecs } : {};
            m.petFoodInventory =
              remoteM.petFoodInventory && typeof remoteM.petFoodInventory === 'object'
                ? { ...remoteM.petFoodInventory }
                : {};
            if (typeof remoteM.inventoryConsumedMigrated === 'boolean') m.inventoryConsumedMigrated = remoteM.inventoryConsumedMigrated;
            if (remoteM.roomWall) m.roomWall = remoteM.roomWall;
            if (typeof remoteM.roomUnlocked === 'boolean') m.roomUnlocked = remoteM.roomUnlocked;
            m.memberUpdatedAt = remoteM.memberUpdatedAt;
            lastPushedMemberUpdatedAt[m.id] = Math.max(lastPushedMemberUpdatedAt[m.id] || 0, remoteM.memberUpdatedAt || 0);
            if (m.id === curId) curMemberChanged = true;
            changed = true;
          }
          ensureMemberProps(m);
        });
        if (changed) {
          snapshotSavedPointsMap();
          const { englishQuestions: _omitMemberSyncEq, ...localPayload2 } = state;
          localStorage.setItem(getFamilyStorageKey(), JSON.stringify(localPayload2));
          persistPointsLedger();
          persistDurableMemberArchive();
          lastHudSignature = '';
          updateHUD();
          if (curMemberChanged) refreshOpenMemberViews();
          notifySubscribers();
        }
      })
      .catch(() => {});

    // Pull shared global English bank metadata only when changed (saves bandwidth on 1,920-question bank)
    const nowMetaCheck = Date.now();
    if (nowMetaCheck - lastSharedEnglishMetaCheckAt >= 15000) {
      lastSharedEnglishMetaCheckAt = nowMetaCheck;
      fetch(`${deviceConfig.firebaseUrl}/b2ks_shared_english_bank_meta.json`, { cache: 'no-store' })
        .then((r) => r.json())
        .then((meta) => {
          if (
            meta &&
            Number(meta.version) >= CURRICULUM_BANK_VERSION &&
            Number(meta.updatedAt || 0) > sharedEnglishBankUpdatedAt
          ) {
            fetch(`${deviceConfig.firebaseUrl}/b2ks_shared_english_bank.json`, { cache: 'no-store' })
              .then((r2) => r2.json())
              .then((fullBank) => {
                if (fullBank && Array.isArray(fullBank.questions) && fullBank.questions.length > 0) {
                  saveSharedEnglishBank(fullBank.questions, Number(fullBank.updatedAt) || Date.now(), false);
                  notifySubscribers();
                }
              })
              .catch(() => {});
          }
        })
        .catch(() => {});
    }

    if (nowMetaCheck - lastSharedSpeakingMetaCheckAt >= 15000) {
      lastSharedSpeakingMetaCheckAt = nowMetaCheck;
      fetch(`${deviceConfig.firebaseUrl}/b2ks_shared_speaking_bank_meta.json`, { cache: 'no-store' })
        .then((r) => r.json())
        .then((meta) => {
          if (
            meta &&
            Number(meta.version) >= SPEAKING_BANK_VERSION &&
            Number(meta.updatedAt || 0) > sharedSpeakingBankUpdatedAt
          ) {
            fetch(`${deviceConfig.firebaseUrl}/b2ks_shared_speaking_bank.json`, { cache: 'no-store' })
              .then((r2) => r2.json())
              .then((fullSpk) => {
                if (fullSpk && Array.isArray(fullSpk.sentences) && fullSpk.sentences.length > 0) {
                  saveSharedSpeakingBank(fullSpk.sentences, Number(fullSpk.updatedAt) || Date.now(), false);
                  notifySubscribers();
                }
              })
              .catch(() => {});
          }
        })
        .catch(() => {});
    }

    if (nowMetaCheck - lastSharedBibleMetaCheckAt >= 15000) {
      lastSharedBibleMetaCheckAt = nowMetaCheck;
      fetch(`${deviceConfig.firebaseUrl}/b2ks_shared_bible_bank_meta.json`, { cache: 'no-store' })
        .then((r) => r.json())
        .then((meta) => {
          if (
            meta &&
            Number(meta.version) >= BIBLE_BANK_VERSION &&
            Number(meta.updatedAt || 0) > sharedBibleBankUpdatedAt
          ) {
            fetch(`${deviceConfig.firebaseUrl}/b2ks_shared_bible_bank.json`, { cache: 'no-store' })
              .then((r2) => r2.json())
              .then((fullBible) => {
                if (fullBible && Array.isArray(fullBible.questions) && fullBible.questions.length > 0) {
                  saveSharedBibleBank(fullBible.questions, Number(fullBible.updatedAt) || Date.now(), false);
                  notifySubscribers();
                }
              })
              .catch(() => {});
          }
        })
        .catch(() => {});
    }

    fetch(`${deviceConfig.firebaseUrl}/${fbBase}/live_pos.json`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((posMap) => {
        if (!posMap || typeof posMap !== 'object') return;
        let presenceChanged = false;
        state.members.forEach((m) => {
          const entry = posMap[m.id];
          if (!entry) return;
          if (typeof entry.ts === 'number') {
            livePosTimestamps.set(m.id, entry.ts);
            presenceChanged = true;
          }
          if (m.id !== curId) {
            m.x = entry.x;
            m.y = entry.y;
            m.dir = entry.dir || 'down';
            m.scene = entry.scene || 'neighborhood';
            m.privateRoomId = entry.privateRoomId || null;
            if (entry.speech && Date.now() < entry.speech.expiresAt) m.speech = entry.speech;
          }
        });
        if (presenceChanged) notifySubscribers();
      })
      .catch(() => {});
  }

  window.setInterval(pullFromFirebase, 2500);
  window.setInterval(arcadeEngine.pullArcadeRoomFromFirebase, 800);
  window.setInterval(soccerGame.pullSoccerRoomFromFirebase, 900);
  window.setInterval(() => {
    if (!deviceConfig.firebaseUrl || !isGameUnlocked) return;
    const cur = getCurrentUser();
    const ts = Date.now();
    livePosTimestamps.set(cur.id, ts);
    fetch(`${deviceConfig.firebaseUrl}/${getFirebaseBasePath()}/live_pos/${cur.id}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        x: Math.round(cur.x), y: Math.round(cur.y), dir: cur.dir || 'down',
        scene: cur.scene || 'neighborhood', privateRoomId: cur.privateRoomId || null,
        speech: cur.speech || null, ts
      })
    }).catch(() => {});
  }, 1200);

  window.setInterval(() => {
    fetchLiveWeatherInfo(false)
      .then((wInfo) => {
        currentWeather = wInfo;
        updateHUD();
      })
      .catch(() => {});
  }, 15 * 60 * 1000);

  window.addEventListener('storage', (e) => {
    const slug = getActiveFamilySlug();
    if (e.key === `b2ks_arcade_online_room_${slug}` && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (parsed && (parsed.updatedAt || 0) > (arcadeEngine.getRoomState()?.updatedAt || 0)) {
          arcadeEngine.onRemoteArcadeRoomUpdate(parsed);
        }
      } catch {
        // ignore
      }
    } else if (e.key === `b2ks_soccer_online_room_${slug}` && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue) as SoccerOnlineRoom;
        if (parsed && (parsed.updatedAt || 0) > (soccerGame.getRoomState()?.updatedAt || 0)) {
          soccerGame.onRemoteSoccerRoomUpdate(parsed);
        }
      } catch {
        // ignore
      }
    } else if (e.key === `b2ks_soccer_p2_input_${slug}` && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue) as SoccerPlayerInput;
        if (parsed) soccerGame.onRemoteP2InputUpdate(parsed);
      } catch {
        // ignore
      }
    }
  });

  const memberMoveState = new Map<string, { x: number; y: number; scene: string; movingUntil: number }>();
  const helperRobotRuntimeMap = new Map<
    string,
    {
      x: number;
      y: number;
      scene: string;
      privateRoomId: string | null;
      headingX: number;
      headingY: number;
      lastKidX: number;
      lastKidY: number;
      yaw: number;
      trail: Array<{ x: number; y: number }>;
    }
  >();
  let playerWorldAngle = Math.PI / 2;
  let smoothPlayerWorldAngle = Math.PI / 2;
  let lastAngleMemberId = '';
  const cardinalWorldAngle = (dir: Member['dir'] | string): number => {
    if (dir === 'up') return -Math.PI / 2;
    if (dir === 'right') return 0;
    if (dir === 'left') return Math.PI;
    return Math.PI / 2;
  };

  const foreignNpcPatrols: Record<string, { x: number; y: number }[]> = {
    npc_alex: [
      { x: 420, y: 440 },
      { x: 1150, y: 440 },
      { x: 1150, y: 995 },
      { x: 680, y: 995 },
      { x: 420, y: 615 }
    ],
    npc_emma: [
      { x: 1340, y: 440 },
      { x: 2090, y: 440 },
      { x: 2090, y: 1000 },
      { x: 1340, y: 1000 },
      { x: 1340, y: 615 }
    ]
  };
  const foreignNpcStates: ForeignNpcState[] = [
    {
      id: 'npc_alex',
      name: 'Mr. Alex',
      gender: 'male',
      x: 560,
      y: 440,
      dir: 'right',
      waypointIdx: 1,
      isPaused: false,
      isMoving: true,
      facingYaw: Math.PI / 2,
      speechText: 'Speak to me! 💬'
    },
    {
      id: 'npc_emma',
      name: 'Ms. Emma',
      gender: 'female',
      x: 1620,
      y: 440,
      dir: 'right',
      waypointIdx: 1,
      isPaused: false,
      isMoving: true,
      facingYaw: Math.PI / 2,
      speechText: 'Speak to me! 💬'
    }
  ];

  let lastGameLoopPerf = performance.now();
  let lastPetHungerSaveAt = 0;

  function gameLoop() {
    const nowPerf = performance.now();
    const deltaSec = Math.max(0, Math.min(2, (nowPerf - lastGameLoopPerf) / 1000));
    lastGameLoopPerf = nowPerf;

    const me = getCurrentUser();
    const lighting = getRealTimeLighting();

    // Gentle hunger decay ONLY when accompanying an unlocked user with a hatched companion pet
    if (isGameUnlocked && me.activePetId && me.activePetId !== 'none' && Array.isArray(me.pets)) {
      const compPet = me.pets.find((p) => p.id === me.activePetId && p.hatched);
      if (compPet && compPet.hunger > 0) {
        const sp = getPetSpecies(compPet.speciesId);
        const prevH = compPet.hunger;
        compPet.hunger = Math.max(0, prevH - (sp.hungerDecayPerMin / 60) * deltaSec);
        const nowHungerTs = Date.now();
        if (prevH > 0 && compPet.hunger <= 0) {
          showToast(`⚠️ ${compPet.nickname} đã đói bụng (0%)! Hãy cho ăn để khôi phục +Tốc độ & +Sao thưởng!`);
          saveGame(true);
          lastPetHungerSaveAt = nowHungerTs;
        } else if (nowHungerTs - lastPetHungerSaveAt >= 30000) {
          lastPetHungerSaveAt = nowHungerTs;
          persistDurableMemberArchive();
          const { englishQuestions: _omitH, ...hPayload } = state;
          try {
            localStorage.setItem(getFamilyStorageKey(), JSON.stringify(hPayload));
          } catch {
            // ignore
          }
        }
      }
    }

    const myPetBonus = getMemberPetBonuses(me);
    const speed = 3.6 + myPetBonus.speedBonus;
    const houseMetrics = getHouseLayoutMetrics();
    const inputVec =
      isGameUnlocked && controller3d
        ? controller3d.computeInputVector({
            keys,
            joyActive,
            joyVector,
            me,
            speed,
            sceneName: me.scene,
            houseHeight: houseMetrics.houseHeight
          })
        : { dx: 0, dy: 0, moving: false, viaTap: false };
    const dx = inputVec.dx;
    const dy = inputVec.dy;

    const isMeMoving = isGameUnlocked && inputVec.moving && (dx !== 0 || dy !== 0);
    if (isMeMoving) {
      const len = Math.hypot(dx, dy) || 1;
      const ndx = len > 1 ? dx / len : dx;
      const ndy = len > 1 ? dy / len : dy;
      const nextX = me.x + ndx * speed;
      const nextY = me.y + ndy * speed;
      if (Math.abs(ndx) > Math.abs(ndy)) me.dir = ndx < 0 ? 'left' : 'right';
      else me.dir = ndy < 0 ? 'up' : 'down';

      playerWorldAngle = Math.atan2(ndy, ndx);

      if (me.scene === 'neighborhood') {
        me.x = Math.max(40, Math.min(STREET_WORLD.width - 40, nextX));
        me.y = Math.max(265, Math.min(STREET_WORLD.height - 40, nextY));
      } else if (me.scene === 'private_room') {
        me.x = Math.max(12, Math.min(PRIVATE_ROOM_WORLD.width - 12, nextX));
        me.y = Math.max(16, Math.min(PRIVATE_ROOM_WORLD.height - 14, nextY));
        const curPR = getActivePrivateRoom();
        const exitAtRight = curPR?.doorSide === 'right';
        if (
          Math.abs(me.y - 310) <= 52 &&
          ((exitAtRight && me.x >= PRIVATE_ROOM_WORLD.width - 20) || (!exitAtRight && me.x <= 20))
        ) {
          exitPrivateRoomToHallway();
        }
      } else {
        const check = canMoveInsideHouse(me, nextX, nextY);
        if (check.allowed) {
          me.x = nextX;
          me.y = nextY;
          const enteredRoom = getRoomAtPosition(nextX, nextY);
          if (enteredRoom && enteredRoom.ownerIds && enteredRoom.ownerIds.length > 0) enterPrivateRoomScene(enteredRoom);
        } else if (check.blockedRoom) {
          controller3d?.clearTapTarget();
          if (Date.now() - lastDoorToastTime > 2200) {
            lastDoorToastTime = Date.now();
            AudioEngine.playError();
            showToast(
              check.blockedRoom.isDisabled
                ? `🚫 ${check.blockedRoom.name} chưa có thành viên sử dụng!`
                : `🔒 ${check.blockedRoom.name} đang khóa! Chủ phòng cần mở khóa cửa trước.`
            );
          }
        }
      }
    } else {
      playerWorldAngle = cardinalWorldAngle(me.dir);
    }

    if (lastAngleMemberId !== me.id) {
      lastAngleMemberId = me.id;
      playerWorldAngle = cardinalWorldAngle(me.dir);
      smoothPlayerWorldAngle = playerWorldAngle;
    } else {
      let angDiff = playerWorldAngle - smoothPlayerWorldAngle;
      while (angDiff > Math.PI) angDiff -= Math.PI * 2;
      while (angDiff < -Math.PI) angDiff += Math.PI * 2;
      smoothPlayerWorldAngle += angDiff * Math.min(1, deltaSec * 14);
    }

    // Check Navigation Arrival on Neighborhood Map
    const navTarget = getResolvedNavTarget();
    if (navTarget && me.scene === 'neighborhood') {
      const distToNav = Math.hypot(me.x - navTarget.x, me.y - navTarget.y);
      if (distToNav <= 95) {
        activeNavTargetId = null;
        AudioEngine.playSuccess();
        showToast(`📍 Bạn đã đến ${navTarget.icon} ${navTarget.name}!`);
        updateHUD();
      }
    }

    // Update Roaming Foreign NPCs (pause when player approaches)
    if (isGameUnlocked) {
      foreignNpcStates.forEach((npc) => {
        const distPlayer = me.scene === 'neighborhood' ? Math.hypot(me.x - npc.x, me.y - npc.y) : Infinity;
        if (distPlayer < 95) {
          npc.isPaused = true;
          npc.isMoving = false;
          npc.facingYaw = Math.atan2(me.x - npc.x, me.y - npc.y);
        } else {
          npc.isPaused = false;
          npc.isMoving = true;
          const pts = foreignNpcPatrols[npc.id] || [];
          if (pts.length > 0) {
            const wp = pts[npc.waypointIdx % pts.length];
            const vx = wp.x - npc.x;
            const vy = wp.y - npc.y;
            const d = Math.hypot(vx, vy);
            if (d < 8) {
              npc.waypointIdx = (npc.waypointIdx + 1) % pts.length;
            } else {
              const step = 62 * deltaSec;
              const move = Math.min(d, step);
              npc.x += (vx / d) * move;
              npc.y += (vy / d) * move;
              npc.facingYaw = Math.atan2(vx, vy);
              npc.dir = Math.abs(vx) > Math.abs(vy) ? (vx < 0 ? 'left' : 'right') : (vy < 0 ? 'up' : 'down');
            }
          }
        }
      });
    }

    if (isGameUnlocked) {
      updateContextualChatBar(me);
    }

    const nowZoneMs = Date.now();
    if (isGameUnlocked && nowZoneMs - lastZoneExitCheckAt >= 200) {
      lastZoneExitCheckAt = nowZoneMs;
      arcadeEngine.checkZoneAutoExit();
      soccerGame.checkZoneAutoExit();
    }

    const interactables = getWorldInteractables();
    let nearest: { x: number; y: number; radius: number; label: string; action: () => void } | null = null;
    let minDist = Infinity;
    interactables.forEach((item) => {
      const d = Math.hypot(me.x - item.x, me.y - item.y);
      if (d < item.radius && d < minDist) { minDist = d; nearest = item; }
    });

    const promptEl = document.getElementById('interact-prompt');
    const interactBtn = document.getElementById('interact-btn');
    if (isGameUnlocked && nearest && promptEl && interactBtn) {
      currentInteractTarget = nearest;
      promptEl.style.display = 'block';
      interactBtn.innerText = (nearest as { label: string }).label;
    } else if (promptEl) {
      currentInteractTarget = null;
      promptEl.style.display = 'none';
    }

    const nowMs = Date.now();
    const visibleMembers = state.members.filter((m) => {
      if (m.scene !== me.scene) return false;
      if (me.scene === 'private_room') {
        const myRoomId = me.privateRoomId || activePrivateRoomId;
        return (m.privateRoomId || null) === myRoomId;
      }
      return true;
    });
    const memberMovingMap = new Map<string, boolean>();
    visibleMembers.forEach((m) => {
      if (m.id === me.id) {
        memberMovingMap.set(m.id, isMeMoving);
      } else {
        const prev = memberMoveState.get(m.id);
        if (!prev) {
          memberMoveState.set(m.id, { x: m.x, y: m.y, scene: m.scene, movingUntil: 0 });
          memberMovingMap.set(m.id, false);
        } else {
          const moved = prev.scene === m.scene && Math.hypot(m.x - prev.x, m.y - prev.y) > 0.5;
          if (moved) prev.movingUntil = nowMs + 1350;
          prev.x = m.x;
          prev.y = m.y;
          prev.scene = m.scene;
          memberMovingMap.set(m.id, nowMs < prev.movingUntil);
        }
      }
    });

    // Update Helper Robots for every child (smooth breadcrumb pursuit trailing behind subject)
    const helperRobots: HelperRobotRenderItem[] = [];
    state.members
      .filter((m) => !isParent(m))
      .forEach((kid) => {
        ensureMemberProps(kid);
        const cfg = kid.helperRobot!;
        const activeRem = (cfg.reminders || []).find((r) => nowMs >= r.startAt && nowMs <= r.endAt) || null;
        const myRoom = getMemberPrivateRoom(kid);
        const targetScene = activeRem ? kid.scene : 'private_room';
        const targetPrivateRoomId = activeRem ? (kid.privateRoomId || null) : (myRoom?.id || null);

        const dirAng = cardinalWorldAngle(kid.dir || 'down');
        const dirHx = Math.cos(dirAng);
        const dirHy = Math.sin(dirAng);

        let rt = helperRobotRuntimeMap.get(kid.id);
        const sceneChanged = !rt || rt.scene !== targetScene || rt.privateRoomId !== targetPrivateRoomId;

        if (sceneChanged || !rt) {
          const initHx = dirHx;
          const initHy = dirHy;
          const initX = activeRem ? kid.x - initHx * 48 - initHy * 12 : 185;
          const initY = activeRem ? kid.y - initHy * 48 + initHx * 12 : 112;
          rt = {
            x: initX,
            y: initY,
            scene: targetScene,
            privateRoomId: targetPrivateRoomId,
            headingX: initHx,
            headingY: initHy,
            lastKidX: kid.x,
            lastKidY: kid.y,
            yaw: activeRem ? Math.atan2(kid.x - initX, kid.y - initY) : 0.35,
            trail: [{ x: kid.x, y: kid.y }]
          };
          helperRobotRuntimeMap.set(kid.id, rt);
        }

        // Track subject heading & breadcrumbs inside current scene
        const kidStepDx = kid.x - rt.lastKidX;
        const kidStepDy = kid.y - rt.lastKidY;
        const kidStepDist = Math.hypot(kidStepDx, kidStepDy);
        if (kidStepDist > 0.6 && kidStepDist < 240) {
          const nx = kidStepDx / kidStepDist;
          const ny = kidStepDy / kidStepDist;
          const hBlend = Math.min(1, deltaSec * 12);
          const mx = rt.headingX + (nx - rt.headingX) * hBlend;
          const my = rt.headingY + (ny - rt.headingY) * hBlend;
          const mLen = Math.hypot(mx, my) || 1;
          rt.headingX = mx / mLen;
          rt.headingY = my / mLen;

          const lastPt = rt.trail[rt.trail.length - 1];
          if (!lastPt || Math.hypot(kid.x - lastPt.x, kid.y - lastPt.y) >= 10) {
            rt.trail.push({ x: kid.x, y: kid.y });
            if (rt.trail.length > 28) rt.trail.shift();
          }
        } else if (kidStepDist > 240) {
          rt.trail = [{ x: kid.x, y: kid.y }];
          rt.headingX = dirHx;
          rt.headingY = dirHy;
        }
        rt.lastKidX = kid.x;
        rt.lastKidY = kid.y;

        // Compute follow point behind the subject along breadcrumb path
        let targetX = 185;
        let targetY = 112;
        if (activeRem) {
          const followDist = 48;
          let bx = kid.x - rt.headingX * followDist;
          let by = kid.y - rt.headingY * followDist;

          if (rt.trail.length >= 2) {
            let accDist = 0;
            let curX = kid.x;
            let curY = kid.y;
            let foundOnTrail = false;
            for (let i = rt.trail.length - 1; i >= 0; i--) {
              const pt = rt.trail[i];
              const segLen = Math.hypot(curX - pt.x, curY - pt.y);
              if (accDist + segLen >= followDist && segLen > 0.01) {
                const remain = followDist - accDist;
                const t = remain / segLen;
                bx = curX + (pt.x - curX) * t;
                by = curY + (pt.y - curY) * t;
                foundOnTrail = true;
                break;
              }
              accDist += segLen;
              curX = pt.x;
              curY = pt.y;
            }
            if (!foundOnTrail && accDist > 4) {
              const tail = rt.trail[0];
              const vx = tail.x - kid.x;
              const vy = tail.y - kid.y;
              const vLen = Math.hypot(vx, vy) || 1;
              bx = kid.x + (vx / vLen) * followDist;
              by = kid.y + (vy / vLen) * followDist;
            }
          }

          // Subtle shoulder offset perpendicular to heading so robot stays visible behind child
          targetX = bx - rt.headingY * 14;
          targetY = by + rt.headingX * 14;

          if (targetScene === 'neighborhood') {
            targetX = Math.max(40, Math.min(STREET_WORLD.width - 40, targetX));
            targetY = Math.max(260, Math.min(STREET_WORLD.height - 40, targetY));
          } else if (targetScene === 'private_room') {
            targetX = Math.max(20, Math.min(PRIVATE_ROOM_WORLD.width - 20, targetX));
            targetY = Math.max(24, Math.min(PRIVATE_ROOM_WORLD.height - 20, targetY));
          } else {
            targetX = Math.max(36, Math.min(HOUSE_WORLD.width - 36, targetX));
            targetY = Math.max(40, Math.min(houseMetrics.houseHeight - 24, targetY));
          }
        }

        const prevRx = rt.x;
        const prevRy = rt.y;
        const distToTarget = Math.hypot(targetX - rt.x, targetY - rt.y);
        if (distToTarget > 380) {
          rt.x = targetX;
          rt.y = targetY;
        } else if (distToTarget > 0.5) {
          const maxStep = Math.max(195, distToTarget * 5.2) * Math.max(0.008, deltaSec);
          const step = Math.min(distToTarget, maxStep);
          rt.x += ((targetX - rt.x) / distToTarget) * step;
          rt.y += ((targetY - rt.y) / distToTarget) * step;
        }

        // Maintain personal space bubble when following so robot never overlaps child
        if (activeRem) {
          const sepDx = rt.x - kid.x;
          const sepDy = rt.y - kid.y;
          const sepDist = Math.hypot(sepDx, sepDy);
          if (sepDist < 34) {
            const pushX = sepDist > 0.5 ? sepDx / sepDist : -rt.headingX;
            const pushY = sepDist > 0.5 ? sepDy / sepDist : -rt.headingY;
            rt.x = kid.x + pushX * 34;
            rt.y = kid.y + pushY * 34;
          }
        }

        const moveDx = rt.x - prevRx;
        const moveDy = rt.y - prevRy;
        const movedDist = Math.hypot(moveDx, moveDy);
        const isRobotMoving = movedDist > 0.35 && movedDist < 120;

        let desiredYaw = 0.35;
        if (isRobotMoving) {
          desiredYaw = Math.atan2(moveDx, moveDy);
        } else if (activeRem) {
          desiredYaw = Math.atan2(kid.x - rt.x, kid.y - rt.y);
        }
        let yawDelta = desiredYaw - rt.yaw;
        while (yawDelta > Math.PI) yawDelta -= Math.PI * 2;
        while (yawDelta < -Math.PI) yawDelta += Math.PI * 2;
        rt.yaw += yawDelta * Math.min(1, deltaSec * 9);

        helperRobots.push({
          childId: kid.id,
          childName: kid.name,
          skin: cfg.skin,
          x: rt.x,
          y: rt.y,
          scene: targetScene as HelperRobotRenderItem['scene'],
          privateRoomId: targetPrivateRoomId,
          isFollowing: Boolean(activeRem),
          isMoving: isRobotMoving,
          reminderText: activeRem ? activeRem.text : '',
          facingYaw: rt.yaw
        });
      });

    // Build Kids Leaderboard summary for 3D Leader Board
    const kidsLeaderboard = state.members
      .filter((m) => !isParent(m))
      .slice()
      .sort((a, b) => b.points - a.points)
      .map((k) => {
        const prog6 = k.englishProgress?.[6]?.unit || 1;
        const maxU = Math.max(
          k.englishProgress?.[6]?.unit || 1,
          k.englishProgress?.[7]?.unit || 1,
          k.englishProgress?.[8]?.unit || 1,
          k.englishProgress?.[9]?.unit || 1
        );
        return {
          name: k.name,
          points: k.points,
          unitLabel: `U.${maxU || prog6}`,
          speakingLevel: k.speakingLevel || 1,
          achievementCount: (k.unlockedAchievements || []).length,
          achievementTotal: ACHIEVEMENT_CATALOG.length
        };
      });

    controller3d?.render({
      deltaSec,
      nowMs,
      state,
      me,
      lighting,
      weather: currentWeather,
      locations: resolveNeighborhoodLocations(state),
      streetCars,
      arcadeRoom: arcadeEngine.getRoomState(),
      arcadeCatalog: ARCADE_GAME_CATALOG,
      soccerRoom: soccerGame.getRoomState(),
      houseRooms: getHouseRooms(),
      wardrobeOpenedRoomId,
      roomDecorSlots: ROOM_DECOR_SLOTS,
      findAnyCatalogItem,
      memberMovingMap,
      foreignNpcs: foreignNpcStates,
      helperRobots,
      kidsLeaderboard,
      getPetForMember: getActivePet,
      getPetSpecies,
      getPetResolvedColors
    });

    // Render Neighborhood Minimap & Collapse Pill & Active Navigation Banner
    const mmContainer = document.getElementById('minimap-container');
    const mmCollapsedPill = document.getElementById('minimap-collapsed-pill');
    const mmCollapsedNav = document.getElementById('minimap-collapsed-nav');
    const mmCanvas = document.getElementById('minimap-canvas') as HTMLCanvasElement | null;
    const mmBanner = document.getElementById('minimap-nav-banner');
    const mmLabel = document.getElementById('minimap-nav-label');
    const mmZoneLabel = document.getElementById('minimap-zone-label');
    const canShowNeighborhoodMap = isGameUnlocked && me.scene === 'neighborhood' && !document.body.classList.contains('parent-mini-minimized');
    const activeTarget = getResolvedNavTarget();
    if (mmCollapsedPill) {
      mmCollapsedPill.style.display = canShowNeighborhoodMap && minimapCollapsed ? 'inline-flex' : 'none';
      if (mmCollapsedNav) {
        if (activeTarget) {
          const distM = Math.round(Math.hypot(me.x - activeTarget.x, me.y - activeTarget.y) / 10);
          mmCollapsedNav.style.display = 'inline';
          mmCollapsedNav.textContent = `${activeTarget.icon}${distM}m`;
        } else {
          mmCollapsedNav.style.display = 'none';
        }
      }
    }
    if (mmContainer) {
      const showMinimap = canShowNeighborhoodMap && !minimapCollapsed;
      mmContainer.style.display = showMinimap ? 'flex' : 'none';
      if (showMinimap && mmCanvas) {
        const mmCtx = mmCanvas.getContext('2d');
        const resolvedLocs = resolveNeighborhoodLocations(state);
        if (mmCtx) {
          drawNeighborhoodMinimap(
            mmCtx,
            mmCanvas.width,
            mmCanvas.height,
            state,
            me,
            activeTarget,
            resolvedLocs,
            {
              camYaw: controller3d?.getCamYaw() ?? Math.PI / 4,
              playerWorldAngle: smoothPlayerWorldAngle,
              orientMode: minimapOrientMode,
              zoomScale: MINIMAP_ZOOM_STEPS[minimapZoomIdx] ?? 1.0,
              streetCars,
              foreignNpcs: foreignNpcStates,
              outPinHits: minimapPinHits
            }
          );
        }
        if (mmZoneLabel) {
          let nearestLoc: NavDestination | null = null;
          let nearestDist = 170;
          for (const loc of resolvedLocs) {
            const d = Math.hypot(me.x - loc.x, me.y - loc.y);
            if (d < nearestDist) {
              nearestDist = d;
              nearestLoc = loc;
            }
          }
          if (nearestLoc) {
            mmZoneLabel.textContent = `${nearestLoc.icon} ${nearestLoc.name}`;
          } else if (Math.abs(me.x - 1245) <= 115) {
            mmZoneLabel.textContent = '🛣️ Trục Trung tâm';
          } else if (me.y >= 415 && me.y <= 645) {
            mmZoneLabel.textContent = '🛣️ Đại lộ Bắc';
          } else if (me.y >= 975 && me.y <= 1205) {
            mmZoneLabel.textContent = '🛣️ Đại lộ Nam';
          } else {
            mmZoneLabel.textContent = '🌳 Công viên Khu phố';
          }
        }
        if (mmBanner && mmLabel) {
          if (activeTarget) {
            const distM = Math.round(Math.hypot(me.x - activeTarget.x, me.y - activeTarget.y) / 10);
            mmBanner.style.display = 'flex';
            mmLabel.textContent = `${activeTarget.icon} ${activeTarget.name} · ${distM}m`;
          } else {
            mmBanner.style.display = 'none';
          }
        }
      }
    }

    updateHUD();
    requestAnimationFrame(gameLoop);
  }

  loadGame();
  fetchLiveWeatherInfo(false)
    .then((wInfo) => {
      currentWeather = wInfo;
      updateHUD();
    })
    .catch(() => {});
  updateHUD();
  renderChatLog();
  requestAnimationFrame(gameLoop);
}
