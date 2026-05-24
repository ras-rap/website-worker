export type SteamRecentlyPlayedGame = {
  appid: number
  name: string
  playtime_forever: number
  playtime_2weeks?: number
}

export type SteamRecentGame = {
  appid: number
  name: string
  playtimeForeverHours: number
  playtime2WeeksHours: number
  iconUrl: string | null
}

export type SteamRecentGamesResult = {
  games: SteamRecentGame[]
}

const clampCount = (value: number) => {
  if (!Number.isFinite(value)) {
    return 5
  }

  return Math.min(Math.max(Math.floor(value), 1), 20)
}

export const resolveSteamRecentGamesCount = (value: string | null) => {
  return clampCount(Number(value ?? '5'))
}

export async function loadSteamRecentGames({
  apiKey,
  steamId,
  count,
  fetchImpl = fetch,
}: {
  apiKey: string
  steamId: string
  count: number
  fetchImpl?: typeof fetch
}): Promise<SteamRecentGamesResult> {
  const steamRecentUrl = `https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/?key=${encodeURIComponent(apiKey)}&steamid=${encodeURIComponent(steamId)}&count=${count}`

  const recentResponse = await fetchImpl(steamRecentUrl)

  if (!recentResponse.ok) {
    throw new Error('Steam API request failed.')
  }

  const recentPayload = (await recentResponse.json()) as {
    response?: {
      games?: SteamRecentlyPlayedGame[]
    }
  }

  const recentGames = recentPayload.response?.games ?? []

  const games = await Promise.all(
    recentGames.map(async (game) => {
      let iconUrl: string | null = null

      try {
        const detailsResponse = await fetchImpl(`https://store.steampowered.com/api/appdetails?appids=${game.appid}&l=en`)

        if (detailsResponse.ok) {
          const detailsPayload = (await detailsResponse.json()) as Record<
            string,
            {
              success?: boolean
              data?: {
                header_image?: string
                capsule_image?: string
              }
            }
          >
          const details = detailsPayload[String(game.appid)]
          iconUrl = details?.data?.header_image ?? details?.data?.capsule_image ?? null
        }
      } catch {
        iconUrl = null
      }

      return {
        appid: game.appid,
        name: game.name,
        playtimeForeverHours: Number((game.playtime_forever / 60).toFixed(1)),
        playtime2WeeksHours: Number(((game.playtime_2weeks ?? 0) / 60).toFixed(1)),
        iconUrl,
      }
    }),
  )

  return { games }
}