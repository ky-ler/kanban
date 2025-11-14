import { defineConfig } from "orval";

const targetPath = "http://localhost:8080/api-docs.yaml";

export default defineConfig({
  kanban: {
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
          useInfinite: true,
          useInfiniteQueryParam: "nextId",
          // useMutation: true,
        },
      },
    },
  },
  kanbanZod: {
    input: {
      target: targetPath,
    },
    output: {
      mode: "tags-split",
      target: "src/api/gen/endpoints",
      client: "zod",
      fileExtension: ".zod.ts",
    },
  },
});
