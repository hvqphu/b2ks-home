// =========================================================================
// 1. CẤU HÌNH HỆ THỐNG, DỮ LIỆU GIA ĐÌNH & ĐỒNG BỘ FIREBASE REALTIME
// =========================================================================
const STORAGE_KEY = 'B2KS_FAMILY_WORLD_STATE_V2';
const DEVICE_LOCK_KEY = 'B2KS_LOCKED_MEMBER_ID_V2';
const SYNC_ROOM_KEY = 'B2KS_SYNC_ROOM_CODE_V2';
const SYNC_DB_URL_KEY = 'B2KS_SYNC_FIREBASE_URL_V2';
const DEFAULT_FIREBASE_URL = 'https://b2ks-home-default-rtdb.asia-southeast1.firebasedatabase.app';

let lockedDeviceMemberId = localStorage.getItem(DEVICE_LOCK_KEY) || '';
let syncRoomCode = (localStorage.getItem(SYNC_ROOM_KEY) || 'giadinh-b2ks').trim();
let syncFirebaseUrl = (localStorage.getItem(SYNC_DB_URL_KEY) || DEFAULT_FIREBASE_URL).trim().replace(/\/+$/, '');

function getDefaultState() {
    const today = new Date().toISOString().slice(0, 10);
    return {
        currentUserId: 'kem',
        lastDailyReset: today,
        house: { plotIndex: 1, style: 'modern' },
        members: [
            { id: 'bo', name: 'Bố', role: 'Bố', isParent: true, points: 9999, shirt: '#2C3E50', shirtStyle: 'polo', pants: '#1A252F', pantsStyle: 'jeans', hair: '#1C1C1C', skin: '#F5CBA7', outfit: 'suit', fashionSet: '', unlockedOutfits: ['suit', 'chef'], ownedFashionSets: [], roomWall: '#D6EAF8', roomUnlocked: true, roomDecor: [{ id: 'd_desk', icon: '💻', name: 'Bàn làm việc Laptop' }, { id: 'd_bookshelf', icon: '📚', name: 'Kệ sách trí tuệ' }], roomPlaced: { left: null, right: null }, x: 450, y: 1230, targetX: 450, targetY: 1230, dir: 1, walkFrame: 0, speech: '', speechTimer: 0, holdingDrink: '' },
            { id: 'me', name: 'Mẹ', role: 'Mẹ', isParent: true, points: 9999, shirt: '#E84393', shirtStyle: 'blouse', pants: '#6C5CE7', pantsStyle: 'skirt', hair: '#2D3436', skin: '#FADBD8', outfit: 'dress', fashionSet: '', unlockedOutfits: ['dress', 'chef'], ownedFashionSets: [], roomWall: '#FADBD8', roomUnlocked: true, roomDecor: [{ id: 'd_plant', icon: '🪴', name: 'Cây xanh phong thủy' }, { id: 'd_lamp', icon: '🛋️', name: 'Ghế lười thư giãn' }], roomPlaced: { left: null, right: null }, x: 540, y: 1230, targetX: 540, targetY: 1230, dir: -1, walkFrame: 0, speech: '', speechTimer: 0, holdingDrink: '' },
            { id: 'kem', name: 'Kem', role: 'Con trai', isParent: false, points: 120, shirt: '#0984E3', shirtStyle: 'hoodie', pants: '#2D3436', pantsStyle: 'shorts', hair: '#1E272E', skin: '#F5CBA7', outfit: 'normal', fashionSet: '', unlockedOutfits: ['normal'], ownedFashionSets: [], roomWall: '#D5F5E3', roomUnlocked: false, roomDecor: [{ id: 'd_globe', icon: '🌍', name: 'Quả địa cầu phát sáng' }], roomPlaced: { left: null, right: null }, x: 380, y: 1275, targetX: 380, targetY: 1275, dir: 1, walkFrame: 0, speech: '', speechTimer: 0, holdingDrink: '' },
            { id: 'soc', name: 'Sóc', role: 'Con gái', isParent: false, points: 110, shirt: '#FF7675', shirtStyle: 'tshirt', pants: '#FD79A8', pantsStyle: 'skirt', hair: '#3D3D3D', skin: '#FADBD8', outfit: 'normal', fashionSet: '', unlockedOutfits: ['normal'], ownedFashionSets: [], roomWall: '#FCF3CF', roomUnlocked: false, roomDecor: [{ id: 'd_bear', icon: '🧸', name: 'Gấu bông khổng lồ' }], roomPlaced: { left: null, right: null }, x: 610, y: 1275, targetX: 610, targetY: 1275, dir: -1, walkFrame: 0, speech: '', speechTimer: 0, holdingDrink: '' }
        ],
        tasks: [
            { id: 't1', type: 'chore', assigneeId: 'kem', title: 'Đánh răng & Dọn giường buổi sáng', reward: 15, status: 'pending', createdAt: Date.now() - 3600000, parentFile: null, submission: null, score: null },
            { id: 't2', type: 'chore', assigneeId: 'soc', title: 'Xếp gọn gấu bông và bàn học', reward: 15, status: 'pending', createdAt: Date.now() - 3600000, parentFile: null, submission: null, score: null },
            { id: 't3', type: 'coop', assigneeId: 'both', title: '🤝 Đồng đội: Cùng nhau dọn dẹp đồ chơi phòng khách', reward: 30, status: 'pending', createdAt: Date.now() - 3600000, coopProgress: { kem: false, soc: false }, parentFile: null, submission: null, score: null },
            { id: 't4', type: 'homework', assigneeId: 'kem', title: 'Hoàn thành phiếu Toán tư duy tuần này', reward: 30, status: 'pending', createdAt: Date.now() - 3600000, parentFile: null, submission: null, score: null }
        ],
        shopItems: [
            { id: 's1', category: 'voucher', icon: '📺', name: 'Thẻ Xem TV / YouTube +30 Phút', price: 25, desc: 'Gia hạn thêm 30 phút giải trí trên Smart TV phòng khách!' },
            { id: 's2', category: 'voucher', icon: '🍦', name: 'Phiếu Ăn Kem / Trà Sữa Cuối Tuần', price: 40, desc: 'Đưa phiếu cho Bố/Mẹ để đổi 1 ly kem hoặc trà sữa yêu thích.' },
            { id: 's3', category: 'voucher', icon: '🎡', name: 'Phiếu Đi Công Viên / Khu Vui Chơi', price: 100, desc: 'Phần thưởng đặc biệt cho cả tuần chăm ngoan!' },
            { id: 's4', category: 'outfit', icon: '🦸', name: 'Trang Phục Siêu Anh Hùng', price: 35, outfitCode: 'hero', desc: 'Áo choàng đỏ rực rỡ để mặc trong nhân vật.' },
            { id: 's5', category: 'outfit', icon: '👑', name: 'Vương Miện Hoàng Gia', price: 45, outfitCode: 'crown', desc: 'Vương miện vàng lấp lánh trên đầu.' },
            { id: 's6', category: 'decor', icon: '🔭', name: 'Kính Thiên Văn Ngắm Sao', price: 50, desc: 'Đồ trang trí đặt trong phòng riêng cực ngầu.' },
            { id: 's7', category: 'decor', icon: '🎹', name: 'Đàn Piano Mini Phòng Riêng', price: 60, desc: 'Tạo góc âm nhạc sang trọng trong phòng ngủ.' },
            { id: 's8', category: 'decor', icon: ' aquarium', name: 'Bể Cá Cảnh Đại Dương', price: 45, desc: 'Bể cá rực rỡ sắc màu đặt trong phòng.' }
        ],
        vouchers: [],
        dailyLimits: {
            kem: { englishCount: 0, tvSecondsUsed: 0, tvBonusSeconds: 0, arcadeDate: '', diningDate: '' },
            soc: { englishCount: 0, tvSecondsUsed: 0, tvBonusSeconds: 0, arcadeDate: '', diningDate: '' },
            bo: { englishCount: 0, tvSecondsUsed: 0, tvBonusSeconds: 0, arcadeDate: '', diningDate: '' },
            me: { englishCount: 0, tvSecondsUsed: 0, tvBonusSeconds: 0, arcadeDate: '', diningDate: '' }
        },
        familyChat: [
            { sender: 'Bố', text: 'Chào mừng cả nhà đến với Khu Phố B2KS! Hãy vào Phòng Thí Nghiệm, Sở Thú Ảo & Trung Tâm Xuyên Thế Giới khám phá nhé!', time: '08:00' }
        ],
        privateMessages: [
            { id: 'pm_welcome_1', fromId: 'bo', toId: 'kem', text: 'Kem ơi, con nhớ làm nhiệm vụ để đổi quà ở Trung Tâm Xuyên Thế Giới nhé!', time: '08:05', read: false },
            { id: 'pm_welcome_2', fromId: 'me', toId: 'soc', text: 'Sóc ơi, vào Sở Thú Ảo mở khóa động vật và học từ tiếng Anh mới nha con!', time: '08:06', read: false }
        ],
        labIngredients: {
            bo: ['crystal', 'gear', 'star_dust'],
            me: ['crystal', 'herb', 'water_drop'],
            kem: ['gear', 'crystal', 'spark'],
            soc: ['herb', 'star_dust', 'water_drop']
        },
        labCraftedItems: { bo: [], me: [], kem: [], soc: [] },
        // TÍNH NĂNG MỚI V2:
        worldExchangeItems: [
            { id: 'ex1', icon: '💵', name: 'Tiền Mặt Tiêu Vặt 10.000đ', realValue: '10.000 VNĐ', cost: 100, stock: 2 },
            { id: 'ex2', icon: '💰', name: 'Tiền Mặt Tiêu Vặt 20.000đ', realValue: '20.000 VNĐ', cost: 190, stock: 1 },
            { id: 'ex3', icon: '🎮', name: '15 Phút Chơi Game Tự Do', realValue: '15 Phút Giải Trí', cost: 40, stock: 3 },
            { id: 'ex4', icon: '🍦', name: '1 Cây Kem Tươi Tự Chọn', realValue: '1 Phần Kem Ngoài Đời', cost: 50, stock: 2 },
            { id: 'ex5', icon: '📖', name: '1 Quyển Truyện Tranh Mới', realValue: '1 Cuốn Sách/Truyện', cost: 120, stock: 1 }
        ],
        worldExchangeRequests: [],
        fleaMarketListings: [
            { id: 'fm_init_1', sellerId: 'bo', sellerName: 'Bố', itemType: 'decor', item: { id: 'd_init_fm1', icon: '🏆', name: 'Cúp Vô Địch Gia Đình B2KS' }, price: 35, createdAt: Date.now() - 1800000 }
        ],
        zooUnlocked: {
            bo: ['lion', 'dolphin'],
            me: ['panda', 'penguin'],
            kem: ['tiger'],
            soc: ['giraffe']
        },
        customEnglishBank: [
            { id: 'ceb_1', q: 'What does "savanna" mean in Vietnamese?', opts: ['Thảo nguyên', 'Đỉnh núi tuyết', 'Đáy đại dương', 'Sa mạc cát'], ans: 0 },
            { id: 'ceb_2', q: 'Which animal is the largest mammal on Earth?', opts: ['African Lion', 'Blue Whale', 'Emperor Penguin', 'Bengal Tiger'], ans: 1 }
        ],
        activityLogs: [
            { id: 'log_init', memberId: 'kem', memberName: 'Kem', action: 'Đăng nhập vào Thế Giới Gia Đình B2KS', timestamp: Date.now() - 600000, flaggedFast: false }
        ]
    };
}

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return getDefaultState();
        const parsed = JSON.parse(raw);
        const def = getDefaultState();
        const merged = { ...def, ...parsed };
        if (lockedDeviceMemberId && merged.members.some(m => m.id === lockedDeviceMemberId)) {
            merged.currentUserId = lockedDeviceMemberId;
        }
        return merged;
    } catch (e) {
        return getDefaultState();
    }
}

let state = loadState();
if (!Array.isArray(state.privateMessages)) state.privateMessages = [];
if (!state.labIngredients) state.labIngredients = { bo: [], me: [], kem: [], soc: [] };
if (!state.labCraftedItems) state.labCraftedItems = { bo: [], me: [], kem: [], soc: [] };
if (!Array.isArray(state.worldExchangeItems)) state.worldExchangeItems = getDefaultState().worldExchangeItems;
if (!Array.isArray(state.worldExchangeRequests)) state.worldExchangeRequests = [];
if (!Array.isArray(state.fleaMarketListings)) state.fleaMarketListings = [];
if (!state.zooUnlocked) state.zooUnlocked = { bo: [], me: [], kem: [], soc: [] };
if (!Array.isArray(state.customEnglishBank)) state.customEnglishBank = getDefaultState().customEnglishBank;
if (!Array.isArray(state.activityLogs)) state.activityLogs = [];

let savePushTimer = null;

function saveState(skipCloudPush = false) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.warn('Bộ nhớ trình duyệt đầy, hãy xóa bớt file đính kèm cũ.');
    }
    if (!skipCloudPush && syncRoomCode && syncFirebaseUrl) {
        clearTimeout(savePushTimer);
        savePushTimer = setTimeout(() => { pushFullStateToFirebase(false); }, 350);
    }
}

function addActivityLog(memberId, action, durationMs = null) {
    const m = state.members.find(x => x.id === memberId) || getCurrentUser();
    const flaggedFast = (durationMs !== null && durationMs < 30000);
    state.activityLogs.unshift({
        id: 'log_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        memberId: m.id,
        memberName: m.name,
        action: action,
        timestamp: Date.now(),
        durationSec: durationMs !== null ? Math.max(1, Math.round(durationMs / 1000)) : null,
        flaggedFast: flaggedFast
    });
    if (state.activityLogs.length > 150) state.activityLogs.length = 150;
}

// --- HỆ THỐNG ÂM THANH & GIỌNG ĐỌC TIẾNG ANH ---
let audioCtx = null;
let soundEnabled = true;

function playSound(type) {
    if (!soundEnabled) return;
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        if (type === 'coin') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(660, now);
            osc.frequency.exponentialRampToValueAtTime(1046, now + 0.14);
            gain.gain.setValueAtTime(0.16, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
            osc.start(now); osc.stop(now + 0.16);
        } else if (type === 'success') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(523.25, now);
            osc.frequency.setValueAtTime(659.25, now + 0.08);
            osc.frequency.setValueAtTime(783.99, now + 0.16);
            osc.frequency.setValueAtTime(1046.5, now + 0.24);
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.38);
            osc.start(now); osc.stop(now + 0.38);
        } else if (type === 'pop') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(420, now);
            osc.frequency.exponentialRampToValueAtTime(620, now + 0.07);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
            osc.start(now); osc.stop(now + 0.08);
        } else if (type === 'error') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.linearRampToValueAtTime(160, now + 0.18);
            gain.gain.setValueAtTime(0.14, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            osc.start(now); osc.stop(now + 0.2);
        }
    } catch (e) {}
}

function speakEnglishText(text) {
    if (!('speechSynthesis' in window)) {
        showToast('🔇 Trình duyệt chưa hỗ trợ giọng đọc TTS.');
        return;
    }
    try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = 'en-US';
        utter.rate = 0.92;
        window.speechSynthesis.speak(utter);
    } catch (e) {}
}

function triggerFireworks() {
    if (typeof confetti === 'function') {
        confetti({ particleCount: 70, spread: 65, origin: { y: 0.65 } });
    }
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    document.getElementById('sound-btn').textContent = soundEnabled ? '🔊' : '🔇';
    showToast(soundEnabled ? '🔊 Đã bật âm thanh' : '🔇 Đã tắt âm thanh');
}

function checkDailyReset() {
    const today = new Date().toISOString().slice(0, 10);
    if (state.lastDailyReset !== today) {
        state.lastDailyReset = today;
        Object.keys(state.dailyLimits).forEach(uid => {
            state.dailyLimits[uid].englishCount = 0;
            state.dailyLimits[uid].tvSecondsUsed = 0;
        });
        saveState();
    }
}

function getCurrentUser() {
    return state.members.find(m => m.id === state.currentUserId) || state.members[0];
}

function ensureUserDaily(uid) {
    if (!state.dailyLimits[uid]) {
        state.dailyLimits[uid] = { englishCount: 0, tvSecondsUsed: 0, tvBonusSeconds: 0, arcadeDate: '', diningDate: '' };
    }
    return state.dailyLimits[uid];
}

// =========================================================================
// 2. KHỞI TẠO & CẬP NHẬT GIAO DIỆN HUD / MODAL
// =========================================================================
let toastTimeout = null;
function showToast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.style.display = 'block';
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => { el.style.display = 'none'; }, 3400);
}

function openModal(id) {
    playSound('pop');
    document.getElementById(id).style.display = 'flex';
    if (id === 'tasks-modal') renderTasksModal();
    if (id === 'shop-modal') renderShopModal();
    if (id === 'fashion-modal') renderFashionModal();
    if (id === 'cafe-modal') renderCafeModal();
    if (id === 'lab-modal') renderLabModal();
    if (id === 'bag-modal') renderBagModal();
    if (id === 'school-modal') renderSchoolModal();
    if (id === 'arcade-modal') renderArcadeModal();
    if (id === 'tv-modal') openTvModal();
    if (id === 'donate-modal') renderDonateModal();
    if (id === 'custom-modal') renderCustomModal();
    if (id === 'sync-modal') renderSyncModal();
    if (id === 'exchange-modal') renderExchangeModal();
    if (id === 'fleamarket-modal') renderFleaMarketModal();
    if (id === 'zoo-modal') renderZooModal();
    if (id === 'parent-dashboard-modal') renderParentDashboardModal();
}

function closeModal(id) {
    playSound('pop');
    document.getElementById(id).style.display = 'none';
}

function updateHUD() {
    const user = getCurrentUser();
    const sel = document.getElementById('member-select');
    sel.innerHTML = state.members.map(m => `<option value="${m.id}" ${m.id === user.id ? 'selected' : ''}>${m.name} (${m.role})</option>`).join('');

    document.getElementById('hud-points').textContent = user.isParent ? '∞ ⭐ (Ngân sách)' : `${user.points} ⭐`;
    const voucherCount = state.vouchers.filter(v => v.ownerId === user.id && !v.used).length;
    const labIngCount = Object.values(state.labIngredients[user.id] || []).length;
    const labItemCount = (state.labCraftedItems[user.id] || []).length;
    document.getElementById('bag-count').textContent = voucherCount + user.roomDecor.length + labIngCount + labItemCount;

    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('time-text').textContent = `${hh}:${mm}`;
    const h = now.getHours();
    document.getElementById('time-icon').textContent = (h >= 6 && h < 17) ? '☀️' : (h >= 17 && h < 19 ? '🌇' : '🌙');

    const unreadCount = (state.privateMessages || []).filter(m => m.toId === user.id && !m.read).length;
    const phoneBadge = document.getElementById('phone-unread-badge');
    if (phoneBadge) {
        if (unreadCount > 0) {
            phoneBadge.style.display = 'inline-flex';
            phoneBadge.textContent = unreadCount;
        } else {
            phoneBadge.style.display = 'none';
        }
    }

    const parentBtn = document.getElementById('parent-dash-btn');
    const parentBadge = document.getElementById('parent-pending-badge');
    if (parentBtn) {
        parentBtn.style.display = user.isParent ? 'inline-flex' : 'none';
        const pendingEx = (state.worldExchangeRequests || []).filter(r => r.status === 'pending').length;
        const pendingHw = (state.tasks || []).filter(t => t.status === 'submitted').length;
        const totalPending = pendingEx + pendingHw;
        if (parentBadge) {
            if (totalPending > 0) {
                parentBadge.style.display = 'inline-flex';
                parentBadge.textContent = totalPending;
            } else {
                parentBadge.style.display = 'none';
            }
        }
    }
    updatePrivateRoomToolbar();
}

function switchUser(uid) {
    state.currentUserId = uid;
    saveState();
    updateHUD();
    const u = getCurrentUser();
    showToast(`👋 Đã chuyển sang điều khiển: ${u.name}`);
}
