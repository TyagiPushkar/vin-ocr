'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { DashboardHeader } from '@/components/dashboard-header';
import { DocketTable } from '@/components/docket-table';
import { MasterSheetTable } from '@/components/master-sheet-table';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  RefreshCw, 
  Search, 
  Filter, 
  Calendar, 
  ChevronLeft, 
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Home,
  X, 
  Download,
  FileSpreadsheet,
  Table,
  LayoutGrid
} from 'lucide-react';
import { 
  FullDocket, 
  MasterSheetRow, 
  transformDocketsToMasterRows, 
  exportToExcel, 
  exportToCSV,
  compareDockets
} from '@/lib/excel-export';

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [dockets, setDockets] = useState<FullDocket[]>([]);
  const [filteredDockets, setFilteredDockets] = useState<FullDocket[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // View & Pagination
  const [viewMode, setViewMode] = useState<'master' | 'compact'>('master');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    loadDockets();
  }, [user]);

  const loadDockets = async () => {
    try {
      setLoading(true);
      const locationId = user?.LocationId || 1;
      const response = await fetch(
        `https://namami-infotech.com/vinworld/src/docket/get_docket.php?locationId=${locationId}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setDockets(data.data || []);
        setFilteredDockets(data.data || []);
      } else {
        console.error('Failed to load dockets:', data.message);
      }
    } catch (error) {
      console.error('Error loading dockets:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle Preset Date Filter change
  const handlePresetDateChange = (preset: string) => {
    setDateFilter(preset);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'today') {
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (preset === 'week') {
      const startOfWeek = new Date();
      startOfWeek.setDate(today.getDate() - today.getDay());
      setFromDate(startOfWeek.toISOString().split('T')[0]);
      setToDate(todayStr);
    } else if (preset === 'month') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      setFromDate(startOfMonth.toISOString().split('T')[0]);
      setToDate(todayStr);
    } else if (preset === 'all') {
      setFromDate('');
      setToDate('');
    }
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...dockets];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(d => {
        const statusStr = (d.Status || (d.status === 1 ? 'completed' : 'pending')).toLowerCase();
        return statusStr === statusFilter.toLowerCase();
      });
    }

    // From Date filter
    if (fromDate) {
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      filtered = filtered.filter(d => {
        if (!d.ShipDate) return false;
        const dDate = new Date(d.ShipDate);
        return dDate >= from;
      });
    }

    // To Date filter
    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      filtered = filtered.filter(d => {
        if (!d.ShipDate) return false;
        const dDate = new Date(d.ShipDate);
        return dDate <= to;
      });
    }

    // Search filter across multiple fields
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(d =>
        (d.DocketNo && d.DocketNo.toLowerCase().includes(query)) ||
        (d.ConsignorName && d.ConsignorName.toLowerCase().includes(query)) ||
        (d.ConsigneeName && d.ConsigneeName.toLowerCase().includes(query)) ||
        (d.ConsignorAddress && d.ConsignorAddress.toLowerCase().includes(query)) ||
        (d.ConsigneeAddress && d.ConsigneeAddress.toLowerCase().includes(query)) ||
        (d.Origin && d.Origin.toLowerCase().includes(query)) ||
        (d.Destination && d.Destination.toLowerCase().includes(query)) ||
        (d.ConsigneeDistrict && d.ConsigneeDistrict.toLowerCase().includes(query)) ||
        (d.ConsigneeState && d.ConsigneeState.toLowerCase().includes(query)) ||
        (d.ConsigneePinCode && d.ConsigneePinCode.toLowerCase().includes(query)) ||
        (d.InvoiceNumber && d.InvoiceNumber.toLowerCase().includes(query)) ||
        (d.ConsigneeMobile && d.ConsigneeMobile.toLowerCase().includes(query))
      );
    }

    // Ensure filtered dockets are sorted latest first (for UI view)
    filtered.sort((a, b) => compareDockets(b, a));

    setFilteredDockets(filtered);
    setCurrentPage(1);
  }, [dockets, statusFilter, fromDate, toDate, searchQuery]);

  // Transform filtered dockets to Master Sheet rows (latest first on top for UI)
  const allMasterRows = useMemo(() => {
    return transformDocketsToMasterRows(filteredDockets, 'desc');
  }, [filteredDockets]);

  // Pagination calculations
  const totalCount = viewMode === 'master' ? allMasterRows.length : filteredDockets.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  const paginatedMasterRows = useMemo(() => {
    return allMasterRows.slice(startIndex, endIndex);
  }, [allMasterRows, startIndex, endIndex]);

  const paginatedDockets = useMemo(() => {
    return filteredDockets.slice(startIndex, endIndex);
  }, [filteredDockets, startIndex, endIndex]);

  // Export handlers (latest at bottom for downloaded files)
  const handleExportExcel = () => {
    try {
      setIsExporting(true);
      const filename = `Master_Pickup_Delivery_${fromDate || 'start'}_to_${toDate || 'end'}.xlsx`;
      const exportRows = transformDocketsToMasterRows(filteredDockets, 'asc');
      exportToExcel(exportRows, filename);
    } catch (err) {
      console.error('Failed to export Excel:', err);
      alert('Failed to generate Excel file');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = () => {
    try {
      setIsExporting(true);
      const filename = `Master_Pickup_Delivery_${fromDate || 'start'}_to_${toDate || 'end'}.csv`;
      const exportRows = transformDocketsToMasterRows(filteredDockets, 'asc');
      exportToCSV(exportRows, filename);
    } catch (err) {
      console.error('Failed to export CSV:', err);
      alert('Failed to generate CSV file');
    } finally {
      setIsExporting(false);
    }
  };

  // Quick Stats
  const stats = {
    total: dockets.length,
    active: dockets.filter(d => (d.Status?.toLowerCase() === 'active' || d.status === 1)).length,
    pending: dockets.filter(d => (d.Status?.toLowerCase() === 'pending' || d.status === 0)).length,
    completed: dockets.filter(d => (d.Status?.toLowerCase() === 'completed' || d.status === 1)).length,
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#f7f9fc]">
        <DashboardHeader />

        <main className="max-w-[1600px] mx-auto p-4 md:p-8">
          {/* Welcome Card */}
          <div className="bg-white rounded-xl md:rounded-2xl shadow-sm p-6 mb-6 border border-gray-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-[#002d62] mb-1">
                  Welcome back, <span className="text-[#f7931d]">{user?.EmpName || 'User'}</span>!
                </h2>
                <p className="text-gray-500 text-sm">
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="p-2.5 bg-gray-100 rounded-lg hover:bg-gray-200 text-[#002d62] transition"
                  title="Home"
                >
                  <Home className="w-5 h-5" />
                </button>
                <button
                  onClick={loadDockets}
                  disabled={loading}
                  className="p-2.5 bg-[#f7931d]/10 text-[#f7931d] rounded-lg hover:bg-[#f7931d]/20 transition disabled:opacity-50"
                  title="Refresh data"
                >
                  <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
              <div className="bg-[#002d62]/5 border border-[#002d62]/10 rounded-lg p-4">
                <div className="text-2xl font-bold text-[#002d62]">{stats.total}</div>
                <div className="text-xs md:text-sm text-gray-600 font-medium">Total Dockets</div>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600">{stats.active}</div>
                <div className="text-xs md:text-sm text-gray-600 font-medium">Active</div>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
                <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
                <div className="text-xs md:text-sm text-gray-600 font-medium">Pending</div>
              </div>
              <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                <div className="text-xs md:text-sm text-gray-600 font-medium">Completed / Delivered</div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="bg-white rounded-xl md:rounded-2xl shadow-sm p-4 md:p-6 border border-gray-100">
            {/* Header & Primary Actions */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-6 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl md:text-2xl font-bold text-[#002d62]">
                    Master Pickup & Delivery Data
                  </h2>
                  {/* <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-[#f7931d]">
                    {allMasterRows.length} Rows
                  </span> */}
                </div>
                <p className="text-gray-500 text-sm mt-1">
                  Filtered: {filteredDockets.length} of {dockets.length} dockets ({allMasterRows.length} shipment items)
                </p>
              </div>
              
              <div className="flex flex-wrap items-center gap-2.5">
                {/* View Switcher */}
                <div className="inline-flex rounded-lg border border-gray-300 p-1 bg-gray-50">
                  <button
                    onClick={() => setViewMode('master')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition ${
                      viewMode === 'master'
                        ? 'bg-[#002d62] text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    title="Google Sheet Master View"
                  >
                    <Table className="w-4 h-4" />
                    <span>Master Sheet</span>
                  </button>
                  <button
                    onClick={() => setViewMode('compact')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition ${
                      viewMode === 'compact'
                        ? 'bg-[#002d62] text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    title="Compact Table View"
                  >
                    <LayoutGrid className="w-4 h-4" />
                    <span>Compact View</span>
                  </button>
                </div>

                {/* Download Excel Button */}
                <button
                  onClick={handleExportExcel}
                  disabled={allMasterRows.length === 0 || isExporting}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm transition flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Download Excel Sheet (.xlsx)"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Download Excel</span>
                </button>

                {/* Download CSV Button */}
                <button
                  onClick={handleExportCSV}
                  disabled={allMasterRows.length === 0 || isExporting}
                  className="px-3.5 py-2.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg font-semibold text-sm transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  title="Download CSV (.csv)"
                >
                  <Download className="w-4 h-4 text-gray-500" />
                  <span>CSV</span>
                </button>

                {/* Add Docket */}
                <button
                  onClick={() => router.push('/docket/add')}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#f7931d] to-[#e67e22] text-white rounded-lg font-bold text-sm hover:shadow-md transition flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Docket</span>
                </button>
              </div>
            </div>

            {/* Filter Section: From Date, To Date, Quick Presets & Search */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
                {/* From Date */}
                <div className="lg:col-span-3">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#f7931d]" />
                    From Date
                  </label>
                  <input
                    type="date"
                    value={fromDate}
                    max={toDate || undefined}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFromDate(val);
                      setDateFilter('custom');
                      // If From Date is greater than To Date, update To Date to match
                      if (toDate && val && val > toDate) {
                        setToDate(val);
                      }
                    }}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#f7931d] focus:ring-1 focus:ring-[#f7931d]"
                  />
                </div>

                {/* To Date */}
                <div className="lg:col-span-3">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#f7931d]" />
                    To Date
                  </label>
                  <input
                    type="date"
                    value={toDate}
                    min={fromDate || undefined}
                    onChange={(e) => {
                      const val = e.target.value;
                      setToDate(val);
                      setDateFilter('custom');
                      // If To Date is less than From Date, update From Date to match
                      if (fromDate && val && val < fromDate) {
                        setFromDate(val);
                      }
                    }}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#f7931d] focus:ring-1 focus:ring-[#f7931d]"
                  />
                </div>

                {/* Quick Date Range Preset */}
                <div className="lg:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Preset
                  </label>
                  <select
                    value={dateFilter}
                    onChange={(e) => handlePresetDateChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#f7931d]"
                  >
                    <option value="all">All Dates</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div className="lg:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#f7931d]"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="completed">Completed / Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Clear Filters Button */}
                <div className="lg:col-span-2">
                  <button
                    onClick={() => {
                      setFromDate('');
                      setToDate('');
                      setDateFilter('all');
                      setStatusFilter('all');
                      setSearchQuery('');
                    }}
                    className="w-full py-2 px-3 border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold transition"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by Docket No, Consignor, Consignee, Destination, District, State, Pin Code, Invoice No..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#f7931d] focus:ring-1 focus:ring-[#f7931d]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Active Filters Pill Badges */}
            {(fromDate || toDate || statusFilter !== 'all' || searchQuery) && (
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="text-xs font-semibold text-gray-500">Active Filters:</span>

                {fromDate && (
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                    From: {fromDate}
                    <button onClick={() => setFromDate('')}>
                      <X className="w-3 h-3 hover:text-red-600" />
                    </button>
                  </div>
                )}

                {toDate && (
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                    To: {toDate}
                    <button onClick={() => setToDate('')}>
                      <X className="w-3 h-3 hover:text-red-600" />
                    </button>
                  </div>
                )}

                {statusFilter !== 'all' && (
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                    Status: {statusFilter}
                    <button onClick={() => setStatusFilter('all')}>
                      <X className="w-3 h-3 hover:text-red-600" />
                    </button>
                  </div>
                )}

                {searchQuery && (
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-medium">
                    Search: "{searchQuery}"
                    <button onClick={() => setSearchQuery('')}>
                      <X className="w-3 h-3 hover:text-red-600" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Table Display: Master Sheet View OR Compact View */}
            {viewMode === 'master' ? (
              <MasterSheetTable
                rows={paginatedMasterRows}
                loading={loading}
              />
            ) : (
              <DocketTable 
                dockets={paginatedDockets as any}
                loading={loading}
              />
            )}

            {/* Pagination Controls */}
            {totalCount > 0 && !loading && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-gray-200">
                <div className="text-xs md:text-sm text-gray-600 flex items-center gap-3">
                  <span>
                    Showing {startIndex + 1} to {Math.min(endIndex, totalCount)} of {totalCount} records
                  </span>
                  
                  <div className="flex items-center gap-1 ml-2">
                    <span className="text-gray-500">Per page:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-medium focus:outline-none"
                    >
                      <option value={10}>10</option>
                      <option value={15}>15</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="p-2 border border-gray-300 bg-white text-[#002d62] rounded-lg hover:bg-[#f7931d] hover:text-white hover:border-[#f7931d] disabled:opacity-50 disabled:cursor-not-allowed transition"
                    title="First page (<<)"
                    aria-label="First page"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 border border-gray-300 bg-white text-[#002d62] rounded-lg hover:bg-[#f7931d] hover:text-white hover:border-[#f7931d] disabled:opacity-50 disabled:cursor-not-allowed transition"
                    title="Previous page (<)"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-8 h-8 rounded-md text-xs font-semibold ${
                            currentPage === pageNum
                              ? 'bg-[#002d62] text-white shadow-sm'
                              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-gray-300 bg-white text-[#002d62] rounded-lg hover:bg-[#f7931d] hover:text-white hover:border-[#f7931d] disabled:opacity-50 disabled:cursor-not-allowed transition"
                    title="Next page (>)"
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-gray-300 bg-white text-[#002d62] rounded-lg hover:bg-[#f7931d] hover:text-white hover:border-[#f7931d] disabled:opacity-50 disabled:cursor-not-allowed transition"
                    title="Last page (>>)"
                    aria-label="Last page"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="mt-8 pt-6 pb-8 border-t border-gray-200">
          <div className="max-w-[1600px] mx-auto px-4 md:px-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="text-center md:text-left">
                <p className="text-sm text-gray-600 font-medium">
                  © 2024-2026 VIN WORLD EXPRESS PVT LTD. All rights reserved.
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Location: {user?.LocationName || 'Unknown Location'}
                </p>
              </div>
              <div className="text-center md:text-right">
                <p className="text-sm text-gray-500">
                  Logged in as: <span className="font-semibold text-[#002d62]">{user?.EmpName}</span>
                </p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </ProtectedRoute>
  );
}