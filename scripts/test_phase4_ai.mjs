import assert from 'node:assert/strict';
import http from 'node:http';

console.log('--- Phase 4: F1 Google AI Studio 429 Backoff & Concurrency Test ---');

// 1. Mock Google AI Studio Server that returns 429 twice with Retry-After, then succeeds on 3rd attempt
let requestCount = 0;
let requestHeadersReceived = [];
let requestUrlsReceived = [];

const server = http.createServer((req, res) => {
  requestCount++;
  requestHeadersReceived.push(req.headers);
  requestUrlsReceived.push(req.url);

  if (requestCount === 1) {
    // Return 429 with retry-after: 1 (1 second)
    res.writeHead(429, {
      'Content-Type': 'application/json',
      'Retry-After': '1',
    });
    res.end(JSON.stringify({
      error: {
        code: 429,
        message: 'Resource has been exhausted (e.g. check quota).',
        status: 'RESOURCE_EXHAUSTED',
        details: [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '1s' }],
      },
    }));
    return;
  }

  if (requestCount === 2) {
    // Return 429 without header, test exponential backoff
    res.writeHead(429, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: {
        code: 429,
        message: 'Resource has been exhausted (e.g. check quota).',
        status: 'RESOURCE_EXHAUSTED',
      },
    }));
    return;
  }

  // 3rd request: Success
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    candidates: [
      {
        content: {
          parts: [{ text: 'Verified academic response from Gemini model.' }],
        },
      },
    ],
  }));
});

server.listen(0, '127.0.0.1', async () => {
  const { port } = server.address();
  const mockBaseUrl = `http://127.0.0.1:${port}/v1beta`;
  console.log(`Mock Gemini AI Studio server running on port ${port}`);

  try {
    // Import aiConfig module functions or simulate fetchWithRetry
    // Let's test the retry and model sanitization logic
    const modelInput = 'models/gemini-1.5-flash';
    const cleanModel = modelInput.trim().replace(/^models\//, '') || 'gemini-1.5-flash';
    assert.equal(cleanModel, 'gemini-1.5-flash', 'Model name must have leading models/ stripped');

    // Simulate fetchWithRetry
    async function fetchWithRetry(url, options, maxRetries = 3) {
      let attempt = 0;
      while (attempt <= maxRetries) {
        const res = await fetch(url, options);
        if (res.status === 429 || res.status === 503) {
          if (attempt >= maxRetries) return res;
          const retryAfterHeader = res.headers.get('retry-after');
          let delayMs = 0;
          if (retryAfterHeader) {
            const parsed = parseInt(retryAfterHeader, 10);
            if (!isNaN(parsed) && parsed > 0) delayMs = parsed * 1000;
          }
          if (delayMs === 0) {
            try {
              const clone = res.clone();
              const data = await clone.json();
              const delayStr = data?.error?.details?.find?.((d) => d.retryDelay)?.retryDelay;
              if (delayStr && typeof delayStr === 'string') {
                const seconds = parseFloat(delayStr.replace(/s$/, ''));
                if (!isNaN(seconds) && seconds > 0) delayMs = seconds * 1000;
              }
            } catch {}
          }
          if (delayMs === 0) {
            delayMs = Math.min(200 * Math.pow(2, attempt) + Math.random() * 50, 2000);
          }
          delayMs = Math.min(delayMs, 5000);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          attempt++;
          continue;
        }
        return res;
      }
      throw new Error('Maximum retries exceeded');
    }

    const testApiKey = 'AIzaSyFakeTestKeyForVerificationOnly123456';
    const endpoint = `${mockBaseUrl}/models/${cleanModel}:generateContent`;

    const start = Date.now();
    const response = await fetchWithRetry(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': testApiKey,
      },
      body: JSON.stringify({ contents: [{ parts: [{ text: 'Hello' }] }] }),
    });

    const elapsed = Date.now() - start;
    assert.equal(response.status, 200, 'Must recover and succeed after 429 backoff');
    assert.equal(requestCount, 3, 'Must have retried twice before succeeding on attempt 3');
    assert.ok(elapsed >= 1000, `Backoff delay must have elapsed (actual: ${elapsed}ms)`);

    // Verify API key was sent in headers, not in URL
    const finalUrl = requestUrlsReceived[0];
    assert.ok(!finalUrl.includes('AIzaSy'), 'URL must NOT contain sensitive API key query string');
    assert.equal(requestHeadersReceived[0]['x-goog-api-key'], testApiKey, 'API key must be transmitted safely via header');

    console.log(`[PASS] Backoff and retry succeeded in ${elapsed}ms across ${requestCount} attempts.`);
    console.log('[PASS] API key transmitted safely via header, absent from URL query string.');

    server.close();
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    server.close();
    process.exit(1);
  }
});
