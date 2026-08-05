/* NUVEXA HUB V11.11 — Authentication and live roles */
(()=>{'use strict';
  const OWNER_EMAIL='amerihgg@gmail.com';
  let client=null;
  let cfg={};
  let access={email:'',role:'customer',roles:[],active:false,display_name:'',permissions:{}};
  const normalizeEmail=value=>String(value||'').trim().toLowerCase();
  const emptyAccess=()=>({email:'',role:'customer',roles:[],active:false,display_name:'',permissions:{}});
  function configure(options={}){
    cfg={...cfg,...options};
    if(client)return client;
    if(!window.supabase?.createClient) return null;
    client=window.supabase.createClient(cfg.url,cfg.key,{auth:{
      persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,flowType:'pkce',
      storageKey:cfg.storageKey||'nuvexa-hub-supabase-auth-v11'
    }});
    return client;
  }
  function getClient(){return client}
  function resetAccess(){access=emptyAccess();return access}
  function getAccess(){return {...access,roles:[...(access.roles||[])]}}
  function hasRole(role){return !!access.active&&Array.isArray(access.roles)&&access.roles.includes(role)}
  function isOwner(){return !!access.active&&normalizeEmail(access.email)===OWNER_EMAIL}
  function canAdmin(){return !!access.active&&(isOwner()||hasRole('partner'))}
  function canSell(){return !!access.active&&(isOwner()||hasRole('seller'))}
  async function loadAccess({userId,email,name}={}){
    email=normalizeEmail(email);
    if(!client||!userId||!email){return resetAccess()}
    try{
      const [{data:profile,error:profileError},{data:roleRows,error:rolesError}]=await Promise.all([
        client.from('profiles').select('id,email,full_name,status').eq('id',userId).maybeSingle(),
        client.from('user_roles').select('role_key,is_active').eq('user_id',userId).eq('is_active',true)
      ]);
      if(profileError)throw profileError;if(rolesError)throw rolesError;
      const roles=new Set((roleRows||[]).map(row=>row.role_key));
      const owner=email===OWNER_EMAIL;
      const resolvedRoles=owner?['buyer','seller','partner']:[...roles];
      access={
        email,role:owner?'owner':roles.has('partner')?'admin':roles.has('seller')?'seller':'customer',
        roles:resolvedRoles,active:owner||profile?.status==='active',
        display_name:profile?.full_name||name||'',permissions:{all:owner||roles.has('partner'),roles:resolvedRoles}
      };
      cfg.onAccess?.(getAccess(),null);
      return getAccess();
    }catch(error){
      access=email===OWNER_EMAIL
        ?{email,role:'owner',roles:['buyer','seller','partner'],active:true,display_name:name||'صاحب المنصة',permissions:{all:true,roles:['buyer','seller','partner']}}
        :{email,role:'customer',roles:['buyer'],active:true,display_name:name||'',permissions:{all:false,roles:['buyer']}};
      cfg.onAccess?.(getAccess(),error);
      return getAccess();
    }
  }
  async function signIn(provider,{redirectTo,intent}={}){
    if(!client)throw new Error('تعذر تحميل خدمة تسجيل الدخول');
    if(intent&&cfg.setIntent)cfg.setIntent(intent);
    const {error}=await client.auth.signInWithOAuth({provider,options:{redirectTo:redirectTo||cfg.redirectTo||location.href}});
    if(error)throw error;
  }
  async function signOut(){if(client)await client.auth.signOut({scope:'local'});resetAccess();cfg.onSignedOut?.()}
  async function initialize(){
    if(!client)return;
    let resumed=false;
    const apply=async(session,shouldResume=false)=>{
      if(!session)return;
      await cfg.onSession?.(session);
      const user=session.user,meta=user?.user_metadata||{};
      await loadAccess({userId:user?.id,email:user?.email,name:meta.full_name||meta.name||user?.email?.split('@')[0]||''});
      if(shouldResume&&!resumed){resumed=true;cfg.onResume?.()}
    };
    client.auth.onAuthStateChange((event,session)=>{
      if(session&&['SIGNED_IN','TOKEN_REFRESHED','INITIAL_SESSION'].includes(event))setTimeout(()=>apply(session,event==='SIGNED_IN'),0);
      if(event==='SIGNED_OUT'){resetAccess();cfg.onSignedOut?.()}
    });
    try{
      const url=new URL(location.href),code=url.searchParams.get('code');
      const oauthError=url.searchParams.get('error_description')||url.searchParams.get('error');
      if(oauthError)throw new Error(oauthError);
      if(code){
        const {data,error}=await client.auth.exchangeCodeForSession(code);if(error)throw error;
        ['code','error','error_code','error_description'].forEach(k=>url.searchParams.delete(k));
        history.replaceState({},document.title,url.pathname+(url.search||'')+(url.hash||''));
        await apply(data?.session,true);
      }else{
        const {data,error}=await client.auth.getSession();if(error)throw error;
        if(data?.session)await apply(data.session,true);else cfg.onNoSession?.();
      }
    }catch(error){resetAccess();cfg.onError?.(error)}
  }
  window.NuvexaAuth={version:'11.11',OWNER_EMAIL,configure,getClient,initialize,signIn,signOut,loadAccess,getAccess,resetAccess,hasRole,isOwner,canAdmin,canSell,normalizeEmail};
})();
