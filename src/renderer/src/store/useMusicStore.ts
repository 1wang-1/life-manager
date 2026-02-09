
import { create } from 'zustand';
import { StorageService } from '../services/StorageService';
import { LyricLine, parseLrc } from '../utils/lrcParser';

export type PlayMode = 'list-loop' | 'single-loop' | 'shuffle';
export type PlayerStatus = 'playing' | 'paused' | 'loading' | 'error';
export type TabView = 'local' | 'search' | 'playlist' | 'settings';

export interface Track {
  id: string;
  title: string;
  artist: string;
  fileUrl: string; // Blob URL or Remote URL
  album?: string;
  coverUrl?: string;
  duration?: number;
  lrcContent?: string;
  lyrics?: LyricLine[];
  sourceType?: 'local' | 'online';
}

export interface Playlist {
  id: string;
  title: string;
  description?: string;
  tracks: Track[];
  coverUrl?: string;
  sourceUrl?: string; // Original URL if imported
}

interface MusicState {
  // Navigation
  activeTab: TabView;
  activePlaylistId: string | null;

  // Data
  localPlaylist: Track[];
  onlineSearchResults: Track[];
  savedPlaylists: Playlist[];
  customSources: string[]; // URLs of custom scripts

  // Player State
  currentTrackId: string | null;
  status: PlayerStatus;
  volume: number;
  playMode: PlayMode;
  currentTime: number;
  duration: number;
  isDraggingSeek: boolean;

  // Actions
  setActiveTab: (tab: TabView, playlistId?: string) => void;
  
  // Data Actions
  addLocalTracks: (files: File[], lrcFiles?: File[]) => Promise<void>;
  removeLocalTrack: (id: string) => void;
  clearLocalPlaylist: () => void;
  
  setSearchResults: (results: Track[]) => void;
  
  createPlaylist: (title: string, tracks?: Track[]) => void;
  deletePlaylist: (id: string) => void;
  addToPlaylist: (playlistId: string, track: Track) => void;
  importPlaylistStub: (url: string) => void; // Placeholder
  addCustomSource: (url: string) => void;
  toggleLike: (track: Track) => void;

  // Player Actions
  play: (track: Track) => Promise<void>; // Modified to accept track directly for online play
  pause: () => void;
  stop: () => void;
  next: () => void;
  prev: () => void;
  
  setVolume: (vol: number) => void;
  setMode: (mode: PlayMode) => void;
  
  syncTime: (time: number) => void;
  syncDuration: (duration: number) => void;
  setSeekTime: (time: number) => void;
  setDragState: (isDragging: boolean) => void;
  handleTrackEnd: () => void;
  setError: () => void;
  cleanup: () => void;
}

export const useMusicStore = create<MusicState>((set, get) => ({
  activeTab: 'local',
  activePlaylistId: null,

  localPlaylist: [],
  onlineSearchResults: [],
  savedPlaylists: StorageService.get<Playlist[]>('music_playlists', []),
  customSources: StorageService.get<string[]>('music_custom_sources', []),

  currentTrackId: null,
  status: 'paused',
  volume: StorageService.get<number>('music_volume', 50),
  playMode: StorageService.get<PlayMode>('music_mode', 'list-loop'),
  currentTime: 0,
  duration: 0,
  isDraggingSeek: false,

  setActiveTab: (tab, playlistId) => set({ activeTab: tab, activePlaylistId: playlistId || null }),

  addLocalTracks: async (audioFiles, lrcFiles = []) => {
    const newTracks: Track[] = [];
    
    for (const file of audioFiles) {
      const url = URL.createObjectURL(file);
      const nameParts = file.name.replace(/\.[^/.]+$/, "").split('-');
      const title = nameParts.length > 1 ? nameParts[1].trim() : nameParts[0].trim();
      const artist = nameParts.length > 1 ? nameParts[0].trim() : 'Unknown Artist';
      
      const baseName = file.name.replace(/\.[^/.]+$/, "");
      const lrcFile = lrcFiles.find(f => f.name.startsWith(baseName));
      
      let lyrics: LyricLine[] = [];
      let lrcContent = '';
      
      if (lrcFile) {
        try {
          lrcContent = await lrcFile.text();
          lyrics = parseLrc(lrcContent);
        } catch (e) {
          console.error('Failed to parse lrc', e);
        }
      }

      newTracks.push({
        id: crypto.randomUUID(),
        title,
        artist,
        fileUrl: url,
        lrcContent,
        lyrics,
        sourceType: 'local'
      });
    }

    set(state => ({ localPlaylist: [...state.localPlaylist, ...newTracks] }));
  },

  removeLocalTrack: (id) => {
    const state = get();
    const track = state.localPlaylist.find(t => t.id === id);
    if (track && track.sourceType === 'local') {
      URL.revokeObjectURL(track.fileUrl);
    }
    set(state => ({ localPlaylist: state.localPlaylist.filter(t => t.id !== id) }));
  },

  clearLocalPlaylist: () => {
    const state = get();
    state.localPlaylist.forEach(t => {
      if (t.sourceType === 'local') URL.revokeObjectURL(t.fileUrl);
    });
    set({ localPlaylist: [] });
  },

  setSearchResults: (results) => set({ onlineSearchResults: results }),

  createPlaylist: (title, tracks = []) => {
    const newPlaylist: Playlist = {
      id: crypto.randomUUID(),
      title,
      tracks,
      coverUrl: tracks.length > 0 ? tracks[0].coverUrl : undefined
    };
    set(state => {
      const updated = [...state.savedPlaylists, newPlaylist];
      StorageService.set('music_playlists', updated);
      return { savedPlaylists: updated };
    });
  },

  deletePlaylist: (id) => {
    set(state => {
      const updated = state.savedPlaylists.filter(p => p.id !== id);
      StorageService.set('music_playlists', updated);
      return { savedPlaylists: updated };
    });
  },

  addToPlaylist: (playlistId, track) => {
    set(state => {
      const updated = state.savedPlaylists.map(p => 
        p.id === playlistId 
          ? { ...p, tracks: [...p.tracks, track], coverUrl: p.coverUrl || track.coverUrl } 
          : p
      );
      StorageService.set('music_playlists', updated);
      return { savedPlaylists: updated };
    });
  },

  importPlaylistStub: (url) => {
    // This is a stub for the "Import" feature
    // In a real app, this would parse the URL and fetch metadata
    const idMatch = url.match(/id=(\d+)/);
    const id = idMatch ? idMatch[1] : 'unknown';
    const stubPlaylist: Playlist = {
      id: crypto.randomUUID(),
      title: `Imported Playlist (${id})`,
      description: `Imported from ${url}`,
      sourceUrl: url,
      tracks: []
    };
    set(state => {
      const updated = [...state.savedPlaylists, stubPlaylist];
      StorageService.set('music_playlists', updated);
      return { savedPlaylists: updated };
    });
  },

  addCustomSource: (url) => {
    set(state => {
      const updated = [...state.customSources, url];
      StorageService.set('music_custom_sources', updated);
      return { customSources: updated };
    });
  },

  toggleLike: (track) => {
    set(state => {
      let favPlaylist = state.savedPlaylists.find(p => p.id === 'favorites');
      const otherPlaylists = state.savedPlaylists.filter(p => p.id !== 'favorites');
      
      if (!favPlaylist) {
        favPlaylist = {
          id: 'favorites',
          title: '我喜欢的音乐',
          description: 'My Favorites',
          tracks: []
        };
      }

      const isLiked = favPlaylist.tracks.some(t => t.id === track.id);
      let newTracks = [];
      if (isLiked) {
        newTracks = favPlaylist.tracks.filter(t => t.id !== track.id);
      } else {
        newTracks = [track, ...favPlaylist.tracks];
      }

      const updatedFav = { ...favPlaylist, tracks: newTracks, coverUrl: newTracks.length > 0 ? newTracks[0].coverUrl : undefined };
      const allPlaylists = [updatedFav, ...otherPlaylists];
      
      StorageService.set('music_playlists', allPlaylists);
      return { savedPlaylists: allPlaylists };
    });
  },

  // Player Logic
  play: async (track) => {
    const state = get();
    // If playing same track, just resume
    if (state.currentTrackId === track.id && state.status === 'paused') {
      set({ status: 'playing' });
      return;
    }
    
    // Resolve URL if needed
    let finalUrl = track.fileUrl;
    if (track.sourceType === 'online' && !track.fileUrl) {
       // Lazy load URL
       set({ status: 'loading', currentTrackId: track.id });
       try {
         // Dynamically import to avoid circular dep if possible, or use injected service
         const { MusicService } = await import('../services/MusicService');
         finalUrl = await MusicService.getPlayUrl(track);
         if (!finalUrl) throw new Error("No URL found");
         
         // Update track with new URL
         const updatedTrack = { ...track, fileUrl: finalUrl };
         set(s => ({
            onlineSearchResults: s.onlineSearchResults.map(t => t.id === track.id ? updatedTrack : t),
            // Also update if in playlist... logic omitted for brevity
         }));
       } catch (e) {
         console.error("Failed to load music url", e);
         set({ status: 'error' });
         return;
       }
    }

    set({ currentTrackId: track.id, status: 'playing', currentTime: 0 });
    // Note: The UI <audio> element will react to track change and src update
  },

  pause: () => set({ status: 'paused' }),
  
  stop: () => set({ status: 'paused', currentTime: 0 }),

  next: () => {
    const state = get();
    // Determine context
    let currentContextList: Track[] = state.localPlaylist;
    if (state.activeTab === 'search') currentContextList = state.onlineSearchResults;
    else if (state.activeTab === 'playlist' && state.activePlaylistId) {
      const pl = state.savedPlaylists.find(p => p.id === state.activePlaylistId);
      if (pl) currentContextList = pl.tracks;
    }

    if (currentContextList.length === 0) return;
    
    const currentIndex = currentContextList.findIndex(t => t.id === state.currentTrackId);
    if (currentIndex === -1) {
        // If current track not in list, play first
        if (currentContextList.length > 0) {
            set({ currentTrackId: currentContextList[0].id, status: 'playing', currentTime: 0 });
        }
        return;
    }

    let nextIndex = 0;
    if (state.playMode === 'shuffle') {
      nextIndex = Math.floor(Math.random() * currentContextList.length);
    } else {
      nextIndex = (currentIndex + 1) % currentContextList.length;
    }
    
    set({ currentTrackId: currentContextList[nextIndex].id, status: 'playing', currentTime: 0 });
  },

  prev: () => {
    const state = get();
    let currentContextList: Track[] = state.localPlaylist;
    if (state.activeTab === 'search') currentContextList = state.onlineSearchResults;
    else if (state.activeTab === 'playlist' && state.activePlaylistId) {
      const pl = state.savedPlaylists.find(p => p.id === state.activePlaylistId);
      if (pl) currentContextList = pl.tracks;
    }

    if (currentContextList.length === 0) return;

    const currentIndex = currentContextList.findIndex(t => t.id === state.currentTrackId);
    if (currentIndex === -1) return;

    let prevIndex = 0;
    if (state.playMode === 'shuffle') {
       prevIndex = Math.floor(Math.random() * currentContextList.length);
    } else {
       prevIndex = (currentIndex - 1 + currentContextList.length) % currentContextList.length;
    }

    set({ currentTrackId: currentContextList[prevIndex].id, status: 'playing', currentTime: 0 });
  },

  setVolume: (vol) => {
    const v = Math.max(0, Math.min(100, vol));
    set({ volume: v });
    StorageService.set('music_volume', v);
  },

  setMode: (mode) => {
    set({ playMode: mode });
    StorageService.set('music_mode', mode);
  },

  syncTime: (time) => {
    if (!get().isDraggingSeek) {
      set({ currentTime: time });
    }
  },

  syncDuration: (duration) => set({ duration }),
  setSeekTime: (time) => set({ currentTime: time }),
  setDragState: (isDragging) => set({ isDraggingSeek: isDragging }),

  handleTrackEnd: () => {
    const { playMode } = get();
    if (playMode === 'single-loop') {
      set({ currentTime: 0, status: 'playing' });
    } else {
      get().next();
    }
  },

  setError: () => set({ status: 'error' }),

  cleanup: () => {
    get().localPlaylist.forEach(t => {
       if (t.sourceType === 'local') URL.revokeObjectURL(t.fileUrl);
    });
  }
}));
