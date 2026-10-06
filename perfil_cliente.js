/* KAKUAA - Perfil tributario y vista simplificada de Persona Física */
(function () {
    const SIMPLE_VIEWS = [
        { key: 'pf-ingresos', icon: '💰', label: 'Ingresos', desc: 'Registro y control de ingresos del contribuyente.' },
        { key: 'pf-egresos', icon: '💸', label: 'Egresos', desc: 'Registro y control de egresos y gastos.' },
        { key: 'pf-reportes', icon: '📑', label: 'Reportes Impositivos', desc: 'Reportes y controles tributarios del período.' }
    ];

    function clienteEsPersonaFisica(cliente) {
        if (!cliente) return false;
        const valores = [
            cliente.tipo_persona,
            cliente.tipo,
            cliente.tipo_cliente,
            cliente.tipoPersona,
            cliente.persona,
            cliente.perfil,
            cliente.perfil_tributario
        ].map(function (v) { return String(v || '').trim().toLowerCase(); });

        return valores.some(function (v) {
            return v === 'fisica' ||
                   v === 'persona_fisica' ||
                   v === 'persona física' ||
                   v.includes('persona_fisica') ||
                   v.includes('persona física');
        });
    }

    function clienteEsPersonaFisicaSimple(cliente) {
        return clienteEsPersonaFisica(cliente) &&
               String(cliente.perfil || '').trim().toUpperCase() !== 'PERSONA_FISICA_IRE_GENERAL_IVA';
    }

    function clienteEsPersonaFisicaERPCompleto(cliente) {
        return clienteEsPersonaFisica(cliente) &&
               String(cliente.perfil || '').trim().toUpperCase() === 'PERSONA_FISICA_IRE_GENERAL_IVA';
    }

    function crearVistaSimple() {
        const main = document.querySelector('main.contenido');
        if (!main || document.getElementById('vista-pf-simple')) return;

        const section = document.createElement('section');
        section.className = 'vista';
        section.id = 'vista-pf-simple';
        section.innerHTML =
            '<div class="dashboard-welcome">' +
                '<div><h2>KAKUAA Persona Física</h2><p>Gestión tributaria simplificada del contribuyente.</p></div>' +
                '<div class="welcome-date" id="pf-simple-obligaciones">—</div>' +
            '</div>' +
            '<div class="module-grid">' +
                SIMPLE_VIEWS.map(function (m) {
                    return '<div class="module-card" onclick="cambiarVista(&quot;pf-' + m.key.replace('pf-','') + '&quot;)">' +
                        '<div class="module-icon">' + m.icon + '</div><h3>' + m.label + '</h3><p>' + m.desc + '</p>' +
                    '</div>';
                }).join('') +
            '</div>' +
            '<div class="erp-placeholder"><div class="erp-placeholder-head"><div><h3>Perfil tributario</h3><p id="pf-simple-detalle">—</p></div><span class="module-pill">Vista simplificada</span></div>' +
            '<div class="placeholder-grid"><div class="placeholder-box"><strong>Sin asientos</strong><span>Este perfil no muestra Contabilidad ni asientos contables.</span></div>' +
            '<div class="placeholder-box"><strong>Sin artículos</strong><span>Este perfil no utiliza el maestro de artículos del ERP.</span></div>' +
            '<div class="placeholder-box"><strong>Control tributario</strong><span>La gestión se concentra en ingresos, egresos y reportes impositivos.</span></div></div></div>';
        main.insertBefore(section, main.firstChild);

        SIMPLE_VIEWS.forEach(function (m) {
            const id = 'pf-' + m.key.replace('pf-', '');
            const s = document.createElement('section');
            s.className = 'vista';
            s.id = 'vista-' + id;
            s.innerHTML = '<h2 class="titulo-seccion">' + m.icon + ' ' + m.label + '</h2>' +
                '<p class="subtitulo">' + m.desc + '</p>' +
                '<div class="erp-placeholder"><div class="erp-placeholder-head"><div><h3>' + m.label + '</h3><p>Esta pantalla queda preparada para la gestión del contribuyente seleccionado.</p></div><span class="module-pill">Persona Física</span></div>' +
                '<div class="placeholder-grid"><div class="placeholder-box"><strong>Período</strong><span>Seleccioná el período tributario que quieras gestionar.</span></div>' +
                '<div class="placeholder-box"><strong>Movimientos</strong><span>Los movimientos del módulo se incorporarán en la siguiente etapa.</span></div>' +
                '<div class="placeholder-box"><strong>Reportes</strong><span>La información quedará disponible para los reportes impositivos.</span></div></div></div>';
            main.appendChild(s);
        });
    }

    function ocultarNavegacionCompleja() {
        document.querySelectorAll('.sidebar .nav-group').forEach(function (el) { el.style.display = 'none'; });
        document.querySelectorAll('.sidebar .nav-item').forEach(function (el) {
            const vista = el.getAttribute('data-vista');
            const conservar = ['dashboard', 'clientes', 'usuarios', 'crear', 'tickets', 'seguridad', 'configuracion'].includes(vista);
            el.style.display = conservar ? 'flex' : 'none';
        });

        const nav = document.querySelector('.sidebar .sidebar-nav');
        if (!nav) return;

        // La navegación operativa completa de Persona Física vive en persona_fisica.js.
        // Estos accesos mínimos se mantienen como respaldo si ese módulo aún no creó su menú.
        SIMPLE_VIEWS.forEach(function (m) {
            const vista = m.key;
            if (nav.querySelector('[data-vista="' + vista + '"]')) return;
            const item = document.createElement('div');
            item.className = 'nav-item';
            item.setAttribute('data-vista', vista);
            item.innerHTML = '<span class="nav-icon">' + m.icon + '</span><span>' + m.label + '</span>';
            item.onclick = function () { cambiarVista(vista); };
            nav.appendChild(item);
        });
    }

    function restaurarNavegacionCompleta() {
        document.querySelectorAll('.sidebar .nav-group').forEach(function (el) { el.style.display = ''; });
        document.querySelectorAll('.sidebar .nav-item').forEach(function (el) { el.style.display = ''; });
        SIMPLE_VIEWS.forEach(function (m) {
            const item = document.querySelector('.sidebar .nav-item[data-vista="' + m.key + '"]');
            if (item) item.remove();
        });
    }

    window.aplicarPerfilClienteUI = function () {
        crearVistaSimple();
        const cliente = window.clienteActivoERP || null;
        const simple = clienteEsPersonaFisicaSimple(cliente);
        const fullPF = clienteEsPersonaFisicaERPCompleto(cliente);

        const detalle = document.getElementById('pf-simple-detalle');
        const obligaciones = document.getElementById('pf-simple-obligaciones');
        if (cliente) {
            if (obligaciones) obligaciones.textContent = (cliente.impuestos || []).join(' · ') || 'Sin obligaciones';
            if (detalle) detalle.textContent = 'Obligaciones: ' + ((cliente.impuestos || []).join(' · ') || 'Sin obligaciones');
        }

        const vistaSimple = document.getElementById('vista-pf-simple');
        if (vistaSimple) vistaSimple.style.display = simple ? '' : 'none';

        if (simple) {
            ocultarNavegacionCompleja();
            if (typeof window.refrescarModuloPorCliente === 'function') {
                try { window.refrescarModuloPorCliente(); } catch (e) { console.error(e); }
            }
            const actual = document.querySelector('.vista.activa')?.id || '';
            const permitidas = ['vista-pf-simple', 'vista-clientes', 'vista-usuarios', 'vista-crear', 'vista-tickets', 'vista-seguridad', 'vista-configuracion'];
            if (!permitidas.includes(actual) && !actual.startsWith('vista-pf-')) {
                cambiarVista('pf-simple');
            }
        } else {
            restaurarNavegacionCompleta();
            if (fullPF) {
                // Persona Física IRE GENERAL + IVA usa exactamente la vista ERP completa.
            }
        }
    };

    window.perfilClienteTexto = function (cliente) {
        if (!cliente) return 'Sin cliente';
        if (cliente.tipo_persona === 'juridica') return 'Persona Jurídica';
        if (cliente.perfil === 'PERSONA_FISICA_IRE_GENERAL_IVA') return 'Persona Física · IRE GENERAL + IVA';
        return 'Persona Física · Vista simplificada';
    };

    // El cambio de cliente se aplica desde la función real del panel.
    // No intentamos reemplazar window.cambiarClienteContexto porque el panel
    // invoca la declaración léxica directamente.
    function refrescarPerfilTrasCambioCliente() {
        try {
            if (typeof window.aplicarPerfilClienteUI === 'function') {
                window.aplicarPerfilClienteUI();
            }
        } catch (e) {
            console.error('KAKUAA: no se pudo aplicar el perfil del cliente', e);
        }
    }
    window.refrescarPerfilTrasCambioCliente = refrescarPerfilTrasCambioCliente;

    window.addEventListener('load', function () {
        setTimeout(function () {
            if (window.clienteActivoERP || window.clientesERP) window.aplicarPerfilClienteUI();
        }, 150);
    });
})();