/* NUVEXA HUB V14.3 — Customer Account Experience
   Presentation only: reuses the existing auth/account DOM and data-action hooks.
*/
(()=>{'use strict';

  const VERSION='14.3';
  let authBusy=false;
  let accountBusy=false;

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[ch]);

  function authBrand(){
    return `
      <section class="nv-auth-brand-v143" aria-label="NUVEXA HUB">
        <div class="nv-auth-brand-kicker-v143"><i></i><span>NUVEXA CUSTOMER SPACE</span></div>
        <div class="nv-auth-wordmark-v143">
          <img src="assets/branding/logo-main.png" alt="NUVEXA HUB">
          <h1>حسابك.<span>طلباتك. في مكان واحد.</span></h1>
          <p>ادخل إلى مساحتك داخل NUVEXA HUB لمتابعة الطلبات، معرفة حالتها، والوصول إلى مشترياتك الرقمية بدون خطوات متكررة.</p>
          <div class="nv-auth-wordmark-line-v143" aria-hidden="true"></div>
        </div>
        <div class="nv-auth-brand-foot-v143">
          <span>Commerce · Digital Services</span>
          <b>Secure account experience</b>
        </div>
      </section>`;
  }

  function installAuth(){
    if(authBusy)return;
    const dialog=$('#customerAuthDialog');
    const card=dialog?.querySelector('.customer-auth-card');
    const body=dialog?.querySelector('.customer-auth-body');
    if(!dialog||!card||!body)return;

    authBusy=true;
    try{
      $$('.nv-auth-brand-v142',card).forEach(node=>node.remove());
      if(!$('.nv-auth-brand-v143',card))body.insertAdjacentHTML('beforebegin',authBrand());
      card.dataset.nvAuthVisual=VERSION;
      dialog.dataset.nvAuthVisual=VERSION;
    }finally{authBusy=false}
  }

  function directH3(body,text){
    return $$(':scope > h3',body).find(h=>h.textContent.trim()===text)||null;
  }

  function nodesBetween(start,end){
    const nodes=[];
    let node=start?.nextSibling;
    while(node&&node!==end){
      const next=node.nextSibling;
      nodes.push(node);
      node=next;
    }
    return nodes;
  }

  function orderStillActive(text){
    return !/(تم التسليم|ملغية|مرتجع|مكتمل)/.test(String(text||''));
  }

  function makeSection(label,title,nodes){
    const section=document.createElement('section');
    section.className='nv-account-section-v143';
    section.innerHTML=`
      <div class="nv-account-section-head-v143">
        <div><small>${esc(label)}</small><h2>${esc(title)}</h2></div>
        <b>مرتبطة بحسابك</b>
      </div>
      <div class="nv-account-rows-v143"></div>`;

    const rows=$('.nv-account-rows-v143',section);
    nodes.forEach(node=>{
      if(node.nodeType===1&&node.matches('p')){
        node.classList.add('nv-account-empty-v143');
        node.removeAttribute('style');
      }
      rows.appendChild(node);
    });
    return section;
  }

  function accountSideFrom(head){
    const avatar=$('.customer-account-avatar,.customer-account-fallback',head);
    const name=$('strong',head)?.textContent?.trim()||'عميل NUVEXA HUB';
    const identity=$$('.customer-account-meta span',head).map(x=>x.textContent.trim()).filter(Boolean);
    const logout=$('[data-action="customer-logout"]',head);

    return `
      <aside class="nv-account-side-v143">
        <img class="nv-account-side-logo-v143" src="assets/branding/logo-main.png" alt="NUVEXA HUB">
        <div class="nv-account-side-kicker-v143">MY NUVEXA</div>
        <div class="nv-account-side-profile-v143">
          <div class="nv-account-avatar-wrap-v143">${avatar?avatar.outerHTML:'<div class="customer-account-fallback">👤</div>'}</div>
          <div>
            <h2>${esc(name)}</h2>
            <div class="nv-account-meta-v143">
              ${identity.length?identity.map(v=>`<span>${esc(v)}</span>`).join(''):'<span>حساب عميل NUVEXA HUB</span>'}
            </div>
          </div>
        </div>
        <div class="nv-account-side-rule-v143"></div>
        <div class="nv-account-side-nav-v143" aria-hidden="true">
          <span class="active">نظرة عامة <b>01</b></span>
          <span>طلباتي <b>02</b></span>
          <span>المشتريات الرقمية <b>03</b></span>
        </div>
        <div class="nv-account-side-actions-v143">
          ${logout?logout.outerHTML:'<button class="btn btn-soft btn-sm" data-action="customer-logout">تسجيل الخروج</button>'}
        </div>
      </aside>`;
  }

  function installAccount(){
    if(accountBusy)return;
    const dialog=$('#customerAccountDialog');
    const content=$('#customerAccountDialogContent');
    const body=content?.querySelector(':scope > .store-dialog-body');
    const head=body?.querySelector(':scope > .customer-account-head');
    if(!dialog||!content||!body||!head)return;
    if(content.dataset.nvAccountVisual===VERSION)return;

    accountBusy=true;
    try{
      const ordersHead=directH3(body,'طلباتي');
      const digitalHead=directH3(body,'مشترياتي الرقمية');
      const seller=$(':scope > .seller-join-card',body);

      const orderNodes=ordersHead?nodesBetween(ordersHead,digitalHead||seller||null):[];
      const digitalNodes=digitalHead?nodesBetween(digitalHead,seller||null):[];

      const orderRows=orderNodes.filter(n=>n.nodeType===1&&n.matches('.total-line'));
      const digitalRows=digitalNodes.filter(n=>n.nodeType===1&&n.matches('.total-line'));
      const activeCount=orderRows.filter(row=>orderStillActive(row.textContent)).length;

      ordersHead?.remove();
      digitalHead?.remove();

      const mainHead=document.createElement('header');
      mainHead.className='nv-account-main-head-v143';
      mainHead.innerHTML=`
        <span>YOUR ACCOUNT</span>
        <h1>مساحتك داخل NUVEXA HUB</h1>
        <p>تابع طلباتك وحالتها، وراجع مشترياتك الرقمية من نفس الحساب الذي تستخدمه في الشراء.</p>`;

      const overview=document.createElement('section');
      overview.className='nv-account-overview-v143';
      overview.innerHTML=`
        <div class="nv-account-stat-v143">
          <small>إجمالي الطلبات</small><strong>${orderRows.length}</strong><em>طلب مرتبط بحسابك</em>
        </div>
        <div class="nv-account-stat-v143">
          <small>قيد المتابعة</small><strong>${activeCount}</strong><em>طلبات لم تنتهِ بعد</em>
        </div>
        <div class="nv-account-stat-v143">
          <small>مشتريات رقمية</small><strong>${digitalRows.length}</strong><em>ترخيص أو منتج رقمي</em>
        </div>`;

      // Remove the legacy identity header after extracting its data.
      head.style.display='none';

      body.insertBefore(overview,body.firstChild);
      body.insertBefore(mainHead,overview);

      if(orderNodes.length)body.insertBefore(makeSection('ORDERS','طلباتي',orderNodes),seller||null);
      if(digitalNodes.length)body.insertBefore(makeSection('DIGITAL ACCESS','مشترياتي الرقمية',digitalNodes),seller||null);

      content.insertAdjacentHTML('afterbegin',accountSideFrom(head));
      content.dataset.nvAccountVisual=VERSION;
      dialog.dataset.nvAccountVisual=VERSION;
    }catch(error){
      console.warn(`[NUVEXA ${VERSION}] account visual`,error);
    }finally{accountBusy=false}
  }

  function boot(){
    installAuth();
    installAccount();

    const auth=$('#customerAuthDialog');
    if(auth){
      new MutationObserver(()=>installAuth()).observe(auth,{childList:true,subtree:true});
    }

    const account=$('#customerAccountDialogContent');
    if(account){
      new MutationObserver(()=>{
        // app.js recreates the account markup every time the dialog opens.
        if(!account.dataset.nvAccountVisual||account.dataset.nvAccountVisual!==VERSION)installAccount();
      }).observe(account,{childList:true,subtree:false});
    }

    document.addEventListener('click',event=>{
      if(event.target.closest('[data-action="customer-account"]')){
        setTimeout(()=>{installAuth();installAccount()},60);
      }
    },true);

    window.NuvexaAccountExperience=Object.freeze({version:VERSION,refresh:()=>{installAuth();installAccount()}});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
