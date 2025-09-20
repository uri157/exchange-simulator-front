import { z } from "zod";

export const sessionSchema = z
  .object({
    symbol: z.string().min(1, "Seleccioná un símbolo"),
    interval: z.string().min(1, "Seleccioná un intervalo"),
    startTime: z.number().int(),
    endTime: z.number().int(),
    speed: z.coerce.number().positive("La velocidad debe ser mayor a 0"),
    seed: z.coerce.number().int("Seed inválida"),
  })
  .refine((value) => value.endTime > value.startTime, {
    message: "El fin debe ser mayor al inicio",
    path: ["endTime"],
  });

export type SessionSchema = typeof sessionSchema;
