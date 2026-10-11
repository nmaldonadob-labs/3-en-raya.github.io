// Juego online con PeerJS (https://peerjs.com): gratis, sin cuenta y sin tarjeta.
// Los dos navegadores se conectan directamente; el servidor público de PeerJS
// solo los presenta. Quien crea la sala es X y valida todas las jugadas.

const PREFIJO = "tres-en-raya-nm-"; // evita choques con otras apps en el servidor público de PeerJS

// ---------- Lógica pura del juego (igual en local y online) ----------

const LINEAS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // filas
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columnas
  [0, 4, 8], [2, 4, 6],            // diagonales
];

function tableroVacio() {
  return Array(9).fill("");
}

// Devuelve "X", "O", "empate" o "jugando"
function calcularResultado(tablero) {
  for (const [a, b, c] of LINEAS) {
    if (tablero[a] && tablero[a] === tablero[b] && tablero[a] === tablero[c]) return tablero[a];
  }
  return tablero.every(Boolean) ? "empate" : "jugando";
}

function lineaGanadora(tablero) {
  return LINEAS.find(([a, b, c]) => tablero[a] && tablero[a] === tablero[b] && tablero[a] === tablero[c]) || [];
}

// Aplica una jugada si es válida. Devuelve el nuevo estado o null.
function jugar(estado, casilla, ficha) {
  if (estado.resultado !== "jugando") return null;
  if (estado.turno !== ficha) return null;
  if (estado.tablero[casilla] !== "") return null;
  const tablero = [...estado.tablero];
  tablero[casilla] = ficha;
  return {
    tablero,
    turno: ficha === "X" ? "O" : "X",
    resultado: calcularResultado(tablero),
  };
}

// ---------- Interfaz ----------

const $ = (id) => document.getElementById(id);
const casillas = [];

for (let i = 0; i < 9; i++) {
  const boton = document.createElement("button");
  boton.className = "casilla";
  boton.addEventListener("click", () => alTocarCasilla(i));
  $("tablero").appendChild(boton);
  casillas.push(boton);
}

function dibujar(estado, miFicha, textoInfo) {
  const ganadoras = lineaGanadora(estado.tablero);
  estado.tablero.forEach((valor, i) => {
    casillas[i].textContent = valor;
    casillas[i].className = "casilla " + valor + (ganadoras.includes(i) ? " ganadora" : "");
    casillas[i].disabled = valor !== "" || estado.resultado !== "jugando" || (miFicha && estado.turno !== miFicha);
  });

  $("info").textContent = textoInfo;

  let texto;
  if (estado.resultado === "empate") texto = "¡Empate!";
  else if (estado.resultado !== "jugando") texto = miFicha ? (estado.resultado === miFicha ? "¡Ganaste! 🎉" : "Perdiste 😅") : `¡Gana ${estado.resultado}!`;
  else texto = miFicha ? (estado.turno === miFicha ? "Tu turno" : "Turno del rival…") : `Turno de ${estado.turno}`;
  $("estado").textContent = texto;

  $("btn-revancha").hidden = estado.resultado === "jugando";
}

// ---------- Modo local (dos jugadores en la misma pantalla) ----------

let modo = null;
let estadoLocal = null;
let iniciaLocal = "X";

function empezarLocal() {
  modo = "local";
  estadoLocal = { tablero: tableroVacio(), turno: "X", resultado: "jugando" };
  mostrarJuego();
  dibujar(estadoLocal, null, "Partida en esta pantalla");
}

// ---------- Modo online (PeerJS) ----------

let peer = null;
let conexion = null;
let soyAnfitrion = false;
let miFicha = null;
let estadoOnline = null;
let iniciaOnline = "X";

function codigoAleatorio() {
  const letras = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 5 }, () => letras[Math.floor(Math.random() * letras.length)]).join("");
}

function empezarOnline() {
  modo = "online";
  mostrarJuego();
  const codigo = location.hash.startsWith("#r=") ? location.hash.slice(3).toUpperCase() : null;
  if (codigo) unirseASala(codigo);
  else crearSala();
}

// El anfitrión (X) crea la sala y espera al rival
function crearSala() {
  soyAnfitrion = true;
  miFicha = "X";
  const codigo = codigoAleatorio();
  $("info").textContent = "Creando sala…";
  peer = new Peer(PREFIJO + codigo);

  peer.on("open", () => {
    history.replaceState(null, "", "#r=" + codigo);
    $("enlace").value = location.origin + location.pathname + "#r=" + codigo;
    $("compartir").hidden = false;
    estadoOnline = { tablero: tableroVacio(), turno: "X", resultado: "jugando" };
    dibujarOnline();
  });

  peer.on("connection", (nueva) => {
    if (conexion && conexion.open) {
      nueva.on("open", () => { nueva.send({ tipo: "llena" }); setTimeout(() => nueva.close(), 500); });
      return;
    }
    conexion = nueva;
    conexion.on("open", () => {
      ultimoLatido = Date.now();
      $("compartir").hidden = true;
      enviarEstado();
      dibujarOnline();
    });
    conexion.on("data", (msg) => {
      if (conexion !== nueva) return;
      ultimoLatido = Date.now();
      if (msg.tipo === "jugada") {
        const nuevo = jugar(estadoOnline, msg.casilla, "O");
        if (nuevo) { estadoOnline = nuevo; enviarEstado(); dibujarOnline(); }
      } else if (msg.tipo === "revancha") {
        reiniciarOnline();
      }
    });
    conexion.on("close", () => { if (conexion === nueva) rivalSeFue(); });
  });

  peer.on("error", (e) => {
    if (e.type === "unavailable-id") { peer.destroy(); crearSala(); } // código ya usado: probar otro
    else $("info").textContent = "Error de conexión: " + e.type;
  });
}

// El invitado (O) se conecta a la sala del enlace
function unirseASala(codigo) {
  soyAnfitrion = false;
  miFicha = "O";
  $("info").textContent = "Conectando con la sala " + codigo + "…";
  peer = new Peer();

  peer.on("open", () => {
    conexion = peer.connect(PREFIJO + codigo, { reliable: true });
    conexion.on("open", () => (ultimoLatido = Date.now()));
    conexion.on("data", (msg) => {
      ultimoLatido = Date.now();
      if (msg.tipo === "estado") { estadoOnline = msg.estado; dibujarOnline(); }
      else if (msg.tipo === "llena") {
        conexion = null; // no somos parte de esta partida
        $("info").textContent = "Esta sala ya tiene dos jugadores.";
      }
    });
    conexion.on("close", rivalSeFue);
  });

  peer.on("error", (e) => {
    $("info").textContent = e.type === "peer-unavailable"
      ? "La sala no existe o tu rival cerró la página."
      : "Error de conexión: " + e.type;
  });
}

// Latido: cada lado avisa que sigue ahí. Si el rival calla 6 s, se fue
// (cerrar la pestaña no siempre avisa a tiempo por sí solo).
let ultimoLatido = 0;
setInterval(() => {
  if (!conexion || !conexion.open) return;
  conexion.send({ tipo: "latido" });
  if (Date.now() - ultimoLatido > 6000) { conexion.close(); rivalSeFue(); }
}, 2000);

function enviarEstado() {
  if (conexion && conexion.open) conexion.send({ tipo: "estado", estado: estadoOnline });
}

function reiniciarOnline() {
  if (estadoOnline.resultado === "jugando") return;
  iniciaOnline = iniciaOnline === "X" ? "O" : "X";
  estadoOnline = { tablero: tableroVacio(), turno: iniciaOnline, resultado: "jugando" };
  enviarEstado();
  dibujarOnline();
}

function rivalSeFue() {
  if (!conexion) return;
  conexion = null;
  $("info").textContent = "Tu rival se desconectó.";
  casillas.forEach((c) => (c.disabled = true));
  $("btn-revancha").hidden = true;
  if (soyAnfitrion) {
    $("compartir").hidden = false; // puede entrar otro rival con el mismo enlace
    estadoOnline = { tablero: tableroVacio(), turno: "X", resultado: "jugando" };
    iniciaOnline = "X";
  }
}

function dibujarOnline() {
  const hayRival = conexion && conexion.open;
  if (!estadoOnline || !hayRival) {
    if (estadoOnline) dibujar(estadoOnline, miFicha, `Eres ${miFicha}. Esperando rival…`);
    casillas.forEach((c) => (c.disabled = true));
    $("estado").textContent = "";
    $("btn-revancha").hidden = true;
    return;
  }
  dibujar(estadoOnline, miFicha, `Eres ${miFicha}`);
}

// ---------- Eventos ----------

function alTocarCasilla(i) {
  if (modo === "local") {
    const nuevo = jugar(estadoLocal, i, estadoLocal.turno);
    if (!nuevo) return;
    estadoLocal = nuevo;
    dibujar(estadoLocal, null, "Partida en esta pantalla");
  } else if (modo === "online") {
    if (soyAnfitrion) {
      const nuevo = jugar(estadoOnline, i, "X");
      if (nuevo) { estadoOnline = nuevo; enviarEstado(); dibujarOnline(); }
    } else if (conexion && conexion.open) {
      conexion.send({ tipo: "jugada", casilla: i });
    }
  }
}

$("btn-revancha").addEventListener("click", () => {
  if (modo === "local") {
    iniciaLocal = iniciaLocal === "X" ? "O" : "X"; // se alterna quién empieza
    estadoLocal = { tablero: tableroVacio(), turno: iniciaLocal, resultado: "jugando" };
    dibujar(estadoLocal, null, "Partida en esta pantalla");
  } else if (soyAnfitrion) {
    reiniciarOnline();
  } else if (conexion && conexion.open) {
    conexion.send({ tipo: "revancha" });
  }
});

$("btn-copiar").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText($("enlace").value);
    $("btn-copiar").textContent = "¡Copiado!";
  } catch {
    $("enlace").select();
  }
});

$("btn-local").addEventListener("click", empezarLocal);
$("btn-online").addEventListener("click", empezarOnline);

function mostrarJuego() {
  $("menu").hidden = true;
  $("juego").hidden = false;
}

// Si se abrió un enlace de invitación (#r=CODIGO), entrar directo a la sala
if (location.hash.startsWith("#r=")) empezarOnline();
