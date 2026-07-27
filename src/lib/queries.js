import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

// Gesamtzustand vom Server. enabled=false solange nicht eingeloggt.
export function useAppState(enabled = true) {
  return useQuery({
    queryKey: ["state"],
    queryFn: () => api("/state"),
    enabled,
    retry: false,
    staleTime: 3000,
  });
}

// Generische Mutation, die danach den State neu lädt.
export function useApiMutation(fn, { onSuccess } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async (data, vars) => {
      await qc.invalidateQueries({ queryKey: ["state"] });
      onSuccess?.(data, vars);
    },
  });
}

export const useLogin = () =>
  useMutation({ mutationFn: ({ name, password }) => api("/login", "POST", { name, password }) });

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api("/logout", "POST"),
    onSuccess: () => qc.clear(),
  });
}
