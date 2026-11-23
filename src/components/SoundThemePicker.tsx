import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Music2, Volume2, VolumeX } from 'lucide-react';
import { B2KSBridge, BgmThemeId } from '../types/b2ks';
import { BGM_THEME_OPTIONS } from '../game/constants';

interface Props {
  bridge: B2KSBridge;
}

export const SoundThemePicker: React.FC<Props> = ({ bridge }) => {
  const [open, setOpen] = useState(false);
  const [, setTick] = useState(0);
  const [popupPos, setPopupPos] = useState<{ right: number; bottom: number }>({ right: 16, bottom: 76 });
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const unsub = bridge.subscribe(() => setTick((t) => t + 1));
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        btnRef.current &&
        !btnRef.current.contains(target) &&
        (!menuRef.current || !menuRef.current.contains(target))
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('click', onDocClick);
    return () => {
      unsub();
      document.removeEventListener('click', onDocClick);
    };
  }, [bridge]);

  const updatePopupPosition = () => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPopupPos({
      right: Math.max(10, window.innerWidth - rect.right),
      bottom: Math.max(72, window.innerHeight - rect.top + 10),
    });
  };

  useEffect(() => {
    if (!open) return;
    updatePopupPosition();
    window.addEventListener('resize', updatePopupPosition);
    return () => window.removeEventListener('resize', updatePopupPosition);
  }, [open]);

  const activeThemeId: BgmThemeId = bridge.getBgmTheme?.() || 'sunny_town';
  const isMuted = bridge.isAudioMuted?.() ?? false;
  const activeTheme = BGM_THEME_OPTIONS.find((t) => t.id === activeThemeId) || BGM_THEME_OPTIONS[0];

  return (
    <div className="relative inline-flex items-center">
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          bridge.playClick();
          updatePopupPosition();
          setOpen((v) => !v);
        }}
        className="hud-tile-btn tone-teal"
        title="Chọn chủ đề nhạc nền"
      >
        <span className="hud-tile-ico">{activeTheme.icon}</span>
        <span className="hud-tile-lbl">Chủ đề</span>
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: 'fixed', right: popupPos.right, bottom: popupPos.bottom }}
            className="w-64 rounded-2xl border border-slate-200 bg-white/95 text-slate-900 shadow-2xl p-2.5 z-[340] space-y-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-1.5 pb-1.5 border-b border-slate-200">
              <span className="text-[11px] font-bold text-slate-700 inline-flex items-center gap-1">
                <Music2 className="w-3.5 h-3.5 text-teal-600" />
                <span>Chủ đề âm thanh</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  bridge.toggleAudioMuted?.();
                  setTick((t) => t + 1);
                }}
                className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold inline-flex items-center gap-1 border cursor-pointer ${
                  isMuted
                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-700'
                }`}
              >
                {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                <span>{isMuted ? 'Đang tắt' : 'Đang bật'}</span>
              </button>
            </div>

            {BGM_THEME_OPTIONS.map((theme) => {
              const selected = theme.id === activeThemeId;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => {
                    bridge.setBgmTheme?.(theme.id);
                    if (isMuted) {
                      bridge.toggleAudioMuted?.();
                    }
                    bridge.playClick();
                    bridge.showToast(`🎵 Đã chuyển nhạc nền: ${theme.icon} ${theme.name}`);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-xl border transition cursor-pointer ${
                    selected
                      ? 'bg-teal-50 border-teal-500 text-teal-950'
                      : 'bg-slate-50 border-transparent hover:border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 text-xs font-bold">
                    <span>
                      {theme.icon} {theme.name}
                    </span>
                    {selected && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-600 text-white">Đang chọn</span>
                    )}
                  </div>
                  <div className="text-[10.5px] text-slate-500 mt-0.5 leading-snug">{theme.desc}</div>
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
};
