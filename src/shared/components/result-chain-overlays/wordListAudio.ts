export interface SharedWordListAudioController {
  play(options: { src: string; loop: boolean; volume: number }): unknown;
  stop(): unknown;
  destroy?(): unknown;
}

export function playSharedWordListEntryAudio(
  audioController: Pick<SharedWordListAudioController, 'play'>,
  audioUrl?: string,
) {
  if (!audioUrl) {
    return false;
  }

  audioController.play({
    src: audioUrl,
    loop: false,
    volume: 1,
  });

  return true;
}
