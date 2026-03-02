const API = '/api';
const MEAL_LABELS = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '零食',
  late_night: '夜宵'
};
const RATING_LABELS = { 1: '夯', 2: '顶级', 3: '人上人', 4: 'NPC', 5: '拉完了' };
const AVATAR_OPTIONS = ['🍳', '🍜', '🥡', '🍕', '🍱', '🥗', '🍲', '☕', '🍰', '🥤', '🍪', '🌮', '🍔', '🍟', '🥪', '🧁'];

const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => el.querySelectorAll(sel);

let users = [];
let records = [];
let currentUserId = '';
let currentRange = 'day';
let editingAvatarUserId = null;

async function request(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

function escapeHtml(s) {
  if (s == null) return '';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function getDateRange() {
  const today = new Date().toISOString().slice(0, 10);
  let from, to;
  if (currentRange === 'day') {
    from = to = today;
  } else if (currentRange === 'week') {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(d.setDate(diff));
    from = mon.toISOString().slice(0, 10);
    to = today;
  } else if (currentRange === 'month') {
    from = today.slice(0, 7) + '-01';
    to = today;
  } else {
    from = $('#dateFrom').value || today;
    to = $('#dateTo').value || today;
  }
  return { dateFrom: from, dateTo: to };
}

async function loadUsers() {
  users = await request(`${API}/users`);
  renderUserList();
  if (currentUserId && !users.some(u => u.id === currentUserId)) currentUserId = '';
  if (!currentUserId && users.length) currentUserId = users[0].id;
}

function renderUserList() {
  const list = $('#userList');
  list.innerHTML = users.map(u => {
    const avatar = u.avatar || '🍳';
    const active = u.id === currentUserId ? ' active' : '';
    return `<li class="user-item${active}" data-id="${u.id}" data-avatar="${escapeHtml(avatar)}">
      <span class="avatar-wrap" title="点击更换头像">${escapeHtml(avatar)}</span>
      <span class="user-name">${escapeHtml(u.name)}</span>
    </li>`;
  }).join('');

  list.querySelectorAll('.user-item').forEach(el => {
    const id = el.dataset.id;
    el.addEventListener('click', e => {
      if (e.target.closest('.avatar-wrap')) {
        editingAvatarUserId = id;
        openAvatarPickerEdit(id);
      } else {
        selectUser(id);
      }
    });
  });
}

function selectUser(id) {
  currentUserId = id;
  renderUserList();
  $('#noUserTip').classList.add('hidden');
  $('#userViewSection').classList.remove('hidden');
  loadRecords();
  updateOverview();
}

function openAvatarPickerEdit(userId) {
  const user = users.find(u => u.id === userId);
  if (!user) return;
  const container = $('#avatarPickerEdit');
  container.innerHTML = AVATAR_OPTIONS.map(emoji => {
    const selected = (user.avatar || '🍳') === emoji ? ' selected' : '';
    return `<button type="button" class="avatar-option${selected}" data-emoji="${escapeHtml(emoji)}">${emoji}</button>`;
  }).join('');
  container.querySelectorAll('.avatar-option').forEach(btn => {
    btn.addEventListener('click', async () => {
      const emoji = btn.dataset.emoji;
      try {
        await request(`${API}/users/${userId}`, {
          method: 'PATCH',
          body: JSON.stringify({ avatar: emoji })
        });
        await loadUsers();
        if (currentUserId === userId) { /* already selected */ }
        $('#modalEditAvatar').classList.add('hidden');
        editingAvatarUserId = null;
      } catch (err) {
        alert(err.message || '更新失败');
      }
    });
  });
  $('#modalEditAvatar').classList.remove('hidden');
}

async function loadRecords() {
  if (!currentUserId) return;
  const params = new URLSearchParams();
  params.set('userId', currentUserId);
  const singleDate = $('#filterDate').value;
  if ($('#userViewSection').classList.contains('hidden')) {
    if (singleDate) params.set('date', singleDate);
  } else {
    const { dateFrom, dateTo } = getDateRange();
    params.set('dateFrom', dateFrom);
    params.set('dateTo', dateTo);
  }
  records = await request(`${API}/records?${params}`);
  renderRecords();
}

function updateOverview() {
  if (!currentUserId) return;
  const { dateFrom, dateTo } = getDateRange();
  const params = new URLSearchParams();
  params.set('userId', currentUserId);
  params.set('dateFrom', dateFrom);
  params.set('dateTo', dateTo);
  request(`${API}/records?${params}`).then(list => renderOverview(list, dateFrom, dateTo));
}

function renderOverview(list, dateFrom, dateTo) {
  const totalPrice = list.reduce((s, r) => s + (Number(r.price) || 0), 0);
  const byMeal = {};
  const byRating = {};
  list.forEach(r => {
    byMeal[r.mealType] = (byMeal[r.mealType] || 0) + 1;
    byRating[r.rating] = (byRating[r.rating] || 0) + 1;
  });
  const mealsHtml = Object.entries(byMeal).map(([k, v]) => `<span><strong>${MEAL_LABELS[k] || k}</strong> ${v} 次</span>`).join('');
  const ratingsHtml = [1, 2, 3, 4, 5].map(r => `<span>${RATING_LABELS[r]}：${byRating[r] || 0}</span>`).join('');
  $('#overviewContent').innerHTML = `
    <div class="overview-item">
      <div class="value">¥${totalPrice.toFixed(2)}</div>
      <div class="label">总消费</div>
    </div>
    <div class="overview-item">
      <div class="value">${list.length}</div>
      <div class="label">记录条数</div>
    </div>
    <div class="overview-meals">${mealsHtml || '—'}</div>
    <div class="overview-ratings">${ratingsHtml}</div>
  `;
}

function renderRecords() {
  const list = $('#recordList');
  if (!records.length) {
    list.innerHTML = '<p class="empty-tip">该时间段暂无记录。</p>';
    return;
  }
  list.innerHTML = records.map(r => {
    const user = users.find(u => u.id === r.userId);
    const userName = user ? user.name : '未知';
    const img = r.imageUrl
      ? `<img class="thumb" src="${escapeHtml(r.imageUrl)}" alt="" />`
      : '<div class="thumb placeholder">🍽️</div>';
    const priceStr = (r.price != null && !Number.isNaN(r.price)) ? `¥${Number(r.price).toFixed(2)}` : '—';
    const reviewStr = (r.review && r.review.trim()) ? escapeHtml(r.review) : '';
    return `
      <div class="record-item" data-id="${r.id}">
        ${img}
        <div class="record-body">
          <div class="record-meta">
            <span class="record-type">${MEAL_LABELS[r.mealType] || r.mealType}</span>
            <span class="record-rating">${RATING_LABELS[r.rating] || r.rating}</span>
            <span class="record-price">${priceStr}</span>
            <span>${escapeHtml(userName)}</span>
          </div>
          <div class="record-desc">${escapeHtml(r.foodDesc) || '（未填写）'}</div>
          ${reviewStr ? `<div class="record-review">${reviewStr}</div>` : ''}
          <div class="record-date">${r.date} ${new Date(r.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
        <div class="record-actions">
          <button type="button" class="btn btn-danger btn-delete" data-id="${r.id}">删除</button>
        </div>
      </div>`;
  }).join('');

  list.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => deleteRecord(btn.dataset.id));
  });
}

function bindRatingUi() {
  const container = $('#ratingOptions');
  if (!container) return;
  container.querySelectorAll('.rating-item').forEach(el => {
    const radio = el.querySelector('input');
    el.addEventListener('click', () => {
      container.querySelectorAll('.rating-item').forEach(c => c.classList.remove('checked'));
      el.classList.add('checked');
      radio.checked = true;
    });
    if (radio.checked) el.classList.add('checked');
  });
}

async function submitRecord(payload, imageFile) {
  const date = $('#filterDate').value || new Date().toISOString().slice(0, 10);
  if (!currentUserId) {
    alert('请先从左侧选择用户');
    return;
  }
  const body = {
    userId: currentUserId,
    date,
    mealType: $('#mealType').value,
    foodDesc: $('#foodDesc').value.trim(),
    rating: parseInt($('input[name="rating"]:checked')?.value || '3', 10),
    price: parseFloat($('#price').value) || 0,
    review: $('#review').value.trim()
  };

  if (imageFile) {
    const form = new FormData();
    form.append('userId', body.userId);
    form.append('date', body.date);
    form.append('mealType', body.mealType);
    form.append('foodDesc', body.foodDesc);
    form.append('rating', body.rating);
    form.append('price', body.price);
    form.append('review', body.review);
    form.append('image', imageFile);
    const res = await fetch(`${API}/records/with-image`, { method: 'POST', body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || res.statusText);
    return data;
  }
  return request(`${API}/records`, { method: 'POST', body: JSON.stringify(body) });
}

async function deleteRecord(id) {
  if (!confirm('确定删除这条记录？')) return;
  await request(`${API}/records/${id}`, { method: 'DELETE' });
  await loadRecords();
  if (currentUserId) updateOverview();
}

function renderAvatarPicker(containerId, selectedEmoji, onSelect) {
  const container = $(containerId);
  if (!container) return;
  container.innerHTML = AVATAR_OPTIONS.map(emoji => {
    const sel = (selectedEmoji || '🍳') === emoji ? ' selected' : '';
    return `<button type="button" class="avatar-option${sel}" data-emoji="${escapeHtml(emoji)}">${emoji}</button>`;
  }).join('');
  container.querySelectorAll('.avatar-option').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.avatar-option').forEach(c => c.classList.remove('selected'));
      btn.classList.add('selected');
      onSelect(btn.dataset.emoji);
    });
  });
}

function init() {
  $('#filterDate').value = new Date().toISOString().slice(0, 10);

  let selectedAvatar = '🍳';
  renderAvatarPicker('#avatarPicker', selectedAvatar, emoji => { selectedAvatar = emoji; });

  $('#formAdd').addEventListener('submit', async e => {
    e.preventDefault();
    const imageFile = $('#imageFile').files[0];
    try {
      await submitRecord(null, imageFile);
      $('#foodDesc').value = '';
      $('#price').value = '';
      $('#review').value = '';
      $('#imageFile').value = '';
      $$('#ratingOptions .rating-item').forEach(c => c.classList.remove('checked'));
      $('.rating-item[data-rating="3"]')?.classList.add('checked');
      $('input[name="rating"][value="3"]').checked = true;
      await loadRecords();
      if (currentUserId) updateOverview();
    } catch (err) {
      alert(err.message || '保存失败');
    }
  });

  $$('.btn-range').forEach(btn => {
    btn.addEventListener('click', () => {
      currentRange = btn.dataset.range;
      $$('.btn-range').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadRecords();
      updateOverview();
    });
  });
  $('#dateFrom').addEventListener('change', () => { currentRange = 'custom'; loadRecords(); updateOverview(); });
  $('#dateTo').addEventListener('change', () => { currentRange = 'custom'; loadRecords(); updateOverview(); });

  $('#btnAddUser').addEventListener('click', () => {
    selectedAvatar = '🍳';
    renderAvatarPicker('#avatarPicker', selectedAvatar, emoji => { selectedAvatar = emoji; });
    $('#modalAddUser').classList.remove('hidden');
    $('#newUserName').value = '';
    $('#newUserName').focus();
  });
  $('#btnCancelUser').addEventListener('click', () => $('#modalAddUser').classList.add('hidden'));
  $('#modalAddUser').addEventListener('click', e => {
    if (e.target.id === 'modalAddUser') e.target.classList.add('hidden');
  });
  $('#formAddUser').addEventListener('submit', async e => {
    e.preventDefault();
    const name = $('#newUserName').value.trim();
    if (!name) return;
    try {
      await request(`${API}/users`, { method: 'POST', body: JSON.stringify({ name, avatar: selectedAvatar }) });
      $('#modalAddUser').classList.add('hidden');
      await loadUsers();
      currentUserId = users.find(u => u.name === name)?.id || users[0]?.id;
      selectUser(currentUserId);
    } catch (err) {
      alert(err.message || '添加失败');
    }
  });

  $('#btnCancelAvatar').addEventListener('click', () => {
    $('#modalEditAvatar').classList.add('hidden');
    editingAvatarUserId = null;
  });
  $('#modalEditAvatar').addEventListener('click', e => {
    if (e.target.id === 'modalEditAvatar') e.target.classList.add('hidden');
  });

  bindRatingUi();
  $('.rating-item[data-rating="3"]')?.classList.add('checked');
  $('input[name="rating"][value="3"]').checked = true;

  (async () => {
    await loadUsers();
    if (currentUserId) {
      $('#noUserTip').classList.add('hidden');
      $('#userViewSection').classList.remove('hidden');
      await loadRecords();
      updateOverview();
    }
  })();
}

init();
