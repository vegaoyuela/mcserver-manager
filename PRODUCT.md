# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Administradores de servidores de Minecraft, self-hosters, creadores de contenido y comunidades de jugadores que necesitan desplegar, configurar y supervisar servidores de Minecraft (Java/NeoForge y Bedrock) en infraestructura propia o VPS (Dokploy, Docker Compose, Portainer) sin requerir conocimientos avanzados de terminal ni configuraciones complejas de redes.

## Product Purpose

Proporcionar un centro de control web todo-en-uno, moderno, reactivo y de alta fidelidad técnica que permite operar y monitorear el servidor de Minecraft, sus mods, archivos de configuración, consola en vivo y túneles públicos hacia internet (Playit.gg) desde un único contenedor Docker seguro y completamente autocontenido.

## Positioning

A diferencia de paneles pesados multi-contenedor como Pterodactyl o soluciones complejas que requieren acceso privilegiado al socket de Docker (`/var/run/docker.sock`), MCServer Manager ejecuta el backend, el proceso del juego y el agente de túneles en el mismo entorno de ejecución aislado. Su almacenamiento está estrictamente confinado al volumen `/data`, incorpora diagnóstico asistido por IA (Google Gemini) para identificar causas raíz de caídas en segundos, y no expone secretos en texto plano.

## Key Capabilities & Workflows

- **Control del Ciclo de Vida**: Arranque desatendido, apagado limpio mediante comandos enviados a la entrada estándar (`stop`), reinicio forzado y mitigación de procesos huérfanos mediante terminación de árbol de procesos en Linux.
- **Consola Interactiva en Tiempo Real**: Terminal bidireccional basada en Xterm.js y WebSockets con soporte de colores ANSI y buffer de logs.
- **Instalador de Versiones**: Descarga e instalación directa desde los manifiestos oficiales de Mojang v2 y los metadatos Maven de NeoForge.
- **Gestión de Mods**: Subida asíncrona por lotes con persistencia de progreso, activación/desactivación sin pérdida de datos (`.jar` $\leftrightarrow$ `.jar.disabled`) y análisis de dependencias.
- **Diagnóstico Asistido por IA**: Análisis contextual de caídas mediante `@google/genai` (detectando OOM, incompatibilidad de Java, puertos ocupados, EULA, client-only mods y chunks corruptos) con fallback a reglas regex locales.
- **Túneles Playit.gg**: Integración con el binario nativo de Playit mediante socket IPC local en memoria (`/run/playit/playitd.sock`) para publicar la IP pública del servidor sin abrir puertos en el router.
- **Explorador de Archivos Seguro**: Navegación de carpetas, edición de archivos de texto con resaltado de sintaxis, subida y descarga con protección anti-Path Traversal estricta.
- **Administración de Jugadores**: Listas de operadores, whitelist, baneos y visualización de avatares en tiempo real.
- **Editor de Propiedades & MOTD**: Ajuste de `server.properties` con copias `.bak` atómicas y editor visual con formato de códigos de color de Minecraft.

## Durable Constraints

- **Aislamiento de Almacenamiento**: La única raíz permitida para cualquier operación del servidor o explorador es `/data`.
- **Preservación Funcional**: Cualquier rediseño o mejora visual debe mantener la totalidad de las APIs, rutas, estados y funcionalidades preexistentes.
- **Seguridad en Red**: El socket IPC de Playit nunca se expone fuera del contenedor; los tokens de reclamación no se persisten en logs ni en archivos de configuración planos.
