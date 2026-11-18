// =========================================================================
// 9. KHU VUI CHƠI MINI-GAME & ĐỒNG BỘ FIREBASE REALTIME (4 THIẾT BỊ)
// =========================================================================
let arcadeGameState = null;

function renderArcadeModal() {
    checkDailyReset();
    const user = getCurrentUser();
    const daily = ensureUserDaily(user.id);
    const today = new Date().toISOString().slice(0, 10);
    const alreadyPlayedToday = (daily.arcadeDate === today);

    const body = document.getElementById('arcade-body');
    body.innerHTML = `
        <div style="background:#FEF9E7; border:2px solid #F39C12; border-radius:12px; padding:10px; font-size:13px;">
            🕹️ Chào <b>${user.name}</b>! ${alreadyPlayedToday
                ? 'Bạn đã nhận thưởng Mini-game hôm nay rồi, nhưng vẫn có thể chơi giải trí thoải mái!'
                : 'Hoàn thành thử thách phản xạ để nhận ngay <b>+25 ⭐</b> đầu tiên trong ngày!'}
        </div>
        <div class="grid-2">
            <div class="card-item">
                <div style="font-size:32px;">🎯</div>
                <div style="font-weight:700;">Bắt Sao Băng May Mắn</div>
                <div style="font-size:12px; color:#555;">Bấm trúng 8 ngôi sao vàng trong 15 giây!</div>
                <button class="btn btn-sm btn-primary" onclick="startStarCatcherGame()">▶️ Chơi ngay</button>
            </div>
            <div class="card-item">
                <div style="font-size:32px;">🧠</div>
                <div style="font-weight:700;">Siêu Trí Tuệ Toán Nhanh</div>
                <div style="font-size:12px; color:#555;">Giải đúng 5 phép tính vui trong 20 giây!</div>
                <button class="btn btn-sm btn-purple" onclick="startQuickMathGame()">▶️ Chơi ngay</button>
            </div>
        </div>
        <div id="arcade-play-area" style="margin-top:8px;"></div>
    `;
}

function rewardArcadeWin(gameName) {
    const user = getCurrentUser();
    const daily = ensureUserDaily(user.id);
    const today = new Date().toISOString().slice(0, 10);
    playSound('success');
    triggerFireworks();
    if (daily.arcadeDate !== today) {
        daily.arcadeDate = today;
        if (!user.isParent) user.points += 25;
        addActivityLog(user.id, `Thắng Mini-game "${gameName}" (+25⭐)`);
        saveState();
        updateHUD();
        showToast(`🏆 Xuất sắc! Bạn thắng ${gameName} và nhận +25 ⭐!`);
    } else {
        showToast(`🏆 Tuyệt vời! Bạn đã phá đảo ${gameName}!`);
    }
}

function startStarCatcherGame() {
    const area = document.getElementById('arcade-play-area');
    let score = 0;
    let timeLeft = 15;
    area.innerHTML = `
        <div style="background:#1B2631; color:#FFF; border-radius:14px; padding:12px; text-align:center;">
            <div style="display:flex; justify-content:space-between; font-weight:700; margin-bottom:8px;">
                <span>⭐ Điểm: <b id="sc-score">0</b>/8</span>
                <span>⏳ Thời gian: <b id="sc-time">15</b>s</span>
            </div>
            <div id="sc-box" style="position:relative; height:210px; background:#2C3E50; border-radius:10px; overflow:hidden;">
                <button id="sc-star-btn" style="position:absolute; left:45%; top:40%; font-size:30px; background:none; border:none; cursor:pointer;">⭐</button>
            </div>
        </div>
    `;
    const starBtn = document.getElementById('sc-star-btn');
    const moveStar = () => {
        starBtn.style.left = (10 + Math.random() * 78) + '%';
        starBtn.style.top = (10 + Math.random() * 72) + '%';
    };
    starBtn.onclick = () => {
        score++;
        playSound('coin');
        document.getElementById('sc-score').textContent = score;
        if (score >= 8) {
            clearInterval(timer);
            area.innerHTML = `<div style="text-align:center; padding:16px; font-weight:700; color:#1E8449;">🎉 Bạn đã bắt đủ 8 ngôi sao may mắn!</div>`;
            rewardArcadeWin('Bắt Sao Băng');
        } else {
            moveStar();
        }
    };
    const timer = setInterval(() => {
        timeLeft--;
        const tEl = document.getElementById('sc-time');
        if (!tEl) return clearInterval(timer);
        tEl.textContent = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timer);
            area.innerHTML = `<div style="text-align:center; padding:16px; color:#C0392B; font-weight:700;">⏰ Hết giờ rồi! Bạn bắt được ${score}/8 ngôi sao. Thử lại nhé!</div>`;
        }
    }, 1000);
}

function startQuickMathGame() {
    const area = document.getElementById('arcade-play-area');
    let solved = 0;
    const nextQ = () => {
        const a = Math.floor(Math.random() * 15) + 5;
        const b = Math.floor(Math.random() * 15) + 3;
        const ans = a + b;
        const choices = [ans, ans + 2, ans - 1, ans + 5].sort(() => Math.random() - 0.5);
        area.innerHTML = `
            <div style="background:#EBF5FB; border:2px solid #2980B9; border-radius:14px; padding:14px; text-align:center;">
                <div style="font-weight:700; color:#1B4F72; margin-bottom:6px;">Câu ${solved + 1}/5: Tính nhanh nhé!</div>
                <div style="font-size:26px; font-weight:700; margin:10px 0;">${a} + ${b} = ?</div>
                <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
                    ${choices.map(c => `<button class="btn btn-primary" onclick="checkQuickMath(${c}, ${ans})">${c}</button>`).join('')}
                </div>
            </div>
        `;
    };
    window.checkQuickMath = (picked, correct) => {
        if (picked === correct) {
            solved++;
            playSound('coin');
            if (solved >= 5) {
                area.innerHTML = `<div style="text-align:center; padding:16px; font-weight:700; color:#1E8449;">🏆 Xuất sắc! Bạn đã giải đúng cả 5 phép tính!</div>`;
                rewardArcadeWin('Siêu Trí Tuệ Toán Nhanh');
            } else {
                nextQ();
            }
        } else {
            playSound('error');
            showToast('❌ Chưa đúng rồi, tính lại nhé!');
        }
    };
    nextQ();
}

// --- ĐỒNG BỘ FIREBASE REALTIME DATABASE ---
let lastCloudSyncHash = '';
let firebasePollInterval = null;
let positionPushTimer = null;

function renderSyncModal() {
    const lockSel = document.getElementById('device-lock-member');
    lockSel.innerHTML = `<option value="">-- Tự do chuyển đổi trên máy này --</option>` +
        state.members.map(m => `<option value="${m.id}" ${lockedDeviceMemberId === m.id ? 'selected' : ''}>📱 Khóa máy này cho: ${m.name} (${m.role})</option>`).join('');
    document.getElementById('sync-room-code').value = syncRoomCode;
    document.getElementById('sync-firebase-url').value = syncFirebaseUrl;
}

function setLockedDeviceMember(uid) {
    lockedDeviceMemberId = uid;
    localStorage.setItem(DEVICE_LOCK_KEY, uid);
    if (uid) {
        state.currentUserId = uid;
        saveState();
        updateHUD();
        const m = getCurrentUser();
        showToast(`🔒 Đã cố định thiết bị này cho ${m.name}!`);
    } else {
        showToast('🔓 Đã mở khóa chuyển đổi nhân vật trên máy này.');
    }
}

function saveOnlineSyncConfig() {
    syncRoomCode = document.getElementById('sync-room-code').value.trim().replace(/[^a-zA-Z0-9_-]/g, '');
    syncFirebaseUrl = document.getElementById('sync-firebase-url').value.trim().replace(/\/+$/, '');
    localStorage.setItem(SYNC_ROOM_KEY, syncRoomCode);
    localStorage.setItem(SYNC_DB_URL_KEY, syncFirebaseUrl);
    if (syncRoomCode && syncFirebaseUrl) {
        startFirebaseRealtimeLoop();
        pushFullStateToFirebase(true);
        showToast('☁️ Đã kết nối phòng đồng bộ gia đình!');
    } else {
        showToast('⚠️ Đã tắt đồng bộ đám mây (chạy Offline trên máy).');
    }
}

function getFirebaseEndpoint(subPath = '') {
    if (!syncRoomCode || !syncFirebaseUrl) return null;
    const cleanSub = subPath ? `/${subPath}` : '';
    return `${syncFirebaseUrl}/rooms/${syncRoomCode}${cleanSub}.json`;
}

async function pushFullStateToFirebase(force = false) {
    const url = getFirebaseEndpoint('sharedState');
    if (!url) return;
    try {
        const payload = {
            ...state,
            _updatedAt: Date.now(),
            _updatedBy: getCurrentUser().id
        };
        delete payload.currentUserId;
        await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const hudBtn = document.getElementById('sync-hud-btn');
        if (hudBtn) hudBtn.textContent = '🟢 Online';
    } catch (e) {
        const hudBtn = document.getElementById('sync-hud-btn');
        if (hudBtn) hudBtn.textContent = '🟠 Offline';
    }
}

function pushMyPositionToFirebase() {
    if (!syncRoomCode || !syncFirebaseUrl) return;
    clearTimeout(positionPushTimer);
    positionPushTimer = setTimeout(async () => {
        const user = getCurrentUser();
        const url = getFirebaseEndpoint(`livePositions/${user.id}`);
        if (!url) return;
        try {
            await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    x: Math.round(user.x),
                    y: Math.round(user.y),
                    dir: user.dir,
                    scene: gameScene,
                    privateOwnerId: activePrivateRoomOwnerId || '',
                    holdingDrink: user.holdingDrink || '',
                    speech: user.speechTimer > 0 ? user.speech : '',
                    ts: Date.now()
                })
            });
        } catch (e) {}
    }, 180);
}

async function pullStateFromFirebase() {
    const roomUrl = getFirebaseEndpoint();
    if (!roomUrl) return;
    try {
        const res = await fetch(roomUrl);
        if (!res.ok) return;
        const data = await res.json();
        if (!data) return;

        const hudBtn = document.getElementById('sync-hud-btn');
        if (hudBtn) hudBtn.textContent = '🟢 Online';

        const myId = getCurrentUser().id;
        if (data.sharedState && data.sharedState._updatedBy !== myId) {
            const incomingHash = String(data.sharedState._updatedAt || '');
            if (incomingHash && incomingHash !== lastCloudSyncHash) {
                lastCloudSyncHash = incomingHash;
                const keepCurrentUserId = lockedDeviceMemberId || state.currentUserId;
                const localMe = state.members.find(m => m.id === keepCurrentUserId);

                state = { ...getDefaultState(), ...data.sharedState, currentUserId: keepCurrentUserId };
                if (localMe) {
                    const idx = state.members.findIndex(m => m.id === keepCurrentUserId);
                    if (idx >= 0) {
                        state.members[idx].x = localMe.x;
                        state.members[idx].y = localMe.y;
                        state.members[idx].targetX = localMe.targetX;
                        state.members[idx].targetY = localMe.targetY;
                    }
                }
                saveState(true);
                updateHUD();
            }
        }

        if (data.livePositions) {
            Object.entries(data.livePositions).forEach(([uid, pos]) => {
                if (uid === myId || !pos) return;
                if (Date.now() - (pos.ts || 0) > 45000) return;
                const member = state.members.find(m => m.id === uid);
                if (member) {
                    member.targetX = pos.x;
                    member.targetY = pos.y;
                    member.dir = pos.dir || member.dir;
                    member.holdingDrink = pos.holdingDrink || '';
                    if (pos.speech) {
                        member.speech = pos.speech;
                        member.speechTimer = 120;
                    }
                }
            });
        }
    } catch (e) {}
}

function startFirebaseRealtimeLoop() {
    clearInterval(firebasePollInterval);
    if (!syncRoomCode || !syncFirebaseUrl) return;
    pullStateFromFirebase();
    firebasePollInterval = setInterval(pullStateFromFirebase, 2200);
}
