// ==========================================
// 1. CONFIGURACIÓN DE SUPABASE
// ==========================================
const supabaseUrl = 'https://rbtmruydqwnhfgqmqrae.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJidG1ydXlkcXduaGZncW1xcmFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNDk5NzUsImV4cCI6MjA4OTYyNTk3NX0.7TJpYffiCBMpG6Wbou-bE5opqKae-VRDOboDOnSuybI';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// Variables Globales
let usuarioActual = null;
let html5QrcodeScanner = null;

// ==========================================
// 2. INICIAR APLICACIÓN Y VERIFICAR SESIÓN (Manto Invisible)
// ==========================================
async function initApp() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    if (!user) {
        // Si no hay usuario logueado, lo mandamos al login de inmediato
        window.location.replace('index.html'); 
        return;
    }
    
    // Si la sesión es válida, le quitamos la invisibilidad a la página
    document.body.style.opacity = '1';
    usuarioActual = user;

    // Buscar el nombre del profesor para el saludo
    const { data: profe } = await supabaseClient
        .from('profesores')
        .select('nombre_completo')
        .eq('id', user.id)
        .single();

    if (profe) {
        document.getElementById('saludoProfesor').textContent = `¡Bienvenido, ${profe.nombre_completo}!`;
    }

    iniciarEscaner();
}

// ==========================================
// 3. CONFIGURAR LA CÁMARA (Librería html5-qrcode)
// ==========================================
function iniciarEscaner() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.clear();
    }

    html5QrcodeScanner = new Html5QrcodeScanner(
        "reader", 
        { fps: 10, qrbox: {width: 250, height: 250} }, 
        false
    );
    html5QrcodeScanner.render(onScanSuccess, onScanFailure);
}

// ==========================================
// 4. LÓGICA CUANDO EL QR SE LEE CON ÉXITO
// ==========================================
async function onScanSuccess(decodedText, decodedResult) {
    html5QrcodeScanner.clear();
    mostrarMensaje('Verificando en el sistema...', 'info');

    const hoy = new Date().toLocaleDateString('en-CA');
    const inicioDia = new Date(`${hoy}T00:00:00`).toISOString();
    const finDia = new Date(`${hoy}T23:59:59`).toISOString();

    // Filtro de Seguridad: Buscar si ya vino hoy
    const { data: asistenciasHoy, error: errorBusqueda } = await supabaseClient
        .from('asistencias')
        .select('id')
        .eq('profesor_id', usuarioActual.id)
        .gte('fecha_hora', inicioDia)
        .lte('fecha_hora', finDia);

    if (errorBusqueda) {
        mostrarMensaje('Error de conexión con el servidor.', 'danger');
        setTimeout(iniciarEscaner, 3000);
        return;
    }

    // ¿Ya tenía registro?
    if (asistenciasHoy && asistenciasHoy.length > 0) {
        mostrarMensaje('¡Atención! Tu asistencia de hoy YA fue registrada anteriormente.', 'warning');
        setTimeout(iniciarEscaner, 4000); 
        return;
    }

    // Guardar Asistencia
    const { error: errorInsert } = await supabaseClient
        .from('asistencias')
        .insert([
            {
                profesor_id: usuarioActual.id,
                fecha_hora: new Date().toISOString(),
                estado: 'presente'
            }
        ]);

    if (errorInsert) {
        mostrarMensaje('Error al guardar tu asistencia.', 'danger');
        setTimeout(iniciarEscaner, 3000);
    } else {
        mostrarMensaje('✅ ¡Asistencia Registrada Exitosamente!', 'success');
        
        // Auto-Cierre de sesión
        setTimeout(() => {
            document.getElementById('btnCerrarSesion').click();
        }, 3000);
    }
}

// ==========================================
// 5. FUNCIONES AUXILIARES Y EVENTOS
// ==========================================
function onScanFailure(error) {
    // console.warn(`Error de escaneo: ${error}`);
}

function mostrarMensaje(texto, tipo) {
    const msj = document.getElementById('mensaje');
    if (msj) {
        msj.textContent = texto;
        msj.className = `alert alert-${tipo}`; 
        msj.style.display = 'block';
    }
}

document.getElementById('btnCerrarSesion').addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    window.location.replace('index.html');
});

// Arrancar el motor
initApp();
