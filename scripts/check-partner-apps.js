const https = require('https');
require('dotenv').config();

async function fetchAllApps() {
  let hasNext = true;
  let cursor = null;
  let appMap = new Map();
  let page = 1;

  while (hasNext && page <= 10) {
    const query = JSON.stringify({
      query: `
        query($cursor: String) {
          transactions(first: 100, after: $cursor, types: [APP_SUBSCRIPTION_SALE, APP_USAGE_SALE]) {
            pageInfo { hasNextPage }
            edges {
              cursor
              node {
                __typename
                ... on AppSubscriptionSale {
                  app { id name apiKey }
                }
                ... on AppUsageSale {
                  app { id name apiKey }
                }
              }
            }
          }
        }
      `,
      variables: { cursor }
    });

    const resData = await new Promise((resolve, reject) => {
      const req = https.request('https://partners.shopify.com/2457662/api/2026-01/graphql.json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': process.env.SHOPIFY_PARTNER_TOKEN
        }
      }, (res) => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => resolve(JSON.parse(body)));
      });
      req.on('error', reject);
      req.write(query);
      req.end();
    });

    const edges = resData.data?.transactions?.edges || [];
    edges.forEach(e => {
      const a = e.node?.app;
      if (a && !appMap.has(a.id)) {
        appMap.set(a.id, a);
      }
      cursor = e.cursor;
    });

    hasNext = resData.data?.transactions?.pageInfo?.hasNextPage && edges.length > 0;
    page++;
  }

  console.log('Total Unique Apps Found Across All Transactions:', appMap.size);
  console.log(JSON.stringify(Array.from(appMap.values()), null, 2));
}

fetchAllApps();
