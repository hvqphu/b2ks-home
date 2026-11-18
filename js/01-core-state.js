/* =========================================================================
           1. AUDIO ENGINE (8-BIT BGM & SFX)
           ========================================================================= */
        const AudioEngine = {
            ctx: null,
            isMuted: false,
            bgmInterval: null,
            noteIndex: 0,
            melody: [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880.00, 698.46, 523.25, 587.33, 659.25, 783.99, 659.25, 523.25],

            init() {
                if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
                if (this.ctx.state === 'suspended') this.ctx.resume();
                if (!this.bgmInterval) this.startBGM();
            },
            playTone(freq, type = 'sine', duration = 0.12, vol = 0.07) {
                if (this.isMuted || !this.ctx) return;
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
            },
            playCoin() {
                this.playTone(987.77, 'square', 0.1, 0.06);
                setTimeout(() => this.playTone(1318.51, 'square', 0.2, 0.06), 80);
            },
            playClick() { this.playTone(440, 'triangle', 0.07, 0.07); },
            playSuccess() {
                [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
                    setTimeout(() => this.playTone(f, 'triangle', 0.14, 0.07), i * 85);
                });
            },
            playError() { this.playTone(180, 'sawtooth', 0.22, 0.08); },
            startBGM() {
                this.bgmInterval = setInterval(() => {
                    if (!this.isMuted && this.ctx && this.ctx.state === 'running') {
                        const freq = this.melody[this.noteIndex % this.melody.length];
                        this.playTone(freq, 'triangle', 0.2, 0.02);
                        this.noteIndex++;
                    }
                }, 430);
            }
        };

        function startAudioOnce() { AudioEngine.init(); }
        function toggleAudio() {
            AudioEngine.init();
            AudioEngine.isMuted = !AudioEngine.isMuted;
            document.getElementById('audio-toggle-btn').innerText = AudioEngine.isMuted ? '🔇 Tắt' : '🔊 Nhạc';
        }

        /* =========================================================================
           2. REAL-TIME DAY/NIGHT CYCLE & TIMESTAMP HELPERS
           ========================================================================= */
        function getRealTimeLighting() {
            const now = new Date();
            const h = now.getHours() + now.getMinutes() / 60;
            const hh = String(now.getHours()).padStart(2, '0');
            const mm = String(now.getMinutes()).padStart(2, '0');
            const timeStr = `${hh}:${mm}`;

            if (h >= 5 && h < 7) {
                return {
                    phase: 'dawn',
                    label: `🌅 ${timeStr}`,
                    skyTop: '#F39C12',
                    skyBottom: '#FAD7A0',
                    overlayAlpha: 0.15,
                    overlayColor: 'rgba(243, 156, 18, 0.16)',
                    isNight: false
                };
            }
            if (h >= 7 && h < 17) {
                return {
                    phase: 'day',
                    label: `☀️ ${timeStr}`,
                    skyTop: '#5DADE2',
                    skyBottom: '#D6EAF8',
                    overlayAlpha: 0,
                    overlayColor: 'rgba(0,0,0,0)',
                    isNight: false
                };
            }
            if (h >= 17 && h < 19) {
                return {
                    phase: 'sunset',
                    label: `🌇 ${timeStr}`,
                    skyTop: '#8E44AD',
                    skyBottom: '#E67E22',
                    overlayAlpha: 0.24,
                    overlayColor: 'rgba(142, 68, 173, 0.24)',
                    isNight: true
                };
            }
            return {
                phase: 'night',
                label: `🌙 ${timeStr}`,
                skyTop: '#0B132B',
                skyBottom: '#1C2541',
                overlayAlpha: 0.45,
                overlayColor: 'rgba(11, 19, 43, 0.46)',
                isNight: true
            };
        }

        function formatTimestamp(ts) {
            if (!ts) return '';
            const d = new Date(ts);
            const hh = String(d.getHours()).padStart(2, '0');
            const mm = String(d.getMinutes()).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const mon = String(d.getMonth() + 1).padStart(2, '0');
            return `${hh}:${mm} - ${day}/${mon}/${d.getFullYear()}`;
        }

        /* =========================================================================
           3. WORLD CONSTANTS & INITIAL STATE
           ========================================================================= */
        const MAX_PARENT_POINTS = 500;
        const DAILY_PARENT_ALLOWANCE = 150;

        const STREET_WORLD = { width: 2200, height: 1560 };
        const HOUSE_WORLD = { width: 1120, height: 800 };

        const PLOTS = [
            { x: 420, y: 340, label: 'Lô số 1 (Khu Bắc)' },
            { x: 840, y: 340, label: 'Lô số 2 (Trung tâm)' },
            { x: 420, y: 860, label: 'Lô số 3 (Đại lộ Tây)' }
        ];

        const SHOP_CATALOG = [
            { id: 'd_plant', category: 'decor', name: 'Chậu cây Monstera', icon: '🪴', price: 25, desc: 'Chậu gốm trắng & cây lá xẻ xanh mướt' },
            { id: 'd_bookshelf', category: 'decor', name: 'Giá sách Gỗ 3 Tầng', icon: '📚', price: 40, desc: 'Kệ gỗ đầy sách màu sắc cho góc học tập' },
            { id: 'd_bear', category: 'decor', name: 'Gấu bông Khổng lồ', icon: '🧸', price: 35, desc: 'Chú gấu bông nâu mềm mại ngồi góc phòng' },
            { id: 'd_pc', category: 'decor', name: 'Bàn học & Máy tính', icon: '🖥️', price: 60, desc: 'Bàn học gỗ kèm màn hình PC, bàn phím & ghế' },
            { id: 'd_guitar', category: 'decor', name: 'Đàn Guitar Gỗ Acoustic', icon: '🎸', price: 45, desc: 'Cây đàn guitar gỗ đặt trên giá đỡ nghệ thuật' },
            { id: 'd_aquarium', category: 'decor', name: 'Bể cá Thủy Sinh Mini', icon: '🐠', price: 50, desc: 'Bể kính trong suốt có cá vàng & rong biển' },
            { id: 'tv_30min', category: 'tv_card', name: 'Thẻ Xem YouTube (+30 phút)', icon: '📺', price: 35, desc: 'Nạp thêm 30 phút xem Tivi YouTube trong ngày' },
            { id: 'v_icecream', category: 'voucher', name: 'Phiếu Ăn Kem Tự Chọn', icon: '🍦', price: 50, desc: 'Đổi 1 ly kem mát lạnh cuối tuần' },
            { id: 'v_movie', category: 'voucher', name: 'Phiếu Xem Phim Rạp', icon: '🎬', price: 100, desc: 'Cùng gia đình đi xem phim' },
            { id: 'v_game', category: 'voucher', name: 'Thêm 30 phút Chơi Game', icon: '🎮', price: 40, desc: 'Thẻ đặc quyền giải trí' },
            { id: 'v_dish', category: 'voucher', name: 'Thẻ Miễn Rửa Bát 1 Lần', icon: '🍽️', price: 60, desc: 'Chuyển lượt rửa bát cho Bố/Mẹ' }
        ];

        const FASHION_CATALOG = [
            { id: 'f_set_royal', sub: 'set', name: 'Set Hoàng Tử / Công Chúa', icon: '🤴', price: 75, shirtColor: '#8E44AD', shirtPattern: 'vest', pantsColor: '#2C3E50', pantsStyle: 'pants', desc: 'Gồm: Áo gile tím cổ trắng hoàng gia + Quần tây dài xanh than lịch lãm' },
            { id: 'f_set_princess', sub: 'set', name: 'Set Váy Hồng Dạ Hội', icon: '👗', price: 75, shirtColor: '#E91E63', shirtPattern: 'heart', pantsColor: '#D81B60', pantsStyle: 'skirt', desc: 'Gồm: Áo hồng in trái tim + Chân váy xòe xếp ly hồng đậm nữ tính' },
            { id: 'f_set_sport', sub: 'set', name: 'Set Thể Thao Năng Động', icon: '⚽', price: 55, shirtColor: '#E74C3C', shirtPattern: 'stripe', pantsColor: '#1F618D', pantsStyle: 'shorts', desc: 'Gồm: Áo thun thể thao đỏ kẻ ngang trắng + Quần short xanh dương thoáng mát' },
            { id: 'f_set_sailor', sub: 'set', name: 'Set Thủy Thủ Hải Quân', icon: '⛵', price: 65, shirtColor: '#16A085', shirtPattern: 'collar', pantsColor: '#2C3E50', pantsStyle: 'pants', desc: 'Gồm: Áo cổ thủy thủ xanh ngọc bích + Quần dài hải quân chỉnh tề' },
            { id: 'f_set_astronaut', sub: 'set', name: 'Set Phi Hành Gia Sao Vàng', icon: '🚀', price: 85, shirtColor: '#F39C12', shirtPattern: 'star', pantsColor: '#5D6D7E', pantsStyle: 'pants', desc: 'Gồm: Áo cam in ngôi sao vàng nổi bật + Quần du hành vũ trụ xám bạc' },
            { id: 'o_crown', sub: 'hat', name: 'Vương miện Hoàng gia', icon: '👑', price: 80, desc: 'Vương miện vàng kim lấp lánh đội trên đầu, hợp với Set Hoàng Gia' },
            { id: 'o_cap', sub: 'hat', name: 'Mũ lưỡi trai Thể thao', icon: '🧢', price: 30, desc: 'Mũ lưỡi trai xanh cá tính dành cho các buổi dạo phố & chơi thể thao' },
            { id: 'o_tophat', sub: 'hat', name: 'Mũ Ảo Thuật Gia', icon: '🎩', price: 45, desc: 'Mũ chóp cao màu đen cổ điển phong cách quý tộc' },
            { id: 'o_ribbon', sub: 'hat', name: 'Nơ Hồng Dễ Thương', icon: '🎀', price: 35, desc: 'Nơ ruy băng hồng cài tóc cực kỳ xinh xắn' },
            { id: 'o_glasses', sub: 'acc', name: 'Kính râm Thời trang', icon: '🕶️', price: 35, desc: 'Kính mát gọng đen sành điệu cho những ngày nắng đẹp' },
            { id: 'o_scarf', sub: 'acc', name: 'Khăn choàng Ấm áp', icon: '🧣', price: 30, desc: 'Khăn len đỏ giữ ấm cổ khi dạo phố buổi tối' },
            { id: 'o_backpack', sub: 'acc', name: 'Ba lô Khám phá', icon: '🎒', price: 40, desc: 'Ba lô đi học & dã ngoại năng động cho cả nhà' }
        ];

        function findAnyCatalogItem(id) {
            if (!id) return null;
            const shopHit = SHOP_CATALOG.find(i => i.id === id) || FASHION_CATALOG.find(i => i.id === id);
            if (shopHit) return shopHit;
            if (typeof state !== 'undefined' && Array.isArray(state.members)) {
                for (const m of state.members) {
                    if (Array.isArray(m.customLabItems)) {
                        const labHit = m.customLabItems.find(x => x.id === id);
                        if (labHit) return labHit;
                    }
                }
            }
            return null;
        }

        let zoomLevel = 1.0;
        function changeZoom(delta) {
            AudioEngine.playClick();
            zoomLevel = Math.max(0.65, Math.min(1.65, +(zoomLevel + delta).toFixed(2)));
            document.getElementById('zoom-level-btn').innerText = Math.round(zoomLevel * 100) + '%';
        }
        function resetZoom() {
            AudioEngine.playClick();
            zoomLevel = 1.0;
            document.getElementById('zoom-level-btn').innerText = '100%';
        }

        const HAIR_STYLES_VISUAL = [
            { id: 'short', label: 'Tóc ngắn' },
            { id: 'spiky', label: 'Tóc vuốt' },
            { id: 'long', label: 'Tóc dài' },
            { id: 'pigtails', label: 'Buộc 2 bên' }
        ];

        const HAIR_COLORS = ['#1A252F', '#4E342E', '#8D6E63', '#D4AC0D', '#E67E22', '#C0392B', '#8E44AD', '#2980B9'];

        const SHIRT_VISUAL_OPTIONS = [
            { id: 'blue_polo', label: 'Áo Polo Xanh', color: '#2980B9', pattern: 'collar' },
            { id: 'pink_tee', label: 'Áo Thun Hồng', color: '#E91E63', pattern: 'heart' },
            { id: 'green_hoodie', label: 'Áo Hoodie Lá', color: '#27AE60', pattern: 'stripe' },
            { id: 'orange_star', label: 'Áo Ngôi Sao', color: '#F39C12', pattern: 'star' },
            { id: 'purple_vest', label: 'Áo Gile Tím', color: '#8E44AD', pattern: 'vest' },
            { id: 'red_sport', label: 'Áo Thể Thao', color: '#E74C3C', pattern: 'stripe' },
            { id: 'teal_sailor', label: 'Áo Thủy Thủ', color: '#16A085', pattern: 'collar' },
            { id: 'navy_suit', label: 'Áo Vest Lịch Lãm', color: '#34495E', pattern: 'vest' }
        ];

        const PANTS_VISUAL_OPTIONS = [
            { id: 'jeans_dark', label: 'Quần Jeans Đậm', color: '#2C3E50', style: 'pants' },
            { id: 'jeans_blue', label: 'Quần Jeans Xanh', color: '#1F618D', style: 'pants' },
            { id: 'skirt_purple', label: 'Chân Váy Tím', color: '#8E44AD', style: 'skirt' },
            { id: 'skirt_red', label: 'Chân Váy Đỏ', color: '#C0392B', style: 'skirt' },
            { id: 'shorts_teal', label: 'Quần Short Lửng', color: '#117864', style: 'shorts' },
            { id: 'khaki_gold', label: 'Quần Kaki Vàng', color: '#B9770E', style: 'pants' },
            { id: 'skirt_pink', label: 'Chân Váy Hồng', color: '#D81B60', style: 'skirt' },
            { id: 'slacks_grey', label: 'Quần Tây Xám', color: '#5D6D7E', style: 'pants' }
        ];

        const DEFAULT_FIREBASE_URL = 'https://b2ks-home-default-rtdb.asia-southeast1.firebasedatabase.app';

        let deviceConfig = JSON.parse(localStorage.getItem('b2ks_v16_device')) || {
            currentMemberId: 'dad',
            isLockedToMember: false,
            firebaseUrl: DEFAULT_FIREBASE_URL
        };
        if (!deviceConfig.firebaseUrl) {
            deviceConfig.firebaseUrl = DEFAULT_FIREBASE_URL;
        }

        function saveDeviceConfig() {
            localStorage.setItem('b2ks_v16_device', JSON.stringify(deviceConfig));
        }

        let state = {
            currentUserId: deviceConfig.currentMemberId || 'dad',
            parentPin: localStorage.getItem('b2ks_parent_pin') || '1234',
            parentPinUpdatedAt: parseInt(localStorage.getItem('b2ks_parent_pin_ts') || '0', 10),
            updatedAt: Date.now(),
            familyMessages: [],
            house: { plotIndex: 1, style: 'modern' },
            members: [
                {
                    id: 'dad', name: 'Bố', role: 'Bố', points: 200,
                    hairStyle: 'short', hairColor: '#2C3E50',
                    shirtColor: '#2980B9', shirtPattern: 'collar',
                    pantsColor: '#34495E', pantsStyle: 'pants',
                    outfit: '', inventory: ['d_pc'], vouchers: [],
                    roomUnlocked: false, roomWall: '#D6EAF8',
                    roomDecor: [{ id: 'd_pc', icon: '💻', x: 650, y: 470 }],
                    scene: 'neighborhood', x: 840, y: 435, dir: 'down',
                    speech: null
                },
                {
                    id: 'mom', name: 'Mẹ', role: 'Mẹ', points: 200,
                    hairStyle: 'long', hairColor: '#5D4037',
                    shirtColor: '#E91E63', shirtPattern: 'heart',
                    pantsColor: '#8E44AD', pantsStyle: 'skirt',
                    outfit: '', inventory: ['d_plant'], vouchers: [],
                    roomUnlocked: true, roomWall: '#FADBD8',
                    roomDecor: [{ id: 'd_plant', icon: '🪴', x: 960, y: 470 }],
                    scene: 'neighborhood', x: 795, y: 445, dir: 'down',
                    speech: null
                },
                {
                    id: 'kid1', name: 'Kem', role: 'Con gái', points: 40,
                    hairStyle: 'pigtails', hairColor: '#4E342E',
                    shirtColor: '#F39C12', shirtPattern: 'star',
                    pantsColor: '#C0392B', pantsStyle: 'skirt',
                    outfit: '', inventory: [], vouchers: [],
                    roomUnlocked: false, roomWall: '#FADBD8',
                    roomDecor: [{ id: 'd_bookshelf', icon: '📚', x: 240, y: 230 }],
                    scene: 'neighborhood', x: 890, y: 445, dir: 'left',
                    speech: null
                },
                {
                    id: 'kid2', name: 'Sóc', role: 'Con trai', points: 40,
                    hairStyle: 'spiky', hairColor: '#1A252F',
                    shirtColor: '#27AE60', shirtPattern: 'stripe',
                    pantsColor: '#1F618D', pantsStyle: 'shorts',
                    outfit: '', inventory: [], vouchers: [],
                    roomUnlocked: false, roomWall: '#D5F5E3',
                    roomDecor: [{ id: 'd_bear', icon: '🧸', x: 860, y: 230 }],
                    scene: 'neighborhood', x: 930, y: 445, dir: 'left',
                    speech: null
                }
            ],
            tasks: [
                {
                    id: 1, type: 'chore', title: 'Dọn dẹp đồ chơi phòng khách',
                    creatorId: 'mom', assigneeId: 'kid1', reward: 15,
                    status: 'pending', createdAt: Date.now() - 3600000, completedAt: null,
                    parentFile: null, parentFileName: '',
                    childFile: null, childFileName: '', childNote: '', grade: null
                },
                {
                    id: 2, type: 'homework', title: 'Viết 3 câu tiếng Anh về ngôi nhà của em',
                    creatorId: 'dad', assigneeId: 'kid2', reward: 25,
                    status: 'pending', createdAt: Date.now() - 1800000, completedAt: null,
                    parentFile: null, parentFileName: '',
                    childFile: null, childFileName: '', childNote: '', grade: null
                }
            ],
            chatHistory: [
                { sender: 'Hệ thống', text: 'Chào mừng gia đình B2KS! Hãy gõ tiếng Anh để hiện bong bóng thoại và nhận +5⭐!', isEng: false }
            ],
            lastDailyReset: new Date().toDateString()
        };

        function loadGame() {
            const saved = localStorage.getItem('b2ks_daily_routines_rpg_v16');
            const localPin = localStorage.getItem('b2ks_parent_pin');
            const localPinTs = parseInt(localStorage.getItem('b2ks_parent_pin_ts') || '0', 10);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    state = { ...state, ...parsed };
                    const parsedPinTs = parsed.parentPinUpdatedAt || 0;
                    if (localPin && /^\d{4}$/.test(localPin) && localPinTs >= parsedPinTs) {
                        state.parentPin = localPin;
                        state.parentPinUpdatedAt = localPinTs;
                    }
                    if (!state.parentPin || !/^\d{4}$/.test(String(state.parentPin))) state.parentPin = '1234';
                    localStorage.setItem('b2ks_parent_pin', String(state.parentPin));
                    if (!Array.isArray(state.familyMessages)) state.familyMessages = [];
                    pruneExpiredFamilyMessages();
                    if (state.house && (state.house.plotIndex < 0 || state.house.plotIndex >= PLOTS.length)) {
                        state.house.plotIndex = 1;
                    }
                    if (Array.isArray(state.members)) {
                        state.members.forEach(m => {
                            if (m.scene === 'neighborhood') {
                                m.x = Math.max(60, Math.min(STREET_WORLD.width - 60, m.x || 840));
                                m.y = Math.max(280, Math.min(STREET_WORLD.height - 60, m.y || 435));
                            }
                        });
                    }
                } catch (e) { console.error(e); }
            }
            if (deviceConfig.currentMemberId && state.members.some(m => m.id === deviceConfig.currentMemberId)) {
                state.currentUserId = deviceConfig.currentMemberId;
            }
            checkDailyAllowance();
            const cur = getCurrentUser();
            if (cur && cur.scene === 'house') {
                const startRoom = getRoomAtPosition(cur.x, cur.y);
                if (startRoom && startRoom.ownerIds && startRoom.ownerIds.length > 0) {
                    activePrivateRoomId = startRoom.id;
                    cur.scene = 'private_room';
                    cur.privateRoomId = startRoom.id;
                    cur.x = 380;
                    cur.y = 285;
                }
            } else if (cur && cur.scene === 'private_room') {
                activePrivateRoomId = cur.privateRoomId || getMemberPrivateRoom(cur)?.id || null;
            }
            syncPrivateRoomToolbar();
        }

        function saveGame(pushCloud = true) {
            try {
                state.updatedAt = Date.now();
                localStorage.setItem('b2ks_daily_routines_rpg_v16', JSON.stringify(state));
                if (pushCloud && deviceConfig.firebaseUrl) syncToFirebase();
            } catch (e) {
                showToast('⚠️ Bộ nhớ trình duyệt đầy, hãy dùng ảnh dung lượng nhẹ hơn.');
            }
        }

        // ==================== PASSCODE PIN & DEVICE LOCK ====================
        let pendingParentAction = null;
        let enteredPin = '';

        function requestParentAccess(callback) {
            const m = getCurrentUser();
            const isKid = !isParent(m);
            if (deviceConfig.isLockedToMember || isKid) {
                pendingParentAction = callback;
                enteredPin = '';
                updatePinDisplay();
                const resetBox = document.getElementById('pin-reset-container');
                if (resetBox) {
                    resetBox.style.display = (!isKid && !deviceConfig.isLockedToMember) ? 'block' : 'none';
                }
                openModal('pin-modal');
            } else {
                callback();
            }
        }

        function pressPinDigit(d) {
            if (enteredPin.length >= 4) return;
            enteredPin += String(d);
            updatePinDisplay();
            if (enteredPin.length === 4) {
                setTimeout(verifyPin, 120);
            }
        }

        function clearPinDigit() {
            enteredPin = enteredPin.slice(0, -1);
            updatePinDisplay();
        }

        function updatePinDisplay() {
            const box = document.getElementById('pin-display-box');
            if (box) box.textContent = '●'.repeat(enteredPin.length) + '_'.repeat(4 - enteredPin.length);
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

        function resetPinToDefault() {
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
        }

        function toggleDeviceLock() {
            deviceConfig.isLockedToMember = !deviceConfig.isLockedToMember;
            saveDeviceConfig();
            lastHudSignature = '';
            updateHUD();
            renderFamilySyncModal();
            const u = getCurrentUser();
            showToast(deviceConfig.isLockedToMember
                ? `🔒 Đã khóa cố định máy này cho ${u.name}!`
                : '🔓 Đã mở khóa chuyển đổi nhân vật trên máy này');
        }

        function changeParentPin() {
            const inp = document.getElementById('new-pin-input');
            const val = (inp ? inp.value : '').trim();
            if (!/^\d{4}$/.test(val)) {
                AudioEngine.playError();
                return showToast('⚠️ Vui lòng nhập đúng 4 chữ số!');
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
        }

        function renderFamilySyncModal() {
            const u = getCurrentUser();
            document.getElementById('sync-cur-member-label').textContent = `${u.name} (${u.role})`;
            const pinLbl = document.getElementById('current-pin-label');
            if (pinLbl) {
                pinLbl.textContent = isParent(u) ? `(Đang đặt: ${state.parentPin || '1234'})` : '(Đã ẩn)';
            }
            document.getElementById('firebase-url-input').value = deviceConfig.firebaseUrl || '';
            const btnLock = document.getElementById('btn-toggle-device-lock');
            if (deviceConfig.isLockedToMember) {
                btnLock.textContent = `🔓 Tắt Khóa Máy (Đang khóa cho ${u.name})`;
                btnLock.className = 'btn btn-accent';
            } else {
                btnLock.textContent = `🔒 Bật Khóa Máy Cố Định Cho ${u.name}`;
                btnLock.className = 'btn btn-danger';
            }
            const statusEl = document.getElementById('firebase-status-text');
            statusEl.textContent = deviceConfig.firebaseUrl
                ? '🟢 Đang kết nối Firebase: Tự động đồng bộ 4 máy mỗi 2.5 giây'
                : '⚪ Chế độ Offline: Dữ liệu đang lưu trên máy này';
        }

        function saveFirebaseUrl() {
            let url = document.getElementById('firebase-url-input').value.trim();
            if (url && !url.startsWith('http')) url = 'https://' + url;
            url = url.replace(/\/+$/, '');
            deviceConfig.firebaseUrl = url;
            saveDeviceConfig();
            renderFamilySyncModal();
            if (url) {
                syncToFirebase();
                showToast('☁️ Đã lưu link Firebase! Đang đồng bộ 4 máy...');
            } else {
                showToast('⚪ Đã ngắt kết nối Firebase.');
            }
        }

        function exportFamilyCode() {
            const codeStr = btoa(unescape(encodeURIComponent(JSON.stringify(state))));
            if (navigator.clipboard) {
                navigator.clipboard.writeText(codeStr).then(() => showToast('📋 Đã copy Mã Dữ Liệu Gia Đình!'));
            } else {
                prompt('Copy mã bên dưới:', codeStr);
            }
        }

        function importFamilyCode() {
            const raw = document.getElementById('import-code-input').value.trim();
            if (!raw) return;
            try {
                const parsed = JSON.parse(decodeURIComponent(escape(atob(raw))));
                if (parsed && parsed.members) {
                    const keepId = deviceConfig.currentMemberId;
                    state = parsed;
                    state.currentUserId = keepId;
                    saveGame(false);
                    lastHudSignature = '';
                    updateHUD();
                    showToast('✅ Đã nạp dữ liệu gia đình thành công!');
                }
            } catch (e) {
                showToast('❌ Mã dữ liệu không hợp lệ!');
            }
        }

        // ==================== FIREBASE 4-DEVICE REALTIME SYNC ====================
        function syncToFirebase() {
            if (!deviceConfig.firebaseUrl) return;
            const cur = getCurrentUser();
            fetch(deviceConfig.firebaseUrl + '/b2ks_family_rpg_v16/shared.json', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(state)
            }).catch(() => {});

            fetch(deviceConfig.firebaseUrl + `/b2ks_family_rpg_v16/live_pos/${cur.id}.json`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    x: Math.round(cur.x),
                    y: Math.round(cur.y),
                    dir: cur.dir || 'down',
                    scene: cur.scene || 'neighborhood',
                    privateRoomId: cur.privateRoomId || null,
                    speech: cur.speech || null,
                    ts: Date.now()
                })
            }).catch(() => {});
        }

        function pushArcadeRoomToFirebase(roomObj) {
            arcadeRoomState = roomObj;
            localStorage.setItem('b2ks_arcade_online_room', JSON.stringify(roomObj));
            if (!deviceConfig.firebaseUrl) return;
            fetch(deviceConfig.firebaseUrl + '/b2ks_family_rpg_v16/arcade_room.json', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(roomObj)
            }).catch(() => {});
        }

        function pullArcadeRoomFromFirebase() {
            if (!deviceConfig.firebaseUrl) {
                try {
                    const localRaw = localStorage.getItem('b2ks_arcade_online_room');
                    if (localRaw) {
                        const parsed = JSON.parse(localRaw);
                        if (parsed && (parsed.updatedAt || 0) > (arcadeRoomState?.updatedAt || 0)) {
                            onRemoteArcadeRoomUpdate(parsed);
                        }
                    }
                } catch (e) {}
                return;
            }
            fetch(deviceConfig.firebaseUrl + '/b2ks_family_rpg_v16/arcade_room.json')
                .then(r => r.json())
                .then(remoteRoom => {
                    if (!remoteRoom) return;
                    if ((remoteRoom.updatedAt || 0) > (arcadeRoomState?.updatedAt || 0)) {
                        onRemoteArcadeRoomUpdate(remoteRoom);
                    }
                }).catch(() => {});
        }

        function pullFromFirebase() {
            if (!deviceConfig.firebaseUrl) return;
            const curId = deviceConfig.currentMemberId;

            fetch(deviceConfig.firebaseUrl + '/b2ks_family_rpg_v16/shared.json')
                .then(r => r.json())
                .then(remote => {
                    if (remote && Array.isArray(remote.members) && (remote.updatedAt || 0) > (state.updatedAt || 0)) {
                        const localMe = state.members.find(m => m.id === curId);
                        const localPin = state.parentPin;
                        const localPinTs = state.parentPinUpdatedAt || parseInt(localStorage.getItem('b2ks_parent_pin_ts') || '0', 10);
                        const prevUnread = getUnreadMessageCount(getCurrentUser());

                        state = remote;
                        state.currentUserId = curId;

                        const remotePinTs = remote.parentPinUpdatedAt || 0;
                        if (localPinTs > remotePinTs && /^\d{4}$/.test(String(localPin))) {
                            state.parentPin = localPin;
                            state.parentPinUpdatedAt = localPinTs;
                        } else if (remote.parentPin && /^\d{4}$/.test(String(remote.parentPin))) {
                            localStorage.setItem('b2ks_parent_pin', String(remote.parentPin));
                            localStorage.setItem('b2ks_parent_pin_ts', String(remotePinTs));
                        } else {
                            state.parentPin = localStorage.getItem('b2ks_parent_pin') || '1234';
                        }

                        if (!Array.isArray(state.familyMessages)) state.familyMessages = [];
                        pruneExpiredFamilyMessages();
                        const newUnread = getUnreadMessageCount(getCurrentUser());
                        if (newUnread > prevUnread) {
                            AudioEngine.playTone(784, 'sine', 0.12, 0.06);
                        }
                        if (localMe) {
                            const remoteMe = state.members.find(m => m.id === curId);
                            if (remoteMe) {
                                remoteMe.x = localMe.x;
                                remoteMe.y = localMe.y;
                                remoteMe.dir = localMe.dir;
                                remoteMe.scene = localMe.scene;
                                remoteMe.privateRoomId = localMe.privateRoomId;
                            }
                        }
                        localStorage.setItem('b2ks_daily_routines_rpg_v16', JSON.stringify(state));
                        lastHudSignature = '';
                        updateHUD();
                    }
                }).catch(() => {});

            fetch(deviceConfig.firebaseUrl + '/b2ks_family_rpg_v16/live_pos.json')
                .then(r => r.json())
                .then(posMap => {
                    if (!posMap) return;
                    state.members.forEach(m => {
                        if (m.id !== curId && posMap[m.id]) {
                            m.x = posMap[m.id].x;
                            m.y = posMap[m.id].y;
                            m.dir = posMap[m.id].dir || 'down';
                            m.scene = posMap[m.id].scene || 'neighborhood';
                            m.privateRoomId = posMap[m.id].privateRoomId || null;
                            if (posMap[m.id].speech && Date.now() < posMap[m.id].speech.expiresAt) {
                                m.speech = posMap[m.id].speech;
                            }
                        }
                    });
                }).catch(() => {});
        }
        setInterval(pullFromFirebase, 2500);
        setInterval(pullArcadeRoomFromFirebase, 800);
        window.addEventListener('storage', (e) => {
            if (e.key === 'b2ks_arcade_online_room' && e.newValue) {
                try {
                    const parsed = JSON.parse(e.newValue);
                    if (parsed && (parsed.updatedAt || 0) > (arcadeRoomState?.updatedAt || 0)) {
                        onRemoteArcadeRoomUpdate(parsed);
                    }
                } catch (err) {}
            }
        });

        setInterval(() => {
            if (!deviceConfig.firebaseUrl) return;
            const cur = getCurrentUser();
            fetch(deviceConfig.firebaseUrl + `/b2ks_family_rpg_v16/live_pos/${cur.id}.json`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    x: Math.round(cur.x),
                    y: Math.round(cur.y),
                    dir: cur.dir || 'down',
                    scene: cur.scene || 'neighborhood',
                    privateRoomId: cur.privateRoomId || null,
                    speech: cur.speech || null,
                    ts: Date.now()
                })
            }).catch(() => {});
        }, 1200);
/* ACTIVITY COOLDOWN & DAILY CAP */
        const ACTIVITY_RULES = {
            eat: { label: 'Ăn cơm', cooldownMs: 15 * 60 * 1000, maxPerDay: 5, reward: 2, fullMsg: 'Bụng no căng rồi! Để lát nữa mới ăn tiếp được nhé 😋', doneMsg: 'Hôm nay đã ăn đủ 3 bữa chính rồi! 🍽️' },
            sleep: { label: 'Đi ngủ', cooldownMs: 30 * 60 * 1000, maxPerDay: 2, reward: 2, fullMsg: 'Mình vừa ngủ dậy, tỉnh táo lắm rồi! Đi chơi thôi ☀️', doneMsg: 'Hôm nay đã ngủ đủ giấc trưa & tối rồi! 😴' },
            park_rest: { label: 'Nghỉ chân Quảng trường', cooldownMs: 15 * 60 * 1000, maxPerDay: 3, reward: 2, fullMsg: 'Mình vừa nghỉ ngơi ở quảng trường rồi! Đi khám phá tiếp thôi ⛲', doneMsg: 'Hôm nay đã nhận đủ điểm dạo công viên rồi! 🌳' }
        };

        function getActivityStatus(member, actKey) {
            ensureMemberProps(member);
            const rule = ACTIVITY_RULES[actKey];
            const today = new Date().toDateString();
            if (!member.activityLogs) member.activityLogs = {};
            let log = member.activityLogs[actKey];
            if (!log || log.date !== today) {
                log = { date: today, count: 0, lastAt: 0 };
                member.activityLogs[actKey] = log;
            }
            if (isParent(member)) return { canEarn: false, isParent: true, remainMs: 0, count: log.count, maxPerDay: rule.maxPerDay };
            if (log.count >= rule.maxPerDay) {
                return { canEarn: false, capped: true, remainMs: 0, count: log.count, maxPerDay: rule.maxPerDay };
            }
            const elapsed = Date.now() - (log.lastAt || 0);
            if (log.lastAt > 0 && elapsed < rule.cooldownMs) {
                return { canEarn: false, onCooldown: true, remainMs: rule.cooldownMs - elapsed, count: log.count, maxPerDay: rule.maxPerDay };
            }
            return { canEarn: true, remainMs: 0, count: log.count, maxPerDay: rule.maxPerDay };
        }

        function performRoutineActivity(member, actKey, successSpeech) {
            const rule = ACTIVITY_RULES[actKey];
            const status = getActivityStatus(member, actKey);
            if (status.isParent) {
                AudioEngine.playSuccess();
                triggerSpeechBubble(member, successSpeech, true);
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
            member.activityLogs[actKey].count += 1;
            member.activityLogs[actKey].lastAt = Date.now();
            member.points += rule.reward;
            AudioEngine.playCoin();
            triggerSpeechBubble(member, successSpeech, true);
            showToast(`⭐ ${member.name} +${rule.reward}⭐ (${rule.label} lần ${member.activityLogs[actKey].count}/${rule.maxPerDay} hôm nay)!`);
            updateHUD();
            saveGame();
        }

        function ensureMemberProps(m) {
            if (!Array.isArray(m.inventory)) m.inventory = [];
            if (!Array.isArray(m.vouchers)) m.vouchers = [];
            if (!Array.isArray(m.roomDecor)) m.roomDecor = [];
            if (!Array.isArray(m.customLabItems)) m.customLabItems = [];
            if (typeof m.tvSecondsUsedToday !== 'number') m.tvSecondsUsedToday = 0;
            if (typeof m.tvBonusSecondsToday !== 'number') m.tvBonusSecondsToday = 0;
            if (!m.tvLastDate) m.tvLastDate = new Date().toDateString();
            const today = new Date().toDateString();
            if (m.tvLastDate !== today) {
                m.tvSecondsUsedToday = 0;
                m.tvBonusSecondsToday = 0;
                m.tvLastDate = today;
            }
        }

        function checkDailyAllowance() {
            const today = new Date().toDateString();
            state.members.forEach(ensureMemberProps);
            if (state.lastDailyReset !== today) {
                state.members.forEach(m => {
                    if (isParent(m)) m.points = Math.min(MAX_PARENT_POINTS, m.points + DAILY_PARENT_ALLOWANCE);
                    m.tvSecondsUsedToday = 0;
                    m.tvBonusSecondsToday = 0;
                    m.tvLastDate = today;
                });
                state.lastDailyReset = today;
                showToast(`🌅 Ngày mới! Bố và Mẹ nhận thêm +${DAILY_PARENT_ALLOWANCE}⭐ ngân sách!`);
                saveGame();
            }
        }

        function getCurrentUser() {
            return state.members.find(m => m.id === state.currentUserId) || state.members[0];
        }

        function isParent(member) {
            return member.role === 'Bố' || member.role === 'Mẹ';
        }
