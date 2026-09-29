import { chromium } from 'playwright';
const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium', args:['--ignore-certificate-errors']}).catch(()=>chromium.launch());
const pages={home:'/',about:'/?page_id=26',contact:'/?page_id=24',services:'/?page_id=407'};
for (const w of [1440,1024,768,390]) for (const [n,p] of Object.entries(pages)) {
  const pg = await b.newPage({viewport:{width:w,height:900}, ignoreHTTPSErrors:true});
  try { await pg.goto('https://worxforu.com'+p,{waitUntil:'networkidle',timeout:60000}); await pg.waitForTimeout(1500);
    await pg.screenshot({path:`./${n}-${w}.jpg`,fullPage:true,type:'jpeg',quality:55}); console.log('ok',n,w);
  } catch(e){console.log('fail',n,w,e.message.slice(0,80))}
  await pg.close();
}
console.log(b.version()); await b.close();
