import { AdminView } from "./views/AdminView";
import { TelaoView } from "./views/TelaoView";

export function App() {
  const isTelao = window.location.pathname.startsWith("/telao");
  return isTelao ? <TelaoView /> : <AdminView />;
}
