import { defineConfig } from "orval";

const targetPath = "http://localhost:8080/api-docs.yaml";

export default defineConfig({
  velora: {
    input: {
      target: targetPath,
    },
    output: {
      mode: "tags-split",
      target: "src/api/gen/endpoints",
      schemas: "src/api/gen/model",
      client: "react-query",
      httpClient: "fetch",
      // mock: true,
      prettier: true,
      override: {
        mutator: {
          path: "src/lib/api-client.ts",
          name: "apiClient",
        },
        query: {
          useQuery: true,
          useSuspenseQuery: true,
          // https://github.com/orval-labs/orval/pull/3106
          useInfinite: false,
          useInfiniteQueryParam: "page",
          // useMutation: true,
        },
        operations: {
          getTaskActivity: {
            query: { useInfinite: true },
          },
          getBoardActivity: {
            query: { useInfinite: true },
          },
          getNotifications: {
            query: { useInfinite: true },
          },
        },
      },
    },
  },
  veloraZod: {
    input: {
      target: targetPath,
    },
    output: {
      mode: "tags-split",
      target: "src/api/gen/endpoints",
      client: "zod",
      fileExtension: ".zod.ts",
      prettier: true,
    },
  },
});
