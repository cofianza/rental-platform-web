// Chequeo de sinReferenciasInternas (lib/utils.ts), con los textos que la API
// guardó antes de limpiarlos. La web no tiene runner: node scripts/check-sin-referencias.mjs
import assert from 'node:assert/strict'
import { sinReferenciasInternas as f } from '../lib/utils.ts'

const casos = [
  ['La persona no existe en la central consultada (Adenda de precios §2.2 a): el cupo no se consume.',
    'La persona no existe en la central consultada: el cupo no se consume.'],
  ['El prospecto no autorizó dentro del plazo (Adenda de precios §2.5; Flujo §14: 15 días).',
    'El prospecto no autorizó dentro del plazo.'],
  ['No es un rechazo de crédito: use el otro buró. Adenda 1 §2.3: si DataCrédito no responde, reintente.',
    'No es un rechazo de crédito: use el otro buró. Si DataCrédito no responde, reintente.'],
  ['Quedó condicionado. SLA: 2 horas hábiles (Política V4.1 §3.1).', 'Quedó condicionado. SLA: 2 horas hábiles.'],
  ['Compra de 10 estudios — sesion cs_test_123', 'Compra de 10 estudios'],
  ['Texto normal (con paréntesis) y fin.', 'Texto normal (con paréntesis) y fin.'],
]
for (const [entrada, esperado] of casos) assert.equal(f(entrada), esperado)
console.log(`sinReferenciasInternas: ${casos.length} casos OK`)
