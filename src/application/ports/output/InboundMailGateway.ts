/**
 * Puerto de salida hacia el proveedor de correo entrante (Hostinger Agentic Mail).
 * Permite acusar recibo de un mensaje ya procesado —marcarlo como leído y, si se
 * configura una carpeta, moverlo— para que no se reprocese en la bandeja del agente.
 *
 * Es best-effort: `markProcessed` NUNCA lanza; devuelve `true` solo si el proveedor
 * confirmó la operación. Si no hay token/credenciales configuradas, es inerte.
 */
export interface InboundMailGateway {
  markProcessed(providerMessageId: string): Promise<boolean>;

  /**
   * Descarga el cuerpo completo de un correo desde la URL temporal (`bodyUrl`) que
   * trae el webhook (el `bodyHtml` del payload viene recortado a ~200 caracteres).
   * Best-effort: NUNCA lanza; devuelve el HTML/texto completo, o `null` si no hay
   * URL, la descarga falla o el TTL expiró (el llamador cae al cuerpo recortado).
   */
  fetchFullBody(bodyUrl: string): Promise<string | null>;
}
