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
    const item=(id,label)=>'<div class="nav-item nav-subitem" data-vista="'+id+'" onclick="cambiarVista(&quot;'+id+'&quot;)">'+label+'</div>';
    const subgroup=(label,icon,items)=>'<div class="pf-subgroup"><div class="nav-group-title" onclick="toggleNavGroup(this)"><span><span class="nav-icon">'+icon+'</span> '+label+'</span><span class="chevron">⌄</span></div><div class="nav-subitems">'+items+'</div></div>';
    group.innerHTML=
      '<div class="nav-group-title" onclick="toggleNavGroup(this)"><span><span class="nav-icon">👤</span> Persona Física</span><span class="chevron">⌄</span></div>'+
      '<div class="nav-subitems">'+
      item('pf-inicio','Resumen')+
      subgroup('Catastro','🗂️',item('pf-cotizaciones','Cotizaciones')+item('pf-personas','Personas')+item('pf-dependientes','Dependientes')+item('pf-timbrados','Timbrados')+item('pf-talonarios','Talonarios de recibo'))+
      subgroup('Movimientos','🔄',item('pf-ingresos','Ingresos')+item('pf-egresos','Egresos')+item('pf-nc-emitidas','Notas de Crédito Emitidas')+item('pf-nc-recibidas','Notas de Crédito Recibidas')+item('pf-recibos-cobro','Recibos de cobro')+item('pf-recibos-pago','Recibos de pago'))+
      subgroup('Reportes','📊',item('pf-cobrar','Documentos a cobrar')+item('pf-pagar','Documentos a pagar')+item('pf-libro-ventas','Libro IVA Ventas')+item('pf-libro-compras','Libro IVA Compras')+item('pf-libro-ingresos','Libro Ingresos')+item('pf-libro-egresos','Libro Egresos')+item('pf-rg9021','Registro de Comprobantes (RG 90/21)')+item('pf-form120','Formulario 120 · IVA')+item('pf-form515','Formulario 515 · IRP-RSP')+item('pf-form516','Formulario 516 · IRP-RGC'))+
      '</div>';
    sidebar.querySelectorAll('.nav-item[data-vista^="pf-"]').forEach(function(n){if(!group.contains(n))n.remove();});
    const primerLabel=sidebar.querySelector('.nav-label');
    if(primerLabel)primerLabel.insertAdjacentElement('afterend',group);
    else sidebar.insertBefore(group,sidebar.firstChild);
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
        '<div class="placeholder-grid"><div class="placeholder-box"><strong>Medios de cobro/pago</strong><span>Efectivo, transferencia, cheque, tarjeta y otros.</span></div><div class="placeholder-box"><strong>Categorías</strong><span>Clasificación de ingresos y egresos.</span></div><div class="placeholder-box"><strong>Perfil tributario</strong><span>Se toma del cliente activo.</span></div></div><div class="quick-actions" style="margin-top:16px"><button class="btn btn-gris" onclick="pfMostrarConfiguracion()">Administrar categorías</button></div><div id="pf-config-lista" style="margin-top:16px"></div>'),
      shell('pf-cotizaciones','Cotizaciones','Tipos de cambio oficiales publicados por la DNIT. Seleccioná mes y año para consultar el historial.','<div class="quick-actions" style="align-items:end;gap:12px;flex-wrap:wrap"><div><label for="pf-cot-mes">Mes</label><select id="pf-cot-mes" class="form-control"><option value="1">Enero</option><option value="2">Febrero</option><option value="3">Marzo</option><option value="4">Abril</option><option value="5">Mayo</option><option value="6">Junio</option><option value="7">Julio</option><option value="8">Agosto</option><option value="9">Septiembre</option><option value="10">Octubre</option><option value="11">Noviembre</option><option value="12">Diciembre</option></select></div><div><label for="pf-cot-anio">Año</label><input id="pf-cot-anio" class="form-control" type="number" min="2010" max="2100" value="'+new Date().getFullYear()+'" style="max-width:120px"></div><button class="btn btn-verde" onclick="pfCargarCotizaciones()">Consultar DNIT</button><button class="btn btn-gris" onclick="pfCargarCotizaciones(true)">↻ Actualizar</button></div><div id="pf-cotizaciones-estado" class="sin-datos" style="margin-top:14px">Seleccioná un mes y año para consultar las cotizaciones oficiales.</div><div id="pf-cotizaciones-tabla" class="table-wrap" style="margin-top:14px;overflow-x:auto"></div><div style="margin-top:12px;font-size:.8rem;color:var(--texto-suave)">Fuente oficial: <a href="https://www.dnit.gov.py/web/portal-institucional/cotizaciones" target="_blank" rel="noopener">DNIT · Historial de cotizaciones</a></div>'),
      shell('pf-personas','Personas','Catastro · clientes, proveedores y terceros.','<div class="quick-actions"><button class="btn btn-verde" onclick="pfFormularioPersona()">＋ Nueva persona</button><button class="btn btn-gris" onclick="pfCargarPersonas()">↻ Actualizar</button></div><div id="pf-persona-form" style="margin-top:16px"></div><div id="pf-personas-tabla" class="table-wrap" style="margin-top:16px"></div>'),
      shell('pf-dependientes','Dependientes','Catastro · vínculos familiares y dependientes tributarios.','<div class="quick-actions"><button class="btn btn-verde" onclick="pfFormularioDependiente()">＋ Nuevo dependiente</button><button class="btn btn-gris" onclick="pfCargarDependientes()">↻ Actualizar</button></div><div id="pf-dependiente-form" style="margin-top:16px"></div><div id="pf-dependientes-tabla" class="table-wrap" style="margin-top:16px"></div>'),
      shell('pf-timbrados','Timbrados','Catastro · control de timbrados y vigencias.','<div class="quick-actions"><button class="btn btn-verde" onclick="pfFormularioTimbrado()">＋ Nuevo timbrado</button><button class="btn btn-gris" onclick="pfCargarTimbrados()">↻ Actualizar</button></div><div id="pf-timbrado-form" style="margin-top:16px"></div><div id="pf-timbrados-tabla" class="table-wrap" style="margin-top:16px"></div>'),
      shell('pf-talonarios','Talonarios de recibo','Catastro · talonarios y numeración correlativa.','<div class="quick-actions"><button class="btn btn-verde" onclick="pfFormularioTalonario()">＋ Nuevo talonario</button><button class="btn btn-gris" onclick="pfCargarTalonarios()">↻ Actualizar</button></div><div id="pf-talonario-form" style="margin-top:16px"></div><div id="pf-talonarios-tabla" class="table-wrap" style="margin-top:16px"></div>'),
      shell('pf-nc-emitidas','Notas de Crédito Emitidas','Movimientos · notas de crédito emitidas.','<div class="sin-datos">Pantalla preparada para registrar notas de crédito y vincularlas con sus comprobantes de origen.</div>'),
      shell('pf-nc-recibidas','Notas de Crédito Recibidas','Movimientos · notas de crédito recibidas.','<div class="sin-datos">Pantalla preparada para registrar y clasificar tributariamente las notas recibidas.</div>'),
      shell('pf-recibos-cobro','Recibos de cobro','Movimientos · cobros aplicados a documentos pendientes.','<div class="sin-datos">Pantalla preparada para emitir y consultar recibos de cobro vinculados a ingresos.</div>'),
      shell('pf-recibos-pago','Recibos de pago','Movimientos · pagos aplicados a documentos pendientes.','<div class="sin-datos">Pantalla preparada para emitir y consultar recibos de pago vinculados a egresos.</div>'),
      shell('pf-libro-ventas','Libro IVA Ventas','Reportes · comprobantes de venta y débito fiscal.','<div class="sin-datos">El libro se conectará con las operaciones y comprobantes registrados.</div>'),
      shell('pf-libro-compras','Libro IVA Compras','Reportes · comprobantes de compra y crédito fiscal.','<div class="sin-datos">El libro se conectará con las operaciones y comprobantes registrados.</div>'),
      shell('pf-libro-ingresos','Libro Ingresos','Reportes · detalle de ingresos del contribuyente.','<div class="sin-datos">El libro se generará a partir de los ingresos registrados.</div>'),
      shell('pf-libro-egresos','Libro Egresos','Reportes · detalle de egresos del contribuyente.','<div class="sin-datos">El libro se generará a partir de los egresos registrados.</div>'),
      shell('pf-rg9021','Registro de Comprobantes (RG 90/21)','Reportes · registro de comprobantes conforme a RG 90/21.','<div class="sin-datos">El registro se preparará con los comprobantes cargados y las reglas tributarias aplicables.</div>'),
      shell('pf-form120','Formulario 120 · IVA','Reporte tributario · Formulario 120 de IVA.','<div class="placeholder-box"><strong>Formulario 120</strong><span>La descarga prellenada requiere conectar y validar la plantilla.</span><div class="quick-actions"><button class="btn btn-gris" onclick="pfAvisoFormulario(\'120\')">Preparar Formulario 120</button></div></div>'),
      shell('pf-form515','Formulario 515 · IRP-RSP','Reporte tributario · Formulario 515 de IRP-RSP.','<div class="placeholder-box"><strong>Formulario 515</strong><span>La descarga prellenada requiere conectar y validar la plantilla.</span><div class="quick-actions"><button class="btn btn-gris" onclick="pfAvisoFormulario(\'515\')">Preparar Formulario 515</button></div></div>'),
      shell('pf-form516','Formulario 516 · IRP-RGC','Reporte tributario · Formulario 516 de IRP-RGC.','<div class="placeholder-box"><strong>Formulario 516</strong><span>La descarga prellenada requiere conectar y validar la plantilla.</span><div class="quick-actions"><button class="btn btn-gris" onclick="pfAvisoFormulario(\'516\')">Preparar Formulario 516</button></div></div>')
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

    ['pf-inicio','pf-ingresos','pf-egresos','pf-cobrar','pf-pagar','pf-impuestos','pf-formularios','pf-reportes','pf-documentos','pf-calendario','pf-configuracion','pf-cotizaciones','pf-personas','pf-dependientes','pf-timbrados','pf-talonarios','pf-nc-emitidas','pf-nc-recibidas','pf-recibos-cobro','pf-recibos-pago','pf-libro-ventas','pf-libro-compras','pf-libro-ingresos','pf-libro-egresos','pf-rg9021','pf-form120','pf-form515','pf-form516'].forEach(v=>{
      const n=document.querySelector('[data-vista="'+v+'"]');
      if(n) n.style.display=activo?'flex':'none';
    });

    const pf=document.getElementById('nav-persona-fisica');
    if(pf) pf.style.display=activo?'block':'none';

    // Elimina cualquier acceso PF suelto creado por el perfil simplificado.
    // Los únicos accesos PF deben vivir dentro de nav-persona-fisica.
    if (activo && pf) {
      document.querySelectorAll('.sidebar .nav-item[data-vista^="pf-"]').forEach(function(item){
        if (!pf.contains(item)) item.remove();
      });
    }
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


  window.pfCargarCotizaciones=async function(forzar=false){
    const mesEl=document.getElementById('pf-cot-mes');
    const anioEl=document.getElementById('pf-cot-anio');
    const estado=document.getElementById('pf-cotizaciones-estado');
    const tabla=document.getElementById('pf-cotizaciones-tabla');
    if(!mesEl||!anioEl||!estado||!tabla)return;
    const mes=Number(mesEl.value), anio=Number(anioEl.value);
    if(!Number.isInteger(mes)||mes<1||mes>12||!Number.isInteger(anio)||anio<2010||anio>new Date().getFullYear()+1){
      estado.innerHTML='<span class="texto-error">Seleccioná un mes y año válidos.</span>';return;
    }
    estado.textContent='Consultando cotizaciones oficiales de la DNIT…';
    tabla.innerHTML='';
    try{
      const d=await pfJson('/cotizaciones?mes='+mes+'&anio='+anio+(forzar?'&actualizar=1':''));
      const fmt=v=>esc(v==null||v===''?'—':String(v));
      const columnas=[
        ['Dólar','dolar'],['Real','real'],['Peso argentino','peso_argentino'],
        ['Yen','yen'],['Euro','euro'],['Libra','libra']
      ];
      const encabezado='<tr><th rowspan="2">Fecha</th>'+columnas.map(c=>'<th colspan="2">'+c[0]+'</th>').join('')+'</tr><tr>'+columnas.map(()=>'<th>Compra (₲)</th><th>Venta (₲)</th>').join('')+'</tr>';
      tabla.innerHTML='<table><thead>'+encabezado+'</thead><tbody>'+d.cotizaciones.map(r=>'<tr><td>'+fmt(r.fecha)+'</td>'+columnas.map(c=>'<td style="text-align:right;white-space:nowrap">'+fmt(r[c[1]+'_compra'])+'</td><td style="text-align:right;white-space:nowrap">'+fmt(r[c[1]+'_venta'])+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
      estado.textContent=d.nombre_mes+' de '+d.anio+' · '+d.cantidad+' días publicados'+(d.cache?' · datos consultados recientemente':' · consultado el '+d.consultado_en.replace('T',' '))+(d.aviso?' · '+d.aviso:'');
    }catch(e){
      estado.innerHTML='<span class="texto-error">'+esc(e.message||'No se pudieron cargar las cotizaciones.')+'</span>';
    }
  };

  async function pfJson(path, options){
    const r=await pfFetch(path,options||{});
    const d=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(d.error||'No se pudo completar la operación.');
    return d;
  }
  window.pfCargarPersonas=async function(){
    const el=document.getElementById('pf-personas-tabla'); if(!el)return;
    el.innerHTML='<div class="sin-datos">Cargando personas…</div>';
    try{
      const rows=await pfJson('/personas');
      el.innerHTML=rows.length?'<table><thead><tr><th>Nombre</th><th>Tipo</th><th>RUC</th><th>Documento</th><th>Contacto</th><th>Acciones</th></tr></thead><tbody>'+
        rows.map(x=>'<tr><td>'+esc(x.nombre)+'</td><td>'+esc(x.tipo_persona)+'</td><td>'+esc(x.ruc||'—')+'</td><td>'+esc(x.documento||'—')+'</td><td>'+esc(x.telefono||'—')+(x.email?'<br>'+esc(x.email):'')+'</td><td><button class="btn btn-gris btn-pequeno" onclick="pfFormularioPersona('+x.id+')">Editar</button> <button class="btn btn-gris btn-pequeno" onclick="pfEliminarPersona('+x.id+')">Desactivar</button></td></tr>').join('')+
        '</tbody></table>':'<div class="sin-datos">Todavía no hay personas registradas. Usá “Nueva persona” para comenzar.</div>';
    }catch(e){el.innerHTML='<div class="sin-datos">'+esc(e.message)+'</div>';}
  };
  window.pfFormularioPersona=async function(id){
    const el=document.getElementById('pf-persona-form'); if(!el)return;
    let x={tipo_persona:'FISICA',nombre:'',ruc:'',documento:'',telefono:'',email:'',direccion:'',observacion:''};
    if(id){try{x=(await pfJson('/personas')).find(p=>Number(p.id)===Number(id))||x;}catch(e){alert(e.message);return;}}
    el.innerHTML='<div class="erp-placeholder"><h3>'+(id?'Editar persona':'Nueva persona')+'</h3><div class="form-grid">'+
      '<div><label>Tipo *</label><select id="pf-p-tipo"><option value="FISICA">Persona física</option><option value="JURIDICA">Persona jurídica</option></select></div>'+
      '<div><label>Nombre / Razón social *</label><input id="pf-p-nombre" maxlength="180" value="'+esc(x.nombre)+'"></div>'+
      '<div><label>RUC</label><input id="pf-p-ruc" value="'+esc(x.ruc)+'"></div><div><label>Cédula / documento</label><input id="pf-p-doc" value="'+esc(x.documento)+'"></div>'+
      '<div><label>Teléfono</label><input id="pf-p-tel" value="'+esc(x.telefono)+'"></div><div><label>Correo electrónico</label><input id="pf-p-email" type="email" value="'+esc(x.email)+'"></div>'+
      '<div><label>Dirección</label><input id="pf-p-dir" value="'+esc(x.direccion)+'"></div><div><label>Observación</label><input id="pf-p-obs" value="'+esc(x.observacion)+'"></div>'+
      '</div><div class="quick-actions"><button class="btn btn-verde" onclick="pfGuardarPersona('+(id||'null')+')">Guardar</button><button class="btn btn-gris" onclick="document.getElementById(\'pf-persona-form\').innerHTML=\'\'">Cancelar</button></div></div>';
    document.getElementById('pf-p-tipo').value=x.tipo_persona||'FISICA';
    el.scrollIntoView({behavior:'smooth',block:'start'});
  };
  window.pfGuardarPersona=async function(id){
    const payload={tipo_persona:document.getElementById('pf-p-tipo').value,nombre:document.getElementById('pf-p-nombre').value,ruc:document.getElementById('pf-p-ruc').value,documento:document.getElementById('pf-p-doc').value,telefono:document.getElementById('pf-p-tel').value,email:document.getElementById('pf-p-email').value,direccion:document.getElementById('pf-p-dir').value,observacion:document.getElementById('pf-p-obs').value};
    try{await pfJson('/personas'+(id?'/'+id:''),{method:id?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});document.getElementById('pf-persona-form').innerHTML='';await pfCargarPersonas();alert('Persona guardada correctamente.');}
    catch(e){alert(e.message);}
  };
  window.pfEliminarPersona=async function(id){
    if(!confirm('¿Desactivar esta persona? No se borrará físicamente del registro.'))return;
    try{await pfJson('/personas/'+id,{method:'DELETE'});await pfCargarPersonas();}catch(e){alert(e.message);}
  };
  window.pfCargarDependientes=async function(){
    const el=document.getElementById('pf-dependientes-tabla');if(!el)return;
    el.innerHTML='<div class="sin-datos">Cargando dependientes…</div>';
    try{
      const rows=await pfJson('/dependientes');
      el.innerHTML=rows.length?'<table><thead><tr><th>Nombre</th><th>Parentesco</th><th>Documento</th><th>Fecha nacimiento</th><th>RUC</th><th>Acciones</th></tr></thead><tbody>'+
        rows.map(x=>'<tr><td>'+esc(x.nombre)+'</td><td>'+esc(x.parentesco)+'</td><td>'+esc(x.documento||'—')+'</td><td>'+esc(x.fecha_nacimiento||'—')+'</td><td>'+esc(x.ruc||'—')+'</td><td><button class="btn btn-gris btn-pequeno" onclick="pfFormularioDependiente('+x.id+')">Editar</button> <button class="btn btn-gris btn-pequeno" onclick="pfEliminarDependiente('+x.id+')">Desactivar</button></td></tr>').join('')+
        '</tbody></table>':'<div class="sin-datos">Todavía no hay dependientes registrados. Usá “Nuevo dependiente” para comenzar.</div>';
    }catch(e){el.innerHTML='<div class="sin-datos">'+esc(e.message)+'</div>';}
  };
  window.pfFormularioDependiente=async function(id){
    const el=document.getElementById('pf-dependiente-form');if(!el)return;
    let x={nombre:'',parentesco:'HIJO/A',documento:'',fecha_nacimiento:'',ruc:'',observacion:''};
    if(id){try{x=(await pfJson('/dependientes')).find(p=>Number(p.id)===Number(id))||x;}catch(e){alert(e.message);return;}}
    el.innerHTML='<div class="erp-placeholder"><h3>'+(id?'Editar dependiente':'Nuevo dependiente')+'</h3><div class="form-grid">'+
      '<div><label>Nombre completo *</label><input id="pf-d-nombre" maxlength="180" value="'+esc(x.nombre)+'"></div>'+
      '<div><label>Parentesco *</label><select id="pf-d-parentesco"><option>HIJO/A</option><option>CONYUGE</option><option>PADRE/MADRE</option><option>OTRO</option></select></div>'+
      '<div><label>Cédula / documento</label><input id="pf-d-doc" value="'+esc(x.documento)+'"></div><div><label>Fecha de nacimiento</label><input id="pf-d-fecha" type="date" value="'+esc(x.fecha_nacimiento)+'"></div>'+
      '<div><label>RUC (si corresponde)</label><input id="pf-d-ruc" value="'+esc(x.ruc)+'"></div><div><label>Observación / respaldo</label><input id="pf-d-obs" value="'+esc(x.observacion)+'"></div>'+
      '</div><div class="quick-actions"><button class="btn btn-verde" onclick="pfGuardarDependiente('+(id||'null')+')">Guardar</button><button class="btn btn-gris" onclick="document.getElementById(\'pf-dependiente-form\').innerHTML=\'\'">Cancelar</button></div></div>';
    document.getElementById('pf-d-parentesco').value=x.parentesco||'HIJO/A';
    el.scrollIntoView({behavior:'smooth',block:'start'});
  };
  window.pfGuardarDependiente=async function(id){
    const payload={nombre:document.getElementById('pf-d-nombre').value,parentesco:document.getElementById('pf-d-parentesco').value,documento:document.getElementById('pf-d-doc').value,fecha_nacimiento:document.getElementById('pf-d-fecha').value,ruc:document.getElementById('pf-d-ruc').value,observacion:document.getElementById('pf-d-obs').value};
    try{await pfJson('/dependientes'+(id?'/'+id:''),{method:id?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});document.getElementById('pf-dependiente-form').innerHTML='';await pfCargarDependientes();alert('Dependiente guardado correctamente.');}
    catch(e){alert(e.message);}
  };
  window.pfEliminarDependiente=async function(id){
    if(!confirm('¿Desactivar este dependiente? No se borrará físicamente del registro.'))return;
    try{await pfJson('/dependientes/'+id,{method:'DELETE'});await pfCargarDependientes();}catch(e){alert(e.message);}
  };


  window.pfCargarTimbrados=async function(){const el=document.getElementById('pf-timbrados-tabla');if(!el)return;try{const a=await pfJson('/timbrados');el.innerHTML=a.length?'<table><thead><tr><th>Número</th><th>Establecimiento</th><th>Punto</th><th>Vigencia</th><th>Vencimiento</th><th>Estado</th><th></th></tr></thead><tbody>'+a.map(x=>'<tr><td>'+esc(x.numero)+'</td><td>'+esc(x.establecimiento)+'</td><td>'+esc(x.punto_expedicion)+'</td><td>'+esc(x.vigencia_desde)+' – '+esc(x.vigencia_hasta)+'</td><td>'+esc(x.fecha_vencimiento)+'</td><td>'+esc(x.estado)+'</td><td><button class="btn btn-gris" onclick="pfFormularioTimbrado('+x.id+')">Editar</button> <button class="btn btn-gris" onclick="pfEliminarTimbrado('+x.id+')">Desactivar</button></td></tr>').join('')+'</tbody></table>':'<div class="sin-datos">Todavía no hay timbrados registrados.</div>';}catch(e){el.innerHTML='<div class="sin-datos">'+esc(e.message)+'</div>';}}
  window.pfFormularioTimbrado=async function(id){let x={numero:'',establecimiento:'001',punto_expedicion:'001',vigencia_desde:'',vigencia_hasta:'',fecha_vencimiento:'',estado:'VIGENTE',observacion:''};if(id){try{x=(await pfJson('/timbrados')).find(r=>+r.id===+id)||x;}catch(e){alert(e.message);return;}}const el=document.getElementById('pf-timbrado-form');el.innerHTML='<div class="erp-placeholder"><h3>'+(id?'Editar timbrado':'Nuevo timbrado')+'</h3><div class="form-grid"><div><label>Número *</label><input id="pft-n" value="'+esc(x.numero)+'"></div><div><label>Establecimiento *</label><input id="pft-e" maxlength="3" value="'+esc(x.establecimiento)+'"></div><div><label>Punto de expedición *</label><input id="pft-p" maxlength="3" value="'+esc(x.punto_expedicion)+'"></div><div><label>Vigencia desde</label><input id="pft-d" type="date" value="'+esc(x.vigencia_desde)+'"></div><div><label>Vigencia hasta</label><input id="pft-h" type="date" value="'+esc(x.vigencia_hasta)+'"></div><div><label>Vencimiento</label><input id="pft-v" type="date" value="'+esc(x.fecha_vencimiento)+'"></div><div><label>Estado</label><select id="pft-s"><option>VIGENTE</option><option>VENCIDO</option><option>ANULADO</option></select></div><div><label>Observación</label><input id="pft-o" value="'+esc(x.observacion)+'"></div></div><div class="quick-actions"><button class="btn btn-verde" onclick="pfGuardarTimbrado('+(id||'null')+')">Guardar</button><button class="btn btn-gris" onclick="document.getElementById(\'pf-timbrado-form\').innerHTML=\'\'">Cancelar</button></div></div>';document.getElementById('pft-s').value=x.estado||'VIGENTE';}
  window.pfGuardarTimbrado=async function(id){const d={numero:document.getElementById('pft-n').value,establecimiento:document.getElementById('pft-e').value,punto_expedicion:document.getElementById('pft-p').value,vigencia_desde:document.getElementById('pft-d').value,vigencia_hasta:document.getElementById('pft-h').value,fecha_vencimiento:document.getElementById('pft-v').value,estado:document.getElementById('pft-s').value,observacion:document.getElementById('pft-o').value};try{await pfJson('/timbrados'+(id?'/'+id:''),{method:id?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});document.getElementById('pf-timbrado-form').innerHTML='';await pfCargarTimbrados();}catch(e){alert(e.message);}}
  window.pfEliminarTimbrado=async function(id){if(confirm('¿Desactivar este timbrado?'))try{await pfJson('/timbrados/'+id,{method:'DELETE'});await pfCargarTimbrados();}catch(e){alert(e.message);}}
  window.pfCargarTalonarios=async function(){const el=document.getElementById('pf-talonarios-tabla');if(!el)return;try{const a=await pfJson('/talonarios');el.innerHTML=a.length?'<table><thead><tr><th>Serie / tipo</th><th>Desde</th><th>Hasta</th><th>Próximo</th><th>Vencimiento</th><th>Estado</th><th></th></tr></thead><tbody>'+a.map(x=>'<tr><td>'+esc(x.serie)+' / '+esc(x.tipo)+'</td><td>'+esc(x.numero_desde)+'</td><td>'+esc(x.numero_hasta)+'</td><td>'+esc(x.proximo_numero)+'</td><td>'+esc(x.fecha_vencimiento)+'</td><td>'+esc(x.estado)+'</td><td><button class="btn btn-gris" onclick="pfFormularioTalonario('+x.id+')">Editar</button> <button class="btn btn-gris" onclick="pfEliminarTalonario('+x.id+')">Desactivar</button></td></tr>').join('')+'</tbody></table>':'<div class="sin-datos">Todavía no hay talonarios registrados.</div>';}catch(e){el.innerHTML='<div class="sin-datos">'+esc(e.message)+'</div>';}}
  window.pfFormularioTalonario=async function(id){let x={serie:'001-001',tipo:'RECIBO',numero_desde:'0000001',numero_hasta:'0000100',proximo_numero:'0000001',fecha_vencimiento:'',estado:'ACTIVO',observacion:''};if(id){try{x=(await pfJson('/talonarios')).find(r=>+r.id===+id)||x;}catch(e){alert(e.message);return;}}const el=document.getElementById('pf-talonario-form');el.innerHTML='<div class="erp-placeholder"><h3>'+(id?'Editar talonario':'Nuevo talonario')+'</h3><div class="form-grid"><div><label>Serie *</label><input id="pfa-s" value="'+esc(x.serie)+'"></div><div><label>Tipo</label><select id="pfa-t"><option>RECIBO</option><option>RECIBO DE DINERO</option><option>OTRO</option></select></div><div><label>Número desde *</label><input id="pfa-d" value="'+esc(x.numero_desde)+'"></div><div><label>Número hasta *</label><input id="pfa-h" value="'+esc(x.numero_hasta)+'"></div><div><label>Próximo número *</label><input id="pfa-p" value="'+esc(x.proximo_numero)+'"></div><div><label>Vencimiento</label><input id="pfa-v" type="date" value="'+esc(x.fecha_vencimiento)+'"></div><div><label>Estado</label><select id="pfa-e"><option>ACTIVO</option><option>AGOTADO</option><option>VENCIDO</option><option>ANULADO</option></select></div><div><label>Observación</label><input id="pfa-o" value="'+esc(x.observacion)+'"></div></div><div class="quick-actions"><button class="btn btn-verde" onclick="pfGuardarTalonario('+(id||'null')+')">Guardar</button><button class="btn btn-gris" onclick="document.getElementById(\'pf-talonario-form\').innerHTML=\'\'">Cancelar</button></div></div>';document.getElementById('pfa-t').value=x.tipo||'RECIBO';document.getElementById('pfa-e').value=x.estado||'ACTIVO';}
  window.pfGuardarTalonario=async function(id){const d={serie:document.getElementById('pfa-s').value,tipo:document.getElementById('pfa-t').value,numero_desde:document.getElementById('pfa-d').value,numero_hasta:document.getElementById('pfa-h').value,proximo_numero:document.getElementById('pfa-p').value,fecha_vencimiento:document.getElementById('pfa-v').value,estado:document.getElementById('pfa-e').value,observacion:document.getElementById('pfa-o').value};try{await pfJson('/talonarios'+(id?'/'+id:''),{method:id?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});document.getElementById('pf-talonario-form').innerHTML='';await pfCargarTalonarios();}catch(e){alert(e.message);}}
  window.pfEliminarTalonario=async function(id){if(confirm('¿Desactivar este talonario?'))try{await pfJson('/talonarios/'+id,{method:'DELETE'});await pfCargarTalonarios();}catch(e){alert(e.message);}}
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
    if(v==='pf-personas'){pfCargarPersonas();}
    if(v==='pf-dependientes'){pfCargarDependientes();}
    if(v==='pf-timbrados'){pfCargarTimbrados();}
    if(v==='pf-talonarios'){pfCargarTalonarios();}
    if(v==='pf-configuracion'){pfMostrarConfiguracion();}
    if(v==='pf-cotizaciones'){
      const mes=document.getElementById('pf-cot-mes');
      const anio=document.getElementById('pf-cot-anio');
      if(mes&&!mes.dataset.iniciado){mes.value=String(new Date().getMonth()+1);mes.dataset.iniciado='1';}
      if(anio&&!anio.dataset.iniciado){anio.value=String(new Date().getFullYear());anio.dataset.iniciado='1';}
      pfCargarCotizaciones();
    }
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hook);else hook();
})();
