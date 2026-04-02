export async function classifyCase(description) {
  await new Promise((resolve) => setTimeout(resolve, 250));

  const lower = description?.toLowerCase() || '';
  const category = lower.includes('bank') || lower.includes('loan') ? 'Banking' : 'Telecom';

  return {
    category,
    severity: 'High',
    suggestion: 'File with the appropriate ombudsman or tribunal',
  };
}
