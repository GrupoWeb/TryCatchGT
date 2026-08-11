export interface ProcessDueCadencesResult {
  processed: number; // inscripciones vencidas evaluadas
  sent: number; // correos efectivamente enviados
  completed: number; // inscripciones que terminaron todos sus pasos
  stopped: number; // inscripciones cortadas (cadencia inactiva/borrada)
}

export interface ProcessDueCadencesUseCase {
  execute(now?: Date): Promise<ProcessDueCadencesResult>;
}
