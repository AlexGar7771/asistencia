// 1. BASE DE DATOS LOCAL
let usuariosRegistrados = [
    { nombre: "Alex Garcia", contrasena: "12345", rol: "empleado" },
    { nombre: "Admin", contrasena: "admin123", rol: "administrador" }
];

// 2. SELECTORES DE PANTALLAS
const pantallaLogin = document.getElementById('pantalla-login');
const pantallaAsistencia = document.getElementById('pantalla-asistencia');
const pantallaAdmin = document.getElementById('pantalla-admin');

// Formulario Login
const formLogin = document.getElementById('form-login');
const inputNombre = document.getElementById('login-nombre');
const inputPassword = document.getElementById('login-password');

// Pantalla Asistencia
const txtFechaHoy = document.getElementById('txt-fecha-hoy');
const btnEntrada = document.getElementById('btn-entrada');
const btnSalida = document.getElementById('btn-salida');
const repEntrada = document.getElementById('rep-entrada');
const repSalida = document.getElementById('rep-salida');
const repTotal = document.getElementById('rep-total');
const repExtra = document.getElementById('rep-extra');
const btnLogout = document.getElementById('btn-logout');

// Pantalla Admin
const btnIrAdmin = document.getElementById('btn-ir-admin');
const btnAdminSalir = document.getElementById('btn-admin-salir');
const formAddUsuario = document.getElementById('form-add-usuario');
const addNombre = document.getElementById('add-nombre');
const addPassword = document.getElementById('add-password');
const listaUsuariosContenedor = document.getElementById('lista-usuarios-contenedor');

// Variables de estado en memoria
let horaEntradaGuardada = null;
let horaSalidaGuardada = null;

// 3. INICIO DE SESIÓN CON VALIDACIÓN REAL
formLogin.addEventListener('submit', function(e) {
    e.preventDefault();
    const nombreIngresado = inputNombre.value.trim();
    const passwordIngresada = inputPassword.value;

    const usuarioValido = usuariosRegistrados.find(u => 
        u.nombre.toLowerCase() === nombreIngresado.toLowerCase() && u.contrasena === passwordIngresada
    );

    if (usuarioValido) {
        if (usuarioValido.rol === 'administrador') {
            irAPantalla(pantallaAdmin);
            renderizarUsuarios();
        } else {
            irAPantalla(pantallaAsistencia);
            const opciones = { weekday: 'long', day: 'numeric', month: 'numeric' };
            txtFechaHoy.innerText = new Date().toLocaleDateString('es-ES', opciones);
        }
    } else {
        alert("❌ Nombre o contraseña incorrectos.");
    }
});

// NAVEGACIÓN ENTRE PANTALLAS
function irAPantalla(pantallaDestino) {
    pantallaLogin.classList.add('hidden');
    pantallaAsistencia.classList.add('hidden');
    pantallaAdmin.classList.add('hidden');
    pantallaDestino.classList.remove('hidden');
}

// Acceso rápido a admin
btnIrAdmin.addEventListener('click', () => {
    inputNombre.value = "Admin";
    inputPassword.value = "";
    inputPassword.focus();
    alert("🔑 Ingresa la contraseña de administrador para acceder.");
});

btnAdminSalir.addEventListener('click', cerrarSesionSistema);

// 4. REGISTRO DE ENTRADA
btnEntrada.addEventListener('click', function() {
    horaEntradaGuardada = new Date(); // Captura la hora exacta real de este instante

    const horas = String(horaEntradaGuardada.getHours()).padStart(2, '0');
    const minutos = String(horaEntradaGuardada.getMinutes()).padStart(2, '0');
    repEntrada.innerText = `${horas}:${minutos} Horas`;

    btnEntrada.disabled = true;
    btnEntrada.classList.add('opacity-50', 'cursor-not-allowed');
    
    btnSalida.disabled = false;
    btnSalida.classList.remove('opacity-50', 'cursor-not-allowed');
});

// 5. REGISTRO DE SALIDA (Max 7 horas normales, lo demás extras)
btnSalida.addEventListener('click', function() {
    horaSalidaGuardada = new Date(); // Captura la hora real de ahorita
    const horas = String(horaSalidaGuardada.getHours()).padStart(2, '0');
    const minutos = String(horaSalidaGuardada.getMinutes()).padStart(2, '0');
    repSalida.innerText = `${horas}:${minutos} Horas`;

    btnSalida.disabled = true;
    btnSalida.classList.add('opacity-50', 'cursor-not-allowed');

    const diferenciaMilisegundos = horaSalidaGuardada - horaEntradaGuardada;
    const horasTotalesCalculadas = diferenciaMilisegundos / (1000 * 60 * 60);

    let horasNormales = 0;
    let horasExtra = 0;

    if (horasTotalesCalculadas > 7) {
        horasNormales = 7;
        horasExtra = horasTotalesCalculadas - 7;
    } else {
        horasNormales = horasTotalesCalculadas;
        horasExtra = 0;
    }

    repTotal.innerText = `${horasNormales.toFixed(1)} Horas`;
    repExtra.innerText = `${horasExtra.toFixed(1)} Horas Extra`;
});

// 6. GESTIÓN DE USUARIOS (VISTA ADMINISTRADOR)
formAddUsuario.addEventListener('submit', function(e) {
    e.preventDefault();
    const nuevoNombre = addNombre.value.trim();
    const nuevaPassword = addPassword.value;

    const existe = usuariosRegistrados.some(u => u.nombre.toLowerCase() === nuevoNombre.toLowerCase());
    
    if (existe) {
        alert("⚠️ Este usuario ya está registrado.");
        return;
    }

    usuariosRegistrados.push({
        nombre: nuevoNombre,
        contrasena: nuevaPassword,
        rol: "empleado"
    });

    addNombre.value = "";
    addPassword.value = "";
    renderizarUsuarios();
});

function renderizarUsuarios() {
    listaUsuariosContenedor.innerHTML = "";
    const empleados = usuariosRegistrados.filter(u => u.rol !== 'administrador');

    if (empleados.length === 0) {
        listaUsuariosContenedor.innerHTML = `<p class="text-xs text-gray-500 italic text-center">No hay compañeros registrados.</p>`;
        return;
    }

    empleados.forEach((usuario) => {
        const div = document.createElement('div');
        div.className = "flex justify-between items-center bg-gray-800 p-2 rounded-lg border border-gray-700 text-sm";
        div.innerHTML = `
            <span class="font-medium text-gray-200">${usuario.nombre}</span>
            <button onclick="eliminarUsuario('${usuario.nombre}')" class="text-xs bg-rose-600 hover:bg-rose-500 text-white px-2 py-1 rounded transition-all">
                Eliminar
            </button>
        `;
        listaUsuariosContenedor.appendChild(div);
    });
}

window.eliminarUsuario = function(nombre) {
    if (confirm(`¿Estás seguro de que quieres eliminar a ${nombre}?`)) {
        usuariosRegistrados = usuariosRegistrados.filter(u => u.nombre !== nombre);
        renderizarUsuarios();
    }
};

// 7. CIERRE DE SESIÓN Y REINICIO
btnLogout.addEventListener('click', cerrarSesionSistema);

function cerrarSesionSistema() {
    inputNombre.value = "";
    inputPassword.value = "";
    horaEntradaGuardada = null;
    horaSalidaGuardada = null;
    
    repEntrada.innerText = '--:-- Horas';
    repSalida.innerText = '--:-- Horas';
    repTotal.innerText = '0 Horas';
    repExtra.innerText = '0 Horas';

    btnEntrada.disabled = false;
    btnEntrada.classList.remove('opacity-50', 'cursor-not-allowed');
    
    irAPantalla(pantallaLogin);
}