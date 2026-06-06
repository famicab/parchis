import { Routes, Route, useParams } from 'react-router-dom';
import { useConexion } from './hooks/useConexion';
import { IndicadorConexion } from './components/IndicadorConexion';
import { PantallaInicio } from './pantallas/PantallaInicio';
import { PantallaLobby } from './pantallas/PantallaLobby';
import { PantallaPartida } from './pantallas/PantallaPartida';

function InicioConCodigo() {
  const { codigo } = useParams();
  return <PantallaInicio codigoInicial={(codigo ?? '').toUpperCase()} />;
}

export default function App() {
  const conectado = useConexion();

  return (
    <div className="app">
      <header className="cabecera">
        <span className="marca">Parchís</span>
        <IndicadorConexion conectado={conectado} />
      </header>
      <main>
        <Routes>
          <Route path="/" element={<PantallaInicio />} />
          <Route path="/sala/:codigo" element={<InicioConCodigo />} />
          <Route path="/lobby" element={<PantallaLobby />} />
          <Route path="/partida" element={<PantallaPartida />} />
        </Routes>
      </main>
    </div>
  );
}
