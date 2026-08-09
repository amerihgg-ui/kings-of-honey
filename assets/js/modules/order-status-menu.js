/* NUVEXA HUB V13.4 — One-click Order Status Menu
   Adds a direct status picker to the existing Orders & Deliveries UI.
   Uses the V13.3 set_order_status RPC, so "completed" keeps the accounting/inventory lifecycle.
*/
(()=>{'use strict';

  const VERSION='13.4';
  const MENU_ID='nuvexaOrderStatusMenuV134';
  let busy=false;

  const STATUS_META={
    new:{label:'جديد',icon:'●'},
    confirmed:{label:'جاهز للتوصيل',icon:'📦'},
    processing:{label:'في الطريق',icon:'🚚'},
    completed:{label:'تم التسليم',icon:'✓'},
    cancelled:{label:'ملغية',icon:'×'},
    refunded:{label:'مرتجع',icon:'↩'}
  };

  const LABEL_TO_CODE={
    'بانتظار الاعتماد':'new',
    'جديد':'new',
    'قيد التجهيز':'confirmed',
    'جاهز للتوصيل':'confirmed',
    'في الطريق':'processing',
    'تم التسليم':'completed',
    'مكتمل':'completed',
    'ملغية':'cancelled',
    'مرفوضة':'cancelled',
    'مرتجع':'refunded'
  };

  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  }[c]));

  function client(){
    return window.NuvexaAuth?.getClient?.()||null;
  }

  function toast(message,type='ok'){
    const zone=document.querySelector('#toastZone');
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
    },3600);
  }

  function injectStyles(){
    if(document.getElementById('nuvexaOrderStatusStylesV134'))return;
    const style=document.createElement('style');
    style.id='nuvexaOrderStatusStylesV134';
    style.textContent=`
      .nx-order-status.nv-status-clickable{
        appearance:none;
        border:0;
        cursor:pointer;
        font:inherit;
        display:inline-flex;
        align-items:center;
        gap:6px;
        transition:transform .15s ease,filter .15s ease;
      }
      .nx-order-status.nv-status-clickable:hover{transform:translateY(-1px);filter:brightness(1.04)}
      .nx-order-status.nv-status-clickable::after{content:"⌄";font-size:.82em;opacity:.72}
      .nv-order-status-menu{
        position:fixed;
        z-index:100000;
        width:min(245px,calc(100vw - 24px));
        border:1px solid var(--line,rgba(0,0,0,.12));
        border-radius:15px;
        padding:7px;
        background:var(--panel,#fff);
        box-shadow:0 18px 55px rgba(0,0,0,.22);
        direction:rtl;
      }
      .nv-order-status-menu-head{
        padding:8px 10px 9px;
        border-bottom:1px solid var(--line,rgba(0,0,0,.1));
        margin-bottom:5px;
      }
      .nv-order-status-menu-head strong{display:block;font-size:.92rem}
      .nv-order-status-menu-head small{display:block;color:var(--muted,#786d61);margin-top:3px;font-size:.76rem}
      .nv-order-status-option{
        appearance:none;
        width:100%;
        border:0;
        background:transparent;
        color:var(--text,#2d1a0d);
        border-radius:10px;
        padding:10px 11px;
        display:flex;
        align-items:center;
        gap:9px;
        text-align:right;
        cursor:pointer;
        font:inherit;
        font-weight:800;
      }
      .nv-order-status-option:hover{background:var(--panel2,#fff7eb)}
      .nv-order-status-option.current{background:rgba(229,161,44,.12);color:#b87508}
      .nv-order-status-option.danger{color:#d84f5d}
      .nv-order-status-option.success{color:#24875d}
      .nv-order-status-option:disabled{opacity:.55;cursor:wait}
      .nv-order-status-option i{font-style:normal;width:21px;text-align:center}
      .nv-order-status-tip{
        padding:7px 10px 4px;
        color:var(--muted,#786d61);
        font-size:.73rem;
        line-height:1.5
      }
    `;
    document.head.appendChild(style);
  }

  function orderIdForBadge(badge){
    const container=badge.closest('tr,article');
    const detail=container?.querySelector?.('[data-nx-order-detail]');
    return detail?.dataset?.nxOrderDetail||'';
  }

  function makeStatusesClickable(root=document){
    root.querySelectorAll?.('.nx-order-status:not(.nv-status-clickable)').forEach(badge=>{
      const orderId=orderIdForBadge(badge);
      if(!orderId)return; // Ignore invoice/payment status badges.
      const current=String(badge.textContent||'').trim();
      const button=document.createElement('button');
      button.type='button';
      button.className=`${badge.className} nv-status-clickable`;
      button.dataset.nvOrderStatus=orderId;
      button.dataset.nvCurrentStatus=current;
      button.title='اضغط لتغيير حالة الطلب';
      button.setAttribute('aria-label',`حالة الطلب: ${current}. اضغط للتغيير`);
      button.innerHTML=esc(current);
      badge.replaceWith(button);
    });

    // Direct status selection replaces the old sequential "تحديث الحالة" shortcut.
    root.querySelectorAll?.('[data-next-order]').forEach(button=>button.remove());
  }

  function allowedStatuses(currentCode){
    if(currentCode==='completed')return ['completed','refunded'];
    if(currentCode==='refunded')return ['refunded','new'];
    if(currentCode==='cancelled')return ['cancelled','new'];
    return ['new','confirmed','processing','completed','cancelled'];
  }

  function closeMenu(){
    document.getElementById(MENU_ID)?.remove();
  }

  function positionMenu(menu,anchor){
    const rect=anchor.getBoundingClientRect();
    const gap=7;
    const width=Math.min(245,window.innerWidth-24);
    menu.style.width=`${width}px`;

    // First place it to measure real height.
    menu.style.visibility='hidden';
    menu.style.left='12px';
    menu.style.top='12px';
    document.body.appendChild(menu);
    const height=menu.offsetHeight;

    let left=Math.min(window.innerWidth-width-12,Math.max(12,rect.right-width));
    let top=rect.bottom+gap;
    if(top+height>window.innerHeight-12)top=Math.max(12,rect.top-height-gap);

    menu.style.left=`${left}px`;
    menu.style.top=`${top}px`;
    menu.style.visibility='visible';
  }

  function openMenu(anchor){
    closeMenu();

    const orderId=anchor.dataset.nvOrderStatus;
    const currentLabel=String(anchor.dataset.nvCurrentStatus||anchor.textContent||'جديد').trim();
    const currentCode=LABEL_TO_CODE[currentLabel]||'new';
    const choices=allowedStatuses(currentCode);

    const menu=document.createElement('div');
    menu.id=MENU_ID;
    menu.className='nv-order-status-menu';
    menu.setAttribute('role','menu');
    menu.innerHTML=`
      <div class="nv-order-status-menu-head">
        <strong>حالة الطلب</strong>
        <small>اختر الحالة مباشرة</small>
      </div>
      ${choices.map(code=>{
        const meta=STATUS_META[code];
        const cls=[
          'nv-order-status-option',
          code===currentCode?'current':'',
          code==='completed'?'success':'',
          ['cancelled','refunded'].includes(code)?'danger':''
        ].filter(Boolean).join(' ');
        return `<button type="button" class="${cls}" data-nv-status-select="${code}" data-order-id="${esc(orderId)}" data-current-code="${esc(currentCode)}">
          <i>${meta.icon}</i><span>${meta.label}</span>
        </button>`;
      }).join('')}
      <div class="nv-order-status-tip">${
        currentCode==='completed'
          ?'بعد التسليم، استخدم «مرتجع» إذا رجع الطلب حتى يتم عكس المخزون والحسابات بصورة صحيحة.'
          :'اختيار «تم التسليم» يثبت الفاتورة ويخصم المخزون ويحدّث الأرباح.'
      }</div>
    `;
    positionMenu(menu,anchor);
  }

  function confirmStatus(code,currentCode){
    if(code===currentCode)return true;
    if(code==='completed'){
      return window.confirm('تأكيد «تم التسليم»؟\nسيتم خصم المخزون وإنشاء/اعتماد فاتورة البيع وتسجيل الإيراد والتكلفة والربح.');
    }
    if(code==='refunded'){
      return window.confirm('تأكيد تحويل الطلب إلى «مرتجع»؟\nسيتم إعادة المخزون وعكس الإيراد والتكلفة والربح المرتبطين بالطلب.');
    }
    if(code==='cancelled'){
      return window.confirm('تأكيد إلغاء الطلب؟');
    }
    if(code==='new'&&['cancelled','refunded'].includes(currentCode)){
      return window.confirm('إعادة فتح الطلب كطلب جديد؟');
    }
    return true;
  }

  async function changeStatus(button){
    if(busy)return;
    const code=button.dataset.nvStatusSelect;
    const orderId=button.dataset.orderId;
    const currentCode=button.dataset.currentCode||'new';
    if(!code||!orderId)return;

    if(code===currentCode){
      closeMenu();
      return;
    }
    if(!confirmStatus(code,currentCode))return;

    const sb=client();
    if(!sb){
      toast('تعذر الاتصال بـ Supabase.','error');
      return;
    }

    busy=true;
    document.querySelectorAll('.nv-order-status-option').forEach(x=>x.disabled=true);

    try{
      const {error}=await sb.rpc('set_order_status',{
        p_order_id:orderId,
        p_status:code
      });
      if(error)throw error;

      try{
        await window.NuvexaOrderFlow?.syncCommerce?.();
      }catch(syncError){
        console.warn(`[NUVEXA ${VERSION}] status saved; refresh failed`,syncError);
      }

      // app.js listens to storage events and re-renders the active module.
      try{
        window.dispatchEvent(new StorageEvent('storage',{
          key:'nuvexa_hub_enterprise_v10',
          newValue:localStorage.getItem('nuvexa_hub_enterprise_v10')
        }));
      }catch{
        location.reload();
        return;
      }

      closeMenu();
      toast(`تم تغيير حالة الطلب إلى «${STATUS_META[code].label}».`);
      setTimeout(()=>makeStatusesClickable(document),40);
    }catch(error){
      console.error(`[NUVEXA ${VERSION}] status change`,error);
      toast(error?.message||'تعذر تغيير حالة الطلب.','error');
      document.querySelectorAll('.nv-order-status-option').forEach(x=>x.disabled=false);
    }finally{
      busy=false;
    }
  }

  function boot(){
    injectStyles();
    makeStatusesClickable(document);

    const observer=new MutationObserver(mutations=>{
      for(const mutation of mutations){
        for(const node of mutation.addedNodes){
          if(node.nodeType===1){
            if(node.matches?.('.nx-order-status'))makeStatusesClickable(node.parentElement||document);
            else makeStatusesClickable(node);
          }
        }
      }
    });
    observer.observe(document.body,{childList:true,subtree:true});

    document.addEventListener('click',event=>{
      const status=event.target.closest('[data-nv-order-status]');
      if(status){
        event.preventDefault();
        event.stopImmediatePropagation();
        openMenu(status);
        return;
      }

      const option=event.target.closest('[data-nv-status-select]');
      if(option){
        event.preventDefault();
        event.stopImmediatePropagation();
        changeStatus(option);
        return;
      }

      if(!event.target.closest(`#${MENU_ID}`))closeMenu();
    },true);

    window.addEventListener('resize',closeMenu);
    window.addEventListener('scroll',closeMenu,true);

    window.NuvexaOrderStatusMenu=Object.freeze({version:VERSION,refresh:()=>makeStatusesClickable(document)});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
