/* NUVEXA HUB V14.1 — Illustrated About Story
   Presentation-only enhancement. Replaces the rendered About markup after app.js
   creates it, while preserving existing data-action and data-about-contact hooks.
*/
(()=>{'use strict';

  const VERSION='14.1';
  const CONTENT_ID='storeContent';
  const STORY_MARK='nvStoryV141';
  let replacing=false;
  let sceneObserver=null;
  let activeObserver=null;

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];

  function storyMarkup(){
    return `
      <article class="about-page nv-story-about" data-${STORY_MARK.toLowerCase()}="1" aria-label="قصة NUVEXA HUB">
        <section class="nv-story-hero nv-story-scene">
          <div class="nv-story-hero-media">
            <img src="assets/about/about-systems.webp" alt="قصة NUVEXA HUB — التجارة والتقنية في منصة واحدة">
          </div>
          <div class="nv-story-hero-grid" aria-hidden="true"></div>
          <div class="nv-story-hero-content">
            <span class="nv-story-kicker">قصة NUVEXA HUB</span>
            <h1>من فكرة بسيطة...
              <em>إلى منصة مترابطة.</em>
            </h1>
            <p>الحكاية لم تبدأ من الرغبة في بناء صفحة بيع فقط. بدأت من سؤال أبسط: كيف نجمع المنتج، الخدمة، العميل، الطلب، والبائع داخل تجربة واحدة واضحة يمكن أن تكبر مع المشروع؟</p>
            <div class="nv-story-hero-actions">
              <button class="btn btn-gold" type="button" data-about-scroll="services">ابدأ القصة</button>
              <button class="btn btn-soft" type="button" data-action="replay-intro">شاهد فيديو المنصة</button>
              <button class="btn btn-soft" type="button" data-action="store-home">تصفح المتجر</button>
            </div>
          </div>
          <div class="nv-story-scroll-cue" aria-hidden="true"><span>مرّر لتكمل القصة</span><i></i></div>
        </section>

        <div class="nv-story-body" id="aboutServices">
          <div class="nv-story-rail" aria-hidden="true"><i class="nv-story-rail-progress"></i></div>

          <section class="nv-story-chapter nv-story-scene" data-story-chapter="1">
            <div class="nv-story-chapter-copy">
              <span class="nv-story-chapter-no">الفصل 01</span>
              <h2>البداية كانت من احتياج حقيقي.</h2>
              <p>بيع منتج أو تقديم خدمة لا ينتهي عند زر «شراء». خلف كل عملية هناك بيانات عميل، طلب يحتاج متابعة، حالة تتغير، وبائع أو إدارة تحتاج رؤية واضحة لما يحدث.</p>
              <div class="nv-story-tags"><span>تجارة</span><span>طلب</span><span>عميل</span><span>متابعة</span></div>
            </div>
            <div class="nv-story-node">01</div>
            <figure class="nv-story-picture">
              <img src="assets/about/about-commerce.webp" alt="التجارة والمنتجات في NUVEXA HUB">
              <figcaption class="nv-story-picture-caption"><span>من البيع بدأت الحكاية</span><b>01</b></figcaption>
            </figure>
          </section>

          <section class="nv-story-chapter is-reverse nv-story-scene" data-story-chapter="2">
            <figure class="nv-story-picture">
              <img src="assets/about/about-systems.webp" alt="ربط العمليات والإدارة داخل NUVEXA HUB">
              <figcaption class="nv-story-picture-caption"><span>المعلومة في مكانها الصحيح</span><b>02</b></figcaption>
            </figure>
            <div class="nv-story-node">02</div>
            <div class="nv-story-chapter-copy">
              <span class="nv-story-chapter-no">الفصل 02</span>
              <h2>فبدل أدوات منفصلة... بنينا تدفقًا واحدًا.</h2>
              <p>الطلب الذي ينشئه العميل يجب أن يصل للإدارة، ويرتبط بحسابه، وتظهر حالته، وتتحرك معه البيانات بدل إعادة إدخالها في أكثر من مكان.</p>
              <div class="nv-story-tags"><span>طلبات</span><span>لوحة إدارة</span><span>مزامنة</span><span>تنظيم</span></div>
            </div>
          </section>

          <section class="nv-story-chapter nv-story-scene" data-story-chapter="3">
            <div class="nv-story-chapter-copy">
              <span class="nv-story-chapter-no">الفصل 03</span>
              <h2>ثم اتسعت الفكرة لما هو أبعد من المنتجات.</h2>
              <p>NUVEXA HUB لا تتعامل مع المنتج المادي فقط. الخدمات الرقمية، المواقع، الاشتراكات والتراخيص تحتاج هي الأخرى طريقة عرض وطلب وتسليم ومتابعة منظمة.</p>
              <div class="nv-story-tags"><span>خدمات رقمية</span><span>مواقع</span><span>اشتراكات</span><span>تراخيص</span></div>
            </div>
            <div class="nv-story-node">03</div>
            <figure class="nv-story-picture">
              <img src="assets/about/about-digital.webp" alt="الخدمات الرقمية والمواقع في NUVEXA HUB">
              <figcaption class="nv-story-picture-caption"><span>منتج أو خدمة... نفس الرحلة المنظمة</span><b>03</b></figcaption>
            </figure>
          </section>

          <section class="nv-story-chapter is-reverse nv-story-scene" data-story-chapter="4">
            <figure class="nv-story-picture">
              <img src="assets/about/about-support.webp" alt="متابعة رحلة طلب العميل">
              <figcaption class="nv-story-picture-caption"><span>كل طلب له قصة يمكن متابعتها</span><b>04</b></figcaption>
            </figure>
            <div class="nv-story-node">04</div>
            <div class="nv-story-chapter-copy">
              <span class="nv-story-chapter-no">الفصل 04</span>
              <h2>والعميل لا يفقد أثر طلبه بعد الشراء.</h2>
              <p>من لحظة تسجيل الطلب وحتى التسليم، الحالة تتحول إلى رحلة مفهومة. والهدف أن يعرف العميل أين وصل طلبه، وتعرف الإدارة ما الخطوة التالية.</p>
              <div class="nv-story-order-journey" aria-label="مراحل رحلة الطلب">
                <span><i>＋</i>طلب جديد</span>
                <span><i>✓</i>تأكيد</span>
                <span><i>□</i>تجهيز</span>
                <span><i>→</i>في الطريق</span>
                <span><i>★</i>تسليم</span>
                <span><i>✎</i>تقييم</span>
              </div>
            </div>
          </section>

          <section class="nv-story-chapter nv-story-scene" data-story-chapter="5">
            <div class="nv-story-chapter-copy">
              <span class="nv-story-chapter-no">الفصل 05</span>
              <h2>وخلف واجهة العميل... توجد أدوار أخرى.</h2>
              <p>البائع يحتاج مساحة لإضافة منتجاته ومتابعتها، والإدارة تحتاج مراجعة واعتمادًا وتحكمًا في الطلبات. لذلك صُممت المنصة لتخدم أكثر من طرف دون خلط التجارب ببعضها.</p>
              <div class="nv-story-role-pair">
                <div class="nv-story-role"><i>♙</i><b>البائع</b><small>إضافة المنتجات ومتابعة الاعتماد وإدارة ما يخصه.</small></div>
                <div class="nv-story-role"><i>⚙</i><b>الإدارة</b><small>مراجعة المنتجات والطلبات والمشترين والتشغيل.</small></div>
              </div>
            </div>
            <div class="nv-story-node">05</div>
            <figure class="nv-story-picture">
              <img src="assets/about/about-security.webp" alt="الإدارة والتراخيص والضبط في NUVEXA HUB">
              <figcaption class="nv-story-picture-caption"><span>كل دور يرى ما يحتاجه</span><b>05</b></figcaption>
            </figure>
          </section>

          <section class="nv-story-chapter is-reverse nv-story-scene" data-story-chapter="6">
            <figure class="nv-story-picture">
              <img src="assets/about/about-websites.webp" alt="تصميم وتطوير المواقع والأنظمة">
              <figcaption class="nv-story-picture-caption"><span>المنصة جزء من قصة تطوير أكبر</span><b>06</b></figcaption>
            </figure>
            <div class="nv-story-node">06</div>
            <div class="nv-story-chapter-copy">
              <span class="nv-story-chapter-no">الفصل 06</span>
              <h2>ومن هنا أصبحت NUVEXA HUB أكثر من متجر.</h2>
              <p>نستخدم نفس الفكرة في بناء وتطوير المواقع والأنظمة: نفهم الاحتياج، ننظم الرحلة، نبني الواجهة، ثم نربطها بالوظائف التي تجعل المشروع يعمل فعليًا.</p>
              <div class="nv-story-tags"><span>تصميم مواقع</span><span>تطوير أنظمة</span><span>تحسين مشاريع</span><span>تجربة استخدام</span></div>
            </div>
          </section>

          <section class="nv-story-chapter nv-story-scene" data-story-chapter="7">
            <div class="nv-story-chapter-copy">
              <span class="nv-story-chapter-no">الفصل 07</span>
              <h2>والقصة لا تنتهي عند التسليم.</h2>
              <p>المشروع الجيد يحتاج قابلية للتعديل والنمو. لذلك نترك مساحة للتطوير المستمر: وظائف جديدة، تحسين للواجهات، إدارة تراخيص، أو توسع في طريقة البيع والخدمة.</p>
              <div class="nv-story-tags"><span>دعم</span><span>تحديث</span><span>نمو</span><span>قابلية للتوسع</span></div>
            </div>
            <div class="nv-story-node">07</div>
            <figure class="nv-story-picture">
              <img src="assets/about/about-support.webp" alt="الدعم والتطوير المستمر للمشروعات">
              <figcaption class="nv-story-picture-caption"><span>نبني لليوم... مع مساحة للغد</span><b>07</b></figcaption>
            </figure>
          </section>
        </div>

        <section class="nv-story-recap nv-story-scene">
          <div class="nv-story-recap-head">
            <span>الصورة الكاملة</span>
            <h2>منصة واحدة... لكن كل جزء فيها يكمل الآخر.</h2>
            <p>التجارة والخدمات والطلبات والعملاء والبائعون والإدارة ليست أقسامًا منفصلة في القصة؛ هي أجزاء من تجربة واحدة هدفها أن تكون العملية أوضح وأسهل في المتابعة.</p>
          </div>
          <div class="nv-story-recap-grid">
            <article><i>◫</i><strong>منتجات وخدمات</strong><p>عرض واضح لما تقدمه المنصة في مكان واحد.</p></article>
            <article><i>◇</i><strong>عميل وطلب</strong><p>الطلبات ترتبط بحساب العميل وحالتها قابلة للمتابعة.</p></article>
            <article><i>✓</i><strong>بائع وإدارة</strong><p>أدوار منفصلة لكن مترابطة داخل نفس سير العمل.</p></article>
            <article><i>↗</i><strong>تطوير مستمر</strong><p>إمكانية التوسع وإضافة وظائف مع نمو المشروع.</p></article>
          </div>
        </section>

        <section class="nv-story-final nv-story-scene">
          <img src="assets/about/about-systems.webp" alt="NUVEXA HUB — منصة قابلة للنمو">
          <div class="nv-story-final-content">
            <span>الفصل التالي</span>
            <h2>NUVEXA HUB ليست نهاية القصة... بل البنية التي تبدأ منها الخطوة التالية.</h2>
            <p>سواء كنت تريد شراء منتج، الحصول على خدمة رقمية، أو لديك فكرة لموقع أو نظام جديد، تستطيع أن تبدأ من نفس المنصة وتتحرك بخطوات واضحة.</p>
            <div class="nv-story-final-actions">
              <button class="btn btn-gold" type="button" data-about-contact>ابدأ مشروعك</button>
              <button class="btn btn-soft" type="button" data-action="store-home">تصفح المنتجات والخدمات</button>
              <button class="btn btn-soft" type="button" data-action="replay-intro">شاهد فيديو المنصة</button>
            </div>
          </div>
        </section>
      </article>`;
  }

  function ensureProgressBox(){
    let box=$('#nvStoryProgressBox');
    if(box)return box;
    box=document.createElement('div');
    box.id='nvStoryProgressBox';
    box.className='nv-story-progress-box';
    box.setAttribute('aria-hidden','true');
    box.innerHTML='<span>الفصل</span><strong>01 / 07</strong><i></i>';
    document.body.appendChild(box);
    return box;
  }

  function setProgress(value){
    const story=$('.nv-story-about');
    if(!story)return;
    const clamped=Math.max(0,Math.min(100,value));
    $('.nv-story-rail-progress',story)?.style.setProperty('height',`${clamped}%`);
    const box=ensureProgressBox();
    box.style.setProperty('--nv-story-progress',`${clamped}%`);
  }

  function updateScrollProgress(){
    const story=$('.nv-story-about');
    if(!story)return;
    const body=$('.nv-story-body',story);
    if(!body)return;
    const rect=body.getBoundingClientRect();
    const viewport=window.innerHeight||1;
    const total=Math.max(1,body.offsetHeight-viewport*.36);
    const travelled=Math.min(total,Math.max(0,-rect.top+viewport*.34));
    setProgress(travelled/total*100);

    const box=ensureProgressBox();
    const storyRect=story.getBoundingClientRect();
    box.classList.toggle('is-visible',storyRect.top<80&&storyRect.bottom>viewport*.45);
  }

  function bindSceneReveal(story){
    sceneObserver?.disconnect();
    activeObserver?.disconnect();

    const scenes=$$('.nv-story-scene',story);
    if(!('IntersectionObserver' in window)){
      scenes.forEach(x=>x.classList.add('is-visible'));
      return;
    }

    sceneObserver=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          entry.target.classList.add('is-visible');
          sceneObserver.unobserve(entry.target);
        }
      });
    },{threshold:.09,rootMargin:'0px 0px -50px'});

    scenes.forEach((scene,index)=>{
      scene.style.transitionDelay=`${Math.min(index%3,2)*50}ms`;
      sceneObserver.observe(scene);
    });

    activeObserver=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(!entry.isIntersecting)return;
        const chapter=entry.target;
        $$('.nv-story-chapter',story).forEach(x=>x.classList.toggle('is-active',x===chapter));
        const number=Number(chapter.dataset.storyChapter||1);
        const strong=$('#nvStoryProgressBox strong');
        if(strong)strong.textContent=`${String(number).padStart(2,'0')} / 07`;
      });
    },{threshold:.45,rootMargin:'-22% 0px -35%'});

    $$('.nv-story-chapter',story).forEach(chapter=>activeObserver.observe(chapter));
  }

  function installStory(){
    if(replacing)return;
    const content=document.getElementById(CONTENT_ID);
    const about=$('.about-page',content);
    if(!content||!about)return;
    if(about.classList.contains('nv-story-about'))return;

    replacing=true;
    try{
      content.innerHTML=storyMarkup();
      const story=$('.nv-story-about',content);
      bindSceneReveal(story);
      ensureProgressBox();
      requestAnimationFrame(()=>{
        $('.nv-story-hero',story)?.classList.add('is-visible');
        updateScrollProgress();
      });
    }finally{
      replacing=false;
    }
  }

  function removeStoryUiWhenAway(){
    if($('.nv-story-about'))return;
    $('#nvStoryProgressBox')?.classList.remove('is-visible');
  }

  function boot(){
    const content=document.getElementById(CONTENT_ID);
    if(!content)return;

    const observer=new MutationObserver(()=>{
      if(replacing)return;
      if($('.about-page',content))installStory();
      else removeStoryUiWhenAway();
    });
    observer.observe(content,{childList:true,subtree:false});

    installStory();

    window.addEventListener('scroll',updateScrollProgress,{passive:true});
    window.addEventListener('resize',updateScrollProgress,{passive:true});

    // Existing app.js maps data-about-scroll to #aboutServices.
    // Add a direct guard for browsers where the existing delegated handler runs later.
    document.addEventListener('click',event=>{
      const start=event.target.closest('[data-about-scroll="services"]');
      if(start&&$('.nv-story-about')){
        setTimeout(()=>document.getElementById('aboutServices')?.scrollIntoView({behavior:'smooth',block:'start'}),0);
      }
    },true);

    window.NuvexaAboutStory=Object.freeze({version:VERSION,refresh:installStory});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
