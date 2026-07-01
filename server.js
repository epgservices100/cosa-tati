app.post('/api/services', async (req, res) => {
  try {
    const count = await Service.countDocuments();
    const clientName = req.body.client?.trim() || 'Cliente General';
    const machineName = req.body.machine?.trim();
    
    // Guardar en Servicios (Principal)
    const item = new Service({ ...req.body, client: clientName, order: count });
    await item.save();

    // NUEVO: Clonar y guardar automáticamente en Pendientes
    const pendingItem = new Pending({
      title: `Servicio en Principal`,
      client: clientName,
      machine: machineName,
      status: req.body.status,
      date: req.body.date,
      operator: req.body.operator,
      taskToPerform: req.body.taskToPerform,
      location: req.body.location
    });
    await pendingItem.save();

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