import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle, X } from 'lucide-react';
import { ActiveReactModal, B2KSBridge } from './types/b2ks';
import { CrossWorldModal } from './components/CrossWorldModal';
import { FleaMarketModal } from './components/FleaMarketModal';
import { VirtualZooModal } from './components/VirtualZooModal';
import { ParentalDashboardModal } from './components/ParentalDashboardModal';
import { ParentMiniWindow } from './components/ParentMiniWindow';
import { OfflineIndicator, PWAInstallButton } from './components/PWAInstallButton';
import { ComicLibraryModal } from './components/ComicLibraryModal';
import { GamePasswordGate } from './components/GamePasswordGate';
import { SoundThemePicker } from './components/SoundThemePicker';
import { AdminPanelModal } from './components/AdminPanelModal';
import { AchievementsModal } from './components/AchievementsModal';
import { SpeakingPracticeModal } from './components/SpeakingPracticeModal';
import { ChurchBibleModal } from './components/ChurchBibleModal';

export default function App() {
  const [activeModal, setActiveModal] = useState<ActiveReactModal>(null);
  const [bridge, setBridge] = useState<B2KSBridge | undefined>(() => window.B2KS);
  const [hudPwaHost, setHudPwaHost] = useState<HTMLElement | null>(null);
  const [hudSoundHost, setHudSoundHost] = useState<HTMLElement | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [showGuideHint, setShowGuideHint] = useState(false);
  const [guideAnchor, setGuideAnchor] = useState<{ left: number; top?: number; bottom?: number; arrowOffset: number; above: boolean } | null>(null);

  const updateGuideAnchor = useCallback(() => {
    const btn = document.getElementById('hud-guide-btn');
    if (!btn) {
      setGuideAnchor({ left: Math.max(12, window.innerWidth - 280), bottom: 76, arrowOffset: 120, above: true });
      return;
    }
    const r = btn.getBoundingClientRect();
    const boxWidth = 256;
    const clampedLeft = Math.max(10, Math.min(window.innerWidth - boxWidth - 10, r.left + r.width / 2 - boxWidth / 2));
    const arrowOffset = Math.max(18, Math.min(boxWidth - 22, r.left + r.width / 2 - clampedLeft));
    const above = r.top > window.innerHeight * 0.5;
    setGuideAnchor(
      above
        ? { left: clampedLeft, bottom: Math.max(68, window.innerHeight - r.top + 10), arrowOffset, above: true }
        : { left: clampedLeft, top: r.bottom + 10, arrowOffset, above: false }
    );
  }, []);

  useEffect(() => {
    setHudPwaHost(document.getElementById('hud-pwa-slot'));
    setHudSoundHost(document.getElementById('hud-sound-slot'));

    window.__OPEN_B2KS_MODAL__ = (modal: ActiveReactModal) => {
      if (window.B2KS) setBridge(window.B2KS);
      setActiveModal(modal);
    };

    const syncBridge = (b: B2KSBridge) => {
      b.setGameUnlocked?.(false);
      setBridge(b);
      setHudPwaHost(document.getElementById('hud-pwa-slot'));
      setHudSoundHost(document.getElementById('hud-sound-slot'));
    };

    if (window.B2KS) {
      syncBridge(window.B2KS);
    }

    const timer = window.setInterval(() => {
      if (window.B2KS) {
        syncBridge(window.B2KS);
        window.clearInterval(timer);
      }
    }, 80);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!showGuideHint) return;
    updateGuideAnchor();
    const onResize = () => updateGuideAnchor();
    const onGuideClick = () => setShowGuideHint(false);
    const guideBtn = document.getElementById('hud-guide-btn');
    guideBtn?.addEventListener('click', onGuideClick);
    window.addEventListener('resize', onResize);
    const timeout = window.setTimeout(() => setShowGuideHint(false), 8500);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener('resize', onResize);
      guideBtn?.removeEventListener('click', onGuideClick);
    };
  }, [showGuideHint, updateGuideAnchor]);

  const handleUnlocked = () => {
    setUnlocked(true);
    setShowGuideHint(true);
    window.setTimeout(updateGuideAnchor, 80);
  };

  const close = () => setActiveModal(null);

  return (
    <>
      {hudPwaHost && createPortal(<PWAInstallButton />, hudPwaHost)}
      {hudSoundHost && bridge && unlocked && createPortal(<SoundThemePicker bridge={bridge} />, hudSoundHost)}
      <OfflineIndicator />

      {bridge && !unlocked && (
        <GamePasswordGate bridge={bridge} onUnlocked={handleUnlocked} />
      )}

      {unlocked && showGuideHint && guideAnchor && (
        <div
          style={{
            left: guideAnchor.left,
            ...(guideAnchor.above ? { bottom: guideAnchor.bottom } : { top: guideAnchor.top }),
          }}
          className="fixed z-[350] w-64 rounded-2xl border border-amber-300 bg-amber-50/95 text-slate-900 shadow-2xl p-2.5 animate-bounce"
        >
          <div
            style={{ left: guideAnchor.arrowOffset - 6 }}
            className={
              guideAnchor.above
                ? 'absolute -bottom-2 w-3.5 h-3.5 rotate-45 bg-amber-50 border-r border-b border-amber-300'
                : 'absolute -top-2 w-3.5 h-3.5 rotate-45 bg-amber-50 border-l border-t border-amber-300'
            }
          />
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 text-xs leading-snug">
              <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-extrabold text-amber-950">Cần xem Hướng dẫn chơi?</div>
                <div className="text-[11px] text-slate-700 mt-0.5">
                  Bấm nút <b>❓ Hướng dẫn</b> {guideAnchor.above ? 'ngay phía dưới' : 'ngay phía trên'} bất cứ lúc nào nhé!
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowGuideHint(false)}
              className="p-0.5 rounded hover:bg-amber-200/60 text-slate-600 cursor-pointer shrink-0"
              aria-label="Đóng gợi ý"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {bridge && unlocked && <ParentMiniWindow bridge={bridge} />}

      {bridge && unlocked && activeModal === 'cross_world' && (
        <CrossWorldModal bridge={bridge} onClose={close} />
      )}
      {bridge && unlocked && activeModal === 'flea_market' && (
        <FleaMarketModal bridge={bridge} onClose={close} />
      )}
      {bridge && unlocked && activeModal === 'virtual_zoo' && (
        <VirtualZooModal bridge={bridge} onClose={close} />
      )}
      {bridge && unlocked && activeModal === 'parental_dashboard' && (
        <ParentalDashboardModal bridge={bridge} onClose={close} />
      )}
      {bridge && unlocked && activeModal === 'comic_library' && (
        <ComicLibraryModal bridge={bridge} onClose={close} />
      )}
      {bridge && unlocked && activeModal === 'admin_panel' && (
        <AdminPanelModal bridge={bridge} onClose={close} />
      )}
      {bridge && unlocked && activeModal === 'achievements' && (
        <AchievementsModal bridge={bridge} onClose={close} />
      )}
      {bridge && unlocked && activeModal === 'speaking_practice' && (
        <SpeakingPracticeModal bridge={bridge} onClose={close} />
      )}
      {bridge && unlocked && activeModal === 'church_bible' && (
        <ChurchBibleModal bridge={bridge} onClose={close} />
      )}
    </>
  );
}
