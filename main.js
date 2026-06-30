const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises; // Use promises for non-blocking I/O
const userDataPath = app.getPath('userData');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200, height: 850,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      plugins: true 
    }
  });
  mainWindow.loadFile(path.join(__dirname, 'Templates/index.html'));
}
app.whenReady().then(createWindow);

// READ HANDLER - Updated to async[cite: 7]
ipcMain.handle('read-database-file', async () => {
  try {
    const targetPath = path.join(userDataPath, 'questions.txt');
    if (!fs.existsSync(targetPath)) return null;
    const data = await fsPromises.readFile(targetPath, 'utf8'); // Non-blocking read[cite: 7]
    return JSON.parse(data);
  } catch (error) { return null; }
});

// SAVE HANDLER - Updated to async[cite: 7]
ipcMain.handle('save-database-file', async (event, rawData) => {
  try {
    const uploadDir = path.join(userDataPath, 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    let questionsArray = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
    
    // Process PDF paths
    if (Array.isArray(questionsArray)) {
      questionsArray.forEach(step => {
        if (step.trials) step.trials.forEach(trial => {
          if (trial.contentType === 'pdf' && trial.localPdfPath) {
            const dest = path.join(uploadDir, path.basename(trial.localPdfPath));
            fs.copyFileSync(trial.localPdfPath, dest);
            trial.pdfPath = dest;
            delete trial.localPdfPath;
          }
        });
      });
    }

    // Non-blocking write[cite: 7]
    await fsPromises.writeFile(path.join(userDataPath, 'questions.txt'), JSON.stringify(questionsArray, null, 2));
    return { success: true };
  } catch (error) { return { success: false, error: error.message }; }
});

// PDF READ HANDLER
ipcMain.handle('read-pdf-file', async (event, filePath) => {
  try {
    const buffer = await fsPromises.readFile(filePath); // Non-blocking read[cite: 7]
    const base64Data = buffer.toString('base64');
    return { success: true, data: base64Data };
  } catch (error) { return { success: false, error: error.message }; }
});