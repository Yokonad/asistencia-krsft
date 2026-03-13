# Datos capturados — App de Asistencia

**Repositorio:** `/var/www/asistencia-app`  
**URL pública:** `https://eje-asistencia.korosoft.site`  
**Stack:** Node.js 20 + Express · MariaDB · Cloudflare Tunnel  

---

## 1. Flujo completo de captura

```
[Usuario]
    │
    ├─ Ingresa DNI  ──► GET /api/worker-by-dni?dni=XXXXXXXX
    │                        └─ Consulta tabla `trabajadores`
    │                        └─ Devuelve: id, dni, nombre, cargo, estado
    │
    ├─ Activa cámara ────────────────────────────────────────────────────────┐
    │   (click en el área de video)                                          │
    │   └─ navigator.mediaDevices.getUserMedia({ video: facingMode: 'user' })│
    │                                                                        │
    ├─ Solicita GPS  ────────────────────────────────────────────────────────┤
    │   (al activar cámara, en contexto de gesto del usuario)               │
    │   └─ navigator.geolocation.getCurrentPosition(                        │
    │         enableHighAccuracy: true,                                      │
    │         timeout: 20000 ms,                                             │
    │         maximumAge: 0                                                  │
    │       )                                                                │
    │                                                                        │
    ├─ Toma foto  ───────────────────────────────────────────────────────────┤
    │   └─ Canvas API: drawImage del <video> al <canvas>                    │
    │   └─ canvas.toBlob(blob, 'image/jpeg', 0.9)  (calidad 90%)           │
    │                                                                        │
    └─ Envía  ───────────────────────────────────────────────────────────────┘
        └─ POST /api/attendance  (multipart/form-data)
               ├─ dni
               ├─ latitude
               ├─ longitude
               ├─ accuracy
               └─ photo (Blob JPEG)
```

---

## 2. Datos que captura el frontend

### 2.1 DNI
| Dato | Origen | Validación |
|------|--------|------------|
| `dni` | Input manual del usuario | Exactamente 8 dígitos numéricos (`/^\d{8}$/`) |

Se valida en cliente antes de enviar. También se re-valida en el servidor.

---

### 2.2 Ubicación GPS

Obtenida con la **Geolocation API** del navegador.

```js
navigator.geolocation.getCurrentPosition(callback, errback, {
  enableHighAccuracy: true,   // Solicita GPS real (no solo WiFi/celular)
  timeout: 20000,             // Máximo 20 segundos esperando señal
  maximumAge: 0,              // Siempre nueva posición, nunca caché
});
```

| Campo capturado | Tipo | Descripción |
|----------------|------|-------------|
| `latitude` | `number` | Latitud decimal (ej: `-12.0553412`) |
| `longitude` | `number` | Longitud decimal (ej: `-77.0310234`) |
| `accuracy` | `number` | Precisión en metros (puede ser nulo si no se obtiene) |

**Validaciones del servidor:**
- `latitude` debe estar en rango `[-90, 90]`
- `longitude` debe estar en rango `[-180, 180]`
- `accuracy` debe estar en rango `[0, 10000]`
- El cliente rechaza el envío si la precisión supera los **500 metros**

---

### 2.3 Foto facial

Capturada desde el stream de la cámara frontal (`facingMode: 'user'`).

```
Fuente: <video> element  ──►  <canvas> (drawImage)  ──►  Blob JPEG
```

| Parámetro | Valor |
|-----------|-------|
| Formato | JPEG |
| Calidad | 90% (`canvas.toBlob(callback, 'image/jpeg', 0.9)`) |
| Resolución | Nativa del dispositivo (`videoWidth × videoHeight`) — mínimo 480×360 |
| Tamaño máximo permitido | **4 MB** (`MAX_UPLOAD_BYTES = 4 * 1024 * 1024`) |
| Tipos MIME aceptados | `image/jpeg`, `image/png`, `image/webp` |

---

### 2.4 Información del dispositivo

Extraída del **User-Agent** HTTP en el backend.

```js
parseDeviceInfo(req.headers['user-agent'])
```

| Campo | Valores posibles |
|-------|-----------------|
| `deviceType` | `'mobile'` / `'desktop'` |
| `os` | `'Android'` / `'iOS'` / `'Windows'` / `'macOS'` / `'Linux'` / `'Desconocido'` |
| `browser` | `'Chrome'` / `'Safari'` / `'Firefox'` / `'Edge'` / `'Opera'` / `'Desconocido'` |

Solo `deviceType` se guarda en la base de datos. El campo `isMobile` es un booleano derivado.

---

## 3. API del servidor

### GET `/api/worker-by-dni?dni=XXXXXXXX`

**Rate limit:** 60 peticiones por IP cada 15 minutos.

**Consulta SQL:**
```sql
SELECT id, dni, nombre_completo, nombres, apellido_paterno,
       apellido_materno, cargo, estado
FROM trabajadores
WHERE dni = ?
LIMIT 1
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "worker": {
    "id": 42,
    "dni": "72345678",
    "nombre_completo": "JUAN PEREZ GARCIA",
    "nombres": "JUAN",
    "apellido_paterno": "PEREZ",
    "apellido_materno": "GARCIA",
    "cargo": "OPERARIO",
    "estado": "Activo"
  }
}
```

**Condición de rechazo:** si `estado != 'Activo'`, el cliente no permite continuar (validación en frontend, no en backend).

---

### POST `/api/attendance`

**Rate limit:** 30 peticiones por IP cada 15 minutos.  
**Tipo:** `multipart/form-data`

**Campos recibidos:**

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `dni` | `string` | ✅ | 8 dígitos numéricos |
| `latitude` | `string` → `number` | ✅ | Latitud GPS |
| `longitude` | `string` → `number` | ✅ | Longitud GPS |
| `accuracy` | `string` → `number` | ❌ | Precisión GPS en metros |
| `photo` | `File` (JPEG/PNG/WEBP) | ✅ | Foto facial del trabajador |

**Procesamiento del servidor:**

1. Valida campos y formatos
2. Re-consulta `trabajadores` para confirmar que el DNI existe (el worker_name se toma de la DB, no del body)
3. Guarda el archivo en disco: `uploads/attendance-{timestamp}-{random}.jpg`
4. Parsea el User-Agent para obtener `device_type`
5. Inserta registro en `attendance_records`

---

## 4. Almacenamiento en base de datos

### Base de datos
| Parámetro | Valor |
|-----------|-------|
| Motor | MariaDB |
| Host | `10.50.0.20:3306` |
| Base de datos | `eje_erp` |
| Usuario | `eje-laravel` |
| Connection pool | 8 conexiones máximo |

---

### Tabla `trabajadores` (fuente de consulta, no se modifica)

| Columna | Tipo | Nulo | Descripción |
|---------|------|------|-------------|
| `id` | `BIGINT UNSIGNED` PK | NO | ID único autoincremental |
| `dni` | `VARCHAR(20)` UNIQUE | NO | DNI del trabajador |
| `nombres` | `VARCHAR(100)` | NO | Nombres |
| `apellido_paterno` | `VARCHAR(100)` | NO | Apellido paterno |
| `apellido_materno` | `VARCHAR(100)` | SÍ | Apellido materno |
| `nombre_completo` | `VARCHAR(255)` | SÍ | Nombre completo generado |
| `fecha_nacimiento` | `DATE` | SÍ | — |
| `lugar_nacimiento` | `VARCHAR(100)` | SÍ | — |
| `genero` | `ENUM('M','F')` | NO | — |
| `estado_civil` | `VARCHAR(50)` | NO | Default: `'Soltero'` |
| `sistema_pensiones` | `VARCHAR(50)` | SÍ | AFP/ONP/etc. |
| `telefono` | `VARCHAR(20)` | SÍ | — |
| `email` | `VARCHAR(100)` | SÍ | — |
| `direccion` | `TEXT` | SÍ | — |
| `distrito` / `provincia` / `departamento` | `VARCHAR(100)` | SÍ | — |
| `area_id` | `BIGINT UNSIGNED` FK | SÍ | Área organizacional |
| `cargo` | `VARCHAR(100)` | SÍ | Puesto de trabajo |
| `fecha_ingreso` | `DATE` | NO | — |
| `fecha_cese` | `DATE` | SÍ | — |
| `tipo_contrato` | `VARCHAR(50)` | NO | Default: `'Indefinido'` |
| `estado` | `ENUM('Activo','Inactivo','Cesado','Vacaciones','Licencia')` | NO | Solo `'Activo'` puede registrar asistencia |
| `sueldo_basico` | `DECIMAL(10,2)` | NO | — |
| `banco` | `VARCHAR(100)` | SÍ | — |
| `numero_cuenta` | `VARCHAR(50)` | SÍ | — |
| `tiene_antecedentes_penales` | `TINYINT(1)` | NO | Bool, default 0 |
| `tiene_antecedentes_policiales` | `TINYINT(1)` | NO | Bool, default 0 |
| `tiene_sctr` | `TINYINT(1)` | NO | Seguro complementario |
| `tiene_epsrc` | `TINYINT(1)` | NO | — |
| `contacto_emergencia_nombre` | `VARCHAR(100)` | SÍ | — |
| `contacto_emergencia_telefono` | `VARCHAR(20)` | SÍ | — |
| `contacto_emergencia_parentesco` | `VARCHAR(50)` | SÍ | — |
| `observaciones` | `TEXT` | SÍ | — |
| `created_by` | `BIGINT UNSIGNED` | SÍ | Usuario que creó el registro |
| `created_at` / `updated_at` | `TIMESTAMP` | SÍ | — |

---

### Tabla `attendance_records` (donde se guarda cada marcación)

```sql
CREATE TABLE IF NOT EXISTS attendance_records (
  id               BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  trabajador_id    BIGINT           NOT NULL,
  dni              VARCHAR(20)      NOT NULL,
  worker_name      VARCHAR(255)     NOT NULL,
  latitude         DECIMAL(10,7)    NOT NULL,
  longitude        DECIMAL(10,7)    NOT NULL,
  accuracy_meters  DECIMAL(10,2)    NULL,
  photo_path       VARCHAR(255)     NOT NULL,
  device_type      VARCHAR(10)      NULL DEFAULT NULL,
  captured_at      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at       DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_trabajador_id (trabajador_id),
  INDEX idx_captured_at  (captured_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Descripción de cada columna:**

| Columna | Tipo | Nulo | Descripción |
|---------|------|------|-------------|
| `id` | `BIGINT UNSIGNED` PK | NO | ID autoincremental del registro |
| `trabajador_id` | `BIGINT` | NO | `id` copiado de `trabajadores` al momento del registro |
| `dni` | `VARCHAR(20)` | NO | DNI del trabajador (redundante, para consultas rápidas) |
| `worker_name` | `VARCHAR(255)` | NO | `nombre_completo` copiado de `trabajadores` al momento del registro |
| `latitude` | `DECIMAL(10,7)` | NO | Latitud GPS con 7 decimales de precisión (ej: `-12.0553412`) |
| `longitude` | `DECIMAL(10,7)` | NO | Longitud GPS con 7 decimales (ej: `-77.0310234`) |
| `accuracy_meters` | `DECIMAL(10,2)` | SÍ | Precisión GPS en metros. `NULL` si el navegador no la proveyó |
| `photo_path` | `VARCHAR(255)` | NO | Ruta relativa al archivo de foto: `uploads/attendance-{ts}-{rand}.jpg` |
| `device_type` | `VARCHAR(10)` | SÍ | `'mobile'` o `'desktop'`, detectado por User-Agent |
| `captured_at` | `DATETIME` | NO | Timestamp del servidor cuando se insertó el registro |
| `created_at` | `DATETIME` | NO | Idéntico a `captured_at` (timestamp de creación) |

**INSERT que se ejecuta:**
```sql
INSERT INTO attendance_records
  (trabajador_id, dni, worker_name, latitude, longitude, accuracy_meters, photo_path, device_type)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
```

---

## 5. Almacenamiento de fotos en disco

| Parámetro | Valor |
|-----------|-------|
| Directorio | `/var/www/asistencia-app/uploads/` |
| Nombre de archivo | `attendance-{timestamp_ms}-{random_9_digitos}.jpg` |
| Ejemplo | `attendance-1741738250123-847392610.jpg` |
| Ruta guardada en DB | `uploads/attendance-1741738250123-847392610.jpg` (relativa) |
| Acceso desde la app | No hay endpoint público de fotos (solo disco local) |

El directorio `uploads/` se crea automáticamente al iniciar el servidor si no existe.

---

## 6. Seguridad y límites

### Rate limiting

| Endpoint | Límite | Ventana |
|----------|--------|---------|
| `GET /api/worker-by-dni` | 60 req/IP | 15 minutos |
| `POST /api/attendance` | 30 req/IP | 15 minutos |

### Validaciones del servidor

| Dato | Regla |
|------|-------|
| DNI | Regex `/^\d{8}$/` — exactamente 8 dígitos |
| latitude | `Number.isFinite` + rango `[-90, 90]` |
| longitude | `Number.isFinite` + rango `[-180, 180]` |
| accuracy | `Number.isFinite` + rango `[0, 10000]` (o `NULL`) |
| photo MIME | Solo `image/jpeg`, `image/png`, `image/webp` |
| photo tamaño | Máximo 4 MB |
| photo count | Máximo 1 archivo por request |
| DNI re-check | Se re-consulta la DB aunque ya fue validado antes (evita spoofing) |

### Headers de seguridad (Helmet)

| Header | Valor / Nota |
|--------|-------------|
| Content-Security-Policy | `default-src 'self'`; scripts solo de `cdn.tailwindcss.com`; imgs `data:` y `blob:` permitidos |
| X-Powered-By | Desactivado |
| Cross-Origin-Opener-Policy | **Desactivado** (necesario para que iOS muestre diálogos de permiso) |
| Strict-Transport-Security | **Desactivado** (Cloudflare maneja HTTPS en el edge) |
| Permissions-Policy | `geolocation=(self), camera=(self), microphone=()` |

---

## 7. Infraestructura

```
Internet ──► Cloudflare      ──► Cloudflare Tunnel      ──► Node.js :3000
(HTTPS 443)  edge/CDN              asistencia-korosoft        /var/www/asistencia-app
             eje-asistencia        ID: e8825459-6804-...       (HTTP, sin TLS local)
             .korosoft.site
```

| Componente | Detalle |
|-----------|---------|
| App Node.js | Puerto `3000`, `0.0.0.0` |
| Tunnel origen | `http://127.0.0.1:3000` |
| Nombre del túnel | `asistencia-korosoft` |
| Dominio público | `https://eje-asistencia.korosoft.site` |
| Servicio systemd app | `asistencia-app.service` (usuario `eje-erp`, linger=yes) |
| Servicio systemd tunnel | `cloudflared-tunnel.service` (usuario `eje-erp`) |
| Config del tunnel | `/home/eje-erp/.cloudflared/config.yml` |

---

## 8. Archivos del proyecto

```
/var/www/asistencia-app/
├── src/
│   ├── server.js           ← Express app, endpoints, Helmet, multer, rate limit
│   └── db.js               ← Pool MariaDB, CREATE TABLE, ALTER TABLE migration
├── public/
│   ├── index.html          ← UI principal (Tailwind CSS)
│   └── js/
│       ├── app.js          ← Controlador principal, flujo completo
│       ├── state.js        ← Estado global (worker, blob, coords)
│       ├── utils/dom.js    ← Helper $()
│       ├── services/
│       │   ├── api.js      ← fetch wrappers (getWorkerByDni, createAttendance)
│       │   ├── camera.js   ← getUserMedia, captureFromVideo (Canvas API)
│       │   └── location.js ← getCurrentLocation (Geolocation API)
│       └── components/
│           ├── status.js       ← setStatus(), setLocation()
│           └── workerCard.js   ← showWorkerCard(), hideWorkerCard()
├── uploads/                ← Fotos capturadas (JPEG, generadas en runtime)
├── .env                    ← Variables de entorno (DB_HOST, DB_NAME, etc.)
└── package.json
```

---

## 9. Consulta para listar registros

```sql
SELECT
  ar.id,
  ar.captured_at,
  ar.worker_name,
  ar.dni,
  ar.latitude,
  ar.longitude,
  ar.accuracy_meters,
  ar.photo_path,
  ar.device_type,
  t.cargo,
  t.estado
FROM attendance_records ar
LEFT JOIN trabajadores t ON t.id = ar.trabajador_id
ORDER BY ar.captured_at DESC;
```

Para ver la foto de un registro, la ruta del archivo es:
```
/var/www/asistencia-app/uploads/<filename>
```
