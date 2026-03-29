# Mudanças realizadas pela sessão Claude Code

## 1. Testes automatizados (306 testes)

Criada uma suíte completa de testes com Vitest cobrindo:
- Schemas de validação de dados
- Armazenamento em memória
- Cache Redis
- Chamadas para cada provedor de IA (Groq, OpenRouter, Cohere, Gemini)
- Síntese colaborativa entre IAs
- Detecção de geolocalização
- Hooks e contextos React
- Todos os componentes visuais principais

**Impacto:** qualquer mudança futura no código que quebre alguma funcionalidade é detectada automaticamente ao rodar `npm test`.

---

## 2. Correções de bugs

- **`callOpenRouter`**: a chave de API estava sendo passada como nome do modelo, fazendo todas as chamadas ao OpenRouter falharem com erro de modelo inválido.
- **Cache colaborativo sem TTL**: respostas ficavam guardadas para sempre na memória, podendo servir resultados velhos indefinidamente. Agora expiram em 5 minutos.
- **Extração de URLs**: URLs com parênteses no final (comum em texto markdown) eram capturadas erradas. Corrigido para processar links markdown antes de URLs brutas, evitando duplicatas.

---

## 3. Segurança

### Injeção de prompt
- Usuários podiam encerrar o delimitador `</user_prompt>` dentro do próprio prompt e injetar instruções diretas para os modelos de IA. Agora esse trecho é escapado antes de ser enviado.
- Respostas das IAs enviadas de volta pelo cliente para os endpoints `/refine` e `/synthesize` não eram validadas, permitindo que conteúdo malicioso fosse injetado no contexto de outras IAs. Adicionada validação completa com tamanho máximo em todos os campos.
- Respostas de IAs intermediárias agora são marcadas como "dados não confiáveis" antes de serem enviadas para síntese por outro modelo.

### XSS (execução de código no navegador)
- O componente de análise Llama renderizava HTML bruto das respostas de IA diretamente na página. Um modelo comprometido poderia executar código JavaScript no navegador do usuário. Substituído por renderização segura em React.

### Redirecionamento aberto
- Links extraídos de respostas de IA eram exibidos sem validação, permitindo URLs como `javascript:...`. Adicionada verificação que aceita apenas `http://` e `https://`.

### CORS
- O servidor aceitava requisições de qualquer origem quando a variável `CORS_ORIGIN` não estava configurada. Corrigido para usar lista explícita de origens permitidas.

### Vazamento de informações
- Mensagens de erro internas dos provedores de IA (contendo detalhes técnicos, nomes de modelos, limites de cota) eram exibidas diretamente para o usuário. Agora são substituídas por mensagens genéricas.
- A função `throwIfResNotOk` incluía o código HTTP e o corpo bruto da resposta nas mensagens de erro, que podiam aparecer em logs e ferramentas de monitoramento. Corrigido para extrair apenas o campo `message` do JSON.

### Validação de entrada
- Endpoints de imagem aceitavam qualquer tipo de arquivo. Adicionada lista de MIME types permitidos (JPEG, PNG, GIF, WebP).
- Endpoints colaborativos não tinham limite de tamanho no prompt (era possível enviar 100 mil caracteres). Agora limitados a 4.000 caracteres.
- Os campos `recommendedAI` e `aiWeights` aceitavam qualquer string como nome de provedor, que era inserida diretamente nos prompts do sistema. Agora restrito aos provedores conhecidos.

### Outros
- Caminho dos arquivos estáticos era relativo ao diretório de trabalho, podendo resolver para o lugar errado dependendo de onde o servidor era iniciado. Corrigido para caminho absoluto.
- Header `X-Country` era confiado sem verificação, permitindo que qualquer cliente falsificasse sua localização. Removida essa confiança.
- Histórico de conversa no modo chat não tinha limite de tamanho, crescendo indefinidamente e carregando respostas antigas de IA em novos contextos. Limitado a 3.000 caracteres.
- O header `trust proxy` foi adicionado para que o rate limiting funcione corretamente atrás de proxies e load balancers.

---

## 4. Compatibilidade com Windows

- Scripts `npm run dev` e `npm start` não funcionavam no Windows porque usavam sintaxe Unix (`NODE_ENV=development`). Adicionado `cross-env` para compatibilidade.
- A opção `reusePort` no servidor não é suportada no Windows e causava erro fatal na inicialização. Desativada automaticamente quando rodando no Windows.
