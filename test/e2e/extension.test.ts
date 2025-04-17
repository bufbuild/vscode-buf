import { test, expect } from './base-test';

test('should be able to execute the first test of the example project', async ({ workbox }) => {
  await workbox.getByRole('treeitem', { name: 'tests', exact: true }).locator('a').click();
  await workbox.getByRole('treeitem', { name: 'example.spec.ts' }).locator('a').click();
  await expect(workbox.locator('.testing-run-glyph'), 'there are two tests in the file').toHaveCount(2);
  await workbox.locator('.testing-run-glyph').first().click();
  const passedLocator = workbox.locator('.monaco-editor').locator('.codicon-testing-passed-icon');
  await expect(passedLocator).toHaveCount(1);
});