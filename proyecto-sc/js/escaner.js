// 1. Configuramos Supabase con tus claves
const supabaseUrl = 'https://rbtmruydqwnhfgqmqrae.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJidG1ydXlkcXduaGZncW1xcmFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNDk5NzUsImV4cCI6MjA4OTYyNTk3NX0.7TJpYffiCBMpG6Wbou-bE5opqKae-VRDOboDOnSuybI'; 
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

let scannerActivo = true;

async function iniciarSistema() {
    // 2. Verificamos si el usuario está logueado
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        window.location.href = 'index.html';
        return;
    }

    // 3. Mostramos el nombre del profesor de forma segura
    const nombre = localStorage.getItem('nombreProfesor') || 'Profesor';
    const saludoElement = document.getElementById('saludoProfesor');
    if (saludoElement) {
        saludoElement.textContent = `¡Bienvenido, ${nombre}!`;
    }

    // 4. Encendemos la cámara y el escáner
    const html5QrcodeScanner = new Html5QrcodeScanner("reader", { 
        fps: 10, 
        qrbox: { width: 250, height: 250 } 
    }, false);

    html5QrcodeScanner.render(onScanSuccess, onScanFailure);

    // 5. Lógica principal al leer un código QR
    async function onScanSuccess(textoDelQR) {
        if (!scannerActivo) return; 

        // Calculamos la fecha de hoy para armar el código esperado
        const hoy = new Date();
        const dia = String(hoy.getDate()).padStart(2, '0');
        const mes = String(hoy.getMonth() + 1).padStart(2, '0');
        const anio = hoy.getFullYear();
        
        // El código debe coincidir exactamente con la fecha actual
        const codigoEsperado = `asistencia_${anio}${mes}${dia}`; 

        if (textoDelQR === codigoEsperado) {
            scannerActivo = false; 
            html5QrcodeScanner.clear(); // Apagamos la cámara

            mostrarMensaje("Guardando asistencia...", "info");

            // Guardamos en la tabla de Supabase
            const { error } = await supabaseClient
                .from('asistencias')
                .insert([{ profesor_id: session.user.id }]);

            if (error) {
                mostrarMensaje("Error: " + error.message, "danger");
                scannerActivo = true; 
            } else {
                mostrarMensaje("¡Asistencia registrada exitosamente! ✅", "success");
                
                // Cerramos sesión después de 3 segundos
                setTimeout(async () => {
                    await supabaseClient.auth.signOut();
                    window.location.href = 'index.html';
                }, 3000);
            }
        } else {
            // Si escanean una foto de un QR de ayer o cualquier otro código
            mostrarMensaje("Código QR vencido o inválido.", "warning");
        }
    }

    // Dejamos esto vacío para que no tire errores en consola mientras busca el QR
    function onScanFailure(error) {} 
}

// Función auxiliar para las alertas visuales
function mostrarMensaje(texto, tipo) {
    const div = document.getElementById('mensaje');
    div.textContent = texto;
    div.className = `alert alert-${tipo} mt-3 text-center`;
    div.style.display = 'block';
}

// Botón para salir manualmente
document.getElementById('btnCerrarSesion').addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
});

// Arrancamos el sistema
iniciarSistema();