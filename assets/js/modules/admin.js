/* NUVEXA HUB V11.12 — Admin shell & navigation module */
(function(global){
  'use strict';

  function openModule(ctx,id){
    if(id==='accounts'&&!ctx.canViewAccounts()){
      ctx.toast('قسم المحاسبة غير متاح لهذا المستخدم','error');
      return false;
    }
    ctx.recordRecent(id);
    ctx.setActiveModule(id);
    ctx.setActiveTab('');
    const u=new URL(location.href);
    u.searchParams.set('module',id);
    history.pushState({module:id},'',u);
    ctx.openApp();
    return true;
  }

  function focusLauncher(ctx){
    ctx.setActiveModule('');
    ctx.setActiveTab('');
    const u=new URL(location.href);
    u.searchParams.delete('module');
    history.pushState({module:''},'',u);
    ctx.openApp();
    return true;
  }

  function renderSidebar(ctx,module){
    const activeTab=ctx.getActiveTab();
    ctx.$('#moduleTopName').textContent=module.name;
    ctx.$('#moduleSidebar').innerHTML=`<div class="module-title-box"><span>التطبيق الحالي</span><strong>${ctx.esc(module.name)}</strong></div><div class="side-menu">${module.tabs.map((t,i)=>`<button class="${activeTab===t||(!activeTab&&i===0)?'active':''}" data-module-tab="${ctx.esc(t)}"><span>${i===0?'◈':'◇'}</span>${ctx.esc(t)}</button>`).join('')}</div><div style="height:15px"></div><button class="btn btn-soft" style="width:100%" data-action="focus-launcher">▦ العودة لصفحة التطبيقات</button>`;
  }

  function renderModule(ctx,id){
    let module=ctx.modules.find(x=>x.id===id);
    if(!module){
      ctx.setActiveModule('dashboard');
      module=ctx.modules.find(x=>x.id==='dashboard');
      id='dashboard';
    }
    if(module.restricted&&!ctx.canViewAccounts()){
      ctx.toast('لا تملك صلاحية عرض المحاسبة','error');
      focusLauncher(ctx);
      return false;
    }
    let activeTab=ctx.getActiveTab();
    if(!activeTab||!module.tabs.includes(activeTab)){
      activeTab=module.tabs[0];
      ctx.setActiveTab(activeTab);
    }
    renderSidebar(ctx,module);
    const renderer=ctx.renderers[id];
    if(typeof renderer!=='function'){
      ctx.toast('تعذر تحميل القسم المطلوب','error');
      return false;
    }
    ctx.$('#moduleMain').innerHTML=renderer();
    ctx.bindDynamic();
    return true;
  }

  global.NuvexaAdmin={version:'11.12',openModule,focusLauncher,renderSidebar,renderModule};
})(window);
