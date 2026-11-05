# Toda la plataforma corre en AWS con SST y Lambdas

La infraestructura se define con SST en un monorepo (`core`, `functions`, `web`, `admin`) y corre solo en AWS, priorizando servicios que se pagan por uso para mantener bajo el costo inicial. Los mensajes de WhatsApp entran por una Lambda que valida la firma de Meta y los encola en SQS FIFO agrupados por Conversación, para conservar el orden por Contacto y procesar Contactos distintos en paralelo. Los modelos de IA salen solo de Amazon Bedrock, y la Base de conocimiento usa Bedrock Knowledge Bases con Amazon S3 Vectors, que no tiene un mínimo mensual como OpenSearch Serverless.

## Consequences

- Los modelos disponibles son los que ofrece Bedrock. Los niveles (Económico, Equilibrado, Avanzado) se configuran en el panel interno.
- Los temporizadores (Sesiones, Pedidos en borrador, devolución al bot) se resuelven con una Lambda programada cada minuto, con un margen aceptado de un minuto.
- La Bandeja usa `sst.aws.Realtime` y la autenticación de Miembros usa OpenAuth.
