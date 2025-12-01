# 📊 Guía de Configuración: Google Sheets API

## 🎯 Objetivo
Conectar el sistema de Gestión de Taller con Google Sheets para tener una base de datos en tiempo real compartida entre todos los dispositivos.

---

## 📋 Requisitos Previos
- Cuenta de Google (Gmail)
- Acceso a Google Cloud Console
- Navegador web moderno

---

## 🚀 Pasos de Configuración

### 1️⃣ Crear Google Sheet

1. Abre [Google Sheets](https://sheets.google.com)
2. Crea una nueva hoja de cálculo
3. Nómbrala: **Gestión Taller - Alberto Ochoa**
4. Crea 2 hojas (pestañas) con estos nombres exactos:
   - `Reportes`
   - `Proveedores`

#### Configurar hoja "Reportes"
En la **fila 1** (encabezados), agrega:

| A1 | B1 | C1 | D1 | E1 | F1 | G1 | H1 | I1 | J1 | K1 | L1 | M1 |
|----|----|----|----|----|----|----|----|----|----|----|----|----|
| id | numero_vehiculo | estado | descripcion | tecnico_asignado | taller_asignado | diagnostico | analisis | requiere_reparacion | notas | prueba_ruta | fecha_reporte | fecha_actualizacion |

#### Configurar hoja "Proveedores"
En la **fila 1** (encabezados), agrega:

| A1 | B1 | C1 | D1 | E1 | F1 |
|----|----|----|----|----|----|
| id | nombre | tipo | contacto | telefono | email |

---

### 2️⃣ Obtener API Key de Google

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Crea un nuevo proyecto:
   - Haz clic en el selector de proyectos (arriba a la izquierda)
   - Clic en **NUEVO PROYECTO**
   - Nombre: `Gestión Taller Alberto Ochoa`
   - Clic en **CREAR**
3. Selecciona el proyecto recién creado
4. En el menú lateral, ve a **API y servicios → Biblioteca**
5. Busca `Google Sheets API`
6. Haz clic en **HABILITAR**
7. Ve a **API y servicios → Credenciales**
8. Haz clic en **+ CREAR CREDENCIALES**
9. Selecciona **Clave de API**
10. **Copia la clave generada** (AIzaSy...)
11. (Opcional) Haz clic en **RESTRINGIR CLAVE** para limitar su uso:
    - En "Restricciones de la API", selecciona "Restringir clave"
    - Marca solo **Google Sheets API**
    - Guarda los cambios

---

### 3️⃣ Obtener ID del Google Sheet

1. Abre tu Google Sheet (`Gestión Taller - Alberto Ochoa`)
2. Mira la URL en la barra de direcciones:
   ```
   https://docs.google.com/spreadsheets/d/1ABC...xyz/edit
   ```
3. **Copia el ID** que está entre `/d/` y `/edit`:
   ```
   1ABC...xyz
   ```

---

### 4️⃣ Hacer la Hoja Pública (Solo Lectura)

1. En tu Google Sheet, haz clic en **Compartir** (arriba a la derecha)
2. En "Acceso general", cambia a:
   - **Cualquier persona con el enlace**
   - Permisos: **Lector**
3. Haz clic en **Listo**

**Nota:** La hoja solo será visible para quien tenga el enlace. Solo la aplicación con la API Key podrá escribir datos.

---

### 5️⃣ Configurar en el Sistema

1. Abre el sistema: `https://mgomez0520.github.io/TALLER/public/index.html`
2. Haz clic en el botón **⚙️ Google Sheets** (arriba a la derecha)
3. Pega tu **API Key** y **Sheet ID**
4. Haz clic en **💾 Guardar Configuración**
5. Haz clic en **🔍 Verificar Conexión** para probar
6. Si todo está bien, haz clic en **📤 Migrar Datos a Sheets**

---

## ✅ Verificación

Si todo funcionó correctamente:
- ✅ Verás el mensaje "Conexión exitosa"
- ✅ Los datos se habrán copiado a Google Sheets
- ✅ Cada vez que actualices un reporte, se guardará automáticamente en Google Sheets
- ✅ Todos los dispositivos verán los mismos datos en tiempo real

---

## 🔄 Funcionamiento

### Sincronización Automática
- **Crear reporte:** Se guarda en localStorage Y Google Sheets
- **Actualizar reporte:** Se guarda en localStorage Y Google Sheets
- **Cargar datos:** Lee primero de Google Sheets, si falla usa localStorage

### Modo Offline
Si no hay conexión a internet:
- El sistema sigue funcionando con localStorage
- Cuando se recupere la conexión, los cambios se sincronizan

---

## 🛠️ Solución de Problemas

### Error: "Error HTTP: 403"
**Causa:** Google Sheets API no está habilitada
**Solución:** Ve a Google Cloud Console → Biblioteca → Habilita "Google Sheets API"

### Error: "Error HTTP: 400"
**Causa:** Sheet ID incorrecto
**Solución:** Verifica que copiaste correctamente el ID del Google Sheet

### Error: "No se puede leer la hoja"
**Causa:** La hoja no es pública
**Solución:** Asegúrate de que el Google Sheet esté compartido como "Cualquier persona con el enlace puede ver"

### Los datos no aparecen en Google Sheets
**Causa:** Nombres de las hojas incorrectos
**Solución:** Verifica que las pestañas se llamen exactamente `Reportes` y `Proveedores`

---

## 📱 Usar en Múltiples Dispositivos

1. Configura Google Sheets en un dispositivo (el principal)
2. En los demás dispositivos:
   - Abre el sistema
   - Ve a **⚙️ Google Sheets**
   - Ingresa la misma **API Key** y **Sheet ID**
   - Guarda

Todos los dispositivos compartirán la misma base de datos en tiempo real.

---

## 🔐 Seguridad

- **API Key:** Solo funciona para leer/escribir Google Sheets
- **Sheet:** Es de solo lectura pública, nadie puede editar sin la API Key
- **localStorage:** Sigue funcionando como respaldo local

---

## 📞 Soporte

Si tienes problemas con la configuración:
1. Verifica que todos los pasos estén completos
2. Revisa la consola del navegador (F12) para ver errores
3. Asegúrate de que los nombres de las hojas sean exactos

---

**¡Listo!** 🎉 Ahora tienes sincronización en tiempo real con Google Sheets.
