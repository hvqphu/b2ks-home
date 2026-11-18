/* =========================================================================
           13. CẬP NHẬT CHUYỂN ĐỘNG, CAMERA, HUD & VÒNG LẶP CHÍNH
           ========================================================================= */
        let lastHudSignature = '';

        function updateHUD() {
            const me = getCurrentUser();
            if (!me) return;

            const unreadCount = getUnreadFamilyMessagesCount(me.id);
            const pendingRedemptions = (state.interworldRedemptions || []).filter(r => r.status === 'pending').length;

            let locLabel = '🌳 Khu Phố B2KS';
            if (me.scene === 'house') {
                const r = getRoomAtPosition(me.x, me.y);
                locLabel = r ? r.name : '🏠 Hành Lang Nhà';
            } else if (me.scene === 'private_room') {
                const roomId = me.privateRoomId || activePrivateRoomId;
                const r = HOUSE_ROOMS.find(x => x.id === roomId);
                locLabel = r ? r.name : '🛏️ Phòng Riêng';
            }

            const lighting = getRealTimeLighting();
            const sig = `${me.id}|${me.points}|${me.outfit}|${locLabel}|${lighting.label}|${unreadCount}|${pendingRedemptions}`;
            if (sig === lastHudSignature) return;
            lastHudSignature = sig;

            document.getElementById('hud-avatar').innerText = me.outfit || getRoleEmoji(me.role);
            document.getElementById('hud-name').innerText = me.name;
            document.getElementById('hud-role').innerText = me.role;
            document.getElementById('hud-points').innerText = `${me.points}⭐`;
            document.getElementById('hud-location').innerText = locLabel;
            document.getElementById('hud-time').innerText = lighting.label;

            const phoneBadge = document.getElementById('hud-phone-badge');
            if (phoneBadge) {
                phoneBadge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
                phoneBadge.innerText = unreadCount;
            }

            const parentBadge = document.getElementById('hud-parent-badge');
            if (parentBadge) {
                parentBadge.style.display = (isParent(me) && pendingRedemptions > 0) ? 'inline-block' : 'none';
                parentBadge.innerText = pendingRedemptions;
            }

            const quickBar = document.getElementById('quick-switch-bar');
            if (quickBar) {
                quickBar.innerHTML = state.members.map(m => `
                    <button type="button" class="switch-char-btn ${m.id === me.id ? 'active' : ''}" onclick="switchMember('${m.id}')">
                        <span>${m.outfit || getRoleEmoji(m.role)}</span>
                        <span>${escapeHtml(m.name)}</span>
                    </button>
                `).join('');
            }
        }

        function updateWorldMovement() {
            if (!state.sessionLoggedIn) return;
            const anyModalOpen = Array.from(document.querySelectorAll('.modal-overlay')).some(el => el.style.display === 'flex');
            if (anyModalOpen) return;

            const me = getCurrentUser();
            let vx = 0;
            let vy = 0;

            if (keys['arrowup'] || keys['w']) vy -= 1;
            if (keys['arrowdown'] || keys['s']) vy += 1;
            if (keys['arrowleft'] || keys['a']) vx -= 1;
            if (keys['arrowright'] || keys['d']) vx += 1;

            if (joyActive) {
                vx += joyVector.x;
                vy += joyVector.y;
            }

            const mag = Math.hypot(vx, vy);
            if (mag > 0.05) {
                const speed = 3.8;
                const nx = me.x + (vx / Math.max(1, mag)) * speed;
                const ny = me.y + (vy / Math.max(1, mag)) * speed;

                if (Math.abs(vx) > Math.abs(vy)) {
                    me.dir = vx < 0 ? 'left' : 'right';
                } else {
                    me.dir = vy < 0 ? 'up' : 'down';
                }

                if (me.scene === 'house') {
                    const check = canMoveInsideHouse(me, nx, ny);
                    if (check.allowed) {
                        me.x = nx;
                        me.y = ny;

                        // Tự động bước vào không gian phòng ngủ riêng khi chạm đúng bậc cửa
                        const enteredPrivate = HOUSE_ROOMS.find(r =>
                            r.ownerIds && r.ownerIds.length > 0 &&
                            Math.hypot(me.x - r.doorX, me.y - (r.y + 18)) < 26
                        );
                        if (enteredPrivate) {
                            enterPrivateRoomScene(enteredPrivate);
                            return;
                        }
                    } else if (check.blockedRoom && Date.now() - lastDoorToastTime > 2200) {
                        lastDoorToastTime = Date.now();
                        AudioEngine.playError();
                        showToast(`🔒 ${check.blockedRoom.name} đang khóa cửa!`);
                    }
                } else if (me.scene === 'private_room') {
                    me.x = Math.max(45, Math.min(PRIVATE_ROOM_WORLD.width - 45, nx));
                    me.y = Math.max(185, Math.min(PRIVATE_ROOM_WORLD.height - 25, ny));
                } else {
                    me.x = Math.max(30, Math.min(STREET_WORLD.width - 30, nx));
                    me.y = Math.max(345, Math.min(STREET_WORLD.height - 25, ny));
                }
            }

            // Kiểm tra điểm tương tác gần nhất
            const interactables = getWorldInteractables();
            let nearest = null;
            let bestDist = Infinity;
            interactables.forEach(item => {
                const d = Math.hypot(me.x - item.x, me.y - item.y);
                if (d <= item.radius && d < bestDist) {
                    bestDist = d;
                    nearest = item;
                }
            });

            currentInteractTarget = nearest;
            const promptEl = document.getElementById('interact-prompt');
            const btnEl = document.getElementById('interact-btn');
            if (nearest) {
                promptEl.style.display = 'block';
                btnEl.innerText = nearest.label;
            } else {
                promptEl.style.display = 'none';
            }
        }

        function renderGameWorld() {
            const me = getCurrentUser();
            const lighting = getRealTimeLighting();

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();

            let worldW = STREET_WORLD.width;
            let worldH = STREET_WORLD.height;
            if (me.scene === 'house') {
                worldW = HOUSE_WORLD.width;
                worldH = HOUSE_WORLD.height;
            } else if (me.scene === 'private_room') {
                worldW = PRIVATE_ROOM_WORLD.width;
                worldH = PRIVATE_ROOM_WORLD.height;
            }

            const camX = Math.max(0, Math.min(worldW - canvas.width / zoomLevel, me.x - (canvas.width / zoomLevel) / 2));
            const camY = Math.max(0, Math.min(worldH - canvas.height / zoomLevel, me.y - (canvas.height / zoomLevel) / 2));

            ctx.scale(zoomLevel, zoomLevel);
            ctx.translate(-camX, -camY);

            if (me.scene === 'house') {
                drawHouseInteriorWorld(lighting);
            } else if (me.scene === 'private_room') {
                drawPrivateRoomWorld(lighting);
            } else {
                drawNeighborhoodWorld(lighting);
            }

            // Vẽ vòng tròn gợi ý tại các điểm tương tác
            getWorldInteractables().forEach(pt => {
                const isNear = currentInteractTarget && currentInteractTarget.id === pt.id;
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, isNear ? 24 : 16, 0, Math.PI * 2);
                ctx.fillStyle = isNear ? 'rgba(241, 196, 15, 0.45)' : 'rgba(255, 255, 255, 0.25)';
                ctx.fill();
                ctx.lineWidth = 2;
                ctx.strokeStyle = isNear ? '#F39C12' : 'rgba(44, 62, 80, 0.4)';
                ctx.stroke();
            });

            // Vẽ tất cả thành viên đang ở cùng scene
            const sameSceneMembers = state.members.filter(m => {
                if (me.scene === 'private_room') {
                    return m.scene === 'private_room' && m.privateRoomId === me.privateRoomId;
                }
                return m.scene === me.scene;
            });
            sameSceneMembers.sort((a, b) => a.y - b.y);
            sameSceneMembers.forEach(m => drawDetailedChibi(m, m.id === me.id));

            // Lớp phủ ánh sáng hoàng hôn / ban đêm
            if (lighting.overlayAlpha > 0) {
                ctx.fillStyle = lighting.overlayColor;
                ctx.fillRect(0, 0, worldW, worldH);
            }

            ctx.restore();
        }

        function gameLoop() {
            updateWorldMovement();
            renderGameWorld();
            updateHUD();
            requestAnimationFrame(gameLoop);
        }

        /* =========================================================================
           14. TIỆN ÍCH CHUNG & KHỞI ĐỘNG HỆ THỐNG
           ========================================================================= */
        function closeModal(id) {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
            if (id === 'zoo-modal') hideWordTranslatorTooltip();
        }

        function getRoleEmoji(role) {
            if (role === 'Bố') return '👨';
            if (role === 'Mẹ') return '👩';
            if (role === 'Con gái') return '👧';
            return '👦';
        }

        function escapeHtml(str) {
            if (str === null || str === undefined) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }

        function renderChatLog() {
            const box = document.getElementById('chat-log');
            if (!box) return;
            box.innerHTML = (state.messages || []).map(m => `
                <div class="chat-msg"><b>[${m.time}] ${escapeHtml(m.sender)}:</b> ${escapeHtml(m.text)}</div>
            `).join('');
            box.scrollTop = box.scrollHeight;
        }

        function sendChat() {
            const input = document.getElementById('chat-input');
            const text = input.value.trim();
            if (!text) return;
            const me = getCurrentUser();
            input.value = '';
            triggerSpeechBubble(me, text, true);
        }

        // Đóng tooltip dịch từ khi bấm ra ngoài
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.word-token') && !e.target.closest('#word-translator-tooltip')) {
                hideWordTranslatorTooltip();
            }
        });

        // Khởi chạy dữ liệu & vòng lặp game
        loadGame();
        renderChatLog();
        updateHUD();
        requestAnimationFrame(gameLoop);