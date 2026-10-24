/** Native-stack focuses the destination before its outgoing Unity surface has detached. */
export async function capturePreview(configuration: string, capture: (configuration: string) => Promise<string>, active: () => boolean): Promise<string | undefined> {
  for (let attempt = 0; attempt < 10 && active(); attempt++) {
    try { return await capture(configuration); }
    catch (error) {
      if (!(error instanceof Error) || !error.message.includes('Unity is busy') || attempt === 9) throw error;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}
