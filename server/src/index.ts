import { crearServidor } from './server';

const { httpServer } = crearServidor();
const PORT = Number(process.env.PORT ?? 3001);

httpServer.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`servidor en :${PORT}`);
});
