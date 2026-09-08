let studentsData = [];
let activeStudentMatricula = null;

document.addEventListener('DOMContentLoaded', () => {
    loadStudents();
    setupForms();
    setupSearch();
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
        console.error('Error al cargar alumnos:', err);
    }
}

function setupSearch() {
    const searchInput = document.getElementById('search-estudiantes');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase().trim();
            const filtrados = studentsData.filter(est => 
                est.nombre.toLowerCase().includes(term) || 
                est.matricula.toLowerCase().includes(term)
            );
            renderStudentsTable(filtrados);
        });
    }
}

function renderStudentsTable(lista = studentsData) {
    const tbody = document.getElementById('tbody-estudiantes');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="color: #94a3b8; text-align: center; padding: 1rem;">No se encontraron coincidencias</td></tr>`;
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

async function abrirAgregarEE() {
    if (!activeStudentMatricula) {
        alert('Por favor selecciona un estudiante en la tabla.');
        return;
    }
    const est = studentsData.find(e => e.matricula === activeStudentMatricula);
    const info = document.getElementById('ee-student-info');
    if (info) info.textContent = `Estudiante: ${est.nombre} (${est.matricula})`;
    document.getElementById('ee-nrc').value = '';
    document.getElementById('ee-creditos').value = '';
    document.getElementById('ee-calificacion').value = '';
    try {
        const res = await fetch('/api/materias');
        const materias = await res.json();
        const select = document.getElementById('ee-select-materia');
        if (!select) return;
        select.innerHTML = '<option value="">-- Selecciona una EE --</option>';
        materias.forEach(m => {
            const option = document.createElement('option');
            option.value = m.nrc;
            option.textContent = `[${m.nrc}] ${m.nombre} (${m.creditos} créditos)`;
            option.dataset.creditos = m.creditos;
            select.appendChild(option);
        });
        select.onchange = () => {
            const selectedOpt = select.options[select.selectedIndex];
            if (select.value) {
                document.getElementById('ee-nrc').value = select.value;
                document.getElementById('ee-creditos').value = selectedOpt.dataset.creditos || '';
            } else {
                document.getElementById('ee-nrc').value = '';
                document.getElementById('ee-creditos').value = '';
            }
        };
        showSection('registro-ee');
    } catch (err) {
        console.error('Error cargando materias:', err);
    }
}

async function abrirQuitarEE() {
    if (!activeStudentMatricula) {
        alert('Por favor selecciona un estudiante en la tabla.');
        return;
    }
    try {
        const res = await fetch(`/api/estudiantes/${encodeURIComponent(activeStudentMatricula)}/kardex`);
        if (!res.ok) throw new Error('No se pudo obtener el kardex');
        const data = await res.json();
        document.getElementById('remove-ee-student-info').textContent =
            `Estudiante: ${data.estudiante.nombre} (${data.estudiante.matricula})`;
        renderQuitarEETable(data.materias);
        showSection('quitar-ee');
    } catch (err) {
        alert('Error al cargar las EE del estudiante.');
        console.error(err);
    }
}

function renderQuitarEETable(materias) {
    const tbody = document.getElementById('tbody-quitar-ee');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (materias.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="color: #94a3b8; text-align: center; padding: 1rem;">Este estudiante no tiene EE registradas</td></tr>';
        return;
    }
    materias.forEach(materia => {
        const tr = document.createElement('tr');
        const calificacion = String(materia.calificacion).toUpperCase() === 'AC'
            ? 'AC'
            : Number(materia.calificacion).toFixed(1);
        tr.innerHTML = `
            <td>${materia.nrc}</td>
            <td>${materia.nombre}</td>
            <td>${materia.creditos}</td>
            <td>${calificacion}</td>
            <td><button class="btn-delete" onclick="confirmarQuitarEE('${materia.id_inscripcion}', '${materia.nombre.replace(/'/g, "\\'")}')">Quitar</button></td>
        `;
        tbody.appendChild(tr);
    });
}

async function confirmarQuitarEE(idInscripcion, nombreEE) {
    if (!confirm(`¿Deseas quitar "${nombreEE}" del historial de este estudiante?`)) return;
    try {
        const res = await fetch(`/api/inscripciones/${encodeURIComponent(idInscripcion)}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('No se pudo quitar la EE');
        alert('Experiencia Educativa quitada del historial.');
        abrirQuitarEE();
    } catch (err) {
        alert('Error al quitar la Experiencia Educativa.');
        console.error(err);
    }
}

function abrirCatalogoCrearEE() {
    showSection('crear-ee-catalogo');
}

function setupForms() {
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
                alert('Experiencia Educativa añadida al catálogo.');
                formCrearEE.reset();
                showSection('modificar-ee');
                renderModificarEE();
            } else {
                const err = await res.json();
                alert(err.error || 'Error al guardar EE.');
            }
        });
    }

    const formEE = document.getElementById('form-ee');
    if (formEE) {
        formEE.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!activeStudentMatricula) return alert('No hay estudiante seleccionado.');
            const nrc = document.getElementById('ee-nrc').value.trim();
            const calificacion = document.getElementById('ee-calificacion').value.trim();
            if (!nrc) return alert('Selecciona una materia del listado.');
            const res = await fetch(`/api/estudiantes/${encodeURIComponent(activeStudentMatricula)}/kardex`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nrc, calificacion })
            });
            if (res.ok) {
                alert('Materia agregada exitosamente al historial del estudiante.');
                formEE.reset();
                abrirPromedio();
            } else {
                const data = await res.json();
                alert(data.error || 'Error al inscribir materia.');
            }
        });
    }
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
                alert('Error al modificar materia.');
            }
        });
    }
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
            const selInput = document.getElementById('selected-matricula');
            if (selInput) selInput.value = '';
        }
        await loadStudents();
        mostrarPantallaEliminarEstudiante();
    } else {
        alert('Error al eliminar estudiante.');
    }
}

async function mostrarPantallaEliminarEE() {
    try {
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
    } catch (err) {
        console.error('Error al cargar materias para eliminar:', err);
    }
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
        alert('Error al eliminar materia.');
    }
}