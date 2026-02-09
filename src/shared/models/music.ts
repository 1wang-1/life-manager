export enum MusicSource {
  None = 'none',
  ThirdParty = 'third_party',
  Local = 'local'
}

export type MusicState = {
  source: MusicSource;
  lastQuery?: string;
};

export function defaultMusicState(): MusicState {
  return { source: MusicSource.None };
}
