/* ============================================================
   NUVEXA HUB V14.9.1 — HARD CLEAN START / CLOUD STATE RESET

   Why this exists:
   V14.9 cleared browser state, but app.js subsequently calls
   get_platform_state after owner/admin login. An old cloud state can
   therefore restore experimental accounting/admin numbers.

   This module runs AFTER app.js and overwrites the cloud platform state
   exactly once. A marker is stored inside the CLOUD state's meta object,
   so opening a second/new device later will NOT wipe real production data.
   ============================================================ */
(()=>{'use strict';

  const VERSION='14.9.1';
  const CLOUD_MARK='14.9.1';
  const STORAGE='nuvexa_hub_enterprise_v10';
  const CART='nuvexa_hub_store_cart_v10';
  const OLD_LOCAL_MARK='nuvexa_clean_start_v14_9_done';
  const LOCAL_DONE='nuvexa_hard_clean_v14_9_1_seen';
  const ZERO_UUID='00000000-0000-0000-0000-000000000000';

  let running=false;
  let finished=false;
  let timer=null;
  let attempts=0;

  const businessArrays=[
    'products',
    'sellerSubmissions',
    'customers',
    'suppliers',
    'orders',
    'salesInvoices',
    'purchaseInvoices',
    'expenses',
    'recurringExpenses',
    'returns',
    'stockMovements',
    'approvals',
    'notifications',
    'messages',
    'workIssues',
    'journal',
    'finances',
    'audit',
    'backups',
    'licenses',
    'licenseProducts'
  ];

  function cloudMarker(remote){
    const row=Array.isArray(remote)?remote[0]:remote;
    return row?.meta?.cleanStartVersion||'';
  }

  function zeroCurrentState(){
    const state=window.NuvexaRuntime?.getState?.();
    if(!state||typeof state!=='object')return null;

    businessArrays.forEach(key=>{state[key]=[]});

    state.accounts={
      openingCash:0,
      openingBank:0,
      closedMonths:[],
      reconciliations:[],
      monthlySnapshots:[]
    };

    state.counters={
      sale:0,
      purchase:0,
      order:0,
      customer:0,
      supplier:0,
      expense:0,
      return:0,
      movement:0
    };

    // Preserve only site/access configuration already in the runtime.
    // Everything operational is reset.
    state.meta={
      ...(state.meta||{}),
      cleanStartVersion:CLOUD_MARK,
      cleanStartAt:new Date().toISOString()
    };

    try{
      localStorage.setItem(STORAGE,JSON.stringify(state));
      localStorage.removeItem(CART);
      localStorage.removeItem('nuvexa_project_builder_v14_8_draft');
      localStorage.removeItem('nuvexa_project_builder_v14_8_1_draft');
      localStorage.setItem(OLD_LOCAL_MARK,'1');
      localStorage.setItem(LOCAL_DONE,'1');
    }catch{}

    return state;
  }

  function cloudPayloadFrom(state){
    const copy=JSON.parse(JSON.stringify(state||{}));

    // These live in dedicated cloud tables and are reset by the SQL file.
    delete copy.products;
    delete copy.orders;
    delete copy.salesInvoices;

    return copy;
  }

  async function tryKnownCloudDeletes(client){
    // SQL Editor remains the authoritative reset.
    // These are only a best-effort extra cleanup for normal public tables
    // where the current authenticated owner has delete permission.
    const targets=[
      'product_reviews',
      'order_accounting_postings',
      'invoices',
      'order_items',
      'orders',
      'product_images',
      'products',
      'customer_profiles',
      'seller_applications'
    ];

    for(const table of targets){
      try{
        // UUID id is used by current business tables. If a table/policy differs,
        // the SQL hard reset still handles it.
        await client.from(table).delete().neq('id',ZERO_UUID);
      }catch{}
    }
  }

  async function run(){
    if(running||finished)return;

    const auth=window.NuvexaAuth;
    const runtime=window.NuvexaRuntime;
    const client=auth?.getClient?.();
    const session=runtime?.getSession?.();

    // Wait until the owner/admin Google session and role resolution are ready.
    if(!client||!session?.customerSession?.userId||!auth?.canAdmin?.()){
      attempts++;
      if(attempts>80){
        clearInterval(timer);
        timer=null;
      }
      return;
    }

    running=true;

    try{
      const {data:remote,error:getError}=await client.rpc('get_platform_state');
      if(getError)throw getError;

      // GLOBAL cloud marker: this is what prevents a new device from
      // resetting real production data in the future.
      if(cloudMarker(remote)===CLOUD_MARK){
        finished=true;
        localStorage.setItem(LOCAL_DONE,'1');
        clearInterval(timer);
        timer=null;
        return;
      }

      const state=zeroCurrentState();
      if(!state)throw new Error('تعذر الوصول إلى حالة NUVEXA الحالية');

      const payload=cloudPayloadFrom(state);
      const {error:saveError}=await client.rpc('save_platform_state',{p_state:payload});
      if(saveError)throw saveError;

      await tryKnownCloudDeletes(client);

      finished=true;
      clearInterval(timer);
      timer=null;

      // Reload exactly once so app.js boots against the NEW blank cloud state.
      sessionStorage.setItem('nuvexa_hard_clean_v14_9_1_reload','1');
      location.reload();
    }catch(error){
      console.warn('[NUVEXA V14.9.1] Hard cloud reset:',error?.message||error);
      running=false;
      attempts++;
    }
  }

  function boot(){
    if(sessionStorage.getItem('nuvexa_hard_clean_v14_9_1_reload')==='1'){
      sessionStorage.removeItem('nuvexa_hard_clean_v14_9_1_reload');
    }

    // App/auth initialization is async; short-lived polling only until access
    // is resolved. There is no permanent observer or background loop.
    timer=setInterval(run,250);
    run();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',boot,{once:true});
  }else{
    boot();
  }

  window.NuvexaHardCleanStart=Object.freeze({version:VERSION});
})();
