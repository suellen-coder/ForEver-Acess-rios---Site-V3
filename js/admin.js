import { CATALOGO_INICIAL } from "./catalogo-inicial.js";
import { db, storage } from "./firebase-config.js";
import { observeAuth, loginAdmin, logoutAdmin } from "./auth.js";
import { initializeStock } from "./estoque.js";
import { collection, doc, onSnapshot, updateDoc, setDoc, deleteDoc, query, orderBy, serverTimestamp, getDoc, runTransaction, addDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-storage.js";

const $=s=>document.querySelector(s); const $$=s=>[...document.querySelectorAll(s)];
const state={stock:[],products:[],orders:[],finances:[],settings:{lowStock:2},unsubs:[],editingProduct:null,editingFinance:null,currentOrder:null,manualItems:[]};
const views={dashboard:"Dashboard",pedidos:"Pedidos",produtos:"Produtos",estoque:"Estoque",clientes:"Clientes",financeiro:"Financeiro",configuracoes:"Configurações"};
const fmt=n=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(n)||0);
const esc=v=>String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
const toDate=v=>v?.toDate?.()|| (v?new Date(v):null);
const dateFmt=v=>{const d=toDate(v);return d&&!isNaN(d)?d.toLocaleDateString("pt-BR",{day:"2-digit",month:"short",year:"numeric"}):"—"};
const dateTimeFmt=v=>{const d=toDate(v);return d&&!isNaN(d)?d.toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}):"—"};
const category=id=>id.startsWith("FB")?"Brincos":id.startsWith("FC")?"Colares":id.startsWith("FP")?"Pulseiras":"Outros";
const stockStatus=q=>q<=0?{key:"empty",label:"Esgotado"}:q<=Number(state.settings.lowStock||2)?{key:"low",label:"Baixo"}:{key:"available",label:"Disponível"};
const orderStatus=s=>String(s||"novo").toLowerCase();
const imageSrc=value=>{const src=String(value||"").trim();if(!src)return"";return /^(https?:|data:|blob:)/i.test(src)?src:`../${src.replace(/^\.\.\//,"")}`};
const paymentLabel=value=>({pix:"Pix",cartao:"Cartão",dinheiro:"Dinheiro",outro:"Outro"}[value]||value||"Não informado");

function toast(message,type="success"){const el=document.createElement("div");el.className=`toast ${type}`;el.textContent=message;$("#toast-container").append(el);setTimeout(()=>el.remove(),3200)}
function friendlyAuthError(e){return e?.code?.includes("invalid-credential")?"E-mail ou senha inválidos.":e?.code?.includes("too-many")?"Muitas tentativas. Aguarde um pouco.":"Não foi possível entrar. Verifique os dados."}
function setTheme(t){document.documentElement.dataset.theme=t;localStorage.setItem("forever-admin-theme",t);$("#theme-button").textContent=t==="dark"?"☀":"◐"}
function openSidebar(){$("#sidebar").classList.add("open");$("#sidebar-overlay").hidden=false}function closeSidebar(){$("#sidebar").classList.remove("open");$("#sidebar-overlay").hidden=true}
function switchView(name){$$('.view-section').forEach(s=>s.hidden=s.id!==`${name}-section`);$$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===name));$("#page-title").textContent=views[name]||"Painel";closeSidebar();window.scrollTo({top:0,behavior:"smooth"})}

function normalizedOrders(){return state.orders.map(o=>({...o,total:Number(o.total??o.valorTotal??0),status:orderStatus(o.status),createdAt:o.criadoEm??o.createdAt,customer:o.cliente??o.customer??{}}))}
function validOrders(){return normalizedOrders().filter(o=>o.status!=="cancelado")}
function updateAll(){renderDashboard();renderStock();renderProducts();renderOrders();renderClients();renderFinance()}

function renderDashboard(){const orders=normalizedOrders(),valid=validOrders(),revenue=valid.reduce((s,o)=>s+o.total,0),pending=orders.filter(o=>o.status==="novo").length,totalUnits=state.stock.reduce((s,p)=>s+p.quantity,0),low=state.stock.filter(p=>p.quantity>0&&p.quantity<=state.settings.lowStock),empty=state.stock.filter(p=>p.quantity<=0),available=state.stock.filter(p=>p.quantity>state.settings.lowStock);$("#metric-revenue").textContent=fmt(revenue);$("#metric-orders").textContent=orders.length;$("#metric-pending").textContent=`${pending} aguardando`;$("#pending-nav-count").textContent=pending;$("#metric-products").textContent=Math.max(state.products.length,state.stock.length);$("#metric-units").textContent=`${totalUnits} unidades em estoque`;$("#metric-low").textContent=low.length+empty.length;$("#metric-empty").textContent=`${empty.length} esgotados`;$("#dashboard-date").textContent=new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long"});
const attention=[...empty,...low].sort((a,b)=>a.quantity-b.quantity).slice(0,6);$("#attention-list").innerHTML=attention.length?attention.map(p=>`<div class="list-row"><div><strong>${esc(p.id)}</strong><small>${category(p.id)}</small></div><span class="status-badge status-${stockStatus(p.quantity).key}">${p.quantity} un.</span></div>`).join(""):'<p class="muted">Estoque sob controle.</p>';
const recent=orders.slice().sort((a,b)=>(toDate(b.createdAt)||0)-(toDate(a.createdAt)||0)).slice(0,5);$("#recent-orders").innerHTML=recent.length?recent.map(o=>`<div class="list-row"><div><strong>${esc(o.customer.nome||o.customer.name||"Cliente")}</strong><small>${dateTimeFmt(o.createdAt)}</small></div><div style="text-align:right"><span class="status-badge status-${o.status}">${o.status}</span><small>${fmt(o.total)}</small></div></div>`).join(""):'<p class="muted">Nenhum pedido salvo ainda.</p>';
$("#stock-available").textContent=available.length;$("#stock-low").textContent=low.length;$("#stock-empty").textContent=empty.length;$("#stock-donut-total").textContent=state.stock.length;const total=Math.max(state.stock.length,1),a=available.length/total*100,l=low.length/total*100;$("#stock-donut").style.background=`conic-gradient(var(--ok) 0 ${a}%,var(--warn) ${a}% ${a+l}%,var(--danger) ${a+l}% 100%)`;
renderRevenueChart(valid)}
function renderRevenueChart(orders){const days=[];for(let i=6;i>=0;i--){const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-i);days.push({d,value:0})}orders.forEach(o=>{const d=toDate(o.createdAt);if(!d)return;const day=days.find(x=>x.d.toDateString()===d.toDateString());if(day)day.value+=o.total});const max=Math.max(...days.map(d=>d.value),1);$("#revenue-chart").innerHTML=days.map(x=>`<div class="chart-column"><div class="chart-bar" data-value="${fmt(x.value)}" style="height:${Math.max(4,x.value/max*100)}%"></div><small>${x.d.toLocaleDateString("pt-BR",{weekday:"short"}).replace('.','')}</small></div>`).join("")}

function filteredStock(){const term=$("#stock-search").value.trim().toLowerCase(),f=$("#stock-filter").value;return state.stock.filter(p=>{const prod=state.products.find(x=>x.id===p.id);const matches=!term||`${p.id} ${prod?.nome||""}`.toLowerCase().includes(term);return matches&&(f==="all"||(f==="available"&&p.quantity>state.settings.lowStock)||(f==="low"&&p.quantity>0&&p.quantity<=state.settings.lowStock)||(f==="empty"&&p.quantity<=0))})}
function renderStock(){const list=filteredStock();$("#stock-empty-state").hidden=!!list.length;$("#stock-table-body").innerHTML=list.map(p=>{const st=stockStatus(p.quantity),prod=state.products.find(x=>x.id===p.id);return`<tr data-id="${p.id}"><td><strong>${esc(p.id)}</strong></td><td><strong>${esc(prod?.nome||"Produto sem nome cadastrado")}</strong></td><td>${esc(prod?.categoria||category(p.id))}</td><td><div class="quantity-control"><button data-step="-1">−</button><input type="number" min="0" value="${p.quantity}"><button data-step="1">+</button></div></td><td><span class="status-badge status-${st.key}">${st.label}</span></td><td><button class="save-stock-button">Salvar</button></td></tr>`}).join("")}
async function saveStock(row){const id=row.dataset.id,q=Math.max(0,Math.floor(Number(row.querySelector('input').value)||0)),btn=row.querySelector('.save-stock-button');btn.disabled=true;btn.textContent='Salvando...';try{await setDoc(doc(db,'estoque',id),{quantidade:q,ativo:q>0,atualizadoEm:serverTimestamp()},{merge:true});toast(`Estoque de ${id} atualizado.`)}catch(e){console.error(e);toast('Erro ao atualizar estoque.','error')}finally{btn.disabled=false;btn.textContent='Salvar'}}

function filteredProducts(){const s=$("#products-search").value.trim().toLowerCase(),f=$("#products-filter").value;return state.products.filter(p=>(!s||`${p.id} ${p.nome}`.toLowerCase().includes(s))&&(f==='all'||p.categoria===f))}
function renderProducts(){const list=filteredProducts();$("#products-empty").hidden=!!list.length;$("#products-grid").innerHTML=list.map(p=>{const stock=state.stock.find(s=>s.id===p.id)?.quantity??0;const promo=Number(p.precoPromocional)||0;const finalPrice=promo>0&&promo<Number(p.preco||0)?promo:Number(p.preco||0);return`<article class="product-admin-card"><div class="product-admin-image">${p.imagem?`<img src="${esc(imageSrc(p.imagem))}" onerror="this.parentElement.innerHTML='<span>◇</span>'">`:'<span>◇</span>'}${p.destaque?'<span class="admin-product-featured">★ Destaque</span>':''}</div><div class="product-admin-body"><span class="status-badge ${p.ativo===false?'status-cancelado':'status-available'}">${p.ativo===false?'Inativo':'Ativo'}</span><h3>${esc(p.nome||p.id)}</h3><p>${esc(p.id)} • ${esc(p.categoria||category(p.id))}</p><div class="product-admin-meta"><strong>${fmt(finalPrice)}</strong>${promo>0&&promo<Number(p.preco||0)?`<small><s>${fmt(p.preco)}</s></small>`:''}<small>${stock} em estoque</small></div><div class="product-actions"><button data-edit-product="${p.id}">Editar</button><button data-delete-product="${p.id}">Excluir</button></div></div></article>`}).join("")}
function updateProductImagePreview(src=''){const img=$("#product-image-preview"),empty=$("#product-image-preview-empty");if(src){img.src=imageSrc(src);img.hidden=false;empty.hidden=true}else{img.removeAttribute('src');img.hidden=true;empty.hidden=false}}
function openProductModal(product=null){state.editingProduct=product?.id||null;const stock=product?state.stock.find(item=>item.id===product.id)?.quantity??0:0;$("#product-modal-title").textContent=product?'Editar produto':'Novo produto';$("#product-sku").value=product?.id||'';$("#product-sku").disabled=!!product;$("#product-name").value=product?.nome||'';$("#product-category").value=product?.categoria||'Brincos';$("#product-price").value=product?.preco??'';$("#product-promo-price").value=product?.precoPromocional??'';$("#product-stock").value=stock;$("#product-order").value=product?.ordem??0;$("#product-material").value=product?.material||'';$("#product-color").value=product?.cor||'';$("#product-tags").value=Array.isArray(product?.tags)?product.tags.join(', '):product?.tags||'';$("#product-image").value=product?.imagem||'';$("#product-image-file").value='';updateProductImagePreview(product?.imagem||'');$("#product-description").value=product?.descricao||'';$("#product-active").checked=product?.ativo!==false;$("#product-featured").checked=product?.destaque===true;$("#product-form-message").textContent='';$("#product-modal").hidden=false}function closeProductModal(){$("#product-modal").hidden=true}
async function saveProduct(e){
 e.preventDefault();
 const id=$("#product-sku").value.trim().toUpperCase();
 if(!id)return;
 const message=$("#product-form-message"),submit=e.submitter;
 message.textContent='';if(submit){submit.disabled=true;submit.textContent='Salvando...'}
 try{
  let image=$("#product-image").value.trim();
  const file=$("#product-image-file").files?.[0];
  if(file){
   if(!/^image\/(jpeg|png|webp)$/i.test(file.type))throw new Error('Use uma imagem JPG, PNG ou WebP.');
   if(file.size>5*1024*1024)throw new Error('A imagem deve ter no máximo 5 MB.');
   const ext=(file.name.split('.').pop()||'jpg').toLowerCase();
   const storageRef=ref(storage,`produtos/${id}-${Date.now()}.${ext}`);
   message.textContent='Enviando imagem...';
   const uploaded=await uploadBytes(storageRef,file,{contentType:file.type});
   image=await getDownloadURL(uploaded.ref);
  }
  const data={nome:$("#product-name").value.trim(),categoria:$("#product-category").value,preco:Number($("#product-price").value)||0,precoPromocional:Number($("#product-promo-price").value)||0,imagem:image,descricao:$("#product-description").value.trim(),material:$("#product-material").value.trim(),cor:$("#product-color").value.trim(),tags:$("#product-tags").value.split(",").map(tag=>tag.trim()).filter(Boolean),ativo:$("#product-active").checked,destaque:$("#product-featured").checked,ordem:Math.max(0,Number($("#product-order").value)||0),atualizadoEm:serverTimestamp()};
  await setDoc(doc(db,'produtos',id),data,{merge:true});await setDoc(doc(db,'estoque',id),{quantidade:Math.max(0,Math.floor(Number($('#product-stock').value)||0)),ativo:Math.max(0,Number($('#product-stock').value)||0)>0,atualizadoEm:serverTimestamp()},{merge:true});
  if(!state.stock.some(s=>s.id===id))await setDoc(doc(db,'estoque',id),{quantidade:0,ativo:false,atualizadoEm:serverTimestamp()},{merge:true});
  toast('Produto salvo.');closeProductModal()
 }catch(err){console.error(err);message.textContent=err.message||'Erro ao salvar produto.'}
 finally{if(submit){submit.disabled=false;submit.textContent='Salvar produto'}}
}
async function deleteProduct(id){if(!confirm(`Excluir o produto ${id}? O estoque será mantido.`))return;try{await deleteDoc(doc(db,'produtos',id));toast('Produto excluído.')}catch(e){toast('Erro ao excluir produto.','error')}}

function filteredOrders(){const s=$("#orders-search").value.trim().toLowerCase(),f=$("#orders-filter").value;return normalizedOrders().filter(o=>{const items=(o.itens||o.items||[]).map(i=>`${i.id||i.codigo||i.sku||''} ${i.nome||i.name||''}`).join(' ');return(f==='all'||o.status===f)&&(!s||`${o.id} ${o.customer.nome||''} ${o.customer.telefone||''} ${o.customer.cidade||''} ${o.formaPagamentoLabel||o.formaPagamento||''} ${items}`.toLowerCase().includes(s))}).sort((a,b)=>(toDate(b.createdAt)||0)-(toDate(a.createdAt)||0))}
function renderOrders(){const list=filteredOrders();$("#orders-empty").hidden=!!list.length;$("#orders-grid").innerHTML=list.map(o=>{const items=o.itens||o.items||[];const codes=items.map(i=>i.id||i.codigo||i.sku).filter(Boolean).join(", ");return`<article class="order-card" data-order-id="${o.id}"><div class="order-card-head"><small>#${esc(o.id.slice(0,8).toUpperCase())}</small><span class="status-badge status-${o.status}">${o.status}</span></div><h3>${esc(o.customer.nome||o.customer.name||'Cliente')}</h3><p>${esc(o.customer.cidade||'Retirada')} • ${dateTimeFmt(o.createdAt)}</p><p><strong>Produtos:</strong> ${esc(codes||'Sem código')}</p><p><strong>Pagamento:</strong> ${esc(o.formaPagamentoLabel||o.formaPagamento||'Não informado')}</p><div class="order-card-total"><span>${items.reduce((s,i)=>s+(Number(i.quantidade||i.quantity)||0),0)} item(ns)</span><strong>${fmt(o.total)}</strong></div></article>`}).join("")}
function openOrder(id){const o=normalizedOrders().find(x=>x.id===id);if(!o)return;state.currentOrder=id;$("#order-modal-title").textContent=`Pedido #${id.slice(0,8).toUpperCase()}`;$("#order-status-select").value=o.status;const c=o.customer,items=o.itens||o.items||[];$("#order-modal-content").innerHTML=`<div class="order-details"><div class="order-summary-grid"><div><span>Cliente</span><strong>${esc(c.nome||c.name||'—')}</strong></div><div><span>Telefone</span><strong>${esc(c.telefone||c.phone||'—')}</strong></div><div><span>Recebimento</span><strong>${esc(o.tipoEntrega||o.deliveryType||'—')}</strong></div><div><span>Pagamento</span><strong>${esc(o.formaPagamentoLabel||o.formaPagamento||'—')}</strong></div><div><span>Total</span><strong>${fmt(o.total)}</strong></div><div><span>Cidade</span><strong>${esc(c.cidade||'—')}</strong></div><div><span>Bairro</span><strong>${esc(c.bairro||'—')}</strong></div><div><span>Data</span><strong>${dateTimeFmt(o.createdAt)}</strong></div></div><div class="order-items">${items.map(i=>`<div class="order-item-row"><span><b>${esc(i.id||i.codigo||i.sku||'SEM CÓDIGO')}</b> — ${esc(i.nome||i.name||'Produto')} × ${i.quantidade||i.quantity}</span><strong>${fmt((i.preco||i.price)*(i.quantidade||i.quantity))}</strong></div>`).join('')}</div>${c.endereco?`<p class="muted"><strong>Endereço:</strong> ${esc(c.endereco)} ${esc(c.complemento||'')}</p>`:''}</div>`;$("#order-modal").hidden=false}function closeOrder(){$("#order-modal").hidden=true;state.currentOrder=null}
async function saveOrderStatus(){
 if(!state.currentOrder)return;

 const newStatus=orderStatus($("#order-status-select").value);
 const orderRef=doc(db,'pedidos',state.currentOrder);

 try{
  await runTransaction(db,async transaction=>{
   const orderSnap=await transaction.get(orderRef);

   if(!orderSnap.exists()){
    throw new Error('Pedido não encontrado.');
   }

   const orderData=orderSnap.data();
   const oldStatus=orderStatus(orderData.status);
   const items=Array.isArray(orderData.itens)
    ?orderData.itens
    :Array.isArray(orderData.items)
      ?orderData.items
      :[];

   const wasCanceled=oldStatus==='cancelado';
   const willCancel=newStatus==='cancelado';
   const stockWasRestored=orderData.estoqueRestaurado===true;

   if(!wasCanceled&&willCancel&&!stockWasRestored){
    const stockReads=[];

    for(const item of items){
     const id=String(item.id||item.codigo||item.sku||'').trim().toUpperCase();
     const quantity=Math.max(0,Math.floor(Number(item.quantidade??item.quantity)||0));

     if(!id||quantity<=0)continue;

     const stockRef=doc(db,'estoque',id);
     const stockSnap=await transaction.get(stockRef);

     stockReads.push({id,quantity,ref:stockRef,snap:stockSnap});
    }

    for(const stockItem of stockReads){
     const current=stockItem.snap.exists()
      ?Number(stockItem.snap.data()?.quantidade)||0
      :0;

     const restored=current+stockItem.quantity;

     if(stockItem.snap.exists()){
      transaction.update(stockItem.ref,{
       quantidade:restored,
       ativo:restored>0,
       atualizadoEm:serverTimestamp()
      });
     }else{
      transaction.set(stockItem.ref,{
       quantidade:restored,
       ativo:restored>0,
       atualizadoEm:serverTimestamp()
      });
     }
    }

    transaction.update(orderRef,{
     status:'cancelado',
     estoqueRestaurado:true,
     canceladoEm:serverTimestamp(),
     atualizadoEm:serverTimestamp()
    });

    return;
   }

   if(wasCanceled&&!willCancel&&stockWasRestored){
    const stockReads=[];

    for(const item of items){
     const id=String(item.id||item.codigo||item.sku||'').trim().toUpperCase();
     const quantity=Math.max(0,Math.floor(Number(item.quantidade??item.quantity)||0));

     if(!id||quantity<=0)continue;

     const stockRef=doc(db,'estoque',id);
     const stockSnap=await transaction.get(stockRef);
     const available=Number(stockSnap.data()?.quantidade)||0;

     if(!stockSnap.exists()||available<quantity){
      throw new Error(`Estoque insuficiente para reativar o pedido (${id}). Disponível: ${available}.`);
     }

     stockReads.push({id,quantity,ref:stockRef,snap:stockSnap});
    }

    for(const stockItem of stockReads){
     const current=Number(stockItem.snap.data()?.quantidade)||0;
     const next=current-stockItem.quantity;

     transaction.update(stockItem.ref,{
      quantidade:next,
      ativo:next>0,
      atualizadoEm:serverTimestamp()
     });
    }

    transaction.update(orderRef,{
     status:newStatus,
     estoqueRestaurado:false,
     reativadoEm:serverTimestamp(),
     atualizadoEm:serverTimestamp()
    });

    return;
   }

   transaction.update(orderRef,{
    status:newStatus,
    atualizadoEm:serverTimestamp()
   });
  });

  toast(
   newStatus==='cancelado'
    ?'Pedido cancelado e estoque devolvido.'
    :'Status atualizado.'
  );
  closeOrder();

 }catch(e){
  console.error(e);
  toast(e?.message||'Erro ao atualizar o pedido.','error');
 }
}
function exportOrders(){const rows=[["Pedido","Cliente","Telefone","Cidade","Produtos (código e nome)","Pagamento","Status","Total","Data"],...filteredOrders().map(o=>[o.id,o.customer.nome||'',o.customer.telefone||'',o.customer.cidade||'',(o.itens||o.items||[]).map(i=>`${i.id||i.codigo||i.sku||'SEM CÓDIGO'} - ${i.nome||i.name||'Produto'} x${i.quantidade||i.quantity||0}`).join(' | '),o.formaPagamentoLabel||o.formaPagamento||'',o.status,o.total,dateTimeFmt(o.createdAt)])];const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(';')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv'}));a.download='pedidos-forever.csv';a.click();URL.revokeObjectURL(a.href)}

function manualAvailableProducts(){return state.products.filter(p=>p.ativo!==false).sort((a,b)=>(a.categoria||'').localeCompare(b.categoria||'')||(a.nome||a.id).localeCompare(b.nome||b.id))}
function manualProductOptions(selected=''){return manualAvailableProducts().map(p=>{const q=state.stock.find(s=>s.id===p.id)?.quantity??0;return `<option value="${esc(p.id)}" ${p.id===selected?'selected':''} ${q<=0?'disabled':''}>${esc(p.id)} — ${esc(p.nome||p.id)} (${q} un.)</option>`}).join('')}
function openNewOrder(){state.manualItems=[{id:'',quantity:1}];$("#new-order-form").reset();$("#manual-status").value='confirmado';$("#manual-order-message").textContent='';renderManualItems();$("#new-order-modal").hidden=false}
function closeNewOrder(){$("#new-order-modal").hidden=true;state.manualItems=[]}
function renderManualItems(){const box=$("#manual-order-items");box.innerHTML=state.manualItems.map((item,index)=>`<div class="manual-order-item" data-manual-index="${index}"><label><span>Produto</span><select class="manual-product-select" required><option value="">Selecione...</option>${manualProductOptions(item.id)}</select></label><label><span>Quantidade</span><input class="manual-product-quantity" type="number" min="1" value="${item.quantity||1}" required></label><button type="button" class="manual-remove-item" title="Remover">✕</button></div>`).join('');updateManualTotal()}
function readManualItems(){state.manualItems=[...$("#manual-order-items").querySelectorAll('.manual-order-item')].map(row=>({id:row.querySelector('.manual-product-select').value,quantity:Math.max(1,Math.floor(Number(row.querySelector('.manual-product-quantity').value)||1))}))}
function updateManualTotal(){readManualItems();const total=state.manualItems.reduce((sum,item)=>{const p=state.products.find(x=>x.id===item.id);return sum+(Number(p?.preco)||0)*item.quantity},0);$("#manual-order-total").textContent=fmt(total)}
async function saveManualOrder(e){e.preventDefault();readManualItems();const message=$("#manual-order-message"),button=$("#save-manual-order");message.textContent='';const items=state.manualItems.filter(i=>i.id);if(!items.length){message.textContent='Adicione pelo menos um produto.';return}const ids=items.map(i=>i.id);if(new Set(ids).size!==ids.length){message.textContent='Não repita o mesmo produto. Ajuste a quantidade em uma única linha.';return}button.disabled=true;button.textContent='Salvando...';try{const orderRef=doc(collection(db,'pedidos'));await runTransaction(db,async transaction=>{const finalItems=[];for(const item of items){const product=state.products.find(p=>p.id===item.id);if(!product)throw new Error(`Produto ${item.id} não encontrado.`);const stockRef=doc(db,'estoque',item.id),stockDoc=await transaction.get(stockRef),available=Number(stockDoc.data()?.quantidade)||0;if(!stockDoc.exists()||available<item.quantity)throw new Error(`Estoque insuficiente para ${product.nome||item.id}. Disponível: ${available}.`);transaction.update(stockRef,{quantidade:available-item.quantity,ativo:available-item.quantity>0,atualizadoEm:serverTimestamp()});finalItems.push({id:item.id,nome:product.nome||item.id,preco:Number(product.preco)||0,quantidade:item.quantity,imagem:product.imagem||''})}const subtotal=finalItems.reduce((sum,i)=>sum+i.preco*i.quantidade,0),payment=$("#manual-payment").value;transaction.set(orderRef,{cliente:{nome:$("#manual-customer-name").value.trim(),telefone:$("#manual-customer-phone").value.replace(/\D/g,''),cidade:'',bairro:'',endereco:'',complemento:''},itens:finalItems,tipoEntrega:'retirada',formaPagamento:payment,formaPagamentoLabel:paymentLabel(payment),subtotal,frete:0,total:subtotal,status:$("#manual-status").value,estoqueBaixado:true,estoqueRestaurado:false,origem:'admin-presencial',criadoEm:serverTimestamp()})});toast('Pedido presencial criado e estoque atualizado.');closeNewOrder()}catch(err){console.error(err);message.textContent=err.message||'Não foi possível criar o pedido.'}finally{button.disabled=false;button.textContent='Salvar pedido'}}

function clientData(){const map=new Map();validOrders().forEach(o=>{const c=o.customer,name=(c.nome||c.name||'Cliente').trim(),phone=String(c.telefone||c.phone||'').trim(),key=phone||name.toLowerCase();const cur=map.get(key)||{name,phone:phone||'—',city:c.cidade||'—',orders:0,total:0,last:null};cur.orders++;cur.total+=o.total;if(phone)cur.phone=phone;if(c.cidade)cur.city=c.cidade;const d=toDate(o.createdAt);if(d&&(!cur.last||d>cur.last))cur.last=d;map.set(key,cur)});return [...map.values()].sort((a,b)=>b.total-a.total)}
function renderClients(){const clients=clientData(),total=validOrders().reduce((s,o)=>s+o.total,0);$("#clients-total").textContent=clients.length;$("#clients-repeat").textContent=clients.filter(c=>c.orders>1).length;$("#clients-ticket").textContent=fmt(validOrders().length?total/validOrders().length:0);$("#clients-table-body").innerHTML=clients.map(c=>`<tr><td><strong>${esc(c.name)}</strong></td><td>${esc(c.phone)}</td><td>${esc(c.city)}</td><td>${c.orders}</td><td>${fmt(c.total)}</td><td>${dateFmt(c.last)}</td></tr>`).join('')}
const financeCategories={entrada:["Venda avulsa","Recebimento","Aporte","Frete recebido","Outras entradas"],saida:["Mercadorias","Embalagens","Fretes e entregas","Marketing","Taxas de cartão","Impostos","Despesas administrativas","Pró-labore","Outras saídas"],investimento:["Estoque","Marketing e anúncios","Equipamentos","Tecnologia","Estrutura","Expansão","Outros investimentos"]};
const financeTypeLabel=t=>({entrada:"Entrada",saida:"Saída",investimento:"Investimento"}[t]||t);
const financePaymentLabel=p=>({pix:"Pix",dinheiro:"Dinheiro",cartao:"Cartão",boleto:"Boleto",transferencia:"Transferência",outro:"Outro"}[p]||p||"—");
function normalizeFinance(f){return {...f,value:Number(f.valor??f.value??0),type:String(f.tipo??f.type??"saida"),status:String(f.status||"pago"),date:f.data??f.date??f.criadoEm,description:f.descricao??f.description??"",category:f.categoria??f.category??"Outros"}}
function filteredFinances(){const term=$("#finance-search")?.value.trim().toLowerCase()||"",type=$("#finance-type-filter")?.value||"all",status=$("#finance-status-filter")?.value||"all";return state.finances.map(normalizeFinance).filter(f=>(!term||`${f.description} ${f.category}`.toLowerCase().includes(term))&&(type==="all"||f.type===type)&&(status==="all"||f.status===status)).sort((a,b)=>(toDate(b.date)||0)-(toDate(a.date)||0))}
function renderFinance(){if(!$("#finance-balance"))return;const sales=validOrders().reduce((s,o)=>s+o.total,0),items=state.finances.map(normalizeFinance),paid=items.filter(f=>f.status==="pago"),manualIncome=paid.filter(f=>f.type==="entrada").reduce((s,f)=>s+f.value,0),expenses=paid.filter(f=>f.type==="saida").reduce((s,f)=>s+f.value,0),investments=paid.filter(f=>f.type==="investimento").reduce((s,f)=>s+f.value,0),income=sales+manualIncome,balance=income-expenses-investments,pending=items.filter(f=>f.status==="pendente"),pendingValue=pending.reduce((s,f)=>s+f.value,0);$("#finance-balance").textContent=fmt(balance);$("#finance-income").textContent=fmt(income);$("#finance-expenses").textContent=fmt(expenses);$("#finance-investments").textContent=fmt(investments);$("#finance-pending").textContent=fmt(pendingValue);$("#finance-pending-count").textContent=`${pending.length} movimentaç${pending.length===1?'ão':'ões'}`;
const summary=[['Vendas do painel',sales],['Outras entradas',manualIncome],['Saídas',expenses],['Investimentos',investments],['Resultado líquido',balance]],max=Math.max(...summary.map(x=>Math.abs(x[1])),1);$("#finance-summary-list").innerHTML=summary.map(([label,value])=>`<div class="finance-row"><span>${label}</span><div class="finance-track"><div class="finance-fill" style="width:${Math.abs(value)/max*100}%"></div></div><strong>${fmt(value)}</strong></div>`).join('');
const out=paid.filter(f=>f.type!=="entrada"),byCat={};out.forEach(f=>byCat[f.category]=(byCat[f.category]||0)+f.value);const cats=Object.entries(byCat).sort((a,b)=>b[1]-a[1]).slice(0,6),catMax=Math.max(...cats.map(x=>x[1]),1);$("#finance-category-list").innerHTML=cats.length?cats.map(([label,value])=>`<div class="finance-row"><span>${esc(label)}</span><div class="finance-track"><div class="finance-fill" style="width:${value/catMax*100}%"></div></div><strong>${fmt(value)}</strong></div>`).join(''):'<p class="muted">Cadastre uma saída ou investimento para visualizar.</p>';
const list=filteredFinances();$("#finance-empty").hidden=!!list.length;$("#finance-table-body").innerHTML=list.map(f=>`<tr><td>${dateFmt(f.date)}</td><td><strong>${esc(f.description)}</strong>${f.observacoes?`<small class="table-note">${esc(f.observacoes)}</small>`:''}</td><td>${esc(f.category)}</td><td><span class="finance-type finance-type-${f.type}">${financeTypeLabel(f.type)}</span></td><td>${financePaymentLabel(f.formaPagamento||f.payment)}</td><td><select class="finance-status-select status-${f.status==='pago'?'available':'low'}" data-finance-status-id="${f.id}" aria-label="Editar status da movimentação"><option value="pago" ${f.status==='pago'?'selected':''}>Pago/Recebido</option><option value="pendente" ${f.status==='pendente'?'selected':''}>Pendente</option></select></td><td class="finance-value ${f.type==='entrada'?'positive':'negative'}">${f.type==='entrada'?'+':'−'} ${fmt(f.value)}</td><td><div class="finance-actions"><button class="icon-button finance-edit" data-edit-finance="${f.id}" title="Editar movimentação" aria-label="Editar movimentação">✎</button><button class="icon-button finance-delete" data-delete-finance="${f.id}" title="Excluir movimentação" aria-label="Excluir movimentação">✕</button></div></td></tr>`).join('')}
function updateFinanceCategories(){const type=$("#finance-type").value,current=$("#finance-category").value;$("#finance-category").innerHTML=financeCategories[type].map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');if(financeCategories[type].includes(current))$("#finance-category").value=current}
function openFinanceModal(finance=null){state.editingFinance=finance?normalizeFinance(finance):null;$("#finance-form").reset();$("#finance-form-message").textContent='';$("#finance-modal-title").textContent=state.editingFinance?'Editar movimentação':'Nova movimentação';$("#save-finance-button").textContent=state.editingFinance?'Salvar alterações':'Salvar movimentação';if(state.editingFinance){const f=state.editingFinance;$("#finance-type").value=f.type;updateFinanceCategories();if(financeCategories[f.type]?.includes(f.category))$("#finance-category").value=f.category;$("#finance-description").value=f.description;$("#finance-value").value=f.value;const d=toDate(f.date);$("#finance-date").value=typeof f.date==='string'?f.date:(d&&!isNaN(d)?d.toISOString().slice(0,10):'');$("#finance-payment").value=f.formaPagamento||f.payment||'pix';$("#finance-status").value=f.status;$("#finance-notes").value=f.observacoes||''}else{$("#finance-date").value=new Date().toISOString().slice(0,10);updateFinanceCategories()}$("#finance-modal").hidden=false}
function closeFinanceModal(){state.editingFinance=null;$("#finance-modal").hidden=true}
async function saveFinance(e){e.preventDefault();const button=$("#save-finance-button"),message=$("#finance-form-message"),editingId=state.editingFinance?.id;message.textContent='';button.disabled=true;button.textContent=editingId?'Salvando alterações...':'Salvando...';const data={tipo:$("#finance-type").value,categoria:$("#finance-category").value,descricao:$("#finance-description").value.trim(),valor:Number($("#finance-value").value),data:$("#finance-date").value,formaPagamento:$("#finance-payment").value,status:$("#finance-status").value,observacoes:$("#finance-notes").value.trim(),atualizadoEm:serverTimestamp()};try{if(editingId){await updateDoc(doc(db,'movimentacoesFinanceiras',editingId),data);toast('Movimentação atualizada com sucesso.')}else{await addDoc(collection(db,'movimentacoesFinanceiras'),{...data,criadoEm:serverTimestamp()});toast('Movimentação financeira salva.')}closeFinanceModal()}catch(err){console.error(err);message.textContent=editingId?'Não foi possível atualizar a movimentação.':'Não foi possível salvar. Verifique as regras do Firestore.'}finally{button.disabled=false;button.textContent=editingId?'Salvar alterações':'Salvar movimentação'}}
async function deleteFinance(id){if(!confirm('Excluir esta movimentação financeira?'))return;try{await deleteDoc(doc(db,'movimentacoesFinanceiras',id));toast('Movimentação excluída.')}catch(err){console.error(err);toast('Não foi possível excluir.','error')}}
async function updateFinanceStatus(id,status,select){const previous=status==='pago'?'pendente':'pago';select.disabled=true;try{await updateDoc(doc(db,'movimentacoesFinanceiras',id),{status,atualizadoEm:serverTimestamp()});toast(status==='pago'?'Movimentação marcada como paga/recebida.':'Movimentação marcada como pendente.')}catch(err){console.error(err);select.value=previous;toast('Não foi possível alterar o status.','error')}finally{select.disabled=false}}

async function loadSettings(){try{const snap=await getDoc(doc(db,'configuracoes','loja'));if(snap.exists()){state.settings={...state.settings,...snap.data()};$("#setting-store-name").value=state.settings.nome||'Forever Acessórios';$("#setting-whatsapp").value=state.settings.whatsapp||'5585998729885';$("#setting-instagram").value=state.settings.instagram||'';$("#setting-low-stock").value=state.settings.lowStock||2;$("#setting-note").value=state.settings.nota||''}}catch(e){console.warn(e)}}
async function saveSettings(e){e.preventDefault();const data={nome:$("#setting-store-name").value.trim(),whatsapp:$("#setting-whatsapp").value.trim(),instagram:$("#setting-instagram").value.trim(),lowStock:Math.max(1,Number($("#setting-low-stock").value)||2),nota:$("#setting-note").value.trim(),atualizadoEm:serverTimestamp()};try{await setDoc(doc(db,'configuracoes','loja'),data,{merge:true});state.settings={...state.settings,...data};updateAll();toast('Configurações salvas.')}catch(e){toast('Erro ao salvar configurações.','error')}}

function subscribe(){state.unsubs.forEach(u=>u());state.unsubs=[];state.unsubs.push(onSnapshot(collection(db,'estoque'),snap=>{state.stock=snap.docs.map(d=>({id:d.id.toUpperCase(),quantity:Number(d.data().quantidade)||0})).sort((a,b)=>a.id.localeCompare(b.id));updateAll()},e=>toast('Não foi possível ler o estoque.','error')));state.unsubs.push(onSnapshot(collection(db,'produtos'),snap=>{state.products=snap.docs.map(d=>({id:d.id.toUpperCase(),...d.data()}));updateAll()},e=>console.warn('Produtos:',e)));state.unsubs.push(onSnapshot(query(collection(db,'pedidos'),orderBy('criadoEm','desc')),snap=>{state.orders=snap.docs.map(d=>({id:d.id,...d.data()}));updateAll()},e=>{console.warn('Pedidos:',e);state.unsubs.push(onSnapshot(collection(db,'pedidos'),snap=>{state.orders=snap.docs.map(d=>({id:d.id,...d.data()}));updateAll()}))}));state.unsubs.push(onSnapshot(collection(db,'movimentacoesFinanceiras'),snap=>{state.finances=snap.docs.map(d=>({id:d.id,...d.data()}));updateAll()},e=>console.warn('Financeiro:',e)))}

async function importCurrentCatalog(){const button=$("#import-catalog-button");button.disabled=true;button.textContent="Importando...";let created=0,completed=0;try{for(const item of CATALOGO_INICIAL){const reference=doc(db,"produtos",item.id);const snapshot=await getDoc(reference);if(!snapshot.exists()){await setDoc(reference,{...item,criadoEm:serverTimestamp(),atualizadoEm:serverTimestamp()});created++}else{const current=snapshot.data();const supplements={};for(const field of ["nome","categoria","preco","imagem","descricao","ativo","destaque","ordem"]){if((current[field]===undefined||current[field]===null||current[field]==="")&&item[field]!==undefined)supplements[field]=item[field]}if(Object.keys(supplements).length){supplements.atualizadoEm=serverTimestamp();await setDoc(reference,supplements,{merge:true});completed++}}}toast(`${created} produto(s) criado(s) e ${completed} cadastro(s) completado(s).`)}catch(error){console.error(error);toast("Não foi possível importar o catálogo.","error")}finally{button.disabled=false;button.textContent="Importar catálogo atual"}}

$("#login-form").addEventListener('submit',async e=>{e.preventDefault();$("#login-message").textContent='';if(!e.currentTarget.checkValidity())return e.currentTarget.reportValidity();const b=$("#login-button");b.disabled=true;b.textContent='Entrando...';try{await loginAdmin($("#login-email").value.trim(),$("#login-password").value)}catch(err){$("#login-message").textContent=friendlyAuthError(err)}finally{b.disabled=false;b.textContent='Entrar no painel'}});$("#toggle-password").onclick=()=>{$("#login-password").type=$("#login-password").type==='password'?'text':'password'};$("#logout-button").onclick=logoutAdmin;$("#open-sidebar").onclick=openSidebar;$("#close-sidebar").onclick=closeSidebar;$("#sidebar-overlay").onclick=closeSidebar;$("#theme-button").onclick=()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');$$('.nav-item').forEach(b=>b.onclick=()=>switchView(b.dataset.view));$$('[data-go-view]').forEach(b=>b.onclick=()=>switchView(b.dataset.goView));$("#refresh-dashboard").onclick=()=>{updateAll();toast('Dados atualizados.')};$("#stock-search").oninput=renderStock;$("#stock-filter").onchange=renderStock;$("#stock-table-body").onclick=e=>{const row=e.target.closest('tr');if(!row)return;const input=row.querySelector('input');if(e.target.dataset.step)input.value=Math.max(0,Number(input.value||0)+Number(e.target.dataset.step));if(e.target.classList.contains('save-stock-button'))saveStock(row)};$("#initialize-stock-button").onclick=async()=>{const b=$("#initialize-stock-button");b.disabled=true;try{await initializeStock();toast('Cadastro-base conferido.')}catch(e){toast('Erro ao completar estoque.','error')}finally{b.disabled=false}};$("#products-search").oninput=renderProducts;$("#products-filter").onchange=renderProducts;$("#new-product-button").onclick=()=>openProductModal();$("#import-catalog-button").onclick=importCurrentCatalog;$("#products-grid").onclick=e=>{const id=e.target.dataset.editProduct||e.target.dataset.deleteProduct;if(!id)return;e.target.dataset.editProduct?openProductModal(state.products.find(p=>p.id===id)):deleteProduct(id)};$$('[data-close-modal]').forEach(b=>b.onclick=closeProductModal);$("#product-form").onsubmit=saveProduct;$("#product-image-file").onchange=e=>{const file=e.target.files?.[0];if(file)updateProductImagePreview(URL.createObjectURL(file))};$("#product-image").oninput=e=>updateProductImagePreview(e.target.value);$("#new-order-button").onclick=openNewOrder;$$(`[data-close-new-order]`).forEach(b=>b.onclick=closeNewOrder);$("#add-manual-item").onclick=()=>{readManualItems();state.manualItems.push({id:"",quantity:1});renderManualItems()};$("#manual-order-items").oninput=updateManualTotal;$("#manual-order-items").onchange=updateManualTotal;$("#manual-order-items").onclick=e=>{if(e.target.classList.contains("manual-remove-item")){readManualItems();state.manualItems.splice(Number(e.target.closest("[data-manual-index]").dataset.manualIndex),1);if(!state.manualItems.length)state.manualItems.push({id:"",quantity:1});renderManualItems()}};$("#new-order-form").onsubmit=saveManualOrder;$("#orders-search").oninput=renderOrders;$("#orders-filter").onchange=renderOrders;$("#orders-grid").onclick=e=>{const card=e.target.closest('[data-order-id]');if(card)openOrder(card.dataset.orderId)};$$('[data-close-order-modal]').forEach(b=>b.onclick=closeOrder);$("#save-order-status").onclick=saveOrderStatus;$("#export-orders").onclick=exportOrders;$("#new-finance-button").onclick=()=>openFinanceModal();$$('[data-close-finance-modal]').forEach(b=>b.onclick=closeFinanceModal);$("#finance-type").onchange=updateFinanceCategories;$("#finance-form").onsubmit=saveFinance;$("#finance-search").oninput=renderFinance;$("#finance-type-filter").onchange=renderFinance;$("#finance-status-filter").onchange=renderFinance;$("#finance-table-body").onclick=e=>{const editId=e.target.closest('[data-edit-finance]')?.dataset.editFinance;if(editId){const finance=state.finances.find(f=>f.id===editId);if(finance)openFinanceModal(finance);return}const deleteId=e.target.closest('[data-delete-finance]')?.dataset.deleteFinance;if(deleteId)deleteFinance(deleteId)};$("#finance-table-body").onchange=e=>{const select=e.target.closest('[data-finance-status-id]');if(select)updateFinanceStatus(select.dataset.financeStatusId,select.value,select)};$("#settings-form").onsubmit=saveSettings;$("#global-search").onkeydown=e=>{if(e.key==='Enter'){const q=e.target.value.trim();if(q){switchView('pedidos');$("#orders-search").value=q;renderOrders()}}};
setTheme(localStorage.getItem('forever-admin-theme')||'light');observeAuth(async user=>{$("#app-loader").hidden=true;if(user){$("#user-email").textContent=user.email||'';$("#login-view").hidden=true;$("#admin-view").hidden=false;await loadSettings();subscribe()}else{state.unsubs.forEach(u=>u());$("#admin-view").hidden=true;$("#login-view").hidden=false}});
