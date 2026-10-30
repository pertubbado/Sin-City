# Sin City Roleplay — Central de Regras

Projeto independente de portal de regras da **Sin City Roleplay**, com identidade visual Halloween em tons de roxo.

## Estrutura do repositório

O repositório `pertubbado/Sin-City` utiliza a mesma organização já testada no projeto anterior: o workflow fica diretamente na raiz e o projeto do site fica dentro da pasta `Sin-City-Regras`.

```text
Sin-City/
├── .github/
│   └── workflows/
│       └── deploy.yml
└── Sin-City-Regras/
    ├── docs/
    ├── site/
    ├── .gitignore
    ├── README.md
    ├── package.json
    └── gerar_regras.py
```

- `.github/workflows/deploy.yml`: publicação automática no GitHub Pages. Deve ficar na raiz do repositório, fora de `Sin-City-Regras/`.
- `site/`: arquivos publicados pelo GitHub Pages.
- `site/index.html`: página pública.
- `site/editor.html`: editor visual com pré-visualização e publicação via API do GitHub.
- `site/app.js` e `site/style.css`: aplicação e estilos locais.
- `site/content/site.json`: identidade visual e configurações do portal.
- `site/rules.json` e `site/content/rules.json`: dados das nove categorias e 57 capítulos.
- `site/assets/`: logo, cursor de abóbora, cenário vetorial complementar e fundo cinematográfico de cemitério em WebP.
- `docs/`: capítulos Markdown usados como fonte para reconstruir os dados.
- `gerar_regras.py`: sincroniza `docs/` com os dois arquivos JSON de regras.

## Publicação no GitHub Pages

1. O repositório utilizado é `pertubbado/Sin-City`, na branch `main`. A conta proprietária continua sendo `pertubbado`.
2. Envie o conteúdo deste ZIP preservando a estrutura: a pasta `.github/` vai para a raiz do repositório e a pasta `Sin-City-Regras/` também vai para a raiz.
3. Não coloque `.github/` dentro de `Sin-City-Regras/`. O caminho do workflow deve ser exatamente `.github/workflows/deploy.yml`.
4. Em **Settings → Pages → Build and deployment**, selecione **GitHub Actions** como fonte.
5. Acesse **Actions** e acompanhe o workflow **Deploy Sin City Roleplay**. Ele valida os JSON e publica `Sin-City-Regras/site/`.

Endereços após o primeiro deploy:

- Site: `https://pertubbado.github.io/Sin-City/`
- Editor: `https://pertubbado.github.io/Sin-City/editor.html`

O workflow publica somente arquivos que já estão no repositório. Não baixa CSS, JavaScript, imagens ou uploads de projetos antigos.

## Editor visual e token do GitHub

Abra `https://pertubbado.github.io/Sin-City/editor.html` depois da primeira publicação. Para publicar pelo editor:

1. Clique em **Conectar GitHub**.
2. Crie um *Fine-grained personal access token* para o proprietário `pertubbado`.
3. Em **Repository access**, escolha **Only select repositories** e marque apenas `Sin-City`.
4. Em **Repository permissions**, conceda somente **Contents: Read and write**.
5. Cole o token no editor. Ele fica na sessão do navegador e não está gravado nos arquivos do projeto.

Nunca coloque o token no código, no ZIP, em commits ou em mensagens. O editor altera os arquivos JSON de conteúdo e configuração nos caminhos corretos dentro de `Sin-City-Regras/`; a publicação do site é executada pelo GitHub Actions.

## Atualização das regras

A edição diária pode ser feita pelo Editor Visual. Para reconstruir os JSON a partir dos arquivos Markdown de `docs/`, execute `python gerar_regras.py` dentro da pasta `Sin-City-Regras` e envie os arquivos resultantes. **Não execute o gerador depois de editar apenas pelo editor sem antes sincronizar os Markdown**, pois `docs/` e o editor são duas formas distintas de editar o conteúdo.

## Identidade visual

- Principal: `#542287`
- Principal clara: `#AF7AFF`
- Fundo: `#212121`
- Superfície: `#111111`
- Texto: `#FFFFFF`
- Texto secundário configurado: `#542287` (o renderizador usa um tom claro para preservar a legibilidade em textos pequenos).

O cursor de abóbora e o rastro roxo são desativados em dispositivos de toque e quando o usuário prefere movimento reduzido.
