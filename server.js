require('dotenv').config();
const express = require('express');
const path = require('path');
const conectarDB = require('./config/db');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 10000;

// Conectar a la base de datos
conectarDB();

// ─── MODELOS DE MONGOOSE ──────────────────────────────────
const Service = mongoose.model('Service', new mongoose.Schema({
  machine: String,
  client: String,
  desc: String,
  status: String,
  date: String,
  order: { type: Number, default: 0 }
}));

const History = mongoose.model('History', new mongoose.Schema({
  machine: String,
  action: String,
  date: String
}));

const Pending = mongoose.model('Pending', new mongoose.Schema({
  title: String,
  client: String,
  machine: String,
  status: String,
  date: String
}));

const Client = mongoose.model('Client', new mongoose.Schema({
  name: String,
  contact: String,
  machines: [String]
}));

app.use(express.static(path.join(__dirname)));
app.use(express.json());

// ─── ENDPOINTS API CONTROLLER ─────────────────────────────

// SERVICIOS ACTIVOS (Pestaña Principal)
app.get('/api/services', async (req, res) => {
  try {
    const data = await Service.find().sort({ order: 1 });
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/services', async (req, res) => {
  try {
    const count = await Service.countDocuments();
    // BASE: Si el cliente viene vacío, asigna 'Cliente General'
    const clientName = req.body.client?.trim() || 'Cliente General';
    const item = new Service({ ...req.body, client: clientName, order: count });
    await item.save();
    res.status(201).json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/services/reorder', async (req, res) => {
  try {
    const { orderedIds } = req.body;
    for (let i = 0; i < orderedIds.length; i++) {
      await Service.findByIdAndUpdate(orderedIds[i], { order: i });
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/services/:id', async (req, res) => {
  try {
    const target = await Service.findById(req.params.id);
    if (target) {
      const machineName = target.machine;
      await Service.findByIdAndDelete(req.params.id);
      if (machineName) {
        await Pending.deleteMany({ machine: machineName });
        await History.deleteMany({ machine: machineName });
      }
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// HISTORIAL
app.get('/api/history', async (req, res) => {
  try {
    const data = await History.find();
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/history', async (req, res) => {
  try {
    const item = new History(req.body);
    await item.save();
    res.status(201).json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/history/:id', async (req, res) => {
  try {
    const target = await History.findById(req.params.id);
    if (target) {
      const machineName = target.machine;
      await History.findByIdAndDelete(req.params.id);
      if (machineName) {
        await Service.deleteMany({ machine: machineName });
        await Pending.deleteMany({ machine: machineName });
      }
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PENDIENTES
app.get('/api/pending', async (req, res) => {
  try {
    const data = await Pending.find();
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/pending', async (req, res) => {
  try {
    // BASE: Si el cliente viene vacío, asigna 'Cliente General'
    const clientName = req.body.client?.trim() || 'Cliente General';
    const item = new Pending({ ...req.body, client: clientName });
    await item.save();
    res.status(201).json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/pending/:id', async (req, res) => {
  try {
    const updated = await Pending.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/pending/:id/finalize', async (req, res) => {
  try {
    const p = await Pending.findById(req.params.id);
    if (!p) return res.status(404).json({ error: 'Tarea no encontrada' });
    
    const todayStr = new Date().toISOString().slice(0, 10);
    const historyItem = new History({
      machine: p.machine || p.title,
      action: `[TAREA FINALIZADA] ${p.title} — Cliente: ${p.client}`,
      date: todayStr
    });
    await historyItem.save();
    await Pending.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/pending/:id', async (req, res) => {
  try {
    const target = await Pending.findById(req.params.id);
    if (target) {
      const machineName = target.machine;
      await Pending.findByIdAndDelete(req.params.id);
      if (machineName) {
        await Service.deleteMany({ machine: machineName });
        await History.deleteMany({ machine: machineName });
      }
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// CLIENTES
app.get('/api/clients', async (req, res) => {
  try {
    const data = await Client.find();
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/clients', async (req, res) => {
  try {
    // BASE: Si el nombre del cliente viene vacío, asigna 'Cliente General'
    req.body.name = req.body.name?.trim() || 'Cliente General';
    const item = new Client(req.body);
    await item.save();
    res.status(201).json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// NUEVO: Ruta para mover una máquina entre clientes (corrigiendo equivocaciones)
app.put('/api/clients/move-machine', async (req, res) => {
  try {
    const { machine, fromClientName, toClientName } = req.body;

    // 1. Remover la máquina del array del cliente de origen
    await Client.findOneAndUpdate(
      { name: fromClientName },
      { $pull: { machines: machine } }
    );

    // 2. Agregar la máquina al array del cliente destino (crea el cliente destino si no existe)
    await Client.findOneAndUpdate(
      { name: toClientName },
      { $addToSet: { machines: machine } },
      { upsert: true }
    );

    // 3. Reasignar los servicios activos de esa máquina que correspondían al cliente de origen
    await Service.updateMany(
      { machine: machine, client: fromClientName },
      { client: toClientName }
    );

    // 4. Reasignar las tareas pendientes de esa máquina que correspondían al cliente de origen
    await Pending.updateMany(
      { machine: machine, client: fromClientName },
      { client: toClientName }
    );

    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/clients/:id', async (req, res) => {
  try {
    const target = await Client.findById(req.params.id);
    if (target) {
      const clientName = target.name;
      const clientMachines = target.machines || [];
      await Client.findByIdAndDelete(req.params.id);
      if (clientName) {
        await Service.deleteMany({ client: clientName });
        await Pending.deleteMany({ client: clientName });
      }
      if (clientMachines.length > 0) {
        await History.deleteMany({ machine: { $in: clientMachines } });
      }
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});