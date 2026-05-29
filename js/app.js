// js/app.js
import { initializeApp }   from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut,
         updatePassword, reauthenticateWithCredential, EmailAuthProvider }
  from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc,
         doc, query, where, getDoc }
  from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { FIREBASE_CONFIG } from "./config.js";
import { gerarHTML, gerarDOCX } from "./report.js";

const app  = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db   = getFirestore(app);
const ABREV = {AV:"AV", BMS:"BMS", SDAI:"SDAI", SECURITY:"SEG"};

let usuarioAtual = null;
let clientes = [];
let nProfs = 2, nAtv = 3, nFotos = 2;
const fotosImgs = {};  // idx → dataURL

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
  for (let i = 0; i < nFotos; i++) addFoto(false);
  atualizarPreviewNome();
  ["codigo","data","sistema","profArq"].forEach(id =>
    document.getElementById(id)?.addEventListener("input", atualizarPreviewNome));
  document.getElementById("sistema")?.addEventListener("change", atualizarSistemaFotos);
}

function atualizarPreviewNome() {
  const cod    = (document.getElementById("codigo")?.value||"PRJXXXXX").trim();
  const data   = document.getElementById("data")?.value||"";
  const sis    = document.getElementById("sistema")?.value||"AV";
  const prof   = (document.getElementById("profArq")?.value||"").replace(/ /g,"_")||"Nome_Profissional";
  let iso = data;
  try { const p=data.split("/"); iso=`${p[2]}-${p[1]}-${p[0]}`; } catch{}
  document.getElementById("previewNome").textContent =
    `📄 ${cod}_${iso}_RDP_(${ABREV[sis]||sis})_${prof}.pdf`;
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
  const div = document.createElement("div");
  div.className = "foto-card border rounded p-2 mb-2";
  div.innerHTML = `
    <strong class="d-block mb-2 small">Foto ${idx+1}</strong>
    <div class="row g-2 align-items-start">
      <div class="col-md-2">
        <select class="form-select form-select-sm foto-sis" data-foto="${idx}">
          ${["AV","BMS","SDAI","SECURITY"].map(s =>
            `<option${s===sis?" selected":""}>${s}</option>`).join("")}
        </select>
      </div>
      <div class="col-md-3">
        <input class="form-control form-control-sm" placeholder="Ambiente"
               data-foto="${idx}" data-field="amb">
      </div>
      <div class="col-md-3">
        <textarea class="form-control form-control-sm" rows="2"
                  placeholder="Descrição" data-foto="${idx}" data-field="desc"></textarea>
      </div>
      <div class="col-md-4">
        <input type="file" class="form-control form-control-sm" accept="image/*"
               onchange="carregarFoto(this,${idx})">
        <img id="thumbFoto${idx}" src="" class="mt-1 rounded d-none"
             style="max-height:70px;max-width:100%">
      </div>
    </div>`;
  document.getElementById("listaFotos").appendChild(div);
};

window.remFoto = function() {
  const cards = document.querySelectorAll(".foto-card");
  if (cards.length <= 1) return;
  const last = cards.length - 1;
  delete fotosImgs[last];
  cards[last].remove();
  nFotos = document.querySelectorAll(".foto-card").length;
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

window.atualizarSistemaFotos = function() {
  const sis = document.getElementById("sistema")?.value || "AV";
  document.querySelectorAll(".foto-sis").forEach(sel => sel.value = sis);
  atualizarPreviewNome();
};

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
    logo:          document.getElementById("logoPreview")?.src || "",
    nomeCliente:   document.getElementById("nomeCliente")?.value?.trim() || "",
    codigo:        document.getElementById("codigo")?.value?.trim()      || "",
    data:          document.getElementById("data")?.value?.trim()        || "",
    sistema:       sis,
    profArq:       (document.getElementById("profArq")?.value?.trim() || "").replace(/ /g,"_"),
    contratante:   document.getElementById("contratante")?.value?.trim() || "",
    obra:          document.getElementById("obra")?.value?.trim()        || "",
    endereco:      document.getElementById("endereco")?.value?.trim()    || "",
    hIniPrev:      document.getElementById("hIniPrev")?.value  || "08:30",
    hIniReal:      document.getElementById("hIniReal")?.value  || "",
    hFimPrev:      document.getElementById("hFimPrev")?.value  || "18:00",
    hFimReal:      document.getElementById("hFimReal")?.value  || "",
    produtividade: document.getElementById("produtividade")?.value || "Produtivo",
    clima:         document.getElementById("clima")?.value         || "Bom",
    detalhamento:  document.getElementById("detalhamento")?.value  || "",
    profissionais, atividades, fotos,
  };
}

// ── Gerar relatório PDF ────────────────────────────────────────────────────────
window.gerarRelatorio = function() {
  const dados = coletarDados();
  const html  = gerarHTML(dados);
  const win   = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 800);
};

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
