import { useConexion } from './hooks/useConexion';
import { IndicadorConexion } from './components/IndicadorConexion';

export default function App() {
  const conectado = useConexion();

  return (
    <main>
      <h1>Parchís Online</h1>
      <IndicadorConexion conectado={conectado} />
    </main>
  );
}
