import { useState, useEffect, useCallback, useRef } from 'react';
import type { GoogleUser } from '../types';

declare global {
  interface Window {
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: object) => { requestAccessToken: (opts?: object) => void };
          revoke: (token: string, cb: () => void) => void;
        };
      };
    };
  }
}

const SCOPE = [
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

export function useGoogleAuth(clientId: string) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const clientRef = useRef<{ requestAccessToken: (opts?: object) => void } | null>(null);

  useEffect(() => {
    if (!clientId) return;
    const existing = document.getElementById('gsi-script');
    if (existing) { setReady(true); return; }

    const script = document.createElement('script');
    script.id = 'gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => setReady(true);
    document.head.appendChild(script);
  }, [clientId]);

  useEffect(() => {
    if (!ready || !clientId || !window.google) return;
    clientRef.current = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: async (resp: { access_token?: string; error?: string }) => {
        setLoading(false);
        if (!resp.access_token) return;
        setToken(resp.access_token);
        try {
          const info = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${resp.access_token}` },
          }).then(r => r.json());
          setUser({ name: info.name ?? '', email: info.email ?? '', picture: info.picture ?? '' });
        } catch { /* user info optional */ }
      },
    });
  }, [ready, clientId]);

  const signIn = useCallback(() => {
    if (!clientRef.current) return;
    setLoading(true);
    clientRef.current.requestAccessToken({ prompt: '' });
  }, []);

  const signOut = useCallback(() => {
    if (token) window.google?.accounts.oauth2.revoke(token, () => {});
    setToken(null);
    setUser(null);
  }, [token]);

  // Silent token refresh before 1-hour expiry
  const refreshToken = useCallback(() => {
    if (!clientRef.current) return;
    clientRef.current.requestAccessToken({ prompt: 'none' });
  }, []);

  useEffect(() => {
    if (!token) return;
    const id = setTimeout(refreshToken, 55 * 60 * 1000); // refresh at 55 min
    return () => clearTimeout(id);
  }, [token, refreshToken]);

  return { token, user, ready, loading, signIn, signOut };
}
