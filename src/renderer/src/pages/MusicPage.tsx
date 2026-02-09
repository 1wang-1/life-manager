
import { useRef, useEffect, useState, useMemo } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Upload, Trash2, Repeat, Shuffle, Repeat1, ListMusic, Plus, Music2, Globe, Disc, Import, X } from 'lucide-react';
import { clsx } from 'clsx';
import type { Track } from '../store/useMusicStore';
import { useMusicStore } from '../store/useMusicStore';
import { MusicService } from '../services/MusicService';
import { StorageService } from '../services/StorageService';
import './MusicPage.css';

type SourceStatus = 'idle' | 'loading' | 'success' | 'error';

const MUSIC_LAST_SOURCE_KEY = 'music_last_source';

const autoLoadLastSource = async (
  sourceUrl: string,
  loadScript: (url: string) => Promise<{ success: boolean; error?: string }>
) => {
  if (!sourceUrl) return { status: 'error' as const, message: '缺少源地址' };
  try {
    const result = await loadScript(sourceUrl);
    if (result.success) return { status: 'success' as const };
    return { status: 'error' as const, message: result.error || '加载失败' };
  } catch (e) {
    return { status: 'error' as const, message: e instanceof Error ? e.message : String(e) };
  }
};

const shouldShowSearchGuide = (status: SourceStatus) => status === 'idle' || status === 'error';

// Format seconds to mm:ss
const formatTime = (seconds: number) => {
  if (!seconds || isNaN(seconds)) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export default function MusicPage() {
  const { 
    activeTab, activePlaylistId, localPlaylist, onlineSearchResults, savedPlaylists, customSources,
    currentTrackId, status, volume, playMode, currentTime, duration,
    setActiveTab, addLocalTracks, removeLocalTrack, clearLocalPlaylist, setSearchResults,
    importPlaylistStub, addCustomSource, deletePlaylist,
    play, pause, next, prev, setVolume, setMode,
    syncTime, syncDuration, handleTrackEnd, setError, cleanup
  } = useMusicStore();

  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sourceFileInputRef = useRef<HTMLInputElement>(null);
  const autoLoadOnce = useRef(false);
  
  // Local state for UI
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [sourceStatus, setSourceStatus] = useState<SourceStatus>('idle');
  const [sourceMessage, setSourceMessage] = useState('');
  
  // Local state for seeking interaction (Optimistic UI)
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState(0);

  // Determine which list is "active" for the player context
  const activeList = useMemo<Track[]>(() => {
    // This logic should ideally match the store's "next" logic
    // For now, we just look up the track in all lists to display info
    const allTracks = [...localPlaylist, ...onlineSearchResults, ...savedPlaylists.flatMap(p => p.tracks)];
    return allTracks;
  }, [localPlaylist, onlineSearchResults, savedPlaylists]);

  const currentTrack = useMemo<Track | undefined>(() => 
    activeList.find(t => t.id === currentTrackId), 
  [activeList, currentTrackId]);

  const activePlaylistTitle = useMemo(() => {
    if (activeTab !== 'playlist' || !activePlaylistId) return null;
    return savedPlaylists.find((p) => p.id === activePlaylistId)?.title || null;
  }, [activePlaylistId, activeTab, savedPlaylists]);

  const headerTitle =
    activeTab === 'local'
      ? '本地音乐'
      : activeTab === 'search'
        ? '在线搜索'
        : activeTab === 'playlist'
          ? activePlaylistTitle || '歌单详情'
          : '源管理';

  const headerSubtitle =
    activeTab === 'local'
      ? '导入与播放本地文件'
      : activeTab === 'search'
        ? '搜索并加入到你的播放列表'
        : activeTab === 'playlist'
          ? '管理歌单与曲目'
          : '管理自定义音乐源';

  // Sync Audio Element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume / 100;
    if (status === 'playing' && audio.paused) {
      audio.play().catch(e => { console.error("Play error:", e); setError(); });
    } else if (status === 'paused' && !audio.paused) {
      audio.pause();
    }
  }, [status, volume, setError]);

  // Sync Source
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (currentTrack) {
      const needUpdate = audio.src !== currentTrack.fileUrl;
      if (needUpdate) {
        audio.src = currentTrack.fileUrl;
        if (status === 'playing') audio.play().catch(console.error);
      }
    } else {
      audio.pause();
      audio.src = '';
    }
  }, [currentTrack, status]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { cleanup(); };
  }, [cleanup]);

  useEffect(() => {
    if (autoLoadOnce.current) return;
    autoLoadOnce.current = true;
    const lastSource = StorageService.get<string>(MUSIC_LAST_SOURCE_KEY, '');
    if (!lastSource) return;
    setCustomSourceUrl(lastSource);
    setSourceStatus('loading');
    setSourceMessage('');
    (async () => {
      const { lxAdapter } = await import('../utils/LxPluginAdapter');
      const result = await autoLoadLastSource(lastSource, lxAdapter.loadScript.bind(lxAdapter));
      if (result.status === 'success') {
        setSourceStatus('success');
        setSourceMessage('');
      } else if (result.status === 'error') {
        setSourceStatus('error');
        setSourceMessage(result.message || '未知错误');
      }
    })();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const audioFiles = files.filter(f => f.type.startsWith('audio/'));
      const lrcFiles = files.filter(f => f.name.endsWith('.lrc'));
      addLocalTracks(audioFiles, lrcFiles);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const [customSourceUrl, setCustomSourceUrl] = useState('https://ghproxy.net/https://raw.githubusercontent.com/pdone/lx-music-source/main/sixyin/latest.js');
  const [isSourceLoading, setIsSourceLoading] = useState(false);

  // Load custom source
  const handleLoadSource = async (overrideUrl?: string) => {
    const url = (overrideUrl ?? customSourceUrl).trim();
    if (!url) return;
    setIsSourceLoading(true);
    setSourceStatus('loading');
    setSourceMessage('');
    // Dynamically import adapter to avoid top-level side effects if needed
    const { lxAdapter } = await import('../utils/LxPluginAdapter');
    
    try {
      const result = await lxAdapter.loadScript(url);
      if (result.success) {
        alert('音源加载成功，现在可以在线搜索了。');
        addCustomSource(url);
        StorageService.set(MUSIC_LAST_SOURCE_KEY, url);
        setSourceStatus('success');
      } else {
        alert(`音源加载失败：${result.error || '未知错误'}\n\n请尝试镜像或检查网络。`);
        setSourceStatus('error');
        setSourceMessage(result.error || '未知错误');
      }
    } catch (e) {
      alert(`加载失败：${e}`);
      setSourceStatus('error');
      setSourceMessage(String(e));
    }
    
    setIsSourceLoading(false);
  };

  const handleLocalSourceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (sourceFileInputRef.current) sourceFileInputRef.current.value = '';

    setIsSourceLoading(true);
    setSourceStatus('loading');
    setSourceMessage('');
    const { lxAdapter } = await import('../utils/LxPluginAdapter');

    try {
      const content = await file.text();
      const result = await lxAdapter.loadScriptContent(content, file.name);

      if (result.success) {
        alert('本地音源加载成功，现在可以在线搜索了。');
        setSourceStatus('success');
      } else {
        alert(`本地音源加载失败：${result.error || '未知错误'}`);
        setSourceStatus('error');
        setSourceMessage(result.error || '未知错误');
      }
    } catch (error) {
      alert(`本地音源加载失败：${error instanceof Error ? error.message : String(error)}`);
      setSourceStatus('error');
      setSourceMessage(error instanceof Error ? error.message : String(error));
    }

    setIsSourceLoading(false);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    // First try LX search, if fails, it falls back to iTunes inside MusicService
    const results = await MusicService.searchOnline(searchQuery);
    setSearchResults(results);
    setIsSearching(false);
  };

  const handleImportPlaylist = () => {
    if (!importUrl) return;
    // Basic validation
    if (importUrl.includes('music.163.com') || importUrl.includes('y.qq.com')) {
      importPlaylistStub(importUrl);
      setShowImportModal(false);
      setImportUrl('');
      alert('歌单已导入（演示模式：无法获取版权音乐，仅创建列表）');
    } else {
      alert('暂不支持该链接格式，请使用网易云或QQ音乐歌单链接');
    }
  };

  const handleSeekStart = () => { setIsDragging(true); setDragTime(currentTime); };
  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => { setDragTime(Number(e.target.value)); };
  const handleSeekEnd = () => { if (audioRef.current) audioRef.current.currentTime = dragTime; setIsDragging(false); };

  const toggleMode = () => {
    const modes: ('list-loop' | 'single-loop' | 'shuffle')[] = ['list-loop', 'single-loop', 'shuffle'];
    const nextIdx = (modes.indexOf(playMode) + 1) % modes.length;
    setMode(modes[nextIdx]);
  };

  const getModeIcon = () => {
    switch (playMode) {
      case 'single-loop': return <Repeat1 size={18} />;
      case 'shuffle': return <Shuffle size={18} />;
      default: return <Repeat size={18} />;
    }
  };

  // Render Content based on Active Tab
  const renderContent = () => {
    if (activeTab === 'local') {
      return (
        <div className="track-list-view">
           {localPlaylist.length === 0 ? (
             <div className="empty-player">
               <Music2 size={48} className="text-gray-300 mb-4" />
               <p>暂无本地音乐</p>
               <button className="btn-primary mt-4" onClick={() => fileInputRef.current?.click()}>
                 导入音乐
               </button>
             </div>
           ) : (
             localPlaylist.map((track, idx) => (
               <div key={track.id} className={clsx('track-row', currentTrackId === track.id && 'playing')} onClick={() => play(track)}>
                 <div className="track-index">{idx + 1}</div>
                 <div className="track-details">
                   <div className="track-name">{track.title}</div>
                   <div className="track-artist">{track.artist}</div>
                 </div>
                 <div className="track-meta">
                   <span>{formatTime(track.duration || 0)}</span>
                   <button className="btn-icon" onClick={(e) => { e.stopPropagation(); removeLocalTrack(track.id); }}>
                     <Trash2 size={14} />
                   </button>
                 </div>
               </div>
             ))
           )}
        </div>
      );
    }

    if (activeTab === 'search') {
      return (
        <div>
          {shouldShowSearchGuide(sourceStatus) && (
            <div className="source-guide">
              <div>
                <div className="source-guide-title">未加载音乐源</div>
                <div className="source-guide-desc">请前往“源管理”启用 LX 音乐源后再进行搜索。</div>
              </div>
              <button className="btn-secondary" onClick={() => setActiveTab('settings')}>
                去源管理
              </button>
            </div>
          )}
          <div className="search-container">
            <input 
              className="search-input" 
              placeholder="搜索歌曲、歌手、专辑 (iTunes 源)" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button className="btn-primary" onClick={handleSearch} disabled={isSearching}>
              {isSearching ? '搜索中...' : '搜索'}
            </button>
          </div>
          
          <div className="track-list-view">
            {onlineSearchResults.map((track, idx) => (
               <div key={track.id} className={clsx('track-row', currentTrackId === track.id && 'playing')} onClick={() => play(track)}>
                 <div className="track-index">{idx + 1}</div>
                 <div className="track-cover">
                   {track.coverUrl && <img src={track.coverUrl} alt="cover" />}
                 </div>
                 <div className="track-details">
                   <div className="track-name">{track.title}</div>
                   <div className="track-artist">{track.artist}</div>
                 </div>
                 <div className="track-meta">
                   <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">在线试听</span>
                   <span>{formatTime(track.duration || 0)}</span>
                 </div>
               </div>
            ))}
            {onlineSearchResults.length === 0 && !isSearching && (
              <div className="text-center text-gray-400 py-10">
                输入关键词开始搜索
              </div>
            )}
          </div>
        </div>
      );
    }

    if (activeTab === 'playlist' && activePlaylistId) {
      const playlist = savedPlaylists.find(p => p.id === activePlaylistId);
      if (!playlist) return <div>歌单不存在</div>;
      
      return (
        <div>
           <div className="mb-6 flex items-end gap-4">
             <div className="w-32 h-32 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400">
               {playlist.coverUrl ? <img src={playlist.coverUrl} className="w-full h-full object-cover rounded-lg" /> : <Disc size={40} />}
             </div>
             <div>
               <h2 className="text-2xl font-bold mb-2">{playlist.title}</h2>
               <p className="text-gray-500 text-sm">{playlist.description || `${playlist.tracks.length} 首歌曲`}</p>
               <div className="mt-4 flex gap-2">
                 <button className="btn-primary" onClick={() => playlist.tracks.length > 0 && play(playlist.tracks[0])}>
                   <Play size={16} className="mr-2 inline" /> 播放全部
                 </button>
                 <button className="btn-ghost text-red-500 border-red-200 hover:bg-red-50" onClick={() => {
                   if(confirm('确定删除此歌单吗？')) {
                     deletePlaylist(playlist.id);
                     setActiveTab('local');
                   }
                 }}>
                   删除歌单
                 </button>
               </div>
             </div>
           </div>

           <div className="track-list-view">
             {playlist.tracks.length === 0 ? (
               <div className="text-center text-gray-400 py-10">暂无歌曲</div>
             ) : (
               playlist.tracks.map((track, idx) => (
                 <div key={track.id} className={clsx('track-row', currentTrackId === track.id && 'playing')} onClick={() => play(track)}>
                   <div className="track-index">{idx + 1}</div>
                   <div className="track-details">
                     <div className="track-name">{track.title}</div>
                     <div className="track-artist">{track.artist}</div>
                   </div>
                   <div className="track-meta">
                     <span>{formatTime(track.duration || 0)}</span>
                   </div>
                 </div>
               ))
             )}
           </div>
        </div>
      );
    }

    if (activeTab === 'settings') {
      return (
        <div>
          <h2 className="text-xl font-bold mb-4">自定义音乐源</h2>
          <div className="bg-white p-6 rounded-xl border border-gray-100">
            <p className="text-sm text-gray-500 mb-4">
              您可以加载第三方 LX Music 源脚本来扩展搜索和播放能力。
              <br/>
              <span className="text-red-400">注意：脚本运行在当前环境中，请确保来源可信。</span>
            </p>
            
            <div className="flex gap-2 mb-4">
              <input 
                className="text-input flex-1" 
                placeholder="输入源脚本 URL (.js)" 
                value={customSourceUrl}
                onChange={e => setCustomSourceUrl(e.target.value)}
              />
              <button 
                className="btn-primary" 
                onClick={() => handleLoadSource()} 
                disabled={isSourceLoading}
              >
                {isSourceLoading ? '加载中...' : '加载并启用'}
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              <input
                ref={sourceFileInputRef}
                type="file"
                accept=".js"
                style={{ display: 'none' }}
                onChange={handleLocalSourceFileChange}
              />
              <button
                className="btn-secondary"
                onClick={() => sourceFileInputRef.current?.click()}
                disabled={isSourceLoading}
              >
                选择本地音源脚本
              </button>
              <button
                className="btn-ghost"
                onClick={() => handleLoadSource('https://ghproxy.net/https://raw.githubusercontent.com/pdone/lx-music-source/main/sixyin/latest.js')}
                disabled={isSourceLoading}
              >
                自动切换到可用源
              </button>
            </div>

            {sourceStatus === 'loading' && (
              <div className="source-status loading">正在自动加载上次使用的源...</div>
            )}
            {sourceStatus === 'success' && (
              <div className="source-status success">已启用上次使用的源</div>
            )}
            {sourceStatus === 'error' && (
              <div className="source-status error">自动加载失败：{sourceMessage}</div>
            )}

            {customSources.length > 0 && (
              <div>
                <h3 className="font-medium mb-2">已保存的源</h3>
                <div className="flex flex-col gap-2">
                  {customSources.map((src, idx) => (
                    <div key={idx} className="text-sm text-gray-600 bg-gray-50 p-2 rounded truncate">
                      {src}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="page-container music-page">
      {/* Sidebar */}
      <div className="music-sidebar">
        <div className="sidebar-section">
          <div className="sidebar-title">我的音乐</div>
          <div className={clsx('nav-item', activeTab === 'local' && 'active')} onClick={() => setActiveTab('local')}>
            <Music2 size={18} />
            <span>本地音乐</span>
          </div>
          <div className={clsx('nav-item', activeTab === 'search' && 'active')} onClick={() => setActiveTab('search')}>
            <Globe size={18} />
            <span>在线搜索</span>
          </div>
          <div className={clsx('nav-item', activeTab === 'settings' && 'active')} onClick={() => setActiveTab('settings')}>
            <Import size={18} />
            <span>自定义源</span>
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-title flex justify-between items-center">
              <span>创建的歌单</span>
              <button onClick={() => setShowImportModal(true)} title="导入歌单" className="hover:text-gray-600">
                <Plus size={14} />
              </button>
            </div>
          <div className="playlist-nav-list">
            {savedPlaylists.map(pl => (
              <div 
                key={pl.id} 
                className={clsx('nav-item', activeTab === 'playlist' && activePlaylistId === pl.id && 'active')}
                onClick={() => setActiveTab('playlist', pl.id)}
              >
                <ListMusic size={18} />
                <span className="truncate">{pl.title}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="music-main-area">
        <div className="page-header main-header">
          <div className="header-content">
            <h1 className="page-title">{headerTitle}</h1>
            <p className="page-subtitle">{headerSubtitle}</p>
          </div>
          <div className="page-header-actions header-actions">
            {activeTab === 'local' && (
              <>
                <button className="btn-ghost" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={18} />
                  <span>导入文件</span>
                </button>
                <button className="btn-ghost" onClick={() => { if(confirm('清空列表?')) clearLocalPlaylist() }}>
                  <Trash2 size={18} />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="content-scroll-area">
          {renderContent()}
        </div>

        {/* Floating Player Bar */}
        <div className="floating-player">
          <audio 
            ref={audioRef}
            onTimeUpdate={(e) => syncTime(e.currentTarget.currentTime)}
            onDurationChange={(e) => syncDuration(e.currentTarget.duration)}
            onEnded={handleTrackEnd}
            onError={setError}
          />
          
          <div className="fp-track-info">
            {currentTrack ? (
              <>
                <div className="w-12 h-12 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                  {currentTrack.coverUrl ? (
                    <img src={currentTrack.coverUrl} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <Music2 size={24} />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="font-medium truncate text-sm">{currentTrack.title}</div>
                  <div className="text-xs text-gray-500 truncate">{currentTrack.artist}</div>
                </div>
              </>
            ) : (
              <div className="text-sm text-gray-400">未播放</div>
            )}
          </div>

          <div className="fp-controls">
            <div className="fp-buttons">
              <button className="control-btn small" onClick={toggleMode}>{getModeIcon()}</button>
              <button className="control-btn" onClick={prev}><SkipBack size={20} /></button>
              <button className="control-btn main w-10 h-10" onClick={status === 'playing' ? pause : () => currentTrack && play(currentTrack)}>
                {status === 'playing' ? <Pause size={20} /> : <Play size={20} fill="currentColor" />}
              </button>
              <button className="control-btn" onClick={next}><SkipForward size={20} /></button>
            </div>
            <div className="fp-progress">
              <span className="text-xs text-gray-400 w-10 text-right">{formatTime(isDragging ? dragTime : currentTime)}</span>
              <input 
                type="range" 
                className="seek-slider"
                min="0" max={duration || 100}
                value={isDragging ? dragTime : currentTime}
                onMouseDown={handleSeekStart}
                onChange={handleSeekChange}
                onMouseUp={handleSeekEnd}
              />
              <span className="text-xs text-gray-400 w-10">{formatTime(duration)}</span>
            </div>
          </div>

          <div className="fp-volume">
             <div className="flex items-center gap-2 text-gray-400">
               <Volume2 size={16} />
               <input 
                 type="range" 
                 className="volume-slider"
                 min="0" max="100" 
                 value={volume} 
                 onChange={(e) => setVolume(Number(e.target.value))}
               />
             </div>
          </div>
        </div>
      </div>

      {/* Hidden Inputs & Modals */}
      <input type="file" ref={fileInputRef} hidden multiple accept="audio/*,.lrc" onChange={handleFileChange} />
      
      {showImportModal && (
        <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>导入歌单</h3>
              <button className="btn-icon" onClick={() => setShowImportModal(false)}><X size={20} /></button>
            </div>
            <div className="input-group">
              <label>歌单链接 (支持网易云/QQ音乐)</label>
              <input 
                className="text-input" 
                placeholder="https://music.163.com/#/playlist?id=..." 
                value={importUrl}
                onChange={e => setImportUrl(e.target.value)}
              />
            </div>
            <p className="text-xs text-gray-500 mb-4">
              提示：由于版权限制，导入功能目前仅同步歌单信息，无法直接播放会员歌曲。建议使用“在线搜索”功能查找替代版本。
            </p>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setShowImportModal(false)}>取消</button>
              <button className="btn-primary" onClick={handleImportPlaylist}>导入</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
