// ========================================
//   GOOGLE APPS SCRIPT CLIENT - ALBERTO OCHOA
// ========================================

class GoogleAppsScriptDB {
  constructor() {
    // URL predeterminada del Apps Script
    const defaultUrl = 'https://script.google.com/macros/s/AKfycbw1Z8aPXeztRpr6TR-d7u9B79FvpcRpntLtw__2A8g3lJrkL3xIKd3pcMFjgmfwzwlggQ/exec';
    this.scriptUrl = localStorage.getItem('google_script_url') || defaultUrl;
    this.syncEnabled = true;
    
    // Guardar URL por defecto si no existe
    if (!localStorage.getItem('google_script_url')) {
      localStorage.setItem('google_script_url', defaultUrl);
    }
  }

  // ========== CONFIGURACIÓN ==========
  configure(scriptUrl) {
    this.scriptUrl = scriptUrl;
    localStorage.setItem('google_script_url', scriptUrl);
    this.syncEnabled = true;
    console.log('✅ Google Apps Script configurado');
  }

  isConfigured() {
    return this.scriptUrl !== '';
  }

  // ========== LEER DATOS ==========
  async leerReportes() {
    if (!this.isConfigured()) {
      console.warn('⚠️ Google Apps Script no configurado, usando localStorage');
      return this.leerLocalStorage('gestion_taller_reportes');
    }

    try {
      const url = `${this.scriptUrl}?action=leer`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Error desconocido');
      }

      const reportes = result.data;
      
      // Guardar en localStorage como respaldo
      localStorage.setItem('gestion_taller_reportes', JSON.stringify(reportes));
      
      console.log('✅ Reportes leídos desde Google Sheets:', reportes.length);
      return reportes;

    } catch (error) {
      console.error('❌ Error al leer Google Sheets:', error);
      console.warn('⚠️ Usando datos del localStorage como respaldo');
      return this.leerLocalStorage('gestion_taller_reportes');
    }
  }

  // ========== ESCRIBIR DATOS ==========
  async guardarReportes(reportes) {
    // Siempre guardar en localStorage primero (respaldo)
    localStorage.setItem('gestion_taller_reportes', JSON.stringify(reportes));

    if (!this.isConfigured()) {
      console.warn('⚠️ Google Apps Script no configurado, datos guardados solo en localStorage');
      return true;
    }

    try {
      const url = `${this.scriptUrl}?action=guardar`;
      const formData = new URLSearchParams();
      formData.append('datos', JSON.stringify(reportes));

      const response = await fetch(url, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Error al guardar');
      }

      console.log('✅ Reportes guardados en Google Sheets:', reportes.length);
      return true;

    } catch (error) {
      console.error('❌ Error al guardar en Google Sheets:', error);
      console.warn('⚠️ Datos guardados solo en localStorage');
      return false;
    }
  }

  // ========== UTILIDADES ==========
  leerLocalStorage(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  // ========== PROVEEDORES ==========
  async leerProveedores() {
    if (!this.isConfigured()) {
      console.warn('⚠️ Google Apps Script no configurado, usando localStorage');
      return this.leerLocalStorage('gestion_taller_proveedores');
    }

    try {
      const url = `${this.scriptUrl}?action=leerProveedores`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Error desconocido');
      }

      console.log('✅ Proveedores leídos desde Google Sheets:', result.data.length);
      return result.data;

    } catch (error) {
      console.error('❌ Error al leer proveedores de Google Sheets:', error);
      console.warn('⚠️ Usando datos de localStorage');
      return this.leerLocalStorage('gestion_taller_proveedores');
    }
  }

  async guardarProveedores(proveedores) {
    if (!this.isConfigured() || !this.syncEnabled) {
      console.warn('⚠️ Sincronización deshabilitada o no configurada');
      return false;
    }

    try {
      const url = `${this.scriptUrl}?action=guardarProveedores&datos=${encodeURIComponent(JSON.stringify(proveedores))}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Error al guardar proveedores');
      }

      console.log('✅ Proveedores guardados en Google Sheets:', proveedores.length);
      return true;

    } catch (error) {
      console.error('❌ Error al guardar proveedores en Google Sheets:', error);
      console.warn('⚠️ Proveedores guardados solo en localStorage');
      return false;
    }
  }

  // Verificar conexión
  async verificarConexion() {
    if (!this.isConfigured()) {
      return { success: false, error: 'No configurado' };
    }

    try {
      const url = `${this.scriptUrl}?action=ping`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const result = await response.json();
      return { 
        success: result.success, 
        message: result.message
      };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Instancia global
const googleSheets = new GoogleAppsScriptDB();
