# Face Recognition Authentication System

A web application that uses facial recognition for user authentication, built with React, Express, MongoDB, and face-api.js.

## Features

- Face detection and recognition using face-api.js and TensorFlow.js
- User registration with facial features
- Face-based authentication
- Fallback mechanisms when face detection fails
- MongoDB database for storing user data

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- Webcam access

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd my-app
```

### 2. Install dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### 3. Set up face-api.js model files

The application requires face-api.js model files to be available in the `/public/models` directory. Follow these steps to download them:

```bash
# Create the models directory if it doesn't exist
mkdir -p public/models
```

Download the following model files from the [face-api.js GitHub repository](https://github.com/justadudewhohacks/face-api.js/tree/master/weights) and place them in the `public/models` directory:

- **Tiny Face Detector Model**:
  - tiny_face_detector_model-shard1
  - tiny_face_detector_model-weights_manifest.json

- **Face Recognition Model**:
  - face_recognition_model-shard1
  - face_recognition_model-shard2
  - face_recognition_model-weights_manifest.json

- **Face Landmark Model**:
  - face_landmark_68_model-shard1
  - face_landmark_68_model-weights_manifest.json

Alternatively, you can use a script to download these files:

```bash
# Create a script to download the models
cat > download-models.js << 'EOL'
const fs = require('fs');
const path = require('path');
const https = require('https');

const modelsDir = path.join(__dirname, 'public/models');
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
}

const modelFiles = [
  'tiny_face_detector_model-shard1',
  'tiny_face_detector_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2',
  'face_recognition_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_landmark_68_model-weights_manifest.json'
];

const baseUrl = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';

modelFiles.forEach(file => {
  const url = `${baseUrl}/${file}`;
  const filePath = path.join(modelsDir, file);
  
  console.log(`Downloading ${file}...`);
  
  https.get(url, (response) => {
    const fileStream = fs.createWriteStream(filePath);
    response.pipe(fileStream);
    
    fileStream.on('finish', () => {
      fileStream.close();
      console.log(`Downloaded ${file}`);
    });
  }).on('error', (err) => {
    console.error(`Error downloading ${file}: ${err.message}`);
  });
});
EOL

# Run the script
node download-models.js
```

### 4. Configure environment variables

Create a `.env` file in the backend directory with the following content:

```
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/<database-name>
PORT=5000
```

Replace the MongoDB URI with your own connection string.

## Running the Application

### 1. Start the backend server

```bash
cd backend
npm run dev
```

This will start the backend server on port 5000.

### 2. Start the frontend development server

```bash
# In a new terminal window
cd my-app
npm run dev
```

This will start the frontend development server, typically on port 5173.

### 3. Access the application

Open your browser and navigate to:

```
http://localhost:5173
```

## Usage

1. **Registration**:
   - Click "Register New User"
   - Enter a username
   - Position your face in the camera
   - Click "Register"

2. **Login**:
   - Position your face in the camera
   - Click "Login"
   - If your face is recognized, you'll be authenticated

## Troubleshooting

### Face detection issues

- Ensure you have good lighting
- Position your face clearly in the camera
- Make sure the model files are correctly placed in the `/public/models` directory
- Check browser console for any errors related to loading the models

### Backend connection issues

- Verify that the backend server is running on port 5000
- Check that the MongoDB connection string is correct
- Ensure CORS is properly configured

### Webcam access

- Make sure you've granted webcam permissions to the application
- Try using a different browser if webcam access is denied

## License

[MIT](LICENSE) © 2025 [Anubothu Aravind](https://github.com/Anubothu-Aravind)
