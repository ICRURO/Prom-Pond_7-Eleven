/**
 * Representa un estudiante registrado en el sistema.
 * @typedef {Object} Estudiante
 * @property {string} matricula - La matrícula única del estudiante (ej. "S22019384").
 * @property {string} nombre - El nombre completo del estudiante.
 * @property {string} carrera - El nombre y siglas de la carrera que cursa (ej. "Ingeniería en Ciencias de Datos (LICID)").
 * @property {string} semestre - El semestre actual del estudiante (ej. "9°").
 */

/**
 * Representa una experiencia educativa (materia) en el catálogo.
 * @typedef {Object} ExperienciaEducativa
 * @property {string} nrc - El Número de Referencia del Curso (NRC).
 * @property {string} nombre - El nombre de la materia (ej. "Lengua I").
 * @property {string} carrera - Las siglas de la carrera o área a la que pertenece (ej. "AFBG").
 * @property {number} creditos - El valor en créditos de la materia, necesario para el promedio ponderado.
 */

/**
 * Representa el registro de una calificación de un estudiante en una materia específica.
 * @typedef {Object} Inscripcion
 * @property {string} id - El identificador único del registro de inscripción.
 * @property {string} matricula - La matrícula del estudiante que cursó la materia.
 * @property {string} nrc - El NRC de la experiencia educativa cursada.
 * @property {number|string} calificacion - La calificación obtenida (puede ser numérica como 8.5, o en texto como "AC").
 */

/**
 * Representa la estructura completa del archivo database.json.
 * @typedef {Object} BaseDeDatos
 * @property {Estudiante[]} estudiantes - Lista de todos los estudiantes.
 * @property {ExperienciaEducativa[]} experiencias_educativas - Catálogo de todas las materias disponibles.
 * @property {Inscripcion[]} inscripciones - Historial de todas las calificaciones obtenidas.
 */