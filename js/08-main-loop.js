/* =========================================================================
           11. MAIN GAME LOOP
           ========================================================================= */
        function gameLoop() {
            const me = getCurrentUser();
            const lighting = getRealTimeLighting();
            const speed = 3.6;

            let dx = 0, dy = 0;
            if (keys['arrowup'] || keys['w']) dy -= 1;
            if (keys['arrowdown'] || keys['s']) dy += 1;
            if (keys['arrowleft'] || keys['a']) dx -= 1;
            if (keys['arrowright'] || keys['d']) dx += 1;

            if (joyActive) {
                dx = joyVector.x;
                dy = joyVector.y;
            }

            if (dx !== 0 || dy !== 0) {
                const len = Math.hypot(dx, dy);
                if (len > 1) { dx /= len; dy /= len; }
                const nextX = me.x + dx * speed;
                const nextY = me.y + dy * speed;

                if (Math.abs(dx) > Math.abs(dy)) me.dir = dx < 0 ? 'left' : 'right';
                else me.dir = dy < 0 ? 'up' : 'down';

                if (me.scene === 'neighborhood') {
                    me.x = Math.max(40, Math.min(STREET_WORLD.width - 40, nextX));
                    me.y = Math.max(265, Math.min(STREET_WORLD.height - 40, nextY));
                } else if (me.scene === 'private_room') {
                    const prX = Math.max(35, Math.min(PRIVATE_ROOM_WORLD.width - 35, nextX));
                    const prY = Math.max(175, Math.min(PRIVATE_ROOM_WORLD.height - 15, nextY));
                    me.x = prX;
                    me.y = prY;
                    if (prY >= PRIVATE_ROOM_WORLD.height - 18 && Math.abs(prX - 380) <= 45) {
                        exitPrivateRoomToHallway();
                    }
                } else {
                    const check = canMoveInsideHouse(me, nextX, nextY);
                    if (check.allowed) {
                        me.x = nextX;
                        me.y = nextY;
                        const enteredRoom = getRoomAtPosition(nextX, nextY);
                        if (enteredRoom && enteredRoom.ownerIds && enteredRoom.ownerIds.length > 0) {
                            enterPrivateRoomScene(enteredRoom);
                        }
                    } else if (check.blockedRoom && Date.now() - lastDoorToastTime > 2200) {
                        lastDoorToastTime = Date.now();
                        AudioEngine.playError();
                        showToast(`🔒 ${check.blockedRoom.name} đang khóa! Chủ phòng cần mở khóa cửa trước.`);
                    }
                }
            }

            const interactables = getWorldInteractables();
            let nearest = null, minDist = Infinity;
            interactables.forEach(item => {
                const d = Math.hypot(me.x - item.x, me.y - item.y);
                if (d < item.radius && d < minDist) { minDist = d; nearest = item; }
            });

            const promptEl = document.getElementById('interact-prompt');
            if (nearest) {
                currentInteractTarget = nearest;
                promptEl.style.display = 'block';
                document.getElementById('interact-btn').innerText = nearest.label;
            } else {
                currentInteractTarget = null;
                promptEl.style.display = 'none';
            }

            const worldW = me.scene === 'neighborhood'
                ? STREET_WORLD.width
                : (me.scene === 'private_room' ? PRIVATE_ROOM_WORLD.width : HOUSE_WORLD.width);
            const worldH = me.scene === 'neighborhood'
                ? STREET_WORLD.height
                : (me.scene === 'private_room' ? PRIVATE_ROOM_WORLD.height : HOUSE_WORLD.height);

            const effW = canvas.width / zoomLevel;
            const effH = canvas.height / zoomLevel;

            const topSafePad = 140 / zoomLevel;
            const botSafePad = 95 / zoomLevel;
            let camX = me.x - effW / 2;
            let camY = me.y - effH / 2 - 20;

            if (worldW <= effW) {
                camX = (worldW - effW) / 2;
            } else {
                camX = Math.max(0, Math.min(worldW - effW, camX));
            }
            if (worldH + topSafePad + botSafePad <= effH) {
                camY = (worldH - effH) / 2 - (topSafePad - botSafePad) / 2;
            } else {
                camY = Math.max(-topSafePad, Math.min(worldH - effH + botSafePad, camY));
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            ctx.scale(zoomLevel, zoomLevel);
            ctx.translate(-camX, -camY);

            // 1. Vẽ bản đồ theo khu vực hiện tại
            if (me.scene === 'neighborhood') {
                drawNeighborhoodWorld(lighting);
            } else if (me.scene === 'private_room') {
                drawPrivateRoomWorld(lighting);
            } else {
                drawHouseInteriorWorld(lighting);
            }

            // 2. Vẽ các nhân vật đang ở cùng khu vực (sắp xếp theo trục Y để tạo chiều sâu)
            const visibleMembers = state.members
                .filter(m => {
                    if (m.scene !== me.scene) return false;
                    if (me.scene === 'private_room') {
                        const myRoomId = me.privateRoomId || activePrivateRoomId;
                        return (m.privateRoomId || null) === myRoomId;
                    }
                    return true;
                })
                .sort((a, b) => a.y - b.y);

            visibleMembers.forEach(m => {
                drawDetailedChibi(m, m.id === me.id);
            });

            ctx.restore();

            // 3. Lớp phủ ánh sáng ban đêm / hoàng hôn
            if (lighting.overlayAlpha > 0 && me.scene === 'neighborhood') {
                ctx.fillStyle = lighting.overlayColor;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            updateHUD();
            requestAnimationFrame(gameLoop);
        }

        // Khởi tạo dữ liệu và bắt đầu vòng lặp game
        loadGame();
        updateHUD();
        renderChatLog();
        requestAnimationFrame(gameLoop);
