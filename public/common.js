// Hàm dùng chung cho mọi trang
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function api(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch', ...(opts.headers || {}) },
    credentials: 'same-origin',
  });
  if (res.status === 401 && !url.startsWith('/api/auth/login') && location.pathname === '/') {
    location.href = '/login';
    throw new Error('Phiên đăng nhập hết hạn');
  }
  if (res.status === 204) return null;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body.errors || ['Lỗi ' + res.status]).join('\n'));
  return body;
}

function showMsg(el, text, type = 'ok') {
  el.textContent = text;
  el.className = 'msg ' + (text ? type : '');
}

const formData = (form) => Object.fromEntries(new FormData(form));

function dbWarning(meta) {
  if (meta.moi_truong === 'staging') {
    const st = document.createElement('div');
    st.className = 'env-bar';
    st.textContent = 'HỆ THỐNG THỬ NGHIỆM (STAGING) – dữ liệu tại đây chỉ dùng để kiểm tra, không phải số liệu chính thức';
    document.body.prepend(st);
    document.title = '[TEST] ' + document.title;
  }
  if (meta.db !== 'memory') return;
  const div = document.createElement('div');
  div.className = 'warn-bar';
  div.textContent = 'Cảnh báo: chưa kết nối PostgreSQL (DATABASE_URL rỗng). Dữ liệu và tài khoản chỉ lưu tạm, sẽ mất khi máy chủ khởi động lại.';
  document.body.prepend(div);
}

// ---------- Kiểm tra độ mạnh mật khẩu (cùng quy tắc với máy chủ lib/validate.js) ----------
const PW_RULES = [
  [(p) => p.length >= 8, 'Tối thiểu 8 ký tự'],
  [(p) => /[A-Z]/.test(p), 'Chữ viết hoa (A–Z)'],
  [(p) => /[a-z]/.test(p), 'Chữ viết thường (a–z)'],
  [(p) => /\d/.test(p), 'Chữ số (0–9)'],
  [(p) => /[^A-Za-z0-9\s]/.test(p), 'Ký tự đặc biệt (!@#$%...)'],
  [(p) => !/\s/.test(p), 'Không có khoảng trắng'],
];

// Gắn danh sách điều kiện dưới ô mật khẩu; trả về hàm kiểm tra hợp lệ
function attachPwChecklist(input) {
  if (!input) return () => true;
  const box = document.createElement('ul');
  box.className = 'pw-rules';
  input.insertAdjacentElement('afterend', box);
  const render = () => {
    const p = input.value;
    box.hidden = !p && !input.required && document.activeElement !== input;
    box.innerHTML = PW_RULES.map(([t, label]) => `<li class="${t(p) ? 'ok' : ''}">${label}</li>`).join('');
    const ok = PW_RULES.every(([t]) => t(p));
    input.setCustomValidity(p && !ok ? 'Mật khẩu chưa đủ mạnh, xem các điều kiện bên dưới' : '');
    return ok;
  };
  input.addEventListener('input', render);
  input.addEventListener('focus', render);
  input.addEventListener('blur', render);
  input.form?.addEventListener('reset', () => setTimeout(render));
  render();
  return () => !input.value || render();
}

// ---------- Đơn vị hiển thị số tiền (chọn ở thanh trên cùng, lưu theo trình duyệt) ----------
// 'auto' = mỗi màn hình theo đơn vị mặc định của nó (nhập liệu: đồng · HĐ đầu vào: triệu · báo cáo: tỷ).
// Chỉ đổi cách HIỂN THỊ; ô nhập liệu, xuất Excel/PowerPoint/PDF giữ đơn vị gốc. Rê chuột vào số để xem số đồng đầy đủ.
const DV = {
  dong: { k: 1, ten: 'đồng', ngan: 'đ', d: [0, 0] },
  nghin: { k: 1e3, ten: 'nghìn đồng', ngan: 'nghìn', d: [0, 0] },
  trieu: { k: 1e6, ten: 'triệu đồng', ngan: 'tr', d: [0, 2] },
  ty: { k: 1e9, ten: 'tỷ đồng', ngan: 'tỷ', d: [2, 2] },
};
let DV_CHON = 'auto';
try { const x = localStorage.getItem('dv_tien'); if (DV[x]) DV_CHON = x; } catch {}
const dvKey = (def) => (DV_CHON === 'auto' ? def : DV_CHON);
const dvU = (def) => DV[dvKey(def)];
const DV_NF = new Map();
// Số theo đơn vị đang chọn; autoD = số lẻ riêng của màn hình khi để Tự động
function dvNum(n, def, autoD) {
  const u = dvU(def), [a, b] = (DV_CHON === 'auto' && autoD) || u.d, key = `${a}-${b}`;
  if (!DV_NF.has(key)) DV_NF.set(key, new Intl.NumberFormat('vi-VN', { minimumFractionDigits: a, maximumFractionDigits: b }));
  const x = DV_NF.get(key).format((Number(n) || 0) / u.k);
  return /^-0(,0+)?$/.test(x) ? x.slice(1) : x;
}

// ---------- Ô nhập tiền: hiển thị 1.234.567, cho phép số âm (phụ lục giảm) ----------
const moneyFmt = new Intl.NumberFormat('vi-VN');
const parseMoney = (s) => {
  const t = String(s ?? '').trim();
  const neg = t.startsWith('-');
  const digits = t.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  return digits ? (neg ? '-' : '') + digits : (neg ? '-' : '');
};
function formatMoneyInput(input) {
  const raw = parseMoney(input.value);
  const fromEnd = input.value.length - (input.selectionStart ?? input.value.length);
  input.value = raw === '' || raw === '-' ? raw : moneyFmt.format(Number(raw));
  const pos = Math.max(0, input.value.length - fromEnd);
  try { input.setSelectionRange(pos, pos); } catch {}
}
function attachMoneyInput(input) {
  input.setAttribute('inputmode', 'numeric');
  input.setAttribute('autocomplete', 'off');
  input.addEventListener('input', () => formatMoneyInput(input));
}

// ---------- Ô ngày dd/mm/yyyy (không phụ thuộc ngôn ngữ trình duyệt) ----------
// Trả về: '' nếu trống, 'YYYY-MM-DD' nếu hợp lệ, null nếu sai
function dmyToIso(s) {
  s = String(s ?? '').trim();
  if (!s) return '';
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (y < 1900 || y > 2200 || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
const isoToDmy = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '');

function attachDateInput(input) {
  input.setAttribute('placeholder', 'dd/mm/yyyy');
  input.setAttribute('maxlength', '10');
  input.setAttribute('inputmode', 'numeric');
  input.setAttribute('autocomplete', 'off');
  input.addEventListener('input', (e) => {
    if (e.inputType && e.inputType.startsWith('delete')) return;
    const digits = input.value.replace(/\D/g, '').slice(0, 8);
    let v = digits.slice(0, 2);
    if (digits.length > 2) v += '/' + digits.slice(2, 4);
    if (digits.length > 4) v += '/' + digits.slice(4);
    if (digits.length === 2 || digits.length === 4) v += '/';
    input.value = v;
  });
  input.addEventListener('blur', () => {
    input.classList.toggle('invalid', dmyToIso(input.value) === null);
  });  attachDatePicker(input);
}

// Nút lịch cạnh ô ngày: bấm để chọn ngày trên lịch, vẫn nhập tay được; chọn xong điền dd/mm/yyyy vào ô
function attachDatePicker(input) {
  if (input.dataset.dmyPick || input.disabled || input.readOnly) return;
  input.dataset.dmyPick = '1';
  const wrap = document.createElement('span');
  wrap.className = 'dmy-wrap';
  input.parentNode.insertBefore(wrap, input);
  wrap.appendChild(input);
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'dmy-btn'; btn.tabIndex = -1; btn.title = 'Chọn ngày trên lịch';
  btn.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  const cal = document.createElement('input');
  cal.type = 'date'; cal.className = 'dmy-cal'; cal.tabIndex = -1; cal.setAttribute('aria-hidden', 'true');
  wrap.append(btn, cal);
  btn.addEventListener('click', () => {
    const iso = dmyToIso(input.value);
    cal.value = iso || ''; // ô trống: lịch vẫn mở ở tháng hiện tại; không điền sẵn để nút "Hôm nay" luôn ghi nhận
    try { if (cal.showPicker) return cal.showPicker(); } catch {}
    cal.focus(); cal.click();
  });
  const pick = () => {
    if (!cal.value || isoToDmy(cal.value) === input.value) return;
    input.value = isoToDmy(cal.value);
    input.classList.remove('invalid');
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.focus();
  };
  cal.addEventListener('change', pick);
  cal.addEventListener('input', pick);
}

// ---------- Ô nhập có danh sách gợi ý (tự làm, thay datalist): bấm vào ô luôn hiện đủ danh sách,
// gõ để lọc; đã chọn 1 mục vẫn bấm lại để chọn mục khác. getItems() -> [{ v, sub, top }] ----------
function attachCombo(input, getItems, onPick) {
  if (input.dataset.combo) return;
  input.dataset.combo = '1';
  input.setAttribute('autocomplete', 'off');
  input.removeAttribute('list');
  const wrap = document.createElement('span');
  wrap.className = 'cb-wrap';
  input.parentNode.insertBefore(wrap, input);
  wrap.appendChild(input);
  const list = document.createElement('ul');
  list.className = 'cb-list'; list.hidden = true;
  wrap.appendChild(list);
  let all = false, idx = -1;
  const norm = (x) => (typeof normVn === 'function' ? normVn(x) : String(x).toLowerCase());
  const render = () => {
    const items = getItems() || [];
    if (!items.length) { list.hidden = true; return; }
    const q = norm(input.value);
    const exact = items.some((x) => norm(x.v) === q);
    const show = all || !q || exact ? items : items.filter((x) => norm(x.v).includes(q));
    if (!show.length) { list.hidden = true; return; }
    idx = -1;
    list.innerHTML = show.slice(0, 80).map((x) => `<li data-v="${esc(x.v)}" class="${x.top ? 'top' : ''} ${norm(x.v) === q ? 'on' : ''}"><b>${esc(x.v)}</b>${x.sub ? `<span>${esc(x.sub)}</span>` : ''}</li>`).join('');
    list.hidden = false;
  };
  const choose = (v) => { input.value = v; list.hidden = true; input.dispatchEvent(new Event('input', { bubbles: true })); onPick?.(v); };
  input.addEventListener('focus', () => { all = true; render(); });
  input.addEventListener('click', () => { all = true; render(); });
  input.addEventListener('input', (e) => { if (e.isTrusted) { all = false; render(); } });
  input.addEventListener('keydown', (e) => {
    if (list.hidden) return;
    const li = [...list.children];
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); idx = (idx + (e.key === 'ArrowDown' ? 1 : -1) + li.length) % li.length; li.forEach((x, i) => x.classList.toggle('hl', i === idx)); li[idx]?.scrollIntoView({ block: 'nearest' }); }
    else if (e.key === 'Enter' && idx >= 0) { e.preventDefault(); choose(li[idx].dataset.v); }
    else if (e.key === 'Escape') list.hidden = true;
  });
  list.addEventListener('mousedown', (e) => { const li = e.target.closest('li'); if (li) { e.preventDefault(); choose(li.dataset.v); } });
  input.addEventListener('blur', () => setTimeout(() => { list.hidden = true; }, 120));
  input._cbRender = render;
}

// ---------- Ô tìm kiếm có gợi ý (chọn từ danh sách) ----------
// getOptions() -> [{ id, label, sub }]; ô ẩn hiddenInput lưu id đã chọn
const normVn = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/\s+/g, ' ').trim();

function attachAutocomplete(input, hiddenInput, getOptions) {
  const wrap = document.createElement('div');
  wrap.className = 'ac';
  input.parentNode.insertBefore(wrap, input);
  wrap.appendChild(input);
  const list = document.createElement('ul');
  list.className = 'ac-list';
  list.hidden = true;
  wrap.appendChild(list);
  input.setAttribute('autocomplete', 'off');
  input.setAttribute('role', 'combobox');
  let items = [];
  let active = -1;

  const choose = (opt) => {
    input.value = opt ? opt.label : '';
    hiddenInput.value = opt ? opt.id : '';
    input.classList.toggle('ac-ok', Boolean(opt));
    input.classList.remove('invalid');
    list.hidden = true;
  };
  const render = () => {
    const q = normVn(input.value);
    const all = getOptions();
    items = all.filter((o) => !q || normVn(o.label + ' ' + (o.sub || '')).includes(q)).slice(0, 50);
    active = items.length ? 0 : -1;
    list.innerHTML = items.length
      ? items.map((o, i) => `<li data-i="${i}" class="${i === active ? 'active' : ''}"><b>${esc(o.label)}</b>${o.sub ? `<span>${esc(o.sub)}</span>` : ''}</li>`).join('')
      : `<li class="ac-empty">${all.length ? 'Không tìm thấy' : 'Chưa có HĐ nào ở mục 1'}</li>`;
    list.hidden = false;
  };
  const highlight = () => $$('li[data-i]', list).forEach((li) => li.classList.toggle('active', Number(li.dataset.i) === active));

  input.addEventListener('focus', render);
  input.addEventListener('input', () => { hiddenInput.value = ''; input.classList.remove('ac-ok'); render(); });
  input.addEventListener('keydown', (e) => {
    if (list.hidden) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(items.length - 1, active + 1); highlight(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(0, active - 1); highlight(); }
    else if (e.key === 'Enter') { if (active >= 0) { e.preventDefault(); choose(items[active]); } }
    else if (e.key === 'Escape') { list.hidden = true; }
  });
  list.addEventListener('mousedown', (e) => {
    const li = e.target.closest('li[data-i]');
    if (li) { e.preventDefault(); choose(items[Number(li.dataset.i)]); }
  });
  input.addEventListener('blur', () => {
    list.hidden = true;
    if (hiddenInput.value) return;
    // Gõ đúng nguyên văn một số HĐ/PL thì tự chọn
    const exact = getOptions().filter((o) => normVn(o.label) === normVn(input.value));
    if (exact.length === 1) choose(exact[0]);
    else if (input.value.trim()) input.classList.add('invalid');
  });
  return { set: (id) => choose(getOptions().find((o) => o.id === Number(id)) || null), clear: () => choose(null) };
}

// ---------- Danh sách chọn nhanh (nhấp đúp hoặc phím ↓), vẫn cho gõ tự do ----------
// getOptions() -> [{ value, label, sub }]; onPick(option) khi chọn
function attachQuickPicker(input, getOptions, onPick, emptyText = 'Chưa có dữ liệu') {
  const wrap = document.createElement('div');
  wrap.className = 'ac';
  input.parentNode.insertBefore(wrap, input);
  wrap.appendChild(input);
  const list = document.createElement('ul');
  list.className = 'ac-list';
  list.hidden = true;
  wrap.appendChild(list);
  let items = [];
  let active = 0;
  const open = () => {
    items = getOptions();
    active = 0;
    list.innerHTML = items.length
      ? items.map((o, i) => `<li data-i="${i}" class="${i === 0 ? 'active' : ''}"><b>${esc(o.label)}</b>${o.sub ? `<span>${esc(o.sub)}</span>` : ''}</li>`).join('')
      : `<li class="ac-empty">${esc(emptyText)}</li>`;
    list.hidden = false;
  };
  const close = () => { list.hidden = true; };
  const pick = (o) => { close(); if (o) onPick(o); };
  const highlight = () => $$('li[data-i]', list).forEach((li) => li.classList.toggle('active', Number(li.dataset.i) === active));
  input.addEventListener('dblclick', (e) => { e.preventDefault(); open(); });
  input.addEventListener('keydown', (e) => {
    if (list.hidden) { if (e.key === 'ArrowDown') { e.preventDefault(); open(); } return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(items.length - 1, active + 1); highlight(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(0, active - 1); highlight(); }
    else if (e.key === 'Enter') { e.preventDefault(); pick(items[active]); }
    else if (e.key === 'Escape') close();
  });
  input.addEventListener('input', close);
  input.addEventListener('blur', close);
  list.addEventListener('mousedown', (e) => {
    const li = e.target.closest('li[data-i]');
    if (li) { e.preventDefault(); pick(items[Number(li.dataset.i)]); }
  });
  return { open, close };
}

// ---------- Hộp nhập Passcode 8 số (ẩn ký tự) ----------
// Trả về Promise<string|null>: passcode hoặc null nếu hủy
function askPasscode(title, detail = '') {
  return new Promise((resolve) => {
    const dlg = document.createElement('dialog');
    dlg.className = 'pass-dlg';
    dlg.innerHTML = `
      <form method="dialog" class="stack">
        <h3>${esc(title)}</h3>
        ${detail ? `<p class="muted small">${esc(detail)}</p>` : ''}
        <label>Passcode xóa (8 số)
          <input name="pc" type="password" inputmode="numeric" maxlength="8" autocomplete="off" pattern="\\d{8}" required placeholder="••••••••">
        </label>
        <div class="msg err" role="alert"></div>
        <div class="actions">
          <button type="submit" class="danger-solid">Xác nhận xóa</button>
          <button type="button" data-cancel>Hủy</button>
        </div>
      </form>`;
    document.body.appendChild(dlg);
    const input = dlg.querySelector('[name=pc]');
    const done = (v) => { dlg.close(); dlg.remove(); resolve(v); };
    input.addEventListener('input', () => { input.value = input.value.replace(/\D/g, '').slice(0, 8); });
    dlg.querySelector('[data-cancel]').addEventListener('click', () => done(null));
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); done(null); });
    dlg.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      if (!/^\d{8}$/.test(input.value)) { dlg.querySelector('.msg').textContent = 'Passcode phải gồm đúng 8 chữ số'; return; }
      done(input.value);
    });
    dlg.showModal();
    input.focus();
  });
}

// ---------------------------------------------------------------------
// Điện thoại: bảng số liệu hiện thành thẻ (mỗi dòng = 1 thẻ "nhãn cột : giá trị"), không phải cuộn ngang.
// Gắn nhãn từ tiêu đề bảng (hỗ trợ tiêu đề nhiều tầng có colspan/rowspan: "THU · Kế hoạch").
// Áp cho bảng trong .table-wrap và .pc-tbl; bỏ qua bảng có class no-mcard. Giao diện máy tính giữ nguyên.
// ---------------------------------------------------------------------
function mcardLabels(table) {
  const head = table.tHead;
  if (!head) return;
  const grid = []; // grid[r][c] = ô tiêu đề
  [...head.rows].forEach((tr, r) => {
    grid[r] ||= [];
    let c = 0;
    for (const th of tr.cells) {
      while (grid[r][c]) c++;
      for (let i = 0; i < th.rowSpan; i++) for (let j = 0; j < th.colSpan; j++) (grid[r + i] ||= [])[c + j] = th;
      c += th.colSpan;
    }
  });
  const ncol = Math.max(0, ...grid.map((row) => row.length));
  const txt = (th) => (th ? th.textContent.replace(/\s+/g, ' ').trim() : '');
  const labels = [];
  for (let c = 0; c < ncol; c++) {
    const parts = [];
    for (const row of grid) { const t = txt(row[c]); if (t && !parts.includes(t)) parts.push(t); }
    labels.push(parts.join(' · '));
  }
  const key = labels.join('|');
  for (const body of [...table.tBodies, table.tFoot].filter(Boolean)) {
    for (const tr of body.rows) {
      if (tr.dataset.mc === key && tr.cells.length === Number(tr.dataset.mcn)) continue; // đã gắn
      let c = 0, title = false;
      for (const td of tr.cells) {
        const lab = td.colSpan > 1 && td.colSpan >= ncol - 1 ? '' : labels[c] || '';
        td.dataset.label = lab;
        td.classList.toggle('m-no', /^(#|STT)$/i.test(lab));
        td.classList.toggle('m-act', !td.textContent.trim() && !!td.querySelector('button, a'));
        td.classList.toggle('m-span', td.colSpan > 1 && !lab);
        const isTitle = !title && lab && !/^(#|STT)$/i.test(lab) && td.textContent.trim();
        td.classList.toggle('m-title', Boolean(isTitle));
        if (isTitle) title = true;
        c += td.colSpan;
      }
      tr.dataset.mc = key; tr.dataset.mcn = tr.cells.length;
    }
  }
}
(function mcardInit() {
  const SEL = '.table-wrap > table:not(.no-mcard), table.pc-tbl:not(.no-mcard)';
  let queued = false;
  const run = () => {
    queued = false;
    document.querySelectorAll(SEL).forEach((t) => { t.classList.add('m-card'); mcardLabels(t); });
  };
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(run); } };
  const start = () => { run(); new MutationObserver(queue).observe(document.body, { childList: true, subtree: true }); };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start) : start();
})();

// ---------- Thiết bị cảm ứng (điện thoại, máy tính bảng): chạm 1 lần vào ô có chú thích -> hiện bong bóng thông tin ----------
// Máy tính vẫn dùng chú thích khi rê chuột (title). Nút, liên kết, ô nhập giữ nguyên chức năng bấm.
(function tapTips() {
  if (!window.matchMedia || !matchMedia('(hover: none)').matches) return;
  let tip = null;
  const hide = () => { if (tip) { tip.remove(); tip = null; } };
  document.addEventListener('click', (e) => {
    if (e.target.closest('.tap-tip')) return hide();
    const el = e.target.closest('[title], [data-tip]');
    if (!el || el.closest('button, a, input, select, textarea, label, summary, [data-thtd], [data-ivtd], [data-dc], [data-tdtip]')) return hide();
    const text = el.dataset.tip || el.getAttribute('title');
    if (!text) return hide();
    el.dataset.tip = text; el.removeAttribute('title'); // bỏ chú thích mặc định của trình duyệt
    if (tip && tip._el === el) return hide();
    hide();
    tip = document.createElement('div');
    tip.className = 'tap-tip'; tip.setAttribute('role', 'tooltip'); tip.textContent = text; tip._el = el;
    document.body.appendChild(tip);
    const r = el.getBoundingClientRect(), t = tip.getBoundingClientRect(), vw = document.documentElement.clientWidth;
    const left = Math.min(Math.max(8, r.left + r.width / 2 - t.width / 2), vw - t.width - 8);
    const above = r.top - t.height - 12 >= 8;
    tip.style.left = `${left}px`;
    tip.style.top = `${above ? r.top - t.height - 10 : r.bottom + 10}px`;
    tip.classList.add(above ? 'up' : 'down');
    tip.style.setProperty('--ax', `${Math.min(Math.max(14, r.left + r.width / 2 - left), t.width - 14)}px`);
  });
  ['scroll', 'resize', 'touchmove'].forEach((ev) => window.addEventListener(ev, hide, { passive: true, capture: true }));
  document.addEventListener('touchstart', (e) => { if (tip && !e.target.closest('.tap-tip') && e.target !== tip._el) hide(); }, { passive: true, capture: true });
})();
