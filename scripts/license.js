/* Shared license client. Only extension pages can save or clear a key. */
globalThis.AuroraLicense = (()=>{
  let cached=null, checked=0;
  async function ensure() {
    const {auroraLicenseKey:key}=await chrome.storage.local.get('auroraLicenseKey');
    if(!key)throw Error('Activate your Aurora subscription in License & activation before starting a task.');
    if(cached && cached.key===key && Date.now()-checked<60000 && cached.expires*1000>Date.now())return cached;
    const c=globalThis.AuroraLicenseConfig;
    let response;
    try { response=await fetch(c.origin+'/api/license/validate',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({key,product:c.product}),signal:AbortSignal.timeout(10000)}); }
    catch {cached=null;throw Error('License server unavailable. Reconnect and try again; your task has been paused.');}
    const data=await response.json();
    if(!response.ok||data.valid!==true||data.product!==c.product||data.expires*1000<=Date.now()){
      cached=null;throw Error(typeof data.detail==='string'?data.detail:'Your trial or subscription is not active. Open License & activation.');
    }
    cached={key,expires:data.expires,status:data.status};checked=Date.now();return cached;
  }
  async function activate(key){
    if(typeof key!=='string'||!/^AUR-[A-Za-z0-9_-]{40,60}$/.test(key.trim()))throw Error('Enter the license key from your Aurora account.');
    // Validate before replacing an existing key, and never return the stored key to content scripts.
    const old=(await chrome.storage.local.get('auroraLicenseKey')).auroraLicenseKey;
    cached=null;await chrome.storage.local.set({auroraLicenseKey:key.trim()});
    try{const result=await ensure();return{ok:true,expires:result.expires,status:result.status};}
    catch(e){await chrome.storage.local.set({auroraLicenseKey:old||''});cached=null;throw e;}
  }
  async function clear(){cached=null;await chrome.storage.local.set({auroraLicenseKey:''});return{ok:true};}
  return {ensure,activate,clear};
})();
