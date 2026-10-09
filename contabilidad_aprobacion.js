async function cargarComprasPendientesContabilizacion(){
  const el=document.getElementById('lista-compras-pendientes');
  if(!el)return;
  const r=await fetchApi(API+'/api/compras/pendientes-contabilizacion');
  if(!r.ok){el.innerHTML='<div class="sin-datos">No se pudieron cargar las compras pendientes.</div>';return;}
  const rows=await r.json();
  if(!rows.length){el.innerHTML='<div class="sin-datos">No hay compras pendientes de contabilización.</div>';return;}
  el.innerHTML='<div class="card"><table class="tabla"><thead><tr><th>Fecha</th><th>Proveedor</th><th>Comprobante</th><th>Centro de costo</th><th>Total</th><th>Estado</th><th>Acción</th></tr></thead><tbody>'+
    rows.map(x=>{
      const estado=String(x.estado||'');
      const boton=estado==='rechazado'
        ? '<button class="btn btn-azul btn-pequeno" onclick="reingresarCompraContabilizacion('+x.id+')">Reingresar</button>'
        : '<button class="btn btn-verde btn-pequeno" onclick="abrirAprobacionCarga('+x.id+')">Revisar</button>';
      return '<tr><td>'+escapeHtml(x.fecha||'')+'</td><td>'+escapeHtml(x.proveedor||'')+'</td><td>'+escapeHtml(x.numero||'')+'</td><td>'+escapeHtml((x.centro_costo_codigo||'')+(x.centro_costo_nombre?' — '+x.centro_costo_nombre:''))+'</td><td>G. '+Number(x.total_gs||x.total||0).toLocaleString('es-PY')+'</td><td>'+escapeHtml(estado)+'</td><td>'+boton+'</td></tr>';
    }).join('')+'</tbody></table></div>';
}
async function abrirAprobacionCarga(id){
  const r=await fetchApi(API+'/api/compras/comprobantes/'+id+'/contabilizacion');
  if(!r.ok){const d=await r.json().catch(()=>({}));alert(d.error||'No se pudo abrir la carga.');return;}
  const d=await r.json(),c=d.comprobante,det=d.detalle||[];
  const overlay=document.createElement('div');
  overlay.id='modal-aprobacion-carga';
  overlay.style='position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
  overlay.innerHTML='<div class="card" style="width:min(1050px,96vw);max-height:90vh;overflow:auto;background:#fff"><div style="display:flex;justify-content:space-between;align-items:center"><div><h2 style="margin:0">Aprobación de carga</h2><p class="subtitulo">'+escapeHtml(c.proveedor||'')+' · '+escapeHtml(c.numero||'')+'</p></div><button class="btn btn-gris" onclick=&quot;document.getElementById(&#39;modal-aprobacion-carga&#39;)?.remove()&quot;>Cerrar</button></div>'+
    '<div class="placeholder-grid" style="margin:12px 0"><div class="placeholder-box"><strong>Fecha</strong><span>'+escapeHtml(c.fecha||'')+'</span></div><div class="placeholder-box"><strong>Total</strong><span>G. '+Number(c.total_gs||c.total||0).toLocaleString('es-PY')+'</span></div><div class="placeholder-box"><strong>Cuenta proveedor</strong><span>'+escapeHtml(c.cuenta_proveedor_id||'Pendiente')+'</span></div></div>'+
    '<table class="tabla"><thead><tr><th>Descripción</th><th>Cuenta</th><th>IVA</th><th>Importe</th></tr></thead><tbody>'+det.map(x=>'<tr><td>'+escapeHtml(x.descripcion||'')+'</td><td>'+escapeHtml((x.cuenta_codigo||'')+(x.cuenta_nombre?' — '+x.cuenta_nombre:''))+'</td><td>'+Number(x.iva_tasa||0)+'%</td><td>G. '+Number(x.subtotal||0).toLocaleString('es-PY')+'</td></tr>').join('')+'</tbody></table>'+
    (c.rechazo_motivo?'<div class="inv-note" style="margin-top:12px;border-left:4px solid var(--rojo,#b42318)"><strong>Observación anterior:</strong> '+escapeHtml(c.rechazo_motivo)+'</div>':'')+
    '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px"><button class="btn btn-rojo" onclick="rechazarCargaContable('+id+')">Rechazar</button><button class="btn btn-verde" onclick="aprobarCargaContable('+id+')">✓ Aprobar y contabilizar</button></div></div>';
  document.body.appendChild(overlay);
}
async function aprobarCargaContable(id){
  if(!confirm('¿Aprobar esta carga y generar su asiento contable?'))return;
  const r=await fetchApi(API+'/api/compras/comprobantes/'+id+'/aprobar-contabilizacion',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  const d=await r.json().catch(()=>({}));
  if(!r.ok){alert(d.error||'No se pudo aprobar la carga.');return;}
  document.getElementById('modal-aprobacion-carga')?.remove();
  alert('Carga aprobada y contabilizada. Asiento Nº '+d.numero_asiento+'.');
  await cargarComprasPendientesContabilizacion();
  if(typeof cargarComprobantesCompra==='function')await cargarComprobantesCompra();
}
async function rechazarCargaContable(id){
  const motivo=prompt('Indicá el motivo del rechazo:');
  if(!motivo||!motivo.trim())return;
  const r=await fetchApi(API+'/api/compras/comprobantes/'+id+'/rechazar-contabilizacion',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({motivo:motivo.trim()})});
  const d=await r.json().catch(()=>({}));
  if(!r.ok){alert(d.error||'No se pudo rechazar la carga.');return;}
  document.getElementById('modal-aprobacion-carga')?.remove();
  await cargarComprasPendientesContabilizacion();
}
async function reingresarCompraContabilizacion(id){
  const r=await fetchApi(API+'/api/compras/comprobantes/'+id+'/reingresar-contabilizacion',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  const d=await r.json().catch(()=>({}));
  if(!r.ok){alert(d.error||'No se pudo reingresar.');return;}
  await cargarComprasPendientesContabilizacion();
}
async function cargarAprobacionCargas(){
  const el=document.getElementById('lista-aprobacion-cargas');
  if(!el)return;
  const r=await fetchApi(API+'/api/compras/pendientes-contabilizacion');
  if(!r.ok){el.innerHTML='<div class="sin-datos">No se pudo cargar la bandeja de aprobación.</div>';return;}
  const rows=await r.json();
  el.innerHTML=rows.length?'<table class="tabla"><thead><tr><th>Fecha</th><th>Proveedor</th><th>Comprobante</th><th>Total</th><th>Estado</th><th>Acción</th></tr></thead><tbody>'+
    rows.map(x=>'<tr><td>'+escapeHtml(x.fecha||'')+'</td><td>'+escapeHtml(x.proveedor||'')+'</td><td>'+escapeHtml(x.numero||'')+'</td><td>G. '+Number(x.total_gs||x.total||0).toLocaleString('es-PY')+'</td><td>'+escapeHtml(x.estado||'')+'</td><td><button class="btn btn-verde btn-pequeno" onclick="abrirAprobacionCarga('+x.id+')">Revisar</button></td></tr>').join('')+'</tbody></table>'
    :'<div class="sin-datos">No hay cargas pendientes de aprobación.</div>';
}
