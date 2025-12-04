// ========================================
//   DASHBOARD TV - ALBERTO OCHOA
// ========================================

let updateInterval;
let rotationInterval;
const REFRESH_INTERVAL = 10000; // 10 segundos
const ROTATION_INTERVAL = 60000; // 60 segundos (1 minuto) para rotar vehículos
const STORAGE_KEY = 'gestion_taller_reportes';
const VEHICULOS_POR_PAGINA = 4; // Cantidad de vehículos a mostrar por vez
let paginaActual = 0;
let todosLosVehiculos = [];

// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', () => {
  console.log('📊 Dashboard TV iniciado');
  
  // Actualizar reloj
  actualizarReloj();
  setInterval(actualizarReloj, 1000);
  
  // Actualizar datos inmediatamente y cada 10 segundos
  cargarDatosDashboard();
  updateInterval = setInterval(cargarDatosDashboard, REFRESH_INTERVAL);
  
  // Rotar vehículos cada 5 segundos
  rotationInterval = setInterval(rotarVehiculos, ROTATION_INTERVAL);
});

// ========== RELOJ ==========
function actualizarReloj() {
  const ahora = new Date();
  const timeString = ahora.toLocaleTimeString('es-ES', { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit'
  });
  document.getElementById('currentTime').textContent = timeString;
}

// ========== CARGAR DATOS ==========
async function cargarDatosDashboard() {
  try {
    let reportes = [];
    
    // Intentar leer desde Google Sheets primero
    if (typeof googleSheets !== 'undefined' && googleSheets.isConfigured()) {
      try {
        reportes = await googleSheets.leerReportes();
      } catch (error) {
        console.warn('⚠️ Error al leer Google Sheets, usando localStorage:', error);
        reportes = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      }
    } else {
      // Obtener todos los reportes del localStorage
      const data = localStorage.getItem(STORAGE_KEY);
      reportes = data ? JSON.parse(data) : [];
    }
    
    // Si no hay datos, cargar datos por defecto
    if (reportes.length === 0) {
      cargarDatosIniciales();
      reportes = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    }
    
    // Filtrar vehículos ocultos (SEGUIMIENTO y DISPONIBLE) y mostrar solo los activos
    const vehiculosEnProceso = reportes.filter(r => !r.oculto && r.estado !== 'DISPONIBLE' && r.estado !== 'SEGUIMIENTO');
    
    // Mezclar aleatoriamente los vehículos
    todosLosVehiculos = mezclarArray(vehiculosEnProceso);
    
    // Actualizar contador total
    document.getElementById('countBadge').textContent = todosLosVehiculos.length;
    
    // Reiniciar página actual
    paginaActual = 0;
    
    // Mostrar primera página
    mostrarPaginaActual();
    
    // Animación de actualización
    const indicator = document.getElementById('updateIndicator');
    indicator.style.opacity = '0.5';
    setTimeout(() => { indicator.style.opacity = '1'; }, 200);
    
    console.log('✅ Dashboard actualizado:', todosLosVehiculos.length, 'vehículos');
  } catch (error) {
    console.error('Error al cargar datos:', error);
    mostrarError();
  }
}

// ========== MEZCLAR ARRAY ALEATORIAMENTE ==========
function mezclarArray(array) {
  const nuevoArray = [...array];
  for (let i = nuevoArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [nuevoArray[i], nuevoArray[j]] = [nuevoArray[j], nuevoArray[i]];
  }
  return nuevoArray;
}

// ========== ROTAR VEHÍCULOS ==========
function rotarVehiculos() {
  if (todosLosVehiculos.length <= VEHICULOS_POR_PAGINA) {
    // Si hay menos vehículos que el límite, no rotar
    return;
  }
  
  // Avanzar a la siguiente página
  paginaActual++;
  
  // Si llegamos al final, volver al inicio y remezclar
  const totalPaginas = Math.ceil(todosLosVehiculos.length / VEHICULOS_POR_PAGINA);
  if (paginaActual >= totalPaginas) {
    paginaActual = 0;
    todosLosVehiculos = mezclarArray(todosLosVehiculos);
  }
  
  mostrarPaginaActual();
}

// ========== MOSTRAR PÁGINA ACTUAL ==========
function mostrarPaginaActual() {
  const inicio = paginaActual * VEHICULOS_POR_PAGINA;
  const fin = inicio + VEHICULOS_POR_PAGINA;
  const vehiculosPagina = todosLosVehiculos.slice(inicio, fin);
  
  mostrarVehiculos(vehiculosPagina);
}

// ========== MOSTRAR VEHÍCULOS ==========
function mostrarVehiculos(vehiculos) {
  const container = document.getElementById('vehiclesGrid');
  
  if (vehiculos.length === 0) {
    container.innerHTML = `
      <div class="no-data">
        <div class="no-data-icon">✅</div>
        <div class="no-data-text">No hay vehículos en proceso actualmente</div>
      </div>
    `;
    return;
  }
  
  container.innerHTML = vehiculos.map(vehiculo => `
    <div class="vehicle-card estado-${normalizeEstado(vehiculo.estado)}">
      <div class="vehicle-header">
        <div class="vehicle-number">🚗 ${vehiculo.numero_vehiculo}</div>
      </div>
      
      <div class="vehicle-status-badge">
        ${vehiculo.taller_asignado || vehiculo.estado}
      </div>
      
      <div class="vehicle-info-compact">
        <div class="info-line">
          <strong>📋 Descripción</strong>
          <span>${truncate(vehiculo.descripcion, 120)}</span>
        </div>
        
        ${vehiculo.notas ? `
          <div class="info-line warning">
            <strong>⚠️ Notas</strong>
            <span>${truncate(vehiculo.notas, 120)}</span>
          </div>
        ` : ''}
        
        <div class="info-line">
          <strong>👤 Técnico</strong>
          <span>${vehiculo.tecnico_asignado || 'Sin asignar'}</span>
        </div>
        
        ${vehiculo.diagnostico ? `
          <div class="info-line">
            <strong>🔍 Diagnóstico</strong>
            <span>${truncate(vehiculo.diagnostico, 120)}</span>
          </div>
        ` : ''}
        
        <div class="info-line">
          <strong>🕐 Última actualización</strong>
          <span>${formatearFechaCorta(vehiculo.fecha_actualizacion)}</span>
        </div>
      </div>
    </div>
  `).join('');
}

// ========== UTILIDADES ==========
function normalizeEstado(estado) {
  if (!estado) return '';
  return estado
    .replace(/ /g, '-')
    .replace(/Á/g, 'A')
    .replace(/É/g, 'E')
    .replace(/Í/g, 'I')
    .replace(/Ó/g, 'O')
    .replace(/Ú/g, 'U');
}

function truncate(text, length) {
  if (!text) return '-';
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}

function formatearFechaCorta(fechaString) {
  if (!fechaString) return '-';
  
  const fecha = new Date(fechaString);
  const ahora = new Date();
  
  // Si es hoy
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fechaDia = new Date(fecha);
  fechaDia.setHours(0, 0, 0, 0);
  
  if (fechaDia.getTime() === hoy.getTime()) {
    return `Hoy ${fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
  }
  
  // Si es ayer
  const ayer = new Date(hoy);
  ayer.setDate(ayer.getDate() - 1);
  if (fechaDia.getTime() === ayer.getTime()) {
    return `Ayer ${fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
  }
  
  // Fecha corta
  return fecha.toLocaleString('es-ES', { 
    day: '2-digit', 
    month: '2-digit',
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

function mostrarError() {
  const container = document.getElementById('vehiclesGrid');
  container.innerHTML = `
    <div class="no-data">
      <div class="no-data-icon">⚠️</div>
      <div class="no-data-text">Error al cargar datos. Reintentando...</div>
    </div>
  `;
}

// ========== MANEJO DE VISIBILIDAD ==========
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    clearInterval(updateInterval);
    clearInterval(rotationInterval);
    console.log('⏸️ Dashboard pausado');
  } else {
    cargarDatosDashboard();
    updateInterval = setInterval(cargarDatosDashboard, REFRESH_INTERVAL);
    rotationInterval = setInterval(rotarVehiculos, ROTATION_INTERVAL);
    console.log('▶️ Dashboard reanudado');
  }
});

// ========== MODO PANTALLA COMPLETA ==========
document.addEventListener('dblclick', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      console.log('Error al entrar en pantalla completa:', err);
    });
  } else {
    document.exitFullscreen();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'F11') {
    e.preventDefault();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.log('Error al entrar en pantalla completa:', err);
      });
    } else {
      document.exitFullscreen();
    }
  }
});

console.log('🎯 Dashboard cargado. Doble clic o F11 para pantalla completa');
