/* =========================================================================
           6. VẼ KHÔNG GIAN BÊN TRONG NGÔI NHÀ (CẦU THANG LÊN KHU PHÒNG NGỦ)
           ========================================================================= */
        function drawHouseInteriorWorld(lighting) {
            ctx.fillStyle = '#EAECEE';
            ctx.fillRect(0, 0, HOUSE_WORLD.width, HOUSE_WORLD.height);

            // Tường tầng trệt & hành lang cầu thang
            drawRoundRect(10, 10, 1080, 140, 12, '#FEF5E7', '#2C3E50', 3.5);
            drawRoundRect(10, 405, 1080, 95, 0, '#D7CCC8', '#2C3E50', 3);

            // Tường khu vực phòng ngủ riêng
            drawRoundRect(10, 460, 1080, 45, 0, '#F5EEF8', '#2C3E50', 3);

            // Cửa sổ & Đồng hồ tường phòng khách / phòng ăn
            drawWindowWithSky(85, 36, 92, 68, lighting);
            drawWallClock(225, 68, 20);
            drawWindowWithSky(520, 36, 92, 68, lighting);
            drawWindowWithSky(915, 36, 84, 68, lighting);

            // Khung tranh trang trí
            drawRoundRect(275, 42, 64, 48, 6, '#FFF', '#8E44AD', 3);
            ctx.font = '24px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('🏞️', 307, 74);

            // Vẽ từng phòng chức năng & phòng ngủ riêng
            HOUSE_ROOMS.forEach(room => {
                drawRoundRect(room.x, room.y, room.w, room.h, 12, room.floor, '#2C3E50', 3.5);

                // Bảng tên phòng
                drawRoundRect(room.x + 12, room.y + 10, Math.min(room.w - 24, 210), 26, 8, room.accent, '#2C3E50', 2);
                ctx.fillStyle = '#FFF';
                ctx.font = '700 12px Fredoka, sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText(room.name, room.x + 20, room.y + 27);

                // Trạng thái khóa cửa đối với phòng ngủ riêng
                if (room.ownerIds && room.ownerIds.length > 0) {
                    const locked = !!state.roomLocks[room.id];
                    drawRoundRect(room.x + room.w - 86, room.y + 10, 74, 26, 8, locked ? '#E74C3C' : '#2ECC71', '#2C3E50', 2);
                    ctx.fillStyle = '#FFF';
                    ctx.font = '700 11px Quicksand, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(locked ? '🔒 Khóa' : '🔓 Mở', room.x + room.w - 49, room.y + 27);

                    // Bậc cửa bước vào không gian phòng riêng
                    drawRoundRect(room.doorX - 32, room.y - 6, 64, 14, 4, '#8E44AD', '#2C3E50', 2.5);
                }
            });

            // Nội thất Phòng Khách (x:20..410, y:150..400)
            drawRoundRect(55, 195, 165, 58, 12, '#E67E22', '#2C3E50', 3); // Sofa
            drawRoundRect(65, 185, 145, 18, 8, '#D35400', '#2C3E50', 2.5);
            drawRoundRect(85, 272, 105, 46, 8, '#8D6E63', '#2C3E50', 2.5); // Bàn trà
            ctx.font = '20px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('🫖🍵', 137, 300);

            // Bàn Thí Nghiệm Khoa Học ở góc phải phòng khách
            drawRoundRect(275, 195, 110, 62, 10, '#D6EAF8', '#2980B9', 3);
            ctx.font = '28px sans-serif';
            ctx.fillText('🧪⚗️', 330, 234);
            ctx.font = '700 11px Quicksand, sans-serif';
            ctx.fillStyle = '#1B4F72';
            ctx.fillText('Bàn Thí Nghiệm', 330, 250);

            // Nội thất Bếp & Phòng Ăn (x:430..820, y:150..400)
            drawRoundRect(465, 190, 145, 52, 8, '#BDC3C7', '#2C3E50', 3); // Bếp nấu
            ctx.font = '24px sans-serif';
            ctx.fillText('🍳🍲', 537, 224);

            // Bàn Ăn Gia Đình
            drawRoundRect(645, 220, 140, 88, 16, '#F5B041', '#2C3E50', 3);
            ctx.font = '26px sans-serif';
            ctx.fillText('🍕🥗🍎', 715, 272);
            ctx.font = '700 11px Quicksand, sans-serif';
            ctx.fillStyle = '#7E5109';
            ctx.fillText('Bàn Ăn Tiếng Anh', 715, 298);

            // Nội thất Phòng Tắm Chung (x:840..1080, y:150..400)
            drawRoundRect(875, 195, 82, 54, 8, '#FFFFFF', '#2980B9', 2.5); // Bồn rửa & Gương
            ctx.font = '24px sans-serif';
            ctx.fillText('🪥🪞', 916, 228);

            drawRoundRect(975, 195, 85, 115, 12, '#D6EAF8', '#2980B9', 3); // Bồn tắm / Vòi sen
            ctx.font = '28px sans-serif';
            ctx.fillText('🚿🛁', 1017, 258);

            // Thảm cửa chính ra Khu Phố (Phía trên giữa hành lang)
            drawRoundRect(480, 102, 140, 44, 10, '#2ECC71', '#2C3E50', 3);
            ctx.fillStyle = '#FFF';
            ctx.font = '700 13px Fredoka, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('🚪 RA KHU PHỐ', 550, 129);
        }

        /* =========================================================================
           6B. KHÔNG GIAN PHÒNG NGỦ RIÊNG CHI TIẾT (PRIVATE ROOM SCENE)
           ========================================================================= */
        function enterPrivateRoomScene(room) {
            const me = getCurrentUser();
            me.scene = 'private_room';
            me.privateRoomId = room.id;
            activePrivateRoomId = room.id;
            me.x = 380;
            me.y = 445;
            me.dir = 'up';
            AudioEngine.playClick();
            showToast(`🚪 Đã bước vào ${room.name}`);
            lastHudSignature = '';
            updateHUD();
            saveGame();
        }

        function exitPrivateRoomToHallway() {
            const me = getCurrentUser();
            const roomId = me.privateRoomId || activePrivateRoomId || 'living';
            const room = HOUSE_ROOMS.find(r => r.id === roomId) || HOUSE_ROOMS[3];
            me.scene = 'house';
            me.privateRoomId = null;
            activePrivateRoomId = null;
            me.x = room.doorX;
            me.y = room.y - 32;
            me.dir = 'up';
            AudioEngine.playClick();
            showToast('🚶 Đã ra hành lang tầng phòng ngủ');
            lastHudSignature = '';
            updateHUD();
            saveGame();
        }

        function drawPrivateRoomWorld(lighting) {
            const me = getCurrentUser();
            const roomId = me.privateRoomId || activePrivateRoomId || 'parents_room';
            const room = HOUSE_ROOMS.find(r => r.id === roomId) || HOUSE_ROOMS[3];

            ctx.fillStyle = '#2C3E50';
            ctx.fillRect(0, 0, PRIVATE_ROOM_WORLD.width, PRIVATE_ROOM_WORLD.height);

            // Tường & Sàn gỗ ấm áp
            drawRoundRect(20, 20, 720, 150, 14, '#FFFDF9', '#2C3E50', 4);
            drawRoundRect(20, 165, 720, 335, 14, room.floor, '#2C3E50', 4);

            // Cửa sổ ngắm trời & Đồng hồ
            drawWindowWithSky(95, 48, 110, 82, lighting);
            drawWallClock(380, 75, 24);
            drawWindowWithSky(555, 48, 110, 82, lighting);

            // Tiêu đề phòng
            drawRoundRect(235, 115, 290, 34, 10, room.accent, '#2C3E50', 2.5);
            ctx.fillStyle = '#FFF';
            ctx.font = '700 15px Fredoka, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(room.name, 380, 137);

            // Giường ngủ lớn êm ái
            drawRoundRect(65, 210, 190, 135, 16, '#FFFFFF', '#2C3E50', 3.5);
            drawRoundRect(65, 210, 190, 36, 12, room.accent, '#2C3E50', 3);
            drawRoundRect(82, 254, 68, 34, 8, '#FFF9DB', '#2C3E50', 2);
            drawRoundRect(168, 254, 68, 34, 8, '#FFF9DB', '#2C3E50', 2);
            drawRoundRect(72, 296, 176, 44, 10, '#AED6F1', '#2C3E50', 2.5);
            ctx.font = '700 12px Quicksand, sans-serif';
            ctx.fillStyle = '#2C3E50';
            ctx.fillText('🛏️ Giường Ngủ', 160, 323);

            // Bàn học / Bàn làm việc
            drawRoundRect(505, 210, 185, 85, 12, '#F5CBA7', '#2C3E50', 3);
            ctx.font = '28px sans-serif';
            ctx.fillText('💻📚 Lamp', 597, 258);

            // Khu vực trưng bày đồ nội thất đã mua
            const items = state.roomFurniture[roomId] || [];
            drawRoundRect(285, 215, 190, 120, 14, 'rgba(255,255,255,0.75)', '#2C3E50', 2.5);
            ctx.font = '700 12px Quicksand, sans-serif';
            ctx.fillStyle = '#2C3E50';
            ctx.fillText('✨ Nội thất trang trí:', 380, 236);
            items.slice(0, 4).forEach((it, idx) => {
                ctx.font = '12px Quicksand, sans-serif';
                ctx.fillText(it, 380, 258 + idx * 18);
            });

            // Thảm cửa ra hành lang ở phía dưới
            drawRoundRect(310, 478, 140, 28, 8, '#E74C3C', '#2C3E50', 2.5);
            ctx.fillStyle = '#FFF';
            ctx.font = '700 12px Fredoka, sans-serif';
            ctx.fillText('⬇️ RA HÀNH LANG', 380, 496);
        }

        /* =========================================================================
           7. VẼ NHÂN VẬT CHIBI & BONG BÓNG HỘI THOẠI
           ========================================================================= */
        function drawDetailedChibi(member, isMe) {
            const x = member.x;
            const y = member.y;
            const isWalking = isMe && (keys['arrowup'] || keys['w'] || keys['arrowdown'] || keys['s'] || keys['arrowleft'] || keys['a'] || keys['arrowright'] || keys['d'] || joyActive);
            const bob = isWalking ? Math.sin(Date.now() / 90) * 3.5 : Math.sin(Date.now() / 420) * 1.2;

            ctx.save();
            // Bóng đổ dưới chân
            ctx.fillStyle = 'rgba(0,0,0,0.22)';
            ctx.beginPath();
            ctx.ellipse(x, y + 20, 17, 7, 0, 0, Math.PI * 2);
            ctx.fill();

            // Vòng sáng định vị nhân vật đang điều khiển
            if (isMe) {
                ctx.strokeStyle = '#F1C40F';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.ellipse(x, y + 20, 22, 10, 0, 0, Math.PI * 2);
                ctx.stroke();
            }

            const cy = y + bob;

            // Thân áo
            drawRoundRect(x - 13, cy - 4, 26, 22, 8, isParent(member) ? '#3498DB' : '#FF7675', '#2C3E50', 2.5);

            // Đầu Chibi
            ctx.beginPath();
            ctx.arc(x, cy - 18, 16, 0, Math.PI * 2);
            ctx.fillStyle = '#FDEBD0';
            ctx.fill();
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = '#2C3E50';
            ctx.stroke();

            // Mái tóc theo màu đã chọn ở Tiệm Tóc
            ctx.fillStyle = member.hairColor || '#2C3E50';
            ctx.beginPath();
            ctx.arc(x, cy - 21, 16.5, Math.PI, 0);
            ctx.fill();

            // Đôi mắt biểu cảm
            ctx.fillStyle = '#2C3E50';
            const eyeOffsetX = member.dir === 'left' ? -3 : (member.dir === 'right' ? 3 : 0);
            ctx.beginPath();
            ctx.arc(x - 5 + eyeOffsetX, cy - 17, 2.2, 0, Math.PI * 2);
            ctx.arc(x + 5 + eyeOffsetX, cy - 17, 2.2, 0, Math.PI * 2);
            ctx.fill();

            // Biểu tượng trang phục đang mặc phía trên đầu
            ctx.font = '16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(member.outfit || '👕', x, cy - 38);

            // Bảng tên nhân vật
            const nameW = Math.max(46, member.name.length * 9 + 16);
            drawRoundRect(x - nameW / 2, cy + 25, nameW, 18, 6, isMe ? '#F1C40F' : 'rgba(255,255,255,0.92)', '#2C3E50', 2);
            ctx.fillStyle = '#2C3E50';
            ctx.font = '700 11px Quicksand, sans-serif';
            ctx.fillText(member.name, x, cy + 37);

            // Bong bóng hội thoại nếu đang nói
            const bubble = activeSpeechBubbles[member.id];
            if (bubble && bubble.expires > Date.now()) {
                const text = bubble.text;
                ctx.font = '700 12px Quicksand, sans-serif';
                const bw = Math.min(220, Math.max(70, ctx.measureText(text).width + 20));
                drawRoundRect(x - bw / 2, cy - 76, bw, 26, 10, '#FFFFFF', '#2C3E50', 2.5);
                ctx.fillStyle = '#2C3E50';
                ctx.fillText(text.slice(0, 32), x, cy - 59);
            }

            ctx.restore();
        }