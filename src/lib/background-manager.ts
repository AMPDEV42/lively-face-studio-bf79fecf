import { supabase } from '@/integrations/supabase/client';
import { generatePlaceholderBackground } from './generate-placeholder-backgrounds';

export interface BackgroundItem {
  id: string;
  name: string;
  url: string;
  type: 'default' | 'uploaded';
  isPro: boolean;
  thumbnail?: string;
}

// Default backgrounds dengan gambar real dari folder public
export const DEFAULT_BACKGROUNDS: BackgroundItem[] = [
  {
    id: 'cyberpunk-city',
    name: 'Cyberpunk City',
    url: '/backgrounds/thumbs/ChatGPT Image 24 Apr 2026, 18.45.05.png',
    type: 'default',
    isPro: false,
    thumbnail: '/backgrounds/thumbs/ChatGPT Image 24 Apr 2026, 18.45.05.png',
  },
  {
    id: 'neon-grid',
    name: 'Neon Grid',
    url: '/backgrounds/thumbs/ChatGPT Image 24 Apr 2026, 18.49.24.png',
    type: 'default',
    isPro: false,
    thumbnail: '/backgrounds/thumbs/ChatGPT Image 24 Apr 2026, 18.49.24.png',
  },
  {
    id: 'space-station',
    name: 'Space Station',
    url: '/backgrounds/thumbs/ChatGPT Image 24 Apr 2026, 18.54.56.png',
    type: 'default',
    isPro: false,
    thumbnail: '/backgrounds/thumbs/ChatGPT Image 24 Apr 2026, 18.54.56.png',
  },
  {
    id: 'digital-void',
    name: 'Digital Void',
    url: '/backgrounds/thumbs/ChatGPT Image 24 Apr 2026, 18.55.55.png',
    type: 'default',
    isPro: false,
    thumbnail: '/backgrounds/thumbs/ChatGPT Image 24 Apr 2026, 18.55.55.png',
  },
  // Pro-only defaults
  {
    id: 'hologram-lab',
    name: 'Hologram Lab',
    url: '/backgrounds/thumbs/ChatGPT Image 24 Apr 2026, 18.56.06.png',
    type: 'default',
    isPro: true,
    thumbnail: '/backgrounds/thumbs/ChatGPT Image 24 Apr 2026, 18.56.06.png',
  },
  {
    id: 'matrix-code',
    name: 'Matrix Code',
    url: '/backgrounds/thumbs/ChatGPT Image 24 Apr 2026, 18.57.17.png',
    type: 'default',
    isPro: true,
    thumbnail: '/backgrounds/thumbs/ChatGPT Image 24 Apr 2026, 18.57.17.png',
  },
  // Additional Pro backgrounds
  {
    id: 'cyber-nexus',
    name: 'Cyber Nexus',
    url: '/backgrounds/thumbs/ChatGPT Image 24 Apr 2026, 18.59.30.png',
    type: 'default',
    isPro: true,
    thumbnail: '/backgrounds/thumbs/ChatGPT Image 24 Apr 2026, 18.59.30.png',
  },
  {
    id: 'quantum-realm',
    name: 'Quantum Realm',
    url: '/backgrounds/thumbs/ChatGPT Image 24 Apr 2026, 18.59.41.png',
    type: 'default',
    isPro: true,
    thumbnail: '/backgrounds/thumbs/ChatGPT Image 24 Apr 2026, 18.59.41.png',
  },
];

export class BackgroundManager {
  private static STORAGE_KEY = 'vrm-custom-backgrounds';
  private static BUCKET_NAME = 'backgrounds';

  // Get all available backgrounds for user
  static async getBackgrounds(isPro: boolean = false): Promise<BackgroundItem[]> {
    console.log('[BackgroundManager] Getting backgrounds, isPro:', isPro);
    const backgrounds: BackgroundItem[] = [];
    
    // Add default backgrounds based on user tier (now using real images)
    const defaultBackgrounds = DEFAULT_BACKGROUNDS.filter(bg => !bg.isPro || isPro);
    console.log('[BackgroundManager] Adding', defaultBackgrounds.length, 'default backgrounds');
    backgrounds.push(...defaultBackgrounds);
    
    // Add custom uploaded backgrounds (Pro only)
    if (isPro) {
      const customBackgrounds = await this.getCustomBackgrounds();
      console.log('[BackgroundManager] Adding', customBackgrounds.length, 'custom backgrounds');
      backgrounds.push(...customBackgrounds);
    }
    
    console.log('[BackgroundManager] Total backgrounds:', backgrounds.length);
    return backgrounds;
  }

  // Ensure background image exists, generate fallback if needed
  private static async ensureBackgroundExists(background: BackgroundItem): Promise<BackgroundItem> {
    try {
      // Try to load the image
      await this.checkImageExists(background.url);
      return background;
    } catch {
      // Generate fallback image
      console.log(`Generating fallback for ${background.id}`);
      const fallbackUrl = this.generateFallbackImage(background.id);
      const fallbackThumbnail = this.generateFallbackThumbnail(background.id);
      
      return {
        ...background,
        url: fallbackUrl,
        thumbnail: fallbackThumbnail,
      };
    }
  }

  // Check if image exists
  private static checkImageExists(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Skip check for data URLs (generated placeholders)
      if (url.startsWith('data:')) {
        resolve();
        return;
      }
      
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => reject();
      img.src = url;
      
      // Timeout after 5 seconds
      setTimeout(() => reject(new Error('Image load timeout')), 5000);
    });
  }

  // Generate fallback image based on background ID
  private static generateFallbackImage(backgroundId: string): string {
    const colorMap: Record<string, string[]> = {
      'cyberpunk-city': ['#0a0a1f', '#1a0a2e', '#16213e', '#0f3460'],
      'neon-grid': ['#0f0f23', '#1a1a3a', '#2d1b69', '#1e3a8a'],
      'space-station': ['#000000', '#1a1a2e', '#16213e', '#0f172a'],
      'digital-void': ['#0c0c0c', '#1a0a2e', '#2d1b69', '#1e1b4b'],
      'hologram-lab': ['#0a1a2e', '#1a2e4b', '#2e4b69', '#4b6987'],
      'matrix-code': ['#000000', '#0a1a0a', '#1a2e1a', '#2e4b2e'],
    };

    const colors = colorMap[backgroundId] || ['#0a0a1f', '#1a0a2e', '#16213e'];
    return generatePlaceholderBackground(backgroundId, colors, 1920, 1080);
  }

  // Generate fallback thumbnail
  private static generateFallbackThumbnail(backgroundId: string): string {
    const colorMap: Record<string, string[]> = {
      'cyberpunk-city': ['#0a0a1f', '#1a0a2e', '#16213e', '#0f3460'],
      'neon-grid': ['#0f0f23', '#1a1a3a', '#2d1b69', '#1e3a8a'],
      'space-station': ['#000000', '#1a1a2e', '#16213e', '#0f172a'],
      'digital-void': ['#0c0c0c', '#1a0a2e', '#2d1b69', '#1e1b4b'],
      'hologram-lab': ['#0a1a2e', '#1a2e4b', '#2e4b69', '#4b6987'],
      'matrix-code': ['#000000', '#0a1a0a', '#1a2e1a', '#2e4b2e'],
    };

    const colors = colorMap[backgroundId] || ['#0a0a1f', '#1a0a2e', '#16213e'];
    return generatePlaceholderBackground(backgroundId, colors, 200, 112);
  }

  // Get custom uploaded backgrounds
  static async getCustomBackgrounds(): Promise<BackgroundItem[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return this.getLocalStorageBackgrounds();

      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list(user.id, { limit: 50, sortBy: { column: 'created_at', order: 'desc' } });

      if (error) throw error;
      if (!data?.length) return this.getLocalStorageBackgrounds();

      const items: BackgroundItem[] = data.map((file) => {
        const { data: pub } = supabase.storage
          .from(this.BUCKET_NAME)
          .getPublicUrl(`${user.id}/${file.name}`);
        return {
          id: `custom-${file.name}`,
          name: file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
          url: pub.publicUrl,
          type: 'uploaded' as const,
          isPro: true,
          thumbnail: pub.publicUrl,
        };
      });

      // Merge with localStorage (for offline-uploaded ones)
      const local = this.getLocalStorageBackgrounds();
      const localOnly = local.filter(l => !items.find(i => i.url === l.url));
      return [...items, ...localOnly];
    } catch (err) {
      console.warn('[BackgroundManager] Supabase fetch failed, using localStorage:', err);
      return this.getLocalStorageBackgrounds();
    }
  }

  // Upload background (Pro only)
  static async uploadBackground(file: File, userId?: string): Promise<BackgroundItem> {
    if (!file.type.startsWith('image/')) throw new Error('File harus berupa gambar');
    if (file.size > 10 * 1024 * 1024) throw new Error('Ukuran file maksimal 10MB');

    if (userId) {
      try {
        const ext = file.name.split('.').pop() ?? 'jpg';
        const fileName = `${Date.now()}.${ext}`;
        const filePath = `${userId}/${fileName}`;

        const { error } = await supabase.storage
          .from(this.BUCKET_NAME)
          .upload(filePath, file, { upsert: false });

        if (error) throw error;

        const { data: pub } = supabase.storage.from(this.BUCKET_NAME).getPublicUrl(filePath);
        return {
          id: `custom-${fileName}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          url: pub.publicUrl,
          type: 'uploaded',
          isPro: true,
          thumbnail: pub.publicUrl,
        };
      } catch (err) {
        console.warn('[BackgroundManager] Supabase upload failed, falling back to localStorage:', err);
      }
    }

    return this.uploadToLocalStorage(file);
  }

  // Delete custom background
  static async deleteBackground(backgroundId: string, userId?: string): Promise<void> {
    if (!backgroundId.startsWith('custom-')) {
      throw new Error('Tidak dapat menghapus background default');
    }
    
    try {
      // Try Supabase first
      if (userId) {
        const fileName = backgroundId.replace('custom-', '');
        const filePath = `${userId}/${fileName}`;
        
        await supabase.storage
          .from(this.BUCKET_NAME)
          .remove([filePath]);
        
        return;
      }
    } catch (error) {
      console.warn('Supabase delete failed, using localStorage:', error);
    }
    
    // Fallback to localStorage
    this.deleteFromLocalStorage(backgroundId);
  }

  // Get current background setting
  static getCurrentBackground(): string {
    return localStorage.getItem('vrm-current-background') || 'cyberpunk-city';
  }

  // Set current background
  static setCurrentBackground(backgroundId: string): void {
    localStorage.setItem('vrm-current-background', backgroundId);
  }

  // Private methods for localStorage fallback
  private static getLocalStorageBackgrounds(): BackgroundItem[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private static async uploadToLocalStorage(file: File): Promise<BackgroundItem> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const backgrounds = this.getLocalStorageBackgrounds();
          const newBackground: BackgroundItem = {
            id: `custom-${Date.now()}`,
            name: file.name.replace(/\.[^/.]+$/, ''),
            url: reader.result as string, // Base64 data URL
            type: 'uploaded',
            isPro: true,
          };
          
          backgrounds.push(newBackground);
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(backgrounds));
          resolve(newBackground);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Gagal membaca file'));
      reader.readAsDataURL(file);
    });
  }

  private static deleteFromLocalStorage(backgroundId: string): void {
    const backgrounds = this.getLocalStorageBackgrounds();
    const filtered = backgrounds.filter(bg => bg.id !== backgroundId);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
  }

  private static getSupabaseUrl(userId: string, fileName: string): string {
    const { data } = supabase.storage
      .from(this.BUCKET_NAME)
      .getPublicUrl(`${userId}/${fileName}`);
    return data.publicUrl;
  }

  // Create thumbnail from image (for better performance)
  static async createThumbnail(file: File, maxWidth: number = 200): Promise<string> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      
      const reader = new FileReader();
      reader.onload = () => img.src = reader.result as string;
      reader.readAsDataURL(file);
    });
  }
}