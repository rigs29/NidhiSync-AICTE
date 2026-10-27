import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { fetchDocumentBlob } from '../../services/api';
import { FileText, Download, ExternalLink, AlertCircle, RefreshCw, Loader2, HardDrive } from 'lucide-react';
import { DocumentRecord } from '../../types';

interface DocumentViewerModalProps {
  document: DocumentRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  document,
  isOpen,
  onClose,
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;

    const loadDocument = async () => {
      if (!isOpen || !document) return;

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const key = document.storage_key || document.original_filename;
        const blob = await fetchDocumentBlob(key, document.download_url);
        if (active) {
          createdUrl = URL.createObjectURL(blob);
          setBlobUrl(createdUrl);
        }
      } catch (err: any) {
        if (active) {
          setErrorMessage(err.message || 'Unable to retrieve document from storage.');
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    loadDocument();

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
      setBlobUrl(null);
    };
  }, [isOpen, document]);

  if (!document) return null;

  const isImage = document.file_type.includes('image') || /\.(jpg|jpeg|png)$/i.test(document.original_filename);

  const handleOpenInTab = () => {
    if (!blobUrl) return;
    window.open(blobUrl, '_blank');
  };

  const handleDownload = () => {
    if (!blobUrl) return;
    const a = window.document.createElement('a');
    a.href = blobUrl;
    a.download = document.original_filename;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Document: ${document.original_filename}`}
      subtitle={`Storage: ${document.storage_provider || 'LOCAL'} • Size: ${(document.file_size / 1024).toFixed(1)} KB`}
      maxWidth="5xl"
    >
      <div className="space-y-4 font-sans">
        
        {/* Document Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-100 p-3.5 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-gov-navy-900 text-white shrink-0">
              <FileText className="h-4 w-4" />
            </div>
            <div className="min-w-0 truncate">
              <span className="font-bold text-xs text-slate-900 block truncate">
                {document.original_filename}
              </span>
              <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                <span className="inline-flex items-center gap-1">
                  <HardDrive className="h-3 w-3" />
                  <span>Storage: {document.storage_provider || 'LOCAL'}</span>
                </span>
                <span>•</span>
                <span>{(document.file_size / 1024).toFixed(1)} KB</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleOpenInTab}
              disabled={isLoading || !blobUrl}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-2xs"
            >
              <ExternalLink className="h-3.5 w-3.5 text-gov-teal-600" />
              <span>Open in Tab</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={isLoading || !blobUrl}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gov-navy-900 text-white hover:bg-gov-navy-800 disabled:opacity-50 transition-colors shadow-2xs"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download</span>
            </button>
          </div>
        </div>

        {/* Error State */}
        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Document Access Error:</span>
                <span>{errorMessage}</span>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="h-[60vh] w-full rounded-xl border border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-8 w-8 text-gov-teal-600 animate-spin" />
            <span className="text-xs font-semibold text-slate-600">
              Streaming secure document stream...
            </span>
          </div>
        )}

        {/* Document Preview Frame */}
        {!isLoading && !errorMessage && blobUrl && (
          <div className="h-[65vh] w-full rounded-xl border border-slate-200 overflow-hidden bg-slate-900 flex items-center justify-center shadow-inner">
            {isImage ? (
              <img
                src={blobUrl}
                alt="FDR Instrument Scanned Document"
                className="max-h-full max-w-full object-contain p-2"
              />
            ) : (
              <iframe
                src={`${blobUrl}#toolbar=0`}
                title="PDF Instrument Preview"
                className="w-full h-full border-0 bg-white"
              />
            )}
          </div>
        )}

      </div>
    </Modal>
  );
};
