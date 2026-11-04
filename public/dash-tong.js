// =====================================================================
// DASHBOARD TỔNG (chế độ xem ngang của trang Báo cáo)
// Một màn hình: thanh chỉ số → dòng chảy 4 khối nối nhau (I Kế hoạch → II Dòng tiền → III Còn phải thu–chi → IV TĐ1→TĐ3)
// → biểu đồ dòng tiền theo kỳ, cơ cấu chi phí, tình trạng dự án → bảng dự án + bản đồ.
// Số liệu lấy đúng hàm của các mục báo cáo (bTongHopData, bMuc4Data, bSeries, bCostGroups) nên khớp với chế độ Báo cáo.
// =====================================================================
// Bảng màu dashboard: DT xanh dương · CP cam đất · LN xanh ngọc lục · Thu xanh than · Chi vàng nghệ
const DBC = { dt: '#2f6bd8', cp: '#e07b39', ln: '#12a58b', thu: '#1f3b73', chi: '#e0a43a', pt: '#7c5cd6', td: ['#a9c1f0', '#5b8de6', '#12a58b'] };
const DB_COST_COL = ['#2f6bd8', '#e07b39', '#12a58b', '#7c5cd6', '#e0a43a', '#e05780', '#4aa3df', '#94a3b8'];
const DB_TD = [[1, 'TĐ1', 'Hợp đồng'], [2, 'TĐ2', 'Điều chỉnh'], [3, 'TĐ3', 'Mới nhất']];
const DB_ST = [['Chuẩn bị', 'st-chuan-bi', '#d08a1e'], ['Đang thi công', 'st-dang-thi-cong', '#3462a3'], ['Tạm dừng', 'st-tam-dung', '#c0392b'], ['Hoàn thành', 'st-hoan-thanh', '#0f7a4f']];

function bViewUI() {
  $$('#b-view button').forEach((b) => b.classList.toggle('on', b.dataset.view === (BST.view === 'db' ? 'db' : 'bc')));
}

function bDashRender(list, v, one) {
  const vt = v === 'gt' ? 'trước VAT' : 'sau VAT';
  const P = bPeriod(list);
  const { rows, T } = bTongHopData(list, v, { to: '9999-12' });
  const M = bMuc4Data(list, v), MT = M.T, m4 = new Map(M.rows.map((x) => [x.d.id, x]));
  const scope = one ? `${one.ma_du_an} – ${one.ten_du_an}` : `Tất cả dự án (${list.length})`;
  const n = (x) => `<span class="${x < 0 ? 'neg' : ''}">${bTy(x)}</span>`;
  const pc = (a, b) => (b ? bpct(a, b) : '—');
  const bar = (x, max, col) => `<span class="db-bar"><i style="width:${max > 0 ? Math.max(0, Math.min(100, (x / max) * 100)) : 0}%;background:${col}"></i></span>`;
  const dlt = (a, b, good = true) => { const d = a - b; if (Math.abs(d) < 1e6) return '<span class="db-eq">không đổi</span>';
    return `<span class="${(d > 0) === good ? 'db-up' : 'db-dn'}">${d > 0 ? '▲' : '▼'} ${bTy(Math.abs(d))}</span>`; };

  // ---- Thanh chỉ số: nhóm DT – CP – LN theo TĐ đang chọn · nhóm dòng tiền thực tế ----
  const k = [1, 2, 3].includes(Number(BST.db_td)) ? Number(BST.db_td) : 3;
  const tk = MT['t' + k], ck = MT['c' + k], lk = MT['l' + k];
  const tdLab = { 1: 'TĐ1 · hợp đồng', 2: 'TĐ2 · điều chỉnh', 3: 'TĐ3 · mới nhất' }[k];
  const vs = (a, b, good) => (k === 1 ? '<span class="db-eq">kế hoạch lúc ký hợp đồng</span>' : `${dlt(a, b, good)} so với TĐ1`);
  const kpi = (k, lab, val, sub, col) => `<div class="db-kpi" style="--db-c:${col}"><span class="db-kl">${lab}</span>
      <b class="db-kv ${val < 0 ? 'neg' : ''}">${bTy(val)} <small>${TY()}</small></b><span class="db-ks">${sub}</span></div>`;
  const kpis = [
    kpi('dt', 'Doanh thu', tk, vs(tk, MT.t1, true), DBC.dt),
    kpi('cp', 'Chi phí', ck, `Bằng <b>${pc(ck, tk)}</b> doanh thu · ${k === 1 ? 'lúc ký' : dlt(ck, MT.c1, false)}`, DBC.cp),
    kpi('ln', 'Lợi nhuận', lk, `Tỷ suất <b>${pc(lk, tk)}</b>${k === 1 ? '' : ` · ${dlt(lk, MT.l1, true)}`}`, DBC.ln),
  ].join('');
  const kpis2 = [
    kpi('thu', 'Đã thu (tiền về)', T.thu, `Đạt <b>${pc(T.thu, T.hd_sv)}</b> doanh thu`, DBC.thu),
    kpi('chi', 'Đã chi', T.chi, `Bằng <b>${pc(T.chi, T.thu)}</b> dòng thu`, DBC.chi),
    kpi('pt', 'Còn phải thu', T.phai_thu, `Còn lại thực (thu − chi): <b>${n(T.con)}</b>`, DBC.pt),
  ].join('');
  const tdSeg = `<div class="db-tdseg" role="group" aria-label="Chọn thời điểm">${DB_TD.map(([i, a, b]) =>
    `<button type="button" data-dbtd="${i}" class="${i === k ? 'on' : ''}"><b>${a}</b> ${b}</button>`).join('')}</div>`;

  // ---- Dòng chảy 4 khối ----
  const go = (no) => `<button type="button" class="db-go" data-dbgo="${no}">Xem mục ${no} ›</button>`;
  const line = (lab, x, max, col, extra = '') => `<li><span>${lab}</span>${bar(x, max, col)}<b>${n(x)}</b>${extra}</li>`;
  const mx1 = Math.max(T.dt1, T.cp1, 1), mx2 = Math.max(T.thu, T.chi, 1), mx3 = Math.max(T.hd_sv, T.chi, 1);
  const lnPts = [MT.l1, MT.l2, MT.l3], lMax = Math.max(...lnPts.map(Math.abs), 1);
  const step = lnPts.map((x, i) => {
    const h = Math.max(4, (Math.abs(x) / lMax) * 54);
    return `<div class="db-step"><span class="db-sv ${x < 0 ? 'neg' : ''}">${bTy(x)}</span><i style="height:${h}px;background:${DBC.td[i]}"></i>
      <b>TĐ${i + 1}</b><small>${pc(x, [MT.t1, MT.t2, MT.t3][i])}</small></div>`;
  }).join('');
  const blk = (no, cls, title, sub, big, bigLab, body) => `<section class="db-blk ${cls}">
      <header><span class="db-no">${no}</span><div><h4>${title}</h4><p>${sub}</p></div></header>
      <div class="db-big"><span>${bigLab}</span><b class="${big < 0 ? 'neg' : ''}">${bTy(big)} <small>${TY()}</small></b></div>
      ${body}<footer>${go(no)}</footer></section>`;
  // Nối giữa các khối: đường nét đứt + mũi tên tròn (không chữ)
  const arrow = () => `<div class="db-arrow" aria-hidden="true"><i><svg viewBox="0 0 24 24" width="16" height="16"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></i></div>`;
  const flow = [
    blk('I', 'b1', 'Kế hoạch lúc ký', 'TĐ1 – ký hợp đồng', T.ln1, `Lợi nhuận dự kiến · ${pc(T.ln1, T.dt1)}`,
      `<ul class="db-lines">${line('Doanh thu', T.dt1, mx1, DBC.dt)}${line('Chi phí', T.cp1, mx1, DBC.cp)}${line('Lợi nhuận', T.ln1, mx1, DBC.ln)}</ul>
      <div class="db-note2">${rows.filter((x) => x.td1).length}/${rows.length} dự án đã chốt TĐ1 · chi phí bằng <b>${pc(T.cp1, T.dt1)}</b> doanh thu</div>`),
    arrow(),
    blk('II', 'b2', 'Dòng tiền thực tế', `Lũy kế đến hôm nay`, T.con, 'Còn lại (thu − chi)',
      `<ul class="db-lines">${line('Dòng thu', T.thu, mx2, DBC.thu)}${line('Dòng chi', T.chi, mx2, DBC.chi)}${line('Còn lại', T.con, mx2, DBC.ln)}</ul>
      <div class="db-note2">Đã thu <b>${pc(T.thu, T.hd_sv)}</b> doanh thu HĐ · không gồm tiền vay, trả nợ gốc</div>`),
    arrow(),
    blk('III', 'b3', 'Còn phải thu – chi', 'Doanh thu mới nhất − thực chi', T.hd_sv - T.chi, `Còn lại · thực chi ${pc(T.chi, T.hd_sv)} DT`,
      `<ul class="db-lines">${line('Doanh thu', T.hd_sv, mx3, DBC.dt)}${line('Thực chi', T.chi, mx3, DBC.cp)}${line('Còn lại', T.hd_sv - T.chi, mx3, DBC.ln)}</ul>
      <div class="db-note2">Còn phải thu CĐT <b>${n(T.phai_thu)}</b> ${TY()} (doanh thu − đã thu)</div>`),
    arrow(),
    blk('IV', 'b4', 'Lợi nhuận TĐ1 → TĐ3', 'Hợp đồng → điều chỉnh → quyết toán', MT.l3, `LN mới nhất · ${dlt(MT.l3, MT.l1)}`,
      `<div class="db-steps">${step}</div>`),
  ].join('');

  // ---- Tình trạng dự án ----
  const stc = DB_ST.map(([t, cls, col]) => ({ t, cls, col, n: list.filter((d) => d.trang_thai === t).length })).filter((x) => x.n);
  const avg = list.length ? Math.round(list.reduce((a, d) => a + (Number(d.tien_do) || 0), 0) / list.length) : 0;
  const top = M.rows.slice().sort((a, b) => b.l3 - a.l3).slice(0, 8);
  const tMax = Math.max(...top.map((x) => Math.abs(x.l3)), 1);
  const stHtml = `<div class="db-stbar">${stc.map((x) => `<i style="flex:${x.n};background:${x.col}" title="${x.t}: ${x.n} dự án"></i>`).join('')}</div>
    <div class="db-stl">${stc.map((x) => `<span class="st ${x.cls}">${x.t} · ${x.n}</span>`).join('')}</div>
    <div class="db-avg">Tiến độ bình quân <b>${avg}%</b>${bar(avg, 100, DBC.thu)}</div>
    <div class="db-sub-h">Lợi nhuận cao nhất (mới nhất)</div>
    <ol class="db-top">${top.map((x) => `<li><span><b>${esc(x.d.ma_du_an)}</b> ${esc(x.d.ten_du_an)}</span>${bar(x.l3, tMax, DBC.ln)}<em>${n(x.l3)}</em><small>${pc(x.l3, x.t3)}</small></li>`).join('') || '<li class="muted">Chưa có số liệu</li>'}</ol>`;

  // ---- Bảng dự án ----
  const tRows = rows.map((x, i) => {
    const q = m4.get(x.d.id) || { t3: 0, l3: 0 };
    const qt = q['t' + k] || 0, ql = q['l' + k] || 0;
    const ts = qt ? ql / qt : 0, th = x.hd_sv ? x.thu / x.hd_sv : 0;
    return `<tr class="db-row" data-dbrow="${x.d.id}" title="Bấm để xem vị trí trên bản đồ"><td class="num db-stt">${i + 1}</td><td class="db-ma"><button type="button" class="db-lnk" data-dbprj="${x.d.id}" title="Xem dashboard riêng dự án ${esc(x.d.ma_du_an)}">${esc(x.d.ma_du_an)} ›</button></td><td class="db-ten" title="${esc(x.d.ten_du_an)}">${esc(x.d.ten_du_an)}</td>
      <td><span class="st st-${slug(x.d.trang_thai)}">${esc(x.d.trang_thai)}</span></td>
      <td class="num">${bTy(qt)}</td><td class="num strong ${ql < 0 ? 'neg' : 'pos'}">${bTy(ql)}</td>
      <td class="db-pc">${bar(ts, 0.3, ts < 0 ? '#d92d35' : DBC.ln)}<b>${pc(ql, qt)}</b></td>
      <td class="db-pc">${bar(th, 1, DBC.thu)}<b>${pc(x.thu, x.hd_sv)}</b></td>
      <td class="num">${n(x.phai_thu)}</td></tr>`;
  }).join('');
  const tFoot = `<tr><td></td><td colspan="3">Tổng cộng (${rows.length} dự án)</td><td class="num">${bTy(tk)}</td><td class="num">${n(lk)}</td>
      <td class="db-pc"><b>${pc(lk, tk)}</b></td><td class="db-pc"><b>${pc(T.thu, T.hd_sv)}</b></td><td class="num">${n(T.phai_thu)}</td></tr>`;

  const now = new Date();
  $('#b-report').innerHTML = `
  <div class="db">
    <div class="db-head">
      <div class="db-brand"><img src="/img/logo-icon.png" alt=""><div>
        <div class="db-co">${esc(BC.ten_cong_ty || '')}</div>
        <h1>DASHBOARD TỔNG HỢP DỰ ÁN</h1>
        <div class="db-meta">${esc(scope)} · Kỳ biểu đồ: ${esc(P.label)} · ${vt} · Đơn vị: ${TYD()} · Cập nhật ${now.toLocaleString('vi-VN')}</div>
      </div></div>
      <div class="db-hst">${stc.map((x) => `<span class="st ${x.cls}">${x.t} <b>${x.n}</b></span>`).join('')}</div>
    </div>
    <div class="db-kpis">
      <section class="db-kg"><div class="db-kgh"><span>Doanh thu – Chi phí – Lợi nhuận</span>${tdSeg}</div><div class="db-kgr">${kpis}</div></section>
      <section class="db-kg db-kg2"><div class="db-kgh"><span>Dòng tiền thực tế · lũy kế đến hôm nay</span></div><div class="db-kgr">${kpis2}</div></section>
    </div>
    <div class="db-flow">${flow}</div>
    <div class="db-row2">
      <section class="db-card db-c-flow"><h5>Dòng tiền theo kỳ <small>${esc(P.label)} · thu gồm tiền về + vay</small></h5><div id="db-ch-flow" class="chart"></div></section>
      <section class="db-card db-c-cost"><h5>Cơ cấu chi phí <small>theo nhóm · ${vt}</small></h5><div id="db-ch-cost"></div></section>
      <section class="db-card db-c-st"><h5>Tình trạng dự án <small>${list.length} dự án</small></h5>${stHtml}</section>
    </div>
    <div class="db-row3">
      <section class="db-card db-c-tbl"><h5>Danh mục dự án <small>doanh thu, lợi nhuận theo ${tdLab} · đã thu so với doanh thu</small></h5>
        <div class="table-wrap"><table class="db-table no-mcard"><thead><tr><th class="num">STT</th><th>Mã DA</th><th>Tên dự án</th><th>Tình trạng</th>
          <th class="num">Doanh thu ${'TĐ' + k}</th><th class="num">Lợi nhuận ${'TĐ' + k}</th><th>Tỷ suất LN</th><th>Đã thu / DT</th><th class="num">Còn phải thu</th></tr></thead>
          <tbody>${tRows}</tbody><tfoot>${tFoot}</tfoot></table></div></section>
      <section class="db-card db-c-map"><h5>Bản đồ dự án <small>vòng tròn = doanh thu</small></h5>
        <div class="map-box"><div id="b-map" class="map-c db-mapc" role="region" aria-label="Bản đồ phân bổ dự án"></div></div></section>
    </div>
    <p class="db-note muted small">Số liệu cùng nguồn với chế độ Báo cáo: khối I = mục I (TĐ1), II = mục II, III = mục III, IV và thanh chỉ số = mục IV (đã quyết toán lấy TĐ3, chưa quyết toán tạm tính theo TĐ2). Bấm "Xem mục" để mở phần chi tiết tương ứng.</p>
  </div>`;

  // ---- Biểu đồ ----
  bColChart($('#db-ch-flow'), bSeries(list, v, P), [{ key: 'thu', name: 'Thu', color: DBC.dt }, { key: 'chi', name: 'Chi', color: DBC.chi }],
    { height: 300, tipExtra: (p) => `<tr class="sum"><td>Chênh lệch</td><td class="${p.thu - p.chi < 0 ? 'neg' : ''}">${bn(p.thu - p.chi)}</td></tr>` });
  const cg = bCostGroups(list, v);
  bDonut($('#db-ch-cost'), cg.map((x, i) => ({ label: x.ten, val: x.val, color: DB_COST_COL[i % DB_COST_COL.length] })));
  if (typeof bMapInit === 'function') bMapInit(list, v);
}

// Chọn TĐ cho nhóm DT – CP – LN (và cột của bảng dự án)
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-dbtd]'); if (!b) return;
  BST.db_td = Number(b.dataset.dbtd); bSave(); renderKeepPos('[data-dbtd="' + b.dataset.dbtd + '"]');
});
// Bảng Danh mục dự án: bấm Mã DA -> dashboard riêng dự án đó; bấm dòng -> bản đồ bay tới dự án, mở thông tin
document.addEventListener('click', (e) => {
  const pj = e.target.closest('[data-dbprj]');
  if (pj) { BST.project = pj.dataset.dbprj; bSave(); renderReport(); document.getElementById('b-report')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
  const tr = e.target.closest('tr[data-dbrow]'); if (!tr) return;
  const k = bMapObj?._bks?.MK.get(Number(tr.dataset.dbrow));
  document.querySelectorAll('.db-row.on').forEach((x) => x.classList.toggle('on', x === tr)); tr.classList.add('on');
  if (!k) { showTip?.('Dự án chưa có tọa độ trên bản đồ', e.clientX, e.clientY); setTimeout(() => hideTip?.(), 1500); return; }
  bMapObj._bks.khoa?.();
  document.querySelector('.db-c-map')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  bMapObj.flyTo(k.c.getLatLng(), Math.max(bMapObj.getZoom(), 15), { duration: 0.8 }); bMapObj.once('moveend', () => k.c.openPopup());
});
// Chuyển chế độ xem Báo cáo / Dashboard
document.getElementById('b-view')?.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-view]'); if (!b) return;
  BST.view = b.dataset.view === 'db' ? 'db' : 'bc'; bSave(); renderReport();
});
// "Xem mục X" trên dashboard: sang chế độ Báo cáo và cuộn tới mục đó
document.addEventListener('click', (e) => {
  const g = e.target.closest('[data-dbgo]'); if (!g) return;
  const no = g.dataset.dbgo;
  BST.view = 'bc'; bSave(); renderReport();
  setTimeout(() => {
    const h = [...document.querySelectorAll('#b-report .th-head')].find((x) => x.querySelector('.th-no')?.textContent.trim() === no);
    if (h) { h.scrollIntoView({ behavior: 'smooth', block: 'start' }); h.classList.add('db-flash'); setTimeout(() => h.classList.remove('db-flash'), 1600); }
  }, 120);
});
