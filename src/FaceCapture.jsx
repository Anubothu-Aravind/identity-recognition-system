import React, { useRef, useState, useEffect } from "react";
import * as faceapi from "face-api.js";
import * as tf from "@tensorflow/tfjs";

const FaceCapture = ({ onSuccessfulAuth }) => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [modelLoadingProgress, setModelLoadingProgress] = useState({});
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [message, setMessage] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [userName, setUserName] = useState("");
  const [features, setFeatures] = useState(null);

  // Load face-api.js models with better error handling
  useEffect(() => {
    const loadModels = async () => {
      try {
        setMessage("Loading face recognition models...");
        setIsModelLoaded(false);

        // Define model paths - adjust these paths based on your setup
        const MODEL_URL = "/models"; // or wherever your models are stored

        // Load models one by one with progress tracking
        setModelLoadingProgress({ tinyFaceDetector: "loading..." });
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        setModelLoadingProgress((prev) => ({
          ...prev,
          tinyFaceDetector: "✅",
        }));

        setModelLoadingProgress((prev) => ({
          ...prev,
          faceRecognitionNet: "loading...",
        }));
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        setModelLoadingProgress((prev) => ({
          ...prev,
          faceRecognitionNet: "✅",
        }));

        setModelLoadingProgress((prev) => ({
          ...prev,
          faceLandmark68Net: "loading...",
        }));
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        setModelLoadingProgress((prev) => ({
          ...prev,
          faceLandmark68Net: "✅",
        }));

        // Verify all models are loaded
        const modelsLoaded =
          faceapi.nets.tinyFaceDetector.isLoaded &&
          faceapi.nets.faceRecognitionNet.isLoaded &&
          faceapi.nets.faceLandmark68Net.isLoaded;

        if (modelsLoaded) {
          setIsModelLoaded(true);
          setMessage("Face recognition models loaded successfully! ✅");
        } else {
          throw new Error("Some models failed to load properly");
        }
      } catch (error) {
        console.error("Error loading models:", error);
        setMessage("Error loading face-api.js models. Trying fallback mode...");

        // Fallback to TensorFlow.js only
        try {
          await tf.ready();
          setIsModelLoaded(true);
          setMessage("Using fallback mode - basic image capture available ⚠️");
        } catch (tfError) {
          console.error("TensorFlow.js error:", tfError);
          setMessage(
            "Error initializing face recognition. Please check model files."
          );
          setIsModelLoaded(false);
        }
      }
    };

    loadModels();
  }, []);

  // Get video stream with better error handling
  const getVideo = () => {
    navigator.mediaDevices
      .getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
      })
      .then((stream) => {
        if (webcamRef.current) {
          webcamRef.current.srcObject = stream;
        }
      })
      .catch((err) => {
        console.error("Error accessing webcam:", err);
        setMessage("Error accessing webcam. Please allow camera permissions.");
      });
  };

  useEffect(() => {
    getVideo();
  }, []);

  // Wait for video to be ready
  const waitForVideoReady = () => {
    return new Promise((resolve) => {
      const video = webcamRef.current;
      if (video && video.readyState === 4) {
        resolve();
      } else {
        video.addEventListener("loadeddata", resolve, { once: true });
      }
    });
  };

  // Capture image and extract face features using face-api.js
  const captureAndExtract = async () => {
    if (!webcamRef.current) {
      setMessage("Webcam not available");
      return null;
    }

    setIsCapturing(true);

    try {
      // Wait for video to be ready
      await waitForVideoReady();

      const canvas = canvasRef.current;
      const video = webcamRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0);

      const imageData = canvas.toDataURL("image/jpeg");
      setCapturedImage(imageData);

      // Check if face-api.js models are properly loaded
      if (
        faceapi.nets.tinyFaceDetector.isLoaded &&
        faceapi.nets.faceRecognitionNet.isLoaded &&
        faceapi.nets.faceLandmark68Net.isLoaded
      ) {
        // Use face-api.js for face detection and feature extraction
        const detection = await faceapi
          .detectSingleFace(
            video,
            new faceapi.TinyFaceDetectorOptions({
              inputSize: 416,
              scoreThreshold: 0.5,
            })
          )
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detection) {
          const faceVector = Array.from(detection.descriptor); // 128-dimensional features
          setFeatures(faceVector);
          setIsCapturing(false);
          return { imageData, features: faceVector };
        } else {
          setMessage(
            "No face detected. Please ensure your face is clearly visible and well-lit."
          );
          setIsCapturing(false);
          return null;
        }
      } else {
        // Fallback to basic feature extraction
        const fallbackFeatures = await extractFaceFeatures(imageData);
        if (fallbackFeatures) {
          setFeatures(fallbackFeatures);
          setIsCapturing(false);
          return { imageData, features: fallbackFeatures };
        } else {
          setMessage("Error extracting face features");
          setIsCapturing(false);
          return null;
        }
      }
    } catch (error) {
      console.error("Error in captureAndExtract:", error);
      setMessage("Error detecting face. Please try again.");
      setIsCapturing(false);
      return null;
    }
  };

  // Enhanced fallback feature extraction
  const extractFaceFeatures = async (imageData) => {
    try {
      const img = new Image();
      img.src = imageData;

      return new Promise((resolve) => {
        img.onload = () => {
          try {
            const tensor = tf.browser
              .fromPixels(img)
              .resizeNearestNeighbor([224, 224])
              .toFloat()
              .div(255.0)
              .expandDims();

            // Simple feature extraction - normalize and reduce dimensions
            const flattened = tensor.flatten();
            const features = flattened.arraySync();

            // Take every nth feature to get 128 dimensions
            const step = Math.floor(features.length / 128);
            const reducedFeatures = [];
            for (let i = 0; i < features.length; i += step) {
              if (reducedFeatures.length >= 128) break;
              reducedFeatures.push(features[i]);
            }

            // Pad with zeros if needed
            while (reducedFeatures.length < 128) {
              reducedFeatures.push(0);
            }

            tensor.dispose();
            flattened.dispose();

            resolve(reducedFeatures);
          } catch (error) {
            console.error("Error in tensor processing:", error);
            resolve(null);
          }
        };

        img.onerror = () => {
          console.error("Error loading image for feature extraction");
          resolve(null);
        };
      });
    } catch (error) {
      console.error("Error extracting features:", error);
      return null;
    }
  };

  // Register new user
  const registerUser = async () => {
    if (!userName.trim()) {
      setMessage("Please enter a username");
      return;
    }

    if (!isModelLoaded) {
      setMessage("Models not loaded yet. Please wait.");
      return;
    }

    setMessage("Processing...");

    const result = await captureAndExtract();

    if (!result || !result.features) {
      setMessage("Error extracting face features. Please try again.");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: userName,
          imageData: result.imageData,
          features: result.features,
        }),
      });

      const apiResult = await response.json();

      if (response.ok) {
        setMessage(`User ${userName} registered successfully! ✅`);
        setUserName("");
        setIsRegistering(false);
        setCapturedImage(null);
        setFeatures(null);
      } else {
        setMessage(apiResult.error || "Registration failed");
      }
    } catch (error) {
      console.error("Registration error:", error);
      setMessage(
        "Server connection error. Please check if backend is running."
      );
    }
  };

  // Login user
  const loginUser = async () => {
    if (!isModelLoaded) {
      setMessage("Models not loaded yet. Please wait.");
      return;
    }

    setMessage("Authenticating...");

    const result = await captureAndExtract();

    if (!result || !result.features) {
      setMessage("Error extracting face features. Please try again.");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          features: result.features,
        }),
      });

      const apiResult = await response.json();

      if (response.ok) {
        setMessage(`Welcome back, ${apiResult.username}! ✅`);
        setCapturedImage(null);
        setFeatures(null);

        // Call the onSuccessfulAuth callback if provided
        if (onSuccessfulAuth) {
          onSuccessfulAuth({
            username: apiResult.username,
            similarity: apiResult.similarity,
          });
        }
      } else {
        setMessage(apiResult.error || "Authentication failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      setMessage(
        "Server connection error. Please check if backend is running."
      );
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold text-center mb-6">
        Face Recognition Login
      </h1>

      {/* Status Message */}
      <div className="mb-4 p-3 bg-gray-100 rounded-lg text-center">
        <span
          className={`font-semibold ${
            message.includes("Error") || message.includes("failed")
              ? "text-red-600"
              : message.includes("✅")
              ? "text-green-600"
              : message.includes("⚠️")
              ? "text-yellow-600"
              : "text-blue-600"
          }`}
        >
          {message || "Initializing..."}
        </span>
      </div>

      {/* Model Loading Progress */}
      {Object.keys(modelLoadingProgress).length > 0 && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="font-semibold mb-2">Model Loading Progress:</h4>
          <div className="text-sm space-y-1">
            <div>
              TinyFaceDetector: {modelLoadingProgress.tinyFaceDetector || "⏳"}
            </div>
            <div>
              FaceRecognitionNet:{" "}
              {modelLoadingProgress.faceRecognitionNet || "⏳"}
            </div>
            <div>
              FaceLandmark68Net:{" "}
              {modelLoadingProgress.faceLandmark68Net || "⏳"}
            </div>
          </div>
        </div>
      )}

      {/* Video Feed */}
      <div className="relative mb-6">
        <video
          ref={webcamRef}
          autoPlay
          muted
          playsInline
          className="w-full max-w-md mx-auto rounded-lg shadow-md block"
        />
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Face Features Debug Info */}
      {features && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg text-center">
          <span className="text-sm text-gray-600">
            Face features extracted: {features.length} dimensions
          </span>
        </div>
      )}

      {/* Captured Image Preview */}
      {capturedImage && (
        <div className="mb-6 text-center">
          <h3 className="text-lg font-semibold mb-2">Captured Image:</h3>
          <img
            src={capturedImage}
            alt="Captured"
            className="max-w-xs mx-auto rounded-lg shadow-md"
          />
        </div>
      )}

      {/* Registration Section */}
      {isRegistering ? (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Register New User</h3>
          <input
            type="text"
            placeholder="Enter username"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md mb-3"
          />
          <div className="flex gap-2">
            <button
              onClick={registerUser}
              disabled={!isModelLoaded || isCapturing}
              className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:bg-gray-400"
            >
              {isCapturing ? "Capturing..." : "Register"}
            </button>
            <button
              onClick={() => {
                setIsRegistering(false);
                setCapturedImage(null);
                setFeatures(null);
              }}
              className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-4 justify-center mb-6">
          <button
            onClick={() => setIsRegistering(true)}
            disabled={!isModelLoaded}
            className="bg-green-500 text-white py-2 px-6 rounded-md hover:bg-green-600 disabled:bg-gray-400"
          >
            Register New User
          </button>
          <button
            onClick={loginUser}
            disabled={!isModelLoaded || isCapturing}
            className="bg-blue-500 text-white py-2 px-6 rounded-md hover:bg-blue-600 disabled:bg-gray-400"
          >
            {isCapturing ? "Capturing..." : "Login"}
          </button>
        </div>
      )}

      {/* Instructions */}
      <div className="text-sm text-gray-600 text-center">
        <p>1. Make sure your face is clearly visible in the camera</p>
        <p>2. Ensure good lighting for better face detection</p>
        <p>3. For registration: Enter username and click "Register"</p>
        <p>4. For login: Simply click "Login" to authenticate</p>
        <p className="mt-2 text-xs text-gray-500">
          Note: Requires face-api.js model files in /models directory
        </p>
        <p className="text-xs text-gray-500">
          Models needed: tiny_face_detector_model, face_recognition_model,
          face_landmark_68_model
        </p>
      </div>
    </div>
  );
};

export default FaceCapture;
