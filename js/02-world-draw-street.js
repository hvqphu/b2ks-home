/* =========================================================================
           4. HỆ THỐNG THỜI GIAN THỰC & CHIẾU SÁNG BAN NGÀY / BAN ĐÊM
           ========================================================================= */
        function getRealTimeLighting() {
            const now = new Date();
            const h = now.getHours();
            const m = now.getMinutes();
            const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

            if (h >= 6 && h < 17) {
                return {
                    phase: 'day',
                    label: `☀️ ${timeStr}`,
                    skyTop: '#74B9FF',
                    skyBottom: '#DFF9FB',
                    overlayColor: 'rgba(0,0,0,0)',
                    overlayAlpha: 0,
                    isNight: false
                };
            } else if (h >= 17 && h < 19) {
                return {
                    phase: 'sunset',
                    label: `🌇 ${timeStr}`,
                    skyTop: '#FF7675',
                    skyBottom: '#FFEAA7',
                    overlayColor: 'rgba(230, 126, 34, 0.16)',
                    overlayAlpha: 0.16,
                    isNight: false
                };
            } else {
                return {
                    phase: 'night',
                    label: `🌙 ${timeStr}`,
                    skyTop: '#0C2461',
                    skyBottom: '#1E3799',
                    overlayColor: 'rgba(10, 18, 45, 0.42)',
                    overlayAlpha: 0.42,
                    isNight: true
                };
            }
        }

        /* =========================================================================
           5. ĐỒ HỌA THẾ GIỚI 2D RPG CHI TIẾT (NHÀ Ở & KHU PHỐ MỞ RỘNG v19)
           ========================================================================= */
        const canvas = document.getElementById('game-canvas');
        const ctx = canvas.getContext('2d');

        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        const HOUSE_WORLD = { width: 1100, height: 740 };
        const PRIVATE_ROOM_WORLD = { width: 760, height: 520 };
        // Mở rộng bề ngang khu phố lên 2950px để giãn cách thoáng đãng các công trình & thêm Zoo, Flea Market, Interworld Hub
        const STREET_WORLD = { width: 2950, height: 640 };

        function drawRoundRect(x, y, w, h, r, fill, stroke = '#2C3E50', lw = 3) {
            ctx.beginPath();
            ctx.roundRect(x, y, w, h, r);
            if (fill) { ctx.fillStyle = fill; ctx.fill(); }
            if (stroke && lw > 0) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); }
        }

        function drawWallClock(x, y, radius = 18) {
            const now = new Date();
            const sec = now.getSeconds();
            const min = now.getMinutes();
            const hr = now.getHours() % 12;

            ctx.save();
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = '#FFFDF7';
            ctx.fill();
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#2C3E50';
            ctx.stroke();

            for (let i = 0; i < 12; i++) {
                const ang = (i * Math.PI) / 6;
                ctx.beginPath();
                ctx.moveTo(x + Math.cos(ang) * (radius - 4), y + Math.sin(ang) * (radius - 4));
                ctx.lineTo(x + Math.cos(ang) * (radius - 2), y + Math.sin(ang) * (radius - 2));
                ctx.lineWidth = 1.5;
                ctx.strokeStyle = '#2C3E50';
                ctx.stroke();
            }

            const hrAng = ((hr + min / 60) * Math.PI) / 6 - Math.PI / 2;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + Math.cos(hrAng) * (radius * 0.52), y + Math.sin(hrAng) * (radius * 0.52));
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#2C3E50';
            ctx.stroke();

            const minAng = ((min + sec / 60) * Math.PI) / 30 - Math.PI / 2;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + Math.cos(minAng) * (radius * 0.74), y + Math.sin(minAng) * (radius * 0.74));
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#E74C3C';
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(x, y, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = '#2C3E50';
            ctx.fill();
            ctx.restore();
        }

        function drawWindowWithSky(x, y, w, h, lighting) {
            drawRoundRect(x, y, w, h, 8, lighting.isNight ? '#1B2631' : '#85C1E9', '#5D4037', 3);
            if (lighting.isNight) {
                ctx.fillStyle = '#F9E79F';
                ctx.beginPath();
                ctx.arc(x + w * 0.7, y + h * 0.35, 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillRect(x + 12, y + 14, 2, 2);
                ctx.fillRect(x + 25, y + 26, 2, 2);
            } else {
                ctx.fillStyle = 'rgba(255,255,255,0.75)';
                ctx.beginPath();
                ctx.arc(x + 18, y + 18, 7, 0, Math.PI * 2);
                ctx.arc(x + 26, y + 18, 6, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.strokeStyle = '#5D4037';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h);
            ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2);
            ctx.stroke();
        }

        function drawDetailedHouse(x, y, lighting) {
            ctx.fillStyle = 'rgba(0,0,0,0.14)';
            ctx.beginPath();
            ctx.ellipse(x + 150, y + 215, 155, 18, 0, 0, Math.PI * 2);
            ctx.fill();

            drawRoundRect(x + 18, y + 75, 264, 138, 10, '#FFF8E7', '#2C3E50', 3.5);
            drawRoundRect(x + 18, y + 188, 264, 25, 4, '#D5D8DC', '#2C3E50', 2.5);

            ctx.beginPath();
            ctx.moveTo(x + 4, y + 82);
            ctx.lineTo(x + 150, y + 4);
            ctx.lineTo(x + 296, y + 82);
            ctx.closePath();
            ctx.fillStyle = '#E74C3C';
            ctx.fill();
            ctx.lineWidth = 3.5;
            ctx.strokeStyle = '#2C3E50';
            ctx.stroke();

            ctx.strokeStyle = 'rgba(146, 43, 33, 0.35)';
            ctx.lineWidth = 2;
            for (let ry = y + 24; ry < y + 78; ry += 14) {
                const span = ((ry - (y + 4)) / 78) * 135;
                ctx.beginPath();
                ctx.moveTo(x + 150 - span, ry);
                ctx.lineTo(x + 150 + span, ry);
                ctx.stroke();
            }

            drawRoundRect(x + 212, y + 14, 28, 42, 4, '#922B21', '#2C3E50', 3);
            drawRoundRect(x + 208, y + 10, 36, 8, 3, '#7B241C', '#2C3E50', 2.5);

            ctx.beginPath();
            ctx.arc(x + 150, y + 50, 14, 0, Math.PI * 2);
            ctx.fillStyle = lighting.isNight ? '#F7DC6F' : '#AED6F1';
            ctx.fill();
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = '#2C3E50';
            ctx.stroke();

            const winColor = lighting.isNight ? '#F9E79F' : '#85C1E9';
            drawRoundRect(x + 42, y + 112, 54, 48, 8, winColor, '#5D4037', 3);
            drawRoundRect(x + 204, y + 112, 54, 48, 8, winColor, '#5D4037', 3);
            ctx.strokeStyle = '#5D4037';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x + 69, y + 112); ctx.lineTo(x + 69, y + 160);
            ctx.moveTo(x + 42, y + 136); ctx.lineTo(x + 96, y + 136);
            ctx.moveTo(x + 231, y + 112); ctx.lineTo(x + 231, y + 160);
            ctx.moveTo(x + 204, y + 136); ctx.lineTo(x + 258, y + 136);
            ctx.stroke();

            drawRoundRect(x + 38, y + 158, 62, 10, 4, '#27AE60', '#2C3E50', 2);
            drawRoundRect(x + 200, y + 158, 62, 10, 4, '#27AE60', '#2C3E50', 2);
            ctx.font = '13px sans-serif';
            ctx.fillText('🌷🌼🌺', x + 43, y + 157);
            ctx.fillText('🌻🌹🌷', x + 205, y + 157);

            drawRoundRect(x + 122, y + 124, 56, 89, 8, '#8E44AD', '#2C3E50', 3);
            drawRoundRect(x + 130, y + 132, 40, 32, 4, '#A569BD', '#2C3E50', 2);
            ctx.fillStyle = '#F1C40F';
            ctx.beginPath(); ctx.arc(x + 168, y + 172, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

            drawRoundRect(x + 76, y + 84, 148, 24, 8, '#2ECC71', '#2C3E50', 2.5);
            ctx.fillStyle = '#FFF';
            ctx.font = '700 12px Fredoka, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('🏡 NHÀ GIA ĐÌNH B2KS', x + 150, y + 100);
        }

        function drawDetailedShop(x, y, cfg, lighting) {
            ctx.fillStyle = 'rgba(0,0,0,0.14)';
            ctx.beginPath();
            ctx.ellipse(x + 120, y + 215, 125, 16, 0, 0, Math.PI * 2);
            ctx.fill();

            drawRoundRect(x + 12, y + 58, 216, 155, 10, cfg.wallColor, '#2C3E50', 3.5);
            drawRoundRect(x + 6, y + 36, 228, 26, 8, cfg.roofColor, '#2C3E50', 3);

            const stripeCount = 8;
            const stripeW = 216 / stripeCount;
            for (let i = 0; i < stripeCount; i++) {
                const sx = x + 12 + i * stripeW;
                ctx.beginPath();
                ctx.moveTo(sx, y + 62);
                ctx.lineTo(sx + stripeW, y + 62);
                ctx.lineTo(sx + stripeW - 4, y + 84);
                ctx.lineTo(sx - 4, y + 84);
                ctx.closePath();
                ctx.fillStyle = i % 2 === 0 ? cfg.awningA : '#FFFFFF';
                ctx.fill();
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#2C3E50';
                ctx.stroke();
            }

            drawRoundRect(x + 28, y + 18, 184, 26, 8, '#FFF', '#2C3E50', 3);
            ctx.fillStyle = '#2C3E50';
            ctx.font = '700 12px Fredoka, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(cfg.title, x + 120, y + 35);

            const glassColor = lighting.isNight ? '#FCF3CF' : '#D6EAF8';
            drawRoundRect(x + 26, y + 102, 106, 72, 8, glassColor, '#2C3E50', 2.5);
            ctx.font = '26px sans-serif';
            ctx.fillText(cfg.displayIcons, x + 79, y + 148);

            drawRoundRect(x + 148, y + 114, 58, 99, 8, '#5D4037', '#2C3E50', 3);
            drawRoundRect(x + 155, y + 122, 44, 44, 4, glassColor, '#2C3E50', 2);
            ctx.fillStyle = '#F1C40F';
            ctx.beginPath(); ctx.arc(x + 196, y + 168, 4, 0, Math.PI * 2); ctx.fill();
        }

        // Công trình đặc biệt 1: Trung Tâm Giao Dịch Xuyên Thế Giới (Cosmic Interworld Portal)
        function drawInterworldHub(x, y, lighting) {
            ctx.fillStyle = 'rgba(0,0,0,0.18)';
            ctx.beginPath();
            ctx.ellipse(x + 135, y + 215, 140, 18, 0, 0, Math.PI * 2);
            ctx.fill();

            // Tòa tháp pha lê tím xanh
            drawRoundRect(x + 15, y + 52, 240, 161, 16, '#1B2631', '#F1C40F', 3.5);
            // Mái vòm năng lượng
            ctx.beginPath();
            ctx.arc(x + 135, y + 55, 85, Math.PI, 0);
            ctx.fillStyle = '#0F3460';
            ctx.fill();
            ctx.lineWidth = 3.5;
            ctx.strokeStyle = '#F1C40F';
            ctx.stroke();

            // Vòng xoáy cổng không gian ở giữa
            const pulse = Math.sin(Date.now() / 320) * 4;
            ctx.beginPath();
            ctx.arc(x + 135, y + 145, 44 + pulse, 0, Math.PI * 2);
            ctx.fillStyle = '#3498DB';
            ctx.fill();
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#00FFFF';
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(x + 135, y + 145, 28 - pulse * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = '#8E44AD';
            ctx.fill();

            ctx.font = '32px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('🌌', x + 135, y + 156);

            // Biển hiệu phát sáng
            drawRoundRect(x + 10, y + 14, 250, 28, 10, '#0F2027', '#F1C40F', 3);
            ctx.fillStyle = '#F1C40F';
            ctx.font = '700 12px Fredoka, sans-serif';
            ctx.fillText('🌌 TRUNG TÂM XUYÊN THẾ GIỚI', x + 135, y + 32);

            ctx.font = '18px sans-serif';
            ctx.fillText('💎', x + 48, y + 135);
            ctx.fillText('🎁', x + 222, y + 135);
        }

        // Công trình đặc biệt 2: Sở Thú Ảo B2KS Zoo
        function drawB2KSZoo(x, y, lighting) {
            ctx.fillStyle = 'rgba(0,0,0,0.14)';
            ctx.beginPath();
            ctx.ellipse(x + 145, y + 215, 150, 18, 0, 0, Math.PI * 2);
            ctx.fill();

            // Khuôn viên vườn thú hàng rào gỗ & tán cây
            drawRoundRect(x + 10, y + 68, 270, 145, 14, '#A9DFBF', '#2C3E50', 3.5);
            // Cổng vòm gỗ Safari
            drawRoundRect(x + 75, y + 32, 140, 42, 12, '#D35400', '#2C3E50', 3.5);
            drawRoundRect(x + 95, y + 54, 100, 32, 8, '#FDEBD0', '#2C3E50', 2.5);

            ctx.fillStyle = '#FFF';
            ctx.font = '700 13px Fredoka, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('🦁 SỞ THÚ ẢO B2KS ZOO', x + 145, y + 48);

            // Hàng rào gỗ phía trước
            ctx.fillStyle = '#BA4A00';
            for (let fx = x + 22; fx <= x + 260; fx += 24) {
                drawRoundRect(fx, y + 178, 10, 35, 3, '#CA6F1E', '#2C3E50', 2);
            }
            drawRoundRect(x + 16, y + 188, 258, 8, 2, '#E67E22', '#2C3E50', 2);

            // Các loài thú sinh động bên trong
            ctx.font = '34px sans-serif';
            ctx.fillText('🦒', x + 55, y + 145);
            ctx.fillText('🦁', x + 145, y + 150);
            ctx.fillText('🐘', x + 232, y + 145);
            ctx.font = '24px sans-serif';
            ctx.fillText('🌴', x + 32, y + 105);
            ctx.fillText('🌴', x + 255, y + 105);
        }

        function drawParkPlayground(x, y, lighting) {
            drawRoundRect(x, y + 95, 290, 125, 18, '#A3E4D7', '#2C3E50', 3);
            drawRoundRect(x + 18, y + 112, 254, 92, 14, '#FAD7A0', '#D35400', 2.5);

            ctx.strokeStyle = '#2C3E50';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(x + 42, y + 185); ctx.lineTo(x + 62, y + 105); ctx.lineTo(x + 82, y + 185);
            ctx.moveTo(x + 112, y + 185); ctx.lineTo(x + 132, y + 105); ctx.lineTo(x + 152, y + 185);
            ctx.moveTo(x + 56, y + 105); ctx.lineTo(x + 138, y + 105);
            ctx.stroke();

            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x + 78, y + 105); ctx.lineTo(x + 78, y + 152);
            ctx.moveTo(x + 114, y + 105); ctx.lineTo(x + 114, y + 152);
            ctx.stroke();
            drawRoundRect(x + 70, y + 150, 20, 7, 3, '#E74C3C', '#2C3E50', 2);
            drawRoundRect(x + 106, y + 150, 20, 7, 3, '#3498DB', '#2C3E50', 2);

            drawRoundRect(x + 175, y + 118, 34, 66, 6, '#9B59B6', '#2C3E50', 2.5);
            ctx.beginPath();
            ctx.moveTo(x + 209, y + 126);
            ctx.quadraticCurveTo(x + 242, y + 135, x + 256, y + 184);
            ctx.lineTo(x + 240, y + 184);
            ctx.quadraticCurveTo(x + 228, y + 146, x + 209, y + 140);
            ctx.closePath();
            ctx.fillStyle = '#F1C40F';
            ctx.fill();
            ctx.stroke();

            drawRoundRect(x + 68, y + 66, 154, 24, 8, '#2ECC71', '#2C3E50', 2.5);
            ctx.fillStyle = '#FFF';
            ctx.font = '700 12px Fredoka, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('🎠 KHU VUI CHƠI ARCADE', x + 145, y + 82);
        }

        function drawStreetLamp(x, y, isNight) {
            ctx.fillStyle = '#2C3E50';
            ctx.fillRect(x - 3, y - 62, 6, 62);
            drawRoundRect(x - 10, y - 76, 20, 16, 6, isNight ? '#F9E79F' : '#ECF0F1', '#2C3E50', 2.5);
            if (isNight) {
                const grad = ctx.createRadialGradient(x, y - 68, 4, x, y - 40, 68);
                grad.addColorStop(0, 'rgba(249, 231, 159, 0.55)');
                grad.addColorStop(1, 'rgba(249, 231, 159, 0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(x, y - 40, 68, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        function drawNeighborhoodWorld(lighting) {
            const skyGrad = ctx.createLinearGradient(0, 0, 0, 290);
            skyGrad.addColorStop(0, lighting.skyTop);
            skyGrad.addColorStop(1, lighting.skyBottom);
            ctx.fillStyle = skyGrad;
            ctx.fillRect(0, 0, STREET_WORLD.width, 290);

            if (lighting.isNight) {
                ctx.fillStyle = '#FFF';
                for (let sx = 60; sx < STREET_WORLD.width; sx += 155) {
                    ctx.beginPath();
                    ctx.arc(sx, 36 + (sx % 55), 2.2, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.fillStyle = '#F9E79F';
                ctx.beginPath();
                ctx.arc(2720, 68, 26, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillStyle = '#F1C40F';
                ctx.beginPath();
                ctx.arc(2720, 68, 28, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.88)';
                [210, 680, 1180, 1680, 2180, 2550].forEach((cx, idx) => {
                    const cy = 54 + (idx % 2) * 24;
                    ctx.beginPath();
                    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
                    ctx.arc(cx + 22, cy - 6, 26, 0, Math.PI * 2);
                    ctx.arc(cx + 46, cy, 20, 0, Math.PI * 2);
                    ctx.fill();
                });
            }

            // Đồi cỏ xa
            ctx.fillStyle = lighting.isNight ? '#1E8449' : '#58D68D';
            ctx.beginPath();
            ctx.moveTo(0, 290);
            for (let hx = 0; hx <= STREET_WORLD.width; hx += 250) {
                ctx.quadraticCurveTo(hx + 125, 232, hx + 250, 290);
            }
            ctx.fill();

            // Nền cỏ khu phố & Vỉa hè & Đường nhựa
            ctx.fillStyle = lighting.isNight ? '#196F3D' : '#2ECC71';
            ctx.fillRect(0, 285, STREET_WORLD.width, 355);

            ctx.fillStyle = '#D5D8DC';
            ctx.fillRect(0, 355, STREET_WORLD.width, 65);
            ctx.fillStyle = '#BDC3C7';
            ctx.fillRect(0, 415, STREET_WORLD.width, 8);

            ctx.fillStyle = '#34495E';
            ctx.fillRect(0, 423, STREET_WORLD.width, 145);

            ctx.strokeStyle = '#F1C40F';
            ctx.lineWidth = 4;
            ctx.setLineDash([28, 22]);
            ctx.beginPath();
            ctx.moveTo(0, 495);
            ctx.lineTo(STREET_WORLD.width, 495);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = '#D5D8DC';
            ctx.fillRect(0, 568, STREET_WORLD.width, 72);

            // Bố trí các công trình cách nhau thoáng đãng (Cửa hàng thời trang & Khu vui chơi giãn cách 450px)
            // 1. Nhà gia đình B2KS (X = 70)
            drawDetailedHouse(70, 155, lighting);

            // 2. Siêu thị Mini (X = 430)
            drawDetailedShop(430, 155, {
                title: '🛒 SIÊU THỊ MINI',
                wallColor: '#FEF9E7',
                roofColor: '#27AE60',
                awningA: '#2ECC71',
                displayIcons: '🍎🥛🍞'
            }, lighting);

            // 3. Cửa hàng Thời trang (X = 740)
            drawDetailedShop(740, 155, {
                title: '👗 CỬA HÀNG THỜI TRANG',
                wallColor: '#FDEDEC',
                roofColor: '#8E44AD',
                awningA: '#AF7AC5',
                displayIcons: '👗🦸‍♂️🦄'
            }, lighting);

            // 4. Chợ Trời Flea Market (X = 1050)
            drawDetailedShop(1050, 155, {
                title: '🎪 CHỢ TRỜI FLEA MARKET',
                wallColor: '#FEF5E7',
                roofColor: '#D35400',
                awningA: '#F39C12',
                displayIcons: '🏷️🧸⚽'
            }, lighting);

            // 5. Khu Vui Chơi Arcade (X = 1360 - cách xa Cửa hàng thời trang 620px!)
            drawParkPlayground(1360, 155, lighting);

            // 6. Tiệm Tóc & Spa (X = 1710)
            drawDetailedShop(1710, 155, {
                title: '💇 TIỆM TÓC & SPA',
                wallColor: '#EBF5FB',
                roofColor: '#2980B9',
                awningA: '#5DADE2',
                displayIcons: '💇‍♀️✂️🪞'
            }, lighting);

            // 7. Trung Tâm Giao Dịch Xuyên Thế Giới (X = 2020)
            drawInterworldHub(2020, 155, lighting);

            // 8. Sở Thú Ảo B2KS Zoo (X = 2360)
            drawB2KSZoo(2360, 155, lighting);

            // Cây xanh & Đèn đường dọc tuyến phố
            const treePositions = [35, 395, 705, 1015, 1325, 1675, 1985, 2325, 2685, 2860];
            treePositions.forEach((tx, idx) => {
                ctx.fillStyle = '#7E5109';
                ctx.fillRect(tx - 6, 330, 12, 36);
                ctx.fillStyle = lighting.isNight ? '#145A32' : '#27AE60';
                ctx.beginPath();
                ctx.arc(tx, 314, 24, 0, Math.PI * 2);
                ctx.arc(tx - 15, 326, 17, 0, Math.PI * 2);
                ctx.arc(tx + 15, 326, 17, 0, Math.PI * 2);
                ctx.fill();

                if (idx % 2 === 0) {
                    drawStreetLamp(tx + 28, 365, lighting.isNight);
                }
            });
        }