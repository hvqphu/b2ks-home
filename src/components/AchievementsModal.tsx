import React, { useMemo, useState } from 'react';
import { Trophy, Lock, CheckCircle2, X } from 'lucide-react';
import {
  ACHIEVEMENT_CATALOG,
  getAchievementProgress,
  getTotalCompletedTasksForMember,
} from '../game/speakingAndAchievements';
import type { AchievementCategory, B2KSBridge, Member } from '../types/b2ks';

interface Props {
  bridge: B2KSBridge;
  onClose: () => void;
}

const CATEGORY_TABS: Array<{ id: 'all' | AchievementCategory; label: string }> = [
  { id: 'all', label: '🌟 Tất cả' },
  { id: 'tasks', label: '📋 Nhiệm vụ' },
  { id: 'english', label: '🗣️ Tiếng Anh' },
  { id: 'world', label: '🎨 Thế giới & Thú cưng' },
];

export const AchievementsModal: React.FC<Props> = ({ bridge, onClose }) => {
  const state = bridge.getState();
  const currentUser = bridge.getCurrentUser();
  const kids = useMemo(() => state.members.filter((m) => !bridge.isParent(m)), [state.members, bridge]);

  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    !bridge.isParent(currentUser) ? currentUser.id : kids[0]?.id || currentUser.id
  );
  const [catFilter, setCatFilter] = useState<'all' | AchievementCategory>('all');

  const targetMember: Member =
    state.members.find((m) => m.id === selectedMemberId) || currentUser;

  const unlockedMap = useMemo(() => {
    const map = new Map<string, number>();
    (targetMember.unlockedAchievements || []).forEach((u) => {
      map.set(u.id, u.unlockedAt);
    });
    return map;
  }, [targetMember]);

  const unlockedCount = ACHIEVEMENT_CATALOG.filter((a) => unlockedMap.has(a.id)).length;
  const totalCount = ACHIEVEMENT_CATALOG.length;
  const pct = Math.round((unlockedCount / Math.max(1, totalCount)) * 100);

  const visibleBadges = ACHIEVEMENT_CATALOG.filter(
    (b) => catFilter === 'all' || b.category === catFilter
  );

  const completedTasks = getTotalCompletedTasksForMember(targetMember, state.tasks);
  const distinctWords = (targetMember.englishWordsUsed || []).length;
  const speakingLv = targetMember.speakingLevel || 1;
  const streak = targetMember.speakingStreak || 0;

  return (
    <div
      className="modal-overlay"
      style={{ display: 'flex', zIndex: 245 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-content pixel-box"
        style={{
          maxWidth: '780px',
          width: '96vw',
          maxHeight: '90dvh',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(180deg, #FFFDF5 0%, #FEF3C7 100%)',
          borderColor: '#0F172A',
        }}
      >
        {/* Header */}
        <div
          className="modal-header"
          style={{
            background: 'linear-gradient(90deg, #D97706, #F59E0B, #EA580C)',
            color: '#FFFFFF',
            margin: '-16px -16px 12px -16px',
            padding: '12px 16px',
            borderRadius: '13px 13px 0 0',
            borderBottom: '3px solid #0F172A',
          }}
        >
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-200" />
            <div>
              <h2 style={{ color: '#FFFFFF', margin: 0, fontSize: '18px' }}>
                Bảng Thành Tựu &amp; Huy Hiệu
              </h2>
              <div className="text-[11px] text-amber-100 font-semibold">
                Hoàn thành nhiệm vụ, luyện nói Tiếng Anh &amp; khám phá khu phố để mở khóa!
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm"
            style={{ background: '#FFF', color: '#B45309' }}
            onClick={onClose}
          >
            <X className="w-4 h-4" />
            <span>Đóng</span>
          </button>
        </div>

        {/* Member Selector (kids only — parents are not tracked for achievements) */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {(kids.length > 0 ? kids : [targetMember]).map((m) => {
              const active = m.id === targetMember.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMemberId(m.id)}
                  className={`px-3 py-1 rounded-full text-xs font-bold border-2 cursor-pointer transition ${
                    active
                      ? 'bg-[#0F172A] text-white border-[#0F172A]'
                      : 'bg-white text-slate-700 border-slate-300 hover:border-amber-500'
                  }`}
                >
                  {m.outfit || '🙂'} {m.name} ({(m.unlockedAchievements || []).length}/{totalCount})
                </button>
              );
            })}
          </div>

          <div className="px-3 py-1 rounded-full bg-amber-500 text-white text-xs font-extrabold border-2 border-[#0F172A]">
            🏆 Đã mở {unlockedCount}/{totalCount} ({pct}%)
          </div>
        </div>

        {/* Quick stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          <div className="rounded-xl bg-white border-2 border-slate-800 px-3 py-2 text-center">
            <div className="text-[10.5px] font-bold text-slate-500">✅ Nhiệm vụ xong</div>
            <div className="text-base font-extrabold text-emerald-700">{completedTasks}</div>
          </div>
          <div className="rounded-xl bg-white border-2 border-slate-800 px-3 py-2 text-center">
            <div className="text-[10.5px] font-bold text-slate-500">🔤 Từ Tiếng Anh</div>
            <div className="text-base font-extrabold text-sky-700">{distinctWords} từ</div>
          </div>
          <div className="rounded-xl bg-white border-2 border-slate-800 px-3 py-2 text-center">
            <div className="text-[10.5px] font-bold text-slate-500">🗣️ Speaking Level</div>
            <div className="text-base font-extrabold text-violet-700">
              Lv.{speakingLv} ({streak}/5)
            </div>
          </div>
          <div className="rounded-xl bg-white border-2 border-slate-800 px-3 py-2 text-center">
            <div className="text-[10.5px] font-bold text-slate-500">⭐ Điểm hiện tại</div>
            <div className="text-base font-extrabold text-amber-600">{targetMember.points}⭐</div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {CATEGORY_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setCatFilter(t.id)}
              className={`px-3 py-1 rounded-lg text-xs font-bold border-2 cursor-pointer ${
                catFilter === t.id
                  ? 'bg-amber-600 text-white border-[#0F172A]'
                  : 'bg-white text-slate-700 border-slate-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Badges Grid */}
        <div className="overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 flex-1">
          {visibleBadges.map((badge) => {
            const unlockedAt = unlockedMap.get(badge.id);
            const isUnlocked = unlockedAt !== undefined;
            const prog = getAchievementProgress(badge.id, targetMember, state.tasks);
            const progPct = Math.min(100, Math.round((prog.current / Math.max(1, prog.target)) * 100));

            return (
              <div
                key={badge.id}
                className={`rounded-2xl border-2 p-3 flex flex-col justify-between gap-2 transition ${
                  isUnlocked
                    ? 'border-[#0F172A] shadow-[0_3px_0_#0F172A]'
                    : 'border-slate-300 bg-slate-200/80 grayscale opacity-75'
                }`}
                style={
                  isUnlocked
                    ? {
                        background: `linear-gradient(135deg, #FFFFFF 0%, ${badge.color}22 100%)`,
                      }
                    : undefined
                }
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center text-2xl shrink-0 ${
                      isUnlocked ? 'border-[#0F172A] shadow-sm' : 'border-slate-400 bg-slate-300'
                    }`}
                    style={
                      isUnlocked
                        ? { background: `${badge.color}28` }
                        : undefined
                    }
                  >
                    {badge.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <div className="font-extrabold text-xs sm:text-sm text-slate-900 leading-tight">
                        {badge.title}
                      </div>
                      {isUnlocked ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      )}
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                      {badge.description}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[10.5px] font-bold mb-1">
                    <span className={isUnlocked ? 'text-emerald-700' : 'text-slate-600'}>
                      {isUnlocked ? '✅ Đã mở khóa!' : `Tiến độ: ${prog.current}/${prog.target}`}
                    </span>
                    {isUnlocked && unlockedAt > 0 ? (
                      <span className="text-slate-500">
                        {new Date(unlockedAt).toLocaleDateString('vi-VN')}
                      </span>
                    ) : (
                      <span className="text-slate-500">{progPct}%</span>
                    )}
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-300 overflow-hidden border border-slate-400">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${isUnlocked ? 100 : progPct}%`,
                        background: isUnlocked ? badge.color : '#64748B',
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
