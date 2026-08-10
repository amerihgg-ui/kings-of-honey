/* NUVEXA HUB V14.9 — One-time clean-start reset
   Clears experimental BUSINESS data only.
   Preserves auth session, owner access, passwords, and site settings.
*/
(()=>{'use strict';

  const MARKER='nuvexa_clean_start_v14_9_done';
  const STORAGE='nuvexa_hub_enterprise_v10';
  const CART='nuvexa_hub_store_cart_v10';
  const PROJECT_DRAFTS=[
    'nuvexa_project_builder_v14_8_draft',
    'nuvexa_project_builder_v14_8_1_draft'
  ];

  if(localStorage.getItem(MARKER)==='1')return;

  try{
    let previous=null;
    try{previous=JSON.parse(localStorage.getItem(STORAGE)||'null')}catch{}

    // Keep only configuration/access-adjacent local values.
    // app.js Object.assign(blankState(), storedState) will recreate every
    // business array/counter as a clean empty value.
    const keep={};

    if(previous&&typeof previous==='object'){
      if(previous.settings&&typeof previous.settings==='object'){
        keep.settings=previous.settings;
      }
      if(previous.passwords&&typeof previous.passwords==='object'){
        keep.passwords=previous.passwords;
      }
      if(previous.profileImages&&typeof previous.profileImages==='object'){
        keep.profileImages=previous.profileImages;
      }
    }

    // Explicitly zero balances/counters even if older state had them.
    keep.accounts={
      openingCash:0,
      openingBank:0,
      closedMonths:[],
      reconciliations:[],
      monthlySnapshots:[]
    };
    keep.counters={
      sale:0,
      purchase:0,
      order:0,
      customer:0,
      supplier:0,
      expense:0,
      return:0,
      movement:0
    };

    localStorage.setItem(STORAGE,JSON.stringify(keep));
    localStorage.removeItem(CART);
    PROJECT_DRAFTS.forEach(key=>localStorage.removeItem(key));

    // Intentionally NOT removed:
    // - nuvexa-hub-supabase-auth-v11  (Google/Supabase login)
    // - customer/admin auth keys
    // - UI/theme/preferences
    localStorage.setItem(MARKER,'1');
    console.info('[NUVEXA V14.9] Experimental business data reset completed.');
  }catch(error){
    console.warn('[NUVEXA V14.9] Local data reset failed:',error);
  }
})();
