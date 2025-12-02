// ========================================
//   GOOGLE SHEETS API - ALBERTO OCHOA
// ========================================

class GoogleSheetsDB {
  constructor() {
    this.apiKey = localStorage.getItem('google_sheets_api_key') || '';
    this.spreadsheetId = localStorage.getItem('google_sheets_id') || '';
    this.baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
    this.sheetsCache = {
      reportes: null,
      proveedores: null,
      lastUpdate: null
    };
    this.updateInterval = 30000; // 30 segundos
    this.syncEnabled = false;
  }

  // ========== CONFIGURACIÓN ==========
  configure(apiKey, spreadsheetId) {
    this.apiKey = apiKey;
    this.spreadsheetId = spreadsheetId;
    localStorage.setItem('google_sheets_api_key', apiKey);
    localStorage.setItem('google_sheets_id', spreadsheetId);
    this.syncEnabled = true;
    console.log('✅ Google Sheets configurado');
  }

  isConfigured() {
    return this.apiKey && this.spreadsheetId;
  }

  // ========== LEER DATOS ==========
  async leerReportes() {
    if (!this.isConfigured()) {
      console.warn('⚠️ Google Sheets no configurado, usando localStorage');
      return this.leerLocalStorage('gestion_taller_reportes');
    }

    try {
      const range = 'Reportes!A2:Z1000'; // Lee desde la fila 2 hasta 1000
      const url = `${this.baseUrl}/${this.spreadsheetId}/values/${range}?key=${this.apiKey}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      const rows = data.values || [];
      
      // Convertir filas a objetos
      const reportes = rows.map((row, index) => ({
        id: parseInt(row[0]) || index + 1,
        numero_vehiculo: row[1] || '',
        estado: row[2] || 'REPORTE',
        descripcion: row[3] || '',
        tecnico_asignado: row[4] || null,
        taller_asignado: row[5] || null,
        diagnostico: row[6] || null,
        analisis: row[7] || null,
        requiere_reparacion: row[8] === 'true' ? true : (row[8] === 'false' ? false : null),
        notas: row[9] || '',
        prueba_ruta: row[10] === 'true',
        fecha_reporte: row[11] || new Date().toISOString(),
        fecha_actualizacion: row[12] || new Date().toISOString()
      }));

      // Guardar en caché y localStorage como respaldo
      this.sheetsCache.reportes = reportes;
      this.sheetsCache.lastUpdate = Date.now();
      localStorage.setItem('gestion_taller_reportes', JSON.stringify(reportes));
      
      console.log('✅ Reportes leídos desde Google Sheets:', reportes.length);
      return reportes;

    } catch (error) {
      console.error('❌ Error al leer Google Sheets:', error);
      console.warn('⚠️ Usando datos del localStorage como respaldo');
      return this.leerLocalStorage('gestion_taller_reportes');
    }
  }

  async leerProveedores() {
    if (!this.isConfigured()) {
      return this.leerLocalStorage('gestion_taller_proveedores');
    }

    try {
      const range = 'Proveedores!A2:Z1000';
      const url = `${this.baseUrl}/${this.spreadsheetId}/values/${range}?key=${this.apiKey}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      const rows = data.values || [];
      
      const proveedores = rows.map((row, index) => ({
        id: parseInt(row[0]) || index + 1,
        nombre: row[1] || '',
        tipo: row[2] || '',
        contacto: row[3] || '',
        telefono: row[4] || '',
        email: row[5] || ''
      }));

      this.sheetsCache.proveedores = proveedores;
      localStorage.setItem('gestion_taller_proveedores', JSON.stringify(proveedores));
      
      console.log('✅ Proveedores leídos desde Google Sheets:', proveedores.length);
      return proveedores;

    } catch (error) {
      console.error('❌ Error al leer proveedores:', error);
      return this.leerLocalStorage('gestion_taller_proveedores');
    }
  }

  // ========== ESCRIBIR DATOS ==========
  async guardarReportes(reportes) {
    // Siempre guardar en localStorage primero (respaldo)
    localStorage.setItem('gestion_taller_reportes', JSON.stringify(reportes));

    if (!this.isConfigured()) {
      console.warn('⚠️ Google Sheets no configurado, datos guardados solo en localStorage');
      return true;
    }

    try {
      // Convertir objetos a filas
      const rows = reportes.map(r => [
        r.id,
        r.numero_vehiculo,
        r.estado,
        r.descripcion,
        r.tecnico_asignado || '',
        r.taller_asignado || '',
        r.diagnostico || '',
        r.analisis || '',
        r.requiere_reparacion === null ? '' : r.requiere_reparacion.toString(),
        r.notas || '',
        r.prueba_ruta ? 'true' : 'false',
        r.fecha_reporte,
        r.fecha_actualizacion
      ]);

      // Limpiar la hoja y escribir nuevos datos
      const range = 'Reportes!A2:M1000';
      const url = `${this.baseUrl}/${this.spreadsheetId}/values/${range}:clear?key=${this.apiKey}`;
      
      // Primero limpiar
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      // Luego escribir
      const writeUrl = `${this.baseUrl}/${this.spreadsheetId}/values/Reportes!A2?valueInputOption=RAW&key=${this.apiKey}`;
      const response = await fetch(writeUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          range: 'Reportes!A2',
          values: rows
        })
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      console.log('✅ Reportes guardados en Google Sheets:', reportes.length);
      this.sheetsCache.reportes = reportes;
      return true;

    } catch (error) {
      console.error('❌ Error al guardar en Google Sheets:', error);
      console.warn('⚠️ Datos guardados solo en localStorage');
      return false;
    }
  }

  async guardarProveedores(proveedores) {
    localStorage.setItem('gestion_taller_proveedores', JSON.stringify(proveedores));

    if (!this.isConfigured()) {
      return true;
    }

    try {
      const rows = proveedores.map(p => [
        p.id,
        p.nombre,
        p.tipo,
        p.contacto,
        p.telefono,
        p.email
      ]);

      const range = 'Proveedores!A2:F1000';
      const url = `${this.baseUrl}/${this.spreadsheetId}/values/${range}:clear?key=${this.apiKey}`;
      
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const writeUrl = `${this.baseUrl}/${this.spreadsheetId}/values/Proveedores!A2?valueInputOption=RAW&key=${this.apiKey}`;
      const response = await fetch(writeUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          range: 'Proveedores!A2',
          values: rows
        })
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      console.log('✅ Proveedores guardados en Google Sheets');
      this.sheetsCache.proveedores = proveedores;
      return true;

    } catch (error) {
      console.error('❌ Error al guardar proveedores:', error);
      return false;
    }
  }

  // ========== UTILIDADES ==========
  leerLocalStorage(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  // Crear estructura de Google Sheet
  async inicializarSheet() {
    if (!this.isConfigured()) {
      console.error('❌ Configura primero Google Sheets');
      return false;
    }

    console.log(`
📋 ESTRUCTURA NECESARIA EN GOOGLE SHEETS:

Hoja 1: "Reportes"
Encabezados en fila 1:
A1: id
B1: numero_vehiculo
C1: estado
D1: descripcion
E1: tecnico_asignado
F1: taller_asignado
G1: diagnostico
H1: analisis
I1: requiere_reparacion
J1: notas
K1: prueba_ruta
L1: fecha_reporte
M1: fecha_actualizacion

Hoja 2: "Proveedores"
Encabezados en fila 1:
A1: id
B1: nombre
C1: tipo
D1: contacto
E1: telefono
F1: email
    `);

    return true;
  }

  // Verificar conexión
  async verificarConexion() {
    if (!this.isConfigured()) {
      return { success: false, error: 'No configurado' };
    }

    try {
      const url = `${this.baseUrl}/${this.spreadsheetId}?key=${this.apiKey}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      return { 
        success: true, 
        title: data.properties.title,
        sheets: data.sheets.map(s => s.properties.title)
      };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Instancia global
const googleSheets = new GoogleSheetsDB();
