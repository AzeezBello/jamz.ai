import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

export interface Song {
  id: string;
  title: string;
  artist: string;
  prompt: string;
  image: string;
  audioUrl: string;
  duration: number;
  plays: number;
  likes: number;
  createdAt: Date;
  isLiked?: boolean;
  stems?: string[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  plan: 'free' | 'pro' | 'premier';
  credits: number;
  dailyCreditsUsed: number;
  lastCreditReset: Date;
}

interface GenerationState {
  isGenerating: boolean;
  progress: number;
  status: string;
}

interface StoreState {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => void;
  
  // Songs
  songs: Song[];
  userSongs: Song[];
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  addSong: (song: Omit<Song, 'id' | 'createdAt' | 'plays' | 'likes'>) => void;
  deleteSong: (id: string) => void;
  likeSong: (id: string) => void;
  playSong: (song: Song) => void;
  pauseSong: () => void;
  resumeSong: () => void;
  seekTo: (time: number) => void;
  setCurrentTime: (time: number) => void;
  
  // Generation
  generation: GenerationState;
  startGeneration: (prompt: string) => Promise<Song | null>;
  cancelGeneration: () => void;
  
  // Credits
  useCredits: (amount: number) => boolean;
  addCredits: (amount: number) => void;
  resetDailyCredits: () => void;
  
  // Sharing
  shareSong: (id: string) => string;
}

const generateMockAudio = (title: string): string => {
  // In a real app, this would be actual audio URLs
  return `https://example.com/audio/${encodeURIComponent(title)}.mp3`;
};

const selectRandomImage = (): string => {
  const images = [
    '/images/song-1.jpg',
    '/images/song-2.jpg',
    '/images/song-3.jpg',
    '/images/song-4.jpg',
    '/images/song-5.jpg',
    '/images/song-6.jpg',
    '/images/song-7.jpg',
    '/images/song-8.jpg',
  ];
  return images[Math.floor(Math.random() * images.length)];
};

const mockSongs: Song[] = [
  {
    id: '1',
    title: 'Bittersweet Gravity',
    artist: 'Wistaria Addict',
    prompt: 'A melancholic indie rock song about lost love',
    image: '/images/song-1.jpg',
    audioUrl: generateMockAudio('Bittersweet Gravity'),
    duration: 184,
    plays: 256000,
    likes: 6000,
    createdAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    title: "Everything's Fine",
    artist: 'Staabsworth',
    prompt: 'An upbeat pop song about pretending to be okay',
    image: '/images/song-2.jpg',
    audioUrl: generateMockAudio('Everything is Fine'),
    duration: 198,
    plays: 384000,
    likes: 9600,
    createdAt: new Date('2024-01-20'),
  },
  {
    id: '3',
    title: 'goth girl knife fight.',
    artist: 'a.astronaut',
    prompt: 'Dark electronic music with intense beats',
    image: '/images/song-3.jpg',
    audioUrl: generateMockAudio('goth girl knife fight'),
    duration: 165,
    plays: 257000,
    likes: 4600,
    createdAt: new Date('2024-02-01'),
  },
  {
    id: '4',
    title: 'Mirror, mirror on the wall',
    artist: 'Vertical Smile',
    prompt: 'A reflective acoustic ballad about self-image',
    image: '/images/song-4.jpg',
    audioUrl: generateMockAudio('Mirror mirror'),
    duration: 210,
    plays: 202000,
    likes: 4900,
    createdAt: new Date('2024-02-10'),
  },
  {
    id: '5',
    title: 'Stuck In My Head',
    artist: 'Kostaboda',
    prompt: 'Catchy earworm pop song',
    image: '/images/song-5.jpg',
    audioUrl: generateMockAudio('Stuck In My Head'),
    duration: 175,
    plays: 99000,
    likes: 876,
    createdAt: new Date('2024-02-15'),
  },
  {
    id: '6',
    title: 'Muse',
    artist: 'sonoa',
    prompt: 'Inspirational orchestral electronic hybrid',
    image: '/images/song-6.jpg',
    audioUrl: generateMockAudio('Muse'),
    duration: 225,
    plays: 93000,
    likes: 285,
    createdAt: new Date('2024-02-20'),
  },
];

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      // Auth state
      user: null,
      isAuthenticated: false,
      
      // Songs state
      songs: mockSongs,
      userSongs: [],
      currentSong: null,
      isPlaying: false,
      currentTime: 0,
      
      // Generation state
      generation: {
        isGenerating: false,
        progress: 0,
        status: '',
      },
      
      // Auth actions
      login: async (email: string, _password: string) => {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const user: User = {
          id: uuidv4(),
          email,
          name: email.split('@')[0],
          plan: 'free',
          credits: 50,
          dailyCreditsUsed: 0,
          lastCreditReset: new Date(),
        };
        
        set({ user, isAuthenticated: true });
        return true;
      },
      
      signup: async (email: string, _password: string, name: string) => {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const user: User = {
          id: uuidv4(),
          email,
          name,
          plan: 'free',
          credits: 50,
          dailyCreditsUsed: 0,
          lastCreditReset: new Date(),
        };
        
        set({ user, isAuthenticated: true });
        return true;
      },
      
      logout: () => {
        set({ 
          user: null, 
          isAuthenticated: false,
          currentSong: null,
          isPlaying: false,
        });
      },
      
      // Song actions
      addSong: (songData) => {
        const newSong: Song = {
          ...songData,
          id: uuidv4(),
          createdAt: new Date(),
          plays: 0,
          likes: 0,
        };
        
        set(state => ({
          songs: [newSong, ...state.songs],
          userSongs: [newSong, ...state.userSongs],
        }));
      },
      
      deleteSong: (id: string) => {
        set(state => ({
          songs: state.songs.filter(s => s.id !== id),
          userSongs: state.userSongs.filter(s => s.id !== id),
        }));
      },
      
      likeSong: (id: string) => {
        set(state => ({
          songs: state.songs.map(s => 
            s.id === id 
              ? { ...s, likes: s.isLiked ? s.likes - 1 : s.likes + 1, isLiked: !s.isLiked }
              : s
          ),
        }));
      },
      
      playSong: (song: Song) => {
        set({ 
          currentSong: song, 
          isPlaying: true,
          currentTime: 0,
        });
        
        // Increment plays
        set(state => ({
          songs: state.songs.map(s => 
            s.id === song.id ? { ...s, plays: s.plays + 1 } : s
          ),
        }));
      },
      
      pauseSong: () => {
        set({ isPlaying: false });
      },
      
      resumeSong: () => {
        set({ isPlaying: true });
      },
      
      seekTo: (time: number) => {
        set({ currentTime: time });
      },
      
      setCurrentTime: (time: number) => {
        set({ currentTime: time });
      },
      
      // Generation actions
      startGeneration: async (prompt: string) => {
        const { user, useCredits } = get();
        
        if (!user) return null;
        
        // Check and use credits
        if (!useCredits(5)) {
          return null;
        }
        
        set({ 
          generation: { 
            isGenerating: true, 
            progress: 0, 
            status: 'Initializing...' 
          } 
        });
        
        // Simulate generation progress
        const steps = [
          { progress: 10, status: 'Analyzing prompt...', delay: 500 },
          { progress: 25, status: 'Composing melody...', delay: 1000 },
          { progress: 45, status: 'Generating instruments...', delay: 1200 },
          { progress: 60, status: 'Adding vocals...', delay: 1000 },
          { progress: 75, status: 'Mixing audio...', delay: 800 },
          { progress: 90, status: 'Finalizing...', delay: 600 },
          { progress: 100, status: 'Complete!', delay: 300 },
        ];
        
        for (const step of steps) {
          await new Promise(resolve => setTimeout(resolve, step.delay));
          set({ 
            generation: { 
              isGenerating: true, 
              progress: step.progress, 
              status: step.status 
            } 
          });
        }
        
        // Generate song title from prompt
        const title = prompt
          .replace(/^(make|create|generate)\s+(a|an)\s+/i, '')
          .replace(/^(song|track|beat|tune)\s+(about|for|with)\s+/i, '')
          .split(' ')
          .slice(0, 4)
          .join(' ')
          .replace(/^[a-z]/, c => c.toUpperCase());
        
        const newSong: Song = {
          id: uuidv4(),
          title: title || 'Untitled Creation',
          artist: user.name,
          prompt,
          image: selectRandomImage(),
          audioUrl: generateMockAudio(title),
          duration: 120 + Math.floor(Math.random() * 180),
          plays: 0,
          likes: 0,
          createdAt: new Date(),
        };
        
        get().addSong(newSong);
        
        set({ 
          generation: { 
            isGenerating: false, 
            progress: 0, 
            status: '' 
          } 
        });
        
        return newSong;
      },
      
      cancelGeneration: () => {
        set({ 
          generation: { 
            isGenerating: false, 
            progress: 0, 
            status: '' 
          } 
        });
      },
      
      // Credit actions
      useCredits: (amount: number) => {
        const { user } = get();
        if (!user) return false;
        
        // Check if daily reset needed
        const lastReset = new Date(user.lastCreditReset);
        const now = new Date();
        const isNewDay = lastReset.getDate() !== now.getDate() || 
                        lastReset.getMonth() !== now.getMonth() ||
                        lastReset.getFullYear() !== now.getFullYear();
        
        if (isNewDay) {
          set(state => ({
            user: state.user ? {
              ...state.user,
              credits: state.user.plan === 'free' ? 50 : state.user.plan === 'pro' ? 2500 : 10000,
              dailyCreditsUsed: 0,
              lastCreditReset: new Date(),
            } : null,
          }));
          return true;
        }
        
        if (user.credits < amount) {
          return false;
        }
        
        set(state => ({
          user: state.user ? {
            ...state.user,
            credits: state.user.credits - amount,
            dailyCreditsUsed: state.user.dailyCreditsUsed + amount,
          } : null,
        }));
        
        return true;
      },
      
      addCredits: (amount: number) => {
        set(state => ({
          user: state.user ? {
            ...state.user,
            credits: state.user.credits + amount,
          } : null,
        }));
      },
      
      resetDailyCredits: () => {
        set(state => ({
          user: state.user ? {
            ...state.user,
            credits: state.user.plan === 'free' ? 50 : state.user.plan === 'pro' ? 2500 : 10000,
            dailyCreditsUsed: 0,
            lastCreditReset: new Date(),
          } : null,
        }));
      },
      
      // Sharing
      shareSong: (id: string) => {
        const { songs } = get();
        const song = songs.find(s => s.id === id);
        if (!song) return '';
        
        return `${window.location.origin}/song/${id}`;
      },
    }),
    {
      name: 'jamz-storage',
      partialize: (state) => ({ 
        user: state.user, 
        isAuthenticated: state.isAuthenticated,
        userSongs: state.userSongs,
      }),
    }
  )
);
