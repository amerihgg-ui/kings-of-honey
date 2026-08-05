/* NUVEXA HUB V11.9 — Products module */
(function(global){
  'use strict';
  const prefs={
    view:localStorage.getItem('nuvexa_hub_products_view')||'table',
    filter:'all',
    search:''
  };
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  function matches(p){
    if(p.archived&&prefs.filter!=='archived')return false;
    if(prefs.filter==='physical'&&p.type==='digital')return false;
    if(prefs.filter==='digital'&&p.type!=='digital')return false;
    if(prefs.filter==='published'&&(p.showInStore===false||p.archived))return false;
    if(prefs.filter==='hidden'&&p.showInStore!==false)return false;
    if(prefs.filter==='archived'&&!p.archived)return false;
    const q=prefs.search.trim().toLowerCase();
    return !q||`${p.name||''} ${p.sku||''} ${p.category||''} ${p.developerName||''}`.toLowerCase().includes(q);
  }
  const viewSwitch=()=>`<div class="catalog-view-switch" aria-label="طريقة العرض">
    <button class="view-switch-btn ${prefs.view==='table'?'active':''}" data-nx-products-view="table" title="جدول">▤</button>
    <button class="view-switch-btn ${prefs.view==='cards'?'active':''}" data-nx-products-view="cards" title="بطاقات">▦</button>
    <button class="view-switch-btn ${prefs.view==='list'?'active':''}" data-nx-products-view="list" title="قائمة">☰</button>
  </div>`;
  function actions(p){return `<div class="toolbar"><button class="btn btn-soft btn-sm" data-modal="product" data-id="${p.id}">تعديل</button><button class="btn btn-danger btn-sm" data-archive-product="${p.id}">أرشفة</button></div>`}
  function cards(list,ctx){return `<div class="admin-products-grid">${list.map(p=>`<article class="admin-product-card"><img src="${p.image||'assets/products/product-placeholder.webp'}" alt=""><div class="admin-product-card-body"><h3>${esc(p.name)}</h3><div class="admin-product-meta"><span>${p.type==='digital'?'خدمة رقمية':'منتج'}</span><strong>${ctx.money(p.price)}</strong></div><div class="admin-product-meta"><span>${p.type==='digital'?`${ctx.num(p.deviceLimit)||1} جهاز`:`المخزون ${ctx.num(p.stock)}`}</span><span>${p.showInStore===false?'مخفي':'منشور'}</span></div>${actions(p)}</div></article>`).join('')}</div>`}
  function listView(list,ctx){return `<div class="admin-products-list">${list.map(p=>`<article class="admin-product-row"><img src="${p.image||'assets/products/product-placeholder.webp'}" alt=""><div><strong>${esc(p.name)}</strong><div class="muted">${esc(p.sku||p.category||'بدون تصنيف')}</div></div><span class="hide-mobile">${p.type==='digital'?'خدمة رقمية':'منتج'}</span><strong class="hide-mobile">${ctx.money(p.price)}</strong>${actions(p)}</article>`).join('')}</div>`}
  function table(list,ctx){return `<div class="table-wrap"><table class="table"><thead><tr><th>الصورة</th><th>المنتج</th><th>النوع</th><th>سعر البيع</th><th>المخزون/الأجهزة</th><th>ظهور المتجر</th><th>إجراءات</th></tr></thead><tbody>${list.map(p=>`<tr><td><img src="${p.image||'assets/products/product-placeholder.webp'}" style="width:52px;height:52px;border-radius:12px;object-fit:cover"></td><td><strong>${esc(p.name)}</strong><div class="muted">${esc(p.sku||p.size||'')}</div></td><td>${ctx.statusBadge(p.type==='digital'?'رقمي':'عادي')}</td><td>${ctx.money(p.price)}</td><td>${p.type==='digital'?`${ctx.num(p.deviceLimit)||1} جهاز`:ctx.num(p.stock)}</td><td>${p.showInStore===false?ctx.statusBadge('مخفي'):ctx.statusBadge('معتمد')}</td><td>${actions(p)}</td></tr>`).join('')}</tbody></table></div>`}
  function render(ctx){
    if(ctx.activeTab()==='التراخيص الرقمية')return ctx.renderDigitalLicenses();
    const all=ctx.state.products||[],list=all.filter(matches);
    const cloudNote=ctx.cloudProductsError()?`<div class="platform-cloud-error">تعذر مزامنة المنتجات: ${esc(ctx.cloudProductsError())}</div>`:`<div class="submission-cloud-note"><i>☁️</i><div><strong>المنتجات مرتبطة بـ Supabase</strong><p>الإضافة والتعديل والأرشفة تُحفظ الآن في قاعدة البيانات السحابية.</p></div></div>`;
    const filters=[['all','الكل',all.filter(p=>!p.archived).length],['physical','المنتجات',all.filter(p=>!p.archived&&p.type!=='digital').length],['digital','الخدمات الرقمية',all.filter(p=>!p.archived&&p.type==='digital').length],['published','المنشورة',all.filter(p=>!p.archived&&p.showInStore!==false).length],['hidden','المخفية',all.filter(p=>!p.archived&&p.showInStore===false).length],['archived','المؤرشفة',all.filter(p=>p.archived).length]];
    const controls=`<div class="products-admin-toolbar"><label class="searchbox"><span>⌕</span><input id="nxProductsSearch" class="input" value="${esc(prefs.search)}" placeholder="ابحث بالاسم أو SKU أو التصنيف..."></label>${viewSwitch()}</div><div class="products-admin-filters">${filters.map(([id,label,count])=>`<button class="${prefs.filter===id?'active':''}" data-nx-products-filter="${id}">${label} <small>${count}</small></button>`).join('')}</div>`;
    let body='';
    if(!list.length)body=ctx.empty('assets/products/product-placeholder.webp','لا توجد نتائج','غيّر البحث أو الفلتر، أو أضف منتجًا أو خدمة جديدة.',`<button class="btn btn-gold" data-modal="product">إضافة منتج أو خدمة</button>`);
    else body=prefs.view==='cards'?cards(list,ctx):prefs.view==='list'?listView(list,ctx):table(list,ctx);
    return `${ctx.pageHead('المنتجات والخدمات','إدارة المنتجات والخدمات بثلاث طرق عرض مع بحث وفلاتر سريعة.',`<button class="btn btn-gold" data-modal="product">＋ منتج أو خدمة</button>`)}${cloudNote}<section class="panel"><div class="panel-body">${controls}${body}</div></section>`;
  }
  function handleClick(e,ctx){
    let el=e.target.closest('[data-nx-products-view]');
    if(el){prefs.view=el.dataset.nxProductsView;localStorage.setItem('nuvexa_hub_products_view',prefs.view);ctx.renderModule('products');return true}
    el=e.target.closest('[data-nx-products-filter]');
    if(el){prefs.filter=el.dataset.nxProductsFilter;ctx.renderModule('products');return true}
    return false;
  }
  function bind(ctx){
    const input=document.querySelector('#nxProductsSearch');
    if(input&&!input.dataset.bound){input.dataset.bound='1';input.addEventListener('input',e=>{prefs.search=e.target.value;ctx.renderModule('products')})}
  }
  global.NuvexaProducts={version:'11.9',render,handleClick,bind};
})(window);
