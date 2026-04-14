// 1. Configuración de Supabase
const supabaseUrl = 'https://rbtmruydqwnhfgqmqrae.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJidG1ydXlkcXduaGZncW1xcmFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNDk5NzUsImV4cCI6MjA4OTYyNTk3NX0.7TJpYffiCBMpG6Wbou-bE5opqKae-VRDOboDOnSuybI'; 
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// 2. Lógica del formulario de Login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault(); 
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const mensajeError = document.getElementById('mensajeError');
    const btnSubmit = e.target.querySelector('button');
    
    mensajeError.style.display = 'none'; 
    btnSubmit.disabled = true;
    btnSubmit.textContent = "Verificando...";

    try {
        // 1. Iniciar sesión en Auth
        const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (authError) throw new Error('Credenciales incorrectas');

        // 2. Consultar qué rol y nombre tiene este usuario en nuestra tabla
        const userId = authData.user.id;
        const { data: userData, error: userError } = await supabaseClient
            .from('profesores')
            .select('rol, nombre_completo')
            .eq('id', userId)
            .single(); // .single() trae un solo registro, no un arreglo

        if (userError) throw new Error('Error obteniendo perfil del usuario');

        // 3. Guardamos el nombre en la memoria del navegador para usarlo en el escáner
        localStorage.setItem('nombreProfesor', userData.nombre_completo);

        // 4. BIFURCACIÓN: ¿A dónde lo mandamos?
        if (userData.rol === 'admin') {
            window.location.href = 'admin.html';
        } else {
            window.location.href = 'escaner.html';
        }

    } catch (err) {
        mensajeError.textContent = err.message;
        mensajeError.style.display = 'block';
        btnSubmit.disabled = false;
        btnSubmit.textContent = "Iniciar Sesión";
    }
});