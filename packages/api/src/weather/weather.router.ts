import { z } from "zod";
import { router, publicProcedure } from "../trpc.js";

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
        `&wind_speed_unit=mph&temperature_unit=fahrenheit&forecast_days=3&timezone=America%2FDenver`;

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
});
