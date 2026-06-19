require('dotenv').config();
const express = require('express');
const path = require('path');
const conectarDB = require('./config/db');

const app = express();
const PORT = process.env.PORT || 10000;

// Conectar a la base de datos
conectarDB();




// 1. Servir los archivos estáticos de la interfaz desde la carpeta 'public'
app.use(express.static(path.join(__dirname)));
app.use(express.json());


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});