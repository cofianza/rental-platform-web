/**
 * Respaldo de «¿Cuánto cuesta y qué incluye?» en la página de inicio, solo si la
 * API no responde (p. ej. en la build de CI). El texto vigente, con la cifra de
 * la prima, lo manda la API (GET /public/precios/landing): aquí no se fija el
 * porcentaje de la prima.
 */
export const FAQ_COSTO_RESPALDO =
  'El estudio de arrendamiento tiene un costo único al inicio. Si aprueba, paga una sola vez la prima de vinculación, un porcentaje de un canon, más IVA. Luego paga una tarifa mensual más IVA. Al terminar el contrato recupera el 30% de las tarifas mensuales pagadas, salvo que hayamos tenido que pagar por usted o que la inmobiliaria o el propietario no haya cumplido a tiempo sus reportes a Cofianza.'
