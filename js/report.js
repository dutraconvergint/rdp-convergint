// js/report.js – Gera PDF (HTML) e DOCX dinâmico sem tabelas/fotos fixas
// O DOCX agora é montado em OpenXML no navegador, usando PizZip.
// Assim ele cria apenas as fotos preenchidas e permite quantidade ilimitada.

const ABREV = { AV: "AV", BMS: "BMS", SDAI: "SDAI", SECURITY: "SEG" };

function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escXml(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cmToEmu(cm) { return Math.round(cm * 360000); }
function twips(cm) { return Math.round(cm * 567); }

function nomeArquivo(d, ext = "docx") {
  let iso = d.data || "AAAA-MM-DD";
  try {
    const p = String(d.data || "").split("/");
    if (p.length === 3) iso = `${p[2]}-${p[1]}-${p[0]}`;
  } catch {}
  const sis  = ABREV[d.sistema] || d.sistema || "AV";
  const prof = (d.profArq || "").replace(/ /g,"_") || "Profissional";
  return `${d.codigo || "RDP"}_${iso}_RDP_(${sis})_${prof}.${ext}`;
}

function xProd(d, nome) {
  return (d.produtividade || "Produtivo") === nome ? "X" : "";
}

function xClima(d, nome) {
  return (d.clima || "Bom") === nome ? "X" : "";
}

function fotoPares(fotos) {
  const pares = [];
  for (let i = 0; i < fotos.length; i += 2) {
    pares.push([fotos[i], fotos[i + 1] || null]);
  }
  return pares;
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF via HTML/impressão
// ─────────────────────────────────────────────────────────────────────────────
export function gerarHTML(d) {
  const profRows = (d.profissionais || []).length
    ? d.profissionais.map((p, i) => `
      <tr>
        <td class="center num">${i + 1}</td>
        <td>${esc(p.nome)}</td>
        <td>${esc(p.empresa)}</td>
        <td>${esc(p.funcao)}</td>
      </tr>`).join("")
    : `<tr><td class="center num">1</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>`;

  const atvRows = (d.atividades || []).length
    ? d.atividades.map((a, i) => `
      <tr>
        <td class="center num">${i + 1}</td>
        <td>${esc(a.desc)}</td>
        <td>${esc(a.amb)}</td>
        <td class="center">${esc(a.crit)}</td>
        <td class="center">${esc(a.status)}</td>
      </tr>`).join("")
    : `<tr><td class="center num">1</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>`;

  const fotos = d.fotos || [];
  const fotosHtml = fotos.length ? `
    <div class="page-break"></div>
    <div class="section-title center big-title">RELATÓRIO FOTOGRÁFICO</div>
    ${fotoPares(fotos).map(([esq, dir]) => `
      <table class="foto-pair">
        <tr>
          ${fotoBlocoHTML(esq)}
          ${dir ? fotoBlocoHTML(dir) : `<td class="foto-num"></td><td class="foto-box empty"></td>`}
        </tr>
      </table>
    `).join("")}
  ` : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>RDP - ${esc(d.codigo || "Relatório")}</title>
<style>
  @page { size: A4; margin: 10mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #000; margin: 0; font-size: 8.5pt; }
  table { border-collapse: collapse; width: 100%; table-layout: fixed; }
  td, th { border: 0.5pt solid #333; padding: 2pt 4pt; vertical-align: middle; }
  .center { text-align: center; }
  .right { text-align: right; }
  .bold { font-weight: 700; }
  .blue { background: #173b5f; color: #fff; font-weight: 700; }
  .gray { background: #d9d9d9; font-weight: 700; }
  .light { background: #f1f1f1; }
  .num { width: 25pt; }
  .section-title { background: #173b5f; color: #fff; font-weight: 700; padding: 3pt 5pt; margin: 6pt 0 3pt; border: 0.5pt solid #173b5f; }
  .big-title { font-size: 14pt; letter-spacing: 1pt; }
  .logo-cliente { max-height: 45pt; max-width: 130pt; object-fit: contain; }
  .conv { color: #c74717; font-size: 18pt; font-weight: 700; font-style: italic; }
  .x { font-weight: 700; color: #1a3a5c; font-size: 10pt; }
  .top td { height: 24pt; }
  .atividade td { min-height: 18pt; }
  .detalhe { min-height: 90pt; white-space: pre-wrap; vertical-align: top; }
  .assinaturas { margin-top: 36pt; }
  .assinaturas td { border: none; text-align: center; }
  .linha-ass { border-top: 0.7pt solid #000; display: inline-block; min-width: 180pt; padding-top: 4pt; }
  .page-break { page-break-before: always; }
  .foto-pair { margin-bottom: 8pt; page-break-inside: avoid; }
  .foto-num { width: 24pt; text-align: center; font-weight: 700; background: #eee; font-size: 12pt; }
  .foto-box { width: 50%; vertical-align: top; padding: 0; }
  .foto-box table td { padding: 2pt 4pt; }
  .foto-img-cell { height: 185pt; text-align: center; vertical-align: middle; }
  .foto-img-cell img { max-width: 100%; max-height: 180pt; object-fit: contain; }
  .foto-desc { min-height: 18pt; }
  .empty { border: none; }
  @media print { .page-break { break-before: page; } }
</style>
</head>
<body>

<table class="top">
  <tr>
    <td style="width:15%">${d.logo ? `<img class="logo-cliente" src="${d.logo}">` : "Logo do Cliente"}</td>
    <td style="width:43%" class="center bold">RELATÓRIO DIÁRIO DE<br>PROGRAMAÇÃO</td>
    <td style="width:25%" class="center bold">${esc(d.nomeCliente)}</td>
    <td style="width:17%" class="right conv">convergint</td>
  </tr>
</table>

<table>
  <tr><td class="bold light" style="width:14%">CONTRATANTE:</td><td>${esc(d.contratante)}</td><td rowspan="3" class="blue center" style="width:16%">CÓDIGO:<br><br>${esc(d.codigo)}</td></tr>
  <tr><td class="bold light">OBRA:</td><td>${esc(d.obra)}</td></tr>
  <tr><td class="bold light">ENDEREÇO:</td><td>${esc(d.endereco)}</td></tr>
</table>

<table style="margin-top:4pt">
  <tr>
    <th class="gray" colspan="3">RESUMO EVOLUTIVO DO DIA</th>
    <th class="gray" colspan="2">HORÁRIO</th>
    <th class="gray" colspan="2">PREVISTO</th>
    <th class="gray" colspan="2">REAL</th>
    <th class="gray" colspan="4">CONDIÇÕES CLIMÁTICAS</th>
    <th class="gray" rowspan="2">DATA:<br>${esc(d.data)}</th>
  </tr>
  <tr>
    <th class="gray">MUITO<br>PRODUTIVO</th>
    <th class="gray">PRODUTIVO</th>
    <th class="gray">POUCO<br>PRODUTIVO</th>
    <th class="gray" colspan="2">INÍCIO</th>
    <td colspan="2">${esc(d.hIniPrev)}</td>
    <td colspan="2">${esc(d.hIniReal)}</td>
    <th class="gray">BOM</th>
    <th class="gray">CHUVA<br>LEVE</th>
    <th class="gray">CHUVA<br>FORTE</th>
    <th class="gray">FORA<br>TURNO</th>
  </tr>
  <tr>
    <td class="center x">${xProd(d, "Muito Produtivo")}</td>
    <td class="center x">${xProd(d, "Produtivo")}</td>
    <td class="center x">${xProd(d, "Pouco Produtivo")}</td>
    <th class="gray" colspan="2">TÉRMINO</th>
    <td colspan="2">${esc(d.hFimPrev)}</td>
    <td colspan="2">${esc(d.hFimReal)}</td>
    <td class="center x">${xClima(d, "Bom")}</td>
    <td class="center x">${xClima(d, "Chuva Leve")}</td>
    <td class="center x">${xClima(d, "Chuva Forte")}</td>
    <td class="center x">${xClima(d, "Fora Turno")}</td>
    <td></td>
  </tr>
</table>

<div class="section-title">PROFISSIONAIS ENVOLVIDOS</div>
<table>
  <tr><th class="gray num">Nº</th><th class="gray">NOME</th><th class="gray">EMPRESA</th><th class="gray">FUNÇÃO</th></tr>
  ${profRows}
</table>

<div class="section-title">DESCRIÇÃO DE ATIVIDADES REALIZADAS</div>
<table class="atividade">
  <tr><th class="gray num">Nº</th><th class="gray">ATIVIDADES</th><th class="gray">Ambiente</th><th class="gray">Criticidade</th><th class="gray">STATUS</th></tr>
  ${atvRows}
</table>

<div class="section-title">DETALHAMENTO DAS ATIVIDADES</div>
<table><tr><td class="detalhe">${esc(d.detalhamento).replace(/\n/g,"<br>")}</td></tr></table>

<table class="assinaturas">
  <tr>
    <td><span class="linha-ass">CONVERGINT TECHNOLOGIES</span></td>
    <td><span class="linha-ass">${esc(d.nomeCliente)}</span></td>
  </tr>
</table>

${fotosHtml}

</body>
</html>`;
}

function fotoBlocoHTML(f) {
  return `
    <td class="foto-num">${esc(f.num)}</td>
    <td class="foto-box">
      <table>
        <tr><td style="width:55pt" class="light">Sistema:</td><td class="bold">${esc(f.sis)}</td></tr>
        <tr><td class="light">Ambiente:</td><td class="bold">${esc(f.amb)}</td></tr>
        <tr><td colspan="2" class="foto-img-cell">${f.img ? `<img src="${f.img}">` : ""}</td></tr>
        <tr><td colspan="2" class="foto-desc">${esc(f.desc)}</td></tr>
      </table>
    </td>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCX dinâmico em OpenXML
// ─────────────────────────────────────────────────────────────────────────────
export async function gerarDOCX(d) {
  const PizZip = window.PizZip;
  if (!PizZip) throw new Error("PizZip não carregado. Verifique o script no app.html.");

  const zip = new PizZip();
  const imageRels = [];
  let imgSeq = 1;

  function addImage(dataUrl, wCm, hCm) {
    if (!dataUrl || !String(dataUrl).startsWith("data:image/")) return "";
    const m = String(dataUrl).match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,(.+)$/i);
    if (!m) return "";
    let ext = m[1].toLowerCase();
    if (ext === "jpeg") ext = "jpg";
    const base64 = m[2];
    const name = `image${imgSeq}.${ext}`;
    const rid = `rIdImg${imgSeq}`;
    imgSeq++;
    zip.file(`word/media/${name}`, base64, { base64: true });
    imageRels.push(`<Relationship Id="${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${name}"/>`);
    return drawingXml(rid, cmToEmu(wCm), cmToEmu(hCm));
  }

  const logoXml = d.logo ? addImage(d.logo, 3.2, 1.25) : runText("Logo do Cliente");

  const profRows = (d.profissionais || []).length
    ? d.profissionais.map((p, i) => tr([
        tc(pText(i + 1, { align: "center" }), { w: 700 }),
        tc(pText(p.nome)),
        tc(pText(p.empresa)),
        tc(pText(p.funcao)),
      ])).join("")
    : tr([tc(pText("1", { align: "center" }), { w: 700 }), tc(pText("")), tc(pText("")), tc(pText(""))]);

  const atvRows = (d.atividades || []).length
    ? d.atividades.map((a, i) => tr([
        tc(pText(i + 1, { align: "center" }), { w: 650 }),
        tc(pText(a.desc)),
        tc(pText(a.amb)),
        tc(pText(a.crit, { align: "center" })),
        tc(pText(a.status, { align: "center" })),
      ])).join("")
    : tr([tc(pText("1", { align: "center" }), { w: 650 }), tc(pText("")), tc(pText("")), tc(pText("")), tc(pText(""))]);

  const fotos = d.fotos || [];
  let fotosXml = "";
  if (fotos.length) {
    fotosXml += pageBreak();
    fotosXml += titleBar("RELATÓRIO FOTOGRÁFICO", true);
    for (const [esq, dir] of fotoPares(fotos)) {
      fotosXml += fotoPairTable(esq, dir, addImage);
    }
  }

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>
    ${mainHeaderTable(logoXml, d)}
    ${projectInfoTable(d)}
    ${resumoTable(d)}
    ${titleBar("PROFISSIONAIS ENVOLVIDOS")}
    ${tbl([
      tr([tc(pText("Nº", { bold:true, align:"center" }), { fill:"D9D9D9", w:700 }), tc(pText("NOME", { bold:true, align:"center" }), { fill:"D9D9D9" }), tc(pText("EMPRESA", { bold:true, align:"center" }), { fill:"D9D9D9" }), tc(pText("FUNÇÃO", { bold:true, align:"center" }), { fill:"D9D9D9" })]),
      profRows
    ].join(""))}
    ${titleBar("DESCRIÇÃO DE ATIVIDADES REALIZADAS")}
    ${tbl([
      tr([tc(pText("Nº", { bold:true, align:"center" }), { fill:"D9D9D9", w:650 }), tc(pText("ATIVIDADES", { bold:true, align:"center" }), { fill:"D9D9D9" }), tc(pText("Ambiente", { bold:true, align:"center" }), { fill:"D9D9D9" }), tc(pText("Criticidade", { bold:true, align:"center" }), { fill:"D9D9D9" }), tc(pText("STATUS", { bold:true, align:"center" }), { fill:"D9D9D9" })]),
      atvRows
    ].join(""))}
    ${titleBar("DETALHAMENTO DAS ATIVIDADES")}
    ${tbl(tr([tc(pText(d.detalhamento || "", { preserveLines:true }), { minH: 2200, vAlign:"top" })]))}
    ${assinaturasTable(d)}
    ${fotosXml}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="567" w:right="567" w:bottom="567" w:left="567" w:header="360" w:footer="360" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${imageRels.join("\n  ")}
</Relationships>`;

  zip.file("[Content_Types].xml", contentTypesXml());
  zip.folder("_rels").file(".rels", rootRelsXml());
  zip.folder("docProps").file("core.xml", corePropsXml());
  zip.folder("docProps").file("app.xml", appPropsXml());
  zip.folder("word").file("document.xml", documentXml);
  zip.folder("word").folder("_rels").file("document.xml.rels", relsXml);
  zip.folder("word").file("styles.xml", stylesXml());

  const blob = zip.generate({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    compression: "DEFLATE",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo(d, "docx");
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function rootRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;
}

function contentTypesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Default Extension="jpg" ContentType="image/jpeg"/>
  <Default Extension="jpeg" ContentType="image/jpeg"/>
  <Default Extension="gif" ContentType="image/gif"/>
  <Default Extension="webp" ContentType="image/webp"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;
}

function corePropsXml() {
  const now = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Relatório Diário de Programação</dc:title>
  <dc:creator>RDP Web</dc:creator>
  <cp:lastModifiedBy>RDP Web</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`;
}

function appPropsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>RDP Web</Application>
</Properties>`;
}

function stylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="17"/></w:rPr>
  </w:style>
</w:styles>`;
}

function pText(text, opts = {}) {
  const align = opts.align ? `<w:jc w:val="${opts.align}"/>` : "";
  const spacing = `<w:spacing w:after="0"/>`;
  return `<w:p><w:pPr>${spacing}${align}</w:pPr>${runText(text, opts)}</w:p>`;
}

function runText(text, opts = {}) {
  const bold = opts.bold ? "<w:b/>" : "";
  const color = opts.color ? `<w:color w:val="${opts.color}"/>` : "";
  const size = opts.size ? `<w:sz w:val="${opts.size}"/>` : "";
  const italic = opts.italic ? "<w:i/>" : "";
  const font = `<w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>`;
  const rpr = `<w:rPr>${font}${bold}${italic}${color}${size}</w:rPr>`;
  const lines = String(text ?? "").split(/\r?\n/);
  return `<w:r>${rpr}${lines.map((line, i) => `${i ? "<w:br/>" : ""}<w:t xml:space="preserve">${escXml(line)}</w:t>`).join("")}</w:r>`;
}

function tbl(rowsXml, opts = {}) {
  const width = opts.width || 5000;
  return `<w:tbl>
    <w:tblPr>
      <w:tblW w:w="${width}" w:type="pct"/>
      <w:tblLayout w:type="fixed"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="333333"/>
        <w:left w:val="single" w:sz="4" w:space="0" w:color="333333"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="333333"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="333333"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="333333"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="333333"/>
      </w:tblBorders>
    </w:tblPr>
    ${rowsXml}
  </w:tbl>`;
}

function tr(cellsXml, opts = {}) {
  const h = opts.h ? `<w:trPr><w:trHeight w:val="${opts.h}" w:hRule="atLeast"/></w:trPr>` : "";
  return `<w:tr>${h}${Array.isArray(cellsXml) ? cellsXml.join("") : cellsXml}</w:tr>`;
}

function tc(contentXml, opts = {}) {
  const fill = opts.fill ? `<w:shd w:fill="${opts.fill}"/>` : "";
  const w = opts.w ? `<w:tcW w:w="${opts.w}" w:type="dxa"/>` : "";
  const span = opts.gridSpan ? `<w:gridSpan w:val="${opts.gridSpan}"/>` : "";
  const vMerge = opts.vMerge ? `<w:vMerge w:val="${opts.vMerge}"/>` : "";
  const vAlign = opts.vAlign ? `<w:vAlign w:val="${opts.vAlign}"/>` : `<w:vAlign w:val="center"/>`;
  const minH = opts.minH ? `<w:tcMar><w:top w:w="80" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tcMar>` : "";
  return `<w:tc><w:tcPr>${w}${span}${vMerge}${fill}${vAlign}${minH}</w:tcPr>${contentXml || pText("")}</w:tc>`;
}

function titleBar(text, center = false) {
  return tbl(tr([tc(pText(text, { bold:true, color:"FFFFFF", align:center ? "center" : "left", size:center ? 28 : 17 }), { fill:"173B5F" })]), { width:5000 });
}

function mainHeaderTable(logoXml, d) {
  return tbl(tr([
    tc(`<w:p><w:pPr><w:jc w:val="center"/></w:pPr>${logoXml}</w:p>`, { w: 2300 }),
    tc(pText("RELATÓRIO DIÁRIO DE\nPROGRAMAÇÃO", { bold:true, align:"center", size:28 }), { w: 3900 }),
    tc(pText(d.nomeCliente || "", { bold:true, align:"center", size:18 }), { w: 2300 }),
    tc(pText("convergint", { bold:true, italic:true, color:"C74717", align:"right", size:32 }), { w: 1600 }),
  ], { h: 900 }));
}

function projectInfoTable(d) {
  return tbl([
    tr([tc(pText("CONTRATANTE:", { bold:true }), { fill:"F1F1F1", w:1900 }), tc(pText(d.contratante || "")), tc(pText(`CÓDIGO:\n\n${d.codigo || ""}`, { bold:true, color:"FFFFFF", align:"center" }), { fill:"173B5F", w:1700 })]),
    tr([tc(pText("OBRA:", { bold:true }), { fill:"F1F1F1", w:1900 }), tc(pText(d.obra || "")), tc(pText(""), { fill:"173B5F", w:1700 })]),
    tr([tc(pText("ENDEREÇO:", { bold:true }), { fill:"F1F1F1", w:1900 }), tc(pText(d.endereco || "")), tc(pText(""), { fill:"173B5F", w:1700 })]),
  ].join(""));
}

function resumoTable(d) {
  return tbl([
    tr([
      tc(pText("RESUMO EVOLUTIVO DO DIA", { bold:true, align:"center" }), { fill:"D9D9D9", gridSpan:3 }),
      tc(pText("HORÁRIO", { bold:true, align:"center" }), { fill:"D9D9D9", gridSpan:2 }),
      tc(pText("PREVISTO", { bold:true, align:"center" }), { fill:"D9D9D9", gridSpan:2 }),
      tc(pText("REAL", { bold:true, align:"center" }), { fill:"D9D9D9", gridSpan:2 }),
      tc(pText("CONDIÇÕES CLIMÁTICAS", { bold:true, align:"center" }), { fill:"D9D9D9", gridSpan:4 }),
      tc(pText(`DATA:\n${d.data || ""}`, { bold:true, align:"center" }), { fill:"D9D9D9" }),
    ]),
    tr([
      tc(pText("MUITO\nPRODUTIVO", { bold:true, align:"center" }), { fill:"D9D9D9" }),
      tc(pText("PRODUTIVO", { bold:true, align:"center" }), { fill:"D9D9D9" }),
      tc(pText("POUCO\nPRODUTIVO", { bold:true, align:"center" }), { fill:"D9D9D9" }),
      tc(pText("INÍCIO", { bold:true, align:"center" }), { fill:"D9D9D9", gridSpan:2 }),
      tc(pText(d.hIniPrev || "", { align:"center" }), { gridSpan:2 }),
      tc(pText(d.hIniReal || "", { align:"center" }), { gridSpan:2 }),
      tc(pText("BOM", { bold:true, align:"center" }), { fill:"D9D9D9" }),
      tc(pText("CHUVA\nLEVE", { bold:true, align:"center" }), { fill:"D9D9D9" }),
      tc(pText("CHUVA\nFORTE", { bold:true, align:"center" }), { fill:"D9D9D9" }),
      tc(pText("FORA\nTURNO", { bold:true, align:"center" }), { fill:"D9D9D9" }),
      tc(pText("")),
    ]),
    tr([
      tc(pText(xProd(d, "Muito Produtivo"), { bold:true, color:"173B5F", align:"center", size:20 })),
      tc(pText(xProd(d, "Produtivo"), { bold:true, color:"173B5F", align:"center", size:20 })),
      tc(pText(xProd(d, "Pouco Produtivo"), { bold:true, color:"173B5F", align:"center", size:20 })),
      tc(pText("TÉRMINO", { bold:true, align:"center" }), { fill:"D9D9D9", gridSpan:2 }),
      tc(pText(d.hFimPrev || "", { align:"center" }), { gridSpan:2 }),
      tc(pText(d.hFimReal || "", { align:"center" }), { gridSpan:2 }),
      tc(pText(xClima(d, "Bom"), { bold:true, color:"173B5F", align:"center", size:20 })),
      tc(pText(xClima(d, "Chuva Leve"), { bold:true, color:"173B5F", align:"center", size:20 })),
      tc(pText(xClima(d, "Chuva Forte"), { bold:true, color:"173B5F", align:"center", size:20 })),
      tc(pText(xClima(d, "Fora Turno"), { bold:true, color:"173B5F", align:"center", size:20 })),
      tc(pText("")),
    ]),
  ].join(""));
}

function assinaturasTable(d) {
  return `<w:p><w:pPr><w:spacing w:before="650" w:after="0"/></w:pPr></w:p>` + tbl(tr([
    tc(pText("____________________________\nCONVERGINT TECHNOLOGIES", { bold:true, align:"center" })),
    tc(pText(`____________________________\n${d.nomeCliente || ""}`, { bold:true, align:"center" })),
  ]));
}

function fotoPairTable(esq, dir, addImage) {
  const left = fotoBlock(esq, addImage);
  const right = dir ? fotoBlock(dir, addImage) : [tc(pText(""), { w:500 }), tc(pText(""))];
  return tbl(tr([...left, ...right], { h: 4200 }));
}

function fotoBlock(f, addImage) {
  const img = f.img ? addImage(f.img, 7.8, 5.1) : "";
  return [
    tc(pText(f.num || "", { bold:true, align:"center", size:24 }), { fill:"EEEEEE", w:500 }),
    tc(`
      ${tbl([
        tr([tc(pText("Sistema:"), { fill:"F1F1F1", w:1000 }), tc(pText(f.sis || "", { bold:true }))]),
        tr([tc(pText("Ambiente:"), { fill:"F1F1F1", w:1000 }), tc(pText(f.amb || "", { bold:true }))]),
        tr([tc(`<w:p><w:pPr><w:jc w:val="center"/></w:pPr>${img}</w:p>`, { minH: 3000, vAlign:"center", gridSpan:2 })]),
        tr([tc(pText(f.desc || ""), { gridSpan:2 })]),
      ].join(""))}
    `),
  ];
}

function pageBreak() {
  return `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
}

function drawingXml(rid, cx, cy) {
  return `<w:r><w:drawing>
    <wp:inline distT="0" distB="0" distL="0" distR="0">
      <wp:extent cx="${cx}" cy="${cy}"/>
      <wp:effectExtent l="0" t="0" r="0" b="0"/>
      <wp:docPr id="1" name="Imagem"/>
      <wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>
      <a:graphic>
        <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
          <pic:pic>
            <pic:nvPicPr><pic:cNvPr id="0" name="Imagem"/><pic:cNvPicPr/></pic:nvPicPr>
            <pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>
            <pic:spPr>
              <a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>
              <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
            </pic:spPr>
          </pic:pic>
        </a:graphicData>
      </a:graphic>
    </wp:inline>
  </w:drawing></w:r>`;
}
