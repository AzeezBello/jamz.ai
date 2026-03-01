import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Play, 
  Heart, 
  MoreVertical, 
  Clock, 
  Music,
  Trash2,
  Download,
  Share2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DashboardProps {
  onClose: () => void;
}

export default function Dashboard({ onClose }: DashboardProps) {
  const { userSongs, songs, playSong, likeSong, deleteSong, user, shareSong } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('library');
  
  const filteredSongs = (activeTab === 'library' ? userSongs : songs).filter(song =>
    song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };
  
  const handleShare = (id: string) => {
    const url = shareSong(id);
    navigator.clipboard.writeText(url);
  };
  
  if (!user) return null;
  
  return (
    <div className="fixed inset-0 z-50 bg-black overflow-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 glass-strong border-b border-white/10">
        <div className="max-w-[1400px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={onClose}
                className="text-white/70 hover:text-white hover:bg-white/10"
              >
                ← Back
              </Button>
              <h1 className="text-2xl font-bold text-white">My Dashboard</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5">
                <Sparkles className="w-4 h-4 text-[#ff6b6b]" />
                <span className="text-white text-sm">{user.credits} credits</span>
              </div>
              <div className="w-10 h-10 rounded-full gradient-coral flex items-center justify-center">
                <span className="text-black font-semibold">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-[1400px] mx-auto px-6 py-8 pb-32">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-2">
              <Music className="w-5 h-5 text-[#ff6b6b]" />
              <span className="text-white/50 text-sm">Total Songs</span>
            </div>
            <p className="text-3xl font-bold text-white">{userSongs.length}</p>
          </div>
          
          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-2">
              <Play className="w-5 h-5 text-[#ff6b6b]" />
              <span className="text-white/50 text-sm">Total Plays</span>
            </div>
            <p className="text-3xl font-bold text-white">
              {formatNumber(userSongs.reduce((acc, s) => acc + s.plays, 0))}
            </p>
          </div>
          
          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-2">
              <Heart className="w-5 h-5 text-[#ff6b6b]" />
              <span className="text-white/50 text-sm">Total Likes</span>
            </div>
            <p className="text-3xl font-bold text-white">
              {formatNumber(userSongs.reduce((acc, s) => acc + s.likes, 0))}
            </p>
          </div>
          
          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-[#ff6b6b]" />
              <span className="text-white/50 text-sm">Plan</span>
            </div>
            <p className="text-3xl font-bold text-white capitalize">{user.plan}</p>
          </div>
        </div>
        
        {/* Search and Tabs */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-white/5">
              <TabsTrigger 
                value="library" 
                className="data-[state=active]:bg-[#ff6b6b] data-[state=active]:text-black"
              >
                My Library
              </TabsTrigger>
              <TabsTrigger 
                value="discover"
                className="data-[state=active]:bg-[#ff6b6b] data-[state=active]:text-black"
              >
                Discover
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              placeholder="Search songs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
          </div>
        </div>
        
        {/* Songs List */}
        <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr className="text-left text-white/50 text-sm">
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Plays</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Likes</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filteredSongs.map((song, index) => (
                <tr 
                  key={song.id}
                  className="group hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => playSong(song)}
                >
                  <td className="px-4 py-3 text-white/50 w-12">
                    <span className="group-hover:hidden">{index + 1}</span>
                    <Play className="w-4 h-4 text-white hidden group-hover:block" fill="currentColor" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img 
                        src={song.image} 
                        alt={song.title}
                        className="w-10 h-10 rounded object-cover"
                      />
                      <div>
                        <p className="text-white font-medium">{song.title}</p>
                        <p className="text-white/50 text-sm">{song.artist}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white/50 hidden md:table-cell">
                    {formatNumber(song.plays)}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        likeSong(song.id);
                      }}
                      className={`flex items-center gap-1 ${song.isLiked ? 'text-[#ff6b6b]' : 'text-white/50'} hover:text-[#ff6b6b]`}
                    >
                      <Heart className="w-4 h-4" fill={song.isLiked ? 'currentColor' : 'none'} />
                      {formatNumber(song.likes)}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-white/50">
                    {formatTime(song.duration)}
                  </td>
                  <td className="px-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button 
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 hover:bg-white/10 rounded-lg text-white/50 hover:text-white"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-[#0a0a0a] border-white/10 text-white">
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShare(song.id);
                          }}
                          className="cursor-pointer hover:bg-white/10"
                        >
                          <Share2 className="w-4 h-4 mr-2" />
                          Share
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            // Download
                          }}
                          className="cursor-pointer hover:bg-white/10"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        {activeTab === 'library' && (
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSong(song.id);
                            }}
                            className="cursor-pointer hover:bg-white/10 text-[#ff6b6b]"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredSongs.length === 0 && (
            <div className="text-center py-12">
              <Music className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/50">No songs found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { Sparkles } from 'lucide-react';
