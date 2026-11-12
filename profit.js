const hx=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pr2=n=>Math.round((Number(n)||0)*100)/100;
function inP(d,p){
  if(p==='all')return true;
  const x=new Date(d),n=new Date();
  if(p==='today')return x.toDateString()===n.toDateString();
  return x.getMonth()===n.getMonth()&&x.getFullYear()===n.getFullYear();
}
async function profitData(){
  const sa=await gA('sales'),it=await gA('saleItems'),pr=await gA('products');
  const cm={};pr.forEach(p=>cm[p.id]=p.cost||0);
  const sm={};sa.forEach(s=>sm[s.id]=s);
  const rows=[];
  it.forEach(i=>{
    const s=sm[i.saleId];if(!s)return;
    const est=i.cost==null;
    const unit=est?(cm[i.productId]||0):i.cost;
    rows.push({date:s.date,name:i.name,qty:i.qty,rev:i.price*i.qty,cost:unit*i.qty,est:est});
  });
  return rows;
}
function sumP(rows,p){
  let rev=0,cost=0;
  rows.forEach(r=>{if(inP(r.date,p)){rev+=r.rev;cost+=r.cost}});
  return{rev:pr2(rev),cost:pr2(cost),gp:pr2(rev-cost)};
}

/* P&L tab */
async function rPL(){
  const v=document.getElementById('plV');if(!v)return;
  const P=window._plP||'month';
  const rows=await profitData();
  const jrn=await gA('journal'),ac=await gA('accounts'),pr=await gA('products');
  const am={};ac.forEach(a=>am[a.id]=a);
  let oi=0,ex=0;const oir={},exr={};
  jrn.forEach(j=>{
    if(!inP(j.date,P))return;
    j.lines.forEach(l=>{
      const a=am[l.ai];if(!a)return;
      if(a.t==='Revenue'&&a.n!=='Sales Revenue'){const n=l.cr-l.dr;oi+=n;oir[a.n]=(oir[a.n]||0)+n}
      else if(a.t==='Expense'&&a.n!=='Cost of Goods'){const n=l.dr-l.cr;ex+=n;exr[a.n]=(exr[a.n]||0)+n}
    });
  });
  const t=sumP(rows,P);
  const net=pr2(t.gp+oi-ex);
  const mg=t.rev?(t.gp/t.rev*100).toFixed(1):'0.0';
  const bp={};let est=0;
  rows.forEach(r=>{
    if(!inP(r.date,P))return;
    const b=bp[r.name]||(bp[r.name]={q:0,rev:0,cost:0});
    b.q+=r.qty;b.rev+=r.rev;b.cost+=r.cost;
    if(r.est)est++;
  });
  const list=Object.entries(bp).map(([n,b])=>({n:n,q:b.q,rev:b.rev,cost:b.cost,p:b.rev-b.cost})).sort((a,b)=>b.p-a.p).slice(0,15);
  const nocost=pr.filter(p=>!p.cost).length;
  const row=(a,b,st)=>'<div class="sr" style="'+(st||'')+'"><span>'+a+'</span><b>'+b+'</b></div>';
  const col=net>=0?'var(--gn)':'var(--rd)';
  v.innerHTML=
   '<div class="f" style="max-width:200px;margin-bottom:8px"><select onchange="window._plP=this.value;rPL()">'
  +'<option value="today"'+(P==='today'?' selected':'')+'>Today</option>'
  +'<option value="month"'+(P==='month'?' selected':'')+'>This month</option>'
  +'<option value="all"'+(P==='all'?' selected':'')+'>All time</option></select></div>'
  +(nocost?'<div class="al al-w">⚠️ '+nocost+' product(s) have no cost price. Their profit shows as 100% of the sale. Add the cost in Inventory.</div>':'')
  +(est?'<div class="al al-w">ℹ️ '+est+' older sale line(s) were made before cost was recorded. Their cost is estimated from the product\'s current cost.</div>':'')
  +'<div class="sec"><h3>Gross profit</h3>'
  +row('Sales (excluding tax)',fmt(t.rev))
  +row('Cost of goods sold','- '+fmt(t.cost))
  +row('Gross profit',fmt(t.gp),'font-weight:700;color:'+(t.gp>=0?'var(--gn)':'var(--rd)'))
  +row('Margin',mg+'%')+'</div>'
  +'<div class="sec"><h3>Other income</h3>'
  +Object.entries(oir).filter(e=>e[1]).map(e=>row(hx(e[0]),fmt(e[1]))).join('')
  +row('Total other income',fmt(oi),'font-weight:700')+'</div>'
  +'<div class="sec"><h3>Expenses</h3>'
  +Object.entries(exr).filter(e=>e[1]).map(e=>row(hx(e[0]),fmt(e[1]))).join('')
  +row('Total expenses',fmt(ex),'font-weight:700')+'</div>'
  +'<div class="sec" style="border:2px solid '+col+'"><h3 style="color:'+col+'">'+(net>=0?'📈 Net profit':'📉 Net loss')+'</h3><div style="font-size:22px;font-weight:800;color:'+col+'">'+fmt(Math.abs(net))+'</div></div>'
  +'<div class="sec"><h3>Profit by product</h3><div class="tw"><table><tr><th>Product</th><th>Qty</th><th>Sales</th><th>Cost</th><th>Profit</th><th>Margin</th></tr>'
  +list.map(x=>'<tr><td>'+hx(x.n)+'</td><td>'+x.q+'</td><td>'+fmt(x.rev)+'</td><td>'+fmt(x.cost)+'</td><td><b style="color:'+(x.p>=0?'var(--gn)':'var(--rd)')+'">'+fmt(x.p)+'</b></td><td>'+(x.rev?(x.p/x.rev*100).toFixed(1):'0.0')+'%</td></tr>').join('')
  +(!list.length?'<tr><td colspan="6" style="text-align:center;color:var(--tx2)">No sales in this period</td></tr>':'')
  +'</table></div></div>';
}

/* Dashboard: add Today profit card */
const _rDash=rDash;
rDash=async function(el){
  await _rDash(el);
  try{
    const t=sumP(await profitData(),'today');
    const box=el.querySelector('.cds');
    if(box)box.insertAdjacentHTML('beforeend','<div class="cd"><div class="cl">Today profit</div><div class="cv '+(t.gp>=0?'g':'r')+'">'+fmt(t.gp)+'</div></div>');
  }catch(e){}
};

/* Finance overview: add This month profit card */
const _rFin=rFin;
rFin=async function(el){
  await _rFin(el);
  try{
    const t=sumP(await profitData(),'month');
    const box=el.querySelector('#fT0 .cds');
    if(box)box.insertAdjacentHTML('beforeend','<div class="cd"><div class="cl">Month profit</div><div class="cv '+(t.gp>=0?'g':'r')+'">'+fmt(t.gp)+'</div></div>');
  }catch(e){}
};
