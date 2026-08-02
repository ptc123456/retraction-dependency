import { test, expect } from '@playwright/test';

test.describe('RetractionDependency E2E Navigation & Boundary Tests', () => {
  test('renders the expected deployment boundary state on index load', async ({ page }) => {
    await page.goto('/');
    if (process.env.PLAYWRIGHT_CONTRACT_ADDRESS) {
      await expect(page.locator('.unconfigured-banner')).toHaveCount(0);
      await expect(page.getByText('No proposals found in current registry index.')).toBeVisible();
    } else {
      await expect(page.locator('.unconfigured-banner')).toBeVisible();
      await expect(page.locator('.unconfigured-banner')).toContainText('Contract not configured');
    }
  });

  test('navigates across all 6 routes', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1.page-title')).toContainText('Research Proposal Registry Index');

    await page.goto('/proposals/new');
    await expect(page.locator('h1.page-title')).toContainText('Create Research Proposal');

    await page.goto('/activity');
    await expect(page.locator('h1.page-title')).toContainText('Activity ledger');

    await page.goto('/guide');
    await expect(page.locator('h1.page-title')).toContainText('A practical guide to RetractionDependency');

    await page.goto('/methodology');
    await expect(page.locator('h1.page-title')).toContainText('Evidence Policy V1 Methodology');

    await page.goto('/proposals/1');
    await expect(page.locator('.page-title')).toContainText('Proposal #1');
  });

  test('populates form fields via fixture templates on /proposals/new', async ({ page }) => {
    await page.goto('/proposals/new');
    await page.click('text=Fixture A (Usable Correction)');

    await expect(page.locator('#prop-title')).toHaveValue('SARS-CoV-2 P.1 Genomic Variant Survey');
    await expect(page.locator('#prop-claim')).toHaveValue(/Targeted genetic surveillance/);
    await expect(page.getByLabel('Original Paper DOI *')).toHaveValue('10.1371/journal.pntd.0009591');
    await expect(page.getByLabel('Original Paper PMID *')).toHaveValue('34280196');
    await expect(page.getByLabel('Initial Notice DOI *')).toHaveValue('10.1371/journal.pntd.0011024');
    await expect(page.getByLabel('Initial Notice PMID *')).toHaveValue('36584006');
    await expect(page.getByRole('button', { name: 'Submit Proposal & Dependencies' })).toBeDisabled();
  });

  test('exposes exact form bounds to browser validation', async ({ page }) => {
    await page.goto('/proposals/new');

    await expect(page.locator('#prop-title')).toHaveAttribute('minlength', '3');
    await expect(page.locator('#prop-title')).toHaveAttribute('maxlength', '120');
    await expect(page.locator('#prop-claim')).toHaveAttribute('minlength', '20');
    await expect(page.locator('#prop-claim')).toHaveAttribute('maxlength', '2000');
    await expect(page.getByLabel('Dependency Statement *')).toHaveAttribute('minlength', '20');
    await expect(page.getByLabel('Dependency Statement *')).toHaveAttribute('maxlength', '1000');
  });

  test('opens and closes the mobile navigation with accessible controls', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const openMenu = page.getByRole('button', { name: 'Open Navigation Menu' });
    await openMenu.focus();
    await expect(openMenu).toBeFocused();
    await openMenu.press('Enter');

    const navigation = page.getByRole('navigation', { name: 'Main Navigation' });
    await expect(navigation).toBeVisible();
    const toggleBox = await page.locator('.mobile-nav-toggle').boundingBox();
    const railBox = await page.locator('.side-rail.mobile-show').boundingBox();
    expect(toggleBox).not.toBeNull();
    expect(railBox).not.toBeNull();
    expect(railBox!.y).toBeGreaterThanOrEqual(toggleBox!.y + toggleBox!.height - 1);

    await page.getByRole('link', { name: 'Evidence Policy V1' }).click();
    await expect(page.locator('h1.page-title')).toContainText('Evidence Policy V1 Methodology');
    await expect(page.getByRole('button', { name: 'Open Navigation Menu' })).toBeVisible();
  });

  test('offers all announced browser wallets and connects the selected EIP-6963 provider', async ({ page }) => {
    await page.addInitScript(() => {
      const makeProvider = (address: string) => ({
        request: async ({ method }: { method: string }) => {
          if (method === 'eth_accounts') return [];
          if (method === 'eth_requestAccounts') return [address];
          if (method === 'eth_chainId') return '0xf22f';
          throw new Error(`Unexpected wallet method: ${method}`);
        },
      });
      const providers = [
        {
          info: { uuid: 'metamask-test', name: 'MetaMask', icon: '', rdns: 'io.metamask' },
          provider: makeProvider('0x1111111111111111111111111111111111111111'),
        },
        {
          info: { uuid: 'rabby-test', name: 'Rabby Wallet', icon: '', rdns: 'io.rabby' },
          provider: makeProvider('0x2222222222222222222222222222222222222222'),
        },
      ];
      window.addEventListener('eip6963:requestProvider', () => {
        providers.forEach((detail) => window.dispatchEvent(new CustomEvent('eip6963:announceProvider', { detail })));
      });
    });
    await page.goto('/');

    await page.getByRole('button', { name: 'Connect Wallet' }).click();
    const dialog = page.getByRole('dialog', { name: 'Choose a wallet' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'MetaMask' })).toBeVisible();
    await dialog.getByRole('button', { name: 'Rabby Wallet' }).click();

    await expect(dialog).toHaveCount(0);
    await expect(page.getByText('0x222222...222222')).toBeVisible();
  });
});
