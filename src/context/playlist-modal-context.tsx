import React, { createContext, useContext, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { apiFetch, GATEWAY_URL } from '../api/api-client';
import { PlaylistModal } from '../components/PlaylistModal';
import { useAuthModal } from './auth-modal-context';

interface PlaylistSummary {
  id: string
  title: string
  coverImageUrl?: string
  trackCount?: number
  isPrivate?: boolean
}

interface PlaylistModalContextType {
  isOpen: boolean;
  trackId: string | null;
  openModal: (trackId: string) => void;
  closeModal: () => void;
  addToPlaylist: (playlistId: string) => Promise<boolean>;
  playlists: PlaylistSummary[];
  loadPlaylists: () => Promise<void>;
  isLoading: boolean;
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const PlaylistModalContext = createContext<PlaylistModalContextType | undefined>(undefined);

export const PlaylistModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const { isGuest, openAuthModal } = useAuthModal();
  const [isOpen, setIsOpen] = useState(false);
  const [trackId, setTrackId] = useState<string | null>(null);
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  }, []);

  const loadPlaylists = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiFetch(`${GATEWAY_URL}/music/playlists`);
      if (response.ok) {
        const data = await response.json();
        setPlaylists(data);
      }
    } catch (error) {
      console.error('Failed to load playlists:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const openModal = useCallback(async (id: string) => {
    if (isGuest) {
      openAuthModal(t('authModal.reasons.playlist'));
      return;
    }
    setTrackId(id);
    setIsOpen(true);
    await loadPlaylists();
  }, [isGuest, openAuthModal, loadPlaylists, t]);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    setTrackId(null);
  }, []);

  const addToPlaylist = useCallback(async (playlistId: string): Promise<boolean> => {
    if (!trackId) return false;
    try {
      const response = await apiFetch(`${GATEWAY_URL}/music/playlists/${playlistId}/tracks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId }),
      });
      if (response.ok) {
        const playlistName = playlists.find(p => p.id === playlistId)?.title || '';
        showToast(t('playlistModal.track_added', { name: playlistName }));
        closeModal();
        return true;
      } else if (response.status === 409) {
        showToast(t('playlistModal.track_exists'));
        closeModal();
        return false;
      }
      showToast(t('playlistModal.add_error'));
      closeModal();
      return false;
    } catch (error) {
      console.error('Failed to add track to playlist:', error);
      showToast(t('playlistModal.connection_error'));
      closeModal();
      return false;
    }
  }, [trackId, playlists, closeModal, showToast, t]);

  return (
    <PlaylistModalContext.Provider value={{
      isOpen,
      trackId,
      openModal,
      closeModal,
      addToPlaylist,
      playlists,
      loadPlaylists,
      isLoading,
      toastMessage,
      showToast,
    }}>
      {children}
      <PlaylistModal />
    </PlaylistModalContext.Provider>
  );
};

export const usePlaylistModal = () => {
  const context = useContext(PlaylistModalContext);
  if (!context) throw new Error('usePlaylistModal must be used within PlaylistModalProvider');
  return context;
};