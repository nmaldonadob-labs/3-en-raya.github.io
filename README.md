# Tres en raya online

Tres en raya para dos jugadores, publicado en GitHub Pages y conectado en tiempo real con [PeerJS](https://peerjs.com). PeerJS es gratis y no pide cuenta, tarjeta ni configuración.

## Archivos
- `index.html`: la página y el tablero.
- `style.css`: estilos.
- `game.js`: lógica del juego (modo en la misma pantalla y modo online).

## Publicar
1. Crea un repositorio en GitHub y sube los tres archivos.
2. En el repositorio, ve a **Settings → Pages → Branch: main / (root) → Save**.
3. Abre `https://TU_USUARIO.github.io/TU_REPO/`, pulsa **Crear partida online** y envía el enlace a tu rival.

## Cómo funciona
- Quien crea la sala juega con **X**. Quien abre el enlace juega con **O**.
- Los dos navegadores se conectan directamente. El servidor público de PeerJS solo sirve para que se encuentren.
- El navegador de X guarda el tablero y valida cada jugada (turno y casilla libre) antes de enviarla al rival. Así no puede haber jugadas dobles.
- Si un tercero abre el enlace, ve el aviso "Esta sala ya tiene dos jugadores".
- Si el rival cierra la página, el aviso aparece en unos segundos y el enlace sigue sirviendo para otro rival.
- La sala existe mientras quien la creó tenga la página abierta.

## Limitación
En algunas redes muy cerradas (algunas redes de empresa o de colegio) la conexión directa puede fallar. En casa y con datos móviles suele funcionar bien.
