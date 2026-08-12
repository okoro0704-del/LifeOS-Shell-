/**
 * ElfCom — sovereign messaging / communications port.
 * LifeOS notification index stays local; chat/threads plug in here later.
 */

export type ElfComThread = {
  id: string;
  title: string;
  preview: string;
  updatedAt: string;
  unreadCount: number;
  participants?: string[];
};

export type ElfComMessage = {
  id: string;
  threadId: string;
  body: string;
  senderId: string;
  createdAt: string;
};

export interface IElfComMessagingProvider {
  readonly nodeId: "elfcom";
  readonly bound: boolean;
  listThreads(ownerTrustId: string): Promise<ElfComThread[]>;
  getThread(ownerTrustId: string, threadId: string): Promise<ElfComThread | null>;
  listMessages(ownerTrustId: string, threadId: string): Promise<ElfComMessage[]>;
  sendMessage(input: {
    ownerTrustId: string;
    threadId: string;
    body: string;
  }): Promise<ElfComMessage>;
}
