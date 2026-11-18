/* =========================================================================
           PRIVATE ROOM DEDICATED INTERACTIVE SCENE
           ========================================================================= */
        const PRIVATE_ROOM_WORLD = { width: 760, height: 420 };
        const ROOM_DECOR_SLOTS = [
            { id: 'slot_left_corner', label: 'Góc trái giường', x: 145, y: 315 },
            { id: 'slot_mid_left', label: 'Gần cửa sổ', x: 295, y: 245 },
            { id: 'slot_center', label: 'Trung tâm thảm', x: 435, y: 315 },
            { id: 'slot_right_wall', label: 'Góc phải tủ đồ', x: 585, y: 320 }
        ];

        let activePrivateRoomId = null;
        let selectedRoomSlotId = null;

        function getActivePrivateRoom() {
            const user = getCurrentUser();
            if (user.scene !== 'private_room') return null;
            const roomId = user.privateRoomId || activePrivateRoomId;
            return getHouseRooms().find(r => r.id === roomId) || null;
        }

        function enterPrivateRoomScene(room) {
            const user = getCurrentUser();
            activePrivateRoomId = room.id;
            user.scene = 'private_room';
            user.privateRoomId = room.id;
            user.x = 380;
            user.y = 335;
            user.dir = 'up';
            AudioEngine.playSuccess();
            showToast(`🚪 Bạn đã bước vào ${room.name}!`);
            syncPrivateRoomToolbar();
            updateHUD();
            saveGame();
        }

        function exitPrivateRoomToHallway() {
            const user = getCurrentUser();
            const roomId = user.privateRoomId || activePrivateRoomId;
            const room = getHouseRooms().find(r => r.id === roomId);
            user.scene = 'house';
            user.privateRoomId = null;
            activePrivateRoomId = null;
            if (room) {
                user.x = room.doorSide === 'right' ? 525 : 595;
                user.y = room.y + room.h - 45;
                user.dir = room.doorSide === 'right' ? 'right' : 'left';
            } else {
                user.x = 560;
                user.y = 450;
            }
            AudioEngine.playClick();
            showToast('🚪 Bạn đã ra hành lang cầu thang!');
            syncPrivateRoomToolbar();
            updateHUD();
            saveGame();
        }

        function getPrivateRoomPrimaryOwner(room) {
            if (!room || !room.ownerIds || room.ownerIds.length === 0) return null;
            return state.members.find(m => m.id === room.ownerIds[0]) || null;
        }

        function syncPrivateRoomToolbar() {
            const toolbar = document.getElementById('private-room-toolbar');
            if (!toolbar) return;
            const room = getActivePrivateRoom();
            if (!room) {
                toolbar.style.display = 'none';
                return;
            }
            const user = getCurrentUser();
            const isOwner = room.ownerIds && room.ownerIds.includes(user.id);
            toolbar.style.display = 'flex';
            document.getElementById('pr-room-badge').innerText = room.name;

            const privacyLabel = document.getElementById('pr-privacy-label');
            const wallSelect = document.getElementById('pr-wall-select');
            if (isOwner) {
                privacyLabel.style.display = 'flex';
                document.getElementById('pr-privacy-check').checked = !!user.roomUnlocked;
                wallSelect.style.display = 'inline-block';
                wallSelect.value = user.roomWall || room.wall;
            } else {
                privacyLabel.style.display = 'none';
                wallSelect.style.display = 'none';
            }
        }

        function togglePrivateRoomLockFromToolbar() {
            const user = getCurrentUser();
            user.roomUnlocked = document.getElementById('pr-privacy-check').checked;
            AudioEngine.playClick();
            showToast(user.roomUnlocked ? '🔓 Đã mở cửa phòng riêng!' : '🔒 Đã khóa phòng riêng!');
            saveGame();
        }

        function changePrivateRoomWallFromToolbar() {
            const user = getCurrentUser();
            user.roomWall = document.getElementById('pr-wall-select').value;
            AudioEngine.playClick();
            saveGame();
        }

        function openSlotPickerModal(slotId) {
            const room = getActivePrivateRoom();
            if (!room) return;
            const user = getCurrentUser();
            const isOwner = room.ownerIds && room.ownerIds.includes(user.id);
            if (!isOwner) {
                AudioEngine.playError();
                return showToast('🔒 Chỉ chủ phòng mới có thể trang trí phòng này!');
            }
            selectedRoomSlotId = slotId;
            openModal('slot-picker-modal');
            renderPrivateRoomSlotBar();
        }

        function renderPrivateRoomSlotBar() {
            const user = getCurrentUser();
            const room = getActivePrivateRoom();
            if (!room) return;
            const owner = getPrivateRoomPrimaryOwner(room) || user;
            if (!owner.roomSlots) owner.roomSlots = {};

            const slotDef = ROOM_DECOR_SLOTS.find(s => s.id === selectedRoomSlotId) || ROOM_DECOR_SLOTS[0];
            const currentAssignedId = owner.roomSlots[slotDef.id] || null;

            document.getElementById('slot-picker-title').innerText = `📌 ${slotDef.label}`;
            document.getElementById('pr-slot-instruction').innerHTML =
                `Chọn vật phẩm từ túi đồ để đặt tại <b style="color:#E67E22;">${slotDef.label}</b>:`;

            const bar = document.getElementById('pr-slot-items-bar');
            bar.innerHTML = '';

            if (currentAssignedId) {
                bar.innerHTML += `<button class="btn btn-sm btn-danger" onclick="assignDecorToRoomSlot(null)">❌ Gỡ vật phẩm khỏi vị trí này</button>`;
            }

            const ownedShopDecors = user.inventory.map(id => SHOP_CATALOG.find(i => i.id === id && i.category === 'decor')).filter(Boolean);
            const ownedLabDecors = Array.isArray(user.customLabItems) ? user.customLabItems : [];
            const ownedDecors = [...ownedShopDecors, ...ownedLabDecors];
            if (ownedDecors.length === 0) {
                bar.innerHTML += `<span style="font-size:12.5px; color:#666;">Túi đồ chưa có vật phẩm trang trí. Hãy mua tại <b>🏪 Siêu thị</b>!</span>`;
                return;
            }

            ownedDecors.forEach(d => {
                const isSelected = currentAssignedId === d.id;
                bar.innerHTML += `
                    <button class="btn btn-sm ${isSelected ? 'btn-primary' : 'btn-accent'}" onclick="assignDecorToRoomSlot('${d.id}')">
                        ${d.icon} ${d.name} ${isSelected ? '✓' : ''}
                    </button>
                `;
            });
        }

        function assignDecorToRoomSlot(decorId) {
            const room = getActivePrivateRoom();
            const owner = getPrivateRoomPrimaryOwner(room) || getCurrentUser();
            if (!owner.roomSlots) owner.roomSlots = {};
            if (!selectedRoomSlotId) selectedRoomSlotId = ROOM_DECOR_SLOTS[0].id;

            if (decorId) {
                owner.roomSlots[selectedRoomSlotId] = decorId;
                AudioEngine.playSuccess();
                showToast('✨ Đã đặt vật phẩm trang trí vào phòng!');
            } else {
                delete owner.roomSlots[selectedRoomSlotId];
                AudioEngine.playClick();
                showToast('🗑️ Đã gỡ vật phẩm trang trí.');
            }
            closeModal('slot-picker-modal');
            saveGame();
        }

        function drawPrivateRoomWorld(lighting) {
            const W = PRIVATE_ROOM_WORLD.width;
            const H = PRIVATE_ROOM_WORLD.height;
            const room = getActivePrivateRoom();
            const me = getCurrentUser();
            const ownerMember = getPrivateRoomPrimaryOwner(room);
            const isOwner = room && room.ownerIds && room.ownerIds.includes(me.id);

            ctx.fillStyle = '#1C2833';
            ctx.fillRect(-100, -100, W + 200, H + 200);

            const wallColor = (ownerMember && ownerMember.roomWall) || (room && room.wall) || '#D5F5E3';
            ctx.fillStyle = wallColor;
            ctx.fillRect(0, 0, W, 200);

            ctx.fillStyle = '#E59866';
            ctx.fillRect(0, 200, W, H - 200);

            ctx.strokeStyle = 'rgba(135, 54, 0, 0.16)';
            ctx.lineWidth = 2;
            for (let fy = 235; fy < H; fy += 35) {
                ctx.beginPath(); ctx.moveTo(0, fy); ctx.lineTo(W, fy); ctx.stroke();
            }

            ctx.fillStyle = '#873600';
            ctx.fillRect(0, 192, W, 10);

            ctx.strokeStyle = '#2C3E50';
            ctx.lineWidth = 6;
            ctx.strokeRect(0, 0, W, H);

            ctx.fillStyle = lighting.isNight ? '#1C2541' : '#AED6F1';
            ctx.strokeStyle = '#2C3E50';
            ctx.lineWidth = 3.5;
            ctx.fillRect(265, 42, 115, 88);
            ctx.strokeRect(265, 42, 115, 88);
            if (lighting.isNight) {
                ctx.fillStyle = '#F9E79F';
                ctx.beginPath(); ctx.arc(345, 68, 10, 0, Math.PI * 2); ctx.fill();
            }
            ctx.beginPath();
            ctx.moveTo(322.5, 42); ctx.lineTo(322.5, 130);
            ctx.moveTo(265, 86); ctx.lineTo(380, 86);
            ctx.stroke();

            ctx.fillStyle = '#8E44AD';
            ctx.strokeStyle = '#2C3E50';
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.roundRect(35, 145, 145, 110, 12); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#F5EEF8';
            ctx.fillRect(44, 180, 127, 68);
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(55, 154, 48, 20);
            ctx.fillRect(112, 154, 48, 20);
            ctx.fillStyle = '#2C3E50';
            ctx.font = 'bold 11px Fredoka';
            ctx.textAlign = 'center';
            ctx.fillText('🛏️ Giường ngủ', 107, 136);

            ctx.fillStyle = '#A04000';
            ctx.beginPath(); ctx.roundRect(445, 135, 95, 65, 6); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#F9E79F';
            ctx.fillRect(453, 145, 79, 16);
            ctx.fillStyle = '#85C1E9';
            ctx.fillRect(453, 168, 79, 16);
            ctx.fillStyle = '#2C3E50';
            ctx.fillText('📚 Kệ sách', 492, 126);

            const isWardrobeOpen = room && (wardrobeOpenedRoomId === room.id);
            ctx.fillStyle = '#873600';
            ctx.beginPath(); ctx.roundRect(625, 95, 95, 135, 8); ctx.fill(); ctx.stroke();
            if (isWardrobeOpen) {
                ctx.fillStyle = '#3E2723';
                ctx.fillRect(634, 105, 77, 110);
                ['#E74C3C', '#3498DB', '#F1C40F', '#2ECC71'].forEach((col, i) => {
                    ctx.fillStyle = col;
                    ctx.fillRect(640 + i * 17, 115, 13, 38);
                });
            } else {
                ctx.fillStyle = '#A04000';
                ctx.fillRect(633, 105, 37, 108); ctx.strokeRect(633, 105, 37, 108);
                ctx.fillRect(674, 105, 37, 108); ctx.strokeRect(674, 105, 37, 108);
                ctx.fillStyle = '#F1C40F';
                ctx.beginPath(); ctx.arc(665, 158, 3.5, 0, Math.PI * 2); ctx.arc(679, 158, 3.5, 0, Math.PI * 2); ctx.fill();
            }
            ctx.fillStyle = isOwner ? '#27AE60' : '#34495E';
            ctx.beginPath(); ctx.roundRect(628, 68, 88, 20, 6); ctx.fill();
            ctx.fillStyle = '#FFF';
            ctx.font = 'bold 11px Fredoka';
            ctx.textAlign = 'center';
            ctx.fillText(isOwner ? '🧥 Tủ quần áo' : '🔒 Tủ riêng', 672, 82);

            ctx.fillStyle = '#FADBD8';
            ctx.strokeStyle = '#E6B0AA';
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.ellipse(380, 290, 155, 52, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

            const slotsMap = (ownerMember && ownerMember.roomSlots) || {};
            ROOM_DECOR_SLOTS.forEach(slot => {
                const placedId = slotsMap[slot.id];
                ctx.save();
                ctx.strokeStyle = 'rgba(44, 62, 80, 0.55)';
                ctx.lineWidth = 2.2;
                ctx.setLineDash([6, 4]);
                ctx.beginPath();
                ctx.ellipse(slot.x, slot.y + 18, 36, 13, 0, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);

                if (placedId) {
                    drawWorldDecorItem(ctx, placedId, slot.x, slot.y);
                } else if (isOwner) {
                    ctx.fillStyle = 'rgba(255,255,255,0.75)';
                    ctx.beginPath();
                    ctx.arc(slot.x, slot.y, 16, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#2C3E50';
                    ctx.font = 'bold 15px Fredoka';
                    ctx.textAlign = 'center';
                    ctx.fillText('+', slot.x, slot.y + 5);
                }
                ctx.restore();
            });

            ctx.fillStyle = '#6E2C00';
            ctx.strokeStyle = '#2C3E50';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.roundRect(330, H - 36, 100, 36, [8, 8, 0, 0]);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#F9E79F';
            ctx.fillRect(342, H - 30, 32, 14);
            ctx.fillRect(386, H - 30, 32, 14);
            ctx.fillStyle = '#FFF';
            ctx.font = 'bold 10.5px Fredoka';
            ctx.textAlign = 'center';
            ctx.fillText('🚪 RA HÀNH LANG', 380, H - 5);

            if (lighting.isNight) {
                const grad = ctx.createRadialGradient(380, 120, 15, 380, 160, 260);
                grad.addColorStop(0, 'rgba(255, 243, 176, 0.34)');
                grad.addColorStop(1, 'rgba(255, 243, 176, 0)');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, W, H);
            }
        }

        /* LIVING ROOM SMART YOUTUBE TV */
        let tvTimerInterval = null;
        let currentTvVideoId = 'XqZsoesa55w';

        function getRemainingTvSeconds(member) {
            ensureMemberProps(member);
            if (isParent(member)) return Infinity;
            const limit = 1800 + (member.tvBonusSecondsToday || 0);
            return Math.max(0, limit - (member.tvSecondsUsedToday || 0));
        }

        function formatMMSS(sec) {
            if (!isFinite(sec)) return 'Không giới hạn (Bố/Mẹ)';
            const m = Math.floor(sec / 60);
            const s = sec % 60;
            return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        }

        function openTvModal() {
            const user = getCurrentUser();
            ensureMemberProps(user);
            updateTvStatusUI();
            const rem = getRemainingTvSeconds(user);
            const extLink = document.getElementById('tv-external-yt-link');
            if (extLink) extLink.href = `https://www.youtube.com/watch?v=${currentTvVideoId}`;
            const localHint = document.getElementById('tv-local-hint');
            if (localHint) localHint.style.display = (window.location.protocol === 'file:' || window.location.protocol === 'content:') ? 'block' : 'none';
            if (rem > 0) {
                document.getElementById('youtube-iframe').src = `https://www.youtube.com/embed/${currentTvVideoId}?autoplay=1`;
            } else {
                document.getElementById('youtube-iframe').src = '';
            }

            if (tvTimerInterval) clearInterval(tvTimerInterval);
            tvTimerInterval = setInterval(() => {
                if (document.getElementById('tv-modal').style.display !== 'flex') {
                    clearInterval(tvTimerInterval);
                    return;
                }
                const cur = getCurrentUser();
                if (!isParent(cur)) {
                    const left = getRemainingTvSeconds(cur);
                    if (left > 0) {
                        cur.tvSecondsUsedToday += 1;
                        saveGame();
                    }
                    if (getRemainingTvSeconds(cur) <= 0) {
                        document.getElementById('youtube-iframe').src = '';
                        showToast('⏰ Đã hết 30 phút xem YouTube hôm nay! Hãy dùng thẻ xem YouTube nếu có.');
                    }
                }
                updateTvStatusUI();
            }, 1000);
        }

        function closeTvModal() {
            if (tvTimerInterval) clearInterval(tvTimerInterval);
            document.getElementById('youtube-iframe').src = '';
            closeModal('tv-modal');
        }

        function switchTvChannel(videoId, label) {
            const user = getCurrentUser();
            if (getRemainingTvSeconds(user) <= 0) {
                AudioEngine.playError();
                return showToast('⏰ Bạn đã hết thời gian xem YouTube hôm nay!');
            }
            AudioEngine.playClick();
            currentTvVideoId = videoId;
            const extLink = document.getElementById('tv-external-yt-link');
            if (extLink) extLink.href = `https://www.youtube.com/watch?v=${videoId}`;
            document.getElementById('youtube-iframe').src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
            showToast(`📺 Đang phát: ${label}`);
        }

        function updateTvStatusUI() {
            const user = getCurrentUser();
            const rem = getRemainingTvSeconds(user);
            const timeEl = document.getElementById('tv-time-remaining');
            const actionEl = document.getElementById('tv-card-action');

            if (isParent(user)) {
                timeEl.innerHTML = `👑 Chế độ Bố/Mẹ: <b>Không giới hạn thời gian</b>`;
                actionEl.innerHTML = '';
            } else {
                timeEl.innerHTML = `⏳ Thời gian xem YouTube còn lại hôm nay: <b style="color:${rem <= 120 ? '#E74C3C' : '#27AE60'};">${formatMMSS(rem)}</b>`;
                const cardCount = user.inventory.filter(id => id === 'tv_30min').length;
                if (cardCount > 0) {
                    actionEl.innerHTML = `<button class="btn btn-sm btn-accent" onclick="useTvCardFromBag()">🎟️ Dùng Thẻ +30p (Có ${cardCount})</button>`;
                } else {
                    actionEl.innerHTML = `<span class="tag">Hết thẻ +30p (Mua tại Siêu thị)</span>`;
                }
            }
        }

        function renderDonateModal() {
            const user = getCurrentUser();
            document.getElementById('donate-avail').innerText = user.points;
            const sel = document.getElementById('donate-recipient');
            sel.innerHTML = '';
            state.members.filter(m => m.id !== user.id).forEach(m => {
                sel.innerHTML += `<option value="${m.id}">${m.name} (${m.role}) - Có ${m.points}⭐</option>`;
            });
        }

        function sendDonation() {
            const sender = getCurrentUser();
            const recId = document.getElementById('donate-recipient').value;
            const amount = parseInt(document.getElementById('donate-amount').value) || 0;
            const note = document.getElementById('donate-note').value.trim();

            if (amount <= 0 || sender.points < amount) {
                AudioEngine.playError();
                return showToast('❌ Số điểm không hợp lệ!');
            }
            const receiver = state.members.find(m => m.id === recId);
            sender.points -= amount;
            receiver.points = isParent(receiver) ? Math.min(MAX_PARENT_POINTS, receiver.points + amount) : receiver.points + amount;

            closeModal('donate-modal');
            AudioEngine.playCoin();
            triggerSpeechBubble(sender, `Tặng ${receiver.name} +${amount}⭐! ${note}`, false);
            showToast(`💸 Đã tặng ${amount}⭐ cho ${receiver.name}!`);
            updateHUD(); saveGame();
        }

        /* VISUAL CHARACTER & CLOTHING CUSTOMIZATION */
        let draftChar = {
            hairStyle: 'short',
            hairColor: '#2C3E50',
            shirtColor: '#2980B9',
            shirtPattern: 'collar',
            pantsColor: '#34495E',
            pantsStyle: 'pants',
            outfit: ''
        };

        function switchCustomTab(tab) {
            document.getElementById('custom-tab-char').style.display = tab === 'char' ? 'block' : 'none';
            document.getElementById('custom-tab-room').style.display = tab === 'room' ? 'block' : 'none';
            document.getElementById('custom-tab-house').style.display = tab === 'house' ? 'block' : 'none';
        }

        function renderHairIconSVG(style, color) {
            if (style === 'spiky') {
                return `<svg width="46" height="46" viewBox="0 0 60 60">
                    <circle cx="30" cy="34" r="16" fill="#FFE0BD" stroke="#2C3E50" stroke-width="2.5"/>
                    <path d="M14 30 C14 14, 46 14, 46 30 L42 10 L34 18 L30 6 L25 18 L18 10 Z" fill="${color}" stroke="#2C3E50" stroke-width="2.5"/>
                    <circle cx="24" cy="35" r="2" fill="#2C3E50"/><circle cx="36" cy="35" r="2" fill="#2C3E50"/>
                </svg>`;
            }
            if (style === 'long') {
                return `<svg width="46" height="46" viewBox="0 0 60 60">
                    <rect x="11" y="20" width="38" height="32" rx="10" fill="${color}" stroke="#2C3E50" stroke-width="2.5"/>
                    <circle cx="30" cy="33" r="15" fill="#FFE0BD" stroke="#2C3E50" stroke-width="2.5"/>
                    <path d="M15 30 A15 15 0 0 1 45 30 Z" fill="${color}" stroke="#2C3E50" stroke-width="2.5"/>
                    <circle cx="24" cy="34" r="2" fill="#2C3E50"/><circle cx="36" cy="34" r="2" fill="#2C3E50"/>
                </svg>`;
            }
            if (style === 'pigtails') {
                return `<svg width="46" height="46" viewBox="0 0 60 60">
                    <circle cx="11" cy="28" r="8" fill="${color}" stroke="#2C3E50" stroke-width="2.5"/>
                    <circle cx="49" cy="28" r="8" fill="${color}" stroke="#2C3E50" stroke-width="2.5"/>
                    <circle cx="30" cy="33" r="15" fill="#FFE0BD" stroke="#2C3E50" stroke-width="2.5"/>
                    <path d="M15 30 A15 15 0 0 1 45 30 Z" fill="${color}" stroke="#2C3E50" stroke-width="2.5"/>
                    <circle cx="24" cy="34" r="2" fill="#2C3E50"/><circle cx="36" cy="34" r="2" fill="#2C3E50"/>
                </svg>`;
            }
            return `<svg width="46" height="46" viewBox="0 0 60 60">
                <circle cx="30" cy="34" r="16" fill="#FFE0BD" stroke="#2C3E50" stroke-width="2.5"/>
                <path d="M14 31 A16 16 0 0 1 46 31 Z" fill="${color}" stroke="#2C3E50" stroke-width="2.5"/>
                <circle cx="24" cy="35" r="2" fill="#2C3E50"/><circle cx="36" cy="35" r="2" fill="#2C3E50"/>
            </svg>`;
        }

        function renderShirtIconSVG(opt) {
            let detail = '';
            if (opt.pattern === 'collar') {
                detail = `<polygon points="24,14 30,22 36,14" fill="#FFFFFF" stroke="#2C3E50" stroke-width="1.5"/>`;
            } else if (opt.pattern === 'stripe') {
                detail = `<rect x="17" y="27" width="26" height="5" fill="rgba(255,255,255,0.75)"/>`;
            } else if (opt.pattern === 'star') {
                detail = `<text x="30" y="34" font-size="13" text-anchor="middle" fill="#FFE66D">★</text>`;
            } else if (opt.pattern === 'heart') {
                detail = `<text x="30" y="34" font-size="13" text-anchor="middle" fill="#FFCDD2">♥</text>`;
            } else if (opt.pattern === 'vest') {
                detail = `<polygon points="24,14 30,32 36,14" fill="#FFFFFF" stroke="#2C3E50" stroke-width="1.5"/><line x1="30" y1="32" x2="30" y2="46" stroke="#2C3E50" stroke-width="2"/>`;
            }
            return `<svg width="46" height="46" viewBox="0 0 60 60">
                <path d="M18 14 L8 22 L13 30 L17 26 L17 46 L43 46 L43 26 L47 30 L52 22 L42 14 L36 14 Q30 20 24 14 Z" fill="${opt.color}" stroke="#2C3E50" stroke-width="2.5" stroke-linejoin="round"/>
                ${detail}
            </svg>`;
        }

        function renderPantsIconSVG(opt) {
            if (opt.style === 'skirt') {
                return `<svg width="46" height="46" viewBox="0 0 60 60">
                    <polygon points="20,14 40,14 48,44 12,44" fill="${opt.color}" stroke="#2C3E50" stroke-width="2.5" stroke-linejoin="round"/>
                    <rect x="20" y="14" width="20" height="5" fill="rgba(255,255,255,0.3)" stroke="#2C3E50" stroke-width="2"/>
                    <line x1="25" y1="20" x2="22" y2="44" stroke="rgba(0,0,0,0.25)" stroke-width="2"/>
                    <line x1="35" y1="20" x2="38" y2="44" stroke="rgba(0,0,0,0.25)" stroke-width="2"/>
                </svg>`;
            }
            if (opt.style === 'shorts') {
                return `<svg width="46" height="46" viewBox="0 0 60 60">
                    <path d="M18 14 L42 14 L45 34 L32 34 L30 25 L28 34 L15 34 Z" fill="${opt.color}" stroke="#2C3E50" stroke-width="2.5" stroke-linejoin="round"/>
                    <rect x="18" y="14" width="24" height="5" fill="rgba(255,255,255,0.25)" stroke="#2C3E50" stroke-width="2"/>
                </svg>`;
            }
            return `<svg width="46" height="46" viewBox="0 0 60 60">
                <path d="M18 14 L42 14 L44 48 L33 48 L30 27 L27 48 L16 48 Z" fill="${opt.color}" stroke="#2C3E50" stroke-width="2.5" stroke-linejoin="round"/>
                <rect x="18" y="14" width="24" height="5" fill="rgba(255,255,255,0.25)" stroke="#2C3E50" stroke-width="2"/>
            </svg>`;
        }

        function renderVisualCharacterPickers() {
            const user = getCurrentUser();

            const setGrid = document.getElementById('visual-fashion-set-grid');
            setGrid.innerHTML = '';
            const ownedSets = user.inventory.map(id => FASHION_CATALOG.find(f => f.id === id && f.sub === 'set')).filter(Boolean);
            if (ownedSets.length === 0) {
                setGrid.innerHTML = `<div style="grid-column:1/-1; font-size:12px; color:#666; padding:6px; background:#F8F9F9; border-radius:8px;">Chưa mua Set trang phục nào. Hãy ghé <b>👗 Cửa Hàng Thời Trang</b> trên phố!</div>`;
            } else {
                ownedSets.forEach(st => {
                    const isApplied = (draftChar.shirtColor === st.shirtColor && draftChar.shirtPattern === st.shirtPattern && draftChar.pantsColor === st.pantsColor && draftChar.pantsStyle === st.pantsStyle);
                    setGrid.innerHTML += `
                        <div class="visual-option-card ${isApplied ? 'selected' : ''}" onclick="applyFashionSet('${st.id}')">
                            <span style="font-size:24px;">${st.icon}</span>
                            <span>${st.name}</span>
                        </div>
                    `;
                });
            }

            const shirtGrid = document.getElementById('visual-shirt-grid');
            shirtGrid.innerHTML = '';
            SHIRT_VISUAL_OPTIONS.forEach(s => {
                const sel = (draftChar.shirtColor.toLowerCase() === s.color.toLowerCase() && draftChar.shirtPattern === s.pattern) ? 'selected' : '';
                shirtGrid.innerHTML += `
                    <div class="visual-option-card ${sel}" onclick="selectDraftShirt('${s.color}', '${s.pattern}')">
                        ${renderShirtIconSVG(s)}
                        <span>${s.label}</span>
                    </div>
                `;
            });

            const pantsGrid = document.getElementById('visual-pants-grid');
            pantsGrid.innerHTML = '';
            PANTS_VISUAL_OPTIONS.forEach(p => {
                const sel = (draftChar.pantsColor.toLowerCase() === p.color.toLowerCase() && draftChar.pantsStyle === p.style) ? 'selected' : '';
                pantsGrid.innerHTML += `
                    <div class="visual-option-card ${sel}" onclick="selectDraftPants('${p.color}', '${p.style}')">
                        ${renderPantsIconSVG(p)}
                        <span>${p.label}</span>
                    </div>
                `;
            });

            const outfitGrid = document.getElementById('visual-outfit-grid');
            outfitGrid.innerHTML = `
                <div class="visual-option-card ${draftChar.outfit === '' ? 'selected' : ''}" style="padding:5px 10px;" onclick="selectDraftOutfit('')">
                    <span style="font-size:18px;">🚫</span>
                    <span>Không đeo</span>
                </div>
            `;
            user.inventory.forEach(itemId => {
                const item = FASHION_CATALOG.find(i => i.id === itemId && (i.sub === 'hat' || i.sub === 'acc'));
                if (item) {
                    const sel = draftChar.outfit === item.icon ? 'selected' : '';
                    outfitGrid.innerHTML += `
                        <div class="visual-option-card ${sel}" style="padding:5px 10px;" onclick="selectDraftOutfit('${item.icon}')">
                            <span style="font-size:18px;">${item.icon}</span>
                            <span>${item.name.split(' ').slice(0, 2).join(' ')}</span>
                        </div>
                    `;
                }
            });

            drawCharPreview();
        }

        function applyFashionSet(setId) {
            const st = FASHION_CATALOG.find(f => f.id === setId);
            if (!st) return;
            AudioEngine.playClick();
            draftChar.shirtColor = st.shirtColor;
            draftChar.shirtPattern = st.shirtPattern;
            draftChar.pantsColor = st.pantsColor;
            draftChar.pantsStyle = st.pantsStyle;
            renderVisualCharacterPickers();
        }

        function selectDraftShirt(color, pattern) {
            AudioEngine.playClick();
            draftChar.shirtColor = color;
            draftChar.shirtPattern = pattern;
            renderVisualCharacterPickers();
        }

        function selectDraftPants(color, style) {
            AudioEngine.playClick();
            draftChar.pantsColor = color;
            draftChar.pantsStyle = style;
            renderVisualCharacterPickers();
        }

        function selectDraftOutfit(icon) {
            AudioEngine.playClick();
            draftChar.outfit = icon;
            renderVisualCharacterPickers();
        }

        function drawCharPreview() {
            const pCanvas = document.getElementById('char-preview-canvas');
            if (!pCanvas) return;
            const pCtx = pCanvas.getContext('2d');
            pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);

            pCtx.fillStyle = '#D6EAF8';
            pCtx.fillRect(0, 0, pCanvas.width, pCanvas.height);
            pCtx.fillStyle = '#AED6F1';
            pCtx.beginPath();
            pCtx.ellipse(55, 108, 36, 10, 0, 0, Math.PI * 2);
            pCtx.fill();

            const previewMember = {
                x: 55, y: 82, dir: 'down',
                name: document.getElementById('custom-char-name').value.trim() || getCurrentUser().name,
                hairStyle: draftChar.hairStyle,
                hairColor: draftChar.hairColor,
                shirtColor: draftChar.shirtColor,
                shirtPattern: draftChar.shirtPattern,
                pantsColor: draftChar.pantsColor,
                pantsStyle: draftChar.pantsStyle,
                outfit: draftChar.outfit,
                speech: null
            };
            drawDetailedChibiOnContext(pCtx, previewMember, true, 1.35);
        }

        function renderCustomModal() {
            const user = getCurrentUser();
            const myRoom = getMemberPrivateRoom(user);
            const inOwnPrivateRoom = myRoom && user.scene === 'private_room' && (user.privateRoomId || activePrivateRoomId) === myRoom.id;
            const canUseWardrobe = isMemberAtOwnWardrobe(user) || (myRoom && wardrobeOpenedRoomId === myRoom.id && (inOwnPrivateRoom || (user.scene === 'house' && getRoomAtPosition(user.x, user.y)?.id === myRoom.id)));

            const lockedBanner = document.getElementById('wardrobe-locked-banner');
            const controlsWrap = document.getElementById('wardrobe-controls-wrapper');
            if (canUseWardrobe) {
                lockedBanner.style.display = 'none';
                controlsWrap.style.display = 'block';
            } else {
                lockedBanner.style.display = 'block';
                controlsWrap.style.display = 'none';
            }

            document.getElementById('custom-char-name').value = user.name;
            draftChar = {
                hairStyle: user.hairStyle || 'short',
                hairColor: user.hairColor || '#2C3E50',
                shirtColor: user.shirtColor || '#2980B9',
                shirtPattern: user.shirtPattern || 'collar',
                pantsColor: user.pantsColor || '#34495E',
                pantsStyle: user.pantsStyle || 'pants',
                outfit: user.outfit || ''
            };
            renderVisualCharacterPickers();

            document.getElementById('room-privacy-toggle').checked = user.roomUnlocked;
            document.getElementById('room-wall-color').value = user.roomWall || '#FADBD8';

            const decorInv = document.getElementById('room-decor-inventory');
            decorInv.innerHTML = '';
            const ownedDecors = user.inventory.map(id => SHOP_CATALOG.find(i => i.id === id && i.category === 'decor')).filter(Boolean);
            if (ownedDecors.length === 0) {
                decorInv.innerHTML = '<p style="font-size:12px; color:#666;">Hãy mua đồ nội thất ở Cửa hàng trước nhé!</p>';
            } else {
                ownedDecors.forEach(d => {
                    decorInv.innerHTML += `
                        <div class="card-item" style="flex-direction:row; align-items:center;">
                            <span>${d.icon} <b>${d.name}</b></span>
                            <button class="btn btn-sm btn-accent" onclick="placeDecorInRoom('${d.id}')">Đặt tại chỗ đứng</button>
                        </div>
                    `;
                });
            }

            if (isParent(user)) {
                document.getElementById('house-builder-locked').style.display = 'none';
                document.getElementById('house-builder-controls').style.display = 'block';
                document.getElementById('house-plot-select').value = state.house.plotIndex;
                document.getElementById('house-style-select').value = state.house.style;
            } else {
                document.getElementById('house-builder-locked').style.display = 'block';
                document.getElementById('house-builder-controls').style.display = 'none';
            }
        }

        function saveCharCustom() {
            const user = getCurrentUser();
            const myRoom = getMemberPrivateRoom(user);
            const curRoom = user.scene === 'private_room' ? getActivePrivateRoom() : getRoomAtPosition(user.x, user.y);
            if ((user.scene !== 'house' && user.scene !== 'private_room') || !myRoom || !curRoom || curRoom.id !== myRoom.id) {
                AudioEngine.playError();
                return showToast('🔒 Bạn chỉ có thể đổi trang phục khi mở tủ quần áo ở phòng riêng!');
            }
            const newName = document.getElementById('custom-char-name').value.trim();
            if (newName) user.name = newName;
            user.hairStyle = draftChar.hairStyle;
            user.hairColor = draftChar.hairColor;
            user.shirtColor = draftChar.shirtColor;
            user.shirtPattern = draftChar.shirtPattern;
            user.pantsColor = draftChar.pantsColor;
            user.pantsStyle = draftChar.pantsStyle;
            user.outfit = draftChar.outfit;
            AudioEngine.playSuccess();
            showToast('✨ Đã lưu ngoại hình & trang phục!');
            updateHUD(); saveGame();
        }

        function addNewFamilyMember() {
            const name = document.getElementById('new-member-name').value.trim();
            const role = document.getElementById('new-member-role').value;
            if (!name) return;
            state.members.push({
                id: 'member_' + Date.now(), name, role,
                points: (role === 'Bố' || role === 'Mẹ') ? 150 : 30,
                hairStyle: role === 'Con gái' ? 'pigtails' : 'short',
                hairColor: '#2C3E50',
                shirtColor: '#E67E22', shirtPattern: 'star',
                pantsColor: '#34495E', pantsStyle: role === 'Con gái' ? 'skirt' : 'pants',
                outfit: '', inventory: [], vouchers: [],
                roomUnlocked: false, roomWall: '#FCF3CF', roomDecor: [],
                scene: 'house', x: 560, y: 650, dir: 'down', speech: null
            });
            document.getElementById('new-member-name').value = '';
            AudioEngine.playSuccess();
            showToast(`👨‍👩‍👧‍👦 Đã thêm thành viên: ${name}!`);
            updateHUD(); saveGame();
        }

        function toggleRoomPrivacy() {
            const user = getCurrentUser();
            user.roomUnlocked = document.getElementById('room-privacy-toggle').checked;
            AudioEngine.playClick();
            showToast(user.roomUnlocked ? '🔓 Đã mở cửa phòng riêng!' : '🔒 Đã khóa phòng riêng!');
            saveGame();
        }

        function changeRoomWall() {
            const user = getCurrentUser();
            user.roomWall = document.getElementById('room-wall-color').value;
            saveGame();
        }

        function placeDecorInRoom(decorId) {
            const user = getCurrentUser();
            const item = SHOP_CATALOG.find(i => i.id === decorId);
            if (!item) return;
            if (user.scene !== 'house') {
                return showToast('⚠️ Hãy bước vào trong phòng riêng của bạn trước khi đặt đồ nội thất!');
            }
            const currentRoom = getRoomAtPosition(user.x, user.y);
            if (!currentRoom || !currentRoom.ownerIds || !currentRoom.ownerIds.includes(user.id)) {
                return showToast('⚠️ Bạn chỉ có thể đặt đồ trang trí bên trong phòng riêng của mình!');
            }
            user.roomDecor.push({ id: item.id, icon: item.icon, x: user.x, y: user.y - 10 });
            closeModal('custom-modal');
            AudioEngine.playSuccess();
            showToast(`🛋️ Đã đặt ${item.name} vào phòng!`);
            saveGame();
        }

        function updateHouseDesign() {
            const user = getCurrentUser();
            if (!isParent(user)) return;
            state.house.plotIndex = parseInt(document.getElementById('house-plot-select').value);
            state.house.style = document.getElementById('house-style-select').value;
            closeModal('custom-modal');
            AudioEngine.playSuccess();
            showToast('🏢 Đã cập nhật kiến trúc Nhà Phố Gia Đình!');
            saveGame();
        }
