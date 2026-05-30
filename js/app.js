// js/app.js
import { initializeApp }   from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut,
         updatePassword, reauthenticateWithCredential, EmailAuthProvider }
  from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc,
         doc, query, where, getDoc }
  from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { FIREBASE_CONFIG } from "./config.js";
import { gerarDOCX } from "./report.js";

const app  = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db   = getFirestore(app);
const ABREV = {AV:"AV", BMS:"BMS", SDAI:"SDAI", SECURITY:"SEG"};

let usuarioAtual = null;
let clientes = [];
let nProfs = 2, nAtv = 3, nFotos = 0;
let ultimoSistemaGlobal = "AV";
const fotosImgs = {};  // idx → dataURL
let detalhamentoEditor = null;
let detalhamentoEditorReady = null;

function atualizarMensagemFotosVazia() {
  const lista = document.getElementById("listaFotos");
  if (!lista) return;
  if (!lista.querySelector(".foto-card")) {
    lista.innerHTML = `<p class="foto-empty text-muted small text-center my-2">Nenhuma foto adicionada. Use <strong>Upload em Lote</strong> ou <strong>Foto</strong> para adicionar.</p>`;
  }
}

// ── Auth guard ────────────────────────────────────────────────────────────────
onAuthStateChanged(auth, async user => {
  try {
    if (!user) { location.replace("index.html"); return; }

    const snap = await getDoc(doc(db, "usuarios", user.uid));

    // Segurança de tela: só libera o app se existir cadastro em usuarios e estiver ativo.
    if (!snap.exists() || snap.data().ativo === false) {
      await signOut(auth);
      location.replace("index.html");
      return;
    }

    usuarioAtual = user;
    document.getElementById("nomeUsuario").textContent = snap.data()?.nome || user.email;
    document.getElementById("appContent").style.display = "block";
    initForm();
    carregarClientes();
  } catch (e) {
    console.error("Falha na validação do login:", e);
    await signOut(auth);
    location.replace("index.html");
  }
});

window.sair = () => signOut(auth).then(() => location.href = "index.html");

// ── Init form ─────────────────────────────────────────────────────────────────
function initForm() {
  for (let i = 0; i < nProfs; i++) addProf(false);
  for (let i = 0; i < nAtv;   i++) addAtv(false);
  ultimoSistemaGlobal = document.getElementById("sistema")?.value || "AV";
  for (let i = 0; i < nFotos; i++) addFoto(false);
  atualizarMensagemFotosVazia();
  atualizarPreviewNome();
  ["codigo","data","sistema","profArq"].forEach(id =>
    document.getElementById(id)?.addEventListener("input", atualizarPreviewNome));
  document.getElementById("sistema")?.addEventListener("change", atualizarSistemaFotos);
  inicializarEditorDetalhamento();
}

function atualizarPreviewNome() {
  const cod    = (document.getElementById("codigo")?.value||"PRJXXXXX").trim();
  const data   = document.getElementById("data")?.value||"";
  const sis    = document.getElementById("sistema")?.value||"AV";
  const prof   = (document.getElementById("profArq")?.value||"").replace(/ /g,"_")||"Nome_Profissional";
  let iso = data;
  try { const p=data.split("/"); iso=`${p[2]}-${p[1]}-${p[0]}`; } catch{}
  document.getElementById("previewNome").textContent =
    `📄 ${cod}_${iso}_RDP_(${ABREV[sis]||sis})_${prof}.docx`;
}

// ── Logo preview ─────────────────────────────────────────────────────────────
window.previewLogo = function(input) {
  if (!input.files[0]) return;
  const reader = new FileReader();
  reader.onload = e => {
    const img = document.getElementById("logoPreview");
    img.src = e.target.result; img.classList.remove("d-none");
  };
  reader.readAsDataURL(input.files[0]);
};

// ── Profissionais ─────────────────────────────────────────────────────────────
window.addProf = function(increment=true) {
  if (increment) nProfs++;
  const i = increment ? nProfs-1 : [...arguments].length ? 0 : nProfs-1;
  const idx = document.querySelectorAll(".prof-row").length;
  const div = document.createElement("div");
  div.className = "prof-row row g-2 mb-2 align-items-center";
  div.dataset.idx = idx;
  div.innerHTML = `
    <div class="col-md-4">
      <input class="form-control form-control-sm" placeholder="Nome completo"
             data-prof="${idx}" data-field="nome">
    </div>
    <div class="col-md-4">
      <input class="form-control form-control-sm" value="Convergint"
             data-prof="${idx}" data-field="empresa">
    </div>
    <div class="col-md-4">
      <input class="form-control form-control-sm" placeholder="Função"
             data-prof="${idx}" data-field="funcao">
    </div>`;
  document.getElementById("listaProfissionais").appendChild(div);
};

window.remProf = function() {
  const rows = document.querySelectorAll(".prof-row");
  if (rows.length <= 1) return;
  rows[rows.length-1].remove();
  nProfs = document.querySelectorAll(".prof-row").length;
};

// ── Atividades ────────────────────────────────────────────────────────────────
window.addAtv = function(increment=true) {
  const idx = document.querySelectorAll(".atv-row").length;
  if (increment) nAtv++;
  const div = document.createElement("div");
  div.className = "atv-row row g-2 mb-2 align-items-center";
  div.innerHTML = `
    <div class="col-auto text-muted fw-bold" style="width:30px">${idx+1}</div>
    <div class="col-md-4">
      <input class="form-control form-control-sm" placeholder="Descrição"
             data-atv="${idx}" data-field="desc">
    </div>
    <div class="col-md-3">
      <input class="form-control form-control-sm" placeholder="Ambiente"
             data-atv="${idx}" data-field="amb">
    </div>
    <div class="col-md-2">
      <select class="form-select form-select-sm" data-atv="${idx}" data-field="crit">
        <option>Alta</option><option>Média</option><option>Baixa</option>
      </select>
    </div>
    <div class="col-md-2">
      <select class="form-select form-select-sm" data-atv="${idx}" data-field="status">
        <option>Concluído</option><option>Em andamento</option>
        <option>Pendente</option><option>Parcial</option><option>N/A</option>
      </select>
    </div>`;
  document.getElementById("listaAtividades").appendChild(div);
};

window.remAtv = function() {
  const rows = document.querySelectorAll(".atv-row");
  if (rows.length <= 1) return;
  rows[rows.length-1].remove();
  nAtv = document.querySelectorAll(".atv-row").length;
};

// ── Fotos ─────────────────────────────────────────────────────────────────────
window.addFoto = function(increment=true) {
  const idx = document.querySelectorAll(".foto-card").length;
  if (increment) nFotos++;
  const sis = document.getElementById("sistema")?.value || "AV";
  const listaFotos = document.getElementById("listaFotos");
  listaFotos?.querySelector(".foto-empty")?.remove();
  const div = document.createElement("div");
  div.className = "foto-card border rounded p-2 mb-2";
  div.dataset.idx = idx;
  div.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-2">
      <strong class="small"><i class="bi bi-image"></i> Foto ${idx+1}</strong>
      <span class="badge text-bg-secondary">Nº ${idx+1}</span>
    </div>
    <div class="row g-2 align-items-start">
      <div class="col-md-2">
        <label class="form-label small mb-1">Sistema</label>
        <select class="form-select form-select-sm foto-sis" data-foto="${idx}"
                onchange="this.dataset.manual='true'">
          ${["AV","BMS","SDAI","SECURITY"].map(s =>
            `<option${s===sis?" selected":""}>${s}</option>`).join("")}
        </select>
      </div>
      <div class="col-md-3">
        <label class="form-label small mb-1">Ambiente</label>
        <input class="form-control form-control-sm" placeholder="Ex.: Sala técnica"
               data-foto="${idx}" data-field="amb">
      </div>
      <div class="col-md-3">
        <label class="form-label small mb-1">Texto explicativo</label>
        <textarea class="form-control form-control-sm" rows="2"
                  placeholder="Texto explicativo da imagem" data-foto="${idx}" data-field="desc"></textarea>
      </div>
      <div class="col-md-4">
        <label class="form-label small mb-1">Imagem</label>
        <input type="file" class="form-control form-control-sm" accept="image/*"
               onchange="carregarFoto(this,${idx})">
        <img id="thumbFoto${idx}" src="" class="mt-1 rounded d-none foto-thumb">
      </div>
    </div>`;
  listaFotos.appendChild(div);
};

window.remFoto = function() {
  const cards = document.querySelectorAll(".foto-card");
  if (cards.length <= 0) return;
  const last = cards.length - 1;
  delete fotosImgs[last];
  cards[last].remove();
  nFotos = document.querySelectorAll(".foto-card").length;
  atualizarMensagemFotosVazia();
};

window.carregarFoto = function(input, idx) {
  if (!input.files[0]) return;
  const reader = new FileReader();
  reader.onload = e => {
    fotosImgs[idx] = e.target.result;
    const img = document.getElementById(`thumbFoto${idx}`);
    img.src = e.target.result; img.classList.remove("d-none");
  };
  reader.readAsDataURL(input.files[0]);
};

// ── Upload de múltiplas fotos de uma vez ──────────────────────────────────────
window.uploadEmLote = function() {
  const input = document.createElement("input");
  input.type     = "file";
  input.accept   = "image/*";
  input.multiple = true;              // permite selecionar várias fotos

  input.addEventListener("change", function() {
    const files = Array.from(this.files);
    if (!files.length) return;

    files.forEach(file => {
      // Cria um novo slot de foto para cada arquivo
      addFoto();
      const idx = document.querySelectorAll(".foto-card").length - 1;

      const reader = new FileReader();
      reader.onload = e => {
        fotosImgs[idx] = e.target.result;
        const thumb = document.getElementById(`thumbFoto${idx}`);
        if (thumb) { thumb.src = e.target.result; thumb.classList.remove("d-none"); }
      };
      reader.readAsDataURL(file);
    });
  });

  input.click();   // abre o seletor de arquivos do SO
};

window.atualizarSistemaFotos = function() {
  const sis = document.getElementById("sistema")?.value || "AV";

  // Preenche automaticamente o sistema das fotos novas/sem ajuste manual.
  // Se o usuário alterou uma foto pontualmente, ela não é sobrescrita.
  document.querySelectorAll(".foto-sis").forEach(sel => {
    const foiManual = sel.dataset.manual === "true";
    if (!foiManual || sel.value === ultimoSistemaGlobal) {
      sel.value = sis;
    }
  });

  ultimoSistemaGlobal = sis;
  atualizarPreviewNome();
};

// ── Editor online do detalhamento ─────────────────────────────────────────────
function inicializarEditorDetalhamento() {
  if (detalhamentoEditor || detalhamentoEditorReady) return detalhamentoEditorReady;
  const editorEl = document.getElementById("detalhamentoEditor");
  if (!editorEl) return Promise.resolve(null);

  if (!window.Jodit) {
    console.warn("Jodit não carregou. Usando textarea simples.");
    editorEl.classList.add("form-control");
    return Promise.resolve(null);
  }

  detalhamentoEditorReady = Promise.resolve().then(() => {
    detalhamentoEditor = window.Jodit.make(editorEl, {
      language: "pt_br",
      height: 520,
      minHeight: 360,
      iframe: false,
      enter: "P",
      spellcheck: true,
      askBeforePasteHTML: false,
      askBeforePasteFromWord: false,
      defaultActionOnPaste: "insert_as_html",
      cleanHTML: {
        removeEmptyElements: false,
        fillEmptyParagraph: false
      },
      uploader: { insertImageAsBase64URI: true },
      placeholder: "Digite ou cole aqui o detalhamento das atividades...",
      buttons: [
        "source", "|",
        "paragraph", "fontsize", "brush", "bold", "italic", "underline", "strikethrough", "|",
        "ul", "ol", "outdent", "indent", "align", "|",
        "table", "link", "hr", "|",
        "copyformat", "eraser", "undo", "redo", "fullsize"
      ],
      buttonsMD: [
        "paragraph", "bold", "italic", "underline", "|", "ul", "ol", "table", "link", "|", "undo", "redo", "fullsize"
      ],
      buttonsSM: [
        "bold", "italic", "underline", "|", "ul", "ol", "table", "|", "undo", "redo", "fullsize"
      ],
      controls: {
        paragraph: {
          list: {
            p: "Parágrafo",
            h1: "Título 1",
            h2: "Título 2",
            h3: "Título 3",
            h4: "Título 4"
          }
        }
      }
    });
    return detalhamentoEditor;
  }).catch(err => {
    console.error("Erro ao iniciar Jodit:", err);
    editorEl.classList.add("form-control");
    return null;
  });

  return detalhamentoEditorReady;
}

function obterDetalhamentoHtml() {
  if (detalhamentoEditor) {
    const html = detalhamentoEditor.value || "";
    return html.trim() === "<p><br></p>" || html.trim() === "<p>&nbsp;</p>" ? "" : html;
  }
  const el = document.getElementById("detalhamentoEditor");
  return el?.value || el?.innerHTML || "";
}

function obterDetalhamentoTexto() {
  const html = obterDetalhamentoHtml();
  if (html) {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return (tmp.innerText || "").trim();
  }
  const el = document.getElementById("detalhamentoEditor");
  return (el?.value || el?.innerText || "").trim();
}


// ── Coletar dados do formulário ────────────────────────────────────────────────
function coletarDados() {
  const profissionais = [];
  document.querySelectorAll(".prof-row").forEach((row, i) => {
    const nome = row.querySelector(`[data-field="nome"]`)?.value?.trim();
    if (nome) profissionais.push({
      nome,
      empresa: row.querySelector(`[data-field="empresa"]`)?.value || "Convergint",
      funcao:  row.querySelector(`[data-field="funcao"]`)?.value  || "",
    });
  });

  const atividades = [];
  document.querySelectorAll(".atv-row").forEach((row, i) => {
    const desc = row.querySelector(`[data-field="desc"]`)?.value?.trim();
    if (desc) atividades.push({
      desc,
      amb:    row.querySelector(`[data-field="amb"]`)?.value  || "",
      crit:   row.querySelector(`[data-field="crit"]`)?.value || "Alta",
      status: row.querySelector(`[data-field="status"]`)?.value || "Concluído",
      num:    atividades.length + 1,
    });
  });

  const fotos = [];
  document.querySelectorAll(".foto-card").forEach((card, i) => {
    const amb  = card.querySelector(`[data-field="amb"]`)?.value?.trim()  || "";
    const desc = card.querySelector(`[data-field="desc"]`)?.value?.trim() || "";
    const sis  = card.querySelector(`.foto-sis`)?.value || "AV";
    const img  = fotosImgs[i] || null;
    if (amb || desc || img)
      fotos.push({ sis, amb, desc, img, num: fotos.length + 1 });
  });

  const sis = document.getElementById("sistema")?.value || "AV";
  return {
    logo:          (document.getElementById("logoPreview")?.src || "").startsWith("data:image/") ? document.getElementById("logoPreview").src : "",
    nomeCliente:   document.getElementById("nomeCliente")?.value?.trim() || "",
    codigo:        document.getElementById("codigo")?.value?.trim()      || "",
    data:          document.getElementById("data")?.value?.trim()        || "",
    sistema:       sis,
    profArq:       (document.getElementById("profArq")?.value?.trim() || "").replace(/ /g,"_"),
    contratante:   document.getElementById("contratante")?.value?.trim() || "",
    obra:          document.getElementById("obra")?.value?.trim()        || "",
    endereco:      document.getElementById("endereco")?.value?.trim()    || "",
    hIniPrev:      document.getElementById("hIniPrev")?.value  || "08:00",
    hIniReal:      document.getElementById("hIniReal")?.value  || "08:00",
    hFimPrev:      document.getElementById("hFimPrev")?.value  || "17:00",
    hFimReal:      document.getElementById("hFimReal")?.value  || "17:00",
    produtividade: document.getElementById("produtividade")?.value || "Produtivo",
    clima:         document.getElementById("clima")?.value         || "Bom",
    detalhamento:  obterDetalhamentoTexto(),
    detalhamentoHtml: obterDetalhamentoHtml(),
    profissionais, atividades, fotos,
  };
}

// ── Gerar relatório DOCX ───────────────────────────────────────────────────────
window.gerarDOCX = async function() {
  const btn = document.getElementById("btnDocx");
  if (btn) { btn.disabled = true; btn.textContent = "⏳ Gerando…"; }
  try {
    await gerarDOCX(coletarDados());
  } catch(e) {
    alert("Erro ao gerar DOCX: " + e.message);
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-file-word"></i> Baixar DOCX'; }
  }
};

// ── Clientes ──────────────────────────────────────────────────────────────────
window.salvarCliente = async function() {
  if (!usuarioAtual) return;
  const nomeCliente = document.getElementById("nomeCliente")?.value?.trim();
  if (!nomeCliente) { alert("Informe o nome do cliente antes de salvar."); return; }

  const logo = document.getElementById("logoPreview")?.src || "";
  const dados = {
    userId:      usuarioAtual.uid,
    nomeCliente,
    codigo:      document.getElementById("codigo")?.value?.trim()      || "",
    contratante: document.getElementById("contratante")?.value?.trim() || "",
    obra:        document.getElementById("obra")?.value?.trim()        || "",
    endereco:    document.getElementById("endereco")?.value?.trim()    || "",
    logo:        logo.startsWith("data:") ? logo : "",
    criado:      new Date().toISOString(),
  };

  await addDoc(collection(db, "clientes"), dados);
  await carregarClientes();
  alert("✅ Cliente salvo!");
};

async function carregarClientes() {
  if (!usuarioAtual) return;
  const q = query(collection(db, "clientes"), where("userId","==",usuarioAtual.uid));
  const snap = await getDocs(q);
  clientes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderClientes();
}

function renderClientes(filtro="") {
  const lista = document.getElementById("listaClientes");
  const filtrados = filtro
    ? clientes.filter(c => (c.nomeCliente+c.obra+c.codigo).toLowerCase().includes(filtro.toLowerCase()))
    : clientes;

  if (!filtrados.length) {
    lista.innerHTML = `<p class="text-muted small text-center mt-2">Nenhum cliente encontrado.</p>`;
    return;
  }

  lista.innerHTML = filtrados.map(c => `
    <div class="border rounded p-2 mb-1 cliente-item">
      ${c.logo ? `<img src="${c.logo}" height="24" class="mb-1 d-block rounded">` : ""}
      <div class="fw-semibold" style="font-size:.84rem">${c.nomeCliente}</div>
      <small class="text-muted">${c.codigo}${c.obra ? " · "+c.obra : ""}</small>
      <div class="d-flex gap-1 mt-1">
        <button class="btn btn-xs btn-outline-primary" style="font-size:.75rem;padding:2px 6px"
                onclick="carregarClienteForm('${c.id}')">
          <i class="bi bi-arrow-down-circle"></i> Carregar
        </button>
        <button class="btn btn-xs btn-outline-danger" style="font-size:.75rem;padding:2px 6px"
                onclick="excluirCliente('${c.id}')">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    </div>
  `).join("");
}

window.filtrarClientes = v => renderClientes(v);

window.carregarClienteForm = function(id) {
  const c = clientes.find(x => x.id === id);
  if (!c) return;
  document.getElementById("nomeCliente").value  = c.nomeCliente || "";
  document.getElementById("codigo").value       = c.codigo      || "";
  document.getElementById("contratante").value  = c.contratante || "";
  document.getElementById("obra").value         = c.obra        || "";
  document.getElementById("endereco").value     = c.endereco    || "";
  if (c.logo) {
    const img = document.getElementById("logoPreview");
    img.src = c.logo; img.classList.remove("d-none");
  }
  atualizarPreviewNome();
};

window.excluirCliente = async function(id) {
  if (!confirm("Excluir cliente?")) return;
  await deleteDoc(doc(db, "clientes", id));
  await carregarClientes();
};

// ── Alterar senha ─────────────────────────────────────────────────────────────
window.alterarSenha = async function() {
  const atual = document.getElementById("senhaAtual").value;
  const nova  = document.getElementById("novaSenha").value;
  const msg   = document.getElementById("msgSenha");
  msg.style.display = "none";
  if (nova.length < 6) {
    msg.textContent = "Senha deve ter ao menos 6 caracteres.";
    msg.style.display = "block"; return;
  }
  try {
    const cred = EmailAuthProvider.credential(usuarioAtual.email, atual);
    await reauthenticateWithCredential(usuarioAtual, cred);
    await updatePassword(usuarioAtual, nova);
    bootstrap.Modal.getInstance(document.getElementById("modalSenha")).hide();
    alert("✅ Senha alterada com sucesso!");
  } catch(e) {
    msg.textContent = "Senha atual incorreta.";
    msg.style.display = "block";
  }
};
