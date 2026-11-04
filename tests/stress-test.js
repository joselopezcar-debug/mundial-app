import http from 'k6/http';
import { check, sleep } from 'k6';

// Configuración de la carga: Simula un pico progresivo de hasta 200 usuarios concurrentes
export const options = {
  stages: [
    { duration: '30s', target: 50 },  // Rampa de subida a 50 usuarios
    { duration: '1m',  target: 200 }, // Mantener carga sostenida de 200 usuarios
    { duration: '30s', target: 0 },   // Rampa de bajada
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],   // Menos del 1% de errores permitidos
    http_req_duration: ['p(95)<500'], // El 95% de las peticiones debe responder en < 500ms
  },
};

// Recuerda cambiar la IP por la IP pública real de tu EC2 (o localhost si estás probando local)
const BASE_URL = 'http://localhost:3000/api'; 

export default function () {
  // 1. Obtener la tabla de posiciones de la sala
  const resPosiciones = http.get(`${BASE_URL}/salas/1/posiciones`);
  check(resPosiciones, {
    'GET Posiciones OK (200)': (r) => r.status === 200,
  });

  // 2. Simular envío de predicciones concurrentes
  const payload = JSON.stringify({
    usuario_id: Math.floor(Math.random() * 4) + 1,
    partido_id: 4,
    goles_local_pred: Math.floor(Math.random() * 4),
    goles_visitante_pred: Math.floor(Math.random() * 4),
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  const resPred = http.post(`${BASE_URL}/predicciones`, payload, params);
  check(resPred, {
    'POST Predicciones OK (200)': (r) => r.status === 200,
  });

  sleep(1);
}