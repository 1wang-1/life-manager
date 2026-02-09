
import { Track } from "../store/useMusicStore";
import { lxAdapter } from "../utils/LxPluginAdapter";

type LxSongMeta = { albumName?: string; pic?: string };
type LxSongInfo = {
  source?: string;
  id?: string | number;
  name?: string;
  singer?: string;
  albumName?: string;
  meta?: LxSongMeta;
  pic?: string;
  interval?: string;
};
type LxSearchResult = { list?: LxSongInfo[] };
type TrackWithLxInfo = Track & { originalLxInfo?: LxSongInfo };

// iTunes Search API interface
interface ItunesSearchResult {
  wrapperType: string;
  kind: string;
  artistId: number;
  collectionId: number;
  trackId: number;
  artistName: string;
  collectionName: string;
  trackName: string;
  collectionCensoredName: string;
  trackCensoredName: string;
  artistViewUrl: string;
  collectionViewUrl: string;
  trackViewUrl: string;
  previewUrl: string; // 30s preview
  artworkUrl30: string;
  artworkUrl60: string;
  artworkUrl100: string;
  collectionPrice: number;
  trackPrice: number;
  releaseDate: string;
  collectionExplicitness: string;
  trackExplicitness: string;
  discCount: number;
  discNumber: number;
  trackCount: number;
  trackNumber: number;
  trackTimeMillis: number;
  country: string;
  currency: string;
  primaryGenreName: string;
  isStreamable: boolean;
}

interface ItunesResponse {
  resultCount: number;
  results: ItunesSearchResult[];
}

// Helper to parse interval "03:30" to seconds
function parseInterval(interval: string): number {
  if (!interval) return 0;
  const parts = interval.split(':');
  if (parts.length === 2) {
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  }
  return 0;
}

export const MusicService = {
  // Initialize with a default source (e.g. sixyin)
  async initSource() {
    // Attempt to load the user's preferred source or a default one
    // For now, we rely on the user adding it in the UI, or we can hardcode the sixyin one for demo
    // const defaultSource = 'https://raw.githubusercontent.com/pdone/lx-music-source/main/sixyin/latest.js';
    // await lxAdapter.loadScript(defaultSource);
  },

  /**
   * Search for music
   * Tries LX Source first, falls back to iTunes
   */
  async searchOnline(query: string): Promise<Track[]> {
    if (!query) return [];
    
    // Try LX Adapter first
    try {
      const lxResultUnknown = await lxAdapter.search(query, 1);
      const lxResult = lxResultUnknown as LxSearchResult | null;
      if (lxResult?.list && lxResult.list.length > 0) {
        return lxResult.list.map((item) => ({
          id: `${item.source ?? 'unknown'}_${item.id ?? ''}`,
          title: item.name ?? '',
          artist: item.singer ?? '',
          album: item.meta?.albumName || item.albumName || '',
          fileUrl: '', // Will be fetched on play
          coverUrl: item.pic || item.meta?.pic,
          duration: item.interval ? parseInterval(item.interval) : 0,
          sourceType: 'online',
          originalLxInfo: item // Keep original info for fetching url
        }));
      }
    } catch (e) {
      console.warn("LX Search failed, falling back to iTunes", e);
    }

    // Fallback to iTunes
    try {
      const encodedQuery = encodeURIComponent(query);
      const response = await fetch(`https://itunes.apple.com/search?term=${encodedQuery}&media=music&entity=song&limit=20`);
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data: ItunesResponse = await response.json();
      
      return data.results.map(item => ({
        id: `itunes_${item.trackId}`,
        title: item.trackName,
        artist: item.artistName,
        album: item.collectionName,
        fileUrl: item.previewUrl, // Note: This is a 30s preview
        coverUrl: item.artworkUrl100.replace('100x100', '300x300'), // Get higher res
        duration: item.trackTimeMillis / 1000,
        sourceType: 'online'
      }));
    } catch (error) {
      console.error("Online search failed:", error);
      return [];
    }
  },

  /**
   * Fetch full play URL for a track
   */
  async getPlayUrl(track: Track): Promise<string> {
    if (track.fileUrl && track.fileUrl.startsWith('http')) return track.fileUrl;
    
    const lxInfo = (track as TrackWithLxInfo).originalLxInfo;
    if (track.sourceType === 'online' && lxInfo) {
      try {
        const url = await lxAdapter.getMusicUrl(lxInfo, '128k');
        if (url) return url;
      } catch (e) {
        console.error("Failed to get LX music URL", e);
      }
    }
    
    return '';
  },

  /**
   * Parse a playlist URL to extract ID and Platform
   * Supports: 
   * - Netease: music.163.com/#/playlist?id=123
   * - QQ: y.qq.com/n/ryqq/playlist/123
   */
  parsePlaylistUrl(url: string) {
    let platform = 'unknown';
    let id = '';

    if (url.includes('music.163.com')) {
      platform = 'netease';
      const match = url.match(/id=(\d+)/);
      if (match) id = match[1];
    } else if (url.includes('y.qq.com')) {
      platform = 'qq';
      // simple match for id in path or query
      const match = url.match(/playlist\/(\d+)/) || url.match(/id=(\d+)/);
      if (match) id = match[1];
    }

    return { platform, id };
  }
};
