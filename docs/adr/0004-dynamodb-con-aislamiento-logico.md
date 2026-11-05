# DynamoDB con una tabla por área y aislamiento lógico en `core`

Los datos viven en DynamoDB, con una tabla por área (Negocios y Miembros, Conversaciones, Contactos, Catálogo, Pedidos, Agenda y Reservas, Colecciones y Registros, Saldo IA, Auditoría), con acceso mediante DynamoDB-Toolbox. Se eligió porque encaja con Lambdas (sin manejar conexiones), no tiene costo fijo y no exige esquema, lo que encaja con las Colecciones que define el Negocio.

El aislamiento entre Negocios es un requisito crítico de seguridad. Como DynamoDB no tiene Row-Level Security, es lógico: toda clave empieza por el identificador del Negocio, y todo acceso a datos pasa por `packages/core`, que exige ese identificador en cada operación. Ninguna Lambda ni pantalla accede a DynamoDB directamente, y hay pruebas automáticas que verifican que un Negocio no puede leer datos de otro.

## Considered Options

- **Postgres con RLS**: daba aislamiento a nivel de base de datos y consultas libres, pero se descartó por su costo fijo y por el manejo de conexiones desde Lambdas.
- **Diseño de una sola tabla**: se descartó en favor de varias tablas, por ser más fácil de entender, con el mismo costo.

## Consequences

- Las métricas se precalculan como contadores diarios con DynamoDB Streams, porque DynamoDB no agrega.
- La búsqueda de Contactos es por teléfono o prefijo de nombre. La búsqueda libre de texto requeriría otro servicio.
- Reservas y Saldo IA usan escrituras condicionales y transacciones para evitar Reservas dobles y gastar de más.
