// =========================================================================
// 8. TRƯỜNG HỌC TIẾNG ANH & PHÒNG THÍ NGHIỆM KHOA HỌC ĐA NĂNG B2KS
// =========================================================================
const DEFAULT_ENGLISH_BANK = [
    { q: 'What is the English word for "Quả táo"?', opts: ['Banana', 'Apple', 'Orange', 'Grape'], ans: 1 },
    { q: 'Choose the correct verb: "She ___ to school every day."', opts: ['go', 'going', 'goes', 'gone'], ans: 2 },
    { q: 'Which animal says "Meow"?', opts: ['Dog', 'Cat', 'Cow', 'Duck'], ans: 1 },
    { q: 'What color is the sky on a clear sunny day?', opts: ['Green', 'Blue', 'Red', 'Yellow'], ans: 1 },
    { q: 'How many days are there in a week?', opts: ['Five', 'Six', 'Seven', 'Eight'], ans: 2 },
    { q: 'Opposite of "Hot" is ___?', opts: ['Cold', 'Big', 'Fast', 'Happy'], ans: 0 },
    { q: 'Translate into English: "Gia đình hạnh phúc"', opts: ['Happy family', 'Sad house', 'Big school', 'Funny friend'], ans: 0 },
    { q: 'Which planet do we live on?', opts: ['Mars', 'Earth', 'Venus', 'Jupiter'], ans: 1 },
    { q: '"I ___ brushing my teeth right now."', opts: ['is', 'are', 'am', 'be'], ans: 2 },
    { q: 'What do you use to write on paper?', opts: ['Spoon', 'Pencil', 'Shoe', 'Pillow'], ans: 1 },
    { q: 'Which month comes after January?', opts: ['March', 'February', 'April', 'December'], ans: 1 },
    { q: 'What is 15 + 25 in English?', opts: ['Thirty', 'Forty', 'Fifty', 'Sixty'], ans: 1 }
];

let currentQuizIndex = 0;

function getCombinedEnglishBank() {
    const custom = Array.isArray(state.customEnglishBank) ? state.customEnglishBank : [];
    return [...custom, ...DEFAULT_ENGLISH_BANK];
}

function renderSchoolModal() {
    checkDailyReset();
    const user = getCurrentUser();
    const daily = ensureUserDaily(user.id);
    const maxDaily = 3;
    const rem = Math.max(0, maxDaily - daily.englishCount);
    const bank = getCombinedEnglishBank();

    document.getElementById('school-daily-status').innerHTML = `
        🎓 Học viên: <b>${user.name}</b> | Lượt nhận thưởng hôm nay: <b>${daily.englishCount}/${maxDaily}</b> (Còn <b>${rem}</b> lượt nhận +20 ⭐)
    `;

    currentQuizIndex = Math.floor(Math.random() * bank.length);
    const item = bank[currentQuizIndex];
    const card = document.getElementById('english-quiz-card');
    card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:10px;">
            <span class="tag" style="background:#D6EAF8;">Câu hỏi Tiếng Anh (${bank.length} câu trong ngân hàng)</span>
            <button class="btn btn-sm btn-accent" onclick="speakEnglishText(\`${item.q.replace(/`/g, '')}\`)">🔊 Nghe phát âm</button>
        </div>
        <div style="font-size:17px; font-weight:700; margin-bottom:12px; color:#1B4F72;">${item.q}</div>
        <div class="grid-2">
            ${item.opts.map((opt, idx) => `
                <button class="btn" style="justify-content:flex-start; text-align:left; font-size:14.5px;" onclick="answerEnglishQuiz(${idx})">
                    <b>${['A', 'B', 'C', 'D'][idx]}.</b> ${opt}
                </button>
            `).join('')}
        </div>
    `;
}

function answerEnglishQuiz(chosenIdx) {
    const user = getCurrentUser();
    const daily = ensureUserDaily(user.id);
    const bank = getCombinedEnglishBank();
    const item = bank[currentQuizIndex];
    if (!item) return;

    if (chosenIdx === item.ans) {
        playSound('success');
        if (daily.englishCount < 3) {
            daily.englishCount++;
            if (!user.isParent) user.points += 20;
            addActivityLog(user.id, `Trả lời đúng câu hỏi Tiếng Anh (+20⭐)`);
            triggerFireworks();
            showToast(`🎉 Chính xác tuyệt đối! ${user.name} nhận +20 ⭐!`);
        } else {
            addActivityLog(user.id, `Luyện tập đúng câu hỏi Tiếng Anh`);
            showToast('🎉 Chính xác! Bạn đã hoàn thành đủ 3 lượt nhận thưởng hôm nay, tiếp tục luyện tập nhé!');
        }
        saveState();
        updateHUD();
        renderSchoolModal();
    } else {
        playSound('error');
        showToast('❌ Chưa chính xác rồi! Hãy thử chọn đáp án khác nhé.');
    }
}

// --- PHÒNG THÍ NGHIỆM KHOA HỌC & CHẾ TẠO ĐA NĂNG ---
const LAB_INGREDIENTS_CATALOG = [
    { id: 'crystal', icon: '💎', name: 'Tinh Thể Pha Lê', price: 10, desc: 'Khoáng chất phát sáng khuếch đại năng lượng.' },
    { id: 'gear', icon: '⚙️', name: 'Bánh Răng Cơ Khí', price: 10, desc: 'Linh kiện chế tạo robot và máy móc thông minh.' },
    { id: 'herb', icon: '🌿', name: 'Thảo Mộc Rừng Sâu', price: 10, desc: 'Lá cây sinh học chứa sức sống thiên nhiên.' },
    { id: 'star_dust', icon: '✨', name: 'Bụi Sao Ngân Hà', price: 12, desc: 'Hạt ánh sáng lấp lánh từ bầu trời đêm.' },
    { id: 'water_drop', icon: '💧', name: 'Giọt Nước Tinh Khiết', price: 8, desc: 'Dung môi đại dương tạo phản ứng kỳ diệu.' },
    { id: 'spark', icon: '⚡', name: 'Tia Chớp Năng Lượng', price: 12, desc: 'Nguồn điện siêu dẫn kích hoạt phát minh.' }
];

const LAB_RECIPES_CATALOG = [
    { id: 'rec_robot', ingredients: ['gear', 'spark', 'crystal'], icon: '🤖', name: 'Robot Trợ Lý Mini B2KS', rarity: 'Huyền Thoại', borderColor: '#2980B9', desc: 'Robot thông minh phát sáng giúp trang trí phòng riêng cực ngầu!' },
    { id: 'rec_potion', ingredients: ['herb', 'water_drop', 'star_dust'], icon: '🧪', name: 'Bình Thuốc Cầu Vồng Rừng Xanh', rarity: 'Sử Thi', borderColor: '#27AE60', desc: 'Bình tinh chất lấp lánh tỏa hương thơm thiên nhiên.' },
    { id: 'rec_lamp', ingredients: ['crystal', 'star_dust'], icon: '🔮', name: 'Quả Cầu Tiên Tri Ánh Sao', rarity: 'Hiếm', borderColor: '#8E44AD', desc: 'Quả cầu pha lê chiếu sáng bầu trời đêm trong phòng ngủ.' },
    { id: 'rec_fountain', ingredients: ['water_drop', 'crystal'], icon: '⛲', name: 'Đài Phun Nước Pha Lê Mini', rarity: 'Hiếm', borderColor: '#16A085', desc: 'Tiểu cảnh nước chảy róc rách thư giãn.' },
    { id: 'rec_drone', ingredients: ['gear', 'spark'], icon: '🛸', name: 'Đĩa Bay Trinh Sát Tí Hon', rarity: 'Hiếm', borderColor: '#E67E22', desc: 'Mô hình đĩa bay bay lơ lửng bằng từ trường.' }
];

let labBenchSelection = [];

function switchLabTab(tab, btn) {
    document.querySelectorAll('#lab-modal .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('lab-tab-shop').style.display = (tab === 'shop') ? 'block' : 'none';
    document.getElementById('lab-tab-craft').style.display = (tab === 'craft') ? 'block' : 'none';
    document.getElementById('lab-tab-ai').style.display = (tab === 'ai') ? 'block' : 'none';
    renderLabModal();
}

function renderLabModal() {
    const user = getCurrentUser();
    if (!Array.isArray(state.labIngredients[user.id])) state.labIngredients[user.id] = [];
    if (!Array.isArray(state.labCraftedItems[user.id])) state.labCraftedItems[user.id] = [];

    document.getElementById('lab-user-points').textContent = user.isParent ? '∞ ⭐' : `${user.points} ⭐`;
    const aiCountEl = document.getElementById('lab-ai-ing-count');
    if (aiCountEl) aiCountEl.textContent = state.labIngredients[user.id].length;

    const shopGrid = document.getElementById('lab-shop-grid');
    if (shopGrid) {
        shopGrid.innerHTML = LAB_INGREDIENTS_CATALOG.map(ing => `
            <div class="card-item">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:28px;">${ing.icon}</span>
                    <span class="points-pill">${ing.price} ⭐</span>
                </div>
                <div style="font-weight:700; font-size:14px;">${ing.name}</div>
                <div style="font-size:11.5px; color:#555;">${ing.desc}</div>
                <button class="btn btn-sm btn-primary" onclick="buyLabIngredient('${ing.id}')">🧪 Mua nguyên liệu</button>
            </div>
        `).join('');
    }

    const ownedDiv = document.getElementById('lab-owned-ingredients');
    if (ownedDiv) {
        const myIngs = state.labIngredients[user.id];
        if (myIngs.length === 0) {
            ownedDiv.innerHTML = `<span style="font-size:12.5px; color:#7F8C8D;">Túi nguyên liệu đang trống. Hãy sang tab <b>1. Kho Nguyên Liệu</b> để mua nhé!</span>`;
        } else {
            ownedDiv.innerHTML = myIngs.map((ingId, idx) => {
                const info = LAB_INGREDIENTS_CATALOG.find(x => x.id === ingId) || { icon: '🧪', name: ingId };
                const isSelected = labBenchSelection.includes(idx);
                return `
                    <button class="btn btn-sm ${isSelected ? 'btn-accent' : ''}" onclick="toggleLabBenchSlot(${idx})" style="${isSelected ? 'opacity:0.55;' : ''}">
                        ${info.icon} ${info.name}
                    </button>
                `;
            }).join('');
        }
    }

    const slotsDiv = document.getElementById('lab-bench-slots');
    if (slotsDiv) {
        const myIngs = state.labIngredients[user.id];
        if (labBenchSelection.length === 0) {
            slotsDiv.innerHTML = `<span style="color:#7F8C8D; font-size:12.5px;">(Chưa chọn nguyên liệu nào lên bàn thí nghiệm)</span>`;
        } else {
            slotsDiv.innerHTML = labBenchSelection.map(idx => {
                const ingId = myIngs[idx];
                const info = LAB_INGREDIENTS_CATALOG.find(x => x.id === ingId) || { icon: '🧪', name: ingId };
                return `<span class="tag" style="background:#FFF; font-size:13px; padding:5px 10px;">${info.icon} ${info.name}</span>`;
            }).join(' <b>+</b> ');
        }
    }

    const hintDiv = document.getElementById('lab-recipes-hint');
    if (hintDiv) {
        hintDiv.innerHTML = LAB_RECIPES_CATALOG.map(r => {
            const ingIcons = r.ingredients.map(id => (LAB_INGREDIENTS_CATALOG.find(x => x.id === id)?.icon || '🧪')).join(' + ');
            return `
                <div style="background:#FFF; border:1.5px solid #D5D8DC; border-radius:8px; padding:6px 8px; font-size:12px;">
                    <b>${r.icon} ${r.name}</b><br>
                    <span style="color:#555;">Công thức: ${ingIcons}</span>
                </div>
            `;
        }).join('');
    }
}

function buyLabIngredient(ingId) {
    const user = getCurrentUser();
    const ing = LAB_INGREDIENTS_CATALOG.find(x => x.id === ingId);
    if (!ing) return;
    if (!user.isParent && user.points < ing.price) {
        playSound('error');
        return showToast('❌ Không đủ điểm sao để mua nguyên liệu này!');
    }
    if (!user.isParent) user.points -= ing.price;
    if (!Array.isArray(state.labIngredients[user.id])) state.labIngredients[user.id] = [];
    state.labIngredients[user.id].push(ing.id);
    saveState();
    updateHUD();
    renderLabModal();
    playSound('coin');
    showToast(`🧪 Đã mua ${ing.icon} ${ing.name}!`);
}

function toggleLabBenchSlot(ingIndex) {
    const pos = labBenchSelection.indexOf(ingIndex);
    if (pos >= 0) {
        labBenchSelection.splice(pos, 1);
    } else {
        if (labBenchSelection.length >= 3) {
            return showToast('⚠️ Buồng phản ứng tối đa 3 nguyên liệu cùng lúc!');
        }
        labBenchSelection.push(ingIndex);
    }
    playSound('pop');
    renderLabModal();
}

function clearLabBench() {
    labBenchSelection = [];
    renderLabModal();
}

function runLabExperiment() {
    const user = getCurrentUser();
    const myIngs = state.labIngredients[user.id] || [];
    if (labBenchSelection.length < 2) {
        return showToast('⚠️ Hãy chọn ít nhất 2 nguyên liệu lên bàn thí nghiệm!');
    }
    const chosenIds = labBenchSelection.map(i => myIngs[i]).sort();

    // Xóa các nguyên liệu đã dùng (xóa từ index lớn đến nhỏ)
    const sortedIndices = [...labBenchSelection].sort((a, b) => b - a);
    sortedIndices.forEach(idx => myIngs.splice(idx, 1));
    labBenchSelection = [];

    // Kiểm tra trùng công thức chuẩn
    const matchedRecipe = LAB_RECIPES_CATALOG.find(r => {
        const sortedRec = [...r.ingredients].sort();
        return sortedRec.length === chosenIds.length && sortedRec.every((v, i) => v === chosenIds[i]);
    });

    let craftedObj;
    if (matchedRecipe) {
        craftedObj = {
            id: 'craft_' + Date.now(),
            icon: matchedRecipe.icon,
            name: matchedRecipe.name,
            rarity: matchedRecipe.rarity,
            borderColor: matchedRecipe.borderColor,
            desc: matchedRecipe.desc,
            createdAt: Date.now()
        };
    } else {
        const mysteryIcons = ['🔮', '🌟', '🧿', '🛸', '🧬', '💎', '🪄'];
        const randomIcon = mysteryIcons[Math.floor(Math.random() * mysteryIcons.length)];
        craftedObj = {
            id: 'craft_' + Date.now(),
            icon: randomIcon,
            name: `Cổ Vật Biến Đổi #${String(Date.now()).slice(-3)}`,
            rarity: 'Độc Bản Ngẫu Nhiên',
            borderColor: '#8E44AD',
            desc: 'Vật phẩm bí ẩn được kết tinh từ phản ứng hóa học độc đáo!',
            createdAt: Date.now()
        };
    }

    if (!Array.isArray(state.labCraftedItems[user.id])) state.labCraftedItems[user.id] = [];
    state.labCraftedItems[user.id].unshift(craftedObj);
    addActivityLog(user.id, `Chế tạo thành công cổ vật: "${craftedObj.name}"`);
    saveState();
    updateHUD();
    renderLabModal();
    playSound('success');
    triggerFireworks();
    showToast(`🎉 Thí nghiệm thành công! Bạn đã tạo ra: ${craftedObj.icon} ${craftedObj.name}!`);
}

function synthesizeCreativeLabItem() {
    const user = getCurrentUser();
    const myIngs = state.labIngredients[user.id] || [];
    const promptText = document.getElementById('lab-custom-prompt').value.trim();
    const styleVal = document.getElementById('lab-custom-style').value;
    if (!promptText) {
        return showToast('⚠️ Hãy nhập ý tưởng sáng chế của bạn trước nhé!');
    }
    if (myIngs.length < 2) {
        playSound('error');
        return showToast('❌ Bạn cần ít nhất 2 thẻ nguyên liệu trong túi để làm xúc tác chế tạo!');
    }

    // Tiêu hao 2 nguyên liệu đầu tiên
    myIngs.splice(0, 2);

    const styleMap = {
        cyber: { icon: '🤖', color: '#00CEC9', tag: 'Công Nghệ Neon' },
        magic: { icon: '🔮', color: '#9B59B6', tag: 'Phép Thuật Ánh Sao' },
        nature: { icon: '🌿', color: '#2ECC71', tag: 'Sinh Thái Tự Nhiên' },
        cosmic: { icon: '🚀', color: '#2980B9', tag: 'Vũ Trụ Thiên Hà' },
        cute: { icon: '🧸', color: '#FD79A8', tag: 'Ngộ Nghĩnh Đáng Yêu' }
    };
    const st = styleMap[styleVal] || styleMap.magic;
    const newItem = {
        id: 'craft_ai_' + Date.now(),
        icon: st.icon,
        name: promptText,
        rarity: `Độc Bản (${st.tag})`,
        borderColor: st.color,
        desc: `Phát minh độc bản do ${user.name} sáng tạo theo phong cách ${st.tag}.`,
        createdAt: Date.now()
    };

    if (!Array.isArray(state.labCraftedItems[user.id])) state.labCraftedItems[user.id] = [];
    state.labCraftedItems[user.id].unshift(newItem);
    document.getElementById('lab-custom-prompt').value = '';
    addActivityLog(user.id, `Sáng tạo cổ vật độc bản: "${newItem.name}"`);
    saveState();
    updateHUD();
    renderLabModal();

    const previewEl = document.getElementById('lab-creative-preview');
    if (previewEl) {
        previewEl.innerHTML = `
            <div class="card-item" style="border:3px solid ${st.color}; background:#FFF;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:36px;">${newItem.icon}</span>
                    <span class="points-pill">${newItem.rarity}</span>
                </div>
                <div style="font-weight:700; font-size:16px; color:#2C3E50;">${newItem.name}</div>
                <div style="font-size:12.5px; color:#555;">${newItem.desc}</div>
                <div style="font-size:12px; color:#1E8449; font-weight:700;">✅ Đã lưu vào Túi Đồ -> Thí Nghiệm & Cổ Vật! Bạn có thể trưng bày trong phòng riêng hoặc đem bán tại Chợ Trời!</div>
            </div>
        `;
    }
    playSound('success');
    triggerFireworks();
    showToast(`🧬 Đã chế tạo thành công cổ vật độc bản "${newItem.name}"!`);
}
