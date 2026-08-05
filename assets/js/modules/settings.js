/* NUVEXA HUB V11.16 — Settings module */
(function(global){
  'use strict';
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  function general(ctx){
    const u=ctx.currentUser(),settings=ctx.state.settings||{};
    const profile=`<section class="profile-card-premium">
      <div class="profile-photo-wrap"><img src="${ctx.userAvatar(u)}" alt="الصورة الشخصية"><span class="profile-photo-badge">✎</span></div>
      <div><h3>حساب الإدارة</h3><p>يمكنك رفع صورة الحساب أو تغييرها وستظهر في الهيدر داخل لوحة التحكم.</p></div>
      <div class="profile-actions"><label class="btn btn-gold" for="profileImageInput">رفع أو تغيير الصورة</label><input id="profileImageInput" type="file" accept="image/*" hidden><button class="btn btn-soft" data-action="remove-profile-photo" ${ctx.state.profileImages?.[u.id]?'':'disabled'}>إزالة الصورة المخصصة</button></div>
    </section>`;
    return `${ctx.pageHead('الإعدادات العامة','إعداداتك الشخصية وإعدادات النظام الحساسة.',`<button class="btn btn-soft" data-modal="admin-password">تغيير كلمة مرور الإدارة</button>${ctx.isApprover()?'<button class="btn btn-gold" data-modal="settings">تعديل إعدادات النظام والمتجر</button>':''}`)}${ctx.whatsappSetupBanner()}${profile}<section class="panel"><div class="panel-body"><div class="form-grid"><div><span class="muted">اسم النشاط</span><strong style="display:block;margin-top:7px">${esc(settings.shopName)}</strong></div><div><span class="muted">الشعار النصي</span><strong style="display:block;margin-top:7px">${esc(settings.tagline)}</strong></div><div><span class="muted">حد المخزون المنخفض</span><strong style="display:block;margin-top:7px">${settings.lowStock??0}</strong></div><div><span class="muted">حد الخصم الذي يحتاج اعتماد</span><strong style="display:block;margin-top:7px">${settings.discountApproval??0}%</strong></div><div><span class="muted">متابعة العميل الافتراضية</span><strong style="display:block;margin-top:7px">${settings.followUpDays??0} يوم</strong></div><div><span class="muted">نسخة احتياطية يومية</span><strong style="display:block;margin-top:7px">${settings.dailyBackup?'مفعلة':'متوقفة'}</strong></div><div><span class="muted">واجهة المتجر</span><strong style="display:block;margin-top:7px">${settings.storeEnabled?'مفعلة':'متوقفة'}</strong></div><div><span class="muted">رقم واتساب</span><strong style="display:block;margin-top:7px">${esc(settings.whatsappNumber||'لم يُضف بعد')}</strong></div></div></div></section>`;
  }

  function backups(ctx){
    const rows=ctx.state.backups||[];
    return `${ctx.pageHead('النسخ الاحتياطية','نسخ يومية محلية وتصدير واستعادة يدوي.',`<button class="btn btn-gold" data-action="export-backup">تنزيل نسخة JSON</button><label class="btn btn-soft">استعادة نسخة<input id="importBackup" type="file" accept="application/json" hidden></label>${ctx.isApprover()?'<button class="btn btn-danger" data-action="reset-data">مسح كل البيانات</button>':''}`)}<section class="panel"><div class="panel-body">${rows.length?`<div class="table-wrap"><table class="table"><thead><tr><th>التاريخ</th><th>النوع</th></tr></thead><tbody>${rows.map(b=>`<tr><td>${new Date(b.date).toLocaleString('ar-EG')}</td><td>${esc(b.type)}</td></tr>`).join('')}</tbody></table></div>`:ctx.empty('assets/empty-states/empty-notifications.webp','لا توجد نسخ محلية بعد','تُنشأ النسخة اليومية عند فتح النظام في يوم جديد.')}</div></section>`;
  }

  function audit(ctx){
    const rows=ctx.state.audit||[];
    return `${ctx.pageHead('السجل الأمني','الدخول والخروج والتغييرات الحساسة.')}<section class="panel"><div class="panel-body">${rows.length?`<div class="table-wrap"><table class="table"><thead><tr><th>التاريخ</th><th>المستخدم</th><th>الإجراء</th><th>التفاصيل</th></tr></thead><tbody>${rows.map(a=>`<tr><td>${new Date(a.date).toLocaleString('ar-EG')}</td><td>${esc(a.user)}</td><td>${esc(a.action)}</td><td>${esc(a.details||'')}</td></tr>`).join('')}</tbody></table></div>`:ctx.empty('assets/empty-states/empty-notifications.webp','السجل فارغ','')}</div></section>`;
  }

  function render(ctx){
    const tab=ctx.activeTab();
    if(tab==='المستخدمون والصلاحيات')return ctx.renderPlatformUsersSettings();
    if(tab==='النسخ الاحتياطية')return backups(ctx);
    if(tab==='السجل الأمني')return audit(ctx);
    return general(ctx);
  }
  function bind(){/* Existing forms and actions remain in app.js during safe migration. */}
  global.NuvexaSettings={version:'11.16',render,bind};
})(window);
