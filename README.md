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

El esquema incluye versión, texto, fuente, colores, textura, efecto, alineación, intensidad, animación, ritmo, repetición, fondo, color de acento y movimiento del fondo. Cada enlace es una instantánea editable. Los enlaces v1 anteriores siguen funcionando: si no incluyen los campos nuevos, se abren con ritmo normal, una sola reproducción y el fondo liso original. La proporción del editor y de la exportación es una preferencia de presentación: al abrir el enlace, el cartel se adapta a la pantalla del destinatario.

El payload **no está cifrado ni firmado**: cualquier persona con el enlace puede leerlo y crear una variante. No hay enlaces revocables, cambios remotos, galería compartida ni tarjetas sociales por mensaje. No se incrustan fotos ni fuentes en cada enlace. Preservar `v1`, los identificadores y los recursos tipográficos permite seguir abriendo enlaces antiguos.

Máximo 280 caracteres Unicode, 12 líneas y 4096 caracteres de fragmento; la decodificación valida tamaño, formato y listas cerradas de opciones. El texto del editor y del visor se presenta con SVG y animaciones CSS por letras, palabras o líneas; los grafemas Unicode mantienen juntos los emojis y sus modificadores. La exportación usa canvas con el mismo cálculo de texto y escena de fondo. El mensaje nunca se interpreta como HTML. La app respeta `prefers-reduced-motion` y ofrece controles etiquetados y texto alternativo para cada cartel. Los PNG muestran una composición estática del diseño, aunque el visor use animaciones. Las fuentes y la distribución exacta de emojis pueden variar por plataforma.

## Funciones

- Inicio minimalista: logo, un campo de texto y «gzaas it!». Enter abre el editor con el mensaje; Shift+Enter añade una línea. Las opciones de diseño y movimiento aparecen después.
- Editor ajustado a la altura de la pantalla: vista previa siempre visible, controles en pestañas Texto / Estilos / Diseño / Fondos / Movimiento y acciones de compartir y descargar en la barra superior. Las pestañas se recorren con flechas, Home y End. En pantallas excepcionalmente pequeñas o con zoom, el panel de opciones permite desplazamiento sin mover la vista previa.
- 24 estilos en cuatro colecciones de seis: Esenciales, Noche y neón, Pop y retro y Con carácter. Se recorren sin scroll.
- Doce fuentes de Google Fonts incluidas localmente, con selector visual que muestra cada tipografía: Bebas Neue, DM Serif Display, DM Sans, Anton, Bungee, Bungee Shade, Monoton, Permanent Marker, Pacifico, Righteous, Space Grotesk y Abril Fatface.
- Ocho fondos: liso, aurora, nubes, atardecer, rayos, constelación, ajedrez y ondas; colores base y acento editables y movimiento independiente del texto. Texturas opcionales, sombras, contorno, neón y eco 3D.
- Diseño adaptable a móvil y escritorio, con vista de lectura a toda pantalla.
- Enlace comprimido, portapapeles con alternativa manual y Web Share cuando existe.
- Exportación PNG local en 4:3, 1:1 y 3:4.
- Movimiento por letras (letra a letra, ola, rebote, remolino), palabras o líneas (aparición, impacto, desenfoque, fade in / out, deslizamiento y flotación) y modo estático; vista previa en vivo y visor.
- Tres ritmos, reproducción única o en bucle, pausa y repetición manual. Cada estilo incluye su animación.
- Entrada y salida del visor con transiciones; sus controles se desvanecen tras unos segundos y reaparecen al mover el ratón, tocar la pantalla o usar el teclado.
- Integración WebMCP opcional por detección de disponibilidad para configurar texto; no comparte automáticamente.

## Créditos

Idea original: **[ojoven](https://github.com/ojoven)**, [Gzaas!](https://github.com/ojoven/gzaas). Gonzalo Ayuso colaboró en el proyecto original con la API PHP. Esta versión conserva la idea y renueva la interfaz y arquitectura. El crédito enlazado al proyecto original y a su autor aparece en la landing, el editor y el visor.

Las doce fuentes se distribuyen mediante Fontsource bajo sus correspondientes licencias OFL, copiadas a `public/licenses/` e incluidas en la demo HTML. No necesitan una petición a Google Fonts en tiempo de ejecución. lz-string: licencia MIT. React: MIT. No se reutilizan marcas gráficas ni ficheros del repositorio original.

## Copia de demostración en un solo HTML

```sh
npm run build
node scripts/package-preview.mjs gzaas-preview.html
```

Abre `gzaas-preview.html` en un navegador moderno. Incluye el código, CSS y fuentes, sin CDN. Sirve para probar y descargar imágenes sin instalar Node. Los enlaces `file://` de esa copia local no sirven para compartir con otras personas: usa la versión publicada en Pages. El editor guarda automáticamente el último estado válido en `#edit:v1=...`; los enlaces para destinatarios usan `#v1=...` y abren la vista a pantalla completa.

## Validación de esta entrega

Build de producción y comprobación TypeScript correctos. Diez tests del formato de URL, incluyendo todas las combinaciones de fuentes, fondos y efectos, animación, ritmo y repetición y compatibilidad con enlaces antiguos. Revisión visual e interacción en Chrome en escritorio y móvil: colecciones, selector de fuentes, animación por letras y de fondos, pausa, repetición, visor, enlaces compartidos, créditos y movimiento reducido. La integración WebMCP no se ha validado en un navegador que la implemente.

## Licencia

Código del proyecto bajo [licencia MIT](LICENSE). Las licencias de fuentes y dependencias están en [`public/licenses/`](public/licenses/).
