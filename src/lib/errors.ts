export class UserInputError extends Error {
  public override readonly name = 'UserInputError'
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function requireUserInput(condition: boolean, message: string): void {
  if (!condition) {
    throw new UserInputError(message)
  }
}
