/* ---------- Referencias al DOM ---------- */
const visorVideo = document.getElementById('visor-camara');
const contenedorVisor = document.querySelector('.visor');
const mensajeEstado = document.getElementById('mensaje-estado');
const btnInstalar = document.getElementById('btn-instalar');
const btnPreparar = document.getElementById('btn-preparar-camara');
const btnConfirmar = document.getElementById('btn-confirmar-permiso');
const btnCancelar = document.getElementById('btn-cancelar-permiso');
const btnAlternar = document.getElementById('btn-alternar-camara');
const btnApagar = document.getElementById('btn-apagar-camara');
const avisoPermiso = document.getElementById('aviso-permiso');
const avisoLente = document.getElementById('aviso-lente');

/* ---------- Estado ---------- */
let eventoInstalacionDiferido = null;
let streamActual = null;
let modoCamaraActual = 'environment'; // 'environment' = trasera | 'user' = frontal

function nombreLente(modo) {
    return modo === 'environment' ? 'Trasera' : 'Frontal';
}

function actualizarMensajeEstado(texto, tipo) {
    mensajeEstado.textContent = texto;
    mensajeEstado.className = 'estado' + (tipo ? ' ' + tipo : '');
}

function actualizarControles() {
    const activa = streamActual !== null;
    btnAlternar.disabled = !activa;
    btnApagar.disabled = !activa;
    contenedorVisor.classList.toggle('activo', activa);
}

/* ==========================================================
    FASE 1: Instalabilidad
   ========================================================== */

// Service Worker (ruta relativa para GitHub Pages)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
        .then((registro) => {
            console.log('Service Worker activo. Scope:', registro.scope);
        })
        .catch((error) => {
            console.error('Error al registrar el Service Worker:', error);
        });
    });
}

// Android / Chrome: botón de instalación propio
window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    eventoInstalacionDiferido = event;
    btnInstalar.hidden = false;
});

btnInstalar.addEventListener('click', () => {
    if (!eventoInstalacionDiferido) {
        return;
    }
    eventoInstalacionDiferido.prompt();
    eventoInstalacionDiferido.userChoice
        .then((resultado) => {
        if (resultado.outcome === 'accepted') {
            btnInstalar.hidden = true;
        }
        })
        .catch((error) => {
        console.error('Error en la instalación:', error);
        })
        .finally(() => {
        // El evento solo se puede usar una vez
        eventoInstalacionDiferido = null;
        });
});

window.addEventListener('appinstalled', () => {
    btnInstalar.hidden = true;
    eventoInstalacionDiferido = null;
});

// iOS: no existe beforeinstallprompt -> instrucciones manuales
function verificarEntornoIOS() {
    const esIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const estaInstalada = window.navigator.standalone === true ||
        window.matchMedia('(display-mode: standalone)').matches;

    if (esIOS && !estaInstalada) {
        const guiaIOS = document.getElementById('instrucciones-ios');
        if (guiaIOS) {
        guiaIOS.hidden = false;
        }
    }
}
verificarEntornoIOS();

/* ==========================================================
    FASE 2: Cámara con pre-permiso
   ========================================================== */

// Libera el sensor antes de pedir otro flujo (obligatorio en móviles/WebKit)
function detenerCamaraActiva() {
    if (streamActual) {
        streamActual.getTracks().forEach((track) => {
        track.stop();
        });
        streamActual = null;
    }
}

function iniciarCamara(modo) {
    detenerCamaraActiva();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        actualizarMensajeEstado('Este navegador no permite acceder a la cámara (se requiere HTTPS).', 'error');
        actualizarControles();
        return Promise.resolve();
    }

    const restricciones = {
        video: { facingMode: modo },
        audio: false
    };

    actualizarMensajeEstado('Encendiendo cámara ' + nombreLente(modo).toLowerCase() + '...');

    return navigator.mediaDevices.getUserMedia(restricciones)
        .then((stream) => {
        streamActual = stream;
        modoCamaraActual = modo;
        visorVideo.srcObject = stream;
        actualizarMensajeEstado('Cámara activa (' + nombreLente(modo) + ')', 'ok');
        })
        .catch((error) => {
        visorVideo.srcObject = null;
        if (error.name === 'NotAllowedError') {
            actualizarMensajeEstado('Permiso denegado. Habilita el acceso a la cámara en los ajustes de tu navegador.', 'error');
        } else if (error.name === 'NotFoundError') {
            actualizarMensajeEstado('No se detectó el sensor de cámara solicitado en este dispositivo.', 'error');
        } else if (error.name === 'NotReadableError') {
            actualizarMensajeEstado('La cámara está en uso por otra aplicación o no se pudo liberar. Inténtalo de nuevo.', 'error');
        } else {
            actualizarMensajeEstado('Error al acceder al hardware: ' + error.message, 'error');
        }
        })
        .finally(() => {
        actualizarControles();
        });
}

// Paso 1: mostrar aviso explicativo (aún sin tocar el hardware)
btnPreparar.addEventListener('click', () => {
    avisoLente.textContent = nombreLente(modoCamaraActual).toLowerCase();
    avisoPermiso.hidden = false;
    btnConfirmar.focus();
});

// Paso 2: consentimiento consciente -> ahora sí se pide el permiso nativo
btnConfirmar.addEventListener('click', () => {
    avisoPermiso.hidden = true;
    iniciarCamara(modoCamaraActual);
});

btnCancelar.addEventListener('click', () => {
    avisoPermiso.hidden = true;
    actualizarMensajeEstado('Cámara apagada. No se solicitó ningún permiso.');
});

// Alternar lente trasera <-> frontal
btnAlternar.addEventListener('click', () => {
    const nuevoModo = modoCamaraActual === 'environment' ? 'user' : 'environment';
    iniciarCamara(nuevoModo);
});

// Apagar cámara
btnApagar.addEventListener('click', () => {
    detenerCamaraActiva();
    visorVideo.srcObject = null;
    actualizarMensajeEstado('Cámara apagada.');
    actualizarControles();
});

// Libera el hardware si la página se cierra
window.addEventListener('pagehide', detenerCamaraActiva);

actualizarControles();
