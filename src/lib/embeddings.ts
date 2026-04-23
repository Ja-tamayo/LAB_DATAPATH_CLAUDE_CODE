const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings'
const VOYAGE_MODEL = 'voyage-3.5'

interface VoyageResponse {
  data: Array<{ embedding: number[]; index: number }>
}

async function callVoyage(
  inputs: string[],
  inputType: 'document' | 'query'
): Promise<number[][]> {
  if (!process.env.VOYAGE_API_KEY) {
    throw new Error('Voyage AI no está configurado: falta VOYAGE_API_KEY.')
  }

  const response = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({
      model: VOYAGE_MODEL,
      input: inputs,
      input_type: inputType,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Voyage AI error ${response.status}: ${error}`)
  }

  const json = (await response.json()) as VoyageResponse
  return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding)
}

/** Embebe un solo texto */
export async function generateEmbedding(
  text: string,
  inputType: 'document' | 'query'
): Promise<number[]> {
  const [embedding] = await callVoyage([text], inputType)
  return embedding
}

/** Embebe múltiples textos en un solo request — evita rate limit */
export async function generateEmbeddingsBatch(
  texts: string[],
  inputType: 'document' | 'query'
): Promise<number[][]> {
  return callVoyage(texts, inputType)
}
