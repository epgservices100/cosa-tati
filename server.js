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

// ==========================================
// MODIFICACIÓN: Enlaces a las 5 colecciones
// ==========================================
app.use('/api/clientes', require('./routes/clientes'));
app.use('/api/historial', require('./routes/historial'));
app.use('/api/pendientes', require('./routes/pendientes'));
app.use('/api/principal', require('./routes/principal'));
app.use('/api/reuniones', require('./routes/reuniones'));
// ==========================================

// 1. Servir los archivos estáticos de la interfaz desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'Public')));

// 2. Ruta comodín configurada con la sintaxis obligatoria de Express v5.
// Intercepta cualquier petición de navegación y le entrega el archivo index.html
app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'index.html'));
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});