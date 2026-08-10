/* NUVEXA HUB V14.6 — About page
   Visual presentation only. No Supabase or business logic.
*/
(()=>{'use strict';

  const VERSION='14.6';
  let revealObserver=null;

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];

  function markup(){
    return `
      <article class="about-page nx46-about" aria-label="من نحن — NUVEXA HUB">
        <div class="nx46-gridline" aria-hidden="true"></div>

        <div class="nx46-shell">
          <section class="nx46-hero">
            <div class="nx46-hero-copy nx46-reveal">
              <span class="nx46-eyebrow">ABOUT NUVEXA HUB</span>
              <h1 class="nx46-display">منصة تقنية<br><span>تبيع منتجات رقمية.</span></h1>
              <p class="nx46-copy">NUVEXA HUB ليست متجرًا تقليديًا. هي منصة رقمية مصممة لتجعل اكتشاف المنتجات والخدمات الرقمية، شرائها، متابعتها والوصول إليها تجربة واحدة منظمة وواضحة وموثوقة.</p>

              <div class="nx46-hero-actions">
                <button class="nx46-btn primary" type="button" data-nx46-home-products>EXPLORE PRODUCTS</button>
                <button class="nx46-btn ghost" type="button" data-nx46-jump="nx46Story">OUR STORY</button>
              </div>

              <div class="nx46-hero-meta">
                <div><strong>Marketplace</strong><small>Digital products</small></div>
                <div><strong>Workspace</strong><small>Customer access</small></div>
                <div><strong>Seller Tools</strong><small>Creator workflow</small></div>
                <div><strong>Services</strong><small>Sites & systems</small></div>
              </div>
            </div>

            <div class="nx46-market-scene nx46-reveal">
              <div class="nx46-scene-frame">
                <div class="nx46-windowbar"><i></i><i></i><i></i></div>
                <div class="nx46-market-body">
                  <div class="nx46-market-top">
                    <div class="nx46-market-title"><span></span><span></span></div>
                    <div class="nx46-market-search"></div>
                  </div>

                  <div class="nx46-product-stack">
                    <article class="nx46-product-card">
                      <div class="nx46-product-thumb"></div>
                      <div class="nx46-product-lines"><span></span><span></span></div>
                      <div class="nx46-product-price">DIGITAL PRODUCT</div>
                    </article>
                    <article class="nx46-product-card">
                      <div class="nx46-product-thumb"></div>
                      <div class="nx46-product-lines"><span></span><span></span></div>
                      <div class="nx46-product-price">WEB TEMPLATE</div>
                    </article>
                    <article class="nx46-product-card">
                      <div class="nx46-product-thumb"></div>
                      <div class="nx46-product-lines"><span></span><span></span></div>
                      <div class="nx46-product-price">UI RESOURCE</div>
                    </article>
                  </div>
                </div>
              </div>

              <aside class="nx46-scene-floating account">
                <span class="nx46-floating-label">CUSTOMER SPACE</span>
                <div class="nx46-floating-user">
                  <div class="nx46-floating-avatar">N</div>
                  <div class="nx46-floating-lines"><span></span><span></span></div>
                </div>
              </aside>

              <aside class="nx46-scene-floating order">
                <span class="nx46-floating-label">ORDER FLOW</span>
                <div class="nx46-order-status">
                  <strong>ORD-1042</strong>
                  <span class="nx46-status-pill">DELIVERED</span>
                </div>
                <div class="nx46-status-track"><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i></div>
              </aside>
            </div>
          </section>

          <div class="nx46-rule nx46-reveal"></div>

          <section class="nx46-section" id="nx46Story">
            <div class="nx46-two-col">
              <aside class="nx46-side-copy nx46-reveal">
                <span class="nx46-eyebrow">WHO WE ARE</span>
                <p>الفكرة الأساسية بسيطة: المنتجات الرقمية تحتاج منصة تشرح قيمتها، تنظم عملية شرائها، وتمنح العميل طريقة واضحة لمتابعة ما اشتراه والوصول إليه.</p>
              </aside>

              <div class="nx46-statement nx46-reveal">
                <span class="nx46-eyebrow">PLATFORM STORY</span>
                <h2 class="nx46-heading">القصة ليست صورة جنب نص. القصة هي كيف تحوّلت تجربة مبعثرة إلى منصة واحدة.</h2>
                <p class="nx46-copy">علشان كده بنحكي NUVEXA HUB هنا كمشاهد مترابطة: من التشتت، إلى الاكتشاف، إلى الطلب، ثم إلى حساب العميل ولوحة البائع والإدارة.</p>
              </div>
            </div>

            <div class="nx46-story">
              <article class="nx46-chapter nx46-reveal">
                <div class="nx46-chapter-no">01</div>
                <div class="nx46-chapter-copy">
                  <span class="nx46-chapter-tag">THE PROBLEM</span>
                  <h3>المنتج الرقمي كان موجودًا... لكن التجربة كانت متفرقة.</h3>
                  <p>ملفات وروابط وخدمات في أماكن مختلفة، تواصل منفصل، وعميل يحتاج أن يسأل: أين المنتج؟ أين طلبي؟ وكيف أصل إليه مرة أخرى؟</p>
                </div>
                <div class="nx46-story-visual">
                  <div class="nx46-story-ui">
                    <div class="topline"><strong>Scattered Resources</strong><span>BEFORE NUVEXA</span></div>
                    <div class="nx46-story-files">
                      <div class="nx46-file"><i></i><span></span><span></span></div>
                      <div class="nx46-file"><i></i><span></span><span></span></div>
                      <div class="nx46-file"><i></i><span></span><span></span></div>
                      <div class="nx46-file"><i></i><span></span><span></span></div>
                    </div>
                  </div>
                </div>
              </article>

              <article class="nx46-chapter nx46-reveal">
                <div class="nx46-chapter-no">02</div>
                <div class="nx46-chapter-copy">
                  <span class="nx46-chapter-tag">DISCOVERY</span>
                  <h3>جمعنا الاكتشاف في مساحة واحدة.</h3>
                  <p>المنتجات، القوالب، المواقع، الأدوات والخدمات الرقمية تظهر داخل تجربة منظمة، بحيث يقدر العميل يفهم نوع المنتج وقيمته قبل ما يبدأ الشراء.</p>
                </div>
                <div class="nx46-story-visual">
                  <div class="nx46-story-ui">
                    <div class="topline"><strong>Product Discovery</strong><span>NUVEXA MARKETPLACE</span></div>
                    <div class="nx46-discovery">
                      <div class="nx46-discovery-menu">
                        <span class="active">Websites</span><span>Templates</span><span>Digital Tools</span>
                      </div>
                      <div class="nx46-discovery-grid"><i></i><i></i><i></i></div>
                    </div>
                  </div>
                </div>
              </article>

              <article class="nx46-chapter nx46-reveal">
                <div class="nx46-chapter-no">03</div>
                <div class="nx46-chapter-copy">
                  <span class="nx46-chapter-tag">PURCHASE & ACCESS</span>
                  <h3>ثم ربطنا الشراء بالمتابعة والوصول.</h3>
                  <p>الطلب لا يختفي بعد الضغط على الشراء. يتم حفظه داخل المنصة، يرتبط بحساب العميل، وتتغير حالته حتى التسليم أو الوصول للمنتج الرقمي.</p>
                </div>
                <div class="nx46-story-visual">
                  <div class="nx46-story-ui">
                    <div class="topline"><strong>Customer Journey</strong><span>ONE FLOW</span></div>
                    <div class="nx46-flow">
                      <div class="nx46-flow-step"><b>01</b><strong>Discover</strong><span>اعثر على المنتج المناسب</span></div>
                      <div class="nx46-flow-step"><b>02</b><strong>Choose</strong><span>راجع التفاصيل</span></div>
                      <div class="nx46-flow-step"><b>03</b><strong>Purchase</strong><span>احفظ الطلب بالحساب</span></div>
                      <div class="nx46-flow-step"><b>04</b><strong>Access</strong><span>تابع واستلم</span></div>
                    </div>
                  </div>
                </div>
              </article>

              <article class="nx46-chapter nx46-reveal">
                <div class="nx46-chapter-no">04</div>
                <div class="nx46-chapter-copy">
                  <span class="nx46-chapter-tag">PLATFORM LAYERS</span>
                  <h3>وخلف تجربة العميل، هناك بائع وإدارة يعملان في نفس المنظومة.</h3>
                  <p>البائع يضيف منتجاته ويتابعها، والإدارة تراجع وتدير الطلبات والمشترين والتشغيل. كل دور له واجهته، لكن البيانات تظل مترابطة.</p>
                </div>
                <div class="nx46-story-visual">
                  <div class="nx46-story-ui">
                    <div class="topline"><strong>Operations</strong><span>SELLER + ADMIN</span></div>
                    <div class="nx46-admin-visual">
                      <div class="nx46-admin-side"><span class="active">Dashboard</span><span>Products</span><span>Orders</span><span>Customers</span></div>
                      <div class="nx46-admin-main"><i></i><i></i><i></i></div>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </section>

          <div class="nx46-rule nx46-reveal"></div>

          <section class="nx46-section compact" id="nx46PlatformServices">
            <div class="nx46-services-intro">
              <div class="nx46-reveal">
                <span class="nx46-eyebrow">PLATFORM SERVICES</span>
                <h2 class="nx46-heading">خدمات المنصة.</h2>
                <p class="nx46-copy">دي الوظائف اللي تقدمها NUVEXA HUB كمنصة تشغيل وبيع ووصول، مش خدمات التطوير اللي بنقدمها للعميل.</p>
              </div>
              <aside class="nx46-reveal">الفصل بين «خدمات المنصة» و«خدماتنا» مهم: الأولى هي ما يحصل عليه المستخدم داخل NUVEXA، والثانية هي ما يمكن أن نبنيه أو نطوره له.</aside>
            </div>

            <div class="nx46-service-lines">
              <article class="nx46-service-line nx46-reveal">
                <span class="num">01</span><h3>اكتشاف المنتجات</h3><p>تصنيفات وعرض منظم للمنتجات والخدمات الرقمية يساعد العميل على الوصول لما يحتاجه بسرعة.</p><span class="arrow">↗</span>
              </article>
              <article class="nx46-service-line nx46-reveal">
                <span class="num">02</span><h3>حفظ الطلب ومتابعته</h3><p>كل طلب يرتبط بحساب العميل ويظل قابلًا للمتابعة من جديد حتى التسليم.</p><span class="arrow">↗</span>
              </article>
              <article class="nx46-service-line nx46-reveal">
                <span class="num">03</span><h3>الوصول الرقمي</h3><p>المشتريات الرقمية والتراخيص تظهر داخل مساحة العميل بدل الاعتماد على التسليم العشوائي.</p><span class="arrow">↗</span>
              </article>
              <article class="nx46-service-line nx46-reveal">
                <span class="num">04</span><h3>منظومة البائع</h3><p>لوحة خاصة للبائع لإضافة المنتجات ومتابعة المراجعة والاعتماد وإدارة ما يخصه.</p><span class="arrow">↗</span>
              </article>
              <article class="nx46-service-line nx46-reveal">
                <span class="num">05</span><h3>الإدارة والتشغيل</h3><p>لوحات للطلبات والمشترين والمنتجات والفواتير والتقارير داخل نفس المنظومة.</p><span class="arrow">↗</span>
              </article>
            </div>
          </section>

          <div class="nx46-rule nx46-reveal"></div>

          <section class="nx46-section compact" id="nx46OurServices">
            <div class="nx46-reveal">
              <span class="nx46-eyebrow">OUR SERVICES</span>
              <h2 class="nx46-heading">خدماتنا.</h2>
              <p class="nx46-copy">إلى جانب المنصة نفسها، نساعد المشاريع في بناء وتطوير حضورها الرقمي من الفكرة حتى واجهة قابلة للاستخدام والنمو.</p>
            </div>

            <div class="nx46-our-grid">
              <article class="nx46-our-card wide nx46-reveal">
                <div class="mark">01</div>
                <h3>تصميم وتطوير المواقع</h3>
                <p>مواقع تعريفية وتجارية مصممة حسب هوية المشروع، مع اهتمام بالواجهة، الأداء، وضوح المحتوى وتجربة الاستخدام.</p>
                <i class="decor" aria-hidden="true"></i>
              </article>
              <article class="nx46-our-card nx46-reveal">
                <div class="mark">02</div>
                <h3>المتاجر والمنصات</h3>
                <p>بناء تجارب بيع رقمية تشمل المنتجات، الطلبات، حساب العميل، وإدارة العمليات حسب طبيعة المشروع.</p>
                <i class="decor" aria-hidden="true"></i>
              </article>
              <article class="nx46-our-card nx46-reveal">
                <div class="mark">03</div>
                <h3>تطوير الأنظمة</h3>
                <p>لوحات داخلية ومسارات عمل مخصصة لتنظيم العمليات بدل الاعتماد على أدوات منفصلة وغير مترابطة.</p>
                <i class="decor" aria-hidden="true"></i>
              </article>
              <article class="nx46-our-card nx46-reveal">
                <div class="mark">04</div>
                <h3>تطوير وتحسين المشاريع</h3>
                <p>إعادة ترتيب تجربة الاستخدام، تحسين الواجهات، وربط الوظائف الجديدة بالمشروع الحالي دون فقدان ما يعمل بالفعل.</p>
                <i class="decor" aria-hidden="true"></i>
              </article>
              <article class="nx46-our-card nx46-reveal">
                <div class="mark">05</div>
                <h3>منتجات رقمية</h3>
                <p>قوالب، واجهات، أدوات وموارد رقمية مصممة للاستخدام العملي ويمكن تقديمها وبيعها من خلال المنصة.</p>
                <i class="decor" aria-hidden="true"></i>
              </article>
            </div>
          </section>

          <div class="nx46-rule nx46-reveal"></div>

          <section class="nx46-section compact">
            <div class="nx46-reveal">
              <span class="nx46-eyebrow">HOW IT WORKS</span>
              <h2 class="nx46-heading">رحلة واضحة، أربع خطوات.</h2>
            </div>

            <div class="nx46-steps">
              <article class="nx46-step nx46-reveal"><span class="num">01</span><h3>اكتشف</h3><p>تصفح المنتجات والفئات والخدمات واعثر على ما يناسب احتياجك.</p></article>
              <article class="nx46-step nx46-reveal"><span class="num">02</span><h3>اختر</h3><p>راجع التفاصيل والمعلومات وحدد المنتج أو الحل المناسب لك.</p></article>
              <article class="nx46-step nx46-reveal"><span class="num">03</span><h3>اشترِ</h3><p>أكمل الطلب من خلال المنصة ليتم حفظه وربطه بحسابك.</p></article>
              <article class="nx46-step nx46-reveal"><span class="num">04</span><h3>ادخل واستخدم</h3><p>تابع الحالة، استلم المنتج أو الوصول الرقمي، وارجع إليه من حسابك متى احتجت.</p></article>
            </div>
          </section>

          <div class="nx46-rule nx46-reveal"></div>

          <section class="nx46-section compact">
            <div class="nx46-reveal">
              <span class="nx46-eyebrow">WHY NUVEXA</span>
              <h2 class="nx46-heading">الفرق في طريقة بناء التجربة.</h2>
            </div>

            <div class="nx46-why">
              <article class="nx46-value nx46-reveal"><h3>جودة مختارة</h3><p>الهدف تقديم موارد وخدمات رقمية لها استخدام واضح وقيمة عملية، لا مجرد زيادة عدد العناصر.</p></article>
              <article class="nx46-value nx46-reveal"><h3>اكتشاف أسهل</h3><p>تنظيم العرض والفئات والمعلومات يقلل الوقت الذي يضيعه العميل في البحث وفهم المنتج.</p></article>
              <article class="nx46-value nx46-reveal"><h3>شراء موثوق</h3><p>الطلب لا يختفي بعد الشراء؛ يظل محفوظًا ومرتبطًا بحساب العميل ومسار حالته.</p></article>
              <article class="nx46-value nx46-reveal"><h3>وصول واضح</h3><p>المشتريات الرقمية تظهر في حساب العميل بطريقة منظمة عندما تكون جاهزة للوصول.</p></article>
              <article class="nx46-value nx46-reveal"><h3>معلومات أنظف</h3><p>الواجهة مبنية لتوضح المنتج والخدمة والخطوة التالية بدل إغراق المستخدم بعناصر كثيرة.</p></article>
              <article class="nx46-value nx46-reveal"><h3>قابلة للنمو</h3><p>NUVEXA HUB مصممة لتتوسع مع منتجات وخدمات وأدوار ووظائف جديدة بدون فقدان الهوية.</p></article>
            </div>
          </section>

          <section class="nx46-section">
            <div class="nx46-philosophy nx46-reveal">
              <div class="nx46-philosophy-inner">
                <div>
                  <span class="nx46-eyebrow">PLATFORM PHILOSOPHY</span>
                  <h2 class="nx46-heading">المنتج الرقمي الجيد يحتاج تجربة جيدة بنفس القدر.</h2>
                  <p class="nx46-copy">فلسفة NUVEXA HUB إن القيمة مش في الملف أو الخدمة وحدها. القيمة كمان في طريقة اكتشافها، فهمها، شرائها، الوصول إليها، والرجوع إليها بعد الشراء. لذلك المنصة بتجمع بين جودة التصميم، وضوح الاستخدام، وربط البيانات في رحلة واحدة.</p>
                </div>
                <aside class="nx46-quote">
                  <strong>Fintech-level polish.<br>SaaS clarity.<br>Marketplace function.</strong>
                  <span>تجربة تقنية تبدو كشركة رقمية محترفة، لا مجرد متجر إلكتروني.</span>
                </aside>
              </div>
            </div>
          </section>

          <section class="nx46-next">
            <div class="nx46-next-box nx46-reveal">
              <div class="nx46-next-copy">
                <span class="nx46-eyebrow">NEXT STEP</span>
                <h2 class="nx46-heading">قسم «ابدأ مشروعك» هنصممه كخطوة مستقلة بعد اعتماد الصفحة.</h2>
                <p>دلوقتي الصفحة بتوصل للمرحلة دي بصريًا فقط بدون فرض تصميم نهائي للقسم، عشان نشتغل عليه بعد ما تعتمد القصة وخدمات المنصة وخدماتنا.</p>
              </div>
              <div class="nx46-next-actions">
                <button class="nx46-btn primary" type="button" data-nx46-home-products>EXPLORE PRODUCTS</button>
                <button class="nx46-btn ghost" type="button" data-action="customer-account">MY ACCOUNT</button>
              </div>
            </div>
          </section>
        </div>
      </article>`;
  }

  function reveal(){
    const items=$$('.nx46-reveal:not([data-nx46-bound])');
    if(!items.length)return;

    const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if(reduced||!('IntersectionObserver' in window)){
      items.forEach(item=>{
        item.dataset.nx46Bound='1';
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
      },{threshold:.08,rootMargin:'0px 0px -42px'});
    }

    items.forEach((item,index)=>{
      item.dataset.nx46Bound='1';
      item.style.setProperty('--nx46-delay',`${Math.min(index%4,3)*55}ms`);
      revealObserver.observe(item);
    });
  }

  function openAbout(){
    const page=$('#storePage');
    const content=$('#storeContent');
    if(!page||!content||page.classList.contains('hidden'))return;

    content.innerHTML=markup();
    page.classList.remove('nv-store-v14-home');
    window.scrollTo({top:0,behavior:'smooth'});
    requestAnimationFrame(reveal);
  }

  function goProducts(){
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
    document.addEventListener('click',event=>{
      const about=event.target.closest('[data-action="store-about"]');
      if(about){
        event.preventDefault();
        event.stopImmediatePropagation();
        openAbout();
        return;
      }

      const jump=event.target.closest('[data-nx46-jump]');
      if(jump){
        event.preventDefault();
        document.getElementById(jump.dataset.nx46Jump)?.scrollIntoView({behavior:'smooth',block:'start'});
        return;
      }

      const products=event.target.closest('[data-nx46-home-products]');
      if(products){
        event.preventDefault();
        goProducts();
      }
    },true);

    window.NuvexaAboutPage=Object.freeze({
      version:VERSION,
      open:openAbout
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
