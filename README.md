# gzaas! — Dilo a lo grande.

[![Deploy to GitHub Pages](https://github.com/gonzalo123/gzaas2/actions/workflows/pages.yml/badge.svg)](https://github.com/gonzalo123/gzaas2/actions/workflows/pages.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**[Abrir la aplicación](https://gonzalo123.github.io/gzaas2/)** · [Descargas y versiones](https://github.com/gonzalo123/gzaas2/releases)

Una reinterpretación de [Gzaas! de ojoven](https://github.com/ojoven/gzaas): mensajes tipográficos a pantalla completa que viven en su enlace. Implementación nueva, sin copiar código ni recursos del proyecto original.

## Desarrollo

Node.js 22.12+ o 24+. React + TypeScript + Vite.

```sh
npm ci --ignore-scripts
npm run dev
npm test
npm run build
```

El resultado de `dist/` se puede publicar en cualquier alojamiento estático. No necesita backend, base de datos, API keys, cookies ni almacenamiento local. Las fuentes se sirven desde el mismo sitio.

## GitHub Pages

Este proyecto se publica en **https://gonzalo123.github.io/gzaas2/** con cada push a `main`. Para desplegar tu propia copia:

1. Crea un repositorio con rama `main` y sube este contenido (incluido package-lock.json).
2. En Settings → Pages selecciona **GitHub Actions** como origen.
3. El workflow `.github/workflows/pages.yml` comprueba tipos, ejecuta tests, construye y publica. Se puede relanzar desde Actions.

`base: './'` permite alojarlo bajo `/gzaas2/` o en un dominio propio. Las URLs compartidas usan el fragmento `#v1=...`, no rutas que requieran reglas de servidor.

## Compartir

`JSON → lz-string.compressToEncodedURIComponent → #v1=...`.

El esquema incluye versión, texto, fuente, colores, textura, efecto, alineación, intensidad y animación. Cada enlace es una instantánea editable. La proporción del editor y de la exportación es una preferencia de presentación: al abrir el enlace, el cartel se adapta a la pantalla del destinatario.

El payload **no está cifrado ni firmado**: cualquier persona con el enlace puede leerlo y crear una variante. No hay enlaces revocables, cambios remotos, galería compartida ni tarjetas sociales por mensaje. No se incrustan fotos ni fuentes en cada enlace. Preservar `v1`, los identificadores y los recursos tipográficos permite seguir abriendo enlaces antiguos.

Máximo 280 caracteres Unicode, 12 líneas y 4096 caracteres de fragmento; la decodificación valida tamaño, formato y listas cerradas de opciones. El texto se dibuja en canvas, nunca se interpreta como HTML. La app respeta `prefers-reduced-motion` y ofrece controles etiquetados y texto alternativo para cada cartel. Los PNG son estáticos, aunque el visor use animaciones. Las fuentes y la distribución exacta de emojis pueden variar por plataforma.

## Funciones

- Seis estilos, tres fuentes, colores, alineación, tamaño, textura, sombras y contorno.
- Diseño adaptable a móvil y escritorio, con vista de lectura a toda pantalla.
- Enlace comprimido, portapapeles con alternativa manual y Web Share cuando existe.
- Exportación PNG local en 4:3, 1:1 y 3:4.
- Aparición suave y movimiento opcional en el visor.
- Integración WebMCP opcional por detección de disponibilidad para configurar texto; no comparte automáticamente.

## Créditos

Idea original: **ojoven**, [Gzaas!](https://www.gzaas.com/). Gonzalo Ayuso colaboró en el proyecto original con la API PHP. Esta versión conserva la idea y renueva la interfaz y arquitectura.

Fuentes: Bebas Neue, DM Sans y DM Serif Display distribuidas por Fontsource bajo sus correspondientes licencias OFL incluidas en las dependencias. lz-string: licencia MIT. React: MIT. No se reutilizan marcas gráficas ni ficheros del repositorio original.

## Copia de demostración en un solo HTML

```sh
npm run build
node scripts/package-preview.mjs gzaas-preview.html
```

Abre `gzaas-preview.html` en un navegador moderno. Incluye el código, CSS y fuentes, sin CDN. Sirve para probar y descargar imágenes sin instalar Node. Los enlaces `file://` de esa copia local no sirven para compartir con otras personas: usa la versión publicada en Pages. El editor guarda automáticamente el último estado válido en `#edit:v1=...`; los enlaces para destinatarios usan `#v1=...` y abren la vista a pantalla completa.

## Validación de esta entrega

Build de producción y comprobación TypeScript correctos. Cinco tests del formato de URL: ida y vuelta Unicode/estilos, enlaces inválidos, restricciones de datos, longitud máxima y campos desconocidos. La revisión visual e interacción en navegador y la integración WebMCP no pudieron ejecutarse en este entorno; compruébalas antes de dar la versión por definitiva.

## Licencia

Código del proyecto bajo [licencia MIT](LICENSE). Las licencias de fuentes y dependencias están en [`public/licenses/`](public/licenses/).
