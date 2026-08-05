/* NUVEXA HUB V11.8 — Orders & invoices module */
(function(global){
  'use strict';
  const prefs={
    orderView:localStorage.getItem('nuvexa_orders_view')||'table',
    orderFilter:'all',orderSearch:'',
    invoiceView:localStorage.getItem('nuvexa_invoices_view')||'table',
    invoiceSearch:''
  };
  const stages=['جديد','قيد التجهيز','جاهز للتوصيل','في الطريق','تم التسليم'];
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const statusClass=s=>s==='تم التسليم'||s==='مكتمل'||s==='مدفوعة'?'is-success':s==='ملغية'||s==='مرفوضة'?'is-danger':s==='بانتظار الاعتماد'||s==='غير مدفوعة'?'is-warning':'is-info';
  const statusBadge=s=>`<span class="nx-order-status ${statusClass(s)}">${esc(s||'غير محدد')}</span>`;
  const viewSwitch=(kind,value)=>`<div class="view-switcher nx-orders-view-switch" aria-label="طريقة العرض">
    <button class="${value==='table'?'active':''}" data-nx-${kind}-view="table" title="جدول">▦</button>
    <button class="${value==='cards'?'active':''}" data-nx-${kind}-view="cards" title="بطاقات">▣</button>
    <button class="${value==='list'?'active':''}" data-nx-${kind}-view="list" title="قائمة">☰</button>
  </div>`;
  function filterOrders(ctx){
    const q=prefs.orderSearch.trim().toLowerCase();
    return (ctx.state.orders||[]).filter(o=>{
      const ok=prefs.orderFilter==='all'||o.status===prefs.orderFilter;
      const hay=[o.number,ctx.customerName(o.customerId),o.status,...(o.items||[]).map(x=>x.name)].join(' ').toLowerCase();
      return ok&&(!q||hay.includes(q));
    });
  }
  function progress(status){
    const idx=stages.indexOf(status); const active=idx<0?0:idx;
    return `<div class="nx-order-progress">${stages.map((s,i)=>`<div class="nx-order-step ${i<=active?'done':''} ${i===active?'current':''}"><i>${i<active?'✓':i+1}</i><span>${s}</span></div>`).join('')}</div>`;
  }
  function orderActions(o,ctx){return `<div class="toolbar nx-row-actions">
    <button class="btn btn-soft btn-sm" data-nx-order-detail="${o.id}">التفاصيل</button>
    ${o.status==='بانتظار الاعتماد'&&ctx.isApprover()?`<button class="btn btn-success btn-sm" data-approve-order="${o.id}">اعتماد</button>`:''}
    ${o.approved&&!['تم التسليم','ملغية'].includes(o.status)?`<button class="btn btn-blue btn-sm" data-next-order="${o.id}">تحديث الحالة</button>`:''}
    ${!['تم التسليم','ملغية'].includes(o.status)?`<button class="btn btn-danger btn-sm" data-cancel-order="${o.id}">إلغاء</button>`:''}
  </div>`}
  function ordersTable(list,ctx){return `<div class="table-wrap"><table class="table nx-orders-table"><thead><tr><th>الطلب</th><th>العميل</th><th>العناصر</th><th>الإجمالي</th><th>التوصيل</th><th>الحالة</th><th>الإجراءات</th></tr></thead><tbody>${list.map(o=>`<tr><td><strong>${esc(o.number)}</strong><small>${ctx.fmtDate(o.date)}</small></td><td>${esc(ctx.customerName(o.customerId))}</td><td>${(o.items||[]).slice(0,2).map(x=>`${esc(x.name)} × ${x.qty}`).join('<br>')}${(o.items||[]).length>2?`<small>+${o.items.length-2} عناصر</small>`:''}</td><td><strong>${ctx.money(o.total)}</strong></td><td>${ctx.fmtDate(o.deliveryDate)}</td><td>${statusBadge(o.status)}</td><td>${orderActions(o,ctx)}</td></tr>`).join('')}</tbody></table></div>`}
  function ordersCards(list,ctx){return `<div class="nx-orders-cards">${list.map(o=>`<article class="nx-order-card"><header><div><small>${ctx.fmtDate(o.date)}</small><h3>${esc(o.number)}</h3></div>${statusBadge(o.status)}</header><div class="nx-order-customer">👤 <strong>${esc(ctx.customerName(o.customerId))}</strong></div><div class="nx-order-items">${(o.items||[]).map(x=>`<span>${esc(x.name)} <b>× ${x.qty}</b></span>`).join('')}</div><footer><strong>${ctx.money(o.total)}</strong>${orderActions(o,ctx)}</footer></article>`).join('')}</div>`}
  function ordersList(list,ctx){return `<div class="nx-orders-list">${list.map(o=>`<article class="nx-order-list-row"><div class="nx-order-list-icon">📦</div><div><strong>${esc(o.number)}</strong><small>${esc(ctx.customerName(o.customerId))} · ${(o.items||[]).length} عناصر · ${ctx.fmtDate(o.date)}</small></div><div>${statusBadge(o.status)}</div><strong>${ctx.money(o.total)}</strong>${orderActions(o,ctx)}</article>`).join('')}</div>`}
  function renderOrders(ctx){
    const all=ctx.state.orders||[], list=filterOrders(ctx);
    const counts=s=>all.filter(x=>x.status===s).length;
    const body=list.length?(prefs.orderView==='cards'?ordersCards(list,ctx):prefs.orderView==='list'?ordersList(list,ctx):ordersTable(list,ctx)):ctx.empty('assets/empty-states/empty-orders.webp','لا توجد طلبات مطابقة','غيّر البحث أو الفلتر، أو أنشئ طلبًا جديدًا.',`<button class="btn btn-gold" data-modal="order">طلب جديد</button>`);
    return `${ctx.pageHead('الطلبات والتوصيلات','متابعة دورة الطلب من الإنشاء حتى التسليم والفاتورة.',`<button class="btn btn-gold" data-modal="order">＋ طلب جديد</button>`)}
      <div class="dashboard-six nx-orders-kpis">
        <button class="dashboard-kpi" data-nx-order-filter="all"><span>كل الطلبات<strong>${all.length}</strong></span><i>📋</i></button>
        <button class="dashboard-kpi" data-nx-order-filter="بانتظار الاعتماد"><span>بانتظار الاعتماد<strong>${counts('بانتظار الاعتماد')}</strong></span><i>⌛</i></button>
        <button class="dashboard-kpi" data-nx-order-filter="قيد التجهيز"><span>قيد التجهيز<strong>${counts('قيد التجهيز')}</strong></span><i>📦</i></button>
        <button class="dashboard-kpi" data-nx-order-filter="في الطريق"><span>في الطريق<strong>${counts('في الطريق')}</strong></span><i>🚚</i></button>
        <button class="dashboard-kpi" data-nx-order-filter="تم التسليم"><span>تم التسليم<strong>${counts('تم التسليم')}</strong></span><i>✓</i></button>
        <button class="dashboard-kpi" data-nx-order-filter="ملغية"><span>ملغية<strong>${counts('ملغية')}</strong></span><i>×</i></button>
      </div>
      <section class="panel nx-orders-panel"><div class="panel-head nx-orders-toolbar"><div><h3>سجل الطلبات</h3><small class="muted">${list.length} نتيجة</small></div><div class="toolbar"><label class="searchbox"><span>⌕</span><input id="nxOrderSearch" class="input" value="${esc(prefs.orderSearch)}" placeholder="ابحث بالرقم أو العميل أو المنتج"></label>${viewSwitch('order',prefs.orderView)}</div></div><div class="panel-body">${body}</div></section>`;
  }
  function invoiceActions(inv){return `<div class="toolbar nx-row-actions"><button class="btn btn-soft btn-sm" data-nx-invoice-detail="${inv.id}">التفاصيل</button><button class="btn btn-blue btn-sm" data-print-sale="${inv.id}">طباعة</button><button class="btn btn-soft btn-sm" data-view-sale="${inv.id}">تعديل</button></div>`}
  function filterInvoices(ctx){const q=prefs.invoiceSearch.trim().toLowerCase();return (ctx.state.salesInvoices||[]).filter(i=>!q||[i.number,ctx.customerName(i.customerId),i.status,...(i.items||[]).map(x=>x.name)].join(' ').toLowerCase().includes(q))}
  function invoicesTable(list,ctx){return `<div class="table-wrap"><table class="table"><thead><tr><th>الفاتورة</th><th>العميل</th><th>الإجمالي</th><th>المدفوع</th><th>المتبقي</th><th>الحالة</th><th>الإجراءات</th></tr></thead><tbody>${list.map(i=>`<tr><td><strong>${esc(i.number)}</strong><small>${ctx.fmtDate(i.date)}</small></td><td>${esc(ctx.customerName(i.customerId))}</td><td>${ctx.money(i.total)}</td><td class="positive">${ctx.money(i.paid)}</td><td class="${Number(i.total)-Number(i.paid)>0?'negative':'positive'}">${ctx.money(Math.max(0,Number(i.total)-Number(i.paid)))}</td><td>${statusBadge(i.status)}</td><td>${invoiceActions(i)}</td></tr>`).join('')}</tbody></table></div>`}
  function invoicesCards(list,ctx){return `<div class="nx-orders-cards">${list.map(i=>`<article class="nx-order-card nx-invoice-card"><header><div><small>${ctx.fmtDate(i.date)}</small><h3>${esc(i.number)}</h3></div>${statusBadge(i.status)}</header><div class="nx-order-customer">👤 <strong>${esc(ctx.customerName(i.customerId))}</strong></div><div class="nx-invoice-totals"><span>الإجمالي <b>${ctx.money(i.total)}</b></span><span>المدفوع <b>${ctx.money(i.paid)}</b></span><span>المتبقي <b>${ctx.money(Math.max(0,Number(i.total)-Number(i.paid)))}</b></span></div><footer>${invoiceActions(i)}</footer></article>`).join('')}</div>`}
  function invoicesList(list,ctx){return `<div class="nx-orders-list">${list.map(i=>`<article class="nx-order-list-row"><div class="nx-order-list-icon">🧾</div><div><strong>${esc(i.number)}</strong><small>${esc(ctx.customerName(i.customerId))} · ${ctx.fmtDate(i.date)}</small></div>${statusBadge(i.status)}<strong>${ctx.money(i.total)}</strong>${invoiceActions(i)}</article>`).join('')}</div>`}
  function renderInvoices(ctx){
    if(ctx.activeTab()!=='فواتير البيع')return ctx.renderLegacyInvoices();
    const all=ctx.state.salesInvoices||[],list=filterInvoices(ctx),due=all.reduce((s,i)=>s+Math.max(0,Number(i.total)-Number(i.paid)),0),paid=all.reduce((s,i)=>s+Number(i.paid||0),0);
    const body=list.length?(prefs.invoiceView==='cards'?invoicesCards(list,ctx):prefs.invoiceView==='list'?invoicesList(list,ctx):invoicesTable(list,ctx)):ctx.empty('assets/empty-states/empty-invoices.webp','لا توجد فواتير بعد','أكمل أول عملية بيع أو أنشئ فاتورة يدوية.');
    return `${ctx.pageHead('فواتير البيع','الفواتير، التحصيلات، المتبقي والطباعة في مركز واحد.',`<button class="btn btn-gold" data-modal="manual-sale">＋ فاتورة يدوية</button><button class="btn btn-soft" data-open-module="sales">نقطة البيع</button>`)}
    <div class="stat-grid nx-invoice-kpis">${ctx.stat('عدد الفواتير',String(all.length),'🧾')}${ctx.stat('إجمالي الفواتير',ctx.money(all.reduce((s,i)=>s+Number(i.total||0),0)),'💰')}${ctx.stat('المحصل',ctx.money(paid),'✓')}${ctx.stat('المتبقي',ctx.money(due),'⌛')}</div>
    <section class="panel" style="margin-top:16px"><div class="panel-head nx-orders-toolbar"><div><h3>سجل الفواتير</h3><small class="muted">${list.length} نتيجة</small></div><div class="toolbar"><label class="searchbox"><span>⌕</span><input id="nxInvoiceSearch" class="input" value="${esc(prefs.invoiceSearch)}" placeholder="ابحث برقم الفاتورة أو العميل"></label>${viewSwitch('invoice',prefs.invoiceView)}</div></div><div class="panel-body">${body}</div></section>`;
  }
  function showOrderDetail(id,ctx){
    const o=(ctx.state.orders||[]).find(x=>x.id===id);if(!o)return false;
    const dlg=document.querySelector('#modalDialog'),title=document.querySelector('#modalTitle'),body=document.querySelector('#modalBody'),save=document.querySelector('#modalSave');
    title.textContent=`تفاصيل الطلب ${o.number}`;save.classList.add('hidden');
    body.innerHTML=`<div class="detail-shell nx-order-detail">${progress(o.status)}<div class="detail-identity"><div class="detail-avatar nx-order-avatar">📦</div><div class="detail-title"><h2>${esc(o.number)}</h2><p>${esc(ctx.customerName(o.customerId))} · ${ctx.fmtDate(o.date)}</p></div><div class="detail-actions">${orderActions(o,ctx)}</div></div><div class="detail-grid"><section class="detail-card"><h3>بيانات العميل والتوصيل</h3><div class="detail-meta"><div><span>العميل</span><strong>${esc(ctx.customerName(o.customerId))}</strong></div><div><span>موعد التوصيل</span><strong>${ctx.fmtDate(o.deliveryDate)}</strong></div><div><span>العنوان</span><strong>${esc(o.address||'غير محدد')}</strong></div><div><span>أنشأه</span><strong>${esc(o.createdBy||'—')}</strong></div></div></section><section class="detail-card"><h3>الملخص المالي</h3><div class="detail-meta"><div><span>المنتجات</span><strong>${ctx.money(Number(o.total||0)-Number(o.deliveryFee||0))}</strong></div><div><span>التوصيل</span><strong>${ctx.money(o.deliveryFee||0)}</strong></div><div><span>المدفوع</span><strong>${ctx.money(o.paid||0)}</strong></div><div><span>الإجمالي</span><strong>${ctx.money(o.total)}</strong></div></div></section></div><section class="detail-card"><h3>عناصر الطلب</h3><div class="nx-detail-items">${(o.items||[]).map(x=>`<div><span>${esc(x.name)}</span><b>${x.qty} × ${ctx.money(x.price)}</b><strong>${ctx.money(Number(x.qty)*Number(x.price))}</strong></div>`).join('')}</div></section>${o.notes?`<section class="detail-card"><h3>ملاحظات</h3><p class="muted">${esc(o.notes)}</p></section>`:''}</div>`;
    dlg.showModal();return true;
  }
  function showInvoiceDetail(id,ctx){
    const i=(ctx.state.salesInvoices||[]).find(x=>x.id===id);if(!i)return false;
    const dlg=document.querySelector('#modalDialog'),title=document.querySelector('#modalTitle'),body=document.querySelector('#modalBody'),save=document.querySelector('#modalSave');
    title.textContent=`تفاصيل الفاتورة ${i.number}`;save.classList.add('hidden');
    body.innerHTML=`<div class="detail-shell"><div class="detail-identity"><div class="detail-avatar nx-order-avatar">🧾</div><div class="detail-title"><h2>${esc(i.number)}</h2><p>${esc(ctx.customerName(i.customerId))} · ${ctx.fmtDate(i.date)}</p></div><div class="detail-actions">${invoiceActions(i)}</div></div><div class="detail-grid"><section class="detail-card"><h3>التحصيل</h3><div class="detail-meta"><div><span>الإجمالي</span><strong>${ctx.money(i.total)}</strong></div><div><span>المدفوع</span><strong>${ctx.money(i.paid)}</strong></div><div><span>المتبقي</span><strong>${ctx.money(Math.max(0,Number(i.total)-Number(i.paid)))}</strong></div><div><span>الحالة</span><strong>${esc(i.status)}</strong></div></div></section><section class="detail-card"><h3>بيانات الفاتورة</h3><div class="detail-meta"><div><span>العميل</span><strong>${esc(ctx.customerName(i.customerId))}</strong></div><div><span>المنشئ</span><strong>${esc(i.createdBy||'—')}</strong></div><div><span>مرجع الطلب</span><strong>${esc(i.sourceOrderId||'يدوية')}</strong></div><div><span>عدد البنود</span><strong>${(i.items||[]).length}</strong></div></div></section></div><section class="detail-card"><h3>البنود</h3><div class="nx-detail-items">${(i.items||[]).map(x=>`<div><span>${esc(x.name)}</span><b>${x.qty} × ${ctx.money(x.price)}</b><strong>${ctx.money(Number(x.qty)*Number(x.price))}</strong></div>`).join('')}</div></section></div>`;
    dlg.showModal();return true;
  }
  function resetModalSave(){const save=document.querySelector('#modalSave');save?.classList.remove('hidden')}
  function handleClick(e,ctx){
    let el=e.target.closest('[data-nx-order-view]');if(el){prefs.orderView=el.dataset.nxOrderView;localStorage.setItem('nuvexa_orders_view',prefs.orderView);ctx.renderModule('orders');return true}
    el=e.target.closest('[data-nx-invoice-view]');if(el){prefs.invoiceView=el.dataset.nxInvoiceView;localStorage.setItem('nuvexa_invoices_view',prefs.invoiceView);ctx.renderModule('invoices');return true}
    el=e.target.closest('[data-nx-order-filter]');if(el){prefs.orderFilter=el.dataset.nxOrderFilter;ctx.renderModule('orders');return true}
    el=e.target.closest('[data-nx-order-detail]');if(el)return showOrderDetail(el.dataset.nxOrderDetail,ctx);
    el=e.target.closest('[data-nx-invoice-detail]');if(el)return showInvoiceDetail(el.dataset.nxInvoiceDetail,ctx);
    if(e.target.closest('[data-action="close-modal"]'))resetModalSave();
    return false;
  }
  function bind(ctx){
    const os=document.querySelector('#nxOrderSearch');if(os&&!os.dataset.bound){os.dataset.bound='1';os.addEventListener('input',e=>{prefs.orderSearch=e.target.value;ctx.renderModule('orders')})}
    const ins=document.querySelector('#nxInvoiceSearch');if(ins&&!ins.dataset.bound){ins.dataset.bound='1';ins.addEventListener('input',e=>{prefs.invoiceSearch=e.target.value;ctx.renderModule('invoices')})}
  }
  global.NuvexaOrders={version:'11.8',renderOrders,renderInvoices,handleClick,bind};
})(window);
