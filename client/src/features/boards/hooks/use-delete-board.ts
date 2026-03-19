import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export const deleteBoard = async (boardId: string) => {
  return apiClient<{ status: number; data: unknown; headers: Headers }>(
    `/boards/${boardId}`,
    {
      method: "DELETE",
    },
  );
};

export const useDeleteBoard = () => {
  return useMutation({
    mutationFn: deleteBoard,
  });
};
