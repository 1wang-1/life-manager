type LxSearchPlayInput = {
  name: string;
  singer?: string;
};

export const buildLxSearchPlayUrl = ({ name, singer }: LxSearchPlayInput) => {
  const keyword = singer ? `${name}-${singer}` : name;
  return `lxmusic://music/searchPlay/${encodeURIComponent(keyword)}`;
};
