export interface DeleteEmailTemplateUseCase {
  execute(id: number): Promise<boolean>;
}
