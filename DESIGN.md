---
name: MCServer Manager Design System
description: Sistema de diseño técnico, oscuro y de alta precisión para administración de servidores Minecraft y redes Playit.
colors:
  void-950: "#070a0f"
  surface-900: "#0b0f17"
  surface-850: "#0f1724"
  surface-800: "#141d2e"
  surface-700: "#1c283e"
  border-subtle: "rgba(255, 255, 255, 0.08)"
  border-focus: "rgba(16, 185, 129, 0.4)"
  text-primary: "#f8fafc"
  text-secondary: "#94a3b8"
  text-muted: "#64748b"
  accent-emerald: "#10b981"
  accent-diamond: "#06b6d4"
  accent-gold: "#f59e0b"
  accent-red: "#ef4444"
  playit-blue: "#0284c7"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  heading:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0em"
  code:
    fontFamily: "'JetBrains Mono', Menlo, Monaco, monospace"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0em"
rounded:
  sm: "6px"
  md: "10px"
  lg: "14px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  card:
    backgroundColor: "{colors.surface-900}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "20px"
  button-primary:
    backgroundColor: "{colors.accent-emerald}"
    textColor: "{colors.void-950}"
    rounded: "{rounded.sm}"
    padding: "10px 18px"
  button-secondary:
    backgroundColor: "{colors.surface-800}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
    padding: "10px 18px"
---

# MCServer Manager Design System

## Overview

Este sistema de diseño está concebido para un panel de administración en modo **Operate**. La prioridad número uno es la claridad operativa, la escaneabilidad rápida de métricas del servidor, el contraste de alta legibilidad en entornos oscuros y la retroalimentación táctil inmediata al interactuar con el servidor.

Se eliminan patrones decorativos perezosos (como degradados en texto, falsas sombras tipo neobrutalismo o etiquetas "eyebrow" superfluas encima de títulos) y se reemplazan por jerarquías tipográficas contundentes, bordes estructurados y microinteracciones fluidas con física de resorte (*spring physics*).

## Colors

- **Superficies**:
  - `void-950` (`#070a0f`): Fondo del lienzo raíz.
  - `surface-900` (`#0b0f17`): Fondo de navegación, barras laterales y paneles principales.
  - `surface-850` (`#0f1724`): Contenedores secundarios y tarjetas interactivas.
  - `surface-800` (`#141d2e`): Modales, popovers y estados activos.
  - `border-subtle` (`rgba(255, 255, 255, 0.08)`): Líneas de división limpias y consistentes.
- **Acentos Semánticos**:
  - `accent-emerald` (`#10b981`): Estado online, servidor activo, acciones afirmativas.
  - `accent-diamond` (`#06b6d4`): Telemetría, puertos de red y NeoForge.
  - `accent-gold` (`#f59e0b`): Advertencias, estados de reinicio y cuentas no premium.
  - `accent-red` (`#ef4444`): Servidor offline, crashes, baneos y acciones destructivas.
  - `playit-blue` (`#0284c7`): Identidad y estado de túneles Playit.gg.

## Typography

- **Fuente Principal**: Inter (interfaz, botones, tablas y etiquetas).
- **Fuente Monoespaciada**: JetBrains Mono (consola, rutas de archivos, puertos, logs de fallos y valores hexadecimales).
- **Jerarquía**:
  - Títulos principales sin kickers/eyebrows innecesarios.
  - Textos secundarios tintados desde la paleta de superficie (`#94a3b8` / `#64748b`), nunca un gris puro desaturado.

## Layout

- **Estructura fija y adaptable**:
  - Barra lateral (*Sidebar*) colapsable o adaptable con navegación vertical estructurada.
  - Barra superior (*Topbar*) con estado en vivo del proceso (indicador pulsante de estado, uptime, acciones rápidas de control de encendido).
  - Área de contenido con scrollbars refinados, padding balanceado (`p-6` en desktop, `p-4` en móviles) y transiciones fluidas de vista mediadas por Framer Motion.

## Elevation & Depth

- Se utiliza el principio de **declarar elevación una sola vez**: o bien un borde nítido de 1px translúcido (`border border-white/[0.08]`), o bien una sombra ambiental suave con dispersión amplia (`shadow-xl shadow-black/40`), evitando superponer bordes gruesos sobre sombras duras.
- Modales flotantes con telón de fondo desenfocado (`backdrop-blur-md bg-black/70`).

## Shapes

- Esquinas estandarizadas en `rounded-lg` (10–12px) para tarjetas y paneles.
- Controles interactivos y botones en `rounded-md` (6–8px).
- Píldoras (`rounded-full`) reservadas exclusivamente para badges de estado (Online / Offline / Starting).

## Components

- **Indicadores de Estado (Status Badges)**: Píldora compacta con punto emisor de pulso de luz y tipografía JetBrains Mono clara.
- **Botones de Acción (Power Controls)**:
  - `Start`: Fondo esmeralda accesible con alto contraste.
  - `Stop`: Fondo carmesí con confirmación o tacto claro.
  - `Restart`: Transición de giro suave con indicador visual.
- **Consola Terminal**: Xterm.js integrado con borde oscuro y contenedor con scrollbar temático oscuro.
- **Explorador de Archivos**: Lista tipo tabla densa con filas alternas sutiles, iconos vectoriales precisos (Lucide React) y menú de acciones en hover.

## Do's and Don'ts

### Do's:
- Mantener la relación de contraste $\ge 4.5:1$ en todo texto informativo.
- Transicionar los cambios de pestañas con `<AnimatePresence mode="wait">` y curvas suaves.
- Proveer siempre retroalimentación inmediata (toasts y estados de carga) en acciones asíncronas.
- Diseñar pensando en usabilidad móvil (touch targets $\ge 44\text{px}$).

### Don'ts:
- No usar degradados en texto (`bg-clip-text text-transparent`) que perjudican la legibilidad.
- No colocar etiquetas decorativas ("eyebrows") sobre los encabezados de sección.
- No utilizar emojis como iconos de sistema; emplear siempre iconos vectoriales consistentes de Lucide.
- No usar sombras duras sin desenfoque estilo neobrutalista a menos que sea una decisión estética explícita.
