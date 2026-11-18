// =========================================================================
// 3. HỆ THỐNG NHIỆM VỤ (CHORES, CO-OP QUEST & HOMEWORK)
// =========================================================================
let activeHwTaskId = null;

function toggleHomeworkUpload() {
    const type = document.getElementById('task-type').value;
    document.getElementById('parent-file-group').style.display = (type === 'homework') ? 'flex' : 'none';
    const isCoop = (type === 'coop');
    const assigneeGroup = document.getElementById('task-assignee-group');
    const coopHint = document.getElementById('coop-task-hint');
    if (assigneeGroup) assigneeGroup.style.display = isCoop ? 'none' : 'flex';
    if (coopHint) coopHint.style.display = isCoop ? 'block' : 'none';
}

function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ name: file.name, type: file.type, dataUrl: reader.result });
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function createTask() {
    const user = getCurrentUser();
    if (!user.isParent) return showToast('🔒 Chỉ Bố hoặc Mẹ mới có quyền giao nhiệm vụ!');
    const type = document.getElementById('task-type').value;
    const assigneeId = type === 'coop' ? 'both' : document.getElementById('task-assignee').value;
    const title = document.getElementById('task-title').value.trim();
    const reward = parseInt(document.getElementById('task-reward').value) || 20;
    if (!title) return showToast('⚠️ Vui lòng nhập tên công việc hoặc bài tập!');

    let parentFile = null;
    const fileInput = document.getElementById('task-parent-file');
    if (type === 'homework' && fileInput.files && fileInput.files[0]) {
        if (fileInput.files[0].size > 2.5 * 1024 * 1024) {
            return showToast('⚠️ File đính kèm tối đa 2.5MB để lưu mượt mà!');
        }
        parentFile = await readFileAsDataURL(fileInput.files[0]);
    }

    const newTask = {
        id: 't_' + Date.now(),
        type,
        assigneeId,
        title,
        reward,
        status: 'pending',
        createdAt: Date.now(),
        parentFile,
        submission: null,
        score: null
    };
    if (type === 'coop') {
        newTask.coopProgress = { kem: false, soc: false };
    }
    state.tasks.unshift(newTask);
    document.getElementById('task-title').value = '';
    fileInput.value = '';
    saveState();
    renderTasksModal();
    playSound('success');
    showToast('✅ Đã giao nhiệm vụ mới!');
}

function completeChore(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task || task.status === 'done') return;
    const user = getCurrentUser();

    if (task.type === 'coop') {
        if (user.id !== 'kem' && user.id !== 'soc' && !user.isParent) {
            return showToast('🤝 Nhiệm vụ đồng đội dành cho Kem và Sóc cùng thực hiện!');
        }
        if (!task.coopProgress) task.coopProgress = { kem: false, soc: false };
        if (user.id === 'kem' || user.id === 'soc') {
            task.coopProgress[user.id] = true;
            addActivityLog(user.id, `Bấm hoàn thành phần đồng đội: "${task.title}"`, Date.now() - (task.createdAt || Date.now()));
        } else if (user.isParent) {
            task.coopProgress.kem = true;
            task.coopProgress.soc = true;
        }
        if (task.coopProgress.kem && task.coopProgress.soc) {
            task.status = 'done';
            const kem = state.members.find(m => m.id === 'kem');
            const soc = state.members.find(m => m.id === 'soc');
            if (kem) kem.points += task.reward;
            if (soc) soc.points += task.reward;
            addActivityLog('kem', `Hoàn thành Đồng đội "${task.title}" (+${task.reward}⭐)`);
            addActivityLog('soc', `Hoàn thành Đồng đội "${task.title}" (+${task.reward}⭐)`);
            saveState();
            updateHUD();
            renderTasksModal();
            playSound('success');
            triggerFireworks();
            showToast(`🎉 Tuyệt vời! Kem & Sóc đã hợp sức hoàn thành nhiệm vụ, mỗi bé nhận +${task.reward} ⭐!`);
        } else {
            saveState();
            renderTasksModal();
            playSound('coin');
            const waitingFor = !task.coopProgress.kem ? 'Kem' : 'Sóc';
            showToast(`🤝 ${user.name} đã xong phần của mình! Đang chờ ${waitingFor} cùng hoàn thành...`);
        }
        return;
    }

    const durationMs = Date.now() - (task.createdAt || Date.now());
    task.status = 'done';
    const child = state.members.find(m => m.id === task.assigneeId);
    if (child) {
        child.points += task.reward;
        addActivityLog(child.id, `Hoàn thành nhiệm vụ: "${task.title}" (+${task.reward}⭐)`, durationMs);
    }
    saveState();
    updateHUD();
    renderTasksModal();
    playSound('success');
    triggerFireworks();
    showToast(`🎉 Tuyệt vời! ${child ? child.name : ''} nhận được +${task.reward} ⭐!`);
}

function openSubmitHomeworkModal(taskId) {
    activeHwTaskId = taskId;
    const task = state.tasks.find(t => t.id === taskId);
    document.getElementById('submit-hw-title').textContent = `Bài tập: ${task.title}`;
    document.getElementById('hw-child-file').value = '';
    document.getElementById('hw-child-note').value = '';
    openModal('submit-hw-modal');
}

async function confirmSubmitHomework() {
    const task = state.tasks.find(t => t.id === activeHwTaskId);
    if (!task) return;
    const fileInput = document.getElementById('hw-child-file');
    const note = document.getElementById('hw-child-note').value.trim() || 'Con đã hoàn thành bài tập!';
    let childFile = null;
    if (fileInput.files && fileInput.files[0]) {
        if (fileInput.files[0].size > 2.5 * 1024 * 1024) {
            return showToast('⚠️ File ảnh/tài liệu tối đa 2.5MB!');
        }
        childFile = await readFileAsDataURL(fileInput.files[0]);
    }
    task.status = 'submitted';
    task.submission = { note, file: childFile, time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) };
    addActivityLog(task.assigneeId, `Nộp bài tập: "${task.title}"`);
    saveState();
    closeModal('submit-hw-modal');
    renderTasksModal();
    playSound('coin');
    showToast('📤 Đã nộp bài tập! Chờ Bố/Mẹ chấm điểm nhé.');
}

function openGradeHomeworkModal(taskId) {
    activeHwTaskId = taskId;
    const task = state.tasks.find(t => t.id === taskId);
    const child = state.members.find(m => m.id === task.assigneeId);
    document.getElementById('grade-hw-info').textContent = `Học sinh: ${child ? child.name : ''} | Bài: ${task.title} | Thưởng tối đa: ${task.reward} ⭐`;
    const preview = document.getElementById('grade-hw-preview');
    let html = `<p style="margin:0 0 6px 0;">💬 Lời nhắn của con: <i>"${task.submission?.note || ''}"</i></p>`;
    if (task.submission && task.submission.file) {
        const f = task.submission.file;
        if (f.type.startsWith('image/')) {
            html += `<img src="${f.dataUrl}" style="max-width:100%; max-height:220px; border-radius:8px; border:1px solid #ccc;">`;
        } else {
            html += `<a href="${f.dataUrl}" download="${f.name}" class="btn btn-sm btn-primary">📥 Tải bài làm (${f.name})</a>`;
        }
    } else {
        html += `<span style="color:#7F8C8D; font-size:12.5px;">(Con không đính kèm file ảnh/tài liệu)</span>`;
    }
    preview.innerHTML = html;
    openModal('grade-hw-modal');
}

function confirmGradeHomework() {
    const task = state.tasks.find(t => t.id === activeHwTaskId);
    if (!task) return;
    const score = Math.min(10, Math.max(0, parseFloat(document.getElementById('hw-grade-score').value) || 0));
    task.score = score;
    task.status = 'done';
    let earned = 0;
    if (score >= 8) earned = task.reward;
    else if (score >= 5) earned = Math.round(task.reward * 0.5);

    const child = state.members.find(m => m.id === task.assigneeId);
    if (child) {
        child.points += earned;
        addActivityLog(child.id, `Được chấm bài "${task.title}": ${score}/10đ (+${earned}⭐)`);
    }
    saveState();
    updateHUD();
    closeModal('grade-hw-modal');
    renderTasksModal();
    playSound('success');
    triggerFireworks();
    showToast(`🏆 Đã chấm ${score}/10 điểm! ${child ? child.name : ''} nhận +${earned} ⭐!`);
}

function deleteTask(taskId) {
    state.tasks = state.tasks.filter(t => t.id !== taskId);
    saveState();
    renderTasksModal();
    showToast('🗑️ Đã xóa nhiệm vụ');
}

function renderTasksModal() {
    const user = getCurrentUser();
    document.getElementById('parent-task-creator').style.display = user.isParent ? 'block' : 'none';
    const children = state.members.filter(m => !m.isParent);
    document.getElementById('task-assignee').innerHTML = children.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

    const listEl = document.getElementById('tasks-list');
    if (state.tasks.length === 0) {
        listEl.innerHTML = `<p style="text-align:center; color:#7F8C8D;">Chưa có nhiệm vụ nào. Bố/Mẹ hãy giao việc cho các con nhé!</p>`;
        return;
    }

    listEl.innerHTML = state.tasks.map(t => {
        const isCoop = t.type === 'coop';
        const child = state.members.find(m => m.id === t.assigneeId);
        const typeBadge = isCoop ? '🤝 Đồng đội' : (t.type === 'homework' ? '📚 Bài tập' : '🧹 Việc nhà');
        const assigneeText = isCoop ? 'Kem & Sóc (Cùng làm)' : (child ? child.name : t.assigneeId);
        let statusHtml = '';
        let actionBtn = '';

        if (isCoop) {
            const p = t.coopProgress || { kem: false, soc: false };
            statusHtml = `<span class="tag" style="background:${t.status === 'done' ? '#D4EDDA' : '#EBF5FB'};">Kem: ${p.kem ? '✅' : '⏳'} | Sóc: ${p.soc ? '✅' : '⏳'}</span>`;
            if (t.status !== 'done') {
                const alreadyDoneMine = (user.id === 'kem' && p.kem) || (user.id === 'soc' && p.soc);
                if (alreadyDoneMine) {
                    actionBtn = `<span style="font-size:12px; color:#1E8449; font-weight:700;">⏳ Đang chờ bạn còn lại...</span>`;
                } else {
                    actionBtn = `<button class="btn btn-sm btn-primary" onclick="completeChore('${t.id}')">🤝 Hoàn thành phần của con</button>`;
                }
            }
        } else if (t.status === 'done') {
            statusHtml = `<span class="tag" style="background:#D4EDDA; color:#155724;">✅ Hoàn thành ${t.score !== null ? `(${t.score}/10đ)` : ''}</span>`;
        } else if (t.status === 'submitted') {
            statusHtml = `<span class="tag" style="background:#FFF3CD; color:#856404;">⏳ Chờ Bố/Mẹ chấm điểm</span>`;
            if (user.isParent) {
                actionBtn = `<button class="btn btn-sm btn-accent" onclick="openGradeHomeworkModal('${t.id}')">📝 Chấm điểm ngay</button>`;
            }
        } else {
            statusHtml = `<span class="tag" style="background:#FADBD8; color:#78281F;">🔥 Chưa xong</span>`;
            if (t.type === 'chore') {
                actionBtn = `<button class="btn btn-sm btn-primary" onclick="completeChore('${t.id}')">✔️ Báo cáo hoàn thành</button>`;
            } else {
                actionBtn = `<button class="btn btn-sm btn-purple" onclick="openSubmitHomeworkModal('${t.id}')">📤 Nộp bài tập</button>`;
            }
        }

        let parentAttachmentHtml = '';
        if (t.parentFile) {
            parentAttachmentHtml = `<div style="margin-top:4px;"><a href="${t.parentFile.dataUrl}" download="${t.parentFile.name}" class="btn btn-sm" style="background:#EBF5FB;">📎 Đề bài: ${t.parentFile.name}</a></div>`;
        }

        return `
            <div class="card-item" style="${isCoop ? 'border-color:#2980B9; background:#F4F9FD;' : ''}">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
                    <div>
                        <span class="tag">${typeBadge}</span>
                        <span class="tag" style="background:#EBF5FB;">👤 ${assigneeText}</span>
                        <span class="points-pill">+${t.reward} ⭐${isCoop ? '/bé' : ''}</span>
                    </div>
                    ${statusHtml}
                </div>
                <div style="font-weight:700; font-size:15px;">${t.title}</div>
                ${parentAttachmentHtml}
                <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:4px;">
                    ${actionBtn}
                    ${user.isParent ? `<button class="btn btn-sm btn-danger" onclick="deleteTask('${t.id}')">🗑️</button>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// =========================================================================
// 4. SIÊU THỊ GIA ĐÌNH, TÚI ĐỒ (CÓ NÚT XÓA) & TẶNG ĐIỂM
// =========================================================================
function renderShopModal() {
    const user = getCurrentUser();
    document.getElementById('shop-user-points').textContent = user.isParent ? '∞ ⭐' : `${user.points} ⭐`;
    document.getElementById('shop-parent-add-btn').innerHTML = user.isParent
        ? `<button class="btn btn-sm btn-accent" onclick="document.getElementById('parent-shop-creator').style.display='block'">➕ Thêm phần thưởng</button>`
        : '';

    const grid = document.getElementById('shop-items-grid');
    grid.innerHTML = state.shopItems.map(item => `
        <div class="card-item">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:28px;">${item.icon}</span>
                <span class="points-pill">${item.price} ⭐</span>
            </div>
            <div style="font-weight:700; font-size:14.5px;">${item.name}</div>
            <div style="font-size:12px; color:#555;">${item.desc || ''}</div>
            <button class="btn btn-sm btn-primary" onclick="buyShopItem('${item.id}')">🛒 Đổi bằng sao</button>
        </div>
    `).join('');
}

function addCustomReward() {
    const icon = document.getElementById('new-reward-icon').value.trim() || '🎁';
    const name = document.getElementById('new-reward-name').value.trim();
    const price = parseInt(document.getElementById('new-reward-price').value) || 30;
    if (!name) return showToast('⚠️ Nhập tên phần thưởng!');
    state.shopItems.unshift({ id: 's_' + Date.now(), category: 'voucher', icon, name, price, desc: 'Phần thưởng đặc biệt từ Bố Mẹ!' });
    document.getElementById('new-reward-name').value = '';
    document.getElementById('parent-shop-creator').style.display = 'none';
    saveState();
    renderShopModal();
    showToast('✅ Đã thêm phần thưởng vào Siêu Thị!');
}

function buyShopItem(itemId) {
    const user = getCurrentUser();
    const item = state.shopItems.find(s => s.id === itemId);
    if (!item) return;
    if (!user.isParent && user.points < item.price) {
        playSound('error');
        return showToast('❌ Bạn chưa đủ điểm sao rồi! Hãy làm thêm việc nhà hoặc học tiếng Anh nhé.');
    }
    if (!user.isParent) user.points -= item.price;

    if (item.category === 'voucher') {
        state.vouchers.unshift({
            id: 'v_' + Date.now(),
            ownerId: user.id,
            icon: item.icon,
            name: item.name,
            used: false,
            date: new Date().toLocaleDateString('vi-VN')
        });
        showToast(`🎟️ Đã đổi "${item.name}"! Kiểm tra trong Túi đồ nhé.`);
    } else if (item.category === 'outfit') {
        if (!user.unlockedOutfits.includes(item.outfitCode)) {
            user.unlockedOutfits.push(item.outfitCode);
        }
        user.outfit = item.outfitCode;
        showToast(`🦸 Đã mua và mặc "${item.name}"!`);
    } else if (item.category === 'decor') {
        user.roomDecor.push({ id: 'd_' + Date.now(), icon: item.icon, name: item.name });
        showToast(`🛋️ Đã mua "${item.name}" cho phòng riêng!`);
    }
    addActivityLog(user.id, `Đổi vật phẩm siêu thị: "${item.name}" (-${item.price}⭐)`);
    saveState();
    updateHUD();
    renderShopModal();
    playSound('coin');
}

function switchBagTab(tab, btn) {
    document.querySelectorAll('#bag-modal .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('bag-vouchers-list').style.display = (tab === 'vouchers') ? 'grid' : 'none';
    document.getElementById('bag-items-list').style.display = (tab === 'items') ? 'grid' : 'none';
    document.getElementById('bag-lab-list').style.display = (tab === 'lab') ? 'block' : 'none';
}

function deleteBagVoucher(voucherId) {
    if (!confirm('Bạn có chắc muốn xóa phiếu phần thưởng này khỏi túi không?')) return;
    state.vouchers = state.vouchers.filter(v => v.id !== voucherId);
    saveState();
    updateHUD();
    renderBagModal();
    playSound('pop');
    showToast('🗑️ Đã xóa phiếu khỏi túi đồ.');
}

function deleteBagDecor(decorId) {
    const user = getCurrentUser();
    if (!confirm('Bạn có chắc muốn xóa món đồ nội thất này khỏi túi không?')) return;
    user.roomDecor = (user.roomDecor || []).filter(d => d.id !== decorId);
    if (user.roomPlaced) {
        if (user.roomPlaced.left && user.roomPlaced.left.id === decorId) user.roomPlaced.left = null;
        if (user.roomPlaced.right && user.roomPlaced.right.id === decorId) user.roomPlaced.right = null;
    }
    saveState();
    updateHUD();
    renderBagModal();
    playSound('pop');
    showToast('🗑️ Đã xóa món đồ khỏi túi!');
}

function deleteBagLabItem(craftedId) {
    const user = getCurrentUser();
    if (!confirm('Bạn có chắc muốn xóa cổ vật thí nghiệm này khỏi túi không?')) return;
    state.labCraftedItems[user.id] = (state.labCraftedItems[user.id] || []).filter(x => x.id !== craftedId);
    if (user.roomPlaced) {
        if (user.roomPlaced.left && user.roomPlaced.left.id === craftedId) user.roomPlaced.left = null;
        if (user.roomPlaced.right && user.roomPlaced.right.id === craftedId) user.roomPlaced.right = null;
    }
    saveState();
    updateHUD();
    renderBagModal();
    playSound('pop');
    showToast('🗑️ Đã xóa cổ vật thí nghiệm!');
}

function renderBagModal() {
    const user = getCurrentUser();
    const myVouchers = state.vouchers.filter(v => v.ownerId === user.id);
    const vEl = document.getElementById('bag-vouchers-list');
    vEl.innerHTML = myVouchers.length ? myVouchers.map(v => `
        <div class="card-item" style="opacity:${v.used ? 0.65 : 1};">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:28px;">${v.icon}</span>
                <button class="btn btn-sm btn-danger" style="padding:3px 7px;" onclick="deleteBagVoucher('${v.id}')" title="Xóa phiếu này">🗑️</button>
            </div>
            <div style="font-weight:700;">${v.name}</div>
            <div style="font-size:11.5px; color:#666;">Ngày đổi: ${v.date}</div>
            ${v.used
                ? `<span class="tag" style="background:#EAEDED;">✔️ Đã sử dụng</span>`
                : `<button class="btn btn-sm btn-accent" onclick="useVoucher('${v.id}')">✨ Đưa Bố/Mẹ xác nhận dùng</button>`
            }
        </div>
    `).join('') : `<p style="color:#7F8C8D;">Túi phiếu đang trống. Hãy đổi quà tại Siêu Thị Gia Đình nhé!</p>`;

    const iEl = document.getElementById('bag-items-list');
    const outfitsHtml = user.unlockedOutfits.map(o => `
        <div class="card-item">
            <div style="font-size:24px;">👕</div>
            <div style="font-weight:700;">Trang phục: ${o.toUpperCase()}</div>
            <span class="tag" style="background:#D5F5E3;">Đã sở hữu</span>
        </div>
    `).join('');
    const decorHtml = user.roomDecor.map(d => `
        <div class="card-item">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:24px;">${d.icon}</span>
                <button class="btn btn-sm btn-danger" style="padding:3px 7px;" onclick="deleteBagDecor('${d.id}')" title="Xóa món đồ này">🗑️</button>
            </div>
            <div style="font-weight:700;">${d.name}</div>
            <span class="tag">Đồ nội thất phòng riêng</span>
        </div>
    `).join('');
    iEl.innerHTML = outfitsHtml + decorHtml;

    const labEl = document.getElementById('bag-lab-list');
    if (labEl) {
        const myIngs = state.labIngredients[user.id] || [];
        const myCrafted = state.labCraftedItems[user.id] || [];
        const ingCounts = {};
        myIngs.forEach(id => { ingCounts[id] = (ingCounts[id] || 0) + 1; });

        const ingSection = `
            <h4 style="margin:0 0 6px 0; color:#6C3483;">🧪 Thẻ Nguyên Liệu Thí Nghiệm (${myIngs.length}):</h4>
            <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px;">
                ${Object.keys(ingCounts).length ? Object.entries(ingCounts).map(([id, cnt]) => {
                    const info = LAB_INGREDIENTS_CATALOG.find(x => x.id === id) || { icon: '🧪', name: id };
                    return `<span class="tag" style="background:#F4ECF7; font-size:12.5px;">${info.icon} ${info.name} x${cnt}</span>`;
                }).join('') : '<span style="color:#7F8C8D; font-size:12.5px;">Chưa có nguyên liệu nào. Hãy ghé Phòng Thí Nghiệm nhé!</span>'}
            </div>
            <h4 style="margin:0 0 6px 0; color:#117864;">✨ Cổ Vật & Phát Minh Đã Chế Tạo (${myCrafted.length}):</h4>
            <div class="grid-2">
                ${myCrafted.length ? myCrafted.map(item => `
                    <div class="card-item" style="border-color:${item.borderColor || '#8E44AD'};">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-size:28px;">${item.icon}</span>
                            <div style="display:flex; gap:4px; align-items:center;">
                                <span class="tag" style="background:#FEF9E7;">${item.rarity || 'Hiếm'}</span>
                                <button class="btn btn-sm btn-danger" style="padding:3px 7px;" onclick="deleteBagLabItem('${item.id}')" title="Xóa cổ vật">🗑️</button>
                            </div>
                        </div>
                        <div style="font-weight:700;">${item.name}</div>
                        <div style="font-size:11.5px; color:#555;">${item.desc}</div>
                        <div style="font-size:11px; color:#1E8449; font-weight:600;">💡 Có thể đặt trưng bày trong phòng riêng hoặc bán ở Chợ Trời!</div>
                    </div>
                `).join('') : '<p style="color:#7F8C8D; font-size:12.5px;">Chưa chế tạo vật phẩm thí nghiệm nào.</p>'}
            </div>
        `;
        labEl.innerHTML = ingSection;
    }
}

function useVoucher(voucherId) {
    const v = state.vouchers.find(x => x.id === voucherId);
    if (!v || v.used) return;
    const user = getCurrentUser();
    if (v.name.includes('TV')) {
        const daily = ensureUserDaily(user.id);
        daily.tvBonusSeconds += 30 * 60;
        v.used = true;
        showToast('📺 Đã kích hoạt +30 phút xem Smart TV hôm nay!');
    } else {
        v.used = true;
        state.familyChat.push({ sender: 'Hệ thống', text: `🎟️ ${user.name} đã sử dụng phiếu: "${v.name}"! Bố Mẹ hãy trao thưởng nhé!`, time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) });
        showToast(`🎉 Đã kích hoạt phiếu "${v.name}"! Thông báo đã gửi lên chat gia đình.`);
    }
    saveState();
    updateHUD();
    renderBagModal();
    playSound('success');
}

function renderDonateModal() {
    const user = getCurrentUser();
    document.getElementById('donate-avail').textContent = user.isParent ? '∞ (Ngân sách)' : user.points;
    const others = state.members.filter(m => m.id !== user.id);
    document.getElementById('donate-recipient').innerHTML = others.map(m => `<option value="${m.id}">${m.name} (${m.role})</option>`).join('');
}

function sendDonation() {
    const sender = getCurrentUser();
    const recId = document.getElementById('donate-recipient').value;
    const amount = parseInt(document.getElementById('donate-amount').value) || 0;
    const note = document.getElementById('donate-note').value.trim() || 'Tặng điểm yêu thương!';
    if (amount <= 0) return showToast('⚠️ Số điểm tặng phải lớn hơn 0!');
    if (!sender.isParent && sender.points < amount) {
        playSound('error');
        return showToast('❌ Bạn không đủ điểm sao để tặng!');
    }
    const receiver = state.members.find(m => m.id === recId);
    if (!receiver) return;

    if (!sender.isParent) sender.points -= amount;
    if (!receiver.isParent) receiver.points += amount;

    state.familyChat.push({
        sender: 'Quà tặng 💝',
        text: `${sender.name} đã tặng ${receiver.name} ${amount} ⭐: "${note}"`,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    });
    addActivityLog(sender.id, `Tặng ${amount}⭐ cho ${receiver.name}`);
    saveState();
    updateHUD();
    closeModal('donate-modal');
    playSound('success');
    triggerFireworks();
    showToast(`💝 Đã tặng ${amount} ⭐ cho ${receiver.name}!`);
}
