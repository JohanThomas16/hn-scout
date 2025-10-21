import Link from 'next/link';
import { useState, useEffect } from 'react';

// Helper: Flatten nested comments recursively
function flattenComments(item, acc = []) {
  if (item.children && item.children.length) {
    item.children.forEach((child) => {
      if (child.text) {
        acc.push({ author: child.author, text: child.text, created_at: child.created_at });
      }
      flattenComments(child, acc);
    });
  }
  return acc;
}

// Helper: Format time ago
function timeAgo(isoString) {
  const timestamp = Math.floor(new Date(isoString).getTime() / 1000);
  const seconds = Math.floor(Date.now() / 1000) - timestamp;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function Item({ item, comments, error }) {
  const [isSaved, setIsSaved] = useState(false);

  // Load saved state from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && item) {
      const savedPosts = JSON.parse(localStorage.getItem('savedPosts') || '[]');
      setIsSaved(savedPosts.includes(item.id));
    }
  }, [item]);

  if (error) {
    return (
      <div className="p-4 text-red-400">
        Error: {error} <Link href="/1" className="underline">Back</Link>
      </div>
    );
  }

  if (!item) {
    return <div className="p-4 text-gray-300">Item not found.</div>;
  }

  const domain = item.url ? new URL(item.url).hostname.replace('www.', '') : '';

  const toggleSave = () => {
    if (typeof window !== 'undefined') {
      let savedPosts = JSON.parse(localStorage.getItem('savedPosts') || '[]');
      if (isSaved) {
        savedPosts = savedPosts.filter(id => id !== item.id);
      } else {
        savedPosts.push(item.id);
      }
      localStorage.setItem('savedPosts', JSON.stringify(savedPosts));
      setIsSaved(!isSaved);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-2xl mx-auto p-4 pt-12">
        <Link href="/1" className="text-blue-400 hover:underline mb-4 inline-block">&lt; Back to Haven</Link>
        <h1 className="text-3xl font-bold mb-4 text-green-400">{item.title}</h1>
        <div className="text-sm text-gray-400 mb-4">
          by {item.author} | {item.points} points | {timeAgo(item.created_at)}
          {domain && ` | ${domain}`}
        </div>
        {item.url && <a href={item.url} target="_blank" rel="noopener" className="text-blue-400 hover:underline">Original link</a>}
        <a href={`https://news.ycombinator.com/item?id=${item.id}`} target="_blank" rel="noopener" className="ml-4 text-blue-400 hover:underline">Full HN discussion</a>
        <button onClick={toggleSave} className="ml-4 px-3 py-1 bg-yellow-600 rounded-lg hover:bg-yellow-700">
          {isSaved ? 'Unsave' : 'Save'}
        </button>

        <h2 className="text-2xl font-semibold mt-8 mb-4 text-green-400">Latest 5 Comments</h2>
        {comments.length ? (
          <ul className="space-y-4">
            {comments.slice(0, 5).map((c, i) => (
              <li key={i} className="bg-gray-800 p-4 rounded-lg border-l-4 border-green-500">
                <div className="text-sm font-semibold text-gray-300">{c.author} ({timeAgo(c.created_at)})</div>
                <div dangerouslySetInnerHTML={{ __html: c.text }} className="text-gray-200 mt-2" />
              </li>
            ))}
          </ul>
        ) : <div className="text-gray-500">No comments yet.</div>}
      </div>
    </div>
  );
}

export async function getServerSideProps({ params }) {
  try {
    const res = await fetch(`https://hn.algolia.com/api/v1/items/${params.id}`);
    if (!res.ok) throw new Error('API error');
    const item = await res.json();

    const allComments = flattenComments(item);
    const latestComments = allComments
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);

    return { props: { item, comments: latestComments, error: null } };
  } catch (err) {
    return { props: { item: null, comments: [], error: err.message } };
  }
}
