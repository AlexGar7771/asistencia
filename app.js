// ==========================================
// 🔴 CONFIGURACIÓN DE CONEXIÓN CON SUPABASE
// ==========================================
const miUrl = "https://udwtfwicbwpdbxefnmth.supabase.co"; 
const miKey = "sb_publishable_S582CVeyAW6QzN_5RwTXRA_cFBxQloI";
const clienteSupabase = supabase.createClient(miUrl, miKey);

let usuarioLogueado = null; 

function obtenerFechaLocal() {
    const ahora = new Date();
    const año = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
}

function obtenerHoraLocal() {
    const ahora = new Date();
    const h = String(ahora.getHours()).padStart(2, '0');
    const m = String(ahora.getMinutes()).padStart(2, '0');
    const s = String(ahora.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
}

function obtenerSemanaActual() {
    const d = new Date();
    const startDate = new Date(d.getFullYear(), 0, 1);
    const days = Math.floor((d - startDate) / (24 * 60 * 60 * 1000));
    return `${d.getFullYear()}-W${String(Math.ceil(days / 7)).padStart(2, '0')}`;
}

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
        if (error) return alert(`❌ Error: ${error.message}`);

        if (user) {
            usuarioLogueado = user; 
            pantallaLogin.classList.add('hidden');

            if (user.rol === 'administrador') {
                pantallaAdmin.classList.remove('hidden');
                renderizarUsuarios();
                cargarTableroPlanificador();
            } else {
                pantallaAsistencia.classList.remove('hidden');
                document.getElementById('txt-fecha-hoy').innerText = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'numeric' });
                document.getElementById('txt-mi-cargo').innerText = `[ ${user.cargo || 'General'} ]`;
                verificarMarcaDelDia(); 
                cargarMiHorario(); 
            }
        } else alert("❌ Nombre o contraseña incorrectos.");
    } catch (err) { alert(`🚨 Error: ${err.message || err}`); }
});

document.getElementById('btn-ir-admin').addEventListener('click', () => { document.getElementById('login-nombre').value = "Admin"; document.getElementById('login-password').value = ""; document.getElementById('login-password').focus(); });
document.getElementById('btn-admin-salir').addEventListener('click', cerrarSesionSistema);
document.getElementById('btn-logout').addEventListener('click', cerrarSesionSistema);

function cerrarSesionSistema() { location.reload(); }

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
    if (error) return alert("❌ Error al guardar.");
    document.getElementById('rep-entrada').innerText = `${hora.slice(0, 5)} Horas`;
    btnE.disabled = true; btnE.classList.add('opacity-50', 'cursor-not-allowed');
    btnS.disabled = false; btnS.classList.remove('opacity-50', 'cursor-not-allowed');
});

document.getElementById('btn-salida').addEventListener('click', async function() {
    detenerTimer(); const horaS = obtenerHoraLocal(); const fecha = obtenerFechaLocal(); 
    const btnS = document.getElementById('btn-salida');
    const { data: asis } = await clienteSupabase.from('asistencias').select('*').eq('usuario_id', usuarioLogueado.id).eq('fecha', fecha).maybeSingle();
    
    const diff = new Date() - new Date(`${fecha}T${asis.hora_entrada.padStart(8, '0')}`);
    const hTotal = diff / (1000 * 60 * 60);
    const normales = hTotal > 7 ? 7 : hTotal; const extras = hTotal > 7 ? hTotal - 7 : 0;

    await clienteSupabase.from('asistencias').update({ hora_salida: horaS, horas_normales: normales.toFixed(1), horas_extra: extras.toFixed(1) }).eq('id', asis.id);
    document.getElementById('rep-salida').innerText = `${horaS.slice(0, 5)} Horas`;
    document.getElementById('rep-total').innerText = `${normales.toFixed(1)} Horas`; document.getElementById('rep-extra').innerText = `${extras.toFixed(1)} Horas Extra`;
    btnS.disabled = true; btnS.classList.add('opacity-50', 'cursor-not-allowed');
});

async function verificarMarcaDelDia() {
    const { data: marca } = await clienteSupabase.from('asistencias').select('*').eq('usuario_id', usuarioLogueado.id).eq('fecha', obtenerFechaLocal()).maybeSingle();
    const btnE = document.getElementById('btn-entrada'); const btnS = document.getElementById('btn-salida');
    if (marca) {
        if (marca.hora_entrada && !marca.hora_salida) {
            document.getElementById('rep-entrada').innerText = `${marca.hora_entrada.slice(0, 5)} Horas`;
            btnE.disabled = true; btnE.classList.add('opacity-50', 'cursor-not-allowed');
            btnS.disabled = false; btnS.classList.remove('opacity-50', 'cursor-not-allowed');
            iniciarTimer(marca.hora_entrada); 
        } else if (marca.hora_entrada && marca.hora_salida) {
            document.getElementById('rep-entrada').innerText = `${marca.hora_entrada.slice(0, 5)} Horas`; document.getElementById('rep-salida').innerText = `${marca.hora_salida.slice(0, 5)} Horas`;
            document.getElementById('rep-total').innerText = `${marca.horas_normales} Horas`; document.getElementById('rep-extra').innerText = `${marca.horas_extra} Horas Extra`;
            btnE.disabled = true; btnE.classList.add('opacity-50', 'cursor-not-allowed'); btnS.disabled = true; btnS.classList.add('opacity-50', 'cursor-not-allowed');
        }
    }
}

// ==========================================
// 3. VISTA TRABAJADOR: HORARIO Y PERFIL
// ==========================================
async function cargarMiHorario() {
    const { data: horario } = await clienteSupabase.from('horarios').select('*').eq('usuario_id', usuarioLogueado.id).eq('semana', obtenerSemanaActual()).maybeSingle();
    const cont = document.getElementById('mi-horario-semana');
    if (horario) {
        cont.innerHTML = `
            <div><span class="font-bold text-indigo-400">Lun:</span> ${horario.lunes||'-'}</div>
            <div><span class="font-bold text-indigo-400">Mar:</span> ${horario.martes||'-'}</div>
            <div><span class="font-bold text-indigo-400">Mié:</span> ${horario.miercoles||'-'}</div>
            <div><span class="font-bold text-indigo-400">Jue:</span> ${horario.jueves||'-'}</div>
            <div><span class="font-bold text-indigo-400">Vie:</span> ${horario.viernes||'-'}</div>
            <div><span class="font-bold text-indigo-400">Sáb:</span> ${horario.sabado||'-'}</div>
            <div class="col-span-2 text-center border-t border-indigo-500/30 pt-1 mt-1"><span class="font-bold text-indigo-400">Dom:</span> ${horario.domingo||'-'}</div>
        `;
    } else cont.innerHTML = `<div class="col-span-2 text-center text-gray-500">Sin horario asignado.</div>`;
}

document.getElementById('btn-ver-historial').addEventListener('click', async () => {
    document.getElementById('contenedor-historial').classList.remove('hidden');
    const lista = document.getElementById('lista-mi-historial'); lista.innerHTML = `<p class="text-center text-gray-500 text-xs">Cargando...</p>`;
    const { data: misMarcas } = await clienteSupabase.from('asistencias').select('*').eq('usuario_id', usuarioLogueado.id).order('fecha', { ascending: false });

    if (!misMarcas || misMarcas.length === 0) return lista.innerHTML = `<p class="text-center text-gray-500 text-xs py-2">No hay historial.</p>`;
    
    lista.innerHTML = ""; let suma = 0;
    misMarcas.forEach(m => {
        suma += parseFloat(m.horas_normales || 0);
        lista.innerHTML += `
            <div class="flex justify-between items-center bg-gray-800 p-2 rounded border border-gray-700">
                <span class="text-gray-400 w-20">${m.fecha}</span>
                <span class="text-emerald-400">E: ${m.hora_entrada?.slice(0,5)||'--'}</span>
                <span class="text-rose-400">S: ${m.hora_salida?.slice(0,5)||'--'}</span>
                <span class="text-cyan-400 font-bold">${m.horas_normales||0}h</span>
            </div>`;
    });
    document.getElementById('mi-historial-total').innerText = `${suma.toFixed(1)} Horas`;
});
document.getElementById('btn-cerrar-historial').addEventListener('click', () => document.getElementById('contenedor-historial').classList.add('hidden'));

// ==========================================
// 4. ADMIN: PESTAÑAS Y USUARIOS
// ==========================================
const tabs = ['gestion', 'horarios', 'reportes'];
tabs.forEach(tab => {
    document.getElementById(`tab-${tab}`).addEventListener('click', () => {
        tabs.forEach(t => {
            document.getElementById(`tab-${t}`).className = 'bg-gray-800 text-gray-400 hover:text-gray-200 px-4 py-2 rounded-t-lg text-xs md:text-sm font-bold transition-colors whitespace-nowrap';
            document.getElementById(`admin-${t}`).classList.add('hidden');
        });
        document.getElementById(`tab-${tab}`).className = 'bg-cyan-600 text-white px-4 py-2 rounded-t-lg text-xs md:text-sm font-bold transition-colors whitespace-nowrap';
        document.getElementById(`admin-${tab}`).classList.remove('hidden');
    });
});

document.getElementById('form-add-usuario').addEventListener('submit', async function(e) {
    e.preventDefault();
    const payload = { 
        nombre: document.getElementById('add-nombre').value.trim(), 
        contrasena: document.getElementById('add-password').value, 
        cargo: document.getElementById('add-cargo').value, 
        rol: 'empleado' 
    };
    const { error } = await clienteSupabase.from('usuarios').insert([payload]);
    if (!error) { document.getElementById('form-add-usuario').reset(); renderizarUsuarios(); cargarTableroPlanificador(); }
});

async function renderizarUsuarios() {
    const contenedor = document.getElementById('lista-usuarios-contenedor'); 
    contenedor.innerHTML = "";
    
    const { data: lista } = await clienteSupabase.from('usuarios').select('*').neq('rol', 'administrador').order('nombre');
    
    if (lista) {
        lista.forEach((u) => {
            const cargoActual = u.cargo || 'General';
            contenedor.innerHTML += `
                <div class="flex justify-between items-center bg-gray-800 p-2 rounded-lg border border-gray-700 text-sm">
                    <div class="flex flex-col md:flex-row md:items-center gap-2">
                        <span class="font-medium text-gray-200">${u.nombre}</span>
                        <select onchange="actualizarCargoUsuario(${u.id}, this.value)" class="text-[10px] bg-gray-900 border border-gray-600 text-indigo-400 uppercase rounded p-1 outline-none focus:border-indigo-400 cursor-pointer">
                            <option value="General" ${cargoActual === 'General' ? 'selected' : ''}>General</option>
                            <option value="Cocinero" ${cargoActual === 'Cocinero' ? 'selected' : ''}>Cocinero</option>
                            <option value="Lavaplatos" ${cargoActual === 'Lavaplatos' ? 'selected' : ''}>Lavaplatos</option>
                        </select>
                    </div>
                    <button onclick="eliminarUsuario(${u.id})" class="text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white px-3 py-1 rounded">X</button>
                </div>`;
        });
    }
}

window.actualizarCargoUsuario = async function(id, nuevoCargo) {
    const { error } = await clienteSupabase.from('usuarios').update({ cargo: nuevoCargo }).eq('id', id);
    if (error) alert("❌ Error al actualizar el cargo.");
    else cargarTableroPlanificador(); 
};

window.eliminarUsuario = async function(id) {
    if (confirm(`¿Seguro que quieres eliminar este usuario?`)) { await clienteSupabase.from('usuarios').delete().eq('id', id); renderizarUsuarios(); cargarTableroPlanificador(); }
};

// ==========================================
// 5. ADMIN: TABLERO INTELIGENTE Y TURNOS PERSONALIZADOS
// ==========================================
let TURNOS = [
    { id: '', text: '⚠️ Asignar', horas: 0, color: 'bg-rose-950/80 text-rose-300 border-rose-700', tipo: 'NA' },
    { id: 'Descanso', text: '🛌 Descanso', horas: 0, color: 'bg-gray-800 text-gray-500 border-gray-600', tipo: 'NA' },
    { id: '6:30 a 13:30', text: '☀️ 6:30 a 13:30', horas: 7, color: 'bg-emerald-900/40 text-emerald-300 border-emerald-700', tipo: 'AM' },
    { id: '7:00 a 14:00', text: '☀️ 7:00 a 14:00', horas: 7, color: 'bg-emerald-900/40 text-emerald-300 border-emerald-700', tipo: 'AM' },
    { id: '7:00 a 15:00', text: '☀️ 7:00 a 15:00', horas: 8, color: 'bg-emerald-900/40 text-emerald-300 border-emerald-700', tipo: 'AM' },
    { id: '13:30 a 20:30', text: '🌇 13:30 a 20:30', horas: 7, color: 'bg-indigo-900/40 text-indigo-300 border-indigo-700', tipo: 'PM' },
    { id: '15:00 a 22:00', text: '🌙 15:00 a 22:00', horas: 7, color: 'bg-purple-900/40 text-purple-300 border-purple-700', tipo: 'PM' },
    { id: '16:00 a 22:00', text: '🌙 16:00 a 22:00', horas: 6, color: 'bg-purple-900/40 text-purple-300 border-purple-700', tipo: 'PM' }
];

// Cargar turnos creados por el admin desde la memoria local
const turnosGuardados = JSON.parse(localStorage.getItem('turnos_custom')) || [];
TURNOS = TURNOS.concat(turnosGuardados);

// CREAR NUEVO TURNO
document.getElementById('btn-crear-turno').addEventListener('click', () => {
    const texto = document.getElementById('nuevo-turno-texto').value.trim();
    const horas = parseFloat(document.getElementById('nuevo-turno-horas').value);
    const tipo = document.getElementById('nuevo-turno-tipo').value;

    if (!texto || isNaN(horas)) return alert("⚠️ Ingresa el horario y la cantidad de horas.");
    if (TURNOS.find(t => t.id === texto)) return alert("⚠️ Este turno ya existe.");

    const nuevoTurno = {
        id: texto, text: `${tipo === 'AM' ? '☀️' : '🌙'} ${texto}`, horas: horas,
        color: tipo === 'AM' ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700' : 'bg-purple-900/40 text-purple-300 border-purple-700',
        tipo: tipo
    };

    TURNOS.push(nuevoTurno);
    const guardados = JSON.parse(localStorage.getItem('turnos_custom')) || [];
    guardados.push(nuevoTurno);
    localStorage.setItem('turnos_custom', JSON.stringify(guardados));

    document.getElementById('nuevo-turno-texto').value = ''; document.getElementById('nuevo-turno-horas').value = '';
    cargarTableroPlanificador();
});

const inputSemanaGlobal = document.getElementById('horario-semana-global');
const bodyPlanificador = document.getElementById('body-planificador');
const alertasPanel = document.getElementById('alertas-turnos');

inputSemanaGlobal.addEventListener('change', cargarTableroPlanificador);

async function cargarTableroPlanificador() {
    if(!inputSemanaGlobal.value) inputSemanaGlobal.value = obtenerSemanaActual();
    bodyPlanificador.innerHTML = `<tr><td colspan="10" class="text-center py-4 text-gray-500">Cargando tablero...</td></tr>`;

    const { data: usuarios } = await clienteSupabase.from('usuarios').select('*').neq('rol', 'administrador').order('nombre');
    const { data: horarios } = await clienteSupabase.from('horarios').select('*').eq('semana', inputSemanaGlobal.value);
    
    bodyPlanificador.innerHTML = '';
    
    usuarios.forEach(user => {
        const hor = horarios?.find(h => h.usuario_id === user.id) || {};
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-800/40 transition-colors user-row';
        tr.dataset.userId = user.id; tr.dataset.horarioId = hor.id || ''; tr.dataset.cargo = user.cargo || 'General'; 
        
        const genSelect = (day, val) => {
            const opcionesHTML = TURNOS.map(t => `<option value="${t.id}" data-horas="${t.horas}" ${val === t.id ? 'selected' : ''}>${t.text}</option>`).join('');
            const tObj = TURNOS.find(t => t.id === (val||'')) || TURNOS[0];
            return `<select class="day-select text-[10px] w-[100px] md:w-[110px] p-1 md:p-1.5 rounded border outline-none appearance-none cursor-pointer text-center font-bold transition-colors ${tObj.color}" data-day="${day}">${opcionesHTML}</select>`;
        };
        
        tr.innerHTML = `
            <td class="p-2 font-bold text-cyan-200 tracking-wide sticky left-0 bg-gray-800 border-r border-gray-700 z-10 shadow-sm leading-tight">
                ${user.nombre} <br><span class="text-[9px] text-gray-400 uppercase font-normal">${user.cargo||'General'}</span>
            </td>
            <td class="p-1">${genSelect('lunes', hor.lunes)}</td>
            <td class="p-1">${genSelect('martes', hor.martes)}</td>
            <td class="p-1">${genSelect('miercoles', hor.miercoles)}</td>
            <td class="p-1">${genSelect('jueves', hor.jueves)}</td>
            <td class="p-1">${genSelect('viernes', hor.viernes)}</td>
            <td class="p-1">${genSelect('sabado', hor.sabado)}</td>
            <td class="p-1">${genSelect('domingo', hor.domingo)}</td>
            <td class="p-1 text-center bg-gray-950/30">
                <input type="number" min="0" step="0.5" class="extra-hours w-14 bg-gray-950 border border-amber-700/50 text-amber-400 text-center rounded p-1 text-xs font-bold focus:outline-none focus:border-amber-400" value="${hor.extras || 0}">
            </td>
            <td class="p-2 text-center font-mono text-sm total-cell bg-gray-950/50">0h</td>
        `;
        bodyPlanificador.appendChild(tr);
    });
    
    document.querySelectorAll('.user-row').forEach(row => recalcularFila(row));
    validarCoberturaTurnos();
}

bodyPlanificador.addEventListener('change', (e) => {
    if (e.target.classList.contains('day-select')) {
        const tObj = TURNOS.find(t => t.id === e.target.value) || TURNOS[0];
        e.target.className = `day-select text-[10px] w-[100px] md:w-[110px] p-1 md:p-1.5 rounded border outline-none appearance-none cursor-pointer text-center font-bold transition-colors ${tObj.color}`;
    }
    if (e.target.classList.contains('day-select') || e.target.classList.contains('extra-hours')) {
        recalcularFila(e.target.closest('tr'));
        validarCoberturaTurnos(); 
    }
});

function recalcularFila(tr) {
    let suma = 0;
    tr.querySelectorAll('.day-select').forEach(sel => { const tObj = TURNOS.find(t => t.id === sel.value); if(tObj) suma += tObj.horas; });
    suma += parseFloat(tr.querySelector('.extra-hours').value) || 0;
    
    const celdaTotal = tr.querySelector('.total-cell');
    celdaTotal.innerText = `${suma}h`;
    
    if (suma < 42) celdaTotal.className = 'p-2 text-center font-mono font-bold text-sm total-cell text-amber-400 bg-amber-900/20';
    else if (suma >= 42 && suma <= 44) celdaTotal.className = 'p-2 text-center font-mono font-bold text-sm total-cell text-emerald-400 bg-emerald-900/20';
    else celdaTotal.className = 'p-2 text-center font-mono font-bold text-sm total-cell text-rose-400 bg-rose-900/20';
}

function validarCoberturaTurnos() {
    alertasPanel.innerHTML = "";
    const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    const errores = [];

    dias.forEach(dia => {
        let amCocinero = 0, amLavaplatos = 0, pmCocinero = 0, pmLavaplatos = 0;
        let trabajandoAM = false, trabajandoPM = false;

        document.querySelectorAll('.user-row').forEach(tr => {
            const cargo = tr.dataset.cargo;
            const tObj = TURNOS.find(t => t.id === tr.querySelector(`[data-day="${dia}"]`).value);

            if (tObj && tObj.tipo === 'AM') {
                trabajandoAM = true;
                if (cargo === 'Cocinero') amCocinero++; if (cargo === 'Lavaplatos') amLavaplatos++;
            }
            if (tObj && tObj.tipo === 'PM') {
                trabajandoPM = true;
                if (cargo === 'Cocinero') pmCocinero++; if (cargo === 'Lavaplatos') pmLavaplatos++;
            }
        });

        const diaMayus = dia.charAt(0).toUpperCase() + dia.slice(1);
        if (trabajandoAM && amCocinero === 0) errores.push(`⚠️ Falta <b>Cocinero</b> el ${diaMayus} (Turno Mañana)`);
        if (trabajandoAM && amLavaplatos === 0) errores.push(`⚠️ Falta <b>Lavaplatos</b> el ${diaMayus} (Turno Mañana)`);
        if (trabajandoPM && pmCocinero === 0) errores.push(`⚠️ Falta <b>Cocinero</b> el ${diaMayus} (Turno Tarde)`);
        if (trabajandoPM && pmLavaplatos === 0) errores.push(`⚠️ Falta <b>Lavaplatos</b> el ${diaMayus} (Turno Tarde)`);
    });

    if (errores.length === 0) alertasPanel.innerHTML = `<div class="text-emerald-400 font-bold">✅ Excelente cobertura: Todos los turnos tienen Cocinero y Lavaplatos.</div>`;
    else errores.forEach(err => alertasPanel.innerHTML += `<div class="text-rose-400">${err}</div>`);
}

document.getElementById('btn-guardar-planificador').addEventListener('click', async () => {
    const semana = inputSemanaGlobal.value; const filas = document.querySelectorAll('.user-row');
    const btn = document.getElementById('btn-guardar-planificador'); btn.innerText = "Guardando..."; btn.disabled = true;
    
    const operaciones = Array.from(filas).map(tr => {
        const getVal = (dia) => tr.querySelector(`[data-day="${dia}"]`).value;
        const payload = {
            usuario_id: tr.dataset.userId, semana: semana,
            lunes: getVal('lunes'), martes: getVal('martes'), miercoles: getVal('miercoles'),
            jueves: getVal('jueves'), viernes: getVal('viernes'), sabado: getVal('sabado'), domingo: getVal('domingo'),
            extras: tr.querySelector('.extra-hours').value
        };
        return tr.dataset.horarioId ? clienteSupabase.from('horarios').update(payload).eq('id', tr.dataset.horarioId) : clienteSupabase.from('horarios').insert([payload]);
    });

    try { await Promise.all(operaciones); alert("✅ Horarios guardados con éxito."); cargarTableroPlanificador(); } 
    catch (e) { alert("❌ Error al guardar."); }
    btn.innerHTML = `<span class="text-lg">💾</span> Guardar Horarios`; btn.disabled = false;
});

document.getElementById('btn-compartir-wa').addEventListener('click', async () => {
    const btnWA = document.getElementById('btn-compartir-wa'); btnWA.innerText = "📸 Generando...";
    const tablero = document.getElementById('captura-tablero');
    
    try {
        const canvas = await html2canvas(tablero, { backgroundColor: '#1f2937', scale: 2 });
        canvas.toBlob(async (blob) => {
            const file = new File([blob], `Horarios_${inputSemanaGlobal.value}.png`, { type: "image/png" });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try { await navigator.share({ files: [file], title: 'Horarios de la Semana', text: `Turnos semana ${inputSemanaGlobal.value}.` }); } 
                catch (err) { console.log("Cancelado."); }
            } else {
                const link = document.createElement('a'); link.download = `Horarios_Semana_${inputSemanaGlobal.value}.png`; link.href = canvas.toDataURL('image/png'); link.click();
                alert("✅ Imagen descargada. Pégala (Ctrl+V) en WhatsApp Web.");
            }
            btnWA.innerHTML = `<span class="text-lg">📱</span> Enviar Foto a WhatsApp`;
        });
    } catch (error) { alert("❌ Error al capturar."); btnWA.innerHTML = `<span class="text-lg">📱</span> Enviar Foto a WhatsApp`; }
});

// ==========================================
// 6. ADMIN: EXCEL (.XLS Nativo)
// ==========================================
let datosParaExcel = ""; 
const tablaReporteBody = document.getElementById('tabla-reporte-body');

document.getElementById('btn-generar-reporte').addEventListener('click', async () => {
    const inicio = document.getElementById('filtro-inicio').value; const fin = document.getElementById('filtro-fin').value;
    if (!inicio || !fin) return alert("⚠️ Selecciona ambas fechas.");

    const { data: registros } = await clienteSupabase.from('asistencias').select(`fecha, hora_entrada, hora_salida, horas_normales, horas_extra, usuarios(nombre, cargo)`).gte('fecha', inicio).lte('fecha', fin).order('fecha', { ascending: true });
    if (!registros || registros.length === 0) return alert("No se encontraron registros.");

    const reporteAgrupado = {};
    registros.forEach(reg => {
        const nombre = reg.usuarios ? `${reg.usuarios.nombre} [${reg.usuarios.cargo||'General'}]` : 'Eliminado';
        if (!reporteAgrupado[nombre]) reporteAgrupado[nombre] = { detalles: [], sumNormales: 0, sumExtras: 0 };
        reporteAgrupado[nombre].detalles.push(reg);
        reporteAgrupado[nombre].sumNormales += parseFloat(reg.horas_normales || 0); reporteAgrupado[nombre].sumExtras += parseFloat(reg.horas_extra || 0);
    });

    tablaReporteBody.innerHTML = "";
    datosParaExcel = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"></head><body><table border="1"><tr><th>Empleado</th><th>Fecha</th><th>Entrada</th><th>Salida</th><th>Normales</th><th>Extras</th></tr>`;

    for (const [nombre, datos] of Object.entries(reporteAgrupado)) {
        tablaReporteBody.innerHTML += `<tr class="bg-gray-300 border-b-2 border-gray-800"><td colspan="6" class="p-2 font-bold text-black uppercase">👤 ${nombre}</td></tr>`;
        datosParaExcel += `<tr><td colspan="6" style="background-color: #d1d5db; font-weight: bold;">👤 REPORTE DE: ${nombre}</td></tr>`;

        datos.detalles.forEach(reg => {
            const ent = reg.hora_entrada?.slice(0, 5) || '--:--'; const sal = reg.hora_salida?.slice(0, 5) || '--:--';
            tablaReporteBody.innerHTML += `
                <tr class="border-b border-gray-300">
                    <td class="p-2 border border-gray-400 pl-4 text-gray-600">↳</td><td class="p-2 border border-gray-400 text-center">${reg.fecha}</td>
                    <td class="p-2 border border-gray-400 text-center text-emerald-700">${ent}</td><td class="p-2 border border-gray-400 text-center text-rose-700">${sal}</td>
                    <td class="p-2 border border-gray-400 text-center">${reg.horas_normales || 0} h</td><td class="p-2 border border-gray-400 text-center font-bold">${reg.horas_extra || 0} h</td>
                </tr>`;
            datosParaExcel += `<tr><td></td><td>${reg.fecha}</td><td>${ent}</td><td>${sal}</td><td>${reg.horas_normales || 0}</td><td>${reg.horas_extra || 0}</td></tr>`;
        });
        tablaReporteBody.innerHTML += `
            <tr class="bg-cyan-900/10 border-b-4 border-gray-500 font-bold text-cyan-700">
                <td colspan="4" class="p-2 text-right uppercase">Total Acumulado:</td>
                <td class="p-2 text-center text-emerald-600">${datos.sumNormales.toFixed(1)} h</td><td class="p-2 text-center text-amber-600">${datos.sumExtras.toFixed(1)} h</td>
            </tr>`;
        datosParaExcel += `<tr><td colspan="4" style="text-align: right; font-weight: bold;">TOTALES:</td><td style="font-weight: bold;">${datos.sumNormales.toFixed(1)}</td><td style="font-weight: bold;">${datos.sumExtras.toFixed(1)}</td></tr>`;
    }
    datosParaExcel += "</table></body></html>";

    document.getElementById('rango-impresion').innerText = `Período detallado: ${inicio} al ${fin}`;
    document.getElementById('area-impresion').classList.remove('hidden'); document.getElementById('btn-imprimir').classList.remove('hidden'); document.getElementById('btn-exportar').classList.remove('hidden');
});

document.getElementById('btn-exportar').addEventListener('click', () => {
    const blob = new Blob([datosParaExcel], { type: 'application/vnd.ms-excel' });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob);
    link.download = `Reporte_Individual_${document.getElementById('filtro-inicio').value}_al_${document.getElementById('filtro-fin').value}.xls`; link.click();
});
document.getElementById('btn-imprimir').addEventListener('click', () => window.print());