/* =========================================================================
           12. SMARTPHONE (MESSENGER 72H + TASKS APP + ĐỒNG ĐỘI) & BỮA ĂN TIẾNG ANH
           ========================================================================= */
        const MESSAGE_TTL_MS = 72 * 60 * 60 * 1000;
        let currentPhoneView = 'home';
        let activeChatPeerId = 'family_group';

        function pruneExpiredFamilyMessages() {
            if (!Array.isArray(state.familyMessages)) { state.familyMessages = []; return; }
            const cutoff = Date.now() - MESSAGE_TTL_MS;
            state.familyMessages = state.familyMessages.filter(m => (m.ts || 0) >= cutoff);
        }

        function getUnreadFamilyMessagesCount(memberId) {
            pruneExpiredFamilyMessages();
            return (state.familyMessages || []).filter(m => {
                if (m.senderId === memberId) return false;
                const isForMe = (m.recipientId === 'family_group') || (m.recipientId === memberId);
                if (!isForMe) return false;
                const readBy = Array.isArray(m.readBy) ? m.readBy : [];
                return !readBy.includes(memberId);
            }).length;
        }

        function markThreadMessagesAsRead(memberId, peerId) {
            let changed = false;
            (state.familyMessages || []).forEach(m => {
                const match = (peerId === 'family_group')
                    ? (m.recipientId === 'family_group')
                    : ((m.senderId === peerId && m.recipientId === memberId) || (m.senderId === memberId && m.recipientId === peerId));
                if (match) {
                    if (!Array.isArray(m.readBy)) m.readBy = [];
                    if (!m.readBy.includes(memberId)) {
                        m.readBy.push(memberId);
                        changed = true;
                    }
                }
            });
            if (changed) {
                lastHudSignature = '';
                updateHUD();
                saveGame();
            }
        }

        function openSmartphoneModal(view = 'home') {
            AudioEngine.playClick();
            currentPhoneView = view;
            document.getElementById('smartphone-modal').style.display = 'flex';
            renderSmartphoneScreen();
        }

        function switchSmartphoneView(view, peerId = null) {
            AudioEngine.playClick();
            currentPhoneView = view;
            if (peerId) activeChatPeerId = peerId;
            renderSmartphoneScreen();
        }

        function renderSmartphoneScreen() {
            const body = document.getElementById('phone-screen-body');
            if (!body) return;
            const me = getCurrentUser();
            const now = new Date();
            document.getElementById('phone-status-time').innerText =
                `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

            const unreadCount = getUnreadFamilyMessagesCount(me.id);
            const activeTasksCount = (state.tasks || []).filter(t => t.status !== 'completed' && (isParent(me) || t.assigneeId === me.id)).length;
            const activeCoopCount = (state.familyQuests || []).filter(q => q.status !== 'completed').length;

            if (currentPhoneView === 'home') {
                body.innerHTML = `
                    <div style="text-align:center; padding:8px 0 14px;">
                        <div style="font-family:'Fredoka',sans-serif; font-size:20px; color:#2C3E50;">📱 B2KS SmartPhone</div>
                        <div style="font-size:12px; color:#555;">Xin chào <b>${me.name}</b> • Số dư: <b style="color:#D35400;">${me.points}⭐</b></div>
                    </div>
                    <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:10px;">
                        <button type="button" class="phone-app-icon-btn" onclick="switchSmartphoneView('messenger_list')">
                            <span style="font-size:28px;">💬</span>
                            <span style="font-size:11.5px; font-weight:700;">Messenger</span>
                            ${unreadCount > 0 ? `<span class="unread-badge-dot">${unreadCount}</span>` : ''}
                        </button>
                        <button type="button" class="phone-app-icon-btn" onclick="switchSmartphoneView('tasks_app')">
                            <span style="font-size:28px;">📋</span>
                            <span style="font-size:11.5px; font-weight:700;">Nhiệm Vụ</span>
                            ${(activeTasksCount + activeCoopCount) > 0 ? `<span class="unread-badge-dot" style="background:#27AE60;">${activeTasksCount + activeCoopCount}</span>` : ''}
                        </button>
                        <button type="button" class="phone-app-icon-btn" onclick="closeModal('smartphone-modal'); openZooModal();">
                            <span style="font-size:28px;">🦁</span>
                            <span style="font-size:11.5px; font-weight:700;">B2KS Zoo</span>
                        </button>
                        <button type="button" class="phone-app-icon-btn" onclick="closeModal('smartphone-modal'); openInterworldModal();">
                            <span style="font-size:28px;">🌌</span>
                            <span style="font-size:11.5px; font-weight:700;">Đổi Quà Thật</span>
                        </button>
                        <button type="button" class="phone-app-icon-btn" onclick="closeModal('smartphone-modal'); openQuizModal();">
                            <span style="font-size:28px;">🧠</span>
                            <span style="font-size:11.5px; font-weight:700;">Tiếng Anh</span>
                        </button>
                        <button type="button" class="phone-app-icon-btn" onclick="closeModal('smartphone-modal'); openMapPortalModal();">
                            <span style="font-size:28px;">🗺️</span>
                            <span style="font-size:11.5px; font-weight:700;">Bản Đồ</span>
                        </button>
                    </div>
                `;
                return;
            }

            if (currentPhoneView === 'messenger_list') {
                const others = state.members.filter(m => m.id !== me.id);
                body.innerHTML = `
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
                        <button class="btn btn-sm" onclick="switchSmartphoneView('home')">⬅️</button>
                        <b style="font-size:15px;">💬 Tin Nhắn Gia Đình (72h)</b>
                        <span style="width:28px;"></span>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        <button class="card-item" style="flex-direction:row; align-items:center; cursor:pointer;" onclick="switchSmartphoneView('messenger_chat', 'family_group')">
                            <span style="font-size:28px;">👨‍👩‍👧‍👦</span>
                            <div style="text-align:left;">
                                <b>Nhóm Chat Cả Nhà</b>
                                <div style="font-size:11.5px; color:#555;">Tin nhắn tự xóa sau 72 giờ</div>
                            </div>
                        </button>
                        ${others.map(o => `
                            <button class="card-item" style="flex-direction:row; align-items:center; cursor:pointer;" onclick="switchSmartphoneView('messenger_chat', '${o.id}')">
                                <span style="font-size:28px;">${o.outfit || '👤'}</span>
                                <div style="text-align:left;">
                                    <b>${escapeHtml(o.name)}</b> <span class="tag">${escapeHtml(o.role)}</span>
                                    <div style="font-size:11.5px; color:#555;">Nhắn tin riêng</div>
                                </div>
                            </button>
                        `).join('')}
                    </div>
                `;
                return;
            }

            if (currentPhoneView === 'messenger_chat') {
                markThreadMessagesAsRead(me.id, activeChatPeerId);
                const peer = activeChatPeerId === 'family_group'
                    ? { name: 'Nhóm Cả Nhà 👨‍👩‍👧‍👦' }
                    : (state.members.find(m => m.id === activeChatPeerId) || { name: 'Thành viên' });

                const msgs = (state.familyMessages || []).filter(m => {
                    if (activeChatPeerId === 'family_group') return m.recipientId === 'family_group';
                    return (m.senderId === me.id && m.recipientId === activeChatPeerId) ||
                           (m.senderId === activeChatPeerId && m.recipientId === me.id);
                });

                body.innerHTML = `
                    <div style="display:flex; align-items:center; justify-content:space-between; border-bottom:1.5px solid #BDC3C7; padding-bottom:6px; margin-bottom:8px;">
                        <button class="btn btn-sm" onclick="switchSmartphoneView('messenger_list')">⬅️</button>
                        <b style="font-size:14px;">${escapeHtml(peer.name)}</b>
                        <span style="width:28px;"></span>
                    </div>
                    <div id="phone-msg-scroll" style="flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:6px; padding-right:4px;">
                        ${msgs.map(m => {
                            const isMine = m.senderId === me.id;
                            return `
                                <div class="msg-bubble-row ${isMine ? 'me' : 'other'}">
                                    ${!isMine ? `<span style="font-size:10.5px; font-weight:700; color:#555; margin-left:4px;">${escapeHtml(m.senderName)}</span>` : ''}
                                    <div class="msg-bubble">${escapeHtml(m.text)}</div>
                                    <span style="font-size:9.5px; color:#7F8C8D;">${formatTimestamp(m.ts)}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    <div style="display:flex; gap:5px; margin-top:8px;">
                        <input type="text" id="phone-msg-input" placeholder="Nhập tin nhắn..." style="flex:1; padding:7px; border:2px solid #2C3E50; border-radius:10px; font-size:13px;" onkeypress="if(event.key==='Enter') sendFamilyDirectMessage()">
                        <button class="btn btn-sm btn-primary" onclick="sendFamilyDirectMessage()">Gửi</button>
                    </div>
                `;
                setTimeout(() => {
                    const sc = document.getElementById('phone-msg-scroll');
                    if (sc) sc.scrollTop = sc.scrollHeight;
                }, 20);
                return;
            }

            if (currentPhoneView === 'tasks_app') {
                const kids = state.members.filter(m => !isParent(m));
                const activeQuests = (state.familyQuests || []).filter(q => q.status !== 'completed');

                let parentForm = '';
                if (isParent(me)) {
                    parentForm = `
                        <div style="background:#FFF9DB; border:2px solid #F39C12; border-radius:12px; padding:8px; margin-bottom:10px;">
                            <b style="font-size:12.5px;">➕ Giao việc / Bài tập mới:</b>
                            <input type="text" id="phone-task-title" placeholder="Tên công việc hoặc bài tập..." style="width:100%; padding:6px; border:1.5px solid #2C3E50; border-radius:8px; margin:5px 0; font-size:12.5px;">
                            <div style="display:flex; gap:5px; margin-bottom:5px;">
                                <select id="phone-task-type" style="padding:5px; border:1.5px solid #2C3E50; border-radius:8px; font-size:12px;">
                                    <option value="chore">🧹 Việc nhà</option>
                                    <option value="homework">📚 Bài tập</option>
                                </select>
                                <select id="phone-task-assignee" style="flex:1; padding:5px; border:1.5px solid #2C3E50; border-radius:8px; font-size:12px;">
                                    ${kids.map(k => `<option value="${k.id}">${escapeHtml(k.name)}</option>`).join('')}
                                </select>
                                <input type="number" id="phone-task-reward" value="15" min="5" style="width:65px; padding:5px; border:1.5px solid #2C3E50; border-radius:8px; font-size:12px;">
                            </div>
                            <button class="btn btn-sm btn-primary" style="width:100%;" onclick="createTaskFromPhone()">🚀 Giao Ngay</button>
                        </div>
                    `;
                }

                const visibleTasks = (state.tasks || []).filter(t => isParent(me) || t.assigneeId === me.id);

                body.innerHTML = `
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
                        <button class="btn btn-sm" onclick="switchSmartphoneView('home')">⬅️</button>
                        <b style="font-size:15px;">📋 Bảng Nhiệm Vụ</b>
                        <span style="width:28px;"></span>
                    </div>
                    ${parentForm}

                    ${activeQuests.length > 0 ? `
                        <div style="background:#E8F8F5; border:2px solid #1ABC9C; border-radius:12px; padding:8px; margin-bottom:10px;">
                            <b style="font-size:12.5px; color:#117A65;">🤝 Nhiệm Vụ Đồng Đội (Cả 2 bé cùng xong):</b>
                            ${activeQuests.map(q => {
                                const myDone = (q.completedBy || []).includes(me.id);
                                return `
                                    <div style="background:#FFF; border:1.5px solid #2C3E50; border-radius:8px; padding:6px; margin-top:5px; font-size:12px;">
                                        <b>${escapeHtml(q.title)}</b> (+${q.rewardEach}⭐/bé)
                                        <div style="color:#555; margin:2px 0;">Tiến độ: ${(q.completedBy || []).length}/${(q.participantIds || []).length} thành viên hoàn thành</div>
                                        ${!isParent(me) ? (myDone
                                            ? `<span class="tag" style="background:#D4EDDA;">✅ Bạn đã xong, chờ bé còn lại!</span>`
                                            : `<button class="btn btn-sm btn-primary" style="width:100%;" onclick="checkInFamilyQuest(${q.id})">🤝 Xác nhận phần của con</button>`
                                        ) : ''}
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    ` : ''}

                    <div style="display:flex; flex-direction:column; gap:7px;">
                        ${visibleTasks.slice().reverse().map(t => {
                            const kid = state.members.find(m => m.id === t.assigneeId);
                            let actionBtn = '';
                            if (t.status === 'pending' && t.assigneeId === me.id) {
                                actionBtn = t.type === 'homework'
                                    ? `<button class="btn btn-sm btn-secondary" onclick="openSubmitHomeworkModal(${t.id})">📤 Nộp bài</button>`
                                    : `<button class="btn btn-sm btn-primary" onclick="submitChore(${t.id}); renderSmartphoneScreen();">✅ Báo xong</button>`;
                            } else if (t.status === 'submitted' && isParent(me)) {
                                actionBtn = t.type === 'homework'
                                    ? `<button class="btn btn-sm btn-accent" onclick="openGradeHomeworkModal(${t.id})">📝 Chấm điểm</button>`
                                    : `<button class="btn btn-sm btn-primary" onclick="approveChore(${t.id}); renderSmartphoneScreen();">⭐ Duyệt (+${t.reward}⭐)</button>`;
                            } else if (t.status === 'submitted') {
                                actionBtn = `<span class="tag" style="background:#FFF3CD;">⏳ Chờ Bố/Mẹ duyệt</span>`;
                            } else {
                                actionBtn = `<span class="tag" style="background:#D4EDDA;">🎉 Đã hoàn thành</span>`;
                            }

                            return `
                                <div class="card-item" style="padding:8px;">
                                    <div style="font-size:13px;"><b>${t.type === 'homework' ? '📚' : '🧹'} ${escapeHtml(t.title)}</b></div>
                                    <div style="font-size:11.5px; color:#555;">Người nhận: <b>${kid ? kid.name : ''}</b> • Thưởng: <b>${t.reward}⭐</b></div>
                                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
                                        ${actionBtn}
                                        ${isParent(me) ? `<button class="btn btn-sm btn-danger" onclick="deleteTask(${t.id}); renderSmartphoneScreen();">🗑️</button>` : ''}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;
            }
        }

        function sendFamilyDirectMessage() {
            const input = document.getElementById('phone-msg-input');
            if (!input) return;
            const text = input.value.trim();
            if (!text) return;
            const me = getCurrentUser();
            state.familyMessages.push({
                id: 'msg_' + Date.now(),
                senderId: me.id,
                senderName: me.name,
                recipientId: activeChatPeerId,
                text,
                ts: Date.now(),
                readBy: [me.id]
            });
            input.value = '';
            AudioEngine.playClick();
            saveGame();
            renderSmartphoneScreen();
        }

        function createTaskFromPhone() {
            const me = getCurrentUser();
            if (!isParent(me)) return;
            const title = document.getElementById('phone-task-title').value.trim();
            const type = document.getElementById('phone-task-type').value;
            const assigneeId = document.getElementById('phone-task-assignee').value;
            const reward = parseInt(document.getElementById('phone-task-reward').value) || 10;
            if (!title) return showToast('⚠️ Nhập tên công việc!');
            if (me.points < reward) {
                AudioEngine.playError();
                return showToast(`❌ Bạn không đủ ${reward}⭐ ngân sách!`);
            }
            me.points -= reward;
            state.tasks.push({
                id: Date.now(),
                type,
                title,
                creatorId: me.id,
                assigneeId,
                reward,
                status: 'pending',
                createdAt: Date.now(),
                completedAt: null
            });
            AudioEngine.playSuccess();
            showToast(`✅ Đã giao việc "${title}" (-${reward}⭐)!`);
            lastHudSignature = '';
            updateHUD();
            saveGame();
            renderSmartphoneScreen();
        }

        /* =========================================================================
           12B. BỮA ĂN TIẾNG ANH VUI NHỘN (DINING TABLE WORD PUZZLE)
           ========================================================================= */
        const DINING_FOOD_WORDS = [
            { word: 'APPLE', emoji: '🍎', vi: 'Quả táo', missingIdx: 1 },
            { word: 'BANANA', emoji: '🍌', vi: 'Quả chuối', missingIdx: 2 },
            { word: 'ORANGE', emoji: '🍊', vi: 'Quả cam', missingIdx: 3 },
            { word: 'MILK', emoji: '🥛', vi: 'Sữa tươi', missingIdx: 1 },
            { word: 'BREAD', emoji: '🍞', vi: 'Bánh mì', missingIdx: 2 },
            { word: 'WATER', emoji: '💧', vi: 'Nước lọc', missingIdx: 2 }
        ];
        let currentDiningWord = null;

        function openDiningFoodPuzzleModal() {
            AudioEngine.playClick();
            currentDiningWord = DINING_FOOD_WORDS[Math.floor(Math.random() * DINING_FOOD_WORDS.length)];
            const w = currentDiningWord.word;
            const mIdx = currentDiningWord.missingIdx;
            const correctChar = w[mIdx];

            const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            const choices = new Set([correctChar]);
            while (choices.size < 4) {
                choices.add(alphabet[Math.floor(Math.random() * alphabet.length)]);
            }
            const shuffled = Array.from(choices).sort(() => Math.random() - 0.5);

            const slotsHtml = w.split('').map((ch, idx) => {
                if (idx === mIdx) return `<span class="puzzle-letter-slot missing">?</span>`;
                return `<span class="puzzle-letter-slot">${ch}</span>`;
            }).join(' ');

            document.getElementById('dining-puzzle-body').innerHTML = `
                <div style="font-size:56px; margin-bottom:6px;">${currentDiningWord.emoji}</div>
                <div style="font-size:14px; color:#555; margin-bottom:10px;">Nghĩa tiếng Việt: <b>${currentDiningWord.vi}</b></div>
                <div style="display:flex; justify-content:center; gap:6px; margin-bottom:14px;">${slotsHtml}</div>
                <div style="display:flex; justify-content:center; gap:10px;">
                    ${shuffled.map(letter => `
                        <button class="btn btn-accent" style="font-size:18px; width:48px; height:48px;" onclick="submitDiningFoodAnswer('${letter}')">${letter}</button>
                    `).join('')}
                </div>
            `;
            document.getElementById('dining-puzzle-modal').style.display = 'flex';
            speakEnglishText(w.toLowerCase(), 0.88);
        }

        function submitDiningFoodAnswer(letter) {
            if (!currentDiningWord) return;
            const correctChar = currentDiningWord.word[currentDiningWord.missingIdx];
            if (letter === correctChar) {
                speakEnglishText(currentDiningWord.word.toLowerCase(), 0.92);
                closeModal('dining-puzzle-modal');
                performRoutineActivity(getCurrentUser(), 'eat', `Ăn ngon & đánh vần đúng ${currentDiningWord.word}!`);
            } else {
                AudioEngine.playError();
                showToast('❌ Chưa đúng chữ cái rồi, thử lại nhé!');
            }
        }

        /* =========================================================================
           12C. SỞ THÚ ẢO B2KS ZOO + WIKIPEDIA API + CHẠM TỪ DỊCH NHANH (MYMEMORY API)
           ========================================================================= */
        let zooAnimalsCatalog = [];
        let zooSelectedBiome = 'All';
        let zooActiveAnimalId = null;
        const wikiImageCache = JSON.parse(localStorage.getItem('b2ks_wiki_img_cache_v1') || '{}');
        const wordTranslationCache = JSON.parse(localStorage.getItem('b2ks_word_trans_cache_v1') || '{}');

        // Khởi tạo Tooltip dịch từ nổi trên màn hình
        function ensureWordTranslatorTooltip() {
            let tip = document.getElementById('word-translator-tooltip');
            if (!tip) {
                tip = document.createElement('div');
                tip.id = 'word-translator-tooltip';
                document.body.appendChild(tip);
            }
            return tip;
        }

        function hideWordTranslatorTooltip() {
            const tip = document.getElementById('word-translator-tooltip');
            if (tip) tip.style.display = 'none';
            document.querySelectorAll('.word-token.active-word').forEach(el => el.classList.remove('active-word'));
        }

        async function handleWordTokenClick(event, rawWord) {
            event.stopPropagation();
            const cleanWord = rawWord.replace(/[^a-zA-Z'-]/g, '').trim();
            if (!cleanWord) return;

            document.querySelectorAll('.word-token.active-word').forEach(el => el.classList.remove('active-word'));
            if (event.currentTarget) event.currentTarget.classList.add('active-word');

            // 1. Phát âm ngay lập tức từ tiếng Anh bằng Web Speech API
            speakEnglishText(cleanWord, 0.85);

            // 2. Hiển thị tooltip dịch nghĩa tức thì
            const tip = ensureWordTranslatorTooltip();
            const rect = event.currentTarget.getBoundingClientRect();
            tip.style.left = Math.min(window.innerWidth - 250, Math.max(10, rect.left)) + 'px';
            tip.style.top = Math.max(12, rect.top - 56) + 'px';
            tip.style.display = 'block';

            const cacheKey = cleanWord.toLowerCase();
            if (wordTranslationCache[cacheKey]) {
                tip.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
                        <b style="color:#F1C40F;">🔊 ${escapeHtml(cleanWord)}</b>
                        <span style="cursor:pointer; font-size:12px;" onclick="hideWordTranslatorTooltip()">✕</span>
                    </div>
                    <div style="margin-top:2px;">🇻🇳 <b>${escapeHtml(wordTranslationCache[cacheKey])}</b></div>
                `;
                return;
            }

            tip.innerHTML = `<b style="color:#F1C40F;">🔊 ${escapeHtml(cleanWord)}</b><div style="font-size:11.5px; color:#BDC3C7;">⏳ Đang tra nghĩa tiếng Việt...</div>`;

            try {
                const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanWord)}&langpair=en|vi`);
                const data = await res.json();
                const translated = (data && data.responseData && data.responseData.translatedText)
                    ? data.responseData.translatedText
                    : 'Không tìm thấy nghĩa';
                wordTranslationCache[cacheKey] = translated;
                localStorage.setItem('b2ks_word_trans_cache_v1', JSON.stringify(wordTranslationCache));
                tip.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
                        <b style="color:#F1C40F;">🔊 ${escapeHtml(cleanWord)}</b>
                        <span style="cursor:pointer; font-size:12px;" onclick="hideWordTranslatorTooltip()">✕</span>
                    </div>
                    <div style="margin-top:2px;">🇻🇳 <b>${escapeHtml(translated)}</b></div>
                `;
            } catch (err) {
                tip.innerHTML = `<b style="color:#F1C40F;">🔊 ${escapeHtml(cleanWord)}</b><div>⚠️ Không có mạng để dịch từ</div>`;
            }
        }

        function renderInteractiveEnglishParagraph(text) {
            if (!text) return '';
            return text.split(/\s+/).map(token => {
                const safeToken = escapeHtml(token);
                const jsArg = token.replace(/'/g, "\\'");
                return `<span class="word-token" onclick="handleWordTokenClick(event, '${jsArg}')" title="Chạm để nghe phát âm & xem nghĩa tiếng Việt">${safeToken}</span>`;
            }).join(' ');
        }

        async function loadZooAnimalsData() {
            if (zooAnimalsCatalog.length > 0) return zooAnimalsCatalog;
            try {
                const res = await fetch('./data/animals.json');
                if (res.ok) {
                    zooAnimalsCatalog = await res.json();
                    return zooAnimalsCatalog;
                }
            } catch (e) {
                console.warn('Fallback animals catalog:', e);
            }
            // Dự phòng nếu mở trực tiếp file:// không qua HTTP server
            zooAnimalsCatalog = [
                {
                    id: 'lion', name: 'African Lion', viName: 'Sư Tử Châu Phi', wikiTitle: 'Lion',
                    biome: 'Savanna', biomeVi: 'Thảo Nguyên', emoji: '🦁', cost: 30,
                    description: 'The lion is a strong wild cat that lives in grassy plains. Lions live together in family groups called prides.'
                },
                {
                    id: 'panda', name: 'Giant Panda', viName: 'Gấu Trúc Khổng Lồ', wikiTitle: 'Giant_panda',
                    biome: 'Rainforest', biomeVi: 'Rừng Nhiệt Đới', emoji: '🐼', cost: 50,
                    description: 'The giant panda is a gentle bear with black and white fur. Pandas spend most of their day eating fresh bamboo.'
                },
                {
                    id: 'dolphin', name: 'Bottlenose Dolphin', viName: 'Cá Heo Mũi Chai', wikiTitle: 'Bottlenose_dolphin',
                    biome: 'Ocean', biomeVi: 'Đại Dương', emoji: '🐬', cost: 40,
                    description: 'The dolphin is a smart and friendly ocean mammal. Dolphins breathe air through a blowhole on top of their heads.'
                },
                {
                    id: 'penguin', name: 'Emperor Penguin', viName: 'Chim Cánh Cụt Hoàng Đế', wikiTitle: 'Emperor_penguin',
                    biome: 'Arctic', biomeVi: 'Bắc Cực', emoji: '🐧', cost: 35,
                    description: 'The penguin is a clever bird that cannot fly in the sky, but it flies fast under water.'
                }
            ];
            return zooAnimalsCatalog;
        }

        async function fetchWikipediaAnimalPhoto(wikiTitle) {
            if (!wikiTitle) return null;
            if (wikiImageCache[wikiTitle]) return wikiImageCache[wikiTitle];
            try {
                const resp = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle)}`);
                if (!resp.ok) return null;
                const data = await resp.json();
                const imgUrl = (data.thumbnail && data.thumbnail.source) || (data.originalimage && data.originalimage.source) || null;
                if (imgUrl) {
                    wikiImageCache[wikiTitle] = imgUrl;
                    localStorage.setItem('b2ks_wiki_img_cache_v1', JSON.stringify(wikiImageCache));
                }
                return imgUrl;
            } catch (e) {
                return null;
            }
        }

        async function openZooModal() {
            AudioEngine.playClick();
            hideWordTranslatorTooltip();
            await loadZooAnimalsData();
            document.getElementById('zoo-modal').style.display = 'flex';
            renderZooModal();
        }

        function selectZooBiome(biome) {
            AudioEngine.playClick();
            hideWordTranslatorTooltip();
            zooSelectedBiome = biome;
            zooActiveAnimalId = null;
            renderZooModal();
        }

        function inspectZooAnimal(animalId) {
            AudioEngine.playClick();
            hideWordTranslatorTooltip();
            zooActiveAnimalId = animalId;
            renderZooModal();
        }

        async function unlockZooAnimal(animalId) {
            const me = getCurrentUser();
            const animal = zooAnimalsCatalog.find(a => a.id === animalId);
            if (!animal) return;
            if (!Array.isArray(me.unlockedAnimals)) me.unlockedAnimals = [];
            if (me.unlockedAnimals.includes(animal.id)) return;

            if (me.points < animal.cost) {
                AudioEngine.playError();
                return showToast(`❌ Bạn cần ${animal.cost}⭐ để mở khóa ${animal.viName}!`);
            }

            me.points -= animal.cost;
            me.unlockedAnimals.push(animal.id);
            zooActiveAnimalId = animal.id;

            AudioEngine.playCoin();
            speakEnglishText(animal.name, 0.9);
            showToast(`🎉 Chúc mừng ${me.name} đã mở khóa ${animal.emoji} ${animal.viName}!`);
            triggerSpeechBubble(me, `Mình vừa mở khóa ${animal.emoji} ${animal.name} ở B2KS Zoo!`, true);
            logFamilyActivity(me, 'zoo_unlock', `Mở khóa động vật ${animal.viName} (${animal.name}) (-${animal.cost}⭐)`, -animal.cost);

            lastHudSignature = '';
            updateHUD();
            saveGame();
            renderZooModal();
        }

        async function renderZooModal() {
            const body = document.getElementById('zoo-body');
            if (!body) return;
            const me = getCurrentUser();
            const unlockedSet = new Set(me.unlockedAnimals || []);

            const biomes = [
                { id: 'All', label: '🌍 Tất cả' },
                { id: 'Savanna', label: '🌾 Thảo nguyên' },
                { id: 'Rainforest', label: '🌴 Rừng nhiệt đới' },
                { id: 'Ocean', label: '🌊 Đại dương' },
                { id: 'Arctic', label: '❄️ Bắc Cực' }
            ];

            const filtered = zooSelectedBiome === 'All'
                ? zooAnimalsCatalog
                : zooAnimalsCatalog.filter(a => a.biome === zooSelectedBiome);

            const activeAnimal = zooActiveAnimalId
                ? zooAnimalsCatalog.find(a => a.id === zooActiveAnimalId)
                : null;

            let detailPanelHtml = '';
            if (activeAnimal && unlockedSet.has(activeAnimal.id)) {
                const cachedPhoto = wikiImageCache[activeAnimal.wikiTitle];
                detailPanelHtml = `
                    <div style="background:#EAFAF1; border:3px solid #27AE60; border-radius:16px; padding:12px; margin-bottom:12px;" onclick="hideWordTranslatorTooltip()">
                        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; margin-bottom:8px;">
                            <div>
                                <span style="font-size:22px;">${activeAnimal.emoji}</span>
                                <b style="font-size:17px; color:#145A32;">${escapeHtml(activeAnimal.name)}</b>
                                <span class="tag" style="background:#D4EFDF; color:#145A32;">${escapeHtml(activeAnimal.viName)}</span>
                            </div>
                            <div style="display:flex; gap:6px;">
                                <button class="btn btn-sm btn-secondary" onclick="speakEnglishText('${escapeHtml(activeAnimal.description).replace(/'/g, "\\'")}', 0.88)">🔊 Nghe đọc bài</button>
                                <button class="btn btn-sm" onclick="zooActiveAnimalId=null; hideWordTranslatorTooltip(); renderZooModal();">Đóng thẻ</button>
                            </div>
                        </div>
                        <div style="display:grid; grid-template-columns:160px 1fr; gap:12px; align-items:center;">
                            <div class="zoo-photo-box" id="zoo-active-photo-box">
                                ${cachedPhoto
                                    ? `<img src="${cachedPhoto}" alt="${escapeHtml(activeAnimal.name)}">`
                                    : `<span style="font-size:56px;">${activeAnimal.emoji}</span>`
                                }
                            </div>
                            <div>
                                <div style="font-size:11.5px; font-weight:700; color:#1E8449; margin-bottom:4px;">💡 Mẹo học tiếng Anh: Chạm vào bất kỳ từ tiếng Anh nào bên dưới để nghe phát âm & xem nghĩa tiếng Việt!</div>
                                <div style="background:#FFF; border:2px solid #2C3E50; border-radius:12px; padding:10px; font-size:14.5px; line-height:1.65; color:#2C3E50;">
                                    ${renderInteractiveEnglishParagraph(activeAnimal.description)}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }

            body.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:10px;">
                    <div style="display:flex; gap:5px; flex-wrap:wrap;">
                        ${biomes.map(b => `
                            <button class="btn btn-sm ${zooSelectedBiome === b.id ? 'btn-primary' : ''}" onclick="selectZooBiome('${b.id}')">${b.label}</button>
                        `).join('')}
                    </div>
                    <div style="font-size:13px; font-weight:700; color:#1E8449;">
                        Bộ sưu tập của ${me.name}: ${unlockedSet.size}/${zooAnimalsCatalog.length} loài • Số dư: <span style="color:#D35400;">${me.points}⭐</span>
                    </div>
                </div>

                ${detailPanelHtml}

                <div class="grid-3">
                    ${filtered.map(a => {
                        const isUnlocked = unlockedSet.has(a.id);
                        const imgUrl = wikiImageCache[a.wikiTitle];
                        if (isUnlocked) {
                            return `
                                <div class="zoo-animal-card">
                                    <div class="zoo-photo-box" style="height:96px; cursor:pointer;" onclick="inspectZooAnimal('${a.id}')">
                                        ${imgUrl
                                            ? `<img src="${imgUrl}" alt="${escapeHtml(a.name)}" data-wiki-title="${escapeHtml(a.wikiTitle)}">`
                                            : `<span style="font-size:48px;" data-wiki-placeholder="${escapeHtml(a.wikiTitle)}">${a.emoji}</span>`
                                        }
                                    </div>
                                    <div>
                                        <span class="tag" style="background:#E8F8F5; color:#117A65;">${escapeHtml(a.biomeVi)}</span>
                                        <b style="font-size:13.5px; display:block; margin-top:3px;">${a.emoji} ${escapeHtml(a.name)}</b>
                                        <div style="font-size:11.5px; color:#555;">${escapeHtml(a.viName)}</div>
                                    </div>
                                    <button class="btn btn-sm btn-primary" onclick="inspectZooAnimal('${a.id}')">📖 Đọc & Học từ</button>
                                </div>
                            `;
                        } else {
                            return `
                                <div class="zoo-animal-card locked">
                                    <div class="zoo-silhouette-box" style="height:96px;">
                                        <span class="zoo-silhouette-emoji">${a.emoji}</span>
                                        <span style="position:absolute; bottom:6px; right:8px; font-size:16px;">🔒</span>
                                    </div>
                                    <div>
                                        <span class="tag">${escapeHtml(a.biomeVi)}</span>
                                        <b style="font-size:13.5px; display:block; margin-top:3px; color:#555;">??? Sinh vật bí ẩn</b>
                                        <div style="font-size:11.5px; color:#7F8C8D;">Mở khóa để xem ảnh thật</div>
                                    </div>
                                    <button class="btn btn-sm btn-accent" onclick="unlockZooAnimal('${a.id}')">🔓 Mở (${a.cost}⭐)</button>
                                </div>
                            `;
                        }
                    }).join('')}
                </div>
            `;

            // Tải bất đồng bộ ảnh thật từ Wikipedia REST API cho các loài đã mở khóa chưa có trong cache
            const unlockedInView = filtered.filter(a => unlockedSet.has(a.id));
            for (const animal of unlockedInView) {
                if (!wikiImageCache[animal.wikiTitle]) {
                    fetchWikipediaAnimalPhoto(animal.wikiTitle).then(url => {
                        if (url && document.getElementById('zoo-modal').style.display === 'flex') {
                            renderZooModal();
                        }
                    });
                }
            }
            if (activeAnimal && unlockedSet.has(activeAnimal.id) && !wikiImageCache[activeAnimal.wikiTitle]) {
                fetchWikipediaAnimalPhoto(activeAnimal.wikiTitle).then(url => {
                    if (url && document.getElementById('zoo-modal').style.display === 'flex') {
                        renderZooModal();
                    }
                });
            }
        }