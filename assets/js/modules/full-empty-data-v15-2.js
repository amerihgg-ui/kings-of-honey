/* NUVEXA HUB V15.2 — FULL EMPTY DATA (LOCAL, ONE TIME)
   Keeps site config/login config only. All section/business data becomes blank.
*/
(()=>{'use strict';

  const MARK='nuvexa_full_empty_data_v15_2_done';
  const STORAGE='nuvexa_hub_enterprise_v10';

  if(localStorage.getItem(MARK)==='1')return;

  let prev={};
  try{prev=JSON.parse(localStorage.getItem(STORAGE)||'{}')||{}}catch{}

  const clean={
    version:9.2,
    profileImages:prev.profileImages&&typeof prev.profileImages==='object'?prev.profileImages:{},
    settings:prev.settings&&typeof prev.settings==='object'?prev.settings:{},
    passwords:prev.passwords&&typeof prev.passwords==='object'?prev.passwords:{admin:'2009314'},

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
    meta:{createdAt:new Date().toISOString(),lastDailyBackup:'',fullEmptyVersion:'15.2'}
  };

  try{
    localStorage.setItem(STORAGE,JSON.stringify(clean));

    [
      'nuvexa_hub_store_cart_v10',
      'nuvexa_project_builder_v14_8_draft',
      'nuvexa_project_builder_v14_8_1_draft',
      'nuvexa_clean_start_v14_9_done',
      'nuvexa_hard_clean_v14_9_1_seen',
      'nuvexa_factory_reset_v15_1_local_done'
    ].forEach(k=>localStorage.removeItem(k));

    localStorage.setItem(MARK,'1');
    console.info('[NUVEXA V15.2] All local section data reset to zero.');
  }catch(error){
    console.warn('[NUVEXA V15.2] Local reset failed:',error);
  }
})();
