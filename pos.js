let scanStream=null,scanTimer=null,TAX=0,paying=false;
const r2=n=>Math.round((Number(n)||0)*100)/100;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const nf=n=>Number(n||0).toLocaleString('en-KE',{minimumFractionDigits:2,maximumFractionDigits:2});
const PR={m:localStorage.getItem('mx_pm')||'sys',w:parseInt(localStorage.getItem('mx_pw'),10)||32,dev:null,ch:null,usb:null,ep:0};
const PRN={sys:'phone print',ble:'Bluetooth',usb:'USB cable',rawbt:'RawBT'};
const PHELP={
sys:'Opens the phone print screen. Pick a printer or Save as PDF.',
ble:'Chrome on Android, Bluetooth LE printers only. Switch the printer on, turn on phone Location, tap Connect and pick it. If your printer is not listed, use RawBT.',
usb:'Plug the printer in with an OTG cable, tap Connect, pick it and allow access.',
rawbt:'Install the free RawBT app, pair your printer inside RawBT and set it as default. No Connect step needed here.'};
const BLE_SVC=['000018f0-0000-1000-8000-00805f9b34fb','0000ffe0-0000-1000-8000-00805f9b34fb','0000ff00-0000-1000-8000-00805f9b34fb','e7810a71-73ae-499d-8c15-faa9aef0c3f2','49535343-fe7d-4ae5-8fa9-9fafd205e455','0000ae30-0000-1000-8000-00805f9b34fb','0000fee7-0000-1000-8000-00805f9b34fb','0000ffe5-0000-1000-8000-00805f9b34fb'];

(function(){
  const s=document.createElement('style');
  s.textContent='.crt-f button:disabled{opacity:.4;cursor:not-allowed}@media(max-width:768px){.pgr{max-height:30dvh;flex:none}.crt{max-height:none}.crt-i{max-height:26dvh;min-height:50px}}@media print{.md,.mb{max-height:none!important;overflow:visible!important}}';
  document.head.appendChild(s);
})();

function cartSub(){return cart.reduce((a,c)=>a+c.price*c.qty,0)}
function cartTot(){return cartSub()*(1+TAX/100)}

async function rPOS(el){
  const pr=await gA('products'),ca=await gA('categories'),se=await gA('settings');
  TAX=Number(se[0]&&se[0].taxRate)||0;
  const tn=(se[0]&&se[0].taxName)||'VAT';
  el.innerHTML=
   '<div class="pos"><div style="display:flex;flex-direction:column;overflow:hidden">'
  +'<div class="psch"><input id="ps" placeholder="🔍 Search/scan..." oninput="fP()"><button class="bp sm" onclick="openScan()" style="padding:8px 10px;font-size:16px">📷</button>'
  +'<select id="pc" onchange="fP()" style="width:80px"><option value="">All</option>'+ca.map(c=>'<option value="'+c.id+'">'+c.name+'</option>').join('')+'</select></div>'
  +'<div class="pgr">'+pr.map(p=>'<div class="pi '+(p.stock<=0?'out':'')+'" onclick="aC('+p.id+')" data-n="'+p.name.toLowerCase()+'" data-b="'+(p.barcode||'')+'" data-c="'+p.catId+'"><div class="pn">'+p.name+'</div><div class="pp">'+fmt(p.price)+'</div><div class="ps">Stk:'+p.stock+'</div></div>').join('')+'</div></div>'
  +'<div class="crt"><div class="crt-h"><span id="cH"></span><div style="display:flex;gap:2px"><button class="bo sm" onclick="sH()">Held</button><button class="bw sm" onclick="hS()">Hold</button><button class="bo sm" onclick="openPrinter(false)">🖨️</button></div></div>'
  +'<div class="crt-i" id="ci"></div>'
  +'<div class="crt-f"><div class="ctot"><div><span>Sub</span><span id="cS"></span></div><div><span>'+tn+' ('+TAX+'%)</span><span id="cT"></span></div><div class="gt"><span>Total</span><span id="cTo"></span></div></div>'
  +'<div class="cact"><button class="bd" onclick="clrC()">Clear</button><button class="bs" id="payBtn" onclick="oPay()">💳 Pay</button></div></div></div></div>';
  uC();
}

function rCI(){
  return cart.map((c,i)=>'<div class="cr"><span class="cn">'+c.name+'</span><div class="cq"><button onclick="cQ('+i+',-1)">−</button><span>'+c.qty+'</span><button onclick="cQ('+i+',1)">+</button></div><span class="ct">'+fmt(c.price*c.qty)+'</span><span class="cx" onclick="rmC('+i+')">✕</span></div>').join('')||'<div style="text-align:center;padding:14px;color:var(--tx2)">Empty</div>';
}
function uC(){
  const e=document.getElementById('ci');if(!e)return;
  e.innerHTML=rCI();
  const sub=cartSub();
  document.getElementById('cS').textContent=fmt(sub);
  document.getElementById('cT').textContent=fmt(sub*TAX/100);
  document.getElementById('cTo').textContent=fmt(sub*(1+TAX/100));
  document.getElementById('cH').textContent='🛒 ('+cart.length+')';
  const pb=document.getElementById('payBtn');
  if(pb)pb.disabled=!cart.length;
}
async function aC(pid){
  const p=await gO('products',pid);
  if(!p||p.stock<=0)return toast('Out of stock!');
  const e=cart.find(c=>c.pid===pid);
  if(e){if(e.qty>=p.stock)return toast('Max stock reached');e.qty++;e.mx=p.stock}
  else cart.push({pid:pid,name:p.name,price:p.price,qty:1,mx:p.stock});
  uC();
}
function cQ(i,d){
  cart[i].qty+=d;
  if(cart[i].qty<=0)cart.splice(i,1);
  else if(cart[i].qty>cart[i].mx){cart[i].qty=cart[i].mx;toast('Max stock reached')}
  uC();
}
function rmC(i){cart.splice(i,1);uC()}
function clrC(){cart=[];uC()}
function fP(){
  const q=(document.getElementById('ps')?.value||'').toLowerCase(),c=document.getElementById('pc')?.value||'';
  document.querySelectorAll('.pi').forEach(e=>{
    e.style.display=(e.dataset.n.includes(q)||e.dataset.b.includes(q))&&(!c||e.dataset.c===c)?'':'none';
  });
}
function hS(){
  if(!cart.length)return toast('Cart is empty');
  const h=JSON.parse(localStorage.getItem('mx_h')||'[]');
  h.push({id:Date.now().toString(36),items:[...cart],date:new Date().toISOString(),user:CU.name});
  localStorage.setItem('mx_h',JSON.stringify(h));
  cart=[];uC();toast('Sale held');
}
function sH(){
  const h=JSON.parse(localStorage.getItem('mx_h')||'[]');
  if(!h.length)return toast('No held sales');
  oM('Held sales',h.map(x=>'<div style="display:flex;justify-content:space-between;align-items:center;padding:5px;border-bottom:1px solid var(--b3)"><div><b>'+x.items.length+' items</b><br><small style="color:var(--tx2)">'+fD(x.date)+'</small></div><div style="display:flex;gap:2px"><button class="bp sm" onclick="rS(\''+x.id+'\')">Go</button><button class="bd sm" onclick="dH(\''+x.id+'\')">Del</button></div></div>').join(''));
}
function rS(id){
  const h=JSON.parse(localStorage.getItem('mx_h')||'[]'),x=h.find(a=>a.id===id);
  if(x){cart=x.items;uC()}
  localStorage.setItem('mx_h',JSON.stringify(h.filter(a=>a.id!==id)));
  cM();toast('Sale resumed');
}
function dH(id){
  const h=JSON.parse(localStorage.getItem('mx_h')||'[]');
  localStorage.setItem('mx_h',JSON.stringify(h.filter(a=>a.id!==id)));
  cM();sH();
}

/* ---------- CAMERA SCANNER ---------- */
function stopCam(){
  if(scanTimer){clearInterval(scanTimer);scanTimer=null}
  if(scanStream){scanStream.getTracks().forEach(t=>t.stop());scanStream=null}
}
function stopScan(){stopCam();cM()}
window.cM=function(){stopCam();document.getElementById('mo').classList.remove('sh')};
async function openScan(){
  oM('📷 Barcode Scanner',
   '<p style="color:var(--tx2);font-size:11px;margin-bottom:6px">Point the camera at a barcode</p>'
  +'<div class="scanner-box"><video id="scanVid" autoplay playsinline muted></video><div class="scan-line"></div></div>'
  +'<div id="scanRes"></div>'
  +'<div class="f" style="margin-top:8px"><label>Or type barcode</label><input id="scanManual" placeholder="Type barcode, press Enter" onkeydown="if(event.key===\'Enter\')doScanManual()"></div>',
  '<button class="bd" onclick="stopScan()">Close</button>');
  try{
    scanStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
    const vid=document.getElementById('scanVid');
    if(!vid){stopCam();return}
    vid.srcObject=scanStream;
    await vid.play();
    if('BarcodeDetector' in window){
      const det=new BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e','code_128','code_39','qr_code']});
      scanTimer=setInterval(async()=>{
        try{
          const codes=await det.detect(vid);
          if(!scanTimer)return;
          if(codes.length>0)await scanFound(codes[0].rawValue);
        }catch(e){}
      },500);
    }else{
      document.getElementById('scanRes').innerHTML='<div class="al al-w">Auto-scan not supported on this browser. Type the barcode below.</div>';
    }
  }catch(e){
    const r=document.getElementById('scanRes');
    if(r)r.innerHTML='<div class="al al-w">Camera error: '+e.message+'. Type the barcode below.</div>';
  }
}
async function doScanManual(){
  const v=(document.getElementById('scanManual')?.value||'').trim();
  if(v)await scanFound(v);
}
async function scanFound(code){
  stopScan();
  const pr=await gA('products');
  const p=pr.find(x=>String(x.barcode).trim()===String(code).trim());
  if(p){await aC(p.id);toast('Added: '+p.name)}
  else{
    toast('No product with barcode '+code);
    const si=document.getElementById('ps');
    if(si){si.value=code;fP()}
  }
}

/* ---------- PAYMENT ---------- */
function oPay(){
  if(!cart.length)return toast('Cart is empty');
  const tot=r2(cartTot());
  window._pm='Cash';window._tot=tot;
  const ic='style="display:block;font-size:20px"',lb='style="display:block;font-size:10px;font-weight:600"';
  const qk=[50,100,200,500,1000,2000,5000].filter(d=>d>=tot).slice(0,4);
  const qb='<button class="bo sm" onclick="setRcv('+tot+')">Exact</button>'+qk.map(d=>'<button class="bo sm" onclick="setRcv('+d+')">'+d+'</button>').join('');
  oM('💳 Payment',
   '<div style="text-align:center;margin-bottom:6px"><div style="font-size:10px;color:var(--tx2)">Total</div><div style="font-size:24px;font-weight:800;color:var(--ac)">'+fmt(tot)+'</div></div>'
  +'<div class="pms">'
  +'<div class="sel" onclick="sPM(this,\'Cash\')"><span '+ic+'>💵</span><span '+lb+'>Cash</span></div>'
  +'<div onclick="sPM(this,\'Card\')"><span '+ic+'>💳</span><span '+lb+'>Card</span></div>'
  +'<div onclick="sPM(this,\'M-Pesa\')"><span '+ic+'>📱</span><span '+lb+'>M-Pesa</span></div>'
  +'</div>'
  +'<div id="cs"><div class="f"><label>Amount given by customer</label><input type="number" inputmode="decimal" id="ar" value="'+tot.toFixed(2)+'" oninput="calcChg()" onfocus="this.select()"></div>'
  +'<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px">'+qb+'</div>'
  +'<div style="text-align:center;font-size:16px;font-weight:700;color:var(--gn)" id="cd">Change: '+fmt(0)+'</div></div>'
  +'<div class="f" style="margin-top:6px"><label>Customer (optional)</label><input id="pcu" placeholder="Walk-in"></div>'
  +'<label class="chk"><input type="checkbox" id="prnChk" '+(localStorage.getItem('mx_ap')==='1'?'checked':'')+'><span>🖨️ Print receipt ('+PRN[PR.m]+')</span></label>',
  '<button class="bs" style="width:100%;padding:10px" onclick="cSa()">✅ Complete sale</button>');
}
function setRcv(n){document.getElementById('ar').value=Number(n).toFixed(2);calcChg()}
function sPM(el,m){
  document.querySelectorAll('.pms>div').forEach(e=>e.classList.remove('sel'));
  el.classList.add('sel');window._pm=m;
  document.getElementById('cs').style.display=m==='Cash'?'block':'none';
}
function calcChg(){
  const r=parseFloat(document.getElementById('ar').value)||0,t=window._tot||0,d=document.getElementById('cd');
  if(r>=t){d.style.color='var(--gn)';d.textContent='Change: '+fmt(r2(r-t))}
  else{d.style.color='var(--rd)';d.textContent='Short by '+fmt(r2(t-r))}
}

async function cSa(){
  if(paying)return;
  if(!cart.length)return toast('Cart is empty');
  const sub=r2(cartSub()),tot=r2(cartTot());
  const pm=window._pm||'Cash';
  const wantPrint=!!document.getElementById('prnChk')?.checked;
  localStorage.setItem('mx_ap',wantPrint?'1':'0');
  let paid=tot,chg=0;
  if(pm==='Cash'){
    const rc=parseFloat(document.getElementById('ar')?.value)||0;
    if(rc<tot)return toast('Amount given is less than total');
    paid=r2(rc);chg=r2(rc-tot);
  }
  paying=true;
  try{
    for(const c of cart){
      const p=await gO('products',c.pid);
      if(!p||p.stock<c.qty)return toast((p?p.name:'Item')+': not enough stock');
    }
    const rn='RCP-'+Date.now().toString(36).toUpperCase();
    const cu=(document.getElementById('pcu')?.value||'').trim()||'Walk-in';
    const pmName=pm==='Card'?'Card (External)':pm;
    const now=new Date().toISOString();
    const taxAmt=r2(tot-sub);
    const sid=await aO('sales',{rn:rn,date:now,cashier:CU.name,customer:cu,subtotal:sub,tax:taxAmt,total:tot,pm:pmName,paid:paid,change:chg,ic:cart.length});
    for(const c of cart){
      await aO('saleItems',{saleId:sid,productId:c.pid,name:c.name,price:c.price,qty:c.qty,total:r2(c.price*c.qty)});
      const p=await gO('products',c.pid);
      if(p){p.stock=Math.max(0,p.stock-c.qty);await pO('products',p)}
      await aO('invLog',{productId:c.pid,pn:c.name,type:'sale',qty:-c.qty,date:now,user:CU.name,ref:rn});
    }
    const ac=await gA('accounts');
    const an={'Cash':'Cash','M-Pesa':'M-Pesa','Card':'Bank'}[pm]||'Cash';
    const da=ac.find(a=>a.n===an)||ac.find(a=>a.n==='Cash');
    const ra=ac.find(a=>a.n==='Sales Revenue');
    if(da&&ra)await aO('journal',{date:now,desc:'Sale '+rn,lines:[{ai:da.id,an:da.n,dr:tot,cr:0},{ai:ra.id,an:ra.n,dr:0,cr:tot}],ref:rn,by:CU.name});
    const sale={id:sid,rn:rn,date:now,cashier:CU.name,customer:cu,subtotal:sub,tax:taxAmt,total:tot,pm:pmName,paid:paid,change:chg};
    cart=[];
    cM();
    go('pos');
    toast('✅ Sale complete');
    await shR(sale);
    if(wantPrint)printCur(true);
  }catch(e){
    toast('Error: '+e.message);
  }finally{
    paying=false;
  }
}

/* ---------- RECEIPT (screen) ---------- */
async function shR(sale){
  const se=await gA('settings'),s=se[0]||{};
  const items=(await gA('saleItems')).filter(i=>i.saleId===sale.id);
  window._rc={sale:sale,items:items,s:s};
  const row=(a,b,st)=>'<div style="display:flex;justify-content:space-between;'+(st||'')+'"><span>'+a+'</span><span>'+b+'</span></div>';
  oM('🧾 Receipt',
   '<div class="rcp" id="rc"><h2>'+(s.storeName||'Moswax Shop')+'</h2><div class="rc">'+(s.address||'')+' '+(s.phone||'')+'</div><div class="rl"></div>'
  +'<div>'+sale.rn+'</div><div>'+fD(sale.date)+'</div><div>Cashier: '+sale.cashier+'</div>'
  +(sale.customer&&sale.customer!=='Walk-in'?'<div>Customer: '+sale.customer+'</div>':'')
  +'<div class="rl"></div><table><tr><td><b>Item</b></td><td class="rr"><b>Qty</b></td><td class="rr"><b>Price</b></td><td class="rr"><b>Tot</b></td></tr>'
  +items.map(i=>'<tr><td>'+i.name+'</td><td class="rr">'+i.qty+'</td><td class="rr">'+fmt(i.price)+'</td><td class="rr">'+fmt(i.total)+'</td></tr>').join('')
  +'</table><div class="rl"></div>'
  +row('Sub',fmt(sale.subtotal))
  +(sale.tax>0?row(s.taxName||'VAT',fmt(sale.tax)):'')
  +row('TOTAL',fmt(sale.total),'font-size:12px;font-weight:700')
  +'<div>Paid: '+sale.pm+'</div>'
  +(sale.paid!=null&&sale.pm==='Cash'?row('Amount given',fmt(sale.paid))+row('Change',fmt(sale.change||0),'font-weight:700'):'')
  +'<div class="rl"></div><div class="rc">'+(s.footer||'Thank you!')+'</div></div>'
  +'<div style="text-align:center;margin-top:6px;display:flex;gap:4px;justify-content:center;flex-wrap:wrap"><button class="bp" onclick="printCur(false)">🖨️ Print</button><button class="bo" onclick="sR()">📤 Share</button><button class="bo" onclick="openPrinter(true)">⚙️ Printer</button><button class="bo" onclick="cM()">Close</button></div>');
}
function sR(){
  const c=document.getElementById('rc');if(!c)return;
  if(navigator.share)navigator.share({title:'Receipt',text:c.innerText}).catch(()=>{});
  else{navigator.clipboard?.writeText(c.innerText);toast('Copied')}
}

/* ---------- PRINTING ---------- */
function ascii(t){return String(t==null?'':t).replace(/[\u00A0\u2000-\u200B\u202F\u205F]/g,' ').replace(/[^\x20-\x7E]/g,'?')}
function padLR(l,r,W){l=ascii(l);r=ascii(r);const sp=W-l.length-r.length;return sp>0?l+' '.repeat(sp)+r:l.slice(0,Math.max(0,W-r.length-1))+' '+r}
function ctr(t,W){t=ascii(t);return ' '.repeat(Math.max(0,Math.floor((W-t.length)/2)))+t}
function wrap(t,W){t=ascii(t).trim();const o=[];while(t.length>W){let k=t.lastIndexOf(' ',W);if(k<=0)k=W;o.push(t.slice(0,k));t=t.slice(k).trim()}if(t)o.push(t);return o}
function pd(d){const x=new Date(d);return x.toLocaleDateString('en-GB')+' '+x.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}

function escpos(sale,items,s,W){
  const E=[],enc=new TextEncoder();
  const cmd=(...b)=>E.push(new Uint8Array(b));
  const txt=t=>E.push(enc.encode(ascii(t)+'\n'));
  const bold=on=>cmd(0x1B,0x45,on?1:0);
  const ln='-'.repeat(W);
  cmd(0x1B,0x40);
  bold(1);wrap(s.storeName||'Moswax Shop',W).forEach(l=>txt(ctr(l,W)));bold(0);
  wrap(((s.address||'')+' '+(s.phone||'')).trim(),W).forEach(l=>txt(ctr(l,W)));
  txt(ln);
  txt('Receipt: '+sale.rn);
  txt('Date: '+pd(sale.date));
  txt('Cashier: '+sale.cashier);
  if(sale.customer&&sale.customer!=='Walk-in')txt('Customer: '+sale.customer);
  txt(ln);
  items.forEach(i=>{
    wrap(i.name,W).forEach(l=>txt(l));
    txt(padLR('  '+i.qty+' x '+nf(i.price),nf(i.total),W));
  });
  txt(ln);
  txt(padLR('Subtotal',nf(sale.subtotal),W));
  if(sale.tax>0)txt(padLR(s.taxName||'VAT',nf(sale.tax),W));
  bold(1);txt(padLR('TOTAL','KSh '+nf(sale.total),W));bold(0);
  txt(padLR('Paid by',sale.pm,W));
  if(sale.paid!=null&&sale.pm==='Cash'){
    txt(padLR('Amount given',nf(sale.paid),W));
    bold(1);txt(padLR('Change',nf(sale.change||0),W));bold(0);
  }
  txt(ln);
  wrap(s.footer||'Thank you!',W).forEach(l=>txt(ctr(l,W)));
  cmd(0x1B,0x64,4);
  cmd(0x1D,0x56,0x42,0x00);
  let n=0;E.forEach(a=>n+=a.length);
  const o=new Uint8Array(n);let p=0;E.forEach(a=>{o.set(a,p);p+=a.length});
  return o;
}

/* Bluetooth LE */
async function connBLE(){
  if(!navigator.bluetooth)throw new Error('Bluetooth printing needs Chrome on Android. Try RawBT or phone print.');
  const dev=await navigator.bluetooth.requestDevice({acceptAllDevices:true,optionalServices:BLE_SVC});
  PR.dev=dev;PR.ch=null;
  dev.addEventListener('gattserverdisconnected',()=>{PR.ch=null});
  await bleOpen();
}
async function bleOpen(){
  const srv=await PR.dev.gatt.connect();
  const svcs=await srv.getPrimaryServices();
  for(const sv of svcs){
    const chs=await sv.getCharacteristics();
    for(const c of chs){
      if(c.properties.write||c.properties.writeWithoutResponse){PR.ch=c;return}
    }
  }
  throw new Error('No print channel found on this device');
}
async function bleSend(b){
  if(!PR.dev)throw new Error('Printer not connected');
  if(!PR.ch||!PR.dev.gatt.connected)await bleOpen();
  const c=PR.ch,wr=c.properties.write,sz=wr?100:20;
  for(let i=0;i<b.length;i+=sz){
    const part=b.slice(i,i+sz);
    if(wr)await c.writeValue(part);else await c.writeValueWithoutResponse(part);
    await sleep(wr?10:25);
  }
}

/* USB cable */
async function connUSB(){
  if(!navigator.usb)throw new Error('USB printing needs Chrome on Android and an OTG cable.');
  const d=await navigator.usb.requestDevice({filters:[]});
  await usbOpen(d);
}
async function usbOpen(d){
  if(!d.opened)await d.open();
  if(d.configuration===null)await d.selectConfiguration(1);
  let f=null;
  for(const ifc of d.configuration.interfaces){
    for(const al of ifc.alternates){
      const ep=al.endpoints.find(e=>e.direction==='out'&&e.type==='bulk');
      if(ep&&(!f||al.interfaceClass===7))f={n:ifc.interfaceNumber,alt:al.alternateSetting,ep:ep.endpointNumber};
    }
  }
  if(!f)throw new Error('No print channel found on this USB device');
  await d.claimInterface(f.n);
  if(f.alt)await d.selectAlternateInterface(f.n,f.alt);
  PR.usb=d;PR.ep=f.ep;
}
async function usbSend(b){
  if(!PR.usb){
    const l=navigator.usb?await navigator.usb.getDevices():[];
    if(!l.length)throw new Error('USB printer not connected');
    await usbOpen(l[0]);
  }
  for(let i=0;i<b.length;i+=4096)await PR.usb.transferOut(PR.ep,b.slice(i,i+4096));
}

/* RawBT */
function b64(u){let s='';for(let i=0;i<u.length;i++)s+=String.fromCharCode(u[i]);return btoa(s)}

async function ensureConn(){
  if(PR.m==='ble'&&!PR.dev)await connBLE();
  if(PR.m==='usb'&&!PR.usb){
    const l=navigator.usb?await navigator.usb.getDevices():[];
    if(l.length)await usbOpen(l[0]);else await connUSB();
  }
}
async function doPrint(sale,items,s,silent){
  try{
    if(PR.m==='sys'){window.print();return}
    if(silent&&PR.m==='ble'&&!PR.dev)return toast('Printer not connected. Tap 🖨️ Print on the receipt.');
    if(!silent)await ensureConn();
    const bytes=escpos(sale,items,s,PR.w);
    if(PR.m==='ble')await bleSend(bytes);
    else if(PR.m==='usb')await usbSend(bytes);
    else if(PR.m==='rawbt'){location.href='intent:base64,'+b64(bytes)+'#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;';return}
    toast('🖨️ Sent to printer');
  }catch(e){toast('Print failed: '+(e.message||e))}
}
function printCur(silent){
  const r=window._rc;if(!r)return toast('No receipt to print');
  doPrint(r.sale,r.items,r.s,!!silent);
}

/* ---------- PRINTER SETTINGS ---------- */
function prStatus(){
  if(PR.m==='ble')return PR.dev?(PR.ch?'✅ Connected: ':'⚠️ Paired (reconnects when printing): ')+(PR.dev.name||'printer'):'Not connected';
  if(PR.m==='usb')return PR.usb?'✅ Connected: '+(PR.usb.productName||'USB printer'):'Not connected';
  return 'No connection step needed';
}
function openPrinter(back){
  window._prBack=!!back;
  oM('🖨️ Printer settings',
   '<div class="f"><label>Print method</label><select id="prM" onchange="prSave()"><option value="sys">Phone print dialog</option><option value="ble">Bluetooth printer (BLE)</option><option value="usb">USB cable (OTG)</option><option value="rawbt">RawBT app (Bluetooth or USB)</option></select></div>'
  +'<div class="f"><label>Paper width</label><select id="prW" onchange="prSave()"><option value="32">58 mm</option><option value="48">80 mm</option></select></div>'
  +'<div id="prSt" style="font-size:12px;margin:4px 0"></div>'
  +'<div id="prHp" style="font-size:11px;color:var(--tx2);margin-bottom:8px"></div>'
  +'<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px"><button class="bp" onclick="prConnect()">🔗 Connect</button><button class="bo" onclick="testPrint()">Test print</button></div>'
  +'<label class="chk"><input type="checkbox" id="prAp" onchange="prSave()"><span>Tick "Print receipt" by default at payment</span></label>',
  '<button class="bo" onclick="closePr()">Close</button>');
  document.getElementById('prM').value=PR.m;
  document.getElementById('prW').value=String(PR.w);
  document.getElementById('prAp').checked=localStorage.getItem('mx_ap')==='1';
  prSave();
}
function prSave(){
  PR.m=document.getElementById('prM').value;
  PR.w=parseInt(document.getElementById('prW').value,10)||32;
  localStorage.setItem('mx_pm',PR.m);
  localStorage.setItem('mx_pw',String(PR.w));
  localStorage.setItem('mx_ap',document.getElementById('prAp').checked?'1':'0');
  document.getElementById('prSt').textContent=prStatus();
  document.getElementById('prHp').textContent=PHELP[PR.m];
}
async function prConnect(){
  prSave();
  try{
    if(PR.m==='ble')await connBLE();
    else if(PR.m==='usb')await connUSB();
    else return toast('No connect step for this method');
    toast('Printer connected');
  }catch(e){toast('Connect failed: '+(e.message||e))}
  const st=document.getElementById('prSt');if(st)st.textContent=prStatus();
}
async function testPrint(){
  prSave();
  if(PR.m==='sys')return toast('Make a sale, then tap Print on the receipt');
  const se=await gA('settings');
  const sale={rn:'TEST-PRINT',date:new Date().toISOString(),cashier:CU?CU.name:'-',customer:'Walk-in',subtotal:100,tax:0,total:100,pm:'Cash',paid:200,change:100};
  await doPrint(sale,[{name:'Test item',qty:1,price:100,total:100}],se[0]||{},false);
}
function closePr(){
  const r=window._rc;
  if(window._prBack&&r){window._prBack=false;shR(r.sale)}else cM();
}
