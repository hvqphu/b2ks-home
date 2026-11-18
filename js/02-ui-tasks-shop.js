/* =========================================================================
           4. HOUSE 3-FLOOR ARCHITECTURAL LAYOUT & DOOR COLLISION
           ========================================================================= */
        function getHouseRooms() {
            const kids = state.members.filter(m => !isParent(m));
            const parents = state.members.filter(m => isParent(m));
            const kid1 = kids[0] || null;
            const kid2 = kids[1] || null;
            const dad = parents.find(p => p.role === 'Bố') || parents[0];

            const extraMembers = state.members.filter(m =>
                !parents.some(p => p.id === m.id) &&
                (!kid1 || m.id !== kid1.id) &&
                (!kid2 || m.id !== kid2.id)
            );
            const commonOwners = extraMembers.map(m => m.id);

            return [
                { id: 'f1_living', name: '🛋️ Phòng Khách (Tầng 1)', x: 100, y: 570, w: 400, h: 180, wall: '#FCF3CF', floor: '#E59866', ownerIds: [], isUnlocked: true, doorSide: 'right', wardrobe: null },
                { id: 'f1_dining', name: '🍽️ Phòng Ăn & Bếp (Tầng 1)', x: 620, y: 570, w: 400, h: 180, wall: '#FDEBD0', floor: '#DC7633', ownerIds: [], isUnlocked: true, doorSide: 'left', wardrobe: null },
                {
                    id: 'f2_common',
                    name: extraMembers.length > 0 ? `🛏️ Phòng ${extraMembers[0].name} (Tầng 2)` : '🛋️ Sinh Hoạt Chung (Tầng 2)',
                    x: 100, y: 340, w: 400, h: 200,
                    wall: '#D6EAF8', floor: '#CA6F1E',
                    ownerIds: commonOwners,
                    isUnlocked: extraMembers.length === 0 ? true : extraMembers.some(m => m.roomUnlocked),
                    doorSide: 'right',
                    wardrobe: extraMembers.length > 0 ? { x: 145, y: 382 } : null
                },
                {
                    id: 'f2_parents',
                    name: '🛏️ Phòng Bố Mẹ (Tầng 2)',
                    x: 620, y: 340, w: 400, h: 200,
                    wall: (dad && dad.roomWall) || '#FADBD8',
                    floor: '#BA4A00',
                    ownerIds: parents.map(p => p.id),
                    isUnlocked: parents.some(p => p.roomUnlocked),
                    doorSide: 'left',
                    wardrobe: { x: 760, y: 382 }
                },
                {
                    id: 'f3_kid1',
                    name: kid1 ? `🛏️ Phòng ${kid1.name} (Tầng 3)` : '🛏️ Phòng Ngủ 1 (Tầng 3)',
                    x: 100, y: 110, w: 400, h: 200,
                    wall: (kid1 && kid1.roomWall) || '#D5F5E3',
                    floor: '#E59866',
                    ownerIds: kid1 ? [kid1.id] : [],
                    isUnlocked: kid1 ? kid1.roomUnlocked : true,
                    doorSide: 'right',
                    wardrobe: { x: 335, y: 152 }
                },
                {
                    id: 'f3_kid2',
                    name: kid2 ? `🛏️ Phòng ${kid2.name} (Tầng 3)` : '🛏️ Phòng Ngủ 2 (Tầng 3)',
                    x: 620, y: 110, w: 400, h: 200,
                    wall: (kid2 && kid2.roomWall) || '#EBDEF0',
                    floor: '#E59866',
                    ownerIds: kid2 ? [kid2.id] : [],
                    isUnlocked: kid2 ? kid2.roomUnlocked : true,
                    doorSide: 'left',
                    wardrobe: { x: 775, y: 152 }
                }
            ];
        }

        function getRoomAtPosition(x, y) {
            const rooms = getHouseRooms();
            return rooms.find(r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) || null;
        }

        function getMemberPrivateRoom(member) {
            const rooms = getHouseRooms();
            return rooms.find(r => r.ownerIds && r.ownerIds.includes(member.id)) || null;
        }

        function isMemberAtOwnWardrobe(member) {
            const myRoom = getMemberPrivateRoom(member);
            if (!myRoom) return false;
            if (member.scene === 'private_room' && (member.privateRoomId || activePrivateRoomId) === myRoom.id) {
                return Math.hypot(member.x - 670, member.y - 235) <= 95;
            }
            if (member.scene !== 'house' || !myRoom.wardrobe) return false;
            const curRoom = getRoomAtPosition(member.x, member.y);
            if (!curRoom || curRoom.id !== myRoom.id) return false;
            const dist = Math.hypot(member.x - myRoom.wardrobe.x, member.y - (myRoom.wardrobe.y + 38));
            return dist <= 85;
        }

        let wardrobeOpenedRoomId = null;

        function openWardrobeModal(room) {
            wardrobeOpenedRoomId = room.id;
            openModal('custom-modal');
            switchCustomTab('char');
            showToast(`🚪 Đã mở tủ quần áo trong ${room.name}!`);
        }

        function canMoveInsideHouse(member, nextX, nextY) {
            const inStairwell = (nextX >= 500 && nextX <= 620 && nextY >= 155 && nextY <= 745);
            if (inStairwell) return { allowed: true };

            const rooms = getHouseRooms();
            for (const r of rooms) {
                const doorTop = r.y + r.h - 95;
                const doorBottom = r.y + r.h - 5;
                const inDoorway = (nextY >= doorTop && nextY <= doorBottom) && (
                    (r.doorSide === 'right' && nextX >= r.x + r.w - 30 && nextX <= 525) ||
                    (r.doorSide === 'left' && nextX >= 595 && nextX <= r.x + 30)
                );

                const inRoomFloor = (
                    nextX >= r.x + 14 &&
                    nextX <= r.x + r.w - 14 &&
                    nextY >= r.y + 42 &&
                    nextY <= r.y + r.h - 8
                );

                if (inDoorway || inRoomFloor) {
                    const currentRoom = getRoomAtPosition(member.x, member.y);
                    if ((!currentRoom || currentRoom.id !== r.id) && r.ownerIds && r.ownerIds.length > 0) {
                        const isOwner = r.ownerIds.includes(member.id);
                        if (!isOwner && !r.isUnlocked) {
                            return { allowed: false, blockedRoom: r };
                        }
                    }
                    return { allowed: true };
                }
            }
            return { allowed: false, blockedRoom: null };
        }

        /* =========================================================================
           5. UI, MODALS, TASKS, SHOP & VISUAL CUSTOMIZATION
           ========================================================================= */
        function showToast(msg) {
            const container = document.getElementById('toast-container');
            const el = document.createElement('div');
            el.className = 'toast';
            el.innerText = msg;
            container.appendChild(el);
            setTimeout(() => el.remove(), 3200);
        }

        function getRoleEmoji(role) {
            if (role === 'Bố') return '👨';
            if (role === 'Mẹ') return '👩';
            if (role === 'Con trai') return '👦';
            return '👧';
        }

        let lastHudSignature = '';

        function renderMemberDropdownList() {
            const menu = document.getElementById('member-dropdown-menu');
            if (!menu) return;
            menu.innerHTML = '';
            state.members.forEach(m => {
                const isCur = m.id === state.currentUserId;
                const locLabel = m.scene === 'house' ? '🏠 Trong nhà' : '🏘️ Ngoài phố';
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'member-option-item' + (isCur ? ' active' : '');
                btn.innerHTML = `
                    <span style="display:flex; align-items:center; gap:6px;">
                        <span style="font-size:16px;">${m.outfit || getRoleEmoji(m.role)}</span>
                        <span>${m.name} <small style="color:#666;">(${m.role})</small></span>
                    </span>
                    <span style="font-size:10.5px; color:#2980B9;">${locLabel}</span>
                `;
                btn.onclick = (e) => {
                    e.stopPropagation();
                    selectMemberById(m.id);
                };
                menu.appendChild(btn);
            });
        }

        function toggleMemberDropdown(e) {
            if (e) e.stopPropagation();
            AudioEngine.playClick();
            const menu = document.getElementById('member-dropdown-menu');
            const willOpen = !menu.classList.contains('open');
            if (willOpen) {
                renderMemberDropdownList();
                menu.classList.add('open');
            } else {
                menu.classList.remove('open');
            }
        }

        function selectMemberById(memberId) {
            AudioEngine.playClick();
            state.currentUserId = memberId;
            deviceConfig.currentMemberId = memberId;
            saveDeviceConfig();
            const menu = document.getElementById('member-dropdown-menu');
            if (menu) menu.classList.remove('open');
            lastHudSignature = '';
            syncPrivateRoomToolbar();
            updateHUD();
            saveGame();
            const u = getCurrentUser();
            showToast(`👤 Đang điều khiển: ${u.name}`);
        }

        document.addEventListener('click', (e) => {
            const wrap = document.getElementById('member-switcher-wrap');
            const menu = document.getElementById('member-dropdown-menu');
            if (wrap && menu && !wrap.contains(e.target)) {
                menu.classList.remove('open');
            }
        });

        function getMemberLocationText(user) {
            if (user.scene === 'neighborhood') return '🏘️ Khu phố B2KS';
            if (user.scene === 'private_room') {
                return (getActivePrivateRoom()?.name.split(' (')[0]) || '🛏️ Phòng riêng';
            }
            return (getRoomAtPosition(user.x, user.y)?.name.split(' (')[0]) || '🪜 Cầu thang trong nhà';
        }

        function updateHUD() {
            const user = getCurrentUser();
            const lighting = getRealTimeLighting();
            const locText = getMemberLocationText(user);
            const unreadCount = getUnreadMessageCount(user);
            const pendingTasksCount = getPendingTasksCountForMember(user);

            const lockTag = document.getElementById('hud-device-lock-tag');
            if (lockTag) lockTag.style.display = deviceConfig.isLockedToMember ? 'inline-block' : 'none';

            const badgeEl = document.getElementById('hud-phone-unread-badge');
            if (badgeEl) {
                if (unreadCount > 0) {
                    badgeEl.style.display = 'inline-block';
                    badgeEl.textContent = unreadCount > 9 ? '9+' : String(unreadCount);
                } else {
                    badgeEl.style.display = 'none';
                }
            }

            // Update live status inside Smartphone modal if open
            const phoneTimeEl = document.getElementById('phone-status-time');
            if (phoneTimeEl) phoneTimeEl.textContent = lighting.label;
            const phoneHomePoints = document.getElementById('phone-home-points');
            if (phoneHomePoints) phoneHomePoints.textContent = user.points + '⭐';
            const phoneHomeLoc = document.getElementById('phone-home-loc');
            if (phoneHomeLoc) phoneHomeLoc.textContent = locText;

            const sig = `${user.id}|${user.name}|${user.role}|${user.outfit}|${user.points}|${lighting.label}|${locText}|${deviceConfig.isLockedToMember}|${unreadCount}|${pendingTasksCount}`;
            if (sig === lastHudSignature) return;
            lastHudSignature = sig;

            document.getElementById('hud-avatar').innerText = user.outfit || getRoleEmoji(user.role);
            document.getElementById('hud-name').innerText = user.name;
            document.getElementById('hud-role').innerText = user.role;

            const menu = document.getElementById('member-dropdown-menu');
            if (menu && menu.classList.contains('open')) {
                renderMemberDropdownList();
            }
        }

        function openModal(id) {
            AudioEngine.init();
            AudioEngine.playClick();
            document.getElementById(id).style.display = 'flex';
            if (id === 'tasks-modal') renderTasksModal();
            if (id === 'shop-modal') renderShop('decor');
            if (id === 'bag-modal') renderBagModal('decor');
            if (id === 'fashion-modal') renderFashionStore('set');
            if (id === 'salon-modal') renderSalonModal();
            if (id === 'custom-modal') renderCustomModal();
            if (id === 'donate-modal') renderDonateModal();
            if (id === 'house-modal') renderHouseModal();
            if (id === 'tv-modal') openTvModal();
            if (id === 'family-sync-modal') renderFamilySyncModal();
            if (id === 'english-center-modal') openEnglishCenterLobby();
            if (id === 'arcade-modal') { pullArcadeRoomFromFirebase(); renderArcadeLobby(); }
            if (id === 'invention-lab-modal') openInventionLabModal();
        }

        function closeModal(id) {
            AudioEngine.playClick();
            document.getElementById(id).style.display = 'none';
            if (id === 'custom-modal') wardrobeOpenedRoomId = null;
            if (id === 'arcade-modal') {
                stopArcadeLoop();
            }
        }

        function renderHouseModal() {
            const list = document.getElementById('family-members-list');
            list.innerHTML = '';
            state.members.forEach(m => {
                let locText = '🏘️ Đang ở ngoài Khu phố';
                if (m.scene === 'house') {
                    const r = getRoomAtPosition(m.x, m.y);
                    locText = r ? `🏠 ${r.name}` : '🪜 Cầu thang trong nhà';
                }
                list.innerHTML += `
                    <div class="card-item" style="flex-direction:row; align-items:center;">
                        <div style="font-size:26px;">${m.outfit || getRoleEmoji(m.role)}</div>
                        <div>
                            <div style="font-weight:700;">${m.name} <span class="tag">${m.role}</span></div>
                            <div style="font-size:12px; color:#555;">${locText}</div>
                            <div style="font-size:11px; color:#2980B9;">Phòng riêng: ${m.roomUnlocked ? '🔓 Đang mở' : '🔒 Đang khóa'}</div>
                        </div>
                    </div>
                `;
            });
        }

        function enterHouseScene() {
            const user = getCurrentUser();
            user.scene = 'house';
            user.x = 560;
            user.y = 700;
            user.dir = 'up';
            closeModal('house-modal');
            AudioEngine.playSuccess();
            showToast('🏢 Bạn đã vào Nhà Phố Gia Đình! Đi sang trái/phải qua cửa để vào phòng.');
            updateHUD();
            saveGame();
        }

        function exitHouseScene() {
            const user = getCurrentUser();
            user.scene = 'neighborhood';
            const plot = PLOTS[state.house.plotIndex] || PLOTS[1];
            user.x = plot.x;
            user.y = plot.y + 95;
            user.dir = 'down';
            AudioEngine.playClick();
            showToast('🏘️ Bạn đã bước ra ngoài Khu phố!');
            updateHUD();
            saveGame();
        }

        /* TASKS & HOMEWORK */
        function toggleHomeworkUpload() {
            const type = document.getElementById('task-type').value;
            document.getElementById('parent-file-group').style.display = (type === 'homework') ? 'block' : 'none';
        }

        function deleteTask(taskId) {
            const user = getCurrentUser();
            if (!isParent(user)) return;
            const idx = state.tasks.findIndex(t => t.id === taskId);
            if (idx === -1) return;
            const task = state.tasks[idx];

            if (task.status !== 'completed') {
                const creator = state.members.find(m => m.id === task.creatorId);
                if (creator) {
                    creator.points = Math.min(MAX_PARENT_POINTS, creator.points + task.reward);
                }
            }
            state.tasks.splice(idx, 1);
            AudioEngine.playClick();
            showToast(task.status !== 'completed'
                ? `🗑️ Đã xóa nhiệm vụ & hoàn lại +${task.reward}⭐ ngân sách!`
                : '🗑️ Đã xóa nhiệm vụ khỏi danh sách!');
            updateHUD();
            renderTasksModal();
            saveGame();
        }

        function renderTasksModal() {
            const user = getCurrentUser();
            const creatorBox = document.getElementById('parent-task-creator');
            if (isParent(user)) {
                creatorBox.style.display = 'block';
                const assigneeSel = document.getElementById('task-assignee');
                assigneeSel.innerHTML = '';
                state.members.filter(m => !isParent(m)).forEach(kid => {
                    assigneeSel.innerHTML += `<option value="${kid.id}">${kid.name} (${kid.role})</option>`;
                });
            } else {
                creatorBox.style.display = 'none';
            }

            const list = document.getElementById('tasks-list');
            list.innerHTML = '';
            if (state.tasks.length === 0) {
                list.innerHTML = '<p style="color:#666; text-align:center;">Chưa có nhiệm vụ nào.</p>';
                return;
            }

            state.tasks.slice().reverse().forEach(t => {
                const creator = state.members.find(m => m.id === t.creatorId);
                const assignee = state.members.find(m => m.id === t.assigneeId);
                if (!creator || !assignee) return;

                let statusBadge = '';
                let actionButtons = '';

                if (t.status === 'pending') {
                    statusBadge = `<span class="tag" style="background:#FFF3CD; color:#856404;">⏳ Đang làm</span>`;
                    if (user.id === assignee.id) {
                        actionButtons += t.type === 'chore'
                            ? `<button class="btn btn-sm btn-accent" onclick="submitChore(${t.id})">✅ Báo cáo hoàn thành</button>`
                            : `<button class="btn btn-sm btn-purple" onclick="openSubmitHomeworkModal(${t.id})">📤 Nộp bài làm (Ảnh/File)</button>`;
                    }
                } else if (t.status === 'submitted') {
                    statusBadge = `<span class="tag" style="background:#CCE5FF; color:#004085;">📩 Chờ duyệt</span>`;
                    if (isParent(user)) {
                        actionButtons += t.type === 'chore'
                            ? `<button class="btn btn-sm btn-primary" onclick="approveChore(${t.id})">👍 Xác nhận (+${t.reward}⭐)</button>`
                            : `<button class="btn btn-sm btn-primary" onclick="openGradeHomeworkModal(${t.id})">📝 Chấm điểm (Thang 10)</button>`;
                    }
                } else if (t.status === 'completed') {
                    statusBadge = `<span class="tag" style="background:#D4EDDA; color:#155724;">🎉 Hoàn thành ${t.grade !== null ? `(${t.grade}/10)` : ''}</span>`;
                }

                if (isParent(user)) {
                    actionButtons += `<button class="btn btn-sm btn-danger" onclick="deleteTask(${t.id})" title="Xóa công việc/bài tập">🗑️ Xóa</button>`;
                }

                const createdTime = formatTimestamp(t.createdAt || t.id);
                const completedTime = t.completedAt ? ` | ✅ Xong lúc: <b>${formatTimestamp(t.completedAt)}</b>` : '';

                list.innerHTML += `
                    <div class="card-item">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
                            <div>
                                <span class="tag">${t.type === 'chore' ? '🧹 Việc nhà' : '📚 Bài tập'}</span>
                                <b style="font-size:14px; margin-left:4px;">${t.title}</b>
                                <div style="font-size:12px; color:#555; margin-top:3px;">
                                    Giao bởi: <b>${creator.name}</b> ➔ <b>${assignee.name}</b> | Thưởng: <b>${t.reward}⭐</b>
                                </div>
                                <div style="font-size:11px; color:#7F8C8D; margin-top:2px;">
                                    🕒 Tạo lúc: <b>${createdTime}</b>${completedTime}
                                </div>
                            </div>
                            ${statusBadge}
                        </div>
                        ${t.parentFile ? `<div style="font-size:12px;">📎 Đề bài: <b>${t.parentFileName}</b> <button class="btn btn-sm" onclick="viewAttachment(${t.id}, 'parent')">Xem</button></div>` : ''}
                        ${t.childFile ? `<div style="font-size:12px;">📄 Bài nộp: <b>${t.childFileName}</b> <button class="btn btn-sm" onclick="viewAttachment(${t.id}, 'child')">Xem</button></div>` : ''}
                        <div style="display:flex; gap:6px; justify-content:flex-end; flex-wrap:wrap;">${actionButtons}</div>
                    </div>
                `;
            });
        }

        function createTask() {
            const user = getCurrentUser();
            if (!isParent(user)) return;
            const type = document.getElementById('task-type').value;
            const assigneeId = document.getElementById('task-assignee').value;
            const title = document.getElementById('task-title').value.trim();
            const reward = parseInt(document.getElementById('task-reward').value) || 0;
            const fileInput = document.getElementById('task-parent-file');

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
                document.getElementById('task-title').value = '';
                fileInput.value = '';
                AudioEngine.playSuccess();
                showToast(`✅ Đã giao nhiệm vụ (-${reward}⭐ ngân sách)`);
                triggerSpeechBubble(user, `Giao việc mới: ${title}!`, false);
                updateHUD(); renderTasksModal(); if (document.getElementById('smartphone-modal').style.display === 'flex') renderSmartphoneScreen(); saveGame();
            };

            if (type === 'homework' && fileInput.files && fileInput.files[0]) {
                const file = fileInput.files[0];
                const reader = new FileReader();
                reader.onload = (e) => finalize(e.target.result, file.name);
                reader.readAsDataURL(file);
            } else {
                finalize(null, '');
            }
        }

        function submitChore(taskId) {
            const task = state.tasks.find(t => t.id === taskId);
            if (!task) return;
            task.status = 'submitted';
            const user = getCurrentUser();
            AudioEngine.playSuccess();
            triggerSpeechBubble(user, `Con đã làm xong: ${task.title}!`, false);
            showToast('📨 Đã báo cáo hoàn thành cho Bố/Mẹ!');
            renderTasksModal(); if (document.getElementById('smartphone-modal').style.display === 'flex') renderSmartphoneScreen(); saveGame();
        }

        function approveChore(taskId) {
            const task = state.tasks.find(t => t.id === taskId);
            if (!task || task.status === 'completed') return;
            const assignee = state.members.find(m => m.id === task.assigneeId);
            task.status = 'completed';
            task.completedAt = Date.now();
            if (assignee) {
                assignee.points += task.reward;
                AudioEngine.playCoin();
                showToast(`🎉 ${assignee.name} nhận +${task.reward}⭐!`);
            }
            updateHUD(); renderTasksModal(); if (document.getElementById('smartphone-modal').style.display === 'flex') renderSmartphoneScreen(); saveGame();
        }

        function openSubmitHomeworkModal(taskId) {
            const task = state.tasks.find(t => t.id === taskId);
            document.getElementById('hw-modal-title').innerText = `📤 Nộp bài: ${task.title}`;
            document.getElementById('hw-modal-body').innerHTML = `
                <div class="form-group">
                    <label>Câu trả lời / Ghi chú của con:</label>
                    <textarea id="hw-child-note" rows="3" placeholder="Nhập bài làm hoặc lời nhắn..."></textarea>
                </div>
                <div class="form-group">
                    <label>Upload ảnh chụp bài làm hoặc file:</label>
                    <input type="file" id="hw-child-file" accept="image/*,.pdf,.doc,.docx,.txt">
                </div>
                <button class="btn btn-primary" onclick="submitHomework(${task.id})">Gửi bài cho Bố/Mẹ</button>
            `;
            openModal('hw-action-modal');
        }

        function submitHomework(taskId) {
            const task = state.tasks.find(t => t.id === taskId);
            const note = document.getElementById('hw-child-note').value.trim();
            const fileInput = document.getElementById('hw-child-file');

            const finish = (fileData, fileName) => {
                task.childNote = note;
                task.childFile = fileData;
                task.childFileName = fileName;
                task.status = 'submitted';
                closeModal('hw-action-modal');
                AudioEngine.playSuccess();
                triggerSpeechBubble(getCurrentUser(), 'I finished my homework!', true);
                showToast('📤 Đã nộp bài tập thành công!');
                renderTasksModal(); if (document.getElementById('smartphone-modal').style.display === 'flex') renderSmartphoneScreen(); saveGame();
            };

            if (fileInput.files && fileInput.files[0]) {
                const file = fileInput.files[0];
                const reader = new FileReader();
                reader.onload = (e) => finish(e.target.result, file.name);
                reader.readAsDataURL(file);
            } else {
                finish(null, '');
            }
        }

        function openGradeHomeworkModal(taskId) {
            const task = state.tasks.find(t => t.id === taskId);
            document.getElementById('hw-modal-title').innerText = `📝 Chấm bài: ${task.title}`;
            let preview = '';
            if (task.childFile) {
                preview = task.childFile.startsWith('data:image')
                    ? `<img src="${task.childFile}" class="preview-img">`
                    : `<a href="${task.childFile}" download="${task.childFileName}" class="btn btn-sm">⬇️ Tải: ${task.childFileName}</a>`;
            }
            document.getElementById('hw-modal-body').innerHTML = `
                <p><b>Bài làm của con:</b> ${task.childNote || '<i>(Xem file đính kèm)</i>'}</p>
                <div style="margin-bottom:10px;">${preview}</div>
                <div class="form-group">
                    <label>Chấm điểm (Thang điểm 10):</label>
                    <input type="number" id="hw-grade-input" min="0" max="10" step="0.5" value="9">
                    <small style="color:#555;">* Điểm ≥ 8/10: Cả Con và Bố/Mẹ giao bài đều được thưởng thêm điểm!</small>
                </div>
                <button class="btn btn-accent" onclick="gradeHomework(${task.id})">✅ Xác nhận điểm</button>
            `;
            openModal('hw-action-modal');
        }

        function gradeHomework(taskId) {
            const task = state.tasks.find(t => t.id === taskId);
            if (!task || task.status === 'completed') return;
            const grade = Math.min(10, Math.max(0, parseFloat(document.getElementById('hw-grade-input').value) || 0));
            task.grade = grade;
            task.status = 'completed';
            task.completedAt = Date.now();

            const assignee = state.members.find(m => m.id === task.assigneeId);
            const creator = state.members.find(m => m.id === task.creatorId);
            let earned = Math.round(task.reward * (grade / 10));
            let parentBonus = 0;
            if (grade >= 8) { earned += 10; parentBonus = 15; }

            if (assignee) assignee.points += earned;
            if (creator && parentBonus > 0) creator.points = Math.min(MAX_PARENT_POINTS, creator.points + parentBonus);

            closeModal('hw-action-modal');
            AudioEngine.playCoin();
            showToast(parentBonus > 0
                ? `🌟 Điểm cao ${grade}/10! ${assignee.name} +${earned}⭐ & ${creator.name} +${parentBonus}⭐!`
                : `📝 Đã chấm ${grade}/10! ${assignee.name} +${earned}⭐!`);
            updateHUD(); renderTasksModal(); if (document.getElementById('smartphone-modal').style.display === 'flex') renderSmartphoneScreen(); saveGame();
        }

        function viewAttachment(taskId, who) {
            const task = state.tasks.find(t => t.id === taskId);
            const data = who === 'parent' ? task.parentFile : task.childFile;
            const name = who === 'parent' ? task.parentFileName : task.childFileName;
            if (!data) return;
            document.getElementById('hw-modal-title').innerText = `📎 ${name}`;
            document.getElementById('hw-modal-body').innerHTML = data.startsWith('data:image')
                ? `<img src="${data}" style="max-width:100%; border-radius:8px;">`
                : `<a href="${data}" download="${name}" class="btn btn-primary">⬇️ Tải về (${name})</a>`;
            openModal('hw-action-modal');
        }

        /* DETAILED ITEM ILLUSTRATION HELPER */
        function renderItemIllustrationSVG(itemId, size = 54) {
            if (itemId === 'd_pc') {
                return `<svg width="${size}" height="${size}" viewBox="0 0 64 64">
                    <rect x="8" y="36" width="48" height="5" rx="2" fill="#A04000" stroke="#2C3E50" stroke-width="2"/>
                    <rect x="11" y="41" width="5" height="17" fill="#7E5109" stroke="#2C3E50" stroke-width="2"/>
                    <rect x="48" y="41" width="5" height="17" fill="#7E5109" stroke="#2C3E50" stroke-width="2"/>
                    <rect x="20" y="13" width="24" height="17" rx="2" fill="#2C3E50" stroke="#1A252F" stroke-width="2"/>
                    <rect x="22" y="15" width="20" height="12" fill="#5DADE2"/>
                    <rect x="29" y="30" width="6" height="6" fill="#7F8C8D" stroke="#2C3E50" stroke-width="1.5"/>
                    <rect x="46" y="21" width="8" height="15" rx="1" fill="#34495E" stroke="#2C3E50" stroke-width="1.5"/>
                    <circle cx="50" cy="25" r="1.2" fill="#2ECC71"/>
                    <rect x="22" y="33" width="16" height="3" rx="1" fill="#ECF0F1" stroke="#2C3E50" stroke-width="1"/>
                    <rect x="25" y="44" width="14" height="12" rx="3" fill="#E74C3C" stroke="#2C3E50" stroke-width="1.8"/>
                </svg>`;
            }
            if (itemId === 'd_plant') {
                return `<svg width="${size}" height="${size}" viewBox="0 0 64 64">
                    <polygon points="22,38 42,38 39,56 25,56" fill="#E67E22" stroke="#2C3E50" stroke-width="2.2"/>
                    <ellipse cx="32" cy="24" rx="10" ry="14" fill="#27AE60" stroke="#2C3E50" stroke-width="2"/>
                    <ellipse cx="21" cy="28" rx="9" ry="7" transform="rotate(-25 21 28)" fill="#2ECC71" stroke="#2C3E50" stroke-width="2"/>
                    <ellipse cx="43" cy="28" rx="9" ry="7" transform="rotate(25 43 28)" fill="#2ECC71" stroke="#2C3E50" stroke-width="2"/>
                </svg>`;
            }
            if (itemId === 'd_bookshelf') {
                return `<svg width="${size}" height="${size}" viewBox="0 0 64 64">
                    <rect x="14" y="10" width="36" height="46" rx="3" fill="#A04000" stroke="#2C3E50" stroke-width="2.2"/>
                    <rect x="18" y="14" width="28" height="12" fill="#FAD7A0"/>
                    <rect x="18" y="29" width="28" height="12" fill="#FAD7A0"/>
                    <rect x="18" y="44" width="28" height="9" fill="#FAD7A0"/>
                    <rect x="20" y="16" width="5" height="10" fill="#E74C3C"/>
                    <rect x="26" y="17" width="5" height="9" fill="#3498DB"/>
                    <rect x="32" y="15" width="5" height="11" fill="#F1C40F"/>
                    <rect x="21" y="31" width="6" height="10" fill="#9B59B6"/>
                    <rect x="28" y="32" width="5" height="9" fill="#2ECC71"/>
                </svg>`;
            }
            if (itemId === 'd_bear') {
                return `<svg width="${size}" height="${size}" viewBox="0 0 64 64">
                    <circle cx="21" cy="16" r="6" fill="#A0522D" stroke="#2C3E50" stroke-width="2"/>
                    <circle cx="43" cy="16" r="6" fill="#A0522D" stroke="#2C3E50" stroke-width="2"/>
                    <circle cx="32" cy="24" r="12" fill="#CD853F" stroke="#2C3E50" stroke-width="2.2"/>
                    <ellipse cx="32" cy="43" rx="14" ry="13" fill="#CD853F" stroke="#2C3E50" stroke-width="2.2"/>
                    <ellipse cx="32" cy="43" rx="8" ry="8" fill="#F5DEB3"/>
                    <circle cx="28" cy="22" r="1.8" fill="#2C3E50"/><circle cx="36" cy="22" r="1.8" fill="#2C3E50"/>
                    <ellipse cx="32" cy="26" rx="4" ry="3" fill="#F5DEB3"/>
                    <circle cx="32" cy="25" r="1.8" fill="#2C3E50"/>
                </svg>`;
            }
            if (itemId === 'd_guitar') {
                return `<svg width="${size}" height="${size}" viewBox="0 0 64 64">
                    <rect x="30" y="8" width="4" height="24" fill="#5D4037" stroke="#2C3E50" stroke-width="1.8"/>
                    <circle cx="32" cy="34" r="9" fill="#E67E22" stroke="#2C3E50" stroke-width="2"/>
                    <circle cx="32" cy="46" r="12" fill="#E67E22" stroke="#2C3E50" stroke-width="2"/>
                    <circle cx="32" cy="42" r="4" fill="#3E2723"/>
                </svg>`;
            }
            if (itemId === 'd_aquarium') {
                return `<svg width="${size}" height="${size}" viewBox="0 0 64 64">
                    <rect x="12" y="18" width="40" height="32" rx="4" fill="#AED6F1" stroke="#2C3E50" stroke-width="2.4"/>
                    <rect x="12" y="15" width="40" height="5" fill="#2C3E50"/>
                    <path d="M18 48 Q20 36 18 30" stroke="#27AE60" stroke-width="3" fill="none"/>
                    <path d="M44 48 Q42 35 45 28" stroke="#27AE60" stroke-width="3" fill="none"/>
                    <ellipse cx="31" cy="34" rx="7" ry="4" fill="#F39C12" stroke="#2C3E50" stroke-width="1.5"/>
                    <polygon points="38,34 43,30 43,38" fill="#F39C12" stroke="#2C3E50" stroke-width="1.5"/>
                </svg>`;
            }
            const item = findAnyCatalogItem(itemId);
            if (item && item.svgMarkup) {
                return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" style="overflow:visible;">${item.svgMarkup}</svg>`;
            }
            return `<div style="font-size:${Math.round(size * 0.65)}px; line-height:${size}px; text-align:center;">${item ? item.icon : '📦'}</div>`;
        }

        function drawWorldDecorItem(c, decorId, x, y) {
            c.save();
            c.translate(x, y);
            if (decorId === 'd_pc') {
                c.fillStyle = '#E74C3C';
                c.strokeStyle = '#2C3E50';
                c.lineWidth = 2;
                c.beginPath(); c.roundRect(-10, 4, 20, 14, 3); c.fill(); c.stroke();
                c.fillStyle = '#A04000';
                c.fillRect(-30, -4, 60, 7);
                c.strokeRect(-30, -4, 60, 7);
                c.fillStyle = '#7E5109';
                c.fillRect(-27, 3, 5, 16);
                c.fillRect(22, 3, 5, 16);
                c.fillStyle = '#2C3E50';
                c.fillRect(-16, -24, 26, 17);
                c.strokeRect(-16, -24, 26, 17);
                c.fillStyle = '#5DADE2';
                c.fillRect(-14, -22, 22, 12);
                c.fillStyle = '#7F8C8D';
                c.fillRect(-6, -7, 6, 3);
                c.fillStyle = '#34495E';
                c.fillRect(14, -19, 10, 15);
                c.strokeRect(14, -19, 10, 15);
                c.fillStyle = '#2ECC71';
                c.beginPath(); c.arc(19, -15, 1.5, 0, Math.PI * 2); c.fill();
            } else if (decorId === 'd_plant') {
                c.fillStyle = '#E67E22';
                c.strokeStyle = '#2C3E50';
                c.lineWidth = 2;
                c.beginPath(); c.moveTo(-10, 2); c.lineTo(10, 2); c.lineTo(8, 18); c.lineTo(-8, 18); c.closePath(); c.fill(); c.stroke();
                c.fillStyle = '#27AE60';
                c.beginPath(); c.arc(0, -10, 10, 0, Math.PI * 2); c.fill(); c.stroke();
                c.beginPath(); c.arc(-9, -5, 7, 0, Math.PI * 2); c.fill(); c.stroke();
                c.beginPath(); c.arc(9, -5, 7, 0, Math.PI * 2); c.fill(); c.stroke();
            } else if (decorId === 'd_bookshelf') {
                c.fillStyle = '#A04000';
                c.strokeStyle = '#2C3E50';
                c.lineWidth = 2;
                c.fillRect(-18, -26, 36, 44);
                c.strokeRect(-18, -26, 36, 44);
                [-21, -7, 7].forEach((sy, row) => {
                    c.fillStyle = '#FAD7A0';
                    c.fillRect(-14, sy, 28, 10);
                    ['#E74C3C', '#3498DB', '#F1C40F', '#2ECC71'].forEach((bc, bi) => {
                        c.fillStyle = bc;
                        c.fillRect(-12 + bi * 6 + (row % 2), sy + 1, 5, 9);
                    });
                });
            } else if (decorId === 'd_aquarium') {
                c.fillStyle = '#7E5109';
                c.strokeStyle = '#2C3E50';
                c.lineWidth = 2;
                c.fillRect(-18, 2, 36, 16);
                c.strokeRect(-18, 2, 36, 16);
                c.fillStyle = '#AED6F1';
                c.fillRect(-16, -18, 32, 20);
                c.strokeRect(-16, -18, 32, 20);
                c.fillStyle = '#F39C12';
                c.beginPath(); c.ellipse(-2, -8, 5, 3, 0, 0, Math.PI * 2); c.fill();
            } else {
                const item = findAnyCatalogItem(decorId);
                if (item && item.labSpec) {
                    drawProceduralLabItemOnCanvas(c, item.labSpec);
                } else {
                    c.font = '32px Arial';
                    c.textAlign = 'center';
                    c.fillText(item ? item.icon : '📦', 0, 10);
                }
            }
            c.restore();
        }

        /* SUPERMARKET, PERSONAL BAG, FASHION BOUTIQUE & HAIR SALON */
        function renderShop(tab) {
            const grid = document.getElementById('shop-items-grid');
            const user = getCurrentUser();
            grid.innerHTML = '';

            SHOP_CATALOG.filter(i => i.category === tab).forEach(item => {
                const owned = user.inventory.includes(item.id);
                const canBuyMultiple = (item.category === 'voucher' || item.category === 'tv_card');
                grid.innerHTML += `
                    <div class="card-item">
                        <div style="display:flex; gap:10px; align-items:center;">
                            <div style="flex-shrink:0;">${renderItemIllustrationSVG(item.id, 52)}</div>
                            <div>
                                <b style="font-size:14px;">${item.name}</b>
                                <div style="font-size:12px; color:#555; margin-top:2px;">${item.desc}</div>
                            </div>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px;">
                            <span class="points-pill">⭐ ${item.price}</span>
                            ${(owned && !canBuyMultiple)
                                ? `<span class="tag" style="background:#D4EDDA;">Đã có trong túi</span>`
                                : `<button class="btn btn-sm btn-accent" onclick="buySupermarketItem('${item.id}')">Mua bằng điểm</button>`
                            }
                        </div>
                    </div>
                `;
            });
        }

        function buySupermarketItem(itemId) {
            const user = getCurrentUser();
            const item = SHOP_CATALOG.find(i => i.id === itemId);
            if (!item || user.points < item.price) {
                AudioEngine.playError();
                return showToast(`❌ Bạn cần ${item ? item.price : 0}⭐ để mua vật phẩm này!`);
            }
            user.points -= item.price;
            if (item.category === 'voucher') {
                user.vouchers.push(item.id);
            } else {
                user.inventory.push(item.id);
            }
            AudioEngine.playCoin();
            showToast(`🛍️ Đã mua ${item.name} và cất vào 🎒 Túi đồ!`);
            updateHUD(); renderShop(item.category); saveGame();
        }

        function renderBagModal(tab) {
            const user = getCurrentUser();
            ensureMemberProps(user);
            document.getElementById('bag-owner-name').innerText = user.name;
            const grid = document.getElementById('bag-items-grid');
            grid.innerHTML = '';

            if (tab === 'voucher') {
                if (user.vouchers.length === 0) {
                    grid.innerHTML = '<p style="color:#666; font-size:13px;">Chưa có phiếu quà tặng nào trong túi.</p>';
                    return;
                }
                user.vouchers.forEach((vId, idx) => {
                    const item = findAnyCatalogItem(vId);
                    if (!item) return;
                    grid.innerHTML += `
                        <div class="card-item" style="background:#FFF8E7;">
                            <div><b>${item.icon} ${item.name}</b> <span class="tag">Phiếu quà</span></div>
                            <div style="font-size:12px;">${item.desc}</div>
                            <button class="btn btn-sm btn-primary" onclick="useVoucher(${idx})">🎟️ Dùng phiếu ngay</button>
                        </div>
                    `;
                });
                return;
            }

            if (tab === 'tv_card') {
                const cardIndices = [];
                user.inventory.forEach((id, i) => { if (id === 'tv_30min') cardIndices.push(i); });
                if (cardIndices.length === 0) {
                    grid.innerHTML = '<p style="color:#666; font-size:13px;">Chưa có Thẻ xem YouTube nào. Hãy mua tại <b>🏪 Siêu thị</b> nhé!</p>';
                    return;
                }
                grid.innerHTML += `
                    <div class="card-item" style="background:#FDEDEC;">
                        <div style="display:flex; gap:10px; align-items:center;">
                            <span style="font-size:32px;">📺</span>
                            <div>
                                <b>Thẻ Xem YouTube (+30 phút)</b>
                                <div style="font-size:12px; color:#555;">Số lượng trong túi: <b>${cardIndices.length} thẻ</b></div>
                            </div>
                        </div>
                        <button class="btn btn-sm btn-danger" onclick="useTvCardFromBag()">▶️ Kích hoạt cộng +30 phút xem Tivi</button>
                    </div>
                `;
                return;
            }

            if (tab === 'outfit') {
                const ownedFashion = user.inventory.map(id => FASHION_CATALOG.find(f => f.id === id)).filter(Boolean);
                if (ownedFashion.length === 0) {
                    grid.innerHTML = '<p style="color:#666; font-size:13px;">Chưa có trang phục nào. Hãy ghé <b>👗 Cửa Hàng Thời Trang</b> trên phố!</p>';
                    return;
                }
                ownedFashion.forEach(item => {
                    grid.innerHTML += `
                        <div class="card-item">
                            <div><b>${item.icon} ${item.name}</b></div>
                            <div style="font-size:12px; color:#27AE60;">🚪 Đã cất trong Tủ quần áo phòng riêng</div>
                        </div>
                    `;
                });
                return;
            }

            if (tab === 'lab') {
                const labItems = Array.isArray(user.customLabItems) ? user.customLabItems : [];
                if (labItems.length === 0) {
                    grid.innerHTML = '<p style="color:#666; font-size:13px;">Chưa có vật phẩm sáng tạo nào. Hãy ghé <b>🧪 Phòng Thí Nghiệm B2KS</b> trên phố để chế tạo bằng Tiếng Anh nhé!</p>';
                    return;
                }
                labItems.forEach(item => {
                    grid.innerHTML += `
                        <div class="card-item" style="background:#F0F9FF; border-color:#0284C7;">
                            <div style="display:flex; gap:10px; align-items:center;">
                                <div style="flex-shrink:0;">${renderItemIllustrationSVG(item.id, 52)}</div>
                                <div>
                                    <b style="color:#0369A1;">${item.name}</b>
                                    <div style="font-size:11px; color:#0284C7; font-style:italic;">"${item.prompt}"</div>
                                    <div style="font-size:11.5px; color:#475569; margin-top:2px;">${item.desc}</div>
                                </div>
                            </div>
                            <div style="font-size:11.5px; color:#0D9488;">✨ Có thể đặt lên <b>Slot trang trí</b> trong Phòng riêng!</div>
                        </div>
                    `;
                });
                return;
            }

            const ownedShopDecors = user.inventory.map(id => SHOP_CATALOG.find(i => i.id === id && i.category === 'decor')).filter(Boolean);
            const ownedLabDecors = Array.isArray(user.customLabItems) ? user.customLabItems : [];
            const ownedDecors = [...ownedShopDecors, ...ownedLabDecors];
            if (ownedDecors.length === 0) {
                grid.innerHTML = '<p style="color:#666; font-size:13px;">Chưa có đồ trang trí phòng. Hãy mua tại <b>🏪 Siêu thị</b>!</p>';
                return;
            }
            ownedDecors.forEach(item => {
                grid.innerHTML += `
                    <div class="card-item">
                        <div style="display:flex; gap:10px; align-items:center;">
                            ${renderItemIllustrationSVG(item.id, 48)}
                            <div>
                                <b>${item.name}</b>
                                <div style="font-size:11.5px; color:#555;">${item.desc}</div>
                            </div>
                        </div>
                        <div style="font-size:11.5px; color:#2980B9;">💡 Vào <b>Phòng riêng</b> để đính vật phẩm này lên các Slot trang trí!</div>
                    </div>
                `;
            });
        }

        function useVoucher(idx) {
            const user = getCurrentUser();
            const item = findAnyCatalogItem(user.vouchers[idx]);
            user.vouchers.splice(idx, 1);
            AudioEngine.playSuccess();
            triggerSpeechBubble(user, `Dùng phiếu: ${item.name}! 🎉`, false);
            showToast(`🎉 Đã kích hoạt: ${item.name}!`);
            renderBagModal('voucher'); saveGame();
        }

        function useTvCardFromBag() {
            const user = getCurrentUser();
            ensureMemberProps(user);
            const idx = user.inventory.indexOf('tv_30min');
            if (idx === -1) return showToast('⚠️ Bạn không còn Thẻ xem YouTube nào!');
            user.inventory.splice(idx, 1);
            user.tvBonusSecondsToday += 1800;
            AudioEngine.playSuccess();
            showToast('📺 Đã nạp thêm +30 phút xem YouTube hôm nay!');
            saveGame();
            if (document.getElementById('bag-modal').style.display === 'flex') renderBagModal('tv_card');
            if (document.getElementById('tv-modal').style.display === 'flex') updateTvStatusUI();
        }

        /* FASHION BOUTIQUE */
        let tryOnFashionState = { setItem: null, accItem: null };
        let currentFashionTab = 'set';

        function resetFashionTryOn(reRender = true) {
            tryOnFashionState = { setItem: null, accItem: null };
            drawFashionTryOnPreview();
            if (reRender) renderFashionStore(currentFashionTab);
        }

        function closeFashionModal() {
            tryOnFashionState = { setItem: null, accItem: null };
            closeModal('fashion-modal');
        }

        function tryOnFashionItem(itemId) {
            const item = FASHION_CATALOG.find(i => i.id === itemId);
            if (!item) return;
            AudioEngine.playClick();
            if (item.sub === 'set') {
                tryOnFashionState.setItem = (tryOnFashionState.setItem && tryOnFashionState.setItem.id === item.id) ? null : item;
            } else {
                tryOnFashionState.accItem = (tryOnFashionState.accItem && tryOnFashionState.accItem.id === item.id) ? null : item;
            }
            drawFashionTryOnPreview();
            renderFashionStore(currentFashionTab);
        }

        function drawFashionTryOnPreview() {
            const pCanvas = document.getElementById('fashion-tryon-canvas');
            if (!pCanvas) return;
            const pCtx = pCanvas.getContext('2d');
            pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);

            pCtx.fillStyle = '#FFF5F7';
            pCtx.fillRect(0, 0, pCanvas.width, pCanvas.height);
            pCtx.fillStyle = '#FADBD8';
            pCtx.beginPath();
            pCtx.ellipse(52, 105, 35, 9, 0, 0, Math.PI * 2);
            pCtx.fill();

            const user = getCurrentUser();
            const setIt = tryOnFashionState.setItem;
            const accIt = tryOnFashionState.accItem;

            const previewMember = {
                ...user,
                x: 52, y: 80, dir: 'down',
                shirtColor: setIt ? setIt.shirtColor : user.shirtColor,
                shirtPattern: setIt ? setIt.shirtPattern : user.shirtPattern,
                pantsColor: setIt ? setIt.pantsColor : user.pantsColor,
                pantsStyle: setIt ? setIt.pantsStyle : user.pantsStyle,
                outfit: accIt ? accIt.icon : user.outfit,
                speech: null
            };
            drawDetailedChibiOnContext(pCtx, previewMember, true, 1.3);

            const statusEl = document.getElementById('fashion-tryon-status');
            const ctrlEl = document.getElementById('fashion-tryon-controls');
            const activeLabels = [];
            if (setIt) activeLabels.push(setIt.name);
            if (accIt) activeLabels.push(accIt.name);

            if (activeLabels.length > 0) {
                statusEl.innerText = '✨ Đang mặc thử!';
                ctrlEl.innerHTML = `
                    <span class="tag" style="background:#FFF; border-color:#E91E63; color:#C2185B;">Đang thử: ${activeLabels.join(' + ')}</span>
                    <button type="button" class="btn btn-sm" style="background:#7F8C8D; padding:3px 7px; font-size:11px;" onclick="resetFashionTryOn(true)">↩️ Mặc lại đồ gốc</button>
                `;
            } else {
                statusEl.innerText = '👀 Phòng thử đồ';
                ctrlEl.innerHTML = `<span class="tag" style="background:#FFF;">Đang mặc trang phục hiện tại</span>`;
            }
        }

        function renderFashionItemPreviewMini(item) {
            if (item.sub === 'set') {
                return `
                    <div style="display:flex; align-items:center; gap:2px; background:#F8F9F9; border:1.5px solid #D5D8DC; border-radius:8px; padding:3px 5px; flex-shrink:0;">
                        ${renderShirtIconSVG({ color: item.shirtColor, pattern: item.shirtPattern }).replace('width="46" height="46"', 'width="36" height="36"')}
                        ${renderPantsIconSVG({ color: item.pantsColor, style: item.pantsStyle }).replace('width="46" height="46"', 'width="36" height="36"')}
                    </div>
                `;
            }
            return `
                <div style="width:48px; height:48px; display:flex; align-items:center; justify-content:center; font-size:30px; background:#F8F9F9; border:1.5px solid #D5D8DC; border-radius:8px; flex-shrink:0;">
                    ${item.icon}
                </div>
            `;
        }

        function renderFashionStore(subTab) {
            currentFashionTab = subTab || currentFashionTab;
            const grid = document.getElementById('fashion-items-grid');
            const user = getCurrentUser();
            grid.innerHTML = '';
            FASHION_CATALOG.filter(i => i.sub === currentFashionTab).forEach(item => {
                const owned = user.inventory.includes(item.id);
                const isTrying = (tryOnFashionState.setItem && tryOnFashionState.setItem.id === item.id) ||
                                 (tryOnFashionState.accItem && tryOnFashionState.accItem.id === item.id);
                grid.innerHTML += `
                    <div class="card-item" style="${isTrying ? 'border-color:#E91E63; background:#FFF8FA;' : ''}">
                        <div style="display:flex; gap:10px; align-items:flex-start;">
                            ${renderFashionItemPreviewMini(item)}
                            <div style="flex:1; min-width:0;">
                                <div style="font-weight:700; font-size:13.5px; color:#2C3E50;">${item.icon} ${item.name}</div>
                                <div style="font-size:11.5px; color:#555; margin-top:3px; line-height:1.35;">${item.desc}</div>
                            </div>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px; gap:6px; flex-wrap:wrap;">
                            <span class="points-pill">⭐ ${item.price}</span>
                            <div style="display:flex; gap:5px; align-items:center;">
                                <button type="button" class="btn btn-sm ${isTrying ? 'btn-purple' : 'btn-accent'}" onclick="tryOnFashionItem('${item.id}')">
                                    ${isTrying ? '✨ Đang thử' : '👀 Try on'}
                                </button>
                                ${owned
                                    ? `<span class="tag" style="background:#D4EDDA;">🚪 Đã có</span>`
                                    : `<button type="button" class="btn btn-sm btn-primary" onclick="buyFashionItem('${item.id}')">Đổi điểm</button>`
                                }
                            </div>
                        </div>
                    </div>
                `;
            });
            drawFashionTryOnPreview();
        }

        function buyFashionItem(itemId) {
            const user = getCurrentUser();
            const item = FASHION_CATALOG.find(i => i.id === itemId);
            if (!item || user.points < item.price) {
                AudioEngine.playError();
                return showToast(`❌ Bạn cần ${item ? item.price : 0}⭐ để mua trang phục này!`);
            }
            if (user.inventory.includes(item.id)) return;
            user.points -= item.price;
            user.inventory.push(item.id);
            AudioEngine.playCoin();
            showToast(`👗 Đã mua ${item.name}! Mở tủ quần áo ở phòng riêng để mặc nhé!`);
            updateHUD(); renderFashionStore(item.sub); saveGame();
        }

        /* HAIR SALON */
        let salonDraft = { hairStyle: 'short', hairColor: '#2C3E50' };

        function renderSalonModal() {
            const user = getCurrentUser();
            salonDraft = {
                hairStyle: user.hairStyle || 'short',
                hairColor: user.hairColor || '#2C3E50'
            };
            updateSalonUI();
        }

        function getSalonCost() {
            const user = getCurrentUser();
            let cost = 0;
            if (salonDraft.hairStyle !== (user.hairStyle || 'short')) cost += 15;
            if (salonDraft.hairColor.toLowerCase() !== (user.hairColor || '#2C3E50').toLowerCase()) cost += 10;
            return cost;
        }

        function updateSalonUI() {
            const hairGrid = document.getElementById('salon-hair-grid');
            hairGrid.innerHTML = '';
            HAIR_STYLES_VISUAL.forEach(h => {
                const sel = salonDraft.hairStyle === h.id ? 'selected' : '';
                hairGrid.innerHTML += `
                    <div class="visual-option-card ${sel}" onclick="selectSalonHair('${h.id}')">
                        ${renderHairIconSVG(h.id, salonDraft.hairColor)}
                        <span>${h.label}</span>
                    </div>
                `;
            });

            const colGrid = document.getElementById('salon-haircolor-grid');
            colGrid.innerHTML = '';
            HAIR_COLORS.forEach(c => {
                const sel = salonDraft.hairColor.toLowerCase() === c.toLowerCase() ? 'selected' : '';
                colGrid.innerHTML += `<div class="color-swatch ${sel}" style="background:${c};" onclick="selectSalonColor('${c}')"></div>`;
            });

            document.getElementById('salon-cost-pill').innerText = `${getSalonCost()}⭐`;

            const pCanvas = document.getElementById('salon-preview-canvas');
            if (pCanvas) {
                const pCtx = pCanvas.getContext('2d');
                pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
                pCtx.fillStyle = '#F5EEF8';
                pCtx.fillRect(0, 0, pCanvas.width, pCanvas.height);
                const user = getCurrentUser();
                const previewMember = {
                    ...user,
                    x: 50, y: 78, dir: 'down',
                    hairStyle: salonDraft.hairStyle,
                    hairColor: salonDraft.hairColor,
                    speech: null
                };
                drawDetailedChibiOnContext(pCtx, previewMember, true, 1.25);
            }
        }

        function selectSalonHair(style) {
            AudioEngine.playClick();
            salonDraft.hairStyle = style;
            updateSalonUI();
        }

        function selectSalonColor(color) {
            AudioEngine.playClick();
            salonDraft.hairColor = color;
            updateSalonUI();
        }

        function confirmSalonChange() {
            const user = getCurrentUser();
            const cost = getSalonCost();
            if (cost === 0) {
                return showToast('ℹ️ Bạn chưa chọn kiểu tóc hoặc màu tóc mới nào!');
            }
            if (user.points < cost) {
                AudioEngine.playError();
                return showToast(`❌ Bạn cần ${cost}⭐ để làm tóc tại Salon!`);
            }
            user.points -= cost;
            user.hairStyle = salonDraft.hairStyle;
            user.hairColor = salonDraft.hairColor;
            AudioEngine.playSuccess();
            triggerSpeechBubble(user, 'Love my new hairstyle! 💇✨', true);
            showToast(`💇 Đã đổi kiểu tóc mới (-${cost}⭐)!`);
            updateHUD(); updateSalonUI(); saveGame();
        }
