/* ==================================================
   CONFIGURAÇÃO DO GOOGLE SHEETS
   ================================================== */
const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbx6IZIo7LJOSNYF8FcIz1cZ1cNeGOijH57Of2_MW6REH-BNIp7r9MigIce7bF3q5rdU/exec';

/* ==================================================
   MODAL PERSONALIZADO & UTILITÁRIOS
   ================================================== */
function showConfirm(message, onConfirm) {
  document.getElementById('modal-msg').textContent = message;
  document.getElementById('custom-modal').style.display = 'flex';
  const btn = document.getElementById('modal-confirm-btn');
  const newBtn = btn.cloneNode(true);
  newBtn.textContent = "Confirmar";
  btn.parentNode.replaceChild(newBtn, btn);
  newBtn.addEventListener('click', () => {
    closeModal();
    if (onConfirm) onConfirm();
  });
}

function showAlert(message) {
  document.getElementById('modal-msg').textContent = message;
  document.getElementById('custom-modal').style.display = 'flex';
  const btn = document.getElementById('modal-confirm-btn');
  const newBtn = btn.cloneNode(true);
  newBtn.textContent = "OK";
  btn.parentNode.replaceChild(newBtn, btn);
  newBtn.addEventListener('click', () => closeModal());
}

function closeModal() { document.getElementById('custom-modal').style.display = 'none'; }

function showToast(msg) {
  const x = document.getElementById("toast");
  x.textContent = msg; x.className = "show";
  setTimeout(() => x.className = x.className.replace("show", ""), 3000);
}

function syncToGoogle(payload) {
  if(!GOOGLE_SHEETS_URL || GOOGLE_SHEETS_URL.includes('COLE_SUA')) return;
  showToast("Sincronizando...");
  fetch(GOOGLE_SHEETS_URL, {
    method: 'POST', mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).catch(err => console.error(err));
}

/* ==================================================
   GESTÃO DE DADOS
   ================================================== */
let currentUser = null;
let state = { tx: [], categories: [], recurring: [], licenseKey: null }; 

function getStorageKey() {
  if(!currentUser) return null;
  return 'boxmotors_data_' + currentUser.email.replace(/[^a-z0-9]/gi, '_');
}

function loadState() {
  const key = getStorageKey();
  if(!key) return;
  try {
    const raw = localStorage.getItem(key);
    if(raw) state = JSON.parse(raw);
    else state = { tx:[], categories:[], recurring:[], licenseKey: null };
    
    if(!state.recurring) state.recurring = [];
    if(!state.categories) state.categories = [];
    if(!state.tx) state.tx = [];
    if(state.licenseKey === undefined) state.licenseKey = null;
  } catch(e) { console.error(e); }
}

function saveState() {
  const key = getStorageKey();
  if(key) localStorage.setItem(key, JSON.stringify(state));
}

/* ==================================================
   AUTENTICAÇÃO
   ================================================== */
const ADMIN_USER = { email: 'admin', pass: '1570', name: 'Master' };

function toggleAuth(view) {
  document.getElementById('login-view').style.display = view === 'login' ? 'block' : 'none';
  document.getElementById('register-view').style.display = view === 'register' ? 'block' : 'none';
}

function doLogin() {
  const u = document.getElementById('loginUser').value.trim();
  const p = document.getElementById('loginPass').value.trim();
  if(u === ADMIN_USER.email && p === ADMIN_USER.pass) { setUser(ADMIN_USER); return; }
  const localUsers = JSON.parse(localStorage.getItem('boxmotors_users_db') || '[]');
  const found = localUsers.find(user => user.email === u && user.pass === p);
  if(found) setUser(found); else document.getElementById('loginError').style.display = 'block';
}

function setUser(user) {
  currentUser = user;
  sessionStorage.setItem('boxmotors_logged_user', JSON.stringify(user));
  document.getElementById('auth-container').style.display = 'none';
  document.getElementById('app-content').style.display = 'block';
  document.getElementById('currentUserDisplay').textContent = `Logado: ${user.name || user.email}`;
  loadState(); initApp();
}

function doLogout() { sessionStorage.removeItem('boxmotors_logged_user'); currentUser = null; location.reload(); }

function doRegister() {
  const name = document.getElementById('regName').value;
  const email = document.getElementById('regEmail').value;
  const phone = document.getElementById('regPhone').value;
  const pass = document.getElementById('regPass').value;
  const btn = document.getElementById('btnReg');
  if(!email || !pass || !name) return showAlert('Preencha todos os campos.');
  
  btn.disabled = true; btn.textContent = "Salvando...";
  const newUser = { name, email, phone, pass };
  syncToGoogle({ action: 'register', nome: name, email: email, telefone: phone, senha: pass });
  
  const localUsers = JSON.parse(localStorage.getItem('boxmotors_users_db') || '[]');
  if(localUsers.find(u => u.email === email)) { showAlert('Usuário já existe.'); btn.disabled = false; btn.textContent = "Cadastrar"; return; }
  
  localUsers.push(newUser);
  localStorage.setItem('boxmotors_users_db', JSON.stringify(localUsers));
  
  showAlert('✅ Conta criada com sucesso! Realizando login...');
  setUser(newUser);
  btn.disabled = false; 
  btn.textContent = "Cadastrar";
}

function resetSystemUsers() {
  const password = prompt("Digite a senha do Admin:");
  if (password === "1570") {
    showConfirm("TEM CERTEZA? Isso excluirá todos os logins.", () => {
      localStorage.removeItem('boxmotors_users_db');
      showAlert("Resetado com sucesso!"); location.reload();
    });
  } else if (password !== null) { showAlert("Senha incorreta."); }
}

/* ==================================================
   CORE APP
   ================================================== */
const DEFAULT_CATS = ['Combustível','Peças','Serviços','Marketing','Outros'];

function initApp() {
  document.getElementById('data').value = new Date().toISOString().slice(0,10);
  ensureDefaults(); applyTheme(); checkLicense(); updateUI();
}

function ensureDefaults() {
  if(!state.categories || state.categories.length === 0) { state.categories = [...DEFAULT_CATS]; saveState(); }
  const opts = state.categories.map(c => `<option value="${c}">${c}</option>`).join('');
  document.getElementById('categoria').innerHTML = opts;
  document.getElementById('filtroCategoria').innerHTML = '<option value="">Todas</option>' + opts;
}

function updateUI() { renderTxList(); renderChart(); updateTotals(); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).substr(2); }
function fmt(n) { return 'R$ ' + Number(n).toFixed(2).replace('.',','); }

// CRUD Transações
document.getElementById('addTx').addEventListener('click', () => { if(!canAdd()) return; saveTx(uid()); });
document.getElementById('updateTx').addEventListener('click', () => { saveTx(document.getElementById('editingId').value); });

function saveTx(id) {
  const tipo = document.getElementById('tipo').value;
  const cat = document.getElementById('categoria').value;
  const desc = document.getElementById('descricao').value.trim();
  const val = Number(document.getElementById('valor').value);
  const dt = document.getElementById('data').value;
  if(!val || val<=0) return showAlert('Valor inválido');
  
  const idx = state.tx.findIndex(t => t.id === id);
  const txObj = { id, tipo, categoria: cat, descricao: desc, valor: val, data: dt };
  
  // Sincronia Google
  syncToGoogle({ action: 'transaction', userEmail: currentUser.email, ...txObj });

  if(idx >= 0) state.tx[idx] = txObj;
  else state.tx.push(txObj);

  cancelEdit(); saveState(); updateUI();
}

function editTx(id) {
  const t = state.tx.find(x => x.id === id);
  if(!t) return;
  document.getElementById('tipo').value = t.tipo;
  document.getElementById('categoria').value = t.categoria;
  document.getElementById('descricao').value = t.descricao;
  document.getElementById('valor').value = t.valor;
  document.getElementById('data').value = t.data;
  document.getElementById('editingId').value = id;
  document.getElementById('addTx').style.display='none';
  document.getElementById('updateTx').style.display='inline-block';
  document.getElementById('cancelEdit').style.display='inline-block';
}

function deleteTx(id) {
  showConfirm('Apagar esta transação?', () => {
    state.tx = state.tx.filter(t => t.id !== id);
    if(document.getElementById('editingId').value === id) cancelEdit();
    saveState(); updateUI();
  });
}

function cancelEdit() {
  document.getElementById('descricao').value = '';
  document.getElementById('valor').value = '';
  document.getElementById('editingId').value = '';
  document.getElementById('addTx').style.display='inline-block';
  document.getElementById('updateTx').style.display='none';
  document.getElementById('cancelEdit').style.display='none';
}

function renderTxList() {
  const el = document.getElementById('tx-list'); el.innerHTML = '';
  const fCat = document.getElementById('filtroCategoria').value;
  const fDat = document.getElementById('filtroData').value;
  const list = state.tx.filter(t => {
    if(fCat && t.categoria !== fCat) return false;
    if(fDat && t.data !== fDat) return false;
    return true;
  }).sort((a,b) => b.data.localeCompare(a.data));

  list.forEach(t => {
    el.innerHTML += `
      <div class="tx">
        <div class="meta"><div><div style="font-weight:600">${t.descricao}</div><div class="small">${t.categoria} - ${t.data}</div></div></div>
        <div style="text-align:right">
          <div class="amount ${t.tipo}">${t.tipo==='income'?'+':'-'} ${fmt(t.valor)}</div>
          <div style="margin-top:4px"><button class="ghost" style="font-size:10px;padding:4px" onclick="editTx('${t.id}')">Edit</button><button class="ghost" style="font-size:10px;padding:4px" onclick="deleteTx('${t.id}')">Del</button></div>
        </div>
      </div>`;
  });
}

function updateTotals() {
  const inc = state.tx.filter(t=>t.tipo==='income').reduce((a,b)=>a+b.valor,0);
  const exp = state.tx.filter(t=>t.tipo==='expense').reduce((a,b)=>a+b.valor,0);
  document.getElementById('saldo').textContent = fmt(inc - exp);
  document.getElementById('receitas').textContent = fmt(inc);
  document.getElementById('despesas').textContent = fmt(exp);
}

document.getElementById('aplicarFiltro').addEventListener('click', updateUI);
document.getElementById('limparFiltro').addEventListener('click', ()=>{ document.getElementById('filtroCategoria').value=''; document.getElementById('filtroData').value=''; updateUI(); });

function renderChart() {
  const cv = document.getElementById('chart'); const ctx = cv.getContext('2d');
  ctx.clearRect(0,0,cv.width,cv.height);
  const sums = {}; 
  state.tx.filter(t=>t.tipo==='expense').forEach(t => sums[t.categoria] = (sums[t.categoria]||0) + t.valor);
  const data = Object.entries(sums).sort((a,b)=>b[1]-a[1]);
  if(!data.length) { ctx.fillStyle='#555'; ctx.fillText('Sem dados', 10,20); return; }
  let y=10; const max = data[0][1] || 1;
  data.forEach(([k,v], i) => {
    const w = (v/max) * (cv.width - 120);
    ctx.fillStyle = `hsl(${i*50}, 70%, 50%)`; ctx.fillRect(100, y, w, 20);
    ctx.fillStyle = '#fff'; ctx.fillText(k, 10, y+14); ctx.fillText(fmt(v), 100+w+5, y+14);
    y += 30;
  });
}

/* ==================================================
   BACKUP/RESTORE
   ================================================== */
function toggleBackupMenu() {
  if(!isPro()) { showAlert("Função exclusiva da versão PRO."); return; }
  const menu = document.getElementById('backupMenu');
  menu.style.display = (menu.style.display === 'block') ? 'none' : 'block';
}
document.getElementById('exportJson').addEventListener('click', () => {
  if(!isPro()) return showAlert("Backup é função PRO.");
  downloadFile(JSON.stringify(state), 'json', 'application/json');
});
document.getElementById('exportCsv').addEventListener('click', () => {
  if(!isPro()) return showAlert("Exportar é função PRO.");
  if(!state.tx || state.tx.length === 0) return showAlert('Sem dados.');
  let csv = "\uFEFFID;Tipo;Categoria;Descrição;Valor;Data\n";
  state.tx.forEach(r => csv += `${r.id};${r.tipo};${r.categoria};"${(r.descricao||'').replace(/"/g,'""')}";${String(r.valor).replace('.',',')};${r.data}\n`);
  downloadFile(csv, 'csv', 'text/csv;charset=utf-8;');
});
function downloadFile(content, ext, type) {
  const blob = new Blob([content], { type: type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `backup_${new Date().toISOString().slice(0,10)}.${ext}`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}
function processRestore(input) {
  if(!isPro()) return input.value='', showAlert("Restauração é função PRO.");
  const file = input.files[0]; if(!file) return;
  if(!file.name.endsWith('.json')) { showAlert("ERRO: Selecione o arquivo .json"); input.value=''; return; }
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if(Array.isArray(data.tx) || Array.isArray(data.oil) || Array.isArray(data.recurring)) {
        showConfirm("Isso irá SUBSTITUIR seus dados. Continuar?", () => {
           const lic = state.licenseKey;
           state = data;
           if(!state.tx) state.tx = [];
           if(!state.categories) state.categories = [];
           if(!state.recurring) state.recurring = [];
           if(!state.oil) state.oil = [];
           if(lic === 'BOXPRO') state.licenseKey = 'BOXPRO';
           saveState(); 
           showAlert("✅ Restaurado!"); 
           location.reload();
        });
      } else showAlert("Arquivo inválido.");
    } catch(err) { 
      console.error('Restore error:', err);
      showAlert("Erro ao ler arquivo."); 
    }
  };
  reader.readAsText(file);
}

/* ==================================================
   RECORRENTES
   ================================================== */
let recFocusDate = new Date();
function getMonthKey(d) { return d.getFullYear() + '-' + (d.getMonth()+1); }
function formatMonth(d) { const opts = { year:'numeric', month:'long' }; return d.toLocaleDateString('pt-BR', opts); }
function setRecMonth(dateObj) {
  recFocusDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
  document.getElementById('recMonthLabel').textContent = formatMonth(recFocusDate);
  renderRecList();
}
function prevRecMonth() { const d = new Date(recFocusDate); d.setMonth(d.getMonth() - 1); setRecMonth(d); }
function nextRecMonth() { const d = new Date(recFocusDate); d.setMonth(d.getMonth() + 1); setRecMonth(d); }
function openRecurring() { document.querySelector('main').style.display='none'; document.getElementById('rec-page').style.display='block'; setRecMonth(recFocusDate || new Date()); }
function closePages() { 
  document.getElementById('cat-page').style.display='none'; 
  document.getElementById('rec-page').style.display='none'; 
  document.getElementById('oil-page').style.display='none';
  document.getElementById('about-page').style.display='none';
  document.getElementById('privacy-page').style.display='none';
  document.getElementById('settings-page').style.display='none';
  document.getElementById('change-password-modal').style.display='none';
  document.querySelector('main').style.display='grid'; 
  ensureDefaults(); 
}

function saveRecurring() {
  const id = document.getElementById('recEditId').value; 
  const desc = document.getElementById('recDesc').value.trim();
  const val = Number(document.getElementById('recValor').value);
  const dia = document.getElementById('recDia').value;
  if(!desc || !val) return showAlert('Preencha os dados.');
  if(!state.recurring) state.recurring = [];

  const existing = id ? state.recurring.find(r => r.id === id) : null;
  const newItem = { id: id || uid(), desc, valor: val, dia, history: (existing && existing.history) ? existing.history : {} };

  if(id) { const idx = state.recurring.findIndex(r => r.id === id); if(idx >= 0) state.recurring[idx] = newItem; else state.recurring.push(newItem); } 
  else { state.recurring.push(newItem); }

  saveState(); resetRecForm(); renderRecList(); showToast("Salvo!");
}
function editRec(id) {
  const r = state.recurring.find(x => x.id === id); if(!r) return;
  document.getElementById('recDesc').value = r.desc; document.getElementById('recValor').value = r.valor;
  document.getElementById('recDia').value = r.dia; document.getElementById('recEditId').value = id;
  document.getElementById('recFormTitle').textContent = "Editando"; document.getElementById('btnSaveRec').textContent = "Atualizar";
  document.getElementById('btnCancelRec').style.display = "inline-block";
}
function deleteRec(id) { showConfirm('Apagar regra?', () => { state.recurring = state.recurring.filter(r => r.id !== id); saveState(); renderRecList(); resetRecForm(); }); }
function markRecPaid(id) {
  const r = state.recurring.find(x => x.id === id); if(!r) return;
  if(!r.history) r.history = {};
  const key = getMonthKey(recFocusDate);
  r.history[key] = (r.history[key] === 'pago') ? 'pendente' : 'pago';
  saveState(); renderRecList();
}
function resetRecForm() {
  document.getElementById('recDesc').value=''; document.getElementById('recValor').value=''; document.getElementById('recDia').value='';
  document.getElementById('recEditId').value=''; document.getElementById('recFormTitle').textContent = "Nova Recorrente";
  document.getElementById('btnSaveRec').textContent = "Salvar"; document.getElementById('btnCancelRec').style.display = "none";
}
function renderRecList() {
  const el = document.getElementById('rec-list'); el.innerHTML = '';
  let total = 0, paid = 0, pending = 0;
  const key = getMonthKey(recFocusDate);
  if(state.recurring && state.recurring.length > 0) {
    state.recurring.forEach(r => {
      const status = (r.history && r.history[key]) ? r.history[key] : 'pendente';
      total += r.valor; if(status === 'pago') paid += r.valor; else pending += r.valor;
      el.innerHTML += `<div class="rec-item"><div class="meta"><div><div style="font-weight:600">${r.desc}</div><div class="small">Dia ${r.dia||'-'} <span class="tag ${status}">${status}</span></div></div><div style="display:flex;gap:6px"><button class="ghost" style="font-size:12px;padding:6px" onclick="markRecPaid('${r.id}')">👍</button><button class="ghost" style="font-size:10px;padding:4px" onclick="editRec('${r.id}')">✏️</button><button class="ghost" style="font-size:10px;padding:4px" onclick="deleteRec('${r.id}')">🗑️</button></div></div><div style="text-align:right"><div class="amount expense">${fmt(r.valor)}</div></div></div>`;
    });
  } else el.innerHTML = '<div class="small" style="text-align:center;padding:10px">Vazio.</div>';
  document.getElementById('recTotal').textContent = fmt(total); document.getElementById('recPaid').textContent = fmt(paid); document.getElementById('recPending').textContent = fmt(pending);
}

/* ==================================================
   EXTRAS
   ================================================== */
function openCategories() { document.querySelector('main').style.display='none'; document.getElementById('cat-page').style.display='block'; renderCatList(); }
function addCat() { const n = document.getElementById('newCatName').value.trim(); if(n && !state.categories.includes(n)) { state.categories.push(n); document.getElementById('newCatName').value=''; saveState(); renderCatList(); } }
function renderCatList() { const el = document.getElementById('cat-list'); el.innerHTML=''; state.categories.forEach((c, i) => { el.innerHTML += `<div class="tx"><span>${c}</span><button class="ghost" onclick="delCat(${i})">X</button></div>`; }); }
function delCat(i) { showConfirm('Apagar categoria?', () => { state.categories.splice(i,1); saveState(); renderCatList(); }); }

const DEMO_LIMIT = 10;
function isPro() { return state.licenseKey === 'BOXPRO'; }
function checkLicense() {
  const backupBtn = document.getElementById('backupBtn');
  const aiMicBtn = document.getElementById('aiMic');
  if(isPro()) {
    document.getElementById('demoBadge').style.display='none'; document.getElementById('licenseKey').style.display='none';
    document.getElementById('buyBtn').style.display='none'; document.getElementById('commercialArea').style.display='none';
    document.getElementById('proMenu').style.display='inline-flex'; document.getElementById('resetAll').disabled = false;
    if(backupBtn) backupBtn.style.display = 'inline-block';
    if(aiMicBtn) aiMicBtn.style.display = 'inline-block';
  } else {
    document.getElementById('demoBadge').style.display='inline-block'; document.getElementById('licenseKey').style.display='inline-block';
    document.getElementById('buyBtn').style.display='inline-block'; document.getElementById('commercialArea').style.display='flex';
    document.getElementById('proMenu').style.display='none'; document.getElementById('resetAll').disabled = true;
    if(backupBtn) backupBtn.style.display = 'none';
    if(aiMicBtn) aiMicBtn.style.display = 'none';
  }
}
function canAdd() {
  if(isPro()) return true;
  if(state.tx.length >= DEMO_LIMIT) { showConfirm('Limite DEMO atingido. Comprar versão PRO?', () => openLink()); return false; }
  return true;
}
function activateLicense() { 
  const k = document.getElementById('licenseKey').value; 
  if(k === 'BOXPRO') { state.licenseKey = k; saveState(); showAlert('Ativado!'); location.reload(); } else showAlert('Chave inválida'); 
}
function revokeLicense() { showConfirm("Desativar licença?", () => { state.licenseKey = null; saveState(); location.reload(); }); }
function openLink() { window.open('https://linktr.ee/BoxMotors'); }
document.getElementById('resetAll').addEventListener('click', () => { if(!isPro()) return showAlert('Função PRO.'); showConfirm('TEM CERTEZA? Apagará tudo.', () => { state = { tx:[], categories:[...DEFAULT_CATS], recurring:[], licenseKey: state.licenseKey }; saveState(); location.reload(); }); });
function applyTheme() { const t = localStorage.getItem('boxmotors_theme'); if(t === 'light') document.body.setAttribute('data-theme', 'light'); else document.body.removeAttribute('data-theme'); }
function toggleTheme() { const c = localStorage.getItem('boxmotors_theme'); const n = c === 'light' ? 'dark' : 'light'; localStorage.setItem('boxmotors_theme', n); applyTheme(); }

(function() { const s = sessionStorage.getItem('boxmotors_logged_user'); if(s) setUser(JSON.parse(s)); })();

if (!state.oil) state.oil = [];

function openOil() {
  document.querySelector('main').style.display = 'none';
  document.getElementById('oil-page').style.display = 'block';
  renderOilList();
}

function saveOil() {
  const id = document.getElementById('oilEditId').value;
  const item = {
    id: id || uid(),
    cliente: document.getElementById('oilCliente').value,
    moto: document.getElementById('oilMoto').value,
    kmProx: document.getElementById('oilKmProx').value,
    data: document.getElementById('oilData').value
  };

  if(!item.cliente || !item.moto) return showAlert("Preencha os dados");

  if(id) {
    const i = state.oil.findIndex(o => o.id === id);
    state.oil[i] = item;
  } else {
    state.oil.push(item);
  }

  saveState();
  resetOilForm();
  renderOilList();
  showToast("Salvo!");
}

function renderOilList() {
  const el = document.getElementById('oil-list');
  el.innerHTML = '';

  if(!state.oil.length) {
    el.innerHTML = '<div class="small" style="text-align:center">Nenhum registro</div>';
    return;
  }

  state.oil.forEach(o => {
    el.innerHTML += `
      <div class="tx">
        <div>
          <strong>${o.cliente}</strong>
          <div class="small">${o.moto} | Próx: ${o.kmProx} km</div>
        </div>
        <div>
          <button class="ghost" onclick="editOil('${o.id}')">✏️</button>
          <button class="ghost" onclick="deleteOil('${o.id}')">🗑️</button>
        </div>
      </div>
    `;
  });
}

function editOil(id) {
  const o = state.oil.find(x => x.id === id);
  document.getElementById('oilCliente').value = o.cliente;
  document.getElementById('oilMoto').value = o.moto;
  document.getElementById('oilKmProx').value = o.kmProx;
  document.getElementById('oilData').value = o.data;
  document.getElementById('oilEditId').value = id;
  document.getElementById('btnCancelOil').style.display = 'inline-block';
  document.getElementById('oilFormTitle').textContent = 'Editando';
}

function deleteOil(id) {
  showConfirm("Apagar registro?", () => {
    state.oil = state.oil.filter(o => o.id !== id);
    saveState();
    renderOilList();
  });
}

function resetOilForm() {
  document.getElementById('oilCliente').value = '';
  document.getElementById('oilMoto').value = '';
  document.getElementById('oilKmProx').value = '';
  document.getElementById('oilData').value = '';
  document.getElementById('oilEditId').value = '';
  document.getElementById('btnCancelOil').style.display = 'none';
  document.getElementById('oilFormTitle').textContent = 'Nova Troca';
}

function openAbout() {
  document.querySelector('main').style.display='none';
  document.getElementById('about-page').style.display='block';
}

function openPrivacy() {
  document.querySelector('main').style.display='none';
  document.getElementById('privacy-page').style.display='block';
}

function toggleSettings() {
  document.querySelector('main').style.display = 'none';
  document.getElementById('settings-page').style.display = 'block';
}

function openChangePassword() {
  document.getElementById('settings-page').style.display = 'none';
  document.getElementById('change-password-modal').style.display = 'block';
  document.getElementById('currentPassword').value = '';
  document.getElementById('newPassword').value = '';
  document.getElementById('confirmPassword').value = '';
}

function closePasswordModal() {
  document.getElementById('change-password-modal').style.display = 'none';
  document.getElementById('settings-page').style.display = 'block';
}

function saveNewPassword() {
  const current = document.getElementById('currentPassword').value;
  const newPass = document.getElementById('newPassword').value;
  const confirm = document.getElementById('confirmPassword').value;
  
  if (!current || !newPass || !confirm) {
    return showAlert('Preencha todos os campos');
  }
  
  if (newPass !== confirm) {
    return showAlert('As senhas não coincidem');
  }
  
  if (newPass.length < 4) {
    return showAlert('Senha deve ter no mínimo 4 caracteres');
  }
  
  if (current === newPass) {
    return showAlert('Nova senha deve ser diferente da atual');
  }
  
  try {
    const localUsers = JSON.parse(localStorage.getItem('boxmotors_users_db') || '[]');
    const userIdx = localUsers.findIndex(u => u.email === currentUser.email);
    
    if (userIdx >= 0) {
      if (localUsers[userIdx].pass !== current) {
        return showAlert('Senha atual incorreta');
      }
      
      localUsers[userIdx].pass = newPass;
      currentUser.pass = newPass;
      localStorage.setItem('boxmotors_users_db', JSON.stringify(localUsers));
      showAlert('✅ Senha alterada com sucesso!');
      closePasswordModal();
      document.getElementById('settings-page').style.display = 'block';
    } else {
      showAlert('Erro: Usuário não encontrado');
    }
  } catch (e) {
    showAlert('Erro ao alterar senha');
  }
}

function openDeleteAccount() {
  showConfirm('⚠️ ATENÇÃO: Isso vai DELETAR sua conta PERMANENTEMENTE e todos seus dados. Tem certeza?', () => {
    const password = prompt('Digite sua senha para confirmar:');
    if (password === currentUser.pass) {
      deleteUserAccount();
    } else if (password !== null) {
      showAlert('Senha incorreta');
    }
  });
}

function deleteUserAccount() {
  try {
    const localUsers = JSON.parse(localStorage.getItem('boxmotors_users_db') || '[]');
    const filtered = localUsers.filter(u => u.email !== currentUser.email);
    localStorage.setItem('boxmotors_users_db', JSON.stringify(filtered));
    
    const key = getStorageKey();
    if (key) localStorage.removeItem(key);
    
    showAlert('✅ Conta deletada. Redirecionando...');
    setTimeout(() => {
      doLogout();
    }, 2000);
  } catch (e) {
    showAlert('Erro ao deletar conta');
  }
}

function openAboutFromSettings() {
  document.getElementById('settings-page').style.display = 'none';
  document.getElementById('about-page').style.display = 'block';
}
