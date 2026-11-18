// =========================================================================
// 5. SMART TV YOUTUBE + CỬA HÀNG THỜI TRANG & QUÁN CÀ PHÊ
// =========================================================================
let tvInterval = null;
let currentTvVideoId = 'XqZsoesa55w';
const MAX_DAILY_TV_SEC = 30 * 60;

const FASHION_SETS_CATALOG = [
    { id: 'f_iron', icon: '🦾', name: 'Giáp Chiến Binh Công Nghệ', price: 65, shirt: '#C0392B', shirtStyle: 'armor', pants: '#922B21', pantsStyle: 'armor_pants', outfit: 'visor', desc: 'Bộ giáp đỏ vàng công nghệ cao phát sáng!' },
    { id: 'f_princess', icon: '👸', name: 'Váy Công Chúa Dạ Hội', price: 60, shirt: '#FF85A1', shirtStyle: 'princess_top', pants: '#F78FB3', pantsStyle: 'ballgown', outfit: 'crown', desc: 'Đầm dạ hội lộng lẫy kèm vương miện lấp lánh.' },
    { id: 'f_astro', icon: '🧑‍🚀', name: 'Bộ Đồ Phi Hành Gia Vũ Trụ', price: 70, shirt: '#ECF0F1', shirtStyle: 'space_suit', pants: '#BDC3C7', pantsStyle: 'space_pants', outfit: 'helmet', desc: 'Sẵn sàng khám phá dải ngân hà B2KS!' },
    { id: 'f_dino', icon: '🦖', name: 'Trang Phục Khủng Long Xanh', price: 55, shirt: '#27AE60', shirtStyle: 'hoodie', pants: '#1E8449', pantsStyle: 'joggers', outfit: 'dino_hood', desc: 'Áo liền quần khủng long siêu đáng yêu.' },
    { id: 'f_detective', icon: '🕵️', name: 'Áo Khoác Thám Tử Tài Ba', price: 50, shirt: '#8E6E53', shirtStyle: 'trench', pants: '#5D4037', pantsStyle: 'jeans', outfit: 'detective_hat', desc: 'Phong cách thám tử phá án thông minh.' },
    { id: 'f_sport', icon: '⚽', name: 'Đồng Phục Cầu Thủ Siêu Sao', price: 45, shirt: '#2980B9', shirtStyle: 'jersey', pants: '#1B4F72', pantsStyle: 'shorts', outfit: 'headband', desc: 'Trang phục thể thao năng động số 10.' }
];

const SHIRT_STYLES_CATALOG = [
    { code: 'tshirt', name: 'Áo Thun Cổ Tròn', color: '#3498DB' },
    { code: 'polo', name: 'Áo Polo Cổ Bẻ', color: '#2C3E50' },
    { code: 'hoodie', name: 'Áo Hoodie Năng Động', color: '#E67E22' },
    { code: 'blouse', name: 'Áo Kiểu Nữ Tính', color: '#E84393' },
    { code: 'jersey', name: 'Áo Thể Thao Số 10', color: '#16A085' }
];

const PANTS_STYLES_CATALOG = [
    { code: 'jeans', name: 'Quần Jean Dài', color: '#2471A3' },
    { code: 'shorts', name: 'Quần Short Thể Thao', color: '#34495E' },
    { code: 'skirt', name: 'Chân Váy Xòe', color: '#EC407A' },
    { code: 'joggers', name: 'Quần Jogger Cá Tính', color: '#2E4053' }
];

const CAFE_DRINKS_CATALOG = [
    { id: 'c_milk_tea', icon: '🧋', name: 'Trà Sữa Trân Châu Đường Đen', price: 12, color: '#D7A86E', desc: 'Ngọt ngào trân châu dai giòn!' },
    { id: 'c_matcha', icon: '🍵', name: 'Matcha Latte Kem Tươi', price: 15, color: '#58D68D', desc: 'Hương trà xanh thanh mát.' },
    { id: 'c_choco', icon: '🍫', name: 'Sô-cô-la Nóng Marshmallow', price: 14, color: '#6E2C00', desc: 'Ấm áp ngọt ngào cho cả nhà.' },
    { id: 'c_smoothie', icon: '🍓', name: 'Sinh Tố Dâu Tây Tươi', price: 12, color: '#FF7675', desc: 'Giàu vitamin C tươi mát.' },
    { id: 'c_espresso', icon: '☕', name: 'Cà Phê Sữa Đá Sài Gòn', price: 10, color: '#4E342E', desc: 'Thức uống yêu thích của Bố & Mẹ.' },
    { id: 'c_juice', icon: '🍊', name: 'Nước Ép Cam Mật Ong', price: 10, color: '#F39C12', desc: 'Tăng cường sức đề kháng!' }
];

function openTvModal() {
    checkDailyReset();
    updateTvUI();
    const isLocalFile = (window.location.protocol === 'file:');
    const hintEl = document.getElementById('tv-local-hint');
    if (hintEl) hintEl.style.display = isLocalFile ? 'block' : 'none';
    const user = getCurrentUser();
    const daily = ensureUserDaily(user.id);
    const totalAllowed = MAX_DAILY_TV_SEC + daily.tvBonusSeconds;
    if (user.isParent || daily.tvSecondsUsed < totalAllowed) {
        switchTvChannel(currentTvVideoId);
    } else {
        document.getElementById('youtube-iframe').src = '';
    }
    clearInterval(tvInterval);
    tvInterval = setInterval(() => {
        const u = getCurrentUser();
        if (u.isParent) return;
        const d = ensureUserDaily(u.id);
        const limit = MAX_DAILY_TV_SEC + d.tvBonusSeconds;
        if (d.tvSecondsUsed < limit) {
            d.tvSecondsUsed++;
            if (d.tvSecondsUsed % 10 === 0) saveState();
            updateTvUI();
        } else {
            document.getElementById('youtube-iframe').src = '';
            updateTvUI();
            clearInterval(tvInterval);
            showToast('⏰ Đã hết thời gian xem Smart TV hôm nay! Hãy dùng thẻ +30 phút nếu có nhé.');
        }
    }, 1000);
}

function closeTvModal() {
    clearInterval(tvInterval);
    document.getElementById('youtube-iframe').src = '';
    saveState();
    closeModal('tv-modal');
}

function switchTvChannel(videoId) {
    currentTvVideoId = videoId;
    const extLink = document.getElementById('tv-external-yt-link');
    if (extLink) extLink.href = `https://www.youtube.com/watch?v=${videoId}`;
    const user = getCurrentUser();
    const daily = ensureUserDaily(user.id);
    const limit = MAX_DAILY_TV_SEC + daily.tvBonusSeconds;
    if (!user.isParent && daily.tvSecondsUsed >= limit) {
        return showToast('🔒 Bạn đã hết thời gian xem TV hôm nay!');
    }
    const iframe = document.getElementById('youtube-iframe');
    const originParam = (window.location.origin && window.location.origin.startsWith('http'))
        ? `&origin=${encodeURIComponent(window.location.origin)}`
        : '';
    iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0${originParam}`;
}

function updateTvUI() {
    const user = getCurrentUser();
    const daily = ensureUserDaily(user.id);
    const limit = MAX_DAILY_TV_SEC + daily.tvBonusSeconds;
    const rem = Math.max(0, limit - daily.tvSecondsUsed);
    const mm = String(Math.floor(rem / 60)).padStart(2, '0');
    const ss = String(rem % 60).padStart(2, '0');

    document.getElementById('tv-time-remaining').textContent = user.isParent
        ? '👑 Chế độ Phụ huynh: Không giới hạn thời gian xem'
        : `⏳ Thời gian xem còn lại hôm nay: ${mm}:${ss}`;

    const tvVoucher = state.vouchers.find(v => v.ownerId === user.id && !v.used && v.name.includes('TV'));
    document.getElementById('tv-card-action').innerHTML = tvVoucher
        ? `<button class="btn btn-sm btn-primary" onclick="useVoucher('${tvVoucher.id}'); openTvModal();">🎟️ Kích hoạt Thẻ +30 Phút</button>`
        : `<span style="font-size:12px; color:#666;">(Có thể mua thêm thẻ +30p ở Siêu Thị)</span>`;
}

function renderFashionModal() {
    const user = getCurrentUser();
    if (!Array.isArray(user.ownedFashionSets)) user.ownedFashionSets = [];
    document.getElementById('fashion-user-points').textContent = user.isParent ? '∞ ⭐' : `${user.points} ⭐`;
    const grid = document.getElementById('fashion-items-grid');
    grid.innerHTML = FASHION_SETS_CATALOG.map(item => {
        const owned = user.ownedFashionSets.includes(item.id);
        return `
            <div class="card-item" style="border-color:${owned ? '#27AE60' : '#2C3E50'};">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:32px;">${item.icon}</span>
                    <span class="points-pill">${owned ? '✔️ Đã sở hữu' : item.price + ' ⭐'}</span>
                </div>
                <div style="font-weight:700; font-size:14.5px;">${item.name}</div>
                <div style="font-size:12px; color:#555;">${item.desc}</div>
                ${owned
                    ? `<span class="tag" style="background:#D5F5E3; color:#1E8449; text-align:center;">🧥 Đã có trong Tủ đồ phòng riêng</span>`
                    : `<button class="btn btn-sm btn-pink" onclick="buyFashionSet('${item.id}')">🛍️ Mua bộ trang phục</button>`
                }
            </div>
        `;
    }).join('');
}

function buyFashionSet(setId) {
    const user = getCurrentUser();
    if (!Array.isArray(user.ownedFashionSets)) user.ownedFashionSets = [];
    const item = FASHION_SETS_CATALOG.find(f => f.id === setId);
    if (!item || user.ownedFashionSets.includes(setId)) return;
    if (!user.isParent && user.points < item.price) {
        playSound('error');
        return showToast('❌ Bạn chưa đủ điểm sao để mua bộ trang phục này!');
    }
    if (!user.isParent) user.points -= item.price;
    user.ownedFashionSets.push(setId);
    addActivityLog(user.id, `Mua trang phục: "${item.name}" (-${item.price}⭐)`);
    saveState();
    updateHUD();
    renderFashionModal();
    playSound('success');
    triggerFireworks();
    showToast(`👗 Đã mua "${item.name}"! Hãy về Tủ quần áo trong phòng riêng để mặc nhé.`);
}

function renderCafeModal() {
    const user = getCurrentUser();
    const grid = document.getElementById('cafe-menu-grid');
    grid.innerHTML = CAFE_DRINKS_CATALOG.map(d => `
        <div class="card-item">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:30px;">${d.icon}</span>
                <span class="points-pill">${d.price} ⭐</span>
            </div>
            <div style="font-weight:700; font-size:14px;">${d.name}</div>
            <div style="font-size:11.5px; color:#555;">${d.desc}</div>
            <button class="btn btn-sm btn-accent" onclick="orderCafeDrink('${d.id}')">🥤 Gọi món thưởng thức</button>
        </div>
    `).join('');
}

function orderCafeDrink(drinkId) {
    const user = getCurrentUser();
    const d = CAFE_DRINKS_CATALOG.find(x => x.id === drinkId);
    if (!d) return;
    if (!user.isParent && user.points < d.price) {
        playSound('error');
        return showToast('❌ Bạn chưa đủ sao để gọi đồ uống này!');
    }
    if (!user.isParent) user.points -= d.price;
    user.holdingDrink = d.icon;
    user.speech = `Mlem mlem! ${d.name} ngon tuyệt! ${d.icon}`;
    user.speechTimer = 260;
    saveState();
    updateHUD();
    closeModal('cafe-modal');
    playSound('coin');
    showToast(`☕ Bạn đang cầm trên tay ly ${d.name}!`);
}

// =========================================================================
// 6. TỦ QUẦN ÁO (CHỈ MỞ TRONG PHÒNG RIÊNG), PHÒNG RIÊNG & KIẾN TRÚC NHÀ
// =========================================================================
let selectedPreviewShirt = 'tshirt';
let selectedPreviewShirtColor = '#3498DB';
let selectedPreviewPants = 'jeans';
let selectedPreviewPantsColor = '#2471A3';
let selectedPreviewOutfit = 'normal';
let selectedPreviewFashionSet = '';

function openWardrobeModal() {
    const user = getCurrentUser();
    if (gameScene !== 'private_room' || activePrivateRoomOwnerId !== user.id) {
        playSound('error');
        return showToast('🚪 Bạn phải bước vào phòng riêng của mình và đứng cạnh Tủ quần áo mới thay đồ được!');
    }
    openModal('custom-modal');
    switchCustomTab('char');
}

function closeWardrobeAndExit() {
    closeModal('custom-modal');
    if (gameScene === 'private_room') {
        exitPrivateRoomToHallway();
    }
}

function switchCustomTab(tab) {
    document.getElementById('custom-tab-char').style.display = (tab === 'char') ? 'block' : 'none';
    document.getElementById('custom-tab-room').style.display = (tab === 'room') ? 'block' : 'none';
    document.getElementById('custom-tab-house').style.display = (tab === 'house') ? 'block' : 'none';
    if (tab === 'char') renderWardrobeState();
}

function renderWardrobeState() {
    const user = getCurrentUser();
    const isInOwnRoom = (gameScene === 'private_room' && activePrivateRoomOwnerId === user.id);
    const lockedBanner = document.getElementById('wardrobe-locked-banner');
    const controlsWrapper = document.getElementById('wardrobe-controls-wrapper');
    if (lockedBanner && controlsWrapper) {
        lockedBanner.style.display = isInOwnRoom ? 'none' : 'block';
        controlsWrapper.style.display = isInOwnRoom ? 'block' : 'none';
    }
    if (!isInOwnRoom) return;

    selectedPreviewShirt = user.shirtStyle || 'tshirt';
    selectedPreviewShirtColor = user.shirt || '#3498DB';
    selectedPreviewPants = user.pantsStyle || 'jeans';
    selectedPreviewPantsColor = user.pants || '#2471A3';
    selectedPreviewOutfit = user.outfit || 'normal';
    selectedPreviewFashionSet = user.fashionSet || '';

    document.getElementById('custom-char-name').value = user.name;
    renderVisualClothingPickers();
    drawCharPreview();
}

function renderVisualClothingPickers() {
    const user = getCurrentUser();
    if (!Array.isArray(user.ownedFashionSets)) user.ownedFashionSets = [];

    const fGrid = document.getElementById('visual-fashion-set-grid');
    if (fGrid) {
        const ownedSets = FASHION_SETS_CATALOG.filter(f => user.ownedFashionSets.includes(f.id));
        if (ownedSets.length === 0) {
            fGrid.innerHTML = `<div style="grid-column:1/-1; font-size:12px; color:#7F8C8D; padding:6px;">Bạn chưa mua bộ trang phục đặc biệt nào. Hãy ghé Cửa Hàng Thời Trang ngoài khu phố nhé!</div>`;
        } else {
            fGrid.innerHTML = ownedSets.map(f => `
                <div class="visual-option-card ${selectedPreviewFashionSet === f.id ? 'selected' : ''}" onclick="selectPreviewFashionSet('${f.id}')">
                    <span style="font-size:24px;">${f.icon}</span>
                    <span>${f.name}</span>
                </div>
            `).join('');
        }
    }

    const sGrid = document.getElementById('visual-shirt-grid');
    if (sGrid) {
        sGrid.innerHTML = SHIRT_STYLES_CATALOG.map(s => `
            <div class="visual-option-card ${!selectedPreviewFashionSet && selectedPreviewShirt === s.code ? 'selected' : ''}" onclick="selectPreviewShirt('${s.code}', '${s.color}')">
                <div style="width:28px; height:22px; border-radius:6px; background:${s.color}; border:2px solid #2C3E50;"></div>
                <span>${s.name}</span>
            </div>
        `).join('');
    }

    const pGrid = document.getElementById('visual-pants-grid');
    if (pGrid) {
        pGrid.innerHTML = PANTS_STYLES_CATALOG.map(p => `
            <div class="visual-option-card ${!selectedPreviewFashionSet && selectedPreviewPants === p.code ? 'selected' : ''}" onclick="selectPreviewPants('${p.code}', '${p.color}')">
                <div style="width:24px; height:24px; border-radius:4px; background:${p.color}; border:2px solid #2C3E50;"></div>
                <span>${p.name}</span>
            </div>
        `).join('');
    }

    const oGrid = document.getElementById('visual-outfit-grid');
    if (oGrid) {
        const outfitLabels = { normal: '👕 Mặc định', suit: '🤵 Vest Lịch Lãm', dress: '👗 Váy Dạ Hội', chef: '👨‍🍳 Đầu Bếp', hero: '🦸 Áo Choàng Siêu Nhân', crown: '👑 Vương Miện Vàng' };
        oGrid.innerHTML = user.unlockedOutfits.map(o => `
            <button type="button" class="btn btn-sm ${selectedPreviewOutfit === o ? 'btn-accent' : ''}" onclick="selectPreviewOutfit('${o}')">
                ${outfitLabels[o] || o}
            </button>
        `).join('');
    }
}

function selectPreviewFashionSet(setId) {
    const f = FASHION_SETS_CATALOG.find(x => x.id === setId);
    if (!f) return;
    selectedPreviewFashionSet = setId;
    selectedPreviewShirt = f.shirtStyle;
    selectedPreviewShirtColor = f.shirt;
    selectedPreviewPants = f.pantsStyle;
    selectedPreviewPantsColor = f.pants;
    selectedPreviewOutfit = f.outfit;
    renderVisualClothingPickers();
    drawCharPreview();
}

function selectPreviewShirt(code, color) {
    selectedPreviewFashionSet = '';
    selectedPreviewShirt = code;
    selectedPreviewShirtColor = color;
    renderVisualClothingPickers();
    drawCharPreview();
}

function selectPreviewPants(code, color) {
    selectedPreviewFashionSet = '';
    selectedPreviewPants = code;
    selectedPreviewPantsColor = color;
    renderVisualClothingPickers();
    drawCharPreview();
}

function selectPreviewOutfit(code) {
    selectedPreviewOutfit = code;
    renderVisualClothingPickers();
    drawCharPreview();
}

function drawCharPreview() {
    const c = document.getElementById('char-preview-canvas');
    if (!c) return;
    const pctx = c.getContext('2d');
    pctx.clearRect(0, 0, c.width, c.height);
    const user = getCurrentUser();
    const dummy = {
        ...user,
        name: document.getElementById('custom-char-name')?.value || user.name,
        shirt: selectedPreviewShirtColor,
        shirtStyle: selectedPreviewShirt,
        pants: selectedPreviewPantsColor,
        pantsStyle: selectedPreviewPants,
        outfit: selectedPreviewOutfit,
        fashionSet: selectedPreviewFashionSet,
        x: 55,
        y: 108,
        dir: 1,
        walkFrame: 0,
        speech: '',
        speechTimer: 0
    };
    drawCharacterOnContext(pctx, dummy);
}

function renderCustomModal() {
    const user = getCurrentUser();
    renderWardrobeState();

    document.getElementById('room-privacy-toggle').checked = !!user.roomUnlocked;
    document.getElementById('room-wall-color').value = user.roomWall || '#D6EAF8';

    const myCrafted = state.labCraftedItems[user.id] || [];
    const allDecorItems = [
        ...user.roomDecor.map(d => ({ ...d, source: 'decor' })),
        ...myCrafted.map(c => ({ id: c.id, icon: c.icon, name: `${c.name} (Cổ vật)`, source: 'lab' }))
    ];

    const decorDiv = document.getElementById('room-decor-inventory');
    decorDiv.innerHTML = allDecorItems.length ? allDecorItems.map(d => `
        <div class="card-item" style="flex-direction:row; align-items:center;">
            <span style="font-size:24px;">${d.icon}</span>
            <span style="font-weight:600; font-size:13px;">${d.name}</span>
        </div>
    `).join('') : `<p style="color:#7F8C8D; font-size:12.5px;">Chưa có đồ trang trí. Hãy mua tại Siêu Thị hoặc chế tạo tại Phòng Thí Nghiệm!</p>`;

    document.getElementById('house-builder-locked').style.display = user.isParent ? 'none' : 'block';
    document.getElementById('house-builder-controls').style.display = user.isParent ? 'block' : 'none';
    document.getElementById('house-plot-select').value = state.house.plotIndex;
    document.getElementById('house-style-select').value = state.house.style;
}

function saveCharCustom() {
    const user = getCurrentUser();
    const newName = document.getElementById('custom-char-name').value.trim();
    if (newName) user.name = newName;
    user.shirt = selectedPreviewShirtColor;
    user.shirtStyle = selectedPreviewShirt;
    user.pants = selectedPreviewPantsColor;
    user.pantsStyle = selectedPreviewPants;
    user.outfit = selectedPreviewOutfit;
    user.fashionSet = selectedPreviewFashionSet;
    saveState();
    updateHUD();
    playSound('success');
    showToast('✅ Đã mặc trang phục mới!');
}

function addNewFamilyMember() {
    const name = document.getElementById('new-member-name').value.trim();
    const role = document.getElementById('new-member-role').value;
    if (!name) return showToast('⚠️ Nhập tên thành viên mới!');
    const isParent = (role === 'Bố' || role === 'Mẹ');
    const newId = 'm_' + Date.now();
    state.members.push({
        id: newId, name, role, isParent,
        points: isParent ? 9999 : 100,
        shirt: '#1ABC9C', shirtStyle: 'tshirt', pants: '#34495E', pantsStyle: 'jeans', hair: '#2C3E50', skin: '#F5CBA7',
        outfit: 'normal', fashionSet: '', unlockedOutfits: ['normal'], ownedFashionSets: [],
        roomWall: '#E8DAEF', roomUnlocked: true,
        roomDecor: [{ id: 'd_' + Date.now(), icon: '🪴', name: 'Chậu cây chào mừng' }],
        roomPlaced: { left: null, right: null },
        x: 500, y: 1250, targetX: 500, targetY: 1250, dir: 1, walkFrame: 0, speech: '', speechTimer: 0, holdingDrink: ''
    });
    document.getElementById('new-member-name').value = '';
    saveState();
    updateHUD();
    playSound('success');
    showToast(`🎉 Đã chào đón thành viên mới: ${name}!`);
}

function toggleRoomPrivacy() {
    const user = getCurrentUser();
    user.roomUnlocked = document.getElementById('room-privacy-toggle').checked;
    saveState();
    updatePrivateRoomToolbar();
    playSound('pop');
    showToast(user.roomUnlocked ? '🔓 Đã mở khóa cửa phòng riêng!' : '🔒 Đã khóa cửa phòng riêng!');
}

function changeRoomWall() {
    const user = getCurrentUser();
    user.roomWall = document.getElementById('room-wall-color').value;
    saveState();
    updatePrivateRoomToolbar();
    showToast('🎨 Đã đổi màu sơn tường phòng riêng!');
}

function updateHouseDesign() {
    const user = getCurrentUser();
    if (!user.isParent) return;
    state.house.plotIndex = parseInt(document.getElementById('house-plot-select').value);
    state.house.style = document.getElementById('house-style-select').value;
    saveState();
    closeModal('custom-modal');
    playSound('success');
    showToast('🏗️ Đã cập nhật vị trí & kiến trúc Nhà Phố 3 Tầng!');
}

function exportFamilySave() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `B2KS_Family_Save_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('💾 Đã tải xuống file sao lưu dữ liệu!');
}

function importFamilySave(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const imported = JSON.parse(reader.result);
            if (imported.members && imported.tasks) {
                state = { ...getDefaultState(), ...imported };
                saveState();
                updateHUD();
                closeModal('custom-modal');
                showToast('📂 Đã khôi phục dữ liệu gia đình thành công!');
            }
        } catch (err) {
            showToast('❌ File sao lưu không hợp lệ!');
        }
    };
    reader.readAsText(file);
}
