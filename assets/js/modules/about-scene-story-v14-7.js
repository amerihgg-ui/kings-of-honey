/* NUVEXA HUB V14.7 — Fixed viewport About scrollytelling
   Wheel / touch / keyboard advances scenes. No page scrolling.
*/
(()=>{'use strict';

  const VERSION='14.7';
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];

  let current=0;
  let locked=false;
  let wheelSum=0;
  let touchStartY=null;
  let touchStartX=null;
  let aboutOpen=false;
  let lockTimer=null;

  const sceneData=[
    {label:'Logo'},
    {label:'About'},
    {label:'Problem'},
    {label:'Discovery'},
    {label:'Journey'},
    {label:'Operations'},
    {label:'Platform'},
    {label:'Services'},
    {label:'How'},
    {label:'Philosophy'},
    {label:'Next'}
  ];

  function markup(){
    return `
      <article class="about-page nx47-about" aria-label="من نحن — NUVEXA HUB">
        <div class="nx47-grid" aria-hidden="true"></div>
        <div class="nx47-wipe" aria-hidden="true"></div>

        <button type="button" class="nx47-exit" data-nx47-exit aria-label="العودة إلى المتجر" title="العودة إلى المتجر">⌂</button>

        <nav class="nx47-progress" aria-label="مشاهد من نحن">
          <span class="nx47-progress-label">STORY</span>
          ${sceneData.map((s,i)=>`<button type="button" data-nx47-scene="${i}" aria-label="${s.label}"></button>`).join('')}
        </nav>

        <div class="nx47-counter"><strong data-nx47-current>01</strong> / ${String(sceneData.length).padStart(2,'0')}</div>

        <div class="nx47-stage">
          <!-- 00: Logo only -->
          <section class="nx47-scene nx47-logo-scene is-active" data-scene="0">
            <div class="nx47-logo-only">
              <img src="assets/branding/logo-main.png" alt="NUVEXA HUB">
            </div>
            <div class="nx47-scroll-hint"><span>Scroll to enter</span><i></i></div>
          </section>

          <!-- 01: What platform is -->
          <section class="nx47-scene" data-scene="1">
            <div class="nx47-scene-inner nx47-intro-grid">
              <div>
                <span class="nx47-eyebrow">ABOUT NUVEXA HUB</span>
                <h1 class="nx47-title">منصة تقنية<br><span>تبيع منتجات رقمية.</span></h1>
                <p class="nx47-copy">NUVEXA HUB مش متجر تقليدي. هي منصة تجمع اكتشاف المنتجات والخدمات الرقمية، شراءها، متابعة الطلبات والوصول إليها في تجربة واحدة منظمة وواضحة.</p>
                <div class="nx47-intro-meta">
                  <div><strong>Marketplace</strong><small>Digital products</small></div>
                  <div><strong>Customer Space</strong><small>Orders & access</small></div>
                  <div><strong>Seller Tools</strong><small>Creator workflow</small></div>
                  <div><strong>Services</strong><small>Sites & systems</small></div>
                </div>
              </div>

              <div class="nx47-market">
                <div class="nx47-windowbar"><i></i><i></i><i></i></div>
                <div class="nx47-market-body">
                  <div class="nx47-market-head">
                    <div class="nx47-lines"><span></span><span></span></div>
                    <div class="nx47-search"></div>
                  </div>
                  <div class="nx47-products">
                    <article class="nx47-product"><div class="nx47-thumb"></div><small>WEBSITE</small><strong>DIGITAL PRODUCT</strong></article>
                    <article class="nx47-product"><div class="nx47-thumb"></div><small>TEMPLATE</small><strong>CREATIVE ASSET</strong></article>
                    <article class="nx47-product"><div class="nx47-thumb"></div><small>UI / UX</small><strong>DIGITAL RESOURCE</strong></article>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- 02: problem -->
          <section class="nx47-scene" data-scene="2">
            <div class="nx47-scene-inner nx47-story-grid">
              <div class="nx47-story-copy">
                <div class="nx47-chapter">01</div>
                <span class="nx47-eyebrow">THE PROBLEM</span>
                <h2>قبل المنصة، التجربة كانت متفرقة.</h2>
                <p>روابط، ملفات، رسائل، منتجات وخدمات في أماكن مختلفة. والعميل بعد الشراء محتاج يعرف: طلبي فين؟ المنتج فين؟ وإزاي أرجعله تاني؟</p>
              </div>
              <div class="nx47-story-visual">
                <div class="nx47-visual-inner">
                  <div class="nx47-visual-title"><strong>Scattered Resources</strong><span>BEFORE NUVEXA</span></div>
                  <div class="nx47-files">
                    <div class="nx47-file"><i></i><span></span><span></span></div>
                    <div class="nx47-file"><i></i><span></span><span></span></div>
                    <div class="nx47-file"><i></i><span></span><span></span></div>
                    <div class="nx47-file"><i></i><span></span><span></span></div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- 03: discovery -->
          <section class="nx47-scene" data-scene="3">
            <div class="nx47-scene-inner nx47-story-grid">
              <div class="nx47-story-copy">
                <div class="nx47-chapter">02</div>
                <span class="nx47-eyebrow">DISCOVERY</span>
                <h2>جمعنا الاكتشاف في مساحة واحدة.</h2>
                <p>منتجات، قوالب، مواقع، أدوات وخدمات رقمية تظهر في تجربة منظمة، بحيث يفهم العميل نوع المنتج وقيمته قبل ما يبدأ الشراء.</p>
              </div>
              <div class="nx47-story-visual">
                <div class="nx47-visual-inner">
                  <div class="nx47-visual-title"><strong>Product Discovery</strong><span>NUVEXA MARKETPLACE</span></div>
                  <div class="nx47-discover">
                    <div class="nx47-cats"><span class="active">Websites</span><span>Templates</span><span>Digital Tools</span></div>
                    <div class="nx47-cards"><i></i><i></i><i></i></div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- 04: purchase flow -->
          <section class="nx47-scene" data-scene="4">
            <div class="nx47-scene-inner nx47-story-grid">
              <div class="nx47-story-copy">
                <div class="nx47-chapter">03</div>
                <span class="nx47-eyebrow">PURCHASE & ACCESS</span>
                <h2>الشراء بقى بداية رحلة، مش نهايتها.</h2>
                <p>الطلب يتحفظ داخل المنصة ويرتبط بحساب العميل، والحالة تتحرك مع الطلب لحد التسليم أو الوصول للمنتج الرقمي.</p>
              </div>
              <div class="nx47-story-visual">
                <div class="nx47-visual-inner">
                  <div class="nx47-visual-title"><strong>Customer Journey</strong><span>ONE FLOW</span></div>
                  <div class="nx47-flow">
                    <article><b>01</b><strong>Discover</strong><span>اعثر على المنتج المناسب</span></article>
                    <article><b>02</b><strong>Choose</strong><span>راجع التفاصيل</span></article>
                    <article><b>03</b><strong>Purchase</strong><span>احفظ الطلب بالحساب</span></article>
                    <article class="done"><b>04</b><strong>Access</strong><span>تابع واستلم</span></article>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- 05: operations -->
          <section class="nx47-scene" data-scene="5">
            <div class="nx47-scene-inner nx47-story-grid">
              <div class="nx47-story-copy">
                <div class="nx47-chapter">04</div>
                <span class="nx47-eyebrow">SELLER + ADMIN</span>
                <h2>وخلف العميل، البائع والإدارة شغالين في نفس المنظومة.</h2>
                <p>البائع يضيف منتجاته ويتابعها. الإدارة تراجع المنتجات والطلبات والمشترين والتشغيل. كل دور له واجهته، لكن البيانات مرتبطة ببعض.</p>
              </div>
              <div class="nx47-story-visual">
                <div class="nx47-visual-inner">
                  <div class="nx47-visual-title"><strong>Operations</strong><span>CONNECTED LAYERS</span></div>
                  <div class="nx47-admin">
                    <nav><span class="active">Dashboard</span><span>Products</span><span>Orders</span><span>Customers</span></nav>
                    <div class="nx47-admin-main"><i></i><i></i><i></i></div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- 06: platform services -->
          <section class="nx47-scene" data-scene="6">
            <div class="nx47-scene-inner nx47-services-layout">
              <div class="nx47-services-copy">
                <span class="nx47-eyebrow">PLATFORM SERVICES</span>
                <h2>خدمات المنصة.</h2>
                <p>دي الوظائف اللي المستخدم بياخدها جوه NUVEXA نفسها، بعيدًا عن خدمات التطوير اللي بنقدمها للمشروعات.</p>
              </div>
              <div class="nx47-service-list">
                <article class="nx47-service"><span class="n">01</span><strong>اكتشاف المنتجات</strong><span>عرض وتصنيف يساعد العميل يوصل للمنتج أو الخدمة المناسبة.</span></article>
                <article class="nx47-service"><span class="n">02</span><strong>الطلب والمتابعة</strong><span>حفظ الطلب وربطه بالحساب ومتابعة حالته حتى التسليم.</span></article>
                <article class="nx47-service"><span class="n">03</span><strong>الوصول الرقمي</strong><span>ظهور المشتريات والتراخيص الرقمية داخل حساب العميل.</span></article>
                <article class="nx47-service"><span class="n">04</span><strong>لوحة البائع</strong><span>إضافة المنتجات ومتابعة المراجعة والاعتماد وإدارة ما يخص البائع.</span></article>
                <article class="nx47-service"><span class="n">05</span><strong>الإدارة والتشغيل</strong><span>إدارة الطلبات والعملاء والمنتجات والفواتير والتقارير.</span></article>
              </div>
            </div>
          </section>

          <!-- 07: our services -->
          <section class="nx47-scene" data-scene="7">
            <div class="nx47-scene-inner nx47-our-layout">
              <div class="nx47-our-copy">
                <span class="nx47-eyebrow">OUR SERVICES</span>
                <h2>خدماتنا.</h2>
                <p>إلى جانب السوق الرقمي، نساعد المشروعات في بناء وتطوير حضورها الرقمي من الفكرة إلى واجهة قابلة للاستخدام والنمو.</p>
              </div>
              <div class="nx47-our-grid">
                <article class="nx47-our-card wide"><span class="mark">01 / WEBSITES</span><h3>تصميم وتطوير المواقع</h3><p>مواقع احترافية تعكس هوية المشروع وتركز على الأداء وتجربة الاستخدام.</p></article>
                <article class="nx47-our-card"><span class="mark">02 / STORES</span><h3>المتاجر والمنصات</h3><p>تجارب بيع تربط المنتجات والطلبات وحساب العميل.</p></article>
                <article class="nx47-our-card"><span class="mark">03 / SYSTEMS</span><h3>تطوير الأنظمة</h3><p>لوحات داخلية ومسارات عمل مخصصة للمشروع.</p></article>
                <article class="nx47-our-card"><span class="mark">04 / IMPROVE</span><h3>تطوير المشاريع</h3><p>تحسين الواجهات وإضافة وظائف جديدة بدون هدم ما يعمل.</p></article>
                <article class="nx47-our-card"><span class="mark">05 / DIGITAL</span><h3>منتجات رقمية</h3><p>قوالب وواجهات وأدوات وموارد رقمية للاستخدام العملي.</p></article>
              </div>
            </div>
          </section>

          <!-- 08: how -->
          <section class="nx47-scene" data-scene="8">
            <div class="nx47-scene-inner nx47-how-grid">
              <div class="nx47-services-copy">
                <span class="nx47-eyebrow">HOW IT WORKS</span>
                <h2>أربع خطوات واضحة.</h2>
                <p>الهدف إن المستخدم يفهم هو فين وإيه الخطوة اللي بعدها من أول التصفح لحد الوصول للمنتج.</p>
              </div>
              <div class="nx47-steps">
                <article class="nx47-step"><b>01</b><strong>اكتشف</strong><span>تصفح المنتجات والفئات والخدمات.</span></article>
                <article class="nx47-step"><b>02</b><strong>اختر</strong><span>راجع التفاصيل وحدد الحل المناسب.</span></article>
                <article class="nx47-step"><b>03</b><strong>اشترِ</strong><span>أكمل الطلب ليتم حفظه وربطه بحسابك.</span></article>
                <article class="nx47-step"><b>04</b><strong>ادخل واستخدم</strong><span>تابع الحالة واستلم المنتج أو الوصول الرقمي.</span></article>
              </div>
            </div>
          </section>

          <!-- 09: philosophy -->
          <section class="nx47-scene" data-scene="9">
            <div class="nx47-scene-inner">
              <div class="nx47-philosophy-wrap">
                <div class="nx47-philosophy">
                  <span class="nx47-eyebrow">PLATFORM PHILOSOPHY</span>
                  <h2>المنتج الرقمي الجيد محتاج تجربة جيدة بنفس القدر.</h2>
                  <p>القيمة مش في الملف أو الخدمة لوحدها. القيمة كمان في طريقة اكتشافها، فهمها، شرائها، الوصول إليها، والرجوع إليها بعد الشراء. علشان كده NUVEXA بتجمع التصميم الواضح مع التشغيل المنظم في رحلة واحدة.</p>
                </div>
                <aside class="nx47-quote">
                  <strong>Fintech-level polish.<br>SaaS clarity.<br>Marketplace function.</strong>
                  <span>منصة تقنية محترفة تبيع منتجات رقمية، مش مجرد متجر إلكتروني.</span>
                </aside>
              </div>
            </div>
          </section>

          <!-- 10: next -->
          <section class="nx47-scene nx47-final" data-scene="10">
            <div class="nx47-scene-inner">
              <span class="nx47-eyebrow">NEXT STEP</span>
              <h2 class="nx47-title">الخطوة التالية:<br><span>تصميم «ابدأ مشروعك».</span></h2>
              <p class="nx47-copy">بعد اعتماد تجربة «من نحن» بالشكل ده، ندخل على قسم ابدأ مشروعك كجزء مستقل ونبنيه بنفس اللغة البصرية.</p>
              <div class="nx47-actions">
                <button type="button" class="nx47-btn primary" data-nx47-products>EXPLORE PRODUCTS</button>
                <button type="button" class="nx47-btn" data-action="customer-account">MY ACCOUNT</button>
              </div>
            </div>
          </section>
        </div>
      </article>`;
  }

  function scenes(){
    return $$('.nx47-scene');
  }

  function progressButtons(){
    return $$('.nx47-progress [data-nx47-scene]');
  }

  function playWipe(){
    const wipe=$('.nx47-wipe');
    if(!wipe)return;
    wipe.classList.remove('play');
    void wipe.offsetWidth;
    wipe.classList.add('play');
  }

  function updateClasses(){
    scenes().forEach((scene,index)=>{
      scene.classList.toggle('is-active',index===current);
      scene.classList.toggle('is-before',index<current);
      scene.classList.toggle('is-after',index>current);
      scene.setAttribute('aria-hidden',index===current?'false':'true');
    });

    progressButtons().forEach((button,index)=>{
      button.classList.toggle('active',index===current);
      button.setAttribute('aria-current',index===current?'step':'false');
    });

    const counter=$('[data-nx47-current]');
    if(counter)counter.textContent=String(current+1).padStart(2,'0');
  }

  function unlockAfter(ms=720){
    clearTimeout(lockTimer);
    lockTimer=setTimeout(()=>{
      locked=false;
      wheelSum=0;
    },ms);
  }

  function goTo(index,{instant=false}={}){
    const max=sceneData.length-1;
    const next=Math.max(0,Math.min(max,index));
    if(next===current)return;

    current=next;
    if(!instant)playWipe();
    updateClasses();
    locked=true;
    unlockAfter(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?220:720);
  }

  function advance(direction){
    if(locked)return;
    const next=current+(direction>0?1:-1);
    if(next<0||next>=sceneData.length)return;
    goTo(next);
  }

  function wheelHandler(event){
    if(!aboutOpen)return;
    event.preventDefault();

    if(locked)return;

    // Accumulate trackpad deltas so tiny touchpad movements do not switch scenes accidentally.
    wheelSum+=event.deltaY;
    if(Math.abs(wheelSum)<46)return;

    const direction=wheelSum>0?1:-1;
    wheelSum=0;
    advance(direction);
  }

  function touchStart(event){
    if(!aboutOpen)return;
    const t=event.touches?.[0];
    if(!t)return;
    touchStartY=t.clientY;
    touchStartX=t.clientX;
  }

  function touchEnd(event){
    if(!aboutOpen||locked||touchStartY===null)return;
    const t=event.changedTouches?.[0];
    if(!t)return;

    const dy=touchStartY-t.clientY;
    const dx=touchStartX-t.clientX;
    touchStartY=null;
    touchStartX=null;

    if(Math.abs(dy)<48||Math.abs(dy)<Math.abs(dx)*1.15)return;
    advance(dy>0?1:-1);
  }

  function keyHandler(event){
    if(!aboutOpen)return;
    if(['ArrowDown','PageDown',' ','ArrowRight'].includes(event.key)){
      event.preventDefault();
      advance(1);
    }else if(['ArrowUp','PageUp','ArrowLeft'].includes(event.key)){
      event.preventDefault();
      advance(-1);
    }else if(event.key==='Home'){
      event.preventDefault();
      if(!locked)goTo(0);
    }else if(event.key==='End'){
      event.preventDefault();
      if(!locked)goTo(sceneData.length-1);
    }else if(event.key==='Escape'){
      event.preventDefault();
      closeAbout();
    }
  }

  function openAbout(){
    const page=$('#storePage');
    const content=$('#storeContent');
    if(!page||!content||page.classList.contains('hidden'))return;

    content.innerHTML=markup();
    document.body.classList.add('nx47-about-open');
    page.classList.remove('nv-store-v14-home');

    aboutOpen=true;
    current=0;
    locked=false;
    wheelSum=0;
    updateClasses();
  }

  function closeAbout(){
    if(!aboutOpen)return;
    aboutOpen=false;
    document.body.classList.remove('nx47-about-open');

    // Use the site's existing home action to rebuild the storefront.
    const home=$('[data-action="store-home"]');
    if(home)home.click();
  }

  function goProducts(){
    aboutOpen=false;
    document.body.classList.remove('nx47-about-open');

    const home=$('[data-action="store-home"]');
    if(!home)return;
    home.click();

    const started=Date.now();
    const timer=setInterval(()=>{
      const products=document.getElementById('storeProductsSection');
      if(products){
        clearInterval(timer);
        setTimeout(()=>products.scrollIntoView({behavior:'smooth',block:'start'}),70);
      }else if(Date.now()-started>2500){
        clearInterval(timer);
      }
    },120);
  }

  function boot(){
    document.addEventListener('wheel',wheelHandler,{passive:false});
    document.addEventListener('touchstart',touchStart,{passive:true});
    document.addEventListener('touchend',touchEnd,{passive:true});
    document.addEventListener('keydown',keyHandler);

    document.addEventListener('click',event=>{
      const about=event.target.closest('[data-action="store-about"]');
      if(about){
        event.preventDefault();
        event.stopImmediatePropagation();
        openAbout();
        return;
      }

      const sceneButton=event.target.closest('[data-nx47-scene]');
      if(sceneButton){
        event.preventDefault();
        if(!locked)goTo(Number(sceneButton.dataset.nx47Scene)||0);
        return;
      }

      if(event.target.closest('[data-nx47-exit]')){
        event.preventDefault();
        closeAbout();
        return;
      }

      if(event.target.closest('[data-nx47-products]')){
        event.preventDefault();
        goProducts();
        return;
      }

      // If another app action moves away from About, release the body lock.
      if(aboutOpen&&event.target.closest('[data-action="customer-account"],[data-action="store-cart"],[data-action="admin-access"],[data-action="seller-access"]')){
        aboutOpen=false;
        document.body.classList.remove('nx47-about-open');
      }
    },true);

    window.NuvexaAboutSceneStory=Object.freeze({
      version:VERSION,
      open:openAbout,
      close:closeAbout,
      next:()=>advance(1),
      prev:()=>advance(-1)
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
