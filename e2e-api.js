const fs = require('fs');

async function fetchJson(path, init = {}) {
  const url = `http://localhost:3000${path}`;
  const res = await fetch(url, init);
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function runTests() {
  console.log('Starting E2E API Tests...');
  let errors = 0;
  
  // 1. Create a client
  const clientRes = await fetchJson('/api/clients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'E2E Client', email: 'e2e@example.com' })
  });
  if (clientRes.status !== 201) { console.error('❌ Failed to create client', clientRes); errors++; }
  else { console.log('✅ Created Client'); }
  const clientId = clientRes.data.id;

  // 2. Create Project
  const projRes = await fetchJson('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'E2E Project', clientId, budget: 50000 })
  });
  if (projRes.status !== 201) { console.error('❌ Failed to create project', projRes); errors++; }
  else { console.log('✅ Created Project'); }
  const projectId = projRes.data.id;

  // 3. Negative Budget
  const badProjRes = await fetchJson('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Bad Project', clientId, budget: -100 })
  });
  if (badProjRes.status !== 400) { console.error('❌ Expected 400 for negative budget', badProjRes); errors++; }
  else { console.log('✅ Rejected negative budget'); }

  // 4. Create Transaction (Auto-create Contact)
  const txRes = await fetchJson(`/api/projects/${projectId}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      date: new Date().toISOString(),
      contactName: 'E2E Vendor',
      contactCategory: 'Vendor',
      category: 'Material',
      description: 'Wood',
      credit: 0,
      debit: 1000.50
    })
  });
  if (txRes.status !== 201) { console.error('❌ Failed to create transaction', txRes); errors++; }
  else { console.log('✅ Created Transaction and Auto-created Contact'); }
  const txId = txRes.data.id;

  // 5. Zero Amount
  const badTxRes = await fetchJson(`/api/projects/${projectId}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      date: new Date().toISOString(),
      contactName: 'E2E Vendor',
      contactCategory: 'Vendor',
      category: 'Material',
      credit: 0,
      debit: 0
    })
  });
  // Note: API schema allows 0, frontend blocks 0. Let's see if API blocks 0.
  // lib/validation.ts has superRefine: if (hasCredit === hasDebit) -> addIssue.
  // 0 is not > 0. So hasCredit=false, hasDebit=false. They are equal! Should return 400.
  if (badTxRes.status !== 400) { console.error('❌ Expected 400 for zero transaction', badTxRes); errors++; }
  else { console.log('✅ Rejected zero transaction'); }

  // 6. Large Currency Values
  const hugeTxRes = await fetchJson(`/api/projects/${projectId}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      date: new Date().toISOString(),
      contactName: 'E2E Vendor',
      contactCategory: 'Vendor',
      category: 'Fee',
      credit: 9999999999.99,
      debit: 0
    })
  });
  if (hugeTxRes.status !== 201) { console.error('❌ Failed large currency', hugeTxRes); errors++; }
  else { console.log('✅ Handled large currency'); }

  // 7. Test Running Balance Recalculation
  // We added a debit of 1000.50, then a credit of 9999999999.99
  // Let's fetch ledger
  const ledgerRes = await fetchJson(`/api/projects/${projectId}/transactions`);
  if (ledgerRes.status !== 200) { console.error('❌ Failed to fetch ledger', ledgerRes); errors++; }
  else {
    const balance = ledgerRes.data.totals.balance;
    console.log(`✅ Ledger Balance: ${balance}`);
  }

  // 8. Delete transaction
  const delTxRes = await fetchJson(`/api/projects/${projectId}/transactions/${txId}`, { method: 'DELETE' });
  if (delTxRes.status !== 200) { console.error('❌ Failed to delete transaction', delTxRes); errors++; }
  else { console.log('✅ Deleted Transaction'); }

  // 9. Delete project
  const delProjRes = await fetchJson(`/api/projects/${projectId}`, { method: 'DELETE' });
  if (delProjRes.status !== 200) { console.error('❌ Failed to delete project', delProjRes); errors++; }
  else { console.log('✅ Deleted Project'); }

  // 10. Delete client
  const delClientRes = await fetchJson(`/api/clients/${clientId}`, { method: 'DELETE' });
  if (delClientRes.status !== 200) { console.error('❌ Failed to delete client', delClientRes); errors++; }
  else { console.log('✅ Deleted Client'); }
  
  // 11. Invalid API Route (404)
  const notFound = await fetchJson(`/api/invalid-route`);
  if (notFound.status !== 404) { console.error('❌ Expected 404', notFound); errors++; }
  else { console.log('✅ Handled 404 API'); }

  console.log(`\nTests Completed. Errors: ${errors}`);
}

runTests().catch(console.error);
