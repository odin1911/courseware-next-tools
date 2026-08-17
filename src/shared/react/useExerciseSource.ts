import { useEffect, useRef } from 'react';
import { getExerciseInterceptor } from '../core/api';
import type { ExerciseBootstrapData } from '../core/exercise-bootstrap';
import type { AppProps } from '../core/types/exercise';

interface ExerciseSource {
  key: string;
  promise: Promise<ExerciseBootstrapData>;
  requestProps: AppProps;
  resolve: (data: ExerciseBootstrapData) => void;
  reject: (error: unknown) => void;
}

function createExerciseSource(key: string, requestProps: AppProps): ExerciseSource {
  let resolve!: ExerciseSource['resolve'];
  let reject!: ExerciseSource['reject'];
  const promise = new Promise<ExerciseBootstrapData>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { key, promise, requestProps, resolve, reject };
}

/**
 * 返回只随五个启动数据源参数变化的 Promise；模板内部状态变化不会重新请求数据。
 */
export function useExerciseSource(props: AppProps): Promise<ExerciseBootstrapData> {
  const { businessContentUuid, channel, exerciseId, fetchDataUrl = '', unitId } = props;
  const key = JSON.stringify([channel, unitId, exerciseId, businessContentUuid, fetchDataUrl]);
  const sourceRef = useRef<ExerciseSource>();
  if (!sourceRef.current || sourceRef.current.key !== key) {
    sourceRef.current = createExerciseSource(key, props);
  }
  const source = sourceRef.current;

  useEffect(() => {
    let active = true;
    void getExerciseInterceptor(source.requestProps).then(
      (data) => {
        if (active) source.resolve(data);
      },
      (error: unknown) => {
        if (active) source.reject(error);
      },
    );

    return () => {
      active = false;
    };
  }, [source]);

  return source.promise;
}
