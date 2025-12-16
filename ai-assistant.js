/* =========================================
   IA COM DEEPSEEK (MODELO V3)
   ========================================= */

// ⚠️ CHAVE DEEPSEEK DEVE ESTAR CONFIGURADA NO BACKEND APENAS
// Use ai-assistant-api.js para chamadas seguras via API
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;

// Configuração do microfone
if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.lang = 'pt-BR';
  recognition.continuous = false;
} else {
  console.warn("Navegador sem suporte a voz.");
  const btn = document.getElementById('aiMic');
  if(btn) btn.style.display = 'none';
}

function toggleVoiceAssistant() {
  if (!recognition) return alert("Use Chrome, Edge ou Samsung Internet.");
  
  const btn = document.getElementById('aiMic');
  
  if (btn.classList.contains('listening')) {
    recognition.stop();
    btn.classList.remove('listening');
    btn.innerHTML = "🎙️";
    return;
  }

  recognition.start();
  btn.classList.add('listening');
  btn.innerHTML = "👂";
  showToast("Ouvindo...");

  recognition.onresult = async (event) => {
    const transcript = event.results[0][0].transcript;
    btn.classList.remove('listening');
    btn.innerHTML = "⏳";
    
    console.log("🎤 Texto:", transcript);
    showToast(`Processando...`);
    
    await askDeepSeek(transcript);
    
    btn.innerHTML = "🎙️";
  };

  recognition.onerror = (e) => {
    btn.classList.remove('listening');
    btn.innerHTML = "🎙️";
    console.error("Erro mic:", e);
    showToast("Erro ao ouvir.");
  };
}

async function askDeepSeek(userText) {
  // Verificar se é comando de troca de óleo antes de enviar para IA
  const textLower = userText.toLowerCase();
  
  // Padrões para detectar troca de óleo - evita falsos positivos com despesa
  const isOleoCommand = (() => {
    const t = textLower;

    // Casos mais comuns
    if (t.includes("troca de óleo")) return true;
    if (t.includes("troca de oleo")) return true;
    if (t.includes("trocar óleo")) return true;
    if (t.includes("trocar oleo")) return true;
    if (t.includes("troca óleo")) return true;
    if (t.includes("troca oleo")) return true;

    // Casos com manutenção
    if (t.includes("manutenção") && t.includes("óleo")) return true;
    if (t.includes("manutencao") && t.includes("oleo")) return true;

    // Casos com km
    if (t.includes("óleo") && t.includes("km")) return true;
    if (t.includes("oleo") && t.includes("km")) return true;

    return false;
  })();

  if (isOleoCommand) {
    showToast("✅ Abrindo Troca de Óleo...");
    document.querySelector('main').style.display = 'none';
    document.getElementById('oil-page').style.display = 'block';
    
    // Tentar extrair dados da fala para pré-preenchimento
    const cliente = extrairCliente(userText);
    const moto = extrairMoto(userText);
    
    if (cliente || moto) {
      if (cliente) document.getElementById('oilCliente').value = cliente;
      if (moto) document.getElementById('oilMoto').value = moto;
    }
    
    if (typeof renderOilList !== 'undefined') renderOilList();
    return;
  }

  // USAR O ARQUIVO ai-assistant-api.js PARA CHAMADAS SEGURAS VIA BACKEND!
  alert("❌ Use a versão com API (ai-assistant-api.js) para comandos de IA.\n\nEste arquivo não possui segurança para produção.");
  return;
}

function extrairCliente(texto) {
  const match = texto.match(/cliente\s+([a-záéíóú\s]+)/i);
  return match ? match[1].trim() : null;
}

function extrairMoto(texto) {
  const match = texto.match(/moto\s+([a-záéíóú0-9\-\s]+)/i) || 
                texto.match(/placa\s+([a-záéíóú0-9\-\s]+)/i);
  return match ? match[1].trim() : null;
}

function extrairNumero(texto) {
  const match = texto.match(/(\d+)\s*(km|quilômetro)/i);
  return match ? match[1] : null;
}