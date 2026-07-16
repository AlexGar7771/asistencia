// ==========================================
// 🔴 CONFIGURACIÓN DE CONEXIÓN CON SUPABASE
// ==========================================
const miUrl = "https://udwtfwicbwpdbxefnmth.supabase.co"; 
const miKey = "sb_publishable_S582CVeyAW6QzN_5RwTXRA_cFBxQloI";

const clienteSupabase = supabase.createClient(miUrl, miKey);

let usuarioLogueado = null; 

// ==========================================
// 🕒 RELOJ LOCAL (SOLUCIÓN DEL TIMEZONE Y MEDIANOCHE)
// ==========================================
// Función para la fecha exacta
function obtenerFechaLocal() {
    const ahora = new Date();
    const año = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
}

// NUEVA FUNCIÓN: Obliga a la hora a tener siempre 2 dígitos (ej: 00:03:00) para evitar el NaN
function obtenerHoraLocal() {
    const ahora = new Date();
    const h = String(ahora.getHours()).padStart(2, '0');
    const m = String(ahora.getMinutes()).padStart(2, '0');
    const s = String(ahora.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
}

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
const displayTimer = document.getElementById('display-timer');
const timerNumeros = document.getElementById('timer-numeros');
let intervaloTimer = null; 

// ==========================================
// 3. INICIO DE SESIÓN 
// ==========================================
formLogin.addEventListener('submit', async function(e) {
    e.preventDefault(); 
    
    const nombreIngresado = inputNombre.value.trim();
    const passwordIngresada = inputPassword.value;

    try {
        const { data: usuarioValido, error } = await clienteSupabase
            .from('usuarios')
            .select('*')
            .eq('nombre', nombreIngresado)
            .eq('contrasena', passwordIngresada)
            .maybeSingle(); 

        if (error) {
            alert(`❌ Error de conexión: ${error.message}`);
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
        alert(`🚨 Error del sistema: ${err.message || err}`);
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
// ⏱️ LÓGICA DEL CRONÓMETRO EN TIEMPO REAL
// ==========================================
function iniciarTimer(horaEntradaTexto) {
    displayTimer.classList.remove('hidden');
    const fechaHoy = obtenerFechaLocal();
    
    // 🛠️ PARCHE ANTI-NaN: Si la hora viene sin el 0 inicial, se lo ponemos a la fuerza
    const horaArreglada = horaEntradaTexto.padStart(8, '0');
    
    const tiempoInicio = new Date(`${fechaHoy}T${horaArreglada}`).getTime();

    if (intervaloTimer) clearInterval(intervaloTimer);

    intervaloTimer = setInterval(() => {
        const ahora = new Date().getTime();
        const diferencia = ahora - tiempoInicio;

        const horas = Math.floor((diferencia % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60));
        const segundos = Math.floor((diferencia % (1000 * 60)) / 1000);

        const h = String(horas).padStart(2, '0');
        const m = String(minutos).padStart(2, '0');
        const s = String(segundos).padStart(2, '0');

        timerNumeros.innerText = `${h}:${m}:${s}`;
    }, 1000);
}

function detenerTimer() {
    if (intervaloTimer) clearInterval(intervaloTimer);
}

// ==========================================
// 4. REGISTRO DE ENTRADA 
// ==========================================
btnEntrada.addEventListener('click', async function() {
    const horaEntradaTexto = obtenerHoraLocal(); // <-- FIX APLICADO AQUÍ
    const fechaHoyTexto = obtenerFechaLocal(); 

    iniciarTimer(horaEntradaTexto); 

    const { error } = await clienteSupabase
        .from('asistencias')
        .insert([{
            usuario_id: usuarioLogueado.id,
            fecha: fechaHoyTexto,
            hora_entrada: horaEntradaTexto
        }]);

    if (error) {
        alert("❌ No se pudo guardar la entrada en el servidor.");
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
    detenerTimer();
    const horaSalidaTexto = obtenerHoraLocal(); // <-- FIX APLICADO AQUÍ
    const fechaHoyTexto = obtenerFechaLocal(); 

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

    // 🛠️ PARCHE ANTI-NaN TAMBIÉN PARA EL CÁLCULO DE HORAS TOTALES
    const horaArreglada = asistenciaHoy.hora_entrada.padStart(8, '0');
    const entradaObj = new Date(`${fechaHoyTexto}T${horaArreglada}`);
    const ahora = new Date();
    
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
    const fechaHoyTexto = obtenerFechaLocal(); 
    
    const { data: marca } = await clienteSupabase
        .from('asistencias')
        .select('*')
        .eq('usuario_id', usuarioLogueado.id)
        .eq('fecha', fechaHoyTexto)
        .maybeSingle();

    if (marca) {
        if (marca.hora_entrada && !marca.hora_salida) {
            repEntrada.innerText = `${marca.hora_entrada.slice(0, 5)} Horas`;
            btnEntrada.disabled = true;
            btnEntrada.classList.add('opacity-50', 'cursor-not-allowed');
            btnSalida.disabled = false;
            btnSalida.classList.remove('opacity-50', 'cursor-not-allowed');
            
            iniciarTimer(marca.hora_entrada); 
        }
        else if (marca.hora_entrada && marca.hora_salida) {
            repEntrada.innerText = `${marca.hora_entrada.slice(0, 5)} Horas`;
            repSalida.innerText = `${marca.hora_salida.slice(0, 5)} Horas`;
            repTotal.innerText = `${marca.horas_normales} Horas`;
            repExtra.innerText = `${marca.horas_extra} Horas Extra`;
            
            btnEntrada.disabled = true;
            btnEntrada.classList.add('opacity-50', 'cursor-not-allowed');
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
// 📋 REPORTE GENERAL DE ASISTENCIAS (ADMIN)
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

    const reporteAgrupado = {};

    registros.forEach((reg) => {
        const nombreTrabajador = reg.usuarios ? reg.usuarios.nombre : 'Usuario Eliminado';
        
        if (!reporteAgrupado[nombreTrabajador]) {
            reporteAgrupado[nombreTrabajador] = {
                diasTrabajados: 0,
                totalNormales: 0,
                totalExtras: 0,
                detalles: []
            };
        }
        
        reporteAgrupado[nombreTrabajador].diasTrabajados += 1;
        reporteAgrupado[nombreTrabajador].totalNormales += parseFloat(reg.horas_normales || 0);
        reporteAgrupado[nombreTrabajador].totalExtras += parseFloat(reg.horas_extra || 0);
        
        reporteAgrupado[nombreTrabajador].detalles.push(reg);
    });

    for (const [nombre, datos] of Object.entries(reporteAgrupado)) {
        const divUsuario = document.createElement('div');
        divUsuario.className = "bg-gray-800 p-4 rounded-xl border border-gray-700 mb-4";
        
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
    detenerTimer();
    displayTimer.classList.add('hidden');
    
    irAPantalla(pantallaLogin);
}

// ==========================================
// 7. MÓDULO DE REPORTES Y PESTAÑAS (ADMIN)
// ==========================================
const tabGestion = document.getElementById('tab-gestion');
const tabReportes = document.getElementById('tab-reportes');
const adminGestion = document.getElementById('admin-gestion');
const adminReportes = document.getElementById('admin-reportes');

const filtroInicio = document.getElementById('filtro-inicio');
const filtroFin = document.getElementById('filtro-fin');
const btnGenerarReporte = document.getElementById('btn-generar-reporte');
const btnImprimir = document.getElementById('btn-imprimir');
const areaImpresion = document.getElementById('area-impresion');
const tablaReporteBody = document.getElementById('tabla-reporte-body');
const rangoImpresion = document.getElementById('rango-impresion');

// Cambiar de Pestañas
tabGestion.addEventListener('click', () => {
    adminGestion.classList.remove('hidden');
    adminReportes.classList.add('hidden');
    // Estilos de pestaña activa
    tabGestion.classList.replace('bg-gray-800', 'bg-cyan-600');
    tabGestion.classList.replace('text-gray-400', 'text-white');
    tabReportes.classList.replace('bg-cyan-600', 'bg-gray-800');
    tabReportes.classList.replace('text-white', 'text-gray-400');
});

tabReportes.addEventListener('click', () => {
    adminReportes.classList.remove('hidden');
    adminGestion.classList.add('hidden');
    // Estilos de pestaña activa
    tabReportes.classList.replace('bg-gray-800', 'bg-cyan-600');
    tabReportes.classList.replace('text-gray-400', 'text-white');
    tabGestion.classList.replace('bg-cyan-600', 'bg-gray-800');
    tabGestion.classList.replace('text-white', 'text-gray-400');
});

// Lógica para Generar el Reporte de Quincena
btnGenerarReporte.addEventListener('click', async () => {
    const inicio = filtroInicio.value;
    const fin = filtroFin.value;

    if (!inicio || !fin) {
        alert("⚠️ Por favor selecciona ambas fechas para la quincena.");
        return;
    }

    // Buscamos en Supabase filtrando por el rango de fechas (gte = Mayor o igual / lte = Menor o igual)
    const { data: registros, error } = await clienteSupabase
        .from('asistencias')
        .select(`horas_normales, horas_extra, usuarios(nombre)`)
        .gte('fecha', inicio)
        .lte('fecha', fin);

    if (error || !registros || registros.length === 0) {
        alert("No se encontraron registros en estas fechas.");
        areaImpresion.classList.add('hidden');
        btnImprimir.classList.add('hidden');
        return;
    }

    // Agrupamos y sumamos
    const resumen = {};
    registros.forEach(reg => {
        const nombre = reg.usuarios ? reg.usuarios.nombre : 'Eliminado';
        if (!resumen[nombre]) {
            resumen[nombre] = { dias: 0, normales: 0, extras: 0 };
        }
        resumen[nombre].dias += 1;
        resumen[nombre].normales += parseFloat(reg.horas_normales || 0);
        resumen[nombre].extras += parseFloat(reg.horas_extra || 0);
    });

    // Dibujamos la tabla
    tablaReporteBody.innerHTML = "";
    for (const [nombre, datos] of Object.entries(resumen)) {
        tablaReporteBody.innerHTML += `
            <tr class="border-b border-gray-300">
                <td class="p-2 border border-gray-400 font-bold">${nombre}</td>
                <td class="p-2 border border-gray-400 text-center">${datos.dias}</td>
                <td class="p-2 border border-gray-400 text-center">${datos.normales.toFixed(1)} h</td>
                <td class="p-2 border border-gray-400 text-center">${datos.extras.toFixed(1)} h</td>
            </tr>
        `;
    }

    rangoImpresion.innerText = `Período: ${inicio} al ${fin}`;
    areaImpresion.classList.remove('hidden');
    btnImprimir.classList.remove('hidden');
});

// Disparar orden de impresión
btnImprimir.addEventListener('click', () => {
    window.print();
});