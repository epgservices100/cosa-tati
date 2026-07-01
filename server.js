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
  order: { type: Number, default: 0 },
  operator: String,
  taskToPerform: String,
  location: String
}));

const History = mongoose.model('History', new mongoose.Schema({
  machine: String,
  action: String,
  date: String,
  location: String
}));

const Pending = mongoose.model('Pending', new mongoose.Schema({
  title: String,
  client: String,
  machine: String,
  status: String,
  date: String,
  operator: String,
  taskToPerform: String,
  location: String
}));

const Client = mongoose.model('Client', new mongoose.Schema({
  name: String,
  contact: String,
  machines: [String]
}));

const CustomTask = mongoose.model('CustomTask', new mongoose.Schema({ name: String }));
const Location = mongoose.model('Location', new mongoose.Schema({ name: String }));

// NUEVO: Modelo de Usuario
const User = mongoose.model('User', new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' }
}));

// Crear admin preestablecido automáticamente
async function seedAdmin() {
  try {
    const adminExists = await User.findOne({ username: 'epg' });
    if (!adminExists) {
      await new User({ username: 'epg', password: '0000', role: 'admin' }).save();
      console.log('✅ Administrador por defecto (epg/0000) creado con éxito.');
    }
  } catch (error) {
    console.error('Error creando admin por defecto:', error);
  }
}
seedAdmin();

app.use(express.static(path.join(__dirname)));
app.use(express.json());

async function validateOperator(operatorName) {
  if (!operatorName || operatorName.trim() === '') return true; // Si está vacío es válido (sin asignar)
  const user = await User.findOne({ username: operatorName });
  return !!user; // Retorna true si existe, false si no
}
// ─── ENDPOINTS SISTEMA DE LOGIN Y USUARIOS ───────────────

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username, password });
    if (user) {
      res.json({ success: true, user: { id: user._id, username: user.username, role: user.role } });
    } else {
      res.status(401).json({ success: false, message: 'Usuario o contraseña incorrectos' });
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/users', async (req, res) => {
  try { res.json(await User.find()); } 
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/users', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const exists = await User.findOne({ username });
    if (exists) return res.status(400).json({ error: 'El usuario ya existe' });
    
    const newUser = new User({ username, password, role });
    await newUser.save();
    res.status(201).json(newUser);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const updated = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── ENDPOINTS RESTO DEL SISTEMA ─────────────────────────

// SERVICIOS ACTIVOS
app.get('/api/services', async (req, res) => {
  try {
    const data = await Service.find().sort({ order: 1 });
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

async function validateOperator(operatorName) {
  if (!operatorName || operatorName.trim() === '') return true; // Si está vacío es válido (sin asignar)
  const user = await User.findOne({ username: operatorName });
  return !!user; // Retorna true si existe, false si no
}

app.post('/api/services', async (req, res) => {
  try {
    const { operator } = req.body;
    if (!(await validateOperator(operator))) {
      return res.status(400).json({ error: 'El operario asignado no es un usuario registrado válido.' });
    }
    
    const count = await Service.countDocuments();
    
    const item = new Service({ ...req.body, client: req.body.client?.trim() || 'Cliente General', order: count });
    await item.save();

    if (machineName) {
      await Client.findOneAndUpdate(
        { name: clientName },
        { $addToSet: { machines: machineName } },
        { upsert: true }
      );
    }
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
app.post('/api/pending', async (req, res) => {
  try {
    const { operator } = req.body;
    if (!(await validateOperator(operator))) {
      return res.status(400).json({ error: 'El operario asignado no es un usuario registrado válido.' });
    }

    // ... resto del código original
    const item = new Pending({ ...req.body, client: req.body.client?.trim() || 'Cliente General' });
    await item.save();
    // ...
  } catch (err) { res.status(500).json({ error: err.message }); }
});
const count = await Service.countDocuments();
app.post('/api/pending', async (req, res) => {
  try {
    const clientName = req.body.client?.trim() || 'Cliente General';
    const machineName = req.body.machine?.trim();

    const item = new Pending({ ...req.body, client: clientName });
    await item.save();

    if (machineName) {
      await Client.findOneAndUpdate(
        { name: clientName },
        { $addToSet: { machines: machineName } },
        { upsert: true }
      );
    }
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
      action: `[FINALIZADA] ${p.title} — Op: ${p.operator || 'N/A'} — Tarea: ${p.taskToPerform || 'N/A'}`,
      location: p.location || '',
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
    req.body.name = req.body.name?.trim() || 'Cliente General';
    const clientName = req.body.name;
    const machines = req.body.machines || [];

    const item = await Client.findOneAndUpdate(
      { name: clientName },
      { 
        $set: { contact: req.body.contact },
        $addToSet: { machines: { $each: machines } }
      },
      { upsert: true, new: true }
    );
    res.status(201).json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/clients/move-machine', async (req, res) => {
  try {
    const { machine, fromClientName, toClientName } = req.body;
    await Client.findOneAndUpdate({ name: fromClientName }, { $pull: { machines: machine } });
    await Client.findOneAndUpdate({ name: toClientName }, { $addToSet: { machines: machine } }, { upsert: true });
    await Service.updateMany({ machine: machine, client: fromClientName }, { client: toClientName });
    await Pending.updateMany({ machine: machine, client: fromClientName }, { client: toClientName });
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

// TAREAS Y UBICACIONES
app.get('/api/custom-tasks', async (req, res) => {
  try { res.json(await CustomTask.find()); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/custom-tasks', async (req, res) => {
  try { const item = new CustomTask(req.body); await item.save(); res.status(201).json(item); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/custom-tasks/:id', async (req, res) => {
  try { await CustomTask.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/locations', async (req, res) => {
  try { res.json(await Location.find()); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/locations', async (req, res) => {
  try { const item = new Location(req.body); await item.save(); res.status(201).json(item); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/locations/:id', async (req, res) => {
  try { await Location.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});
