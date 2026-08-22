/* ============================================================
   NUVEXA HUB V15.7 — DATA INTEGRITY + ACCOUNTING CLARITY

   Scope:
   1) Record-level Supabase persistence for operational/admin data.
   2) Preserve local/manual orders and invoices alongside cloud commerce.
   3) Persist product batches/operational metadata across devices.
   4) Concurrent-safe + idempotent inventory sync for app flows that
      currently modify stock only inside the browser.
   5) Correct accounting presentation:
      profit != cash != supplier debt != inventory.
   6) No Google OAuth/auth.js changes.
   ============================================================ */
(()=>{'use strict';

  const VERSION='15.7';
  const STATE_KEY='nuvexa_hub_enterprise_v10';
  const OUTBOX_KEY='nuvexa_hub_inventory_outbox_v157';
  const RECORD_PUSH_MS=650;
  const REMOTE_PULL_MS=18000;
  const INVENTORY_RETRY_MS=2500;

  const ARRAY_SECTIONS=[
    'customers','suppliers','purchaseInvoices','expenses','recurringExpenses',
    'returns','stockMovements','approvals','notifications','messages','workIssues',
    'journal','finances','audit','licenses','licenseProducts','sellerSubmissions'
  ];
  const SINGLETON_SECTIONS=['accounts','counters'];
  const SPECIAL_SECTIONS=['manualOrders','manualSalesInvoices','productOps'];
  const ALL_SECTIONS=[...SINGLETON_SECTIONS,...ARRAY_SECTIONS,...SPECIAL_SECTIONS];

  let adminReady=false;
  let applyingRemote=false;
  let recordsReady=false;
  let inventoryReady=false;
  let recordFlushTimer=null;
  let recordFlushBusy=false;
  let remotePullBusy=false;
  let inventoryBusy=false;
  let patchTimer=null;
  let applyingVisualPatch=false;

  const remoteRows=new Map();
  const localSnapshot=new Map();
  const pendingRecords=new Map();
  const inventoryBaseline=new Map();

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const num=v=>Number(v||0)||0;
  const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
  const state=()=>window.NuvexaRuntime?.getState?.()||null;
  const client=()=>window.NuvexaAuth?.getClient?.()||null;
  const canAdmin=()=>!!window.NuvexaAuth?.canAdmin?.();

  function uuid(){
    return globalThis.crypto?.randomUUID?.()||
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{
        const r=Math.random()*16|0,v=c==='x'?r:(r&3|8);
        return v.toString(16);
      });
  }

  function stableHash(value){
    const text=typeof value==='string'?value:JSON.stringify(value);
    let h=2166136261;
    for(let i=0;i<text.length;i++){
      h^=text.charCodeAt(i);
      h=Math.imul(h,16777619);
    }
    return (h>>>0).toString(36);
  }

  function isUuid(v){
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v||''));
  }

  function isCloudOrder(o){
    return !!(o?.source==='cloud'||o?.cloudId||o?.cloudOrderNumber);
  }

  function isCloudInvoice(i){
    return !!(i?.source==='cloud'||i?.cloudId||i?.cloudInvoiceNumber);
  }

  function recordKey(section,item,index=0){
    if(SINGLETON_SECTIONS.includes(section))return '__singleton__';
    if(section==='productOps')return String(item?.id||item?.cloudId||`product-${index}`);
    const candidates=[
      item?.id,item?.number,item?.invoiceNumber,item?.orderNumber,
      item?.email,item?.phone,item?.key,item?.licenseKey
    ];
    const found=candidates.find(v=>String(v||'').trim());
    return found?String(found):`generated-${stableHash(item)}-${index}`;
  }

  function productOpsRecord(p){
    return {
      id:p.cloudId||p.id,
      batches:Array.isArray(p.batches)?clone(p.batches):[],
      unit:p.unit||'وحدة',
      deviceLimit:num(p.deviceLimit)||1,
      serviceUrl:p.serviceUrl||'',
      developerName:p.developerName||'',
      versionLabel:p.versionLabel||'',
      compatibility:p.compatibility||'',
      specifications:p.specifications||'',
      allowSiteOrder:p.allowSiteOrder!==false,
      allowWhatsApp:p.allowWhatsApp!==false,
      mediaRatio:p.mediaRatio||''
    };
  }

  function localRecordsMap(){
    const s=state();
    const map=new Map();
    if(!s)return map;

    const push=(section,key,data)=>{
      const token=`${section}::${key}`;
      map.set(token,{
        section_key:section,
        record_key:key,
        record_data:clone(data),
        deleted:false,
        signature:JSON.stringify(data)
      });
    };

    for(const section of SINGLETON_SECTIONS){
      push(section,'__singleton__',s[section]||{});
    }

    for(const section of ARRAY_SECTIONS){
      const list=Array.isArray(s[section])?s[section]:[];
      list.forEach((item,index)=>push(section,recordKey(section,item,index),item));
    }

    (Array.isArray(s.orders)?s.orders:[])
      .filter(o=>!isCloudOrder(o))
      .forEach((item,index)=>push('manualOrders',recordKey('manualOrders',item,index),item));

    (Array.isArray(s.salesInvoices)?s.salesInvoices:[])
      .filter(i=>!isCloudInvoice(i))
      .forEach((item,index)=>push('manualSalesInvoices',recordKey('manualSalesInvoices',item,index),item));

    (Array.isArray(s.products)?s.products:[])
      .filter(p=>isUuid(p?.cloudId||p?.id))
      .forEach((p,index)=>{
        const data=productOpsRecord(p);
        push('productOps',recordKey('productOps',data,index),data);
      });

    return map;
  }

  function rowToken(row){
    return `${row.section_key}::${row.record_key}`;
  }

  async function rpc(name,args={}){
    const sb=client();
    if(!sb)throw new Error('تعذر الاتصال بـ Supabase');
    const {data,error}=await sb.rpc(name,args);
    if(error)throw error;
    return Array.isArray(data)&&data.length===1?data[0]:data;
  }

  function ensureSyncPill(){
    let pill=$('#nx157SyncPill');
    if(pill)return pill;
    pill=document.createElement('div');
    pill.id='nx157SyncPill';
    pill.className='nx157-sync-pill';
    pill.textContent='حفظ سحابي...';
    document.body.appendChild(pill);
    return pill;
  }

  let pillTimer=null;
  function showSyncPill(text,error=false,hold=1100){
    const pill=ensureSyncPill();
    clearTimeout(pillTimer);
    pill.textContent=text;
    pill.classList.toggle('error',!!error);
    pill.classList.add('show');
    pillTimer=setTimeout(()=>pill.classList.remove('show'),hold);
  }

  function latestStockReason(productId,after){
    const s=state();
    const list=Array.isArray(s?.stockMovements)?s.stockMovements:[];
    const hit=list.find(m=>
      String(m.productId)===String(productId) &&
      (m.after==null||Math.abs(num(m.after)-num(after))<0.000001)
    );
    return String(hit?.reason||hit?.type||'مزامنة حركة مخزون').slice(0,180);
  }

  function readOutbox(){
    try{
      const x=JSON.parse(localStorage.getItem(OUTBOX_KEY)||'[]');
      return Array.isArray(x)?x:[];
    }catch{return[]}
  }

  function writeOutbox(list){
    try{localStorage.setItem(OUTBOX_KEY,JSON.stringify(list||[]))}catch{}
  }

  function initInventoryBaseline(){
    const s=state();
    if(!s)return;
    inventoryBaseline.clear();
    for(const p of s.products||[]){
      const id=p.cloudId||p.id;
      if(p.type==='digital'||!isUuid(id))continue;
      inventoryBaseline.set(String(id),{stock:num(p.stock),cost:num(p.cost)});
    }
    inventoryReady=true;
  }

  function captureInventoryChanges(){
    if(!adminReady||!inventoryReady||applyingRemote)return;
    const s=state();if(!s)return;
    const outbox=readOutbox();
    let changed=false;

    for(const p of s.products||[]){
      const id=String(p.cloudId||p.id||'');
      if(p.type==='digital'||!isUuid(id))continue;

      const current={stock:num(p.stock),cost:num(p.cost)};
      const before=inventoryBaseline.get(id);

      if(!before){
        inventoryBaseline.set(id,current);
        continue;
      }

      const stockChanged=Math.abs(current.stock-before.stock)>0.000001;
      const costChanged=Math.abs(current.cost-before.cost)>0.000001;
      if(!stockChanged&&!costChanged)continue;

      outbox.push({
        opId:uuid(),
        productId:id,
        localBefore:before.stock,
        localAfter:current.stock,
        targetCost:current.cost,
        reason:latestStockReason(id,current.stock),
        at:Date.now()
      });

      inventoryBaseline.set(id,current);
      changed=true;
    }

    if(changed){
      writeOutbox(outbox);
      showSyncPill('حفظ حركة المخزون سحابيًا...');
      processInventoryOutbox();
    }
  }

  async function processInventoryOutbox(){
    if(!adminReady||inventoryBusy)return;
    const sb=client();if(!sb)return;
    inventoryBusy=true;

    try{
      let list=readOutbox();
      while(list.length){
        const op=list[0];

        try{
          const result=await rpc('apply_product_inventory_change_v157',{
            p_op_id:op.opId,
            p_product_id:op.productId,
            p_local_before:num(op.localBefore),
            p_local_after:num(op.localAfter),
            p_target_cost:num(op.targetCost),
            p_reason:String(op.reason||'مزامنة حركة مخزون')
          });

          list.shift();
          writeOutbox(list);

          const remainingSame=list.filter(x=>String(x.productId)===String(op.productId));
          const s=state();
          const p=s?.products?.find(x=>String(x.cloudId||x.id)===String(op.productId));

          if(p&&!remainingSame.length&&result?.stock_quantity!=null){
            applyingRemote=true;
            p.stock=num(result.stock_quantity);
            if(result.cost_price!=null)p.cost=num(result.cost_price);
            inventoryBaseline.set(String(op.productId),{stock:num(p.stock),cost:num(p.cost)});
            persistCurrentState(false);
            applyingRemote=false;
          }
        }catch(error){
          console.warn('[NUVEXA V15.7] inventory sync:',error);
          showSyncPill('تعذر حفظ المخزون — ستتم إعادة المحاولة',true,2600);
          break;
        }
      }

      if(!readOutbox().length)showSyncPill('المخزون محفوظ سحابيًا ✓');
    }finally{
      inventoryBusy=false;
    }
  }

  function sectionArray(section){
    const s=state();
    if(!s)return[];
    if(section==='manualOrders')return (s.orders||[]).filter(x=>!isCloudOrder(x));
    if(section==='manualSalesInvoices')return (s.salesInvoices||[]).filter(x=>!isCloudInvoice(x));
    return Array.isArray(s[section])?s[section]:[];
  }

  function replaceRecordInArray(section,key,data,deleted){
    const s=state();if(!s)return;
    let target;

    if(section==='manualOrders'){
      const cloud=(s.orders||[]).filter(isCloudOrder);
      const manual=(s.orders||[]).filter(x=>!isCloudOrder(x));
      const index=manual.findIndex((x,i)=>recordKey(section,x,i)===key);
      if(deleted){if(index>=0)manual.splice(index,1)}
      else if(index>=0)manual[index]=clone(data);
      else manual.unshift(clone(data));
      s.orders=[...cloud,...manual];
      return;
    }

    if(section==='manualSalesInvoices'){
      const cloud=(s.salesInvoices||[]).filter(isCloudInvoice);
      const manual=(s.salesInvoices||[]).filter(x=>!isCloudInvoice(x));
      const index=manual.findIndex((x,i)=>recordKey(section,x,i)===key);
      if(deleted){if(index>=0)manual.splice(index,1)}
      else if(index>=0)manual[index]=clone(data);
      else manual.unshift(clone(data));
      s.salesInvoices=[...cloud,...manual];
      s.invoices=s.salesInvoices;
      return;
    }

    target=Array.isArray(s[section])?s[section]:(s[section]=[]);
    const index=target.findIndex((x,i)=>recordKey(section,x,i)===key);

    if(deleted){
      if(index>=0)target.splice(index,1);
      return;
    }

    if(section==='customers'&&index>=0){
      const current=target[index]||{};
      const remote=clone(data)||{};
      const cloudIdentity=current.authUserId||current.source==='cloud';
      target[index]=cloudIdentity
        ? {...remote,...current,followups:remote.followups||current.followups||[]}
        : remote;
      return;
    }

    if(index>=0)target[index]=clone(data);
    else target.unshift(clone(data));
  }

  function applyProductOps(key,data,deleted){
    if(deleted)return;
    const s=state();if(!s)return;
    const p=(s.products||[]).find(x=>String(x.cloudId||x.id)===String(key));
    if(!p||!data)return;

    const safe=[
      'batches','unit','deviceLimit','serviceUrl','developerName','versionLabel',
      'compatibility','specifications','allowSiteOrder','allowWhatsApp','mediaRatio'
    ];
    for(const k of safe){
      if(Object.prototype.hasOwnProperty.call(data,k))p[k]=clone(data[k]);
    }
  }

  function applyRemoteRow(row){
    const s=state();if(!s)return;
    const section=row.section_key,key=row.record_key;
    if(!ALL_SECTIONS.includes(section))return;

    if(SINGLETON_SECTIONS.includes(section)){
      if(row.deleted)return;
      if(section==='counters'){
        const local=s.counters||{},remote=row.record_data||{};
        s.counters={...local};
        for(const [k,v] of Object.entries(remote)){
          s.counters[k]=Math.max(num(local[k]),num(v));
        }
      }else{
        s[section]=clone(row.record_data)||{};
      }
      return;
    }

    if(section==='productOps'){
      applyProductOps(key,row.record_data,row.deleted);
      return;
    }

    replaceRecordInArray(section,key,row.record_data,row.deleted);
  }

  function persistCurrentState(dispatch=true){
    const s=state();if(!s)return;
    const text=JSON.stringify(s);
    try{localStorage.setItem(STATE_KEY,text)}catch{}
    if(!dispatch)return;

    try{
      window.dispatchEvent(new StorageEvent('storage',{
        key:STATE_KEY,newValue:text,storageArea:localStorage,url:location.href
      }));
    }catch{
      const ev=new Event('storage');
      try{Object.defineProperty(ev,'key',{value:STATE_KEY})}catch{}
      window.dispatchEvent(ev);
    }
  }

  function rebuildLocalSnapshot(){
    localSnapshot.clear();
    for(const [token,row] of localRecordsMap()){
      localSnapshot.set(token,{
        signature:row.signature,
        section_key:row.section_key,
        record_key:row.record_key
      });
    }
  }

  async function initializeOperationalRecords(){
    if(!adminReady||recordsReady)return;
    try{
      const fetched=await rpc('get_operational_records_v157');
      const rows=Array.isArray(fetched)?fetched:[];
      remoteRows.clear();
      rows.forEach(row=>remoteRows.set(rowToken(row),row));

      const localBefore=localRecordsMap();
      applyingRemote=true;

      for(const row of rows){
        const token=rowToken(row);
        if(pendingRecords.has(token))continue;
        applyRemoteRow(row);
      }

      applyingRemote=false;

      // Seed only records that did not exist in cloud at all.
      const seeds=[];
      for(const [token,row] of localBefore){
        if(!remoteRows.has(token)){
          seeds.push({
            section_key:row.section_key,
            record_key:row.record_key,
            record_data:row.record_data,
            deleted:false
          });
        }
      }

      persistCurrentState(true);
      rebuildLocalSnapshot();
      recordsReady=true;

      if(seeds.length){
        showSyncPill(`تثبيت ${seeds.length} سجل على السحابة...`);
        const updated=await rpc('save_operational_records_v157',{p_records:seeds});
        if(Array.isArray(updated)){
          remoteRows.clear();
          updated.forEach(row=>remoteRows.set(rowToken(row),row));
        }
      }

      rebuildLocalSnapshot();
      showSyncPill('بيانات التشغيل محفوظة سحابيًا ✓');
    }catch(error){
      applyingRemote=false;
      console.warn('[NUVEXA V15.7] operational init:',error);
      showSyncPill('تعذر بدء الحفظ السحابي للبيانات',true,3000);
    }
  }

  function ensureRemoteManualRows(){
    if(!recordsReady||applyingRemote)return;
    const active=[...remoteRows.values()].filter(r=>
      !r.deleted &&
      ['manualOrders','manualSalesInvoices'].includes(r.section_key) &&
      !pendingRecords.has(rowToken(r))
    );
    if(!active.length)return;

    applyingRemote=true;
    let changed=false;
    for(const row of active){
      const current=localRecordsMap();
      if(!current.has(rowToken(row))){
        applyRemoteRow(row);
        changed=true;
      }
    }
    if(changed)persistCurrentState(true);
    applyingRemote=false;
  }

  function scanOperationalChanges(){
    if(!adminReady||!recordsReady||applyingRemote)return;

    ensureRemoteManualRows();

    const current=localRecordsMap();

    for(const [token,row] of current){
      const old=localSnapshot.get(token);
      if(!old||old.signature!==row.signature){
        pendingRecords.set(token,{
          section_key:row.section_key,
          record_key:row.record_key,
          record_data:row.record_data,
          deleted:false
        });
      }
    }

    for(const [token,old] of localSnapshot){
      if(current.has(token))continue;

      // Cloud sync is allowed to replace cloud commerce, but must never make
      // manual orders/invoices disappear. Those are restored above.
      if(['manualOrders','manualSalesInvoices'].includes(old.section_key) &&
         remoteRows.get(token)?.deleted!==true){
        continue;
      }

      pendingRecords.set(token,{
        section_key:old.section_key,
        record_key:old.record_key,
        record_data:null,
        deleted:true
      });
    }

    rebuildLocalSnapshot();
    if(pendingRecords.size)scheduleRecordFlush();
  }

  function scheduleRecordFlush(){
    clearTimeout(recordFlushTimer);
    recordFlushTimer=setTimeout(flushOperationalRecords,RECORD_PUSH_MS);
  }

  async function flushOperationalRecords(){
    if(!adminReady||recordFlushBusy||!pendingRecords.size)return;
    recordFlushBusy=true;

    const batch=[...pendingRecords.values()].slice(0,120);
    const tokens=batch.map(row=>`${row.section_key}::${row.record_key}`);

    try{
      showSyncPill('حفظ البيانات سحابيًا...');
      const updated=await rpc('save_operational_records_v157',{p_records:batch});
      tokens.forEach(token=>pendingRecords.delete(token));

      if(Array.isArray(updated)){
        remoteRows.clear();
        updated.forEach(row=>remoteRows.set(rowToken(row),row));
      }

      showSyncPill('تم الحفظ السحابي ✓');
    }catch(error){
      console.warn('[NUVEXA V15.7] operational save:',error);
      showSyncPill('تعذر الحفظ — ستتم إعادة المحاولة',true,2600);
    }finally{
      recordFlushBusy=false;
      if(pendingRecords.size)setTimeout(flushOperationalRecords,1800);
    }
  }

  async function pullRemoteRecords(){
    if(!adminReady||!recordsReady||remotePullBusy||document.hidden)return;
    remotePullBusy=true;

    try{
      scanOperationalChanges();
      if(pendingRecords.size)await flushOperationalRecords();

      const fetched=await rpc('get_operational_records_v157');
      const rows=Array.isArray(fetched)?fetched:[];
      const incoming=new Map(rows.map(row=>[rowToken(row),row]));
      let changed=false;

      applyingRemote=true;
      for(const [token,row] of incoming){
        if(pendingRecords.has(token))continue;
        const previous=remoteRows.get(token);
        if(!previous||num(row.revision)>num(previous.revision)||
           String(row.updated_at||'')!==String(previous.updated_at||'')){
          applyRemoteRow(row);
          changed=true;
        }
      }
      applyingRemote=false;

      remoteRows.clear();
      incoming.forEach((row,token)=>remoteRows.set(token,row));

      if(changed){
        persistCurrentState(true);
        rebuildLocalSnapshot();
        patchAccountingSoon();
      }
    }catch(error){
      applyingRemote=false;
      console.warn('[NUVEXA V15.7] remote pull:',error);
    }finally{
      remotePullBusy=false;
    }
  }

  // -------------------------------------------------------------------
  // Correct accounting model
  // -------------------------------------------------------------------
  function activeSales(s){
    return (s.salesInvoices||[]).filter(i=>
      i.approved!==false &&
      !['ملغية','مرفوضة','بانتظار الاعتماد'].includes(i.status) &&
      !['refunded','cancelled'].includes(i.cloudStatus)
    );
  }

  function activePurchases(s){
    return (s.purchaseInvoices||[]).filter(i=>
      i.approved!==false &&
      !['ملغية','مرفوضة','بانتظار الاعتماد'].includes(i.status)
    );
  }

  function paymentEntries(inv){
    const payments=Array.isArray(inv?.payments)?inv.payments.filter(p=>num(p.amount)>0):[];
    if(payments.length)return payments;
    const paid=num(inv?.paid??inv?.amountPaid);
    if(paid<=0)return[];
    return [{
      amount:paid,
      method:inv?.paymentMethod||inv?.method||'نقدي'
    }];
  }

  function applyMoneyAccount(acc,method,amount,sign=1){
    const m=String(method||'').toLowerCase();
    const a=sign*num(amount);
    if(['نقدي','cash','كاش'].includes(m))acc.cash+=a;
    else if(['تحويل بنكي','بطاقة','bank','card','تحويل'].includes(m))acc.bank+=a;
    else if(m==='آجل'||m==='credit'){}
    else acc.cash+=a;
  }

  function accounting(s=state()){
    if(!s)return null;
    const sales=activeSales(s),purchases=activePurchases(s);

    const revenue=sales.reduce((sum,i)=>{
      const recognized=num(i.recognizedRevenue);
      return sum+(recognized>0?recognized:num(i.total??i.grandTotal));
    },0);

    const collected=sales.reduce((sum,i)=>
      sum+paymentEntries(i).reduce((a,p)=>a+num(p.amount),0),0);

    const receivables=sales.reduce((sum,i)=>
      sum+Math.max(0,num(i.total??i.grandTotal)-num(i.paid??i.amountPaid)),0);

    const cogs=sales.reduce((sum,i)=>{
      const recognized=num(i.recognizedCogs);
      if(recognized>0)return sum+recognized;
      return sum+(i.items||[]).reduce((a,x)=>
        a+num(x.unitCost)*num(x.qty??x.quantity),0);
    },0);

    const purchaseTotal=purchases.reduce((sum,i)=>sum+num(i.total),0);
    const purchasePaid=purchases.reduce((sum,i)=>
      sum+paymentEntries(i).reduce((a,p)=>a+num(p.amount),0),0);

    const supplierDebt=purchases.reduce((sum,i)=>
      sum+Math.max(0,num(i.total)-num(i.paid)),0);

    const expenses=(s.expenses||[])
      .filter(e=>e.status!=='ملغية')
      .reduce((sum,e)=>sum+num(e.amount),0);

    const accounts={cash:num(s.accounts?.openingCash),bank:num(s.accounts?.openingBank)};

    sales.forEach(i=>paymentEntries(i).forEach(p=>
      applyMoneyAccount(accounts,p.method,p.amount,1)));

    purchases.forEach(i=>paymentEntries(i).forEach(p=>
      applyMoneyAccount(accounts,p.method,p.amount,-1)));

    (s.expenses||[]).filter(e=>e.status!=='ملغية').forEach(e=>
      applyMoneyAccount(accounts,e.method,e.amount,-1));

    (s.finances||[]).forEach(f=>{
      if(f.status==='ملغية')return;
      if(['تمويل مسترد','مساهمة غير مستردة','إيداع'].includes(f.type))
        applyMoneyAccount(accounts,f.method,f.amount,1);
      if(['سداد تمويل','مسحوبات','سحب'].includes(f.type))
        applyMoneyAccount(accounts,f.method,f.amount,-1);
      if(f.type==='تحويل خزنة إلى بنك'){
        accounts.cash-=num(f.amount);accounts.bank+=num(f.amount);
      }
      if(f.type==='تحويل بنك إلى خزنة'){
        accounts.bank-=num(f.amount);accounts.cash+=num(f.amount);
      }
    });

    const inventoryValue=(s.products||[])
      .filter(p=>p.type!=='digital')
      .reduce((sum,p)=>sum+Math.max(0,num(p.stock))*Math.max(0,num(p.cost)),0);

    const funds=accounts.cash+accounts.bank;
    const grossProfit=revenue-cogs;
    const operatingProfit=grossProfit-expenses;
    const currentAssets=funds+receivables+inventoryValue;
    const netWorkingPosition=currentAssets-supplierDebt;
    const liquidityDeficit=Math.max(0,-funds);
    const debtCoverage=supplierDebt>0
      ? Math.max(0,Math.min(100,(Math.max(0,funds)/supplierDebt)*100))
      : 100;

    return {
      revenue,collected,receivables,cogs,grossProfit,
      purchaseTotal,purchasePaid,supplierDebt,expenses,
      cash:accounts.cash,bank:accounts.bank,funds,
      operatingProfit,inventoryValue,currentAssets,
      netWorkingPosition,liquidityDeficit,debtCoverage
    };
  }

  function money(v){
    const s=state();
    const currency=s?.settings?.currency||'₺';
    const formatted=new Intl.NumberFormat('ar-EG',{
      minimumFractionDigits:0,maximumFractionDigits:2
    }).format(num(v));
    return `${formatted} ${currency}`;
  }

  function setSignedClass(el,value){
    if(!el)return;
    el.classList.toggle('negative',num(value)<0);
    el.classList.toggle('positive',num(value)>=0);
  }

  function statByLabel(root,label){
    return [...root.querySelectorAll('.stat span')]
      .find(x=>x.textContent.trim()===label)?.closest('.stat')||null;
  }

  function setStat(root,label,value,{newLabel='',sub='',warning=false}={}){
    const box=statByLabel(root,label);if(!box)return false;
    const labelEl=box.querySelector('span');
    const strong=box.querySelector('strong.number, strong');
    const small=box.querySelector('small');

    if(newLabel&&labelEl)labelEl.textContent=newLabel;
    if(strong){
      strong.textContent=typeof value==='number'?money(value):String(value);
      if(typeof value==='number')setSignedClass(strong,value);
      if(warning&&num(value)>0)strong.classList.add('negative');
    }
    if(small&&sub)small.textContent=sub;
    return true;
  }

  function lineByLabel(root,label){
    return [...root.querySelectorAll('.total-line span')]
      .find(x=>x.textContent.trim()===label)?.closest('.total-line')||null;
  }

  function setLine(root,label,value,{newLabel='',liability=false}={}){
    const line=lineByLabel(root,label);if(!line)return false;
    const span=line.querySelector('span'),strong=line.querySelector('strong');
    if(newLabel&&span)span.textContent=newLabel;
    if(strong){
      strong.textContent=money(value);
      strong.classList.remove('negative','positive');
      if(liability)strong.classList.add('nx157-liability');
      else setSignedClass(strong,value);
    }
    return true;
  }

  function patchPurchaseTables(root){
    for(const table of root.querySelectorAll('table')){
      const headers=[...table.querySelectorAll('thead th')].map(x=>x.textContent.trim());
      const remainIndex=headers.indexOf('المتبقي');
      if(remainIndex>=0&&headers.includes('المورد')){
        for(const row of table.querySelectorAll('tbody tr')){
          const cells=row.children;
          const cell=cells[remainIndex];
          if(!cell)continue;
          cell.textContent=String(cell.textContent||'').trim().replace(/^[−-]\s*/,'');
          cell.classList.remove('negative');
          cell.classList.add('nx157-liability');
        }
      }

      const dueIndex=headers.indexOf('المستحق له');
      if(dueIndex>=0){
        for(const row of table.querySelectorAll('tbody tr')){
          const cell=row.children[dueIndex];
          if(!cell)continue;
          cell.textContent=String(cell.textContent||'').trim().replace(/^[−-]\s*/,'');
          cell.classList.remove('negative');
          cell.classList.add('nx157-liability');
        }
      }
    }
  }

  function addAccountingNote(root,c){
    if(root.querySelector('.nx157-account-note'))return;
    const heading=[...root.querySelectorAll('h3')]
      .find(x=>x.textContent.includes('فصل واضح بين الربح والسيولة'));
    const panel=heading?.closest('.panel');
    if(!panel)return;
    const note=document.createElement('div');
    note.className='nx157-account-note';
    note.innerHTML=`<strong>طريقة الحساب الصحيحة:</strong>
      شراء بضاعة للمخزون لا يُخصم من الربح لحظة الشراء؛ قيمة البضاعة تصبح أصلًا في المخزون.
      الربح يتأثر عند البيع عبر تكلفة البضاعة المباعة. مستحقات الموردين والسيولة تظهر منفصلة.
      <br><b>قيمة المخزون الحالية:</b> ${money(c.inventoryValue)}
      · <b>ذمم العملاء:</b> ${money(c.receivables)}
      · <b>التزامات الموردين:</b> ${money(c.supplierDebt)}
      ${c.liquidityDeficit>0?`· <b>عجز السيولة المسجل:</b> ${money(c.liquidityDeficit)}`:''}.`;
    panel.insertAdjacentElement('beforebegin',note);
  }

  function patchAccountingUI(){
    if(applyingVisualPatch)return;
    const s=state();if(!s)return;
    const c=accounting(s);if(!c)return;
    applyingVisualPatch=true;

    try{
      const launcher=$('#launcherPage');
      if(launcher){
        const hero=[...launcher.querySelectorAll('.hero-mini span')]
          .find(x=>x.textContent.trim()==='صافي المركز');
        if(hero){
          hero.textContent='الربح التشغيلي';
          const strong=hero.parentElement?.querySelector('strong');
          if(strong){strong.textContent=money(c.operatingProfit);setSignedClass(strong,c.operatingProfit)}
        }
      }

      const main=$('#moduleMain');
      if(main){
        // Replace misleading purchase wording.
        for(const p of main.querySelectorAll('.page-head p')){
          const text=p.textContent.trim();
          if(text.includes('التزام سالب')||text.includes('المعلقة تظهر بالسالب')){
            p.textContent='المبلغ غير المسدد يظهر كمستحق للمورد، ولا يُخصم من الربح عند شراء المخزون.';
          }
        }

        setStat(main,'إجمالي المشتريات',c.purchaseTotal);
        setStat(main,'المبلغ المدفوع',c.purchasePaid);
        setStat(main,'المتبقي للموردين',c.supplierDebt,{
          sub:'التزام مستحق حتى السداد',warning:true
        });

        setStat(main,'الخزنة',c.cash);
        setStat(main,'رصيد الخزنة',c.cash);
        setStat(main,'الحساب البنكي',c.bank);
        setStat(main,'رصيد البنك',c.bank);
        setStat(main,'إجمالي الأموال',c.funds);
        setStat(main,'ديون الموردين',c.supplierDebt,{
          sub:'التزام مستحق — ليس خسارة',warning:true
        });
        setStat(main,'المستحق للموردين',c.supplierDebt,{warning:true});
        setStat(main,'صافي بعد الالتزامات',c.netWorkingPosition,{
          newLabel:'صافي الأصول المتداولة',
          sub:'سيولة + ذمم عملاء + مخزون − مستحقات الموردين'
        });

        setStat(main,'الأرباح والخسائر',c.operatingProfit);
        setStat(main,'مديونيات العملاء',c.receivables);
        setStat(main,'مستحقات الموردين',c.supplierDebt,{warning:true});
        setStat(main,'قيمة المخزون',c.inventoryValue);

        setStat(main,'إيرادات البيع',c.revenue);
        setStat(main,'تكلفة البضاعة المباعة',c.cogs);
        setStat(main,'المصروفات',c.expenses);
        setStat(main,'الربح التشغيلي',c.operatingProfit);

        setLine(main,'إيرادات البيع',c.revenue);
        setLine(main,'تكلفة البضاعة المباعة',c.cogs);
        setLine(main,'المصروفات',c.expenses);
        setLine(main,'الربح التشغيلي',c.operatingProfit);
        setLine(main,'الأموال الفعلية بالخزنة والبنك',c.funds);
        setLine(main,'الفواتير المعلقة للموردين',c.supplierDebt,{
          newLabel:'المستحق للموردين',liability:true
        });
        setLine(main,'صافي المركز بعد الالتزامات',c.netWorkingPosition,{
          newLabel:'صافي الأصول المتداولة'
        });

        setLine(main,'المحصل',c.collected);
        setLine(main,'المتبقي عند العملاء',c.receivables);
        setLine(main,'قيمة المخزون بالتكلفة',c.inventoryValue);

        const debtText=[...main.querySelectorAll('p.muted')]
          .find(x=>x.textContent.includes('إذا لم يكفِ الرصيد يظهر صافي المركز بالسالب'));
        if(debtText){
          debtText.textContent='سداد المورد يقلل السيولة والمستحق معًا. شراء المخزون نفسه لا يحول الربح إلى خسارة؛ أي عجز سيولة يظهر منفصلًا.';
        }

        const coverage=[...main.querySelectorAll('.panel-head h3')]
          .find(x=>x.textContent.trim()==='نسبة تغطية الديون')?.closest('.panel');
        if(coverage){
          const big=coverage.querySelector('[style*="font-size:36px"]');
          const progress=coverage.querySelector('.progress span');
          if(big)big.textContent=`${c.debtCoverage.toFixed(1)}%`;
          if(progress)progress.style.width=`${c.debtCoverage}%`;
        }

        patchPurchaseTables(main);
        addAccountingNote(main,c);
      }
    }finally{
      applyingVisualPatch=false;
    }
  }

  function patchAccountingSoon(){
    clearTimeout(patchTimer);
    patchTimer=setTimeout(patchAccountingUI,40);
  }

  function csvEscape(v){
    const s=String(v??'');
    return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;
  }

  function exportCorrectAccounting(){
    const c=accounting();
    if(!c)return;
    const rows=[
      ['البيان','القيمة'],
      ['إيرادات البيع',c.revenue],
      ['تكلفة البضاعة المباعة',c.cogs],
      ['مجمل الربح',c.grossProfit],
      ['المصروفات',c.expenses],
      ['الربح التشغيلي',c.operatingProfit],
      ['الخزنة',c.cash],
      ['البنك',c.bank],
      ['إجمالي السيولة',c.funds],
      ['مديونيات العملاء',c.receivables],
      ['قيمة المخزون',c.inventoryValue],
      ['مستحقات الموردين',c.supplierDebt],
      ['إجمالي الأصول المتداولة',c.currentAssets],
      ['صافي الأصول المتداولة',c.netWorkingPosition],
      ['عجز السيولة',c.liquidityDeficit]
    ];
    const csv='\ufeff'+rows.map(r=>r.map(csvEscape).join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download='accounting-corrected-v15-7.csv';
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  function bindGlobal(){
    document.addEventListener('click',e=>{
      const exportBtn=e.target.closest?.('[data-action="export-accounting"]');
      if(exportBtn){
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        exportCorrectAccounting();
        return;
      }
      patchAccountingSoon();
    },true);

    const main=$('#moduleMain');
    if(main){
      new MutationObserver(()=>patchAccountingSoon())
        .observe(main,{childList:true,subtree:true});
    }
    const launcher=$('#launcherPage');
    if(launcher){
      new MutationObserver(()=>patchAccountingSoon())
        .observe(launcher,{childList:true,subtree:true});
    }

    window.addEventListener('focus',()=>{
      scanOperationalChanges();
      captureInventoryChanges();
      processInventoryOutbox();
      pullRemoteRecords();
      patchAccountingSoon();
    });

    document.addEventListener('visibilitychange',()=>{
      if(!document.hidden){
        scanOperationalChanges();
        captureInventoryChanges();
        processInventoryOutbox();
        pullRemoteRecords();
        patchAccountingSoon();
      }
    });
  }

  async function waitForAdmin(){
    for(let i=0;i<80;i++){
      if(window.NuvexaRuntime&&client()&&canAdmin())return true;
      await new Promise(r=>setTimeout(r,150));
    }
    return false;
  }

  async function boot(){
    ensureSyncPill();
    bindGlobal();

    for(let i=0;i<80&&!window.NuvexaRuntime;i++){
      await new Promise(r=>setTimeout(r,100));
    }

    try{
      window.NuvexaRuntime?.core?.events?.on?.('state:saved',()=>{
        if(applyingRemote)return;
        ensureRemoteManualRows();
        captureInventoryChanges();
        scanOperationalChanges();
        patchAccountingSoon();
      });
    }catch{}

    if(!(await waitForAdmin())){
      patchAccountingSoon();
      return;
    }

    adminReady=true;

    // Give the existing app a moment to finish its own cloud product/order load.
    await new Promise(r=>setTimeout(r,650));
    initInventoryBaseline();
    await initializeOperationalRecords();

    // Re-apply product operational extras after the existing cloud product
    // loader has replaced product objects/batches.
    pullRemoteRecords();
    processInventoryOutbox();

    setInterval(()=>{
      if(!adminReady||document.hidden)return;
      ensureRemoteManualRows();
      captureInventoryChanges();
      scanOperationalChanges();
      processInventoryOutbox();
      patchAccountingSoon();
    },2000);

    setInterval(()=>pullRemoteRecords(),REMOTE_PULL_MS);
    setInterval(()=>processInventoryOutbox(),INVENTORY_RETRY_MS);

    window.NuvexaDataIntegrity=Object.freeze({
      version:VERSION,
      accounting:()=>accounting(),
      syncNow:async()=>{
        captureInventoryChanges();
        scanOperationalChanges();
        await flushOperationalRecords();
        await processInventoryOutbox();
        await pullRemoteRecords();
      }
    });

    patchAccountingSoon();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',boot,{once:true});
  }else{
    boot();
  }
})();
