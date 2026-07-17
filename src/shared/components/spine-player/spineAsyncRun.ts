export interface SpinePlayerRunToken {
  readonly runId: number;
  abort: () => void;
  isCurrent: () => boolean;
}

export interface SpineAsyncRun extends SpinePlayerRunToken {
  checkpoint: (options?: { revokeOnSkip?: boolean }) => boolean;
  commit: (action: () => void, options?: { revokeOnSkip?: boolean }) => boolean;
  trackBlobUrls: (blobUrls: Iterable<string>) => void;
  releaseBlobUrls: () => string[];
  notifyReady: () => boolean;
  fail: (error: unknown) => void;
}

interface CreateSpineAsyncRunControllerOptions {
  onReady?: () => void;
  onError?: (message: string) => void;
  onAbort?: () => void;
  revoke?: (blobUrl: string) => void;
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function createRunTokenGate() {
  let currentRunId = 0;

  return {
    nextRun(): SpinePlayerRunToken {
      const runId = currentRunId + 1;
      currentRunId = runId;
      let aborted = false;

      return {
        runId,
        abort() {
          aborted = true;
        },
        isCurrent() {
          return !aborted && currentRunId === runId;
        },
      };
    },
  };
}

export function createSpineAsyncRunController({
  onReady,
  onError,
  onAbort,
  revoke = (blobUrl) => URL.revokeObjectURL(blobUrl),
}: CreateSpineAsyncRunControllerOptions = {}) {
  const gate = createRunTokenGate();

  return {
    nextRun(): SpineAsyncRun {
      const runToken = gate.nextRun();
      let ownedBlobUrls: string[] = [];
      let resourcesReleased = false;

      const revokeOwnedBlobUrls = () => {
        if (!ownedBlobUrls.length) {
          resourcesReleased = true;
          return;
        }

        const blobUrls = ownedBlobUrls;
        ownedBlobUrls = [];
        resourcesReleased = true;
        blobUrls.forEach((blobUrl) => revoke(blobUrl));
      };

      const checkpoint = ({ revokeOnSkip = true }: { revokeOnSkip?: boolean } = {}) => {
        const current = runToken.isCurrent();

        if (!current && revokeOnSkip) {
          revokeOwnedBlobUrls();
        }

        return current;
      };

      return {
        runId: runToken.runId,
        abort() {
          const wasCurrent = runToken.isCurrent();
          runToken.abort();

          if (wasCurrent) {
            onAbort?.();
          }

          revokeOwnedBlobUrls();
        },
        isCurrent: runToken.isCurrent,
        checkpoint,
        commit(action, options) {
          if (!checkpoint(options)) {
            return false;
          }

          action();
          return true;
        },
        trackBlobUrls(blobUrls) {
          const nextBlobUrls = [...blobUrls];

          if (!nextBlobUrls.length) {
            return;
          }

          if (!runToken.isCurrent() || resourcesReleased) {
            nextBlobUrls.forEach((blobUrl) => revoke(blobUrl));
            return;
          }

          ownedBlobUrls.push(...nextBlobUrls);
        },
        releaseBlobUrls() {
          if (!ownedBlobUrls.length) {
            return [];
          }

          const blobUrls = ownedBlobUrls;
          ownedBlobUrls = [];
          resourcesReleased = true;
          return blobUrls;
        },
        notifyReady() {
          return this.commit(() => {
            onReady?.();
          });
        },
        fail(error) {
          revokeOwnedBlobUrls();

          if (runToken.isCurrent()) {
            onError?.(toErrorMessage(error));
          }
        },
      };
    },
  };
}
