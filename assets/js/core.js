(()=>{
  'use strict';

  const listeners=new Map();
  const safe=(fn,fallback=null)=>{try{return fn()}catch{return fallback}};

  const events={
    on(name,handler){
      if(typeof handler!=='function')return()=>{};
      const set=listeners.get(name)||new Set();
      set.add(handler);listeners.set(name,set);
      return()=>events.off(name,handler);
    },
    once(name,handler){
      const stop=events.on(name,(payload)=>{stop();handler(payload)});
      return stop;
    },
    off(name,handler){
      const set=listeners.get(name);if(!set)return;
      set.delete(handler);if(!set.size)listeners.delete(name);
    },
    emit(name,payload){
      const set=listeners.get(name);if(!set)return;
      [...set].forEach(handler=>{try{handler(payload)}catch(error){console.error(`[NUVEXA event:${name}]`,error)}});
    }
  };

  const storage={
    get(key,fallback=null){return safe(()=>localStorage.getItem(key),fallback)},
    set(key,value){return safe(()=>{localStorage.setItem(key,value);return true},false)},
    remove(key){return safe(()=>{localStorage.removeItem(key);return true},false)},
    getJSON(key,fallback=null){
      const raw=storage.get(key);if(raw==null)return fallback;
      return safe(()=>JSON.parse(raw),fallback);
    },
    setJSON(key,value){return storage.set(key,JSON.stringify(value))},
    session:{
      get(key,fallback=null){return safe(()=>sessionStorage.getItem(key),fallback)},
      set(key,value){return safe(()=>{sessionStorage.setItem(key,value);return true},false)},
      remove(key){return safe(()=>{sessionStorage.removeItem(key);return true},false)}
    }
  };

  const utils={
    $:selector=>document.querySelector(selector),
    $$:selector=>[...document.querySelectorAll(selector)],
    escapeHTML:value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char])),
    number:value=>Number(value)||0,
    now:()=>new Date().toISOString(),
    today:()=>new Date().toISOString().slice(0,10),
    money(value,currency='₺'){
      const amount=Number(value)||0;
      return `${new Intl.NumberFormat('ar-EG',{minimumFractionDigits:0,maximumFractionDigits:2}).format(amount)} ${currency}`;
    },
    formatDate:value=>value?new Date(value).toLocaleDateString('ar-EG'):'—',
    uid(prefix='ID'){return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`},
    debounce(fn,delay=250){let timer;return(...args)=>{clearTimeout(timer);timer=setTimeout(()=>fn(...args),delay)}},
    clamp(value,min,max){return Math.min(max,Math.max(min,value))},
    sleep:ms=>new Promise(resolve=>setTimeout(resolve,ms))
  };

  function createStore(initialState={}){
    let state=initialState;
    const subscribers=new Set();
    return{
      get:()=>state,
      set(next,meta={}){
        state=typeof next==='function'?next(state):next;
        subscribers.forEach(handler=>{try{handler(state,meta)}catch(error){console.error('[NUVEXA store]',error)}});
        events.emit('state:changed',{state,meta});
        return state;
      },
      patch(partial,meta={}){return this.set(current=>Object.assign({},current,partial),meta)},
      subscribe(handler){subscribers.add(handler);return()=>subscribers.delete(handler)}
    };
  }

  function createApi(client){
    const ensure=()=>{if(!client)throw new Error('Supabase client is not configured');return client};
    return{
      client:()=>client,
      async select(table,columns='*',configure=query=>query){
        let query=ensure().from(table).select(columns);query=configure(query)||query;
        const {data,error}=await query;if(error)throw error;return data||[];
      },
      async insert(table,payload,columns='*'){
        const {data,error}=await ensure().from(table).insert(payload).select(columns);if(error)throw error;return data||[];
      },
      async update(table,payload,configure=query=>query,columns='*'){
        let query=ensure().from(table).update(payload);query=configure(query)||query;
        const {data,error}=await query.select(columns);if(error)throw error;return data||[];
      },
      async remove(table,configure=query=>query){
        let query=ensure().from(table).delete();query=configure(query)||query;
        const {error}=await query;if(error)throw error;return true;
      }
    };
  }

  const logger={
    info:(...args)=>console.info('[NUVEXA]',...args),
    warn:(...args)=>console.warn('[NUVEXA]',...args),
    error:(...args)=>console.error('[NUVEXA]',...args)
  };

  window.NuvexaCore=Object.freeze({version:'12.0.0',events,storage,utils,createStore,createApi,logger,safe});
  events.emit('core:ready',{version:'12.0.0'});
})();
