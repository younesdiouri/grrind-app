// API standard Toxiproxy, uniquement le proxy de la stack QA locale.
// https://github.com/Shopify/toxiproxy#http-api
const endpoint = MAESTRO_CACHE_PROXY_CONTROL + '/proxies/grrind367';
const headers = { 'Content-Type': 'application/json' };
function checked(response, allowMissing) {
  if (!response.ok && !(allowMissing && response.status === 404)) {
    throw new Error('Toxiproxy : opération refusée (' + response.status + ')');
  }
}
if (NETWORK_MODE === 'offline') {
  checked(http.post(endpoint, { headers: headers, body: JSON.stringify({ enabled: false }) }));
} else {
  checked(http.post(endpoint, { headers: headers, body: JSON.stringify({ enabled: true }) }));
  checked(http.delete(endpoint + '/toxics/cache_408_latency'), true);
  if (NETWORK_MODE === 'slow') {
    checked(http.post(endpoint + '/toxics', { headers: headers, body: JSON.stringify({
      name: 'cache_408_latency', type: 'latency', stream: 'downstream', toxicity: 1,
      attributes: { latency: 30000, jitter: 0 },
    }) }));
  }
}
/* global MAESTRO_CACHE_PROXY_CONTROL, NETWORK_MODE, http */
