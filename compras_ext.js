/* Extensión de Compras: moneda, cotización DNIT y totales enteros. */
let monedasCompraCache = [];

async function cargarMonedasCompra(){
  try{
    const r=await fetchApi(API+'/api/banca/monedas'); if(!r.ok)return;
    monedasCompraCache=await r.json();
    const sel=document.getElementById('comp-moneda'); if(!sel)return;
    const actual=sel.value||'PYG';
    sel.innerHTML='';
    monedasCompraCache.filter(x=>Number(x.activo)!==0).forEach(x=>{
      const o=document.createElement('option'); o.value=x.codigo; o.textContent=x.codigo+' — '+x.nombre; sel.appendChild(o);
    });
    sel.value=monedasCompraCache.some(x=>x.codigo===actual)?actual:'PYG';
    await actualizarCotizacionCompra();
  }catch(e){console.error('No se pudieron cargar monedas',e);}
}

async function actualizarCotizacionCompra(){
  const moneda=document.getElementById('comp-moneda')?.value||'PYG';
  const fecha=document.getElementById('comp-fecha')?.value||new Date().toISOString().slice(0,10);
  const cambio=document.getElementById('comp-cambio'), info=document.getElementById('comp-cambio-info');
  if(moneda==='PYG'){if(cambio)cambio.value='1';if(info)info.textContent='Guaraní: tipo de cambio 1,00.';return;}
  if(info)info.textContent='Consultando cotización DNIT…';
  const r=await fetchApi(API+'/api/banca/cotizacion/'+encodeURIComponent(moneda)+'?fecha='+encodeURIComponent(fecha));
  const d=await r.json().catch(()=>({}));
  if(!r.ok){if(cambio)cambio.value='';if(info)info.textContent=d.error||'No hay cotización disponible para la fecha seleccionada.';return;}
  if(cambio)cambio.value=Number(d.venta||0);
  if(info)info.textContent='DNIT · Venta '+Number(d.venta||0).toLocaleString('es-PY',{minimumFractionDigits:2,maximumFractionDigits:2})+' · '+(d.fecha||fecha);
}

function recalcularTotalesCompraEnteros(){
  const g10=Math.round(Number(document.getElementById('comp-grav10')?.value||0));
  const g5=Math.round(Number(document.getElementById('comp-grav5')?.value||0));
  const ex=Math.round(Number(document.getElementById('comp-exento')?.value||0));
  const iva10=Math.round(g10*10/110), iva5=Math.round(g5*5/105), total=Math.round(g10+g5+ex);
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.value=String(v);};
  set('comp-grav10',g10);set('comp-grav5',g5);set('comp-exento',ex);set('comp-iva10',iva10);set('comp-iva5',iva5);set('comp-total',total);
  const box=document.getElementById('comp-totales-resumen');
  if(box)box.innerHTML='<div style="display:flex;gap:18px;justify-content:flex-end;flex-wrap:wrap;font-size:.9rem"><span>Grav. 10%: <strong>'+g10.toLocaleString('es-PY')+'</strong></span><span>Grav. 5%: <strong>'+g5.toLocaleString('es-PY')+'</strong></span><span>Exento: <strong>'+ex.toLocaleString('es-PY')+'</strong></span><span>IVA: <strong>'+(iva10+iva5).toLocaleString('es-PY')+'</strong></span><span>Total: <strong>'+total.toLocaleString('es-PY')+'</strong></span></div>';
}

function enlazarMonedaCompras(){
  const m=document.getElementById('comp-moneda'), f=document.getElementById('comp-fecha');
  if(m)m.onchange=actualizarCotizacionCompra;
  if(f)f.onchange=actualizarCotizacionCompra;
  ['comp-grav10','comp-grav5','comp-exento'].forEach(id=>{
    const e=document.getElementById(id); if(e)e.oninput=recalcularTotalesCompraEnteros;
  });
}

document.addEventListener('DOMContentLoaded',()=>{
  enlazarMonedaCompras();
  setTimeout(()=>{ cargarMonedasCompra(); },100);
});
