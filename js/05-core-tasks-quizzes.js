/* =========================================================================
           9. NHIỆM VỤ HÀNG NGÀY, FAMILY CO-OP QUEST & PHÁO HOA HOÀN TẤT NGÀY
           ========================================================================= */
        function getActivityStatus(member, type) {
            const rule = DAILY_ROUTINE_RULES[type];
            if (!rule || !member) return { canEarn: false };
            ensureMemberIntegrity(member, 0);
            const count = member.dailyActivity.counts[type] || 0;
            const lastTs = member.dailyActivity.lastTs[type] || 0;
            const now = Date.now();
            const remainMs = Math.max(0, (lastTs + rule.cooldownMs) - now);
            const capped = count >= rule.maxPerDay;
            return {
                isParent: isParent(member),
                count,
                maxPerDay: rule.maxPerDay,
                capped,
                remainMs,
                canEarn: !isParent(member) && !capped && remainMs === 0
            };
        }

        function checkAllDailyTasksCompleted(member) {
            if (!member || isParent(member)) return false;
            const myTasks = (state.tasks || []).filter(t => t.assigneeId === member.id);
            const pendingPersonal = myTasks.filter(t => t.status !== 'completed');
            const myQuests = (state.familyQuests || []).filter(q => (q.participantIds || []).includes(member.id) && q.status !== 'completed');
            // Nếu bé có ít nhất 1 nhiệm vụ trong ngày và tất cả đã hoàn thành -> Bắn pháo hoa chúc mừng!
            if ((myTasks.length > 0 || (state.familyQuests || []).length > 0) && pendingPersonal.length === 0 && myQuests.length === 0) {
                return true;
            }
            return false;
        }

        function performRoutineActivity(member, type, customPhrase = null) {
            const rule = DAILY_ROUTINE_RULES[type];
            if (!rule || !member) return;
            const st = getActivityStatus(member, type);
            const phrase = customPhrase || rule.phrase;

            if (st.canEarn) {
                member.points += rule.points;
                member.dailyActivity.counts[type] = st.count + 1;
                member.dailyActivity.lastTs[type] = Date.now();
                AudioEngine.playCoin();
                showToast(`🎉 +${rule.points}⭐ (${rule.label} ${st.count + 1}/${rule.maxPerDay})`);
                triggerSpeechBubble(member, `${phrase} (+${rule.points}⭐)`, true);
                logFamilyActivity(member, 'routine', `${rule.label} (+${rule.points}⭐)`, rule.points);
            } else {
                AudioEngine.playSuccess();
                showToast(`✨ ${rule.label} xong rồi!`);
                triggerSpeechBubble(member, phrase, false);
            }
            lastHudSignature = '';
            updateHUD();
            saveGame();
        }

        function submitChore(taskId) {
            const t = state.tasks.find(x => x.id === taskId);
            const me = getCurrentUser();
            if (!t || t.assigneeId !== me.id) return;
            t.status = 'submitted';
            t.completedAt = Date.now();
            AudioEngine.playSuccess();
            showToast('📩 Đã báo cáo hoàn thành! Chờ Bố/Mẹ duyệt nhé.');
            triggerSpeechBubble(me, `Con đã làm xong "${t.title}" rồi ạ!`, true);
            logFamilyActivity(me, 'task_submit', `Báo cáo xong việc: ${t.title}`, 0);
            lastHudSignature = '';
            updateHUD();
            saveGame();
        }

        function approveChore(taskId) {
            const t = state.tasks.find(x => x.id === taskId);
            const me = getCurrentUser();
            if (!t || !isParent(me)) return;
            const kid = state.members.find(m => m.id === t.assigneeId);
            if (!kid) return;

            t.status = 'completed';
            t.completedAt = Date.now();
            kid.points += t.reward;
            AudioEngine.playCoin();
            showToast(`🎉 Đã duyệt! ${kid.name} nhận +${t.reward}⭐`);
            triggerSpeechBubble(me, `Khen ngợi ${kid.name} hoàn thành "${t.title}" (+${t.reward}⭐)!`, true);
            logFamilyActivity(kid, 'task_approved', `Được duyệt việc "${t.title}" (+${t.reward}⭐)`, t.reward);

            if (checkAllDailyTasksCompleted(kid)) {
                triggerCelebrationConfetti();
                showToast(`🎆 XUẤT SẮC! ${kid.name} đã hoàn thành toàn bộ nhiệm vụ hôm nay!`);
            }
            lastHudSignature = '';
            updateHUD();
            saveGame();
        }

        function openSubmitHomeworkModal(taskId) {
            const t = state.tasks.find(x => x.id === taskId);
            if (!t) return;
            document.getElementById('submit-hw-id').value = t.id;
            document.getElementById('submit-hw-title').innerText = `📚 Bài tập: ${t.title} (Thưởng: ${t.reward}⭐)`;
            document.getElementById('submit-hw-note').value = '';
            document.getElementById('submit-hw-file').value = '';
            document.getElementById('submit-hw-modal').style.display = 'flex';
        }

        function confirmSubmitHomework() {
            const taskId = Number(document.getElementById('submit-hw-id').value);
            const t = state.tasks.find(x => x.id === taskId);
            const me = getCurrentUser();
            if (!t) return;

            const note = document.getElementById('submit-hw-note').value.trim();
            const fileInput = document.getElementById('submit-hw-file');

            const done = (fileData, fileName) => {
                t.status = 'submitted';
                t.childNote = note;
                t.childFile = fileData;
                t.childFileName = fileName;
                t.completedAt = Date.now();
                closeModal('submit-hw-modal');
                AudioEngine.playSuccess();
                showToast('📤 Đã nộp bài tập cho Bố/Mẹ!');
                triggerSpeechBubble(me, `Con đã nộp bài "${t.title}" ạ!`, true);
                logFamilyActivity(me, 'task_submit', `Nộp bài tập: ${t.title}`, 0);
                if (typeof renderSmartphoneScreen === 'function') renderSmartphoneScreen();
                lastHudSignature = '';
                updateHUD();
                saveGame();
            };

            if (fileInput && fileInput.files && fileInput.files[0]) {
                const f = fileInput.files[0];
                const reader = new FileReader();
                reader.onload = e => done(e.target.result, f.name);
                reader.readAsDataURL(f);
            } else {
                done(null, '');
            }
        }

        function openGradeHomeworkModal(taskId) {
            const t = state.tasks.find(x => x.id === taskId);
            if (!t) return;
            const kid = state.members.find(m => m.id === t.assigneeId);
            document.getElementById('grade-hw-id').value = t.id;
            document.getElementById('grade-hw-score').value = 10;
            document.getElementById('grade-hw-details').innerHTML = `
                <div><b>Học sinh:</b> ${kid ? kid.name : ''}</div>
                <div><b>Bài tập:</b> ${escapeHtml(t.title)} (Quỹ thưởng: <b>${t.reward}⭐</b>)</div>
                ${t.childNote ? `<div style="margin-top:4px;"><b>Lời nhắn của con:</b> <i>"${escapeHtml(t.childNote)}"</i></div>` : ''}
                ${t.childFile ? `<div style="margin-top:6px;"><button class="btn btn-sm btn-secondary" onclick="viewAttachment(${t.id}, 'child')">📎 Xem bài làm đính kèm (${escapeHtml(t.childFileName)})</button></div>` : ''}
            `;
            document.getElementById('grade-hw-modal').style.display = 'flex';
        }

        function confirmGradeHomework() {
            const taskId = Number(document.getElementById('grade-hw-id').value);
            const score = Math.max(0, Math.min(10, parseFloat(document.getElementById('grade-hw-score').value) || 0));
            const t = state.tasks.find(x => x.id === taskId);
            const me = getCurrentUser();
            if (!t || !isParent(me)) return;
            const kid = state.members.find(m => m.id === t.assigneeId);
            if (!kid) return;

            const earned = Math.round((score / 10) * t.reward);
            const refund = Math.max(0, t.reward - earned);

            t.status = 'completed';
            t.grade = score;
            t.completedAt = Date.now();
            kid.points += earned;
            me.points += refund;

            closeModal('grade-hw-modal');
            AudioEngine.playCoin();
            showToast(`📝 Chấm ${score}/10! ${kid.name} nhận +${earned}⭐`);
            triggerSpeechBubble(me, `Chấm bài "${t.title}": ${score}/10 điểm (+${earned}⭐)!`, true);
            logFamilyActivity(kid, 'task_approved', `Chấm bài "${t.title}" được ${score}/10 (+${earned}⭐)`, earned);

            if (checkAllDailyTasksCompleted(kid)) {
                triggerCelebrationConfetti();
                showToast(`🎆 TUYỆT VỜI! ${kid.name} đã hoàn thành toàn bộ nhiệm vụ hôm nay!`);
            }
            if (typeof renderSmartphoneScreen === 'function') renderSmartphoneScreen();
            lastHudSignature = '';
            updateHUD();
            saveGame();
        }

        function deleteTask(taskId) {
            const idx = state.tasks.findIndex(x => x.id === taskId);
            if (idx === -1) return;
            const t = state.tasks[idx];
            const me = getCurrentUser();
            if (isParent(me) && t.status !== 'completed') {
                me.points += t.reward;
            }
            state.tasks.splice(idx, 1);
            AudioEngine.playClick();
            showToast('🗑️ Đã xóa nhiệm vụ!');
            lastHudSignature = '';
            updateHUD();
            saveGame();
        }

        // NHIỆM VỤ ĐỒNG ĐỘI (FAMILY CO-OP QUEST)
        function createFamilyCoopQuest() {
            const me = getCurrentUser();
            if (!isParent(me)) return;
            const title = document.getElementById('coop-quest-title').value.trim();
            const rewardEach = parseInt(document.getElementById('coop-quest-reward').value) || 0;
            const kids = state.members.filter(m => !isParent(m));
            if (!title) return showToast('⚠️ Nhập tên nhiệm vụ đồng đội!');
            if (kids.length < 2) return showToast('⚠️ Cần ít nhất 2 bé để tạo nhiệm vụ đồng đội!');
            const totalCost = rewardEach * kids.length;
            if (rewardEach <= 0 || me.points < totalCost) {
                AudioEngine.playError();
                return showToast(`❌ Cần ${totalCost}⭐ ngân sách (${rewardEach}⭐ x ${kids.length} bé)!`);
            }

            me.points -= totalCost;
            if (!Array.isArray(state.familyQuests)) state.familyQuests = [];
            state.familyQuests.push({
                id: Date.now(),
                title,
                creatorId: me.id,
                rewardEach,
                participantIds: kids.map(k => k.id),
                completedBy: [],
                status: 'active',
                createdAt: Date.now()
            });
            AudioEngine.playSuccess();
            showToast(`🤝 Đã phát động Nhiệm vụ Đồng đội (-${totalCost}⭐ ngân sách)!`);
            triggerSpeechBubble(me, `Nhiệm vụ đồng đội mới: ${title}!`, true);
            renderParentalDashboard();
            lastHudSignature = '';
            updateHUD();
            saveGame();
        }

        function checkInFamilyQuest(questId) {
            const me = getCurrentUser();
            const q = (state.familyQuests || []).find(x => x.id === questId);
            if (!q || q.status === 'completed') return;
            if (!q.participantIds.includes(me.id)) return showToast('⚠️ Nhiệm vụ này dành cho các bé!');
            if (!Array.isArray(q.completedBy)) q.completedBy = [];
            if (q.completedBy.includes(me.id)) return showToast('✅ Bạn đã xác nhận phần của mình rồi, chờ anh/chị/em cùng hoàn thành nhé!');

            q.completedBy.push(me.id);
            logFamilyActivity(me, 'coop_step', `Xác nhận phần việc đồng đội: ${q.title}`, 0);

            const allDone = q.participantIds.every(pid => q.completedBy.includes(pid));
            if (allDone) {
                q.status = 'completed';
                q.completedAt = Date.now();
                q.participantIds.forEach(pid => {
                    const kid = state.members.find(m => m.id === pid);
                    if (kid) {
                        kid.points += q.rewardEach;
                        logFamilyActivity(kid, 'coop_completed', `Hoàn thành Nhiệm vụ Đồng đội "${q.title}" (+${q.rewardEach}⭐)`, q.rewardEach);
                    }
                });
                triggerCelebrationConfetti();
                showToast(`🎉 ĐỒNG ĐỘI TUYỆT VỜI! Cả hai bé cùng nhận +${q.rewardEach}⭐!`);
                triggerSpeechBubble(me, `Chúng con đã cùng hoàn thành "${q.title}" (+${q.rewardEach}⭐)!`, true);
            } else {
                AudioEngine.playSuccess();
                showToast(`🤝 ${me.name} đã hoàn thành phần của mình! Chờ thành viên còn lại cùng xong để nhận +${q.rewardEach}⭐!`);
                triggerSpeechBubble(me, `Mình xong phần việc đồng đội "${q.title}" rồi!`, true);
            }

            if (typeof renderSmartphoneScreen === 'function') renderSmartphoneScreen();
            lastHudSignature = '';
            updateHUD();
            saveGame();
        }

        function viewAttachment(taskId, who) {
            const t = state.tasks.find(x => x.id === taskId);
            if (!t) return;
            const dataUrl = who === 'parent' ? t.parentFile : t.childFile;
            const fileName = who === 'parent' ? t.parentFileName : t.childFileName;
            if (!dataUrl) return;
            document.getElementById('file-viewer-title').innerText = `📎 ${fileName}`;
            if (dataUrl.startsWith('data:image/')) {
                document.getElementById('file-viewer-content').innerHTML = `<img src="${dataUrl}" style="max-width:100%; max-height:65vh; border-radius:12px; border:2px solid #2C3E50;">`;
            } else {
                document.getElementById('file-viewer-content').innerHTML = `
                    <p>Tệp đính kèm: <b>${escapeHtml(fileName)}</b></p>
                    <a href="${dataUrl}" download="${escapeHtml(fileName)}" class="btn btn-primary">⬇️ Tải tệp về máy</a>
                `;
            }
            document.getElementById('file-viewer-modal').style.display = 'flex';
        }

        /* =========================================================================
           10. ĐỐ VUI TIẾNG ANH (PHÁT ÂM WEB SPEECH API + NGÂN HÀNG FIREBASE)
           ========================================================================= */
        let currentQuiz = null;

        function speakEnglishText(text, rate = 0.9) {
            if (!('speechSynthesis' in window) || !text) return;
            try {
                window.speechSynthesis.cancel();
                const utter = new SpeechSynthesisUtterance(text);
                utter.lang = 'en-US';
                utter.rate = rate;
                utter.pitch = 1.05;
                window.speechSynthesis.speak(utter);
            } catch (e) {
                console.warn('SpeechSynthesis error:', e);
            }
        }

        function recordQuizProgress(member, isCorrect, starsEarned) {
            if (!member) return;
            if (!state.quizStats) state.quizStats = {};
            if (!state.quizStats[member.id]) state.quizStats[member.id] = {};
            const today = getTodayStr();
            if (!state.quizStats[member.id][today]) {
                state.quizStats[member.id][today] = { correct: 0, total: 0, stars: 0 };
            }
            state.quizStats[member.id][today].total += 1;
            if (isCorrect) {
                state.quizStats[member.id][today].correct += 1;
                state.quizStats[member.id][today].stars += starsEarned;
            }
        }

        function openQuizModal() {
            AudioEngine.playClick();
            const bank = (Array.isArray(state.customQuizzes) && state.customQuizzes.length > 0)
                ? state.customQuizzes
                : DEFAULT_ENGLISH_QUIZZES;
            currentQuiz = bank[Math.floor(Math.random() * bank.length)];
            const speakTarget = currentQuiz.wordToSpeak || currentQuiz.options[currentQuiz.answer];

            document.getElementById('quiz-body').innerHTML = `
                <div style="background:#F5EEF8; border:2.5px solid #8E44AD; border-radius:14px; padding:14px; margin-bottom:12px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; flex-wrap:wrap; gap:6px;">
                        <div style="font-size:12px; font-weight:700; color:#8E44AD;">🎯 Trả lời đúng nhận ngay +5⭐!</div>
                        <div style="display:flex; gap:5px;">
                            <button type="button" class="btn btn-sm btn-secondary" onclick="speakEnglishText('${escapeHtml(speakTarget).replace(/'/g, "\\'")}', 0.92)">🔊 Nghe phát âm</button>
                            <button type="button" class="btn btn-sm" style="background:#FFF;" onclick="speakEnglishText('${escapeHtml(speakTarget).replace(/'/g, "\\'")}', 0.65)">🐢 Nghe chậm</button>
                        </div>
                    </div>
                    <div style="font-size:16px; font-weight:700; color:#2C3E50;">${escapeHtml(currentQuiz.q)}</div>
                </div>
                <div>
                    ${currentQuiz.options.map((opt, idx) => `
                        <button class="quiz-option" onclick="answerQuiz(${idx})">
                            <b>${String.fromCharCode(65 + idx)}.</b> ${escapeHtml(opt)}
                        </button>
                    `).join('')}
                </div>
            `;
            document.getElementById('quiz-modal').style.display = 'flex';
            // Tự động đọc phát âm từ vựng / câu tiếng Anh khi mở câu hỏi
            setTimeout(() => speakEnglishText(speakTarget, 0.9), 220);
        }

        function answerQuiz(idx) {
            if (!currentQuiz) return;
            const me = getCurrentUser();
            const speakTarget = currentQuiz.wordToSpeak || currentQuiz.options[currentQuiz.answer];
            if (idx === currentQuiz.answer) {
                me.points += 5;
                AudioEngine.playCoin();
                speakEnglishText(speakTarget, 0.92);
                showToast('🎉 Chính xác! Bạn nhận được +5⭐!');
                triggerSpeechBubble(me, `Trả lời đúng tiếng Anh "${speakTarget}" (+5⭐)! 🧠`, true);
                recordQuizProgress(me, true, 5);
                logFamilyActivity(me, 'quiz', `Trả lời đúng đố vui tiếng Anh (+5⭐)`, 5);
                lastHudSignature = '';
                updateHUD();
                saveGame();
                openQuizModal();
            } else {
                AudioEngine.playError();
                recordQuizProgress(me, false, 0);
                showToast('❌ Chưa đúng rồi, nghe lại phát âm và thử lại nhé!');
                speakEnglishText(speakTarget, 0.75);
                saveGame();
            }
        }

        /* =========================================================================
           10B. HỆ THỐNG ĐĂNG NHẬP & BẢNG ĐIỀU KHIỂN PHỤ HUYNH NÂNG CẤP (CHART + LOGS)
           ========================================================================= */
        let pendingLoginMemberId = null;
        let parentalCurrentTab = 'overview'; // 'overview' | 'redemptions' | 'quizzes' | 'logs' | 'family'
        let parentalWeeklyChart = null;

        function openLoginGate() {
            state.sessionLoggedIn = false;
            document.getElementById('login-gate-overlay').style.display = 'flex';
            renderLoginGateCharacters();
        }

        function renderLoginGateCharacters() {
            const grid = document.getElementById('login-character-grid');
            if (!grid) return;
            grid.innerHTML = state.members.map(m => `
                <button type="button" class="login-char-btn" onclick="selectCharacterToLogin('${m.id}')">
                    <div style="font-size:38px;">${m.outfit || getRoleEmoji(m.role)}</div>
                    <b style="font-size:15px; color:#2C3E50;">${escapeHtml(m.name)}</b>
                    <span class="tag">${escapeHtml(m.role)}</span>
                    <span style="font-size:12px; font-weight:700; color:#D35400;">${m.points}⭐</span>
                    ${m.password ? '<span style="font-size:11px; color:#8E44AD;">🔐 Có mật khẩu</span>' : '<span style="font-size:11px; color:#27AE60;">🔓 Vào ngay</span>'}
                </button>
            `).join('');
        }

        function selectCharacterToLogin(memberId) {
            const m = state.members.find(x => x.id === memberId);
            if (!m) return;
            AudioEngine.init();
            AudioEngine.playClick();

            if (m.password && m.password.length > 0) {
                pendingLoginMemberId = m.id;
                document.getElementById('pin-login-title').innerText = `🔐 Đăng nhập: ${m.name}`;
                document.getElementById('pin-login-avatar').innerText = m.outfit || getRoleEmoji(m.role);
                document.getElementById('pin-login-input').value = '';
                document.getElementById('pin-login-modal').style.display = 'flex';
                setTimeout(() => document.getElementById('pin-login-input').focus(), 60);
            } else {
                completeCharacterLogin(m.id);
            }
        }

        function confirmCharacterLogin() {
            const m = state.members.find(x => x.id === pendingLoginMemberId);
            if (!m) return;
            const entered = document.getElementById('pin-login-input').value;
            if (entered === m.password) {
                closeModal('pin-login-modal');
                completeCharacterLogin(m.id);
            } else {
                AudioEngine.playError();
                showToast('❌ Sai mật khẩu rồi! Vui lòng thử lại.');
            }
        }

        function completeCharacterLogin(memberId) {
            state.currentUserId = memberId;
            state.sessionLoggedIn = true;
            document.getElementById('login-gate-overlay').style.display = 'none';
            const me = getCurrentUser();
            AudioEngine.playSuccess();
            showToast(`👋 Xin chào ${me.name}!`);
            lastHudSignature = '';
            updateHUD();
            saveGame();
        }

        function switchMember(id) {
            selectCharacterToLogin(id);
        }

        function openParentalModal(tab = 'overview') {
            AudioEngine.playClick();
            parentalCurrentTab = tab;
            document.getElementById('parental-modal').style.display = 'flex';
            renderParentalDashboard();
        }

        function switchParentalTab(tab) {
            AudioEngine.playClick();
            parentalCurrentTab = tab;
            renderParentalDashboard();
        }

        function renderParentalDashboard() {
            const body = document.getElementById('parental-body');
            if (!body) return;
            const me = getCurrentUser();

            if (!isParent(me)) {
                body.innerHTML = `
                    <div style="text-align:center; padding:16px;">
                        <div style="font-size:44px;">🔒</div>
                        <p>Chỉ tài khoản <b>Bố</b> hoặc <b>Mẹ</b> mới có quyền truy cập Bảng điều khiển Phụ huynh.</p>
                        <button class="btn btn-primary" onclick="closeModal('parental-modal'); openLoginGate();">🔄 Đăng nhập tài khoản Bố/Mẹ</button>
                    </div>
                `;
                return;
            }

            const pendingRedemptions = (state.interworldRedemptions || []).filter(r => r.status === 'pending').length;
            const rapidAlerts = (state.activityLogs || []).filter(l => l.rapidFlag).length;

            const navHtml = `
                <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:12px; border-bottom:2px solid #ECF0F1; padding-bottom:8px;">
                    <button class="btn btn-sm ${parentalCurrentTab === 'overview' ? 'btn-primary' : ''}" onclick="switchParentalTab('overview')">📊 Biểu đồ & Đồng đội</button>
                    <button class="btn btn-sm ${parentalCurrentTab === 'redemptions' ? 'btn-primary' : ''}" onclick="switchParentalTab('redemptions')">
                        🎁 Duyệt Đổi Quà ${pendingRedemptions > 0 ? `(${pendingRedemptions})` : ''}
                    </button>
                    <button class="btn btn-sm ${parentalCurrentTab === 'quizzes' ? 'btn-primary' : ''}" onclick="switchParentalTab('quizzes')">🧠 Kho Tiếng Anh</button>
                    <button class="btn btn-sm ${parentalCurrentTab === 'logs' ? 'btn-primary' : ''}" onclick="switchParentalTab('logs')">
                        🕒 Nhật Ký ${rapidAlerts > 0 ? `⚠️(${rapidAlerts})` : ''}
                    </button>
                    <button class="btn btn-sm ${parentalCurrentTab === 'family' ? 'btn-primary' : ''}" onclick="switchParentalTab('family')">👨‍👩‍👧‍👦 Thành Viên</button>
                </div>
            `;

            // TAB 1: BIỂU ĐỒ TIẾN ĐỘ TUẦN (CHART.JS) + NHIỆM VỤ ĐỒNG ĐỘI
            if (parentalCurrentTab === 'overview') {
                body.innerHTML = `
                    ${navHtml}
                    <div style="background:#FFF; border:2.5px solid #2C3E50; border-radius:14px; padding:12px; margin-bottom:12px;">
                        <div style="font-weight:700; font-size:14px; color:#2C3E50; margin-bottom:6px;">📈 Thống kê 7 ngày gần nhất (Nhiệm vụ hoàn thành & Câu đúng Tiếng Anh)</div>
                        <div style="height:210px; position:relative;">
                            <canvas id="parental-progress-chart"></canvas>
                        </div>
                    </div>

                    <div style="background:#EBF5FB; border:2.5px solid #2980B9; border-radius:14px; padding:12px;">
                        <div style="font-weight:700; font-size:14px; color:#1B4F72; margin-bottom:8px;">🤝 Giao Nhiệm Vụ Đồng Đội (Cả 2 bé cùng xong mới nhận thưởng)</div>
                        <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:8px;">
                            <input type="text" id="coop-quest-title" placeholder="VD: Cùng nhau gấp quần áo & dọn phòng..." style="flex:1; min-width:200px; padding:7px; border:2px solid #2C3E50; border-radius:8px;">
                            <input type="number" id="coop-quest-reward" value="25" min="5" max="200" style="width:85px; padding:7px; border:2px solid #2C3E50; border-radius:8px;" title="Sao thưởng mỗi bé">
                            <button class="btn btn-sm btn-primary" onclick="createFamilyCoopQuest()">🚀 Giao Đồng Đội</button>
                        </div>
                        <div style="display:flex; flex-direction:column; gap:6px;">
                            ${(state.familyQuests || []).slice().reverse().map(q => `
                                <div class="card-item" style="padding:8px;">
                                    <div style="display:flex; justify-content:space-between; align-items:center;">
                                        <b>${escapeHtml(q.title)}</b>
                                        <span class="tag" style="background:${q.status === 'completed' ? '#D4EDDA' : '#FFF3CD'};">
                                            ${q.status === 'completed' ? '🎉 Đã hoàn thành' : `⏳ ${(q.completedBy || []).length}/${(q.participantIds || []).length} bé xong`}
                                        </span>
                                    </div>
                                    <div style="font-size:12px; color:#555;">Thưởng mỗi bé: <b>+${q.rewardEach}⭐</b></div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
                setTimeout(renderParentalChartJs, 40);
                return;
            }

            // TAB 2: DUYỆT ĐỔI QUÀ THỰC TẾ XUYÊN THẾ GIỚI
            if (parentalCurrentTab === 'redemptions') {
                const list = (state.interworldRedemptions || []).slice().reverse();
                body.innerHTML = `
                    ${navHtml}
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <b style="font-size:14px;">🌌 Yêu cầu đổi quà thực tế từ các bé:</b>
                        <button class="btn btn-sm btn-accent" onclick="closeModal('parental-modal'); openInterworldModal();">⚙️ Quản lý danh mục quà</button>
                    </div>
                    ${list.length === 0 ? '<p style="color:#666; text-align:center;">Chưa có yêu cầu đổi quà thực tế nào.</p>' : `
                        <div style="display:flex; flex-direction:column; gap:8px;">
                            ${list.map(r => `
                                <div class="card-item" style="flex-direction:row; justify-content:space-between; align-items:center;">
                                    <div>
                                        <div style="font-size:14px;"><b>${r.icon} ${escapeHtml(r.itemName)}</b> (${r.cost}⭐)</div>
                                        <div style="font-size:12px; color:#555;">Bé yêu cầu: <b>${escapeHtml(r.memberName)}</b> • Lúc ${formatTimestamp(r.ts)}</div>
                                    </div>
                                    <div>
                                        ${r.status === 'pending'
                                            ? `<button class="btn btn-sm btn-primary" onclick="approveInterworldRedemption('${r.id}')">✅ Duyệt đã trao quà</button>`
                                            : `<span class="tag" style="background:#D4EDDA; color:#155724;">✔️ Đã duyệt (${formatTimestamp(r.approvedAt)})</span>`
                                        }
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `}
                `;
                return;
            }

            // TAB 3: NGÂN HÀNG CÂU HỎI TIẾNG ANH ĐỘNG TRÊN FIREBASE
            if (parentalCurrentTab === 'quizzes') {
                const bank = state.customQuizzes || [];
                body.innerHTML = `
                    ${navHtml}
                    <div style="background:#F5EEF8; border:2px solid #8E44AD; border-radius:12px; padding:10px; margin-bottom:10px;">
                        <div style="font-weight:700; font-size:13.5px; color:#6C3483; margin-bottom:6px;">➕ Thêm từ vựng / câu hỏi tiếng Anh mới (Đồng bộ tức thì lên Firebase)</div>
                        <div class="form-group" style="margin-bottom:6px;">
                            <input type="text" id="new-quiz-q" placeholder="Câu hỏi (VD: Từ tiếng Anh nào nghĩa là 'Con sư tử'?)">
                        </div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:6px;">
                            <input type="text" id="new-quiz-opt0" placeholder="Đáp án A">
                            <input type="text" id="new-quiz-opt1" placeholder="Đáp án B">
                            <input type="text" id="new-quiz-opt2" placeholder="Đáp án C">
                            <input type="text" id="new-quiz-opt3" placeholder="Đáp án D">
                        </div>
                        <div style="display:flex; gap:6px; flex-wrap:wrap;">
                            <select id="new-quiz-ans" style="padding:6px; border:2px solid #2C3E50; border-radius:8px;">
                                <option value="0">Đáp án đúng: A</option>
                                <option value="1">Đáp án đúng: B</option>
                                <option value="2">Đáp án đúng: C</option>
                                <option value="3">Đáp án đúng: D</option>
                            </select>
                            <input type="text" id="new-quiz-speak" placeholder="Từ/câu tiếng Anh để máy đọc phát âm (VD: Lion)" style="flex:1; padding:6px; border:2px solid #2C3E50; border-radius:8px;">
                            <button class="btn btn-sm btn-purple" onclick="addCustomEnglishQuiz()">💾 Lưu vào kho</button>
                        </div>
                    </div>
                    <div style="font-weight:700; font-size:13px; margin-bottom:6px;">📚 Danh sách câu hỏi hiện có (${bank.length} câu):</div>
                    <div style="display:flex; flex-direction:column; gap:6px; max-height:240px; overflow-y:auto;">
                        ${bank.slice().reverse().map((q, revIdx) => {
                            const realIdx = bank.length - 1 - revIdx;
                            return `
                                <div class="card-item" style="padding:8px; flex-direction:row; justify-content:space-between; align-items:center;">
                                    <div style="font-size:12.5px;">
                                        <b>${escapeHtml(q.q)}</b>
                                        <div style="color:#27AE60;">Đáp án: <b>${escapeHtml(q.options[q.answer])}</b> (🔊 ${escapeHtml(q.wordToSpeak || q.options[q.answer])})</div>
                                    </div>
                                    <button class="btn btn-sm btn-danger" onclick="deleteCustomEnglishQuiz(${realIdx})">🗑️</button>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;
                return;
            }

            // TAB 4: NHẬT KÝ LỊCH SỬ (ACTIVITY LOG + PHÁT HIỆN BẤM HÀNG LOẠT)
            if (parentalCurrentTab === 'logs') {
                const logs = state.activityLogs || [];
                body.innerHTML = `
                    ${navHtml}
                    <div style="font-size:12.5px; color:#555; margin-bottom:8px;">
                        Ghi lại mốc thời gian từng lần bé hoàn thành nhiệm vụ, đố vui và đổi quà để Bố Mẹ theo dõi tính trung thực.
                    </div>
                    <div style="display:flex; flex-direction:column; gap:6px; max-height:330px; overflow-y:auto;">
                        ${logs.length === 0 ? '<p style="text-align:center; color:#666;">Chưa có nhật ký hoạt động nào.</p>' : logs.map(l => `
                            <div class="card-item" style="padding:8px; background:${l.rapidFlag ? '#FDEDEC' : '#FFF'}; border-color:${l.rapidFlag ? '#E74C3C' : '#2C3E50'};">
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <span><b>${escapeHtml(l.memberName)}</b>: ${escapeHtml(l.detail)}</span>
                                    <span class="tag">${formatTimestamp(l.ts)}</span>
                                </div>
                                ${l.rapidFlag ? '<div style="color:#C0392B; font-size:11.5px; font-weight:700;">⚠️ Cảnh báo: Bấm hoàn thành liên tiếp trong thời gian quá ngắn (< 15 giây)!</div>' : ''}
                            </div>
                        `).join('')}
                    </div>
                `;
                return;
            }

            // TAB 5: QUẢN LÝ THÀNH VIÊN & THƯỞNG/PHẠT ĐIỂM
            body.innerHTML = `
                ${navHtml}
                <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:14px;">
                    ${state.members.map(m => `
                        <div class="card-item">
                            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                                <div>
                                    <b style="font-size:15px;">${m.outfit || '👤'} ${escapeHtml(m.name)}</b> <span class="tag">${escapeHtml(m.role)}</span>
                                    <span class="points-pill" style="margin-left:6px;">${m.points}⭐</span>
                                </div>
                                <div style="display:flex; gap:5px; flex-wrap:wrap;">
                                    <button class="btn btn-sm btn-primary" onclick="adjustMemberPoints('${m.id}', 10)">+10⭐</button>
                                    <button class="btn btn-sm btn-danger" onclick="adjustMemberPoints('${m.id}', -10)">-10⭐</button>
                                    <button class="btn btn-sm btn-secondary" onclick="setMemberPasswordPrompt('${m.id}')">🔐 Đổi MK</button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div style="background:#EAFAF1; border:2px solid #27AE60; border-radius:12px; padding:10px;">
                    <b style="font-size:13.5px;">➕ Thêm thành viên mới vào gia đình:</b>
                    <div style="display:flex; gap:6px; margin-top:6px; flex-wrap:wrap;">
                        <input type="text" id="new-member-name" placeholder="Tên thành viên..." style="flex:1; padding:6px; border:2px solid #2C3E50; border-radius:8px;">
                        <select id="new-member-role" style="padding:6px; border:2px solid #2C3E50; border-radius:8px;">
                            <option value="Con gái">Con gái</option>
                            <option value="Con trai">Con trai</option>
                            <option value="Bố">Bố</option>
                            <option value="Mẹ">Mẹ</option>
                        </select>
                        <button class="btn btn-sm btn-primary" onclick="addFamilyMember()">Thêm</button>
                    </div>
                </div>
            `;
        }

        function renderParentalChartJs() {
            const canvasEl = document.getElementById('parental-progress-chart');
            if (!canvasEl || typeof Chart === 'undefined') return;
            if (parentalWeeklyChart) {
                parentalWeeklyChart.destroy();
            }

            // Tạo nhãn 7 ngày gần nhất
            const days = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date(Date.now() - i * 86400000);
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                days.push({ iso: `${yyyy}-${mm}-${dd}`, label: `${dd}/${mm}` });
            }

            const kids = state.members.filter(m => !isParent(m));
            const colors = ['#E74C3C', '#3498DB', '#2ECC71', '#9B59B6'];
            const datasets = [];

            kids.forEach((kid, idx) => {
                const color = colors[idx % colors.length];
                // Dữ liệu số nhiệm vụ hoàn thành mỗi ngày
                const taskSeries = days.map(day => {
                    return (state.tasks || []).filter(t =>
                        t.assigneeId === kid.id &&
                        t.status === 'completed' &&
                        t.completedAt &&
                        new Date(t.completedAt).toISOString().startsWith(day.iso)
                    ).length;
                });

                // Dữ liệu số câu tiếng Anh đúng mỗi ngày
                const quizSeries = days.map(day => {
                    const st = state.quizStats && state.quizStats[kid.id] && state.quizStats[kid.id][day.iso];
                    return st ? st.correct : 0;
                });

                datasets.push({
                    label: `${kid.name} - Việc hoàn thành`,
                    data: taskSeries,
                    backgroundColor: color,
                    borderRadius: 6
                });
                datasets.push({
                    label: `${kid.name} - Tiếng Anh đúng`,
                    data: quizSeries,
                    type: 'line',
                    borderColor: color,
                    backgroundColor: color,
                    tension: 0.3
                });
            });

            parentalWeeklyChart = new Chart(canvasEl, {
                type: 'bar',
                data: {
                    labels: days.map(d => d.label),
                    datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
                    },
                    scales: {
                        y: { beginAtZero: true, ticks: { stepSize: 1 } }
                    }
                }
            });
        }

        function addCustomEnglishQuiz() {
            const q = document.getElementById('new-quiz-q').value.trim();
            const o0 = document.getElementById('new-quiz-opt0').value.trim();
            const o1 = document.getElementById('new-quiz-opt1').value.trim();
            const o2 = document.getElementById('new-quiz-opt2').value.trim();
            const o3 = document.getElementById('new-quiz-opt3').value.trim();
            const ans = parseInt(document.getElementById('new-quiz-ans').value) || 0;
            const speak = document.getElementById('new-quiz-speak').value.trim();

            if (!q || !o0 || !o1 || !o2 || !o3) {
                return showToast('⚠️ Vui lòng nhập đầy đủ câu hỏi và 4 đáp án!');
            }
            const opts = [o0, o1, o2, o3];
            if (!Array.isArray(state.customQuizzes)) state.customQuizzes = [];
            state.customQuizzes.push({
                id: 'q_' + Date.now(),
                q,
                options: opts,
                answer: ans,
                wordToSpeak: speak || opts[ans]
            });
            AudioEngine.playSuccess();
            showToast('✅ Đã lưu câu hỏi mới lên Firebase!');
            saveGame();
            renderParentalDashboard();
        }

        function deleteCustomEnglishQuiz(idx) {
            if (!Array.isArray(state.customQuizzes)) return;
            if (state.customQuizzes.length <= 1) {
                return showToast('⚠️ Cần giữ lại ít nhất 1 câu hỏi trong kho!');
            }
            state.customQuizzes.splice(idx, 1);
            AudioEngine.playClick();
            showToast('🗑️ Đã xóa câu hỏi!');
            saveGame();
            renderParentalDashboard();
        }

        function adjustMemberPoints(memberId, delta) {
            const m = state.members.find(x => x.id === memberId);
            if (!m) return;
            m.points = Math.max(0, m.points + delta);
            AudioEngine.playCoin();
            showToast(`${delta > 0 ? '🎁 Thưởng' : '⚠️ Trừ'} ${Math.abs(delta)}⭐ cho ${m.name}`);
            lastHudSignature = '';
            updateHUD();
            renderParentalDashboard();
            saveGame();
        }

        function setMemberPasswordPrompt(memberId) {
            const m = state.members.find(x => x.id === memberId);
            if (!m) return;
            const pw = prompt(`Nhập mật khẩu mới cho ${m.name} (Để trống nếu muốn xóa mật khẩu):`, m.password || '');
            if (pw === null) return;
            m.password = pw.trim();
            showToast(`🔐 Đã cập nhật mật khẩu cho ${m.name}`);
            renderParentalDashboard();
            saveGame();
        }

        function addFamilyMember() {
            const name = document.getElementById('new-member-name').value.trim();
            const role = document.getElementById('new-member-role').value;
            if (!name) return showToast('⚠️ Nhập tên thành viên!');
            state.members.push({
                id: 'mem_' + Date.now(),
                name, role, password: '', points: 30,
                scene: 'house', x: 360, y: 310, dir: 'down',
                hairColor: '#2C3E50', outfit: getRoleEmoji(role),
                ownedOutfits: [getRoleEmoji(role)],
                inventory: [],
                unlockedAnimals: [],
                dailyActivity: { date: getTodayStr(), counts: {}, lastTs: {} }
            });
            AudioEngine.playSuccess();
            showToast(`🎉 Đã thêm ${name} vào gia đình!`);
            lastHudSignature = '';
            updateHUD();
            renderParentalDashboard();
            saveGame();
        }