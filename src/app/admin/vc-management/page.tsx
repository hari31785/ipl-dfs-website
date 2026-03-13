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

  useEffect(() => {
    // Get admin username from localStorage
    const storedAdmin = localStorage.getItem('adminUser');
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

    const amount = parseFloat(settleAmount);
    const maxAmount = type === 'ENCASH' ? balance.netBalance : Math.abs(balance.netBalance);

    if (amount > maxAmount) {
      alert(`Cannot ${type === 'ENCASH' ? 'encash' : 'refill'} more than ${maxAmount} VCs`);
      return;
    }

    if (!confirm(`Confirm ${type === 'ENCASH' ? 'encash' : 'refill'} ${amount} VCs for ${balance.user.name}?`)) {
      return;
    }

    try {
      const response = await fetch('/api/admin/vc-settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournamentBalanceId: balance.id,
          type,
          amount,
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

  const filteredGroups = selectedTournament === 'all' 
    ? tournamentGroups 
    : { [selectedTournament]: tournamentGroups[selectedTournament] };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 p-8">
        <div className="text-center text-white text-xl">Loading VC Management...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white">💰 VC Settlement Management</h1>
          <div className="flex gap-4">
            <button
              onClick={() => {
                setShowHistory(!showHistory);
                if (!showHistory) fetchSettlementHistory();
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg"
            >
              {showHistory ? '📊 Show Balances' : '📜 View History'}
            </button>
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>

        {/* Tournament Filter */}
        {!showHistory && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 mb-8">
            <label className="text-white font-semibold mr-4">Filter by Tournament:</label>
            <select
              value={selectedTournament}
              onChange={(e) => setSelectedTournament(e.target.value)}
              className="bg-white/20 text-white border border-white/30 rounded-lg px-4 py-2"
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
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 mb-8">
            <h2 className="text-3xl font-bold text-white mb-6">📜 Settlement History</h2>
            {settlementHistory.length === 0 ? (
              <div className="text-white text-center py-8">No settlement history found</div>
            ) : (
              <div className="bg-black/30 rounded-lg overflow-hidden">
                <table className="w-full text-white">
                  <thead className="bg-white/10">
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
                          {settlement.amount} VCs
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm">
                          {settlement.balanceBefore}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm">
                          {settlement.balanceAfter}
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
          <div key={tournamentId} className="bg-white/10 backdrop-blur-md rounded-xl p-6 mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">{group.tournament.name}</h2>
            
            {/* Summary */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-green-500/20 border border-green-500 rounded-lg p-4">
                <div className="text-green-300 text-sm">Winners</div>
                <div className="text-white text-2xl font-bold">{group.winners.length}</div>
                <div className="text-green-400 text-sm">+{group.totalWinnings} VCs</div>
              </div>
              <div className="bg-red-500/20 border border-red-500 rounded-lg p-4">
                <div className="text-red-300 text-sm">Losers</div>
                <div className="text-white text-2xl font-bold">{group.losers.length}</div>
                <div className="text-red-400 text-sm">-{group.totalLosses} VCs</div>
              </div>
              <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-4">
                <div className="text-yellow-300 text-sm">Break Even</div>
                <div className="text-white text-2xl font-bold">{group.breakEven.length}</div>
                <div className="text-yellow-400 text-sm">0 VCs</div>
              </div>
              <div className={`${group.netBalance >= 0 ? 'bg-green-500/20 border-green-500' : 'bg-red-500/20 border-red-500'} border rounded-lg p-4`}>
                <div className="text-white/70 text-sm">Net Balance</div>
                <div className="text-white text-2xl font-bold">{group.netBalance > 0 ? '+' : ''}{group.netBalance} VCs</div>
              </div>
            </div>

            {/* Winners Table */}
            {group.winners.length > 0 && (
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-green-400 mb-3">✅ Winners (Positive Balance)</h3>
                <div className="bg-black/30 rounded-lg overflow-hidden">
                  <table className="w-full text-white">
                    <thead className="bg-green-900/50">
                      <tr>
                        <th className="px-4 py-3 text-left">User</th>
                        <th className="px-4 py-3 text-right">Current Balance</th>
                        <th className="px-4 py-3 text-right">Net Winnings</th>
                        <th className="px-4 py-3 text-right">Total Settled</th>
                        <th className="px-4 py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.winners.map((balance) => (
                        <tr key={balance.id} className="border-t border-white/10">
                          <td className="px-4 py-3">
                            <div className="font-semibold">{balance.user.name}</div>
                            <div className="text-sm text-gray-400">{balance.user.username}</div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono">{balance.balance} VCs</td>
                          <td className="px-4 py-3 text-right font-mono text-green-400">+{balance.netBalance} VCs</td>
                          <td className="px-4 py-3 text-right font-mono">{balance.totalSettled} VCs</td>
                          <td className="px-4 py-3 text-center">
                            {settlingUser === balance.id ? (
                              <div className="flex gap-2 items-center justify-center">
                                <input
                                  type="number"
                                  placeholder="Amount"
                                  value={settleAmount}
                                  onChange={(e) => setSettleAmount(e.target.value)}
                                  className="bg-white/20 text-white border border-white/30 rounded px-2 py-1 w-24"
                                  max={balance.netBalance}
                                />
                                <button
                                  onClick={() => handleSettle(balance, 'ENCASH')}
                                  className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-sm"
                                >
                                  Encash
                                </button>
                                <button
                                  onClick={() => {
                                    setSettlingUser(null);
                                    setSettleAmount('');
                                    setSettleNotes('');
                                  }}
                                  className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded text-sm"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setSettlingUser(balance.id)}
                                className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded"
                              >
                                💰 Encash
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Losers Table */}
            {group.losers.length > 0 && (
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-red-400 mb-3">📉 Losers (Negative Balance)</h3>
                <div className="bg-black/30 rounded-lg overflow-hidden">
                  <table className="w-full text-white">
                    <thead className="bg-red-900/50">
                      <tr>
                        <th className="px-4 py-3 text-left">User</th>
                        <th className="px-4 py-3 text-right">Current Balance</th>
                        <th className="px-4 py-3 text-right">Amount Owed</th>
                        <th className="px-4 py-3 text-right">Total Settled</th>
                        <th className="px-4 py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.losers.map((balance) => (
                        <tr key={balance.id} className="border-t border-white/10">
                          <td className="px-4 py-3">
                            <div className="font-semibold">{balance.user.name}</div>
                            <div className="text-sm text-gray-400">{balance.user.username}</div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono">{balance.balance} VCs</td>
                          <td className="px-4 py-3 text-right font-mono text-red-400">{balance.netBalance} VCs</td>
                          <td className="px-4 py-3 text-right font-mono">{balance.totalSettled} VCs</td>
                          <td className="px-4 py-3 text-center">
                            {settlingUser === balance.id ? (
                              <div className="flex gap-2 items-center justify-center">
                                <input
                                  type="number"
                                  placeholder="Amount"
                                  value={settleAmount}
                                  onChange={(e) => setSettleAmount(e.target.value)}
                                  className="bg-white/20 text-white border border-white/30 rounded px-2 py-1 w-24"
                                  max={Math.abs(balance.netBalance)}
                                />
                                <button
                                  onClick={() => handleSettle(balance, 'REFILL')}
                                  className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-sm"
                                >
                                  Refill
                                </button>
                                <button
                                  onClick={() => {
                                    setSettlingUser(null);
                                    setSettleAmount('');
                                    setSettleNotes('');
                                  }}
                                  className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded text-sm"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setSettlingUser(balance.id)}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded"
                              >
                                💳 Refill
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Break Even */}
            {group.breakEven.length > 0 && (
              <div>
                <h3 className="text-2xl font-bold text-yellow-400 mb-3">⚖️ Break Even</h3>
                <div className="bg-black/30 rounded-lg overflow-hidden">
                  <table className="w-full text-white">
                    <thead className="bg-yellow-900/50">
                      <tr>
                        <th className="px-4 py-3 text-left">User</th>
                        <th className="px-4 py-3 text-right">Current Balance</th>
                        <th className="px-4 py-3 text-right">Net</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.breakEven.map((balance) => (
                        <tr key={balance.id} className="border-t border-white/10">
                          <td className="px-4 py-3">
                            <div className="font-semibold">{balance.user.name}</div>
                            <div className="text-sm text-gray-400">{balance.user.username}</div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono">{balance.balance} VCs</td>
                          <td className="px-4 py-3 text-right font-mono text-yellow-400">0 VCs</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Notes Input (shown when settling) */}
        {!showHistory && settlingUser && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 mb-8">
            <label className="text-white font-semibold block mb-2">Settlement Notes (Optional):</label>
            <textarea
              value={settleNotes}
              onChange={(e) => setSettleNotes(e.target.value)}
              className="w-full bg-white/20 text-white border border-white/30 rounded-lg px-4 py-2"
              rows={3}
              placeholder="Add any notes about this settlement..."
            />
          </div>
        )}
      </div>
    </div>
  );
}
