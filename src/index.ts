import { loadSteamRecentGames, resolveSteamRecentGamesCount } from '../../src/server/steamRecentGames'

type Env = {
  STEAM_API_KEY?: string
  STEAM_ID?: string
}

const json = (body: unknown, status = 200) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    },
  })
}

const isRecentGamesPath = (pathname: string) => {
  return pathname === '/api/steam/recent-games' || pathname === '/api/steam/recent-games/'
}

export default {
  async fetch(request: Request, env: Env) {
    const requestUrl = new URL(request.url)

    if (!isRecentGamesPath(requestUrl.pathname)) {
      return json({ error: 'Not found.' }, 404)
    }

    if (request.method !== 'GET') {
      return json({ error: 'Method not allowed.' }, 405)
    }

    const apiKey = env.STEAM_API_KEY?.trim()
    const steamId = (env.STEAM_ID ?? '76561198119046479').trim()

    if (!apiKey) {
      return json({ error: 'STEAM_API_KEY is missing on the server.' }, 500)
    }

    const count = resolveSteamRecentGamesCount(requestUrl.searchParams.get('count'))

    try {
      const result = await loadSteamRecentGames({ apiKey, steamId, count })
      return json(result)
    } catch {
      return json({ error: 'Could not load recent Steam games.' }, 502)
    }
  },
}