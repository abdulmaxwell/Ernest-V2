// ernest v2/scripts/obfuscate.js

import JavaScriptObfuscator from 'javascript-obfuscator';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { promises as fs } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sourceDir = join(__dirname, '..');
const targetRootDeployDir = join(sourceDir, '..', 'ernest');

async function obfuscateFile(filePath, outputPath) {
    try {
        const code = await fs.readFile(filePath, 'utf8');
        const obfuscationResult = JavaScriptObfuscator.obfuscate(
            code,
            {
                // Core Obfuscation
                compact: true, // Remove all extra whitespace, tabs, and line breaks
                identifierNamesGenerator: 'hexadecimal', // Use hex names (e.g., _0xabc123) for identifiers. Highly effective.
                simplify: true, // Apply various code transformations that make the code harder to comprehend.
                transformObjectKeys: true, // Transforms object keys into obfuscated identifiers.

                // Control Flow Obfuscation (makes code logic very hard to follow)
                controlFlowFlattening: true, // Flatten the control flow of the program. HIGHLY EFFECTIVE.
                controlFlowFlatteningThreshold: 1, // Apply to 100% of the code (0 to 1). Maximize for highest impact.

                // String Obfuscation (hides strings like commands, URLs, messages)
                stringArray: true, // Extract all string literals into a single array and replace them with array calls.
                stringArrayEncoding: ['base64', 'rc4'], // Encode string array values. 'rc4' is stronger than 'base64'.
                stringArrayThreshold: 1, // Apply to 100% of string literals (0 to 1).
                rotateStringArray: true, // Shuffle the string array and change the indices.
                stringArrayWrappersCount: 10, // More wrappers make it harder to deobfuscate.
                stringArrayWrappersType: 'function', // Using 'function' can be more robust.
                splitStrings: true, // Split string literals into chunks.
                splitStringsChunkLength: 5, // Smaller chunks make it more granular.

                // Number Obfuscation
                numbersToExpressions: true, // Converts number literals into equivalent expressions.

                // Dead Code Injection (adds confusing, non-functional code)
                deadCodeInjection: true, // Inject dead code into the output.
                deadCodeInjectionThreshold: 1, // Apply to 100% of code.

                // Self-Defending and Anti-Debugging
                selfDefending: true, // Protects the obfuscated code against tampering. Makes it break if pretty-printed or formatted.
                debugProtection: true, // Make it harder to use browser developer tools.
                debugProtectionInterval: 4000, // Interval in milliseconds for debug protection to check. Lower means more frequent checks.

                // Other Renaming
                // renameGlobals: true, // CAUTION: Can break global references. Only use if sure.
                                    // For typical module-based Node.js code, keep as 'false'.
                renameProperties: true, // Rename all properties in the code. Effective but can also cause issues if you access properties dynamically (e.g., `obj[variable]`). Test thoroughly.
                renamePropertiesMode: 'safe', // 'safe' tries to avoid breaking code, 'unsafe' is more aggressive.

                // Console Output Control
                disableConsoleOutput: false, // Set to 'true' to completely remove console.log calls.
                                            // WARNING: This makes debugging and seeing your bot's logs impossible.
                                            // Only use if you have an alternative, robust logging system.
                                            // Keeping it 'false' is generally safer for bot operations.

                // Additional settings for larger codebases or specific needs
                sourceMap: false, // Set to true if you need source maps for debugging (contradicts obfuscation goal, but useful for initial testing).
                unicodeEscapeSequence: true, // Replaces characters with unicode escape sequences. Increases file size but further obscures.
            }
        );

        const obfuscatedCode = obfuscationResult.getObfuscatedCode();
        await fs.writeFile(outputPath, obfuscatedCode);
        console.log(`✅ Obfuscated: ${filePath.replace(sourceDir, '')} -> ${outputPath.replace(targetRootDeployDir, '')}`);
    } catch (error) {
        console.error(`❌ Failed to obfuscate ${filePath.replace(sourceDir, '')}:`, error);
        throw error;
    }
}

async function copyAndObfuscateDirectory(src, dest) {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = join(src, entry.name);
        const destPath = join(dest, entry.name);

        if (entry.isDirectory()) {
            if (entry.name === 'node_modules' || entry.name === 'scripts' || entry.name === 'tests' || entry.name === 'session') {
                console.log(`⏭️ Skipping directory: ${srcPath.replace(sourceDir, '')}`);
                continue;
            }
            await copyAndObfuscateDirectory(srcPath, destPath);
        } else if (entry.isFile()) {
            if (entry.name.endsWith('.js')) {
                await obfuscateFile(srcPath, destPath);
            } else if (entry.name === 'package.json') {
                await fs.copyFile(srcPath, destPath);
                console.log(`➡️ Copied: ${entry.name}`);
            } else if (entry.name === '.env') {
                console.log(`⚠️ Skipped .env file. Remember to configure environment variables or create a .env file in the deployment folder.`);
            } else {
                // You can add more specific file types to copy if your bot uses other assets (e.g., images, JSON config files)
                // For now, it will only copy .js and package.json explicitly.
                // If you have important non-JS files in subdirectories (like your 'data' folder for auth state),
                // those are handled by the recursive call for directories.
                 await fs.copyFile(srcPath, destPath); // Explicitly copying all other files
                 console.log(`➡️ Copied other file: ${srcPath.replace(sourceDir, '')}`);
            }
        }
    }
}

async function main() {
    console.log(`🚀 Starting obfuscation process from "${sourceDir}" to "${targetRootDeployDir}"...`);
    try {
        await fs.rm(targetRootDeployDir, { recursive: true, force: true });
        console.log(`🧹 Cleaned previous deployment directory: ${targetRootDeployDir}`);

        await copyAndObfuscateDirectory(sourceDir, targetRootDeployDir);

        console.log(`\n🎉 Obfuscation and copying complete!`);
        console.log(`Your deployable bot is in the "${targetRootDeployDir}" directory.`);
        console.log(`\n--------------------------------------------------------------------------------`);
        console.log(`* IMPORTANT NEXT STEPS FOR DEPLOYMENT FOLDER ("${targetRootDeployDir}"): *`);
        console.log(`1. Navigate into the folder: cd "${targetRootDeployDir}"`);
        console.log(`2. Install dependencies: npm install`);
        console.log(`3. Create your .env file with your WHATSAPP_SESSION and other variables. DO NOT COMMIT .env to Git!`);
        console.log(`4. Initialize Git in this folder and push to your *private* deployment repository.`);
        console.log(`5. To run: node index.js (or ernest.js if you rename it)`);
        console.log(`--------------------------------------------------------------------------------`);

    } catch (error) {
        console.error(`💥 Obfuscation process failed:`, error);
        process.exit(1);
    }
}

main();