# Bridal Store – Gestão Inteligente
ERP para loja de noivas e trajes (Noiva & Cia. by Adriana Leal): estoque, aluguel com calendário e checagem de conflitos, vendas (PDV), caixa, contas a pagar/receber, clientes, agenda, relatórios (Excel/PDF), usuários e permissões, notificações. HTML + CSS + JS puros, instalável como app (PWA), banco de dados em **Google Sheets**.

**Login inicial:** usuário `admin` · senha `Joaocruz1950@` (altere em Usuários depois, se quiser).

## 1. Banco de dados no Google Sheets (5 min)
1. Crie uma planilha em sheets.google.com (ex.: "Bridal Store – Banco de Dados").
2. Menu **Extensões → Apps Script**. Apague o conteúdo e cole `apps-script/Code.gs`.
3. Troque `TOKEN` por uma senha longa só sua. Salve.
4. Execute a função **setup** (▶) uma vez e autorize (Planilhas e Drive).
5. **Implantar → Nova implantação → App da Web** · Executar como: *Eu* · Quem tem acesso: *Qualquer pessoa* → copie a URL `/exec`.
6. Abra `js/config.js` e preencha `SCRIPT_URL` e `TOKEN` (iguais aos do passo 3 e 5). *(Ou cole dentro do app em Configurações → Google Sheets.)*

Fotos e comprovantes vão automaticamente para a pasta `BridalStore_Arquivos` no seu Drive. Cada módulo vira uma aba da planilha.
> Se alterar o Code.gs depois, use **Implantar → Gerenciar implantações → Editar → Nova versão**.

## 2. Publicar no GitHub Pages
1. Crie um repositório e envie **todo o conteúdo desta pasta** (index.html, manifest.json, sw.js, css, js, assets, icons).
2. Settings → Pages → Branch `main` / root → Save. O app abre em `https://SEU-USUARIO.github.io/NOME-DO-REPO/`.

## 3. Instalar como aplicativo
Abra o site no Chrome/Edge (computador ou Android) → botão **Instalar app** no topo (ou menu ⋮ → Instalar). No iPhone: Safari → Compartilhar → *Adicionar à Tela de Início*. O `manifest.json` já está configurado.

## Como funciona
- Dados ficam no navegador (funciona offline) e sincronizam sozinhos com a planilha (indicador no topo). Vários dispositivos veem os mesmos dados.
- Backup: Configurações → baixar JSON, restaurar, ou criar cópia da planilha no Drive.
- Perfis: Administrador (tudo), Gerente (financeiro, estoque, relatórios), Vendedor (vendas, clientes, aluguéis), Financeiro (caixa, contas) — com permissões individuais.
- Configurações → "Carregar dados de exemplo" para testar.

## Segurança (importante)
O login protege o uso do sistema, mas como o app é estático, a verificação roda no navegador. Para proteger os dados de verdade: use um **TOKEN longo**, mantenha o **repositório privado** (GitHub Pages privado exige plano pago) ou, no mínimo, não divulgue a URL do Apps Script. Troque a senha do admin após a implantação.
