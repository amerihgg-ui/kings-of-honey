/* NUVEXA HUB V14.4 — Customer Workspace
   Presentation-only. No Supabase writes or auth logic changes.
*/
(()=>{'use strict';

  const VERSION='14.4';
  let busy=false;
  let scheduled=false;

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[ch]);

  function authBrand(){
    return `
      <section class="nx44-auth-brand" aria-label="NUVEXA HUB">
        <div class="nx44-auth-kicker"><i></i><span>NUVEXA CUSTOMER SPACE</span></div>
        <div class="nx44-auth-copy">
          <img src="assets/branding/logo-main.png" alt="NUVEXA HUB">
          <h1>حسابك.<span>طلباتك. في مكان واحد.</span></h1>
          <p>سجّل الدخول إلى مساحتك داخل NUVEXA HUB لمتابعة الطلبات، معرفة حالتها، والوصول إلى مشترياتك الرقمية بسهولة.</p>
          <div class="nx44-auth-line" aria-hidden="true"></div>
        </div>
        <div class="nx44-auth-foot">
          <span>Commerce · Digital Services</span>
          <b>Secure customer experience</b>
        </div>
      </section>`;
  }

  function installAuth(){
    const dialog=$('#customerAuthDialog');
    const card=dialog?.querySelector('.customer-auth-card');
    const body=dialog?.querySelector('.customer-auth-body');
    if(!dialog||!card||!body)return;

    // Remove previous visual-layer brand elements if any old file is still cached.
    $$('.nv-auth-brand-v142,.nv-auth-brand-v143,.nx44-auth-brand',card).forEach(node=>node.remove());
    body.insertAdjacentHTML('beforebegin',authBrand());
    card.dataset.nx44Auth='1';
  }

  function parseOrderRow(row){
    const left=$('span',row)?.textContent?.trim()||'';
    const total=$('strong',row)?.textContent?.trim()||'';
    const parts=left.split('·').map(x=>x.trim()).filter(Boolean);
    return {number:parts[0]||'طلب',status:parts.slice(1).join(' · ')||'جديد',total};
  }

  function cloudCode(status){
    const s=String(status||'');
    if(/جاهز|تأكيد|confirmed/i.test(s))return 'confirmed';
    if(/في الطريق|processing/i.test(s))return 'processing';
    if(/تم التسليم|مكتمل|completed/i.test(s))return 'completed';
    if(/ملغ|cancelled/i.test(s))return 'cancelled';
    if(/مرتجع|refunded/i.test(s))return 'refunded';
    return 'new';
  }

  function stageFor(code){
    if(code==='confirmed')return 2;
    if(code==='processing')return 3;
    if(code==='completed')return 4;
    if(code==='cancelled'||code==='refunded')return 0;
    return 1;
  }

  function formatDate(value){
    if(!value)return '';
    try{
      return new Intl.DateTimeFormat('ar-EG',{day:'numeric',month:'short',year:'numeric'}).format(new Date(value));
    }catch{return ''}
  }

  function runtimeOrder(number){
    try{
      const state=window.NuvexaRuntime?.getState?.();
      return (state?.orders||[]).find(o=>String(o.number||o.orderNumber||'')===String(number||''))||null;
    }catch{return null}
  }

  function orderCard(row){
    const parsed=parseOrderRow(row);
    const order=runtimeOrder(parsed.number);
    const code=order?.cloudStatus||cloudCode(parsed.status);
    const stage=stageFor(code);
    const itemCount=Array.isArray(order?.items)?order.items.reduce((sum,x)=>sum+(Number(x.qty||x.quantity)||0),0):0;
    const date=formatDate(order?.createdAt||order?.date);
    const meta=[date,itemCount?`${itemCount} عنصر`:''].filter(Boolean).join(' · ');

    return `
      <article class="nx44-order">
        <div>
          <div class="nx44-order-number">${esc(parsed.number)}</div>
          ${date?`<span class="nx44-order-date">${esc(date)}</span>`:''}
        </div>
        <div class="nx44-order-mid">
          <div class="nx44-order-statusline">
            <span class="nx44-status" data-state="${esc(code)}"><i></i>${esc(parsed.status)}</span>
          </div>
          <div class="nx44-progress" aria-label="تقدم الطلب">
            ${[1,2,3,4].map(n=>`<span class="${stage>=n?(code==='completed'?'done':'on'):''}"></span>`).join('')}
          </div>
          <div class="nx44-order-meta">${meta?esc(meta):'متابعة حالة الطلب من داخل حسابك'}</div>
        </div>
        <div class="nx44-order-total">
          <small>الإجمالي</small>
          <strong>${esc(parsed.total)}</strong>
        </div>
      </article>`;
  }

  function licenseRow(row){
    const spans=$$('span',row);
    const title=spans[0]?.childNodes?.[0]?.textContent?.trim()||spans[0]?.textContent?.trim()||'منتج رقمي';
    const small=$('small',row)?.textContent?.trim()||'';
    const key=$('.license-key',row)?.textContent?.trim()||spans[1]?.textContent?.trim()||'';
    return `
      <div class="nx44-license-row">
        <div><strong>${esc(title)}</strong>${small?`<small>${esc(small)}</small>`:''}</div>
        <div class="nx44-license-key">${esc(key)}</div>
      </div>`;
  }

  function section(id,label,title,subtitle,content,emptyText){
    return `
      <section class="nx44-section" id="${id}">
        <div class="nx44-section-head">
          <div><small>${esc(label)}</small><h2>${esc(title)}</h2></div>
          <span>${esc(subtitle)}</span>
        </div>
        ${content||`<div class="nx44-empty">${esc(emptyText)}</div>`}
      </section>`;
  }

  function transformAccount(){
    if(busy)return;
    const content=$('#customerAccountDialogContent');
    const body=content?.querySelector(':scope > .store-dialog-body');
    const head=body?.querySelector(':scope > .customer-account-head');
    if(!content||!body||!head)return;
    if(body.dataset.nx44Transformed==='1')return;

    busy=true;
    try{
      // Extract account identity.
      const avatar=$('.customer-account-avatar,.customer-account-fallback',head);
      const name=$('strong',head)?.textContent?.trim()||'عميل NUVEXA HUB';
      const identity=$$('.customer-account-meta span',head).map(x=>x.textContent.trim()).filter(Boolean);
      const logout=$('[data-action="customer-logout"]',head);

      // Extract legacy sections before replacing the body.
      const directH3=$$(':scope > h3',body);
      const ordersHead=directH3.find(h=>h.textContent.trim()==='طلباتي');
      const digitalHead=directH3.find(h=>h.textContent.trim()==='مشترياتي الرقمية');
      const seller=$(':scope > .seller-join-card',body);

      function between(start,end){
        const out=[];
        let node=start?.nextSibling;
        while(node&&node!==end){
          out.push(node);
          node=node.nextSibling;
        }
        return out;
      }

      const orderNodes=ordersHead?between(ordersHead,digitalHead||seller||null):[];
      const digitalNodes=digitalHead?between(digitalHead,seller||null):[];
      const orderRows=orderNodes.filter(n=>n.nodeType===1&&n.matches('.total-line'));
      const licenseRows=digitalNodes.filter(n=>n.nodeType===1&&n.matches('.total-line'));

      const parsedOrders=orderRows.map(parseOrderRow);
      const active=parsedOrders.filter(o=>!/(تم التسليم|مكتمل|ملغية|مرتجع)/.test(o.status)).length;
      const delivered=parsedOrders.filter(o=>/(تم التسليم|مكتمل)/.test(o.status)).length;

      const sellerButton=seller?.querySelector('.btn')?.outerHTML||'';
      const sellerTitle=seller?.querySelector('h3')?.textContent?.trim()||'حوّل حسابك إلى حساب بائع';
      const sellerText=seller?.querySelector('p')?.textContent?.trim()||'أضف منتجاتك وخدماتك وأدرها من لوحة بائع مخصصة.';

      // Identity rail.
      const rail=`
        <aside class="nx44-account-rail">
          <img class="nx44-account-logo" src="assets/branding/logo-main.png" alt="NUVEXA HUB">
          <div class="nx44-account-label">MY NUVEXA</div>
          <div class="nx44-account-profile">
            <div class="nx44-avatar">${avatar?avatar.outerHTML:'<div class="customer-account-fallback">👤</div>'}</div>
            <div>
              <h2>${esc(name)}</h2>
              <div class="nx44-account-meta">
                ${identity.length?identity.map(x=>`<span>${esc(x)}</span>`).join(''):'<span>حساب عميل NUVEXA HUB</span>'}
              </div>
            </div>
          </div>
          <div class="nx44-rail-rule"></div>
          <nav class="nx44-account-nav" aria-label="أقسام حسابي">
            <button type="button" class="active" data-nx44-jump="nx44Overview">نظرة عامة <b>01</b></button>
            <button type="button" data-nx44-jump="nx44Orders">طلباتي <b>02</b></button>
            <button type="button" data-nx44-jump="nx44Digital">المشتريات الرقمية <b>03</b></button>
          </nav>
          <div class="nx44-account-footer">
            ${logout?logout.outerHTML:'<button class="btn btn-soft btn-sm" data-action="customer-logout">تسجيل الخروج</button>'}
          </div>
        </aside>`;

      // Main.
      const firstName=name.split(/\s+/).filter(Boolean)[0]||name;
      const ordersHTML=orderRows.length
        ? `<div class="nx44-orders">${orderRows.map(orderCard).join('')}</div>`
        : '';
      const licensesHTML=licenseRows.length
        ? `<div class="nx44-license-list">${licenseRows.map(licenseRow).join('')}</div>`
        : '';

      const main=`
        <div class="nx44-main" id="nx44Overview">
          <header class="nx44-main-head">
            <span class="eyebrow">CUSTOMER WORKSPACE</span>
            <h1>أهلًا، ${esc(firstName)}</h1>
            <p>دي مساحتك الشخصية داخل NUVEXA HUB. من هنا تتابع حالة طلباتك وتراجع مشترياتك الرقمية بدون ما تدور في أكتر من مكان.</p>
          </header>

          <section class="nx44-metrics" aria-label="ملخص الحساب">
            <div class="nx44-metric"><small>إجمالي الطلبات</small><strong>${orderRows.length}</strong><em>كل الطلبات المرتبطة بالحساب</em></div>
            <div class="nx44-metric"><small>قيد المتابعة</small><strong>${active}</strong><em>طلبات لم تنتهِ بعد</em></div>
            <div class="nx44-metric"><small>تم التسليم</small><strong>${delivered}</strong><em>طلبات مكتملة</em></div>
            <div class="nx44-metric"><small>منتجات رقمية</small><strong>${licenseRows.length}</strong><em>تراخيص مرتبطة بالحساب</em></div>
          </section>

          ${section('nx44Orders','ORDERS','طلباتي','الحالة تتحدث مع تقدم الطلب',ordersHTML,'لا توجد طلبات مسجلة حتى الآن.')}
          ${section('nx44Digital','DIGITAL ACCESS','مشترياتي الرقمية','الوصول والتراخيص الرقمية',licensesHTML,'ستظهر المشتريات والتراخيص الرقمية هنا بعد التسليم.')}

          <section class="nx44-seller">
            <div>
              <span class="label">SELL ON NUVEXA</span>
              <h3>${esc(sellerTitle)}</h3>
              <p>${esc(sellerText)}</p>
            </div>
            ${sellerButton}
          </section>
        </div>`;

      // Preserve the close header created by app.js, replace only identity/body presentation.
      content.querySelector('.nx44-account-rail')?.remove();
      content.insertAdjacentHTML('afterbegin',rail);
      body.innerHTML=main;
      body.dataset.nx44Transformed='1';
      content.dataset.nx44Account='1';
    }catch(error){
      console.warn(`[NUVEXA ${VERSION}] account workspace`,error);
    }finally{
      busy=false;
    }
  }

  function scheduleTransform(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{
      scheduled=false;
      transformAccount();
    });
  }

  function boot(){
    installAuth();
    scheduleTransform();

    // app.js replaces customerAccountDialogContent.innerHTML when Account opens.
    const content=$('#customerAccountDialogContent');
    if(content){
      new MutationObserver(scheduleTransform).observe(content,{childList:true,subtree:false});
    }

    document.addEventListener('click',event=>{
      const jump=event.target.closest('[data-nx44-jump]');
      if(jump){
        const target=document.getElementById(jump.dataset.nx44Jump);
        if(target){
          $$('.nx44-account-nav button').forEach(b=>b.classList.toggle('active',b===jump));
          target.scrollIntoView({behavior:'smooth',block:'start'});
        }
        return;
      }

      if(event.target.closest('[data-action="customer-account"]')){
        // Give the existing app enough time to create either auth or account markup.
        setTimeout(()=>{
          installAuth();
          scheduleTransform();
        },90);
      }
    },true);

    window.NuvexaCustomerWorkspace=Object.freeze({
      version:VERSION,
      refresh:()=>{installAuth();scheduleTransform()}
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
