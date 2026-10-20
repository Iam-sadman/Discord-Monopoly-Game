import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'block-party-dev-secret-key-2026';

export interface AuthUser {
  userId: string;
  username: string;
  avatarHash?: string;
}

export class DiscordAuthService {
  /**
   * Exchanges an OAuth2 authorization code with Discord API for an access token.
   */
  public static async exchangeCodeForToken(code: string): Promise<string> {
    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    const redirectUri = process.env.DISCORD_REDIRECT_URI || '';

    if (!clientId || !clientSecret) {
      throw new Error('Discord credentials (DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET) are not configured.');
    }

    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    });

    const response = await fetch('https://discord.com/api/v10/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Discord OAuth token exchange failed: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as { access_token: string };
    return data.access_token;
  }

  /**
   * Fetches user profile from Discord API.
   */
  public static async fetchDiscordUser(accessToken: string): Promise<AuthUser> {
    const response = await fetch('https://discord.com/api/v10/users/@me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Discord user profile: ${response.status}`);
    }

    const data = (await response.json()) as {
      id: string;
      username: string;
      global_name?: string;
      avatar?: string;
    };

    return {
      userId: data.id,
      username: data.global_name || data.username,
      avatarHash: data.avatar || undefined,
    };
  }

  /**
   * Issues JWT session token for an authenticated user.
   */
  public static generateToken(user: AuthUser): string {
    return jwt.sign(
      {
        userId: user.userId,
        username: user.username,
        avatarHash: user.avatarHash,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  /**
   * Verifies a JWT token.
   */
  public static verifyToken(token: string): AuthUser {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
      return {
        userId: decoded.userId,
        username: decoded.username,
        avatarHash: decoded.avatarHash,
      };
    } catch {
      throw new Error('Invalid or expired authentication token');
    }
  }

  /**
   * Dev-mode mock user generator for local multiplayer testing.
   */
  public static getMockUser(mockId: string): AuthUser {
    const safeId = mockId.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase() || 'player1';
    const mockNames: Record<string, string> = {
      user1: 'Shakib (Dhaka)',
      user2: 'Tamim (Chattogram)',
      user3: 'Mushfiq (Bogura)',
      user4: 'Mahmudullah (Mymensingh)',
      user5: 'Mustafiz (Satkhira)',
      user6: 'Taskin (Dhaka North)',
    };

    return {
      userId: `mock_${safeId}`,
      username: mockNames[safeId] || `Mock Player (${safeId})`,
      avatarHash: undefined,
    };
  }
}
