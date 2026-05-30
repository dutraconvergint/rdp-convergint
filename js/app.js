// js/app.js
import { initializeApp }   from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut,
         updatePassword, updateEmail, updateProfile,
         reauthenticateWithCredential, EmailAuthProvider }
  from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { getFirestore, collection, getDocs, deleteDoc,
         doc, query, where, getDoc, setDoc, updateDoc }
  from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { FIREBASE_CONFIG } from "./config.js";
import { gerarDOCX } from "./report.js";

const app  = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db   = getFirestore(app);
const ABREV = {AV:"AV", BMS:"BMS", SDAI:"SDAI", SECURITY:"SEG"};

let usuarioAtual = null;
let perfilUsuario = null;
let appInicializado = false;
let clientes = [];
let clienteCarregadoId = null;
let clienteCarregadoKey = null;
let nProfs = 2, nAtv = 3, nFotos = 0;
let ultimoSistemaGlobal = "AV";
const fotosImgs = {};  // idx → dataURL
let detalhamentoEditor = null;
let detalhamentoEditorReady = null;

function mostrarAppContentCorretamente() {
  const el = document.getElementById("appContent");
  if (!el) return;
  el.style.display = "grid";
}


function atualizarMensagemFotosVazia() {
  const lista = document.getElementById("listaFotos");
  if (!lista) return;
  if (!lista.querySelector(".foto-card")) {
    lista.innerHTML = `<p class="foto-empty text-muted small text-center my-2">Nenhuma foto adicionada. Use <strong>Upload em Lote</strong> ou <strong>Foto</strong> para adicionar.</p>`;
  }
}


// ── Preview com zoom das fotos ────────────────────────────────────────────────
// Mostra a imagem em tamanho original ao parar o mouse sobre a miniatura.
// Use + / - ou a roda do mouse para aumentar/reduzir o zoom.
let fotoZoomScale = 1;
let fotoZoomHideTimer = null;
let fotoZoomOpenTimer = null;
const FOTO_ZOOM_DELAY_MS = 3000;

function garantirViewerZoomFoto() {
  let viewer = document.getElementById("fotoZoomViewer");
  if (viewer) return viewer;

  viewer = document.createElement("div");
  viewer.id = "fotoZoomViewer";
  viewer.className = "foto-zoom-viewer";
  viewer.innerHTML = `
    <div class="foto-zoom-topbar">
      <div>
        <strong><span class="material-icons">zoom_in</span> Visualizar foto</strong>
        <span id="fotoZoomInfo" class="foto-zoom-info"></span>
      </div>
      <div class="foto-zoom-actions">
        <button type="button" class="btn btn-sm btn-outline-light" id="fotoZoomMenos" title="Diminuir zoom">−</button>
        <button type="button" class="btn btn-sm btn-outline-light" id="fotoZoomReset" title="Voltar para 100%">100%</button>
        <button type="button" class="btn btn-sm btn-outline-light" id="fotoZoomMais" title="Aumentar zoom">+</button>
        <button type="button" class="btn btn-sm btn-outline-light" id="fotoZoomFechar" title="Fechar">×</button>
      </div>
    </div>
    <div class="foto-zoom-ajuda">
      Passe o mouse por 3 segundos na miniatura para abrir. Use a roda do mouse ou os botões para ajustar o zoom.
    </div>
    <div class="foto-zoom-imgwrap">
      <img id="fotoZoomImg" class="foto-zoom-img" alt="Preview da foto">
    </div>
  `;

  document.body.appendChild(viewer);

  const img = viewer.querySelector("#fotoZoomImg");
  const aplicar = () => {
    img.style.transform = `scale(${fotoZoomScale})`;
    viewer.querySelector("#fotoZoomReset").textContent = `${Math.round(fotoZoomScale * 100)}%`;
  };

  viewer.querySelector("#fotoZoomMais").addEventListener("click", () => {
    fotoZoomScale = Math.min(6, +(fotoZoomScale + 0.25).toFixed(2));
    aplicar();
  });

  viewer.querySelector("#fotoZoomMenos").addEventListener("click", () => {
    fotoZoomScale = Math.max(0.25, +(fotoZoomScale - 0.25).toFixed(2));
    aplicar();
  });

  viewer.querySelector("#fotoZoomReset").addEventListener("click", () => {
    fotoZoomScale = 1;
    aplicar();
  });

  viewer.querySelector("#fotoZoomFechar").addEventListener("click", esconderZoomFoto);

  viewer.addEventListener("mouseenter", () => {
    if (fotoZoomHideTimer) clearTimeout(fotoZoomHideTimer);
  });

  viewer.addEventListener("mouseleave", () => {
    agendarFechamentoZoomFoto();
  });

  viewer.addEventListener("wheel", (ev) => {
    ev.preventDefault();
    const delta = ev.deltaY < 0 ? 0.15 : -0.15;
    fotoZoomScale = Math.max(0.25, Math.min(6, +(fotoZoomScale + delta).toFixed(2)));
    aplicar();
  }, { passive: false });

  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") esconderZoomFoto();
  });

  return viewer;
}

function mostrarZoomFoto(src, titulo = "") {
  if (!src) return;

  const viewer = garantirViewerZoomFoto();
  const img = viewer.querySelector("#fotoZoomImg");
  const info = viewer.querySelector("#fotoZoomInfo");

  if (fotoZoomOpenTimer) clearTimeout(fotoZoomOpenTimer);
  if (fotoZoomHideTimer) clearTimeout(fotoZoomHideTimer);

  fotoZoomScale = 1;
  viewer.querySelector("#fotoZoomReset").textContent = "100%";
  img.style.transform = "scale(1)";
  img.src = src;
  info.textContent = titulo ? ` — ${titulo}` : "";

  img.onload = () => {
    const w = img.naturalWidth || 0;
    const h = img.naturalHeight || 0;
    info.textContent = `${titulo ? " — " + titulo : ""}${w && h ? ` — original: ${w}×${h}px` : ""}`;
  };

  viewer.style.display = "block";
  viewer.classList.add("show");
}

function esconderZoomFoto() {
  if (fotoZoomOpenTimer) clearTimeout(fotoZoomOpenTimer);
  const viewer = document.getElementById("fotoZoomViewer");
  if (!viewer) return;
  viewer.classList.remove("show");
  viewer.style.display = "none";
}

function agendarFechamentoZoomFoto() {
  if (fotoZoomHideTimer) clearTimeout(fotoZoomHideTimer);
  fotoZoomHideTimer = setTimeout(esconderZoomFoto, 250);
}

// Delegação: funciona para fotos criadas individualmente, em lote ou carregadas depois.
// No hover, espera 3 segundos antes de abrir o zoom para não atrapalhar a organização das fotos.
document.addEventListener("mouseover", (ev) => {
  const thumb = ev.target.closest?.(".foto-thumb");
  if (!thumb || thumb.classList.contains("d-none") || !thumb.src) return;

  if (fotoZoomOpenTimer) clearTimeout(fotoZoomOpenTimer);
  if (fotoZoomHideTimer) clearTimeout(fotoZoomHideTimer);

  const src = thumb.src;
  const card = thumb.closest(".foto-card");
  const titulo = card?.querySelector("strong")?.textContent?.trim() || "Foto";

  fotoZoomOpenTimer = setTimeout(() => {
    // Só abre se o mouse ainda estiver em cima da mesma miniatura.
    if (thumb.matches(":hover")) {
      mostrarZoomFoto(src, titulo);
    }
  }, FOTO_ZOOM_DELAY_MS);
});

document.addEventListener("mouseout", (ev) => {
  const thumb = ev.target.closest?.(".foto-thumb");
  if (!thumb) return;

  if (fotoZoomOpenTimer) clearTimeout(fotoZoomOpenTimer);

  const viewer = document.getElementById("fotoZoomViewer");
  if (viewer && viewer.contains(ev.relatedTarget)) return;
  agendarFechamentoZoomFoto();
});

document.addEventListener("click", (ev) => {
  const thumb = ev.target.closest?.(".foto-thumb");
  if (!thumb || thumb.classList.contains("d-none") || !thumb.src) return;

  if (fotoZoomOpenTimer) clearTimeout(fotoZoomOpenTimer);

  const card = thumb.closest(".foto-card");
  const titulo = card?.querySelector("strong")?.textContent?.trim() || "Foto";
  mostrarZoomFoto(thumb.src, titulo);
});


// ── Redimensionamento da lista de clientes ───────────────────────────────────
function initSidebarResizer() {
  const app = document.getElementById("appContent");
  const resizer = document.getElementById("rdpSidebarResizer");
  if (!app || !resizer || resizer.dataset.ready === "true") return;

  resizer.dataset.ready = "true";

  const saved = Number(localStorage.getItem("rdp-sidebar-width") || 330);
  if (saved >= 260 && saved <= 620) {
    document.documentElement.style.setProperty("--sidebar-w", `${saved}px`);
  }

  let dragging = false;

  const setWidth = (clientX) => {
    const rect = app.getBoundingClientRect();
    const width = Math.max(260, Math.min(620, clientX - rect.left));
    document.documentElement.style.setProperty("--sidebar-w", `${width}px`);
    localStorage.setItem("rdp-sidebar-width", String(Math.round(width)));
  };

  resizer.addEventListener("mousedown", (ev) => {
    dragging = true;
    document.body.classList.add("rdp-resizing");
    ev.preventDefault();
  });

  window.addEventListener("mousemove", (ev) => {
    if (!dragging) return;
    setWidth(ev.clientX);
  });

  window.addEventListener("mouseup", () => {
    if (!dragging) return;
    dragging = false;
    document.body.classList.remove("rdp-resizing");
  });

  resizer.addEventListener("dblclick", () => {
    document.documentElement.style.setProperty("--sidebar-w", "330px");
    localStorage.setItem("rdp-sidebar-width", "330");
  });
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
    perfilUsuario = snap.data() || {};

    document.getElementById("nomeUsuario").textContent = perfilUsuario.nome || user.email;

    if ((perfilUsuario.role || "user") === "admin") {
      document.getElementById("btnAdminUsuarios")?.classList.remove("d-none");
    }

    mostrarAppContentCorretamente();
  initSidebarResizer();

    if (!appInicializado) {
      initForm();
      appInicializado = true;
    }

    carregarClientes();
  } catch (e) {
    console.error("Falha na validação do login:", e);
    await signOut(auth);
    location.replace("index.html");
  }
});

window.sair = () => signOut(auth).then(() => location.href = "index.html");

function preencherModalPerfil() {
  if (!usuarioAtual || !perfilUsuario) return;
  setValor("perfilNome", perfilUsuario.nome || usuarioAtual.displayName || "");
  setValor("perfilFuncao", perfilUsuario.funcao || perfilUsuario.função || "");
  setValor("perfilEmail", usuarioAtual.email || perfilUsuario.email || "");
  setValor("perfilSenhaAtual", "");
  setValor("perfilNovaSenha", "");
  const msg = document.getElementById("msgPerfil");
  if (msg) {
    msg.textContent = "";
    msg.style.display = "none";
    msg.classList.remove("text-success");
    msg.classList.add("text-danger");
  }
}

window.abrirModalPerfil = function() {
  preencherModalPerfil();
  const el = document.getElementById("modalPerfil");
  if (!el || !window.M) return;
  const inst = M.Modal.getInstance(el) || M.Modal.init(el, { dismissible: true, opacity: 0.55 });
  inst.open();
};

function mostrarMsgPerfil(texto, tipo="erro") {
  const msg = document.getElementById("msgPerfil");
  if (!msg) return;
  msg.textContent = texto;
  msg.style.display = "block";
  msg.classList.toggle("text-danger", tipo !== "ok");
  msg.classList.toggle("text-success", tipo === "ok");
}

function traduzirErroPerfil(e) {
  const code = e?.code || "";
  if (code === "auth/wrong-password" || code === "auth/invalid-credential") return "Senha atual incorreta.";
  if (code === "auth/requires-recent-login") return "Por segurança, informe a senha atual e tente novamente.";
  if (code === "auth/email-already-in-use") return "Este e-mail já está em uso por outro usuário.";
  if (code === "auth/invalid-email") return "E-mail inválido.";
  if (code === "auth/weak-password") return "A nova senha é muito fraca. Use pelo menos 6 caracteres.";
  if (code === "permission-denied") return "O Firestore bloqueou a alteração. Atualize as regras para permitir que o usuário edite nome, e-mail e função.";
  return `${code || "erro"} - ${e?.message || "Não foi possível salvar o perfil."}`;
}

function dataAtualBR() {
  const hoje = new Date();
  const dd = String(hoje.getDate()).padStart(2, "0");
  const mm = String(hoje.getMonth() + 1).padStart(2, "0");
  const yyyy = hoje.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function setValor(id, valor) {
  const el = document.getElementById(id);
  if (el) el.value = valor ?? "";
}

function normalizarCodigoProjeto(codigo) {
  return String(codigo || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9_-]/g, "");
}

function montarClientKey(uid, codigo, sistema) {
  const codigoKey = normalizarCodigoProjeto(codigo);
  const sis = String(sistema || "AV").trim().toUpperCase();
  return `${uid}_${codigoKey}_${sis}`;
}

function atualizarEstadoBotoesCliente() {
  const btnAtualizar = document.getElementById("btnAtualizarCliente");
  const info = document.getElementById("clienteCarregadoInfo");

  if (btnAtualizar) {
    btnAtualizar.disabled = !clienteCarregadoId;
  }

  if (info) {
    if (clienteCarregadoId) {
      info.textContent = "Cliente carregado: você pode atualizar os dados desse cadastro.";
      info.classList.remove("text-muted");
      info.classList.add("text-info");
    } else {
      info.textContent = "Nenhum cliente carregado. Use Criar novo cliente para salvar este cadastro.";
      info.classList.remove("text-info");
      info.classList.add("text-muted");
    }
  }
}

function marcarClienteCarregado(cliente) {
  clienteCarregadoId = cliente?.id || null;
  clienteCarregadoKey = cliente?.clientKey || null;
  atualizarEstadoBotoesCliente();
}

function aplicarUsuarioNoFormulario() {
  const nome = perfilUsuario?.nome || usuarioAtual?.displayName || "";
  const funcao = perfilUsuario?.funcao || perfilUsuario?.função || "";

  setValor("profArq", nome);

  const primeiraLinha = document.querySelector(".prof-row");
  if (primeiraLinha) {
    const nomeEl = primeiraLinha.querySelector('[data-field="nome"]');
    const empresaEl = primeiraLinha.querySelector('[data-field="empresa"]');
    const funcaoEl = primeiraLinha.querySelector('[data-field="funcao"]');

    if (nomeEl) nomeEl.value = nome;
    if (empresaEl && !empresaEl.value) empresaEl.value = "Convergint";
    if (funcaoEl) funcaoEl.value = funcao;
  }
}

function limparFotos() {
  Object.keys(fotosImgs).forEach(k => delete fotosImgs[k]);
  const lista = document.getElementById("listaFotos");
  if (lista) lista.innerHTML = "";
  nFotos = 0;
  atualizarMensagemFotosVazia();
}

function limparLogo() {
  const input = document.getElementById("inputLogo");
  if (input) input.value = "";
  const img = document.getElementById("logoPreview");
  if (img) {
    img.src = "";
    img.classList.add("d-none");
  }
}

function limparEditorDetalhamento() {
  if (detalhamentoEditor) {
    detalhamentoEditor.value = "";
    return;
  }
  const el = document.getElementById("detalhamentoEditor");
  if (el) el.value = "";
}

window.novoRelatorio = function(confirmar = true) {
  if (confirmar && !confirm("Limpar a tela e iniciar um novo relatório com os valores padrões?")) return;

  ["listaProfissionais", "listaAtividades"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = "";
  });

  limparFotos();
  limparLogo();
  limparEditorDetalhamento();

  setValor("nomeCliente", "");
  setValor("codigo", "");
  setValor("data", dataAtualBR());
  setValor("sistema", "AV");
  setValor("contratante", "");
  setValor("obra", "");
  setValor("endereco", "");
  setValor("hIniPrev", "08:00");
  setValor("hIniReal", "08:00");
  setValor("hFimPrev", "17:00");
  setValor("hFimReal", "17:00");
  setValor("produtividade", "Produtivo");
  setValor("clima", "Bom");

  nProfs = 2;
  nAtv = 3;
  for (let i = 0; i < nProfs; i++) addProf(false);
  for (let i = 0; i < nAtv; i++) addAtv(false);

  ultimoSistemaGlobal = "AV";
  marcarClienteCarregado(null);
  aplicarUsuarioNoFormulario();
  atualizarPreviewNome();
};

// ── Init form ─────────────────────────────────────────────────────────────────
function initForm() {
  inicializarEditorDetalhamento();

  ["codigo", "data", "sistema", "profArq"].forEach(id =>
    document.getElementById(id)?.addEventListener("input", atualizarPreviewNome));

  document.getElementById("sistema")?.addEventListener("change", atualizarSistemaFotos);

  novoRelatorio(false);
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
      <select class="browser-default form-select form-select-sm" data-atv="${idx}" data-field="crit">
        <option>Alta</option><option>Média</option><option>Baixa</option>
      </select>
    </div>
    <div class="col-md-2">
      <select class="browser-default form-select form-select-sm" data-atv="${idx}" data-field="status">
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

function reconstruirMapaFotosPelaTela() {
  const novo = {};
  document.querySelectorAll(".foto-card").forEach((card, i) => {
    const oldIdx = Number(card.dataset.idx);
    const thumb = card.querySelector(".foto-thumb");
    const thumbSrc = thumb && !thumb.classList.contains("d-none") && thumb.src ? thumb.src : "";
    const oldSrc = Number.isFinite(oldIdx) ? (fotosImgs[oldIdx] || "") : "";
    const src = thumbSrc || oldSrc;
    if (src && src.startsWith("data:image/")) novo[i] = src;
  });

  Object.keys(fotosImgs).forEach(k => delete fotosImgs[k]);
  Object.assign(fotosImgs, novo);
}

function ativarDragFoto(card) {
  if (!card || card.dataset.dragReady === "true") return;
  card.dataset.dragReady = "true";
  card.setAttribute("draggable", "true");

  card.addEventListener("dragstart", (ev) => {
    card.classList.add("dragging");
    ev.dataTransfer.effectAllowed = "move";
    ev.dataTransfer.setData("text/plain", card.dataset.idx || "");
  });

  card.addEventListener("dragend", () => {
    card.classList.remove("dragging");
    document.querySelectorAll(".foto-card.drag-over").forEach(c => c.classList.remove("drag-over"));
    renumerarFotos();
  });

  card.addEventListener("dragover", (ev) => {
    ev.preventDefault();
    const dragging = document.querySelector(".foto-card.dragging");
    if (!dragging || dragging === card) return;
    card.classList.add("drag-over");
    ev.dataTransfer.dropEffect = "move";
  });

  card.addEventListener("dragleave", () => {
    card.classList.remove("drag-over");
  });

  card.addEventListener("drop", (ev) => {
    ev.preventDefault();
    card.classList.remove("drag-over");
    const dragging = document.querySelector(".foto-card.dragging");
    if (!dragging || dragging === card) return;

    const lista = document.getElementById("listaFotos");
    const cards = Array.from(lista.querySelectorAll(".foto-card"));
    const from = cards.indexOf(dragging);
    const to = cards.indexOf(card);

    if (from < to) {
      card.after(dragging);
    } else {
      card.before(dragging);
    }
    renumerarFotos();
  });
}

function renumerarFotos() {
  const cards = Array.from(document.querySelectorAll(".foto-card"));

  reconstruirMapaFotosPelaTela();

  cards.forEach((card, i) => {
    card.dataset.idx = String(i);
    ativarDragFoto(card);

    const titulo = card.querySelector(".foto-title");
    if (titulo) titulo.innerHTML = `<span class="material-icons">image</span> Foto ${i + 1}`;

    const badge = card.querySelector(".foto-num-badge");
    if (badge) badge.textContent = `Nº ${i + 1}`;

    card.querySelectorAll("[data-foto]").forEach(el => {
      el.dataset.foto = String(i);
    });

    const fileInput = card.querySelector('input[type="file"]');
    if (fileInput) fileInput.setAttribute("onchange", `carregarFoto(this,${i})`);

    const thumb = card.querySelector(".foto-thumb");
    if (thumb) thumb.id = `thumbFoto${i}`;

    const btnUp = card.querySelector('[data-foto-action="up"]');
    if (btnUp) {
      btnUp.setAttribute("onclick", `moverFoto(${i}, -1)`);
      btnUp.disabled = i === 0;
      btnUp.title = i === 0 ? "Esta foto já é a primeira" : "Mover foto para cima";
    }

    const btnDown = card.querySelector('[data-foto-action="down"]');
    if (btnDown) {
      btnDown.setAttribute("onclick", `moverFoto(${i}, 1)`);
      btnDown.disabled = i === cards.length - 1;
      btnDown.title = i === cards.length - 1 ? "Esta foto já é a última" : "Mover foto para baixo";
    }

    const btnDel = card.querySelector('[data-foto-action="delete"]');
    if (btnDel) btnDel.setAttribute("onclick", `excluirFoto(${i})`);
  });

  nFotos = cards.length;
  atualizarMensagemFotosVazia();
}

window.renumerarFotos = renumerarFotos;

window.excluirFoto = function(idx) {
  const cards = Array.from(document.querySelectorAll(".foto-card"));
  const card = cards[idx];
  if (!card) return;

  const temImagem = !!(card.querySelector(".foto-thumb")?.src) && !card.querySelector(".foto-thumb")?.classList.contains("d-none");
  const amb = card.querySelector('[data-field="amb"]')?.value?.trim() || "";
  const desc = card.querySelector('[data-field="desc"]')?.value?.trim() || "";

  const precisaConfirmar = temImagem || amb || desc;
  if (precisaConfirmar && !confirm(`Excluir a Foto ${idx + 1}?\n\nA numeração das próximas fotos será reajustada automaticamente.`)) return;

  card.remove();
  renumerarFotos();
};

window.moverFoto = function(idx, direcao) {
  const lista = document.getElementById("listaFotos");
  if (!lista) return;

  const cards = Array.from(lista.querySelectorAll(".foto-card"));
  const card = cards[idx];
  if (!card) return;

  if (direcao < 0 && idx > 0) {
    lista.insertBefore(card, cards[idx - 1]);
  }

  if (direcao > 0 && idx < cards.length - 1) {
    lista.insertBefore(cards[idx + 1], card);
  }

  renumerarFotos();
};

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
    <div class="foto-card-header d-flex justify-content-between align-items-center mb-2">
      <div class="d-flex align-items-center gap-2">
        <span class="foto-drag-handle" title="Arraste para reorganizar"><span class="material-icons">drag_indicator</span></span>
        <strong class="small foto-title"><span class="material-icons">image</span> Foto ${idx+1}</strong>
        <span class="badge text-bg-secondary foto-num-badge">Nº ${idx+1}</span>
      </div>
      <div class="foto-actions btn-group btn-group-sm" role="group" aria-label="Ações da foto">
        <button type="button" class="btn btn-outline-light foto-action-btn" data-foto-action="up"
                onclick="moverFoto(${idx}, -1)" title="Mover foto para cima">
          <span class="material-icons">keyboard_arrow_up</span>
        </button>
        <button type="button" class="btn btn-outline-light foto-action-btn" data-foto-action="down"
                onclick="moverFoto(${idx}, 1)" title="Mover foto para baixo">
          <span class="material-icons">keyboard_arrow_down</span>
        </button>
        <button type="button" class="btn btn-outline-danger foto-action-btn" data-foto-action="delete"
                onclick="excluirFoto(${idx})" title="Excluir esta foto">
          <span class="material-icons">delete</span>
        </button>
      </div>
    </div>
    <div class="row g-2 align-items-start">
      <div class="col-md-2">
        <label class="form-label small mb-1">Sistema</label>
        <select class="browser-default form-select form-select-sm foto-sis" data-foto="${idx}"
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
        <img id="thumbFoto${idx}" src="" class="mt-1 rounded d-none foto-thumb" title="Passe o mouse para ampliar. Clique para manter aberto.">
      </div>
    </div>`;
  listaFotos.appendChild(div);
  renumerarFotos();
};

window.remFoto = function() {
  const cards = document.querySelectorAll(".foto-card");
  if (cards.length <= 0) return;
  excluirFoto(cards.length - 1);
};

window.removerTodasFotos = function() {
  const qtd = document.querySelectorAll(".foto-card").length;
  if (!qtd) {
    alert("Não há fotos para remover.");
    return;
  }

  if (!confirm(`Remover todas as ${qtd} foto(s) do relatório?`)) return;

  limparFotos();
  renumerarFotos();
};


window.carregarFoto = function(input, idx) {
  if (!input.files[0]) return;
  const reader = new FileReader();
  reader.onload = e => {
    fotosImgs[idx] = e.target.result;
    const img = document.getElementById(`thumbFoto${idx}`);
    img.src = e.target.result; img.classList.remove("d-none");
    renumerarFotos();
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
        renumerarFotos();
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
    const thumb = card.querySelector(".foto-thumb");
    const img  = fotosImgs[i] || (thumb && !thumb.classList.contains("d-none") ? thumb.src : null);
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
    if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-icons">description</span> Baixar DOCX'; }
  }
};

// ── Clientes ──────────────────────────────────────────────────────────────────
function coletarDadosClienteBase() {
  const nomeCliente = document.getElementById("nomeCliente")?.value?.trim() || "";
  const codigo = document.getElementById("codigo")?.value?.trim() || "";
  const sistema = document.getElementById("sistema")?.value || "AV";
  const codigoKey = normalizarCodigoProjeto(codigo);
  const logo = document.getElementById("logoPreview")?.src || "";

  if (!nomeCliente) throw new Error("Informe o nome do cliente antes de salvar.");
  if (!codigo) throw new Error("Informe o código do projeto antes de salvar.");
  if (!codigoKey) throw new Error("O código do projeto precisa ter letras ou números.");

  const clientKey = montarClientKey(usuarioAtual.uid, codigo, sistema);

  return {
    userId: usuarioAtual.uid,
    clientKey,
    codigoKey,
    nomeCliente,
    codigo,
    sistema,
    contratante: document.getElementById("contratante")?.value?.trim() || "",
    obra:        document.getElementById("obra")?.value?.trim()        || "",
    endereco:    document.getElementById("endereco")?.value?.trim()    || "",
    logo:        logo.startsWith("data:") ? logo : "",
  };
}

window.criarNovoCliente = async function() {
  if (!usuarioAtual) return;

  try {
    const dadosBase = coletarDadosClienteBase();
    const ref = doc(db, "clientes", dadosBase.clientKey);
    const jaExiste = await getDoc(ref);

    if (jaExiste.exists()) {
      alert(
        "Já existe um cliente salvo com este mesmo Código de Projeto e Sistema.\n\n" +
        "Código: " + dadosBase.codigo + "\n" +
        "Sistema: " + dadosBase.sistema + "\n\n" +
        "Carregue esse cliente e use o botão Atualizar dados do cliente carregado."
      );
      return;
    }

    const dados = {
      ...dadosBase,
      criado: new Date().toISOString(),
      atualizado: new Date().toISOString(),
    };

    await setDoc(ref, dados);
    marcarClienteCarregado({ id: dadosBase.clientKey, ...dados });
    await carregarClientes();
    alert("✅ Novo cliente criado!");
  } catch (e) {
    console.error("ERRO AO CRIAR CLIENTE:", e);
    alert(e.message || "Erro ao criar cliente.");
  }
};

window.atualizarClienteCarregado = async function() {
  if (!usuarioAtual) return;
  if (!clienteCarregadoId) {
    alert("Nenhum cliente carregado. Clique em Carregar em um cliente salvo ou use Criar novo cliente.");
    return;
  }

  try {
    const dadosBase = coletarDadosClienteBase();

    if (!clienteCarregadoKey) {
      alert("Este cliente foi salvo em uma versão antiga e ainda não possui chave única. Use Criar novo cliente para salvar no novo padrão Código + Sistema.");
      return;
    }

    if (dadosBase.clientKey !== clienteCarregadoKey) {
      alert(
        "Você alterou o Código do Projeto ou o Sistema.\n\n" +
        "Como Código + Sistema formam a chave única do cliente, use Criar novo cliente para salvar essa nova combinação."
      );
      return;
    }

    const ref = doc(db, "clientes", clienteCarregadoId);
    const dados = {
      ...dadosBase,
      atualizado: new Date().toISOString(),
    };

    await updateDoc(ref, dados);
    await carregarClientes();
    marcarClienteCarregado({ id: clienteCarregadoId, ...dados });
    alert("✅ Dados do cliente carregado atualizados!");
  } catch (e) {
    console.error("ERRO AO ATUALIZAR CLIENTE:", e);
    if (e.code === "permission-denied") {
      alert("O Firestore bloqueou a atualização. Publique as regras atualizadas que acompanham este pacote.");
    } else {
      alert(e.message || "Erro ao atualizar cliente.");
    }
  }
};

// Compatibilidade com botão antigo, se existir em cache.
window.salvarCliente = window.criarNovoCliente;

async function carregarClientes() {
  if (!usuarioAtual) return;
  const q = query(collection(db, "clientes"), where("userId","==",usuarioAtual.uid));
  const snap = await getDocs(q);
  clientes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderClientes();
}

function escapeHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderClientes(filtro="") {
  const lista = document.getElementById("listaClientes");
  if (!lista) return;

  const termo = filtro.toLowerCase();
  const filtrados = filtro
    ? clientes.filter(c => `${c.nomeCliente || ""} ${c.obra || ""} ${c.codigo || ""} ${c.sistema || ""}`.toLowerCase().includes(termo))
    : clientes;

  if (!filtrados.length) {
    lista.innerHTML = `<p class="text-muted small text-center mt-2">Nenhum cliente encontrado.</p>`;
    return;
  }

  lista.innerHTML = filtrados.map(c => {
    const nome = escapeHtml(c.nomeCliente || "Sem nome");
    const codigo = escapeHtml(c.codigo || "Sem código");
    const sistema = escapeHtml(c.sistema || "Sem sistema");
    const obra = escapeHtml(c.obra || "");
    const carregado = c.id === clienteCarregadoId ? "cliente-carregado" : "";

    return `
      <div class="cliente-item ${carregado}">
        <div class="cliente-item-main">
          ${c.logo ? `<img src="${c.logo}" class="cliente-logo" alt="Logo">` : ""}
          <div class="cliente-info">
            <div class="cliente-nome">${nome}</div>
            <div class="cliente-meta">
              <span class="cliente-codigo">${codigo}</span>
              <span class="cliente-sistema">${sistema}</span>
              ${obra ? `<span class="cliente-obra">${obra}</span>` : ""}
            </div>
          </div>
        </div>

        <div class="cliente-actions">
          <button class="rdp-btn rdp-btn-success cliente-btn" onclick="carregarClienteForm('${c.id}')" title="Carregar cliente">
            <span class="material-icons">download</span>
            Carregar
          </button>
          <button class="rdp-btn rdp-btn-danger cliente-btn-icon" onclick="excluirCliente('${c.id}')" title="Excluir cliente">
            <span class="material-icons">delete</span>
          </button>
        </div>
      </div>
    `;
  }).join("");
}

window.filtrarClientes = v => {
  const lista = document.getElementById("listaClientes");
  if (lista) lista.dataset.filtro = v || "";
  renderClientes(v);
};

window.carregarClienteForm = function(id) {
  const c = clientes.find(x => x.id === id);
  if (!c) return;
  setValor("nomeCliente", c.nomeCliente || "");
  setValor("codigo",      c.codigo      || "");
  setValor("sistema",     c.sistema     || "AV");
  setValor("contratante", c.contratante || "");
  setValor("obra",        c.obra        || "");
  setValor("endereco",    c.endereco    || "");

  if (c.logo) {
    const img = document.getElementById("logoPreview");
    img.src = c.logo;
    img.classList.remove("d-none");
  } else {
    limparLogo();
  }

  ultimoSistemaGlobal = c.sistema || "AV";
  atualizarSistemaFotos();
  atualizarPreviewNome();
  marcarClienteCarregado(c);
  renderClientes(document.querySelector('#listaClientes')?.dataset?.filtro || "");
};

window.excluirCliente = async function(id) {
  if (!confirm("Excluir cliente?")) return;
  await deleteDoc(doc(db, "clientes", id));
  if (clienteCarregadoId === id) marcarClienteCarregado(null);
  await carregarClientes();
};

// ── Alterar senha ─────────────────────────────────────────────────────────────
window.salvarMeuPerfil = async function() {
  if (!usuarioAtual) return;

  const btn = document.getElementById("btnSalvarPerfil");
  const nome = (document.getElementById("perfilNome")?.value || "").trim();
  const funcao = (document.getElementById("perfilFuncao")?.value || "").trim();
  const emailNovo = (document.getElementById("perfilEmail")?.value || "").trim();
  const senhaAtual = document.getElementById("perfilSenhaAtual")?.value || "";
  const novaSenha = document.getElementById("perfilNovaSenha")?.value || "";
  const emailAtual = usuarioAtual.email || "";

  if (!nome) { mostrarMsgPerfil("Informe o nome completo."); return; }
  if (!emailNovo) { mostrarMsgPerfil("Informe o e-mail."); return; }
  if (novaSenha && novaSenha.length < 6) { mostrarMsgPerfil("A nova senha deve ter pelo menos 6 caracteres."); return; }

  const vaiTrocarEmail = emailNovo.toLowerCase() !== emailAtual.toLowerCase();
  const vaiTrocarSenha = !!novaSenha;

  if ((vaiTrocarEmail || vaiTrocarSenha) && !senhaAtual) {
    mostrarMsgPerfil("Informe a senha atual para alterar e-mail ou senha.");
    return;
  }

  const oldHtml = btn?.innerHTML;
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="preloader-wrapper active tiny-spinner"></span> Salvando...`;
  }

  try {
    if (vaiTrocarEmail || vaiTrocarSenha) {
      const cred = EmailAuthProvider.credential(emailAtual, senhaAtual);
      await reauthenticateWithCredential(usuarioAtual, cred);
    }

    if (vaiTrocarEmail) {
      await updateEmail(usuarioAtual, emailNovo);
    }

    if (vaiTrocarSenha) {
      await updatePassword(usuarioAtual, novaSenha);
    }

    await updateProfile(usuarioAtual, { displayName: nome });

    await updateDoc(doc(db, "usuarios", usuarioAtual.uid), {
      nome,
      funcao,
      email: emailNovo
    });

    perfilUsuario = {
      ...perfilUsuario,
      nome,
      funcao,
      email: emailNovo
    };

    document.getElementById("nomeUsuario").textContent = nome || emailNovo;
    aplicarUsuarioNoFormulario();
    atualizarPreviewNome();

    mostrarMsgPerfil("Perfil atualizado com sucesso.", "ok");

    setTimeout(() => {
      const el = document.getElementById("modalPerfil");
      const modal = window.M && el ? M.Modal.getInstance(el) : null;
      modal?.close();
    }, 700);

  } catch(e) {
    console.error("ERRO AO SALVAR PERFIL:", e);
    mostrarMsgPerfil(traduzirErroPerfil(e));
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = oldHtml;
    }
  }
};


// ── Inicialização Materialize após carregamentos dinâmicos ───────────────────
function rdpRefreshMaterialize() {
  try {
    if (!window.M) return;
    M.updateTextFields?.();
    document.querySelectorAll('.modal').forEach(el => {
      if (!M.Modal.getInstance(el)) M.Modal.init(el, { dismissible: true, opacity: 0.55 });
    });
  } catch (e) {
    console.warn('Materialize refresh:', e);
  }
}
document.addEventListener('DOMContentLoaded', rdpRefreshMaterialize);
