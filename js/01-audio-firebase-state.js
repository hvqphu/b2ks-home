/* =========================================================================
           1. HỆ THỐNG ÂM THANH (WEB AUDIO API) & PHÁO HOA HOÀN TẤT NGÀY
           ========================================================================= */
        const AudioEngine = {
            ctx: null,
            muted: false,
            init() {
                if (!this.ctx) {
                    const AudioCtx = window.AudioContext || window.webkitAudioContext;
                    if (AudioCtx) this.ctx = new AudioCtx();
                }
                if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
            },
            playTone(freq, type, duration, vol = 0.12) {
                if (this.muted) return;
                this.init();
                if (!this.ctx) return;
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
            playClick() { this.playTone(540, 'sine', 0.08, 0.08); },
            playCoin() {
                this.playTone(987.77, 'sine', 0.1, 0.13);
                setTimeout(() => this.playTone(1318.51, 'sine', 0.22, 0.14), 85);
            },
            playSuccess() {
                this.playTone(523.25, 'triangle', 0.12);
                setTimeout(() => this.playTone(659.25, 'triangle', 0.12), 100);
                setTimeout(() => this.playTone(783.99, 'triangle', 0.25), 200);
            },
            playFanfare() {
                const notes = [523.25, 659.25, 783.99, 1046.50, 783.99, 1046.50];
                notes.forEach((n, idx) => {
                    setTimeout(() => this.playTone(n, 'triangle', 0.18, 0.16), idx * 110);
                });
            },
            playError() {
                this.playTone(220, 'sawtooth', 0.18, 0.1);
                setTimeout(() => this.playTone(180, 'sawtooth', 0.22, 0.1), 140);
            }
        };

        function toggleSound() {
            AudioEngine.muted = !AudioEngine.muted;
            document.getElementById('btn-sound').innerText = AudioEngine.muted ? '🔇' : '🔊';
            if (!AudioEngine.muted) AudioEngine.playClick();
        }

        function triggerCelebrationConfetti() {
            AudioEngine.playFanfare();
            if (typeof confetti === 'function') {
                confetti({
                    particleCount: 110,
                    spread: 80,
                    origin: { y: 0.6 }
                });
                setTimeout(() => {
                    confetti({ particleCount: 70, angle: 60, spread: 55, origin: { x: 0 } });
                    confetti({ particleCount: 70, angle: 120, spread: 55, origin: { x: 1 } });
                }, 280);
            }
        }

        /* =========================================================================
           2. ĐỒNG BỘ FIREBASE REALTIME DATABASE + LOCAL STORAGE
           ========================================================================= */
        const FIREBASE_DB_URL = 'https://b2ks-home-default-rtdb.asia-southeast1.firebasedatabase.app/';
        let isRemoteSyncing = false;
        let lastRemoteJson = '';

        function setSyncBadge(online, text) {
            const el = document.getElementById('sync-badge');
            const loginEl = document.getElementById('login-sync-status');
            if (el) {
                el.className = 'sync-pill ' + (online ? 'online' : 'offline');
                el.innerText = text;
            }
            if (loginEl) {
                loginEl.innerText = text;
                loginEl.style.background = online ? '#D4EDDA' : '#FADBD8';
                loginEl.style.color = online ? '#155724' : '#721C24';
            }
        }

        /* =========================================================================
           3. KHỞI TẠO DỮ LIỆU & TRẠNG THÁI THẾ GIỚI (STATE v19)
           ========================================================================= */
        const DEFAULT_MEMBERS = [
            {
                id: 'dad', name: 'Bố', role: 'Bố', password: '', points: 500,
                scene: 'house', x: 380, y: 260, dir: 'down',
                hairColor: '#2C3E50', outfit: '👔',
                ownedOutfits: ['👔', '🦸‍♂️', '👨‍🚀', '🕵️'],
                inventory: [
                    { id: 'item_coffee', name: 'Cà Phê Sáng', icon: '☕', desc: 'Tăng năng lượng làm việc cho Bố' }
                ],
                unlockedAnimals: ['lion', 'eagle'],
                dailyActivity: { date: '', counts: {}, lastTs: {} }
            },
            {
                id: 'mom', name: 'Mẹ', role: 'Mẹ', password: '', points: 500,
                scene: 'house', x: 460, y: 260, dir: 'down',
                hairColor: '#5D4037', outfit: '👗',
                ownedOutfits: ['👗', '👸', '👩‍⚕️', '🧚‍♀️'],
                inventory: [
                    { id: 'item_flower', name: 'Bó Hoa Tươi', icon: '💐', desc: 'Tỏa hương thơm khắp nhà' }
                ],
                unlockedAnimals: ['panda', 'dolphin'],
                dailyActivity: { date: '', counts: {}, lastTs: {} }
            },
            {
                id: 'kid1', name: 'Kem', role: 'Con gái', password: '', points: 40,
                scene: 'house', x: 340, y: 340, dir: 'down',
                hairColor: '#1E272E', outfit: '👚',
                ownedOutfits: ['👚', '🦄', '🧜‍♀️', '🦸‍♀️'],
                inventory: [
                    { id: 'item_bear', name: 'Gấu Bông Nhỏ', icon: '🧸', desc: 'Người bạn thân thiết của Kem' }
                ],
                unlockedAnimals: ['toucan'],
                dailyActivity: { date: '', counts: {}, lastTs: {} }
            },
            {
                id: 'kid2', name: 'Sóc', role: 'Con trai', password: '', points: 40,
                scene: 'house', x: 500, y: 340, dir: 'down',
                hairColor: '#1E272E', outfit: '👕',
                ownedOutfits: ['👕', '🦖', '🥷', '🤖'],
                inventory: [
                    { id: 'item_ball', name: 'Bóng Đá Siêu Cấp', icon: '⚽', desc: 'Sút bóng siêu mạnh ngoài sân' }
                ],
                unlockedAnimals: ['lion'],
                dailyActivity: { date: '', counts: {}, lastTs: {} }
            }
        ];

        const DEFAULT_INTERWORLD_CATALOG = [
            {
                id: 'iw_cash_10k',
                name: 'Tiền Mặt Thực Tế 10.000đ',
                icon: '💵',
                cost: 100,
                stock: 5,
                desc: 'Quy đổi trực tiếp 10.000 VNĐ tiền mặt thật từ Bố Mẹ!'
            },
            {
                id: 'iw_game_15m',
                name: 'Thẻ Thêm 15 Phút Chơi Game',
                icon: '🎮',
                cost: 50,
                stock: 8,
                desc: 'Đặc quyền cộng thêm 15 phút giải trí cuối ngày.'
            },
            {
                id: 'iw_dessert',
                name: 'Thẻ Chọn Món Tráng Miệng Cuối Tuần',
                icon: '🍨',
                cost: 70,
                stock: 4,
                desc: 'Toàn quyền quyết định món kem, trà sữa hoặc bánh ngọt cả nhà ăn cuối tuần!'
            },
            {
                id: 'iw_stayup_20m',
                name: 'Thẻ Thức Khuya Thêm 20 Phút (Thứ 7)',
                icon: '🌙',
                cost: 80,
                stock: 3,
                desc: 'Được đọc truyện hoặc xem phim cùng Bố Mẹ thêm 20 phút tối thứ Bảy.'
            }
        ];

        const DEFAULT_ENGLISH_QUIZZES = [
            { id: 'q_def_1', q: 'Từ tiếng Anh nào có nghĩa là "Đánh răng"?', wordToSpeak: 'Brush teeth', options: ['Wash face', 'Brush teeth', 'Comb hair', 'Take a bath'], answer: 1 },
            { id: 'q_def_2', q: 'Khi muốn xin phép Bố Mẹ đi ngủ, con nói thế nào?', wordToSpeak: 'Good night! I am going to bed.', options: ['Good morning!', 'Good night! I am going to bed.', 'See you at school!', 'I am hungry!'], answer: 1 },
            { id: 'q_def_3', q: 'Từ "Homework" có nghĩa là gì?', wordToSpeak: 'Homework', options: ['Việc nhà', 'Bài tập về nhà', 'Trò chơi điện tử', 'Bữa ăn tối'], answer: 1 },
            { id: 'q_def_4', q: 'Điền từ còn thiếu: "Please _____ your toys after playing."', wordToSpeak: 'Please tidy up your toys after playing.', options: ['tidy up', 'throw', 'eat', 'sleep'], answer: 0 },
            { id: 'q_def_5', q: 'Từ nào chỉ "Phòng bếp" trong tiếng Anh?', wordToSpeak: 'Kitchen', options: ['Bedroom', 'Bathroom', 'Kitchen', 'Living room'], answer: 2 },
            { id: 'q_def_6', q: 'Con vật nào được gọi là "King of the Jungle"?', wordToSpeak: 'Lion', options: ['Rabbit', 'Lion', 'Penguin', 'Goldfish'], answer: 1 },
            { id: 'q_def_7', q: 'Dịch sang tiếng Anh: "Cảm ơn Bố Mẹ rất nhiều!"', wordToSpeak: 'Thank you very much, Mom and Dad!', options: ['You are welcome!', 'Thank you very much, Mom and Dad!', 'Excuse me!', 'I am sorry!'], answer: 1 },
            { id: 'q_def_8', q: '"Vegetables" là nhóm thực phẩm nào?', wordToSpeak: 'Vegetables', options: ['Bánh kẹo', 'Nước ngọt', 'Rau củ', 'Thịt cá'], answer: 2 },
            { id: 'q_def_9', q: 'Buổi sáng thức dậy, chúng ta chào cả nhà thế nào?', wordToSpeak: 'Good morning everyone!', options: ['Good evening!', 'Good night!', 'Good morning everyone!', 'Goodbye!'], answer: 2 },
            { id: 'q_def_10', q: 'Từ "Library" có nghĩa là gì?', wordToSpeak: 'Library', options: ['Siêu thị', 'Thư viện', 'Công viên', 'Bệnh viện'], answer: 1 }
        ];

        const HOUSE_ROOMS = [
            { id: 'living', name: '🛋️ Phòng Khách', x: 20, y: 150, w: 390, h: 250, ownerIds: [], floor: '#F5E6CA', accent: '#E67E22', doorX: 395, doorY: 275 },
            { id: 'kitchen', name: '🍳 Bếp & Phòng Ăn', x: 430, y: 150, w: 390, h: 250, ownerIds: [], floor: '#E8F8F5', accent: '#16A085', doorX: 445, doorY: 275 },
            { id: 'bath', name: '🛁 Phòng Tắm Chung', x: 840, y: 150, w: 240, h: 250, ownerIds: [], floor: '#EBF5FB', accent: '#2980B9', doorX: 855, doorY: 275 },
            { id: 'parents_room', name: '👑 Phòng Bố & Mẹ', x: 20, y: 500, w: 340, h: 220, ownerIds: ['dad', 'mom'], floor: '#FDEDEC', accent: '#C0392B', doorX: 190, doorY: 500 },
            { id: 'kid1_room', name: '🦄 Phòng của Kem', x: 380, y: 500, w: 340, h: 220, ownerIds: ['kid1'], floor: '#F5EEF8', accent: '#8E44AD', doorX: 550, doorY: 500 },
            { id: 'kid2_room', name: '🦖 Phòng của Sóc', x: 740, y: 500, w: 340, h: 220, ownerIds: ['kid2'], floor: '#EAFAF1', accent: '#27AE60', doorX: 910, doorY: 500 }
        ];

        const DAILY_ROUTINE_RULES = {
            brush: { label: 'Đánh răng & Rửa mặt', icon: '🪥', points: 2, maxPerDay: 2, cooldownMs: 60 * 60 * 1000, phrase: 'Răng sạch bóng rồi! ✨' },
            shower: { label: 'Tắm rửa sạch sẽ', icon: '🚿', points: 2, maxPerDay: 2, cooldownMs: 60 * 60 * 1000, phrase: 'Tắm mát sảng khoái quá! 🫧' },
            eat: { label: 'Ăn cơm ngoan ngoãn', icon: '🍽️', points: 2, maxPerDay: 5, cooldownMs: 10 * 60 * 1000, phrase: 'Măm măm ngon tuyệt! 😋' },
            sleep: { label: 'Đi ngủ đúng giờ', icon: '🛏️', points: 3, maxPerDay: 1, cooldownMs: 60 * 60 * 1000, phrase: 'Chúc cả nhà ngủ ngon! 💤' }
        };

        let state = {
            currentUserId: 'dad',
            sessionLoggedIn: false,
            members: JSON.parse(JSON.stringify(DEFAULT_MEMBERS)),
            roomLocks: {
                parents_room: false,
                kid1_room: false,
                kid2_room: false
            },
            roomFurniture: {
                parents_room: ['👑 Giường King', '🪞 Bàn Trang Điểm'],
                kid1_room: ['🦄 Giường Công Chúa', '📚 Giá Sách'],
                kid2_room: ['🦖 Giường Khủng Long', '🚀 Mô Hình Tên Lửa']
            },
            tasks: [
                {
                    id: 1700000001, type: 'chore', title: 'Dọn dẹp đồ chơi phòng khách',
                    creatorId: 'mom', assigneeId: 'kid1', reward: 15, status: 'pending',
                    createdAt: Date.now() - 3600000, completedAt: null,
                    parentFile: null, parentFileName: '', childFile: null, childFileName: '', childNote: '', grade: null
                },
                {
                    id: 1700000002, type: 'homework', title: 'Làm 5 phép tính cộng trừ',
                    creatorId: 'dad', assigneeId: 'kid2', reward: 20, status: 'pending',
                    createdAt: Date.now() - 1800000, completedAt: null,
                    parentFile: null, parentFileName: '', childFile: null, childFileName: '', childNote: '', grade: null
                }
            ],
            // Nhiệm vụ đồng đội (Family Co-op Quests)
            familyQuests: [
                {
                    id: 1700000099,
                    title: 'Cùng nhau dọn sạch bàn ăn & rửa chén đĩa',
                    creatorId: 'mom',
                    rewardEach: 25,
                    participantIds: ['kid1', 'kid2'],
                    completedBy: [],
                    status: 'active',
                    createdAt: Date.now() - 2400000
                }
            ],
            // Trung tâm giao dịch xuyên thế giới (Quà thực tế + Yêu cầu đổi quà)
            interworldCatalog: JSON.parse(JSON.stringify(DEFAULT_INTERWORLD_CATALOG)),
            interworldRedemptions: [],
            // Chợ trời (Flea Market)
            fleaMarketListings: [],
            // Ngân hàng câu hỏi tiếng Anh động
            customQuizzes: JSON.parse(JSON.stringify(DEFAULT_ENGLISH_QUIZZES)),
            // Nhật ký lịch sử hoạt động (Activity Log) & Thống kê tuần
            activityLogs: [],
            quizStats: {}, // { memberId: { 'YYYY-MM-DD': { correct: 0, total: 0, stars: 0 } } }
            messages: [
                { sender: 'Hệ thống', text: 'Chào mừng cả nhà đến với B2KS Daily Routines v19! 🌟', time: '10:00' }
            ],
            familyMessages: [
                {
                    id: 'msg_welcome_1',
                    senderId: 'mom',
                    senderName: 'Mẹ',
                    recipientId: 'family_group',
                    text: 'Chào cả nhà! Hôm nay hoàn thành hết nhiệm vụ để cùng mở khóa thú ở B2KS Zoo nhé! 🦁✨',
                    ts: Date.now() - 1200000,
                    readBy: ['mom']
                }
            ],
            lastSaved: Date.now()
        };

        let activeSpeechBubbles = {};
        let currentInteractTarget = null;
        let zoomLevel = 1.0;
        let lastDoorToastTime = 0;
        let activePrivateRoomId = null;

        function getTodayStr() {
            const d = new Date();
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        }

        function formatTimestamp(ts) {
            if (!ts) return '';
            const d = new Date(ts);
            const hh = String(d.getHours()).padStart(2, '0');
            const min = String(d.getMinutes()).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            return `${hh}:${min} ${dd}/${mm}`;
        }

        function isParent(member) {
            return member && (member.role === 'Bố' || member.role === 'Mẹ');
        }

        function logFamilyActivity(member, category, detail, starsDelta = 0) {
            if (!member) return;
            if (!Array.isArray(state.activityLogs)) state.activityLogs = [];
            const now = Date.now();
            // Kiểm tra cảnh báo bấm hoàn thành hàng loạt quá nhanh (< 15 giây giữa 2 lần hoàn thành task)
            let rapidFlag = false;
            if (category === 'task_submit' || category === 'coop_step') {
                const recent = state.activityLogs.find(
                    l => l.memberId === member.id &&
                    (l.category === 'task_submit' || l.category === 'coop_step') &&
                    (now - l.ts) < 15000
                );
                if (recent) rapidFlag = true;
            }
            state.activityLogs.unshift({
                id: 'log_' + now + '_' + Math.random().toString(36).slice(2, 5),
                memberId: member.id,
                memberName: member.name,
                category,
                detail,
                starsDelta,
                rapidFlag,
                ts: now,
                dateStr: getTodayStr()
            });
            if (state.activityLogs.length > 150) {
                state.activityLogs = state.activityLogs.slice(0, 150);
            }
        }

        function ensureMemberIntegrity(m, idx) {
            const def = DEFAULT_MEMBERS[idx] || DEFAULT_MEMBERS[0];
            if (!m.scene) m.scene = 'house';
            if (typeof m.x !== 'number' || Number.isNaN(m.x)) m.x = def.x;
            if (typeof m.y !== 'number' || Number.isNaN(m.y)) m.y = def.y;
            if (typeof m.password !== 'string') m.password = '';
            if (!Array.isArray(m.ownedOutfits) || m.ownedOutfits.length === 0) m.ownedOutfits = [...def.ownedOutfits];
            if (!Array.isArray(m.inventory)) m.inventory = [];
            if (!Array.isArray(m.unlockedAnimals)) m.unlockedAnimals = [...(def.unlockedAnimals || [])];
            if (!m.dailyActivity || typeof m.dailyActivity !== 'object') {
                m.dailyActivity = { date: getTodayStr(), counts: {}, lastTs: {} };
            }
            if (m.dailyActivity.date !== getTodayStr()) {
                m.dailyActivity = { date: getTodayStr(), counts: {}, lastTs: {} };
            }
            if (!m.dailyActivity.counts) m.dailyActivity.counts = {};
            if (!m.dailyActivity.lastTs) m.dailyActivity.lastTs = {};
        }

        function getCurrentUser() {
            let u = state.members.find(m => m.id === state.currentUserId);
            if (!u) { u = state.members[0]; state.currentUserId = u.id; }
            return u;
        }

        function showToast(msg) {
            const t = document.getElementById('toast');
            t.innerText = msg;
            t.style.display = 'block';
            clearTimeout(t._timer);
            t._timer = setTimeout(() => { t.style.display = 'none'; }, 2800);
        }

        function triggerSpeechBubble(member, text, broadcast = false) {
            if (!member) return;
            activeSpeechBubbles[member.id] = { text, expires: Date.now() + 4200 };
            if (broadcast) {
                const now = new Date();
                const timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
                state.messages.push({ sender: member.name, text, time: timeStr });
                if (state.messages.length > 35) state.messages.shift();
                renderChatLog();
                saveGame();
            }
        }

        function saveGame() {
            state.lastSaved = Date.now();
            const { sessionLoggedIn, ...persistedState } = state;
            const serialized = JSON.stringify(persistedState);
            localStorage.setItem('b2ks_daily_routines_rpg_v19', serialized);

            if (!isRemoteSyncing && FIREBASE_DB_URL) {
                fetch(`${FIREBASE_DB_URL}gameState.json`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: serialized
                })
                .then(res => {
                    if (res.ok) {
                        lastRemoteJson = serialized;
                        setSyncBadge(true, '☁️ Đã đồng bộ');
                    } else {
                        setSyncBadge(false, '💾 Lưu cục bộ');
                    }
                })
                .catch(() => setSyncBadge(false, '💾 Offline'));
            }
        }

        function mergeRemoteState(remote) {
            if (!remote || typeof remote !== 'object') return;
            if (Array.isArray(remote.members) && remote.members.length > 0) {
                const localCurrentId = state.currentUserId;
                const localMe = state.members.find(m => m.id === localCurrentId);
                state.members = remote.members;
                state.members.forEach((m, idx) => {
                    ensureMemberIntegrity(m, idx);
                    if (localMe && m.id === localCurrentId && state.sessionLoggedIn) {
                        m.scene = localMe.scene;
                        m.x = localMe.x;
                        m.y = localMe.y;
                        m.dir = localMe.dir;
                        m.privateRoomId = localMe.privateRoomId || null;
                    }
                });
            }
            if (remote.roomLocks) state.roomLocks = { ...state.roomLocks, ...remote.roomLocks };
            if (remote.roomFurniture) state.roomFurniture = { ...state.roomFurniture, ...remote.roomFurniture };
            if (Array.isArray(remote.tasks)) state.tasks = remote.tasks;
            if (Array.isArray(remote.familyQuests)) state.familyQuests = remote.familyQuests;
            if (Array.isArray(remote.interworldCatalog)) state.interworldCatalog = remote.interworldCatalog;
            if (Array.isArray(remote.interworldRedemptions)) state.interworldRedemptions = remote.interworldRedemptions;
            if (Array.isArray(remote.fleaMarketListings)) state.fleaMarketListings = remote.fleaMarketListings;
            if (Array.isArray(remote.customQuizzes) && remote.customQuizzes.length > 0) state.customQuizzes = remote.customQuizzes;
            if (Array.isArray(remote.activityLogs)) state.activityLogs = remote.activityLogs;
            if (remote.quizStats) state.quizStats = remote.quizStats;
            if (Array.isArray(remote.messages)) state.messages = remote.messages;
            if (Array.isArray(remote.familyMessages)) state.familyMessages = remote.familyMessages;
            if (typeof pruneExpiredFamilyMessages === 'function') pruneExpiredFamilyMessages();
        }

        function loadGame() {
            const raw = localStorage.getItem('b2ks_daily_routines_rpg_v19') || localStorage.getItem('b2ks_daily_routines_rpg_v16');
            if (raw) {
                try {
                    const parsed = JSON.parse(raw);
                    mergeRemoteState(parsed);
                    if (parsed.currentUserId) state.currentUserId = parsed.currentUserId;
                } catch (e) { console.warn('Local load error:', e); }
            }
            state.members.forEach((m, idx) => ensureMemberIntegrity(m, idx));

            // Nếu chỉ có 1 nhân vật và không có mật khẩu thì tự động đăng nhập
            if (state.members.length === 1 && !state.members[0].password) {
                state.currentUserId = state.members[0].id;
                state.sessionLoggedIn = true;
                document.getElementById('login-gate-overlay').style.display = 'none';
            } else {
                state.sessionLoggedIn = false;
                openLoginGate();
            }

            if (FIREBASE_DB_URL) {
                fetch(`${FIREBASE_DB_URL}gameState.json`)
                    .then(r => r.json())
                    .then(data => {
                        if (data && typeof data === 'object') {
                            isRemoteSyncing = true;
                            mergeRemoteState(data);
                            lastRemoteJson = JSON.stringify(data);
                            isRemoteSyncing = false;
                            lastHudSignature = '';
                            updateHUD();
                            renderChatLog();
                            if (!state.sessionLoggedIn) renderLoginGateCharacters();
                        }
                        setSyncBadge(true, '☁️ Đã kết nối');
                    })
                    .catch(() => setSyncBadge(false, '💾 Offline'));

                setInterval(() => {
                    fetch(`${FIREBASE_DB_URL}gameState.json`)
                        .then(r => r.json())
                        .then(data => {
                            if (data && typeof data === 'object') {
                                const incoming = JSON.stringify(data);
                                if (incoming !== lastRemoteJson) {
                                    isRemoteSyncing = true;
                                    mergeRemoteState(data);
                                    lastRemoteJson = incoming;
                                    isRemoteSyncing = false;
                                    lastHudSignature = '';
                                    updateHUD();
                                    renderChatLog();
                                    if (!state.sessionLoggedIn) renderLoginGateCharacters();
                                }
                            }
                            setSyncBadge(true, '☁️ Đã đồng bộ');
                        })
                        .catch(() => setSyncBadge(false, '💾 Offline'));
                }, 4000);
            }
        }