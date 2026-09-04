(()=>{
  const p=window.__SORAYA_VECTOR_PARTS__||[];
  if(p.length!==10||p.some(x=>typeof x!=='string'))throw new Error('Membrete oficial incompleto');
  const data=JSON.parse(p.join(''));
  // Corrección de integridad detectada al contrastar contra el PDF A4 oficial.
  // Una división histórica del recurso Image12 omitió un único carácter '/' del base64.
  // Se repara antes de exponer la plantilla para recuperar exactamente los bytes originales.
  if(data?.images?.image12?.base64?.includes('nWres2fh')){
    data.images.image12.base64=data.images.image12.base64.replace('nWres2fh','nW/res2fh');
  }
  window.SORAYA_VECTOR_LETTERHEAD=data;
  window.SORAYA_LETTERHEAD_BG='vector-pdf-official';
  window.SORAYA_OFFICIAL_PDF_SHA256='5a14778159dd8b1e1d726355d93605355e7a32a4db0b5af7972aff69d8785d30';
  delete window.__SORAYA_VECTOR_PARTS__;
})();