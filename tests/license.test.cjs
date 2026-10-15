const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
function client(product){
 const data={},calls=[];let result={valid:true,product,status:'trialing',expires:Date.now()/1000+100};let fail=false;
 const context=vm.createContext({Date,Error,AbortSignal,chrome:{storage:{local:{get:async()=>({...data}),set:async v=>Object.assign(data,v)}}},
   fetch:async(url,options)=>{calls.push({url,options});if(fail)throw Error('offline');return{ok:result.valid,json:async()=>({...result})};}});
 vm.runInContext(`globalThis.AuroraLicenseConfig={origin:'https://aurora.example',product:'${product}'}`,context);
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../extensions',product,'license.js'),'utf8'),context);
 return {api:context.AuroraLicense,data,calls,set:r=>result=r,offline:()=>fail=true};
}
for(const product of ['facebook','instagram','tiktok']){
 test(`${product}: missing key blocks tasks without a request`,async()=>{const c=client(product);await assert.rejects(c.api.ensure(),/Activate/);assert.equal(c.calls.length,0);});
 test(`${product}: approved license validates and short cache is bounded`,async()=>{const c=client(product);c.data.auroraLicenseKey='AUR-'+'a'.repeat(43);await c.api.ensure();await c.api.ensure();assert.equal(c.calls.length,1);assert.equal(JSON.parse(c.calls[0].options.body).product,product);});
 test(`${product}: expired or wrong-product response fails closed`,async()=>{for(const r of [{valid:true,product,expires:1},{valid:true,product:'other',expires:Date.now()/1000+100},{valid:false,detail:'Expired'}]){const c=client(product);c.data.auroraLicenseKey='AUR-'+'a'.repeat(43);c.set(r);await assert.rejects(c.api.ensure());}});
 test(`${product}: unavailable server never permits action`,async()=>{const c=client(product);c.data.auroraLicenseKey='AUR-'+'a'.repeat(43);c.offline();await assert.rejects(c.api.ensure(),/unavailable/);});
 test(`${product}: invalid activation preserves previous key`,async()=>{const c=client(product);c.data.auroraLicenseKey='old';c.set({valid:false,detail:'Not approved'});await assert.rejects(c.api.activate('AUR-'+'a'.repeat(43)),/Not approved/);assert.equal(c.data.auroraLicenseKey,'old');});
 test(`${product}: removing key invalidates a cached license`,async()=>{const c=client(product);c.data.auroraLicenseKey='AUR-'+'a'.repeat(43);await c.api.ensure();await c.api.clear();await assert.rejects(c.api.ensure(),/Activate/);});
}
