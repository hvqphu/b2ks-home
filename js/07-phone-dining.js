// =========================================================================
// 10. ĐIỆN THOẠI THÔNG MINH, CHAT GIA ĐÌNH & MINI-GAME BÀN ĂN
// =========================================================================
let phoneView = 'home';
let phoneChatPartnerId = 'bo';

function toggleChat() {
    const box = document.getElementById('chat-box');
    box.style.display = (box.style.display === 'flex') ? 'none' : 'flex';
    renderFamilyChatLog();
}

function renderFamilyChatLog() {
    const log = document.getElementById('chat-log');
    if (!log) return;
    log.innerHTML = state.familyChat.slice(-25).map(m => `
        <div style="background:#F4F6F7; padding:5px 8px; border-radius:8px;">
            <b style="color:#2980B9;">${m.sender}</b> <span style="font-size:10px; color:#7F8C8D;">${m.time}</span><br>
            <span>${m.text}</span>
        </div>
    `).join('');
    log.scrollTop = log.scrollHeight;
}

function sendFamilyChat() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;
    const user = getCurrentUser();
    state.familyChat.push({
        sender: user.name,
        text,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    });
    user.speech = text;
    user.speechTimer = 220;
    input.value = '';
    saveState();
    renderFamilyChatLog();
    playSound('pop');
}

function openSmartphoneModal() {
    const user = getCurrentUser();
    const others = state.members.filter(m => m.id !== user.id);
    if (others.length && !others.some(o => o.id === phoneChatPartnerId)) {
        phoneChatPartnerId = others[0].id;
    }
    phoneView = 'home';
    renderSmartphoneScreen();
    openModal('smartphone-modal');
}

function closeSmartphoneModal() {
    closeModal('smartphone-modal');
}

function switchPhoneView(view, partnerId = null) {
    phoneView = view;
    if (partnerId) phoneChatPartnerId = partnerId;
    renderSmartphoneScreen();
}

function renderSmartphoneScreen() {
    const screen = document.getElementById('phone-screen-content');
    const user = getCurrentUser();
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const unreadTotal = (state.privateMessages || []).filter(m => m.toId === user.id && !m.read).length;

    const statusBar = `
        <div class="phone-status-bar">
            <span>📶 B2KS-5G</span>
            <span>${timeStr}</span>
            <span>🔋 98%</span>
        </div>
    `;

    if (phoneView === 'home') {
        screen.innerHTML = statusBar + `
            <div class="phone-home-body">
                <div class="phone-widget-card">
                    <div style="font-size:12px; opacity:0.85;">Xin chào, ${user.name}!</div>
                    <div style="font-size:20px; font-weight:700; color:#FFE66D;">${user.isParent ? '∞ ⭐ Ngân sách' : user.points + ' ⭐'}</div>
                    <div style="font-size:11.5px; margin-top:4px;">📩 Tin nhắn riêng chưa đọc: <b>${unreadTotal}</b></div>
                </div>
                <div class="phone-app-grid">
                    <button class="phone-app-icon-btn" onclick="switchPhoneView('messages')">
                        <div class="phone-app-tile" style="background:#2ECC71;">
                            💬
                            ${unreadTotal > 0 ? `<span class="phone-tile-badge">${unreadTotal}</span>` : ''}
                        </div>
                        <span>Tin Nhắn</span>
                    </button>
                    <button class="phone-app-icon-btn" onclick="closeSmartphoneModal(); openModal('tasks-modal');">
                        <div class="phone-app-tile" style="background:#3498DB;">📋</div>
                        <span>Nhiệm Vụ</span>
                    </button>
                    <button class="phone-app-icon-btn" onclick="closeSmartphoneModal(); openModal('exchange-modal');">
                        <div class="phone-app-tile" style="background:#8E44AD;">🌌</div>
                        <span>Đổi Quà</span>
                    </button>
                    <button class="phone-app-icon-btn" onclick="closeSmartphoneModal(); openModal('zoo-modal');">
                        <div class="phone-app-tile" style="background:#27AE60;">🦁</div>
                        <span>Sở Thú</span>
                    </button>
                    <button class="phone-app-icon-btn" onclick="closeSmartphoneModal(); openModal('fleamarket-modal');">
                        <div class="phone-app-tile" style="background:#E67E22;">🎪</div>
                        <span>Chợ Trời</span>
                    </button>
                    <button class="phone-app-icon-btn" onclick="closeSmartphoneModal(); openModal('donate-modal');">
                        <div class="phone-app-tile" style="background:#FF6B81;">💝</div>
                        <span>Tặng Sao</span>
                    </button>
                </div>
            </div>
        `;
    } else if (phoneView === 'messages') {
        const others = state.members.filter(m => m.id !== user.id);
        (state.privateMessages || []).forEach(m => {
            if (m.fromId === phoneChatPartnerId && m.toId === user.id) m.read = true;
        });
        saveState();
        updateHUD();

        const thread = (state.privateMessages || []).filter(m =>
            (m.fromId === user.id && m.toId === phoneChatPartnerId) ||
            (m.fromId === phoneChatPartnerId && m.toId === user.id)
        );

        screen.innerHTML = statusBar + `
            <div class="phone-app-header">
                <button class="btn btn-sm" style="padding:3px 7px;" onclick="switchPhoneView('home')">◀</button>
                <b style="font-size:13.5px; color:#2C3E50;">💬 Nhắn Tin Riêng</b>
                <span style="width:24px;"></span>
            </div>
            <div class="phone-recipient-bar">
                ${others.map(o => {
                    const uCnt = (state.privateMessages || []).filter(m => m.fromId === o.id && m.toId === user.id && !m.read).length;
                    return `<button class="phone-recipient-pill ${o.id === phoneChatPartnerId ? 'active' : ''}" onclick="switchPhoneView('messages', '${o.id}')">
                        ${o.name} ${uCnt > 0 ? `(${uCnt})` : ''}
                    </button>`;
                }).join('')}
            </div>
            <div id="phone-msg-scroll" class="phone-msg-list">
                ${thread.length ? thread.map(m => {
                    const isMine = (m.fromId === user.id);
                    return `
                        <div class="phone-msg-bubble ${isMine ? 'mine' : 'theirs'}">
                            <div>${m.text}</div>
                            <div class="phone-msg-meta">
                                <span>${m.time}</span>
                                ${isMine ? `<span>${m.read ? '✓✓ Đã xem' : '✓ Đã gửi'}</span>` : ''}
                            </div>
                        </div>
                    `;
                }).join('') : `<div style="text-align:center; color:#7F8C8D; font-size:12px; margin-top:20px;">Hãy gửi lời nhắn riêng đầu tiên nhé!</div>`}
            </div>
            <div class="phone-input-bar">
                <input type="text" id="phone-dm-input" placeholder="Nhập tin nhắn riêng..." onkeydown="if(event.key==='Enter') sendPrivateMessage()">
                <button class="btn btn-sm btn-primary" onclick="sendPrivateMessage()">Gửi</button>
            </div>
        `;
        const sc = document.getElementById('phone-msg-scroll');
        if (sc) sc.scrollTop = sc.scrollHeight;
    }
}

function sendPrivateMessage() {
    const input = document.getElementById('phone-dm-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    const user = getCurrentUser();
    state.privateMessages.push({
        id: 'pm_' + Date.now(),
        fromId: user.id,
        toId: phoneChatPartnerId,
        text,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        read: false
    });
    saveState();
    playSound('pop');
    renderSmartphoneScreen();
}

// --- MINI-GAME GHÉP MÓN ĂN TRÊN BÀN ĂN ---
const DINING_DISHES = [
    { icon: '🍚', name: 'Cơm Trắng Dẻo Thơm' },
    { icon: '🍗', name: 'Gà Rán Mật Ong' },
    { icon: '🥦', name: 'Bông Cải Xanh Xào Tỏi' },
    { icon: '🍲', name: 'Canh Chua Cá Lóc' },
    { icon: '🍉', name: 'Dưa Hấu Tráng Miệng' }
];
let diningPlaced = [];

function openDiningPuzzleModal() {
    diningPlaced = [];
    renderDiningPuzzle();
    openModal('dining-puzzle-modal');
}

function renderDiningPuzzle() {
    const user = getCurrentUser();
    const daily = ensureUserDaily(user.id);
    const today = new Date().toISOString().slice(0, 10);
    const rewardedToday = (daily.diningDate === today);

    const body = document.getElementById('dining-puzzle-body');
    body.innerHTML = `
        <div style="background:#FEF9E7; padding:10px; border-radius:10px; font-size:13px;">
            🍽️ Hãy bày đủ <b>5 món ăn dinh dưỡng</b> lên mâm cơm gia đình B2KS!
            ${rewardedToday ? '<br><span style="color:#7F8C8D;">(Bạn đã nhận thưởng bữa cơm hôm nay rồi)</span>' : '<br><b style="color:#1E8449;">Phần thưởng: +15 ⭐</b>'}
        </div>
        <div style="background:#F8C471; border:3px solid #A04000; border-radius:50%; width:230px; height:230px; margin:6px auto; display:flex; flex-wrap:wrap; align-items:center; justify-content:center; gap:10px; padding:24px;">
            ${diningPlaced.length ? diningPlaced.map(d => `<span style="font-size:36px;">${d.icon}</span>`).join('') : '<span style="color:#78281F; font-weight:700; text-align:center;">Mâm cơm đang trống<br>Bấm món bên dưới!</span>'}
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap; justify-content:center;">
            ${DINING_DISHES.map((d, idx) => {
                const used = diningPlaced.some(p => p.name === d.name);
                return `<button class="btn btn-sm ${used ? '' : 'btn-accent'}" ${used ? 'disabled style="opacity:0.45;"' : ''} onclick="pickDiningDish(${idx})">${d.icon} ${d.name}</button>`;
            }).join('')}
        </div>
    `;
}

function pickDiningDish(idx) {
    const dish = DINING_DISHES[idx];
    if (!dish || diningPlaced.some(p => p.name === dish.name)) return;
    diningPlaced.push(dish);
    playSound('pop');
    if (diningPlaced.length >= DINING_DISHES.length) {
        const user = getCurrentUser();
        const daily = ensureUserDaily(user.id);
        const today = new Date().toISOString().slice(0, 10);
        playSound('success');
        triggerFireworks();
        if (daily.diningDate !== today) {
            daily.diningDate = today;
            if (!user.isParent) user.points += 15;
            addActivityLog(user.id, `Bày mâm cơm gia đình (+15⭐)`);
            saveState();
            updateHUD();
            showToast('🍽️ Mâm cơm gia đình đã sẵn sàng! Chúc cả nhà ngon miệng (+15 ⭐)!');
        } else {
            showToast('🍽️ Mâm cơm gia đình đã sẵn sàng! Chúc cả nhà ngon miệng!');
        }
        closeModal('dining-puzzle-modal');
    } else {
        renderDiningPuzzle();
    }
}
