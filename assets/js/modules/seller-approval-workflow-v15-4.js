/* ============================================================
   NUVEXA HUB V15.4 — SELLER APPROVAL WORKFLOW

   Adds, without touching Google OAuth:
   - seller application count on admin bell
   - seller applications inside Alerts / "يتطلب إجراء"
   - seller application details
   - approve -> server grants seller role to the SAME Google user/email
   - reject -> required rejection reason
   - customer "حسابي" shows pending/approved/rejected + rejection reason
   - Supabase Realtime listener + safe polling fallback
   ============================================================ */
(()=>{'use strict';

  const VERSION='15.4';
  const POLL_MS=20000;

  let adminApplications=[];
  let myApplication=null;
  let loadingAdmin=false;
  let loadingMine=false;
  let channel=null;
  let renderQueued=false;

  const $=(sel,root=document)=>root.querySelector(sel);
  const $$=(sel,root=document)=>[...root.querySelectorAll(sel)];
  const esc=value=>String(value??'').replace(/[&<>'"]/g,ch=>({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  }[ch]));

  const auth=()=>window.NuvexaAuth;
  const client=()=>auth()?.getClient?.();
  const runtime=()=>window.NuvexaRuntime;
  const session=()=>runtime()?.getSession?.()?.customerSession||null;
  const canAdmin=()=>!!auth()?.canAdmin?.();
  const canSell=()=>!!auth()?.canSell?.();

  function toast(message,type='success'){
    try{
      runtime()?.core?.events?.emit?.('toast',{message,type});
      const zone=$('#toastZone');
      if(zone && !zone.querySelector(`[data-nx154-toast="${CSS.escape(message)}"]`)){
        const el=document.createElement('div');
        el.className=`toast ${type==='error'?'error':''}`;
        el.dataset.nx154Toast=message;
        el.textContent=message;
        zone.appendChild(el);
        setTimeout(()=>el.remove(),3200);
      }
    }catch{
      console[type==='error'?'error':'log'](message);
    }
  }

  function row(data){
    return Array.isArray(data)?(data[0]||null):(data||null);
  }

  function statusLabel(status){
    return {
      pending:'قيد المراجعة',
      approved:'تم القبول',
      rejected:'مرفوض'
    }[status]||'غير معروف';
  }

  function statusClass(status){
    return status==='approved'?'approved':status==='rejected'?'rejected':'pending';
  }

  function fmtDate(value){
    if(!value)return '—';
    try{return new Date(value).toLocaleString('ar-EG',{dateStyle:'medium',timeStyle:'short'})}
    catch{return String(value)}
  }

  function parseNotes(value){
    const text=String(value||'').trim();
    const match=text.match(/^النوع:\s*(.*?)\s*—\s*(.*)$/s);
    return match
      ? {sellerType:match[1].trim(),description:match[2].trim()}
      : {sellerType:'—',description:text};
  }

  function applicationDetails(app){
    const parsed=parseNotes(app?.notes);
    return {
      name:app?.full_name||'مستخدم',
      email:app?.email||'—',
      business:app?.business_name||'غير مذكور',
      sellerType:parsed.sellerType||'—',
      description:parsed.description||'—',
      status:statusLabel(app?.status),
      created:fmtDate(app?.created_at),
      reviewed:fmtDate(app?.reviewed_at),
      reason:app?.rejection_reason||''
    };
  }

  async function loadAdminApplications(force=false){
    if(!canAdmin()||!client()||loadingAdmin)return adminApplications;
    if(!force && adminApplications.length)return adminApplications;

    loadingAdmin=true;
    try{
      const {data,error}=await client().rpc('list_seller_applications_v154');
      if(error)throw error;
      adminApplications=(data||[]).map(x=>({...x}));
      scheduleRender();
      return adminApplications;
    }catch(error){
      console.warn('[NUVEXA V15.4] seller applications:',error?.message||error);
      return adminApplications;
    }finally{
      loadingAdmin=false;
    }
  }

  async function loadMyApplication(force=false){
    const s=session();
    if(!s?.userId||s.provider==='local'||!client()||loadingMine)return myApplication;
    if(!force && myApplication)return myApplication;

    loadingMine=true;
    try{
      const {data,error}=await client().rpc('get_my_seller_application_v154');
      if(error)throw error;
      myApplication=row(data);

      if(myApplication?.status==='approved'){
        await refreshOwnAccess();
      }

      scheduleRender();
      return myApplication;
    }catch(error){
      console.warn('[NUVEXA V15.4] my seller application:',error?.message||error);
      return myApplication;
    }finally{
      loadingMine=false;
    }
  }

  async function refreshOwnAccess(){
    const s=session();
    if(!s?.userId||!s?.email||!auth()?.loadAccess)return;

    try{
      await auth().loadAccess({
        userId:s.userId,
        email:s.email,
        name:s.name||''
      });

      const sellerBtn=$('#storeSellerEntryBtn');
      if(sellerBtn){
        sellerBtn.classList.toggle('hidden',!canSell());
        sellerBtn.title=canSell()?'دخول لوحة البائع':'';
      }
    }catch(error){
      console.warn('[NUVEXA V15.4] seller access refresh:',error);
    }
  }

  function pendingApps(){
    return adminApplications.filter(x=>x.status==='pending');
  }

  function updateAlertBadges(){
    const count=pendingApps().length;

    // Admin top bell.
    $$('[data-action="open-alerts"]').forEach(button=>{
      let badge=button.querySelector('.nx154-alert-badge');
      if(!badge){
        badge=document.createElement('span');
        badge.className='nx154-alert-badge';
        button.appendChild(badge);
      }
      badge.textContent=String(count);
      badge.hidden=count===0;
      button.setAttribute(
        'aria-label',
        count?`التنبيهات — ${count} طلب انضمام بائع بانتظار المراجعة`:'التنبيهات'
      );
    });

    // Any Alerts module entry: launcher + mobile nav.
    $$('[data-open-module="alerts"]').forEach(button=>{
      let badge=button.querySelector('.nx154-module-badge');
      if(!badge){
        badge=document.createElement('span');
        badge.className='nx154-module-badge';
        button.appendChild(badge);
      }
      badge.textContent=String(count);
      badge.hidden=count===0;
    });
  }

  function applicationCard(app,compact=false){
    const d=applicationDetails(app);
    return `
      <article class="nx154-app-card ${compact?'compact':''}" data-nx154-app="${esc(app.id)}">
        <div class="nx154-app-icon">♙</div>
        <div class="nx154-app-main">
          <div class="nx154-app-title">
            <div>
              <span>طلب انضمام بائع</span>
              <h3>${esc(d.name)}</h3>
            </div>
            <span class="nx154-status ${statusClass(app.status)}">${esc(d.status)}</span>
          </div>
          <div class="nx154-app-meta">
            <span>✉ ${esc(d.email)}</span>
            <span>▦ ${esc(d.business)}</span>
            <span>◷ ${esc(d.created)}</span>
          </div>
          ${compact?'':`<p class="nx154-app-desc">${esc(d.description)}</p>`}
        </div>
        <div class="nx154-app-actions">
          <button type="button" class="btn btn-soft btn-sm" data-nx154-details="${esc(app.id)}">التفاصيل</button>
          ${app.status==='pending'?`
            <button type="button" class="btn btn-success btn-sm" data-nx154-approve="${esc(app.id)}">قبول</button>
            <button type="button" class="btn btn-danger btn-sm" data-nx154-reject="${esc(app.id)}">رفض</button>
          `:''}
        </div>
      </article>`;
  }

  function adminPanelMarkup(mode='alerts'){
    const list=mode==='alerts'?pendingApps():adminApplications;
    const title=mode==='alerts'?'طلبات انضمام البائعين':'طلبات الانضمام كبائع';
    const subtitle=mode==='alerts'
      ? 'طلبات جديدة تحتاج قبول أو رفض من الإدارة.'
      : 'راجع بيانات المتقدمين وحالة كل طلب.';

    return `
      <section class="nx154-admin-panel" data-nx154-panel="${mode}">
        <div class="nx154-panel-head">
          <div>
            <span>SELLER ACCESS</span>
            <h2>${title}</h2>
            <p>${subtitle}</p>
          </div>
          <b>${list.filter(x=>x.status==='pending').length}</b>
        </div>
        <div class="nx154-app-list">
          ${list.length
            ? list.map(x=>applicationCard(x,mode==='alerts')).join('')
            : `<div class="nx154-empty"><span>✓</span><strong>لا توجد طلبات بائعين معلقة</strong><p>أي طلب جديد سيظهر هنا تلقائيًا وفي جرس التنبيهات.</p></div>`
          }
        </div>
      </section>`;
  }

  function alertsScreen(){
    const name=$('#moduleTopName')?.textContent?.trim()||'';
    if(!name.includes('التنبيهات'))return false;
    const main=$('#moduleMain');
    if(!main)return false;
    return /يتطلب إجراء/.test(main.textContent||'') && !/تنبيهات فقط/.test(main.querySelector('.page-head')?.textContent||'');
  }

  function sellersScreen(){
    const name=$('#moduleTopName')?.textContent?.trim()||'';
    return name.includes('البائع') && !!$('#moduleMain');
  }

  function injectAdminPanels(){
    if(!canAdmin())return;
    const main=$('#moduleMain');
    if(!main)return;

    if(alertsScreen()){
      let panel=main.querySelector('[data-nx154-panel="alerts"]');
      if(!panel){
        main.insertAdjacentHTML('afterbegin',adminPanelMarkup('alerts'));
      }else{
        panel.outerHTML=adminPanelMarkup('alerts');
      }
    }else{
      main.querySelector('[data-nx154-panel="alerts"]')?.remove();
    }

    if(sellersScreen()){
      // Hide the legacy seller-application panel so the cloud-current V15.4
      // panel is the single authoritative workflow.
      [...main.querySelectorAll('.panel')].forEach(panel=>{
        const title=panel.querySelector('.panel-head h3')?.textContent?.trim()||'';
        if(title==='طلبات الانضمام كبائع')panel.hidden=true;
      });

      let panel=main.querySelector('[data-nx154-panel="sellers"]');
      if(!panel){
        const anchor=main.querySelector('.page-head')||main.firstElementChild;
        if(anchor)anchor.insertAdjacentHTML('afterend',adminPanelMarkup('sellers'));
        else main.insertAdjacentHTML('afterbegin',adminPanelMarkup('sellers'));
      }else{
        panel.outerHTML=adminPanelMarkup('sellers');
      }
    }else{
      main.querySelector('[data-nx154-panel="sellers"]')?.remove();
    }
  }

  function accountStatusMarkup(app){
    const d=applicationDetails(app);

    if(app.status==='pending'){
      return `
        <div class="nx154-account-status pending">
          <span class="nx154-account-state-icon">◷</span>
          <div><strong>طلب الانضمام قيد المراجعة</strong><p>استلمت الإدارة طلبك كبائع، وسيظهر القرار هنا فور مراجعته.</p></div>
        </div>`;
    }

    if(app.status==='approved'){
      return `
        <div class="nx154-account-status approved">
          <span class="nx154-account-state-icon">✓</span>
          <div><strong>تم قبولك كبائع</strong><p>تم تفعيل صلاحية البائع على نفس حسابك وبريدك الإلكتروني.</p></div>
        </div>`;
    }

    if(app.status==='rejected'){
      return `
        <div class="nx154-account-status rejected">
          <span class="nx154-account-state-icon">!</span>
          <div>
            <strong>تم رفض طلب الانضمام</strong>
            <p>${d.reason?`سبب الرفض: ${esc(d.reason)}`:'تم رفض الطلب من الإدارة.'}</p>
          </div>
        </div>`;
    }

    return '';
  }

  function renderCustomerStatus(){
    const host=
      $('#customerAccountDialogContent .nx44-seller')||
      $('#customerAccountDialogContent .seller-join-card');

    if(!host)return;

    host.querySelector('.nx154-account-status')?.remove();

    if(!myApplication)return;

    host.insertAdjacentHTML('afterbegin',accountStatusMarkup(myApplication));

    const action=host.querySelector('[data-action="seller-apply"],[data-action="seller-access"]');
    if(!action)return;

    if(myApplication.status==='pending'){
      action.dataset.nx154OriginalAction=action.dataset.action||'seller-apply';
      action.removeAttribute('data-action');
      action.disabled=true;
      action.textContent='قيد مراجعة الإدارة';
      action.classList.remove('btn-gold','btn-success');
      action.classList.add('btn-soft');
    }else if(myApplication.status==='approved'){
      action.disabled=false;
      action.dataset.action='seller-access';
      action.textContent='فتح لوحة البائع';
      action.classList.remove('btn-gold','btn-soft');
      action.classList.add('btn-success');
    }else if(myApplication.status==='rejected'){
      action.disabled=false;
      action.dataset.action='seller-apply';
      action.textContent='إعادة تقديم الطلب';
      action.classList.remove('btn-success','btn-soft');
      action.classList.add('btn-gold');
    }
  }

  function detailsDialog(app){
    let dialog=$('#nx154SellerDetails');
    if(!dialog){
      dialog=document.createElement('dialog');
      dialog.id='nx154SellerDetails';
      dialog.className='nx154-dialog';
      document.body.appendChild(dialog);
    }

    const d=applicationDetails(app);
    dialog.innerHTML=`
      <div class="nx154-dialog-card">
        <header>
          <div><span>SELLER APPLICATION</span><h2>تفاصيل طلب الانضمام</h2></div>
          <button type="button" data-nx154-close>✕</button>
        </header>
        <div class="nx154-detail-grid">
          <div><small>الاسم</small><strong>${esc(d.name)}</strong></div>
          <div><small>البريد</small><strong dir="ltr">${esc(d.email)}</strong></div>
          <div><small>اسم النشاط</small><strong>${esc(d.business)}</strong></div>
          <div><small>نوع البيع</small><strong>${esc(d.sellerType)}</strong></div>
          <div class="wide"><small>نبذة المتقدم</small><p>${esc(d.description)}</p></div>
          <div><small>تاريخ الطلب</small><strong>${esc(d.created)}</strong></div>
          <div><small>الحالة</small><strong>${esc(d.status)}</strong></div>
          ${d.reason?`<div class="wide reason"><small>سبب الرفض</small><p>${esc(d.reason)}</p></div>`:''}
        </div>
        ${app.status==='pending'?`
          <footer>
            <button type="button" class="btn btn-success" data-nx154-approve="${esc(app.id)}">قبول وتحويله لبائع</button>
            <button type="button" class="btn btn-danger" data-nx154-reject="${esc(app.id)}">رفض الطلب</button>
          </footer>`:''}
      </div>`;
    dialog.showModal();
  }

  function rejectionDialog(app){
    let dialog=$('#nx154RejectDialog');
    if(!dialog){
      dialog=document.createElement('dialog');
      dialog.id='nx154RejectDialog';
      dialog.className='nx154-dialog';
      document.body.appendChild(dialog);
    }

    dialog.innerHTML=`
      <form class="nx154-dialog-card nx154-reject-card" data-nx154-reject-form="${esc(app.id)}">
        <header>
          <div><span>REJECTION REASON</span><h2>رفض طلب ${esc(app.full_name||'البائع')}</h2></div>
          <button type="button" data-nx154-close>✕</button>
        </header>
        <div class="nx154-reject-body">
          <p>اكتب سببًا واضحًا. السبب سيظهر للعميل داخل قسم «حسابي».</p>
          <textarea name="reason" minlength="3" maxlength="500" required placeholder="مثال: نحتاج تفاصيل أوضح عن نوع المنتجات والخدمات التي ستعرضها."></textarea>
        </div>
        <footer>
          <button type="submit" class="btn btn-danger">تأكيد الرفض وإرسال السبب</button>
          <button type="button" class="btn btn-soft" data-nx154-close>إلغاء</button>
        </footer>
      </form>`;
    dialog.showModal();
    setTimeout(()=>dialog.querySelector('textarea')?.focus(),50);
  }

  async function reviewApplication(id,decision,reason=''){
    if(!canAdmin()||!client())return;

    const app=adminApplications.find(x=>String(x.id)===String(id));
    if(!app)return toast('طلب الانضمام غير موجود','error');

    if(decision==='rejected' && String(reason||'').trim().length<3){
      return toast('اكتب سبب الرفض أولًا','error');
    }

    try{
      const {data,error}=await client().rpc('review_seller_application_v154',{
        p_application_id:id,
        p_decision:decision,
        p_reason:String(reason||'').trim()
      });
      if(error)throw error;

      const updated=row(data);
      const index=adminApplications.findIndex(x=>String(x.id)===String(id));
      if(index>=0 && updated)adminApplications[index]={...updated};

      $('#nx154SellerDetails')?.close();
      $('#nx154RejectDialog')?.close();

      await loadAdminApplications(true);
      scheduleRender();

      toast(
        decision==='approved'
          ? `تم قبول ${app.email} وتفعيل صلاحية البائع`
          : 'تم رفض الطلب وسيظهر السبب للعميل داخل حسابه'
      );
    }catch(error){
      toast(error?.message||'تعذر مراجعة طلب البائع','error');
    }
  }

  function openAlerts(){
    const moduleButton=$('[data-open-module="alerts"]');
    if(moduleButton){
      moduleButton.click();
      return;
    }

    try{
      const url=new URL(location.href);
      url.searchParams.set('module','alerts');
      location.assign(url.href);
    }catch{}
  }

  function scheduleRender(){
    if(renderQueued)return;
    renderQueued=true;
    requestAnimationFrame(()=>{
      renderQueued=false;
      updateAlertBadges();
      injectAdminPanels();
      renderCustomerStatus();
    });
  }

  function installRealtime(){
    if(channel||!client())return;

    try{
      channel=client()
        .channel('nuvexa-seller-applications-v154')
        .on('postgres_changes',
          {event:'*',schema:'public',table:'seller_applications'},
          async payload=>{
            if(canAdmin())await loadAdminApplications(true);

            const s=session();
            const changed=payload?.new||payload?.old||{};
            if(s?.userId && String(changed.user_id||'')===String(s.userId)){
              myApplication=null;
              await loadMyApplication(true);
            }

            scheduleRender();
          })
        .subscribe();
    }catch(error){
      console.warn('[NUVEXA V15.4] realtime unavailable; polling fallback active',error);
    }
  }

  function observeSurfaces(){
    const moduleMain=$('#moduleMain');
    if(moduleMain){
      new MutationObserver(()=>{
        if(canAdmin())loadAdminApplications(false);
        scheduleRender();
      }).observe(moduleMain,{childList:true,subtree:false});
    }

    const account=$('#customerAccountDialogContent');
    if(account){
      new MutationObserver(()=>{
        setTimeout(()=>{
          myApplication=null;
          loadMyApplication(true);
          scheduleRender();
        },130);
      }).observe(account,{childList:true,subtree:false});
    }
  }

  function bindEvents(){
    document.addEventListener('click',event=>{
      const openBell=event.target.closest('[data-action="open-alerts"]');
      if(openBell){
        event.preventDefault();
        event.stopImmediatePropagation();
        openAlerts();
        return;
      }

      const details=event.target.closest('[data-nx154-details]');
      if(details){
        const app=adminApplications.find(x=>String(x.id)===String(details.dataset.nx154Details));
        if(app)detailsDialog(app);
        return;
      }

      const approve=event.target.closest('[data-nx154-approve]');
      if(approve){
        reviewApplication(approve.dataset.nx154Approve,'approved','');
        return;
      }

      const reject=event.target.closest('[data-nx154-reject]');
      if(reject){
        const app=adminApplications.find(x=>String(x.id)===String(reject.dataset.nx154Reject));
        if(app)rejectionDialog(app);
        return;
      }

      const close=event.target.closest('[data-nx154-close]');
      if(close){
        close.closest('dialog')?.close();
        return;
      }

      if(event.target.closest('[data-action="customer-account"]')){
        setTimeout(()=>{
          myApplication=null;
          loadMyApplication(true);
        },180);
      }

      // Existing seller-management Reject button:
      // Require a reason instead of allowing a silent rejection.
      const legacyReject=event.target.closest('[data-seller-application="rejected"]');
      if(legacyReject){
        event.preventDefault();
        event.stopImmediatePropagation();
        const id=legacyReject.dataset.id;
        const app=adminApplications.find(x=>String(x.id)===String(id));
        if(app)rejectionDialog(app);
      }
    },true);

    document.addEventListener('submit',event=>{
      const form=event.target.closest('[data-nx154-reject-form]');
      if(!form)return;
      event.preventDefault();
      const reason=String(new FormData(form).get('reason')||'').trim();
      reviewApplication(form.dataset.nx154RejectForm,'rejected',reason);
    },true);
  }

  async function boot(){
    observeSurfaces();
    bindEvents();

    // Wait for app.js -> NuvexaRuntime and auth initialization.
    for(let i=0;i<60&&!runtime();i++){
      await new Promise(resolve=>setTimeout(resolve,100));
    }

    installRealtime();

    if(canAdmin())await loadAdminApplications(true);
    if(session()?.userId)await loadMyApplication(true);
    scheduleRender();

    // Fallback if Realtime publication is disabled.
    setInterval(async()=>{
      if(document.hidden)return;
      if(canAdmin())await loadAdminApplications(true);
      if(session()?.userId){
        myApplication=null;
        await loadMyApplication(true);
      }
      scheduleRender();
    },POLL_MS);

    window.NuvexaSellerApprovalWorkflow=Object.freeze({
      version:VERSION,
      refresh:async()=>{
        if(canAdmin())await loadAdminApplications(true);
        myApplication=null;
        if(session()?.userId)await loadMyApplication(true);
        scheduleRender();
      }
    });
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',boot,{once:true});
  }else{
    boot();
  }
})();
