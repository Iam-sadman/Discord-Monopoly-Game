import { DiscordSDK } from '@discord/embedded-app-sdk';

export interface DiscordUserSession {
  userId: string;
  username: string;
  avatarHash?: string;
  token: string;
  isMock: boolean;
}

const DISCORD_CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID || '123456789012345678';
let discordSdk: DiscordSDK | null = null;

export async function initializeDiscordOrMockAuth(): Promise<DiscordUserSession> {
  const urlParams = new URLSearchParams(window.location.search);
  const mockUserParam = urlParams.get('mockUser');
  const isMockEnv = import.meta.env.VITE_MOCK_DISCORD === 'true';

  // If mockUser query param is provided or dev mode is enabled without Discord
  if (mockUserParam || isMockEnv || !window.location.ancestorOrigins?.length) {
    const mockId = mockUserParam || 'user1';
    console.log(`[Auth] Initializing in Dev Mode with Mock User: ${mockId}`);

    const res = await fetch('/api/auth/discord', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mockUser: mockId }),
    });

    if (!res.ok) {
      throw new Error('Failed to authenticate mock user');
    }

    const data = await res.json();
    return {
      userId: data.user.userId,
      username: data.user.username,
      avatarHash: data.user.avatarHash,
      token: data.token,
      isMock: true,
    };
  }

  // Real Discord Activity Initialization
  try {
    discordSdk = new DiscordSDK(DISCORD_CLIENT_ID);
    await discordSdk.ready();

    // Authorize with Discord Client
    const { code } = await discordSdk.commands.authorize({
      client_id: DISCORD_CLIENT_ID,
      response_type: 'code',
      state: '',
      prompt: 'none',
      scope: ['identify', 'guilds'],
    });

    // Exchange code with our backend
    const res = await fetch('/api/auth/discord', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    if (!res.ok) {
      throw new Error('Backend failed to exchange Discord authorization code');
    }

    const data = await res.json();
    return {
      userId: data.user.userId,
      username: data.user.username,
      avatarHash: data.user.avatarHash,
      token: data.token,
      isMock: false,
    };
  } catch (err) {
    console.warn('[Discord SDK] Discord initialization failed. Falling back to Mock User:', err);
    // Graceful fallback to user1 so user can still test in browser
    const res = await fetch('/api/auth/discord', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mockUser: 'user1' }),
    });
    const data = await res.json();
    return {
      userId: data.user.userId,
      username: data.user.username,
      avatarHash: data.user.avatarHash,
      token: data.token,
      isMock: true,
    };
  }
}
