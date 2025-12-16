// ============================================
// CONFIGURAÇÃO SEGURA PARA CORS - server.js
// ============================================

/*
ANTES (INSEGURO):
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  // ...
});
*/

// DEPOIS (SEGURO):

// 1. Adicionar dependência: npm install cors
const cors = require('cors');

// 2. Configurar whitelist de origens
const ALLOWED_ORIGINS = [
  'http://localhost:5500',
  'http://localhost:3000',
  'http://localhost:5173',
  'https://theboxcontrol.com',
  'https://www.theboxcontrol.com',
  'https://theboxcontrol-staging.railway.app'
];

// 3. Configuração de CORS segura
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir requisições sem origin (ex: mobile apps, curl)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin} not in whitelist`));
    }
  },
  credentials: true, // Permitir cookies
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600 // Cache preflight por 10 minutos
};

app.use(cors(corsOptions));

// ============================================
// HELMET.JS - Proteção de Headers
// ============================================

/*
ANTES: Sem proteção
*/

// DEPOIS:

// 1. npm install helmet
const helmet = require('helmet');

// 2. Aplicar middleware
app.use(helmet({
  // Desabilitar X-Powered-By header (não revelar Express)
  hidePoweredBy: true,
  
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Evitar unsafe-inline em prod
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.deepseek.com']
    }
  },
  
  // HSTS - Force HTTPS
  hsts: {
    maxAge: 31536000, // 1 ano
    includeSubDomains: true,
    preload: true
  },
  
  // Outras proteções automáticas
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true
}));

// ============================================
// RATE LIMITING - Proteção contra brute force
// ============================================

/*
ANTES: Sem limite de requisições
*/

// DEPOIS:

// 1. npm install express-rate-limit
const rateLimit = require('express-rate-limit');

// 2. Limiter geral
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requisições por IP
  message: 'Muitas requisições, tente novamente mais tarde',
  standardHeaders: true, // Retornar info em RateLimit-* headers
  legacyHeaders: false,
  skip: (req) => req.path === '/health' // Não contar /health
});

// 3. Limiter para login (mais restritivo)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Máximo 5 tentativas de login
  message: 'Muitas tentativas de login, tente em 15 minutos',
  skipSuccessfulRequests: true // Não contar logins bem-sucedidos
});

// 4. Aplicar limiters
app.use(generalLimiter);
app.post('/auth/login', loginLimiter, authController.login);
app.post('/auth/register', loginLimiter, authController.register);

// ============================================
// VALIDAÇÃO COM JOI - Sanitização de entrada
// ============================================

/*
ANTES: Sem validação robusta
if (!email || !password) { ... }
*/

// DEPOIS:

// 1. npm install joi
const Joi = require('joi');

// 2. Schemas de validação
const schemas = {
  register: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .max(100)
      .messages({
        'string.email': 'Email inválido',
        'any.required': 'Email é obrigatório'
      }),
    password: Joi.string()
      .required()
      .min(8)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])'))
      .messages({
        'string.pattern.base': 'Senha deve conter maiúscula, minúscula e número',
        'string.min': 'Senha deve ter no mínimo 8 caracteres'
      }),
    name: Joi.string()
      .required()
      .max(100),
    phone: Joi.string()
      .optional()
      .pattern(/^[0-9+\-\s()]+$/)
  }),
  
  transaction: Joi.object({
    tipo: Joi.string()
      .valid('income', 'expense')
      .required(),
    categoria: Joi.string()
      .required()
      .max(50),
    descricao: Joi.string()
      .required()
      .max(200),
    valor: Joi.number()
      .positive()
      .required(),
    data: Joi.date()
      .required()
  })
};

// 3. Middleware validador
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true // Remover campos desconhecidos
    });
    
    if (error) {
      const messages = error.details.map(d => d.message);
      return res.status(400).json({ 
        error: 'Validação falhou',
        details: messages 
      });
    }
    
    req.validated = value;
    next();
  };
}

// 4. Usar nos endpoints
app.post('/auth/register', validate(schemas.register), authController.register);
app.post('/transactions', validate(schemas.transaction), transController.add);

// ============================================
// LOGGING - Registrar atividades
// ============================================

/*
ANTES: Sem logs
console.log('User login: ' + email);
*/

// DEPOIS:

// 1. npm install winston
const winston = require('winston');

// 2. Configurar logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'the-box-api' },
  transports: [
    // Arquivo de erro
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Todos os logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880,
      maxFiles: 10
    })
  ]
});

// Console em desenvolvimento
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// 3. Usar logger
logger.info('Usuário login bem-sucedido', { email, userId: user._id });
logger.error('Erro ao processar transação', { error: err.message });
logger.warn('Tentativa de acesso não autorizado', { ip: req.ip });

// ============================================
// AUTENTICAÇÃO - JWT Seguro
// ============================================

/*
ANTES: Token sem expiração
const token = jwt.sign({ userId }, JWT_SECRET);
*/

// DEPOIS:

// 1. Gerar token com expiração
function generateToken(userId) {
  return jwt.sign(
    { userId, iat: Math.floor(Date.now() / 1000) },
    process.env.JWT_SECRET,
    { expiresIn: '24h' } // Expiração em 24 horas
  );
}

// 2. Refresh token (renovar expiração)
function generateRefreshToken(userId) {
  return jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' } // Válido por 7 dias
  );
}

// 3. Middleware de autenticação com tratamento de erro
function authMiddleware(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expirado',
        code: 'TOKEN_EXPIRED'
      });
    }
    return res.status(403).json({ error: 'Token inválido' });
  }
}

app.use('/api/*', authMiddleware);

// ============================================
// EXEMPLO COMPLETO - server.js refatorado
// ============================================

/*
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const Joi = require('joi');
const winston = require('winston');
require('dotenv').config();

const app = express();

// Configuração
const logger = winston.createLogger({...}); // Ver acima
const corsOptions = {...}; // Ver acima

// Middlewares
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(rateLimit({...})); // Ver acima

// Health check (sem rate limit)
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Routes
app.post('/auth/register', loginLimiter, validate(schemas.register), authController.register);
app.post('/auth/login', loginLimiter, validate(schemas.login), authController.login);
app.get('/transactions', authMiddleware, transController.list);

// Error handling
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message });
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Erro interno' 
      : err.message
  });
});

app.listen(process.env.PORT || 3000, () => {
  logger.info(`Server started on port ${process.env.PORT || 3000}`);
});
*/

// ============================================
// CHECKLIST DE SEGURANÇA
// ============================================
/*
- [ ] CORS com whitelist (não '*')
- [ ] Helmet.js configurado
- [ ] Rate limiting em login
- [ ] Validação com Joi
- [ ] JWT com expiração
- [ ] Logs em arquivo
- [ ] HTTPS em produção
- [ ] Senhas com bcrypt (não plaintext)
- [ ] Headers de segurança
- [ ] Testes de segurança (OWASP)
*/
