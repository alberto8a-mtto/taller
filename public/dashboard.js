// ========================================
//   DASHBOARD TV - ALBERTO OCHOA
// ========================================

let updateInterval;
const REFRESH_INTERVAL = 10000; // 10 segundos
const STORAGE_KEY = 'gestion_taller_reportes';

// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', () => {
  console.log('📊 Dashboard TV iniciado');
  
  // Actualizar reloj
  actualizarReloj();
  setInterval(actualizarReloj, 1000);
  
  // Actualizar datos inmediatamente y cada 10 segundos
  cargarDatosDashboard();
  updateInterval = setInterval(cargarDatosDashboard, REFRESH_INTERVAL);
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
function cargarDatosDashboard() {
  try {
    // Obtener todos los reportes del localStorage
    const data = localStorage.getItem(STORAGE_KEY);
    const reportes = data ? JSON.parse(data) : [];
    
    // Filtrar vehículos en proceso (no en SEGUIMIENTO)
    const vehiculosEnProceso = reportes.filter(r => r.estado !== 'SEGUIMIENTO');
    
    // Actualizar contador
    document.getElementById('countBadge').textContent = vehiculosEnProceso.length;
    
    // Mostrar vehículos
    mostrarVehiculos(vehiculosEnProceso);
    
    // Animación de actualización
    const indicator = document.getElementById('updateIndicator');
    indicator.style.opacity = '0.5';
    setTimeout(() => { indicator.style.opacity = '1'; }, 200);
    
    console.log('✅ Dashboard actualizado:', vehiculosEnProceso.length, 'vehículos');
  } catch (error) {
    console.error('Error al cargar datos:', error);
    mostrarError();
  }
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
  
  // Ordenar por fecha de actualización (más recientes primero)
  vehiculos.sort((a, b) => new Date(b.fecha_actualizacion) - new Date(a.fecha_actualizacion));
  
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
    console.log('⏸️ Dashboard pausado');
  } else {
    cargarDatosDashboard();
    updateInterval = setInterval(cargarDatosDashboard, REFRESH_INTERVAL);
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
