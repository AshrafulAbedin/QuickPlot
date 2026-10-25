# QuickPlot Local Equation OCR (prototype)

This is a starter Chrome Extension (Manifest V3) for a free/browser-side OCR workflow.

## What it does
- Adds a right-click menu item to start selecting a rectangular area on normal webpages.
- Captures the selected screen region.
- Lets you upload an image/screenshot as a fallback.
- Runs Tesseract.js OCR in the browser and lets you edit the result.
- Opens a QuickPlot URL with the equation in a query parameter.

## Important limitations
1. Chrome's built-in PDF viewer is a restricted `chrome://` surface. Extensions generally cannot inject this selection overlay into it. For scanned PDFs opened in that viewer, take a screenshot/crop and upload it through the popup. To support true drag-selection inside PDFs, build/use a PDF.js viewer page or another viewer that the extension can access.
2. Tesseract.js is free/open source, but this starter loads the library from a CDN. OCR recognition runs in-browser, but the first load requires internet. For fully offline operation, bundle Tesseract.js, its worker/core files, and English trained data locally and update the script paths.
3. Ordinary OCR is not mathematical OCR. It can misread exponents, fractions, roots, Greek letters, and layout. Review/edit the result before plotting.
4. Update `http://localhost:5173/?expression=...` in `popup.js` to your actual QuickPlot app route and parameter name.
5. The selection/capture message flow is a prototype and should be tested on your target Chrome version. Browser restrictions can prevent capture on some pages.

## Install for testing
1. Extract the ZIP.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the extracted folder.
5. Open a normal webpage, right-click, and choose **Select equation area for QuickPlot**.
6. Drag around a simple equation, reopen the extension popup, then click **Run local OCR**.
7. Correct the OCR text if necessary, then click **Open in QuickPlot**.

## Suggested first test
Use a clear image containing `y = x^2 + 3`. Confirm the OCR output, then update the QuickPlot URL handoff before expecting the existing app to plot it.
