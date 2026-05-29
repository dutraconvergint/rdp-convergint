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
// DOCX estável via html-docx-js
// ─────────────────────────────────────────────────────────────────────────────
export async function gerarDOCX(d) {
  if (!window.htmlDocx || typeof window.htmlDocx.asBlob !== "function") {
    throw new Error("Biblioteca html-docx-js não carregada. Verifique o script no app.html.");
  }

  // Usa o mesmo HTML do PDF. Assim PDF e DOCX ficam com o mesmo conteúdo
  // e evita arquivo .docx corrompido por OpenXML montado manualmente.
  const html = prepararHtmlParaDocx(gerarHTML(d));

  const blob = window.htmlDocx.asBlob(html, {
    orientation: "portrait",
    margins: {
      top: 567,
      right: 567,
      bottom: 567,
      left: 567
    }
  });

  baixarBlob(blob, nomeArquivo(d, "docx"));
}

function prepararHtmlParaDocx(html) {
  // Garante fundo branco e texto preto no DOCX, mesmo com o site em modo dark.
  // Também reforça quebras de página nas fotos.
  return String(html || "")
    .replace("html, body { background:#fff !important; color:#000 !important; }
  body { font-family: Arial, Helvetica, sans-serif; color: #000; margin: 0; font-size: 8.5pt; }",
             "html, body { background:#fff !important; color:#000 !important; } html, body { background:#fff !important; color:#000 !important; }
  body { font-family: Arial, Helvetica, sans-serif; color: #000; margin: 0; font-size: 8.5pt; }")
    .replace(/<title>.*?<\/title>/, "<title>Relatório Diário de Programação</title>");
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
