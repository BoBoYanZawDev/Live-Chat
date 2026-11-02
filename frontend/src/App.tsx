import { PortalShell } from './components/PortalShell';
import { LoginPage } from './features/auth/LoginPage';
import { useAuthStore } from './stores/auth.store';

export default function App() {
  const token = useAuthStore((s) => s.token);
  return token ? <PortalShell /> : <LoginPage />;
}
