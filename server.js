const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'data', 'database.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const readDB = () => {
    try {
        const raw = fs.readFileSync(DB_PATH, 'utf-8');
        return JSON.parse(raw);
    } catch (error) {
        return { estudiantes: [], experiencias_educativas: [], inscripciones: [] };
    }
};

const writeDB = (data) => {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
        return true;
    } catch (err) {
        console.error("Error escribiendo DB:", err);
        return false;
    }
};

app.get('/api/estudiantes', (req, res) => {
    const db = readDB();
    res.json(db.estudiantes || []);
});

app.post('/api/estudiantes', (req, res) => {
    const { matricula, nombre, carrera, semestre } = req.body;
    const db = readDB();
    if (!matricula || !nombre) {
        return res.status(400).json({ error: 'Matrícula y nombre son requeridos.' });
    }
    if (db.estudiantes.some(e => e.matricula.trim().toUpperCase() === matricula.trim().toUpperCase())) {
        return res.status(400).json({ error: 'La matrícula ya existe.' });
    }
    const nuevo = { matricula: matricula.trim().toUpperCase(), nombre: nombre.trim(), carrera: carrera.trim(), semestre: (semestre || '').trim() };
    db.estudiantes.push(nuevo);
    writeDB(db);
    res.status(201).json(nuevo);
});

app.put('/api/estudiantes/:matricula', (req, res) => {
    const matriculaParam = req.params.matricula.trim().toUpperCase();
    const { nombre, carrera, semestre } = req.body;
    const db = readDB();
    const idx = db.estudiantes.findIndex(e => e.matricula.trim().toUpperCase() === matriculaParam);
    if (idx === -1) return res.status(404).json({ error: 'Estudiante no encontrado.' });
    db.estudiantes[idx].nombre = nombre !== undefined ? nombre.trim() : db.estudiantes[idx].nombre;
    db.estudiantes[idx].carrera = carrera !== undefined ? carrera.trim() : db.estudiantes[idx].carrera;
    if (semestre !== undefined && semestre !== "") {
        db.estudiantes[idx].semestre = semestre.trim();
    }
    writeDB(db);
    res.json(db.estudiantes[idx]);
});

app.delete('/api/estudiantes/:matricula', (req, res) => {
    const matriculaParam = req.params.matricula.trim().toUpperCase();
    let db = readDB();
    db.estudiantes = db.estudiantes.filter(e => e.matricula.trim().toUpperCase() !== matriculaParam);
    db.inscripciones = db.inscripciones.filter(i => i.matricula.trim().toUpperCase() !== matriculaParam);
    writeDB(db);
    res.json({ success: true });
});

app.get('/api/estudiantes/:matricula/kardex', (req, res) => {
    const matriculaParam = req.params.matricula.trim().toUpperCase();
    const db = readDB();
    const estudiante = db.estudiantes.find(e => e.matricula.trim().toUpperCase() === matriculaParam);
    if (!estudiante) return res.status(404).json({ error: 'Estudiante no encontrado.' });
    const inscripcionesAlumno = db.inscripciones.filter(i => i.matricula.trim().toUpperCase() === matriculaParam);
    const materias = inscripcionesAlumno.map(ins => {
        const ee = db.experiencias_educativas.find(e => String(e.nrc) === String(ins.nrc));
        return {
            id_inscripcion: String(ins.id),
            nrc: ins.nrc,
            nombre: ee ? ee.nombre : 'Materia desconocida',
            carrera: ee ? ee.carrera : 'N/A',
            creditos: ee ? ee.creditos : 0,
            calificacion: ins.calificacion
        };
    });
    res.json({ estudiante, materias });
});

app.post('/api/estudiantes/:matricula/kardex', (req, res) => {
    const matriculaParam = req.params.matricula.trim().toUpperCase();
    const { nrc, nombre, creditos, calificacion } = req.body;
    const db = readDB();
    const nrcFinal = nrc ? String(nrc).trim() : String(Math.floor(10000 + Math.random() * 90000));
    let materiaExistente = db.experiencias_educativas.find(e => String(e.nrc) === nrcFinal);
    if (!materiaExistente) {
        materiaExistente = {
            nrc: nrcFinal,
            nombre: nombre.trim(),
            carrera: "GENERAL",
            creditos: parseFloat(creditos) || 0
        };
        db.experiencias_educativas.push(materiaExistente);
    }
    const nuevaInscripcion = {
        id: String(Date.now()),
        matricula: matriculaParam,
        nrc: nrcFinal,
        calificacion: calificacion.toString().toUpperCase() === 'AC' ? 'AC' : parseFloat(calificacion)
    };
    db.inscripciones.push(nuevaInscripcion);
    writeDB(db);
    res.status(201).json(nuevaInscripcion);
});

app.put('/api/inscripciones/:id', (req, res) => {
    const idParam = String(req.params.id);
    const { nombre, creditos, calificacion } = req.body;
    const db = readDB();
    const inscripcion = db.inscripciones.find(i => String(i.id) === idParam);
    if (!inscripcion) return res.status(404).json({ error: 'Inscripción no encontrada.' });
    if (calificacion !== undefined) {
        inscripcion.calificacion = calificacion.toString().toUpperCase() === 'AC' ? 'AC' : parseFloat(calificacion);
    }
    const ee = db.experiencias_educativas.find(e => String(e.nrc) === String(inscripcion.nrc));
    if (ee) {
        if (nombre) ee.nombre = nombre.trim();
        if (creditos !== undefined) ee.creditos = parseFloat(creditos);
    }
    writeDB(db);
    res.json({ success: true });
});

app.delete('/api/inscripciones/:id', (req, res) => {
    const idParam = String(req.params.id);
    let db = readDB();
    db.inscripciones = db.inscripciones.filter(i => String(i.id) !== idParam);
    writeDB(db);
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Sistema Halcón Ponderado activo en http://localhost:${PORT}`);
});