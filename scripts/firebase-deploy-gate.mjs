import fs from 'node:fs/promises';
import { cert, deleteApp, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = 'techify-gaming-106fe';
const outputUrl = new URL('../public/firebase-deploy-gate.json', import.meta.url);

async function writeResult(result) {
  await fs.writeFile(outputUrl, JSON.stringify({ ...result, at: new Date().toISOString() }, null, 2) + '\n', 'utf8');
}

async function main() {
  const shouldRun = process.env.VERCEL_ENV === 'preview' &&
    process.env.VERCEL_GIT_COMMIT_REF === 'fix/production-payment-safety';
  if (!shouldRun) return { ok:true, skipped:true };

  const raw=String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON||'').trim();
  if(!raw) return {ok:false,skipped:false,error:'FIREBASE_SERVICE_ACCOUNT_JSON missing'};
  const sa=JSON.parse(raw);
  if(sa.project_id!==PROJECT_ID) return {ok:false,skipped:false,error:'Firebase credential belongs to another project'};

  const app=initializeApp({credential:cert(sa),projectId:PROJECT_ID},'firebase-deploy-gate');
  try{
    const credential=app.options.credential;
    if(!credential) throw new Error('Firebase Admin credential unavailable');
    const token=await credential.getAccessToken();
    const headers={Authorization:`Bearer ${token.access_token}`,'Content-Type':'application/json'};

    async function request(url,options={}){
      const response=await fetch(url,{...options,headers:{...headers,...(options.headers||{})}});
      const text=await response.text();
      let body=null; try{body=text?JSON.parse(text):null}catch{body=text}
      return {status:response.status,ok:response.ok,body};
    }

    const indexConfig=JSON.parse(await fs.readFile(new URL('../firestore.indexes.json',import.meta.url),'utf8'));
    const indexResults=[];
    for(const desired of (indexConfig.indexes||[])){
      const collectionGroup=String(desired.collectionGroup||'');
      const parent=`projects/${PROJECT_ID}/databases/(default)/collectionGroups/${encodeURIComponent(collectionGroup)}`;
      const list=await request(`https://firestore.googleapis.com/v1/${parent}/indexes`);
      if(!list.ok){
        indexResults.push({collectionGroup,ok:false,stage:'list',status:list.status,error:list.body?.error?.message||'list failed'});
        continue;
      }
      const desiredFields=(desired.fields||[]).map(f=>f.fieldPath);
      const existing=(list.body?.indexes||[]).find(index=>{
        const fields=(index.fields||[]).map(f=>f.fieldPath).filter(x=>x!=='__name__');
        return index.queryScope===(desired.queryScope||'COLLECTION') &&
          fields.length===desiredFields.length &&
          desiredFields.every((field,i)=>fields[i]===field);
      });
      if(existing){
        indexResults.push({collectionGroup,ok:existing.state==='READY',stage:'existing',state:existing.state||'UNKNOWN',name:existing.name});
        continue;
      }
      const created=await request(`https://firestore.googleapis.com/v1/${parent}/indexes`,{
        method:'POST',
        body:JSON.stringify({queryScope:desired.queryScope||'COLLECTION',fields:desired.fields})
      });
      indexResults.push({
        collectionGroup,
        ok:created.ok || created.status===409,
        stage:'create',
        status:created.status,
        operation:created.body?.name||null,
        error:created.ok?null:(created.body?.error?.message||null)
      });
    }

    let rulesResult={ok:false,stage:'not_attempted'};
    try{
      const rules=await fs.readFile(new URL('../firestore.rules',import.meta.url),'utf8');
      const source={files:[{name:'firestore.rules',content:rules}]};
      const validation=await request(`https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}:test`,{
        method:'POST',body:JSON.stringify({source})
      });
      const validationErrors=validation.ok
        ? (validation.body?.issues||[]).filter(issue=>issue.severity==='ERROR')
        : [];
      if(validation.ok && validationErrors.length){
        rulesResult={ok:false,stage:'validate',status:200,error:JSON.stringify(validationErrors).slice(0,1000)};
      }else if(!validation.ok && validation.status!==403){
        rulesResult={ok:false,stage:'validate',status:validation.status,error:validation.body?.error?.message||'validation unavailable'};
      }else{
        const created=await request(`https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/rulesets`,{
          method:'POST',body:JSON.stringify({source})
        });
        if(!created.ok){
          rulesResult={
            ok:false,
            stage:'create_ruleset',
            status:created.status,
            validationSkipped:validation.status===403,
            error:created.body?.error?.message||'create ruleset failed'
          };
        }else{
          const rulesetName=created.body?.name;
          const releases=await request(`https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/releases?pageSize=100`);
          const existing=(releases.body?.releases||[]).find(release=>
            String(release.name||'').endsWith('/releases/cloud.firestore') ||
            String(release.name||'').endsWith('/releases/cloud.firestore/(default)')
          );
          const releaseName=existing?.name||`projects/${PROJECT_ID}/releases/cloud.firestore`;
          const deployed=existing
            ? await request(`https://firebaserules.googleapis.com/v1/${releaseName}`,{
                method:'PATCH',
                body:JSON.stringify({
                  release:{name:releaseName,rulesetName},
                  updateMask:'ruleset_name'
                })
              })
            : await request(`https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/releases`,{
                method:'POST',
                body:JSON.stringify({name:releaseName,rulesetName})
              });
          rulesResult={
            ok:deployed.ok,
            stage:'release',
            status:deployed.status,
            validationSkipped:validation.status===403,
            error:deployed.ok?null:(deployed.body?.error?.message||'release failed')
          };
        }
      }
    }catch(error){
      rulesResult={ok:false,stage:'exception',error:error instanceof Error?error.message:String(error)};
    }

    const result = {
      ok:indexResults.every(x=>x.ok) && rulesResult.ok,
      skipped:false,
      indexes:indexResults,
      rules:rulesResult,
      updatedAt:new Date().toISOString(),
    };
    await getFirestore(app).collection('_internal').doc('firebase_deploy_gate').set(result, { merge: true });
    return result;
  }finally{
    await deleteApp(app).catch(()=>{});
  }
}

try{
  await writeResult(await main());
}catch(error){
  await writeResult({ok:false,skipped:false,error:error instanceof Error?error.message:String(error)});
}
