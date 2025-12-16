# 🚀 CHECKLIST DE DEPLOYMENT SEGURO

## PRÉ-DEPLOYMENT

### 1. REMOVER SEGREDOS DO CÓDIGO
- [ ] Remover `DEEPSEEK_API_KEY` de `ai-assistant.js`
- [ ] Remover `ADMIN_PASSWORD` de `app.js` (linha 87)
- [ ] Confirmar `app-api.js` não tem nenhuma chave
- [ ] Confirmar `server.js` usa apenas `process.env`

```bash
# Verificar se há chaves no código
grep -r "sk-" . --exclude-dir=node_modules --exclude-dir=.git
grep -r "BOXPRO" . --exclude-dir=node_modules --exclude-dir=.git
```

### 2. CRIAR `.env.example`
```bash
# .env.example - NUNCA fazer commit do .env real!
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
JWT_SECRET=GERE_UMA_CHAVE_ALEATORIA_FORTE
ADMIN_EMAIL=admin
ADMIN_PASSWORD=GERE_UMA_SENHA_FORTE
DEEPSEEK_API_KEY=sk-coloque_sua_chave_aqui
FRONTEND_URL=https://seu-frontend.vercel.app
LOG_LEVEL=info
```

### 3. GARANTIR `.gitignore` CORRETO
```bash
# .gitignore
node_modules/
.env
.env.local
.env.*.local
dist/
build/
*.log
logs/
.DS_Store
.vscode/
.idea/
*.swp
*.swo
*~
```

### 4. TESTAR LOCALMENTE
```bash
# 1. Instalar dependências
npm install

# 2. Gerar secrets locais
JWT_SECRET=$(openssl rand -base64 32)
ADMIN_PASSWORD=$(openssl rand -base64 12)

# 3. Criar .env local com valores teste
cat > .env << EOF
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/boxcontrol-test
JWT_SECRET=$JWT_SECRET
ADMIN_EMAIL=admin
ADMIN_PASSWORD=$ADMIN_PASSWORD
DEEPSEEK_API_KEY=sk-test-dummy-key
FRONTEND_URL=http://localhost:5173
EOF

# 4. Rodar testes
npm test

# 5. Iniciar servidor local
npm start

# 6. Fazer requisições de teste
curl -X GET http://localhost:3000/api/health
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin","password":"'$ADMIN_PASSWORD'"}'
```

---

## RAILWAY DEPLOYMENT

### 1. PREPARAR VARIÁVEIS NO RAILWAY

Acessar: Railway > Project > Variables

```
NODE_ENV: production
PORT: 3000
MONGODB_URI: mongodb+srv://user:password@cluster.mongodb.net/boxdb
JWT_SECRET: [GERAR - openssl rand -base64 32]
ADMIN_EMAIL: admin
ADMIN_PASSWORD: [GERAR - openssl rand -base64 16]
DEEPSEEK_API_KEY: sk-[sua chave real]
FRONTEND_URL: https://seu-app.vercel.app
LOG_LEVEL: warn
```

### 2. CONFIGURAR RAILWAY.JSON
```json
{
  "build": {
    "builder": "nixpacks"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 5
  }
}
```

### 3. VALIDAR VARIÁVEIS ANTES DE DEPLOY

```bash
#!/bin/bash
# validate-env.sh

REQUIRED_VARS=(
  "NODE_ENV"
  "MONGODB_URI"
  "JWT_SECRET"
  "ADMIN_EMAIL"
  "ADMIN_PASSWORD"
  "DEEPSEEK_API_KEY"
  "FRONTEND_URL"
)

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ ERRO: Variável $var não está configurada!"
    exit 1
  fi
done

echo "✅ Todas as variáveis obrigatórias estão configuradas"
```

### 4. EXECUTAR VALIDAÇÃO

```bash
chmod +x validate-env.sh
./validate-env.sh
```

---

## VERCEL DEPLOYMENT (Frontend)

### 1. ESTRUTURA CORRETA
```
frontend/
├── index.html
├── app.js
├── app-api.js
├── ai-assistant-api.js
├── styles.css
└── vercel.json
```

### 2. CRIAR `vercel.json`
```json
{
  "version": 2,
  "builds": [
    {
      "src": "index.html",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "index.html"
    }
  ],
  "env": {
    "REACT_APP_API_URL": "@api_url"
  }
}
```

### 3. VARIÁVEIS NO VERCEL

Settings > Environment Variables

```
REACT_APP_API_URL: https://seu-backend.up.railway.app/api
NODE_ENV: production
```

### 4. DEPLOY
```bash
npm install -g vercel
vercel login
vercel deploy --prod
```

---

## MONITORAMENTO PÓS-DEPLOY

### 1. HEALTH CHECK
```bash
curl -s https://seu-backend.up.railway.app/api/health | jq
# Esperado: { "status": "OK", "timestamp": "..." }
```

### 2. TESTAR ENDPOINTS CRÍTICOS

#### Login
```bash
curl -X POST https://seu-backend.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin","password":"sua_senha_aqui"}'
# Esperado: { "message": "Login bem-sucedido", "token": "jwt...", "user": {...} }
```

#### Criar Transação
```bash
TOKEN="seu_jwt_aqui"
curl -X POST https://seu-backend.up.railway.app/api/transactions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tipo":"expense",
    "categoria":"Outros",
    "descricao":"Teste",
    "valor":100,
    "data":"2025-12-16"
  }'
```

#### IA Ask
```bash
curl -X POST https://seu-backend.up.railway.app/api/ai/ask \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userText":"Gasto 50 em combustível"}'
```

### 3. VERIFICAR LOGS

**Railway:**
```bash
railway logs -s backend --tail 100
```

**Vercel:**
```bash
vercel logs --project-name seu-projeto --tail
```

---

## TESTES DE SEGURANÇA

### 1. TESTE CHAVE EXPOSTA
```bash
# ❌ Não deve encontrar chaves
git log -p | grep "sk-"
grep -r "sk-" --exclude-dir=.git --exclude-dir=node_modules

# ❌ Não deve encontrar senhas
grep -r "1570" --exclude-dir=.git --exclude-dir=node_modules
grep -r "BOXPRO" --exclude-dir=.git --exclude-dir=node_modules
```

### 2. TESTE CORS
```bash
# Testar origem não permitida
curl -X GET https://seu-backend.up.railway.app/api/categories \
  -H "Origin: https://site-malicioso.com" \
  -v
# Deve rejeitar (Access-Control-Allow-Origin: denied)
```

### 3. TESTE RATE LIMIT
```bash
# Fazer 10 requisições rapidamente ao login
for i in {1..10}; do
  curl -X POST https://seu-backend.up.railway.app/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin","password":"wrong"}'
done
# Esperado: 429 Too Many Requests na 6ª tentativa
```

### 4. TESTE XSS
```bash
# Tentar injetar script em descrição
curl -X POST https://seu-backend.up.railway.app/api/transactions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tipo":"expense",
    "categoria":"Teste",
    "descricao":"<script>alert(1)</script>",
    "valor":100,
    "data":"2025-12-16"
  }'
# Script não deve executar (armazenado como string)
```

### 5. TESTE JWT EXPIRADO
```bash
# Usar token antigo/expirado
curl -X GET https://seu-backend.up.railway.app/api/transactions \
  -H "Authorization: Bearer eyJhbGc..."
# Esperado: 401 Unauthorized
```

---

## PLANO DE RESPOSTA A INCIDENTES

### Se Chave for Exposta
```bash
# 1. Imediatamente remover do GitHub
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch backend/.env' \
  --prune-empty --tag-name-filter cat -- --all

git push origin --force --all

# 2. Revogar chave DeepSeek em https://platform.deepseek.com/api_keys

# 3. Gerar nova chave DeepSeek

# 4. Atualizar em Railway e fazer redeploy
```

### Se Senha Admin Vazar
```bash
# 1. Mudar senha no Railway imediatamente
ADMIN_PASSWORD=$(openssl rand -base64 16)

# 2. Verificar logs de login em Railway para atividade suspeita
railway logs

# 3. Fazer redeploy com nova senha
vercel deploy --prod
```

### Se DB for Comprometida
```bash
# 1. Fazer backup imediato
mongodump --uri "$MONGODB_URI"

# 2. Resetar todos os usuários (exceto o seu)
# Executar em routes/auth.js endpoint DELETE /reset-all-users

# 3. Forçar mudança de senha de todos
```

---

## MANUTENÇÃO CONTÍNUA

### Semanal
- [ ] Verificar `npm audit` para vulnerabilidades
```bash
npm audit
npm audit fix
```

- [ ] Revisar logs de erro no Railway
```bash
railway logs --since 7d
```

### Mensal
- [ ] Verificar pacotes desatualizados
```bash
npm outdated
npm update
```

- [ ] Backup do banco de dados
```bash
mongodump --uri "$MONGODB_URI" --out ./backup/$(date +%Y%m%d)
```

### Trimestral
- [ ] Rotação de JWT_SECRET (com cuidado - invalida tokens existentes)
- [ ] Audit de segurança com ferramentas (OWASP ZAP, Burp Suite)
- [ ] Teste de penetração
- [ ] Review de permissões de usuários

---

## DOCUMENTAÇÃO PARA PRODUÇÃO

### Criar `DEPLOYMENT.md`
```markdown
# Guia de Deployment

## Variáveis Obrigatórias

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| NODE_ENV | Ambiente | `production` |
| MONGODB_URI | URL Banco | `mongodb+srv://...` |
| JWT_SECRET | Segredo JWT (min 32 chars) | `k8c7sN9uR4pQ...` |
| ADMIN_EMAIL | Email do admin | `admin` |
| ADMIN_PASSWORD | Senha admin (min 12 chars) | `aB@12!xYz9...` |
| DEEPSEEK_API_KEY | Chave DeepSeek | `sk-...` |
| FRONTEND_URL | URL do frontend | `https://app.com` |

## Primeira Execução

1. Configurar todas as variáveis no Railway
2. Fazer deploy
3. Executar health check: `curl {url}/api/health`
4. Testar login: `POST /api/auth/login`

## Troubleshooting

### Erro: DeepSeek não configurado
- Verificar se `DEEPSEEK_API_KEY` está no Railway
- Confirmar que começa com `sk-`

### Erro: MongoDB não conecta
- Verificar se IP está na whitelist do MongoDB Atlas
- Testar conexão local: `mongosh "$MONGODB_URI"`

### Erro: CORS
- Verificar se `FRONTEND_URL` está correto no Railway
```

### Criar `SECURITY.md`
```markdown
# Política de Segurança

## Reporting Vulnerabilities

Se você descobrir uma vulnerabilidade:

1. **NÃO** abra issue pública
2. Envie email para: security@seu-domain.com
3. Inclua: descrição, como reproduzir, impacto
4. Prazo de resposta: 48 horas

## Práticas de Segurança

- Nunca fazer commit de `.env`
- Nunca compartilhar JWT_SECRET ou DEEPSEEK_API_KEY
- Todas as senhas: min 12 caracteres, alfanumérico + especial
- Fazer audit mensal: `npm audit`
- Manter dependências atualizadas

## Checklist de Deploy

- [ ] Nenhuma chave no código
- [ ] `.env` adicionado ao `.gitignore`
- [ ] `npm audit` passa
- [ ] Testes passam
- [ ] CORS está restritivo
- [ ] Rate limit ativado
- [ ] Logs estão funcionando
- [ ] Health check responde
```

---

## SCRIPT DE DEPLOYMENT AUTOMATIZADO

### `scripts/deploy.sh`
```bash
#!/bin/bash

set -e # Sair em caso de erro

echo "🚀 Iniciando deployment..."

# 1. Validar variáveis de ambiente
echo "🔍 Validando variáveis de ambiente..."
REQUIRED_VARS=("NODE_ENV" "MONGODB_URI" "JWT_SECRET" "ADMIN_EMAIL" "ADMIN_PASSWORD" "DEEPSEEK_API_KEY")

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ ERRO: $var não está configurada!"
    exit 1
  fi
done

# 2. Testar conexão com banco
echo "🗄️  Testando conexão com MongoDB..."
mongosh "$MONGODB_URI" --eval "db.adminCommand('ping')" || {
  echo "❌ Erro ao conectar MongoDB"
  exit 1
}

# 3. Verificar segredos no código
echo "🔐 Verificando se há segredos no código..."
if grep -r "sk-[a-zA-Z0-9]" --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null; then
  echo "❌ ERRO: Encontrada possível chave DeepSeek no código!"
  exit 1
fi

if grep -r "1570" --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null; then
  echo "⚠️  AVISO: Encontrado número padrão '1570' no código"
fi

# 4. Instalar dependências
echo "📦 Instalando dependências..."
npm install

# 5. Rodar auditorias de segurança
echo "🛡️  Executando npm audit..."
npm audit --audit-level=moderate || true

# 6. Rodar testes (se existirem)
if [ -f "package.json" ] && grep -q '"test"' package.json; then
  echo "🧪 Rodando testes..."
  npm test
fi

# 7. Build (se necessário)
if [ -f "package.json" ] && grep -q '"build"' package.json; then
  echo "🔨 Buildando projeto..."
  npm run build
fi

# 8. Health check final
echo "✅ Validações passaram!"
echo "🚀 Pronto para deploy em:"
echo "   - Backend: Railway"
echo "   - Frontend: Vercel"
echo ""
echo "Próximos passos:"
echo "1. git add . && git commit -m 'Deploy seguro'"
echo "2. git push origin main"
echo "3. Monitorar logs em Railway e Vercel"
```

### Executar
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

---

## OBSERVABILIDADE

### Adicionar ao `backend/src/server.js`

```javascript
const logger = require('./logger');

// Log de requisições importantes
app.use((req, res, next) => {
  if (req.path.includes('/auth') || req.path.includes('/ai')) {
    logger.info('Request', {
      method: req.method,
      path: req.path,
      userId: req.userId || 'anonymous',
      ip: req.ip
    });
  }
  next();
});

// Alertar sobre possíveis ataques
app.use((req, res, next) => {
  const suspiciousPatterns = [
    /(\<script|\<iframe|javascript:|onerror=)/i,
    /union.*select|drop.*table|delete.*from/i, // SQL injection
    /\.\.\//g // Path traversal
  ];
  
  const body = JSON.stringify(req.body);
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(body) || pattern.test(req.path)) {
      logger.warn('Suspicious request detected', {
        path: req.path,
        method: req.method,
        ip: req.ip,
        body: body.substring(0, 100)
      });
    }
  }
  
  next();
});
```

---

**Checklist Final Antes de Deploy:**

- [ ] Nenhuma chave no código (grep -r)
- [ ] `.env.example` criado
- [ ] Variáveis configuradas no Railway
- [ ] Variáveis configuradas no Vercel
- [ ] Tests passam (`npm test`)
- [ ] npm audit limpo ou aceito
- [ ] Health check funciona localmente
- [ ] CORS testado
- [ ] Rate limit testado
- [ ] Logs funcionando
- [ ] Backup do banco feito
- [ ] Documentação atualizada

**Status:** Pronto para produção ✅
