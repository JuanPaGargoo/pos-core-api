# POS Core API

Backend del sistema POS — Stage 0. Construido con NestJS, Prisma ORM y PostgreSQL.

---

## Requisitos

- [Node.js](https://nodejs.org/) v20+
- [pnpm](https://pnpm.io/) v9+ (`npm install -g pnpm`)
- [PostgreSQL](https://www.postgresql.org/) 14+ (local o vía Docker)

---

## 1. Base de datos PostgreSQL

### Opción A — PostgreSQL local

Crea la base de datos manualmente desde `psql` o cualquier cliente:

```sql
CREATE DATABASE pos_core_db;
```

### Opción B — Docker

Si no tienes PostgreSQL instalado, usa este archivo `docker-compose.yml` en la raíz del proyecto:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: pos-postgres
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: pos_core_db
    volumes:
      - pos_pgdata:/var/lib/postgresql/data

volumes:
  pos_pgdata:
```

Luego levanta el contenedor:

```bash
docker compose up -d
```

---

## 2. Instalar dependencias

```bash
pnpm install
```

---

## 3. Variables de entorno

Crea un archivo `.env` en la raíz del proyecto con el siguiente contenido (ajusta los valores según tu entorno):

```env
NODE_ENV=development
PORT=3000

# Conexión a PostgreSQL
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pos_core_db"

# JWT
JWT_SECRET=tu_secreto_jwt_muy_seguro
JWT_EXPIRATION=15m

REFRESH_TOKEN_SECRET=tu_secreto_refresh_muy_seguro
REFRESH_TOKEN_EXPIRATION=7d

# Opcionales
API_PREFIX=api
API_VERSION=1.0.0
CORS_ORIGIN=http://localhost:5173
```

> Los valores de `JWT_SECRET` y `REFRESH_TOKEN_SECRET` pueden ser cualquier cadena larga y aleatoria.

---

## 4. Aplicar el esquema de base de datos

Ejecuta las migraciones para crear todas las tablas:

```bash
pnpm prisma migrate deploy
```

> En desarrollo también puedes usar `pnpm prisma migrate dev` (genera migraciones nuevas si hay cambios en el schema).

---

## 5. Cargar datos iniciales (seed)

Crea los roles, permisos, usuario administrador, métodos de pago y settings base:

```bash
pnpm seed
```

Datos que se insertan:
- **Usuario admin**: `username=admin`, `email=admin@gmail.com`, `password=admin123`
- **Roles**: `admin`, `manager`, `cashier`, `warehouse`
- **28 permisos** distribuidos por módulo
- **3 métodos de pago**: Efectivo, Tarjeta, Transferencia
- **7 settings** globales del sistema

---

## 6. Levantar el servidor

### Modo desarrollo (con hot-reload)

```bash
pnpm start:dev
```

### Modo producción

```bash
pnpm build
pnpm start:prod
```

La API queda disponible en `http://localhost:3000`.

---

## 7. Documentación de la API (Swagger)

Con el servidor corriendo, abre en el navegador:

```
http://localhost:3000/api
```

También disponible en formato JSON (para importar en Postman, Insomnia, etc.):

```
http://localhost:3000/api-json
```

---

## 8. Explorar la base de datos (Prisma Studio)

Interfaz visual para ver y editar los datos directamente:

```bash
pnpm prisma studio
```

Se abre automáticamente en `http://localhost:5555`.

---

## 9. Tests

```bash
# Unitarios
pnpm test

# E2E
pnpm test:e2e

# Cobertura
pnpm test:cov
```

---

## Resumen de comandos

| Comando | Descripción |
|---|---|
| `pnpm install` | Instala dependencias |
| `pnpm prisma migrate deploy` | Aplica migraciones a la BD |
| `pnpm seed` | Carga datos iniciales |
| `pnpm start:dev` | Servidor en modo desarrollo |
| `pnpm start:prod` | Servidor en modo producción |
| `pnpm prisma studio` | Explorador visual de la BD |
| `pnpm test` | Tests unitarios |
| `pnpm test:e2e` | Tests de integración |
