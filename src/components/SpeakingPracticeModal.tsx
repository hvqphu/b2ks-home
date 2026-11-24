import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Mic, MicOff, Volume2, RefreshCw, Sparkles, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { scoreSpeakingPronunciation } from '../game/speakingAndAchievements';
import type { B2KSBridge, SpeakingLevel, SpeakingSentence } from '../types/b2ks';

interface Props {
  bridge: B2KSBridge;
  onClose: () => void;
}

interface SpeechRecognitionCtor {
  new (): {
    lang: string;
    interimResults: boolean;
    maxAlternatives: number;
    continuous: boolean;
    onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
    onerror: ((ev: { error: string }) => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
    abort: () => void;
  };
}

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export const SpeakingPracticeModal: React.FC<Props> = ({ bridge, onClose }) => {
  const user = bridge.getCurrentUser();
  const npc = bridge.getActiveSpeakingNpc?.() || {
    id: 'npc_alex',
    name: 'Mr. Alex',
    gender: 'male' as const,
  };

  const bank = useMemo(() => bridge.getGlobalSpeakingBank?.() || [], [bridge]);
  const currentLevel = (Math.max(1, Math.min(5, user.speakingLevel || 1)) as SpeakingLevel);

  const levelSentences = useMemo(() => {
    const exact = bank.filter((s) => s.level === currentLevel);
    return exact.length > 0 ? exact : bank;
  }, [bank, currentLevel]);

  const [sentenceIdx, setSentenceIdx] = useState<number>(() =>
    Math.floor(Math.random() * Math.max(1, levelSentences.length))
  );
  const currentSentence: SpeakingSentence | undefined =
    levelSentences[sentenceIdx % Math.max(1, levelSentences.length)];

  const [micState, setMicState] = useState<'checking' | 'ready' | 'denied' | 'unsupported'>('checking');
  const [isListening, setIsListening] = useState(false);
  const [spokenText, setSpokenText] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [lastOutcome, setLastOutcome] = useState<{
    accuracy: number;
    passed: boolean;
    awarded: number;
    leveledUp: boolean;
    newLevel: SpeakingLevel;
    newStreak: number;
    spokenText: string;
    wordMatches: Array<{ word: string; hit: boolean }>;
  } | null>(null);
  const [statusMsg, setStatusMsg] = useState('Bấm 🔊 Nghe mẫu trước rồi bấm 🎤 Nói thật rõ nhé!');

  const recognitionRef = useRef<InstanceType<SpeechRecognitionCtor> | null>(null);
  const sessionIdRef = useRef<number>(0);
  const latestTranscriptRef = useRef<string>('');
  const handledResultRef = useRef<boolean>(false);
  const currentSentenceRef = useRef<SpeakingSentence | undefined>(currentSentence);
  currentSentenceRef.current = currentSentence;
  const hasSpeechRec = Boolean(getSpeechRecognitionCtor());

  useEffect(() => {
    let mounted = true;
    const initMicStatus = async () => {
      if (!hasSpeechRec) {
        if (mounted) setMicState('unsupported');
        return;
      }
      if (navigator.permissions?.query) {
        try {
          const perm = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          if (mounted) {
            setMicState(perm.state === 'denied' ? 'denied' : 'ready');
          }
          perm.onchange = () => {
            if (mounted) {
              setMicState(perm.state === 'denied' ? 'denied' : 'ready');
            }
          };
          return;
        } catch {
          // Some browsers don't support microphone permission query
        }
      }
      if (mounted) setMicState('ready');
    };
    initMicStatus();
    return () => {
      mounted = false;
      sessionIdRef.current += 1;
      const oldRec = recognitionRef.current;
      recognitionRef.current = null;
      if (oldRec) {
        oldRec.onresult = null;
        oldRec.onerror = null;
        oldRec.onend = null;
        try {
          oldRec.abort();
        } catch {
          // ignore
        }
      }
    };
  }, [hasSpeechRec]);

  useEffect(() => {
    if (currentSentence) {
      const timer = window.setTimeout(() => {
        bridge.speakEnglishWithGender?.(currentSentence.sentence, npc.gender, 0.85);
      }, 280);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [currentSentence?.id]);

  const handlePlaySample = () => {
    if (!currentSentence) return;
    bridge.speakEnglishWithGender?.(currentSentence.sentence, npc.gender, 0.85);
  };

  const evaluateTranscript = (transcript: string) => {
    const sentenceObj = currentSentenceRef.current;
    if (!sentenceObj) return;
    const clean = transcript.trim();
    if (!clean) {
      setStatusMsg('⚠️ Chưa nghe rõ giọng đọc, con hãy thử lại nhé!');
      return;
    }
    setSpokenText(clean);
    const evalRes = scoreSpeakingPronunciation(sentenceObj.sentence, clean);
    const submitted = bridge.submitSpeakingResult?.({
      sentenceId: sentenceObj.id,
      targetText: sentenceObj.sentence,
      spokenText: clean,
      accuracy: evalRes.accuracy,
      npcId: npc.id,
      npcName: npc.name,
      npcGender: npc.gender,
    });
    if (submitted) {
      setLastOutcome({
        ...submitted,
        spokenText: clean,
        wordMatches: evalRes.wordMatches,
      });
      if (submitted.leveledUp) {
        setStatusMsg(`🎉 Tuyệt đỉnh! Con đã thăng hạng lên Speaking Level ${submitted.newLevel}!`);
      } else if (submitted.passed) {
        setStatusMsg(`🌟 Rất chuẩn (${submitted.accuracy}%)! Nhận +${submitted.awarded}⭐!`);
      } else {
        setStatusMsg(`💪 Độ chính xác ${submitted.accuracy}% (< 80%): Nhận 0⭐ và reset chuỗi. Nghe kỹ lại rồi thử nhé!`);
      }
    }
  };

  const stopActiveRecognition = (graceful: boolean) => {
    const curRec = recognitionRef.current;
    if (!curRec) return;
    if (!graceful) {
      curRec.onresult = null;
      curRec.onerror = null;
      curRec.onend = null;
      recognitionRef.current = null;
      try {
        curRec.abort();
      } catch {
        // ignore
      }
    } else {
      try {
        curRec.stop();
      } catch {
        // ignore
      }
    }
  };

  const handleStartListening = () => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setMicState('unsupported');
      setStatusMsg('⚠️ Trình duyệt không hỗ trợ nhận diện giọng nói Web Speech API. Con có thể nhập câu vừa đọc bên dưới để kiểm tra.');
      return;
    }

    // Cancel any active TTS playback immediately so it doesn't interfere with mic
    try {
      window.speechSynthesis?.cancel();
    } catch {
      // ignore
    }

    if (isListening && recognitionRef.current) {
      stopActiveRecognition(true);
      setIsListening(false);
      if (!handledResultRef.current && latestTranscriptRef.current.trim()) {
        handledResultRef.current = true;
        evaluateTranscript(latestTranscriptRef.current);
      }
      return;
    }

    // Abort any stale session and start synchronously within the user click gesture
    stopActiveRecognition(false);
    const mySession = ++sessionIdRef.current;
    latestTranscriptRef.current = '';
    handledResultRef.current = false;
    setLastOutcome(null);
    setSpokenText('');

    try {
      const rec = new Ctor();
      rec.lang = 'en-US';
      rec.interimResults = true;
      rec.maxAlternatives = 3;
      rec.continuous = false;
      recognitionRef.current = rec;
      setMicState('ready');
      setIsListening(true);
      setStatusMsg('🎙️ Đang nghe con đọc... Hãy đọc to, rõ câu Tiếng Anh trên màn hình!');

      rec.onresult = (ev) => {
        if (sessionIdRef.current !== mySession) return;
        const results = ev.results as unknown as ArrayLike<
          ArrayLike<{ transcript: string }> & { isFinal?: boolean }
        >;
        if (!results || results.length === 0) return;

        let combined = '';
        let hasFinal = false;
        const target = currentSentenceRef.current?.sentence || '';

        for (let i = 0; i < results.length; i++) {
          const item = results[i];
          if (!item || item.length === 0) continue;
          let bestAlt = item[0]?.transcript || '';
          if (item.isFinal) {
            hasFinal = true;
            if (item.length > 1 && target) {
              let bestAcc = -1;
              for (let a = 0; a < item.length; a++) {
                const cand = (item[a]?.transcript || '').trim();
                if (!cand) continue;
                const sc = scoreSpeakingPronunciation(target, cand).accuracy;
                if (sc > bestAcc) {
                  bestAcc = sc;
                  bestAlt = cand;
                }
              }
            }
          }
          combined += (combined ? ' ' : '') + bestAlt.trim();
        }

        const clean = combined.trim();
        if (clean) {
          latestTranscriptRef.current = clean;
          setSpokenText(clean);
        }

        if (hasFinal && clean && !handledResultRef.current) {
          handledResultRef.current = true;
          recognitionRef.current = null;
          setIsListening(false);
          try {
            rec.stop();
          } catch {
            // ignore
          }
          evaluateTranscript(clean);
        }
      };

      rec.onerror = (ev) => {
        if (sessionIdRef.current !== mySession) return;
        recognitionRef.current = null;
        setIsListening(false);
        if (ev.error === 'aborted') {
          return;
        }
        if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {
          setMicState('denied');
          setStatusMsg('❌ Micro đang bị chặn quyền truy cập. Hãy bật quyền Micro trên trình duyệt!');
        } else if (ev.error === 'no-speech') {
          if (latestTranscriptRef.current.trim() && !handledResultRef.current) {
            handledResultRef.current = true;
            evaluateTranscript(latestTranscriptRef.current);
          } else {
            setStatusMsg('🔇 Không phát hiện giọng nói. Hãy bấm Mic và đọc to, rõ lại nhé!');
          }
        } else {
          setStatusMsg(`⚠️ Lỗi nhận diện giọng nói (${ev.error}). Hãy thử lại!`);
        }
      };

      rec.onend = () => {
        if (sessionIdRef.current !== mySession) return;
        recognitionRef.current = null;
        setIsListening(false);
        if (!handledResultRef.current && latestTranscriptRef.current.trim()) {
          handledResultRef.current = true;
          evaluateTranscript(latestTranscriptRef.current);
        }
      };

      rec.start();
    } catch {
      recognitionRef.current = null;
      setIsListening(false);
      setStatusMsg('⚠️ Không thể bật micro lúc này. Hãy thử bấm lại 1 lần nữa!');
    }
  };

  const handleNextSentence = () => {
    setLastOutcome(null);
    setSpokenText('');
    setManualInput('');
    setSentenceIdx((prev) => (prev + 1) % Math.max(1, levelSentences.length));
    setStatusMsg('Bấm 🔊 Nghe mẫu trước rồi bấm 🎤 Nói thật rõ nhé!');
  };

  const freshUser = bridge.getCurrentUser();
  const displayLevel = freshUser.speakingLevel || 1;
  const displayStreak = freshUser.speakingStreak || 0;

  return (
    <div
      className="modal-overlay"
      style={{ display: 'flex', zIndex: 250 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-content pixel-box"
        style={{
          maxWidth: '580px',
          width: '95vw',
          maxHeight: '90dvh',
          overflowY: 'auto',
          background:
            npc.gender === 'female'
              ? 'linear-gradient(180deg, #FFF5F8 0%, #FCE7F3 100%)'
              : 'linear-gradient(180deg, #F0F9FF 0%, #E0F2FE 100%)',
          borderColor: '#0F172A',
        }}
      >
        {/* Header */}
        <div
          className="modal-header"
          style={{
            background:
              npc.gender === 'female'
                ? 'linear-gradient(90deg, #DB2777, #EC4899)'
                : 'linear-gradient(90deg, #1D4ED8, #0284C7)',
            color: '#FFFFFF',
            margin: '-16px -16px 12px -16px',
            padding: '12px 16px',
            borderRadius: '13px 13px 0 0',
            borderBottom: '3px solid #0F172A',
          }}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-3xl">{npc.gender === 'female' ? '👩‍🏫' : '👨‍🏫'}</span>
            <div>
              <h2 style={{ color: '#FFFFFF', margin: 0, fontSize: '17px' }}>
                Học Nói Tiếng Anh cùng {npc.name}
              </h2>
              <div className="text-[11px] text-white/90 font-semibold">
                Giọng đọc bản ngữ ({npc.gender === 'female' ? 'Giọng Nữ' : 'Giọng Nam'}) • Chuẩn &ge; 80% nhận điểm
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm"
            style={{ background: '#FFF', color: '#0F172A' }}
            onClick={onClose}
          >
            <X className="w-4 h-4" />
            <span>Đóng</span>
          </button>
        </div>

        {/* Speaking Level & Streak Bar */}
        <div className="rounded-xl border-2 border-[#0F172A] bg-white p-3 mb-3 space-y-2">
          <div className="flex items-center justify-between text-xs font-extrabold">
            <span className="text-indigo-700">🎓 Speaking Level {displayLevel} / 5</span>
            <span className="text-emerald-700">
              🔥 Chuỗi đạt &ge;80%: {displayStreak} / 5 câu
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {[0, 1, 2, 3, 4].map((slot) => (
              <div
                key={slot}
                className={`h-2.5 rounded-full border ${
                  slot < displayStreak
                    ? 'bg-emerald-500 border-emerald-700'
                    : 'bg-slate-200 border-slate-300'
                }`}
              />
            ))}
          </div>
          <div className="text-[11px] text-slate-600">
            Luật tính điểm: Đọc đúng <b>&ge; 80%</b> nhận <b>8–10⭐</b> tương ứng tỷ lệ. Đọc <b>&lt; 80%</b> nhận <b>0⭐</b> và reset chuỗi thắng về 0. Đúng 5 câu liên tiếp sẽ lên cấp!
          </div>
        </div>

        {/* Target Sentence Card */}
        {currentSentence ? (
          <div className="rounded-2xl border-2 border-[#0F172A] bg-white p-4 mb-3 text-center space-y-2 shadow-sm">
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[11px] font-bold">
              <span>{currentSentence.topic || 'Daily Talk'}</span>
              <span>•</span>
              <span>Level {currentSentence.level}</span>
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug">
              &ldquo;{currentSentence.sentence}&rdquo;
            </div>
            {currentSentence.meaningVi && (
              <div className="text-xs font-semibold text-slate-500">
                ({currentSentence.meaningVi})
              </div>
            )}

            <div className="flex flex-wrap justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={handlePlaySample}
                className="btn btn-sm btn-accent"
              >
                <Volume2 className="w-4 h-4" />
                <span>🔊 Nghe {npc.name} đọc</span>
              </button>
              <button
                type="button"
                onClick={handleStartListening}
                className={`btn btn-sm ${isListening ? 'btn-danger' : 'btn-primary'}`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                <span>{isListening ? '⏹️ Dừng nghe' : '🎤 Bấm Để Nói'}</span>
              </button>
              <button
                type="button"
                onClick={handleNextSentence}
                className="btn btn-sm"
                style={{ background: '#475569' }}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Câu khác</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-amber-100 text-amber-900 text-sm font-bold text-center mb-3">
            Chưa có mẫu câu nào trong ngân hàng Speaking!
          </div>
        )}

        {/* Mic status & Status message */}
        <div
          className={`rounded-xl border-2 px-3 py-2 text-xs font-bold mb-3 flex items-center gap-2 ${
            micState === 'denied'
              ? 'bg-rose-100 border-rose-500 text-rose-900'
              : isListening
                ? 'bg-amber-100 border-amber-500 text-amber-900'
                : 'bg-sky-50 border-sky-400 text-sky-900'
          }`}
        >
          {micState === 'denied' ? (
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          ) : (
            <Sparkles className="w-4 h-4 shrink-0 text-amber-600" />
          )}
          <span>{statusMsg}</span>
        </div>

        {/* Fallback input when browser does not support Web Speech API */}
        {(!hasSpeechRec || micState === 'unsupported') && (
          <div className="rounded-xl border-2 border-slate-400 bg-white p-3 mb-3 space-y-2">
            <div className="text-[11px] font-bold text-slate-600">
              ⌨️ Trình duyệt hiện tại không có SpeechRecognition — Nhập lại câu con đọc để chấm điểm:
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') evaluateTranscript(manualInput);
                }}
                placeholder="Gõ câu Tiếng Anh..."
                className="flex-1 px-2.5 py-1.5 rounded-lg border-2 border-[#0F172A] text-xs font-bold"
              />
              <button
                type="button"
                onClick={() => evaluateTranscript(manualInput)}
                className="btn btn-sm btn-primary"
              >
                Kiểm tra
              </button>
            </div>
          </div>
        )}

        {/* Result Breakdown */}
        {lastOutcome && (
          <div
            className={`rounded-2xl border-2 p-3.5 space-y-2.5 ${
              lastOutcome.passed
                ? 'bg-emerald-50 border-emerald-600'
                : 'bg-rose-50 border-rose-500'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {lastOutcome.passed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                )}
                <span className="font-extrabold text-sm text-slate-900">
                  Độ chính xác: {lastOutcome.accuracy}%
                </span>
              </div>
              <span
                className={`px-3 py-0.5 rounded-full text-xs font-extrabold ${
                  lastOutcome.passed
                    ? 'bg-emerald-600 text-white'
                    : 'bg-rose-600 text-white'
                }`}
              >
                {lastOutcome.passed ? `+${lastOutcome.awarded}⭐` : '0⭐ (Chưa đạt 80%)'}
              </span>
            </div>

            <div className="text-xs text-slate-700 bg-white rounded-lg p-2 border border-slate-300">
              <span className="font-bold">Con đã đọc: </span>
              <span className="italic">&ldquo;{spokenText || lastOutcome.spokenText}&rdquo;</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {lastOutcome.wordMatches.map((wm, i) => (
                <span
                  key={`${wm.word}-${i}`}
                  className={`px-2 py-0.5 rounded-md text-xs font-bold border ${
                    wm.hit
                      ? 'bg-emerald-100 border-emerald-500 text-emerald-900'
                      : 'bg-rose-100 border-rose-400 text-rose-800 line-through'
                  }`}
                >
                  {wm.word}
                </span>
              ))}
            </div>

            {lastOutcome.leveledUp && (
              <div className="rounded-xl bg-amber-400 text-slate-950 font-extrabold text-xs px-3 py-2 text-center border-2 border-[#0F172A]">
                🎉 CHÚC MỪNG THĂNG HẠNG SPEAKING LEVEL {lastOutcome.newLevel}!
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
