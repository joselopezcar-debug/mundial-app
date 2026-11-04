const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./mundial.db');

db.serialize(() => {
  // Tabla de Usuarios
  db.run(`CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    racha_actual INTEGER DEFAULT 0
  )`);

  // Tabla de Partidos
  db.run(`CREATE TABLE IF NOT EXISTS partidos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipo_local TEXT NOT NULL,
    equipo_visitante TEXT NOT NULL,
    goles_local INTEGER DEFAULT NULL,
    goles_visitante INTEGER DEFAULT NULL,
    fecha_inicio DATETIME NOT NULL,
    estado TEXT DEFAULT 'PENDIENTE'
  )`);

  // Tabla de Salas (Grupos)
  db.run(`CREATE TABLE IF NOT EXISTS salas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    codigo_invitacion TEXT UNIQUE NOT NULL,
    creador_id INTEGER NOT NULL
  )`);

  // Relación Usuarios <-> Salas
  db.run(`CREATE TABLE IF NOT EXISTS miembros_sala (
    sala_id INTEGER,
    usuario_id INTEGER,
    puntos INTEGER DEFAULT 0,
    PRIMARY KEY (sala_id, usuario_id)
  )`);

  // Tabla de Predicciones
  db.run(`CREATE TABLE IF NOT EXISTS predicciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    partido_id INTEGER NOT NULL,
    goles_local_pred INTEGER NOT NULL,
    goles_visitante_pred INTEGER NOT NULL,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    puntos_obtenidos INTEGER DEFAULT 0,
    UNIQUE(usuario_id, partido_id)
  )`);
});

module.exports = db;