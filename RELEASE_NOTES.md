# v1.0.0 — Dilo a lo grande, también en tu móvil

gzaas! 1.0 permite crear mensajes a toda pantalla, animarlos y compartirlos mediante enlaces, imágenes o GIF. Ahora también puedes instalar la aplicación en el móvil.

**Aplicación:** https://gonzalo123.github.io/gzaas2/

Novedades desde v0.1.0:

- Instalación como PWA en Android y ayuda para añadirla a la pantalla de inicio en iPhone/iPad. Disponible sin conexión tras preparar la caché en la primera visita.
- Editor adaptable a móvil y escritorio, más fuentes y estilos, fondos animados y efectos de texto de React Bits.
- Animaciones de partículas, Galaxy 3D y modo tráiler, con pausa, repetición y opciones de movimiento reducido.
- Exportación PNG y GIF, compartir archivos mediante el menú del dispositivo cuando sea compatible y códigos QR para abrir los mensajes en otro dispositivo.
- Enlaces compactos v2, manteniendo la compatibilidad con v1; recuperación de enlaces dañados y página 404 propia.
- Interfaz en español e inglés, con detección inicial y selección de idioma.

El archivo adjunto **gzaas-preview.html** contiene una demo autónoma con código, fuentes y licencias. Se puede abrir sin instalar Node. Para instalar la PWA o compartir enlaces con otras personas, utiliza la aplicación publicada; esas funciones no están disponibles desde una dirección local `file://`.

Validación: 72 pruebas unitarias, TypeScript, build de producción y suite de navegador de GitHub Actions. Las pruebas de PWA comprueban los requisitos de instalación en Chromium, caché sin conexión, actualizaciones, rutas y ayuda para iPhone. La instalación nativa en dispositivos físicos y WebMCP siguen pendientes de validación.

El código propio conserva la licencia MIT. Las adaptaciones de React Bits conservan MIT + Commons Clause; las licencias de terceros están incluidas.
