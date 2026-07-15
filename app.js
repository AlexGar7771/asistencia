// ==========================================
// 🔴 CONFIGURACIÓN DE CONEXIÓN CON SUPABASE
// ==========================================
const miUrl = "https://udwtfwicbwpdbxefnmth.supabase.co"; 
const miKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkd3Rmd2ljYndwZGJ4ZWZubXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwNDE4MzQsImV4cCI6MjA5OTYxNzgzNH0.GELNGbWAX2NpSuzjjfRJWH5TUlXc2l-OaXFH5vGtGdI";

const supabase = Supabase.createClient(miUrl, miKey);

let usuarioLogueado = null; 

// ==========================================
// 2. SELECTORES DE PANTALLAS Y ELEMENTOS DOM
// ==========================================
const pantallaLogin = document.getElementById('pantalla-login');
const pantallaAsistencia = document.getElementById('pantalla-asistencia');
const pantallaAdmin = document.getElementById('pantalla-admin');

const formLogin = document.getElementById('form-login');
const inputNombre = document.getElementById('login-nombre');
const inputPassword = document.getElementById('login-password');

const txtFechaHoy = document.getElementById('txt-fecha-hoy');
const btnEntrada = document.getElementById('btn-entrada');
const btnSalida = document.getElementById('btn-salida');
const repEntrada = document.getElementById('rep-entrada');
const repSalida = document.getElementById('rep-salida');
const repTotal = document.getElementById('rep-total');
const repExtra = document.getElementById('rep-extra');
const btnLogout = document.getElementById('btn-logout');

const btnIrAdmin = document.getElementById('btn-ir-admin');
const btnAdminSalir = document.getElementById('btn-admin-salir');
const formAddUsuario = document.getElementById('form-add-usuario');
const addNombre = document.getElementById('add-nombre');
const addPassword = document.getElementById('add-password');
const listaUsuariosContenedor = document.getElementById('lista-usuarios-contenedor');
const listaAsistenciasAdmin = document.getElementById('lista-asistencias-admin');

// ==========================================
// 3. INICIO DE SESIÓN CON BASE DE DATOS REAL
// ==========================================
formLogin.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const nombreIngresado = inputNombre.value.trim();
    const passwordIngresada = inputPassword.value;

    try {
        const { data: usuarioValido, error } = await supabase
            .from('usuarios')
            .select('*')
            .eq('nombre', nombreIngresado)
            .eq('contrasena', passwordIngresada)
            .maybeSingle(); 

        if (error) {
            console.error("Error en Supabase:", error);
            alert("❌ Error de conexión con la base de datos.");
            return;
        }

        if (usuarioValido) {
            usuarioLogueado = usuarioValido; 

            if (usuarioValido.rol === 'administrador') {
                irAPantalla(pantallaAdmin);
                renderizarUsuarios();
                renderizarAsistenciasAdmin(); 
            } else {
                irAPantalla(pantallaAsistencia);
                const opciones = { weekday: 'long', day: 'numeric', month: 'numeric' };
                txtFechaHoy.innerText = new Date().toLocaleDateString('es-ES', opciones);
                verificarMarcaDelDia(); 
            }
        } else {
            alert("❌ Nombre o contraseña incorrectos.");
        }

    } catch (err) {
        console.error("Error crítico:", err);
        alert("🚨 Ocurrió un error al intentar conectar con el sistema.");
    }
});

function irAPantalla(pantallaDestino) {
    pantallaLogin.classList.add('hidden');
    pantallaAsistencia.classList.add('hidden');
    pantallaAdmin.classList.add('hidden');
    pantallaDestino.classList.remove('hidden');
}

btnIrAdmin.addEventListener('click', () => {
    inputNombre.value = "Admin";
    inputPassword.value = "";
    inputPassword.focus();
    alert("🔑 Ingresa la contraseña de administrador para acceder.");
});

btnAdminSalir.addEventListener('click', cerrarSesionSistema);

// ==========================================
// 4. REGISTRO DE ENTRADA
// ==========================================
btnEntrada.addEventListener('click', async function() {
    const ahora = new Date();
    const horaEntradaTexto = ahora.toLocaleTimeString('es-ES', { hour12: false });
    const fechaHoyTexto = ahora.toISOString().split('T')[0]; 

    const { error } = await supabase
        .from('asistencias')
        .insert([{
            usuario_id: usuarioLogueado.id,
            fecha: fechaHoyTexto,
            hora_entrada: horaEntradaTexto
        }]);

    if (error) {
        alert("❌ No se pudo guardar la entrada en el servidor.");
        console.error(error);
        return;
    }

    repEntrada.innerText = `${horaEntradaTexto.slice(0, 5)} Horas`;
    btnEntrada.disabled = true;
    btnEntrada.classList.add('opacity-50', 'cursor-not-allowed');
    btnSalida.disabled = false;
    btnSalida.classList.remove('opacity-50', 'cursor-not-allowed');
});

// ==========================================
// 5. REGISTRO DE SALIDA Y CÁLCULO
// ==========================================
btnSalida.addEventListener('click', async function() {
    const ahora = new Date();
    const horaSalidaTexto = ahora.toLocaleTimeString('es-ES', { hour12: false });
    const fechaHoyTexto = ahora.toISOString().split('T')[0];

    const { data: asistenciaHoy, error: errFetch } = await supabase
        .from('asistencias')
        .select('*')
        .eq('usuario_id', usuarioLogueado.id)
        .eq('fecha', fechaHoyTexto)
        .maybeSingle();

    if (errFetch || !asistenciaHoy) {
        alert("❌ Hubo un problema al buscar tu registro de entrada.");
        return;
    }

    const entradaObj = new Date(`${fechaHoyTexto}T${asistenciaHoy.hora_entrada}`);
    const diferenciaMilisegundos = ahora - entradaObj;
    const horasTotales = diferenciaMilisegundos / (1000 * 60 * 60);

    let normales = 0;
    let extras = 0;

    if (horasTotales > 7) {
        normales = 7;
        extras = horasTotales - 7;
    } else {
        normales = horasTotales;
        extras = 0;
    }

    const { error: errUpdate } = await supabase
        .from('asistencias')
        .update({
            hora_salida: horaSalidaTexto,
            horas_normales: normales.toFixed(1),
            horas_extra: extras.toFixed(1)
        })
        .eq('id', asistenciaHoy.id);

    if (errUpdate) {
        alert("❌ No se pudo registrar tu salida.");
        return;
    }

    repSalida.innerText = `${horaSalidaTexto.slice(0, 5)} Horas`;
    repTotal.innerText = `${normales.toFixed(1)} Horas`;
    repExtra.innerText = `${extras.toFixed(1)} Horas Extra`;

    btnSalida.disabled = true;
    btnSalida.classList.add('opacity-50', 'cursor-not-allowed');
});

async function verificarMarcaDelDia() {
    const fechaHoyTexto = new Date().toISOString().split('T')[0];
    const { data: marca } = await supabase
        .from('asistencias')
        .select('*')
        .eq('usuario_id', usuarioLogueado.id)
        .eq('fecha', fechaHoyTexto)
        .maybeSingle();

    if (marca) {
        if (marca.hora_entrada) {
            repEntrada.innerText = `${marca.hora_entrada.slice(0, 5)} Horas`;
            btnEntrada.disabled = true;
            btnEntrada.classList.add('opacity-50', 'cursor-not-allowed');
            btnSalida.disabled = false;
            btnSalida.classList.remove('opacity-50', 'cursor-not-allowed');
        }
        if (marca.hora_salida) {
            repSalida.innerText = `${marca.hora_salida.slice(0, 5)} Horas`;
            repTotal.innerText = `${marca.horas_normales} Horas`;
            repExtra.innerText = `${marca.horas_extra} Horas Extra`;
            btnSalida.disabled = true;
            btnSalida.classList.add('opacity-50', 'cursor-not-allowed');
        }
    }
}

// ==========================================
// 6. GESTIÓN DE COMPAÑEROS
// ==========================================
formAddUsuario.addEventListener('submit', async function(e) {
    e.preventDefault();
    const nuevoNombre = addNombre.value.trim();
    const nuevaPassword = addPassword.value;

    const { error } = await supabase
        .from('usuarios')
        .insert([{ nombre: nuevoNombre, contrasena: nuevaPassword, rol: 'empleado' }]);

    if (error) {
        alert("⚠️ No se pudo registrar (es posible que el nombre ya exista).");
        return;
    }

    addNombre.value = "";
    addPassword.value = "";
    renderizarUsuarios();
});

async function renderizarUsuarios() {
    listaUsuariosContenedor.innerHTML = "";
    const { data: lista, error } = await supabase.from('usuarios').select('*').neq('rol', 'administrador');

    if (error || !lista || lista.length === 0) {
        listaUsuariosContenedor.innerHTML = `<p class="text-xs text-gray-500 italic text-center">No hay compañeros registrados.</p>`;
        return;
    }

    lista.forEach((usuario) => {
        const div = document.createElement('div');
        div.className = "flex justify-between items-center bg-gray-800 p-2 rounded-lg border border-gray-700 text-sm";
        div.innerHTML = `
            <span class="font-medium text-gray-200">${usuario.nombre}</span>
            <button onclick="eliminarUsuario(${usuario.id}, '${usuario.nombre}')" class="text-xs bg-rose-600 hover:bg-rose-500 text-white px-2 py-1 rounded transition-all">
                Eliminar
            </button>
        `;
        listaUsuariosContenedor.appendChild(div);
    });
}

window.eliminarUsuario = async function(id, nombre) {
    if (confirm(`¿Estás seguro de que quieres eliminar a ${nombre}?`)) {
        const { error } = await supabase.from('usuarios').delete().eq('id', id);
        if (!error) renderizarUsuarios();
    }
};

// ==========================================
// 📋 REPORTE GENERAL DE ASISTENCIAS
// ==========================================
async function renderizarAsistenciasAdmin() {
    listaAsistenciasAdmin.innerHTML = "";

    const { data: registros, error } = await supabase
        .from('asistencias')
        .select(`
            id, fecha, hora_entrada, hora_salida, horas_normales, horas_extra,
            usuarios ( nombre )
        `)
        .order('fecha', { ascending: false });

    if (error || !registros || registros.length === 0) {
        listaAsistenciasAdmin.innerHTML = `<p class="text-xs text-gray-500 italic text-center">No hay marcas registradas en el sistema.</p>`;
        return;
    }

    registros.forEach((reg) => {
        const div = document.createElement('div');
        div.className = "bg-gray-800 p-3 rounded-xl border border-gray-700/50 space-y-1 text-xs mb-2";
        
        const nombreTrabajador = reg.usuarios ? reg.usuarios.nombre : 'Usuario Eliminado';
        const salidaTexto = reg.hora_salida ? reg.hora_salida.slice(0, 5) : '--:--';

        div.innerHTML = `
            <div class="flex justify-between items-center font-semibold">
                <span class="text-cyan-400 font-bold">${nombreTrabajador}</span>
                <span class="text-gray-400">${reg.fecha}</span>
            </div>
            <div class="flex justify-between text-gray-300">
                <span>🟢 E: ${reg.hora_entrada.slice(0, 5)}</span>
                <span>🔴 S: ${salidaTexto}</span>
                <span class="text-emerald-400">⏱️ Normal: ${reg.horas_normales}h</span>
                <span class="text-amber-400">🔥 Extra: ${reg.horas_extra}h</span>
            </div>
        `;
        listaAsistenciasAdmin.appendChild(div);
    });
}

btnLogout.addEventListener('click', cerrarSesionSistema);

function cerrarSesionSistema() {
    inputNombre.value = "";
    inputPassword.value = "";
    usuarioLogueado = null;
    
    repEntrada.innerText = '--:-- Horas';
    repSalida.innerText = '--:-- Horas';
    repTotal.innerText = '0 Horas';
    repExtra.innerText = '0 Horas';

    btnEntrada.disabled = false;
    btnEntrada.classList.remove('opacity-50', 'cursor-not-allowed');
    
    irAPantalla(pantallaLogin);
}