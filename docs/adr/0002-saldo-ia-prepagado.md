# El uso de IA se revende con un Saldo IA prepagado y reserva previa

La plataforma paga los modelos de IA y cobra su uso a cada Negocio desde un Saldo IA prepagado en pesos colombianos, con un margen porcentual global configurable. No se permite que el Negocio traiga su propia API key (BYOK). Antes de cada llamada a un modelo se reserva de forma atómica el costo máximo estimado y después se liquida el costo real, de modo que ni el Saldo IA ni el Presupuesto mensual de un Agente se puedan sobrepasar, aunque haya varias Conversaciones simultáneas.

## Considered Options

- **BYOK**: se descartó porque los Negocios objetivo (panaderías, tiendas de barrio) no van a gestionar API keys, y porque haría imposible garantizar un tope de gasto.
- **Medir el costo solo después de cada llamada**: se descartó porque con llamadas concurrentes el gasto puede superar el saldo.

## Consequences

- Al agotarse el saldo o el presupuesto, el Agente se apaga y la Conversación pasa a un respaldo configurable (seguir con el Flujo o hacer Traspaso).
- Internamente los costos se calculan en USD, que es como cobra el proveedor, y se convierten a pesos al recargar.
