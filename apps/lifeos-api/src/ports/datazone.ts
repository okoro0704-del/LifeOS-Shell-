/**
 * DataZone — sovereign object/blob storage port.
 * LifeOS never embeds storage drivers; bind a real adapter when the node ships.
 */
export type DataZoneObjectRef = {
  namespace: string;
  key: string;
  contentType?: string;
  sizeBytes?: number;
  etag?: string;
};

export interface IDataZoneStorageProvider {
  readonly nodeId: "datazone";
  readonly bound: boolean;
  put(input: {
    namespace: string;
    key: string;
    body: Uint8Array | string;
    contentType?: string;
  }): Promise<DataZoneObjectRef>;
  get(input: { namespace: string; key: string }): Promise<{
    body: Uint8Array;
    contentType?: string;
  } | null>;
  delete(input: { namespace: string; key: string }): Promise<void>;
  exists(input: { namespace: string; key: string }): Promise<boolean>;
}
