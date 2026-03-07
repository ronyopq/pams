import { AppContextProvider } from "@/components/providers/app-context";

export const AppProviders = ({ children }: { children: React.ReactNode }) => {
  return <AppContextProvider>{children}</AppContextProvider>;
};