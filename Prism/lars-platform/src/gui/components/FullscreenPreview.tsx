import React from 'react';
import { X } from 'lucide-react';
import { RealisticTemplatePreview } from './RealisticTemplatePreview';
import '../styles/FullscreenPreview.css';

interface FullscreenPreviewProps {
  templateId: string;
  templateType: 'website' | 'presentation' | 'document';
  templateName: string;
  onClose: () => void;
}

export const FullscreenPreview: React.FC<FullscreenPreviewProps> = ({
  templateId,
  templateType,
  templateName,
  onClose,
}) => {
  return (
    <div className="fullscreen-preview-overlay">
      <div className="fullscreen-preview-container">
        {/* Header */}
        <div className="preview-header">
          <h2>📱 {templateName} Preview</h2>
          <button className="close-button" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="preview-content">
          <div className="preview-frame">
            {templateType === 'website' && (
              <div className="website-preview-wrapper">
                <RealisticTemplatePreview type="website" templateName={templateId} />
              </div>
            )}
            {templateType === 'presentation' && (
              <div className="presentation-preview-wrapper">
                <RealisticTemplatePreview type="presentation" templateName={templateId} />
              </div>
            )}
            {templateType === 'document' && (
              <div className="document-preview-wrapper">
                <RealisticTemplatePreview type="document" templateName={templateId} />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="preview-footer">
          <p>💡 Click the button below to export this template</p>
          <button className="btn-export-from-preview" onClick={onClose}>
            ← Back to Customization
          </button>
        </div>
      </div>
    </div>
  );
};
