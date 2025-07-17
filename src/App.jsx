import { useState } from "react";
import FaceCapture from "./FaceCapture";
import "./App.css";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");

  const handleSuccessfulAuth = (user) => {
    setIsAuthenticated(true);
    setUsername(user.username);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-800">
            Face Recognition Authentication
          </h1>
          <p className="text-gray-600 mt-2">
            Secure login using facial recognition technology
          </p>
        </header>

        {isAuthenticated ? (
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-green-600 mb-4">
              Welcome, {username}!
            </h2>
            <p className="mb-6">You have successfully logged in.</p>
            <button
              onClick={() => setIsAuthenticated(false)}
              className="bg-red-500 text-white py-2 px-6 rounded-md hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        ) : (
          <FaceCapture onSuccessfulAuth={handleSuccessfulAuth} />
        )}

        <footer className="mt-12 text-center text-gray-500 text-sm">
          <p>© 2025 Face Recognition Auth System</p>
          <p className="mt-1">Powered by face-api.js and TensorFlow.js</p>
        </footer>
      </div>
    </div>
  );
}

export default App;