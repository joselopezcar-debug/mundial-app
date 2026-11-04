const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./mundial.db');
const { calcularPuntosPrediccion } = require('./scoring');

console.log('🌱 Inicializando datos de prueba...');

db.serialize(() => {
  // Resetear tablas para tener pruebas limpias
  db.run(`DELETE FROM miembros_sala`);
  db.run(`DELETE FROM predicciones`);
  db.run(`DELETE FROM salas`);
  db.run(`DELETE FROM partidos`);
  db.run(`DELETE FROM usuarios`);

  // 1. Insertar Usuarios de Prueba
  const stmtUsuario = db.prepare(`INSERT INTO usuarios (id, nombre, email, racha_actual) VALUES (?, ?, ?, ?)`);
  stmtUsuario.run(1, 'Jaime Farfán', 'jaime@test.com', 0);
  stmtUsuario.run(2, 'Carlos Mendoza', 'carlos@test.com', 0);
  stmtUsuario.run(3, 'Ana Gómez', 'ana@test.com', 0);
  stmtUsuario.run(4, 'María Torres', 'maria@test.com', 0);
  stmtUsuario.finalize();

  // 2. Insertar Salas (Grupos de Invitación)
  const stmtSala = db.prepare(`INSERT INTO salas (id, nombre, codigo_invitacion, creador_id) VALUES (?, ?, ?, ?)`);
  stmtSala.run(1, 'Oficina Central C24', 'OFICINA26', 1);
  stmtSala.run(2, 'Amigos del Fútbol', 'FUTBOL2026', 2);
  stmtSala.finalize();

  // Asignar Miembros a Salas
  const stmtMiembro = db.prepare(`INSERT INTO miembros_sala (sala_id, usuario_id, puntos) VALUES (?, ?, 0)`);
  stmtMiembro.run(1, 1); // Jaime en Oficina Central
  stmtMiembro.run(1, 2); // Carlos en Oficina Central
  stmtMiembro.run(1, 3); // Ana en Oficina Central
  stmtMiembro.run(1, 4); // María en Oficina Central
  stmtMiembro.run(2, 1); // Jaime en Amigos del Fútbol
  stmtMiembro.run(2, 2); // Carlos en Amigos del Fútbol
  stmtMiembro.finalize();

  // Fechas de referencia
  const haceTresDias = new Date(Date.now() - 72 * 3600 * 1000).toISOString();
  const haceDosDias = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
  const haceUnDia = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const enDosDias = new Date(Date.now() + 48 * 3600 * 1000).toISOString();

  // 3. Insertar Partidos (3 Finalizados y 2 Pendientes)
  const stmtPartido = db.prepare(`INSERT INTO partidos (id, equipo_local, equipo_visitante, goles_local, goles_visitante, fecha_inicio, estado) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  
  // Partidos finalizados para cálculo de puntos
  stmtPartido.run(1, 'Argentina', 'Francia', 3, 2, haceTresDias, 'FINALIZADO');
  stmtPartido.run(2, 'Brasil', 'Croacia', 1, 1, haceDosDias, 'FINALIZADO');
  stmtPartido.run(3, 'España', 'Alemania', 2, 0, haceUnDia, 'FINALIZADO');
  
  // Partidos pendientes para predicción de usuarios
  stmtPartido.run(4, 'Perú', 'Chile', null, null, enDosDias, 'PENDIENTE');
  stmtPartido.run(5, 'Uruguay', 'Colombia', null, null, enDosDias, 'PENDIENTE');
  stmtPartido.finalize();

  // Fechas de registro de predicciones (algunas con >24h de anticipación y otras <24h)
  const fechaPredConAnticipacion = new Date(Date.now() - 100 * 3600 * 1000).toISOString(); // 100h antes
  const fechaPredUltimoMinuto = new Date(Date.now() - 74 * 3600 * 1000).toISOString();     // 2h antes del partido 1

  // 4. Insertar Predicciones diseñadas para probar cada regla de puntuación
  const stmtPred = db.prepare(`INSERT INTO predicciones (usuario_id, partido_id, goles_local_pred, goles_visitante_pred, fecha_registro) VALUES (?, ?, ?, ?, ?)`);

  // --- Jaime Farfán (Probará Racha + Resultado Exacto + Anticipación) ---
  stmtPred.run(1, 1, 3, 2, fechaPredConAnticipacion); // Partido 1: Exacto (5) + Anticipada (1) = 6 pts
  stmtPred.run(1, 2, 1, 1, fechaPredConAnticipacion); // Partido 2: Exacto (5) + Anticipada (1) = 6 pts
  stmtPred.run(1, 3, 2, 0, fechaPredConAnticipacion); // Partido 3: Exacto (5) + Anticipada (1) + Racha 3 (+2) = 8 pts

  // --- Carlos Mendoza (Probará Diferencia de Goles Correcta + Ganador) ---
  stmtPred.run(2, 1, 2, 1, fechaPredConAnticipacion); // Partido 1: Ganador (3) + Dif (2) + Anticipada (1) = 6 pts (Real: 3-2, Dif: +1)
  stmtPred.run(2, 2, 2, 2, fechaPredConAnticipacion); // Partido 2: Ganador Empate (3) + Dif (2) + Anticipada (1) = 6 pts (Real: 1-1, Dif: 0)
  stmtPred.run(2, 3, 3, 0, fechaPredConAnticipacion); // Partido 3: Ganador (3) + Anticipada (1) + Racha 3 (+2) = 6 pts (Real: 2-0, Dif no coincide)

  // --- Ana Gómez (Probará Ganador solo sin diferencia y Sin Anticipación) ---
  stmtPred.run(3, 1, 1, 0, fechaPredUltimoMinuto);    // Partido 1: Ganador (3) + Sin Anticipada (0) = 3 pts
  stmtPred.run(3, 2, 0, 2, fechaPredConAnticipacion); // Partido 2: Incorrecto = 0 pts (Corta racha)
  stmtPred.run(3, 3, 2, 1, fechaPredConAnticipacion); // Partido 3: Ganador (3) + Anticipada (1) = 4 pts

  // --- María Torres (Predicciones con errores para probar el reinicio de racha) ---
  stmtPred.run(4, 1, 0, 3, fechaPredConAnticipacion); // Incorrecto = 0 pts
  stmtPred.run(4, 2, 2, 0, fechaPredConAnticipacion); // Incorrecto = 0 pts
  stmtPred.run(4, 3, 1, 1, fechaPredConAnticipacion); // Incorrecto = 0 pts

  stmtPred.finalize();

  console.log('⚙️ Procesando cálculo masivo de puntos...');

  // 5. Simular la evaluación de los partidos finalizados
  db.all(`SELECT * FROM partidos WHERE estado = 'FINALIZADO'`, [], (err, partidos) => {
    partidos.forEach(partido => {
      db.all(`SELECT p.*, u.racha_actual FROM predicciones p JOIN usuarios u ON p.usuario_id = u.id WHERE p.partido_id = ?`,
        [partido.id], (err, predicciones) => {
          predicciones.forEach(pred => {
            const { puntosTotales, nuevaRacha } = calcularPuntosPrediccion(pred, partido, pred.racha_actual);

            // Actualizar puntos de la predicción
            db.run(`UPDATE predicciones SET puntos_obtenidos = ? WHERE id = ?`, [puntosTotales, pred.id]);

            // Actualizar racha acumulada del usuario
            db.run(`UPDATE usuarios SET racha_actual = ? WHERE id = ?`, [nuevaRacha, pred.usuario_id]);

            // Acumular puntos en las tablas de posiciones de sus salas
            db.run(`UPDATE miembros_sala SET puntos = puntos + ? WHERE usuario_id = ?`, [puntosTotales, pred.usuario_id]);
          });
        }
      );
    });

    console.log('✅ Datos de prueba y puntajes iniciales creados exitosamente.');
  });
});