require("dotenv").config();

const token = process.env.SHOPIFY_PARTNER_TOKEN;
const partnerId = process.env.SHOPIFY_PARTNER_ID;
const url = `https://partners.shopify.com/${partnerId}/api/2026-01/graphql.json`;

async function check() {
  const query = `
    query {
      serviceSale: __type(name: "ServiceSale") {
        fields {
          name
        }
      }
    }
  `;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({ query })
  });
  const data = await res.json();
  console.log("ServiceSale fields:", data.data.serviceSale ? data.data.serviceSale.fields.map(f => f.name) : "None");
}

check();
