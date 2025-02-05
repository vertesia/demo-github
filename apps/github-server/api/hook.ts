import { VercelRequest, VercelResponse } from '@vercel/node';
import { createHmac, timingSafeEqual } from 'crypto';

const GITHUB_SECRET = process.env.GITHUB_SECRET || '';

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
  console.log(`Received GitHub event: ${event}`);
  console.log('Payload:', req.body);

  // Handle specific GitHub events if needed
  switch (event) {
    case 'push':
      console.log('Push event detected');
      break;
    case 'pull_request':
      console.log('Pull request event detected');
      break;
    default:
      console.log('Unhandled event type');
  }

  return res.status(200).json({ message: 'Webhook received' });
}
