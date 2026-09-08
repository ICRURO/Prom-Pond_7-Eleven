let studentsData = [];
let activeStudentMatricula = null;

document.addEventListener('DOMContentLoaded', () => {
    loadStudents();
    setupForms();
});

function showSection(sectionId) {
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.add('hidden'));
    const target = document.getElementById(sectionId);
    if (target) target.classList.remove('hidden');

    if (sectionId === 'lista-estudiantes') {
        loadStudents();
    }
    if (sectionId === 'modificar-alumno') {
        renderModifyStudentsTable();
    }
    if (sectionId === 'modificar-ee') {
        renderModificarEE();
    }
}

async function loadStudents() {
    try {
        const res = await fetch('/api/estudiantes');
        studentsData = await res.json();
        renderStudentsTable();
        renderModifyStudentsTable();
    } catch (err) {
        console.error('Error al cargar datos:', err);
    }
}

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

            const selInput = document.getElementById('selected-matricula');
            if (selInput) selInput.value = `${est.matricula} - ${est.nombre}`;
        };
        tbody.appendChild(tr);
    });
}

// ==================== CÁLCULO DE PROMEDIO ==================== //

async function abrirPromedio() {
    if (!activeStudentMatricula) {
        alert('Por favor selecciona un estudiante en la tabla.');
        return;
    }

    try {
        const res = await fetch(`/api/estudiantes/${encodeURIComponent(activeStudentMatricula)}/kardex`);
        if (!res.ok) throw new Error('No se pudo obtener el kardex');
        const data = await res.json();

        document.getElementById('prom-nombre').textContent = data.estudiante.nombre;
        document.getElementById('prom-carrera').textContent = data.estudiante.carrera;

        const tbody = document.getElementById('tbody-materias');
        tbody.innerHTML = '';

        let totalCreditos = 0;
        let sumaPonderada = 0;

        data.materias.forEach(m => {
            const creditos = parseFloat(m.creditos) || 0;
            const esAC = String(m.calificacion).toUpperCase() === 'AC';
            const califNum = esAC ? 10.0 : (parseFloat(m.calificacion) || 0);

            totalCreditos += creditos;
            sumaPonderada += creditos * califNum;

            tbody.innerHTML += `
                <tr>
                    <td>${m.nombre}</td>
                    <td>${m.creditos}</td>
                    <td>${esAC ? 'AC (10.0)' : califNum.toFixed(1)}</td>
                </tr>
            `;
        });

        const promedio = totalCreditos > 0 ? (sumaPonderada / totalCreditos).toFixed(2) : '0.00';

        document.getElementById('total-creditos').textContent = totalCreditos;
        document.getElementById('total-ee').textContent = data.materias.length;
        document.getElementById('promedio-final').textContent = promedio;

        showSection('detalle-promedio');
    } catch (err) {
        alert('Error al calcular promedio ponderado.');
        console.error(err);
    }
}

function abrirAgregarEE() {
    if (!activeStudentMatricula) {
        alert('Por favor selecciona un estudiante en la tabla.');
        return;
    }
    const est = studentsData.find(e => e.matricula === activeStudentMatricula);
    const info = document.getElementById('ee-student-info');
    if (info) info.textContent = `Estudiante: ${est.nombre} (${est.matricula})`;
    showSection('registro-ee');
}

function abrirCatalogoCrearEE() {
    showSection('crear-ee-catalogo');
}

// ==================== FORMULARIOS Y CRUD ==================== //

function setupForms() {
    // 1. Guardar nuevo estudiante
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
                alert('Estudiante registrado con éxito.');
                formEst.reset();
                await loadStudents();
                showSection('lista-estudiantes');
            } else {
                const data = await res.json();
                alert(data.error || 'Error al guardar');
            }
        });
    }

    // 2. Guardar nueva EE en Catálogo
    const formCrearEE = document.getElementById('form-crear-ee');
    if (formCrearEE) {
        formCrearEE.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                nrc: document.getElementById('catalogo-ee-nrc').value.trim(),
                nombre: document.getElementById('catalogo-ee-nombre').value.trim(),
                carrera: document.getElementById('catalogo-ee-carrera').value.trim(),
                creditos: document.getElementById('catalogo-ee-creditos').value.trim()
            };

            const res = await fetch('/api/materias', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert('Experiencia Educativa añadida exitosamente al catálogo.');
                formCrearEE.reset();
                showSection('modificar-ee');
                renderModificarEE();
            } else {
                const err = await res.json();
                alert(err.error || 'Error al guardar EE.');
            }
        });
    }

    // 3. Agregar EE al historial de un Alumno
    const formEE = document.getElementById('form-ee');
    if (formEE) {
        formEE.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!activeStudentMatricula) return alert('No hay estudiante seleccionado.');

            const payload = {
                nrc: document.getElementById('ee-nrc').value.trim(),
                nombre: document.getElementById('ee-nombre').value.trim(),
                creditos: document.getElementById('ee-creditos').value.trim(),
                calificacion: document.getElementById('ee-calificacion').value.trim()
            };

            const res = await fetch(`/api/estudiantes/${encodeURIComponent(activeStudentMatricula)}/kardex`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert('Experiencia Educativa guardada en el historial.');
                formEE.reset();
                abrirPromedio();
            }
        });
    }

    // 4. Modificar EE del Catálogo (Nombre, Carrera y Créditos)
    const formEditEE = document.getElementById('form-edit-ee');
    if (formEditEE) {
        formEditEE.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nrc = document.getElementById('edit-ee-nrc').value.trim();
            if (!nrc) return alert('Selecciona una materia de la tabla para editar.');

            const payload = {
                nombre: document.getElementById('edit-ee-nombre').value.trim(),
                carrera: document.getElementById('edit-ee-carrera').value.trim(),
                creditos: document.getElementById('edit-ee-creditos').value.trim()
            };

            const res = await fetch(`/api/materias/${encodeURIComponent(nrc)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert('Experiencia Educativa actualizada con éxito.');
                renderModificarEE();
            } else {
                alert('Error al modificar la materia.');
            }
        });
    }

    // 5. Modificar Datos de Alumno
    const formEditAlumno = document.getElementById('form-edit-alumno');
    if (formEditAlumno) {
        formEditAlumno.addEventListener('submit', async (e) => {
            e.preventDefault();
            const matricula = document.getElementById('edit-original-matricula').value.trim();
            if (!matricula) return alert('Selecciona un alumno de la tabla.');

            const semInput = document.getElementById('edit-alumno-semestre');
            const payload = {
                nombre: document.getElementById('edit-alumno-nombre').value.trim(),
                carrera: document.getElementById('edit-alumno-carrera').value.trim(),
                semestre: semInput ? semInput.value.trim() : undefined
            };

            const res = await fetch(`/api/estudiantes/${encodeURIComponent(matricula)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert('Datos del alumno actualizados.');
                await loadStudents();
                renderModifyStudentsTable();
            } else {
                alert('Error al actualizar datos del alumno.');
            }
        });
    }
}

// ==================== LISTAS DE MODIFICACIÓN ==================== //

async function renderModificarEE() {
    try {
        const res = await fetch('/api/materias');
        const materias = await res.json();

        const tbody = document.getElementById('tbody-mod-ee');
        if (!tbody) return;
        tbody.innerHTML = '';

        materias.forEach(m => {
            const tr = document.createElement('tr');
            tr.className = 'clickable-row';
            tr.innerHTML = `
                <td>${m.nrc}</td>
                <td>${m.nombre}</td>
                <td>${m.carrera}</td>
                <td>${m.creditos}</td>
            `;
            tr.onclick = () => {
                document.querySelectorAll('#tbody-mod-ee tr').forEach(r => r.classList.remove('selected'));
                tr.classList.add('selected');
                document.getElementById('edit-ee-nrc').value = m.nrc;
                document.getElementById('edit-ee-nombre').value = m.nombre;
                document.getElementById('edit-ee-carrera').value = m.carrera;
                document.getElementById('edit-ee-creditos').value = m.creditos;
            };
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Error al cargar catálogo de EE:', err);
    }
}

function renderModifyStudentsTable() {
    const tbody = document.getElementById('tbody-mod-alumnos');
    if (!tbody) return;
    tbody.innerHTML = '';

    studentsData.forEach(est => {
        const tr = document.createElement('tr');
        tr.className = 'clickable-row';
        tr.innerHTML = `<td>${est.nombre}</td><td>${est.carrera}</td><td>${est.matricula}</td>`;
        tr.onclick = () => {
            document.querySelectorAll('#tbody-mod-alumnos tr').forEach(r => r.classList.remove('selected'));
            tr.classList.add('selected');
            document.getElementById('edit-original-matricula').value = est.matricula;
            document.getElementById('edit-alumno-nombre').value = est.nombre;
            document.getElementById('edit-alumno-carrera').value = est.carrera;
            const semInput = document.getElementById('edit-alumno-semestre');
            if (semInput) semInput.value = est.semestre || '';
        };
        tbody.appendChild(tr);
    });
}

// ==================== ELIMINAR ==================== //

async function abrirEliminarEstudiante() {
    const matricula = prompt('Ingresa la matrícula del estudiante a eliminar:');
    if (!matricula) return;

    const res = await fetch(`/api/estudiantes/${encodeURIComponent(matricula.trim())}`, { method: 'DELETE' });
    if (res.ok) {
        alert('Estudiante eliminado junto con su historial de inscripciones.');
        await loadStudents();
        showSection('lista-estudiantes');
    } else {
        alert('Estudiante no encontrado.');
    }
}

async function abrirEliminarEE() {
    const res = await fetch('/api/materias');
    const materias = await res.json();
    if (materias.length === 0) return alert('No hay EE en el catálogo.');

    const lista = materias.map((m, idx) => `${idx + 1}. [NRC: ${m.nrc}] ${m.nombre} (${m.carrera})`).join('\n');
    const seleccion = prompt(`Ingresa el número de la EE a eliminar del catálogo:\n\n${lista}`);
    const index = parseInt(seleccion) - 1;

    if (materias[index]) {
        const resDel = await fetch(`/api/materias/${encodeURIComponent(materias[index].nrc)}`, { method: 'DELETE' });
        if (resDel.ok) {
            alert('Experiencia Educativa eliminada del catálogo e inscripciones.');
            renderModificarEE();
        }
    }
}

// 1. Filtrado en tiempo real en la tabla de estudiantes
document.getElementById('search-estudiantes').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    const filtrados = studentsData.filter(est => 
        est.nombre.toLowerCase().includes(term) || 
        est.matricula.toLowerCase().includes(term)
    );
    renderStudentsTable(filtrados);
});

// Modifica renderStudentsTable para aceptar la lista filtrada
function renderStudentsTable(lista = studentsData) {
    const tbody = document.getElementById('tbody-estudiantes');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="color: #94a3b8;">No se encontraron coincidencias</td></tr>`;
        return;
    }

    lista.forEach(est => {
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

            const selInput = document.getElementById('selected-matricula');
            if (selInput) selInput.value = `${est.matricula} - ${est.nombre}`;
        };
        tbody.appendChild(tr);
    });
}

// 2. Pantalla y acción: Eliminar Estudiante
async function mostrarPantallaEliminarEstudiante() {
    await loadStudents();
    const tbody = document.getElementById('tbody-eliminar-estudiantes');
    if (!tbody) return;
    tbody.innerHTML = '';

    studentsData.forEach(est => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${est.matricula}</strong></td>
            <td>${est.nombre}</td>
            <td>${est.carrera}</td>
            <td>
                <button class="btn-delete" style="border-radius: 4px; padding: 0.4rem 0.8rem; width: auto; height: auto;" onclick="confirmarEliminarEstudiante('${est.matricula}', '${est.nombre}')">Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    showSection('eliminar-estudiante-view');
}

async function confirmarEliminarEstudiante(matricula, nombre) {
    if (!confirm(`¿Estás seguro de que deseas eliminar al estudiante ${nombre} (${matricula})? Esta acción no se puede deshacer.`)) {
        return;
    }

    const res = await fetch(`/api/estudiantes/${encodeURIComponent(matricula)}`, { method: 'DELETE' });
    if (res.ok) {
        alert('Estudiante eliminado.');
        if (activeStudentMatricula === matricula) {
            activeStudentMatricula = null;
            document.getElementById('selected-matricula').value = '';
        }
        await loadStudents();
        mostrarPantallaEliminarEstudiante();
    } else {
        alert('Error al eliminar estudiante.');
    }
}

// 3. Pantalla y acción: Eliminar Experiencia Educativa
async function mostrarPantallaEliminarEE() {
    const res = await fetch('/api/materias');
    const materias = await res.json();

    const tbody = document.getElementById('tbody-eliminar-ee');
    if (!tbody) return;
    tbody.innerHTML = '';

    materias.forEach(m => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${m.nrc}</strong></td>
            <td>${m.nombre}</td>
            <td>${m.carrera}</td>
            <td>${m.creditos}</td>
            <td>
                <button class="btn-delete" style="border-radius: 4px; padding: 0.4rem 0.8rem; width: auto; height: auto;" onclick="confirmarEliminarEE('${m.nrc}', '${m.nombre}')">Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    showSection('eliminar-ee-view');
}

async function confirmarEliminarEE(nrc, nombre) {
    if (!confirm(`¿Deseas eliminar del catálogo la materia "${nombre}" (NRC: ${nrc})?`)) {
        return;
    }

    const res = await fetch(`/api/materias/${encodeURIComponent(nrc)}`, { method: 'DELETE' });
    if (res.ok) {
        alert('Experiencia Educativa eliminada.');
        mostrarPantallaEliminarEE();
    } else {
        alert('Error al eliminar la materia.');
    }
}