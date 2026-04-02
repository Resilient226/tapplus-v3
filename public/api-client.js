// public/api-client.js
const API = (() => {
  const SESSION_KEY = 'tp_session';
  function getSession(){try{const r=sessionStorage.getItem(SESSION_KEY);return r?JSON.parse(r):null;}catch{return null;}}
  function setSession(d){sessionStorage.setItem(SESSION_KEY,JSON.stringify(d));}
  function clearSession(){sessionStorage.removeItem(SESSION_KEY);}
  function getToken(){return getSession()?.token||null;}

  async function request(method,path,body=null,requireAuth=true){
    const headers={'Content-Type':'application/json'};
    if(requireAuth){const t=getToken();if(t)headers['Authorization']=`Bearer ${t}`;}
    const opts={method,headers};
    if(body&&method!=='GET')opts.body=JSON.stringify(body);
    const res=await fetch(path,opts);
    const data=await res.json().catch(()=>({success:false,error:'Invalid response'}));
    if(!res.ok)throw new Error(data.error||`HTTP ${res.status}`);
    return data;
  }

  function get(path,params={},auth=true){const q=new URLSearchParams(params).toString();return request('GET',q?`${path}?${q}`:path,null,auth);}
  function post(path,body,auth=true){return request('POST',path,body,auth);}
  function put(path,body,auth=true){return request('PUT',path,body,auth);}
  function del(path,params={},auth=true){const q=new URLSearchParams(params).toString();return request('DELETE',q?`${path}?${q}`:path,null,auth);}

  const auth={
    async loginOwner(idToken){const d=await post('/api/login',{type:'owner',idToken},false);setSession(d);return d;},
    async loginStaff(bizId,passcode){const d=await post('/api/login',{type:'staff',bizId,passcode},false);setSession(d);return d;},
    async loginManager(bizId,pin){const d=await post('/api/login',{type:'manager',bizId,pin},false);setSession(d);return d;},
    async loginBizAdmin(bizId,pin){const d=await post('/api/login',{type:'bizAdmin',bizId,pin},false);setSession(d);return d;},
    async loginSuperAdmin(pin){const d=await post('/api/login',{type:'superAdmin',pin},false);setSession(d);return d;},
    logout(){clearSession();},
    getSession,getToken,
    isLoggedIn:()=>!!getToken(),
  };

  const business={
    getBySlug:(slug)=>get('/api/business',{slug}),
    getByCode:(code)=>get('/api/business',{code},false),
    getById:(id)=>get('/api/business',{id}),
    create:(data)=>post('/api/business',data),
    update:(id,data)=>put(`/api/business?id=${id}`,data),
    delete:(id)=>del('/api/business',{id}),
  };

  const staff={
    list:(bizId)=>get('/api/staff',{bizId}),
    get:(bizId,id)=>get('/api/staff',{bizId,id}),
    create:(bizId,data)=>post(`/api/staff?bizId=${bizId}`,data),
    update:(bizId,id,data)=>put(`/api/staff?bizId=${bizId}&id=${id}`,data),
    delete:(bizId,id)=>del('/api/staff',{bizId,id}),
  };

  const taps={
    log:(data)=>post('/api/tap',data,false),
    update:(id,data)=>put(`/api/tap?id=${id}`,data,false),
    list:(params)=>get('/api/tap',params),
  };

  const ai={ask:(prompt)=>post('/api/ai',{prompt})};
  const layout={get:()=>get('/api/layout',{},false),update:(data)=>put('/api/layout',data)};

  return{auth,business,staff,taps,ai,layout};
})();

if(typeof module!=='undefined')module.exports=API;
