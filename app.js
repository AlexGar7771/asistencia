// ==========================================
// 1. CONFIGURACIÓN DE CONEXIÓN CON base de datos
// ==========================================
const miUrl = "https://udwtfwicbwpdbxefnmth.supabase.co"; 
const miKey = "sb_publishable_S582CVeyAW6QzN_5RwTXRA_cFBxQloI";

const clienteSupabase = supabase.createClient(miUrl, miKey);

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

    console.log("Intentando iniciar sesión para:", nombreIngresado);

    try {
        const { data: usuarioValido, error } = await clienteSupabase
            .from('usuarios')
            .select('*')
            .eq('nombre', nombreIngresado)
            .eq('contrasena', passwordIngresada)
            .maybeSingle(); 

        if (error) {
            console.error("Error devuelto por Supabase:", error);
            alert(`❌ Error de conexión: ${error.message}`);
            return;
        }

        if (usuarioValido) {
            usuarioLogueado = usuarioValido; 
            console.log("Usuario verificado correctamente:", usuarioValido);

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
            alert(" Nombre o contraseña incorrectos.");
        }

    } catch (err) {
        console.error("Fallo crítico del navegador capturado:", err);
        alert(`Error del sistema: ${err.message || err}`);
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

    const { error } = await clienteSupabase
        .from('asistencias')
        .insert([{
            usuario_id: usuarioLogueado.id,
            fecha: fechaHoyTexto,
            hora_entrada: horaEntradaTexto
        }]);

    if (error) {
        alert("No se pudo guardar la entrada en el servidor.");
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
// 5. REGISTRO DE SALIDA Y CÁLCULO EN LA NUBE
// ==========================================
btnSalida.addEventListener('click', async function() {
    const ahora = new Date();
    const horaSalidaTexto = ahora.toLocaleTimeString('es-ES', { hour12: false });
    const fechaHoyTexto = ahora.toISOString().split('T')[0];

    const { data: asistenciaHoy, error: errFetch } = await clienteSupabase
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

    const { error: errUpdate } = await clienteSupabase
        .from('asistencias')
        .update({
            hora_salida: horaSalidaTexto,
            horas_normales: normales.toFixed(1),
            horas_extra: extras.toFixed(1)
        })
        .eq('id', asistenciaHoy.id);

    if (errUpdate) {
        alert(" No se pudo registrar tu salida.");
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
    const { data: marca } = await clienteSupabase
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
// 6. GESTIÓN DE USUARIOS
// ==========================================
formAddUsuario.addEventListener('submit', async function(e) {
    e.preventDefault();
    const nuevoNombre = addNombre.value.trim();
    const nuevaPassword = addPassword.value;

    const { error } = await clienteSupabase
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
    const { data: lista, error } = await clienteSupabase.from('usuarios').select('*').neq('rol', 'administrador');

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
        const { error } = await clienteSupabase.from('usuarios').delete().eq('id', id);
        if (!error) renderizarUsuarios();
    }
};

// ==========================================
// 7. REPORTE GENERAL DE ASISTENCIAS (ADMIN) HORAS VISUALES
// ==========================================
async function renderizarAsistenciasAdmin() {
    listaAsistenciasAdmin.innerHTML = "";

    const { data: registros, error } = await clienteSupabase
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

    // 1. Agrupar los datos por usuario
    const reporteAgrupado = {};

    registros.forEach((reg) => {
        const nombreTrabajador = reg.usuarios ? reg.usuarios.nombre : 'Usuario Eliminado';
        
        // Si el usuario no existe en nuestro objeto, lo creamos
        if (!reporteAgrupado[nombreTrabajador]) {
            reporteAgrupado[nombreTrabajador] = {
                diasTrabajados: 0,
                totalNormales: 0,
                totalExtras: 0,
                detalles: []
            };
        }
        
        // Suma DE TOTALES 
        reporteAgrupado[nombreTrabajador].diasTrabajados += 1;
        reporteAgrupado[nombreTrabajador].totalNormales += parseFloat(reg.horas_normales || 0);
        reporteAgrupado[nombreTrabajador].totalExtras += parseFloat(reg.horas_extra || 0);
        
        // Guardamos el día específico para el desglose
        reporteAgrupado[nombreTrabajador].detalles.push(reg);
    });

    // 2. Renderizar las tarjetas por usuario
    for (const [nombre, datos] of Object.entries(reporteAgrupado)) {
        const divUsuario = document.createElement('div');
        divUsuario.className = "bg-gray-800 p-4 rounded-xl border border-gray-700 mb-4";
        
        // Cabecera con el resumen total del usuario
        let htmlContenido = `
            <div class="border-b border-gray-600 pb-2 mb-3">
                <h3 class="text-lg font-bold text-cyan-400">${nombre}</h3>
                <div class="flex justify-between text-xs mt-1 text-gray-300">
                    <span class="bg-gray-700 px-2 py-1 rounded">📅 ${datos.diasTrabajados} Días</span>
                    <span class="bg-emerald-900/50 text-emerald-400 px-2 py-1 rounded">⏱️ ${datos.totalNormales.toFixed(1)}h Normales</span>
                    <span class="bg-amber-900/50 text-amber-400 px-2 py-1 rounded">🔥 ${datos.totalExtras.toFixed(1)}h Extras</span>
                </div>
            </div>
            <div class="space-y-2">
        `;

        // Desglose de cada día trabajado
        datos.detalles.forEach(reg => {
            const salidaTexto = reg.hora_salida ? reg.hora_salida.slice(0, 5) : '--:--';
            htmlContenido += `
                <div class="flex justify-between items-center text-xs bg-gray-900 p-2 rounded border border-gray-700/50">
                    <span class="text-gray-400 w-20">${reg.fecha}</span>
                    <span class="text-gray-300">E: ${reg.hora_entrada.slice(0, 5)}</span>
                    <span class="text-gray-300">S: ${salidaTexto}</span>
                    <span class="text-emerald-500 font-semibold">${reg.horas_normales || 0}h</span>
                </div>
            `;
        });

        htmlContenido += `</div>`;
        divUsuario.innerHTML = htmlContenido;
        listaAsistenciasAdmin.appendChild(divUsuario);
    }
}