/* NUVEXA HUB V11.15 — Reports module */
(function(global){
  'use strict';

  const prefs={period:'all',query:''};
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const dateOf=row=>new Date(row?.date||row?.createdAt||row?.updatedAt||0);

  function inPeriod(row){
    if(prefs.period==='all')return true;
    const d=dateOf(row);if(Number.isNaN(d.getTime()))return false;
    const now=new Date(),start=new Date(now);
    if(prefs.period==='today')start.setHours(0,0,0,0);
    if(prefs.period==='week'){start.setDate(now.getDate()-6);start.setHours(0,0,0,0)}
    if(prefs.period==='month'){start.setDate(1);start.setHours(0,0,0,0)}
    return d>=start&&d<=now;
  }

  function sales(ctx){return (ctx.activeSales()||[]).filter(inPeriod)}
  function itemRows(ctx){return sales(ctx).flatMap(s=>(s.items||[]).map(i=>({sale:s,item:i}))) }
  function revenueOf(ctx,s){return ctx.num(s.total||s.grandTotal||s.amount||0)}
  function paidOf(ctx,s){return ctx.num(s.paid||s.collected||s.amountPaid||0)}

  function toolbar(){return `<div class="reports-toolbar"><div class="tabs"><button class="tab ${prefs.period==='all'?'active':''}" data-report-period="all">كل الفترات</button><button class="tab ${prefs.period==='today'?'active':''}" data-report-period="today">اليوم</button><button class="tab ${prefs.period==='week'?'active':''}" data-report-period="week">7 أيام</button><button class="tab ${prefs.period==='month'?'active':''}" data-report-period="month">هذا الشهر</button></div></div>`}

  function summary(ctx){
    const list=sales(ctx),revenue=list.reduce((s,x)=>s+revenueOf(ctx,x),0),collected=list.reduce((s,x)=>s+paidOf(ctx,x),0),receivables=Math.max(0,revenue-collected),orders=(ctx.state.orders||[]).filter(inPeriod),products=(ctx.state.products||[]).filter(p=>!p.archived),units=products.reduce((s,p)=>s+ctx.num(p.stock),0),inventoryValue=products.reduce((s,p)=>s+ctx.num(p.stock)*ctx.num(p.cost),0),low=products.filter(p=>ctx.num(p.stock)<=ctx.num(p.lowStock||2)).length;
    return `${ctx.pageHead('التقارير','قراءة تشغيلية ومالية موحدة من بيانات المنصة.',`<button class="btn btn-soft" data-action="export-sales">تصدير المبيعات CSV</button><button class="btn btn-soft" data-action="export-inventory">تصدير المخزون CSV</button>`)}${toolbar()}<div class="stat-grid">${ctx.stat('إجمالي المبيعات',revenue,'📈')}${ctx.stat('المبالغ المحصلة',collected,'💵')}${ctx.stat('المبالغ المستحقة',receivables,'⏳')}${ctx.stat('عدد الطلبات',orders.length,'📋')}</div><div class="content-grid" style="margin-top:16px"><section class="panel span-6"><div class="panel-head"><h3>ملخص المبيعات</h3></div><div class="panel-body"><div class="total-line"><span>عدد الفواتير</span><strong>${list.length}</strong></div><div class="total-line"><span>متوسط الفاتورة</span><strong>${ctx.money(list.length?revenue/list.length:0)}</strong></div><div class="total-line"><span>الإجمالي</span><strong>${ctx.money(revenue)}</strong></div><div class="total-line"><span>المحصل</span><strong>${ctx.money(collected)}</strong></div><div class="total-line"><span>المتبقي</span><strong>${ctx.money(receivables)}</strong></div></div></section><section class="panel span-6"><div class="panel-head"><h3>ملخص المخزون</h3></div><div class="panel-body"><div class="total-line"><span>عدد المنتجات</span><strong>${products.length}</strong></div><div class="total-line"><span>إجمالي الوحدات</span><strong>${units}</strong></div><div class="total-line"><span>قيمة المخزون بالتكلفة</span><strong>${ctx.money(inventoryValue)}</strong></div><div class="total-line"><span>منخفض المخزون</span><strong>${low}</strong></div></div></section></div>`;
  }

  function salesReport(ctx){
    const list=sales(ctx),q=prefs.query.trim().toLowerCase(),filtered=list.filter(s=>!q||`${s.number||s.id||''} ${s.customerName||s.clientName||''} ${s.status||''}`.toLowerCase().includes(q));
    const revenue=filtered.reduce((s,x)=>s+revenueOf(ctx,x),0),collected=filtered.reduce((s,x)=>s+paidOf(ctx,x),0);
    const byProduct={};itemRows(ctx).forEach(({item})=>{const name=item.name||item.productName||'منتج';byProduct[name]=(byProduct[name]||0)+ctx.num(item.qty||item.quantity||1)});const top=Object.entries(byProduct).sort((a,b)=>b[1]-a[1]).slice(0,8);
    return `${ctx.pageHead('تقرير المبيعات','تفاصيل الفواتير والتحصيل والمنتجات الأعلى مبيعًا.',`<button class="btn btn-soft" data-action="export-sales">تصدير CSV</button>`)}${toolbar()}<div class="stat-grid">${ctx.stat('عدد الفواتير',filtered.length,'🧾')}${ctx.stat('إجمالي المبيعات',revenue,'📈')}${ctx.stat('المحصل',collected,'💵')}${ctx.stat('المتبقي',Math.max(0,revenue-collected),'⏳')}</div><div class="content-grid" style="margin-top:16px"><section class="panel span-8"><div class="panel-head"><h3>الفواتير</h3><div class="searchbox"><span>⌕</span><input id="reportSalesSearch" class="input" value="${esc(prefs.query)}" placeholder="رقم الفاتورة أو العميل..."></div></div><div class="panel-body">${filtered.length?`<div class="table-wrap"><table class="table"><thead><tr><th>الفاتورة</th><th>العميل</th><th>التاريخ</th><th>الإجمالي</th><th>المحصل</th><th>الحالة</th></tr></thead><tbody>${filtered.map(s=>`<tr><td><strong>${esc(s.number||s.id||'—')}</strong></td><td>${esc(s.customerName||s.clientName||'عميل نقدي')}</td><td>${ctx.fmtDate(s.date||s.createdAt)}</td><td>${ctx.money(revenueOf(ctx,s))}</td><td>${ctx.money(paidOf(ctx,s))}</td><td>${ctx.statusBadge(s.status||'مكتملة')}</td></tr>`).join('')}</tbody></table></div>`:ctx.empty('assets/empty-states/empty-invoices.webp','لا توجد مبيعات مطابقة','غيّر الفترة أو عبارة البحث.')}</div></section><section class="panel span-4"><div class="panel-head"><h3>الأعلى مبيعًا</h3></div><div class="panel-body">${top.length?top.map(([name,qty],i)=>`<div class="total-line"><span>${i+1}. ${esc(name)}</span><strong>${qty}</strong></div>`).join(''):'<p class="muted">لا توجد بيانات كافية بعد.</p>'}</div></section></div>`;
  }

  function inventoryReport(ctx){
    const products=(ctx.state.products||[]).filter(p=>!p.archived),rows=products.slice().sort((a,b)=>ctx.num(a.stock)-ctx.num(b.stock)),value=products.reduce((s,p)=>s+ctx.num(p.stock)*ctx.num(p.cost),0),out=products.filter(p=>ctx.num(p.stock)<=0).length,low=products.filter(p=>ctx.num(p.stock)>0&&ctx.num(p.stock)<=ctx.num(p.lowStock||2)).length;
    return `${ctx.pageHead('تقرير المخزون','الرصيد الحالي والقيمة والتنبيهات المرتبطة بالمخزون.',`<button class="btn btn-soft" data-action="export-inventory">تصدير CSV</button>`)}<div class="stat-grid">${ctx.stat('عدد المنتجات',products.length,'📦')}${ctx.stat('قيمة المخزون',value,'💰')}${ctx.stat('منخفض المخزون',low,'⚠️')}${ctx.stat('نفد المخزون',out,'⛔')}</div><section class="panel" style="margin-top:16px"><div class="panel-head"><h3>تفاصيل المخزون</h3></div><div class="panel-body">${rows.length?`<div class="table-wrap"><table class="table"><thead><tr><th>المنتج</th><th>النوع</th><th>الكمية</th><th>الحد الأدنى</th><th>التكلفة</th><th>القيمة</th><th>الحالة</th></tr></thead><tbody>${rows.map(p=>{const stock=ctx.num(p.stock),min=ctx.num(p.lowStock||2),status=stock<=0?'نفد المخزون':stock<=min?'منخفض':'متاح';return `<tr><td><strong>${esc(p.name||'منتج')}</strong></td><td>${esc(p.type==='digital'?'خدمة رقمية':'منتج')}</td><td>${stock}</td><td>${min}</td><td>${ctx.money(ctx.num(p.cost))}</td><td>${ctx.money(stock*ctx.num(p.cost))}</td><td>${ctx.statusBadge(status)}</td></tr>`}).join('')}</tbody></table></div>`:ctx.empty('assets/empty-states/empty-stock.webp','لا توجد منتجات','أضف منتجات لبدء تقارير المخزون.')}</div></section>`;
  }

  function render(ctx){const tab=ctx.activeTab();if(tab==='المبيعات')return salesReport(ctx);if(tab==='المخزون')return inventoryReport(ctx);return summary(ctx)}
  function bind(ctx){document.querySelectorAll('[data-report-period]').forEach(btn=>{if(btn.dataset.bound)return;btn.dataset.bound='1';btn.addEventListener('click',()=>{prefs.period=btn.dataset.reportPeriod;ctx.refresh()})});const s=document.querySelector('#reportSalesSearch');if(s&&!s.dataset.bound){s.dataset.bound='1';s.addEventListener('input',e=>{prefs.query=e.target.value;ctx.refresh()})}}
  global.NuvexaReports={version:'11.15',render,bind};
})(window);
