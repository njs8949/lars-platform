import React from 'react';
import { ExternalLink, Globe, Calendar } from 'lucide-react';

interface SourceItem {
  title: string;
  url: string;
  snippet: string;
  source: string;
  date?: string;
}

interface SourceCitationsProps {
  sources: SourceItem[];
  language: string;
}

const SourceCitations: React.FC<SourceCitationsProps> = ({ sources, language }) => {
  if (!sources || sources.length === 0) {
    return null;
  }

  // Fallback 결과 필터링 (Google 검색 제안, Wikipedia 검색 제안 제외)
  const filteredSources = sources.filter(source => {
    const title = source.title || '';
    const isFallback =
      title.includes('검색 결과') ||
      title.includes('Search results') ||
      (title.includes('Google') && title.includes('검색')) ||
      (title.includes('Wikipedia') && title.includes('검색'));
    return !isFallback;
  });

  // 필터링 후 결과가 없으면 표시하지 않음
  if (filteredSources.length === 0) {
    return null;
  }

  return (
    <div className="source-citations-container">
      <div className="source-citations-header">
        <span className="source-icon">🌐</span>
        <span className="source-title">
          {language === 'ko' ? '정보 출처' : 'Sources'}
        </span>
      </div>

      <div className="source-citations-list">
        {filteredSources.map((source, idx) => (
          <div key={idx} className="source-citation-item">
            <div className="source-item-number">{idx + 1}</div>

            <div className="source-item-main">
              <div className="source-item-title">
                {source.title}
              </div>

              <div className="source-item-meta-row">
                <span className="source-meta-badge">
                  <Globe size={12} />
                  {source.source}
                </span>
                {source.date && (
                  <span className="source-meta-badge">
                    <Calendar size={12} />
                    {source.date}
                  </span>
                )}
              </div>

              <div className="source-item-snippet">
                {source.snippet}
              </div>

              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="source-item-url"
              >
                <ExternalLink size={11} />
                {source.url.length > 80
                  ? source.url.substring(0, 80) + '...'
                  : source.url}
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SourceCitations;
