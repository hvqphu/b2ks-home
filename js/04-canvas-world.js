/* =========================================================================
           6. RPG SPEECH BUBBLE CHAT SYSTEM
           ========================================================================= */
        const ENGLISH_WORDS = new Set([
            'hello', 'hi', 'good', 'morning', 'afternoon', 'evening', 'night', 'thank', 'thanks',
            'you', 'please', 'love', 'family', 'dad', 'father', 'mom', 'mother', 'brother', 'sister',
            'homework', 'done', 'finish', 'finished', 'clean', 'room', 'house', 'eat', 'dinner',
            'lunch', 'breakfast', 'water', 'help', 'can', 'yes', 'no', 'okay', 'ok', 'great',
            'awesome', 'nice', 'happy', 'study', 'read', 'book', 'play', 'game', 'what', 'how',
            'are', 'is', 'am', 'doing', 'going', 'to', 'the', 'my', 'your', 'we', 'have', 'a', 'an', 'open', 'door'
        ]);

        function isEnglishSentence(text) {
            const hasVN = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(text);
            if (hasVN) return false;
            const words = text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(Boolean);
            if (words.length < 2) return false;
            let count = 0;
            words.forEach(w => { if (ENGLISH_WORDS.has(w)) count++; });
            return count >= 2 || (words.length >= 3 && count >= 1);
        }

        function triggerSpeechBubble(member, text, isEng) {
            member.speech = {
                text: text,
                isEng: isEng,
                expiresAt: Date.now() + 5500
            };
            state.chatHistory.push({ sender: member.name, text, isEng });
            if (state.chatHistory.length > 40) state.chatHistory.shift();
            renderChatLog();
        }

        function renderChatLog() {
            const list = document.getElementById('chat-log-list');
            list.innerHTML = '';
            state.chatHistory.forEach(m => {
                list.innerHTML += `
                    <div style="padding:4px 8px; border-radius:6px; background:${m.isEng ? '#D4EDDA' : '#F1F5F9'};">
                        <b>${m.sender}:</b> ${m.text} ${m.isEng ? '<b style="color:#28A745;">(+5⭐ EN)</b>' : ''}
                    </div>
                `;
            });
            list.scrollTop = list.scrollHeight;
        }

        function toggleChatLog() {
            const box = document.getElementById('chat-log-popup');
            box.style.display = box.style.display === 'block' ? 'none' : 'block';
            renderChatLog();
        }

        function sendChat() {
            AudioEngine.init();
            const input = document.getElementById('chat-input');
            const text = input.value.trim();
            if (!text) return;

            const user = getCurrentUser();
            const isEng = isEnglishSentence(text);

            if (isEng) {
                user.points = isParent(user) ? Math.min(MAX_PARENT_POINTS, user.points + 5) : user.points + 5;
                AudioEngine.playCoin();
                showToast(`🇬🇧 ${user.name} +5⭐ nhờ giao tiếp Tiếng Anh!`);
                updateHUD();
            } else {
                AudioEngine.playClick();
            }

            triggerSpeechBubble(user, text, isEng);
            input.value = '';
            saveGame();
        }

        /* =========================================================================
           7. CANVAS ENGINE, CAMERA & INTERACTIONS
           ========================================================================= */
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');

        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        const keys = {};
        window.addEventListener('keydown', e => {
            if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
            const k = e.key.toLowerCase();
            keys[k] = true;

            // Handle active Online Arcade Multiplayer controls when Arcade modal is open
            if (document.getElementById('arcade-modal').style.display === 'flex' && arcadeRoomState && arcadeRoomState.status === 'playing') {
                handleArcadeKeyPress(k);
                return;
            }

            if ((e.key === ' ' || e.key === 'Enter') && currentInteractTarget) {
                e.preventDefault();
                triggerInteraction();
            }
        });
        window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

        // Joystick
        const joyBase = document.getElementById('joystick-base');
        const joyKnob = document.getElementById('joystick-knob');
        let joyVector = { x: 0, y: 0 };
        let joyActive = false;

        function handleJoyMove(clientX, clientY) {
            const rect = joyBase.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            let dx = clientX - cx, dy = clientY - cy;
            const maxD = 26, dist = Math.hypot(dx, dy);
            if (dist > maxD) { dx = (dx / dist) * maxD; dy = (dy / dist) * maxD; }
            joyKnob.style.transform = `translate(${dx}px, ${dy}px)`;
            joyVector = { x: dx / maxD, y: dy / maxD };
        }
        function resetJoy() {
            joyActive = false;
            joyKnob.style.transform = 'translate(0,0)';
            joyVector = { x: 0, y: 0 };
        }
        joyBase.addEventListener('touchstart', e => { e.preventDefault(); AudioEngine.init(); joyActive = true; handleJoyMove(e.touches[0].clientX, e.touches[0].clientY); });
        joyBase.addEventListener('touchmove', e => { e.preventDefault(); if (joyActive) handleJoyMove(e.touches[0].clientX, e.touches[0].clientY); });
        joyBase.addEventListener('touchend', resetJoy);
        joyBase.addEventListener('mousedown', e => { AudioEngine.init(); joyActive = true; handleJoyMove(e.clientX, e.clientY); });
        window.addEventListener('mousemove', e => { if (joyActive) handleJoyMove(e.clientX, e.clientY); });
        window.addEventListener('mouseup', resetJoy);

        // Ambient Cars
        const streetCars = [
            { axis: 'h', x: 150, y: 505, speed: 2.1, color: '#E74C3C', dir: 1 },
            { axis: 'h', x: 1650, y: 560, speed: -2.3, color: '#3498DB', dir: -1 },
            { axis: 'h', x: 400, y: 1025, speed: 2.0, color: '#F39C12', dir: 1 },
            { axis: 'h', x: 1900, y: 1080, speed: -2.5, color: '#9B59B6', dir: -1 },
            { axis: 'v', x: 1125, y: 310, speed: 1.9, color: '#16A085', dir: 1 },
            { axis: 'v', x: 1185, y: 1350, speed: -2.1, color: '#E67E22', dir: -1 }
        ];

        let currentInteractTarget = null;
        let lastDoorToastTime = 0;

        function getWorldInteractables() {
            const me = getCurrentUser();
            const items = [];

            if (me.scene === 'neighborhood') {
                const plot = PLOTS[state.house.plotIndex] || PLOTS[1];
                items.push({
                    x: plot.x, y: plot.y + 85, radius: 75,
                    label: '🏠 Vào nhà',
                    action: () => openModal('house-modal')
                });
                // Siêu thị B2KS
                items.push({
                    x: 1680, y: 410, radius: 88,
                    label: '🏪 Vào Siêu thị',
                    action: () => openModal('shop-modal')
                });
                // Khu Vui Chơi Đối Kháng B2KS (Trung tâm bản đồ - x: 885, y: 740)
                items.push({
                    x: 885, y: 790, radius: 90,
                    label: '🕹️ Vào Khu Vui Chơi (1⭐/lượt)',
                    action: () => openModal('arcade-modal')
                });
                // Cửa Hàng Thời Trang
                items.push({
                    x: 820, y: 930, radius: 88,
                    label: '👗 Cửa Hàng Thời Trang',
                    action: () => openModal('fashion-modal')
                });
                // Salon Tóc
                items.push({
                    x: 1740, y: 930, radius: 88,
                    label: '💇 Salon Tóc',
                    action: () => openModal('salon-modal')
                });
                // Trung Tâm Tiếng Anh B2KS (Mở sảnh chọn chủ đề trước, chưa hiện câu hỏi)
                items.push({
                    x: 340, y: 930, radius: 88,
                    label: '🎓 Vào Trung Tâm Tiếng Anh',
                    action: () => openModal('english-center-modal')
                });
                // Phòng Thí Nghiệm Sáng Tạo B2KS
                items.push({
                    x: 1380, y: 790, radius: 90,
                    label: '🧪 Vào Phòng Thí Nghiệm (10⭐)',
                    action: () => openModal('invention-lab-modal')
                });
                // Công viên & Luyện Tiếng Anh
                items.push({
                    x: 175, y: 425, radius: 82,
                    label: '💬 Luyện Tiếng Anh',
                    action: () => {
                        document.getElementById('chat-input').focus();
                        showToast('💡 Hãy nhập một câu tiếng Anh để nhận +5⭐!');
                    }
                });
                // Quảng trường Đài Phun Nước
                const parkSt = getActivityStatus(me, 'park_rest');
                const parkLabel = parkSt.canEarn
                    ? `⛲ Nghỉ chân Quảng trường (+2⭐) [${parkSt.count}/${parkSt.maxPerDay}]`
                    : (parkSt.onCooldown ? `⛲ Nghỉ chân (Chờ ${Math.ceil(parkSt.remainMs / 60000)}p)` : '⛲ Nghỉ chân Quảng trường');
                items.push({
                    x: 340, y: 1360, radius: 85,
                    label: parkLabel,
                    action: () => performRoutineActivity(me, 'park_rest', 'What a lovely sunny park!')
                });
                // Thư viện & Góc Đọc Sách
                items.push({
                    x: 1580, y: 1360, radius: 85,
                    label: '📚 Góc Đọc Sách Tiếng Anh',
                    action: () => {
                        const inp = document.getElementById('chat-input');
                        inp.value = 'I love reading English books in the park!';
                        inp.focus();
                        showToast('📖 Nhấn Gửi để đọc to câu tiếng Anh & nhận +5⭐!');
                    }
                });
            } else if (me.scene === 'private_room') {
                const room = getActivePrivateRoom();
                const isOwner = room && room.ownerIds && room.ownerIds.includes(me.id);

                items.push({
                    x: 380, y: PRIVATE_ROOM_WORLD.height - 25, radius: 62,
                    label: '🚪 Ra hành lang',
                    action: exitPrivateRoomToHallway
                });

                const sleepSt = getActivityStatus(me, 'sleep');
                const sleepLabel = sleepSt.canEarn
                    ? `😴 Đi ngủ / Nghỉ ngơi (+2⭐) [${sleepSt.count}/${sleepSt.maxPerDay}]`
                    : (sleepSt.onCooldown ? `😴 Ngủ nghỉ (Chờ ${Math.ceil(sleepSt.remainMs / 60000)}p để nhận ⭐)` : '😴 Ngủ nghỉ trên giường');
                items.push({
                    x: 115, y: 245, radius: 75,
                    label: sleepLabel,
                    action: () => performRoutineActivity(me, 'sleep', 'Time to rest and recharge! 😴✨')
                });

                items.push({
                    x: 492, y: 215, radius: 72,
                    label: '📖 Đọc sách tiếng Anh',
                    action: () => {
                        const inp = document.getElementById('chat-input');
                        inp.value = 'I am reading a story in my room!';
                        inp.focus();
                        showToast('📖 Nhấn Gửi để đọc to câu tiếng Anh & nhận +5⭐!');
                    }
                });

                items.push({
                    x: 670, y: 235, radius: 80,
                    label: isOwner ? '🧥 Mở tủ quần áo' : '🔒 Tủ quần áo riêng',
                    action: () => {
                        if (isOwner) {
                            openWardrobeModal(room);
                        } else {
                            AudioEngine.playError();
                            showToast('🔒 Đây là tủ quần áo riêng của chủ phòng!');
                        }
                    }
                });

                if (isOwner) {
                    ROOM_DECOR_SLOTS.forEach(slot => {
                        items.push({
                            x: slot.x, y: slot.y, radius: 54,
                            label: `📌 Trang trí: ${slot.label}`,
                            action: () => openSlotPickerModal(slot.id)
                        });
                    });
                }
            } else {
                items.push({
                    x: 560, y: 735, radius: 58,
                    label: '🚪 Ra ngoài phố',
                    action: exitHouseScene
                });
                items.push({
                    x: 210, y: 650, radius: 75,
                    label: '📋 Nhiệm vụ',
                    action: () => openSmartphoneModal('tasks')
                });
                items.push({
                    x: 320, y: 615, radius: 68,
                    label: '📺 Bật Tivi YouTube',
                    action: () => openModal('tv-modal')
                });
                const eatSt = getActivityStatus(me, 'eat');
                const eatLabel = eatSt.canEarn
                    ? `🍽️ Ăn cơm & Đố Tiếng Anh (+2⭐) [${eatSt.count}/${eatSt.maxPerDay}]`
                    : (eatSt.onCooldown ? `🍽️ Ăn cơm & Đố Tiếng Anh (Chờ ${Math.ceil(eatSt.remainMs / 60000)}p nhận ⭐)` : '🍽️ Ăn cơm & Đố Tiếng Anh');
                items.push({
                    x: 830, y: 665, radius: 80,
                    label: eatLabel,
                    action: () => openDiningFoodPuzzleModal()
                });

                const curRoom = getRoomAtPosition(me.x, me.y);
                if (curRoom && curRoom.wardrobe) {
                    const isOwner = curRoom.ownerIds && curRoom.ownerIds.includes(me.id);
                    items.push({
                        x: curRoom.wardrobe.x, y: curRoom.wardrobe.y + 42, radius: 75,
                        label: isOwner ? '🚪 Mở tủ quần áo' : '🔒 Tủ quần áo riêng',
                        action: () => {
                            if (isOwner) {
                                openWardrobeModal(curRoom);
                            } else {
                                AudioEngine.playError();
                                showToast('🔒 Đây là tủ quần áo riêng của chủ phòng!');
                            }
                        }
                    });
                }
                if (curRoom && curRoom.ownerIds && curRoom.ownerIds.includes(me.id)) {
                    items.push({
                        x: curRoom.x + curRoom.w - 65, y: curRoom.y + curRoom.h - 35, radius: 70,
                        label: '🎨 Trang trí phòng',
                        action: () => { openModal('custom-modal'); switchCustomTab('room'); }
                    });
                }
            }

            state.members.forEach(other => {
                if (other.id !== me.id && other.scene === me.scene) {
                    items.push({
                        x: other.x, y: other.y, radius: 60,
                        label: `💬 Nói với ${other.name}`,
                        action: () => {
                            const inp = document.getElementById('chat-input');
                            inp.value = `Hi ${other.name}, how are you?`;
                            inp.focus();
                        }
                    });
                }
            });

            return items;
        }

        function triggerInteraction() {
            if (currentInteractTarget && currentInteractTarget.action) {
                AudioEngine.playClick();
                currentInteractTarget.action();
            }
        }

        /* =========================================================================
           8. HIGH-DETAIL CHIBI CHARACTER RENDERER
           ========================================================================= */
        function drawDetailedChibi(member, isMe) {
            drawDetailedChibiOnContext(ctx, member, isMe, 1);
        }

        function drawDetailedChibiOnContext(c, member, isMe, scale = 1) {
            c.save();
            c.translate(member.x, member.y);
            c.scale(scale, scale);

            const isMoving = (c === ctx) && isMe && (keys['arrowup'] || keys['arrowdown'] || keys['arrowleft'] || keys['arrowright'] || keys['w'] || keys['a'] || keys['s'] || keys['d'] || joyActive);
            const walkCycle = isMoving ? Math.sin(Date.now() / 80) : 0;
            const bob = isMoving ? Math.abs(Math.sin(Date.now() / 80)) * -3.5 : 0;

            c.lineWidth = 2.4;
            c.strokeStyle = '#2C3E50';

            c.fillStyle = 'rgba(0,0,0,0.24)';
            c.beginPath();
            c.ellipse(0, 27, 16, 6, 0, 0, Math.PI * 2);
            c.fill();

            const leftLegY = 14 + walkCycle * 4;
            const rightLegY = 14 - walkCycle * 4;
            const pStyle = member.pantsStyle || 'pants';

            if (pStyle === 'skirt') {
                c.fillStyle = '#FFE0BD';
                c.beginPath(); c.roundRect(-8, leftLegY + 2, 6.5, 8, 2); c.fill(); c.stroke();
                c.beginPath(); c.roundRect(1.5, rightLegY + 2, 6.5, 8, 2); c.fill(); c.stroke();
                c.fillStyle = member.pantsColor || '#8E44AD';
                c.beginPath();
                c.moveTo(-11, 12 + bob);
                c.lineTo(11, 12 + bob);
                c.lineTo(15, 21 + bob);
                c.lineTo(-15, 21 + bob);
                c.closePath();
                c.fill();
                c.stroke();
            } else if (pStyle === 'shorts') {
                c.fillStyle = '#FFE0BD';
                c.beginPath(); c.roundRect(-8.5, leftLegY + 3, 7, 7, 2); c.fill(); c.stroke();
                c.beginPath(); c.roundRect(1.5, rightLegY + 3, 7, 7, 2); c.fill(); c.stroke();
                c.fillStyle = member.pantsColor || '#117864';
                c.beginPath(); c.roundRect(-10, 12 + bob, 9, 7, 2); c.fill(); c.stroke();
                c.beginPath(); c.roundRect(1, 12 + bob, 9, 7, 2); c.fill(); c.stroke();
            } else {
                c.fillStyle = member.pantsColor || '#34495E';
                c.beginPath(); c.roundRect(-9, leftLegY, 7.5, 10, 2); c.fill(); c.stroke();
                c.beginPath(); c.roundRect(1.5, rightLegY, 7.5, 10, 2); c.fill(); c.stroke();
            }

            c.fillStyle = '#E74C3C';
            c.beginPath(); c.roundRect(-10.5, leftLegY + 7, 9, 5, 2); c.fill(); c.stroke();
            c.beginPath(); c.roundRect(1.5, rightLegY + 7, 9, 5, 2); c.fill(); c.stroke();
            c.fillStyle = '#FFFFFF';
            c.fillRect(-9.5, leftLegY + 10.5, 7, 1.5);
            c.fillRect(2.5, rightLegY + 10.5, 7, 1.5);

            const leftArmY = -2 - walkCycle * 4;
            const rightArmY = -2 + walkCycle * 4;
            c.fillStyle = member.shirtColor || '#3498DB';
            c.beginPath(); c.roundRect(-16.5, leftArmY + bob, 5.5, 8, 2.5); c.fill(); c.stroke();
            c.beginPath(); c.roundRect(11, rightArmY + bob, 5.5, 8, 2.5); c.fill(); c.stroke();
            c.fillStyle = '#FFE0BD';
            c.beginPath(); c.arc(-13.8, leftArmY + 9 + bob, 3, 0, Math.PI * 2); c.fill(); c.stroke();
            c.beginPath(); c.arc(13.8, rightArmY + 9 + bob, 3, 0, Math.PI * 2); c.fill(); c.stroke();

            c.fillStyle = member.shirtColor || '#3498DB';
            c.beginPath();
            c.roundRect(-11.5, -3 + bob, 23, 18, 5);
            c.fill();
            c.stroke();

            const pat = member.shirtPattern || 'collar';
            if (pat === 'stripe') {
                c.fillStyle = 'rgba(255,255,255,0.6)';
                c.fillRect(-10, 4 + bob, 20, 4);
            } else if (pat === 'vest') {
                c.fillStyle = '#FFFFFF';
                c.beginPath();
                c.moveTo(-4, -3 + bob); c.lineTo(0, 7 + bob); c.lineTo(4, -3 + bob);
                c.closePath(); c.fill();
            } else if (pat === 'star') {
                c.fillStyle = '#FFE66D';
                c.font = '10px Arial'; c.textAlign = 'center';
                c.fillText('★', 0, 9 + bob);
            } else if (pat === 'heart') {
                c.fillStyle = '#FFCDD2';
                c.font = '10px Arial'; c.textAlign = 'center';
                c.fillText('♥', 0, 9 + bob);
            } else {
                c.fillStyle = '#FFFFFF';
                c.beginPath();
                c.moveTo(-5, -3 + bob); c.lineTo(0, 2 + bob); c.lineTo(5, -3 + bob);
                c.closePath(); c.fill();
            }

            c.fillStyle = member.hairColor || '#2C3E50';
            if (member.hairStyle === 'long') {
                c.beginPath();
                c.roundRect(-19, -25 + bob, 38, 30, 10);
                c.fill();
                c.stroke();
            } else if (member.hairStyle === 'pigtails') {
                c.beginPath();
                c.arc(-18.5, -18 + bob, 7.5, 0, Math.PI * 2);
                c.arc(18.5, -18 + bob, 7.5, 0, Math.PI * 2);
                c.fill();
                c.stroke();
                c.fillStyle = '#FF6B6B';
                c.fillRect(-15, -21 + bob, 3, 5);
                c.fillRect(12, -21 + bob, 3, 5);
            }

            c.fillStyle = '#FFE0BD';
            c.beginPath();
            c.arc(0, -18 + bob, 16.5, 0, Math.PI * 2);
            c.fill();
            c.stroke();

            let eyeOffsetX = 0;
            if (member.dir === 'left') eyeOffsetX = -2.5;
            if (member.dir === 'right') eyeOffsetX = 2.5;

            c.strokeStyle = member.hairColor || '#2C3E50';
            c.lineWidth = 1.8;
            c.beginPath();
            c.moveTo(-8.5 + eyeOffsetX, -24 + bob); c.lineTo(-4 + eyeOffsetX, -24.5 + bob);
            c.moveTo(4 + eyeOffsetX, -24.5 + bob); c.lineTo(8.5 + eyeOffsetX, -24 + bob);
            c.stroke();

            c.fillStyle = '#FFFFFF';
            c.beginPath(); c.ellipse(-6 + eyeOffsetX, -18.5 + bob, 3.2, 3.8, 0, 0, Math.PI * 2); c.fill();
            c.beginPath(); c.ellipse(6 + eyeOffsetX, -18.5 + bob, 3.2, 3.8, 0, 0, Math.PI * 2); c.fill();

            c.fillStyle = '#2C3E50';
            c.beginPath(); c.ellipse(-6 + eyeOffsetX, -18.5 + bob, 2.3, 3, 0, 0, Math.PI * 2); c.fill();
            c.beginPath(); c.ellipse(6 + eyeOffsetX, -18.5 + bob, 2.3, 3, 0, 0, Math.PI * 2); c.fill();

            c.fillStyle = '#FFF';
            c.beginPath(); c.arc(-6.8 + eyeOffsetX, -19.8 + bob, 1.1, 0, Math.PI * 2); c.fill();
            c.beginPath(); c.arc(5.2 + eyeOffsetX, -19.8 + bob, 1.1, 0, Math.PI * 2); c.fill();

            c.fillStyle = 'rgba(255, 118, 117, 0.55)';
            c.beginPath(); c.ellipse(-10.5 + eyeOffsetX, -14 + bob, 3.2, 1.8, 0, 0, Math.PI * 2); c.fill();
            c.beginPath(); c.ellipse(10.5 + eyeOffsetX, -14 + bob, 3.2, 1.8, 0, 0, Math.PI * 2); c.fill();

            c.strokeStyle = '#C0392B';
            c.lineWidth = 2;
            c.beginPath();
            c.arc(eyeOffsetX, -13 + bob, 3.5, 0.12 * Math.PI, 0.88 * Math.PI);
            c.stroke();

            c.fillStyle = member.hairColor || '#2C3E50';
            c.strokeStyle = '#2C3E50';
            c.lineWidth = 2.4;
            c.beginPath();
            c.arc(0, -21 + bob, 17, Math.PI, 0);
            if (member.hairStyle === 'spiky') {
                c.lineTo(13, -40 + bob);
                c.lineTo(5, -33 + bob);
                c.lineTo(0, -42 + bob);
                c.lineTo(-5, -33 + bob);
                c.lineTo(-13, -39 + bob);
            } else {
                c.lineTo(14, -22 + bob);
                c.lineTo(7, -26 + bob);
                c.lineTo(0, -21 + bob);
                c.lineTo(-7, -26 + bob);
                c.lineTo(-14, -22 + bob);
            }
            c.closePath();
            c.fill();
            c.stroke();

            c.strokeStyle = 'rgba(255,255,255,0.28)';
            c.lineWidth = 2;
            c.beginPath();
            c.arc(0, -22 + bob, 12, 1.2 * Math.PI, 1.75 * Math.PI);
            c.stroke();

            if (member.outfit) {
                c.font = '21px Arial';
                c.textAlign = 'center';
                c.fillText(member.outfit, 0, -38 + bob);
            }

            if (c === ctx) {
                c.fillStyle = isMe ? '#FF6B6B' : 'rgba(44, 62, 80, 0.9)';
                c.beginPath();
                c.roundRect(-34, -59 + bob, 68, 17, 6);
                c.fill();
                c.fillStyle = '#FFF';
                c.font = 'bold 11px Fredoka';
                c.textAlign = 'center';
                c.fillText(member.name, 0, -47 + bob);

                if (member.speech && Date.now() < member.speech.expiresAt) {
                    drawSpeechBubble(0, -69 + bob, member.speech.text, member.speech.isEng);
                }
            }

            c.restore();
        }

        function drawSpeechBubble(x, y, text, isEng) {
            ctx.save();
            ctx.font = 'bold 12px Fredoka';
            const displayTxt = isEng ? `${text} (+5⭐)` : text;
            const maxW = 200;
            const words = displayTxt.split(' ');
            const lines = [];
            let curLine = '';
            words.forEach(w => {
                const test = curLine ? curLine + ' ' + w : w;
                if (ctx.measureText(test).width > maxW) {
                    lines.push(curLine);
                    curLine = w;
                } else {
                    curLine = test;
                }
            });
            if (curLine) lines.push(curLine);

            const boxW = Math.min(maxW + 20, Math.max(70, ...lines.map(l => ctx.measureText(l).width + 20)));
            const boxH = lines.length * 16 + 12;
            const bx = x - boxW / 2;
            const by = y - boxH;

            ctx.fillStyle = isEng ? '#D4EDDA' : '#FFFFFF';
            ctx.strokeStyle = isEng ? '#28A745' : '#2C3E50';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.roundRect(bx, by, boxW, boxH, 10);
            ctx.fill();
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(x - 6, y);
            ctx.lineTo(x + 6, y);
            ctx.lineTo(x, y + 7);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#2C3E50';
            ctx.textAlign = 'center';
            lines.forEach((line, idx) => {
                ctx.fillText(line, x, by + 16 + idx * 16);
            });
            ctx.restore();
        }

        /* =========================================================================
           9. STREET & 3-STORY TOWNHOUSE RENDERERS
           ========================================================================= */
        function drawStreetTownhouse(x, y, style, lighting) {
            ctx.save();
            ctx.translate(x, y);

            let wallColor = '#FFF8E7';
            let trimColor = '#E67E22';
            let roofColor = '#C0392B';
            if (style === 'modern') { wallColor = '#FDFEFE'; trimColor = '#2980B9'; roofColor = '#2C3E50'; }
            if (style === 'pastel') { wallColor = '#E8F8F5'; trimColor = '#16A085'; roofColor = '#F39C12'; }

            ctx.lineWidth = 3.2;
            ctx.strokeStyle = '#2C3E50';

            ctx.fillStyle = 'rgba(0,0,0,0.22)';
            ctx.beginPath();
            ctx.ellipse(0, 72, 95, 14, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = wallColor;
            ctx.fillRect(-82, -170, 164, 240);
            ctx.strokeRect(-82, -170, 164, 240);

            [-90, -12].forEach((fy) => {
                ctx.fillStyle = trimColor;
                ctx.fillRect(-88, fy, 176, 9);
                ctx.strokeRect(-88, fy, 176, 9);

                [-54, 18].forEach(wx => {
                    ctx.fillStyle = lighting.isNight ? '#F9E79F' : '#AED6F1';
                    ctx.fillRect(wx, fy - 62, 36, 38);
                    ctx.strokeRect(wx, fy - 62, 36, 38);

                    ctx.fillStyle = '#FADBD8';
                    ctx.fillRect(wx + 2, fy - 60, 8, 34);
                    ctx.fillRect(wx + 26, fy - 60, 8, 34);

                    ctx.beginPath();
                    ctx.moveTo(wx + 18, fy - 62); ctx.lineTo(wx + 18, fy - 24);
                    ctx.moveTo(wx, fy - 43); ctx.lineTo(wx + 36, fy - 43);
                    ctx.stroke();
                });

                ctx.fillStyle = 'rgba(133, 193, 233, 0.5)';
                ctx.fillRect(-68, fy - 24, 136, 24);
                ctx.strokeRect(-68, fy - 24, 136, 24);
            });

            ctx.fillStyle = roofColor;
            ctx.beginPath();
            ctx.moveTo(-96, -170);
            ctx.lineTo(0, -220);
            ctx.lineTo(96, -170);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#F9E79F';
            ctx.beginPath();
            ctx.arc(0, -190, 11, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#8E44AD';
            ctx.beginPath();
            ctx.roundRect(-20, 12, 40, 58, [8, 8, 0, 0]);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#F9E79F';
            ctx.fillRect(-10, 20, 20, 18);
            ctx.strokeRect(-10, 20, 20, 18);
            ctx.fillStyle = '#F1C40F';
            ctx.beginPath(); ctx.arc(13, 46, 3.5, 0, Math.PI * 2); ctx.fill();

            ctx.fillStyle = '#E74C3C';
            ctx.beginPath();
            ctx.moveTo(-28, 12); ctx.lineTo(28, 12); ctx.lineTo(22, 2); ctx.lineTo(-22, 2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            [-64, 34].forEach(wx => {
                ctx.fillStyle = lighting.isNight ? '#F9E79F' : '#AED6F1';
                ctx.fillRect(wx, 18, 30, 34);
                ctx.strokeRect(wx, 18, 30, 34);
            });

            ctx.fillStyle = '#2C3E50';
            ctx.beginPath();
            ctx.roundRect(-60, -244, 120, 22, 8);
            ctx.fill();
            ctx.fillStyle = '#FFE66D';
            ctx.font = 'bold 12px Fredoka';
            ctx.textAlign = 'center';
            ctx.fillText('🏡 Nhà Phố B2KS', 0, -229);

            ctx.restore();
        }

        function drawShopBuilding(x, y, config, lighting) {
            const type = config.buildingType || 'supermarket';
            const t = Date.now();
            ctx.save();
            ctx.lineWidth = 3.2;
            ctx.strokeStyle = '#2C3E50';

            // Ground shadow
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath();
            ctx.ellipse(x, y + 68, 110, 15, 0, 0, Math.PI * 2);
            ctx.fill();

            if (type === 'supermarket') {
                // 2-tier Supermarket with red/white striped canopy, fruit stand & shopping carts
                ctx.fillStyle = '#FFF9C4';
                ctx.beginPath(); ctx.roundRect(x - 104, y - 68, 208, 130, [10, 10, 4, 4]); ctx.fill(); ctx.stroke();

                // Upper roof parapet
                ctx.fillStyle = '#E67E22';
                ctx.beginPath(); ctx.roundRect(x - 108, y - 92, 216, 30, 8); ctx.fill(); ctx.stroke();
                ctx.fillStyle = '#FFF';
                ctx.font = 'bold 13px Fredoka';
                ctx.textAlign = 'center';
                ctx.fillText(config.title, x, y - 72);

                // Scalloped red-white awning
                for (let i = 0; i < 10; i++) {
                    const ax = x - 100 + i * 20;
                    ctx.fillStyle = i % 2 === 0 ? '#E74C3C' : '#FFFFFF';
                    ctx.beginPath();
                    ctx.roundRect(ax, y - 62, 20, 18, [0, 0, 6, 6]);
                    ctx.fill(); ctx.stroke();
                }

                // Sliding glass doors & display windows
                ctx.fillStyle = lighting.isNight ? '#F9E79F' : '#AED6F1';
                ctx.fillRect(x - 32, y - 24, 64, 86); ctx.strokeRect(x - 32, y - 24, 64, 86);
                ctx.beginPath(); ctx.moveTo(x, y - 24); ctx.lineTo(x, y + 62); ctx.stroke();

                // Side produce/gift display boxes
                [-72, 42].forEach((wx, idx) => {
                    ctx.fillStyle = lighting.isNight ? '#FCF3CF' : '#D6EAF8';
                    ctx.fillRect(x + wx, y - 34, 34, 42); ctx.strokeRect(x + wx, y - 34, 34, 42);
                    ctx.font = '18px Arial';
                    ctx.fillText(idx === 0 ? '🍎🍌' : '🧸🎁', x + wx + 17, y - 8);
                });
                // Shopping cart prop
                ctx.font = '20px Arial';
                ctx.fillText('🛒', x - 86, y + 54);
                ctx.fillText('🛒', x + 86, y + 54);

            } else if (type === 'arcade') {
                // Giant Retro Arcade Cabinet & Neon eSports Arena
                ctx.fillStyle = '#1B2631';
                ctx.beginPath();
                ctx.moveTo(x - 102, y + 62);
                ctx.lineTo(x - 102, y - 48);
                ctx.lineTo(x - 84, y - 88);
                ctx.lineTo(x + 84, y - 88);
                ctx.lineTo(x + 102, y - 48);
                ctx.lineTo(x + 102, y + 62);
                ctx.closePath();
                ctx.fill(); ctx.stroke();

                // Glowing neon marquee
                const pulse = Math.sin(t / 220) > 0;
                ctx.fillStyle = pulse ? '#E74C3C' : '#F39C12';
                ctx.beginPath(); ctx.roundRect(x - 94, y - 84, 188, 28, 8); ctx.fill(); ctx.stroke();
                ctx.fillStyle = '#FFF';
                ctx.font = 'bold 12.5px Fredoka';
                ctx.textAlign = 'center';
                ctx.fillText(config.title, x, y - 65);

                // Giant CRT Screen facade
                ctx.fillStyle = '#0B5345';
                ctx.beginPath(); ctx.roundRect(x - 76, y - 48, 152, 54, 10); ctx.fill(); ctx.stroke();
                ctx.fillStyle = '#1ABC9C';
                ctx.font = '22px Arial';
                ctx.fillText('🕹️ ❌⭕ 🚀 ⚡', x, y - 14);

                // Arcade joystick & buttons ledge
                ctx.fillStyle = '#F1C40F';
                ctx.fillRect(x - 96, y + 8, 192, 14); ctx.strokeRect(x - 96, y + 8, 192, 14);
                ['#E74C3C', '#3498DB', '#2ECC71'].forEach((bc, bi) => {
                    ctx.fillStyle = bc;
                    ctx.beginPath(); ctx.arc(x - 65 + bi * 18, y + 15, 5, 0, Math.PI * 2); ctx.fill();
                });
                // Entrance portal
                ctx.fillStyle = '#2C3E50';
                ctx.fillRect(x - 28, y + 22, 56, 40); ctx.strokeRect(x - 28, y + 22, 56, 40);

            } else if (type === 'english') {
                // Classic Brick & Cream Academy with Clock Tower
                ctx.fillStyle = '#E8F8F5';
                ctx.fillRect(x - 98, y - 62, 196, 124); ctx.strokeRect(x - 98, y - 62, 196, 124);

                // Pitched roof + central clock tower
                ctx.fillStyle = '#117864';
                ctx.beginPath();
                ctx.moveTo(x - 108, y - 62);
                ctx.lineTo(x, y - 102);
                ctx.lineTo(x + 108, y - 62);
                ctx.closePath();
                ctx.fill(); ctx.stroke();

                // Clock face in gable
                ctx.fillStyle = '#FFF';
                ctx.beginPath(); ctx.arc(x, y - 76, 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(x, y - 76); ctx.lineTo(x, y - 85); ctx.moveTo(x, y - 76); ctx.lineTo(x + 7, y - 76); ctx.stroke();

                // White classical pillars
                [-84, -42, 42, 84].forEach(px => {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(x + px - 6, y - 56, 12, 118); ctx.strokeRect(x + px - 6, y - 56, 12, 118);
                });

                // Signboard
                ctx.fillStyle = '#0E6251';
                ctx.beginPath(); ctx.roundRect(x - 96, y - 54, 192, 24, 6); ctx.fill(); ctx.stroke();
                ctx.fillStyle = '#FFF';
                ctx.font = 'bold 12px Fredoka';
                ctx.textAlign = 'center';
                ctx.fillText(config.title, x, y - 38);
                ctx.font = '20px Arial';
                ctx.fillText('🇬🇧  ABC  📘', x, y - 6);

            } else if (type === 'fashion') {
                // Luxury Pink Glass Boutique with Crown Roof & Runway Windows
                ctx.fillStyle = '#FDEDEC';
                ctx.beginPath(); ctx.roundRect(x - 98, y - 66, 196, 128, [16, 16, 4, 4]); ctx.fill(); ctx.stroke();

                // Crown & Boutique Header
                ctx.font = '24px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('👑', x, y - 92);
                ctx.fillStyle = '#C2185B';
                ctx.beginPath(); ctx.roundRect(x - 100, y - 86, 200, 28, 12); ctx.fill(); ctx.stroke();
                ctx.fillStyle = '#FFF';
                ctx.font = 'bold 12.5px Fredoka';
                ctx.fillText(config.title, x, y - 67);

                // Panoramic showcase glass windows with dresses
                [-64, 30].forEach((wx, wi) => {
                    ctx.fillStyle = lighting.isNight ? '#FADBD8' : '#FFF0F5';
                    ctx.beginPath(); ctx.roundRect(x + wx, y - 46, 36, 68, [18, 18, 4, 4]); ctx.fill(); ctx.stroke();
                    ctx.font = '22px Arial';
                    ctx.fillText(wi === 0 ? '👗' : '🤵', x + wx + 18, y - 4);
                });
                // Pink heart banner center
                ctx.font = '22px Arial';
                ctx.fillText('🎀 👜 👠', x, y - 16);

            } else if (type === 'salon') {
                // Modern Hair Studio with Animated Spinning Barber Pole & Golden Scissors
                ctx.fillStyle = '#F5EEF8';
                ctx.fillRect(x - 96, y - 66, 192, 128); ctx.strokeRect(x - 96, y - 66, 192, 128);

                ctx.fillStyle = '#6C3483';
                ctx.beginPath(); ctx.roundRect(x - 100, y - 88, 200, 28, 8); ctx.fill(); ctx.stroke();
                ctx.fillStyle = '#FFF';
                ctx.font = 'bold 12.5px Fredoka';
                ctx.textAlign = 'center';
                ctx.fillText(config.title, x, y - 69);

                // Studio mirrors
                [-68, 32].forEach(wx => {
                    ctx.fillStyle = lighting.isNight ? '#F9E79F' : '#EBF5FB';
                    ctx.beginPath(); ctx.roundRect(x + wx, y - 46, 36, 64, 16); ctx.fill(); ctx.stroke();
                });

                // Animated spinning Barber Pole on the left!
                const poleX = x - 106;
                ctx.fillStyle = '#FFF';
                ctx.beginPath(); ctx.roundRect(poleX - 7, y - 34, 14, 68, 7); ctx.fill(); ctx.stroke();
                const stripeOffset = Math.floor((t / 90) % 18);
                for (let sy = y - 28 + stripeOffset; sy < y + 26; sy += 18) {
                    ctx.fillStyle = (Math.floor(sy / 18) % 2 === 0) ? '#E74C3C' : '#2980B9';
                    ctx.fillRect(poleX - 5, sy, 10, 7);
                }
                ctx.font = '24px Arial';
                ctx.fillText('✂️ 💇‍♀️ 🎨', x, y - 12);

            } else if (type === 'lab') {
                // Sci-Fi B2KS Invention Lab with Glass Bio-Dome, Antenna & Bubbling Flasks
                ctx.fillStyle = '#1E293B';
                ctx.beginPath(); ctx.roundRect(x - 102, y - 60, 204, 122, [14, 14, 4, 4]); ctx.fill(); ctx.stroke();

                // Glowing Cyan Glass Dome on roof
                ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
                ctx.beginPath();
                ctx.arc(x, y - 60, 56, Math.PI, 0);
                ctx.fill(); ctx.stroke();

                // Radar antenna
                ctx.beginPath(); ctx.moveTo(x, y - 116); ctx.lineTo(x, y - 134); ctx.stroke();
                ctx.fillStyle = (Math.sin(t / 180) > 0) ? '#38BDF8' : '#10B981';
                ctx.beginPath(); ctx.arc(x, y - 136, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

                // Floating energy bubbles inside dome
                const bShift = Math.sin(t / 250) * 5;
                ctx.fillStyle = '#7DD3FC';
                ctx.beginPath(); ctx.arc(x - 20, y - 78 + bShift, 5, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(x + 18, y - 84 - bShift, 6, 0, Math.PI * 2); ctx.fill();

                // Neon Lab Signboard
                ctx.fillStyle = '#0284C7';
                ctx.beginPath(); ctx.roundRect(x - 104, y - 64, 208, 28, 8); ctx.fill(); ctx.stroke();
                ctx.fillStyle = '#FFF';
                ctx.font = 'bold 12px Fredoka';
                ctx.textAlign = 'center';
                ctx.fillText(config.title, x, y - 45);

                // Tech windows
                [-76, 36].forEach(wx => {
                    ctx.fillStyle = '#0F172A';
                    ctx.fillRect(x + wx, y - 24, 40, 46); ctx.strokeRect(x + wx, y - 24, 40, 46);
                    ctx.strokeStyle = '#38BDF8';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(x + wx + 4, y); ctx.lineTo(x + wx + 14, y - 10); ctx.lineTo(x + wx + 24, y + 8); ctx.lineTo(x + wx + 36, y - 4);
                    ctx.stroke();
                    ctx.strokeStyle = '#2C3E50';
                    ctx.lineWidth = 3.2;
                });
                ctx.font = '22px Arial';
                ctx.fillText('🧪 🧬 ⚡', x, y - 4);
            }

            ctx.restore();

            drawDetailedChibiOnContext(ctx, {
                x: x, y: y + 42, dir: 'down', name: config.npcName,
                hairStyle: config.npcHairStyle, hairColor: config.npcHairColor,
                shirtColor: config.npcShirtColor, shirtPattern: config.npcShirtPattern,
                pantsColor: config.npcPantsColor, pantsStyle: config.npcPantsStyle,
                outfit: config.npcOutfit, speech: null
            }, false, 0.85);
        }

        function drawNeighborhoodWorld(lighting) {
            const W = STREET_WORLD.width;
            const H = STREET_WORLD.height;

            const skyGrad = ctx.createLinearGradient(0, 0, 0, 240);
            skyGrad.addColorStop(0, lighting.skyTop);
            skyGrad.addColorStop(1, lighting.skyBottom);
            ctx.fillStyle = skyGrad;
            ctx.fillRect(0, 0, W, 240);

            if (lighting.phase === 'night') {
                ctx.fillStyle = '#FFFFFF';
                for (let s = 0; s < 40; s++) {
                    const sx = (s * 149) % W;
                    const sy = 20 + (s * 47) % 150;
                    const r = (s % 2 === 0) ? 2 : 1.3;
                    ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
                }
                ctx.fillStyle = '#FEF9E7';
                ctx.beginPath(); ctx.arc(1780, 65, 26, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = lighting.skyTop;
                ctx.beginPath(); ctx.arc(1791, 58, 22, 0, Math.PI * 2); ctx.fill();
            } else {
                const sunY = (lighting.phase === 'dawn' || lighting.phase === 'sunset') ? 155 : 65;
                ctx.fillStyle = 'rgba(249, 231, 159, 0.55)';
                ctx.beginPath(); ctx.arc(1780, sunY, 40, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#F4D03F';
                ctx.beginPath(); ctx.arc(1780, sunY, 27, 0, Math.PI * 2); ctx.fill();
            }

            const cloudShift = (Date.now() / 65) % W;
            ctx.fillStyle = lighting.isNight ? 'rgba(200,214,229,0.28)' : 'rgba(255,255,255,0.9)';
            [200, 680, 1180, 1680].forEach((baseX, i) => {
                const cx = (baseX + cloudShift) % (W + 100) - 50;
                const cy = 55 + (i % 2) * 26;
                ctx.beginPath();
                ctx.arc(cx, cy, 24, 0, Math.PI * 2);
                ctx.arc(cx + 22, cy - 6, 30, 0, Math.PI * 2);
                ctx.arc(cx + 48, cy, 23, 0, Math.PI * 2);
                ctx.fill();
            });

            ctx.fillStyle = '#7DCEA0';
            ctx.beginPath();
            ctx.moveTo(0, 235);
            ctx.quadraticCurveTo(380, 175, 760, 235);
            ctx.quadraticCurveTo(1180, 170, 1600, 235);
            ctx.quadraticCurveTo(1920, 180, W, 235);
            ctx.fill();

            const grassGrad = ctx.createLinearGradient(0, 225, 0, H);
            grassGrad.addColorStop(0, '#58D68D');
            grassGrad.addColorStop(1, '#2ECC71');
            ctx.fillStyle = grassGrad;
            ctx.fillRect(0, 225, W, H - 225);

            ctx.fillStyle = '#FDFEFE';
            ctx.strokeStyle = '#95A5A6';
            ctx.lineWidth = 1.5;
            for (let fx = 10; fx < W; fx += 24) {
                ctx.fillRect(fx, 216, 12, 22);
                ctx.strokeRect(fx, 216, 12, 22);
            }

            const hRoads = [
                { y: 465, h: 130, swTop: 415, swBot: 595, name: 'ĐẠI LỘ BẮC B2KS' },
                { y: 985, h: 130, swTop: 935, swBot: 1115, name: 'ĐẠI LỘ NAM B2KS' }
            ];
            const vRoad = { x: 1090, w: 130, swLeft: 1040, swRight: 1220 };

            hRoads.forEach(r => {
                ctx.fillStyle = '#E5E7E9';
                ctx.fillRect(0, r.swTop, W, r.h + 100);
                ctx.strokeStyle = '#95A5A6';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(0, r.swTop); ctx.lineTo(W, r.swTop);
                ctx.moveTo(0, r.swBot + 50); ctx.lineTo(W, r.swBot + 50);
                ctx.stroke();

                ctx.fillStyle = '#34495E';
                ctx.fillRect(0, r.y, W, r.h);

                ctx.strokeStyle = '#F7DC6F';
                ctx.lineWidth = 5;
                ctx.setLineDash([34, 24]);
                ctx.beginPath();
                ctx.moveTo(0, r.y + r.h / 2);
                ctx.lineTo(W, r.y + r.h / 2);
                ctx.stroke();
                ctx.setLineDash([]);
            });

            ctx.fillStyle = '#E5E7E9';
            ctx.fillRect(vRoad.swLeft, 225, vRoad.w + 100, H - 225);
            ctx.fillStyle = '#34495E';
            ctx.fillRect(vRoad.x, 225, vRoad.w, H - 225);

            ctx.strokeStyle = '#F7DC6F';
            ctx.lineWidth = 5;
            ctx.setLineDash([34, 24]);
            ctx.beginPath();
            ctx.moveTo(vRoad.x + vRoad.w / 2, 235);
            ctx.lineTo(vRoad.x + vRoad.w / 2, H);
            ctx.stroke();
            ctx.setLineDash([]);

            hRoads.forEach(r => {
                ctx.fillStyle = '#34495E';
                ctx.fillRect(vRoad.x, r.y, vRoad.w, r.h);
                ctx.fillStyle = 'rgba(255,255,255,0.85)';
                for (let zy = r.y + 10; zy < r.y + r.h - 10; zy += 22) {
                    ctx.fillRect(vRoad.x - 28, zy, 22, 11);
                    ctx.fillRect(vRoad.x + vRoad.w + 6, zy, 22, 11);
                }
                for (let zx = vRoad.x + 10; zx < vRoad.x + vRoad.w - 10; zx += 22) {
                    ctx.fillRect(zx, r.y - 28, 11, 22);
                    ctx.fillRect(zx, r.y + r.h + 6, 11, 22);
                }
            });

            streetCars.forEach(car => {
                if (car.axis === 'h') {
                    car.x += car.speed;
                    if (car.x > W + 100) car.x = -100;
                    if (car.x < -100) car.x = W + 100;
                } else {
                    car.y += car.speed;
                    if (car.y > H + 100) car.y = 220;
                    if (car.y < 220) car.y = H + 100;
                }

                ctx.save();
                ctx.translate(car.x, car.y);
                if (car.axis === 'v') {
                    ctx.rotate(car.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
                } else if (car.dir < 0) {
                    ctx.scale(-1, 1);
                }
                ctx.fillStyle = car.color;
                ctx.strokeStyle = '#2C3E50';
                ctx.lineWidth = 2.5;
                ctx.beginPath(); ctx.roundRect(-34, -15, 68, 24, 7); ctx.fill(); ctx.stroke();
                ctx.fillStyle = '#AED6F1';
                ctx.beginPath(); ctx.roundRect(-18, -26, 36, 13, 5); ctx.fill(); ctx.stroke();
                ctx.fillStyle = '#1C2833';
                ctx.beginPath(); ctx.arc(-20, 10, 8, 0, Math.PI * 2); ctx.arc(20, 10, 8, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#F9E79F';
                ctx.fillRect(30, -9, 5, 7);
                if (lighting.isNight) {
                    const beam = ctx.createLinearGradient(34, -5, 135, -5);
                    beam.addColorStop(0, 'rgba(255, 243, 176, 0.5)');
                    beam.addColorStop(1, 'rgba(255, 243, 176, 0)');
                    ctx.fillStyle = beam;
                    ctx.beginPath(); ctx.moveTo(34, -10); ctx.lineTo(135, -35); ctx.lineTo(135, 25); ctx.lineTo(34, 0); ctx.closePath(); ctx.fill();
                }
                ctx.restore();
            });

            // 1. Công viên & Bảng Tiếng Anh
            ctx.fillStyle = '#F9E79F';
            ctx.beginPath(); ctx.arc(175, 360, 75, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#F39C12'; ctx.lineWidth = 4; ctx.stroke();
            ctx.fillStyle = '#27AE60';
            ctx.beginPath(); ctx.roundRect(120, 325, 110, 48, 8); ctx.fill();
            ctx.strokeStyle = '#2C3E50'; ctx.lineWidth = 3; ctx.stroke();
            ctx.fillStyle = '#FFF';
            ctx.font = 'bold 12px Fredoka';
            ctx.textAlign = 'center';
            ctx.fillText('💬 CÔNG VIÊN', 175, 345);
            ctx.fillText('TIẾNG ANH +5⭐', 175, 363);

            // 2. Quảng trường Đài Phun Nước
            ctx.fillStyle = '#FDEBD0';
            ctx.beginPath(); ctx.ellipse(340, 1330, 155, 95, 0, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#E67E22'; ctx.lineWidth = 4; ctx.stroke();
            ctx.fillStyle = '#5DADE2';
            ctx.beginPath(); ctx.ellipse(340, 1325, 68, 42, 0, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#2C3E50'; ctx.lineWidth = 3; ctx.stroke();
            const spray = Math.sin(Date.now() / 160) * 5;
            ctx.fillStyle = '#EBF5FB';
            ctx.beginPath(); ctx.arc(340, 1305 - spray, 16, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#2C3E50';
            ctx.font = 'bold 13px Fredoka';
            ctx.fillText('⛲ QUẢNG TRƯỜNG B2KS (+2⭐)', 340, 1398);

            // 3. Góc Đọc Sách Ngoài Trời
            ctx.fillStyle = '#E8F8F5';
            ctx.beginPath(); ctx.roundRect(1450, 1255, 260, 145, 22); ctx.fill();
            ctx.strokeStyle = '#16A085'; ctx.lineWidth = 4; ctx.stroke();
            ctx.fillStyle = '#117864';
            ctx.font = 'bold 14px Fredoka';
            ctx.fillText('📚 GÓC ĐỌC SÁCH & THƯ GIÃN', 1580, 1285);
            ctx.font = '32px Arial';
            ctx.fillText('📖  🪑  🌿  ☕', 1580, 1335);

            // 4. Sân Bóng Đá Mini Gia Đình
            ctx.fillStyle = '#229954';
            ctx.fillRect(1780, 1230, 340, 210);
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 4;
            ctx.strokeRect(1780, 1230, 340, 210);
            ctx.beginPath();
            ctx.moveTo(1950, 1230); ctx.lineTo(1950, 1440);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(1950, 1335, 34, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = '#FFF';
            ctx.font = 'bold 12px Fredoka';
            ctx.fillText('⚽ SÂN BÓNG ĐÁ B2KS', 1950, 1220);

            // Plots & House
            PLOTS.forEach((p, idx) => {
                if (idx === state.house.plotIndex) {
                    drawStreetTownhouse(p.x, p.y, state.house.style, lighting);
                } else {
                    ctx.fillStyle = 'rgba(255,255,255,0.65)';
                    ctx.strokeStyle = '#2C3E50';
                    ctx.setLineDash([8, 6]);
                    ctx.beginPath(); ctx.roundRect(p.x - 80, p.y - 45, 160, 95, 12); ctx.fill(); ctx.stroke();
                    ctx.setLineDash([]);
                    ctx.fillStyle = '#2C3E50';
                    ctx.font = 'bold 12px Fredoka';
                    ctx.textAlign = 'center';
                    ctx.fillText(`🌱 ${p.label}`, p.x, p.y + 5);
                }
            });

            // 5. Siêu Thị Gia Đình
            drawShopBuilding(1680, 345, {
                buildingType: 'supermarket',
                title: '🏪 SIÊU THỊ GIA ĐÌNH B2KS',
                npcName: 'Thu Ngân Linh', npcHairStyle: 'long', npcHairColor: '#4E342E',
                npcShirtColor: '#E67E22', npcShirtPattern: 'collar', npcPantsColor: '#2C3E50', npcPantsStyle: 'skirt', npcOutfit: ''
            }, lighting);

            // 6. KHU VUI CHƠI ĐỐI KHÁNG B2KS (Trung tâm bản đồ - Dưới Đại lộ Bắc)
            drawShopBuilding(885, 725, {
                buildingType: 'arcade',
                title: '🕹️ KHU VUI CHƠI ONLINE (1⭐)',
                npcName: 'Quản Trò Bin', npcHairStyle: 'spiky', npcHairColor: '#2C3E50',
                npcShirtColor: '#E74C3C', npcShirtPattern: 'star', npcPantsColor: '#2980B9', npcPantsStyle: 'shorts', npcOutfit: '🎮'
            }, lighting);
            if (typeof arcadeRoomState !== 'undefined' && (arcadeRoomState.status === 'lobby' || arcadeRoomState.status === 'playing')) {
                const isLive = arcadeRoomState.status === 'playing';
                const cat = ARCADE_GAME_CATALOG[arcadeRoomState.gameType];
                const bannerText = isLive
                    ? `🔴 ĐANG ĐẤU: ${cat ? cat.shortTitle : 'Game'} (${arcadeRoomState.playerIds.length}P) - Bấm để XEM!`
                    : `🟡 PHÒNG CHỜ: ${cat ? cat.shortTitle : 'Game'} (${arcadeRoomState.playerIds.length}P) - Lại gần để THAM GIA!`;
                ctx.save();
                ctx.font = 'bold 12px Fredoka, sans-serif';
                const bw = ctx.measureText(bannerText).width + 24;
                ctx.fillStyle = isLive ? '#C0392B' : '#D35400';
                ctx.strokeStyle = '#FFF';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.roundRect(885 - bw / 2, 578, bw, 26, 13);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = '#FFF';
                ctx.textAlign = 'center';
                ctx.fillText(bannerText, 885, 595);
                ctx.restore();
            }

            // 6B. PHÒNG THÍ NGHIỆM SÁNG TẠO B2KS (Đông Trung Tâm - Dưới Đại lộ Bắc)
            drawShopBuilding(1380, 725, {
                buildingType: 'lab',
                title: '🧪 PHÒNG THÍ NGHIỆM B2KS',
                npcName: 'Giáo Sư Neo', npcHairStyle: 'spiky', npcHairColor: '#38BDF8',
                npcShirtColor: '#0284C7', npcShirtPattern: 'star', npcPantsColor: '#1E293B', npcPantsStyle: 'pants', npcOutfit: '🥽'
            }, lighting);

            // 7. Trung Tâm Tiếng Anh B2KS
            drawShopBuilding(340, 865, {
                buildingType: 'english',
                title: '🎓 TRUNG TÂM TIẾNG ANH B2KS',
                npcName: 'Cô Giáo Mai', npcHairStyle: 'long', npcHairColor: '#4E342E',
                npcShirtColor: '#16A085', npcShirtPattern: 'collar', npcPantsColor: '#2C3E50', npcPantsStyle: 'skirt', npcOutfit: '🎓'
            }, lighting);

            // 8. Cửa Hàng Thời Trang
            drawShopBuilding(820, 865, {
                buildingType: 'fashion',
                title: '👗 CỬA HÀNG THỜI TRANG',
                npcName: 'Nhà Thiết Kế Vy', npcHairStyle: 'pigtails', npcHairColor: '#8E44AD',
                npcShirtColor: '#E91E63', npcShirtPattern: 'heart', npcPantsColor: '#8E44AD', npcPantsStyle: 'skirt', npcOutfit: '🎀'
            }, lighting);

            // 9. Salon Tóc Nghệ Thuật
            drawShopBuilding(1740, 865, {
                buildingType: 'salon',
                title: '💇 SALON TÓC NGHỆ THUẬT',
                npcName: 'Stylist Tuấn Anh', npcHairStyle: 'spiky', npcHairColor: '#2980B9',
                npcShirtColor: '#8E44AD', npcShirtPattern: 'vest', npcPantsColor: '#2C3E50', npcPantsStyle: 'pants', npcOutfit: ''
            }, lighting);

            // Trees
            const treeCoords = [
                [60, 290], [275, 290], [600, 320], [1005, 310], [1265, 300], [1460, 320], [1930, 310], [2120, 330],
                [80, 730], [540, 750], [1300, 740], [1510, 810], [2020, 760],
                [90, 1260], [620, 1280], [920, 1340], [1290, 1270], [2140, 1480]
            ];
            treeCoords.forEach(([tx, ty]) => drawCuteTree(tx, ty));

            // Street Lamps
            const lampX = [250, 620, 990, 1340, 1720, 2060];
            [425, 945].forEach(ly => {
                lampX.forEach(lx => drawStreetLamp(lx, ly, lighting.isNight));
            });
        }

        function drawCuteTree(x, y) {
            ctx.save();
            ctx.fillStyle = 'rgba(0,0,0,0.16)';
            ctx.beginPath(); ctx.ellipse(x, y + 26, 22, 7, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#7E5109';
            ctx.strokeStyle = '#2C3E50';
            ctx.lineWidth = 2.5;
            ctx.fillRect(x - 6, y, 12, 26);
            ctx.strokeRect(x - 6, y, 12, 26);
            ctx.fillStyle = '#27AE60';
            ctx.beginPath(); ctx.arc(x, y - 10, 23, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#2ECC71';
            ctx.beginPath(); ctx.arc(x - 7, y - 16, 13, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }

        function drawStreetLamp(x, y, isNight) {
            ctx.save();
            ctx.fillStyle = '#2C3E50';
            ctx.fillRect(x - 3, y - 48, 6, 48);
            ctx.beginPath(); ctx.arc(x, y - 52, 9, 0, Math.PI * 2);
            ctx.fillStyle = isNight ? '#F9E79F' : '#ECF0F1';
            ctx.fill();
            ctx.strokeStyle = '#2C3E50'; ctx.lineWidth = 2; ctx.stroke();

            if (isNight) {
                const grad = ctx.createRadialGradient(x, y - 52, 4, x, y - 52, 85);
                grad.addColorStop(0, 'rgba(249, 231, 159, 0.55)');
                grad.addColorStop(1, 'rgba(249, 231, 159, 0)');
                ctx.fillStyle = grad;
                ctx.beginPath(); ctx.arc(x, y - 52, 85, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        }

        function drawHouseInteriorWorld(lighting) {
            const W = HOUSE_WORLD.width;
            const H = HOUSE_WORLD.height;

            ctx.fillStyle = '#1C2833';
            ctx.fillRect(-100, -100, W + 200, H + 200);

            ctx.fillStyle = '#F8F9F9';
            ctx.strokeStyle = '#2C3E50';
            ctx.lineWidth = 6;
            ctx.fillRect(85, 95, 950, 670);
            ctx.strokeRect(85, 95, 950, 670);

            ctx.fillStyle = '#C0392B';
            ctx.beginPath();
            ctx.moveTo(60, 95); ctx.lineTo(560, 20); ctx.lineTo(1060, 95);
            ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#FFF';
            ctx.font = 'bold 17px Fredoka';
            ctx.textAlign = 'center';
            ctx.fillText('🏢 NHÀ PHỐ GIA ĐÌNH B2KS (3 TẦNG)', 560, 68);

            ctx.fillStyle = '#EBEDEF';
            ctx.fillRect(500, 110, 120, 640);
            ctx.fillStyle = '#D5DBDB';
            for (let sy = 175; sy < 720; sy += 24) {
                ctx.fillRect(528, sy, 64, 10);
                ctx.strokeStyle = '#AEB6BF';
                ctx.lineWidth = 1.5;
                ctx.strokeRect(528, sy, 64, 10);
            }

            ctx.fillStyle = '#8E44AD';
            ctx.strokeStyle = '#2C3E50';
            ctx.lineWidth = 3;
            ctx.fillRect(528, 718, 64, 34);
            ctx.strokeRect(528, 718, 64, 34);
            ctx.fillStyle = '#FFF';
            ctx.font = 'bold 11px Fredoka';
            ctx.fillText('🚪 RA PHỐ', 560, 739);

            const rooms = getHouseRooms();
            rooms.forEach(r => {
                ctx.fillStyle = r.wall;
                ctx.fillRect(r.x, r.y, r.w, r.h);

                ctx.fillStyle = r.floor;
                ctx.fillRect(r.x, r.y + r.h - 65, r.w, 65);

                ctx.strokeStyle = '#2C3E50';
                ctx.lineWidth = 4;
                ctx.strokeRect(r.x, r.y, r.w, r.h);

                ctx.fillStyle = 'rgba(44, 62, 80, 0.85)';
                ctx.beginPath();
                ctx.roundRect(r.x + 12, r.y + 8, r.w - 24, 24, 6);
                ctx.fill();
                ctx.fillStyle = '#FFF';
                ctx.font = 'bold 12px Fredoka';
                ctx.textAlign = 'center';
                const lockBadge = (r.ownerIds && r.ownerIds.length > 0) ? (r.isUnlocked ? ' 🔓' : ' 🔒') : '';
                ctx.fillText(r.name + lockBadge, r.x + r.w / 2, r.y + 24);

                const doorX = r.doorSide === 'right' ? (r.x + r.w - 6) : (r.x - 6);
                const doorY = r.y + r.h - 90;
                const doorH = 85;

                if (r.ownerIds && r.ownerIds.length > 0 && !r.isUnlocked) {
                    ctx.fillStyle = '#873600';
                    ctx.fillRect(doorX, doorY, 12, doorH);
                    ctx.strokeStyle = '#2C3E50';
                    ctx.lineWidth = 2.5;
                    ctx.strokeRect(doorX, doorY, 12, doorH);
                    ctx.font = '18px Arial';
                    ctx.fillText('🔒', doorX + 6, doorY + 45);
                } else {
                    ctx.fillStyle = r.floor;
                    ctx.fillRect(doorX - 2, doorY, 16, doorH);
                    ctx.fillStyle = '#A04000';
                    ctx.fillRect(r.doorSide === 'right' ? doorX - 24 : doorX + 12, doorY, 24, 9);
                }
            });

            // Phòng khách
            ctx.fillStyle = '#E74C3C';
            ctx.strokeStyle = '#2C3E50';
            ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.roundRect(135, 670, 125, 45, 8); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#2C3E50';
            ctx.fillRect(295, 595, 50, 26);
            ctx.fillStyle = '#3498DB';
            ctx.fillRect(298, 598, 44, 18);
            ctx.fillStyle = '#FFF';
            ctx.font = 'bold 9px Fredoka';
            ctx.textAlign = 'center';
            ctx.fillText('📺 TV', 320, 610);
            ctx.fillStyle = '#2C3E50';
            ctx.fillRect(405, 620, 44, 34);
            ctx.fillStyle = '#FFF';
            ctx.font = 'bold 10px Fredoka';
            ctx.fillText('📋 BẢNG', 427, 640);

            // Phòng ăn
            ctx.fillStyle = '#A04000';
            ctx.beginPath(); ctx.ellipse(830, 665, 62, 32, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.font = '20px Arial';
            ctx.fillText('🍲 🍗 🥗', 830, 671);

            // Phòng bố mẹ
            ctx.fillStyle = '#8E44AD';
            ctx.beginPath(); ctx.roundRect(875, 405, 115, 78, 8); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#FFF';
            ctx.fillRect(888, 412, 36, 16);
            ctx.fillRect(938, 412, 36, 16);

            // Phòng con 1 & 2
            ctx.fillStyle = '#3498DB';
            ctx.beginPath(); ctx.roundRect(130, 175, 85, 68, 8); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#FFF'; ctx.fillRect(142, 182, 42, 14);

            ctx.fillStyle = '#2ECC71';
            ctx.beginPath(); ctx.roundRect(895, 175, 85, 68, 8); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#FFF'; ctx.fillRect(910, 182, 42, 14);

            // Tủ quần áo
            const me = getCurrentUser();
            rooms.forEach(r => {
                if (!r.wardrobe) return;
                const wx = r.wardrobe.x;
                const wy = r.wardrobe.y;
                const isOpen = (wardrobeOpenedRoomId === r.id);
                const isOwner = r.ownerIds && r.ownerIds.includes(me.id);

                ctx.save();
                ctx.fillStyle = '#873600';
                ctx.strokeStyle = '#2C3E50';
                ctx.lineWidth = 2.4;
                ctx.beginPath();
                ctx.roundRect(wx - 24, wy, 48, 56, 5);
                ctx.fill();
                ctx.stroke();

                if (isOpen) {
                    ctx.fillStyle = '#3E2723';
                    ctx.fillRect(wx - 20, wy + 5, 40, 44);
                    ['#E74C3C', '#3498DB', '#F1C40F', '#2ECC71'].forEach((col, ci) => {
                        ctx.fillStyle = col;
                        ctx.fillRect(wx - 17 + ci * 9, wy + 10, 7, 18);
                    });
                } else {
                    ctx.fillStyle = '#A04000';
                    ctx.fillRect(wx - 20, wy + 5, 18, 44);
                    ctx.strokeRect(wx - 20, wy + 5, 18, 44);
                    ctx.fillRect(wx + 2, wy + 5, 18, 44);
                    ctx.strokeRect(wx + 2, wy + 5, 18, 44);
                    ctx.fillStyle = '#F1C40F';
                    ctx.beginPath();
                    ctx.arc(wx - 4, wy + 27, 2.2, 0, Math.PI * 2);
                    ctx.arc(wx + 4, wy + 27, 2.2, 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.fillStyle = isOwner ? '#27AE60' : '#34495E';
                ctx.beginPath();
                ctx.roundRect(wx - 26, wy - 15, 52, 13, 4);
                ctx.fill();
                ctx.fillStyle = '#FFF';
                ctx.font = 'bold 8.5px Fredoka';
                ctx.textAlign = 'center';
                ctx.fillText(isOwner ? '🧥 Tủ đồ' : '🔒 Tủ riêng', wx, wy - 5.5);
                ctx.restore();
            });

            state.members.forEach(m => {
                m.roomDecor.forEach(d => {
                    drawWorldDecorItem(ctx, d.id, d.x, d.y);
                });
            });

            if (lighting.isNight) {
                rooms.forEach(r => {
                    const grad = ctx.createRadialGradient(r.x + r.w / 2, r.y + 45, 10, r.x + r.w / 2, r.y + 80, 180);
                    grad.addColorStop(0, 'rgba(255, 243, 176, 0.36)');
                    grad.addColorStop(1, 'rgba(255, 243, 176, 0)');
                    ctx.fillStyle = grad;
                    ctx.fillRect(r.x, r.y, r.w, r.h);
                });
            }
        }
