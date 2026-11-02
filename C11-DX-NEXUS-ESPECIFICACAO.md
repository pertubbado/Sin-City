# DX NEXUS — C11

## Reinvenção Visual e Operacional do Studio

**Identidade:** DX
**Codinome:** DX NEXUS
**Branch de desenvolvimento:** `feat/c11-dx-nexus-studio`
**Base congelada inicial:** `1e47bb846747a83fd27bc5005fe60e51505aaa29`

---

## 1. Objetivo

Transformar o atual Sin City Editor em um Studio mais completo, visual, modular e confortável para criação de conteúdo, sem perder nenhuma funcionalidade já estabilizada nas etapas anteriores.

O DX NEXUS deve funcionar como o ponto central de gerenciamento do projeto: regras, configuração visual, imagens, temas, diagnóstico, rascunho, backup, preview e publicação.

O projeto não é uma reescrita total do editor. A prioridade é evoluir a interface e adicionar novas capacidades ao redor da base existente, mantendo compatibilidade com o fluxo atual.

---

## 2. Regra de ouro

**Melhorar sem quebrar.**

Durante toda a C11:

1. `main` permanece intocada até aprovação explícita do usuário.
2. Toda alteração ocorre na branch isolada da C11.
3. Funcionalidades já estáveis não devem ser reescritas sem necessidade comprovada.
4. Novas camadas devem preferir composição, adaptação e encapsulamento em vez de substituição agressiva do código existente.
5. Nenhum conteúdo publicado deve ser alterado somente por abrir ou navegar no Studio.
6. Nenhum runner de teste deve autenticar no GitHub ou publicar conteúdo.
7. Rascunho, backup, preview e publicação existentes devem continuar funcionando.
8. `site/rules.json` e `site/content/rules.json` não devem ser alterados pela implementação visual do Studio.
9. Cada etapa deve informar explicitamente onde o usuário deve testar.
10. Merge em `main` somente após teste manual e aprovação explícita.

---

## 3. Identidade visual

### Nome

Usar somente **DX** como identidade do Studio.

Não usar nomes de projetos anteriores como marca ou referência visual.

### Marca visual

Direção aprovada para exploração:

- símbolo de coroa;
- destaque roxo/violeta;
- fundo escuro;
- alto contraste;
- cartões modulares;
- aparência profissional de painel/CMS;
- estados de sucesso em verde;
- atenção em âmbar;
- erro em vermelho;
- tipografia clara e legível.

### Navegação lateral

A proposta inicial inclui:

- Início
- Gerenciar Regras
- Configurar o Site
- Central de Imagens
- Biblioteca de Temas
- Segurança e Diagnóstico
- Ferramentas Rápidas
- Backup e Restauração
- Logs de Alterações
- Documentação, apenas se existir conteúdo interno útil ao próprio operador

**Não incluir `Ajuda e Suporte` na navegação.**

---

## 4. Dashboard inicial

O Studio passa a possuir uma tela inicial própria em vez de abrir diretamente em um formulário extenso.

### Objetivos

- oferecer visão geral do projeto;
- deixar as áreas principais acessíveis em um clique;
- mostrar status importantes sem poluir a tela;
- permitir retomada rápida do trabalho;
- melhorar o aproveitamento do espaço disponível.

### Blocos principais

#### Gerenciar Regras

Acesso ao editor de categorias, subcategorias e regras.

#### Configurar o Site

Identidade, cores, imagens globais, efeitos e configurações gerais existentes.

#### Central de Imagens

Gerenciamento visual de logo, favicon, banner, fundos, imagens de regra e outras mídias suportadas.

#### Biblioteca de Temas

Temas existentes, variações visuais e futuras personalizações salvas.

#### Segurança e Diagnóstico

Integridade dos dados, conexão, mídias, publicação, estado técnico e validações do Studio.

#### Ferramentas Rápidas

Atalhos para ações frequentes, como:

- salvar rascunho;
- baixar backup;
- abrir site público;
- recarregar preview;
- outras ações seguras já existentes.

### Estado da sessão

Painel compacto indicando, quando disponível:

- GitHub conectado / desconectado;
- branch ou contexto de publicação;
- preview atualizado / pendente;
- alterações não publicadas;
- estado da publicação;
- último rascunho local.

Nenhum indicador pode afirmar sucesso sem conhecer o estado real.

### Resumo do projeto

Exibir métricas calculadas a partir dos dados carregados, por exemplo:

- categorias;
- subcategorias;
- regras;
- imagens.

As métricas são somente informativas e não podem modificar dados.

### Acesso rápido

Possíveis atalhos:

- editar última regra;
- continuar rascunho;
- abrir área usada recentemente.

A implementação deve degradar de forma segura quando essas informações não existirem.

---

## 5. Preview inteligente

O preview deixa de ocupar permanentemente uma grande parte da área de criação.

### Modo normal

O editor recebe prioridade de espaço.

O preview pode ficar:

- reduzido em um painel compacto;
- recolhido;
- ou representado por um cartão de status/mini-preview.

### Preview completo

Botão visível:

**Preview completo**

Ao ativar:

- o preview ganha prioridade visual;
- aumenta significativamente de tamanho;
- mantém sincronização com os dados atuais;
- não publica nada.

### Reduzir preview

No modo expandido deve existir:

**Reduzir preview**

A ação restaura o layout de edição sem perder:

- posição de edição;
- categoria/subcategoria abertas;
- texto atual;
- scroll quando tecnicamente possível.

### Requisitos de segurança

- mudar o tamanho do preview não altera dados;
- nenhum modo pode disparar publicação;
- manter o mecanismo atual de `postMessage`/preview enquanto ele continuar sendo a base segura do projeto;
- evitar recriar o editor inteiro somente para alternar o tamanho do preview.

---

## 6. Gerenciador de regras renovado

A área de regras deve ganhar mais espaço e hierarquia visual, preservando o modelo de dados atual.

### Estrutura existente que deve continuar válida

- `data.categories`;
- subcategorias dentro das categorias;
- regras diretas;
- regras dentro das subcategorias;
- IDs estáveis;
- numeração automática já estabilizada;
- controles `↑ Subir / ↓ Descer`;
- imagens vinculadas ao mesmo objeto de regra;
- política de códigos da C9/C10.

### Melhorias visuais desejadas

- painel lateral de navegação entre categorias/regras;
- editor central com maior largura;
- metadados organizados em uma faixa compacta;
- área de conteúdo maior;
- ações perigosas visualmente separadas;
- contadores de conteúdo;
- estados claros de seleção e foco.

---

## 7. Editor rico de conteúdo

O campo de texto da regra deve evoluir para uma experiência de escrita assistida, sem exigir que o operador memorize Markdown.

### Princípio de compatibilidade

A representação persistida deve permanecer compatível com o formato atual sempre que possível.

A interface rica pode gerar Markdown/estrutura equivalente nos bastidores, desde que:

- o conteúdo publicado continue renderizando corretamente;
- regras antigas continuem editáveis;
- não exista perda silenciosa de formatação;
- seja possível migrar gradualmente.

### Toolbar de seleção

Ao selecionar texto, oferecer ações rápidas como:

- Negrito
- Itálico
- Link
- Citação
- Código
- Destaque
- Lista

A toolbar deve aparecer somente quando útil e não bloquear seleção/cópia normal do navegador.

### Toolbar fixa

Também deve existir uma barra de formatação estável na área de escrita para acesso por mouse e teclado.

### Inserção por `+`

O editor poderá oferecer um botão de inserção de bloco.

Blocos candidatos:

- Título
- Texto
- Lista
- Aviso
- Informação
- Importante
- Exemplo
- Punição
- Permitido
- Proibição
- Exceção
- Imagem
- Separador
- Código / bloco monoespaçado

A lista final será definida por utilidade real no conteúdo das regras.

### Comandos rápidos

Fase opcional posterior:

- `/titulo`
- `/aviso`
- `/imagem`
- `/lista`
- etc.

Não implementar comandos antes de o sistema de blocos básico estar estável.

---

## 8. Central de imagens

A C11 poderá organizar as imagens existentes em uma área própria sem alterar o mecanismo seguro de publicação criado na C9.

A primeira versão deve priorizar visualização e acesso às mídias já conhecidas.

Possíveis recursos futuros:

- filtro por tipo;
- busca;
- informação de uso;
- imagem órfã;
- reutilização de mídia.

Não remover nem alterar automaticamente arquivos publicados.

---

## 9. Biblioteca de temas

A biblioteca deve reaproveitar o sistema existente de temas sempre que possível.

Objetivos:

- visualizar temas em cartões;
- aplicar prévia sem publicar;
- mostrar qual tema/variação está ativa no preview;
- permitir edição das opções existentes em uma interface mais organizada.

Não alterar comportamento público de tema sem ação explícita do operador.

---

## 10. Segurança e diagnóstico

Painel dedicado para informações técnicas já disponíveis ou seguras de calcular.

Possíveis verificações:

- presença de arquivos essenciais;
- consistência entre cópias de regras;
- IDs duplicados;
- códigos inválidos;
- imagens faltantes;
- status de conexão;
- mudanças locais não publicadas;
- compatibilidade de estrutura.

A C11 deve diferenciar claramente:

- sucesso;
- atenção;
- erro;
- informação.

---

## 11. Estratégia de implementação

### C11.0.1 — Auditoria e shell visual

Criar a arquitetura visual do DX NEXUS sem substituir as funções existentes.

**Teste do usuário:** `EDITOR`

Validar:

- identidade DX;
- navegação lateral;
- dashboard;
- responsividade básica;
- nenhum botão antigo quebrado.

### C11.0.2 — Dashboard funcional

Conectar cartões às áreas existentes.

**Teste do usuário:** `EDITOR`

Validar navegação e retorno ao início.

### C11.0.3 — Preview inteligente

Adicionar modos reduzido/completo sem alterar o mecanismo de dados.

**Teste do usuário:** `EDITOR`

Validar preview reduzido, completo, retorno e sincronização.

### C11.0.4 — Layout renovado do Gerenciar Regras

Melhorar distribuição de espaço mantendo os controles atuais.

**Teste do usuário:** `EDITOR`

Validar criação, edição, exclusão, subir/descer, imagens e preview.

### C11.0.5 — Editor rico básico

Toolbar fixa + seleção de texto, inicialmente com operações reversíveis e compatíveis com Markdown.

**Teste do usuário:** `TESTS + EDITOR`

Validar formatação e persistência sem perda de texto.

### C11.0.6 — Inserção de blocos

Adicionar sistema `+` com blocos úteis para regras.

**Teste do usuário:** `TESTS + EDITOR + SITE PÚBLICO`

O site público deve ser conferido porque o conteúdo gerado precisa renderizar corretamente.

### C11.0.7 — Central de imagens e temas

Reorganizar acesso às ferramentas existentes, sem mudar publicação de mídia sem necessidade.

**Teste do usuário:** `EDITOR`

### C11.0.8 — Segurança, diagnóstico e estado da sessão

Consolidar informações de integridade e status.

**Teste do usuário:** `TESTS + EDITOR`

### C11.0.9 — Regressão completa

Validar C9, C10 e fluxos de C11.

**Teste do usuário:** `TESTS + EDITOR + SITE PÚBLICO`

### C11.0.10 — Avaliação manual final

Somente correções provenientes da avaliação do usuário.

**Teste do usuário:** conforme o ponto alterado.

### C11.0.11 — Integração final

Somente após aprovação explícita.

Antes de afirmar sucesso:

- confirmar merge;
- confirmar GitHub Actions;
- confirmar deploy;
- verificar produção.

---

## 12. Critérios de não regressão

Antes da integração final, devem permanecer funcionando:

- carregar o editor;
- editar configurações do site;
- editar categoria;
- editar subcategoria;
- editar regra direta;
- editar regra aninhada;
- adicionar/excluir conteúdo;
- subir/descer categorias;
- subir/descer subcategorias;
- subir/descer regras;
- adicionar/remover imagens de regras;
- preview;
- salvar rascunho;
- baixar backup;
- restaurar fluxo suportado de backup/rascunho;
- autenticação GitHub existente;
- publicação segura;
- duas cópias de `rules.json` consistentes;
- site público;
- temas e efeitos já existentes;
- diagnóstico e acessibilidade existentes.

---

## 13. Fora de escopo inicial

Para reduzir risco, não entram automaticamente na primeira etapa:

- reescrever o formato completo das regras;
- banco de dados externo;
- múltiplos usuários simultâneos;
- colaboração em tempo real;
- drag-and-drop de ordenação;
- alteração automática de dados publicados;
- remoção em massa de mídia;
- refatoração geral de todo o editor apenas por estética.

Esses itens só podem entrar depois de avaliação separada.

---

## 14. Fluxo de aprovação

Para cada etapa:

1. implementar somente na branch da C11;
2. revisar diff;
3. criar/atualizar testes quando necessário;
4. informar claramente ao usuário onde testar;
5. usuário testa manualmente;
6. corrigir regressões encontradas;
7. abrir PR quando a etapa estiver suficientemente consolidada;
8. manter PR sem merge;
9. merge apenas após `pode mesclar` ou aprovação explícita equivalente;
10. após merge, verificar Actions e deploy antes de declarar conclusão.

---

## 15. Estado inicial

- Projeto: **DX NEXUS**
- Etapa: **C11.0.1 — Auditoria e shell visual**
- Branch: `feat/c11-dx-nexus-studio`
- Produção: não alterada por esta especificação
- Merge: não autorizado nesta etapa
