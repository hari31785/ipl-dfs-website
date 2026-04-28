'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string | null;
}

interface Tournament {
  id: string;
  name: string;
  status: string;
}

interface Settlement {
  id: string;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  adminUsername: string;
  notes: string | null;
  createdAt: string;
}

interface UserBalance {
  id: string;
  balance: number;
  netBalance: number;
  user: User;
  settlements: Settlement[];
  lastSettlement: Settlement | null;
  totalSettled: number;
}

interface TournamentGroup {
  tournament: Tournament;
  winners: UserBalance[];
  losers: UserBalance[];
  breakEven: UserBalance[];
  totalWinnings: number;
  totalLosses: number;
  netBalance: number;
}

export default function VCManagementPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tournamentGroups, setTournamentGroups] = useState<Record<string, TournamentGroup>>({});
  const [selectedTournament, setSelectedTournament] = useState<string>('all');
  const [settlingUser, setSettlingUser] = useState<string | null>(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleNotes, setSettleNotes] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [settlementHistory, setSettlementHistory] = useState<any[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'winners' | 'losers' | 'breakeven'>('all');

  useEffect(() => {
    // Get admin username from localStorage
    const storedAdmin = localStorage.getItem('currentAdmin');
    if (storedAdmin) {
      setAdminUsername(JSON.parse(storedAdmin).username);
    } else {
      router.push('/admin/login');
      return;
    }
    
    fetchBalances();
  }, []);

  const fetchBalances = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/vc-balances');
      const result = await response.json();
      
      if (result.success) {
        setTournamentGroups(result.data);
      }
    } catch (error) {
      console.error('Error fetching balances:', error);
      alert('Failed to fetch VC balances');
    } finally {
      setLoading(false);
    }
  };

  const fetchSettlementHistory = async () => {
    try {
      const response = await fetch('/api/admin/settlement-history');
      const result = await response.json();
      
      if (result.success) {
        setSettlementHistory(result.settlements);
      }
    } catch (error) {
      console.error('Error fetching settlement history:', error);
    }
  };

  const handleSettle = async (balance: UserBalance, type: 'ENCASH' | 'REFILL') => {
    if (!settleAmount || parseFloat(settleAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const amountVC = parseFloat(settleAmount);
    const maxAmountVC = type === 'ENCASH' ? balance.netBalance / 100 : Math.abs(balance.netBalance) / 100;

    if (amountVC > maxAmountVC) {
      alert(`Cannot ${type === 'ENCASH' ? 'encash' : 'refill'} more than V̶₵${maxAmountVC.toFixed(2)}`);
      return;
    }

    if (!confirm(`Confirm ${type === 'ENCASH' ? 'encash' : 'refill'} V̶₵${amountVC.toFixed(2)} for ${balance.user.name}?`)) {
      return;
    }

    // Convert VC input to coins for the API (1 V̶₵ = 100 coins)
    const amountCoins = Math.round(amountVC * 100);

    try {
      const response = await fetch('/api/admin/vc-settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournamentBalanceId: balance.id,
          type,
          amount: amountCoins,
          adminUsername,
          notes: settleNotes || null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert(result.message);
        setSettlingUser(null);
        setSettleAmount('');
        setSettleNotes('');
        fetchBalances(); // Refresh data
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error settling:', error);
      alert('Failed to process settlement');
    }
  };

  const handlePrePay = async (balance: UserBalance) => {
    const input = prompt(`Pre Pay — Add V\u0336\u20b5 for ${balance.user.name} (@${balance.user.username})\n\nEnter amount in V\u0336\u20b5 to add:`);
    if (!input) return;
    const amountVC = parseFloat(input);
    if (isNaN(amountVC) || amountVC <= 0) { alert('Invalid amount'); return; }
    if (!confirm(`Add V\u0336\u20b5${amountVC.toFixed(2)} to ${balance.user.name}'s balance as a pre-payment?`)) return;
    const amountCoins = Math.round(amountVC * 100);
    try {
      const response = await fetch('/api/admin/vc-settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournamentBalanceId: balance.id,
          type: 'PREPAY',
          amount: amountCoins,
          adminUsername,
          notes: 'Pre-payment by admin',
        }),
      });
      const result = await response.json();
      if (result.success) { alert(result.message); fetchBalances(); }
      else alert(`Error: ${result.error}`);
    } catch { alert('Failed to process pre-payment'); }
  };

  const filteredGroups = selectedTournament === 'all' 
    ? tournamentGroups 
    : { [selectedTournament]: tournamentGroups[selectedTournament] };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-red-50 flex items-center justify-center">
        <div className="text-center text-gray-800 text-xl">Loading VC Management...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-red-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3 md:py-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="flex items-center gap-2 text-white hover:text-emerald-200 transition-colors"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="hidden sm:inline">Back to Dashboard</span>
              </button>
              <div className="text-white">
                <h1 className="text-lg md:text-2xl font-bold">💰 VC Settlement Management</h1>
                <p className="text-emerald-100 text-sm">Manage user coin balances and settlements</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowHistory(!showHistory);
                  if (!showHistory) fetchSettlementHistory();
                }}
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <span>{showHistory ? '📊' : '📜'}</span>
                <span className="hidden sm:inline">{showHistory ? 'Show Balances' : 'View History'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 md:py-8">
        {/* Tournament Filter */}
        {!showHistory && (
          <div className="bg-white rounded-xl shadow-md p-3 md:p-6 mb-4 md:mb-8 border border-gray-200">
            <label className="text-sm font-medium text-gray-700 mr-4">Filter by Tournament:</label>
            <select
              value={selectedTournament}
              onChange={(e) => setSelectedTournament(e.target.value)}
              className="bg-white text-gray-800 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="all">All Tournaments</option>
              {Object.entries(tournamentGroups).map(([id, group]) => (
                <option key={id} value={id}>
                  {group.tournament.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Settlement History View */}
        {showHistory && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-gray-200">
            <h2 className="text-xl md:text-3xl font-bold text-gray-800 mb-4 md:mb-6">📜 Settlement History</h2>
            {settlementHistory.length === 0 ? (
              <div className="text-gray-600 text-center py-8">No settlement history found</div>
            ) : (
              <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-x-auto">
                <table className="w-full text-gray-800 min-w-[700px]">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">User</th>
                      <th className="px-4 py-3 text-left">Tournament</th>
                      <th className="px-4 py-3 text-center">Type</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-right">Before</th>
                      <th className="px-4 py-3 text-right">After</th>
                      <th className="px-4 py-3 text-left">Admin</th>
                      <th className="px-4 py-3 text-left">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settlementHistory.map((settlement) => (
                      <tr key={settlement.id} className="border-t border-white/10">
                        <td className="px-4 py-3 text-sm">
                          {new Date(settlement.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold">{settlement.userName}</div>
                          <div className="text-sm text-gray-400">{settlement.username}</div>
                        </td>
                        <td className="px-4 py-3">{settlement.tournamentName}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            settlement.type === 'ENCASH' 
                              ? 'bg-green-500/20 text-green-400 border border-green-500' 
                              : 'bg-blue-500/20 text-blue-400 border border-blue-500'
                          }`}>
                            {settlement.type === 'ENCASH' ? '💰 ENCASH' : '💳 REFILL'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold">
                          V̶₵{(settlement.amount / 100).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm">
                          V̶₵{(settlement.balanceBefore / 100).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm">
                          V̶₵{(settlement.balanceAfter / 100).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm">{settlement.adminUsername}</td>
                        <td className="px-4 py-3 text-sm text-gray-400">
                          {settlement.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tournament Groups */}
        {!showHistory && Object.entries(filteredGroups).map(([tournamentId, group]) => (
          <div key={tournamentId} className="bg-white rounded-xl shadow-md p-6 mb-8 border border-gray-200">
            <h2 className="text-lg md:text-3xl font-bold text-gray-800 mb-3 md:mb-4">{group.tournament.name}</h2>

            {/* Summary */}
            <div className="grid grid-cols-4 gap-1.5 mb-4 md:gap-4 md:mb-6">
              <button
                onClick={() => setCategoryFilter(categoryFilter === 'winners' ? 'all' : 'winners')}
                className={`bg-green-50 border-2 rounded-lg p-2 md:p-4 text-center md:text-left hover:shadow-lg transition-all ${
                  categoryFilter === 'winners' ? 'border-green-950 ring-2 ring-green-800' : 'border-green-950'
                }`}
              >
                <div className="text-green-700 text-[9px] md:text-sm font-semibold">Winners</div>
                <div className="text-gray-800 text-xl md:text-2xl font-bold">{group.winners.length}</div>
                <div className="text-green-600 text-[8px] md:text-sm break-all leading-tight">+V̶₵{(group.totalWinnings / 100).toFixed(2)}</div>
              </button>
              <button
                onClick={() => setCategoryFilter(categoryFilter === 'losers' ? 'all' : 'losers')}
                className={`bg-red-50 border-2 rounded-lg p-2 md:p-4 text-center md:text-left hover:shadow-lg transition-all ${
                  categoryFilter === 'losers' ? 'border-red-950 ring-2 ring-red-800' : 'border-red-950'
                }`}
              >
                <div className="text-red-700 text-[9px] md:text-sm font-semibold">Losers</div>
                <div className="text-gray-800 text-xl md:text-2xl font-bold">{group.losers.length}</div>
                <div className="text-red-600 text-[8px] md:text-sm break-all leading-tight">-V̶₵{(group.totalLosses / 100).toFixed(2)}</div>
              </button>
              <button
                onClick={() => setCategoryFilter(categoryFilter === 'breakeven' ? 'all' : 'breakeven')}
                className={`bg-yellow-50 border-2 rounded-lg p-2 md:p-4 text-center md:text-left hover:shadow-lg transition-all ${
                  categoryFilter === 'breakeven' ? 'border-yellow-950 ring-2 ring-yellow-800' : 'border-yellow-950'
                }`}
              >
                <div className="text-yellow-700 text-[9px] md:text-sm font-semibold">Even</div>
                <div className="text-gray-800 text-xl md:text-2xl font-bold">{group.breakEven.length}</div>
                <div className="text-yellow-600 text-[8px] md:text-sm">V̶₵0.00</div>
              </button>
              <div className={`${group.netBalance >= 0 ? 'bg-green-50 border-green-950' : 'bg-red-50 border-red-950'} border-2 rounded-lg p-2 md:p-4 text-center md:text-left`}>
                <div className="text-gray-600 text-[9px] md:text-sm font-semibold">Net</div>
                <div className="text-gray-800 text-xs md:text-2xl font-bold break-all leading-tight">{group.netBalance > 0 ? '+' : ''}V̶₵{(group.netBalance / 100).toFixed(2)}</div>
              </div>
            </div>

            {/* Winners Table */}
            {group.winners.length > 0 && (categoryFilter === 'all' || categoryFilter === 'winners') && (
              <div className="mb-6">
                <h3 className="text-base md:text-2xl font-bold text-green-700 mb-2 md:mb-3">✅ Winners ({group.winners.length})</h3>
                {/* Desktop table */}
                <div className="hidden md:block bg-white rounded-lg overflow-x-auto border border-green-200">
                  <table className="w-full text-gray-800 min-w-[560px]">
                    <thead className="bg-green-100">
                      <tr>
                        <th className="px-4 py-3 text-left">User</th>
                        <th className="px-4 py-3 text-right">Balance</th>
                        <th className="px-4 py-3 text-right">Net Winnings</th>
                        <th className="px-4 py-3 text-right">Settled</th>
                        <th className="px-4 py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.winners.map((balance) => (
                        <tr key={balance.id} className="border-t border-gray-200">
                          <td className="px-4 py-3"><div className="font-semibold">{balance.user.name}</div><div className="text-sm text-gray-500">{balance.user.username}</div></td>
                          <td className="px-4 py-3 text-right font-mono">V̶₵{(balance.balance / 100).toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-mono text-green-600">+V̶₵{(balance.netBalance / 100).toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-mono">V̶₵{(balance.totalSettled / 100).toFixed(2)}</td>
                          <td className="px-4 py-3 text-center">
                            {settlingUser === balance.id ? (
                              <div className="flex gap-2 items-center justify-center">
                                <input type="number" placeholder="V̶₵ amount" value={settleAmount} onChange={(e) => setSettleAmount(e.target.value)} className="bg-white text-gray-800 border border-gray-300 rounded px-2 py-1 w-24" max={balance.netBalance / 100} step="0.01" />
                                <button onClick={() => handleSettle(balance, 'ENCASH')} className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-sm">Encash</button>
                                <button onClick={() => { setSettlingUser(null); setSettleAmount(''); setSettleNotes(''); }} className="bg-gray-500 hover:bg-gray-400 text-white px-3 py-1 rounded text-sm">Cancel</button>
                              </div>
                            ) : (
                              <button onClick={() => setSettlingUser(balance.id)} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded">💰 Encash</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Mobile cards */}
                <div className="md:hidden bg-white rounded-lg border border-green-200 divide-y divide-gray-100">
                  {group.winners.map((balance) => (
                    <div key={balance.id} className="px-3 py-2">
                      {settlingUser === balance.id ? (
                        <div className="flex gap-1.5 items-center">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-gray-900 truncate">{balance.user.name}</p>
                            <p className="text-xs text-gray-500">+V̶₵{(balance.netBalance / 100).toFixed(2)}</p>
                          </div>
                          <input type="number" placeholder="V̶₵" value={settleAmount} onChange={(e) => setSettleAmount(e.target.value)} className="bg-white text-gray-800 border border-gray-300 rounded px-2 py-1 w-20 text-sm" max={balance.netBalance / 100} step="0.01" />
                          <button onClick={() => handleSettle(balance, 'ENCASH')} className="bg-green-600 text-white px-2 py-1.5 rounded text-xs font-medium whitespace-nowrap">💰</button>
                          <button onClick={() => { setSettlingUser(null); setSettleAmount(''); setSettleNotes(''); }} className="bg-gray-400 text-white px-2 py-1.5 rounded text-xs">✕</button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-gray-900 truncate">{balance.user.name}</p>
                            <p className="text-xs text-gray-500">@{balance.user.username} · Sttl: V̶₵{(balance.totalSettled / 100).toFixed(2)}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm font-bold text-green-600">+V̶₵{(balance.netBalance / 100).toFixed(2)}</span>
                            <button onClick={() => setSettlingUser(balance.id)} className="bg-green-600 hover:bg-green-500 text-white px-2.5 py-1 rounded text-xs font-medium">💰 Encash</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Losers Table */}
            {group.losers.length > 0 && (categoryFilter === 'all' || categoryFilter === 'losers') && (
              <div className="mb-6">
                <h3 className="text-base md:text-2xl font-bold text-red-700 mb-2 md:mb-3">📉 Losers ({group.losers.length})</h3>
                {/* Desktop table */}
                <div className="hidden md:block bg-white rounded-lg overflow-x-auto border border-red-200">
                  <table className="w-full text-gray-800 min-w-[560px]">
                    <thead className="bg-red-100">
                      <tr>
                        <th className="px-4 py-3 text-left">User</th>
                        <th className="px-4 py-3 text-right">Balance</th>
                        <th className="px-4 py-3 text-right">Amount Owed</th>
                        <th className="px-4 py-3 text-right">Settled</th>
                        <th className="px-4 py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.losers.map((balance) => (
                        <tr key={balance.id} className="border-t border-gray-200">
                          <td className="px-4 py-3"><div className="font-semibold">{balance.user.name}</div><div className="text-sm text-gray-500">{balance.user.username}</div></td>
                          <td className="px-4 py-3 text-right font-mono">V̶₵{(balance.balance / 100).toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-mono text-red-600">-V̶₵{(Math.abs(balance.netBalance) / 100).toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-mono">V̶₵{(balance.totalSettled / 100).toFixed(2)}</td>
                          <td className="px-4 py-3 text-center">
                            {settlingUser === balance.id ? (
                              <div className="flex gap-2 items-center justify-center">
                                <input type="number" placeholder="V̶₵ amount" value={settleAmount} onChange={(e) => setSettleAmount(e.target.value)} className="bg-white text-gray-800 border border-gray-300 rounded px-2 py-1 w-24" max={Math.abs(balance.netBalance) / 100} step="0.01" />
                                <button onClick={() => handleSettle(balance, 'REFILL')} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-sm">Refill</button>
                                <button onClick={() => { setSettlingUser(null); setSettleAmount(''); setSettleNotes(''); }} className="bg-gray-500 hover:bg-gray-400 text-white px-3 py-1 rounded text-sm">Cancel</button>
                              </div>
                            ) : (
                              <button onClick={() => setSettlingUser(balance.id)} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded">💳 Refill</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Mobile cards */}
                <div className="md:hidden bg-white rounded-lg border border-red-200 divide-y divide-gray-100">
                  {group.losers.map((balance) => (
                    <div key={balance.id} className="px-3 py-2">
                      {settlingUser === balance.id ? (
                        <div className="flex gap-1.5 items-center">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-gray-900 truncate">{balance.user.name}</p>
                            <p className="text-xs text-red-500">-V̶₵{(Math.abs(balance.netBalance) / 100).toFixed(2)}</p>
                          </div>
                          <input type="number" placeholder="V̶₵" value={settleAmount} onChange={(e) => setSettleAmount(e.target.value)} className="bg-white text-gray-800 border border-gray-300 rounded px-2 py-1 w-20 text-sm" max={Math.abs(balance.netBalance) / 100} step="0.01" />
                          <button onClick={() => handleSettle(balance, 'REFILL')} className="bg-blue-600 text-white px-2 py-1.5 rounded text-xs font-medium whitespace-nowrap">💳</button>
                          <button onClick={() => { setSettlingUser(null); setSettleAmount(''); setSettleNotes(''); }} className="bg-gray-400 text-white px-2 py-1.5 rounded text-xs">✕</button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-gray-900 truncate">{balance.user.name}</p>
                            <p className="text-xs text-gray-500">@{balance.user.username} · Sttl: V̶₵{(balance.totalSettled / 100).toFixed(2)}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm font-bold text-red-600">-V̶₵{(Math.abs(balance.netBalance) / 100).toFixed(2)}</span>
                            <button onClick={() => setSettlingUser(balance.id)} className="bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1 rounded text-xs font-medium">💳 Refill</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Break Even */}
            {group.breakEven.length > 0 && (categoryFilter === 'all' || categoryFilter === 'breakeven') && (
              <div>
                <h3 className="text-base md:text-2xl font-bold text-yellow-700 mb-2 md:mb-3">⚖️ Break Even ({group.breakEven.length})</h3>
                {/* Desktop table */}
                <div className="hidden md:block bg-white rounded-lg overflow-x-auto border border-yellow-200">
                  <table className="w-full text-gray-800">
                    <thead className="bg-yellow-100">
                      <tr>
                        <th className="px-4 py-3 text-left">User</th>
                        <th className="px-4 py-3 text-right">Current Balance</th>
                        <th className="px-4 py-3 text-right">Net</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.breakEven.map((balance) => (
                        <tr key={balance.id} className="border-t border-gray-200">
                          <td className="px-4 py-3"><div className="font-semibold">{balance.user.name}</div><div className="text-sm text-gray-500">{balance.user.username}</div></td>
                          <td className="px-4 py-3 text-right font-mono">V̶₵{(balance.balance / 100).toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-mono text-yellow-600">V̶₵0.00</td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => handlePrePay(balance)} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-sm">💰 Pre Pay</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Mobile cards */}
                <div className="md:hidden bg-white rounded-lg border border-yellow-200 divide-y divide-gray-100">
                  {group.breakEven.map((balance) => (
                    <div key={balance.id} className="px-3 py-2 flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 truncate">{balance.user.name}</p>
                        <p className="text-xs text-gray-500 truncate">@{balance.user.username}</p>
                      </div>
                      <span className="text-sm font-mono text-yellow-600 font-semibold shrink-0">V̶₵0.00</span>
                      <button onClick={() => handlePrePay(balance)} className="bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1 rounded text-xs font-medium shrink-0">💰 Pre Pay</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Notes Input (shown when settling) */}
        {!showHistory && settlingUser && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-gray-200">
            <label className="text-gray-700 font-semibold block mb-2">Settlement Notes (Optional):</label>
            <textarea
              value={settleNotes}
              onChange={(e) => setSettleNotes(e.target.value)}
              className="w-full bg-white text-gray-800 border border-gray-300 rounded-lg px-4 py-2"
              rows={3}
              placeholder="Add any notes about this settlement..."
            />
          </div>
        )}
      </div>
    </div>
  );
}
