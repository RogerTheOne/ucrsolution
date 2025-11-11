# UCRSolution Nutrition Snapshot

## Overview
UCRSolution is a prototype meal analysis experience that pairs an Expo/React Native mobile client with an AI-powered nutrition service. Users capture a meal photo inside the mobile app, the app forwards the image to a Flask-based backend, and the service responds with an ingredient-level macronutrient breakdown. The refreshed mobile UI renders those results in an easy-to-read card layout with total calories, macros, confidence indicators, and quality-of-life helpers such as serving adjustments and tagging.

The repository currently contains the mobile Expo project in [`mobile/`](mobile/) and a `server/` directory with sample assets and request logs used when iterating on the backend. The production backend itself is hosted externally (see `SERVER_URL` in the mobile app). You can reuse the included structure to stand up your own Flask service if you do not already have one available.

## Project structure

```
.
├── mobile/         # Expo React Native client that captures photos and displays nutrition results
├── server/         # Reference assets and uploads captured while developing the backend
└── README.md
```

### Mobile app highlights
- Built with Expo SDK 54, React 19, and React Native 0.81.
- Uses `expo-image-picker` to request camera permissions and capture meal photos.
- Uploads images to `${SERVER_URL}/upload` as multipart form data.
- Displays loading indicators while a meal is being analyzed and reveals a rich nutrition breakdown once the backend responds.
- Allows users to retake photos, adjust serving counts, and apply tags to their meals.

### Backend expectations
The mobile client expects a Flask (or API-compatible) backend that exposes a `POST /upload` endpoint. The endpoint should accept a `photo` form field containing the image binary and respond with JSON in the following shape:

```json
{
  "result": {
    "total_calories": 550,
    "ingredients": [
      {
        "name": "Grilled Chicken",
        "calories_kcal": 312,
        "protein_g": 58.7,
        "carbs_g": 0,
        "fat_g": 7.2,
        "weight_g": 189,
        "confidence": 0.92
      }
    ]
  }
}
```

Each ingredient entry can include `confidence` (0–1 or 0–100), `weight_g`, and macro values. Missing values are safely handled by the UI, but providing the full set yields the best presentation.

## Prerequisites
- Node.js 18 or newer
- npm 9 or newer (ships with Node 18+)
- Expo CLI (installed automatically via `npx expo` commands)
- An Expo-compatible mobile device or emulator (iOS Simulator, Android Emulator, or the Expo Go app)
- A running backend service that matches the expectations above (update `SERVER_URL` in [`mobile/App.js`](mobile/App.js) with your endpoint)

## Getting started

### 1. Install dependencies
```bash
cd mobile
npm install
```

### 2. Configure the backend endpoint
Edit [`mobile/App.js`](mobile/App.js) and update the `SERVER_URL` constant so it points to your nutrition analysis service. During development you can expose a local Flask app with a tunneling service such as `loca.lt` or `ngrok`.

### 3. Launch the Expo development server
```bash
npm run start
```

Expo will print a QR code and options for launching on iOS, Android, or web. Choose the platform you prefer:
- **Expo Go (physical device):** Scan the QR code with the Expo Go app.
- **iOS Simulator:** Press `i` in the terminal after the server starts.
- **Android Emulator:** Press `a` in the terminal.

### 4. Capture a meal and review the breakdown
1. Grant camera permissions when prompted.
2. Tap **Take Photo** to open the camera, capture a meal, and confirm the photo.
3. Wait for the backend to analyze the image; a loading indicator will be shown.
4. Review the nutrition breakdown once the response arrives. Use the serving controls and tagging UI as desired.

## Development tips
- **Resetting a session:** Tap the back chevron in the results header to clear the current photo and start a fresh capture.
- **Handling errors:** If the backend returns an error (non-200 response), the app will display an alert and keep the previous state intact so you can retry.
- **Custom styling:** The UI styles live in [`mobile/App.js`](mobile/App.js); tweak the `styles` object and `PALETTE` array to adjust the look and feel.
- **Extending the backend:** Use the sample payload format above when implementing additional nutrient fields. The UI can be extended to display micronutrients, dietary tags, or allergen warnings by following the ingredient card pattern.

## Troubleshooting
- **Camera permissions denied:** Re-enable camera access in your device settings or use the Expo Go permissions reset command.
- **Network connectivity issues:** Ensure your development machine and device are on the same network when using Expo Go. If you are exposing a local server over the internet, verify that the tunnel URL is active.
- **Mismatched response schema:** Confirm that the backend returns the `result` wrapper and that every ingredient includes numeric macro fields. The UI falls back to `--` when values are missing or malformed.

## License
This project is currently provided without a formal license. Contact the maintainers if you plan to use it beyond internal evaluation.
