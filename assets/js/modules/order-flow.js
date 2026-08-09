/* NUVEXA HUB V13.3 — Order Persistence + Accounting Sync
   Scope ONLY:
   1) Save BOTH platform and WhatsApp checkout to Supabase BEFORE success/WhatsApp.
   2) Keep buyer profile updated without duplicate cloud buyer records.
   3) Refresh orders/invoices from Supabase before Customer Account and admin Orders/Invoices.
   4) Refresh Buyers before admin Customers.
   5) Remove ONLY the physical-products category summary card from the storefront.
   No Google OAuth/auth.js changes. No redesign.
*/
(()=>{'use strict';

  const VERSION='13.3';
  const STATE_KEY='nuvexa_hub_enterprise_v10';
  const CUSTOMER_KEY='nuvexa_hub_customer_session_v10';
  const CART_KEY='nuvexa_hub_store_cart_v10';
  const OAUTH_INTENT_KEY='nuvexa_hub_oauth_intent_v10';

  let submitting=false;
  let savedOrderPendingClose=false;
  const bypassClicks=new WeakSet();

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  }[c]));

  function readJSON(key,fallback){
    try{
      const raw=localStorage.getItem(key);
      return raw?JSON.parse(raw):fallback;
    }catch{return fallback}
  }

  function writeJSON(key,value){
    try{
      localStorage.setItem(key,JSON.stringify(value));
      return true;
    }catch{return false}
  }

  function sb(){
    return window.NuvexaAuth?.getClient?.()||null;
  }

  function runtimeState(){
    return window.NuvexaRuntime?.getState?.()||readJSON(STATE_KEY,{});
  }

  function customerSession(){
    return readJSON(CUSTOMER_KEY,null);
  }

  function cart(){
    const value=readJSON(CART_KEY,[]);
    return Array.isArray(value)?value:[];
  }

  function toast(message,type='ok'){
    const zone=$('#toastZone');
    if(!zone){
      console[type==='error'?'warn':'log'](`[NUVEXA ${VERSION}]`,message);
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
    },3900);
  }

  function errorText(error){
    return String(error?.message||error?.details||error?.hint||'حدث خطأ غير متوقع');
  }

  async function currentUser(){
    const client=sb();
    if(!client)return null;
    const {data,error}=await client.auth.getSession();
    if(error)throw error;
    return data?.session?.user||null;
  }

  function statusLabel(status){
    return ({
      new:'جديد',
      confirmed:'جاهز للتوصيل',
      processing:'في الطريق',
      completed:'تم التسليم',
      cancelled:'ملغية',
      refunded:'مرتجع'
    })[status]||status||'جديد';
  }

  function paymentLabel(status){
    return ({
      pending:'معلقة',
      paid:'مدفوعة',
      partially_paid:'مدفوعة جزئيًا',
      failed:'فشل الدفع',
      refunded:'مستردة'
    })[status]||status||'معلقة';
  }

  function mapOrder(row){
    const items=(row.order_items||[]).map(item=>({
      id:item.id,
      productId:item.product_id,
      sellerId:item.seller_id,
      name:item.product_name,
      productName:item.product_name,
      qty:Number(item.quantity)||0,
      quantity:Number(item.quantity)||0,
      price:Number(item.unit_price)||0,
      unitPrice:Number(item.unit_price)||0,
      unitCost:Number(item.unit_cost)||0,
      cogsTotal:Number(item.cogs_total)||0,
      total:Number(item.line_total)||0,
      lineTotal:Number(item.line_total)||0
    }));
    const number=`ORD-${row.order_number}`;
    const address=row.shipping_address?.address||row.shipping_address?.text||'';
    return {
      id:row.id,
      number,
      orderNumber:number,
      cloudOrderNumber:row.order_number,
      customerId:row.buyer_id,
      buyerId:row.buyer_id,
      status:statusLabel(row.status),
      cloudStatus:row.status,
      date:row.created_at,
      createdAt:row.created_at,
      updatedAt:row.updated_at||row.created_at,
      currency:row.currency||'TRY',
      paymentMethod:row.payment_method||'cash',
      subtotal:Number(row.subtotal)||0,
      discount:Number(row.discount_total)||0,
      discountTotal:Number(row.discount_total)||0,
      shipping:Number(row.shipping_total)||0,
      shippingTotal:Number(row.shipping_total)||0,
      total:Number(row.grand_total)||0,
      grandTotal:Number(row.grand_total)||0,
      notes:row.notes||'',
      address,
      shippingAddress:row.shipping_address||{},
      items,
      lines:items,
      source:'cloud'
    };
  }

  function mapInvoice(row,order){
    const number=`INV-${row.invoice_number}`;
    const amountPaid=Number(row.amount_paid)||0;
    const delivered=order?.cloudStatus==='completed';
    const reversed=['cancelled','refunded'].includes(order?.cloudStatus);
    const recognized=delivered&&!reversed&&(!!row.recognized_at||Number(row.recognized_revenue||0)>0);
    const method=String(row.payment_method||order?.paymentMethod||'cash').toLowerCase()==='bank'?'bank':'cash';
    return {
      id:row.id,
      cloudId:row.id,
      number,
      invoiceNumber:number,
      cloudInvoiceNumber:row.invoice_number,
      orderId:row.order_id,
      sourceOrderId:row.order_id,
      customerId:row.buyer_id,
      buyerId:row.buyer_id,
      status:paymentLabel(row.status),
      cloudStatus:row.status,
      date:row.issued_at||row.created_at,
      issuedAt:row.issued_at||row.created_at,
      dueAt:row.due_at||null,
      currency:row.currency||'TRY',
      paymentMethod:row.payment_method||'cash',
      subtotal:Number(row.subtotal)||0,
      discount:Number(row.discount_total)||0,
      discountTotal:Number(row.discount_total)||0,
      total:Number(row.grand_total)||0,
      grandTotal:Number(row.grand_total)||0,
      paid:amountPaid,
      amountPaid,
      paymentMethod:method,
      payments:amountPaid>0?[{date:row.recognized_at||row.issued_at||row.created_at,amount:amountPaid,method}]:[],
      items:order?.items||[],
      recognizedAt:row.recognized_at||null,
      recognizedRevenue:Number(row.recognized_revenue)||0,
      recognizedCogs:Number(row.recognized_cogs)||0,
      recognizedProfit:Number(row.recognized_profit)||0,
      approved:recognized,
      notes:row.notes||'',
      source:'cloud'
    };
  }

  function persistRuntimeState(state){
    if(!state||typeof state!=='object')return;
    writeJSON(STATE_KEY,state);
  }

  async function syncCommerce({silent=false}={}){
    const client=sb();
    if(!client)return false;

    const user=await currentUser();
    if(!user)return false;

    const [ordersRes,invoicesRes]=await Promise.all([
      client.from('orders')
        .select('*,order_items(*)')
        .order('created_at',{ascending:false}),
      client.from('invoices')
        .select('*')
        .order('issued_at',{ascending:false})
    ]);

    if(ordersRes.error)throw ordersRes.error;
    if(invoicesRes.error)throw invoicesRes.error;

    const state=runtimeState();
    state.orders=(ordersRes.data||[]).map(mapOrder);
    const ordersById=new Map(state.orders.map(order=>[String(order.id),order]));
    state.salesInvoices=(invoicesRes.data||[])
      .map(row=>mapInvoice(row,ordersById.get(String(row.order_id))))
      .filter(invoice=>invoice.approved||invoice.cloudStatus==='refunded');
    // The built-in accounting engine calculates: revenue - COGS - expenses.
    // Keeping only delivered/recognized invoices here prevents pending orders from becoming profit.
    state.invoices=state.salesInvoices;

    persistRuntimeState(state);
    if(!silent)console.info(`[NUVEXA ${VERSION}] cloud commerce synced`,state.orders.length);
    return true;
  }

  function normalizeCloudCustomer(row,existing){
    const uid=row.user_id||row.id;
    return {
      ...(existing||{}),
      id:existing?.id||uid,
      authUserId:uid,
      userId:uid,
      name:row.full_name||row.name||existing?.name||'عميل',
      fullName:row.full_name||row.name||existing?.fullName||'عميل',
      phone:row.phone||existing?.phone||'',
      email:row.email||existing?.email||'',
      country:row.country||existing?.country||'',
      address:row.address||existing?.address||'',
      notes:row.notes||existing?.notes||'',
      createdAt:row.created_at||existing?.createdAt||new Date().toISOString(),
      source:'cloud'
    };
  }

  async function syncCustomers({silent=true}={}){
    const client=sb();
    if(!client)return false;
    const user=await currentUser();
    if(!user)return false;

    let rows=null;

    // Prefer the customer directory used by newer NUVEXA builds.
    const customerProfiles=await client.from('customer_profiles').select('*');
    if(!customerProfiles.error){
      rows=customerProfiles.data||[];
    }else{
      // Safe fallback: partners can read profiles; normal buyers will simply get
      // only their allowed row and this never blocks checkout/history.
      const profiles=await client.from('profiles')
        .select('id,email,full_name,phone,country,created_at,status');
      if(!profiles.error)rows=profiles.data||[];
    }

    if(!rows)return false;

    const state=runtimeState();
    const current=Array.isArray(state.customers)?state.customers:[];
    const byUser=new Map();
    current.forEach(c=>{
      const key=c.authUserId||c.userId||c.id;
      if(key)byUser.set(String(key),c);
    });

    const cloud=rows.map(row=>{
      const uid=row.user_id||row.id;
      return normalizeCloudCustomer(row,byUser.get(String(uid)));
    });

    // Keep purely local/manual customer records, replace/update matching cloud ones.
    const cloudIds=new Set(cloud.map(c=>String(c.authUserId||c.userId||c.id)));
    const localOnly=current.filter(c=>{
      const key=String(c.authUserId||c.userId||c.id||'');
      return !cloudIds.has(key);
    });

    state.customers=[...cloud,...localOnly];
    persistRuntimeState(state);
    if(!silent)console.info(`[NUVEXA ${VERSION}] customers synced`,cloud.length);
    return true;
  }

  async function updateBuyerProfile(user,snapshot){
    const client=sb();
    if(!client)return;

    const name=String(snapshot.session?.name||user.user_metadata?.full_name||user.user_metadata?.name||'').trim();
    const phone=String(snapshot.session?.phone||'').trim();

    if(name.length<2)throw new Error('اكتب اسم العميل قبل إتمام الطلب.');
    if(phone.length<7)throw new Error('أضف رقم الهاتف قبل إتمام الطلب.');

    // Canonical identity/profile row. This is an UPDATE of the logged-in buyer,
    // never a second auth/profile record.
    const profileUpdate=await client.from('profiles')
      .update({full_name:name,phone})
      .eq('id',user.id);

    if(profileUpdate.error){
      console.warn(`[NUVEXA ${VERSION}] profiles update:`,profileUpdate.error.message);
    }

    // Newer NUVEXA customer directory RPC. If unavailable on an older DB,
    // do not block the actual order; profiles + buyer_id still preserve ownership/history.
    try{
      const {error}=await client.rpc('save_my_customer_profile',{
        p_full_name:name,
        p_phone:phone
      });
      if(error)console.warn(`[NUVEXA ${VERSION}] customer directory RPC:`,error.message);
    }catch(error){
      console.warn(`[NUVEXA ${VERSION}] customer directory RPC unavailable`,error);
    }
  }

  function checkoutSnapshot(mode){
    const items=cart();
    const session=customerSession();
    const address=String($('#storeOrderAddress')?.value||'').trim();
    const notes=String($('#storeOrderNotes')?.value||'').trim();
    const paymentMethod=String($('#storePaymentMethod')?.value||'cash').trim()||'cash';

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

  async function createCloudOrder(snapshot){
    const client=sb();
    if(!client)throw new Error('تعذر الاتصال بخدمة الطلبات.');

    const pItems=snapshot.items.map(item=>({
      product_id:item.productId,
      quantity:Math.max(1,Number(item.qty)||1)
    }));

    if(pItems.some(item=>!item.product_id)){
      throw new Error('يوجد عنصر في السلة غير مربوط بمنتج المنصة. أعد فتح المنتج وأضفه للسلة مرة أخرى.');
    }

    const channel=snapshot.mode==='whatsapp'?'WhatsApp':'المنصة';
    const notes=[
      snapshot.notes,
      `قناة استكمال الطلب: ${channel}`
    ].filter(Boolean).join('\n');

    const {data,error}=await client.rpc('create_store_order',{
      p_items:pItems,
      p_shipping_address:{address:snapshot.address},
      p_notes:notes,
      p_payment_method:snapshot.paymentMethod
    });

    if(error)throw error;
    const result=Array.isArray(data)?data[0]:data;
    if(!result?.order_id)throw new Error('لم يرجع الخادم رقم الطلب بعد الحفظ.');
    return result;
  }

  function whatsappNumber(){
    const state=runtimeState();
    return String(state?.settings?.whatsappNumber||'').replace(/\D/g,'');
  }

  function currency(){
    return runtimeState()?.settings?.currency||'₺';
  }

  function money(value){
    return `${Number(value||0).toLocaleString('ar-EG',{maximumFractionDigits:2})} ${currency()}`;
  }

  function whatsappMessage(snapshot,orderNumber){
    return [
      'مرحبًا، تم تسجيل طلبي على NUVEXA HUB وأرغب في استكمال التواصل عبر واتساب.',
      '',
      `رقم الطلب: ${orderNumber}`,
      '',
      ...snapshot.items.map(item=>`• ${item.name||'منتج'} × ${item.qty||1} = ${money((Number(item.qty)||0)*(Number(item.price)||0))}`),
      '',
      `الإجمالي: ${money(snapshot.total)}`,
      `الاسم: ${snapshot.session?.name||''}`,
      `الهاتف: ${snapshot.session?.phone||''}`,
      `العنوان: ${snapshot.address||'غير مطلوب'}`,
      `ملاحظات: ${snapshot.notes||'لا توجد'}`
    ].join('\n');
  }

  function openWaitingTab(){
    try{
      const tab=window.open('about:blank','_blank');
      if(tab){
        try{tab.opener=null}catch{}
        try{
          tab.document.write('<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>NUVEXA HUB</title><body style="font-family:Arial,sans-serif;text-align:center;padding:45px"><h2>NUVEXA HUB</h2><p>جاري تسجيل الطلب داخل المنصة قبل فتح واتساب…</p></body></html>');
          tab.document.close();
        }catch{}
      }
      return tab;
    }catch{return null}
  }

  function closeTab(tab){
    try{if(tab&&!tab.closed)tab.close()}catch{}
  }

  function goWhatsApp(tab,url){
    try{
      if(tab&&!tab.closed){
        tab.location.replace(url);
        return true;
      }
    }catch{}
    try{return !!window.open(url,'_blank','noopener')}catch{return false}
  }

  function setBusy(on,mode){
    $$('[data-store-order]').forEach(button=>{
      if(on){
        if(!button.dataset.v133Text)button.dataset.v133Text=button.textContent;
        button.disabled=true;
        if(button.dataset.storeOrder===mode)button.textContent='جاري تسجيل الطلب…';
      }else{
        button.disabled=false;
        if(button.dataset.v133Text){
          button.textContent=button.dataset.v133Text;
          delete button.dataset.v133Text;
        }
      }
    });
  }

  function requireGoogle(){
    try{sessionStorage.setItem(OAUTH_INTENT_KEY,'checkout')}catch{}
    toast('لازم تسجّل الدخول بحساب Google حتى يُحفظ الطلب وتقدر تتابع حالته من حسابك.','error');
    const dialog=$('#customerAuthDialog');
    if(dialog&&!dialog.open){
      try{dialog.showModal()}catch{}
    }
  }

  function clearPersistedCart(){
    writeJSON(CART_KEY,[]);
  }

  function renderOrderSuccess({orderNumber,mode,whatsappUrl,whatsappOpened}){
    const root=$('#storeCheckoutDialogContent');
    if(!root)return;
    const viaWhatsApp=mode==='whatsapp';

    root.innerHTML=`
      <div class="store-dialog-head">
        <h3>تم تسجيل الطلب</h3>
        <button type="button" data-v133-order-return aria-label="إغلاق">✕</button>
      </div>
      <div class="store-dialog-body checkout-success">
        <i>✓</i>
        <h2>طلبك محفوظ داخل NUVEXA HUB</h2>
        <p>${viaWhatsApp
          ?'تم حفظ الطلب أولًا داخل المنصة، ويمكنك الآن استكمال التواصل عبر واتساب.'
          :'تم حفظ الطلب داخل حسابك، ويمكنك متابعة حالته من «حسابي».'}</p>
        <span class="checkout-order-number">${esc(orderNumber)}</span>
        <p style="margin-top:10px"><strong>الحالة الحالية: جديد</strong></p>
        ${viaWhatsApp&&whatsappUrl?`
          <div style="margin-top:14px">
            <a class="btn btn-success" href="${esc(whatsappUrl)}" target="_blank" rel="noopener">
              ${whatsappOpened?'فتح واتساب مرة أخرى':'فتح واتساب'}
            </a>
          </div>`:''}
        <div style="margin-top:16px">
          <button class="btn btn-gold" type="button" data-v133-order-return>العودة للمتجر</button>
        </div>
      </div>`;
  }

  async function submitCheckout(button){
    const mode=button?.dataset?.storeOrder;
    if(!['site','whatsapp'].includes(mode)||submitting)return;

    const snapshot=checkoutSnapshot(mode);
    if(!snapshot.items.length){
      toast('السلة فارغة.','error');
      return;
    }

    const client=sb();
    if(!client){
      toast('تعذر الاتصال بـ Supabase.','error');
      return;
    }

    let user;
    try{user=await currentUser()}
    catch(error){
      toast('تعذر التحقق من جلسة تسجيل الدخول.','error');
      return;
    }

    if(!user){
      requireGoogle();
      return;
    }

    if(snapshot.session?.userId&&snapshot.session.userId!==user.id){
      toast('جلسة العميل لا تطابق حساب Google الحالي. سجّل الدخول مرة أخرى.','error');
      return;
    }

    let waTab=null;
    let waPhone='';
    if(mode==='whatsapp'){
      waPhone=whatsappNumber();
      if(waPhone.length<8){
        toast('رقم واتساب غير مضبوط في إعدادات المنصة.','error');
        return;
      }
      // Open synchronously so browser popup blockers do not block it after await.
      waTab=openWaitingTab();
    }

    submitting=true;
    setBusy(true,mode);

    try{
      await updateBuyerProfile(user,snapshot);

      // Critical rule: cloud order is created BEFORE platform success or WhatsApp.
      const result=await createCloudOrder(snapshot);
      const orderNumber=`ORD-${result.order_number}`;

      // From this point the order is ALREADY saved. A later read/sync failure must never
      // tell the customer that the order failed or encourage a duplicate retry.
      try{
        await syncCommerce({silent:true});
      }catch(syncError){
        console.warn(`[NUVEXA ${VERSION}] order saved but commerce refresh failed`,syncError);
      }
      try{await syncCustomers({silent:true})}catch{}

      clearPersistedCart();

      let whatsappUrl='';
      let whatsappOpened=false;
      if(mode==='whatsapp'){
        whatsappUrl=`https://wa.me/${waPhone}?text=${encodeURIComponent(whatsappMessage(snapshot,orderNumber))}`;
        whatsappOpened=goWhatsApp(waTab,whatsappUrl);
      }

      savedOrderPendingClose=true;
      renderOrderSuccess({orderNumber,mode,whatsappUrl,whatsappOpened});
      toast(`تم تسجيل الطلب ${orderNumber} داخل المنصة.`);
    }catch(error){
      closeTab(waTab);
      console.error(`[NUVEXA ${VERSION}] checkout failed`,error);
      const msg=errorText(error);

      if(/infinite recursion|order_items.*policy|policy.*order_items/i.test(msg)){
        toast('سياسات الطلبات في Supabase تحتاج إصلاح V13.3. شغّل ملف RUN_THIS_FIRST_V13_3.sql مرة واحدة.','error');
      }else if(/create_store_order|schema cache|function .* does not exist|PGRST202/i.test(msg)){
        toast('وظيفة حفظ الطلب غير موجودة أو لم يتم تحديثها. شغّل ملف RUN_THIS_FIRST_V13_3.sql ثم جرّب مرة أخرى.','error');
      }else if(/auth|jwt|session/i.test(msg)){
        toast('انتهت جلسة تسجيل الدخول. سجّل الدخول بحساب Google ثم أعد المحاولة.','error');
      }else if(/Product is unavailable/i.test(msg)){
        toast('المنتج غير متاح حاليًا أو لم يتم اعتماده بعد.','error');
      }else{
        toast(`لم يتم حفظ الطلب: ${msg}`,'error');
      }
    }finally{
      submitting=false;
      setBusy(false,mode);
    }
  }

  async function refreshBeforeOpen(target,kind){
    if(bypassClicks.has(target)){
      bypassClicks.delete(target);
      return;
    }

    const session=customerSession();
    // Local-only login has no cloud buyer id; do not block its existing UI.
    if(kind==='account'&&!session?.userId)return;

    const user=await currentUser().catch(()=>null);
    if(!user)return;

    eventGuard.current=true;
    try{
      if(kind==='account'){
        await syncCommerce({silent:true});
      }else if(['orders','invoices','accounts','reports','sales','dashboard'].includes(kind)){
        await Promise.all([
          syncCommerce({silent:true}),
          ['orders','invoices'].includes(kind)?syncCustomers({silent:true}).catch(()=>false):Promise.resolve(false)
        ]);
      }else if(kind==='customers'){
        await syncCustomers({silent:true});
      }
    }finally{
      eventGuard.current=false;
    }

    bypassClicks.add(target);
    target.click();
  }

  const eventGuard={current:false};

  // ===== Remove ONLY the storefront physical-products summary card =====
  function removePhysicalSummaryCard(root=document){
    root.querySelectorAll?.('.store-category-card[data-store-filter="physical"]').forEach(card=>card.remove());
  }

  function installCardRemoval(){
    const style=document.createElement('style');
    style.id='nuvexa-v133-hide-physical-summary';
    style.textContent='.store-category-card[data-store-filter="physical"]{display:none!important}';
    document.head.appendChild(style);

    removePhysicalSummaryCard(document);
    const observer=new MutationObserver(mutations=>{
      for(const mutation of mutations){
        for(const node of mutation.addedNodes){
          if(node.nodeType===1){
            if(node.matches?.('.store-category-card[data-store-filter="physical"]'))node.remove();
            else removePhysicalSummaryCard(node);
          }
        }
      }
    });
    observer.observe(document.body,{childList:true,subtree:true});
  }

  document.addEventListener('click',event=>{
    const target=event.target.closest?.('[data-store-order],[data-v133-order-return],[data-action="customer-account"],[data-open-module]');
    if(!target)return;

    if(target.matches('[data-store-order]')){
      event.preventDefault();
      event.stopImmediatePropagation();
      submitCheckout(target);
      return;
    }

    if(target.matches('[data-v133-order-return]')){
      event.preventDefault();
      event.stopImmediatePropagation();
      savedOrderPendingClose=false;
      location.reload();
      return;
    }

    if(bypassClicks.has(target)){
      bypassClicks.delete(target);
      return;
    }

    if(target.matches('[data-action="customer-account"]')){
      const session=customerSession();
      if(!session?.userId)return;
      event.preventDefault();
      event.stopImmediatePropagation();
      refreshBeforeOpen(target,'account').catch(error=>{
        console.warn(`[NUVEXA ${VERSION}] account sync`,error);
        bypassClicks.add(target);
        target.click();
      });
      return;
    }

    if(target.matches('[data-open-module]')){
      const module=target.dataset.openModule;
      if(!['orders','invoices','customers','accounts','reports','sales','dashboard'].includes(module))return;

      event.preventDefault();
      event.stopImmediatePropagation();
      refreshBeforeOpen(target,module).catch(error=>{
        console.warn(`[NUVEXA ${VERSION}] module sync`,module,error);
        bypassClicks.add(target);
        target.click();
      });
    }
  },true);

  window.addEventListener('DOMContentLoaded',()=>{
    installCardRemoval();

    const dialog=$('#storeCheckoutDialog');
    if(dialog){
      dialog.addEventListener('close',()=>{
        if(savedOrderPendingClose){
          savedOrderPendingClose=false;
          location.reload();
        }
      });
    }

    // Initial background sync for an already authenticated Google session.
    setTimeout(async()=>{
      try{
        if(await currentUser()){
          await syncCommerce({silent:true});
        }
      }catch(error){
        console.warn(`[NUVEXA ${VERSION}] initial commerce sync`,error);
      }
    },1200);
  },{once:true});

  window.NuvexaOrderFlow=Object.freeze({
    version:VERSION,
    syncCommerce:()=>syncCommerce({silent:false}),
    syncCustomers:()=>syncCustomers({silent:false})
  });

})();