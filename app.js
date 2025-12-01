// ========== VARIABLES GLOBALES ==========
let reporteActual = null;
let deferredPrompt = null;

// Lista de técnicos de la empresa
const TECNICOS = [
  'ALEJANDRO GOMEZ',
  'MATEO GARCIA',
  'YERMINSON MURIEL',
  'JUAN CARLOS GALLEGO',
  'CARLOS PATIÑO',
  'JHON CHAVARRIA',
  'JORGE ACOSTA'
];

// ========== ALMACENAMIENTO LOCAL Y GOOGLE SHEETS ==========
const STORAGE_KEY = 'gestion_taller_reportes';
const STORAGE_KEY_PROVEEDORES = 'gestion_taller_proveedores';

// Obtener reportes (primero intenta Google Sheets, luego localStorage)
async function obtenerReportes() {
  if (typeof googleSheets !== 'undefined' && googleSheets.isConfigured()) {
    try {
      return await googleSheets.leerReportes();
    } catch (error) {
      console.error('Error al leer desde Google Sheets, usando localStorage:', error);
    }
  }
  
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

// Guardar reportes (guarda en localStorage y Google Sheets)
async function guardarReportes(reportes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reportes));
  
  if (typeof googleSheets !== 'undefined' && googleSheets.isConfigured()) {
    try {
      await googleSheets.guardarReportes(reportes);
      console.log('✅ Datos sincronizados con Google Sheets');
    } catch (error) {
      console.error('⚠️ Error al sincronizar con Google Sheets:', error);
    }
  }
}

// Obtener proveedores
async function obtenerProveedores() {
  if (typeof googleSheets !== 'undefined' && googleSheets.isConfigured()) {
    try {
      return await googleSheets.leerProveedores();
    } catch (error) {
      console.error('Error al leer proveedores desde Google Sheets:', error);
    }
  }
  
  const data = localStorage.getItem(STORAGE_KEY_PROVEEDORES);
  return data ? JSON.parse(data) : [];
}

// Guardar proveedores
async function guardarProveedores(proveedores) {
  localStorage.setItem(STORAGE_KEY_PROVEEDORES, JSON.stringify(proveedores));
  
  if (typeof googleSheets !== 'undefined' && googleSheets.isConfigured()) {
    try {
      await googleSheets.guardarProveedores(proveedores);
      console.log('✅ Proveedores sincronizados con Google Sheets');
    } catch (error) {
      console.error('⚠️ Error al sincronizar proveedores:', error);
    }
  }
}

async function obtenerSiguienteId() {
  const reportes = await obtenerReportes();
  return reportes.length > 0 ? Math.max(...reportes.map(r => r.id)) + 1 : 1;
}

// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', () => {
  inicializarApp();
  configurarNavegacion();
  configurarFormularios();
  configurarPWA();
  cargarDatosPrueba(); // Cargar datos de prueba si no hay datos
  cargarProveedoresPrueba(); // Cargar proveedores de prueba
  cargarReportes();
  cargarEstadisticas();
});

function inicializarApp() {
  console.log('🚀 Aplicación iniciada (Modo Sin Servidor)');
}

function cargarDatosPrueba() {
  // Datos de prueba desactivados - Sistema listo para producción
  // Los datos se crearán manualmente desde el formulario
  console.log('✅ Sistema iniciado sin datos de prueba');
}

// ========== NAVEGACIÓN ==========
function configurarNavegacion() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const view = tab.dataset.view;
      cambiarVista(view);
    });
  });
}

function cambiarVista(vista) {
  // Actualizar tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-view="${vista}"]`).classList.add('active');
  
  // Actualizar vistas
  document.querySelectorAll('.view').forEach(v => {
    v.classList.remove('active');
  });
  document.getElementById(`view-${vista}`).classList.add('active');
  
  // Cargar datos si es necesario
  if (vista === 'lista') {
    cargarReportes();
  } else if (vista === 'estadisticas') {
    cargarEstadisticas();
  } else if (vista === 'proveedores') {
    cargarProveedores();
  }
}

// ========== FORMULARIOS ==========
function configurarFormularios() {
  const formNuevo = document.getElementById('formNuevoReporte');
  formNuevo.addEventListener('submit', async (e) => {
    e.preventDefault();
    await crearReporte();
  });
}

async function crearReporte() {
  const numero_vehiculo = document.getElementById('numero_vehiculo').value.trim();
  const conductor = document.getElementById('conductor').value.trim();
  const descripcion = document.getElementById('descripcion').value.trim();
  
  if (!numero_vehiculo || !descripcion) {
    mostrarToast('Por favor completa los campos requeridos', 'error');
    return;
  }
  
  const reportes = await obtenerReportes();
  const nextId = await obtenerSiguienteId();
  const nuevoReporte = {
    id: nextId,
    numero_vehiculo,
    estado: 'REPORTE',
    descripcion,
    tecnico_asignado: null,
    taller_asignado: null,
    diagnostico: null,
    requiere_reparacion: null,
    notas: null,
    fecha_reporte: new Date().toISOString(),
    fecha_actualizacion: new Date().toISOString()
  };
  
  reportes.push(nuevoReporte);
  await guardarReportes(reportes);
  
  mostrarToast('✅ Reporte creado exitosamente', 'success');
  document.getElementById('formNuevoReporte').reset();
  cambiarVista('lista');
  cargarReportes();
  cargarEstadisticas();
}

// ========== CARGA DE DATOS ==========
async function cargarReportes() {
  const filtro = document.getElementById('filtroEstado').value;
  let reportes = await obtenerReportes();
  
  if (filtro) {
    reportes = reportes.filter(r => r.estado === filtro);
  }
  
  // Ordenar por fecha de actualización (más reciente primero)
  reportes.sort((a, b) => new Date(b.fecha_actualizacion) - new Date(a.fecha_actualizacion));
  
  mostrarReportes(reportes);
}

function mostrarReportes(reportes) {
  const container = document.getElementById('listaReportes');
  
  if (reportes.length === 0) {
    container.innerHTML = '<div class="card"><p>No hay reportes para mostrar</p></div>';
    return;
  }
  
  container.innerHTML = reportes.map(reporte => `
    <div class="reporte-card" ondblclick="verDetalle(${reporte.id})">
      <div class="reporte-header">
        <div class="reporte-vehiculo">🚗 ${reporte.numero_vehiculo}</div>
        <div class="reporte-estado estado-${reporte.estado.replace(/ /g, '-').replace(/Á/g, 'A').replace(/É/g, 'E').replace(/Í/g, 'I').replace(/Ó/g, 'O').replace(/Ú/g, 'U')}">
          ${reporte.estado}
        </div>
      </div>
      <div class="reporte-descripcion">
        ${reporte.descripcion || 'Sin descripción'}
      </div>
      <div class="reporte-footer">
        <span>📅 ${formatearFecha(reporte.fecha_reporte)}</span>
        ${reporte.tecnico_asignado ? `<span>👤 ${reporte.tecnico_asignado}</span>` : ''}
      </div>
    </div>
  `).join('');
}

// ========== DETALLE DE REPORTE ==========
async function verDetalle(id) {
  const reportes = obtenerReportes();
  const reporte = reportes.find(r => r.id === id);
  
  if (!reporte) {
    mostrarToast('Reporte no encontrado', 'error');
    return;
  }
  
  reporteActual = reporte;
  mostrarModalDetalle(reporte);
}

function mostrarModalDetalle(reporte) {
  const modal = document.getElementById('modalDetalle');
  const detalle = document.getElementById('detalleReporte');
  
  detalle.innerHTML = `
    <h2>📋 Detalle del Reporte #${reporte.id}</h2>
    
    <div class="detalle-section">
      <h3>Información General</h3>
      <div class="info-row">
        <div class="info-label">Vehículo:</div>
        <div class="info-value"><strong>${reporte.numero_vehiculo}</strong></div>
      </div>
      <div class="info-row">
        <div class="info-label">Estado Actual:</div>
        <div class="info-value">
          <span class="reporte-estado estado-${reporte.estado.replace(/ /g, '-').replace(/Á/g, 'A').replace(/É/g, 'E').replace(/Í/g, 'I').replace(/Ó/g, 'O').replace(/Ú/g, 'U')}">
            ${reporte.estado}
          </span>
        </div>
      </div>
      <div class="info-row">
        <div class="info-label">Fecha Reporte:</div>
        <div class="info-value">${formatearFechaCompleta(reporte.fecha_reporte)}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Última Actualización:</div>
        <div class="info-value">${formatearFechaCompleta(reporte.fecha_actualizacion)}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Descripción:</div>
        <div class="info-value">${reporte.descripcion || '-'}</div>
      </div>
    </div>
    
    <div class="detalle-section">
      <h3>Asignaciones</h3>
      <div class="info-row">
        <div class="info-label">Técnico:</div>
        <div class="info-value">${reporte.tecnico_asignado || '-'}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Taller:</div>
        <div class="info-value">${reporte.taller_asignado || '-'}</div>
      </div>
    </div>
    
    ${reporte.analisis ? `
      <div class="detalle-section">
        <h3>Análisis Inicial</h3>
        <div class="info-row">
          <div class="info-value">${reporte.analisis}</div>
        </div>
      </div>
    ` : ''}
    
    ${reporte.diagnostico ? `
      <div class="detalle-section">
        <h3>Diagnóstico</h3>
        <div class="info-row">
          <div class="info-value">${reporte.diagnostico}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Requiere Reparación:</div>
          <div class="info-value">${reporte.requiere_reparacion ? '✅ Sí' : '❌ No'}</div>
        </div>
      </div>
    ` : ''}
    
    ${reporte.notas ? `
      <div class="detalle-section">
        <h3>Notas</h3>
        <div class="info-row">
          <div class="info-value">${reporte.notas}</div>
        </div>
      </div>
    ` : ''}
    
    <div class="detalle-section">
      <h3>Actualizar Estado</h3>
      ${generarFormularioActualizacion(reporte)}
    </div>
  `;
  
  modal.style.display = 'block';
}

function generarFormularioActualizacion(reporte) {
  const siguientesEstados = obtenerSiguientesEstados(reporte.estado);
  
  // Si el estado actual es REPORTE, mostrar formulario completo de asignación y análisis
  if (reporte.estado === 'REPORTE') {
    return `
      <form id="formActualizar" onsubmit="event.preventDefault(); actualizarReporte();">
        <div class="form-group">
          <label>Técnico Asignado: *</label>
          <select id="tecnicoAsignado" required>
            <option value="">-- Seleccionar Técnico --</option>
            ${TECNICOS.map(tecnico => `<option value="${tecnico}">${tecnico}</option>`).join('')}
          </select>
        </div>
        
        <div class="form-group">
          <label>Análisis Inicial:</label>
          <textarea id="analisisInicial" rows="4" placeholder="Describe el análisis realizado al vehículo..."></textarea>
        </div>
        
        <div class="form-group">
          <label>Notas:</label>
          <textarea id="notas" rows="2" placeholder="Notas adicionales..."></textarea>
        </div>
        
        <input type="hidden" id="nuevoEstado" value="ANÁLISIS">
        
        <button type="submit" class="btn btn-primary">Asignar Técnico y Registrar Análisis</button>
      </form>
    `;
  }
  
  // Para otros estados, mostrar el formulario normal
  return `
    <form id="formActualizar" onsubmit="event.preventDefault(); actualizarReporte();">
      <div class="form-group">
        <label>Cambiar Estado a:</label>
        <select id="nuevoEstado" required>
          <option value="">-- Seleccionar --</option>
          ${siguientesEstados.map(estado => `<option value="${estado}">${estado}</option>`).join('')}
        </select>
      </div>
      
      <div class="form-group" id="campoTecnico" style="display: none;">
        <label>Técnico Asignado:</label>
        <select id="tecnicoAsignado">
          <option value="">-- Seleccionar Técnico --</option>
          ${TECNICOS.map(tecnico => `<option value="${tecnico}">${tecnico}</option>`).join('')}
        </select>
      </div>
      
      <div class="form-group" id="campoTaller" style="display: none;">
        <label>Taller Asignado:</label>
        <input type="text" id="tallerAsignado" placeholder="Nombre del taller">
      </div>
      
      <div class="form-group" id="campoDiagnostico" style="display: none;">
        <label>Diagnóstico:</label>
        <textarea id="diagnostico" rows="3" placeholder="Ingrese el diagnóstico..."></textarea>
      </div>
      
      <div class="form-group" id="campoReparacion" style="display: none;">
        <label>¿Requiere Reparación?</label>
        <select id="requiereReparacion">
          <option value="">-- Seleccionar --</option>
          <option value="1">Sí</option>
          <option value="0">No</option>
        </select>
      </div>
      
      <div class="form-group">
        <label>Notas:</label>
        <textarea id="notas" rows="2" placeholder="Notas adicionales..."></textarea>
      </div>
      
      <button type="submit" class="btn btn-primary">Actualizar</button>
    </form>
    
    <script>
      document.getElementById('nuevoEstado').addEventListener('change', function() {
        const estado = this.value;
        document.getElementById('campoTecnico').style.display = 
          estado === 'TÉCNICO ASIGNADO' ? 'block' : 'none';
        document.getElementById('campoTaller').style.display = 
          estado === 'TALLER' ? 'block' : 'none';
        document.getElementById('campoDiagnostico').style.display = 
          estado === 'DIAGNÓSTICO' ? 'block' : 'none';
        document.getElementById('campoReparacion').style.display = 
          estado === 'DIAGNÓSTICO' ? 'block' : 'none';
      });
    </script>
  `;
}

function obtenerSiguientesEstados(estadoActual) {
  const flujo = {
    'REPORTE': ['TÉCNICO ASIGNADO'],
    'TÉCNICO ASIGNADO': ['ANÁLISIS'],
    'ANÁLISIS': ['TALLER'],
    'TALLER': ['DIAGNÓSTICO'],
    'DIAGNÓSTICO': ['REPARACIÓN', 'SEGUIMIENTO'],
    'REPARACIÓN': ['SEGUIMIENTO'],
    'SEGUIMIENTO': []
  };
  
  return flujo[estadoActual] || [];
}

async function actualizarReporte() {
  const nuevoEstado = document.getElementById('nuevoEstado').value;
  const tecnico = document.getElementById('tecnicoAsignado')?.value;
  const taller = document.getElementById('tallerAsignado')?.value;
  const diagnostico = document.getElementById('diagnostico')?.value;
  const requiereReparacion = document.getElementById('requiereReparacion')?.value;
  const notas = document.getElementById('notas').value;
  const analisisInicial = document.getElementById('analisisInicial')?.value;
  
  if (!nuevoEstado) {
    mostrarToast('Selecciona un nuevo estado', 'error');
    return;
  }
  
  // Validar técnico si es obligatorio (cuando viene de REPORTE)
  if (reporteActual.estado === 'REPORTE' && !tecnico) {
    mostrarToast('Debes seleccionar un técnico', 'error');
    return;
  }
  
  const reportes = await obtenerReportes();
  const index = reportes.findIndex(r => r.id === reporteActual.id);
  
  if (index === -1) {
    mostrarToast('Reporte no encontrado', 'error');
    return;
  }
  
  // Actualizar el reporte
  reportes[index].estado = nuevoEstado;
  reportes[index].fecha_actualizacion = new Date().toISOString();
  
  if (tecnico) reportes[index].tecnico_asignado = tecnico;
  if (taller) reportes[index].taller_asignado = taller;
  if (diagnostico) reportes[index].diagnostico = diagnostico;
  if (requiereReparacion !== '') reportes[index].requiere_reparacion = parseInt(requiereReparacion);
  if (analisisInicial) reportes[index].analisis = analisisInicial;
  if (notas) reportes[index].notas = notas;
  
  await guardarReportes(reportes);
  
  mostrarToast('✅ Reporte actualizado exitosamente', 'success');
  cerrarModal();
  cargarReportes();
  cargarEstadisticas();
}

// ========== BÚSQUEDA ==========
async function buscarPorVehiculo() {
  const numeroVehiculo = document.getElementById('buscarVehiculo').value.trim();
  
  if (!numeroVehiculo) {
    mostrarToast('Ingresa un número de vehículo', 'error');
    return;
  }
  
  const reportes = obtenerReportes();
  const reportesVehiculo = reportes.filter(r => r.numero_vehiculo === numeroVehiculo);
  
  // Ordenar por fecha de reporte (más reciente primero)
  reportesVehiculo.sort((a, b) => new Date(b.fecha_reporte) - new Date(a.fecha_reporte));
  
  const container = document.getElementById('resultadosBusqueda');
  
  if (reportesVehiculo.length === 0) {
    container.innerHTML = '<p style="margin-top: 1rem; color: var(--text-secondary);">No se encontraron reportes para este vehículo</p>';
    return;
  }
  
  container.innerHTML = `
    <h3 style="margin-top: 1.5rem; margin-bottom: 1rem;">Historial del Vehículo ${numeroVehiculo}</h3>
    <div class="reportes-grid">
      ${reportesVehiculo.map(reporte => `
        <div class="reporte-card" onclick="verDetalle(${reporte.id})">
          <div class="reporte-header">
            <div class="reporte-vehiculo">Reporte #${reporte.id}</div>
            <div class="reporte-estado estado-${reporte.estado.replace(/ /g, '-').replace(/Á/g, 'A').replace(/É/g, 'E').replace(/Í/g, 'I').replace(/Ó/g, 'O').replace(/Ú/g, 'U')}">
              ${reporte.estado}
            </div>
          </div>
          <div class="reporte-descripcion">
            ${reporte.descripcion || 'Sin descripción'}
          </div>
          <div class="reporte-footer">
            <span>📅 ${formatearFecha(reporte.fecha_reporte)}</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// ========== ESTADÍSTICAS ==========
async function cargarEstadisticas() {
  const reportes = await obtenerReportes();
  
  if (reportes.length === 0) {
    const container = document.getElementById('estadisticasContent');
    container.innerHTML = '<p>No hay datos estadísticos disponibles. Crea algunos reportes para empezar.</p>';
    return;
  }
  
  // Contar reportes por estado
  const stats = {};
  reportes.forEach(r => {
    stats[r.estado] = (stats[r.estado] || 0) + 1;
  });
  
  const statsArray = Object.entries(stats).map(([estado, cantidad]) => ({
    estado,
    cantidad
  }));
  
  const total = reportes.length;
  const container = document.getElementById('estadisticasContent');
    
    container.innerHTML = `
      <div class="stat-card" style="background: linear-gradient(135deg, #1a1a1a, #2a2a2a); grid-column: 1 / -1;">
        <div class="stat-number">${total}</div>
        <div class="stat-label">Total de Reportes</div>
      </div>
      
      <div class="stats-grid">
        ${statsArray.map((stat, index) => {
          const colores = [
            { bg: 'linear-gradient(135deg, #e31e24, #b91820)', border: '#e31e24' },
            { bg: 'linear-gradient(135deg, #f59e0b, #d97706)', border: '#f59e0b' },
            { bg: 'linear-gradient(135deg, #10b981, #059669)', border: '#10b981' },
            { bg: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: '#3b82f6' },
            { bg: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', border: '#8b5cf6' },
            { bg: 'linear-gradient(135deg, #ec4899, #db2777)', border: '#ec4899' },
            { bg: 'linear-gradient(135deg, #64748b, #475569)', border: '#64748b' }
          ];
          const color = colores[index % colores.length];
          return `
            <div class="stat-card" style="background: ${color.bg}; border-bottom-color: ${color.border};">
              <div class="stat-number">${stat.cantidad}</div>
              <div class="stat-label">${stat.estado}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
}

// ========== MODAL ==========
function cerrarModal() {
  document.getElementById('modalDetalle').style.display = 'none';
}

window.onclick = function(event) {
  const modal = document.getElementById('modalDetalle');
  if (event.target === modal) {
    cerrarModal();
  }
}

// ========== UTILIDADES ==========
function formatearFecha(fecha) {
  const date = new Date(fecha);
  const hoy = new Date();
  const diff = Math.floor((hoy - date) / (1000 * 60 * 60 * 24));
  
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  if (diff < 7) return `Hace ${diff} días`;
  
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatearFechaCompleta(fecha) {
  const date = new Date(fecha);
  return date.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function mostrarToast(mensaje, tipo = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = mensaje;
  toast.className = `toast show ${tipo}`;
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// ========== PWA ==========
function configurarPWA() {
  // Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => console.log('✅ Service Worker registrado'))
      .catch(err => console.log('❌ Error en Service Worker:', err));
  }
  
  // Instalación
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('installBtn').style.display = 'block';
  });
  
  document.getElementById('installBtn').addEventListener('click', async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      mostrarToast('✅ App instalada exitosamente', 'success');
    }
    
    deferredPrompt = null;
    document.getElementById('installBtn').style.display = 'none';
  });
}

// ========== PROVEEDORES/TALLERES ==========
function cargarProveedoresPrueba() {
  // Proveedores de prueba desactivados
  // Los proveedores se agregarán manualmente desde el módulo de Proveedores
  console.log('✅ Módulo de proveedores iniciado sin datos de prueba');
}

async function cargarProveedores() {
  const proveedores = await obtenerProveedores();
  const container = document.getElementById('listaProveedores');
  
  if (proveedores.length === 0) {
    container.innerHTML = '<p class="empty-message">No hay proveedores registrados. Agrega el primero.</p>';
    return;
  }
  
  // Ordenar por calificación y nombre
  proveedores.sort((a, b) => {
    if (a.activo !== b.activo) return b.activo - a.activo;
    if (b.calificacion !== a.calificacion) return b.calificacion - a.calificacion;
    return a.nombre.localeCompare(b.nombre);
  });
  
  container.innerHTML = proveedores.map(proveedor => `
    <div class="proveedor-card ${!proveedor.activo ? 'inactivo' : ''}">
      <div class="proveedor-header">
        <div>
          <h3>${proveedor.tipo === 'TALLER' ? '🏭' : '📦'} ${proveedor.nombre}</h3>
          <span class="badge badge-${proveedor.tipo.toLowerCase()}">${proveedor.tipo}</span>
          ${!proveedor.activo ? '<span class="badge badge-inactive">INACTIVO</span>' : ''}
        </div>
        <div class="proveedor-calificacion">
          ${'⭐'.repeat(Math.round(proveedor.calificacion))}
          <span class="calificacion-num">${proveedor.calificacion.toFixed(1)}</span>
        </div>
      </div>
      
      <div class="proveedor-info">
        <div class="info-item">
          <strong>📋 Especialidades:</strong>
          <span>${proveedor.especialidades.join(', ')}</span>
        </div>
        
        <div class="info-item">
          <strong>👤 Contacto:</strong>
          <span>${proveedor.contacto}</span>
        </div>
        
        <div class="info-item">
          <strong>📞 Teléfono:</strong>
          <span><a href="tel:${proveedor.telefono}">${proveedor.telefono}</a></span>
        </div>
        
        ${proveedor.email ? `
          <div class="info-item">
            <strong>📧 Email:</strong>
            <span><a href="mailto:${proveedor.email}">${proveedor.email}</a></span>
          </div>
        ` : ''}
        
        <div class="info-item">
          <strong>📍 Dirección:</strong>
          <span>${proveedor.direccion}, ${proveedor.ciudad}</span>
        </div>
        
        ${proveedor.notas ? `
          <div class="info-item">
            <strong>📝 Notas:</strong>
            <span>${proveedor.notas}</span>
          </div>
        ` : ''}
      </div>
      
      <div class="proveedor-actions">
        <button class="btn btn-sm btn-secondary" onclick="editarProveedor(${proveedor.id})">✏️ Editar</button>
        <button class="btn btn-sm ${proveedor.activo ? 'btn-warning' : 'btn-success'}" 
                onclick="toggleActivoProveedor(${proveedor.id})">
          ${proveedor.activo ? '🚫 Desactivar' : '✅ Activar'}
        </button>
        <button class="btn btn-sm btn-danger" onclick="eliminarProveedor(${proveedor.id})">🗑️ Eliminar</button>
      </div>
    </div>
  `).join('');
}

function abrirFormularioProveedor(proveedorId = null) {
  const proveedor = proveedorId ? obtenerProveedores().find(p => p.id === proveedorId) : null;
  const modal = document.getElementById('modalProveedor');
  const container = document.getElementById('formularioProveedor');
  
  container.innerHTML = `
    <h2>${proveedor ? '✏️ Editar Proveedor' : '➕ Nuevo Proveedor'}</h2>
    <form id="formProveedor">
      <input type="hidden" id="proveedor_id" value="${proveedor?.id || ''}">
      
      <div class="form-group">
        <label for="proveedor_nombre">Nombre *</label>
        <input type="text" id="proveedor_nombre" value="${proveedor?.nombre || ''}" required>
      </div>
      
      <div class="form-group">
        <label for="proveedor_tipo">Tipo *</label>
        <select id="proveedor_tipo" required>
          <option value="TALLER" ${proveedor?.tipo === 'TALLER' ? 'selected' : ''}>🏭 Taller</option>
          <option value="PROVEEDOR" ${proveedor?.tipo === 'PROVEEDOR' ? 'selected' : ''}>📦 Proveedor de Repuestos</option>
        </select>
      </div>
      
      <div class="form-group">
        <label for="proveedor_especialidades">Especialidades (separadas por coma) *</label>
        <input type="text" id="proveedor_especialidades" 
               value="${proveedor?.especialidades.join(', ') || ''}" 
               placeholder="Motor, Transmisión, Frenos" required>
      </div>
      
      <div class="form-group">
        <label for="proveedor_contacto">Persona de Contacto *</label>
        <input type="text" id="proveedor_contacto" value="${proveedor?.contacto || ''}" required>
      </div>
      
      <div class="form-group">
        <label for="proveedor_telefono">Teléfono *</label>
        <input type="tel" id="proveedor_telefono" value="${proveedor?.telefono || ''}" 
               placeholder="300-123-4567" required>
      </div>
      
      <div class="form-group">
        <label for="proveedor_email">Email</label>
        <input type="email" id="proveedor_email" value="${proveedor?.email || ''}" 
               placeholder="contacto@proveedor.com">
      </div>
      
      <div class="form-group">
        <label for="proveedor_direccion">Dirección *</label>
        <input type="text" id="proveedor_direccion" value="${proveedor?.direccion || ''}" required>
      </div>
      
      <div class="form-group">
        <label for="proveedor_ciudad">Ciudad *</label>
        <input type="text" id="proveedor_ciudad" value="${proveedor?.ciudad || 'Bogotá'}" required>
      </div>
      
      <div class="form-group">
        <label for="proveedor_calificacion">Calificación (1-5)</label>
        <input type="number" id="proveedor_calificacion" min="1" max="5" step="0.1" 
               value="${proveedor?.calificacion || 5}" required>
      </div>
      
      <div class="form-group">
        <label for="proveedor_notas">Notas</label>
        <textarea id="proveedor_notas" rows="3">${proveedor?.notas || ''}</textarea>
      </div>
      
      <div class="form-actions">
        <button type="submit" class="btn btn-primary">💾 Guardar</button>
        <button type="button" class="btn btn-secondary" onclick="cerrarModalProveedor()">❌ Cancelar</button>
      </div>
    </form>
  `;
  
  document.getElementById('formProveedor').addEventListener('submit', guardarProveedor);
  modal.style.display = 'block';
}

function guardarProveedor(e) {
  e.preventDefault();
  
  const id = document.getElementById('proveedor_id').value;
  const proveedores = obtenerProveedores();
  
  const proveedor = {
    id: id ? parseInt(id) : (proveedores.length > 0 ? Math.max(...proveedores.map(p => p.id)) + 1 : 1),
    nombre: document.getElementById('proveedor_nombre').value,
    tipo: document.getElementById('proveedor_tipo').value,
    especialidades: document.getElementById('proveedor_especialidades').value.split(',').map(e => e.trim()),
    contacto: document.getElementById('proveedor_contacto').value,
    telefono: document.getElementById('proveedor_telefono').value,
    email: document.getElementById('proveedor_email').value,
    direccion: document.getElementById('proveedor_direccion').value,
    ciudad: document.getElementById('proveedor_ciudad').value,
    calificacion: parseFloat(document.getElementById('proveedor_calificacion').value),
    notas: document.getElementById('proveedor_notas').value,
    activo: true,
    fecha_registro: id ? proveedores.find(p => p.id === parseInt(id)).fecha_registro : new Date().toISOString()
  };
  
  if (id) {
    const index = proveedores.findIndex(p => p.id === parseInt(id));
    proveedores[index] = proveedor;
  } else {
    proveedores.push(proveedor);
  }
  
  guardarProveedores(proveedores);
  cargarProveedores();
  cerrarModalProveedor();
  mostrarToast(id ? 'Proveedor actualizado' : 'Proveedor agregado', 'success');
}

function editarProveedor(id) {
  abrirFormularioProveedor(id);
}

function toggleActivoProveedor(id) {
  const proveedores = obtenerProveedores();
  const proveedor = proveedores.find(p => p.id === id);
  
  if (proveedor) {
    proveedor.activo = !proveedor.activo;
    guardarProveedores(proveedores);
    cargarProveedores();
    mostrarToast(proveedor.activo ? 'Proveedor activado' : 'Proveedor desactivado', 'info');
  }
}

function eliminarProveedor(id) {
  if (!confirm('¿Estás seguro de eliminar este proveedor?')) return;
  
  const proveedores = obtenerProveedores().filter(p => p.id !== id);
  guardarProveedores(proveedores);
  cargarProveedores();
  mostrarToast('Proveedor eliminado', 'success');
}

function cerrarModalProveedor() {
  document.getElementById('modalProveedor').style.display = 'none';
}
