export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,apikey,prefer,x-client-info');
    return res.status(200).end();
  }

  const path = req.url.replace('/api/rest', '');
  const target = `https://tgtyuxtrrafxalajxenw.supabase.co${path}`;
  
  const headers = {};
  ['authorization','apikey','content-type','prefer'].forEach(h => {
    if (req.headers[h]) headers[h] = req.headers[h];
  });

  const response = await fetch(target, {
    method: req.method,
    headers,
    body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
  });

  const data = await response.text();
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json');
  res.status(response.status).send(data);
}
