// =========================================================================
// 12. VÒNG LẶP VẼ ĐỒ HỌA 2D CANVAS & KHỞI ĐỘNG HỆ THỐNG
// =========================================================================

function drawCharacterOnContext(c, m) {
    c.save();
    c.translate(m.x, m.y);

    // Bóng đổ dưới chân
    c.fillStyle = 'rgba(0,0,0,0.22)';
    c.beginPath();
    c.ellipse(0, 2, 16, 6, 0, 0, Math.PI * 2);
    c.fill();

    const bob = Math.sin(m.walkFrame || 0) * 2.5;
    const legSwing = Math.sin(m.walkFrame || 0) * 5;

    // Chân & Quần
    c.strokeStyle = '#2C3E50';
    c.lineWidth = 2;
    c.fillStyle = m.pants || '#2C3E50';
    c.fillRect(-9, -18 + legSwing * 0.4, 7, 17);
    c.strokeRect(-9, -18 + legSwing * 0.4, 7, 17);
    c.fillRect(2, -18 - legSwing * 0.4, 7, 17);
    c.strokeRect(2, -18 - legSwing * 0.4, 7, 17);

    // Áo choàng siêu anh hùng nếu mặc
    if (m.outfit === 'hero') {
        c.fillStyle = '#E74C3C';
        c.beginPath();
        c.moveTo(-12, -38 + bob);
        c.lineTo(12, -38 + bob);
        c.lineTo(18, -10 + bob);
        c.lineTo(-18, -10 + bob);
        c.closePath();
        c.fill();
    }

    // Thân áo
    c.fillStyle = m.shirt || '#3498DB';
    c.beginPath();
    c.roundRect(-12, -40 + bob, 24, 24, 6);
    c.fill();
    c.stroke();

    // Đầu
    c.fillStyle = m.skin || '#F5CBA7';
    c.beginPath();
    c.arc(0, -52 + bob, 13, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Tóc
    c.fillStyle = m.hair || '#2C3E50';
    c.beginPath();
    c.arc(0, -55 + bob, 13, Math.PI, Math.PI * 2);
    c.fill();

    // Mắt
    const eyeOffset = (m.dir || 1) * 3;
    c.fillStyle = '#1C2833';
    c.beginPath();
    c.arc(-3 + eyeOffset, -52 + bob, 1.8, 0, Math.PI * 2);
    c.arc(4 + eyeOffset, -52 + bob, 1.8, 0, Math.PI * 2);
    c.fill();

    // Vương miện nếu có
    if (m.outfit === 'crown') {
        c.fillStyle = '#F1C40F';
        c.beginPath();
        c.moveTo(-9, -64 + bob);
        c.lineTo(-5, -73 + bob);
        c.lineTo(0, -66 + bob);
        c.lineTo(5, -73 + bob);
        c.lineTo(9, -64 + bob);
        c.closePath();
        c.fill();
        c.stroke();
    }

    // Ly đồ uống đang cầm
    if (m.holdingDrink) {
        c.font = '16px sans-serif';
        c.fillText(m.holdingDrink, 14, -26 + bob);
    }

    // Bảng tên trên đầu
    c.font = 'bold 11.5px Fredoka, sans-serif';
    c.textAlign = 'center';
    const tagW = c.measureText(m.name).width + 12;
    c.fillStyle = m.id === state.currentUserId ? '#FFE66D' : 'rgba(255,255,255,0.9)';
    c.beginPath();
    c.roundRect(-tagW / 2, -88 + bob, tagW, 17, 6);
    c.fill();
    c.strokeStyle = '#2C3E50';
    c.lineWidth = 1.5;
    c.stroke();
    c.fillStyle = '#2C3E50';
    c.fillText(m.name, 0, -76 + bob);

    // Bong bóng thoại
    if (m.speech && m.speechTimer > 0) {
        c.font = '600 11.5px Fredoka, sans-serif';
        const txt = m.speech.length > 36 ? m.speech.slice(0, 35) + '...' : m.speech;
        const bw = c.measureText(txt).width + 16;
        c.fillStyle = '#FFFFFF';
        c.beginPath();
        c.roundRect(-bw / 2, -114 + bob, bw, 22, 8);
        c.fill();
        c.stroke();
        c.fillStyle = '#1B4F72';
        c.fillText(txt, 0, -99 + bob);
    }

    c.restore();
}

function drawHouseScene() {
    // Nền trời
    const grad = ctx.createLinearGradient(0, 0, 0, HOUSE_TOP + FLOOR_H * 3 + 120);
    grad.addColorStop(0, '#74B9FF');
    grad.addColorStop(1, '#DFE6E9');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, HOUSE_W, HOUSE_TOP + FLOOR_H * 3 + 140);

    // Mái nhà
    ctx.fillStyle = state.house.style === 'villa' ? '#2980B9' : (state.house.style === 'eco' ? '#27AE60' : '#E74C3C');
    ctx.strokeStyle = '#2C3E50';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-30, HOUSE_TOP);
    ctx.lineTo(HOUSE_W / 2, HOUSE_TOP - 130);
    ctx.lineTo(HOUSE_W + 30, HOUSE_TOP);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFE66D';
    ctx.font = 'bold 22px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏡 NHÀ PHỐ GIA ĐÌNH B2KS', HOUSE_W / 2, HOUSE_TOP - 40);

    const floorColors = ['#F5EEF8', '#EBF5FB', '#FEF9E7'];
    const floorNames = ['TẦNG 3: PHÒNG CÁC CON', 'TẦNG 2: PHÒNG BỐ MẸ', 'TẦNG 1: PHÒNG KHÁCH & BẾP'];

    for (let f = 0; f < 3; f++) {
        const fy = HOUSE_TOP + f * FLOOR_H;
        ctx.fillStyle = floorColors[f];
        ctx.fillRect(0, fy, HOUSE_W, FLOOR_H);
        ctx.strokeStyle = '#2C3E50';
        ctx.lineWidth = 4;
        ctx.strokeRect(0, fy, HOUSE_W, FLOOR_H);

        // Sàn gỗ
        ctx.fillStyle = '#D35400';
        ctx.fillRect(0, fy + FLOOR_H - 55, HOUSE_W, 55);

        ctx.fillStyle = 'rgba(44,62,80,0.55)';
        ctx.font = 'bold 14px Fredoka, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(floorNames[f], 24, fy + 28);
    }

    // Vẽ các điểm tương tác trong nhà
    const spots = getHouseDoorsAndSpots();
    spots.forEach(s => {
        ctx.fillStyle = 'rgba(255, 230, 109, 0.38)';
        ctx.beginPath();
        ctx.arc(s.x, s.y, 28, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '26px sans-serif';
        ctx.textAlign = 'center';
        const icon = s.label.split(' ')[0];
        ctx.fillText(icon, s.x, s.y - 6);

        ctx.font = 'bold 11.5px Fredoka, sans-serif';
        ctx.fillStyle = '#2C3E50';
        ctx.fillText(s.label.replace(/^[^\s]+\s/, ''), s.x, s.y + 18);
    });
}

function drawPrivateRoomScene() {
    const owner = state.members.find(m => m.id === activePrivateRoomOwnerId) || getCurrentUser();
    ctx.fillStyle = owner.roomWall || '#D6EAF8';
    ctx.fillRect(0, 0, PR_W, PR_H);
    ctx.strokeStyle = '#2C3E50';
    ctx.lineWidth = 6;
    ctx.strokeRect(0, 0, PR_W, PR_H);

    // Sàn phòng
    ctx.fillStyle = '#E59866';
    ctx.fillRect(0, PR_H - 150, PR_W, 150);

    // Giường ngủ
    ctx.fillStyle = '#3498DB';
    ctx.beginPath();
    ctx.roundRect(PR_W / 2 - 75, 130, 150, 95, 14);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#FFF';
    ctx.fillRect(PR_W / 2 - 60, 140, 50, 26);
    ctx.fillRect(PR_W / 2 + 10, 140, 50, 26);

    // Hiển thị đồ đã đặt ở 2 góc
    if (owner.roomPlaced?.left) {
        ctx.font = '38px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(owner.roomPlaced.left.icon, 255, 225);
        ctx.font = 'bold 11px Fredoka, sans-serif';
        ctx.fillStyle = '#2C3E50';
        ctx.fillText(owner.roomPlaced.left.name, 255, 245);
    }
    if (owner.roomPlaced?.right) {
        ctx.font = '38px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(owner.roomPlaced.right.icon, PR_W - 235, 225);
        ctx.font = 'bold 11px Fredoka, sans-serif';
        ctx.fillStyle = '#2C3E50';
        ctx.fillText(owner.roomPlaced.right.name, PR_W - 235, 245);
    }

    getPrivateRoomSpots().forEach(s => {
        ctx.fillStyle = 'rgba(255, 230, 109, 0.45)';
        ctx.beginPath();
        ctx.arc(s.x, s.y, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(s.label.split(' ')[0], s.x, s.y + 4);
    });
}

function drawStreetScene() {
    // Bầu trời
    ctx.fillStyle = '#81ECEC';
    ctx.fillRect(0, 0, STREET_W, 430);

    // Vỉa hè & Đại lộ
    ctx.fillStyle = '#DFE6E9';
    ctx.fillRect(0, 430, STREET_W, 90);
    ctx.fillStyle = '#34495E';
    ctx.fillRect(0, 520, STREET_W, 110);
    ctx.fillStyle = '#55EFC4';
    ctx.fillRect(0, 630, STREET_W, 130);

    // Vạch kẻ đường
    ctx.fillStyle = '#FFEAA7';
    for (let x = 20; x < STREET_W; x += 90) {
        ctx.fillRect(x, 572, 48, 6);
    }

    const plotCenters = [420, 1280, 2140];
    const myHouseX = plotCenters[state.house.plotIndex] || 1280;

    const buildings = [
        { x: myHouseX, y: 270, w: 190, h: 160, color: '#E74C3C', icon: '🏡', title: 'NHÀ PHỐ B2KS' },
        { x: 760, y: 280, w: 180, h: 150, color: '#3498DB', icon: '🏫', title: 'TRƯỜNG TIẾNG ANH' },
        { x: 1020, y: 285, w: 170, h: 145, color: '#2ECC71', icon: '🏪', title: 'SIÊU THỊ GIA ĐÌNH' },
        { x: 1560, y: 285, w: 170, h: 145, color: '#FF6B81', icon: '👗', title: 'SHOP THỜI TRANG' },
        { x: 1840, y: 290, w: 170, h: 140, color: '#E67E22', icon: '☕', title: 'QUÁN CÀ PHÊ' },
        { x: 2420, y: 275, w: 190, h: 155, color: '#8E44AD', icon: '🧪', title: 'PHÒNG THÍ NGHIỆM' },
        { x: 2740, y: 285, w: 180, h: 145, color: '#00CEC9', icon: '🕹️', title: 'KHU VUI CHƠI' },
        // 3 Tòa nhà mới phía dưới đại lộ:
        { x: 240, y: 635, w: 220, h: 110, color: '#D35400', icon: '🎪', title: 'CHỢ TRỜI GIA ĐÌNH' },
        { x: 1450, y: 635, w: 240, h: 110, color: '#1E8449', icon: '🦁', title: 'SỞ THÚ ẢO B2KS' },
        { x: 2680, y: 635, w: 260, h: 110, color: '#4A148C', icon: '🌌', title: 'TRUNG TÂM XUYÊN THẾ GIỚI' }
    ];

    buildings.forEach(b => {
        ctx.fillStyle = b.color;
        ctx.strokeStyle = '#2C3E50';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.roundRect(b.x - b.w / 2, b.y, b.w, b.h, 14);
        ctx.fill();
        ctx.stroke();

        ctx.font = '34px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(b.icon, b.x, b.y + 52);

        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 13px Fredoka, sans-serif';
        ctx.fillText(b.title, b.x, b.y + 84);
    });
}

function updateGame() {
    const user = getCurrentUser();
    let vx = 0;
    let vy = 0;
    if (keys['arrowleft'] || keys['a']) vx -= 1;
    if (keys['arrowright'] || keys['d']) vx += 1;
    if (keys['arrowup'] || keys['w']) vy -= 1;
    if (keys['arrowdown'] || keys['s']) vy += 1;
    if (Math.hypot(joyVec.x, joyVec.y) > 0.12) {
        vx = joyVec.x;
        vy = joyVec.y;
    }

    const speed = 4.2;
    let moved = false;
    if (vx !== 0 || vy !== 0) {
        const len = Math.hypot(vx, vy);
        user.x += (vx / len) * speed;
        user.y += (vy / len) * speed;
        user.targetX = user.x;
        user.targetY = user.y;
        if (vx < -0.1) user.dir = -1;
        if (vx > 0.1) user.dir = 1;
        moved = true;
    } else if (Math.hypot(user.targetX - user.x, user.targetY - user.y) > 4) {
        const dx = user.targetX - user.x;
        const dy = user.targetY - user.y;
        const dist = Math.hypot(dx, dy);
        user.x += (dx / dist) * speed;
        user.y += (dy / dist) * speed;
        if (dx < -0.5) user.dir = -1;
        if (dx > 0.5) user.dir = 1;
        moved = true;
    }

    if (moved) {
        user.walkFrame = (user.walkFrame || 0) + 0.25;
        pushMyPositionToFirebase();
    }

    // Giới hạn di chuyển theo cảnh
    if (gameScene === 'house') {
        user.x = Math.max(30, Math.min(HOUSE_W - 30, user.x));
        user.y = Math.max(HOUSE_TOP + 60, Math.min(HOUSE_TOP + FLOOR_H * 3 - 15, user.y));
    } else if (gameScene === 'private_room') {
        user.x = Math.max(40, Math.min(PR_W - 40, user.x));
        user.y = Math.max(120, Math.min(PR_H - 25, user.y));
    } else {
        user.x = Math.max(40, Math.min(STREET_W - 40, user.x));
        user.y = Math.max(445, Math.min(STREET_H - 25, user.y));
    }

    // Cập nhật di chuyển mượt của các thành viên khác
    state.members.forEach(m => {
        if (m.speechTimer > 0) m.speechTimer--;
        if (m.id === user.id) return;
        const dx = (m.targetX || m.x) - m.x;
        const dy = (m.targetY || m.y) - m.y;
        const d = Math.hypot(dx, dy);
        if (d > 3) {
            m.x += (dx / d) * 3.5;
            m.y += (dy / d) * 3.5;
            m.walkFrame = (m.walkFrame || 0) + 0.2;
        }
    });

    // Kiểm tra điểm tương tác gần nhất
    const spots = gameScene === 'house'
        ? getHouseDoorsAndSpots()
        : (gameScene === 'private_room' ? getPrivateRoomSpots() : getStreetSpots());

    nearInteractable = null;
    let bestDist = Infinity;
    spots.forEach(s => {
        const d = Math.hypot(user.x - s.x, user.y - s.y);
        if (d <= s.r && d < bestDist) {
            bestDist = d;
            nearInteractable = s;
        }
    });

    const ibtn = document.getElementById('interact-btn');
    if (nearInteractable) {
        ibtn.style.display = 'inline-flex';
        ibtn.textContent = nearInteractable.label;
    } else {
        ibtn.style.display = 'none';
    }
}

function renderGame() {
    ctx.clearRect(0, 0, W, H);
    const scale = getViewportScale();
    const user = getCurrentUser();

    camera.x = user.x - (W / scale) / 2;
    camera.y = user.y - (H / scale) / 2;

    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(-camera.x, -camera.y);

    if (gameScene === 'house') drawHouseScene();
    else if (gameScene === 'private_room') drawPrivateRoomScene();
    else drawStreetScene();

    // Vẽ các thành viên theo thứ tự Y
    const sortedMembers = [...state.members].sort((a, b) => a.y - b.y);
    sortedMembers.forEach(m => drawCharacterOnContext(ctx, m));

    ctx.restore();
}

function mainLoop() {
    updateGame();
    renderGame();
    requestAnimationFrame(mainLoop);
}

// Khởi chạy ứng dụng
checkDailyReset();
updateHUD();
startFirebaseRealtimeLoop();
mainLoop();
