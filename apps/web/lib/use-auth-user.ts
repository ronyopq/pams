"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

export function useAuthUser() {
  return useQuery({
    queryKey: ["auth-user"],
    queryFn: api.me,
    retry: false
  });
}
