/* =========================================================================
           10. GRADE 6 ENGLISH CENTER QUIZ ENGINE (CLICK CATEGORY TO GENERATE)
           ========================================================================= */
        const GRADE6_ENGLISH_BANK = [
            // GRAMMAR
            { cat: 'grammar', q: 'She ______ to school by bicycle every morning.', opts: ['go', 'goes', 'going', 'is go'], ans: 1, exp: 'Thì hiện tại đơn với chủ ngữ ngôi thứ 3 số ít "She" -> động từ thêm -es (goes).' },
            { cat: 'grammar', q: 'Look! The children ______ football in the schoolyard.', opts: ['play', 'plays', 'are playing', 'is playing'], ans: 2, exp: 'Có dấu hiệu "Look!" -> Thì hiện tại tiếp diễn: are + V-ing.' },
            { cat: 'grammar', q: 'There ______ two bookshelves and a bed in my bedroom.', opts: ['is', 'are', 'am', 'be'], ans: 1, exp: 'Danh từ đứng ngay sau là số nhiều "two bookshelves" -> dùng "There are".' },
            { cat: 'grammar', q: 'My sister ______ tall and she has long black hair.', opts: ['is', 'has', 'are', 'have'], ans: 0, exp: 'Miêu tả chiều cao dùng động từ to be: "She is tall".' },
            { cat: 'grammar', q: 'How ______ books are there on your desk?', opts: ['much', 'many', 'old', 'often'], ans: 1, exp: '"books" là danh từ đếm được số nhiều -> dùng "How many".' },
            { cat: 'grammar', q: 'We ______ English on Mondays and Thursdays.', opts: ['has', 'have', 'having', 'are have'], ans: 1, exp: 'Chủ ngữ "We" ở thì hiện tại đơn dùng "have".' },
            { cat: 'grammar', q: 'The cat is ______ the table and the sofa.', opts: ['between', 'in', 'under', 'on'], ans: 0, exp: 'Cấu trúc "between A and B" (ở giữa A và B).' },
            { cat: 'grammar', q: '______ your father work in a hospital?', opts: ['Do', 'Does', 'Is', 'Are'], ans: 1, exp: 'Câu hỏi hiện tại đơn với động từ thường "work" và chủ ngữ số ít "your father" -> dùng "Does".' },
            { cat: 'grammar', q: 'Mount Everest is the ______ mountain in the world.', opts: ['high', 'higher', 'highest', 'most high'], ans: 2, exp: 'So sánh nhất với tính từ ngắn "high" -> "the highest".' },
            { cat: 'grammar', q: 'You ______ make noise in the library.', opts: ['must', 'mustn’t', 'can', 'should'], ans: 1, exp: '"mustn’t" nghĩa là không được phép làm ồn trong thư viện.' },
            { cat: 'grammar', q: 'Nam is ______ than his younger brother.', opts: ['taller', 'tallest', 'tall', 'more tall'], ans: 0, exp: 'So sánh hơn với tính từ ngắn "tall" + than -> "taller".' },
            { cat: 'grammar', q: 'What ______ you doing at the moment?', opts: ['do', 'does', 'are', 'is'], ans: 2, exp: '"at the moment" -> Hiện tại tiếp diễn: What are you doing?' },
            // VOCABULARY & COMMUNICATION
            { cat: 'vocab', q: 'We use a ______ to draw straight lines in Maths.', opts: ['compass', 'ruler', 'rubber', 'pencil case'], ans: 1, exp: '"ruler" là cây thước kẻ dùng để vẽ đường thẳng.' },
            { cat: 'vocab', q: 'A person who is friendly and likes meeting people is ______.', opts: ['shy', 'outgoing', 'lazy', 'boring'], ans: 1, exp: '"outgoing" nghĩa là cởi mở, hòa đồng.' },
            { cat: 'vocab', q: 'You can buy medicine at the ______.', opts: ['bakery', 'pharmacy', 'cinema', 'post office'], ans: 1, exp: '"pharmacy" là hiệu thuốc.' },
            { cat: 'vocab', q: 'Mai: "Would you like to go to the cinema tonight?" — Lan: "______"', opts: ['Yes, I’d love to!', 'Yes, I do.', 'No, I am not.', 'You’re welcome.'], ans: 0, exp: 'Lời mời "Would you like to...?" -> đáp lại lịch sự bằng "Yes, I’d love to!".' },
            { cat: 'vocab', q: 'In Viet Nam, people decorate their houses with peach blossoms at ______.', opts: ['Christmas', 'Tet', 'Halloween', 'Easter'], ans: 1, exp: 'Hoa đào (peach blossoms) là biểu tượng đặc trưng của dịp Tết Nguyên Đán.' },
            { cat: 'vocab', q: 'Ha Long Bay is a famous natural ______ in Viet Nam.', opts: ['wonder', 'desert', 'island', 'forest'], ans: 0, exp: '"natural wonder" nghĩa là kỳ quan thiên nhiên.' },
            { cat: 'vocab', q: 'Which room in the house do we usually cook meals in?', opts: ['Bedroom', 'Bathroom', 'Kitchen', 'Attic'], ans: 2, exp: '"Kitchen" là nhà bếp — nơi nấu ăn.' },
            { cat: 'vocab', q: 'Lan: "Thank you for helping me with my homework!" — Minh: "______"', opts: ['My pleasure!', 'Good luck!', 'See you!', 'I’m sorry.'], ans: 0, exp: 'Đáp lại lời cảm ơn dùng "My pleasure!" hoặc "You’re welcome!".' },
            { cat: 'vocab', q: 'In ______, we learn about mountains, rivers, and countries.', opts: ['History', 'Geography', 'Physics', 'Music'], ans: 1, exp: '"Geography" là môn Địa lý.' },
            { cat: 'vocab', q: 'Turn ______ at the traffic lights, and the bank is on your right.', opts: ['left', 'straight', 'cross', 'between'], ans: 0, exp: '"Turn left" nghĩa là rẽ trái.' },
            { cat: 'vocab', q: 'We should bring a ______ when going camping in the forest to see at night.', opts: ['torch', 'pillow', 'wardrobe', 'fridge'], ans: 0, exp: '"torch" là đèn pin dùng chiếu sáng ban đêm.' },
            { cat: 'vocab', q: 'A place where you can see many old things and paintings is a ______.', opts: ['museum', 'stadium', 'supermarket', 'factory'], ans: 0, exp: '"museum" là bảo tàng.' }
        ];

        let engQuizSession = {
            questions: [],
            currentIndex: 0,
            score: 0,
            answered: false,
            topic: 'mix'
        };

        // Lobby state: Do NOT display any questions until user clicks a category button!
        function openEnglishCenterLobby() {
            const body = document.getElementById('eng-quiz-body');
            if (!body) return;
            body.innerHTML = `
                <div style="background:#FFF; border:2.5px dashed #16A085; border-radius:12px; padding:24px 16px; text-align:center;">
                    <div style="font-size:38px; margin-bottom:8px;">📚✨</div>
                    <div style="font-weight:700; font-size:15px; color:#117864; margin-bottom:6px;">
                        Sẵn sàng thử thách Tiếng Anh Lớp 6!
                    </div>
                    <div style="font-size:13px; color:#555; max-width:440px; margin:0 auto;">
                        Hãy bấm chọn một thể loại đề thi ở phía trên (<b>Đề Tổng Hợp</b>, <b>Ngữ Pháp</b> hoặc <b>Từ Vựng & Giao Tiếp</b>) để hệ thống tạo bộ đề ngẫu nhiên 10 câu cho bạn nhé!
                    </div>
                </div>
            `;
        }

        function startEnglishGrade6Quiz(topic = 'mix') {
            AudioEngine.playClick();
            let pool = topic === 'mix'
                ? [...GRADE6_ENGLISH_BANK]
                : GRADE6_ENGLISH_BANK.filter(item => item.cat === topic);

            for (let i = pool.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [pool[i], pool[j]] = [pool[j], pool[i]];
            }

            engQuizSession = {
                questions: pool.slice(0, 10),
                currentIndex: 0,
                score: 0,
                answered: false,
                topic
            };
            renderEnglishQuizQuestion();
        }

        function renderEnglishQuizQuestion() {
            const body = document.getElementById('eng-quiz-body');
            if (!body) return;

            if (engQuizSession.currentIndex >= engQuizSession.questions.length) {
                const total = engQuizSession.questions.length;
                const correct = engQuizSession.score;
                const user = getCurrentUser();
                let starsEarned = correct * 2;
                if (correct >= 8) starsEarned += 5;

                user.points = isParent(user) ? Math.min(MAX_PARENT_POINTS, user.points + starsEarned) : user.points + starsEarned;
                AudioEngine.playSuccess();
                updateHUD();
                saveGame();

                body.innerHTML = `
                    <div style="text-align:center; background:#FEF9E7; border:2.5px solid #F39C12; border-radius:12px; padding:16px;">
                        <div style="font-size:40px;">🏆</div>
                        <h3 style="margin:6px 0; color:#2C3E50;">Hoàn Thành Bài Thi Tiếng Anh Lớp 6!</h3>
                        <p style="font-size:15px; margin:6px 0;">Kết quả của <b>${user.name}</b>: <b style="color:#27AE60; font-size:18px;">${correct} / ${total} câu đúng</b></p>
                        <p style="font-size:14px; color:#D35400; font-weight:700;">⭐ Phần thưởng: +${starsEarned}⭐ ${correct >= 8 ? '(Bao gồm +5⭐ thưởng xuất sắc!)' : ''}</p>
                        <button class="btn btn-primary" style="margin-top:8px;" onclick="startEnglishGrade6Quiz('${engQuizSession.topic}')">🔄 Làm Bộ Đề Ngẫu Nhiên Khác</button>
                    </div>
                `;
                return;
            }

            const qObj = engQuizSession.questions[engQuizSession.currentIndex];
            const qNum = engQuizSession.currentIndex + 1;
            const letters = ['A', 'B', 'C', 'D'];

            body.innerHTML = `
                <div style="background:#FFF; border:2.5px solid #2C3E50; border-radius:12px; padding:12px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <span class="tag" style="background:#D6EAF8;">Câu ${qNum} / ${engQuizSession.questions.length}</span>
                        <span class="points-pill">Đúng: ${engQuizSession.score} câu</span>
                    </div>
                    <div style="font-size:15.5px; font-weight:700; color:#2C3E50; margin-bottom:12px; line-height:1.45;">
                        ${qNum}. ${qObj.q}
                    </div>
                    <div id="eng-options-list" style="display:flex; flex-direction:column; gap:8px;">
                        ${qObj.opts.map((opt, idx) => `
                            <button type="button" class="btn" id="eng-opt-${idx}"
                                style="background:#F8F9F9; color:#2C3E50; justify-content:flex-start; text-align:left; padding:9px 12px; font-size:13.5px; white-space:normal;"
                                onclick="selectEnglishQuizAnswer(${idx})">
                                <b>${letters[idx]}.</b>&nbsp;${opt}
                            </button>
                        `).join('')}
                    </div>
                    <div id="eng-feedback-box" style="display:none; margin-top:12px; padding:10px; border-radius:8px; font-size:13px;"></div>
                </div>
            `;
        }

        function selectEnglishQuizAnswer(chosenIdx) {
            if (engQuizSession.answered) return;
            engQuizSession.answered = true;

            const qObj = engQuizSession.questions[engQuizSession.currentIndex];
            const isCorrect = (chosenIdx === qObj.ans);
            if (isCorrect) {
                engQuizSession.score += 1;
                AudioEngine.playCoin();
            } else {
                AudioEngine.playError();
            }

            qObj.opts.forEach((_, idx) => {
                const btn = document.getElementById(`eng-opt-${idx}`);
                if (!btn) return;
                btn.disabled = true;
                if (idx === qObj.ans) {
                    btn.style.background = '#D4EDDA';
                    btn.style.borderColor = '#27AE60';
                    btn.style.color = '#145A32';
                } else if (idx === chosenIdx && !isCorrect) {
                    btn.style.background = '#FADBD8';
                    btn.style.borderColor = '#E74C3C';
                    btn.style.color = '#922B21';
                }
            });

            const fb = document.getElementById('eng-feedback-box');
            fb.style.display = 'block';
            fb.style.background = isCorrect ? '#EAFAF1' : '#FDEDEC';
            fb.style.border = isCorrect ? '2px solid #27AE60' : '2px solid #E74C3C';
            fb.innerHTML = `
                <div style="font-weight:700; color:${isCorrect ? '#1E8449' : '#C0392B'}; margin-bottom:4px;">
                    ${isCorrect ? '✅ Chính xác!' : '❌ Chưa đúng rồi!'}
                </div>
                <div style="color:#2C3E50; margin-bottom:8px;">💡 <b>Giải thích:</b> ${qObj.exp}</div>
                <button type="button" class="btn btn-primary btn-sm" onclick="nextEnglishQuizQuestion()">
                    ${engQuizSession.currentIndex + 1 < engQuizSession.questions.length ? 'Câu tiếp theo ➔' : 'Xem kết quả & Nhận sao 🏆'}
                </button>
            `;
        }

        function nextEnglishQuizQuestion() {
            AudioEngine.playClick();
            engQuizSession.currentIndex += 1;
            engQuizSession.answered = false;
            renderEnglishQuizQuestion();
        }

        /* =========================================================================
           10C. B2KS INVENTION & FUSION LAB ENGINE (ENGLISH PROMPT -> PROCEDURAL ITEM)
           ========================================================================= */
        let currentLabMode = 'prompt'; // 'prompt' | 'fusion'

        const LAB_BASE_INGREDIENTS = [
            { id: 'base_table', name: '🪵 Cái bàn gỗ (Wooden Table)', shape: 'table', color: '#A04000' },
            { id: 'base_fish', name: '🐟 Con cá đại dương (Ocean Fish)', shape: 'fish', color: '#2980B9' },
            { id: 'base_cat', name: '🐱 Chú mèo dễ thương (Cute Cat)', shape: 'cat', color: '#F39C12' },
            { id: 'base_rocket', name: '🚀 Tên lửa vũ trụ (Space Rocket)', shape: 'rocket', color: '#E74C3C' },
            { id: 'base_lamp', name: '💡 Đèn ngủ pha lê (Crystal Lamp)', shape: 'lamp', color: '#9B59B6' },
            { id: 'base_dragon', name: '🐉 Rồng lửa tí hon (Mini Dragon)', shape: 'dragon', color: '#27AE60' },
            { id: 'base_car', name: '🏎️ Siêu xe tốc độ (Speed Car)', shape: 'car', color: '#E67E22' },
            { id: 'base_castle', name: '🏰 Lâu đài mini (Mini Castle)', shape: 'castle', color: '#8E44AD' }
        ];

        const ENGLISH_COMMON_LEXICON = new Set([
            'a','an','the','with','and','of','in','on','for','to','shaped','like','made','from','that','can','has','have',
            'big','small','tiny','giant','cute','cool','super','magic','magical','flying','swimming','glowing','shiny','rainbow',
            'golden','gold','silver','crystal','wooden','wood','metal','robot','cyber','space','star','stars','moon','sun','fire','ice','water',
            'red','blue','green','yellow','pink','purple','orange','black','white','brown','colorful',
            'table','desk','chair','bed','lamp','clock','book','bookshelf','box','house','castle','car','boat','ship','plane','rocket','train',
            'fish','shark','whale','dolphin','cat','dog','bear','rabbit','bird','owl','dragon','unicorn','butterfly','turtle','frog','lion','tiger',
            'wings','wing','tail','legs','four','two','eyes','crown','hat','wheels','wheel','flowers','flower','tree','heart','hearts','cloud','clouds'
        ]);

        function isValidEnglishLabPrompt(raw) {
            const cleaned = (raw || '').trim();
            if (!cleaned) return { ok: false, reason: '⚠️ Bạn chưa nhập dòng lệnh mô tả Tiếng Anh!' };
            // Reject Vietnamese diacritics
            if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(cleaned)) {
                return { ok: false, reason: '🇬🇧 Vui lòng nhập mô tả hoàn toàn bằng Tiếng Anh (không dùng dấu tiếng Việt)!' };
            }
            const words = cleaned.toLowerCase().match(/[a-z]{2,}/g) || [];
            if (words.length < 2) {
                return { ok: false, reason: '✍️ Hãy viết ít nhất 2 từ Tiếng Anh mô tả vật phẩm (ví dụ: "a flying blue fish table")!' };
            }
            const hasVowelWords = words.filter(w => /[aeiouy]/.test(w));
            if (hasVowelWords.length < 2) {
                return { ok: false, reason: '🔤 Dòng lệnh chưa đúng từ vựng Tiếng Anh hợp lệ. Hãy thử lại nhé!' };
            }
            const knownCount = words.filter(w => ENGLISH_COMMON_LEXICON.has(w)).length;
            if (knownCount === 0 && words.length < 3) {
                return { ok: false, reason: '💡 Hãy dùng các từ Tiếng Anh mô tả hình dáng, màu sắc hoặc đồ vật (ví dụ: golden fish, rainbow cat lamp...)' };
            }
            return { ok: true, words };
        }

        function parsePromptToLabSpec(promptText, itemAId = null, itemBId = null) {
            const lower = promptText.toLowerCase();
            const colorMap = [
                { keys: ['rainbow', 'colorful'], hex: '#EC4899', accent: '#FACC15', isRainbow: true },
                { keys: ['gold', 'golden', 'yellow'], hex: '#F59E0B', accent: '#FEF08A' },
                { keys: ['blue', 'ocean', 'water', 'ice', 'crystal'], hex: '#0284C7', accent: '#BAE6FD' },
                { keys: ['red', 'fire', 'ruby'], hex: '#DC2626', accent: '#FCA5A5' },
                { keys: ['green', 'emerald', 'forest', 'wood', 'wooden'], hex: '#16A34A', accent: '#BBF7D0' },
                { keys: ['purple', 'magic', 'magical', 'violet'], hex: '#7C3AED', accent: '#DDD6FE' },
                { keys: ['pink', 'cute', 'heart'], hex: '#DB2777', accent: '#FBCFE8' },
                { keys: ['orange', 'tiger'], hex: '#EA580C', accent: '#FED7AA' },
                { keys: ['silver', 'robot', 'cyber', 'metal', 'white'], hex: '#64748B', accent: '#E2E8F0' }
            ];
            let pickedColor = colorMap.find(c => c.keys.some(k => lower.includes(k))) || { hex: '#0EA5E9', accent: '#BAE6FD', isRainbow: false };

            const shapeKeywords = [
                { keys: ['table', 'desk'], shape: 'table', label: 'Table' },
                { keys: ['fish', 'shark', 'whale', 'dolphin', 'swimming'], shape: 'fish', label: 'Fish' },
                { keys: ['cat', 'kitten', 'dog', 'bear', 'rabbit'], shape: 'cat', label: 'Kitty' },
                { keys: ['rocket', 'ship', 'plane', 'space'], shape: 'rocket', label: 'Rocket' },
                { keys: ['lamp', 'light', 'glowing'], shape: 'lamp', label: 'Lamp' },
                { keys: ['dragon', 'unicorn', 'dino'], shape: 'dragon', label: 'Dragon' },
                { keys: ['car', 'train', 'wheel'], shape: 'car', label: 'Cruiser' },
                { keys: ['castle', 'house', 'tower'], shape: 'castle', label: 'Castle' },
                { keys: ['bookshelf', 'shelf', 'book'], shape: 'shelf', label: 'Shelf' }
            ];

            let primaryShape = 'crystal';
            let secondaryTrait = null;

            const resolveItemShape = (itemId) => {
                if (!itemId) return null;
                const base = LAB_BASE_INGREDIENTS.find(b => b.id === itemId);
                if (base) return base.shape;
                if (itemId === 'd_pc' || itemId === 'd_bookshelf') return 'table';
                if (itemId === 'd_aquarium') return 'fish';
                if (itemId === 'd_bear') return 'cat';
                if (itemId === 'd_plant' || itemId === 'd_guitar') return 'lamp';
                const anyIt = findAnyCatalogItem(itemId);
                if (anyIt) {
                    if (anyIt.labSpec && anyIt.labSpec.primaryShape) return anyIt.labSpec.primaryShape;
                    const nm = (anyIt.name || '').toLowerCase();
                    const hitKw = shapeKeywords.find(s => s.keys.some(k => nm.includes(k)));
                    if (hitKw) return hitKw.shape;
                    if (anyIt.sub === 'hat') return 'crown';
                }
                return null;
            };

            if (itemAId) {
                const shA = resolveItemShape(itemAId);
                if (shA) primaryShape = shA;
            } else {
                const hit = shapeKeywords.find(s => s.keys.some(k => lower.includes(k)));
                if (hit) primaryShape = hit.shape;
            }

            if (itemBId) {
                const shB = resolveItemShape(itemBId);
                if (shB) secondaryTrait = shB;
            } else {
                const secondHit = shapeKeywords.find(s => s.shape !== primaryShape && s.keys.some(k => lower.includes(k)));
                if (secondHit) secondaryTrait = secondHit.shape;
            }

            const hasWings = /wing|fly|flying|bird|butterfly|angel/.test(lower);
            const hasLegs = /leg|table|desk|stand|walk/.test(lower) || secondaryTrait === 'table';
            const hasFishTail = /fish|swim|swimming|tail|mermaid|ocean/.test(lower) || secondaryTrait === 'fish';
            const hasCrown = /crown|royal|king|queen|princess|prince/.test(lower);
            const hasStars = /star|magic|magical|glow|glowing|crystal|rainbow/.test(lower);

            return {
                primaryShape,
                secondaryTrait,
                color: pickedColor.hex,
                accent: pickedColor.accent,
                isRainbow: !!pickedColor.isRainbow,
                hasWings,
                hasLegs,
                hasFishTail,
                hasCrown,
                hasStars
            };
        }

        function buildLabSVGMarkup(spec) {
            const c = spec.color || '#0EA5E9';
            const ac = spec.accent || '#BAE6FD';
            const uid = 'g_' + Math.random().toString(36).slice(2, 8);
            let parts = [];

            // Rich SVG Gradients & Glow Definitions
            if (spec.isRainbow) {
                parts.push(`<defs>
                    <linearGradient id="${uid}_body" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#F43F5E"/>
                        <stop offset="35%" stop-color="#F59E0B"/>
                        <stop offset="70%" stop-color="#10B981"/>
                        <stop offset="100%" stop-color="#3B82F6"/>
                    </linearGradient>
                    <radialGradient id="${uid}_aura" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stop-color="#FEF08A" stop-opacity="0.7"/>
                        <stop offset="100%" stop-color="#38BDF8" stop-opacity="0"/>
                    </radialGradient>
                </defs>`);
            } else {
                parts.push(`<defs>
                    <linearGradient id="${uid}_body" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="${ac}"/>
                        <stop offset="45%" stop-color="${c}"/>
                        <stop offset="100%" stop-color="#1E293B"/>
                    </linearGradient>
                    <radialGradient id="${uid}_aura" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stop-color="${ac}" stop-opacity="0.65"/>
                        <stop offset="100%" stop-color="${c}" stop-opacity="0"/>
                    </radialGradient>
                </defs>`);
            }

            const fillMain = `url(#${uid}_body)`;

            // Pedestal shadow & energy ring
            parts.push(`<ellipse cx="32" cy="57" rx="20" ry="4" fill="#0F172A" opacity="0.25"/>`);
            parts.push(`<circle cx="32" cy="33" r="28" fill="url(#${uid}_aura)"/>`);

            // Sparkles & Stars
            if (spec.hasStars || spec.secondaryTrait) {
                parts.push(`<polygon points="10,12 11.5,15.5 15,17 11.5,18.5 10,22 8.5,18.5 5,17 8.5,15.5" fill="#FACC15" stroke="#B45309" stroke-width="0.8"/>`);
                parts.push(`<polygon points="53,13 54.2,15.8 57,17 54.2,18.2 53,21 51.8,18.2 49,17 51.8,15.8" fill="#38BDF8" stroke="#0369A1" stroke-width="0.8"/>`);
                parts.push(`<circle cx="14" cy="48" r="1.8" fill="#FDE047"/>`);
                parts.push(`<circle cx="51" cy="46" r="2" fill="#A7F3D0"/>`);
            }

            // Wings (Detailed feathered/crystal wings)
            if (spec.hasWings) {
                parts.push(`<path d="M17 29 Q2 10 11 21 Q3 24 13 29 Q6 33 18 36 Z" fill="${ac}" stroke="#1E293B" stroke-width="1.8" stroke-linejoin="round"/>`);
                parts.push(`<path d="M15 28 Q7 19 13 25" stroke="#FFF" stroke-width="1.3" fill="none"/>`);
                parts.push(`<path d="M47 29 Q62 10 53 21 Q61 24 51 29 Q58 33 46 36 Z" fill="${ac}" stroke="#1E293B" stroke-width="1.8" stroke-linejoin="round"/>`);
                parts.push(`<path d="M49 28 Q57 19 51 25" stroke="#FFF" stroke-width="1.3" fill="none"/>`);
            }

            // Table Legs if hybrid table or hasLegs
            if (spec.hasLegs) {
                parts.push(`<rect x="14" y="38" width="5.5" height="18" rx="2" fill="#92400E" stroke="#1E293B" stroke-width="1.8"/>`);
                parts.push(`<rect x="15.5" y="39" width="1.8" height="15" fill="#D97706"/>`);
                parts.push(`<rect x="44.5" y="38" width="5.5" height="18" rx="2" fill="#92400E" stroke="#1E293B" stroke-width="1.8"/>`);
                parts.push(`<rect x="46" y="39" width="1.8" height="15" fill="#D97706"/>`);
            }

            // Primary Body Shape with layered highlights & textures
            if (spec.primaryShape === 'table') {
                if (spec.hasFishTail || spec.secondaryTrait === 'fish') {
                    parts.push(`<ellipse cx="29" cy="34" rx="20" ry="9.5" fill="${fillMain}" stroke="#1E293B" stroke-width="2.1"/>`);
                    parts.push(`<path d="M15 30 Q29 26 42 30" stroke="#FFF" stroke-width="1.6" fill="none" opacity="0.75"/>`);
                    parts.push(`<polygon points="47,34 59,23 56,34 59,45" fill="${ac}" stroke="#1E293B" stroke-width="1.9" stroke-linejoin="round"/>`);
                    parts.push(`<path d="M26 24 Q32 18 36 24" fill="${ac}" stroke="#1E293B" stroke-width="1.6"/>`);
                    parts.push(`<circle cx="17" cy="32" r="2.8" fill="#FFF" stroke="#1E293B" stroke-width="1"/><circle cx="16.5" cy="32" r="1.3" fill="#0F172A"/>`);
                } else {
                    parts.push(`<rect x="8" y="30" width="48" height="9" rx="3.5" fill="${fillMain}" stroke="#1E293B" stroke-width="2.1"/>`);
                    parts.push(`<rect x="11" y="31.5" width="42" height="2.8" rx="1.2" fill="#FFF" opacity="0.65"/>`);
                }
            } else if (spec.primaryShape === 'fish') {
                parts.push(`<ellipse cx="28" cy="33" rx="18" ry="12.5" fill="${fillMain}" stroke="#1E293B" stroke-width="2.1"/>`);
                parts.push(`<polygon points="44,33 59,21 55,33 59,45" fill="${ac}" stroke="#1E293B" stroke-width="2" stroke-linejoin="round"/>`);
                parts.push(`<polygon points="24,20 33,11 36,21" fill="${ac}" stroke="#1E293B" stroke-width="1.8" stroke-linejoin="round"/>`);
                parts.push(`<path d="M27 35 Q33 31 35 38 Q30 41 27 35 Z" fill="${ac}" stroke="#1E293B" stroke-width="1.4"/>`);
                parts.push(`<path d="M14 27 Q26 22 38 27" stroke="#FFF" stroke-width="1.8" fill="none" opacity="0.7"/>`);
                parts.push(`<circle cx="17" cy="30" r="3.4" fill="#FFF" stroke="#1E293B" stroke-width="1.2"/><circle cx="16.2" cy="30" r="1.6" fill="#0F172A"/><circle cx="15.6" cy="29.2" r="0.7" fill="#FFF"/>`);
            } else if (spec.primaryShape === 'cat') {
                parts.push(`<polygon points="16,25 20,10 29,20" fill="${fillMain}" stroke="#1E293B" stroke-width="2" stroke-linejoin="round"/>`);
                parts.push(`<polygon points="19,22 21,14 26,20" fill="#FDA4AF"/>`);
                parts.push(`<polygon points="48,25 44,10 35,20" fill="${fillMain}" stroke="#1E293B" stroke-width="2" stroke-linejoin="round"/>`);
                parts.push(`<polygon points="45,22 43,14 38,20" fill="#FDA4AF"/>`);
                parts.push(`<circle cx="32" cy="35" r="16.5" fill="${fillMain}" stroke="#1E293B" stroke-width="2.1"/>`);
                parts.push(`<ellipse cx="26" cy="24" rx="5" ry="2.2" transform="rotate(-20 26 24)" fill="#FFF" opacity="0.55"/>`);
                parts.push(`<ellipse cx="25.5" cy="33" rx="2.6" ry="3" fill="#0F172A"/><circle cx="24.8" cy="32" r="0.9" fill="#FFF"/>`);
                parts.push(`<ellipse cx="38.5" cy="33" rx="2.6" ry="3" fill="#0F172A"/><circle cx="37.8" cy="32" r="0.9" fill="#FFF"/>`);
                parts.push(`<ellipse cx="21" cy="37" rx="2.5" ry="1.4" fill="#FB7185" opacity="0.75"/>`);
                parts.push(`<ellipse cx="43" cy="37" rx="2.5" ry="1.4" fill="#FB7185" opacity="0.75"/>`);
                parts.push(`<polygon points="30,36.5 34,36.5 32,39.5" fill="#F43F5E"/>`);
                parts.push(`<path d="M28 40 Q30 42.5 32 39.5 Q34 42.5 36 40" stroke="#1E293B" stroke-width="1.5" fill="none"/>`);
                parts.push(`<line x1="12" y1="35" x2="18" y2="36" stroke="#1E293B" stroke-width="1.3"/><line x1="12" y1="39" x2="18" y2="38.5" stroke="#1E293B" stroke-width="1.3"/>`);
                parts.push(`<line x1="52" y1="35" x2="46" y2="36" stroke="#1E293B" stroke-width="1.3"/><line x1="52" y1="39" x2="46" y2="38.5" stroke="#1E293B" stroke-width="1.3"/>`);
            } else if (spec.primaryShape === 'rocket') {
                parts.push(`<polygon points="26,46 32,58 38,46" fill="#F97316" stroke="#DC2626" stroke-width="1.2"/>`);
                parts.push(`<polygon points="29,46 32,54 35,46" fill="#FEF08A"/>`);
                parts.push(`<path d="M32 9 Q45 23 42 46 L22 46 Q19 23 32 9 Z" fill="${fillMain}" stroke="#1E293B" stroke-width="2.1"/>`);
                parts.push(`<path d="M27 17 Q24 28 25 42" stroke="#FFF" stroke-width="2" fill="none" opacity="0.6"/>`);
                parts.push(`<polygon points="22,35 12,47 22,46" fill="${ac}" stroke="#1E293B" stroke-width="1.9" stroke-linejoin="round"/>`);
                parts.push(`<polygon points="42,35 52,47 42,46" fill="${ac}" stroke="#1E293B" stroke-width="1.9" stroke-linejoin="round"/>`);
                parts.push(`<circle cx="32" cy="28" r="6" fill="#E0F2FE" stroke="#1E293B" stroke-width="2"/><circle cx="30.5" cy="26.5" r="1.8" fill="#FFF"/>`);
            } else if (spec.primaryShape === 'lamp') {
                parts.push(`<rect x="22" y="47" width="20" height="7" rx="3" fill="#475569" stroke="#1E293B" stroke-width="2"/>`);
                parts.push(`<rect x="29.5" y="36" width="5" height="11" fill="#CBD5E1" stroke="#1E293B" stroke-width="1.6"/>`);
                parts.push(`<polygon points="16,36 48,36 41,15 23,15" fill="${fillMain}" stroke="#1E293B" stroke-width="2.1" stroke-linejoin="round"/>`);
                parts.push(`<line x1="25" y1="18" x2="21" y2="33" stroke="#FFF" stroke-width="2" opacity="0.65"/>`);
                parts.push(`<circle cx="32" cy="27" r="4.5" fill="#FEF08A" opacity="0.9"/>`);
            } else if (spec.primaryShape === 'dragon') {
                parts.push(`<ellipse cx="32" cy="37" rx="15" ry="13" fill="${fillMain}" stroke="#1E293B" stroke-width="2.1"/>`);
                parts.push(`<ellipse cx="32" cy="39" rx="9" ry="8" fill="#FEF08A" opacity="0.8"/>`);
                parts.push(`<circle cx="32" cy="21" r="10.5" fill="${fillMain}" stroke="#1E293B" stroke-width="2.1"/>`);
                parts.push(`<polygon points="24,13 21,5 29,11" fill="#FACC15" stroke="#1E293B" stroke-width="1.6" stroke-linejoin="round"/>`);
                parts.push(`<polygon points="40,13 43,5 35,11" fill="#FACC15" stroke="#1E293B" stroke-width="1.6" stroke-linejoin="round"/>`);
                parts.push(`<circle cx="28" cy="20" r="2.4" fill="#FFF"/><circle cx="28" cy="20" r="1.2" fill="#0F172A"/>`);
                parts.push(`<circle cx="36" cy="20" r="2.4" fill="#FFF"/><circle cx="36" cy="20" r="1.2" fill="#0F172A"/>`);
            } else if (spec.primaryShape === 'car') {
                parts.push(`<rect x="9" y="30" width="46" height="14" rx="5.5" fill="${fillMain}" stroke="#1E293B" stroke-width="2.1"/>`);
                parts.push(`<rect x="17" y="20" width="28" height="11" rx="4.5" fill="${ac}" stroke="#1E293B" stroke-width="1.9"/>`);
                parts.push(`<rect x="20" y="22" width="10" height="7" rx="2" fill="#E0F2FE"/>`);
                parts.push(`<rect x="32" y="22" width="10" height="7" rx="2" fill="#E0F2FE"/>`);
                parts.push(`<circle cx="12" cy="36" r="2.2" fill="#FEF08A"/>`);
                parts.push(`<circle cx="19" cy="46" r="6" fill="#0F172A" stroke="#CBD5E1" stroke-width="1.5"/><circle cx="19" cy="46" r="2.2" fill="#94A3B8"/>`);
                parts.push(`<circle cx="45" cy="46" r="6" fill="#0F172A" stroke="#CBD5E1" stroke-width="1.5"/><circle cx="45" cy="46" r="2.2" fill="#94A3B8"/>`);
            } else if (spec.primaryShape === 'castle') {
                parts.push(`<rect x="15" y="26" width="34" height="27" rx="2" fill="${fillMain}" stroke="#1E293B" stroke-width="2.1"/>`);
                parts.push(`<polygon points="13,26 21,12 29,26" fill="${ac}" stroke="#1E293B" stroke-width="1.9" stroke-linejoin="round"/>`);
                parts.push(`<polygon points="35,26 43,12 51,26" fill="${ac}" stroke="#1E293B" stroke-width="1.9" stroke-linejoin="round"/>`);
                parts.push(`<path d="M27 53 L27 42 A5 5 0 0 1 37 42 L37 53 Z" fill="#1E293B"/>`);
                parts.push(`<rect x="19" y="31" width="5" height="6" rx="1" fill="#FEF08A"/>`);
                parts.push(`<rect x="40" y="31" width="5" height="6" rx="1" fill="#FEF08A"/>`);
            } else {
                parts.push(`<polygon points="32,9 49,27 41,53 23,53 15,27" fill="${fillMain}" stroke="#1E293B" stroke-width="2.1" stroke-linejoin="round"/>`);
                parts.push(`<polygon points="32,14 42,27 32,47 22,27" fill="${ac}" opacity="0.8"/>`);
                parts.push(`<polygon points="32,14 37,27 32,34 27,27" fill="#FFF" opacity="0.75"/>`);
            }

            // Extra Fish tail overlay if secondary fish trait on non-table
            if (spec.hasFishTail && spec.primaryShape !== 'fish' && spec.primaryShape !== 'table') {
                parts.push(`<polygon points="45,36 59,26 56,36 59,46" fill="${ac}" stroke="#1E293B" stroke-width="1.8" stroke-linejoin="round"/>`);
            }

            // Crown overlay
            if (spec.hasCrown) {
                parts.push(`<polygon points="22,13 25,5 32,10 39,5 42,13" fill="#FACC15" stroke="#1E293B" stroke-width="1.6" stroke-linejoin="round"/>`);
                parts.push(`<circle cx="32" cy="10.5" r="1.3" fill="#EF4444"/>`);
            }

            return parts.join('');
        }

        function drawProceduralLabItemOnCanvas(c, spec) {
            if (!spec) return;
            c.save();
            c.strokeStyle = '#1E293B';
            c.lineWidth = 2;

            if (spec.hasStars) {
                c.fillStyle = spec.accent || '#BAE6FD';
                c.globalAlpha = 0.35;
                c.beginPath(); c.arc(0, -2, 22, 0, Math.PI * 2); c.fill();
                c.globalAlpha = 1;
            }
            if (spec.hasLegs) {
                c.fillStyle = '#78350F';
                c.fillRect(-16, 4, 5, 15);
                c.fillRect(11, 4, 5, 15);
            }
            c.fillStyle = spec.color || '#0EA5E9';
            if (spec.primaryShape === 'table' && (spec.hasFishTail || spec.secondaryTrait === 'fish')) {
                c.beginPath(); c.ellipse(-2, 0, 18, 8, 0, 0, Math.PI * 2); c.fill(); c.stroke();
                c.fillStyle = spec.accent || '#BAE6FD';
                c.beginPath(); c.moveTo(15, 0); c.lineTo(25, -8); c.lineTo(25, 8); c.closePath(); c.fill(); c.stroke();
            } else if (spec.primaryShape === 'table') {
                c.fillRect(-22, -4, 44, 8); c.strokeRect(-22, -4, 44, 8);
            } else if (spec.primaryShape === 'fish') {
                c.beginPath(); c.ellipse(-2, -2, 16, 10, 0, 0, Math.PI * 2); c.fill(); c.stroke();
                c.fillStyle = spec.accent || '#BAE6FD';
                c.beginPath(); c.moveTo(13, -2); c.lineTo(23, -10); c.lineTo(23, 6); c.closePath(); c.fill(); c.stroke();
            } else if (spec.primaryShape === 'cat') {
                c.beginPath(); c.arc(0, 0, 14, 0, Math.PI * 2); c.fill(); c.stroke();
                c.beginPath(); c.moveTo(-12, -8); c.lineTo(-8, -20); c.lineTo(-2, -12); c.fill(); c.stroke();
                c.beginPath(); c.moveTo(12, -8); c.lineTo(8, -20); c.lineTo(2, -12); c.fill(); c.stroke();
            } else if (spec.primaryShape === 'rocket') {
                c.beginPath(); c.moveTo(0, -22); c.lineTo(11, 12); c.lineTo(-11, 12); c.closePath(); c.fill(); c.stroke();
            } else {
                c.beginPath(); c.moveTo(0, -20); c.lineTo(15, -4); c.lineTo(9, 16); c.lineTo(-9, 16); c.lineTo(-15, -4); c.closePath(); c.fill(); c.stroke();
            }
            if (spec.hasCrown) {
                c.fillStyle = '#FACC15';
                c.beginPath(); c.moveTo(-8, -16); c.lineTo(-4, -24); c.lineTo(0, -18); c.lineTo(4, -24); c.lineTo(8, -16); c.closePath(); c.fill();
            }
            c.restore();
        }

        function switchInventionLabMode(mode) {
            currentLabMode = mode;
            AudioEngine.playClick();
            const promptBtn = document.getElementById('lab-tab-prompt-btn');
            const fusionBtn = document.getElementById('lab-tab-fusion-btn');
            const fusionPanel = document.getElementById('lab-fusion-panel');
            const promptPanel = document.getElementById('lab-prompt-panel');
            const fusionActionBar = document.getElementById('lab-fusion-action-bar');

            if (mode === 'fusion') {
                promptBtn.style.background = '#475569';
                fusionBtn.style.background = '#0D9488';
                fusionPanel.style.display = 'block';
                if (promptPanel) promptPanel.style.display = 'none';
                if (fusionActionBar) fusionActionBar.style.display = 'block';
                refreshLabFusionIngredientsUI();
            } else {
                promptBtn.style.background = '#0284C7';
                fusionBtn.style.background = '#475569';
                fusionPanel.style.display = 'none';
                if (promptPanel) promptPanel.style.display = 'block';
                if (fusionActionBar) fusionActionBar.style.display = 'none';
            }
        }

        function fillLabSamplePrompt(sample) {
            AudioEngine.playClick();
            const inp = document.getElementById('lab-english-prompt');
            if (inp) {
                inp.value = sample;
                inp.focus();
            }
        }

        function getAvailableFusionIngredients(user) {
            ensureMemberProps(user);
            const items = [];

            // Count items currently placed in private room slots or free-placed in roomDecor
            const placedCounts = {};
            if (user.roomSlots && typeof user.roomSlots === 'object') {
                Object.values(user.roomSlots).forEach(id => {
                    if (id) placedCounts[id] = (placedCounts[id] || 0) + 1;
                });
            }
            if (Array.isArray(user.roomDecor)) {
                user.roomDecor.forEach(d => {
                    if (d && d.id) placedCounts[d.id] = (placedCounts[d.id] || 0) + 1;
                });
            }

            // 1. Owned items from user.inventory (decor, fashion/outfit, tv_card)
            user.inventory.forEach((id, invIndex) => {
                const catItem = SHOP_CATALOG.find(i => i.id === id) || FASHION_CATALOG.find(f => f.id === id);
                if (!catItem) return;

                // Exclude currently equipped hat/accessory
                if (catItem.icon && user.outfit === catItem.icon) return;
                // Exclude currently worn fashion set
                if (
                    catItem.sub === 'set' &&
                    user.shirtColor === catItem.shirtColor &&
                    user.shirtPattern === catItem.shirtPattern &&
                    user.pantsColor === catItem.pantsColor &&
                    user.pantsStyle === catItem.pantsStyle
                ) return;

                // Exclude decor copies currently placed in room
                if (placedCounts[id] && placedCounts[id] > 0) {
                    placedCounts[id] -= 1;
                    return;
                }

                items.push({
                    uid: `inv:${invIndex}:${id}`,
                    source: 'inventory',
                    invIndex,
                    itemId: id,
                    rawName: catItem.name,
                    label: `${catItem.icon || '📦'} ${catItem.name}`
                });
            });

            // 2. Owned custom lab creations in user.customLabItems
            user.customLabItems.forEach((labItem, labIndex) => {
                if (!labItem || !labItem.id) return;
                if (placedCounts[labItem.id] && placedCounts[labItem.id] > 0) {
                    placedCounts[labItem.id] -= 1;
                    return;
                }
                items.push({
                    uid: `lab:${labIndex}:${labItem.id}`,
                    source: 'customLabItems',
                    labIndex,
                    itemId: labItem.id,
                    rawName: labItem.name.replace(/^🧪\s*/, ''),
                    label: `${labItem.name}`
                });
            });

            return items;
        }

        function consumeFusionIngredient(user, ingredientObj) {
            if (!ingredientObj) return false;
            if (ingredientObj.source === 'inventory') {
                // Verify invIndex first, fallback to indexOf
                if (user.inventory[ingredientObj.invIndex] === ingredientObj.itemId) {
                    user.inventory.splice(ingredientObj.invIndex, 1);
                    return true;
                }
                const idx = user.inventory.indexOf(ingredientObj.itemId);
                if (idx !== -1) {
                    user.inventory.splice(idx, 1);
                    return true;
                }
            } else if (ingredientObj.source === 'customLabItems') {
                const idx = user.customLabItems.findIndex(x => x && x.id === ingredientObj.itemId);
                if (idx !== -1) {
                    user.customLabItems.splice(idx, 1);
                    return true;
                }
            }
            return false;
        }

        function syncLabFusionDropdowns(changedSlot) {
            const selA = document.getElementById('lab-item-a');
            const selB = document.getElementById('lab-item-b');
            if (!selA || !selB || selA.options.length < 2) return;
            if (selA.value === selB.value) {
                const target = changedSlot === 'a' ? selB : selA;
                const otherVal = changedSlot === 'a' ? selA.value : selB.value;
                for (let i = 0; i < target.options.length; i++) {
                    if (target.options[i].value !== otherVal) {
                        target.selectedIndex = i;
                        break;
                    }
                }
            }
        }

        function refreshLabFusionIngredientsUI() {
            const user = getCurrentUser();
            const available = getAvailableFusionIngredients(user);
            const selA = document.getElementById('lab-item-a');
            const selB = document.getElementById('lab-item-b');
            const emptyMsg = document.getElementById('lab-fusion-empty-msg');
            const selectorsWrap = document.getElementById('lab-fusion-selectors');
            const fusionSubmitBtn = document.getElementById('lab-fusion-submit-btn');

            if (!selA || !selB) return;

            if (available.length < 2) {
                if (emptyMsg) emptyMsg.style.display = 'block';
                if (selectorsWrap) selectorsWrap.style.display = 'none';
                if (fusionSubmitBtn) {
                    fusionSubmitBtn.disabled = true;
                    fusionSubmitBtn.style.opacity = '0.5';
                }
                selA.innerHTML = '';
                selB.innerHTML = '';
                return;
            }

            if (emptyMsg) emptyMsg.style.display = 'none';
            if (selectorsWrap) selectorsWrap.style.display = 'grid';
            if (fusionSubmitBtn) {
                fusionSubmitBtn.disabled = false;
                fusionSubmitBtn.style.opacity = '1';
            }

            const optsHtml = available.map(it => `<option value="${it.uid}">${it.label}</option>`).join('');
            selA.innerHTML = optsHtml;
            selB.innerHTML = optsHtml;
            selA.selectedIndex = 0;
            selB.selectedIndex = 1;
        }

        function openInventionLabModal() {
            const user = getCurrentUser();
            ensureMemberProps(user);
            refreshLabFusionIngredientsUI();
            renderLabRecentList();
        }

        function buildAutoFusionTitleAndPrompt(foundA, foundB) {
            const nameA = (foundA.rawName || 'Item A').trim();
            const nameB = (foundB.rawName || 'Item B').trim();
            const shortA = nameA.split(/\s+/).slice(0, 2).join(' ');
            const shortB = nameB.split(/\s+/).slice(0, 2).join(' ');
            const autoTitle = `${shortA} × ${shortB}`;
            const autoEnglishHint = `magical glowing ${foundA.itemId} ${foundB.itemId} ${nameA} ${nameB}`;
            return { autoTitle, autoEnglishHint };
        }

        function runInventionLabSynthesis() {
            const user = getCurrentUser();
            ensureMemberProps(user);
            const cost = currentLabMode === 'fusion' ? 15 : 10;
            if (user.points < cost) {
                AudioEngine.playError();
                return showToast(`❌ Bạn cần ${cost}⭐ để vận hành máy thí nghiệm!`);
            }

            let foundA = null, foundB = null, itemAId = null, itemBId = null, fusionLabel = '';
            let cleanTitle = '';
            let promptForSpec = '';
            let displayPromptText = '';

            if (currentLabMode === 'fusion') {
                const available = getAvailableFusionIngredients(user);
                if (available.length < 2) {
                    AudioEngine.playError();
                    return showToast('🎒 Bạn cần có ít nhất 2 vật phẩm khả dụng trong túi đồ để hợp nhất!');
                }
                const uidA = document.getElementById('lab-item-a').value;
                const uidB = document.getElementById('lab-item-b').value;
                if (!uidA || !uidB || uidA === uidB) {
                    AudioEngine.playError();
                    return showToast('⚠️ Vui lòng chọn 2 vật phẩm nguyên liệu khác nhau trong túi đồ!');
                }
                foundA = available.find(x => x.uid === uidA);
                foundB = available.find(x => x.uid === uidB);
                if (!foundA || !foundB) {
                    refreshLabFusionIngredientsUI();
                    AudioEngine.playError();
                    return showToast('⚠️ Nguyên liệu không còn khả dụng trong túi đồ, vui lòng chọn lại!');
                }

                // Consume both ingredients (consume higher inventory index first so splicing does not shift the lower index!)
                const toConsume = [foundA, foundB].sort((x, y) => (y.invIndex ?? -1) - (x.invIndex ?? -1));
                const ok1 = consumeFusionIngredient(user, toConsume[0]);
                const ok2 = consumeFusionIngredient(user, toConsume[1]);
                if (!ok1 || !ok2) {
                    refreshLabFusionIngredientsUI();
                    AudioEngine.playError();
                    return showToast('⚠️ Không thể tiêu hao nguyên liệu trong túi đồ, vui lòng thử lại!');
                }

                itemAId = foundA.itemId;
                itemBId = foundB.itemId;
                fusionLabel = `Hợp nhất từ [${foundA.label}] + [${foundB.label}]`;
                const autoMeta = buildAutoFusionTitleAndPrompt(foundA, foundB);
                cleanTitle = autoMeta.autoTitle;
                promptForSpec = autoMeta.autoEnglishHint;
                displayPromptText = `${foundA.rawName} + ${foundB.rawName}`;
            } else {
                const promptInput = document.getElementById('lab-english-prompt');
                const rawPrompt = promptInput ? promptInput.value.trim() : '';
                const check = isValidEnglishLabPrompt(rawPrompt);
                if (!check.ok) {
                    AudioEngine.playError();
                    return showToast(check.reason);
                }
                cleanTitle = rawPrompt
                    .replace(/^(a|an|the)\s+/i, '')
                    .split(/\s+/)
                    .slice(0, 4)
                    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                    .join(' ');
                promptForSpec = rawPrompt;
                displayPromptText = rawPrompt;
                if (promptInput) promptInput.value = '';
            }

            user.points -= cost;
            const spec = parsePromptToLabSpec(promptForSpec, itemAId, itemBId);
            if (currentLabMode === 'fusion') {
                spec.hasStars = true;
            }
            const svgMarkup = buildLabSVGMarkup(spec);

            const newItem = {
                id: 'lab_' + Date.now() + '_' + Math.floor(Math.random() * 999),
                category: 'decor',
                isLabItem: true,
                name: `🧪 ${cleanTitle}`,
                icon: '🧪',
                prompt: displayPromptText,
                desc: fusionLabel || `Vật phẩm sáng tạo từ dòng lệnh: "${displayPromptText}"`,
                labSpec: spec,
                svgMarkup
            };

            user.customLabItems.unshift(newItem);

            if (currentLabMode === 'fusion') {
                refreshLabFusionIngredientsUI();
            }

            AudioEngine.playSuccess();
            triggerSpeechBubble(user, `Chế tạo thành công: ${cleanTitle}! 🧪✨`, true);
            showToast(
                currentLabMode === 'fusion'
                    ? `🧬 Hợp nhất thành công "${cleanTitle}" (-${cost}⭐, đã tiêu hao 2 nguyên liệu) và cất vào 🎒 Túi đồ!`
                    : `🎉 Chế tạo thành công "${cleanTitle}" (-${cost}⭐) và đã cất vào 🎒 Túi đồ!`
            );
            updateHUD();
            saveGame();
            if (document.getElementById('bag-modal').style.display === 'flex') {
                renderBagModal('lab');
            }
            renderLabRecentList(newItem);
        }

        function renderLabRecentList(highlightedItem = null) {
            const user = getCurrentUser();
            ensureMemberProps(user);
            const area = document.getElementById('lab-result-area');
            if (!area) return;

            let html = '';
            if (highlightedItem) {
                html += `
                    <div style="background:linear-gradient(135deg,#042F2E 0%,#064E3B 50%,#0C4A6E 100%); border:3px solid #34D399; box-shadow:0 0 24px rgba(52,211,153,0.45), inset 0 0 18px rgba(56,189,248,0.2); border-radius:16px; padding:16px; margin-bottom:14px; display:flex; gap:16px; align-items:center; flex-wrap:wrap;">
                        <div style="background:radial-gradient(circle at 30% 30%, #FFFFFF 0%, #E0F2FE 65%, #BAE6FD 100%); border-radius:16px; padding:10px; border:3px solid #FACC15; box-shadow:0 6px 16px rgba(0,0,0,0.45), 0 0 14px rgba(250,204,21,0.55); flex-shrink:0; display:flex; align-items:center; justify-content:center; width:126px; height:126px;">
                            ${renderItemIllustrationSVG(highlightedItem.id, 102)}
                        </div>
                        <div style="flex:1; min-width:200px;">
                            <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
                                <span class="tag" style="background:linear-gradient(90deg,#10B981,#059669); color:#FFF; border-color:#FACC15; font-size:11.5px; padding:3px 9px;">✨ VẬT PHẨM MỚI RA LÒ!</span>
                                <span class="tag" style="background:#0F172A; color:#FACC15; border-color:#FACC15; font-size:11px;">⭐ ĐỘC BẢN AI LAB</span>
                            </div>
                            <div style="font-size:18px; font-weight:700; color:#FFF; margin-top:6px; text-shadow:0 2px 4px rgba(0,0,0,0.4);">${highlightedItem.name}</div>
                            <div style="font-size:12.5px; color:#6EE7B7; font-weight:600; margin-top:3px;">🔬 ${highlightedItem.desc}</div>
                            <div style="font-size:12px; color:#E0F2FE; margin-top:6px; background:rgba(15,23,42,0.55); padding:6px 9px; border-radius:8px; border:1px solid rgba(125,211,252,0.35);">
                                📦 Đã lưu vào <b>🎒 Túi đồ (Vật phẩm chế tạo)</b> — Bạn có thể vào <b>Phòng riêng</b> để trưng bày ngay!
                            </div>
                        </div>
                    </div>
                `;
            }

            const list = user.customLabItems || [];
            if (list.length > 0) {
                html += `<div style="font-size:13px; font-weight:700; color:#7DD3FC; margin-bottom:8px;">📚 Bộ sưu tập sáng chế của ${user.name} (${list.length} vật phẩm):</div>`;
                html += `<div class="grid-2">`;
                list.slice(0, 6).forEach(item => {
                    html += `
                        <div style="background:linear-gradient(145deg,#0F172A,#1E293B); border:2px solid #38BDF8; border-radius:12px; padding:10px; display:flex; gap:12px; align-items:center; box-shadow:0 4px 10px rgba(0,0,0,0.25);">
                            <div style="background:radial-gradient(circle, #FFFFFF 0%, #E0F2FE 100%); border-radius:11px; padding:5px; border:2px solid #7DD3FC; flex-shrink:0; width:68px; height:68px; display:flex; align-items:center; justify-content:center;">
                                ${renderItemIllustrationSVG(item.id, 56)}
                            </div>
                            <div style="min-width:0; flex:1;">
                                <div style="font-weight:700; font-size:13.5px; color:#F8FAFC; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.name}</div>
                                <div style="font-size:11.5px; color:#38BDF8; font-style:italic; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:2px;">"${item.prompt}"</div>
                            </div>
                        </div>
                    `;
                });
                html += `</div>`;
            }
            area.innerHTML = html;
        }
