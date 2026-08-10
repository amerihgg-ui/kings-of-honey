/* NUVEXA HUB V14.8 — Project Builder
   Six-stage visual brief builder. Presentation + WhatsApp handoff only.
   No Supabase writes and no modification to core app.js.
*/
(()=>{'use strict';

  const VERSION='14.8';
  const STORAGE_KEY='nuvexa_project_builder_v14_8_draft';
  const TOTAL=6;

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[ch]);

  let step=1;
  let builderOpen=false;
  let draft={};

  const stepNames=[
    ['فكرتك','ما الذي تريد بناءه؟'],
    ['الهدف والجمهور','لماذا ولمن؟'],
    ['الشكل والهوية','كيف يجب أن يبدو؟'],
    ['الوظائف','ماذا يجب أن يفعل؟'],
    ['الجاهزية','ماذا لديك بالفعل؟'],
    ['المراجعة والتواصل','راجع ثم أرسل']
  ];

  const projectTypes=[
    ['متجر إلكتروني','بيع منتجات أو خدمات أونلاين','🛒'],
    ['موقع شركة','تعريف بالنشاط والخدمات والتواصل','▦'],
    ['منصة أو نظام','حسابات ولوحات إدارة وعمليات','⚙'],
    ['موقع شخصي / أعمال','ملف أعمال أو علامة شخصية','◇'],
    ['تطوير مشروع قائم','إعادة تصميم أو إضافة وظائف','↗'],
    ['خدمة / منتج رقمي','تقديم وبيع منتج أو خدمة رقمية','◫'],
    ['غير ذلك','فكرة خاصة تحتاج مناقشة','＋']
  ];

  const goals=[
    'بيع مباشر',
    'استقبال طلبات أو حجوزات',
    'التعريف بالشركة والخدمات',
    'إدارة عمل أو فريق',
    'عرض أعمال ومحتوى',
    'اشتراكات أو عضويات',
    'إطلاق منتج رقمي',
    'هدف آخر'
  ];

  const styles=[
    'Premium / فاخر',
    'تقني حديث',
    'Minimal / بسيط',
    'Corporate / رسمي',
    'جريء ومختلف',
    'مش متأكد — اقترح المناسب'
  ];

  const features=[
    'تسجيل دخول وحسابات',
    'تسجيل Google',
    'متجر وسلة وطلبات',
    'لوحة إدارة',
    'لوحة بائع',
    'حجز مواعيد',
    'اشتراكات',
    'تراخيص رقمية',
    'رفع ملفات',
    'دفع إلكتروني',
    'لغات متعددة',
    'تقارير وإحصائيات',
    'إشعارات',
    'بحث وفلاتر',
    'تقييمات وتعليقات',
    'مش عارف — اقترح المناسب'
  ];

  function loadDraft(){
    try{
      draft=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')||{};
    }catch{draft={}}
  }

  function saveDraft(){
    const form=$('#nx48ProjectForm');
    if(!form)return;
    const fd=new FormData(form);
    const data={};
    for(const [key,value] of fd.entries()){
      if(key==='features'){
        data.features=data.features||[];
        data.features.push(value);
      }else{
        data[key]=value;
      }
    }
    draft=data;
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(data))}catch{}
    const status=$('[data-nx48-draft-status]');
    if(status)status.textContent='تم حفظ المسودة تلقائيًا';
  }

  function checked(name,value){
    const list=Array.isArray(draft[name])?draft[name]:[draft[name]];
    return list.includes(value)?' checked':'';
  }
  function value(name){
    return esc(draft[name]||'');
  }
  function selected(name,v){
    return draft[name]===v?' selected':'';
  }

  function choice(name,v,title,desc='',icon='',compact=false,radio=true){
    return `<label class="nx48-choice${compact?' compact':''}">
      <input type="${radio?'radio':'checkbox'}" name="${esc(name)}" value="${esc(v)}"${checked(name,v)}>
      <span>${icon?`<i>${icon}</i>`:''}<strong>${esc(title)}</strong>${desc?`<small>${esc(desc)}</small>`:''}</span>
    </label>`;
  }

  function panelOne(){
    return `<section class="nx48-panel active" data-nx48-step="1">
      <div class="nx48-panel-inner">
        <span class="nx48-eyebrow">01 / YOUR IDEA</span>
        <h2>احكي لنا: إيه المشروع اللي عايز تبنيه؟</h2>
        <p class="nx48-panel-lead">ابدأ بالتصنيف الأقرب، وبعدها ادينا وصف بسيط. مش مطلوب منك تعرف المصطلحات التقنية.</p>

        <div class="nx48-choice-grid">
          ${projectTypes.map(([v,d,i])=>choice('projectType',v,v,d,i,false,true)).join('')}
        </div>

        <div class="nx48-fields">
          <div class="nx48-field"><label>اسم المشروع — إن وجد</label><input name="projectName" value="${value('projectName')}" placeholder="مثال: Nova Store"></div>
          <div class="nx48-field"><label>هل المشروع جديد أم قائم؟</label>
            <select name="projectState">
              <option${selected('projectState','مشروع جديد')}>مشروع جديد</option>
              <option${selected('projectState','مشروع قائم يحتاج تطوير')}>مشروع قائم يحتاج تطوير</option>
              <option${selected('projectState','فكرة قيد الدراسة')}>فكرة قيد الدراسة</option>
            </select>
          </div>
          <div class="nx48-field wide"><label>صف الفكرة في سطرين</label><textarea name="idea" placeholder="مثال: أريد منصة لبيع ملفات وقوالب رقمية مع حساب عميل ولوحة إدارة...">${value('idea')}</textarea></div>
        </div>

        <div class="nx48-question">
          <strong>ما المشكلة التي تريد من المشروع حلها؟</strong>
          <p>السؤال ده بيساعدنا نفهم السبب الحقيقي للمشروع، مش مجرد شكله.</p>
          <div class="nx48-field"><textarea name="problem" placeholder="مثال: العملاء حاليًا يتواصلون يدويًا والطلبات تضيع بين الرسائل...">${value('problem')}</textarea></div>
        </div>
      </div>
    </section>`;
  }

  function panelTwo(){
    return `<section class="nx48-panel" data-nx48-step="2">
      <div class="nx48-panel-inner">
        <span class="nx48-eyebrow">02 / GOAL & AUDIENCE</span>
        <h2>المشروع ده لازم يحقق إيه؟ ولمين؟</h2>
        <p class="nx48-panel-lead">الهدف والجمهور بيحددوا شكل التجربة والصفحات وطريقة ترتيب المعلومات من البداية.</p>

        <div class="nx48-choice-grid two">
          ${goals.map(v=>choice('projectGoal',v,v,'','',true,true)).join('')}
        </div>

        <div class="nx48-fields">
          <div class="nx48-field"><label>الجمهور الأساسي</label>
            <select name="audience">
              <option${selected('audience','أفراد / عملاء')}>أفراد / عملاء</option>
              <option${selected('audience','شركات')}>شركات</option>
              <option${selected('audience','الاثنان')}>الاثنان</option>
              <option${selected('audience','فريق داخلي')}>فريق داخلي</option>
              <option${selected('audience','مجتمع / أعضاء')}>مجتمع / أعضاء</option>
            </select>
          </div>
          <div class="nx48-field"><label>السوق أو الدولة المستهدفة</label><input name="market" value="${value('market')}" placeholder="مثال: مصر / تركيا / الخليج / عالمي"></div>
          <div class="nx48-field"><label>لغة المشروع</label>
            <select name="language">
              <option${selected('language','العربية')}>العربية</option>
              <option${selected('language','الإنجليزية')}>الإنجليزية</option>
              <option${selected('language','العربية والإنجليزية')}>العربية والإنجليزية</option>
              <option${selected('language','أكثر من لغتين')}>أكثر من لغتين</option>
            </select>
          </div>
          <div class="nx48-field"><label>أهم إجراء تريد من الزائر عمله</label><input name="primaryAction" value="${value('primaryAction')}" placeholder="شراء / حجز / تسجيل / تواصل / طلب عرض سعر"></div>
        </div>

        <div class="nx48-question">
          <strong>ما أهم 3 أشياء يجب أن تنجح في النسخة الأولى؟</strong>
          <p>ركز على الأولويات، لأن ده بيساعدنا نحدد الـMVP بدل ما المشروع يبدأ محمّل بكل شيء.</p>
          <div class="nx48-field"><textarea name="topPriorities" placeholder="مثال: 1- الطلب والدفع  2- حساب العميل  3- لوحة الإدارة">${value('topPriorities')}</textarea></div>
        </div>
      </div>
    </section>`;
  }

  function panelThree(){
    return `<section class="nx48-panel" data-nx48-step="3">
      <div class="nx48-panel-inner">
        <span class="nx48-eyebrow">03 / LOOK & IDENTITY</span>
        <h2>إيه الإحساس اللي لازم المشروع يوصله؟</h2>
        <p class="nx48-panel-lead">مش لازم تختار ألوان أو خطوط. يكفينا نعرف اتجاه الهوية والانطباع المطلوب.</p>

        <div class="nx48-choice-grid two">
          ${styles.map(v=>choice('visualStyle',v,v,'','',true,true)).join('')}
        </div>

        <div class="nx48-fields">
          <div class="nx48-field"><label>هل لديك شعار وهوية؟</label>
            <select name="hasLogo">
              <option${selected('hasLogo','نعم، جاهزة')}>نعم، جاهزة</option>
              <option${selected('hasLogo','جزئيًا')}>جزئيًا</option>
              <option${selected('hasLogo','لا، أحتاج مساعدة')}>لا، أحتاج مساعدة</option>
            </select>
          </div>
          <div class="nx48-field"><label>هل عندك ألوان أو أسلوب ثابت؟</label>
            <select name="brandSystem">
              <option${selected('brandSystem','نعم')}>نعم</option>
              <option${selected('brandSystem','بعض العناصر فقط')}>بعض العناصر فقط</option>
              <option${selected('brandSystem','لا')}>لا</option>
            </select>
          </div>
          <div class="nx48-field wide"><label>رابط موقع أو تصميم يعجبك — اختياري</label><input name="referenceUrl" value="${value('referenceUrl')}" placeholder="https://..."></div>
          <div class="nx48-field wide"><label>ملاحظات على الشكل — اختياري</label><textarea name="designNote" placeholder="مثال: أحب المواقع الهادئة، مساحات كبيرة، ألوان داكنة...">${value('designNote')}</textarea></div>
        </div>
      </div>
    </section>`;
  }

  function panelFour(){
    return `<section class="nx48-panel" data-nx48-step="4">
      <div class="nx48-panel-inner">
        <span class="nx48-eyebrow">04 / FUNCTIONS</span>
        <h2>إيه اللي لازم المشروع يقدر يعمله؟</h2>
        <p class="nx48-panel-lead">اختار الوظائف اللي شايفها مهمة. ولو مش عارف، اختار «اقترح المناسب» ونرتبها معاك.</p>

        <div class="nx48-feature-grid">
          ${features.map(v=>`<label class="nx48-feature"><input type="checkbox" name="features" value="${esc(v)}"${checked('features',v)}><span>${esc(v)}</span></label>`).join('')}
        </div>

        <div class="nx48-fields">
          <div class="nx48-field"><label>هل تحتاج ربط خدمات خارجية؟</label><input name="integrations" value="${value('integrations')}" placeholder="مثال: WhatsApp / Google / بوابة دفع / API"></div>
          <div class="nx48-field"><label>هل هناك صلاحيات أو أدوار مختلفة؟</label><input name="roles" value="${value('roles')}" placeholder="مثال: عميل / بائع / مدير / موظف"></div>
          <div class="nx48-field wide"><label>وظيفة مهمة غير موجودة فوق</label><textarea name="customFeature" placeholder="اكتب أي وظيفة خاصة بالمشروع...">${value('customFeature')}</textarea></div>
        </div>
      </div>
    </section>`;
  }

  function panelFive(){
    return `<section class="nx48-panel" data-nx48-step="5">
      <div class="nx48-panel-inner">
        <span class="nx48-eyebrow">05 / READINESS</span>
        <h2>إيه الموجود عندك بالفعل؟</h2>
        <p class="nx48-panel-lead">ده يحدد هل نبدأ من الصفر، ولا نبني فوق حاجة موجودة مع الحفاظ على البيانات والوظائف الحالية.</p>

        <div class="nx48-fields">
          <div class="nx48-field"><label>هل لديك موقع حالي؟</label>
            <select name="hasWebsite">
              <option${selected('hasWebsite','لا')}>لا</option>
              <option${selected('hasWebsite','نعم، ويعمل')}>نعم، ويعمل</option>
              <option${selected('hasWebsite','نعم، ويحتاج تطوير')}>نعم، ويحتاج تطوير</option>
            </select>
          </div>
          <div class="nx48-field"><label>رابط الموقع الحالي — إن وجد</label><input name="currentUrl" value="${value('currentUrl')}" placeholder="https://..."></div>
          <div class="nx48-field"><label>الدومين</label>
            <select name="domainStatus">
              <option${selected('domainStatus','غير موجود')}>غير موجود</option>
              <option${selected('domainStatus','موجود')}>موجود</option>
              <option${selected('domainStatus','غير متأكد')}>غير متأكد</option>
            </select>
          </div>
          <div class="nx48-field"><label>الاستضافة</label>
            <select name="hostingStatus">
              <option${selected('hostingStatus','غير موجودة')}>غير موجودة</option>
              <option${selected('hostingStatus','موجودة')}>موجودة</option>
              <option${selected('hostingStatus','غير متأكد')}>غير متأكد</option>
            </select>
          </div>
          <div class="nx48-field"><label>المحتوى والصور</label>
            <select name="hasContent">
              <option${selected('hasContent','جاهزة')}>جاهزة</option>
              <option${selected('hasContent','جزئيًا')}>جزئيًا</option>
              <option${selected('hasContent','غير جاهزة')}>غير جاهزة</option>
            </select>
          </div>
          <div class="nx48-field"><label>هل توجد بيانات أو مستخدمون يجب الحفاظ عليهم؟</label>
            <select name="existingData">
              <option${selected('existingData','لا')}>لا</option>
              <option${selected('existingData','نعم')}>نعم</option>
              <option${selected('existingData','غير متأكد')}>غير متأكد</option>
            </select>
          </div>
          <div class="nx48-field wide"><label>ملاحظات عن الموجود حاليًا</label><textarea name="existingNote" placeholder="مثال: عندي موقع قديم وقاعدة عملاء، ومهم جدًا ما نفقدش البيانات...">${value('existingNote')}</textarea></div>
        </div>
      </div>
    </section>`;
  }

  function reviewRows(fd){
    const featuresList=fd.getAll('features').join('، ')||'يتم تحديدها بعد المناقشة';
    const rows=[
      ['نوع المشروع',fd.get('projectType')],
      ['اسم المشروع',fd.get('projectName')],
      ['حالة المشروع',fd.get('projectState')],
      ['الفكرة',fd.get('idea')],
      ['المشكلة',fd.get('problem')],
      ['الهدف',fd.get('projectGoal')],
      ['الجمهور',fd.get('audience')],
      ['السوق',fd.get('market')],
      ['أهم إجراء',fd.get('primaryAction')],
      ['أولويات النسخة الأولى',fd.get('topPriorities')],
      ['الأسلوب البصري',fd.get('visualStyle')],
      ['الشعار والهوية',fd.get('hasLogo')],
      ['الوظائف',featuresList],
      ['موقع حالي',fd.get('hasWebsite')],
      ['بيانات يجب الحفاظ عليها',fd.get('existingData')],
      ['موعد البدء',fd.get('timeline')],
      ['الأولوية',fd.get('priority')],
      ['الميزانية',fd.get('budget')]
    ];
    return rows.map(([k,v])=>`<div class="nx48-review-row"><span>${esc(k)}</span><strong>${esc(v||'—')}</strong></div>`).join('');
  }

  function panelSix(){
    return `<section class="nx48-panel" data-nx48-step="6">
      <div class="nx48-panel-inner">
        <span class="nx48-eyebrow">06 / REVIEW & CONTACT</span>
        <h2>راجع المشروع قبل الإرسال.</h2>
        <p class="nx48-panel-lead">آخر خطوة: بيانات التواصل والموعد، وبعدها راجع الملخص. تقدر ترجع لأي مرحلة وتعدّل قبل الإرسال.</p>

        <div class="nx48-fields">
          <div class="nx48-field"><label>موعد البدء</label>
            <select name="timeline">
              <option${selected('timeline','في أقرب وقت')}>في أقرب وقت</option>
              <option${selected('timeline','خلال شهر')}>خلال شهر</option>
              <option${selected('timeline','خلال 1–3 أشهر')}>خلال 1–3 أشهر</option>
              <option${selected('timeline','أستكشف الفكرة حاليًا')}>أستكشف الفكرة حاليًا</option>
            </select>
          </div>
          <div class="nx48-field"><label>أولوية التنفيذ</label>
            <select name="priority">
              <option${selected('priority','طبيعي')}>طبيعي</option>
              <option${selected('priority','عاجل')}>عاجل</option>
              <option${selected('priority','مرن')}>مرن</option>
            </select>
          </div>
          <div class="nx48-field"><label>الميزانية التقريبية — اختيارية</label>
            <select name="budget">
              <option value="">أفضل مناقشتها لاحقًا</option>
              <option${selected('budget','ميزانية محدودة / بداية بسيطة')}>ميزانية محدودة / بداية بسيطة</option>
              <option${selected('budget','متوسطة')}>متوسطة</option>
              <option${selected('budget','مرنة حسب الحل')}>مرنة حسب الحل</option>
            </select>
          </div>
          <div class="nx48-field"><label>الاسم</label><input name="clientName" value="${value('clientName')}" placeholder="اسمك"></div>
          <div class="nx48-field"><label>رقم الهاتف</label><input name="clientPhone" value="${value('clientPhone')}" placeholder="رقم الهاتف"></div>
          <div class="nx48-field"><label>البريد الإلكتروني — اختياري</label><input type="email" name="clientEmail" value="${value('clientEmail')}" placeholder="name@example.com"></div>
          <div class="nx48-field wide"><label>ملاحظة أخيرة — اختيارية</label><textarea name="finalNote" placeholder="أي تفاصيل إضافية تحب نقراها قبل التواصل...">${value('finalNote')}</textarea></div>
        </div>

        <div class="nx48-review-grid">
          <div class="nx48-review" data-nx48-review></div>
          <aside class="nx48-review-side">
            <h3>جاهز للإرسال؟</h3>
            <p>هنحوّل الإجابات إلى رسالة مرتبة ونفتحها في WhatsApp. لن يتم إرسال أي شيء تلقائيًا بدون موافقتك داخل واتساب.</p>
            <div class="nx48-review-note">المسودة محفوظة على جهازك تلقائيًا أثناء ملء النموذج.</div>
          </aside>
        </div>
      </div>
    </section>`;
  }

  function markup(){
    return `<main class="nx48-builder" aria-label="ابدأ مشروعك">
      <div class="nx48-grid" aria-hidden="true"></div>
      <section class="nx48-layout">
        <aside class="nx48-side">
          <div class="nx48-side-brand"><img src="assets/branding/logo-main.png" alt="NUVEXA HUB"><span>Project Builder</span></div>
          <span class="nx48-side-kicker">START YOUR PROJECT</span>
          <h1>خلّينا نفهم مشروعك في دقائق.</h1>
          <p>6 مراحل قصيرة تساعدنا نطلع Brief واضح قبل أي نقاش تقني أو تسعير.</p>

          <nav class="nx48-steps" aria-label="مراحل المشروع">
            ${stepNames.map(([title,desc],i)=>`<button type="button" class="nx48-step-link${i===0?' active':''}" data-nx48-jump="${i+1}"><b>${String(i+1).padStart(2,'0')}</b><span><strong>${title}</strong><small>${desc}</small></span></button>`).join('')}
          </nav>

          <div class="nx48-side-foot">
            <span>كل إجابة قابلة للتعديل قبل الإرسال.</span>
            <span class="nx48-draft-state" data-nx48-draft-status>المسودة تُحفظ تلقائيًا</span>
          </div>
        </aside>

        <section class="nx48-main">
          <div class="nx48-topline">
            <button type="button" class="nx48-back" data-nx48-close>← العودة إلى من نحن</button>
            <div class="nx48-progress-text"><strong data-nx48-count>01</strong> / 06 <span data-nx48-step-name>فكرتك</span></div>
          </div>
          <div class="nx48-progress-bar"><i data-nx48-progress></i></div>

          <form id="nx48ProjectForm">
            <div class="nx48-stage">
              ${panelOne()}
              ${panelTwo()}
              ${panelThree()}
              ${panelFour()}
              ${panelFive()}
              ${panelSix()}
              <div class="nx48-success" data-nx48-success>
                <div class="nx48-success-box">
                  <div class="nx48-success-mark">✓</div>
                  <h2>مشروعك جاهز.</h2>
                  <p>فتحنا لك رسالة WhatsApp مرتبة بكل تفاصيل الـBrief. تقدر تراجعها هناك قبل الإرسال.</p>
                </div>
              </div>
            </div>

            <footer class="nx48-nav">
              <div class="nx48-nav-right">
                <button type="button" data-nx48-prev class="hidden">السابق</button>
                <span class="nx48-nav-hint">تقدر ترجع لأي مرحلة وتعدّلها</span>
              </div>
              <div class="nx48-nav-left">
                <button type="button" class="primary" data-nx48-next>التالي</button>
                <button type="submit" class="send hidden" data-nx48-send>فتح الرسالة في واتساب</button>
              </div>
            </footer>
          </form>
        </section>
      </section>
    </main>`;
  }

  function syncHeaderHeight(){
    const page=$('#storePage');
    const header=page?.querySelector(':scope > .store-header');
    if(!page||!header)return;
    const h=Math.max(0,Math.round(header.getBoundingClientRect().height));
    if(h)page.style.setProperty('--nx48-header-h',`${h}px`);
  }

  function getForm(){return $('#nx48ProjectForm')}

  function validateStep(n){
    const form=getForm();
    if(!form)return false;

    if(n===1){
      if(!form.querySelector('[name=projectType]:checked'))return ['اختر نوع المشروع أولًا','projectType'];
      if(!String(form.elements.idea?.value||'').trim())return ['اكتب وصفًا مختصرًا للفكرة','idea'];
      if(!String(form.elements.problem?.value||'').trim())return ['اكتب المشكلة التي تريد حلها','problem'];
    }
    if(n===2){
      if(!form.querySelector('[name=projectGoal]:checked'))return ['اختر الهدف الأساسي للمشروع','projectGoal'];
      if(!String(form.elements.topPriorities?.value||'').trim())return ['اكتب أهم أولويات النسخة الأولى','topPriorities'];
    }
    if(n===3){
      if(!form.querySelector('[name=visualStyle]:checked'))return ['اختر الاتجاه البصري الأقرب لك','visualStyle'];
    }
    if(n===6){
      if(String(form.elements.clientName?.value||'').trim().length<2)return ['اكتب الاسم','clientName'];
      if(String(form.elements.clientPhone?.value||'').trim().replace(/\D/g,'').length<7)return ['اكتب رقم هاتف صحيح','clientPhone'];
    }
    return true;
  }

  function showError(result){
    if(result===true)return;
    const [message,name]=result;
    try{
      window.NuvexaRuntime?.core?.events?.emit?.('toast',{message,type:'error'});
    }catch{}
    // Fallback inline browser alert only if no app toast API is exposed.
    const field=getForm()?.elements?.[name];
    if(field?.focus)field.focus();
    const status=$('[data-nx48-draft-status]');
    if(status){
      status.textContent=message;
      status.style.color='var(--danger)';
      setTimeout(()=>{status.textContent='المسودة تُحفظ تلقائيًا';status.style.color=''},2200);
    }
  }

  function refreshReview(){
    const form=getForm();
    const review=$('[data-nx48-review]');
    if(!form||!review)return;
    review.innerHTML=reviewRows(new FormData(form));
  }

  function setStep(next){
    next=Math.max(1,Math.min(TOTAL,next));
    step=next;

    $$('.nx48-panel').forEach(panel=>{
      const n=Number(panel.dataset.nx48Step||0);
      panel.classList.toggle('active',n===step);
      panel.classList.toggle('before',n<step);
      panel.classList.toggle('after',n>step);
    });

    $$('.nx48-step-link').forEach((button,index)=>{
      const n=index+1;
      button.classList.toggle('active',n===step);
      button.classList.toggle('done',n<step);
    });

    const count=$('[data-nx48-count]');
    if(count)count.textContent=String(step).padStart(2,'0');
    const name=$('[data-nx48-step-name]');
    if(name)name.textContent=stepNames[step-1][0];

    const progress=$('[data-nx48-progress]');
    if(progress)progress.style.width=`${(step/TOTAL)*100}%`;

    $('[data-nx48-prev]')?.classList.toggle('hidden',step===1);
    $('[data-nx48-next]')?.classList.toggle('hidden',step===TOTAL);
    $('[data-nx48-send]')?.classList.toggle('hidden',step!==TOTAL);

    if(step===TOTAL)refreshReview();

    const active=$(`.nx48-panel[data-nx48-step="${step}"]`);
    if(active)active.scrollTop=0;
  }

  function message(fd){
    const f=fd.getAll('features').join('، ')||'يتم تحديدها بعد المناقشة';
    const lines=[
      'مرحبًا NUVEXA HUB، أريد بدء مشروع جديد.',
      '',
      '— فكرة المشروع —',
      `• نوع المشروع: ${fd.get('projectType')||'—'}`,
      `• اسم المشروع: ${fd.get('projectName')||'—'}`,
      `• حالة المشروع: ${fd.get('projectState')||'—'}`,
      `• الفكرة: ${fd.get('idea')||'—'}`,
      `• المشكلة المطلوب حلها: ${fd.get('problem')||'—'}`,
      '',
      '— الهدف والجمهور —',
      `• الهدف: ${fd.get('projectGoal')||'—'}`,
      `• الجمهور: ${fd.get('audience')||'—'}`,
      `• السوق: ${fd.get('market')||'—'}`,
      `• اللغة: ${fd.get('language')||'—'}`,
      `• أهم إجراء للزائر: ${fd.get('primaryAction')||'—'}`,
      `• أولويات النسخة الأولى: ${fd.get('topPriorities')||'—'}`,
      '',
      '— الشكل والهوية —',
      `• الاتجاه البصري: ${fd.get('visualStyle')||'—'}`,
      `• الشعار والهوية: ${fd.get('hasLogo')||'—'}`,
      `• نظام الهوية: ${fd.get('brandSystem')||'—'}`,
      `• مرجع بصري: ${fd.get('referenceUrl')||'—'}`,
      `• ملاحظات التصميم: ${fd.get('designNote')||'—'}`,
      '',
      '— الوظائف —',
      `• الوظائف المطلوبة: ${f}`,
      `• التكاملات: ${fd.get('integrations')||'—'}`,
      `• الأدوار والصلاحيات: ${fd.get('roles')||'—'}`,
      `• وظيفة خاصة: ${fd.get('customFeature')||'—'}`,
      '',
      '— الموجود حاليًا —',
      `• موقع حالي: ${fd.get('hasWebsite')||'—'}`,
      `• رابط حالي: ${fd.get('currentUrl')||'—'}`,
      `• الدومين: ${fd.get('domainStatus')||'—'}`,
      `• الاستضافة: ${fd.get('hostingStatus')||'—'}`,
      `• المحتوى والصور: ${fd.get('hasContent')||'—'}`,
      `• بيانات يجب الحفاظ عليها: ${fd.get('existingData')||'—'}`,
      `• ملاحظات الموجود: ${fd.get('existingNote')||'—'}`,
      '',
      '— التنفيذ والتواصل —',
      `• موعد البدء: ${fd.get('timeline')||'—'}`,
      `• الأولوية: ${fd.get('priority')||'—'}`,
      `• الميزانية: ${fd.get('budget')||'أفضل مناقشتها لاحقًا'}`,
      `• الاسم: ${fd.get('clientName')||'—'}`,
      `• الهاتف: ${fd.get('clientPhone')||'—'}`,
      `• البريد: ${fd.get('clientEmail')||'—'}`,
      `• ملاحظات: ${fd.get('finalNote')||'لا توجد'}`
    ];
    return lines.join('\n');
  }

  function openWhatsApp(){
    const form=getForm();
    if(!form)return;

    const result=validateStep(6);
    if(result!==true){showError(result);return}

    saveDraft();
    const state=window.NuvexaRuntime?.getState?.();
    const phone=String(state?.settings?.whatsappNumber||'').replace(/\D/g,'');
    const text=encodeURIComponent(message(new FormData(form)));

    if(phone){
      window.open(`https://wa.me/${phone}?text=${text}`,'_blank','noopener');
    }else{
      // Keep current behavior expectation: WhatsApp number must be configured.
      const status=$('[data-nx48-draft-status]');
      if(status){
        status.textContent='أضف رقم واتساب من إعدادات المتجر أولًا';
        status.style.color='var(--danger)';
      }
      return;
    }

    $('[data-nx48-success]')?.classList.add('show');
    $$('.nx48-panel').forEach(x=>x.classList.remove('active'));
    $('.nx48-nav')?.classList.add('hidden');
  }

  function openBuilder(){
    const page=$('#storePage');
    const content=$('#storeContent');
    if(!page||!content||page.classList.contains('hidden'))return;

    loadDraft();

    // Prefill account details when available and draft doesn't already contain them.
    const session=window.NuvexaRuntime?.getSession?.()?.customerSession;
    if(session){
      if(!draft.clientName&&session.name)draft.clientName=session.name;
      if(!draft.clientPhone&&session.phone)draft.clientPhone=session.phone;
      if(!draft.clientEmail&&session.email)draft.clientEmail=session.email;
    }

    document.body.classList.remove('nx47-about-open');
    document.body.classList.add('nx48-project-open');
    page.classList.remove('nv-store-v14-home');
    content.innerHTML=markup();
    builderOpen=true;
    step=1;
    syncHeaderHeight();
    setStep(1);
  }

  function closeBuilder(){
    if(!builderOpen)return;
    saveDraft();
    builderOpen=false;
    document.body.classList.remove('nx48-project-open');

    // Re-open the current About experience through its public API.
    if(window.NuvexaAboutSceneStory?.open){
      window.NuvexaAboutSceneStory.open();
    }else{
      document.querySelector('[data-action="store-about"]')?.click();
    }
  }

  function goHomeCleanup(){
    builderOpen=false;
    document.body.classList.remove('nx48-project-open');
  }

  function bind(){
    window.addEventListener('resize',()=>{if(builderOpen)syncHeaderHeight()},{passive:true});

    document.addEventListener('click',event=>{
      const open=event.target.closest('[data-nx48-project],[data-about-contact]');
      if(open){
        event.preventDefault();
        event.stopImmediatePropagation();
        openBuilder();
        return;
      }

      if(!builderOpen)return;

      const next=event.target.closest('[data-nx48-next]');
      if(next){
        event.preventDefault();
        const result=validateStep(step);
        if(result!==true){showError(result);return}
        saveDraft();
        setStep(step+1);
        return;
      }

      const prev=event.target.closest('[data-nx48-prev]');
      if(prev){
        event.preventDefault();
        saveDraft();
        setStep(step-1);
        return;
      }

      const jump=event.target.closest('[data-nx48-jump]');
      if(jump){
        event.preventDefault();
        const target=Number(jump.dataset.nx48Jump||1);
        // Allow revisiting completed/current steps; forward jumps only when prior steps pass.
        if(target>step){
          for(let n=step;n<target;n++){
            const result=validateStep(n);
            if(result!==true){showError(result);return}
          }
        }
        saveDraft();
        setStep(target);
        return;
      }

      if(event.target.closest('[data-nx48-close]')){
        event.preventDefault();
        closeBuilder();
        return;
      }

      if(event.target.closest('[data-action="store-home"],[data-action="store-cart"],[data-action="customer-account"],[data-action="admin-access"],[data-action="seller-access"]')){
        goHomeCleanup();
      }
    },true);

    document.addEventListener('input',event=>{
      if(!builderOpen||!event.target.closest('#nx48ProjectForm'))return;
      saveDraft();
      if(step===TOTAL)refreshReview();
    });

    document.addEventListener('change',event=>{
      if(!builderOpen||!event.target.closest('#nx48ProjectForm'))return;
      saveDraft();
      if(step===TOTAL)refreshReview();
    });

    document.addEventListener('submit',event=>{
      const form=event.target.closest('#nx48ProjectForm');
      if(!form)return;
      event.preventDefault();
      event.stopImmediatePropagation();
      openWhatsApp();
    },true);

    window.NuvexaProjectBuilder=Object.freeze({
      version:VERSION,
      open:openBuilder,
      close:closeBuilder
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});
  else bind();
})();
