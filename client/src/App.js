import React, { useState } from 'react';
import './App.css';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');

  // We'll read the environment variable here:
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  const handleFileChange = (event) => {
    setError('');
    setResult('');
    const file = event.target.files[0];
    setSelectedFile(file);
    if (file) {
      setImagePreviewUrl(URL.createObjectURL(file));
    } else {
      setImagePreviewUrl('');
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      setError('Please select an image.');
      return;
    }
    setLoading(true);
    setError('');
    setResult('');

    const formData = new FormData();
    formData.append('image', selectedFile);

    try {
      // Now use the variable instead of a hardcoded string:
      const response = await fetch(`${API_BASE_URL}/classify`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      if (data && data.response) {
        setResult(data.response);
      } else {
        setError('Invalid response from server.');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <span className="header-title">Plastic In Your Food?</span>
        </div>
      </header>
      <div className="content-wrapper">
        <div className="input-wrapper">
          <label htmlFor="file-input" className="custom-file-upload classify-button">
            Choose an Image
          </label>
          <input
            id="file-input"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden-file-input"
          />
        </div>
        {error && <div className="error-message">{error}</div>}
        {imagePreviewUrl && (
          <div className="image-preview">
            <img src={imagePreviewUrl} alt="Preview" />
          </div>
        )}
        {selectedFile && (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="classify-button"
          >
            {loading ? 'Finding...' : 'Find'}
          </button>
        )}
        {result && (
          <div className="result-section">
            <iframe
              title="Product Page"
              src={`https://www.plasticlist.org/product/${result}`}
              className="product-iframe"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
