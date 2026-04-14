// ==========================================
// 1. CONFIGURACIÓN DE SUPABASE
// ==========================================
const supabaseUrl = 'https://rbtmruydqwnhfgqmqrae.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJidG1ydXlkcXduaGZncW1xcmFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNDk5NzUsImV4cCI6MjA4OTYyNTk3NX0.7TJpYffiCBMpG6Wbou-bE5opqKae-VRDOboDOnSuybI';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// ==========================================
// 2. ELEMENTOS DEL DOM
// ==========================================
const cuerpoTabla = document.getElementById('cuerpoTabla');
const inputFecha = document.getElementById('inputFecha');
const formRegistroProfe = document.getElementById('formRegistroProfe');
const mensajeRegistro = document.getElementById('mensajeRegistro');

// Tarjetas de Estadísticas
const statHoy = document.getElementById('statHoy');
const statTotal = document.getElementById('statTotal');
const statDocentes = document.getElementById('statDocentes');
const statUltima = document.getElementById('statUltima');

// ==========================================
// 3. PROTEGER RUTA (Verificar si es Admin)
// ==========================================
async function verificarSesion() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    if (!user) {
        // window.location.replace borra el historial para que no puedan usar el botón "Atrás"
        window.location.replace('index.html'); 
    } else {
        // Si sí hay usuario, le quitamos la capa de invisibilidad
        document.body.style.opacity = '1';
    }
}

// ==========================================
// 4. CARGAR ASISTENCIAS Y ESTADÍSTICAS
// ==========================================
async function cargarAsistencias(fechaFiltro = null) {
    cuerpoTabla.innerHTML = '<tr class="empty-row"><td colspan="4">Cargando registros…</td></tr>';

    // MAGIA SUPABASE: Hacemos un "Join" para traer los datos del profesor
    let query = supabaseClient
        .from('asistencias')
        .select(`
            id,
            fecha_hora,
            estado,
            profesores (
                nombre_completo,
                cedula
            )
        `)
        .order('fecha_hora', { ascending: false });

    // Filtrar por fecha (Como fecha_hora es un timestamp, buscamos todo lo que pasó ese día)
    if (fechaFiltro) {
        // Asumiendo zona horaria local, creamos inicio y fin del día
        const inicioDia = new Date(`${fechaFiltro}T00:00:00`).toISOString();
        const finDia = new Date(`${fechaFiltro}T23:59:59`).toISOString();
        query = query.gte('fecha_hora', inicioDia).lte('fecha_hora', finDia);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error al cargar:', error);
        cuerpoTabla.innerHTML = '<tr class="empty-row"><td colspan="4">Error al cargar datos. Verifica la consola.</td></tr>';
        return;
    }

    if (data.length === 0) {
        cuerpoTabla.innerHTML = '<tr class="empty-row"><td colspan="4">No hay registros de asistencia.</td></tr>';
        // Limpiamos estadísticas si no hay nada hoy
        if (fechaFiltro) {
             statHoy.textContent = '0';
        }
        return;
    }

    // Llenar la tabla
    cuerpoTabla.innerHTML = '';
    data.forEach(registro => {
        // Extraer datos del Join
        const nombreProfe = registro.profesores ? registro.profesores.nombre_completo : 'Desconocido';
        const cedulaProfe = registro.profesores ? registro.profesores.cedula : 'N/A';

        // Separar la fecha_hora
        let fechaLimpia = 'Sin fecha';
        let horaLimpia = '--:--';
        
        if (registro.fecha_hora) {
            const fechaObj = new Date(registro.fecha_hora);
            fechaLimpia = fechaObj.toLocaleDateString('es-VE'); // Día/Mes/Año
            horaLimpia = fechaObj.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="cell-name">${nombreProfe}</td>
            <td class="cell-cedula">${cedulaProfe}</td>
            <td class="cell-date">${fechaLimpia}</td>
            <td><span class="time-badge">${horaLimpia}</span></td>
        `;
        cuerpoTabla.appendChild(tr);
    });

    // Actualizar tarjetas generales solo cuando no hay filtro de búsqueda
    if (!fechaFiltro) {
        actualizarEstadisticas(data);
    }
}

// ==========================================
// 5. CALCULAR ESTADÍSTICAS
// ==========================================
function actualizarEstadisticas(datos) {
    const hoyLimpio = new Date().toLocaleDateString('es-VE');
    
    // Total de registros
    statTotal.textContent = datos.length;

    // Registros de hoy
    let asistenciasHoy = 0;
    datos.forEach(d => {
        if (d.fecha_hora) {
            const fechaD = new Date(d.fecha_hora).toLocaleDateString('es-VE');
            if (fechaD === hoyLimpio) asistenciasHoy++;
        }
    });
    statHoy.textContent = asistenciasHoy;

    // Última entrada (como vienen ordenadas de más nueva a más vieja, es la primera [0])
    if (datos.length > 0 && datos[0].fecha_hora) {
        statUltima.textContent = new Date(datos[0].fecha_hora).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
    } else {
        statUltima.textContent = '—';
    }

    // Docentes activos (contamos cédulas únicas)
    const cedulasUnicas = new Set();
    datos.forEach(d => {
        if (d.profesores && d.profesores.cedula) {
            cedulasUnicas.add(d.profesores.cedula);
        }
    });
    statDocentes.textContent = cedulasUnicas.size;
}

// ==========================================
// 6. FILTROS Y EXPORTACIÓN
// ==========================================
document.getElementById('btnFiltrar').addEventListener('click', () => {
    if (inputFecha.value) {
        cargarAsistencias(inputFecha.value);
    }
});

document.getElementById('btnLimpiar').addEventListener('click', () => {
    inputFecha.value = '';
    cargarAsistencias();
});

document.getElementById('btnExportar').addEventListener('click', () => {
    const tabla = document.querySelector('table');
    const wb = XLSX.utils.table_to_book(tabla, { sheet: "Asistencias" });
    XLSX.writeFile(wb, 'Registro_Asistencia_Cardenal_Quintero.xlsx');
});

// ==========================================
// 7. REGISTRAR PROFESOR (MODAL)
// ==========================================
formRegistroProfe.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnGuardar = document.getElementById('btnGuardarProfe');
    btnGuardar.textContent = 'Guardando...';
    btnGuardar.disabled = true;

    const nombre = document.getElementById('regNombre').value;
    const cedula = document.getElementById('regCedula').value;
    const correo = document.getElementById('regCorreo').value;
    const clave = document.getElementById('regClave').value;

    // 1. Crear usuario en Auth
    const { data: authData, error: authError } = await supabaseClient.auth.signUp({
        email: correo,
        password: clave,
    });

    if (authError) {
        mostrarMensaje('Error de cuenta: ' + authError.message, false);
        reactivarBoton(btnGuardar);
        return;
    }

    // 2. Guardar en tabla profesores (Usamos los nombres exactos de tu esquema)
    const { error: dbError } = await supabaseClient.from('profesores').insert([
        { 
            id: authData.user.id, // Enlaza con auth.users.id
            nombre_completo: nombre, 
            cedula: cedula, 
            rol: 'profesor' 
        }
    ]);

    if (dbError) {
        mostrarMensaje('Error al guardar datos: ' + dbError.message, false);
    } else {
        mostrarMensaje('¡Docente registrado exitosamente!', true);
        formRegistroProfe.reset();
        
        // Recargar estadísticas para contar al nuevo docente
        cargarAsistencias(); 

        setTimeout(() => {
            document.getElementById('modalRegistro').classList.remove('open');
            mensajeRegistro.style.display = 'none';
        }, 2000);
    }
    reactivarBoton(btnGuardar);
});

function mostrarMensaje(texto, esExito) {
    mensajeRegistro.textContent = texto;
    mensajeRegistro.style.display = 'block';
    if (esExito) {
        mensajeRegistro.classList.add('success');
    } else {
        mensajeRegistro.classList.remove('success');
    }
}

function reactivarBoton(btn) {
    btn.textContent = 'Registrar y Guardar';
    btn.disabled = false;
}

// ==========================================
// 8. CERRAR SESIÓN
// ==========================================
document.getElementById('btnSalirAdmin').addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
});

// ==========================================
// INICIALIZAR
// ==========================================
verificarSesion();
cargarAsistencias();