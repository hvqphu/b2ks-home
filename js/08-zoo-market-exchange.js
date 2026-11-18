// =========================================================================
// 11. TRUNG TÂM XUYÊN THẾ GIỚI, CHỢ TRỜI, SỞ THÚ ẢO & BẢNG ĐIỀU KHIỂN PHỤ HUYNH
// =========================================================================

// --- A. TRUNG TÂM GIAO DỊCH XUYÊN THẾ GIỚI ---
function renderExchangeModal() {
    const user = getCurrentUser();
    document.getElementById('exchange-user-points').textContent = user.isParent ? '∞ ⭐' : `${user.points} ⭐`;
    document.getElementById('exchange-parent-creator').style.display = user.isParent ? 'block' : 'none';

    const grid = document.getElementById('exchange-items-grid');
    const availableItems = (state.worldExchangeItems || []).filter(item => item.stock > 0);
    if (availableItems.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:16px; color:#7F8C8D;">🌌 Kho báu quy đổi tạm thời hết hàng! Bố/Mẹ có thể thêm các phần thưởng đời thực mới ở khung phía trên nhé.</div>`;
    } else {
        grid.innerHTML = availableItems.map(item => `
            <div class="exchange-card">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:32px;">${item.icon}</span>
                    <span class="tag" style="background:#D5F5E3; color:#1E8449;">Còn lại: ${item.stock}</span>
                </div>
                <div style="font-weight:700; font-size:15px; color:#2C3E50;">${item.name}</div>
                <div style="font-size:12.5px; color:#6C3483; font-weight:600;">Giá trị thực tế: ${item.realValue}</div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px; gap:6px;">
                    <span class="points-pill">${item.cost} ⭐</span>
                    <button class="btn btn-sm btn-purple" onclick="redeemWorldExchangeItem('${item.id}')">✨ Quy đổi ngay</button>
                </div>
            </div>
        `).join('');
    }

    const reqList = document.getElementById('exchange-requests-list');
    const reqs = state.worldExchangeRequests || [];
    if (reqs.length === 0) {
        reqList.innerHTML = `<div style="font-size:12.5px; color:#7F8C8D;">Chưa có yêu cầu quy đổi nào.</div>`;
    } else {
        reqList.innerHTML = reqs.slice(0, 15).map(r => `
            <div style="background:#F8F9F9; border:1.5px solid #D5D8DC; border-radius:10px; padding:7px 10px; display:flex; justify-content:space-between; align-items:center; font-size:12.5px; gap:8px;">
                <div>
                    <b>${r.icon} ${r.itemName}</b> (${r.realValue}) — Người đổi: <b>${r.userName}</b> (${r.cost} ⭐)
                    <div style="font-size:11px; color:#7F8C8D;">${r.timeStr}</div>
                </div>
                <span class="tag" style="background:${r.status === 'approved' ? '#D4EDDA' : (r.status === 'rejected' ? '#FADBD8' : '#FFF3CD')};">
                    ${r.status === 'approved' ? '✅ Đã trao thưởng' : (r.status === 'rejected' ? '❌ Từ chối' : '⏳ Chờ Bố/Mẹ duyệt')}
                </span>
            </div>
        `).join('');
    }
}

function addWorldExchangeItem() {
    const user = getCurrentUser();
    if (!user.isParent) return;
    const icon = document.getElementById('ex-new-icon').value.trim() || '🎁';
    const name = document.getElementById('ex-new-name').value.trim();
    const realValue = document.getElementById('ex-new-value').value.trim() || 'Phần thưởng đời thực';
    const cost = Math.max(5, parseInt(document.getElementById('ex-new-cost').value) || 50);
    const stock = Math.max(1, parseInt(document.getElementById('ex-new-stock').value) || 1);
    if (!name) return showToast('⚠️ Vui lòng nhập tên vật phẩm quy đổi!');

    state.worldExchangeItems.unshift({ id: 'ex_' + Date.now(), icon, name, realValue, cost, stock });
    document.getElementById('ex-new-name').value = '';
    document.getElementById('ex-new-value').value = '';
    saveState();
    renderExchangeModal();
    playSound('success');
    showToast('✅ Đã thêm vật phẩm vào Trung Tâm Xuyên Thế Giới!');
}

function redeemWorldExchangeItem(itemId) {
    const user = getCurrentUser();
    const item = (state.worldExchangeItems || []).find(x => x.id === itemId);
    if (!item || item.stock <= 0) return showToast('❌ Vật phẩm này đã hết hàng!');
    if (!user.isParent && user.points < item.cost) {
        playSound('error');
        return showToast('❌ Bạn chưa đủ điểm sao để quy đổi phần thưởng này!');
    }
    if (!user.isParent) user.points -= item.cost;
    item.stock -= 1;

    // Xóa item nếu số lượng về 0
    if (item.stock <= 0) {
        state.worldExchangeItems = state.worldExchangeItems.filter(x => x.id !== item.id);
    }

    state.worldExchangeRequests.unshift({
        id: 'exreq_' + Date.now(),
        userId: user.id,
        userName: user.name,
        icon: item.icon,
        itemName: item.name,
        realValue: item.realValue,
        cost: item.cost,
        status: 'pending',
        timeStr: new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
    });
    state.familyChat.push({
        sender: 'Xuyên Thế Giới 🌌',
        text: `${user.name} vừa gửi yêu cầu quy đổi "${item.name}" (${item.realValue})! Bố/Mẹ hãy vào Bảng Phụ Huynh duyệt nhé!`,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    });
    addActivityLog(user.id, `Yêu cầu đổi thưởng thực tế: "${item.name}" (-${item.cost}⭐)`);
    saveState();
    updateHUD();
    renderExchangeModal();
    playSound('success');
    triggerFireworks();
    showToast(`🌌 Đã gửi yêu cầu quy đổi "${item.name}"! Chờ Bố/Mẹ trao thưởng nhé.`);
}

// --- B. CHỢ TRỜI GIA ĐÌNH (FLEA MARKET) ---
function renderFleaMarketModal() {
    const user = getCurrentUser();
    document.getElementById('fm-user-points').textContent = user.isParent ? '∞ ⭐' : `${user.points} ⭐`;

    // Tổng hợp các vật phẩm trong túi người dùng hiện tại có thể bán
    const sellSel = document.getElementById('fm-sell-item-select');
    const options = [];
    (user.roomDecor || []).forEach(d => {
        options.push(`<option value="decor|${d.id}">${d.icon} ${d.name} (Nội thất)</option>`);
    });
    (state.labCraftedItems[user.id] || []).forEach(c => {
        options.push(`<option value="lab|${c.id}">${c.icon} ${c.name} (Cổ vật)</option>`);
    });
    state.vouchers.filter(v => v.ownerId === user.id && !v.used).forEach(v => {
        options.push(`<option value="voucher|${v.id}">${v.icon} ${v.name} (Phiếu thưởng)</option>`);
    });
    sellSel.innerHTML = options.length
        ? options.join('')
        : `<option value="">-- Bạn chưa có vật phẩm nào để bán --</option>`;

    const grid = document.getElementById('fm-listings-grid');
    const listings = state.fleaMarketListings || [];
    if (listings.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:16px; color:#7F8C8D;">🎪 Chợ trời hiện đang trống. Hãy đăng bán món đồ đầu tiên của bạn nhé!</div>`;
        return;
    }

    grid.innerHTML = listings.map(l => {
        const isMine = (l.sellerId === user.id);
        return `
            <div class="card-item" style="border-color:${isMine ? '#E67E22' : '#2C3E50'};">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:30px;">${l.item.icon}</span>
                    <span class="points-pill">${l.price} ⭐</span>
                </div>
                <div style="font-weight:700; font-size:14.5px;">${l.item.name}</div>
                <div style="font-size:12px; color:#555;">Người bán: <b>${l.sellerName}</b></div>
                ${isMine
                    ? `<button class="btn btn-sm btn-danger" onclick="cancelFleaMarketListing('${l.id}')">↩️ Thu hồi về túi</button>`
                    : `<button class="btn btn-sm btn-primary" onclick="buyFleaMarketListing('${l.id}')">🛒 Mua ngay (${l.price} ⭐)</button>`
                }
            </div>
        `;
    }).join('');
}

function listItemOnFleaMarket() {
    const user = getCurrentUser();
    const rawVal = document.getElementById('fm-sell-item-select').value;
    const price = Math.max(1, parseInt(document.getElementById('fm-sell-price').value) || 20);
    if (!rawVal) return showToast('⚠️ Bạn chưa chọn vật phẩm nào để đăng bán!');

    const [itemType, itemId] = rawVal.split('|');
    let extractedItem = null;

    if (itemType === 'decor') {
        const idx = user.roomDecor.findIndex(d => d.id === itemId);
        if (idx >= 0) {
            extractedItem = user.roomDecor.splice(idx, 1)[0];
            if (user.roomPlaced?.left?.id === itemId) user.roomPlaced.left = null;
            if (user.roomPlaced?.right?.id === itemId) user.roomPlaced.right = null;
        }
    } else if (itemType === 'lab') {
        const list = state.labCraftedItems[user.id] || [];
        const idx = list.findIndex(c => c.id === itemId);
        if (idx >= 0) {
            extractedItem = list.splice(idx, 1)[0];
            if (user.roomPlaced?.left?.id === itemId) user.roomPlaced.left = null;
            if (user.roomPlaced?.right?.id === itemId) user.roomPlaced.right = null;
        }
    } else if (itemType === 'voucher') {
        const idx = state.vouchers.findIndex(v => v.id === itemId && v.ownerId === user.id && !v.used);
        if (idx >= 0) {
            extractedItem = state.vouchers.splice(idx, 1)[0];
        }
    }

    if (!extractedItem) return showToast('❌ Không tìm thấy vật phẩm trong túi!');

    state.fleaMarketListings.unshift({
        id: 'fm_' + Date.now(),
        sellerId: user.id,
        sellerName: user.name,
        itemType,
        item: extractedItem,
        price,
        createdAt: Date.now()
    });
    addActivityLog(user.id, `Đăng bán "${extractedItem.name}" lên Chợ Trời giá ${price}⭐`);
    saveState();
    updateHUD();
    renderFleaMarketModal();
    playSound('coin');
    showToast(`📢 Đã niêm yết "${extractedItem.name}" lên Chợ Trời với giá ${price} ⭐!`);
}

function cancelFleaMarketListing(listingId) {
    const user = getCurrentUser();
    const idx = (state.fleaMarketListings || []).findIndex(l => l.id === listingId && l.sellerId === user.id);
    if (idx < 0) return;
    const listing = state.fleaMarketListings.splice(idx, 1)[0];
    restoreFleaItemToMember(user, listing.itemType, listing.item);
    saveState();
    updateHUD();
    renderFleaMarketModal();
    playSound('pop');
    showToast(`↩️ Đã thu hồi "${listing.item.name}" về túi đồ!`);
}

function buyFleaMarketListing(listingId) {
    const buyer = getCurrentUser();
    const idx = (state.fleaMarketListings || []).findIndex(l => l.id === listingId);
    if (idx < 0) return showToast('❌ Món hàng này vừa được người khác mua rồi!');
    const listing = state.fleaMarketListings[idx];
    if (listing.sellerId === buyer.id) return;

    if (!buyer.isParent && buyer.points < listing.price) {
        playSound('error');
        return showToast('❌ Bạn chưa đủ điểm sao để mua món hàng này!');
    }

    if (!buyer.isParent) buyer.points -= listing.price;
    const seller = state.members.find(m => m.id === listing.sellerId);
    if (seller && !seller.isParent) {
        seller.points += listing.price;
    }

    state.fleaMarketListings.splice(idx, 1);
    restoreFleaItemToMember(buyer, listing.itemType, listing.item);

    state.familyChat.push({
        sender: 'Chợ Trời 🎪',
        text: `${buyer.name} đã mua "${listing.item.name}" của ${listing.sellerName} với giá ${listing.price} ⭐!`,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    });
    addActivityLog(buyer.id, `Mua "${listing.item.name}" từ ${listing.sellerName} tại Chợ Trời (-${listing.price}⭐)`);
    saveState();
    updateHUD();
    renderFleaMarketModal();
    playSound('success');
    triggerFireworks();
    showToast(`🎉 Giao dịch thành công! "${listing.item.name}" đã chuyển vào túi của bạn!`);
}

function restoreFleaItemToMember(member, itemType, item) {
    if (itemType === 'decor') {
        member.roomDecor.push(item);
    } else if (itemType === 'lab') {
        if (!Array.isArray(state.labCraftedItems[member.id])) state.labCraftedItems[member.id] = [];
        state.labCraftedItems[member.id].push(item);
    } else if (itemType === 'voucher') {
        item.ownerId = member.id;
        state.vouchers.unshift(item);
    }
}

// --- C. SỞ THÚ ẢO B2KS & TỪ ĐIỂN CHẠM TỪ DỊCH NHANH ---
let zooCatalogCache = null;
let zooFilterEco = 'ALL';
const wikiImageCache = {};
const wordTranslationCache = {};

const FALLBACK_ANIMALS_DATA = [
    { id: 'lion', name: 'African Lion', viName: 'Sư Tử Châu Phi', ecosystem: 'Savanna', ecosystemVi: 'Thảo Nguyên', price: 35, emoji: '🦁', wikiTitle: 'Lion', fallbackImg: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Lion_waiting_in_Namibia.jpg/640px-Lion_waiting_in_Namibia.jpg', desc: 'The lion is a strong wild cat that lives in grassy savannas in Africa. Lions live together in family groups called prides. Male lions have a thick mane of hair around their heads, and their loud roar can be heard far away.' },
    { id: 'elephant', name: 'African Elephant', viName: 'Voi Châu Phi', ecosystem: 'Savanna', ecosystemVi: 'Thảo Nguyên', price: 45, emoji: '🐘', wikiTitle: 'African_bush_elephant', fallbackImg: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/African_Elephant_%28Loxodonta_africana%29_male_%2817289351322%29.jpg/640px-African_Elephant_%28Loxodonta_africana%29_male_%2817289351322%29.jpg', desc: 'The elephant is the largest land animal on Earth. It uses its long trunk to breathe, drink water, and pick up sweet leaves from tall trees. Elephants have big ears that help keep their bodies cool in the hot sun.' },
    { id: 'giraffe', name: 'Giraffe', viName: 'Hươu Cao Cổ', ecosystem: 'Savanna', ecosystemVi: 'Thảo Nguyên', price: 30, emoji: '🦒', wikiTitle: 'Giraffe', fallbackImg: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Giraffe_Mikumi_National_Park.jpg/640px-Giraffe_Mikumi_National_Park.jpg', desc: 'The giraffe is the tallest animal in the world with a very long neck and spotted coat. Its long purple tongue helps it eat fresh leaves at the top of acacia trees. Baby giraffes can stand up and walk just one hour after they are born.' },
    { id: 'tiger', name: 'Bengal Tiger', viName: 'Hổ Bengal', ecosystem: 'Rainforest', ecosystemVi: 'Rừng Nhiệt Đới', price: 40, emoji: '🐅', wikiTitle: 'Bengal_tiger', fallbackImg: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Tiger_in_Ranthambhore.jpg/640px-Tiger_in_Ranthambhore.jpg', desc: 'The tiger is the biggest wild cat in Asia with bright orange fur and dark black stripes. Every tiger has a unique stripe pattern, just like human fingerprints. Unlike most cats, tigers love to swim in cool forest rivers.' },
    { id: 'panda', name: 'Giant Panda', viName: 'Gấu Trúc Lớn', ecosystem: 'Rainforest', ecosystemVi: 'Rừng Nhiệt Đới', price: 50, emoji: '🐼', wikiTitle: 'Giant_panda', fallbackImg: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Grosser_Panda.JPG/640px-Grosser_Panda.JPG', desc: 'The giant panda is a gentle bear with black and white fur that lives in mountain bamboo forests. Pandas spend up to twelve hours every day eating crunchy green bamboo shoots. They are wonderful climbers and love resting in trees.' },
    { id: 'dolphin', name: 'Bottlenose Dolphin', viName: 'Cá Heo Mũi Chai', ecosystem: 'Ocean', ecosystemVi: 'Đại Dương', price: 35, emoji: '🐬', wikiTitle: 'Bottlenose_dolphin', fallbackImg: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Tursiops_truncatus_01.jpg/640px-Tursiops_truncatus_01.jpg', desc: 'Dolphins are smart and playful marine mammals that swim in blue oceans around the world. They talk to each other using special clicks, whistles, and body jumps. Dolphins breathe air through a blowhole on the top of their heads.' },
    { id: 'blue_whale', name: 'Blue Whale', viName: 'Cá Voi Xanh', ecosystem: 'Ocean', ecosystemVi: 'Đại Dương', price: 60, emoji: '🐋', wikiTitle: 'Blue_whale', fallbackImg: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Anim1754_-_Flickr_-_NOAA_Photo_Library.jpg/640px-Anim1754_-_Flickr_-_NOAA_Photo_Library.jpg', desc: 'The blue whale is the largest animal that has ever lived on our planet. Its heart is as big as a small car, and its gentle songs can travel deep through the ocean. Blue whales eat tiny shrimp called krill every single day.' },
    { id: 'polar_bear', name: 'Polar Bear', viName: 'Gấu Bắc Cực', ecosystem: 'Arctic', ecosystemVi: 'Bắc Cực', price: 45, emoji: '🐻‍❄️', wikiTitle: 'Polar_bear', fallbackImg: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Polar_Bear_-_Alaska_%28cropped%29.jpg/640px-Polar_Bear_-_Alaska_%28cropped%29.jpg', desc: 'The polar bear lives on the icy Arctic snow and freezing ocean waters. It has a thick layer of fat and warm white fur to protect it from the cold wind. Polar bears have giant paws that help them swim smoothly between ice blocks.' },
    { id: 'penguin', name: 'Emperor Penguin', viName: 'Chim Cánh Cụt Hoàng Đế', ecosystem: 'Arctic', ecosystemVi: 'Bắc Cực & Nam Cực', price: 35, emoji: '🐧', wikiTitle: 'Emperor_penguin', fallbackImg: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Emperor_Penguin_Manchot_empereur.jpg/640px-Emperor_Penguin_Manchot_empereur.jpg', desc: 'The emperor penguin is a flightless bird that wears a black and white tuxedo coat. Instead of flying in the sky, penguins use their wings like flippers to dive deep into icy water for fish. They huddle closely together to stay warm in winter storms.' }
];

async function getZooCatalog() {
    if (zooCatalogCache) return zooCatalogCache;
    try {
        const res = await fetch('./data/animals.json');
        if (res.ok) {
            zooCatalogCache = await res.json();
            return zooCatalogCache;
        }
    } catch (e) {}
    zooCatalogCache = FALLBACK_ANIMALS_DATA;
    return zooCatalogCache;
}

async function fetchWikipediaAnimalImage(animal) {
    if (wikiImageCache[animal.id]) return wikiImageCache[animal.id];
    try {
        const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(animal.wikiTitle)}`;
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            const imgUrl = (data.originalimage && data.originalimage.source) || (data.thumbnail && data.thumbnail.source) || animal.fallbackImg;
            wikiImageCache[animal.id] = imgUrl;
            return imgUrl;
        }
    } catch (e) {}
    wikiImageCache[animal.id] = animal.fallbackImg;
    return animal.fallbackImg;
}

function filterZooEcosystem(eco, btn) {
    zooFilterEco = eco;
    document.querySelectorAll('#zoo-ecosystem-filters .tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderZooModal();
}

async function renderZooModal() {
    const user = getCurrentUser();
    if (!Array.isArray(state.zooUnlocked[user.id])) state.zooUnlocked[user.id] = [];
    document.getElementById('zoo-user-points').textContent = user.isParent ? '∞ ⭐' : `${user.points} ⭐`;

    const catalog = await getZooCatalog();
    const filtered = zooFilterEco === 'ALL' ? catalog : catalog.filter(a => a.ecosystem === zooFilterEco);
    const unlockedIds = state.zooUnlocked[user.id];

    const grid = document.getElementById('zoo-animals-grid');
    grid.innerHTML = filtered.map(a => {
        const isUnlocked = unlockedIds.includes(a.id);
        const imgSrc = wikiImageCache[a.id] || a.fallbackImg;
        return `
            <div class="zoo-animal-card">
                <div class="zoo-img-frame ${isUnlocked ? '' : 'locked'}">
                    <img id="zoo-img-${a.id}" src="${imgSrc}" alt="${a.name}" loading="lazy">
                    ${isUnlocked ? '' : `
                        <div class="zoo-lock-overlay">
                            <span style="font-size:28px;">🔒</span>
                            <span>Bóng Đen Bí Ẩn</span>
                        </div>
                    `}
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span class="tag" style="background:#E8F8F5;">🌍 ${a.ecosystemVi}</span>
                    <span class="points-pill">${isUnlocked ? '✅ Đã mở khóa' : a.price + ' ⭐'}</span>
                </div>
                <div style="font-weight:700; font-size:15px;">
                    ${isUnlocked ? `${a.emoji} ${a.name} (${a.viName})` : `❓ Sinh Vật Bí Ẩn (${a.ecosystem})`}
                </div>
                ${isUnlocked
                    ? `<button class="btn btn-sm btn-primary" onclick="openZooDetailModal('${a.id}')">📖 Khám phá & Học Tiếng Anh</button>`
                    : `<button class="btn btn-sm btn-accent" onclick="unlockZooAnimal('${a.id}')">🔓 Mở khóa bằng ${a.price} ⭐</button>`
                }
            </div>
        `;
    }).join('');

    // Tải ảnh thực tế từ Wikimedia REST API ngầm và cập nhật
    filtered.forEach(async a => {
        const realUrl = await fetchWikipediaAnimalImage(a);
        const imgEl = document.getElementById(`zoo-img-${a.id}`);
        if (imgEl && realUrl && imgEl.src !== realUrl) {
            imgEl.src = realUrl;
        }
    });
}

async function unlockZooAnimal(animalId) {
    const user = getCurrentUser();
    const catalog = await getZooCatalog();
    const animal = catalog.find(a => a.id === animalId);
    if (!animal) return;
    if (!Array.isArray(state.zooUnlocked[user.id])) state.zooUnlocked[user.id] = [];
    if (state.zooUnlocked[user.id].includes(animalId)) return;

    if (!user.isParent && user.points < animal.price) {
        playSound('error');
        return showToast('❌ Bạn chưa đủ điểm sao để mở khóa loài vật này!');
    }
    if (!user.isParent) user.points -= animal.price;
    state.zooUnlocked[user.id].push(animalId);
    addActivityLog(user.id, `Mở khóa loài vật Sở Thú: ${animal.name} (-${animal.price}⭐)`);
    saveState();
    updateHUD();
    renderZooModal();
    playSound('success');
    triggerFireworks();
    showToast(`🦁 Tuyệt vời! Bạn đã mở khóa ${animal.emoji} ${animal.name} (${animal.viName})!`);
}

async function openZooDetailModal(animalId) {
    const catalog = await getZooCatalog();
    const animal = catalog.find(a => a.id === animalId);
    if (!animal) return;
    const imgUrl = await fetchWikipediaAnimalImage(animal);

    document.getElementById('zoo-detail-title').textContent = `${animal.emoji} ${animal.name} — ${animal.viName}`;

    // Tách từng từ tiếng Anh thành token có thể bấm để dịch nghĩa ngay lập tức
    const interactiveHtml = animal.desc.split(/(\s+)/).map(part => {
        if (/^\s+$/.test(part)) return part;
        const cleanWord = part.replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, '');
        if (!cleanWord) return part;
        return `<span class="word-token" onclick="lookupEnglishWord(event, '${cleanWord.toLowerCase()}')">${part}</span>`;
    }).join('');

    const body = document.getElementById('zoo-detail-body');
    body.innerHTML = `
        <div style="width:100%; height:220px; border-radius:14px; overflow:hidden; border:2.5px solid #2C3E50;">
            <img src="${imgUrl}" alt="${animal.name}" style="width:100%; height:100%; object-fit:cover;">
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <span class="tag" style="background:#D5F5E3;">🌍 Môi trường: ${animal.ecosystem} (${animal.ecosystemVi})</span>
            <button class="btn btn-sm btn-accent" onclick="speakEnglishText(\`${animal.desc.replace(/`/g, '')}\`)">🔊 Nghe đọc toàn đoạn</button>
        </div>
        <div style="background:#F8F9F9; border:2px solid #BDC3C7; border-radius:12px; padding:12px; font-size:16px; line-height:1.65; color:#1B4F72;">
            ${interactiveHtml}
        </div>
        <div style="font-size:12px; color:#555; text-align:center;">
            💡 <b>Mẹo học tập:</b> Chạm vào bất kỳ từ tiếng Anh nào ở đoạn văn trên để nghe phát âm và xem nghĩa tiếng Việt tức thì!
        </div>
    `;
    openModal('zoo-detail-modal');
}

const MINI_EN_VI_DICT = {
    the: 'mạo từ (cái, con)', lion: 'sư tử', is: 'là, thì', strong: 'mạnh mẽ', wild: 'hoang dã', cat: 'loài mèo',
    that: 'mà, đó', lives: 'sinh sống', in: 'trong, ở', grassy: 'đầy cỏ', savannas: 'thảo nguyên', africa: 'châu Phi',
    lions: 'những con sư tử', live: 'sống', together: 'cùng nhau', family: 'gia đình', groups: 'nhóm, bầy đàn',
    called: 'được gọi là', prides: 'bầy sư tử', male: 'con đực', have: 'có', thick: 'dày', mane: 'bờm',
    hair: 'lông, tóc', around: 'xung quanh', their: 'của chúng', heads: 'đầu', and: 'và', loud: 'to, vang',
    roar: 'tiếng gầm', can: 'có thể', be: 'được', heard: 'nghe thấy', far: 'xa', away: 'ra xa',
    elephant: 'con voi', largest: 'lớn nhất', land: 'trên cạn', animal: 'động vật', on: 'trên', earth: 'Trái Đất',
    uses: 'sử dụng', its: 'của nó', long: 'dài', trunk: 'vòi voi', to: 'để', breathe: 'hít thở', drink: 'uống',
    water: 'nước', pick: 'hái, nhặt', up: 'lên', sweet: 'ngọt ngào', leaves: 'lá cây', from: 'từ', tall: 'cao',
    trees: 'cây cối', elephants: 'những chú voi', big: 'to lớn', ears: 'đôi tai', help: 'giúp đỡ', keep: 'giữ',
    bodies: 'cơ thể', cool: 'mát mẻ', hot: 'nóng bức', sun: 'mặt trời', giraffe: 'hươu cao cổ', tallest: 'cao nhất',
    world: 'thế giới', with: 'với', very: 'rất', neck: 'cái cổ', spotted: 'có đốm', coat: 'bộ lông',
    purple: 'màu tím', tongue: 'cái lưỡi', helps: 'giúp', eat: 'ăn', fresh: 'tươi ngon', at: 'tại, ở',
    top: 'ngọn, đỉnh', acacia: 'cây keo', baby: 'em bé, con non', giraffes: 'hươu cao cổ', stand: 'đứng',
    walk: 'đi bộ', just: 'chỉ', one: 'một', hour: 'giờ', after: 'sau khi', they: 'chúng', are: 'được', born: 'sinh ra',
    tiger: 'con hổ', biggest: 'to lớn nhất', asia: 'châu Á', bright: 'tươi sáng', orange: 'màu cam', fur: 'bộ lông',
    dark: 'sẫm màu', black: 'màu đen', stripes: 'vằn, sọc', every: 'mỗi', has: 'có', unique: 'độc nhất',
    pattern: 'hoa văn', like: 'giống như', human: 'con người', fingerprints: 'dấu vân tay', unlike: 'không giống',
    most: 'hầu hết', tigers: 'những con hổ', love: 'yêu thích', swim: 'bơi lội', forest: 'khu rừng', rivers: 'dòng sông',
    giant: 'khổng lồ', panda: 'gấu trúc', gentle: 'hiền lành', bear: 'con gấu', white: 'màu trắng', mountain: 'núi',
    bamboo: 'cây tre, trúc', forests: 'rừng rậm', pandas: 'gấu trúc', spend: 'dành thời gian', twelve: 'mười hai',
    hours: 'giờ đồng hồ', day: 'ngày', eating: 'ăn', crunchy: 'giòn rụm', green: 'xanh tươi', shoots: 'măng non',
    wonderful: 'tuyệt vời', climbers: 'nhà leo trèo', resting: 'nghỉ ngơi', dolphins: 'cá heo', smart: 'thông minh',
    playful: 'tinh nghịch', marine: 'thuộc về biển', mammals: 'động vật có vú', blue: 'xanh biếc', oceans: 'đại dương',
    talk: 'trò chuyện', each: 'mỗi', other: 'khác', using: 'sử dụng', special: 'đặc biệt', clicks: 'tiếng lách cách',
    whistles: 'tiếng huýt sáo', body: 'cơ thể', jumps: 'cú nhảy', air: 'không khí', through: 'qua', blowhole: 'lỗ thở',
    whale: 'cá voi', ever: 'từng', lived: 'sống', our: 'của chúng ta', planet: 'hành tinh', heart: 'trái tim',
    as: 'như', small: 'nhỏ', car: 'chiếc ô tô', songs: 'bài hát', travel: 'di chuyển', deep: 'sâu thẳm',
    ocean: 'đại dương', whales: 'cá voi', tiny: 'tí hon', shrimp: 'loài tôm', krill: 'nhuyễn thể', single: 'mỗi một',
    polar: 'vùng cực', icy: 'băng giá', snow: 'tuyết', freezing: 'lạnh cóng', waters: 'vùng nước', layer: 'lớp',
    fat: 'mỡ', warm: 'ấm áp', protect: 'bảo vệ', cold: 'lạnh lẽo', wind: 'gió', paws: 'bàn chân',
    smoothly: 'mượt mà', between: 'giữa', ice: 'băng', blocks: 'tảng băng', emperor: 'hoàng đế', penguin: 'chim cánh cụt',
    flightless: 'không biết bay', bird: 'loài chim', wears: 'mặc', tuxedo: 'áo lễ phục', instead: 'thay vì',
    flying: 'bay', sky: 'bầu trời', penguins: 'chim cánh cụt', wings: 'đôi cánh', flippers: 'chân chèo',
    dive: 'lặn', into: 'vào trong', fish: 'cá', huddle: 'tụm lại', closely: 'sát nhau', stay: 'giữ',
    winter: 'mùa đông', storms: 'cơn bão'
};

let activeWordTooltip = null;

function removeWordTooltip() {
    if (activeWordTooltip) {
        activeWordTooltip.remove();
        activeWordTooltip = null;
    }
    document.querySelectorAll('.word-token.active-word').forEach(el => el.classList.remove('active-word'));
}

async function lookupEnglishWord(event, cleanWord) {
    event.stopPropagation();
    removeWordTooltip();
    const targetEl = event.currentTarget;
    targetEl.classList.add('active-word');
    speakEnglishText(cleanWord);

    const rect = targetEl.getBoundingClientRect();
    const popup = document.createElement('div');
    popup.className = 'word-tooltip-popup';
    popup.innerHTML = `<b>${cleanWord}</b> 🔊<br><span style="color:#FFE66D;">⏳ Đang dịch nghĩa...</span>`;
    document.body.appendChild(popup);
    activeWordTooltip = popup;

    const popRect = popup.getBoundingClientRect();
    popup.style.left = Math.min(window.innerWidth - popRect.width - 12, Math.max(12, rect.left + rect.width / 2 - popRect.width / 2)) + 'px';
    popup.style.top = Math.max(12, rect.top - popRect.height - 10) + 'px';

    let meaning = MINI_EN_VI_DICT[cleanWord] || wordTranslationCache[cleanWord];
    if (!meaning) {
        try {
            const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanWord)}&langpair=en|vi`);
            if (res.ok) {
                const data = await res.json();
                meaning = data?.responseData?.translatedText || '';
                if (meaning) wordTranslationCache[cleanWord] = meaning;
            }
        } catch (e) {}
    }
    if (!meaning) meaning = '(Từ vựng tiếng Anh)';

    if (activeWordTooltip === popup) {
        popup.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
                <b style="font-size:14.5px; color:#FFE66D;">${cleanWord}</b>
                <button onclick="speakEnglishText('${cleanWord}')" style="background:none; border:none; color:#FFF; cursor:pointer; font-size:14px;">🔊</button>
            </div>
            <div style="margin-top:2px; font-weight:600;">🇻🇳 ${meaning}</div>
        `;
        const newRect = popup.getBoundingClientRect();
        popup.style.left = Math.min(window.innerWidth - newRect.width - 12, Math.max(12, rect.left + rect.width / 2 - newRect.width / 2)) + 'px';
        popup.style.top = Math.max(12, rect.top - newRect.height - 10) + 'px';
    }
}

document.addEventListener('pointerdown', (e) => {
    if (activeWordTooltip && !activeWordTooltip.contains(e.target) && !e.target.classList.contains('word-token')) {
        removeWordTooltip();
    }
});

// --- D. BẢNG ĐIỀU KHIỂN PHỤ HUYNH (PARENTAL CONTROL DASHBOARD) ---
let pdTaskChartInstance = null;
let pdEnglishChartInstance = null;

function switchParentTab(tab, btn) {
    document.querySelectorAll('#parent-dashboard-modal .tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    document.getElementById('pd-tab-exchange').style.display = (tab === 'exchange') ? 'block' : 'none';
    document.getElementById('pd-tab-charts').style.display = (tab === 'charts') ? 'block' : 'none';
    document.getElementById('pd-tab-english').style.display = (tab === 'english') ? 'block' : 'none';
    document.getElementById('pd-tab-logs').style.display = (tab === 'logs') ? 'block' : 'none';
    if (tab === 'charts') renderParentProgressCharts();
}

function renderParentDashboardModal() {
    const user = getCurrentUser();
    const lockedEl = document.getElementById('pd-locked-notice');
    const mainEl = document.getElementById('pd-main-content');
    if (!user.isParent) {
        lockedEl.style.display = 'block';
        mainEl.style.display = 'none';
        return;
    }
    lockedEl.style.display = 'none';
    mainEl.style.display = 'block';

    // 1. Duyệt đổi quà Xuyên Thế Giới
    const reqs = state.worldExchangeRequests || [];
    const pendingCount = reqs.filter(r => r.status === 'pending').length;
    document.getElementById('pd-pending-count').textContent = pendingCount;

    const exList = document.getElementById('pd-exchange-list');
    exList.innerHTML = reqs.length ? reqs.map(r => `
        <div class="card-item" style="flex-direction:row; align-items:center; flex-wrap:wrap;">
            <div style="flex:1; min-width:200px;">
                <div style="font-weight:700; font-size:14.5px;">${r.icon} ${r.itemName} <span class="tag">${r.realValue}</span></div>
                <div style="font-size:12px; color:#555;">Bé đổi: <b>${r.userName}</b> | Đã trừ: <b>${r.cost} ⭐</b> | Lúc: ${r.timeStr}</div>
            </div>
            <div style="display:flex; gap:6px; align-items:center;">
                ${r.status === 'pending' ? `
                    <button class="btn btn-sm btn-primary" onclick="processWorldExchangeRequest('${r.id}', 'approved')">✅ Duyệt & Trao thưởng</button>
                    <button class="btn btn-sm btn-danger" onclick="processWorldExchangeRequest('${r.id}', 'rejected')">❌ Từ chối & Hoàn sao</button>
                ` : `<span class="tag" style="background:${r.status === 'approved' ? '#D4EDDA' : '#FADBD8'};">${r.status === 'approved' ? '✅ Đã duyệt' : '❌ Đã từ chối'}</span>`}
            </div>
        </div>
    `).join('') : `<p style="color:#7F8C8D; font-size:13px;">Chưa có yêu cầu quy đổi phần thưởng nào từ các bé.</p>`;

    // 2. Ngân hàng câu hỏi Tiếng Anh
    const qList = document.getElementById('pd-en-questions-list');
    const customBank = state.customEnglishBank || [];
    qList.innerHTML = customBank.length ? customBank.map(q => `
        <div class="card-item" style="flex-direction:row; justify-content:space-between; align-items:center; flex-wrap:wrap;">
            <div style="flex:1;">
                <div style="font-weight:700; font-size:13.5px;">${q.q}</div>
                <div style="font-size:12px; color:#1E8449;">Đáp án đúng: <b>${['A', 'B', 'C', 'D'][q.ans]}. ${q.opts[q.ans]}</b></div>
            </div>
            <div style="display:flex; gap:6px;">
                <button class="btn btn-sm btn-accent" onclick="editParentEnglishQuestion('${q.id}')">✏️ Sửa</button>
                <button class="btn btn-sm btn-danger" onclick="deleteParentEnglishQuestion('${q.id}')">🗑️</button>
            </div>
        </div>
    `).join('') : `<p style="color:#7F8C8D; font-size:12.5px;">Chưa có câu hỏi tùy chỉnh nào.</p>`;

    // 3. Nhật ký hoạt động & kiểm tra thời gian
    const logList = document.getElementById('pd-activity-logs-list');
    const logs = state.activityLogs || [];
    logList.innerHTML = logs.map(l => {
        const dt = new Date(l.timestamp).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit' });
        return `
            <div style="background:${l.flaggedFast ? '#FDEDEC' : '#F8F9F9'}; border:1.5px solid ${l.flaggedFast ? '#E74C3C' : '#D5D8DC'}; border-radius:8px; padding:6px 10px; font-size:12.5px; display:flex; justify-content:space-between; align-items:center; gap:8px;">
                <div>
                    <b>${l.memberName}</b>: ${l.action}
                    ${l.durationSec !== null ? `<span class="tag" style="margin-left:4px;">⏱️ ${l.durationSec}s</span>` : ''}
                    ${l.flaggedFast ? `<span class="tag" style="background:#E74C3C; color:#FFF; margin-left:4px;">⚠️ Hoàn thành quá nhanh!</span>` : ''}
                </div>
                <span style="font-size:11px; color:#7F8C8D; white-space:nowrap;">${dt}</span>
            </div>
        `;
    }).join('');
}

function processWorldExchangeRequest(reqId, decision) {
    const req = (state.worldExchangeRequests || []).find(r => r.id === reqId);
    if (!req || req.status !== 'pending') return;
    req.status = decision;
    if (decision === 'rejected') {
        const child = state.members.find(m => m.id === req.userId);
        if (child && !child.isParent) child.points += req.cost;
        showToast(`↩️ Đã từ chối và hoàn lại ${req.cost} ⭐ cho ${req.userName}.`);
    } else {
        playSound('success');
        triggerFireworks();
        state.familyChat.push({
            sender: 'Phụ Huynh 🛡️',
            text: `✅ Bố/Mẹ đã duyệt yêu cầu đổi "${req.itemName}" (${req.realValue}) cho ${req.userName}!`,
            time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        });
        showToast(`✅ Đã duyệt trao thưởng "${req.itemName}" cho ${req.userName}!`);
    }
    saveState();
    updateHUD();
    renderParentDashboardModal();
}

function saveParentEnglishQuestion() {
    const editId = document.getElementById('pd-en-edit-id').value;
    const q = document.getElementById('pd-en-q').value.trim();
    const opt0 = document.getElementById('pd-en-opt0').value.trim();
    const opt1 = document.getElementById('pd-en-opt1').value.trim();
    const opt2 = document.getElementById('pd-en-opt2').value.trim();
    const opt3 = document.getElementById('pd-en-opt3').value.trim();
    const ans = parseInt(document.getElementById('pd-en-ans').value) || 0;

    if (!q || !opt0 || !opt1 || !opt2 || !opt3) {
        return showToast('⚠️ Vui lòng nhập đầy đủ câu hỏi và cả 4 đáp án A, B, C, D!');
    }

    if (editId) {
        const idx = state.customEnglishBank.findIndex(x => x.id === editId);
        if (idx >= 0) {
            state.customEnglishBank[idx] = { id: editId, q, opts: [opt0, opt1, opt2, opt3], ans };
        }
    } else {
        state.customEnglishBank.unshift({ id: 'ceb_' + Date.now(), q, opts: [opt0, opt1, opt2, opt3], ans });
    }

    document.getElementById('pd-en-edit-id').value = '';
    document.getElementById('pd-en-q').value = '';
    document.getElementById('pd-en-opt0').value = '';
    document.getElementById('pd-en-opt1').value = '';
    document.getElementById('pd-en-opt2').value = '';
    document.getElementById('pd-en-opt3').value = '';

    saveState();
    renderParentDashboardModal();
    playSound('success');
    showToast('✅ Đã lưu câu hỏi Tiếng Anh vào ngân hàng & đồng bộ Firebase!');
}

function editParentEnglishQuestion(id) {
    const item = (state.customEnglishBank || []).find(x => x.id === id);
    if (!item) return;
    document.getElementById('pd-en-edit-id').value = item.id;
    document.getElementById('pd-en-q').value = item.q;
    document.getElementById('pd-en-opt0').value = item.opts[0];
    document.getElementById('pd-en-opt1').value = item.opts[1];
    document.getElementById('pd-en-opt2').value = item.opts[2];
    document.getElementById('pd-en-opt3').value = item.opts[3];
    document.getElementById('pd-en-ans').value = item.ans;
}

function deleteParentEnglishQuestion(id) {
    state.customEnglishBank = (state.customEnglishBank || []).filter(x => x.id !== id);
    saveState();
    renderParentDashboardModal();
    showToast('🗑️ Đã xóa câu hỏi khỏi ngân hàng.');
}

function renderParentProgressCharts() {
    if (typeof Chart === 'undefined') return;
    const kids = state.members.filter(m => !m.isParent);
    const labels = kids.map(k => k.name);

    const taskRates = kids.map(k => {
        const myTasks = state.tasks.filter(t => t.assigneeId === k.id || t.assigneeId === 'both');
        if (myTasks.length === 0) return 100;
        const doneCount = myTasks.filter(t => t.status === 'done' || (t.type === 'coop' && t.coopProgress?.[k.id])).length;
        return Math.round((doneCount / myTasks.length) * 100);
    });

    const englishScores = kids.map(k => {
        const enLogs = (state.activityLogs || []).filter(l => l.memberId === k.id && l.action.includes('Tiếng Anh')).length;
        return enLogs * 20;
    });

    const ctx1 = document.getElementById('pd-task-chart');
    if (ctx1) {
        if (pdTaskChartInstance) pdTaskChartInstance.destroy();
        pdTaskChartInstance = new Chart(ctx1, {
            type: 'bar',
            data: {
                labels,
                datasets: [{ label: 'Tỷ lệ hoàn thành (%)', data: taskRates, backgroundColor: ['#3498DB', '#FF7675', '#2ECC71'] }]
            },
            options: { responsive: true, scales: { y: { beginAtZero: true, max: 100 } } }
        });
    }

    const ctx2 = document.getElementById('pd-english-chart');
    if (ctx2) {
        if (pdEnglishChartInstance) pdEnglishChartInstance.destroy();
        pdEnglishChartInstance = new Chart(ctx2, {
            type: 'bar',
            data: {
                labels,
                datasets: [{ label: 'Điểm tích lũy Tiếng Anh (⭐)', data: englishScores, backgroundColor: ['#9B59B6', '#F1C40F', '#1ABC9C'] }]
            },
            options: { responsive: true, scales: { y: { beginAtZero: true } } }
        });
    }
}
