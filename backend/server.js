const express = require('express');
const cors = require('cors');
const db = require('./database');
const { calcularPuntosPrediccion } = require('./scoring');

const app = express();
app.use(cors());
app.use(express.json());

// 1. Registro / Autenticación simple
app.post('/api/usuarios', (req, res) => {
  const { nombre, email } = req.body;
  db.run(`INSERT INTO usuarios (nombre, email) VALUES (?, ?)`, [nombre, email], function (err) {
    if (err) return res.status(400).json({ error: 'El email ya existe' });
    res.json({ id: this.lastID, nombre, email });
  });
});

// 2. Crear una Sala con código de invitación[cite: 1]
app.post('/api/salas', (req, res) => {
  const { nombre, usuario_id } = req.body;
  const codigo = Math.random().toString(36).substring(2, 8).toUpperCase(); // Código de 6 letras

  db.run(`INSERT INTO salas (nombre, codigo_invitacion, creador_id) VALUES (?, ?, ?)`, 
    [nombre, codigo, usuario_id], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      const salaId = this.lastID;
      db.run(`INSERT INTO miembros_sala (sala_id, usuario_id) VALUES (?, ?)`, [salaId, usuario_id]);
      res.json({ id: salaId, nombre, codigo_invitacion: codigo });
    }
  );
});

// 3. Unirse a una Sala mediante código[cite: 1]
app.post('/api/salas/unirse', (req, res) => {
  const { codigo_invitacion, usuario_id } = req.body;
  db.get(`SELECT id FROM salas WHERE codigo_invitacion = ?`, [codigo_invitacion], (err, sala) => {
    if (err || !sala) return res.status(404).json({ error: 'Sala no encontrada' });
    db.run(`INSERT OR IGNORE INTO miembros_sala (sala_id, usuario_id) VALUES (?, ?)`, 
      [sala.id, usuario_id], (err2) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({ mensaje: 'Te has unido exitosamente a la sala', sala_id: sala.id });
      }
    );
  });
});

// 4. Registrar / Actualizar Predicción[cite: 1]
app.post('/api/predicciones', (req, res) => {
  const { usuario_id, partido_id, goles_local_pred, goles_visitante_pred } = req.body;
  
  db.run(`INSERT INTO predicciones (usuario_id, partido_id, goles_local_pred, goles_visitante_pred) 
          VALUES (?, ?, ?, ?) 
          ON CONFLICT(usuario_id, partido_id) DO UPDATE SET 
          goles_local_pred=excluded.goles_local_pred, 
          goles_visitante_pred=excluded.goles_visitante_pred`,
    [usuario_id, partido_id, goles_local_pred, goles_visitante_pred],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ mensaje: 'Predicción guardada correctamente' });
    }
  );
});

// 5. Cargar resultado de un partido y procesar puntos de todos los participantes[cite: 1]
app.post('/api/partidos/:id/resultado', (req, res) => {
  const partidoId = req.params.id;
  const { goles_local, goles_visitante } = req.body;

  db.run(`UPDATE partidos SET goles_local = ?, goles_visitante = ?, estado = 'FINALIZADO' WHERE id = ?`,
    [goles_local, goles_visitante, partidoId], (err) => {
      if (err) return res.status(500).json({ error: err.message });

      // Obtener datos del partido
      db.get(`SELECT * FROM partidos WHERE id = ?`, [partidoId], (err, partido) => {
        // Obtener todas las predicciones de este partido
        db.all(`SELECT p.*, u.racha_actual FROM predicciones p JOIN usuarios u ON p.usuario_id = u.id WHERE p.partido_id = ?`,
          [partidoId], (err, predicciones) => {
            
            predicciones.forEach(pred => {
              const { puntosTotales, nuevaRacha } = calcularPuntosPrediccion(pred, partido, pred.racha_actual);

              // Guardar puntos en la predicción
              db.run(`UPDATE predicciones SET puntos_obtenidos = ? WHERE id = ?`, [puntosTotales, pred.id]);

              // Actualizar racha del usuario
              db.run(`UPDATE usuarios SET racha_actual = ? WHERE id = ?`, [nuevaRacha, pred.usuario_id]);

              // Actualizar puntos acumulados en las salas donde compite el usuario
              db.run(`UPDATE miembros_sala SET puntos = puntos + ? WHERE usuario_id = ?`, [puntosTotales, pred.usuario_id]);
            });

            res.json({ mensaje: 'Resultado guardado y puntajes recalculados exitosamente' });
          }
        );
      });
    }
  );
});

// 6. Obtener Clasificación / Leaderboard de una Sala[cite: 1]
app.get('/api/salas/:id/posiciones', (req, res) => {
  const salaId = req.params.id;
  const sql = `
    SELECT u.nombre, ms.puntos, u.racha_actual 
    FROM miembros_sala ms 
    JOIN usuarios u ON ms.usuario_id = u.id 
    WHERE ms.sala_id = ? 
    ORDER BY ms.puntos DESC`;

  db.all(sql, [salaId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Semilla de partidos de prueba
app.post('/api/partidos/semilla', (req, res) => {
  const fechaFutura = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
  db.run(`INSERT INTO partidos (equipo_local, equipo_visitante, fecha_inicio) VALUES 
    ('Perú', 'Chile', '${fechaFutura}'),
    ('Argentina', 'Brasil', '${fechaFutura}')`);
  res.json({ mensaje: 'Partidos de prueba creados' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor iniciado en puerto ${PORT}`));