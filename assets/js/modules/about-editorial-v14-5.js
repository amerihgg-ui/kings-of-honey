/* NUVEXA HUB V14.5 — About Us Editorial Story
   Replaces the About page rendering only. No impact on products, orders, auth, or accounting.
*/
(()=>{'use strict';

  const VERSION='14.5';
  let revealObserver=null;
  let aboutRendered=false;

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];

  function aboutMarkup(){
    const year=new Date().getFullYear();
    return `
      <article class="about-page nx45-about" aria-label="من نحن في NUVEXA HUB">
        <div class="nx45-shell">
          <section class="nx45-intro">
            <div class="nx45-intro-copy nx45-reveal">
              <span class="eyebrow">ABOUT THE PLATFORM</span>
              <h1 class="heading-display">طريقة أذكى لاكتشاف <br>المنتجات الرقمية.</h1>
              <p>NUVEXA HUB منصة تجمع بين المنتجات والخدمات الرقمية في تجربة واحدة راقية وواضحة. نساعد العميل على أن يفهم ما يشتريه، يختاره بسهولة، ثم يصل إليه من نفس الحساب مع متابعة دقيقة للحالة والخطوات.</p>
              <div class="nx45-cta-row">
                <button type="button" class="nx45-btn primary" data-nx45-home-target="products">EXPLORE PRODUCTS</button>
                <button type="button" class="nx45-btn secondary" data-nx45-jump="nx45Services">OUR SERVICES</button>
              </div>
            </div>

            <div class="nx45-hero-visual nx45-reveal">
              <div class="nx45-visual-canvas">
                <div class="nx45-art-card hero-main nx45-float">
                  <div class="nx45-window-bar"><i></i><i></i><i></i></div>
                  <div class="nx45-window-body">
                    <div class="nx45-ui-grid">
                      <div class="nx45-ui-preview">
                        <div class="banner"></div>
                        <div class="lines"><span></span><span></span><span></span></div>
                      </div>
                      <div class="nx45-side-stack">
                        <div class="panel"><strong>Digital Marketplace</strong><span></span><span></span><span></span></div>
                        <div class="panel">
                          <div class="nx45-mini-stats">
                            <div class="cell"><strong>01</strong><small>Discover</small></div>
                            <div class="cell"><strong>02</strong><small>Purchase</small></div>
                            <div class="cell"><strong>03</strong><small>Access</small></div>
                            <div class="cell"><strong>04</strong><small>Manage</small></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="nx45-art-card side-top">
                  <div class="nx45-window-bar"><i></i><i></i><i></i></div>
                  <div class="nx45-window-body">
                    <div class="nx45-side-stack">
                      <div class="panel"><strong>Templates</strong><span></span><span></span><span></span></div>
                    </div>
                  </div>
                </div>

                <div class="nx45-art-card side-bottom">
                  <div class="nx45-window-bar"><i></i><i></i><i></i></div>
                  <div class="nx45-window-body">
                    <div class="nx45-mini-stats">
                      <div class="cell"><strong>UX</strong><small>Interfaces</small></div>
                      <div class="cell"><strong>WEB</strong><small>Websites</small></div>
                    </div>
                  </div>
                </div>

                <div class="nx45-floating-tag">Premium digital experience</div>
              </div>
            </div>
          </section>

          <div class="nx45-divider nx45-reveal"></div>

          <section class="nx45-section" id="nx45Story">
            <div class="nx45-split">
              <aside class="nx45-aside-note nx45-reveal">
                <span class="eyebrow">WHO WE ARE</span>
                <p>نحن لا ننظر للمنصة كواجهة بيع فقط، بل كرحلة كاملة تبدأ من اكتشاف المنتج المناسب، ثم فهم قيمته، ثم شرائه، ثم الوصول إليه وإدارته من داخل حساب واضح وسهل.</p>
              </aside>

              <div class="nx45-section-copy">
                <div class="nx45-reveal">
                  <span class="eyebrow">ILLUSTRATED STORY</span>
                  <h2 class="heading-elegant">من فكرة متفرقة إلى قصة مصوّرة اسمها NUVEXA HUB.</h2>
                  <p>هذه الصفحة تحكي المنصة كقصة: لماذا وُجدت، ماذا تقدّم، وكيف تحوّل المنتجات والخدمات الرقمية إلى تجربة أكثر وضوحًا وثقة وسهولة في الوصول.</p>
                </div>

                <div class="nx45-story">
                  <article class="nx45-story-row nx45-reveal">
                    <div class="nx45-story-no">01</div>
                    <div class="nx45-story-text">
                      <h3>البداية</h3>
                      <p>كانت الفكرة أن العميل يحتاج مكانًا واحدًا يكتشف فيه المنتجات الرقمية، بدل التشتت بين الرسائل والروابط والملفات المتناثرة. من هنا بدأت NUVEXA HUB كمنصة تنظّم التجربة من أول نظرة.</p>
                    </div>
                    <div class="nx45-story-mock">
                      <div class="story-label"><span>Discover</span><span>Preview</span></div>
                      <div class="story-grid"><i></i><i></i><i></i></div>
                    </div>
                  </article>

                  <article class="nx45-story-row nx45-reveal">
                    <div class="nx45-story-no">02</div>
                    <div class="nx45-story-text">
                      <h3>التحول إلى منصة</h3>
                      <p>بعدها تطورت الفكرة لتشمل الشراء والمتابعة والوصول للمنتج الرقمي من نفس الحساب، مع بنية تسمح بإدارة الطلبات، حالة التسليم، والعناصر الرقمية بشكل مترابط وواضح.</p>
                    </div>
                    <div class="nx45-story-mock">
                      <div class="story-label"><span>Purchase</span><span>Track</span></div>
                      <div class="story-lines"><span></span><span></span><span></span></div>
                    </div>
                  </article>

                  <article class="nx45-story-row nx45-reveal">
                    <div class="nx45-story-no">03</div>
                    <div class="nx45-story-text">
                      <h3>النتيجة</h3>
                      <p>اليوم أصبحت NUVEXA HUB مساحة تجمع بين سوق رقمي، خدمات تطوير، وتجربة عميل متكاملة. المنتج لا يُعرض فقط، بل يُقدَّم في إطار يشرح قيمته ويسهّل الوصول إليه ويزيد الثقة فيه.</p>
                    </div>
                    <div class="nx45-story-mock">
                      <div class="story-label"><span>Access</span><span>Workspace</span></div>
                      <div class="story-grid"><i></i><i></i><i></i></div>
                    </div>
                  </article>
                </div>
              </div>
            </div>
          </section>

          <div class="nx45-divider nx45-reveal"></div>

          <section class="nx45-section tight" id="nx45Platform">
            <div class="nx45-reveal">
              <span class="eyebrow">WHAT THE PLATFORM OFFERS</span>
              <h2 class="heading-elegant">خدمات المنصة نفسها.</h2>
              <p class="nx45-section-copy">NUVEXA HUB لا تعرض منتجًا فقط، بل تقدم طبقات واضحة من الخدمة داخل المنصة نفسها: عرض احترافي، شراء منظم، متابعة للحالة، ووصول للمحتوى الرقمي من نفس الحساب.</p>
            </div>

            <div class="nx45-editorial-grid">
              <article class="nx45-panel featured nx45-reveal">
                <span class="eyebrow">DISCOVER</span>
                <h3>سوق رقمي منظم</h3>
                <p>اكتشاف المنتجات والخدمات الرقمية عبر واجهة واضحة تساعد المستخدم على فهم نوع المنتج قبل الشراء، مع إبراز الفئات والعروض والتفاصيل في تجربة راقية وليست مزدحمة.</p>
                <div class="nx45-category-art"><div class="thumb"></div><span></span><span></span><span></span></div>
              </article>

              <article class="nx45-panel side nx45-reveal">
                <span class="eyebrow">PURCHASE</span>
                <h3>شراء بسيط</h3>
                <p>رحلة طلب واضحة تحفظ تفاصيل الطلب داخل المنصة وتربطه بحساب العميل، بدل أن يضيع في محادثات منفصلة أو خطوات غير مترابطة.</p>
              </article>

              <article class="nx45-panel side nx45-reveal">
                <span class="eyebrow">ACCESS</span>
                <h3>وصول ومتابعة</h3>
                <p>بعد الشراء يمكن للعميل مراجعة الطلبات، حالة الطلب، والمشتريات الرقمية من داخل حسابه بصورة منظمة وسهلة الوصول.</p>
              </article>
            </div>

            <div class="nx45-offer-list">
              <article class="nx45-offer-item nx45-reveal">
                <div class="icon">✦</div>
                <div><h4>حساب عميل مرتبط بالطلبات</h4><p>كل طلب يظل ظاهرًا داخل حساب العميل، مع متابعة الحالة بدل فقدان البيانات بعد إنهاء عملية الشراء.</p></div>
              </article>
              <article class="nx45-offer-item nx45-reveal">
                <div class="icon">▣</div>
                <div><h4>لوحة بائع وإدارة</h4><p>المنصة مصممة لتخدم أكثر من طبقة استخدام: عميل، بائع، وإدارة، مع فصل واضح للمهام وتنظيم العمل.</p></div>
              </article>
              <article class="nx45-offer-item nx45-reveal">
                <div class="icon">◎</div>
                <div><h4>وصول رقمي واضح</h4><p>المنتجات الرقمية والتراخيص يمكن الوصول إليها ومراجعتها بوضوح عند الحاجة، بدل تسليمها بطريقة غير منظمة.</p></div>
              </article>
              <article class="nx45-offer-item nx45-reveal">
                <div class="icon">⌘</div>
                <div><h4>تجربة متجاوبة</h4><p>واجهة مصممة للهاتف والكمبيوتر بحيث تظل القراءة والاستخدام والحركة داخل المنصة سهلة على كل الأجهزة.</p></div>
              </article>
            </div>
          </section>

          <div class="nx45-divider nx45-reveal"></div>

          <section class="nx45-section tight" id="nx45Services">
            <div class="nx45-reveal">
              <span class="eyebrow">OUR SERVICES</span>
              <h2 class="heading-elegant">خدماتنا.</h2>
              <p class="nx45-section-copy">إلى جانب السوق الرقمي، نُقدّم خدمات تساعد أصحاب المشاريع على بناء حضورهم الرقمي وبيع خدماتهم أو منتجاتهم بصورة أكثر احترافية داخل منظومة واحدة.</p>
            </div>

            <div class="nx45-editorial-grid">
              <article class="nx45-panel side nx45-reveal">
                <span class="eyebrow">WEBSITES</span>
                <h3>مواقع إلكترونية</h3>
                <p>تصميم وتطوير مواقع تعرض النشاط بصورة احترافية، مع تجربة استخدام واضحة ومظهر بصري يليق بالعلامة.</p>
              </article>
              <article class="nx45-panel side nx45-reveal">
                <span class="eyebrow">STORES</span>
                <h3>متاجر رقمية</h3>
                <p>متاجر تجمع بين العرض والطلب والمتابعة والحسابات، مع التركيز على سهولة الشراء ووضوح الخطوات للعميل.</p>
              </article>
              <article class="nx45-panel side nx45-reveal">
                <span class="eyebrow">SYSTEMS</span>
                <h3>حلول مخصصة</h3>
                <p>بناء صفحات، أنظمة، أو مسارات عمل رقمية تناسب طبيعة المشروع، بدل إجبار المشروع على قوالب عامة.</p>
              </article>
              <article class="nx45-panel featured nx45-reveal">
                <span class="eyebrow">DIGITAL PRODUCTS</span>
                <h3>منتجات وأصول رقمية</h3>
                <p>قوالب، واجهات، موارد تصميم، مواقع جاهزة، أدوات رقمية، ومواد قابلة للتحميل أو الوصول حسب طبيعة كل منتج. الهدف ليس كثرة العرض فقط، بل انتقاء ما يضيف قيمة فعلية للمستخدم.</p>
                <div class="nx45-category-art"><div class="thumb"></div><span></span><span></span><span></span></div>
              </article>
            </div>
          </section>

          <div class="nx45-divider nx45-reveal"></div>

          <section class="nx45-section tight" id="nx45How">
            <div class="nx45-reveal">
              <span class="eyebrow">HOW IT WORKS</span>
              <h2 class="heading-elegant">كيف تعمل الرحلة داخل NUVEXA HUB.</h2>
            </div>

            <div class="nx45-steps">
              <article class="nx45-step nx45-reveal">
                <b>01</b>
                <div><h4>اكتشف</h4><p>تصفح المنتجات والخدمات الرقمية واعثر على ما يناسب احتياجك، مع عرض أوضح للتصنيفات والمحتوى.</p></div>
                <span>Discover</span>
              </article>
              <article class="nx45-step nx45-reveal">
                <b>02</b>
                <div><h4>اختر</h4><p>راجع تفاصيل المنتج أو الخدمة وحدد الخيار المناسب لك، مع فهم أوضح لما تحصل عليه قبل الشراء.</p></div>
                <span>Choose</span>
              </article>
              <article class="nx45-step nx45-reveal">
                <b>03</b>
                <div><h4>اشترِ</h4><p>أكمل الطلب من داخل المنصة، ليتم حفظه وربطه بحسابك ومتابعة حالته لاحقًا بشكل منظم.</p></div>
                <span>Purchase</span>
              </article>
              <article class="nx45-step nx45-reveal">
                <b>04</b>
                <div><h4>ادخل واستخدم</h4><p>راجع الطلب أو استلم الوصول الرقمي من داخل حسابك، ثم ابدأ استخدام ما اشتريته بثقة وسهولة.</p></div>
                <span>Access</span>
              </article>
            </div>
          </section>

          <div class="nx45-divider nx45-reveal"></div>

          <section class="nx45-section tight" id="nx45Why">
            <div class="nx45-reveal">
              <span class="eyebrow">WHY CHOOSE US</span>
              <h2 class="heading-elegant">لماذا يختارنا العملاء.</h2>
            </div>

            <div class="nx45-values">
              <article class="nx45-value nx45-reveal"><h4>اختيار محسوب</h4><p>نركز على تقديم منتجات وخدمات رقمية مفهومة ومفيدة، بدل عرض كبير بلا قيمة واضحة.</p></article>
              <article class="nx45-value nx45-reveal"><h4>شراء أوضح</h4><p>المسار من التصفح إلى الطلب مبني ليكون مفهومًا ومباشرًا، مع تقليل التشتت بين الخطوات.</p></article>
              <article class="nx45-value nx45-reveal"><h4>وصول أسرع</h4><p>عندما يكون المنتج رقميًا، تبقى طريقة الوصول إليه ومراجعته أكثر وضوحًا من خلال الحساب.</p></article>
              <article class="nx45-value nx45-reveal"><h4>معلومات أنظف</h4><p>تفاصيل المنتج والخدمة وحالة الطلب معروضة بشكل يسهّل الفهم بدلاً من الواجهات المزدحمة.</p></article>
              <article class="nx45-value nx45-reveal"><h4>ثقة أعلى</h4><p>من خلال الحساب، متابعة الطلبات، والتنظيم الداخلي للمنصة، يشعر العميل أن التجربة متماسكة ويمكن الاعتماد عليها.</p></article>
              <article class="nx45-value nx45-reveal"><h4>دعم للنمو</h4><p>NUVEXA HUB ليست مجرد صفحة تعريف، بل منصة قابلة للتوسع مع المنتجات والخدمات والمشاريع الجديدة.</p></article>
            </div>
          </section>

          <section class="nx45-section">
            <div class="nx45-philosophy nx45-reveal">
              <div class="nx45-philosophy-inner">
                <div>
                  <span class="eyebrow" style="color:hsla(40 32% 95%/.72)">PLATFORM PHILOSOPHY</span>
                  <h2 class="heading-elegant">المنتجات الرقمية يجب أن تكون أسهل في الاكتشاف والفهم والاستخدام.</h2>
                  <p>رؤيتنا أن العميل لا يحتاج فقط إلى منتج جيد، بل إلى تجربة محترمة تشرح المنتج بوضوح، تسهّل الوصول إليه، وتجعله جزءًا من رحلة شراء أكثر تنظيمًا وثقة. لذلك نحاول أن نجمع بين الرقي البصري، البساطة، والمنطق العملي في كل خطوة من خطوات المنصة.</p>
                </div>
                <div class="nx45-philosophy-quote">
                  <strong>Editorial sophistication<br>meets digital clarity.</strong>
                  <span>Luxury-inspired visual language with a practical marketplace experience.</span>
                </div>
              </div>
            </div>
          </section>

          <section class="nx45-final" id="nx45Start">
            <div class="nx45-final-box nx45-reveal">
              <div class="nx45-final-copy">
                <span class="eyebrow">START YOUR PROJECT</span>
                <h2 class="heading-elegant">ابدأ مشروعك معنا.</h2>
                <p>سواء كنت تريد استكشاف المنتجات الرقمية، أو بناء حضورك الرقمي، أو إطلاق خدمة أو متجر أو موقع جديد — NUVEXA HUB تمنحك نقطة بداية أوضح وأكثر احترافية.</p>
              </div>
              <div class="nx45-final-actions">
                <button type="button" class="nx45-btn primary" data-nx45-home-target="products">EXPLORE PRODUCTS</button>
                <button type="button" class="nx45-btn secondary" data-action="customer-account">MY ACCOUNT</button>
              </div>
            </div>
          </section>

          <footer class="nx45-about-footer">
            <div class="nx45-divider"></div>
            <div class="nx45-about-footer-inner">
              <div><strong>NUVEXA HUB</strong> — Premium digital marketplace experience.</div>
              <div>© ${year} جميع الحقوق محفوظة.</div>
            </div>
          </footer>
        </div>
      </article>`;
  }

  function setNavState(mode){
    $$('.store-bottom-nav [data-action="store-home"], .store-side-nav [data-action="store-home"]').forEach(btn=>{
      btn.classList.toggle('active',mode==='home');
    });
    $$('.store-bottom-nav [data-action="store-about"], .store-side-nav [data-action="store-about"]').forEach(btn=>{
      btn.classList.toggle('active',mode==='about');
    });
  }

  function renderAbout(){
    const content=$('#storeContent');
    const page=$('#storePage');
    if(!content||!page||page.classList.contains('hidden'))return;
    content.innerHTML=aboutMarkup();
    aboutRendered=true;
    page.classList.remove('nv-store-v14-home');
    setNavState('about');
    window.scrollTo({top:0,behavior:'smooth'});
    bindReveals();
  }

  function scrollWithinAbout(id){
    const target=document.getElementById(id);
    if(target)target.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function goHomeAndScrollToProducts(){
    setNavState('home');
    const homeBtn=$('[data-action="store-home"]');
    if(homeBtn){
      homeBtn.click();
      const started=Date.now();
      const timer=setInterval(()=>{
        const section=document.getElementById('storeProductsSection');
        if(section){
          clearInterval(timer);
          setTimeout(()=>section.scrollIntoView({behavior:'smooth',block:'start'}),60);
        }else if(Date.now()-started>2400){
          clearInterval(timer);
        }
      },120);
    }
  }

  function bindReveals(){
    const items=$$('.nx45-reveal:not([data-nx45-bound])');
    if(!items.length)return;

    const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if(reduced||!('IntersectionObserver' in window)){
      items.forEach((item,index)=>{
        item.dataset.nx45Bound='1';
        item.style.setProperty('--nx45-delay',`${Math.min(index%5,4)*45}ms`);
        item.classList.add('is-visible');
      });
      return;
    }

    if(!revealObserver){
      revealObserver=new IntersectionObserver(entries=>{
        entries.forEach(entry=>{
          if(entry.isIntersecting){
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },{threshold:.1,rootMargin:'0px 0px -40px'});
    }

    items.forEach((item,index)=>{
      item.dataset.nx45Bound='1';
      item.style.setProperty('--nx45-delay',`${Math.min(index%5,4)*55}ms`);
      revealObserver.observe(item);
    });
  }

  function observeStoreContent(){
    const content=$('#storeContent');
    if(!content)return;
    new MutationObserver(()=>{
      const isAbout=!!$('.nx45-about',content);
      if(!isAbout){
        aboutRendered=false;
        setNavState('home');
      }else{
        bindReveals();
      }
    }).observe(content,{childList:true,subtree:false});
  }

  function boot(){
    observeStoreContent();

    document.addEventListener('click',event=>{
      const aboutBtn=event.target.closest('[data-action="store-about"]');
      if(aboutBtn){
        event.preventDefault();
        event.stopImmediatePropagation();
        renderAbout();
        return;
      }

      const jump=event.target.closest('[data-nx45-jump]');
      if(jump){
        event.preventDefault();
        scrollWithinAbout(jump.dataset.nx45Jump);
        return;
      }

      const homeTarget=event.target.closest('[data-nx45-home-target]');
      if(homeTarget){
        event.preventDefault();
        if(homeTarget.dataset.nx45HomeTarget==='products'){
          goHomeAndScrollToProducts();
        }
        return;
      }

      if(event.target.closest('[data-action="store-home"]')){
        aboutRendered=false;
        setNavState('home');
      }
    },true);

    window.NuvexaAboutStory=Object.freeze({
      version:VERSION,
      open:renderAbout
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
