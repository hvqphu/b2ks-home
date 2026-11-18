/* =========================================================================
           10C. SMARTPHONE SYSTEM (MESSENGER 72H + TASKS APP)
           ========================================================================= */
        const MSG_RETENTION_MS = 72 * 60 * 60 * 1000; // 72 hours
        let smartphoneCurrentView = 'home'; // 'home' | 'messenger' | 'tasks'
        let smartphoneChatTargetId = 'family_group'; // 'family_group' or member.id

        function pruneExpiredFamilyMessages() {
            if (!Array.isArray(state.familyMessages)) {
                state.familyMessages = [];
                return;
            }
            const cutoff = Date.now() - MSG_RETENTION_MS;
            const before = state.familyMessages.length;
            state.familyMessages = state.familyMessages.filter(m => (m.ts || 0) >= cutoff);
            if (state.familyMessages.length !== before) {
                localStorage.setItem('b2ks_daily_routines_rpg_v16', JSON.stringify(state));
            }
        }

        function getUnreadMessageCount(member) {
            if (!member || !Array.isArray(state.familyMessages)) return 0;
            const cutoff = Date.now() - MSG_RETENTION_MS;
            let count = 0;
            state.familyMessages.forEach(msg => {
                if ((msg.ts || 0) < cutoff) return;
                if (msg.senderId === member.id) return;
                const isForMe = (msg.recipientId === 'family_group') || (msg.recipientId === member.id);
                if (!isForMe) return;
                const readBy = Array.isArray(msg.readBy) ? msg.readBy : [];
                if (!readBy.includes(member.id)) count++;
            });
            return count;
        }

        function getPendingTasksCountForMember(member) {
            if (!member || !Array.isArray(state.tasks)) return 0;
            if (isParent(member)) {
                return state.tasks.filter(t => t.status === 'submitted').length;
            }
            return state.tasks.filter(t => t.assigneeId === member.id && t.status === 'pending').length;
        }

        function markMessagesAsRead(member, channelId) {
            if (!member || !Array.isArray(state.familyMessages)) return;
            let changed = false;
            state.familyMessages.forEach(msg => {
                if (msg.senderId === member.id) return;
                const matchesChannel = channelId === 'family_group'
                    ? msg.recipientId === 'family_group'
                    : ((msg.senderId === channelId && msg.recipientId === member.id) || (msg.senderId === member.id && msg.recipientId === channelId));
                if (matchesChannel) {
                    if (!Array.isArray(msg.readBy)) msg.readBy = [];
                    if (!msg.readBy.includes(member.id)) {
                        msg.readBy.push(member.id);
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

        function openSmartphoneModal(initialView = 'home') {
            AudioEngine.init();
            AudioEngine.playClick();
            pruneExpiredFamilyMessages();
            smartphoneCurrentView = initialView;
            document.getElementById('smartphone-modal').style.display = 'flex';
            renderSmartphoneScreen();
        }

        function switchSmartphoneView(viewName, targetId = null) {
            AudioEngine.playClick();
            smartphoneCurrentView = viewName;
            if (targetId) smartphoneChatTargetId = targetId;
            renderSmartphoneScreen();
        }

        function renderSmartphoneScreen() {
            const body = document.getElementById('phone-screen-body');
            if (!body) return;
            const me = getCurrentUser();
            const lighting = getRealTimeLighting();
            const locText = getMemberLocationText(me);
            const unreadTotal = getUnreadMessageCount(me);
            const pendingTasks = getPendingTasksCountForMember(me);

            const statusTime = document.getElementById('phone-status-time');
            if (statusTime) statusTime.textContent = lighting.label;

            // 1. HOME SCREEN OF SMARTPHONE
            if (smartphoneCurrentView === 'home') {
                body.innerHTML = `
                    <div style="background:rgba(255,255,255,0.92); border:2.5px solid #2C3E50; border-radius:18px; padding:12px; margin-bottom:14px; box-shadow:0 3px 0 #2C3E50;">
                        <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
                            <div style="width:44px; height:44px; border-radius:50%; background:#FFE66D; border:2.5px solid #2C3E50; display:flex; align-items:center; justify-content:center; font-size:24px;">
                                ${me.outfit || getRoleEmoji(me.role)}
                            </div>
                            <div>
                                <div style="font-weight:700; font-size:15px; color:#2C3E50;">${me.name} <span class="tag">${me.role}</span></div>
                                <div style="font-size:11.5px; color:#555;">B2KS SmartOS v18</div>
                            </div>
                        </div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                            <div style="background:#FEF9E7; border:2px solid #F39C12; border-radius:12px; padding:8px; text-align:center;">
                                <div style="font-size:11px; color:#7E5109; font-weight:600;">⭐ Điểm hiện có</div>
                                <div id="phone-home-points" style="font-size:17px; font-weight:700; color:#D35400;">${me.points}⭐</div>
                            </div>
                            <div style="background:#EBF5FB; border:2px solid #2980B9; border-radius:12px; padding:8px; text-align:center;">
                                <div style="font-size:11px; color:#1B4F72; font-weight:600;">🕒 Thời gian</div>
                                <div style="font-size:14px; font-weight:700; color:#1B4F72; margin-top:2px;">${lighting.label}</div>
                            </div>
                        </div>
                        <div style="margin-top:8px; background:#EAFAF1; border:2px solid #27AE60; border-radius:12px; padding:7px 10px; display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-size:11.5px; font-weight:600; color:#145A32;">📍 Vị trí hiện tại:</span>
                            <span id="phone-home-loc" style="font-size:12px; font-weight:700; color:#1E8449;">${locText}</span>
                        </div>
                    </div>

                    <div style="font-size:12px; font-weight:700; color:#2C3E50; margin-bottom:8px; padding-left:4px;">📱 Ứng dụng của ${me.name}</div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                        <button type="button" class="phone-app-icon-btn" onclick="switchSmartphoneView('messenger')">
                            ${unreadTotal > 0 ? `<span class="unread-badge-dot" style="top:-6px; right:-6px;">${unreadTotal}</span>` : ''}
                            <div style="width:52px; height:52px; border-radius:15px; background:linear-gradient(135deg, #00B2FF, #006AFF); display:flex; align-items:center; justify-content:center; font-size:28px; color:#FFF; border:2px solid #2C3E50;">💬</div>
                            <div style="font-weight:700; font-size:13px; color:#2C3E50;">Messenger</div>
                            <div style="font-size:10.5px; color:#666;">Nhắn tin (Lưu 72h)</div>
                        </button>

                        <button type="button" class="phone-app-icon-btn" onclick="switchSmartphoneView('tasks')">
                            ${pendingTasks > 0 ? `<span class="unread-badge-dot" style="top:-6px; right:-6px; background:#F39C12; color:#2C3E50;">${pendingTasks}</span>` : ''}
                            <div style="width:52px; height:52px; border-radius:15px; background:linear-gradient(135deg, #FF6B6B, #EE5253); display:flex; align-items:center; justify-content:center; font-size:28px; color:#FFF; border:2px solid #2C3E50;">📋</div>
                            <div style="font-weight:700; font-size:13px; color:#2C3E50;">Tasks</div>
                            <div style="font-size:10.5px; color:#666;">Việc nhà & Bài tập</div>
                        </button>
                    </div>
                `;
                return;
            }

            // 2. MESSENGER APP (72H FAMILY CHAT)
            if (smartphoneCurrentView === 'messenger') {
                pruneExpiredFamilyMessages();
                markMessagesAsRead(me, smartphoneChatTargetId);

                const channels = [
                    { id: 'family_group', label: '👨‍👩‍👧‍👦 Nhóm Gia Đình' },
                    ...state.members.filter(m => m.id !== me.id).map(m => ({
                        id: m.id,
                        label: `${m.outfit || getRoleEmoji(m.role)} ${m.name}`
                    }))
                ];

                const msgs = state.familyMessages.filter(msg => {
                    if (smartphoneChatTargetId === 'family_group') {
                        return msg.recipientId === 'family_group';
                    }
                    return (msg.senderId === me.id && msg.recipientId === smartphoneChatTargetId) ||
                           (msg.senderId === smartphoneChatTargetId && msg.recipientId === me.id);
                });

                body.innerHTML = `
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
                        <button type="button" class="btn btn-sm" style="background:#34495E;" onclick="switchSmartphoneView('home')">◀ Trang chủ</button>
                        <b style="font-size:14px; color:#006AFF;">💬 Family Messenger</b>
                        <span class="tag" style="background:#D6EAF8; font-size:10px;">Lưu 72h</span>
                    </div>

                    <div style="display:flex; gap:5px; overflow-x:auto; padding-bottom:6px; margin-bottom:6px;">
                        ${channels.map(ch => {
                            const active = smartphoneChatTargetId === ch.id;
                            const unreadCh = state.familyMessages.filter(m => {
                                if (m.senderId === me.id) return false;
                                const match = ch.id === 'family_group'
                                    ? m.recipientId === 'family_group'
                                    : (m.senderId === ch.id && m.recipientId === me.id);
                                return match && !(m.readBy || []).includes(me.id);
                            }).length;
                            return `
                                <button type="button" class="btn btn-sm ${active ? 'btn-primary' : ''}"
                                    style="${active ? '' : 'background:#FFF; color:#2C3E50;'} position:relative; flex-shrink:0;"
                                    onclick="switchSmartphoneView('messenger', '${ch.id}')">
                                    ${ch.label} ${unreadCh > 0 ? `<span style="background:#E74C3C; color:#FFF; border-radius:999px; padding:0 5px; font-size:10px;">${unreadCh}</span>` : ''}
                                </button>
                            `;
                        }).join('')}
                    </div>

                    <div id="phone-msg-feed" style="flex:1; overflow-y:auto; background:rgba(255,255,255,0.85); border:2px solid #2C3E50; border-radius:12px; padding:8px; display:flex; flex-direction:column; gap:8px; margin-bottom:8px;">
                        ${msgs.length === 0
                            ? `<div style="text-align:center; color:#7F8C8D; font-size:12px; margin:auto;">Chưa có tin nhắn nào trong 72 giờ qua.<br>Hãy gửi lời nhắn cho gia đình nhé!</div>`
                            : msgs.map(m => {
                                const isMine = m.senderId === me.id;
                                const senderObj = state.members.find(x => x.id === m.senderId);
                                const senderName = senderObj ? senderObj.name : m.senderName;
                                return `
                                    <div class="msg-bubble-row ${isMine ? 'me' : 'other'}">
                                        <div style="font-size:10px; color:#555; margin-bottom:2px; font-weight:600;">
                                            ${isMine ? 'Bạn' : senderName} • ${formatTimestamp(m.ts)}
                                        </div>
                                        <div class="msg-bubble">${escapeHtml(m.text)}</div>
                                    </div>
                                `;
                            }).join('')
                        }
                    </div>

                    <div style="display:flex; gap:6px;">
                        <input type="text" id="phone-msg-input" placeholder="Nhập tin nhắn..." style="flex:1; padding:7px 9px; border:2px solid #2C3E50; border-radius:10px; font-size:13px;" onkeypress="if(event.key==='Enter') sendSmartphoneMessage()">
                        <button type="button" class="btn btn-primary btn-sm" onclick="sendSmartphoneMessage()">Gửi ➤</button>
                    </div>
                `;
                const feed = document.getElementById('phone-msg-feed');
                if (feed) feed.scrollTop = feed.scrollHeight;
                return;
            }

            // 3. TASKS APP (MOVED FROM TOP HUD INTO SMARTPHONE)
            if (smartphoneCurrentView === 'tasks') {
                body.innerHTML = `
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
                        <button type="button" class="btn btn-sm" style="background:#34495E;" onclick="switchSmartphoneView('home')">◀ Trang chủ</button>
                        <b style="font-size:14px; color:#C0392B;">📋 Tasks & Bài Tập</b>
                        <span class="points-pill">${me.points}⭐</span>
                    </div>

                    <div id="phone-parent-task-creator" style="display:${isParent(me) ? 'block' : 'none'}; background:#FFF8E7; padding:9px; border:2px solid #2C3E50; border-radius:10px; margin-bottom:10px;">
                        <div style="font-weight:700; font-size:12.5px; margin-bottom:6px;">➕ Giao việc / Bài tập cho con</div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:6px;">
                            <select id="phone-task-type" onchange="togglePhoneHomeworkUpload()" style="padding:5px; border:2px solid #2C3E50; border-radius:6px; font-size:12px;">
                                <option value="chore">🧹 Việc nhà</option>
                                <option value="homework">📚 Bài tập</option>
                            </select>
                            <select id="phone-task-assignee" style="padding:5px; border:2px solid #2C3E50; border-radius:6px; font-size:12px;">
                                ${state.members.filter(m => !isParent(m)).map(kid => `<option value="${kid.id}">${kid.name}</option>`).join('')}
                            </select>
                        </div>
                        <div style="display:flex; gap:6px; margin-bottom:6px;">
                            <input type="text" id="phone-task-title" placeholder="Tên công việc / bài tập..." style="flex:1; padding:5px 7px; border:2px solid #2C3E50; border-radius:6px; font-size:12px;">
                            <input type="number" id="phone-task-reward" value="20" min="5" max="100" style="width:62px; padding:5px; border:2px solid #2C3E50; border-radius:6px; font-size:12px;" title="Điểm thưởng">
                        </div>
                        <div id="phone-parent-file-group" style="display:none; margin-bottom:6px;">
                            <input type="file" id="phone-task-parent-file" accept="image/*,.pdf,.doc,.docx,.txt" style="font-size:11px; width:100%;">
                        </div>
                        <button type="button" class="btn btn-primary btn-sm" style="width:100%;" onclick="createTaskFromSmartphone()">Giao nhiệm vụ ngay</button>
                    </div>

                    <div id="phone-tasks-list" style="flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:8px;">
                        ${buildTasksListHtml(me)}
                    </div>
                `;
            }
        }

        function escapeHtml(str) {
            return String(str || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
        }

        function sendSmartphoneMessage() {
            const inp = document.getElementById('phone-msg-input');
            if (!inp) return;
            const text = inp.value.trim();
            if (!text) return;

            const me = getCurrentUser();
            if (!Array.isArray(state.familyMessages)) state.familyMessages = [];
            state.familyMessages.push({
                id: 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                senderId: me.id,
                senderName: me.name,
                recipientId: smartphoneChatTargetId || 'family_group',
                text: text,
                ts: Date.now(),
                readBy: [me.id]
            });
            pruneExpiredFamilyMessages();
            AudioEngine.playClick();
            inp.value = '';
            saveGame();
            renderSmartphoneScreen();
        }

        function togglePhoneHomeworkUpload() {
            const typeEl = document.getElementById('phone-task-type');
            const grp = document.getElementById('phone-parent-file-group');
            if (typeEl && grp) {
                grp.style.display = typeEl.value === 'homework' ? 'block' : 'none';
            }
        }

        function createTaskFromSmartphone() {
            const user = getCurrentUser();
            if (!isParent(user)) return;
            const type = document.getElementById('phone-task-type').value;
            const assigneeId = document.getElementById('phone-task-assignee').value;
            const title = document.getElementById('phone-task-title').value.trim();
            const reward = parseInt(document.getElementById('phone-task-reward').value) || 0;
            const fileInput = document.getElementById('phone-task-parent-file');

            if (!title) return showToast('⚠️ Vui lòng nhập tên nhiệm vụ!');
            if (reward <= 0 || user.points < reward) {
                AudioEngine.playError();
                return showToast(`❌ Không đủ điểm ngân sách! (Hiện có: ${user.points}⭐)`);
            }

            const finalize = (fileData, fileName) => {
                user.points -= reward;
                const now = Date.now();
                state.tasks.push({
                    id: now, type, title, creatorId: user.id, assigneeId, reward,
                    status: 'pending', createdAt: now, completedAt: null,
                    parentFile: fileData, parentFileName: fileName,
                    childFile: null, childFileName: '', childNote: '', grade: null
                });
                AudioEngine.playSuccess();
                showToast(`✅ Đã giao nhiệm vụ (-${reward}⭐ ngân sách)`);
                triggerSpeechBubble(user, `Giao việc mới: ${title}!`, false);
                lastHudSignature = '';
                updateHUD();
                renderSmartphoneScreen();
                saveGame();
            };

            if (type === 'homework' && fileInput && fileInput.files && fileInput.files[0]) {
                const file = fileInput.files[0];
                const reader = new FileReader();
                reader.onload = (e) => finalize(e.target.result, file.name);
                reader.readAsDataURL(file);
            } else {
                finalize(null, '');
            }
        }

        function buildTasksListHtml(user) {
            if (!Array.isArray(state.tasks) || state.tasks.length === 0) {
                return '<p style="color:#666; text-align:center; font-size:12.5px;">Chưa có nhiệm vụ nào.</p>';
            }
            return state.tasks.slice().reverse().map(t => {
                const creator = state.members.find(m => m.id === t.creatorId);
                const assignee = state.members.find(m => m.id === t.assigneeId);
                if (!creator || !assignee) return '';

                let statusBadge = '';
                let actionButtons = '';

                if (t.status === 'pending') {
                    statusBadge = `<span class="tag" style="background:#FFF3CD; color:#856404;">⏳ Đang làm</span>`;
                    if (user.id === assignee.id) {
                        actionButtons += t.type === 'chore'
                            ? `<button class="btn btn-sm btn-accent" onclick="submitChore(${t.id}); renderSmartphoneScreen();">✅ Báo cáo xong</button>`
                            : `<button class="btn btn-sm btn-purple" onclick="openSubmitHomeworkModal(${t.id})">📤 Nộp bài</button>`;
                    }
                } else if (t.status === 'submitted') {
                    statusBadge = `<span class="tag" style="background:#CCE5FF; color:#004085;">📩 Chờ duyệt</span>`;
                    if (isParent(user)) {
                        actionButtons += t.type === 'chore'
                            ? `<button class="btn btn-sm btn-primary" onclick="approveChore(${t.id}); renderSmartphoneScreen();">👍 Duyệt (+${t.reward}⭐)</button>`
                            : `<button class="btn btn-sm btn-primary" onclick="openGradeHomeworkModal(${t.id})">📝 Chấm điểm</button>`;
                    }
                } else if (t.status === 'completed') {
                    statusBadge = `<span class="tag" style="background:#D4EDDA; color:#155724;">🎉 Xong ${t.grade !== null ? `(${t.grade}/10)` : ''}</span>`;
                }

                if (isParent(user)) {
                    actionButtons += `<button class="btn btn-sm btn-danger" onclick="deleteTask(${t.id}); renderSmartphoneScreen();" title="Xóa">🗑️</button>`;
                }

                return `
                    <div class="card-item" style="padding:8px;">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:6px;">
                            <div>
                                <span class="tag">${t.type === 'chore' ? '🧹 Việc nhà' : '📚 Bài tập'}</span>
                                <b style="font-size:13px; margin-left:3px;">${escapeHtml(t.title)}</b>
                                <div style="font-size:11px; color:#555; margin-top:2px;">
                                    <b>${creator.name}</b> ➔ <b>${assignee.name}</b> | Thưởng: <b>${t.reward}⭐</b>
                                </div>
                            </div>
                            ${statusBadge}
                        </div>
                        ${t.parentFile ? `<div style="font-size:11px;">📎 Đề: <b>${escapeHtml(t.parentFileName)}</b> <button class="btn btn-sm" style="padding:2px 6px; font-size:10px;" onclick="viewAttachment(${t.id}, 'parent')">Xem</button></div>` : ''}
                        ${t.childFile ? `<div style="font-size:11px;">📄 Nộp: <b>${escapeHtml(t.childFileName)}</b> <button class="btn btn-sm" style="padding:2px 6px; font-size:10px;" onclick="viewAttachment(${t.id}, 'child')">Xem</button></div>` : ''}
                        <div style="display:flex; gap:5px; justify-content:flex-end; flex-wrap:wrap;">${actionButtons}</div>
                    </div>
                `;
            }).join('');
        }

        /* =========================================================================
           10D. DINING ROOM ENGLISH FOOD PICTURE PUZZLE (MAX 5 REWARDS/DAY)
           ========================================================================= */
        const DINING_FOOD_PUZZLES = [
            { word: 'PIZZA', emoji: '🍕', vi: 'Bánh Pizza', hint: 'Món bánh nướng tròn nổi tiếng của Ý có phô mai' },
            { word: 'BURGER', emoji: '🍔', vi: 'Bánh Mì Kẹp Thịt', hint: 'Bánh tròn kẹp thịt bò, rau xà lách và phô mai' },
            { word: 'NOODLES', emoji: '🍜', vi: 'Mì / Phở', hint: 'Món sợi ăn nóng bằng đũa trong bát tô' },
            { word: 'CHICKEN', emoji: '🍗', vi: 'Thịt Gà', hint: 'Đùi gà rán hoặc nướng thơm ngon' },
            { word: 'SANDWICH', emoji: '🥪', vi: 'Bánh Mì Kẹp', hint: 'Hai lát bánh mì lát kẹp nhân ở giữa' },
            { word: 'SALAD', emoji: '🥗', vi: 'Rau Trộn', hint: 'Món rau củ tươi xanh tốt cho sức khỏe' },
            { word: 'SUSHI', emoji: '🍣', vi: 'Cơm Cuộn Nhật', hint: 'Món cơm cuộn rong biển và cá hồi của Nhật Bản' },
            { word: 'PANCAKE', emoji: '🥞', vi: 'Bánh Kếp', hint: 'Bánh rán tròn xếp chồng ăn với mật ong buổi sáng' },
            { word: 'ICECREAM', emoji: '🍦', vi: 'Kem Lạnh', hint: 'Món tráng miệng mát lạnh ngọt ngào' },
            { word: 'WATERMELON', emoji: '🍉', vi: 'Dưa Hấu', hint: 'Loại quả vỏ xanh ruột đỏ mọng nước' },
            { word: 'STRAWBERRY', emoji: '🍓', vi: 'Dâu Tây', hint: 'Quả màu đỏ nhỏ xinh có vị chua ngọt' },
            { word: 'CROISSANT', emoji: '🥐', vi: 'Bánh Sừng Bò', hint: 'Bánh mì ngàn lớp hình trăng khuyết của Pháp' }
        ];

        let activeFoodPuzzle = null;

        function openDiningFoodPuzzleModal() {
            AudioEngine.init();
            AudioEngine.playClick();
            const me = getCurrentUser();
            const eatStatus = getActivityStatus(me, 'eat');

            // Pick a random food item & hide ~45% of its letters
            const item = DINING_FOOD_PUZZLES[Math.floor(Math.random() * DINING_FOOD_PUZZLES.length)];
            const chars = item.word.split('');
            const numToHide = Math.max(2, Math.min(chars.length - 1, Math.ceil(chars.length * 0.45)));
            const indices = chars.map((_, idx) => idx).sort(() => Math.random() - 0.5).slice(0, numToHide);
            const hiddenSet = new Set(indices);

            activeFoodPuzzle = {
                item,
                hiddenIndices: indices.sort((a, b) => a - b),
                hiddenSet,
                eatStatus
            };

            document.getElementById('dining-puzzle-modal').style.display = 'flex';
            renderDiningFoodPuzzle();
        }

        function renderDiningFoodPuzzle() {
            const body = document.getElementById('dining-puzzle-body');
            if (!body || !activeFoodPuzzle) return;
            const { item, hiddenSet, eatStatus } = activeFoodPuzzle;

            let statusBanner = '';
            if (eatStatus.isParent) {
                statusBanner = `<div class="tag" style="background:#D6EAF8; margin-bottom:8px;">👑 Chế độ Bố/Mẹ: Giải đố vui cùng con</div>`;
            } else if (eatStatus.canEarn) {
                statusBanner = `<div class="tag" style="background:#D4EDDA; color:#145A32; margin-bottom:8px;">⭐ Hoàn thành đúng nhận +2⭐ (Lượt ${eatStatus.count + 1}/${eatStatus.maxPerDay} hôm nay)</div>`;
            } else if (eatStatus.capped) {
                statusBanner = `<div class="tag" style="background:#FADBD8; color:#922B21; margin-bottom:8px;">🍽️ Đã nhận đủ ${eatStatus.maxPerDay}/${eatStatus.maxPerDay} lượt điểm ăn cơm hôm nay (Vẫn có thể chơi luyện tập!)</div>`;
            } else {
                const mins = Math.max(1, Math.ceil(eatStatus.remainMs / 60000));
                statusBanner = `<div class="tag" style="background:#FEF9E7; color:#7E5109; margin-bottom:8px;">⏳ Chờ ${mins} phút nữa để nhận sao tiếp (Vẫn có thể chơi luyện tập!)</div>`;
            }

            const slotsHtml = item.word.split('').map((ch, idx) => {
                if (!hiddenSet.has(idx)) {
                    return `<span class="puzzle-letter-slot">${ch}</span>`;
                }
                return `<input type="text" maxlength="1" class="puzzle-letter-slot missing" id="food-slot-${idx}"
                    oninput="handleFoodPuzzleSlotInput(${idx}, this)"
                    onkeydown="handleFoodPuzzleSlotKeydown(event, ${idx})"
                    style="text-align:center; padding:0; outline:none;">`;
            }).join('');

            body.innerHTML = `
                ${statusBanner}
                <div style="background:#FFF8E7; border:2.5px solid #2C3E50; border-radius:16px; padding:14px; margin-bottom:12px;">
                    <div style="font-size:74px; line-height:1.1; filter:drop-shadow(0 4px 4px rgba(0,0,0,0.18));">${item.emoji}</div>
                    <div style="font-size:13px; color:#7E5109; font-weight:600; margin-top:6px;">💡 Gợi ý: ${item.hint}</div>
                </div>

                <div style="font-weight:700; font-size:14px; color:#2C3E50; margin-bottom:8px;">
                    Điền các chữ cái tiếng Anh còn thiếu:
                </div>

                <div style="display:flex; gap:5px; justify-content:center; flex-wrap:wrap; margin-bottom:14px;">
                    ${slotsHtml}
                </div>

                <div id="dining-puzzle-feedback" style="min-height:22px; font-size:13px; font-weight:700; margin-bottom:10px;"></div>

                <div style="display:flex; gap:8px; justify-content:center;">
                    <button type="button" class="btn btn-accent" onclick="openDiningFoodPuzzleModal()">🔄 Đổi món khác</button>
                    <button type="button" class="btn btn-primary" onclick="submitDiningFoodPuzzle()">✅ Kiểm tra & Ăn cơm</button>
                </div>
            `;

            const firstIdx = activeFoodPuzzle.hiddenIndices[0];
            const firstEl = document.getElementById(`food-slot-${firstIdx}`);
            if (firstEl) setTimeout(() => firstEl.focus(), 50);
        }

        function handleFoodPuzzleSlotInput(idx, el) {
            el.value = el.value.replace(/[^a-zA-Z]/g, '').toUpperCase();
            if (el.value.length === 1 && activeFoodPuzzle) {
                const pos = activeFoodPuzzle.hiddenIndices.indexOf(idx);
                if (pos !== -1 && pos + 1 < activeFoodPuzzle.hiddenIndices.length) {
                    const nextIdx = activeFoodPuzzle.hiddenIndices[pos + 1];
                    const nextEl = document.getElementById(`food-slot-${nextIdx}`);
                    if (nextEl) nextEl.focus();
                }
            }
        }

        function handleFoodPuzzleSlotKeydown(e, idx) {
            if (e.key === 'Enter') {
                submitDiningFoodPuzzle();
                return;
            }
            if (e.key === 'Backspace' && !e.target.value && activeFoodPuzzle) {
                const pos = activeFoodPuzzle.hiddenIndices.indexOf(idx);
                if (pos > 0) {
                    const prevIdx = activeFoodPuzzle.hiddenIndices[pos - 1];
                    const prevEl = document.getElementById(`food-slot-${prevIdx}`);
                    if (prevEl) prevEl.focus();
                }
            }
        }

        function submitDiningFoodPuzzle() {
            if (!activeFoodPuzzle) return;
            const { item, hiddenSet } = activeFoodPuzzle;
            const chars = item.word.split('');
            let guessedWord = '';

            for (let i = 0; i < chars.length; i++) {
                if (!hiddenSet.has(i)) {
                    guessedWord += chars[i];
                } else {
                    const inp = document.getElementById(`food-slot-${i}`);
                    guessedWord += (inp ? inp.value.trim().toUpperCase() : '');
                }
            }

            const fb = document.getElementById('dining-puzzle-feedback');
            if (guessedWord.length < chars.length) {
                AudioEngine.playError();
                if (fb) {
                    fb.style.color = '#E67E22';
                    fb.textContent = '⚠️ Bạn hãy điền đầy đủ tất cả các ô chữ còn thiếu nhé!';
                }
                return;
            }

            if (guessedWord === item.word) {
                closeModal('dining-puzzle-modal');
                const me = getCurrentUser();
                performRoutineActivity(me, 'eat', `Yummy ${item.word.toLowerCase()}! (${item.vi}) 🍽️`);
            } else {
                AudioEngine.playError();
                if (fb) {
                    fb.style.color = '#E74C3C';
                    fb.textContent = `❌ "${guessedWord}" chưa chính xác, hãy thử lại nhé!`;
                }
            }
        }
