import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';

interface ModelUpdateEvent {
  model_type: string;
  model_id: string;
  action: string;
  data: Record<string, unknown>;
  timestamp: string;
}

// Map model types to query keys for auto-invalidation
const modelQueryKeyMap: Record<string, string[]> = {
  Contact: ['contacts'],
  Company: ['companies'],
  Deal: ['deals'],
  Activity: ['activities'],
  Note: ['notes'],
  Pipeline: ['pipelines'],
  Tag: ['tags'],
};

export function useRealtimeUpdates(): void {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const echoRef = useRef<unknown>(null);

  useEffect(() => {
    // Only connect if Echo is globally available (loaded via CDN or bundled)
    const echo = (window as unknown as Record<string, unknown>).Echo;
    if (!echo || !user?.current_team_id) return;

    const teamChannel = (echo as { private: (ch: string) => { listen: (evt: string, cb: (e: ModelUpdateEvent) => void) => unknown } })
      .private(`team.${user.current_team_id}`)
      .listen('.model.updated', (event: ModelUpdateEvent) => {
        const queryKeys = modelQueryKeyMap[event.model_type];
        if (queryKeys) {
          queryKeys.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: [key] });
          });
        }
      });

    echoRef.current = teamChannel;

    // User notification channel
    (echo as { private: (ch: string) => { listen: (evt: string, cb: (e: unknown) => void) => unknown } })
      .private(`user.${user.id}`)
      .listen('.notification.created', () => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      });

    return () => {
      (echo as { leave: (ch: string) => void }).leave(`team.${user.current_team_id}`);
      (echo as { leave: (ch: string) => void }).leave(`user.${user.id}`);
    };
  }, [user?.current_team_id, user?.id, queryClient]);
}
