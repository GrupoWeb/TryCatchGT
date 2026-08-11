export interface DeleteCadenceUseCase {
  execute(id: number): Promise<boolean>;
}
