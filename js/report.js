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
  html, body { background:#fff !important; color:#000 !important; }
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
  .logo-cliente { max-height: 44pt; max-width: 110pt; object-fit: contain; display:block; }
  .conv { color: #c74717; font-size: 15pt; font-weight: 700; font-style: italic; white-space: nowrap; }
  .x { font-weight: 700; color: #1a3a5c; font-size: 10pt; }
  .top td { vertical-align: middle; overflow: hidden; }
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

<!-- Cabeçalho: tabela com 4 colunas em larguras fixas para evitar distorção -->
<table style="width:100%;border-collapse:collapse;table-layout:fixed">
  <colgroup>
    <col style="width:115pt">   <!-- logo cliente -->
    <col>                       <!-- título (flexível) -->
    <col style="width:150pt">   <!-- nome do cliente -->
    <col style="width:90pt">    <!-- convergint -->
  </colgroup>
  <tr style="height:52pt">
    <td style="border:0.5pt solid #333;padding:4pt;text-align:center;vertical-align:middle">
      ${d.logo
        ? `<img class="logo-cliente" src="${d.logo}">`
        : `<span style="color:#aaa;font-size:7pt">Logo do<br>Cliente</span>`}
    </td>
    <td style="border:0.5pt solid #333;padding:4pt;text-align:center;vertical-align:middle;font-weight:700;font-size:11pt">
      RELATÓRIO DIÁRIO DE<br>PROGRAMAÇÃO
    </td>
    <td style="border:0.5pt solid #333;padding:4pt;text-align:center;vertical-align:middle;font-weight:700;word-break:break-word">
      ${esc(d.nomeCliente)}
    </td>
    <td style="border:0.5pt solid #333;padding:4pt;text-align:right;vertical-align:middle">
      <span class="conv">convergint</span>
    </td>
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
// DOCX via docxtemplater + template_rdp.docx (substitui html-docx-js corrompido)
// ─────────────────────────────────────────────────────────────────────────────

// Imagem 1×1 transparente para slots de foto vazios
const IMG_VAZIA = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

function b64ToBytes(dataUrl) {
  const base64 = (dataUrl || "").includes(",") ? dataUrl.split(",")[1] : (dataUrl || "");
  try {
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  } catch { return new Uint8Array(0); }
}

function buildTags(d) {
  const tags = {
    logo_img:     d.logo         || IMG_VAZIA,   // ← logo do cliente no DOCX
    codigo:       d.codigo       || "",
    nome_cliente: d.nomeCliente  || "",
    data:         d.data         || "",
    contratante:  d.contratante  || "",
    obra:         d.obra         || "",
    endereco:     d.endereco     || "",
    h_ini_prev:   d.hIniPrev     || "08:30",
    h_ini_real:   d.hIniReal     || "",
    h_fim_prev:   d.hFimPrev     || "18:00",
    h_fim_real:   d.hFimReal     || "",
    detalhamento: d.detalhamento || "",
  };
  // 12 slots de profissionais
  for (let i = 0; i < 12; i++) {
    const p = d.profissionais?.[i] || {};
    tags[`prof_${i}_nome`]    = p.nome    || "";
    tags[`prof_${i}_empresa`] = p.empresa || "";
    tags[`prof_${i}_funcao`]  = p.funcao  || "";
  }
  // 12 slots de atividades
  for (let i = 0; i < 12; i++) {
    const a = d.atividades?.[i] || {};
    tags[`atv_${i}_num`]    = a.num    ? String(a.num) : "";
    tags[`atv_${i}_desc`]   = a.desc   || "";
    tags[`atv_${i}_amb`]    = a.amb    || "";
    tags[`atv_${i}_crit`]   = a.crit   || "";
    tags[`atv_${i}_status`] = a.status || "";
  }
  // 12 slots de foto (imagem real ou 1×1 invisível)
  for (let i = 0; i < 12; i++) {
    const f = d.fotos?.[i] || {};
    tags[`foto_${i}_sis`]  = f.sis  || "";
    tags[`foto_${i}_amb`]  = f.amb  || "";
    tags[`foto_${i}_desc`] = f.desc || "";
    tags[`foto_${i}_img`]  = f.img  || IMG_VAZIA;
  }
  return tags;
}

export async function gerarDOCX(d) {
  const PizZip        = window.PizZip;
  const Docxtemplater = window.docxtemplater;
  const ImageModule   = window.DocxtemplaterImageModuleFree;

  if (!PizZip || !Docxtemplater) throw new Error(
    "Bibliotecas DOCX não carregadas. Verifique os <script> do pizzip e docxtemplater no app.html."
  );

  const resp = await fetch("template_rdp.docx");
  if (!resp.ok) throw new Error(
    "template_rdp.docx não encontrado.\nRode converter_template.py e faça upload do arquivo gerado."
  );

  const buf = await resp.arrayBuffer();
  const zip = new PizZip(buf);

  // Módulo de imagem
  const modules = [];
  let temImgModule = false;
  if (ImageModule) {
    try {
      modules.push(new ImageModule({
        centered: true,
        getImage(tagValue) { return b64ToBytes(tagValue || IMG_VAZIA); },
        getSize(img, tagValue, tagName) {
          if (!tagValue || tagValue === IMG_VAZIA) return [1, 1];
          if ((tagName || "").includes("logo")) return [110, 40];
          return [270, 175];
        },
      }));
      temImgModule = true;
    } catch(e) { console.warn("ImageModule init falhou:", e); }
  }

  // Se não há módulo de imagem, remove {%tags} do XML para evitar "Multi error"
  if (!temImgModule) {
    try {
      const f = zip.files["word/document.xml"];
      if (f) zip.file("word/document.xml", f.asText().replace(/\{%[\w_]+\}/g, ""));
    } catch(e) { console.warn("Limpeza de tags falhou:", e); }
  }

  const tmpl = new Docxtemplater(zip, {
    modules,
    paragraphLoop: true,
    linebreaks:    true,
    nullGetter()  { return ""; },
  });

  try {
    tmpl.render(buildTags(d));
  } catch(e) {
    if (e.properties && Array.isArray(e.properties.errors)) {
      const det = e.properties.errors.map(err => {
        const tag = err.properties?.id || err.properties?.xtag || "?";
        const msg = err.properties?.explanation || err.message || "erro";
        return `  • {${tag}}: ${msg}`;
      }).join("\n");
      throw new Error(
        `Erros no template:\n${det}\n\n` +
        `Solução: rode converter_template.py de novo e faça upload do novo template_rdp.docx.`
      );
    }
    throw e;
  }

  const out = tmpl.getZip().generate({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  baixarBlob(out, nomeArquivo(d, "docx"));
}

function baixarBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
