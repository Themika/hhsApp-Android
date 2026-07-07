let currentFileHandle = null; // Browser-only "Pro" save target (File System Access API)

function logImportDebug(stage, details = {}) {
    console.log(`[HHS DEBUG] ${stage}`, details);
}

// Silent autosave — called after every mutation (import, add step, delete
// step, save/update step). Never opens a share sheet or a save dialog.
// On the native app it writes straight to the app's private storage via
// Capacitor Filesystem. In a plain browser (dev/testing) it falls back to
// localStorage so nothing is lost across a reload.
async function commitDatabaseChangesToDisk() {
    const updatedDataString = JSON.stringify(QUESTIONS_CONFIG, null, 2);

    if (isNativePlatform() && window.Capacitor?.Plugins?.Filesystem) {
        const { Filesystem } = window.Capacitor.Plugins;
        try {
            await Filesystem.writeFile({
                path: 'questions.txt',
                directory: 'DATA',
                data: updatedDataString,
                encoding: 'utf8'
            });
            logImportDebug('commitDatabaseChangesToDisk:savedNative', { directory: 'DATA' });
        } catch (err) {
            console.error('Native filesystem save failed:', err);
        }
        return;
    }

    // Browser/dev fallback
    try {
        localStorage.setItem('hhsQuestionsConfig', updatedDataString);
        logImportDebug('commitDatabaseChangesToDisk:savedLocalStorage', {});
    } catch (err) {
        console.error('localStorage save failed:', err);
    }
}

// Explicit export — call this ONLY from a user-clicked "Export"/"Save File"
// button. On the native app this writes a copy to the device's cache
// directory and opens the native Share sheet so the user can save it to
// Files, email it, etc. In a plain browser it downloads a .txt file.
async function exportDatabaseToFile() {
    const updatedDataString = JSON.stringify(QUESTIONS_CONFIG, null, 2);

    if (isNativePlatform() && window.Capacitor?.Plugins?.Filesystem) {
        const { Filesystem, Share } = window.Capacitor.Plugins;
        try {
            const written = await Filesystem.writeFile({
                path: 'questions.txt',
                directory: 'CACHE',
                data: updatedDataString,
                encoding: 'utf8'
            });

            if (Share) {
                await Share.share({
                    title: 'Export Protocol Data',
                    text: 'HHS protocol data export',
                    url: written.uri,
                    dialogTitle: 'Save or send questions.txt'
                });
            } else {
                alert("Exported file saved to app cache (no Share plugin installed to hand it off — run `npm install @capacitor/share && npx cap sync`).");
            }
            logImportDebug('exportDatabaseToFile:savedNative', { uri: written.uri });
        } catch (err) {
            if (err?.message !== 'Share canceled') {
                console.error('Export failed:', err);
                alert("Failed to export file: " + err.message);
            }
        }
        return;
    }

    // Browser/dev fallback
    if ('showSaveFilePicker' in window) {
        try {
            if (!currentFileHandle) {
                currentFileHandle = await window.showSaveFilePicker({
                    suggestedName: 'questions.txt',
                    types: [{ description: 'JSON File', accept: { 'application/json': ['.txt', '.json'] } }],
                });
            }
            const writable = await currentFileHandle.createWritable();
            await writable.write(updatedDataString);
            await writable.close();
            logImportDebug('exportDatabaseToFile:savedNative', { path: currentFileHandle.name });
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Export failed:', err);
                alert("Failed to export file: " + err.message);
            }
        }
    } else {
        downloadTxtFile();
    }
}

function downloadTxtFile() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(QUESTIONS_CONFIG, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "questions.txt");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

// Import — uses a standard HTML file input. This is deliberately kept as
// the primary (not just fallback) path because it's the one mechanism that
// reliably triggers the native file/document picker inside a Capacitor
// WebView on both Android and iOS, no extra plugin required.
async function triggerTxtImport() {
    document.getElementById('importTxtInput').click();
}

function applyImportedTxtPayload(jsonString, filePath) {
    const importedData = JSON.parse(jsonString);
    QUESTIONS_CONFIG = importedData;

    // Explicitly update the global file path tracking
    activeDataFilePath = filePath;

    // Silent autosave only — no share sheet, no download
    commitDatabaseChangesToDisk();

    // Force a fresh UI build
    buildWorkflowUI();

    // Ensure the editor view is cleared so it doesn't hold onto stale "draft" data
    closeControlPage();

    alert("✅ Data imported successfully");
    window.location.reload();
}

function handleTxtImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    logImportDebug('handleTxtImport:fileSelected', {
        name: file.name,
        type: file.type,
        size: file.size
    });

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            applyImportedTxtPayload(e.target.result, file.name || null);
        } catch (err) {
            alert("Error importing: " + err.message);
        }
        if (event.target) {
            event.target.value = "";
        }
    };
    reader.readAsText(file);
}