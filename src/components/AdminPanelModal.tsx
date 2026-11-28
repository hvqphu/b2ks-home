import React, { useEffect, useState } from 'react';
import JSZip from 'jszip';
import {
  Building2,
  Coins,
  Download,
  KeyRound,
  Package,
  Palette,
  PawPrint,
  PlusCircle,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react';
import { AdminNeighborhoodRecord, B2KSBridge } from '../types/b2ks';
import {
  PET_ACCESSORY_CATALOG,
  PET_FOOD_CATALOG,
  PET_SPECIES,
  PET_VARIANT_DEFS,
} from '../game/constants';
import { renderPetArtSVG } from '../game/petSystem';
import { AssetLibraryTab } from './AssetLibraryTab';

interface Props {
  bridge: B2KSBridge;
  onClose: () => void;
}

export const AdminPanelModal: React.FC<Props> = ({ bridge, onClose }) => {
  const [tab, setTab] = useState<'neighborhoods' | 'parent_points' | 'assets' | 'pet_codex' | 'export_zip'>('neighborhoods');
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [records, setRecords] = useState<AdminNeighborhoodRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Create Neighborhood form
  const [newFamilyName, setNewFamilyName] = useState('');
  const [newDadName, setNewDadName] = useState('Bố');
  const [newMomName, setNewMomName] = useState('Mẹ');
  const [creating, setCreating] = useState(false);
  const [confirmDeleteSlug, setConfirmDeleteSlug] = useState<string | null>(null);
  const [confirmResetSlug, setConfirmResetSlug] = useState<string | null>(null);

  // Parent allowance, max cap & points drafts keyed by slug
  const [allowanceDrafts, setAllowanceDrafts] = useState<Record<string, string>>({});
  const [maxPointsDrafts, setMaxPointsDrafts] = useState<Record<string, string>>({});
  const [parentPointDrafts, setParentPointDrafts] = useState<Record<string, Record<string, string>>>({});
  const [savingSlug, setSavingSlug] = useState<string | null>(null);

  const isAuthorized = Boolean(bridge.isB2KSDad?.());

  const loadNeighborhoods = async () => {
    if (!bridge.adminListNeighborhoods) return;
    setLoading(true);
    try {
      const list = await bridge.adminListNeighborhoods();
      setRecords(list);
      const nextAllow: Record<string, string> = {};
      const nextMaxPts: Record<string, string> = {};
      const nextPts: Record<string, Record<string, string>> = {};
      list.forEach((rec) => {
        nextAllow[rec.slug] = String(rec.dailyParentAllowance ?? 100);
        nextMaxPts[rec.slug] = String(rec.maxParentPoints ?? 500);
        nextPts[rec.slug] = {};
        rec.parents.forEach((p) => {
          nextPts[rec.slug][p.id] = String(p.points ?? 0);
        });
      });
      setAllowanceDrafts(nextAllow);
      setMaxPointsDrafts(nextMaxPts);
      setParentPointDrafts(nextPts);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      loadNeighborhoods();
    }
  }, [isAuthorized]);

  if (!isAuthorized) {
    return (
      <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/75 p-4">
        <div className="w-full max-w-md rounded-2xl border-[3px] border-[#2C3E50] bg-white p-5 text-[#2C3E50] shadow-2xl space-y-4">
          <div className="flex items-center gap-2 text-rose-700 font-extrabold text-base">
            <ShieldAlert className="w-5 h-5" />
            <span>Không có quyền truy cập Admin</span>
          </div>
          <p className="text-sm text-slate-600">
            Công cụ Admin chỉ dành riêng cho <b>Quản trị viên</b> của hệ thống.
          </p>
          <button
            type="button"
            onClick={() => {
              bridge.playClick();
              onClose();
            }}
            className="btn btn-primary w-full justify-center"
          >
            Đóng
          </button>
        </div>
      </div>
    );
  }

  const handleCreateNeighborhood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creating || !bridge.adminCreateNeighborhood) return;
    const clean = newFamilyName.trim();
    if (!clean) {
      bridge.playError();
      bridge.showToast('⚠️ Vui lòng nhập tên khu phố / gia đình mới!');
      return;
    }
    setCreating(true);
    try {
      const res = await bridge.adminCreateNeighborhood(clean, newDadName.trim() || 'Bố', newMomName.trim() || 'Mẹ');
      bridge.showToast(res.msg);
      if (res.ok) {
        bridge.playSuccess();
        setNewFamilyName('');
        setNewDadName('Bố');
        setNewMomName('Mẹ');
        await loadNeighborhoods();
      } else {
        bridge.playError();
      }
    } finally {
      setCreating(false);
    }
  };

  const handleResetPasswords = async (slug: string) => {
    if (!bridge.adminResetNeighborhoodPasswords) return;
    setSavingSlug(slug);
    try {
      const res = await bridge.adminResetNeighborhoodPasswords(slug);
      setConfirmResetSlug(null);
      bridge.showToast(res.msg);
      if (res.ok) {
        bridge.playSuccess();
      } else {
        bridge.playError();
      }
    } finally {
      setSavingSlug(null);
    }
  };

  const handleDeleteNeighborhood = async (slug: string) => {
    if (!bridge.adminDeleteNeighborhood) return;
    setSavingSlug(slug);
    try {
      const res = await bridge.adminDeleteNeighborhood(slug);
      setConfirmDeleteSlug(null);
      bridge.showToast(res.msg);
      if (res.ok) {
        bridge.playClick();
        await loadNeighborhoods();
      } else {
        bridge.playError();
      }
    } finally {
      setSavingSlug(null);
    }
  };

  const handleSaveParentAdjustment = async (rec: AdminNeighborhoodRecord) => {
    if (!bridge.adminAdjustParentAccount) return;
    setSavingSlug(rec.slug);
    try {
      const allowanceVal = Math.max(0, Math.min(10000, Math.round(Number(allowanceDrafts[rec.slug] ?? rec.dailyParentAllowance) || 0)));
      const maxPointsVal = Math.max(0, Math.min(999999, Math.round(Number(maxPointsDrafts[rec.slug] ?? rec.maxParentPoints ?? 500) || 0)));
      const ptsMap: Record<string, number> = {};
      rec.parents.forEach((p) => {
        const raw = parentPointDrafts[rec.slug]?.[p.id];
        ptsMap[p.id] = Math.max(0, Math.min(999999, Math.round(Number(raw ?? p.points) || 0)));
      });
      const res = await bridge.adminAdjustParentAccount(rec.slug, {
        dailyParentAllowance: allowanceVal,
        maxParentPoints: maxPointsVal,
        parentPoints: ptsMap,
      });
      bridge.showToast(res.msg);
      if (res.ok) {
        bridge.playSuccess();
        await loadNeighborhoods();
      } else {
        bridge.playError();
      }
    } finally {
      setSavingSlug(null);
    }
  };

  const bumpParentDraftPoint = (slug: string, parentId: string, currentFallback: number, delta: number) => {
    setParentPointDrafts((prev) => {
      const famMap = { ...(prev[slug] || {}) };
      const curVal = Number(famMap[parentId] ?? currentFallback) || 0;
      famMap[parentId] = String(Math.max(0, curVal + delta));
      return { ...prev, [slug]: famMap };
    });
  };

  const handleDownloadGithubZip = async () => {
    if (downloadingZip) return;
    setDownloadingZip(true);
    bridge.playClick();
    bridge.showToast('⏳ Đang chuẩn bị file b2ks-daily-routines-github.zip...');
    try {
      let zipBlob: Blob | null = null;

      const cacheBust = `v=${Date.now()}`;
      for (const candidate of [
        `./b2ks-daily-routines-github.zip?${cacheBust}`,
        `../public/b2ks-daily-routines-github.zip?${cacheBust}`,
      ]) {
        try {
          const res = await fetch(candidate, { cache: 'no-store' });
          if (res.ok) {
            const buf = await res.arrayBuffer();
            const bytes = new Uint8Array(buf);
            if (bytes.length > 100 && bytes[0] === 0x50 && bytes[1] === 0x4b) {
              zipBlob = new Blob([buf], { type: 'application/zip' });
              break;
            }
          }
        } catch {
          // try next candidate
        }
      }

      if (!zipBlob) {
        let jsonRes: Response | null = null;
        for (const candidate of ['./b2ks-source-bundle.json', '../public/b2ks-source-bundle.json']) {
          try {
            const r = await fetch(candidate, { cache: 'no-store' });
            if (r.ok) {
              jsonRes = r;
              break;
            }
          } catch {
            // try next candidate
          }
        }
        if (!jsonRes) throw new Error('Không tải được dữ liệu đóng gói ZIP');
        const bundle = (await jsonRes.json()) as {
          files: Array<{ path: string; encoding: 'utf8' | 'base64'; content: string }>;
        };
        const zip = new JSZip();
        bundle.files.forEach((f) => {
          if (f.encoding === 'base64') {
            zip.file(f.path, f.content, { base64: true });
          } else {
            zip.file(f.path, f.content);
          }
        });
        zipBlob = await zip.generateAsync({
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 },
          mimeType: 'application/zip',
        });
      }

      const blobUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = 'b2ks-daily-routines-github.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
      bridge.playSuccess();
      bridge.showToast('📦 Đã tải xuống file b2ks-daily-routines-github.zip!');
    } catch {
      bridge.playError();
      bridge.showToast('❌ Lỗi tải file ZIP. Hãy mở trực tiếp tab mới (không qua iframe) và thử lại!');
    } finally {
      setDownloadingZip(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/75 p-3">
      <div className={`w-full ${tab === 'assets' || tab === 'pet_codex' ? 'max-w-5xl' : 'max-w-4xl'} max-h-[90dvh] flex flex-col rounded-2xl border-[3px] border-[#2C3E50] bg-[#F8FAFC] text-[#2C3E50] shadow-2xl overflow-hidden`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#4C1D95] via-[#6D28D9] to-[#7C3AED] text-white border-b-[3px] border-[#2C3E50]">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🛠️</span>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold">
                Công Cụ Admin Hệ Thống (Quản Trị Viên)
              </h2>
              <p className="text-xs text-violet-100">
                Quản lý danh sách khu phố, reset mật khẩu mặc định (1111 / 1234) &amp; điều chỉnh ngân sách Phụ huynh toàn hệ thống
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              bridge.playClick();
              onClose();
            }}
            className="p-1.5 rounded-lg bg-white text-[#2C3E50] hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-200 border-b-2 border-[#2C3E50]">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                bridge.playClick();
                setTab('neighborhoods');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                tab === 'neighborhoods' ? 'bg-[#6D28D9] text-white shadow' : 'bg-white text-[#2C3E50]'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Quản lý các khu phố ({records.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                bridge.playClick();
                setTab('parent_points');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                tab === 'parent_points' ? 'bg-[#D97706] text-white shadow' : 'bg-white text-[#2C3E50]'
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
              <span>Điều chỉnh điểm Phụ huynh</span>
            </button>
            <button
              type="button"
              onClick={() => {
                bridge.playClick();
                setTab('assets');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                tab === 'assets' ? 'bg-[#0284C7] text-white shadow' : 'bg-white text-[#2C3E50]'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Thư viện Hình ảnh 2D &amp; 3D</span>
            </button>
            <button
              type="button"
              onClick={() => {
                bridge.playClick();
                setTab('pet_codex');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                tab === 'pet_codex' ? 'bg-[#9333EA] text-white shadow' : 'bg-white text-[#2C3E50]'
              }`}
            >
              <PawPrint className="w-3.5 h-3.5" />
              <span>Sổ Tay Thú Cưng</span>
            </button>
            <button
              type="button"
              onClick={() => {
                bridge.playClick();
                setTab('export_zip');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                tab === 'export_zip' ? 'bg-[#0F766E] text-white shadow' : 'bg-white text-[#2C3E50]'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Xuất ZIP</span>
            </button>
          </div>
          {tab !== 'assets' && tab !== 'pet_codex' && tab !== 'export_zip' && (
            <button
              type="button"
              disabled={loading}
              onClick={loadNeighborhoods}
              className="btn btn-sm btn-accent"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Đang tải...' : 'Làm mới'}</span>
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {tab === 'neighborhoods' && (
            <>
              {/* Create New Neighborhood Box */}
              <form
                onSubmit={handleCreateNeighborhood}
                className="rounded-xl border-2 border-[#2C3E50] bg-violet-50 p-3.5 space-y-2.5"
              >
                <div>
                  <h3 className="font-extrabold text-sm text-violet-950 flex items-center gap-1.5">
                    <PlusCircle className="w-4 h-4 text-violet-700" />
                    <span>Tạo Khu Phố Gia Đình Mới</span>
                  </h3>
                  <p className="text-[11.5px] text-violet-800 mt-0.5">
                    Gia đình mới chỉ gồm <b>Bố</b> và <b>Mẹ</b> mặc định, database tách biệt hoàn toàn (chỉ dùng chung Ngân Hàng Tiếng Anh) và có mật khẩu mặc định: vào game <code className="bg-white px-1 rounded font-bold">1111</code> · Phụ huynh <code className="bg-white px-1 rounded font-bold">1234</code>.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <input
                    type="text"
                    maxLength={24}
                    value={newFamilyName}
                    onChange={(e) => setNewFamilyName(e.target.value)}
                    placeholder="Tên khu phố (VD: MINH, ANH...)"
                    className="sm:col-span-2 px-3 py-1.5 rounded-lg border-2 border-[#2C3E50] bg-white text-xs font-bold"
                  />
                  <input
                    type="text"
                    maxLength={20}
                    value={newDadName}
                    onChange={(e) => setNewDadName(e.target.value)}
                    placeholder="Tên Bố (mặc định: Bố)"
                    className="px-2.5 py-1.5 rounded-lg border-2 border-[#2C3E50] bg-white text-xs font-bold"
                  />
                  <input
                    type="text"
                    maxLength={20}
                    value={newMomName}
                    onChange={(e) => setNewMomName(e.target.value)}
                    placeholder="Tên Mẹ (mặc định: Mẹ)"
                    className="px-2.5 py-1.5 rounded-lg border-2 border-[#2C3E50] bg-white text-xs font-bold"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={creating}
                    className="btn btn-sm btn-purple disabled:opacity-60"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>{creating ? 'Đang khởi tạo...' : 'Tạo Khu Phố Mới (Chỉ gồm Bố & Mẹ)'}</span>
                  </button>
                </div>
              </form>

              {/* Neighborhood Directory */}
              <div className="space-y-2.5">
                {loading && records.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500">Đang tải danh sách các khu phố...</div>
                ) : records.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500">Chưa có dữ liệu khu phố.</div>
                ) : (
                  records.map((rec) => {
                    const isB2KS = rec.slug === 'b2ks';
                    const isBusy = savingSlug === rec.slug;
                    const confirmingReset = confirmResetSlug === rec.slug;
                    const confirmingDel = confirmDeleteSlug === rec.slug;
                    return (
                      <div
                        key={rec.slug}
                        className={`rounded-xl border-2 p-3 flex flex-wrap items-center justify-between gap-3 ${
                          isB2KS ? 'border-violet-600 bg-white shadow-sm' : 'border-[#2C3E50] bg-white'
                        }`}
                      >
                        <div className="space-y-1 min-w-[210px]">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-sm text-[#2C3E50]">
                              🏡 {rec.familyName}
                            </span>
                            <code className="text-[10.5px] px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-600">
                              slug: {rec.slug}
                            </code>
                            {isB2KS && (
                              <span className="px-2 py-0.5 rounded-full bg-violet-100 border border-violet-400 text-[10px] font-extrabold text-violet-800">
                                ⭐ Khu phố gốc
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-600 flex flex-wrap gap-3">
                            <span>👥 {rec.memberCount} thành viên ({rec.kidCount} con)</span>
                            <span>📅 Nhận/ngày: <b>{rec.dailyParentAllowance}⭐</b></span>
                            <span>🔒 Tối đa PH: <b>{rec.maxParentPoints ?? 500}⭐</b></span>
                            <span>
                              💰 PH:{' '}
                              {rec.parents.map((p) => `${p.name} (${p.points}⭐)`).join(' · ') || 'Chưa có'}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {confirmingReset ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleResetPasswords(rec.slug)}
                                className="btn btn-sm btn-accent"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                                <span>Xác nhận Reset (1111 / 1234)</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmResetSlug(null)}
                                className="btn btn-sm"
                                style={{ background: '#64748B' }}
                              >
                                Hủy
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => {
                                setConfirmDeleteSlug(null);
                                setConfirmResetSlug(rec.slug);
                              }}
                              className="btn btn-sm btn-accent"
                              title="Reset mật khẩu vào game về 1111 và Passcode phụ huynh về 1234"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Reset 2 Mật Khẩu</span>
                            </button>
                          )}

                          {confirmingDel ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={isBusy || isB2KS}
                                onClick={() => handleDeleteNeighborhood(rec.slug)}
                                className="btn btn-sm btn-danger"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Xóa vĩnh viễn</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteSlug(null)}
                                className="btn btn-sm"
                                style={{ background: '#64748B' }}
                              >
                                Hủy
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={isB2KS || isBusy}
                              onClick={() => {
                                setConfirmResetSlug(null);
                                setConfirmDeleteSlug(rec.slug);
                              }}
                              title={isB2KS ? 'Không thể xóa khu phố gốc hệ thống' : `Xóa khu phố ${rec.familyName}`}
                              className="btn btn-sm bg-rose-100 text-rose-700 border border-rose-300 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Xóa</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {tab === 'parent_points' && (
            <div className="space-y-3">
              <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-3 text-xs text-amber-950">
                Tại đây <b>Quản trị viên</b> có thể điều chỉnh <b>điểm ngân sách hàng ngày</b>, <b>điểm số tối đa của Phụ huynh</b> (mặc định 500⭐ — đạt mức này bố mẹ sẽ không nhận thêm điểm) và <b>số điểm hiện có</b> của tất cả Phụ huynh (Bố/Mẹ) trong từng khu phố.
              </div>

              {records.map((rec) => {
                const isBusy = savingSlug === rec.slug;
                const allowVal = allowanceDrafts[rec.slug] ?? String(rec.dailyParentAllowance ?? 100);
                const maxPtsVal = maxPointsDrafts[rec.slug] ?? String(rec.maxParentPoints ?? 500);
                return (
                  <div
                    key={rec.slug}
                    className="rounded-xl border-2 border-[#2C3E50] bg-white p-3.5 space-y-3 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-[#2C3E50]">
                          🏡 Gia đình {rec.familyName}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          ({rec.parents.length} Phụ huynh · {rec.kidCount} con)
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                          <span>📅 Nhận hàng ngày:</span>
                          <input
                            type="number"
                            min={0}
                            max={10000}
                            value={allowVal}
                            onChange={(e) =>
                              setAllowanceDrafts((prev) => ({ ...prev, [rec.slug]: e.target.value }))
                            }
                            className="w-20 px-2 py-1 rounded-lg border-2 border-[#2C3E50] bg-amber-50 text-xs font-extrabold text-center"
                          />
                          <span>⭐/ngày</span>
                        </label>
                        <label className="text-xs font-bold text-violet-900 flex items-center gap-1.5">
                          <span>🔒 Điểm tối đa PH:</span>
                          <input
                            type="number"
                            min={0}
                            max={999999}
                            value={maxPtsVal}
                            onChange={(e) =>
                              setMaxPointsDrafts((prev) => ({ ...prev, [rec.slug]: e.target.value }))
                            }
                            className="w-20 px-2 py-1 rounded-lg border-2 border-[#2C3E50] bg-violet-50 text-xs font-extrabold text-center"
                          />
                          <span>⭐</span>
                        </label>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleSaveParentAdjustment(rec)}
                          className="btn btn-sm btn-primary disabled:opacity-60"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{isBusy ? 'Đang lưu...' : 'Lưu khu phố này'}</span>
                        </button>
                      </div>
                    </div>

                    {rec.parents.length === 0 ? (
                      <div className="text-xs text-slate-400 italic">Khu phố này chưa có tài khoản Phụ huynh.</div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {rec.parents.map((p) => {
                          const draftStr = parentPointDrafts[rec.slug]?.[p.id] ?? String(p.points ?? 0);
                          return (
                            <div
                              key={p.id}
                              className="rounded-xl border border-slate-300 bg-slate-50 p-2.5 space-y-2"
                            >
                              <div className="flex items-center justify-between text-xs font-bold">
                                <span>
                                  {p.role === 'Bố' ? '👨' : '👩'} {p.name}{' '}
                                  <span className="text-slate-500 font-normal">({p.role})</span>
                                </span>
                                <span className="points-pill text-[11px]">Hiện tại: {p.points}⭐</span>
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => bumpParentDraftPoint(rec.slug, p.id, p.points, -50)}
                                  className="px-2 py-1 rounded bg-rose-500 text-white text-[11px] font-bold cursor-pointer"
                                >
                                  -50⭐
                                </button>
                                <button
                                  type="button"
                                  onClick={() => bumpParentDraftPoint(rec.slug, p.id, p.points, +50)}
                                  className="px-2 py-1 rounded bg-emerald-500 text-white text-[11px] font-bold cursor-pointer"
                                >
                                  +50⭐
                                </button>
                                <button
                                  type="button"
                                  onClick={() => bumpParentDraftPoint(rec.slug, p.id, p.points, +100)}
                                  className="px-2 py-1 rounded bg-emerald-600 text-white text-[11px] font-bold cursor-pointer"
                                >
                                  +100⭐
                                </button>
                                <input
                                  type="number"
                                  min={0}
                                  max={999999}
                                  value={draftStr}
                                  onChange={(e) =>
                                    setParentPointDrafts((prev) => ({
                                      ...prev,
                                      [rec.slug]: {
                                        ...(prev[rec.slug] || {}),
                                        [p.id]: e.target.value,
                                      },
                                    }))
                                  }
                                  className="flex-1 min-w-[72px] px-2 py-1 rounded-lg border-2 border-[#2C3E50] bg-white text-xs font-extrabold text-center"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'assets' && <AssetLibraryTab bridge={bridge} />}

          {tab === 'pet_codex' && (
            <div className="space-y-4">
              {/* 0. Clear Hunger & Bonus Rules Handbook */}
              <div className="rounded-xl border-2 border-[#2C3E50] bg-emerald-50 p-3.5 space-y-1.5">
                <h3 className="font-extrabold text-sm text-emerald-950">
                  📜 Cơ Chế Độ No &amp; Cộng Thưởng Sao Thú Cưng
                </h3>
                <ul className="text-xs text-emerald-900 space-y-1 list-disc pl-4 leading-relaxed">
                  <li>
                    <b>Độ no giảm chậm khi đồng hành:</b> Chỉ khi thú cưng đang được chọn <b>Đồng hành ngoài map</b> thì Độ no mới giảm dần theo tốc độ riêng của từng loài (~<b>0.45% – 0.70%/phút</b>). Nếu cất thú cưng vào túi, độ no sẽ giữ nguyên.
                  </li>
                  <li>
                    <b>Điều kiện kích hoạt cộng thưởng:</b> Thú cưng mang lại <b>+Tốc độ di chuyển</b> &amp; <b>+Điểm Sao</b> (khi hoàn thành việc nhà, bài tập, nhiệm vụ đồng đội, quiz Tiếng Anh, nói Tiếng Anh, ăn cơm, đi ngủ, nghỉ chân công viên, đọc truyện) chỉ khi đang <b>Đồng hành</b> và <b>Độ no &gt; 0%</b>.
                  </li>
                  <li>
                    <b>Khi Độ no về 0% (❗ ĐÓI!):</b> Thú cưng hiện cảnh báo đói trên đầu và <b>tạm ngưng toàn bộ cộng Tốc độ &amp; Sao thưởng</b> cho đến khi được cho ăn lại.
                  </li>
                </ul>
              </div>

              {/* 1. Rare Variant Probabilities & Accessories & Food */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-xl border-2 border-[#2C3E50] bg-amber-50 p-3 space-y-2">
                  <h4 className="font-bold text-xs text-amber-950">🎲 Tỉ Lệ Nở Màu Hiếm &amp; Giới Tính (50% ♂️ / 50% ♀️)</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {PET_VARIANT_DEFS.map((v) => (
                      <span
                        key={v.id}
                        className="px-2 py-1 rounded-lg bg-white border border-amber-300 text-[11px] font-bold"
                        style={{ color: v.badgeColor }}
                      >
                        {v.label}: {v.chancePercent}%
                      </span>
                    ))}
                  </div>
                  <h4 className="font-bold text-xs text-amber-950 pt-1">🍖 Thức Ăn Chăm Nuôi</h4>
                  <div className="grid grid-cols-2 gap-1.5">
                    {PET_FOOD_CATALOG.map((fd) => (
                      <div key={fd.id} className="rounded-lg bg-white border border-slate-200 px-2 py-1 text-[11px]">
                        <b>{fd.icon} {fd.name}</b> ({fd.price}⭐) • +{fd.xpGain}XP · +{fd.hungerGain}% no
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border-2 border-[#2C3E50] bg-pink-50 p-3 space-y-2">
                  <h4 className="font-bold text-xs text-pink-950">🎀 Phụ Kiện Thời Trang Thú Cưng</h4>
                  <div className="grid grid-cols-2 gap-1.5">
                    {PET_ACCESSORY_CATALOG.map((acc) => (
                      <div key={acc.id} className="rounded-lg bg-white border border-pink-200 px-2 py-1.5 text-[11px]">
                        <div className="font-bold">{acc.icon} {acc.name} · {acc.price}⭐</div>
                        <div className="text-[10px] text-slate-500 truncate">{acc.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. Full 10 Species x 5 Stages Encyclopedia */}
              <div className="rounded-xl border-2 border-[#2C3E50] bg-white p-3.5 space-y-3">
                <h3 className="font-bold text-sm text-[#2C3E50]">
                  📖 Từ Điển 10 Loài Thú Cưng &amp; 5 Giai Đoạn Tiến Hóa
                </h3>
                <div className="space-y-3">
                  {PET_SPECIES.map((sp) => (
                    <div
                      key={sp.id}
                      className="rounded-xl border-2 p-3 space-y-2"
                      style={{ borderColor: sp.primaryColor, background: `${sp.accentColor}40` }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="font-extrabold text-sm" style={{ color: sp.primaryColor }}>
                            {sp.name} ({sp.eggName})
                          </div>
                          <div className="text-[11px] text-slate-600">
                            {sp.desc} • Chỉ số: <b>{sp.statLabel}</b> • ⏳ Đói: <b>-{sp.hungerDecayPerMin}%/phút</b>
                          </div>
                        </div>
                        <span className="points-pill text-xs">🥚 {sp.eggPrice}⭐</span>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5">
                        {sp.stages.map((stInfo) => {
                          const svg = renderPetArtSVG(sp.id, stInfo.stage, 48);
                          return (
                            <div
                              key={stInfo.stage}
                              className="rounded-lg border border-slate-300 bg-white p-1.5 text-center space-y-0.5"
                            >
                              <div
                                className="mx-auto w-12 h-12 flex items-center justify-center"
                                dangerouslySetInnerHTML={{ __html: svg }}
                              />
                              <div className="text-[10px] font-extrabold text-slate-800 truncate">
                                GĐ{stInfo.stage}: {stInfo.title}
                              </div>
                              <div className="text-[9.5px] text-slate-500">
                                {stInfo.stage === 0
                                  ? 'Ấp 100%'
                                  : `⚡+${stInfo.speedBonus} · ⭐+${stInfo.starBonus}`}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'export_zip' && (
            <div className="space-y-3">
              <div className="rounded-xl border-2 border-[#2C3E50] bg-emerald-50 p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1 max-w-xl">
                  <h3 className="font-bold text-sm text-emerald-900">
                    📦 Xuất Toàn Bộ Package Hoàn Chỉnh Để Up Lên GitHub
                  </h3>
                  <p className="text-xs text-emerald-800">
                    Bao gồm toàn bộ mã nguồn, file cấu hình PWA, animals.json và bản build tĩnh sẵn sàng chạy trên GitHub Pages.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadGithubZip}
                  disabled={downloadingZip}
                  className="btn btn-sm disabled:opacity-60"
                  style={{ background: '#0F766E' }}
                >
                  <Download className="w-4 h-4" />
                  <span>{downloadingZip ? 'Đang đóng gói...' : 'Tải File ZIP GitHub'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
