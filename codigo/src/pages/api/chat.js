/**
 * /api/chat — el runtime de «Preguntale a Ale».
 *
 * Es la pieza que faltaba: el corpus (319 fragmentos embebidos), el prompt
 * del sistema y los ayudantes de recuperación ya existían en
 * src/chat-data/ y src/lib/rag.js — que ya nombraba este archivo— pero
 * nunca se había escrito el endpoint, así que /preguntale era una maqueta.
 *
 * ÚNICA ruta del sitio que corre en servidor. El resto sigue siendo HTML
 * estático.
 *
 * Reglas del proyecto que se aplican acá (CLAUDE.md, regla 3 — todo lo que
 * hable de Ale generado por IA):
 *  · LÍMITE DE DOMINIO: sólo responde con los pasajes recuperados. El
 *    prompt del sistema lo exige y acá no se le agrega ninguna otra fuente.
 *  · REGISTRO: cada consulta se loguea (pregunta, cantidad de pasajes,
 *    modelo, latencia). Sin eso no hay forma de auditar qué contestó.
 *  · La IDENTIFICACIÓN VISIBLE como IA vive en la interfaz, no acá.
 *
 * La clave NUNCA se expone al navegador: este archivo corre en servidor y
 * lee import.meta.env.
 */
import {
  embedQuery,
  retrieve,
  chatComplete,
  sourcesFromHits,
  loadData,
  hasIndex,
} from '../../lib/rag.js';

export const prerender = false;

const MAX_PREGUNTA = 500;

// Límite por IP, en memoria. No sobrevive a un reinicio y no sirve para
// varias instancias: es un piso, no una defensa. Si esto escala, va a
// hacer falta algo compartido.
const VENTANA_MS = 60_000;
const MAX_POR_VENTANA = 8;
const visitas = new Map();

function permitido(ip) {
  const ahora = Date.now();
  const previas = (visitas.get(ip) ?? []).filter((t) => ahora - t < VENTANA_MS);
  if (previas.length >= MAX_POR_VENTANA) return false;
  previas.push(ahora);
  visitas.set(ip, previas);
  return true;
}

const json = (datos, status = 200) =>
  new Response(JSON.stringify(datos), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });

export async function POST({ request, clientAddress }) {
  const t0 = Date.now();

  if (!permitido(clientAddress ?? 'desconocida')) {
    return json({ error: 'Demasiadas preguntas seguidas. Esperá un minuto.' }, 429);
  }

  let pregunta;
  try {
    ({ pregunta } = await request.json());
  } catch {
    return json({ error: 'Cuerpo inválido.' }, 400);
  }

  if (typeof pregunta !== 'string' || !pregunta.trim()) {
    return json({ error: 'Falta la pregunta.' }, 400);
  }
  pregunta = pregunta.trim().slice(0, MAX_PREGUNTA);

  const apiKey = import.meta.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    // Falla explícita, no silenciosa: sin clave el chat no puede responder
    // y conviene que se note en el deploy, no en producción.
    return json(
      { error: 'El chat no está configurado: falta OPENROUTER_API_KEY en el servidor.' },
      503
    );
  }
  if (!hasIndex()) {
    return json({ error: 'El índice del chat no está disponible.' }, 503);
  }

  try {
    const { systemPrompt, chatConfig } = loadData();

    const vector = await embedQuery(pregunta, apiKey);
    const hits = retrieve(vector, { k: chatConfig.top_k ?? 6 });

    const pasajes = hits
      .map(
        (h, i) =>
          `[${i + 1}] (${h.chunk?.source_detail ?? h.chunk?.source_page ?? 'sin fuente'})\n${h.chunk?.text ?? ''}`
      )
      .join('\n\n');

    const mensajes = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Pasajes recuperados del archivo verificado:\n\n${pasajes}\n\n---\n\nPregunta del usuario: ${pregunta}`,
      },
    ];

    const { text, provider, finishReason } = await chatComplete(mensajes, apiKey);

    console.log(
      JSON.stringify({
        evento: 'preguntale',
        pregunta,
        pasajes: hits.length,
        mejorPuntaje: hits[0]?.score?.toFixed(3),
        modelo: chatConfig.model,
        provider,
        finishReason,
        ms: Date.now() - t0,
      })
    );

    return json({ respuesta: text, fuentes: sourcesFromHits(hits) });
  } catch (err) {
    console.error(JSON.stringify({ evento: 'preguntale-error', mensaje: String(err), ms: Date.now() - t0 }));
    return json({ error: 'No se pudo responder en este momento.' }, 502);
  }
}
