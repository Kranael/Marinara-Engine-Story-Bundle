import { test, expect } from '@playwright/test';

// E2E Test Happy Path ### NO AI SHOULD WRITE CODE HERE! //

test('E2E Story Bundle Happy Path', async ({ page }) => {

    await test.step('Open App', async () => {
        await page.goto('http://127.0.0.1:7860/');
        await page.getByRole('button', { name: 'Got it' }).click();
    })

    // Characters ###
    await test.step('Create Character Lyra Evermist', async () => {
        await page.getByRole('button', { name: 'Characters' }).click()
        await page.getByRole('button', { name: 'New', exact: true }).click()
        await page.getByRole('textbox', { name: 'Character name...' }).fill('Lyra Evermist')
        await page.getByRole('button', { name: 'Create', exact: true }).click()
        // Add Avatar
        const [fileChooser] = await Promise.all([
            page.waitForEvent('filechooser'),
            page.getByRole('button', { name: 'Upload avatar' }).click(),
        ]);
        await fileChooser.setFiles(
            'tests/story-bundle/data/lyra-evermist.webp'
        );
        // Add Creator
        await page.getByRole('textbox', { name: 'Your name' }).fill('Aster Vale');
        // Add Tags
        // Academy Tag with Enter Key
        await page.getByRole('textbox', { name: 'Add tag…' }).fill('Fantasy');
        await page.keyboard.press('Enter');

        // School Tag with Button
        await page.getByRole('textbox', { name: 'Add tag…' }).fill('Academy');
        await page.keyboard.press('Enter');

        // Switch to Card Tab
        await page.getByRole('tab', { name: 'Card' }).click()

        // Add Character Prompt
        await page.getByRole('textbox', { name: 'Describe who this character' })
            .fill(`Lyra Evermist is a talented young mage from the northern kingdom of Avelia. She has long silver-blue hair, violet eyes, and a calm, elegant appearance that often makes her seem more confident than she actually is. She usually wears the dark blue and white uniform of the Arcane Academy, decorated with a small silver emblem representing her elemental affinity.
            Lyra was raised by her grandmother in a quiet village far from the capital. From an early age, she showed an unusual talent for elemental magic, particularly ice and wind. Her abilities earned her a place at the Academy, where she quickly became known as one of the most promising students in her year.
            Despite her impressive magical abilities, Lyra is not arrogant. She is thoughtful, curious, and usually polite, but she can become stubborn when someone questions her abilities. She enjoys studying ancient magic, exploring the Academy grounds, drinking tea, and listening to stories about distant kingdoms. She dislikes unnecessary conflict, people who abuse their power, and being treated as fragile because of her quiet personality.
            Lyra secretly worries that her talent is the only reason people value her. She wants to make genuine friends and discover what kind of person she wants to become rather than simply living up to the expectations placed upon her.
            Lyra is currently a student at the Arcane Academy and has just begun her second year. She is excited about the new school year, although she has heard rumors about strange events occurring beyond the old eastern gate.`)

        // Save Character
        await page.getByRole('button', { name: 'Save' }).click()
    });

    // Persona ###
    await test.step('Create a new Persona', async () => {
        await test.step('Click on Personas', async () => {
            await page.getByTestId('topbar-panel-button-personas').click();
        });

        await test.step('Click on +', async () => {
            await page.getByRole('button', { name: 'New', exact: true }).click();
        });

        await test.step('Create new Persona', async () => {
            await page.getByRole('textbox', { name: 'Name *' }).fill('Aiden Vale')
            await page.getByRole('button', { name: 'Create', exact: true }).click()
        })

        await test.step('Upload Persona Avatar', async () => {
            const [fileChooser] = await Promise.all([
                page.waitForEvent('filechooser'),
                page.getByRole('button', { name: 'Upload avatar' }).click(),
            ]);

            await fileChooser.setFiles(
                'tests/story-bundle/data/aiden-vale.webp'
            );
        });

        await test.step('Enter creator name', async () => {
            await page.getByRole('textbox', { name: 'Your name' }).fill('Aster Vale');
        });

        await test.step('Switch to Description Tab', async () => {
            await page.getByRole('button', { name: 'Card', exact: true }).click();
        })

        await test.step('Add Character Prompt', async () => {
            await page.getByRole('textbox', { name: 'Describe who you are, your' })
                .fill(`Kael Arden is a young student at the Arcane Academy with tousled black hair, striking blue eyes, and a calm, composed presence that often makes him appear more confident than he actually feels. He usually wears the academy's dark navy uniform beneath a blue cloak decorated with the school's crest, giving him a refined but understated appearance.
                Kael comes from a modest family with no famous magical bloodline or political influence. Unlike many students at the Academy, he was admitted because of his own aptitude rather than his family's reputation. His natural talent lies in defensive and enhancement magic, though he has spent considerable time studying swordsmanship as well.
                Quiet and observant, Kael prefers to listen before speaking and rarely seeks attention. He is intelligent, practical, and surprisingly stubborn once he has committed himself to something. He dislikes arrogance, unnecessary cruelty, and people who judge others solely by their social standing. Although he can appear distant at first, Kael is loyal to those he considers friends and has a dry sense of humor that occasionally catches people off guard.
                Kael is fascinated by the history of the Academy and the mysterious ruins surrounding its grounds. He spends much of his free time in the library researching old magical texts, although he occasionally sneaks away from his studies to explore places students are not supposed to visit.
                As a new student at the Academy, Kael is determined to prove that his lack of noble connections does not make him inferior to those born into powerful families. He does not yet know that the strange events surrounding the eastern gate may soon draw him into something far greater than an ordinary school year.
                [I take the role of {{user}}, do not write {{user}}'s actions or dialogue in your replies.]`
                );
        })

        await test.step('Save Persona', async () => {
            await page.getByRole('button', { name: 'Save' }).click()
        })
    });
})

//     await test.step('Click on Import', async () => {
//         await page.getByText('Import', { exact: true }).click();
//     })

//     await test.step('Click on Import as Character', async () => {
//         await page.getByRole('button', { name: 'Import as Character Add this' }).click();
//     })
// });

// await test.step('Download and Import Online Character', async () => {
//     await test.step('Click on Download', async () => {
//         await page.getByRole('button', { name: 'Download', exact: true }).click()
//     });

//     await test.step('Click on a random Character', async () => {
//         const buttons = page.locator(
//             '[data-component="BotBrowserView"] > div button'
//         );
//         const count = await buttons.count();
//         expect(count).toBeGreaterThan(0);

//         const randomIndex = Math.floor(Math.random() * count);

//         await buttons.nth(randomIndex).click();
//     });

//     await test.step('Click on Import', async () => {
//         await page.getByText('Import', { exact: true }).click();
//     })

//     await test.step('Click on Import as Character', async () => {
//         await page.getByRole('button', { name: 'Import as Character Add this' }).click();
//     })
// });




// test.step('Create Persona X', ...)
// test.step('Create Lorebook X', ...)
// test.step('Install four Agents', ...)


// // Story Bundle Flow
// await test.step('Create story bundle', async () => {
//     await page.getByTestId('topbar-panel-button-story-bundles').click();
//     await page.getByTestId('story-bundles-create-button').click();
//     await page.getByTestId('app-dialog-confirm-button').click();
// });


// await test.step('Enter story bundle comment', async () => {
//     await page.getByTestId('story-bundle-editor-metadata-comment-input')
//         .fill('A complete story setup with characters, lore, and everything needed to get started');
// })

// await test.step('Enter creator name', async () => {
//     await page.getByTestId('story-bundle-editor-metadata-creator-input').fill('Aster Vale');
// });


// await test.step('Enter story bundle name', async () => {
//     // Academy Tag with Enter Key
//     await page.getByTestId('story-bundle-editor-metadata-tag-input').fill('academy');
//     await page.keyboard.press('Enter');

//     // School Tag with Button
//     await page.getByTestId('story-bundle-editor-metadata-tag-input').fill('school');
//     await page.getByTestId('story-bundle-editor-metadata-tag-add-button').click();
// })

// await test.step('Upload story bundle image', async () => {
//     const fileChooserPromise = page.waitForEvent('filechooser');

//     await page.getByTestId('story-bundle-editor-image-upload-button').click();

//     const fileChooser = await fileChooserPromise;
//     await fileChooser.setFiles('../data/story-bundle-happy-path-test-data-picture.webp');
// });

// await test.step('Switch to Description Tab', async () => {
//     await page.getByTestId('story-bundle-editor-tab-description').click();
// })

// await test.step('Enter story bundle description', async () => {
//     await page.getByTestId('story-bundle-editor-description-preview-toggle').click()
//     await page.getByTestId('story-bundle-editor-description-input').fill(`
//             <div style="background:linear-gradient(135deg,#17152f 0%,#29205a 55%,#3b2b73 100%);color:#fff;font-family:Arial,sans-serif;padding:20px;border-radius:12px;box-shadow:0 8px 24px rgba(32,20,70,.35);line-height:1.55;">
//             <div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#cfc4ff;margin-bottom:6px;">
//                 ✦ Welcome to the Academy ✦
//             </div>
//             <div style="font-size:25px;font-weight:900;line-height:1.15;margin-bottom:8px;">
//                 The Academy Beyond the Gate
//             </div>
//             <div style="height:2px;background:linear-gradient(90deg,#f6d77a,#b99cff,transparent);margin:10px 0 16px;"></div>
//             <div style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);padding:12px 14px;border-radius:8px;margin-bottom:14px;">
//                 <div style="font-size:15px;font-weight:700;color:#f6d77a;margin-bottom:4px;">
//                 ✨ Your journey begins here.
//                 </div>
//                 <div style="font-size:13px;color:#eee9ff;">
//                 Chosen students from across the kingdom gather here to master their abilities, uncover forgotten secrets and find their place in a world filled with possibilities.
//                 </div>
//             </div>
//             <p style="font-size:13px;color:#eee9ff;margin:0 0 10px;">
//                 Classes will be formed, friendships will be tested, and unexpected adventures await beyond the classroom.
//             </p>
//             <p style="font-size:13px;color:#eee9ff;margin:0;">
//                 <span style="color:#f6d77a;font-weight:700;">Your story starts the moment you walk through the gate.</span>
//             </p>
//             </div>
//         `);
//     await page.getByTestId('story-bundle-editor-description-preview-toggle').click()
// })

// await test.step('Add characters', async () => {
//     // Download existing character
//     // Create second character
//     // Add both to bundle
// });

// await test.step('Create persona', async () => {
//     // ...
// });

// await test.step('Create preset', async () => {
//     // ...
// });

// await test.step('Create lorebook', async () => {
//     // ...
// });

// await test.step('Install agents', async () => {
//     // Install all 4 real agents
// });

// await test.step('Configure story bundle', async () => {
//     // Add all objects
//     // Configure intro
//     // Configure agents
// });

// await test.step('Start story', async () => {
//     // Actual Play
// });

// await test.step('Verify complete story configuration', async () => {
//     // Settings
//     // Verify Characters
//     // Persona
//     // Preset
//     // Lorebook
//     // Agents
// });

// await page.goto('http://127.0.0.1:7860/');
// await page.getByRole('button', { name: 'Got it' }).click();







// await page.getByTestId('story-bundle-editor-metadata-tag-input').fill('bundle');
// await page.getByTestId('story-bundle-editor-metadata-tag-add-button').click();
// await expect(page.getByTestId('story-bundle-editor-metadata-tag-first')).toBeVisible();
// await expect(page.getByTestId('story-bundle-editor-metadata-tag-bundle')).toBeVisible();
// await page.getByTestId('story-bundle-editor-tab-description').click();
// await page.getByTestId('story-bundle-editor-description-preview-toggle').click();
// await page.getByTestId('story-bundle-editor-description-preview').click();
// await page.getByTestId('story-bundle-editor-description-input').fill('My first Bundle');
// await expect(page.getByTestId('story-bundle-editor-description-preview')).toContainText('My first Bundle');
// await page.getByTestId('story-bundle-editor-tab-characters').click();
// await page.getByRole('button', { name: 'Characters', description: 'Characters' }).click();
// await page.getByRole('button', { name: 'New', exact: true }).click();
// await page.getByRole('textbox', { name: 'Character name...' }).click();
// await page.getByRole('textbox', { name: 'Character name...' }).fill('New Character for Bundle');
// await page.getByRole('button', { name: 'Create', exact: true }).click();
// await page.getByRole('button', { name: 'Back', description: 'Back' }).click();
// await page.getByRole('button', { name: 'Open Library' }).click();
// await page.getByRole('button', { name: 'Close library' }).click();
// await page.getByRole('button', { name: 'Characters' }).click();
// await page.getByRole('button', { name: 'Download', exact: true }).click();
// await page.getByRole('button', { name: 'Download', exact: true }).click();
// await page.getByRole('button', { name: 'Download', exact: true }).click();
// await page.getByRole('button', { name: 'Close panel' }).click();
// await page.getByRole('button', { name: 'Queen Elara Queen Elara by' }).click();
// await page.getByRole('button', { name: 'Import' }).click();
// await page.getByRole('button', { name: 'Import as Character Add this' }).click();
// await page.getByRole('button', { name: 'Close library' }).click();
// await page.getByTestId('topbar-panel-button-story-bundles').click();
// await page.getByTestId('story-bundle-row-0E6CcXC80E7zrnBURQb6J').click();
// await page.getByTestId('story-bundle-editor-tab-personas').click();
// await page.getByTestId('story-bundle-editor-tab-characters').click();
// await page.getByTestId('story-bundle-editor-characters-add-4x6TzHgpzgN4laaNXysh5').click();
// await page.getByTestId('story-bundle-editor-characters-add-7ujBmYTWcKQ0uPr1FYUmU').click();
// await page.getByTestId('story-bundle-editor-tab-personas').click();
// await page.getByTestId('topbar-panel-button-personas').click();
// await page.getByRole('button', { name: 'New', exact: true }).click();
// await page.getByRole('textbox', { name: 'Name *' }).fill('My Story Bundle Persona');
// await page.getByRole('button', { name: 'Create', exact: true }).click();
// await page.getByTestId('topbar-panel-button-story-bundles').click();
// await page.getByTestId('story-bundle-row-0E6CcXC80E7zrnBURQb6J').click();
// await page.getByTestId('story-bundle-editor-tab-personas').click();
// await page.getByTestId('story-bundle-editor-personas-add-b0hnfZVFn7tHvdEOd4DD3').click();
// await page.getByTestId('story-bundle-editor-tab-characters').click();
// await page.getByTestId('story-bundle-editor-characters-add-4x6TzHgpzgN4laaNXysh5').click();
// await page.getByTestId('story-bundle-editor-characters-add-7ujBmYTWcKQ0uPr1FYUmU').click();
// await page.getByTestId('story-bundle-editor-tab-personas').click();
// await page.getByTestId('story-bundle-editor-tab-characters').click();
// await page.getByTestId('story-bundle-editor-tab-personas').click();
// await page.getByTestId('story-bundle-editor-tab-lorebooks').click();
// await page.getByTestId('story-bundle-editor-save-button').click();
// await page.getByTestId('topbar-panel-button-lorebooks').click();
// await page.getByRole('button', { name: 'New', exact: true }).click();
// await page.getByRole('textbox', { name: 'Name *' }).fill('Lorebook for Bundle');
// await page.getByRole('button', { name: 'Create Lorebook', exact: true }).click();
// await page.getByTestId('topbar-panel-button-story-bundles').click();
// await page.getByTestId('story-bundle-row-0E6CcXC80E7zrnBURQb6J').click();
// await page.getByTestId('story-bundle-editor-lorebooks-add-RogxybTdlpK6XN__jb54E').click();
// await page.getByTestId('story-bundle-editor-save-button').click();
// await page.getByTestId('story-bundle-editor-tab-presets').click();
// await page.getByTestId('story-bundle-editor-presets-add-ZtjsYdyS3jDo-T-tZTDX0').click();
// await page.getByTestId('story-bundle-editor-save-button').click();
// await page.getByTestId('story-bundle-editor-tab-agents').click();
// await page.getByTestId('story-bundle-editor-agents-add-continuity').click();
// await page.getByTestId('story-bundle-editor-agents-add-world-state').click();
// await page.getByTestId('story-bundle-editor-agents-add-prose-guardian').click();
// await page.getByTestId('story-bundle-editor-agents-add-character-tracker').click();
// await page.getByTestId('story-bundle-editor-save-button').click();
// await page.getByTestId('story-bundle-editor-tab-intros').click();
// await page.getByTestId('story-bundle-editor-intros-add-button').click();
// await page.getByTestId('story-bundle-editor-intros-name-input').fill('My first Intro');
// await page.getByTestId('story-bundle-editor-intros-text-input').click();
// await page.getByTestId('story-bundle-editor-intros-text-input').fill('Hello!');
// await page.getByTestId('story-bundle-editor-intros-save-button').click();
// await page.getByTestId('story-bundle-editor-save-button').click();
// await page.getByTestId('story-bundle-editor-play-button').click();
// await expect(page.getByLabel('Choose an Intro', { exact: true })).toContainText('My first Intro');
// await page.getByRole('button', { name: 'My first Intro' }).click();
// await page.getByRole('button', { name: 'Roleplayer {{char}}, a real' }).click();
// await page.getByRole('button', { name: 'Game Master an excellent Game' }).click();
// await page.getByRole('button', { name: 'Confirm Choices' }).click();
// await page.getByRole('button', { name: 'Home' }).click();
// await page.getByRole('button', { name: 'Chats', exact: true }).click();
// await page.getByRole('button', { name: 'Drag chat Elara N My first' }).click();
// await page.getByRole('button', { name: 'Drag chat Elara N My first' }).click();
// await page.getByRole('button', { name: 'Close chats' }).click();
// await page.getByRole('button', { name: 'Chat Settings' }).click();
// await page.getByRole('button', { name: 'Prompt Preset Show help' }).click();
// await page.getByRole('button', { name: 'Connection Show help' }).click();
// await page.getByRole('button', { name: 'Connection Show help' }).click();
// await page.getByRole('button', { name: 'Connection Show help' }).click();
// await page.getByRole('button', { name: 'Prompt Preset Show help' }).click();
// await page.getByRole('button', { name: 'Chat Settings' }).click();
// await page.getByRole('button', { name: 'Chat Settings' }).click();
// await page.getByRole('button', { name: 'Prompt Preset Show help' }).click();
// await page.getByRole('button', { name: 'Prompt Preset Show help' }).click();
// });