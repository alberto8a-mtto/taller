// ========== VARIABLES GLOBALES ==========
let reporteActual = null;
let deferredPrompt = null;

// Caché para optimizar rendimiento
let cacheReportes = null;
let cacheProveedores = null;
let ultimaActualizacion = null;
const TIEMPO_CACHE = 5000; // 5 segundos

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
async function obtenerReportes(forzarRecarga = false) {
  // Usar caché si está disponible y es reciente
  const ahora = Date.now();
  if (!forzarRecarga && cacheReportes && ultimaActualizacion && (ahora - ultimaActualizacion < TIEMPO_CACHE)) {
    return cacheReportes;
  }
  
  if (typeof googleSheets !== 'undefined' && googleSheets.isConfigured()) {
    try {
      const reportes = await googleSheets.leerReportes();
      cacheReportes = reportes;
      ultimaActualizacion = ahora;
      return reportes;
    } catch (error) {
      console.error('Error al leer desde Google Sheets, usando localStorage:', error);
    }
  }
  
  const data = localStorage.getItem(STORAGE_KEY);
  const reportes = data ? JSON.parse(data) : [];
  cacheReportes = reportes;
  ultimaActualizacion = ahora;
  return reportes;
}

// Guardar reportes (guarda en localStorage y Google Sheets)
async function guardarReportes(reportes) {
  // Actualizar caché inmediatamente
  cacheReportes = reportes;
  ultimaActualizacion = Date.now();
  
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
async function obtenerProveedores(forzarRecarga = false) {
  // Usar caché si está disponible y no se fuerza recarga
  if (!forzarRecarga && cacheProveedores) {
    return cacheProveedores;
  }
  
  // Intentar cargar desde Google Sheets primero
  if (typeof googleSheets !== 'undefined' && googleSheets.isConfigured()) {
    try {
      const proveedores = await googleSheets.leerProveedores();
      if (proveedores && proveedores.length > 0) {
        cacheProveedores = proveedores;
        // Guardar en localStorage como respaldo
        localStorage.setItem(STORAGE_KEY_PROVEEDORES, JSON.stringify(proveedores));
        console.log(`✅ ${proveedores.length} proveedores cargados desde Google Sheets`);
        return proveedores;
      }
    } catch (error) {
      console.error('Error al leer proveedores desde Google Sheets:', error);
    }
  }
  
  // Fallback a localStorage
  const data = localStorage.getItem(STORAGE_KEY_PROVEEDORES);
  const proveedores = data ? JSON.parse(data) : [];
  cacheProveedores = proveedores;
  console.log(`📦 ${proveedores.length} proveedores cargados desde localStorage`);
  return proveedores;
}

// Guardar proveedores
async function guardarProveedores(proveedores) {
  // Actualizar caché inmediatamente
  cacheProveedores = proveedores;
  
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
  } else if (vista === 'seguimiento') {
    cargarReportesSeguimiento();
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
    oculto: false,
    fecha_reporte: new Date().toISOString(),
    fecha_actualizacion: new Date().toISOString()
  };
  
  reportes.push(nuevoReporte);
  await guardarReportes(reportes);
  
  mostrarToast('Reporte creado exitosamente', 'success');
  document.getElementById('formNuevoReporte').reset();
  cambiarVista('lista');
  cargarReportes();
  cargarEstadisticas();
}

// ========== CARGA DE DATOS ==========
async function cargarReportes() {
  const filtro = document.getElementById('filtroEstado').value;
  let reportes = await obtenerReportes();
  
  // Filtrar reportes ocultos
  reportes = reportes.filter(r => !r.oculto);
  
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
    <div class="reporte-card" onclick="verDetalle(${reporte.id})" style="cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;">
      <div class="reporte-header">
        <div class="reporte-vehiculo">Vehículo ${reporte.numero_vehiculo}</div>
        <div class="reporte-estado estado-${reporte.estado.replace(/ /g, '-').replace(/Á/g, 'A').replace(/É/g, 'E').replace(/Í/g, 'I').replace(/Ó/g, 'O').replace(/Ú/g, 'U')}">
          ${reporte.estado}
        </div>
      </div>
      <div class="reporte-descripcion">
        ${reporte.descripcion || 'Sin descripción'}
      </div>
      <div class="reporte-metadata">
        <div class="metadata-item">
          <span class="metadata-label">Fecha:</span>
          <span class="metadata-value">${formatearFecha(reporte.fecha_reporte)}</span>
        </div>
        ${reporte.tecnico_asignado ? `
        <div class="metadata-item">
          <span class="metadata-label">Técnico:</span>
          <span class="metadata-value">${reporte.tecnico_asignado}</span>
        </div>` : ''}
        ${reporte.taller_asignado ? `
        <div class="metadata-item">
          <span class="metadata-label">Taller:</span>
          <span class="metadata-value">${reporte.taller_asignado}</span>
        </div>` : ''}
      </div>
      <div class="reporte-action">
        <button class="btn-ver-detalle">Ver Detalles</button>
      </div>
    </div>
  `).join('');
}

async function cargarReportesSeguimiento() {
  let reportes = await obtenerReportes();
  
  // Filtrar solo reportes en SEGUIMIENTO (ocultos pero editables)
  reportes = reportes.filter(r => r.estado === 'SEGUIMIENTO');
  
  // Ordenar por fecha de actualización (más reciente primero)
  reportes.sort((a, b) => new Date(b.fecha_actualizacion) - new Date(a.fecha_actualizacion));
  
  const container = document.getElementById('listaSeguimiento');
  
  if (reportes.length === 0) {
    container.innerHTML = '<div class="card"><p>No hay reportes en seguimiento</p></div>';
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
  const reportes = await obtenerReportes();
  const reporte = reportes.find(r => r.id === id);
  
  if (!reporte) {
    mostrarToast('Reporte no encontrado', 'error');
    return;
  }
  
  reporteActual = reporte;
  mostrarModalDetalle(reporte);
}

async function mostrarModalDetalle(reporte) {
  const modal = document.getElementById('modalDetalle');
  const detalle = document.getElementById('detalleReporte');
  
  // Generar el formulario de manera async
  const formularioActualizacion = await generarFormularioActualizacion(reporte);
  
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
          <div class="info-value">${reporte.requiere_reparacion ? 'Sí' : 'No'}</div>
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
      ${formularioActualizacion}
    </div>
    
    <div class="detalle-section" style="border-top: 2px solid #dc3545; margin-top: 2rem; padding-top: 1rem;">
      <h3 style="color: #dc3545;">Zona Peligrosa</h3>
      <p style="color: var(--text-secondary); margin-bottom: 1rem;">Esta acción no se puede deshacer.</p>
      <button type="button" class="btn" style="background: #dc3545; width: 100%;" onclick="confirmarEliminarReporte(${reporte.id})">
        Eliminar Reporte
      </button>
    </div>
  `;
  
  modal.style.display = 'block';
}

async function generarFormularioActualizacion(reporte) {
  const siguientesEstados = obtenerSiguientesEstados(reporte.estado);
  
  // Si el estado actual es REPORTE, mostrar formulario completo de asignación y análisis
  if (reporte.estado === 'REPORTE') {
    // Cargar proveedores para el select
    const proveedores = await obtenerProveedores();
    
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
          <label>Proveedor/Taller Asignado:</label>
          <select id="tallerAsignado">
            <option value="">-- Seleccionar Proveedor/Taller --</option>
            ${proveedores.map(prov => `<option value="${prov.nombre}">${prov.nombre}</option>`).join('')}
          </select>
          <small style="color: var(--text-secondary); display: block; margin-top: 0.5rem;">
            Opcional: Puedes asignarlo ahora o más tarde
          </small>
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
  // Cargar proveedores para el select
  const proveedores = await obtenerProveedores();
  
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
      
      <div class="form-group">
        <label>Proveedor/Taller Asignado:</label>
        <select id="tallerAsignado">
          <option value="">-- Seleccionar Proveedor/Taller --</option>
          ${proveedores.map(prov => `<option value="${prov.nombre}">${prov.nombre}</option>`).join('')}
        </select>
        <small style="color: var(--text-secondary); display: block; margin-top: 0.5rem;">
          Puedes cambiar el taller asignado en cualquier momento
        </small>
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
    
    <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 2px solid #10b981;">
      <h4 style="color: #10b981; margin-bottom: 1rem;">🏁 Finalizar Orden</h4>
      <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 1rem;">
        Finaliza esta orden de trabajo y archívala.
      </p>
      <button type="button" class="btn" style="background: #10b981; width: 100%;" onclick="mostrarModalFinalizarOrden()">
        Finalizar Orden de Trabajo
      </button>
    </div>
    
    <script>
      // Preseleccionar el taller actual si existe
      const tallerSelect = document.getElementById('tallerAsignado');
      if (tallerSelect && '${reporte.taller_asignado || ''}') {
        tallerSelect.value = '${reporte.taller_asignado || ''}';
      }
      
      document.getElementById('nuevoEstado').addEventListener('change', function() {
        const estado = this.value;
        document.getElementById('campoTecnico').style.display = 
          estado === 'TÉCNICO ASIGNADO' ? 'block' : 'none';
        document.getElementById('campoDiagnostico').style.display = 
          estado === 'DIAGNÓSTICO' ? 'block' : 'none';
        document.getElementById('campoReparacion').style.display = 
          estado === 'DIAGNÓSTICO' ? 'block' : 'none';
      });
    </script>
  `;
}

function obtenerSiguientesEstados(estadoActual) {
  // Todos los estados disponibles para libre edición (excepto SEGUIMIENTO y DISPONIBLE que son finales)
  const todosLosEstados = [
    'REPORTE',
    'TÉCNICO ASIGNADO',
    'ANÁLISIS',
    'TALLER',
    'DIAGNÓSTICO',
    'REPARACIÓN'
  ];
  
  // Si está en SEGUIMIENTO, permitir cambiar a cualquier estado (para editar)
  if (estadoActual === 'SEGUIMIENTO') {
    return todosLosEstados;
  }
  
  // Filtrar el estado actual para no mostrarlo como opción
  return todosLosEstados.filter(estado => estado !== estadoActual);
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
  
  // Si estaba en SEGUIMIENTO y se cambia a otro estado, hacerlo visible de nuevo
  if (reporteActual.estado === 'SEGUIMIENTO' && nuevoEstado !== 'SEGUIMIENTO') {
    reportes[index].oculto = false;
  }
  
  if (tecnico) reportes[index].tecnico_asignado = tecnico;
  if (taller) reportes[index].taller_asignado = taller;
  if (diagnostico) reportes[index].diagnostico = diagnostico;
  if (requiereReparacion !== '') reportes[index].requiere_reparacion = parseInt(requiereReparacion);
  if (analisisInicial) reportes[index].analisis = analisisInicial;
  if (notas) reportes[index].notas = notas;
  
  await guardarReportes(reportes);
  
  mostrarToast('Reporte actualizado exitosamente', 'success');
  cerrarModal();
  cargarReportes();
  cargarEstadisticas();
}

// ========== BÚSQUEDA ==========
async function buscarPorVehiculo() {
  const numeroVehiculo = document.getElementById('buscarVehiculo').value.trim();
  const fechaDesde = document.getElementById('fechaDesde').value;
  const fechaHasta = document.getElementById('fechaHasta').value;
  
  if (!numeroVehiculo) {
    mostrarToast('Ingresa un número de vehículo', 'error');
    return;
  }
  
  const reportes = await obtenerReportes();
  
  // Búsqueda flexible: comparar como string y como número
  let reportesVehiculo = reportes.filter(r => {
    const vehiculoReporte = String(r.numero_vehiculo).trim();
    const vehiculoBuscado = String(numeroVehiculo).trim();
    return vehiculoReporte === vehiculoBuscado || 
           vehiculoReporte.toLowerCase() === vehiculoBuscado.toLowerCase();
  });
  
  console.log('🔍 Búsqueda de vehículo:', numeroVehiculo);
  console.log('📊 Total reportes en sistema:', reportes.length);
  console.log('✅ Reportes encontrados:', reportesVehiculo.length);
  
  // Filtrar por rango de fechas si se proporcionaron
  if (fechaDesde) {
    const desde = new Date(fechaDesde);
    desde.setHours(0, 0, 0, 0);
    reportesVehiculo = reportesVehiculo.filter(r => {
      const fechaReporte = new Date(r.fecha_reporte);
      fechaReporte.setHours(0, 0, 0, 0);
      return fechaReporte >= desde;
    });
    console.log('📅 Después de filtrar fecha desde:', reportesVehiculo.length);
  }
  
  if (fechaHasta) {
    const hasta = new Date(fechaHasta);
    hasta.setHours(23, 59, 59, 999);
    reportesVehiculo = reportesVehiculo.filter(r => {
      const fechaReporte = new Date(r.fecha_reporte);
      return fechaReporte <= hasta;
    });
    console.log('📅 Después de filtrar fecha hasta:', reportesVehiculo.length);
  }
  
  // Ordenar por fecha de reporte (más reciente primero)
  reportesVehiculo.sort((a, b) => new Date(b.fecha_reporte) - new Date(a.fecha_reporte));
  
  const container = document.getElementById('resultadosBusqueda');
  
  if (reportesVehiculo.length === 0) {
    const mensajeFecha = (fechaDesde || fechaHasta) 
      ? ` en el rango de fechas seleccionado`
      : '';
    
    // Mostrar sugerencias si hay reportes en el sistema
    const sugerencias = reportes.length > 0 
      ? `<p style="margin-top: 1rem; color: #666;">💡 Vehículos registrados: ${[...new Set(reportes.map(r => r.numero_vehiculo))].join(', ')}</p>`
      : '';
    
    container.innerHTML = `
      <div class="search-no-results">
        <p>❌ No se encontraron reportes para el vehículo <strong>${numeroVehiculo}</strong>${mensajeFecha}</p>
        ${sugerencias}
      </div>
    `;
    return;
  }
  
  const rangoFechas = (fechaDesde || fechaHasta) 
    ? `<p class="search-info">📅 Mostrando ${reportesVehiculo.length} reporte(s) ${fechaDesde ? `desde ${formatearFecha(fechaDesde)}` : ''} ${fechaHasta ? `hasta ${formatearFecha(fechaHasta)}` : ''}</p>`
    : `<p class="search-info">📊 Total: ${reportesVehiculo.length} reporte(s) encontrado(s)</p>`;
  
  container.innerHTML = `
    <div class="search-results">
      <h3>Historial del Vehículo ${numeroVehiculo}</h3>
      ${rangoFechas}
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
              ${reporte.tecnico_asignado ? `<span>👤 ${reporte.tecnico_asignado}</span>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function limpiarBusqueda() {
  document.getElementById('buscarVehiculo').value = '';
  document.getElementById('fechaDesde').value = '';
  document.getElementById('fechaHasta').value = '';
  document.getElementById('resultadosBusqueda').innerHTML = '';
  mostrarToast('Búsqueda limpiada', 'success');
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

// ========== ELIMINAR REPORTE ==========
function confirmarEliminarReporte(reporteId) {
  const confirmacion = confirm(
    '⚠️ ATENCIÓN: Estás a punto de eliminar este reporte.\n\n' +
    '¿Estás COMPLETAMENTE SEGURO de que deseas eliminar este reporte?\n\n' +
    'Esta acción NO SE PUEDE DESHACER.'
  );
  
  if (!confirmacion) {
    mostrarToast('Operación cancelada', 'info');
    return;
  }
  
  // Segunda confirmación
  const segundaConfirmacion = confirm(
    '🚨 ÚLTIMA CONFIRMACIÓN\n\n' +
    'Esta es tu última oportunidad para cancelar.\n\n' +
    '¿Confirmas que deseas ELIMINAR PERMANENTEMENTE este reporte?\n\n' +
    'Presiona OK para eliminar o Cancelar para mantenerlo.'
  );
  
  if (segundaConfirmacion) {
    eliminarReporte(reporteId);
  } else {
    mostrarToast('Operación cancelada', 'info');
  }
}

async function eliminarReporte(reporteId) {
  try {
    const reportes = await obtenerReportes();
    const reporteIndex = reportes.findIndex(r => r.id === reporteId);
    
    if (reporteIndex === -1) {
      mostrarToast('Reporte no encontrado', 'error');
      return;
    }
    
    const reporteEliminado = reportes[reporteIndex];
    
    // Eliminar el reporte
    reportes.splice(reporteIndex, 1);
    
    // Guardar cambios
    await guardarReportes(reportes);
    
    // Cerrar modal y actualizar vistas
    cerrarModal();
    cargarReportes();
    cargarEstadisticas();
    
    mostrarToast(
      `Reporte #${reporteEliminado.id} (Vehículo ${reporteEliminado.numero_vehiculo}) eliminado correctamente`,
      'success'
    );
  } catch (error) {
    console.error('Error al eliminar reporte:', error);
    mostrarToast('Error al eliminar el reporte', 'error');
  }
}

// ========== MODAL ==========
function cerrarModal() {
  document.getElementById('modalDetalle').style.display = 'none';
}

function mostrarModalFinalizarOrden() {
  const modalHtml = `
    <div id="modalFinalizarOrden" style="display: block; position: fixed; z-index: 1001; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5);">
      <div style="background-color: white; margin: 5% auto; padding: 2rem; width: 90%; max-width: 500px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
        <h3 style="color: #10b981; margin-bottom: 1.5rem;">🏁 Finalizar Orden de Trabajo</h3>
        <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">
          Selecciona cómo deseas finalizar esta orden:
        </p>
        
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          <button type="button" class="btn" style="background: #f59e0b; padding: 1rem; font-size: 1rem;" onclick="finalizarOrden('SEGUIMIENTO')">
            📋 SEGUIMIENTO<br>
            <small style="font-size: 0.85rem; opacity: 0.9;">Se guarda pero no aparece en la lista. Puedes editarlo después.</small>
          </button>
          
          <button type="button" class="btn" style="background: #10b981; padding: 1rem; font-size: 1rem;" onclick="finalizarOrden('DISPONIBLE')">
            ✅ DISPONIBLE<br>
            <small style="font-size: 0.85rem; opacity: 0.9;">Vehículo disponible. Se archiva y oculta de la lista.</small>
          </button>
        </div>
        
        <button type="button" class="btn" style="background: #64748b; width: 100%; margin-top: 1.5rem;" onclick="cerrarModalFinalizarOrden()">
          Cancelar
        </button>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function cerrarModalFinalizarOrden() {
  const modal = document.getElementById('modalFinalizarOrden');
  if (modal) {
    modal.remove();
  }
}

async function finalizarOrden(tipoFinalizacion) {
  if (!reporteActual) {
    mostrarToast('Error: No hay reporte activo', 'error');
    return;
  }
  
  const reportes = await obtenerReportes();
  const index = reportes.findIndex(r => r.id === reporteActual.id);
  
  if (index === -1) {
    mostrarToast('Reporte no encontrado', 'error');
    return;
  }
  
  // Actualizar el reporte
  reportes[index].estado = tipoFinalizacion;
  reportes[index].oculto = true; // Ambos se ocultan de la lista
  reportes[index].fecha_actualizacion = new Date().toISOString();
  
  await guardarReportes(reportes);
  
  const mensaje = tipoFinalizacion === 'SEGUIMIENTO' 
    ? '📋 Orden enviada a SEGUIMIENTO (oculta, editable)'
    : '✅ Vehículo marcado como DISPONIBLE (archivado)';
  
  mostrarToast(mensaje, 'success');
  cerrarModalFinalizarOrden();
  cerrarModal();
  cargarReportes();
  cargarEstadisticas();
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
    const swPath = window.location.hostname === 'mgomez0520.github.io' 
      ? '/TALLER/public/service-worker.js'
      : '/service-worker.js';
    
    navigator.serviceWorker.register(swPath)
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
      mostrarToast('App instalada exitosamente', 'success');
    }
    
    deferredPrompt = null;
    document.getElementById('installBtn').style.display = 'none';
  });
}

// ========== PROVEEDORES/TALLERES ==========
async function cargarProveedoresPrueba() {
  // Verificar si ya hay proveedores en localStorage
  const proveedoresExistentes = localStorage.getItem(STORAGE_KEY_PROVEEDORES);
  
  if (!proveedoresExistentes || JSON.parse(proveedoresExistentes).length === 0) {
    console.log('📥 Cargando base de datos inicial de proveedores...');
    
    // Base de datos de 62 proveedores
    const proveedoresIniciales = [
      {id: 1, nombre: "DIESEL ANDINO", categoria: "TALLER TIPO 1", nit: "811.006.409", servicio: "MECANICA EN GENERAL", ciudad: "MUNICIPIOS DEL AMVA", tipo: "JURIDICA", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 2, nombre: "SUPERPOLO S.A.S", categoria: "TALLER TIPO 1", nit: "830.092.963", servicio: "CARROCERIA", ciudad: "MEDELLIN CENTRO", tipo: "JURIDICA", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 3, nombre: "AUTOAMERICA", categoria: "TALLER TIPO 1", nit: "890.904.615", servicio: "MECANICA EN GENERAL", ciudad: "CARIBE ZONA", tipo: "JURIDICA", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 4, nombre: "SCANIA COLOMBIA S.A.S", categoria: "TALLER TIPO 1", nit: "900.353.873", servicio: "MECANICA EN GENERAL", ciudad: "MUNICIPIOS DEL AMVA", tipo: "JURIDICA", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 5, nombre: "TALLER LABORATORIO INYER DIESEL", categoria: "TALLER TIPO 2", nit: "79.508.565", servicio: "LABORATORIO", ciudad: "MEDELLIN CENTRO", tipo: "JURIDICA", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 6, nombre: "YAMERSON MELO FONSECA", categoria: "TALLER TIPO 2", nit: "79.807.095", servicio: "SISTEMA DE INYECCION", ciudad: "BOGOTA", tipo: "NATURAL", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 7, nombre: "EURO TRUCK BUSES DIAZ", categoria: "TALLER TIPO 2", nit: "700.258.353", servicio: "MECANICA EN GENERAL", ciudad: "CARIBE ZONA", tipo: "NATURAL", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 8, nombre: "TECNI ISUZU", categoria: "TALLER TIPO 2", nit: "830.007.802", servicio: "MECANICA EN GENERAL", ciudad: "BOGOTA", tipo: "JURIDICA", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 9, nombre: "IVESUR COLOMBIA S.A.", categoria: "TALLER TIPO 2", nit: "900.081.357", servicio: "CDA", ciudad: "MEDELLIN CENTRO", tipo: "JURIDICA", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 10, nombre: "AUTOBUSES ICC", categoria: "TALLER TIPO 2", nit: "900.366.983", servicio: "CARROCERIA", ciudad: "COPACABANA", tipo: "JURIDICA", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 11, nombre: "JGB MEDELLIN S.A.S", categoria: "TALLER TIPO 2", nit: "900.387.453", servicio: "CARROCERIA", ciudad: "CARIBE ZONA", tipo: "JURIDICA", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 12, nombre: "COMPRESORES CEGAUTO SAS", categoria: "TALLER TIPO 2", nit: "900.734.495", servicio: "SISTEMA AIRE COMPRIMIDO", ciudad: "MEDELLIN CENTRO", tipo: "JURIDICA", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 13, nombre: "TALLER TECNICAR S.A.S.", categoria: "TALLER TIPO 2", nit: "901.078.916", servicio: "CARROCERIA", ciudad: "BOGOTA", tipo: "JURIDICA", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 14, nombre: "DISGNOSTICENTRO TECNODIESEL", categoria: "TALLER TIPO 2", nit: "901.173.624", servicio: "LABORATORIO INYECCION", ciudad: "ITAGUI", tipo: "JURIDICA", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 15, nombre: "REPARACIONES JASS S.A.S", categoria: "TALLER TIPO 2", nit: "901.184.549", servicio: "CARROCERIA", ciudad: "CARIBE ZONA", tipo: "JURIDICA", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 16, nombre: "ACOPLES ALEX JCV SAS", categoria: "TALLER TIPO 2", nit: "901.269.728", servicio: "TORNO", ciudad: "CARIBE ZONA", tipo: "NATURAL", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 17, nombre: "DIRECCIONES HIDRAULICAS EL BUFALO SAS", categoria: "TALLER TIPO 2", nit: "901.353.584", servicio: "SISTEMA DE DIRECCION", ciudad: "MEDELLIN CENTRO", tipo: "JURIDICA", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 18, nombre: "CENTRO DE SERVICIOS GAMA ALTA S.A.S", categoria: "TALLER TIPO 2", nit: "901.388.533", servicio: "CARROCERIA", ciudad: "CARIBE R8A", tipo: "JURIDICA", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 19, nombre: "AUTOBUSES COL", categoria: "TALLER TIPO 2", nit: "1.020.469.334", servicio: "CARROCERIA", ciudad: "CARIBE ZONA", tipo: "NATURAL", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 20, nombre: "JOHNY DIESEL", categoria: "TALLER TIPO 2", nit: "1.152.698.067", servicio: "MOTORES", ciudad: "MEDELLIN CENTRO", tipo: "NATURAL", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 21, nombre: "GIOVANNI DANIEL BOHORQUEZ COLMENARES", categoria: "TALLER TIPO 3", nit: "894.525", servicio: "AIRE ACONDICIONADO", ciudad: "CARIBE ZONA", tipo: "NATURAL", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 22, nombre: "ALCIDES MEJIA", categoria: "TALLER TIPO 3", nit: "8.309.922", servicio: "FRENOS Y SUSPENSIÓN", ciudad: "AMAGA", tipo: "NATURAL", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 23, nombre: "IVAN RENDON", categoria: "TALLER TIPO 3", nit: "8.757.153", servicio: "CARROCERIA", ciudad: "MEDELLIN CENTRO", tipo: "NATURAL", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 24, nombre: "ANDRES MURILLO", categoria: "TALLER TIPO 3", nit: "11.797.868", servicio: "MOTORES", ciudad: "CARIBE ZONA", tipo: "NATURAL", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 25, nombre: "THERMO BUS", categoria: "TALLER TIPO 3", nit: "13.513.886", servicio: "AIRE ACONDICIONADO", ciudad: "BOGOTA", tipo: "NATURAL", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 26, nombre: "DEIBYS ANDRES URREGO ROLDAN", categoria: "TALLER TIPO 3", nit: "15.489.840", servicio: "SISTEMA ELECTRICO", ciudad: "URRAO", tipo: "NATURAL", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 27, nombre: "AICARDO URAN", categoria: "TALLER TIPO 3", nit: "15.490.588", servicio: "FRENOS Y SUSPENSIÓN", ciudad: "URRAO", tipo: "NATURAL", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 28, nombre: "SERGIO DE JESUS GUTIERREZ ECHEVERRI", categoria: "TALLER TIPO 3", nit: "15.526.110", servicio: "CARROCERIA", ciudad: "JARDIN", tipo: "NATURAL", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 29, nombre: "FRENOS Y MUELLES NANO", categoria: "TALLER TIPO 3", nit: "43.923.387", servicio: "FRENOS Y SUSPENSIÓN", ciudad: "CARIBE ZONA", tipo: "NATURAL", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 30, nombre: "ALFREDO RESTREPO", categoria: "TALLER TIPO 3", nit: "70.124.874", servicio: "CAJAS Y DIFERENCIALES", ciudad: "CARIBE ZONA", tipo: "NATURAL", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 31, nombre: "TALLER EURIPIDES", categoria: "TALLER TIPO 3", nit: "70.166.298", servicio: "FRENOS Y SUSPENSIÓN", ciudad: "MUNICIPIOS DEL AMVA", tipo: "NATURAL", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 32, nombre: "TALLER ALEXANDER JARAMILLO - EL ZORRO", categoria: "TALLER TIPO 3", nit: "71.367.798", servicio: "MOTORES", ciudad: "MEDELLIN CENTRO", tipo: "NATURAL", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 33, nombre: "ELKIN JAVIER FRANCO VERGARA", categoria: "TALLER TIPO 3", nit: "71.526.467", servicio: "MECANICA EN GENERAL", ciudad: "CALDAS", tipo: "NATURAL", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 34, nombre: "ROGELIO TAPIAS HENAO", categoria: "TALLER TIPO 3", nit: "71.593.514", servicio: "MOTORES Y CAJAS", ciudad: "MEDELLIN CENTRO", tipo: "NATURAL", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 35, nombre: "LUIS ENRIQUE AGRESOTH OVIEDO", categoria: "TALLER TIPO 3", nit: "72.173.495", servicio: "AIRE ACONDICIONADO", ciudad: "CARIBE R8A", tipo: "NATURAL", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 36, nombre: "THERMO AIR 2", categoria: "TALLER TIPO 3", nit: "72.295.162", servicio: "AIRE ACONDICIONADO", ciudad: "BARRANQUILLA", tipo: "JURIDICA", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 37, nombre: "CARLOS ORLANDO MUÑOZ", categoria: "TALLER TIPO 3", nit: "79.828.305", servicio: "", ciudad: "", tipo: "NATURAL", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 38, nombre: "QUINTILIANO MARQUEZ", categoria: "TALLER TIPO 3", nit: "80.420.445", servicio: "MECANICA MOTOR", ciudad: "BOGOTA", tipo: "NATURAL", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 39, nombre: "EVELIO RIVERA MELO", categoria: "TALLER TIPO 3", nit: "93.364.999", servicio: "AIRE ACONDICIONADO", ciudad: "CARIBE ZONA", tipo: "NATURAL", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 40, nombre: "ALEXANDER RIVERA MELO", categoria: "TALLER TIPO 3", nit: "93.376.804", servicio: "SISTEMA ELECTRICO", ciudad: "CARIBE R8A", tipo: "NATURAL", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 41, nombre: "ANIBAL RENDON", categoria: "TALLER TIPO 3", nit: "98.493.908", servicio: "RADIADORES", ciudad: "MEDELLIN CENTRO", tipo: "NATURAL", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 42, nombre: "MARIO ALFONSO RESTREPO PEREZ", categoria: "TALLER TIPO 3", nit: "98.521.361", servicio: "MOTORES", ciudad: "CARIBE R8A", tipo: "NATURAL", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 43, nombre: "FRANCISCO MARIN", categoria: "TALLER TIPO 3", nit: "98.580.761", servicio: "CARROCERIA", ciudad: "MEDELLIN CENTRO", tipo: "NATURAL", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 44, nombre: "PABLO HERNAN GOMEZ HERNANDEZ", categoria: "TALLER TIPO 3", nit: "98.582.588", servicio: "FRENOS Y SUSPENSIÓN", ciudad: "CARIBE R8A", tipo: "NATURAL", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 45, nombre: "LUIS GUILLERMO FUENTES PAREJA", categoria: "TALLER TIPO 3", nit: "98.611.783", servicio: "MOTORES-CAJAS- DIFERENCIALES", ciudad: "CARIBE R8A", tipo: "NATURAL", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 46, nombre: "LUIS G. BLANCO HERNANDEZ", categoria: "TALLER TIPO 3", nit: "98.687.307", servicio: "AIRE ACONDICIONADO", ciudad: "SINCELEJO", tipo: "NATURAL", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 47, nombre: "LUIS EFRAIN CADENA", categoria: "TALLER TIPO 3", nit: "803.686.333", servicio: "SISTEMA AIRE COMPRIMIDO", ciudad: "CARIBE R8A", tipo: "NATURAL", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 48, nombre: "TRANSPORTES FRIOS", categoria: "TALLER TIPO 3", nit: "805.031.256", servicio: "AIRE ACONDICIONADO", ciudad: "CARIBE ZONA", tipo: "JURIDICA", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 49, nombre: "VIDRIOS Y ACCESORIOS DE BOGOTA", categoria: "TALLER TIPO 3", nit: "830.144.337", servicio: "VIDRIOS", ciudad: "BOGOTA", tipo: "JURIDICA", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 50, nombre: "DELTA FRENOS Y ACCESORIOS S.A.S", categoria: "TALLER TIPO 3", nit: "900.120.933", servicio: "FRENOS Y SUSPENSIÓN", ciudad: "CARIBE ZONA", tipo: "JURIDICA", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 51, nombre: "TUTO FRENOS Y MUELLES SAS", categoria: "TALLER TIPO 3", nit: "901.078.517", servicio: "FRENOS Y SUSPENSIÓN", ciudad: "MEDELLIN CENTRO", tipo: "JURIDICA", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 52, nombre: "TECNIAIRES J.S S.A.S", categoria: "TALLER TIPO 3", nit: "901.174.411", servicio: "AIRE ACONDICIONADO", ciudad: "CARIBE ZONA", tipo: "JURIDICA", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 53, nombre: "RADIADORES Y TANQUES ESTADIO S.A.S", categoria: "TALLER TIPO 3", nit: "901.368.208", servicio: "RADIADORES", ciudad: "MEDELLIN CENTRO", tipo: "JURIDICA", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 54, nombre: "FALKON AUTOMOTRIZ", categoria: "TALLER TIPO 3", nit: "901.501.552", servicio: "VIDRIOS", ciudad: "CARIBE ZONA", tipo: "JURIDICA", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 55, nombre: "ANDRES SANTIAGO PEREZ P", categoria: "TALLER TIPO 3", nit: "1.000.100.600", servicio: "IMAGEN CORPORATIVA", ciudad: "CARIBE ZONA", tipo: "NATURAL", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 56, nombre: "JONATHAN ANDREY PEÑA", categoria: "TALLER TIPO 3", nit: "1.024.503.859", servicio: "AIRE ACONDICIONADO", ciudad: "MUNICIPIOS DEL AMVA", tipo: "NATURAL", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 57, nombre: "VIDRIOS ARREGLOS LA MONA", categoria: "TALLER TIPO 3", nit: "1.024.522.683", servicio: "REPARACION VIDRIOS", ciudad: "CARIBE ZONA", tipo: "NATURAL", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 58, nombre: "FREDY ANDRES JIMENEZ MELO", categoria: "TALLER TIPO 3", nit: "1.026.299.101", servicio: "SISTEMA ELECTRICO", ciudad: "CARIBE ZONA", tipo: "NATURAL", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 59, nombre: "LA ESTACION TALLER DIRIMO", categoria: "TALLER TIPO 3", nit: "1.129.497.647", servicio: "MECANICA EN GENERAL", ciudad: "CARIBE ZONA", tipo: "NATURAL", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 60, nombre: "SEBASTIAN LARA ATEHORTUA", categoria: "TALLER TIPO 3", nit: "1.144.188.705", servicio: "CAJAS Y DIFERENCIALES", ciudad: "CARIBE R8A", tipo: "NATURAL", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 61, nombre: "MARIA TERESA GARCIA TRUJILLO", categoria: "TALLER TIPO 3", nit: "1.152.693.622", servicio: "FRENOS Y SUSPENSIÓN", ciudad: "CARIBE ZONA", tipo: "NATURAL", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"},
      {id: 62, nombre: "ALBERTO OCHOA Y CIA SAS", categoria: "TALLER TIPO 3", nit: "890.943.038", servicio: "MECANICA EN GENERAL", ciudad: "CARIBE R8A", tipo: "JURIDICA", direccion: "", telefono: "", email: "", contacto: "", calificacion: 5, activo: true, notas: "", fecha_registro: "2025-12-01"}
    ];
    
    localStorage.setItem(STORAGE_KEY_PROVEEDORES, JSON.stringify(proveedoresIniciales));
    cacheProveedores = proveedoresIniciales;
    console.log(`✅ ${proveedoresIniciales.length} proveedores cargados exitosamente`);
    console.log('   - TALLER TIPO 1: 4 proveedores');
    console.log('   - TALLER TIPO 2: 16 proveedores');
    console.log('   - TALLER TIPO 3: 42 proveedores');
  } else {
    console.log('✅ Proveedores ya cargados en localStorage');
    
    // Intentar sincronizar con Google Sheets en segundo plano
    if (typeof googleSheets !== 'undefined' && googleSheets.isConfigured()) {
      try {
        const proveedoresSheets = await googleSheets.leerProveedores();
        if (proveedoresSheets && proveedoresSheets.length > 0) {
          localStorage.setItem(STORAGE_KEY_PROVEEDORES, JSON.stringify(proveedoresSheets));
          cacheProveedores = proveedoresSheets;
          console.log(`🔄 ${proveedoresSheets.length} proveedores sincronizados desde Google Sheets`);
        }
      } catch (error) {
        console.log('ℹ️ Usando proveedores de localStorage (Google Sheets no disponible)');
      }
    }
  }
}

async function cargarProveedores() {
  const proveedores = await obtenerProveedores();
  const container = document.getElementById('listaProveedores');
  
  if (proveedores.length === 0) {
    container.innerHTML = '<p class="empty-message">No hay proveedores registrados. Agrega el primero.</p>';
    return;
  }
  
  // Ordenar por nombre
  proveedores.sort((a, b) => a.nombre.localeCompare(b.nombre));
  
  // Vista compacta en tabla
  container.innerHTML = `
    <div class="proveedores-table-container">
      <table class="proveedores-table">
        <thead>
          <tr>
            <th>Proveedor</th>
            <th>Categoría</th>
            <th>Servicio</th>
            <th>NIT/CC</th>
            <th>Ciudad</th>
            <th>Contacto</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${proveedores.map(proveedor => {
            const nombre = proveedor.nombre || '';
            const tipo = proveedor.tipo || proveedor.categoria || 'PROVEEDOR';
            const categoria = proveedor.categoria || tipo;
            const servicio = proveedor.servicio || proveedor.especialidades?.join(', ') || '-';
            const contacto = proveedor.contacto || '-';
            const telefono = proveedor.telefono || '-';
            const email = proveedor.email || '-';
            const ciudad = proveedor.ciudad || '-';
            const nit = proveedor.nit || '-';
            const activo = proveedor.activo !== false;
            
            return `
              <tr class="${!activo ? 'row-inactive' : ''}" onclick="editarProveedor(${proveedor.id})" style="cursor: pointer;">
                <td>
                  <div class="proveedor-nombre">
                    <span class="proveedor-icon">${tipo.includes('TALLER') ? '🏭' : '📦'}</span>
                    <strong>${nombre}</strong>
                    ${!activo ? '<span class="badge-mini inactive">INACTIVO</span>' : ''}
                  </div>
                </td>
                <td>
                  <span class="categoria-badge">${categoria}</span>
                </td>
                <td class="servicio-cell">${servicio}</td>
                <td>${nit}</td>
                <td>${ciudad}</td>
                <td class="contacto-cell">
                  ${telefono !== '-' ? `<div><a href="tel:${telefono}" onclick="event.stopPropagation();">📞 ${telefono}</a></div>` : ''}
                  ${email !== '-' ? `<div><a href="mailto:${email}" onclick="event.stopPropagation();">📧 ${email}</a></div>` : ''}
                  ${contacto !== '-' && contacto !== email && contacto !== telefono ? `<div>${contacto}</div>` : ''}
                </td>
                <td class="actions-cell" onclick="event.stopPropagation();">
                  <button class="btn-icon" onclick="editarProveedor(${proveedor.id})" title="Editar">
                    ✏️
                  </button>
                  <button class="btn-icon btn-danger" onclick="eliminarProveedor(${proveedor.id})" title="Eliminar">
                    🗑️
                  </button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function abrirFormularioProveedor(proveedorId = null) {
  const proveedores = await obtenerProveedores();
  const proveedor = proveedorId ? proveedores.find(p => p.id === proveedorId) : null;
  const modal = document.getElementById('modalProveedor');
  const container = document.getElementById('formularioProveedor');
  
  container.innerHTML = `
    <h2>${proveedor ? '✏️ Editar Proveedor' : '➕ Nuevo Proveedor'}</h2>
    <form id="formProveedor">
      <input type="hidden" id="proveedor_id" value="${proveedor?.id || ''}">
      
      <div class="form-row">
        <div class="form-group">
          <label for="proveedor_nombre">Nombre *</label>
          <input type="text" id="proveedor_nombre" value="${proveedor?.nombre || ''}" required>
        </div>
        
        <div class="form-group">
          <label for="proveedor_categoria">Categoría *</label>
          <select id="proveedor_categoria" required>
            <option value="TALLER TIPO 1" ${proveedor?.categoria === 'TALLER TIPO 1' ? 'selected' : ''}>TALLER TIPO 1</option>
            <option value="TALLER TIPO 2" ${proveedor?.categoria === 'TALLER TIPO 2' ? 'selected' : ''}>TALLER TIPO 2</option>
            <option value="TALLER TIPO 3" ${proveedor?.categoria === 'TALLER TIPO 3' ? 'selected' : ''}>TALLER TIPO 3</option>
            <option value="PROVEEDOR" ${proveedor?.categoria === 'PROVEEDOR' ? 'selected' : ''}>PROVEEDOR</option>
          </select>
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="proveedor_nit">NIT/CC *</label>
          <input type="text" id="proveedor_nit" value="${proveedor?.nit || ''}" required>
        </div>
        
        <div class="form-group">
          <label for="proveedor_tipo">Tipo Persona *</label>
          <select id="proveedor_tipo" required>
            <option value="JURIDICA" ${proveedor?.tipo === 'JURIDICA' ? 'selected' : ''}>JURÍDICA</option>
            <option value="NATURAL" ${proveedor?.tipo === 'NATURAL' ? 'selected' : ''}>NATURAL</option>
          </select>
        </div>
      </div>
      
      <div class="form-group">
        <label for="proveedor_servicio">Servicio/Especialidad *</label>
        <input type="text" id="proveedor_servicio" value="${proveedor?.servicio || ''}" 
               placeholder="Ej: MECANICA EN GENERAL, FRENOS Y SUSPENSIÓN" required>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="proveedor_ciudad">Ciudad *</label>
          <input type="text" id="proveedor_ciudad" value="${proveedor?.ciudad || ''}" required>
        </div>
        
        <div class="form-group">
          <label for="proveedor_direccion">Dirección</label>
          <input type="text" id="proveedor_direccion" value="${proveedor?.direccion || ''}">
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="proveedor_telefono">Teléfono</label>
          <input type="tel" id="proveedor_telefono" value="${proveedor?.telefono || ''}">
        </div>
        
        <div class="form-group">
          <label for="proveedor_email">Email</label>
          <input type="email" id="proveedor_email" value="${proveedor?.email || ''}">
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="proveedor_contacto">Persona de Contacto</label>
          <input type="text" id="proveedor_contacto" value="${proveedor?.contacto || ''}">
        </div>
        
        <div class="form-group">
          <label for="proveedor_calificacion">Calificación (1-5)</label>
          <input type="number" id="proveedor_calificacion" min="1" max="5" step="0.5" 
                 value="${proveedor?.calificacion || 5}">
        </div>
      </div>
      
      <div class="form-group">
        <label>
          <input type="checkbox" id="proveedor_activo" ${proveedor?.activo !== false ? 'checked' : ''}>
          Activo
        </label>
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

async function guardarProveedor(e) {
  e.preventDefault();
  
  const id = document.getElementById('proveedor_id').value;
  const proveedores = await obtenerProveedores();
  
  const proveedor = {
    id: id ? parseInt(id) : (proveedores.length > 0 ? Math.max(...proveedores.map(p => p.id)) + 1 : 1),
    nombre: document.getElementById('proveedor_nombre').value.trim(),
    categoria: document.getElementById('proveedor_categoria').value,
    nit: document.getElementById('proveedor_nit').value.trim(),
    servicio: document.getElementById('proveedor_servicio').value.trim(),
    ciudad: document.getElementById('proveedor_ciudad').value.trim(),
    tipo: document.getElementById('proveedor_tipo').value,
    direccion: document.getElementById('proveedor_direccion').value.trim(),
    telefono: document.getElementById('proveedor_telefono').value.trim(),
    email: document.getElementById('proveedor_email').value.trim(),
    contacto: document.getElementById('proveedor_contacto').value.trim(),
    calificacion: parseFloat(document.getElementById('proveedor_calificacion').value) || 5,
    activo: document.getElementById('proveedor_activo').checked,
    notas: document.getElementById('proveedor_notas').value.trim(),
    fecha_registro: id ? proveedores.find(p => p.id === parseInt(id))?.fecha_registro : new Date().toISOString().split('T')[0]
  };
  
  if (id) {
    const index = proveedores.findIndex(p => p.id === parseInt(id));
    proveedores[index] = proveedor;
  } else {
    proveedores.push(proveedor);
  }
  
  await guardarProveedores(proveedores);
  await cargarProveedores();
  cerrarModalProveedor();
  mostrarToast(id ? 'Proveedor actualizado correctamente' : 'Proveedor agregado correctamente', 'success');
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
