const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const db = new sqlite3.Database('./users.db');
const SECRET = 'seu_segredo_jwt';

app.use(cors());
app.use(express.json());

// Cria tabela de usuários se não existir
db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    password TEXT
)`);

// Registro
app.post('/api/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Preencha todos os campos.' });
    }
    try {
        const hash = await bcrypt.hash(password, 10);
        db.run(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
            [name, email, hash],
            function (err) {
                if (err) return res.status(400).json({ error: 'Email já cadastrado.' });
                res.json({ id: this.lastID, name, email });
            }
        );
    } catch {
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});

// Login
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Preencha todos os campos.' });
    }
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
        if (err || !user) return res.status(400).json({ error: 'Usuário não encontrado.' });
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ error: 'Senha incorreta.' });
        const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, SECRET, { expiresIn: '1h' });
        res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    });
});

// Middleware de autenticação
function auth(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token ausente.' });
    try {
        req.user = jwt.verify(token, SECRET);
        next();
    } catch {
        res.status(403).json({ error: 'Token inválido.' });
    }
}

// Consulta de usuário autenticado
app.get('/api/me', auth, (req, res) => {
    res.json({ user: req.user });
});

app.listen(3001, () => console.log('Backend rodando em http://localhost:3001'));

// Instalação das dependências necessárias
// npm install express sqlite3 bcrypt jsonwebtoken cors

