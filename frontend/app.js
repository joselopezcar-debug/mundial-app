const API_URL = 'http://localhost:3000/api';

async function crearSala() {
  const nombre = document.getElementById('nombreSala').value;
  const res = await fetch(`${API_URL}/salas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre, usuario_id: 1 })
  });
  const data = await res.json();
  document.getElementById('codigoResultado').innerText = `Sala creada. Código: ${data.codigo_invitacion} (ID Sala: ${data.id})`;
}

async function unirseSala() {
  const codigo = document.getElementById('codigoUnirse').value;
  const res = await fetch(`${API_URL}/salas/unirse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ codigo_invitacion: codigo, usuario_id: 1 })
  });
  const data = await res.json();
  alert(data.mensaje || data.error);
}

async function enviarPrediccion() {
  const usuario_id = parseInt(document.getElementById('usrId').value);
  const partido_id = parseInt(document.getElementById('partidoId').value);
  const goles_local_pred = parseInt(document.getElementById('golesL').value);
  const goles_visitante_pred = parseInt(document.getElementById('golesV').value);

  const res = await fetch(`${API_URL}/predicciones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario_id, partido_id, goles_local_pred, goles_visitante_pred })
  });
  const data = await res.json();
  alert(data.mensaje);
}

async function cargarTabla() {
  const salaId = document.getElementById('salaIdVer').value;
  const res = await fetch(`${API_URL}/salas/${salaId}/posiciones`);
  const data = await res.json();

  const tbody = document.querySelector('#tablaPosiciones tbody');
  tbody.innerHTML = '';

  data.forEach((row, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${row.nombre}</td>
      <td><strong>${row.puntos} pts</strong></td>
      <td>🔥 ${row.racha_actual}</td>
    `;
    tbody.appendChild(tr);
  });
}