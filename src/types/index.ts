export type { Database, Slab, Project, Profile } from './database';

export interface SlabType {
  value: 'marble' | 'granite' | 'quartzite';
  label: string;
  prompt: string;
}

export const SLAB_TYPES: SlabType[] = [
  {
    value: 'marble',
    label: 'Marble',
    prompt: 'photorealistic marble stone with natural veining, polished surface with subtle reflections, high-end luxury appearance, correct scale and proportion, realistic lighting'
  },
  {
    value: 'granite',
    label: 'Granite',
    prompt: 'photorealistic granite stone with natural speckled pattern, polished surface with depth, high-end luxury appearance, correct scale and proportion, realistic lighting and reflections'
  },
  {
    value: 'quartzite',
    label: 'Quartzite',
    prompt: 'photorealistic quartzite stone with natural crystalline pattern and veining, polished surface with subtle shimmer, high-end luxury appearance, correct scale and proportion, realistic lighting'
  }
];
