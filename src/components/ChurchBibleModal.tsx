import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Flame,
  HelpCircle,
  Search,
  Sparkles,
  Volume2,
  X,
  XCircle,
} from 'lucide-react';
import { lookupBibleWordMeaning } from '../game/bibleGlossary';
import type { B2KSBridge, BibleQuestion, BibleQuestionCategory } from '../types/b2ks';
import { BibleVisualSvg } from './BibleVisualSvg';

interface Props {
  bridge: B2KSBridge;
  onClose: () => void;
}

interface AnswerFeedback {
  selectedIdx: number;
  correct: boolean;
  awarded: number;
  baseAwarded: number;
  streakBonus: number;
  newStreak: number;
  questionCorrectCount: number;
  retired: boolean;
  bookEn: string;
  bookVi: string;
  ref: string;
  verseEn: string;
  verseVi: string;
  msg: string;
}

const CATEGORY_LABELS: Array<{ id: 'all' | BibleQuestionCategory; label: string }> = [
  { id: 'all', label: 'Tất cả' },
  { id: 'fact', label: 'Dữ kiện' },
  { id: 'image', label: 'Hình ảnh' },
  { id: 'verse', label: 'Câu gốc' },
  { id: 'parable', label: 'Ẩn dụ & Bài học' },
];

function stripParenNotesForSpeech(text: string): string {
  return String(text || '')
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export const ChurchBibleModal: React.FC<Props> = ({ bridge, onClose }) => {
  const [, setSyncTick] = useState(0);
  useEffect(() => bridge.subscribe(() => setSyncTick((t) => t + 1)), [bridge]);

  const user = bridge.getCurrentUser();
  const bank: BibleQuestion[] = useMemo(
    () => bridge.getGlobalBibleBank?.() || [],
    [bridge, user.bibleProgress?.updatedAt]
  );

  const progress = user.bibleProgress || {
    correctCounts: {},
    streak: 0,
    totalCorrect: 0,
    totalAnswered: 0,
    updatedAt: 0,
  };
  const correctCounts = progress.correctCounts || {};

  const [categoryFilter, setCategoryFilter] = useState<'all' | BibleQuestionCategory>('all');
  const [inspectOptionWords, setInspectOptionWords] = useState(false);
  const [wordLookup, setWordLookup] = useState<{ token: string; meaningVi: string | null } | null>(null);
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
  const [currentQuestionId, setCurrentQuestionId] = useState<string>('');

  const masteredTotal = useMemo(
    () => bank.filter((q) => (correctCounts[q.id] || 0) >= 3).length,
    [bank, correctCounts]
  );

  const activePool = useMemo(() => {
    const unretired = bank.filter((q) => (correctCounts[q.id] || 0) < 3);
    if (categoryFilter === 'all') return unretired;
    const filtered = unretired.filter((q) => q.category === categoryFilter);
    return filtered.length > 0 ? filtered : unretired;
  }, [bank, correctCounts, categoryFilter]);

  const pickRandomQuestionId = (pool: BibleQuestion[], excludeId?: string): string => {
    if (pool.length === 0) return '';
    const candidates = pool.length > 1 && excludeId ? pool.filter((q) => q.id !== excludeId) : pool;
    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    return picked?.id || pool[0].id;
  };

  useEffect(() => {
    if (activePool.length === 0) {
      setCurrentQuestionId('');
      return;
    }
    const stillValid = activePool.some((q) => q.id === currentQuestionId);
    if (!stillValid && !feedback) {
      setCurrentQuestionId(pickRandomQuestionId(activePool));
    }
  }, [activePool, currentQuestionId, feedback]);

  const currentQ: BibleQuestion | undefined = useMemo(() => {
    if (currentQuestionId) {
      const hit = bank.find((q) => q.id === currentQuestionId);
      if (hit && ((correctCounts[hit.id] || 0) < 3 || feedback !== null)) return hit;
    }
    return activePool[0];
  }, [bank, currentQuestionId, activePool, correctCounts, feedback]);

  const handleWordClick = (rawToken: string) => {
    const cleanWord = rawToken.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9'’-]+$/g, '');
    if (!cleanWord || !/[a-zA-Z]/.test(cleanWord)) return;
    bridge.playClick();
    const res = lookupBibleWordMeaning(cleanWord);
    setWordLookup({
      token: cleanWord,
      meaningVi: res ? res.meaningVi : null,
    });
  };

  const renderClickableText = (text: string) => {
    // Split preserving spaces and parenthesized Vietnamese proper noun notes
    const parts = String(text || '').split(/(\([^)]*\)|\s+)/);
    return parts.map((part, idx) => {
      if (!part) return null;
      if (/^\s+$/.test(part)) return <React.Fragment key={idx}>{part}</React.Fragment>;
      if (/^\([^)]*\)$/.test(part)) {
        return (
          <span key={idx} className="text-sky-700 font-semibold">
            {part}
          </span>
        );
      }
      const hasAlpha = /[a-zA-Z]{2,}/.test(part);
      if (!hasAlpha) return <React.Fragment key={idx}>{part}</React.Fragment>;
      return (
        <span
          key={idx}
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            handleWordClick(part);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              handleWordClick(part);
            }
          }}
          title="Bấm để xem nghĩa tiếng Việt"
          className="cursor-pointer rounded px-0.5 transition-colors hover:bg-amber-200/80 hover:text-amber-950 underline decoration-dotted decoration-sky-400 underline-offset-4"
        >
          {part}
        </span>
      );
    });
  };

  const handleSelectAnswer = (optIdx: number) => {
    if (!currentQ || feedback) return;
    if (inspectOptionWords) return;
    const res = bridge.submitBibleAnswer?.(currentQ.id, optIdx);
    if (res) {
      setFeedback({
        selectedIdx: optIdx,
        ...res,
      });
    }
  };

  const handleNextQuestion = () => {
    bridge.playClick();
    setFeedback(null);
    setWordLookup(null);
    setInspectOptionWords(false);
    const nextPool = bank.filter((q) => {
      const c = correctCounts[q.id] || 0;
      if (c >= 3) return false;
      return categoryFilter === 'all' || q.category === categoryFilter;
    });
    const fallbackPool = nextPool.length > 0 ? nextPool : bank.filter((q) => (correctCounts[q.id] || 0) < 3);
    setCurrentQuestionId(pickRandomQuestionId(fallbackPool, currentQ?.id));
  };

  const currentStreak = feedback ? feedback.newStreak : progress.streak || 0;
  const streakMod = currentStreak % 3;
  const currentQCount = currentQ ? correctCounts[currentQ.id] || 0 : 0;

  return (
    <div className="fixed inset-0 z-[240] flex items-center justify-center bg-slate-950/75 p-3">
      <div className="w-full max-w-2xl max-h-[92dvh] flex flex-col rounded-2xl border-[3px] border-[#1E293B] bg-[#F8FAFC] text-[#1E293B] shadow-2xl overflow-hidden">
        {/* Protestant Church Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#0F172A] text-white border-b-[3px] border-[#FACC15]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-amber-400/60 flex items-center justify-center shrink-0">
              <span className="text-xl font-black text-[#FACC15]" aria-hidden="true">✝</span>
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-white truncate">
                Nhà Thờ Tin Lành — Đố Kinh Thánh
              </h2>
              <div className="text-[11px] text-slate-300 flex flex-wrap items-center gap-x-2">
                <span>Người chơi: <b className="text-amber-300">{user.name}</b></span>
                <span aria-hidden="true">·</span>
                <span>Nguồn: NIV &amp; Truyền Thống 1925</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              bridge.playClick();
              onClose();
            }}
            className="p-2 rounded-lg bg-slate-800 text-slate-100 hover:bg-slate-700 cursor-pointer shrink-0"
            aria-label="Đóng cửa sổ"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Clean Metrics Strip (No Static Pills) */}
        <div className="grid grid-cols-3 gap-2 px-4 py-2.5 bg-white border-b border-slate-200 text-xs">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
            <div className="text-[10px] font-semibold text-slate-500">Đã thuộc (3/3)</div>
            <div className="font-extrabold text-sm text-slate-900 tabular-nums">
              {masteredTotal} / {bank.length} câu
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
            <div className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
              <Flame className="w-3 h-3 text-amber-600" /> Chuỗi đúng liên tiếp
            </div>
            <div className="font-extrabold text-sm text-amber-700 tabular-nums">
              {currentStreak} câu ({streakMod}/3 → +1⭐)
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
            <div className="text-[10px] font-semibold text-slate-500">Điểm hiện có</div>
            <div className="font-extrabold text-sm text-sky-700 tabular-nums">
              {user.points}⭐
            </div>
          </div>
        </div>

        {/* Category Filter Tabs & Word Lookup Mode */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-slate-100 border-b border-slate-200">
          <div className="flex flex-wrap items-center gap-1">
            {CATEGORY_LABELS.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  bridge.playClick();
                  setCategoryFilter(cat.id);
                  if (!feedback) {
                    const nextPool = bank.filter(
                      (q) => (correctCounts[q.id] || 0) < 3 && (cat.id === 'all' || q.category === cat.id)
                    );
                    if (nextPool.length > 0) {
                      setCurrentQuestionId(pickRandomQuestionId(nextPool));
                    }
                  }
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-bold cursor-pointer transition-colors whitespace-nowrap ${
                  categoryFilter === cat.id
                    ? 'bg-[#0369A1] text-white shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              bridge.playClick();
              setInspectOptionWords((v) => !v);
            }}
            className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 border cursor-pointer transition-colors whitespace-nowrap ${
              inspectOptionWords
                ? 'bg-amber-400 border-amber-600 text-slate-950'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-amber-50'
            }`}
            title="Bật để bấm xem nghĩa tiếng Việt của từng từ ngay trong các đáp án A/B/C/D"
          >
            <Search className="w-3.5 h-3.5" />
            <span>{inspectOptionWords ? 'Đang tra từ đáp án' : 'Tra từ đáp án'}</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {!currentQ ? (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-6 text-center space-y-2">
              <div className="text-4xl">🏆</div>
              <h3 className="text-base font-extrabold text-emerald-950">
                Chúc mừng {user.name}! Con đã hoàn thành toàn bộ ngân hàng câu hỏi!
              </h3>
              <p className="text-xs text-emerald-800 max-w-md mx-auto leading-relaxed">
                Tất cả {bank.length} câu hỏi Đố Kinh Thánh đều đã được trả lời đúng đủ 3 lần nên sẽ không hỏi lại nữa. Ba mẹ có thể thêm câu hỏi mới trong Bảng Điều Khiển Phụ Huynh!
              </p>
            </div>
          ) : (
            <>
              {/* Question Metadata & Audio */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                <div className="flex items-center gap-2 font-semibold">
                  <span>
                    {currentQ.category === 'fact'
                      ? 'Dữ kiện Kinh Thánh'
                      : currentQ.category === 'image'
                      ? 'Câu hỏi hình ảnh'
                      : currentQ.category === 'verse'
                      ? 'Câu gốc Kinh Thánh'
                      : 'Ẩn dụ & Bài học'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    Đã đúng câu này: <b className="text-slate-900 tabular-nums">{currentQCount}/3 lần</b>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    bridge.speakEnglish(stripParenNotesForSpeech(currentQ.q), 0.88);
                  }}
                  className="px-2.5 py-1 rounded-lg border border-sky-300 bg-sky-50 text-sky-900 font-bold flex items-center gap-1 hover:bg-sky-100 cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Nghe câu hỏi</span>
                </button>
              </div>

              {/* Question Prompt with Clickable Word Lookup */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-2">
                {currentQ.visualId && <BibleVisualSvg visualId={currentQ.visualId} />}

                <p className="text-base sm:text-lg font-bold text-slate-900 leading-relaxed">
                  {renderClickableText(currentQ.q)}
                </p>

                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
                  <HelpCircle className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  <span>
                    Chạm vào bất kỳ từ tiếng Anh nào ở câu hỏi (hoặc bật <b>Tra từ đáp án</b>) để xem nghĩa tiếng Việt.
                  </span>
                </div>
              </div>

              {/* Word Lookup Result Bar */}
              {wordLookup && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <BookOpen className="w-4 h-4 text-amber-700 shrink-0" />
                    <span className="text-amber-950">
                      Nghĩa của từ <b className="underline">&ldquo;{wordLookup.token}&rdquo;</b>:{' '}
                      <b className="text-slate-900">
                        {wordLookup.meaningVi || 'Danh từ riêng / Chưa có trong từ điển cơ bản'}
                      </b>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => bridge.speakEnglish(wordLookup.token, 0.85)}
                      className="p-1 rounded bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 cursor-pointer"
                      title="Phát âm từ này"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setWordLookup(null)}
                      className="p-1 rounded hover:bg-amber-200 text-amber-900 cursor-pointer"
                      aria-label="Đóng tra từ"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Answer Options A / B / C / D */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {currentQ.opts.map((opt, idx) => {
                  const letter = ['A', 'B', 'C', 'D'][idx];
                  const isSelected = feedback?.selectedIdx === idx;
                  const isWrongSelected = Boolean(feedback && !feedback.correct && isSelected);
                  const isRightSelected = Boolean(feedback && feedback.correct && isSelected);

                  // Strictly NEVER reveal the correct option if the player answered wrong!
                  let btnClass =
                    'bg-white border-slate-300 text-slate-900 hover:border-sky-500 hover:bg-sky-50/60';
                  if (isRightSelected) {
                    btnClass = 'bg-emerald-50 border-emerald-600 text-emerald-950 ring-2 ring-emerald-200';
                  } else if (isWrongSelected) {
                    btnClass = 'bg-rose-50 border-rose-500 text-rose-950 ring-2 ring-rose-200';
                  } else if (feedback) {
                    btnClass = 'bg-slate-50 border-slate-200 text-slate-500 opacity-75';
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={Boolean(feedback) && !inspectOptionWords}
                      onClick={() => {
                        if (inspectOptionWords) return;
                        handleSelectAnswer(idx);
                      }}
                      className={`text-left rounded-xl border-2 px-3.5 py-3 text-sm font-semibold transition-all flex items-start gap-2.5 ${
                        inspectOptionWords ? 'cursor-default border-amber-400 bg-amber-50/40' : 'cursor-pointer'
                      } ${btnClass}`}
                    >
                      <span
                        className={`w-6 h-6 rounded-lg text-xs font-extrabold flex items-center justify-center shrink-0 mt-0.5 ${
                          isRightSelected
                            ? 'bg-emerald-600 text-white'
                            : isWrongSelected
                            ? 'bg-rose-600 text-white'
                            : 'bg-slate-200 text-slate-800'
                        }`}
                      >
                        {letter}
                      </span>
                      <span className="flex-1 leading-snug">
                        {inspectOptionWords ? renderClickableText(opt) : opt}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Feedback Callout */}
              {feedback && (
                <div
                  className={`rounded-xl border p-4 space-y-2.5 ${
                    feedback.correct
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
                      : 'border-rose-300 bg-rose-50 text-rose-950'
                  }`}
                >
                  {feedback.correct ? (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 font-extrabold text-sm">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          <span>{feedback.msg}</span>
                        </div>
                        {feedback.streakBonus > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs font-extrabold text-amber-800 bg-amber-100 border border-amber-300 rounded-lg px-2 py-0.5">
                            <Sparkles className="w-3.5 h-3.5" /> Thưởng chuỗi 3 câu: +1⭐
                          </span>
                        )}
                      </div>

                      {feedback.retired && (
                        <div className="text-xs font-bold text-emerald-800">
                          🎯 Con đã trả lời đúng câu này đủ 3/3 lần — câu hỏi sẽ không xuất hiện lại cho {user.name} nữa!
                        </div>
                      )}

                      <div className="rounded-lg border border-emerald-200 bg-white p-3 space-y-2 text-xs">
                        <div className="font-extrabold text-emerald-900">
                          📖 Trưng dẫn Kinh Thánh: {feedback.bookEn} {feedback.ref} (NIV) · {feedback.bookVi} {feedback.ref} (Truyền Thống 1925)
                        </div>
                        {feedback.verseEn && (
                          <div className="text-slate-800 leading-relaxed">
                            <span className="font-bold text-sky-800">NIV:</span>{' '}
                            <span>{renderClickableText(feedback.verseEn)}</span>
                          </div>
                        )}
                        {feedback.verseVi && (
                          <div className="text-slate-800 leading-relaxed">
                            <span className="font-bold text-emerald-800">1925:</span>{' '}
                            <span>&ldquo;{feedback.verseVi}&rdquo;</span>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 font-extrabold text-sm">
                        <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                        <span>Chưa chính xác! Chuỗi đúng liên tiếp trở về 0.</span>
                      </div>
                      <div className="rounded-lg border border-rose-200 bg-white p-3 text-xs space-y-1">
                        <div className="font-bold text-rose-900">
                          📖 Gợi ý tra Kinh Thánh (không tiết lộ đáp án):
                        </div>
                        <p className="text-slate-800">
                          Hãy tìm đọc trong sách{' '}
                          <b className="text-sky-800">{feedback.bookEn}</b>{' '}
                          (<b className="text-emerald-800">{feedback.bookVi}</b>) để tìm ra câu trả lời đúng cho lần gặp lại sau nhé!
                        </p>
                      </div>
                    </>
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleNextQuestion}
                      className="px-4 py-2 rounded-xl bg-[#0369A1] text-white text-xs sm:text-sm font-extrabold flex items-center gap-1.5 hover:bg-[#075985] cursor-pointer shadow"
                    >
                      <span>Câu hỏi tiếp theo</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
