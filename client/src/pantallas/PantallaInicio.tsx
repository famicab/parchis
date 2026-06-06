import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSala } from '../sala/SalaContext';

interface Props {
  codigoInicial?: string;
}

/** PAR-107: crear una partida nueva o unirse con un código. */
export function PantallaInicio({ codigoInicial = '' }: Props) {
  const { crearPartida, unirsePartida } = useSala();
  const navigate = useNavigate();

  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState(codigoInicial);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const nombreValido = nombre.trim().length > 0;

  async function onCrear(e: FormEvent) {
    e.preventDefault();
    if (!nombreValido || cargando) return;
    setCargando(true);
    setError(null);
    const r = await crearPartida(nombre.trim());
    setCargando(false);
    if (r.ok) navigate('/lobby');
    else setError(r.error.mensaje);
  }

  async function onUnirse(e: FormEvent) {
    e.preventDefault();
    if (!nombreValido || codigo.trim().length === 0 || cargando) return;
    setCargando(true);
    setError(null);
    const r = await unirsePartida(codigo.trim(), nombre.trim());
    setCargando(false);
    if (r.ok) navigate('/lobby');
    else setError(r.error.mensaje);
  }

  return (
    <section className="inicio">
      <h1>Parchís Online</h1>

      <label className="campo">
        Tu nombre
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          maxLength={20}
          placeholder="¿Cómo te llamas?"
          autoFocus
        />
      </label>

      <form onSubmit={onCrear} className="bloque">
        <button type="submit" disabled={!nombreValido || cargando}>
          Crear partida nueva
        </button>
      </form>

      <p className="separador">o únete con un código</p>

      <form onSubmit={onUnirse} className="bloque">
        <input
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          maxLength={6}
          placeholder="Código (p. ej. ABCDEF)"
          aria-label="Código de la sala"
        />
        <button type="submit" disabled={!nombreValido || codigo.trim().length === 0 || cargando}>
          Unirse
        </button>
      </form>

      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </section>
  );
}
