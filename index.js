// Minecraft Mod Key Verification System
// Sistema completo e otimizado para Railway/Render deployment
const express = require("express");
const app = express();

// Base de dados das chaves válidas
const chavesValidas = {
  "AB4D-XR2L-89TM-J7KQ": true,
  "qwert": true,
  "qwert123": true
};

// Array para logs de verificação
const logs = [];
let logCounter = 1;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Função para adicionar log
function addLog(key, result, ip) {
  const log = {
    id: logCounter++,
    key: key || "N/A",
    result: result,
    timestamp: new Date(),
    ip: ip || "unknown"
  };
  logs.unshift(log);
  
  // Manter apenas os últimos 50 logs
  if (logs.length > 50) {
    logs.pop();
  }
  
  console.log(`[${log.timestamp.toISOString()}] ${result} - Chave: ${log.key} - IP: ${log.ip}`);
  return log;
}

// ENDPOINT PRINCIPAL - API original para Minecraft mod
app.get("/verificar", (req, res) => {
  const chave = req.query.chave;
  const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || "unknown";
  
  if (!chave) {
    addLog("", "ERRO - Faltando chave", clientIp);
    return res.status(400).send("Faltando chave");
  }

  const result = chavesValidas[chave] ? "Aprovado" : "Recusado";
  addLog(chave, result, clientIp);
  
  res.send(result);
});

// API REST para gerenciamento
app.get("/api/keys", (req, res) => {
  const keys = Object.keys(chavesValidas).map(key => ({
    key: key,
    active: chavesValidas[key],
    created: new Date()
  }));
  res.json(keys);
});

app.post("/api/keys", (req, res) => {
  const { key } = req.body;
  
  if (!key || key.trim() === "") {
    return res.status(400).json({ error: "Chave é obrigatória" });
  }
  
  const cleanKey = key.trim();
  
  if (chavesValidas[cleanKey]) {
    return res.status(400).json({ error: "Chave já existe" });
  }
  
  chavesValidas[cleanKey] = true;
  addLog(cleanKey, "CHAVE CRIADA", "system");
  
  res.status(201).json({ 
    key: cleanKey, 
    active: true, 
    created: new Date(),
    message: "Chave criada com sucesso"
  });
});

app.delete("/api/keys/:key", (req, res) => {
  const keyToDelete = decodeURIComponent(req.params.key);
  
  if (chavesValidas[keyToDelete]) {
    delete chavesValidas[keyToDelete];
    addLog(keyToDelete, "CHAVE REMOVIDA", "system");
    res.json({ message: "Chave removida com sucesso" });
  } else {
    res.status(404).json({ error: "Chave não encontrada" });
  }
});

app.get("/api/logs", (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  res.json(logs.slice(0, limit));
});

app.get("/api/stats", (req, res) => {
  const totalKeys = Object.keys(chavesValidas).length;
  const totalVerifications = logs.length;
  const approvedCount = logs.filter(log => log.result === "Aprovado").length;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  
  const todayLogs = logs.filter(log => new Date(log.timestamp) >= todayStart);
  const verificationsToday = todayLogs.length;
  const successRate = totalVerifications > 0 ? Math.round((approvedCount / totalVerifications) * 100) : 0;
  
  res.json({
    totalKeys,
    totalVerifications,
    verificationsToday,
    approvedCount,
    successRate,
    recentLogs: logs.slice(0, 5)
  });
});

// Interface web completa
app.get("/", (req, res) => {
  const host = req.get('host');
  const protocol = req.get('x-forwarded-proto') || req.protocol;
  const baseUrl = `${protocol}://${host}`;
  
  res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Minecraft Mod Key Verification System</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #333;
            line-height: 1.6;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header {
            background: rgba(255,255,255,0.95);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            padding: 30px;
            margin-bottom: 30px;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }
        .header h1 { color: #4CAF50; margin-bottom: 10px; font-size: 2.5em; }
        .subtitle { color: #666; font-size: 1.2em; }
        .status-online { 
            display: inline-block; background: #4CAF50; color: white; 
            padding: 8px 16px; border-radius: 20px; font-size: 0.9em; 
            margin-top: 10px; font-weight: bold;
        }
        .grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); 
            gap: 25px; 
            margin-bottom: 30px;
        }
        .card { 
            background: rgba(255,255,255,0.95); 
            backdrop-filter: blur(10px);
            border-radius: 15px; 
            padding: 25px; 
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            transition: transform 0.3s ease;
        }
        .card:hover { transform: translateY(-5px); }
        .card h2 { 
            color: #333; margin-bottom: 20px; 
            border-bottom: 3px solid #4CAF50; padding-bottom: 10px;
        }
        .endpoint { 
            background: #1a1a1a; color: #00ff00; padding: 15px; 
            border-radius: 8px; font-family: 'Courier New', monospace; 
            margin: 15px 0; overflow-x: auto; border-left: 4px solid #4CAF50;
            word-break: break-all;
        }
        .key-item { 
            background: linear-gradient(45deg, #e8f5e8, #d4f4d4); 
            padding: 12px; border-radius: 8px; margin: 8px 0; 
            font-family: 'Courier New', monospace; border-left: 4px solid #4CAF50;
            font-weight: bold; display: flex; align-items: center;
        }
        .key-item::before { content: "🔑"; margin-right: 10px; }
        .stats-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); 
            gap: 15px; 
        }
        .stat-card { 
            background: linear-gradient(45deg, #4CAF50, #45a049); 
            color: white; padding: 20px; border-radius: 12px; 
            text-align: center; transition: transform 0.2s ease;
        }
        .stat-card:hover { transform: scale(1.05); }
        .stat-number { font-size: 2.2em; font-weight: bold; display: block; }
        .stat-label { font-size: 0.9em; opacity: 0.9; margin-top: 5px; }
        .test-section {
            background: rgba(255,255,255,0.95);
            border-radius: 15px; padding: 30px; margin-top: 25px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }
        .test-form { display: flex; gap: 12px; margin: 20px 0; flex-wrap: wrap; }
        .test-input {
            flex: 1; min-width: 250px; padding: 15px; 
            border: 2px solid #ddd; border-radius: 10px; font-size: 16px;
            font-family: 'Courier New', monospace; transition: border-color 0.3s ease;
        }
        .test-input:focus { outline: none; border-color: #4CAF50; }
        .test-button {
            background: linear-gradient(45deg, #4CAF50, #45a049);
            color: white; border: none; padding: 15px 30px; 
            border-radius: 10px; cursor: pointer; font-size: 16px;
            font-weight: bold; transition: transform 0.2s ease; min-width: 140px;
        }
        .test-button:hover { transform: translateY(-2px); }
        .test-result { margin-top: 20px; padding: 20px; border-radius: 10px; font-weight: bold; }
        .success { background: #d4f4d4; color: #2e7d32; border-left: 5px solid #4CAF50; }
        .error { background: #ffcdd2; color: #c62828; border-left: 5px solid #f44336; }
        .logs-container {
            max-height: 350px; overflow-y: auto; background: #1a1a1a;
            color: #00ff00; padding: 20px; border-radius: 10px;
            font-family: 'Courier New', monospace; font-size: 13px;
            margin-top: 15px; line-height: 1.4;
        }
        .log-entry { margin-bottom: 8px; padding: 5px 0; border-bottom: 1px solid #333; }
        .timestamp { color: #888; }
        .log-approved { color: #00ff00; font-weight: bold; }
        .log-rejected { color: #ff6b6b; font-weight: bold; }
        .log-error { color: #ffeb3b; font-weight: bold; }
        .footer {
            text-align: center; margin-top: 30px; padding: 20px;
            background: rgba(255,255,255,0.1); border-radius: 10px; color: white;
        }
        .refresh-btn {
            background: #2196F3; color: white; border: none; 
            padding: 8px 16px; border-radius: 6px; cursor: pointer;
            margin-left: 10px; font-size: 14px; transition: transform 0.2s ease;
        }
        .refresh-btn:hover { transform: translateY(-1px); }
        @media (max-width: 768px) {
            .container { padding: 15px; }
            .header h1 { font-size: 2em; }
            .test-form { flex-direction: column; }
            .test-input, .test-button { width: 100%; }
            .grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎮 Minecraft Mod Key Verification</h1>
            <p class="subtitle">Sistema completo de verificação de chaves para mods</p>
            <div class="status-online">✅ Sistema Online e Funcionando</div>
        </div>

        <div class="grid">
            <div class="card">
                <h2>📡 API Endpoint Original</h2>
                <p><strong>Use este endpoint exato no seu mod de Minecraft:</strong></p>
                <div class="endpoint">GET ${baseUrl}/verificar?chave=YOUR_KEY</div>
                <p><strong>Retorna:</strong> "Aprovado" (chave válida) ou "Recusado" (chave inválida)</p>
                <p style="margin-top: 15px; color: #666; font-size: 14px;">
                    <strong>Exemplo Java:</strong><br>
                    <code style="background: #f5f5f5; padding: 5px; border-radius: 3px;">
                    String response = HttpClient.get("${baseUrl}/verificar?chave=" + key);
                    </code>
                </p>
            </div>

            <div class="card">
                <h2>✅ Gerenciar Chaves Válidas</h2>
                ${Object.keys(chavesValidas).map(key => 
                    `<div class="key-item">
                        <span style="flex: 1;">${key}</span>
                        <button onclick="deleteKey('${key}')" style="background: #f44336; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; margin-left: 10px;">❌ Remover</button>
                    </div>`
                ).join('')}
                
                <div style="margin-top: 20px; padding: 15px; background: #f0f8ff; border-radius: 8px; border-left: 4px solid #2196F3;">
                    <h3 style="margin-bottom: 10px; color: #333;">➕ Adicionar Nova Chave</h3>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <input 
                            type="text" 
                            id="newKeyInput" 
                            placeholder="Digite a nova chave (ex: NOVA-CHAVE-123)"
                            style="flex: 1; min-width: 200px; padding: 10px; border: 2px solid #ddd; border-radius: 5px; font-family: monospace;"
                        >
                        <button onclick="addNewKey()" style="background: #4CAF50; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: bold;">
                            ➕ Adicionar Chave
                        </button>
                    </div>
                </div>
                
                <p style="margin-top: 15px; color: #666; font-size: 14px;">
                    Total: <strong>${Object.keys(chavesValidas).length} chaves</strong> configuradas
                </p>
            </div>

            <div class="card">
                <h2>📊 Estatísticas do Sistema</h2>
                <div class="stats-grid">
                    <div class="stat-card">
                        <span class="stat-number">${Object.keys(chavesValidas).length}</span>
                        <span class="stat-label">Chaves Ativas</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-number">${logs.length}</span>
                        <span class="stat-label">Total Verificações</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-number">${logs.filter(l => {
                            const today = new Date();
                            const logDate = new Date(l.timestamp);
                            return today.toDateString() === logDate.toDateString();
                        }).length}</span>
                        <span class="stat-label">Hoje</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-number">${logs.filter(l => l.result === "Aprovado").length}</span>
                        <span class="stat-label">Aprovadas</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="test-section">
            <h2>🧪 Teste a API em Tempo Real</h2>
            <p>Digite uma chave para testar o endpoint de verificação:</p>
            <div class="test-form">
                <input 
                    type="text" 
                    class="test-input" 
                    id="testKey" 
                    placeholder="Digite uma chave para testar (ex: qwert)"
                    value="qwert"
                >
                <button class="test-button" onclick="testKey()" id="testBtn">
                    🚀 Testar Chave
                </button>
            </div>
            <div id="testResult"></div>

            <h3 style="margin-top: 30px; color: #333;">
                📝 Logs de Verificação em Tempo Real
                <button class="refresh-btn" onclick="refreshLogs()">🔄 Atualizar</button>
            </h3>
            <div class="logs-container" id="logsContainer">
                ${logs.slice(0, 15).map(log => {
                    let logClass = 'log-error';
                    if (log.result === 'Aprovado') logClass = 'log-approved';
                    else if (log.result === 'Recusado') logClass = 'log-rejected';
                    else if (log.result.includes('ERRO')) logClass = 'log-error';
                    
                    return `<div class="log-entry">
                        <span class="timestamp">[${new Date(log.timestamp).toLocaleString('pt-BR')}]</span>
                        <span class="${logClass}">${log.result}</span>
                        - Chave: <strong>${log.key}</strong> (IP: ${log.ip})
                    </div>`;
                }).join('') || '<div style="text-align: center; color: #888; padding: 20px;">Nenhuma verificação ainda. Teste uma chave acima!</div>'}
            </div>
        </div>

        <div class="footer">
            <p>🚀 Sistema desenvolvido para Railway/Render deployment</p>
            <p>Endpoint da API: <strong>${baseUrl}/verificar</strong></p>
            <p>Status: Online desde ${new Date().toLocaleString('pt-BR')}</p>
        </div>
    </div>

    <script>
        let isLoading = false;

        async function testKey() {
            if (isLoading) return;
            
            const key = document.getElementById('testKey').value.trim();
            const resultDiv = document.getElementById('testResult');
            const button = document.getElementById('testBtn');
            
            if (!key) {
                resultDiv.innerHTML = '<div class="test-result error">❌ Digite uma chave para testar!</div>';
                return;
            }

            isLoading = true;
            button.textContent = '⏳ Testando...';
            button.disabled = true;

            try {
                const response = await fetch('/verificar?chave=' + encodeURIComponent(key));
                const text = await response.text();
                
                const isSuccess = text === 'Aprovado';
                const icon = isSuccess ? '✅' : '❌';
                
                resultDiv.innerHTML = \`
                    <div class="test-result \${isSuccess ? 'success' : 'error'}">
                        <div style="font-size: 18px; margin-bottom: 10px;">
                            \${icon} <strong>Resultado: \${text}</strong>
                        </div>
                        <div style="font-size: 14px; opacity: 0.8;">
                            <strong>Chave testada:</strong> \${key}<br>
                            <strong>Timestamp:</strong> \${new Date().toLocaleString('pt-BR')}<br>
                            <strong>Status HTTP:</strong> \${response.status}
                        </div>
                    </div>
                \`;
                
                // Refresh logs after test
                setTimeout(refreshLogs, 1000);
            } catch (error) {
                resultDiv.innerHTML = '<div class="test-result error">❌ Erro ao testar: ' + error.message + '</div>';
            } finally {
                isLoading = false;
                button.textContent = '🚀 Testar Chave';
                button.disabled = false;
            }
        }

        async function refreshLogs() {
            try {
                const response = await fetch('/api/logs?limit=15');
                const logs = await response.json();
                
                const container = document.getElementById('logsContainer');
                
                if (logs.length === 0) {
                    container.innerHTML = '<div style="text-align: center; color: #888; padding: 20px;">Nenhuma verificação ainda. Teste uma chave acima!</div>';
                    return;
                }
                
                container.innerHTML = logs.map(log => {
                    let logClass = 'log-error';
                    if (log.result === 'Aprovado') logClass = 'log-approved';
                    else if (log.result === 'Recusado') logClass = 'log-rejected';
                    else if (log.result.includes('ERRO')) logClass = 'log-error';
                    
                    return \`<div class="log-entry">
                        <span class="timestamp">[\${new Date(log.timestamp).toLocaleString('pt-BR')}]</span>
                        <span class="\${logClass}">\${log.result}</span>
                        - Chave: <strong>\${log.key}</strong> (IP: \${log.ip})
                    </div>\`;
                }).join('');
            } catch (error) {
                console.error('Erro ao atualizar logs:', error);
            }
        }

        // Auto-refresh logs every 15 seconds
        setInterval(refreshLogs, 15000);

        // Enter key support
        document.getElementById('testKey').addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !isLoading) {
                testKey();
            }
        });

        // Focus input on load
        window.addEventListener('load', function() {
            document.getElementById('testKey').focus();
        });

        // Funções para gerenciar chaves
        async function addNewKey() {
            const input = document.getElementById('newKeyInput');
            const key = input.value.trim();
            
            if (!key) {
                alert('❌ Digite uma chave válida!');
                return;
            }
            
            try {
                const response = await fetch('/api/keys', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ key: key })
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    alert('✅ Chave adicionada com sucesso: ' + key);
                    input.value = '';
                    location.reload(); // Recarrega a página para mostrar a nova chave
                } else {
                    alert('❌ Erro: ' + result.error);
                }
            } catch (error) {
                alert('❌ Erro ao adicionar chave: ' + error.message);
            }
        }

        async function deleteKey(key) {
            if (!confirm('❌ Tem certeza que deseja remover a chave: ' + key + '?')) {
                return;
            }
            
            try {
                const response = await fetch('/api/keys/' + encodeURIComponent(key), {
                    method: 'DELETE'
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    alert('✅ Chave removida com sucesso: ' + key);
                    location.reload(); // Recarrega a página para atualizar a lista
                } else {
                    alert('❌ Erro: ' + result.error);
                }
            } catch (error) {
                alert('❌ Erro ao remover chave: ' + error.message);
            }
        }

        // Enter key support para adicionar chave
        document.addEventListener('DOMContentLoaded', function() {
            const newKeyInput = document.getElementById('newKeyInput');
            if (newKeyInput) {
                newKeyInput.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        addNewKey();
                    }
                });
            }
        });
    </script>
</body>
</html>`);
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    memory: process.memoryUsage(),
    validKeys: Object.keys(chavesValidas).length,
    totalLogs: logs.length,
    version: "1.0.0"
  });
});

// Catch all 404
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Endpoint não encontrado",
    availableEndpoints: {
      api: "/verificar?chave=YOUR_KEY",
      web: "/",
      health: "/health",
      logs: "/api/logs",
      stats: "/api/stats"
    }
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Erro interno:", err);
  res.status(500).json({ 
    error: "Erro interno do servidor",
    timestamp: new Date().toISOString()
  });
});

// Start server
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log('='.repeat(60));
  console.log('🚀 MINECRAFT KEY VERIFICATION SYSTEM INICIADO!');
  console.log('='.repeat(60));
  console.log(`📍 Servidor: http://${HOST}:${PORT}`);
  console.log(`📡 API Endpoint: http://${HOST}:${PORT}/verificar?chave=YOUR_KEY`);
  console.log(`🌐 Interface Web: http://${HOST}:${PORT}`);
  console.log(`❤️  Health Check: http://${HOST}:${PORT}/health`);
  console.log(`✅ Chaves válidas carregadas: ${Object.keys(chavesValidas).length}`);
  console.log(`📊 Sistema pronto para verificações!`);
  console.log('='.repeat(60));
  
  // Log inicial
  addLog("SYSTEM", "SERVIDOR INICIADO", HOST);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Recebido SIGTERM, fazendo shutdown graceful...');
  server.close(() => {
    console.log('✅ Servidor encerrado com sucesso');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Recebido SIGINT, fazendo shutdown graceful...');
  server.close(() => {
    console.log('✅ Servidor encerrado com sucesso');
    process.exit(0);
  });
});
