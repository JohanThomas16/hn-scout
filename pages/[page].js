import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';

function timeAgo(timestamp) {
  const seconds = Math.floor(Date.now() / 1000) - timestamp;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function getDomain(url) {
  try { return new URL(url).hostname.replace('www.', ''); } catch { return ''; }
}

function SkeletonCard() {
  return <div className="animate-pulse bg-gray-700 h-80 rounded-lg mb-4"></div>;
}

function ScoreGauge({ score }) {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference - (score / 5) * circumference;
  return (
    <svg className="w-12 h-12" viewBox="0 0 50 50">
      <circle
        className="text-gray-600"
        strokeWidth="5"
        stroke="currentColor"
        fill="transparent"
        r={radius}
        cx="25"
        cy="25"
      />
      <circle
        className="text-green-400 transition-all duration-500"
        strokeWidth="5"
        strokeDasharray={circumference}
        strokeDashoffset={progress}
        strokeLinecap="round"
        fill="transparent"
        r={radius}
        cx="25"
        cy="25"
        style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
      />
      <text x="50%" y="50%" textAnchor="middle" dy=".3em" style={{ fill: 'white', fontSize: '13px' }}>
        {score.toFixed(2)}
      </text>
    </svg>
  );
}

export default function Page({ hits, currentPage, nbPages, error }) {
  const router = useRouter();
  const [hitsState, setHitsState] = useState(hits || []);
  const [loading, setLoading] = useState(false);
  const [nextPage, setNextPage] = useState(currentPage ? currentPage + 1 : 2);
  const loaderRef = useRef(null);
  const [domainFilter, setDomainFilter] = useState(router.query.domain || '');
  const [suggestions, setSuggestions] = useState([]);
  const [timeFilter, setTimeFilter] = useState(parseInt(router.query.time) || 30);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [savedPosts, setSavedPosts] = useState([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = JSON.parse(localStorage.getItem('savedPosts') || '[]');
      setSavedPosts(saved);
    }
  }, []);

  useEffect(() => {
    if (hits) {
      setHitsState(hits.map(hit => ({ ...hit, saved: savedPosts.includes(hit.objectID) })));
    }
  }, [hits, savedPosts]);

  useEffect(() => {
    if (domainFilter && hits) {
      const uniqueDomains = [...new Set(hits.map(hit => getDomain(hit.url)).filter(Boolean))];
      setSuggestions(
        uniqueDomains
          .filter(d => d.toLowerCase().includes(domainFilter.toLowerCase()))
          .slice(0, 5)
      );
    } else {
      setSuggestions([]);
    }
  }, [domainFilter, hits]);

  useEffect(() => {
    if (nextPage <= nbPages && !loading && hits) {
      const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          setLoading(true);
          let apiUrl = `https://hn.algolia.com/api/v1/search_by_date?tags=story&page=${nextPage - 1}&hitsPerPage=20&numericFilters=created_at_i>${Math.floor(Date.now() / 1000) - 86400 * timeFilter}`;
          if (router.query.domain) {
            apiUrl += `&restrictSearchableAttributes=url&query=${encodeURIComponent(router.query.domain)}`;
          }
          fetch(apiUrl)
            .then(res => res.ok ? res.json() : Promise.reject(new Error(`API error: ${res.status}`)))
            .then(data => {
              if (!data.hits || !Array.isArray(data.hits)) throw new Error('Invalid API response');
              const currentTime = Math.floor(Date.now() / 1000);
              const newHits = data.hits.map(hit => {
                const ageSeconds = currentTime - (hit.created_at_i || 0);
                const ageHours = ageSeconds / 3600;
                const engagement = (hit.points || 0) + 0.5 * (hit.num_comments || 0) + 1;
                const score = engagement / Math.pow(ageHours + 1, 1.2);
                return { ...hit, score: score > 0 ? score : 0.01 };
              }).sort((a, b) => b.score - a.score);
              setHitsState(prev => [...prev, ...newHits.map(hit => ({ ...hit, saved: savedPosts.includes(hit.objectID) }))]);
              setNextPage(prev => prev + 1);
              setLoading(false);
            })
            .catch(err => {
              console.error('Fetch error:', err.message);
              setLoading(false);
            });
        }
      }, { threshold: 0.1 });
      if (loaderRef.current) observer.observe(loaderRef.current);
      return () => observer.disconnect();
    }
  }, [nextPage, nbPages, loading, timeFilter, hits, savedPosts, router.query.domain]);

  const filteredHits = hitsState;

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4 text-red-400">
        Error: {error} <button onClick={() => router.reload()} className="underline">Retry</button>
      </div>
    );
  }

  if (!hitsState.length) {
    return <div className="min-h-screen bg-gray-900 text-white p-4 text-gray-300">No results found.</div>;
  }

  const toggleSave = (e, objectID) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (typeof window !== 'undefined') {
      let savedPostsArray = JSON.parse(localStorage.getItem('savedPosts') || '[]');
      if (savedPostsArray.includes(objectID)) {
        savedPostsArray = savedPostsArray.filter(id => id !== objectID);
      } else {
        savedPostsArray.push(objectID);
      }
      localStorage.setItem('savedPosts', JSON.stringify(savedPostsArray));
      setSavedPosts(savedPostsArray);
      setHitsState(hitsState.map(hit => hit.objectID === objectID ? { ...hit, saved: !hit.saved } : hit));
    }
  };

  const handleCardClick = (objectID) => {
    router.push(`/item/${objectID}`);
  };

  const handleTimeFilterChange = (newTimeFilter) => {
    setTimeFilter(newTimeFilter);
    const domainParam = router.query.domain ? `&domain=${encodeURIComponent(router.query.domain)}` : '';
    router.push(`/1?time=${newTimeFilter}${domainParam}`);
  };

  const handleDomainSubmit = (e) => {
    e.preventDefault();
    if (domainFilter.trim()) { // Changed: Only navigate if non-empty
      const domainParam = `&domain=${encodeURIComponent(domainFilter)}`;
      router.push(`/1?time=${timeFilter}${domainParam}`);
    }
  };

  // New: Handle clearing the input
  const handleDomainChange = (e) => {
    const newValue = e.target.value;
    setDomainFilter(newValue);
    if (!newValue.trim() && router.query.domain) {
      router.push(`/1?time=${timeFilter}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={`fixed top-4 left-4 z-20 bg-blue-600 p-2 rounded-lg hover:bg-blue-700 transition-all duration-300 ${
          sidebarOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        aria-label="Toggle saved posts"
      >
        📌
      </button>

      <aside className={`fixed top-0 left-0 h-full w-64 bg-gray-800 p-4 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 z-10 overflow-y-auto`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl">Saved Posts</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-gray-400 hover:text-white text-2xl"
            aria-label="Close sidebar"
          >
            ×
          </button>
        </div>
        {savedPosts.length ? (
          <ul className="space-y-2">
            {hitsState.filter(hit => savedPosts.includes(hit.objectID)).map(hit => (
              <li key={hit.objectID} className="p-2 bg-gray-700 rounded">
                <Link href={`/item/${hit.objectID}`} className="hover:underline text-blue-400">
                  {hit.title}
                </Link>
              </li>
            ))}
          </ul>
        ) : <p className="text-gray-400">No saved posts.</p>}
      </aside>
      
      <div className="max-w-4xl mx-auto p-4 pt-12 relative">
        <h1 className="text-3xl font-bold mb-6 text-green-400">
          HN SCOUT
        </h1>
        
        <div className="mb-6">
          <form onSubmit={handleDomainSubmit}>
            <div className="flex">
              <input
                type="text"
                value={domainFilter}
                onChange={handleDomainChange} // Changed: Use new handler
                placeholder="Filter by domain (e.g., medium.com)"
                className="w-full p-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                aria-label="Filter by domain"
              />
              <button type="submit" className="ml-2 px-4 py-2 bg-green-600 rounded-lg hover:bg-green-700">
                Apply
              </button>
            </div>
          </form>
          {suggestions.length > 0 && (
            <ul className="mt-1 bg-gray-800 border border-gray-700 rounded-lg">
              {suggestions.map((sug, i) => (
                <li
                  key={i}
                  onClick={(e) => {
                    setDomainFilter(sug);
                    setSuggestions([]);
                    // Auto-submit on suggestion click
                   const form = e.target.closest('form');
            if (form) form.dispatchEvent(new Event('submit', { cancelable: true }));
          }}
                  className="p-2 hover:bg-gray-700 cursor-pointer"
                >
                  {sug}
                </li>
              ))}
            </ul>
          )}
        </div>
        
        <div className="mb-6 flex items-center">
          <label className="mr-4 text-gray-300">Time Filter:</label>
          <input
            type="range"
            min="1"
            max="30"
            value={timeFilter}
            onChange={(e) => handleTimeFilterChange(parseInt(e.target.value))}
            className="w-32"
          />
          <span className="ml-2 text-gray-300">{timeFilter}d</span>
        </div>
        
        {router.query.domain && (
          <div className="mb-4 text-gray-400">
            Showing results for "{router.query.domain}"
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredHits.length > 0 ? (
            filteredHits.map((hit) => (
              <div 
                key={hit.objectID} 
                className="relative bg-gray-800 p-4 rounded-lg shadow-lg hover:shadow-xl transition-shadow cursor-pointer hover:bg-gray-750 flex flex-col h-80"
                onClick={() => handleCardClick(hit.objectID)}
              >
                <h3 className="text-xl font-semibold text-blue-400 hover:underline mb-2 line-clamp-3">
                  {hit.title}
                </h3>
                
                <div className="text-sm text-gray-400 mt-2 mb-4 flex-grow">
                  <div className="mb-2">by {hit.author}</div>
                  <div className="mb-2">{hit.points} points | {hit.num_comments} comments</div>
                  <div className="mb-2">{timeAgo(hit.created_at_i)}</div>
                  {hit.url && <div className="truncate">{getDomain(hit.url)}</div>}
                </div>
                
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-700">
                  <ScoreGauge score={hit.score} />
                  <button 
                    onClick={(e) => toggleSave(e, hit.objectID)} 
                    className="px-3 py-1 bg-yellow-600 rounded-lg hover:bg-yellow-700 transition-colors"
                  >
                    {hit.saved ? 'Unsave' : 'Save'}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center text-gray-400 py-8">
              No posts found{router.query.domain ? ` matching "${router.query.domain}"` : ''}.
            </div>
          )}
        </div>
        
        {nextPage <= nbPages && (
          <div ref={loaderRef} className="text-center py-4 text-gray-400">
            {loading ? <SkeletonCard /> : 'Loading more...'}
          </div>
        )}
        
        {nextPage > nbPages && (
          <div className="text-center py-8 text-gray-500">
             No more posts to load.
          </div>
        )}
      </div>
    </div>
  );
}

export async function getServerSideProps({ params, query, res }) {
  const pageParam = params?.page;
  
  if (pageParam === 'item' || isNaN(parseInt(pageParam))) {
    return { notFound: true };
  }

  let page = parseInt(pageParam);
  if (page < 1) {
    if (res) res.statusCode = 404;
    return { props: { hits: [], currentPage: 1, nbPages: 1, error: 'Invalid page number' } };
  }

  try {
    const timeFilter = parseInt(query.time) || 30;
    let apiUrl = `https://hn.algolia.com/api/v1/search_by_date?tags=story&page=${page - 1}&hitsPerPage=20&numericFilters=created_at_i>${Math.floor(Date.now() / 1000) - 86400 * timeFilter}`;
    if (query.domain) {
      apiUrl += `&restrictSearchableAttributes=url&query=${encodeURIComponent(query.domain)}`;
    }
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    if (!data || !data.hits || !Array.isArray(data.hits)) {
      throw new Error('Invalid data structure from API');
    }

    const nbPages = data.nbPages || 1;
    if (page > nbPages) {
      if (res) res.statusCode = 404;
      return { props: { hits: [], currentPage: page, nbPages, error: 'Page exceeds available range' } };
    }

    const currentTime = Math.floor(Date.now() / 1000);
    let scoredHits = data.hits.map((hit) => {
      const ageSeconds = currentTime - (hit.created_at_i || 0);
      const ageHours = ageSeconds / 3600;
      const engagement = (hit.points || 0) + 0.5 * (hit.num_comments || 0) + 1;
      const score = engagement / Math.pow(ageHours + 1, 1.2);
      return { ...hit, score: score > 0 ? score : 0.01 };
    }).sort((a, b) => b.score - a.score);

    if (scoredHits.length < 20) {
      while (scoredHits.length < 20) {
        scoredHits.push({ objectID: `placeholder-${scoredHits.length}`, title: 'Loading...', score: 0, saved: false });
      }
    }

    return { props: { hits: scoredHits, currentPage: page, nbPages, error: null } };
  } catch (err) {
    console.error('Server-side error:', err.message);
    if (res) res.statusCode = 500;
    return { props: { hits: [], currentPage: page, nbPages: 1, error: err.message } };
  }
}