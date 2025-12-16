// ============================================
// MÓDULO COMPARTILHADO DE ÓLEO (Sem duplicação)
// ============================================
// Use este arquivo para substituir a duplicação entre app.js e app-api.js

class OilModule {
  
  // Obter valores do formulário
  static getFormValues() {
    return {
      id: document.getElementById('oilEditId').value,
      cliente: document.getElementById('oilCliente').value,
      moto: document.getElementById('oilMoto').value,
      kmProx: document.getElementById('oilKmProx').value,
      data: document.getElementById('oilData').value
    };
  }

  // Validar formulário
  static validate(item) {
    if (!item.cliente || !item.moto) {
      showAlert('Preencha cliente e moto');
      return false;
    }
    if (!item.kmProx || Number(item.kmProx) <= 0) {
      showAlert('KM próxima deve ser maior que 0');
      return false;
    }
    if (!item.data) {
      showAlert('Selecione a data');
      return false;
    }
    return true;
  }

  // Limpar formulário
  static resetForm() {
    document.getElementById('oilCliente').value = '';
    document.getElementById('oilMoto').value = '';
    document.getElementById('oilKmProx').value = '';
    document.getElementById('oilData').value = '';
    document.getElementById('oilEditId').value = '';
    document.getElementById('btnCancelOil').style.display = 'none';
    document.getElementById('oilFormTitle').textContent = 'Nova Troca';
  }

  // Preencher formulário para edição
  static fillForm(oil) {
    document.getElementById('oilCliente').value = oil.cliente;
    document.getElementById('oilMoto').value = oil.moto;
    document.getElementById('oilKmProx').value = oil.kmProx;
    document.getElementById('oilData').value = oil.data;
    document.getElementById('oilEditId').value = oil.id;
    document.getElementById('btnCancelOil').style.display = 'inline-block';
    document.getElementById('oilFormTitle').textContent = 'Editando';
  }

  // Calcular dias restantes
  static calcularDiasRestantes(dataString) {
    if (!dataString) return null;
    const data = new Date(dataString + 'T00:00:00');
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dias = Math.floor((data - hoje) / (1000 * 60 * 60 * 24));
    return dias;
  }

  // Obter status de cor
  static getStatus(dias) {
    if (dias === null) return 'oil-item-oil-aviso';
    if (dias < 0) return 'oil-item-oil-atrasado';
    if (dias <= 5) return 'oil-item-oil-aviso';
    return 'oil-item-oil-ok';
  }

  // Formatar dias para exibição
  static formatarDias(dias) {
    if (dias === null) return '? dias';
    if (dias < 0) return `${Math.abs(dias)} dias atrasado`;
    if (dias === 0) return 'Hoje!';
    return `${dias} dias`;
  }

  // Renderizar item da lista
  static renderItem(oil) {
    const dias = this.calcularDiasRestantes(oil.data);
    const status = this.getStatus(dias);
    const diasText = this.formatarDias(dias);
    const dataFormatada = new Date(oil.data + 'T00:00:00')
      .toLocaleDateString('pt-BR');

    return `
      <div class="oil-item ${status}">
        <div>
          <div style="font-weight:600">${oil.moto}</div>
          <div style="font-size:12px;color:var(--muted)">
            ${oil.cliente} • ${dataFormatada}
          </div>
          <div style="font-size:13px;margin-top:4px">
            Próxima: ${oil.kmProx}km
          </div>
          <div style="font-size:13px;color:var(--accent);margin-top:2px">
            ⏱️ ${diasText}
          </div>
        </div>
        <div style="display:flex;gap:4px">
          <button onclick="OilModule.edit('${oil.id}')" 
                  class="ghost" style="width:auto;padding:6px 8px">✏️</button>
          <button onclick="OilModule.delete('${oil.id}')" 
                  class="ghost" style="width:auto;padding:6px 8px">🗑️</button>
        </div>
      </div>
    `;
  }

  // Chamar API ou localStorage (implementar no app-api.js)
  static async save(item) {
    throw new Error('Implemente save() em OilModule');
  }

  // Deletar (implementar no app-api.js)
  static async delete(id) {
    throw new Error('Implemente delete() em OilModule');
  }

  // Editar (implementar no app-api.js)
  static async edit(id) {
    const oil = state.oil.find(o => o.id === id);
    if (oil) this.fillForm(oil);
  }
}

// ============================================
// UTILIDADES DE VALIDAÇÃO (Sem duplicação)
// ============================================

class ValidationModule {

  // Email válido?
  static isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // Senha forte?
  static isStrongPassword(pass) {
    if (pass.length < 6) return false;
    // Mínimo: 6 caracteres
    return true;
  }

  // Valor monetário válido?
  static isValidMoney(value) {
    const num = Number(value);
    return !isNaN(num) && num > 0;
  }

  // Data válida?
  static isValidDate(dateStr) {
    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date);
  }

  // Validar formulário genérico
  static validate(rules) {
    for (const [field, rule] of Object.entries(rules)) {
      const value = document.getElementById(field)?.value || '';
      
      if (rule.required && !value.trim()) {
        showAlert(`${rule.label} é obrigatório`);
        return false;
      }
      
      if (rule.type === 'email' && !this.isValidEmail(value)) {
        showAlert(`${rule.label} inválido`);
        return false;
      }
      
      if (rule.type === 'money' && !this.isValidMoney(value)) {
        showAlert(`${rule.label} deve ser um número positivo`);
        return false;
      }
      
      if (rule.minLength && value.length < rule.minLength) {
        showAlert(`${rule.label} deve ter no mínimo ${rule.minLength} caracteres`);
        return false;
      }
    }
    return true;
  }
}

// ============================================
// DOM UTILITIES (Sem duplicação)
// ============================================

class DOMModule {

  // Obter valores de múltiplos inputs
  static getFormData(fieldIds) {
    return Object.fromEntries(
      Object.entries(fieldIds).map(([key, id]) => 
        [key, document.getElementById(id)?.value || '']
      )
    );
  }

  // Setar valores em múltiplos inputs
  static setFormData(fieldIds, data) {
    Object.entries(fieldIds).forEach(([key, id]) => {
      const el = document.getElementById(id);
      if (el) el.value = data[key] || '';
    });
  }

  // Mostrar/esconder elemento
  static toggle(id, show) {
    const el = document.getElementById(id);
    if (el) {
      el.style.display = show ? 'block' : 'none';
    }
  }

  // Adicionar classe
  static addClass(id, className) {
    const el = document.getElementById(id);
    if (el) el.classList.add(className);
  }

  // Remover classe
  static removeClass(id, className) {
    const el = document.getElementById(id);
    if (el) el.classList.remove(className);
  }

  // Ativar/desativar botão
  static setButtonState(id, disabled, text) {
    const btn = document.getElementById(id);
    if (btn) {
      btn.disabled = disabled;
      if (text) btn.textContent = text;
    }
  }

  // Renderizar lista
  static renderList(containerId, items, renderFn, emptyMessage = 'Nenhum item') {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (items.length === 0) {
      container.innerHTML = `<div class="small" style="text-align:center;padding:10px">${emptyMessage}</div>`;
    } else {
      container.innerHTML = items.map(renderFn).join('');
    }
  }
}

// ============================================
// STORAGE UTILITIES (Sem duplicação)
// ============================================

class StorageModule {

  // Salvar com expiração
  static setWithExpiry(key, value, expiryMinutes) {
    const now = new Date();
    const item = {
      value: value,
      expiry: now.getTime() + expiryMinutes * 60000
    };
    localStorage.setItem(key, JSON.stringify(item));
  }

  // Obter com validação de expiração
  static getWithExpiry(key) {
    const item = localStorage.getItem(key);
    if (!item) return null;

    const data = JSON.parse(item);
    if (new Date().getTime() > data.expiry) {
      localStorage.removeItem(key);
      return null;
    }
    return data.value;
  }

  // Limpar storage com padrão
  static clearMatching(pattern) {
    const regex = new RegExp(pattern);
    Object.keys(localStorage).forEach(key => {
      if (regex.test(key)) {
        localStorage.removeItem(key);
      }
    });
  }

  // Backup estruturado
  static createBackup(data) {
    const backup = {
      timestamp: new Date().toISOString(),
      version: '2.0',
      data: data
    };
    return JSON.stringify(backup, null, 2);
  }

  // Restaurar backup com validação
  static restoreBackup(backupStr) {
    try {
      const backup = JSON.parse(backupStr);
      if (backup.version !== '2.0') {
        throw new Error('Versão incompatível');
      }
      return backup.data;
    } catch (e) {
      console.error('Erro ao restaurar backup:', e);
      return null;
    }
  }
}

// ============================================
// EXEMPLO DE USO - ANTES (Duplicado)
// ============================================
/*
// app.js
function saveOil(id = null) {
  const item = {
    id: id || uid(),
    cliente: document.getElementById('oilCliente').value,
    moto: document.getElementById('oilMoto').value,
    kmProx: document.getElementById('oilKmProx').value,
    data: document.getElementById('oilData').value
  };
  if(!item.cliente || !item.moto) return showAlert("Preencha os dados");
  // ... resto do código
}

// app-api.js
async function saveOil(id = null) {
  const item = {
    id: id || uid(),
    cliente: document.getElementById('oilCliente').value,
    moto: document.getElementById('oilMoto').value,
    kmProx: document.getElementById('oilKmProx').value,
    data: document.getElementById('oilData').value
  };
  if(!item.cliente || !item.moto) return showAlert("Preencha os dados");
  // ... mesmo código repetido
}
*/

// ============================================
// EXEMPLO DE USO - DEPOIS (Limpo)
// ============================================
/*
function saveOil(id = null) {
  const item = OilModule.getFormValues();
  item.id = item.id || uid();
  
  if (!OilModule.validate(item)) return;
  
  OilModule.save(item);
}

function renderOilList() {
  DOMModule.renderList(
    'oil-list',
    state.oil,
    oil => OilModule.renderItem(oil),
    'Nenhuma troca registrada'
  );
}

function editOil(id) {
  OilModule.edit(id);
}

function deleteOil(id) {
  OilModule.delete(id);
}

function resetOilForm() {
  OilModule.resetForm();
}
*/
