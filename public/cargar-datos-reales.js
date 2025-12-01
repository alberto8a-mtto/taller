// ========================================
//   CARGAR DATOS REALES - ALBERTO OCHOA
// ========================================

// Datos reales de vehículos en taller
const datosReales = [
  {
    id: 1,
    numero_vehiculo: '10183',
    estado: 'REPARACIÓN',
    descripcion: 'Recalentamiento, consumo de refrigerante',
    tecnico_asignado: null,
    taller_asignado: 'Mecánica',
    diagnostico: 'En prueba de ruta',
    analisis: null,
    requiere_reparacion: null,
    notas: 'Seguimiento de consumo (posible bajada de culata)',
    prueba_ruta: true,
    fecha_reporte: new Date(Date.now() - 172800000).toISOString(),
    fecha_actualizacion: new Date().toISOString()
  },
  {
    id: 2,
    numero_vehiculo: '2996',
    estado: 'TALLER',
    descripcion: 'Vidrio de puerta quebrado',
    tecnico_asignado: null,
    taller_asignado: 'AGA',
    diagnostico: 'Cambio de vidrio',
    analisis: null,
    requiere_reparacion: null,
    notas: 'Cambiar Vidrio',
    prueba_ruta: false,
    fecha_reporte: new Date(Date.now() - 86400000).toISOString(),
    fecha_actualizacion: new Date().toISOString()
  },
  {
    id: 3,
    numero_vehiculo: '2977',
    estado: 'ANÁLISIS',
    descripcion: 'Fuga de aceite',
    tecnico_asignado: null,
    taller_asignado: 'DIOMEDEZ',
    diagnostico: null,
    analisis: 'Sin asignar',
    requiere_reparacion: null,
    notas: 'N/A',
    prueba_ruta: false,
    fecha_reporte: new Date(Date.now() - 259200000).toISOString(),
    fecha_actualizacion: new Date().toISOString()
  },
  {
    id: 4,
    numero_vehiculo: '4418',
    estado: 'ANÁLISIS',
    descripcion: 'Perdida de fuerza',
    tecnico_asignado: null,
    taller_asignado: 'Mecánica',
    diagnostico: null,
    analisis: 'Sin asignar',
    requiere_reparacion: null,
    notas: 'N/A',
    prueba_ruta: false,
    fecha_reporte: new Date(Date.now() - 345600000).toISOString(),
    fecha_actualizacion: new Date().toISOString()
  },
  {
    id: 5,
    numero_vehiculo: '4626',
    estado: 'ANÁLISIS',
    descripcion: 'Vibración',
    tecnico_asignado: 'MATEO GARCIA',
    taller_asignado: 'Pendiente',
    diagnostico: null,
    analisis: 'Sin asignar',
    requiere_reparacion: null,
    notas: 'Prueba de ruta',
    prueba_ruta: true,
    fecha_reporte: new Date(Date.now() - 432000000).toISOString(),
    fecha_actualizacion: new Date().toISOString()
  },
  {
    id: 6,
    numero_vehiculo: '10167',
    estado: 'TALLER',
    descripcion: 'Filtración de agua',
    tecnico_asignado: 'JUAN CARLOS GALLEGO',
    taller_asignado: 'Ricardo',
    diagnostico: 'Ensikada de capacete',
    analisis: null,
    requiere_reparacion: null,
    notas: 'Llamar a Neider al medio día',
    prueba_ruta: false,
    fecha_reporte: new Date(Date.now() - 518400000).toISOString(),
    fecha_actualizacion: new Date().toISOString()
  },
  {
    id: 7,
    numero_vehiculo: '10160',
    estado: 'TALLER',
    descripcion: 'Revisión presión sistema de combustible',
    tecnico_asignado: 'JUAN CARLOS GALLEGO',
    taller_asignado: 'Sandro',
    diagnostico: 'Cambio tapa carcaza filtro principal, cambio filtro interno trampa de combustible',
    analisis: null,
    requiere_reparacion: null,
    notas: 'Consecución de tapa por parte del almacén',
    prueba_ruta: false,
    fecha_reporte: new Date(Date.now() - 604800000).toISOString(),
    fecha_actualizacion: new Date().toISOString()
  },
  {
    id: 8,
    numero_vehiculo: '10162',
    estado: 'TALLER',
    descripcion: 'Very very en dirección',
    tecnico_asignado: 'JUAN CARLOS GALLEGO',
    taller_asignado: 'Pablo Gomez',
    diagnostico: 'Pendiente',
    analisis: null,
    requiere_reparacion: null,
    notas: 'Ajustar barras de dirección, suspensión delantera, cambio de bujes barra transversal, cambio de bujes amortiguador delantero lado derecho y cambio de radiador',
    prueba_ruta: true,
    fecha_reporte: new Date(Date.now() - 691200000).toISOString(),
    fecha_actualizacion: new Date().toISOString()
  },
  {
    id: 9,
    numero_vehiculo: '60105',
    estado: 'ANÁLISIS',
    descripcion: 'Bujadera',
    tecnico_asignado: 'MATEO GARCIA',
    taller_asignado: 'Raul Precoltur',
    diagnostico: 'CITA MAÑANA 7AM',
    analisis: null,
    requiere_reparacion: null,
    notas: 'En espera de diagnóstico',
    prueba_ruta: true,
    fecha_reporte: new Date(Date.now() - 777600000).toISOString(),
    fecha_actualizacion: new Date().toISOString()
  },
  {
    id: 10,
    numero_vehiculo: '10200',
    estado: 'TALLER',
    descripcion: 'Se encuentra habilitado hasta el momento',
    tecnico_asignado: 'JORGE ACOSTA',
    taller_asignado: 'Scania',
    diagnostico: 'En espera del cilindro longitudinal',
    analisis: null,
    requiere_reparacion: null,
    notas: 'En espera del cilindro longitudinal. Técnicos: Jorge Acosta, Juan Gallego, Mateo Garcia',
    prueba_ruta: false,
    fecha_reporte: new Date(Date.now() - 864000000).toISOString(),
    fecha_actualizacion: new Date().toISOString()
  },
  {
    id: 11,
    numero_vehiculo: '10199',
    estado: 'TALLER',
    descripcion: 'Se encuentra habilitado hasta el momento',
    tecnico_asignado: 'JORGE ACOSTA',
    taller_asignado: 'Scania',
    diagnostico: 'En espera de conector módulo tablero',
    analisis: null,
    requiere_reparacion: null,
    notas: 'En espera de conector módulo tablero. Técnicos: Jorge Acosta, Juan Gallego, Mateo Garcia',
    prueba_ruta: false,
    fecha_reporte: new Date(Date.now() - 950400000).toISOString(),
    fecha_actualizacion: new Date().toISOString()
  }
];

// Función para cargar los datos
function cargarDatosReales() {
  // Limpiar datos existentes
  localStorage.removeItem('gestion_taller_reportes');
  
  // Guardar nuevos datos
  localStorage.setItem('gestion_taller_reportes', JSON.stringify(datosReales));
  
  console.log('✅ Datos reales cargados:', datosReales.length, 'vehículos');
  alert(`✅ ${datosReales.length} vehículos cargados exitosamente\n\nEl sistema se recargará ahora.`);
  
  // Recargar página
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 1000);
}

// Ejecutar al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  const btnCargar = document.getElementById('btnCargarDatos');
  if (btnCargar) {
    btnCargar.addEventListener('click', cargarDatosReales);
  }
});
