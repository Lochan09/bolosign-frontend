import React, { useState, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import axios from 'axios';
import SignatureCanvas from 'react-signature-canvas';
import './App.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// PDF.js worker configuration
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// API base URL - uses environment variable for production, fallback to localhost for development
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function App() {
  // Document state
  const [pdfFile, setPdfFile] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [documentData, setDocumentData] = useState(null);

  // Signature state
  const [signatureField, setSignatureField] = useState(null);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [applyToAllPages, setApplyToAllPages] = useState(false);

  // Review state
  const [reviewMode, setReviewMode] = useState(false);
  const [signedPdfUrl, setSignedPdfUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Refs
  const signatureRef = useRef(null);
  const pdfContainerRef = useRef(null);

  // Handle PDF file upload
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsLoading(true);
    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Data = event.target.result.split(',')[1]; // Remove data:application/pdf;base64, prefix
        
        const response = await axios.post(`${API_URL}/api/pdf/upload`, {
          pdfData: base64Data,
          filename: file.name
        });

        setDocumentData(response.data);
        setPdfFile(URL.createObjectURL(file));
        setIsLoading(false);
      };
      reader.onerror = () => {
        alert('Failed to read PDF file.');
        setIsLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload PDF. Please try again.');
      setIsLoading(false);
    }
  };

  // PDF load handlers
  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  const onPageLoadSuccess = () => {
    // Page loaded successfully
  };

  // Handle click on PDF to place signature field
  const handlePdfClick = (e) => {
    if (reviewMode || signedPdfUrl) return;

    const canvas = document.querySelector('.react-pdf__Page__canvas');
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setSignatureField({
      x,
      y,
      width: 200,
      height: 60,
      page: currentPage
    });
  };

  // Save signature and apply to PDF
  const handleSaveSignature = async () => {
    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      alert('Please draw your signature first');
      return;
    }

    if (!signatureField) {
      alert('Please click on the PDF to place your signature');
      return;
    }

    const signatureDataUrl = signatureRef.current.toDataURL();

    setIsLoading(true);
    try {
      // Determine which pages to sign
      const pagesArray = applyToAllPages
        ? Array.from({ length: numPages }, (_, i) => i + 1)
        : [signatureField.page];

      // Get rendered canvas dimensions for coordinate normalization
      const pdfCanvas = document.querySelector('.react-pdf__Page__canvas');
      if (!pdfCanvas) {
        alert('PDF canvas not found');
        return;
      }

      const canvasRect = pdfCanvas.getBoundingClientRect();
      const renderedWidth = canvasRect.width;
      const renderedHeight = canvasRect.height;

      // Normalize coordinates to 0-1 range for backend processing
      const normalizedCoordinates = {
        x: signatureField.x / renderedWidth,
        y: signatureField.y / renderedHeight,
        width: signatureField.width / renderedWidth,
        height: signatureField.height / renderedHeight
      };

      const response = await axios.post(`${API_URL}/api/pdf/sign`, {
        pdfId: documentData.pdfId,
        signatureImage: signatureDataUrl,
        coordinates: normalizedCoordinates,
        pages: pagesArray
      });

      if (response.data.success) {
        setShowSignatureModal(false);
        setReviewMode(true);
        // Cache-bust the signed PDF URL
        setSignedPdfUrl(`${API_URL}/api/pdf/download/${documentData.pdfId}?t=${Date.now()}`);
        setCurrentPage(1);
      }
    } catch (error) {
      console.error('Signing failed:', error);
      alert('Failed to sign PDF. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Download the signed PDF
  const downloadSignedPDF = () => {
    if (signedPdfUrl) {
      window.open(signedPdfUrl, '_blank');
    }
  };

  // Reset to start a new document
  const resetProcess = () => {
    setPdfFile(null);
    setNumPages(null);
    setCurrentPage(1);
    setDocumentData(null);
    setSignatureField(null);
    setShowSignatureModal(false);
    setApplyToAllPages(false);
    setReviewMode(false);
    setSignedPdfUrl(null);
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <h1> BoloSign</h1>
        <p className="tagline">Simple & Secure Document Signing</p>
      </header>

      {/* Upload Section */}
      {!pdfFile ? (
        <section className="upload-section">
          <div className="upload-box">
            <div className="upload-icon"></div>
            <h2>Upload Your Document</h2>
            <p>Select a PDF file to get started</p>
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileUpload}
              className="file-input"
              id="pdf-upload"
              disabled={isLoading}
            />
            <label htmlFor="pdf-upload" className="upload-label">
              {isLoading ? 'Uploading...' : 'Choose PDF File'}
            </label>
          </div>
        </section>
      ) : (
        /* PDF Workspace */
        <section className="pdf-workspace">
          <div className="pdf-container" ref={pdfContainerRef}>
            <Document
              key={reviewMode ? `signed-${documentData?.pdfId}` : `orig-${documentData?.pdfId}`}
              file={reviewMode ? signedPdfUrl : pdfFile}
              onLoadSuccess={onDocumentLoadSuccess}
              className="pdf-document"
              loading={<div className="loading">Loading PDF...</div>}
            >
              <div className="pdf-page-wrapper" onClick={handlePdfClick}>
                <Page
                  pageNumber={currentPage}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  className="pdf-page"
                  onLoadSuccess={onPageLoadSuccess}
                />

                {/* Signature Field Overlay */}
                {signatureField && signatureField.page === currentPage && !reviewMode && (
                  <div
                    className="signature-field"
                    style={{
                      left: `${signatureField.x}px`,
                      top: `${signatureField.y}px`,
                      width: `${signatureField.width}px`,
                      height: `${signatureField.height}px`
                    }}
                  >
                    {applyToAllPages ? ' All Pages' : ' Sign Here'}
                  </div>
                )}
              </div>
            </Document>

            {/* Page Navigation */}
            {numPages && (
              <nav className="page-controls">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage <= 1}
                  className="page-btn"
                >
                   Previous
                </button>
                <span className="page-info">
                  Page {currentPage} of {numPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(numPages, currentPage + 1))}
                  disabled={currentPage >= numPages}
                  className="page-btn"
                >
                  Next 
                </button>
              </nav>
            )}
          </div>

          {/* Controls Panel */}
          <aside className="controls-panel">
            {!reviewMode && !signedPdfUrl ? (
              <>
                <div className="control-section">
                  <h3> Place Signature</h3>
                  <p className="hint">Click anywhere on the PDF to place your signature</p>

                  {signatureField && (
                    <div className="field-info">
                       Signature placed on page {signatureField.page}
                    </div>
                  )}
                </div>

                <div className="control-section">
                  <h3> Options</h3>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={applyToAllPages}
                      onChange={(e) => setApplyToAllPages(e.target.checked)}
                    />
                    Apply signature to all pages
                  </label>
                </div>

                <button
                  onClick={() => setShowSignatureModal(true)}
                  disabled={!signatureField || isLoading}
                  className="btn-primary"
                >
                  {isLoading ? 'Processing...' : ' Sign Document'}
                </button>
              </>
            ) : (
              <div className="review-section">
                <div className="success-icon"></div>
                <h3>Document Signed!</h3>
                <p>Your document has been signed successfully.</p>
                <div className="review-actions">
                  <button onClick={downloadSignedPDF} className="btn-download">
                     Download PDF
                  </button>
                  <button onClick={resetProcess} className="btn-secondary">
                     Sign Another
                  </button>
                </div>
              </div>
            )}
          </aside>
        </section>
      )}

      {/* Signature Modal */}
      {showSignatureModal && (
        <div className="modal-overlay" onClick={() => setShowSignatureModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2> Draw Your Signature</h2>
            <p className="modal-hint">Use your mouse or touchpad to sign below</p>
            <div className="signature-canvas-wrapper">
              <SignatureCanvas
                ref={signatureRef}
                canvasProps={{
                  className: 'signature-canvas'
                }}
              />
            </div>
            <div className="modal-actions">
              <button
                onClick={() => signatureRef.current?.clear()}
                className="btn-secondary"
              >
                Clear
              </button>
              <button
                onClick={handleSaveSignature}
                className="btn-primary"
                disabled={isLoading}
              >
                {isLoading ? 'Signing...' : 'Apply Signature'}
              </button>
              <button
                onClick={() => setShowSignatureModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
