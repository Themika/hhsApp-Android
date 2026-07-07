let QUESTIONS_CONFIG = [];
let currentStepTarget = null;
let activeDataFilePath = null;

let stagedTrialsArray = [];
let activeBulletPointsArr = [];
let stagedPdfData = null;
let editingStepNumber = null;
let editingTrialIndex = null;
let editingBulletIndex = null;

// True when running inside the Capacitor native shell (Android/iOS app),
// false when running in a plain browser (e.g. `npx cap serve` in dev, or
// testing the page directly).
function isNativePlatform() {
    return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
}

document.addEventListener("DOMContentLoaded", async () => {
    document.getElementById('pdfUpload')?.addEventListener('change', handlePdfUpload);
    document.getElementById('importTxtInput')?.addEventListener('change', handleTxtImport);

    try {
        // 1. Native app: look for previously-saved data in the app's private
        //    storage via the Capacitor Filesystem plugin.
        if (isNativePlatform() && window.Capacitor?.Plugins?.Filesystem) {
            const { Filesystem } = window.Capacitor.Plugins;
            try {
                const result = await Filesystem.readFile({
                    path: 'questions.txt',
                    directory: 'DATA',
                    encoding: 'utf8'
                });
                QUESTIONS_CONFIG = JSON.parse(result.data);
                buildWorkflowUI();
                return;
            } catch (readErr) {
                // No saved file yet (first launch) — fall through to bundled asset below.
                console.log('[HHS DEBUG] No saved questions.txt in app storage yet, loading bundled copy.');
            }
        }

        // 2. Browser/dev fallback: prefer a local autosave if one exists.
        if (!isNativePlatform()) {
            const savedLocal = localStorage.getItem('hhsQuestionsConfig');
            if (savedLocal) {
                QUESTIONS_CONFIG = JSON.parse(savedLocal);
                buildWorkflowUI();
                return;
            }
        }

        // 3. First run (native or browser): load the bundled questions.txt
        //    that ships inside the app's www/ assets.
        let protocolPath = 'questions.txt';
        if (window.location.pathname.includes('/Templates/')) protocolPath = '../Scripts/questions.txt';

        const response = await fetch(protocolPath);
        if (!response.ok) throw new Error("Could not find configuration registry database.");
        QUESTIONS_CONFIG = await response.json();
        buildWorkflowUI();
    } catch (err) {
        console.error("Initialization Error:", err);
        alert("Database Error: Could not locate configuration data.");
    }
});