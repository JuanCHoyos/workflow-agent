# El Agente es un paso del Flujo y comparte Herramientas con él

El Agente no es un modo de atención aparte ni reemplaza al Flujo: es un tipo de paso dentro de un Flujo, que recibe el control y lo devuelve. Las acciones del sistema (consultar el Catálogo, crear Reservas o Pedidos, llenar Formularios, hacer un Traspaso) se definen una sola vez como Herramientas, y las usan tanto los pasos del Flujo como el Agente. Así un Negocio sin IA usa solo Flujos, uno con IA mezcla ambos, y no hay dos implementaciones de la misma lógica de negocio.

## Considered Options

- **Agente y Flujo como modos excluyentes por canal**: se descartó porque obliga a elegir entre control determinista e IA, y duplica las acciones.
- **Solo Agente, con el "flujo" como prompt**: se descartó porque los Negocios del Plan Flujos no tienen IA y porque los procesos críticos (Pedidos, Reservas) necesitan pasos deterministas.

## Consequences

- Las Herramientas que cambian datos exigen que el Contacto confirme un resumen antes de ejecutarse, sin importar si las invoca el Agente o el Flujo.
