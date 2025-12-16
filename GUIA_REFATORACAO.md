# 🔧 GUIA DE REFATORAÇÃO - THE BOX CONTROL 2.0

## PARTE 1: ELIMINAR DUPLICAÇÃO DE CÓDIGO

### Criar arquivo compartilhado: `frontend/utils.js`

```javascript
/**
 * utils.js - Funções compartilhadas entre app.js e app-api.js
 * Objetivo: Eliminar 450 linhas de código duplicado
 */

// ===== MODAL E NOTIFICAÇÕES =====
export function showConfirm(message, onConfirm) {
  const modalMsg = document.getElementById('modal-msg');
  const customModal = document.getElementById('custom-modal');
  
  if (!modalMsg || !customModal) {
    console.error('Elementos modal não encontrados');
    return;
  }
  
  modalMsg.textContent = message;
  customModal.style.display = 'flex';
  
  const btn = document.getElementById('modal-confirm-btn');
  const newBtn = btn.cloneNode(true);
  newBtn.textContent = "Confirmar";
  btn.parentNode.replaceChild(newBtn, btn);
  
  newBtn.addEventListener('click', () => {
    closeModal();
    if (onConfirm) onConfirm();
  });
}

export function showAlert(message) {
  const modalMsg = document.getElementById('modal-msg');
  const customModal = document.getElementById('custom-modal');
  
  if (!modalMsg || !customModal) {
    alert(message); // Fallback
    return;
  }
  
  modalMsg.textContent = message;
  customModal.style.display = 'flex';
  
  const btn = document.getElementById('modal-confirm-btn');
  const newBtn = btn.cloneNode(true);
  newBtn.textContent = "OK";
  btn.parentNode.replaceChild(newBtn, btn);
  newBtn.addEventListener('click', () => closeModal());
}

export function closeModal() {
  const customModal = document.getElementById('custom-modal');
  if (customModal) customModal.style.display = 'none';
}

export function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return console.error('Toast element not found');
  
  toast.textContent = msg;
  toast.className = 'show';
  setTimeout(() => {
    toast.className = toast.className.replace('show', '');
  }, 3000);
}

// ===== FORMATAÇÃO =====
export function fmt(n) {
  return 'R$ ' + Number(n).toFixed(2).replace('.', ',');
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ===== STORAGE =====
export function getStorageKey(userEmail) {
  if (!userEmail) return null;
  return 'boxmotors_data_' + userEmail.replace(/[^a-z0-9]/gi, '_');
}

export function loadFromStorage(userEmail) {
  const key = getStorageKey(userEmail);
  if (!key) return null;
  
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error('Erro ao carregar do storage:', e);
    return null;
  }
}

export function saveToStorage(userEmail, data) {
  const key = getStorageKey(userEmail);
  if (!key) return false;
  
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('Erro ao salvar no storage:', e);
    return false;
  }
}

// ===== VALIDAÇÃO =====
export function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

export function validateTransaction(tipo, categoria, descricao, valor, data) {
  if (!tipo) return { valid: false, error: 'Tipo é obrigatório' };
  if (!categoria) return { valid: false, error: 'Categoria é obrigatória' };
  if (!descricao) return { valid: false, error: 'Descrição é obrigatória' };
  if (!valor || valor <= 0) return { valid: false, error: 'Valor deve ser maior que zero' };
  if (!data) return { valid: false, error: 'Data é obrigatória' };
  
  return { valid: true };
}

// ===== THEME =====
export function applyTheme() {
  const theme = localStorage.getItem('boxmotors_theme');
  if (theme === 'light') {
    document.body.setAttribute('data-theme', 'light');
  } else {
    document.body.removeAttribute('data-theme');
  }
}

export function toggleTheme() {
  const current = localStorage.getItem('boxmotors_theme');
  const next = current === 'light' ? 'dark' : 'light';
  localStorage.setItem('boxmotors_theme', next);
  applyTheme();
}

// ===== LICENSE =====
export function isPro(licenseKey) {
  return licenseKey === 'BOXPRO';
}

export function checkLicense(licenseKey) {
  const demoBadge = document.getElementById('demoBadge');
  const licenseKeyInput = document.getElementById('licenseKey');
  const buyBtn = document.getElementById('buyBtn');
  const commercialArea = document.getElementById('commercialArea');
  const backupBtn = document.getElementById('backupBtn');
  const aiMicBtn = document.getElementById('aiMic');
  
  if (isPro(licenseKey)) {
    if (demoBadge) demoBadge.style.display = 'none';
    if (licenseKeyInput) licenseKeyInput.style.display = 'none';
    if (buyBtn) buyBtn.style.display = 'none';
    if (commercialArea) commercialArea.style.display = 'none';
    if (backupBtn) backupBtn.style.display = 'inline-block';
    if (aiMicBtn) aiMicBtn.style.display = 'inline-block';
  } else {
    if (demoBadge) demoBadge.style.display = 'inline-block';
    if (licenseKeyInput) licenseKeyInput.style.display = 'inline-block';
    if (buyBtn) buyBtn.style.display = 'inline-block';
    if (commercialArea) commercialArea.style.display = 'flex';
    if (backupBtn) backupBtn.style.display = 'none';
    if (aiMicBtn) aiMicBtn.style.display = 'none';
  }
}

// ===== DATA MANIPULATION =====
export function calculateExpensesByCategory(transactions) {
  return transactions
    .filter(t => t.tipo === 'expense')
    .reduce((acc, t) => {
      const cat = t.categoria;
      acc[cat] = (acc[cat] || 0) + t.valor;
      return acc;
    }, {});
}

export function calculateTotals(transactions) {
  const income = transactions
    .filter(t => t.tipo === 'income')
    .reduce((sum, t) => sum + t.valor, 0);
  
  const expense = transactions
    .filter(t => t.tipo === 'expense')
    .reduce((sum, t) => sum + t.valor, 0);
  
  return {
    income,
    expense,
    balance: income - expense
  };
}

// ===== DOWNLOAD FILES =====
export function downloadFile(content, ext, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup_${new Date().toISOString().slice(0, 10)}.${ext}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

---

## PARTE 2: SEGURANÇA - COMO PROTEGER A CHAVE DEEPSEEK

### Problema Atual
```javascript
// ❌ ERRADO - em ai-assistant.js (LINHA 9)
const DEEPSEEK_API_KEY = 'sk-d988d72086714703b86a3e160224e29c';
```

### Solução Proposta

#### 1. Backend Seguro: `backend/src/routes/ai.js` (CORRETO)
```javascript
// ✅ CORRETO - Chave no backend, segura
const apiKey = process.env.DEEPSEEK_API_KEY; // Variável de ambiente

router.post('/ask', verifyToken, async (req, res) => {
  const { userText } = req.body;
  
  // Verificação adequada
  if (!apiKey || !apiKey.startsWith('sk-')) {
    return res.status(503).json({
      error: 'DeepSeek não configurado',
      message: 'Configure DEEPSEEK_API_KEY no Railway'
    });
  }
  
  try {
    const response = await axios.post('https://api.deepseek.com/chat/completions', {
      model: 'deepseek-chat',
      messages: [/* ... */],
      response_format: { type: 'json_object' },
      temperature: 0.1
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    const cmd = JSON.parse(response.data.choices[0].message.content);
    
    // Processar comando
    if (cmd.action === 'add_tx') {
      const transaction = new Transaction({
        userId: req.userId,
        tipo: cmd.tipo,
        categoria: cmd.cat,
        descricao: cmd.desc,
        valor: cmd.val,
        data: new Date(cmd.data)
      });
      await transaction.save();
      return res.json({ success: true, action: 'add_tx' });
    }
    
    res.json({ error: 'Ação desconhecida' });
  } catch (error) {
    console.error('DeepSeek error:', error.message);
    res.status(500).json({ error: 'Erro ao processar comando de voz' });
  }
});
```

#### 2. Frontend Correto: `frontend/ai-assistant-api.js`
```javascript
// ✅ CORRETO - Usa backend, sem exposição de chave

async function askDeepSeek(userText) {
  // Detectar comando de óleo
  const isOilCommand = (/\b(troca|trocar|óleo|oleo|km)\b/i).test(userText);
  
  if (isOilCommand) {
    showToast("✅ Abrindo Troca de Óleo...");
    document.querySelector('main').style.display = 'none';
    document.getElementById('oil-page').style.display = 'block';
    
    const cliente = extrairCliente(userText);
    const moto = extrairMoto(userText);
    
    if (cliente) document.getElementById('oilCliente').value = cliente;
    if (moto) document.getElementById('oilMoto').value = moto;
    
    renderOilList();
    return;
  }
  
  // Chamar backend seguro
  showToast('Processando...');
  
  const result = await apiCall('/ai/ask', 'POST', { userText });
  
  if (result && result.success) {
    showToast(`✅ ${result.action === 'add_tx' ? 'Transação' : 'Recorrente'} adicionada!`);
    await updateUI();
  } else {
    showToast(`❌ Erro: ${result?.error || 'Desconhecido'}`);
  }
}
```

#### 3. Configuração do Railway (`.env`)
```bash
# Railway > Environment
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/boxcontrol
JWT_SECRET=sua_chave_jwt_super_secreta_gerada_aleatoriamente_32_caracteres
ADMIN_EMAIL=admin
ADMIN_PASSWORD=senha_admin_forte_gerada_aleatoriamente
DEEPSEEK_API_KEY=sk-seu_secret_deepseek_aqui
FRONTEND_URL=https://seu-frontend.vercel.app
```

---

## PARTE 3: VALIDAÇÃO COM JOI

### Instalar
```bash
cd backend
npm install joi express-validator
```

### Criar validators: `backend/src/validators/transactionValidator.js`
```javascript
const Joi = require('joi');

const transactionSchema = Joi.object({
  tipo: Joi.string().valid('income', 'expense').required()
    .messages({ 'string.only': 'Tipo deve ser income ou expense' }),
  categoria: Joi.string().trim().min(1).max(50).required()
    .messages({ 'string.empty': 'Categoria não pode estar vazia' }),
  descricao: Joi.string().trim().min(1).max(200).required()
    .messages({ 'string.empty': 'Descrição não pode estar vazia' }),
  valor: Joi.number().positive().required()
    .messages({ 'number.positive': 'Valor deve ser positivo' }),
  data: Joi.date().iso().required()
    .messages({ 'date.format': 'Data em formato inválido' })
});

const recurringSchema = Joi.object({
  desc: Joi.string().trim().min(1).max(100).required(),
  valor: Joi.number().positive().required(),
  dia: Joi.number().integer().min(1).max(31).required()
});

module.exports = {
  validateTransaction: (data) => transactionSchema.validate(data),
  validateRecurring: (data) => recurringSchema.validate(data)
};
```

### Usar em transações: `backend/src/routes/transactions.js`
```javascript
const { validateTransaction } = require('../validators/transactionValidator');

router.post('/', verifyToken, async (req, res) => {
  try {
    // Validar entrada
    const { error, value } = validateTransaction(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validação falhou',
        details: error.details.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      });
    }
    
    // Usar value validado
    const { tipo, categoria, descricao, valor, data } = value;
    
    const transaction = new Transaction({
      userId: req.userId,
      tipo,
      categoria,
      descricao,
      valor,
      data: new Date(data)
    });
    
    await transaction.save();
    res.status(201).json(transaction);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

---

## PARTE 4: RESPONSIVIDADE - CSS MELHORADO

### Novo arquivo: `frontend/styles-responsive.css`

```css
/* ===== MOBILE-FIRST APPROACH ===== */

:root {
  --bg: #0b0b0b;
  --card: #121212;
  --accent: #c8102e;
  --muted: #9aa0a6;
  --ok: #16a34a;
  --warn: #eab308;
  --text: #ffffff;
  --input-bg: #1c1c1c;
  --input-border: #333;
  
  /* Breakpoints em variables */
  --bp-sm: 480px;
  --bp-md: 768px;
  --bp-lg: 1024px;
  --bp-xl: 1280px;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: Inter, Arial, sans-serif;
  background: linear-gradient(180deg, #0f1720 0%, #07101a 100%);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
  padding: 12px;
  min-height: 100vh;
}

/* ===== HEADER MOBILE-FIRST ===== */
header {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 14px;
}

header h1 {
  font-size: 20px;
  margin: 0;
  width: 100%;
}

header > div:last-child {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
  width: 100%;
}

header button {
  font-size: 12px;
  padding: 8px 10px;
}

/* ===== BREAKPOINT: Tablet (768px) ===== */
@media (min-width: 768px) {
  header {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
  
  header > div:last-child {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    width: auto;
  }
  
  header button {
    font-size: 13px;
  }
}

/* ===== BREAKPOINT: Desktop (900px) ===== */
@media (min-width: 900px) {
  body {
    padding: 18px;
  }
  
  header {
    gap: 16px;
    margin-bottom: 14px;
  }
  
  header h1 {
    font-size: 18px;
  }
  
  header button {
    font-size: 14px;
    padding: 10px 12px;
  }
}

/* ===== GRID LAYOUT ===== */
.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

@media (min-width: 900px) {
  .grid {
    grid-template-columns: 1fr 360px;
    gap: 18px;
  }
}

/* ===== CARDS ===== */
.card {
  background: var(--card);
  border-radius: 10px;
  padding: 12px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.5);
}

@media (min-width: 900px) {
  .card {
    padding: 14px;
  }
}

/* ===== INPUTS ===== */
input,
select,
textarea {
  width: 100%;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid var(--input-border);
  background-color: var(--input-bg) !important;
  color: var(--text) !important;
  margin-bottom: 10px;
  outline: none;
  font-size: 14px;
}

input[type="date"] {
  font-size: 12px;
}

/* ===== BUTTONS ===== */
button {
  padding: 10px 12px;
  border-radius: 8px;
  border: none;
  background: var(--accent);
  color: #fff;
  cursor: pointer;
  font-weight: 600;
  font-size: 13px;
}

@media (min-width: 768px) {
  button {
    font-size: 14px;
  }
}

button:hover {
  opacity: 0.9;
}

button.ghost {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.06);
  font-weight: 400;
  color: var(--text);
  font-size: 12px;
  padding: 8px 10px;
}

@media (min-width: 768px) {
  button.ghost {
    font-size: 13px;
    padding: 10px 12px;
  }
}

/* ===== CANVAS (GRÁFICO) ===== */
canvas {
  width: 100%;
  height: 150px;
  border-radius: 8px;
  background: transparent;
}

@media (min-width: 768px) {
  canvas {
    height: 180px;
  }
}

@media (min-width: 900px) {
  canvas {
    height: 200px;
  }
}

/* ===== FILTROS ===== */
.filter-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

@media (min-width: 600px) {
  .filter-row {
    grid-template-columns: 1fr 1fr 1fr 1fr;
  }
}

@media (min-width: 900px) {
  .filter-row {
    grid-template-columns: 1fr 1fr 1fr 1fr;
    gap: 10px;
  }
}

/* ===== SUMMARY ===== */
.summary {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  margin-bottom: 12px;
}

@media (min-width: 600px) {
  .summary {
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }
}

.summary .s {
  padding: 10px;
  border-radius: 8px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.05), transparent);
}

/* ===== LISTS ===== */
.list {
  max-height: 300px;
  overflow-y: auto;
  margin-top: 10px;
}

@media (min-width: 768px) {
  .list {
    max-height: 400px;
  }
}

@media (min-width: 900px) {
  .list {
    max-height: 500px;
  }
}

.tx,
.rec-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border-radius: 8px;
  margin-bottom: 8px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.05), transparent);
}

/* ===== MODAL DE LOGIN (CUBO 3D) ===== */
.login-cube-container {
  width: 60px;
  height: 60px;
  margin: 16px auto 18px;
  perspective: 800px;
}

@media (min-width: 480px) {
  .login-cube-container {
    width: 80px;
    height: 80px;
  }
}

@media (min-width: 768px) {
  .login-cube-container {
    width: 90px;
    height: 90px;
  }
}

.login-cube {
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
  animation: loginCubeRotate 8s infinite linear;
}

.login-cube .cube-face {
  position: absolute;
  width: 100%;
  height: 100%;
  border: 2px solid var(--accent);
  background: rgba(200, 16, 46, 0.12);
  box-shadow: 0 0 22px rgba(200, 16, 46, 0.9);
}

@keyframes loginCubeRotate {
  0% {
    transform: rotateX(0deg) rotateY(0deg);
  }
  100% {
    transform: rotateX(360deg) rotateY(360deg);
  }
}

/* ===== TOAST ===== */
#toast {
  visibility: hidden;
  min-width: 200px;
  margin-left: -100px;
  background-color: #333;
  color: #fff;
  text-align: center;
  border-radius: 6px;
  padding: 12px;
  position: fixed;
  z-index: 99999;
  left: 50%;
  bottom: 20px;
  font-size: 14px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5);
}

@media (min-width: 768px) {
  #toast {
    min-width: 250px;
    margin-left: -125px;
    font-size: 16px;
    bottom: 30px;
    padding: 16px;
  }
}

#toast.show {
  visibility: visible;
  animation: fadein 0.5s, fadeout 0.5s 2.5s;
}

@keyframes fadein {
  from {
    bottom: 0;
    opacity: 0;
  }
  to {
    bottom: 30px;
    opacity: 1;
  }
}

@keyframes fadeout {
  from {
    bottom: 30px;
    opacity: 1;
  }
  to {
    bottom: 0;
    opacity: 0;
  }
}

/* ===== LIGHT THEME ===== */
body[data-theme='light'] {
  --bg: #fff;
  --card: #f6f6f6;
  --accent: #c8102e;
  --muted: #6b7280;
  --ok: #0f766e;
  --text: #0b1220;
  --input-bg: #ffffff;
  --input-border: #ccc;
  color: #0b1220;
  background: linear-gradient(180deg, #fff 0%, #f7f7f7 100%);
}

body[data-theme='light'] button.ghost {
  border-color: rgba(0, 0, 0, 0.08);
  color: #0b1220;
}
```

---

## PARTE 5: PAGINAÇÃO NO BACKEND

### `backend/src/routes/transactions.js` (ATUALIZADO)

```javascript
// GET com paginação
router.get('/', verifyToken, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100); // Máx 100
    const skip = Math.max(parseInt(req.query.skip) || 0, 0);
    const { startDate, endDate, categoria } = req.query;
    
    const query = { userId: req.userId };
    
    if (startDate || endDate) {
      query.data = {};
      if (startDate) query.data.$gte = new Date(startDate);
      if (endDate) query.data.$lte = new Date(endDate);
    }
    
    if (categoria) {
      query.categoria = categoria;
    }
    
    // Contar total
    const total = await Transaction.countDocuments(query);
    
    // Buscar com paginação
    const transactions = await Transaction
      .find(query)
      .sort({ data: -1 })
      .limit(limit)
      .skip(skip)
      .lean(); // .lean() para performance
    
    res.json({
      data: transactions,
      pagination: {
        total,
        limit,
        skip,
        pages: Math.ceil(total / limit),
        page: Math.floor(skip / limit) + 1
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

### Frontend com paginação: `frontend/app-api.js` (ATUALIZADO)

```javascript
let currentPage = 1;
let itemsPerPage = 50;
let totalItems = 0;
let totalPages = 1;

async function renderTxList(page = 1) {
  const el = document.getElementById('tx-list');
  el.innerHTML = '<div style="text-align:center">Carregando...</div>';
  
  const fCat = document.getElementById('filtroCategoria').value;
  const fDat = document.getElementById('filtroData').value;
  
  const skip = (page - 1) * itemsPerPage;
  const params = new URLSearchParams({
    limit: itemsPerPage,
    skip: skip,
    ...(fCat && { categoria: fCat }),
    ...(fDat && { startDate: fDat, endDate: fDat })
  });
  
  const result = await apiCall(`/transactions?${params.toString()}`);
  
  if (!result) {
    el.innerHTML = '<div class="small">Erro ao carregar</div>';
    return;
  }
  
  state.tx = result.data;
  totalItems = result.pagination.total;
  totalPages = result.pagination.pages;
  currentPage = result.pagination.page;
  
  if (state.tx.length === 0) {
    el.innerHTML = '<div class="small">Nenhuma transação</div>';
    renderPagination();
    return;
  }
  
  el.innerHTML = '';
  state.tx.forEach(t => {
    const dataFormatada = t.data.split('T')[0];
    el.innerHTML += `
      <div class="tx">
        <div class="meta">
          <div>
            <div style="font-weight:600">${t.descricao}</div>
            <div class="small">${t.categoria} - ${dataFormatada}</div>
          </div>
        </div>
        <div style="text-align:right">
          <div class="amount ${t.tipo}">${t.tipo === 'income' ? '+' : '-'} ${fmt(t.valor)}</div>
          <div style="margin-top:4px">
            <button class="ghost" style="font-size:10px;padding:4px" onclick="editTx('${t._id}')">Edit</button>
            <button class="ghost" style="font-size:10px;padding:4px" onclick="deleteTx('${t._id}')">Del</button>
          </div>
        </div>
      </div>`;
  });
  
  renderPagination();
}

function renderPagination() {
  let paginationEl = document.getElementById('pagination');
  
  if (!paginationEl) {
    paginationEl = document.createElement('div');
    paginationEl.id = 'pagination';
    paginationEl.style.cssText = 'display:flex;gap:8px;justify-content:center;margin-top:15px;flex-wrap:wrap';
    document.getElementById('tx-list').parentNode.appendChild(paginationEl);
  }
  
  paginationEl.innerHTML = '';
  
  // Botão anterior
  if (currentPage > 1) {
    const btnPrev = document.createElement('button');
    btnPrev.textContent = '← Anterior';
    btnPrev.className = 'ghost';
    btnPrev.onclick = () => renderTxList(currentPage - 1);
    paginationEl.appendChild(btnPrev);
  }
  
  // Números de página
  for (let i = 1; i <= totalPages && i <= 5; i++) {
    const btnPage = document.createElement('button');
    btnPage.textContent = i;
    btnPage.className = currentPage === i ? 'ghost' : 'ghost';
    if (currentPage === i) btnPage.style.color = 'var(--accent)';
    btnPage.onclick = () => renderTxList(i);
    paginationEl.appendChild(btnPage);
  }
  
  // Botão próximo
  if (currentPage < totalPages) {
    const btnNext = document.createElement('button');
    btnNext.textContent = 'Próximo →';
    btnNext.className = 'ghost';
    btnNext.onclick = () => renderTxList(currentPage + 1);
    paginationEl.appendChild(btnNext);
  }
}
```

---

## PARTE 6: ADICIONAR HELMET PARA SEGURANÇA

### `backend/src/server.js` (ATUALIZADO)

```javascript
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// ===== SECURITY HEADERS =====
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Remover unsafe-inline em produção
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.FRONTEND_URL]
    }
  },
  hsts: {
    maxAge: 31536000, // 1 ano
    includeSubDomains: true,
    preload: true
  }
}));

// ===== RATE LIMITING ESPECÍFICO =====
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 tentativas por IP
  message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // 10 chamadas de IA por minuto
  message: 'Limite de chamadas de IA excedido'
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip: (req) => req.path === '/api/health'
});

app.use('/api/', generalLimiter);
app.use('/api/auth/login', loginLimiter);
app.use('/api/ai/ask', aiLimiter);

// ... resto do código
```

### Instalar
```bash
cd backend
npm install helmet express-async-errors
```

---

## PARTE 7: LOGGING PROFISSIONAL

### `backend/src/logger.js`

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'box-control-api' },
  transports: [
    // Erros em arquivo separado
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    }),
    // Todos os logs
    new winston.transports.File({
      filename: 'logs/combined.log'
    })
  ]
});

// Em desenvolvimento, também logar no console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

module.exports = logger;
```

### Usar em rotas

```javascript
const logger = require('../logger');

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    logger.info('Login attempt', { email, ip: req.ip });
    
    const user = await User.findOne({ email });
    if (!user) {
      logger.warn('Failed login - user not found', { email, ip: req.ip });
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    logger.info('Successful login', { userId: user._id, ip: req.ip });
    // ...
  } catch (err) {
    logger.error('Login error', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

---

**Próximos passos:**
1. Implementar as mudanças de segurança crítica (Parte 2)
2. Eliminar duplicação com utils.js (Parte 1)
3. Adicionar validações com Joi (Parte 3)
4. Melhorar responsividade (Parte 4)
5. Implementar paginação (Parte 5)
6. Adicionar segurança (Parte 6-7)
