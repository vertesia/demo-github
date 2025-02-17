import { Client, Connection } from '@temporalio/client';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { createHmac, timingSafeEqual } from 'crypto';
import * as dns from 'dns';

const GITHUB_SECRET = process.env.GITHUB_SECRET || '';
const supportedRepoUrls = [
  'https://github.com/vertesia/demo-github',
  'https://github.com/vertesia/studio',
];

// Temporal
const temporalTaskQueue = `agents/vertesia/github-agent`;
const temporalAddress = "staging.i16ci.tmprl.cloud:7233";
const temporalNamespace = "staging.i16ci";
const temporalWorkflowType = "reviewPullRequest";

let client: Client | null = null;

function verifySignature(req: VercelRequest): boolean {
  const signature = req.headers['x-hub-signature-256'] as string;
  if (!signature || !GITHUB_SECRET) {
    return false;
  }

  const hmac = createHmac('sha256', GITHUB_SECRET);
  const digest = 'sha256=' + hmac.update(JSON.stringify(req.body)).digest('hex');
  return timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!verifySignature(req)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const eventType = req.headers['x-github-event'];
  console.log(`Received GitHub event: ${eventType}. Payload:`, req.body);

  switch (eventType) {
    case 'pull_request':
      await handlePullRequest(eventType, req.body);
      break;
    case 'issue_comment':
      if (req.body.issue.pull_request) {
        await handlePullRequest(eventType, req.body);
      }
      break;
    default:
      console.log('Unhandled event type');
  }

  return res.status(200).json({ message: 'Webhook received' });
}

/**
 * This function dispatches different types of event related to a pull request (PR) to Temporal workflows.
 *
 * @param eventType the type of event, e.g., "pull_request" or "issue_comment"
 * @param event the playload of the event
 */
async function handlePullRequest(eventType: string, event: any) {
  const repoUrl = event.repository.html_url;

  if (!supportedRepoUrls.includes(repoUrl)) {
    console.log('[pull_request] Skipped, unsupported repository:', repoUrl);
    return;
  }

  const workflowId = `${event.repository.full_name}/pull/${event.number}`;
  console.log(`[pull_request] Handling pull request "${event.pull_request.html_url}" as "${workflowId}"`);
  const client = await getTemporalClient();
  const arg = {
    githubEventType: eventType,
    githubEvent: event
  };

  if (event.action === 'opened') {
    const handle = await client.workflow.start(temporalWorkflowType, {
      workflowId: workflowId,
      taskQueue: temporalTaskQueue,
      args: [arg],
    });
    console.log(`[pull_request] Started workflow "${workflowId}" with run ID ${handle.firstExecutionRunId}`);
  } else {
    const handle = await client.workflow.getHandle(workflowId);
    handle.signal(
      'updatePullRequest',
      arg,
    );
    console.log(`[pull_request] Event ${eventType} (${event.action}) sent to existing workflow: ${workflowId}`);
  }
}

async function getTemporalClient(): Promise<Client> {
  if (!client) {
    const start = Date.now();
    console.log(`Connecting to Temporal server ${temporalAddress}`);

    const temporalIp = await dns.promises.lookup(temporalAddress.split(':')[0]).catch((err) => {
      console.error({ err }, `Failed to resolve Temporal server address ${temporalAddress} in ${Date.now() - start}ms`);
      throw err;
    });
    console.debug(`Resolved Temporal server address to ${temporalIp.address} in ${Date.now() - start}ms`);

    // get clientCertPair from environment variables
    const crt = process.env.TEMPORAL_TLS_CERT;
    const key = process.env.TEMPORAL_TLS_KEY;

    if (!crt || !key) {
      throw new Error('Failed to get temporal client cert pair from vault');
    }

    // Connect to the default Server location
    const connection = await Connection.connect({
      address: temporalAddress,
      tls: {
        clientCertPair: {
          crt: Buffer.from(crt),
          key: Buffer.from(key)
        },
      },
    })

    client = new Client({
      connection,
      namespace: temporalNamespace,
    });

    await client.connection.ensureConnected().then(async () => {
      console.log(`Connected to Temporal server ${connection.options.address} [IP: ${temporalIp.address}] in ${Date.now() - start}ms`);
    }).catch((err) => {
      console.error({ err }, `Failed to connect to Temporal server ${connection.options.address} in ${Date.now() - start}ms`);
      throw err;
    });
  }
  return client;
}
