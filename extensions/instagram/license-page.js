'use strict';
const status=document.querySelector('#status');
document.querySelector('#account').href=AuroraLicenseConfig.origin+'/#account';
async function send(action,extra={}){
  status.textContent='Checking…';
  try {const r=await chrome.runtime.sendMessage({action,...extra});if(!r?.ok)throw Error(r?.error||'Could not check license.');
    status.textContent=action==='clearLicense'?'License removed. New actions are blocked.':`${r.status} · Access until ${new Date(r.expires*1000).toLocaleString()}`;
    document.querySelector('#key').value='';
  }catch(e){status.textContent=e.message;}
}
document.querySelector('form').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;try{await send('activateLicense',{key:document.querySelector('#key').value});}finally{b.disabled=false;}};
document.querySelector('#check').onclick=()=>send('licenseStatus');
document.querySelector('#clear').onclick=()=>send('clearLicense');
