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
const TOKEN_KEY = 'dailymeals_token';
const USER_KEY = 'dailymeals_user';

const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => el.querySelectorAll(sel);

let token = localStorage.getItem(TOKEN_KEY);
let currentUser = null;
let records = [];
let currentRange = 'day';

function getAuthHeaders() {
  const h = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = 'Bearer ' + token;
  return h;
}

async function request(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { ...getAuthHeaders(), ...options.headers }
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    logout();
    showAuthScreen();
    throw new Error(data.error || '请重新登录');
  }
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
  if (currentRange === 'day') from = to = today;
  else if (currentRange === 'week') {
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

function showAuthScreen() {
  $('#authScreen').classList.remove('hidden');
  $('#appScreen').classList.add('hidden');
  token = null;
  currentUser = null;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function showAppScreen() {
  $('#authScreen').classList.add('hidden');
  $('#appScreen').classList.remove('hidden');
  if (currentUser) {
    $('#currentUserAvatar').textContent = currentUser.avatar || '🍳';
    $('#currentUserName').textContent = currentUser.name || '—';
    const adminSection = $('#adminSection');
    const btnAdmin = $('#btnAdminUsers');
    if (currentUser.role === 'admin') {
      adminSection.classList.remove('hidden');
      if (btnAdmin) btnAdmin.style.display = 'block';
      loadAdminUsers();
    } else {
      adminSection.classList.add('hidden');
      if (btnAdmin) btnAdmin.style.display = 'none';
    }
  }
}

async function loadAdminUsers() {
  if (!currentUser || currentUser.role !== 'admin') return;
  try {
    const list = await request(`${API}/users`);
    renderAdminUserList(list);
  } catch (err) {
    $('#adminUserList').innerHTML = '<p class="empty-tip">加载失败或无权访问</p>';
  }
}

function renderAdminUserList(list) {
  const el = $('#adminUserList');
  const countEl = $('#adminUserCount');
  if (countEl) countEl.textContent = list.length ? `当前共 ${list.length} 名用户` : '';
  if (!list.length) {
    el.innerHTML = '<p class="empty-tip">暂无用户</p>';
    return;
  }
  el.innerHTML = list.map(u => {
    const isSelf = u.id === currentUser.id;
    const roleLabel = u.role === 'admin' ? '管理员' : '用户';
    return `
      <div class="admin-user-item" data-id="${u.id}">
        <span class="admin-user-avatar">${escapeHtml(u.avatar || '🍳')}</span>
        <span class="admin-user-name">${escapeHtml(u.name)}</span>
        <span class="admin-user-role">${roleLabel}</span>
        ${isSelf ? '<span class="admin-user-self">（当前）</span>' : `<button type="button" class="btn btn-danger btn-sm btn-delete-user" data-id="${u.id}">删除</button>`}
      </div>`;
  }).join('');
  el.querySelectorAll('.btn-delete-user').forEach(btn => {
    btn.addEventListener('click', () => deleteUser(btn.dataset.id));
  });
}

async function deleteUser(userId) {
  if (!confirm('确定删除该用户？其所有记录也会被删除。')) return;
  try {
    await request(`${API}/users/${userId}`, { method: 'DELETE' });
    await loadAdminUsers();
  } catch (err) {
    alert(err.message || '删除失败');
  }
}

async function loadMe() {
  if (!token) return null;
  try {
    currentUser = await request(`${API}/me`);
    localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
    return currentUser;
  } catch {
    return null;
  }
}

async function loadRecords() {
  const params = new URLSearchParams();
  const { dateFrom, dateTo } = getDateRange();
  params.set('dateFrom', dateFrom);
  params.set('dateTo', dateTo);
  records = await request(`${API}/records?${params}`);
  renderRecords();
}

function updateOverview() {
  const { dateFrom, dateTo } = getDateRange();
  const params = new URLSearchParams();
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

async function submitRecord(imageFile) {
  const date = $('#filterDate').value || new Date().toISOString().slice(0, 10);
  const body = {
    date,
    mealType: $('#mealType').value,
    foodDesc: $('#foodDesc').value.trim(),
    rating: parseInt($('input[name="rating"]:checked')?.value || '3', 10),
    price: parseFloat($('#price').value) || 0,
    review: $('#review').value.trim()
  };

  if (imageFile) {
    const form = new FormData();
    form.append('date', body.date);
    form.append('mealType', body.mealType);
    form.append('foodDesc', body.foodDesc);
    form.append('rating', body.rating);
    form.append('price', body.price);
    form.append('review', body.review);
    form.append('image', imageFile);
    const res = await fetch(`${API}/records/with-image`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token },
      body: form
    });
    const data = await res.json();
    if (res.status === 401) { logout(); showAuthScreen(); throw new Error('请重新登录'); }
    if (!res.ok) throw new Error(data.error || res.statusText);
    return data;
  }
  return request(`${API}/records`, { method: 'POST', body: JSON.stringify(body) });
}

async function deleteRecord(id) {
  if (!confirm('确定删除这条记录？')) return;
  await request(`${API}/records/${id}`, { method: 'DELETE' });
  await loadRecords();
  updateOverview();
}

function logout() {
  if (token) {
    fetch(`${API}/auth/logout`, { method: 'POST', headers: getAuthHeaders() }).catch(() => {});
  }
  token = null;
  currentUser = null;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
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

  // 登录/注册切换
  $$('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.auth-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const isLogin = tab.dataset.tab === 'login';
      $('#formLogin').classList.toggle('hidden', !isLogin);
      $('#formRegister').classList.toggle('hidden', isLogin);
    });
  });

  $('#formLogin').addEventListener('submit', async e => {
    e.preventDefault();
    const name = $('#loginName').value.trim();
    const password = $('#loginPassword').value;
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '登录失败');
      token = data.token;
      currentUser = data.user;
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
      showAppScreen();
      await loadRecords();
      updateOverview();
      if (currentUser.role === 'admin') await loadAdminUsers();
    } catch (err) {
      alert(err.message || '登录失败');
    }
  });

  let selectedAvatar = '🍳';
  renderAvatarPicker('#avatarPickerRegister', selectedAvatar, emoji => { selectedAvatar = emoji; });
  $('#formRegister').addEventListener('submit', async e => {
    e.preventDefault();
    const name = $('#registerName').value.trim();
    const password = $('#registerPassword').value;
    if (password.length < 4) { alert('密码至少 4 位'); return; }
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password, avatar: selectedAvatar })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '注册失败');
      token = data.token;
      currentUser = data.user;
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
      showAppScreen();
      await loadRecords();
      updateOverview();
      if (currentUser.role === 'admin') await loadAdminUsers();
    } catch (err) {
      alert(err.message || '注册失败');
    }
  });

  $('#btnLogout').addEventListener('click', () => {
    logout();
    showAuthScreen();
  });

  $('#btnAdminUsers').addEventListener('click', () => {
    $('#adminSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('#btnEditAvatar').addEventListener('click', () => {
    const container = $('#avatarPickerEdit');
    container.innerHTML = AVATAR_OPTIONS.map(emoji => {
      const sel = (currentUser && (currentUser.avatar || '🍳') === emoji) ? ' selected' : '';
      return `<button type="button" class="avatar-option${sel}" data-emoji="${escapeHtml(emoji)}">${emoji}</button>`;
    }).join('');
    container.querySelectorAll('.avatar-option').forEach(btn => {
      btn.addEventListener('click', async () => {
        const emoji = btn.dataset.emoji;
        try {
          currentUser = await request(`${API}/users/me`, {
            method: 'PATCH',
            body: JSON.stringify({ avatar: emoji })
          });
          localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
          $('#currentUserAvatar').textContent = emoji;
          $('#modalEditAvatar').classList.add('hidden');
        } catch (err) {
          alert(err.message || '更新失败');
        }
      });
    });
    $('#modalEditAvatar').classList.remove('hidden');
  });
  $('#btnCancelAvatar').addEventListener('click', () => $('#modalEditAvatar').classList.add('hidden'));
  $('#modalEditAvatar').addEventListener('click', e => {
    if (e.target.id === 'modalEditAvatar') e.target.classList.add('hidden');
  });

  $('#formAdd').addEventListener('submit', async e => {
    e.preventDefault();
    const imageFile = $('#imageFile').files[0];
    try {
      await submitRecord(imageFile);
      $('#foodDesc').value = '';
      $('#price').value = '';
      $('#review').value = '';
      $('#imageFile').value = '';
      $$('#ratingOptions .rating-item').forEach(c => c.classList.remove('checked'));
      $('.rating-item[data-rating="3"]')?.classList.add('checked');
      $('input[name="rating"][value="3"]').checked = true;
      await loadRecords();
      updateOverview();
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

  bindRatingUi();
  $('.rating-item[data-rating="3"]')?.classList.add('checked');
  $('input[name="rating"][value="3"]').checked = true;

  (async () => {
    if (token) {
      const user = await loadMe();
      if (user) {
        showAppScreen();
        await loadRecords();
        updateOverview();
        if (currentUser.role === 'admin') await loadAdminUsers();
        return;
      }
    }
    showAuthScreen();
  })();
}

init();
