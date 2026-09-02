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
        const data = fs.readFileSync(DB_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error al leer la base de datos:', error);
        return { estudiantes: [], catalogo_ee: [] };
    }
};

const writeDB = (data) => {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
        console.error('Error al escribir en la base de datos:', error);
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
        return res.status(400).json({ error: 'La matrícula y el nombre son obligatorios.' });
    }
    if (db.estudiantes.some(e => e.matricula === matricula)) {
        return res.status(400).json({ error: 'La matrícula ya está registrada.' });
    }
    const nuevoEstudiante = {
        matricula,
        nombre,
        carrera: carrera || '',
        semestre: semestre || '',
        historial_academico: []
    };
    db.estudiantes.push(nuevoEstudiante);
    writeDB(db);
    res.status(201).json(nuevoEstudiante);
});

app.put('/api/estudiantes/:matricula', (req, res) => {
    const { matricula } = req.params;
    const { nombre, carrera, semestre } = req.body;
    const db = readDB();
    const index = db.estudiantes.findIndex(e => e.matricula === matricula);
    if (index === -1) {
        return res.status(404).json({ error: 'Estudiante no encontrado.' });
    }
    db.estudiantes[index] = {
        ...db.estudiantes[index],
        nombre: nombre || db.estudiantes[index].nombre,
        carrera: carrera || db.estudiantes[index].carrera,
        semestre: semestre || db.estudiantes[index].semestre
    };
    writeDB(db);
    res.json(db.estudiantes[index]);
});

app.delete('/api/estudiantes/:matricula', (req, res) => {
    const { matricula } = req.params;
    let db = readDB();
    const existe = db.estudiantes.some(e => e.matricula === matricula);
    if (!existe) {
        return res.status(404).json({ error: 'Estudiante no encontrado.' });
    }
    db.estudiantes = db.estudiantes.filter(e => e.matricula !== matricula);
    writeDB(db);
    res.json({ success: true, message: 'Estudiante eliminado correctamente.' });
});

app.get('/api/materias', (req, res) => {
    const db = readDB();
    res.json(db.catalogo_ee || []);
});

app.post('/api/materias', (req, res) => {
    const { nombre, creditos, calificacion } = req.body;
    const db = readDB();
    if (!nombre || creditos === undefined) {
        return res.status(400).json({ error: 'Nombre y créditos son requeridos.' });
    }
    const nuevaEE = {
        id: Date.now().toString(),
        nombre,
        creditos: parseFloat(creditos),
        calificacion: calificacion === 'AC' ? 'AC' : parseFloat(calificacion) || 0
    };
    if (!db.catalogo_ee) db.catalogo_ee = [];
    db.catalogo_ee.push(nuevaEE);
    writeDB(db);
    res.status(201).json(nuevaEE);
});

app.put('/api/materias/:id', (req, res) => {
    const { id } = req.params;
    const { nombre, creditos, calificacion } = req.body;
    const db = readDB();
    const index = db.catalogo_ee.findIndex(m => m.id === id);
    if (index === -1) {
        return res.status(404).json({ error: 'Experiencia Educativa no encontrada.' });
    }
    db.catalogo_ee[index] = {
        id,
        nombre: nombre || db.catalogo_ee[index].nombre,
        creditos: creditos !== undefined ? parseFloat(creditos) : db.catalogo_ee[index].creditos,
        calificacion: calificacion === 'AC' ? 'AC' : (parseFloat(calificacion) || db.catalogo_ee[index].calificacion)
    };
    writeDB(db);
    res.json(db.catalogo_ee[index]);
});

app.delete('/api/materias/:id', (req, res) => {
    const { id } = req.params;
    let db = readDB();
    if (!db.catalogo_ee) return res.status(404).json({ error: 'Catálogo vacío.' });
    db.catalogo_ee = db.catalogo_ee.filter(m => m.id !== id);
    writeDB(db);
    res.json({ success: true, message: 'Experiencia Educativa eliminada.' });
});

app.listen(PORT, () => {
    console.log(`  http://localhost:${PORT}`);
});