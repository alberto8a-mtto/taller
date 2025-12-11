// ========================================
//   DASHBOARD TV - ALBERTO OCHOA
// ========================================

let updateInterval;
let rotationInterval;
const REFRESH_INTERVAL = 10000; // 10 segundos
const ROTATION_INTERVAL = 60000; // 60 segundos (1 minuto) para rotar vehículos
const STORAGE_KEY = 'gestion_taller_reportes';
const VEHICULOS_POR_PAGINA = 8; // Cantidad de vehículos a mostrar por vez
let paginaActual = 0;
let todosLosVehiculos = [];
let mostrarTodos = false;

// ========== CARGAR DATOS INICIALES (LOCAL) ==========
function cargarDatosIniciales() {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing && JSON.parse(existing).length > 0) return;

    // Si existe la función global de prueba en google-sheets.js, úsala
    if (typeof insertarDatosPruebaLocal === 'function') {
      insertarDatosPruebaLocal();
      console.log('✅ cargarDatosIniciales: datos de prueba insertados por insertarDatosPruebaLocal()');
      return;
    }

    // Si no, crear datos de prueba básicos
    const sample = [
      {
        id: 1,
        numero_vehiculo: 'VH-001',
        estado: 'EN PROCESO',
        descripcion: 'Cambio de aceite',
        tecnico_asignado: 'Juan',
        taller_asignado: 'Taller 1',
        diagnostico: 'Revisión',
        analisis: 'Pendiente',
        requiere_reparacion: false,
        notas: '',
        prueba_ruta: false,
        fecha_reporte: new Date().toISOString(),
        fecha_actualizacion: new Date().toISOString()
      }
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sample));
    console.log('✅ cargarDatosIniciales: datos de ejemplo guardados en localStorage');
  } catch (err) {
    console.error('Error en cargarDatosIniciales:', err);
  }
}

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

  // Inicializar indicador de fuente de datos y botón de prueba
  try {
    const dsElem = document.getElementById('ds-source');
    const btn = document.getElementById('btnTestEndpoint');
    const status = document.getElementById('ds-status');
    const chk = document.getElementById('chkShowAll');
    const dbg = document.getElementById('ds-debug');
    const url = localStorage.getItem('google_script_url') || '';
    if (dsElem) dsElem.textContent = url ? 'Google Apps Script' : 'localStorage';
    if (status) status.textContent = url ? '(sin probar)' : '(local)';
    if (btn) btn.addEventListener('click', testEndpoint);
    if (chk) {
      chk.checked = mostrarTodos;
      chk.addEventListener('change', (e) => toggleMostrarTodos(e.target.checked));
    }
    if (dbg) dbg.textContent = '';
  } catch (e) {
    console.warn('Indicador de fuente no disponible:', e);
  }

});

// ========== RELOJ ==========
function actualizarReloj() {
  const ahora = new Date();
  const timeString = ahora.toLocaleTimeString('es-ES', { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit'
  });
  const timeEl = document.getElementById('currentTime');
  if (timeEl) timeEl.textContent = timeString;
}

// ========== CARGAR DATOS ==========
async function cargarDatosDashboard() {
  try {
    // Primero usar localStorage para mostrar la UI de forma inmediata
    let reportes = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

    // Si no hay datos locales, intentar cargar de Google Sheets (bloqueante)
    if ((!reportes || reportes.length === 0) && typeof googleSheets !== 'undefined' && googleSheets.isConfigured()) {
      try {
        reportes = await googleSheets.leerReportes();
      } catch (error) {
        console.warn('⚠️ Error al leer Google Sheets inicialmente:', error);
        // dejar reportes como está (vacío) para cargar datos iniciales
      }
    }

    // Si aún no hay datos, insertar datos iniciales locales
    if (!reportes || reportes.length === 0) {
      cargarDatosIniciales();
      reportes = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    }

    // Renderizar inmediatamente con los datos locales/obtenidos
    
    // Filtrar vehículos ocultos (SEGUIMIENTO y DISPONIBLE) y mostrar solo los activos
    let vehiculosEnProceso;
    if (mostrarTodos) {
      vehiculosEnProceso = reportes;
    } else {
      vehiculosEnProceso = reportes.filter(r => !r.oculto && r.estado !== 'DISPONIBLE' && r.estado !== 'SEGUIMIENTO');
    }
    
    // Mezclar aleatoriamente los vehículos
    todosLosVehiculos = mezclarArray(vehiculosEnProceso);
    
    // Actualizar contador total
    const countBadge = document.getElementById('countBadge');
    if (countBadge) countBadge.textContent = todosLosVehiculos.length;
    
    // Reiniciar página actual
    paginaActual = 0;
    
    // Mostrar primera página
    mostrarPaginaActual();

    // Intentar actualizar en segundo plano desde Google Sheets (no bloquear la UI)
    (async () => {
      try {
        if (typeof googleSheets !== 'undefined' && googleSheets.isConfigured()) {
          const remote = await googleSheets.leerReportes();
          // Si los datos remotos difieren, actualizar localStorage y volver a renderizar
          if (remote && JSON.stringify(remote) !== JSON.stringify(reportes)) {
            console.log('🔄 Datos remotos diferentes, actualizando vista con datos de Google Sheets');
            const nuevos = mostrarTodos ? remote : remote.filter(r => !r.oculto && r.estado !== 'DISPONIBLE' && r.estado !== 'SEGUIMIENTO');
            todosLosVehiculos = mezclarArray(nuevos);
            const countBadge = document.getElementById('countBadge');
            if (countBadge) countBadge.textContent = todosLosVehiculos.length;
            paginaActual = 0;
            mostrarPaginaActual();
          }
        }
      } catch (e) {
        console.debug('Actualización en background falló:', e);
      }
    })();
    
    // Animación de actualización (proteger si no existe el elemento)
    const indicator = document.getElementById('updateIndicator');
    if (indicator) {
      indicator.style.opacity = '0.5';
      setTimeout(() => { indicator.style.opacity = '1'; }, 200);
    }
    
    // Depuración: mostrar conteos y muestras de datos
    console.log('✅ Dashboard actualizado:', todosLosVehiculos.length, 'vehículos');
    try {
      const dbg = document.getElementById('ds-debug');
      if (dbg) {
        const preview = reportes && reportes.length ? JSON.stringify(reportes.slice(0,3)) : '[]';
        dbg.textContent = `reportes=${reportes.length} · mostrados=${todosLosVehiculos.length} · preview=${preview}`;
      }
    } catch (e) {
      console.debug('No se pudo actualizar ds-debug:', e);
    }
  } catch (error) {
    console.error('Error al cargar datos:', error);
    mostrarError();
  }
}

// Toggle para mostrar todos los reportes (incluye ocultos y estados filtrados)
function toggleMostrarTodos(value) {
  mostrarTodos = !!value;
  cargarDatosDashboard();
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
  if (!container) {
    console.warn('mostrarVehiculos: contenedor "vehiclesGrid" no encontrado en el DOM');
    return;
  }

  if (!vehiculos || vehiculos.length === 0) {
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
  if (!container) {
    console.warn('mostrarError: contenedor "vehiclesGrid" no encontrado');
    return;
  }
  container.innerHTML = `
    <div class="no-data">
      <div class="no-data-icon">⚠️</div>
      <div class="no-data-text">Error al cargar datos. Reintentando...</div>
    </div>
  `;
}

// ========== PRUEBA DE ENDPOINT / INDICADOR DE FUENTE ==========
async function testEndpoint() {
  const status = document.getElementById('ds-status');
  const url = localStorage.getItem('google_script_url') || '';
  if (!url) {
    if (status) status.textContent = 'No hay URL configurada';
    return;
  }
  if (status) status.textContent = 'Probando...';
  try {
    const resp = await fetch(url + '?action=ping');
    const text = await resp.text();
    try {
      const j = JSON.parse(text);
      if (j && j.success) {
        status.textContent = 'OK: ' + (j.message || 'Conexión');
      } else {
        status.textContent = 'Error: ' + (j.error || 'Respuesta sin success');
      }
    } catch (e) {
      status.textContent = 'Respuesta no JSON';
      console.error('testEndpoint parse error', e, text);
    }
  } catch (err) {
    status.textContent = 'Fetch error';
    console.error('testEndpoint fetch error', err);
  }
}

// ========== UTILIDAD: forzar inserción de datos de prueba (disponible desde consola)
function fuerzaInsertarDatosPrueba() {
  try {
    if (typeof insertarDatosPruebaLocal === 'function') {
      insertarDatosPruebaLocal();
      console.log('insertarDatosPruebaLocal() ejecutada');
    } else {
      const sample = [
        {
          id: 999999,
          numero_vehiculo: 'TEST-001',
          estado: 'EN PROCESO',
          descripcion: 'Vehículo de prueba insertado automáticamente',
          tecnico_asignado: 'Auto',
          taller_asignado: 'Taller Prueba',
          diagnostico: 'N/A',
          notas: '',
          requiere_reparacion: false,
          prueba_ruta: false,
          fecha_reporte: new Date().toISOString(),
          fecha_actualizacion: new Date().toISOString()
        }
      ];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sample));
      console.log('Datos de prueba guardados en localStorage bajo', STORAGE_KEY);
    }
  } catch (e) {
    console.error('Error en fuerzaInsertarDatosPrueba:', e);
  }
  cargarDatosDashboard();
}

// Exponer función para fácil ejecución desde la consola
try { window.fuerzaInsertarDatosPrueba = fuerzaInsertarDatosPrueba; } catch (e) {}

// Capturar errores globales y mostrarlos en el debug panel
window.addEventListener('error', (ev) => {
  console.error('Global error capturado:', ev.error || ev.message, ev);
  try {
    const dbg = document.getElementById('ds-debug');
    if (dbg) dbg.textContent = `GLOBAL ERROR: ${ev.message || ev.error}`;
  } catch (e) {}
});

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
