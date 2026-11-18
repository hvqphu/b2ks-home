/* =========================================================================
           8. ĐIỀU KHIỂN DI CHUYỂN, VA CHẠM PHÒNG & ĐIỂM TƯƠNG TÁC TRÊN BẢN ĐỒ
           ========================================================================= */
        const keys = {};
        window.addEventListener('keydown', e => {
            if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
            keys[e.key.toLowerCase()] = true;
            if (e.key === ' ' || e.key === 'Enter') {
                if (currentInteractTarget) triggerCurrentInteraction();
            }
        });
        window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

        // Mobile Virtual Joystick
        let joyActive = false;
        let joyVector = { x: 0, y: 0 };
        const joyZone = document.getElementById('joystick-zone');
        const joyKnob = document.getElementById('joystick-knob');

        if (joyZone && joyKnob) {
            const handleJoyMove = (clientX, clientY) => {
                const rect = joyZone.getBoundingClientRect();
                const cx = rect.left + rect.width / 2;
                const cy = rect.top + rect.height / 2;
                let dx = clientX - cx;
                let dy = clientY - cy;
                const maxR = 36;
                const dist = Math.hypot(dx, dy);
                if (dist > maxR) {
                    dx = (dx / dist) * maxR;
                    dy = (dy / dist) * maxR;
                }
                joyKnob.style.transform = `translate(${dx}px, ${dy}px)`;
                joyVector = { x: dx / maxR, y: dy / maxR };
            };

            joyZone.addEventListener('touchstart', e => {
                e.preventDefault();
                joyActive = true;
                handleJoyMove(e.touches[0].clientX, e.touches[0].clientY);
            }, { passive: false });

            joyZone.addEventListener('touchmove', e => {
                e.preventDefault();
                if (!joyActive) return;
                handleJoyMove(e.touches[0].clientX, e.touches[0].clientY);
            }, { passive: false });

            const endJoy = () => {
                joyActive = false;
                joyVector = { x: 0, y: 0 };
                joyKnob.style.transform = 'translate(0px, 0px)';
            };
            joyZone.addEventListener('touchend', endJoy);
            joyZone.addEventListener('touchcancel', endJoy);
        }

        function changeZoom(delta) {
            zoomLevel = Math.max(0.65, Math.min(1.55, zoomLevel + delta));
            AudioEngine.playClick();
        }

        function getRoomAtPosition(x, y) {
            return HOUSE_ROOMS.find(r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) || null;
        }

        function canMoveInsideHouse(member, nx, ny) {
            if (nx < 25 || nx > HOUSE_WORLD.width - 25 || ny < 105 || ny > HOUSE_WORLD.height - 25) {
                return { allowed: false, blockedRoom: null };
            }
            const targetRoom = getRoomAtPosition(nx, ny);
            if (targetRoom && targetRoom.ownerIds && targetRoom.ownerIds.length > 0) {
                const isLocked = !!state.roomLocks[targetRoom.id];
                const isOwner = targetRoom.ownerIds.includes(member.id) || isParent(member);
                if (isLocked && !isOwner) {
                    return { allowed: false, blockedRoom: targetRoom };
                }
            }
            return { allowed: true, blockedRoom: null };
        }

        function getWorldInteractables() {
            const me = getCurrentUser();
            if (me.scene === 'house') {
                return [
                    { id: 'exit_house', label: '🚪 Ra Khu Phố', x: 550, y: 130, radius: 68 },
                    { id: 'lab_table', label: '🧪 Bàn Thí Nghiệm Sáng Tạo', x: 330, y: 235, radius: 72 },
                    { id: 'dining_table', label: '🍽️ Bàn Ăn Tiếng Anh (+2⭐)', x: 715, y: 270, radius: 78 },
                    { id: 'bath_brush', label: '🪥 Đánh Răng & Rửa Mặt (+2⭐)', x: 916, y: 235, radius: 62 },
                    { id: 'bath_shower', label: '🚿 Tắm Rửa Sạch Sẽ (+2⭐)', x: 1015, y: 265, radius: 68 }
                ];
            }

            if (me.scene === 'private_room') {
                const roomId = me.privateRoomId || activePrivateRoomId || 'parents_room';
                const room = HOUSE_ROOMS.find(r => r.id === roomId) || HOUSE_ROOMS[3];
                const isOwner = room.ownerIds.includes(me.id) || isParent(me);
                const items = [
                    { id: 'exit_private_room', label: '⬇️ Ra Hành Lang', x: 380, y: 485, radius: 68 },
                    { id: 'room_sleep', label: '🛏️ Đi Ngủ Đúng Giờ (+3⭐)', x: 160, y: 285, radius: 85 }
                ];
                if (isOwner) {
                    items.push({ id: 'toggle_room_lock', label: state.roomLocks[roomId] ? '🔓 Mở Khóa Phòng' : '🔒 Khóa Cửa Phòng', x: 380, y: 280, radius: 80 });
                    items.push({ id: 'room_decor', label: '🛋️ Trang Trí Phòng Riêng', x: 595, y: 265, radius: 85 });
                }
                return items;
            }

            // Khu phố mở rộng (Neighborhood v19)
            return [
                { id: 'enter_house', label: '🏡 Vào Nhà Gia Đình', x: 220, y: 365, radius: 75 },
                { id: 'open_supermarket', label: '🛒 Vào Siêu Thị Mini', x: 550, y: 365, radius: 75 },
                { id: 'open_fashion', label: '👗 Cửa Hàng Thời Trang', x: 860, y: 365, radius: 75 },
                { id: 'open_flea_market', label: '🎪 Chợ Trời Flea Market', x: 1170, y: 365, radius: 75 },
                { id: 'open_arcade', label: '🎠 Khu Vui Chơi Arcade', x: 1505, y: 365, radius: 85 },
                { id: 'open_salon', label: '💇 Tiệm Tóc & Spa', x: 1830, y: 365, radius: 75 },
                { id: 'open_interworld', label: '🌌 Trung Tâm Giao Dịch Xuyên Thế Giới', x: 2155, y: 365, radius: 88 },
                { id: 'open_zoo', label: '🦁 Tham Quan Sở Thú Ảo B2KS Zoo', x: 2505, y: 365, radius: 92 }
            ];
        }

        function triggerCurrentInteraction() {
            if (!currentInteractTarget) return;
            const me = getCurrentUser();
            const id = currentInteractTarget.id;

            if (id === 'exit_house') {
                me.scene = 'neighborhood';
                me.x = 220;
                me.y = 385;
                AudioEngine.playClick();
                showToast('🌳 Bạn đã ra ngoài Khu Phố B2KS!');
            } else if (id === 'enter_house') {
                me.scene = 'house';
                me.x = 550;
                me.y = 155;
                AudioEngine.playClick();
                showToast('🏡 Chào mừng về nhà!');
            } else if (id === 'exit_private_room') {
                exitPrivateRoomToHallway();
                return;
            } else if (id === 'lab_table') {
                openLabModal();
            } else if (id === 'dining_table') {
                openDiningFoodPuzzleModal();
            } else if (id === 'bath_brush') {
                performRoutineActivity(me, 'brush');
            } else if (id === 'bath_shower') {
                performRoutineActivity(me, 'shower');
            } else if (id === 'room_sleep') {
                performRoutineActivity(me, 'sleep');
            } else if (id === 'toggle_room_lock') {
                const roomId = me.privateRoomId || activePrivateRoomId;
                state.roomLocks[roomId] = !state.roomLocks[roomId];
                AudioEngine.playClick();
                showToast(state.roomLocks[roomId] ? '🔒 Đã khóa cửa phòng riêng!' : '🔓 Đã mở khóa cửa phòng!');
            } else if (id === 'room_decor') {
                openRoomDecorModal();
            } else if (id === 'open_supermarket') {
                openMarketModal('supermarket');
            } else if (id === 'open_fashion') {
                openMarketModal('fashion');
            } else if (id === 'open_flea_market') {
                openFleaMarketModal();
            } else if (id === 'open_arcade') {
                openArcadeModal();
            } else if (id === 'open_salon') {
                openSalonModal();
            } else if (id === 'open_interworld') {
                openInterworldModal();
            } else if (id === 'open_zoo') {
                openZooModal();
            }
            lastHudSignature = '';
            updateHUD();
            saveGame();
        }

        /* =========================================================================
           8B. BẢN ĐỒ DỊCH CHUYỂN NHANH (MAP PORTAL)
           ========================================================================= */
        function openMapPortalModal() {
            AudioEngine.playClick();
            const spots = [
                { name: '🏡 Trong Nhà (Phòng Khách)', scene: 'house', x: 250, y: 270 },
                { name: '🍳 Bếp & Phòng Ăn', scene: 'house', x: 620, y: 270 },
                { name: '🛒 Siêu Thị Mini', scene: 'neighborhood', x: 550, y: 385 },
                { name: '👗 Cửa Hàng Thời Trang', scene: 'neighborhood', x: 860, y: 385 },
                { name: '🎪 Chợ Trời Flea Market', scene: 'neighborhood', x: 1170, y: 385 },
                { name: '🎠 Khu Vui Chơi Arcade', scene: 'neighborhood', x: 1505, y: 385 },
                { name: '💇 Tiệm Tóc & Spa', scene: 'neighborhood', x: 1830, y: 385 },
                { name: '🌌 Trung Tâm Xuyên Thế Giới', scene: 'neighborhood', x: 2155, y: 385 },
                { name: '🦁 Sở Thú Ảo B2KS Zoo', scene: 'neighborhood', x: 2505, y: 385 }
            ];

            document.getElementById('map-portal-grid').innerHTML = spots.map((s, idx) => `
                <button type="button" class="btn btn-secondary" style="justify-content:flex-start; padding:12px;" onclick="teleportToSpot('${s.scene}', ${s.x}, ${s.y}, '${s.name}')">
                    ${s.name}
                </button>
            `).join('');
            document.getElementById('map-portal-modal').style.display = 'flex';
        }

        function teleportToSpot(scene, x, y, label) {
            const me = getCurrentUser();
            me.scene = scene;
            me.privateRoomId = null;
            activePrivateRoomId = null;
            me.x = x;
            me.y = y;
            closeModal('map-portal-modal');
            AudioEngine.playSuccess();
            showToast(`✨ Đã dịch chuyển tới ${label}`);
            lastHudSignature = '';
            updateHUD();
            saveGame();
        }

        /* =========================================================================
           8C. TÚI ĐỒ, TRANG PHỤC & XÓA VẬT PHẨM (INVENTORY)
           ========================================================================= */
        function openInventoryModal() {
            AudioEngine.playClick();
            const me = getCurrentUser();
            document.getElementById('inventory-profile').innerHTML = `
                <div style="display:flex; align-items:center; gap:12px;">
                    <div style="font-size:38px;">${me.outfit || '👕'}</div>
                    <div>
                        <b style="font-size:16px;">${me.name}</b> <span class="tag">${me.role}</span>
                        <div style="font-size:12.5px; color:#555; margin-top:2px;">Số dư hiện có: <b style="color:#D35400;">${me.points}⭐</b> | Thú đã mở khóa: <b>${(me.unlockedAnimals || []).length} loài</b></div>
                    </div>
                </div>
                <button class="btn btn-sm btn-accent" onclick="closeModal('inventory-modal'); openFleaMarketModal();">🎪 Bán ở Chợ Trời</button>
            `;

            document.getElementById('outfit-grid').innerHTML = (me.ownedOutfits || []).map(o => {
                const isEquipped = me.outfit === o;
                return `
                    <div class="card-item ${isEquipped ? 'equipped' : ''}" style="flex-direction:row; align-items:center; padding:8px 10px;">
                        <div style="font-size:28px;">${o}</div>
                        <button class="btn btn-sm ${isEquipped ? 'btn-accent' : 'btn-primary'}" onclick="equipOutfit('${o}')">
                            ${isEquipped ? '✅ Đang mặc' : 'Mặc ngay'}
                        </button>
                    </div>
                `;
            }).join('');

            const inv = me.inventory || [];
            if (inv.length === 0) {
                document.getElementById('item-grid').innerHTML = '<p style="color:#666; font-size:13px; grid-column:1/-1; text-align:center;">Túi đồ đang trống. Hãy ghé Siêu thị hoặc Bàn Thí Nghiệm để chế tạo nhé!</p>';
            } else {
                document.getElementById('item-grid').innerHTML = inv.map((item, idx) => `
                    <div class="card-item">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span style="font-size:28px;">${item.icon || '🎁'}</span>
                            <div>
                                <b style="font-size:13.5px;">${escapeHtml(item.name)}</b>
                                ${item.rarity ? `<span class="tag" style="background:#F5EEF8; color:#6C3483; margin-left:4px;">${item.rarity}</span>` : ''}
                                <div style="font-size:11.5px; color:#555;">${escapeHtml(item.desc || '')}</div>
                            </div>
                        </div>
                        <div style="display:flex; gap:6px; justify-content:flex-end;">
                            <button class="btn btn-sm btn-primary" onclick="useInventoryItem(${idx})">✨ Sử dụng</button>
                            <button class="btn btn-sm btn-danger" onclick="deleteInventoryItem(${idx})" title="Xóa bỏ vật phẩm này">🗑️ Xóa</button>
                        </div>
                    </div>
                `).join('');
            }
            document.getElementById('inventory-modal').style.display = 'flex';
        }

        function equipOutfit(emoji) {
            const me = getCurrentUser();
            me.outfit = emoji;
            AudioEngine.playSuccess();
            showToast(`👗 Đã đổi sang trang phục ${emoji}!`);
            triggerSpeechBubble(me, `Nhìn bộ ${emoji} mới của mình nè!`, false);
            lastHudSignature = '';
            updateHUD();
            openInventoryModal();
            saveGame();
        }

        function useInventoryItem(idx) {
            const me = getCurrentUser();
            const item = me.inventory[idx];
            if (!item) return;
            AudioEngine.playSuccess();
            triggerSpeechBubble(me, `Dùng ${item.icon} ${item.name}! ${item.effectText || 'Thật tuyệt vời! ✨'}`, true);
            showToast(`✨ Đã sử dụng ${item.name}!`);
            me.inventory.splice(idx, 1);
            openInventoryModal();
            saveGame();
        }

        function deleteInventoryItem(idx) {
            const me = getCurrentUser();
            const item = me.inventory[idx];
            if (!item) return;
            me.inventory.splice(idx, 1);
            AudioEngine.playClick();
            showToast(`🗑️ Đã bỏ "${item.name}" khỏi túi đồ!`);
            openInventoryModal();
            saveGame();
        }

        /* =========================================================================
           8D. PHÒNG THÍ NGHIỆM SÁNG TẠO ĐA CHIỀU (MULTI-DIMENSIONAL SYNTHESIS LAB)
           ========================================================================= */
        const LAB_IDEA_SAMPLES = [
            'Rồng băng vũ trụ biết hát ru',
            'Giày tên lửa cầu vồng siêu tốc',
            'Bánh quy tàng hình vị dâu tây',
            'Kính lúp đọc suy nghĩ thú cưng',
            'Đám mây kẹo bông bay lơ lửng',
            'Cây bút thần vẽ ra đồ ăn thật',
            'Robot đầu bếp làm kem sô-cô-la',
            'Chiếc ô tạo mưa sao băng lấp lánh'
        ];

        function openLabModal() {
            AudioEngine.playClick();
            document.getElementById('lab-prompt').value = '';
            document.getElementById('lab-result').innerHTML = '';
            document.getElementById('lab-modal').style.display = 'flex';
        }

        function fillLabIdeaPrompt() {
            const pick = LAB_IDEA_SAMPLES[Math.floor(Math.random() * LAB_IDEA_SAMPLES.length)];
            document.getElementById('lab-prompt').value = pick;
            AudioEngine.playClick();
        }

        function hashStringSeed(str) {
            let h = 2166136261;
            for (let i = 0; i < str.length; i++) {
                h ^= str.charCodeAt(i);
                h = Math.imul(h, 16777619);
            }
            return Math.abs(h);
        }

        function runMagicLab() {
            const promptRaw = document.getElementById('lab-prompt').value.trim();
            if (!promptRaw) return showToast('⚠️ Hãy nhập mô tả ý tưởng của bạn trước nhé!');

            const lower = promptRaw.toLowerCase();
            const seed = hashStringSeed(lower + '_' + Date.now().toString().slice(-4));

            // 1. Nhận diện chủ thể (Subject / Icon Pool đa dạng)
            const subjectRules = [
                { keys: ['rồng', 'dragon', 'khủng long', 'dinosaur'], icons: ['🐉', '🦖', '🦕'], type: 'Linh Thú Cổ Đại' },
                { keys: ['mèo', 'chó', 'thú', 'cún', 'thỏ', 'gấu', 'chim', 'cá', 'pet'], icons: ['🦄', '🦊', '🐼', '🦉', '🐬', '🦋'], type: 'Sinh Vật Đồng Hành' },
                { keys: ['xe', 'tên lửa', 'phi thuyền', 'bay', 'máy bay', 'tàu', 'cánh'], icons: ['🚀', '🛸', '✈️', '🚁', '🏎️', '🪂'], type: 'Phương Tiện Siêu Tốc' },
                { keys: ['bánh', 'kẹo', 'kem', 'trà', 'nước', 'trái cây', 'ăn', 'pizza', 'sô cô la'], icons: ['🧁', '🍭', '🍨', '🍩', '🍹', '🍎'], type: 'Ẩm Thực Ma Thuật' },
                { keys: ['kiếm', 'gậy', 'đũa', 'khiên', 'giáp', 'vương miện', 'nhẫn', 'kính', 'giày', 'áo', 'mũ', 'ô'], icons: ['🪄', '👑', '🕶️', '👟', '🛡️', '☂️', '💎'], type: 'Bảo Bối Trang Bị' },
                { keys: ['robot', 'máy', 'đồng hồ', 'điện thoại', 'sách', 'bút', 'đàn', 'nhạc'], icons: ['🤖', '⌚', '📖', '🎸', '🔮', '🔭'], type: 'Phát Minh Khoa Học' },
                { keys: ['sao', 'trăng', 'mây', 'vũ trụ', 'cầu vồng', 'lửa', 'băng', 'nước', 'cây', 'hoa'], icons: ['🌌', '🌈', '❄️', '🔥', '🌸', '⚡'], type: 'Tinh Thể Nguyên Tố' }
            ];

            let matchedRule = subjectRules.find(r => r.keys.some(k => lower.includes(k)));
            if (!matchedRule) {
                const fallbackPool = [
                    { icons: ['🔮', '✨', '🎁', '🧿', '🏮', '🎪'], type: 'Kỳ Vật Bí Ẩn' }
                ];
                matchedRule = fallbackPool[0];
            }
            const icon = matchedRule.icons[seed % matchedRule.icons.length];

            // 2. Phân tích tính chất / nguyên tố từ từ khóa
            const elementMap = [
                { keys: ['băng', 'tuyết', 'lạnh', 'đông'], aura: 'Hàn Băng Vĩnh Cửu', effect: 'Đóng băng mọi mệt mỏi trong 10 giây! ❄️' },
                { keys: ['lửa', 'nóng', 'mặt trời', 'nhiệt'], aura: 'Hỏa Diệm Rực Rỡ', effect: 'Tỏa ánh sáng ấm áp và năng lượng bùng nổ! 🔥' },
                { keys: ['vũ trụ', 'sao', 'trăng', 'thiên hà'], aura: 'Tinh Vân Ngân Hà', effect: 'Triệu hồi mưa sao băng lấp lánh quanh nhân vật! 🌠' },
                { keys: ['cầu vồng', 'màu', 'lấp lánh', 'ánh sáng'], aura: 'Quang Phổ Cầu Vồng', effect: 'Biến mọi bước chân thành dải cầu vồng rực rỡ! 🌈' },
                { keys: ['tàng hình', 'bí mật', 'bóng đêm'], aura: 'Ảo Ảnh Vô Hình', effect: 'Giúp chủ nhân thoắt ẩn thoắt hiện như ninja! 🥷' },
                { keys: ['hát', 'nhạc', 'âm thanh', 'vui'], aura: 'Giai Điệu Vui Nhộn', effect: 'Phát ra bản nhạc khiến cả nhà bật cười! 🎶' },
                { keys: ['bay', 'tên lửa', 'nhanh', 'siêu tốc'], aura: 'Siêu Thanh Phản Lực', effect: 'Tăng tốc độ di chuyển trong tưởng tượng lên gấp 10 lần! ⚡' }
            ];
            const matchedElem = elementMap.find(e => e.keys.some(k => lower.includes(k)));
            const defaultAuras = ['Lượng Tử Đa Chiều', 'Năng Lượng Mặt Trời', 'Pha Lê Tím', 'Sóng Âm Siêu Việt', 'Bụi Tiên Lấp Lánh'];
            const aura = matchedElem ? matchedElem.aura : defaultAuras[seed % defaultAuras.length];
            const effectText = matchedElem ? matchedElem.effect : `Kích hoạt trường năng lượng ${aura} cực kỳ độc đáo!`;

            // 3. Phân cấp độ hiếm (Rarity)
            const rarities = ['Hiếm (Rare)', 'Sử Thi (Epic)', 'Huyền Thoại (Legendary)', 'Độc Bản (Mythic)'];
            const rarity = rarities[(seed + promptRaw.length) % rarities.length];

            // Chuẩn hóa tên vật phẩm giữ nguyên ý tưởng của người chơi
            const cleanName = promptRaw.charAt(0).toUpperCase() + promptRaw.slice(1);
            const newItem = {
                id: 'lab_' + Date.now() + '_' + (seed % 999),
                name: cleanName,
                icon,
                rarity,
                desc: `[${matchedRule.type} • ${aura}] ${effectText}`,
                effectText
            };

            const me = getCurrentUser();
            me.inventory.push(newItem);
            AudioEngine.playSuccess();
            triggerSpeechBubble(me, `Chế tạo thành công ${icon} ${cleanName}!`, true);

            document.getElementById('lab-result').innerHTML = `
                <div class="card-item equipped" style="text-align:center; padding:14px;">
                    <div style="font-size:48px;">${icon}</div>
                    <div><span class="tag" style="background:#8E44AD; color:#FFF;">${rarity}</span> <span class="tag">${matchedRule.type}</span></div>
                    <b style="font-size:16px; color:#2C3E50;">${escapeHtml(cleanName)}</b>
                    <div style="font-size:12.5px; color:#444;">${escapeHtml(newItem.desc)}</div>
                    <div style="font-size:12px; color:#27AE60; font-weight:700;">✅ Đã cất vào Túi Đồ của ${me.name}!</div>
                </div>
            `;
            saveGame();
        }