# Meow Meow Cat Cam

Detector de gestos en el navegador: enciende la cámara, haz un gesto y te aparece el meme de gato que le corresponde al lado de tu cámara. Todo corre en tu dispositivo con [MediaPipe](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker) (manos y cara), sin servidor.

La pantalla se divide en dos:
- **Cámara**: tu imagen (en espejo) con el debug encima.
- **Meme**: el meme del gesto que estás haciendo.

En el celular en vertical, la cámara queda arriba y el meme abajo.

## Gestos

| # | Gesto | Cómo se activa | Meme |
|---|---|---|---|
| 1 | Dedos juntos (muehehe) | Dos manos con solo el índice extendido y las puntas casi tocándose | `uwucat`, `uwucatt`, `fingers together muehehe` (al azar) |
| 2 | Gato devastado | Dos manos cerca de la cara y **por encima** de la parte superior de la cabeza | `two hands on head` |
| 3 | Gato crash out | Dos manos cerca de la cara, a los lados, **sin** pasar de la cabeza | `crashout cat` |
| 4 | Puño | Una mano con los cuatro dedos doblados | `punchcat` |
| 5 | Rockstar | Pulgar y meñique extendidos, el resto doblado | `cat` |
| 6 | Shhh | Solo el índice extendido, con la punta sobre la boca | `shhcat` |
| 7 | Un dedo arriba | Solo el índice extendido, lejos de la boca | `profcat`, `professorcat` (al azar) |
| 8 | Dedo medio | Solo el dedo medio extendido (en cualquiera de las dos manos) | `middle-finger` |
| 9 | Gato secuestrado | Una mano, con cualquier forma, justo donde estaba tu cara (la tapa) | `hand cover face` |
| 10 | No tengo monises | Una palma abierta con los cuatro dedos extendidos, lejos de la cara | `hand stretched out, palm facing up` |
| 11 | Side eye | Gira la cabeza a un lado (más de 15°), con o sin manos a la vista | `side eye cat` |
| 12 | Por defecto | Nada en particular, manos abajo | `pokercat` |

### Prioridad

Si un gesto cumple varias reglas a la vez, gana el primero de esta lista:

1. Dedo medio
2. Dedos juntos (dos manos)
3. Manos en la cabeza / crash out (dos manos)
4. Puño
5. Rockstar
6. Shhh / un dedo arriba
7. Mano cubriendo la cara
8. Palma abierta
9. Side eye (si no hay una mano haciendo algo más específico)
10. Por defecto

Para evitar parpadeos, un gesto tiene que mantenerse unos 5 frames seguidos antes de que cambie el meme. Si dejas de hacer gestos, vuelve al meme por defecto en menos de un segundo.

## Cómo usarlo

La cámara solo funciona con **HTTPS** (o `localhost`). No funciona abriendo `index.html` directamente como archivo (`file://`).

- **En línea**: con GitHub Pages abre `https://TU_USUARIO.github.io/mxvdgit-utility/meowmeowcatcam/` y acepta el permiso de cámara.
- **En local**, desde la carpeta de este proyecto:

  ```bash
  python3 -m http.server 8000
  ```

  y abre `http://localhost:8000`.

La primera vez se descargan la librería y los modelos desde internet (jsDelivr y Google), así que hace falta conexión.

## Debug

Sobre la cámara se dibuja:

- Los 21 puntos de cada mano y su esqueleto.
- Un círculo en cada punta de dedo: **verde** si el dedo está extendido, **rojo** si está doblado.
- Un punto en la boca: **azul** si la cara se detecta ahora, **naranja** si es una posición guardada de hace un momento.
- Un círculo punteado alrededor de la boca (zona de "shhh") y una línea punteada a la altura de la cabeza (zona de "manos en la cabeza").

En el texto de arriba a la izquierda aparece el gesto activo, el gesto crudo de ese frame, la racha de estabilidad, los FPS, el estado de cada dedo (▲ extendido, ▼ doblado), las distancias que usan las reglas y el ángulo de giro de la cabeza.

- **Tocar la cámara** (o pulsar `D` en el PC) oculta o muestra el debug.
- Abrir la página con `?debug=0` al final de la URL la inicia con el debug oculto.

## Ajustar la sensibilidad

Los umbrales están al inicio de `script.js`:

| Constante | Qué controla |
|---|---|
| `STABLE_FRAMES_REQUIRED` | Frames seguidos que debe durar un gesto para activarse |
| `DEFAULT_FALLBACK_MS` | Tiempo sin gestos antes de volver al meme por defecto |
| `SIDE_EYE_YAW_DEG` | Grados que hay que girar la cabeza para el side eye |
| `HAND_COVER_FACE_DIST_FACE_LOST` / `HAND_COVER_FACE_DIST_FACE_SEEN` | Qué tan cerca de la cara debe estar la mano para contar como "tapando" |

Otros umbrales viven dentro de las funciones: el ángulo `45` de `fingerExtended()` (qué tan recto debe estar un dedo para contar como extendido), `1.05` para el pulgar, `1.4` para las puntas juntas y `0.55` para el shhh.

## Memes

Las imágenes están en `memes/`. Para cambiar un meme o añadir variantes, edita `GESTURE_MEMES` al inicio de `script.js`; si un gesto tiene varias imágenes, se elige una al azar cada vez que se activa.

En la carpeta hay imágenes que todavía no están asignadas a ningún gesto: `huh`, `iunno cat`, `laugh and point` y `side eye`.

## Archivos

```
index.html   interfaz
script.js    detección de gestos (MediaPipe tasks-vision)
style.css    estilos
memes/       imágenes de los memes
```
