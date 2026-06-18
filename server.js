require('dotenv').config();
const express = require('express');
const path = require('path');
const conectarDB = require('./config/db');

const app = express();
const PORT = process.env.PORT || 10000;

// Conectar a la base de datos
conectarDB();

// Middleware para procesar solicitudes JSON
app.use(express.json());

// 1. Servir los archivos estáticos de la interfaz desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'Public')));

// 2. Ruta comodín configurada con la sintaxis obligatoria de Express v5.
// Esto intercepta cualquier petición de navegación y le entrega el archivo index.html
app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'index.html'));
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});