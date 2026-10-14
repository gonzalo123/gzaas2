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

«Compartir» prepara una imagen PNG del mensaje y permite compartirla junto con su enlace mediante el menú nativo del dispositivo. Tras crear un GIF también puedes compartir el archivo y el enlace. Se comprueba la compatibilidad con archivos en cada caso; si el navegador no la ofrece, descarga la imagen o el GIF y adjúntalo en tu chat junto al enlace copiado. La app de destino decide si conserva el texto del enlace junto al archivo. No se suben mensajes ni imágenes a ningún servidor. La demo `file://` comparte solo el archivo, ya que su dirección local no es accesible para el destinatario.

Los enlaces pegados usan una tarjeta común de Gzaas!, con una miniatura de 1200 × 630 y metadatos Open Graph presentes en el HTML estático. El fragmento con el mensaje no llega al servidor ni al rastreador de WhatsApp: la miniatura automática es la misma para todos los mensajes. Para mostrar el diseño concreto, comparte el archivo adjunto. La tarjeta depende del rastreador y su caché; requiere publicar `public/social-preview.png` junto con la web. Si alojas una copia en otra URL, actualiza `og:url`, `og:image` y `twitter:image` en `index.html` para apuntar a tu dirección pública absoluta.

El esquema incluye versión, texto, fuente, colores, textura, efecto, alineación, intensidad, animación, ritmo, repetición, fondo, color de acento y movimiento del fondo. Cada enlace es una instantánea editable. Los enlaces v1 anteriores siguen funcionando: si no incluyen los campos nuevos, se abren con ritmo normal, una sola reproducción y el fondo liso original. La proporción del editor y de la exportación es una preferencia de presentación: al abrir el enlace, el cartel se adapta a la pantalla del destinatario.

El payload **no está cifrado ni firmado**: cualquier persona con el enlace puede leerlo y crear una variante. No hay enlaces revocables, cambios remotos, galería compartida ni tarjetas sociales por mensaje. No se incrustan fotos ni fuentes en cada enlace. Preservar `v1`, los identificadores y los recursos tipográficos permite seguir abriendo enlaces antiguos.

Máximo 280 caracteres Unicode, 12 líneas y 4096 caracteres de fragmento; la decodificación valida tamaño, formato y listas cerradas de opciones. El texto del editor y del visor se presenta con SVG y animaciones CSS por letras, palabras o líneas; los grafemas Unicode mantienen juntos los emojis y sus modificadores. La exportación usa canvas con el mismo cálculo de texto y escena de fondo. El mensaje nunca se interpreta como HTML. La app respeta `prefers-reduced-motion` y ofrece controles etiquetados y texto alternativo para cada cartel. Los PNG muestran una composición estática del diseño, aunque el visor use animaciones. Los GIF se generan a 12 fps y 640 píxeles de lado mayor: un ciclo del texto o el tráiler completo. Su paleta de 256 colores por fotograma puede introducir bandas en degradados; los fondos continuos se recortan a la duración del clip. La generación del GIF es una acción explícita: conserva el movimiento aunque se solicite movimiento reducido, pero su vista previa muestra una imagen fija en ese caso. Las fuentes y la distribución exacta de emojis pueden variar por plataforma.

## Funciones

- Inicio minimalista: logo, un campo de texto y «gzaas it!». Enter abre el editor con el mensaje y un estilo elegido al azar entre los 24 disponibles; Shift+Enter añade una línea. El campo crece y se encoge automáticamente con el texto, el pegado y el ancho de pantalla, sin scroll interior. Las opciones de diseño y movimiento aparecen después.
- Editor ajustado a la altura de la pantalla: vista previa siempre visible, controles en pestañas Texto / Estilos / Diseño / Fondos / Movimiento y acciones de compartir y descargar en la barra superior. Las pestañas se recorren con flechas, Home y End. En pantallas excepcionalmente pequeñas o con zoom, el panel de opciones permite desplazamiento sin mover la vista previa.
- 24 estilos en cuatro colecciones de seis: Esenciales, Noche y neón, Pop y retro y Con carácter. Se recorren sin scroll.
- Doce fuentes de Google Fonts incluidas localmente, con selector visual que muestra cada tipografía: Bebas Neue, DM Serif Display, DM Sans, Anton, Bungee, Bungee Shade, Monoton, Permanent Marker, Pacifico, Righteous, Space Grotesk y Abril Fatface.
- Ocho fondos: liso, aurora, nubes, atardecer, rayos, constelación, ajedrez y ondas; colores base y acento editables y movimiento independiente del texto. Texturas opcionales, sombras, contorno, neón y eco 3D.
- Diseño adaptable a móvil y escritorio, con vista de lectura a toda pantalla.
- Enlace comprimido, portapapeles con alternativa manual y Web Share cuando existe. Imagen o GIF junto al enlace en dispositivos compatibles, y miniatura social común para enlaces pegados.
- Descarga local en PNG o GIF desde el mismo selector, en 4:3, 1:1 y 3:4. El GIF incluye letras, fondos y todas las escenas del tráiler, con ritmo y bucle configurados; muestra progreso, permite cancelar y ofrece una vista previa antes de descargar. El PNG mantiene el mensaje completo en alta resolución.
- Movimiento por letras (letra a letra, ola, rebote, remolino), palabras o líneas (aparición, impacto, desenfoque, fade in / out, deslizamiento y flotación) y modo estático; vista previa en vivo y visor.
- Modo Tráiler: secuencia automática de hasta seis escenas y un cierre con el mensaje completo, con cambios de escala, color, entrada y fade out. Se activa desde el botón Tráiler de la vista previa o desde Movimiento. Los saltos de línea definen las escenas; sin ellos, se agrupan palabras o frases. Los controles numerados permiten revisar cada escena. Se comparte en el mismo enlace, funciona sin conexión y muestra el mensaje completo cuando se solicita movimiento reducido. El PNG conserva el mensaje completo y el diseño final.
- Tres ritmos, reproducción única o en bucle, pausa y repetición manual. Cada estilo incluye su animación.
- Entrada y salida del visor con transiciones. Al abrir un enlace, pulsar «Ver en grande» o activar pantalla completa se muestra solo el mensaje: menú, navegación del tráiler, progreso y créditos aparecen al mover el ratón, tocar la pantalla o usar el teclado, y se ocultan tras 2,8 segundos sin interacción. El foco de teclado mantiene accesibles los controles; un clic con el ratón no los deja visibles permanentemente.
- Integración WebMCP opcional por detección de disponibilidad para configurar texto; no comparte automáticamente.

## Tipografía de partículas

En **Movimiento → Partículas** puedes elegir **Ensamblar (Particle Assemble)**,
**Explosión (Explode & Reform)** o **Vórtice (Particle Vortex)**. Escribe «HOLA
MUNDO», prueba los tres modos y usa el botón **Repetir animación** de la vista
previa. Densidad ofrece tres niveles; el control de repulsión permite apartar las
partículas con el cursor. En móvil, la interacción táctil se activa únicamente
en **Ver en grande**, sin capturar los gestos de desplazamiento del editor.

Los tres modos conservan fuente, alineación, tamaño, colores, fondo y textura.
Usan la silueta rellena de la fuente con su propio halo; Sombra, Contorno, Neón y
Eco 3D siguen disponibles al volver a una animación convencional. En **Movimiento → Tráiler** puedes elegir **Clásico**, **Partículas** o **Mezcla**.
Al activar Tráiler desde un efecto de partículas se conserva ese estilo; el
botón de la vista previa también permite volver a las partículas. El tráiler
alterna ensamblado, vórtice y explosión, y cierra formando el mensaje completo
con los colores originales. Cada efecto se ajusta al tiempo de su escena, con
una pausa de lectura antes del corte. Densidad y repulsión siguen disponibles.
El visor comparte el reloj del tráiler y el GIF usa las mismas duraciones;
PNG y movimiento reducido muestran el cierre completo de partículas.
**Mezcla** alterna escenas de letras y partículas y elige sus animaciones con
una semilla reproducible. **Otra mezcla** cambia la combinación; replay y el
bucle mantienen la elegida. El storyboard muestra el efecto de cada escena y
el enlace conserva la misma secuencia, también para GIF, PNG y movimiento
reducido. Incluso un mensaje de una palabra incluye ambos estilos. Los colores
y la fuente elegidos se mantienen; el cierre siempre muestra el mensaje completo.
Los enlaces anteriores conservan su coreografía clásica o de partículas.

`particleDensity` (1–3, por defecto 2), `particleInteraction` (booleano, por
defecto true), `trailerParticles` y `trailerMix` (booleanos, por defecto false)
y `trailerSeed` (entero de 0 a 4294967295, por defecto 0) viajan en el mismo enlace `#v1=`. Los enlaces anteriores conservan
su animación y reciben estos valores sin cambiar su apariencia. No se añade
ninguna dependencia, servicio, almacenamiento ni petición externa.

El motor puro de `src/particles.mjs` toma una máscara alfa creada con
`layoutText()` y las fuentes locales. Una máscara de hasta 800 píxeles por lado
mantiene la distribución independiente de la resolución de exportación y del
DPR. Las nubes tienen hasta 2.400 / 4.000 / 6.000 partículas, con posiciones,
velocidades y semilla propias. Las trayectorias se evalúan por tiempo explícito;
el muelle del puntero usa subpasos acotados y no altera la animación exportada.
Canvas agrupa el dibujo en ocho lotes de color/opacidad, sin sombras costosas
por punto. El visor dibuja como máximo a 30 fps, limita DPR a 2 y el lado del
lienzo a 2.048 píxeles. Pausa, pestaña oculta y desmontaje cancelan el reloj;
una reproducción única termina formada y detiene el dibujo cuando acaba la
interacción. Con movimiento reducido se muestra directamente el mensaje formado.

PNG usa el estado final. GIF usa las mismas trayectorias a 12 fps, con el worker,
progreso y cancelación existentes. Cada ciclo dura 7 segundos en ritmo normal,
10,15 en pausado y 4,9 en rápido; el bucle devuelve la nube a su posición inicial.
El movimiento del fondo sigue su propio ciclo, como en las demás animaciones.
Las diferencias tipográficas entre plataformas (especialmente emojis) también
pueden modificar la máscara. La repulsión del usuario no se graba en el GIF.

Validación de partículas y tráiler: **39 tests** (`npm test`), TypeScript y build
(`npm run build`). Los nueve tests nuevos cubren muestreo y trazos finos,
semillas, límites, reproducción por tiempo, convergencia, continuidad de bucles,
repulsión y recuperación, validación y enlaces antiguos, y tiempos de GIF. Siete tests adicionales verifican la coreografía y mezcla del tráiler,
la compatibilidad de enlaces y su sincronización con la exportación.
Comprobación en Chromium: escritorio, móvil emulado de 390 × 844 y 320 × 640,
las doce fuentes, texto largo/multilínea, pausa/replay, movimiento reducido,
igualdad PNG/fotograma final, exportación y cancelación. La copia creada con
`scripts/package-preview.mjs` exportó PNG y GIF de los tres modos sin conexión
ni peticiones HTTP. Los GIF de prueba a ritmo rápido tienen 59 fotogramas y
4,9 segundos, con movimiento real y bandera de bucle correcta. La prueba móvil
es emulación; queda pendiente medir consumo en teléfonos físicos de gama baja.
El tráiler de partículas también se comprobó con pausa, replay, salto de escena,
reapertura del enlace y movimiento reducido: cuatro escenas y 133 fotogramas
distintos en 11,06 segundos a ritmo rápido; PNG idéntico al cierre formado.
La mezcla se comprobó con ambos tipos de cierre, cambio de combinación, replay,
reapertura del enlace y HTML sin conexión. El GIF mixto de prueba contiene
115 fotogramas (80 distintos) en 9,58 segundos.

## Particle Galaxy 3D

Actívalo en **Movimiento → Partículas → Particle Galaxy 3D**, o elige
**Estilos → Noche y neón → Otra galaxia**. Conserva tu texto, fuente, alineación,
colores, fondo y textura. Los efectos de contorno/sombra se reservan para los
estilos clásicos. Prueba un mensaje corto sobre fondo oscuro para apreciar el halo.

Una espiral espacial se reúne en letras con caras frontales, traseras y paredes
laterales de partículas, también alrededor de los huecos interiores:
caos inicial, atracción entre aproximadamente 2 y 6 segundos, revelación y órbita
moderada, y cierre legible. El ciclo completo dura 12 segundos a ritmo normal,
8,4 en rápido y 17,4 en pausado. En bucle vuelve suavemente a la nube inicial;
sin bucle el cierre detiene el dibujo al terminar la respiración, para ahorrar GPU.
Después de la revelación puedes arrastrar para orbitar con inercia y límites,
y hacer un clic breve para dispersar/recomponer. En **Ver en grande** también
funcionan rueda y pellizco; el editor conserva el desplazamiento táctil nativo.
Los gestos se desactivan durante la entrada, pausa y movimiento reducido.

El preset «Otra galaxia» combina Anton, cian y magenta sobre azul casi negro.
Órbitas inclinadas, conexiones cristalinas dentro de los trazos, destellos,
nebulosa procedural y estrellas desenfocadas a distintas profundidades rodean
el mensaje. La atracción y la dispersión interactiva añaden estelas. Todos esos
elementos utilizan los colores elegidos y se incluyen en el renderer de exportación;
la nebulosa reduce su intensidad sobre fondos claros.

**Calidad 3D** ofrece Automática, Ligera y Alta, y **Cámara cinematográfica**
permite desactivar el recorrido automático. Automática limita el muestreo según
el tamaño y los núcleos disponibles, sin detectar marcas de dispositivos:
hasta 9.000 o 14.400 puntos tipográficos. Ligera usa hasta 7.200 y Alta hasta
18.000, además de estrellas y polvo orbital con presupuestos proporcionales.
DPR se limita a 1,75 y el lado
mayor del canvas a 2.048 píxeles en la vista. Las tres capas y el grosor relativo
a la fuente mantienen volumen incluso en formatos verticales. La máscara
canónica de 800 píxeles reutiliza `layoutText`; los puntos desplazados permanecen
dentro de píxeles opacos, preservando huecos y acentos. Los emojis dependen de
las fuentes del sistema y se convierten en siluetas, sin conservar su color original.

La escena usa Three.js `Points` y `LineSegments`, buffers persistentes y shaders
procedurales de núcleo/halo, sin luces, texturas remotas ni postprocesado.
Diez lotes dibujan la atmósfera, órbitas, estelas, letras y destellos. Las posiciones
y los uniformes se actualizan por fotograma;
la máscara y los atributos de tamaño/color se construyen una vez por escena.
Las trayectorias y cámara son funciones del tiempo y de una semilla derivada
del mensaje. Pausa y pestaña oculta suspenden el reloj; resize conserva su
progreso; replay lo reinicia. El desmontaje libera buffers, materiales, contexto,
RAF y listeners. No se crea un contexto por fotograma.

`galaxyQuality` (`auto`, `low`, `high`, por defecto `auto`), `galaxyCamera`
(booleano, por defecto `true`) y `trailerGalaxy` (booleano, por defecto `false`)
se validan y comparten en **el mismo `#v1=`**. El identificador del efecto es
`particle-galaxy`. Los enlaces anteriores reciben valores seguros y mantienen
sus animaciones y coreografías.

En **Movimiento → Tráiler**, **Galaxy 3D** usa escenas de 6,5 segundos y cierre
de 9 segundos, escalados por ritmo. **Mezcla → Incluir Galaxy 3D** alterna escenas
clásicas y 3D con la semilla existente. La vista y el GIF comparten el reloj y
las duraciones; se puede pausar, repetir y saltar de escena. Los gestos 3D están
desactivados durante el tráiler para mantener la coreografía. Cada escena monta
su renderer y lo libera al cambiar; queda abierta la mejora de reutilizar puntos
para morphing continuo entre palabras.

**PNG** renderiza el cierre 3D con su fondo. **GIF** renderiza cada fotograma
real en WebGL, lo copia inmediatamente al canvas del exportador y entrega los
píxeles al worker existente, a 12 fps y hasta 640 píxeles. El contexto de exportación
usa `preserveDrawingBuffer`; la vista no. La exportación libera el contexto al
cambiar de escena, cancelar o terminar y mantiene una sola petición pendiente al
worker. El flujo codificado tiene un límite de 48 MB: si se supera, se cancela
con un aviso para acortar el tráiler o bajar la calidad. El PNG y el último fotograma tienen la misma geometría y cámara a igual
calidad/proporción; los fondos animados mantienen la política anterior de PNG
estático. La calidad automática puede variar entre vista y exportación según su
tamaño; usa Alta o Ligera para una densidad fija. Los gestos no se exportan.

Sin WebGL2, la **vista muestra Ensamblar 2D con un aviso visible**. Una pérdida
de contexto también activa esa vista hasta que se restaure WebGL. PNG y GIF 3D
**fallan con un mensaje explícito**, sin sustituir el resultado por 2D: puedes
seleccionar Ensamblar para exportar esa alternativa. Con movimiento reducido
se muestra inmediatamente el cierre 3D estático, sin gestos; la exportación GIF
sigue siendo una acción explícita con movimiento y miniatura estática.

Dependencias añadidas: `three` 0.186.1 (MIT, licencia en `public/licenses/`),
`@types/three` y Playwright solo para desarrollo. Vite empaqueta todo localmente.
Build de referencia: renderer 3D **537,30 kB / 134,47 kB gzip**, cargado únicamente
al seleccionar o exportar 3D. El JavaScript inicial pasa de 306,84 / 97,91 kB gzip
a aproximadamente 319 / 102 kB gzip. Vite avisa del tamaño del chunk 3D; se
mantiene aislado para no descargar Three.js en los estilos clásicos. Las fuentes
ya incluidas constituyen la mayor parte del CSS y no añaden recursos nuevos.
La copia `file://` se genera con un build de módulo único para incluir también
el renderer diferido, sin modificar el build de Pages.

Pruebas reproducibles:

```sh
npm test                 # 50 tests puros, incluidos once específicos de Galaxy
npm run build            # TypeScript y producción
npx playwright install chromium
npm run test:browser     # inicia Vite local y comprueba Chromium/WebGL
# Alternativa: CHROME_PATH=/ruta/a/Chrome npm run test:browser
node scripts/package-preview.mjs /tmp/gzaas-preview.html
```

El workflow de Pages ejecuta también la suite de navegador antes de publicar.
La suite de navegador comprueba carga diferida, pausa/reanudación, replay,
igualdad PNG/fotograma final, GIF decodificado con movimiento, cancelación,
gestos, pérdida/restauración de contexto, tráiler mixto, móvil emulado,
movimiento reducido y errores explícitos de exportación sin WebGL.
Guarda capturas y un GIF en `/tmp/gzaas-galaxy-check` (configurable con
`TEST_ARTIFACTS`). No es una medición de rendimiento en teléfonos físicos.
Quedan para una siguiente iteración mediciones en móviles de gama baja y
Safari/Firefox, adaptación de calidad basada en tiempos GPU y morphing continuo.

## Créditos

Idea original: **[ojoven](https://github.com/ojoven)**, [Gzaas!](https://github.com/ojoven/gzaas). Gonzalo Ayuso colaboró en el proyecto original con la API PHP. Esta versión conserva la idea y renueva la interfaz y arquitectura. El crédito enlazado al proyecto original y a su autor aparece en la landing, el editor y el visor.

Las doce fuentes se distribuyen mediante Fontsource bajo sus correspondientes licencias OFL, copiadas a `public/licenses/` e incluidas en la demo HTML. No necesitan una petición a Google Fonts en tiempo de ejecución. lz-string: licencia MIT. React: MIT. [gifenc](https://github.com/mattdesl/gifenc): MIT; se empaqueta localmente en un worker incluido, sin CDN ni servidor de conversión. No se reutilizan marcas gráficas ni ficheros del repositorio original.

## Copia de demostración en un solo HTML

```sh
npm run build
node scripts/package-preview.mjs gzaas-preview.html
```

Abre `gzaas-preview.html` en un navegador moderno. Incluye el código, CSS y fuentes, sin CDN. Sirve para probar y descargar imágenes sin instalar Node. Los enlaces `file://` de esa copia local no sirven para compartir con otras personas: usa la versión publicada en Pages. El editor guarda automáticamente el último estado válido en `#edit:v1=...`; los enlaces para destinatarios usan `#v1=...` y abren la vista a pantalla completa.

## Validación de esta entrega

Build de producción y comprobación TypeScript correctos. Treinta y nueve tests: nueve de partículas, siete de su integración y mezcla en tráiler, tres de archivos compartidos, enlaces públicos y compatibilidad; diez del formato de URL, incluyendo todas las combinaciones de fuentes, fondos y efectos, animación, ritmo y repetición y compatibilidad con enlaces antiguos; cinco de segmentación, grafemas, secuencias, tiempos, cierre y bucles del tráiler; cinco de proporciones, fotogramas, tiempos GIF, secuencias completas y exportación estática. Revisión visual e interacción en Chrome en escritorio y móvil: colecciones, selector de fuentes, animación por letras y de fondos, pausa, repetición, visor, enlaces compartidos, créditos y movimiento reducido. Exportación GIF comprobada sin conexión desde la demo HTML: fuentes, efectos, tráiler completo, bucle, cancelación y PNG; archivos GIF decodificados para verificar fotogramas, tiempos y proporciones. El diálogo cabe sin scroll en las nueve resoluciones de escritorio y móvil revisadas. Compartir PNG y GIF con enlace comprobado con un menú nativo simulado, incluyendo activación del usuario, cancelación y descarga alternativa; no se ha enviado a WhatsApp. Metadatos sociales estáticos e imagen PNG de 1200 × 630 comprobados en el build; la tarjeta en apps de terceros se comprobará tras publicar. La integración WebMCP no se ha validado en un navegador que la implemente.

## Licencia

Código del proyecto bajo [licencia MIT](LICENSE). Las licencias de fuentes y dependencias están en [`public/licenses/`](public/licenses/).
