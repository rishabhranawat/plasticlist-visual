import React, { useState } from 'react';
import { Upload, ImageIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const ImageClassifier = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [classification, setClassification] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
      setClassification('');
      setError('');
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('image', selectedFile);

    try {
      const response = await fetch('http://localhost:5000/classify', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Classification failed');
      }

      const data = await response.json();
      setClassification(data.classification);
    } catch (err) {
      setError('Failed to classify image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card className="bg-white shadow-lg">
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Upload Section */}
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className="flex flex-col items-center cursor-pointer space-y-2"
              >
                {preview ? (
                  <img
                    src={preview}
                    alt="Preview"
                    className="max-h-64 rounded-lg object-contain"
                  />
                ) : (
                  <>
                    <ImageIcon className="h-12 w-12 text-gray-400" />
                    <span className="text-sm text-gray-500">
                      Click to upload an image
                    </span>
                  </>
                )}
              </label>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={!selectedFile || isLoading}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              ) : (
                <Upload className="h-5 w-5" />
              )}
              <span>{isLoading ? 'Classifying...' : 'Classify Image'}</span>
            </button>

            {/* Results Section */}
            {classification && (
              <Alert className="bg-green-50 border-green-200">
                <AlertTitle className="text-green-800">Result</AlertTitle>
                <AlertDescription className="text-green-700">
                  {classification}
                </AlertDescription>
              </Alert>
            )}

            {/* Error Message */}
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ImageClassifier;