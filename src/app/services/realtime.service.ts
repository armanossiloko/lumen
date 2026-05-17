import { Injectable, signal } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { InboxItem } from '../models';

const HUB_URL = 'http://localhost:5013/hubs/lumen';
/** Keep presence alive while the tab stays on a page (backend TTL is ~2 min). */
const PRESENCE_HEARTBEAT_MS = 45_000;

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private connection: signalR.HubConnection | null = null;
  /** Prevents parallel connect() from replacing the connection mid-handshake. */
  private connectTask: Promise<void> | null = null;
  /** Serializes LeavePage / JoinPage so rapid navigation cannot interleave. */
  private pageSync: Promise<void> = Promise.resolve();

  private currentPageId: string | null = null;
  private userId = 'MC';
  private presenceHeartbeat: ReturnType<typeof setInterval> | null = null;

  pageViewers = signal<string[]>([]);

  onInboxItem: ((item: InboxItem) => void) | null = null;

  async connect(userId: string = 'MC'): Promise<void> {
    this.userId = userId;

    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      await this.invoke('SubscribeInbox', userId);
      return;
    }

    if (this.connectTask) {
      await this.connectTask;
      return;
    }

    this.connectTask = this.establishConnection(userId);
    try {
      await this.connectTask;
    } finally {
      this.connectTask = null;
    }
  }

  private async establishConnection(userId: string): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connecting) {
      await this.waitUntilConnected(this.connection);
      await this.invoke('SubscribeInbox', userId);
      return;
    }

    if (this.connection) {
      try {
        await this.connection.stop();
      } catch {
        /* ignore */
      }
      this.connection = null;
    }

    const conn = new signalR.HubConnectionBuilder()
      .withUrl(`${HUB_URL}?userId=${encodeURIComponent(userId)}`)
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    conn.on('PresenceUpdated', (payload: { pageId: string; viewers: string[] }) => {
      if (payload.pageId === this.currentPageId) {
        this.pageViewers.set(payload.viewers.filter((id) => id !== this.userId));
      }
    });

    conn.on('InboxItemAdded', (item: InboxItem) => {
      this.onInboxItem?.(item);
    });

    conn.onreconnected(async () => {
      await this.resubscribeAfterReconnect();
    });

    this.connection = conn;

    await conn.start();

    if (conn.state !== signalR.HubConnectionState.Connected) {
      throw new Error(`SignalR expected Connected after start, got ${conn.state}`);
    }

    await this.invoke('SubscribeInbox', userId);
  }

  private async resubscribeAfterReconnect(): Promise<void> {
    await this.invoke('SubscribeInbox', this.userId);
    if (this.currentPageId) {
      await this.invoke('JoinPage', this.currentPageId, this.userId);
    }
  }

  async setPage(pageId: string | null): Promise<void> {
    this.pageSync = this.pageSync
      .then(() => this.applyPageChange(pageId))
      .catch(() => undefined);
    await this.pageSync;
  }

  private async applyPageChange(pageId: string | null): Promise<void> {
    try {
      await this.connect(this.userId);
    } catch (err) {
      console.warn('Realtime connect failed:', err);
      return;
    }

    if (!this.isConnected()) return;

    if (this.currentPageId) {
      await this.invoke('LeavePage', this.currentPageId, this.userId);
    }

    this.currentPageId = pageId;
    this.pageViewers.set([]);

    if (pageId) {
      await this.invoke('JoinPage', pageId, this.userId);
      this.startPresenceHeartbeat();
    } else {
      this.stopPresenceHeartbeat();
    }
  }

  private startPresenceHeartbeat(): void {
    this.stopPresenceHeartbeat();
    this.presenceHeartbeat = setInterval(() => {
      if (!this.currentPageId || !this.isConnected()) return;
      void this.invoke('TouchPage', this.currentPageId, this.userId);
    }, PRESENCE_HEARTBEAT_MS);
  }

  private stopPresenceHeartbeat(): void {
    if (this.presenceHeartbeat != null) {
      clearInterval(this.presenceHeartbeat);
      this.presenceHeartbeat = null;
    }
  }

  disconnect(): void {
    this.stopPresenceHeartbeat();
    this.connectTask = null;
    this.pageSync = Promise.resolve();
    const conn = this.connection;
    this.connection = null;
    this.currentPageId = null;
    this.pageViewers.set([]);
    if (conn) {
      void conn.stop().catch(() => undefined);
    }
  }

  private isConnected(): boolean {
    return this.connection?.state === signalR.HubConnectionState.Connected;
  }

  private async invoke(method: string, ...args: unknown[]): Promise<void> {
    const conn = this.connection;
    if (!conn || conn.state !== signalR.HubConnectionState.Connected) {
      return;
    }
    try {
      await conn.invoke(method, ...args);
    } catch (err) {
      console.warn(`SignalR ${method} failed:`, err);
    }
  }

  private waitUntilConnected(
    conn: signalR.HubConnection,
    timeoutMs = 15_000,
  ): Promise<void> {
    if (conn.state === signalR.HubConnectionState.Connected) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const deadline = window.setTimeout(() => {
        cleanup();
        reject(new Error('SignalR connect timed out'));
      }, timeoutMs);

      const timer = window.setInterval(() => {
        if (conn.state === signalR.HubConnectionState.Connected) {
          cleanup();
          resolve();
        } else if (conn.state === signalR.HubConnectionState.Disconnected) {
          cleanup();
          reject(new Error('SignalR disconnected while connecting'));
        }
      }, 50);

      const cleanup = () => {
        window.clearTimeout(deadline);
        window.clearInterval(timer);
      };
    });
  }
}
