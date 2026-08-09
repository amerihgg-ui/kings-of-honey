/* NUVEXA HUB V13.1 — Unified Store Order Flow
   Scope: checkout only.
   - BOTH "platform" and "WhatsApp" paths save the order in Supabase first.
   - Customer profile is upserted by auth user id (no duplicate buyer rows).
   - WhatsApp opens only after the cloud order is successfully created.
   - Double-submit protection included.
   - No changes to Google OAuth/auth.js, products, seller, admin, or visual design.
*/
(()=>{'use strict';

  const VERSION='13.1';
  const CUSTOMER_SESSION_KEY='nuvexa_hub_customer_session_v10';
  const STORE_CART_KEY='nuvexa_hub_store_cart_v10';
  const STATE_KEY='nuvexa_hub_enterprise_v10';
  const OAUTH_INTENT_KEY='nuvexa_hub_oauth_intent_v10';

  let submitting=false;
  let savedAwaitingReload=false;

  const qs=(selector,root=document)=>root.querySelector(selector);
  const qsa=(selector,root=document)=>[...root.querySelectorAll(selector)];
  const esc=value=>String(value??'').replace(/[&<>'"]/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  }[char]));

  function readJSON(key,fallback){
    try{
      const raw=localStorage.getItem(key);
      return raw?JSON.parse(raw):fallback;
    }catch{return fallback}
  }

  function customerSession(){
    return readJSON(CUSTOMER_SESSION_KEY,null);
  }

  function cart(){
    const value=readJSON(STORE_CART_KEY,[]);
    return Array.isArray(value)?value:[];
  }

  function platformState(){
    return readJSON(STATE_KEY,{});
  }

  function supabaseClient(){
    return window.NuvexaAuth?.getClient?.()||null;
  }

  function currency(){
    return platformState()?.settings?.currency||'₺';
  }

  function money(value){
    const amount=Number(value)||0;
    return `${amount.toLocaleString('ar-EG',{maximumFractionDigits:2})} ${currency()}`;
  }

  function notify(message,type='ok'){
    const zone=qs('#toastZone');
    if(!zone){
      console[type==='error'?'warn':'log'](`[NUVEXA V${VERSION}]`,message);
      return;
    }
    const el=document.createElement('div');
    el.className=`toast ${type==='error'?'error':''}`;
    el.setAttribute('role',type==='error'?'alert':'status');
    el.innerHTML=`<b style="color:${type==='error'?'#ff8994':'#ffc65a'}">${type==='error'?'تنبيه':'تم'}</b> <span>${esc(message)}</span>`;
    zone.appendChild(el);
    setTimeout(()=>{
      el.style.opacity='0';
      el.style.transform='translateY(8px)';
      setTimeout(()=>el.remove(),220);
    },3600);
  }

  function whatsappNumber(){
    return String(platformState()?.settings?.whatsappNumber||'').replace(/\D/g,'');
  }

  function snapshot(mode){
    const items=cart();
    const session=customerSession();
    const address=String(qs('#storeOrderAddress')?.value||'').trim();
    const notes=String(qs('#storeOrderNotes')?.value||'').trim();
    const paymentMethod=String(qs('#storePaymentMethod')?.value||'cash').trim()||'cash';

    return {
      mode,
      items,
      session,
      address,
      notes,
      paymentMethod,
      total:items.reduce((sum,item)=>sum+(Number(item.qty)||0)*(Number(item.price)||0),0)
    };
  }

  function setBusy(on,mode='site'){
    qsa('[data-store-order]').forEach(button=>{
      if(on){
        if(!button.dataset.v13OriginalText)button.dataset.v13OriginalText=button.textContent;
        button.disabled=true;
        if(button.dataset.storeOrder===mode)button.textContent='جاري تسجيل الطلب…';
      }else{
        button.disabled=false;
        if(button.dataset.v13OriginalText){
          button.textContent=button.dataset.v13OriginalText;
          delete button.dataset.v13OriginalText;
        }
      }
    });
  }

  function showGoogleLoginRequired(){
    try{sessionStorage.setItem(OAUTH_INTENT_KEY,'checkout')}catch{}
    notify('لتسجيل الطلب داخل المنصة، أكمل تسجيل الدخول بحساب Google أولًا.','error');
    const dialog=qs('#customerAuthDialog');
    if(dialog&&!dialog.open){
      try{dialog.showModal()}catch{}
    }
  }

  async function authenticatedUser(sb){
    const {data,error}=await sb.auth.getSession();
    if(error)throw error;
    return data?.session?.user||null;
  }

  async function upsertBuyerProfile(sb,snap){
    const name=String(snap.session?.name||'').trim();
    const phone=String(snap.session?.phone||'').trim();

    if(name.length<2)throw new Error('اكتب اسم العميل قبل إتمام الطلب');
    if(phone.length<7)throw new Error('اكتب رقم هاتف صحيحًا قبل إتمام الطلب');

    const {error}=await sb.rpc('save_my_customer_profile',{
      p_full_name:name,
      p_phone:phone
    });
    if(error)throw error;
  }

  async function createOrder(sb,snap){
    const items=snap.items.map(item=>({
      product_id:item.productId,
      quantity:Math.max(1,Number(item.qty)||1)
    }));

    const channel=snap.mode==='whatsapp'?'WhatsApp':'المنصة';
    const cloudNotes=[
      snap.notes,
      `قناة استكمال الطلب: ${channel}`
    ].filter(Boolean).join('\n');

    const {data,error}=await sb.rpc('create_store_order',{
      p_items:items,
      p_shipping_address:{address:snap.address},
      p_notes:cloudNotes,
      p_payment_method:snap.paymentMethod
    });

    if(error)throw error;
    return Array.isArray(data)?data[0]:data;
  }

  function orderNumber(result){
    return `ORD-${result?.order_number||''}`;
  }

  function buildWhatsAppMessage(snap,number){
    return [
      'مرحبًا، تم تسجيل طلبي على NUVEXA HUB وأرغب في استكمال التواصل عبر واتساب.',
      '',
      `رقم الطلب: ${number}`,
      '',
      ...snap.items.map(item=>`• ${item.name} × ${item.qty} = ${money((Number(item.qty)||0)*(Number(item.price)||0))}`),
      '',
      `الإجمالي: ${money(snap.total)}`,
      `الاسم: ${snap.session?.name||''}`,
      `الهاتف: ${snap.session?.phone||''}`,
      `العنوان: ${snap.address||'غير مطلوب'}`,
      `ملاحظات: ${snap.notes||'لا توجد'}`
    ].join('\n');
  }

  function openWaitingWhatsAppTab(){
    let tab=null;
    try{
      tab=window.open('about:blank','_blank');
      if(tab){
        try{tab.opener=null}catch{}
        try{
          tab.document.open();
          tab.document.write(`<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>NUVEXA HUB</title><body style="font-family:Arial,sans-serif;padding:40px;text-align:center"><h2>NUVEXA HUB</h2><p>جاري تسجيل الطلب قبل فتح واتساب…</p></body></html>`);
          tab.document.close();
        }catch{}
      }
    }catch{}
    return tab;
  }

  function navigateWhatsApp(tab,url){
    if(tab&&!tab.closed){
      try{
        tab.location.replace(url);
        return true;
      }catch{}
    }
    try{
      const opened=window.open(url,'_blank','noopener');
      return !!opened;
    }catch{return false}
  }

  function closeWaitingTab(tab){
    if(tab&&!tab.closed){
      try{tab.close()}catch{}
    }
  }

  function clearStoredCart(){
    try{localStorage.setItem(STORE_CART_KEY,'[]')}catch{}
  }

  function renderSuccess({number,mode,whatsappUrl='',whatsappOpened=false}){
    const root=qs('#storeCheckoutDialogContent');
    if(!root)return;

    const viaWhatsApp=mode==='whatsapp';
    root.innerHTML=`
      <div class="store-dialog-head">
        <h3>تم استلام الطلب</h3>
        <button type="button" data-v13-order-return>✕</button>
      </div>
      <div class="store-dialog-body checkout-success">
        <i>✓</i>
        <h2>طلبك اتسجل بنجاح</h2>
        <p>${viaWhatsApp
          ?'تم حفظ الطلب داخل المنصة أولًا، ثم تجهيز التواصل عبر واتساب.'
          :'تم حفظ الطلب والفاتورة داخل حسابك على المنصة.'}</p>
        <span class="checkout-order-number">${esc(number)}</span>
        ${viaWhatsApp&&whatsappUrl?`
          <div style="margin-top:14px">
            <a class="btn btn-success" href="${esc(whatsappUrl)}" target="_blank" rel="noopener">
              ${whatsappOpened?'فتح واتساب مرة أخرى':'فتح واتساب لاستكمال التواصل'}
            </a>
          </div>`:''}
        <div style="margin-top:16px">
          <button class="btn btn-gold" type="button" data-v13-order-return>العودة للمتجر</button>
        </div>
      </div>`;
  }

  async function handleOrder(button){
    const mode=button?.dataset?.storeOrder;
    if(!['site','whatsapp'].includes(mode)||submitting)return;

    const snap=snapshot(mode);
    if(!snap.items.length){
      notify('السلة فارغة.','error');
      return;
    }

    const sb=supabaseClient();
    if(!sb){
      notify('تعذر الاتصال بخدمة الطلبات.','error');
      return;
    }

    const user=await authenticatedUser(sb);
    if(!user){
      showGoogleLoginRequired();
      return;
    }

    // The cloud order belongs to the authenticated account.
    if(snap.session?.userId&&snap.session.userId!==user.id){
      notify('جلسة العميل تحتاج إلى تحديث. سجّل الدخول مرة أخرى.','error');
      return;
    }

    const phone=mode==='whatsapp'?whatsappNumber():'';
    if(mode==='whatsapp'&&phone.length<8){
      notify('الطلب عبر واتساب غير مفعّل حاليًا.','error');
      return;
    }

    // Open a blank tab during the direct click so browsers do not block WhatsApp
    // after the asynchronous cloud save finishes.
    const whatsappTab=mode==='whatsapp'?openWaitingWhatsAppTab():null;

    submitting=true;
    setBusy(true,mode);

    try{
      // Upsert = new buyer is created once; an existing buyer is updated, never duplicated.
      await upsertBuyerProfile(sb,snap);

      // The order is ALWAYS created in NUVEXA HUB before any WhatsApp redirect.
      const result=await createOrder(sb,snap);
      const number=orderNumber(result);

      let whatsappUrl='';
      let whatsappOpened=false;

      if(mode==='whatsapp'){
        const message=buildWhatsAppMessage(snap,number);
        whatsappUrl=`https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        whatsappOpened=navigateWhatsApp(whatsappTab,whatsappUrl);
      }

      clearStoredCart();
      savedAwaitingReload=true;
      renderSuccess({number,mode,whatsappUrl,whatsappOpened});
      notify(`تم تسجيل الطلب ${number}`);
    }catch(error){
      closeWaitingTab(whatsappTab);
      console.warn('NUVEXA unified order flow:',error);
      const message=String(error?.message||'تعذر تسجيل الطلب');
      notify(
        /auth|jwt|session/i.test(message)
          ?'انتهت جلسة تسجيل الدخول. سجّل الدخول بحساب Google ثم حاول مرة أخرى.'
          :message,
        'error'
      );
    }finally{
      submitting=false;
      setBusy(false,mode);
    }
  }

  function returnToStore(){
    savedAwaitingReload=false;
    // Reload is intentional: app.js keeps its cart in a private runtime variable.
    // Reloading makes it read the already-cleared persisted cart and the new cloud order.
    location.reload();
  }

  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-store-order]');
    if(button){
      event.preventDefault();
      event.stopImmediatePropagation();
      handleOrder(button);
      return;
    }

    const back=event.target.closest('[data-v13-order-return]');
    if(back){
      event.preventDefault();
      event.stopImmediatePropagation();
      returnToStore();
    }
  },true);

  window.addEventListener('DOMContentLoaded',()=>{
    const dialog=qs('#storeCheckoutDialog');
    if(dialog){
      dialog.addEventListener('close',()=>{
        if(savedAwaitingReload)returnToStore();
      });
    }
  },{once:true});

  window.NuvexaOrderFlow=Object.freeze({
    version:VERSION
  });
})();
