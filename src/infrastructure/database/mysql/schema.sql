-- TryCatch GT Database Schema (MySQL)

CREATE DATABASE IF NOT EXISTS trycatch_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE trycatch_db;

-- Table for Admin Users (contraseñas hasheadas con bcrypt; el admin inicial
-- se siembra en tiempo de ejecución desde las credenciales del .env)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'editor') NOT NULL DEFAULT 'admin',
    email VARCHAR(150) NULL,
    avatar VARCHAR(500) NULL,
    mfa_secret VARCHAR(64) NULL,
    mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_backup_codes JSON NULL,
    session_version INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Para bases de datos ya existentes (MySQL no soporta ADD COLUMN IF NOT EXISTS):
-- ALTER TABLE users ADD COLUMN mfa_backup_codes JSON NULL AFTER mfa_enabled;
-- ALTER TABLE users ADD COLUMN session_version INT NOT NULL DEFAULT 0 AFTER mfa_enabled;

-- Table for Audit Logs (bitácora de accesos y acciones sensibles del admin)
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    action VARCHAR(80) NOT NULL,
    actor_id INT NULL,
    actor VARCHAR(150) NULL,
    ip VARCHAR(64) NULL,
    method VARCHAR(10) NULL,
    path VARCHAR(255) NULL,
    status INT NULL,
    detail VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_created (created_at),
    INDEX idx_audit_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for Site Config (contacto/WhatsApp editables desde el panel)
CREATE TABLE IF NOT EXISTS site_config (
    config_key VARCHAR(80) PRIMARY KEY,
    config_value TEXT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for Blog Posts
CREATE TABLE IF NOT EXISTS blog_posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(160) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    excerpt VARCHAR(255) NULL,
    content MEDIUMTEXT NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'General',
    author VARCHAR(150) NOT NULL DEFAULT 'TryCatch GT',
    cover_image VARCHAR(500) NULL,
    cover_position VARCHAR(20) NOT NULL DEFAULT '50% 50%',
    reading_time INT NOT NULL DEFAULT 1,
    status ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
    published_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status_published (status, published_at),
    INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for Services
CREATE TABLE IF NOT EXISTS services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(50) NOT NULL,
    accent_color VARCHAR(50) NOT NULL DEFAULT '#0066FF',
    tags JSON NULL,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for Monthly Plans (Retainers)
CREATE TABLE IF NOT EXISTS plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    tagline VARCHAR(255) NOT NULL,
    price_monthly DECIMAL(10, 2) NOT NULL,
    price_monthly_gtq DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    features JSON NULL,
    services JSON NULL,
    accent_color VARCHAR(50) NOT NULL DEFAULT '#8B5CF6',
    cta_label VARCHAR(100) NOT NULL DEFAULT 'Elegir plan',
    is_popular BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for Project Requests (Leads / Cotizaciones)
CREATE TABLE IF NOT EXISTS project_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_name VARCHAR(150) NOT NULL,
    client_email VARCHAR(150) NOT NULL,
    company_name VARCHAR(150) NULL,
    project_type VARCHAR(100) NOT NULL DEFAULT 'Custom Software',
    budget_range VARCHAR(50) NULL,
    description TEXT NOT NULL,
    status ENUM('pending', 'reviewed', 'contacted') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed Default Services if empty
INSERT IGNORE INTO services (id, slug, title, description, icon, accent_color, tags, is_featured) VALUES
(1, 'web-custom', 'Desarrollo Web Custom', 'Plataformas SaaS, dashboards interactivos y web apps complejas de alto rendimiento.', '🌐', '#0066FF', '["React", "Next.js", "TypeScript", "Node.js"]', 1),
(2, 'mobile-apps', 'Apps Móviles Nativas y Híbridas', 'Aplicaciones móviles para iOS y Android fluidas, rápidas y conectadas en tiempo real.', '📱', '#8B5CF6', '["Flutter", "React Native", "Swift", "Kotlin"]', 1),
(3, 'backend-apis', 'APIs & Microservicios', 'Arquitecturas backend distribuidas, escalables y con baja latencia.', '⚙️', '#06B6D4', '["Go", "Node.js", "Python", "REST/gRPC"]', 0),
(4, 'cloud-devops', 'Cloud Infrastructure & DevOps', 'Automatización de pipelines CI/CD, contenedorización y despliegue robusto en la nube.', '☁️', '#EC4899', '["AWS", "GCP", "Docker", "Kubernetes"]', 0);

-- Seed Default Monthly Plans if empty
INSERT IGNORE INTO plans (id, slug, name, tagline, price_monthly, price_monthly_gtq, currency, features, services, accent_color, cta_label, is_popular) VALUES
(1, 'esencial', 'Esencial', 'Para mantener tu producto vivo y con mejoras constantes.', 399.00, 2999.00, 'USD', '["20 horas de desarrollo al mes", "Corrección de bugs y ajustes pequeños", "Pruebas manuales antes de cada entrega", "1 reunión de seguimiento al mes", "Soporte por correo (respuesta en 48 h)"]', '["Web", "APIs"]', '#06B6D4', 'Empezar con Esencial', 0),
(2, 'impulso', 'Impulso', 'Ritmo constante de nuevas funcionalidades para tu producto.', 999.00, 7499.00, 'USD', '["60 horas de desarrollo al mes", "Nuevas funcionalidades + mantenimiento", "Interfaces limpias con librerías de componentes", "Despliegue a producción incluido", "Reunión de seguimiento quincenal", "Soporte prioritario (respuesta en 24 h)"]', '["Web", "Móvil", "APIs"]', '#8B5CF6', 'Elegir Impulso', 1),
(3, 'dedicado', 'Dedicado', 'Dedicación casi a tiempo completo, enfocada en un solo proyecto.', 1899.00, 13999.00, 'USD', '["120 horas de desarrollo al mes", "Un cliente prioritario a la vez", "Desarrollo full-stack de punta a punta", "Configuración de despliegue y hosting", "Reunión de seguimiento semanal", "Soporte prioritario (respuesta el mismo día)"]', '["Web", "Móvil", "APIs", "Cloud"]', '#EC4899', 'Hablar de Dedicado', 0);

-- Seed Default Blog Posts if empty
INSERT IGNORE INTO blog_posts (id, slug, title, excerpt, content, category, author, reading_time, status, published_at) VALUES
(1, 'ciberseguridad-en-wordpress', 'Ciberseguridad en WordPress: Amenazas, Buenas Prácticas y Mantenimiento Proactivo', 'Las amenazas a sitios WordPress crecen cada año. Repasamos los vectores de ataque más comunes y las prácticas de mantenimiento proactivo que mantienen tu sitio seguro.', '<p>WordPress impulsa una enorme parte de la web, y esa popularidad lo convierte en un objetivo constante. Los ataques más comunes explotan plugins desactualizados, contraseñas débiles y configuraciones por defecto.</p><h2>Amenazas frecuentes</h2><p>Inyección SQL, fuerza bruta al login, malware inyectado por plugins comprometidos y ataques XSS son el pan de cada día.</p><h2>Mantenimiento proactivo</h2><p>Un plan de mantenimiento proactivo incluye actualizaciones controladas, respaldos automáticos, escaneo de malware y un firewall de aplicaciones (WAF).</p>', 'Technology', 'Juan José Jolón Granados', 3, 'published', '2026-03-18 10:00:00'),
(2, 'ciberseguridad-para-audiencias-latinoamericanas', 'La Importancia de la Ciberseguridad en el Mantenimiento de WordPress para Audiencias Latinoamericanas', 'La ciberseguridad es el conjunto de prácticas y tecnologías diseñadas para proteger sistemas, redes y datos. Por qué importa especialmente para negocios en Latinoamérica.', '<p>La ciberseguridad es el conjunto de prácticas y tecnologías diseñadas para proteger sistemas, redes y datos frente a accesos no autorizados y ataques maliciosos.</p><p>En Latinoamérica, la adopción digital de las PYMEs crece más rápido que su madurez en seguridad, lo que abre una brecha que los atacantes aprovechan.</p><h2>Primeros pasos</h2><p>Autenticación robusta, copias de seguridad verificadas y actualizaciones periódicas forman la base.</p>', 'Technology', 'Juan José Jolón Granados', 15, 'published', '2026-03-18 09:00:00'),
(3, 'mantenimiento-profesional-wordpress', 'Mantenimiento Profesional para tu Sitio WordPress', 'La seguridad web es un aspecto fundamental para cualquier negocio con presencia online. Qué incluye un servicio de mantenimiento profesional y por qué vale la pena.', '<p>La seguridad web es un aspecto fundamental para cualquier negocio con presencia online. Un sitio caído o comprometido se traduce en pérdida de ventas y de confianza.</p><p>El mantenimiento profesional cubre actualizaciones, monitoreo de disponibilidad, respaldos, optimización de rendimiento y soporte ante incidentes.</p>', 'WordPress Maintenance', 'Juan José Jolón Granados', 2, 'published', '2026-03-14 09:00:00');
