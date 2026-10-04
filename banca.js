async function cargarMonedasBanca(){
  const fecha=document.getElementById('banca-cot-fecha');
  if(fecha && !fecha.value) fecha.value=new Date().toISOString().slice(0,10);
  const r=await fetchApi(API+'/api/banca/monedas');
  if(!r.ok){alert('No se pudieron cargar las monedas.');return;}
  const rows=await r.json();
  const el=document.getElementById('banca-monedas-lista');
  if(el) el.innerHTML='<table class="tabla"><thead><tr><th>Código</th><th>Nombre</th><th>Símbolo</th><th>Estado</th><th>Fuente</th></tr></thead><tbody>'+
    rows.map(x=>'<tr><td><strong>'+escapeHtml(x.codigo)+'</strong></td><td>'+escapeHtml(x.nombre)+'</td><td>'+escapeHtml(x.simbolo||'')+'</td><td>'+((Number(x.activo)!==0)?'Activo':'Inactivo')+'</td><td>'+escapeHtml(x.fuente||'')+'</td></tr>').join('')+
    '</tbody></table>';
  await cargarCotizacionesBanca();
}
async function crearMonedaBanca(){
  const body={codigo:document.getElementById('banca-moneda-codigo').value.trim().toUpperCase(),nombre:document.getElementById('banca-moneda-nombre').value.trim(),simbolo:document.getElementById('banca-moneda-simbolo').value.trim()};
  if(!body.codigo||!body.nombre){alert('Código ISO y nombre son obligatorios.');return;}
  const r=await fetchApi(API+'/api/banca/monedas',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const d=await r.json().catch(()=>({}));
  if(!r.ok){alert(d.error||'No se pudo crear la moneda.');return;}
  document.getElementById('banca-moneda-codigo').value='';
  document.getElementById('banca-moneda-nombre').value='';
  document.getElementById('banca-moneda-simbolo').value='';
  await cargarMonedasBanca();
}
async function cargarCotizacionesBanca(){
  const el=document.getElementById('banca-cotizaciones-lista'); if(!el)return;
  const fecha=document.getElementById('banca-cot-fecha')?.value || new Date().toISOString().slice(0,10);
  el.innerHTML='<div class="sin-datos">Consultando cotizaciones DNIT…</div>';
  const r=await fetchApi(API+'/api/banca/cotizaciones?fecha='+encodeURIComponent(fecha));
  const d=await r.json().catch(()=>({}));
  if(!r.ok){el.innerHTML='<div class="sin-datos">'+escapeHtml(d.error||'No se pudieron cargar las cotizaciones.')+'</div>';return;}
  el.innerHTML='<table class="tabla"><thead><tr><th>Moneda</th><th>Compra</th><th>Venta</th><th>Fecha</th><th>Fuente</th></tr></thead><tbody>'+
    (d.cotizaciones||[]).map(x=>'<tr><td><strong>'+escapeHtml(x.codigo)+'</strong> — '+escapeHtml(x.nombre)+'</td><td>'+((x.compra==null)?'—':Number(x.compra).toLocaleString('es-PY',{minimumFractionDigits:2,maximumFractionDigits:2}))+'</td><td>'+((x.venta==null)?'—':Number(x.venta).toLocaleString('es-PY',{minimumFractionDigits:2,maximumFractionDigits:2}))+'</td><td>'+escapeHtml(x.fecha||fecha)+'</td><td>'+escapeHtml(x.fuente||'DNIT')+'</td></tr>').join('')+
    '</tbody></table>';
}
