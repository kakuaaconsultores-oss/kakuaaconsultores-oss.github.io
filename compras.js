
let comprasCatalogosCache = {};
let unidadesMedidaCache = [];
let unidadMedidaEditando = null;

async function cargarUnidadesMedida(){
 try{
   const r=await fetchApi(API+'/api/compras/unidades-medida');
   if(!r.ok)return;
   unidadesMedidaCache=await r.json();
   const sel=document.getElementById('ccp-unidad');
   if(sel && sel.tagName==='INPUT'){
     const nuevo=document.createElement('select');
     nuevo.id='ccp-unidad';
     nuevo.title='Unidad de medida';
     nuevo.innerHTML='<option value="">Seleccioná una unidad de medida *</option>';
     sel.replaceWith(nuevo);
   }
   const selector=document.getElementById('ccp-unidad');
   if(selector){
     const actual=selector.value;
     selector.innerHTML='<option value="">Seleccioná una unidad de medida *</option>';
     unidadesMedidaCache.filter(x=>Number(x.activo)!==0).forEach(x=>{
       const opt=document.createElement('option');
       opt.value=x.id;
       opt.textContent=(x.codigo||'')+' — '+(x.nombre||'');
       selector.appendChild(opt);
     });
     if(actual)selector.value=actual;
   }
   renderUnidadesMedida();
 }catch(e){console.error('No se pudieron cargar las unidades de medida',e);}
}
function renderUnidadesMedida(){
 const el=document.getElementById('lista-unidades-medida');if(!el)return;
 if(!unidadesMedidaCache.length){
   el.innerHTML='<div class="sin-datos">No hay unidades de medida definidas.</div>';return;
 }
 el.innerHTML='<table class="tabla"><thead><tr><th>Código</th><th>Nombre</th><th>Abreviatura</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>'+
 unidadesMedidaCache.map(x=>{
   const activo=Number(x.activo)!==0;
   return '<tr><td><strong>'+escapeHtml(x.codigo||'')+'</strong></td><td>'+escapeHtml(x.nombre||'')+'</td><td>'+escapeHtml(x.abreviatura||'')+'</td><td>'+escapeHtml(activo?'Activo':'Inactivo')+'</td><td>'+
     '<button class="btn btn-gris btn-pequeno" onclick="editarUnidadMedida('+x.id+')">Editar</button> '+
     '<button class="btn '+(activo?'btn-amarillo':'btn-verde')+' btn-pequeno" onclick="cambiarEstadoUnidadMedida('+x.id+','+(!activo)+')">'+(activo?'Inactivar':'Reactivar')+'</button> '+
     '<button class="btn btn-rojo btn-pequeno" onclick="eliminarUnidadMedida('+x.id+')">Eliminar</button>'+
     '</td></tr>';
 }).join('')+'</tbody></table>';
}
function limpiarFormularioUnidadMedida(){
 unidadMedidaEditando=null;
 ['um-codigo','um-nombre','um-abreviatura'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
 const estado=document.getElementById('um-estado');if(estado)estado.value='activo';
 const btn=document.getElementById('btn-guardar-unidad');if(btn)btn.textContent='＋ Guardar unidad';
}
function abrirNuevaUnidadMedida(){
 limpiarFormularioUnidadMedida();
 const form=document.getElementById('form-unidad-medida');if(form)form.style.display='block';
 document.getElementById('um-codigo')?.focus();
}
function editarUnidadMedida(id){
 const row=unidadesMedidaCache.find(x=>Number(x.id)===Number(id));if(!row)return;
 unidadMedidaEditando=id;
 document.getElementById('um-codigo').value=row.codigo||'';
 document.getElementById('um-nombre').value=row.nombre||'';
 document.getElementById('um-abreviatura').value=row.abreviatura||'';
 document.getElementById('um-estado').value=Number(row.activo)!==0?'activo':'inactivo';
 document.getElementById('btn-guardar-unidad').textContent='💾 Guardar cambios';
 document.getElementById('form-unidad-medida').style.display='block';
 document.getElementById('form-unidad-medida').scrollIntoView({behavior:'smooth',block:'center'});
}
function cancelarUnidadMedida(){
 limpiarFormularioUnidadMedida();
 const form=document.getElementById('form-unidad-medida');if(form)form.style.display='none';
}
async function guardarUnidadMedida(){
 const body={
   codigo:document.getElementById('um-codigo').value.trim().toUpperCase(),
   nombre:document.getElementById('um-nombre').value.trim(),
   abreviatura:document.getElementById('um-abreviatura').value.trim(),
   estado:document.getElementById('um-estado').value
 };
 if(!body.codigo||!body.nombre){alert('Código y nombre son obligatorios.');return;}
 const url=API+'/api/compras/unidades-medida'+(unidadMedidaEditando?'/'+unidadMedidaEditando:'');
 const r=await fetchApi(url,{method:unidadMedidaEditando?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const d=await r.json();
 if(!r.ok){alert(d.error||'No se pudo guardar la unidad de medida.');return;}
 cancelarUnidadMedida();
 await cargarUnidadesMedida();
 await cargarComprasCatalogos();
}
async function cambiarEstadoUnidadMedida(id,activo){
 const accion=activo?'reactivar':'inactivar';
 if(!confirm('¿Querés '+accion+' esta unidad de medida?'))return;
 const r=await fetchApi(API+'/api/compras/unidades-medida/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({activo:activo,estado:activo?'activo':'inactivo'})});
 const d=await r.json();if(!r.ok){alert(d.error||'No se pudo actualizar el estado.');return;}
 await cargarUnidadesMedida();
 await cargarComprasCatalogos();
}
async function eliminarUnidadMedida(id){
 if(!confirm('¿Eliminar definitivamente esta unidad de medida? Solo será posible si no está asociada a ningún ítem.'))return;
 const r=await fetchApi(API+'/api/compras/unidades-medida/'+id,{method:'DELETE'});
 const d=await r.json();if(!r.ok){alert(d.error||'No se pudo eliminar.');return;}
 await cargarUnidadesMedida();
 await cargarComprasCatalogos();
}
async function cargarComprasCatalogos(){
 try{
   await cargarUnidadesMedida();
   await cargarCuentasContablesCompra();
   const r=await fetchApi(API+'/api/compras/catalogos');if(!r.ok)return;comprasCatalogosCache=await r.json();
 const p=document.getElementById('comp-proveedor'),t=document.getElementById('comp-tipo'),cond=document.getElementById('comp-condicion');
 if(p){p.innerHTML='<option value="">Proveedor *</option>';(comprasCatalogosCache.proveedores||[]).forEach(x=>p.innerHTML+='<option value="'+x.id+'">'+escapeHtml(x.razon_social)+'</option>');}
 if(p){p.onchange=()=>cargarTimbradosProveedor(Number(p.value)||0);}
 if(document.getElementById('comp-tipo'))document.getElementById('comp-tipo').onchange=validarFacturaEnPantalla;
 ['comp-numero','comp-fecha'].forEach(id=>document.getElementById(id)?.addEventListener('input',validarFacturaEnPantalla));
 if(t){t.innerHTML='<option value="">Tipo de comprobante</option>';(comprasCatalogosCache.tipos_comprobante||[]).filter(x=>Number(x.activo)!==0).forEach(x=>t.innerHTML+='<option value="'+x.id+'">'+escapeHtml(x.nombre)+'</option>');} if(cond){cond.innerHTML='<option value="">Condición de compra</option>';(comprasCatalogosCache.condiciones||[]).filter(x=>Number(x.activo)!==0).forEach(x=>cond.innerHTML+='<option value="'+x.id+'">'+escapeHtml(x.nombre)+'</option>');}
 const fp=document.getElementById('comp-forma-pago');
 if(fp){fp.innerHTML='<option value="">Forma de pago</option>';(comprasCatalogosCache.formas_pago||[]).filter(x=>Number(x.activo)!==0).forEach(x=>fp.innerHTML+='<option value="'+x.id+'">'+escapeHtml(x.nombre)+'</option>');}
 renderConceptosCompra(comprasCatalogosCache.conceptos||[]);
 renderCatalogoCompra('lista-condiciones-compra',comprasCatalogosCache.condiciones||[],['codigo','nombre','tipo','dias_credito','cuotas']);
 renderCatalogoCompra('lista-formas-pago-compra',comprasCatalogosCache.formas_pago||[],['codigo','nombre','tipo','cuenta_contable_nombre']);
 renderCatalogoCompra('catalogo-tipos-compra',comprasCatalogosCache.tipos_comprobante||[],['codigo','nombre']);
 renderProveedoresCompra(comprasCatalogosCache.proveedores||[]);
 const ncProv=document.getElementById('nc-proveedor');
 if(ncProv){
   ncProv.innerHTML='<option value="">Seleccioná un proveedor</option>';
   (comprasCatalogosCache.proveedores||[]).forEach(x=>ncProv.innerHTML+='<option value="'+x.id+'">'+escapeHtml(x.razon_social)+'</option>');
   ncProv.onchange=async()=>{await cargarTimbradosProveedorNC(Number(ncProv.value)||0);await buscarFacturasRelacionablesNC();};
 }
 inicializarBuscadorFacturaRelacionadaNC();
 }catch(e){console.error(e);}
}
function renderCatalogoCompra(id,rows,cols){
 const el=document.getElementById(id);if(!el)return;
 el.innerHTML='<table class="tabla"><thead><tr>'+cols.map(x=>'<th>'+escapeHtml(x)+'</th>').join('')+'<th>Acciones</th></tr></thead><tbody>'+
 rows.map(r=>'<tr>'+cols.map(x=>'<td>'+escapeHtml(r[x]??'')+'</td>').join('')+
 '<td><button class="btn btn-gris btn-pequeno" onclick="editarCatalogoCompra(\''+id+'\','+r.id+')">Editar</button> <button class="btn btn-rojo btn-pequeno" onclick="eliminarCatalogoCompra(\''+id+'\','+r.id+')">Eliminar</button></td></tr>').join('')+
 '</tbody></table>';
}
async function cargarCuentasContablesCompra(){
 const r=await fetchApi(API+'/api/contabilidad/cuentas');
 if(!r.ok){cuentasContablesCompra=[];return;}
 cuentasContablesCompra=await r.json();
 const sel=document.getElementById('fp-cuenta');
 if(sel)llenarSelectCuentasCompra(sel);
}
function llenarSelectCuentasCompra(sel,valor){
 sel.innerHTML='<option value="">— Seleccioná una cuenta contable —</option>';
 cuentasContablesCompra.filter(x=>Number(x.imputable)===1 && Number(x.activa)!==0).forEach(x=>{
   const opt=document.createElement('option');opt.value=x.id;opt.textContent=x.codigo+' - '+x.nombre;sel.appendChild(opt);
 });
 if(valor!=null)sel.value=String(valor);
}
function nombreCuentaCompra(id){const x=cuentasContablesCompra.find(c=>Number(c.id)===Number(id));return x?x.codigo+' - '+x.nombre:'';}
let tipoComprobanteEditando=null, condicionCompraEditando=null, formaPagoEditando=null, cuentasContablesCompra=[];
function abrirNuevoTipoComprobante(){
 tipoComprobanteEditando=null;
 document.getElementById('tipo-compra-codigo').value='';
 document.getElementById('tipo-compra-nombre').value='';
 document.getElementById('form-tipo-compra').style.display='block';
 document.getElementById('btn-guardar-tipo-compra').textContent='＋ Crear Tipo de Comprobante';
}
function cancelarTipoComprobante(){document.getElementById('form-tipo-compra').style.display='none';tipoComprobanteEditando=null;}
async function guardarTipoComprobante(){
 const body={codigo:document.getElementById('tipo-compra-codigo').value.trim(),nombre:document.getElementById('tipo-compra-nombre').value.trim(),activo:1};
 if(!body.codigo||!body.nombre){alert('Código y nombre son obligatorios.');return;}
 const url=API+'/api/compras/tipos-comprobante'+(tipoComprobanteEditando?'/'+tipoComprobanteEditando:'');
 const r=await fetchApi(url,{method:tipoComprobanteEditando?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const d=await r.json();if(!r.ok){alert(d.error||'No se pudo guardar');return;}
 cancelarTipoComprobante();await cargarComprasCatalogos();
}
function editarCatalogoCompra(id,recordId){
 if(id==='lista-formas-pago-compra'){
   const row=(comprasCatalogosCache.formas_pago||[]).find(x=>x.id===recordId);if(!row)return;
   formaPagoEditando=recordId;
   document.getElementById('fp-codigo').value=row.codigo||'';
   document.getElementById('fp-nombre').value=row.nombre||'';
   document.getElementById('fp-tipo').value=row.tipo||'contado';
   llenarSelectCuentasCompra(document.getElementById('fp-cuenta'),row.cuenta_contable_id);
   document.getElementById('form-forma-pago-compra').style.display='block';
   document.getElementById('btn-guardar-forma-pago').textContent='💾 Guardar cambios';
   document.getElementById('form-forma-pago-compra').scrollIntoView({behavior:'smooth',block:'center'});return;
 }
 const rows=(id==='catalogo-tipos-compra'?comprasCatalogosCache.tipos_comprobante:comprasCatalogosCache.condiciones)||[];
 const row=rows.find(x=>x.id===recordId);if(!row)return;
 if(id==='catalogo-tipos-compra'){
   tipoComprobanteEditando=recordId;
   document.getElementById('tipo-compra-codigo').value=row.codigo||'';
   document.getElementById('tipo-compra-nombre').value=row.nombre||'';
   document.getElementById('form-tipo-compra').style.display='block';
   document.getElementById('btn-guardar-tipo-compra').textContent='💾 Guardar cambios';
   document.getElementById('form-tipo-compra').scrollIntoView({behavior:'smooth',block:'center'});
 }else{
   condicionCompraEditando=recordId;
   document.getElementById('cond-codigo').value=row.codigo||'';
   document.getElementById('cond-nombre').value=row.nombre||'';
   document.getElementById('cond-tipo').value=row.tipo||'dias';
   document.getElementById('cond-dias').value=row.dias_credito||0;
   document.getElementById('cond-cuotas').value=row.cuotas||1;
   actualizarCamposCondicionCompra();
   document.getElementById('form-condicion-compra').style.display='block';
   document.getElementById('btn-guardar-condicion').textContent='💾 Guardar cambios';
   document.getElementById('form-condicion-compra').scrollIntoView({behavior:'smooth',block:'center'});
 }
}
async function eliminarCatalogoCompra(id,recordId){
 const nombre=id==='catalogo-tipos-compra'?'tipo de comprobante':'condición de compra';
 if(!confirm('¿Eliminar este '+nombre+'? Esta acción no se puede deshacer.'))return;
 const path=id==='catalogo-tipos-compra'?'tipos_comprobante_compra':(id==='lista-formas-pago-compra'?'formas_pago_compra':'condiciones_compra');
 const r=await fetchApi(API+'/api/compras/'+path+'/'+recordId,{method:'DELETE'});
 const d=await r.json();if(!r.ok){alert(d.error||'No se pudo eliminar');return;}await cargarComprasCatalogos();
}
function actualizarCamposCondicionCompra(){
 const tipo=document.getElementById('cond-tipo')?.value;
 const dias=document.getElementById('cond-dias'),cuotas=document.getElementById('cond-cuotas');
 if(!dias||!cuotas)return;
 dias.disabled=tipo!=='dias';cuotas.disabled=tipo!=='cuotas';
 dias.style.opacity=tipo==='dias'?'1':'.5';cuotas.style.opacity=tipo==='cuotas'?'1':'.5';
}
function abrirNuevaCondicion(){
 condicionCompraEditando=null;
 ['cond-codigo','cond-nombre'].forEach(id=>document.getElementById(id).value='');
 document.getElementById('cond-tipo').value='dias';document.getElementById('cond-dias').value=0;document.getElementById('cond-cuotas').value=1;
 actualizarCamposCondicionCompra();document.getElementById('form-condicion-compra').style.display='block';
 document.getElementById('btn-guardar-condicion').textContent='＋ Crear Condición de Compra';
}
function cancelarCondicionCompra(){document.getElementById('form-condicion-compra').style.display='none';condicionCompraEditando=null;}
async function guardarCondicionCompra(){
 const body={codigo:document.getElementById('cond-codigo').value.trim(),nombre:document.getElementById('cond-nombre').value.trim(),tipo:document.getElementById('cond-tipo').value,dias_credito:Number(document.getElementById('cond-dias').value||0),cuotas:Number(document.getElementById('cond-cuotas').value||1)};
 if(!body.codigo||!body.nombre){alert('Código y nombre son obligatorios.');return;}
 if(body.tipo==='dias'&&body.dias_credito<0){alert('Los días no pueden ser negativos.');return;}
 if(body.tipo==='cuotas'&&body.cuotas<1){alert('La cantidad de cuotas debe ser al menos 1.');return;}
 const path='/api/compras/condiciones';
 const r=await fetchApi(API+path+(condicionCompraEditando?'/'+condicionCompraEditando:''),{method:condicionCompraEditando?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const d=await r.json();if(!r.ok){alert(d.error||'No se pudo guardar');return;}cancelarCondicionCompra();await cargarComprasCatalogos();
}
let proveedorRucConsultado=false, proveedorEditando=null;
async function consultarRucProveedor(){
 const input=document.getElementById('prov-ruc'), estado=document.getElementById('prov-estado');
 const ruc=(input?.value||'').trim(); if(!ruc){alert('Ingresá un RUC.');return;}
 if(estado) estado.textContent='Consultando DNIT…';
 try{
  const r=await fetchApi(API+'/api/compras/proveedores/consulta-ruc/'+encodeURIComponent(ruc));
  const d=await r.json();
  if(!r.ok){if(estado)estado.textContent=d.error||'No encontrado';alert(d.error||'No se encontró el RUC.');return;}
  const x=d.data||{};
  document.getElementById('prov-ruc').value=x.ruc||ruc;
  document.getElementById('prov-ruc').dataset.consultedRuc=(x.ruc||ruc).trim().toUpperCase();
  document.getElementById('prov-razon').value=x.razon_social||'';
  document.getElementById('prov-nombre').value=x.razon_social||'';
  document.getElementById('prov-doc').value=x.ruc||'';
  document.getElementById('prov-razon').readOnly=true;
  document.getElementById('prov-nombre').readOnly=true;
  document.getElementById('prov-doc').readOnly=true;
  if(estado){estado.textContent='Estado: '+(x.estado||'SIN DATO');estado.dataset.valor=x.estado||'';}
  proveedorRucConsultado=true;
 }catch(e){if(estado)estado.textContent='No se pudo consultar';alert('No se pudo consultar la DNIT en este momento.');}
}
function resetProveedorRuc(){
 proveedorRucConsultado=false;proveedorEditando=null;
 ['prov-ruc','prov-razon','prov-nombre','prov-doc','prov-correo','prov-telefono','prov-direccion'].forEach(id=>{const e=document.getElementById(id);if(e){e.readOnly=false;e.value='';delete e.dataset.consultedRuc;}});
 const e=document.getElementById('prov-estado');if(e){e.textContent='';delete e.dataset.valor;}
 const btn=document.getElementById('btn-guardar-proveedor');
 if(btn){btn.textContent='＋ Guardar proveedor';btn.onclick=crearProveedorCompra;}
 setTimeout(()=>document.getElementById('prov-ruc')?.focus(),0);
}
async function cargarTimbradosProveedor(proveedorId){
 const sel=document.getElementById('comp-timbrado'); if(!sel)return;
 sel.innerHTML='<option value="">Timbrado *</option>';
 if(!proveedorId)return;
 const r=await fetchApi(API+'/api/compras/proveedores/'+proveedorId+'/timbrados');
 if(!r.ok)return;
 const rows=await r.json();
 sel._timbrados=rows;
 rows.filter(x=>Number(x.activo)!==0).forEach(x=>{
   const modal=x.modalidad==='ELECTRONICO'?'Electrónico':'Impreso';
   const venc=x.fecha_vencimiento==='3000-12-31'?'sin vencimiento convencional':(x.fecha_vencimiento||'sin vencimiento');
   const opt=document.createElement('option');opt.value=x.id;opt.textContent=x.numero_timbrado+' · '+modal+' · '+(x.establecimiento||'---')+'-'+(x.punto_expedicion||'---')+' · '+x.numero_desde+'-'+x.numero_hasta+' · '+venc;sel.appendChild(opt);
 });
}
async function abrirTimbradosProveedor(proveedorId){
 const r=await fetchApi(API+'/api/compras/proveedores/'+proveedorId+'/timbrados');
 if(!r.ok){alert('No se pudieron cargar los timbrados.');return;}
 const rows=await r.json();
 const tipoOpts=(comprasCatalogosCache.tipos_comprobante||[]).map(x=>'<option value="'+x.id+'">'+escapeHtml(x.nombre)+'</option>').join('');
 let html='<div style="display:grid;gap:10px;max-height:55vh;overflow:auto">'+rows.map(x=>'<div class="card" style="padding:12px"><strong>'+escapeHtml(x.numero_timbrado)+'</strong> · '+escapeHtml(x.modalidad)+' · '+escapeHtml(x.tipo_nombre||'')+'<br><small>'+escapeHtml(x.establecimiento||'---')+'-'+escapeHtml(x.punto_expedicion||'---')+' · '+x.numero_desde+' a '+x.numero_hasta+' · vence '+escapeHtml(x.fecha_vencimiento||'sin fecha')+'</small><div style="margin-top:8px"><button class="btn btn-rojo btn-pequeno" onclick="desactivarTimbradoProveedor('+proveedorId+','+x.id+')">Desactivar</button></div></div>').join('')+'</div>';
 html+='<div class="card" style="margin-top:12px"><h4 style="margin-top:0">＋ Nuevo timbrado</h4><div class="form-grid"><select id="tim-tipo">'+tipoOpts+'</select><select id="tim-modalidad"><option value="IMPRESO">Impreso</option><option value="ELECTRONICO">Electrónico</option></select><input id="tim-numero" placeholder="N.º de timbrado *"><input id="tim-est" placeholder="Establecimiento (001)"><input id="tim-punto" placeholder="Punto de expedición (001)"><input id="tim-desde" type="number" min="1" placeholder="Número desde *"><input id="tim-hasta" type="number" min="1" placeholder="Número hasta *"><input id="tim-inicio" type="date"><input id="tim-venc" type="date"><input id="tim-obs" class="full" placeholder="Observación"></div><button class="btn btn-verde" onclick="guardarTimbradoProveedor('+proveedorId+')">Guardar timbrado</button></div>';
 const wrap=document.createElement('div');wrap.innerHTML=`<div class="timbrado-overlay" style="position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center"><div style="background:#fff;border-radius:14px;padding:18px;width:min(850px,94vw);max-height:90vh;overflow:auto"><div style="display:flex;justify-content:space-between;align-items:center"><h3>Timbrados del proveedor</h3><button class="btn btn-gris" onclick="this.closest('.timbrado-overlay').remove()">Cerrar</button></div><div class="timbrado-modal">${html}</div></div></div>`;
 document.body.appendChild(wrap.firstElementChild);
 const modalidad=document.getElementById('tim-modalidad'),venc=document.getElementById('tim-venc');
 modalidad?.addEventListener('change',()=>{if(modalidad.value==='ELECTRONICO'){venc.value='3000-12-31';venc.disabled=true;}else{venc.disabled=false;if(venc.value==='3000-12-31')venc.value='';}});
}
async function guardarTimbradoProveedor(proveedorId){
 const body={tipo_comprobante_id:document.getElementById('tim-tipo').value,modalidad:document.getElementById('tim-modalidad').value,numero_timbrado:document.getElementById('tim-numero').value.trim(),establecimiento:document.getElementById('tim-est').value.trim(),punto_expedicion:document.getElementById('tim-punto').value.trim(),numero_desde:Number(document.getElementById('tim-desde').value),numero_hasta:Number(document.getElementById('tim-hasta').value),fecha_inicio:document.getElementById('tim-inicio').value,fecha_vencimiento:document.getElementById('tim-venc').value,observacion:document.getElementById('tim-obs').value.trim()};
 if(!body.numero_timbrado||!body.numero_desde||!body.numero_hasta){alert('Completá timbrado y rango numérico.');return;}
 const r=await fetchApi(API+'/api/compras/proveedores/'+proveedorId+'/timbrados',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const d=await r.json();if(!r.ok){alert(d.error||'No se pudo guardar');return;}
 const m=document.querySelector('.timbrado-overlay');if(m)m.remove();await cargarComprasCatalogos();
}
async function desactivarTimbradoProveedor(proveedorId,timbradoId){
 const r=await fetchApi(API+'/api/compras/proveedores/'+proveedorId+'/timbrados/'+timbradoId,{method:'DELETE'});
 if(r.ok){const m=document.querySelector('.timbrado-modal');if(m)m.remove();await abrirTimbradosProveedor(proveedorId);}
}
function renderProveedoresCompra(rows){
 const el=document.getElementById('lista-proveedores-compra');if(!el)return;
 el.innerHTML='<table class="tabla"><thead><tr><th>RUC</th><th>Razón social</th><th>Contacto</th><th>Estado</th><th>Timbrados</th><th>Acciones</th></tr></thead><tbody>'+
 rows.map(r=>'<tr><td>'+escapeHtml(r.ruc||'')+'</td><td>'+escapeHtml(r.razon_social)+'</td><td>'+escapeHtml(r.correo||r.telefono||'')+'</td><td>'+escapeHtml(r.estado)+'</td><td><button class="btn btn-azul btn-pequeno" onclick="abrirTimbradosProveedor('+r.id+')">Gestionar</button></td><td><button class="btn btn-gris btn-pequeno" onclick="editarProveedorCompra('+r.id+')">Editar</button></td></tr>').join('')+
 '</tbody></table>';
}
function editarProveedorCompra(id){
 const row=(comprasCatalogosCache.proveedores||[]).find(x=>Number(x.id)===Number(id));if(!row)return;
 proveedorEditando=id;
 const ids=['prov-ruc','prov-razon','prov-nombre','prov-doc','prov-correo','prov-telefono','prov-direccion'];
 const vals=[row.ruc,row.razon_social,row.nombre_comercial,row.documento,row.correo,row.telefono,row.direccion];
 ids.forEach((id,i)=>{const e=document.getElementById(id);if(e)e.value=vals[i]||'';});
 const ruc=document.getElementById('prov-ruc');ruc.readOnly=true;ruc.dataset.consultedRuc=(row.ruc||'').trim().toUpperCase();
 ['prov-razon','prov-nombre','prov-doc'].forEach(id=>{const e=document.getElementById(id);if(e)e.readOnly=true;});
 const estado=document.getElementById('prov-estado');if(estado)estado.textContent='Estado: '+(row.estado||'SIN DATO');
 proveedorRucConsultado=true;
 const btn=document.getElementById('btn-guardar-proveedor');
 if(btn){btn.textContent='💾 Guardar cambios';btn.onclick=crearProveedorCompra;}
 document.getElementById('prov-ruc')?.focus();
 document.getElementById('vista-proveedores')?.scrollIntoView({behavior:'smooth',block:'start'});
}
function cancelarEdicionProveedor(){
 proveedorEditando=null;resetProveedorRuc();
}
async function crearProveedorCompra(){
 const body={ruc:document.getElementById('prov-ruc').value.trim(),razon_social:document.getElementById('prov-razon').value.trim(),nombre_comercial:document.getElementById('prov-nombre').value.trim(),documento:document.getElementById('prov-doc').value.trim(),correo:document.getElementById('prov-correo').value.trim(),telefono:document.getElementById('prov-telefono').value.trim(),direccion:document.getElementById('prov-direccion').value.trim()};
 const rucActual=body.ruc.toUpperCase();
 if(!proveedorEditando && (!proveedorRucConsultado||document.getElementById('prov-ruc').dataset.consultedRuc!==rucActual)){alert('Consultá nuevamente el RUC antes de guardar.');return;}
 if(!body.ruc||!body.razon_social){alert('RUC y razón social son obligatorios.');return;}
 const url=API+'/api/compras/proveedores'+(proveedorEditando?'/'+proveedorEditando:'');
 const r=await fetchApi(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const d=await r.json();if(!r.ok){alert(d.error||(proveedorEditando?'No se pudo actualizar el proveedor':'No se pudo crear el proveedor'));return;}
 alert(proveedorEditando?'Proveedor actualizado correctamente.':'Proveedor guardado correctamente.');
 resetProveedorRuc();await cargarComprasCatalogos();
}
let conceptoCompraEditando=null;
function renderConceptosCompra(rows){
 const el=document.getElementById('lista-conceptos-compra');if(!el)return;
 const fmtFecha=v=>v?new Date(String(v).replace(' ','T')).toLocaleDateString('es-PY'):'';
 el.innerHTML='<table class="tabla"><thead><tr><th>Código</th><th>Descripción</th><th>Fecha creación</th><th>Unidad</th><th>Stock mín.</th><th>Estado</th><th>IVA</th><th>Concepto presup.</th><th>Cuenta contable</th><th>Uso</th><th>Acciones</th></tr></thead><tbody>'+
 rows.map(r=>{
   const listo=Number(r.habilitado_compras)===1;
   const estado=Number(r.activo)!==0?'Activo':'Inactivo';
   const cuenta=r.cuenta_codigo&&r.cuenta_nombre?(r.cuenta_codigo+' - '+r.cuenta_nombre):(r.cuenta_contable_id?'Asignada':'Pendiente');
   const um=(unidadesMedidaCache||[]).find(x=>Number(x.id)===Number(r.unidad_medida_id));
   const unidadTexto=um?((um.codigo||'')+' — '+(um.nombre||'')):(r.unidad_medida||'');
   const activo=Number(r.activo)!==0;
   return '<tr><td>'+escapeHtml(r.codigo||'')+'</td><td>'+escapeHtml(r.descripcion||r.nombre||'')+'</td><td>'+escapeHtml(fmtFecha(r.creado_en))+'</td><td>'+escapeHtml(unidadTexto)+'</td><td>'+escapeHtml(r.stock_minimo??0)+'</td><td>'+escapeHtml(estado)+'</td><td>'+escapeHtml(Number(r.tasa_iva||0)+'% incluido')+'</td><td>'+escapeHtml(r.concepto_presupuestario||'Pendiente')+'</td><td>'+escapeHtml(cuenta)+'</td><td><span class="badge '+(listo?'aprobado':'pendiente')+'">'+(listo?'Disponible':'Bloqueado contable')+'</span></td><td><button class="btn btn-gris btn-pequeno" onclick="editarConceptoCompra('+r.id+')">Editar</button> <button class="btn '+(activo?'btn-amarillo':'btn-verde')+' btn-pequeno" onclick="cambiarEstadoConceptoCompra('+r.id+','+(!activo)+')">'+(activo?'Inactivar':'Reactivar')+'</button> <button class="btn btn-rojo btn-pequeno" onclick="eliminarConceptoCompra('+r.id+')">Eliminar</button></td></tr>';
 }).join('')+'</tbody></table>';
}
function limpiarFormularioConceptoCompra(){
 conceptoCompraEditando=null;
 ['ccp-descripcion','ccp-stock'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
 const um=document.getElementById('ccp-unidad');if(um)um.value='';
 const estado=document.getElementById('ccp-estado');if(estado)estado.value='activo';
 const iva=document.getElementById('ccp-iva');if(iva)iva.value='10';
 const codigo=document.getElementById('ccp-codigo');if(codigo){codigo.value='(automático)';codigo.readOnly=true;}
 const fecha=document.getElementById('ccp-fecha');if(fecha)fecha.value='(automática)';
 const presup=document.getElementById('ccp-presupuesto');if(presup)presup.value='Pendiente de Contabilidad';
 const cuenta=document.getElementById('ccp-cuenta');if(cuenta)cuenta.value='Pendiente de Contabilidad';
 const btn=document.getElementById('btn-guardar-concepto');if(btn)btn.textContent='＋ Guardar ítem';
}
function cancelarConceptoCompra(){limpiarFormularioConceptoCompra();}
function editarConceptoCompra(id){
 const row=(comprasCatalogosCache.conceptos||[]).find(x=>Number(x.id)===Number(id));if(!row)return;
 conceptoCompraEditando=id;
 document.getElementById('ccp-codigo').value=row.codigo||'';
 document.getElementById('ccp-fecha').value=row.creado_en?new Date(String(row.creado_en).replace(' ','T')).toLocaleDateString('es-PY'):'';
 document.getElementById('ccp-descripcion').value=row.descripcion||row.nombre||'';
 const umSel=document.getElementById('ccp-unidad');
 if(umSel){
   umSel.value=row.unidad_medida_id?String(row.unidad_medida_id):'';
   if(!umSel.value){
     const legacy=(unidadesMedidaCache||[]).find(x=>String(x.nombre||'').toUpperCase()===String(row.unidad_medida||'').toUpperCase()||String(x.codigo||'').toUpperCase()===String(row.unidad_medida||'').toUpperCase());
     if(legacy)umSel.value=String(legacy.id);
   }
 }
 document.getElementById('ccp-stock').value=row.stock_minimo??0;
 document.getElementById('ccp-estado').value=Number(row.activo)!==0?'activo':'inactivo';
 document.getElementById('ccp-iva').value=String(Number(row.tasa_iva??10));
 document.getElementById('ccp-presupuesto').value=row.concepto_presupuestario||'Pendiente de Contabilidad';
 const cuenta=nombreCuentaCompra(row.cuenta_contable_id)||'Pendiente de Contabilidad';
 document.getElementById('ccp-cuenta').value=cuenta;
 document.getElementById('btn-guardar-concepto').textContent='💾 Guardar cambios';
 document.getElementById('form-concepto-compra').style.display='block';
 document.getElementById('form-concepto-compra').scrollIntoView({behavior:'smooth',block:'center'});
}
function abrirNuevoConceptoCompra(){
 limpiarFormularioConceptoCompra();
 document.getElementById('form-concepto-compra').style.display='block';
}
async function crearConceptoCompra(){
 const unidadSel=document.getElementById('ccp-unidad');
 const body={descripcion:document.getElementById('ccp-descripcion').value.trim(),unidad_medida_id:Number(unidadSel?.value||0),stock_minimo:Number(document.getElementById('ccp-stock').value||0),estado:document.getElementById('ccp-estado').value,tasa_iva:Number(document.getElementById('ccp-iva').value)};
 if(!body.descripcion||!body.unidad_medida_id){alert('Descripción y unidad de medida son obligatorias.');return;}
 if(body.stock_minimo<0){alert('El stock mínimo no puede ser negativo.');return;}
 if(![0,5,10].includes(body.tasa_iva)){alert('Seleccioná un tipo de IVA válido.');return;}
 const url=API+'/api/compras/conceptos'+(conceptoCompraEditando?'/'+conceptoCompraEditando:'');
 const r=await fetchApi(url,{method:conceptoCompraEditando?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const d=await r.json();if(!r.ok){alert(d.error||'No se pudo guardar el ítem.');return;}
 limpiarFormularioConceptoCompra();document.getElementById('form-concepto-compra').style.display='none';await cargarComprasCatalogos();
}
async function cambiarEstadoConceptoCompra(id,activo){
 const accion=activo?'reactivar':'inactivar';
 if(!confirm('¿Querés '+accion+' este ítem de compra?'))return;
 const r=await fetchApi(API+'/api/compras/conceptos/'+id+'/estado',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({activo:activo})});
 const d=await r.json();if(!r.ok){alert(d.error||'No se pudo actualizar el estado.');return;}await cargarComprasCatalogos();
}
async function eliminarConceptoCompra(id){
 if(!confirm('¿Eliminar definitivamente este ítem? Solo será posible si todavía no fue utilizado en una Orden de Compra o Factura.'))return;
 const r=await fetchApi(API+'/api/compras/conceptos/'+id,{method:'DELETE'});
 const d=await r.json();if(!r.ok){alert(d.error||'No se pudo eliminar. Si ya fue utilizado, inactivá el ítem.');return;}await cargarComprasCatalogos();
}
async function cargarCuentasArticulos(){
 const el=document.getElementById('lista-cuentas-articulos');if(!el)return;
 const r=await fetchApi(API+'/api/contabilidad/cuentas-articulos');
 if(!r.ok){el.innerHTML='<div class="sin-datos">No se pudieron cargar los artículos.</div>';return;}
 const rows=await r.json();
 el.innerHTML='<table class="tabla"><thead><tr><th>Código</th><th>Descripción</th><th>Fecha creación</th><th>Unidad</th><th>Stock mín.</th><th>Estado</th><th>IVA</th><th>Concepto presupuestario *</th><th>Cuenta contable *</th><th>Estado contable</th><th>Acción</th></tr></thead><tbody>'+
 rows.map(r=>{
   const listo=!!(r.concepto_presupuestario&&r.cuenta_contable_id);
   return '<tr><td>'+escapeHtml(r.codigo||'')+'</td><td>'+escapeHtml(r.descripcion||r.nombre||'')+'</td><td>'+escapeHtml(r.creado_en||'')+'</td><td>'+escapeHtml(r.unidad_medida||'')+'</td><td>'+escapeHtml(r.stock_minimo??0)+'</td><td>'+escapeHtml(Number(r.activo)!==0?'Activo':'Inactivo')+'</td><td>'+escapeHtml(Number(r.tasa_iva||0)+'% incluido')+'</td><td><input id="pres-'+r.id+'" value="'+escapeHtml(r.concepto_presupuestario||'')+'" placeholder="Concepto presupuestario" style="min-width:190px"></td><td><select id="cuenta-'+r.id+'" style="min-width:230px"><option value="">Seleccioná una cuenta *</option></select></td><td><span class="badge '+(listo?'aprobado':'pendiente')+'">'+(listo?'Habilitado':'Pendiente')+'</span></td><td><button class="btn btn-verde btn-pequeno" onclick="guardarAsignacionContableArticulo('+r.id+')">Guardar</button></td></tr>';
 }).join('')+'</tbody></table>';
 rows.forEach(r=>{
   const sel=document.getElementById('cuenta-'+r.id);
   if(sel){llenarSelectCuentasCompra(sel,r.cuenta_contable_id);}
 });
}
async function guardarAsignacionContableArticulo(id){
 const presupuesto=document.getElementById('pres-'+id)?.value.trim();
 const cuenta=document.getElementById('cuenta-'+id)?.value;
 if(!presupuesto||!cuenta){alert('Concepto presupuestario y cuenta contable son obligatorios.');return;}
 const r=await fetchApi(API+'/api/contabilidad/cuentas-articulos/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({concepto_presupuestario:presupuesto,cuenta_contable_id:Number(cuenta)})});
 const d=await r.json();if(!r.ok){alert(d.error||'No se pudo guardar la parametrización.');return;}
 alert('Parametrización contable guardada. El ítem ya queda habilitado para Compras.');
 await cargarCuentasArticulos();await cargarComprasCatalogos();
}
function abrirNuevaFormaPago(){
 formaPagoEditando=null;document.getElementById('fp-codigo').value='';document.getElementById('fp-nombre').value='';
 document.getElementById('fp-tipo').value='contado';llenarSelectCuentasCompra(document.getElementById('fp-cuenta'));
 document.getElementById('form-forma-pago-compra').style.display='block';document.getElementById('btn-guardar-forma-pago').textContent='＋ Crear Forma de Pago';
}
function cancelarFormaPago(){document.getElementById('form-forma-pago-compra').style.display='none';formaPagoEditando=null;}
async function guardarFormaPago(){
 const body={codigo:document.getElementById('fp-codigo').value.trim(),nombre:document.getElementById('fp-nombre').value.trim(),tipo:document.getElementById('fp-tipo').value,cuenta_contable_id:Number(document.getElementById('fp-cuenta').value)||null};
 if(!body.codigo||!body.nombre||!body.cuenta_contable_id){alert('Código, nombre y cuenta contable son obligatorios.');return;}
 const url=API+'/api/compras/formas-pago'+(formaPagoEditando?'/'+formaPagoEditando:'');
 const r=await fetchApi(url,{method:formaPagoEditando?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const d=await r.json();if(!r.ok){alert(d.error||'No se pudo guardar');return;}cancelarFormaPago();await cargarComprasCatalogos();
}
async function crearCatalogoCompra(tipo){let body;if(tipo==='condiciones')body={codigo:document.getElementById('cond-codigo').value.trim(),nombre:document.getElementById('cond-nombre').value.trim(),dias_credito:Number(document.getElementById('cond-dias').value||0)};else body={codigo:document.getElementById('fp-codigo').value.trim(),nombre:document.getElementById('fp-nombre').value.trim(),tipo:document.getElementById('fp-tipo').value};if(!body.codigo||!body.nombre){alert('Código y nombre son obligatorios.');return;}const r=await fetchApi(API+'/api/compras/'+tipo,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok){const d=await r.json();alert(d.error||'No se pudo crear');return;}await cargarComprasCatalogos();}
async function validarFacturaEnPantalla(){
 const proveedor=Number(document.getElementById('comp-proveedor').value)||0;
 const tipo=Number(document.getElementById('comp-tipo').value)||0;
 const numero=document.getElementById('comp-numero').value.trim();
 const fecha=document.getElementById('comp-fecha').value;
 const tim=document.getElementById('comp-timbrado');
 const estado=document.getElementById('comp-timbrado-estado');
 if(!estado)return;
 if(!proveedor||!tipo||!numero||!fecha){estado.textContent='Completá proveedor, tipo, número y fecha para validar.';estado.style.color='var(--texto-suave)';return;}
 const rows=tim?._timbrados||[];
 const t=rows.find(x=>Number(x.id)===Number(tim.value));
 if(!t){estado.textContent='Seleccioná un timbrado.';estado.style.color='#b42318';return;}
 const parts=numero.split('-');
 const okFmt=parts.length===3&&parts.every(x=>/^\d+$/.test(x));
 const seq=okFmt?Number(parts[2]):0;
 const est=okFmt?parts[0].padStart(3,'0'):'';
 const punto=okFmt?parts[1].padStart(3,'0'):'';
 const enRango=okFmt&&seq>=Number(t.numero_desde)&&seq<=Number(t.numero_hasta);
 const estOk=!t.establecimiento||String(t.establecimiento).padStart(3,'0')===est;
 const puntoOk=!t.punto_expedicion||String(t.punto_expedicion).padStart(3,'0')===punto;
 const inicio=!t.fecha_inicio||fecha>=String(t.fecha_inicio).slice(0,10);
 const venc=!t.fecha_vencimiento||t.fecha_vencimiento==='3000-12-31'||fecha<=String(t.fecha_vencimiento).slice(0,10);
 if(okFmt&&enRango&&estOk&&puntoOk&&inicio&&venc){estado.textContent='✓ Número, rango, talonario y vigencia correctos.';estado.style.color='#15803d';return true;}
 estado.textContent='⚠ El número no coincide con el rango, establecimiento/punto o vigencia del timbrado.';estado.style.color='#b42318';return false;
}
let detalleFacturaCompra=[];
let facturaCompraItemsCache=[];
let facturaCompraDepositosCache=[];
let facturaCompraConceptosCache=[];
let facturaCompraOrdenesCache=[];
let notaCreditoCompraItems=[];
let facturasRelacionablesNC=[];
let facturaRelacionadaNC=null;

async function cargarDatosRegistrarFactura(){
 try{
  const [ri,rd,rc,ro]=await Promise.all([
   fetchApi(API+'/api/inventarios/items'),
   fetchApi(API+'/api/inventarios/depositos'),
   fetchApi(API+'/api/compras/conceptos/disponibles'),
   fetchApi(API+'/api/compras/ordenes')
  ]);
  facturaCompraItemsCache=ri.ok?await ri.json():[];
  facturaCompraDepositosCache=rd.ok?await rd.json():[];
  facturaCompraConceptosCache=rc.ok?await rc.json():[];
  facturaCompraOrdenesCache=ro.ok?await ro.json():[];
  const sel=document.getElementById('comp-orden');
  if(sel){
   sel.innerHTML='<option value="">Orden de Compra (opcional)</option>';
   facturaCompraOrdenesCache.filter(x=>!['cerrada','anulada'].includes(String(x.estado||'').toLowerCase())).forEach(x=>{
    const o=document.createElement('option');o.value=x.id;
    o.textContent=(x.numero||('OC #'+x.id))+' · '+(x.proveedor||'')+' · '+Number(x.total||0).toLocaleString('es-PY')+' · '+(x.estado||'');
    sel.appendChild(o);
   });
  }
  renderDetalleFacturaCompra();
 }catch(e){console.error('No se pudieron cargar datos de Registrar Factura',e);}
}

function _opcionesItemFactura(valor){
 let h='<option value="">— Artículo de Inventarios —</option>';
 facturaCompraItemsCache.filter(x=>Number(x.activo)!==0).forEach(x=>{
  h+='<option value="'+x.id+'" '+(Number(valor)===Number(x.id)?'selected':'')+'>'+escapeHtml((x.codigo||'')+' — '+(x.nombre||''))+'</option>';
 });
 return h;
}
function _opcionesConceptoFactura(valor){
 let h='<option value="">— Concepto de compra —</option>';
 facturaCompraConceptosCache.forEach(x=>{
  h+='<option value="'+x.id+'" '+(Number(valor)===Number(x.id)?'selected':'')+'>'+escapeHtml((x.codigo||'')+' — '+(x.descripcion||x.nombre||''))+'</option>';
 });
 return h;
}
function _opcionesDepositoFactura(valor){
 let h='<option value="">— Depósito —</option>';
 facturaCompraDepositosCache.filter(x=>Number(x.activo)!==0).forEach(x=>{
  h+='<option value="'+x.id+'" '+(Number(valor)===Number(x.id)?'selected':'')+'>'+escapeHtml((x.codigo||'')+' — '+(x.nombre||''))+'</option>';
 });
 return h;
}
function _opcionesCentroFactura(valor){
 const centros=(typeof centrosCostosCache!=='undefined'?centrosCostosCache:[]);
 let h='<option value="">— Centro de costo —</option>';
 centros.filter(x=>Number(x.activo)!==0).forEach(x=>{
  h+='<option value="'+x.id+'" '+(Number(valor)===Number(x.id)?'selected':'')+'>'+escapeHtml((x.codigo||'')+' — '+(x.nombre||''))+'</option>';
 });
 return h;
}
function agregarLineaFacturaCompra(data){
 const x=data||{item_id:'',concepto_id:'',descripcion:'',cantidad:1,precio_unitario:0,iva_tasa:10,deposito_id:'',centro_costo_id:document.getElementById('comp-centro-costo')?.value||''};
 detalleFacturaCompra.push({...x});
 renderDetalleFacturaCompra();
}
function eliminarLineaFacturaCompra(i){detalleFacturaCompra.splice(i,1);renderDetalleFacturaCompra();}
function actualizarLineaFacturaCompra(i,campo,valor){
 if(!detalleFacturaCompra[i])return;
 detalleFacturaCompra[i][campo]=valor;
 if(campo==='item_id'&&valor){
  const art=facturaCompraItemsCache.find(x=>Number(x.id)===Number(valor));
  if(art){
   detalleFacturaCompra[i].descripcion=art.nombre||'';
   detalleFacturaCompra[i].iva_tasa=Number(art.tipo_iva??10);
  }
 }
 renderDetalleFacturaCompra();
}
function _numeroLineaFactura(v){return Number(v||0).toLocaleString('es-PY',{minimumFractionDigits:2,maximumFractionDigits:2});}
function _recalcularTotalesFacturaCompra(){
 let g10=0,g5=0,ex=0,iva10=0,iva5=0,total=0;
 detalleFacturaCompra.forEach(x=>{
  const sub=Number(x.cantidad||0)*Number(x.precio_unitario||0);
  const iva=Number(x.iva_tasa||0);
  if(iva===10){g10+=sub;iva10+=sub*10/110;}
  else if(iva===5){g5+=sub;iva5+=sub*5/105;}
  else ex+=sub;
  total+=sub;
 });
 const set=(id,v)=>{const e=document.getElementById(id);if(e){e.value=v.toFixed(2);}};
 set('comp-grav10',g10);set('comp-grav5',g5);set('comp-exento',ex);set('comp-iva10',iva10);set('comp-iva5',iva5);set('comp-total',total);
 const box=document.getElementById('comp-totales-resumen');
 if(box)box.innerHTML='<div style="display:flex;gap:18px;justify-content:flex-end;flex-wrap:wrap;font-size:.9rem"><span>Grav. 10%: <strong>'+_numeroLineaFactura(g10)+'</strong></span><span>Grav. 5%: <strong>'+_numeroLineaFactura(g5)+'</strong></span><span>Exento: <strong>'+_numeroLineaFactura(ex)+'</strong></span><span>IVA: <strong>'+_numeroLineaFactura(iva10+iva5)+'</strong></span><span>Total: <strong>'+_numeroLineaFactura(total)+'</strong></span></div>';
}
function renderDetalleFacturaCompra(){
 const wrap=document.getElementById('comp-detalle-wrap');if(!wrap)return;
 if(!detalleFacturaCompra.length){wrap.innerHTML='<div class="sin-datos">No hay líneas. Agregá una línea o cargá una Orden de Compra.</div>';_recalcularTotalesFacturaCompra();return;}
 let h='<div style="overflow:auto"><table class="tabla"><thead><tr><th>Artículo Inventarios</th><th>Concepto</th><th>Descripción</th><th>Cantidad</th><th>Precio</th><th>IVA</th><th>Depósito</th><th>Centro de costo</th><th>Subtotal</th><th></th></tr></thead><tbody>';
 detalleFacturaCompra.forEach((x,i)=>{
  const sub=Number(x.cantidad||0)*Number(x.precio_unitario||0);
  h+='<tr><td><select onchange="actualizarLineaFacturaCompra('+i+',\'item_id\',this.value)">'+_opcionesItemFactura(x.item_id)+'</select></td>'+
   '<td><select onchange="actualizarLineaFacturaCompra('+i+',\'concepto_id\',this.value)">'+_opcionesConceptoFactura(x.concepto_id)+'</select></td>'+
   '<td><input value="'+escapeHtml(x.descripcion||'')+'" onchange="actualizarLineaFacturaCompra('+i+',\'descripcion\',this.value)" placeholder="Descripción"></td>'+
   '<td><input type="number" step="0.0001" min="0.0001" value="'+Number(x.cantidad||1)+'" onchange="actualizarLineaFacturaCompra('+i+',\'cantidad\',this.value)"></td>'+
   '<td><input type="number" step="0.01" min="0" value="'+Number(x.precio_unitario||0)+'" onchange="actualizarLineaFacturaCompra('+i+',\'precio_unitario\',this.value)"></td>'+
   '<td><select onchange="actualizarLineaFacturaCompra('+i+',\'iva_tasa\',this.value)"><option value="0" '+(Number(x.iva_tasa)===0?'selected':'')+'>Exento</option><option value="5" '+(Number(x.iva_tasa)===5?'selected':'')+'>5%</option><option value="10" '+(Number(x.iva_tasa)===10?'selected':'')+'>10%</option></select></td>'+
   '<td><select onchange="actualizarLineaFacturaCompra('+i+',\'deposito_id\',this.value)">'+_opcionesDepositoFactura(x.deposito_id)+'</select></td>'+
   '<td><select onchange="actualizarLineaFacturaCompra('+i+',\'centro_costo_id\',this.value)">'+_opcionesCentroFactura(x.centro_costo_id)+'</select></td>'+
   '<td>'+_numeroLineaFactura(sub)+'</td><td><button type="button" class="btn btn-rojo btn-pequeno" onclick="eliminarLineaFacturaCompra('+i+')">✕</button></td></tr>';
 });
 wrap.innerHTML=h+'</tbody></table></div>';
 _recalcularTotalesFacturaCompra();
}
async function cargarOrdenEnFactura(){
 const id=Number(document.getElementById('comp-orden')?.value||0);
 if(!id){alert('Seleccioná una Orden de Compra.');return;}
 const r=await fetchApi(API+'/api/compras/ordenes/'+id);const d=await r.json().catch(()=>({}));
 if(!r.ok){alert(d.error||'No se pudo cargar la Orden de Compra.');return;}
 const oc=d.orden||{},det=d.detalle||[];
 const prov=document.getElementById('comp-proveedor');if(prov&&oc.proveedor_id){prov.value=String(oc.proveedor_id);await cargarTimbradosProveedor(Number(oc.proveedor_id));}
 const cond=document.getElementById('comp-condicion');if(cond&&oc.condicion_id)cond.value=String(oc.condicion_id);
 const cc=document.getElementById('comp-centro-costo');if(cc&&oc.centro_costo_id)cc.value=String(oc.centro_costo_id);
 detalleFacturaCompra=det.map(x=>({item_id:x.item_id||'',concepto_id:x.concepto_id||'',descripcion:x.descripcion||x.item_nombre||'',cantidad:Math.max(0,Number(x.cantidad||0)-Number(x.cantidad_recibida||0)),precio_unitario:Number(x.precio_unitario||0),iva_tasa:Number(x.iva_tasa||10),deposito_id:x.deposito_id||'',centro_costo_id:x.centro_costo_id||oc.centro_costo_id||''})).filter(x=>x.cantidad>0);
 renderDetalleFacturaCompra();
}
function inicializarBuscadorFacturaRelacionadaNC(){
 const sel=document.getElementById('nc-factura-anio');if(!sel)return;
 const actual=new Date().getFullYear();sel.innerHTML='<option value="">Todos los años</option>';
 for(let y=actual+1;y>=actual-5;y--)sel.innerHTML+='<option value="'+y+'" '+(y===actual?'selected':'')+'>'+y+'</option>';
 const f=document.getElementById('nc-fecha');if(f&&!f.value)f.value=new Date().toISOString().slice(0,10);
 const mes=document.getElementById('nc-factura-mes');if(mes)mes.value=String(new Date().getMonth()+1);
 const tipo=document.getElementById('nc-tipo'),nc=(comprasCatalogosCache.tipos_comprobante||[]).find(x=>String(x.codigo||'').toUpperCase()==='NOTA_CREDITO');
 if(tipo){tipo.innerHTML='<option value="'+(nc?.id||'')+'">Nota de Crédito</option>';tipo.value=String(nc?.id||'');} llenarSelectCentroCostoNC();
}
function llenarSelectCentroCostoNC(){
 const sel=document.getElementById('nc-centro-costo');if(!sel)return;const actual=sel.value;sel.innerHTML='<option value="">Centro de costo *</option>';
 (typeof centrosCostosCache!=='undefined'?centrosCostosCache:[]).filter(x=>Number(x.activo)!==0).forEach(x=>{const padre=(typeof centrosCostosCache!=='undefined'&&x.centro_padre_id)?centrosCostosCache.find(p=>Number(p.id)===Number(x.centro_padre_id)):null;const opt=document.createElement('option');opt.value=x.id;opt.textContent=(padre?'↳ ':'')+(x.codigo||'')+' — '+(x.nombre||'');sel.appendChild(opt);});if(actual)sel.value=actual;
}
async function cargarTimbradosProveedorNC(proveedorId){
 const sel=document.getElementById('nc-timbrado');if(!sel)return;sel.innerHTML='<option value="">Timbrado NC *</option>';if(!proveedorId)return;
 const r=await fetchApi(API+'/api/compras/proveedores/'+proveedorId+'/timbrados');if(!r.ok)return;const rows=await r.json();sel._timbrados=rows;const tipoId=Number(document.getElementById('nc-tipo')?.value||0);
 rows.filter(x=>Number(x.activo)!==0&&(!tipoId||Number(x.tipo_comprobante_id)===tipoId)).forEach(x=>{const opt=document.createElement('option');opt.value=x.id;opt.textContent=x.numero_timbrado+' · '+(x.modalidad==='ELECTRONICO'?'Electrónico':'Impreso')+' · '+(x.establecimiento||'---')+'-'+(x.punto_expedicion||'---')+' · '+x.numero_desde+'-'+x.numero_hasta;sel.appendChild(opt);});
}
async function buscarFacturasRelacionablesNC(){
 const prov=Number(document.getElementById('nc-proveedor')?.value||0),anio=document.getElementById('nc-factura-anio')?.value||'',mes=document.getElementById('nc-factura-mes')?.value||'',sel=document.getElementById('nc-factura-relacionada');if(!sel)return;
 facturaRelacionadaNC=null;notaCreditoCompraItems=[];renderDetalleNotaCredito();
 if(!prov){sel.disabled=true;sel.innerHTML='<option value="">Primero seleccioná un proveedor</option>';document.getElementById('nc-factura-info').innerHTML='';return;}
 const qs=new URLSearchParams({proveedor_id:String(prov)});if(anio)qs.set('anio',anio);if(mes)qs.set('mes',mes);sel.disabled=true;sel.innerHTML='<option value="">Buscando facturas…</option>';
 const r=await fetchApi(API+'/api/compras/facturas-relacionables?'+qs.toString()),rows=r.ok?await r.json():[];facturasRelacionablesNC=Array.isArray(rows)?rows.filter(x=>x.puede_recibir_nc):[];
 sel.innerHTML='<option value="">Seleccioná la factura relacionada *</option>'+facturasRelacionablesNC.map(x=>'<option value="'+x.id+'">'+escapeHtml(x.fecha||'')+' · '+escapeHtml(x.numero||'')+' · G. '+Number(x.total_gs||x.total||0).toLocaleString('es-PY')+' · saldo NC G. '+Number(x.saldo_nc||0).toLocaleString('es-PY')+'</option>').join('');sel.disabled=false;sel.onchange=()=>seleccionarFacturaRelacionadaNC(Number(sel.value)||0);
 if(!facturasRelacionablesNC.length)document.getElementById('nc-factura-info').innerHTML='<strong>Sin facturas disponibles.</strong> No encontramos una factura con saldo para Nota de Crédito en el período seleccionado.';
}
async function seleccionarFacturaRelacionadaNC(id){
 if(!id){facturaRelacionadaNC=null;return;}const r=await fetchApi(API+'/api/compras/comprobantes/'+id+'/relacion'),d=await r.json().catch(()=>({}));if(!r.ok){alert(d.error||'No se pudo cargar la factura relacionada.');return;}
 const f=d.factura||{};facturaRelacionadaNC=f;const info=document.getElementById('nc-factura-info');
 if(info)info.innerHTML='<strong>✓ Factura relacionada cargada</strong><br>Factura: '+escapeHtml(f.numero||'')+' · Fecha: '+escapeHtml(f.fecha||'')+' · Proveedor: '+escapeHtml(f.proveedor||'')+' · RUC: '+escapeHtml(f.ruc||'')+'<br>CDC: '+escapeHtml(f.cdc||'—')+' · Timbrado: '+escapeHtml(f.timbrado_relacionado||'—')+' · Total: G. '+Number(f.total_gs||f.total||0).toLocaleString('es-PY')+' · Ya aplicado por NC: G. '+Number(f.total_nc||0).toLocaleString('es-PY')+' · Saldo disponible: <strong>G. '+Number(f.saldo_nc||0).toLocaleString('es-PY')+'</strong>';
 const moneda=String(f.moneda_codigo||f.moneda||'PYG').toUpperCase(),ms=document.getElementById('nc-moneda');if(ms){ms.innerHTML='<option value="'+moneda+'">'+moneda+(moneda==='PYG'?' — Guaraní':'')+'</option>';ms.value=moneda;}const cambio=document.getElementById('nc-cambio');if(cambio)cambio.value=Number(f.tipo_cambio||1);
 await cargarTimbradosProveedorNC(Number(f.proveedor_id)||0);
 notaCreditoCompraItems=(d.detalle||[]).map(x=>({item_id:x.item_id||'',concepto_id:x.concepto_id||'',descripcion:x.descripcion||x.item_nombre||'',cantidad:Number(x.cantidad||0),precio_unitario:Number(x.precio_unitario||0),iva_tasa:Number(x.iva_tasa||0),deposito_id:x.deposito_id||'',centro_costo_id:x.centro_costo_id||f.centro_costo_id||''}));renderDetalleNotaCredito();
}
function agregarLineaNotaCredito(){notaCreditoCompraItems.push({item_id:'',concepto_id:'',descripcion:'',cantidad:1,precio_unitario:0,iva_tasa:0,deposito_id:'',centro_costo_id:''});renderDetalleNotaCredito();}
function renderDetalleNotaCredito(){
 const wrap=document.getElementById('nc-detalle-wrap');if(!wrap)return;if(!notaCreditoCompraItems.length){wrap.innerHTML='<div class="sin-datos">Seleccioná una factura relacionada para precargar el detalle.</div>';_recalcularTotalesNotaCredito();return;}
 let h='<div style="overflow:auto"><table class="tabla"><thead><tr><th>Descripción</th><th>Cantidad</th><th>Precio</th><th>IVA</th><th>Subtotal</th><th></th></tr></thead><tbody>';
 notaCreditoCompraItems.forEach((x,i)=>{const sub=Number(x.cantidad||0)*Number(x.precio_unitario||0);h+='<tr><td><input value="'+escapeHtml(x.descripcion||'')+'" onchange="actualizarLineaNotaCredito('+i+',\'descripcion\',this.value)" placeholder="Descripción"></td><td><input type="number" step="0.0001" min="0" value="'+Number(x.cantidad||0)+'" onchange="actualizarLineaNotaCredito('+i+',\'cantidad\',this.value)"></td><td><input type="number" step="1" min="0" value="'+Number(x.precio_unitario||0)+'" onchange="actualizarLineaNotaCredito('+i+',\'precio_unitario\',this.value)"></td><td><select onchange="actualizarLineaNotaCredito('+i+',\'iva_tasa\',this.value)"><option value="0" '+(Number(x.iva_tasa)===0?'selected':'')+'>Exento</option><option value="5" '+(Number(x.iva_tasa)===5?'selected':'')+'>5%</option><option value="10" '+(Number(x.iva_tasa)===10?'selected':'')+'>10%</option></select></td><td>'+_numeroLineaFactura(sub)+'</td><td><button type="button" class="btn btn-rojo btn-pequeno" onclick="eliminarLineaNotaCredito('+i+')">✕</button></td></tr>';});wrap.innerHTML=h+'</tbody></table></div>';_recalcularTotalesNotaCredito();
}
function actualizarLineaNotaCredito(i,campo,valor){if(!notaCreditoCompraItems[i])return;notaCreditoCompraItems[i][campo]=['cantidad','precio_unitario','iva_tasa'].includes(campo)?Number(valor||0):valor;renderDetalleNotaCredito();}
function eliminarLineaNotaCredito(i){notaCreditoCompraItems.splice(i,1);renderDetalleNotaCredito();}
function _recalcularTotalesNotaCredito(){
 let g10=0,g5=0,ex=0,iva10=0,iva5=0,total=0;notaCreditoCompraItems.forEach(x=>{const sub=Number(x.cantidad||0)*Number(x.precio_unitario||0),iva=Number(x.iva_tasa||0);if(iva===10){g10+=sub;iva10+=sub*10/110;}else if(iva===5){g5+=sub;iva5+=sub*5/105;}else ex+=sub;total+=sub;});
 const set=(id,v)=>{const e=document.getElementById(id);if(e)e.value=Math.round(v);};set('nc-grav10',g10);set('nc-grav5',g5);set('nc-exento',ex);set('nc-iva10',iva10);set('nc-iva5',iva5);set('nc-total',total);
 const f=facturaRelacionadaNC,info=document.getElementById('nc-saldo-info');if(info&&f)info.innerHTML='Factura original: <strong>G. '+Number(f.total_gs||f.total||0).toLocaleString('es-PY')+'</strong> · NC anteriores: <strong>G. '+Number(f.total_nc||0).toLocaleString('es-PY')+'</strong> · Esta NC: <strong>G. '+Math.round(total).toLocaleString('es-PY')+'</strong> · Saldo posterior estimado: <strong>G. '+Math.max(0,Math.round(Number(f.saldo_nc||0)-total)).toLocaleString('es-PY')+'</strong>';
}
async function guardarNotaCreditoCompra(){
 _recalcularTotalesNotaCredito();const f=facturaRelacionadaNC;if(!f){alert('No podés registrar una Nota de Crédito sin seleccionar una factura relacionada que ya esté cargada en Kakuaa.');return;}
 const body={proveedor_id:Number(document.getElementById('nc-proveedor').value)||0,tipo_comprobante_id:Number(document.getElementById('nc-tipo').value)||null,timbrado_id:Number(document.getElementById('nc-timbrado').value)||null,centro_costo_id:Number(document.getElementById('nc-centro-costo').value)||null,numero:document.getElementById('nc-numero').value.trim(),cdc:document.getElementById('nc-cdc').value.trim(),fecha:document.getElementById('nc-fecha').value,moneda_codigo:document.getElementById('nc-moneda').value||'PYG',tipo_cambio:Number(document.getElementById('nc-cambio').value||1),total_moneda:Number(document.getElementById('nc-total').value||0),gravado_10:Number(document.getElementById('nc-grav10').value||0),gravado_5:Number(document.getElementById('nc-grav5').value||0),exento:Number(document.getElementById('nc-exento').value||0),iva_10:Number(document.getElementById('nc-iva10').value||0),iva_5:Number(document.getElementById('nc-iva5').value||0),comprobante_relacionado_id:Number(f.id),cdc_relacionado:f.cdc||'',timbrado_relacionado:f.timbrado_relacionado||'',motivo_nc:document.getElementById('nc-motivo').value,observacion:document.getElementById('nc-observacion').value.trim(),origen:'MANUAL',detalle:notaCreditoCompraItems.map(x=>({...x,cantidad:Number(x.cantidad||0),precio_unitario:Number(x.precio_unitario||0),iva_tasa:Number(x.iva_tasa||0),subtotal:Number(x.cantidad||0)*Number(x.precio_unitario||0),item_id:Number(x.item_id)||null,concepto_id:Number(x.concepto_id)||null,deposito_id:Number(x.deposito_id)||null,centro_costo_id:Number(x.centro_costo_id)||null}))};
 if(!body.proveedor_id||!body.timbrado_id||!body.numero||!body.fecha||!body.centro_costo_id||!body.motivo_nc||!body.total_moneda){alert('Proveedor, timbrado, número, fecha, centro de costo, motivo y total son obligatorios.');return;}if(!body.detalle.length){alert('La Nota de Crédito debe tener al menos una línea.');return;}if(await validarTimbradoNotaCredito()===false)return;
 const r=await fetchApi(API+'/api/compras/notas-credito',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),d=await r.json().catch(()=>({}));if(!r.ok){alert(d.error||'No se pudo registrar la Nota de Crédito.');return;}
 alert('✓ Nota de Crédito registrada correctamente.');notaCreditoCompraItems=[];facturaRelacionadaNC=null;document.getElementById('nc-factura-relacionada').value='';document.getElementById('nc-factura-info').innerHTML='';renderDetalleNotaCredito();await cargarNotasCreditoCompra();await buscarFacturasRelacionablesNC();
}
async function validarTimbradoNotaCredito(){
 const prov=Number(document.getElementById('nc-proveedor')?.value||0),numero=document.getElementById('nc-numero')?.value.trim(),fecha=document.getElementById('nc-fecha')?.value,tim=document.getElementById('nc-timbrado'),estado=document.getElementById('nc-timbrado-estado');if(!prov||!numero||!fecha||!tim?.value){if(estado)estado.textContent='Completá proveedor, timbrado, número y fecha para validar.';return false;}
 const t=(tim._timbrados||[]).find(x=>Number(x.id)===Number(tim.value));if(!t){if(estado)estado.textContent='Seleccioná un timbrado.';return false;}const p=numero.split('-'),ok=p.length===3&&p.every(x=>/^\d+$/.test(x)),seq=ok?Number(p[2]):0,est=ok?p[0].padStart(3,'0'):'',pto=ok?p[1].padStart(3,'0'):'',valido=ok&&seq>=Number(t.numero_desde)&&seq<=Number(t.numero_hasta)&&(!t.establecimiento||String(t.establecimiento).padStart(3,'0')===est)&&(!t.punto_expedicion||String(t.punto_expedicion).padStart(3,'0')===pto)&&(!t.fecha_inicio||fecha>=String(t.fecha_inicio).slice(0,10))&&(!t.fecha_vencimiento||t.fecha_vencimiento==='3000-12-31'||fecha<=String(t.fecha_vencimiento).slice(0,10));
 if(estado){estado.textContent=valido?'✓ Número, rango y vigencia del timbrado correctos.':'⚠ El número no coincide con el timbrado.';estado.style.color=valido?'#15803d':'#b42318';}return valido;
}
async function cargarNotasCreditoCompra(){
 const r=await fetchApi(API+'/api/compras/comprobantes');if(!r.ok)return;const rows=await r.json(),n=(rows||[]).filter(x=>String(x.tipo_codigo||'').toUpperCase()==='NOTA_CREDITO'),el=document.getElementById('lista-notas-credito-compra');if(!el)return;
 el.innerHTML=n.length?'<table class="tabla"><thead><tr><th>Fecha</th><th>Proveedor</th><th>NC</th><th>Factura relacionada</th><th>Timbrado factura</th><th>Total</th><th>Motivo</th><th>Estado</th></tr></thead><tbody>'+n.map(x=>'<tr><td>'+escapeHtml(x.fecha||'')+'</td><td>'+escapeHtml(x.proveedor||'')+'</td><td>'+escapeHtml(x.numero||'')+'</td><td>'+escapeHtml(x.comprobante_relacionado_id||'')+'</td><td>'+escapeHtml(x.timbrado_relacionado||'')+'</td><td>G. '+Number(x.total_gs||x.total||0).toLocaleString('es-PY')+'</td><td>'+escapeHtml(x.motivo_nc||'')+'</td><td>'+escapeHtml(x.estado||'')+'</td></tr>').join('')+'</tbody></table>':'<div class="sin-datos">No hay Notas de Crédito registradas.</div>';
}

async function guardarComprobanteCompra(){
 _recalcularTotalesFacturaCompra();
 const body={proveedor_id:Number(document.getElementById('comp-proveedor').value),tipo_comprobante_id:Number(document.getElementById('comp-tipo').value)||null,timbrado_id:Number(document.getElementById('comp-timbrado').value)||null,condicion_id:Number(document.getElementById('comp-condicion').value)||null,forma_pago_id:Number(document.getElementById('comp-forma-pago').value)||null,centro_costo_id:Number(document.getElementById('comp-centro-costo').value)||null,orden_compra_id:Number(document.getElementById('comp-orden').value)||null,numero:document.getElementById('comp-numero').value.trim(),cdc:document.getElementById('comp-cdc').value.trim(),fecha:document.getElementById('comp-fecha').value,gravado_10:Number(document.getElementById('comp-grav10').value||0),gravado_5:Number(document.getElementById('comp-grav5').value||0),exento:Number(document.getElementById('comp-exento').value||0),iva_10:Number(document.getElementById('comp-iva10').value||0),iva_5:Number(document.getElementById('comp-iva5').value||0),total:Number(document.getElementById('comp-total').value||0),observacion:document.getElementById('comp-observacion').value.trim(),origen:'MANUAL',detalle:detalleFacturaCompra.map(x=>({...x,item_id:Number(x.item_id)||null,concepto_id:Number(x.concepto_id)||null,deposito_id:Number(x.deposito_id)||null,centro_costo_id:Number(x.centro_costo_id)||null,cantidad:Number(x.cantidad||0),precio_unitario:Number(x.precio_unitario||0),iva_tasa:Number(x.iva_tasa||0),subtotal:Number(x.cantidad||0)*Number(x.precio_unitario||0)}))};
 if(!body.proveedor_id||!body.tipo_comprobante_id||!body.timbrado_id||!body.centro_costo_id||!body.numero||!body.fecha||!body.total){alert('Proveedor, tipo, timbrado, centro de costo, número, fecha y total son obligatorios.');return;}
 if(!body.detalle.length){alert('Agregá al menos una línea a la factura.');return;}
 for(const [i,x] of body.detalle.entries()){if(!x.descripcion){alert('La línea '+(i+1)+' necesita una descripción.');return;}if(!x.item_id&&!x.concepto_id){alert('La línea '+(i+1)+' debe vincularse a un artículo de Inventarios o a un concepto de compra.');return;}if(x.item_id&&!x.deposito_id){alert('La línea '+(i+1)+' tiene artículo de Inventarios y necesita un depósito.');return;}if(x.cantidad<=0){alert('La cantidad de la línea '+(i+1)+' debe ser mayor que cero.');return;}}
 const valido=await validarFacturaEnPantalla();
 if(valido===false){const estado=document.getElementById('comp-timbrado-estado');alert(estado?.textContent||'El comprobante no coincide con el timbrado.');return;}
 const r=await fetchApi(API+'/api/compras/comprobantes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 if(!r.ok){const d=await r.json().catch(()=>({}));alert(d.error||'No se pudo registrar');return;}
 const d=await r.json();alert('Factura registrada correctamente.');detalleFacturaCompra=[];renderDetalleFacturaCompra();document.getElementById('comp-orden').value='';await cargarComprobantesCompra();if(d.id)await mostrarCuotero(d.id);
}
async function cargarComprobantesCompra(){const r=await fetchApi(API+'/api/compras/comprobantes');if(!r.ok)return;const rows=await r.json();const el=document.getElementById('lista-compras');if(el)el.innerHTML='<table class="tabla"><thead><tr><th>Fecha</th><th>Proveedor</th><th>Comprobante</th><th>Centro de costo</th><th>Total</th><th>Estado</th><th>Acción</th></tr></thead><tbody>'+rows.map(x=>'<tr><td>'+escapeHtml(x.fecha)+'</td><td>'+escapeHtml(x.proveedor)+'</td><td>'+escapeHtml(x.numero)+'</td><td>'+escapeHtml((x.centro_costo_codigo||'')+(x.centro_costo_nombre?' — '+x.centro_costo_nombre:''))+'</td><td>'+Number(x.total||0).toLocaleString('es-PY')+'</td><td>'+escapeHtml(x.estado)+'</td><td>'+(x.estado==='anulado'?'—':'<button class="btn btn-rojo btn-pequeno" onclick="anularCompra('+x.id+')">Anular</button>')+'</td></tr>').join('')+'</tbody></table>';const pend=document.getElementById('lista-compras-pendientes');if(pend)pend.innerHTML='<table class="tabla"><thead><tr><th>Fecha</th><th>Proveedor</th><th>Número</th><th>Total</th><th>Estado</th></tr></thead><tbody>'+rows.filter(x=>x.estado==='pendiente_contabilizar').map(x=>'<tr><td>'+escapeHtml(x.fecha)+'</td><td>'+escapeHtml(x.proveedor)+'</td><td>'+escapeHtml(x.numero)+'</td><td>'+Number(x.total||0).toLocaleString('es-PY')+'</td><td>'+escapeHtml(x.estado)+'</td></tr>').join('')+'</tbody></table>';}
async function anularCompra(id){if(!confirm('¿Anular este comprobante?'))return;const r=await fetchApi(API+'/api/compras/comprobantes/'+id+'/estado',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({estado:'anulado'})});if(r.ok)await cargarComprobantesCompra();else alert('No se pudo anular.');}
async function cargarReportesCompras(){const r1=await fetchApi(API+'/api/compras/reportes/proveedor');if(r1.ok){const rows=await r1.json();const e=document.getElementById('reporte-compras-proveedor');if(e)e.innerHTML='<table class="tabla"><thead><tr><th>Proveedor</th><th>Comprobantes</th><th>Total</th></tr></thead><tbody>'+rows.map(x=>'<tr><td>'+escapeHtml(x.proveedor)+'</td><td>'+x.comprobantes+'</td><td>'+Number(x.total||0).toLocaleString('es-PY')+'</td></tr>').join('')+'</tbody></table>';}const r2=await fetchApi(API+'/api/compras/reportes/pendientes-pago');if(r2.ok){const rows=await r2.json();const e=document.getElementById('reporte-pendientes-pago');if(e)e.innerHTML='<table class="tabla"><thead><tr><th>Fecha</th><th>Proveedor</th><th>Número</th><th>Total</th><th>Estado</th></tr></thead><tbody>'+rows.map(x=>'<tr><td>'+escapeHtml(x.fecha)+'</td><td>'+escapeHtml(x.proveedor)+'</td><td>'+escapeHtml(x.numero)+'</td><td>'+Number(x.total||0).toLocaleString('es-PY')+'</td><td>'+escapeHtml(x.estado)+'</td></tr>').join('')+'</tbody></table>';}}
async function prepararModuloCompras(){await cargarUnidadesMedida();await cargarComprasCatalogos();if(typeof cargarCentrosCostos==='function')await cargarCentrosCostos();llenarSelectCentroCostoNC();await cargarDatosRegistrarFactura();await cargarComprobantesCompra();await cargarNotasCreditoCompra();await cargarReportesCompras();document.getElementById('comp-timbrado')?.addEventListener('change',validarFacturaEnPantalla);}

setTimeout(()=>{if(typeof prepararModuloCompras==='function') prepararModuloCompras();},1200);

async function mostrarCuotero(comprobanteId){
 const box=document.getElementById('cuotero-generado');if(!box)return;
 const r=await fetchApi(API+'/api/compras/cuotas/'+comprobanteId);if(!r.ok){box.innerHTML='';return;}
 const rows=await r.json();
 if(!rows.length){box.innerHTML='<div class="sin-datos">La factura quedó sin cuotas asociadas.</div>';return;}
 box.innerHTML='<h3 style="margin:0 0 10px">Cuotero generado</h3><table class="tabla"><thead><tr><th>Cuota</th><th>Vencimiento</th><th>Importe</th><th>Saldo</th><th>Estado</th></tr></thead><tbody>'+
 rows.map(x=>'<tr><td>'+x.numero_cuota+'</td><td>'+escapeHtml(x.fecha_vencimiento)+'</td><td>'+Number(x.importe||0).toLocaleString('es-PY')+'</td><td>'+Number(x.saldo||0).toLocaleString('es-PY')+'</td><td>'+escapeHtml(x.estado)+'</td></tr>').join('')+
 '</tbody></table>';
}

// Carga de módulos ERP adicionales
(function(){
  function cargarTodos(){
    ['inventarios.js','activo_fijo.js','personas.js'].forEach(function(src){
      if(document.querySelector('script[data-erp-modulo="'+src+'"]')) return;
      var x=document.createElement('script');
      x.src=src+'?v=20260926';
      x.async=false;
      x.dataset.erpModulo=src;
      x.onload=function(){console.log('[Kakuaa] Módulo ERP cargado:',src);};
      x.onerror=function(){console.error('[Kakuaa] No se pudo cargar el módulo ERP:',src);};
      (document.head||document.body).appendChild(x);
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',cargarTodos,{once:true});
  else cargarTodos();
})();


let sifenConsultaEnCurso=false;
function limpiarResultadoSifen(){
  const el=document.getElementById("sifen-cdc-resultado");
  if(el) el.innerHTML="";
  window.ultimoSifenConsulta=null;
}

function abrirConsultaPublicaDnit(){
  const input=document.getElementById("sifen-cdc");
  const cdc=(input?.value||"").replace(/\s+/g,"");
  const resultado=document.getElementById("sifen-cdc-resultado");
  if(!/^\d{44}$/.test(cdc)){
    if(resultado) resultado.innerHTML='<div class="inv-note" style="border-left:4px solid var(--rojo,#b42318)">Ingresá primero un CDC válido de 44 dígitos.</div>';
    input?.focus();
    return;
  }
  // DNIT bloquea explícitamente el uso dentro de iframe mediante
  // Content-Security-Policy: frame-ancestors 'none'. Por eso nunca
  // intentamos incrustar e-Kuatia en Kakuaa: abrimos el portal oficial
  // como navegación de nivel superior.
  const url="https://ekuatia.set.gov.py/consultas/";
  window.open(url,"_blank","noopener,noreferrer");
  if(resultado){
    resultado.innerHTML='<div class="inv-note"><strong>Consulta pública DNIT abierta.</strong><br>CDC preparado: '+escapeHtml(cdc)+'<br>Completá el reCAPTCHA y consultá en la pestaña de DNIT. Esta vía es manual; la consulta automática de Kakuaa utiliza la integración backend.</div>';
  }
}

function _xmlLocalName(node){
  return String(node?.localName || node?.nodeName || "").split(":").pop();
}
function _xmlText(root,names){
  const wanted=new Set((Array.isArray(names)?names:[names]).map(x=>String(x)));
  const nodes=root?.getElementsByTagName("*")||[];
  for(const n of nodes){
    if(wanted.has(_xmlLocalName(n))){
      const value=(n.textContent||"").trim();
      if(value)return value;
    }
  }
  return "";
}
function _xmlItems(root){
  const nodes=root?.getElementsByTagName("*")||[];
  const items=[];
  for(const n of nodes){
    if(_xmlLocalName(n)!=="gCamItem")continue;
    const get=(names)=>_xmlText(n,names);
    items.push({
      codigo:get(["dCodInt"]),
      descripcion:get(["dDesProSer"]),
      cantidad:get(["dCantProSer"]),
      unidad:get(["dDesUniMed"]),
      precio_unitario:get(["dPUniProSer"]),
      iva:get(["dTasaIVA"]),
      subtotal:get(["dTotOpeItem"])
    });
  }
  return items;
}
function _renderImportacionXmlSifen(doc){
  const resultado=document.getElementById("sifen-cdc-resultado");
  if(!resultado)return;
  const campos={
    cdc:_xmlText(doc,["DE"]),
    fecha_emision:_xmlText(doc,["dFeEmiDE"]),
    ruc_emisor:_xmlText(doc,["dRucEm"]),
    razon_social_emisor:_xmlText(doc,["dNomEmi","dRazSocEm"]),
    ruc_receptor:_xmlText(doc,["dRucRec"]),
    razon_social_receptor:_xmlText(doc,["dNomRec","dNomRec"]),
    moneda:_xmlText(doc,["cMoneOpe"]),
    total:_xmlText(doc,["dTotGralOpe"]),
    total_iva:_xmlText(doc,["dTotIVA"]),
    timbrado:_xmlText(doc,["dNumTim"]),
    establecimiento:_xmlText(doc,["dEst"]),
    punto_expedicion:_xmlText(doc,["dPunExp"]),
    numero_documento:_xmlText(doc,["dNumDoc"])
  };
  let cdc=campos.cdc;
  if(!/^\d{44}$/.test(cdc)){
    const deNodes=doc.getElementsByTagName("*");
    for(const n of deNodes){
      const id=n.getAttribute?.("Id")||"";
      if(/^\d{44}$/.test(id)){cdc=id;break;}
    }
  }
  campos.cdc=cdc;
  const items=_xmlItems(doc);
  window.ultimoSifenConsulta={ok:true,cdc:cdc,documento:campos,items:items,xml_de:new XMLSerializer().serializeToString(doc)};
  resultado.innerHTML=
    '<div class="card" style="margin-top:14px">'+
      '<div style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap">'+
        '<div><strong>✓ XML DTE leído correctamente</strong><div class="inv-help">Importación local · sin certificado digital</div></div>'+
        '<span class="badge badge-verde">XML VÁLIDO</span>'+
      '</div>'+
      '<div class="form-grid" style="margin-top:14px">'+
        '<input value="'+escapeHtml(campos.ruc_emisor||"")+'" readonly placeholder="RUC emisor">'+
        '<input value="'+escapeHtml(campos.razon_social_emisor||"")+'" readonly placeholder="Razón social">'+
        '<input value="'+escapeHtml(campos.fecha_emision||"")+'" readonly placeholder="Fecha de emisión">'+
        '<input value="'+escapeHtml(campos.timbrado||"")+'" readonly placeholder="Timbrado">'+
        '<input value="'+escapeHtml(campos.establecimiento||"")+'" readonly placeholder="Establecimiento">'+
        '<input value="'+escapeHtml(campos.punto_expedicion||"")+'" readonly placeholder="Punto de expedición">'+
        '<input value="'+escapeHtml(campos.numero_documento||"")+'" readonly placeholder="Número">'+
        '<input value="'+escapeHtml(campos.total||"")+'" readonly placeholder="Total">'+
        '<input value="'+escapeHtml(campos.total_iva||"")+'" readonly placeholder="IVA">'+
        '<input class="full" value="'+escapeHtml(cdc||"")+'" readonly placeholder="CDC">'+
      '</div>'+
      '<div class="inv-actions" style="margin-top:14px">'+
        '<button class="btn btn-verde" onclick="prepararImportacionSifen()">↓ Preparar importación a Compras</button>'+
      '</div>'+
      '<details style="margin-top:14px"><summary>Ver ítems detectados ('+items.length+')</summary><div style="overflow:auto;margin-top:10px"><table class="tabla"><thead><tr><th>Código</th><th>Descripción</th><th>Cantidad</th><th>Unidad</th><th>Precio</th><th>IVA</th></tr></thead><tbody>'+
        (items.length?items.map(x=>'<tr><td>'+escapeHtml(x.codigo||"")+'</td><td>'+escapeHtml(x.descripcion||"")+'</td><td>'+escapeHtml(x.cantidad||"")+'</td><td>'+escapeHtml(x.unidad||"")+'</td><td>'+escapeHtml(x.precio_unitario||"")+'</td><td>'+escapeHtml(x.iva||"")+'</td></tr>').join(""):'<tr><td colspan="6">No se detectaron ítems con la estructura esperada.</td></tr>')+
      '</tbody></table></div></details>'+
    '</div>';
}
async function importarXmlSifen(input){
  const archivo=input?.files?.[0];
  if(!archivo)return;
  const resultado=document.getElementById("sifen-cdc-resultado");
  try{
    const texto=await archivo.text();
    const parser=new DOMParser();
    const doc=parser.parseFromString(texto,"application/xml");
    if(doc.getElementsByTagName("parsererror").length)throw new Error("El archivo no contiene XML válido.");
    const root=doc.documentElement;
    if(!root)throw new Error("El XML está vacío.");
    _renderImportacionXmlSifen(root);
    const cdc=(window.ultimoSifenConsulta?.cdc||"").replace(/\s+/g,"");
    if(cdc&&/^\d{44}$/.test(cdc)){
      const inputCdc=document.getElementById("sifen-cdc");
      if(inputCdc)inputCdc.value=cdc;
    }
    const formData=new FormData();
    formData.append("xml",archivo,archivo.name);
    const subida=await fetchApi(API+"/api/compras/dte/importar-xml",{method:"POST",body:formData});
    const subidaData=await subida.json().catch(()=>({}));
    if(subida.ok){
      window.ultimoSifenConsulta=subidaData;
      const box=document.getElementById("sifen-cdc-resultado");
      if(box){
        const aviso=document.createElement("div");
        aviso.className="inv-note";
        aviso.style.marginTop="10px";
        aviso.innerHTML="<strong>✓ DTE guardado en Kakuaa.</strong><br>Las próximas consultas de este CDC se resolverán desde la base local, sin CAPTCHA.";
        box.appendChild(aviso);
      }
    }else{
      console.warn("XML leído pero no quedó guardado en Kakuaa:",subidaData.error||"error");
    }
  }catch(e){
    console.error(e);
    if(resultado)resultado.innerHTML='<div class="inv-note" style="border-left:4px solid var(--rojo,#b42318)"><strong>No se pudo leer el XML.</strong><br>'+escapeHtml(e.message||"Archivo inválido.")+'</div>';
  }finally{
    if(input)input.value="";
  }
}

async function cargarSifenConfiguracion(){
 const estado=document.getElementById('sifen-config-estado'),detalle=document.getElementById('sifen-config-detalle');
 try{
  const r=await fetchApi(API+'/api/sifen/configuracion'),d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(d.error||'No se pudo consultar la configuración SIFEN.');
  const amb=document.getElementById('sifen-ambiente'),act=document.getElementById('sifen-activo');
  if(amb)amb.value=d.ambiente||'test';if(act)act.checked=!!d.activo;
  ['sifen-cert-path','sifen-key-path','sifen-ca-bundle'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  if(detalle)detalle.innerHTML='<strong>Cliente:</strong> '+escapeHtml(d.razon_social||'—')+' · <strong>RUC:</strong> '+escapeHtml(d.ruc||'—')+'<br>Certificado: '+(d.certificado_configurado?'Sí':'No')+' · Clave privada: '+(d.clave_configurada?'Sí':'No');
  if(estado)estado.innerHTML=d.configurado?'<span class="badge badge-verde">SIFEN CONFIGURADO</span>':'<span class="badge" style="background:#fff7e6;color:#a15c00">PENDIENTE DE CERTIFICADO</span>';
 }catch(e){if(estado)estado.textContent='No disponible';if(detalle)detalle.textContent=e.message||'No se pudo cargar la configuración.';}
}
async function guardarSifenConfiguracion(){
 const body={ambiente:document.getElementById('sifen-ambiente')?.value||'test',activo:!!document.getElementById('sifen-activo')?.checked,cert_path:document.getElementById('sifen-cert-path')?.value.trim()||'',key_path:document.getElementById('sifen-key-path')?.value.trim()||'',ca_bundle:document.getElementById('sifen-ca-bundle')?.value.trim()||''};
 if(body.activo&&(!body.cert_path||!body.key_path)){alert('Para activar SIFEN necesitamos primero certificado y clave privada en el servidor.');return;}
 try{const r=await fetchApi(API+'/api/sifen/configuracion',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),d=await r.json().catch(()=>({}));if(!r.ok){alert(d.error||'No se pudo guardar.');return;}alert('Configuración SIFEN guardada.');await cargarSifenConfiguracion();}catch(e){alert(e.message||'No se pudo guardar.');}
}
async function diagnosticarSifen(){
 const cdc=(document.getElementById('sifen-diagnostico-cdc')?.value||'').replace(/\s+/g,'');const out=document.getElementById('sifen-diagnostico-resultado');
 if(!/^\d{44}$/.test(cdc)){if(out)out.innerHTML='<div class="inv-note">Ingresá un CDC válido de 44 dígitos.</div>';return;}
 if(out)out.innerHTML='<div class="inv-note">Probando WS Consulta DE de SIFEN…</div>';
 try{const r=await fetchApi(API+'/api/sifen/diagnostico',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cdc})}),d=await r.json().catch(()=>({}));if(!r.ok||!d.ok){if(out)out.innerHTML='<div class="inv-note" style="border-left:4px solid var(--rojo,#b42318)"><strong>Diagnóstico no completado</strong><br>'+escapeHtml(d.error||'No se pudo probar SIFEN.')+'</div>';return;}const s=d.resultado||{};if(out)out.innerHTML='<div class="inv-note" style="border-left:4px solid var(--verde,#2e9e5b)"><strong>✓ Conexión SIFEN operativa.</strong><br>Código: '+escapeHtml(s.codigo||'—')+'</div>';if(s.xml_de){const x=new DOMParser().parseFromString(s.xml_de,'application/xml');if(!x.getElementsByTagName('parsererror').length){_renderImportacionXmlSifen(x.documentElement);window.ultimoSifenConsulta=s;}}}catch(e){if(out)out.innerHTML='<div class="inv-note" style="border-left:4px solid var(--rojo,#b42318)">'+escapeHtml(e.message||'Error de conexión.')+'</div>';}
}
async function consultarDteCache(cdc){
  try{
    const r=await fetchApi(API+"/api/compras/dte/"+encodeURIComponent(cdc));
    if(r.status===404)return false;
    const d=await r.json().catch(()=>({}));
    if(!r.ok||!d.found)return false;
    window.ultimoSifenConsulta={
      ok:true,
      cdc:d.documento?.cdc||cdc,
      documento:d.documento||{},
      xml_de:d.xml_de||"",
      fuente:d.fuente||"KAKUAA"
    };
    if(d.xml_de){
      const doc=new DOMParser().parseFromString(d.xml_de,"application/xml");
      if(!doc.getElementsByTagName("parsererror").length){
        const root=doc.documentElement;
        const get=(names)=>_xmlText(root,names);
        const items=_xmlItems(root).map(x=>({
          codigoInterno:x.codigo,
          descripcion:x.descripcion,
          cantidad:x.cantidad,
          precioUnitario:x.precio_unitario,
          tasaIva:x.iva,
          totalOperacionItem:x.subtotal
        }));
        window.ultimoSifenConsulta.CDC=d.documento?.cdc||cdc;
        window.ultimoSifenConsulta.fechaEmision=get(["dFeEmiDE"]);
        window.ultimoSifenConsulta.emisor={
          ruc:get(["dRucEm"]),
          razonSocial:get(["dNomEmi","dRazSocEm"])
        };
        window.ultimoSifenConsulta.receptor={
          ruc:get(["dRucRec"]),
          razonSocial:get(["dNomRec"])
        };
        window.ultimoSifenConsulta.timbrado={
          numeroTimbrado:get(["dNumTim"]),
          establecimiento:get(["dEst"]),
          puntoExpedicion:get(["dPunExp"]),
          numeroDocumento:get(["dNumDoc"])
        };
        window.ultimoSifenConsulta.totalDocumento={
          totalNeto:get(["dTotGralOpe"]),
          totalIva:get(["dLiqTotIVA","dTotIVA"]),
          iva05:get(["dIVA5"]),
          iva10:get(["dIVA10"])
        };
        window.ultimoSifenConsulta.detalleFactura=items;
        window.ultimoSifenConsulta.moneda=get(["cMoneOpe"]);
      }
    }
    if(typeof _renderSifenNormalizado==="function") _renderSifenNormalizado(window.ultimoSifenConsulta);
    const resultado=document.getElementById("sifen-cdc-resultado");
    if(resultado){
      const nota=document.createElement("div");
      nota.className="inv-note";
      nota.innerHTML="<strong>✓ DTE recuperado desde Kakuaa.</strong><br>No fue necesario consultar nuevamente a DNIT.";
      resultado.insertBefore(nota,resultado.firstChild);
    }
    return true;
  }catch(e){
    console.error("No se pudo consultar el cache DTE",e);
    return false;
  }
}

function _normalizarRespuestaConsultaMe(d, cdc){
  let x=(d&&typeof d==="object")?d:{};
  // Algunas respuestas de proveedores vienen envueltas más de una vez
  // (data -> result -> document). Desenrollamos hasta tres niveles.
  for(let i=0;i<3;i++){
    const siguiente=x?.data||x?.document||x?.documento||x?.result||x?.resultado;
    if(!siguiente || typeof siguiente!=="object" || Array.isArray(siguiente)) break;
    x=siguiente;
  }
  const pick=(...ks)=>{for(const k of ks){if(x[k]!==undefined&&x[k]!==null&&x[k]!=="")return x[k];if(d?.[k]!==undefined&&d[k]!==null&&d[k]!=="")return d[k];}return "";};
  const items=x.items||x.detalleFactura||x.detalle||x.detalles||x.detalleItems||x.lineas||[];
  const doc=x.documento&&typeof x.documento==="object"?x.documento:{};
  const em=(x.emisor&&typeof x.emisor==="object")?x.emisor:{};
  const rec=(x.receptor&&typeof x.receptor==="object")?x.receptor:{};
  const tim=(x.timbrado&&typeof x.timbrado==="object")?x.timbrado:{};
  const n={
    ...d,
    ...x,
     cdc:pick("cdc","CDC")||cdc,
     CDC:pick("CDC","cdc")||cdc,
     tipo_documento:(()=>{
       const raw=String(pick("tipo_documento","tipoDocumento","tipo_de","tipoDocumentoElectronico","dDesTipDE","tipo")||"").toUpperCase();
       const code=String(pick("iTiDE","tipoDocumentoCodigo","c002")||"");
       const cc=String(pick("CDC","cdc")||cdc);
       if(raw.includes("NOTA")&&raw.includes("CRED"))return "NOTA_CREDITO";
       if(code==="5"||cc.slice(0,2)==="05")return "NOTA_CREDITO";
       if(code==="6"||cc.slice(0,2)==="06")return "NOTA_DEBITO";
       return "FACTURA";
     })(),
     documento:{
      ...doc,
      cdc:pick("cdc","CDC")||cdc,
      fecha_emision:pick("fecha_emision","fechaEmision","dFeEmiDE","fecha")||"",
      ruc_emisor:pick("ruc_emisor","rucEmisor","dRucEm","rucEmisor")||em.ruc||em.rucEmisor||"",
      razon_social_emisor:pick("razon_social_emisor","razonSocialEmisor","dNomEmi","razonSocial")||em.razonSocial||em.razon_social||em.nombre||"",
      ruc_receptor:pick("ruc_receptor","rucReceptor","dRucRec")||rec.ruc||rec.rucReceptor||"",
      razon_social_receptor:pick("razon_social_receptor","razonSocialReceptor","dNomRec")||rec.razonSocial||rec.razon_social||rec.nombre||"",
      timbrado:pick("timbrado","numeroTimbrado","dNumTim")||tim.numeroTimbrado||tim.numero_timbrado||"",
      establecimiento:pick("establecimiento","dEst")||tim.establecimiento||"",
      punto_expedicion:pick("punto_expedicion","puntoExpedicion","dPunExp")||tim.puntoExpedicion||"",
      numero_documento:pick("numero_documento","numeroDocumento","dNumDoc")||tim.numeroDocumento||"",
      total:pick("total","totalDocumento","dTotGralOpe","totalGeneral")||"",
      total_iva:pick("total_iva","totalIva","dLiqTotIVA","dTotIVA","ivaTotal")||"",
      moneda:pick("moneda","currency","cMoneOpe","monedaOperacion")||"PYG"
    },
    items:Array.isArray(items)?items:[]
  };
  n.emisor={ruc:n.documento.ruc_emisor,razonSocial:n.documento.razon_social_emisor};
  n.receptor={ruc:n.documento.ruc_receptor,razonSocial:n.documento.razon_social_receptor};
  n.timbrado={numeroTimbrado:n.documento.timbrado,establecimiento:n.documento.establecimiento,puntoExpedicion:n.documento.punto_expedicion,numeroDocumento:n.documento.numero_documento};
  // Conservamos la estructura real de ConsultaMe Factura y, además,
  // dejamos valores simples para que el formulario de Compras pueda cargarlos.
  const td=(x&&typeof x.totalDocumento==="object")?x.totalDocumento:{};
  n.totalDocumento={
    ...td,
    totalNeto:td.totalNeto??td.totalNetoOperacion??n.documento.total??"",
    totalIva:td.totalIva??td.ivaTotal??n.documento.total_iva??"",
    iva05:td.iva05??td.iva5??"",
    iva10:td.iva10??td.iva10??"",
    totalGravada05:td.totalGravada05??td.gravada05??"",
    totalGravada10:td.totalGravada10??td.gravada10??"",
    subtotalExcenta:td.subtotalExcenta??td.subtotalExenta??td.exento??"",
    subTotal05:td.subTotal05??td.subtotal05??"",
    subTotal10:td.subTotal10??td.subtotal10??""
  };
  n.documento.total=n.totalDocumento.totalNeto;
  n.documento.total_iva=n.totalDocumento.totalIva;
  n.detalleFactura=n.items;
  return n;
}

async function sifenAgregarProveedorDesdeDte(){
  const d=window.ultimoSifenConsulta||{}, doc=d.documento||{};
  const ruc=String(doc.ruc_emisor||'').trim();
  if(!ruc){alert('El DTE no contiene un RUC de emisor válido.');return;}
  const razon=String(doc.razon_social_emisor||'').trim();
  const existente=(comprasCatalogosCache.proveedores||[]).find(x=>String(x.ruc||'').trim().toUpperCase()===ruc.toUpperCase());
  if(existente){alert('El proveedor ya está registrado en Kakuaa.');return;}
  const modal=document.createElement('div');
  modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px';
  modal.innerHTML='<div class="card" style="width:min(620px,100%);max-height:90vh;overflow:auto;padding:20px"><h3 style="margin-top:0">Agregar proveedor desde DTE</h3><p class="inv-help">Kakuaa encontró un proveedor que todavía no está registrado. Los datos fiscales del DTE se precargan para evitar doble carga.</p><div class="form-grid"><div><small>RUC</small><input id="sif-prov-ruc" value="'+escapeHtml(ruc)+'" readonly></div><div><small>Razón social</small><input id="sif-prov-razon" value="'+escapeHtml(razon)+'" readonly></div><div><small>Nombre comercial</small><input id="sif-prov-nombre" value="'+escapeHtml(razon)+'"></div><div><small>Teléfono</small><input id="sif-prov-tel" value="'+escapeHtml(doc.telefono||'')+'"></div><div><small>Correo</small><input id="sif-prov-email" value="'+escapeHtml(doc.email||'')+'"></div><div class="full"><small>Dirección</small><input id="sif-prov-dir" value="'+escapeHtml(doc.direccion||'')+'"></div></div><div class="inv-actions"><button class="btn btn-gris" onclick="this.closest(\'div[style*=fixed]\').remove()">Cancelar</button><button class="btn btn-verde" id="sif-prov-guardar">✓ Agregar proveedor</button></div></div>';
  document.body.appendChild(modal);
  modal.querySelector('#sif-prov-guardar').onclick=async()=>{
    const btn=modal.querySelector('#sif-prov-guardar');btn.disabled=true;btn.textContent='Guardando…';
    try{
      const body={ruc,razon_social:razon,nombre_comercial:modal.querySelector('#sif-prov-nombre').value.trim(),documento:ruc,correo:modal.querySelector('#sif-prov-email').value.trim(),telefono:modal.querySelector('#sif-prov-tel').value.trim(),direccion:modal.querySelector('#sif-prov-dir').value.trim()};
      const rr=await fetchApi(API+'/api/compras/proveedores',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const dd=await rr.json().catch(()=>({}));if(!rr.ok)throw Error(dd.error||'No se pudo agregar el proveedor.');
      modal.remove();await cargarComprasCatalogos();
      _renderSifenNormalizado(window.ultimoSifenConsulta);
      alert('✓ Proveedor agregado a Kakuaa.');
    }catch(e){alert(e.message||'No se pudo agregar el proveedor.');btn.disabled=false;btn.textContent='✓ Agregar proveedor';}
  };
}

async function sifenAgregarArticuloDesdeDte(itemIndex){
  const d=window.ultimoSifenConsulta||{}, item=(d.items||[])[itemIndex];
  if(!item)return;
  try{
    const unidades=await (async()=>{const rr=await fetchApi(API+'/api/compras/unidades-medida');if(!rr.ok)throw Error('No se pudieron cargar las unidades de medida.');return await rr.json();})();
    const inv=await (async()=>{const rr=await fetchApi(API+'/api/inventarios/items');if(!rr.ok)throw Error('No se pudo consultar Inventarios.');return await rr.json();})();
    const maxCodigo=inv.reduce((m,x)=>{const n=Number(String(x.codigo||'').replace(/\D/g,''));return Number.isFinite(n)?Math.max(m,n):m},0);
    const iva=Number(item.tasaIva??item.iva??0);
    const descripcion=String(item.descripcion||item.descripcionProducto||'').trim();
    const modal=document.createElement('div');
    modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px';
    modal.innerHTML='<div class="card" style="width:min(700px,100%);max-height:90vh;overflow:auto;padding:20px"><h3 style="margin-top:0">Agregar artículo desde DTE</h3><p class="inv-help">El código interno de Kakuaa se genera automáticamente. El código del proveedor no se usa como código interno.</p><div class="form-grid"><div><small>Código interno Kakuaa</small><input value="'+(maxCodigo+1)+'" readonly></div><div><small>Descripción</small><input id="sif-art-desc" value="'+escapeHtml(descripcion)+'"></div><div><small>Unidad de medida *</small><select id="sif-art-um"><option value="">Seleccioná una unidad</option>'+(unidades||[]).filter(x=>Number(x.activo)!==0).map(x=>'<option value="'+x.id+'">'+escapeHtml((x.codigo||'')+' — '+(x.nombre||''))+'</option>').join('')+'</select></div><div><small>IVA</small><select id="sif-art-iva"><option value="0" '+(iva===0?'selected':'')+'>Exento 0%</option><option value="5" '+(iva===5?'selected':'')+'>5%</option><option value="10" '+(iva===10?'selected':'')+'>10%</option></select></div><div><small>Método de costeo</small><select id="sif-art-cost"><option value="PPP">PPP — Precio Promedio Ponderado</option><option value="PEPS">PEPS — Primero en Entrar, Primero en Salir</option></select></div><div><small>Stock mínimo</small><input id="sif-art-min" type="number" min="0" value="0"></div></div><div class="inv-actions"><button class="btn btn-gris" onclick="this.closest(\'div[style*=fixed]\').remove()">Cancelar</button><button class="btn btn-verde" id="sif-art-guardar">✓ Agregar a Inventarios</button></div></div>';
    document.body.appendChild(modal);
    modal.querySelector('#sif-art-guardar').onclick=async()=>{
      const btn=modal.querySelector('#sif-art-guardar');
      const um=modal.querySelector('#sif-art-um').value;
      if(!um){alert('Seleccioná una unidad de medida.');return;}
      btn.disabled=true;btn.textContent='Guardando…';
      try{
        const u=(unidades||[]).find(x=>Number(x.id)===Number(um));
        const body={codigo:String(maxCodigo+1),nombre:modal.querySelector('#sif-art-desc').value.trim(),unidad_medida_id:Number(um),unidad_codigo:u?.codigo||'',tipo_iva:Number(modal.querySelector('#sif-art-iva').value),metodo_costeo:modal.querySelector('#sif-art-cost').value,stock_minimo:Number(modal.querySelector('#sif-art-min').value||0),precio_base:Number(item.precioUnitario??item.precio_unitario??0),descripcion:descripcion,inventariable:1};
        if(!body.nombre)throw Error('La descripción es obligatoria.');
        const rr=await fetchApi(API+'/api/inventarios/items',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
        const dd=await rr.json().catch(()=>({}));if(!rr.ok)throw Error(dd.error||'No se pudo agregar el artículo.');
        modal.remove();alert('✓ Artículo agregado a Inventarios.');await cargarComprasCatalogos();_renderSifenNormalizado(window.ultimoSifenConsulta);
      }catch(e){alert(e.message||'No se pudo agregar el artículo.');btn.disabled=false;btn.textContent='✓ Agregar a Inventarios';}
    };
  }catch(e){alert(e.message||'No se pudo preparar el alta del artículo.');}
}

function _renderSifenNormalizado(d){
  const box=document.getElementById("sifen-cdc-resultado");if(!box)return;
  const doc=d?.documento||{},td=d?.totalDocumento||{},items=Array.isArray(d?.items)?d.items:[];
  const fmt=v=>{const n=Number(v);return Number.isFinite(n)?n.toLocaleString("es-PY",{minimumFractionDigits:2,maximumFractionDigits:2}):String(v??"—")};
  const esc=v=>escapeHtml(String(v??"")),fecha=doc.fecha_emision?String(doc.fecha_emision).slice(0,10):"";
  const provExiste=(comprasCatalogosCache.proveedores||[]).some(x=>String(x.ruc||"").trim().toUpperCase()===String(doc.ruc_emisor||"").trim().toUpperCase());
  const invPromise=items.map(async(item,i)=>{try{const rr=await fetchApi(API+"/api/inventarios/items");if(!rr.ok)return false;const rows=await rr.json();const desc=String(item.descripcion||item.descripcionProducto||"").trim().toLowerCase();return rows.some(x=>String(x.nombre||"").trim().toLowerCase()===desc)}catch(_){return false}});
  Promise.all(invPromise).then(found=>{
    const articleActions=items.map((x,i)=>found[i]?'✓ Artículo registrado':'<button class="btn btn-azul btn-pequeno" onclick="sifenAgregarArticuloDesdeDte('+i+')">＋ Agregar a Inventarios</button>').join('<br>');
    box.innerHTML=
      '<div class="card" style="margin-top:14px"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><div><strong>✓ DTE encontrado</strong><div class="inv-help">Previsualización antes de cargar a Registrar Factura</div></div><span class="badge badge-verde">DTE DISPONIBLE</span></div>'+
      '<div class="form-grid" style="margin-top:14px">'+
      '<div><small>CDC</small><input value="'+esc(d.CDC||d.cdc||"")+'" readonly></div><div><small>Fecha de emisión</small><input value="'+esc(fecha)+'" readonly></div><div><small>RUC emisor</small><input value="'+esc(doc.ruc_emisor)+'" readonly></div><div><small>Razón social</small><input value="'+esc(doc.razon_social_emisor)+'" readonly></div><div><small>Timbrado</small><input value="'+esc(doc.timbrado)+'" readonly></div><div><small>Documento</small><input value="'+esc((doc.establecimiento||"")+"-"+(doc.punto_expedicion||"")+"-"+(doc.numero_documento||""))+'" readonly></div><div><small>RUC receptor</small><input value="'+esc(doc.ruc_receptor)+'" readonly></div><div><small>Receptor</small><input value="'+esc(doc.razon_social_receptor)+'" readonly></div></div>'+
      '<h4 style="margin:18px 0 8px">Totales del DTE</h4><div class="form-grid"><input value="Exento: '+esc(fmt(td.subtotalExcenta))+'" readonly><input value="Gravado 5%: '+esc(fmt(td.subTotal05))+'" readonly><input value="Gravado 10%: '+esc(fmt(td.subTotal10))+'" readonly><input value="IVA 5%: '+esc(fmt(td.iva05))+'" readonly><input value="IVA 10%: '+esc(fmt(td.iva10))+'" readonly><input value="IVA total: '+esc(fmt(td.totalIva))+'" readonly><input class="full" value="TOTAL DTE: '+esc(fmt(td.totalNeto))+'" readonly style="font-weight:700"></div>'+
      '<h4 style="margin:18px 0 8px">Proveedor</h4><div class="inv-note">'+(provExiste?'✓ Este proveedor ya está registrado en Kakuaa.':'⚠ Este proveedor todavía no está registrado en Kakuaa.')+'</div>'+
      (!provExiste?'<button class="btn btn-azul" onclick="sifenAgregarProveedorDesdeDte()">＋ Agregar proveedor</button>':'')+
      '<h4 style="margin:18px 0 8px">Ítems del DTE ('+items.length+')</h4><div style="overflow:auto"><table class="tabla"><thead><tr><th>Código proveedor</th><th>Descripción</th><th>Cantidad</th><th>Precio unitario</th><th>IVA</th><th>Total</th><th>Inventarios</th></tr></thead><tbody>'+
      (items.length?items.map((x,i)=>'<tr><td>'+esc(x.codigoInterno||x.codigo||"")+'</td><td>'+esc(x.descripcion||x.descripcionProducto||"")+'</td><td>'+esc(x.cantidad||"")+'</td><td>'+esc(fmt(x.precioUnitario??x.precio_unitario))+'</td><td>'+esc((x.tasaIva??x.iva??"")+"%")+'</td><td>'+esc(fmt(x.totalOperacionItem??x.totalBruto??x.subtotal))+'</td><td>'+articleActions.split('<br>')[i]+'</td></tr>').join(""):'<tr><td colspan="7">Sin ítems detectados.</td></tr>')+
      '</tbody></table></div><div class="inv-actions" style="margin-top:16px"><button class="btn btn-verde" onclick="prepararImportacionSifen()">✓ Aprobar y cargar en Compras</button><button class="btn btn-gris" onclick="document.getElementById(\'sifen-cdc-resultado\').innerHTML=\'\'">Cancelar</button></div></div>';
  });
}

async function consultarSifenPorCdc(){
  const input=document.getElementById("sifen-cdc");
  const resultado=document.getElementById("sifen-cdc-resultado");
  const btn=document.getElementById("btn-consultar-sifen");
  const cdc=(input?.value||"").replace(/\s+/g,"");
  if(!/^\d{44}$/.test(cdc)){
    if(resultado)resultado.innerHTML='<div class="inv-note" style="border-left:4px solid var(--rojo,#b42318)">El CDC debe contener exactamente 44 dígitos numéricos.</div>';
    input?.focus(); return;
  }
  if(sifenConsultaEnCurso)return;
  sifenConsultaEnCurso=true;
  if(resultado)resultado.innerHTML='<div class="inv-note">Buscando primero en la biblioteca de DTE de Kakuaa…</div>';
  try{
    const encontrado=await consultarDteCache(cdc);
    if(encontrado){
      if(window.ultimoSifenConsulta?.CDC||window.ultimoSifenConsulta?.emisor){
        _renderSifenNormalizado(window.ultimoSifenConsulta);
      }
      return;
    }
    if(btn){btn.disabled=true;btn.textContent="Consultando SIFEN…";}
    if(resultado)resultado.innerHTML='<div class="inv-note">Consultando el DTE por CDC…</div>';
    const r=await fetchApi(API+"/api/sifen/consulta-cdc",{
      method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({cdc})
    });
    const d=await r.json().catch(()=>({}));
    console.info("[Kakuaa][SIFEN][CDC]", {
      http:r.status, ok:d.ok, estado:d.estado, fuente:d.fuente,
      proveedor_http:d.proveedor_http, claves:Object.keys(d||{}),
      diagnostico:d._kakuaa_diagnostico||null
    });
    if(!r.ok){
      if(resultado)resultado.innerHTML='<div class="inv-note" style="border-left:4px solid var(--rojo,#b42318)"><strong>Consulta no completada</strong><br>'+escapeHtml(d.error||"No se pudo consultar el CDC en SIFEN.")+'</div>';
      return;
    }
    if(d.public_only){
      if(resultado)resultado.innerHTML='<div class="inv-note" style="border-left:4px solid var(--amarillo,#b7791f)"><strong>Consulta automática no disponible</strong><br>'+escapeHtml(d.mensaje||"No fue posible obtener el DTE automáticamente.")+'</div>';
      return;
    }
    if(d.xml_de || d.CDC || d.cdc || d.emisor || d.detalleFactura || d.items || d.documento || d.data || d.document || d.result || d.resultado){
      const normalizado=_normalizarRespuestaConsultaMe(d,cdc);
      window.ultimoSifenConsulta=normalizado;
      if(typeof _renderSifenNormalizado==="function") _renderSifenNormalizado(normalizado);
      // La previsualización queda pendiente de aprobación. El botón de aprobación
      // deriva automáticamente una Nota de Crédito al módulo correspondiente.
    }else{
      if(resultado)resultado.innerHTML='<div class="inv-note" style="border-left:4px solid var(--rojo,#b42318)"><strong>Consulta realizada, pero sin DTE reconocible.</strong><br>Estado: '+escapeHtml(String(d.estado||d.status||"SIN_DATOS"))+(d.proveedor_http?" · HTTP "+escapeHtml(String(d.proveedor_http)):"")+'<br>'+escapeHtml(d.mensaje||"La respuesta no contiene campos reconocibles del documento.")+'</div>';
    }
  }catch(e){
    console.error(e);
    if(resultado)resultado.innerHTML='<div class="inv-note" style="border-left:4px solid var(--rojo,#b42318)">Error de conexión con Kakuaa/SIFEN.</div>';
  }finally{
    sifenConsultaEnCurso=false;
    if(btn){btn.disabled=false;btn.textContent="Consultar DTE por CDC";}
  }
}
async function prepararImportacionSifen(){
 const d=window.ultimoSifenConsulta;if(!d?.documento){alert('Primero consultá un CDC válido.');return;}
 if(String(d.tipo_documento||'').toUpperCase()==='NOTA_CREDITO')return prepararImportacionNotaCredito(d);
 const doc=d.documento;if(typeof cambiarVista==='function')cambiarVista('compras');await cargarComprasCatalogos();
 const td=d.totalDocumento||{};
 const mapa={
   'comp-cdc':d.cdc||d.CDC||'',
   'comp-fecha':(doc.fecha_emision||'').slice(0,10),
   'comp-numero':doc.numero_documento||'',
   'comp-grav10':td.subTotal10??'',
   'comp-grav5':td.subTotal05??'',
   'comp-exento':td.subtotalExcenta??'',
   'comp-iva10':td.iva10??'',
   'comp-iva5':td.iva05??'',
   'comp-total':td.totalNeto??doc.total??''
 };
 Object.entries(mapa).forEach(([id,value])=>{const el=document.getElementById(id);if(el&&value!=='')el.value=value;});
 const proveedores=comprasCatalogosCache.proveedores||[],ruc=String(doc.ruc_emisor||'').trim().toUpperCase(),proveedor=proveedores.find(x=>String(x.ruc||'').trim().toUpperCase()===ruc);
 if(proveedor){const sel=document.getElementById('comp-proveedor');if(sel){sel.value=String(proveedor.id);await cargarTimbradosProveedor(proveedor.id);const tims=document.getElementById('comp-timbrado')?._timbrados||[];const tim=tims.find(x=>String(x.numero_timbrado||'')===String(doc.timbrado||''))||tims.find(x=>String(x.numero_timbrado||'')===String(doc.timbrado||''));if(tim)document.getElementById('comp-timbrado').value=String(tim.id);}}
 const resultado=document.getElementById('sifen-cdc-resultado');if(resultado){const n=document.createElement('div');n.className='inv-note';n.style.marginTop='10px';n.innerHTML='<strong>✓ DTE preparado para Compras.</strong><br>Se vincularon los datos disponibles y el proveedor cuando ya existe en Kakuaa. Ítems detectados: '+((d.items||[]).length)+'.';resultado.appendChild(n);}
 setTimeout(()=>document.getElementById('comp-cdc')?.focus(),150);
}
async function prepararImportacionNotaCredito(d){
 const doc=d?.documento||{};
 if(typeof cambiarVista==='function')cambiarVista('nota-credito-compra');
 await cargarComprasCatalogos();inicializarBuscadorFacturaRelacionadaNC();
 const mapa={'nc-cdc':d.cdc||d.CDC||'','nc-fecha':String(doc.fecha_emision||'').slice(0,10),'nc-numero':doc.numero_documento||'','nc-grav10':d.totalDocumento?.subTotal10??'','nc-grav5':d.totalDocumento?.subTotal05??'','nc-exento':d.totalDocumento?.subtotalExcenta??'','nc-iva10':d.totalDocumento?.iva10??'','nc-iva5':d.totalDocumento?.iva05??'','nc-total':d.totalDocumento?.totalNeto??doc.total??''};
 Object.entries(mapa).forEach(([id,v])=>{const el=document.getElementById(id);if(el&&v!=='')el.value=v;});
 const provs=comprasCatalogosCache.proveedores||[],ruc=String(doc.ruc_emisor||'').trim().toUpperCase(),prov=provs.find(x=>String(x.ruc||'').trim().toUpperCase()===ruc);
 if(prov){const ps=document.getElementById('nc-proveedor');if(ps)ps.value=String(prov.id);await cargarTimbradosProveedorNC(prov.id);await buscarFacturasRelacionablesNC();}
}
function abrirConfiguracionSifenDesdeCompras(){
  if(typeof cambiarVista==='function'){
    const posibles=['configuracion','config','facturacion-electronica','sifen'];
    for(const v of posibles){
      try{ cambiarVista(v); return; }catch(e){}
    }
  }
  const el=document.getElementById('sifen-cdc-resultado');
  if(el)el.insertAdjacentHTML('beforeend','<div class="inv-note" style="margin-top:10px">Actualmente Kakuaa consulta el DTE por CDC mediante la API externa configurada. Cuando esté disponible el .p12 de KAKUAA CONSULTORES E.A.S., esta consulta pasará automáticamente al WS oficial de SIFEN usando exclusivamente ese certificado.</div>');
}
