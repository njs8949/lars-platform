import React, { useState } from 'react';
import { Search, X, ExternalLink, Calendar, Globe } from 'lucide-react';

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  date?: string;
}

interface WebSearchProps {
  onClose: () => void;
  language: string;
  onSelectResult?: (result: SearchResult) => void;
}

const WebSearch: React.FC<WebSearchProps> = ({ onClose, language, onSelectResult }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setError('');
    setResults([]);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';
      const response = await fetch(`${apiUrl}/search/web?query=${encodeURIComponent(searchQuery)}&limit=10`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, limit: 10 })
      });

      if (!response.ok) {
        throw new Error('검색 실패');
      }

      const data = await response.json();
      setResults(data.results || []);

      if (data.results.length === 0) {
        setError(language === 'ko' ? '검색 결과가 없습니다.' : 'No results found.');
      }
    } catch (err) {
      setError(language === 'ko' ? '검색 중 오류가 발생했습니다.' : 'Error during search.');
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="web-search-modal" onClick={onClose}>
      <div className="web-search-content" onClick={(e) => e.stopPropagation()}>
        <div className="web-search-header">
          <div className="web-search-title-area">
            <Search size={24} color="#60a5fa" />
            <h2>{language === 'ko' ? '웹 검색' : 'Web Search'}</h2>
          </div>
          <button className="web-search-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form className="web-search-form" onSubmit={handleSearch}>
          <div className="web-search-input-wrapper">
            <input
              type="text"
              className="web-search-input"
              placeholder={language === 'ko' ? '검색어를 입력하세요...' : 'Enter search query...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            <button
              type="submit"
              className="web-search-btn"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="spinner-small" />
              ) : (
                <Search size={20} />
              )}
            </button>
          </div>
        </form>

        {error && (
          <div className="web-search-error">
            <p>{error}</p>
          </div>
        )}

        <div className="web-search-results">
          {results.length > 0 && (
            <>
              <div className="web-search-count">
                {language === 'ko'
                  ? `${results.length}개의 결과를 찾았습니다`
                  : `Found ${results.length} results`}
              </div>

              <div className="web-search-list">
                {results.map((result, idx) => (
                  <div
                    key={idx}
                    className="web-search-item"
                    onClick={() => onSelectResult?.(result)}
                  >
                    <div className="web-search-item-title">
                      <a href={result.url} target="_blank" rel="noopener noreferrer">
                        {result.title}
                      </a>
                    </div>

                    <div className="web-search-item-url">
                      <Globe size={14} />
                      <span>{result.source}</span>
                    </div>

                    <div className="web-search-item-snippet">
                      {result.snippet}
                    </div>

                    {result.date && (
                      <div className="web-search-item-date">
                        <Calendar size={12} />
                        <span>{result.date}</span>
                      </div>
                    )}

                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="web-search-item-link"
                    >
                      <ExternalLink size={16} />
                      {language === 'ko' ? '전체 보기' : 'View Full'}
                    </a>
                  </div>
                ))}
              </div>
            </>
          )}

          {!isLoading && results.length === 0 && !error && (
            <div className="web-search-empty">
              <Search size={48} opacity={0.3} />
              <p>{language === 'ko' ? '검색 결과가 여기에 표시됩니다' : 'Search results will appear here'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WebSearch;
