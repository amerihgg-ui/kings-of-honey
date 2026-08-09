/* NUVEXA HUB V14.0 — Storefront Visual Polish
   Visual enhancement only. Does not alter checkout, auth, orders, accounting, or Supabase.
*/
(()=>{'use strict';

  const VERSION='14.0';
  const HOME_CLASS='nv-store-v14-home';
  let revealObserver=null;
  let mutationQueued=false;

  const $=(selector,root=document)=>root.querySelector(selector);
  const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];

  function isStoreHome(){
    const page=$('#storePage');
    if(!page||page.classList.contains('hidden'))return false;
    return !!$('#storeProductsSection')&&!$('.about-page');
  }

  function footerMarkup(){
    const year=new Date().getFullYear();
    return `
      <footer class="store-footer nv-store-footer-v14 nv-reveal-v14" aria-label="معلومات NUVEXA HUB">
        <div class="nx-footer-brand">
          <img src="assets/branding/logo-main.png" alt="NUVEXA HUB">
          <p>منصة تجمع التجارة والخدمات الرقمية في تجربة واحدة، مع ربط الطلبات بحساب العميل ومتابعة حالتها من داخل المنصة.</p>
          <div class="nv-footer-brand-tags-v14" aria-label="مجالات المنصة">
            <span>منتجات</span><span>خدمات رقمية</span><span>طلبات ومتابعة</span><span>حلول تقنية</span>
          </div>
        </div>

        <div class="nx-footer-col">
          <h4>روابط سريعة</h4>
          <button type="button" data-action="store-home">الرئيسية</button>
          <button type="button" data-store-filter="physical">المنتجات</button>
          <button type="button" data-store-filter="digital">الخدمات الرقمية</button>
          <button type="button" data-action="store-about">من نحن</button>
        </div>

        <div class="nx-footer-col">
          <h4>حساب العميل</h4>
          <button type="button" data-action="customer-account">طلباتي وحالة الطلب</button>
          <button type="button" data-action="store-cart">سلة المشتريات</button>
          <button type="button" data-action="customer-account">بيانات الحساب</button>
          <button type="button" data-store-scroll="products">تصفح المتجر</button>
        </div>

        <div class="nx-footer-status">
          <strong>NUVEXA HUB</strong>
          <span>تجارة، خدمات رقمية، وإدارة طلبات مترابطة.</span>
          <div class="nv-footer-status-line-v14"><i></i><b>المنصة متاحة للتصفح والطلب</b></div>
        </div>

        <div class="nx-footer-copy">
          <span>© ${year} NUVEXA HUB — جميع الحقوق محفوظة.</span>
          <b>واجهة متجاوبة للكمبيوتر والهاتف</b>
        </div>
      </footer>`;
  }

  function benefitsMarkup(){
    return `
      <section class="nv-store-benefits-v14 nv-reveal-v14" aria-label="مزايا تجربة الشراء">
        <article class="nv-store-benefit-v14">
          <span class="nv-store-benefit-icon-v14">🛡</span>
          <div><strong>طلب محفوظ</strong><small>تفاصيل الطلب تبقى مرتبطة بحساب العميل.</small></div>
        </article>
        <article class="nv-store-benefit-v14">
          <span class="nv-store-benefit-icon-v14">✓</span>
          <div><strong>متابعة الحالة</strong><small>تابع انتقال الطلب حتى مرحلة التسليم.</small></div>
        </article>
        <article class="nv-store-benefit-v14">
          <span class="nv-store-benefit-icon-v14">◈</span>
          <div><strong>خدمات رقمية</strong><small>منتجات وخدمات رقمية داخل منصة واحدة.</small></div>
        </article>
        <article class="nv-store-benefit-v14">
          <span class="nv-store-benefit-icon-v14">◎</span>
          <div><strong>تجربة متجاوبة</strong><small>واجهة مصممة للهاتف والكمبيوتر.</small></div>
        </article>
      </section>`;
  }

  function ensureBackTop(){
    let button=$('#nvStoreBackTopV14');
    if(button)return button;
    button=document.createElement('button');
    button.id='nvStoreBackTopV14';
    button.className='nv-store-backtop-v14';
    button.type='button';
    button.setAttribute('aria-label','العودة إلى أعلى الصفحة');
    button.title='العودة للأعلى';
    button.textContent='↑';
    button.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));
    document.body.appendChild(button);
    return button;
  }

  function updateHeaderAndBackTop(){
    const page=$('#storePage');
    const home=page?.classList.contains(HOME_CLASS)&&!page.classList.contains('hidden');
    const header=$('.store-header',page||document);
    header?.classList.toggle('nv-header-scrolled',home&&window.scrollY>30);
    const back=ensureBackTop();
    back.classList.toggle('is-visible',home&&window.scrollY>520);
  }

  function setupReveal(){
    const items=$$('.store-page.'+HOME_CLASS+' .nv-reveal-v14:not([data-nv-reveal-bound])');
    if(!items.length)return;

    const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if(reduced||!('IntersectionObserver' in window)){
      items.forEach(item=>{
        item.dataset.nvRevealBound='1';
        item.classList.add('nv-visible-v14');
      });
      return;
    }

    if(!revealObserver){
      revealObserver=new IntersectionObserver(entries=>{
        entries.forEach(entry=>{
          if(entry.isIntersecting){
            entry.target.classList.add('nv-visible-v14');
            revealObserver.unobserve(entry.target);
          }
        });
      },{threshold:.08,rootMargin:'0px 0px -35px'});
    }

    items.forEach((item,index)=>{
      item.dataset.nvRevealBound='1';
      item.style.setProperty('--nv-delay',`${Math.min(index%5,4)*45}ms`);
      revealObserver.observe(item);
    });
  }

  function markRevealItems(content){
    if(!content)return;
    const selectors=[
      '.store-offer-banner',
      '.store-category-cards',
      '.store-section-head',
      '.store-product',
      '.store-side-card'
    ];
    selectors.forEach(selector=>{
      $$(selector,content).forEach(el=>el.classList.add('nv-reveal-v14'));
    });
  }

  function normalizeCategories(content){
    const wrap=$('.store-category-cards',content);
    if(!wrap)return;

    const digital=$('[data-store-filter="digital"]',wrap);
    if(digital)digital.classList.add('nv-digital-category-v14');

    requestAnimationFrame(()=>{
      const visible=$$('.store-category-card',wrap).filter(el=>getComputedStyle(el).display!=='none');
      wrap.classList.toggle('nv-single-category',visible.length===1);
    });
  }

  function buildFooterAndTrust(content){
    if(!content)return;
    const products=$('#storeProductsSection',content);
    if(!products)return;

    let footer=$('.store-footer',content);
    if(!footer||!footer.classList.contains('nv-store-footer-v14')){
      if(footer)footer.outerHTML=footerMarkup();
      else content.insertAdjacentHTML('beforeend',footerMarkup());
      footer=$('.nv-store-footer-v14',content);
    }

    if(!$('.nv-store-benefits-v14',content)&&footer){
      footer.insertAdjacentHTML('beforebegin',benefitsMarkup());
    }
  }

  function enhanceStore(){
    const page=$('#storePage');
    const content=$('#storeContent');
    if(!page||!content)return;

    const home=isStoreHome();
    page.classList.toggle(HOME_CLASS,home);

    if(!home){
      ensureBackTop().classList.remove('is-visible');
      $('.store-header',page)?.classList.remove('nv-header-scrolled');
      return;
    }

    normalizeCategories(content);
    buildFooterAndTrust(content);
    markRevealItems(content);
    setupReveal();
    updateHeaderAndBackTop();
  }

  function scheduleEnhance(){
    if(mutationQueued)return;
    mutationQueued=true;
    requestAnimationFrame(()=>{
      mutationQueued=false;
      enhanceStore();
    });
  }

  function boot(){
    ensureBackTop();
    enhanceStore();

    const content=$('#storeContent');
    if(content){
      const observer=new MutationObserver(scheduleEnhance);
      observer.observe(content,{childList:true,subtree:true});
    }

    window.addEventListener('scroll',updateHeaderAndBackTop,{passive:true});
    window.addEventListener('resize',scheduleEnhance,{passive:true});

    // Some actions swap the storefront/home without a full DOM reload.
    document.addEventListener('click',event=>{
      if(event.target.closest('[data-action="store-home"],[data-action="store-about"],[data-store-filter]')){
        setTimeout(scheduleEnhance,0);
      }
    },true);

    window.NuvexaStoreVisual=Object.freeze({version:VERSION,refresh:enhanceStore});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
