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
    const nuevo = {
        matricula: matricula.trim().toUpperCase(),
        nombre: nombre.trim(),
        carrera: carrera.trim(),
        semestre: (semestre || '').trim()
    };
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

app.get('/api/materias', (req, res) => {
    const db = readDB();
    res.json(db.experiencias_educativas || []);
});

app.post('/api/materias', (req, res) => {
    const { nrc, nombre, carrera, creditos } = req.body;
    const db = readDB();
    const nrcLimpio = String(nrc).trim();
    if (!nrcLimpio || !nombre || creditos === undefined) {
        return res.status(400).json({ error: 'NRC, nombre y créditos son requeridos.' });
    }
    if (db.experiencias_educativas.some(e => String(e.nrc) === nrcLimpio)) {
        return res.status(400).json({ error: 'El NRC ya existe en el catálogo.' });
    }
    const nuevaEE = {
        nrc: nrcLimpio,
        nombre: nombre.trim(),
        carrera: carrera ? carrera.trim().toUpperCase() : 'GENERAL',
        creditos: parseFloat(creditos)
    };
    db.experiencias_educativas.push(nuevaEE);
    writeDB(db);
    res.status(201).json(nuevaEE);
});

app.put('/api/materias/:nrc', (req, res) => {
    const nrcParam = String(req.params.nrc).trim();
    const { nombre, carrera, creditos } = req.body;
    const db = readDB();
    const ee = db.experiencias_educativas.find(e => String(e.nrc) === nrcParam);
    if (!ee) return res.status(404).json({ error: 'Experiencia Educativa no encontrada.' });
    if (nombre) ee.nombre = nombre.trim();
    if (carrera) ee.carrera = carrera.trim().toUpperCase();
    if (creditos !== undefined) ee.creditos = parseFloat(creditos);
    writeDB(db);
    res.json({ success: true, ee });
});

app.delete('/api/materias/:nrc', (req, res) => {
    const nrcParam = String(req.params.nrc).trim();
    let db = readDB();
    db.experiencias_educativas = db.experiencias_educativas.filter(e => String(e.nrc) !== nrcParam);
    db.inscripciones = db.inscripciones.filter(i => String(i.nrc) !== nrcParam);
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
    const { nrc, calificacion } = req.body;
    const db = readDB();
    const nrcLimpio = String(nrc).trim();
    const ee = db.experiencias_educativas.find(e => String(e.nrc) === nrcLimpio);
    if (!ee) {
        return res.status(404).json({ error: 'La materia seleccionada no existe en el catálogo.' });
    }
    const yaInscrita = db.inscripciones.some(
        i => i.matricula.trim().toUpperCase() === matriculaParam && String(i.nrc) === nrcLimpio
    );
    if (yaInscrita) {
        return res.status(400).json({ error: 'El estudiante ya tiene cursada o inscrita esta materia.' });
    }
    const nuevaInscripcion = {
        id: String(Date.now()),
        matricula: matriculaParam,
        nrc: nrcLimpio,
        calificacion: calificacion.toString().toUpperCase() === 'AC' ? 'AC' : parseFloat(calificacion)
    };
    db.inscripciones.push(nuevaInscripcion);
    writeDB(db);
    res.status(201).json(nuevaInscripcion);
});

app.delete('/api/inscripciones/:id', (req, res) => {
    const idParam = String(req.params.id);
    let db = readDB();
    db.inscripciones = db.inscripciones.filter(i => String(i.id) !== idParam);
    writeDB(db);
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`http://localhost:${PORT}`);
});