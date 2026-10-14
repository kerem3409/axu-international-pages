import {chromium} from '../../.visual-tools.local/node_modules/playwright/index.mjs';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try {
 const page=await browser.newPage();
 const url='https://wa.me/905367040944?text=AXU%20connection%20check%20%28not%20sent%29';
 try {
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForTimeout(5000);
  const body=await page.locator('body').innerText();
  console.log(JSON.stringify({url:page.url(),title:await page.title(),signInScreen:/log in|sign in|qr code|scan.*code|link.*device/i.test(body),chatAndDraftVerified:false,note:'No authenticated WhatsApp session. No message sent.'}));
 } catch(error) { console.log(JSON.stringify({chatAndDraftVerified:false,note:'External WhatsApp navigation unavailable; no message sent.',error:error.message})); }
} finally {await browser.close();}
