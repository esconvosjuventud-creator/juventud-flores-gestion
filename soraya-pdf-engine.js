(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.SorayaPDFEngine=api;
})(typeof window!=='undefined'?window:(typeof globalThis!=='undefined'?globalThis:null),function(){
  'use strict';
  const PT_PER_MM=72/25.4, PAGE_W=210*PT_PER_MM, PAGE_H=297*PT_PER_MM;
  const te=typeof TextEncoder!=='undefined'?new TextEncoder():null;
  const ascii=s=>te?te.encode(s):Uint8Array.from(Buffer.from(s,'binary'));
  const concat=parts=>{let n=0;for(const p of parts)n+=p.length;const out=new Uint8Array(n);let o=0;for(const p of parts){out.set(p,o);o+=p.length}return out};
  function dataUriBytes(uri){
    const b64=String(uri).split(',')[1]||'';
    if(typeof atob==='function'){const s=atob(b64),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u}
    return Uint8Array.from(Buffer.from(b64,'base64'));
  }
  const cp1252={8364:128,8218:130,402:131,8222:132,8230:133,8224:134,8225:135,710:136,8240:137,352:138,8249:139,338:140,381:142,8216:145,8217:146,8220:147,8221:148,8226:149,8211:150,8212:151,732:152,8482:153,353:154,8250:155,339:156,382:158,376:159};
  function winBytes(s){const out=[];for(const ch of String(s??'')){const c=ch.codePointAt(0);if(c<=255)out.push(c);else if(cp1252[c]!=null)out.push(cp1252[c]);else out.push(63)}return out}
  function hexText(s){return winBytes(s).map(b=>b.toString(16).padStart(2,'0')).join('').toUpperCase()}
  function charFactor(ch){if(ch===' ')return .28;if('ilI1.,:;!|'.includes(ch))return .25;if('mwMW@%'.includes(ch))return .82;if(/[A-Z0-9]/.test(ch))return .58;return .5}
  class PDFDoc{
    constructor(){this.pages=[[]];this.pageIndex=0;this.font='normal';this.fontSize=10;this.textColor=[0,0,0];this.drawColor=[0,0,0];this.lineWidth=.2;this.image=null}
    setFont(_name,style='normal'){this.font=String(style).toLowerCase().includes('bold')?'bold':'normal';return this}
    setFontSize(n){this.fontSize=Number(n)||10;return this}
    setTextColor(...v){if(v.length===1){const g=(Number(v[0])||0)/255;this.textColor=[g,g,g]}else this.textColor=v.slice(0,3).map(x=>(Number(x)||0)/255);return this}
    setDrawColor(...v){if(v.length===1){const g=(Number(v[0])||0)/255;this.drawColor=[g,g,g]}else this.drawColor=v.slice(0,3).map(x=>(Number(x)||0)/255);return this}
    setLineWidth(n){this.lineWidth=Number(n)||.2;return this}
    getTextWidth(s){let f=0;for(const ch of String(s??''))f+=charFactor(ch);return (f*this.fontSize)/PT_PER_MM}
    splitTextToSize(text,maxMm){const paras=String(text??'').replace(/\r/g,'').split('\n'),out=[];for(const p of paras){if(!p){out.push('');continue}const words=p.split(/\s+/);let line='';for(const w of words){const t=line?line+' '+w:w;if(this.getTextWidth(t)<=maxMm||!line)line=t;else{out.push(line);line=w}}if(line)out.push(line)}return out}
    addPage(){this.pages.push([]);this.pageIndex=this.pages.length-1;return this}
    setPage(n){this.pageIndex=Math.max(0,Math.min(this.pages.length-1,Number(n)-1));return this}
    getNumberOfPages(){return this.pages.length}
    addImage(data,format,x,y,w,h){if(String(format).toUpperCase()!=='JPEG'&&String(format).toUpperCase()!=='JPG')throw new Error('El motor integrado admite membretes JPEG');if(!this.image)this.image=dataUriBytes(data);const X=x*PT_PER_MM,Y=PAGE_H-(y+h)*PT_PER_MM,W=w*PT_PER_MM,H=h*PT_PER_MM;this.pages[this.pageIndex].push(`q ${W.toFixed(3)} 0 0 ${H.toFixed(3)} ${X.toFixed(3)} ${Y.toFixed(3)} cm /Im1 Do Q`);return this}
    line(x1,y1,x2,y2){const c=this.drawColor.map(n=>n.toFixed(3)).join(' '),lw=(this.lineWidth*PT_PER_MM).toFixed(3);this.pages[this.pageIndex].push(`${c} RG ${lw} w ${(x1*PT_PER_MM).toFixed(3)} ${(PAGE_H-y1*PT_PER_MM).toFixed(3)} m ${(x2*PT_PER_MM).toFixed(3)} ${(PAGE_H-y2*PT_PER_MM).toFixed(3)} l S`);return this}
    text(value,x,y,opts){const lines=Array.isArray(value)?value:[value];const lh=(this.fontSize*1.18)/PT_PER_MM;lines.forEach((line,i)=>{let xx=Number(x),yy=Number(y)+i*lh;const o=opts||{};if(o.align==='right')xx-=this.getTextWidth(line);else if(o.align==='center')xx-=this.getTextWidth(line)/2;const c=this.textColor.map(n=>n.toFixed(3)).join(' '),font=this.font==='bold'?'/F2':'/F1';this.pages[this.pageIndex].push(`BT ${font} ${this.fontSize.toFixed(2)} Tf ${c} rg 1 0 0 1 ${(xx*PT_PER_MM).toFixed(3)} ${(PAGE_H-yy*PT_PER_MM).toFixed(3)} Tm <${hexText(line)}> Tj ET`)});return this}
    toUint8Array(){
      if(!this.image)throw new Error('Falta la hoja membretada institucional');
      const pageCount=this.pages.length,objs=[];
      objs[1]=ascii('<< /Type /Catalog /Pages 2 0 R >>');
      const kids=[];for(let i=0;i<pageCount;i++)kids.push(`${6+i*2} 0 R`);
      objs[2]=ascii(`<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${pageCount} >>`);
      objs[3]=ascii('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
      objs[4]=ascii('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
      const imgHead=ascii(`<< /Type /XObject /Subtype /Image /Width 1000 /Height 1415 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${this.image.length} >>\nstream\n`),imgTail=ascii('\nendstream');objs[5]=concat([imgHead,this.image,imgTail]);
      for(let i=0;i<pageCount;i++){
        const pObj=6+i*2,cObj=7+i*2,content=ascii(this.pages[i].join('\n')+'\n');
        objs[pObj]=ascii(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W.toFixed(3)} ${PAGE_H.toFixed(3)}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> /XObject << /Im1 5 0 R >> >> /Contents ${cObj} 0 R >>`);
        objs[cObj]=concat([ascii(`<< /Length ${content.length} >>\nstream\n`),content,ascii('endstream')]);
      }
      const max=5+pageCount*2,parts=[ascii('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')],offsets=new Array(max+1).fill(0);let pos=parts[0].length;
      for(let i=1;i<=max;i++){offsets[i]=pos;const h=ascii(`${i} 0 obj\n`),t=ascii('\nendobj\n');parts.push(h,objs[i],t);pos+=h.length+objs[i].length+t.length}
      const xrefPos=pos;let x=`xref\n0 ${max+1}\n0000000000 65535 f \n`;for(let i=1;i<=max;i++)x+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';x+=`trailer\n<< /Size ${max+1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;parts.push(ascii(x));return concat(parts)
    }
    save(filename){const bytes=this.toUint8Array();if(typeof document==='undefined')return bytes;const blob=new Blob([bytes],{type:'application/pdf'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename||'documento.pdf';a.style.display='none';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);return bytes}
  }
  return {PDFDoc,PT_PER_MM,PAGE_W,PAGE_H};
});
