/** Le transport natif ne rend jamais le corps contenant les positions. */
type Reply = { status: number; batchId: string | null; problemType?: string | null };

export async function sendPrivateEvidence(deps: {
  current(): boolean;
  token(): string | null;
  refresh(stale: string | null, problem: unknown): Promise<string | null>;
  send(token: string): Promise<Reply>;
}): Promise<void> {
  for (let count = 0; count < 50 && deps.current(); count += 1) {
    let token = deps.token();
    if (!token) return;
    let answer = await deps.send(token);
    if (!deps.current()) return;
    if (answer.status === 401) {
      token = await deps.refresh(token, answer.problemType ? { type: answer.problemType, detail: '' } : null);
      if (!token || !deps.current()) return;
      answer = await deps.send(token); // Le natif reprend exactement le même lot persistant.
    }
    if (answer.batchId === null && answer.status === 204) return;
    if (answer.status === 410) continue;
    if (answer.status < 200 || answer.status >= 300) throw new Error('Preuve non remise.');
  }
}
