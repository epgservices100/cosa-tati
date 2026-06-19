// --- DATOS INICIALES DE PRUEBA (MOCK DATA) ---
let servicios = [
    { id: 1, cliente: "Talleres Alfa", estado: "En Proceso", fecha: "2026-06-11", operario: "Carlos Gómez", tarea: "Cambio de Filtros", lugar: "Box 1" },
    { id: 2, cliente: "Logística Express", estado: "Revisión", fecha: "2026-06-11", operario: "Ana Martínez", tarea: "Calibración General", lugar: "Planta Alta" },
    { id: 3, cliente: "Industrias Beta", estado: "Espera", fecha: "2026-06-12", operario: "Luis Torres", tarea: "Mantenimiento Motor", lugar: "Taller Central" }
];

let historial = [
    { maquina: "Torno CNC Haas", accion: "Rectificado de bancada y cambio de husillo", fecha: "2026-05-20" },
    { maquina: "Compresor Schulz 20HP", accion: "Cambio de aceite y correas", fecha: "2026-06-02" }
];

let pendientes = [
    { id: 101, fecha: "2026-06-11", operario: "Carlos Gómez", tareaFaltante: "Ajuste de tuercas de seguridad", estado: "sin-iniciar" },
    { id: 102, fecha: "2026-06-12", operario: "Ana Martínez", tareaFaltante: "Prueba de presión hidráulica", estado: "a-medias" },
    { id: 103, fecha: "2026-06-14", operario: "Luis Torres", tareaFaltante: "Pintura exterior chasis", estado: "pendiente" }
];

let clientes = [
    { nombre: "Metalúrgica Suárez", maquina: "Fresadora Universal", fecha: "2026-04-10", desc: "Equipo antiguo pero bien conservado. Requiere grasa grafitada." },
    { nombre: "Textil Hilados", maquina: "Tejedora Industrial", fecha: "2026-05-18", desc: "Mantenimiento preventivo cada 3 meses estricto." }
];

// --- MANEJO DE PESTAÑAS ---
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
}

// --- RENDERIZAR VISTAS ---
function renderPrincipal() {
    const container = document.getElementById('drag-container');
    container.innerHTML = '';

    servicios.forEach(srv => {
        const card = document.createElement('div');
        card.classList.add('movable-card');
        card.setAttribute('draggable', 'true');
        card.setAttribute('data-id', srv.id);
        
        card.innerHTML = `
            <h4>${srv.cliente}</h4>
            <p><strong>Estado:</strong> ${srv.estado}</p>
            <p><strong>Fecha:</strong> ${srv.fecha}</p>
            <p><strong>Operario:</strong> ${srv.operario}</p>
            <p><strong>Tarea:</strong> ${srv.tarea}</p>
            <p><strong>Lugar:</strong> ${srv.lugar}</p>
        `;
        
        // Eventos Drag & Drop nativos
        card.addEventListener('dragstart', () => card.classList.add('dragging'));
        card.addEventListener('dragend', () => card.classList.remove('dragging'));

        container.appendChild(card);
    });
}

// Lógica de reordenamiento por Drag and Drop
const dragContainer = document.getElementById('drag-container');
dragContainer.addEventListener('dragover', e => {
    e.preventDefault();
    const afterElement = getDragAfterElement(dragContainer, e.clientY);
    const draggingCard = document.querySelector('.dragging');
    if (afterElement == null) {
        dragContainer.appendChild(draggingCard);
    } else {
        dragContainer.insertBefore(draggingCard, afterElement);
    }
});

function getDragAfterElement(container, y) {
    const filterElements = [...container.querySelectorAll('.movable-card:not(.dragging)')];
    return filterElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function renderHistorial() {
    const tbody = document.getElementById('history-table-body');
    tbody.innerHTML = historial.map(h => `
        <tr>
            <td><strong>${h.maquina}</strong></td>
            <td>${h.accion}</td>
            <td>${h.fecha}</td>
        </tr>
    `).join('');
}

function renderPendientes() {
    const container = document.getElementById('pending-list');
    container.innerHTML = '';

    pendientes.forEach(p => {
        const item = document.createElement('div');
        item.classList.add('pending-item');
        
        // Color dinámico según el estado inicial
        item.style.borderLeft = `6px solid var(--status-${p.estado})`;

        item.innerHTML = `
            <div>
                <h4>${p.tareaFaltante}</h4>
                <p>🧑‍🔧 ${p.operario} | 📅 <span class="task-date">${p.fecha}</span></p>
            </div>
            <select class="status-select" onchange="updateStatusColor(this, ${p.id})" style="background-color: var(--status-${p.estado})">
                <option value="pendiente" ${p.estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                <option value="sin-iniciar" ${p.estado === 'sin-iniciar' ? 'selected' : ''}>Sin Iniciar</option>
                <option value="a-medias" ${p.estado === 'a-medias' ? 'selected' : ''}>A medias</option>
            </select>
        `;
        container.appendChild(item);
    });
}

// Cambiar color dinámicamente desde el selector
function updateStatusColor(selectElement, id) {
    const nuevoEstado = selectElement.value;
    const parentItem = selectElement.closest('.pending-item');
    
    // Cambiamos el color de la alerta y del select usando las variables CSS
    parentItem.style.borderLeft = `6px solid var(--status-${nuevoEstado})`;
    selectElement.style.backgroundColor = `var(--status-${nuevoEstado})`;
    
    // Guardamos en memoria el nuevo estado
    let tarea = pendientes.find(item => item.id === id);
    if(tarea) tarea.estado = nuevoEstado;
}

// Botón dinámico de Adelantar Fecha (+1 día)
function advanceDates() {
    pendientes.forEach(p => {
        let fechaActual = new Date(p.fecha);
        fechaActual.setDate(fechaActual.getDate() + 1);
        
        // Formatear de vuelta a YYYY-MM-DD sin desajuste de zona horaria
        p.fecha = fechaActual.toISOString().split('T')[0];
    });
    // Refrescamos la pestaña de pendientes para ver reflejado el cambio
    renderPendientes();
}

function renderClientes() {
    const grid = document.getElementById('clients-grid');
    grid.innerHTML = clientes.map(c => `
        <div class="client-card">
            <div class="client-img-placeholder">⚙️</div>
            <div class="client-info">
                <h4>${c.nombre}</h4>
                <p><strong>Máquina:</strong> ${c.maquina}</p>
                <p><strong>Última fecha:</strong> ${c.fecha}</p>
                <p style="margin-top: 0.5rem; font-style: italic;">"${c.desc}"</p>
            </div>
        </div>
    `).join('');
}

// --- CARGA INICIAL ---
document.addEventListener("DOMContentLoaded", () => {
    renderPrincipal();
    renderHistorial();
    renderPendientes();
    renderClientes();
});

// --- FUNCIONES PARA LOS BOTONES DE ACCIÓN ---

// Funciones para la pestaña Principal
function agregarServicio() {
    console.log("Agregar servicio presionado");
}

function eliminarServicio() {
    console.log("Eliminar servicio presionado");
}

// Funciones para la pestaña Historial
function agregarHistorial() {
    console.log("Agregar historial presionado");
}

function eliminarHistorial() {
    console.log("Eliminar historial presionado");
}

// Funciones para la pestaña Pendientes
function agregarTarea() {
    console.log("Agregar tarea presionado");
}

function eliminarTarea() {
    console.log("Eliminar tarea presionado");
}

// Funciones para la pestaña Clientes
function agregarCliente() {
    console.log("Agregar cliente presionado");
}

function eliminarCliente() {
    console.log("Eliminar cliente presionado");
}