// =========================================================================
// 7. THẾ GIỚI 2D CANVAS: NHÀ PHỐ 3 TẦNG, PHÒNG RIÊNG & KHU PHỐ MỞ RỘNG
// =========================================================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let W = canvas.width = window.innerWidth;
let H = canvas.height = window.innerHeight;
window.addEventListener('resize', () => {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
});

let gameScene = 'house';
let activePrivateRoomOwnerId = null;
let activeSlotSide = null;
let nearInteractable = null;
let camera = { x: 0, y: 800 };
let userZoom = 1.0;

function adjustZoom(delta) {
    userZoom = Math.min(1.6, Math.max(0.55, +(userZoom + delta).toFixed(2)));
    playSound('pop');
    showToast(`🔍 Thu phóng bản đồ: ${Math.round(userZoom * 100)}%`);
}
function resetZoom() {
    userZoom = 1.0;
    playSound('pop');
    showToast('🔍 Thu phóng mặc định: 100%');
}

const HOUSE_W = 1000;
const FLOOR_H = 380;
const HOUSE_TOP = 240;
const STREET_W = 3100;
const STREET_H = 760;
const PR_W = 780;
const PR_H = 520;

const keys = {};
let joyVec = { x: 0, y: 0 };

window.addEventListener('keydown', e => {
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
    keys[e.key.toLowerCase()] = true;
    if (e.key === ' ' || e.key === 'Enter') {
        if (nearInteractable) triggerInteraction();
    }
});
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

const joyZone = document.getElementById('joystick-zone');
const joyKnob = document.getElementById('joystick-knob');
let joyActive = false;

function handleJoyMove(clientX, clientY) {
    const rect = joyZone.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const maxR = 38;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
        dx = (dx / dist) * maxR;
        dy = (dy / dist) * maxR;
    }
    joyKnob.style.transform = `translate(${dx}px, ${dy}px)`;
    joyVec.x = dx / maxR;
    joyVec.y = dy / maxR;
}
joyZone.addEventListener('pointerdown', e => { joyActive = true; joyZone.setPointerCapture(e.pointerId); handleJoyMove(e.clientX, e.clientY); });
joyZone.addEventListener('pointermove', e => { if (joyActive) handleJoyMove(e.clientX, e.clientY); });
joyZone.addEventListener('pointerup', () => { joyActive = false; joyKnob.style.transform = 'translate(0px, 0px)'; joyVec = { x: 0, y: 0 }; });

canvas.addEventListener('pointerdown', e => {
    const rect = canvas.getBoundingClientRect();
    const scale = getViewportScale();
    const worldX = (e.clientX - rect.left) / scale + camera.x;
    const worldY = (e.clientY - rect.top) / scale + camera.y;
    const user = getCurrentUser();
    user.targetX = worldX;
    user.targetY = worldY;
});

function getViewportScale() {
    const baseScale = Math.min(1.18, Math.max(0.68, Math.min(W / 1060, H / 680)));
    return baseScale * userZoom;
}

function getHouseDoorsAndSpots() {
    const spots = [];
    const f1Y = HOUSE_TOP + FLOOR_H * 2 + 270;
    const f2Y = HOUSE_TOP + FLOOR_H + 270;
    const f3Y = HOUSE_TOP + 270;

    spots.push({ id: 'door_out', x: 500, y: f1Y + 45, r: 65, label: '🚪 Ra Khu Phố', type: 'to_street' });
    spots.push({ id: 'tv_spot', x: 240, y: f1Y - 10, r: 75, label: '📺 Xem Smart TV', type: 'tv' });
    spots.push({ id: 'task_board', x: 420, y: f1Y - 25, r: 70, label: '📋 Bảng Nhiệm Vụ', type: 'tasks' });
    spots.push({ id: 'dining_table', x: 740, y: f1Y + 10, r: 85, label: '🍽️ Ăn Cơm Gia Đình', type: 'dining_puzzle' });

    spots.push({ id: 'stairs_1_to_2', x: 920, y: f1Y, r: 60, label: '🪜 Lên Tầng 2', type: 'teleport', tx: 920, ty: f2Y });
    spots.push({ id: 'stairs_2_to_1', x: 920, y: f2Y, r: 60, label: '🪜 Xuống Tầng 1', type: 'teleport', tx: 920, ty: f1Y });
    spots.push({ id: 'stairs_2_to_3', x: 80, y: f2Y, r: 60, label: '🪜 Lên Tầng 3', type: 'teleport', tx: 80, ty: f3Y });
    spots.push({ id: 'stairs_3_to_2', x: 80, y: f3Y, r: 60, label: '🪜 Xuống Tầng 2', type: 'teleport', tx: 80, ty: f2Y });

    const parents = state.members.filter(m => m.isParent);
    parents.forEach((p, idx) => {
        const rx = 250 + idx * 380;
        spots.push({ id: 'room_' + p.id, x: rx, y: f2Y - 10, r: 70, label: `🚪 Vào Phòng ${p.name}`, type: 'enter_private_room', ownerId: p.id });
    });

    const kids = state.members.filter(m => !m.isParent);
    kids.forEach((k, idx) => {
        const rx = 230 + idx * 320;
        spots.push({ id: 'room_' + k.id, x: rx, y: f3Y - 10, r: 70, label: `🚪 Vào Phòng ${k.name}`, type: 'enter_private_room', ownerId: k.id });
    });

    return spots;
}

function getPrivateRoomSpots() {
    const user = getCurrentUser();
    const owner = state.members.find(m => m.id === activePrivateRoomOwnerId) || user;
    const isOwner = (owner.id === user.id);
    const spots = [
        { id: 'pr_exit_door', x: PR_W / 2, y: PR_H - 55, r: 65, label: '🚪 Ra Hành Lang', type: 'exit_private_room' }
    ];
    if (isOwner) {
        spots.push(
            { id: 'pr_wardrobe', x: 135, y: 215, r: 72, label: '🧥 Mở Tủ Quần Áo', type: 'open_wardrobe' },
            { id: 'pr_slot_left', x: 255, y: 250, r: 65, label: '📌 Vị Trí Trang Trí Trái', type: 'pr_slot', side: 'left' },
            { id: 'pr_slot_right', x: PR_W - 235, y: 250, r: 65, label: '📌 Vị Trí Trang Trí Phải', type: 'pr_slot', side: 'right' }
        );
    }
    return spots;
}

function getStreetSpots() {
    const plotCenters = [420, 1280, 2140];
    const myHouseX = plotCenters[state.house.plotIndex] || 1280;
    return [
        { id: 'enter_house', x: myHouseX, y: 470, r: 75, label: '🏡 Vào Nhà Phố Gia Đình', type: 'to_house' },
        { id: 'enter_school', x: 760, y: 470, r: 80, label: '🏫 Vào Trường Tiếng Anh', type: 'school' },
        { id: 'enter_shop', x: 1020, y: 470, r: 80, label: '🏪 Vào Siêu Thị Gia Đình', type: 'shop' },
        { id: 'enter_fashion', x: 1560, y: 470, r: 80, label: '👗 Cửa Hàng Thời Trang', type: 'fashion' },
        { id: 'enter_cafe', x: 1840, y: 470, r: 80, label: '☕ Quán Cà Phê B2KS', type: 'cafe' },
        { id: 'enter_lab', x: 2420, y: 470, r: 85, label: '🧪 Phòng Thí Nghiệm Khoa Học', type: 'lab' },
        { id: 'enter_arcade', x: 2740, y: 470, r: 80, label: '🕹️ Khu Vui Chơi Giải Trí', type: 'arcade' },
        // 3 TÒA NHÀ MỚI DỌC ĐẠI LỘ B2KS:
        { id: 'enter_fleamarket', x: 240, y: 650, r: 85, label: '🎪 Chợ Trời Gia Đình', type: 'fleamarket' },
        { id: 'enter_zoo', x: 1450, y: 650, r: 90, label: '🦁 Sở Thú Ảo B2KS', type: 'zoo' },
        { id: 'enter_exchange', x: 2680, y: 650, r: 90, label: '🌌 Trung Tâm Xuyên Thế Giới', type: 'exchange' }
    ];
}

function updatePrivateRoomToolbar() {
    const toolbar = document.getElementById('private-room-toolbar');
    if (!toolbar) return;
    if (gameScene !== 'private_room') {
        toolbar.style.display = 'none';
        return;
    }
    const user = getCurrentUser();
    const owner = state.members.find(m => m.id === activePrivateRoomOwnerId) || user;
    const isOwner = (owner.id === user.id);

    toolbar.style.display = 'flex';
    document.getElementById('pr-room-badge').textContent = `🛏️ Phòng của ${owner.name}`;

    const privLabel = document.getElementById('pr-privacy-label');
    const wallSel = document.getElementById('pr-wall-select');
    if (isOwner) {
        privLabel.style.display = 'flex';
        wallSel.style.display = 'inline-block';
        document.getElementById('pr-privacy-check').checked = !!owner.roomUnlocked;
        wallSel.value = owner.roomWall || '#D6EAF8';
    } else {
        privLabel.style.display = 'none';
        wallSel.style.display = 'none';
    }
}

function togglePrivateRoomLockFromToolbar() {
    const user = getCurrentUser();
    if (activePrivateRoomOwnerId !== user.id) return;
    user.roomUnlocked = document.getElementById('pr-privacy-check').checked;
    saveState();
    playSound('pop');
    showToast(user.roomUnlocked ? '🔓 Đã mở cửa cho cả nhà vào chơi!' : '🔒 Đã khóa cửa phòng riêng!');
}

function changePrivateRoomWallFromToolbar() {
    const user = getCurrentUser();
    if (activePrivateRoomOwnerId !== user.id) return;
    user.roomWall = document.getElementById('pr-wall-select').value;
    saveState();
    playSound('pop');
    showToast('🎨 Đã đổi màu sơn tường phòng riêng!');
}

function enterPrivateRoom(ownerId) {
    const user = getCurrentUser();
    const owner = state.members.find(m => m.id === ownerId);
    if (!owner) return;
    if (owner.id !== user.id && !owner.roomUnlocked) {
        playSound('error');
        return showToast(`🔒 Phòng riêng của ${owner.name} đang khóa cửa! Hãy nhờ ${owner.name} mở khóa nhé.`);
    }
    activePrivateRoomOwnerId = owner.id;
    gameScene = 'private_room';
    user.x = PR_W / 2;
    user.y = PR_H - 115;
    user.targetX = user.x;
    user.targetY = user.y;
    document.getElementById('location-text').textContent = `Phòng của ${owner.name}`;
    updatePrivateRoomToolbar();
    playSound('pop');
    showToast(`🚪 Chào mừng đến với Phòng riêng của ${owner.name}!`);
}

function exitPrivateRoomToHallway() {
    const user = getCurrentUser();
    const owner = state.members.find(m => m.id === activePrivateRoomOwnerId);
    gameScene = 'house';
    activePrivateRoomOwnerId = null;
    if (owner) {
        if (owner.isParent) {
            const pIdx = state.members.filter(m => m.isParent).findIndex(m => m.id === owner.id);
            user.x = 250 + Math.max(0, pIdx) * 380;
            user.y = HOUSE_TOP + FLOOR_H + 275;
        } else {
            const kIdx = state.members.filter(m => !m.isParent).findIndex(m => m.id === owner.id);
            user.x = 230 + Math.max(0, kIdx) * 320;
            user.y = HOUSE_TOP + 275;
        }
        user.targetX = user.x;
        user.targetY = user.y;
    }
    updatePrivateRoomToolbar();
    playSound('pop');
    showToast('🚪 Đã bước ra hành lang nhà phố.');
}

function openSlotPickerModal(side) {
    const user = getCurrentUser();
    if (activePrivateRoomOwnerId !== user.id) return;
    activeSlotSide = side;
    if (!user.roomPlaced) user.roomPlaced = { left: null, right: null };
    const sideLabel = side === 'left' ? 'Góc Trái Phòng' : 'Góc Phải Phòng';
    document.getElementById('slot-picker-title').textContent = `📌 Trang Trí ${sideLabel}`;
    document.getElementById('pr-slot-instruction').textContent = `Chọn đồ nội thất hoặc cổ vật thí nghiệm để đặt vào ${sideLabel}:`;

    const myCrafted = state.labCraftedItems[user.id] || [];
    const availableItems = [
        ...user.roomDecor.map(d => ({ id: d.id, icon: d.icon, name: d.name })),
        ...myCrafted.map(c => ({ id: c.id, icon: c.icon, name: c.name }))
    ];

    const bar = document.getElementById('pr-slot-items-bar');
    let html = availableItems.map(item => `
        <button class="btn btn-sm btn-accent" onclick="placeItemInSlot('${side}', '${item.id}')">
            ${item.icon} ${item.name}
        </button>
    `).join('');
    if (user.roomPlaced[side]) {
        html += `<button class="btn btn-sm btn-danger" onclick="clearItemInSlot('${side}')">🗑️ Cất đồ ở góc này</button>`;
    }
    if (!availableItems.length && !user.roomPlaced[side]) {
        html = `<span style="font-size:12.5px; color:#7F8C8D;">Bạn chưa có đồ nội thất hay cổ vật nào. Hãy ghé Siêu Thị hoặc Phòng Thí Nghiệm nhé!</span>`;
    }
    bar.innerHTML = html;
    openModal('slot-picker-modal');
}

function placeItemInSlot(side, itemId) {
    const user = getCurrentUser();
    if (!user.roomPlaced) user.roomPlaced = { left: null, right: null };
    const myCrafted = state.labCraftedItems[user.id] || [];
    const found = user.roomDecor.find(d => d.id === itemId) || myCrafted.find(c => c.id === itemId);
    if (!found) return;
    user.roomPlaced[side] = { id: found.id, icon: found.icon, name: found.name };
    saveState();
    closeModal('slot-picker-modal');
    playSound('success');
    showToast(`✨ Đã đặt "${found.name}" vào phòng!`);
}

function clearItemInSlot(side) {
    const user = getCurrentUser();
    if (user.roomPlaced) user.roomPlaced[side] = null;
    saveState();
    closeModal('slot-picker-modal');
    playSound('pop');
    showToast('📦 Đã cất đồ trang trí về túi!');
}

function toggleHouseStreet() {
    const user = getCurrentUser();
    if (gameScene === 'house' || gameScene === 'private_room') {
        gameScene = 'street';
        activePrivateRoomOwnerId = null;
        updatePrivateRoomToolbar();
        const plotCenters = [420, 1280, 2140];
        user.x = plotCenters[state.house.plotIndex] || 1280;
        user.y = 530;
        user.targetX = user.x;
        user.targetY = user.y;
        document.getElementById('scene-toggle-btn').textContent = '🏡 Về Nhà Phố';
        document.getElementById('location-text').textContent = 'Đại Lộ Khu Phố B2KS';
        showToast('🌳 Bạn đã bước ra Đại Lộ Khu Phố B2KS!');
    } else {
        gameScene = 'house';
        activePrivateRoomOwnerId = null;
        updatePrivateRoomToolbar();
        user.x = 500;
        user.y = HOUSE_TOP + FLOOR_H * 2 + 275;
        user.targetX = user.x;
        user.targetY = user.y;
        document.getElementById('scene-toggle-btn').textContent = '🌳 Ra Khu Phố';
        document.getElementById('location-text').textContent = 'Nhà Phố Tầng 1';
        showToast('🏡 Bạn đã về đến Nhà Phố 3 Tầng!');
    }
    playSound('pop');
}

function triggerInteraction() {
    if (!nearInteractable) return;
    const spot = nearInteractable;
    if (spot.type === 'to_street' || spot.type === 'to_house') {
        toggleHouseStreet();
    } else if (spot.type === 'teleport') {
        const user = getCurrentUser();
        user.x = spot.tx;
        user.y = spot.ty;
        user.targetX = spot.tx;
        user.targetY = spot.ty;
        playSound('pop');
    } else if (spot.type === 'tv') {
        openModal('tv-modal');
    } else if (spot.type === 'tasks') {
        openModal('tasks-modal');
    } else if (spot.type === 'dining_puzzle') {
        openDiningPuzzleModal();
    } else if (spot.type === 'school') {
        openModal('school-modal');
    } else if (spot.type === 'shop') {
        openModal('shop-modal');
    } else if (spot.type === 'fashion') {
        openModal('fashion-modal');
    } else if (spot.type === 'cafe') {
        openModal('cafe-modal');
    } else if (spot.type === 'lab') {
        openModal('lab-modal');
    } else if (spot.type === 'arcade') {
        openModal('arcade-modal');
    } else if (spot.type === 'fleamarket') {
        openModal('fleamarket-modal');
    } else if (spot.type === 'zoo') {
        openModal('zoo-modal');
    } else if (spot.type === 'exchange') {
        openModal('exchange-modal');
    } else if (spot.type === 'enter_private_room') {
        enterPrivateRoom(spot.ownerId);
    } else if (spot.type === 'exit_private_room') {
        exitPrivateRoomToHallway();
    } else if (spot.type === 'open_wardrobe') {
        openWardrobeModal();
    } else if (spot.type === 'pr_slot') {
        openSlotPickerModal(spot.side);
    }
}
