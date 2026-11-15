// ==========================================
// CONEXIÓN CON SUPABASE
// ==========================================
const miUrl = "https://udwtfwicbwpdbxefnmth.supabase.co"; 
const miKey = "sb_publishable_S582CVeyAW6QzN_5RwTXRA_cFBxQloI";
const clienteSupabase = supabase.createClient(miUrl, miKey);

let usuarioLogueado = null; 

// ==========================================
// UTILIDADES DE FECHAS Y SEMANAS ISO
// ==========================================
function obtenerFechaLocal() {
    const ahora = new Date();
    return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;
}

function obtenerHoraLocal() {
    const ahora = new Date();
    return `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}:${String(ahora.getSeconds()).padStart(2, '0')}`;
}

function obtenerSemanaDeFecha(fechaInput = new Date()) {
    const d = typeof fechaInput === 'string' ? new Date(`${fechaInput}T12:00:00`) : new Date(fechaInput);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const week1 = new Date(d.getFullYear(), 0, 4);
    const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function obtenerSemanaActual() {
    return obtenerSemanaDeFecha(new Date());
}

function obtenerFechasDeSemana(semanaStr) {
    const [yearStr, weekStr] = semanaStr.split('-W');
    const year = parseInt(yearStr, 10);
    const week = parseInt(weekStr, 10);
    
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dow = simple.getDay();
    const ISOweekStart = simple;
    if (dow <= 4) ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());

    const diasNombres = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const claves = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    const resultado = [];

    for (let i = 0; i < 7; i++) {
        const fechaDia = new Date(ISOweekStart);
        fechaDia.setDate(ISOweekStart.getDate() + i);
        const iso = `${fechaDia.getFullYear()}-${String(fechaDia.getMonth() + 1).padStart(2, '0')}-${String(fechaDia.getDate()).padStart(2, '0')}`;
        const corta = `${String(fechaDia.getDate()).padStart(2, '0')}/${String(fechaDia.getMonth() + 1).padStart(2, '0')}`;
        resultado.push({ nombre: diasNombres[i], clave: claves[i], iso: iso, corta: corta });
    }
    return resultado;
}

// ==========================================
// CATÁLOGO DE TURNOS
// ==========================================
let TURNOS = [
    { id: '', text: 'Sin asignar', horas: 0, color: 'bg-rose-950/40 text-rose-300 border-rose-800/60', tipo: 'NA' },
    { id: 'Descanso', text: 'Descanso', horas: 0, color: 'bg-slate-900 text-slate-500 border-slate-800', tipo: 'NA' },
    { id: '6:30 a 13:30', text: '6:30 a 13:30', horas: 7, color: 'bg-emerald-950/50 text-emerald-300 border-emerald-800/60', tipo: 'AM' },
    { id: '7:00 a 14:00', text: '7:00 a 14:00', horas: 7, color: 'bg-emerald-950/50 text-emerald-300 border-emerald-800/60', tipo: 'AM' },
    { id: '7:00 a 15:00', text: '7:00 a 15:00', horas: 8, color: 'bg-emerald-950/50 text-emerald-300 border-emerald-800/60', tipo: 'AM' },
    { id: '13:30 a 20:30', text: '13:30 a 20:30', horas: 7, color: 'bg-blue-950/50 text-blue-300 border-blue-800/60', tipo: 'PM' },
    { id: '15:00 a 22:00', text: '15:00 a 22:00', horas: 7, color: 'bg-indigo-950/50 text-indigo-300 border-indigo-800/60', tipo: 'PM' },
    { id: '16:00 a 22:00', text: '16:00 a 22:00', horas: 6, color: 'bg-indigo-950/50 text-indigo-300 border-indigo-800/60', tipo: 'PM' }
];

const turnosGuardados = JSON.parse(localStorage.getItem('turnos_custom')) || [];
TURNOS = TURNOS.concat(turnosGuardados);

const pantallaLogin = document.getElementById('pantalla-login');
const pantallaAsistencia = document.getElementById('pantalla-asistencia');
const pantallaAdmin = document.getElementById('pantalla-admin');
const displayTimer = document.getElementById('display-timer');
const timerNumeros = document.getElementById('timer-numeros');
let intervaloTimer = null; 

// ==========================================
// 1. LOGIN Y PERFIL
// ==========================================
document.getElementById('form-login').addEventListener('submit', async function(e) {
    e.preventDefault(); 
    const nombre = document.getElementById('login-nombre').value.trim();
    const pass = document.getElementById('login-password').value;

    try {
        const { data: user, error } = await clienteSupabase.from('usuarios').select('*').eq('nombre', nombre).eq('contrasena', pass).maybeSingle(); 
        if (error) return alert(`Error de conexión: ${error.message}`);

        if (user) {
            usuarioLogueado = user; 
            pantallaLogin.classList.add('hidden');

            if (user.rol === 'administrador') {
                pantallaAdmin.classList.remove('hidden');
                renderizarUsuarios();
                cargarTableroPlanificador();
            } else {
                pantallaAsistencia.classList.remove('hidden');
                document.getElementById('txt-nombre-perfil').innerText = user.nombre;
                document.getElementById('avatar-iniciales').innerText = user.nombre.substring(0, 2).toUpperCase();
                document.getElementById('txt-mi-cargo').innerText = user.cargo || 'General';
                document.getElementById('txt-fecha-hoy').innerText = new Date().toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
                verificarMarcaDelDia(); 
                cargarResumenYHorarioUsuario(); 
            }
        } else {
            alert("Usuario o contraseña incorrectos.");
        }
    } catch (err) { alert(`Error: ${err.message || err}`); }
});

document.getElementById('btn-ir-admin').addEventListener('click', () => { document.getElementById('login-nombre').value = "Admin"; document.getElementById('login-password').value = ""; document.getElementById('login-password').focus(); });
document.getElementById('btn-admin-salir').addEventListener('click', () => location.reload());
document.getElementById('btn-logout').addEventListener('click', () => location.reload());

// ==========================================
// 2. ASISTENCIA Y CRONÓMETRO
// ==========================================
function iniciarTimer(horaEntradaTexto) {
    displayTimer.classList.remove('hidden');
    const tiempoInicio = new Date(`${obtenerFechaLocal()}T${horaEntradaTexto.padStart(8, '0')}`).getTime();
    if (intervaloTimer) clearInterval(intervaloTimer);
    intervaloTimer = setInterval(() => {
        const diff = new Date().getTime() - tiempoInicio;
        const h = String(Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))).padStart(2, '0');
        const m = String(Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
        const s = String(Math.floor((diff % (1000 * 60)) / 1000)).padStart(2, '0');
        timerNumeros.innerText = `${h}:${m}:${s}`;
    }, 1000);
}
function detenerTimer() { if (intervaloTimer) clearInterval(intervaloTimer); }

document.getElementById('btn-entrada').addEventListener('click', async function() {
    const btnE = document.getElementById('btn-entrada'); const btnS = document.getElementById('btn-salida');
    const hora = obtenerHoraLocal(); const fecha = obtenerFechaLocal(); 
    iniciarTimer(hora); 
    const { error } = await clienteSupabase.from('asistencias').insert([{ usuario_id: usuarioLogueado.id, fecha: fecha, hora_entrada: hora }]);
    if (error) return alert("Error al registrar entrada.");
    document.getElementById('rep-entrada').innerText = hora.slice(0, 5);
    btnE.disabled = true; btnE.classList.add('opacity-40', 'cursor-not-allowed');
    btnS.disabled = false; btnS.classList.remove('opacity-40', 'cursor-not-allowed');
});

document.getElementById('btn-salida').addEventListener('click', async function() {
    detenerTimer(); const horaS = obtenerHoraLocal(); const fecha = obtenerFechaLocal(); 
    const btnS = document.getElementById('btn-salida');
    const { data: asis } = await clienteSupabase.from('asistencias').select('*').eq('usuario_id', usuarioLogueado.id).eq('fecha', fecha).maybeSingle();
    
    const diff = new Date() - new Date(`${fecha}T${asis.hora_entrada.padStart(8, '0')}`);
    const hTotal = diff / (1000 * 60 * 60);
    const normales = hTotal > 7 ? 7 : hTotal; const extras = hTotal > 7 ? hTotal - 7 : 0;

    await clienteSupabase.from('asistencias').update({ hora_salida: horaS, horas_normales: normales.toFixed(1), horas_extra: extras.toFixed(1) }).eq('id', asis.id);
    document.getElementById('rep-salida').innerText = horaS.slice(0, 5);
    document.getElementById('rep-total').innerText = `${normales.toFixed(1)} h`; 
    document.getElementById('rep-extra').innerText = `${extras.toFixed(1)} h`;
    btnS.disabled = true; btnS.classList.add('opacity-40', 'cursor-not-allowed');
    
    // Actualizar los totales semanales y globales al marcar salida
    cargarResumenYHorarioUsuario();
});

async function verificarMarcaDelDia() {
    const { data: marca } = await clienteSupabase.from('asistencias').select('*').eq('usuario_id', usuarioLogueado.id).eq('fecha', obtenerFechaLocal()).maybeSingle();
    const btnE = document.getElementById('btn-entrada'); const btnS = document.getElementById('btn-salida');
    if (marca) {
        if (marca.hora_entrada && !marca.hora_salida) {
            document.getElementById('rep-entrada').innerText = marca.hora_entrada.slice(0, 5);
            btnE.disabled = true; btnE.classList.add('opacity-40', 'cursor-not-allowed');
            btnS.disabled = false; btnS.classList.remove('opacity-40', 'cursor-not-allowed');
            iniciarTimer(marca.hora_entrada); 
        } else if (marca.hora_entrada && marca.hora_salida) {
            document.getElementById('rep-entrada').innerText = marca.hora_entrada.slice(0, 5); 
            document.getElementById('rep-salida').innerText = marca.hora_salida.slice(0, 5);
            document.getElementById('rep-total').innerText = `${marca.horas_normales} h`; 
            document.getElementById('rep-extra').innerText = `${marca.horas_extra} h`;
            btnE.disabled = true; btnE.classList.add('opacity-40', 'cursor-not-allowed'); 
            btnS.disabled = true; btnS.classList.add('opacity-40', 'cursor-not-allowed');
        }
    }
}

// ==========================================
// 3. VISTA TRABAJADOR: BALANCE DE HORAS, SEMANAS Y HORARIO
// ==========================================
let marcasAgrupadasCache = {};

async function cargarResumenYHorarioUsuario() {
    const semanaActual = obtenerSemanaActual();
    document.getElementById('badge-semana-usuario').innerText = semanaActual;

    // 1. Obtener horario planificado de la semana actual
    const { data: horario } = await clienteSupabase.from('horarios').select('*').eq('usuario_id', usuarioLogueado.id).eq('semana', semanaActual).maybeSingle();
    
    // 2. Obtener todas las asistencias históricas del usuario
    const { data: todasMarcas } = await clienteSupabase.from('asistencias').select('*').eq('usuario_id', usuarioLogueado.id).order('fecha', { ascending: false });

    // Calcular totales globales y agrupar por semana
    let totalGlobalNormales = 0;
    let totalGlobalExtras = 0;
    marcasAgrupadasCache = {};

    if (todasMarcas) {
        todasMarcas.forEach(m => {
            const norm = parseFloat(m.horas_normales || 0);
            const ext = parseFloat(m.horas_extra || 0);
            totalGlobalNormales += norm;
            totalGlobalExtras += ext;

            const sem = obtenerSemanaDeFecha(m.fecha);
            if (!marcasAgrupadasCache[sem]) {
                marcasAgrupadasCache[sem] = { normales: 0, extras: 0, registros: [] };
            }
            marcasAgrupadasCache[sem].normales += norm;
            marcasAgrupadasCache[sem].extras += ext;
            marcasAgrupadasCache[sem].registros.push(m);
        });
    }

    // Mostrar Totales Globales
    const sumaTotalGlobal = totalGlobalNormales + totalGlobalExtras;
    document.getElementById('tot-hist-normales').innerText = `${totalGlobalNormales.toFixed(1)} h`;
    document.getElementById('tot-hist-extras').innerText = `${totalGlobalExtras.toFixed(1)} h`;
    document.getElementById('tot-hist-global').innerText = `${sumaTotalGlobal.toFixed(1)} h`;

    // Mostrar Balance de la Semana Actual
    const datosSemanaActual = marcasAgrupadasCache[semanaActual] || { normales: 0, extras: 0 };
    const totalSemanaHecho = datosSemanaActual.normales + datosSemanaActual.extras;
    
    document.getElementById('badge-semana-horas').innerText = `Esta semana: ${totalSemanaHecho.toFixed(1)} h`;
    document.getElementById('sem-horas-detalle').innerText = `${datosSemanaActual.normales.toFixed(1)} h normales · ${datosSemanaActual.extras.toFixed(1)} h extras`;

    // Calcular horas meta planificadas para esta semana
    let horasPlanificadas = 0;
    if (horario) {
        ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'].forEach(d => {
            const tObj = TURNOS.find(t => t.id === horario[d]);
            if (tObj) horasPlanificadas += tObj.horas;
        });
        horasPlanificadas += parseFloat(horario.extras || 0);
    }
    document.getElementById('sem-horas-meta').innerText = `${horasPlanificadas} h`;

    // Renderizar Lista Vertical de Días de la Semana
    const cont = document.getElementById('mi-horario-semana');
    if (horario) {
        const fechasSemana = obtenerFechasDeSemana(semanaActual);
        const hoyISO = obtenerFechaLocal();

        cont.innerHTML = fechasSemana.map(diaObj => {
            const turno = horario[diaObj.clave] || 'Sin asignar';
            const esHoy = diaObj.iso === hoyISO;
            const yaPaso = diaObj.iso < hoyISO;
            const esDescanso = turno.toLowerCase() === 'descanso';

            let estiloFila = "bg-slate-900 border-slate-800 text-slate-200";
            let badgeEstado = "";

            if (esHoy) {
                estiloFila = "bg-blue-950/40 border-blue-500/50 text-white";
                badgeEstado = `<span class="text-[10px] font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">Hoy</span>`;
            } else if (yaPaso) {
                estiloFila = "bg-slate-900/40 border-slate-800/50 text-slate-500";
                badgeEstado = `<span class="text-[11px] text-emerald-500/70 font-bold" title="Día completado">✓</span>`;
            }

            const colorTurno = esDescanso ? "text-slate-500" : (yaPaso ? "text-slate-400" : "text-slate-100 font-semibold");

            return `
                <div class="flex items-center justify-between px-3 py-2.5 rounded-lg border ${estiloFila} transition-colors">
                    <div class="flex items-center gap-2.5">
                        <span class="text-xs font-medium w-20">${diaObj.nombre}</span>
                        <span class="text-[11px] font-mono text-slate-500">${diaObj.corta}</span>
                    </div>
                    <div class="flex items-center gap-2.5">
                        <span class="text-xs font-mono ${colorTurno}">${turno}</span>
                        ${badgeEstado}
                    </div>
                </div>
            `;
        }).join('');
    } else {
        cont.innerHTML = `<div class="text-center text-slate-500 text-xs py-4 bg-slate-900/50 rounded-lg border border-slate-800">Aún no se han publicado horarios para esta semana.</div>`;
    }
}

// Renderizar Historial Agrupado por Semana
document.getElementById('btn-ver-historial').addEventListener('click', () => {
    document.getElementById('contenedor-historial').classList.remove('hidden');
    const lista = document.getElementById('lista-mi-historial');
    const semanasKeys = Object.keys(marcasAgrupadasCache).sort((a, b) => b.localeCompare(a));

    if (semanasKeys.length === 0) {
        lista.innerHTML = `<p class="text-center text-slate-500 text-xs py-3">No hay registros anteriores.</p>`;
        return;
    }

    lista.innerHTML = semanasKeys.map(sem => {
        const grupo = marcasAgrupadasCache[sem];
        const fechasSem = obtenerFechasDeSemana(sem);
        const rangoTexto = `${fechasSem[0].corta} al ${fechasSem[6].corta}`;
        const totalSem = grupo.normales + grupo.extras;

        const filasDias = grupo.registros.map(m => `
            <div class="flex justify-between items-center bg-slate-950/60 px-2.5 py-1.5 rounded border border-slate-800/60 text-[11px]">
                <span class="text-slate-400 font-mono">${m.fecha}</span>
                <span class="text-slate-300 font-mono">${m.hora_entrada?.slice(0,5)||'--'} - ${m.hora_salida?.slice(0,5)||'--'}</span>
                <div class="font-mono text-right">
                    <span class="text-blue-400 font-semibold">${m.horas_normales||0}h</span>
                    ${parseFloat(m.horas_extra || 0) > 0 ? `<span class="text-amber-400 ml-1">+${m.horas_extra}h ext</span>` : ''}
                </div>
            </div>
        `).join('');

        return `
            <div class="bg-slate-900 rounded-lg border border-slate-800 p-3 space-y-2">
                <div class="flex justify-between items-center border-b border-slate-800 pb-1.5">
                    <div>
                        <span class="font-mono font-bold text-white text-xs">${sem}</span>
                        <span class="text-[10px] text-slate-500 ml-1.5">(${rangoTexto})</span>
                    </div>
                    <div class="text-right font-mono text-[11px]">
                        <span class="text-emerald-400 font-semibold">${totalSem.toFixed(1)} h tot</span>
                        <span class="text-slate-500 block text-[10px]">${grupo.normales.toFixed(1)}n · ${grupo.extras.toFixed(1)}e</span>
                    </div>
                </div>
                <div class="space-y-1">
                    ${filasDias}
                </div>
            </div>
        `;
    }).join('');
});

document.getElementById('btn-cerrar-historial').addEventListener('click', () => document.getElementById('contenedor-historial').classList.add('hidden'));

// ==========================================
// 4. ADMIN: PESTAÑAS Y USUARIOS
// ==========================================
const tabs = ['gestion', 'horarios', 'reportes'];
tabs.forEach(tab => {
    document.getElementById(`tab-${tab}`).addEventListener('click', () => {
        tabs.forEach(t => {
            document.getElementById(`tab-${t}`).className = 'text-slate-400 hover:text-white px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors';
            document.getElementById(`admin-${t}`).classList.add('hidden');
        });
        document.getElementById(`tab-${tab}`).className = 'bg-slate-800 text-white px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors';
        document.getElementById(`admin-${tab}`).classList.remove('hidden');
    });
});

document.getElementById('form-add-usuario').addEventListener('submit', async function(e) {
    e.preventDefault();
    const payload = { nombre: document.getElementById('add-nombre').value.trim(), contrasena: document.getElementById('add-password').value, cargo: document.getElementById('add-cargo').value, rol: 'empleado' };
    const { error } = await clienteSupabase.from('usuarios').insert([payload]);
    if (!error) { document.getElementById('form-add-usuario').reset(); renderizarUsuarios(); cargarTableroPlanificador(); }
});

async function renderizarUsuarios() {
    const contenedor = document.getElementById('lista-usuarios-contenedor'); contenedor.innerHTML = "";
    const { data: lista } = await clienteSupabase.from('usuarios').select('*').neq('rol', 'administrador').order('nombre');
    if (lista) lista.forEach((u) => {
        const cargoActual = u.cargo || 'General';
        contenedor.innerHTML += `
            <div class="flex justify-between items-center bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-xs">
                <div class="flex items-center gap-2">
                    <span class="font-medium text-white">${u.nombre}</span>
                    <select onchange="actualizarCargoUsuario(${u.id}, this.value)" class="text-[11px] bg-slate-950 border border-slate-700 text-slate-300 rounded px-2 py-0.5 outline-none focus:border-blue-500 cursor-pointer">
                        <option value="General" ${cargoActual === 'General' ? 'selected' : ''}>General</option>
                        <option value="Cocinero" ${cargoActual === 'Cocinero' ? 'selected' : ''}>Cocinero</option>
                        <option value="Lavaplatos" ${cargoActual === 'Lavaplatos' ? 'selected' : ''}>Lavaplatos</option>
                    </select>
                </div>
                <button onclick="eliminarUsuario(${u.id})" class="text-slate-500 hover:text-rose-400 px-2 py-1 rounded transition-colors" title="Eliminar">Eliminar</button>
            </div>`;
    });
}
window.actualizarCargoUsuario = async function(id, nuevoCargo) { await clienteSupabase.from('usuarios').update({ cargo: nuevoCargo }).eq('id', id); cargarTableroPlanificador(); };
window.eliminarUsuario = async function(id) { if (confirm(`¿Eliminar este empleado del sistema?`)) { await clienteSupabase.from('usuarios').delete().eq('id', id); renderizarUsuarios(); cargarTableroPlanificador(); } };

// ==========================================
// 5. ADMIN: TABLERO INTELIGENTE
// ==========================================
document.getElementById('btn-crear-turno').addEventListener('click', () => {
    const texto = document.getElementById('nuevo-turno-texto').value.trim();
    const horas = parseFloat(document.getElementById('nuevo-turno-horas').value);
    const tipo = document.getElementById('nuevo-turno-tipo').value;

    if (!texto || isNaN(horas)) return alert("Ingresa el rango de horas y la duración.");
    if (TURNOS.find(t => t.id === texto)) return alert("Ese turno ya existe.");

    const nt = { id: texto, text: texto, horas: horas, color: tipo==='AM'?'bg-emerald-950/50 text-emerald-300 border-emerald-800/60':'bg-indigo-950/50 text-indigo-300 border-indigo-800/60', tipo: tipo };
    TURNOS.push(nt);
    const g = JSON.parse(localStorage.getItem('turnos_custom')) || []; g.push(nt); localStorage.setItem('turnos_custom', JSON.stringify(g));
    document.getElementById('nuevo-turno-texto').value = ''; document.getElementById('nuevo-turno-horas').value = '';
    cargarTableroPlanificador();
});

const inputSemanaGlobal = document.getElementById('horario-semana-global');
const bodyPlanificador = document.getElementById('body-planificador');
const alertasPanel = document.getElementById('alertas-turnos');

let usuariosCachados = [];
let estadoOriginalActual = [];

inputSemanaGlobal.addEventListener('change', cargarTableroPlanificador);

async function cargarTableroPlanificador() {
    if(!inputSemanaGlobal.value) inputSemanaGlobal.value = obtenerSemanaActual();
    const semana = inputSemanaGlobal.value;
    
    const fechas = obtenerFechasDeSemana(semana);
    document.getElementById('subtitulo-fechas-semana').innerText = `Del ${fechas[0].nombre} ${fechas[0].corta} al ${fechas[6].nombre} ${fechas[6].corta}`;
    
    const ths = document.querySelectorAll('#thead-dias-fechas th[data-col-day]');
    ths.forEach((th, idx) => {
        th.innerHTML = `${fechas[idx].nombre} <span class="block text-[10px] font-mono text-slate-400 font-normal">${fechas[idx].corta}</span>`;
    });

    bodyPlanificador.innerHTML = `<tr><td colspan="10" class="text-center py-6 text-slate-500">Cargando planificación...</td></tr>`;

    const { data: usuarios } = await clienteSupabase.from('usuarios').select('*').neq('rol', 'administrador').order('nombre');
    usuariosCachados = usuarios || [];
    
    const { data: horarios } = await clienteSupabase.from('horarios').select('*').eq('semana', semana);
    estadoOriginalActual = horarios ? JSON.parse(JSON.stringify(horarios)) : [];
    
    document.getElementById('btn-deshacer').classList.add('hidden');

    const { data: todasSemanas } = await clienteSupabase.from('horarios').select('semana');
    const selectImportar = document.getElementById('select-importar-semana');
    if (todasSemanas) {
        const unicas = [...new Set(todasSemanas.map(s => s.semana))].filter(s => s !== semana).sort((a,b) => b.localeCompare(a));
        selectImportar.innerHTML = `<option value="">Plantilla anterior...</option>` + unicas.map(s => `<option value="${s}">${s}</option>`).join('');
    }

    renderizarFilasTablero(estadoOriginalActual);
}

function renderizarFilasTablero(horariosDataVisual) {
    bodyPlanificador.innerHTML = '';
    
    usuariosCachados.forEach(user => {
        const horVisual = horariosDataVisual.find(h => h.usuario_id === user.id) || {};
        const horOriginalDB = estadoOriginalActual.find(h => h.usuario_id === user.id) || {};
        
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-900/50 transition-colors user-row';
        tr.dataset.userId = user.id; 
        tr.dataset.userName = user.nombre;
        tr.dataset.horarioId = horOriginalDB.id || ''; 
        tr.dataset.cargo = user.cargo || 'General'; 
        
        const genSelect = (day, val) => {
            const opcionesHTML = TURNOS.map(t => `<option value="${t.id}" data-horas="${t.horas}" ${val === t.id ? 'selected' : ''}>${t.text}</option>`).join('');
            const tObj = TURNOS.find(t => t.id === (val||'')) || TURNOS[0];
            return `<select class="day-select font-mono text-[11px] w-[108px] p-1.5 rounded border outline-none appearance-none cursor-pointer text-center font-medium transition-colors ${tObj.color}" data-day="${day}">${opcionesHTML}</select>`;
        };
        
        tr.innerHTML = `
            <td class="p-2.5 font-medium text-white sticky left-0 bg-slate-950 border-r border-slate-800 z-10 leading-tight">
                ${user.nombre} <span class="block text-[10px] text-slate-400 font-normal">${user.cargo||'General'}</span>
            </td>
            <td class="p-1.5 text-center">${genSelect('lunes', horVisual.lunes)}</td>
            <td class="p-1.5 text-center">${genSelect('martes', horVisual.martes)}</td>
            <td class="p-1.5 text-center">${genSelect('miercoles', horVisual.miercoles)}</td>
            <td class="p-1.5 text-center">${genSelect('jueves', horVisual.jueves)}</td>
            <td class="p-1.5 text-center">${genSelect('viernes', horVisual.viernes)}</td>
            <td class="p-1.5 text-center">${genSelect('sabado', horVisual.sabado)}</td>
            <td class="p-1.5 text-center">${genSelect('domingo', horVisual.domingo)}</td>
            <td class="p-1.5 text-center">
                <input type="number" min="0" step="0.5" class="extra-hours font-mono w-14 bg-slate-900 border border-slate-700 text-amber-400 text-center rounded p-1 text-xs font-medium outline-none focus:border-amber-500" value="${horVisual.extras || 0}">
            </td>
            <td class="p-2.5 text-center font-mono text-xs total-cell">0h</td>
        `;
        bodyPlanificador.appendChild(tr);
    });
    
    document.querySelectorAll('.user-row').forEach(row => recalcularFila(row));
    validarCoberturaTurnos();
}

bodyPlanificador.addEventListener('change', (e) => {
    if (e.target.classList.contains('day-select')) {
        const tObj = TURNOS.find(t => t.id === e.target.value) || TURNOS[0];
        e.target.className = `day-select font-mono text-[11px] w-[108px] p-1.5 rounded border outline-none appearance-none cursor-pointer text-center font-medium transition-colors ${tObj.color}`;
    }
    if (e.target.classList.contains('day-select') || e.target.classList.contains('extra-hours')) {
        recalcularFila(e.target.closest('tr'));
        validarCoberturaTurnos(); 
        document.getElementById('btn-deshacer').classList.remove('hidden');
    }
});

function recalcularFila(tr) {
    let suma = 0;
    tr.querySelectorAll('.day-select').forEach(sel => { const tObj = TURNOS.find(t => t.id === sel.value); if(tObj) suma += tObj.horas; });
    suma += parseFloat(tr.querySelector('.extra-hours').value) || 0;
    
    const celdaTotal = tr.querySelector('.total-cell'); celdaTotal.innerText = `${suma}h`;
    
    if (suma < 42) celdaTotal.className = 'p-2.5 text-center font-mono font-semibold text-xs total-cell text-amber-400';
    else if (suma >= 42 && suma <= 44) celdaTotal.className = 'p-2.5 text-center font-mono font-semibold text-xs total-cell text-emerald-400';
    else celdaTotal.className = 'p-2.5 text-center font-mono font-semibold text-xs total-cell text-rose-400';
}

function validarCoberturaTurnos() {
    alertasPanel.innerHTML = ""; const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']; const errores = [];
    dias.forEach(dia => {
        let amCoc = 0, amLav = 0, pmCoc = 0, pmLav = 0, trabAM = false, trabPM = false;
        document.querySelectorAll('.user-row').forEach(tr => {
            const cargo = tr.dataset.cargo; const tObj = TURNOS.find(t => t.id === tr.querySelector(`[data-day="${dia}"]`).value);
            if (tObj && tObj.tipo === 'AM') { trabAM = true; if (cargo === 'Cocinero') amCoc++; if (cargo === 'Lavaplatos') amLav++; }
            if (tObj && tObj.tipo === 'PM') { trabPM = true; if (cargo === 'Cocinero') pmCoc++; if (cargo === 'Lavaplatos') pmLav++; }
        });
        const dM = dia.charAt(0).toUpperCase() + dia.slice(1);
        if (trabAM && amCoc === 0) errores.push(`Falta Cocinero el ${dM} en turno Mañana`);
        if (trabAM && amLav === 0) errores.push(`Falta Lavaplatos el ${dM} en turno Mañana`);
        if (trabPM && pmCoc === 0) errores.push(`Falta Cocinero el ${dM} en turno Tarde`);
        if (trabPM && pmLav === 0) errores.push(`Falta Lavaplatos el ${dM} en turno Tarde`);
    });
    if (errores.length === 0) alertasPanel.innerHTML = `<div class="text-emerald-400 font-medium">Cobertura completa: Todos los turnos activos cuentan con Cocinero y Lavaplatos.</div>`;
    else errores.forEach(err => alertasPanel.innerHTML += `<div class="text-rose-400">• ${err}</div>`);
}

document.getElementById('btn-importar-semana').addEventListener('click', async () => {
    const target = document.getElementById('select-importar-semana').value;
    if (!target) return alert("Selecciona una semana anterior para copiar.");
    
    const btn = document.getElementById('btn-importar-semana'); btn.innerText = "...";
    const { data: horariosImport } = await clienteSupabase.from('horarios').select('*').eq('semana', target);
    if (horariosImport && horariosImport.length > 0) {
        renderizarFilasTablero(horariosImport);
        document.getElementById('btn-deshacer').classList.remove('hidden');
    } else alert("Esa semana no tiene datos guardados.");
    btn.innerText = "Copiar";
});

document.getElementById('btn-deshacer').addEventListener('click', () => {
    if(confirm("¿Deshacer cambios y volver a la versión guardada?")) {
        renderizarFilasTablero(estadoOriginalActual);
        document.getElementById('btn-deshacer').classList.add('hidden');
    }
});

document.getElementById('btn-guardar-planificador').addEventListener('click', async () => {
    const semana = inputSemanaGlobal.value; const filas = document.querySelectorAll('.user-row');
    const btn = document.getElementById('btn-guardar-planificador'); btn.innerText = "Guardando..."; btn.disabled = true;
    
    const operaciones = Array.from(filas).map(tr => {
        const getVal = (dia) => tr.querySelector(`[data-day="${dia}"]`).value;
        const payload = {
            usuario_id: tr.dataset.userId, semana: semana,
            lunes: getVal('lunes'), martes: getVal('martes'), miercoles: getVal('miercoles'),
            jueves: getVal('jueves'), viernes: getVal('viernes'), sabado: getVal('sabado'), domingo: getVal('domingo'), extras: tr.querySelector('.extra-hours').value
        };
        return tr.dataset.horarioId ? clienteSupabase.from('horarios').update(payload).eq('id', tr.dataset.horarioId) : clienteSupabase.from('horarios').insert([payload]);
    });
    try { await Promise.all(operaciones); alert("Planificación guardada."); cargarTableroPlanificador(); } 
    catch (e) { alert("Error al guardar."); }
    btn.innerText = "Guardar planificación"; btn.disabled = false;
});

// ==========================================
// DESCARGA DE IMAGEN COMPLETA
// ==========================================
document.getElementById('btn-descargar-foto').addEventListener('click', async () => {
    const btnD = document.getElementById('btn-descargar-foto'); 
    const textoOriginal = btnD.innerText;
    btnD.innerText = "Generando imagen...";
    btnD.disabled = true;

    const semana = inputSemanaGlobal.value;
    const fechas = obtenerFechasDeSemana(semana);

    const clonContenedor = document.createElement('div');
    clonContenedor.style.position = 'fixed';
    clonContenedor.style.left = '-9999px';
    clonContenedor.style.top = '0';
    clonContenedor.style.width = '1150px';
    clonContenedor.style.backgroundColor = '#0f172a';
    clonContenedor.style.padding = '28px';
    clonContenedor.style.fontFamily = "'Inter', sans-serif";
    clonContenedor.style.color = '#f8fafc';

    let htmlTabla = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; border-bottom: 1px solid #334155; padding-bottom: 12px;">
            <div>
                <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff;">LURA | Horarios de Personal</h2>
                <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8;">Semana ${semana} (${fechas[0].corta} al ${fechas[6].corta})</p>
            </div>
            <div style="font-size: 12px; color: #64748b;">Generado el ${obtenerFechaLocal()}</div>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: center;">
            <thead>
                <tr style="background-color: #1e293b; color: #cbd5e1;">
                    <th style="padding: 10px; text-align: left; border: 1px solid #334155;">Colaborador</th>
                    ${fechas.map(f => `<th style="padding: 10px; border: 1px solid #334155;">${f.nombre}<br><span style="font-size: 10px; color: #94a3b8; font-weight: normal;">${f.corta}</span></th>`).join('')}
                    <th style="padding: 10px; border: 1px solid #334155; color: #fbbf24;">Extras</th>
                    <th style="padding: 10px; border: 1px solid #334155; color: #ffffff;">Total</th>
                </tr>
            </thead>
            <tbody>
    `;

    document.querySelectorAll('.user-row').forEach(tr => {
        const nombre = tr.dataset.userName;
        const cargo = tr.dataset.cargo;
        const extras = tr.querySelector('.extra-hours').value || '0';
        const total = tr.querySelector('.total-cell').innerText;

        const celdasDias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'].map(dia => {
            const val = tr.querySelector(`[data-day="${dia}"]`).value;
            const textoMostrar = val || 'Sin asignar';
            
            let bg = '#0f172a';
            let color = '#e2e8f0';
            if (val === 'Descanso') { bg = '#1e293b'; color = '#64748b'; }
            else if (!val) { bg = '#4c0519'; color = '#fda4af'; }
            else if (val.startsWith('6:') || val.startsWith('7:')) { bg = '#064e3b'; color = '#6ee7b7'; }
            else { bg = '#1e1b4b'; color = '#a5b4fc'; }

            return `<td style="padding: 8px 6px; border: 1px solid #334155; background-color: ${bg}; color: ${color}; font-family: monospace; font-weight: 600;">${textoMostrar}</td>`;
        }).join('');

        htmlTabla += `
            <tr>
                <td style="padding: 8px 10px; text-align: left; border: 1px solid #334155; background-color: #020617;">
                    <div style="font-weight: 600; color: #ffffff;">${nombre}</div>
                    <div style="font-size: 10px; color: #94a3b8;">${cargo}</div>
                </td>
                ${celdasDias}
                <td style="padding: 8px; border: 1px solid #334155; color: #fbbf24; font-family: monospace;">${extras}h</td>
                <td style="padding: 8px; border: 1px solid #334155; color: #ffffff; font-weight: 700; font-family: monospace;">${total}</td>
            </tr>
        `;
    });

    htmlTabla += `</tbody></table>`;
    clonContenedor.innerHTML = htmlTabla;
    document.body.appendChild(clonContenedor);

    try {
        const canvas = await html2canvas(clonContenedor, { backgroundColor: '#0f172a', scale: 2 });
        const link = document.createElement('a'); 
        link.download = `Horarios_${semana}.png`; 
        link.href = canvas.toDataURL('image/png'); 
        link.click();
    } catch (e) { 
        alert("Ocurrió un error al generar la imagen."); 
    } finally {
        document.body.removeChild(clonContenedor);
        btnD.innerText = textoOriginal;
        btnD.disabled = false;
    }
});

// ==========================================
// 6. ADMIN: REPORTES Y EXCEL (.XLS)
// ==========================================
let datosParaExcel = ""; 
const tablaReporteBody = document.getElementById('tabla-reporte-body');

document.getElementById('btn-generar-reporte').addEventListener('click', async () => {
    const inicio = document.getElementById('filtro-inicio').value; const fin = document.getElementById('filtro-fin').value;
    if (!inicio || !fin) return alert("Selecciona ambas fechas.");

    const { data: registros } = await clienteSupabase.from('asistencias').select(`fecha, hora_entrada, hora_salida, horas_normales, horas_extra, usuarios(nombre, cargo)`).gte('fecha', inicio).lte('fecha', fin).order('fecha', { ascending: true });
    if (!registros || registros.length === 0) return alert("No se encontraron registros en ese rango.");

    const reporteAgrupado = {};
    registros.forEach(reg => {
        const nombre = reg.usuarios ? `${reg.usuarios.nombre} (${reg.usuarios.cargo||'General'})` : 'Eliminado';
        if (!reporteAgrupado[nombre]) reporteAgrupado[nombre] = { detalles: [], sumNormales: 0, sumExtras: 0 };
        reporteAgrupado[nombre].detalles.push(reg);
        reporteAgrupado[nombre].sumNormales += parseFloat(reg.horas_normales || 0); reporteAgrupado[nombre].sumExtras += parseFloat(reg.horas_extra || 0);
    });

    tablaReporteBody.innerHTML = "";
    datosParaExcel = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"></head><body><table border="1"><tr><th>Colaborador</th><th>Fecha</th><th>Entrada</th><th>Salida</th><th>Normales</th><th>Extras</th></tr>`;

    for (const [nombre, datos] of Object.entries(reporteAgrupado)) {
        tablaReporteBody.innerHTML += `<tr class="bg-slate-200 border-b border-slate-400"><td colspan="6" class="p-2 font-bold text-slate-900">${nombre}</td></tr>`;
        datosParaExcel += `<tr><td colspan="6" style="background-color: #e2e8f0; font-weight: bold;">${nombre}</td></tr>`;

        datos.detalles.forEach(reg => {
            const ent = reg.hora_entrada?.slice(0, 5) || '--:--'; const sal = reg.hora_salida?.slice(0, 5) || '--:--';
            tablaReporteBody.innerHTML += `
                <tr class="border-b border-slate-200">
                    <td class="p-2 border border-slate-300 pl-4 text-slate-500">Detalle</td>
                    <td class="p-2 border border-slate-300 text-center">${reg.fecha}</td>
                    <td class="p-2 border border-slate-300 text-center">${ent}</td>
                    <td class="p-2 border border-slate-300 text-center">${sal}</td>
                    <td class="p-2 border border-slate-300 text-center">${reg.horas_normales || 0} h</td>
                    <td class="p-2 border border-slate-300 text-center font-semibold">${reg.horas_extra || 0} h</td>
                </tr>`;
            datosParaExcel += `<tr><td></td><td>${reg.fecha}</td><td>${ent}</td><td>${sal}</td><td>${reg.horas_normales || 0}</td><td>${reg.horas_extra || 0}</td></tr>`;
        });
        tablaReporteBody.innerHTML += `
            <tr class="bg-slate-100 border-b-2 border-slate-400 font-bold text-slate-800">
                <td colspan="4" class="p-2 text-right">Total acumulado:</td>
                <td class="p-2 text-center">${datos.sumNormales.toFixed(1)} h</td>
                <td class="p-2 text-center">${datos.sumExtras.toFixed(1)} h</td>
            </tr>`;
        datosParaExcel += `<tr><td colspan="4" style="text-align: right; font-weight: bold;">TOTAL:</td><td style="font-weight: bold;">${datos.sumNormales.toFixed(1)}</td><td style="font-weight: bold;">${datos.sumExtras.toFixed(1)}</td></tr>`;
    }
    datosParaExcel += "</table></body></html>";

    document.getElementById('rango-impresion').innerText = `Período: ${inicio} al ${fin}`;
    document.getElementById('area-impresion').classList.remove('hidden'); 
    document.getElementById('btn-imprimir').classList.remove('hidden'); 
    document.getElementById('btn-exportar').classList.remove('hidden');
});

document.getElementById('btn-exportar').addEventListener('click', () => {
    const blob = new Blob([datosParaExcel], { type: 'application/vnd.ms-excel' });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob);
    link.download = `Asistencia_${document.getElementById('filtro-inicio').value}_al_${document.getElementById('filtro-fin').value}.xls`; link.click();
});
document.getElementById('btn-imprimir').addEventListener('click', () => window.print());