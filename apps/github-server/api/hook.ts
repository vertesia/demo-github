import { VercelRequest, VercelResponse } from '@vercel/node';
import { createHmac, timingSafeEqual } from 'crypto';

const GITHUB_SECRET = process.env.GITHUB_SECRET || '';
const supportedRepoUrls = [
  'https://github.com/vertesia/demo-github',
  'https://github.com/vertesia/studio',
];

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

  const event = req.headers['x-github-event'];
  console.log(`Received GitHub event: ${event}. Payload:`, req.body);

  switch (event) {
    case 'pull_request':
      handlePullRequest(req.body);
      break;
    default:
      console.log('Unhandled event type');
  }

  return res.status(200).json({ message: 'Webhook received' });
}

function handlePullRequest(event: any) {
  const repoUrl = event.repository.html_url;

  if (!supportedRepoUrls.includes(repoUrl)) {
    console.log('[pull_request] Skipped, unsupported repository:', repoUrl);
    return;
  }

  const workflowId = `${event.repository.full_name}/pull/${event.number}`;
  console.log(`[pull_request] Handling pull request "${repoUrl}" as "${workflowId}"`);
}
