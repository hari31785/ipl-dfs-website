'use client';

import { useState } from 'react';

export default function AutoCloseTestPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState('');

  const handleAutoClose = async () => {
    setIsProcessing(true);
    setError('');
    setResults(null);

    try {
      const response = await fetch('/api/admin/contests/auto-close-expired', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setResults(data);
      } else {
        setError(data.message || 'Failed to process auto-close');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-xl p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Auto-Close Expired Contests Test
          </h1>
          
          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              This tool manually triggers the auto-close process that normally runs automatically 
              when users access various pages. It will:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>Find all contests with expired signup deadlines</li>
              <li>Close signups automatically</li>
              <li>Generate head-to-head matchups</li>
              <li>Add admin user if needed to balance odd signups</li>
              <li>Update contest status to DRAFT_PHASE</li>
            </ul>
          </div>

          <button
            onClick={handleAutoClose}
            disabled={isProcessing}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              isProcessing
                ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isProcessing ? 'Processing...' : 'Run Auto-Close Process'}
          </button>

          {error && (
            <div className="mt-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <strong>Error:</strong> {error}
            </div>
          )}

          {results && (
            <div className="mt-6 space-y-4">
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                <strong>Success:</strong> {results.message}
              </div>

              {results.results && results.results.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">
                      Processed Contests ({results.processed})
                    </h3>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {results.results.map((result: any, index: number) => (
                      <div key={index} className="px-4 py-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium text-gray-900">
                              Contest ID: {result.contestId}
                            </div>
                            <div className="text-sm text-gray-600">
                              Type: {result.contestType} | 
                              Signups: {result.signups} | 
                              Status: {result.status} |
                              Matchups Generated: {result.matchupsGenerated}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {result.message}
                            </div>
                          </div>
                          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            result.status === 'draft_phase' 
                              ? 'bg-green-100 text-green-800'
                              : result.status === 'closed'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {result.status.replace('_', ' ').toUpperCase()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!results.results || results.results.length === 0) && (
                <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
                  No expired contests found to process.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}