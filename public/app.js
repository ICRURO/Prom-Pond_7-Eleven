let studentsData = [];
let catalogData = [];
let activeStudentMatricula = null;
let activeEEId = null;

document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupForms();
});

async function initApp() {
    await loadCatalog();
    await loadStudents();
}

function showSection(sectionId) {
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.add('hidden'));
    const target = document.getElementById(sectionId);
    if (target) target.classList.remove('hidden');
    if (sectionId === 'lista-estudiantes' || sectionId === 'modificar-alumno') {
        loadStudents();
    }
    if (sectionId === 'modificar-ee') {
        renderModEEList();
    }
}

// CRUD
async function loadCatalog() {
    try {
        const res = await fetch('/api/materias');
        catalogData = await res.json();
    } catch (err) {
        console.error('Error al cargar catálogo:', err);
    }
}

async function loadStudents() {
    try {
        const res = await fetch('/api/estudiantes');
        studentsData = await res.json();
        renderStudentsTable();
        renderModifyStudentsTable();
    } catch (err) {
        console.error('Error al cargar estudiantes:', err);
    }
}

// lista estudiantes
function renderStudentsTable() {
    const tbody = document.getElementById('tbody-estudiantes');
    if (!tbody) return;
    tbody.innerHTML = '';
    studentsData.forEach(est => {
        const tr = document.createElement('tr');
        tr.className = 'clickable-row';
        if (est.matricula === activeStudentMatricula) tr.classList.add('selected');
        tr.innerHTML = `
            <td>${est.nombre}</td>
            <td>${est.carrera}</td>
            <td>${est.matricula}</td>
            <td>${est.semestre}</td>
        `;
        tr.onclick = () => {
            document.querySelectorAll('#tbody-estudiantes tr').forEach(r => r.classList.remove('selected'));
            tr.classList.add('selected');
            activeStudentMatricula = est.matricula;
            document.getElementById('selected-matricula').value = `${est.matricula} - ${est.nombre}`;
        };
        tbody.appendChild(tr);
    });
}

// calcular promedio
async function abrirPromedio() {
    if (!activeStudentMatricula) {
        alert('Por favor selecciona un estudiante de la lista haciendo clic en su fila.');
        return;
    }
    const est = studentsData.find(e => e.matricula === activeStudentMatricula);
    if (!est) return;
    await loadCatalog(); 
    document.getElementById('prom-nombre').textContent = est.nombre;
    document.getElementById('prom-carrera').textContent = est.carrera;
    const tbody = document.getElementById('tbody-materias');
    tbody.innerHTML = '';
    let totalCreditos = 0;
    let sumaPonderada = 0;
    let totalMateriasValidas = 0;
    catalogData.forEach(m => {
        const califNum = parseFloat(m.calificacion);
        const esValida = !isNaN(califNum) && m.calificacion !== 'AC';
        if (esValida) {
            
            totalCreditos += parseFloat(m.creditos) || 0;
            sumaPonderada += (parseFloat(m.creditos) || 0) * califNum;
            totalMateriasValidas++;
        }
        tbody.innerHTML += `
            <tr>
                <td>${m.nombre}</td>
                <td>${m.creditos}</td>
                <td>${esValida ? califNum.toFixed(1) : m.calificacion}</td>
            </tr>
        `;
    });
    const promedio = totalCreditos > 0 ? (sumaPonderada / totalCreditos).toFixed(2) : '0.00';
    document.getElementById('total-creditos').textContent = totalCreditos;
    document.getElementById('total-ee').textContent = catalogData.length;
    document.getElementById('promedio-final').textContent = promedio;
    showSection('detalle-promedio');
}

// EE
function abrirAgregarEE() {
    showSection('registro-ee');
}

function renderModEEList() {
    const tbody = document.getElementById('tbody-mod-ee');
    if (!tbody) return;
    tbody.innerHTML = '';
    catalogData.forEach(m => {
        const tr = document.createElement('tr');
        tr.className = 'clickable-row';
        tr.innerHTML = `
            <td>${m.nombre}</td>
            <td>${m.creditos}</td>
            <td>${m.calificacion}</td>
        `;
        tr.onclick = () => {
            document.querySelectorAll('#tbody-mod-ee tr').forEach(r => r.classList.remove('selected'));
            tr.classList.add('selected');
            activeEEId = m.id;
            document.getElementById('edit-ee-id').value = m.id;
            document.getElementById('edit-ee-nombre').value = m.nombre;
            document.getElementById('edit-ee-creditos').value = m.creditos;
            document.getElementById('edit-ee-calificacion').value = m.calificacion;
        };
        tbody.appendChild(tr);
    });
}

function setupForms() {
    // nuevo estudiante
    const formEst = document.getElementById('form-estudiante');
    if (formEst) {
        formEst.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                nombre: document.getElementById('add-nombre').value.trim(),
                carrera: document.getElementById('add-carrera').value.trim(),
                matricula: document.getElementById('add-matricula').value.trim(),
                semestre: document.getElementById('add-semestre').value.trim()
            };
            const res = await fetch('/api/estudiantes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                alert('Estudiante registrado correctamente.');
                formEst.reset();
                await loadStudents();
                showSection('lista-estudiantes');
            } else {
                const data = await res.json();
                alert(data.error || 'Error al guardar.');
            }
        });
    }

    // nueva EE
    const formEE = document.getElementById('form-ee');
    if (formEE) {
        formEE.addEventListener('submit', async (e) => {
            e.preventDefault();
            const califVal = document.getElementById('ee-calificacion').value.trim();
            const payload = {
                nombre: document.getElementById('ee-nombre').value.trim(),
                creditos: document.getElementById('ee-creditos').value.trim(),
                calificacion: califVal.toUpperCase() === 'AC' ? 'AC' : califVal
            };
            const res = await fetch('/api/materias', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                alert('Experiencia Educativa guardada.');
                formEE.reset();
                await loadCatalog();
                showSection('lista-estudiantes');
            }
        });
    }

    // modificar EE
    const formEditEE = document.getElementById('form-edit-ee');
    if (formEditEE) {
        formEditEE.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('edit-ee-id').value;
            if (!id) return alert('Selecciona una materia de la tabla.');
            const califVal = document.getElementById('edit-ee-calificacion').value.trim();
            const payload = {
                nombre: document.getElementById('edit-ee-nombre').value.trim(),
                creditos: document.getElementById('edit-ee-creditos').value.trim(),
                calificacion: califVal.toUpperCase() === 'AC' ? 'AC' : califVal
            };
            const res = await fetch(`/api/materias/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                alert('Experiencia Educativa modificada correctamente.');
                await loadCatalog();
                renderModEEList();
            }
        });
    }

    // modificar Alumno
    const formEditAlumno = document.getElementById('form-edit-alumno');
    if (formEditAlumno) {
        formEditAlumno.addEventListener('submit', async (e) => {
            e.preventDefault();
            const matricula = document.getElementById('edit-original-matricula').value;
            if (!matricula) return alert('Selecciona un alumno de la tabla.');
            const payload = {
                nombre: document.getElementById('edit-alumno-nombre').value.trim(),
                carrera: document.getElementById('edit-alumno-carrera').value.trim(),
                semestre: document.getElementById('edit-alumno-semestre').value.trim()
            };
            const res = await fetch(`/api/estudiantes/${matricula}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                alert('Datos del alumno actualizados.');
                await loadStudents();
            }
        });
    }
}

function renderModifyStudentsTable() {
    const tbody = document.getElementById('tbody-mod-alumnos');
    if (!tbody) return;
    tbody.innerHTML = '';
    studentsData.forEach(est => {
        const tr = document.createElement('tr');
        tr.className = 'clickable-row';
        tr.innerHTML = `
            <td>${est.nombre}</td>
            <td>${est.carrera}</td>
            <td>${est.matricula}</td>
        `;
        tr.onclick = () => {
            document.querySelectorAll('#tbody-mod-alumnos tr').forEach(r => r.classList.remove('selected'));
            tr.classList.add('selected');
            document.getElementById('edit-original-matricula').value = est.matricula;
            document.getElementById('edit-alumno-nombre').value = est.nombre;
            document.getElementById('edit-alumno-carrera').value = est.carrera;
            document.getElementById('edit-alumno-semestre').value = est.semestre;
        };
        tbody.appendChild(tr);
    });
}

async function abrirEliminarEstudiante() {
    const matricula = prompt('Ingresa la matrícula del estudiante a eliminar:');
    if (!matricula) return;

    const res = await fetch(`/api/estudiantes/${matricula.trim()}`, { method: 'DELETE' });
    if (res.ok) {
        alert('Estudiante eliminado.');
        await loadStudents();
        showSection('lista-estudiantes');
    } else {
        alert('No se encontró al estudiante.');
    }
}

async function abrirEliminarEE() {
    if (catalogData.length === 0) return alert('No hay EE registradas.');
    const listaStr = catalogData.map((m, i) => `${i + 1}. ${m.nombre} (ID: ${m.id})`).join('\n');
    const seleccion = prompt(`Ingresa el número de la materia a eliminar:\n\n${listaStr}`);
    const index = parseInt(seleccion) - 1;
    if (catalogData[index]) {
        const res = await fetch(`/api/materias/${catalogData[index].id}`, { method: 'DELETE' });
        if (res.ok) {
            alert('Experiencia Educativa eliminada.');
            await loadCatalog();
            showSection('lista-estudiantes');
        }
    }
}