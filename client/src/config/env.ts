import { z } from "zod";

const EnvSchema = z.object({
  VITE_API_URL: z.string().url(),
  VITE_AUTH0_DOMAIN: z.string(),
  VITE_AUTH0_CLIENT_ID: z.string(),
  VITE_AUTH0_AUDIENCE: z.string(),
  VITE_AUTH0_CALLBACK_URL: z.string().url(),
});

if (import.meta.env.MODE !== "production") {
  EnvSchema.extend({
    VITE_OPENAPI_YAML_URL: z
      .string()
      .url()
      .default("http://localhost:8080/api-docs.yaml"),
  });
}

export const env = EnvSchema.parse(import.meta.env);
