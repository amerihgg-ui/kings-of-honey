/* ============================================================
   NUVEXA HUB V15.1 — VERIFIED FACTORY RESET

   This reset is intentionally different from V14.9.x:
   - It does NOT try client-side deletes against RLS-protected tables.
   - It calls one SECURITY DEFINER RPC installed by the companion SQL.
   - Supabase performs and verifies the actual server-side wipe.
   - Only after verified success do we replace local/admin Platform State.
   - A server-side marker prevents the wipe from ever repeating.
   ============================================================ */
(()=>{'use strict';

  const VERSION='15.1';
  const STORAGE='nuvexa_hub_enterprise_v10';
  const CART='nuvexa_hub_store_cart_v10';
  const LOCAL_MARK='nuvexa_factory_reset_v15_1_local_done';
  const RELOAD_MARK='nuvexa_factory_reset_v15_1_reload';

  let running=false;
  let finished=false;
  let attempts=0;
  let timer=null;

  function cleanState(current){
    const settings=(current?.settings&&typeof current.settings==='object')
      ? JSON.parse(JSON.stringify(current.settings)) : {};
    const passwords=(current?.passwords&&typeof current.passwords==='object')
      ? JSON.parse(JSON.stringify(current.passwords)) : {};
    const profileImages=(current?.profileImages&&typeof current.profileImages==='object')
      ? JSON.parse(JSON.stringify(current.profileImages)) : {};

    return {
      version:9.2,
      settings,
      passwords,
      profileImages,

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

      meta:{
        createdAt:new Date().toISOString(),
        lastDailyBackup:'',
        cleanStartVersion:'15.1',
        cleanStartAt:new Date().toISOString()
      }
    };
  }

  function replaceLiveState(blank){
    const live=window.NuvexaRuntime?.getState?.();
    if(!live||typeof live!=='object')return false;

    // Remove every legacy/demo key first so no unknown old property survives.
    Object.keys(live).forEach(key=>delete live[key]);
    Object.assign(live,JSON.parse(JSON.stringify(blank)));
    return true;
  }

  function persistBlank(blank){
    try{
      localStorage.setItem(STORAGE,JSON.stringify(blank));
      [
        CART,
        'nuvexa_project_builder_v14_8_draft',
        'nuvexa_project_builder_v14_8_1_draft',
        'nuvexa_clean_start_v14_9_done',
        'nuvexa_hard_clean_v14_9_1_seen',
        'nuvexa_final_zero_v14_9_2_seen',
        'nuvexa_total_business_reset_v14_9_2_seen'
      ].forEach(key=>localStorage.removeItem(key));
      localStorage.setItem(LOCAL_MARK,'1');
    }catch(error){
      console.warn('[NUVEXA V15.1] local reset persistence:',error);
    }
  }

  function platformPayload(blank){
    const copy=JSON.parse(JSON.stringify(blank));

    // Dedicated Supabase tables own these collections.
    delete copy.products;
    delete copy.orders;
    delete copy.salesInvoices;

    return copy;
  }

  async function run(){
    if(running||finished)return;

    const auth=window.NuvexaAuth;
    const runtime=window.NuvexaRuntime;
    const client=auth?.getClient?.();
    const session=runtime?.getSession?.();

    // Owner only. The SQL RPC ALSO validates the owner email server-side.
    if(!client||!session?.customerSession?.userId||!auth?.isOwner?.()){
      attempts++;
      if(attempts>120){
        clearInterval(timer);
        timer=null;
      }
      return;
    }

    running=true;

    try{
      const {data,error}=await client.rpc('nuvexa_factory_reset_v151');
      if(error)throw error;

      const result=Array.isArray(data)?data[0]:data;
      if(!result||result.ok!==true){
        throw new Error(result?.message||'لم يتم تأكيد تصفير قاعدة البيانات');
      }

      // If this browser is the one that actually performed the server wipe,
      // replace every local/admin business value and create a blank cloud state.
      if(result.reset_performed===true){
        const current=runtime.getState();
        const blank=cleanState(current);

        if(!replaceLiveState(blank)){
          throw new Error('تعذر تصفير حالة لوحة الإدارة المحلية');
        }

        persistBlank(blank);

        const saved=await client.rpc('save_platform_state',{
          p_state:platformPayload(blank)
        });
        if(saved.error)throw saved.error;

        sessionStorage.setItem(RELOAD_MARK,'1');
        finished=true;
        clearInterval(timer);
        timer=null;

        // Reload once; next boot reads empty orders/products/invoices from server.
        location.reload();
        return;
      }

      // Server says it was already completed successfully in the past.
      // Never wipe a future/new device again.
      finished=true;
      localStorage.setItem(LOCAL_MARK,'1');
      clearInterval(timer);
      timer=null;
    }catch(error){
      running=false;
      attempts++;
      console.error('[NUVEXA V15.1] VERIFIED FACTORY RESET FAILED:',error);

      // Keep retrying briefly. Crucially, NO success marker is written here.
      if(attempts>120){
        clearInterval(timer);
        timer=null;
      }
    }
  }

  function boot(){
    if(sessionStorage.getItem(RELOAD_MARK)==='1'){
      sessionStorage.removeItem(RELOAD_MARK);
    }

    timer=setInterval(run,300);
    run();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',boot,{once:true});
  }else{
    boot();
  }

  window.NuvexaFactoryResetV151=Object.freeze({version:VERSION});
})();
