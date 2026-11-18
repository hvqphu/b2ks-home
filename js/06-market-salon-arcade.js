/* =========================================================================
           11. SIÊU THỊ, THỜI TRANG, TRUNG TÂM XUYÊN THẾ GIỚI, CHỢ TRỜI, SALON & ARCADE
           ========================================================================= */
        const SUPERMARKET_ITEMS = [
            { id: 'food_apple', name: 'Táo Đỏ Tươi Ngon', icon: '🍎', price: 5, desc: 'Trái cây giòn ngọt giàu vitamin' },
            { id: 'food_milk', name: 'Sữa Tươi Tiết Trùng', icon: '🥛', price: 6, desc: 'Giúp cao lớn và khỏe mạnh' },
            { id: 'food_cake', name: 'Bánh Kem Dâu Tây', icon: '🍰', price: 12, desc: 'Món tráng miệng ngọt ngào cho cả nhà' },
            { id: 'toy_teddy', name: 'Gấu Bông Khổng Lồ', icon: '🧸', price: 20, desc: 'Mềm mại ấm áp khi đi ngủ' },
            { id: 'toy_rocket', name: 'Mô Hình Tên Lửa', icon: '🚀', price: 25, desc: 'Khám phá vũ trụ bao la' },
            { id: 'pet_puppy', name: 'Cún Con Đáng Yêu', icon: '🐶', price: 45, desc: 'Thú cưng trung thành luôn vẫy đuôi' }
        ];

        const FASHION_OUTFITS = [
            { emoji: '🦸‍♂️', name: 'Siêu Anh Hùng', price: 25 },
            { emoji: '👸', name: 'Công Chúa Hoàng Gia', price: 25 },
            { emoji: '🦄', name: 'Kỳ Lân Cầu Vồng', price: 30 },
            { emoji: '🦖', name: 'Khủng Long Bạo Chúa', price: 30 },
            { emoji: '👨‍🚀', name: 'Phi Hành Gia Vũ Trụ', price: 35 },
            { emoji: '🥷', name: 'Ninja Bí Ẩn', price: 35 },
            { emoji: '🧜‍♀️', name: 'Nàng Tiên Cá', price: 35 },
            { emoji: '🤖', name: 'Robot Tương Lai', price: 40 }
        ];

        function openMarketModal(type) {
            AudioEngine.playClick();
            const me = getCurrentUser();
            const titleEl = document.getElementById('market-title');
            const gridEl = document.getElementById('market-items');

            if (type === 'supermarket') {
                titleEl.innerText = `🛒 Siêu Thị Gia Đình (Số dư: ${me.points}⭐)`;
                gridEl.innerHTML = SUPERMARKET_ITEMS.map((item, idx) => `
                    <div class="card-item">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <span style="font-size:32px;">${item.icon}</span>
                            <div>
                                <b>${item.name}</b>
                                <div style="font-size:12px; color:#555;">${item.desc}</div>
                            </div>
                        </div>
                        <button class="btn btn-sm btn-primary" onclick="buySupermarketItem(${idx})">Mua (${item.price}⭐)</button>
                    </div>
                `).join('');
            } else {
                titleEl.innerText = `👗 Cửa Hàng Thời Trang (Số dư: ${me.points}⭐)`;
                gridEl.innerHTML = FASHION_OUTFITS.map((o, idx) => {
                    const owned = (me.ownedOutfits || []).includes(o.emoji);
                    return `
                        <div class="card-item ${owned ? 'equipped' : ''}">
                            <div style="display:flex; align-items:center; gap:10px;">
                                <span style="font-size:34px;">${o.emoji}</span>
                                <div>
                                    <b>${o.name}</b>
                                    <div style="font-size:12px; color:#555;">${owned ? 'Đã có trong tủ đồ' : `Giá: ${o.price}⭐`}</div>
                                </div>
                            </div>
                            <button class="btn btn-sm ${owned ? 'btn-accent' : 'btn-purple'}" onclick="buyFashionOutfit(${idx})">
                                ${owned ? '✅ Đã sở hữu' : `Mua (${o.price}⭐)`}
                            </button>
                        </div>
                    `;
                }).join('');
            }
            document.getElementById('market-modal').style.display = 'flex';
        }

        function buySupermarketItem(idx) {
            const item = SUPERMARKET_ITEMS[idx];
            const me = getCurrentUser();
            if (!item) return;
            if (me.points < item.price) {
                AudioEngine.playError();
                return showToast(`❌ Bạn cần ${item.price}⭐ để mua ${item.name}!`);
            }
            me.points -= item.price;
            me.inventory.push({
                id: item.id + '_' + Date.now(),
                name: item.name,
                icon: item.icon,
                desc: item.desc
            });
            AudioEngine.playCoin();
            showToast(`🛍️ Đã mua ${item.name} (-${item.price}⭐)!`);
            logFamilyActivity(me, 'shop', `Mua ${item.name} tại Siêu thị (-${item.price}⭐)`, -item.price);
            lastHudSignature = '';
            updateHUD();
            openMarketModal('supermarket');
            saveGame();
        }

        function buyFashionOutfit(idx) {
            const o = FASHION_OUTFITS[idx];
            const me = getCurrentUser();
            if (!o) return;
            if ((me.ownedOutfits || []).includes(o.emoji)) {
                equipOutfit(o.emoji);
                return;
            }
            if (me.points < o.price) {
                AudioEngine.playError();
                return showToast(`❌ Bạn cần ${o.price}⭐ để mua trang phục này!`);
            }
            me.points -= o.price;
            me.ownedOutfits.push(o.emoji);
            me.outfit = o.emoji;
            AudioEngine.playCoin();
            showToast(`👗 Đã mua và mặc ${o.name} (-${o.price}⭐)!`);
            logFamilyActivity(me, 'shop', `Mua trang phục ${o.name} (-${o.price}⭐)`, -o.price);
            lastHudSignature = '';
            updateHUD();
            openMarketModal('fashion');
            saveGame();
        }

        /* =========================================================================
           11B. TRUNG TÂM GIAO DỊCH XUYÊN THẾ GIỚI (ĐỔI QUÀ THỰC TẾ)
           ========================================================================= */
        function openInterworldModal() {
            AudioEngine.playClick();
            renderInterworldModal();
            document.getElementById('interworld-modal').style.display = 'flex';
        }

        function renderInterworldModal() {
            const body = document.getElementById('interworld-body');
            if (!body) return;
            const me = getCurrentUser();
            if (!Array.isArray(state.interworldCatalog)) {
                state.interworldCatalog = JSON.parse(JSON.stringify(DEFAULT_INTERWORLD_CATALOG));
            }
            if (!Array.isArray(state.interworldRedemptions)) {
                state.interworldRedemptions = [];
            }

            const myPending = state.interworldRedemptions.filter(r => r.memberId === me.id && r.status === 'pending');

            let adminSection = '';
            if (isParent(me)) {
                adminSection = `
                    <div style="background:#FFF9DB; border:2.5px solid #F39C12; border-radius:14px; padding:12px; margin-bottom:14px;">
                        <div style="font-weight:700; font-size:14px; color:#7E5109; margin-bottom:8px;">👑 Khu Vực Quản Lý Của Bố/Mẹ (Thêm Phần Thưởng Thực Tế Mới)</div>
                        <div style="display:grid; grid-template-columns:60px 1fr 90px 80px; gap:6px; margin-bottom:8px;">
                            <input type="text" id="iw-new-icon" value="🎁" style="padding:7px; border:2px solid #2C3E50; border-radius:8px; text-align:center;" placeholder="Icon">
                            <input type="text" id="iw-new-name" style="padding:7px; border:2px solid #2C3E50; border-radius:8px;" placeholder="Tên phần thưởng thực tế (VD: Tiền mặt 20.000đ)...">
                            <input type="number" id="iw-new-cost" value="100" min="10" style="padding:7px; border:2px solid #2C3E50; border-radius:8px;" title="Giá Xu">
                            <input type="number" id="iw-new-stock" value="5" min="1" style="padding:7px; border:2px solid #2C3E50; border-radius:8px;" title="Số lượng">
                        </div>
                        <div style="display:flex; gap:6px;">
                            <input type="text" id="iw-new-desc" style="flex:1; padding:7px; border:2px solid #2C3E50; border-radius:8px;" placeholder="Mô tả phần thưởng ngoài đời thực...">
                            <button class="btn btn-sm btn-primary" onclick="addInterworldRewardItem()">➕ Thêm Quà</button>
                        </div>
                    </div>
                `;
            }

            body.innerHTML = `
                <div class="cosmic-banner">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                        <div>
                            <div style="font-size:15px; font-weight:700; color:#F1C40F;">✨ Cổng Kết Nối Giữa Thế Giới Ảo & Đời Thực</div>
                            <div style="font-size:12.5px; color:#D5DBDB; margin-top:2px;">Dùng số sao ⭐ bạn tích lũy được để quy đổi thành phần thưởng thực tế ngoài đời từ Bố Mẹ!</div>
                        </div>
                        <div style="background:#F1C40F; color:#1A1A2E; font-weight:700; padding:6px 12px; border-radius:999px; font-size:14px;">
                            Số dư: ${me.points}⭐
                        </div>
                    </div>
                </div>

                ${adminSection}

                <div class="grid-2" style="margin-bottom:14px;">
                    ${state.interworldCatalog.map((item, idx) => `
                        <div class="cosmic-card">
                            <div>
                                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
                                    <span style="font-size:36px;">${item.icon || '🎁'}</span>
                                    <span class="tag" style="background:#F1C40F; color:#1A1A2E;">Còn lại: ${item.stock}</span>
                                </div>
                                <div style="font-size:15px; font-weight:700; color:#F1C40F; margin-top:6px;">${escapeHtml(item.name)}</div>
                                <div style="font-size:12px; color:#BDC3C7; margin-top:3px;">${escapeHtml(item.desc || '')}</div>
                            </div>
                            <div style="display:flex; gap:6px; margin-top:6px;">
                                <button class="btn btn-sm btn-accent" style="flex:1;" ${item.stock <= 0 ? 'disabled' : ''} onclick="redeemInterworldItem('${item.id}')">
                                    ${item.stock <= 0 ? 'Hết lượt đổi' : `🌌 Đổi ngay (${item.cost}⭐)`}
                                </button>
                                ${isParent(me) ? `<button class="btn btn-sm btn-danger" onclick="deleteInterworldRewardItem(${idx})" title="Xóa quà này">🗑️</button>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div style="background:#F8F9FA; border:2px solid #2C3E50; border-radius:12px; padding:10px;">
                    <div style="font-weight:700; font-size:13.5px; margin-bottom:6px;">📜 Lịch sử quy đổi xuyên thế giới của gia đình:</div>
                    ${state.interworldRedemptions.length === 0 ? '<p style="font-size:12.5px; color:#666; margin:0;">Chưa có giao dịch quy đổi nào.</p>' : `
                        <div style="display:flex; flex-direction:column; gap:6px; max-height:170px; overflow-y:auto;">
                            ${state.interworldRedemptions.slice().reverse().map(r => `
                                <div style="display:flex; justify-content:space-between; align-items:center; background:#FFF; border:1.5px solid #BDC3C7; border-radius:8px; padding:6px 10px; font-size:12.5px;">
                                    <span><b>${escapeHtml(r.memberName)}</b> đổi <b>${r.icon} ${escapeHtml(r.itemName)}</b> (-${r.cost}⭐)</span>
                                    <span>
                                        ${r.status === 'pending'
                                            ? (isParent(me)
                                                ? `<button class="btn btn-sm btn-primary" onclick="approveInterworldRedemption('${r.id}')">✅ Duyệt trao quà</button>`
                                                : `<span class="tag" style="background:#FFF3CD; color:#856404;">⏳ Chờ Bố/Mẹ trao</span>`)
                                            : `<span class="tag" style="background:#D4EDDA; color:#155724;">✔️ Đã nhận quà</span>`
                                        }
                                    </span>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
            `;
        }

        function addInterworldRewardItem() {
            const me = getCurrentUser();
            if (!isParent(me)) return;
            const icon = document.getElementById('iw-new-icon').value.trim() || '🎁';
            const name = document.getElementById('iw-new-name').value.trim();
            const cost = parseInt(document.getElementById('iw-new-cost').value) || 50;
            const stock = parseInt(document.getElementById('iw-new-stock').value) || 3;
            const desc = document.getElementById('iw-new-desc').value.trim() || 'Phần thưởng đặc biệt ngoài đời thực từ Bố Mẹ!';
            if (!name) return showToast('⚠️ Nhập tên phần thưởng thực tế!');

            state.interworldCatalog.push({
                id: 'iw_' + Date.now(),
                name, icon, cost, stock, desc
            });
            AudioEngine.playSuccess();
            showToast('🌌 Đã thêm phần thưởng vào Trung tâm Xuyên Thế Giới!');
            saveGame();
            renderInterworldModal();
        }

        function deleteInterworldRewardItem(idx) {
            const me = getCurrentUser();
            if (!isParent(me)) return;
            state.interworldCatalog.splice(idx, 1);
            AudioEngine.playClick();
            saveGame();
            renderInterworldModal();
        }

        function redeemInterworldItem(itemId) {
            const me = getCurrentUser();
            const item = (state.interworldCatalog || []).find(x => x.id === itemId);
            if (!item || item.stock <= 0) return;

            if (me.points < item.cost) {
                AudioEngine.playError();
                return showToast(`❌ Bạn cần ${item.cost}⭐ để đổi "${item.name}"!`);
            }

            me.points -= item.cost;
            item.stock -= 1;

            const redemption = {
                id: 'red_' + Date.now(),
                memberId: me.id,
                memberName: me.name,
                itemId: item.id,
                itemName: item.name,
                icon: item.icon,
                cost: item.cost,
                status: 'pending',
                ts: Date.now()
            };
            state.interworldRedemptions.push(redemption);
            logFamilyActivity(me, 'interworld_redeem', `Đổi quà thực tế "${item.name}" (-${item.cost}⭐)`, -item.cost);

            // Gửi tin nhắn thông báo tự động vào Nhóm Gia Đình trên Smartphone
            if (Array.isArray(state.familyMessages)) {
                state.familyMessages.push({
                    id: 'msg_iw_' + Date.now(),
                    senderId: me.id,
                    senderName: me.name,
                    recipientId: 'family_group',
                    text: `🌌 Con vừa đổi thành công "${item.icon} ${item.name}" (${item.cost}⭐) tại Trung Tâm Giao Dịch Xuyên Thế Giới! Bố Mẹ duyệt giúp con nhé!`,
                    ts: Date.now(),
                    readBy: [me.id]
                });
            }

            AudioEngine.playCoin();
            showToast(`🌌 Đã gửi yêu cầu đổi "${item.name}" tới Bố/Mẹ!`);
            triggerSpeechBubble(me, `Con vừa đổi ${item.icon} ${item.name}!`, true);
            lastHudSignature = '';
            updateHUD();
            saveGame();
            renderInterworldModal();
        }

        function approveInterworldRedemption(redemptionId) {
            const me = getCurrentUser();
            if (!isParent(me)) return;
            const r = (state.interworldRedemptions || []).find(x => x.id === redemptionId);
            if (!r || r.status === 'approved') return;

            r.status = 'approved';
            r.approvedBy = me.name;
            r.approvedAt = Date.now();
            AudioEngine.playSuccess();
            showToast(`✅ Đã xác nhận trao "${r.itemName}" cho ${r.memberName}!`);
            triggerSpeechBubble(me, `Đã duyệt trao quà thực tế "${r.itemName}" cho ${r.memberName}!`, true);

            lastHudSignature = '';
            updateHUD();
            saveGame();
            if (document.getElementById('interworld-modal').style.display === 'flex') renderInterworldModal();
            if (document.getElementById('parental-modal').style.display === 'flex') renderParentalDashboard();
        }

        /* =========================================================================
           11C. CHỢ TRỜI GIA ĐÌNH (FLEA MARKET - MUA BÁN GIỮA CÁC THÀNH VIÊN)
           ========================================================================= */
        function openFleaMarketModal() {
            AudioEngine.playClick();
            renderFleaMarketModal();
            document.getElementById('flea-market-modal').style.display = 'flex';
        }

        function renderFleaMarketModal() {
            const body = document.getElementById('flea-market-body');
            if (!body) return;
            const me = getCurrentUser();
            if (!Array.isArray(state.fleaMarketListings)) state.fleaMarketListings = [];

            const myInv = me.inventory || [];

            body.innerHTML = `
                <div style="background:#FEF5E7; border:2.5px solid #D35400; border-radius:14px; padding:12px; margin-bottom:12px;">
                    <div style="font-weight:700; font-size:14px; color:#A04000; margin-bottom:6px;">🏷️ Đăng bán vật phẩm từ Túi Đồ của ${me.name} (Số dư: ${me.points}⭐)</div>
                    ${myInv.length === 0 ? '<div style="font-size:12.5px; color:#666;">Túi đồ của bạn chưa có món nào để đăng bán. Hãy chế tạo ở Bàn Thí Nghiệm hoặc mua tại Siêu Thị!</div>' : `
                        <div style="display:flex; gap:6px; flex-wrap:wrap;">
                            <select id="flea-sell-idx" style="flex:1; min-width:180px; padding:7px; border:2px solid #2C3E50; border-radius:8px;">
                                ${myInv.map((it, idx) => `<option value="${idx}">${it.icon || '🎁'} ${escapeHtml(it.name)}</option>`).join('')}
                            </select>
                            <input type="number" id="flea-sell-price" value="10" min="1" max="500" style="width:90px; padding:7px; border:2px solid #2C3E50; border-radius:8px;" title="Giá bán (⭐)">
                            <button class="btn btn-sm btn-primary" onclick="listFleaMarketItem()">📢 Đăng Bán</button>
                        </div>
                    `}
                </div>

                <div style="font-weight:700; font-size:14px; margin-bottom:8px;">🛍️ Gian Hàng Đang Mở Bán (${state.fleaMarketListings.length} món):</div>
                ${state.fleaMarketListings.length === 0 ? '<p style="text-align:center; color:#666; font-size:13px;">Chợ trời hiện chưa có gian hàng nào. Hãy là người đầu tiên mở sạp nhé!</p>' : `
                    <div class="grid-2">
                        ${state.fleaMarketListings.map(listing => {
                            const isMine = listing.sellerId === me.id;
                            return `
                                <div class="card-item">
                                    <div>
                                        <div style="display:flex; justify-content:space-between; align-items:center;">
                                            <span style="font-size:32px;">${listing.item.icon || '🎁'}</span>
                                            <span class="tag" style="background:#FADBD8; color:#922B21;">Người bán: ${escapeHtml(listing.sellerName)}</span>
                                        </div>
                                        <b style="font-size:14px; display:block; margin-top:4px;">${escapeHtml(listing.item.name)}</b>
                                        <div style="font-size:11.5px; color:#555;">${escapeHtml(listing.item.desc || '')}</div>
                                    </div>
                                    <div>
                                        ${isMine
                                            ? `<button class="btn btn-sm btn-danger" style="width:100%;" onclick="cancelFleaMarketListing('${listing.id}')">↩️ Thu hồi về túi</button>`
                                            : `<button class="btn btn-sm btn-primary" style="width:100%;" onclick="buyFleaMarketListing('${listing.id}')">💰 Mua ngay (${listing.price}⭐)</button>`
                                        }
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `}
            `;
        }

        function listFleaMarketItem() {
            const me = getCurrentUser();
            const idx = parseInt(document.getElementById('flea-sell-idx').value);
            const price = Math.max(1, parseInt(document.getElementById('flea-sell-price').value) || 5);
            if (isNaN(idx) || !me.inventory[idx]) return;

            const [item] = me.inventory.splice(idx, 1);
            state.fleaMarketListings.push({
                id: 'flea_' + Date.now(),
                sellerId: me.id,
                sellerName: me.name,
                price,
                item,
                listedAt: Date.now()
            });
            AudioEngine.playSuccess();
            showToast(`📢 Đã đăng bán "${item.name}" với giá ${price}⭐!`);
            triggerSpeechBubble(me, `Mình vừa bày bán ${item.icon} ${item.name} (${price}⭐) ở Chợ Trời!`, true);
            saveGame();
            renderFleaMarketModal();
        }

        function cancelFleaMarketListing(listingId) {
            const me = getCurrentUser();
            const idx = (state.fleaMarketListings || []).findIndex(x => x.id === listingId);
            if (idx === -1) return;
            const listing = state.fleaMarketListings[idx];
            if (listing.sellerId !== me.id) return;

            state.fleaMarketListings.splice(idx, 1);
            me.inventory.push(listing.item);
            AudioEngine.playClick();
            showToast(`↩️ Đã thu hồi "${listing.item.name}" về túi đồ!`);
            saveGame();
            renderFleaMarketModal();
        }

        function buyFleaMarketListing(listingId) {
            const me = getCurrentUser();
            const idx = (state.fleaMarketListings || []).findIndex(x => x.id === listingId);
            if (idx === -1) return;
            const listing = state.fleaMarketListings[idx];
            if (listing.sellerId === me.id) return;

            if (me.points < listing.price) {
                AudioEngine.playError();
                return showToast(`❌ Bạn cần ${listing.price}⭐ để mua món này!`);
            }

            me.points -= listing.price;
            const seller = state.members.find(m => m.id === listing.sellerId);
            if (seller) {
                seller.points += listing.price;
            }
            state.fleaMarketListings.splice(idx, 1);
            me.inventory.push(listing.item);

            AudioEngine.playCoin();
            showToast(`🎉 Đã mua "${listing.item.name}" từ ${listing.sellerName} (-${listing.price}⭐)!`);
            triggerSpeechBubble(me, `Vừa săn được ${listing.item.icon} ${listing.item.name} ở Chợ Trời!`, true);
            logFamilyActivity(me, 'flea_buy', `Mua "${listing.item.name}" của ${listing.sellerName} (-${listing.price}⭐)`, -listing.price);
            lastHudSignature = '';
            updateHUD();
            saveGame();
            renderFleaMarketModal();
        }

        /* =========================================================================
           11D. TIỆM TÓC, KHU VUI CHƠI ARCADE & TRANG TRÍ PHÒNG RIÊNG
           ========================================================================= */
        const HAIR_COLORS = [
            { name: 'Đen Tuyền', hex: '#1E272E' },
            { name: 'Nâu Hạt Dẻ', hex: '#5D4037' },
            { name: 'Vàng Nắng', hex: '#F1C40F' },
            { name: 'Đỏ Rực Rỡ', hex: '#E74C3C' },
            { name: 'Xanh Đại Dương', hex: '#2980B9' },
            { name: 'Tím Mộng Mơ', hex: '#8E44AD' }
        ];

        function openSalonModal() {
            AudioEngine.playClick();
            const me = getCurrentUser();
            document.getElementById('hair-color-grid').innerHTML = HAIR_COLORS.map(c => `
                <button class="btn" style="background:${c.hex}; color:#FFF; flex-direction:column; padding:12px;" onclick="changeHairColor('${c.hex}', '${c.name}')">
                    <span style="font-size:20px;">💇</span>
                    <span style="font-size:12px;">${c.name}</span>
                </button>
            `).join('');
            document.getElementById('salon-modal').style.display = 'flex';
        }

        function changeHairColor(hex, name) {
            const me = getCurrentUser();
            me.hairColor = hex;
            AudioEngine.playSuccess();
            showToast(`💇 Đã đổi sang màu tóc ${name}!`);
            triggerSpeechBubble(me, `Màu tóc ${name} mới đẹp không cả nhà? ✨`, true);
            closeModal('salon-modal');
            saveGame();
        }

        function openArcadeModal() {
            AudioEngine.playClick();
            const me = getCurrentUser();
            document.getElementById('arcade-body').innerHTML = `
                <div style="text-align:center; padding:8px;">
                    <div style="font-size:46px; margin-bottom:6px;">🎰🎲🎯</div>
                    <p style="font-size:13.5px; color:#444;">Thử vận may Vòng Quay Ngôi Sao miễn phí hoặc chơi gắp thú vui nhộn!</p>
                    <button class="btn btn-primary" style="width:100%; margin-bottom:8px;" onclick="playArcadeLuckyWheel()">🎡 Quay Vòng Quay May Mắn (+1⭐ đến +8⭐)</button>
                    <button class="btn btn-accent" style="width:100%;" onclick="closeModal('arcade-modal'); openQuizModal();">🧠 Chơi Đố Vui Tiếng Anh (+5⭐)</button>
                </div>
            `;
            document.getElementById('arcade-modal').style.display = 'flex';
        }

        function playArcadeLuckyWheel() {
            const me = getCurrentUser();
            const prizes = [1, 2, 3, 5, 2, 8];
            const win = prizes[Math.floor(Math.random() * prizes.length)];
            me.points += win;
            AudioEngine.playCoin();
            showToast(`🎉 Chúc mừng ${me.name} quay trúng +${win}⭐!`);
            triggerSpeechBubble(me, `Quay trúng +${win}⭐ ở Khu Vui Chơi! 🎡`, true);
            lastHudSignature = '';
            updateHUD();
            saveGame();
        }

        const ROOM_DECOR_CATALOG = [
            { name: '🪴 Chậu Cây Xanh Mát', price: 10 },
            { name: '🖼️ Tranh Vũ Trụ', price: 15 },
            { name: '🧸 Góc Gấu Bông', price: 15 },
            { name: '🎸 Đàn Guitar Gỗ', price: 20 },
            { name: '🔭 Kính Thiên Văn', price: 25 },
            { name: '🎮 Góc Máy Chơi Game', price: 30 }
        ];

        function openRoomDecorModal() {
            const me = getCurrentUser();
            const roomId = me.privateRoomId || activePrivateRoomId;
            if (!roomId) return;
            const currentItems = state.roomFurniture[roomId] || [];

            document.getElementById('room-decor-body').innerHTML = `
                <p style="margin-top:0; font-size:13px;">Số dư hiện tại: <b>${me.points}⭐</b></p>
                <div class="grid-2">
                    ${ROOM_DECOR_CATALOG.map((d, idx) => {
                        const owned = currentItems.includes(d.name);
                        return `
                            <div class="card-item ${owned ? 'equipped' : ''}">
                                <b>${d.name}</b>
                                <button class="btn btn-sm ${owned ? 'btn-accent' : 'btn-primary'}" ${owned ? 'disabled' : ''} onclick="buyRoomDecor(${idx})">
                                    ${owned ? '✅ Đã trang trí' : `Mua (${d.price}⭐)`}
                                </button>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
            document.getElementById('room-decor-modal').style.display = 'flex';
        }

        function buyRoomDecor(idx) {
            const me = getCurrentUser();
            const roomId = me.privateRoomId || activePrivateRoomId;
            const item = ROOM_DECOR_CATALOG[idx];
            if (!roomId || !item) return;
            if (me.points < item.price) {
                AudioEngine.playError();
                return showToast(`❌ Bạn cần ${item.price}⭐!`);
            }
            me.points -= item.price;
            if (!Array.isArray(state.roomFurniture[roomId])) state.roomFurniture[roomId] = [];
            state.roomFurniture[roomId].push(item.name);
            AudioEngine.playCoin();
            showToast(`✨ Đã đặt ${item.name} vào phòng!`);
            lastHudSignature = '';
            updateHUD();
            openRoomDecorModal();
            saveGame();
        }