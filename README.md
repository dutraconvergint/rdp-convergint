# RDP – Relatório Diário de Programação

App web puro (HTML/JS) hospedado no **GitHub Pages**.
Autenticação e dados via **Firebase** (gratuito).

---

## 1. Criar projeto no Firebase (5 minutos)

1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. **Criar projeto** → dê um nome (ex: `rdp-convergint`)
3. No painel do projeto:
   - **Authentication** → Começar → Ativar **E-mail/senha**
   - **Firestore** → Criar banco → Modo produção → escolha região
4. **Configurações do projeto** (ícone ⚙️) → Seus apps → Adicionar app Web
5. Copie o objeto `firebaseConfig`

---

## 2. Configurar o app

Edite o arquivo `js/config.js` e cole as configurações copiadas:

```js
export const FIREBASE_CONFIG = {
  apiKey:            "AIza...",
  authDomain:        "rdp-convergint.firebaseapp.com",
  projectId:         "rdp-convergint",
  storageBucket:     "rdp-convergint.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123...",
};
```

---

## 3. Configurar regras do Firestore

No Firebase Console → Firestore → **Regras**, cole:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Usuários: leitura pública (para verificar role/ativo), escrita só admin
    match /usuarios/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
        && get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.role == 'admin';
    }

    // Clientes: cada usuário vê/edita apenas os seus
    match /clientes/{docId} {
      allow read, write: if request.auth != null
        && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null
        && request.resource.data.userId == request.auth.uid;
    }
  }
}
```

---

## 4. Criar o primeiro admin

No Firebase Console → **Authentication** → Adicionar usuário:
- E-mail: `admin@suaempresa.com`
- Senha: (escolha uma)

Depois no **Firestore** → Dados → Criar coleção `usuarios` → Adicionar documento:
- **Document ID**: cole o UID do usuário criado (aparece em Authentication)
- Campos:
  ```
  nome:  "Administrador"
  email: "admin@suaempresa.com"
  role:  "admin"
  ativo: true
  ```

---

## 5. Publicar no GitHub Pages

1. Crie um repositório chamado **`rdp-convergint.github.io`**
2. Suba todos os arquivos para a branch `main`
3. Settings → Pages → Source: `main` → `/root`
4. Aguarde ~1 minuto

✅ App disponível em: **`https://rdp-convergint.github.io`**

---

## Como funciona

| Página | URL | Acesso |
|--------|-----|--------|
| Login  | `/` | Público |
| Relatório | `/app.html` | Usuários autenticados |
| Admin | `/admin.html` | Apenas administradores |

**Painel Admin** (`/admin.html`):
- Criar usuários (nome, e-mail, senha, perfil)
- Ativar/desativar usuário
- Enviar link de redefinição de senha
- Excluir usuário

**Dados salvos por usuário** (Firestore):
- Logo do cliente (base64)
- Nome do cliente, código, contratante, obra, endereço

**Relatório**: gerado como HTML em nova aba → botão **🖨️ Salvar / Imprimir como PDF** → `Ctrl+P` → Salvar como PDF (sem janela de impressão extra, layout A4 automático)
