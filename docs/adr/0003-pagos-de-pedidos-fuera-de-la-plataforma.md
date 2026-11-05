# La plataforma no procesa los pagos de los Pedidos

La plataforma toma el Pedido, pero no cobra. Cada Negocio define sus Métodos de pago (efectivo, Nequi, Daviplata, transferencia o un link de pago propio), el bot da las instrucciones, el Contacto puede adjuntar el comprobante y un Miembro marca el Pedido como pagado después de verificarlo. Se decidió así para no asumir el riesgo, la regulación y la integración de una pasarela en el MVP, y porque los Negocios objetivo ya cobran por sus propios medios.

## Consequences

- El estado de pago de un Pedido (Pendiente o Pagado) es independiente de su estado de avance y se actualiza a mano.
- Integrar una pasarela es una ampliación futura, no un cambio de modelo.
