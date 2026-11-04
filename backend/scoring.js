/**
 * Reglas aplicadas[cite: 1]:
 * 1. Resultado exacto: 5 pts[cite: 1]
 * 2. Ganador o empate correcto: 3 pts[cite: 1]
 * 3. Diferencia de goles correcta: 2 pts[cite: 1]
 * 4. Bonus por racha: +2 pts por cada 3 aciertos de ganador[cite: 1]
 * 5. Predicción anticipada: +1 pt si predice > 24h antes[cite: 1]
 */
function calcularPuntosPrediccion(prediccion, partido, rachaActual) {
  const predL = prediccion.goles_local_pred;
  const predV = prediccion.goles_visitante_pred;
  const realL = partido.goles_local;
  const realV = partido.goles_visitante;

  let puntosBase = 0;
  let esGanadorCorrecto = false;

  const ganadorReal = realL > realV ? 1 : (realV > realL ? 2 : 0);
  const ganadorPred = predL > predV ? 1 : (predV > predL ? 2 : 0);

  // Regla 1: Resultado exacto (5 pts)[cite: 1]
  if (predL === realL && predV === realV) {
    puntosBase = 5;
    esGanadorCorrecto = true;
  } else {
    // Regla 2: Ganador/Empate correcto (3 pts)[cite: 1]
    if (ganadorReal === ganadorPred) {
      puntosBase += 3;
      esGanadorCorrecto = true;

      // Regla 3: Diferencia de goles correcta (2 pts extra)[cite: 1]
      const difReal = realL - realV;
      const difPred = predL - predV;
      if (difReal === difPred) {
        puntosBase += 2;
      }
    }
  }

  // Regla 4: Bonus por racha (+2 pts por cada 3 acertados)[cite: 1]
  let nuevaRacha = rachaActual;
  let bonusRacha = 0;

  if (esGanadorCorrecto) {
    nuevaRacha += 1;
    if (nuevaRacha % 3 === 0) {
      bonusRacha = 2;
    }
  } else {
    nuevaRacha = 0;
  }

  // Regla 5: Predicción anticipada (+1 pt si es > 24 horas antes)[cite: 1]
  let bonusAnticipacion = 0;
  const fechaPartido = new Date(partido.fecha_inicio);
  const fechaPrediccion = new Date(prediccion.fecha_registro);
  const horasDiferencia = (fechaPartido - fechaPrediccion) / (1000 * 60 * 60);

  if (horasDiferencia > 24) {
    bonusAnticipacion = 1;
  }

  const puntosTotales = puntosBase + bonusRacha + bonusAnticipacion;

  return {
    puntosTotales,
    nuevaRacha
  };
}

module.exports = { calcularPuntosPrediccion };