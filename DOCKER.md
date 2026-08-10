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

## Arranque
Desde la raíz del proyecto:
```bash
docker compose up --build
```
- Sitio:  http://localhost:3000
- Panel:  http://localhost:3000/admin  → usuario `admin`, contraseña `admin12345`

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
- **Puertos:** el sitio se expone en `3000`; MySQL en `3307` del host (para no chocar
  con un MySQL/MariaDB local de Kali). Conéctate con:
  `mysql -h 127.0.0.1 -P 3307 -uroot -proot trycatch_db`
- **Persistencia:** los datos de MySQL viven en el volumen `db_data`. Las imágenes
  que subas por el panel son efímeras (se pierden al recrear el contenedor); para
  esta prueba es suficiente.
- **Entorno:** se usa `NODE_ENV=development` a propósito, porque sobre `http://localhost`
  la CSP de producción fuerza `upgrade-insecure-requests` y rompería CSS/JS. Para un
  despliegue real (Hostinger) se usa `NODE_ENV=production` con HTTPS y secretos fuertes
  (`SESSION_SECRET` ≥16 y `ADMIN_PASSWORD` ≥8).
- **Credenciales:** las de `docker-compose.yml` son solo para pruebas. No las uses en
  producción.
