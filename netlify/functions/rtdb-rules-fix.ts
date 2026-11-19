/**
 * TEMPORARY helper used once to patch the LIVE Realtime Database rules
 * (git pushes do not deploy database.rules.json). Removed after the patch runs.
 * GET  -> current state booleans
 * POST -> adds the comment reactions child rule under buzz_comments/$groupId/$messageId/$commentId
 */
import type { Handler } from '@netlify/functions';
import * as admin from 'firebase-admin';

type ServiceAccount = { project_id: string; client_email: string; private_key: string };

function app() {
  if (admin.apps.length === 0) {
    const raw = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}') as ServiceAccount;
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: raw.project_id,
        clientEmail: raw.client_email,
        privateKey: raw.private_key?.replace(/\\n/g, '\n'),
      }),
      databaseURL: `https://${raw.project_id}-default-rtdb.europe-west1.firebasedatabase.app`,
    });
  }
  return admin.app();
}

const commentReactionsRule = {
  '$groupId': {
    '$messageId': {
      '$commentId': {
        '.write': "auth != null && (!data.exists() || data.child('senderUid').val() === auth.uid)",
        reactions: {
          '$uid': {
            '.write': 'auth != null && $uid === auth.uid',
            '.validate': 'newData.isString() && newData.val().length <= 8',
          },
        },
      },
      commentsCount: { '.write': 'auth != null' },
    },
  },
};

const handler: Handler = async (event) => {
  const db = app().database();
  if (event.httpMethod === 'GET') {
    const rules: any = (await db.getRules()).rules;
    const b = rules?.buzz_comments || {};
    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        hasBuzzComments: !!rules.buzz_comments,
        hasReactionsChild: JSON.stringify(b).includes('"reactions"'),
      }),
    };
  }
  if (event.httpMethod === 'POST') {
    await db.setRules(JSON.stringify(commentReactionsRule), /* exclude */ 'buzz_comments');
    const rules: any = (await db.getRules()).rules;
    const b = rules?.buzz_comments || {};
    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ buzzCommentsAddedNow: true, hasReactionsChild: JSON.stringify(b).includes('"reactions"') }),
    };
  }
  return { statusCode: 405, body: 'Method not allowed' };
};

export { handler };
