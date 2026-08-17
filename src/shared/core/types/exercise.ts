import type { ExerciseVo, UnitVo } from '@/shared/exercise-parser/src';

interface ExerciseEntityRef {
  id: string;
  type: string;
}

interface ExerciseResourceRelationships {
  resources?: {
    data: ExerciseEntityRef[];
  };
}

interface ExerciseQuestionRelationships extends ExerciseResourceRelationships {
  options?: {
    data: ExerciseEntityRef[];
  };
  'hot-zones'?: {
    data: ExerciseEntityRef[];
  };
}

interface ExerciseBaseIncludedItem {
  id: string;
  type: string;
  attributes?: any;
  relationships?: any;
}

interface ExerciseExplainIncludedItem extends ExerciseBaseIncludedItem {
  type: 'explain';
  attributes: {
    text: string;
  };
  relationships?: ExerciseResourceRelationships;
}

interface ExerciseOptionIncludedItem extends ExerciseBaseIncludedItem {
  type: 'options';
  attributes: {
    'is-checked': boolean;
    'additional-attributes': any;
    text: string;
    position: number;
  };
  relationships?: ExerciseResourceRelationships;
}

interface ExerciseQuestionIncludedItem extends ExerciseBaseIncludedItem {
  type: 'questions';
  attributes: {
    score: number;
    hint: any;
    'additional-attributes': any;
    text: string;
    position: number;
  };
  relationships?: ExerciseQuestionRelationships;
}

interface ExerciseHotZoneElementIncludedItem extends ExerciseBaseIncludedItem {
  type: 'hot-zone-elements';
  attributes: {
    'source-hot-zone-element-id': string | number | null;
    'area-position': any;
    text: string | null;
    'circle-area-position': any;
    type: string;
  };
  relationships?: ExerciseResourceRelationships;
}

interface ExerciseHotZoneIncludedItem extends ExerciseBaseIncludedItem {
  type: 'hot-zones';
  attributes: {
    'relation-type': string;
  };
  relationships?: {
    'hot-zone-elements'?: {
      data: ExerciseEntityRef[];
    };
  };
}

interface ExerciseResourceIncludedItem extends ExerciseBaseIncludedItem {
  type: 'resources';
  attributes: {
    'skeleton-path-v1': string | null;
    'skeleton-path': string | null;
    'atlas-path'?: string | null;
    mime: string;
    'video-path': string | null;
    'document-path': string | null;
    'additional-attributes': any;
    'image-path': string | null;
    'audio-path': string | null;
  };
}

interface ExerciseTemplateIncludedItem extends ExerciseBaseIncludedItem {
  type: 'templates';
  attributes: {
    'is-option-shuffle': boolean;
    'display-name': string;
    module: string;
    'instruction-en': string;
    name: string;
    'expected-time': number;
    'instruction-cn': string;
  };
}

type ExerciseIncludedItem =
  | ExerciseExplainIncludedItem
  | ExerciseOptionIncludedItem
  | ExerciseQuestionIncludedItem
  | ExerciseHotZoneIncludedItem
  | ExerciseHotZoneElementIncludedItem
  | ExerciseResourceIncludedItem
  | ExerciseTemplateIncludedItem
  | ExerciseBaseIncludedItem;

interface ExerciseDataItem {
  id: string;
  type: string;
  attributes: {
    'navigation-icon-id': string | number | null;
    'is-interactive-quiz': boolean;
    'instruction-en-audio': string | null;
    'marc-word-banks': any[];
    'display-level': number;
    'nav-name': string;
    'template-skin': string;
    'instruction-en': string | null;
    name: string;
    'additional-attributes': {
      'exercise-source': string;
      position: number;
      'background-image': string;
      'title-image': string;
      [key: string]: any;
    };
    'instruction-cn': string | null;
    position: number;
    'navigation-bg-color': string | null;
    'instruction-cn-audio': string | null;
    'navigation-bg-color-hover': string | null;
    dictionaries: any[];
    [key: string]: any;
  };
  relationships: {
    template?: { data: ExerciseEntityRef };
    explain?: { data: ExerciseEntityRef };
    'word-banks'?: { data: ExerciseEntityRef[] };
    questions?: { data: ExerciseEntityRef[] };
    [key: string]: any;
  };
  'courseware-type': string;
}

export interface ExerciseDataBundle {
  data: ExerciseDataItem;
  included: ExerciseIncludedItem[];
}

interface ExerciseNavigationItem {
  'navigation-name': string;
  'template-module': string;
  'navigation-icon-url': string;
  'exercise-id': number;
  'is-interactive-followed': boolean;
  'courseware-type': string;
  [key: string]: any;
}

export interface ExerciseResultItem {
  navigations: ExerciseNavigationItem[];
  position: number;
  categoryId: number;
  coursewareId: number;
  coursewareUnitGroupId: number;
  coursewareUnitGroupName: string;
  unitNaviName: string;
  displayTypeId: string;
  pptPoints: any[];
  courseAssetPath: string;
  publishHash: string;
  unit_id: number;
  unit_uuid: string;
  unit_name: string;
  course_font: string;
  interactive_quiz_ids: any[];
  exercises_data: ExerciseDataBundle[];
  is_mixed_courseware: boolean;
  [key: string]: any;
}

interface ExerciseResolvedResultItem extends Omit<ExerciseResultItem, 'exercises_data'> {
  exercises_data: ExerciseVo[];
}

export interface GetExerciseDataResponse {
  totalCount: number;
  result: ExerciseResultItem[];
  preparationMap: Record<string, any>;
}

export interface GetExerciseDataResolvedResponse extends Omit<GetExerciseDataResponse, 'result'> {
  result: ExerciseResolvedResultItem[];
}

export interface UnitDataResolvedResponse extends Omit<GetExerciseDataResponse, 'result'> {
  result: UnitVo[];
}

export interface AppProps {
  unitId: string;
  exerciseId: string;
  businessContentUuid: string;
  channel: string;
  fetchDataUrl?: string;
}
