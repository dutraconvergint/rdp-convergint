# 📋 RDP Web – Relatório Diário de Programação

![Status](https://img.shields.io/badge/status-em%20uso-success)
![Update](https://img.shields.io/badge/update-v1.7.0-blue)
![Firebase](https://img.shields.io/badge/backend-Firebase-orange)
![Docxtemplater](https://img.shields.io/badge/DOCX-Docxtemplater-green)
![Editor](https://img.shields.io/badge/editor-Jodit-purple)

Sistema web para preenchimento, organização e geração de **Relatórios Diários de Programação (RDP)**, com autenticação de usuários, cadastro de clientes/projetos e geração de documento `.docx` baseado em modelo padronizado.

---

## 🔗 Página de acesso

Acesse a aplicação pelo link:

**https://dutraconvergint.github.io/rdp-convergint/index.html**

---

## 🔐 Acesso ao sistema

O acesso é restrito a usuários previamente cadastrados.

Para utilizar o sistema, é necessário solicitar o cadastro ao **administrador da aplicação**. O usuário somente conseguirá acessar após o administrador criar e ativar o cadastro.

### Dados necessários para cadastro

Ao solicitar acesso, informe:

- Nome completo
- E-mail de acesso
- Função

---

## 🎯 Propósito da aplicação

A aplicação foi criada para facilitar o preenchimento e a padronização dos Relatórios Diários de Programação, reduzindo retrabalho, erros de formatação e divergência entre modelos de documento.

O sistema centraliza os dados básicos de clientes, projetos, sistema, usuários e logos, permitindo gerar um RDP em formato `.docx` com aparência padronizada e pronto para uso operacional.

---

## 🚀 Nível atual de update

### Versão atual: **v1.7.0**

Esta versão contempla melhorias importantes de usabilidade, segurança e padronização do relatório.

### Principais recursos da versão

- Login com Firebase Authentication
- Controle de acesso por usuário ativo/inativo
- Perfis de usuário comum e administrador
- Tela principal para preenchimento do RDP
- Painel administrativo para cadastro e edição de usuários
- Campo de função no cadastro do usuário
- Perfil do próprio usuário editável
- Editor de texto avançado no detalhamento das atividades
- Geração de arquivo `.docx` com Docxtemplater
- Inserção de logo do cliente no documento
- Inserção de fotos no relatório fotográfico
- Cadastro de clientes/projetos no Firestore
- Bloqueio para evitar duplicidade de cliente por código de projeto e sistema
- Salvamento do sistema junto aos dados do cliente
- Interface em modo escuro
- Botão para iniciar novo relatório com valores padrões

---

## 🧩 Funções disponíveis

### 👤 Usuário comum

O usuário comum pode:

- Acessar a tela de preenchimento do RDP
- Criar um novo relatório
- Carregar dados de clientes/projetos já cadastrados
- Criar novo cliente/projeto
- Atualizar dados do cliente carregado
- Preencher cabeçalho do relatório
- Inserir profissionais envolvidos
- Inserir atividades realizadas
- Inserir fotos no relatório fotográfico
- Adicionar sistema, ambiente e texto explicativo das imagens
- Preencher detalhamento das atividades com editor avançado
- Gerar o relatório em formato `.docx`
- Atualizar os próprios dados de perfil:
  - Nome completo
  - E-mail
  - Senha
  - Função

---

### 🛡️ Administrador

O administrador pode:

- Acessar a tela principal do RDP
- Abrir a área de cadastro de usuários
- Criar novos usuários
- Editar dados de usuários
- Definir perfil de usuário:
  - `admin`
  - `user`
- Ativar ou desativar usuários
- Alterar nome completo, função, perfil e status do usuário
- Gerenciar permissões de acesso ao sistema

---

## 📝 Preenchimento do RDP

A tela de preenchimento permite informar:

- Cliente / Projeto
- Código do projeto
- Data do relatório
- Sistema
- Nome do profissional
- Contratante
- Obra
- Endereço
- Horário previsto
- Horário real
- Condição climática
- Produtividade do dia
- Profissionais envolvidos
- Atividades realizadas
- Fotos com descrição
- Detalhamento das atividades

A data é preenchida automaticamente com a data atual.

Os horários padrão são:

| Campo | Valor padrão |
|---|---|
| Início previsto | 08:00 |
| Início real | 08:00 |
| Término previsto | 17:00 |
| Término real | 17:00 |

---

## 🖼️ Relatório fotográfico

O relatório permite adicionar múltiplas fotos conforme a necessidade.

Cada foto pode conter:

- Número automático
- Sistema
- Ambiente
- Imagem
- Texto explicativo

O sistema da foto é preenchido automaticamente com base no sistema selecionado no cabeçalho, mas pode ser alterado individualmente.

As imagens são ajustadas para caber no espaço padrão da tabela do documento.

---

## ✍️ Editor de detalhamento das atividades

O campo de detalhamento utiliza um editor online avançado com recursos semelhantes a um editor de texto.

Recursos disponíveis:

- Negrito
- Itálico
- Sublinhado
- Listas com tópicos
- Listas numeradas
- Tabelas
- Alinhamento
- Links
- Colagem de texto formatado
- Edição em tela cheia

---

## 💾 Cadastro de clientes

Os dados de cliente/projeto são salvos no Firestore.

O sistema utiliza como chave lógica:

```text
Código do Projeto + Sistema + Usuário
```

Isso evita duplicidade de cadastro para o mesmo usuário, mesmo código de projeto e mesmo sistema.

Exemplo:

```text
PRJ00001 + AV
PRJ00001 + BMS
```

Nesse exemplo, os dois podem existir porque são sistemas diferentes.

---

## 🔒 Segurança

A aplicação utiliza:

- Firebase Authentication para login
- Firestore Security Rules para controle de acesso aos dados
- Controle de usuário ativo/inativo
- Restrição de leitura e escrita por usuário autenticado
- Permissão administrativa para gerenciamento de usuários

O arquivo `config.js` contém apenas as informações públicas de conexão do Firebase Web App. A segurança real da aplicação depende das regras do Firestore e do controle de autenticação.

---

## 🗂️ Estrutura principal do projeto

```text
/
├── index.html
├── app.html
├── admin.html
├── template_rdp.docx
├── README.md
├── js/
│   ├── config.js
│   ├── app.js
│   └── report.js
└── css/
    └── style.css
```

---

## ⚙️ Tecnologias utilizadas

- HTML
- CSS
- JavaScript
- Firebase Authentication
- Firebase Firestore
- Docxtemplater
- PizZip
- Jodit Editor
- Bootstrap
- GitHub Pages

---

## 📄 Geração do documento

O relatório é gerado em formato `.docx` utilizando o modelo:

```text
template_rdp.docx
```

A geração do documento utiliza o **Docxtemplater** para preencher os campos do modelo e montar o relatório com os dados informados na tela.

---

## 🧭 Fluxo básico de uso

1. O usuário acessa a página de login.
2. Informa e-mail e senha.
3. O sistema valida se o usuário está cadastrado e ativo.
4. A tela principal do RDP é carregada.
5. O usuário preenche ou carrega os dados do cliente.
6. Adiciona atividades, fotos e detalhamento.
7. Gera o arquivo `.docx`.

---

## 🆘 Problemas de acesso

Caso não consiga entrar no sistema, verifique:

- Se o e-mail foi digitado corretamente
- Se a senha está correta
- Se o usuário foi criado no Firebase Authentication
- Se o usuário existe na coleção `usuarios`
- Se o campo `ativo` está como `true`
- Se o cadastro foi liberado pelo administrador

Se o problema continuar, solicite suporte ao administrador do sistema.

---

## 📌 Observações importantes

- O sistema depende de conexão com a internet.
- O acesso é permitido apenas para usuários cadastrados.
- Usuários inativos não conseguem acessar a aplicação.
- A exclusão completa de usuários do Firebase Authentication deve ser feita pelo administrador diretamente no Firebase Console ou por backend administrativo.
- O documento gerado deve ser revisado antes de envio oficial.

---

## 🏷️ Histórico resumido de updates

### v1.7.0
- Cadastro de cliente com bloqueio por código de projeto e sistema
- Sistema salvo junto aos dados do cliente
- Botão para criar novo cliente
- Botão para atualizar cliente carregado

### v1.6.0
- Perfil do próprio usuário editável
- Alteração de nome, e-mail, senha e função pelo usuário

### v1.5.0
- Editor Jodit no detalhamento das atividades
- Suporte a tabelas no detalhamento
- Melhorias na geração do DOCX

### v1.4.0
- Campo função no cadastro de usuários
- Nome e função preenchidos automaticamente no RDP
- Login redirecionando todos os usuários para a tela app

### v1.3.0
- Administração de usuários
- Edição de usuários
- Controle de ativo/inativo

### v1.2.0
- Geração de RDP em DOCX
- Inserção de logo e fotos

### v1.0.0
- Login inicial
- Tela de preenchimento do RDP
- Firebase Authentication e Firestore
