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
// DOCX via Docxtemplater SEM o docxtemplater-image-module-free
// Motivo: esse módulo tem bug no navegador: "namespaceURI getter-only".
// Aqui o Docxtemplater continua sendo usado para texto/loops e as imagens são
// inseridas depois direto no OOXML do DOCX.
// ─────────────────────────────────────────────────────────────────────────────

function ptToEmu(pt) {
  return Math.round(Number(pt || 0) * 12700);
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeXmlAttr(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function dataUrlInfo(dataUrl) {
  const m = String(dataUrl || "").match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;

  const mime = m[1].toLowerCase();
  const base64 = m[2];

  let ext = "png";
  let contentType = "image/png";

  if (mime.includes("jpeg") || mime.includes("jpg")) {
    ext = "jpg";
    contentType = "image/jpeg";
  } else if (mime.includes("png")) {
    ext = "png";
    contentType = "image/png";
  } else if (mime.includes("gif")) {
    ext = "gif";
    contentType = "image/gif";
  } else {
    // Word não abre WEBP de forma confiável em DOCX. Mantém PNG como fallback.
    ext = "png";
    contentType = "image/png";
  }

  return { mime, base64, ext, contentType };
}

function obterDimensoesImagem(dataUrl) {
  return new Promise(resolve => {
    if (!dataUrl) return resolve(null);
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

function ajustarTamanho(dim, maxWpt, maxHpt) {
  if (!dim || !dim.width || !dim.height) return { wpt: maxWpt, hpt: maxHpt };

  const escala = Math.min(maxWpt / dim.width, maxHpt / dim.height, 1);
  return {
    wpt: Math.max(1, Math.round(dim.width * escala)),
    hpt: Math.max(1, Math.round(dim.height * escala)),
  };
}

function criarDrawingXml(rId, item, n) {
  const cx = ptToEmu(item.wpt);
  const cy = ptToEmu(item.hpt);
  const nome = escapeXmlAttr(item.name || `Imagem ${n}`);

  return `<w:drawing>` +
`<wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" distT="0" distB="0" distL="0" distR="0">` +
`<wp:extent cx="${cx}" cy="${cy}"/>` +
`<wp:effectExtent l="0" t="0" r="0" b="0"/>` +
`<wp:docPr id="${5000 + n}" name="${nome}"/>` +
`<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>` +
`<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">` +
`<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
`<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
`<pic:nvPicPr><pic:cNvPr id="${6000 + n}" name="${nome}"/><pic:cNvPicPr/></pic:nvPicPr>` +
`<pic:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="${rId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
`<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>` +
`</pic:pic>` +
`</a:graphicData>` +
`</a:graphic>` +
`</wp:inline>` +
`</w:drawing>`;
}

function garantirContentType(zip, ext, contentType) {
  const path = "[Content_Types].xml";
  const f = zip.file(path);
  if (!f) return;
  let xml = f.asText();

  const extRe = new RegExp(`<Default[^>]+Extension=["']${escapeRegex(ext)}["']`, "i");
  if (!extRe.test(xml)) {
    xml = xml.replace(
      "</Types>",
      `<Default Extension="${ext}" ContentType="${contentType}"/></Types>`
    );
    zip.file(path, xml);
  }
}

function adicionarRelImagem(zip, target) {
  const relPath = "word/_rels/document.xml.rels";
  let xml;

  const f = zip.file(relPath);
  if (f) {
    xml = f.asText();
  } else {
    xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
          `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`;
  }

  let max = 0;
  const re = /Id="rId(\d+)"/g;
  let m;
  while ((m = re.exec(xml))) max = Math.max(max, parseInt(m[1], 10));

  const rId = `rId${max + 1}`;
  const rel = `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${target}"/>`;
  xml = xml.replace("</Relationships>", `${rel}</Relationships>`);
  zip.file(relPath, xml);
  return rId;
}

function substituirTokenPorDrawing(documentXml, token, drawingXml) {
  const safe = escapeRegex(token);

  // Caso normal: o token ocupa um <w:t> inteiro.
  const reText = new RegExp(`<w:t([^>]*)>${safe}</w:t>`, "g");
  let novo = documentXml.replace(reText, drawingXml);

  // Fallback: se sobrou token por quebra de run, remove para não aparecer no Word.
  novo = novo.replace(new RegExp(safe, "g"), "");
  return novo;
}

function normalizarTemplateZip(zip) {
  Object.keys(zip.files).forEach(nome => {
    if (!nome.endsWith(".xml")) return;
    const f = zip.files[nome];
    if (!f || f.dir) return;

    let xml = f.asText();

    // Tags antigas erradas: {{campo}} -> {campo}
    xml = xml.replace(/\{\{([A-Za-z0-9_]+)\}\}/g, "{$1}");

    // Tags de imagem antigas do image-module -> tags texto para injeção própria
    xml = xml.replace(/\{%logo_img\}/g, "{logo_img_token}");
    xml = xml.replace(/\{%esq_img\}/g, "{esq_img_token}");
    xml = xml.replace(/\{%dir_img\}/g, "{dir_img_token}");
    xml = xml.replace(/\{%foto_(\d+)_img\}/g, "{foto_$1_img_token}");

    // Remove chaves de GUIDs internos do Word: uri="{GUID}" -> uri="GUID"
    xml = xml.replace(
      /=\"\{([0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12})\}\"/g,
      '="$1"'
    );

    // Detalhamento será substituído por OOXML rico depois do Docxtemplater.
    xml = xml.replace(/<w:t([^>]*)>\{detalhamento\}<\/w:t>/g, '<w:t$1>{detalhamento_token}</w:t>');

    // Insere um token de quebra de página antes de cada tabela de fotos.
    // O token fica vazio normalmente, mas antes da foto 7, 13, 19... vira uma quebra real.
    if (nome === "word/document.xml" && xml.includes("{#fotoPares}") && !xml.includes("{page_break_token}")) {
      const pbPar = '<w:p><w:r><w:t>{page_break_token}</w:t></w:r></w:p>';
      xml = xml.replace(/(<w:p[^>]*>[\s\S]*?<w:t>\{#fotoPares\}<\/w:t>[\s\S]*?<\/w:p>)(<w:tbl>)/, '$1' + pbPar + '$2');
    }

    zip.file(nome, xml);
  });
}

function erroTemplateDetalhado(e) {
  if (e?.properties && Array.isArray(e.properties.errors)) {
    return e.properties.errors.map((err, i) => {
      const p = err.properties || {};
      const tag = p.xtag || p.id || p.tag || "tag_desconhecida";
      const exp = p.explanation || err.message || "Erro no template";
      return `${i + 1}. ${tag}: ${exp}`;
    }).join("\n");
  }
  return e?.message || String(e);
}

function montarParesFotosDocx(fotos, imagens) {
  const lista = Array.isArray(fotos) ? fotos : [];
  const pares = [];

  for (let i = 0; i < lista.length; i += 2) {
    const esq = lista[i] || {};
    const dir = lista[i + 1] || null;

    const esqToken = esq.img ? `__RDPIMG_ESQ_${i}__` : "";
    if (esq.img) imagens.push({ token: esqToken, dataUrl: esq.img, maxWpt: 265, maxHpt: 170, name: `Foto ${esq.num || i + 1}` });

    let dirToken = "";
    if (dir && dir.img) {
      dirToken = `__RDPIMG_DIR_${i + 1}__`;
      imagens.push({ token: dirToken, dataUrl: dir.img, maxWpt: 265, maxHpt: 170, name: `Foto ${dir.num || i + 2}` });
    }

    const pageBreakToken = i > 0 && i % 6 === 0 ? `__RDP_PAGE_BREAK_${i}__` : "";

    pares.push({
      page_break_token: pageBreakToken,
      esq_num:  esq.num  ? String(esq.num) : String(i + 1),
      esq_sis:  esq.sis  || "",
      esq_amb:  esq.amb  || "",
      esq_desc: esq.desc || "",
      esq_img_token: esqToken,

      dir_num:  dir && (dir.img || dir.amb || dir.desc) ? String(dir.num || i + 2) : "",
      dir_sis:  dir && (dir.img || dir.amb || dir.desc) ? (dir.sis  || "") : "",
      dir_amb:  dir && (dir.img || dir.amb || dir.desc) ? (dir.amb  || "") : "",
      dir_desc: dir && (dir.img || dir.amb || dir.desc) ? (dir.desc || "") : "",
      dir_img_token: dirToken,
    });
  }

  return pares;
}

function buildTagsDocx(d) {
  const produtividade = d.produtividade || "Produtivo";
  const clima = d.clima || "Bom";
  const imagens = [];

  const logoToken = d.logo ? "__RDPIMG_LOGO__" : "";
  if (d.logo) imagens.push({ token: logoToken, dataUrl: d.logo, maxWpt: 110, maxHpt: 42, name: "Logo do cliente" });

  const tags = {
    logo_img_token: logoToken,

    codigo:       d.codigo       || "",
    nome_cliente: d.nomeCliente  || "",
    data:         d.data         || "",
    contratante:  d.contratante  || "",
    obra:         d.obra         || "",
    endereco:     d.endereco     || "",
    h_ini_prev:   d.hIniPrev     || "08:00",
    h_ini_real:   d.hIniReal     || "08:00",
    h_fim_prev:   d.hFimPrev     || "17:00",
    h_fim_real:   d.hFimReal     || "17:00",
    detalhamento: d.detalhamento || "",
    detalhamento_token: "__RDP_DETAIL_HTML__",

    prod_muito: produtividade === "Muito Produtivo" ? "X" : "",
    prod_ok:    produtividade === "Produtivo"       ? "X" : "",
    prod_pouco: produtividade === "Pouco Produtivo" ? "X" : "",

    clima_bom:          clima === "Bom"          ? "X" : "",
    clima_chuva_leve:   clima === "Chuva Leve"   ? "X" : "",
    clima_chuva_forte:  clima === "Chuva Forte"  ? "X" : "",
    clima_fora_turno:   clima === "Fora Turno"   ? "X" : "",
  };

  for (let i = 0; i < 12; i++) {
    const p = d.profissionais?.[i] || {};
    tags[`prof_${i}_nome`]    = p.nome    || "";
    tags[`prof_${i}_empresa`] = p.empresa || "";
    tags[`prof_${i}_funcao`]  = p.funcao  || "";
  }

  for (let i = 0; i < 12; i++) {
    const a = d.atividades?.[i] || {};
    tags[`atv_${i}_num`]    = a.num    ? String(a.num) : "";
    tags[`atv_${i}_desc`]   = a.desc   || "";
    tags[`atv_${i}_amb`]    = a.amb    || "";
    tags[`atv_${i}_crit`]   = a.crit   || "";
    tags[`atv_${i}_status`] = a.status || "";
  }

  // Compatibilidade com templates antigos de fotos fixas
  for (let i = 0; i < 12; i++) {
    const f = d.fotos?.[i] || {};
    tags[`foto_${i}_sis`]  = f.sis  || "";
    tags[`foto_${i}_amb`]  = f.amb  || "";
    tags[`foto_${i}_desc`] = f.desc || "";
    const token = f.img ? `__RDPIMG_FIXA_${i}__` : "";
    tags[`foto_${i}_img_token`] = token;
    if (f.img) imagens.push({ token, dataUrl: f.img, maxWpt: 265, maxHpt: 170, name: `Foto ${i + 1}` });
  }

  tags.fotoPares = montarParesFotosDocx(d.fotos || [], imagens);

  return { tags, imagens };
}

async function prepararImagens(imagens) {
  const saida = [];

  for (const item of imagens) {
    const info = dataUrlInfo(item.dataUrl);
    if (!info || !item.token) continue;

    const dim = await obterDimensoesImagem(item.dataUrl);
    const tam = ajustarTamanho(dim, item.maxWpt || 265, item.maxHpt || 170);

    saida.push({
      ...item,
      ...info,
      wpt: tam.wpt,
      hpt: tam.hpt,
    });
  }

  return saida;
}

function inserirImagensNoDocx(zip, imagens) {
  let docFile = zip.file("word/document.xml");
  if (!docFile) throw new Error("template_rdp.docx inválido: word/document.xml não encontrado.");

  let documentXml = docFile.asText();

  imagens.forEach((item, i) => {
    if (!documentXml.includes(item.token)) return;

    const nomeArquivoImg = `rdp_img_${Date.now()}_${i}.${item.ext}`;
    const mediaPath = `word/media/${nomeArquivoImg}`;
    const target = `media/${nomeArquivoImg}`;

    zip.file(mediaPath, item.base64, { base64: true });
    garantirContentType(zip, item.ext, item.contentType);
    const rId = adicionarRelImagem(zip, target);
    const drawing = criarDrawingXml(rId, item, i + 1);

    documentXml = substituirTokenPorDrawing(documentXml, item.token, drawing);
  });

  // Remove qualquer token remanescente para não aparecer no Word.
  documentXml = documentXml.replace(/__RDPIMG_[A-Za-z0-9_]+__/g, "");
  zip.file("word/document.xml", documentXml);
}


function paragrafoComTokenRe(tokenPattern) {
  return new RegExp(`<w:p\\b[^>]*>(?:(?!<\\/w:p>)[\\s\\S])*${tokenPattern}(?:(?!<\\/w:p>)[\\s\\S])*<\\/w:p>`, "g");
}

function pageBreakParagraphXml() {
  return `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
}

function substituirQuebrasPagina(zip) {
  const docFile = zip.file("word/document.xml");
  if (!docFile) return;
  let xml = docFile.asText();
  xml = xml.replace(paragrafoComTokenRe("__RDP_PAGE_BREAK_[0-9]+__"), pageBreakParagraphXml());
  xml = xml.replace(/__RDP_PAGE_BREAK_[0-9]+__/g, "");
  zip.file("word/document.xml", xml);
}

function hexColorFromCss(value) {
  if (!value) return "";
  const v = String(value).trim();
  const hex = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split("").map(c => c + c).join("");
    return h.toUpperCase();
  }
  const rgb = v.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (rgb) {
    return [rgb[1], rgb[2], rgb[3]].map(n => Math.max(0, Math.min(255, Number(n))).toString(16).padStart(2, "0")).join("").toUpperCase();
  }
  return "";
}

function runXml(text, fmt = {}) {
  if (text === null || text === undefined || text === "") return "";
  const parts = String(text).split(/\n/);
  const rPr = [];
  rPr.push(`<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>`);
  rPr.push(`<w:sz w:val="20"/><w:szCs w:val="20"/>`);
  if (fmt.bold) rPr.push(`<w:b/><w:bCs/>`);
  if (fmt.italic) rPr.push(`<w:i/><w:iCs/>`);
  if (fmt.underline) rPr.push(`<w:u w:val="single"/>`);
  if (fmt.color) rPr.push(`<w:color w:val="${escapeXmlAttr(fmt.color)}"/>`);
  const pr = `<w:rPr>${rPr.join("")}</w:rPr>`;
  return parts.map((part, i) => {
    const textXml = part ? `<w:t xml:space="preserve">${escXml(part)}</w:t>` : "";
    const br = i > 0 ? `<w:br/>` : "";
    return `<w:r>${pr}${br}${textXml}</w:r>`;
  }).join("");
}

function inlineRuns(node, fmt = {}) {
  if (!node) return "";
  if (node.nodeType === 3) return runXml(node.nodeValue, fmt);
  if (node.nodeType !== 1) return "";

  const tag = node.tagName.toLowerCase();
  if (tag === "br") return `<w:r><w:br/></w:r>`;

  const nf = { ...fmt };
  if (tag === "b" || tag === "strong") nf.bold = true;
  if (tag === "i" || tag === "em") nf.italic = true;
  if (tag === "u") nf.underline = true;

  const style = node.getAttribute("style") || "";
  if (/font-weight\s*:\s*(bold|[6-9]00)/i.test(style)) nf.bold = true;
  if (/font-style\s*:\s*italic/i.test(style)) nf.italic = true;
  if (/text-decoration[^;]*underline/i.test(style)) nf.underline = true;
  const color = style.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i);
  const hex = color ? hexColorFromCss(color[1]) : "";
  if (hex) nf.color = hex;

  let out = "";
  node.childNodes.forEach(child => { out += inlineRuns(child, nf); });
  return out;
}

function paragraphXml(runs, opts = {}) {
  const jc = opts.align ? `<w:jc w:val="${escapeXmlAttr(opts.align)}"/>` : "";
  const indent = opts.indent ? `<w:ind w:left="${opts.indent}"/>` : "";
  const pPr = `<w:pPr><w:spacing w:after="80" w:line="276" w:lineRule="auto"/>${indent}${jc}</w:pPr>`;
  return `<w:p>${pPr}${runs || runXml(" ")}</w:p>`;
}

function elementoEhBloco(el) {
  if (!el || el.nodeType !== 1) return false;
  return /^(p|div|section|article|li|ul|ol|h1|h2|h3|h4|h5|h6|blockquote)$/i.test(el.tagName);
}

function blocosDetalhamento(node, out, level = 0, listType = null) {
  if (!node) return;

  if (node.nodeType === 3) {
    const t = node.nodeValue.replace(/\s+/g, " ").trim();
    if (t) out.push(paragraphXml(runXml(t)));
    return;
  }
  if (node.nodeType !== 1) return;

  const tag = node.tagName.toLowerCase();

  if (tag === "ul" || tag === "ol") {
    let n = 1;
    Array.from(node.children).forEach(ch => {
      if (ch.tagName && ch.tagName.toLowerCase() === "li") {
        blocosDetalhamento(ch, out, level + 1, tag === "ol" ? n++ : "bullet");
      }
    });
    return;
  }

  if (tag === "li") {
    const prefix = listType === "bullet" ? "• " : `${listType || 1}. `;
    const runs = runXml(prefix, {}) + Array.from(node.childNodes)
      .filter(ch => !(ch.nodeType === 1 && /^(ul|ol)$/i.test(ch.tagName)))
      .map(ch => inlineRuns(ch, {})).join("");
    out.push(paragraphXml(runs, { indent: Math.min(1440, level * 360) }));
    Array.from(node.children).forEach(ch => {
      if (/^(ul|ol)$/i.test(ch.tagName)) blocosDetalhamento(ch, out, level + 1, null);
    });
    return;
  }

  if (/^h[1-6]$/.test(tag)) {
    out.push(paragraphXml(inlineRuns(node, { bold: true })));
    return;
  }

  if (tag === "p" || tag === "div" || tag === "blockquote") {
    const style = node.getAttribute("style") || "";
    let align = "";
    const mAlign = style.match(/text-align\s*:\s*(center|right|left|justify)/i);
    if (mAlign) align = mAlign[1].toLowerCase();
    out.push(paragraphXml(inlineRuns(node, {}), { align }));
    return;
  }

  let hasBlock = false;
  node.childNodes.forEach(ch => { if (elementoEhBloco(ch)) hasBlock = true; });
  if (hasBlock) {
    node.childNodes.forEach(ch => blocosDetalhamento(ch, out, level, listType));
  } else {
    const runs = inlineRuns(node, {});
    if (runs) out.push(paragraphXml(runs));
  }
}

function htmlDetalhamentoParaOOXML(html, textoFallback = "") {
  let out = [];
  const cleanHtml = String(html || "").trim();

  if (cleanHtml && typeof DOMParser !== "undefined") {
    const doc = new DOMParser().parseFromString(`<div>${cleanHtml}</div>`, "text/html");
    const root = doc.body.firstElementChild;
    root.childNodes.forEach(ch => blocosDetalhamento(ch, out));
  }

  if (!out.length && textoFallback) {
    out = String(textoFallback).split(/\n+/).map(l => paragraphXml(runXml(l || " ")));
  }

  if (!out.length) out.push(paragraphXml(runXml(" ")));
  return out.join("");
}

function inserirDetalhamentoRich(zip, html, textoFallback = "") {
  const docFile = zip.file("word/document.xml");
  if (!docFile) return;
  let xml = docFile.asText();
  const detalheXml = htmlDetalhamentoParaOOXML(html, textoFallback);
  xml = xml.replace(paragrafoComTokenRe("__RDP_DETAIL_HTML__"), detalheXml);
  xml = xml.replace(/__RDP_DETAIL_HTML__/g, "");
  zip.file("word/document.xml", xml);
}

export async function gerarDOCX(d) {
  const PizZip = window.PizZip;
  const Docxtemplater = window.docxtemplater || window.Docxtemplater;

  if (!PizZip || !Docxtemplater) {
    throw new Error("Bibliotecas DOCX não carregadas. Verifique pizzip e docxtemplater no app.html.");
  }

  const resp = await fetch("template_rdp.docx?v=" + Date.now());
  if (!resp.ok) {
    throw new Error("template_rdp.docx não encontrado na raiz do GitHub Pages.");
  }

  const buf = await resp.arrayBuffer();
  const zip = new PizZip(buf);
  normalizarTemplateZip(zip);

  const { tags, imagens } = buildTagsDocx(d);

  let tmpl;
  try {
    tmpl = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter() { return ""; },
    });
  } catch (e) {
    throw new Error("Erro ao abrir template_rdp.docx:\n" + erroTemplateDetalhado(e));
  }

  try {
    tmpl.render(tags);
  } catch (e) {
    throw new Error("Erro no template_rdp.docx:\n" + erroTemplateDetalhado(e));
  }

  inserirDetalhamentoRich(tmpl.getZip(), d.detalhamentoHtml || "", d.detalhamento || "");
  substituirQuebrasPagina(tmpl.getZip());

  const imagensPreparadas = await prepararImagens(imagens);
  inserirImagensNoDocx(tmpl.getZip(), imagensPreparadas);

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
