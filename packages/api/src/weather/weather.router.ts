import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc.js";
import { prisma } from "../lib/prisma.js";

// WMO Weather interpretation codes → human label + icon key
const WMO_CODES: Record<number, { label: string; icon: "clear" | "partly-cloudy" | "cloudy" | "rain" | "snow" | "thunderstorm" }> = {
  0: { label: "Clear sky", icon: "clear" },
  1: { label: "Mainly clear", icon: "clear" },
  2: { label: "Partly cloudy", icon: "partly-cloudy" },
  3: { label: "Overcast", icon: "cloudy" },
  45: { label: "Fog", icon: "cloudy" },
  48: { label: "Icy fog", icon: "cloudy" },
  51: { label: "Light drizzle", icon: "rain" },
  53: { label: "Drizzle", icon: "rain" },
  55: { label: "Heavy drizzle", icon: "rain" },
  61: { label: "Light rain", icon: "rain" },
  63: { label: "Rain", icon: "rain" },
  65: { label: "Heavy rain", icon: "rain" },
  71: { label: "Light snow", icon: "snow" },
  73: { label: "Snow", icon: "snow" },
  75: { label: "Heavy snow", icon: "snow" },
  77: { label: "Snow grains", icon: "snow" },
  80: { label: "Light showers", icon: "rain" },
  81: { label: "Showers", icon: "rain" },
  82: { label: "Heavy showers", icon: "rain" },
  85: { label: "Snow showers", icon: "snow" },
  86: { label: "Heavy snow showers", icon: "snow" },
  95: { label: "Thunderstorm", icon: "thunderstorm" },
  96: { label: "Thunderstorm + hail", icon: "thunderstorm" },
  99: { label: "Thunderstorm + hail", icon: "thunderstorm" },
};

export const weatherRouter = router({
  getForecast: publicProcedure
    .input(z.object({ latitude: z.number(), longitude: z.number() }))
    .query(async ({ input }) => {
      const { latitude, longitude } = input;
      const url =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${latitude}&longitude=${longitude}` +
        `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,windspeed_10m_max` +
        `&wind_speed_unit=mph&temperature_unit=fahrenheit&forecast_days=7&timezone=America%2FDenver`;

      const res = await fetch(url);
      if (!res.ok) throw new Error("Weather fetch failed");

      const data = (await res.json()) as {
        daily: {
          time: string[];
          weathercode: number[];
          temperature_2m_max: number[];
          temperature_2m_min: number[];
          precipitation_probability_max: number[];
          windspeed_10m_max: number[];
        };
      };

      const { time, weathercode, temperature_2m_max, temperature_2m_min, precipitation_probability_max, windspeed_10m_max } =
        data.daily;

      return time.map((date, i) => {
        const wmo = WMO_CODES[weathercode[i]] ?? { label: "Unknown", icon: "cloudy" as const };
        const precipChance = precipitation_probability_max[i] ?? 0;
        const windMax = Math.round(windspeed_10m_max[i] ?? 0);
        return {
          date,
          tempMax: Math.round(temperature_2m_max[i] ?? 0),
          tempMin: Math.round(temperature_2m_min[i] ?? 0),
          precipChance,
          windMax,
          condition: wmo.label,
          icon: wmo.icon,
          isBestDay: precipChance < 30 && windMax < 20,
        };
      });
    }),

  /** Fetch weather alerts for user's saved + planned mountains (best-day windows in next 3 days) */
  alerts: protectedProcedure.query(async ({ ctx }) => {
    // Gather mountains from favorites + upcoming planned hikes
    const [favorites, plans] = await Promise.all([
      prisma.favorite.findMany({
        where: { userId: ctx.user.id },
        select: { mountain: { select: { id: true, name: true, latitude: true, longitude: true } } },
        take: 10,
      }),
      prisma.plannedHike.findMany({
        where: { userId: ctx.user.id, plannedDate: { gte: new Date() } },
        orderBy: { plannedDate: "asc" },
        select: { mountain: { select: { id: true, name: true, latitude: true, longitude: true } }, plannedDate: true },
        take: 5,
      }),
    ]);

    // Deduplicate by mountain id, planned hikes first
    const seen = new Set<string>();
    const mountains: { id: string; name: string; latitude: number; longitude: number; plannedDate?: Date }[] = [];
    for (const p of plans) {
      if (!seen.has(p.mountain.id)) {
        seen.add(p.mountain.id);
        mountains.push({ ...p.mountain, plannedDate: p.plannedDate });
      }
    }
    for (const f of favorites) {
      if (!seen.has(f.mountain.id)) {
        seen.add(f.mountain.id);
        mountains.push(f.mountain);
      }
    }

    if (mountains.length === 0) return [];

    const today = new Date().toISOString().slice(0, 10);
    const threeDaysOut = new Date(Date.now() + 3 * 86400_000).toISOString().slice(0, 10);

    async function fetchForecast(lat: number, lng: number) {
      const url =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${lat}&longitude=${lng}` +
        `&daily=weathercode,temperature_2m_max,precipitation_probability_max,windspeed_10m_max` +
        `&wind_speed_unit=mph&temperature_unit=fahrenheit&forecast_days=4&timezone=America%2FDenver`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = (await res.json()) as {
        daily: {
          time: string[];
          weathercode: number[];
          temperature_2m_max: number[];
          precipitation_probability_max: number[];
          windspeed_10m_max: number[];
        };
      };
      return data.daily;
    }

    const results = await Promise.all(
      mountains.slice(0, 8).map(async (m) => {
        const daily = await fetchForecast(m.latitude, m.longitude).catch(() => null);
        if (!daily) return null;

        const bestDays = daily.time
          .map((date, i) => {
            const precipChance = daily.precipitation_probability_max[i] ?? 100;
            const windMax = Math.round(daily.windspeed_10m_max[i] ?? 999);
            const tempMax = Math.round(daily.temperature_2m_max[i] ?? 0);
            const wmo = WMO_CODES[daily.weathercode[i]] ?? { icon: "cloudy" as const };
            return { date, precipChance, windMax, tempMax, icon: wmo.icon, isBestDay: precipChance < 30 && windMax < 20 };
          })
          .filter((d) => d.isBestDay && d.date >= today && d.date <= threeDaysOut);

        if (bestDays.length === 0) return null;
        return {
          mountainId: m.id,
          mountainName: m.name,
          plannedDate: m.plannedDate ? m.plannedDate.toISOString().slice(0, 10) : null,
          bestDays,
        };
      })
    );

    return results.filter(Boolean);
  }),
});
