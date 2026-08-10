/* ============================================================
   NUVEXA HUB V14.9.2 — TOTAL BUSINESS RESET
   Deletes ALL operational/business state, not a hand-picked subset.

   PRESERVED ONLY:
   - site/settings configuration
   - passwords/local access configuration
   - profileImages (UI only)
   - Supabase/Google auth session (stored under a different key)
   - profiles/user_roles in Supabase (protected by SQL)

   EVERYTHING ELSE in Platform State becomes empty/zero.
   ============================================================ */
(()=>{'use strict';

  const VERSION='14.9.2';
  const CLOUD_MARK='14.9.2-TOTAL-BUSINESS-RESET';
  const STORAGE='nuvexa_hub_enterprise_v10';
  const CART='nuvexa_hub_store_cart_v10';
  const LOCAL_DONE='nuvexa_total_business_reset_v14_9_2_seen';

  let running=false;
  let finished=false;
  let timer=null;
  let attempts=0;

  function cloudRow(remote){
    return Array.isArray(remote)?remote[0]:remote;
  }

  function cloudMarker(remote){
    return cloudRow(remote)?.meta?.cleanStartVersion||'';
  }

  function preservedConfig(state){
    return {
      settings: state?.settings && typeof state.settings==='object' ? state.settings : {},
      passwords: state?.passwords && typeof state.passwords==='object' ? state.passwords : {},
      profileImages: state?.profileImages && typeof state.profileImages==='object' ? state.profileImages : {}
    };
  }

  function makeTotallyBlankState(current){
    const keep=preservedConfig(current);

    // This object intentionally contains NO historical operational content.
    // New business data will be created naturally by the app from this point on.
    return {
      ...keep,

      products:[],
      sellerSubmissions:[],
      customers:[],
      suppliers:[],
      orders:[],
      salesInvoices:[],
      purchaseInvoices:[],
      expenses:[],
      recurringExpenses:[],
      returns:[],
      stockMovements:[],
      approvals:[],
      notifications:[],
      messages:[],
      workIssues:[],
      journal:[],
      finances:[],
      audit:[],
      backups:[],
      licenses:[],
      licenseProducts:[],

      accounts:{
        openingCash:0,
        openingBank:0,
        closedMonths:[],
        reconciliations:[],
        monthlySnapshots:[]
      },

      counters:{
        sale:0,
        purchase:0,
        order:0,
        customer:0,
        supplier:0,
        expense:0,
        return:0,
        movement:0
      },

      meta:{
        cleanStartVersion:CLOUD_MARK,
        cleanStartAt:new Date().toISOString()
      }
    };
  }

  function clearEveryKnownLocalBusinessKey(blank){
    try{
      // Replace the entire operational state object, do not merge with old state.
      localStorage.setItem(STORAGE,JSON.stringify(blank));

      // Cart/drafts/transient business data.
      [
        CART,
        'nuvexa_project_builder_v14_8_draft',
        'nuvexa_project_builder_v14_8_1_draft',
        'nuvexa_clean_start_v14_9_done',
        'nuvexa_hard_clean_v14_9_1_seen'
      ].forEach(key=>localStorage.removeItem(key));

      localStorage.setItem(LOCAL_DONE,'1');
    }catch(error){
      console.warn('[NUVEXA V14.9.2] Local reset warning:',error);
    }
  }

  function replaceRuntimeState(blank){
    const state=window.NuvexaRuntime?.getState?.();
    if(!state||typeof state!=='object')return false;

    // Delete every key in the live state first. This is the important change:
    // no unknown legacy/demo key can survive.
    Object.keys(state).forEach(key=>delete state[key]);
    Object.assign(state,JSON.parse(JSON.stringify(blank)));
    return true;
  }

  async function resetDedicatedCloudTables(client){
    // Best-effort immediate delete for current dedicated tables.
    // SQL file remains authoritative and deletes ALL non-protected public tables.
    const targets=[
      'product_reviews',
      'order_accounting_postings',
      'invoices',
      'order_items',
      'orders',
      'product_images',
      'products',
      'customer_profiles',
      'customers',
      'seller_applications',
      'seller_submissions',
      'inventory_movements',
      'stock_movements',
      'suppliers',
      'purchases',
      'expenses',
      'returns',
      'licenses',
      'notifications',
      'messages'
    ];

    for(const table of targets){
      try{
        // Filter that is true for normal rows without knowing table PK type.
        await client.from(table).delete().not('created_at','is',null);
      }catch{}
    }
  }

  async function run(){
    if(running||finished)return;

    const auth=window.NuvexaAuth;
    const runtime=window.NuvexaRuntime;
    const client=auth?.getClient?.();
    const session=runtime?.getSession?.();

    if(!client||!session?.customerSession?.userId||!auth?.canAdmin?.()){
      attempts++;
      if(attempts>100){
        clearInterval(timer);
        timer=null;
      }
      return;
    }

    running=true;

    try{
      const {data:remote,error:getError}=await client.rpc('get_platform_state');
      if(getError)throw getError;

      // Cloud marker prevents future devices from wiping production data.
      if(cloudMarker(remote)===CLOUD_MARK){
        finished=true;
        localStorage.setItem(LOCAL_DONE,'1');
        clearInterval(timer);
        timer=null;
        return;
      }

      const current=runtime.getState();
      const blank=makeTotallyBlankState(current);

      if(!replaceRuntimeState(blank)){
        throw new Error('تعذر استبدال حالة المنصة الحالية');
      }

      clearEveryKnownLocalBusinessKey(blank);

      // The cloud state itself becomes exactly this clean payload.
      // No old field is merged back.
      const cloudPayload=JSON.parse(JSON.stringify(blank));

      // Dedicated cloud tables own these records.
      delete cloudPayload.products;
      delete cloudPayload.orders;
      delete cloudPayload.salesInvoices;

      const {error:saveError}=await client.rpc('save_platform_state',{p_state:cloudPayload});
      if(saveError)throw saveError;

      await resetDedicatedCloudTables(client);

      finished=true;
      clearInterval(timer);
      timer=null;

      sessionStorage.setItem('nuvexa_total_business_reset_v14_9_2_reload','1');
      location.reload();
    }catch(error){
      console.warn('[NUVEXA V14.9.2] Total reset:',error?.message||error);
      running=false;
      attempts++;
    }
  }

  function boot(){
    if(sessionStorage.getItem('nuvexa_total_business_reset_v14_9_2_reload')==='1'){
      sessionStorage.removeItem('nuvexa_total_business_reset_v14_9_2_reload');
    }

    timer=setInterval(run,250);
    run();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',boot,{once:true});
  }else{
    boot();
  }

  window.NuvexaTotalBusinessReset=Object.freeze({version:VERSION});
})();
