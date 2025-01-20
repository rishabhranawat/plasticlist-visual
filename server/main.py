import os
import time
import tempfile
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import pandas as pd
import requests
from bs4 import BeautifulSoup

import google.generativeai as genai

app = Flask(__name__)
CORS(app, resources={r"/classify": {"origins": "*"}})

# Configure Gemini API
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

# ------ Utility Functions ------

def upload_to_gemini(path, mime_type=None):
    """Uploads the given file to Gemini."""
    file = genai.upload_file(path, mime_type=mime_type)
    print(f"Uploaded file '{file.display_name}' as: {file.uri}")
    return file

def wait_for_files_active(files):
    """Waits for the given files to be active."""
    print("Waiting for file processing...")
    for name in (file.name for file in files):
        file = genai.get_file(name)
        while file.state.name == "PROCESSING":
            print(".", end="", flush=True)
            time.sleep(10)
            file = genai.get_file(name)
        if file.state.name != "ACTIVE":
            raise Exception(f"File {file.name} failed to process")
    print("...all files ready")
    print()

# ------ Model Initialization (run once on startup) ------

# Create the model generation config
generation_config = {
    "temperature": 1,
    "top_p": 0.95,
    "top_k": 40,
    "max_output_tokens": 8192,
    "response_mime_type": "text/plain",
}

model = genai.GenerativeModel(
    model_name="gemini-2.0-flash-exp",
    generation_config=generation_config,
)

DF_P = pd.read_csv("samples.tsv", sep="\t")
ALL_PRODUCTS = DF_P["product"].unique()

# Upload and process the reference file (samples.tsv) at startup
samples_file = upload_to_gemini("samples.tsv", mime_type="text/tab-separated-values")
wait_for_files_active([samples_file])

# Predefine the user prompt that uses the samples file
# (We keep it ready for each new chat session)
STARTING_PROMPT = (
    "The uploaded file samples.tsv contains a list of products and the amount of "
    "plastic chemicals they contain. Always stick to using this source to extract information. "
    "The user will upload an image, you should try to classify what product it is "
    "and return the top 3 best matching products. If you cannot find it, please say "
    "NO_PRODUCT_FOUND, do not return irrelevant product names. The format of the response "
    "should just be a newline separated list of the product names and no other content."
)

# ------ Flask Route for Image Classification ------

@app.route("/classify", methods=["POST"])
def classify_image():
    """
    Expects a file upload under the 'image' field in the multipart/form-data.
    Returns a JSON response with the text classification from the Gemini model.
    """
    if 'image' not in request.files:
        return jsonify({"error": "No image file provided"}), 400

    # Save uploaded image to a temporary location
    image_file = request.files['image']
    temp_dir = tempfile.gettempdir()
    temp_path = os.path.join(temp_dir, f"uploaded_{int(time.time())}.png")
    image_file.save(temp_path)

    # Upload the image to Gemini and wait for it to be active
    gemini_image_file = upload_to_gemini(temp_path, mime_type="image/png")
    wait_for_files_active([gemini_image_file])

    # Start a new chat session with the samples file + instruction in the first user message
    chat_session = model.start_chat(
        history=[
            {
                "role": "user",
                "parts": [samples_file, STARTING_PROMPT],
            },
        ]
    )

    # Now send the image file as the next user message
    response = chat_session.send_message(\
        content={"role": "user", "parts": [gemini_image_file]}).text

    # Clean up the local temp file (optional, but good practice)
    if os.path.exists(temp_path):
        os.remove(temp_path)

    if len(response) > 0:
        top_k = response.split("\n")
        for possible_product in top_k:
            if possible_product in ALL_PRODUCTS:
                product_id = DF_P[DF_P["product"] == possible_product].iloc[0].product_id
                print(product_id)
                return jsonify({"response": str(product_id)})

    return jsonify({"response": "Product Not Found."})

# ------ Run the Flask app ------

if __name__ == "__main__":
    # For local testing. Adjust host/port as needed.
    app.run(host="0.0.0.0", port=5000, debug=True)
