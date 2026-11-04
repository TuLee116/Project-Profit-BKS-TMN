// =====================================================================
// DASHBOARD TỔNG (chế độ xem ngang của trang Báo cáo)
// Một màn hình: thanh chỉ số → dòng chảy 4 khối nối nhau (I Kế hoạch → II Dòng tiền → III Còn phải thu–chi → IV TĐ1→TĐ3)
// → biểu đồ dòng tiền theo kỳ, cơ cấu chi phí, tình trạng dự án → bảng dự án + bản đồ.
// Số liệu lấy đúng hàm của các mục báo cáo (bTongHopData, bMuc4Data, bSeries, bCostGroups) nên khớp với chế độ Báo cáo.
// =====================================================================
const DB_COST_COL = ['#3462a3', '#b07338', '#2a9d8f', '#7e5aa6', '#c9a96a', '#a3485e', '#5f7a2e', '#8a94a6'];
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

  // ---- Thanh chỉ số ----
  const kpi = (k, lab, val, sub, col) => `<div class="db-kpi" style="--db-c:${col}"><span class="db-kl">${lab}</span>
      <b class="db-kv ${val < 0 ? 'neg' : ''}">${bTy(val)} <small>${TY()}</small></b><span class="db-ks">${sub}</span></div>`;
  const kpis = [
    kpi('dt', 'Doanh thu · mới nhất', MT.t3, `${dlt(MT.t3, MT.t1)} so với lúc ký`, '#3462a3'),
    kpi('cp', 'Chi phí · mới nhất', MT.c3, `${dlt(MT.c3, MT.c1, false)} so với lúc ký`, '#b07338'),
    kpi('ln', 'Lợi nhuận · mới nhất', MT.l3, `Tỷ suất <b>${pc(MT.l3, MT.t3)}</b> · lúc ký ${pc(MT.l1, MT.t1)}`, '#2a9d8f'),
    kpi('thu', 'Đã thu (tiền về)', T.thu, `Đạt <b>${pc(T.thu, T.hd_sv)}</b> doanh thu`, '#1f2a44'),
    kpi('chi', 'Đã chi', T.chi, `Bằng <b>${pc(T.chi, T.thu)}</b> dòng thu`, '#8a6a3e'),
    kpi('pt', 'Còn phải thu', T.phai_thu, `Còn lại thực (thu − chi): <b>${n(T.con)}</b>`, '#c9a96a'),
  ].join('');

  // ---- Dòng chảy 4 khối ----
  const go = (no) => `<button type="button" class="db-go" data-dbgo="${no}">Xem mục ${no} ›</button>`;
  const line = (lab, x, max, col, extra = '') => `<li><span>${lab}</span>${bar(x, max, col)}<b>${n(x)}</b>${extra}</li>`;
  const mx1 = Math.max(T.dt1, T.cp1, 1), mx2 = Math.max(T.thu, T.chi, 1), mx3 = Math.max(T.hd_sv, T.chi, 1);
  const lnPts = [MT.l1, MT.l2, MT.l3], lMax = Math.max(...lnPts.map(Math.abs), 1);
  const step = lnPts.map((x, i) => {
    const h = Math.max(4, (Math.abs(x) / lMax) * 54);
    return `<div class="db-step"><span class="db-sv ${x < 0 ? 'neg' : ''}">${bTy(x)}</span><i style="height:${h}px;background:${['#8fa9cf', '#5f86bf', '#2a9d8f'][i]}"></i>
      <b>TĐ${i + 1}</b><small>${pc(x, [MT.t1, MT.t2, MT.t3][i])}</small></div>`;
  }).join('');
  const blk = (no, cls, title, sub, big, bigLab, body) => `<section class="db-blk ${cls}">
      <header><span class="db-no">${no}</span><div><h4>${title}</h4><p>${sub}</p></div></header>
      <div class="db-big"><span>${bigLab}</span><b class="${big < 0 ? 'neg' : ''}">${bTy(big)} <small>${TY()}</small></b></div>
      ${body}<footer>${go(no)}</footer></section>`;
  const arrow = (lab) => `<div class="db-arrow" aria-hidden="true"><span>${lab}</span><i></i></div>`;
  const flow = [
    blk('I', 'b1', 'Kế hoạch lúc ký', 'TĐ1 – ký hợp đồng', T.ln1, `Lợi nhuận dự kiến · ${pc(T.ln1, T.dt1)}`,
      `<ul class="db-lines">${line('Doanh thu', T.dt1, mx1, '#3462a3')}${line('Chi phí', T.cp1, mx1, '#b07338')}${line('Lợi nhuận', T.ln1, mx1, '#2a9d8f')}</ul>
      <div class="db-note2">${rows.filter((x) => x.td1).length}/${rows.length} dự án đã chốt TĐ1 · chi phí bằng <b>${pc(T.cp1, T.dt1)}</b> doanh thu</div>`),
    arrow('thực hiện'),
    blk('II', 'b2', 'Dòng tiền thực tế', `Lũy kế đến hôm nay`, T.con, 'Còn lại (thu − chi)',
      `<ul class="db-lines">${line('Dòng thu', T.thu, mx2, '#1f2a44')}${line('Dòng chi', T.chi, mx2, '#8a6a3e')}${line('Còn lại', T.con, mx2, '#2a9d8f')}</ul>
      <div class="db-note2">Đã thu <b>${pc(T.thu, T.hd_sv)}</b> doanh thu HĐ · không gồm tiền vay, trả nợ gốc</div>`),
    arrow('đối chiếu'),
    blk('III', 'b3', 'Còn phải thu – chi', 'Doanh thu mới nhất − thực chi', T.hd_sv - T.chi, `Còn lại · thực chi ${pc(T.chi, T.hd_sv)} DT`,
      `<ul class="db-lines">${line('Doanh thu', T.hd_sv, mx3, '#3462a3')}${line('Thực chi', T.chi, mx3, '#b07338')}${line('Còn lại', T.hd_sv - T.chi, mx3, '#2a9d8f')}</ul>
      <div class="db-note2">Còn phải thu CĐT <b>${n(T.phai_thu)}</b> ${TY()} (doanh thu − đã thu)</div>`),
    arrow('quyết toán'),
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
    <div class="db-avg">Tiến độ bình quân <b>${avg}%</b>${bar(avg, 100, '#1f2a44')}</div>
    <div class="db-sub-h">Lợi nhuận cao nhất (mới nhất)</div>
    <ol class="db-top">${top.map((x) => `<li><span><b>${esc(x.d.ma_du_an)}</b> ${esc(x.d.ten_du_an)}</span>${bar(x.l3, tMax, '#2a9d8f')}<em>${n(x.l3)}</em><small>${pc(x.l3, x.t3)}</small></li>`).join('') || '<li class="muted">Chưa có số liệu</li>'}</ol>`;

  // ---- Bảng dự án ----
  const tRows = rows.map((x, i) => {
    const q = m4.get(x.d.id) || { t3: 0, l3: 0 };
    const ts = q.t3 ? q.l3 / q.t3 : 0, th = x.hd_sv ? x.thu / x.hd_sv : 0;
    return `<tr><td class="num db-stt">${i + 1}</td><td class="db-ma"><b>${esc(x.d.ma_du_an)}</b></td><td class="db-ten" title="${esc(x.d.ten_du_an)}">${esc(x.d.ten_du_an)}</td>
      <td><span class="st st-${slug(x.d.trang_thai)}">${esc(x.d.trang_thai)}</span></td>
      <td class="num">${bTy(q.t3)}</td><td class="num strong ${q.l3 < 0 ? 'neg' : 'pos'}">${bTy(q.l3)}</td>
      <td class="db-pc">${bar(ts, 0.3, ts < 0 ? '#d92d35' : '#2a9d8f')}<b>${pc(q.l3, q.t3)}</b></td>
      <td class="db-pc">${bar(th, 1, '#1f2a44')}<b>${pc(x.thu, x.hd_sv)}</b></td>
      <td class="num">${n(x.phai_thu)}</td></tr>`;
  }).join('');
  const tFoot = `<tr><td></td><td colspan="3">Tổng cộng (${rows.length} dự án)</td><td class="num">${bTy(MT.t3)}</td><td class="num">${n(MT.l3)}</td>
      <td class="db-pc"><b>${pc(MT.l3, MT.t3)}</b></td><td class="db-pc"><b>${pc(T.thu, T.hd_sv)}</b></td><td class="num">${n(T.phai_thu)}</td></tr>`;

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
    <div class="db-kpis">${kpis}</div>
    <div class="db-flow">${flow}</div>
    <div class="db-row2">
      <section class="db-card db-c-flow"><h5>Dòng tiền theo kỳ <small>${esc(P.label)} · thu gồm tiền về + vay</small></h5><div id="db-ch-flow" class="chart"></div></section>
      <section class="db-card db-c-cost"><h5>Cơ cấu chi phí <small>theo nhóm · ${vt}</small></h5><div id="db-ch-cost"></div></section>
      <section class="db-card db-c-st"><h5>Tình trạng dự án <small>${list.length} dự án</small></h5>${stHtml}</section>
    </div>
    <div class="db-row3">
      <section class="db-card db-c-tbl"><h5>Danh mục dự án <small>doanh thu, lợi nhuận mới nhất · đã thu so với doanh thu</small></h5>
        <div class="table-wrap"><table class="db-table no-mcard"><thead><tr><th class="num">STT</th><th>Mã DA</th><th>Tên dự án</th><th>Tình trạng</th>
          <th class="num">Doanh thu</th><th class="num">Lợi nhuận</th><th>Tỷ suất LN</th><th>Đã thu / DT</th><th class="num">Còn phải thu</th></tr></thead>
          <tbody>${tRows}</tbody><tfoot>${tFoot}</tfoot></table></div></section>
      <section class="db-card db-c-map"><h5>Bản đồ dự án <small>vòng tròn = doanh thu</small></h5>
        <div class="map-box"><div id="b-map" class="map-c db-mapc" role="region" aria-label="Bản đồ phân bổ dự án"></div></div></section>
    </div>
    <p class="db-note muted small">Số liệu cùng nguồn với chế độ Báo cáo: khối I = mục I (TĐ1), II = mục II, III = mục III, IV và thanh chỉ số = mục IV (đã quyết toán lấy TĐ3, chưa quyết toán tạm tính theo TĐ2). Bấm "Xem mục" để mở phần chi tiết tương ứng.</p>
  </div>`;

  // ---- Biểu đồ ----
  bColChart($('#db-ch-flow'), bSeries(list, v, P), [{ key: 'thu', name: 'Thu', color: '#1f2a44' }, { key: 'chi', name: 'Chi', color: '#c9a96a' }],
    { height: 300, tipExtra: (p) => `<tr class="sum"><td>Chênh lệch</td><td class="${p.thu - p.chi < 0 ? 'neg' : ''}">${bn(p.thu - p.chi)}</td></tr>` });
  const cg = bCostGroups(list, v);
  bDonut($('#db-ch-cost'), cg.map((x, i) => ({ label: x.ten, val: x.val, color: DB_COST_COL[i % DB_COST_COL.length] })));
  if (typeof bMapInit === 'function') bMapInit(list, v);
}

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
