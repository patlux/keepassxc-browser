'use strict';

import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';

const DEST = 'keepassxc-browser/tests';

let page;

test.describe('Content script tests', () => {
    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto(pathToFileURL(`${DEST}/tests.html`).toString());
    });

    test('Input field matching tests', async() => {
        await verifyResults('input-field-results');
    });

    test('Search field tests', async () => {
        await verifyResults('search-field-results');
    });

    test('TOTP field tests', async () => {
        await verifyResults('totp-field-results');
    });

    test('Password change tests', async () => {
        await verifyResults('password-change-results');
    });

    test('Hidden tab retains unlocked database state', async () => {
        const databaseState = await page.evaluate(async () => {
            const originalVisibilityState = Object.getOwnPropertyDescriptor(document, 'visibilityState');
            const originalClearAllFromPage = kpxc.clearAllFromPage;
            const originalSwitchIcons = kpxcIcons.switchIcons;

            Object.defineProperty(document, 'visibilityState', {
                configurable: true,
                value: 'hidden'
            });
            kpxc.clearAllFromPage = () => {};
            kpxcIcons.switchIcons = async () => {};

            try {
                await kpxc.detectDatabaseChange({ hash: { new: 'open-database' }, connected: true });
                return kpxc.databaseState;
            } finally {
                kpxc.clearAllFromPage = originalClearAllFromPage;
                kpxcIcons.switchIcons = originalSwitchIcons;
                if (originalVisibilityState) {
                    Object.defineProperty(document, 'visibilityState', originalVisibilityState);
                } else {
                    delete document.visibilityState;
                }
            }
        });

        expect(databaseState).toBe(2);
    });
});

const verifyResults = async(selector) => {
    const resultCount = await page.locator(`css=#${selector} >> css=.fa`).count();
    await expect.soft(resultCount).toBeGreaterThan(0);

    for (let i = 0; i < resultCount; i++) {
        const elem = await page.locator(`css=#${selector} >> css=.fa`).nth(i);
        const id = await elem.getAttribute('id');
        await expect.soft(elem, id).toHaveClass('fa fa-check');
    }
};
