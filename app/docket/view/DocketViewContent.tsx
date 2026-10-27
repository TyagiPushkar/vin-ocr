// app/docket/view/DocketViewContent.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Printer, RefreshCw, Download, ChevronLeft, ChevronRight, Menu, X, Home, Edit2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { DashboardHeader } from '@/components/dashboard-header';

interface Shipment {
  Id: number;
  Length: string;
  Width: string;
  Height: string;
  ActualWeight: string;
  NoOfBox: number;
  EntryDateTime: string;
}

interface ApiDocketData {
  Id: number;
  DocketNo: string;
  ConsignorName: string;
  ConsignorAddress: string;
  ConsignorDistrict: string;
  ConsignorState: string;
  ConsignorPinCode: string;
  ConsignorMobile: string;
  ConsigneeName: string;
  ConsigneeAddress: string;
  ConsigneeDistrict: string;
  ConsigneeState: string;
  ConsigneePinCode: string;
  ConsigneeMobile: string;
  ShipDate: string;
  Origin: string;
  Destination: string;
  ModeOfTransport: string;
  InvoiceRequired: string;
  InvoiceNumber: string;
  InvoiceValue: string;
  Declaration: string | null;
  ShipmentType: string;
  PickupDate: string;
  PickupEmployee: string;
  EwayBillNo: string;
  LocationId: number;
  CreatedAt: string;
  shipments?: Shipment[];
  ShipmentCount: number;
  status?: number;
}

interface ApiResponse {
  success: boolean;
  count: number;
  data: ApiDocketData[];
}

const DocketViewContent = () => {
  const router = useRouter();
  const { user } = useAuth()
  const searchParams = useSearchParams();
  const docketNo = searchParams.get('docketNo');
  const [docket, setDocket] = useState<ApiDocketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifySuccess, setVerifySuccess] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const docketRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (docketNo) {
      fetchDocketData(docketNo);
    }
  }, [docketNo]);

  const fetchDocketData = async (docketNumber: string) => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://namami-infotech.com/vinworld/src/docket/get_docket.php?locationId=${user?.LocationId}&search=${docketNumber}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch docket data');
      }

      const result: ApiResponse = await response.json();

      if (result.success && result.data && result.data.length > 0) {
        // console.log(result.data[0]);
        setDocket(result.data[0]);
      } else {
        throw new Error('No docket data found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load docket');
      console.error('Error fetching docket:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    try {
      setVerifying(true);
      setError(null);
      setVerifySuccess(null);

      const response = await fetch('https://namami-infotech.com/vinworld/src/docket/verify_docket.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          docketNo: docket?.DocketNo
        })
      });

      const result = await response.json();

      if (result.success) {
        setVerifySuccess('Docket verified successfully!');
        // Refresh docket data to get updated status
        if (docket?.DocketNo) {
          fetchDocketData(docket.DocketNo);
        }
        // Clear success message after 3 seconds
        setTimeout(() => {
          setVerifySuccess(null);
        }, 3000);
      } else {
        throw new Error(result.message || 'Failed to verify docket');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify docket');
      console.error('Error verifying docket:', err);
    } finally {
      setVerifying(false);
    }
  };
  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    if (!docketRef.current || !docket) return;

    try {
      setDownloadingPdf(true);

      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const element = docketRef.current;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210;
      const pageHeight = 297;
      // Margins
      // const marginX = 8;
      const marginY = 8;

      // const usableWidth = pageWidth - marginX * 2;
      const usableHeight = pageHeight - marginY * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      // let position = 0;
      let position = marginY;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      // heightLeft -= pageHeight;
      heightLeft -= usableHeight;

      while (heightLeft > 0) {
        // position = heightLeft - pageHeight;
        position = marginY - (imgHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        // heightLeft -= pageHeight;
        heightLeft -= usableHeight;
      }

      pdf.save(`Docket_${docket.DocketNo}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      window.print();
    } finally {
      setDownloadingPdf(false);
    }
  };

  const getDisplayValue = (value: string | null | undefined) => {
    return value && value.trim() !== '' ? value : '________________';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#002d62] mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading docket...</p>
        </div>
      </div>
    );
  }

  if (error || !docket) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="text-center bg-white p-8 rounded-lg shadow max-w-md">
          <div className="text-5xl mb-4">❌</div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Error Loading Docket</h3>
          <p className="text-gray-600 mb-6">{error || 'Docket not found'}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => router.back()}
              className="bg-[#002d62] text-white px-6 py-3 rounded hover:bg-[#001f47] transition flex items-center justify-center gap-2"
            >
              <ArrowLeft size={18} />
              Go Back
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-gray-200 text-gray-700 px-6 py-3 rounded hover:bg-gray-300 transition"
            >
              Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // const totalWeight = docket.shipments?.reduce((sum, shipment) => {
  //   return sum + (parseFloat(shipment.ActualWeight) || 0) * (shipment.NoOfBox || 1);
  // }, 0) || 0;
  const totalWeight = docket.shipments?.reduce((sum, shipment) => {
    return sum + (parseFloat(shipment.ActualWeight) || 0);
  }, 0) || 0;

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      {/* Mobile Header */}
      <DashboardHeader />
      <div className="lg:hidden sticky top-0 z-50 bg-[#002d62] text-white print:hidden">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="p-2 hover:bg-white/10 rounded-lg transition"
          >
            {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
          </button>

          <div className="text-center">
            <div className="font-bold">Docket #{docket.DocketNo}</div>
            <div className="text-xs opacity-75">View Mode</div>
          </div>

          <div className="w-10"></div> {/* Spacer for alignment */}
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="absolute top-full left-0 right-0 bg-white shadow-lg border border-gray-200">
            <div className="p-4 space-y-3">
              <button
                onClick={() => {
                  router.push('/dashboard');
                  setShowMobileMenu(false);
                }}
                className="w-full flex items-center gap-3 p-3 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <Home size={20} />
                Dashboard
              </button>
              <button
                onClick={() => {
                  router.push('/dashboard');
                  setShowMobileMenu(false);
                }}
                className="w-full flex items-center gap-3 p-3 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft size={20} />
                Back to Dockets
              </button>
              <button
                onClick={() => {
                  handlePrint();
                  setShowMobileMenu(false);
                }}
                className="w-full flex items-center gap-3 p-3 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <Printer size={20} />
                Print
              </button>
              <button
                onClick={() => {
                  handleDownload();
                  setShowMobileMenu(false);
                }}
                disabled={downloadingPdf}
                className="w-full flex items-center gap-3 p-3 text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50"
              >
                <Download size={20} />
                {downloadingPdf ? 'Downloading PDF...' : 'Download PDF'}
              </button>
              {docket.status === 0 && (
                <button
                  onClick={() => {
                    router.push(`/docket/edit?docketNo=${docket.DocketNo}`);
                    setShowMobileMenu(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  <Edit2 size={20} />
                  Edit Docket
                </button>
              )}
              <button
                onClick={() => {
                  fetchDocketData(docket.DocketNo);
                  setShowMobileMenu(false);
                }}
                className="w-full flex items-center gap-3 p-3 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <RefreshCw size={20} />
                Refresh
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:block p-4 print:hidden">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 text-[#002d62] hover:text-[#f7931d] transition"
            >
              <ArrowLeft size={20} />
              Back to Dockets
            </button>

            <div className="flex gap-3">
              <button
                onClick={handlePrint}
                className="bg-[#002d62] text-white px-4 py-2 rounded text-sm hover:bg-[#001f47] transition flex items-center gap-2"
              >
                <Printer size={16} />
                Print Docket
              </button>
              <button
                onClick={handleDownload}
                disabled={downloadingPdf}
                className="bg-[#f7931d] text-white px-4 py-2 rounded text-sm hover:bg-[#e67e00] transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {downloadingPdf ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Download PDF
                  </>
                )}
              </button>
              {docket.status === 0 && (
                <button
                  onClick={() => {
                    router.push(`/docket/edit?docketNo=${docket.DocketNo}`);
                    setShowMobileMenu(false);
                  }}
                  className="bg-[#f7931d] text-white px-4 py-2 rounded text-sm hover:bg-[#e67e00] transition flex items-center gap-2"
                >
                  <Edit2 size={16} />
                  Edit Docket
                </button>
              )}
              <button
                onClick={() => fetchDocketData(docket.DocketNo)}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-300 transition flex items-center gap-2"
              >
                <RefreshCw size={16} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Action Bar - Bottom */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 print:hidden z-40">
        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            disabled={downloadingPdf}
            className="flex-1 bg-[#f7931d] text-white py-3 rounded-lg font-bold hover:bg-[#e67e00] transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Download size={18} />
            {downloadingPdf ? 'Downloading...' : 'Download PDF'}
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 bg-[#002d62] text-white py-3 rounded-lg font-bold hover:bg-[#001f47] transition flex items-center justify-center gap-2"
          >
            <Printer size={18} />
            Print
          </button>
          <button
            onClick={() => router.back()}
            className="bg-gray-200 text-gray-700 px-4 py-3 rounded-lg font-bold hover:bg-gray-300 transition flex items-center justify-center gap-2"
          >
            <ChevronLeft size={18} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 print:p-0 max-w-6xl mx-auto">
        {/* Docket Form - Original Design */}
        <div ref={docketRef} className="bg-white p-4 md:p-6 lg:p-8 rounded-lg shadow-lg border print:shadow-none print:border-0 print:p-0">
          {/* Company Header */}
          <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
            {/* <img
              src="https://vinworldexpress.com/assets/img/resource/logo-4.png"
              alt="VIN WORLD Logo"
              className="h-20 mb-3"
              crossOrigin="anonymous"
            /> */}
            <img
              src="https://vinworldexpress.com/assets/img/resource/logo-4.png"
              alt="VIN WORLD Logo"
              className="h-20 mb-3"
            />
            <div className="text-center mb-6 md:mb-8 print:mb-8">

              <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-[#002d62] leading-tight">
                VIN WORLD EXPRESS PVT. LTD.
              </h1>
              <h2 className="text-sm md:text-base lg:text-lg text-gray-600 mt-1">
                DOMESTIC & INTERNATIONAL CARGO SERVICES
              </h2>
              <p className="text-xs md:text-sm text-gray-700 mt-2">
                K-2/5, Defence Enclave, Mahipalpur, New Delhi - 110037
              </p>
              <p className="text-xs md:text-sm text-gray-700">
                Tel.: 011-4471-2929, Mob.: 8800-82-8700, 9717-19-8600
              </p>
            </div>
          </div>
          {/* Docket Number & GSTIN */}
          <div className="border-t-2 border-b-2 border-[#002d62] py-3 md:py-4 mb-4 md:mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1">
                    DOCKET NO.
                  </label>
                  <div className="border-b border-gray-300 pb-1 font-mono text-base md:text-lg">
                    {docket.DocketNo}
                  </div>
                </div>

              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1">
                    GSTIN
                  </label>
                  <div className="border-b border-gray-300 pb-1 font-mono text-sm md:text-base">
                    07AAFVC5603G1ZF
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Origin and Destination */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mb-6 md:mb-8">
            <div>
              <h3 className="text-base md:text-lg font-bold text-gray-800 mb-2 md:mb-3">Origin:</h3>
              <div className="border border-gray-300 p-3 md:p-4 rounded h-16">
                <p className="font-semibold text-sm md:text-base">{docket.Origin}</p>
              </div>
            </div>

            <div>
              <h3 className="text-base md:text-lg font-bold text-gray-800 mb-2 md:mb-3">Destination:</h3>
              <div className="border border-gray-300 p-3 md:p-4 rounded h-16">
                <p className="font-semibold text-sm md:text-base">{docket.Destination}</p>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
            {/* Consignor Details */}
            <div className="mb-6 md:mb-8">
              <h3 className="text-base md:text-lg font-bold text-gray-800 mb-2 md:mb-3">Consignor Details:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 border border-gray-300 p-3 md:p-4 rounded">
                <div>
                  <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1">
                    Name:
                  </label>
                  <div className="border-b border-gray-300 pb-1 text-sm md:text-base">
                    {docket.ConsignorName}
                  </div>
                </div>

                <div>
                  <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1">
                    Mobile:
                  </label>
                  <div className="border-b border-gray-300 pb-1 text-sm md:text-base">
                    {docket.ConsignorMobile}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1">
                    Address:
                  </label>
                  <div className="border-b border-gray-300 pb-1 text-sm md:text-base">
                    {docket.ConsignorAddress}, {docket.ConsignorDistrict}, {docket.ConsignorState} - {docket.ConsignorPinCode}
                  </div>
                </div>

                <div>
                  <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1">
                    State:
                  </label>
                  <div className="border-b border-gray-300 pb-1 text-sm md:text-base">
                    {docket.ConsignorState}
                  </div>
                </div>
              </div>
            </div>

            {/* Consignee Details */}
            <div className="mb-6 md:mb-8">
              <h3 className="text-base md:text-lg font-bold text-gray-800 mb-2 md:mb-3">Consignee Details:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 border border-gray-300 p-3 md:p-4 rounded">
                <div>
                  <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1">
                    Name:
                  </label>
                  <div className="border-b border-gray-300 pb-1 text-sm md:text-base">
                    {docket.ConsigneeName}
                  </div>
                </div>

                <div>
                  <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1">
                    Mobile:
                  </label>
                  <div className="border-b border-gray-300 pb-1 text-sm md:text-base">
                    {docket.ConsigneeMobile}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1">
                    Address:
                  </label>
                  <div className="border-b border-gray-300 pb-1 text-sm md:text-base">
                    {docket.ConsigneeAddress}, {docket.ConsigneeDistrict}, {docket.ConsigneeState} - {docket.ConsigneePinCode}
                  </div>
                </div>

                <div>
                  <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1">
                    State:
                  </label>
                  <div className="border-b border-gray-300 pb-1 text-sm md:text-base">
                    {docket.ConsigneeState}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "2rem" }}>

            {/* Mode of Transportation */}
            <div className="mb-6 md:mb-8">
              <h3 className="text-base md:text-lg font-bold text-gray-800 mb-2 md:mb-3">Mode of Transportation:</h3>
              <div className="flex flex-wrap gap-4 md:gap-6">
                {['Air', 'Road', 'Train'].map((mode) => (
                  <label key={mode} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={docket.ModeOfTransport.toLowerCase() === mode.toLowerCase()}
                      readOnly
                      className="mr-2 h-4 w-4 md:h-5 md:w-5 accent-[#002d62]"
                    />
                    <span className="font-semibold text-sm md:text-base">{mode.toUpperCase()}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Type */}
            <div className="mb-6 md:mb-8">
              <h3 className="text-base md:text-lg font-bold text-gray-800 mb-2 md:mb-3">Type:</h3>
              <div className="flex flex-wrap gap-4 md:gap-6">
                {['DOX', 'Non-DOX'].map((type) => {
                  // Create a normalized version for comparison
                  const normalizedType = type === 'Non-DOX' ? 'nondox' : type.toLowerCase();
                  const docketType = docket.ShipmentType?.toLowerCase().replace('-', '') || '';

                  return (
                    <label key={type} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={docketType === normalizedType}
                        readOnly
                        className="mr-2 h-4 w-4 md:h-5 md:w-5 accent-[#002d62]"
                      />
                      <span className="font-semibold text-sm md:text-base">{type}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            {/* pickup date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
              <div>
                <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1">
                  Pickup Date:
                </label>
                <div className="border-b border-gray-300 pb-1 text-sm md:text-base">
                  {/* {new Date(docket.PickupDate).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })} */}
                  {docket?.PickupDate && !isNaN(new Date(docket.PickupDate).getTime())
                    ? new Date(docket.PickupDate).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })
                    : 'N/A'}
                </div>
              </div>

              <div>
                <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1">
                  Pickup Employee:
                </label>
                <div className="border-b border-gray-300 pb-1 text-sm md:text-base">
                  {docket.PickupEmployee}
                </div>
              </div>
            </div>
          </div>
          {/* Pickup Details */}


          {/* Transportation Charges Table */}
          <div className="mb-6 md:mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-4">
              <div>
                <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1">
                  E-WAY BILL NO.:
                </label>
                <div className="border-b border-gray-300 pb-1 font-mono text-sm md:text-base">
                  {getDisplayValue(docket.EwayBillNo)}
                </div>
              </div>

              <div>
                <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1">
                  Invoice Number:
                </label>
                <div className="border-b border-gray-300 pb-1 font-mono text-sm md:text-base">
                  {getDisplayValue(docket.InvoiceNumber)}
                </div>
              </div>
              <div>
                <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1">
                  Invoice Value:
                </label>
                <div className="border-b border-gray-300 pb-1 font-mono text-sm md:text-base">
                  ₹{parseFloat(docket.InvoiceValue).toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto -mx-2 md:mx-0">
              <table className="w-full border-collapse border border-gray-300 text-xs md:text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-1 md:p-2 text-left font-bold">PIECES</th>
                    <th className="border border-gray-300 p-1 md:p-2 text-left font-bold">ACTUAL WT.</th>
                    <th className="border border-gray-300 p-1 md:p-2 text-left font-bold">Length</th>
                    <th className="border border-gray-300 p-1 md:p-2 text-left font-bold">Width</th>
                    <th className="border border-gray-300 p-1 md:p-2 text-left font-bold">Height</th>
                  </tr>
                </thead>
                <tbody>
                  {docket.shipments?.length ? (
                    docket.shipments.map((shipment, index) => (
                      <tr key={shipment.Id || index}>
                        <td className="border border-gray-300 p-1 md:p-2 text-center">{shipment.NoOfBox}</td>
                        <td className="border border-gray-300 p-1 md:p-2 text-right">{shipment.ActualWeight} kg</td>

                        <td className="border border-gray-300 p-1 md:p-2 text-right">{shipment.Length} cm</td>
                        <td className="border border-gray-300 p-1 md:p-2 text-right">{shipment.Width} cm</td>
                        <td className="border border-gray-300 p-1 md:p-2 text-right">{shipment.Height} cm</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="border border-gray-300 p-2 md:p-4 text-center text-gray-500">
                        No shipment items found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dimensions and Payment Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-6 md:mb-8">
            <div>
              <label className="block text-xs md:text-sm font-bold text-gray-700 mb-2">
                Dimensions (cm):
              </label>
              {docket.shipments?.length ? (
                docket.shipments.map((shipment, index) => (
                  <div key={shipment.Id || index} className="border border-gray-300 p-2 md:p-3 rounded text-center mb-2">
                    <div className="text-sm md:text-base font-mono">
                      {shipment.Length}×{shipment.Width}×{shipment.Height}cm
                    </div>
                  </div>
                ))
              ) : (
                <div className="border border-gray-300 p-2 md:p-3 rounded text-center">
                  <div className="text-sm md:text-base font-mono text-gray-500">No dimensions available</div>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-base md:text-lg font-bold text-gray-800 mb-2 md:mb-3">Mode of Payment:</h3>
              <div className="flex flex-wrap gap-2 md:gap-4">
                {(['CASH', 'ONLINE', 'CHEQUE', 'CREDIT'] as const).map((mode) => (
                  <label key={mode} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={mode === 'CREDIT'}
                      readOnly
                      className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4 accent-[#002d62]"
                    />
                    <span className="font-semibold text-xs md:text-sm">{mode}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Total Weight and Receiver */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mb-6 md:mb-8">
            <div>
              <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1">
                TOTAL WEIGHT:
              </label>
              <div className="border-b border-gray-300 pb-1 font-bold text-base md:text-lg">
                {totalWeight.toFixed(2)} kg
              </div>
            </div>

            <div>
              <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1">
                R/T Receiver Name:
              </label>
              <div className="border-b border-gray-300 pb-1 text-sm md:text-base">
                {docket.ConsigneeName}
              </div>
            </div>
          </div>

          {/* Bank Details */}

          {/* Declaration */}
          <div className="border-t-2 border-[#002d62] pt-4 md:pt-6 mt-6 md:mt-8">
            <div className="text-xs md:text-sm text-gray-700 space-y-1 md:space-y-2">
              <p>
                We hereby agree to the terms & conditions printed at the backside of this
                agreement of carriage and to the Charged Services Charges.
              </p>
              <p>
                I/We declare that information provided by me/us for the preparation of this
                agreement of this carriage is true and correct. Actual sizes of volumetric
                packages are mentioned overleaf.
              </p>
            </div>

            <div className="mt-4 md:mt-6 text-center text-base md:text-lg font-bold text-red-600">
              NON NEGOTIABLE AT OWNER'S RISK
            </div>
          </div>
        </div>
      </div>

      {/* Verify Button - Show only if status is 0 */}
      {docket.status === 0 && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleVerify}
            disabled={verifying}
            className="bg-green-600 text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-green-700 transition flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {verifying ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                Verifying...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Verify Docket
              </>
            )}
          </button>
        </div>
      )}

      {/* Success Message */}
      {verifySuccess && (
        <div className="mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded text-center">
          {verifySuccess}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-center">
          {error}
        </div>
      )}
      {/* Mobile Verify Button - Show only if status is 0 */}
      {docket.status === 0 && (
        <div className="lg:hidden mt-4 px-4">
          <button
            onClick={handleVerify}
            disabled={verifying}
            className="w-full bg-green-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-green-700 transition flex items-center justify-center gap-3 disabled:opacity-50 shadow-lg"
          >
            {verifying ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                Verifying...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Verify Docket
              </>
            )}
          </button>
        </div>
      )}
      {/* Spacer for mobile bottom action bar */}
      <div className="h-16 lg:hidden"></div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            margin: 0;
            padding: 0;
          }
          .print\\:hidden {
            display: none !important;
          }
          @page {
            margin: 0.5in;
          }
        }
      `}</style>
    </div>
  );
};

export default DocketViewContent;