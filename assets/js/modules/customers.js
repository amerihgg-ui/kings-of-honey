/* NUVEXA HUB V11.13 — Customers module */
(function(global){
  'use strict';
  const prefs={
    view:localStorage.getItem('nuvexa_hub_buyers_view')||'table',
    filter:'all',
    search:''
  };
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  function salesFor(ctx,id){return ctx.activeSales().filter(i=>i.customerId===id)}
  function orderCount(ctx,id){return salesFor(ctx,id).length}
  function totalSpent(ctx,id){return salesFor(ctx,id).reduce((n,i)=>n+ctx.num(i.total),0)}
  function hasDigital(ctx,id){return salesFor(ctx,id).some(i=>(i.items||[]).some(x=>x.nonStock||(ctx.state.products||[]).find(p=>p.id===x.productId)?.type==='digital'))}
  function matches(c,ctx){
    if(c.archived&&prefs.filter!=='archived')return false;
    const orders=salesFor(ctx,c.id);
    if(prefs.filter==='active'&&c.status==='موقوف')return false;
    if(prefs.filter==='stopped'&&c.status!=='موقوف')return false;
    if(prefs.filter==='buyers'&&!orders.length)return false;
    if(prefs.filter==='digital'&&!hasDigital(ctx,c.id))return false;
    if(prefs.filter==='none'&&orders.length)return false;
    if(prefs.filter==='archived'&&!c.archived)return false;
    const q=prefs.search.trim().toLowerCase();
    return !q||`${c.name||''} ${c.phone||''} ${c.whatsapp||''} ${c.email||''} ${c.country||''}`.toLowerCase().includes(q);
  }
  function actions(c){return `<div class="toolbar"><button class="btn btn-soft btn-sm" data-modal="customer" data-id="${c.id}">التفاصيل والتعديل</button><button class="btn btn-blue btn-sm" data-modal="followup" data-id="${c.id}">متابعة</button>${c.archived?'':`<button class="btn btn-danger btn-sm" data-archive-customer="${c.id}">أرشفة</button>`}</div>`}
  function controls(all,ctx){
    const filters=[
      ['all','الكل',all.filter(c=>!c.archived).length],
      ['active','نشط',all.filter(c=>!c.archived&&c.status!=='موقوف').length],
      ['stopped','موقوف',all.filter(c=>!c.archived&&c.status==='موقوف').length],
      ['buyers','أجرى شراء',all.filter(c=>!c.archived&&orderCount(ctx,c.id)>0).length],
      ['digital','اشترى خدمة رقمية',all.filter(c=>!c.archived&&hasDigital(ctx,c.id)).length],
      ['none','لم يشترِ بعد',all.filter(c=>!c.archived&&orderCount(ctx,c.id)===0).length],
      ['archived','المؤرشفون',all.filter(c=>c.archived).length]
    ];
    return `<div class="products-admin-toolbar"><label class="searchbox"><span>⌕</span><input id="nxCustomersSearch" class="input" value="${esc(prefs.search)}" placeholder="ابحث بالاسم أو الهاتف أو البريد..."></label><div class="catalog-view-switch" aria-label="طريقة العرض"><button class="view-switch-btn ${prefs.view==='table'?'active':''}" data-nx-customers-view="table" title="جدول">▤</button><button class="view-switch-btn ${prefs.view==='cards'?'active':''}" data-nx-customers-view="cards" title="بطاقات">▦</button><button class="view-switch-btn ${prefs.view==='list'?'active':''}" data-nx-customers-view="list" title="قائمة">☰</button></div></div><div class="products-admin-filters">${filters.map(([id,label,count])=>`<button class="${prefs.filter===id?'active':''}" data-nx-customers-filter="${id}">${label} <small>${count}</small></button>`).join('')}</div>`;
  }
  function cards(list,ctx){return `<div class="admin-products-grid">${list.map(c=>`<article class="admin-product-card"><div class="admin-product-card-body"><div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><div><h3>${esc(c.name)}</h3><div class="muted">${esc(c.email||c.phone||'بدون بيانات اتصال')}</div></div>${ctx.statusBadge(c.status==='موقوف'?'موقوف':'نشط')}</div><div class="admin-product-meta"><span>${orderCount(ctx,c.id)} طلب</span><strong>${ctx.money(totalSpent(ctx,c.id))}</strong></div><div class="admin-product-meta"><span>المديونية</span><strong>${ctx.money(ctx.customerDebt(c.id))}</strong></div>${actions(c)}</div></article>`).join('')}</div>`}
  function listView(list,ctx){return `<div class="admin-products-list">${list.map(c=>`<article class="admin-product-row"><div><strong>${esc(c.name)}</strong><div class="muted">${esc(c.email||c.phone||'—')}</div></div><span class="hide-mobile">${orderCount(ctx,c.id)} طلب</span><strong class="hide-mobile">${ctx.money(totalSpent(ctx,c.id))}</strong>${actions(c)}</article>`).join('')}</div>`}
  function table(list,ctx){return `<div class="table-wrap"><table class="table"><thead><tr><th>المشتري</th><th>الهاتف / البريد</th><th>الطلبات</th><th>إجمالي المشتريات</th><th>المديونية</th><th>الحالة</th><th>إجراءات</th></tr></thead><tbody>${list.map(c=>`<tr><td><strong>${esc(c.name)}</strong><div class="muted">${esc(c.country||c.classification||'')}</div></td><td>${esc(c.phone||'—')}<div class="muted">${esc(c.email||'')}</div></td><td>${orderCount(ctx,c.id)}</td><td>${ctx.money(totalSpent(ctx,c.id))}</td><td>${ctx.money(ctx.customerDebt(c.id))}</td><td>${ctx.statusBadge(c.status==='موقوف'?'موقوف':'نشط')}</td><td>${actions(c)}</td></tr>`).join('')}</tbody></table></div>`}
  function renderFollowups(ctx){
    const items=(ctx.state.customers||[]).flatMap(c=>(c.followups||[]).map(f=>({...f,customerName:c.name,customerId:c.id}))).sort((a,b)=>new Date(b.date)-new Date(a.date));
    return `${ctx.pageHead('متابعات العملاء','تظل المتابعة ظاهرة حتى تسجيل نتيجتها.',`<button class="btn btn-gold" data-modal="followup">＋ متابعة</button>`)}<section class="panel"><div class="panel-body">${items.length?`<div class="table-wrap"><table class="table"><thead><tr><th>العميل</th><th>الموعد</th><th>النتيجة</th><th>الملاحظة</th><th>المستخدم</th></tr></thead><tbody>${items.map(f=>`<tr><td>${esc(f.customerName)}</td><td>${ctx.fmtDate(f.date)}</td><td>${ctx.statusBadge(f.result||'مفتوحة')}</td><td>${esc(f.note||'')}</td><td>${esc(f.user||'')}</td></tr>`).join('')}</tbody></table></div>`:ctx.empty('assets/empty-states/empty-customers.webp','لا توجد متابعات','أضف متابعة لعميل عند الحاجة.')}</div></section>`;
  }
  function render(ctx){
    if(ctx.activeTab()==='المتابعات')return renderFollowups(ctx);
    const all=ctx.state.customers||[],list=all.filter(c=>matches(c,ctx));
    let body='';
    if(!list.length)body=ctx.empty('assets/empty-states/empty-customers.webp','لا توجد نتائج','غيّر البحث أو الفلتر الحالي.');
    else body=prefs.view==='cards'?cards(list,ctx):prefs.view==='list'?listView(list,ctx):table(list,ctx);
    return `${ctx.pageHead('المشترون','إدارة المشترين بثلاث طرق عرض مع البحث والفلاتر والمتابعات.',`<button class="btn btn-gold" data-modal="customer">＋ تسجيل مشتري يدويًا</button>`)}<section class="panel"><div class="panel-body">${controls(all,ctx)}${body}</div></section>`;
  }
  function handleClick(e,ctx){
    let el=e.target.closest('[data-nx-customers-view]');
    if(el){prefs.view=el.dataset.nxCustomersView;localStorage.setItem('nuvexa_hub_buyers_view',prefs.view);ctx.renderModule('customers');return true}
    el=e.target.closest('[data-nx-customers-filter]');
    if(el){prefs.filter=el.dataset.nxCustomersFilter;ctx.renderModule('customers');return true}
    return false;
  }
  function bind(ctx){
    const input=document.querySelector('#nxCustomersSearch');
    if(input&&!input.dataset.bound){input.dataset.bound='1';input.addEventListener('input',e=>{prefs.search=e.target.value;ctx.renderModule('customers')})}
  }
  global.NuvexaCustomers={version:'11.13',render,handleClick,bind};
})(window);
