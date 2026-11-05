# Workflow Agent

Plataforma SaaS donde pequeños negocios arman bots de mensajería, con o sin IA, para atender a sus clientes por WhatsApp y, más adelante, por Facebook e Instagram.

## Actores

**Negocio**:
La cuenta que paga la suscripción a la plataforma; agrupa sus Miembros, Flujos, Agentes y datos.
_Avoid_: Cliente, tenant, empresa, usuario

**Miembro**:
Una persona del Negocio con acceso a la plataforma, ya sea el dueño o un empleado.
_Avoid_: Usuario, empleado, operador

**Asesor**:
Un Miembro mientras atiende una conversación en lugar del bot.
_Avoid_: Agente humano, operador, soporte

**Propietario**:
El Miembro dueño de la cuenta del Negocio, único que maneja suscripción y pagos.
_Avoid_: Dueño, superadmin

**Administrador**:
Un Miembro que configura el Negocio y ve todas sus Conversaciones y su auditoría.
_Avoid_: Admin, gerente

**Atención**:
El rol de Miembro que solo atiende Conversaciones en la Bandeja.
_Avoid_: Rol Asesor, agente, operador

**Contacto**:
La persona que le escribe al Negocio por un canal de mensajería.
_Avoid_: Usuario, cliente final, lead

## Automatización

**Flujo**:
Una secuencia configurable de pasos que guía la conversación con un Contacto.
_Avoid_: Bot, workflow, automatización

**Flujo principal**:
El Flujo que responde por defecto en un canal cuando ningún Disparador aplica.
_Avoid_: Flujo por defecto, bienvenida

**Disparador**:
Una condición, como una palabra clave, un anuncio de Meta o el horario, que arranca un Flujo distinto del principal.
_Avoid_: Trigger, evento, regla

**Menú de opciones**:
Un paso de Flujo que ofrece opciones al Contacto, como botones o lista, y continúa por la rama elegida.
_Avoid_: Menú (sin calificar), botonera

**Agente**:
Un modelo de IA configurado por el Negocio que conversa con el Contacto como un paso dentro de un Flujo, y que puede usar Herramientas y documentos del Negocio.
_Avoid_: Bot, IA, asistente

**Herramienta**:
Una acción del sistema, como apartar una cita, crear un pedido o pasar a un Asesor, que un Agente puede invocar y que un Flujo también puede ejecutar como paso.
_Avoid_: Tool, función, acción

**Traspaso**:
El paso de control de una Conversación del bot (Flujo o Agente) a un Asesor.
_Avoid_: Handoff, escalamiento, transferencia

**Base de conocimiento**:
Un conjunto de documentos, páginas y preguntas frecuentes del Negocio que un Agente consulta para responder.
_Avoid_: Documentos, FAQ, knowledge base

**Plantilla de Flujo**:
Un Flujo prearmado por tipo de negocio que el Negocio copia y personaliza.
_Avoid_: Plantilla (sin calificar), template

**Respuesta rápida**:
Un texto guardado que un Asesor inserta en la Conversación con un atajo.
_Avoid_: Plantilla, macro, saludo predefinido

## Conversación

**Conversación**:
El hilo completo entre un Negocio y un Contacto en un canal; no expira.
_Avoid_: Chat, ticket, hilo

**Sesión**:
Un tramo de atención dentro de una Conversación que empieza con un mensaje del Contacto y termina por inactividad (con un tiempo configurable por Flujo o paso), al finalizar el Flujo o al cerrarla un Asesor.
_Avoid_: Ventana, ticket

**Horario de atención**:
Las horas en que el Negocio tiene Miembros disponibles para recibir un Traspaso.
_Avoid_: Agenda, horario laboral

**Ficha del Contacto**:
Los datos de un Contacto dentro del Negocio: historial de Pedidos, Reservas y Calificaciones, etiquetas y notas internas de los Miembros.
_Avoid_: Perfil, CRM, cliente

**Ventana de servicio**:
El plazo de 24 horas desde el último mensaje del Contacto en que WhatsApp permite responder libremente.
_Avoid_: Sesión, ventana de 24h

**Plantilla de WhatsApp**:
Un mensaje aprobado por Meta, el único que se puede enviar fuera de la Ventana de servicio.
_Avoid_: Plantilla (sin calificar), HSM, template

**Calificación**:
La nota de 1 a 5 que da un Contacto al cerrar una Sesión, atribuida al Asesor si hubo Traspaso o al bot si no.
_Avoid_: Encuesta, rating, CSAT

## Datos del Negocio

**Colección**:
Una tabla de datos con campos definidos por el Negocio.
_Avoid_: Tabla, base de datos, hoja

**Registro**:
Una fila de una Colección.
_Avoid_: Fila, entrada, respuesta

**Formulario**:
Un paso de Flujo que pide al Contacto los campos de una Colección y guarda un Registro.
_Avoid_: Encuesta, cuestionario

**Agenda**:
El conjunto de disponibilidades de los Recursos del Negocio, cada uno con sus propios horarios.
_Avoid_: Calendario, Horario de atención

**Recurso**:
Algo con cupo limitado que se reserva, como una mesa, un barbero o una sala.
_Avoid_: Espacio, empleado, cupo

**Servicio**:
Algo que el Negocio ofrece con una duración y un precio, como "corte de pelo, 30 min".
_Avoid_: Producto (cuando tiene duración), tratamiento

**Reserva**:
Un Recurso ocupado en un horario para un Contacto, sea una cita o una mesa.
_Avoid_: Cita, turno, agendamiento

**Catálogo**:
Los Productos que vende un Negocio, agrupados en categorías.
_Avoid_: Menú, carta, inventario

**Producto**:
Algo que el Negocio vende por el Catálogo, como "Pizza hawaiana".
_Avoid_: Artículo, ítem, plato

**Variante**:
Una versión de un Producto con precio propio, como "Mediana".
_Avoid_: Tamaño, presentación, opción

**Adicional**:
Algo que el Contacto agrega o quita a un Producto, con precio extra opcional, como "extra queso" o "sin cebolla".
_Avoid_: Topping, modificador, extra

**Stock**:
La cantidad opcional disponible de un Producto o Variante, que baja con cada Pedido; sin Stock, solo se marca disponible o agotado.
_Avoid_: Inventario, existencias

**Pedido**:
Una Colección del sistema con Productos del Catálogo, cantidades, total, tipo de entrega, estado de avance y estado de pago.
_Avoid_: Orden, compra, venta

**Pedido en borrador**:
Un Pedido que el Contacto empezó pero no confirmó; se puede retomar dentro de un plazo y luego se descarta.
_Avoid_: Carrito, pedido abandonado

**Método de pago**:
Una forma de pago que el Negocio acepta y que el propio Negocio verifica, como efectivo, Nequi o transferencia; la plataforma no procesa pagos.
_Avoid_: Pasarela, medio de pago

**Zona de domicilio**:
Un área de entrega con un costo de envío fijo.
_Avoid_: Cobertura, sector

## Cobro

**Plan Flujos**:
La suscripción que incluye Flujos, Bandeja, Pedidos, Reservas y Colecciones, sin Agentes.
_Avoid_: Plan básico, plan gratis

**Plan IA**:
La suscripción del Plan Flujos más Agentes, con un Saldo IA mensual incluido.
_Avoid_: Plan pro, plan premium

**Configuración asistida**:
Un servicio de pago aparte en el que el equipo de la plataforma configura el Negocio con un acceso temporal y auditado.
_Avoid_: Soporte, onboarding, ayuda

**Saldo IA**:
La billetera prepagada del Negocio, en pesos colombianos, de la que se descuenta el uso de todos sus Agentes; lo recargado no vence.
_Avoid_: Créditos, presupuesto, balance

**Presupuesto mensual**:
Un tope opcional de gasto por mes para un Agente concreto, dentro del Saldo IA.
_Avoid_: Límite, cuota
