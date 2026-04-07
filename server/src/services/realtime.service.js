const userStreams = new Map();

function getBucket(userId) {
  const key = String(userId);
  let bucket = userStreams.get(key);
  if (!bucket) {
    bucket = new Set();
    userStreams.set(key, bucket);
  }
  return bucket;
}

export function subscribeUserStream(userId, res) {
  const bucket = getBucket(userId);
  bucket.add(res);

  return () => {
    bucket.delete(res);
    if (bucket.size === 0) userStreams.delete(String(userId));
  };
}

export function publishUserEvent(userId, event, payload) {
  const bucket = userStreams.get(String(userId));
  if (!bucket || bucket.size === 0) return;
  const body = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of bucket) {
    try {
      res.write(body);
    } catch {
      // ignore broken pipes; connection cleanup handles removal on close
    }
  }
}

export function publishUserEventMany(userIds, event, payloadFactory) {
  const seen = new Set();
  for (const userId of userIds || []) {
    const key = String(userId);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const payload = typeof payloadFactory === "function" ? payloadFactory(userId) : payloadFactory;
    publishUserEvent(userId, event, payload);
  }
}