# WhatsApp por API oficial como Tech Provider de Meta

La plataforma se integra con WhatsApp solo por la API oficial de Meta, registrándose como Tech Provider. Cada Negocio conecta su propio número con Embedded Signup, sin entregar tokens a mano, y le paga a Meta directamente las Plantillas de WhatsApp con su propia tarjeta. Para verificarse ante Meta se usa una SAS unipersonal colombiana, porque no hay una regla oficial que garantice la verificación de una persona natural.

## Considered Options

- **Librerías no oficiales de WhatsApp Web**: se descartaron por el riesgo de baneo de los números de los Negocios.
- **Revender los mensajes de Meta desde un saldo de la plataforma**: se descartó por ahora, para no asumir ese riesgo financiero.
- **Onboarding directo de cada Negocio en un BSP**: se descartó porque empeora la experiencia de alta y ata la plataforma a ese proveedor.

## Consequences

- Lanzar requiere verificar el negocio y pasar el App Review de Meta. Mientras tanto se desarrolla con un número de prueba.
- Fuera de la Ventana de servicio solo se pueden enviar Plantillas de WhatsApp aprobadas, que la plataforma crea y gestiona.
