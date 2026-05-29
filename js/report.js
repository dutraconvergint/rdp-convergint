// js/report.js – Gera relatório como PDF (HTML) e DOCX (docxtemplater + imagens)

const ABREV = {AV:"AV",BMS:"BMS",SDAI:"SDAI",SECURITY:"SEG"};

// Imagem 1x1 transparente (usada nos slots de foto vazios — fica invisível)
const IMG_VAZIA = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

function b64ToBytes(dataUrl) {
  const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// ── Gerar DOCX com imagens ────────────────────────────────────────────────────
export async function gerarDOCX(d) {
  const respDoc = await fetch("template_rdp.docx");
  if (!respDoc.ok) throw new Error(
    "template_rdp.docx não encontrado.\nRode converter_template.py e coloque o arquivo no repositório."
  );
  const buf = await respDoc.arrayBuffer();

  // Libs carregadas via <script> no app.html (UMD global)
  const PizZip         = window.PizZip;
  const Docxtemplater  = window.docxtemplater;
  const ImageModule    = window.DocxtemplaterImageModuleFree;

  if (!PizZip || !Docxtemplater)
    throw new Error("PizZip / Docxtemplater não carregados. Verifique os scripts no app.html.");

  const zip = new PizZip(buf);

  const modules = [];
  if (ImageModule) {
    modules.push(new ImageModule({
      centered: true,
      getImage(tagValue) {
        return b64ToBytes(tagValue || IMG_VAZIA);
      },
      getSize(img, tagValue) {
        if (!tagValue || tagValue === IMG_VAZIA) return [1, 1];
        return [270, 175];   // largura × altura em pontos
      },
    }));
  }

  const tmpl = new Docxtemplater(zip, {
    modules,
    paragraphLoop: true,
    linebreaks:    true,
  });

  const tags = {
    codigo:       d.codigo,
    nome_cliente: d.nomeCliente,
    data:         d.data,
    contratante:  d.contratante,
    obra:         d.obra,
    endereco:     d.endereco,
    h_ini_prev:   d.hIniPrev,
    h_ini_real:   d.hIniReal,
    h_fim_prev:   d.hFimPrev,
    h_fim_real:   d.hFimReal,
    detalhamento: d.detalhamento,
  };

  // Profissionais (12 slots)
  for (let i = 0; i < 12; i++) {
    const p = d.profissionais[i] || {};
    tags[`prof_${i}_nome`]    = p.nome    || "";
    tags[`prof_${i}_empresa`] = p.empresa || "";
    tags[`prof_${i}_funcao`]  = p.funcao  || "";
  }

  // Atividades (12 slots)
  for (let i = 0; i < 12; i++) {
    const a = d.atividades[i] || {};
    tags[`atv_${i}_num`]    = a.num    ? String(a.num) : "";
    tags[`atv_${i}_desc`]   = a.desc   || "";
    tags[`atv_${i}_amb`]    = a.amb    || "";
    tags[`atv_${i}_crit`]   = a.crit   || "";
    tags[`atv_${i}_status`] = a.status || "";
  }

  // Fotos (12 slots) — imagem real ou 1×1 invisível
  for (let i = 0; i < 12; i++) {
    const f = d.fotos[i] || {};
    tags[`foto_${i}_sis`]  = f.sis  || "";
    tags[`foto_${i}_amb`]  = f.amb  || "";
    tags[`foto_${i}_desc`] = f.desc || "";
    tags[`foto_${i}_img`]  = f.img  || IMG_VAZIA;
  }

  tmpl.render(tags);

  const out = tmpl.getZip().generate({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  const url  = URL.createObjectURL(out);
  const link = document.createElement("a");
  link.href = url; link.download = nomeArquivo(d);
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function nomeArquivo(d) {
  let iso = d.data;
  try { const p=d.data.split("/"); iso=`${p[2]}-${p[1]}-${p[0]}`; } catch {}
  const sis  = ABREV[d.sistema] || d.sistema;
  const prof = (d.profArq||"").replace(/ /g,"_") || "Profissional";
  return `${d.codigo||"RDP"}_${iso}_RDP_(${sis})_${prof}.docx`;
}

// ── Gerar PDF via impressão ───────────────────────────────────────────────────
export function gerarHTML(d) {
  const prod   = d.produtividade || "";
  const clima  = d.clima || "";
  const sistAbrev = ABREV[d.sistema]||d.sistema;

  // Linha de X para produtividade
  const pMP  = prod==="Muito Produtivo"  ? "X" : "";
  const pP   = prod==="Produtivo"        ? "X" : "";
  const pPP  = prod==="Pouco Produtivo"  ? "X" : "";
  const cBOM = clima==="Bom"             ? "X" : "";
  const cCL  = clima==="Chuva Leve"      ? "X" : "";
  const cCF  = clima==="Chuva Forte"     ? "X" : "";
  const cFT  = clima==="Fora Turno"      ? "X" : "";

  const profRows = d.profissionais.map((p,i) => `
    <tr>
      <td style="text-align:center">${i+1}</td>
      <td>${p.nome}</td>
      <td>${p.empresa}</td>
      <td>${p.funcao}</td>
    </tr>`).join("");

  const atvRows = d.atividades.map(a => `
    <tr>
      <td style="text-align:center">${a.num}</td>
      <td>${a.desc}</td>
      <td>${a.amb}</td>
      <td style="text-align:center">${a.crit}</td>
      <td style="text-align:center">${a.status}</td>
    </tr>`).join("");

  // Fotos em pares
  const fotoPares = [];
  for (let i=0; i<d.fotos.length; i+=2) {
    fotoPares.push([d.fotos[i], d.fotos[i+1]||null]);
  }

  const fotoTables = fotoPares.map(([esq,dir]) => `
    <table class="foto-table">
      <tr>
        <td class="foto-num">${esq.num}</td>
        <td class="foto-bloco">
          <table style="width:100%;border-collapse:collapse">
            <tr>
              <td class="foto-label">Sistema:</td>
              <td class="foto-val">${esq.sis}</td>
            </tr>
            <tr>
              <td class="foto-label">Ambiente:</td>
              <td class="foto-val"><strong>${esq.amb}</strong></td>
            </tr>
            <tr>
              <td colspan="2" class="foto-img-cell">
                ${esq.img
                  ? `<img src="${esq.img}" style="max-width:100%;max-height:160px;object-fit:contain">`
                  : `<div class="foto-placeholder">[Foto]</div>`}
              </td>
            </tr>
            <tr>
              <td colspan="2" class="foto-desc">${esq.desc}</td>
            </tr>
          </table>
        </td>
        ${dir ? `
        <td class="foto-num">${dir.num}</td>
        <td class="foto-bloco">
          <table style="width:100%;border-collapse:collapse">
            <tr>
              <td class="foto-label">Sistema:</td>
              <td class="foto-val">${dir.sis}</td>
            </tr>
            <tr>
              <td class="foto-label">Ambiente:</td>
              <td class="foto-val"><strong>${dir.amb}</strong></td>
            </tr>
            <tr>
              <td colspan="2" class="foto-img-cell">
                ${dir.img
                  ? `<img src="${dir.img}" style="max-width:100%;max-height:160px;object-fit:contain">`
                  : `<div class="foto-placeholder">[Foto]</div>`}
              </td>
            </tr>
            <tr>
              <td colspan="2" class="foto-desc">${dir.desc}</td>
            </tr>
          </table>
        </td>` : '<td class="foto-num"></td><td class="foto-bloco"></td>'}
      </tr>
    </table>`).join("<br style='margin:4px'>");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>RDP – ${d.codigo}</title>
<style>
  @page { size: A4; margin: 1.2cm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 8.5pt; color: #000; }

  table { border-collapse: collapse; width: 100%; }
  td, th { border: 0.5pt solid #444; padding: 2pt 4pt; vertical-align: middle; }
  .no-border td, .no-border th { border: none; }

  /* Cabeçalho com logos */
  .hdr-table { width:100%; border:1pt solid #000; margin-bottom:4pt; }
  .hdr-table td { border:0.5pt solid #aaa; padding:4pt 8pt; }
  .hdr-logo img { max-height:50px; max-width:130px; object-fit:contain; }
  .hdr-title { text-align:center; font-size:14pt; font-weight:bold; }
  .hdr-convergint { text-align:right; font-size:18pt; font-weight:bold;
                    color:#d04000; font-style:italic; letter-spacing:-1px; }

  /* Linha de dados */
  .dados-table { width:100%; margin-bottom:4pt; }
  .dados-table td { border:0.5pt solid #aaa; padding:3pt 5pt; }
  .label-cell { font-weight:bold; background:#f0f0f0; width:90pt; }
  .cod-cell   { background:#1a3a5c; color:#fff; font-weight:bold;
                text-align:center; font-size:9pt; }

  /* Resumo evolutivo */
  .res-table th { background:#d0d0d0; font-size:7.5pt; text-align:center; font-weight:bold; }
  .res-table td { text-align:center; font-size:7.5pt; }
  .x-cell { font-weight:bold; color:#1a3a5c; font-size:10pt; }

  /* Profissionais */
  .prof-table th { background:#d0d0d0; font-weight:bold; font-size:8pt; }

  /* Atividades */
  .atv-table th { background:#d0d0d0; font-weight:bold; font-size:8pt; }
  .atv-table td { font-size:8pt; }

  /* Fotos */
  .foto-section-title {
    background:#1a3a5c; color:#fff; font-weight:bold; font-size:8.5pt;
    padding:3pt 6pt; margin:6pt 0 4pt; border-radius:2pt;
  }
  .foto-table { width:100%; border-collapse:collapse; margin-bottom:6pt; }
  .foto-num   { width:20pt; text-align:center; font-weight:bold;
                border:0.5pt solid #444; background:#f0f0f0; }
  .foto-bloco { width:48%; border:0.5pt solid #444; padding:4pt; vertical-align:top; }
  .foto-label { font-size:7.5pt; font-weight:bold; width:55pt; }
  .foto-val   { font-size:7.5pt; }
  .foto-img-cell { text-align:center; padding:4pt; min-height:120pt; }
  .foto-placeholder { height:120pt; border:1pt dashed #aaa; display:flex;
                       align-items:center; justify-content:center;
                       color:#aaa; font-size:10pt; }
  .foto-desc { font-size:7.5pt; padding:3pt 4pt; background:#fafafa; }

  /* Detalhamento */
  .det-box { border:0.5pt solid #444; padding:6pt; min-height:50pt;
             font-size:8pt; white-space:pre-wrap; }

  /* Assinaturas */
  .assin-table td { border:none; text-align:center; padding-top:20pt; }
  .assin-line { border-top:0.5pt solid #000; width:160pt;
                display:inline-block; margin-bottom:2pt; }

  /* Títulos de seção */
  .sec-title { background:#1a3a5c; color:#fff; font-weight:bold;
               padding:2pt 6pt; font-size:8.5pt; margin:5pt 0 3pt; }

  @media print {
    .no-print { display:none !important; }
    body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  }
</style>
</head>
<body>

<!-- Botão de impressão (não aparece no PDF) -->
<div class="no-print" style="text-align:center;padding:12px;background:#1a3a5c">
  <button onclick="window.print()" style="
    background:#fff;color:#1a3a5c;border:none;padding:8px 24px;
    border-radius:6px;font-weight:bold;font-size:14px;cursor:pointer">
    🖨️ Salvar / Imprimir como PDF
  </button>
</div>

<!-- Cabeçalho -->
<table class="hdr-table">
  <tr>
    <td class="hdr-logo" style="width:140pt">
      ${d.logo && d.logo.startsWith("data:")
        ? `<img src="${d.logo}">`
        : `<span style="color:#999;font-size:8pt">Logo do Cliente</span>`}
    </td>
    <td class="hdr-title" style="font-size:11pt">
      ${d.nomeCliente || ""}
    </td>
    <td class="hdr-convergint" style="width:130pt">convergint</td>
  </tr>
</table>

<!-- Dados do projeto -->
<table class="dados-table">
  <tr>
    <td class="label-cell" colspan="1"><strong>CONTRATANTE:</strong></td>
    <td colspan="3">${d.contratante}</td>
    <td class="cod-cell" rowspan="3" style="width:80pt">
      CÓDIGO:<br><span style="font-size:11pt">${d.codigo}</span>
    </td>
  </tr>
  <tr>
    <td class="label-cell"><strong>OBRA:</strong></td>
    <td colspan="3">${d.obra}</td>
  </tr>
  <tr>
    <td class="label-cell"><strong>ENDEREÇO:</strong></td>
    <td colspan="3">${d.endereco}</td>
  </tr>
</table>

<!-- Resumo evolutivo -->
<table class="res-table" style="margin-bottom:4pt">
  <thead>
    <tr>
      <th colspan="3">RESUMO EVOLUTIVO DO DIA</th>
      <th colspan="2">HORÁRIO</th>
      <th colspan="2">CONDIÇÕES CLIMÁTICAS</th>
      <th rowspan="2" style="width:60pt">DATA:<br>
        <span style="font-size:9pt;font-weight:bold">${d.data}</span></th>
    </tr>
    <tr>
      <th>MUITO<br>PRODUTIVO</th>
      <th>PRODUTIVO</th>
      <th>POUCO<br>PRODUTIVO</th>
      <th>INÍCIO</th>
      <th>TÉRMINO</th>
      <th>BOM</th>
      <th>CHUVA LEVE / FORTE / FORA TURNO</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td class="x-cell">${pMP}</td>
      <td class="x-cell">${pP}</td>
      <td class="x-cell">${pPP}</td>
      <td>Prev: ${d.hIniPrev}<br>Real: ${d.hIniReal}</td>
      <td>Prev: ${d.hFimPrev}<br>Real: ${d.hFimReal}</td>
      <td class="x-cell">${cBOM}</td>
      <td class="x-cell">
        ${cCL?`Chuva Leve ${cCL} `:""}
        ${cCF?`Chuva Forte ${cCF} `:""}
        ${cFT?`Fora Turno ${cFT}`:""}
      </td>
    </tr>
  </tbody>
</table>

<!-- Profissionais -->
<div class="sec-title">PROFISSIONAIS ENVOLVIDOS</div>
<table class="prof-table" style="margin-bottom:4pt">
  <thead>
    <tr><th style="width:24pt">Nº</th><th>NOME</th><th>EMPRESA</th><th>FUNÇÃO</th></tr>
  </thead>
  <tbody>${profRows}</tbody>
</table>

<!-- Atividades -->
<div class="sec-title">DESCRIÇÃO DE ATIVIDADES REALIZADAS</div>
<table class="atv-table" style="margin-bottom:4pt">
  <thead>
    <tr>
      <th style="width:24pt">Nº</th>
      <th>ATIVIDADES</th>
      <th style="width:80pt">Ambiente</th>
      <th style="width:60pt">Criticidade</th>
      <th style="width:70pt">STATUS</th>
    </tr>
  </thead>
  <tbody>${atvRows}</tbody>
</table>

<!-- Fotos -->
${d.fotos.length ? `
<div class="foto-section-title">📷 RELATÓRIO FOTOGRÁFICO</div>
${fotoTables}` : ""}

<!-- Detalhamento -->
<div class="sec-title">DETALHAMENTO DAS ATIVIDADES</div>
<div class="det-box">${d.detalhamento}</div>

<!-- Assinaturas -->
<table class="assin-table" style="margin-top:20pt">
  <tr>
    <td>
      <div class="assin-line"></div><br>
      <strong>CONVERGINT TECHNOLOGIES</strong>
    </td>
    <td>
      <div class="assin-line"></div><br>
      <strong>${d.nomeCliente.split("/")[0].trim()}</strong>
    </td>
  </tr>
</table>

</body>
</html>`;
}
