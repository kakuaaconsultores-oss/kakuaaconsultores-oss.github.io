/* KAKUAA PF - módulo simplificado para Persona Física.
   Circuito: Ingresos/Egresos -> Cobros/Pagos -> Impuestos -> Formularios -> Reportes.
   No agrega Banca, Presupuestos ni Flujo de Fondos. */

(function(){
  const API_PF = (typeof API !== 'undefined' ? API : 'https://backend-ruc-1.onrender.com') + '/api/persona-fisica';
  let pfOperaciones = [];
  let pfMedios = [];
  let pfCategorias = [];

  function esc(v){
    if(typeof escapeHtml === 'function') return escapeHtml(v == null ? '' : String(v));
    return String(v == null ? '' : v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  }
  function money(v){ return new Intl.NumberFormat('es-PY',{maximumFractionDigits:0}).format(Number(v||0))+' G.'; }
  function hoy(){ return new Date().toISOString().slice(0,10); }

  async function pfFetch(path,opts){
    return fetchApi(API_PF+path,opts||{});
  }

  function esPF(){
    const c=window.clienteActivoERP;
    if(!c) return false;
    const t=String(c.tipo_persona||c.perfil||'').toLowerCase();
    return t==='fisica' || t==='persona_fisica' || t==='persona física' || t.includes('persona_fisica');
  }

  function crearMenu(){
    const sidebar=document.querySelector('.sidebar-nav');
    if(!sidebar || document.getElementById('nav-persona-fisica')) return;
    const group=document.createElement('div');
    group.id='nav-persona-fisica';
    group.className='nav-group';
    group.innerHTML=
      '<div class="nav-group-title" onclick="toggleNavGroup(this)"><span><span class="nav-icon">👤</span> Persona Física</span><span class="chevron">⌄</span></div>'+
      '<div class="nav-subitems">'+
      '<div class="nav-item nav-subitem" data-vista="pf-inicio" onclick="cambiarVista(\'pf-inicio\')">Resumen</div>'+
      '<div class="nav-item nav-subitem" data-vista="pf-ingresos" onclick="cambiarVista(\'pf-ingresos\')">Ingresos</div>'+
      '<div class="nav-item nav-subitem" data-vista="pf-egresos" onclick="cambiarVista(\'pf-egresos\')">Egresos</div>'+
      '<div class="nav-item nav-subitem" data-vista="pf-cobrar" onclick="cambiarVista(\'pf-cobrar\')">Documentos a Cobrar</div>'+
      '<div class="nav-item nav-subitem" data-vista="pf-pagar" onclick="cambiarVista(\'pf-pagar\')">Documentos a Pagar</div>'+
      '<div class="nav-item nav-subitem" data-vista="pf-impuestos" onclick="cambiarVista(\'pf-impuestos\')">Impuestos</div>'+
      '<div class="nav-item nav-subitem" data-vista="pf-formularios" onclick="cambiarVista(\'pf-formularios\')">Formularios</div>'+
      '<div class="nav-item nav-subitem" data-vista="pf-reportes" onclick="cambiarVista(\'pf-reportes\')">Reportes</div>'+
      '<div class="nav-item nav-subitem" data-vista="pf-documentos" onclick="cambiarVista(\'pf-documentos\')">Documentos</div>'+
      '<div class="nav-item nav-subitem" data-vista="pf-calendario" onclick="cambiarVista(\'pf-calendario\')">Calendario Tributario</div>'+
      '<div class="nav-item nav-subitem" data-vista="pf-configuracion" onclick="cambiarVista(\'pf-configuracion\')">Configuración</div>'+
      '</div>';
    // Persona Física se agrega como grupo de primer nivel, al mismo nivel
    // visual que los módulos empresariales de KAKUAA DEMO S.A.
    const primerLabel = sidebar.querySelector('.nav-label');
    if (primerLabel) {
      primerLabel.insertAdjacentElement('afterend', group);
    } else {
      sidebar.insertBefore(group, sidebar.firstChild);
    }
  }

  function crearVistas(){
    const main=document.querySelector('.contenido');
    if(!main || document.getElementById('vista-pf-inicio')) return;
    const shell=(id,title,sub,body)=>'<section class="vista" id="vista-'+id+'"><h2 class="titulo-seccion">'+title+'</h2><p class="subtitulo">'+sub+'</p>'+body+'</section>';
    main.insertAdjacentHTML('beforeend',
      shell('pf-inicio','Persona Física · Resumen','Circuito simplificado del contribuyente: registrar, cobrar/pagar, determinar impuestos y reportar.',
        '<div class="placeholder-grid" id="pf-resumen-cards">'+
        '<div class="placeholder-box"><strong>Ingresos</strong><span id="pf-total-ingresos">—</span></div>'+
        '<div class="placeholder-box"><strong>Egresos</strong><span id="pf-total-egresos">—</span></div>'+
        '<div class="placeholder-box"><strong>Por cobrar</strong><span id="pf-total-cobrar">—</span></div>'+
        '<div class="placeholder-box"><strong>Por pagar</strong><span id="pf-total-pagar">—</span></div>'+
        '</div><div class="quick-actions" style="margin-top:18px"><button class="btn btn-verde" onclick="pfNuevoMovimiento(\'INGRESO\')">＋ Registrar ingreso</button><button class="btn btn-azul" onclick="pfNuevoMovimiento(\'EGRESO\')">＋ Registrar egreso</button><button class="btn btn-gris" onclick="cambiarVista(\'pf-cobrar\')">Ver cobros pendientes</button><button class="btn btn-gris" onclick="cambiarVista(\'pf-pagar\')">Ver pagos pendientes</button></div>'),
      shell('pf-ingresos','Ingresos','Facturas emitidas, otros ingresos y operaciones de contado/crédito.',
        '<div class="quick-actions"><button class="btn btn-verde" onclick="pfNuevoMovimiento(\'INGRESO\')">＋ Registrar ingreso</button><button class="btn btn-gris" onclick="pfCargarOperaciones(\'INGRESO\')">↻ Actualizar</button></div><div id="pf-tabla-ingresos" class="table-wrap" style="margin-top:16px"></div>'),
      shell('pf-egresos','Egresos','Facturas recibidas, gastos y operaciones deducibles/no deducibles.',
        '<div class="quick-actions"><button class="btn btn-verde" onclick="pfNuevoMovimiento(\'EGRESO\')">＋ Registrar egreso</button><button class="btn btn-gris" onclick="pfCargarOperaciones(\'EGRESO\')">↻ Actualizar</button></div><div id="pf-tabla-egresos" class="table-wrap" style="margin-top:16px"></div>'),
      shell('pf-cobrar','Documentos a Cobrar','Pendientes, parciales, cobrados y vencidos.',
        '<div id="pf-tabla-cobrar" class="table-wrap"></div>'),
      shell('pf-pagar','Documentos a Pagar','Pendientes, parciales, pagados y vencidos.',
        '<div id="pf-tabla-pagar" class="table-wrap"></div>'),
      shell('pf-impuestos','Impuestos','Preparación de la información tributaria a partir de las operaciones registradas.',
        '<div class="placeholder-grid"><div class="placeholder-box"><strong>IVA</strong><span>Compras, ventas, débito y crédito fiscal.</span></div><div class="placeholder-box"><strong>IRP-RSP</strong><span>Ingresos percibidos y gastos computables.</span></div><div class="placeholder-box"><strong>Retenciones</strong><span>Control de comprobantes y retenciones.</span></div><div class="placeholder-box"><strong>Liquidaciones</strong><span>Base para formularios y controles.</span></div></div>'),
      shell('pf-formularios','Formularios','Descarga y preparación de formularios tributarios. Las versiones oficiales de DNIT se mantienen como referencia.',
        '<div class="placeholder-grid"><div class="placeholder-box"><strong>Formulario 120</strong><span>IVA — hoja de trabajo y posterior generación con la plantilla configurada.</span><div class="quick-actions"><button class="btn btn-gris" onclick="pfAvisoFormulario(\'120\')">Preparar Form. 120</button></div></div><div class="placeholder-box"><strong>Formulario 515</strong><span>IRP-RSP — rentas derivadas de servicios personales.</span><div class="quick-actions"><button class="btn btn-gris" onclick="pfAvisoFormulario(\'515\')">Preparar Form. 515</button></div></div></div>'),
      shell('pf-reportes','Reportes','Información operativa para control y preparación tributaria.',
        '<div class="quick-actions"><button class="btn btn-verde" onclick="pfCargarReportes()">Generar resumen</button></div><div id="pf-tabla-reportes" class="table-wrap" style="margin-top:16px"></div>'),
      shell('pf-documentos','Documentos','Facturas, DTE/XML, comprobantes y respaldos del contribuyente.',
        '<div class="erp-placeholder"><div class="placeholder-grid"><div class="placeholder-box"><strong>Facturas</strong><span>Accedé al módulo de Facturación para consultar documentos emitidos.</span></div><div class="placeholder-box"><strong>DTE/XML</strong><span>Los documentos electrónicos quedan vinculados al circuito tributario.</span></div><div class="placeholder-box"><strong>Respaldos</strong><span>Preparado para centralizar documentos del contribuyente.</span></div></div><div class="quick-actions"><button class="btn btn-gris" onclick="cambiarVista(\'documentos\')">Abrir Documentos</button></div></div>'),
      shell('pf-calendario','Calendario Tributario','Control de obligaciones y vencimientos. Se integrará con las obligaciones del perfil tributario.',
        '<div class="placeholder-grid"><div class="placeholder-box"><strong>IVA</strong><span>Vencimientos mensuales según obligación.</span></div><div class="placeholder-box"><strong>IRP-RSP</strong><span>Control anual y obligaciones relacionadas.</span></div><div class="placeholder-box"><strong>Alertas</strong><span>Próximos vencimientos visibles desde Inicio.</span></div></div>'),
      shell('pf-configuracion','Configuración','Parámetros propios de Persona Física.',
        '<div class="placeholder-grid"><div class="placeholder-box"><strong>Medios de cobro/pago</strong><span>Efectivo, transferencia, cheque, tarjeta y otros.</span></div><div class="placeholder-box"><strong>Categorías</strong><span>Clasificación de ingresos y egresos.</span></div><div class="placeholder-box"><strong>Perfil tributario</strong><span>Se toma del cliente activo.</span></div></div><div class="quick-actions" style="margin-top:16px"><button class="btn btn-gris" onclick="pfMostrarConfiguracion()">Administrar categorías</button></div><div id="pf-config-lista" style="margin-top:16px"></div>')
    );
  }

  function ocultarModulosEmpresariales(){
    const activo=esPF();

    // En Persona Física no dejamos ningún grupo empresarial visible.
    // Esto incluye Gestión, Facturación, Compras, Finanzas, Contabilidad,
    // Inventarios, Activo Fijo, Gestión de Personas y Banca.
    document.querySelectorAll('.nav-group').forEach(g=>{
      const t=(g.querySelector('.nav-group-title')?.textContent||'').trim();
      const esPFGroup=g.id==='nav-persona-fisica';
      if(activo){
        g.style.display=esPFGroup?'block':'none';
      }else{
        g.style.display='';
      }
    });

    // Documentos es un acceso directo (no pertenece a un nav-group).
    const directosOcultos=['documentos'];
    document.querySelectorAll('.sidebar .nav-item').forEach(n=>{
      const vista=n.getAttribute('data-vista');
      if(directosOcultos.includes(vista)) n.style.display=activo?'none':'flex';
    });

    ['pf-inicio','pf-ingresos','pf-egresos','pf-cobrar','pf-pagar','pf-impuestos','pf-formularios','pf-reportes','pf-documentos','pf-calendario','pf-configuracion'].forEach(v=>{
      const n=document.querySelector('[data-vista="'+v+'"]');
      if(n) n.style.display=activo?'flex':'none';
    });

    const pf=document.getElementById('nav-persona-fisica');
    if(pf) pf.style.display=activo?'block':'none';
  }

  async function cargarResumen(){
    if(!esPF()) return;
    try{
      const r=await pfFetch('/resumen');
      const d=await r.json().catch(()=>({}));
      if(!r.ok){
        console.error('KAKUAA Persona Física: no se pudo cargar el resumen',r.status,d);
        return;
      }
      ['ingresos','egresos','por_cobrar','por_pagar'].forEach(k=>{const el=document.getElementById('pf-total-'+k.replace('_','-')); if(el)el.textContent=money(d[k]);});
    }catch(e){
      console.error('KAKUAA Persona Física: error de conexión al resumen',e);
    }
  }

  async function cargarCatalogos(){
    if(!esPF()) return;
    try{
      const [m,c]=await Promise.all([pfFetch('/medios-pago'),pfFetch('/categorias')]);
      pfMedios=await m.json(); pfCategorias=await c.json();
    }catch(e){console.error(e);}
  }

  async function cargarOps(tipo){
    const r=await pfFetch('/operaciones?tipo='+tipo); const data=await r.json(); if(!r.ok){alert(data.error||'No se pudieron cargar las operaciones.');return;}
    pfOperaciones=data;
    const id=tipo==='INGRESO'?'pf-tabla-ingresos':'pf-tabla-egresos';
    const el=document.getElementById(id); if(!el)return;
    el.innerHTML=data.length?'<table><thead><tr><th>Fecha</th><th>Comprobante</th><th>Tercero</th><th>Concepto</th><th>Total</th><th>Saldo</th><th>Estado</th><th>Acción</th></tr></thead><tbody>'+
      data.map(o=>'<tr><td>'+esc(o.fecha)+'</td><td>'+esc(o.comprobante_numero||o.comprobante_tipo)+'</td><td>'+esc(o.tercero||'—')+'</td><td>'+esc(o.concepto)+'</td><td>'+money(o.monto)+'</td><td>'+money(o.saldo)+'</td><td>'+esc(o.estado)+'</td><td>'+(o.saldo>0?'<button class="btn btn-verde btn-pequeno" onclick="pfRegistrarMovimiento('+o.id+')">'+(tipo==='INGRESO'?'Cobrar':'Pagar')+'</button>':'—')+'</td></tr>').join('')+
      '</tbody></table>':'<div class="sin-datos">No hay operaciones registradas.</div>';
  }

  async function cargarPendientes(tipo){
    const r=await pfFetch('/operaciones?tipo='+tipo); const data=await r.json(); if(!r.ok)return;
    const pendientes=data.filter(o=>['PENDIENTE','PARCIAL','VENCIDO'].includes(o.estado));
    const el=document.getElementById(tipo==='INGRESO'?'pf-tabla-cobrar':'pf-tabla-pagar'); if(!el)return;
    el.innerHTML=pendientes.length?'<table><thead><tr><th>Vencimiento</th><th>Tercero</th><th>Concepto</th><th>Total</th><th>Saldo</th><th>Estado</th><th></th></tr></thead><tbody>'+
      pendientes.map(o=>'<tr><td>'+esc(o.fecha_vencimiento||'—')+'</td><td>'+esc(o.tercero||'—')+'</td><td>'+esc(o.concepto)+'</td><td>'+money(o.monto)+'</td><td>'+money(o.saldo)+'</td><td>'+esc(o.estado)+'</td><td><button class="btn btn-verde btn-pequeno" onclick="pfRegistrarMovimiento('+o.id+')">'+(tipo==='INGRESO'?'Registrar cobro':'Registrar pago')+'</button></td></tr>').join('')+'</tbody></table>':'<div class="sin-datos">No hay documentos pendientes.</div>';
  }

  window.pfNuevoMovimiento=function(tipo){
    cargarCatalogos().then(()=>{
      const cats=pfCategorias.filter(c=>c.tipo===tipo);
      const medios=pfMedios.map(m=>'<option value="'+m.id+'">'+esc(m.nombre)+'</option>').join('');
      const html='<div class="erp-placeholder" style="margin-top:16px"><h3>Registrar '+(tipo==='INGRESO'?'ingreso':'egreso')+'</h3>'+
      '<div class="form-grid">'+
      '<div><label>Fecha *</label><input id="pf-f-fecha" type="date" value="'+hoy()+'"></div>'+
      '<div><label>Vencimiento</label><input id="pf-f-venc" type="date"></div>'+
      '<div><label>Comprobante</label><select id="pf-f-comp"><option>Factura</option><option>Nota de Crédito</option><option>Nota de Débito</option><option>Recibo</option><option>Otro</option></select></div>'+
      '<div><label>Número</label><input id="pf-f-num"></div>'+
      '<div><label>Tercero</label><input id="pf-f-tercero"></div>'+
      '<div><label>RUC</label><input id="pf-f-ruc"></div>'+
      '<div><label>Concepto *</label><input id="pf-f-concepto"></div>'+
      '<div><label>Categoría</label><select id="pf-f-cat"><option value="">General</option>'+cats.map(c=>'<option value="'+c.id+'">'+esc(c.nombre)+'</option>').join('')+'</select></div>'+
      '<div><label>Monto *</label><input id="pf-f-monto" type="number" min="0" step="0.01"></div>'+
      '<div><label>Estado</label><select id="pf-f-estado"><option>PENDIENTE</option><option>COBRADO</option><option>PAGADO</option></select></div>'+
      '<div><label>Medio de cobro/pago</label><select id="pf-f-medio"><option value="">Sin definir</option>'+medios+'</select></div>'+
      '<div><label>Observación</label><input id="pf-f-obs"></div></div>'+
      '<div class="quick-actions"><button class="btn btn-verde" onclick="pfGuardarMovimiento(\''+tipo+'\')">Guardar</button><button class="btn btn-gris" onclick="document.getElementById(\'pf-form-operacion\').remove()">Cancelar</button></div></div>';
      const old=document.getElementById('pf-form-operacion'); if(old)old.remove();
      const sec=document.querySelector('.vista.activa'); if(!sec)return;
      const div=document.createElement('div'); div.id='pf-form-operacion'; div.innerHTML=html; sec.appendChild(div);
      div.scrollIntoView({behavior:'smooth',block:'start'});
    });
  };

  window.pfGuardarMovimiento=async function(tipo){
    const payload={tipo,fecha:document.getElementById('pf-f-fecha').value,fecha_vencimiento:document.getElementById('pf-f-venc').value,comprobante_tipo:document.getElementById('pf-f-comp').value,comprobante_numero:document.getElementById('pf-f-num').value,tercero:document.getElementById('pf-f-tercero').value,tercero_ruc:document.getElementById('pf-f-ruc').value,concepto:document.getElementById('pf-f-concepto').value,categoria_id:document.getElementById('pf-f-cat').value||null,monto:document.getElementById('pf-f-monto').value,estado:document.getElementById('pf-f-estado').value,medio_pago_id:document.getElementById('pf-f-medio').value||null,observacion:document.getElementById('pf-f-obs').value};
    const r=await pfFetch('/operaciones',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); const d=await r.json();
    if(!r.ok){alert(d.error||'No se pudo guardar.');return;} document.getElementById('pf-form-operacion')?.remove(); await cargarResumen(); await cargarOps(tipo); alert('Operación registrada correctamente.');
  };

  window.pfRegistrarMovimiento=async function(id){
    await cargarCatalogos();
    const o=pfOperaciones.find(x=>Number(x.id)===Number(id)) || (await (await pfFetch('/operaciones')).json()).find(x=>Number(x.id)===Number(id));
    if(!o)return;
    const tipo=o.tipo==='INGRESO'?'Cobro':'Pago';
    const monto=prompt(tipo+' — monto a registrar:',Number(o.saldo||0).toFixed(2));
    if(monto===null)return;
    const medio=prompt('Medio: '+pfMedios.map(x=>x.nombre).join(', ')+'\nEscribí el nombre del medio o dejá vacío:','');
    let medioId=null; if(medio){const m=pfMedios.find(x=>x.nombre.toLowerCase()===medio.toLowerCase()); if(m)medioId=m.id;}
    const r=await pfFetch('/operaciones/'+id+'/movimiento',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({monto,fecha:hoy(),medio_pago_id:medioId})});
    const d=await r.json(); if(!r.ok){alert(d.error||'No se pudo registrar.');return;}
    await cargarResumen(); await cargarPendientes(o.tipo); await cargarOps(o.tipo); alert(tipo+' registrado. Saldo: '+money(d.saldo));
  };

  window.pfCargarOperaciones=cargarOps;
  window.pfCargarReportes=async function(){
    const r=await pfFetch('/reportes');const d=await r.json();const el=document.getElementById('pf-tabla-reportes');if(!el)return;
    el.innerHTML=d.length?'<table><thead><tr><th>Tipo</th><th>Estado</th><th>Cantidad</th><th>Total</th></tr></thead><tbody>'+d.map(x=>'<tr><td>'+esc(x.tipo)+'</td><td>'+esc(x.estado)+'</td><td>'+x.cantidad+'</td><td>'+money(x.total)+'</td></tr>').join('')+'</tbody></table>':'<div class="sin-datos">Sin datos para reportar.</div>';
  };
  window.pfAvisoFormulario=function(n){alert('El Formulario '+n+' queda preparado en este módulo. La generación automática se conectará a la plantilla oficial/configurada antes de habilitar la descarga definitiva.');};
  window.pfMostrarConfiguracion=function(){
    cargarCatalogos().then(()=>{
      const el=document.getElementById('pf-config-lista'); if(!el)return;
      el.innerHTML='<div class="placeholder-grid"><div class="placeholder-box"><strong>Medios de cobro/pago</strong><span>'+pfMedios.map(x=>esc(x.nombre)).join(' · ')+'</span></div><div class="placeholder-box"><strong>Categorías</strong><span>'+pfCategorias.map(x=>esc(x.nombre)+' ('+esc(x.tipo)+')').join(' · ')+'</span></div></div>';
    });
  };

  function hook(){
    crearMenu();
    crearVistas();

    // La navegación del perfil se aplica antes de cualquier consulta al backend.
    // Así, un fallo temporal de CORS/API nunca deja visibles los módulos empresariales.
    ocultarModulosEmpresariales();

    const old=window.refrescarModuloPorCliente;
    window.refrescarModuloPorCliente=function(){
      if(typeof old==='function'){
        try{ old(); }catch(e){ console.error('KAKUAA: error refrescando módulos base',e); }
      }
      crearMenu();
      crearVistas();
      ocultarModulosEmpresariales();
      if(esPF())cargarResumen();
    };
    if(esPF())cargarResumen();
  }

  const oldCambiar=window.cambiarVista;
  window.cambiarVista=function(v){
    if(typeof oldCambiar==='function') oldCambiar(v);
    if(v==='pf-inicio'){cargarResumen();}
    if(v==='pf-ingresos'){cargarOps('INGRESO');}
    if(v==='pf-egresos'){cargarOps('EGRESO');}
    if(v==='pf-cobrar'){cargarPendientes('INGRESO');}
    if(v==='pf-pagar'){cargarPendientes('EGRESO');}
    if(v==='pf-reportes'){pfCargarReportes();}
    if(v==='pf-configuracion'){pfMostrarConfiguracion();}
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hook);else hook();
})();
