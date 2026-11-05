/** Un mensaje que la plataforma envía a un Contacto por su canal. */
export type MensajeSaliente = {
  negocioId: string;
  telefono: string;
  texto: string;
};

/** Canal de mensajería (WhatsApp en el MVP). */
export interface Canal {
  enviar(mensaje: MensajeSaliente): Promise<void>;
}

/** Fuente de la hora actual, reemplazable en pruebas. */
export interface Reloj {
  ahora(): Date;
}
