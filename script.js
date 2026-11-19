// objeto central pa manejar todo el estado de la app en un solo sitio
const estadoPomodoro = {
    modoActual: 'trabajo', // puede ser 'trabajo', 'corto' o 'largo'
    tiemposConfigurados: {
        trabajo: 25,
        corto: 5,
        largo: 15
    },
    segundosRestantes: 25 * 60,
    estaCorriendo: false,
    sesionesCompletadas: 0,
    idIntervalo: null
};

// referencias a los elementos del DOM
const pantallaReloj = document.getElementById('pantalla-reloj');
const etiquetaEstado = document.getElementById('etiqueta-estado-actual');
const contadorSesionesEl = document.getElementById('contador-sesiones');
const botonIniciarPausar = document.getElementById('boton-iniciar-pausar');
const botonReiniciar = document.getElementById('boton-reiniciar');
const botonSaltar = document.getElementById('boton-saltar');
const botonesModo = document.querySelectorAll('.boton-modo');
const formularioTiempos = document.getElementById('formulario-tiempos');

// funcion pa generar un pitido limpio usando Web Audio API (no necesita archivos mp3 externos)
function reproducirSonidoAlerta() {
    try {
        const contextoAudio = new (window.AudioContext || window.webkitAudioContext)();
        const oscilador = contextoAudio.createOscillator();
        const ganancia = contextoAudio.createGain();

        oscilador.type = 'sine';
        oscilador.frequency.setValueAtTime(587.33, contextoAudio.currentTime); // nota Re5
        oscilador.frequency.exponentialRampToValueAtTime(880, contextoAudio.currentTime + 0.15); // sube a La5

        ganancia.gain.setValueAtTime(0.25, contextoAudio.currentTime);
        ganancia.gain.exponentialRampToValueAtTime(0.001, contextoAudio.currentTime + 0.6);

        oscilador.connect(ganancia);
        ganancia.connect(contextoAudio.destination);

        oscilador.start();
        oscilador.stop(contextoAudio.currentTime + 0.6);
    } catch (error) {
        console.warn('El navegador bloqueo el sonido automatico:', error);
    }
}

// convierte los segundos totales a formato MM:SS y actualiza la pestaña del navegador
function actualizarPantallaReloj() {
    const minutos = Math.floor(estadoPomodoro.segundosRestantes / 60);
    const segundos = estadoPomodoro.segundosRestantes % 60;

    // padStart asegura que siempre tenga 2 digitos (ej: 05:09)
    const textoFormateado = `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
    
    pantallaReloj.textContent = textoFormateado;
    document.title = `${textoFormateado} - Enfoque Pomodoro`;
}

// cambia el modo actual, actualiza colores, pestañas y resetea el reloj
function cambiarModo(nuevoModo) {
    pausarTemporizador();
    estadoPomodoro.modoActual = nuevoModo;
    estadoPomodoro.segundosRestantes = estadoPomodoro.tiemposConfigurados[nuevoModo] * 60;

    // cambio la clase del body pa que cambien los colores CSS
    document.body.className = `tema-${nuevoModo}`;

    // actualizo el texto descriptivo
    const nombresModo = {
        trabajo: 'Sesión de Trabajo',
        corto: 'Descanso Corto',
        largo: 'Descanso Largo'
    };
    etiquetaEstado.textContent = nombresModo[nuevoModo];

    // actualizo cual pestaña se ve activa y su atributo ARIA
    botonesModo.forEach((boton) => {
        const esActivo = boton.dataset.modo === nuevoModo;
        boton.classList.toggle('activo', esActivo);
        boton.setAttribute('aria-selected', esActivo);
    });

    actualizarPantallaReloj();
}

// arranca el conteo regresivo cada segundo
function iniciarTemporizador() {
    if (estadoPomodoro.estaCorriendo) return;

    estadoPomodoro.estaCorriendo = true;
    botonIniciarPausar.textContent = 'Pausar';

    estadoPomodoro.idIntervalo = setInterval(() => {
        if (estadoPomodoro.segundosRestantes > 0) {
            estadoPomodoro.segundosRestantes--;
            actualizarPantallaReloj();
        } else {
            finalizarSesionActual();
        }
    }, 1000);
}

// detiene el intervalo sin borrar el tiempo que lleva
function pausarTemporizador() {
    estadoPomodoro.estaCorriendo = false;
    clearInterval(estadoPomodoro.idIntervalo);
    botonIniciarPausar.textContent = 'Iniciar';
}

// logica automatica cuando el reloj llega a 00:00
function finalizarSesionActual() {
    pausarTemporizador();
    reproducirSonidoAlerta();

    if (estadoPomodoro.modoActual === 'trabajo') {
        estadoPomodoro.sesionesCompletadas++;
        contadorSesionesEl.textContent = estadoPomodoro.sesionesCompletadas;

        // cada 4 sesiones de trabajo toca descanso largo, si no descanso corto
        if (estadoPomodoro.sesionesCompletadas % 4 === 0) {
            cambiarModo('largo');
        } else {
            cambiarModo('corto');
        }
    } else {
        // si venia de cualquier descanso, vuelve a trabajar
        cambiarModo('trabajo');
    }
}

// eventos de los botones principales
botonIniciarPausar.addEventListener('click', () => {
    if (estadoPomodoro.estaCorriendo) {
        pausarTemporizador();
    } else {
        iniciarTemporizador();
    }
});

botonReiniciar.addEventListener('click', () => {
    pausarTemporizador();
    estadoPomodoro.segundosRestantes = estadoPomodoro.tiemposConfigurados[estadoPomodoro.modoActual] * 60;
    actualizarPantallaReloj();
});

botonSaltar.addEventListener('click', () => {
    finalizarSesionActual();
});

// eventos pa las pestañas superiores
botonesModo.forEach((boton) => {
    boton.addEventListener('click', () => {
        cambiarModo(boton.dataset.modo);
    });
});

// guardar los nuevos minutos configurados por el usuario
formularioTiempos.addEventListener('submit', (evento) => {
    evento.preventDefault();

    const nuevoTrabajo = parseInt(document.getElementById('input-trabajo').value, 10);
    const nuevoCorto = parseInt(document.getElementById('input-corto').value, 10);
    const nuevoLargo = parseInt(document.getElementById('input-largo').value, 10);

    if (nuevoTrabajo > 0 && nuevoCorto > 0 && nuevoLargo > 0) {
        estadoPomodoro.tiemposConfigurados.trabajo = nuevoTrabajo;
        estadoPomodoro.tiemposConfigurados.corto = nuevoCorto;
        estadoPomodoro.tiemposConfigurados.largo = nuevoLargo;

        // reinicio el modo actual pa que tome el nuevo tiempo de una vez
        cambiarModo(estadoPomodoro.modoActual);
    }
});

// navegacion por teclado (Espacio pa iniciar/pausar, R pa reiniciar)
document.addEventListener('keydown', (evento) => {
    // si el usuario esta escribiendo dentro de un input numerico, no activo atajos
    if (evento.target.tagName === 'INPUT') return;

    if (evento.code === 'Space') {
        evento.preventDefault();
        botonIniciarPausar.click();
    } else if (evento.key.toLowerCase() === 'r') {
        botonReiniciar.click();
    }
});

// arranco mostrando el tiempo inicial
actualizarPantallaReloj();