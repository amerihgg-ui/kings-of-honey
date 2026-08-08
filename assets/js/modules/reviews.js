/* NUVEXA HUB V13.0 — Product Reviews & Ratings
   Isolated add-on: public reviews, verified-purchase rating, buyer edit, admin delete.
*/
(()=>{'use strict';

  const MODULE_VERSION='13.0';
  const ROOT_ID='storeProductDialogContent';
  const SECTION_CLASS='nv-product-reviews';
  const esc=value=>String(value??'').replace(/[&<>'"]/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  }[char]));

  const clampRating=value=>Math.max(1,Math.min(5,Number(value)||1));
  const formatDate=value=>{
    try{return new Date(value).toLocaleDateString('ar-EG',{year:'numeric',month:'short',day:'numeric'})}
    catch{return ''}
  };
  const starsText=rating=>{
    const n=Math.round(Number(rating)||0);
    return '★'.repeat(n)+'☆'.repeat(Math.max(0,5-n));
  };

  function client(){
    return window.NuvexaAuth?.getClient?.()||null;
  }

  async function currentViewer(){
    const sb=client();
    if(!sb)return null;
    try{
      const {data}=await sb.auth.getSession();
      return data?.session?.user||null;
    }catch{return null}
  }

  function canAdmin(){
    try{return !!window.NuvexaAuth?.canAdmin?.()}catch{return false}
  }

  function injectStyles(){
    if(document.getElementById('nuvexaReviewsStyles'))return;
    const style=document.createElement('style');
    style.id='nuvexaReviewsStyles';
    style.textContent=`
      .nv-product-reviews{margin-top:22px;border-top:1px solid var(--line,rgba(0,0,0,.1));padding-top:22px}
      .nv-reviews-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:16px}
      .nv-reviews-head h3{margin:0;font-size:1.18rem}
      .nv-reviews-head p{margin:6px 0 0;color:var(--muted,#786d61);font-size:.92rem}
      .nv-rating-summary{display:flex;align-items:center;gap:12px;min-width:180px;justify-content:flex-end}
      .nv-rating-score{font-size:2rem;font-weight:950;line-height:1}
      .nv-rating-stars,.nv-review-stars-static{color:#e5a12c;letter-spacing:2px;white-space:nowrap}
      .nv-rating-count{display:block;color:var(--muted,#786d61);font-size:.82rem;margin-top:4px}
      .nv-review-form-wrap{border:1px solid var(--line,rgba(0,0,0,.1));background:var(--panel2,#fffaf2);border-radius:16px;padding:15px;margin:14px 0 18px}
      .nv-review-form-wrap h4{margin:0 0 5px}
      .nv-review-form-wrap p{margin:0 0 12px;color:var(--muted,#786d61);font-size:.9rem}
      .nv-review-stars-input{display:flex;direction:ltr;justify-content:flex-end;gap:4px;margin:8px 0 12px}
      .nv-review-star-btn{appearance:none;border:0;background:transparent;color:#b6aa9d;font-size:2rem;line-height:1;cursor:pointer;padding:2px 3px;transition:transform .15s ease,color .15s ease}
      .nv-review-star-btn:hover{transform:scale(1.08)}
      .nv-review-star-btn.active{color:#e5a12c}
      .nv-review-textarea{width:100%;min-height:92px;resize:vertical;border:1px solid var(--line,rgba(0,0,0,.12));border-radius:12px;background:var(--panel,#fff);color:var(--text,#2d1a0d);padding:11px 12px;font:inherit;box-sizing:border-box}
      .nv-review-form-actions{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px}
      .nv-review-submit{border:0;border-radius:11px;padding:10px 16px;font:inherit;font-weight:900;cursor:pointer;background:var(--gold,#e5a12c);color:#17110a}
      .nv-review-submit:disabled{opacity:.55;cursor:not-allowed}
      .nv-review-note{border:1px dashed var(--line,rgba(0,0,0,.15));border-radius:13px;padding:12px 14px;color:var(--muted,#786d61);background:var(--panel2,#fffaf2);margin:14px 0}
      .nv-review-list{display:grid;gap:11px}
      .nv-review-card{border:1px solid var(--line,rgba(0,0,0,.1));border-radius:15px;padding:14px;background:var(--panel,#fff)}
      .nv-review-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
      .nv-review-person{display:flex;align-items:center;gap:10px}
      .nv-review-avatar{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:var(--panel3,#f5e8d2);font-weight:950}
      .nv-review-person strong{display:block}
      .nv-review-meta{display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin-top:3px}
      .nv-verified-badge{display:inline-flex;align-items:center;gap:4px;border-radius:999px;padding:3px 7px;font-size:.75rem;font-weight:850;background:rgba(56,185,121,.12);color:#259060}
      .nv-review-date{font-size:.78rem;color:var(--muted,#786d61)}
      .nv-review-comment{margin:10px 0 0;white-space:pre-wrap;line-height:1.75}
      .nv-review-admin-delete{border:1px solid rgba(239,101,114,.3);background:rgba(239,101,114,.08);color:#d84f5d;border-radius:9px;padding:6px 9px;cursor:pointer;font:inherit;font-size:.8rem;font-weight:850}
      .nv-review-empty{text-align:center;padding:22px 10px;color:var(--muted,#786d61);border:1px dashed var(--line,rgba(0,0,0,.13));border-radius:13px}
      .nv-review-status{font-size:.82rem;color:var(--muted,#786d61)}
      .nv-review-status.error{color:#d84f5d}
      .nv-review-loading{padding:18px;text-align:center;color:var(--muted,#786d61)}
      @media(max-width:640px){
        .nv-reviews-head{display:block}
        .nv-rating-summary{justify-content:flex-start;margin-top:12px}
        .nv-review-form-actions{align-items:stretch;flex-direction:column}
        .nv-review-submit{width:100%}
      }
    `;
    document.head.appendChild(style);
  }

  function loadingMarkup(){
    return `<div class="nv-review-loading">جاري تحميل التعليقات والتقييمات…</div>`;
  }

  function reviewFormMarkup(productId, ownReview){
    const rating=ownReview?clampRating(ownReview.rating):5;
    const comment=ownReview?.comment||'';
    return `
      <div class="nv-review-form-wrap">
        <h4>${ownReview?'عدّل تقييمك':'قيّم هذا المنتج'}</h4>
        <p>التقييم متاح فقط بعد استلام طلب يحتوي على هذا المنتج.</p>
        <form data-review-form data-product-id="${esc(productId)}" data-rating="${rating}">
          <div class="nv-review-stars-input" aria-label="اختر تقييمًا من خمس نجوم">
            ${[1,2,3,4,5].map(n=>`<button type="button" class="nv-review-star-btn ${n<=rating?'active':''}" data-review-rating="${n}" aria-label="${n} من 5" aria-pressed="${n===rating?'true':'false'}">★</button>`).join('')}
          </div>
          <textarea class="nv-review-textarea" name="comment" maxlength="1000" placeholder="اكتب رأيك في المنتج…">${esc(comment)}</textarea>
          <div class="nv-review-form-actions">
            <span class="nv-review-status" data-review-status>${ownReview?'يمكنك تعديل تقييمك في أي وقت.':'سيظهر تقييمك للزوار بعد النشر.'}</span>
            <button class="nv-review-submit" type="submit">${ownReview?'حفظ التعديل':'نشر التقييم'}</button>
          </div>
        </form>
      </div>`;
  }

  function accessMarkup(viewer, canReview, ownReview){
    if(canReview)return reviewFormMarkup(activeProductId,ownReview);
    if(!viewer){
      return `<div class="nv-review-note">يمكن لأي شخص قراءة التعليقات. لإضافة تقييم، سجّل الدخول بحساب Google واشترِ المنتج أولًا.</div>`;
    }
    return `<div class="nv-review-note">يمكنك إضافة تقييم بعد أن يصبح طلب هذا المنتج بحالة <strong>تم التسليم</strong>.</div>`;
  }

  let activeProductId='';

  function fullMarkup(productId,reviews,viewer,canReview){
    activeProductId=productId;
    const total=reviews.length;
    const average=total?reviews.reduce((sum,row)=>sum+Number(row.rating||0),0)/total:0;
    const ownReview=reviews.find(row=>row.is_mine)||null;
    const admin=canAdmin();

    return `
      <div class="nv-reviews-head">
        <div>
          <h3>التعليقات والتقييمات</h3>
          <p>آراء العملاء الذين اشتروا المنتج بالفعل.</p>
        </div>
        <div class="nv-rating-summary">
          <div class="nv-rating-score">${total?average.toFixed(1):'—'}</div>
          <div>
            <div class="nv-rating-stars">${total?starsText(average):'☆☆☆☆☆'}</div>
            <span class="nv-rating-count">${total?`${total} ${total===1?'تقييم':'تقييمات'}`:'لا توجد تقييمات بعد'}</span>
          </div>
        </div>
      </div>
      ${accessMarkup(viewer,canReview,ownReview)}
      <div class="nv-review-list">
        ${total?reviews.map(row=>`
          <article class="nv-review-card">
            <div class="nv-review-card-head">
              <div class="nv-review-person">
                <div class="nv-review-avatar">${esc((row.buyer_name||'ع').trim().charAt(0)||'ع')}</div>
                <div>
                  <strong>${esc(row.buyer_name||'عميل')}</strong>
                  <div class="nv-review-meta">
                    <span class="nv-review-stars-static">${starsText(row.rating)}</span>
                    ${row.verified?'<span class="nv-verified-badge">✓ مشتري موثّق</span>':''}
                    <span class="nv-review-date">${esc(formatDate(row.created_at))}</span>
                  </div>
                </div>
              </div>
              ${admin?`<button type="button" class="nv-review-admin-delete" data-review-delete="${esc(row.review_id)}" data-product-id="${esc(productId)}">حذف</button>`:''}
            </div>
            ${String(row.comment||'').trim()?`<p class="nv-review-comment">${esc(row.comment)}</p>`:''}
          </article>`).join(''):`<div class="nv-review-empty">كن أول من يشارك تجربته بعد استلام المنتج.</div>`}
      </div>`;
  }

  async function fetchReviews(productId){
    const sb=client();
    if(!sb)throw new Error('تعذر الاتصال بخدمة التقييمات');
    const {data,error}=await sb.rpc('get_public_product_reviews',{p_product_id:productId});
    if(error)throw error;
    return Array.isArray(data)?data:[];
  }

  async function fetchEligibility(productId,viewer){
    if(!viewer)return false;
    const sb=client();
    if(!sb)return false;
    const {data,error}=await sb.rpc('can_review_product',{p_product_id:productId});
    if(error)throw error;
    return !!data;
  }

  async function refreshSection(productId,section){
    if(!section||section.dataset.productId!==productId)return;
    section.innerHTML=loadingMarkup();
    try{
      const viewer=await currentViewer();
      const [reviews,eligible]=await Promise.all([
        fetchReviews(productId),
        fetchEligibility(productId,viewer)
      ]);
      if(section.dataset.productId!==productId)return;
      section.innerHTML=fullMarkup(productId,reviews,viewer,eligible);
    }catch(error){
      console.warn('NUVEXA reviews:',error?.message||error);
      section.innerHTML=`
        <div class="nv-reviews-head"><div><h3>التعليقات والتقييمات</h3><p>آراء العملاء تظهر هنا.</p></div></div>
        <div class="nv-review-note">التعليقات غير متاحة مؤقتًا.</div>`;
    }
  }

  function mountReviews(root){
    if(!root)return;
    const productButton=root.querySelector('[data-store-add]');
    const productId=productButton?.dataset?.storeAdd;
    if(!productId)return;

    let section=root.querySelector(`.${SECTION_CLASS}`);
    if(section?.dataset.productId===productId)return;
    if(section)section.remove();

    section=document.createElement('section');
    section.className=SECTION_CLASS;
    section.dataset.productId=productId;
    section.innerHTML=loadingMarkup();

    const body=root.querySelector('.play-detail-body')||root;
    body.appendChild(section);
    refreshSection(productId,section);
  }

  function paintStars(form,rating){
    rating=clampRating(rating);
    form.dataset.rating=String(rating);
    form.querySelectorAll('[data-review-rating]').forEach(button=>{
      const value=Number(button.dataset.reviewRating);
      button.classList.toggle('active',value<=rating);
      button.setAttribute('aria-pressed',value===rating?'true':'false');
    });
  }

  async function submitReview(form){
    const sb=client();
    if(!sb)return;
    const productId=form.dataset.productId;
    const rating=clampRating(form.dataset.rating||5);
    const comment=String(form.elements.comment?.value||'').trim();
    const status=form.querySelector('[data-review-status]');
    const button=form.querySelector('.nv-review-submit');

    if(comment.length>1000){
      if(status){status.textContent='التعليق أطول من الحد المسموح.';status.classList.add('error')}
      return;
    }

    if(button)button.disabled=true;
    if(status){status.textContent='جاري حفظ التقييم…';status.classList.remove('error')}

    try{
      const {error}=await sb.rpc('upsert_product_review',{
        p_product_id:productId,
        p_rating:rating,
        p_comment:comment
      });
      if(error)throw error;
      const section=document.querySelector(`.${SECTION_CLASS}[data-product-id="${CSS.escape(productId)}"]`);
      if(section)await refreshSection(productId,section);
    }catch(error){
      console.warn('NUVEXA review submit:',error?.message||error);
      if(status){
        const message=String(error?.message||'');
        status.textContent=/completed|purchase/i.test(message)
          ?'التقييم متاح فقط بعد استلام المنتج.'
          :'تعذر حفظ التقييم الآن. حاول مرة أخرى.';
        status.classList.add('error');
      }
      if(button)button.disabled=false;
    }
  }

  async function deleteReview(reviewId,productId,button){
    if(!reviewId||!productId)return;
    if(!window.confirm('حذف هذا التعليق والتقييم؟'))return;
    const sb=client();
    if(!sb)return;
    button.disabled=true;
    try{
      const {error}=await sb.rpc('delete_product_review',{p_review_id:reviewId});
      if(error)throw error;
      const section=document.querySelector(`.${SECTION_CLASS}[data-product-id="${CSS.escape(productId)}"]`);
      if(section)await refreshSection(productId,section);
    }catch(error){
      console.warn('NUVEXA review delete:',error?.message||error);
      button.disabled=false;
      window.alert('تعذر حذف التعليق.');
    }
  }

  function boot(){
    injectStyles();
    const root=document.getElementById(ROOT_ID);
    if(!root)return;

    const observer=new MutationObserver(()=>mountReviews(root));
    observer.observe(root,{childList:true,subtree:false});
    mountReviews(root);

    document.addEventListener('click',event=>{
      const star=event.target.closest('[data-review-rating]');
      if(star){
        const form=star.closest('[data-review-form]');
        if(form)paintStars(form,star.dataset.reviewRating);
        return;
      }

      const del=event.target.closest('[data-review-delete]');
      if(del){
        event.preventDefault();
        deleteReview(del.dataset.reviewDelete,del.dataset.productId,del);
      }
    },true);

    document.addEventListener('submit',event=>{
      const form=event.target.closest('[data-review-form]');
      if(!form)return;
      event.preventDefault();
      event.stopPropagation();
      submitReview(form);
    },true);

    window.NuvexaReviews={
      version:MODULE_VERSION,
      refresh(productId){
        const section=document.querySelector(`.${SECTION_CLASS}[data-product-id="${CSS.escape(String(productId))}"]`);
        if(section)return refreshSection(String(productId),section);
      }
    };
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
