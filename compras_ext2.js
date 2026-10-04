/* Ajustes finales de Compras: totales editables y persistencia de moneda/cambio. */
(function(){
  const originalRecalc=window._recalcularTotalesFacturaCompra;
  const lineFns=['agregarLineaFacturaCompra','actualizarLineaFacturaCompra','eliminarLineaFacturaCompra','cargarOrdenEnFactura'];
  let forzarDetalle=false;

  window._recalcularTotalesFacturaCompra=function(){
    if(forzarDetalle && typeof originalRecalc==='function'){
      originalRecalc();
      forzarDetalle=false;
      recalcularTotalesCompraEnteros();
      return;
    }
    recalcularTotalesCompraEnteros();
  };

  lineFns.forEach(nombre=>{
    const original=window[nombre];
    if(typeof original!=='function')return;
    window[nombre]=function(...args){
      forzarDetalle=true;
      return original.apply(this,args);
    };
  });

  const originalGuardar=window.guardarComprobanteCompra;
  const originalFetchApi=window.fetchApi;
  if(typeof originalGuardar==='function' && typeof originalFetchApi==='function'){
    window.guardarComprobanteCompra=async function(){
      const fetchOriginal=window.fetchApi;
      window.fetchApi=async function(input,init={}){
        try{
          const url=String(input||'');
          if(url.endsWith('/api/compras/comprobantes') && String(init.method||'GET').toUpperCase()==='POST' && init.body){
            const body=JSON.parse(init.body);
            const moneda=document.getElementById('comp-moneda')?.value||'PYG';
            const cambio=Math.max(0,Number(document.getElementById('comp-cambio')?.value||1))||1;
            const totalMoneda=Math.round(Number(body.total||0));
            body.moneda=moneda;
            body.moneda_codigo=moneda;
            body.tipo_cambio=(moneda==='PYG'?1:cambio);
            body.tipo_cambio_fuente=(moneda==='PYG'?'SISTEMA':'DNIT');
            body.tipo_cambio_fecha=document.getElementById('comp-fecha')?.value||'';
            body.total_moneda=totalMoneda;
            body.total=Math.round(totalMoneda*(moneda==='PYG'?1:cambio));
            init={...init,body:JSON.stringify(body)};
          }
        }catch(e){console.error('No se pudo preparar moneda de compra',e);}
        return fetchOriginal(input,init);
      };
      try{return await originalGuardar.apply(this,arguments);}
      finally{window.fetchApi=fetchOriginal;}
    };
  }

  document.addEventListener('DOMContentLoaded',()=>{
    setTimeout(()=>{
      try{
        if(typeof originalRecalc==='function')originalRecalc();
        recalcularTotalesCompraEnteros();
      }catch(e){console.error(e);}
    },150);
  });
})();
