import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TracingService } from '../../common/services/tracing.service';
import { SpanKind } from '@opentelemetry/api';

export interface IpfsBlob {
  cid: string;
  encryptedPayload: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class IpfsService {
  private readonly logger = new Logger(IpfsService.name);
  private readonly ipfsGateway: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly tracingService: TracingService,
  ) {
    this.ipfsGateway = this.configService.get<string>('IPFS_GATEWAY', 'https://ipfs.io/ipfs/');
  }

  async fetch(cid: string): Promise<IpfsBlob> {
    return this.tracingService.withSpan(
      'ipfs.fetch',
      async (span) => {
        span.setAttribute('ipfs.cid', cid);
        span.setAttribute('ipfs.gateway', this.ipfsGateway);

        this.logger.log(`Fetching IPFS content for CID: ${cid}`);
        this.tracingService.addEvent('ipfs.fetch.started', { cid });

        try {
          const startTime = Date.now();
          const response = await fetch(`${this.ipfsGateway}${cid}`);

          if (!response.ok) {
            const error = new Error(`IPFS fetch failed: ${response.statusText}`);
            span.setAttribute('ipfs.error', response.statusText);
            span.setAttribute('http.status_code', response.status);
            throw error;
          }

          const encryptedPayload = await response.text();
          const duration = Date.now() - startTime;

          span.setAttribute('ipfs.payload_size', encryptedPayload.length);
          span.setAttribute('ipfs.fetch_duration_ms', duration);

          this.tracingService.addEvent('ipfs.fetch.completed', {
            cid,
            size: encryptedPayload.length,
            duration_ms: duration,
          });

          return {
            cid,
            encryptedPayload,
            metadata: {
              fetchedAt: new Date().toISOString(),
              size: encryptedPayload.length,
              duration_ms: duration,
            },
          };
        } catch (error) {
          this.logger.error(`Failed to fetch from IPFS: ${error.message}`, error.stack);
          this.tracingService.addEvent('ipfs.fetch.error', {
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      },
      { 'span.kind': SpanKind.CLIENT },
      SpanKind.CLIENT,
    );
  }

  /**
   * Upload content to IPFS (if using local IPFS node)
   */
  async upload(content: string, metadata?: Record<string, any>): Promise<string> {
    return this.tracingService.withSpan(
      'ipfs.upload',
      async (span) => {
        span.setAttribute('ipfs.content_size', content.length);
        if (metadata) {
          span.setAttribute('ipfs.metadata', JSON.stringify(metadata));
        }

        this.logger.log(`Uploading content to IPFS (size: ${content.length} bytes)`);
        this.tracingService.addEvent('ipfs.upload.started', {
          size: content.length,
        });

        try {
          const startTime = Date.now();
          const ipfsApiUrl = this.configService.get<string>('IPFS_API_URL', 'http://localhost:5001');

          const formData = new FormData();
          formData.append('file', new Blob([content]), 'record.json');

          const response = await fetch(`${ipfsApiUrl}/api/v0/add`, {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`IPFS upload failed: ${response.statusText}`);
          }

          const result = await response.json() as { Hash: string };
          const cid = result.Hash;
          const duration = Date.now() - startTime;

          span.setAttribute('ipfs.cid', cid);
          span.setAttribute('ipfs.upload_duration_ms', duration);

          this.tracingService.addEvent('ipfs.upload.completed', {
            cid,
            size: content.length,
            duration_ms: duration,
          });

          return cid;
        } catch (error) {
          this.logger.error(`Failed to upload to IPFS: ${error.message}`, error.stack);
          this.tracingService.addEvent('ipfs.upload.error', {
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      },
      { 'span.kind': SpanKind.CLIENT },
      SpanKind.CLIENT,
    );
  }
}
