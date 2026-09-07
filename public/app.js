let studentsData = [];
let activeStudentMatricula = null;
let activeEditStudentMatricula = null;

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
        renderStudentSelectionList();
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

    const formEE = document.getElementById('form-ee');
    if (formEE) {
        formEE.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!activeStudentMatricula) return alert('No hay estudiante seleccionado.');
            const payload = {
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
                alert('Experiencia Educativa guardada.');
                formEE.reset();
                abrirPromedio();
            }
        });
    }

    const formEditEE = document.getElementById('form-edit-ee');
    if (formEditEE) {
        formEditEE.addEventListener('submit', async (e) => {
            e.preventDefault();
            const idInscripcion = document.getElementById('edit-ee-id').value;
            if (!idInscripcion) return alert('Selecciona una materia de la tabla.');
            const payload = {
                nombre: document.getElementById('edit-ee-nombre').value.trim(),
                creditos: document.getElementById('edit-ee-creditos').value.trim(),
                calificacion: document.getElementById('edit-ee-calificacion').value.trim()
            };
            const res = await fetch(`/api/inscripciones/${encodeURIComponent(idInscripcion)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                alert('Materia actualizada con éxito.');
                await cargarEEDeEstudiante(activeEditStudentMatricula);
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
                alert('Datos del alumno actualizados en la base de datos.');
                await loadStudents();
                renderModifyStudentsTable();
            } else {
                alert('Error al actualizar datos del alumno.');
            }
        });
    }
}

function renderStudentSelectionList() {
    const container = document.getElementById('list-students-ee');
    if (!container) return;
    container.innerHTML = '';
    studentsData.forEach(est => {
        const div = document.createElement('div');
        div.className = 'selection-item';
        div.textContent = est.nombre;
        div.onclick = () => {
            document.querySelectorAll('.selection-item').forEach(i => i.classList.remove('active'));
            div.classList.add('active');
            activeEditStudentMatricula = est.matricula;
            cargarEEDeEstudiante(est.matricula);
        };
        container.appendChild(div);
    });
}

async function cargarEEDeEstudiante(matricula) {
    try {
        const res = await fetch(`/api/estudiantes/${encodeURIComponent(matricula)}/kardex`);
        const data = await res.json();
        const tbody = document.getElementById('tbody-mod-ee');
        if (!tbody) return;
        tbody.innerHTML = '';
        data.materias.forEach(m => {
            const tr = document.createElement('tr');
            tr.className = 'clickable-row';
            tr.innerHTML = `<td>${m.nombre}</td><td>${m.creditos}</td><td>${m.calificacion}</td>`;
            tr.onclick = () => {
                document.querySelectorAll('#tbody-mod-ee tr').forEach(r => r.classList.remove('selected'));
                tr.classList.add('selected');
                document.getElementById('edit-ee-id').value = m.id_inscripcion;
                document.getElementById('edit-ee-nombre').value = m.nombre;
                document.getElementById('edit-ee-creditos').value = m.creditos;
                document.getElementById('edit-ee-calificacion').value = m.calificacion;
            };
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Error al cargar materias:', err);
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

async function abrirEliminarEstudiante() {
    const matricula = prompt('Ingresa la matrícula del estudiante a eliminar:');
    if (!matricula) return;
    const res = await fetch(`/api/estudiantes/${encodeURIComponent(matricula.trim())}`, { method: 'DELETE' });
    if (res.ok) {
        alert('Estudiante eliminado.');
        await loadStudents();
    } else {
        alert('Estudiante no encontrado.');
    }
}

async function abrirEliminarEE() {
    const matricula = prompt('Ingresa la matrícula del estudiante:');
    if (!matricula) return;
    const res = await fetch(`/api/estudiantes/${encodeURIComponent(matricula.trim())}/kardex`);
    if (!res.ok) return alert('Estudiante no encontrado.');
    const data = await res.json();
    if (data.materias.length === 0) return alert('El estudiante no tiene materias cursadas.');
    const lista = data.materias.map((m, idx) => `${idx + 1}. [NRC: ${m.nrc}] ${m.nombre}`).join('\n');
    const seleccion = prompt(`Selecciona el número de la materia a eliminar:\n\n${lista}`);
    const index = parseInt(seleccion) - 1;
    if (data.materias[index]) {
        const resDel = await fetch(`/api/inscripciones/${encodeURIComponent(data.materias[index].id_inscripcion)}`, { method: 'DELETE' });
        if (resDel.ok) {
            alert('Experiencia Educativa eliminada.');
        }
    }
}