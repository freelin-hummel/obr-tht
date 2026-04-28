import OBR from "@owlbear-rodeo/sdk";

export type BroadcastMessageEvent = Parameters<
  Parameters<typeof OBR.broadcast.onMessage>[1]
>[0];

export function createBroadcastChannel<T>(channel: string) {
  return {
    channel,
    send: (
      data: T,
      options?: Parameters<typeof OBR.broadcast.sendMessage>[2],
    ): Promise<void> => OBR.broadcast.sendMessage(channel, data, options),
    subscribe: (
      handler: (data: T, event: BroadcastMessageEvent) => void,
    ): (() => void) =>
      OBR.broadcast.onMessage(channel, (event) => {
        handler(event.data as T, event);
      }),
  };
}
