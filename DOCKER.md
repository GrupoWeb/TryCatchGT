# Ejecutar con Docker (prueba local / Kali)

Levanta la aplicación **Node + MySQL** en contenedores, sin instalar nada más que Docker.

## Requisitos
- Docker Engine + plugin Compose (`docker compose`). En Kali:
  ```bash
  sudo apt update && sudo apt install -y docker.io docker-compose-plugin
  sudo systemctl enable --now docker
  # opcional, para no usar sudo en cada comando:
  sudo usermod -aG docker "$USER"   # requiere cerrar y volver a abrir sesión
  ```

## Configurar los secretos (una vez)
Los secretos no están en `docker-compose.yml`: viven en un `.env` que **no** se
commitea. Créalo desde la plantilla y genera valores fuertes:
```bash
cp .env.example .env
# genera secretos y pégalos en .env (SESSION_SECRET, ENCRYPTION_KEY):
openssl rand -hex 32
```
En `.env` define al menos: `MYSQL_ROOT_PASSWORD`, `MYSQL_USER`/`MYSQL_PASSWORD`
(= `DB_USER`/`DB_PASSWORD`), `SESSION_SECRET`, `ENCRYPTION_KEY` y `ADMIN_PASSWORD`
(mín. 12 caracteres).

## Arranque
Desde la raíz del proyecto:
```bash
docker compose up --build
```
- Sitio:  http://localhost:3000
- Panel:  http://localhost:3000/admin  → usuario `admin`, contraseña la de `ADMIN_PASSWORD`

El contenedor `app` espera a que MySQL esté sano (`healthcheck`) y al iniciar corre
las **migraciones y el seed automáticamente** (`migrationsRun: true`): blog,
servicios y planes quedan poblados sin pasos manuales.

Para correr en segundo plano:
```bash
docker compose up --build -d
docker compose logs -f app
```

## Detener / limpiar
```bash
docker compose down        # detiene y elimina los contenedores
docker compose down -v     # además borra el volumen de MySQL (empieza de cero)
```

## Notas
- **Puertos:** solo el sitio se expone (`3000`). **MySQL no se publica en el host**;
  la app le habla por la red interna de Compose. Para inspeccionar la BD:
  `docker compose exec db mysql -u"$MYSQL_USER" -p trycatch_db`
- **Usuario de la app:** la app se conecta a MySQL con un usuario dedicado
  (`MYSQL_USER`, no root) limitado a `trycatch_db`. El contenedor de la app corre
  como usuario **no root** (`USER node`).
- **Persistencia:** los datos de MySQL viven en el volumen `db_data`. Las imágenes
  que subas por el panel son efímeras (se pierden al recrear el contenedor); para
  esta prueba es suficiente.
- **Entorno:** corre en `NODE_ENV=production` (CSP estricta, cookies `Secure`,
  validación de secretos). Solo `FORCE_HTTPS=false` desacopla el `upgrade-insecure-requests`
  para poder servir por `http://localhost`. En Hostinger (con HTTPS) omite `FORCE_HTTPS`.
- **Credenciales:** genera secretos fuertes en `.env` (`openssl rand -hex 32`). Como se
  corre en producción, un `SESSION_SECRET`/`ADMIN_PASSWORD` débil aborta el arranque.
