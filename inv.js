const IS={st:null,tm:null,cb:null,el:null,busy:false,n:0};
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
(function(){const s=document.createElement('style');s.textContent='.mf{flex-wrap:wrap}';document.head.appendChild(s)})();

/* ---------- SCANNER (works on top of any window) ---------- */
function scanStop(){
  IS.n++;
  if(IS.tm){clearInterval(IS.tm);IS.tm=null}
  if(IS.st){IS.st.getTracks().forEach(t=>t.stop());IS.st=null}
  if(IS.el){IS.el.remove();IS.el=null}
  IS.cb=null;IS.busy=false;
}
function scanDone(code){
  const f=IS.cb;
  scanStop();
  if(navigator.vibrate)navigator.vibrate(80);
  if(f)f(String(code).trim());
}
async function scanTo(cb){
  scanStop();
  const tok=IS.n;
  IS.cb=cb;
  const d=document.createElement('div');
  d.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:3000;display:flex;align-items:center;justify-content:center;padding:10px';
  d.innerHTML=
   '<div style="background:var(--b2);border-radius:10px;width:100%;max-width:380px;padding:12px">'
  +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><b>📷 Scan barcode</b><button class="bd sm" id="scX">✕ Close</button></div>'
  +'<div class="scanner-box"><video id="scV" autoplay playsinline muted></video><div class="scan-line"></div></div>'
  +'<div id="scMsg" style="font-size:11px;color:var(--tx2);margin:6px 0"></div>'
  +'<div style="display:flex;gap:4px"><input id="scI" placeholder="Or type / use a handheld scanner" autocomplete="off"><button class="bp sm" id="scOk">OK</button></div>'
  +'</div>';
  document.body.appendChild(d);
  IS.el=d;
  const inp=document.getElementById('scI'),msg=document.getElementById('scMsg');
  const submit=()=>{const v=inp.value.trim();if(v)scanDone(v)};
  document.getElementById('scX').onclick=scanStop;
  document.getElementById('scOk').onclick=submit;
  inp.onkeydown=e=>{if(e.key==='Enter')submit()};
  try{
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)throw new Error('camera not available');
    const st=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
    if(tok!==IS.n){st.getTracks().forEach(t=>t.stop());return}
    IS.st=st;
    const v=document.getElementById('scV');
    v.srcObject=st;
    await v.play();
    if('BarcodeDetector' in window){
      const det=new BarcodeDetector();
      msg.textContent='Hold the barcode inside the camera view';
      IS.tm=setInterval(async()=>{
        if(IS.busy||tok!==IS.n)return;
        IS.busy=true;
        try{
          const c=await det.detect(v);
          if(tok===IS.n&&c.length)scanDone(c[0].rawValue);
        }catch(e){}
        IS.busy=false;
      },400);
    }else{
      msg.textContent='Auto-scan is not supported on this browser. Type the barcode below.';
    }
  }catch(e){
    if(tok===IS.n)msg.textContent='Camera error: '+e.message+'. Type the barcode below.';
  }
}
function findByCode(pr,code){
  return pr.find(x=>String(x.barcode||'').trim()===String(code).trim());
}

/* ---------- QUICK SCAN (Products tab) ---------- */
function quickScan(){
  scanTo(async code=>{
    const pr=await gA('products');
    const p=findByCode(pr,code);
    window._sc=code;
    if(p){
      oM('📦 '+p.name,
       '<div style="text-align:center"><div style="font-size:11px;color:var(--tx2)">Barcode '+esc(code)+'</div>'
      +'<div style="font-size:12px;color:var(--tx2);margin-top:6px">In stock</div>'
      +'<div style="font-size:30px;font-weight:800;color:var(--ac)">'+p.stock+'</div>'
      +'<div style="font-size:12px;color:var(--tx2)">Price '+fmt(p.price)+'</div></div>',
       '<button class="bs" onclick="oSM(\'in\','+p.id+')">📥 Stock In</button>'
      +'<button class="bd" onclick="oSM(\'out\','+p.id+')">📤 Stock Out</button>'
      +'<button class="bo" onclick="oPF('+p.id+')">Edit</button>'
      +'<button class="bp" onclick="quickScan()">📷 Scan next</button>');
    }else{
      oM('Barcode not found',
       '<div style="text-align:center;padding:6px 0"><div style="font-size:12px;color:var(--tx2)">No product has barcode</div>'
      +'<div style="font-size:18px;font-weight:800;margin:6px 0;word-break:break-all">'+esc(code)+'</div></div>',
       '<button class="bp" onclick="oPF(0,window._sc)">+ Add as new product</button>'
      +'<button class="bo" onclick="quickScan()">📷 Scan again</button>'
      +'<button class="bo" onclick="cM()">Close</button>');
    }
  });
}

/* ---------- INVENTORY SCREEN ---------- */
function filtInv(v){
  v=String(v||'').toLowerCase();
  document.querySelectorAll('#pt tr[data-s]').forEach(r=>{r.style.display=r.dataset.s.includes(v)?'':'none'});
}
async function rInv(el){
  const pr=await gA('products'),ca=await gA('categories'),lo=await gA('invLog');
  const lw=pr.filter(p=>p.stock>0&&p.stock<=p.reorder),ou=pr.filter(p=>p.stock<=0);
  const stk=p=>p.stock<=0?'<span class="bg bg-r">0</span>':p.stock<=p.reorder?'<span class="bg bg-o">'+p.stock+'</span>':'<span class="bg bg-g">'+p.stock+'</span>';
  el.innerHTML=
   '<h2 style="margin-bottom:8px">📦 Inventory</h2>'
  +'<div class="cds"><div class="cd"><div class="cl">Total</div><div class="cv">'+pr.length+'</div></div>'
  +'<div class="cd"><div class="cl">In Stock</div><div class="cv g">'+pr.filter(p=>p.stock>0).length+'</div></div>'
  +'<div class="cd"><div class="cl">Low</div><div class="cv o">'+lw.length+'</div></div>'
  +'<div class="cd"><div class="cl">Out</div><div class="cv r">'+ou.length+'</div></div></div>'
  +'<div class="tabs"><button class="on" onclick="iT(this,0)">Products</button><button onclick="iT(this,1)">Movements</button><button onclick="iT(this,2)">Categories</button><button onclick="iT(this,3)">Import</button></div>'

  +'<div id="iT0"><div style="display:flex;justify-content:space-between;margin-bottom:4px;flex-wrap:wrap;gap:3px">'
  +'<input placeholder="🔍 Search name, SKU, barcode..." style="max-width:200px" oninput="filtInv(this.value)">'
  +'<div style="display:flex;gap:2px;flex-wrap:wrap"><button class="bp sm" onclick="oPF()">+ Add</button><button class="bo sm" onclick="quickScan()">📷 Scan</button><button class="bs sm" onclick="oSM(\'in\')">📥</button><button class="bd sm" onclick="oSM(\'out\')">📤</button></div></div>'
  +'<div class="tw"><table id="pt"><tr><th>SKU</th><th>Barcode</th><th>Name</th><th>Cost</th><th>Price</th><th>Stock</th><th>Act</th></tr>'
  +pr.map(p=>'<tr data-s="'+esc((p.name+' '+(p.sku||'')+' '+(p.barcode||'')).toLowerCase())+'"><td>'+esc(p.sku||'-')+'</td><td>'+esc(p.barcode||'-')+'</td><td><b>'+esc(p.name)+'</b></td><td>'+fmt(p.cost)+'</td><td>'+fmt(p.price)+'</td><td>'+stk(p)+'</td><td><button class="bo sm" onclick="oPF('+p.id+')">Edit</button> <button class="bd sm" onclick="dPr('+p.id+')">Del</button></td></tr>').join('')
  +'</table></div></div>'

  +'<div id="iT1" style="display:none"><div class="tw"><table><tr><th>Date</th><th>Product</th><th>Type</th><th>Qty</th><th>User</th></tr>'
  +lo.slice(-30).reverse().map(l=>'<tr><td>'+fD(l.date)+'</td><td>'+esc(l.pn||'-')+'</td><td><span class="bg '+(l.type==='in'?'bg-g':'bg-r')+'">'+l.type+'</span></td><td>'+l.qty+'</td><td>'+esc(l.user)+'</td></tr>').join('')
  +'</table></div></div>'

  +'<div id="iT2" style="display:none"><div style="display:flex;gap:2px;margin-bottom:4px"><input id="nC" placeholder="New category" style="max-width:160px"><button class="bp sm" onclick="aCa()">Add</button></div>'
  +'<div class="tw"><table><tr><th>Name</th><th>Count</th><th>Act</th></tr>'
  +ca.map(c=>'<tr><td>'+esc(c.name)+'</td><td>'+pr.filter(p=>p.catId===c.id).length+'</td><td><button class="bd sm" onclick="dCa('+c.id+')">Del</button></td></tr>').join('')
  +'</table></div></div>'

  +'<div id="iT3" style="display:none"><div class="sec"><h3>📊 Import from Excel/CSV</h3>'
  +'<p style="color:var(--tx2);font-size:11px;margin-bottom:8px">In Excel use <b>Save As → CSV</b>, then upload that file here.<br>Columns: <b>Name, SKU, Barcode, Cost, Price, Stock, Category</b></p>'
  +'<div class="f"><input type="file" id="impFile" accept=".csv,.txt" onchange="previewImport()"></div>'
  +'<div id="impPreview"></div><button class="bp" id="impBtn" style="display:none;margin-top:8px" onclick="doImport()">✅ Import All</button></div>'
  +'<div class="sec"><h3>📥 Download Template</h3><button class="bo sm" onclick="dlTemplate()">Download CSV Template</button></div></div>';
}
function iT(el,i){
  el.parentElement.querySelectorAll('button').forEach(b=>b.classList.remove('on'));
  el.classList.add('on');
  [0,1,2,3].forEach(n=>{const e=document.getElementById('iT'+n);if(e)e.style.display=n===i?'block':'none'});
}

/* ---------- ADD / EDIT PRODUCT ---------- */
async function oPF(id,bc){
  const ca=await gA('categories');
  let p={name:'',sku:'',barcode:'',catId:ca[0]?ca[0].id:'',cost:0,price:0,stock:0,reorder:5};
  if(id){p=await gO('products',id);if(!p)return}
  else if(bc)p.barcode=bc;
  window._ePid=id||0;
  oM(id?'Edit product':'Add product',
   '<div class="fg"><div class="f fl"><label>Name *</label><input id="pN" value="'+esc(p.name)+'"></div>'
  +'<div class="f"><label>SKU</label><input id="pSk" value="'+esc(p.sku||'')+'"></div>'
  +'<div class="f"><label>Barcode</label><div style="display:flex;gap:4px"><input id="pB" value="'+esc(p.barcode||'')+'" style="flex:1;min-width:0"><button class="bp sm" style="font-size:16px;padding:6px 10px" onclick="scanBarcodeField()">📷</button></div></div>'
  +'<div class="f"><label>Category</label><select id="pCa">'+ca.map(c=>'<option value="'+c.id+'"'+(c.id===p.catId?' selected':'')+'>'+esc(c.name)+'</option>').join('')+'</select></div>'
  +'<div class="f"><label>Cost</label><input type="number" id="pCo" value="'+p.cost+'"></div>'
  +'<div class="f"><label>Price *</label><input type="number" id="pPr" value="'+p.price+'"></div>'
  +'<div class="f"><label>Stock</label><input type="number" id="pSt" value="'+p.stock+'"></div>'
  +'<div class="f"><label>Reorder level</label><input type="number" id="pRe" value="'+p.reorder+'"></div></div>',
  '<button class="bp" onclick="sPr('+(id||0)+')">Save</button><button class="bo" onclick="cM()">Cancel</button>');
}
function scanBarcodeField(){
  scanTo(async code=>{
    const i=document.getElementById('pB');
    if(!i)return;
    i.value=code;
    const pr=await gA('products');
    const d=pr.find(p=>String(p.barcode||'').trim()===code&&p.id!==window._ePid);
    toast(d?'⚠️ Barcode already used by '+d.name:'Barcode captured: '+code);
  });
}
async function sPr(id){
  const d={
    name:document.getElementById('pN').value.trim(),
    sku:document.getElementById('pSk').value.trim(),
    barcode:document.getElementById('pB').value.trim(),
    catId:parseInt(document.getElementById('pCa').value,10),
    cost:parseFloat(document.getElementById('pCo').value)||0,
    price:parseFloat(document.getElementById('pPr').value)||0,
    stock:parseInt(document.getElementById('pSt').value,10)||0,
    reorder:parseInt(document.getElementById('pRe').value,10)||0
  };
  if(!d.name||!d.price)return toast('Name and price are required');
  if(d.barcode){
    const all=await gA('products');
    const dup=all.find(p=>String(p.barcode||'').trim()===d.barcode&&p.id!==id);
    if(dup)return toast('Barcode already used by '+dup.name);
  }
  if(id){d.id=id;await pO('products',d)}else await aO('products',d);
  cM();toast('Saved');go('inventory');
}
async function dPr(id){
  if(!confirm('Delete this product?'))return;
  await dO('products',id);go('inventory');
}

/* ---------- STOCK IN / OUT ---------- */
async function oSM(t,pid){
  const pr=await gA('products');
  if(!pr.length)return toast('Add a product first');
  oM('Stock '+(t==='in'?'In':'Out'),
   '<div class="f"><label>Product</label><div style="display:flex;gap:4px"><select id="sP" style="flex:1;min-width:0">'
  +pr.map(p=>'<option value="'+p.id+'"'+(p.id===pid?' selected':'')+'>'+esc(p.name)+' ('+p.stock+')</option>').join('')
  +'</select><button class="bp sm" style="font-size:16px;padding:6px 10px" onclick="scanStockProd()">📷</button></div></div>'
  +'<div class="f"><label>Quantity</label><input type="number" inputmode="numeric" id="sQ" value="1" min="1"></div>',
  '<button class="bp" onclick="dSM(\''+t+'\')">OK</button><button class="bo" onclick="cM()">Cancel</button>');
}
function scanStockProd(){
  scanTo(async code=>{
    const s=document.getElementById('sP');
    if(!s)return;
    const pr=await gA('products');
    const p=findByCode(pr,code);
    if(!p)return toast('No product with barcode '+code);
    s.value=String(p.id);
    toast('Selected: '+p.name);
    const q=document.getElementById('sQ');
    if(q){q.focus();q.select()}
  });
}
async function dSM(t){
  const pid=parseInt(document.getElementById('sP').value,10);
  const qty=parseInt(document.getElementById('sQ').value,10)||0;
  if(qty<=0)return toast('Enter a quantity');
  const p=await gO('products',pid);
  if(!p)return;
  if(t==='out'&&qty>p.stock)return toast('Only '+p.stock+' in stock');
  p.stock=t==='in'?p.stock+qty:p.stock-qty;
  await pO('products',p);
  await aO('invLog',{productId:pid,pn:p.name,type:t,qty:t==='in'?qty:-qty,date:new Date().toISOString(),user:CU.name});
  cM();toast('Stock updated');go('inventory');
}

/* ---------- CATEGORIES ---------- */
async function aCa(){
  const n=(document.getElementById('nC')?.value||'').trim();
  if(!n)return;
  await aO('categories',{name:n});go('inventory');
}
async function dCa(id){
  if(!confirm('Delete this category?'))return;
  await dO('categories',id);go('inventory');
}

/* ---------- CSV IMPORT ---------- */
function dlTemplate(){
  const csv='Name,SKU,Barcode,Cost,Price,Stock,Category\nSugar 1kg,SUG001,6001234567890,80,120,50,Food\nCooking Oil 1L,OIL001,6009876543210,150,220,30,Food\nSoap Bar,SOAP01,6001111222333,20,45,100,Household';
  const b=new Blob([csv],{type:'text/csv'}),a=document.createElement('a');
  a.href=URL.createObjectURL(b);a.download='moswax_template.csv';a.click();
  toast('Template downloaded');
}
let impData=[];
function parseCSVLine(line){
  const r=[];let cur='',inQ=false;
  for(let i=0;i<line.length;i++){
    const ch=line[i];
    if(ch==='"'){inQ=!inQ}
    else if(ch===','&&!inQ){r.push(cur.trim());cur=''}
    else cur+=ch;
  }
  r.push(cur.trim());
  return r;
}
async function previewImport(){
  const f=document.getElementById('impFile').files[0];
  if(!f)return;
  const txt=(await f.text()).replace(/^\uFEFF/,'');
  const lines=txt.split(/\r?\n/).filter(l=>l.trim());
  const pv=document.getElementById('impPreview');
  if(lines.length<2){pv.innerHTML='<div class="al al-w">File is empty or has no data rows</div>';return}
  const hdr=parseCSVLine(lines[0]).map(h=>h.toLowerCase());
  const ni=hdr.indexOf('name'),si=hdr.indexOf('sku'),bi=hdr.indexOf('barcode'),coi=hdr.indexOf('cost'),pri=hdr.indexOf('price'),sti=hdr.indexOf('stock'),cai=hdr.indexOf('category');
  if(ni===-1){pv.innerHTML='<div class="al al-w">Missing a "Name" column. Check the header row.</div>';return}
  const g=(c,i)=>i>-1?(c[i]||''):'';
  impData=[];
  for(let i=1;i<lines.length;i++){
    const c=parseCSVLine(lines[i]);
    if(!g(c,ni))continue;
    impData.push({name:g(c,ni),sku:g(c,si),barcode:g(c,bi),cost:parseFloat(g(c,coi))||0,price:parseFloat(g(c,pri))||0,stock:parseInt(g(c,sti),10)||0,category:g(c,cai)||'General'});
  }
  let h='<div class="imp-preview"><p><b>'+impData.length+' products found</b></p><table><tr><th>Name</th><th>Price</th><th>Stock</th><th>Status</th></tr>';
  impData.forEach(d=>{
    const ok=d.name&&d.price>0;
    h+='<tr><td>'+esc(d.name)+'</td><td>'+d.price+'</td><td>'+d.stock+'</td><td class="'+(ok?'imp-ok':'imp-err')+'">'+(ok?'✅':'❌ No price')+'</td></tr>';
  });
  h+='</table></div>';
  pv.innerHTML=h;
  document.getElementById('impBtn').style.display=impData.length?'inline-flex':'none';
}
async function doImport(){
  if(!impData.length)return;
  const ca=await gA('categories');
  const catMap={};
  ca.forEach(c=>catMap[c.name.toLowerCase()]=c.id);
  let added=0,skipped=0;
  for(const d of impData){
    if(!d.name||!d.price){skipped++;continue}
    const key=d.category.toLowerCase();
    let catId=catMap[key];
    if(!catId){catId=await aO('categories',{name:d.category});catMap[key]=catId}
    await aO('products',{name:d.name,sku:d.sku,barcode:d.barcode,catId:catId,cost:d.cost,price:d.price,stock:d.stock,reorder:5});
    added++;
  }
  impData=[];
  toast('Imported '+added+' products'+(skipped?' ('+skipped+' skipped)':''));
  go('inventory');
}
